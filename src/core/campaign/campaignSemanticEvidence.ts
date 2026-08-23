// ---------------------------------------------------------------------------
// Nightwatch Phase 13I — strict versioned campaign semantic evidence DTO.
//
// Carries ONLY safe categorical/control identity needed for semantic
// promotion routing. All facts are mechanically derived from existing safe
// semantic findings/receipts and frozen semantic campaign bundle / resolver
// currentness. Raw response bodies, raw values, DOM, customer identifiers,
// cost strings, absolute paths, and bearer tokens are never present.
//
// The candidate caller cannot certify authority outcomes: CURRENT,
// REPRODUCED, HIGH, READY, SAFE are derived downstream, never carried here.
//
// Pure: no browser/network/fs/child-process/DB/AI/selfDev.
// ---------------------------------------------------------------------------

export const CAMPAIGN_SEMANTIC_EVIDENCE_VERSION = 'nightwatch.campaign-semantic-evidence.v1' as const;

export type CampaignSemanticResolverState = 'RESOLVED' | 'NO_EXPECTATION' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
export type CampaignSemanticCurrentness = 'CURRENT' | 'LOCAL_TRACKING_ONLY' | 'STALE' | 'UNAVAILABLE' | 'UNKNOWN';
export type CampaignSemanticReceiptOutcome =
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
export type CampaignSemanticCoverageState = 'FULLY_EVALUATED_PASS' | 'VIOLATION' | 'EMPTY_NOT_APPLICABLE' | 'PARTIAL_COVERAGE_NO_VIOLATION' | 'PROJECTION_LIMIT_EXCEEDED';
export type CampaignSemanticFindingCategory =
  | 'APPLICATION_ERROR_ENVELOPE'
  | 'LIST_DETAIL_IDENTITY_MISMATCH'
  | 'STALE_STATE_AFTER_TRANSITION'
  | 'AGGREGATE_RELATION_MISMATCH'
  | 'CARDINALITY_RELATION_MISMATCH'
  | 'IDENTITY_UNIQUENESS_VIOLATION'
  | 'PAGINATION_WINDOW_MISMATCH'
  | 'EMPTY_STATE_CONTRADICTION'
  | 'STATE_RELATION_MISMATCH'
  | 'CROSS_SURFACE_MISMATCH'
  | 'SOURCE_EXPECTATION_MISMATCH';

export interface CampaignSemanticEvidence {
  readonly schemaVersion: typeof CAMPAIGN_SEMANTIC_EVIDENCE_VERSION;
  /** Frozen bundle identity (derived deterministically from bundle fields). */
  readonly bundleId: string;
  readonly bundleVersion: string;
  readonly targetId: string;
  readonly expectationId: string;
  readonly sourceRepoId: string;
  readonly sourceSha: string;
  readonly sourceEvidenceDigest: string;
  readonly sourceDerivationVersion: string;
  readonly sourceAdmissionVersion: string;
  readonly resolverState: CampaignSemanticResolverState;
  readonly sourceCurrentness: CampaignSemanticCurrentness;
  readonly receiptOutcome: CampaignSemanticReceiptOutcome;
  readonly receiptVersion: string;
  /** Optional only for collection invariants where coverage is meaningful. */
  readonly coverageState?: CampaignSemanticCoverageState;
  readonly findingFingerprint: string;
  readonly findingCategory: CampaignSemanticFindingCategory;
  readonly invariantDefinitionId: string;
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,200}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;
const FINGERPRINT_RE = /^fp:sha256:[0-9a-f]{24}$/;
const BUNDLE_ID_RE = /^scb:sha256:[0-9a-f]{24}$/;
const INVARIANT_ID_RE = /^inv:sha256:[0-9a-f]{24}$/;
const GENERIC_VERSION_RE = /^[A-Za-z0-9._~:@%/-]{1,200}$/;
const RECEIPT_VERSION_RE = /^nightwatch\.semantic-evaluation-receipt\.v[0-9]+$/;
const SEMANTIC_BUNDLE_VERSION_RE = /^nightwatch\.semantic-campaign-bundle\.private\.v[0-9]+$/;
const SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'bundleId',
  'bundleVersion',
  'targetId',
  'expectationId',
  'sourceRepoId',
  'sourceSha',
  'sourceEvidenceDigest',
  'sourceDerivationVersion',
  'sourceAdmissionVersion',
  'resolverState',
  'sourceCurrentness',
  'receiptOutcome',
  'receiptVersion',
  'coverageState',
  'findingFingerprint',
  'findingCategory',
  'invariantDefinitionId',
]);

