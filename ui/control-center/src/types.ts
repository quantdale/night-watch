export const VIEW_DEFINITIONS = [
  { id: 'overview', label: 'Overview', eyebrow: 'CONTROL CENTER', description: 'Readiness and local posture at a glance.' },
  { id: 'safety', label: 'Safety Center', eyebrow: 'GUARDRAILS', description: 'Read-only policy and continuity checks.' },
  { id: 'runs', label: 'Runs', eyebrow: 'EVIDENCE', description: 'Bounded local run summaries and timelines.' },
  { id: 'execution-graph', label: 'Execution Graph', eyebrow: 'TOPOLOGY', description: 'Deterministic run relationships.' },
  { id: 'campaigns', label: 'Campaign Intelligence', eyebrow: 'CAMPAIGNS', description: 'Coverage, gaps, and source currentness.' },
  { id: 'source-intelligence', label: 'Source Intelligence', eyebrow: 'PROVENANCE', description: 'Proof and bounded source neighborhoods.' },
  { id: 'findings', label: 'Findings', eyebrow: 'TRIAGE', description: 'Sanitized owner-local finding metadata.' },
] as const;

export type ViewId = (typeof VIEW_DEFINITIONS)[number]['id'];

export interface HealthSnapshot {
  readonly schemaVersion: string;
  readonly status: 'UP';
  readonly scope: 'LOCAL_LOOPBACK_ONLY';
  readonly readOnly: true;
  readonly productReadiness: 'NOT_REPORTED';
}

export interface MetaSnapshot {
  readonly schemaVersion: string;
  readonly apiVersion: 'v1';
  readonly service: 'NIGHTWATCH_CONTROL_CENTER';
  readonly scope: 'LOCAL_LOOPBACK_ONLY';
  readonly authorizationClass: 'CONTROL_CENTER_LOCAL_READ_ONLY_UI_ONLY';
  readonly readOnly: true;
  readonly executionAuthority: 'NONE';
  readonly mutationAuthority: 'NONE';
  readonly productContact: 'DISABLED';
  readonly externalNetwork: 'DISABLED';
  readonly findingsStorage: 'OWNER_LOCAL_ONLY';
  readonly ownerScopeStatus: 'FROZEN_BY_OWNER';
  readonly ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  readonly features: Readonly<Record<string, boolean>>;
  readonly limits: Readonly<Record<string, number>>;
}

export interface ReadinessSnapshot {
  readonly schemaVersion: string;
  readonly scope: 'LOCAL_SYNTHETIC';
  readonly readyClaim: 'LOCAL_SYNTHETIC_ONLY';
  readonly category: string;
  readonly state: 'READY' | 'BLOCKED' | 'UNKNOWN' | 'NOT_APPLICABLE';
  readonly applies: boolean;
  readonly sourceContracts: {
    readonly totalFamilies: number;
    readonly activeFamilies: number;
    readonly archivedFamilies: number;
    readonly approvedTargets: number;
    readonly targetsWithActiveFamily: number;
    readonly currentnessCounts: Readonly<Record<string, number>>;
    readonly staleTargets: readonly string[];
    readonly unavailableTargets: readonly string[];
  };
  readonly campaign: {
    readonly category: string;
    readonly comparedKeys: readonly string[];
    readonly driftKeys: readonly string[];
    readonly unmeasured: boolean;
  };
  readonly checkpointCompatibility: string;
  readonly analyzer: {
    readonly pinnedVersion: string;
    readonly observedVersion: string | null;
    readonly availability: string;
    readonly versionConsistent: boolean | null;
    readonly blocked: boolean;
  };
  readonly verification: {
    readonly deferredDimensions: readonly string[];
    readonly notMeasuredDimensions: readonly string[];
    readonly allDeferredToHardening: boolean;
  };
  readonly unresolvedBlockers: readonly { readonly code: string; readonly kind: string; readonly detailCode: string | null }[];
  readonly externalCi: string;
  readonly externalCiClassification: string;
  readonly ownerScope: {
    readonly status: 'FROZEN_BY_OWNER';
    readonly reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
    readonly frozenOperationCount: number;
    readonly matchesFrozenMarkers: boolean;
  };
}

