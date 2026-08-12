import { createTransition, createExplorationState, catalogFingerprint, modelFingerprint } from './state';
import { SeededFrontierPlanner } from './planner';
import type {
  ActionExecutionResult,
  ExactReplayResult,
  ExplorationBudget,
  ExplorationEnvelope,
  ExplorationEvidence,
  ExplorationRuntime,
  ExplorationState,
  ExplorationStateInput,
  ExplorationTerminationReason,
  SafeAction,
  SafetyVector,
} from './types';
import {
  BUDGET_POLICY_VERSION,
  EXPLORATION_EVIDENCE_SCHEMA_VERSION,
  EXPLORATION_STATE_SCHEMA_VERSION,
  PLANNER_VERSION,
  RNG_ALGORITHM,
  RNG_VERSION,
} from './types';

const ZERO_SAFETY: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

function addSafety(a: SafetyVector, b: SafetyVector): SafetyVector {
  return {
    productionAttempts: a.productionAttempts + b.productionAttempts,
    proxyViolations: a.proxyViolations + b.proxyViolations,
    unknownDestinations: a.unknownDestinations + b.unknownDestinations,
    unknownApprovals: a.unknownApprovals + b.unknownApprovals,
    knownMutations: a.knownMutations + b.knownMutations,
    actionCausedUnknown: a.actionCausedUnknown + b.actionCausedUnknown,
    dbQueries: a.dbQueries + b.dbQueries,
  };
}

function safetyFromResult(result: ActionExecutionResult): SafetyVector {
  let safety = result.safety;
  for (const request of result.semanticRequestDelta) {
    if (request.disposition === 'KNOWN_MUTATION' || request.classification === 'KNOWN_MUTATION') {
      safety = addSafety(safety, { ...ZERO_SAFETY, knownMutations: 1 });
    }
    if (request.disposition === 'ACTION_CAUSED_UNKNOWN') {
      safety = addSafety(safety, { ...ZERO_SAFETY, actionCausedUnknown: 1 });
    }
    if (request.hostClass === 'PRODUCTION') {
      safety = addSafety(safety, { ...ZERO_SAFETY, productionAttempts: 1 });
    }
    if (request.hostClass === 'UNKNOWN') {
      safety = addSafety(safety, { ...ZERO_SAFETY, unknownDestinations: 1 });
    }
  }
  return safety;
}

function combineInputWithAvailability(input: ExplorationStateInput, availableActionIds: readonly string[]): ExplorationStateInput {
  return { ...input, availableActionIds: [...new Set(availableActionIds)].sort() };
}

async function observeState(runtime: ExplorationRuntime, actions: readonly SafeAction[], envelope: ExplorationEnvelope): Promise<ExplorationState> {
  const input = await runtime.currentState();
  const candidates = actions.filter((action) => envelope.allowedActionIds.includes(action.actionId) && action.status === 'APPROVED');
  const available: string[] = [];
  for (const action of candidates) {
    if (await runtime.actionAvailable(action)) available.push(action.actionId);
  }
  return createExplorationState(combineInputWithAvailability(input, available));
}

function routeAllowed(state: ExplorationState, envelope: ExplorationEnvelope): boolean {
  return envelope.allowedRoutes.includes(state.routeClass);
}

function hasTerminalState(state: ExplorationState): boolean {
  return Object.values(state.terminalFlags).some(Boolean);
}

function replayPreconditionHolds(state: ExplorationState, action: SafeAction): boolean {
  const requiredFlags = action.preconditions.requiredStructuralFlags ?? {};
  const requiredView = action.preconditions.requiredSafeViewState ?? {};
  const forbiddenView = action.preconditions.forbiddenSafeViewState ?? {};
  return Object.entries(requiredFlags).every(([key, value]) => state.structuralFlags[key] === value) &&
    Object.entries(requiredView).every(([key, value]) => state.safeViewState[key] === value) &&
    Object.entries(forbiddenView).every(([key, value]) => state.safeViewState[key] !== value);
}

function terminationForSafety(safety: SafetyVector, semanticUnknown: boolean, routeEscape: boolean): ExplorationTerminationReason | null {
  if (safety.productionAttempts > 0 || safety.proxyViolations > 0 || safety.unknownApprovals > 0 || safety.dbQueries > 0) return 'SAFETY_BLOCK';
  if (safety.knownMutations > 0) return 'KNOWN_MUTATION_DETECTED';
  if (safety.unknownDestinations > 0) return 'NEW_HOST_BLOCKED';
  if (semanticUnknown || safety.actionCausedUnknown > 0) return 'ACTION_CAUSED_UNKNOWN';
  if (routeEscape) return 'UNEXPECTED_ROUTE_ESCAPE';
  return null;
}

