export const PHASE24_PORTFOLIO_VERSION = 'nightwatch.phase24-candidate-portfolio.v1' as const;
export const PHASE24_INVALIDATION_VERSION = 'nightwatch.candidate-invalidation.v1' as const;
export const PHASE24_MANIFEST_VERSION = 'nightwatch.local-triage-manifest.v3' as const;
export const PHASE24_REHEARSAL_VERSION = 'nightwatch.phase24-no-contact-rehearsal-receipt.v1' as const;
export const PHASE24_SEMANTIC_VERSION = 'nightwatch.phase24-semantic-evaluation.v1' as const;
export const PHASE24_CROSS_CANDIDATE_VERSION = 'nightwatch.phase24-cross-candidate-evaluation.v1' as const;
export const PHASE24_REPLAY_VERSION = 'nightwatch.phase24-replay.v3' as const;
export const PHASE24_MINIMIZATION_VERSION = 'nightwatch.phase24-minimization.v1' as const;
export const PHASE24_DOSSIER_VERSION = 'nightwatch.phase24-owner-review-dossier.v1' as const;
export const PHASE24_CI_VERSION = 'nightwatch.phase24-ci-observability.v1' as const;
export const PHASE24_READINESS_VERSION = 'nightwatch.phase24-readiness-diagnostics.v1' as const;
export const PHASE24_SYNTHETIC_CAMPAIGN_VERSION = 'nightwatch.phase24-synthetic-campaign.v1' as const;
export const PHASE24_SELECTION_VERSION = 'nightwatch.phase24-portfolio-selection.v1' as const;
export const PHASE24_SOURCE_ANALYSIS_VERSION = 'nightwatch.phase24-source-snapshot-analysis.v1' as const;

export type Phase24Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCONFIRMED';
export type Phase24MaterialClass = 'COLLECTION' | 'MEMBERSHIP' | 'RELATIONAL' | 'DIFFERENTIAL' | 'SHAPE' | 'PROTOCOL';
export type Phase24SourceVersionState = 'CURRENT' | 'DRIFTED' | 'UNKNOWN';
export type Phase24AuthRequirement = 'NONE' | 'OWNER_EXTERNAL_PATH' | 'UNBOUND' | 'INLINE_SECRET';
export type Phase24EnvironmentRequirement = 'DEV_ONLY' | 'NONPRODUCTION' | 'PRODUCTION_ONLY' | 'UNBOUND';
export type Phase24MutationClassification = 'NONE' | 'READ_ONLY' | 'CONDITIONAL_MUTATION' | 'MUTATION' | 'UNKNOWN';
export type Phase24ReplayStrategy = 'DETERMINISTIC_FIXTURE' | 'FIRST_REPLAY' | 'UNSUPPORTED' | 'UNBOUNDED';
export type Phase24EvidenceValue = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface Phase24SourceIdentity {
  readonly repoId: string;
  readonly sha: string;
  readonly evidenceDigest: string;
}

export interface Phase24RouteIdentity {
  readonly endpointId: string;
  readonly method: 'GET';
  readonly routeTemplate: string;
  readonly transport: 'HTTP_API' | 'BROWSER_READ_ONLY' | 'SYNTHETIC';
}

export interface Phase24ContractIdentity {
  readonly contractId: string;
  readonly requestDigest: string;
  readonly responseDigest: string;
  readonly version: string;
}

export interface Phase24BehaviorOwner {
  readonly repository: string;
  readonly packageName: string;
  readonly component: string;
  readonly confidence: Phase24Confidence | 'AMBIGUOUS';
}

export interface Phase24ReplayDescriptor {
  readonly strategy: Phase24ReplayStrategy;
  readonly planIdentity: string;
  readonly maxContexts: 2;
  readonly prerequisites: readonly string[];
}

