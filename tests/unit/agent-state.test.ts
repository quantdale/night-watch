import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  derivePhaseStatusKey,
  normalizeTaskStatus,
  isTerminalMilestoneText,
  isTerminalNextActionText,
  isTerminalResumeRecipeText,
  hasClosurePlaceholder,
} from '../../bin/agent-continuity-protocol.mjs';

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
  readonly phase?: string;
  readonly activePhase?: string;
  readonly phaseStatus?: string;
  readonly protocolVersion?: string;
  readonly omitProtocol?: boolean;
  readonly activeMilestone?: string;
  readonly activeNextAction?: string;
  readonly stateMilestone?: string;
  readonly stateWip?: string;
  readonly stateNextAction?: string;
  readonly stateBlockers?: string;
  readonly stateResume?: string;
  readonly stateSnapshot?: string;
  readonly stateLedger?: string;
  readonly planMilestones?: string;
  readonly planDecisionLog?: string;
  readonly reportStatus?: string;
  readonly reportBody?: string;
  readonly stateExtra?: string;
  readonly activeExtra?: string;
}

function protocolStrings(taskId: string, options: ProtocolOptions): { active: string; spec: string; plan: string; state: string; report: string } {
  const baselineSha = options.baselineSha ?? options.currentSha ?? '0000000000000000000000000000000000000000';
  const substantiveSha = options.substantiveSha ?? baselineSha;
  const startingSha = options.startingSha ?? baselineSha;
  const legacyCurrentSha = options.legacyCurrentSha;
  const persistedHeadSha = options.persistedHeadSha ?? 'DISCOVER_FROM_GIT';
  const phase = options.phase ?? 'test';
  const activePhase = options.activePhase ?? phase;
  const protocolVersion = options.protocolVersion ?? 'nightwatch.agent-continuity.v2';
  const activeMilestone = options.activeMilestone ?? 'M1';
  const activeNextAction = options.activeNextAction ?? 'run the synthetic validator test';
  const stateMilestone = options.stateMilestone ?? 'synthetic';
  const stateWip = options.stateWip ?? 'synthetic';
  const stateNextAction = options.stateNextAction ?? 'run the synthetic validator test';
  const stateBlockers = options.stateBlockers ?? 'None.';
  const stateResume = options.stateResume ?? '1. run the test';
  const stateSnapshot = options.stateSnapshot ?? '';
  const stateLedger = options.stateLedger ?? 'synthetic';
  const planMilestones = options.planMilestones ?? '';
  const reportStatusLine = options.reportStatus === undefined ? '' : `Status: ${options.reportStatus}\n`;
  const protocolLine = options.omitProtocol === true ? '' : `CONTINUITY_PROTOCOL_VERSION: ${protocolVersion}\n`;
  const phaseStatusKey = `PHASE_${phase.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_STATUS`;
  const phaseStatusLine = options.phaseStatus === undefined ? '' : `${phaseStatusKey}: ${options.phaseStatus}\n`;
  const taskDirectory = `.agent/tasks/${taskId}`;
  const active = `# Active Task

Task ID: ${taskId}
Phase: ${activePhase}
Title: Synthetic validator fixture
Status: ${options.status ?? 'IN_PROGRESS'}
Task directory: ${taskDirectory}
Starting SHA: ${startingSha}
Last validated implementation SHA: ${baselineSha}
${legacyCurrentSha === undefined ? '' : `Current SHA: ${legacyCurrentSha}
`}Current milestone: ${activeMilestone}
Last checkpoint: synthetic
Next action: ${activeNextAction}
${protocolLine}${options.activeExtra ?? ''}`;
  const spec = '# Synthetic task\n';
  const plan = `# Synthetic plan

## Purpose
## Starting State
## Scope
## Non-Goals
## Safety Constraints
## Architecture / Approach
## Milestones
${planMilestones}
## Validation Strategy
## Decision Log
${options.planDecisionLog ?? ''}
## Discoveries
## Deferred Work
## Completion Criteria
`;
  const state = options.state ?? `# Task State

## Identity

Task ID: ${taskId}
Phase: ${phase}
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
`}${phaseStatusLine}${protocolLine}
Branch: main
Last checkpoint: synthetic

