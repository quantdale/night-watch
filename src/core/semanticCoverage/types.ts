// Phase 20 — safe contract-discovery and coverage DTOs.
//
// These types deliberately describe source-backed structure rather than raw
// source or runtime values. Source text is accepted only by bounded analyzers
// and never leaves that call. The DTOs are metadata-only and safe to feed into
// Phase 19 planning, coverage, replay, and dossier layers.

import { prefixedDigest24, stableJsonSorted } from "../identity/canonicalDigest";

export const CONTRACT_DISCOVERY_VERSION = "nightwatch.contract-discovery.v1" as const;
export const CONTRACT_GRAPH_VERSION = "nightwatch.semantic-contract-graph.v1" as const;
export const RELATIONAL_CONTRACT_VERSION = "nightwatch.relational-semantic-contract.v1" as const;
export const DIFFERENTIAL_CONTRACT_VERSION = "nightwatch.semantic-differential.v1" as const;
export const METAMORPHIC_RELATION_VERSION = "nightwatch.metamorphic-relation.v1" as const;
export const SYNTHETIC_MUTATION_VERSION = "nightwatch.synthetic-semantic-mutation.v1" as const;

export const MAX_DISCOVERY_ARTIFACTS = 128;
export const MAX_DISCOVERY_CANDIDATES = 2048;
export const MAX_SOURCE_SYMBOL_LENGTH = 160;
export const MAX_SAFE_PATH_SEGMENTS = 16;

export type SourceLanguage = "PHP" | "TYPESCRIPT" | "JAVASCRIPT" | "GO" | "OPENAPI";

export type ContractBehaviorClass =
  | "REQUIRED_FIELD"
  | "OPTIONAL_FIELD"
  | "FINITE_ENUM"
  | "FIELD_TYPE"
  | "NON_EMPTY"
  | "RANGE_BOUND"
  | "DEFAULT_VALUE"
  | "FALLBACK_VALUE"
  | "NORMALIZATION"
  | "SORT_ORDER"
  | "FILTERING"
  | "DEDUPLICATION"
  | "AGGREGATION"
  | "GROUPING"
  | "PAGINATION"
  | "STATUS_TRANSITION"
  | "FIELD_PRESENCE_RELATION"
  | "CROSS_FIELD_DEPENDENCY"
  | "TOTAL_RELATION"
  | "COUNT_RELATION"
  | "IDENTITY_PRESERVATION"
  | "MAPPING"
  | "FORMATTING";

export const CONTRACT_BEHAVIOR_CLASSES: readonly ContractBehaviorClass[] = [
  "REQUIRED_FIELD", "OPTIONAL_FIELD", "FINITE_ENUM", "FIELD_TYPE", "NON_EMPTY",
  "RANGE_BOUND", "DEFAULT_VALUE", "FALLBACK_VALUE", "NORMALIZATION", "SORT_ORDER",
  "FILTERING", "DEDUPLICATION", "AGGREGATION", "GROUPING", "PAGINATION",
  "STATUS_TRANSITION", "FIELD_PRESENCE_RELATION", "CROSS_FIELD_DEPENDENCY",
  "TOTAL_RELATION", "COUNT_RELATION", "IDENTITY_PRESERVATION", "MAPPING", "FORMATTING",
];

export type DiscoveryProofStatus =
  | "DISCOVERED"
  | "MECHANICALLY_PROVABLE"
  | "ADMITTED"
  | "PROJECTABLE"
  | "SYNTHETICALLY_VERIFIED"
  | "SCENARIO_BOUND"
  | "REPLAY_SUPPORTED"
  | "MINIMIZATION_SUPPORTED"
  | "FULLY_COVERED"
  | "REJECTED";

export type DiscoveryRejectionCode =
  | "SOURCE_UNAVAILABLE"
  | "SOURCE_STALE"
  | "SOURCE_PATH_INVALID"
  | "SOURCE_TOO_LARGE"
  | "PRIVACY_UNSAFE_SOURCE"
  | "UNSUPPORTED_LANGUAGE"
  | "UNSUPPORTED_SYNTAX"
  | "DYNAMIC_KEY_FLOW"
  | "RUNTIME_VALUE_UNPROVEN"
  | "BRANCH_SET_INCOMPLETE"
  | "FIELD_NAME_UNSAFE"
  | "MALFORMED_STATIC_SCHEMA"
  | "RELATION_PROOF_MISSING"
  | "SURFACE_NOT_APPROVED"
  | "DUPLICATE_CONTRACT"
  | "CONTRACT_DRIFT"
  | "INTERNAL_ANALYZER_ERROR";

export type ContractCurrentness =
  | "CURRENT"
  | "STALE_SOURCE"
  | "SOURCE_UNAVAILABLE"
  | "EVIDENCE_CHANGED_SEMANTICS_UNCHANGED"
  | "SEMANTIC_REDERIVATION_REQUIRED"
  | "CONTRACT_REMOVED"
  | "CONTRACT_EXPANDED"
  | "CONTRACT_NARROWED"
  | "INCOMPATIBLE_CHANGE"
  | "REDERIVATION_REQUIRED";

