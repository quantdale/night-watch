// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — safe source-surface and operation descriptors.
// ---------------------------------------------------------------------------

import type { SourceScanLanguage } from './scanTypes';
import type { Phase24CandidateInvalidationLedger } from '../phase24/types';
import type { ResponseFlowProof } from './responseFlow';
import type { SourceGapTaxonomyChange } from './gapTaxonomy';
import type { R2CoverageState, SourceCompletenessState } from './completeness';
import type { SourceEvidenceProvenance } from './generatedArtifact';
import type { ReadOnlyProof } from './readOnlyProof';

export const REAL_SOURCE_SURFACE_DESCRIPTOR_VERSION = 'nightwatch.real-source-surface-descriptor.v5' as const;
export const REAL_SOURCE_SURFACE_CHANGE_REPORT_VERSION = 'nightwatch.real-source-surface-change-report.v2' as const;
export const REAL_SOURCE_SURFACE_PERFORMANCE_VERSION = 'nightwatch.real-source-surface-performance.v1' as const;
export const REAL_SOURCE_OPERATION_COMPLETENESS_VERSION = 'nightwatch.source-operation-projection-completeness.v1' as const;

export type SourceOperationMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type SourceRouteProof = 'PROVEN' | 'AMBIGUOUS' | 'UNSUPPORTED';
export type SourceReadOnlyClassification = 'PROVEN_READ_ONLY' | 'READ_ONLY_METHOD_ONLY' | 'CONDITIONAL_MUTATION' | 'PROVEN_MUTATION_CAPABLE' | 'AMBIGUOUS' | 'UNSUPPORTED';
export type SourceRuntimeBinding = 'RUNTIME_BOUND_EXACT' | 'RUNTIME_BOUND_PARTIAL' | 'SOURCE_ONLY' | 'RUNTIME_ONLY' | 'AMBIGUOUS' | 'STALE_BINDING' | 'SOURCE_VERSION_MISMATCH';
export type SourceComponentProvenance = 'EXACT_COMPONENT' | 'REPOSITORY_ONLY' | 'AMBIGUOUS_COMPONENT' | 'UNRESOLVED';
export type SourceJoinState = 'PROVEN' | 'AMBIGUOUS' | 'MISSING_SYMBOL' | 'MULTIPLE_SYMBOLS' | 'OUTSIDE_SCOPE' | 'UNSUPPORTED_REFERENCE' | 'SOURCE_STALE';
export type SourceJoinKind = 'ROUTE_HANDLER' | 'HANDLER_REQUEST_CONTRACT' | 'HANDLER_RESPONSE_CONTRACT' | 'OPERATION_SCHEMA' | 'RESPONSE_FLOW' | 'OPENAPI_RESPONSE_DEFINITION';
export type SourceSurfaceLifecycle = 'DISCOVERED' | 'MECHANICALLY_PROVEN' | 'PROJECTABLE' | 'SCENARIO_BOUND' | 'REPLAY_SUPPORTED' | 'MINIMIZATION_SUPPORTED' | 'DIFFERENTIAL_CAPABLE' | 'FULL_LIFECYCLE';
export type SourceSurfaceProjectionCapability = 'PROJECTABLE' | 'NOT_PROJECTABLE' | 'UNPROVEN';
export type SourceSurfaceReplayCapability = 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';

export const SOURCE_DIAGNOSTIC_REJECTION_FAMILIES = [
  'NONE',
  'SOURCE_BOUNDARY',
  'SOURCE_CURRENTNESS',
  'PRIVACY_BOUNDARY',
  'LEXICAL_BUDGET',
  'DECLARATION_LOOKUP',
  'RETURN_EXPRESSION',
  'CONTROL_FLOW',
  'DYNAMIC_DISPATCH',
  'STATIC_SCHEMA',
  'UNSUPPORTED_SYNTAX',
  'INTERNAL_UNCLASSIFIED',
] as const;
export type SourceDiagnosticRejectionFamily = (typeof SOURCE_DIAGNOSTIC_REJECTION_FAMILIES)[number];

/** Safe analyzer metadata retained for operator gap explanations. It contains
 * no source text, literal values, or runtime observations. */