export interface Phase24CandidateInput {
  /** Stable source-surface key; it excludes source SHA so drift can be joined. */
  readonly surfaceKey: string;
  readonly targetId: string;
  readonly product: string;
  readonly source: Phase24SourceIdentity | null;
  readonly sourceAvailable: boolean;
  /** Set by the snapshot adapter; false never silently rebinds a surface. */
  readonly sourceSnapshotMatches?: boolean;
  readonly relevantFiles: readonly string[];
  readonly route: Phase24RouteIdentity | null;
  readonly routeIdentityProven: boolean;
  readonly contract: Phase24ContractIdentity | null;
  readonly contractIdentityProven: boolean;
  readonly behaviorOwner: Phase24BehaviorOwner | null;
  readonly behaviorOwnerProven: boolean;
  readonly sourceVersion: Phase24SourceVersionState;
  readonly semanticExpectationId: string;
  readonly semanticContractProven: boolean;
  readonly semanticPreconditions: readonly string[];
  readonly semanticPreconditionsBound: boolean;
  readonly materialClass: Phase24MaterialClass;
  readonly authRequirement: Phase24AuthRequirement;
  readonly environmentRequirement: Phase24EnvironmentRequirement;
  readonly mutationClassification: Phase24MutationClassification;
  readonly readOnlySuitable: boolean;
  readonly projectionSafe: boolean;
  readonly replay: Phase24ReplayDescriptor | null;
  readonly expectedEvidenceValue: Phase24EvidenceValue;
  readonly selectionPriority: number;
  readonly anticipatedInvariantCount: number;
}

export type Phase24Eligibility = 'ELIGIBLE' | 'EXCLUDED';

export type Phase24ReasonCode =
  | 'ELIGIBLE_ROUTE_IDENTITY_BOUND'
  | 'ELIGIBLE_CONTRACT_IDENTITY_BOUND'
  | 'ELIGIBLE_SOURCE_PROVENANCE_EXACT'
  | 'ELIGIBLE_BEHAVIOR_OWNER_BOUND'
  | 'ELIGIBLE_VERSION_CURRENT'
  | 'ELIGIBLE_SEMANTIC_PRECONDITIONS_BOUND'
  | 'ELIGIBLE_READ_ONLY_CONFIRMED'
  | 'ELIGIBLE_AUTH_EXTERNALIZED'
  | 'ELIGIBLE_DEV_ENVIRONMENT'
  | 'ELIGIBLE_MUTATION_ABSENT'
  | 'ELIGIBLE_REPLAY_BOUNDED'
  | 'ELIGIBLE_PROJECTION_SAFE'
  | 'ELIGIBLE_DOSSIER_VALUE'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_IDENTITY_MISSING'
  | 'SOURCE_SHA_INVALID'
  | 'SOURCE_EVIDENCE_INVALID'
  | 'SOURCE_SNAPSHOT_MISMATCH'
  | 'ROUTE_IDENTITY_UNPROVEN'
  | 'CONTRACT_IDENTITY_UNPROVEN'
  | 'BEHAVIOR_OWNER_AMBIGUOUS'
  | 'SOURCE_VERSION_DRIFT'
  | 'SOURCE_VERSION_UNKNOWN'
  | 'SEMANTIC_CONTRACT_UNPROVEN'
  | 'SEMANTIC_PRECONDITIONS_UNBOUNDED'
  | 'MUTATION_REQUIRED'
  | 'READ_ONLY_SUITABILITY_UNPROVEN'
  | 'AUTH_REQUIREMENT_UNBOUND'
  | 'INLINE_SECRET_AUTH_FORBIDDEN'
  | 'ENVIRONMENT_NOT_DEV'
  | 'PROJECTION_UNSAFE'
  | 'REPLAY_UNSUPPORTED'
  | 'REPLAY_UNBOUNDED'
  | 'DOSSIER_VALUE_INSUFFICIENT'
  | 'ANTICIPATED_INVARIANT_COUNT_INVALID'
  | 'SELECTION_PRIORITY_INVALID';

export interface Phase24ExclusionReason {
  readonly code: Phase24ReasonCode;
  readonly failure: string;
  readonly why: string;
  readonly permanent: boolean;
  readonly futureSourceCanMakeEligible: boolean;
}

