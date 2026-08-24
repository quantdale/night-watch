// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — safe source-surface and operation descriptors.
// ---------------------------------------------------------------------------

import type { SourceScanLanguage } from './scanTypes';
import type { Phase24CandidateInvalidationLedger } from '../phase24/types';

export const REAL_SOURCE_SURFACE_DESCRIPTOR_VERSION = 'nightwatch.real-source-surface-descriptor.v1' as const;
export const REAL_SOURCE_SURFACE_CHANGE_REPORT_VERSION = 'nightwatch.real-source-surface-change-report.v1' as const;

export type SourceOperationMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type SourceRouteProof = 'PROVEN' | 'AMBIGUOUS' | 'UNSUPPORTED';
export type SourceReadOnlyClassification = 'PROVEN_READ_ONLY' | 'READ_ONLY_METHOD_ONLY' | 'CONDITIONAL_MUTATION' | 'PROVEN_MUTATION_CAPABLE' | 'AMBIGUOUS' | 'UNSUPPORTED';
export type SourceRuntimeBinding = 'RUNTIME_BOUND_EXACT' | 'RUNTIME_BOUND_PARTIAL' | 'SOURCE_ONLY' | 'RUNTIME_ONLY' | 'AMBIGUOUS' | 'STALE_BINDING' | 'SOURCE_VERSION_MISMATCH';
export type SourceComponentProvenance = 'EXACT_COMPONENT' | 'REPOSITORY_ONLY' | 'AMBIGUOUS_COMPONENT' | 'UNRESOLVED';
export type SourceJoinState = 'PROVEN' | 'AMBIGUOUS' | 'MISSING_SYMBOL' | 'MULTIPLE_SYMBOLS' | 'OUTSIDE_SCOPE' | 'UNSUPPORTED_REFERENCE' | 'SOURCE_STALE';
export type SourceJoinKind = 'ROUTE_HANDLER' | 'HANDLER_REQUEST_CONTRACT' | 'HANDLER_RESPONSE_CONTRACT' | 'OPERATION_SCHEMA';
export type SourceSurfaceLifecycle = 'DISCOVERED' | 'MECHANICALLY_PROVEN' | 'PROJECTABLE' | 'SCENARIO_BOUND' | 'REPLAY_SUPPORTED' | 'MINIMIZATION_SUPPORTED' | 'DIFFERENTIAL_CAPABLE' | 'FULL_LIFECYCLE';
export type SourceSurfaceProjectionCapability = 'PROJECTABLE' | 'NOT_PROJECTABLE' | 'UNPROVEN';
export type SourceSurfaceReplayCapability = 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';

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
  readonly analyzerInvocations: number;
  readonly candidatesProduced: number;
  readonly eligibleCandidates: number;
  readonly excludedCandidates: number;
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
  readonly invalidationLedger: Phase24CandidateInvalidationLedger | null;
  readonly deterministicDigest: string;
}
