// ---------------------------------------------------------------------------
// Nightwatch Phase 18 — occurrence-bound semantic replay fidelity.
//
// This is a pure, bounded evidence layer around the legacy V2 replay plan. V2
// ordinals remain the execution binding; this DTO records the additional
// semantic identity needed to prove that a replay exercised the same contract,
// predecessor context, and anomaly. It contains categorical values and
// digests only — never actions' raw parameters, response bodies, DOM, or
// customer values.
// ---------------------------------------------------------------------------

export const SEMANTIC_REPLAY_FIDELITY_VERSION = 'nightwatch.semantic-replay-fidelity.private.v3' as const;

export type SemanticReplayOutcomeClass =
  | 'REPRODUCED_EXACT'
  | 'REPRODUCED_EQUIVALENT_SEMANTIC'
  | 'PRECONDITION_DIVERGENCE'
  | 'SEMANTIC_DIVERGENCE'
  | 'NOT_REPRODUCED'
  | 'AMBIGUOUS_OCCURRENCE'
  | 'SOURCE_STALE'
  | 'INVALID_REPLAY'
  | 'INFRA_FAILURE';

export type SemanticReplayOccurrenceBinding = 'BOUND' | 'AMBIGUOUS' | 'INVALID';
export type SemanticReplayActionKind = 'JOURNEY_STEP' | 'EXPLORATION_ACTION' | 'API_OPERATION';
export type SemanticReplayCurrentness = 'CURRENT' | 'STALE' | 'AMBIGUOUS' | 'MISSING' | 'UNSUPPORTED' | 'SYNTHETIC_ONLY';

export interface SemanticReplayOccurrence {
  readonly actionKind: SemanticReplayActionKind;
  readonly stepOrdinal: number;
  readonly actionId: string;
  readonly semanticExpectationId: string;
  readonly predecessorContextDigest: string | null;
  readonly observationFingerprint: string;
}

export interface SemanticReplayFidelityReceipt {
  readonly schemaVersion: typeof SEMANTIC_REPLAY_FIDELITY_VERSION;
  readonly expectedSemanticFindingFingerprint: string;
  readonly expectedContractIdentity: string;
  readonly observedSemanticFindingFingerprint?: string;
  readonly observedContractIdentity?: string;
  readonly outcomeClass: SemanticReplayOutcomeClass;
  readonly occurrenceBinding: SemanticReplayOccurrenceBinding;
  readonly originalOccurrenceCount: number;
  readonly retainedOccurrenceCount: number;
  readonly sourceCurrentness: SemanticReplayCurrentness;
  readonly safetyClean: boolean;
  readonly deterministic: boolean;
  readonly rejectionReason?: SemanticReplayRejectionReason;
}

export type SemanticReplayRejectionReason =
  | 'ACTION_OCCURRENCE_AMBIGUOUS'
  | 'ACTION_OCCURRENCE_NOT_FOUND'
  | 'ACTION_OCCURRENCE_MISMATCH'
  | 'PREDECESSOR_CONTEXT_MISMATCH'
  | 'SEMANTIC_EXPECTATION_MISMATCH'
  | 'OBSERVATION_FINGERPRINT_MISMATCH'
  | 'SOURCE_CURRENTNESS_UNRESOLVED'
  | 'EXECUTOR_THROW'
  | 'EXECUTOR_NONDETERMINISTIC'
  | 'EXECUTOR_NOT_RUN';

export interface SemanticReplayOccurrenceBindingResult {
  readonly binding: SemanticReplayOccurrenceBinding;
  readonly retainedOrdinals: readonly number[];
  readonly reason?: Extract<SemanticReplayRejectionReason, 'ACTION_OCCURRENCE_AMBIGUOUS' | 'ACTION_OCCURRENCE_NOT_FOUND' | 'ACTION_OCCURRENCE_MISMATCH'>;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const CONTRACT_IDENTITY_RE = /^sci:sha256:[0-9a-f]{24}$/;
const CONTEXT_DIGEST_RE = /^ctx:sha256:[0-9a-f]{24}$/;
const MAX_OCCURRENCES = 64;
const MAX_ORDINAL = 999_999;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const OUTCOME_CLASSES: ReadonlySet<string> = new Set([
  'REPRODUCED_EXACT',
  'REPRODUCED_EQUIVALENT_SEMANTIC',
  'PRECONDITION_DIVERGENCE',
  'SEMANTIC_DIVERGENCE',
  'NOT_REPRODUCED',
  'AMBIGUOUS_OCCURRENCE',
  'SOURCE_STALE',
  'INVALID_REPLAY',
  'INFRA_FAILURE',
]);
const BINDINGS: ReadonlySet<string> = new Set(['BOUND', 'AMBIGUOUS', 'INVALID']);
const ACTION_KINDS: ReadonlySet<string> = new Set(['JOURNEY_STEP', 'EXPLORATION_ACTION', 'API_OPERATION']);
const CURRENTNESS: ReadonlySet<string> = new Set(['CURRENT', 'STALE', 'AMBIGUOUS', 'MISSING', 'UNSUPPORTED', 'SYNTHETIC_ONLY']);
const REJECTION_REASONS: ReadonlySet<string> = new Set([
  'ACTION_OCCURRENCE_AMBIGUOUS',
  'ACTION_OCCURRENCE_NOT_FOUND',
  'ACTION_OCCURRENCE_MISMATCH',
  'PREDECESSOR_CONTEXT_MISMATCH',
  'SEMANTIC_EXPECTATION_MISMATCH',
  'OBSERVATION_FINGERPRINT_MISMATCH',
  'SOURCE_CURRENTNESS_UNRESOLVED',
  'EXECUTOR_THROW',
  'EXECUTOR_NONDETERMINISTIC',
  'EXECUTOR_NOT_RUN',
]);

function safeId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value) || SENTINEL_RE.test(value)) throw new Error(`SEMANTIC_REPLAY_${label}_INVALID`);
  return value;
}