## Objective
synthetic
## Current Milestone
${stateMilestone}
## Completed Milestones
synthetic
## Work In Progress
${stateWip}
## Exact Next Action
${stateNextAction}
## Files Changed
synthetic
## Validation Ledger
${stateLedger}
## Decisions Made During This Task
synthetic
## Discoveries
synthetic
## Blockers
${stateBlockers}
## Safety Events
NONE
## Deferred / Follow-Up
None.
## Resume Recipe
${stateResume}
## Completion Snapshot
${stateSnapshot}
${options.stateExtra ?? ''}`;
  const report = `# Synthetic report
${reportStatusLine}${options.reportBody ?? ''}`;
  return { active, spec, plan, state, report };
}

function writeTaskDir(root: string, taskId: string, options: ProtocolOptions = {}): void {
  const taskDirectory = `.agent/tasks/${taskId}`;
  const strings = protocolStrings(taskId, options);
  fs.mkdirSync(path.join(root, taskDirectory), { recursive: true });
  fs.writeFileSync(path.join(root, taskDirectory, 'SPEC.md'), strings.spec);
  fs.writeFileSync(path.join(root, taskDirectory, 'PLAN.md'), strings.plan);
  fs.writeFileSync(path.join(root, taskDirectory, 'STATE.md'), strings.state);
  fs.writeFileSync(path.join(root, taskDirectory, 'REPORT.md'), strings.report);
}

function writeProtocol(root: string, options: ProtocolOptions = {}): string {
  const taskId = options.taskId ?? 'phase-test';
  const strings = protocolStrings(taskId, options);
  fs.mkdirSync(path.join(root, '.agent'), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agent contract\n');
  fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), strings.active);
  writeTaskDir(root, taskId, options);
  return `.agent/tasks/${taskId}`;
}

/** Valid COMPLETE v2 task directory (used for history-audit fixtures). */
function writeClosedV2Task(root: string, taskId: string, phase: string, sha: string): void {
  writeTaskDir(root, taskId, {
    taskId,
    phase,
    status: 'COMPLETE',
    phaseStatus: 'COMPLETE',
    baselineSha: sha,
    substantiveSha: sha,
    startingSha: sha,
    activeMilestone: 'COMPLETE / STOP',
    activeNextAction: 'STOP',
    stateMilestone: 'COMPLETE / STOP.',
    stateWip: 'NONE.',
    stateNextAction: 'STOP — task complete.',
    stateResume: 'Task complete. Do not resume.',
    stateSnapshot: 'Task complete. PASS.',
    planMilestones: '- M1 — DONE',
    reportStatus: 'COMPLETE',
  });
}

function setCompleteV2(root: string, options: ProtocolOptions = {}): void {
  writeProtocol(root, {
    status: 'COMPLETE',
    phaseStatus: 'COMPLETE',
    activeMilestone: 'COMPLETE / STOP',
    activeNextAction: 'STOP',
    stateMilestone: 'COMPLETE / STOP.',
    stateWip: 'NONE.',
    stateNextAction: 'STOP — task complete.',
    stateResume: 'Task complete. Do not resume.',
    stateSnapshot: 'Task complete. PASS.',
    planMilestones: '- M1 — DONE',
    reportStatus: 'COMPLETE',
    ...options,
  });
}

function setBlockedV2(root: string, options: ProtocolOptions = {}): void {
  writeProtocol(root, {
    status: 'BLOCKED',
    phaseStatus: 'BLOCKED',
    activeMilestone: 'M1 — BLOCKED',
    activeNextAction: 'STOP — retry requires a new owner authorization.',
    stateMilestone: 'M1 — BLOCKED.',
    stateWip: 'NONE.',
    stateNextAction: 'STOP — retry requires a new owner authorization.',
    stateBlockers: '**BLOCKED**: fresh owner authorization required for any retry.',
    stateResume: 'Task blocked; do not resume.',
    stateSnapshot: 'Task blocked; no completion claim.',
    planMilestones: '- M1 — BLOCKED',
    ...options,
  });
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

function runAudit(root: string) {
  return spawnSync(process.execPath, [CHECKER, '--root', root, '--audit-history'], { encoding: 'utf8' });
}

function setField(root: string, relativePath: string, key: string, value: string): void {
  const file = path.join(root, relativePath);
  const text = fs.readFileSync(file, 'utf8');
  const line = `${key}: ${value}`;
  const pattern = new RegExp(`^${key}:.*$`, 'm');
  fs.writeFileSync(file, pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`);
}

