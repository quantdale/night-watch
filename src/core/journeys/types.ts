// ---------------------------------------------------------------------------
// Generic declarative journey contracts.
//
// Product contracts provide source evidence and fixed selectors; the executor
// consumes these shapes without knowing Ripple page names or customer data.
// ---------------------------------------------------------------------------

import type { EndpointSemanticClassification } from '../safety/endpointSemantics';
import type { RunRecorder } from '../evidence/runRecorder';
import type { NetworkObserver } from '../../browser/observers/networkObserver';
import type { RunMonitor } from '../../state/run';

export type JourneyActionType =
  | 'NAVIGATE_APPROVED_ROUTE'
  | 'CLICK_READ_ONLY_CONTROL'
  | 'SELECT_LOCAL_VIEW'
  | 'SELECT_READ_QUERY_FILTER'
  | 'OPEN_READ_ONLY_DETAIL'
  | 'WAIT_STRUCTURAL_CHECKPOINT';

export interface JourneyStructuralMarker {
  id: string;
  selector: string;
  minimumCount: number;
  sourceProof: string;
}

export interface JourneyNetworkExpectation {
  scope: 'journey' | 'step';
  requiredRuleIds: readonly string[];
  allowedClassifications: readonly EndpointSemanticClassification[];
  minimumRequiredMatches: number;
}

export interface JourneyStep {
  stepId: string;
  purpose: string;
  actionType: JourneyActionType;
  sourceProof: string;
  semanticClassification: 'KNOWN_READ' | 'LOCAL_ONLY';
  allowedRoute: readonly string[];
  expectedRouteResult: readonly string[];
  expectedStructuralResult: JourneyStructuralMarker;
  expectedNetworkResult: JourneyNetworkExpectation;
  timeoutMs: number;
  privacyConstraint: string;
  failureClassification: string;
  /** Fixed source-backed selector for constrained interaction steps. */
  selector?: string;
  /** Fixed option value for SELECT_READ_QUERY_FILTER only. */
  value?: string;
  /** Route path is used only by NAVIGATE_APPROVED_ROUTE. */
  routePath?: string;
}

export interface JourneyDefinition<JourneyId extends string = string> {
  journeyId: JourneyId;
  name: string;
  customerPurpose: string;
  sourceSha: string;
  startRoute: string;
  expectedEndRouteOrRouteClass: readonly string[];
  globalShellRequirement: JourneyStructuralMarker;
  journeySpecificStructuralMarkers: readonly JourneyStructuralMarker[];
  allowedSteps: readonly JourneyStep[];
  prohibitedSteps: readonly string[];
  knownReadEndpoints: readonly string[];
  knownMutationEndpoints: readonly string[];
  unknownEndpoints: readonly string[];
  expectedPassiveInitializationRequests: readonly string[];
  expectedBlockedDestinations: readonly string[];
  stepTimeouts: Readonly<Record<string, number>>;
  stabilityRequirement: { routeStableMs: number; shellSelector: string };
  genericOracles: readonly string[];
  journeyOracles: readonly string[];
  privacyContract: readonly string[];
  replayContract: readonly string[];
  strictInvariants: readonly string[];
  boundedVariance: readonly string[];
  stopConditions: readonly string[];
  sourceEvidence: readonly string[];
  /** Optional explicit version for persisted/replayed contract evidence. */
  contractVersion?: string;
}

export interface JourneyContext {
  recorder: RunRecorder;
  monitor: RunMonitor;
  network: NetworkObserver;
}

export type JourneyStepStatus = 'PASS' | 'FAIL' | 'STOPPED';

export interface JourneyStepResult {
  stepId: string;
  actionType: JourneyActionType;
  status: JourneyStepStatus;
  routeClass: string;
  structuralMarkerId: string;
  structuralPresent: boolean;
  requiredReadRuleIds: readonly string[];
  elapsedMs: number;
  routeStabilityMs?: number;
  failureClassification?: string;
}

export interface JourneyEvidence {
  journeyId: string;
  contractSourceSha: string;
  passed: boolean;
  finalRouteClass: string;
  globalShellReady: boolean;
  journeyMarkers: Readonly<Record<string, boolean>>;
  stepResults: readonly JourneyStepResult[];
  semanticRuleIds: readonly string[];
  semanticClasses: readonly EndpointSemanticClassification[];
  passiveUnknownCount: number;
  actionUnknownCount: number;
  mutationCount: number;
  routeStabilityMs: number;
  authValid: boolean;
  oracleStatus: 'PASS' | 'FAIL';
  privacyStatus: 'PASS' | 'FAIL';
  safetyStatus: 'PASS' | 'FAIL';
  /** Added in the Phase 2C evidence model; absent on legacy Phase 2A/2B files. */
  evidenceSchemaVersion?: string;
  contractVersion?: string;
  contractDigest?: string;
  oracleVersion?: string;
  semanticRequests?: readonly JourneySemanticRequest[];
  safetyCounts?: JourneySafetyCounts;
  boundedVariance?: JourneyVarianceEvidence;
  oracleObservations?: readonly JourneyOracleObservation[];
  anomalyFingerprints?: readonly string[];
  failureAttribution?: JourneyFailureAttribution;
  resourceObservations?: readonly JourneyResourceObservation[];
  containmentCounts?: JourneyContainmentCounts;
}