function safeFingerprint(value: unknown, label: string): string {
  if (typeof value !== 'string' || !FINGERPRINT_RE.test(value)) throw new Error(`SEMANTIC_REPLAY_${label}_INVALID`);
  return value;
}

function safeContractIdentity(value: unknown, label: string): string {
  if (typeof value !== 'string' || !CONTRACT_IDENTITY_RE.test(value)) throw new Error(`SEMANTIC_REPLAY_${label}_INVALID`);
  return value;
}

function validateOccurrence(value: unknown, index: number): asserts value is SemanticReplayOccurrence {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`SEMANTIC_REPLAY_OCCURRENCE_INVALID:${index}`);
  const occurrence = value as SemanticReplayOccurrence;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error(`SEMANTIC_REPLAY_OCCURRENCE_PROTOTYPE_INVALID:${index}`);
  assertNoUnknownFields(value as Record<string, unknown>, new Set(['actionKind', 'stepOrdinal', 'actionId', 'semanticExpectationId', 'predecessorContextDigest', 'observationFingerprint']), `occurrence[${index}]`);
  if (!ACTION_KINDS.has(occurrence.actionKind)) throw new Error(`SEMANTIC_REPLAY_OCCURRENCE_KIND_INVALID:${index}`);
  if (!Number.isInteger(occurrence.stepOrdinal) || occurrence.stepOrdinal < 0 || occurrence.stepOrdinal > MAX_ORDINAL) throw new Error(`SEMANTIC_REPLAY_OCCURRENCE_ORDINAL_INVALID:${index}`);
  safeId(occurrence.actionId, `OCCURRENCE_ACTION_ID_${index}`);
  safeId(occurrence.semanticExpectationId, `OCCURRENCE_EXPECTATION_ID_${index}`);
  if (occurrence.predecessorContextDigest !== null && !CONTEXT_DIGEST_RE.test(occurrence.predecessorContextDigest)) throw new Error(`SEMANTIC_REPLAY_PREDECESSOR_CONTEXT_INVALID:${index}`);
  safeFingerprint(occurrence.observationFingerprint, `OCCURRENCE_FINGERPRINT_${index}`);
}

function assertNoUnknownFields(value: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`SEMANTIC_REPLAY_UNKNOWN_FIELD:${label}.${key}`);
}

/** Bind a requested action sequence to occurrence ordinals. Action IDs alone
 * are deliberately rejected when any requested ID is repeated in the
 * original sequence; callers must supply V2 ordinals in that case. */
