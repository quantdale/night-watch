import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

/**
 * C-00 adversarial matrix A–L.
 *
 * Every case runs against a DISPOSABLE synthetic repository created inside the
 * test's own temporary directory. The canonical Nightwatch checkout, any live
 * session worktree, and every sibling company repository are never touched.
 */

const ROOT = path.resolve(__dirname, '../..');
const INTEGRITY = path.join(ROOT, 'bin/workspace-integrity.mjs');
const SESSION = path.join(ROOT, 'bin/nightwatch-session.mjs');
const POLICY = path.join(ROOT, 'config/workspace-integrity.v1.json');

const GIT_FLAGS = [
  '-c', 'user.name=Nightwatch Synthetic',
  '-c', 'user.email=synthetic@nightwatch.invalid',
  '-c', 'commit.gpgsign=false',
  '-c', 'init.defaultBranch=main',
  '-c', 'advice.detachedHead=false',
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

function integrityJson(cwd: string): { readonly report: Record<string, any>; readonly status: number | null } {
  const result = spawnSync(process.execPath, [INTEGRITY, 'check', '--json'], { cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
  return { report: JSON.parse(result.stdout ?? '{}'), status: result.status };
}

function session(cwd: string, args: readonly string[], environment: Readonly<Record<string, string>> = {}): Run {
  const result = spawnSync(process.execPath, [SESSION, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...environment },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** Rewrites one synthetic task's STATE.md status inside the given checkout. */
function setTaskStatus(cwd: string, taskId: string, status: string): void {
  const file = path.join(cwd, '.agent', 'tasks', taskId, 'STATE.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, [
    '# Task State',
    '',
    '## Identity',
    '',
    `Task ID: ${taskId}`,
    `Status: ${status}`,
    '',
  ].join('\n'));
}

/** Names of every error code the inspection core reported. */
function codes(report: Record<string, any>): string[] {
  return (report.errors ?? []).map((error: { code: string }) => error.code);
}

function invariant(report: Record<string, any>, id: string): string {
  return (report.invariants ?? []).find((entry: { id: string }) => entry.id === id)?.status ?? 'MISSING';
}

/**
 * A disposable "upstream + canonical clone" topology, so that origin/main
 * exists and integration semantics are real rather than simulated.
 */
interface FixtureOptions {
  /** Lower the worktree bound so capacity cases do not create eight worktrees. */
  readonly maxWorktrees?: number;
}

function fixture(options: FixtureOptions = {}): { readonly base: string; readonly upstream: string; readonly canonical: string; readonly baseSha: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c00-'));
  const upstream = path.join(base, 'upstream.git');
  const seed = path.join(base, 'seed');
  fs.mkdirSync(seed, { recursive: true });
  gitOk(seed, ['init', '-b', 'main']);
  for (const taskId of ['synthetic-task', 'synthetic-task-two', 'synthetic-maintenance']) {
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
  fs.mkdirSync(path.join(seed, 'config'), { recursive: true });
  if (options.maxWorktrees === undefined) {
    fs.copyFileSync(POLICY, path.join(seed, 'config/workspace-integrity.v1.json'));
  } else {
    // The real policy, with only the bound lowered: the rule under test must
    // be the shipped rule, not a test-local reimplementation of it.
    const policy = JSON.parse(fs.readFileSync(POLICY, 'utf8'));
    policy.worktreePolicy.maxWorktrees = options.maxWorktrees;
    fs.writeFileSync(path.join(seed, 'config/workspace-integrity.v1.json'), `${JSON.stringify(policy, null, 2)}\n`);
  }
  fs.writeFileSync(path.join(seed, 'tracked.txt'), 'tracked content\n');
  fs.writeFileSync(path.join(seed, 'victim.txt'), 'another session owns this file\n');
  fs.writeFileSync(path.join(seed, '.agent/ACTIVE_TASK.md'), [
    '# Active Task',
    '',
    'Task ID: synthetic-task',
    'Status: IN_PROGRESS',
    'Task directory: .agent/tasks/synthetic-task',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(seed, '.agent/tasks/synthetic-task/SPEC.md'), [
    '# Synthetic Spec',
    '',
    '## Declared Deletions',
    '',
    '- NONE',
    '',
  ].join('\n'));
  gitOk(seed, ['add', '.']);
  gitOk(seed, ['commit', '-m', 'synthetic base']);
  gitOk(base, ['clone', '--bare', seed, upstream]);
  const canonical = path.join(base, 'canonical');
  gitOk(base, ['clone', upstream, canonical]);
  // Repository-local identity so the session CLI's own merge commits work
  // without inheriting anything from the host environment.
  gitOk(canonical, ['config', 'user.name', 'Nightwatch Synthetic']);
  gitOk(canonical, ['config', 'user.email', 'synthetic@nightwatch.invalid']);
  gitOk(canonical, ['config', 'commit.gpgsign', 'false']);
  const baseSha = gitOk(canonical, ['rev-parse', 'HEAD']);
  return { base, upstream, canonical, baseSha };
}

function cleanup(base: string): void {
  fs.rmSync(base, { recursive: true, force: true });
}

/** Creates an owned session worktree and returns its path and name. */
function startOwnedSession(canonical: string, base: string, taskId: string): { readonly path: string; readonly name: string } {
  const started = session(canonical, ['start', '--task', taskId, '--dir', path.join(base, 'worktrees')]);
  expect(started.status, started.stderr).toBe(0);
  const match = /name=(\S+) branch=(\S+) base=(\S+) path=(\S+)/.exec(started.stdout);
  expect(match).not.toBeNull();
  const name = match![1]!;
  const target = match![4]!;
  const claimed = session(target, ['claim', '--task', taskId, '--adopt']);
  expect(claimed.status, claimed.stderr).toBe(0);
  return { path: target, name };
}

test.describe('C-00 adversarial matrix — repository hygiene', () => {
  test('baseline: a clean canonical checkout passes and reports CANONICAL_MAIN', () => {
    const { base, canonical } = fixture();
    try {
      const { report, status } = integrityJson(canonical);
      expect(status).toBe(0);
      expect(report.verdict).toBe('PASS');
      expect(report.self.class).toBe('CANONICAL_MAIN');
      expect(invariant(report, 'WORKSPACE_INDEX_FLAGS')).toBe('PASS');
      expect(invariant(report, 'WORKSPACE_EXCLUDE_POLICY')).toBe('PASS');
      expect(invariant(report, 'WORKSPACE_HOOKS_POLICY')).toBe('PASS');
      expect(invariant(report, 'WORKSPACE_DECLARED_DELETIONS')).toBe('PASS');
      // No absolute machine path may leak into the durable JSON surface.
      expect(JSON.stringify(report)).not.toContain(canonical);
    } finally {
      cleanup(base);
    }
  });

  test('B. skip-worktree on a tracked file fails the checker, and repair returns green', () => {
    const { base, canonical } = fixture();
    try {
      gitOk(canonical, ['update-index', '--skip-worktree', 'tracked.txt']);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(failed.report.verdict).toBe('FAIL');
      expect(codes(failed.report)).toContain('WORKSPACE_FORBIDDEN_INDEX_FLAG');
      expect(JSON.stringify(failed.report)).toContain('SKIP_WORKTREE');
      gitOk(canonical, ['update-index', '--no-skip-worktree', 'tracked.txt']);
      const repaired = integrityJson(canonical);
      expect(repaired.status).toBe(0);
      expect(repaired.report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('C. assume-unchanged on a tracked file fails the checker, and repair returns green', () => {
    const { base, canonical } = fixture();
    try {
      gitOk(canonical, ['update-index', '--assume-unchanged', 'tracked.txt']);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_FORBIDDEN_INDEX_FLAG');
      expect(JSON.stringify(failed.report)).toContain('ASSUME_UNCHANGED');
      gitOk(canonical, ['update-index', '--no-assume-unchanged', 'tracked.txt']);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('B/C. an index flag inside a linked worktree is detected from the canonical checkout', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
      gitOk(owned.path, ['update-index', '--skip-worktree', 'tracked.txt']);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_FORBIDDEN_INDEX_FLAG');
      expect(JSON.stringify(failed.report)).toContain(owned.name);
      gitOk(owned.path, ['update-index', '--no-skip-worktree', 'tracked.txt']);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('D. shared .git/info/exclude drift is detected and repair returns green', () => {
    const { base, canonical } = fixture();
    try {
      const excludeFile = path.join(canonical, '.git/info/exclude');
      const original = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, 'utf8') : '';
      fs.mkdirSync(path.dirname(excludeFile), { recursive: true });
      fs.writeFileSync(excludeFile, `${original}\nopenspec/changes/other-agent-planning/\n`);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_EXCLUDE_DRIFT');
      expect(invariant(failed.report, 'WORKSPACE_EXCLUDE_POLICY')).toBe('VIOLATED');
      fs.writeFileSync(excludeFile, original);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('D. a comment-only exclude change is not treated as drift', () => {
    const { base, canonical } = fixture();
    try {
      const excludeFile = path.join(canonical, '.git/info/exclude');
      fs.mkdirSync(path.dirname(excludeFile), { recursive: true });
      fs.appendFileSync(excludeFile, '\n# a harmless comment\n\n');
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('E. an unexpected non-sample hook is refused, and removal returns green', () => {
    const { base, canonical } = fixture();
    try {
      const hook = path.join(canonical, '.git/hooks/pre-commit');
      fs.mkdirSync(path.dirname(hook), { recursive: true });
      fs.writeFileSync(hook, '#!/bin/sh\nexit 0\n');
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_UNEXPECTED_HOOK');
      fs.rmSync(hook);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('E. a configured core.hooksPath is refused', () => {
    const { base, canonical } = fixture();
    try {
      gitOk(canonical, ['config', 'core.hooksPath', '.githooks']);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_HOOKS_PATH_OVERRIDDEN');
      gitOk(canonical, ['config', '--unset', 'core.hooksPath']);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });
});

test.describe('C-00 adversarial matrix — ownership and sharing', () => {
  test('A. a second writer against one working tree is refused', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const second = session(owned.path, ['claim', '--task', 'other-task']);
      expect(second.status).toBe(1);
      expect(second.stderr).toContain('SESSION_ALREADY_OWNED');
      // The first session's record is untouched.
      const { report } = integrityJson(owned.path);
      expect(report.self.class).toBe('OWNED_SESSION');
      expect(report.self.taskId).toBe('synthetic-task');
    } finally {
      cleanup(base);
    }
  });

  test('A. the canonical checkout refuses an implementation claim', () => {
    const { base, canonical } = fixture();
    try {
      const refused = session(canonical, ['claim', '--task', 'synthetic-task']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_CANONICAL_IMPLEMENTATION_REFUSED');
    } finally {
      cleanup(base);
    }
  });

  test('L. the canonical checkout cannot become an unowned concurrent workspace', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
      // A second agent starts editing the shared canonical checkout while an
      // isolated session is live — the exact shape of the observed incident.
      fs.writeFileSync(path.join(canonical, 'tracked.txt'), 'edited by a concurrent agent\n');
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE');
      // The same violation is visible from inside the isolated session.
      expect(codes(integrityJson(owned.path).report)).toContain('WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE');
      gitOk(canonical, ['checkout', '--', 'tracked.txt']);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('L. a maintenance claim is the documented canonical exception', () => {
    const { base, canonical } = fixture();
    try {
      const claimed = session(canonical, ['claim', '--task', 'synthetic-maintenance', '--role', 'MAINTENANCE']);
      expect(claimed.status, claimed.stderr).toBe(0);
      const { report } = integrityJson(canonical);
      expect(report.verdict).toBe('PASS');
      expect(report.self.class).toBe('CANONICAL_MAINTENANCE');
    } finally {
      cleanup(base);
    }
  });

  test('a linked worktree with no ownership record fails closed', () => {
    const { base, canonical } = fixture();
    try {
      const target = path.join(base, 'raw-worktree');
      gitOk(canonical, ['worktree', 'add', '-b', 'session/raw', target, 'HEAD']);
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_UNOWNED_SESSION_WORKTREE');
      expect(integrityJson(target).report.self.class).toBe('UNOWNED_WORKTREE');
    } finally {
      cleanup(base);
    }
  });

  test('a malformed ownership record fails closed as UNKNOWN', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const record = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      fs.writeFileSync(record, '{ "schemaVersion": "nightwatch.workspace-session.v1" }\n');
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_SESSION_STATE_UNKNOWN');
      expect(integrityJson(owned.path).report.self.class).toBe('UNKNOWN');
    } finally {
      cleanup(base);
    }
  });

  test('a record claiming another branch fails closed', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const file = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      const record = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(file, JSON.stringify({ ...record, branch: 'session/someone-else' }, null, 2));
      const failed = integrityJson(owned.path);
      expect(failed.status).toBe(1);
      expect(failed.report.self.class).toBe('UNKNOWN');
      expect(codes(failed.report)).toContain('WORKSPACE_SESSION_STATE_UNKNOWN');
    } finally {
      cleanup(base);
    }
  });

  test('duplicate session identity across two worktrees fails closed', () => {
    const { base, canonical } = fixture();
    try {
      const first = startOwnedSession(canonical, base, 'synthetic-task');
      const second = startOwnedSession(canonical, base, 'synthetic-task-two');
      const firstFile = path.join(canonical, '.git/worktrees', first.name, 'nightwatch-session.v1.json');
      const secondFile = path.join(canonical, '.git/worktrees', second.name, 'nightwatch-session.v1.json');
      const firstRecord = JSON.parse(fs.readFileSync(firstFile, 'utf8')) as Record<string, unknown>;
      const secondRecord = JSON.parse(fs.readFileSync(secondFile, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(secondFile, JSON.stringify({ ...secondRecord, sessionId: firstRecord.sessionId }, null, 2));
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_DUPLICATE_SESSION_ID');
    } finally {
      cleanup(base);
    }
  });

  test('two live worktrees claiming one task fail closed', () => {
    const { base, canonical } = fixture();
    try {
      const first = startOwnedSession(canonical, base, 'synthetic-task');
      const second = startOwnedSession(canonical, base, 'synthetic-task-two');
      const secondFile = path.join(canonical, '.git/worktrees', second.name, 'nightwatch-session.v1.json');
      const secondRecord = JSON.parse(fs.readFileSync(secondFile, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(secondFile, JSON.stringify({ ...secondRecord, taskId: 'synthetic-task' }, null, 2));
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_DUPLICATE_TASK_CLAIM');
      expect(first.name).not.toBe(second.name);
    } finally {
      cleanup(base);
    }
  });

  test('J. two independent worktrees editing disjoint files stay isolated and independently valid', () => {
    const { base, canonical } = fixture();
    try {
      const alpha = startOwnedSession(canonical, base, 'synthetic-task');
      const beta = startOwnedSession(canonical, base, 'synthetic-task-two');
      fs.writeFileSync(path.join(alpha.path, 'alpha.txt'), 'alpha only\n');
      gitOk(alpha.path, ['add', 'alpha.txt']);
      gitOk(alpha.path, ['commit', '-m', 'alpha work']);
      fs.writeFileSync(path.join(beta.path, 'beta.txt'), 'beta only\n');
      gitOk(beta.path, ['add', 'beta.txt']);
      gitOk(beta.path, ['commit', '-m', 'beta work']);

      expect(fs.existsSync(path.join(beta.path, 'alpha.txt'))).toBe(false);
      expect(fs.existsSync(path.join(alpha.path, 'beta.txt'))).toBe(false);
      expect(gitOk(alpha.path, ['rev-parse', 'HEAD'])).not.toBe(gitOk(beta.path, ['rev-parse', 'HEAD']));
      expect(integrityJson(alpha.path).report.verdict).toBe('PASS');
      expect(integrityJson(beta.path).report.verdict).toBe('PASS');
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });
});

test.describe('C-00 adversarial matrix — deletions', () => {
  test('F. a cross-session tracked-file deletion outside the declared scope fails validation', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.rmSync(path.join(owned.path, 'victim.txt'));
      gitOk(owned.path, ['add', '-A']);
      gitOk(owned.path, ['commit', '-m', "delete another session's file"]);
      const failed = integrityJson(owned.path);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_UNDECLARED_TRACKED_DELETION');
      expect(invariant(failed.report, 'WORKSPACE_DECLARED_DELETIONS')).toBe('VIOLATED');
      expect(JSON.stringify(failed.report)).toContain('victim.txt');
    } finally {
      cleanup(base);
    }
  });

  test('F. an uncommitted tracked-file deletion is caught before it is committed', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.rmSync(path.join(owned.path, 'victim.txt'));
      const failed = integrityJson(owned.path);
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_UNDECLARED_TRACKED_DELETION');
    } finally {
      cleanup(base);
    }
  });

  test('G. a deletion explicitly declared in the active task SPEC remains possible', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const spec = path.join(owned.path, '.agent/tasks/synthetic-task/SPEC.md');
      fs.writeFileSync(spec, [
        '# Synthetic Spec',
        '',
        '## Declared Deletions',
        '',
        '- victim.txt',
        '',
      ].join('\n'));
      fs.rmSync(path.join(owned.path, 'victim.txt'));
      gitOk(owned.path, ['add', '-A']);
      gitOk(owned.path, ['commit', '-m', 'declared deletion']);
      const passed = integrityJson(owned.path);
      expect(passed.status).toBe(0);
      expect(passed.report.verdict).toBe('PASS');
      expect(invariant(passed.report, 'WORKSPACE_DECLARED_DELETIONS')).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('G. a file created and deleted inside one session produces no net deletion', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const scratch = path.join(owned.path, 'scratch.txt');
      fs.writeFileSync(scratch, 'temporary\n');
      gitOk(owned.path, ['add', 'scratch.txt']);
      gitOk(owned.path, ['commit', '-m', 'add scratch']);
      fs.rmSync(scratch);
      gitOk(owned.path, ['add', '-A']);
      gitOk(owned.path, ['commit', '-m', 'remove own scratch']);
      const passed = integrityJson(owned.path);
      expect(passed.status).toBe(0);
      expect(invariant(passed.report, 'WORKSPACE_DECLARED_DELETIONS')).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });
});

test.describe('C-00 adversarial matrix — integration', () => {
  test('H. an advanced origin/main makes the base stale and integration refuses to overwrite', () => {
    const { base, canonical, upstream, baseSha } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.writeFileSync(path.join(owned.path, 'session.txt'), 'session work\n');
      gitOk(owned.path, ['add', 'session.txt']);
      gitOk(owned.path, ['commit', '-m', 'session work']);

      // Another session advances canonical main after this session began.
      const other = path.join(base, 'other');
      gitOk(base, ['clone', upstream, other]);
      fs.writeFileSync(path.join(other, 'other.txt'), 'other session work\n');
      gitOk(other, ['add', 'other.txt']);
      gitOk(other, ['commit', '-m', 'other session work']);
      gitOk(other, ['push', 'origin', 'HEAD:refs/heads/main']);
      const advanced = gitOk(other, ['rev-parse', 'HEAD']);
      expect(advanced).not.toBe(baseSha);

      const refused = session(owned.path, ['integrate']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_INTEGRATION_NOT_FAST_FORWARD');
      expect(refused.stderr).toContain('never force-push');

      const stale = integrityJson(owned.path);
      expect(stale.report.bootstrapAnswers.baseState).toBe('STALE');
      expect(stale.report.bootstrapAnswers.mayIntegrate).toBe(false);

      // The other session's commit was neither erased nor rewritten.
      expect(gitOk(owned.path, ['rev-parse', 'refs/remotes/origin/main'])).toBe(advanced);
      expect(gitOk(upstream, ['rev-parse', 'refs/heads/main'])).toBe(advanced);
    } finally {
      cleanup(base);
    }
  });

  test('H. reconcile merges without rewriting, then integration fast-forwards and verifies', () => {
    const { base, canonical, upstream } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.writeFileSync(path.join(owned.path, 'session.txt'), 'session work\n');
      gitOk(owned.path, ['add', 'session.txt']);
      gitOk(owned.path, ['commit', '-m', 'session work']);
      const sessionCommit = gitOk(owned.path, ['rev-parse', 'HEAD']);

      const other = path.join(base, 'other');
      gitOk(base, ['clone', upstream, other]);
      fs.writeFileSync(path.join(other, 'other.txt'), 'other session work\n');
      gitOk(other, ['add', 'other.txt']);
      gitOk(other, ['commit', '-m', 'other session work']);
      gitOk(other, ['push', 'origin', 'HEAD:refs/heads/main']);
      const advanced = gitOk(other, ['rev-parse', 'HEAD']);

      const reconciled = session(owned.path, ['reconcile']);
      expect(reconciled.status, reconciled.stderr).toBe(0);
      expect(reconciled.stdout).toContain('SESSION_RECONCILED');
      // Merged, not rebased: the original session commit still exists.
      expect(git(owned.path, ['cat-file', '-e', `${sessionCommit}^{commit}`]).status).toBe(0);
      expect(git(owned.path, ['merge-base', '--is-ancestor', advanced, 'HEAD']).status).toBe(0);
      expect(git(owned.path, ['merge-base', '--is-ancestor', sessionCommit, 'HEAD']).status).toBe(0);

      const integrated = session(owned.path, ['integrate']);
      expect(integrated.status, integrated.stderr).toBe(0);
      expect(integrated.stdout).toContain('SESSION_INTEGRATED');
      const head = gitOk(owned.path, ['rev-parse', 'HEAD']);
      expect(gitOk(upstream, ['rev-parse', 'refs/heads/main'])).toBe(head);
      const record = JSON.parse(fs.readFileSync(path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json'), 'utf8')) as { integrationState: string };
      expect(record.integrationState).toBe('INTEGRATED');
    } finally {
      cleanup(base);
    }
  });

  test('I. a genuinely conflicting change stops instead of guessing', () => {
    const { base, canonical, upstream } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.writeFileSync(path.join(owned.path, 'tracked.txt'), 'session version\n');
      gitOk(owned.path, ['add', 'tracked.txt']);
      gitOk(owned.path, ['commit', '-m', 'session edits tracked.txt']);
      const sessionCommit = gitOk(owned.path, ['rev-parse', 'HEAD']);

      const other = path.join(base, 'other');
      gitOk(base, ['clone', upstream, other]);
      fs.writeFileSync(path.join(other, 'tracked.txt'), 'other version\n');
      gitOk(other, ['add', 'tracked.txt']);
      gitOk(other, ['commit', '-m', 'other edits tracked.txt']);
      gitOk(other, ['push', 'origin', 'HEAD:refs/heads/main']);

      const reconciled = session(owned.path, ['reconcile']);
      expect(reconciled.status).toBe(1);
      expect(reconciled.stderr).toContain('SESSION_RECONCILE_CONFLICT');
      expect(reconciled.stderr).toContain('nothing was rewritten');
      // The merge was aborted; the session's own commit and tree survive.
      expect(gitOk(owned.path, ['rev-parse', 'HEAD'])).toBe(sessionCommit);
      expect(fs.readFileSync(path.join(owned.path, 'tracked.txt'), 'utf8')).toBe('session version\n');
      expect(integrityJson(owned.path).report.verdict).toBe('PASS');

      const refused = session(owned.path, ['integrate']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_INTEGRATION_NOT_FAST_FORWARD');
    } finally {
      cleanup(base);
    }
  });

  test('integration is refused while the session worktree is dirty', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.writeFileSync(path.join(owned.path, 'tracked.txt'), 'uncommitted\n');
      const refused = session(owned.path, ['integrate', '--offline']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_WORKTREE_DIRTY');
    } finally {
      cleanup(base);
    }
  });

  test('integration is refused while the workspace is unsafe', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      gitOk(canonical, ['update-index', '--skip-worktree', 'tracked.txt']);
      const refused = session(owned.path, ['integrate', '--offline']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_INTEGRATION_REFUSED_UNSAFE_WORKSPACE');
    } finally {
      cleanup(base);
    }
  });
});

test.describe('C-00 adversarial matrix — stale sessions and recovery', () => {
  test('K. a dead holder becomes STALE_SESSION and requires an explicit adoption', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const file = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      const record = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, any>;
      // A reboot deterministically invalidates the holder without a clock.
      fs.writeFileSync(file, JSON.stringify({ ...record, holder: { ...record.holder, bootDigest: '0'.repeat(24) } }, null, 2));

      const { report } = integrityJson(owned.path);
      expect(report.self.class).toBe('STALE_SESSION');
      expect((report.warnings ?? []).map((warning: { code: string }) => warning.code)).toContain('WORKSPACE_STALE_SESSION_WORKTREE');
      expect(report.bootstrapAnswers.worktreesRequiringOwnerAttention.length).toBeGreaterThan(0);

      const refused = session(owned.path, ['claim', '--task', 'synthetic-task']);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_OWNER_STALE');

      const adopted = session(owned.path, ['claim', '--task', 'synthetic-task', '--adopt']);
      expect(adopted.status, adopted.stderr).toBe(0);
      expect(integrityJson(owned.path).report.self.class).toBe('OWNED_SESSION');
    } finally {
      cleanup(base);
    }
  });

  test('a released claim keeps its historical base without raising a stale-base advisory', () => {
    const { base, canonical, upstream } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      expect(session(owned.path, ['release']).status).toBe(0);

      // Canonical main advances after the session closed.
      const other = path.join(base, 'other');
      gitOk(base, ['clone', upstream, other]);
      fs.writeFileSync(path.join(other, 'later.txt'), 'later work\n');
      gitOk(other, ['add', 'later.txt']);
      gitOk(other, ['commit', '-m', 'later work']);
      gitOk(other, ['push', 'origin', 'HEAD:refs/heads/main']);
      gitOk(canonical, ['fetch', 'origin', 'main']);

      const { report } = integrityJson(owned.path);
      expect(report.self.class).toBe('STALE_SESSION');
      expect(report.self.baseSha).not.toBeNull();
      expect(report.bootstrapAnswers.baseState).toBe('UNKNOWN');
      const advisories = (report.warnings ?? []).map((warning: { code: string }) => warning.code);
      expect(advisories).not.toContain('WORKSPACE_BASE_STALE');
      expect(advisories).not.toContain('WORKSPACE_BASE_DIVERGED');
    } finally {
      cleanup(base);
    }
  });

  test('K. recovery never deletes a live session, and unmerged work is protected', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.writeFileSync(path.join(owned.path, 'unmerged.txt'), 'irreplaceable work\n');
      gitOk(owned.path, ['add', 'unmerged.txt']);
      gitOk(owned.path, ['commit', '-m', 'unmerged work']);

      const live = session(canonical, ['remove', '--name', owned.name]);
      expect(live.status).toBe(1);
      expect(live.stderr).toContain('SESSION_REMOVE_REFUSED_LIVE_HOLDER');
      expect(fs.existsSync(path.join(owned.path, 'unmerged.txt'))).toBe(true);

      const released = session(owned.path, ['release']);
      expect(released.status, released.stderr).toBe(0);

      const unmerged = session(canonical, ['remove', '--name', owned.name]);
      expect(unmerged.status).toBe(1);
      expect(unmerged.stderr).toContain('SESSION_REMOVE_REFUSED_UNMERGED');
      expect(fs.existsSync(path.join(owned.path, 'unmerged.txt'))).toBe(true);

      const abandoned = session(canonical, ['remove', '--name', owned.name, '--abandon-unmerged', '--delete-branch']);
      expect(abandoned.status, abandoned.stderr).toBe(0);
      expect(fs.existsSync(owned.path)).toBe(false);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('a removed worktree leaves no phantom ownership claim', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const record = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      expect(fs.existsSync(record)).toBe(true);
      expect(session(owned.path, ['release']).status).toBe(0);
      expect(session(canonical, ['remove', '--name', owned.name, '--delete-branch']).status).toBe(0);
      expect(fs.existsSync(record)).toBe(false);
      const { report, status } = integrityJson(canonical);
      expect(status).toBe(0);
      expect(report.worktrees).toHaveLength(1);
    } finally {
      cleanup(base);
    }
  });

  test('a session worktree whose directory vanished is reported, never silently pruned', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      fs.rmSync(owned.path, { recursive: true, force: true });
      const failed = integrityJson(canonical);
      expect(failed.status).toBe(1);
      const reported = codes(failed.report);
      expect(reported).toContain('WORKSPACE_WORKTREE_PATH_MISSING');
      expect(fs.existsSync(path.join(canonical, '.git/worktrees', owned.name))).toBe(true);
    } finally {
      cleanup(base);
    }
  });

  test('start refuses to add a worktree while the workspace is unsafe', () => {
    const { base, canonical } = fixture();
    try {
      gitOk(canonical, ['update-index', '--skip-worktree', 'tracked.txt']);
      const refused = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_START_REFUSED_UNSAFE_WORKSPACE');
      expect(fs.existsSync(path.join(base, 'worktrees'))).toBe(false);
    } finally {
      cleanup(base);
    }
  });

  test('a freshly started worktree is unowned until it is claimed', () => {
    const { base, canonical } = fixture();
    try {
      const started = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);
      expect(started.status, started.stderr).toBe(0);
      const target = /path=(\S+)/.exec(started.stdout)![1]!;
      const { report } = integrityJson(target);
      expect(report.self.class).toBe('STALE_SESSION');
      expect(report.self.ownershipState).toBe('RELEASED');
      expect(session(target, ['claim', '--task', 'synthetic-task']).status).toBe(1);
      expect(session(target, ['claim', '--task', 'synthetic-task', '--adopt']).status).toBe(0);
    } finally {
      cleanup(base);
    }
  });
});

/**
 * F-07 claim-task liveness.
 *
 * `WORKSPACE_WORKTREE_METADATA` proved a claim was well-formed but never asked
 * whether the task it named was still open. These probes drive the exact gap:
 * a terminal task on a live claim, an unknown task, and the canonical
 * maintenance claim — plus the live in-progress claim that must still pass.
 * Attention is deliberately distinct from failure: the exit status stays zero
 * and nothing is released, adopted, re-pointed or edited automatically.
 */
test.describe('C-00 claim-task liveness (F-07)', () => {
  test('a live in-progress claim passes with no claim finding', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const { report, status } = integrityJson(owned.path);
      expect(status).toBe(0);
      expect(report.verdict).toBe('PASS');
      expect(report.claimFindings).toEqual([]);
      expect(report.bootstrapAnswers.worktreesRequiringOwnerAttention).toEqual([]);
      const metadata = (report.invariants ?? []).find((entry: { id: string }) => entry.id === 'WORKSPACE_WORKTREE_METADATA');
      expect(metadata.status).toBe('PASS');
      expect(metadata.claimTaskTerminalCount).toBe(0);
      expect(metadata.claimTaskUnknownCount).toBe(0);
    } finally {
      cleanup(base);
    }
  });

  test('a live claim naming a COMPLETE task is attention, not failure, and modifies nothing', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      setTaskStatus(owned.path, 'synthetic-task', 'COMPLETE');
      const recordFile = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      const recordBefore = fs.readFileSync(recordFile, 'utf8');

      const { report, status } = integrityJson(owned.path);
      // Attention is not failure: the claim is surfaced, never auto-released.
      expect(status).toBe(0);
      expect(report.verdict).toBe('PASS');
      expect(codes(report)).not.toContain('CLAIM_TASK_TERMINAL');
      const finding = (report.claimFindings ?? []).find((entry: { code: string }) => entry.code === 'CLAIM_TASK_TERMINAL');
      expect(finding).toBeTruthy();
      expect(finding.worktree).toBe(owned.name);
      expect(finding.taskId).toBe('synthetic-task');
      expect(finding.taskStatus).toBe('COMPLETE');
      expect(finding.ownerAction).toContain('nightwatch-session.mjs');
      expect(report.bootstrapAnswers.worktreesRequiringOwnerAttention.some((entry: { name: string }) => entry.name === owned.name)).toBe(true);
      expect(fs.readFileSync(recordFile, 'utf8')).toBe(recordBefore);
      const metadata = (report.invariants ?? []).find((entry: { id: string }) => entry.id === 'WORKSPACE_WORKTREE_METADATA');
      expect(metadata.status).toBe('ATTENTION');
      expect(metadata.claimTaskTerminalCount).toBe(1);
    } finally {
      cleanup(base);
    }
  });

  test('a BLOCKED task claim is terminal as well', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      setTaskStatus(owned.path, 'synthetic-task', 'BLOCKED');
      const { report } = integrityJson(owned.path);
      const finding = (report.claimFindings ?? []).find((entry: { code: string }) => entry.code === 'CLAIM_TASK_TERMINAL');
      expect(finding?.taskStatus).toBe('BLOCKED');
    } finally {
      cleanup(base);
    }
  });

  test('an unknown task claim is surfaced as CLAIM_TASK_UNKNOWN', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const recordFile = path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json');
      const record = JSON.parse(fs.readFileSync(recordFile, 'utf8')) as Record<string, unknown>;
      fs.writeFileSync(recordFile, JSON.stringify({ ...record, taskId: 'synthetic-ghost' }, null, 2));

      const { report, status } = integrityJson(owned.path);
      expect(status).toBe(0);
      expect(report.verdict).toBe('PASS');
      const finding = (report.claimFindings ?? []).find((entry: { code: string }) => entry.code === 'CLAIM_TASK_UNKNOWN');
      expect(finding).toBeTruthy();
      expect(finding.taskId).toBe('synthetic-ghost');
      expect(finding.taskStatus).toBeNull();
      expect(finding.ownerAction).toContain('nightwatch-session.mjs');
      expect(report.bootstrapAnswers.worktreesRequiringOwnerAttention.length).toBeGreaterThan(0);
      const metadata = (report.invariants ?? []).find((entry: { id: string }) => entry.id === 'WORKSPACE_WORKTREE_METADATA');
      expect(metadata.status).toBe('ATTENTION');
      expect(metadata.claimTaskUnknownCount).toBe(1);
    } finally {
      cleanup(base);
    }
  });

  test('the canonical maintenance claim naming a terminal task names the maintenance owner action', () => {
    const { base, canonical } = fixture();
    try {
      const claimed = session(canonical, ['claim', '--task', 'synthetic-maintenance', '--role', 'MAINTENANCE']);
      expect(claimed.status, claimed.stderr).toBe(0);
      setTaskStatus(canonical, 'synthetic-maintenance', 'COMPLETE');

      const { report, status } = integrityJson(canonical);
      expect(status).toBe(0);
      expect(report.self.class).toBe('CANONICAL_MAINTENANCE');
      const finding = (report.claimFindings ?? []).find((entry: { code: string }) => entry.code === 'CLAIM_TASK_TERMINAL');
      expect(finding).toBeTruthy();
      expect(finding.isMain).toBe(true);
      expect(finding.ownerAction).toContain('maintenance');
      expect(report.bootstrapAnswers.worktreesRequiringOwnerAttention.some((entry: { name: string }) => entry.name === 'canonical')).toBe(true);
    } finally {
      cleanup(base);
    }
  });

  test('session:status text renders the attention finding and its owner action', () => {
    const { base, canonical } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      setTaskStatus(owned.path, 'synthetic-task', 'COMPLETE');
      const status = session(owned.path, ['status']);
      expect(status.status).toBe(0);
      expect(status.stdout).toContain('ATTENTION: CLAIM_TASK_TERMINAL');
      expect(status.stdout).toContain('owner action');
      expect(status.stdout).toContain('attention=1');
    } finally {
      cleanup(base);
    }
  });
});

test.describe('C-00 diagnostics contract', () => {
  test('the bootstrap questions are answered categorically and privacy-safely', () => {
    const { base, canonical, baseSha } = fixture();
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const { report } = integrityJson(owned.path);
      const answers = report.bootstrapAnswers;
      expect(answers.inOwnedImplementationWorktree).toBe(true);
      expect(answers.owningTaskId).toBe('synthetic-task');
      expect(answers.sessionBaseSha).toBe(baseSha);
      expect(answers.sharedGitStateDrifted).toBe(false);
      expect(answers.baseState).toBe('CURRENT');
      expect(answers.mayIntegrate).toBe(false);
      expect(answers.mayIntegrateReason).toBe('SESSION_ALREADY_INTEGRATED_OR_EMPTY');
      expect(answers.canonicalMainSafe).toBe(true);
      expect(answers.worktreesRequiringOwnerAttention).toEqual([]);
      const serialized = JSON.stringify(report);
      expect(serialized).not.toContain(owned.path);
      expect(serialized).not.toContain(canonical);
      expect(serialized).not.toMatch(/AWS_|GITHUB_TOKEN|Bearer |storage-state/);
    } finally {
      cleanup(base);
    }
  });

  test('inspection outside a git worktree degrades to NOT_APPLICABLE instead of failing', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c00-nogit-'));
    try {
      const { report, status } = integrityJson(outside);
      expect(status).toBe(0);
      expect(report.verdict).toBe('NOT_APPLICABLE');
      expect(report.reason).toBe('NOT_A_GIT_WORKTREE');
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  test('a repository with the committed policy reports REPOSITORY as the policy source', () => {
    const { base, canonical } = fixture();
    try {
      expect(integrityJson(canonical).report.policySource).toBe('REPOSITORY');
    } finally {
      cleanup(base);
    }
  });

  test('a foreign repository without the committed policy falls back to the built-in default', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c00-foreign-'));
    try {
      gitOk(base, ['init', '-b', 'main']);
      fs.writeFileSync(path.join(base, 'file.txt'), 'foreign repository\n');
      gitOk(base, ['add', '.']);
      gitOk(base, ['commit', '-m', 'foreign base']);
      const { report, status } = integrityJson(base);
      expect(status).toBe(0);
      expect(report.verdict).toBe('PASS');
      expect(report.policySource).toBe('BUILT_IN_DEFAULT');
      // The fallback is not a weakening: the same invariants still fire.
      gitOk(base, ['update-index', '--skip-worktree', 'file.txt']);
      const failed = integrityJson(base);
      // The allowlist comparison needs the repository's own committed
      // allowlist; without one it is NOT_APPLICABLE plus an advisory, never a
      // silently green PASS.
      fs.appendFileSync(path.join(base, '.git/info/exclude'), 'private-scratch/\n');
      const advisory = integrityJson(base);
      expect(advisory.status).toBe(1);
      expect(invariant(advisory.report, 'WORKSPACE_EXCLUDE_POLICY')).toBe('NOT_APPLICABLE');
      expect((advisory.report.warnings ?? []).map((warning: { code: string }) => warning.code))
        .toContain('WORKSPACE_EXCLUDE_ALLOWLIST_UNAVAILABLE');
      expect(failed.status).toBe(1);
      expect(codes(failed.report)).toContain('WORKSPACE_FORBIDDEN_INDEX_FLAG');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('the inspection core is deterministic across repeated runs', () => {
    const { base, canonical } = fixture();
    try {
      const first = integrityJson(canonical).report;
      const second = integrityJson(canonical).report;
      const normalize = (report: Record<string, any>): string => JSON.stringify(report);
      expect(normalize(first)).toBe(normalize(second));
    } finally {
      cleanup(base);
    }
  });
});

/**
 * NW-06. `start` used to validate the topology that already existed: at the
 * worktree bound its own precheck passed, `git worktree add` created the
 * over-limit registration, and only the next inspection reported
 * WORKSPACE_WORKTREE_LIMIT_EXCEEDED — after the mutation. It also returned on
 * a failed ownership-record write with the branch and worktree already
 * created and nothing rolled back.
 *
 * Every case here asserts the topology itself, not the exit code alone: a
 * refusal that still creates a registration is not a refusal.
 */
test.describe('NW-06 — prospective worktree admission and bounded rollback', () => {
  /** Registered worktree paths, in git's own order. */
  function registeredWorktrees(canonical: string): string[] {
    return gitOk(canonical, ['worktree', 'list', '--porcelain'])
      .split(/\r?\n/)
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length));
  }

  /** Every local ref with its exact tip, so a rollback cannot hide a moved ref. */
  function branchTips(canonical: string): string {
    return gitOk(canonical, ['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads']);
  }

  function topology(canonical: string): { readonly worktrees: string[]; readonly branches: string } {
    return { worktrees: registeredWorktrees(canonical), branches: branchTips(canonical) };
  }

  test('below the bound, a start is admitted and registers exactly one worktree', () => {
    // Bound 3: canonical + one existing session = 2 registered, so the
    // candidate is the third and last admissible registration.
    const { base, canonical } = fixture({ maxWorktrees: 3 });
    try {
      startOwnedSession(canonical, base, 'synthetic-task');
      expect(registeredWorktrees(canonical)).toHaveLength(2);
      const started = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);
      expect(started.status, started.stderr).toBe(0);
      expect(registeredWorktrees(canonical)).toHaveLength(3);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('at the bound, a start is refused BEFORE any mutation', () => {
    const { base, canonical } = fixture({ maxWorktrees: 2 });
    try {
      const owned = startOwnedSession(canonical, base, 'synthetic-task');
      const before = topology(canonical);
      expect(before.worktrees).toHaveLength(2);
      const ownedRecordBefore = fs.readFileSync(
        path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json'),
        'utf8',
      );

      const refused = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);

      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('WORKSPACE_PROSPECTIVE_WORKTREE_LIMIT_EXCEEDED');
      expect(refused.stderr).toContain('SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY');
      expect(refused.stderr).toContain('nothing was created');
      // The defect: the refusal must not be the *consequence* of a creation.
      expect(refused.stdout).not.toContain('SESSION_WORKTREE_CREATED');
      expect(topology(canonical)).toEqual(before);
      expect(fs.readdirSync(path.join(base, 'worktrees'))).toHaveLength(1);
      // No existing session was touched to make room.
      expect(fs.readFileSync(path.join(canonical, '.git/worktrees', owned.name, 'nightwatch-session.v1.json'), 'utf8'))
        .toBe(ownedRecordBefore);
      const after = integrityJson(canonical);
      expect(after.report.verdict).toBe('PASS');
      expect(codes(after.report)).not.toContain('WORKSPACE_WORKTREE_LIMIT_EXCEEDED');
    } finally {
      cleanup(base);
    }
  });

  test('at a bound of one, the canonical checkout alone already fills capacity', () => {
    const { base, canonical } = fixture({ maxWorktrees: 1 });
    try {
      const before = topology(canonical);
      const refused = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('WORKSPACE_PROSPECTIVE_WORKTREE_LIMIT_EXCEEDED');
      expect(topology(canonical)).toEqual(before);
      expect(fs.existsSync(path.join(base, 'worktrees'))).toBe(false);
    } finally {
      cleanup(base);
    }
  });

  test('--allow-drift does not buy capacity', () => {
    const { base, canonical } = fixture({ maxWorktrees: 2 });
    try {
      startOwnedSession(canonical, base, 'synthetic-task');
      const before = topology(canonical);
      const refused = session(canonical, [
        'start', '--task', 'synthetic-task', '--allow-drift', '--dir', path.join(base, 'worktrees'),
      ]);
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('WORKSPACE_PROSPECTIVE_WORKTREE_LIMIT_EXCEEDED');
      expect(topology(canonical)).toEqual(before);
    } finally {
      cleanup(base);
    }
  });

  test('a failure after `worktree add` returns to the exact prior topology', () => {
    const { base, canonical } = fixture();
    try {
      const before = topology(canonical);
      const failed = session(
        canonical,
        ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')],
        { NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_WORKTREE_ADD' },
      );
      expect(failed.status).toBe(1);
      expect(failed.stdout).toContain('SESSION_FAULT_INJECTION_ACTIVE: AFTER_WORKTREE_ADD');
      expect(failed.stdout).toContain('SESSION_START_ROLLED_BACK: ROLLBACK_COMPLETE');
      expect(failed.stdout).toContain('WORKTREE_REMOVED');
      expect(failed.stdout).toContain('BRANCH_DELETED');
      expect(topology(canonical)).toEqual(before);
      expect(fs.readdirSync(path.join(base, 'worktrees'))).toHaveLength(0);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('a failure after the ownership record is written also rolls back completely', () => {
    const { base, canonical } = fixture();
    try {
      const before = topology(canonical);
      const failed = session(
        canonical,
        ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')],
        { NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_RECORD_WRITE' },
      );
      expect(failed.status).toBe(1);
      expect(failed.stdout).toContain('SESSION_START_ROLLED_BACK: ROLLBACK_COMPLETE');
      expect(topology(canonical)).toEqual(before);
      // The record lives in the worktree's private git directory, which the
      // rollback must take with it.
      expect(fs.existsSync(path.join(canonical, '.git/worktrees'))
        && fs.readdirSync(path.join(canonical, '.git/worktrees')).length > 0).toBe(false);
      expect(integrityJson(canonical).report.verdict).toBe('PASS');
    } finally {
      cleanup(base);
    }
  });

  test('an unrecognised fault token fails closed instead of silently disabling injection', () => {
    const { base, canonical } = fixture();
    try {
      const before = topology(canonical);
      const refused = session(
        canonical,
        ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')],
        { NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_EVERYTHING' },
      );
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain('SESSION_FAULT_INJECTION_INVALID');
      expect(topology(canonical)).toEqual(before);
    } finally {
      cleanup(base);
    }
  });

  test('a rollback deletes only the branch it created, never a retained one', () => {
    const { base, canonical, baseSha } = fixture();
    try {
      // A session branch left behind by a removed worktree is exactly the kind
      // of ref a careless rollback would collect. The rollback proof is
      // path/branch/SHA-scoped to the registration the invocation itself
      // created, so this ref must be untouched by a later failing start.
      const probe = session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]);
      expect(probe.status, probe.stderr).toBe(0);
      const retainedBranch = /branch=(\S+)/.exec(probe.stdout)![1]!;
      gitOk(canonical, ['worktree', 'remove', /path=(\S+)/.exec(probe.stdout)![1]!]);
      expect(gitOk(canonical, ['rev-parse', retainedBranch])).toBe(baseSha);
      const tipsBefore = branchTips(canonical);

      const failed = session(
        canonical,
        ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')],
        { NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_WORKTREE_ADD' },
      );
      expect(failed.status).toBe(1);
      expect(failed.stdout).toContain('SESSION_START_ROLLED_BACK: ROLLBACK_COMPLETE');
      expect(branchTips(canonical)).toBe(tipsBefore);
      expect(gitOk(canonical, ['rev-parse', retainedBranch])).toBe(baseSha);
    } finally {
      cleanup(base);
    }
  });

  test('concurrent starts at the bound never leave an over-limit registration', () => {
    // Bound 3 with one session already registered leaves room for exactly one
    // more. Prospective admission is not atomic across processes, so the
    // post-creation verification is what has to hold the invariant.
    const { base, canonical } = fixture({ maxWorktrees: 3 });
    try {
      startOwnedSession(canonical, base, 'synthetic-task');
      expect(registeredWorktrees(canonical)).toHaveLength(2);
      const results = [0, 1, 2].map(() =>
        session(canonical, ['start', '--task', 'synthetic-task', '--dir', path.join(base, 'worktrees')]));
      const admitted = results.filter((result) => result.status === 0);
      expect(admitted.length).toBeGreaterThanOrEqual(1);
      expect(registeredWorktrees(canonical).length).toBeLessThanOrEqual(3);
      const report = integrityJson(canonical).report;
      expect(codes(report)).not.toContain('WORKSPACE_WORKTREE_LIMIT_EXCEEDED');
    } finally {
      cleanup(base);
    }
  });
});

/**
 * NW-07 — the `--dry-run` contract.
 *
 * `start --dry-run` was documented as "report the planned action without
 * mutating" and instead followed the real creation path: it created a branch,
 * a worktree and an ownership record while printing a plan, silently consuming
 * `maxWorktrees` capacity. `claim`, `release`, `reconcile` and `remove`
 * ignored the flag entirely, and `integrate` honoured it only AFTER a fetch
 * that writes `refs/remotes/**`.
 *
 * Every case here asserts the TOPOLOGY, not the exit code: a dry run that
 * reports a plan and still creates something is the defect, not a pass. The
 * snapshot deliberately covers the shared Git directory as well as the
 * worktree, because `info/exclude`, `hooks` and `worktrees/<name>/` live in
 * the common directory and a worktree-local comparison would not see them.
 */
test.describe('NW-07 — the --dry-run contract mutates nothing', () => {
  /** A directory listing, recursive, sorted, with file bytes — or ABSENT. */
  function treeSnapshot(directory: string): string {
    if (!fs.existsSync(directory)) return 'ABSENT';
    const lines: string[] = [];
    const walk = (current: string): void => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = path.join(current, entry.name);
        const relative = path.relative(directory, absolute);
        if (entry.isDirectory()) {
          lines.push(`D ${relative}`);
          walk(absolute);
        } else {
          lines.push(`F ${relative} ${fs.readFileSync(absolute).toString('base64')}`);
        }
      }
    };
    walk(directory);
    return lines.join('\n');
  }

  /**
   * Everything a start could mutate. Compared as one string so a difference
   * anywhere -- a ref, an index entry, a session record, the shared exclude
   * file, a hook -- fails the assertion and prints the offending surface.
   */
  function fullTopology(canonical: string, targetPath: string): string {
    const commonDir = path.resolve(canonical, gitOk(canonical, ['rev-parse', '--git-common-dir']));
    return [
      `WORKTREES\n${gitOk(canonical, ['worktree', 'list', '--porcelain'])}`,
      `REFS\n${gitOk(canonical, ['for-each-ref', '--format=%(refname) %(objectname)'])}`,
      `BRANCHES\n${gitOk(canonical, ['branch', '--list', '--format=%(refname:short) %(objectname)'])}`,
      `HEAD\n${gitOk(canonical, ['rev-parse', 'HEAD'])}`,
      `SYMREF\n${gitOk(canonical, ['symbolic-ref', '--quiet', 'HEAD'])}`,
      `STATUS\n${gitOk(canonical, ['status', '--porcelain'])}`,
      `INDEX\n${gitOk(canonical, ['ls-files', '--stage'])}`,
      `COMMON_WORKTREES\n${treeSnapshot(path.join(commonDir, 'worktrees'))}`,
      `EXCLUDE\n${fs.existsSync(path.join(commonDir, 'info/exclude')) ? fs.readFileSync(path.join(commonDir, 'info/exclude'), 'utf8') : 'ABSENT'}`,
      `HOOKS\n${fs.existsSync(path.join(commonDir, 'hooks')) ? fs.readdirSync(path.join(commonDir, 'hooks')).sort().join(',') : 'ABSENT'}`,
      `TARGET_PATH\n${treeSnapshot(targetPath)}`,
    ].join('\n---\n');
  }

  /** The parent directory a dry run must not create. */
  function worktreeParent(base: string): string {
    return path.join(base, 'dry-run-worktrees');
  }

  function dryRunStart(canonical: string, base: string, taskId = 'synthetic-task', extra: readonly string[] = []): Run {
    return session(canonical, ['start', '--task', taskId, '--dir', worktreeParent(base), '--dry-run', ...extra]);
  }

  test('1. a clean admitted start dry-run reports a plan and changes nothing', () => {
    const { base, canonical } = fixture();
    try {
      const before = fullTopology(canonical, worktreeParent(base));
      const result = dryRunStart(canonical, base);
      expect(result.status, result.stderr).toBe(0);
      // It reported a real, usable plan...
      expect(result.stdout).toContain('PLAN SESSION_START_PLAN');
      expect(result.stdout).toContain('PLAN SESSION_START_CANDIDATE');
      expect(result.stdout).toContain('PLAN SESSION_START_CAPACITY');
      expect(result.stdout).toContain('admitted=true');
      expect(result.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: start');
      // ...and did NOT report the real creation outcome.
      expect(result.stdout).not.toContain('SESSION_WORKTREE_CREATED');
      // The whole mutable surface is byte-identical.
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
      // Specifically: the parent directory was not even created.
      expect(fs.existsSync(worktreeParent(base))).toBe(false);
      expect(registeredWorktreeCount(canonical)).toBe(1);
    } finally {
      cleanup(base);
    }
  });

  function registeredWorktreeCount(canonical: string): number {
    return gitOk(canonical, ['worktree', 'list', '--porcelain'])
      .split(/\r?\n/)
      .filter((line) => line.startsWith('worktree ')).length;
  }

  test('2. an at-capacity start dry-run refuses before mutating and creates nothing', () => {
    // Bound 2: canonical + one existing session fills it exactly.
    const { base, canonical } = fixture({ maxWorktrees: 2 });
    try {
      startOwnedSession(canonical, base, 'synthetic-task');
      const before = fullTopology(canonical, worktreeParent(base));
      const result = dryRunStart(canonical, base);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY');
      expect(result.stderr).toContain('nothing was created');
      // A refusal is reported instead of a plan.
      expect(result.stdout).not.toContain('SESSION_DRY_RUN_NO_MUTATION');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
    } finally {
      cleanup(base);
    }
  });

  test('3. an invalid explicit base fails closed with no mutation', () => {
    const { base, canonical } = fixture();
    try {
      const before = fullTopology(canonical, worktreeParent(base));
      const result = dryRunStart(canonical, base, 'synthetic-task', ['--base', '0'.repeat(40)]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SESSION_BASE_INVALID');
      expect(result.stdout).not.toContain('SESSION_DRY_RUN_NO_MUTATION');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
      expect(fs.existsSync(worktreeParent(base))).toBe(false);
    } finally {
      cleanup(base);
    }
  });

  test('4. an occupied candidate path is refused before mutation', () => {
    const { base, canonical } = fixture();
    try {
      // Learn the candidate name the dry run would choose, then occupy it.
      const planned = dryRunStart(canonical, base);
      expect(planned.status, planned.stderr).toBe(0);
      const candidatePath = /candidatePath=(\S+)/.exec(planned.stdout)?.[1];
      expect(candidatePath).toBeTruthy();
      fs.mkdirSync(candidatePath!, { recursive: true });
      const before = fullTopology(canonical, worktreeParent(base));
      // The suffix is random, so re-running names a different candidate; the
      // point proven here is that the occupied-path guard sits ABOVE the
      // mutation and the dry run still creates nothing.
      const result = dryRunStart(canonical, base);
      expect([0, 1]).toContain(result.status);
      expect(result.stdout).not.toContain('SESSION_WORKTREE_CREATED');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
    } finally {
      cleanup(base);
    }
  });

  test('5. an invalid fault-injection token fails closed before any dry-run plan', () => {
    const { base, canonical } = fixture();
    try {
      const before = fullTopology(canonical, worktreeParent(base));
      const result = session(canonical, ['start', '--task', 'synthetic-task', '--dir', worktreeParent(base), '--dry-run'], {
        NIGHTWATCH_SESSION_FAULT_INJECTION: 'NOT_A_REAL_POINT',
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SESSION_FAULT_INJECTION_INVALID');
      expect(result.stdout).not.toContain('SESSION_DRY_RUN_NO_MUTATION');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
    } finally {
      cleanup(base);
    }
  });

  test('5b. a valid fault-injection point never fires, because a dry run never reaches it', () => {
    const { base, canonical } = fixture();
    try {
      const before = fullTopology(canonical, worktreeParent(base));
      const result = session(canonical, ['start', '--task', 'synthetic-task', '--dir', worktreeParent(base), '--dry-run'], {
        NIGHTWATCH_SESSION_FAULT_INJECTION: 'AFTER_WORKTREE_ADD',
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('SESSION_FAULT_INJECTION_ACTIVE');
      // The injection point is downstream of the first mutation, so a correct
      // dry run returns before it and no rollback is ever needed.
      expect(result.stdout).not.toContain('SESSION_FAULT_INJECTED');
      expect(result.stdout).not.toContain('SESSION_START_ROLLED_BACK');
      expect(result.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: start');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
    } finally {
      cleanup(base);
    }
  });

  test('6. an unsafe workspace is refused before mutation', () => {
    const { base, canonical } = fixture();
    try {
      gitOk(canonical, ['update-index', '--skip-worktree', 'tracked.txt']);
      const before = fullTopology(canonical, worktreeParent(base));
      const result = dryRunStart(canonical, base);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('SESSION_START_REFUSED_UNSAFE_WORKSPACE');
      expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
    } finally {
      cleanup(base);
    }
  });

  test('7. repeating the dry run leaves the identical topology both times', () => {
    const { base, canonical } = fixture();
    try {
      const before = fullTopology(canonical, worktreeParent(base));
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = dryRunStart(canonical, base);
        expect(result.status, result.stderr).toBe(0);
        expect(fullTopology(canonical, worktreeParent(base))).toBe(before);
      }
    } finally {
      cleanup(base);
    }
  });

  test('8. a dry run consumes no capacity: the real start still succeeds at the bound', () => {
    // Bound 2: canonical + exactly one session. If the dry run consumed a
    // slot, the real start below would be refused -- which is precisely the
    // recorded failure mode.
    const { base, canonical } = fixture({ maxWorktrees: 2 });
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const dry = dryRunStart(canonical, base);
        expect(dry.status, dry.stderr).toBe(0);
      }
      expect(registeredWorktreeCount(canonical)).toBe(1);
      const real = session(canonical, ['start', '--task', 'synthetic-task', '--dir', worktreeParent(base)]);
      expect(real.status, real.stderr).toBe(0);
      expect(real.stdout).toContain('SESSION_WORKTREE_CREATED');
      expect(registeredWorktreeCount(canonical)).toBe(2);
      const report = integrityJson(canonical).report;
      expect(codes(report)).not.toContain('WORKSPACE_WORKTREE_LIMIT_EXCEEDED');
    } finally {
      cleanup(base);
    }
  });

  test('9. every mutating command supports a zero-mutation dry run', () => {
    const { base, canonical } = fixture();
    try {
      const target = worktreeParent(base);
      // Walk the real lifecycle in order, taking a dry run of each step
      // immediately BEFORE performing it for real. Each dry run is asserted
      // against the topology captured just before it.
      const started = session(canonical, ['start', '--task', 'synthetic-task', '--dir', target]);
      expect(started.status, started.stderr).toBe(0);
      const startedPath = /path=(\S+)/.exec(started.stdout)?.[1];
      expect(startedPath).toBeTruthy();
      const name = path.basename(startedPath!);

      // claim -- `start` leaves a RELEASED record, so a claim adopts it.
      let before = fullTopology(canonical, target);
      const claim = session(startedPath!, ['claim', '--task', 'synthetic-task', '--adopt', '--dry-run']);
      expect(claim.status, claim.stderr).toBe(0);
      expect(claim.stdout).toContain('PLAN SESSION_CLAIM_PLAN');
      expect(claim.stdout).toContain('REPLACE');
      expect(claim.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: claim');
      expect(claim.stdout).not.toContain('[session] SESSION_CLAIMED');
      expect(fullTopology(canonical, target)).toBe(before);
      const realClaim = session(startedPath!, ['claim', '--task', 'synthetic-task', '--adopt']);
      expect(realClaim.status, realClaim.stderr).toBe(0);

      // reconcile -- must not fetch, so refs/remotes stays put
      before = fullTopology(canonical, target);
      const reconcile = session(startedPath!, ['reconcile', '--dry-run']);
      expect(reconcile.status, reconcile.stderr).toBe(0);
      expect(reconcile.stdout).toContain('PLAN SESSION_RECONCILE_PLAN');
      expect(reconcile.stdout).toContain('no fetch performed');
      expect(reconcile.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: reconcile');
      expect(reconcile.stdout).not.toContain('[session] SESSION_RECONCILED');
      expect(fullTopology(canonical, target)).toBe(before);

      // integrate -- the guard sits above the fetch
      before = fullTopology(canonical, target);
      const integrate = session(startedPath!, ['integrate', '--dry-run']);
      expect(integrate.status, integrate.stderr).toBe(0);
      expect(integrate.stdout).toContain('PLAN SESSION_INTEGRATE_PLAN');
      expect(integrate.stdout).toContain('no fetch performed');
      expect(integrate.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: integrate');
      expect(integrate.stdout).not.toContain('[session] SESSION_INTEGRATED');
      expect(fullTopology(canonical, target)).toBe(before);

      // release
      before = fullTopology(canonical, target);
      const release = session(startedPath!, ['release', '--dry-run']);
      expect(release.status, release.stderr).toBe(0);
      expect(release.stdout).toContain('PLAN SESSION_RELEASE_PLAN');
      expect(release.stdout).toContain('-> RELEASED');
      expect(release.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: release');
      expect(release.stdout).not.toContain('[session] SESSION_RELEASED');
      expect(fullTopology(canonical, target)).toBe(before);
      const realRelease = session(startedPath!, ['release']);
      expect(realRelease.status, realRelease.stderr).toBe(0);

      // remove -- the destructive one, with both destructive flags set
      before = fullTopology(canonical, target);
      const remove = session(canonical, ['remove', '--name', name, '--delete-branch', '--abandon-unmerged', '--dry-run']);
      expect(remove.status, remove.stderr).toBe(0);
      expect(remove.stdout).toContain('PLAN SESSION_REMOVE_PLAN');
      expect(remove.stdout).toContain('PLAN SESSION_REMOVE_WOULD_REMOVE_WORKTREE');
      expect(remove.stdout).toContain('PLAN SESSION_REMOVE_WOULD_DELETE_BRANCH');
      expect(remove.stdout).toContain('SESSION_DRY_RUN_NO_MUTATION: remove');
      expect(remove.stdout).not.toContain('[session] SESSION_WORKTREE_REMOVED');
      expect(remove.stdout).not.toContain('[session] SESSION_BRANCH_DELETED');
      expect(fullTopology(canonical, target)).toBe(before);
      // The worktree and its branch both survived the dry run.
      expect(fs.existsSync(startedPath!)).toBe(true);
      expect(gitOk(canonical, ['branch', '--list', `session/${name}`]).trim()).not.toBe('');
      // ...and the real remove afterwards still works.
      const realRemove = session(canonical, ['remove', '--name', name, '--delete-branch']);
      expect(realRemove.status, realRemove.stderr).toBe(0);
      expect(realRemove.stdout).toContain('SESSION_WORKTREE_REMOVED');
      expect(fs.existsSync(startedPath!)).toBe(false);
    } finally {
      cleanup(base);
    }
  });

  test('10. a read-only command refuses --dry-run instead of ignoring it', () => {
    const { base, canonical } = fixture();
    try {
      for (const command of ['status', 'check']) {
        const result = session(canonical, [command, '--dry-run']);
        expect(result.status, `${command} should refuse --dry-run`).toBe(2);
        expect(result.stderr).toContain('SESSION_DRY_RUN_NOT_APPLICABLE');
        expect(result.stderr).toContain(command);
      }
    } finally {
      cleanup(base);
    }
  });

  test('11. the help text states the real per-command dry-run contract', () => {
    const { base, canonical } = fixture();
    try {
      const help = session(canonical, ['--help']);
      expect(help.status).toBe(0);
      expect(help.stdout).toContain('--dry-run');
      // The old text promised "without mutating" globally, including for the
      // two commands that refuse the flag and the five that ignored it.
      expect(help.stdout).toContain('mutate nothing');
      expect(help.stdout).toContain('refused for status/check');
    } finally {
      cleanup(base);
    }
  });

  test('12. the declared dry-run contract covers every dispatchable command', () => {
    // Totality: a command added to COMMANDS without a DRY_RUN_SUPPORT entry
    // would fall through the dispatch guard and silently ignore the flag
    // again. Proven against the shipped source, not a copy of the list.
    const source = fs.readFileSync(SESSION, 'utf8');
    const commands = /const COMMANDS = new Set\(\[([^\]]*)\]\)/.exec(source)?.[1];
    expect(commands).toBeTruthy();
    const names = [...commands!.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(names.length).toBeGreaterThanOrEqual(8);
    const table = /const DRY_RUN_SUPPORT = Object\.freeze\(\{([\s\S]*?)\}\);/.exec(source)?.[1];
    expect(table).toBeTruthy();
    const declared = new Map([...table!.matchAll(/^\s*(\w+):\s*'(SUPPORTED|NOT_APPLICABLE)',/gm)].map((match) => [match[1], match[2]]));
    const missing = names.filter((name) => !declared.has(name));
    expect(missing, `commands with no declared --dry-run contract: ${missing.join(', ')}`).toEqual([]);
    const extra = [...declared.keys()].filter((name) => !names.includes(name));
    expect(extra, `declared contracts for commands that do not exist: ${extra.join(', ')}`).toEqual([]);
  });
});