export interface Phase24CandidateDecision extends Phase24CandidateInput {
  readonly candidateId: string;
  readonly eligibility: Phase24Eligibility;
  readonly reasonCodes: readonly Phase24ReasonCode[];
  readonly exclusionReasons: readonly Phase24ExclusionReason[];
  readonly deterministicDigest: string;
}

export interface Phase24CandidatePortfolio {
  readonly schemaVersion: typeof PHASE24_PORTFOLIO_VERSION;
  readonly sourceSnapshots: readonly Phase24SourceIdentity[];
  readonly candidates: readonly Phase24CandidateDecision[];
  readonly eligibleCandidateIds: readonly string[];
  readonly excludedCandidateIds: readonly string[];
  readonly reasonCodeCoverage: readonly Phase24ReasonCode[];
  readonly consideredCount: number;
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly deterministicDigest: string;
}

export interface Phase24SourceSnapshotAnalysis {
  readonly schemaVersion: typeof PHASE24_SOURCE_ANALYSIS_VERSION;
  readonly snapshot: Phase24SourceIdentity;
  readonly portfolio: Phase24CandidatePortfolio;
  readonly discoveredSurfaceKeys: readonly string[];
  readonly eligibleSurfaceKeys: readonly string[];
  readonly excludedSurfaceKeys: readonly string[];
  readonly reasonCodeCoverage: readonly Phase24ReasonCode[];
  readonly deterministicDigest: string;
}

export interface Phase24PortfolioSelectionRow {
  readonly candidateId: string;
  readonly score: number;
  readonly rank: number | null;
  readonly selected: boolean;
  readonly reasonCode: 'MATERIAL_DIVERSITY' | 'SCORE_PRIORITY' | 'BOUND_EXHAUSTED' | 'SOURCE_QUALIFICATION_EXCLUDED';
}

export interface Phase24PortfolioSelection {
  readonly schemaVersion: typeof PHASE24_SELECTION_VERSION;
  readonly portfolioDigest: string;
  readonly maxCandidates: number;
  readonly selectedCandidateIds: readonly string[];
  readonly rows: readonly Phase24PortfolioSelectionRow[];
  readonly deterministicDigest: string;
}

export type Phase24InvalidationState =
  | 'CURRENT'
  | 'NEW_CANDIDATE'
  | 'NEWLY_ELIGIBLE'
  | 'NEWLY_UNSAFE'
  | 'SOURCE_CHANGED'
  | 'CONTRACT_CHANGED'
  | 'SEMANTIC_EXPECTATION_CHANGED'
  | 'REPLAY_PLAN_INVALIDATED'
  | 'DOSSIER_ASSUMPTION_INVALIDATED'
  | 'CONTRACT_REMOVED'
  | 'SOURCE_UNAVAILABLE';

export type Phase24InvalidationReasonCode =
  | 'NO_CHANGE'
  | 'SOURCE_SHA_CHANGED'
  | 'SOURCE_EVIDENCE_CHANGED'
  | 'CONTRACT_IDENTITY_CHANGED'
  | 'SEMANTIC_EXPECTATION_CHANGED'
  | 'REPLAY_IDENTITY_CHANGED'
  | 'DOSSIER_OWNER_CHANGED'
  | 'ELIGIBILITY_CHANGED'
  | 'CANDIDATE_ADDED'
  | 'CANDIDATE_REMOVED'
  | 'SOURCE_SNAPSHOT_UNAVAILABLE';

export interface Phase24CandidateInvalidationRecord {
  readonly candidateId: string;
  readonly surfaceKey: string;
  readonly state: Phase24InvalidationState;
  readonly affected: boolean;
  readonly reasonCodes: readonly Phase24InvalidationReasonCode[];
  readonly priorSource: Phase24SourceIdentity | null;
  readonly currentSource: Phase24SourceIdentity | null;
  readonly replayInvalidated: boolean;
  readonly dossierAssumptionsInvalidated: boolean;
  readonly deterministicDigest: string;
}

