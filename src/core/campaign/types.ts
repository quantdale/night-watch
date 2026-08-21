// ---------------------------------------------------------------------------
// Nightwatch Phase 7 — private autonomous campaign contracts.
//
// This layer describes orchestration state only. Browser/API execution,
// exploration, oracle, replay, minimization, and dossier logic remain in
// their existing modules and are supplied through typed adapters.
// ---------------------------------------------------------------------------

import type { ApiOperation } from '../../api/phase5/types';
import type { ExplorationEnvelope, SafeAction } from '../exploration/types';
import type { JourneyEvidence, ReplayComparison } from '../journeys/types';
import type {
  ChangedFile,
  ChangeSet,
  DependencyEdge,
  JourneyId,
  RepoDefinition,
  SelectionResult,
} from '../changeIntelligence/types';
import type {
  ApiObservation,
  AnomalyCluster,
  AnomalyObservation as TriageAnomalyObservation,
  BrowserApiDifferential,
  BrowserObservation,
  BugDossier,
  CandidateReplayOutcome,
  ConfidenceResult,
  EvidenceLevel,
  MinimizationAction,
  MinimizationResult,
  SourceChangeCandidate,
  SourceChangeRelevance,
  SourceFreshness,
  TechnicalSeverity,
  TriageConfidence,
  TriagePriority,
} from '../triage/types';
import type { SourceCorrelationInput } from '../triage/correlation';
import type { SemanticOracleFinding } from '../../oracles/semantic/types';
import type { CampaignSemanticEvidence } from './campaignSemanticEvidence';

export const CAMPAIGN_SCHEMA_VERSION = 'nightwatch.campaign.private.v1' as const;
export const CAMPAIGN_ORCHESTRATOR_VERSION = 'nightwatch.orchestrator.private.v1' as const;
export const CAMPAIGN_BUDGET_POLICY_VERSION = 'nightwatch.campaign-budget.private.v1' as const;
export const CAMPAIGN_MANIFEST_VERSION = 'nightwatch.campaign-manifest.private.v1' as const;
export const CAMPAIGN_CHECKPOINT_VERSION = 'nightwatch.campaign-checkpoint.private.v1' as const;
export const CAMPAIGN_MORNING_BRIEF_VERSION = 'nightwatch.campaign-morning-brief.private.v1' as const;
// Phase 15 Session 2 runtime-contract versions pinned at the checkpoint
// boundary. A persisted checkpoint carrying any other value in
// `runtimeContractVersions` fails closed at resume before an executor runs.
//
// Ownership note (Phase 15P A15): these three strings are deliberately NOT
// value-imported from their owning modules (candidateLifecycle.ts,
// triage/replayPlan.ts, triage/promotionResult.ts) because this module is the
// base of the campaign type graph and a value edge would close an import
// cycle through ./identity. Single ownership is enforced mechanically by
// tests/unit/phase15pCompatConvergence.test.ts, which fails if any entry ever
// drifts from the owning constant.
export const CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED = {
  candidateLifecycle: 'nightwatch.candidate-lifecycle.private.v1',
  replayBinding: 'nightwatch.triage-replay-plan.private.v2',
  promotionResult: 'nightwatch.promotion-result.private.v1',
} as const;
/** Classification label for checkpoints persisted before Session 2 contracts existed. */
export const CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION = 'LEGACY_PRE_S2_RUNTIME_CONTRACTS' as const;

export type CampaignMode =
  | 'CHANGE_DIRECTED'
  | 'BASELINE_HEALTH'
  | 'COVERAGE_EXPANSION'
  | 'REPRODUCTION_ONLY'
  | 'LOCAL_SYNTHETIC';

export type CampaignResultClass =
  | 'COMPLETE_CLEAN'
  | 'COMPLETE_WITH_FINDINGS'
  | 'PARTIAL_BUDGET_EXHAUSTED'
  | 'PARTIAL_AUTH_BLOCKED'
  | 'PARTIAL_SAFETY_BLOCKED'
  | 'PARTIAL_RUNTIME_INFRA_FAILURE'
  | 'ABORTED_OWNER_POLICY'
  | 'INCOMPLETE_PROCESS_INTERRUPTION';