function isFatalOracle(oracles: readonly string[]): boolean {
  return oracles.some((oracle) => oracle.startsWith('FATAL:'));
}

function createCoverage(args: {
  approvedActions: number;
  decisions: number;
  encountered: Set<string>;
  executed: Set<string>;
  unavailable: number;
  states: Map<string, number>;
  transitionsAttempted: number;
  transitionsCompleted: number;
  transitionsReproduced: number;
  routes: Set<string>;
  families: Set<string>;
  oracles: Set<string>;
  newStates: number;
  newTransitions: number;
}) {
  return {
    approvedActions: args.approvedActions,
    actionsEncountered: args.encountered.size,
    actionsExecuted: args.executed.size,
    actionsUnavailable: args.unavailable,
    statesDiscovered: args.states.size,
    statesRevisited: [...args.states.values()].filter((count) => count > 1).length,
    transitionsAttempted: args.transitionsAttempted,
    transitionsCompleted: args.transitionsCompleted,
    transitionsReproduced: args.transitionsReproduced,
    routeClassesVisited: args.routes.size,
    semanticReadFamiliesExercised: args.families.size,
    oracleCategoriesObserved: args.oracles.size,
    newStates: args.newStates,
    newTransitions: args.newTransitions,
  } as const;
}

export interface ExplorationRunOptions {
  readonly runId: string;
  readonly seed: string;
  readonly derivedSeed?: string;
  readonly catalog: readonly SafeAction[];
  readonly envelope: ExplorationEnvelope;
  readonly budget: ExplorationBudget;
  readonly runtime: ExplorationRuntime;
  readonly now?: () => number;
}

