import {
  assertBoundedBoolean,
  assertBoundedInteger,
  assertId,
  assertNoRawArtifactFields,
  assertSourceIdentity,
  canonical,
  DIGEST_RE,
  digest,
  invalid,
  sortedUnique,
} from './common';
import {
  PHASE24_MINIMIZATION_VERSION,
  PHASE24_REPLAY_VERSION,
  type Phase24MinimizationInput,
  type Phase24MinimizationResult,
  type Phase24MinimizationUnit,
  type Phase24MinimizationUnitKind,
  type Phase24ReplayDecision,
  type Phase24ReplayFacts,
  type Phase24ReplayPlan,
  type Phase24SourceIdentity,
} from './types';

function validatePlan(plan: Phase24ReplayPlan): void {
  assertNoRawArtifactFields(plan);
  if (plan.schemaVersion !== PHASE24_REPLAY_VERSION || !/^replay-plan:sha256:[0-9a-f]{24}$/.test(plan.planIdentity) || !/^replay-plan-record:sha256:[0-9a-f]{24}$/.test(plan.deterministicDigest)) invalid('REPLAY_PLAN_HEADER');
  assertId(plan.candidateId, 'REPLAY_CANDIDATE');
  if (!/^candidate-decision:sha256:[0-9a-f]{24}$/.test(plan.candidateDecisionDigest)) invalid('REPLAY_CANDIDATE_DECISION');
  assertId(plan.occurrenceIdentity, 'REPLAY_OCCURRENCE');
  assertSourceIdentity(plan.source, 'REPLAY_SOURCE');
  if (plan.environment !== 'DEV' || plan.maxAttempts !== 1 || plan.maxContexts !== 2) invalid('REPLAY_BOUND');
  assertId(plan.semanticContractId, 'REPLAY_CONTRACT');
  assertId(plan.expectationId, 'REPLAY_EXPECTATION');
  if (!DIGEST_RE.test(plan.sanitizedObservationDigest) || plan.executionPrerequisites.length > 16 || plan.executionPrerequisites.some((value) => !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(value))) invalid('REPLAY_PREREQUISITES');
  const core = {
    schemaVersion: plan.schemaVersion,
    candidateId: plan.candidateId,
    candidateDecisionDigest: plan.candidateDecisionDigest,
    occurrenceIdentity: plan.occurrenceIdentity,
    source: plan.source,
    environment: plan.environment,
    semanticContractId: plan.semanticContractId,
    expectationId: plan.expectationId,
    sanitizedObservationDigest: plan.sanitizedObservationDigest,
    executionPrerequisites: plan.executionPrerequisites,
    maxAttempts: plan.maxAttempts,
    maxContexts: plan.maxContexts,
  };
  if (plan.planIdentity !== digest('replay-plan:', { candidateId: plan.candidateId, candidateDecisionDigest: plan.candidateDecisionDigest, occurrenceIdentity: plan.occurrenceIdentity, source: plan.source, semanticContractId: plan.semanticContractId, expectationId: plan.expectationId })) invalid('REPLAY_PLAN_ID');
  if (plan.deterministicDigest !== digest('replay-plan-record:', core)) invalid('REPLAY_PLAN_DIGEST');
}

export function createPhase24ReplayPlan(input: {
  readonly candidateId: string;
  readonly candidateDecisionDigest: string;
  readonly occurrenceIdentity: string;
  readonly source: Phase24SourceIdentity;
  readonly semanticContractId: string;
  readonly expectationId: string;
  readonly sanitizedObservationDigest: string;
  readonly executionPrerequisites: readonly string[];
}): Phase24ReplayPlan {
  assertNoRawArtifactFields(input);
  const prerequisites = sortedUnique(input.executionPrerequisites);
  const planIdentity = digest('replay-plan:', { candidateId: input.candidateId, candidateDecisionDigest: input.candidateDecisionDigest, occurrenceIdentity: input.occurrenceIdentity, source: input.source, semanticContractId: input.semanticContractId, expectationId: input.expectationId });
  const core = {
    schemaVersion: PHASE24_REPLAY_VERSION,
    candidateId: input.candidateId,
    candidateDecisionDigest: input.candidateDecisionDigest,
    occurrenceIdentity: input.occurrenceIdentity,
    source: input.source,
    environment: 'DEV' as const,
    semanticContractId: input.semanticContractId,
    expectationId: input.expectationId,
    sanitizedObservationDigest: input.sanitizedObservationDigest,
    executionPrerequisites: prerequisites,
    maxAttempts: 1 as const,
    maxContexts: 2 as const,
  };
  const plan: Phase24ReplayPlan = { ...core, planIdentity, deterministicDigest: digest('replay-plan-record:', core) };
  validatePlan(plan);
  return plan;
}

