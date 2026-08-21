// ---------------------------------------------------------------------------
// Nightwatch Phase 15P M A06 — unified replay result envelope.
//
// ONE structured value per replay attempt instead of ad-hoc tuples: plan
// identity, validation outcome, execution outcome (or an explicit
// not-executed reason), retained occurrence identities, explicit
// duplicate-action accounting, executor call count, a bounded classification
// (PASS | FAILURE | INVALID | PRECONDITION_DIVERGENCE | NOT_EXECUTED), and
// closed-vocabulary reason codes.
//
// Plan-vs-execution separation stays absolute: envelopes can be constructed
// ONLY from a ValidatedReplayPlanV2 path (not-executed / executed) or from a
// fail-closed validation result (validation-failure envelope). There is no
// constructor that accepts an unvalidated plan together with an executor,
// and nothing here replays anything: data-only and pure, no browser/network/
// fs/child-process/DB/AI authority. Identity fields echoed from unvalidated
// plans are individually pattern-screened before entering an envelope; raw
// customer values never cross this boundary.
// ---------------------------------------------------------------------------

import type { SafetyVector } from '../exploration/types';
import type { CandidateReplayOutcome } from './types';
import {
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  duplicateActionHandling,
  occurrenceIdentityToken,
  ordinalToActionMap,
  type DuplicateActionHandling,
  type ReplayCandidateKind,
  type ReplayPhase,
  type TriageReplayPlanV2,
} from './replayPlan';
import type { ReplayPlanValidationResult, ValidatedReplayPlanV2 } from './replayBinding';

export const TRIAGE_REPLAY_ENVELOPE_VERSION = 'nightwatch.triage-replay-envelope.private.v1' as const;

/** Bounded terminal classification of one replay attempt. */
export type ReplayEnvelopeClassification =
  | 'PASS'
  | 'FAILURE'
  | 'INVALID'
  | 'PRECONDITION_DIVERGENCE'
  | 'NOT_EXECUTED';

/** Why nothing was executed. Closed vocabulary; assigned only at construction. */
export type ReplayEnvelopeNotExecutedReason = 'PLAN_VALIDATION_FAILED' | 'VALIDATED_NOT_EXECUTED';

/**
 * Closed, bounded reason-code vocabulary: the twelve guard reasons plus the
 * envelope lifecycle codes. No free-form text ever enters reasonCodes.
 */
export type ReplayEnvelopeReasonCode =
  | 'ACTION_NOT_IN_ORIGINAL'
  | 'ACTION_NOT_APPROVED'
  | 'PRECONDITION_DIVERGENCE'
  | 'DEV_GATE_FAILED'
  | 'AUTH_GATE_FAILED'
  | 'OUTBOUND_POLICY_FAILED'
  | 'SEMANTIC_POLICY_FAILED'
  | 'MUTATION_TRIPWIRE'
  | 'UNKNOWN_TRIPWIRE'
  | 'ROUTE_ENVELOPE_FAILED'
  | 'PRIVACY_POLICY_FAILED'
  | 'SAFETY_VECTOR_NONZERO'
  | 'PLAN_VALIDATION_FAILED'
  | 'VALIDATED_NOT_EXECUTED';

const GUARD_REASON_CODES: ReadonlySet<string> = new Set([
  'ACTION_NOT_IN_ORIGINAL',
  'ACTION_NOT_APPROVED',
  'PRECONDITION_DIVERGENCE',
  'DEV_GATE_FAILED',
  'AUTH_GATE_FAILED',
  'OUTBOUND_POLICY_FAILED',
  'SEMANTIC_POLICY_FAILED',
  'MUTATION_TRIPWIRE',
  'UNKNOWN_TRIPWIRE',
  'ROUTE_ENVELOPE_FAILED',
  'PRIVACY_POLICY_FAILED',
  'SAFETY_VECTOR_NONZERO',
]);

const REASON_CODES: ReadonlySet<string> = new Set([...GUARD_REASON_CODES, 'PLAN_VALIDATION_FAILED', 'VALIDATED_NOT_EXECUTED']);

/** Plan identity echoed into the envelope. Optional fields appear only when they individually strict-validate (validation-failure envelopes may echo a malformed plan). */
export interface ReplayEnvelopePlanIdentity {
  readonly schemaVersion: typeof TRIAGE_REPLAY_PLAN_V2_VERSION;
  readonly planId?: string;
  readonly candidateKind?: ReplayCandidateKind;
  readonly phase?: ReplayPhase;
  readonly targetId?: string;
  readonly anomalyFingerprint?: string;
}

export interface ReplayEnvelopeValidationOutcome {
  readonly passed: boolean;
  /** Bounded raw validation reason (present iff passed === false). */
  readonly reason?: string;
}

