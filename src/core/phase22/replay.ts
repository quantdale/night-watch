import { phase22Digest } from './digest';
import { PHASE22_REPLAY_OUTCOMES, PHASE22_REPLAY_VERSION, type Phase22ReplayOutcome } from './types';

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const PROJECTION_RE = /^proj:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`PHASE22_REPLAY_INVALID:${reason}`);
}

function identity(input: { readonly targetId: string; readonly contractId: string; readonly expectationId: string; readonly sourceSha: string; readonly evidenceDigest: string; readonly projectionDigest: string; }): void {
  if (!SAFE_ID_RE.test(input.targetId) || !SAFE_ID_RE.test(input.contractId) || !SAFE_ID_RE.test(input.expectationId)) invalid('IDENTITY');
  if (!SHA_RE.test(input.sourceSha) || !EVIDENCE_RE.test(input.evidenceDigest) || !PROJECTION_RE.test(input.projectionDigest)) invalid('DIGEST');
}

export interface Phase22ReplayObservation {
  readonly targetId: string;
  readonly contractId: string;
  readonly expectationId: string;
  readonly sourceSha: string;
  readonly evidenceDigest: string;
  readonly projectionDigest: string;
  readonly replayObserved: boolean;
  readonly sourceCurrent: boolean;
  readonly contractSame: boolean;
  readonly preconditionStable: boolean;
  readonly exactProjectionMatch: boolean;
  readonly semanticEquivalent: boolean;
  readonly representationChanged: boolean;
  readonly contractPreserved: boolean;
  readonly observationDiverged: boolean;
  readonly nondeterministic: boolean;
}

export interface Phase22ReplayDecision {
  readonly schemaVersion: typeof PHASE22_REPLAY_VERSION;
  readonly targetId: string;
  readonly contractId: string;
  readonly expectationId: string;
  readonly outcome: Phase22ReplayOutcome;
  readonly sourceSha: string;
  readonly evidenceDigest: string;
  readonly deterministicDigest: string;
}

/** Classify FIRST + one fresh-context replay.  No retry path exists here. */
export function classifyPhase22Replay(input: Phase22ReplayObservation): Phase22ReplayDecision {
  identity(input);
  const targetId = input.targetId;
  let outcome: Phase22ReplayOutcome;
  if (!input.replayObserved) outcome = 'NOT_REPRODUCED';
  else if (!input.sourceCurrent) outcome = 'SOURCE_STALE';
  else if (!input.contractSame) outcome = 'CONTRACT_CHANGED';
  else if (!input.preconditionStable) outcome = 'PRECONDITION_DIVERGENCE';
  else if (input.exactProjectionMatch) outcome = 'REPRODUCED_EXACT';
  else if (input.semanticEquivalent) outcome = 'REPRODUCED_SEMANTIC_EQUIVALENT';
  else if (input.representationChanged && input.contractPreserved) outcome = 'REPRESENTATION_CHANGED_CONTRACT_PRESERVED';
  else if (input.nondeterministic) outcome = 'NONDETERMINISTIC';
  else if (input.observationDiverged) outcome = 'OBSERVATION_DIVERGENCE';
  else outcome = 'INVALID';
  if (!PHASE22_REPLAY_OUTCOMES.includes(outcome)) invalid('OUTCOME');
  const core = {
    schemaVersion: PHASE22_REPLAY_VERSION,
    targetId,
    contractId: input.contractId,
    expectationId: input.expectationId,
    outcome,
    sourceSha: input.sourceSha,
    evidenceDigest: input.evidenceDigest,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'replay:sha256:') };
}

export function validatePhase22ReplayDecision(decision: Phase22ReplayDecision): void {
  if (decision.schemaVersion !== PHASE22_REPLAY_VERSION || !PHASE22_REPLAY_OUTCOMES.includes(decision.outcome)) invalid('DECISION');
  identity({
    targetId: decision.targetId,
    contractId: decision.contractId,
    expectationId: decision.expectationId,
    sourceSha: decision.sourceSha,
    evidenceDigest: decision.evidenceDigest,
    projectionDigest: 'proj:sha256:000000000000000000000000',
  });
  if (!/^replay:sha256:[0-9a-f]{24}$/.test(decision.deterministicDigest)) invalid('DECISION_DIGEST');
  const core = {
    schemaVersion: decision.schemaVersion,
    targetId: decision.targetId,
    contractId: decision.contractId,
    expectationId: decision.expectationId,
    outcome: decision.outcome,
    sourceSha: decision.sourceSha,
    evidenceDigest: decision.evidenceDigest,
  };
  if (decision.deterministicDigest !== phase22Digest(core, 'replay:sha256:')) invalid('DECISION_DIGEST');
}

export interface Phase22ObservationBudget {
  readonly targetCount: number;
  readonly firstObservationCount: number;
  readonly replayObservationCount: number;
  readonly observationContextCount: number;
  readonly dynamicTargetDiscovery: false;
  readonly retryCount: 0;
}

export function validatePhase22ObservationBudget(budget: Phase22ObservationBudget): void {
  const integers = [budget.targetCount, budget.firstObservationCount, budget.replayObservationCount, budget.observationContextCount];
  if (integers.some((value) => !Number.isInteger(value) || value < 0)) invalid('BUDGET_INTEGER');
  if (budget.targetCount > 6 || budget.firstObservationCount > budget.targetCount || budget.replayObservationCount > budget.firstObservationCount || budget.observationContextCount > 12) invalid('BUDGET_BOUND');
  if (budget.firstObservationCount !== budget.targetCount || budget.observationContextCount !== budget.firstObservationCount + budget.replayObservationCount) invalid('BUDGET_COUNT');
  if (budget.dynamicTargetDiscovery !== false || budget.retryCount !== 0) invalid('BUDGET_POLICY');
}

export type Phase22MinimizationOutcome = 'REAL_MINIMIZATION_AUTHORIZED' | 'REAL_MINIMIZATION_NOT_AUTHORIZED';

export interface Phase22MinimizationDecision {
  readonly outcome: Phase22MinimizationOutcome;
  readonly removedReadOnlyStepCount: number;
  readonly addedRequestCount: 0;
  readonly mutationCount: 0;
  readonly deterministicDigest: string;
}

/** Real minimization can only remove already-defined read-only plan steps. */
export function decidePhase22RealMinimization(input: {
  readonly originalReadOnlyStepCount: number;
  readonly minimizedReadOnlyStepCount: number;
  readonly addedRequestCount: number;
  readonly mutationCount: number;
  readonly requiredPreconditionsPreserved: boolean;
}): Phase22MinimizationDecision {
  const validCounts = [input.originalReadOnlyStepCount, input.minimizedReadOnlyStepCount, input.addedRequestCount, input.mutationCount].every((value) => Number.isInteger(value) && value >= 0);
  const authorized = validCounts && input.minimizedReadOnlyStepCount <= input.originalReadOnlyStepCount && input.addedRequestCount === 0 && input.mutationCount === 0 && input.requiredPreconditionsPreserved;
  const core = {
    outcome: authorized ? 'REAL_MINIMIZATION_AUTHORIZED' as const : 'REAL_MINIMIZATION_NOT_AUTHORIZED' as const,
    removedReadOnlyStepCount: validCounts ? input.originalReadOnlyStepCount - input.minimizedReadOnlyStepCount : 0,
    addedRequestCount: 0 as const,
    mutationCount: 0 as const,
  };
  return { ...core, deterministicDigest: phase22Digest(core, 'minimization:sha256:') };
}
