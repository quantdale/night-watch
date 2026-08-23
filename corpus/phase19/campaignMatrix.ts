// Phase 19 data-driven synthetic/adversarial matrix. Rows describe safe
// structural cases, not product values or real findings.

export const PHASE19_CORPUS_VERSION = "nightwatch.phase19-corpus.v1" as const;

export type Phase19CaseFamily =
  | "SEMANTIC"
  | "PROTOCOL"
  | "REPLAY"
  | "MINIMIZATION"
  | "COVERAGE"
  | "CLUSTER"
  | "AUTHORITY"
  | "PRIVACY"
  | "BENIGN";

export interface Phase19CorpusCase {
  readonly caseId: string;
  readonly family: Phase19CaseFamily;
  readonly anomalyClass: string;
  readonly expectedDisposition: string;
  readonly benignControl: boolean;
  readonly privacySafe: true;
}

const row = (caseId: string, family: Phase19CaseFamily, anomalyClass: string, expectedDisposition: string, benignControl = false): Phase19CorpusCase => ({ caseId, family, anomalyClass, expectedDisposition, benignControl, privacySafe: true });

export const PHASE19_CAMPAIGN_CASES: readonly Phase19CorpusCase[] = Object.freeze([
  row("semantic.aggregate-detail", "SEMANTIC", "AGGREGATE_DETAIL_RELATION", "ANOMALY"),
  row("semantic.identity-uniqueness", "SEMANTIC", "IDENTITY_UNIQUENESS", "ANOMALY"),
  row("semantic.cross-step-state", "SEMANTIC", "CROSS_STEP_STATE", "ANOMALY"),
  row("semantic.pagination", "SEMANTIC", "PAGINATION_CONTINUATION", "ANOMALY"),
  row("semantic.empty-state", "SEMANTIC", "EMPTY_STATE_CONTRADICTION", "ANOMALY"),
  row("semantic.lifecycle", "SEMANTIC", "LIFECYCLE_TRANSITION", "ANOMALY"),
  row("semantic.cross-surface", "SEMANTIC", "CROSS_SURFACE_CONSISTENCY", "ANOMALY"),
  row("semantic.http200-envelope", "SEMANTIC", "HTTP200_ERROR_ENVELOPE", "ANOMALY"),
  row("protocol.status", "PROTOCOL", "HTTP_STATUS", "ANOMALY"),
  row("protocol.shape", "PROTOCOL", "RESPONSE_SHAPE", "ANOMALY"),
  row("protocol.benign", "BENIGN", "EXPECTED_READ_RESPONSE", "NO_FINDING", true),
  row("replay.exact", "REPLAY", "EXACT", "REPRODUCED_EXACT"),
  row("replay.equivalent", "REPLAY", "SEMANTIC_EQUIVALENT", "REPRODUCED_SEMANTIC_EQUIVALENT"),
  row("replay.precondition", "REPLAY", "PRECONDITION", "PRECONDITION_DIVERGENCE"),
  row("replay.environment", "REPLAY", "ENVIRONMENT", "ENVIRONMENT_DIVERGENCE"),
  row("replay.ordering", "REPLAY", "ORDERING", "ORDERING_DIVERGENCE"),
  row("replay.timing", "REPLAY", "TIMING", "TIMING_SENSITIVE"),
  row("replay.stale", "REPLAY", "SOURCE_STALE", "SOURCE_STALE"),
  row("replay.not-applicable", "REPLAY", "NO_LONGER_APPLICABLE", "NO_LONGER_APPLICABLE"),
  row("replay.nondeterministic", "REPLAY", "NONDETERMINISTIC", "NONDETERMINISTIC"),
  row("minimization.greedy-trap", "MINIMIZATION", "DEPENDENCY_PAIR", "SEMANTIC_FIXED_POINT"),
  row("minimization.budget", "MINIMIZATION", "BOUNDED_SEARCH", "NOT_PROVEN_MINIMAL"),
  row("coverage.replay-gap", "COVERAGE", "REPLAY_GAP", "PARTIAL"),
  row("coverage.minimization-gap", "COVERAGE", "MINIMIZATION_GAP", "PARTIAL"),
  row("coverage.stale-authority", "COVERAGE", "STALE_AUTHORITY", "STALE"),
  row("cluster.semantic-merge", "CLUSTER", "SAME_INVARIANT_DIFFERENT_SYNTAX", "DUPLICATE_SUPPRESSED"),
  row("cluster.invariant-split", "CLUSTER", "DISTINCT_INVARIANT", "SEPARATE"),
  row("authority.owner-freeze", "AUTHORITY", "INFRASTRUCTURE_OPERATION", "OWNER_POLICY_BLOCKED"),
  row("authority.unsupported-surface", "AUTHORITY", "UNSUPPORTED_PRODUCT_SURFACE", "UNSUPPORTED"),
  row("privacy.malformed-evidence", "PRIVACY", "MALFORMED_SAFE_EVIDENCE", "REJECTED"),
  row("privacy.sentinel", "PRIVACY", "PRIVACY_SENTINEL", "REJECTED"),
]);
