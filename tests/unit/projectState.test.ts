// ---------------------------------------------------------------------------
// Phase 8B.1-R1.1 — project-state truth checker matrix.
//
// Proves bin/project-state-check.mjs (nightwatch.project-state.v1) enforces
// the project-memory authority model: structured block facts must agree with
// mechanically derivable source (real validator/renderer/portfolio selector),
// live authority stays with Git + ACTIVE_TASK continuity v2, no competing
// generic live anchors, promotion authority NONE, and historical prose can
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
  readonly nextPromotionAuthority?: string;
  readonly extraFields?: readonly string[];
}

function renderBlock(catalogState: 'EMPTY' | 'ONE', options: BlockOptions = {}): string {
  const catalogSource = renderCatalog(catalogState);
  const count = catalogState === 'EMPTY' ? '0' : '1';
  const lines = [
    `PROJECT_STATE_PROTOCOL_VERSION: ${options.version ?? 'nightwatch.project-state.v1'}`,
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
    `NEXT_PROMOTION_AUTHORITY: ${options.nextPromotionAuthority ?? 'NONE'}`,
    ...(options.extraFields ?? []),
  ];
  return `# Nightwatch — CURRENT STATE (synthetic fixture)

## Project-state v1 (machine-checked truth block)

\`\`\`
${lines.join('\n')}
\`\`\`

## Historical prose (must never affect machine checks)

Phase 8B's canonical promotion was deferred at that checkpoint; the catalog
remained empty at Phase 8B.0.1; Phase 8B.1 was not authorized before R1.
These are historical records and are ignored by project-state v1.
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
  for (const bin of ['bin/agent-state.mjs', 'bin/agent-continuity-protocol.mjs', 'bin/child-environment.mjs', 'bin/project-state-check.mjs']) {
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
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), renderBlock(catalogState, options.block));
  } else {
    fs.writeFileSync(path.join(root, 'docs/CURRENT_STATE.md'), '# Nightwatch — CURRENT STATE (synthetic fixture, no block)\n');
  }
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Agent contract\n');

  // Active task: valid v2 COMPLETE (or corrupted per option).
  const activeRecords = validClosedTask(ACTIVE_TASK_ID, 'test', sha);
  let activeText = activeRecords.active;
  let stateText = activeRecords.state;
  if (options.activeTaskPhaseStatus !== undefined) {
    activeText = activeText.replace(/^PHASE_TEST_STATUS: COMPLETE$/m, `PHASE_TEST_STATUS: ${options.activeTaskPhaseStatus}`);
    stateText = stateText.replace(/^PHASE_TEST_STATUS: COMPLETE$/m, `PHASE_TEST_STATUS: ${options.activeTaskPhaseStatus}`);
  }
  fs.mkdirSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID), { recursive: true });
  if (options.activeTaskPresent !== false) {
    fs.writeFileSync(path.join(root, '.agent', 'ACTIVE_TASK.md'), activeText);
  }
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'SPEC.md'), '# Synthetic task\n');
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'PLAN.md'), activeRecords.plan);
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'STATE.md'), stateText);
  fs.writeFileSync(path.join(root, '.agent', 'tasks', ACTIVE_TASK_ID, 'REPORT.md'), activeRecords.report);

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

test.describe('Phase 8B.1-R1.1 project-state truth checker (nightwatch.project-state.v1)', () => {
  test('1. valid one-entry current project state passes', () => {
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.status).toBe('PASS');
      expect(output.projectStateProtocol).toBe('nightwatch.project-state.v1');
      expect(output.catalogCount).toBe(1);
      expect(output.phase8Status).toBe('COMPLETE');
      expect(output.phase8B1Status).toBe('COMPLETE_VIA_SUCCESSFUL_RETRY_R1');
      expect(output.nextPortfolioMember).toBe('AVAILABLE_NOT_ADOPTED');
      expect(output.nextPromotionAuthority).toBe('NONE');
      expect(output.activeTaskContinuity).toBe('PASS');
      expect(output.rendererRoundTrip).toBe(true);
    } finally {
      fixture.cleanup();
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

  test('11. NEXT_PROMOTION_AUTHORITY=NONE passes (covered by test 1)', () => {
    // Explicit dedicated assertion for the required axis.
    const fixture = makeFixture();
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).nextPromotionAuthority).toBe('NONE');
    } finally {
      fixture.cleanup();
    }
  });

  test('12. NEXT_PROMOTION_AUTHORITY=AUTHORIZED fails in the current fixture, while NONE and SPENT are valid', () => {
    // SPENT is valid (post-variant-B-adoption state)
    for (const valid of ['NONE', 'SPENT']) {
      const fix = makeFixture({ block: { nextPromotionAuthority: valid } });
      try {
        const res = run(fix.root);
        expect(res.status).toBe(0);
      } finally {
        fix.cleanup();
      }
    }
    // AUTHORIZED is invalid
    const fixture = makeFixture({ block: { nextPromotionAuthority: 'AUTHORIZED' } });
    try {
      const result = run(fixture.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PROMOTION_AUTHORITY_NOT_NONE');
    } finally {
      fixture.cleanup();
    }
  });

  test('13. candidate availability does not imply promotion authority', () => {
    // Variant B is the available next member while authority stays NONE — the
    // real current project state. This must be healthy (test 1); here we also
    // prove the two axes are independent fields.
    const fixture = makeFixture({ block: { nextPortfolioMember: 'AVAILABLE_NOT_ADOPTED', nextPromotionAuthority: 'NONE' } });
    try {
      const result = run(fixture.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).nextPortfolioMember).toBe('AVAILABLE_NOT_ADOPTED');
      expect(JSON.parse(result.stdout).nextPromotionAuthority).toBe('NONE');
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

  test('20. historical phase-qualified implementation SHA fields are allowed', () => {
    const fixture = makeFixture({
      block: { extraFields: ['PHASE_8A_1_HISTORICAL_VALIDATED_IMPLEMENTATION_SHA: 4602fac417746a30927fc19f8e4ca48ab9143cac', 'PHASE_8A_1_HISTORICAL_DOCUMENTATION_CHECKPOINT_SHA: 488b4e41dc12840a1e0c029ae76b24f3ce8abee4'] },
    });
    try {
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
    const healthy = makeFixture({ block: { phase8Status: 'COMPLETE', nextPromotionAuthority: 'NONE' } });
    try {
      const result = run(healthy.root);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout).phase8Status).toBe('COMPLETE');
      expect(JSON.parse(result.stdout).nextPromotionAuthority).toBe('NONE');
    } finally {
      healthy.cleanup();
    }
    const granted = makeFixture({ block: { phase8Status: 'COMPLETE', nextPromotionAuthority: 'AUTHORIZED' } });
    try {
      const result = run(granted.root);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('PROJECT_STATE_PROMOTION_AUTHORITY_NOT_NONE');
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
});
