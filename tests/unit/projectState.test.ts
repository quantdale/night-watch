// ---------------------------------------------------------------------------
// Phase 8B.1-R1.1 / campaign handoff hardening — project-state truth checker matrix.
//
// Proves bin/project-state-check.mjs (nightwatch.project-state.v2) enforces
// the project-memory authority model: structured block facts must agree with
// mechanically derivable source (real validator/renderer/portfolio selector),
// live authority stays with Git + ACTIVE_TASK continuity v2, no competing
// generic live anchors, explicit promotion lifecycle/effective authority, and historical prose can
// never leak into machine-checked truth (no prose parsing).
//
// Fixtures are committed temporary source repositories built through the REAL
// renderer (never the live checkout's bytes), mirroring the established
// selfDevSourceFixture pattern. The checker runs with --root so tests stay
// fully isolated from the live checkout.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  SELFDEV_AUTHORITATIVE_PATHS,
  deriveAdoptedCase,
  renderAdoptedCatalogSource,
} from '../../src/core/selfDev';

const CHECKER = path.join(__dirname, '..', '..', 'bin', 'project-state-check.mjs');
const R1_TASK_ID = 'phase-8b-1-r1-owner-gated-canonical-promotion-retry';
const ACTIVE_TASK_ID = 'phase-test';

const gitAvailable = (() => {
  const result = spawnSync('git', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
})();

test.skip(!gitAvailable, 'git CLI is unavailable; project-state checker tests skipped');

function gitEnv(root: string): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Nightwatch Synthetic',
    GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
    GIT_COMMITTER_NAME: 'Nightwatch Synthetic',
    GIT_COMMITTER_EMAIL: 'synthetic@example.invalid',
    GIT_OPTIONAL_LOCKS: '0',
  };
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], {
    cwd: root,
    env: gitEnv(root),
    shell: false,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) throw new Error(`GIT_TEST_FAILED:${args.join('_')}:${result.stderr ?? ''}`);
  return (result.stdout ?? '').trim();
}

