import type {
  ControlCenterCollection,
  ControlCenterProofState,
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterLabel,
  SafeControlCenterRouteTemplate,
  SafeControlCenterSha,
} from './common';
import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';
import { REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION } from '../../core/source/eligibilityCensus';

export const CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.source-summary.v2` as const;
export const CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.source-surfaces.v1` as const;
export const CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.source-graph.v1` as const;
export const CONTROL_CENTER_SOURCE_PROOF_CHAIN_SCHEMA_VERSION = REAL_SOURCE_ELIGIBILITY_CENSUS_VERSION;

export type ControlCenterSourceCurrentness = 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
export type ControlCenterSourceLifecycle =
  | 'DISCOVERED'
  | 'MECHANICALLY_PROVEN'
  | 'PROJECTABLE'
  | 'SCENARIO_BOUND'
  | 'REPLAY_SUPPORTED'
  | 'MINIMIZATION_SUPPORTED'
  | 'DIFFERENTIAL_CAPABLE'
  | 'FULL_LIFECYCLE';
export type ControlCenterSourceRouteProof = 'PROVEN' | 'AMBIGUOUS' | 'UNSUPPORTED';
export type ControlCenterSourceReadOnlyClassification =
  | 'PROVEN_READ_ONLY'
  | 'READ_ONLY_METHOD_ONLY'
  | 'CONDITIONAL_MUTATION'
  | 'PROVEN_MUTATION_CAPABLE'
  | 'AMBIGUOUS'
  | 'UNSUPPORTED';
export type ControlCenterSourceRuntimeBinding =
  | 'RUNTIME_BOUND_EXACT'
  | 'RUNTIME_BOUND_PARTIAL'
  | 'SOURCE_ONLY'
  | 'RUNTIME_ONLY'
  | 'AMBIGUOUS'
  | 'STALE_BINDING'
  | 'SOURCE_VERSION_MISMATCH';
export type ControlCenterSourceCapability = 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';

export interface ControlCenterSourceRollupDto {
  readonly key: SafeControlCenterCode;
  readonly count: number;
}

export interface ControlCenterSourceProofChainStageCountDto {
  readonly stage: SafeControlCenterCode;
  readonly status: SafeControlCenterCode;
  readonly count: number;
}

export interface ControlCenterSourceProofChainFamilyDto {
  readonly family: SafeControlCenterCode;
  readonly assessment: SafeControlCenterCode;
  readonly rank: number;
  readonly gapSurfaceCount: number;
  readonly firstBlockerCount: number;
  readonly potentiallyUnlockableCount: number;
  readonly proofCompleteness: SafeControlCenterCode;
  readonly dependencyFanOut: number;
  readonly bugHuntingValue: SafeControlCenterCode;
}

/** Sanitized aggregate proof-chain diagnostics; this is never an eligibility selector. */
export interface ControlCenterSourceProofChainDto {
  readonly schemaVersion: typeof CONTROL_CENTER_SOURCE_PROOF_CHAIN_SCHEMA_VERSION;
  readonly sourceSnapshotDigest: SafeControlCenterDigest | null;
  readonly sourceSurfaceDigest: SafeControlCenterDigest | null;
  readonly phase24PortfolioDigest: SafeControlCenterDigest | null;
  readonly censusDigest: SafeControlCenterDigest | null;
  readonly totalOperations: number;
  readonly phase24Eligible: number;
  readonly phase24Excluded: number;
  readonly runtimeBindings: number;
  readonly runtimeBindingMissing: number;
  readonly replayRequirementsProven: number;
  readonly dossierCompatible: number;
  readonly currentnessFailureCount: number;
  readonly primaryBlockingStages: readonly ControlCenterSourceRollupDto[];
  readonly stageStatusCounts: readonly ControlCenterSourceProofChainStageCountDto[];
  readonly proofFamilies: readonly ControlCenterSourceProofChainFamilyDto[];
}

export interface ControlCenterSourceSummaryDto {
  readonly schemaVersion: typeof CONTROL_CENTER_SOURCE_SUMMARY_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'STALE' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly inventoryDigest: SafeControlCenterDigest | null;
  readonly repositoryCount: number;
  readonly surfaceCount: number;
  readonly currentness: readonly ControlCenterSourceRollupDto[];
  readonly lifecycle: readonly ControlCenterSourceRollupDto[];
  readonly proof: readonly ControlCenterSourceRollupDto[];
  readonly capabilities: readonly ControlCenterSourceRollupDto[];
  readonly gapReasons: readonly SafeControlCenterCode[];
  readonly proofChain: ControlCenterSourceProofChainDto | null;
}

export interface ControlCenterSourceSurfaceDto {
  readonly surfaceId: SafeControlCenterId;
  readonly repositoryId: SafeControlCenterId;
  readonly sourceSha: SafeControlCenterSha | null;
  readonly evidenceDigest: SafeControlCenterDigest | null;
  readonly language: SafeControlCenterCode;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly routeTemplate: SafeControlCenterRouteTemplate | null;
  readonly handlerState: 'EXACT' | 'PARTIAL' | 'AMBIGUOUS' | 'UNRESOLVED';
  readonly routeProof: ControlCenterSourceRouteProof;
  readonly readOnlyClassification: ControlCenterSourceReadOnlyClassification;
  readonly runtimeBinding: ControlCenterSourceRuntimeBinding;
  readonly currentness: ControlCenterSourceCurrentness;
  readonly lifecycle: ControlCenterSourceLifecycle;
  readonly projectionCapability: ControlCenterSourceCapability;
  readonly replayCapability: ControlCenterSourceCapability;
  readonly differentialCapability: ControlCenterSourceCapability;
  readonly exclusionReasons: readonly SafeControlCenterCode[];
}

export interface ControlCenterSourceSurfacesDto extends ControlCenterCollection<ControlCenterSourceSurfaceDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_SOURCE_SURFACES_SCHEMA_VERSION;
  readonly repositoryFilter: SafeControlCenterId | null;
}

export type ControlCenterSourceGraphNodeKind =
  | 'SURFACE'
  | 'OPERATION'
  | 'HANDLER'
  | 'REQUEST_CONTRACT'
  | 'RESPONSE_CONTRACT'
  | 'SEMANTIC_CONTRACT'
  | 'RESPONSE_FLOW'
  | 'RUNTIME_TARGET'
  | 'COMPONENT';
export type ControlCenterSourceGraphEdgeKind =
  | 'IMPLEMENTS_ROUTE'
  | 'RESOLVES_HANDLER'
  | 'JOINS_REQUEST'
  | 'JOINS_RESPONSE'
  | 'JOINS_SEMANTIC'
  | 'PROVES_RESPONSE_FLOW'
  | 'BINDS_RUNTIME'
  | 'MAPS_COMPONENT';

export interface ControlCenterSourceGraphNodeDto {
  readonly nodeId: SafeControlCenterId;
  readonly kind: ControlCenterSourceGraphNodeKind;
  readonly label: SafeControlCenterLabel | null;
  readonly proof: ControlCenterProofState;
  readonly currentness: ControlCenterSourceCurrentness;
  readonly lifecycle: ControlCenterSourceLifecycle | null;
  readonly capability: ControlCenterSourceCapability;
}

export interface ControlCenterSourceGraphEdgeDto {
  readonly edgeId: SafeControlCenterId;
  readonly fromNodeId: SafeControlCenterId;
  readonly toNodeId: SafeControlCenterId;
  readonly kind: ControlCenterSourceGraphEdgeKind;
  readonly proof: ControlCenterProofState;
}

export interface ControlCenterSourceGraphDto {
  readonly schemaVersion: typeof CONTROL_CENTER_SOURCE_GRAPH_SCHEMA_VERSION;
  readonly surfaceId: SafeControlCenterId | null;
  readonly depth: number;
  readonly nodes: readonly ControlCenterSourceGraphNodeDto[];
  readonly edges: readonly ControlCenterSourceGraphEdgeDto[];
  readonly nodeLimit: number;
  readonly edgeLimit: number;
  readonly truncated: boolean;
}
