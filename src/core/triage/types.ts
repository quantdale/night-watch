// ---------------------------------------------------------------------------
// Nightwatch private local triage contracts.
//
// These types are deliberately metadata-first. They carry action IDs and
// structural classes, never values from a customer, browser body, DOM, or
// authenticated session.
// ---------------------------------------------------------------------------

import type { SafeAction, SafetyVector } from '../exploration/types';
import type { SemanticDossierEvidence } from '../../oracles/semantic/dossier';

export const FAILURE_MINIMIZATION_VERSION = 'nightwatch.failure-minimization.private.v1' as const;
export const ANOMALY_CLUSTER_VERSION = 'nightwatch.anomaly-cluster.private.v1' as const;
export const DOSSIER_VERSION = 'nightwatch.bug-dossier.private.v1' as const;
export const OVERNIGHT_SUMMARY_VERSION = 'nightwatch.overnight-summary.private.v1' as const;
export const MORNING_BRIEF_VERSION = 'nightwatch.morning-brief.private.v1' as const;
export const AI_READY_PACKAGE_VERSION = 'nightwatch.ai-ready-evidence.private.v1' as const;

export type TriageConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
export type TechnicalSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type TriagePriority = 'P0' | 'P1' | 'P2' | 'P3' | 'UNRANKED';
export type SourceFreshness = 'SOURCE_CURRENT_LOCALLY' | 'LOCAL_TRACKING_REF_ONLY' | 'REMOTE_FRESHNESS_CONFIRMED' | 'UNKNOWN';
export type SourceChangeRelevance =
  | 'DIRECT_CHANGE_RELEVANCE'
  | 'SHARED_CHANGE_RELEVANCE'
  | 'TRANSITIVE_CHANGE_RELEVANCE'
  | 'NO_CURRENT_CHANGE_RELEVANCE'
  | 'UNKNOWN';

export type FaultBoundary =
  | 'AUTH'
  | 'ROUTER'
  | 'UI_COMPONENT'
  | 'CLIENT_STATE'
  | 'API_CLIENT'
  | 'API_TRANSPORT'
  | 'BACKEND_HANDLER'
  | 'PROTOCOL'
  | 'RESOURCE_LOADING'
  | 'UNKNOWN';

export type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface MinimizationAction {
  readonly actionId: string;
  readonly semanticClass: 'KNOWN_READ' | 'LOCAL_ONLY';
  readonly routeClass: string;
  readonly sourceApproved: true;
  readonly catalogVersion: string;
  readonly preconditionKey?: string;
}

export function minimizationActionFromSafeAction(action: SafeAction): MinimizationAction {
  if (action.status !== 'APPROVED') throw new Error(`SAFE_ACTION_NOT_APPROVED:${action.actionId}`);
  if (action.semanticClass !== 'KNOWN_READ' && action.semanticClass !== 'LOCAL_ONLY') throw new Error(`SAFE_ACTION_SEMANTIC_UNSAFE:${action.actionId}`);
  if (action.persistedPreferenceEffect === 'SERVER_STATE') throw new Error(`SAFE_ACTION_SERVER_STATE:${action.actionId}`);
  if (action.routeEffect !== 'UNCHANGED' && action.routeEffect !== 'APPROVED_ROUTE') throw new Error(`SAFE_ACTION_ROUTE_UNSAFE:${action.actionId}`);
  return {
    actionId: action.actionId,
    semanticClass: action.semanticClass,
    routeClass: action.expectedRouteClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.safe-actions.phase4.v1',
    preconditionKey: action.preconditions.routeClasses.join('|'),
  };
}

export interface MinimizationBudget {
  readonly policyVersion: 'nightwatch.minimization-budget.private.v1';
  /** Fresh exact replay is separate; this counts all candidate evaluations. */
  readonly maxCandidateEvaluations: number;
  readonly maxTotalReplays: number;
}

export const REAL_DEV_MINIMIZATION_BUDGET: MinimizationBudget = {
  policyVersion: 'nightwatch.minimization-budget.private.v1',
  maxCandidateEvaluations: 4,
  maxTotalReplays: 5,
};

export const SYNTHETIC_MINIMIZATION_BUDGET: MinimizationBudget = {
  policyVersion: 'nightwatch.minimization-budget.private.v1',
  maxCandidateEvaluations: 64,
  maxTotalReplays: 65,
};

export interface MinimizationSafetyContract {
  readonly devOnly: boolean;
  readonly authValid: boolean;
  readonly outboundPolicySatisfied: boolean;
  readonly safeActionCatalogSatisfied: boolean;
  readonly semanticReadOnly: boolean;
  readonly mutationTripwireZero: boolean;
  readonly unknownTripwireZero: boolean;
  readonly routeEnvelopeSatisfied: boolean;
  readonly privacySatisfied: boolean;
}