export type ReplayEnvelopeExecutionOutcome =
  | { readonly executed: true; readonly outcome: CandidateReplayOutcome }
  | { readonly executed: false; readonly notExecutedReason: ReplayEnvelopeNotExecutedReason };

export interface ReplayEnvelopeOccurrenceIdentity {
  readonly ordinal: number;
  readonly actionId: string;
  readonly identityToken: string;
}

/**
 * Explicit duplicate-action accounting over the retained occurrences:
 * deduplicatedActionCount is how many retained entries a naive action-ID
 * dedup would have silently collapsed. Retained occurrences are NEVER
 * actually deduplicated — occurrence identity is load-bearing.
 */
export interface ReplayEnvelopeDuplicateAccounting {
  readonly handling: DuplicateActionHandling;
  readonly retainedOccurrenceCount: number;
  readonly distinctRetainedActionCount: number;
  readonly deduplicatedActionCount: number;
}

export interface ReplayResultEnvelope {
  readonly schemaVersion: typeof TRIAGE_REPLAY_ENVELOPE_VERSION;
  readonly plan: ReplayEnvelopePlanIdentity;
  readonly validation: ReplayEnvelopeValidationOutcome;
  readonly execution: ReplayEnvelopeExecutionOutcome;
  readonly occurrenceIdentities: readonly ReplayEnvelopeOccurrenceIdentity[];
  readonly unresolvedOccurrenceCount: number;
  readonly duplicates: ReplayEnvelopeDuplicateAccounting;
  readonly executorCallCount: number;
  readonly classification: ReplayEnvelopeClassification;
  readonly reasonCodes: readonly ReplayEnvelopeReasonCode[];
}

const PLAN_ID_RE = /^rp2:sha256:[0-9a-f]{24}$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const ACTION_ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;
const ROUTE_CLASS_RE = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const VALIDATION_REASON_RE = /^[A-Za-z0-9_:./-]{1,160}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const MAX_IDENTITY_ORDINAL = 999_999;
const MAX_RESOLVED_IDENTITIES = 64;
const MAX_REASON_CODES = 8;
const MAX_BOUNDED_COUNT = 999_999;
const MAX_EXECUTOR_CALLS = 64;
const MAX_SAFETY_COUNTER = 1_000_000;
const REDACTED_VALIDATION_REASON = 'VALIDATION_REASON_UNAVAILABLE';

const CANDIDATE_KINDS: ReadonlySet<string> = new Set(['JOURNEY', 'EXPLORATION', 'API']);
const REPLAY_PHASES: ReadonlySet<string> = new Set(['FRESH_EXACT_REPLAY', 'REDUCED_CANDIDATE']);
const OUTCOME_STATUSES: ReadonlySet<string> = new Set(['FAILURE', 'PASS', 'INVALID']);
const CLASSIFICATIONS: ReadonlySet<string> = new Set(['PASS', 'FAILURE', 'INVALID', 'PRECONDITION_DIVERGENCE', 'NOT_EXECUTED']);
const NOT_EXECUTED_REASONS: ReadonlySet<string> = new Set(['PLAN_VALIDATION_FAILED', 'VALIDATED_NOT_EXECUTED']);
const DUPLICATE_HANDLING: ReadonlySet<string> = new Set(['UNAMBIGUOUS_SINGLE_OCCURRENCE', 'OCCURRENCE_DISTINGUISHED']);
const SAFETY_KEYS: readonly string[] = [
  'productionAttempts',
  'proxyViolations',
  'unknownDestinations',
  'unknownApprovals',
  'knownMutations',
  'actionCausedUnknown',
  'dbQueries',
];