export type CampaignStopReason =
  | 'NONE'
  | 'OWNER_POLICY_BLOCKED'
  | 'AUTH_BLOCKED'
  | 'SAFETY_EVENT'
  | 'PRIVACY_BLOCKED'
  | 'BUDGET_EXHAUSTED'
  | 'RUNTIME_TIMEOUT'
  | 'FAILURE_STORM_SHARED_ROOT_SYMPTOM'
  | 'CAMPAIGN_VERSION_DRIFT'
  | 'PROCESS_INTERRUPTION'
  | 'PREFLIGHT_FAILED';

export type CampaignWorkKind = 'JOURNEY' | 'API' | 'EXPLORATION' | 'REPRODUCTION' | 'MINIMIZATION';

export type CampaignWorkState =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'REPLAY_REQUIRED'
  | 'BLOCKED';

export type ExecutionGuarantee = 'EXACTLY_ONCE_LOGICAL' | 'AT_LEAST_ONCE_SAFE' | 'REPLAY_REQUIRED';

export interface CampaignSourceSnapshot {
  readonly repoId: string;
  readonly branch: string;
  readonly headSha: string;
  readonly trackingRef: string | null;
  readonly trackingSha: string | null;
  readonly ahead: number | null;
  readonly behind: number | null;
  readonly dirty: boolean;
  readonly dirtyFileCount: number;
  readonly sourceMapSha: string;
  readonly freshness: SourceFreshness;
  readonly readOnly: true;
}

export interface CampaignSourceWindow {
  readonly changesetId: string;
  readonly baselines: readonly {
    readonly repoId: string;
    readonly baseSha: string;
    readonly headSha: string;
    readonly dirtyExcluded: true;
  }[];
  readonly changedFiles: readonly ChangedFile[];
  readonly dirtyFiles: readonly {
    readonly repoId: string;
    readonly path: string;
    readonly status: string;
  }[];
  readonly sourceWindow: ChangeSet['sourceWindow'];
  readonly deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
}

export interface CampaignVersionFingerprint {
  readonly campaignSchemaVersion: typeof CAMPAIGN_SCHEMA_VERSION;
  readonly orchestratorVersion: typeof CAMPAIGN_ORCHESTRATOR_VERSION;
  /** Current Nightwatch source identity; changes force a new/resumed campaign check. */
  readonly nightwatchSourceSha: string;
  readonly selectorVersion: string;
  readonly dependencyMapVersion: string;
  readonly journeyContractVersion: string;
  readonly journeyOracleVersion: string;
  readonly explorationCatalogVersion: string;
  readonly explorationModelVersion: string;
  readonly explorationPlannerVersion: string;
  readonly apiCatalogVersion: string;
  readonly apiGeneratorVersion: string;
  readonly apiOracleVersion: string;
  readonly triageClusterVersion: string;
  readonly triageMinimizerVersion: string;
  readonly dossierVersion: string;
  readonly ownerScopePolicyVersion: string;
  readonly privateArtifactPolicyVersion: string;
  readonly seedCorpusVersion: string;
  readonly budgetPolicyVersion: typeof CAMPAIGN_BUDGET_POLICY_VERSION;
  // Phase 13A load-bearing semantic/replay contracts — any change forces manifest drift.
  readonly triageReplayPlanVersion: string;
  readonly triageReplayPlanV2Version: string;
  readonly semanticTriageEvidenceVersion: string;
  readonly dossierV2Version: string;
  readonly semanticClusterVersion: string;
  readonly semanticBundleVersion: string;
  readonly semanticReceiptVersion: string;
  readonly semanticExpectationDerivationVersion: string;
}

export interface CampaignBudgetPolicy {
  readonly policyVersion: typeof CAMPAIGN_BUDGET_POLICY_VERSION;
  readonly maxTotalBrowserContexts: number;
  readonly maxJourneyContexts: number;
  readonly maxExplorationContexts: number;
  readonly maxApiExecutions: number;
  readonly maxReplays: number;
  readonly maxMinimizationCandidates: number;
  readonly maxTotalActions: number;
  readonly maxRuntimeMs: number;
  readonly maxPerTestTimeoutMs: number;
  readonly maxPromotedClusters: number;
  readonly maxPrivateEvidenceBytes: number;
}

