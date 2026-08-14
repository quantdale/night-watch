import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CHECKER = path.join(__dirname, '..', '..', 'bin', 'agent-state.mjs');
const GIT_FLAGS = ['-c', 'commit.gpgsign=false', '-c', 'user.email=nightwatch-test@example.invalid', '-c', 'user.name=Nightwatch Test'];

const gitAvailable = (() => {
  const result = spawnSync('git', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
})();

test.skip(!gitAvailable, 'git CLI is unavailable; agent-state validator tests skipped');

function git(root: string, args: string[]): string {
  const result = spawnSync('git', [...GIT_FLAGS, ...args], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr ?? `git failed: ${args.join(' ')}`);
  return (result.stdout ?? '').trim();
}

interface ProtocolOptions {
  readonly state?: string;
  readonly status?: string;
  readonly taskId?: string;
  readonly currentSha?: string;
  readonly baselineSha?: string;
  readonly substantiveSha?: string;
  readonly documentationSha?: string;
  readonly startingSha?: string;
  readonly legacyCurrentSha?: string;
  readonly persistedHeadSha?: string;
}

function writeProtocol(root: string, options: ProtocolOptions = {}): string {
  const taskId = options.taskId ?? 'phase-test';
  const taskDirectory = `.agent/tasks/${taskId}`;
  const baselineSha = options.baselineSha ?? options.currentSha ?? '0000000000000000000000000000000000000000';
  const substantiveSha = options.substantiveSha ?? baselineSha;
  const startingSha = options.startingSha ?? baselineSha;
  const legacyCurrentSha = options.legacyCurrentSha;
  const persistedHeadSha = options.persistedHeadSha ?? 'DISCOVER_FROM_GIT';
  fs.mkdirSync(path.join(root, taskDirectory), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agent contract\n');
  fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), `# Active Task

Task ID: ${taskId}
Phase: test
Title: Synthetic validator fixture
Status: ${options.status ?? 'IN_PROGRESS'}
Task directory: ${taskDirectory}
Starting SHA: ${startingSha}
Last validated implementation SHA: ${baselineSha}
${legacyCurrentSha === undefined ? '' : `Current SHA: ${legacyCurrentSha}
`}Current milestone: M1
Last checkpoint: synthetic
Next action: run the synthetic validator test
`);
  fs.writeFileSync(path.join(root, taskDirectory, 'SPEC.md'), '# Synthetic task\n');
  fs.writeFileSync(path.join(root, taskDirectory, 'PLAN.md'), `# Synthetic plan

## Purpose
## Starting State
## Scope
## Non-Goals
## Safety Constraints
## Architecture / Approach
## Milestones
## Validation Strategy
## Decision Log
## Discoveries
## Deferred Work
## Completion Criteria
`);
  const state = options.state ?? `# Task State

## Identity

Task ID: ${taskId}
Phase: test
Status: ${options.status ?? 'IN_PROGRESS'}
Starting SHA: ${startingSha}
Last validated implementation SHA: ${baselineSha}
Last substantive checkpoint SHA: ${substantiveSha}
${options.documentationSha === undefined ? '' : `Last documentation checkpoint SHA: ${options.documentationSha}
`}STARTING_SHA: ${startingSha}
LAST_VALIDATED_IMPLEMENTATION_SHA: ${baselineSha}
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${substantiveSha}
${options.documentationSha === undefined ? '' : `LAST_DOCUMENTATION_CHECKPOINT_SHA: ${options.documentationSha}
`}LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: ${persistedHeadSha}
CURRENT_REMOTE_HEAD: ${persistedHeadSha}
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
${legacyCurrentSha === undefined ? '' : `Current SHA: ${legacyCurrentSha}
`}
Branch: main
Last checkpoint: synthetic

## Objective
synthetic
## Current Milestone
synthetic
## Completed Milestones
synthetic
## Work In Progress
synthetic
## Exact Next Action
run the synthetic validator test
## Files Changed
synthetic
## Validation Ledger
synthetic
## Decisions Made During This Task
synthetic
## Discoveries
synthetic
## Blockers
None.
## Safety Events
NONE
## Deferred / Follow-Up
None.
## Resume Recipe
1. run the test
## Completion Snapshot
`;
  fs.writeFileSync(path.join(root, taskDirectory, 'STATE.md'), state);
  fs.writeFileSync(path.join(root, taskDirectory, 'REPORT.md'), '# Synthetic report\n');
  return taskDirectory;
}

function fixture(): { root: string; sha: string; initialSha: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-agent-state-'));
  git(root, ['init', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'seed.txt'), 'synthetic fixture\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'synthetic base']);
  const initialSha = git(root, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(root, 'source.ts'), 'validated substantive implementation\n');
  git(root, ['add', 'source.ts']);
  git(root, ['commit', '-m', 'substantive implementation']);
  const sha = git(root, ['rev-parse', 'HEAD']);
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha });
  return { root, sha, initialSha };
}

function run(root: string) {
  return spawnSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' });
}

