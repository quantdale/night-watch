import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * NW-AUD-006 — session mutation authority binding.
 *
 * These cases drive the confused-deputy and race boundaries the delta spec
 * requires: canonical plus linked worktrees, wrong-checkout invocation,
 * stale/foreign expectations, continuity refusal, transition-lock and
 * revision-conflict behavior, recovery of a provably crashed lock, and
 * pre-network admission. Every case runs against a disposable synthetic
 * repository; the canonical Nightwatch checkout and every live session are
 * never touched.
 */

const ROOT = path.resolve(__dirname, '../..');

const GIT_FLAGS = [
  '-c', 'user.name=Nightwatch Synthetic',
  '-c', 'user.email=synthetic@nightwatch.invalid',
  '-c', 'commit.gpgsign=false',
  '-c', 'init.defaultBranch=main',
];

const CLI_SOURCES = [
  'bin/nightwatch-session.mjs',
  'bin/workspace-integrity.mjs',
  'bin/agent-continuity-protocol.mjs',
  'bin/lib/operator-cli.mjs',
  'bin/lib/session-authority.mjs',
];

interface Run {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function git(cwd: string, args: readonly string[]): Run {
  const result = spawnSync('git', [...GIT_FLAGS, ...args], { cwd, encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function gitOk(cwd: string, args: readonly string[]): string {
  const result = git(cwd, args);
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function session(cwd: string, args: readonly string[], environment: Readonly<Record<string, string>> = {}): Run {
  const result = spawnSync(process.execPath, [path.join(cwd, 'bin/nightwatch-session.mjs'), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...environment },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function sessionAsync(cwd: string, args: readonly string[], environment: Readonly<Record<string, string>> = {}): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(cwd, 'bin/nightwatch-session.mjs'), ...args], {
      cwd,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

interface Fixture {
  readonly base: string;
  readonly upstream: string;
  readonly canonical: string;
  readonly baseSha: string;
}

function fixture(): Fixture {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-nwaud006-'));
  const upstream = path.join(base, 'upstream.git');
  const seed = path.join(base, 'seed');
  fs.mkdirSync(seed, { recursive: true });
  gitOk(seed, ['init', '-b', 'main']);
  for (const relative of CLI_SOURCES) {
    const destination = path.join(seed, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relative), destination);
  }
  fs.mkdirSync(path.join(seed, 'config'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'config/workspace-integrity.v1.json'), path.join(seed, 'config/workspace-integrity.v1.json'));
  for (const taskId of ['authority-task', 'authority-other']) {
    fs.mkdirSync(path.join(seed, '.agent/tasks', taskId), { recursive: true });
    fs.writeFileSync(path.join(seed, '.agent/tasks', taskId, 'STATE.md'), [
      '# Task State',
      '',
      '## Identity',
      '',
      `Task ID: ${taskId}`,
      'Status: IN_PROGRESS',
      '',
    ].join('\n'));
  }
  fs.writeFileSync(path.join(seed, '.agent/ACTIVE_TASK.md'), [
    '# Active Task',
    '',
    'Task ID: authority-task',
    'Status: IN_PROGRESS',
    'Task directory: .agent/tasks/authority-task',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(seed, 'tracked.txt'), 'tracked content\n');
  gitOk(seed, ['add', '.']);
  gitOk(seed, ['commit', '-m', 'synthetic base']);
  gitOk(base, ['clone', '--bare', seed, upstream]);
  const canonical = path.join(base, 'canonical');
  gitOk(base, ['clone', upstream, canonical]);
  gitOk(canonical, ['config', 'user.name', 'Nightwatch Synthetic']);
  gitOk(canonical, ['config', 'user.email', 'synthetic@nightwatch.invalid']);
  gitOk(canonical, ['config', 'commit.gpgsign', 'false']);
  return { base, upstream, canonical, baseSha: gitOk(canonical, ['rev-parse', 'HEAD']) };
}

function cleanup(base: string): void {
  fs.rmSync(base, { recursive: true, force: true });
}

function recordPath(canonical: string, name: string): string {
  return path.join(canonical, '.git/worktrees', name, 'nightwatch-session.v1.json');
}

function lockPath(canonical: string, name: string): string {
  return `${recordPath(canonical, name)}.lock`;
}

function recordOf(canonical: string, name: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(recordPath(canonical, name), 'utf8')) as Record<string, any>;
}

function headOf(worktree: string): string {
  return gitOk(worktree, ['rev-parse', 'HEAD']);
}

function currentBootDigest(): string {
  const raw = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 24);
}

/** Everything a mutation could touch in a synthetic fixture. */
function protectedState(canonical: string, upstream: string): string {
  const parts: string[] = [];
  const worktrees = gitOk(canonical, ['worktree', 'list', '--porcelain']);
  parts.push(worktrees);
  parts.push(gitOk(canonical, ['branch', '-a', '--format=%(refname) %(objectname)']));
  parts.push(gitOk(canonical, ['rev-parse', 'refs/remotes/origin/main']));
  parts.push(gitOk(upstream, ['rev-parse', 'refs/heads/main']));
  for (const line of worktrees.split('\n')) {
    if (!line.startsWith('worktree ')) continue;
    const dir = line.slice('worktree '.length);
    const file = path.join(dir, '.agent/tasks/authority-task/STATE.md');
    if (fs.existsSync(file)) parts.push(`${dir}:${fs.readFileSync(file, 'utf8')}`);
  }
  return parts.join('\n---\n');
}

interface Owned {
  readonly path: string;
  readonly name: string;
  readonly sessionId: string;
}

function startReleased(fx: Fixture, taskId = 'authority-task'): { readonly path: string; readonly name: string; readonly predecessor: string } {
  const started = session(fx.canonical, ['start', '--task', taskId, '--dir', path.join(fx.base, 'worktrees')]);
  expect(started.status, started.stderr).toBe(0);
  const match = /name=(\S+) branch=(\S+) base=\S+ path=(\S+)/.exec(started.stdout);
  expect(match).not.toBeNull();
  const name = match![1]!;
  const target = match![3]!;
  return { path: target, name, predecessor: recordOf(fx.canonical, name).sessionId as string };
}

function startOwned(fx: Fixture, taskId = 'authority-task'): Owned {
  const released = startReleased(fx, taskId);
  const claimed = session(released.path, ['claim', '--task', taskId, '--adopt', '--expect-session', released.predecessor]);
  expect(claimed.status, claimed.stderr).toBe(0);
  return { path: released.path, name: released.name, sessionId: recordOf(fx.canonical, released.name).sessionId as string };
}

function writeContinuity(worktree: string, taskId: string, branch: string, status = 'IN_PROGRESS'): void {
  fs.writeFileSync(path.join(worktree, '.agent/ACTIVE_TASK.md'), [
    '# Active Task',
    '',
    `Task ID: ${taskId}`,
    `Status: ${status}`,
    `Task directory: .agent/tasks/${taskId}`,
    'Current milestone: synthetic',
    'Next action: keep testing',
    '',
    '## Routing and safety',
    '',
    '```',
    `CAMPAIGN: ${taskId}`,
    `SESSION WORKTREE: ${branch}`,
    '```',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(worktree, '.agent/tasks', taskId, 'STATE.md'), [
    '# Task State',
    '',
    '## Identity',
    '',
    `Task ID: ${taskId}`,
    `Status: ${status}`,
    `Branch: ${branch}`,
    '',
  ].join('\n'));
}

function writeTerminalContinuity(worktree: string, taskId: string): void {
  fs.writeFileSync(path.join(worktree, '.agent/ACTIVE_TASK.md'), [
    '# Active Task',
    '',
    `Task ID: ${taskId}`,
    'Status: COMPLETE',
    `Task directory: .agent/tasks/${taskId}`,
    'Next action: STOP — terminal campaign record.',
    '',
    '## Routing and safety',
    '',
    '```',
    `CAMPAIGN: ${taskId}`,
    'SESSION WORKTREE: NONE',
    '```',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(worktree, '.agent/tasks', taskId, 'STATE.md'), [
    '# Task State',
    '',
    '## Identity',
    '',
    `Task ID: ${taskId}`,
    'Status: COMPLETE',
    'Branch: main',
    '',
  ].join('\n'));
}

test.describe('NW-AUD-006 — invocation binding', () => {
  test('every mutating command refuses --root before any effect', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const before = protectedState(fx.canonical, fx.upstream);
      const attempts: readonly (readonly string[])[] = [
        ['release', '--root', owned.path, '--expect-session', owned.sessionId],
        ['reconcile', '--root', owned.path, '--expect-session', owned.sessionId],
        ['integrate', '--root', owned.path, '--expect-session', owned.sessionId, '--expect-head', headOf(owned.path)],
        ['claim', '--root', owned.path, '--task', 'authority-other'],
        ['remove', '--root', owned.path, '--name', owned.name, '--expect-session', owned.sessionId],
        ['recover', '--root', owned.path],
      ];
      for (const args of attempts) {
        const refused = session(fx.canonical, args);
        expect(refused.status, `${args[0]} must refuse --root`).toBe(1);
        expect(refused.stderr, args[0]).toContain('SESSION_MUTATION_ROOT_OVERRIDE_REFUSED');
      }
      expect(protectedState(fx.canonical, fx.upstream)).toBe(before);
      expect(recordOf(fx.canonical, owned.name).sessionId).toBe(owned.sessionId);
    } finally {
      cleanup(fx.base);
    }
  });

  test('a CLI from a foreign checkout cannot mutate the current or target worktree', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const before = protectedState(fx.canonical, fx.upstream);

      // Canonical CLI executed with the owned worktree as cwd.
      const foreignScript = spawnSync(process.execPath, [
        path.join(fx.canonical, 'bin/nightwatch-session.mjs'),
        'release', '--expect-session', owned.sessionId,
      ], { cwd: owned.path, encoding: 'utf8', timeout: 60_000 });
      expect(foreignScript.status).toBe(1);
      expect(foreignScript.stderr).toContain('SESSION_SCRIPT_CHECKOUT_MISMATCH');

      // Owned CLI executed with the canonical checkout as cwd.
      const foreignCwd = spawnSync(process.execPath, [
        path.join(owned.path, 'bin/nightwatch-session.mjs'),
        'release', '--expect-session', owned.sessionId,
      ], { cwd: fx.canonical, encoding: 'utf8', timeout: 60_000 });
      expect(foreignCwd.status).toBe(1);
      expect(foreignCwd.stderr).toContain('SESSION_SCRIPT_CHECKOUT_MISMATCH');

      expect(protectedState(fx.canonical, fx.upstream)).toBe(before);
    } finally {
      cleanup(fx.base);
    }
  });

  test('cross-root status stays read-only and privacy-safe', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const before = protectedState(fx.canonical, fx.upstream);
      const status = session(fx.canonical, ['status', '--root', owned.path, '--json']);
      expect(status.status, status.stderr).toBe(0);
      const report = JSON.parse(status.stdout);
      expect(report.self.class).toBe('OWNED_SESSION');
      expect(status.stdout).not.toContain(owned.path);
      expect(status.stdout).not.toContain(fx.canonical);
      expect(protectedState(fx.canonical, fx.upstream)).toBe(before);
    } finally {
      cleanup(fx.base);
    }
  });
});

test.describe('NW-AUD-006 — explicit expectations', () => {
  test('release requires the exact current session and refuses a stale or missing expectation', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const before = fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8');
      for (const args of [
        ['release'],
        ['release', '--expect-session', 'sess-000000000000'],
      ]) {
        const refused = session(owned.path, args);
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('SESSION_EXPECTATION_MISMATCH');
      }
      expect(fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8')).toBe(before);
      const released = session(owned.path, ['release', '--expect-session', owned.sessionId]);
      expect(released.status, released.stderr).toBe(0);
      expect(recordOf(fx.canonical, owned.name).ownershipState).toBe('RELEASED');
    } finally {
      cleanup(fx.base);
    }
  });

  test('adoption requires the exact predecessor session', () => {
    const fx = fixture();
    try {
      const released = startReleased(fx);
      const before = fs.readFileSync(recordPath(fx.canonical, released.name), 'utf8');
      for (const args of [
        ['claim', '--task', 'authority-task', '--adopt'],
        ['claim', '--task', 'authority-task', '--adopt', '--expect-session', 'sess-111111111111'],
      ]) {
        const refused = session(released.path, args);
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('SESSION_EXPECTATION_MISMATCH');
      }
      expect(fs.readFileSync(recordPath(fx.canonical, released.name), 'utf8')).toBe(before);
      const adopted = session(released.path, ['claim', '--task', 'authority-task', '--adopt', '--expect-session', released.predecessor]);
      expect(adopted.status, adopted.stderr).toBe(0);
      expect(recordOf(fx.canonical, released.name).sessionId).not.toBe(released.predecessor);
    } finally {
      cleanup(fx.base);
    }
  });

  test('integration refuses a stale HEAD intent before any network callback', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      fs.writeFileSync(path.join(owned.path, 'session.txt'), 'session work\n');
      gitOk(owned.path, ['add', 'session.txt']);
      gitOk(owned.path, ['commit', '-m', 'session work']);
      const head = headOf(owned.path);

      // Advance the remote so a fetch WOULD move the remote-tracking ref.
      const other = path.join(fx.base, 'other');
      gitOk(fx.base, ['clone', fx.upstream, other]);
      fs.writeFileSync(path.join(other, 'other.txt'), 'other work\n');
      gitOk(other, ['add', 'other.txt']);
      gitOk(other, ['commit', '-m', 'other work']);
      gitOk(other, ['push', 'origin', 'HEAD:refs/heads/main']);
      const trackingBefore = gitOk(owned.path, ['rev-parse', 'refs/remotes/origin/main']);
      const recordBefore = fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8');

      for (const args of [
        ['integrate', '--expect-session', owned.sessionId],
        ['integrate', '--expect-session', owned.sessionId, '--expect-head', '0'.repeat(40)],
        ['integrate', '--expect-session', 'sess-000000000000', '--expect-head', head],
      ]) {
        const refused = session(owned.path, args);
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('SESSION_EXPECTATION_MISMATCH');
      }
      // No fetch, no push: the tracking ref and the record are byte-identical.
      expect(gitOk(owned.path, ['rev-parse', 'refs/remotes/origin/main'])).toBe(trackingBefore);
      expect(fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8')).toBe(recordBefore);
    } finally {
      cleanup(fx.base);
    }
  });
});

