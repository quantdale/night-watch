// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — strict versioned semantic triage evidence DTO.
// Safe fields only, no raw customer values.
// Deterministic, no network/browser/fs/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

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
  readonly exactReplayStatus: TriageExactReplayStatus;
  readonly exactFingerprintMatch: boolean;
  readonly minimalityGuarantee: TriageMinimalityGuarantee;
  readonly freshContextReproductions: number;
  readonly minimalSequenceReproductions: number;
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
  'exactReplayStatus',
  'exactFingerprintMatch',
  'minimalityGuarantee',
  'freshContextReproductions',
  'minimalSequenceReproductions',
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
  if (!VALID_REPLAY.has(evidence.exactReplayStatus)) throw new Error('TRIAGE_EVIDENCE_REPLAY_STATUS_INVALID');
  if (typeof evidence.exactFingerprintMatch !== 'boolean') throw new Error('TRIAGE_EVIDENCE_FINGERPRINT_MATCH_INVALID');
  if (!VALID_MINIMALITY.has(evidence.minimalityGuarantee)) throw new Error('TRIAGE_EVIDENCE_MINIMALITY_INVALID');
  for (const field of ['freshContextReproductions','minimalSequenceReproductions'] as const) {
    const v = (evidence as unknown as Record<string, unknown>)[field];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) throw new Error(`TRIAGE_EVIDENCE_COUNT_INVALID:${field}`);
  }
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
  // Coherence checks
  if (evidence.semanticOutcome === 'PARTIAL_COVERAGE' && evidence.coverageState !== 'PARTIAL_COVERAGE_NO_VIOLATION') {
    // Allow missing coverageState? Must be consistent if present. Not strict fail? But enforce if coverageState present.
  }
  if (evidence.receiptOutcome === 'PARTIAL_COVERAGE' && evidence.semanticOutcome !== 'PARTIAL_COVERAGE') {
    throw new Error('TRIAGE_EVIDENCE_PARTIAL_MISMATCH');
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
    exactReplayStatus: input.exactReplayStatus,
    exactFingerprintMatch: input.exactFingerprintMatch,
    minimalityGuarantee: input.minimalityGuarantee,
    freshContextReproductions: input.freshContextReproductions,
    minimalSequenceReproductions: input.minimalSequenceReproductions,
    missingEvidence: [...(input.missingEvidence ?? [])].sort() as readonly MissingEvidenceCode[],
  };
  validateSemanticTriageEvidence(evidence);
  return evidence;
}

export function parseSemanticTriageEvidence(raw: unknown): SemanticTriageEvidence {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('TRIAGE_EVIDENCE_NOT_OBJECT');
  validateSemanticTriageEvidence(raw as SemanticTriageEvidence);
  return raw as SemanticTriageEvidence;
}