function setContinuity(root: string, options: { readonly baseline?: string; readonly substantive?: string; readonly documentation?: string; readonly starting?: string; readonly persistedHead?: string }): void {
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
  if (options.starting !== undefined) {
    setField(root, '.agent/ACTIVE_TASK.md', 'Starting SHA', options.starting);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'Starting SHA', options.starting);
    setField(root, '.agent/tasks/phase-test/STATE.md', 'STARTING_SHA', options.starting);
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

test('same-value documentation implementation forgery fails when the claimed commit is HEAD', () => {
  const { root, initialSha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation-only HEAD\n', 'documentation-only HEAD');
  setContinuity(root, { starting: initialSha, baseline: documentationSha, substantive: documentationSha, documentation: documentationSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).toContain(`claimed implementation checkpoint ${documentationSha}`);
  expect(result.stderr).toContain('documentation-only in its own commit');
});

test('same-value documentation implementation forgery fails at a later docs-only descendant', () => {
  const { root, initialSha } = fixture();
  commitFile(root, 'AGENTS.md', '# Documentation checkpoint C\n', 'documentation checkpoint C');
  const laterDocumentationSha = commitFile(root, 'docs/CURRENT_STATE.md', '# Documentation checkpoint D\n', 'documentation checkpoint D');
  setContinuity(root, { starting: initialSha, baseline: laterDocumentationSha, substantive: laterDocumentationSha, documentation: laterDocumentationSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).toContain('documentation-only in its own commit');
});

test('source implementation B followed by documentation C remains a valid checkpoint advance', () => {
  const { root, initialSha, sha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation after source B\n', 'documentation after source B');
  setContinuity(root, { starting: initialSha, baseline: sha, substantive: sha, documentation: documentationSha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('INVALID_IMPLEMENTATION_ROLE');
});

test('carried-forward implementation remains valid when the new task starts at a docs descendant', () => {
  const { root, sha } = fixture();
  const startingSha = commitFile(root, 'AGENTS.md', '# Previous task documentation closure\n', 'previous task documentation closure');
  setContinuity(root, { starting: startingSha, baseline: sha, substantive: sha, documentation: startingSha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('INVALID_IMPLEMENTATION_ROLE');
});

test('new source implementation descendant proves its own implementation role', () => {
  const { root, initialSha } = fixture();
  const implementationSha = commitFile(root, 'src/runtime.ts', 'new implementation checkpoint\n', 'new implementation checkpoint');
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), 'AGENTS.md\n.agent/\n');
  setContinuity(root, { starting: initialSha, baseline: implementationSha, substantive: implementationSha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('[agent-check] SHA SYNCED');
  expect(result.stderr).not.toContain('INVALID_IMPLEMENTATION_ROLE');
});

test('merge implementation role is rejected when direct attribution is ambiguous', () => {
  const { root, initialSha } = fixture();
  git(root, ['checkout', '-b', 'role-side']);
  commitFile(root, 'side-source.ts', 'side implementation\n', 'side implementation');
  git(root, ['checkout', 'main']);
  commitFile(root, 'main-source.ts', 'main implementation\n', 'main implementation');
  git(root, ['merge', '--no-ff', '--no-edit', 'role-side']);
  const mergeSha = git(root, ['rev-parse', 'HEAD']);
  setContinuity(root, { starting: initialSha, baseline: mergeSha, substantive: mergeSha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_ROLE');
  expect(result.stderr).toContain('merge commit role attribution is ambiguous');
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
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, documentationSha });
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

test('STARTING_SHA and the implementation anchor on unrelated lineages fail precisely', () => {
  const { root, sha, initialSha } = fixture();
  git(root, ['checkout', '-b', 'unrelated-start', initialSha]);
  const unrelatedStartingSha = commitFile(root, 'start-source.ts', 'unrelated task start\n', 'unrelated task start');
  git(root, ['checkout', 'main']);
  setContinuity(root, { starting: unrelatedStartingSha, baseline: sha, substantive: sha });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('INVALID_IMPLEMENTATION_LINEAGE');
  expect(result.stderr).toContain('unrelated commits');
});

test('ACTIVE_TASK and STATE starting anchors must agree', () => {
  const { root, initialSha } = fixture();
  setField(root, '.agent/tasks/phase-test/STATE.md', 'Starting SHA', initialSha);
  setField(root, '.agent/tasks/phase-test/STATE.md', 'STARTING_SHA', initialSha);
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('STATE/ACTIVE_TASK starting anchors differ');
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

// ---------------------------------------------------------------------------
// Protocol v2 — happy paths
// ---------------------------------------------------------------------------

test('v2 valid COMPLETE task passes', () => {
  const { root, sha } = fixture();
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), 'AGENTS.md\n.agent/\n');
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('[agent-check] PASS');
});

test('v2 valid BLOCKED task passes', () => {
  const { root, sha } = fixture();
  fs.appendFileSync(path.join(root, '.git', 'info', 'exclude'), 'AGENTS.md\n.agent/\n');
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('[agent-check] PASS');
});

test('v2 COMPLETE task with docs-only descendant and live-head authority passes', () => {
  const { root, sha } = fixture();
  const documentationSha = commitFile(root, 'AGENTS.md', '# Documentation checkpoint\n', 'documentation checkpoint');
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, documentationSha });
  const result = run(root);
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('CHECKPOINT_ADVANCE');
  expect(result.stderr).not.toContain('INVALID_IMPLEMENTATION_ROLE');
});

test('v2 IN_PROGRESS with WIP NONE between milestones passes', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateWip: 'NONE.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('v2 DISCOVER_FROM_GIT final-head authority marker passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nFINAL_HEAD: DISCOVER_FROM_GIT\nFINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_LIVE_HEAD\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('all-v2 history audit passes with multiple closed tasks', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-a', '8A.1.1', sha);
  writeClosedV2Task(root, 'phase-closed-b', '8B.0.1', sha);
  const result = runAudit(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('strict_v2=3');
  expect(result.stdout).toContain('legacy_v1=0');
  expect(result.stdout).toContain('strict_errors=0');
});

test('legacy and v2 mix audit passes with legacy warnings only', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-v2', '8B.1.0', sha);
  // A legacy v1 task (no protocol marker, COMPLETE).
  writeTaskDir(root, 'phase-legacy-old', {
    taskId: 'phase-legacy-old',
    phase: '3',
    status: 'COMPLETE',
    omitProtocol: true,
    baselineSha: sha,
    substantiveSha: sha,
    startingSha: sha,
    stateMilestone: 'M5 — DONE',
    stateWip: 'NONE.',
    stateNextAction: 'STOP.',
    stateSnapshot: 'Closed.',
    reportStatus: 'COMPLETE',
  });
  const result = runAudit(root);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('strict_v2=2');
  expect(result.stdout).toContain('legacy_v1=1');
  expect(result.stdout).toContain('strict_errors=0');
});

// ---------------------------------------------------------------------------
// Protocol v2 — COMPLETE negative matrix
// ---------------------------------------------------------------------------

test('v2 COMPLETE with phase-specific IN_PROGRESS fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, phaseStatus: 'IN_PROGRESS' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('CURRENT_PHASE_STATUS_MISMATCH');
});

test('v2 COMPLETE with ACTIVE milestone M12 fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, activeMilestone: 'M12' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_MILESTONE_NONTERMINAL');
});

test('v2 COMPLETE with STATE current milestone pending fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateMilestone: 'M17 — finalization pending' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_MILESTONE_NONTERMINAL');
});

test('v2 COMPLETE with active WIP fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateWip: 'M12 — run tests' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_HAS_WORK_IN_PROGRESS');
});

test('v2 COMPLETE with ACTIVE next action run tests fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, activeNextAction: 'run tests' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_NEXT_ACTION_NONTERMINAL');
});