export interface SourceAnalyzerDiagnostic {
  readonly analyzerId: string;
  readonly analyzerVersion: string;
  readonly status: 'MECHANICALLY_PROVABLE' | 'REJECTED';
  readonly behaviorClass: string | null;
  readonly rejectionCode: string | null;
  /** Phase 27 categorical flow reason; never source text. */
  readonly flowRejectionCode: string | null;
  /** Phase 28 bounded rejection family; never a source-derived detail. */
  readonly rejectionFamily: SourceDiagnosticRejectionFamily;
  readonly evidenceDigest: string;
}

export interface SourceProofGapCount {
  readonly code: string;
  readonly count: number;
}

export interface SourceAnalyzerCount {
  readonly analyzerId: string;
  readonly proven: number;
  readonly rejected: number;
}

export const SOURCE_SURFACE_REASON_CODES = [
  'SOURCE_ROOT_UNAPPROVED',
  'SOURCE_PATH_ESCAPE',
  'SOURCE_SYMLINK_REJECTED',
  'SOURCE_FILE_NOT_REGULAR',
  'SOURCE_FILE_TOO_LARGE',
  'SOURCE_TOTAL_BUDGET_EXCEEDED',
  'SOURCE_OPERATION_COUNT_EXCEEDED',
  'SOURCE_LANGUAGE_UNSUPPORTED',
  'SOURCE_SYNTAX_UNSUPPORTED',
  'ROUTE_NOT_FOUND',
  'ROUTE_AMBIGUOUS',
  'HANDLER_UNRESOLVED',
  'HANDLER_AMBIGUOUS',
  'REQUEST_CONTRACT_UNPROVEN',
  'RESPONSE_CONTRACT_UNPROVEN',
  'SEMANTIC_CONTRACT_UNPROVEN',
  'READ_ONLY_NOT_PROVEN',
  'MUTATION_CAPABLE',
  'CLIENT_SERVER_MAPPING_UNPROVEN',
  'RUNTIME_BINDING_MISSING',
  'OWNER_COMPONENT_AMBIGUOUS',
  'SOURCE_STALE',
  'SOURCE_EVIDENCE_CHANGED',
  'CONTRACT_CHANGED',
  'DEPLOYMENT_RELATION_UNRESOLVED',
] as const;
export type SourceSurfaceReasonCode = (typeof SOURCE_SURFACE_REASON_CODES)[number];

export interface SourceOperationDescriptor {
  readonly operationId: string;
  readonly repository: string;
  readonly sourceSha: string;
  readonly sourcePath: string;
  readonly language: SourceScanLanguage;
  readonly evidenceDigest: string;
  readonly method: SourceOperationMethod;
  readonly routeTemplate: string;
  readonly handlerSymbol: string | null;
  readonly handlerPath: string | null;
  readonly requestReference: string | null;
  readonly responseReference: string | null;
  readonly transport: 'HTTP_API' | 'BROWSER_READ_ONLY' | 'SYNTHETIC';
  readonly routeProof: SourceRouteProof;
  readonly routeRejectionReason: SourceSurfaceReasonCode | null;
  readonly readOnlyClassification: SourceReadOnlyClassification;
  readonly runtimeBinding: SourceRuntimeBinding;
  readonly targetId: string | null;
  readonly deploymentStatusUnresolved: true;
}

/** Resolution outcome of one OpenAPI `responses[code].schema.$ref` against the
 * document's own `definitions` block. A malformed or unresolvable reference is
 * reported, never dropped. */
export const OPENAPI_RESPONSE_BINDING_STATES = ['RESOLVED', 'REF_MALFORMED', 'DEFINITION_MISSING', 'DEFINITION_UNSAFE'] as const;
export type OpenApiResponseBindingState = (typeof OPENAPI_RESPONSE_BINDING_STATES)[number];

export interface OpenApiResponseDefinitionBinding {
  /** Swagger response key: an HTTP status code or `default`. */
  readonly statusCode: string;
  readonly state: OpenApiResponseBindingState;
  /** Definition name, only when the reference is structurally safe. */
  readonly definition: string | null;
  /** Top-level property count of the resolved definition. */
  readonly fieldCount: number;
  /** Digest over the definition's sorted property names and types. */
  readonly definitionDigest: string | null;
}

