// Phase 21 data-driven adversarial corpus. Rows are bounded semantic classes,
// never source/runtime values.

import { PHASE20_ADVERSARIAL_CASES, type Phase20CorpusCase } from "../phase20/adversarialMatrix";

export const PHASE21_CORPUS_VERSION = "nightwatch.phase21-adversarial-corpus.v1" as const;

export type Phase21CaseFamily =
  | "MEMBERSHIP"
  | "PRIVACY_MEMBERSHIP"
  | "DIFFERENTIAL_ALIGNMENT"
  | "REPLAY_EQUIVALENCE"
  | "DEPENDENCY_MINIMIZATION"
  | "GRAPH_NORMALIZATION"
  | "COVERAGE_QUALITY"
  | "STALE_PROOF"
  | "BENIGN_CROSS_SURFACE"
  | "OPERATION_CACHE";

export interface Phase21CorpusCase {
  readonly caseId: string;
  readonly family: Phase21CaseFamily;
  readonly behaviorClass: string;
  readonly expectedOutcome: string;
  readonly benignControl: boolean;
  readonly privacySafe: true;
}

const dimensions: readonly { readonly family: Phase21CaseFamily; readonly behaviorClass: string; readonly outcomes: readonly string[]; readonly benignControl?: boolean }[] = [
  { family: "MEMBERSHIP", behaviorClass: "FINITE_SET", outcomes: ["ALL_ALLOWED", "SOME_DISALLOWED", "NONE_ALLOWED", "EXACT_ALLOWED_SET", "STRICT_SUBSET", "SUPERSET_OR_UNKNOWN_MEMBER", "MISSING", "AMBIGUOUS", "TRUNCATED"] },
  { family: "PRIVACY_MEMBERSHIP", behaviorClass: "NO_RAW_DISCLOSURE", outcomes: ["RAW_LITERAL_ABSENT", "TOKEN_ABSENT", "DIGEST_CORRELATION_BOUND", "REPEATED_PROBE_BOUNDED", "HIGH_CARDINALITY_REJECTED", "HOSTILE_PATH_REJECTED"] },
  { family: "DIFFERENTIAL_ALIGNMENT", behaviorClass: "EXPLICIT_EQUIVALENCE", outcomes: ["SCALAR_LIST_EQUIVALENT", "ABSENT_NULL_EQUIVALENT", "ORDER_SET_EQUIVALENT", "UNKNOWN_ALIGNMENT_REJECTED", "EXPECTED_DIFFERENCE", "PAIR_SOURCE_STALE"] },
  { family: "REPLAY_EQUIVALENCE", behaviorClass: "CONTRACT_BOUND_REPLAY", outcomes: ["REPRODUCED_EXACT", "REPRODUCED_SEMANTIC_EQUIVALENT", "REPRESENTATION_CHANGED_CONTRACT_PRESERVED", "PRECONDITION_DIVERGENCE", "OBSERVATION_DIVERGENCE", "CONTRACT_CHANGED", "NONDETERMINISTIC", "INVALID"] },
  { family: "DEPENDENCY_MINIMIZATION", behaviorClass: "SEMANTIC_DEPENDENCY", outcomes: ["DEPENDENCY_PRESERVED", "DEPENDENCY_REMOVAL_REJECTED", "SAME_FINDING_IDENTITY", "DIFFERENT_FINDING_REJECTED", "SEMANTIC_FIXED_POINT", "BUDGET_BOUND"] },
  { family: "GRAPH_NORMALIZATION", behaviorClass: "DUPLICATE_IDENTITY", outcomes: ["EXPLICIT_DUPLICATE_MERGED", "SIMILAR_SHAPE_NOT_MERGED", "SOURCE_JOIN_MISSING", "SURFACE_DISTINCT", "DRIFT_NEW_IDENTITY"] },
  { family: "COVERAGE_QUALITY", behaviorClass: "LIFECYCLE_DEPTH", outcomes: ["PROJECTED", "DETECTED_SYNTHETIC", "REPLAYED", "MINIMIZED", "STABLE", "HIGH_CONFIDENCE", "DIFFERENTIAL_VERIFIED", "FULL_LIFECYCLE"] },
  { family: "STALE_PROOF", behaviorClass: "CURRENTNESS", outcomes: ["SOURCE_STALE", "SOURCE_UNAVAILABLE", "PROOF_REJECTED", "NO_SILENT_REBIND", "RECEIPT_NOT_PASS"] },
  { family: "BENIGN_CROSS_SURFACE", behaviorClass: "EXPECTED_VARIANCE", outcomes: ["NO_FINDING", "SEMANTIC_EQUIVALENT", "EXPECTED_DIFFERENCE", "NORMALIZATION_HOLDS", "ORDERING_HOLDS"], benignControl: true },
  { family: "OPERATION_CACHE", behaviorClass: "BOUNDED_DETERMINISM", outcomes: ["CACHE_HIT_SAME_SOURCE", "CACHE_MISS_CHANGED_SOURCE", "PAIR_ORDER_STABLE", "GRAPH_ORDER_STABLE", "MINIMIZER_ORDER_STABLE"], benignControl: true },
];

const phase21Cases: readonly Phase21CorpusCase[] = dimensions.flatMap((dimension) => dimension.outcomes.map((expectedOutcome, index) => ({
  caseId: `phase21.${dimension.family.toLowerCase()}.${dimension.behaviorClass.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${String(index + 1).padStart(2, "0")}`,
  family: dimension.family,
  behaviorClass: dimension.behaviorClass,
  expectedOutcome,
  benignControl: dimension.benignControl ?? false,
  privacySafe: true as const,
})));

export const PHASE21_ADVERSARIAL_CASES: readonly Phase21CorpusCase[] = Object.freeze(phase21Cases);
export const PHASE21_FULL_ADVERSARIAL_CASES: readonly (Phase20CorpusCase | Phase21CorpusCase)[] = Object.freeze([...PHASE20_ADVERSARIAL_CASES, ...PHASE21_ADVERSARIAL_CASES]);