const VALID_RESOLVER: ReadonlySet<string> = new Set(['RESOLVED', 'NO_EXPECTATION', 'SOURCE_STALE', 'SOURCE_UNAVAILABLE']);
const VALID_CURRENTNESS: ReadonlySet<string> = new Set(['CURRENT', 'LOCAL_TRACKING_ONLY', 'STALE', 'UNAVAILABLE', 'UNKNOWN']);
const VALID_RECEIPT: ReadonlySet<string> = new Set(['PASS', 'ANOMALY', 'NOT_APPLICABLE', 'NO_EXPECTATION', 'EXPECTATION_SOURCE_STALE', 'EXPECTATION_SOURCE_UNAVAILABLE', 'INVALID_INPUT', 'PROJECTION_LIMIT_EXCEEDED', 'INTERNAL_ERROR', 'PARTIAL_COVERAGE']);
const VALID_COVERAGE: ReadonlySet<string> = new Set(['FULLY_EVALUATED_PASS', 'VIOLATION', 'EMPTY_NOT_APPLICABLE', 'PARTIAL_COVERAGE_NO_VIOLATION', 'PROJECTION_LIMIT_EXCEEDED']);
const VALID_CATEGORY: ReadonlySet<string> = new Set([
  'APPLICATION_ERROR_ENVELOPE',
  'LIST_DETAIL_IDENTITY_MISMATCH',
  'STALE_STATE_AFTER_TRANSITION',
  'AGGREGATE_RELATION_MISMATCH',
  'CARDINALITY_RELATION_MISMATCH',
  'IDENTITY_UNIQUENESS_VIOLATION',
  'PAGINATION_WINDOW_MISMATCH',
  'EMPTY_STATE_CONTRADICTION',
  'STATE_RELATION_MISMATCH',
  'CROSS_SURFACE_MISMATCH',
  'SOURCE_EXPECTATION_MISMATCH',
]);

// Certification-bearing sentinels must never be carried as evidence identity
// (caller asserts REPRODUCED/HIGH/READY/CURRENT/SAFE outside its authority).
const CERTIFICATION_RE = /\b(REPRODUCED|HIGH|READY|CURRENT|SAFE)\b/;