function digestOf(text: string): string {
  return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

function replaceFile(root: string, relativePath: string, replacement: (text: string) => string): void {
  const absolute = path.join(root, relativePath);
  fs.writeFileSync(absolute, replacement(fs.readFileSync(absolute, 'utf8')), 'utf8');
}

const ONE_ENTRY = [deriveAdoptedCase(
  'selfdev.fixture.local-regression.v1',
  ['selfdev.synthetic.expand-summary'],
  ['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion', 'selfdev.assert.oracle.structural-stable'],
)];

function renderCatalog(state: 'EMPTY' | 'ONE'): string {
  return state === 'EMPTY' ? renderAdoptedCatalogSource([]) : renderAdoptedCatalogSource(ONE_ENTRY);
}

/** Required headings for a v2 task record (mirrors bin/agent-state.mjs). */
const PLAN_HEADINGS = [
  '## Purpose', '## Starting State', '## Scope', '## Non-Goals', '## Safety Constraints',
  '## Architecture / Approach', '## Milestones', '## Validation Strategy', '## Decision Log',
  '## Discoveries', '## Deferred Work', '## Completion Criteria',
];
const STATE_HEADINGS = [
  '## Identity', '## Objective', '## Current Milestone', '## Completed Milestones',
  '## Work In Progress', '## Exact Next Action', '## Files Changed', '## Validation Ledger',
  '## Decisions Made During This Task', '## Discoveries', '## Blockers', '## Safety Events',
  '## Deferred / Follow-Up', '## Resume Recipe', '## Completion Snapshot',
];

interface ClosedTaskRecords {
  readonly active: string;
  readonly plan: string;
  readonly state: string;
  readonly report: string;
}

function validClosedTask(taskId: string, phase: string, sha: string): ClosedTaskRecords {
  const phaseKey = `PHASE_${phase.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_STATUS`;
  const active = `# Active Task

Task ID: ${taskId}
Phase: ${phase}
Title: Synthetic fixture task
Status: COMPLETE
Task directory: .agent/tasks/${taskId}
Starting SHA: ${sha}
Last validated implementation SHA: ${sha}
Current milestone: COMPLETE / STOP
Last checkpoint: synthetic
Next action: STOP
PROJECT_VERDICT_EFFECT: PRESERVE
${phaseKey}: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
`;
  const plan = `# Synthetic plan

${PLAN_HEADINGS.map((heading) => `${heading}\n`).join('')}
## Milestones
- M1 — DONE
`;
  const state = `# Task State

## Identity

Task ID: ${taskId}
Phase: ${phase}
Status: COMPLETE
Starting SHA: ${sha}
Last validated implementation SHA: ${sha}
Last substantive checkpoint SHA: ${sha}
STARTING_SHA: ${sha}
LAST_VALIDATED_IMPLEMENTATION_SHA: ${sha}
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${sha}
LIVE_HEAD_AUTHORITY: GIT
CURRENT_LOCAL_HEAD: DISCOVER_FROM_GIT
CURRENT_REMOTE_HEAD: DISCOVER_FROM_GIT
LAST_PUSHED_SHA: DEPRECATED_HISTORICAL_ONLY
PROJECT_VERDICT_EFFECT: PRESERVE
${phaseKey}: COMPLETE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Branch: main
Last checkpoint: synthetic

## Objective
synthetic
## Current Milestone
COMPLETE / STOP.
## Completed Milestones
synthetic
## Work In Progress
NONE.
## Exact Next Action
STOP — task complete.
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
Task complete. Do not resume.
## Completion Snapshot
Task complete. PASS.
`;
  const report = `# Synthetic report
Status: COMPLETE
`;
  return { active, plan, state, report };
}

function validInProgressTask(taskId: string, phase: string, sha: string): ClosedTaskRecords {
  const phaseKey = `PHASE_${phase.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_STATUS`;
  const complete = validClosedTask(taskId, phase, sha);
  return {
    active: complete.active
      .replace('Status: COMPLETE', 'Status: IN_PROGRESS')
      .replace('Current milestone: COMPLETE / STOP', 'Current milestone: M1 — operational acceptance pending')
      .replace('Next action: STOP', 'Next action: Continue the operational-acceptance mapping')
      .replace(`${phaseKey}: COMPLETE`, `${phaseKey}: IN_PROGRESS`),
    plan: complete.plan.replace('- M1 — DONE', '- M1 — IN_PROGRESS'),
    state: complete.state
      .replace('Status: COMPLETE', 'Status: IN_PROGRESS')
      .replace(`${phaseKey}: COMPLETE`, `${phaseKey}: IN_PROGRESS`)
      .replace('COMPLETE / STOP.', 'M1 — operational acceptance pending.')
      .replace('NONE.', 'Validator extension in progress.')
      .replace('STOP — task complete.', 'Continue the operational-acceptance mapping.')
      .replace('Task complete. Do not resume.', 'Resume from the current operational-acceptance milestone.')
      .replace('Task complete. PASS.', 'Not complete. Operational acceptance pending.'),
    report: complete.report.replace('Status: COMPLETE', 'Status: IN_PROGRESS'),
  };
}

function validBlockedTask(taskId: string, phase: string, sha: string): ClosedTaskRecords {
  const phaseKey = `PHASE_${phase.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_STATUS`;
  const complete = validClosedTask(taskId, phase, sha);
  return {
    active: complete.active
      .replace('Status: COMPLETE', 'Status: BLOCKED')
      .replace('Current milestone: COMPLETE / STOP', 'Current milestone: M1 — BLOCKED')
      .replace('Next action: STOP', 'Next action: STOP — unblock prerequisite before retry')
      .replace(`${phaseKey}: COMPLETE`, `${phaseKey}: BLOCKED`),
    plan: complete.plan.replace('- M1 — DONE', '- M1 — BLOCKED'),
    state: complete.state
      .replace('Status: COMPLETE', 'Status: BLOCKED')
      .replace(`${phaseKey}: COMPLETE`, `${phaseKey}: BLOCKED`)
      .replace('COMPLETE / STOP.', 'M1 — BLOCKED.')
      .replace('STOP — task complete.', 'STOP — unblock prerequisite before retry.')
      .replace('None.\n## Safety Events', '**BLOCKED**: synthetic unblock prerequisite.\n## Safety Events')
      .replace('Task complete. Do not resume.', 'Task blocked; do not resume.')
      .replace('Task complete. PASS.', 'Task blocked; no completion claim.'),
    report: complete.report.replace('Status: COMPLETE', 'Status: BLOCKED'),
  };
}

/** Legacy v1 R1 task record — minimal, warnings-only for agent:check. */
const LEGACY_R1_STATE = `# Task State

## Identity

Task ID: ${R1_TASK_ID}
Phase: 8B.1-R1
Status: COMPLETE
Starting SHA: 24fc437f8171a8cb6466423e069380d430bdac11
Last validated implementation SHA: 24fc437f8171a8cb6466423e069380d430bdac11
Branch: main
Last checkpoint: synthetic

## Objective
synthetic
## Current Milestone
COMPLETE / STOP.
## Completed Milestones
synthetic
## Work In Progress
NONE.
## Exact Next Action
STOP — task complete.
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
Task complete. Do not resume.
## Completion Snapshot
Task complete. PASS.
`;

interface BlockOptions {
  readonly version?: string;
  readonly liveHeadAuthority?: string;
  readonly currentTaskAuthority?: string;
  readonly validatedImplementationAuthority?: string;
  readonly catalogTarget?: string;
  readonly catalogCount?: string;
  readonly catalogDigest?: string;
  readonly catalogStrategy?: string;
  readonly phase8Status?: string;
  readonly phase8B1Status?: string;
  readonly nextPortfolioMember?: string;
  readonly promotionAuthorizationLifecycle?: string;
  readonly effectiveNextPromotionAuthority?: string;
  readonly projectCompletionStatus?: string;
  readonly releaseCheckpointSha?: string;
  readonly liveHeadSha?: string;
  readonly lastSubstantiveImplementationSha?: string;
  readonly lastLocallyValidatedSha?: string;
  readonly lastCleanValidatedSha?: string;
  readonly ciObservedSha?: string;
  readonly ciExecutedSha?: string;
  readonly ciStatus?: string;
  readonly finalDocumentationSha?: string;
  readonly finalCiAuthority?: string;
  readonly liveTaskId?: string;
  readonly livePhase?: string;
  readonly liveTaskStatus?: string;
  readonly liveProjectCompletionStatus?: string;
  readonly liveVerdictEffect?: string;
  readonly liveNextActionState?: string;
  readonly liveCompletionClaim?: string;
  readonly extraFields?: readonly string[];
}

function renderBlock(catalogState: 'EMPTY' | 'ONE', options: BlockOptions = {}): string {
  const catalogSource = renderCatalog(catalogState);
  const count = catalogState === 'EMPTY' ? '0' : '1';
  const lines = [
    `PROJECT_STATE_PROTOCOL_VERSION: ${options.version ?? 'nightwatch.project-state.v2'}`,
    'RELEASE_CERTIFICATION_PROTOCOL_VERSION: nightwatch.release-certification.v1',
    `PROJECT_COMPLETION_STATUS: ${options.projectCompletionStatus ?? 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED'}`,
    `RELEASE_CHECKPOINT_SHA: ${options.releaseCheckpointSha ?? 'DISCOVER_FROM_GIT'}`,
    `LIVE_HEAD_SHA: ${options.liveHeadSha ?? 'DISCOVER_FROM_GIT'}`,
    `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: ${options.lastSubstantiveImplementationSha ?? 'DISCOVER_FROM_GIT'}`,
    `LAST_LOCALLY_VALIDATED_SHA: ${options.lastLocallyValidatedSha ?? 'DISCOVER_FROM_GIT'}`,
    `LAST_CLEAN_VALIDATED_SHA: ${options.lastCleanValidatedSha ?? 'DISCOVER_FROM_GIT'}`,
    `CI_OBSERVED_SHA: ${options.ciObservedSha ?? 'NONE'}`,
    `CI_EXECUTED_SHA: ${options.ciExecutedSha ?? 'NONE'}`,
    `CI_STATUS: ${options.ciStatus ?? 'NOT_OBSERVED'}`,
    `FINAL_DOCUMENTATION_SHA: ${options.finalDocumentationSha ?? 'DISCOVER_FROM_GIT'}`,
    `FINAL_CI_AUTHORITY: ${options.finalCiAuthority ?? 'GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT'}`,
    `LIVE_HEAD_AUTHORITY: ${options.liveHeadAuthority ?? 'GIT'}`,
    `CURRENT_TASK_AUTHORITY: ${options.currentTaskAuthority ?? '.agent/ACTIVE_TASK.md'}`,
    `VALIDATED_IMPLEMENTATION_AUTHORITY: ${options.validatedImplementationAuthority ?? '.agent/ACTIVE_TASK.md'}`,
    `CANONICAL_CATALOG_TARGET: ${options.catalogTarget ?? 'src/core/selfDev/adoptedCaseCatalog.generated.ts'}`,
    `CANONICAL_CATALOG_ENTRY_COUNT: ${options.catalogCount ?? count}`,
    `CANONICAL_CATALOG_SHA256: ${options.catalogDigest ?? digestOf(catalogSource)}`,
    'CANONICAL_CATALOG_STRATEGY: DECLARATIVE_REGRESSION_CATALOG_PROMOTION',
    `PHASE_8_STATUS: ${options.phase8Status ?? 'COMPLETE'}`,
    `PHASE_8B_1_STATUS: ${options.phase8B1Status ?? 'COMPLETE_VIA_SUCCESSFUL_RETRY_R1'}`,
    `NEXT_PORTFOLIO_MEMBER: ${options.nextPortfolioMember ?? 'AVAILABLE_NOT_ADOPTED'}`,
    `PROMOTION_AUTHORIZATION_LIFECYCLE: ${options.promotionAuthorizationLifecycle ?? 'SPENT'}`,
    `EFFECTIVE_NEXT_PROMOTION_AUTHORITY: ${options.effectiveNextPromotionAuthority ?? 'NONE'}`,
    ...(options.extraFields ?? []),
  ];
  const liveLines = [
    'LIVE_STATE_PROTOCOL_VERSION: nightwatch.live-state.v1',
    `LIVE_TASK_ID: ${options.liveTaskId ?? 'phase-test'}`,
    `LIVE_PHASE: ${options.livePhase ?? 'test'}`,
    `LIVE_TASK_STATUS: ${options.liveTaskStatus ?? 'COMPLETE'}`,
    `LIVE_PROJECT_COMPLETION_STATUS: ${options.liveProjectCompletionStatus ?? options.projectCompletionStatus ?? 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED'}`,
    `LIVE_PROJECT_VERDICT_EFFECT: ${options.liveVerdictEffect ?? 'PRESERVE'}`,
    `LIVE_NEXT_ACTION_STATE: ${options.liveNextActionState ?? 'STOP'}`,
    `LIVE_COMPLETION_CLAIM: ${options.liveCompletionClaim ?? 'COMPLETE'}`,
  ];
  return `# Nightwatch — CURRENT STATE (synthetic fixture)

## Project-state v2 (machine-checked truth block)

\`\`\`
${lines.join('\n')}
\`\`\`

## Live-state v2 (machine-checked cross-check)

\`\`\`
${liveLines.join('\n')}
\`\`\`

## Historical prose (must never affect machine checks)

Phase 8B's canonical promotion was deferred at that checkpoint; the catalog
remained empty at Phase 8B.0.1; Phase 8B.1 was not authorized before R1.
These are historical records and are ignored by project-state v2.
`;
}

interface FixtureOptions {
  readonly catalogState?: 'EMPTY' | 'ONE';
  readonly block?: BlockOptions;
  readonly blockPresent?: boolean;
  readonly r1Task?: 'v2-complete' | 'legacy-minimal' | 'missing';
  readonly activeTaskPresent?: boolean;
  readonly activeTaskPhaseStatus?: string;
  readonly tamperCatalog?: 'comment-append' | 'corrupt';
  readonly dirtyFile?: boolean;
  readonly activeTaskStatus?: 'complete' | 'blocked' | 'in_progress';
  readonly verdictEffect?: string | null;
}

interface Fixture {
  readonly root: string;
  cleanup(): void;
}

function makeFixture(options: FixtureOptions = {}): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-project-state-'));
  const catalogState = options.catalogState ?? 'ONE';
  git(root, ['init', '--quiet', '-b', 'main']);
  fs.writeFileSync(path.join(root, 'seed.txt'), 'synthetic fixture\n');

  for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
    const source = path.join(process.cwd(), relative);
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  for (const bin of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs', 'bin/child-environment.mjs', 'bin/project-state-check.mjs', 'bin/workspace-integrity.mjs']) {
    const destination = path.join(root, bin);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), bin), destination);
  }
  let catalogSource = renderCatalog(catalogState);
  if (options.tamperCatalog === 'comment-append') catalogSource += '// tampered\n';
  if (options.tamperCatalog === 'corrupt') catalogSource = 'export const SELFDEV_ADOPTED_CASES = [{"schemaVersion":"broken"}];\n';
  fs.writeFileSync(path.join(root, 'src/core/selfDev/adoptedCaseCatalog.generated.ts'), catalogSource);

  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic sources']);
  const sha = git(root, ['rev-parse', 'HEAD']);

  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  if (options.blockPresent !== false) {
    const block = options.block === undefined && options.activeTaskStatus === 'blocked'
      ? { projectCompletionStatus: 'PROJECT_NOT_COMPLETE_BLOCKED' }
      : options.block === undefined && options.activeTaskStatus === 'in_progress'
        ? { projectCompletionStatus: 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING' }
        : options.block;
    const activeTaskStatus = options.activeTaskStatus === 'blocked'
      ? 'BLOCKED'
      : options.activeTaskStatus === 'in_progress'
        ? 'IN_PROGRESS'
        : 'COMPLETE';
    const defaultProjectStatus = activeTaskStatus === 'BLOCKED'
      ? 'PROJECT_NOT_COMPLETE_BLOCKED'
      : activeTaskStatus === 'IN_PROGRESS'
        ? 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING'
        : 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED';
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), renderBlock(catalogState, {
      liveTaskId: ACTIVE_TASK_ID,
      livePhase: 'test',
      liveTaskStatus: activeTaskStatus,
      liveProjectCompletionStatus: block?.projectCompletionStatus ?? defaultProjectStatus,
      liveVerdictEffect: options.verdictEffect === null ? 'PRESERVE' : options.verdictEffect ?? 'PRESERVE',
      liveNextActionState: activeTaskStatus === 'COMPLETE' || activeTaskStatus === 'BLOCKED' ? 'STOP' : 'CONTINUE',
      liveCompletionClaim: activeTaskStatus === 'COMPLETE' ? 'COMPLETE' : 'NONE',
      ...(block ?? {}),
    }));
  } else {
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), '# Nightwatch — CURRENT STATE (synthetic fixture, no block)\n');
  }
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agent contract\n');

  // Active task: valid v2 COMPLETE (or corrupted per option).
  const activeRecords = options.activeTaskStatus === 'blocked'
    ? validBlockedTask(ACTIVE_TASK_ID, 'test', sha)
    : options.activeTaskStatus === 'in_progress'
      ? validInProgressTask(ACTIVE_TASK_ID, 'test', sha)
      : validClosedTask(ACTIVE_TASK_ID, 'test', sha);
  let activeText = activeRecords.active;
  let stateText = activeRecords.state;
  if (options.activeTaskPhaseStatus !== undefined) {
    activeText = activeText.replace(/^PHASE_TEST_STATUS: COMPLETE$/m, `PHASE_TEST_STATUS: ${options.activeTaskPhaseStatus}`);
    stateText = stateText.replace(/^PHASE_TEST_STATUS: COMPLETE$/m, `PHASE_TEST_STATUS: ${options.activeTaskPhaseStatus}`);
  }
  if (options.verdictEffect !== undefined) {
    const effectLine = options.verdictEffect === null ? '' : `PROJECT_VERDICT_EFFECT: ${options.verdictEffect}`;
    activeText = activeText.replace(/^PROJECT_VERDICT_EFFECT:.*$/m, effectLine);
    stateText = stateText.replace(/^PROJECT_VERDICT_EFFECT:.*$/m, effectLine);
  }
  fs.mkdirSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID), { recursive: true });
  if (options.activeTaskPresent !== false) {
    fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), activeText);
  }
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'SPEC.md'), '# Synthetic task\n');
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'PLAN.md'), activeRecords.plan);
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'STATE.md'), stateText);
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'REPORT.md'), activeRecords.report);
  const promptStatus = options.activeTaskStatus === 'blocked'
    ? 'BLOCKED'
    : options.activeTaskStatus === 'in_progress'
      ? 'IN_PROGRESS'
      : 'COMPLETE';
  fs.writeFileSync(path.join(root, '.agent', 'EXECUTION_PROMPT.md'), `# Synthetic execution prompt\nStatus: ${promptStatus}\nCampaign ID: ${ACTIVE_TASK_ID}\n`);

  // R1 task record (v2-complete or legacy-minimal or missing).
  if (options.r1Task !== 'missing') {
    fs.mkdirSync(path.join(root, '.agent', 'tasks', R1_TASK_ID), { recursive: true });
    if (options.r1Task === 'v2-complete') {
      const r1 = validClosedTask(R1_TASK_ID, '8B.1-R1', sha);
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'SPEC.md'), '# Synthetic task\n');
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'PLAN.md'), r1.plan);
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'STATE.md'), r1.state);
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'REPORT.md'), r1.report);
    } else {
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'SPEC.md'), '# Synthetic task\n');
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'PLAN.md'), '# Synthetic plan\n');
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'STATE.md'), LEGACY_R1_STATE);
      fs.writeFileSync(path.join(root, '.agent', 'tasks', R1_TASK_ID, 'REPORT.md'), '# Synthetic report\n');
    }
  }

  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic project state']);
  if (options.dirtyFile === true) fs.writeFileSync(path.join(root, 'untracked-noise.txt'), 'noise\n');
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function run(root: string) {
  return spawnSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' });
}

