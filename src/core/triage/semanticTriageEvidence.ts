// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — strict versioned semantic triage evidence DTO.
// Safe fields only, no raw customer values.
// Deterministic, no network/browser/fs/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import { validateSemanticReplayFidelityReceipt, type SemanticReplayFidelityReceipt } from './semanticReplay';
import { SEMANTIC_FINDING_CATEGORIES, type SemanticFindingCategory } from '../../oracles/semantic/types';

export const SEMANTIC_TRIAGE_EVIDENCE_VERSION = 'nightwatch.semantic-triage-evidence.v1' as const;

export type SemanticTriageSourceCurrentness =
  | 'CURRENT'
  | 'LOCAL_TRACKING_ONLY'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export type SemanticTriageOutcome =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'EXPECTATION_UNAVAILABLE'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_INVALID'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED'
  | 'PARTIAL_COVERAGE'
  | 'NO_EXPECTATION'
  | 'INTERNAL_ERROR';

export type SemanticReceiptOutcomeForTriage =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'NO_EXPECTATION'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_SOURCE_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'PARTIAL_COVERAGE';

export type TriageExactReplayStatus = 'REPRODUCED' | 'NOT_REPRODUCED' | 'INVALID' | 'NOT_EVALUATED';

export type TriageMinimalityGuarantee = '1-MINIMAL' | 'BOUNDED_MINIMAL' | 'NONE';

export const MISSING_EVIDENCE_VOCABULARY = [
  'EXACT_REPLAY_REQUIRED',
  'SOURCE_CURRENTNESS_UNRESOLVED',
  'SEMANTIC_EXPECTATION_UNRESOLVED',
  'PARTIAL_COLLECTION_COVERAGE',
  'MINIMIZATION_BUDGET_EXHAUSTED',
  'BROWSER_API_DIFFERENTIAL_UNAVAILABLE',
  'SOURCE_CHANGE_RELEVANCE_UNRESOLVED',
  'DEPLOYMENT_STATUS_UNRESOLVED',
  'DATASTORE_EVIDENCE_OUT_OF_SCOPE_BY_OWNER',
  'SAFETY_PRIVACY_NONZERO',
  'KNOWN_FALSE_POSITIVE_PRESENT',
  'ORACLE_RELIABILITY_UNRESOLVED',
  'SEMANTIC_IDENTITY_MISSING',
  'REPLAY_FINGERPRINT_MISMATCH',
  'COVERAGE_STATE_UNRESOLVED',
] as const;

export type MissingEvidenceCode = typeof MISSING_EVIDENCE_VOCABULARY[number];

export const MISSING_EVIDENCE_SET: ReadonlySet<string> = new Set<string>(MISSING_EVIDENCE_VOCABULARY as readonly string[]);

export interface SemanticTriageEvidence {
  readonly schemaVersion: typeof SEMANTIC_TRIAGE_EVIDENCE_VERSION;
  readonly expectationId: string;
  readonly targetId: string;
  readonly semanticFindingFingerprint: string;
  readonly invariantDefinitionId: string;
  readonly semanticOutcome: SemanticTriageOutcome;
  readonly receiptOutcome: SemanticReceiptOutcomeForTriage;
  readonly coverageState?: 'FULLY_EVALUATED_PASS' | 'VIOLATION' | 'EMPTY_NOT_APPLICABLE' | 'PARTIAL_COVERAGE_NO_VIOLATION' | 'PROJECTION_LIMIT_EXCEEDED';
  readonly receiptVersion: string;
  readonly sourceRepoId: string;
  readonly sourceSha: string;
  readonly sourceEvidenceDigest: string;
  readonly sourceDerivationVersion: string;
  readonly sourceCurrentness: SemanticTriageSourceCurrentness;
  /** Safe anomaly vocabulary for owner review; omitted by historical v1
   * evidence that predates the Phase 18 semantic-depth bridge. */
  readonly findingCategory?: SemanticFindingCategory;
  readonly exactReplayStatus: TriageExactReplayStatus;
  readonly exactFingerprintMatch: boolean;
  readonly minimalityGuarantee: TriageMinimalityGuarantee;
  readonly freshContextReproductions: number;
  readonly minimalSequenceReproductions: number;
  /** Optional Phase 18 occurrence/semantic identity proof. Omitted on
   * historical v1 evidence so legacy fixtures remain byte-meaning stable. */
  readonly replayFidelity?: SemanticReplayFidelityReceipt;
  readonly missingEvidence: readonly MissingEvidenceCode[];
}