test('v2 COMPLETE with STATE next action continue fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateNextAction: 'continue M12 → M18' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_NEXT_ACTION_NONTERMINAL');
});

test('v2 COMPLETE with resume recipe continue fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateResume: 'Continue from Exact Next Action (M12 → M18).' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_RESUME_RECIPE_NONTERMINAL');
});

test('v2 COMPLETE with missing REPORT fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha });
  fs.rmSync(path.join(root, '.agent', 'tasks', 'phase-test', 'REPORT.md'));
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_REPORT_MISSING');
});

test('v2 COMPLETE with REPORT IN_PROGRESS fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportStatus: 'IN_PROGRESS' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_REPORT_STATUS_MISMATCH');
});

test('v2 COMPLETE with REPORT missing status fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportStatus: undefined });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_REPORT_STATUS_MISSING');
});

test('v2 COMPLETE with empty snapshot fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateSnapshot: '' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_SNAPSHOT_INCOMPLETE');
});

test('v2 COMPLETE with fill-at-close placeholder fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateSnapshot: '(filled at close)' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('v2 COMPLETE with fill-after-finalization-push placeholder fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateLedger: 'Final exact CI (filled after finalization push)' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('v2 COMPLETE with angle-bracket final SHA placeholder fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateSnapshot: '<FINAL_SHA>' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('v2 COMPLETE with PLAN milestone PENDING fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, planMilestones: '- M1: DONE\n- M18: PENDING' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_PLAN_MILESTONE_PENDING');
});