/** Explicit shape-aware drift semantics. JSON serialization size is never a
 * comparison signal. The legacy ContractCurrentness values remain available
 * for existing consumers; this field supplies the precise semantic result. */
export type ContractShapeDrift =
  | "UNCHANGED"
  | "EVIDENCE_CHANGED_SEMANTICS_UNCHANGED"
  | "EXPANDED"
  | "NARROWED"
  | "INCOMPATIBLE_CHANGE"
  | "REDERIVATION_REQUIRED"
  | "REMOVED"
  | "SOURCE_UNAVAILABLE";

export type ObservationSurfaceKind = "BROWSER" | "API" | "SYNTHETIC" | "REPLAY";

export interface SafeSourceProvenance {
  readonly repoId: string;
  readonly sha: string;
  readonly relativePath: string;
  readonly symbol: string | null;
  readonly derivationVersion: string;
  readonly evidenceDigest: string;
}

export interface SourceArtifactInput {
  readonly artifactId: string;
  readonly language: SourceLanguage;
  readonly repoId: string;
  readonly sha: string;
  readonly relativePath: string;
  readonly symbol?: string | null;
  readonly sourceText: string;
  readonly observationSurfaces: readonly ObservationSurfaceKind[];
}

export type JsonTypeCategory = "NULL" | "BOOLEAN" | "NUMBER" | "STRING" | "OBJECT" | "ARRAY";

export type DiscoveredContractShape =
  | {
      readonly kind: "FIELD_SET";
      readonly fields: readonly string[];
      readonly requiredFields: readonly string[];
      readonly optionalFields: readonly string[];
    }
  | {
      readonly kind: "FIELD_TYPE";
      readonly field: string;
      readonly allowedTypes: readonly JsonTypeCategory[];
    }
  | {
      readonly kind: "FINITE_ENUM";
      readonly field: string;
      readonly valueCount: number;
      readonly valueSetDigest: string;
    }
  | {
      readonly kind: "RANGE";
      readonly field: string;
      readonly lowerBound: number | null;
      readonly upperBound: number | null;
      readonly lowerInclusive: boolean;
      readonly upperInclusive: boolean;
    }
  | {
      readonly kind: "DEFAULT";
      readonly field: string;
      readonly defaultType: JsonTypeCategory;
    }
  | {
      readonly kind: "NORMALIZATION";
      readonly field: string;
      readonly operations: readonly ("TRIM" | "LOWERCASE" | "UPPERCASE" | "SAFE_STRING")[];
    }
  | {
      readonly kind: "SORT_ORDER";
      readonly collectionPath: readonly string[];
      readonly itemField: readonly string[];
      readonly direction: "ASCENDING" | "DESCENDING";
    }
  | {
      readonly kind: "FILTERING";
      readonly collectionPath: readonly string[];
      readonly predicateClass: "FIELD_PRESENT" | "FIELD_EQUALS_LITERAL" | "FIELD_NONEMPTY";
    }
  | {
      readonly kind: "AGGREGATION";
      readonly collectionPath: readonly string[];
      readonly numericFieldPath: readonly string[];
      readonly scalarPath: readonly string[];
      readonly operation: "SUM" | "COUNT";
    }
  | {
      readonly kind: "PAGINATION";
      readonly collectionPath: readonly string[];
      readonly pageSize: number;
      readonly orderingPath: readonly string[] | null;
    }
  | {
      readonly kind: "DEDUPLICATION";
      readonly collectionPath: readonly string[];
      readonly identityPath: readonly string[];
    }
  | {
      readonly kind: "GROUPING";
      readonly collectionPath: readonly string[];
      readonly groupKeyPath: readonly string[];
      readonly aggregateOperation: "COUNT" | "SUM";
    }
  | {
      readonly kind: "PRESENCE_RELATION";
      readonly conditionPath: readonly string[];
      readonly targetPath: readonly string[];
      readonly conditionExpected: boolean;
    }
  | {
      readonly kind: "MAPPING";
      readonly sourceField: readonly string[];
      readonly targetField: readonly string[];
      readonly mappingEntryCount: number;
      readonly mappingDigest: string;
    };

export interface ContractCoverageProjection {
  readonly sourceSurfaceExists: boolean;
  readonly sourceMechanicallyUnderstood: boolean;
  readonly semanticContractAdmitted: boolean;
  readonly syntheticDetectionProven: boolean;
  readonly scenarioExercisesContract: boolean;
  readonly replayAvailable: boolean;
  readonly replayReproduces: boolean;
  readonly minimizationSupported: boolean;
  readonly triageClassifiable: boolean;
  readonly dossierExplainable: boolean;
}

export interface ContractCandidate {
  readonly candidateId: string;
  readonly artifactId: string;
  readonly source: SafeSourceProvenance;
  readonly analyzerId: string;
  readonly analyzerVersion: string;
  readonly behaviorClass: ContractBehaviorClass | null;
  readonly shape: DiscoveredContractShape | null;
  readonly proofStatus: DiscoveryProofStatus;
  readonly rejectionCode: DiscoveryRejectionCode | null;
  readonly rejectionDetail: string | null;
  readonly currentness: ContractCurrentness;
  readonly observationSurfaces: readonly ObservationSurfaceKind[];
  readonly coverage: ContractCoverageProjection;
  readonly impactWeight: number;
  readonly deterministicDigest: string;
}