const SAFE_ID_RE = /^[A-Za-z0-9._:/-]{1,200}$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const RECEIPT_VERSION_RE = /^nightwatch\.semantic-evaluation-receipt\.v[0-9]+$/;
const GENERIC_VERSION_RE = /^[A-Za-z0-9._~:@%/-]{1,200}$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'expectationId',
  'targetId',
  'semanticFindingFingerprint',
  'invariantDefinitionId',
  'semanticOutcome',
  'receiptOutcome',
  'coverageState',
  'receiptVersion',
  'sourceRepoId',
  'sourceSha',
  'sourceEvidenceDigest',
  'sourceDerivationVersion',
  'sourceCurrentness',
  'findingCategory',
  'exactReplayStatus',
  'exactFingerprintMatch',
  'minimalityGuarantee',
  'freshContextReproductions',
  'minimalSequenceReproductions',
  'replayFidelity',
  'missingEvidence',
]);

const VALID_SEMANTIC_OUTCOMES: ReadonlySet<string> = new Set([
  'PASS','ANOMALY','NOT_APPLICABLE','EXPECTATION_UNAVAILABLE','EXPECTATION_SOURCE_STALE','EXPECTATION_INVALID','INVALID_INPUT','PROJECTION_LIMIT_EXCEEDED','PARTIAL_COVERAGE','NO_EXPECTATION','INTERNAL_ERROR',
]);
const VALID_RECEIPT_OUTCOMES: ReadonlySet<string> = new Set([
  'PASS','ANOMALY','NOT_APPLICABLE','NO_EXPECTATION','EXPECTATION_SOURCE_STALE','EXPECTATION_SOURCE_UNAVAILABLE','INVALID_INPUT','PROJECTION_LIMIT_EXCEEDED','INTERNAL_ERROR','PARTIAL_COVERAGE',
]);
const VALID_COVERAGE: ReadonlySet<string> = new Set(['FULLY_EVALUATED_PASS','VIOLATION','EMPTY_NOT_APPLICABLE','PARTIAL_COVERAGE_NO_VIOLATION','PROJECTION_LIMIT_EXCEEDED']);
const VALID_CURRENTNESS: ReadonlySet<string> = new Set(['CURRENT','LOCAL_TRACKING_ONLY','STALE','UNAVAILABLE','UNKNOWN']);
const VALID_REPLAY: ReadonlySet<string> = new Set(['REPRODUCED','NOT_REPRODUCED','INVALID','NOT_EVALUATED']);
const VALID_MINIMALITY: ReadonlySet<string> = new Set(['1-MINIMAL','BOUNDED_MINIMAL','NONE']);

function assertNoSentinels(value: unknown, path = 'triageEvidence'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`TRIAGE_EVIDENCE_PRIVACY_BLOCKED:${path}`);
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

