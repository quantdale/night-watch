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

function writeProtocol(root: string, options: { state?: string; status?: string; taskId?: string; currentSha?: string } = {}): string {
  const taskId = options.taskId ?? 'phase-test';
  const taskDirectory = `.agent/tasks/${taskId}`;
  fs.mkdirSync(path.join(root, taskDirectory), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agent contract\n');
  fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), `# Active Task

Task ID: ${taskId}
Phase: test
Title: Synthetic validator fixture
Status: ${options.status ?? 'IN_PROGRESS'}
Task directory: ${taskDirectory}
Starting SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
Current SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
Last validated implementation SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
Current milestone: M1
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
Starting SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
Current SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
Last validated implementation SHA: ${options.currentSha ?? '0000000000000000000000000000000000000000'}
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

function fixture(): { root: string; sha: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-agent-state-'));
  git(root, ['init', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'seed.txt'), 'synthetic fixture\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'synthetic fixture']);
  const sha = git(root, ['rev-parse', 'HEAD']);
  writeProtocol(root, { currentSha: sha });
  return { root, sha };
}

function run(root: string) {
  return spawnSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' });
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

test('non-ancestor SHA is reported stale without rewriting state', () => {
  const { root } = fixture();
  const file = path.join(root, '.agent', 'ACTIVE_TASK.md');
  const stale = '1111111111111111111111111111111111111111';
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/[0-9a-f]{40}/g, stale));
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('STALE STATE');
  expect(result.stderr).toContain('not an ancestor');
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