test.describe('NW-AUD-006 — continuity admission', () => {
  test('release refuses when the active task or its STATE disagrees', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const branch = gitOk(owned.path, ['rev-parse', '--abbrev-ref', 'HEAD']);
      writeContinuity(owned.path, 'authority-task', branch);
      expect(session(owned.path, ['release', '--expect-session', owned.sessionId]).status).toBe(0);

      // Re-own, then break each continuity relation in turn.
      const reAdopted = session(owned.path, ['claim', '--task', 'authority-task', '--adopt', '--expect-session', owned.sessionId]);
      expect(reAdopted.status, reAdopted.stderr).toBe(0);
      const sessionId = recordOf(fx.canonical, owned.name).sessionId as string;

      const cases: readonly { taskId: string; branch: string; status?: string }[] = [
        { taskId: 'authority-other', branch },
        { taskId: 'authority-task', branch: 'session/someone-else' },
        { taskId: 'authority-task', branch, status: 'WAT' },
      ];
      for (const entry of cases) {
        writeContinuity(owned.path, entry.taskId, entry.branch, entry.status ?? 'IN_PROGRESS');
        const recordBefore = fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8');
        const refused = session(owned.path, ['release', '--expect-session', sessionId]);
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('SESSION_CONTINUITY_MISMATCH');
        expect(fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8')).toBe(recordBefore);
      }

      // A command/status incompatibility refuses too: reconcile needs live work.
      writeContinuity(owned.path, 'authority-task', branch, 'COMPLETE');
      const reconcile = session(owned.path, ['reconcile', '--expect-session', sessionId]);
      expect(reconcile.status).toBe(1);
      expect(reconcile.stderr).toContain('SESSION_CONTINUITY_MISMATCH');
    } finally {
      cleanup(fx.base);
    }
  });

  test('a complete canonical-routed task integrates and releases from its owned session', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      fs.writeFileSync(path.join(owned.path, 'terminal.txt'), 'terminal work\n');
      gitOk(owned.path, ['add', 'terminal.txt']);
      gitOk(owned.path, ['commit', '-m', 'terminal work']);
      writeTerminalContinuity(owned.path, 'authority-task');
      gitOk(owned.path, ['add', '.agent/ACTIVE_TASK.md', '.agent/tasks/authority-task/STATE.md']);
      gitOk(owned.path, ['commit', '-m', 'terminal continuity']);
      const head = headOf(owned.path);
      const result = session(owned.path, ['integrate', '--expect-session', owned.sessionId, '--expect-head', head]);
      expect(result.status, result.stderr).toBe(0);
      expect(gitOk(fx.canonical, ['rev-parse', 'refs/remotes/origin/main'])).toBe(head);
      const released = session(owned.path, ['release', '--expect-session', owned.sessionId]);
      expect(released.status, released.stderr).toBe(0);
    } finally {
      cleanup(fx.base);
    }
  });
});