export function validateSemanticTriageEvidence(evidence: SemanticTriageEvidence): void {
  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) throw new Error('TRIAGE_EVIDENCE_NOT_OBJECT');
  const prototype = Object.getPrototypeOf(evidence);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('TRIAGE_EVIDENCE_PROTOTYPE_INVALID');
  if (evidence.schemaVersion !== SEMANTIC_TRIAGE_EVIDENCE_VERSION) throw new Error('TRIAGE_EVIDENCE_VERSION_INVALID');
  for (const key of Object.keys(evidence)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`TRIAGE_EVIDENCE_UNKNOWN_FIELD:${key}`);
  }
  if (!SAFE_ID_RE.test(evidence.expectationId) || SENTINEL_RE.test(evidence.expectationId)) throw new Error('TRIAGE_EVIDENCE_EXPECTATION_ID_INVALID');
  if (!SAFE_ID_RE.test(evidence.targetId) || SENTINEL_RE.test(evidence.targetId)) throw new Error('TRIAGE_EVIDENCE_TARGET_ID_INVALID');
  if (!FINGERPRINT_RE.test(evidence.semanticFindingFingerprint)) throw new Error('TRIAGE_EVIDENCE_FINGERPRINT_INVALID');
  if (!SAFE_ID_RE.test(evidence.invariantDefinitionId) || SENTINEL_RE.test(evidence.invariantDefinitionId)) throw new Error('TRIAGE_EVIDENCE_INVARIANT_ID_INVALID');
  if (!VALID_SEMANTIC_OUTCOMES.has(evidence.semanticOutcome)) throw new Error('TRIAGE_EVIDENCE_SEMANTIC_OUTCOME_INVALID');
  if (!VALID_RECEIPT_OUTCOMES.has(evidence.receiptOutcome)) throw new Error('TRIAGE_EVIDENCE_RECEIPT_OUTCOME_INVALID');
  if (evidence.coverageState !== undefined && !VALID_COVERAGE.has(evidence.coverageState)) throw new Error('TRIAGE_EVIDENCE_COVERAGE_INVALID');
  if (!RECEIPT_VERSION_RE.test(evidence.receiptVersion)) throw new Error('TRIAGE_EVIDENCE_RECEIPT_VERSION_INVALID');
  if (!SAFE_ID_RE.test(evidence.sourceRepoId) || SENTINEL_RE.test(evidence.sourceRepoId)) throw new Error('TRIAGE_EVIDENCE_SOURCE_REPO_INVALID');
  if (!SHA_RE.test(evidence.sourceSha)) throw new Error('TRIAGE_EVIDENCE_SOURCE_SHA_INVALID');
  if (!EVIDENCE_DIGEST_RE.test(evidence.sourceEvidenceDigest)) throw new Error('TRIAGE_EVIDENCE_EVIDENCE_DIGEST_INVALID');
  if (!GENERIC_VERSION_RE.test(evidence.sourceDerivationVersion)) throw new Error('TRIAGE_EVIDENCE_DERIVATION_VERSION_INVALID');
  if (!VALID_CURRENTNESS.has(evidence.sourceCurrentness)) throw new Error('TRIAGE_EVIDENCE_CURRENTNESS_INVALID');
  if (evidence.findingCategory !== undefined && !SEMANTIC_FINDING_CATEGORIES.includes(evidence.findingCategory)) throw new Error('TRIAGE_EVIDENCE_FINDING_CATEGORY_INVALID');
  if (!VALID_REPLAY.has(evidence.exactReplayStatus)) throw new Error('TRIAGE_EVIDENCE_REPLAY_STATUS_INVALID');
  if (typeof evidence.exactFingerprintMatch !== 'boolean') throw new Error('TRIAGE_EVIDENCE_FINGERPRINT_MATCH_INVALID');
  if (!VALID_MINIMALITY.has(evidence.minimalityGuarantee)) throw new Error('TRIAGE_EVIDENCE_MINIMALITY_INVALID');
  for (const field of ['freshContextReproductions','minimalSequenceReproductions'] as const) {
    const v = (evidence as unknown as Record<string, unknown>)[field];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) throw new Error(`TRIAGE_EVIDENCE_COUNT_INVALID:${field}`);
  }
  if (evidence.replayFidelity !== undefined) validateSemanticReplayFidelityReceipt(evidence.replayFidelity);
  if (!Array.isArray(evidence.missingEvidence)) throw new Error('TRIAGE_EVIDENCE_MISSING_EVIDENCE_NOT_ARRAY');
  const seen = new Set<string>();
  for (const code of evidence.missingEvidence) {
    if (typeof code !== 'string' || !MISSING_EVIDENCE_SET.has(code)) throw new Error(`TRIAGE_EVIDENCE_MISSING_CODE_INVALID:${code}`);
    if (seen.has(code)) throw new Error(`TRIAGE_EVIDENCE_MISSING_CODE_DUPLICATE:${code}`);
    seen.add(code);
  }
  // Deterministic ordering: must be sorted
  const sorted = [...evidence.missingEvidence].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== evidence.missingEvidence[i]) throw new Error('TRIAGE_EVIDENCE_MISSING_EVIDENCE_NOT_SORTED');
  }
  assertNoSentinels(evidence);
  // Cross-field coherence matrix. Impossible combinations are rejected rather
  // than treated as independent enums. Valid historical states are preserved.
  // PARTIAL_COVERAGE semantic outcome must pair with PARTIAL_COVERAGE_NO_VIOLATION.
  if (evidence.semanticOutcome === 'PARTIAL_COVERAGE' && evidence.coverageState !== 'PARTIAL_COVERAGE_NO_VIOLATION') {
    throw new Error('TRIAGE_EVIDENCE_PARTIAL_COVERAGE_STATE_MISMATCH');
  }
  // receipt PARTIAL_COVERAGE requires semantic PARTIAL_COVERAGE (reverse direction).
  if (evidence.receiptOutcome === 'PARTIAL_COVERAGE' && evidence.semanticOutcome !== 'PARTIAL_COVERAGE') {
    throw new Error('TRIAGE_EVIDENCE_PARTIAL_MISMATCH');
  }
  // PASS with collection coverage may only represent FULLY_EVALUATED_PASS (or non-collection absence).
  if (evidence.semanticOutcome === 'PASS' && evidence.coverageState !== undefined && evidence.coverageState !== 'FULLY_EVALUATED_PASS' && evidence.coverageState !== 'EMPTY_NOT_APPLICABLE') {
    throw new Error('TRIAGE_EVIDENCE_PASS_COVERAGE_MISMATCH');
  }
  // ANOMALY with a collection coverage state must carry an observed VIOLATION.
  if (evidence.semanticOutcome === 'ANOMALY' && evidence.coverageState !== undefined && evidence.coverageState !== 'VIOLATION') {
    throw new Error('TRIAGE_EVIDENCE_ANOMALY_COVERAGE_MISMATCH');
  }
  // CURRENT source currentness cannot coexist with a stale/unavailable receipt outcome.
  if (evidence.sourceCurrentness === 'CURRENT' && (evidence.receiptOutcome === 'EXPECTATION_SOURCE_STALE' || evidence.receiptOutcome === 'EXPECTATION_SOURCE_UNAVAILABLE')) {
    throw new Error('TRIAGE_EVIDENCE_CURRENTNESS_RECEIPT_MISMATCH');
  }
  // STALE/UNAVAILABLE source currentness cannot be paired with a contradictory fully-current receipt.
  if ((evidence.sourceCurrentness === 'STALE' || evidence.sourceCurrentness === 'UNAVAILABLE') && (evidence.receiptOutcome === 'PASS' || evidence.receiptOutcome === 'ANOMALY' || evidence.receiptOutcome === 'NOT_APPLICABLE')) {
    throw new Error('TRIAGE_EVIDENCE_CURRENTNESS_RECEIPT_CONTRADICTION');
  }
  // exactFingerprintMatch true requires exactReplayStatus REPRODUCED.
  if (evidence.exactFingerprintMatch === true && evidence.exactReplayStatus !== 'REPRODUCED') {
    throw new Error('TRIAGE_EVIDENCE_FINGERPRINT_REPLAY_MISMATCH');
  }
  // Non-reproduced replay status cannot claim an exact fingerprint match.
  if (evidence.exactReplayStatus !== 'REPRODUCED' && evidence.exactFingerprintMatch === true) {
    throw new Error('TRIAGE_EVIDENCE_REPLAY_FINGERPRINT_CONTRADICTION');
  }
  // Minimality other than NONE requires reproduced minimal-sequence evidence.
  if (evidence.minimalityGuarantee !== 'NONE' && evidence.minimalSequenceReproductions === 0) {
    throw new Error('TRIAGE_EVIDENCE_MINIMALITY_REPRODUCTION_MISMATCH');
  }
}

