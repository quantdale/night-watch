// Validation lane composition (F-PERF-5).
//
// A lane is a declarative, ordered step list. The composition rules are
// mechanical so a lane can never quietly become a certification authority:
//
//   - every non-certification lane declares `authority: NOT_CERTIFICATION`
//     and a target budget;
//   - the dev lane may not contain the hardening probe campaign, a clean
//     checkout, the full regression, or the authoritative gate;
//   - both lanes must contain the cheap mandatory static checks and the
//     affected-test step;
//   - the milestone lane is strictly broader than the dev lane.
//
// Pure: definitions and composition only; the executor lives in bin/.

export const VALIDATION_LANE_PLAN_SCHEMA = 'nightwatch.validation-lane-plan.v1' as const;

export type LaneId = 'dev' | 'milestone';

export type StepKind = 'command' | 'affected-tests' | 'shards';

export interface LaneStep {
  readonly id: string;
  readonly kind: StepKind;
  readonly summary: string;
  readonly command?: readonly string[];
  readonly optional?: boolean;
}

export interface ValidationLaneDefinition {
  readonly id: LaneId;
  readonly title: string;
  readonly authority: 'NOT_CERTIFICATION';
  readonly targetSeconds: number;
  readonly steps: readonly LaneStep[];
}

const CHEAP_STATIC_STEPS: readonly LaneStep[] = Object.freeze([
  { id: 'validation-universe', kind: 'command', summary: 'every discovered test belongs to exactly one class', command: ['node', 'bin/validation-universe.mjs'] },
  { id: 'execution-classes', kind: 'command', summary: 'execution-class declaration is complete and non-weakening', command: ['node', 'bin/validation-execution-classes.mjs'] },
  { id: 'typecheck', kind: 'command', summary: 'TypeScript compile of src/tests/config', command: ['npm', 'run', 'typecheck'] },
  { id: 'hardening-check', kind: 'command', summary: 'offline structural invariants', command: ['npm', 'run', 'hardening:check'] },
  { id: 'agent-check', kind: 'command', summary: 'task continuity state machine', command: ['npm', 'run', 'agent:check'] },
  { id: 'handoff-check', kind: 'command', summary: 'planner handoff route and currentness', command: ['npm', 'run', 'handoff:check'] },
]);

const GOVERNANCE_STEPS: readonly LaneStep[] = Object.freeze([
  { id: 'project-check', kind: 'command', summary: 'project-state truth block', command: ['npm', 'run', 'project:check'] },
  { id: 'workspace-check', kind: 'command', summary: 'workspace integrity invariants', command: ['npm', 'run', 'workspace:check'] },
]);

export const VALIDATION_LANE_DEFINITIONS: Readonly<Record<LaneId, ValidationLaneDefinition>> = Object.freeze({
  dev: {
    id: 'dev',
    title: 'Fast development validation (affected scope)',
    authority: 'NOT_CERTIFICATION',
    targetSeconds: 120,
    steps: [
      ...CHEAP_STATIC_STEPS,
      { id: 'affected-tests', kind: 'affected-tests', summary: 'deterministic affected-test selection from the explicit base' },
      { id: 'affected-shards', kind: 'shards', summary: 'concurrent serial shards over the selected tests' },
    ],
  },
  milestone: {
    id: 'milestone',
    title: 'Milestone integration validation (broader scope)',
    authority: 'NOT_CERTIFICATION',
    targetSeconds: 300,
    steps: [
      ...CHEAP_STATIC_STEPS,
      { id: 'typecheck-bin', kind: 'command', summary: 'bin JavaScript declaration conformance report', command: ['npm', 'run', 'typecheck:bin'] },
      { id: 'hardening-rules', kind: 'command', summary: 'hardening rule probe campaign (94 probes)', command: ['npm', 'run', 'hardening:rules'] },
      ...GOVERNANCE_STEPS,
      { id: 'affected-tests', kind: 'affected-tests', summary: 'deterministic affected-test selection from the explicit base' },
      { id: 'affected-shards', kind: 'shards', summary: 'concurrent serial shards over the selected tests' },
    ],
  },
});

export interface LaneDefinitionViolation {
  readonly code: string;
  readonly detail: string;
}

const FORBIDDEN_IN_DEV = ['hardening:rules', 'gate:local', 'gate:clean', 'gate:ci'];

/** Mechanical composition rules; a violation refuses the lane definition. */
export function validateLaneDefinitions(): { readonly ok: boolean; readonly violations: readonly LaneDefinitionViolation[] } {
  const violations: LaneDefinitionViolation[] = [];
  const dev = VALIDATION_LANE_DEFINITIONS.dev;
  const milestone = VALIDATION_LANE_DEFINITIONS.milestone;
  for (const lane of [dev, milestone]) {
    if (lane.authority !== 'NOT_CERTIFICATION') violations.push({ code: 'LANE_AUTHORITY_INVALID', detail: lane.id });
    if (!Number.isInteger(lane.targetSeconds) || lane.targetSeconds <= 0) violations.push({ code: 'LANE_TARGET_INVALID', detail: lane.id });
    for (const required of ['validation-universe', 'execution-classes', 'typecheck', 'hardening-check', 'affected-tests', 'affected-shards']) {
      if (!lane.steps.some((step) => step.id === required)) violations.push({ code: 'LANE_REQUIRED_STEP_MISSING', detail: `${lane.id}: ${required}` });
    }
  }
  for (const step of dev.steps) {
    const rendered = (step.command ?? []).join(' ');
    if (FORBIDDEN_IN_DEV.some((forbidden) => rendered.includes(forbidden))) {
      violations.push({ code: 'LANE_DEV_FORBIDDEN_STEP', detail: `${step.id}: ${rendered}` });
    }
  }
  if (dev.targetSeconds > milestone.targetSeconds) violations.push({ code: 'LANE_TARGET_ORDER_INVALID', detail: 'dev target exceeds milestone target' });
  const devIds = new Set(dev.steps.map((step) => step.id));
  const milestoneIds = new Set(milestone.steps.map((step) => step.id));
  for (const id of devIds) if (!milestoneIds.has(id)) violations.push({ code: 'LANE_MILESTONE_NARROWER', detail: id });
  if (milestoneIds.size <= devIds.size) violations.push({ code: 'LANE_MILESTONE_NOT_BROADER', detail: 'milestone adds no steps' });
  return { ok: violations.length === 0, violations };
}

/**
 * Resolve a lane's concrete execution: affected-test and shard steps receive
 * the selection, command steps keep their argv. Shard files are passed through
 * the runner's own coverage proof, never executed directly here.
 */
export function buildLaneExecution(input: {
  readonly lane: LaneId;
  readonly base: string;
  readonly selectedTests: readonly string[];
  readonly parallelShardCount: number;
}): { readonly steps: readonly { readonly id: string; readonly kind: StepKind; readonly argv: readonly string[] }[] } {
  const definition = VALIDATION_LANE_DEFINITIONS[input.lane];
  const steps = definition.steps.map((step) => {
    if (step.kind === 'affected-tests') {
      return { id: step.id, kind: step.kind, argv: ['node', 'bin/affected-tests.mjs', `--base=${input.base}`, '--json'] };
    }
    if (step.kind === 'shards') {
      return { id: step.id, kind: step.kind, argv: ['node', 'bin/run-shards.mjs', `--files=${input.selectedTests.join(',')}`, `--workers=${input.parallelShardCount}`, '--json'] };
    }
    return { id: step.id, kind: step.kind, argv: step.command ?? [] };
  });
  return { steps };
}
