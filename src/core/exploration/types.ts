// ---------------------------------------------------------------------------
// Nightwatch Phase 4 — bounded, source-approved exploration model.
//
// This module is deliberately data-shaped. The explorer never receives a
// selector callback, arbitrary script, free-form input, or an LLM decision.
// ---------------------------------------------------------------------------

export const SAFE_ACTION_CATALOG_VERSION = 'nightwatch.safe-actions.phase4.v1' as const;
export const EXPLORATION_STATE_SCHEMA_VERSION = 'nightwatch.exploration-state.phase4.v1' as const;
export const EXPLORATION_TRANSITION_SCHEMA_VERSION = 'nightwatch.exploration-transition.phase4.v1' as const;
export const EXPLORATION_MODEL_VERSION = 'nightwatch.exploration-model.phase4.v1' as const;
export const EXPLORATION_EVIDENCE_SCHEMA_VERSION = 'nightwatch.exploration.phase4.v1' as const;
export const PLANNER_VERSION = 'seeded-frontier-walk.phase4.v1' as const;
export const RNG_ALGORITHM = 'SplitMix64' as const;
export const RNG_VERSION = 'v1' as const;
export const BUDGET_POLICY_VERSION = 'phase4-bounded-budget.v1' as const;

export type SemanticClass = 'KNOWN_READ' | 'LOCAL_ONLY';
export type ActionKind =
  | 'NAVIGATE_APPROVED_ROUTE'
  | 'CLICK_APPROVED_READ_CONTROL'
  | 'SELECT_APPROVED_READ_OPTION'
  | 'TOGGLE_LOCAL_VIEW'
  | 'OPEN_READ_ONLY_DETAIL'
  | 'CLOSE_READ_ONLY_DETAIL'
  | 'ADVANCE_READ_ONLY_PAGE'
  | 'CHANGE_READ_QUERY_FILTER'
  | 'RETURN_TO_ANCHOR';

export type AnchorJourney =
  | 'ripple-payer-exchange-read'
  | 'ripple-common-exchange-read'
  | 'ripple-account-inventory';

export type SafeScalar = string | number | boolean;
export type SafeScalarMap = Readonly<Record<string, SafeScalar>>;

export interface SourceProvenance {
  readonly repository: string;
  readonly file: string;
  readonly symbol: string;
  readonly sourceSha: string;
  readonly trackingRef: string;
  readonly freshness: 'LOCAL_TRACKING_REF_ONLY' | 'CURRENT_DEPLOYMENT_VERIFIED';
}

export type LocatorSpec =
  | {
      readonly kind: 'selector-option';
      readonly surfaceSelector: string;
      readonly labelTexts: readonly string[];
      readonly value: string;
      readonly optionLabels: readonly string[];
    }
  | {
      readonly kind: 'vendor-tab';
      readonly surfaceSelector: string;
      readonly value: string;
      readonly optionLabels: readonly string[];
    }
  | {
      readonly kind: 'column-header';
      readonly surfaceSelector: string;
      readonly columnLabels: readonly string[];
      readonly columnKey: string;
    }
  | {
      readonly kind: 'approved-route';
      readonly routeClass: string;
    };

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface ActionPreconditions {
  readonly routeClasses: readonly string[];
  readonly requiredStructuralFlags?: Readonly<Record<string, boolean>>;
  readonly requiredSafeViewState?: SafeScalarMap;
  readonly forbiddenSafeViewState?: SafeScalarMap;
}

export interface SafeAction {
  readonly actionId: string;
  readonly product: 'ripple';
  readonly anchorJourney: AnchorJourney;
  readonly surface: string;
  readonly control: string;
  readonly sourceProvenance: readonly SourceProvenance[];
  readonly actionKind: ActionKind;
  readonly preconditions: ActionPreconditions;
  readonly locator: LocatorSpec;
  readonly semanticClass: SemanticClass;
  readonly expectedRouteClass: string;
  readonly expectedStructuralDelta: SafeScalarMap;
  readonly expectedReadFamilies: readonly string[];
  readonly forbiddenRequestFamilies: readonly string[];
  readonly persistedPreferenceEffect: 'NONE' | 'LOCAL_BROWSER_ONLY' | 'SERVER_STATE';
  readonly analyticsEffect: 'NONE' | 'EXISTING_BLOCKED_OPTIONAL';
  readonly routeEffect: 'UNCHANGED' | 'APPROVED_ROUTE';
  readonly privacyPolicy: 'METADATA_ONLY_NO_CUSTOMER_VALUES';
  readonly replayPolicy: 'STRICT_ACTION_ID_AND_PRECONDITION';
  readonly status: 'APPROVED' | 'STALE' | 'REVIEW_REQUIRED';
}