export interface CampaignBudgetUsage {
  readonly browserContexts: number;
  readonly journeyContexts: number;
  readonly explorationContexts: number;
  readonly apiExecutions: number;
  readonly replays: number;
  readonly minimizationCandidates: number;
  readonly totalActions: number;
  readonly privateEvidenceBytes: number;
}

export interface CampaignBudgetSnapshot {
  readonly policy: CampaignBudgetPolicy;
  readonly used: CampaignBudgetUsage;
  readonly remaining: CampaignBudgetUsage;
}

export interface CampaignSelectionExplanation {
  readonly selected: boolean;
  readonly reason: string;
  readonly sourceImpact: string;
  readonly confidence: string;
  readonly riskClass: string;
  readonly linkedJourneyId: JourneyId | null;
  readonly linkedEnvelopeId: string | null;
  readonly linkedApiOperationId: string | null;
}

export interface CampaignSelectionResult {
  readonly mode: CampaignMode;
  readonly phase3: SelectionResult | null;
  readonly selectedJourneys: readonly JourneyId[];
  readonly selectedEnvelopes: readonly string[];
  readonly selectedApiScenarios: readonly string[];
  readonly selectedSeeds: readonly string[];
  readonly explanations: readonly {
    readonly workItemKey: string;
    readonly explanation: CampaignSelectionExplanation;
  }[];
  readonly nonSelectedJourneys: readonly {
    readonly journeyId: JourneyId;
    readonly reason: string;
    readonly reasonCode: string;
  }[];
  readonly fallbackTriggered: boolean;
  readonly zeroSelectionJustified: boolean;
}

export interface CampaignWorkItem {
  readonly workItemId: string;
  readonly kind: CampaignWorkKind;
  readonly order: number;
  readonly journeyId: JourneyId | null;
  readonly envelopeId: string | null;
  readonly apiOperationId: string | null;
  readonly seed: string | null;
  readonly linkedWorkItemIds: readonly string[];
  readonly replayPolicy: 'NONE' | 'ON_ADMISSION' | 'FIRST_PLUS_FRESH_REPLAY';
  readonly selection: CampaignSelectionExplanation;
}

export interface CampaignPrivacyPolicy {
  readonly storageClass: 'OWNER_ONLY_LOCAL';
  readonly remotePrivacy: 'NO_REMOTE' | 'PRIVATE_REMOTE_CONFIRMED' | 'REMOTE_PRIVACY_UNRESOLVED';
  readonly externalPublication: 'PROHIBITED';
  readonly rawBodiesPersisted: false;
  readonly customerValuesPersisted: false;
  readonly credentialsPersisted: false;
  readonly cookiesPersisted: false;
  readonly tokensPersisted: false;
  readonly domPersisted: false;
  readonly screenshotsPersisted: false;
  readonly authenticatedTracesPersisted: false;
}

export interface CampaignManifest {
  readonly schemaVersion: typeof CAMPAIGN_MANIFEST_VERSION;
  readonly campaignSchemaVersion: typeof CAMPAIGN_SCHEMA_VERSION;
  readonly campaignId: string;
  readonly manifestFingerprint: string;
  readonly mode: CampaignMode;
  readonly createdAt: string;
  readonly sourceSnapshots: readonly CampaignSourceSnapshot[];
  readonly sourceWindow: CampaignSourceWindow;
  readonly selection: CampaignSelectionResult;
  readonly selectedJourneys: readonly JourneyId[];
  readonly selectedEnvelopes: readonly string[];
  readonly selectedApiScenarios: readonly string[];
  readonly seedSet: readonly string[];
  readonly seedCorpusVersion: string;
  readonly workItems: readonly CampaignWorkItem[];
  readonly budgetPolicy: CampaignBudgetPolicy;
  readonly runtimeCeilingMs: number;
  readonly perTestTimeoutMs: number;
  readonly replayBudget: { readonly maxReplays: number; readonly maxPromotedClusters: number };
  readonly minimizationBudget: { readonly maxCandidateEvaluations: number; readonly maxTotalReplays: number };
  readonly versions: CampaignVersionFingerprint;
  readonly privacyPolicy: CampaignPrivacyPolicy;
  readonly reproductionTarget?: {
    readonly clusterId: string;
    readonly candidate: Omit<CampaignAnomalyCandidate, 'replay'>;
  };
  readonly ownerScopePolicy: {
    readonly status: 'FROZEN_BY_OWNER';
    readonly reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE';
    readonly l4: 'OUT_OF_SCOPE_BY_OWNER';
  };
  readonly deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
}