export interface Phase24CandidateInvalidationLedger {
  readonly schemaVersion: typeof PHASE24_INVALIDATION_VERSION;
  readonly priorPortfolioDigest: string | null;
  readonly currentPortfolioDigest: string | null;
  readonly sourceAvailable: boolean;
  readonly records: readonly Phase24CandidateInvalidationRecord[];
  readonly changedCandidateIds: readonly string[];
  readonly newlyEligibleCandidateIds: readonly string[];
  readonly newlyUnsafeCandidateIds: readonly string[];
  readonly staleCandidateIds: readonly string[];
  readonly replayInvalidatedCandidateIds: readonly string[];
  readonly dossierInvalidatedCandidateIds: readonly string[];
  readonly deterministicDigest: string;
}

export interface Phase24ManifestCandidateBinding {
  readonly candidateId: string;
  readonly surfaceKey: string;
  readonly source: Phase24SourceIdentity;
  readonly semanticExpectationId: string;
  readonly contractId: string;
  readonly replayPlanIdentity: string;
  readonly candidateDecisionDigest: string;
}

export interface Phase24ManifestInput {
  readonly nightwatchSha: string;
  readonly environment: 'DEV';
  readonly portfolio: Phase24CandidatePortfolio;
  readonly selectedCandidateIds: readonly string[];
  readonly semanticExpectationDigest: string;
  readonly replayPlanDigest: string;
  readonly containment: {
    readonly version: string;
    readonly loopbackProxyRequired: true;
    readonly externalContactAllowed: false;
    readonly mutationAllowed: false;
    readonly rawPersistenceAllowed: false;
    readonly localDestinationClass: 'OWNER_LOCAL_ONLY';
  };
  readonly policy: {
    readonly version: string;
    readonly digest: string;
    readonly operationClass: 'READ_ONLY';
    readonly ownerScopeStatus: 'FROZEN_BY_OWNER';
  };
  readonly qualityGate: {
    readonly receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1';
    readonly receiptDigest: string;
    readonly gateDefinitionDigest: string;
    readonly gitHead: string;
    readonly finalResult: 'PASS';
  };
  readonly operatorAuthorization: 'EXTERNAL_CI_REQUIRED' | 'NOT_READ';
}

export interface Phase24Manifest extends Omit<Phase24ManifestInput, 'portfolio'> {
  readonly schemaVersion: typeof PHASE24_MANIFEST_VERSION;
  readonly manifestId: string;
  readonly portfolioDigest: string;
  readonly selectedCandidates: readonly Phase24ManifestCandidateBinding[];
  readonly deterministicDigest: string;
}

export interface Phase24NoContactRehearsalReceipt {
  readonly schemaVersion: typeof PHASE24_REHEARSAL_VERSION;
  readonly manifestId: string;
  readonly manifestDigest: string;
  readonly candidateCount: number;
  readonly stageCodes: readonly string[];
  readonly browserActionCount: number;
  readonly oracleCount: number;
  readonly replayPlanCount: number;
  readonly dossierRouteCount: number;
  readonly externalContactCount: 0;
  readonly mutationCount: 0;
  readonly rawPersistenceCount: 0;
  readonly teardownComplete: true;
  readonly result: 'PASS';
  readonly deterministicDigest: string;
}

export type Phase24SemanticKind =
  | 'TOTALS_CONTRADICTORY'
  | 'MISSING_MEMBERS'
  | 'DUPLICATE_LOGICAL_ENTITIES'
  | 'IMPOSSIBLE_STATE_TRANSITION'
  | 'UNIT_INCONSISTENT'
  | 'PAGINATION_NON_MONOTONIC'
  | 'FILTER_LEAKAGE'
  | 'SORT_INSTABILITY'
  | 'LIST_DETAIL_DISAGREEMENT'
  | 'MALFORMED_BOUNDED_AGGREGATE'
  | 'CROSS_FIELD_CONTRADICTION'
  | 'IDENTITY_INSTABILITY';