test('v2 COMPLETE with unchecked milestone checkbox fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, planMilestones: '- [x] M1 — DONE\n- [ ] M2 — run tests' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_PLAN_MILESTONE_PENDING');
});

test('v2 duplicate conflicting CI_STATUS fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nCI_STATUS: PASS\nCI_STATUS: PENDING\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('DUPLICATE_CONTINUITY_FIELD');
  expect(result.stderr).toContain('CI_STATUS');
});

test('v2 duplicate identical Status fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nStatus: COMPLETE\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('DUPLICATE_CONTINUITY_FIELD');
  expect(result.stderr).toContain('Status');
});

test('v2 COMPLETE with ACTIVE/STATE phase mismatch fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, activePhase: 'other' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('TASK_PHASE_MISMATCH');
});

test('v2 COMPLETE with REPORT task id mismatch fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportBody: 'Task ID: other-task\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('TASK_ID_MISMATCH');
});

test('v2 COMPLETE with REPORT anchor mismatch fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportBody: 'Starting SHA: 1111111111111111111111111111111111111111\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('CONTINUITY_ANCHOR_MISMATCH');
});

test('v2 COMPLETE with current phase BLOCKED fails', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, phaseStatus: 'BLOCKED' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('CURRENT_PHASE_STATUS_MISMATCH');
});

// ---------------------------------------------------------------------------
// Protocol v2 — BLOCKED matrix
// ---------------------------------------------------------------------------

