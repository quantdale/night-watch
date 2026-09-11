import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  PLAYWRIGHT_OUTPUT_ROOT,
  SCRATCH_ROOT,
  resolvePlaywrightOutputDir,
  resolveScratchPath,
} from '../../src/core/workspace/ephemeralLayout';

const ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(ROOT, 'bin/nightwatch-hygiene.mjs');
const GIT_FLAGS = ['-c', 'commit.gpgsign=false', '-c', 'user.email=nightwatch.synthetic@example.invalid', '-c', 'user.name=Nightwatch Synthetic'];

function git(root: string, args: string[], requireSuccess = true): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('git', [...GIT_FLAGS, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 512 * 1024,
  });
  if (requireSuccess && result.status !== 0) throw new Error(`synthetic git setup failed: ${args[0]}`);
  return { status: result.status ?? 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function createRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-hygiene-'));
  git(root, ['init', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'synthetic fixture\n');
  git(root, ['add', 'fixture.txt']);
  git(root, ['commit', '-m', 'synthetic base']);
  return root;
}

/** A repository with the real ignore policy for runner output and scratch. */
function createRepoWithIgnoredOutputs(): string {
  const root = createRepo();
  fs.writeFileSync(path.join(root, '.gitignore'), [
    'artifacts/',
    '.nightwatch/',
    'test-results/',
    'test-results-*/',
    '.tmp-*/',
    '',
  ].join('\n'));
  git(root, ['add', '.gitignore']);
  git(root, ['commit', '-m', 'synthetic output ignore policy']);
  return root;
}

/** The exact fixture used by both the dry-run and the apply output tests. */
function seedOutputRoots(root: string): void {
  for (const name of ['test-results', 'test-results-20260809', '.tmp-narrow-test', '.tmp-nightwatch']) {
    fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(path.join(root, name, 'run.json'), '{}\n');
  }
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts', 'evidence.json'), '{}\n');
  fs.mkdirSync(path.join(root, '.nightwatch', 'findings'), { recursive: true });
  fs.writeFileSync(path.join(root, '.nightwatch', 'findings', 'f1.json'), '{}\n');
  fs.mkdirSync(path.join(root, 'test-results-tracked'), { recursive: true });
  fs.writeFileSync(path.join(root, 'test-results-tracked', 'keep.txt'), 'tracked\n');
  git(root, ['add', '-f', 'test-results-tracked/keep.txt']);
  git(root, ['commit', '-m', 'synthetic tracked output']);
}

function addWorktree(root: string, branch: string, name: string): string {
  const worktree = path.join(root, 'synthetic-worktrees', name);
  fs.mkdirSync(path.dirname(worktree), { recursive: true });
  git(root, ['worktree', 'add', '-b', branch, worktree, 'main']);
  return worktree;
}

function runHygiene(root: string, args: string[]): { status: number | null; report: Record<string, any> } {
  const result = spawnSync(process.execPath, [CLI, '--root', root, '--json', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return { status: result.status, report: JSON.parse(result.stdout ?? '{}') as Record<string, any> };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

test.describe('local workspace hygiene', () => {
  test('status preserves the canonical worktree and reports exact safe candidates', () => {
    const root = createRepo();
    try {
      const worktree = addWorktree(root, 'swarm2/clean', 'clean');
      git(root, ['branch', 'swarm2/unlinked', 'main']);
      const result = runHygiene(root, ['status']);
      expect(result.status).toBe(0);
      expect(result.report.schemaVersion).toBe('nightwatch.local-hygiene.v1');
      expect(result.report.mode).toBe('STATUS');
      expect(result.report.safeTargets).toEqual([{ path: worktree, branch: 'swarm2/clean' }]);
      expect(result.report.registrations).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: root, disposition: 'PRESERVE_CANONICAL_WORKTREE' }),
        expect.objectContaining({ path: worktree, disposition: 'SAFE_CLEAN_REACHABLE_TARGET' }),
      ]));
      expect(fs.existsSync(worktree)).toBe(true);
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/clean']).status).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('clean defaults to a deterministic dry run with no mutation', () => {
    const root = createRepo();
    try {
      const worktree = addWorktree(root, 'swarm2/dry-run', 'dry-run');
      const result = runHygiene(root, ['clean']);
      expect(result.status).toBe(0);
      expect(result.report.mode).toBe('DRY_RUN');
      expect(result.report.result).toBe('REMOVAL_TARGETS_FOUND');
      expect(result.report.safeTargets).toEqual([{ path: worktree, branch: 'swarm2/dry-run' }]);
      expect(fs.existsSync(worktree)).toBe(true);
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/dry-run']).status).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('status observes ignored generated output entries without mutating them', () => {
    const root = createRepo();
    try {
      fs.writeFileSync(path.join(root, '.gitignore'), 'generated-output/\n');
      git(root, ['add', '.gitignore']);
      git(root, ['commit', '-m', 'synthetic ignore policy']);
      const generated = path.join(root, 'generated-output');
      fs.mkdirSync(generated);
      fs.writeFileSync(path.join(generated, 'fixture.txt'), 'ignored synthetic output\n');

      const result = runHygiene(root, ['status']);
      expect(result.status).toBe(0);
      expect(result.report.ignoredOutputs).toMatchObject({ status: 'OBSERVED_ONLY' });
      expect(result.report.ignoredOutputs.ignoredEntryCount).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(generated, 'fixture.txt'))).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('dirty, unreachable, and missing registrations remain preserved', () => {
    const root = createRepo();
    try {
      const dirty = addWorktree(root, 'swarm2/dirty', 'dirty');
      fs.appendFileSync(path.join(dirty, 'fixture.txt'), 'dirty synthetic change\n');

      const unreachable = addWorktree(root, 'swarm2/unreachable', 'unreachable');
      fs.writeFileSync(path.join(unreachable, 'ahead.txt'), 'synthetic ahead commit\n');
      git(unreachable, ['add', 'ahead.txt']);
      git(unreachable, ['commit', '-m', 'synthetic unreachable tip']);

      const missing = addWorktree(root, 'swarm2/missing', 'missing');
      fs.rmSync(missing, { recursive: true, force: true });

      const result = runHygiene(root, ['status']);
      expect(result.status).toBe(0);
      expect(result.report.safeTargets).toEqual([]);
      expect(result.report.registrations).toEqual(expect.arrayContaining([
        expect.objectContaining({ branch: 'swarm2/dirty', disposition: 'PRESERVE_DIRTY_WORKTREE' }),
        expect.objectContaining({ branch: 'swarm2/unreachable', disposition: 'PRESERVE_UNREACHABLE_BRANCH' }),
        expect.objectContaining({ branch: 'swarm2/missing', disposition: 'PRESERVE_UNSAFE_WORKTREE', reasonCode: 'WORKTREE_PATH_MISSING' }),
      ]));
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/dirty']).status).toBe(0);
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/unreachable']).status).toBe(0);
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/missing']).status).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('apply revalidates and removes only the exact clean reachable target', () => {
    const root = createRepo();
    try {
      const worktree = addWorktree(root, 'swarm2/apply', 'apply');
      const result = runHygiene(root, ['clean', '--apply']);
      expect(result.status).toBe(0);
      expect(result.report.mode).toBe('APPLY');
      expect(result.report.result).toBe('APPLIED');
      expect(result.report.applyResults).toEqual([
        { target: { path: worktree, branch: 'swarm2/apply' }, result: 'APPLIED', reasonCode: 'CLEAN_REACHABLE_TARGET_REMOVED' },
      ]);
      expect(result.report.safeTargets).toEqual([]);
      expect(fs.existsSync(worktree)).toBe(false);
      expect(git(root, ['show-ref', '--verify', 'refs/heads/swarm2/apply'], false).status).not.toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('implementation keeps hygiene local, bounded, and free of broad cleanup commands', () => {
    const source = fs.readFileSync(CLI, 'utf8');
    expect(source).not.toMatch(/worktree['",\s]+prune/);
    expect(source).not.toContain("'--force'");
    expect(source).not.toMatch(/\['(?:fetch|pull|push|clone)'/);
    expect(source).toContain("['worktree', 'remove', match.path]");
    expect(source).toContain("['branch', '-d', '--', match.branch]");
    // The owner-only finding and review stores live outside the repository and
    // are never read, and the protected in-repo roots are excluded by name.
    expect(source).not.toMatch(/homedir|\.nightwatch\/findings|\.nightwatch\/reviews/);
    expect(source).toContain("const PROTECTED_ROOT_NAMES = new Set(['artifacts', '.nightwatch', 'node_modules', '.git', 'dist'])");
    expect(source).toContain("const OUTPUT_ROOT_PATTERN = /^(?:test-results(?:-[A-Za-z0-9._-]+)?|\\.tmp-[A-Za-z0-9._-]+)$/");
    expect(source).toContain("trackedPathsUnder");
  });

  test('clean dry-run lists exactly the removable runner-output and scratch roots', () => {
    const root = createRepoWithIgnoredOutputs();
    try {
      seedOutputRoots(root);
      const result = runHygiene(root, ['clean']);
      expect(result.status).toBe(0);
      expect(result.report.mode).toBe('DRY_RUN');
      expect(result.report.result).toBe('REMOVAL_TARGETS_FOUND');
      expect([...result.report.outputRemovalPlan].sort()).toEqual([
        '.tmp-narrow-test',
        '.tmp-nightwatch',
        'test-results',
        'test-results-20260809',
      ]);
      expect(result.report.outputRemovalTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'test-results-tracked', disposition: 'REFUSED_TRACKED_FILES_PRESENT', trackedFileCount: 1 }),
        expect.objectContaining({ name: 'test-results', owned: true, disposition: 'REMOVAL_TARGET' }),
        expect.objectContaining({ name: '.tmp-nightwatch', owned: true, disposition: 'REMOVAL_TARGET' }),
      ]));
      expect([...result.report.unownedOutputRoots].sort()).toEqual([
        '.tmp-narrow-test',
        'test-results-20260809',
        'test-results-tracked',
      ]);
      // The dry run lists exactly what it would remove and removes nothing.
      for (const name of result.report.outputRemovalPlan) expect(fs.existsSync(path.join(root, name))).toBe(true);
      expect(fs.existsSync(path.join(root, 'artifacts', 'evidence.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.nightwatch', 'findings', 'f1.json'))).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('clean apply removes runner output and scratch but never artifacts, the owner store or a tracked file', () => {
    const root = createRepoWithIgnoredOutputs();
    try {
      seedOutputRoots(root);
      const before = git(root, ['status', '--porcelain=v1']).stdout;
      const dry = runHygiene(root, ['clean']);
      const plan: string[] = [...dry.report.outputRemovalPlan].sort();
      const result = runHygiene(root, ['clean', '--apply']);
      expect(result.status).toBe(0);
      expect(result.report.mode).toBe('APPLY');
      expect(result.report.result).toBe('APPLIED');
      expect(result.report.outputRemovalResults.filter((entry: any) => entry.result === 'REMOVED').map((entry: any) => entry.name).sort()).toEqual(plan);
      for (const name of plan) expect(fs.existsSync(path.join(root, name))).toBe(false);
      expect(fs.existsSync(path.join(root, 'test-results-tracked', 'keep.txt'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'artifacts', 'evidence.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.nightwatch', 'findings', 'f1.json'))).toBe(true);
      // The tracked file is still tracked, and the working tree reports the
      // same porcelain state: removal touched no tracked path.
      expect(git(root, ['ls-files']).stdout).toContain('test-results-tracked/keep.txt');
      expect(git(root, ['status', '--porcelain=v1']).stdout).toBe(before);
    } finally {
      cleanup(root);
    }
  });

  test('status reports unowned root output and scratch roots as measured data', () => {
    const root = createRepoWithIgnoredOutputs();
    try {
      fs.mkdirSync(path.join(root, 'test-results-20260809'), { recursive: true });
      fs.mkdirSync(path.join(root, '.tmp-narrow-test'), { recursive: true });
      const result = runHygiene(root, ['status']);
      expect(result.status).toBe(0);
      expect(result.report.outputStatus).toBe('OBSERVED');
      expect([...result.report.unownedOutputRoots].sort()).toEqual(['.tmp-narrow-test', 'test-results-20260809']);
      expect(result.report.outputRemovalPlan).toEqual(['.tmp-narrow-test', 'test-results-20260809']);
    } finally {
      cleanup(root);
    }
  });

  test.describe('playwright output layout', () => {
    const CONFIG_PATTERN = /^playwright(?:\.[A-Za-z0-9_-]+)?\.config\.ts$/;

    test('every root playwright config resolves output through the one shared root', () => {
      const configs = fs.readdirSync(ROOT).filter((name) => CONFIG_PATTERN.test(name)).sort();
      expect(configs).toContain('playwright.config.ts');
      expect(configs.length).toBeGreaterThanOrEqual(11);
      const lanes = new Set<string>();
      for (const name of configs) {
        const source = fs.readFileSync(path.join(ROOT, name), 'utf8');
        expect(source, name).toContain("from './src/core/workspace/ephemeralLayout'");
        const match = /outputDir: resolvePlaywrightOutputDir\('([a-z0-9-]+)'\)/.exec(source);
        expect(match, `${name} must resolve output through the shared root`).not.toBeNull();
        lanes.add(match?.[1] ?? '');
        // No config may name its own output root or scratch location.
        expect(source, name).not.toMatch(/outputDir:\s*['"`]/);
        expect(source, name).not.toMatch(/['"`]test-results-/);
        expect(source, name).not.toMatch(/['"`]\.tmp-/);
      }
      expect(lanes.size).toBe(configs.length);
      expect(resolvePlaywrightOutputDir('core')).toBe(`${PLAYWRIGHT_OUTPUT_ROOT}/core`);
    });

    test('scratch resolves under the one ignored root and cannot escape it', () => {
      expect(resolveScratchPath('test', 'evidence')).toBe(`${SCRATCH_ROOT}/test/evidence`);
      expect(() => resolveScratchPath()).toThrow('EPHEMERAL_LAYOUT_SEGMENT_MISSING');
      expect(() => resolveScratchPath('..')).toThrow('EPHEMERAL_LAYOUT_SEGMENT_INVALID');
      expect(() => resolveScratchPath('/absolute')).toThrow('EPHEMERAL_LAYOUT_SEGMENT_INVALID');
      expect(() => resolvePlaywrightOutputDir('../escape')).toThrow('EPHEMERAL_LAYOUT_LANE_INVALID');
      const ignored = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
      expect(ignored).toContain('test-results/');
      expect(ignored).toContain('.tmp-*/');
    });
  });
});