export interface Phase24SemanticExpectation {
  readonly schemaVersion: typeof PHASE24_SEMANTIC_VERSION;
  readonly expectationId: string;
  readonly candidateId: string;
  readonly invariantId: string;
  readonly kind: Phase24SemanticKind;
  readonly source: Phase24SourceIdentity;
  readonly contractId: string;
  readonly preconditions: readonly string[];
  readonly provenanceDigest: string;
  readonly deterministicDigest: string;
}

export interface Phase24SemanticObservation {
  readonly schemaVersion: 'nightwatch.phase24-safe-semantic-observation.v1';
  readonly applicable: boolean;
  readonly totals?: { readonly declaredCount: number; readonly observedCount: number; readonly totalConsistent: boolean };
  readonly membership?: { readonly expectedCount: number; readonly observedCount: number; readonly missingCount: number; readonly duplicateCount: number };
  readonly transition?: { readonly transitionAllowed: boolean };
  readonly units?: { readonly compatible: boolean };
  readonly pagination?: { readonly monotonic: boolean };
  readonly filter?: { readonly leakedCount: number };
  readonly sort?: { readonly stable: boolean };
  readonly listDetail?: { readonly disagreementCount: number };
  readonly aggregate?: { readonly schemaValid: boolean; readonly bounded: boolean };
  readonly crossField?: { readonly violationCount: number };
  readonly identity?: { readonly stable: boolean };
}

export type Phase24SemanticOutcome = 'PASS' | 'VIOLATED' | 'NOT_APPLICABLE' | 'INTERNAL_ERROR';

export interface Phase24SemanticEvaluation {
  readonly schemaVersion: typeof PHASE24_SEMANTIC_VERSION;
  readonly expectationId: string;
  readonly invariantId: string;
  readonly kind: Phase24SemanticKind;
  readonly source: Phase24SourceIdentity;
  readonly outcome: Phase24SemanticOutcome;
  readonly findingCount: 0 | 1;
  readonly inspectedCategoryCount: number;
  readonly violatingCategoryCount: number;
  readonly sanitizedReasonCode: string;
  readonly deterministicDigest: string;
}

export type Phase24CrossCandidateRelationKind =
  | 'LIST_DETAIL_MEMBERSHIP'
  | 'FILTERED_SUBSET'
  | 'SUMMARY_MEMBERS'
  | 'PAYER_EXCHANGE_LINK'
  | 'INVENTORY_ACCOUNT_LINK';

export interface Phase24CrossCandidateExpectation {
  readonly schemaVersion: typeof PHASE24_CROSS_CANDIDATE_VERSION;
  readonly relationId: string;
  readonly relation: Phase24CrossCandidateRelationKind;
  readonly leftCandidateId: string;
  readonly rightCandidateId: string;
  readonly leftSource: Phase24SourceIdentity;
  readonly rightSource: Phase24SourceIdentity;
  readonly leftContractId: string;
  readonly rightContractId: string;
  readonly provenanceDigest: string;
  readonly deterministicDigest: string;
}

export interface Phase24CrossCandidateObservation {
  readonly schemaVersion: 'nightwatch.phase24-safe-cross-candidate-observation.v1';
  readonly applicable: boolean;
  readonly leftCount: number;
  readonly rightCount: number;
  readonly missingCount: number;
  readonly leakedCount: number;
  readonly contradictionCount: number;
  readonly totalConsistent: boolean;
}

export type Phase24CrossCandidateOutcome = 'PASS' | 'VIOLATED' | 'NOT_APPLICABLE' | 'SOURCE_STALE' | 'INTERNAL_ERROR';

export interface Phase24CrossCandidateEvaluation {
  readonly schemaVersion: typeof PHASE24_CROSS_CANDIDATE_VERSION;
  readonly relationId: string;
  readonly relation: Phase24CrossCandidateRelationKind;
  readonly leftCandidateId: string;
  readonly rightCandidateId: string;
  readonly outcome: Phase24CrossCandidateOutcome;
  readonly findingCount: 0 | 1;
  readonly inspectedCategoryCount: number;
  readonly violatingCategoryCount: number;
  readonly freshness: 'CURRENT_EXACT' | 'SOURCE_STALE' | 'UNKNOWN';
  readonly deterministicDigest: string;
}