export interface SourceContractEvidence {
  readonly requestContractId: string | null;
  readonly requestEvidenceDigest: string | null;
  readonly requestProof: SourceJoinState;
  readonly requestFieldCount: number;
  readonly responseContractId: string | null;
  readonly responseEvidenceDigest: string | null;
  readonly responseProof: SourceJoinState;
  readonly semanticContractIds: readonly string[];
  readonly semanticProof: SourceJoinState;
  readonly responseAnalyzerDiagnostics: readonly SourceAnalyzerDiagnostic[];
  readonly responseFlow: ResponseFlowProof | null;
  /** C-02a — OpenAPI `$ref` → `definitions` response bindings, when the route
   * came from an OpenAPI document. Empty for every other route language. */
  readonly responseDefinitions: readonly OpenApiResponseDefinitionBinding[];
}

export interface SourceEvidenceJoin {
  readonly kind: SourceJoinKind;
  readonly fromIdentity: string;
  readonly toIdentity: string | null;
  readonly state: SourceJoinState;
  readonly evidenceDigest: string | null;
}

export interface SourceComponentRoute {
  readonly state: SourceComponentProvenance;
  readonly repository: string;
  readonly packageName: string | null;
  readonly component: string | null;
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'AMBIGUOUS' | 'UNRESOLVED';
}

export interface RealSourceSurfaceDescriptor {
  readonly schemaVersion: typeof REAL_SOURCE_SURFACE_DESCRIPTOR_VERSION;
  readonly surfaceId: string;
  readonly targetId: string | null;
  readonly operation: SourceOperationDescriptor;
  readonly source: { readonly repoId: string; readonly sha: string; readonly evidenceDigest: string };
  readonly relevantFiles: readonly string[];
  readonly joins: readonly SourceEvidenceJoin[];
  readonly contract: SourceContractEvidence;
  readonly componentProvenance: SourceComponentRoute;
  readonly currentness: 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
  readonly lifecycle: SourceSurfaceLifecycle;
  readonly projectionCapability: SourceSurfaceProjectionCapability;
  readonly replayCapability: SourceSurfaceReplayCapability;
  readonly differentialCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';
  readonly exclusionReasons: readonly SourceSurfaceReasonCode[];
  /** C-02a — is this surface's route evidence direct or generated source? */
  readonly sourceEvidence: SourceEvidenceProvenance;
  /** C-06 — the mechanically derived read-only proof, with its witnesses,
   * preconditions, effect ledger and vocabulary digest. `readOnlyClassification`
   * on the operation is a projection of `readOnlyProof.state` and of nothing
   * else. */
  readonly readOnlyProof: ReadOnlyProof;
  readonly deterministicDigest: string;
}

export interface SourceSurfaceDiscoveryCounters {
  readonly routeFilesConsidered: number;
  readonly routeOperationsFound: number;
  readonly routeOperationsTruncated: number;
  readonly routeProofs: number;
  readonly ambiguousRoutes: number;
  readonly mutationCapableOperations: number;
  readonly readOnlyProvenOperations: number;
  readonly requestContracts: number;
  readonly responseContracts: number;
  readonly semanticContracts: number;
  readonly joinsAttempted: number;
  readonly joinsProven: number;
  readonly joinsRejected: number;
  readonly responseFlowAttempts: number;
  readonly responseFlowProven: number;
  readonly responseFlowRejected: number;
  readonly responseFlowResolvedCalls: number;
  readonly responseFlowDependencyDeclarations: number;
  readonly responseFlowDependencyEdges: number;
  readonly responseFlowMaxDepth: number;
  readonly analyzerInvocations: number;
  readonly responseProofGapCounts: readonly SourceProofGapCount[];
  readonly semanticProofGapCounts: readonly SourceProofGapCount[];
  readonly responseAnalyzerCounts: readonly SourceAnalyzerCount[];
  readonly gapDiagnosticCount: number;
  readonly gapTaxonomyRows: number;
  readonly candidatesProduced: number;
  readonly eligibleCandidates: number;
  readonly excludedCandidates: number;
  /** C-02a — generated-artifact and OpenAPI definition-binding yield. */
  readonly generatedArtifactOperations: number;
  readonly openApiResponseDefinitionsBound: number;
  readonly openApiResponseDefinitionsUnresolved: number;
}

/** Truthful projection completeness for operation discovery.
 *
 * Operation projection is bounded, but never silently lossy: the bound, the
 * number of route entries examined, the total when knowable, the projected
 * count, and every dropped operation are stated explicitly and per repository.
 *
 * Three independent things can bound the operation population, and they are
 * reported independently because they fail differently:
 *   - projection    — this discovery's own ceiling; drops are always countable
 *                     (TRUNCATED).
 *   - enumeration   — the file walk was bounded upstream, so the true number
 *                     of operations is not knowable (UNKNOWN).
 *   - content read  — some enumerated file bodies were never read, so any
 *                     operations they declare are invisible and uncountable
 *                     (UNKNOWN).
 *
 * `state` is the conservative combination and is COMPLETE only when all three
 * are clean. */