export interface CampaignPreflightInput {
  readonly environment: 'DEV' | 'LOCAL_SYNTHETIC';
  readonly ownerPolicyAllows: boolean;
  readonly productionDenyActive: boolean;
  readonly proxyHealthy: boolean;
  readonly outboundPolicyLoaded: boolean;
  readonly unknownHostFailClosed: boolean;
  readonly safeActionCatalogCurrent: boolean;
  readonly apiCatalogCurrent: boolean;
  readonly authValid: boolean;
  readonly sourceSnapshotsRecorded: boolean;
  readonly budgetValid: boolean;
  readonly privateDestinationValid: boolean;
  readonly requestedOperations?: readonly string[];
}

export interface CampaignPreflightResult {
  readonly passed: boolean;
  readonly code: 'PREFLIGHT_PASS' | 'OWNER_POLICY_BLOCKED' | 'AUTH_BLOCKED' | 'SAFETY_BLOCKED' | 'PREFLIGHT_FAILED';
  readonly failedChecks: readonly string[];
  readonly checkedAt: string;
}

export interface CampaignSafetyVector {
  readonly productionAttempts: number;
  readonly proxyViolations: number;
  readonly unknownDestinations: number;
  readonly unknownApprovals: number;
  readonly productMutations: number;
  readonly actionCausedUnknown: number;
  readonly databaseQueries: number;
  readonly infrastructureQueries: number;
  readonly externalPublicationAttempts: number;
}

export const ZERO_CAMPAIGN_SAFETY: CampaignSafetyVector = Object.freeze({
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  productMutations: 0,
  actionCausedUnknown: 0,
  databaseQueries: 0,
  infrastructureQueries: 0,
  externalPublicationAttempts: 0,
});

export interface CampaignPrivacyStatus {
  readonly result: 'PASS' | 'BLOCKED';
  readonly rawBodiesPersisted: number;
  readonly customerValuesPersisted: number;
  readonly credentialsPersisted: number;
  readonly cookiesPersisted: number;
  readonly tokensPersisted: number;
  readonly domPersisted: number;
  readonly screenshotsPersisted: number;
  readonly authenticatedTracesPersisted: number;
}

export const ZERO_CAMPAIGN_PRIVACY: CampaignPrivacyStatus = Object.freeze({
  result: 'PASS',
  rawBodiesPersisted: 0,
  customerValuesPersisted: 0,
  credentialsPersisted: 0,
  cookiesPersisted: 0,
  tokensPersisted: 0,
  domPersisted: 0,
  screenshotsPersisted: 0,
  authenticatedTracesPersisted: 0,
});