test('v2 BLOCKED with no blocker fails', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateBlockers: 'None.' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('BLOCKED_WITHOUT_BLOCKER');
});

test('v2 BLOCKED with REPORT COMPLETE fails', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportStatus: 'COMPLETE' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('BLOCKED_REPORT_FALSE_COMPLETE');
});

test('v2 BLOCKED with phase-specific COMPLETE fails', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, phaseStatus: 'COMPLETE' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('CURRENT_PHASE_STATUS_MISMATCH');
});

test('v2 BLOCKED with STOP pending owner decision passes', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateNextAction: 'STOP pending owner decision.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('v2 BLOCKED with diagnostic unblock action passes', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateNextAction: 'Resolve the unblock prerequisite, then re-validate.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('v2 BLOCKED with consumed-approval historical record passes', () => {
  const { root, sha } = fixture();
  setBlockedV2(root, {
    baselineSha: sha,
    substantiveSha: sha,
    startingSha: sha,
    stateBlockers: 'Previous attempt closed. The one consumed approval is permanently spent; retry is blocked on fresh owner authorization.',
  });
  const result = run(root);
  expect(result.status).toBe(0);
});

// ---------------------------------------------------------------------------
// Protocol v2 — IN_PROGRESS matrix
// ---------------------------------------------------------------------------

test('v2 IN_PROGRESS with REPORT COMPLETE fails', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportStatus: 'COMPLETE' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('IN_PROGRESS_REPORT_FALSE_COMPLETE');
});

test('v2 IN_PROGRESS with phase-specific COMPLETE fails', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, phaseStatus: 'COMPLETE' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('IN_PROGRESS_PHASE_STATUS_COMPLETE');
});

test('v2 IN_PROGRESS with terminal next action STOP fails', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, activeNextAction: 'STOP', stateNextAction: 'STOP' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('IN_PROGRESS_NEXT_ACTION_TERMINAL');
});

// ---------------------------------------------------------------------------
// Protocol v2 — duplicate parser precision
// ---------------------------------------------------------------------------

test('v2 duplicate structured key separated by many lines reports both lines', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nStatus: COMPLETE\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/DUPLICATE_CONTINUITY_FIELD: .*STATE\.md:\d+,\d+ — key=Status/);
});

test('duplicate table labels do not count as structured keys', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\n| CI_STATUS | PASS |\n| CI_STATUS | PENDING |\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('duplicate prose colons do not count as structured keys', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nThe result was: PASS and later: PENDING.\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('repeated list items do not become structured keys', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\n- CI_STATUS: PASS\n- CI_STATUS: PENDING\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

// ---------------------------------------------------------------------------
// Protocol v2 — placeholder scope precision
// ---------------------------------------------------------------------------

test('placeholder inside a code fence does not fail a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateSnapshot: '```\nFinal SHA: (filled after push)\n```\nTask complete. PASS.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('placeholder in a blockquote does not fail a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateSnapshot: '> Final CI: (filled at closure)\nTask complete. PASS.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('placeholder in PLAN Decision Log does not fail a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, planDecisionLog: 'Earlier M8 was PENDING (final values recorded at closure).' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('placeholder in a structured STATE field fails a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nFINAL_SHA_FIELD: (filled at close)\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('placeholder in a REPORT numbered final field fails a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportBody: '53. **Final documentation SHA**: (filled after finalization push)\n' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('placeholder in Validation Ledger fails a COMPLETE task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateLedger: 'Final exact CI — (filled at closure)' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

// ---------------------------------------------------------------------------
// Protocol v2 — false-positive protections
// ---------------------------------------------------------------------------

test('narrative historical pending in Decision Log passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, planDecisionLog: 'At M4 the task was PENDING until CI completed.' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('report historical narrative IN_PROGRESS passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportBody: 'The previous run had status IN_PROGRESS at M4; it later closed.\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('deferred future retry NOT_STARTED passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\n## Deferred / Follow-Up\nFuture Phase 8B.1 retry NOT_STARTED; requires separate authorization.\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('parent phase IN_PROGRESS passes for a COMPLETE child task', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, stateExtra: '\nPHASE_8_STATUS: IN_PROGRESS\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('COMPLETE next action STOP with future authorization passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, {
    baselineSha: sha,
    substantiveSha: sha,
    startingSha: sha,
    activeNextAction: 'STOP — Phase 8B.1 retry requires separate owner authorization.',
    stateNextAction: 'STOP — task complete; any Phase 8B.1 retry requires a separate fresh owner authorization.',
  });
  const result = run(root);
  expect(result.status).toBe(0);
});

test('COMPLETE report recording a historical failed CI passes', () => {
  const { root, sha } = fixture();
  setCompleteV2(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, reportBody: 'The first CI run failed; a later run succeeded. Final evidence above.\n' });
  const result = run(root);
  expect(result.status).toBe(0);
});

// ---------------------------------------------------------------------------
// Protocol v2 — active-task protocol enforcement
// ---------------------------------------------------------------------------

test('active task without protocol marker fails with ACTIVE_TASK_PROTOCOL_REQUIRED', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, omitProtocol: true });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('ACTIVE_TASK_PROTOCOL_REQUIRED');
});

