export const CHANGE_INTELLIGENCE_SCHEMA_VERSION = 'nightwatch.change-intelligence.phase3.v1';
export const SELECTOR_VERSION = 'nightwatch.selector.phase3.v1';
export const DEPENDENCY_MAP_VERSION = 'nightwatch.ripple-dependency-map.v1';

export const RIPPLE_JOURNEY_IDS = [
  'ripple-payer-exchange-read',
  'ripple-common-exchange-read',
  'ripple-account-inventory',
] as const;

export type JourneyId = (typeof RIPPLE_JOURNEY_IDS)[number];

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type RepoScope = 'IN_SCOPE' | 'REVIEWED_EXCLUDED' | 'UNKNOWN';
export type ChangeSource =
  | 'COMMITTED_UPSTREAM_CHANGE'
  | 'LOCAL_COMMITTED_CHANGE'
  | 'DIRTY_WORKTREE_CHANGE';
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type ChangeStatus = 'add' | 'modify' | 'delete' | 'rename';
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type RangeSemantics = 'BASE_SHA_TO_HEAD_SHA' | 'EXPLICIT_COMMIT_RANGE';

export interface RepoDefinition {
  repoId: string;
  productRole: string;
  scope: RepoScope;
  branch: string;
  checkedOutSha: string;
  trackingRef: string | null;
  trackingSha: string | null;
  ahead: number | null;
  behind: number | null;
  dirty: boolean;
  sourceMapSha: string;
  readOnlyOnly: true;
}

export interface RepoBaseline {
  repoId: string;
  baseSha: string;
  headSha: string;
  mergeBase: string | null;
  rangeSemantics: RangeSemantics;
  source: ChangeSource;
  dirtyExcluded: boolean;
}

export interface ChangedFile {
  repoId: string;
  path: string;
  previousPath?: string;
  status: ChangeStatus;
  additions?: number;
  deletions?: number;
  symbols?: readonly string[];
}

export interface CommitMetadata {
  sha: string;
  timestamp: string;
}

export interface DirtyFile {
  repoId: string;
  path: string;
  previousPath?: string;
  status: ChangeStatus;
}

export interface ChangeSet {
  schemaVersion: typeof CHANGE_INTELLIGENCE_SCHEMA_VERSION;
  selectorVersion: typeof SELECTOR_VERSION;
  changesetId: string;
  generatedAt: string;
  repoBaselines: readonly RepoBaseline[];
  changedRepos: readonly string[];
  changedFiles: readonly ChangedFile[];
  commits: readonly CommitMetadata[];
  dirtyFiles: readonly DirtyFile[];
  sourceWindow: 'COMMITTED_ONLY' | 'LOCAL_DEVELOPMENT_SHADOW_MODE';
  deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
}

export type ImpactClass =
  | 'DIRECT_JOURNEY_CHANGE'
  | 'DIRECT_ROUTE_CHANGE'
  | 'DIRECT_API_CLIENT_CHANGE'
  | 'DIRECT_BACKEND_HANDLER_CHANGE'
  | 'SHARED_AUTH_CHANGE'
  | 'SHARED_ROUTER_CHANGE'
  | 'SHARED_LAYOUT_CHANGE'
  | 'SHARED_API_TRANSPORT_CHANGE'
  | 'SHARED_STATE_INITIALIZATION_CHANGE'
  | 'CONTRACT_CHANGE'
  | 'TRANSITIVE_DEPENDENCY_CHANGE'
  | 'TEST_ONLY_CHANGE'
  | 'DOC_ONLY_CHANGE'
  | 'UNRELATED_CHANGE'
  | 'UNKNOWN_IMPACT';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type RiskClass =
  | 'AUTH_PERMISSIONS'
  | 'ROUTING'
  | 'DATA_FETCH'
  | 'COST_FINANCIAL_SEMANTICS'
  | 'EXCHANGE_RATE'
  | 'ACCOUNT_INVENTORY'
  | 'SHARED_UI_SHELL'
  | 'NETWORK_API_TRANSPORT'
  | 'PROTO_CONTRACT'
  | 'ERROR_HANDLING'
  | 'RESOURCE_LOADING'
  | 'TEST_DOC_ONLY';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type ReasonCode =
  | 'DIRECT_COMPONENT'
  | 'DIRECT_ROUTE'
  | 'DIRECT_API_CALL'
  | 'DIRECT_BACKEND_HANDLER'
  | 'SHARED_AUTH'
  | 'SHARED_ROUTER'
  | 'SHARED_LAYOUT'
  | 'SHARED_TRANSPORT'
  | 'SHARED_STATE_INITIALIZATION'
  | 'CONTRACT_CHANGE'
  | 'TRANSITIVE_DEPENDENCY'
  | 'UNKNOWN_FALLBACK'
  | 'NON_RUNTIME_ONLY'
  | 'REVIEWED_NOT_DEPENDENCY'
  | 'STALE_EDGE';