export async function runExploration(opts: ExplorationRunOptions): Promise<ExplorationEvidence> {
  const now = opts.now ?? Date.now;
  const started = now();
  const approved = opts.catalog.filter((action) => opts.envelope.allowedActionIds.includes(action.actionId) && action.status === 'APPROVED');
  const planner = new SeededFrontierPlanner(opts.seed);
  const fingerprints = {
    catalogFingerprint: catalogFingerprint(opts.catalog),
    modelFingerprint: modelFingerprint(opts.envelope, opts.budget),
    stateSchemaVersion: EXPLORATION_STATE_SCHEMA_VERSION,
    plannerVersion: PLANNER_VERSION,
    rngAlgorithm: RNG_ALGORITHM,
    rngVersion: RNG_VERSION,
    budgetPolicyVersion: BUDGET_POLICY_VERSION,
  } as const;
  let state = await observeState(opts.runtime, opts.catalog, opts.envelope);
  const initialStateId = state.stateId;
  const states = new Map<string, ExplorationState>([[state.stateId, state]]);
  const stateVisits = new Map<string, number>([[state.stateId, 1]]);
  const transitions = [] as ReturnType<typeof createTransition>[];
  const transitionIds = new Set<string>();
  const decisions = [] as ReturnType<SeededFrontierPlanner['select']>['decision'][];
  const plannedActions: string[] = [];
  const observedActions: string[] = [];
  const encountered = new Set<string>();
  const executed = new Set<string>();
  const routes = new Set<string>([state.routeClass]);
  const families = new Set<string>(state.semanticReadFamilies);
  const oracles = new Set<string>();
  const anomalyFingerprints = new Set<string>();
  const novelty: Record<string, number> = { states: 0, transitions: 0, routes: 0, semanticFamilies: 0, structuralCombinations: 0 };
  let safety = ZERO_SAFETY;
  let unavailable = 0;
  let transitionsAttempted = 0;
  let transitionsCompleted = 0;
  let newStates = 0;
  let newTransitions = 0;
  let terminationReason: ExplorationTerminationReason = 'SAFE_FRONTIER_EXHAUSTED';

  if (state.authStateClass !== 'AUTHENTICATED_DEV') terminationReason = 'AUTH_INVALID';
  else if (!routeAllowed(state, opts.envelope)) terminationReason = 'UNEXPECTED_ROUTE_ESCAPE';
  else if (hasTerminalState(state)) terminationReason = 'MODEL_TERMINAL_STATE';

  while (terminationReason === 'SAFE_FRONTIER_EXHAUSTED') {
    if (now() - started >= Math.min(opts.budget.maxRuntimeMs, 120_000)) {
      terminationReason = 'BUDGET_EXHAUSTED';
      break;
    }
    if (plannedActions.length >= Math.min(opts.budget.maxActionsPerSequence, opts.envelope.maxActionsPerSequence) ||
      plannedActions.length >= Math.min(opts.budget.maxDepth, opts.envelope.maxDepth) ||
      states.size >= opts.budget.maxStates || transitionsAttempted >= Math.min(opts.budget.maxTransitions, opts.envelope.maxTransitions)) {
      terminationReason = 'BUDGET_EXHAUSTED';
      break;
    }
    planner.noteState(state.stateId);
    if (stateVisits.get(state.stateId) === undefined) stateVisits.set(state.stateId, 1);
    const selected = planner.select(state, opts.catalog, opts.envelope, opts.budget, plannedActions.length);
    decisions.push(selected.decision);
    selected.decision.eligibleActions.forEach((id) => encountered.add(id));
    if (selected.action === null) {
      terminationReason = 'SAFE_FRONTIER_EXHAUSTED';
      break;
    }
    const action = selected.action;
    plannedActions.push(action.actionId);
    planner.noteAttempt(state.stateId, action.actionId);
    transitionsAttempted += 1;
    const result = await opts.runtime.execute(action);
    observedActions.push(action.actionId);
    if (result.status === 'ACTION_NOT_AVAILABLE_AT_RUNTIME') {
      unavailable += 1;
      terminationReason = 'RUNTIME_FAILURE';
      break;
    }
    const resultSafety = safetyFromResult(result);
    safety = addSafety(safety, resultSafety);
    for (const oracle of result.oracleResults) {
      oracles.add(oracle);
      if (oracle.startsWith('FINGERPRINT:')) anomalyFingerprints.add(oracle.slice('FINGERPRINT:'.length));
    }
    const semanticUnknown = result.semanticRequestDelta.some((request) => request.disposition === 'ACTION_CAUSED_UNKNOWN');
    const routeEscape = !opts.envelope.allowedRoutes.includes(result.nextState.routeClass);
    const safetyTermination = terminationForSafety(resultSafety, semanticUnknown, routeEscape);
    if (safetyTermination !== null) {
      terminationReason = safetyTermination;
      const blockedState = createExplorationState(result.nextState);
      states.set(blockedState.stateId, blockedState);
      const transition = createTransition({
        fromStateId: state.stateId,
        actionId: action.actionId,
        seedDecisionIndex: selected.decision.index,
        toStateId: blockedState.stateId,
        actionOutcome: result.status,
        routeDelta: result.routeDelta,
        structuralDelta: result.structuralDelta,
        semanticRequestDelta: result.semanticRequestDelta,
        oracleResults: result.oracleResults,
        safetyResult: resultSafety,
        durationClass: result.durationClass,
        verification: 'INVALIDATED',
      });
      transitions.push(transition);
      transitionIds.add(transition.transitionId);
      break;
    }
    if (result.status === 'FAILED') {
      terminationReason = isFatalOracle(result.oracleResults) ? 'FATAL_ORACLE' : 'RUNTIME_FAILURE';
      break;
    }
    const fromStateId = state.stateId;
    const nextState = createExplorationState(result.nextState);
    const wasKnownState = states.has(nextState.stateId);
    states.set(nextState.stateId, nextState);
    state = nextState;
    stateVisits.set(state.stateId, (stateVisits.get(state.stateId) ?? 0) + 1);
    executed.add(action.actionId);
    transitionsCompleted += 1;
    const wasKnownRoute = routes.has(state.routeClass);
    routes.add(state.routeClass);
    for (const family of state.semanticReadFamilies) families.add(family);
    const transition = createTransition({
      fromStateId,
      actionId: action.actionId,
      seedDecisionIndex: selected.decision.index,
      toStateId: state.stateId,
      actionOutcome: result.status,
      routeDelta: result.routeDelta,
      structuralDelta: result.structuralDelta,
      semanticRequestDelta: result.semanticRequestDelta,
      oracleResults: result.oracleResults,
      safetyResult: resultSafety,
      durationClass: result.durationClass,
      verification: 'RUNTIME_OBSERVED',
    });
    // Transition identity contains only the logical source/action/destination;
    // run IDs and timestamps never enter it.
    transitions.push(transition);
    if (!transitionIds.has(transition.transitionId)) {
      transitionIds.add(transition.transitionId);
      newTransitions += 1;
      novelty.transitions = (novelty.transitions ?? 0) + 1;
    }
    if (!wasKnownState) {
      newStates += 1;
      novelty.states = (novelty.states ?? 0) + 1;
    }
    if (!wasKnownRoute) novelty.routes = (novelty.routes ?? 0) + 1;
    for (const family of result.semanticRequestDelta.filter((request) => request.classification === 'KNOWN_READ').map((request) => request.family)) {
      if (!families.has(family)) novelty.semanticFamilies = (novelty.semanticFamilies ?? 0) + 1;
      families.add(family);
    }
    if (hasTerminalState(state)) {
      terminationReason = 'MODEL_TERMINAL_STATE';
      break;
    }
  }

  const coverage = createCoverage({
    approvedActions: approved.length,
    decisions: decisions.length,
    encountered,
    executed,
    unavailable: unavailable + decisions.reduce((count, decision) => count + decision.excludedActions.filter((item) => item.reason === 'RUNTIME_CONTROL_ABSENT').length, 0),
    states: stateVisits,
    transitionsAttempted,
    transitionsCompleted,
    transitionsReproduced: 0,
    routes,
    families,
    oracles,
    newStates,
    newTransitions,
  });
  return {
    schemaVersion: EXPLORATION_EVIDENCE_SCHEMA_VERSION,
    runId: opts.runId,
    seed: opts.seed,
    derivedSeed: opts.derivedSeed ?? opts.seed,
    envelopeId: opts.envelope.envelopeId,
    fingerprints,
    initialStateId,
    plannedActions,
    observedActions,
    decisions,
    states: [...states.values()],
    transitions,
    coverage,
    novelty,
    oracleResults: [...oracles].sort(),
    anomalyFingerprints: [...anomalyFingerprints].sort(),
    safety,
    privacy: {
      metadataFirst: true,
      customerValuesPersisted: false,
      bodiesPersisted: false,
      domPersisted: false,
      screenshotsPersisted: false,
      tracesPersisted: false,
    },
    terminationReason,
  };
}

