// ---------------------------------------------------------------------------
// Deterministic finding-intelligence vocabulary.
//
// Every classification is evidence-backed and ADVISORY ONLY: Nightwatch
// never issues the final organizational duplicate verdict, genuine/invalid
// verdict, or bounty decision. Each result carries that limitation
// literally. Pure module: no fs/network/child_process/DB/AI authority.
// ---------------------------------------------------------------------------

/** Version stamped into every intelligence result. */
export const FINDING_INTEL_VERSION = 'nightwatch.finding-intel.v1' as const;

export const FINDING_RELATIONSHIPS = [
  'EXACT_SAME_FINDING',
  'PROBABLE_DUPLICATE',
  'RELATED_FINDING',
  'SHARED_DEFECT_CLASS',
  'REGRESSION_CANDIDATE',
  'UNRELATED',
  'UNKNOWN',
] as const;

export type FindingRelationship = (typeof FINDING_RELATIONSHIPS)[number];

export const FINDING_RECURRENCE = [
  'FIRST_SEEN',
  'RECURRENT',
  'REGRESSION_CANDIDATE',
  'KNOWN_EXISTING',
  'UNKNOWN_HISTORY',
] as const;

export type FindingRecurrence = (typeof FINDING_RECURRENCE)[number];

/**
 * Where the "this is incorrect" claim comes from, strongest first.
 * Rank order is documented in provenance.ts and enforced by test.
 */
export const EXPECTATION_PROVENANCE = [
  'MACHINE_CONTRACT',
  'OPENSPEC_REQUIREMENT',
  'SCHEMA_INVARIANT',
  'PROTOCOL_CONTRACT',
  'SOURCE_INVARIANT',
  'TEST_ORACLE',
  'SEMANTIC_ORACLE',
  'SYNTHETIC_ORACLE',
  'HEURISTIC',
  'UNKNOWN',
] as const;

export type ExpectationProvenance = (typeof EXPECTATION_PROVENANCE)[number];

/**
 * Categorical evidence strength. Derived from evidence, never invented:
 * PROVEN requires a mechanical proof artifact; every other level names
 * the evidence that earned it.
 */
export const INTEL_CONFIDENCE = ['PROVEN', 'HIGH_CONFIDENCE', 'SUPPORTED', 'TENTATIVE', 'INSUFFICIENT'] as const;

export type IntelConfidence = (typeof INTEL_CONFIDENCE)[number];

/** Sanitized descriptor of one finding for relationship analysis. */
export interface IntelFindingDescriptor {
  readonly findingId: string;
  readonly fingerprint: string | null;
  readonly expectationId: string | null;
  readonly semanticContractId: string | null;
  readonly failureSignature: string | null;
  readonly route: string | null;
  readonly sourceLineage: string | null;
  readonly replayOutcome: 'PASS' | 'FAILURE' | 'INVALID' | null;
}

export interface RelationshipEvidence {
  readonly kind:
    | 'SAME_FINGERPRINT'
    | 'SAME_EXPECTATION'
    | 'SAME_SEMANTIC_CONTRACT'
    | 'SAME_FAILURE_SIGNATURE'
    | 'SAME_ROUTE'
    | 'SAME_SOURCE_LINEAGE'
    | 'SAME_REPLAY_OUTCOME';
  readonly detail: string;
}

export interface RelationshipCounterevidence {
  readonly kind:
    | 'DIFFERENT_FINGERPRINT'
    | 'DIFFERENT_EXPECTATION'
    | 'DIFFERENT_SEMANTIC_CONTRACT'
    | 'DIFFERENT_REPLAY_OUTCOME'
    | 'MISSING_COMPARISON_INPUT';
  readonly detail: string;
}

export interface RelationshipResult {
  readonly schemaVersion: typeof FINDING_INTEL_VERSION;
  readonly relationship: FindingRelationship;
  readonly evidence: readonly RelationshipEvidence[];
  readonly counterevidence: readonly RelationshipCounterevidence[];
  readonly confidence: IntelConfidence;
  /** The earlier finding this one may duplicate/relate to; null when none. Advisory pointer only. */
  readonly possibleOriginalId: string | null;
  readonly advisoryOnly: true;
  readonly finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL';
}

/**
 * One mechanical history entry for recurrence analysis.
 *
 * Every identity here belongs to the OBSERVATION this entry represents, and
 * none of it is optional in the type. An identity that was never established
 * is written `null` at the call site, deliberately: a producer that has to
 * type `null` has stated that it does not know, whereas a producer that omits
 * an optional field has stated nothing, and the two are indistinguishable
 * downstream. `sourceSha` in particular was fabricated as forty zeroes by the
 * one producer in the repository until it was made to say what it meant.
 */
export interface IntelHistoryEntry {
  readonly findingId: string;
  readonly fingerprint: string | null;
  readonly campaignId: string;
  /** Unix milliseconds; chronology binds on this, never on prose. */
  readonly observedAtMs: number;
  /**
   * Source identity of THIS observation. A real commit SHA, or the
   * `synthetic.<name>` form that names an absence. Never the repository's
   * current HEAD, which is a fact about now and not about the observation.
   */
  readonly sourceSha: string;
  /**
   * The mechanically established expectation identity of this observation, or
   * null. Carried from upstream evidence; never derived from prose.
   */
  readonly expectationId: string | null;
  /** The semantic contract / invariant identity, on the same terms. */
  readonly semanticContractId: string | null;
  /** Terminal outcome of the earlier finding where known. */
  readonly priorOutcome: 'OPEN' | 'RESOLVED_FIXED' | 'RESOLVED_OTHER' | 'REJECTED' | 'UNKNOWN';
}

export interface RecurrenceResult {
  readonly schemaVersion: typeof FINDING_INTEL_VERSION;
  readonly recurrence: FindingRecurrence;
  readonly evidence: readonly string[];
  readonly priorFindingId: string | null;
}

export interface DefectClass {
  readonly schemaVersion: typeof FINDING_INTEL_VERSION;
  readonly classId: string;
  readonly sharedInvariant: string;
  readonly memberFindingIds: readonly string[];
  readonly sourceScope: string;
  readonly mechanicalEvidence: readonly string[];
  readonly counterexamples: readonly string[];
  readonly confidence: IntelConfidence;
  readonly unknowns: readonly string[];
}