export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3';
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type EdgeMatch = 'EXACT' | 'PREFIX';

export interface DependencyEdge {
  edgeId: string;
  repoId: string;
  pathPattern: string;
  match: EdgeMatch;
  journeyIds: readonly JourneyId[] | 'ALL';
  impactClass: ImpactClass;
  reasonCode: ReasonCode;
  confidence: Confidence;
  riskClasses: readonly RiskClass[];
  priorityTier: PriorityTier;
  sourceMapSha: string;
  journeyContractVersion: string;
  evidence: string;
}

export interface ImpactReason {
  reasonId: string;
  journeyId: JourneyId;
  repoId: string;
  changedPath: string;
  previousPath?: string;
  edgeId?: string;
  impactClass: ImpactClass;
  reasonCode: ReasonCode;
  confidence: Confidence;
  riskClasses: readonly RiskClass[];
  priorityTier: PriorityTier;
  explanation: string;
  evidence: string;
}

export interface UnresolvedImpact {
  repoId: string;
  path: string;
  reasonCode: 'UNKNOWN_FALLBACK' | 'STALE_EDGE';
  explanation: string;
}

export interface SelectedJourney {
  journeyId: JourneyId;
  priorityTier: PriorityTier;
  confidence: Confidence;
  riskClasses: readonly RiskClass[];
  reasons: readonly ImpactReason[];
}

export interface NonSelectedJourney {
  journeyId: JourneyId;
  reason: string;
  reasonCode: ReasonCode;
}

export interface SelectionResult {
  schemaVersion: typeof CHANGE_INTELLIGENCE_SCHEMA_VERSION;
  selectorVersion: typeof SELECTOR_VERSION;
  dependencyMapVersion: typeof DEPENDENCY_MAP_VERSION;
  changesetId: string;
  repoBaselines: readonly RepoBaseline[];
  changedRepos: readonly string[];
  changeSummary: {
    changedFileCount: number;
    runtimeFileCount: number;
    nonRuntimeFileCount: number;
    statuses: Readonly<Record<ChangeStatus, number>>;
  };
  selectedJourneys: readonly SelectedJourney[];
  priorityOrder: readonly JourneyId[];
  impactReasons: readonly ImpactReason[];
  nonSelectedJourneys: readonly NonSelectedJourney[];
  fallbackTriggered: boolean;
  fallbackReason?: string;
  zeroSelectionJustified: boolean;
  unresolvedImpact: readonly UnresolvedImpact[];
  deterministicDigest: string;
}

export interface ExecutionDisposition {
  changesetId: string;
  status: 'ACCEPTED_SUCCESS' | 'FAILED' | 'BLOCKED' | 'NOT_RUN';
  acceptedJourneyIds: readonly JourneyId[];
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type BaselineStatus = 'BOOTSTRAP_BASELINE' | 'VERIFIED_BASELINE' | 'PENDING_CHANGESET';

export interface BaselineRecord {
  repoId: string;
  baselineSha: string;
  status: BaselineStatus;
  provenance: string;
  lastChangesetId: string | null;
  lastAcceptedExecutionStatus: ExecutionDisposition['status'] | null;
}

export interface BaselineState {
  schemaVersion: 'nightwatch.baseline.phase3.v1';
  records: readonly BaselineRecord[];
}