export function bindSemanticReplayOccurrences(input: {
  readonly original: readonly SemanticReplayOccurrence[];
  readonly requestedActionIds: readonly string[];
  readonly requestedOrdinals?: readonly number[];
}): SemanticReplayOccurrenceBindingResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('SEMANTIC_REPLAY_BINDING_INPUT_INVALID');
  const inputPrototype = Object.getPrototypeOf(input);
  if (inputPrototype !== Object.prototype && inputPrototype !== null) throw new Error('SEMANTIC_REPLAY_BINDING_INPUT_PROTOTYPE_INVALID');
  if (!Array.isArray(input.original) || !Array.isArray(input.requestedActionIds) || (input.requestedOrdinals !== undefined && !Array.isArray(input.requestedOrdinals))) throw new Error('SEMANTIC_REPLAY_BINDING_INPUT_ARRAY_INVALID');
  if (input.original.length === 0 || input.original.length > MAX_OCCURRENCES || input.requestedActionIds.length === 0 || input.requestedActionIds.length > MAX_OCCURRENCES) {
    return { binding: 'INVALID', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_NOT_FOUND' };
  }
  input.original.forEach(validateOccurrence);
  input.requestedActionIds.forEach((actionId, index) => safeId(actionId, `REQUESTED_ACTION_ID_${index}`));
  const byId = new Map<string, number[]>();
  for (const occurrence of input.original) {
    const values = byId.get(occurrence.actionId) ?? [];
    values.push(occurrence.stepOrdinal);
    byId.set(occurrence.actionId, values);
  }
  if (input.requestedOrdinals !== undefined) {
    if (input.requestedOrdinals.length !== input.requestedActionIds.length) return { binding: 'INVALID', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_MISMATCH' };
    const seen = new Set<number>();
    let previous = -1;
    for (let index = 0; index < input.requestedOrdinals.length; index += 1) {
      const ordinal = input.requestedOrdinals[index]!;
      const occurrence = input.original.find((candidate) => candidate.stepOrdinal === ordinal);
      if (occurrence === undefined) return { binding: 'INVALID', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_NOT_FOUND' };
      if (seen.has(ordinal) || ordinal <= previous || occurrence.actionId !== input.requestedActionIds[index]) return { binding: 'INVALID', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_MISMATCH' };
      seen.add(ordinal);
      previous = ordinal;
    }
    return { binding: 'BOUND', retainedOrdinals: [...input.requestedOrdinals] };
  }
  if (input.requestedActionIds.some((actionId) => (byId.get(actionId)?.length ?? 0) > 1)) {
    return { binding: 'AMBIGUOUS', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_AMBIGUOUS' };
  }
  const retained: number[] = [];
  let previous = -1;
  for (const actionId of input.requestedActionIds) {
    const ordinal = byId.get(actionId)?.[0];
    if (ordinal === undefined || ordinal <= previous) return { binding: 'INVALID', retainedOrdinals: [], reason: 'ACTION_OCCURRENCE_NOT_FOUND' };
    retained.push(ordinal);
    previous = ordinal;
  }
  return { binding: 'BOUND', retainedOrdinals: retained };
}

export interface SemanticReplayClassificationInput {
  readonly expectedSemanticFindingFingerprint: string;
  readonly expectedContractIdentity: string;
  readonly observedSemanticFindingFingerprint?: string;
  readonly observedContractIdentity?: string;
  readonly terminalStatus: 'FAILURE' | 'PASS' | 'INVALID' | 'NOT_EXECUTED';
  readonly occurrenceBinding: SemanticReplayOccurrenceBinding;
  readonly sourceCurrentness: SemanticReplayCurrentness;
  readonly safetyClean: boolean;
  readonly executorThrew?: boolean;
  readonly executorNondeterministic?: boolean;
  readonly preconditionDiverged?: boolean;
}

/** Total classification with a deliberately conservative precedence order. */
export function classifySemanticReplay(input: SemanticReplayClassificationInput): SemanticReplayOutcomeClass {
  safeFingerprint(input.expectedSemanticFindingFingerprint, 'EXPECTED_FINGERPRINT');
  safeContractIdentity(input.expectedContractIdentity, 'EXPECTED_CONTRACT_IDENTITY');
  if (input.observedSemanticFindingFingerprint !== undefined) safeFingerprint(input.observedSemanticFindingFingerprint, 'OBSERVED_FINGERPRINT');
  if (input.observedContractIdentity !== undefined) safeContractIdentity(input.observedContractIdentity, 'OBSERVED_CONTRACT_IDENTITY');
  if (!CURRENTNESS.has(input.sourceCurrentness)) throw new Error('SEMANTIC_REPLAY_CURRENTNESS_INVALID');
  if (input.sourceCurrentness === 'STALE') return 'SOURCE_STALE';
  if (input.occurrenceBinding === 'AMBIGUOUS') return 'AMBIGUOUS_OCCURRENCE';
  if (input.occurrenceBinding === 'INVALID') return 'INVALID_REPLAY';
  if (!input.safetyClean) return 'INFRA_FAILURE';
  if (input.executorNondeterministic) return 'INFRA_FAILURE';
  if (input.executorThrew) return 'INFRA_FAILURE';
  if (input.preconditionDiverged) return 'PRECONDITION_DIVERGENCE';
  if (input.terminalStatus === 'NOT_EXECUTED') return 'INVALID_REPLAY';
  if (input.terminalStatus === 'INVALID') return 'INVALID_REPLAY';
  if (input.terminalStatus !== 'FAILURE') return 'NOT_REPRODUCED';
  if (input.observedSemanticFindingFingerprint === input.expectedSemanticFindingFingerprint) return 'REPRODUCED_EXACT';
  if (input.observedContractIdentity === input.expectedContractIdentity) return 'REPRODUCED_EQUIVALENT_SEMANTIC';
  if (input.observedSemanticFindingFingerprint === undefined && input.observedContractIdentity === undefined) return 'NOT_REPRODUCED';
  return 'SEMANTIC_DIVERGENCE';
}

export function createSemanticReplayFidelityReceipt(input: Omit<SemanticReplayFidelityReceipt, 'schemaVersion'>): SemanticReplayFidelityReceipt {
  const receipt: SemanticReplayFidelityReceipt = { schemaVersion: SEMANTIC_REPLAY_FIDELITY_VERSION, ...input };
  validateSemanticReplayFidelityReceipt(receipt);
  return receipt;
}

export function validateSemanticReplayFidelityReceipt(value: unknown): asserts value is SemanticReplayFidelityReceipt {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('SEMANTIC_REPLAY_RECEIPT_NOT_OBJECT');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('SEMANTIC_REPLAY_RECEIPT_PROTOTYPE_INVALID');
  const receipt = value as Record<string, unknown>;
  assertNoUnknownFields(receipt, new Set([
    'schemaVersion', 'expectedSemanticFindingFingerprint', 'expectedContractIdentity', 'observedSemanticFindingFingerprint', 'observedContractIdentity',
    'outcomeClass', 'occurrenceBinding', 'originalOccurrenceCount', 'retainedOccurrenceCount', 'sourceCurrentness', 'safetyClean', 'deterministic', 'rejectionReason',
  ]), 'receipt');
  if (receipt.schemaVersion !== SEMANTIC_REPLAY_FIDELITY_VERSION) throw new Error('SEMANTIC_REPLAY_RECEIPT_VERSION_INVALID');
  safeFingerprint(receipt.expectedSemanticFindingFingerprint, 'EXPECTED_FINGERPRINT');
  safeContractIdentity(receipt.expectedContractIdentity, 'EXPECTED_CONTRACT_IDENTITY');
  if (receipt.observedSemanticFindingFingerprint !== undefined) safeFingerprint(receipt.observedSemanticFindingFingerprint, 'OBSERVED_FINGERPRINT');
  if (receipt.observedContractIdentity !== undefined) safeContractIdentity(receipt.observedContractIdentity, 'OBSERVED_CONTRACT_IDENTITY');
  if (typeof receipt.outcomeClass !== 'string' || !OUTCOME_CLASSES.has(receipt.outcomeClass)) throw new Error('SEMANTIC_REPLAY_RECEIPT_OUTCOME_INVALID');
  if (typeof receipt.occurrenceBinding !== 'string' || !BINDINGS.has(receipt.occurrenceBinding)) throw new Error('SEMANTIC_REPLAY_RECEIPT_BINDING_INVALID');
  for (const field of ['originalOccurrenceCount', 'retainedOccurrenceCount'] as const) {
    const count = receipt[field];
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > MAX_OCCURRENCES) throw new Error(`SEMANTIC_REPLAY_RECEIPT_${field.toUpperCase()}_INVALID`);
  }
  const originalOccurrenceCount = receipt.originalOccurrenceCount as number;
  const retainedOccurrenceCount = receipt.retainedOccurrenceCount as number;
  if (retainedOccurrenceCount > originalOccurrenceCount) throw new Error('SEMANTIC_REPLAY_RECEIPT_COUNT_RELATION_INVALID');
  if (typeof receipt.sourceCurrentness !== 'string' || !CURRENTNESS.has(receipt.sourceCurrentness)) throw new Error('SEMANTIC_REPLAY_RECEIPT_CURRENTNESS_INVALID');
  if (typeof receipt.safetyClean !== 'boolean' || typeof receipt.deterministic !== 'boolean') throw new Error('SEMANTIC_REPLAY_RECEIPT_BOOLEAN_INVALID');
  if (receipt.rejectionReason !== undefined && (typeof receipt.rejectionReason !== 'string' || !REJECTION_REASONS.has(receipt.rejectionReason))) throw new Error('SEMANTIC_REPLAY_RECEIPT_REJECTION_INVALID');
  if (receipt.outcomeClass === 'AMBIGUOUS_OCCURRENCE' && receipt.occurrenceBinding !== 'AMBIGUOUS') throw new Error('SEMANTIC_REPLAY_RECEIPT_AMBIGUITY_BINDING_MISMATCH');
  if (receipt.outcomeClass === 'REPRODUCED_EXACT' && (receipt.occurrenceBinding !== 'BOUND' || receipt.sourceCurrentness !== 'CURRENT' || !receipt.safetyClean || !receipt.deterministic || receipt.observedSemanticFindingFingerprint !== receipt.expectedSemanticFindingFingerprint)) throw new Error('SEMANTIC_REPLAY_RECEIPT_EXACT_COHERENCE_INVALID');
}