export type SourceOperationCompletenessState = SourceCompletenessState;

export interface SourceOperationRepositoryCompleteness {
  readonly repository: string;
  readonly examinedOperations: number;
  readonly projectedOperations: number;
  readonly droppedOperations: number;
}

export interface SourceOperationProjectionCompleteness {
  readonly schemaVersion: typeof REAL_SOURCE_OPERATION_COMPLETENESS_VERSION;
  readonly state: SourceOperationCompletenessState;
  /** Bounded projection ceiling actually applied to this discovery. */
  readonly limit: number;
  /** Parsed route entries examined for projection. */
  readonly examinedOperations: number;
  /** Exact only when nothing upstream was bounded; null when the true total is
   * unknowable. Never a fabricated stand-in for an unobserved population. */
  readonly totalOperations: number | null;
  readonly projectedOperations: number;
  /** Operations dropped by THIS discovery's projection ceiling. Always exact:
   * projection sees every examined entry before deciding. */
  readonly droppedOperations: number;
  readonly truncated: boolean;
  /** True when an upstream bound makes the remainder uncountable. */
  readonly remainingUnknown: boolean;
  /** Upstream file-walk completeness. Separate from contentReadCompleteness:
   * a repository may be fully enumerated with only some bodies read. */
  readonly enumerationCompleteness: SourceCompletenessState;
  /** Upstream file-body read completeness over the enumerated set. */
  readonly contentReadCompleteness: SourceCompletenessState;
  /** R2 coverage projection of `state`. Coverage may deny authority; it never
   * grants it. */
  readonly coverageState: R2CoverageState;
  readonly repositories: readonly SourceOperationRepositoryCompleteness[];
}

/** Advisory bounded cost measurements. Timings are never part of a proof or
 * deterministic digest; structural maxima are safe memory/CPU proxies. */
export interface SourceSurfacePerformanceMetrics {
  readonly schemaVersion: typeof REAL_SOURCE_SURFACE_PERFORMANCE_VERSION;
  readonly elapsedMs: number;
  readonly scanElapsedMs: number;
  readonly responseFlowIndexElapsedMs: number;
  readonly responseFlowResolveElapsedMs: number;
  readonly projectionElapsedMs: number;
  readonly phpFilesConsidered: number;
  readonly phpFilesTokenized: number;
  readonly declarationsIndexed: number;
  readonly maxDeclarationsPerFile: number;
  readonly maxTokens: number;
  readonly maxSourceBytes: number;
}

export interface SourceFileChangeRecord {
  readonly repository: string;
  readonly relativePath: string;
  readonly priorSourceSha: string | null;
  readonly currentSourceSha: string | null;
  readonly priorContentDigest: string | null;
  readonly currentContentDigest: string | null;
  readonly change: 'ADDED' | 'REMOVED' | 'CHANGED';
}

export interface SourceSurfaceChangeReport {
  readonly schemaVersion: typeof REAL_SOURCE_SURFACE_CHANGE_REPORT_VERSION;
  readonly priorInventoryDigest: string | null;
  readonly currentInventoryDigest: string;
  readonly addedFiles: readonly SourceFileChangeRecord[];
  readonly removedFiles: readonly SourceFileChangeRecord[];
  readonly changedFiles: readonly SourceFileChangeRecord[];
  readonly unchangedFileCount: number;
  readonly changedOperations: readonly string[];
  readonly changedHandlers: readonly string[];
  readonly changedRequestContracts: readonly string[];
  readonly changedResponseContracts: readonly string[];
  readonly changedSemanticContracts: readonly string[];
  readonly unchangedSurfaceIds: readonly string[];
  readonly newSurfaceIds: readonly string[];
  readonly removedSurfaceIds: readonly string[];
  readonly lifecycleCounts: Readonly<Record<SourceSurfaceLifecycle, number>>;
  readonly gapTaxonomyChange: SourceGapTaxonomyChange;
  readonly invalidationLedger: Phase24CandidateInvalidationLedger | null;
  readonly deterministicDigest: string;
}
