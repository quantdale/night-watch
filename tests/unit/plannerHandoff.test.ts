// ---------------------------------------------------------------------------
// Planner -> executor handoff protocol matrix.
//
// These fixtures are deliberately disposable Git repositories. They exercise
// the real pure parser, route checker, and agent-state subprocess without
// reading a product repository or contacting any external service.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  HANDOFF_PROTOCOL_VERSION,
  parseHandoffHeader,
  uniqueErrorCodes,
  validateHandoffHeader,
  validateHandoffState,
} from '../../bin/planner-handoff-protocol.mjs';

const ROOT = path.resolve(__dirname, '../..');
const CHECKER = path.join(ROOT, 'bin', 'planner-handoff-check.mjs');
const PREDECESSOR_ID = 'nightwatch-synthetic-predecessor';
const CAMPAIGN_ID = 'nightwatch-synthetic-handoff-campaign';
const SHA = 'a'.repeat(40);

type HandoffStatus = 'READY_FOR_EXECUTION' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE';

const gitAvailable = (() => {
  const result = spawnSync('git', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
})();

test.skip(!gitAvailable, 'git CLI is unavailable; handoff checker tests skipped');

function gitEnvironment(root: string): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Nightwatch Synthetic',
    GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
    GIT_COMMITTER_NAME: 'Nightwatch Synthetic',
    GIT_COMMITTER_EMAIL: 'synthetic@example.invalid',
    GIT_OPTIONAL_LOCKS: '0',
  };
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd: root,
    env: gitEnvironment(root),
    shell: false,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) throw new Error(`SYNTHETIC_GIT_FAILED:${args.join('_')}`);
  return (result.stdout ?? '').trim();
}

function writeFile(root: string, relativePath: string, text: string): void {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, text, 'utf8');
}

function replaceFile(root: string, relativePath: string, replacement: (text: string) => string): void {
  const absolute = path.join(root, relativePath);
  fs.writeFileSync(absolute, replacement(fs.readFileSync(absolute, 'utf8')), 'utf8');
}

function handoffHeader(overrides: Partial<{
  version: string;
  status: HandoffStatus | string;
  campaignId: string;
  openSpec: string;
  plannedFrom: string;
  targetBranch: string;
  predecessorId: string;
  predecessorStatus: string;
}> = {}): string {
  return [
    '# Synthetic execution handoff',
    '',
    `HANDOFF_PROTOCOL_VERSION: ${overrides.version ?? HANDOFF_PROTOCOL_VERSION}`,
    `Status: ${overrides.status ?? 'IN_PROGRESS'}`,
    `Campaign ID: ${overrides.campaignId ?? CAMPAIGN_ID}`,
    `OpenSpec: ${overrides.openSpec ?? `openspec/changes/${overrides.campaignId ?? CAMPAIGN_ID}/`}`,
    `Planned-From: ${overrides.plannedFrom ?? SHA}`,
    `Target Branch: ${overrides.targetBranch ?? 'main'}`,
    `Predecessor Task ID: ${overrides.predecessorId ?? PREDECESSOR_ID}`,
    `Predecessor Status: ${overrides.predecessorStatus ?? 'COMPLETE'}`,
    '',
    '## Opaque body',
    'Prose here is not an authority input.',
    '',
  ].join('\n');
}