export interface ContractDiscoveryInventory {
  readonly schemaVersion: typeof CONTRACT_DISCOVERY_VERSION;
  readonly analyzerSetVersion: string;
  readonly candidates: readonly ContractCandidate[];
  readonly admittedCandidateIds: readonly string[];
  readonly rejectedCandidateIds: readonly string[];
  readonly rejectionCounts: Readonly<Record<DiscoveryRejectionCode, number>>;
  readonly sourceArtifactCount: number;
  readonly mechanicallyProvableCount: number;
  readonly admittedCount: number;
  readonly projectableCount: number;
  readonly deterministicDigest: string;
}

export interface ContractDriftResult {
  readonly candidateId: string;
  readonly currentness: ContractCurrentness;
  readonly shapeChange: ContractShapeDrift;
  readonly affected: boolean;
  readonly reasonCode: "SOURCE_SHA_CHANGED" | "EVIDENCE_CHANGED" | "EVIDENCE_UNCHANGED" | "CONTRACT_MISSING" | "SOURCE_UNAVAILABLE";
  readonly priorEvidenceDigest: string | null;
  readonly currentEvidenceDigest: string | null;
}

export type GraphNodeKind =
  | "REPOSITORY"
  | "SOURCE_FILE"
  | "OPERATION"
  | "HANDLER"
  | "REQUEST_CONTRACT"
  | "RESPONSE_CONTRACT"
  | "SEMANTIC_CONTRACT"
  | "PHASE24_CANDIDATE"
  | "RUNTIME_BINDING"
  | "REPLAY_PLAN"
  | "SOURCE_ARTIFACT"
  | "SOURCE_EVIDENCE"
  | "CONTRACT_CANDIDATE"
  | "ADMITTED_CONTRACT"
  | "EXPECTATION"
  | "PROJECTION"
  | "SCENARIO"
  | "ORACLE"
  | "REPLAY_ADAPTER"
  | "MINIMIZER"
  | "DOSSIER";

export type GraphEdgeReason =
  | "CONTAINS_SOURCE_FILE"
  | "DECLARES_ROUTE"
  | "BINDS_HANDLER"
  | "USES_REQUEST_CONTRACT"
  | "PRODUCES_RESPONSE_CONTRACT"
  | "PROVES_SEMANTIC_CONTRACT"
  | "QUALIFIES_CANDIDATE"
  | "BINDS_RUNTIME"
  | "BINDS_REPLAY"
  | "INVALIDATES_REPLAY"
  | "INVALIDATES_DOSSIER"
  | "EXTRACTED_FROM"
  | "EVIDENCE_PROVES"
  | "ADMITTED_AS"
  | "BOUND_TO_EXPECTATION"
  | "PROJECTED_BY"
  | "EXERCISED_BY"
  | "EVALUATED_BY"
  | "REPLAYED_BY"
  | "MINIMIZED_BY"
  | "EXPLAINED_BY"
  | "DIFFERENTIAL_EQUIVALENCE"
  | "METAMORPHIC_RELATION"
  | "COVERAGE_GAP"
  | "STALE_SOURCE"
  | "DUPLICATE_SEMANTICS";

export interface ContractGraphNode {
  readonly nodeId: string;
  readonly kind: GraphNodeKind;
  readonly safeIdentity: string;
  readonly status: DiscoveryProofStatus | "AVAILABLE" | "MISSING" | "STALE" | "UNSUPPORTED";
}

export interface ContractGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly reason: GraphEdgeReason;
}

export interface ContractGraphGap {
  readonly contractId: string;
  readonly gap: "NOT_ADMITTED" | "NOT_PROJECTABLE" | "UNEXERCISED" | "REPLAY_GAP" | "MINIMIZATION_GAP" | "STALE_SOURCE" | "ORPHANED_EXPECTATION" | "SINGLE_SURFACE" | "DIFFERENTIAL_ELIGIBLE" | "HIGH_IMPACT_UNCOVERED" | "DUPLICATE_COVERAGE";
  readonly priorityComponent: number;
  readonly reasonCode: string;
}

export interface ContractGraph {
  readonly schemaVersion: typeof CONTRACT_GRAPH_VERSION;
  readonly nodes: readonly ContractGraphNode[];
  readonly edges: readonly ContractGraphEdge[];
  readonly gaps: readonly ContractGraphGap[];
  readonly contractCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly deterministicDigest: string;
}

export function safeSemanticDigest(value: unknown, prefix: string): string {
  return prefixedDigest24(prefix, value);
}

export function safeSemanticCanonical(value: unknown): string {
  return stableJsonSorted(value);
}

export function sourceEvidenceDigest(value: unknown): string {
  return prefixedDigest24("ev", value);
}

export function candidateIdentity(value: unknown): string {
  return prefixedDigest24("contract-candidate", value);
}

export function graphIdentity(value: unknown): string {
  return prefixedDigest24("contract-graph", value);
}