function assertNoSentinels(value: unknown, path = 'replayEnvelope'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`REPLAY_ENVELOPE_PRIVACY_BLOCKED:${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSentinels(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinels(child, `${path}.${key}`);
  }
}

function isBoundedInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

// --- Classification bridges ---------------------------------------------------

/**
 * Fail-closed validation result -> classification. Only the precondition
 * divergence reason earns its own class; every other validation failure is
 * INVALID.
 */
export function replayEnvelopeClassificationFromValidationReason(reason: string): Extract<ReplayEnvelopeClassification, 'INVALID' | 'PRECONDITION_DIVERGENCE'> {
  return reason === 'PRECONDITION_DIVERGENCE' ? 'PRECONDITION_DIVERGENCE' : 'INVALID';
}

/** Normalized executor outcome -> classification (exact fingerprint equality already enforced upstream). */
export function replayEnvelopeClassificationFromOutcome(outcome: CandidateReplayOutcome): ReplayEnvelopeClassification {
  if (outcome.status === 'FAILURE') return 'FAILURE';
  if (outcome.status === 'PASS') return 'PASS';
  return outcome.invalidReason === 'PRECONDITION_DIVERGENCE' ? 'PRECONDITION_DIVERGENCE' : 'INVALID';
}

// --- Construction helpers -----------------------------------------------------

/** Echo only identity fields that individually strict-validate; malformed fields from a rejected plan are simply absent. */
function sanitizedPlanIdentity(plan: TriageReplayPlanV2): ReplayEnvelopePlanIdentity {
  return {
    schemaVersion: TRIAGE_REPLAY_PLAN_V2_VERSION,
    ...(typeof plan.planId === 'string' && PLAN_ID_RE.test(plan.planId) ? { planId: plan.planId } : {}),
    ...(typeof plan.candidateKind === 'string' && CANDIDATE_KINDS.has(plan.candidateKind) ? { candidateKind: plan.candidateKind as ReplayCandidateKind } : {}),
    ...(typeof plan.phase === 'string' && REPLAY_PHASES.has(plan.phase) ? { phase: plan.phase as ReplayPhase } : {}),
    ...(typeof plan.targetId === 'string' && ACTION_ID_RE.test(plan.targetId) && !SENTINEL_RE.test(plan.targetId) ? { targetId: plan.targetId } : {}),
    ...(typeof plan.anomalyFingerprint === 'string' && FINGERPRINT_RE.test(plan.anomalyFingerprint) ? { anomalyFingerprint: plan.anomalyFingerprint } : {}),
  };
}

function fullPlanIdentity(plan: TriageReplayPlanV2): ReplayEnvelopePlanIdentity {
  const identity = sanitizedPlanIdentity(plan);
  if (identity.planId === undefined || identity.candidateKind === undefined || identity.phase === undefined || identity.targetId === undefined || identity.anomalyFingerprint === undefined) {
    throw new Error('REPLAY_ENVELOPE_PLAN_IDENTITY_INCOMPLETE');
  }
  return identity;
}

interface OccurrenceResolution {
  readonly identities: readonly ReplayEnvelopeOccurrenceIdentity[];
  readonly unresolvedCount: number;
}

/**
 * Total (never-throwing) resolution of retained ordinals to occurrence-aware
 * identity tokens. Ordinals from unvalidated plans may be malformed or
 * unbounded: invalid/unresolvable ordinals count toward unresolvedCount, and
 * resolution is capped at MAX_RESOLVED_IDENTITIES so hostile inputs cannot
 * inflate the envelope.
 */
function resolveOccurrenceIdentities(originalOccurrences: TriageReplayPlanV2['originalOccurrences'], retainedOrdinals: readonly number[]): OccurrenceResolution {
  const ordinalToAction = ordinalToActionMap(originalOccurrences);
  const validUniqueOrdinals = [...new Set(retainedOrdinals.filter((ord) => isBoundedInt(ord, 0, MAX_IDENTITY_ORDINAL)))].sort((a, b) => a - b);
  const identities: ReplayEnvelopeOccurrenceIdentity[] = [];
  let unresolvedCount = retainedOrdinals.length;
  for (const ord of validUniqueOrdinals.slice(0, MAX_RESOLVED_IDENTITIES)) {
    const id = ordinalToAction.get(ord);
    if (id === undefined || !ACTION_ID_RE.test(id) || SENTINEL_RE.test(id)) continue;
    identities.push({ ordinal: ord, actionId: id, identityToken: occurrenceIdentityToken(id, ord) });
    unresolvedCount -= 1;
  }
  return { identities, unresolvedCount };
}

function duplicateAccounting(originalOccurrences: TriageReplayPlanV2['originalOccurrences'], retainedOrdinals: readonly number[]): ReplayEnvelopeDuplicateAccounting {
  const ordinalToAction = ordinalToActionMap(originalOccurrences);
  const retainedIds = retainedOrdinals.map((ord) => ordinalToAction.get(ord)).filter((id): id is string => id !== undefined);
  const distinctRetainedActionCount = new Set(retainedIds).size;
  const retainedOccurrenceCount = retainedOrdinals.length;
  return {
    handling: duplicateActionHandling(originalOccurrences),
    retainedOccurrenceCount,
    distinctRetainedActionCount,
    deduplicatedActionCount: retainedOccurrenceCount - distinctRetainedActionCount,
  };
}

function validateSafetyVectorShape(safety: unknown): safety is SafetyVector {
  if (typeof safety !== 'object' || safety === null || Array.isArray(safety)) return false;
  const obj = safety as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!SAFETY_KEYS.includes(key)) return false;
  }
  for (const key of SAFETY_KEYS) {
    if (!isBoundedInt(obj[key], 0, MAX_SAFETY_COUNTER)) return false;
  }
  return true;
}

/**
 * Canonical copy of an executor outcome with every known field strictly
 * verified. Malformed KNOWN evidence fails closed (throw) rather than being
 * clamped or silently altered; unknown fields are dropped by the canonical
 * copy so the strict parser accepts exactly what construction emits.
 */
function sanitizedExecutorOutcome(outcome: CandidateReplayOutcome): CandidateReplayOutcome {
  if (typeof outcome !== 'object' || outcome === null) throw new Error('REPLAY_ENVELOPE_EXECUTOR_OUTCOME_INVALID');
  if (typeof outcome.status !== 'string' || !OUTCOME_STATUSES.has(outcome.status)) throw new Error('REPLAY_ENVELOPE_EXECUTOR_STATUS_INVALID');
  if (!validateSafetyVectorShape(outcome.safety)) throw new Error('REPLAY_ENVELOPE_SAFETY_VECTOR_INVALID');
  if (outcome.anomalyFingerprint !== undefined && (typeof outcome.anomalyFingerprint !== 'string' || !FINGERPRINT_RE.test(outcome.anomalyFingerprint))) {
    throw new Error('REPLAY_ENVELOPE_ANOMALY_FINGERPRINT_INVALID');
  }
  if (outcome.invalidReason !== undefined && !GUARD_REASON_CODES.has(outcome.invalidReason)) throw new Error('REPLAY_ENVELOPE_INVALID_REASON_UNKNOWN');
  if (outcome.routeClass !== undefined && (typeof outcome.routeClass !== 'string' || !ROUTE_CLASS_RE.test(outcome.routeClass))) {
    throw new Error('REPLAY_ENVELOPE_ROUTE_CLASS_INVALID');
  }
  return {
    status: outcome.status,
    safety: outcome.safety,
    ...(outcome.anomalyFingerprint !== undefined ? { anomalyFingerprint: outcome.anomalyFingerprint } : {}),
    ...(outcome.invalidReason !== undefined ? { invalidReason: outcome.invalidReason } : {}),
    ...(outcome.routeClass !== undefined ? { routeClass: outcome.routeClass } : {}),
  };
}

function sortedCodes(codes: ReadonlySet<ReplayEnvelopeReasonCode>): readonly ReplayEnvelopeReasonCode[] {
  const list = [...codes];
  if (list.length > MAX_REASON_CODES) throw new Error('REPLAY_ENVELOPE_TOO_MANY_REASON_CODES');
  return list.sort();
}

function boundedValidationReason(reason: string): string {
  return VALIDATION_REASON_RE.test(reason) && !SENTINEL_RE.test(reason) ? reason : REDACTED_VALIDATION_REASON;
}

// --- Pure construction functions ----------------------------------------------
//
// The ONLY three constructors. notExecuted/executed require the branded
// ValidatedReplayPlanV2 value; the validation-failure constructor requires
// the fail-closed variant of ReplayPlanValidationResult. No other path can
// produce an envelope.

/**
 * Envelope for a validated plan that was NOT executed (e.g. budget or policy
 * stopped before the executor seam). Executor was never invoked.
 */
export function notExecutedReplayResultEnvelope(validated: ValidatedReplayPlanV2): ReplayResultEnvelope {
  const resolution = resolveOccurrenceIdentities(validated.originalOccurrences, validated.retainedOccurrenceOrdinals);
  const envelope: ReplayResultEnvelope = {
    schemaVersion: TRIAGE_REPLAY_ENVELOPE_VERSION,
    plan: fullPlanIdentity(validated),
    validation: { passed: true },
    execution: { executed: false, notExecutedReason: 'VALIDATED_NOT_EXECUTED' },
    occurrenceIdentities: resolution.identities,
    unresolvedOccurrenceCount: resolution.unresolvedCount,
    duplicates: duplicateAccounting(validated.originalOccurrences, validated.retainedOccurrenceOrdinals),
    executorCallCount: 0,
    classification: 'NOT_EXECUTED',
    reasonCodes: ['VALIDATED_NOT_EXECUTED'],
  };
  validateReplayResultEnvelope(envelope);
  return envelope;
}

/**
 * Fail-closed envelope for a plan that never passed validation. Never touches
 * an executor; echoes only individually validated identity fields and records
 * the raw validation reason under a bounded, sentinel-screened field.
 */
export function validationFailureReplayResultEnvelope(plan: TriageReplayPlanV2, failure: Extract<ReplayPlanValidationResult, { valid: false }>): ReplayResultEnvelope {
  const resolution = resolveOccurrenceIdentities(plan.originalOccurrences, plan.retainedOccurrenceOrdinals);
  const codes = new Set<ReplayEnvelopeReasonCode>(['PLAN_VALIDATION_FAILED']);
  if (GUARD_REASON_CODES.has(failure.reason)) codes.add(failure.reason as ReplayEnvelopeReasonCode);
  const envelope: ReplayResultEnvelope = {
    schemaVersion: TRIAGE_REPLAY_ENVELOPE_VERSION,
    plan: sanitizedPlanIdentity(plan),
    validation: { passed: false, reason: boundedValidationReason(failure.reason) },
    execution: { executed: false, notExecutedReason: 'PLAN_VALIDATION_FAILED' },
    occurrenceIdentities: resolution.identities,
    unresolvedOccurrenceCount: resolution.unresolvedCount,
    duplicates: duplicateAccounting(plan.originalOccurrences, plan.retainedOccurrenceOrdinals),
    executorCallCount: 0,
    classification: replayEnvelopeClassificationFromValidationReason(failure.reason),
    reasonCodes: sortedCodes(codes),
  };
  validateReplayResultEnvelope(envelope);
  return envelope;
}

/**
 * Envelope for one completed execution of a validated plan through the
 * single executor seam. executorCallCount is supplied by the caller (the
 * binding wrapper records its exact invocation count); the outcome must be
 * the normalized post-execution value.
 */
export function executedReplayResultEnvelope(validated: ValidatedReplayPlanV2, outcome: CandidateReplayOutcome, executorCallCount: number): ReplayResultEnvelope {
  if (!isBoundedInt(executorCallCount, 0, MAX_EXECUTOR_CALLS)) throw new Error('REPLAY_ENVELOPE_EXECUTOR_CALL_COUNT_INVALID');
  const canonicalOutcome = sanitizedExecutorOutcome(outcome);
  const classification = replayEnvelopeClassificationFromOutcome(canonicalOutcome);
  const codes = new Set<ReplayEnvelopeReasonCode>();
  if (classification === 'INVALID' || classification === 'PRECONDITION_DIVERGENCE') {
    if (canonicalOutcome.invalidReason !== undefined) codes.add(canonicalOutcome.invalidReason);
    if (classification === 'PRECONDITION_DIVERGENCE') codes.add('PRECONDITION_DIVERGENCE');
  }
  const resolution = resolveOccurrenceIdentities(validated.originalOccurrences, validated.retainedOccurrenceOrdinals);
  const envelope: ReplayResultEnvelope = {
    schemaVersion: TRIAGE_REPLAY_ENVELOPE_VERSION,
    plan: fullPlanIdentity(validated),
    validation: { passed: true },
    execution: { executed: true, outcome: canonicalOutcome },
    occurrenceIdentities: resolution.identities,
    unresolvedOccurrenceCount: resolution.unresolvedCount,
    duplicates: duplicateAccounting(validated.originalOccurrences, validated.retainedOccurrenceOrdinals),
    executorCallCount,
    classification,
    reasonCodes: sortedCodes(codes),
  };
  validateReplayResultEnvelope(envelope);
  return envelope;
}

// --- Strict parse / validation --------------------------------------------------

const ENVELOPE_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'plan',
  'validation',
  'execution',
  'occurrenceIdentities',
  'unresolvedOccurrenceCount',
  'duplicates',
  'executorCallCount',
  'classification',
  'reasonCodes',
]);

const PLAN_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'planId',
  'candidateKind',
  'phase',
  'targetId',
  'anomalyFingerprint',
]);

const OUTCOME_ALLOWED_KEYS: ReadonlySet<string> = new Set(['status', 'anomalyFingerprint', 'safety', 'invalidReason', 'routeClass']);

function firstUnknownKey(obj: Record<string, unknown>, allowed: ReadonlySet<string>): string | null {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

export function validateReplayResultEnvelope(input: unknown): { valid: true; envelope: ReplayResultEnvelope } | { valid: false; reason: string } {
  const fail = (reason: string): { valid: false; reason: string } => ({ valid: false, reason });
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return fail('REPLAY_ENVELOPE_NOT_OBJECT');
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ENVELOPE_ALLOWED_KEYS.has(key)) return fail(`REPLAY_ENVELOPE_UNKNOWN_FIELD:${key}`);
  }
  try {
    assertNoSentinels(obj);
  } catch {
    return fail('REPLAY_ENVELOPE_PRIVACY_BLOCKED');
  }
  if (obj.schemaVersion !== TRIAGE_REPLAY_ENVELOPE_VERSION) return fail('REPLAY_ENVELOPE_VERSION_MISMATCH');

  // plan identity
  const plan = obj.plan;
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) return fail('REPLAY_ENVELOPE_PLAN_NOT_OBJECT');
  const planObj = plan as Record<string, unknown>;
  const planUnknown = firstUnknownKey(planObj, PLAN_ALLOWED_KEYS);
  if (planUnknown !== null) return fail(`REPLAY_ENVELOPE_PLAN_UNKNOWN_FIELD:${planUnknown}`);
  if (planObj.schemaVersion !== TRIAGE_REPLAY_PLAN_V2_VERSION) return fail('REPLAY_ENVELOPE_PLAN_VERSION_MISMATCH');
  if (planObj.planId !== undefined && !(typeof planObj.planId === 'string' && PLAN_ID_RE.test(planObj.planId))) return fail('REPLAY_ENVELOPE_PLAN_ID_INVALID');
  if (planObj.candidateKind !== undefined && !(typeof planObj.candidateKind === 'string' && CANDIDATE_KINDS.has(planObj.candidateKind))) return fail('REPLAY_ENVELOPE_PLAN_KIND_INVALID');
  if (planObj.phase !== undefined && !(typeof planObj.phase === 'string' && REPLAY_PHASES.has(planObj.phase))) return fail('REPLAY_ENVELOPE_PLAN_PHASE_INVALID');
  if (planObj.targetId !== undefined && !(typeof planObj.targetId === 'string' && ACTION_ID_RE.test(planObj.targetId))) return fail('REPLAY_ENVELOPE_PLAN_TARGET_INVALID');
  if (planObj.anomalyFingerprint !== undefined && !(typeof planObj.anomalyFingerprint === 'string' && FINGERPRINT_RE.test(planObj.anomalyFingerprint))) return fail('REPLAY_ENVELOPE_PLAN_FINGERPRINT_INVALID');

  // validation outcome
  const validation = obj.validation;
  if (typeof validation !== 'object' || validation === null || Array.isArray(validation)) return fail('REPLAY_ENVELOPE_VALIDATION_NOT_OBJECT');
  const validationObj = validation as Record<string, unknown>;
  const validationUnknown = firstUnknownKey(validationObj, new Set(['passed', 'reason']));
  if (validationUnknown !== null) return fail(`REPLAY_ENVELOPE_VALIDATION_UNKNOWN_FIELD:${validationUnknown}`);
  if (typeof validationObj.passed !== 'boolean') return fail('REPLAY_ENVELOPE_VALIDATION_PASSED_INVALID');
  if (validationObj.passed && validationObj.reason !== undefined) return fail('REPLAY_ENVELOPE_VALIDATION_REASON_UNEXPECTED');
  if (!validationObj.passed && !(typeof validationObj.reason === 'string' && VALIDATION_REASON_RE.test(validationObj.reason))) return fail('REPLAY_ENVELOPE_VALIDATION_REASON_INVALID');

  // execution outcome
  const execution = obj.execution;
  if (typeof execution !== 'object' || execution === null || Array.isArray(execution)) return fail('REPLAY_ENVELOPE_EXECUTION_NOT_OBJECT');
  const executionObj = execution as Record<string, unknown>;
  let executed: boolean;
  if (executionObj.executed === true) {
    const keys = new Set(Object.keys(executionObj));
    if (keys.size !== 2 || !keys.has('executed') || !keys.has('outcome')) return fail('REPLAY_ENVELOPE_EXECUTION_SHAPE_INVALID');
    const outcome = executionObj.outcome;
    if (typeof outcome !== 'object' || outcome === null || Array.isArray(outcome)) return fail('REPLAY_ENVELOPE_OUTCOME_NOT_OBJECT');
    const outcomeObj = outcome as Record<string, unknown>;
    const outcomeUnknown = firstUnknownKey(outcomeObj, OUTCOME_ALLOWED_KEYS);
    if (outcomeUnknown !== null) return fail(`REPLAY_ENVELOPE_OUTCOME_UNKNOWN_FIELD:${outcomeUnknown}`);
    if (typeof outcomeObj.status !== 'string' || !OUTCOME_STATUSES.has(outcomeObj.status)) return fail('REPLAY_ENVELOPE_OUTCOME_STATUS_INVALID');
    if (!validateSafetyVectorShape(outcomeObj.safety)) return fail('REPLAY_ENVELOPE_OUTCOME_SAFETY_INVALID');
    if (outcomeObj.anomalyFingerprint !== undefined && !(typeof outcomeObj.anomalyFingerprint === 'string' && FINGERPRINT_RE.test(outcomeObj.anomalyFingerprint))) return fail('REPLAY_ENVELOPE_OUTCOME_FINGERPRINT_INVALID');
    if (outcomeObj.invalidReason !== undefined && !(typeof outcomeObj.invalidReason === 'string' && GUARD_REASON_CODES.has(outcomeObj.invalidReason))) return fail('REPLAY_ENVELOPE_OUTCOME_INVALID_REASON_UNKNOWN');
    if (outcomeObj.routeClass !== undefined && !(typeof outcomeObj.routeClass === 'string' && ROUTE_CLASS_RE.test(outcomeObj.routeClass))) return fail('REPLAY_ENVELOPE_OUTCOME_ROUTE_INVALID');
    executed = true;
  } else if (executionObj.executed === false) {
    const keys = new Set(Object.keys(executionObj));
    if (keys.size !== 2 || !keys.has('executed') || !keys.has('notExecutedReason')) return fail('REPLAY_ENVELOPE_EXECUTION_SHAPE_INVALID');
    if (typeof executionObj.notExecutedReason !== 'string' || !NOT_EXECUTED_REASONS.has(executionObj.notExecutedReason)) return fail('REPLAY_ENVELOPE_NOT_EXECUTED_REASON_INVALID');
    executed = false;
  } else {
    return fail('REPLAY_ENVELOPE_EXECUTION_DISCRIMINATOR_INVALID');
  }

  // occurrence identities
  const identities = obj.occurrenceIdentities;
  if (!Array.isArray(identities) || identities.length > MAX_RESOLVED_IDENTITIES) return fail('REPLAY_ENVELOPE_IDENTITIES_INVALID');
  const seenOrdinals = new Set<number>();
  for (const entry of identities) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return fail('REPLAY_ENVELOPE_IDENTITY_NOT_OBJECT');
    const identityObj = entry as Record<string, unknown>;
    const identityUnknown = firstUnknownKey(identityObj, new Set(['ordinal', 'actionId', 'identityToken']));
    if (identityUnknown !== null) return fail(`REPLAY_ENVELOPE_IDENTITY_UNKNOWN_FIELD:${identityUnknown}`);
    if (!isBoundedInt(identityObj.ordinal, 0, MAX_IDENTITY_ORDINAL)) return fail('REPLAY_ENVELOPE_IDENTITY_ORDINAL_INVALID');
    if (typeof identityObj.actionId !== 'string' || !ACTION_ID_RE.test(identityObj.actionId)) return fail('REPLAY_ENVELOPE_IDENTITY_ACTION_INVALID');
    if (seenOrdinals.has(identityObj.ordinal)) return fail('REPLAY_ENVELOPE_IDENTITY_ORDINAL_DUPLICATE');
    seenOrdinals.add(identityObj.ordinal);
    // Token coherence: recomputed exactly as occurrenceIdentityToken derives it.
    if (identityObj.identityToken !== `${identityObj.actionId}#occ:${String(identityObj.ordinal)}`) return fail('REPLAY_ENVELOPE_IDENTITY_TOKEN_MISMATCH');
  }

  // unresolved occurrences
  if (!isBoundedInt(obj.unresolvedOccurrenceCount, 0, MAX_BOUNDED_COUNT)) return fail('REPLAY_ENVELOPE_UNRESOLVED_COUNT_INVALID');
  if ((obj.unresolvedOccurrenceCount as number) > 0 && validationObj.passed) return fail('REPLAY_ENVELOPE_UNRESOLVED_WITH_PASSED_VALIDATION');

  // duplicate accounting
  const duplicates = obj.duplicates;
  if (typeof duplicates !== 'object' || duplicates === null || Array.isArray(duplicates)) return fail('REPLAY_ENVELOPE_DUPLICATES_NOT_OBJECT');
  const duplicatesObj = duplicates as Record<string, unknown>;
  const duplicatesUnknown = firstUnknownKey(duplicatesObj, new Set(['handling', 'retainedOccurrenceCount', 'distinctRetainedActionCount', 'deduplicatedActionCount']));
  if (duplicatesUnknown !== null) return fail(`REPLAY_ENVELOPE_DUPLICATES_UNKNOWN_FIELD:${duplicatesUnknown}`);
  if (typeof duplicatesObj.handling !== 'string' || !DUPLICATE_HANDLING.has(duplicatesObj.handling)) return fail('REPLAY_ENVELOPE_DUPLICATES_HANDLING_INVALID');
  if (!isBoundedInt(duplicatesObj.retainedOccurrenceCount, 0, MAX_BOUNDED_COUNT)) return fail('REPLAY_ENVELOPE_DUPLICATES_RETAINED_INVALID');
  if (!isBoundedInt(duplicatesObj.distinctRetainedActionCount, 0, MAX_BOUNDED_COUNT)) return fail('REPLAY_ENVELOPE_DUPLICATES_DISTINCT_INVALID');
  if (!isBoundedInt(duplicatesObj.deduplicatedActionCount, 0, MAX_BOUNDED_COUNT)) return fail('REPLAY_ENVELOPE_DUPLICATES_DEDUP_INVALID');
  if ((duplicatesObj.deduplicatedActionCount as number) !== (duplicatesObj.retainedOccurrenceCount as number) - (duplicatesObj.distinctRetainedActionCount as number)) return fail('REPLAY_ENVELOPE_DUPLICATES_ARITHMETIC_INVALID');
  if ((duplicatesObj.deduplicatedActionCount as number) > 0 && duplicatesObj.handling !== 'OCCURRENCE_DISTINGUISHED') return fail('REPLAY_ENVELOPE_DUPLICATES_HANDLING_COHERENCE_INVALID');
  // Exact occurrence accounting: resolved identities + unresolved must equal
  // the retained occurrence count (construction guarantees this equation).
  if (identities.length + (obj.unresolvedOccurrenceCount as number) !== (duplicatesObj.retainedOccurrenceCount as number)) return fail('REPLAY_ENVELOPE_OCCURRENCE_ACCOUNTING_INVALID');

  // executor calls + classification + reason codes
  if (!isBoundedInt(obj.executorCallCount, 0, MAX_EXECUTOR_CALLS)) return fail('REPLAY_ENVELOPE_EXECUTOR_CALL_COUNT_INVALID');
  if (typeof obj.classification !== 'string' || !CLASSIFICATIONS.has(obj.classification)) return fail('REPLAY_ENVELOPE_CLASSIFICATION_INVALID');
  const codes = obj.reasonCodes;
  if (!Array.isArray(codes) || codes.length > MAX_REASON_CODES) return fail('REPLAY_ENVELOPE_REASON_CODES_INVALID');
  const seenCodes = new Set<string>();
  for (const code of codes) {
    if (typeof code !== 'string' || !REASON_CODES.has(code)) return fail('REPLAY_ENVELOPE_REASON_CODE_UNKNOWN');
    if (seenCodes.has(code)) return fail('REPLAY_ENVELOPE_REASON_CODE_DUPLICATE');
    seenCodes.add(code);
  }
  if (codes.some((code, i) => i > 0 && String(codes[i - 1]) > String(code))) return fail('REPLAY_ENVELOPE_REASON_CODES_NOT_SORTED');
  const classification = obj.classification as ReplayEnvelopeClassification;
  const includesCode = (code: string): boolean => seenCodes.has(code);

  // Cross-field coherence matrix (fail-closed).
  if (!validationObj.passed) {
    if (executed) return fail('REPLAY_ENVELOPE_EXECUTED_WITH_FAILED_VALIDATION');
    if (executionObj.notExecutedReason !== 'PLAN_VALIDATION_FAILED') return fail('REPLAY_ENVELOPE_NOT_EXECUTED_REASON_COHERENCE_INVALID');
    if ((obj.executorCallCount as number) !== 0) return fail('REPLAY_ENVELOPE_EXECUTOR_CALLED_WITH_FAILED_VALIDATION');
    if (classification !== 'INVALID' && classification !== 'PRECONDITION_DIVERGENCE') return fail('REPLAY_ENVELOPE_CLASSIFICATION_COHERENCE_INVALID');
    if (!includesCode('PLAN_VALIDATION_FAILED')) return fail('REPLAY_ENVELOPE_MISSING_PLAN_VALIDATION_FAILED_CODE');
    if (classification === 'PRECONDITION_DIVERGENCE' && !includesCode('PRECONDITION_DIVERGENCE')) return fail('REPLAY_ENVELOPE_MISSING_PRECONDITION_DIVERGENCE_CODE');
  } else if (!executed) {
    if (classification !== 'NOT_EXECUTED') return fail('REPLAY_ENVELOPE_CLASSIFICATION_COHERENCE_INVALID');
    if (executionObj.notExecutedReason !== 'VALIDATED_NOT_EXECUTED') return fail('REPLAY_ENVELOPE_NOT_EXECUTED_REASON_COHERENCE_INVALID');
    if ((obj.executorCallCount as number) !== 0) return fail('REPLAY_ENVELOPE_EXECUTOR_CALLED_WITHOUT_EXECUTION');
    if (!includesCode('VALIDATED_NOT_EXECUTED')) return fail('REPLAY_ENVELOPE_MISSING_VALIDATED_NOT_EXECUTED_CODE');
  } else {
    if (classification === 'NOT_EXECUTED') return fail('REPLAY_ENVELOPE_CLASSIFICATION_COHERENCE_INVALID');
    if ((obj.executorCallCount as number) < 1) return fail('REPLAY_ENVELOPE_EXECUTED_WITHOUT_EXECUTOR_CALL');
    const status = (executionObj.outcome as Record<string, unknown>).status;
    if (classification === 'PASS' && status !== 'PASS') return fail('REPLAY_ENVELOPE_CLASSIFICATION_OUTCOME_MISMATCH');
    if (classification === 'FAILURE' && status !== 'FAILURE') return fail('REPLAY_ENVELOPE_CLASSIFICATION_OUTCOME_MISMATCH');
    if ((classification === 'INVALID' || classification === 'PRECONDITION_DIVERGENCE') && status !== 'INVALID') return fail('REPLAY_ENVELOPE_CLASSIFICATION_OUTCOME_MISMATCH');
    if (classification === 'PRECONDITION_DIVERGENCE' && !includesCode('PRECONDITION_DIVERGENCE')) return fail('REPLAY_ENVELOPE_MISSING_PRECONDITION_DIVERGENCE_CODE');
  }

  return { valid: true, envelope: obj as unknown as ReplayResultEnvelope };
}

/** Strict parse; throws on any structural, privacy, or coherence violation. */
export function parseReplayResultEnvelope(raw: unknown): ReplayResultEnvelope {
  const result = validateReplayResultEnvelope(raw);
  if (!result.valid) throw new Error(`REPLAY_ENVELOPE_INVALID:${result.reason}`);
  return result.envelope;
}