function taskRecords(taskId: string, status: HandoffStatus, startingSha: string, implementationSha: string): {
  readonly active: string;
  readonly plan: string;
  readonly state: string;
  readonly report: string;
} {
  const phaseStatus = `PHASE_TEST_STATUS: ${status}`;
  const terminal = status === 'COMPLETE';
  const blocked = status === 'BLOCKED';
  const activeMilestone = terminal ? 'COMPLETE / STOP' : `M1 — ${status}`;
  const activeNextAction = terminal ? 'STOP' : blocked ? 'wait for synthetic unblock condition' : 'run synthetic handoff test';
  const stateMilestone = terminal ? 'COMPLETE / STOP.' : `M1 — ${status}`;
  const stateWip = terminal ? 'NONE.' : blocked ? 'waiting for synthetic unblock' : 'synthetic handoff work';
  const stateNextAction = terminal ? 'STOP — task complete.' : blocked ? 'wait for synthetic unblock condition' : 'run synthetic handoff test';
  const stateBlockers = terminal || !blocked ? 'None.' : 'Synthetic blocker: waiting for a bounded fixture condition.';
  const stateResume = terminal ? 'Task complete. Do not resume.' : 'Resume after the synthetic fixture condition changes.';
  const stateSnapshot = terminal ? 'Task complete. PASS.' : blocked ? 'Blocked.' : 'In progress.';
  const planMilestone = terminal ? '- M1 — DONE' : `- M1 — ${status}`;

  const active = `# Active Task

Task ID: ${taskId}
Phase: TEST
Title: Synthetic handoff task
Status: ${status}
PROJECT_VERDICT_EFFECT: PRESERVE
Task directory: .agent/tasks/${taskId}
Starting SHA: ${startingSha}
Last validated implementation SHA: ${implementationSha}
Current milestone: ${activeMilestone}
Last checkpoint: synthetic
Next action: ${activeNextAction}
Authorization class: SYNTHETIC_HANDOFF_TEST
${phaseStatus}
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

## Routing and safety

\`\`\`
CAMPAIGN: ${taskId}
SESSION WORKTREE: main
\`\`\`
`;
  const plan = `# Synthetic plan

## Purpose
synthetic
## Starting State
synthetic
## Scope
synthetic
## Non-Goals
synthetic
## Safety Constraints
synthetic
## Architecture / Approach
synthetic
## Milestones
${planMilestone}
## Validation Strategy
synthetic
## Decision Log
synthetic
## Discoveries
synthetic
## Deferred Work
synthetic
## Completion Criteria
synthetic
`;
  const state = `# Task State

## Identity

Task ID: ${taskId}
Phase: TEST
Status: ${status}
PROJECT_VERDICT_EFFECT: PRESERVE
Starting SHA: ${startingSha}
Last validated implementation SHA: ${implementationSha}
Last substantive checkpoint SHA: ${implementationSha}
STARTING_SHA: ${startingSha}
LAST_VALIDATED_IMPLEMENTATION_SHA: ${implementationSha}
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${implementationSha}
LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
${phaseStatus}
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
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
synthetic
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
`;
  const report = `# Synthetic report
Status: ${status}
`;
  return { active, plan, state, report };
}

interface FixtureOptions {
  readonly status?: HandoffStatus;
  readonly activeTaskId?: string;
  readonly activeTaskStatus?: HandoffStatus;
  readonly promptCampaignId?: string;
  readonly routeCampaignId?: string;
  readonly openSpec?: string;
  readonly plannedFrom?: string;
  readonly targetBranch?: string;
}

interface Fixture {
  readonly root: string;
  readonly baseSha: string;
  readonly implementationSha: string;
  readonly unrelatedSha: string;
  readonly headSha: string;
  cleanup(): void;
}

