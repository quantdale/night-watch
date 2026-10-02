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
import {
  RELEASE_ADVANCE_CHECKS,
  RELEASE_CERTIFICATION_VERSION,
  RELEASE_CONDITION_STATES,
  RELEASE_VERDICT_COUNT_MARKERS,
  RELEASE_VERDICT_STATUS_MARKER,
  checkVerdictPresentation,
  evaluateReleaseCertification,
  parseReleaseCertificationDefinition,
} from '../../src/core/releaseCertification';
import type {
  ReleaseCertificationDefinition,
  ReleaseCheckOutput,
} from '../../src/core/releaseCertification';
import { parseAccessibilityCertificationRecord } from '../../bin/lib/accessibility-record.mjs';
import {
  bindTreeProbe,
  describeProbeBinding,
  receiptBindingRelation,
  receiptNotAtCheckpoint,
  resolveProbeBinding,
} from '../../bin/lib/probe-binding.mjs';
import { classifyCheckpointRange } from '../../bin/lib/checkpoint-range.mjs';
import { stableCanonical, productionBindingReceiptVerifier, verifyPersistedReceipt } from '../../bin/lib/release-evidence.mjs';
import { laneArtifactDemotions } from '../../bin/lib/evidence-artifact.mjs';
import { topologyCertificationForCheckpoint, topologyCertificationVerdict } from '../../bin/lib/topology-receipts.mjs';
import { topologyReceiptDigest } from '../../bin/lib/topology-gate.mjs';
import { checkpointRoleViolations } from '../../bin/lib/checkpoint-role.mjs';
import {
  UI_HARNESS_FILE,
  UI_HARNESS_REQUIRED_TESTS,
  UI_HARNESS_SUITE,
  buildUiHarnessReceipt,
  evaluateUiHarnessReceipt,
  extractApiErrorKinds,
  uiHarnessReceiptDigest,
} from '../../bin/lib/ui-harness-receipt.mjs';
import { exerciseConfigurationContract, exercisePreflightRefusal } from '../../bin/lib/release-probe-exercises.mjs';
import * as environmentSurfaceModule from '../../src/core/config/environmentSurface';
import * as capabilityLifecycleModule from '../../src/auth/capabilityLifecycle';
import {
  buildProductRunReceipt,
  evaluateYieldCampaignEvidence,
  validateProductRunReceipt,
} from '../../src/core/agentRuntime/productRunReceipt';
import { classifyCertificationDemotion } from '../../bin/lib/certification-demotion.mjs';

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

## Routing and safety

