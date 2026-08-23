// Phase 20 combinatorial adversarial corpus. Rows are safe classifications,
// never raw payloads or product values.

export const PHASE20_CORPUS_VERSION = "nightwatch.phase20-adversarial-corpus.v1" as const;

export type Phase20CaseFamily =
  | "DISCOVERY"
  | "RELATIONAL"
  | "DIFFERENTIAL"
  | "METAMORPHIC"
  | "MUTATION"
  | "REPLAY"
  | "MINIMIZATION"
  | "DRIFT"
  | "COVERAGE"
  | "PRIVACY"
  | "AUTHORITY"
  | "STRUCTURE"
  | "BENIGN";

export interface Phase20CorpusCase {
  readonly caseId: string;
  readonly family: Phase20CaseFamily;
  readonly behaviorClass: string;
  readonly expectedOutcome: string;
  readonly benignControl: boolean;
  readonly privacySafe: true;
}

const dimensions: readonly { readonly family: Phase20CaseFamily; readonly behaviorClass: string; readonly outcomes: readonly string[]; readonly benignControl?: boolean }[] = [
  { family: "DISCOVERY", behaviorClass: "REQUIRED_FIELD", outcomes: ["DISCOVERED", "MECHANICALLY_PROVABLE", "ADMITTED", "STALE_SOURCE", "UNSUPPORTED_SYNTAX", "DYNAMIC_KEY_REJECTED"] },
  { family: "RELATIONAL", behaviorClass: "TOTAL_EQUALS_SUM", outcomes: ["PASS", "VIOLATED", "NOT_APPLICABLE", "TRUNCATED_SAFE", "INVALID_INPUT", "SOURCE_PROOF_REQUIRED"] },
  { family: "RELATIONAL", behaviorClass: "SET_AND_PRESENCE", outcomes: ["SUBSET_PASS", "SUBSET_VIOLATED", "EXACTLY_ONE_PASS", "EXACTLY_ONE_VIOLATED", "MUTUALLY_EXCLUSIVE_PASS", "MUTUALLY_EXCLUSIVE_VIOLATED"] },
  { family: "DIFFERENTIAL", behaviorClass: "BROWSER_API", outcomes: ["EXACT_EQUIVALENT", "SEMANTICALLY_EQUIVALENT", "EXPECTED_DIFFERENCE", "CONTRACT_VIOLATION", "SOURCE_STALE", "INSUFFICIENT_AUTHORITY"] },
  { family: "METAMORPHIC", behaviorClass: "NORMALIZATION_AND_ORDER", outcomes: ["HOLDS", "VIOLATED", "NOT_APPLICABLE", "SOURCE_STALE", "PROJECTION_INCOMPATIBLE", "INSUFFICIENT_AUTHORITY"] },
  { family: "MUTATION", behaviorClass: "BOUNDARY_MUTANTS", outcomes: ["LOWER_BOUND", "UPPER_BOUND", "WRONG_TYPE", "WRONG_ENUM", "MISSING_REQUIRED", "SURVIVED"] },
  { family: "MUTATION", behaviorClass: "RELATION_MUTANTS", outcomes: ["AGGREGATE_MISMATCH", "ORDERING_MISMATCH", "DIFFERENTIAL_MISMATCH", "METAMORPHIC_MISMATCH", "REPLAYED", "MINIMIZED"] },
  { family: "REPLAY", behaviorClass: "CROSS_SURFACE_FINDING", outcomes: ["EXACT", "SEMANTIC_EQUIVALENT", "PRECONDITION_DIVERGENCE", "ENVIRONMENT_DIVERGENCE", "SOURCE_STALE", "NONDETERMINISTIC"] },
  { family: "MINIMIZATION", behaviorClass: "SAFE_SUBSEQUENCE", outcomes: ["SEMANTIC_FIXED_POINT", "BOUNDED_MINIMAL", "NOT_PROVEN_MINIMAL", "INVALID_PRECONDITION", "DEPENDENCY_PRESERVED", "SURVIVING_MUTANT"] },
  { family: "DRIFT", behaviorClass: "SOURCE_EVIDENCE", outcomes: ["CURRENT", "EVIDENCE_UNCHANGED", "SEMANTIC_REDERIVATION_REQUIRED", "CONTRACT_REMOVED", "CONTRACT_EXPANDED", "CONTRACT_NARROWED"] },
  { family: "COVERAGE", behaviorClass: "CONTRACT_GRAPH", outcomes: ["NOT_ADMITTED", "NOT_PROJECTABLE", "UNEXERCISED", "REPLAY_GAP", "MINIMIZATION_GAP", "DIFFERENTIAL_ELIGIBLE"] },
  { family: "PRIVACY", behaviorClass: "SAFE_PROJECTION", outcomes: ["SENTINEL_REJECTED", "FORBIDDEN_KEY_REJECTED", "UNKNOWN_FIELD_REJECTED", "RAW_VALUE_ABSENT", "CONTEXT_SERIALIZATION_REJECTED", "MALFORMED_PROJECTION_REJECTED"] },
  { family: "AUTHORITY", behaviorClass: "OWNER_SCOPE", outcomes: ["OWNER_POLICY_BLOCKED", "STALE_BLOCKED", "UNKNOWN_KIND_BLOCKED", "UNSUPPORTED_SURFACE"] },
  { family: "STRUCTURE", behaviorClass: "MALFORMED_INPUT", outcomes: ["CYCLIC_REJECTED", "DEPTH_LIMIT", "ARRAY_LIMIT", "OBJECT_LIMIT", "NON_JSON_REJECTED", "DUPLICATE_IDENTITY"] },
  { family: "BENIGN", behaviorClass: "EXPECTED_ALTERNATIVE", outcomes: ["NO_FINDING", "EXACT_EQUIVALENT", "EXPECTED_DIFFERENCE", "NORMALIZATION_HOLDS", "ORDERING_HOLDS", "EMPTY_NOT_APPLICABLE"], benignControl: true },
];

export const PHASE20_ADVERSARIAL_CASES: readonly Phase20CorpusCase[] = Object.freeze(dimensions.flatMap((dimension) => dimension.outcomes.map((expectedOutcome, index) => ({
  caseId: `phase20.${dimension.family.toLowerCase()}.${dimension.behaviorClass.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${String(index + 1).padStart(2, "0")}`,
  family: dimension.family,
  behaviorClass: dimension.behaviorClass,
  expectedOutcome,
  benignControl: dimension.benignControl ?? false,
  privacySafe: true as const,
}))));