export type SemanticTriageEvidenceInput = Omit<SemanticTriageEvidence, 'schemaVersion' | 'missingEvidence'> & { readonly missingEvidence?: readonly MissingEvidenceCode[] };

export function createSemanticTriageEvidence(input: SemanticTriageEvidenceInput): SemanticTriageEvidence {
  const evidence: SemanticTriageEvidence = {
    schemaVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
    expectationId: input.expectationId,
    targetId: input.targetId,
    semanticFindingFingerprint: input.semanticFindingFingerprint,
    invariantDefinitionId: input.invariantDefinitionId,
    semanticOutcome: input.semanticOutcome,
    receiptOutcome: input.receiptOutcome,
    ...(input.coverageState === undefined ? {} : { coverageState: input.coverageState }),
    receiptVersion: input.receiptVersion,
    sourceRepoId: input.sourceRepoId,
    sourceSha: input.sourceSha,
    sourceEvidenceDigest: input.sourceEvidenceDigest,
    sourceDerivationVersion: input.sourceDerivationVersion,
    sourceCurrentness: input.sourceCurrentness,
    ...(input.findingCategory === undefined ? {} : { findingCategory: input.findingCategory }),
    exactReplayStatus: input.exactReplayStatus,
    exactFingerprintMatch: input.exactFingerprintMatch,
    minimalityGuarantee: input.minimalityGuarantee,
    freshContextReproductions: input.freshContextReproductions,
    minimalSequenceReproductions: input.minimalSequenceReproductions,
    ...(input.replayFidelity === undefined ? {} : { replayFidelity: input.replayFidelity }),
    missingEvidence: [...(input.missingEvidence ?? [])].sort() as readonly MissingEvidenceCode[],
  };
  validateSemanticTriageEvidence(evidence);
  return evidence;
}