test.describe('NW-AUD-006 — transition lock and recovery', () => {
  test('a competing lock blocks every mutator and recovery removes only the exact proven lock', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      const recordBefore = fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8');
      const lock = {
        schemaVersion: 'nightwatch.session-transition-lock.v1',
        command: 'release',
        sessionId: owned.sessionId,
        bootDigest: '0'.repeat(24),
        pid: 1,
        startedAtIso: new Date().toISOString(),
        operationId: 'abcdefabcdefabcd',
      };
      fs.writeFileSync(lockPath(fx.canonical, owned.name), `${JSON.stringify(lock, null, 2)}\n`);

      for (const args of [
        ['release', '--expect-session', owned.sessionId],
        ['reconcile', '--expect-session', owned.sessionId],
        ['integrate', '--expect-session', owned.sessionId, '--expect-head', headOf(owned.path)],
      ]) {
        const refused = session(owned.path, args);
        expect(refused.status).toBe(1);
        expect(refused.stderr).toContain('SESSION_TRANSITION_LOCKED');
      }
      expect(fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8')).toBe(recordBefore);

      // A live lock (same boot, live pid) is never reclaimed.
      fs.writeFileSync(lockPath(fx.canonical, owned.name), `${JSON.stringify({ ...lock, bootDigest: currentBootDigest(), pid: process.pid, operationId: 'ffffffffffffffff' }, null, 2)}\n`);
      const live = session(owned.path, ['recover', '--expect-session', owned.sessionId, '--expect-operation', 'ffffffffffffffff']);
      expect(live.status).toBe(1);
      expect(live.stderr).toContain('SESSION_RECOVER_REFUSED');
      expect(fs.existsSync(lockPath(fx.canonical, owned.name))).toBe(true);

      // The exact operation identity is required.
      fs.writeFileSync(lockPath(fx.canonical, owned.name), `${JSON.stringify(lock, null, 2)}\n`);
      const wrongOperation = session(owned.path, ['recover', '--expect-session', owned.sessionId, '--expect-operation', '0000000000000000']);
      expect(wrongOperation.status).toBe(1);
      expect(wrongOperation.stderr).toContain('SESSION_RECOVER_REFUSED');
      const wrongSession = session(owned.path, ['recover', '--expect-session', 'sess-222222222222', '--expect-operation', 'abcdefabcdefabcd']);
      expect(wrongSession.status).toBe(1);
      expect(wrongSession.stderr).toContain('SESSION_EXPECTATION_MISMATCH');

      const dryRun = session(owned.path, ['recover', '--dry-run']);
      expect(dryRun.status, dryRun.stderr).toBe(0);
      expect(dryRun.stdout).toContain('operation=abcdefabcdefabcd');
      expect(dryRun.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: recover');
      expect(fs.existsSync(lockPath(fx.canonical, owned.name))).toBe(true);

      const recovered = session(owned.path, ['recover', '--expect-session', owned.sessionId, '--expect-operation', 'abcdefabcdefabcd']);
      expect(recovered.status, recovered.stderr).toBe(0);
      expect(recovered.stdout).toContain('SESSION_RECOVERED_LOCK');
      expect(fs.existsSync(lockPath(fx.canonical, owned.name))).toBe(false);
      // Recovery never changes the ownership record.
      expect(fs.readFileSync(recordPath(fx.canonical, owned.name), 'utf8')).toBe(recordBefore);
    } finally {
      cleanup(fx.base);
    }
  });

  test('a malformed or symlinked lock fails closed and is never overwritten', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      fs.writeFileSync(lockPath(fx.canonical, owned.name), '{ not json\n');
      const malformed = session(owned.path, ['release', '--expect-session', owned.sessionId]);
      expect(malformed.status).toBe(1);
      expect(malformed.stderr).toContain('SESSION_TRANSITION_LOCK_INVALID');
      fs.rmSync(lockPath(fx.canonical, owned.name));

      fs.symlinkSync(path.join(fx.base, 'nowhere'), lockPath(fx.canonical, owned.name));
      const symlinked = session(owned.path, ['release', '--expect-session', owned.sessionId]);
      expect(symlinked.status).toBe(1);
      expect(symlinked.stderr).toContain('SESSION_TRANSITION_LOCK_INVALID');
      expect(fs.lstatSync(lockPath(fx.canonical, owned.name)).isSymbolicLink()).toBe(true);
    } finally {
      cleanup(fx.base);
    }
  });

  test('two concurrent adoptions commit exactly one transition', async () => {
    const fx = fixture();
    try {
      const released = startReleased(fx);
      const args = ['claim', '--task', 'authority-task', '--adopt', '--expect-session', released.predecessor];
      const results = await Promise.all([
        sessionAsync(released.path, args),
        sessionAsync(released.path, args),
        sessionAsync(released.path, args),
      ]);
      const winners = results.filter((result) => result.status === 0);
      expect(winners).toHaveLength(1);
      for (const loser of results.filter((result) => result.status !== 0)) {
        expect(loser.stderr).toMatch(/SESSION_TRANSITION_LOCKED|SESSION_RECORD_REVISION_CHANGED|SESSION_ALREADY_OWNED/);
      }
      const record = recordOf(fx.canonical, released.name);
      expect(record.ownershipState).toBe('OWNED');
      expect(record.sessionId).not.toBe(released.predecessor);
      expect(results.filter((result) => result.stdout.includes('SESSION_CLAIMED'))).toHaveLength(1);
    } finally {
      cleanup(fx.base);
    }
  });
});