function makeFixture(options: FixtureOptions = {}): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-handoff-'));
  git(root, ['init', '--quiet', '-b', 'main']);
  writeFile(root, 'seed.txt', 'synthetic seed\n');
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic base']);
  const baseSha = git(root, ['rev-parse', 'HEAD']);

  git(root, ['switch', '--quiet', '-c', 'unrelated']);
  writeFile(root, 'unrelated.txt', 'synthetic unrelated branch\n');
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic unrelated']);
  const unrelatedSha = git(root, ['rev-parse', 'HEAD']);
  git(root, ['switch', '--quiet', 'main']);

  for (const relativePath of [
    'bin/agent-state.mjs',
    'bin/agent-continuity-protocol.mjs',
    'bin/child-environment.mjs',
    'bin/planner-handoff-protocol.mjs',
    'bin/planner-handoff-check.mjs',
    'bin/workspace-integrity.mjs',
    'bin/lib/programme-state.mjs',
    'bin/lib/openspec-ledger.mjs',
    'bin/lib/operator-cli.mjs',
    'bin/lib/validation-lane-state.mjs',
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, relativePath), path.join(root, relativePath));
  }
  writeFile(root, 'bin/synthetic-implementation.mjs', 'export const syntheticImplementation = true;\n');
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic implementation']);
  const implementationSha = git(root, ['rev-parse', 'HEAD']);

  const status = options.status ?? 'IN_PROGRESS';
  const promptCampaignId = options.promptCampaignId ?? CAMPAIGN_ID;
  const routeCampaignId = options.routeCampaignId ?? promptCampaignId;
  const activeTaskId = options.activeTaskId ?? (status === 'READY_FOR_EXECUTION' ? PREDECESSOR_ID : promptCampaignId);
  const activeTaskStatus = options.activeTaskStatus ?? (status === 'READY_FOR_EXECUTION' ? 'COMPLETE' : status);
  const route = `openspec/changes/${routeCampaignId}`;
  for (const file of ['audit.md', 'proposal.md', 'design.md', 'tasks.md']) {
    writeFile(root, `${route}/${file}`, `# Synthetic ${file}\n`);
  }
  writeFile(root, `${route}/specs/campaign-handoff/spec.md`, '# Synthetic handoff specification\n');
  writeFile(root, 'AGENTS.md', '# Synthetic agent contract\n');
  writeFile(root, '.agent/EXECUTION_PROMPT.md', handoffHeader({
    status,
    campaignId: promptCampaignId,
    openSpec: options.openSpec ?? `${route}/`,
    plannedFrom: options.plannedFrom ?? baseSha,
    targetBranch: options.targetBranch,
  }));
  const records = taskRecords(activeTaskId, activeTaskStatus, baseSha, implementationSha);
  writeFile(root, '.agent/ACTIVE_TASK.md', records.active);
  for (const [file, text] of Object.entries(records)) writeFile(root, `.agent/tasks/${activeTaskId}/${file === 'active' ? 'ACTIVE.md' : `${file.toUpperCase()}.md`}`, text);
  // The task directory owns SPEC/PLAN/STATE/REPORT; ACTIVE.md above is not
  // part of that protocol and is removed before the fixture is committed.
  fs.rmSync(path.join(root, `.agent/tasks/${activeTaskId}/ACTIVE.md`));
  writeFile(root, `.agent/tasks/${activeTaskId}/SPEC.md`, '# Synthetic task specification\n');
  writeFile(root, `.agent/tasks/${activeTaskId}/PLAN.md`, records.plan);
  writeFile(root, `.agent/tasks/${activeTaskId}/STATE.md`, records.state);
  writeFile(root, `.agent/tasks/${activeTaskId}/REPORT.md`, records.report);
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic handoff checkpoint']);
  const headSha = git(root, ['rev-parse', 'HEAD']);
  return {
    root,
    baseSha,
    implementationSha,
    unrelatedSha,
    headSha,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

function runChecker(root: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [CHECKER, '--root', root], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function checkerText(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
}

test.describe('planner -> executor handoff protocol', () => {
  test('pure parser accepts the four state bindings and rejects prose fallback', () => {
    const ready = parseHandoffHeader(handoffHeader({ status: 'READY_FOR_EXECUTION', plannedFrom: SHA }));
    expect(validateHandoffState(ready, {
      activeTaskId: PREDECESSOR_ID,
      activeTaskStatus: 'COMPLETE',
      continuityOk: true,
    }).ok).toBe(true);

    for (const status of ['IN_PROGRESS', 'BLOCKED', 'COMPLETE'] as const) {
      const parsed = parseHandoffHeader(handoffHeader({ status, plannedFrom: SHA }));
      expect(validateHandoffState(parsed, {
        activeTaskId: CAMPAIGN_ID,
        activeTaskStatus: status,
        continuityOk: true,
      }).ok).toBe(true);
    }

    const blockedPredecessor = parseHandoffHeader(handoffHeader({ predecessorStatus: 'BLOCKED' }));
    expect(validateHandoffState(blockedPredecessor, {
      activeTaskId: CAMPAIGN_ID,
      activeTaskStatus: 'IN_PROGRESS',
      continuityOk: true,
    }).ok).toBe(true);

    const proseOnly = parseHandoffHeader('# Synthetic prompt\n\nThe Status is IN_PROGRESS.\n');
    expect(proseOnly.ok).toBe(false);
    expect(uniqueErrorCodes(proseOnly.errors)).toContain('HANDOFF_REQUIRED_FIELD_MISSING');
  });

  test('pure parser is strict about unknown, duplicate, malformed, unsafe, and oversized metadata', () => {
    const unknown = parseHandoffHeader(handoffHeader().replace('Status: IN_PROGRESS\n', 'Status: IN_PROGRESS\nUnknown Field: safe\n'));
    expect(uniqueErrorCodes(unknown.errors)).toContain('HANDOFF_HEADER_UNKNOWN_FIELD');

    const duplicate = parseHandoffHeader(handoffHeader().replace('Status: IN_PROGRESS\n', 'Status: IN_PROGRESS\nStatus: COMPLETE\n'));
    expect(uniqueErrorCodes(duplicate.errors)).toContain('HANDOFF_DUPLICATE_FIELD');

    const malformed = parseHandoffHeader(handoffHeader().replace('Status: IN_PROGRESS\n', 'not a metadata record\n'));
    expect(uniqueErrorCodes(malformed.errors)).toContain('HANDOFF_HEADER_MALFORMED');

    const unsafe = parseHandoffHeader(handoffHeader({ plannedFrom: 'Bearer syntheticFakeToken' }));
    expect(uniqueErrorCodes(unsafe.errors)).toContain('HANDOFF_METADATA_UNSAFE');
    expect(JSON.stringify(unsafe.errors)).not.toContain('syntheticFakeToken');

    const oversized = parseHandoffHeader(handoffHeader({ campaignId: 'a'.repeat(513) }));
    expect(uniqueErrorCodes(oversized.errors)).toContain('HANDOFF_METADATA_OVERSIZED');
  });

  test('valid READY, IN_PROGRESS, BLOCKED, and COMPLETE routes pass the real checker', () => {
    for (const status of ['READY_FOR_EXECUTION', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE'] as const) {
      const fixture = makeFixture({ status });
      try {
        const result = runChecker(fixture.root);
        expect(result.status, checkerText(result)).toBe(0);
        const receipt = JSON.parse(String(result.stdout));
        expect(receipt.status).toBe('PASS');
        expect(receipt.handoffStatus).toBe(status);
        expect(receipt.schemaVersion).toBe('nightwatch.planner-handoff-receipt.v1');
        expect(receipt.liveHead).toBe(fixture.headSha);
        expect(receipt.openSpecFiles).toHaveLength(5);
      } finally {
        fixture.cleanup();
      }
    }
  });

  test('READY is valid as a documentation-only planning descendant and output is deterministic x3', () => {
    const fixture = makeFixture({ status: 'READY_FOR_EXECUTION' });
    try {
      const outputs = [0, 1, 2].map(() => {
        const result = runChecker(fixture.root);
        expect(result.status).toBe(0);
        return String(result.stdout);
      });
      expect(outputs[1]).toBe(outputs[0]);
      expect(outputs[2]).toBe(outputs[0]);
      expect(outputs[0]).not.toContain('Synthetic handoff task');
    } finally {
      fixture.cleanup();
    }
  });

  test('planned -> active -> substantive -> docs closure -> complete preserves SHA roles', () => {
    const fixture = makeFixture({ status: 'READY_FOR_EXECUTION' });
    try {
      expect(runChecker(fixture.root).status).toBe(0);

      const activeRecords = taskRecords(CAMPAIGN_ID, 'IN_PROGRESS', fixture.baseSha, fixture.implementationSha);
      writeFile(fixture.root, '.agent/EXECUTION_PROMPT.md', handoffHeader({
        status: 'IN_PROGRESS',
        plannedFrom: fixture.baseSha,
      }));
      writeFile(fixture.root, '.agent/ACTIVE_TASK.md', activeRecords.active);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/SPEC.md`, '# Synthetic task specification\n');
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/PLAN.md`, activeRecords.plan);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/STATE.md`, activeRecords.state);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/REPORT.md`, activeRecords.report);
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'activate synthetic campaign']);
      expect(runChecker(fixture.root).status).toBe(0);

      fs.appendFileSync(path.join(fixture.root, 'bin/synthetic-implementation.mjs'), 'export const substantive = true;\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic substantive implementation']);
      const substantiveSha = git(fixture.root, ['rev-parse', 'HEAD']);
      replaceFile(fixture.root, '.agent/ACTIVE_TASK.md', (text) => text.replaceAll(fixture.implementationSha, substantiveSha));
      replaceFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/STATE.md`, (text) => text.replaceAll(fixture.implementationSha, substantiveSha));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'record substantive baseline']);
      expect(runChecker(fixture.root).status).toBe(0);

      const completeRecords = taskRecords(CAMPAIGN_ID, 'COMPLETE', fixture.baseSha, substantiveSha);
      writeFile(fixture.root, '.agent/EXECUTION_PROMPT.md', handoffHeader({
        status: 'COMPLETE',
        plannedFrom: fixture.baseSha,
      }));
      writeFile(fixture.root, '.agent/ACTIVE_TASK.md', completeRecords.active);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/PLAN.md`, completeRecords.plan);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/STATE.md`, completeRecords.state);
      writeFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/REPORT.md`, completeRecords.report);
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'close synthetic campaign']);
      const documentationSha = git(fixture.root, ['rev-parse', 'HEAD']);
      replaceFile(fixture.root, `.agent/tasks/${CAMPAIGN_ID}/STATE.md`, (text) => text.replace(
        `LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${substantiveSha}\n`,
        `LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${substantiveSha}\nLast documentation checkpoint SHA: ${documentationSha}\nLAST_DOCUMENTATION_CHECKPOINT_SHA: ${documentationSha}\n`,
      ));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'record documentation closure']);
      expect(runChecker(fixture.root).status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('stale unrelated terminal prompt is rejected', () => {
    const fixture = makeFixture({
      status: 'COMPLETE',
      activeTaskId: CAMPAIGN_ID,
      promptCampaignId: 'nightwatch-synthetic-unrelated-campaign',
    });
    try {
      const result = runChecker(fixture.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_ACTIVE_TASK_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('wrong, traversing, or missing OpenSpec routes fail without replacement search', () => {
    const wrong = makeFixture({ openSpec: 'openspec/changes/other-campaign/' });
    try {
      const result = runChecker(wrong.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_OPENSPEC_ROUTE_INVALID');
    } finally {
      wrong.cleanup();
    }

    const traversal = makeFixture({ openSpec: '../other-campaign/' });
    try {
      const result = runChecker(traversal.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_OPENSPEC_ROUTE_INVALID');
    } finally {
      traversal.cleanup();
    }

    const missing = makeFixture();
    try {
      fs.rmSync(path.join(missing.root, `openspec/changes/${CAMPAIGN_ID}/design.md`));
      const result = runChecker(missing.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_OPENSPEC_FILE_MISSING');
    } finally {
      missing.cleanup();
    }
  });

  test('untracked and symlink OpenSpec components fail closed', () => {
    const untracked = makeFixture();
    try {
      const routeFile = `openspec/changes/${CAMPAIGN_ID}/audit.md`;
      git(untracked.root, ['rm', '--cached', '--quiet', '--', routeFile]);
      const result = runChecker(untracked.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_OPENSPEC_FILE_UNTRACKED');
    } finally {
      untracked.cleanup();
    }

    const symlink = makeFixture();
    try {
      const audit = path.join(symlink.root, `openspec/changes/${CAMPAIGN_ID}/audit.md`);
      fs.rmSync(audit);
      fs.symlinkSync('design.md', audit);
      const result = runChecker(symlink.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_OPENSPEC_NONCANONICAL_FILE');
    } finally {
      symlink.cleanup();
    }

    const symlinkParent = makeFixture();
    try {
      const openspec = path.join(symlinkParent.root, 'openspec');
      fs.renameSync(openspec, path.join(symlinkParent.root, 'openspec-real'));
      fs.symlinkSync('openspec-real', openspec);
      const result = runChecker(symlinkParent.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_NONCANONICAL_FILE');
    } finally {
      symlinkParent.cleanup();
    }
  });

  test('planned-from and branch binding reject missing, non-ancestor, and wrong-branch routes', () => {
    const missing = makeFixture({ plannedFrom: 'b'.repeat(40) });
    try {
      const result = runChecker(missing.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_PLANNED_FROM_NOT_FOUND');
    } finally {
      missing.cleanup();
    }

    const unrelated = makeFixture();
    try {
      replaceFile(unrelated.root, '.agent/EXECUTION_PROMPT.md', (text) => text.replace(unrelated.baseSha, unrelated.unrelatedSha));
      const result = runChecker(unrelated.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_PLANNED_FROM_NOT_ANCESTOR');
    } finally {
      unrelated.cleanup();
    }

    const wrongBranch = makeFixture();
    try {
      git(wrongBranch.root, ['branch', '-m', 'not-main']);
      const result = runChecker(wrongBranch.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_TARGET_BRANCH_MISMATCH');
    } finally {
      wrongBranch.cleanup();
    }
  });

  test('prompt/task status and identity mismatches are rejected', () => {
    const statusMismatch = makeFixture({ status: 'IN_PROGRESS', activeTaskStatus: 'COMPLETE' });
    try {
      const result = runChecker(statusMismatch.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_STATUS_MISMATCH');
    } finally {
      statusMismatch.cleanup();
    }

    const completeMismatch = makeFixture({ status: 'COMPLETE', activeTaskStatus: 'IN_PROGRESS' });
    try {
      const result = runChecker(completeMismatch.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_STATUS_MISMATCH');
    } finally {
      completeMismatch.cleanup();
    }

    const readyMismatch = makeFixture({ status: 'READY_FOR_EXECUTION', activeTaskId: CAMPAIGN_ID, activeTaskStatus: 'COMPLETE' });
    try {
      const result = runChecker(readyMismatch.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_PREDECESSOR_TASK_MISMATCH');
    } finally {
      readyMismatch.cleanup();
    }
  });

  test('source drift after the implementation baseline and a docs-only implementation claim fail', () => {
    const drift = makeFixture({ status: 'COMPLETE' });
    try {
      fs.appendFileSync(path.join(drift.root, 'bin/synthetic-implementation.mjs'), 'export const drift = true;\n');
      const result = runChecker(drift.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_ACTIVE_CONTINUITY_FAILED');
    } finally {
      drift.cleanup();
    }

    const docsClaim = makeFixture({ status: 'COMPLETE' });
    try {
      replaceFile(docsClaim.root, '.agent/ACTIVE_TASK.md', (text) => text.replace(docsClaim.implementationSha, docsClaim.headSha));
      replaceFile(docsClaim.root, `.agent/tasks/${CAMPAIGN_ID}/STATE.md`, (text) => text
        .replaceAll(docsClaim.implementationSha, docsClaim.headSha));
      const agent = spawnSync(process.execPath, [path.join(docsClaim.root, 'bin/agent-state.mjs'), '--root', docsClaim.root], {
        cwd: docsClaim.root,
        encoding: 'utf8',
        shell: false,
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      expect(`${agent.stdout ?? ''}\n${agent.stderr ?? ''}`).toContain('INVALID_IMPLEMENTATION_ROLE');
      const result = runChecker(docsClaim.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_ACTIVE_CONTINUITY_FAILED');
    } finally {
      docsClaim.cleanup();
    }
  });

  test('oversized prompt output is bounded and never echoes metadata', () => {
    const fixture = makeFixture();
    try {
      fs.appendFileSync(path.join(fixture.root, '.agent/EXECUTION_PROMPT.md'), `${'x'.repeat(300_000)}\n`);
      const result = runChecker(fixture.root);
      expect(result.status).not.toBe(0);
      expect(checkerText(result)).toContain('HANDOFF_METADATA_OVERSIZED');
      expect(checkerText(result).length).toBeLessThan(2_048);
      expect(checkerText(result)).not.toContain('x'.repeat(128));
    } finally {
      fixture.cleanup();
    }
  });
});