test('unsupported protocol version fails', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, protocolVersion: 'nightwatch.agent-continuity.v3' });
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('UNSUPPORTED_PROTOCOL_VERSION');
});

test('ACTIVE/STATE protocol version mismatch fails', () => {
  const { root, sha } = fixture();
  writeProtocol(root, { baselineSha: sha, substantiveSha: sha, startingSha: sha, protocolVersion: 'nightwatch.agent-continuity.v2' });
  setField(root, '.agent/ACTIVE_TASK.md', 'CONTINUITY_PROTOCOL_VERSION', 'nightwatch.agent-continuity.v3');
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('PROTOCOL_VERSION_MISMATCH');
});

// ---------------------------------------------------------------------------
// Protocol v2 — history audit protection of closed tasks
// ---------------------------------------------------------------------------

test('closed v2 task corruption: phase status IN_PROGRESS fails audit', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-x', '8B.1.0', sha);
  setField(root, '.agent/tasks/phase-closed-x/STATE.md', 'PHASE_8B_1_0_STATUS', 'IN_PROGRESS');
  const result = runAudit(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('CURRENT_PHASE_STATUS_MISMATCH');
});

test('closed v2 task corruption: placeholder added fails audit', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-y', '8B.1.0', sha);
  fs.appendFileSync(path.join(root, '.agent/tasks/phase-closed-y/STATE.md'), '\nFinal CI: (filled after push)\n');
  const result = runAudit(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_UNRESOLVED_PLACEHOLDER');
});

test('closed v2 task corruption: plan milestone reopened fails audit', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-z', '8B.1.0', sha);
  const plan = path.join(root, '.agent/tasks/phase-closed-z/PLAN.md');
  fs.writeFileSync(plan, fs.readFileSync(plan, 'utf8').replace('- M1 — DONE', '- M1 — PENDING'));
  const result = runAudit(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_PLAN_MILESTONE_PENDING');
});