test.describe('NW-AUD-006 — integration outcomes', () => {
  test('a verified push followed by unverifiable local finalization reports uncertainty without retrying', () => {
    const fx = fixture();
    try {
      const owned = startOwned(fx);
      fs.writeFileSync(path.join(owned.path, 'session.txt'), 'session work\n');
      gitOk(owned.path, ['add', 'session.txt']);
      gitOk(owned.path, ['commit', '-m', 'session work']);
      const head = headOf(owned.path);
      const result = session(
        owned.path,
        ['integrate', '--expect-session', owned.sessionId, '--expect-head', head],
        { NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_INTEGRATION_VERIFY' },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN');
      // The remote effect really happened and is never reported as failed.
      expect(gitOk(fx.upstream, ['rev-parse', 'refs/heads/main'])).toBe(head);
      // The record was not updated, so the uncertainty is truthful.
      expect(recordOf(fx.canonical, owned.name).integrationState).toBe('NOT_INTEGRATED');
    } finally {
      cleanup(fx.base);
    }
  });
});

test.describe('NW-AUD-006 — two linked sessions', () => {
  test('a second linked worktree cannot be mutated through the first, and its lock stays private', () => {
    const fx = fixture();
    try {
      const alpha = startOwned(fx, 'authority-task');
      const beta = startOwned(fx, 'authority-other');

      // Release beta first so the only refusal under test is the authority
      // mismatch, not live-holder protection. Each worktree carries its own
      // active-task routing, so beta's continuity names its own task/branch.
      const betaBranch = gitOk(beta.path, ['rev-parse', '--abbrev-ref', 'HEAD']);
      writeContinuity(beta.path, 'authority-other', betaBranch);
      const betaRelease = session(beta.path, ['release', '--expect-session', beta.sessionId]);
      expect(betaRelease.status, betaRelease.stderr).toBe(0);
      const betaReleased = fs.readFileSync(recordPath(fx.canonical, beta.name), 'utf8');

      // Alpha's public session id can never name beta's worktree.
      const wrongTarget = session(fx.canonical, ['remove', '--name', beta.name, '--expect-session', alpha.sessionId]);
      expect(wrongTarget.status).toBe(1);
      expect(wrongTarget.stderr).toContain('SESSION_EXPECTATION_MISMATCH');
      expect(fs.readFileSync(recordPath(fx.canonical, beta.name), 'utf8')).toBe(betaReleased);
      expect(fs.existsSync(beta.path)).toBe(true);

      // A lock held for beta is invisible to alpha: alpha's own transition
      // takes alpha's lock and leaves beta's record and lock byte-identical.
      const lock = {
        schemaVersion: 'nightwatch.session-transition-lock.v1',
        command: 'release',
        sessionId: beta.sessionId,
        bootDigest: '0'.repeat(24),
        pid: 1,
        startedAtIso: new Date().toISOString(),
        operationId: '0011223344556677',
      };
      fs.writeFileSync(lockPath(fx.canonical, beta.name), `${JSON.stringify(lock, null, 2)}\n`);
      const alphaRelease = session(alpha.path, ['release', '--expect-session', alpha.sessionId]);
      expect(alphaRelease.status, alphaRelease.stderr).toBe(0);
      expect(fs.existsSync(lockPath(fx.canonical, beta.name))).toBe(true);
      expect(fs.readFileSync(recordPath(fx.canonical, beta.name), 'utf8')).toBe(betaReleased);

      // Recovery is bound to the current worktree: alpha has no lock of its
      // own, so its recover can never remove beta's.
      const recoveryFromAlpha = session(alpha.path, ['recover', '--expect-session', beta.sessionId, '--expect-operation', '0011223344556677']);
      expect(recoveryFromAlpha.status, recoveryFromAlpha.stderr).toBe(0);
      expect(recoveryFromAlpha.stdout).toContain('SESSION_RECOVER_NOT_REQUIRED');
      expect(fs.existsSync(lockPath(fx.canonical, beta.name))).toBe(true);

      // The exact beta run removes only beta's lock and never edits its record.
      const recoveryFromBeta = session(beta.path, ['recover', '--expect-session', beta.sessionId, '--expect-operation', '0011223344556677']);
      expect(recoveryFromBeta.status, recoveryFromBeta.stderr).toBe(0);
      expect(recoveryFromBeta.stdout).toContain('SESSION_RECOVERED_LOCK');
      expect(fs.existsSync(lockPath(fx.canonical, beta.name))).toBe(false);
      expect(fs.readFileSync(recordPath(fx.canonical, beta.name), 'utf8')).toBe(betaReleased);
      expect(recordOf(fx.canonical, alpha.name).ownershipState).toBe('RELEASED');
    } finally {
      cleanup(fx.base);
    }
  });
});
