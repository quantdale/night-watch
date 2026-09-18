import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * The rule mutation campaign's own contract.
 *
 * `hardening:rules` became a REQUIRED gate group, so the campaign is now
 * release-authoritative and its failure modes have to be proven rather than
 * assumed. The cases below run the REAL `probe-campaign.mjs` against a
 * disposable repository holding a synthetic two-rule engine, so a deliberately
 * undetected probe, a vacuous run and a restore failure are all exercised for
 * real without touching the canonical checkout or its 90 recorded probes.
 *
 * The campaign resolves its root from `kernel.mjs`'s own location, so mirroring
 * `bin/child-environment.mjs` and `bin/lib/hardening/{kernel,probe-campaign}.mjs`
 * into a temporary tree is enough to relocate it entirely.
 */

const ROOT = path.resolve(__dirname, '../..');

const GIT_FLAGS = [
  '-c', 'user.name=Nightwatch Synthetic',
  '-c', 'user.email=synthetic@nightwatch.invalid',
  '-c', 'commit.gpgsign=false',
  '-c', 'init.defaultBranch=main',
];

function gitOk(cwd: string, args: readonly string[]): string {
  const result = spawnSync('git', [...GIT_FLAGS, ...args], { cwd, encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout ?? '';
}

interface Probe {
  readonly id: string;
  readonly ops: ReadonlyArray<Record<string, unknown>>;
}

/**
 * A disposable repository carrying the real campaign and a synthetic engine.
 *
 * `checkGuarded` fails when the guarded file loses its token — a real rule
 * shape. `checkBlind` never fails, which is precisely the rot the campaign
 * exists to catch: a rule that cannot detect its own recorded violation.
 */
function probeRoot(probes: Readonly<Record<string, readonly Probe[]>>): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-probe-'));
  fs.mkdirSync(path.join(directory, 'bin', 'lib', 'hardening'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'config'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'src'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'bin/child-environment.mjs'), path.join(directory, 'bin/child-environment.mjs'));
  // Mirror bin/lib whole, as the minimal gate-root fixture does: the kernel
  // reaches child-environment.mjs, which reaches operator-cli.mjs, and chasing
  // that graph file by file is a property of the fixture rather than of the
  // campaign under test.
  fs.cpSync(path.join(ROOT, 'bin/lib'), path.join(directory, 'bin/lib'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'src/guarded.txt'), 'SAFE_TOKEN is present\nsecond line\n');
  fs.writeFileSync(path.join(directory, 'config/hardening-rule-probes.v1.json'),
    `${JSON.stringify({ schemaVersion: 'nightwatch.hardening-rule-probes.v1', probes }, null, 2)}\n`);
  // The synthetic engine: an entry point the campaign can spawn with --only.
  fs.writeFileSync(path.join(directory, 'bin/engine.mjs'), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "import { root } from './lib/hardening/kernel.mjs';",
    "const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);",
    "const text = fs.readFileSync(path.join(root, 'src/guarded.txt'), 'utf8');",
    "if (only === 'checkGuarded' && !text.includes('SAFE_TOKEN')) { console.error('guarded token missing'); process.exit(1); }",
    "process.exit(0);",
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(directory, 'bin/run.mjs'), [
    "import { runRuleProbeCampaign } from './lib/hardening/probe-campaign.mjs';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "const entry = path.join(path.dirname(fileURLToPath(import.meta.url)), 'engine.mjs');",
    "const names = (process.env.SYNTHETIC_RULES ?? 'checkGuarded').split(',').filter(Boolean);",
    "const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);",
    "runRuleProbeCampaign(names.map((name) => ({ name })), only, entry);",
    '',
  ].join('\n'));
  gitOk(directory, ['init']);
  gitOk(directory, ['add', '.']);
  gitOk(directory, ['commit', '-m', 'synthetic probe base']);
  return directory;
}

function runCampaign(directory: string, rules: string, args: readonly string[] = []): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [path.join(directory, 'bin/run.mjs'), ...args], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, SYNTHETIC_RULES: rules },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** Working-tree bytes plus git's own view, so nothing can leak unnoticed. */
function treeState(directory: string): string {
  return [
    fs.readFileSync(path.join(directory, 'src/guarded.txt'), 'utf8'),
    gitOk(directory, ['status', '--porcelain']),
  ].join('\n--\n');
}

const DETECTING: Probe[] = [{ id: 'HC-T01', ops: [{ file: 'src/guarded.txt', search: 'SAFE_TOKEN', replace: 'BROKEN_TOKEN' }] }];