export async function replayExactSequence(args: {
  readonly initialStateId: string;
  readonly actionIds: readonly string[];
  readonly expectedStateIds: readonly string[];
  readonly expectedTransitionIds: readonly string[];
  readonly catalog: readonly SafeAction[];
  readonly envelope: ExplorationEnvelope;
  readonly runtime: ExplorationRuntime;
}): Promise<ExactReplayResult> {
  const byId = new Map(args.catalog.map((action) => [action.actionId, action]));
  let state = await observeState(args.runtime, args.catalog, args.envelope);
  const stateIds = [state.stateId];
  const transitionIds: string[] = [];
  const observedActions: string[] = [];
  if (state.stateId !== args.initialStateId) {
    return { status: 'INVARIANT_DIVERGENCE', observedActions, stateIds, transitionIds, firstDivergentIndex: 0, terminationReason: 'REPLAY_DIVERGENCE' };
  }
  for (let index = 0; index < args.actionIds.length; index += 1) {
    const actionId = args.actionIds[index]!;
    const action = byId.get(actionId);
    if (action === undefined || action.status !== 'APPROVED' || !args.envelope.allowedActionIds.includes(actionId) ||
      !state.availableActionIds.includes(actionId) || !action.preconditions.routeClasses.includes(state.routeClass) || !replayPreconditionHolds(state, action)) {
      return { status: 'REPLAY_PRECONDITION_DIVERGENCE', observedActions, stateIds, transitionIds, firstDivergentIndex: index, terminationReason: 'REPLAY_DIVERGENCE' };
    }
    const result = await args.runtime.execute(action);
    observedActions.push(actionId);
    const safety = safetyFromResult(result);
    if (safety.knownMutations > 0 || safety.actionCausedUnknown > 0 || safety.productionAttempts > 0 || safety.unknownDestinations > 0) {
      return { status: 'SAFETY_BLOCK', observedActions, stateIds, transitionIds, firstDivergentIndex: index, terminationReason: safety.knownMutations > 0 ? 'KNOWN_MUTATION_DETECTED' : safety.actionCausedUnknown > 0 ? 'ACTION_CAUSED_UNKNOWN' : 'SAFETY_BLOCK' };
    }
    if (result.status !== 'COMPLETED') {
      return { status: 'INVARIANT_DIVERGENCE', observedActions, stateIds, transitionIds, firstDivergentIndex: index, terminationReason: 'REPLAY_DIVERGENCE' };
    }
    const nextState = createExplorationState(result.nextState);
    const stableTransitionId = createTransition({
      fromStateId: state.stateId,
      actionId,
      seedDecisionIndex: index,
      toStateId: nextState.stateId,
      actionOutcome: result.status,
      routeDelta: result.routeDelta,
      structuralDelta: result.structuralDelta,
      semanticRequestDelta: result.semanticRequestDelta,
      oracleResults: result.oracleResults,
      safetyResult: safety,
      durationClass: result.durationClass,
      verification: 'RUNTIME_OBSERVED',
    }).transitionId;
    transitionIds.push(stableTransitionId);
    state = nextState;
    stateIds.push(state.stateId);
    if (args.expectedStateIds[index + 1] !== state.stateId || args.expectedTransitionIds[index] !== stableTransitionId) {
      return { status: 'INVARIANT_DIVERGENCE', observedActions, stateIds, transitionIds, firstDivergentIndex: index, terminationReason: 'REPLAY_DIVERGENCE' };
    }
  }
  return { status: 'STRICT_MATCH', observedActions, stateIds, transitionIds, firstDivergentIndex: null, terminationReason: null };
}

export { ZERO_SAFETY };