export const PASSIVE_MINIMIZATION_SAFETY: MinimizationSafetyContract = {
  devOnly: true,
  authValid: true,
  outboundPolicySatisfied: true,
  safeActionCatalogSatisfied: true,
  semanticReadOnly: true,
  mutationTripwireZero: true,
  unknownTripwireZero: true,
  routeEnvelopeSatisfied: true,
  privacySatisfied: true,
};

export interface CandidateGuardResult {
  readonly valid: boolean;
  readonly reason?:
    | 'ACTION_NOT_IN_ORIGINAL'
    | 'ACTION_NOT_APPROVED'
    | 'PRECONDITION_DIVERGENCE'
    | 'DEV_GATE_FAILED'
    | 'AUTH_GATE_FAILED'
    | 'OUTBOUND_POLICY_FAILED'
    | 'SEMANTIC_POLICY_FAILED'
    | 'MUTATION_TRIPWIRE'
    | 'UNKNOWN_TRIPWIRE'
    | 'ROUTE_ENVELOPE_FAILED'
    | 'PRIVACY_POLICY_FAILED'
    | 'SAFETY_VECTOR_NONZERO';
}

export interface CandidateReplayOutcome {
  readonly status: 'FAILURE' | 'PASS' | 'INVALID';
  readonly anomalyFingerprint?: string;
  readonly safety: SafetyVector;
  readonly invalidReason?: CandidateGuardResult['reason'];
  readonly routeClass?: string;
}

export type CandidateReplay = (
  sequence: readonly MinimizationAction[],
  phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE',
) => CandidateReplayOutcome | Promise<CandidateReplayOutcome>;

export interface MinimizationOptions {
  readonly originalSequence: readonly MinimizationAction[];
  readonly anomalyFingerprint: string;
  readonly sourceVersion: string;
  readonly catalogVersion: string;
  readonly approvedActionIds?: ReadonlySet<string>;
  readonly safeActionCatalog?: readonly SafeAction[];
  readonly safety?: MinimizationSafetyContract;
  readonly budget?: MinimizationBudget;
  readonly preconditionCheck?: (sequence: readonly MinimizationAction[]) => CandidateGuardResult;
  readonly replay: CandidateReplay;
}

export interface CandidateEvaluation {
  readonly sequence: readonly string[];
  readonly disposition: 'REPRODUCES' | 'DOES_NOT_REPRODUCE' | 'INVALID' | 'NOT_EVALUATED_BUDGET';
  readonly reason: string;
  readonly fingerprintMatch: boolean;
}

/**
 * Phase 15 truthful-minimality evidence class. Complements status and
 * minimalityGuarantee by recording HOW minimality evidence was obtained:
 * - MINIMALITY_PROVEN: at least one genuine reduced-candidate replay observed
 *   DOES_NOT_REPRODUCE and the bounded audit completed without budget
 *   exhaustion.
 * - MINIMALITY_NOT_PROVEN: reduction ran with genuine replays but ended on
 *   budget exhaustion, so minimality remains unproven.
 * - NO_REDUCIBLE_CANDIDATE: no reduction was possible — the original did not
 *   reproduce fresh, or nothing was left to remove.
 * - REDUCTION_PRECONDITION_UNAVAILABLE: reduction was attempted but every
 *   candidate deletion was rejected before a genuine replay (precondition
 *   divergence, guard failure, or nonzero safety), so no reduced-replay
 *   evidence exists either way.
 */
export type ReductionEvidenceClass =
  | 'MINIMALITY_PROVEN'
  | 'MINIMALITY_NOT_PROVEN'
  | 'NO_REDUCIBLE_CANDIDATE'
  | 'REDUCTION_PRECONDITION_UNAVAILABLE';

export interface MinimizationResult {
  readonly schemaVersion: typeof FAILURE_MINIMIZATION_VERSION;
  readonly status: 'MINIMIZED' | 'UNCHANGED' | 'NO_REPRODUCTION' | 'BOUNDED_BUDGET_EXHAUSTED' | 'INVALID_ORIGINAL';
  readonly originalSequence: readonly string[];
  readonly minimalReproducingSequence: readonly string[];
  readonly removedActions: readonly string[];
  readonly reproductionCount: number;
  readonly anomalyFingerprint: string;
  readonly modelVersion: typeof FAILURE_MINIMIZATION_VERSION;
  readonly catalogVersion: string;
  readonly sourceVersion: string;
  readonly confidence: TriageConfidence;
  readonly minimalityGuarantee: '1-MINIMAL' | 'BOUNDED_MINIMAL' | 'NONE';
  readonly reductionEvidenceClass: ReductionEvidenceClass;
  readonly budget: MinimizationBudget;
  readonly replayCount: number;
  readonly candidateEvaluationCount: number;
  readonly candidateEvaluations: readonly CandidateEvaluation[];
  readonly invalidCandidateCount: number;
  readonly safetyRejectionCount: number;
  readonly freshExactReplay: 'REPRODUCED' | 'NOT_REPRODUCED' | 'INVALID';
}