export interface ExplorationStateInput {
  readonly product: 'ripple';
  readonly surface: string;
  readonly routeClass: string;
  readonly structuralFlags: Readonly<Record<string, boolean>>;
  readonly safeViewState: SafeScalarMap;
  readonly availableActionIds: readonly string[];
  readonly semanticReadFamilies: readonly string[];
  readonly authStateClass: 'AUTHENTICATED_DEV' | 'AUTH_INVALID' | 'UNKNOWN';
  readonly terminalFlags: Readonly<Record<string, boolean>>;
}

export interface ExplorationState extends ExplorationStateInput {
  readonly schemaVersion: typeof EXPLORATION_STATE_SCHEMA_VERSION;
  readonly stateId: string;
}

export type ExplorationTerminationReason =
  | 'BUDGET_EXHAUSTED'
  | 'SAFE_FRONTIER_EXHAUSTED'
  | 'MODEL_TERMINAL_STATE'
  | 'AUTH_INVALID'
  | 'SAFETY_BLOCK'
  | 'ACTION_CAUSED_UNKNOWN'
  | 'KNOWN_MUTATION_DETECTED'
  | 'NEW_HOST_BLOCKED'
  | 'UNEXPECTED_ROUTE_ESCAPE'
  | 'FATAL_ORACLE'
  | 'RUNTIME_FAILURE'
  | 'REPLAY_DIVERGENCE'
  | 'RUN_INCOMPLETE';

export interface SafetyVector {
  readonly productionAttempts: number;
  readonly proxyViolations: number;
  readonly unknownDestinations: number;
  readonly unknownApprovals: number;
  readonly knownMutations: number;
  readonly actionCausedUnknown: number;
  readonly dbQueries: number;
}

export interface RuntimeNetworkObservation {
  readonly family: string;
  readonly classification: 'KNOWN_READ' | 'KNOWN_MUTATION' | 'UNKNOWN';
  readonly disposition: 'KNOWN_READ' | 'KNOWN_MUTATION' | 'PASSIVE_UNKNOWN_OBSERVED' | 'ACTION_CAUSED_UNKNOWN';
  readonly hostClass: 'TARGET' | 'OPTIONAL_BLOCKED' | 'BROWSER_BACKGROUND' | 'UNKNOWN' | 'PRODUCTION';
}

export interface ActionExecutionResult {
  readonly status: 'COMPLETED' | 'FAILED' | 'ACTION_NOT_AVAILABLE_AT_RUNTIME';
  readonly nextState: ExplorationStateInput;
  readonly routeDelta: SafeScalarMap;
  readonly structuralDelta: SafeScalarMap;
  readonly semanticRequestDelta: readonly RuntimeNetworkObservation[];
  readonly oracleResults: readonly string[];
  readonly safety: SafetyVector;
  readonly durationClass: 'SHORT' | 'MEDIUM' | 'LONG' | 'UNKNOWN';
  readonly failureReason?: string;
}

export interface ExplorationRuntime {
  readonly currentState: () => Promise<ExplorationStateInput> | ExplorationStateInput;
  readonly actionAvailable: (action: SafeAction) => Promise<boolean> | boolean;
  readonly execute: (action: SafeAction) => Promise<ActionExecutionResult>;
}

export interface ExplorationEnvelope {
  readonly envelopeId: string;
  readonly anchorJourney: AnchorJourney;
  readonly allowedRoutes: readonly string[];
  readonly allowedActionIds: readonly string[];
  readonly expectedReadFamilies: readonly string[];
  readonly forbiddenRequestFamilies: readonly string[];
  readonly maxActionsPerSequence: number;
  readonly maxDepth: number;
  readonly maxStates: number;
  readonly maxTransitions: number;
  readonly maxStateVisits: number;
  readonly maxTransitionVisits: number;
  readonly maxImmediateBacktracks: number;
  readonly maxRouteChanges: number;
}

export interface ExplorationBudget {
  readonly policyVersion: typeof BUDGET_POLICY_VERSION;
  readonly maxActionsPerSequence: number;
  readonly maxDepth: number;
  readonly maxStates: number;
  readonly maxTransitions: number;
  readonly maxRouteChanges: number;
  readonly maxRuntimeMs: number;
  readonly maxRealContexts: number;
  readonly maxSeeds: number;
}