function setField(root: string, relativePath: string, key: string, value: string): void {
  const file = path.join(root, relativePath);
  const text = fs.readFileSync(file, 'utf8');
  const line = `${key}: ${value}`;
  const pattern = new RegExp(`^${key}:.*$`, 'm');
  fs.writeFileSync(file, pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`);
}

function setContinuity(root: string, options: { readonly baseline?: string; readonly substantive?: string; readonly documentation?: string; readonly persistedHead?: string }): void {
  if (options.baseline !== undefined) {
    setField(root, '.agent/ACTIVE_TASK.md', 'Last validated implementation SHA', options.baseline);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'Last validated implementation SHA', options.baseline);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'LAST_VALIDATED_IMPLEMENTATION_SHA', options.baseline);
  }
  if (options.substantive !== undefined) {
    setField(root, '.agent/tasks/phase-test/STATE.md', 'Last substantive checkpoint SHA', options.substantive);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'LAST_SUBSTANTIVE_CHECKPOINT_SHA', options.substantive);
  }
  if (options.documentation !== undefined) {
    setField(root, '.agent/tasks/phase-test/STATE.md', 'Last documentation checkpoint SHA', options.documentation);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'LAST_DOCUMENTATION_CHECKPOINT_SHA', options.documentation);
  }
  if (options.persistedHead !== undefined) {
    setField(root, '.agent/tasks/phase-test/STATE.md', 'CURRENT_LOCAL_HEAD', options.persistedHead);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'CURRENT_REMOTE_HEAD', options.persistedHead);
  }
}

function setStatus(root: string, status: string): void {
  setField(root, '.agent/ACTIVE_TASK.md', 'Status', status);
  setField(root, '.agent/tasks/phase-test/STATE.md', 'Status', status);
}

function commitFile(root: string, relativePath: string, content: string, message: string): string {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  git(root, ['add', relativePath]);
  git(root, ['commit', '-m', message]);
  return git(root, ['rev-parse', 'HEAD']);
}

test('valid active task passes', () => {
  const { root } = fixture();
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), 'AGENTS.md\n.agent/\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('[agent-check] SHA SYNCED');
  expect(result.stdout).toContain('[agent-check] PASS');
});

test('missing state file fails', () => {
  const { root } = fixture();
  fs.rmSync(path.join(root, '.agent', 'tasks', 'phase-test', 'STATE.md'));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('missing or unreadable file');
});

test('invalid active status fails', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'ACTIVE_TASK.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('Status: IN_PROGRESS', 'Status: RUNNING'));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('invalid status');
});

test('mismatched task id and directory fails', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'ACTIVE_TASK.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('Task ID: phase-test', 'Task ID: other-task'));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('task ID/directory mismatch');
});

test('unknown implementation SHA is rejected without rewriting state', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'ACTIVE_TASK.md');
  const stale = '1111111111111111111111111111111111111111';
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/[0-9a-f]{40}/g, stale));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).toContain('does not identify a repository commit');
});

test('approved continuity-only descendant is checkpoint advance', () => {
  const { root, sha } = fixture();
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Updated agent contract\n');
  git(root, ['add', 'AGENTS.md']);
  git(root, ['commit', '-m', 'checkpoint continuity docs']);
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).toContain(sha);
  expect(result.stderr).toContain('AGENTS.md');
});

test('substantive implementation anchor survives a docs-only checkpoint chain', () => {
  const { root, sha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation checkpoint B\n', 'documentation checkpoint B');
  const head = commitFile(root, 'docs/CURRENT_STATE.md', '# Status-only checkpoint C\n', 'status-only checkpoint C');
  setContinuity(root, { documentation: documentationSha, persistedHead: sha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).not.toContain('STALE_IMPLEMENTATION_BASELINE');
  expect(result.stdout).toContain(`LIVE GIT HEAD: ${head}`);
  expect(fs.readFileSync(path.join(root, '.agent/tasks/phase-test/STATE.md'), 'utf8')).toContain(`LAST_VALIDATED_IMPLEMENTATION_SHA: ${sha}`);
});

test('documentation-only SHA cannot masquerade as the validated implementation role', () => {
  const { root, sha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation-only descendant\n', 'documentation descendant');
  setContinuity(root, { baseline: documentationSha, substantive: sha, documentation: documentationSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).toContain('documentation-only descendant');
});

test('COMPLETE task closure fails after a source change beyond the validated baseline', () => {
  const { root, sha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation checkpoint\n', 'documentation checkpoint');
  commitFile(root, 'source.ts', 'validated substantive implementation\nsource drift after closure\n', 'source drift after closure');
  setContinuity(root, { documentation: documentationSha });
  setStatus(root, 'COMPLETE');
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('STALE_IMPLEMENTATION_BASELINE');
  expect(result.stderr).toContain(sha);
});

test('documentation checkpoint before the substantive checkpoint is invalid', () => {
  const { root, initialSha } = fixture();
  setContinuity(root, { documentation: initialSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_DOCUMENTATION_CHECKPOINT');
  expect(result.stderr).toContain('before or unrelated');
});

test('documentation checkpoint on an unrelated branch is invalid', () => {
  const { root } = fixture();
  git(root, ['checkout', '-b', 'unrelated']);
  const unrelatedSha = commitFile(root, 'unrelated.md', '# unrelated branch\n', 'unrelated documentation');
  git(root, ['checkout', 'main']);
  setContinuity(root, { documentation: unrelatedSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_DOCUMENTATION_CHECKPOINT');
  expect(result.stderr).toContain('not an ancestor');
});

test('documentation checkpoint containing a source change is invalid', () => {
  const { root } = fixture();
  const sourceCheckpoint = commitFile(root, 'source.ts', 'implementation changed in documentation checkpoint\n', 'misclassified source checkpoint');
  setContinuity(root, { documentation: sourceCheckpoint });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_DOCUMENTATION_CHECKPOINT');
  expect(result.stderr).toContain('non-documentation paths');
  expect(result.stderr).toContain('source.ts');
});

test('substantive implementation anchor on an unrelated branch is rejected', () => {
  const { root, sha } = fixture();
  git(root, ['checkout', '-b', 'unrelated-implementation']);
  const unrelatedSha = commitFile(root, 'branch-source.ts', 'unrelated implementation\n', 'unrelated implementation');
  git(root, ['checkout', 'main']);
  setContinuity(root, { baseline: unrelatedSha, substantive: unrelatedSha, documentation: sha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('STATE LAST_VALIDATED_IMPLEMENTATION_SHA');
  expect(result.stderr).toContain('not an ancestor of live Git HEAD');
});

test('untracked source changes remain a stale implementation baseline', () => {
  const { root } = fixture();
  fs.writeFileSync(path.join(root, 'untracked-source.ts'), 'untracked source drift\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('STALE_IMPLEMENTATION_BASELINE');
  expect(result.stderr).toContain('untracked-source.ts');
});

test('live HEAD is discovered from Git even when deprecated persisted heads are stale', () => {
  const { root, sha } = fixture();
  const head = commitFile(root, 'AGENTS.md', '# New live documentation head\n', 'new live documentation head');
  setContinuity(root, { persistedHead: sha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(`LIVE GIT HEAD: ${head}`);
  expect(result.stderr).not.toContain('continuity diverged');
  expect(result.stderr).not.toContain('CURRENT_REMOTE_HEAD does not match');
});

test('legacy Current SHA is compatibility data only and is not compared to the implementation anchor', () => {
  const { root, initialSha } = fixture();
  setField(root, '.agent/ACTIVE_TASK.md', 'Current SHA', initialSha);
  setField(root, '.agent/tasks/phase-test/STATE.md', 'Current SHA', initialSha);
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('DEPRECATED_CONTINUITY_FIELD');
  expect(result.stderr).not.toContain('must equal Current SHA');
});

test('implementation descendant remains stale', () => {
  const { root } = fixture();
  fs.writeFileSync(path.join(root, 'source.ts'), 'synthetic implementation change\n');
  git(root, ['add', 'source.ts']);
  git(root, ['commit', '-m', 'synthetic implementation change']);
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('STALE STATE');
  expect(result.stderr).toContain('implementation/source/test/config');
});

test('uncommitted implementation change remains stale', () => {
  const { root } = fixture();
  fs.writeFileSync(path.join(root, 'seed.txt'), 'uncommitted implementation change\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('STALE STATE');
});

test('uncommitted approved task state is checkpoint advance', () => {
  const { root } = fixture();
  fs.appendFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), '\ncheckpoint note\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('STALE STATE');
});

test('uncommitted approved exploration ledger is checkpoint advance', () => {
  const { root } = fixture();
  const ledger = path.join(root, '.agent', 'tasks', 'phase-test', 'ACTIONS.md');
  fs.writeFileSync(ledger, '# Synthetic action ledger\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('STALE STATE');
});

test('uncommitted Phase 6 binding audit is checkpoint advance', () => {
  const { root } = fixture();
  const audit = path.join(root, 'corpus', 'phase6', 'runtime-binding-audit.json');
  fs.mkdirSync(path.dirname(audit), { recursive: true });
  fs.writeFileSync(audit, '{"schema":"synthetic.phase6.audit"}\n');
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('STALE STATE');
});

test('missing required state section fails', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'tasks', 'phase-test', 'STATE.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Validation Ledger\nsynthetic\n', ''));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('STATE.md missing required heading: ## Validation Ledger');
});

test('malformed active task fails', () => {
  const { root } = fixture();
  fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), '# Active Task\nStatus IN_PROGRESS\n');
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ACTIVE_TASK missing field: Task ID');
});

test('synthetic secret-like value is rejected', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'tasks', 'phase-test', 'STATE.md');
  fs.appendFileSync(file, '\nSynthetic only: Bearer SYNTHETIC_FAKE_TOKEN_123\n');
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('secret-like Bearer token detected');
});