export interface StableAnomalyFeatures {
  readonly journeyId: string | null;
  readonly envelopeId: string | null;
  readonly oracleId: string;
  readonly routeClass: string | null;
  readonly operationFamily: string | null;
  readonly statusClass: string | null;
  readonly contentTypeClass: string | null;
  readonly runtimeCategory: string | null;
  readonly structuralState: string | null;
  readonly failureActionId: string | null;
  readonly sourceImpactRegion: string | null;
  readonly browserApiResultClass: string | null;
}

export interface AnomalyObservation {
  readonly runId: string;
  readonly observedAt: string;
  readonly fingerprint: string;
  readonly features: StableAnomalyFeatures;
  readonly timingClass?: 'NONE' | 'BOUNDED' | 'TRANSIENT';
  readonly reproduced: boolean;
  readonly minimized: boolean;
  readonly sourceFreshness: SourceFreshness;
  readonly knownFalsePositiveId?: string;
}

export interface SanitizedAnomalyObservation extends AnomalyObservation {
  readonly clusterKey: string;
}

export interface AnomalyCluster {
  readonly clusterId: string;
  readonly clusterKey: string;
  readonly fingerprint: string;
  readonly features: StableAnomalyFeatures;
  readonly occurrenceCount: number;
  readonly reproductionCount: number;
  readonly runIds: readonly string[];
  readonly firstObserved: string;
  readonly lastObserved: string;
  readonly timingVariance: 'NONE' | 'BOUNDED' | 'TRANSIENT';
  readonly primaryRunId: string;
  readonly knownFalsePositiveId?: string;
}

export interface BrowserObservation {
  readonly failed: boolean;
  readonly routeClass: string;
  readonly structuralState: string;
  readonly operationFamily: string;
  readonly statusClass: string;
  readonly contentTypeClass: string;
  readonly oracleFingerprint: string;
  readonly runtimeCategory: string;
}

export interface ApiObservation {
  readonly available: boolean;
  readonly failed: boolean;
  readonly operationFamily: string;
  readonly routeClass?: string;
  readonly structuralState?: string;
  readonly statusClass: string;
  readonly contentTypeClass: string;
  readonly parseCategory: string;
  readonly oracleFingerprint: string;
}

export interface BrowserApiDifferential {
  readonly status: 'UI_FAILURE_API_PASS' | 'BROWSER_API_FAILURE_AGREE' | 'BROWSER_API_DIVERGE' | 'NOT_AVAILABLE';
  readonly appLayerDiscriminator: 'UI_CLIENT_SIDE_STRONGER' | 'API_SERVER_PROTOCOL_STRONGER' | 'INCONCLUSIVE' | 'NOT_AVAILABLE';
  readonly browserOperationFamily: string | null;
  readonly apiOperationFamily: string | null;
  readonly statusClassSame: boolean | null;
  readonly contentTypeClassSame: boolean | null;
  readonly routeClassSame: boolean | null;
  readonly structuralStateSame: boolean | null;
  readonly parseabilitySame: boolean | null;
  readonly rootCauseClaim: 'NONE';
}

export interface SourceChangeCandidate {
  readonly repoId: string;
  readonly path: string;
  readonly edgeId: string | null;
  readonly relevance: SourceChangeRelevance;
  readonly confidence: TriageConfidence;
  readonly sourceFreshness: SourceFreshness;
  readonly reason: string;
  readonly claim: 'SOURCE_CHANGE_CANDIDATE';
}

export interface SourceCorrelationResult {
  readonly sourceVersion: string;
  readonly deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
  readonly candidates: readonly SourceChangeCandidate[];
  readonly overallRelevance: SourceChangeRelevance;
  readonly rootCauseClaim: 'NONE';
}

export interface FaultBoundaryEvidence {
  readonly authInvalid: boolean;
  readonly routeDiverged: boolean;
  readonly structuralDiverged: boolean;
  readonly browserRuntimeFailure: boolean;
  readonly resourceFailure: boolean;
  readonly apiAvailable: boolean;
  readonly apiFailed: boolean;
  readonly apiProtocolMismatch: boolean;
  readonly sourceCandidates: readonly SourceChangeCandidate[];
}

export interface FaultBoundaryResult {
  readonly primaryBoundary: FaultBoundary;
  readonly candidateBoundaries: readonly FaultBoundary[];
  readonly confidence: TriageConfidence;
  readonly reasons: readonly string[];
  readonly rootCauseClaim: 'NONE';
}

