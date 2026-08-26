import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

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
      expect(result.report.result).toBe('SAFE_TARGETS_FOUND');
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
  });
});