export function validatePhase24ReplayPlan(plan: Phase24ReplayPlan): void {
  validatePlan(plan);
}

/** Validate a replay artifact against the current canonical candidate decision. */
export function validatePhase24ReplayPlanAgainstCandidate(input: {
  readonly plan: Phase24ReplayPlan;
  readonly candidate: import('./types').Phase24CandidateDecision;
}): void {
  validatePlan(input.plan);
  const candidate = input.candidate;
  if (candidate.eligibility !== 'ELIGIBLE' || candidate.candidateId !== input.plan.candidateId || candidate.deterministicDigest !== input.plan.candidateDecisionDigest || candidate.source === null || canonical(candidate.source) !== canonical(input.plan.source) || candidate.contract?.contractId !== input.plan.semanticContractId || candidate.semanticExpectationId !== input.plan.expectationId) invalid('REPLAY_CANDIDATE_STALE');
}

/** Conservative replay classification; every divergence remains explicit. */
export function classifyPhase24Replay(input: { readonly plan: Phase24ReplayPlan; readonly facts: Phase24ReplayFacts }): Phase24ReplayDecision {
  validatePlan(input.plan);
  assertNoRawArtifactFields(input.facts);
  const facts = input.facts;
  for (const [key, value] of Object.entries(facts)) assertBoundedBoolean(value, `REPLAY_FACT_${key.toUpperCase()}`);
  let classification: Phase24ReplayDecision['classification'];
  let reasonCode: string;
  if (!facts.replayAttempted || !facts.sourceExact || !facts.semanticContractStillValid) {
    classification = !facts.replayAttempted ? 'INVALID_REPLAY' : 'SOURCE_DRIFT';
    reasonCode = !facts.replayAttempted ? 'REPLAY_NOT_ATTEMPTED' : !facts.sourceExact ? 'SOURCE_IDENTITY_MISMATCH' : 'SEMANTIC_CONTRACT_DRIFT';
  } else if (!facts.authReady) {
    classification = 'AUTH_DIVERGENCE';
    reasonCode = 'AUTH_NOT_READY';
  } else if (!facts.environmentAuthorized) {
    classification = 'ENVIRONMENT_DIVERGENCE';
    reasonCode = 'ENVIRONMENT_NOT_AUTHORIZED';
  } else if (!facts.prerequisitesStable) {
    classification = 'PRECONDITION_DIVERGENCE';
    reasonCode = 'REPLAY_PRECONDITION_CHANGED';
  } else if (facts.sameInvariantObserved) {
    classification = 'DETERMINISTIC_REPRODUCTION';
    reasonCode = 'SAME_INVARIANT_REPRODUCED';
  } else {
    classification = 'SEMANTIC_NON_REPRODUCTION';
    reasonCode = 'SEMANTIC_INVARIANT_NOT_REPRODUCED';
  }
  const core = {
    schemaVersion: PHASE24_REPLAY_VERSION,
    planIdentity: input.plan.planIdentity,
    classification,
    reasonCode,
    sameInvariantPreserved: classification === 'DETERMINISTIC_REPRODUCTION',
  } as const;
  return { ...core, deterministicDigest: digest('replay-decision:', core) };
}

const UNIT_KINDS: readonly Phase24MinimizationUnitKind[] = ['STEP', 'REQUEST_PARAMETER', 'CANDIDATE_DEPENDENCY', 'EVIDENCE_FIELD', 'SEMANTIC_INPUT'];

