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
}

export type ReplayComparisonCategory =
  | 'MATCH'
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
}