export type Phase24ReplayClassification =
  | 'DETERMINISTIC_REPRODUCTION'
  | 'PRECONDITION_DIVERGENCE'
  | 'SOURCE_DRIFT'
  | 'AUTH_DIVERGENCE'
  | 'ENVIRONMENT_DIVERGENCE'
  | 'SEMANTIC_NON_REPRODUCTION'
  | 'INVALID_REPLAY';

export interface Phase24ReplayPlan {
  readonly schemaVersion: typeof PHASE24_REPLAY_VERSION;
  readonly planIdentity: string;
  readonly candidateId: string;
  readonly occurrenceIdentity: string;
  readonly source: Phase24SourceIdentity;
  readonly environment: 'DEV';
  readonly semanticContractId: string;
  readonly expectationId: string;
  readonly sanitizedObservationDigest: string;
  readonly executionPrerequisites: readonly string[];
  readonly maxAttempts: 1;
  readonly maxContexts: 2;
  readonly deterministicDigest: string;
}

export interface Phase24ReplayFacts {
  readonly replayAttempted: boolean;
  readonly sourceExact: boolean;
  readonly authReady: boolean;
  readonly environmentAuthorized: boolean;
  readonly prerequisitesStable: boolean;
  readonly sameInvariantObserved: boolean;
  readonly semanticContractStillValid: boolean;
}

export interface Phase24ReplayDecision {
  readonly schemaVersion: typeof PHASE24_REPLAY_VERSION;
  readonly planIdentity: string;
  readonly classification: Phase24ReplayClassification;
  readonly reasonCode: string;
  readonly sameInvariantPreserved: boolean;
  readonly deterministicDigest: string;
}

export type Phase24MinimizationUnitKind = 'STEP' | 'REQUEST_PARAMETER' | 'CANDIDATE_DEPENDENCY' | 'EVIDENCE_FIELD' | 'SEMANTIC_INPUT';

export interface Phase24MinimizationUnit {
  readonly kind: Phase24MinimizationUnitKind;
  readonly identity: string;
  readonly preservesInvariant: boolean;
  readonly preservesBugClass: boolean;
}

export interface Phase24MinimizationInput {
  readonly findingIdentity: string;
  readonly invariantId: string;
  readonly originalUnits: readonly Phase24MinimizationUnit[];
  readonly removableUnits: readonly Phase24MinimizationUnit[];
  readonly replayConfirmationCount: number;
  readonly provenance: Phase24SourceIdentity;
}

export interface Phase24MinimizationResult {
  readonly schemaVersion: typeof PHASE24_MINIMIZATION_VERSION;
  readonly findingIdentity: string;
  readonly invariantId: string;
  readonly originalComplexity: Readonly<Record<Phase24MinimizationUnitKind, number>>;
  readonly minimizedComplexity: Readonly<Record<Phase24MinimizationUnitKind, number>>;
  readonly removedUnitIdentities: readonly string[];
  readonly preservedInvariant: true;
  readonly preservedBugClass: true;
  readonly replayConfirmationCount: number;
  readonly provenance: Phase24SourceIdentity;
  readonly deterministicDigest: string;
}

export type Phase24OwnershipResolution = 'EXACT_COMPONENT' | 'REPOSITORY_ONLY' | 'AMBIGUOUS_COMPONENT' | 'UNRESOLVED';

export interface Phase24OwnerRouting {
  readonly resolution: Phase24OwnershipResolution;
  readonly repository: string | null;
  readonly packageName: string | null;
  readonly component: string | null;
  readonly confidence: Phase24Confidence | 'AMBIGUOUS' | 'UNCONFIRMED';
  readonly reasonCode: string;
  readonly deterministicDigest: string;
}