function assertNoSentinel(value: unknown, path = 'campaignSemanticEvidence'): void {
  if (typeof value === 'string') {
    if (SENTINEL_RE.test(value)) throw new Error(`CAMPAIGN_SEMANTIC_EVIDENCE_PRIVACY_BLOCKED:${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSentinel(item, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) assertNoSentinel(child, `${path}.${key}`);
  }
}

export function validateCampaignSemanticEvidence(evidence: unknown): asserts evidence is CampaignSemanticEvidence {
  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_NOT_OBJECT');
  const prototype = Object.getPrototypeOf(evidence);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_PROTOTYPE_INVALID');
  const typedEvidence = evidence as CampaignSemanticEvidence;
  if (typedEvidence.schemaVersion !== CAMPAIGN_SEMANTIC_EVIDENCE_VERSION) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_VERSION_INVALID');
  for (const key of Object.keys(evidence)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`CAMPAIGN_SEMANTIC_EVIDENCE_UNKNOWN_FIELD:${key}`);
  }
  assertNoSentinel(typedEvidence);
  if (!BUNDLE_ID_RE.test(typedEvidence.bundleId)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_BUNDLE_ID_INVALID');
  if (!SEMANTIC_BUNDLE_VERSION_RE.test(typedEvidence.bundleVersion)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_BUNDLE_VERSION_INVALID');
  if (!SAFE_ID_RE.test(typedEvidence.targetId) || SENTINEL_RE.test(typedEvidence.targetId)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_TARGET_ID_INVALID');
  if (!SAFE_ID_RE.test(typedEvidence.expectationId) || SENTINEL_RE.test(typedEvidence.expectationId)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_EXPECTATION_ID_INVALID');
  if (!SAFE_ID_RE.test(typedEvidence.sourceRepoId) || SENTINEL_RE.test(typedEvidence.sourceRepoId)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_SOURCE_REPO_INVALID');
  if (!SHA_RE.test(typedEvidence.sourceSha)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_SOURCE_SHA_INVALID');
  if (!EVIDENCE_DIGEST_RE.test(typedEvidence.sourceEvidenceDigest)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_DIGEST_INVALID');
  if (!GENERIC_VERSION_RE.test(typedEvidence.sourceDerivationVersion)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_DERIVATION_INVALID');
  if (!GENERIC_VERSION_RE.test(typedEvidence.sourceAdmissionVersion)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_ADMISSION_INVALID');
  if (!VALID_RESOLVER.has(typedEvidence.resolverState)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_RESOLVER_STATE_INVALID');
  if (!VALID_CURRENTNESS.has(typedEvidence.sourceCurrentness)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_CURRENTNESS_INVALID');
  if (!VALID_RECEIPT.has(typedEvidence.receiptOutcome)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_RECEIPT_OUTCOME_INVALID');
  if (!RECEIPT_VERSION_RE.test(typedEvidence.receiptVersion)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_RECEIPT_VERSION_INVALID');
  if (typedEvidence.coverageState !== undefined && !VALID_COVERAGE.has(typedEvidence.coverageState)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_COVERAGE_INVALID');
  if (!FINGERPRINT_RE.test(typedEvidence.findingFingerprint)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_FINGERPRINT_INVALID');
  if (!VALID_CATEGORY.has(typedEvidence.findingCategory)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_CATEGORY_INVALID');
  if (!INVARIANT_ID_RE.test(typedEvidence.invariantDefinitionId)) throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_INVARIANT_ID_INVALID');
  // Cross-field certification guard: no field of this DTO may carry a caller
  // certification token (REPRODUCED/HIGH/READY/CURRENT/SAFE) as raw value —
  // those signals are derived downstream from replay/confidence/dossier.
  for (const value of Object.values(typedEvidence)) {
    if (typeof value === 'string' && CERTIFICATION_RE.test(value) && !VALID_CURRENTNESS.has(value) && !VALID_RESOLVER.has(value)) {
      // Allow CURRENT only via the dedicated sourceCurrentness enum (already
      // validated above), and REPRODUCED/HIGH/READY/SAFE are never allowed.
      if (CERTIFICATION_RE.test(value) && !VALID_CURRENTNESS.has(value)) {
        throw new Error(`CAMPAIGN_SEMANTIC_EVIDENCE_CERTIFICATION_REJECTED:${value}`);
      }
    }
  }
  // Coherence: a stale/unavailable currentness must not pair with PASS/ANOMALY receipt
  if ((typedEvidence.sourceCurrentness === 'STALE' || typedEvidence.sourceCurrentness === 'UNAVAILABLE') &&
      (typedEvidence.receiptOutcome === 'PASS' || typedEvidence.receiptOutcome === 'ANOMALY' || typedEvidence.receiptOutcome === 'NOT_APPLICABLE')) {
    throw new Error('CAMPAIGN_SEMANTIC_EVIDENCE_CURRENTNESS_RECEIPT_CONTRADICTION');
  }
}

export function parseCampaignSemanticEvidence(raw: unknown): CampaignSemanticEvidence {
  validateCampaignSemanticEvidence(raw);
  return raw;
}

export function isCampaignSemanticCandidate(evidence: unknown): boolean {
  if (typeof evidence !== 'object' || evidence === null) return false;
  try {
    validateCampaignSemanticEvidence(evidence);
    return true;
  } catch {
    return false;
  }
}