test.describe('project-state truth checker (nightwatch.project-state.v2)', () => {
  test('1. valid one-entry current project state passes', () => {
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.status).toBe('PASS');
      expect(output.projectStateProtocol).toBe('nightwatch.project-state.v2');
      expect(output.catalogCount).toBe(1);
      expect(output.phase8Status).toBe('COMPLETE');
      expect(output.phase8B1Status).toBe('COMPLETE_VIA_SUCCESSFUL_RETRY_R1');
      expect(output.nextPortfolioMember).toBe('AVAILABLE_NOT_ADOPTED');
      expect(output.promotionAuthorizationLifecycle).toBe('SPENT');
      expect(output.effectiveNextPromotionAuthority).toBe('NONE');
      expect(output.activeTaskContinuity).toBe('PASS');
      expect(output.rendererRoundTrip).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  test('1a. explicit PRESERVE allows a generic active hardening task to retain acceptance', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
    });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).status).toBe('PASS');
    } finally {
      fixture.cleanup();
    }
  });

  test('1b. accepted project state fails when the active effect is missing', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
    });
    try {
      replaceFile(fixture.root, '.agent/ACTIVE_TASK.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT:.*\n/m, ''));
      replaceFile(fixture.root, '.agent/tasks/phase-test/STATE.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT:.*\n/m, ''));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'missing verdict effect']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_VERDICT_EFFECT_MISSING');
    } finally {
      fixture.cleanup();
    }
  });

  test('1c. REEVALUATE cannot silently preserve an accepted verdict', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
    });
    try {
      replaceFile(fixture.root, '.agent/ACTIVE_TASK.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT: PRESERVE$/m, 'PROJECT_VERDICT_EFFECT: REEVALUATE'));
      replaceFile(fixture.root, '.agent/tasks/phase-test/STATE.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT: PRESERVE$/m, 'PROJECT_VERDICT_EFFECT: REEVALUATE'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'reevaluate accepted verdict']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_VERDICT_EFFECT_MISMATCH');
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('1d. REEVALUATE permits a truthful operational-acceptance downgrade', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONAL_ACCEPTANCE_FAILED' },
      verdictEffect: 'REEVALUATE',
    });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('1e. malformed project-verdict effect fails before project acceptance is projected', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
    });
    try {
      replaceFile(fixture.root, '.agent/ACTIVE_TASK.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT: PRESERVE$/m, 'PROJECT_VERDICT_EFFECT: PRESERVE_WITH_RETRY'));
      replaceFile(fixture.root, '.agent/tasks/phase-test/STATE.md', (text) => text.replace(/^PROJECT_VERDICT_EFFECT: PRESERVE$/m, 'PROJECT_VERDICT_EFFECT: PRESERVE_WITH_RETRY'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'malformed verdict effect']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_VERDICT_EFFECT_INVALID');
    } finally {
      fixture.cleanup();
    }
  });

  test('1f. contradictory live blocked status is rejected while historical prose remains inert', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
    });
    try {
      replaceFile(fixture.root, 'docs/CURRENT_STATE.md', (text) => text.replace(/^LIVE_TASK_STATUS: IN_PROGRESS$/m, 'LIVE_TASK_STATUS: BLOCKED'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'contradictory live status']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_LIVE_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('1g. execution prompt status cannot contradict the active task', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, '.agent/EXECUTION_PROMPT.md', (text) => text.replace(/^Status: COMPLETE$/m, 'Status: IN_PROGRESS'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'contradictory execution prompt']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('1h. execution prompt campaign identity cannot drift from the active task', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, '.agent/EXECUTION_PROMPT.md', (text) => text.replace(/^Campaign ID: phase-test$/m, 'Campaign ID: another-task'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'contradictory execution identity']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('1i. every live cross-check field is bound to the active state', () => {
    const cases: readonly [keyof BlockOptions, string, string][] = [
      ['liveTaskId', 'another-task', 'PROJECT_STATE_LIVE_TASK_ID_MISMATCH'],
      ['livePhase', 'another-phase', 'PROJECT_STATE_LIVE_PHASE_MISMATCH'],
      ['liveTaskStatus', 'IN_PROGRESS', 'PROJECT_STATE_LIVE_STATUS_MISMATCH'],
      ['liveProjectCompletionStatus', 'OPERATIONALLY_ACCEPTED', 'PROJECT_STATE_LIVE_COMPLETION_STATUS_MISMATCH'],
      ['liveVerdictEffect', 'REEVALUATE', 'PROJECT_STATE_LIVE_VERDICT_EFFECT_MISMATCH'],
      ['liveNextActionState', 'CONTINUE', 'PROJECT_STATE_LIVE_NEXT_ACTION_MISMATCH'],
      ['liveCompletionClaim', 'NONE', 'PROJECT_STATE_LIVE_COMPLETION_CLAIM_MISMATCH'],
    ];
    for (const [field, value, code] of cases) {
      const fixture = makeFixture({ block: { [field]: value } as BlockOptions });
      try {
        const result = run(fixture.root);
        expect(result.status, field).not.toBe(0);
        expect(result.stderr, field).toContain(code);
      } finally {
        fixture.cleanup();
      }
    }
  });

  test('1j. live-state block shape failures are fail closed', () => {
    const cases: readonly [string, (text: string) => string, string][] = [
      [
        'duplicate',
        (text) => text.replace(/^LIVE_TASK_ID: phase-test$/m, 'LIVE_TASK_ID: phase-test\nLIVE_TASK_ID: phase-test'),
        'PROJECT_STATE_LIVE_STATE_DUPLICATE_FIELD',
      ],
      [
        'unknown',
        (text) => text.replace(/^LIVE_COMPLETION_CLAIM: COMPLETE$/m, 'LIVE_UNEXPECTED: VALUE\nLIVE_COMPLETION_CLAIM: COMPLETE'),
        'PROJECT_STATE_LIVE_STATE_UNKNOWN_FIELD',
      ],
      [
        'missing',
        (text) => text.replace(/^LIVE_COMPLETION_CLAIM: COMPLETE\n/m, ''),
        'PROJECT_STATE_LIVE_STATE_REQUIRED_FIELD_MISSING',
      ],
      [
        'malformed',
        (text) => text.replace(/^LIVE_COMPLETION_CLAIM: COMPLETE$/m, 'not-a-structured-field\nLIVE_COMPLETION_CLAIM: COMPLETE'),
        'PROJECT_STATE_LIVE_STATE_BLOCK_MALFORMED',
      ],
    ];
    for (const [label, mutate, code] of cases) {
      const fixture = makeFixture();
      try {
        replaceFile(fixture.root, 'docs/CURRENT_STATE.md', mutate);
        git(fixture.root, ['add', '--all']);
        git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', `live-state ${label}`]);
        const result = run(fixture.root);
        expect(result.status, label).not.toBe(0);
        expect(result.stderr, label).toContain(code);
      } finally {
        fixture.cleanup();
      }
    }
  });

  test('2. valid empty synthetic catalog state passes where the fixture intentionally models empty', () => {
    const fixture = makeFixture({ catalogState: 'EMPTY' });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).catalogCount).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('3. wrong catalog count fails', () => {
    const fixture = makeFixture({ block: { catalogCount: '2' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_COUNT_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('4. wrong catalog digest fails', () => {
    const fixture = makeFixture({ block: { catalogDigest: 'sha256:' + '0'.repeat(64) } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_DIGEST_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('5. wrong target path fails', () => {
    const fixture = makeFixture({ block: { catalogTarget: 'src/core/selfDev/other.generated.ts' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_TARGET_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('6. unsupported protocol version fails', () => {
    const fixture = makeFixture({ block: { version: 'nightwatch.project-state.v0' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PROTOCOL_UNSUPPORTED');
    } finally {
      fixture.cleanup();
    }
  });

  test('7. missing protocol fails', () => {
    const fixture = makeFixture({ blockPresent: false });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_BLOCK_MISSING');
    } finally {
      fixture.cleanup();
    }
  });

  test('8. wrong LIVE_HEAD_AUTHORITY fails', () => {
    const fixture = makeFixture({ block: { liveHeadAuthority: 'CURRENT_STATE' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_LIVE_HEAD_AUTHORITY_INVALID');
    } finally {
      fixture.cleanup();
    }
  });

  test('9. competing generic implementation authority fails', () => {
    const fixture = makeFixture({ block: { extraFields: ['LAST_VALIDATED_IMPLEMENTATION_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac'] } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_DUPLICATE_IMPLEMENTATION_AUTHORITY');
    } finally {
      fixture.cleanup();
    }
  });

  test('10. competing generic documentation-checkpoint authority fails', () => {
    const fixture = makeFixture({ block: { extraFields: ['LAST_DOCUMENTATION_CHECKPOINT_SHA: 488b4e41dc12840a1e0c029ae76b24f3ce8abee4'] } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_DUPLICATE_DOCUMENTATION_AUTHORITY');
    } finally {
      fixture.cleanup();
    }
  });

  test('10a. unknown and stale machine-block fields fail closed', () => {
    const fixture = makeFixture({
      block: { extraFields: ['PHASE_15_PROGRAM_STATE: SESSION_1_COMPLETE_SESSION_2_REQUIRED'] },
    });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_UNKNOWN_FIELD');
    } finally {
      fixture.cleanup();
    }
  });

  test('10b. duplicate and missing owned fields fail closed', () => {
    const duplicate = makeFixture({ block: { extraFields: ['PHASE_8_STATUS: COMPLETE'] } });
    try {
      const result = run(duplicate.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_DUPLICATE_FIELD');
    } finally {
      duplicate.cleanup();
    }

    const missing = makeFixture();
    try {
      replaceFile(missing.root, 'docs/CURRENT_STATE.md', (text) => text.replace(/^PROMOTION_AUTHORIZATION_LIFECYCLE:.*\n/m, ''));
      git(missing.root, ['add', '--all']);
      git(missing.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'missing owned field']);
      const result = run(missing.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_REQUIRED_FIELD_MISSING');
    } finally {
      missing.cleanup();
    }
  });

  test('10c. malformed and oversized machine blocks fail closed', () => {
    const malformed = makeFixture();
    try {
      replaceFile(malformed.root, 'docs/CURRENT_STATE.md', (text) => text.replace(/^PHASE_8_STATUS:.*$/m, 'malformed machine record'));
      git(malformed.root, ['add', '--all']);
      git(malformed.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'malformed machine block']);
      const result = run(malformed.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_BLOCK_MALFORMED');
    } finally {
      malformed.cleanup();
    }

    const oversized = makeFixture();
    try {
      replaceFile(oversized.root, 'docs/CURRENT_STATE.md', (text) => text.replace(/^PROMOTION_AUTHORIZATION_LIFECYCLE:.*$/m, `PROMOTION_AUTHORIZATION_LIFECYCLE: ${'x'.repeat(1_100)}`));
      git(oversized.root, ['add', '--all']);
      git(oversized.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'oversized machine block']);
      const result = run(oversized.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_BLOCK_OVERSIZED');
    } finally {
      oversized.cleanup();
    }
  });

  test('11. lifecycle SPENT is projected faithfully while effective authority remains NONE', () => {
    // Explicit dedicated assertion for the required axis.
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.promotionAuthorizationLifecycle).toBe('SPENT');
      expect(output.effectiveNextPromotionAuthority).toBe('NONE');
    } finally {
      fixture.cleanup();
    }
  });

  test('12. lifecycle NONE and SPENT are valid, while an authorization grant is invalid', () => {
    // Both lifecycle values are explicit; effective authority remains NONE.
    for (const valid of ['NONE', 'SPENT']) {
      const fix = makeFixture({ block: { promotionAuthorizationLifecycle: valid } });
      try {
        const res = run(fix.root);
        expect(res.status).toBe(0);
      } finally {
        fix.cleanup();
      }
    }
    // AUTHORIZED is invalid
    const fixture = makeFixture({ block: { promotionAuthorizationLifecycle: 'AUTHORIZED' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PROMOTION_LIFECYCLE_INVALID');
    } finally {
      fixture.cleanup();
    }
  });

  test('13. candidate availability does not imply promotion authority', () => {
    // Variant B is the available next member while authority stays NONE — the
    // real current project state. This must be healthy (test 1); here we also
    // prove the two axes are independent fields.
    const fixture = makeFixture({ block: { nextPortfolioMember: 'AVAILABLE_NOT_ADOPTED', promotionAuthorizationLifecycle: 'NONE', effectiveNextPromotionAuthority: 'NONE' } });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).nextPortfolioMember).toBe('AVAILABLE_NOT_ADOPTED');
      expect(JSON.parse(result.stdout).effectiveNextPromotionAuthority).toBe('NONE');
    } finally {
      fixture.cleanup();
    }
  });

  test('14. stale Phase 8B.1 not-started live status fails', () => {
    const fixture = makeFixture({ block: { phase8B1Status: 'NOT_STARTED' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PHASE_8B_1_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('15. catalog validator failure propagates (module fails closed)', () => {
    const fixture = makeFixture({ tamperCatalog: 'corrupt' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_MODULE_LOAD_FAILED');
    } finally {
      fixture.cleanup();
    }
  });

  test('16. noncanonical rendered target fails', () => {
    const fixture = makeFixture({ tamperCatalog: 'comment-append' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_RENDERER_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('17. duplicate catalog entry fails through the real validator', () => {
    // A duplicated entry makes the REAL validateAdoptedCatalog throw at module
    // load; the checker must propagate that failure, never skip validation.
    const fixture = makeFixture({ tamperCatalog: 'corrupt' });
    try {
      const duplicated = `export const SELFDEV_ADOPTED_CASES = [\n${JSON.stringify(ONE_ENTRY[0], null, 2)},\n${JSON.stringify(ONE_ENTRY[0], null, 2)}\n];\n`;
      fs.writeFileSync(path.join(fixture.root, 'src/core/selfDev/adoptedCaseCatalog.generated.ts'), duplicated);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CATALOG_MODULE_LOAD_FAILED');
    } finally {
      fixture.cleanup();
    }
  });

  test('18. current ACTIVE_TASK missing fails', () => {
    const fixture = makeFixture({ activeTaskPresent: false });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_ACTIVE_TASK_MISSING');
    } finally {
      fixture.cleanup();
    }
  });

  test('19. agent continuity failure cannot be hidden by project:check', () => {
    // A completed task whose phase status regresses to IN_PROGRESS fails
    // continuity v2; project:check must surface it.
    const fixture = makeFixture({ activeTaskPhaseStatus: 'IN_PROGRESS' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_ACTIVE_TASK_CONTINUITY_FAILED');
    } finally {
      fixture.cleanup();
    }
  });

  test('20. historical phase-qualified implementation SHA fields remain prose-only', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, 'docs/CURRENT_STATE.md', (text) => `${text}\nPHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac\nPHASE_8A_1_HISTORICAL_DOCUMENTATION_CHECKPOINT_SHA: 488b4e41dc12840a1e0c029ae76b24f3ce8abee4\n`);
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'historical prose']);
      const result = run(fixture.root);
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('21. historical prose can never fail project:check (no prose parsing)', () => {
    // The fixture CURRENT_STATE already contains historical "empty/not
    // authorized/deferred" prose; the structured block is what is checked.
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('22. R1 completed-task record missing fails the phase cross-check', () => {
    const fixture = makeFixture({ r1Task: 'missing' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_R1_TASK_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('23. stale pre-closure Phase 8 status fails (closure regression B)', () => {
    // After Phase 8 closure, IN_PROGRESS is the stale token and must fail.
    const fixture = makeFixture({ block: { phase8Status: 'IN_PROGRESS' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PHASE_8_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('23a. arbitrary Phase 8 status fails (closure regression C)', () => {
    const fixture = makeFixture({ block: { phase8Status: 'PARTIAL' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PHASE_8_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('23b. Phase 8 COMPLETE passes (closure regression A)', () => {
    // Explicit named regression for the terminal closure state; the default
    // fixture already renders PHASE_8_STATUS: COMPLETE (test 1).
    const fixture = makeFixture({ block: { phase8Status: 'COMPLETE' } });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).phase8Status).toBe('COMPLETE');
    } finally {
      fixture.cleanup();
    }
  });

  test('23c. Phase 8 COMPLETE never grants promotion authority (closure safety invariant)', () => {
    // Load-bearing: closing the research phase is NOT standing authorization
    // to use the promotion machinery later. COMPLETE + NONE must stay healthy,
    // and COMPLETE + anything-but-NONE must fail exactly.
    const healthy = makeFixture({ block: { phase8Status: 'COMPLETE', promotionAuthorizationLifecycle: 'SPENT', effectiveNextPromotionAuthority: 'NONE' } });
    try {
      const result = run(healthy.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).phase8Status).toBe('COMPLETE');
      expect(JSON.parse(result.stdout).effectiveNextPromotionAuthority).toBe('NONE');
    } finally {
      healthy.cleanup();
    }
    const granted = makeFixture({ block: { phase8Status: 'COMPLETE', effectiveNextPromotionAuthority: 'AUTHORIZED' } });
    try {
      const result = run(granted.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EFFECTIVE_PROMOTION_AUTHORITY_INVALID');
    } finally {
      granted.cleanup();
    }
  });

  test('24. dirty checkout fails', () => {
    const fixture = makeFixture({ dirtyFile: true });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CHECKOUT_DIRTY');
    } finally {
      fixture.cleanup();
    }
  });

  test('25. current task authority pointing at the project document is rejected', () => {
    const fixture = makeFixture({ block: { currentTaskAuthority: 'docs/CURRENT_STATE.md', validatedImplementationAuthority: 'docs/CURRENT_STATE.md' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CURRENT_TASK_AUTHORITY_INVALID');
      expect(result.stderr).toContain('PROJECT_STATE_VALIDATED_IMPLEMENTATION_AUTHORITY_INVALID');
    } finally {
      fixture.cleanup();
    }
  });

  test('26. blocked campaign cannot project a complete release status', () => {
    const fixture = makeFixture({ activeTaskStatus: 'blocked', block: { projectCompletionStatus: 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('27. blocked campaign projects the explicit blocked terminal status', () => {
    const fixture = makeFixture({ activeTaskStatus: 'blocked' });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).projectCompletionStatus).toBe('PROJECT_NOT_COMPLETE_BLOCKED');
    } finally {
      fixture.cleanup();
    }
  });

  test('28. CI non-evidence cannot be projected as executed CI', () => {
    const fixture = makeFixture({ block: { ciStatus: 'NO_STEPS_EXTERNAL_NON_EVIDENCE', ciObservedSha: 'NONE', ciExecutedSha: 'NONE' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CI_NON_EVIDENCE_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('29. in-progress operational campaign cannot project historical local-clean as finished', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED' },
    });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('30. in-progress operational campaign accepts IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING', () => {
    const fixture = makeFixture({ activeTaskStatus: 'in_progress' });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).projectCompletionStatus).toBe('IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING');
    } finally {
      fixture.cleanup();
    }
  });

  test('31. in-progress campaign still accepts the historical IN_PROGRESS completion token', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'IN_PROGRESS' },
    });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).projectCompletionStatus).toBe('IN_PROGRESS');
    } finally {
      fixture.cleanup();
    }
  });

  test('32. COMPLETE historical local-clean remains valid and is not an operational-accepted token', () => {
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).projectCompletionStatus).toBe('PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED');
    } finally {
      fixture.cleanup();
    }
  });

  test('33. COMPLETE accepts OPERATIONALLY_ACCEPTED and REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN', () => {
    for (const status of ['OPERATIONALLY_ACCEPTED', 'REAL_SYSTEM_EXECUTION_VERIFIED_EFFICACY_UNPROVEN', 'OPERATIONAL_ACCEPTANCE_FAILED'] as const) {
      const fixture = makeFixture({ block: { projectCompletionStatus: status } });
      try {
        const result = run(fixture.root);
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout).projectCompletionStatus).toBe(status);
      } finally {
        fixture.cleanup();
      }
    }
  });

  test('34. COMPLETE cannot project operational-acceptance pending', () => {
    const fixture = makeFixture({ block: { projectCompletionStatus: 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('35. blocked campaign accepts OPERATIONAL_ACCEPTANCE_BLOCKED and still rejects local-clean complete', () => {
    const allowed = makeFixture({
      activeTaskStatus: 'blocked',
      block: { projectCompletionStatus: 'OPERATIONAL_ACCEPTANCE_BLOCKED' },
    });
    try {
      const result = run(allowed.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).projectCompletionStatus).toBe('OPERATIONAL_ACCEPTANCE_BLOCKED');
    } finally {
      allowed.cleanup();
    }
    const forbidden = makeFixture({
      activeTaskStatus: 'blocked',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED' },
    });
    try {
      const result = run(forbidden.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      forbidden.cleanup();
    }
  });

  test('36. unknown operational status still fails closed', () => {
    const fixture = makeFixture({ block: { projectCompletionStatus: 'OPERATIONALLY_FINISHED' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_INVALID');
    } finally {
      fixture.cleanup();
    }
  });

  test('37. in-progress campaign cannot project OPERATIONALLY_ACCEPTED', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'OPERATIONALLY_ACCEPTED' },
      verdictEffect: 'REEVALUATE',
    });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_COMPLETION_STATUS_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  // C-06's exact-head CI observation was recorded against an ancestor SHA while
  // the substantive baseline had advanced past it, so a zero-step
  // classification kept describing a run that no longer represented the code in
  // force. Ancestry is derivable offline, so that staleness is mechanically
  // detectable without contacting GitHub.
  function rewriteBlock(root: string, replacements: Record<string, string>): void {
    const file = path.join(root, 'docs/CURRENT_STATE.md');
    let text = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`^${key}: .*$`, 'm'), `${key}: ${value}`);
    }
    fs.writeFileSync(file, text);
    git(root, ['add', '--all']);
    git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'rewrite block']);
  }

  test('29. CI evidence older than the substantive baseline is rejected as stale', () => {
    const fixture = makeFixture();
    try {
      const ancestor = git(fixture.root, ['rev-parse', 'HEAD~1']);
      const baseline = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteBlock(fixture.root, {
        LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: baseline,
        CI_OBSERVED_SHA: ancestor,
        CI_EXECUTED_SHA: ancestor,
        CI_STATUS: 'EXECUTED_PASS',
      });
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_CI_EVIDENCE_STALE');
    } finally {
      fixture.cleanup();
    }
  });

  test('29a. CI evidence at the substantive baseline is accepted', () => {
    const fixture = makeFixture();
    try {
      const baseline = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteBlock(fixture.root, {
        LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: baseline,
        CI_OBSERVED_SHA: baseline,
        CI_EXECUTED_SHA: baseline,
        CI_STATUS: 'EXECUTED_PASS',
      });
      const result = run(fixture.root);
      expect(result.stderr).not.toContain('PROJECT_STATE_CI_EVIDENCE_STALE');
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('29b. an executed-fail observation at the baseline is truthful, not stale', () => {
    // The exact state this campaign had to record: CI ran and really failed.
    const fixture = makeFixture({ activeTaskStatus: 'in_progress' });
    try {
      const baseline = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteBlock(fixture.root, {
        LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: baseline,
        CI_OBSERVED_SHA: baseline,
        CI_EXECUTED_SHA: baseline,
        CI_STATUS: 'EXECUTED_FAIL',
      });
      const result = run(fixture.root);
      expect(result.stderr).not.toContain('PROJECT_STATE_CI_EVIDENCE_STALE');
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

});

// ---------------------------------------------------------------------------
// C-10.5 A10 — cross-authority baseline invariant.
//
// The pre-existing staleness detection compares the CI anchor to the
// substantive anchor, so it only fires when the two DISAGREE. The live defect
// this campaign found was five anchors all naming b99ce4e, an ANCESTOR of the
// validated C-10 implementation: mutually consistent, globally stale, and
// invisible because the fields were each other's only reference.
//
// These cases pin the repaired behaviour. The reference is
// `.agent/ACTIVE_TASK.md`, which the truth block already declares
// VALIDATED_IMPLEMENTATION_AUTHORITY, and the check CLASSIFIES the commit
// range so a documentation-only descendant still passes.
// ---------------------------------------------------------------------------

interface BaselineFixtureOptions {
  /** What the commits between the project baseline and the task anchor touch. */
  readonly intervening: 'IMPLEMENTATION' | 'DOCS_ONLY';
  /** Which SHA the project block records as the substantive baseline. */
  readonly substantive: 'STALE' | 'CURRENT';
  /** Which SHA the project block records as the CI anchor. */
  readonly ci: 'STALE' | 'CURRENT' | 'MALFORMED';
}

/**
 * Build a repository whose project baseline and active-task anchor are
 * deliberately separated by a classifiable commit range.
 */
function makeBaselineFixture(options: BaselineFixtureOptions): Fixture {
  const fixture = makeFixture({ activeTaskStatus: 'in_progress' });
  const root = fixture.root;
  const staleSha = git(root, ['rev-parse', 'HEAD']);

  // The intervening commit. An implementation path proves a later substantive
  // implementation exists; an approved documentation path does not.
  if (options.intervening === 'IMPLEMENTATION') {
    fs.mkdirSync(path.join(root, 'src/core/synthetic'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/core/synthetic/probe.ts'), 'export const probe = 1;\n');
  } else {
    // An approved documentation path that carries no validated contract of its
    // own, so the case isolates range CLASSIFICATION rather than content rules.
    fs.writeFileSync(path.join(root, 'docs/ROADMAP.md'), '# Roadmap\n\nsynthetic documentation descendant\n');
  }
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic intervening commit']);
  const currentSha = git(root, ['rev-parse', 'HEAD']);

  // The ACTIVE_TASK authority names the newer commit as what it validated.
  for (const relative of ['.agent/ACTIVE_TASK.md', `.agent/tasks/${ACTIVE_TASK_ID}/STATE.md`]) {
    replaceFile(root, relative, (text) =>
      text
        .replace(/^LAST_VALIDATED_IMPLEMENTATION_SHA: .*$/m, `LAST_VALIDATED_IMPLEMENTATION_SHA: ${currentSha}`)
        .replace(/^LAST_SUBSTANTIVE_CHECKPOINT_SHA: .*$/m, `LAST_SUBSTANTIVE_CHECKPOINT_SHA: ${currentSha}`)
        .replace(/^Last validated implementation SHA: .*$/m, `Last validated implementation SHA: ${currentSha}`)
        .replace(/^Last substantive checkpoint SHA: .*$/m, `Last substantive checkpoint SHA: ${currentSha}`));
  }

  const substantiveSha = options.substantive === 'STALE' ? staleSha : currentSha;
  const ciSha = options.ci === 'MALFORMED'
    ? 'not-a-valid-sha'
    : options.ci === 'STALE' ? staleSha : currentSha;

  fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), renderBlock('ONE', {
    liveTaskId: ACTIVE_TASK_ID,
    livePhase: 'test',
    liveTaskStatus: 'IN_PROGRESS',
    liveProjectCompletionStatus: 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING',
    projectCompletionStatus: 'IMPLEMENTATION_COMPLETE_OPERATIONAL_ACCEPTANCE_PENDING',
    liveVerdictEffect: 'PRESERVE',
    liveNextActionState: 'CONTINUE',
    liveCompletionClaim: 'NONE',
    lastSubstantiveImplementationSha: substantiveSha,
    lastLocallyValidatedSha: substantiveSha,
    lastCleanValidatedSha: substantiveSha,
    ciObservedSha: ciSha,
    ciExecutedSha: ciSha,
    ciStatus: 'EXECUTED_PASS',
  }));
  git(root, ['add', '--all']);
  git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic baseline record']);
  return fixture;
}

/**
 * The checker's JSON receipt, isolated from the read-only `agent-state`
 * subprocess warnings that share stdout (for example CHECKPOINT_ADVANCE when
 * the task anchor legitimately precedes HEAD).
 */
function receiptOf(result: ReturnType<typeof run>): { readonly status: string } {
  const stdout = result.stdout ?? '';
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`NO_RECEIPT_JSON:${stdout.slice(0, 200)}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

function errorsOf(result: ReturnType<typeof run>): readonly string[] {
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return combined.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('PROJECT_STATE_'));
}

test.describe('C-10.5 A10 — cross-authority baseline invariant', () => {
  test('A10.1 project state and active task agree — PASS', () => {
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'CURRENT', ci: 'CURRENT' });
    try {
      const result = run(fixture.root);
      expect(errorsOf(result)).toEqual([]);
      expect(result.status).toBe(0);
      expect(receiptOf(result).status).toBe('PASS');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.2 both project CI and substantive fields stale but MUTUALLY EQUAL — FAIL', () => {
    // The exact live defect: pairwise agreement, global staleness. The
    // pre-existing check cannot see this, because it requires the two anchors
    // to differ from each other.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'STALE' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(errorsOf(result)).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
      // And the mutual-equality escape is proven: the older pairwise check,
      // which needs the anchors to disagree, does NOT fire here.
      expect(errorsOf(result)).not.toContain('PROJECT_STATE_CI_EVIDENCE_STALE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.3 CI newer but substantive stale — FAIL', () => {
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'CURRENT' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(errorsOf(result)).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.4 docs-only descendant chain after a validated implementation — PASS', () => {
    // Updating task records and project docs after a validated implementation
    // necessarily advances HEAD past the substantive commit, often by several
    // commits. That must not be reported as staleness, or every campaign would
    // fail its own closeout.
    //
    // Note the representation: continuity separately forbids an
    // implementation ANCHOR that is documentation-only in its own commit
    // (INVALID_IMPLEMENTATION_ROLE), so the correct shape is a real
    // implementation anchor followed by a documentation-only chain — not a
    // documentation commit relabelled as the implementation.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'CURRENT', ci: 'CURRENT' });
    try {
      for (const [file, body] of [
        ['docs/ROADMAP.md', '# Roadmap\n\nfirst documentation descendant\n'],
        ['docs/DECISIONS.md', '# Decisions\n\nsecond documentation descendant\n'],
      ] as const) {
        fs.writeFileSync(path.join(fixture.root, file), body);
        git(fixture.root, ['add', '--all']);
        git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', `synthetic docs descendant ${file}`]);
      }
      const result = run(fixture.root);
      expect(errorsOf(result)).toEqual([]);
      expect(result.status).toBe(0);
      expect(receiptOf(result).status).toBe('PASS');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.5 historical narrative containing stale SHAs is ignored', () => {
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'CURRENT', ci: 'CURRENT' });
    try {
      const stale = 'b99ce4e61166e52b554dd6ac07b7678b433959da';
      // Prose naming old anchors, outside the machine-checked block.
      fs.appendFileSync(path.join(fixture.root, 'docs/CURRENT_STATE.md'), [
        '',
        '## Historical narrative (informational)',
        '',
        `The predecessor baseline was \`${stale}\` and CI ran there as run 33590645175.`,
        `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: ${stale}`,
        `CI_EXECUTED_SHA: ${stale}`,
        '',
      ].join('\n'));
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic historical prose']);
      const result = run(fixture.root);
      expect(errorsOf(result)).toEqual([]);
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.6 a COMPLETE prior task does not become the current authority', () => {
    // The reference is the ACTIVE task, not any task record that happens to
    // name a newer SHA. A completed predecessor record must not move the bar.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'CURRENT', ci: 'CURRENT' });
    try {
      const head = git(fixture.root, ['rev-parse', 'HEAD']);
      const priorId = 'synthetic-completed-predecessor';
      const prior = validClosedTask(priorId, 'prior', head);
      fs.mkdirSync(path.join(fixture.root, '.agent/tasks', priorId), { recursive: true });
      fs.writeFileSync(path.join(fixture.root, '.agent/tasks', priorId, 'SPEC.md'), '# Synthetic task\n');
      fs.writeFileSync(path.join(fixture.root, '.agent/tasks', priorId, 'PLAN.md'), prior.plan);
      fs.writeFileSync(path.join(fixture.root, '.agent/tasks', priorId, 'STATE.md'), prior.state);
      fs.writeFileSync(path.join(fixture.root, '.agent/tasks', priorId, 'REPORT.md'), prior.report);
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic completed predecessor']);
      const result = run(fixture.root);
      expect(errorsOf(result)).toEqual([]);
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.7 a malformed SHA in the CI anchor — FAIL', () => {
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'CURRENT', ci: 'MALFORMED' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      const errors = errorsOf(result);
      expect(errors.some((code) => code.startsWith('PROJECT_STATE_CI_'))).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.8 ancestor substitution is refused even when every field is well-formed', () => {
    // The attack shape: swap the baseline for a real, in-history, perfectly
    // well-formed ANCESTOR commit. Shape validation cannot see it; only the
    // classified range against the task authority can.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'STALE' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      const errors = errorsOf(result);
      expect(errors).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
      // The substituted SHA is genuinely in history — this is not a
      // "not in history" rejection.
      expect(errors.some((code) => code.includes('NOT_IN_HISTORY'))).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });
});