export interface Phase24Dossier {
  readonly schemaVersion: typeof PHASE24_DOSSIER_VERSION;
  readonly dossierId: string;
  readonly findingKind: Phase24SemanticKind | Phase24CrossCandidateRelationKind;
  readonly invariantId: string;
  readonly candidateIds: readonly string[];
  readonly sourceContracts: readonly { readonly repoId: string; readonly sha: string; readonly evidenceDigest: string; readonly contractId: string }[];
  readonly implementationFiles: readonly string[];
  readonly ownership: Phase24OwnerRouting;
  readonly replayClassification: Phase24ReplayClassification;
  readonly minimized: boolean;
  readonly changedAssumptionCodes: readonly string[];
  readonly discardedEvidenceCodes: readonly string[];
  readonly additionalConfirmationCode: string;
  readonly privacy: {
    readonly rawValuesPersisted: false;
    readonly rawCustomerValuesPersisted: false;
    readonly rawAuthPersisted: false;
    readonly screenshotsPersisted: false;
    readonly tracesPersisted: false;
    readonly destinationClass: 'OWNER_LOCAL_ONLY';
  };
  readonly findingCount: 0 | 1;
  readonly deterministicDigest: string;
}

export type Phase24CiState =
  | 'NO_RUN'
  | 'QUEUED'
  | 'RUNNING'
  | 'EXACT_HEAD_GREEN'
  | 'EXACT_HEAD_TEST_FAILURE'
  | 'CANCELLED'
  | 'ZERO_STEP_PLATFORM_BLOCK'
  | 'INFRASTRUCTURE_FAILURE'
  | 'WRONG_SHA'
  | 'WRONG_WORKFLOW'
  | 'WRONG_JOB'
  | 'INCOMPLETE_STEPS'
  | 'AMBIGUOUS';

export interface Phase24CiObservation {
  readonly currentHead: string;
  readonly expectedWorkflow: string;
  readonly requiredJob: string;
  readonly run: { readonly headSha: string; readonly workflow: string; readonly status: 'queued' | 'in_progress' | 'completed'; readonly conclusion: 'success' | 'failure' | 'cancelled' | null } | null;
  readonly requiredJobObservation: { readonly name: string; readonly steps: readonly { readonly status: string; readonly conclusion: string | null }[] | null; readonly conclusion: string | null } | null;
  readonly gateReceipt: { readonly finalResult: 'PASS' | 'TEST_FAILURE' | 'INFRA_FAILURE' | null; readonly gateDefinitionDigest: string | null; readonly expectedGateDefinitionDigest: string } | null;
}

export interface Phase24CiClassification {
  readonly schemaVersion: typeof PHASE24_CI_VERSION;
  readonly state: Phase24CiState;
  readonly reasonCodes: readonly string[];
  readonly exactHead: boolean;
  readonly executedStepCount: number;
  readonly deterministicDigest: string;
}

export interface Phase24ReadinessFacts {
  readonly externalCi: Phase24CiClassification;
  readonly sourceCurrent: boolean;
  readonly manifestCurrent: boolean;
  readonly authReady: boolean;
  readonly containmentReady: boolean;
  readonly qualityGateMatches: boolean;
  readonly sourceIdentityMatches: boolean;
  readonly environmentAuthorized: boolean;
}

export interface Phase24ReadinessDiagnostics {
  readonly schemaVersion: typeof PHASE24_READINESS_VERSION;
  readonly state: 'READY' | 'BLOCKED';
  readonly blockerCodes: readonly string[];
  readonly requiredConditions: readonly string[];
  readonly deterministicDigest: string;
}

export interface Phase24SyntheticCampaignReceipt {
  readonly schemaVersion: typeof PHASE24_SYNTHETIC_CAMPAIGN_VERSION;
  readonly candidateCount: number;
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly oracleCaseCount: number;
  readonly violatedCaseCount: number;
  readonly benignCaseCount: number;
  readonly falsePositiveCount: 0;
  readonly invalidationCaseCount: number;
  readonly deterministicRepeat: true;
  readonly deterministicDigest: string;
}