test.describe('hardening probe campaign — the contract a required gate group depends on', () => {
  test('a detected probe passes, restores the bytes and leaves git status unchanged', () => {
    const directory = probeRoot({ checkGuarded: DETECTING });
    try {
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkGuarded');
      expect(result.stdout).toContain('checkGuarded DETECTED HC-T01');
      expect(result.stdout).toContain('rules=1 probes=1 detected=1 undetected=0');
      expect(result.stdout).toContain('statusUnchanged=true');
      expect(result.status).toBe(0);
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a probe the rule does not detect makes the campaign FAIL', () => {
    // The HC-059 / HC-015 rot class: the mutation lands, the rule shrugs.
    // Without this the gate would report PASS for a rule proving nothing.
    const directory = probeRoot({ checkBlind: DETECTING });
    try {
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkBlind');
      expect(result.stdout).toContain('checkBlind UNDETECTED HC-T01');
      expect(result.stdout).toContain('detected=0 undetected=1');
      expect(result.status).toBe(1);
      // Still restored: a failing campaign must not leave the tree dirty.
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a rule with no recorded probe is UNPROVEN and fails', () => {
    const directory = probeRoot({});
    try {
      const result = runCampaign(directory, 'checkGuarded');
      expect(result.stdout).toContain('checkGuarded UNPROVEN (no recorded probe)');
      expect(result.status).toBe(1);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a campaign that selects no rule fails as vacuous rather than passing', () => {
    const directory = probeRoot({ checkGuarded: DETECTING });
    try {
      const result = runCampaign(directory, 'checkGuarded', ['--only=checkNotARule']);
      expect(result.stdout).toContain('rules=0 probes=0');
      expect(result.stderr).toContain('VACUOUS_CAMPAIGN');
      expect(result.stderr).toContain('no rules were selected');
      expect(result.status).toBe(1);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a campaign that executes no probe fails as vacuous', () => {
    // Every selected rule carries an empty probe list: rules > 0, probes == 0.
    const directory = probeRoot({ checkGuarded: [] });
    try {
      const result = runCampaign(directory, 'checkGuarded');
      expect(result.stdout).toContain('probes=0');
      expect(result.stderr).toContain('VACUOUS_CAMPAIGN');
      expect(result.stderr).toContain('no probe was executed');
      expect(result.status).toBe(1);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a probe whose search literal is absent errors, restores, and fails', () => {
    const directory = probeRoot({ checkGuarded: [{ id: 'HC-T02', ops: [{ file: 'src/guarded.txt', search: 'NOT_PRESENT_ANYWHERE', replace: 'x' }] }] });
    try {
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkGuarded');
      expect(result.stdout).toContain('PROBE_ERROR');
      expect(result.status).toBe(1);
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a created file is removed again, leaving no untracked debris', () => {
    const directory = probeRoot({ checkGuarded: [{ id: 'HC-T03', ops: [{ file: 'src/created-by-probe.txt', create: 'probe\n' }] }] });
    try {
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkGuarded');
      // The synthetic rule cannot see this file, so the probe is UNDETECTED and
      // the campaign fails -- but the created file must still be gone.
      expect(result.status).toBe(1);
      expect(fs.existsSync(path.join(directory, 'src/created-by-probe.txt'))).toBe(false);
      expect(gitOk(directory, ['status', '--porcelain'])).not.toContain('created-by-probe');
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('a probe may follow a rule that resolves its subject through the active task', () => {
    // HC-015 named a fixed task directory while its rule followed
    // .agent/ACTIVE_TASK.md, so the probe silently stopped mutating the file
    // under test. The placeholder makes probe and rule share the indirection.
    const directory = probeRoot({ checkGuarded: [{ id: 'HC-T04', ops: [{ file: '<ACTIVE_TASK_DIR>/STATE.md', append: '\nprobe\n' }] }] });
    try {
      fs.mkdirSync(path.join(directory, '.agent/tasks/synthetic'), { recursive: true });
      fs.writeFileSync(path.join(directory, '.agent/tasks/synthetic/STATE.md'), '# State\n');
      fs.writeFileSync(path.join(directory, '.agent/ACTIVE_TASK.md'), 'Task directory: .agent/tasks/synthetic\n');
      gitOk(directory, ['add', '.']);
      gitOk(directory, ['commit', '-m', 'synthetic active task']);
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkGuarded');
      // The placeholder resolved: the probe reached a real file, mutated it and
      // restored it. (The synthetic rule ignores it, so the verdict is
      // UNDETECTED; what is proven here is the resolution and the restore.)
      expect(result.stdout).not.toContain('PROBE_ERROR');
      expect(fs.readFileSync(path.join(directory, '.agent/tasks/synthetic/STATE.md'), 'utf8')).toBe('# State\n');
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('an unresolvable active-task placeholder errors instead of probing the wrong file', () => {
    const directory = probeRoot({ checkGuarded: [{ id: 'HC-T05', ops: [{ file: '<ACTIVE_TASK_DIR>/STATE.md', append: '\nprobe\n' }] }] });
    try {
      const before = treeState(directory);
      const result = runCampaign(directory, 'checkGuarded');
      expect(result.stdout).toContain('PROBE_ERROR');
      expect(result.stdout).toContain('unresolvable');
      expect(result.status).toBe(1);
      expect(treeState(directory)).toBe(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