export interface ConfidenceInput {
  readonly freshContextReproductions: number;
  readonly minimalSequenceReproductions: number;
  readonly browserApiDifferential: BrowserApiDifferential['status'];
  readonly sourceRelevance: SourceChangeRelevance;
  readonly oracleReliable: boolean;
  readonly knownFalsePositive: boolean;
  readonly safetyClean: boolean;
}

export interface ConfidenceResult {
  readonly level: TriageConfidence;
  readonly reasons: readonly string[];
}

export interface HumanReproductionRecipe {
  readonly steps: readonly string[];
  readonly actionIds: readonly string[];
  readonly observation: string;
  readonly credentialHandling: 'OWNER_AUTHENTICATES_TO_APPROVED_DEV_ACCOUNT';
  readonly prohibitedValues: readonly ['CREDENTIALS', 'CUSTOMER_VALUES', 'COST_VALUES', 'RAW_BODIES', 'COOKIES'];
}

export interface AiReadyEvidencePackage {
  readonly schemaVersion: typeof AI_READY_PACKAGE_VERSION;
  readonly deterministic: true;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly allowedUses: readonly ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'];
  readonly oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY';
  readonly prohibitedUses: readonly ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'];
}

export interface BugDossier {
  readonly schemaVersion: typeof DOSSIER_VERSION;
  readonly status: 'INCOMPLETE' | 'READY';
  readonly candidateId: string;
  readonly title: string;
  readonly firstObserved: string | null;
  readonly lastObserved: string | null;
  readonly journeys: readonly string[];
  readonly seeds: readonly string[];
  readonly minimalSequence: readonly string[];
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly oracleFingerprint: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly l4Datastore: 'OUT_OF_SCOPE_BY_OWNER';
  readonly reproduction: {
    readonly result: 'REPRODUCED' | 'NOT_REPRODUCED' | 'BOUNDED' | 'INCOMPLETE';
    readonly count: number;
    readonly minimalityGuarantee: MinimizationResult['minimalityGuarantee'];
  };
  readonly browserApiDifferential: BrowserApiDifferential;
  readonly sourceChangeCandidates: readonly SourceChangeCandidate[];
  readonly likelyFaultBoundary: FaultBoundaryResult;
  readonly confidence: ConfidenceResult;
  readonly technicalSeverity: TechnicalSeverity;
  readonly triagePriority: TriagePriority;
  readonly knownNightwatchDefect: string | null;
  readonly alternativesRuledOut: readonly string[];
  readonly missingEvidence: readonly string[];
  /** Phase 9 sanitized semantic evidence (null for protocol-only dossiers). */
  readonly semanticEvidence: SemanticDossierEvidence | null;
  readonly humanReproductionRecipe: HumanReproductionRecipe;
  readonly aiReady: AiReadyEvidencePackage;
  readonly safety: {
    readonly productionAttempts: number;
    readonly proxyViolations: number;
    readonly unknownDestinations: number;
    readonly unknownApprovals: number;
    readonly productMutations: number;
    readonly actionCausedUnknown: number;
    readonly databaseQueries: number;
  };
  readonly privacy: {
    readonly result: 'PASS';
    readonly rawBodiesPersisted: false;
    readonly customerValuesPersisted: false;
    readonly credentialsPersisted: false;
    readonly screenshotsPersisted: false;
    readonly authenticatedTracesPersisted: false;
  };
}

export interface OvernightRunRecord {
  readonly runId: string;
  readonly journeyId: string;
  readonly envelopeId: string;
  readonly seed: string;
  readonly result: 'PASS' | 'ANOMALY' | 'NIGHTWATCH_DEFECT' | 'TRANSIENT' | 'INCOMPLETE';
  readonly anomalyClusterId?: string;
  readonly reproduced: boolean;
  readonly safety: BugDossier['safety'];
}

export interface OvernightSummary {
  readonly schemaVersion: typeof OVERNIGHT_SUMMARY_VERSION;
  readonly runsExecuted: number;
  readonly journeys: readonly string[];
  readonly envelopes: readonly string[];
  readonly seeds: readonly string[];
  readonly passes: number;
  readonly uniqueAnomalyClusters: number;
  readonly reproducedAnomalies: number;
  readonly nonReproducedTransients: number;
  readonly nightwatchDefects: number;
  readonly topDossierIds: readonly string[];
  readonly coverageGaps: readonly string[];
  readonly safetyCounters: BugDossier['safety'];
  readonly privacyResult: 'PASS';
  readonly datastoreStatus: 'OUT_OF_SCOPE_BY_OWNER';
}

export interface MorningBrief {
  readonly schemaVersion: typeof MORNING_BRIEF_VERSION;
  readonly headline: string;
  readonly topDossiers: readonly Readonly<Record<string, unknown>>[];
  readonly likelySourceAreas: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly privacyResult: 'PASS';
  readonly externalPublication: 'PROHIBITED';
}