export interface PlannerExclusion {
  readonly actionId: string;
  readonly reason:
    | 'PRECONDITION_FALSE'
    | 'ACTION_ALREADY_EXHAUSTED'
    | 'MAX_VISITS_REACHED'
    | 'ROUTE_NOT_APPROVED'
    | 'RUNTIME_CONTROL_ABSENT'
    | 'SEMANTIC_POLICY_BLOCK'
    | 'NEW_HOST_BLOCK'
    | 'UNKNOWN_ACTION_EFFECT'
    | 'STALE_SOURCE'
    | 'BUDGET_LIMIT';
}

export interface PlannerDecision {
  readonly index: number;
  readonly stateId: string;
  readonly eligibleActions: readonly string[];
  readonly excludedActions: readonly PlannerExclusion[];
  readonly rngDrawIndex: number;
  readonly rngDraw: string;
  readonly chosenAction: string | null;
  readonly budgetRemaining: number;
}

export interface ExplorationTransition {
  readonly schemaVersion: typeof EXPLORATION_TRANSITION_SCHEMA_VERSION;
  readonly transitionId: string;
  readonly fromStateId: string;
  readonly actionId: string;
  readonly seedDecisionIndex: number;
  readonly toStateId: string;
  readonly actionOutcome: ActionExecutionResult['status'];
  readonly routeDelta: SafeScalarMap;
  readonly structuralDelta: SafeScalarMap;
  readonly semanticRequestDelta: readonly RuntimeNetworkObservation[];
  readonly oracleResults: readonly string[];
  readonly safetyResult: SafetyVector;
  readonly durationClass: ActionExecutionResult['durationClass'];
  readonly verification: 'SOURCE_ALLOWED' | 'RUNTIME_OBSERVED' | 'BLOCKED' | 'INVALIDATED';
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface CoverageSummary {
  readonly approvedActions: number;
  readonly actionsEncountered: number;
  readonly actionsExecuted: number;
  readonly actionsUnavailable: number;
  readonly statesDiscovered: number;
  readonly statesRevisited: number;
  readonly transitionsAttempted: number;
  readonly transitionsCompleted: number;
  readonly transitionsReproduced: number;
  readonly routeClassesVisited: number;
  readonly semanticReadFamiliesExercised: number;
  readonly oracleCategoriesObserved: number;
  readonly newStates: number;
  readonly newTransitions: number;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface ExplorationFingerprints {
  readonly catalogFingerprint: string;
  readonly modelFingerprint: string;
  readonly stateSchemaVersion: typeof EXPLORATION_STATE_SCHEMA_VERSION;
  readonly plannerVersion: typeof PLANNER_VERSION;
  readonly rngAlgorithm: typeof RNG_ALGORITHM;
  readonly rngVersion: typeof RNG_VERSION;
  readonly budgetPolicyVersion: typeof BUDGET_POLICY_VERSION;
}

export interface ExplorationEvidence {
  readonly schemaVersion: typeof EXPLORATION_EVIDENCE_SCHEMA_VERSION;
  readonly runId: string;
  readonly seed: string;
  readonly derivedSeed: string;
  readonly envelopeId: string;
  readonly fingerprints: ExplorationFingerprints;
  readonly initialStateId: string;
  readonly plannedActions: readonly string[];
  readonly observedActions: readonly string[];
  readonly decisions: readonly PlannerDecision[];
  readonly states: readonly ExplorationState[];
  readonly transitions: readonly ExplorationTransition[];
  readonly coverage: CoverageSummary;
  readonly novelty: Readonly<Record<string, number>>;
  readonly oracleResults: readonly string[];
  readonly anomalyFingerprints: readonly string[];
  readonly safety: SafetyVector;
  readonly privacy: {
    readonly metadataFirst: true;
    readonly customerValuesPersisted: false;
    readonly bodiesPersisted: false;
    readonly domPersisted: false;
    readonly screenshotsPersisted: false;
    readonly tracesPersisted: false;
  };
  readonly terminationReason: ExplorationTerminationReason;
}

export interface ExactReplayResult {
  readonly status: 'STRICT_MATCH' | 'REPLAY_PRECONDITION_DIVERGENCE' | 'INVARIANT_DIVERGENCE' | 'SAFETY_BLOCK';
  readonly observedActions: readonly string[];
  readonly stateIds: readonly string[];
  readonly transitionIds: readonly string[];
  readonly firstDivergentIndex: number | null;
  readonly terminationReason: ExplorationTerminationReason | null;
}