export interface SafetySnapshot {
  readonly schemaVersion: string;
  readonly state: 'HEALTHY' | 'WARNING' | 'FAILED' | 'UNKNOWN';
  readonly scope: 'LOCAL_LOOPBACK_ONLY';
  readonly readOnly: true;
  readonly authMode: 'OWNER_LOCAL_ONLY_NO_AUTH_SESSION';
  readonly networkPosture: 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED';
  readonly rawEvidenceExposure: 'DISABLED';
  readonly ownerScope: {
    readonly status: 'FROZEN_BY_OWNER';
    readonly reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  };
  readonly operationPolicy: {
    readonly controlCenter: 'READ_ONLY';
    readonly productContact: 'DISABLED';
    readonly execution: 'NONE';
    readonly mutation: 'NONE';
    readonly database: 'OUT_OF_SCOPE';
    readonly infrastructure: 'OUT_OF_SCOPE';
    readonly publication: 'DISABLED';
  };
  readonly continuity: {
    readonly state: 'CURRENT' | 'ADVANCE_REQUIRES_RECONCILIATION' | 'UNKNOWN';
    readonly branch: string | null;
    readonly headSha: string | null;
    readonly checkpointDigest: string | null;
  };
  readonly checks: readonly { readonly checkCode: string; readonly state: string; readonly reasonCode: string }[];
  readonly blockedOperationClasses: readonly string[];
}

export interface SourceSummarySnapshot {
  readonly schemaVersion: string;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'STALE' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly inventoryDigest: string | null;
  readonly repositoryCount: number;
  readonly surfaceCount: number;
  readonly currentness: readonly { readonly key: string; readonly count: number }[];
  readonly lifecycle: readonly { readonly key: string; readonly count: number }[];
  readonly proof: readonly { readonly key: string; readonly count: number }[];
  readonly capabilities: readonly { readonly key: string; readonly count: number }[];
  readonly gapReasons: readonly string[];
}

export type RunEnvironment = 'LOCAL_SYNTHETIC' | 'LOCAL' | 'DEV_RECORDED' | 'NEXT_RECORDED' | 'UNKNOWN';
export type RunStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'ORACLE_ONLY' | 'SAFETY_FAILURE' | 'FAILED' | 'BLOCKED' | 'INCOMPLETE' | 'SKIPPED';

export interface RunListItemSnapshot {
  readonly runId: string;
  readonly environment: RunEnvironment;
  readonly product: string | null;
  readonly browser: string | null;
  readonly scenario: string | null;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly durationMs: number | null;
  readonly status: RunStatus;
  readonly passed: boolean;
  readonly eventCount: number;
  readonly hardFailureCount: number;
  readonly oracleFindingCount: number;
  readonly nightwatchSha: string | null;
}

export interface RunListSnapshot {
  readonly schemaVersion: string;
  readonly items: readonly RunListItemSnapshot[];
  readonly page: { readonly limit: number; readonly nextCursor: string | null; readonly truncated: boolean };
}

export interface RunDetailSnapshot {
  readonly schemaVersion: string;
  readonly run: RunListItemSnapshot;
  readonly repositories: readonly { readonly repositoryId: string; readonly branch: string | null; readonly headSha: string | null; readonly state: string; readonly dirty: boolean; readonly dirtyFileCount: number }[];
  readonly countsByEventType: readonly { readonly eventType: string; readonly count: number }[];
  readonly countsBySeverity: readonly { readonly severity: string; readonly count: number }[];
  readonly screenshotCount: number;
  readonly hardFailureCodes: readonly string[];
  readonly noteCodes: readonly string[];
}

export interface TimelineSnapshot {
  readonly schemaVersion: string;
  readonly runId: string;
  readonly afterSeq: number;
  readonly events: readonly { readonly seq: number; readonly timestamp: string | null; readonly eventType: string; readonly severity: string; readonly messageCode: string; readonly dataCodes: readonly string[] }[];
  readonly nextAfterSeq: number | null;
  readonly truncated: boolean;
}

export interface ExecutionGraphSnapshot {
  readonly schemaVersion: string;
  readonly runId: string;
  readonly nodes: readonly { readonly nodeId: string; readonly kind: string; readonly state: string; readonly label: string | null; readonly eventSeq: number | null; readonly reasonCode: string | null }[];
  readonly edges: readonly { readonly edgeId: string; readonly fromNodeId: string; readonly toNodeId: string; readonly kind: string; readonly proof: string; readonly eventSeq: number | null }[];
  readonly nodeLimit: number;
  readonly edgeLimit: number;
  readonly truncated: boolean;
}

export type CampaignPlanState = 'AVAILABLE' | 'EMPTY' | 'BLOCKED' | 'UNAVAILABLE' | 'UNKNOWN';
export type CampaignSourceCurrentness = 'CURRENT' | 'STALE' | 'UNAVAILABLE' | 'AMBIGUOUS' | 'MISSING' | 'SYNTHETIC_ONLY';
export type CampaignCoverageState = 'PROVEN' | 'AVAILABLE' | 'PARTIAL' | 'GAP' | 'STALE' | 'UNSUPPORTED' | 'NOT_APPLICABLE';

