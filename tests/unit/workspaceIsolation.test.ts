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

function session(cwd: string, args: readonly string[]): Run {
  const result = spawnSync(process.execPath, [SESSION, ...args], { cwd, encoding: 'utf8', timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
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
function fixture(): { readonly base: string; readonly upstream: string; readonly canonical: string; readonly baseSha: string } {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c00-'));
  const upstream = path.join(base, 'upstream.git');
  const seed = path.join(base, 'seed');
  fs.mkdirSync(seed, { recursive: true });
  gitOk(seed, ['init', '-b', 'main']);
  fs.mkdirSync(path.join(seed, '.agent/tasks/synthetic-task'), { recursive: true });
  fs.mkdirSync(path.join(seed, 'config'), { recursive: true });
  fs.copyFileSync(POLICY, path.join(seed, 'config/workspace-integrity.v1.json'));
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