\`\`\`
CAMPAIGN: ${taskId}
SESSION WORKTREE: main
\`\`\`
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
  // F-12: the release certification definition and its pure judgement module
  // are read from the root under test, so a fixture can mutate them.
  for (const relative of ['src/core/releaseCertification/index.ts', 'config/release-certification.v1.json', 'config/ci-block-record.v1.json']) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(process.cwd(), relative), destination);
  }
  // VB-05 (corrections task 2.5): the compatibility window is closed, so every
  // fixture carries a real release-evidence registry — the closed schema,
  // one binding per certification condition, mirroring each condition's
  // declared evidence exactly (the legacy locations are consulted only for an
  // UNBOUND subject of a present, valid registry).
  {
    const definition = JSON.parse(fs.readFileSync(path.join(root, 'config/release-certification.v1.json'), 'utf8')) as {
      conditions: Array<{ id: string; evidenceSha: string | null }>;
    };
    const registry = {
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: definition.conditions.map((condition) => ({
        subject: condition.id,
        evidenceSha: condition.evidenceSha ?? null,
        receiptDigest: null,
        observedAt: null,
        executor: null,
        artifactPaths: [],
        certifying: true,
      })),
    };
    fs.writeFileSync(path.join(root, 'config/release-evidence.v1.json'), `${JSON.stringify(registry, null, 2)}\n`);
  }
  for (const bin of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs', 'bin/child-environment.mjs', 'bin/project-state-check.mjs', 'bin/workspace-integrity.mjs', 'bin/lib/checkpoint-role.mjs', 'bin/lib/operator-cli.mjs', 'bin/lib/openspec-ledger.mjs', 'bin/lib/claim-journal.mjs', 'bin/lib/openspec-archive-index.mjs', 'bin/lib/programme-state.mjs', 'bin/lib/release-evidence.mjs', 'bin/lib/receipt-schemas.mjs', 'bin/lib/certification-evidence.mjs', 'bin/lib/certification-subjects.mjs', 'bin/lib/stable-canonical.mjs', 'bin/lib/checkpoint-binding.mjs', 'bin/lib/evidence-evaluation-inputs.mjs', 'bin/lib/release-receipt-probes.mjs', 'bin/lib/probe-io.mjs', 'bin/lib/checkpoint-range.mjs', 'bin/lib/probe-binding.mjs', 'bin/lib/evidence-artifact.mjs', 'bin/lib/ui-harness-receipt.mjs', 'bin/lib/typescript-runtime-loader.mjs', 'bin/lib/validation-lane-state.mjs', 'bin/lib/ci-block-record.mjs', 'bin/lib/accessibility-record.mjs', 'bin/lib/certification-demotion.mjs']) {
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
  if (options.blockPresent === false) {
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), '# Nightwatch — CURRENT STATE (synthetic fixture, no block)\n');
  } else {
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
    // R3-04 / corrections task 8.3: DISCOVER_FROM_GIT is no longer a
    // certification checkpoint, so the fixture names the real synthetic
    // sources commit unless a test overrides the anchor explicitly.
    const blockOptions = { ...(block ?? {}) };
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), renderBlock(catalogState, {
      liveTaskId: ACTIVE_TASK_ID,
      livePhase: 'test',
      liveTaskStatus: activeTaskStatus,
      liveProjectCompletionStatus: blockOptions.projectCompletionStatus ?? defaultProjectStatus,
      liveVerdictEffect: options.verdictEffect === null ? 'PRESERVE' : options.verdictEffect ?? 'PRESERVE',
      liveNextActionState: activeTaskStatus === 'COMPLETE' || activeTaskStatus === 'BLOCKED' ? 'STOP' : 'CONTINUE',
      liveCompletionClaim: activeTaskStatus === 'COMPLETE' ? 'COMPLETE' : 'NONE',
      ...blockOptions,
      lastSubstantiveImplementationSha: blockOptions.lastSubstantiveImplementationSha ?? sha,
    }));
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
      expect(result.status, result.stderr).toBe(0);
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

  // R-07. READY_FOR_EXECUTION is a planning-only checkpoint: the handoff
  // protocol REQUIRES the prompt to name the successor campaign while
  // ACTIVE_TASK still holds the terminal predecessor. Asserting the campaign
  // binding here made that documented state unreachable — and because
  // normalizeTaskStatus('READY_FOR_EXECUTION') is null, the status comparison
  // failed for EVERY planning prompt regardless of identity. The binding that
  // must hold in this state is the predecessor one, so it is asserted instead.
  test('1h-1. a planning-only prompt may name the successor campaign', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, '.agent/EXECUTION_PROMPT.md', () =>
        '# Synthetic execution prompt\n'
        + 'Status: READY_FOR_EXECUTION\n'
        + 'Campaign ID: successor-campaign\n'
        + `Predecessor Task ID: ${ACTIVE_TASK_ID}\n`
        + 'Predecessor Status: COMPLETE\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'planning-only handoff checkpoint']);
      const result = run(fixture.root);
      expect(result.stderr).not.toContain('PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
      expect(result.stderr).not.toContain('PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
      expect(result.status).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('1h-2. a planning-only prompt naming the wrong predecessor still fails', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, '.agent/EXECUTION_PROMPT.md', () =>
        '# Synthetic execution prompt\n'
        + 'Status: READY_FOR_EXECUTION\n'
        + 'Campaign ID: successor-campaign\n'
        + 'Predecessor Task ID: some-other-task\n'
        + 'Predecessor Status: COMPLETE\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'planning prompt with wrong predecessor']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EXECUTION_PROMPT_TASK_ID_MISMATCH');
    } finally {
      fixture.cleanup();
    }
  });

  test('1h-3. a planning-only prompt misreporting the predecessor status still fails', () => {
    const fixture = makeFixture();
    try {
      replaceFile(fixture.root, '.agent/EXECUTION_PROMPT.md', () =>
        '# Synthetic execution prompt\n'
        + 'Status: READY_FOR_EXECUTION\n'
        + 'Campaign ID: successor-campaign\n'
        + `Predecessor Task ID: ${ACTIVE_TASK_ID}\n`
        + 'Predecessor Status: IN_PROGRESS\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'planning prompt with wrong predecessor status']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EXECUTION_PROMPT_STATUS_MISMATCH');
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
      // The fixture's second commit is documentation/continuity only, so the
      // substantive anchor is the implementation-bearing first commit.
      const baseline = git(fixture.root, ['rev-parse', 'HEAD~1']);
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
      const baseline = git(fixture.root, ['rev-parse', 'HEAD~1']);
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
  /** R3-10: the continuity task status the fixture presents. */
  readonly taskStatus?: 'IN_PROGRESS' | 'COMPLETE';
  /** What the commits between the project baseline and the task anchor touch. */
  readonly intervening: 'IMPLEMENTATION' | 'DOCS_ONLY';
  /** Which SHA the project block records as the substantive baseline. */
  readonly substantive: 'STALE' | 'CURRENT';
  /** Which SHA the project block records as the CI anchor. */
  readonly ci: 'STALE' | 'CURRENT' | 'MALFORMED';
  /**
   * VA-03: DIVERGENT leaves the task's validated anchor OFF HEAD's ancestry
   * (a real, well-formed commit that HEAD does not contain). Default ANCESTOR.
   */
  readonly anchor?: 'ANCESTOR' | 'DIVERGENT';
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
  if (options.anchor === 'DIVERGENT') {
    // The anchor commit stays in the object database but leaves HEAD's history.
    git(root, ['reset', '--quiet', '--hard', staleSha]);
  }

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

  if (options.taskStatus === 'COMPLETE') {
    for (const relative of ['.agent/ACTIVE_TASK.md', `.agent/tasks/${ACTIVE_TASK_ID}/STATE.md`]) {
      replaceFile(root, relative, (text) => text.replace(/^Status: IN_PROGRESS$/m, 'Status: COMPLETE'));
    }
  }
  fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), renderBlock('ONE', {
    liveTaskId: ACTIVE_TASK_ID,
    livePhase: 'test',
    liveTaskStatus: options.taskStatus === 'COMPLETE' ? 'COMPLETE' : 'IN_PROGRESS',
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
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'STALE', anchor: 'DIVERGENT' });
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
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'CURRENT', anchor: 'DIVERGENT' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(errorsOf(result)).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.9 an IN_PROGRESS task ahead of the baseline with an ancestor anchor is ATTENTION, not failure (VA-03)', () => {
    // The task validated a newer implementation than the project baseline and
    // its anchor is in HEAD's history: a task in flight legitimately runs
    // ahead. The check names both commits instead of forcing the anchors to be
    // back-dated to the baseline.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'CURRENT' });
    try {
      const result = run(fixture.root);
      // The synthetic baseline commit is itself documentation-only, so other
      // unrelated anchor guards may fire here; this case isolates the STALE
      // classification: the lag is NAMED as attention and is not the error.
      expect(errorsOf(result)).not.toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
      expect(result.stderr).toContain('ATTENTION: TASK_AHEAD_OF_PROJECT_BASELINE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.10 the same lag with an anchor OFF HEAD ancestry still fails (VA-03)', () => {
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'STALE', anchor: 'DIVERGENT' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(errorsOf(result)).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.12 a non-IN_PROGRESS task with an in-history anchor is STALE, not ATTENTION (R3-10)', () => {
    // R3-10: the A10 fixtures lost this pin. The ATTENTION classification is
    // only for a task IN FLIGHT; a COMPLETE/BLOCKED task whose baseline lags a
    // later implementation is a stale anchor and fails.
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'CURRENT', taskStatus: 'COMPLETE' });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(errorsOf(result)).toContain('PROJECT_STATE_SUBSTANTIVE_BASELINE_STALE');
      expect(result.stderr).not.toContain('ATTENTION: TASK_AHEAD_OF_PROJECT_BASELINE');
    } finally {
      fixture.cleanup();
    }
  });

  test('A10.11 a malformed substantive anchor never falls back to the live HEAD as the certified checkpoint (RV-08)', () => {
    for (const malformed of ['NONE', 'not-a-sha', 'HEAD']) {
      const fixture = makeFixture({ block: { lastSubstantiveImplementationSha: malformed } });
      try {
        const result = run(fixture.root);
        expect(result.status, malformed).not.toBe(0);
        expect(errorsOf(result), malformed).toContain('PROJECT_STATE_CERTIFIED_CHECKPOINT_UNRESOLVED');
      } finally {
        fixture.cleanup();
      }
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
    const fixture = makeBaselineFixture({ intervening: 'IMPLEMENTATION', substantive: 'STALE', ci: 'STALE', anchor: 'DIVERGENT' });
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

// ---------------------------------------------------------------------------
// F-12 — release definition and verdict (`nightwatch.release-certification.v1`).
//
// The ordered advance conditions must each resolve from a registered check; a
// condition with no backing check fails the definition itself. The verdict
// carries the three lane counts, binds evidence SHAs (stale evidence refuses
// the certification), excludes the external production track, and refuses an
// advance whose conditions are unmet, naming each. A surface presenting the
// status alone fails the render guard.
// ---------------------------------------------------------------------------

function liveDefinition(): ReleaseCertificationDefinition {
  const record = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/release-certification.v1.json'), 'utf8'));
  const parsed = parseReleaseCertificationDefinition(record);
  expect(parsed.ok).toBe(true);
  if (parsed.definition === null) throw new Error('LIVE_DEFINITION_INVALID');
  return parsed.definition;
}

function allMetOutputs(definition: ReleaseCertificationDefinition, except: string | null = null): Record<string, ReleaseCheckOutput> {
  const outputs: Record<string, ReleaseCheckOutput> = {};
  for (const condition of definition.conditions) {
    outputs[condition.check] = condition.id === except
      ? { state: 'UNMET', detail: 'forced unmet by the negative probe' }
      : { state: 'MET', detail: 'synthetic met' };
  }
  return outputs;
}

function evaluationInput(
  definition: ReleaseCertificationDefinition,
  overrides: Partial<Parameters<typeof evaluateReleaseCertification>[0]> = {},
): Parameters<typeof evaluateReleaseCertification>[0] {
  const certifiedCheckpointSha = (overrides.certifiedCheckpointSha as string | undefined) ?? '2'.repeat(40);
  return {
    definition,
    checkOutputs: allMetOutputs(definition),
    certifiedCheckpointSha,
    liveHeadSha: (overrides.liveHeadSha as string | undefined) ?? certifiedCheckpointSha,
    projectCompletionStatus: 'OPERATIONALLY_ACCEPTED',
    laneCounts: { proven: 7, externallyBlocked: 1, neverAttempted: 2, staleEvidence: 1 },
    externalTrack: { id: 'production-path', stages: ['C-12'], state: 'EXTERNAL_PREREQUISITE_UNMET', detail: 'synthetic' },
    // Tests bind every condition's evidence to the certified checkpoint so the
    // default "all MET" fixture remains exact unless a case overrides it.
    definitionDigest: 'sha256:0'.repeat(16),
    ...overrides,
    ...(overrides.resolveEvidenceRelation === undefined && overrides.definition === undefined
      ? {
          resolveEvidenceRelation: (resolved: string, checkpoint: string) =>
            resolved.toLowerCase() === checkpoint.toLowerCase() ? 'EXACT' as const : 'GIT_INDETERMINATE' as const,
        }
      : {}),
  };
}

/** Definition with every condition's evidence forced to the certified checkpoint. */
function definitionWithExactEvidence(
  definition: ReleaseCertificationDefinition,
  checkpoint: string,
): ReleaseCertificationDefinition {
  return {
    ...definition,
    conditions: definition.conditions.map((condition) => ({ ...condition, evidenceSha: checkpoint })),
  };
}

// ---------------------------------------------------------------------------
// R3-08 / corrections task 8.7 — the lane-artifact demotion and the
// non-certifying subject flag.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// R3-09 / corrections task 8.8 — only a certifying topology receipt counts.
// ---------------------------------------------------------------------------

test.describe('topology certification consumer (R3-09)', () => {
  const S = 'a'.repeat(40);
  const OTHER = 'b'.repeat(40);
  // R5-16: a topology receipt is admissible only when consistent and digest-sealed, exactly as the
  // gate emits it. `sealed` builds the same body the producer builds and seals it with the producer's digest.
  const sealed = (head: string, topologyClass: 'PROVEN' | 'PROVEN_DEGRADED', generatedAt = '2026-09-30T00:00:00.000Z') => {
    const proven = topologyClass === 'PROVEN';
    const body = {
      schemaVersion: 'nightwatch.gate-topology-receipt.v1',
      generatedAt,
      mode: 'all',
      lane: 'capability',
      runnerTopologyClass: topologyClass,
      gitHead: head,
      ciClaim: { runnerTopologyClass: topologyClass, runnerTopologyEnvelope: proven ? 'BUBBLEWRAP' : 'BWRAP_UNAVAILABLE_DEGRADED', unexercisedAbsences: proven ? [] : ['bwrap'], certifying: proven },
      findings: [],
      result: 'PASS',
    };
    return { ...body, receiptDigest: topologyReceiptDigest(body, (value) => createHash('sha256').update(value, 'utf8').digest('hex')) };
  };

  test('only a receipt bound to the checkpoint with certifying true certifies', () => {
    expect(topologyCertificationForCheckpoint([], S)).toMatchObject({ checked: false, certifying: false });
    const degraded = [sealed(S, 'PROVEN_DEGRADED')];
    expect(topologyCertificationForCheckpoint(degraded, S)).toMatchObject({ checked: true, certifying: false });
    expect(topologyCertificationForCheckpoint(degraded, S).detail).toContain('PROVEN_DEGRADED (non-certifying)');
    const proven = [sealed(S, 'PROVEN')];
    expect(topologyCertificationForCheckpoint(proven, S)).toMatchObject({ checked: true, certifying: true });
    // Another commit's receipt is not this checkpoint's evidence.
    expect(topologyCertificationForCheckpoint(degraded, OTHER)).toMatchObject({ checked: false, certifying: false });
    // The newest receipt for the checkpoint wins.
    const newest = [sealed(S, 'PROVEN_DEGRADED', '2026-01-01T00:00:00.000Z'), sealed(S, 'PROVEN', '2026-02-01T00:00:00.000Z')];
    expect(topologyCertificationForCheckpoint(newest, S)).toMatchObject({ certifying: true });
    // A malformed checkpoint never resolves.
    expect(topologyCertificationForCheckpoint(degraded, 'HEAD')).toMatchObject({ checked: false });
  });

  // R4-04 / review-4 task 1.4 + OD-6(b): certification is the CONJUNCTION of a
  // LOCAL PROVEN receipt at S and this CI execution at S. A missing or degraded
  // receipt is NOT MET (fail closed); it never falls through to MET, and the
  // detail never attributes a topology class to the CI run.
  test('a missing or degraded local receipt never falls through to MET', () => {
    const proven = topologyCertificationForCheckpoint([sealed(S, 'PROVEN')], S);
    const degradedTopology = topologyCertificationForCheckpoint([sealed(S, 'PROVEN_DEGRADED')], S);
    const absent = topologyCertificationForCheckpoint([], S);
    const ci = { ciStatus: 'EXECUTED_PASS', executedSha: S, checkpointSha: S, runId: 123, blockClass: 'NONE' };
    expect(topologyCertificationVerdict(proven, ci)).toMatchObject({ state: 'MET' });
    // The absent-receipt mutant from review-4: `checked:false` must NOT pass.
    expect(topologyCertificationVerdict(absent, ci).state).toBe('UNMET');
    expect(topologyCertificationVerdict(absent, ci).detail).toContain('TOPOLOGY_RECEIPT_ABSENT');
    expect(topologyCertificationVerdict(degradedTopology, ci).state).toBe('UNMET');
    expect(topologyCertificationVerdict(degradedTopology, ci).detail).toContain('TOPOLOGY_NOT_CERTIFYING');
    // The conjunction: a PROVEN local receipt without the exact-head CI half
    // (a missing status word, a different executed SHA, or a checkpoint the
    // executed SHA does not equal) is not MET either.
    expect(topologyCertificationVerdict(proven, { ...ci, ciStatus: 'NOT_OBSERVED' }).state).toBe('UNMET');
    expect(topologyCertificationVerdict(proven, { ...ci, executedSha: OTHER }).state).toBe('UNMET');
    expect(topologyCertificationVerdict(proven, { ...ci, checkpointSha: OTHER }).state).toBe('UNMET');
    expect(topologyCertificationVerdict(proven, { ...ci, ciStatus: null }).state).toBe('UNMET');
    // The MET detail names the LOCAL envelope proof and the CI run separately;
    // the CI half never claims a topology class.
    const met = topologyCertificationVerdict(proven, ci);
    expect(met.detail).toContain('local topology receipt PROVEN');
    expect(met.detail).toContain('block record 123');
  });
});

test.describe('lane artifact wiring and non-certifying subjects (R3-08)', () => {
  const S = 'a'.repeat(40);

  test('a PROVEN lane whose declared artifact is absent at its SHA is demoted; a present one is not', () => {
    const lanes = [{ laneId: 'lane-one', reportedClass: 'PROVEN' }, { laneId: 'lane-two', reportedClass: 'BLOCKED_EXTERNAL' }];
    const bindings = new Map([
      ['lane-one', { evidenceSha: S, artifactPaths: ['config/x.json'] }],
      ['lane-two', { evidenceSha: S, artifactPaths: ['config/y.json'] }],
    ]);
    const absent = laneArtifactDemotions(lanes, bindings, () => false);
    expect([...absent.demoted]).toEqual(['lane-one']);
    expect(absent.findings).toEqual([`EVIDENCE_ARTIFACT_ABSENT_AT_SHA:lane-one:config/x.json`]);
    expect(laneArtifactDemotions(lanes, bindings, () => true).demoted.size).toBe(0);
    // A throwing existence probe is ABSENT, never present.
    expect(laneArtifactDemotions(lanes, bindings, () => { throw new Error('probe failed'); }).demoted.has('lane-one')).toBe(true);
    // A lane with no bound SHA has no evidence to check.
    expect(laneArtifactDemotions(lanes, new Map([['lane-one', { evidenceSha: null, artifactPaths: ['config/x.json'] }]]), () => false).demoted.size).toBe(0);
  });

  test('a subject declared non-certifying can never resolve MET', () => {
    expect(RELEASE_CONDITION_STATES).toContain('EVIDENCE_NOT_CERTIFYING');
    const checkpoint = '2'.repeat(40);
    const definition = definitionWithExactEvidence(liveDefinition(), checkpoint);
    const target = definition.conditions[0] as { id: string };
    const digests = Object.fromEntries(definition.conditions.map((condition) => [condition.id, `receipt:sha256:${'1'.repeat(24)}`]));
    const verdict = evaluateReleaseCertification(evaluationInput(definition, {
      certifiedCheckpointSha: checkpoint,
      evidenceReceiptDigests: digests,
      verifyEvidenceReceipt: () => true,
      evidenceCertifying: { [target.id]: false },
    }));
    const condition = verdict.conditions.find((entry) => entry.id === target.id);
    expect(condition?.state).toBe('EVIDENCE_NOT_CERTIFYING');
    expect(condition?.checkState).toBe('MET');
    expect(verdict.conditionsMet).toBe(definition.conditions.length - 1);
    expect(verdict.certificationRefused).toBe(true);
  });
});

test.describe('RV-02 — a SHA without a receipt is a claim, not an observation', () => {
  test('exact evidence with a passing check but no receiptDigest is EVIDENCE_RECEIPT_ABSENT and refuses certification', () => {
    const checkpoint = '2'.repeat(40);
    const definition = definitionWithExactEvidence(liveDefinition(), checkpoint);
    const target = definition.conditions[0] as { id: string };
    const digests = Object.fromEntries(definition.conditions.map((condition) => [condition.id, `receipt:sha256:${'1'.repeat(24)}`]));
    const withReceipts = evaluateReleaseCertification(evaluationInput(definition, { certifiedCheckpointSha: checkpoint, evidenceReceiptDigests: digests }));
    expect(withReceipts.conditionsMet).toBe(definition.conditions.length);
    const without = evaluateReleaseCertification(evaluationInput(definition, {
      certifiedCheckpointSha: checkpoint,
      evidenceReceiptDigests: { ...digests, [target.id]: null },
    }));
    expect(without.conditions.find((entry) => entry.id === target.id)?.state).toBe('EVIDENCE_RECEIPT_ABSENT');
    expect(without.conditionsMet).toBe(definition.conditions.length - 1);
    expect(without.certificationRefused).toBe(true);
    expect(without.nonExactEvidenceConditions).toContain(target.id);
    // A missing map entry is a null digest (fail closed), not a pass.
    const { [target.id]: _dropped, ...partial } = digests;
    void _dropped;
    expect(evaluateReleaseCertification(evaluationInput(definition, { certifiedCheckpointSha: checkpoint, evidenceReceiptDigests: partial }))
      .conditions.find((entry) => entry.id === target.id)?.state).toBe('EVIDENCE_RECEIPT_ABSENT');
  });

  // R3-05 / corrections task 8.4: a fabricated digest must not flip the state.
  test('a receiptDigest that does not re-derive from a persisted receipt stays EVIDENCE_RECEIPT_ABSENT', () => {
    const checkpoint = '2'.repeat(40);
    const definition = definitionWithExactEvidence(liveDefinition(), checkpoint);
    const target = definition.conditions[0] as { id: string };
    const digests = Object.fromEntries(definition.conditions.map((condition) => [condition.id, `receipt:sha256:${'1'.repeat(24)}`]));
    const verdict = evaluateReleaseCertification(evaluationInput(definition, {
      certifiedCheckpointSha: checkpoint,
      evidenceReceiptDigests: digests,
      verifyEvidenceReceipt: (subject) => subject !== target.id,
    }));
    const condition = verdict.conditions.find((entry) => entry.id === target.id);
    expect(condition?.state).toBe('EVIDENCE_RECEIPT_ABSENT');
    expect(condition?.detail).toContain('does not re-derive from a persisted receipt');
    expect(verdict.conditionsMet).toBe(definition.conditions.length - 1);
    expect(verdict.certificationRefused).toBe(true);
  });

  test('a persisted receipt verifies only when subject, kind, schema, SHA, verdict, clean emit and digest all hold', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-receipt-verify-'));
    const sha = 'a'.repeat(40);
    const other = 'b'.repeat(40);
    try {
      // clean-receipt: order-preserving JSON.stringify over the body.
      fs.mkdirSync(path.join(root, 'artifacts/gate-receipts'), { recursive: true });
      const cleanBody = { schemaVersion: 'nightwatch.clean-checkout-receipt.v1', subject: 'clean-checkout', sourceHead: sha, sourceRootCleanAtEmit: true, gateResult: 'PASS', finalResult: 'PASS' };
      const cleanDigest = `clean-receipt:sha256:${createHash('sha256').update(JSON.stringify(cleanBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/gate-receipts/clean.json'), `${JSON.stringify({ ...cleanBody, receiptDigest: cleanDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'clean-checkout', cleanDigest, sha)).toEqual({ verified: true, reason: 'VERIFIED' });
      expect(verifyPersistedReceipt(root, 'clean-checkout', cleanDigest, other).verified).toBe(false);
      expect(verifyPersistedReceipt(root, 'clean-checkout', `clean-receipt:sha256:${'0'.repeat(24)}`, sha).verified).toBe(false);
      // R4-03: the subject -> receipt-kind mapping. A clean-checkout receipt
      // may certify ONLY the clean-checkout subject.
      expect(verifyPersistedReceipt(root, 'root-compile', cleanDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_KIND_MISMATCH' });
      // An invalid subject is refused before any scan.
      expect(verifyPersistedReceipt(root, 'NOT A SUBJECT', cleanDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_INVALID' });
      // receipt: stable-canonical body, gitHead-bound, subject-declaring.
      fs.mkdirSync(path.join(root, 'artifacts/receipts'), { recursive: true });
      // R5-03/R5-04: a gate receipt records the groups it EXECUTED and whether the
      // tree was clean at emit; a bare subject + PASS is not an executed record.
      const gateBody = { schemaVersion: 'nightwatch.quality-gate-receipt.v1', subject: 'authoritative-gate', gitHead: sha, finalResult: 'PASS', sourceRootCleanAtEmit: true, groupIds: ['STATIC'], groups: [{ id: 'STATIC', required: true, status: 'PASS' }] };
      const gateDigest = `receipt:sha256:${createHash('sha256').update(stableCanonical(gateBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/receipts/gate.json'), `${JSON.stringify({ ...gateBody, receiptDigest: gateDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', gateDigest, sha).verified).toBe(true);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', gateDigest, other).verified).toBe(false);
      // R4-03: a receipt that declares ANOTHER subject never certifies this one.
      expect(verifyPersistedReceipt(root, 'ui-error-taxonomy-rendering', gateDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_MISMATCH:authoritative-gate' });
      // R5-04: a subject NO gate-kind schema certifies is refused at the kind (the
      // gate subject set is closed, no longer `null`).
      // `root-compile` is certifiable now (review-5 B2.1); `owner-manual` is the declared subject no schema certifies.
      expect(verifyPersistedReceipt(root, 'owner-manual', gateDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_KIND_MISMATCH' });
      // R5-03: the same executed receipt emitted from a DIRTY (or unmeasured) tree
      // verifies for nothing; R5-04: so does one that names a subject its producer
      // never certifies, and one that records no executed group.
      const persistGate = (name: string, body: Record<string, unknown>): string => {
        const digest = `receipt:sha256:${createHash('sha256').update(stableCanonical(body)).digest('hex').slice(0, 24)}`;
        fs.writeFileSync(path.join(root, `artifacts/receipts/${name}.json`), `${JSON.stringify({ ...body, receiptDigest: digest })}\n`);
        return digest;
      };
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('dirty-gate', { ...gateBody, sourceRootCleanAtEmit: false }), sha)).toEqual({ verified: false, reason: 'RECEIPT_CLEAN_EMIT_UNPROVEN' });
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('unmeasured-gate', { ...gateBody, sourceRootCleanAtEmit: null }), sha)).toEqual({ verified: false, reason: 'RECEIPT_CLEAN_EMIT_UNPROVEN' });
      const { sourceRootCleanAtEmit: _omitted, ...withoutCleanField } = gateBody;
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('no-clean-field-gate', withoutCleanField), sha).verified).toBe(false);
      const foreignDigest = persistGate('foreign-gate', { ...gateBody, subjects: ['autonomous-yield-proof'] });
      expect(verifyPersistedReceipt(root, 'authoritative-gate', foreignDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_NOT_CERTIFIABLE:autonomous-yield-proof' });
      expect(verifyPersistedReceipt(root, 'autonomous-yield-proof', foreignDigest, sha).verified).toBe(false);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('unexecuted-gate', { ...gateBody, groups: [], groupIds: [] }), sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_NOT_EXECUTED:authoritative-gate' });
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('failed-group-gate', { ...gateBody, groups: [{ id: 'STATIC', required: true, status: 'TEST_FAILURE' }] }), sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_NOT_EXECUTED:authoritative-gate' });
      expect(verifyPersistedReceipt(root, 'authoritative-gate', persistGate('mismatched-ids-gate', { ...gateBody, groupIds: ['OTHER'] }), sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_NOT_EXECUTED:authoritative-gate' });
      // R4-03: a hand-written FAIL receipt with a correctly recomputed digest
      // still never verifies — the verdict is part of the check.
      const failBody = { ...gateBody, finalResult: 'FAIL' };
      const failDigest = `receipt:sha256:${createHash('sha256').update(stableCanonical(failBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/receipts/fail.json'), `${JSON.stringify({ ...failBody, receiptDigest: failDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', failDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_VERDICT_NOT_PASS:finalResult=FAIL' });
      // R4-03: a subject-less receipt verifies for NOTHING (fail closed).
      const anonymousBody = { schemaVersion: 'nightwatch.quality-gate-receipt.v1', gitHead: sha, finalResult: 'PASS' };
      const anonymousDigest = `receipt:sha256:${createHash('sha256').update(stableCanonical(anonymousBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/receipts/anonymous.json'), `${JSON.stringify({ ...anonymousBody, receiptDigest: anonymousDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', anonymousDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SUBJECT_ABSENT' });
      // R4-03: the schema is checked against the kind's declared schemas.
      const unknownSchemaBody = { ...gateBody, schemaVersion: 'nightwatch.other-receipt.v1' };
      const unknownSchemaDigest = `receipt:sha256:${createHash('sha256').update(stableCanonical(unknownSchemaBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/receipts/unknown-schema.json'), `${JSON.stringify({ ...unknownSchemaBody, receiptDigest: unknownSchemaDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'authoritative-gate', unknownSchemaDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_SCHEMA_UNSUPPORTED:nightwatch.other-receipt.v1' });
      // A clean receipt whose clean flag is false is not clean evidence.
      const dirtyBody = { ...cleanBody, sourceRootCleanAtEmit: false };
      const dirtyDigest = `clean-receipt:sha256:${createHash('sha256').update(JSON.stringify(dirtyBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/gate-receipts/dirty.json'), `${JSON.stringify({ ...dirtyBody, receiptDigest: dirtyDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'clean-checkout', dirtyDigest, sha)).toEqual({ verified: false, reason: 'RECEIPT_CLEAN_EMIT_UNPROVEN' });
      // A clean receipt whose verdict is not PASS is not evidence either.
      const cleanFailBody = { ...cleanBody, finalResult: 'FAIL' };
      const cleanFailDigest = `clean-receipt:sha256:${createHash('sha256').update(JSON.stringify(cleanFailBody)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(root, 'artifacts/gate-receipts/clean-fail.json'), `${JSON.stringify({ ...cleanFailBody, receiptDigest: cleanFailDigest })}\n`);
      expect(verifyPersistedReceipt(root, 'clean-checkout', cleanFailDigest, sha).verified).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('F-12 release definition and verdict', () => {
  test('the live definition is ordered, fully backed and excludes the production track', () => {
    const definition = liveDefinition();
    expect(definition.schemaVersion).toBe(RELEASE_CERTIFICATION_VERSION);
    expect(definition.conditions).toHaveLength(16);
    expect(definition.conditions.map((condition) => condition.order)).toEqual([...Array(16)].map((_, index) => index + 1));
    expect(new Set(definition.conditions.map((condition) => condition.id)).size).toBe(16);
    const registered = new Set(RELEASE_ADVANCE_CHECKS.map((check) => check.id));
    for (const condition of definition.conditions) {
      expect(registered.has(condition.check), condition.id).toBe(true);
    }
    expect(definition.conditions.some((condition) => definition.externalTrack.checks.includes(condition.check))).toBe(false);
    expect(definition.conditions.some((condition) => definition.externalTrack.stages.includes(condition.id))).toBe(false);
    // A-19: owner decision 13.8 is TAKEN and represented faithfully, citing
    // its decisions.md record; the safe default is unchanged.
    expect(definition.nextStatus.state).toBe('DECIDED');
    expect(definition.nextStatus.decidedBy).toBe('D-129');
    expect(definition.nextStatus.ownerDecision).toBe('13.8');
    expect(definition.nextStatus.safeDefault).toBe('OPERATIONALLY_ACCEPTED');
    expect(definition.advanceStatuses).toContain('PROJECT_COMPLETE_AND_CI_CERTIFIED');
  });

  test('a condition naming no registered check fails the definition itself', () => {
    const record = JSON.parse(JSON.stringify(liveDefinition()));
    record.conditions[0].check = 'no-such-check';
    const parsed = parseReleaseCertificationDefinition(record);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.map((error) => error.code)).toContain('RELEASE_DEFINITION_CHECK_UNBACKED');
  });

  test('A-19 — a DECIDED next status requires its decisions.md record, and a pending one cannot cite one', () => {
    const decided = JSON.parse(JSON.stringify(liveDefinition()));
    decided.nextStatus.state = 'DECIDED';
    decided.nextStatus.decidedBy = 'D-129';
    expect(parseReleaseCertificationDefinition(decided).ok).toBe(true);
    const withoutRef = JSON.parse(JSON.stringify(decided));
    delete withoutRef.nextStatus.decidedBy;
    expect(parseReleaseCertificationDefinition(withoutRef).errors.map((error) => error.code))
      .toContain('RELEASE_DEFINITION_NEXT_STATUS_DECISION_REF');
    const malformedRef = JSON.parse(JSON.stringify(decided));
    malformedRef.nextStatus.decidedBy = '13.8';
    expect(parseReleaseCertificationDefinition(malformedRef).errors.map((error) => error.code))
      .toContain('RELEASE_DEFINITION_NEXT_STATUS_DECISION_REF');
    const pendingWithRef = JSON.parse(JSON.stringify(decided));
    pendingWithRef.nextStatus.state = 'PENDING_OWNER_DECISION';
    expect(parseReleaseCertificationDefinition(pendingWithRef).errors.map((error) => error.code))
      .toContain('RELEASE_DEFINITION_NEXT_STATUS_DECIDED_BY_UNEXPECTED');
    const unknownState = JSON.parse(JSON.stringify(decided));
    unknownState.nextStatus.state = 'SETTLED';
    expect(parseReleaseCertificationDefinition(unknownState).errors.map((error) => error.code))
      .toContain('RELEASE_DEFINITION_NEXT_STATUS_STATE');
  });

  test('a production-track check can never be an advance condition', () => {
    const record = JSON.parse(JSON.stringify(liveDefinition()));
    record.conditions[0].check = 'production-track-status';
    const parsed = parseReleaseCertificationDefinition(record);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.map((error) => error.code)).toContain('RELEASE_DEFINITION_PRODUCTION_CONDITION');
  });

  test('the verdict carries the three lane counts and the pending next status', () => {
    const checkpoint = '2'.repeat(40);
    const definition = definitionWithExactEvidence(liveDefinition(), checkpoint);
    const verdict = evaluateReleaseCertification(evaluationInput(definition));
    expect(verdict.laneCounts).toEqual({ proven: 7, externallyBlocked: 1, neverAttempted: 2, staleEvidence: 1 });
    expect(verdict.nextStatus.state).toBe('DECIDED');
    expect(verdict.nextStatus.safeDefault).toBe('OPERATIONALLY_ACCEPTED');
    expect(verdict.conditionsMet).toBe(16);
    expect(verdict.advanceClaimed).toBe(false);
    expect(verdict.advanceRefused).toBe(false);
    expect(verdict.certificationRefused).toBe(false);
    expect(verdict.evaluationDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(verdict.nonExactEvidenceConditions).toEqual([]);
    for (const condition of verdict.conditions) {
      expect(condition.checkState).toBe('MET');
      expect(condition.evidenceRelation).toBe('EXACT');
      expect(condition.state).toBe('MET');
    }
  });

  test('NW-AUD-010: absent evidence cannot leave a raw MET condition effectively met', () => {
    const definition = liveDefinition();
    const input = evaluationInput(definition, { resolveEvidenceRelation: () => 'EXACT' });
    const withNull = {
      ...input,
      definition: {
        ...definition,
        conditions: definition.conditions.map((condition, index) =>
          index === 0 ? { ...condition, evidenceSha: null } : { ...condition, evidenceSha: input.certifiedCheckpointSha as string }),
      },
    };
    const verdict = evaluateReleaseCertification(withNull);
    const target = verdict.conditions[0];
    expect(target?.checkState).toBe('MET');
    expect(target?.evidenceRelation).toBeNull();
    expect(target?.state).toBe('EVIDENCE_ABSENT');
    expect(verdict.conditionsMet).toBe(15);
    expect(verdict.certificationRefused).toBe(true);
    expect(verdict.nonExactEvidenceConditions).toContain(target?.id);
  });

  test('NW-AUD-010: future, divergent, missing and indeterminate evidence are distinct non-certifying states', () => {
    const definition = liveDefinition();
    const checkpoint = '2'.repeat(40);
    const base = evaluationInput(definitionWithExactEvidence(definition, checkpoint), {
      projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
    });
    const cases: Array<{ relation: 'FUTURE_DESCENDANT' | 'DIVERGENT' | 'OBJECT_MISSING' | 'GIT_INDETERMINATE'; state: string }> = [
      { relation: 'FUTURE_DESCENDANT', state: 'EVIDENCE_FUTURE' },
      { relation: 'DIVERGENT', state: 'EVIDENCE_DIVERGENT' },
      { relation: 'OBJECT_MISSING', state: 'EVIDENCE_UNRESOLVED' },
      { relation: 'GIT_INDETERMINATE', state: 'EVIDENCE_UNRESOLVED' },
    ];
    for (const { relation, state } of cases) {
      const verdict = evaluateReleaseCertification({
        ...base,
        resolveEvidenceRelation: (_resolved, _checkpoint) => relation,
      });
      const target = verdict.conditions[0];
      expect(target?.checkState, relation).toBe('MET');
      expect(target?.evidenceRelation, relation).toBe(relation);
      expect(target?.state, relation).toBe(state);
      expect(verdict.certificationRefused, relation).toBe(true);
      expect(verdict.advanceRefused, relation).toBe(true);
      expect(verdict.conditionsMet, relation).toBe(0);
    }
  });

  test('NW-AUD-010: exact evidence does not upgrade an unmet check', () => {
    const definition = liveDefinition();
    const checkpoint = '2'.repeat(40);
    const verdict = evaluateReleaseCertification(evaluationInput(definitionWithExactEvidence(definition, checkpoint), {
      checkOutputs: allMetOutputs(definition, definition.conditions[0]?.id ?? ''),
      resolveEvidenceRelation: () => 'EXACT',
    }));
    const target = verdict.conditions[0];
    expect(target?.evidenceRelation).toBe('EXACT');
    expect(target?.state).toBe('UNMET');
    expect(verdict.conditionsMet).toBe(15);
    expect(verdict.nonExactEvidenceConditions).toEqual([]);
  });

  test('NW-AUD-010: evaluation digest changes when relations or effective states change', () => {
    const definition = liveDefinition();
    const checkpoint = '2'.repeat(40);
    const exact = definitionWithExactEvidence(definition, checkpoint);
    const a = evaluateReleaseCertification(evaluationInput(exact));
    const b = evaluateReleaseCertification(evaluationInput(exact, {
      resolveEvidenceRelation: () => 'DIVERGENT',
    }));
    const c = evaluateReleaseCertification(evaluationInput(exact, {
      definitionDigest: 'sha256:1'.repeat(16),
    }));
    expect(a.evaluationDigest).not.toBe(b.evaluationDigest);
    expect(a.evaluationDigest).not.toBe(c.evaluationDigest);
    expect(a.evaluationDigest).toBe(evaluateReleaseCertification(evaluationInput(exact)).evaluationDigest);
  });

  test('an advance with exactly one unmet condition is refused naming only that condition', () => {
    const definition = liveDefinition();
    const checkpoint = '2'.repeat(40);
    const exact = definitionWithExactEvidence(definition, checkpoint);
    const target = exact.conditions[4];
    if (target === undefined) throw new Error('CONDITION_FIXTURE_MISSING');
    const verdict = evaluateReleaseCertification(evaluationInput(exact, {
      checkOutputs: allMetOutputs(exact, target.id),
      projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
      resolveEvidenceRelation: () => 'EXACT',
    }));
    expect(verdict.advanceClaimed).toBe(true);
    expect(verdict.advanceRefused).toBe(true);
    expect(verdict.conditionsUnmet).toBe(1);
    expect(verdict.certificationRefused).toBe(false);
    expect(verdict.conditions.filter((condition) => condition.state !== 'MET').map((condition) => condition.id)).toEqual([target.id]);
  });

  test('evidence preceding the certified checkpoint reports STALE_EVIDENCE and refuses the certification', () => {
    const ancestor = '1'.repeat(40);
    const checkpoint = '2'.repeat(40);
    const definition = liveDefinition();
    const record = JSON.parse(JSON.stringify(definition));
    record.conditions.forEach((condition: { evidenceSha: string }, index: number) => {
      condition.evidenceSha = index === 0 ? ancestor : checkpoint;
    });
    const parsed = parseReleaseCertificationDefinition(record);
    if (parsed.definition === null) throw new Error('DEFINITION_FIXTURE_INVALID');
    const verdict = evaluateReleaseCertification(evaluationInput(parsed.definition, {
      projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
      resolveEvidenceRelation: (resolved, target) => {
        if (resolved === ancestor && target === checkpoint) return 'STALE_ANCESTOR';
        return resolved === target ? 'EXACT' : 'GIT_INDETERMINATE';
      },
    }));
    const stale = verdict.conditions.filter((condition) => condition.staleEvidence);
    expect(stale).toHaveLength(1);
    expect(stale[0]?.id).toBe(parsed.definition.conditions[0]?.id);
    expect(stale[0]?.checkState).toBe('MET');
    expect(stale[0]?.evidenceRelation).toBe('STALE_ANCESTOR');
    expect(stale[0]?.state).toBe('STALE_EVIDENCE');
    expect(verdict.certificationRefused).toBe(true);
    expect(verdict.advanceRefused).toBe(true);
    expect(verdict.staleEvidenceConditions).toEqual([parsed.definition.conditions[0]?.id]);
  });

  test('VB-02: an artifact absent at the bound SHA makes only that condition EVIDENCE_ARTIFACT_ABSENT_AT_SHA', () => {
    // Spec scenario (completion-correction-certification): a binding cites
    // SHA X and its artifact was first added in a descendant of X.
    const definition = definitionWithExactEvidence(liveDefinition(), '2'.repeat(40));
    const first = definition.conditions[0];
    const second = definition.conditions[1];
    if (first === undefined || second === undefined) throw new Error('CONDITION_FIXTURE_MISSING');
    const verdict = evaluateReleaseCertification(evaluationInput(definition, {
      resolveEvidenceArtifactAtSha: (resolved: string, artifactPath: string) =>
        // the first condition's declared artifact is absent at its bound SHA
        !(resolved === first.evidenceSha && artifactPath === 'config/honest-report.json'),
      evidenceArtifactPaths: {
        [first.id]: ['config/honest-report.json'],
        [second.id]: ['config/other-report.json'],
      },
    }));
    const target = verdict.conditions[0];
    const other = verdict.conditions[1];
    expect(target?.state).toBe('EVIDENCE_ARTIFACT_ABSENT_AT_SHA');
    expect(target?.detail).toContain('config/honest-report.json absent at bound SHA');
    expect(target?.checkState).toBe('MET'); // the check itself still ran
    expect(other?.state).toBe('MET'); // only the cited condition is affected
    expect(verdict.certificationRefused).toBe(true);
    expect(verdict.conditionsMet).toBe(definition.conditions.length - 1);
  });

  test('VB-02: a present artifact set leaves the condition MET, and a throw fails closed to ABSENT', () => {
    const definition = definitionWithExactEvidence(liveDefinition(), '2'.repeat(40));
    const first = definition.conditions[0];
    if (first === undefined) throw new Error('CONDITION_FIXTURE_MISSING');
    const present = evaluateReleaseCertification(evaluationInput(definition, {
      resolveEvidenceArtifactAtSha: () => true,
      evidenceArtifactPaths: { [first.id]: ['config/honest-report.json'] },
    }));
    expect(present.conditions[0]?.state).toBe('MET');
    const throwing = evaluateReleaseCertification(evaluationInput(definition, {
      resolveEvidenceArtifactAtSha: () => { throw new Error('PROBE_REFUSED'); },
      evidenceArtifactPaths: { [first.id]: ['config/honest-report.json'] },
    }));
    expect(throwing.conditions[0]?.state).toBe('EVIDENCE_ARTIFACT_ABSENT_AT_SHA');
  });

  test('a surface presenting the status alone fails the render guard', () => {
    const bare = `Project completion status: OPERATIONALLY_ACCEPTED <!--${RELEASE_VERDICT_STATUS_MARKER}OPERATIONALLY_ACCEPTED-->`;
    expect(checkVerdictPresentation(bare)).toEqual([...RELEASE_VERDICT_COUNT_MARKERS]);
    const complete = `${bare}\n${RELEASE_VERDICT_COUNT_MARKERS.map((marker) => `<!--${marker}0-->`).join('\n')}`;
    expect(checkVerdictPresentation(complete)).toEqual([]);
    expect(checkVerdictPresentation('no status here')).toEqual([]);
  });

  test('the live presentation surfaces carry the counts with the status', () => {
    for (const surface of ['README.md', 'docs/RELEASE-ADVANCE-CONDITIONS.md'] as const) {
      const text = fs.readFileSync(path.join(process.cwd(), surface), 'utf8');
      expect(text, surface).toContain(RELEASE_VERDICT_STATUS_MARKER);
      expect(checkVerdictPresentation(text), surface).toEqual([]);
    }
  });
});

test.describe('F-12 project:check release certification', () => {
  function rewriteCertification(root: string, mutate: (record: Record<string, unknown>) => void): void {
    const file = path.join(root, 'config/release-certification.v1.json');
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    mutate(record as Record<string, unknown>);
    fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
    // VB-05: the fixture registry mirrors the definition's evidence — a
    // mutation to a condition's evidenceSha re-binds the same subject so the
    // closed window still resolves the TESTED value (HEAD, a missing object,
    // a divergent SHA...), not the stale registry copy.
    const bindingsFile = path.join(root, 'config/release-evidence.v1.json');
    try {
      const registry = JSON.parse(fs.readFileSync(bindingsFile, 'utf8')) as {
        bindings: Array<{ subject: string; evidenceSha: string | null }>;
      };
      const conditions = (record.conditions ?? []) as Array<{ id: string; evidenceSha: string | null }>;
      for (const binding of registry.bindings) {
        const condition = conditions.find((entry) => entry.id === binding.subject);
        if (condition !== undefined) binding.evidenceSha = condition.evidenceSha ?? null;
      }
      fs.writeFileSync(bindingsFile, `${JSON.stringify(registry, null, 2)}\n`);
    } catch {
      // A fixture without the registry keeps its own failure mode.
    }
  }

  function rewriteBlockFor(root: string, replacements: Record<string, string>): void {
    const file = path.join(root, 'docs/CURRENT_STATE.md');
    let text = fs.readFileSync(file, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`^${key}: .*$`, 'm'), `${key}: ${value}`);
    }
    fs.writeFileSync(file, text);
    git(root, ['add', '--all']);
    git(root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'rewrite block']);
  }

  test('R1. a PASS receipt carries the verdict with the lane counts and every condition', () => {
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout) as {
        releaseVerdict: {
          schemaVersion: string;
          laneCounts: Record<string, number>;
          conditions: unknown[];
          nextStatus: { state: string; safeDefault: string };
          advanceClaimed: boolean;
          externalTrack: { state: string };
        };
      };
      expect(output.releaseVerdict.schemaVersion).toBe('nightwatch.release-certification.v1');
      expect(output.releaseVerdict.laneCounts).toEqual({ proven: 0, externallyBlocked: 0, neverAttempted: 0, staleEvidence: 0 });
      expect(output.releaseVerdict.conditions).toHaveLength(16);
      expect(output.releaseVerdict.nextStatus.state).toBe('DECIDED');
      expect(output.releaseVerdict.nextStatus.safeDefault).toBe('OPERATIONALLY_ACCEPTED');
      expect(output.releaseVerdict.advanceClaimed).toBe(false);
      expect(output.releaseVerdict.externalTrack.state).toBe('UNAVAILABLE_CAPABILITY');
    } finally {
      fixture.cleanup();
    }
  });

  test('R2. an advance status with unmet conditions is refused, naming each condition', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_ADVANCE_CONDITION_UNMET: validation-lane-closure');
      expect(result.stderr).toContain('PROJECT_STATE_ADVANCE_CONDITION_UNMET: exact-head-ci-authority');
      expect(result.stderr).toContain('PROJECT_STATE_ADVANCE_CONDITION_UNMET: authenticated-capability-lifecycle');
    } finally {
      fixture.cleanup();
    }
  });

  test('R3. a condition with no backing check fails the definition itself', () => {
    const fixture = makeFixture({ activeTaskStatus: 'in_progress' });
    try {
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ check: string }>;
        if (conditions[0] !== undefined) conditions[0].check = 'no-such-check';
      });
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'unbacked condition probe']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_RELEASE_DEFINITION_CHECK_UNBACKED');
    } finally {
      fixture.cleanup();
    }
  });

  test('R4. stale condition evidence refuses an advance and names the condition', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      const ancestor = git(fixture.root, ['rev-parse', 'HEAD~1']);
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = ancestor;
      });
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'stale evidence probe']);
      // R3-04 / corrections task 8.3: the anchor is a real commit; bind it to
      // the probe commit so the evidence stays an ancestor of it.
      const probe = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteBlockFor(fixture.root, { LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: probe });
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_STALE_EVIDENCE: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });

  test('R5. a presentation surface presenting the status alone fails the render guard', () => {
    const fixture = makeFixture({ activeTaskStatus: 'in_progress' });
    try {
      fs.writeFileSync(
        path.join(fixture.root, 'docs/RELEASE-ADVANCE-CONDITIONS.md'),
        `Bare status <!--status:PROJECT_COMPLETION_STATUS=OPERATIONALLY_ACCEPTED-->\n`,
      );
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'bare verdict surface probe']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_VERDICT_PRESENTED_BARE');
    } finally {
      fixture.cleanup();
    }
  });

  test('R6. a documentation-only commit is refused as the implementation anchor', () => {
    const fixture = makeFixture();
    try {
      fs.writeFileSync(path.join(fixture.root, 'docs/ROADMAP.md'), '# Roadmap\n\nsynthetic documentation-only descendant\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'documentation-only descendant']);
      const docsOnly = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteBlockFor(fixture.root, {
        LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: docsOnly,
        LAST_LOCALLY_VALIDATED_SHA: docsOnly,
        LAST_CLEAN_VALIDATED_SHA: docsOnly,
      });
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_IMPLEMENTATION_ANCHOR_DOCUMENTATION_ONLY');
    } finally {
      fixture.cleanup();
    }
  });

  test('NW-AUD-010 matrix. future (strict descendant) evidence refuses with EVIDENCE_FUTURE', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      const checkpoint = git(fixture.root, ['rev-parse', 'HEAD']);
      fs.writeFileSync(path.join(fixture.root, 'future.txt'), 'future\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'descendant evidence']);
      const descendant = git(fixture.root, ['rev-parse', 'HEAD']);
      expect(descendant).not.toBe(checkpoint);
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = descendant;
      });
      // rewriteBlockFor stages and commits every outstanding change.
      rewriteBlockFor(fixture.root, { LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: checkpoint });
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EVIDENCE_FUTURE: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_STALE_EVIDENCE: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_DIVERGENT: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });

  test('NW-AUD-010 matrix. divergent side-branch evidence refuses with EVIDENCE_DIVERGENT', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      // Build two children of a common parent: side evidence and the certified
      // main-line checkpoint must be siblings, not ancestor/descendant.
      const parent = git(fixture.root, ['rev-parse', 'HEAD']);
      git(fixture.root, ['checkout', '--quiet', '-b', 'side-evidence']);
      fs.writeFileSync(path.join(fixture.root, 'side.txt'), 'side\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'side evidence']);
      const side = git(fixture.root, ['rev-parse', 'HEAD']);
      git(fixture.root, ['checkout', '--quiet', 'main']);
      fs.writeFileSync(path.join(fixture.root, 'mainline.txt'), 'mainline\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'mainline evidence']);
      const mainTip = git(fixture.root, ['rev-parse', 'HEAD']);
      expect(mainTip).not.toBe(parent);
      expect(side).not.toBe(mainTip);
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = side;
      });
      rewriteBlockFor(fixture.root, { LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: mainTip });
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EVIDENCE_DIVERGENT: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_STALE_EVIDENCE: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_FUTURE: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });

  test('NW-AUD-010 matrix. missing object evidence refuses with EVIDENCE_UNRESOLVED', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = 'a'.repeat(40);
      });
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'missing object probe']);
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_EVIDENCE_UNRESOLVED: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_DIVERGENT: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });

  test('VB-05: the literal HEAD is refused as self-certifying evidence, never resolved to the live HEAD', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      const checkpoint = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = 'HEAD';
      });
      rewriteBlockFor(fixture.root, { LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: checkpoint });
      fs.writeFileSync(path.join(fixture.root, 'after-head.txt'), 'after\n');
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'head advances past checkpoint']);
      const result = run(fixture.root);
      // VB-05 (corrections task 2.5): the definition parser rejects the HEAD
      // marker outright — the same fixture that used to resolve HEAD to the
      // live tip (self-certifying EXACT/FUTURE) now fails validation.
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('RELEASE_DEFINITION_CONDITION_EVIDENCE_SHA');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_FUTURE: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });

  test('VB-05: HEAD never resolves to the live HEAD — the strict resolver fails it closed to ABSENT (pure)', () => {
    // The old behavior resolved `HEAD` to the captured live tip: a
    // self-certifying evidence token that could make a condition EXACT (or
    // FUTURE) depending on where HEAD happened to be. VB-05 makes HEAD
    // invalid everywhere; the strict pass-through fails it closed to ABSENT
    // (no bound evidence resolves) and the definition parser rejects it.
    const checkpoint = '2'.repeat(40);
    const withHead = {
      ...liveDefinition(),
      conditions: liveDefinition().conditions.map((condition, index) =>
        index === 0 ? { ...condition, evidenceSha: 'HEAD' } : condition),
    };
    const verdict = evaluateReleaseCertification(evaluationInput(withHead, {
      liveHeadSha: '3'.repeat(40),
      certifiedCheckpointSha: checkpoint,
      resolveEvidenceRelation: () => 'EXACT',
    }));
    // Nothing resolves: the HEAD token never becomes a live SHA...
    expect(verdict.conditions[0]?.resolvedEvidenceSha).toBeNull();
    // ...so the raw MET check is reported EVIDENCE_ABSENT (never EXACT).
    expect(verdict.conditions[0]?.state).toBe('EVIDENCE_ABSENT');
    expect(verdict.certificationRefused).toBe(true);
    // And the definition parser refuses the marker outright.
    const record = JSON.parse(JSON.stringify(withHead));
    expect(parseReleaseCertificationDefinition(record).ok).toBe(false);
    expect(parseReleaseCertificationDefinition(record).errors.map((error) => error.code))
      .toContain('RELEASE_DEFINITION_CONDITION_EVIDENCE_SHA');
  });

  test('NW-AUD-010 matrix. exact checkpoint evidence does not emit an evidence failure for that condition under advance', () => {
    const fixture = makeFixture({
      activeTaskStatus: 'in_progress',
      block: { projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED' },
    });
    try {
      const checkpoint = git(fixture.root, ['rev-parse', 'HEAD']);
      rewriteCertification(fixture.root, (record) => {
        const conditions = record.conditions as Array<{ id: string; evidenceSha: string | null }>;
        const target = conditions.find((condition) => condition.id === 'completion-ledger-truth');
        if (target !== undefined) target.evidenceSha = checkpoint;
      });
      rewriteBlockFor(fixture.root, { LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: checkpoint });
      const result = run(fixture.root);
      expect(result.stderr).not.toContain('PROJECT_STATE_STALE_EVIDENCE: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_FUTURE: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_DIVERGENT: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_UNRESOLVED: completion-ledger-truth');
      expect(result.stderr).not.toContain('PROJECT_STATE_EVIDENCE_ABSENT: completion-ledger-truth');
    } finally {
      fixture.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// 5.1 (A-02 / D-01) — the seven release probes are wired.
//
// The implemented flag may only claim what the collector carries: every
// RELEASE_ADVANCE_CHECKS entry must resolve a real probe output instead of
// the registered-but-unbacked "capability is created by GX" message, and the
// real tree must produce each probe's environment-independent facts.
// ---------------------------------------------------------------------------

test.describe('release probe wiring (M4 task 5.1, corrected by VD-01..VD-05)', () => {
  const REPO_ROOT = path.join(__dirname, '..', '..');
  /** The seven checks design D3 binds to the certified checkpoint. */
  const D3_BOUND_CHECKS = [
    'dead-architecture-closure-check',
    'schema-version-lifecycle-check',
    'ui-error-taxonomy-check',
    'configuration-contract-check',
    'authenticated-capability-lifecycle-check',
    'yield-campaign-result',
    'accessibility-certification',
    // R3-04 / corrections task 8.3: the nine working-tree probes are bound
    // through the same checkpoint relation.
    'validation-lane-state',
    'ci-block-record',
    'ledger-agreement',
    'operator-cli-sweep',
    'documentation-currency-rules',
    'workspace-claims',
    'dependency-advisory-lane',
    'cli-implementation-contract',
    'structural-rule-registry',
  ] as const;

  test('every registered release check is implemented and resolves to probe output on the real tree', () => {
    const unwired = RELEASE_ADVANCE_CHECKS.filter((check) => !check.implemented).map((check) => check.id);
    expect(unwired).toEqual([]);
    // The agreement between the registry's `implemented` flags and the
    // collector's output keys, and the D3 checkpoint binding of each probe, are
    // enforced structurally by hardening:check (checkReleaseImplementedHonesty,
    // mutation-probed by HC-148 and HC-189..HC-192); the real-tree evaluation
    // below proves every registered check resolves to probe output.
  });

  test('the real-tree evaluation resolves every check to probe output, and no D3 probe is MET away from the certified checkpoint', () => {
    const result = spawnSync(process.execPath, [CHECKER, '--root', REPO_ROOT], { encoding: 'utf8', timeout: 300_000 });
    // A failing evaluation (a dirty working tree) prints the verdict on
    // stderr; a passing one prints it on stdout with the JSON receipt.
    const output = `${result.stdout}${result.stderr}`;
    expect(output).not.toBe('');
    expect(output).not.toContain('the check is not present at this checkpoint');
    const states = new Map<string, string>();
    const checkStates = new Map<string, string>();
    let checkpoint = '';
    // A passing (clean-tree) evaluation prints the JSON receipt on stdout; a
    // failing one prints the text verdict on stderr. Read whichever exists.
    let receipt: { releaseVerdict?: { certifiedCheckpointSha?: string; conditions?: Array<{ id: string; state: string }> } } | null = null;
    try {
      receipt = JSON.parse(result.stdout);
    } catch {
      receipt = null;
    }
    if (receipt?.releaseVerdict?.conditions !== undefined) {
      checkpoint = receipt.releaseVerdict.certifiedCheckpointSha ?? '';
      for (const condition of receipt.releaseVerdict.conditions) {
        states.set(condition.id, condition.state);
        const checkState = (condition as { checkState?: string }).checkState;
        if (typeof checkState === 'string') checkStates.set(condition.id, checkState);
      }
    } else {
      checkpoint = /^checkpoint (\S+)/m.exec(output)?.[1] ?? '';
      for (const line of output.split('\n')) {
        const match = /^\s+\d+ (\S+) state=(\S+) check=(\S+)/.exec(line);
        if (match !== null) {
          states.set(match[1] as string, match[2] as string);
          checkStates.set(match[1] as string, match[3] as string);
        }
        if (line.includes('state=')) expect(line).not.toContain('is registered and its capability is created by');
      }
    }
    expect(states.size).toBe(16);
    for (const state of states.values()) expect((RELEASE_CONDITION_STATES as readonly string[]).includes(state)).toBe(true);
    // VD-01: a D3 probe resolves MET only at the certified checkpoint with a
    // clean tree — where "at the checkpoint" is EXACTLY the production
    // classifier's answer: HEAD == S, or a DOCUMENTARY descendant of S
    // (S an ancestor of HEAD, S..HEAD documentation-only) with a clean tree.
    //
    // R4-06 / review-4 task 1.6: this expectation is now DERIVED from
    // `classifyCheckpointRange` with the production receipt verifier wired in
    // (the same classifier and verifier certification uses). The previous
    // `!(head === checkpoint && clean)` form asserted NOT MET precisely when a
    // legitimate documentary descendant certifies, so the guard contradicted
    // certification and went red on the only reachable success case.
    const head = git(REPO_ROOT, ['rev-parse', 'HEAD']);
    const clean = git(REPO_ROOT, ['status', '--porcelain']) === '';
    const isAncestor = (ancestor: string, descendant: string): boolean => {
      const probe = spawnSync('git', ['-C', REPO_ROOT, 'merge-base', '--is-ancestor', ancestor, descendant], {
        cwd: REPO_ROOT, env: gitEnv(REPO_ROOT), shell: false, encoding: 'utf8', timeout: 10_000,
      });
      return probe.status === 0;
    };
    const rangeClass = checkpoint === '' ? 'UNKNOWN' : classifyCheckpointRange({
      certifiedCheckpointSha: checkpoint,
      headSha: head,
      isAncestor,
      changedFiles: (from, to) => {
        try {
          const listed = git(REPO_ROOT, ['diff', '--name-only', '--no-renames', `${from}..${to}`]);
          return listed === '' ? [] : listed.split('\n');
        } catch {
          return null;
        }
      },
      checkpointRoleViolations: (files) => checkpointRoleViolations(REPO_ROOT, files, {
        kind: 'range', from: checkpoint, to: head, verifyBindingReceipt: productionBindingReceiptVerifier(REPO_ROOT),
      }),
    });
    const atCheckpoint = clean && (head === checkpoint || rangeClass === 'DOCUMENTARY_DESCENDANT');
    if (!atCheckpoint) {
      const conditionsByCheck = new Map<string, string>();
      for (const condition of liveDefinition().conditions) conditionsByCheck.set(condition.check, condition.id);
      for (const check of D3_BOUND_CHECKS) {
        const id = conditionsByCheck.get(check) ?? '';
        const state = states.get(id);
        // Only a receipt bound to S may certify away from S; on this host the
        // receipts, when present, are bound to the working copy's own HEAD.
        if (check === 'ui-error-taxonomy-check' || check === 'yield-campaign-result' || check === 'accessibility-certification') continue;
        expect(state, `${check} must not be MET at HEAD ${head} for checkpoint ${checkpoint}`).not.toBe('MET');
        // R3-07 / corrections task 8.6: assert the CHECK state, not only the
        // effective state (which is EVIDENCE_ABSENT regardless): the demotion
        // must be visible in what the probe itself reported.
        expect(checkStates.get(id), `${check} must report a non-MET checkState away from the checkpoint`).not.toBe('MET');
      }
    }
    // X-04 — the demotion relation rides every receipt (NOT_CLAIMED while the
    // project is operationally accepted rather than certified). The JSON
    // receipt is printed only by a passing (clean-tree) evaluation.
    if (result.status === 0) {
      expect(result.stdout).toContain('"certificationDemotion"');
      expect(result.stdout).toContain('"relation": "NOT_CLAIMED"');
      expect(result.stdout).toContain('"accessibility-certification"');
    }
  });
});

// ---------------------------------------------------------------------------
// VD-01 / corrections task 4.1 (design D3) — probe-at-checkpoint semantics.
// ---------------------------------------------------------------------------

test.describe('probe-at-checkpoint binding (VD-01)', () => {
  const S = 'a'.repeat(40);
  const OTHER = 'b'.repeat(40);

  test('a working-tree probe is bound only at HEAD == S with a clean tree', () => {
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: S, treeClean: true })).toMatchObject({ atCheckpoint: true, reasonCode: null });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true })).toMatchObject({ atCheckpoint: false, reasonCode: 'DOCUMENTARY_RANGE_UNKNOWN' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: false })).toMatchObject({ atCheckpoint: false, reasonCode: 'HEAD_NOT_CHECKPOINT' });
    // R3-03 / corrections task 8.3: a DOCUMENTARY descendant (S an ancestor of
    // HEAD, S..HEAD documentation-only, tree clean) IS at the checkpoint — the
    // relaxation that makes certification satisfiable without weakening it.
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: true })).toMatchObject({ atCheckpoint: true, reasonCode: null, documentaryDescendant: true });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: false, documentaryDescendant: true })).toMatchObject({ atCheckpoint: false, reasonCode: 'TREE_DIRTY' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: null, documentaryDescendant: true })).toMatchObject({ atCheckpoint: false, reasonCode: 'TREE_STATE_UNKNOWN' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: S, treeClean: false })).toMatchObject({ atCheckpoint: false, reasonCode: 'TREE_DIRTY' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: S, treeClean: null })).toMatchObject({ atCheckpoint: false, reasonCode: 'TREE_STATE_UNKNOWN' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: null, headSha: S, treeClean: true })).toMatchObject({ atCheckpoint: false, reasonCode: 'CHECKPOINT_UNRESOLVED' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: S, headSha: null, treeClean: true })).toMatchObject({ atCheckpoint: false, reasonCode: 'HEAD_UNRESOLVED' });
    expect(resolveProbeBinding({ certifiedCheckpointSha: 'HEAD', headSha: S, treeClean: true }).atCheckpoint).toBe(false);
  });

  test('only a passing measurement is demoted; a failure is never upgraded or hidden', () => {
    const away = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true });
    const at = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: S, treeClean: true });
    const met = { state: 'MET', detail: 'measurement text' };
    expect(bindTreeProbe(at, met)).toEqual(met);
    const demoted = bindTreeProbe(away, met);
    expect(demoted.state).toBe('NOT_AT_CHECKPOINT');
    expect(demoted.detail).toContain('measurement text');
    expect(demoted.detail).toContain(describeProbeBinding(away));
    for (const state of ['UNMET', 'UNAVAILABLE_CAPABILITY', 'BLOCKED_EXTERNAL']) {
      expect(bindTreeProbe(away, { state, detail: 'x' })).toEqual({ state, detail: 'x' });
    }
  });

  test('a receipt binds to S by its own SHA, never to HEAD', () => {
    expect(receiptBindingRelation(S, S)).toBe('BOUND');
    expect(receiptBindingRelation(S, S.toUpperCase())).toBe('BOUND');
    expect(receiptBindingRelation(S, OTHER)).toBe('BOUND_TO_OTHER');
    expect(receiptBindingRelation(S, null)).toBe('RECEIPT_SHA_INVALID');
    expect(receiptBindingRelation(null, S)).toBe('CHECKPOINT_UNRESOLVED');
    expect(receiptNotAtCheckpoint('a receipt', OTHER, S)).toMatchObject({ state: 'NOT_AT_CHECKPOINT' });
  });

  test('NOT_AT_CHECKPOINT is a closed vocabulary member that is never MET and refuses a claimed advance', () => {
    expect(RELEASE_CONDITION_STATES).toContain('NOT_AT_CHECKPOINT');
    const definition = definitionWithExactEvidence(liveDefinition(), S);
    const target = definition.conditions[0] as { check: string; id: string };
    const outputs = allMetOutputs(definition);
    outputs[target.check] = { state: 'NOT_AT_CHECKPOINT', detail: 'measured away from the checkpoint' };
    const verdict = evaluateReleaseCertification(evaluationInput(definition, {
      certifiedCheckpointSha: S,
      checkOutputs: outputs,
      projectCompletionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
    }));
    const condition = verdict.conditions.find((entry) => entry.id === target.id);
    expect(condition?.state).toBe('NOT_AT_CHECKPOINT');
    expect(condition?.checkState).toBe('NOT_AT_CHECKPOINT');
    expect(verdict.conditionsMet).toBe(verdict.conditions.length - 1);
    expect(verdict.advanceClaimed).toBe(true);
    expect(verdict.advanceRefused).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// R3-03 / corrections task 8.3 — the checkpoint range classifier.
// ---------------------------------------------------------------------------

test.describe('checkpoint range classification (R3-03)', () => {
  const S = 'a'.repeat(40);
  const H = 'b'.repeat(40);
  const base = {
    certifiedCheckpointSha: S,
    headSha: H,
    isAncestor: () => true,
    changedFiles: () => ['docs/CURRENT_STATE.md'],
    checkpointRoleViolations: () => [],
  };

  test('S == HEAD is SAME; an unprovable range is UNKNOWN; a non-ancestor is UNRELATED', () => {
    expect(classifyCheckpointRange({ ...base, headSha: S })).toBe('SAME');
    expect(classifyCheckpointRange({ ...base, isAncestor: null })).toBe('UNKNOWN');
    expect(classifyCheckpointRange({ ...base, changedFiles: null })).toBe('UNKNOWN');
    expect(classifyCheckpointRange({ ...base, isAncestor: () => false })).toBe('UNRELATED');
    expect(classifyCheckpointRange({ ...base, certifiedCheckpointSha: null })).toBe('UNKNOWN');
    expect(classifyCheckpointRange({ ...base, checkpointRoleViolations: () => ['src/x.ts'] })).toBe('SUBSTANTIVE_DESCENDANT');
    expect(classifyCheckpointRange({ ...base, checkpointRoleViolations: () => null })).toBe('UNKNOWN');
    expect(classifyCheckpointRange({ ...base, changedFiles: () => [] })).toBe('DOCUMENTARY_DESCENDANT');
  });

  test('a real git fixture: S, a documentary descendant and a substantive descendant', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-checkpoint-range-'));
    const runGit = (args: string[]): string => git(root, args);
    try {
      runGit(['init', '--quiet', '-b', 'main']);
      fs.writeFileSync(path.join(root, 'src.ts'), 'export const x = 1;\n');
      runGit(['add', '--all']);
      runGit(['commit', '--quiet', '--no-gpg-sign', '-m', 'substantive S']);
      const s = runGit(['rev-parse', 'HEAD']);
      fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), 'docs\n');
      runGit(['add', '--all']);
      runGit(['commit', '--quiet', '--no-gpg-sign', '-m', 'documentary descendant']);
      const docsHead = runGit(['rev-parse', 'HEAD']);
      const wired = (headSha: string) => classifyCheckpointRange({
        certifiedCheckpointSha: s,
        headSha,
        isAncestor: (ancestor, descendant) => {
          const result = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', ancestor, descendant], { cwd: root, env: gitEnv(root), encoding: 'utf8' });
          return result.status === 0;
        },
        changedFiles: (from, to) => runGit(['diff', '--name-only', `${from}..${to}`]).split('\n').filter(Boolean),
        checkpointRoleViolations: (files) => checkpointRoleViolations(root, files, { kind: 'range', from: s, to: headSha }),
      });
      expect(wired(docsHead)).toBe('DOCUMENTARY_DESCENDANT');
      fs.writeFileSync(path.join(root, 'src.ts'), 'export const x = 2;\n');
      runGit(['add', '--all']);
      runGit(['commit', '--quiet', '--no-gpg-sign', '-m', 'substantive descendant']);
      const substantiveHead = runGit(['rev-parse', 'HEAD']);
      expect(wired(substantiveHead)).toBe('SUBSTANTIVE_DESCENDANT');
      expect(wired(s)).toBe('SAME');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// VD-02 / corrections task 4.2 — G18 consumes a UI-harness EXECUTION receipt.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// R3-07 / corrections task 8.6 — fixture-root collector tests: the REAL
// checker consumes receipts bound to S and to another SHA through its own
// probes, and the checkState it reports differs accordingly.
// ---------------------------------------------------------------------------

test.describe('fixture-root collector receipts (R3-07)', () => {
  const REPO = path.join(__dirname, '..', '..');
  /**
   * R4-07 / review-4 task 1.7 — the fixture root the collector tests write
   * into. It is a SHARED clone of the checkout at the live HEAD (its own index
   * and object alternates, no artifacts/ scratch), so a receipt is written
   * into a fixture root and NEVER into the real checkout, while the checker
   * under test is still the real one at the real HEAD.
   */
  let FIXTURE_ROOT = '';

  test.beforeAll(() => {
    const head = spawnSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { cwd: REPO, env: gitEnv(REPO), encoding: 'utf8' }).stdout?.trim() ?? '';
    expect(head).not.toBe('');
    FIXTURE_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-collector-fixture-'));
    const clone = spawnSync('git', ['clone', '--shared', '--no-checkout', '--quiet', REPO, FIXTURE_ROOT], { cwd: REPO, env: gitEnv(REPO), encoding: 'utf8', timeout: 300_000 });
    expect(`${clone.stdout ?? ''}${clone.stderr ?? ''}`).toBe('');
    const checkout = spawnSync('git', ['-C', FIXTURE_ROOT, 'checkout', '--quiet', '--detach', head], { cwd: FIXTURE_ROOT, env: gitEnv(FIXTURE_ROOT), encoding: 'utf8', timeout: 300_000 });
    expect(checkout.status).toBe(0);
    // The fixture root needs the installed dependencies (the checker loads TS
    // modules through bin/lib/typescript-runtime-loader.mjs). node_modules is
    // gitignored, so a symlink keeps the fixture tree clean.
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(FIXTURE_ROOT, 'node_modules'), 'dir');
  });

  test.afterAll(() => {
    if (FIXTURE_ROOT !== '') fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  });

  function runChecker(root: string): string {
    const result = spawnSync(process.execPath, [path.join(root, 'bin/project-state-check.mjs'), '--root', root], {
      cwd: root,
      encoding: 'utf8',
      timeout: 300_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return `${result.stdout}\n${result.stderr}`;
  }

  function conditionLine(output: string, id: string): string | null {
    for (const line of output.split('\n')) {
      if (new RegExp(`^\\s+\\d+ ${id} `).test(line)) return line;
    }
    return null;
  }

  /**
   * R3-07 fixture-root collector reads: a CLEAN tree makes project:check print
   * the JSON receipt; a dirty one prints the text verdict. Both are parsed so
   * the checkState assertion holds either way.
   */
  function conditionCheckState(output: string, id: string): string | null {
    try {
      // The checker prints the JSON receipt on stdout and its ATTENTION notes
      // on stderr; the combined capture therefore needs the first complete
      // object, not the whole string.
      const start = output.indexOf('{');
      const end = output.lastIndexOf('}');
      const parsed = JSON.parse(output.slice(start, end + 1)) as { releaseVerdict?: { conditions?: Array<{ id: string; state: string; checkState?: string }> } };
      const condition = parsed.releaseVerdict?.conditions?.find((entry) => entry.id === id);
      if (condition !== undefined) return condition.checkState ?? null;
    } catch {
      // Not a JSON receipt; fall through to the text verdict.
    }
    const line = conditionLine(output, id);
    if (line === null) return null;
    const match = /state=(\S+) check=(\S+)/.exec(line);
    return match === null ? null : match[2] as string;
  }

  test('G18: a UI-harness receipt bound to S reports check=MET; bound elsewhere it is NOT_AT_CHECKPOINT', () => {
    const s = /LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: ([0-9a-f]{40})/.exec(fs.readFileSync(path.join(REPO, 'docs/CURRENT_STATE.md'), 'utf8'))?.[1] ?? '';
    expect(s).not.toBe('');
    // Byte-exact (untrimmed) reads: the collector hashes the raw blob.
    const rawGit = (args: string[]): string => {
      const result = spawnSync('git', ['-C', REPO, ...args], { cwd: REPO, env: gitEnv(REPO), encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed`);
      return result.stdout ?? '';
    };
    const harnessAtS = rawGit(['show', `${s}:ui/control-center/src/contractRender.test.tsx`]);
    const typesAtS = rawGit(['show', `${s}:ui/control-center/src/types.ts`]);
    const kinds = extractApiErrorKinds(typesAtS) as string[];
    expect(kinds.length).toBeGreaterThan(0);
    const harnessTests = (harnessAtS.match(/^\s*(?:it|test)\(/gm) ?? []).length;
    expect(harnessTests).toBe(16);
    const harnessSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite === UI_HARNESS_SUITE);
    const otherSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite !== UI_HARNESS_SUITE);
    const extras = harnessTests - harnessSuite.length - 1 - otherSuite.length;
    const vitestFile = {
      filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`,
      tasks: [
        {
          type: 'suite',
          name: UI_HARNESS_SUITE,
          tasks: [
            ...harnessSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })),
            { type: 'test', name: 'offers retry only for NETWORK, TIMEOUT, 408 and 429', result: { state: 'pass' } },
            ...Array.from({ length: extras }, (_, index) => ({ type: 'test', name: `fixture remainder ${index}`, result: { state: 'pass' } })),
          ],
        },
        { type: 'suite', name: 'control center render truth', tasks: otherSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })) },
      ],
    };
    const build = (sha: string) => buildUiHarnessReceipt({
      files: [vitestFile],
      headSha: sha,
      treeClean: true,
      typesSource: typesAtS,
      harnessSource: harnessAtS,
      executedAt: '2026-09-30T00:00:00.000Z',
    });
    const target = path.join(FIXTURE_ROOT, 'artifacts/receipts/ui-harness-receipt.v1.json');
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${JSON.stringify(build(s), null, 2)}\n`);
      const bound = runChecker(FIXTURE_ROOT);
      expect(conditionCheckState(bound, 'ui-error-taxonomy-rendering'), bound).toBe('MET');
      fs.writeFileSync(target, `${JSON.stringify(build('b'.repeat(40)), null, 2)}\n`);
      const other = runChecker(FIXTURE_ROOT);
      expect(conditionCheckState(other, 'ui-error-taxonomy-rendering'), other).toBe('NOT_AT_CHECKPOINT');
    } finally {
      fs.rmSync(target, { force: true });
    }
  });

  test('G12: a yield-campaign receipt bound to S reports check=MET; bound elsewhere it is NOT_AT_CHECKPOINT', () => {
    const s = /LAST_SUBSTANTIVE_IMPLEMENTATION_SHA: ([0-9a-f]{40})/.exec(fs.readFileSync(path.join(REPO, 'docs/CURRENT_STATE.md'), 'utf8'))?.[1] ?? '';
    expect(s).not.toBe('');
    const observation = { repository: 'mobingilabs/ouchan', headSha: '1'.repeat(40), statusDigest: 'sha256:aa', diffDigest: 'sha256:bb' };
    const build = (sha: string) => buildProductRunReceipt({
      campaignId: 'fixture-yield',
      generatedAt: '2026-09-30T00:00:00.000Z',
      result: {
        terminationReason: 'COMPLETE_NO_FINDING',
        terminationCounts: { COMPLETE_NO_FINDING: 1 },
        providerAttribution: {
          terminationClass: 'VALID_PROVIDER_RUN',
          totalCalls: 3,
          completedCalls: 3,
          failures: 0,
          byClass: {},
        } as never,
        persistedFindings: [],
        reproductionCount: 2,
        toolActionCount: 5,
      },
      before: [observation] as never,
      after: [observation] as never,
      leakScan: { result: 'CLEAN', findings: 0, scannedChars: 10 },
      nightwatchIdentity: { sha, treeClean: true },
      campaignKind: 'PRINT_CLI_PROVIDER',
      reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: `rid:sha256:${'a'.repeat(24)}`, printCliDigest: `sha256:${'b'.repeat(24)}`, provider: 'test-provider', model: 'test-model' },
    });
    const dir = path.join(FIXTURE_ROOT, `artifacts/nightwatch-fixture-${process.pid}-${Date.now()}`);
    // R5-15: the yield run qualifies only against a GRANTED authorization of the single paid run. The
    // fixture root is a throwaway clone, so the GRANTED record is COMMITTED there (a clean tree) and
    // the commit is undone afterwards.
    const authorizationFile = path.join(FIXTURE_ROOT, 'config/yield-run-authorization.v1.json');
    const original = fs.readFileSync(authorizationFile, 'utf8');
    const fixtureGit = (args: string[]) => spawnSync('git', ['-c', 'user.name=nw', '-c', 'user.email=nw@example.invalid', '-C', FIXTURE_ROOT, ...args], { cwd: FIXTURE_ROOT, env: gitEnv(FIXTURE_ROOT), encoding: 'utf8' });
    fs.writeFileSync(authorizationFile, `${JSON.stringify({
      schemaVersion: 'nightwatch.yield-run-authorization.v1',
      grantId: 'parent-12.3',
      state: 'GRANTED',
      maxQualifyingRuns: 1,
      declared: { printCliDigest: `sha256:${'b'.repeat(24)}`, provider: 'test-provider', model: 'test-model' },
    }, null, 2)}\n`);
    expect(fixtureGit(['commit', '--quiet', '--no-gpg-sign', '-am', 'fixture: GRANTED yield authorization']).status).toBe(0);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify({ runId: 'fixture-run', product: 'campaign', nightwatchSha: s })}\n`);
      fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify({ passed: true })}\n`);
      fs.writeFileSync(path.join(dir, 'product-run-receipt.json'), `${JSON.stringify(build(s), null, 2)}\n`);
      const bound = runChecker(FIXTURE_ROOT);
      expect(conditionCheckState(bound, 'autonomous-yield-proof'), bound).toBe('MET');
      fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify({ runId: 'fixture-run', product: 'campaign', nightwatchSha: 'b'.repeat(40) })}\n`);
      fs.writeFileSync(path.join(dir, 'product-run-receipt.json'), `${JSON.stringify(build('b'.repeat(40)), null, 2)}\n`);
      const other = runChecker(FIXTURE_ROOT);
      expect(conditionCheckState(other, 'autonomous-yield-proof'), other).toBe('NOT_AT_CHECKPOINT');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      expect(fixtureGit(['reset', '--quiet', '--hard', 'HEAD~1']).status).toBe(0);
      expect(fs.readFileSync(authorizationFile, 'utf8')).toBe(original);
    }
  });
});

test.describe('UI-harness execution receipt (VD-02)', () => {
  const S = 'c'.repeat(40);
  const OTHER = 'd'.repeat(40);
  const KINDS = ['NETWORK', 'HTTP', 'INVALID_RESPONSE', 'TIMEOUT', 'ABORTED'];
  const typesSource = `export const API_ERROR_KINDS = [${KINDS.map((kind) => `'${kind}'`).join(', ')}] as const;`;

  function vitestFile(mutate: (tests: Array<{ suite: string; name: string; state: string }>) => Array<{ suite: string; name: string; state: string }> = (tests) => tests) {
    const base = [
      ...UI_HARNESS_REQUIRED_TESTS.map((entry) => ({ suite: entry.suite, name: `${entry.titlePrefix} (synthetic remainder)`, state: 'pass' })),
      { suite: UI_HARNESS_SUITE, name: 'offers retry only for NETWORK, TIMEOUT, 408 and 429', state: 'pass' },
    ];
    const tests = mutate(base);
    const suites = new Map<string, unknown[]>();
    for (const test of tests) {
      const list = suites.get(test.suite) ?? [];
      list.push({ type: 'test', name: test.name, result: { state: test.state } });
      suites.set(test.suite, list);
    }
    return {
      filepath: `/repo/ui/control-center/${UI_HARNESS_FILE}`,
      tasks: [...suites.entries()].map(([name, list]) => ({ type: 'suite', name, tasks: list })),
    };
  }

  // R3-06: the harness content that executed, hashed into the receipt and
  // cross-checked at S. Six leaf tests match the six synthetic harness tests.
  const harnessSource = ['describe("synthetic harness", () => {', ...Array.from({ length: 6 }, (_, index) => `  it("synthetic ${index}", () => {});`), '});'].join('\n');
  const context = { certifiedCheckpointSha: S, expectedKinds: KINDS, harnessSourceAtS: harnessSource };

  function receiptOf(input: { file?: unknown; head?: string | null; clean?: boolean | null; types?: string | null; harness?: string | null } = {}) {
    return buildUiHarnessReceipt({
      files: [input.file ?? vitestFile()],
      headSha: input.head === undefined ? S : input.head,
      treeClean: input.clean === undefined ? true : input.clean,
      typesSource: input.types === undefined ? typesSource : input.types,
      harnessSource: input.harness === undefined ? harnessSource : input.harness,
      executedAt: '2026-09-30T00:00:00.000Z',
    });
  }

  test('extractApiErrorKinds reads the committed member list and refuses an absent one', () => {
    expect(extractApiErrorKinds(typesSource)).toEqual(KINDS);
    expect(extractApiErrorKinds('export const OTHER = [] as const;')).toBeNull();
    expect(extractApiErrorKinds('export const API_ERROR_KINDS = [] as const;')).toBeNull();
  });

  test('a complete clean-tree receipt bound to S certifies', () => {
    const evaluated = evaluateUiHarnessReceipt(receiptOf(), context);
    expect(evaluated.errors).toEqual([]);
    expect(evaluated).toMatchObject({ ok: true, relation: 'BOUND', summary: { sha: S, kinds: 5 } });
  });

  test('a receipt bound to another commit is valid but not bound to S', () => {
    const evaluated = evaluateUiHarnessReceipt(receiptOf({ head: OTHER }), context);
    expect(evaluated).toMatchObject({ ok: true, relation: 'BOUND_TO_OTHER' });
  });

  // R3-06 / corrections task 8.5: forgery is detected at read.
  test('a hand-written receipt, a wrong harness digest, a wrong test count and a missing source are all rejected', () => {
    const forged = { ...receiptOf(), receiptDigest: 'sha256:' + '0'.repeat(24) };
    expect(evaluateUiHarnessReceipt(forged, context).errors).toContain('UI_HARNESS_RECEIPT_DIGEST_MISMATCH');
    // A receipt built over DIFFERENT harness content than S.
    const otherSource = harnessSource.replace('synthetic 0', 'synthetic other');
    const otherReceipt = receiptOf({ harness: otherSource });
    expect(evaluateUiHarnessReceipt(otherReceipt, context).errors).toContain('UI_HARNESS_RECEIPT_HARNESS_DIGEST_MISMATCH');
    // A receipt whose harness test count disagrees with S's source, with the
    // digest re-derived so ONLY the count is inconsistent.
    const valid = receiptOf() as { harness: { tests: unknown[] } };
    const trimmed = { ...valid, harness: { ...valid.harness, tests: valid.harness.tests.slice(0, 5) } } as Record<string, unknown>;
    const countReceipt = { ...trimmed, receiptDigest: uiHarnessReceiptDigest(trimmed) };
    expect(evaluateUiHarnessReceipt(countReceipt, context).errors.join('|')).toContain('UI_HARNESS_RECEIPT_HARNESS_TEST_COUNT_MISMATCH');
    expect(evaluateUiHarnessReceipt(receiptOf(), { ...context, harnessSourceAtS: null }).errors).toContain('UI_HARNESS_RECEIPT_HARNESS_SOURCE_UNAVAILABLE');
  });

  test('the harness file not running produces no receipt at all', () => {
    expect(buildUiHarnessReceipt({ files: [{ filepath: '/repo/ui/control-center/src/other.test.tsx', tasks: [] }], headSha: S, treeClean: true, typesSource, harnessSource, executedAt: 'x' })).toBeNull();
  });

  test('every way an execution can fail to prove the taxonomy is rejected', () => {
    const rejected = (input: Parameters<typeof receiptOf>[0], code: string, kinds: readonly string[] | null = KINDS) => {
      const evaluated = evaluateUiHarnessReceipt(receiptOf(input), { ...context, expectedKinds: kinds });
      expect(evaluated.ok, code).toBe(false);
      expect(evaluated.errors.join('|'), code).toContain(code);
    };
    rejected({ clean: false }, 'UI_HARNESS_RECEIPT_TREE_NOT_CLEAN');
    rejected({ clean: null }, 'UI_HARNESS_RECEIPT_TREE_NOT_CLEAN');
    rejected({ head: null }, 'UI_HARNESS_RECEIPT_SHA_INVALID');
    rejected({ file: vitestFile((tests) => tests.map((test, index) => (index === 0 ? { ...test, state: 'fail' } : test))) }, 'UI_HARNESS_RECEIPT_HARNESS_TEST_NOT_PASSED');
    rejected({ file: vitestFile((tests) => tests.map((test, index) => (index === 1 ? { ...test, state: 'skip' } : test))) }, 'UI_HARNESS_RECEIPT_REQUIRED_TEST_NOT_PASSED');
    rejected({ file: vitestFile((tests) => tests.filter((test) => !test.name.startsWith('mutation proof'))) }, 'UI_HARNESS_RECEIPT_REQUIRED_TEST_MISSING:mutation proof');
    rejected({ file: vitestFile(() => []) }, 'UI_HARNESS_RECEIPT_NO_HARNESS_TESTS');
    rejected({ types: null }, 'UI_HARNESS_RECEIPT_KINDS_MISSING');
    rejected({}, 'UI_HARNESS_RECEIPT_KINDS_DRIFT', [...KINDS, 'EXTRA']);
    rejected({}, 'UI_HARNESS_RECEIPT_EXPECTED_KINDS_UNAVAILABLE', null);
    expect(evaluateUiHarnessReceipt(null, context).errors).toEqual(['UI_HARNESS_RECEIPT_UNAVAILABLE']);
    expect(evaluateUiHarnessReceipt({ ...receiptOf(), schemaVersion: 'nightwatch.other.v1' }, context).errors.join('|')).toContain('UI_HARNESS_RECEIPT_SCHEMA_UNSUPPORTED');
  });
});

// ---------------------------------------------------------------------------
// VD-03 / CF-03 / corrections task 4.3 — G12 consumes a yield-campaign receipt.
// ---------------------------------------------------------------------------

test.describe('yield-campaign receipt (VD-03 / CF-03)', () => {
  // R5-15: the GRANTED record of the single authorized paid run the test receipts were produced under.
  const GRANTED = { grantId: 'parent-12.3', state: 'GRANTED' as const, maxQualifyingRuns: 1, declared: { printCliDigest: `sha256:${'b'.repeat(24)}`, provider: 'test-provider', model: 'test-model' } };
  const S = 'e'.repeat(40);
  const OTHER = 'f'.repeat(40);
  const sibling = { repository: 'mobingilabs/ouchan', headSha: '1'.repeat(40), statusDigest: 'sha256:aa', diffDigest: 'sha256:bb', dirty: false };

  function evidence(overrides: {
    kind?: string | null;
    sha?: string | null;
    clean?: boolean | null;
    passed?: boolean;
    product?: string;
    termination?: 'VALID_PROVIDER_RUN' | 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION' | 'PROVIDER_DEGRADED';
    completedCalls?: number;
    leak?: 'CLEAN' | 'LEAKS_FOUND';
    siblingChange?: boolean;
    siblings?: number;
    manifestSha?: string | null;
    terminationReason?: string;
    reasonerIdentity?: { kind: string; identityDigest: string | null; printCliDigest: string | null } | null;
  } = {}) {
    const sha = overrides.sha === undefined ? S : overrides.sha;
    const observation = { repository: sibling.repository, headSha: sibling.headSha, statusDigest: sibling.statusDigest, diffDigest: sibling.diffDigest };
    const observations = Array.from({ length: overrides.siblings ?? 1 }, () => observation);
    const changedAfter = overrides.siblingChange === true ? [{ ...observation, headSha: '2'.repeat(40) }] : observations;
    const receipt = buildProductRunReceipt({
      campaignId: 'synthetic-yield',
      generatedAt: '2026-09-30T00:00:00.000Z',
      result: {
        terminationReason: overrides.terminationReason ?? 'COMPLETE_NO_FINDING',
        terminationCounts: { [overrides.terminationReason ?? 'COMPLETE_NO_FINDING']: 1 },
        providerAttribution: {
          terminationClass: overrides.termination ?? 'VALID_PROVIDER_RUN',
          totalCalls: overrides.completedCalls ?? 3,
          completedCalls: overrides.completedCalls ?? 3,
          failures: 0,
          byClass: {},
        } as never,
        persistedFindings: [],
        reproductionCount: 2,
        toolActionCount: 5,
      },
      before: observations as never,
      after: changedAfter as never,
      leakScan: { result: overrides.leak ?? 'CLEAN', findings: overrides.leak === 'LEAKS_FOUND' ? 1 : 0, scannedChars: 10 },
      ...(sha === null ? {} : { nightwatchIdentity: { sha, treeClean: overrides.clean ?? true } }),
      ...(overrides.kind === null ? {} : { campaignKind: (overrides.kind ?? 'PRINT_CLI_PROVIDER') as never }),
      // R3-06 / corrections task 8.5: the recorded reasoner identity.
      reasonerIdentity: overrides.reasonerIdentity === undefined
        ? { kind: 'PRINT_CLI_PROVIDER', identityDigest: `rid:sha256:${'a'.repeat(24)}`, printCliDigest: `sha256:${'b'.repeat(24)}`, provider: 'test-provider', model: 'test-model' } as never
        : overrides.reasonerIdentity as never,
    });
    const manifest = { runId: 'run-1', product: overrides.product ?? 'campaign', nightwatchSha: overrides.manifestSha === undefined ? sha : overrides.manifestSha };
    return { manifest, summary: { passed: overrides.passed ?? true }, receipt };
  }

  test('a provider campaign that passed at a clean S with executed provider calls certifies', () => {
    const evaluated = evaluateYieldCampaignEvidence(evidence(), S, GRANTED);
    expect(evaluated.errors).toEqual([]);
    expect(evaluated).toMatchObject({ ok: true, relation: 'BOUND', summary: { sha: S, completedCalls: 3, admissions: 0 } });
  });

  test('a run at another commit is valid evidence about that commit, not about S', () => {
    expect(evaluateYieldCampaignEvidence(evidence({ sha: OTHER }), S, GRANTED)).toMatchObject({ ok: true, relation: 'BOUND_TO_OTHER' });
  });

  test('a smoke run, a blocked provider, an unbound run and every weaker receipt never qualify', () => {
    const rejected = (input: Parameters<typeof evidence>[0], code: string) => {
      const evaluated = evaluateYieldCampaignEvidence(evidence(input), S, GRANTED);
      expect(evaluated.ok, code).toBe(false);
      expect(evaluated.errors.join('|'), code).toContain(code);
    };
    rejected({ kind: 'CUSTOM_REASONER_SCRIPT' }, 'YIELD_RECEIPT_NOT_A_PROVIDER_CAMPAIGN:CUSTOM_REASONER_SCRIPT');
    rejected({ kind: null }, 'YIELD_RECEIPT_NOT_A_PROVIDER_CAMPAIGN:ABSENT');
    rejected({ sha: null, manifestSha: null }, 'YIELD_RECEIPT_SHA_ABSENT');
    rejected({ manifestSha: OTHER }, 'YIELD_RECEIPT_SHA_DISAGREES');
    rejected({ clean: false }, 'YIELD_RECEIPT_TREE_NOT_CLEAN');
    rejected({ passed: false }, 'YIELD_RECEIPT_RUN_NOT_PASSED');
    rejected({ product: 'scenario' }, 'YIELD_RECEIPT_NOT_A_CAMPAIGN_RUN');
    rejected({ termination: 'PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION' }, 'YIELD_RECEIPT_PROVIDER_NOT_VALID');
    rejected({ termination: 'PROVIDER_DEGRADED' }, 'YIELD_RECEIPT_PROVIDER_NOT_VALID');
    rejected({ completedCalls: 0 }, 'YIELD_RECEIPT_NO_COMPLETED_PROVIDER_CALL');
    rejected({ siblingChange: true }, 'YIELD_RECEIPT_SIBLING_IDENTITY_CHANGED');
    rejected({ siblings: 0 }, 'YIELD_RECEIPT_NO_SIBLING_OBSERVATION');
    rejected({ leak: 'LEAKS_FOUND' }, 'YIELD_RECEIPT_LEAK_SCAN_NOT_CLEAN');
    // R3-06 / corrections task 8.5: a non-completed campaign is never a yield
    // result, whatever its provider attribution says.
    rejected({ terminationReason: 'PAUSED' }, 'YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:PAUSED');
    rejected({ terminationReason: 'BUDGET_EXHAUSTED' }, 'YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:BUDGET_EXHAUSTED');
    rejected({ terminationReason: 'REASONER_FAILURE' }, 'YIELD_RECEIPT_CAMPAIGN_NOT_COMPLETED:REASONER_FAILURE');
    rejected({ reasonerIdentity: null }, 'YIELD_RECEIPT_REASONER_IDENTITY_ABSENT');
    // A completed campaign still needs its per-case reasons.
    const full = evidence();
    const { caseTerminationCounts: _omitCounts, ...receiptWithoutCases } = full.receipt as unknown as Record<string, unknown>;
    void _omitCounts;
    expect(evaluateYieldCampaignEvidence({ ...full, receipt: receiptWithoutCases }, S, GRANTED).errors).toContain('YIELD_RECEIPT_NO_COMPLETED_CASE');
    rejected({ reasonerIdentity: { kind: 'CUSTOM_REASONER_SCRIPT', identityDigest: `rid:sha256:${'a'.repeat(24)}`, printCliDigest: null } }, 'YIELD_RECEIPT_REASONER_NOT_PROVIDER:CUSTOM_REASONER_SCRIPT');
    // A null identity digest passes schema validation (legacy tolerance) and
    // is refused by the G12 evaluator; a malformed digest is refused earlier.
    rejected({ reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: null, printCliDigest: null } }, 'YIELD_RECEIPT_REASONER_IDENTITY_INVALID');
    rejected({ reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: 'not-a-digest', printCliDigest: null } }, 'YIELD_RECEIPT_INVALID:reasonerIdentity.identityDigest');
    expect(evaluateYieldCampaignEvidence({ manifest: null, summary: null, receipt: null }, S, GRANTED).errors).toEqual(['YIELD_RECEIPT_RUN_ARTIFACTS_MISSING']);
    expect(evaluateYieldCampaignEvidence({ manifest: {}, summary: {}, receipt: { schemaVersion: 'x' } }, S, GRANTED).errors[0]).toContain('YIELD_RECEIPT_INVALID');
  });

  test('the additive receipt fields are validated when present and remain optional for legacy receipts', () => {
    const { receipt } = evidence();
    expect(validateProductRunReceipt(receipt).ok).toBe(true);
    const legacy = { ...receipt } as Record<string, unknown>;
    delete legacy.nightwatchSha;
    delete legacy.nightwatchTreeClean;
    delete legacy.campaignKind;
    delete legacy.campaignTermination;
    delete legacy.reasonerIdentity;
    delete legacy.caseTerminationCounts;
    expect(validateProductRunReceipt(legacy).ok).toBe(true);
    expect(validateProductRunReceipt({ ...receipt, nightwatchSha: 'short' }).errors).toContain('nightwatchSha');
    expect(validateProductRunReceipt({ ...receipt, nightwatchTreeClean: 'yes' }).errors).toContain('nightwatchTreeClean');
    expect(validateProductRunReceipt({ ...receipt, campaignKind: 'OTHER' }).errors).toContain('campaignKind');
    expect(validateProductRunReceipt({ ...receipt, campaignTermination: 'MAYBE' }).errors).toContain('campaignTermination');
    expect(validateProductRunReceipt({ ...receipt, reasonerIdentity: { kind: 'OTHER', identityDigest: null, printCliDigest: null } }).errors).toContain('reasonerIdentity.kind');
    expect(validateProductRunReceipt({ ...receipt, reasonerIdentity: { kind: 'PRINT_CLI_PROVIDER', identityDigest: 'bad', printCliDigest: null } }).errors).toContain('reasonerIdentity.identityDigest');
  });
});

// ---------------------------------------------------------------------------
// VD-04 / corrections task 4.4 — G19 and G21 EXERCISE their contracts.
// ---------------------------------------------------------------------------

test.describe('G19 / G21 probes exercise their contracts (VD-04)', () => {
  const surface = environmentSurfaceModule;
  const declaration = () => surface.loadEnvironmentSurface();

  test('G19: the real environment surface passes the exercise with every declared variable covered', () => {
    const parsed = declaration();
    const exercised = exerciseConfigurationContract(surface, parsed);
    expect(exercised.failures).toEqual([]);
    expect(exercised.rendered).toBe(parsed.variables.length);
    expect(exercised.refused + exercised.unrejectable).toBe(parsed.variables.length);
    expect(exercised.refused).toBeGreaterThan(0);
  });

  test('G19: a validator that accepts a malformed value fails the exercise, naming the variable', () => {
    const lenient = { ...surface, validateEnvironmentValues: () => ({ ok: true, refusals: [], unknown: [] }) };
    const failures = exerciseConfigurationContract(lenient, declaration()).failures;
    expect(failures.some((entry) => entry.includes('accepted a malformed value'))).toBe(true);
    expect(failures).toContain('an undeclared NIGHTWATCH_* name was not reported unknown');
  });

  test('G19: a printer that leaks a secret-bearing value or omits a row fails the exercise', () => {
    const leaking = { ...surface, renderEffectiveConfiguration: (rows: ReadonlyArray<{ name: string }>) => `${rows.map((row) => row.name).join('\n')}\nnw-synthetic-secret-sentinel-value` };
    expect(exerciseConfigurationContract(leaking, declaration()).failures).toContain('effective configuration leaked a secret-bearing value');
    const truncating = { ...surface, renderEffectiveConfiguration: () => 'NIGHTWATCH effective configuration' };
    expect(exerciseConfigurationContract(truncating, declaration()).failures.some((entry) => entry.startsWith('effective configuration omits'))).toBe(true);
  });

  test('G19: an empty declaration is not a pass', () => {
    expect(exerciseConfigurationContract(surface, { variables: [] }).failures).toContain('the declaration carries no variables to exercise');
  });

  test('G21: the real pre-flight refuses each synthetic non-VALID artefact with its own code and no effect', () => {
    const exercised = exercisePreflightRefusal(capabilityLifecycleModule);
    expect(exercised.failures).toEqual([]);
    // R3-17 / corrections task 8.16: EXPIRED and WRONG_ENVIRONMENT join the
    // exercised closed vocabulary.
    expect(exercised.states).toEqual(['MISSING', 'UNKNOWN_AGE', 'UNREADABLE', 'EXPIRED', 'WRONG_ENVIRONMENT']);
    expect(exercised.refused).toBe(5);
  });

  test('G21: a pre-flight that admits an artefact, refuses with the wrong code, or acts before refusing fails the exercise', () => {
    const admitting = { ...capabilityLifecycleModule, assertAuthCapabilityPreflight: () => ({ state: 'VALID' }) };
    expect(exercisePreflightRefusal(admitting).failures).toContain('MISSING artefact was not refused');
    const wrongClass = {
      ...capabilityLifecycleModule,
      assertAuthCapabilityPreflight: () => {
        throw new Error('generic failure');
      },
    };
    expect(exercisePreflightRefusal(wrongClass).failures.some((entry) => entry.includes('wrong class or code'))).toBe(true);
    const acting = {
      ...capabilityLifecycleModule,
      assertAuthCapabilityPreflight: (input: { artefactPath: string }) => {
        fs.writeFileSync(`${input.artefactPath}.effect`, 'an effect before the refusal');
        return capabilityLifecycleModule.assertAuthCapabilityPreflight(input as never);
      },
    };
    expect(exercisePreflightRefusal(acting).failures.some((entry) => entry.includes('changed the artefact directory'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5.2 (R2-51) — the G20 accessibility certification record: the browser lane
// writes it, the probe consumes it, and nothing short of both sections PASS
// with a measured focus-indicator minimum of 3:1 may certify.
// ---------------------------------------------------------------------------

test.describe('accessibility certification record (G20 / R2-51)', () => {
  const sha = 'a'.repeat(40);
  const passSection = { status: 'PASS', executedAt: '2026-09-26T00:00:00.000Z' };
  const focusIndicator = { measured: 12, minimum: 4.83, samples: [], violations: [] };
  const validRecord = {
    schemaVersion: 'nightwatch.accessibility-certification.v1',
    nightwatchSha: sha,
    treeClean: true,
    updatedAt: '2026-09-26T00:00:00.000Z',
    sections: {
      certification: { ...passSection, views: 8 },
      keyboard: { ...passSection, walks: 14, focusIndicator },
    },
  };

  test('a complete PASS record certifies with its focus-indicator measurement', () => {
    const parsed = parseAccessibilityCertificationRecord(validRecord);
    expect(parsed.ok).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parsed.summary).toMatchObject({ sha, measuredFocusIndicators: 12, minimumFocusContrast: 4.83 });
  });

  test('absent, malformed and wrong-schema records are rejected', () => {
    expect(parseAccessibilityCertificationRecord(null).errors).toEqual(['ACCESSIBILITY_RECORD_UNAVAILABLE']);
    expect(parseAccessibilityCertificationRecord({ ...validRecord, schemaVersion: 'nightwatch.other.v1' }).errors)
      .toContain('ACCESSIBILITY_RECORD_SCHEMA_UNSUPPORTED:nightwatch.other.v1');
    expect(parseAccessibilityCertificationRecord({ ...validRecord, treeClean: false }).errors).toContain('ACCESSIBILITY_RECORD_TREE_NOT_CLEAN');
    expect(parseAccessibilityCertificationRecord({ ...validRecord, nightwatchSha: 'short' }).errors)
      .toContain('ACCESSIBILITY_RECORD_SHA_INVALID');
    expect(parseAccessibilityCertificationRecord({ ...validRecord, sections: null }).errors)
      .toContain('ACCESSIBILITY_RECORD_SECTIONS_MISSING');
  });

  test('a section that is RUNNING, FAIL or missing never certifies', () => {
    const running = { ...validRecord, sections: { ...validRecord.sections, keyboard: { ...validRecord.sections.keyboard, status: 'RUNNING' } } };
    expect(parseAccessibilityCertificationRecord(running).errors).toContain('ACCESSIBILITY_SECTION_NOT_CERTIFIED:keyboard:RUNNING');
    const failed = { ...validRecord, sections: { ...validRecord.sections, certification: { ...validRecord.sections.certification, status: 'FAIL' } } };
    expect(parseAccessibilityCertificationRecord(failed).errors).toContain('ACCESSIBILITY_SECTION_NOT_CERTIFIED:certification:FAIL');
    const missing = { ...validRecord, sections: { certification: validRecord.sections.certification } };
    expect(parseAccessibilityCertificationRecord(missing).errors).toContain('ACCESSIBILITY_SECTION_MISSING:keyboard');
  });

  test('a certification without a sufficient focus-indicator measurement is rejected', () => {
    const withoutMeasurement = { ...validRecord, sections: { ...validRecord.sections, keyboard: { ...validRecord.sections.keyboard, focusIndicator: undefined } } };
    expect(parseAccessibilityCertificationRecord(withoutMeasurement).errors).toContain('ACCESSIBILITY_FOCUS_INDICATOR_MISSING');
    const unmeasured = { ...validRecord, sections: { ...validRecord.sections, keyboard: { ...validRecord.sections.keyboard, focusIndicator: { ...focusIndicator, measured: 0 } } } };
    expect(parseAccessibilityCertificationRecord(unmeasured).errors).toContain('ACCESSIBILITY_FOCUS_INDICATOR_UNMEASURED');
    const below = { ...validRecord, sections: { ...validRecord.sections, keyboard: { ...validRecord.sections.keyboard, focusIndicator: { ...focusIndicator, minimum: 2.4 } } } };
    expect(parseAccessibilityCertificationRecord(below).errors).toContain('ACCESSIBILITY_FOCUS_INDICATOR_BELOW_MINIMUM:2.4');
  });
});

// ---------------------------------------------------------------------------
// X-04 — post-certification demotion: HEAD versus the certified checkpoint.
// The judgement is pure, so every relation is pinned with data alone.
// ---------------------------------------------------------------------------

test.describe('certification demotion classification (X-04)', () => {
  const checkpoint = 'c'.repeat(40);
  const head = 'd'.repeat(40);
  const base = { advanceClaimed: true, certifiedCheckpointSha: checkpoint, liveHeadSha: head };

  test('no claimed advance is not a demotion', () => {
    expect(classifyCertificationDemotion({ ...base, advanceClaimed: false })).toMatchObject({ relation: 'NOT_CLAIMED', attention: [] });
  });

  test('EXACT requires HEAD to be the certified checkpoint', () => {
    expect(classifyCertificationDemotion({ ...base, liveHeadSha: checkpoint })).toMatchObject({ relation: 'EXACT', attention: [] });
  });

  test('an unresolvable checkpoint, HEAD, ancestry or range fails closed', () => {
    expect(classifyCertificationDemotion({ ...base, certifiedCheckpointSha: null, liveHeadSha: null }).relation).toBe('UNKNOWN_CHECKPOINT');
    expect(classifyCertificationDemotion({ ...base, liveHeadSha: 'not-a-sha' }).relation).toBe('UNKNOWN_HEAD');
    expect(classifyCertificationDemotion({ ...base, isAncestor: false }).relation).toBe('NOT_DESCENDANT');
    expect(classifyCertificationDemotion({ ...base, isAncestor: true, changedFiles: null }).relation).toBe('UNVERIFIABLE');
  });

  test('a documentary descendant is certified at S with no attention', () => {
    const classified = classifyCertificationDemotion({ ...base, isAncestor: true, changedFiles: ['docs/ROADMAP.md'], substantivePaths: [] });
    expect(classified).toMatchObject({ relation: 'DESCENDANT_DOCUMENTARY', attention: [] });
  });

  test('a substantive descendant demotes to CERTIFIED_AT_ANCESTOR attention', () => {
    const classified = classifyCertificationDemotion({
      ...base,
      isAncestor: true,
      changedFiles: ['src/core/synthetic/x.ts', 'docs/ROADMAP.md'],
      substantivePaths: ['src/core/synthetic/x.ts'],
    });
    expect(classified.relation).toBe('DESCENDANT_SUBSTANTIVE');
    expect(classified.attention).toEqual(['CERTIFIED_AT_ANCESTOR']);
    expect(classified.detail).toContain('not re-claimed');
    expect(classified.detail).toContain('src/core/synthetic/x.ts');
  });
});