export interface CampaignAnomalyCandidate {
  readonly observation: TriageAnomalyObservation;
  readonly journeyId: JourneyId | null;
  readonly contractVersion: string;
  readonly contractDigest: string;
  readonly contextKind: 'FIRST_OBSERVATION' | 'FRESH_CONTEXT_REPLAY' | 'BOUNDED_REPETITION';
  readonly originalSequence: readonly MinimizationAction[];
  readonly technicalSeverity: TechnicalSeverity;
  readonly breadth: 'NARROW' | 'MULTI_JOURNEY' | 'SHARED_CORE';
  readonly browser: BrowserObservation;
  readonly api: ApiObservation | null;
  readonly sourceCorrelation: SourceCorrelationInput;
  /** Derived by Phase 3 correlation; optional for backward-compatible adapters. */
  readonly sourceRelevance?: SourceChangeRelevance;
  readonly alternativesRuledOut: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly knownNightwatchDefect: boolean;
  /** Phase 9 safe semantic findings attached to this candidate (optional;
   *  flows into the dossier as sanitized evidence only). */
  readonly semanticFindings?: readonly SemanticOracleFinding[];
  /** Phase 13I strict versioned semantic control evidence (optional;
   *  when present and valid, candidate routes through semantic cluster
   *  identity instead of historical protocol clustering). */
  readonly campaignSemanticEvidence?: import('./campaignSemanticEvidence').CampaignSemanticEvidence;
  readonly replay?: (sequence: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => CandidateReplayOutcome | Promise<CandidateReplayOutcome>;
}

export interface CampaignExecutionOutcome {
  readonly result: 'PASS' | 'ANOMALY' | 'TRANSIENT' | 'NIGHTWATCH_DEFECT' | 'AUTH_BLOCKED' | 'SAFETY_BLOCKED' | 'RUNTIME_FAILURE' | 'INCOMPLETE';
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly actionsExecuted: number;
  readonly apiExecutions: number;
  readonly browserContextCreated: boolean;
  readonly replay: boolean;
  readonly observations: readonly CampaignAnomalyCandidate[];
  readonly journeyEvidence?: JourneyEvidence;
  readonly replayComparison?: ReplayComparison;
  readonly coverage?: Readonly<Record<string, number>>;
  readonly reasonCode?: string;
}

export interface CampaignExecutionContext {
  readonly manifest: CampaignManifest;
  readonly workItem: CampaignWorkItem;
  readonly budget: CampaignBudgetSnapshot;
  readonly attempt: number;
  readonly executionGuarantee: ExecutionGuarantee;
}

export interface CampaignReproductionOutcome {
  readonly result: 'REPRODUCED' | 'NOT_REPRODUCED' | 'INVALID' | 'SAFETY_BLOCKED' | 'RUNTIME_FAILURE';
  readonly runId: string;
  readonly fingerprint: string | null;
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly candidate?: CampaignAnomalyCandidate;
  readonly reasonCode?: string;
}

export type CampaignReproductionBudgetEstimate = Partial<Pick<CampaignBudgetUsage,
  'browserContexts' | 'journeyContexts' | 'explorationContexts' | 'apiExecutions' | 'totalActions'>>;

export interface CampaignExecutor {
  readonly preflight: (input: { readonly manifest: CampaignManifest; readonly workItem: CampaignWorkItem | null }) => Promise<CampaignPreflightResult> | CampaignPreflightResult;
  readonly execute: (context: CampaignExecutionContext) => Promise<CampaignExecutionOutcome>;
  /** Optional pre-execution estimate used by adapters that create fresh real contexts. */
  readonly estimateReproduction?: (input: { readonly manifest: CampaignManifest; readonly cluster: AnomalyCluster; readonly representative: CampaignAnomalyCandidate }) => CampaignReproductionBudgetEstimate;
  readonly reproduce?: (input: { readonly manifest: CampaignManifest; readonly cluster: AnomalyCluster; readonly representative: CampaignAnomalyCandidate }) => Promise<CampaignReproductionOutcome>;
}

export interface CampaignExecutionRecord {
  readonly workItemId: string;
  readonly kind: CampaignWorkKind;
  readonly state: CampaignWorkState;
  readonly attemptCount: number;
  readonly executionGuarantee: ExecutionGuarantee;
  readonly result: CampaignExecutionOutcome['result'] | null;
  readonly reasonCode: string | null;
  readonly actionsExecuted: number;
  readonly apiExecutions: number;
  readonly browserContextCreated: boolean;
  readonly replay: boolean;
  readonly anomalyFingerprints: readonly string[];
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
}

export interface CampaignReproductionRecord {
  readonly clusterId: string;
  readonly representativeRunId: string;
  readonly state: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED' | 'REPLAY_REQUIRED';
  readonly result: CampaignReproductionOutcome['result'] | null;
  readonly admissionLevel: EvidenceLevel;
  readonly reasonCode: string | null;
  readonly runId: string | null;
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
}

export interface CampaignDossierRecord {
  readonly clusterId: string;
  readonly candidateId: string;
  readonly state: 'INCOMPLETE' | 'READY' | 'SKIPPED';
  readonly artifactPath: string | null;
  readonly evidenceLevel: EvidenceLevel;
  readonly triagePriority: TriagePriority;
  /** Optional dossier schema version; absent implies v1 for historical compatibility. v2 must be validated with v2 validator. */
  readonly dossierVersion?: string;
}

export interface CampaignBriefCampaignMetadata {
  readonly campaignId: string;
  readonly mode: CampaignMode;
  readonly manifestFingerprint: string;
  readonly datastoreStatus: 'OUT_OF_SCOPE_BY_OWNER';
  readonly phase6: 'FROZEN_BY_OWNER';
}

export interface CampaignBriefFinding {
  readonly candidateId: string;
  readonly title: string;
  readonly priority: TriagePriority;
  readonly confidence: TriageConfidence;
  readonly evidenceLevel: EvidenceLevel;
  readonly minimalSequence: readonly string[];
  readonly faultBoundary: string;
  readonly reproductionCount: number;
}

export interface CampaignMorningBrief {
  readonly schemaVersion: typeof CAMPAIGN_MORNING_BRIEF_VERSION;
  readonly campaignId: string;
  readonly resultClass: CampaignResultClass;
  readonly headline: string;
  readonly campaign: CampaignBriefCampaignMetadata;
  readonly whatRan: readonly string[];
  readonly topFindings: readonly CampaignBriefFinding[];
  readonly strongestReproductions: readonly string[];
  readonly sourceAreasToInspect: readonly string[];
  readonly transientsAndNonFindings: readonly string[];
  readonly coverageGaps: readonly string[];
  readonly nightwatchInternalIssues: readonly string[];
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly externalPublication: 'PROHIBITED';
}

/**
 * Structural mirror of the Session-2 candidate lifecycle record owned by
 * `src/core/campaign/candidateLifecycle.ts`. Declared locally (same exact
 * shape) so checkpoint validation never compile-couples to that module.
 */
export interface CandidateLifecycleRecordShape {
  readonly lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v1';
  readonly variant: 'PROTOCOL_ONLY' | 'SEMANTIC';
  readonly state: 'OBSERVED' | 'ADMITTED' | 'REPRODUCED' | 'MINIMIZED' | 'CLUSTERED' | 'UNCHANGED' | 'TRIAGED' | 'DOSSIER_READY' | 'REJECTED' | 'UNRESOLVED';
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

/**
 * Phase 15P A09 — durable interrupted-work bookkeeping record. Persisted in
 * the checkpoint (optional field) so resume reconstructs exact continuation
 * points without re-deriving them from queue states alone. Exactly one of
 * workItemId / clusterId is non-null: manifest work-item interruptions and
 * promotion-pipeline (reproduction/minimization) interruptions are distinct
 * identities.
 */
export interface CampaignInterruptedWorkRecord {
  readonly workItemId: string | null;
  readonly clusterId: string | null;
  readonly phaseReached: 'RUNNING' | 'REPLAY_REQUIRED';
  /** Checkpoint ordinal at which the interruption was recorded. */
  readonly ordinal: number;
  readonly reservationState: 'RESERVED' | 'CONSUMED';
}

/**
 * Phase 15P A09 — bounded per-work-item retry counter with explicit
 * reservation semantics. reservedAttemptIds holds one deterministic id per
 * granted attempt (`<workItemId>:attempt:<n>`); ids may be shorter than
 * attemptCount for records seeded from checkpoints persisted before this
 * field existed. Exhaustion (attemptCount === maxAttempts) fails closed.
 */
export interface CampaignWorkItemRetryRecord {
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly reservedAttemptIds: readonly string[];
}

export interface CampaignCheckpoint {
  readonly schemaVersion: typeof CAMPAIGN_CHECKPOINT_VERSION;
  readonly campaignId: string;
  readonly manifestFingerprint: string;
  readonly campaignStatus: CampaignResultClass | 'IN_PROGRESS';
  readonly stopReason: CampaignStopReason;
  readonly checkpointOrdinal: number;
  readonly sourceSnapshots: readonly CampaignSourceSnapshot[];
  readonly selection: CampaignSelectionResult;
  readonly selectedJourneys: readonly JourneyId[];
  readonly selectedEnvelopes: readonly string[];
  readonly selectedApiScenarios: readonly string[];
  readonly seedLedger: readonly string[];
  readonly budgetPolicy: CampaignBudgetPolicy;
  readonly budgetUsed: CampaignBudgetUsage;
  readonly budgetRemaining: CampaignBudgetUsage;
  readonly executionLedger: readonly CampaignExecutionRecord[];
  readonly anomalyObservations: readonly TriageAnomalyObservation[];
  readonly anomalyCandidates: readonly Omit<CampaignAnomalyCandidate, 'replay'>[];
  readonly anomalyClusters: readonly AnomalyCluster[];
  readonly reproductionQueue: readonly CampaignReproductionRecord[];
  readonly minimizationQueue: readonly string[];
  readonly dossierLedger: readonly CampaignDossierRecord[];
  readonly morningBriefStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';
  readonly bugCandidates: readonly string[];
  readonly rejectedHypotheses: readonly string[];
  readonly unresolved: readonly string[];
  readonly safetyEvents: readonly string[];
  readonly safety: CampaignSafetyVector;
  readonly privacy: CampaignPrivacyStatus;
  readonly privacyStatus: 'PASS' | 'BLOCKED';
  readonly versionDrift: readonly string[];
  readonly completedWorkItemIds: readonly string[];
  readonly remainingWorkItemIds: readonly string[];
  readonly nextExactAction: string;
  readonly resumeRecipe: readonly string[];
  readonly executionGuarantees: Readonly<Record<CampaignWorkKind, ExecutionGuarantee>>;
  readonly runtimeElapsedMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  // Optional Session-2 additions: absent means a historical pre-S2 checkpoint
  // and stays valid; present, they are strictly validated at the checkpoint
  // boundary (see validateCampaignCheckpoint).
  readonly candidateLifecycles?: Readonly<Record<string, CandidateLifecycleRecordShape>>;
  readonly runtimeContractVersions?: Readonly<{
    candidateLifecycle: string;
    replayBinding: string;
    promotionResult: string;
  }>;
  // Optional Phase 15P A09 additions (shape-optional, schema version
  // unchanged): durable interrupted-work bookkeeping and bounded per-item
  // retry reservations; strictly validated when present.
  readonly interruptedWork?: readonly CampaignInterruptedWorkRecord[];
  readonly workItemRetries?: Readonly<Record<string, CampaignWorkItemRetryRecord>>;
}

export interface CampaignRunResult {
  readonly campaignId: string;
  readonly manifest: CampaignManifest;
  readonly resultClass: CampaignResultClass;
  readonly stopReason: CampaignStopReason;
  readonly checkpoint: CampaignCheckpoint;
  readonly morningBrief: CampaignMorningBrief;
  readonly dossiers: readonly BugDossier[];
  readonly artifactPaths: readonly string[];
}

export interface CampaignInput {
  readonly mode: CampaignMode;
  readonly createdAt: string;
  readonly sourceSnapshots: readonly CampaignSourceSnapshot[];
  readonly sourceWindow: CampaignSourceWindow;
  readonly changeset: ChangeSet | null;
  readonly phase3Selection: SelectionResult | null;
  readonly seedCorpusVersion: string;
  readonly seedSet: readonly string[];
  readonly safeActions: readonly SafeAction[];
  readonly explorationEnvelopes: readonly ExplorationEnvelope[];
  readonly apiOperations: readonly ApiOperation[];
  readonly versions: CampaignVersionFingerprint;
  readonly budgetPolicy: CampaignBudgetPolicy;
  readonly privacyPolicy: CampaignPrivacyPolicy;
  readonly reproductionTarget?: {
    readonly clusterId: string;
    readonly candidate: CampaignAnomalyCandidate;
  };
}

export interface CampaignRunOptions {
  readonly store?: import('../policy/privateArtifacts').PrivateArtifactStore;
  readonly checkpoint?: CampaignCheckpoint;
  readonly now?: () => Date;
  readonly maxTopFindings?: number;
  readonly stopAfterWorkItemId?: string;
  /** Optional runtime fingerprint check used by long-running real adapters. */
  readonly currentVersions?: CampaignVersionFingerprint | (() => CampaignVersionFingerprint);
}

// Keep these imports in the public type surface useful to adapters without
// leaking private runtime values into persisted state.
export type { DependencyEdge, RepoDefinition, BrowserApiDifferential, ConfidenceResult, SourceChangeCandidate, TriageConfidence };