function validateUnit(unit: Phase24MinimizationUnit): void {
  assertNoRawArtifactFields(unit);
  if (!UNIT_KINDS.includes(unit.kind) || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(unit.identity)) invalid('MINIMIZATION_UNIT');
  assertBoundedBoolean(unit.preservesInvariant, 'MINIMIZATION_INVARIANT');
  assertBoundedBoolean(unit.preservesBugClass, 'MINIMIZATION_BUG_CLASS');
}

function complexity(units: readonly Phase24MinimizationUnit[]): Readonly<Record<Phase24MinimizationUnitKind, number>> {
  const result: Record<Phase24MinimizationUnitKind, number> = { STEP: 0, REQUEST_PARAMETER: 0, CANDIDATE_DEPENDENCY: 0, EVIDENCE_FIELD: 0, SEMANTIC_INPUT: 0 };
  for (const unit of units) result[unit.kind] += 1;
  return result;
}

/** Deterministic greedy reduction that can remove only proven-safe units. */
export function minimizePhase24Failure(input: Phase24MinimizationInput): Phase24MinimizationResult {
  assertNoRawArtifactFields(input);
  assertId(input.findingIdentity, 'FINDING');
  assertId(input.invariantId, 'INVARIANT');
  assertSourceIdentity(input.provenance, 'MINIMIZATION_SOURCE');
  if (input.originalUnits.length === 0 || input.originalUnits.length > 128) invalid('MINIMIZATION_ORIGINAL_BOUND');
  assertBoundedInteger(input.replayConfirmationCount, 'MINIMIZATION_REPLAY_COUNT', 1, 8);
  input.originalUnits.forEach(validateUnit);
  input.removableUnits.forEach(validateUnit);
  const originalIds = new Set(input.originalUnits.map((unit) => unit.identity));
  const removable = [...input.removableUnits]
    .filter((unit) => originalIds.has(unit.identity) && unit.preservesInvariant && unit.preservesBugClass)
    .sort((left, right) => left.kind.localeCompare(right.kind) || left.identity.localeCompare(right.identity));
  const removedUnitIdentities = sortedUnique(removable.map((unit) => unit.identity));
  const minimizedUnits = input.originalUnits.filter((unit) => !removedUnitIdentities.includes(unit.identity));
  if (minimizedUnits.length === 0) invalid('MINIMIZATION_EMPTY');
  const core = {
    schemaVersion: PHASE24_MINIMIZATION_VERSION,
    findingIdentity: input.findingIdentity,
    invariantId: input.invariantId,
    originalComplexity: complexity(input.originalUnits),
    minimizedComplexity: complexity(minimizedUnits),
    removedUnitIdentities,
    preservedInvariant: true as const,
    preservedBugClass: true as const,
    replayConfirmationCount: input.replayConfirmationCount,
    provenance: input.provenance,
  };
  return { ...core, deterministicDigest: digest('minimization:', core) };
}

export function validatePhase24Minimization(result: Phase24MinimizationResult): void {
  assertNoRawArtifactFields(result);
  if (result.schemaVersion !== PHASE24_MINIMIZATION_VERSION || result.preservedInvariant !== true || result.preservedBugClass !== true || result.replayConfirmationCount < 1) invalid('MINIMIZATION_RESULT');
  assertId(result.findingIdentity, 'MINIMIZATION_FINDING');
  assertId(result.invariantId, 'MINIMIZATION_INVARIANT');
  assertSourceIdentity(result.provenance, 'MINIMIZATION_PROVENANCE');
  if (!/^minimization:sha256:[0-9a-f]{24}$/.test(result.deterministicDigest)) invalid('MINIMIZATION_DIGEST_FORMAT');
  const core = {
    schemaVersion: result.schemaVersion,
    findingIdentity: result.findingIdentity,
    invariantId: result.invariantId,
    originalComplexity: result.originalComplexity,
    minimizedComplexity: result.minimizedComplexity,
    removedUnitIdentities: result.removedUnitIdentities,
    preservedInvariant: result.preservedInvariant,
    preservedBugClass: result.preservedBugClass,
    replayConfirmationCount: result.replayConfirmationCount,
    provenance: result.provenance,
  };
  if (result.deterministicDigest !== digest('minimization:', core)) invalid('MINIMIZATION_DIGEST');
}