export interface CampaignSummarySnapshot {
  readonly schemaVersion: string;
  readonly planState: CampaignPlanState;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly ownerScopeStatus: 'FROZEN_BY_OWNER';
  readonly ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
  readonly planDigest: string | null;
  readonly coverageDigest: string | null;
  readonly counts: Readonly<Record<'candidates' | 'selected' | 'excluded' | 'coveredContracts' | 'executionOnly' | 'oracleOnly' | 'replayGaps' | 'minimizationGaps' | 'staleSourceGaps' | 'semanticAuthorityGaps' | 'findings', number>>;
  readonly blockerCodes: readonly string[];
  readonly reasonCodes: readonly string[];
}

export interface CampaignCoverageSnapshot {
  readonly schemaVersion: string;
  readonly items: readonly { readonly memberId: string; readonly product: string | null; readonly surface: string | null; readonly contractId: string; readonly sourceCurrentness: CampaignSourceCurrentness; readonly stages: readonly { readonly stageCode: string; readonly state: CampaignCoverageState; readonly reasonCodes: readonly string[] }[]; readonly gapReasons: readonly string[]; readonly fullyCovered: boolean }[];
  readonly page: { readonly limit: number; readonly nextCursor: string | null; readonly truncated: boolean };
  readonly fullyCoveredContractCount: number;
}

export interface FindingSummarySnapshot {
  readonly findingId: string;
  readonly fingerprint: string | null;
  readonly clusterId: string | null;
  readonly title: string | null;
  readonly product: string | null;
  readonly surface: string | null;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  readonly evidenceLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  readonly reproduction: 'REPRODUCED' | 'NOT_REPRODUCED' | 'BOUNDED' | 'INCOMPLETE' | 'UNKNOWN';
  readonly reproductionCount: number;
  readonly minimized: boolean;
  readonly sourceCurrentness: 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
  readonly dossierStatus: 'READY' | 'INCOMPLETE' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly firstObservedAt: string | null;
  readonly lastObservedAt: string | null;
  readonly categoryCode: string;
  readonly provenanceDigest: string | null;
}

export interface FindingsSnapshot {
  readonly schemaVersion: string;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';
  readonly items: readonly FindingSummarySnapshot[];
  readonly page: { readonly limit: number; readonly nextCursor: string | null; readonly truncated: boolean };
}

export interface SourceSurfaceSnapshot {
  readonly surfaceId: string;
  readonly repositoryId: string;
  readonly sourceSha: string | null;
  readonly evidenceDigest: string | null;
  readonly language: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly routeTemplate: string | null;
  readonly handlerState: 'EXACT' | 'PARTIAL' | 'AMBIGUOUS' | 'UNRESOLVED';
  readonly routeProof: 'PROVEN' | 'AMBIGUOUS' | 'UNSUPPORTED';
  readonly readOnlyClassification: 'PROVEN_READ_ONLY' | 'READ_ONLY_METHOD_ONLY' | 'CONDITIONAL_MUTATION' | 'PROVEN_MUTATION_CAPABLE' | 'AMBIGUOUS' | 'UNSUPPORTED';
  readonly runtimeBinding: 'RUNTIME_BOUND_EXACT' | 'RUNTIME_BOUND_PARTIAL' | 'SOURCE_ONLY' | 'RUNTIME_ONLY' | 'AMBIGUOUS' | 'STALE_BINDING' | 'SOURCE_VERSION_MISMATCH';
  readonly currentness: 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';
  readonly lifecycle: string;
  readonly projectionCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';
  readonly replayCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';
  readonly differentialCapability: 'SUPPORTED' | 'UNSUPPORTED' | 'UNPROVEN';
  readonly exclusionReasons: readonly string[];
}

export interface SourceSurfacesSnapshot {
  readonly schemaVersion: string;
  readonly items: readonly SourceSurfaceSnapshot[];
  readonly page: { readonly limit: number; readonly nextCursor: string | null; readonly truncated: boolean };
  readonly repositoryFilter: string | null;
}

export interface SourceGraphSnapshot {
  readonly schemaVersion: string;
  readonly surfaceId: string | null;
  readonly depth: number;
  readonly nodes: readonly { readonly nodeId: string; readonly kind: string; readonly label: string | null; readonly proof: string; readonly currentness: string; readonly lifecycle: string | null; readonly capability: string }[];
  readonly edges: readonly { readonly edgeId: string; readonly fromNodeId: string; readonly toNodeId: string; readonly kind: string; readonly proof: string }[];
  readonly nodeLimit: number;
  readonly edgeLimit: number;
  readonly truncated: boolean;
}

export type DataLoadState<T> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly data: T }
  | { readonly kind: 'error' };

export interface OverviewSnapshot {
  readonly health: HealthSnapshot;
  readonly meta: MetaSnapshot;
  readonly readiness: ReadinessSnapshot;
  readonly safety: SafetySnapshot;
  readonly source: SourceSummarySnapshot;
}

export type OverviewLoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly data: OverviewSnapshot }
  | { readonly kind: 'error' };

export type ApiErrorKind = 'NETWORK' | 'HTTP' | 'INVALID_RESPONSE';