test('closed v2 task corruption: report status IN_PROGRESS fails audit', () => {
  const { root, sha } = fixture();
  writeClosedV2Task(root, 'phase-closed-w', '8B.1.0', sha);
  const report = path.join(root, '.agent/tasks/phase-closed-w/REPORT.md');
  fs.writeFileSync(report, fs.readFileSync(report, 'utf8').replace('Status: COMPLETE', 'Status: IN_PROGRESS'));
  const result = runAudit(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('COMPLETE_REPORT_STATUS_MISMATCH');
});

// ---------------------------------------------------------------------------
// Protocol v2 — pure helper unit tests
// ---------------------------------------------------------------------------

test('phase token derivation is deterministic for repository phase identifiers', () => {
  expect(derivePhaseStatusKey('1.3')).toBe('PHASE_1_3_STATUS');
  expect(derivePhaseStatusKey('2A')).toBe('PHASE_2A_STATUS');
  expect(derivePhaseStatusKey('7B.2.1')).toBe('PHASE_7B_2_1_STATUS');
  expect(derivePhaseStatusKey('8A.1.1')).toBe('PHASE_8A_1_1_STATUS');
  expect(derivePhaseStatusKey('8B.0.1')).toBe('PHASE_8B_0_1_STATUS');
  expect(derivePhaseStatusKey('8B.1.0.2 — Completed-Task Continuity Protocol')).toBe('PHASE_8B_1_0_2_STATUS');
});

test('status normalization handles parenthetical suffixes', () => {
  expect(normalizeTaskStatus('BLOCKED (BLOCKER_RESOLVED_RETRY_REQUIRES_NEW_OWNER_AUTHORIZATION)')).toBe('BLOCKED');
  expect(normalizeTaskStatus('COMPLETE (task closed)')).toBe('COMPLETE');
  expect(normalizeTaskStatus('IN_PROGRESS (this task)')).toBe('IN_PROGRESS');
  expect(normalizeTaskStatus('RUNNING')).toBeNull();
});

test('terminal matchers are explicit and narrow', () => {
  expect(isTerminalMilestoneText('COMPLETE / STOP')).toBe(true);
  expect(isTerminalMilestoneText('DONE / STOP')).toBe(true);
  expect(isTerminalMilestoneText('COMPLETE — all milestones closed')).toBe(true);
  expect(isTerminalMilestoneText('M17 — finalization pending')).toBe(false);
  expect(isTerminalMilestoneText('COMPLETE (pending M18 report)')).toBe(false);
  expect(isTerminalNextActionText('STOP')).toBe(true);
  expect(isTerminalNextActionText('NONE WITHIN CURRENT AUTHORIZATION')).toBe(true);
  expect(isTerminalNextActionText('STOP — task complete; Phase 8B.1 retry requires separate fresh owner authorization.')).toBe(true);
  expect(isTerminalNextActionText('run tests')).toBe(false);
  expect(isTerminalNextActionText('continue M12 → M18')).toBe(false);
  expect(isTerminalResumeRecipeText('Task complete. Do not resume.')).toBe(true);
  expect(isTerminalResumeRecipeText('Historical task COMPLETE; do NOT resume milestones M12–M18.')).toBe(true);
  expect(isTerminalResumeRecipeText('Continue from Exact Next Action (M12 → M18).')).toBe(false);
  expect(isTerminalResumeRecipeText('Resume M17 and finish remaining work.')).toBe(false);
});

test('placeholder sentinels are narrow', () => {
  expect(hasClosurePlaceholder('(filled at close)')).toBe(true);
  expect(hasClosurePlaceholder('(filled at closure)')).toBe(true);
  expect(hasClosurePlaceholder('(filled after push)')).toBe(true);
  expect(hasClosurePlaceholder('(filled after finalization push)')).toBe(true);
  expect(hasClosurePlaceholder('<FINAL_SHA>')).toBe(true);
  expect(hasClosurePlaceholder('<CI_RUN>')).toBe(true);
  expect(hasClosurePlaceholder('TBD')).toBe(true);
  expect(hasClosurePlaceholder('FILL_AT_CLOSE')).toBe(true);
  expect(hasClosurePlaceholder('UNKNOWN_AT_CLOSE')).toBe(true);
  expect(hasClosurePlaceholder('DISCOVER_FROM_GIT')).toBe(false);
  expect(hasClosurePlaceholder('GITHUB_ACTIONS_FOR_LIVE_HEAD')).toBe(false);
  expect(hasClosurePlaceholder('the placeholder rule forbids sentinels')).toBe(false);
  expect(hasClosurePlaceholder('the run was pending until CI completed')).toBe(false);
});