export interface JourneySemanticRequest {
  ruleId: string;
  classification: EndpointSemanticClassification;
  disposition: SemanticRequestDisposition;
  method: string;
  stepId: string | null;
  actionType: string | null;
  /** Count is optional for legacy observations and populated in Phase 2C summaries. */
  count?: number;
}

export type SemanticRequestDisposition =
  | 'KNOWN_READ'
  | 'KNOWN_MUTATION'
  | 'PASSIVE_UNKNOWN_OBSERVED'
  | 'ACTION_CAUSED_UNKNOWN';

export interface JourneySafetyCounts {
  productionAttempts: number;
  proxyViolations: number;
  unknownDestinations: number;
  unknownApprovals: number;
  mutations: number;
  dbQueries: number;
  actionCausedUnknown: number;
}

export interface JourneyResourceObservation {
  role: string;
  state: string;
  method: string;
  stepId: string | null;
  statusClass: string | null;
  contentTypeClass: string | null;
}

export interface JourneyContainmentCounts {
  optionalSupportBlocked: number;
  telemetryBlocked: number;
  browserBackgroundBlocked: number;
  containmentEvents: readonly string[];
}

export interface JourneyVarianceEvidence {
  routeStabilityDeltaMs?: number;
  passiveUnknownDelta?: number;
  requestCount?: number;
  requestCountDelta?: number;
  optionalSupportBlockedDelta?: number;
  telemetryBlockedDelta?: number;
  browserBackgroundBlockedDelta?: number;
  nonCriticalResourceFailureDelta?: number;
  cleanupIncompleteDelta?: number;
  networkConcurrencyDelta?: number;
}

export type JourneyOracleSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
export type JourneyAnomalyClass =
  | 'NIGHTWATCH_DEFECT'
  | 'PRODUCT_BEHAVIOR_ANOMALY'
  | 'DEV_INFRA_TRANSIENT'
  | 'BROWSER_BACKGROUND'
  | 'EXPECTED_CONTAINMENT'
  | 'AUTH_STATE_INVALID'
  | 'SOURCE_CONTRACT_STALE'
  | 'KNOWN_TRANSIENT'
  | 'UNKNOWN';

export type JourneyCausality = 'PROVEN' | 'LIKELY' | 'UNRESOLVED' | 'NOT_CAUSAL';

export interface JourneyOracleObservation {
  oracleId: string;
  triggered: boolean;
  severity: JourneyOracleSeverity;
  anomalyClass: JourneyAnomalyClass;
  causalToPrimaryFailure: JourneyCausality;
  fingerprint?: string;
}

export interface JourneyFailureAttribution {
  primaryFailure: string | null;
  secondaryOracles: readonly string[];
  safetyFailure: string | null;
  containmentEvents: readonly string[];
  likelyCause: JourneyAnomalyClass | 'NONE' | 'UNRESOLVED';
  causalityConfidence: JourneyCausality;
  lastSuccessfulStep: string | null;
  firstFailingStep: string | null;
}

export type ReplayComparisonCategory =
  | 'MATCH'
  | 'STRICT_MATCH'
  | 'BOUNDED_MATCH'
  | 'EXPECTED_VARIANCE'
  | 'EXPECTED_TIMING_VARIANCE'
  | 'EXPECTED_REQUEST_COUNT_VARIANCE'
  | 'EXPECTED_BACKGROUND_VARIANCE'
  | 'STRUCTURAL_DIVERGENCE'
  | 'ROUTE_DIVERGENCE'
  | 'SEMANTIC_REQUEST_DIVERGENCE'
  | 'ORACLE_DIVERGENCE'
  | 'SAFETY_DIVERGENCE'
  | 'AUTH_DIVERGENCE';

export interface ReplayComparison {
  passed: boolean;
  categories: readonly ReplayComparisonCategory[];
  strictInvariantMismatches: readonly string[];
  boundedVariance: readonly string[];
  differential?: ReplayDifferentialEvidence;
}

export interface ReplayDifferentialEvidence {
  routeClassSame: boolean;
  structuralMarkersSame: boolean;
  semanticReadFamiliesSame: boolean;
  semanticStrictLedgerSame: boolean;
  timingDeltaMs: number | null;
  requestCountDelta: number | null;
  passiveUnknownDelta: number | null;
  oracleIdsOnlyInFirst: readonly string[];
  oracleIdsOnlyInReplay: readonly string[];
  authEquivalent: boolean;
  safetyEquivalent: boolean;
}
