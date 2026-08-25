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
