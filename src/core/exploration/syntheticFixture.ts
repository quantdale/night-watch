import type {
  ActionExecutionResult,
  ExplorationRuntime,
  ExplorationStateInput,
  SafeAction,
  SourceProvenance,
} from './types';

const fixtureSource: SourceProvenance = {
  repository: 'nightwatch',
  file: 'src/core/exploration/syntheticFixture.ts',
  symbol: 'createSyntheticFixture',
  sourceSha: 'synthetic-phase4-fixture-v1',
  trackingRef: 'local',
  freshness: 'CURRENT_DEPLOYMENT_VERIFIED',
};

const base = (actionId: string, kind: SafeAction['actionKind'], route: string, view: string): SafeAction => ({
  actionId,
  product: 'ripple',
  anchorJourney: 'ripple-payer-exchange-read',
  surface: 'fixture',
  control: `fixture ${actionId}`,
  sourceProvenance: [fixtureSource],
  actionKind: kind,
  preconditions: { routeClasses: [route] },
  locator: { kind: 'approved-route', routeClass: route },
  semanticClass: kind === 'CLICK_APPROVED_READ_CONTROL' ? 'KNOWN_READ' : 'LOCAL_ONLY',
  expectedRouteClass: route,
  expectedStructuralDelta: { view },
  expectedReadFamilies: kind === 'CLICK_APPROVED_READ_CONTROL' ? [`fixture.${actionId}`] : [],
  forbiddenRequestFamilies: ['fixture.mutation'],
  persistedPreferenceEffect: 'NONE',
  analyticsEffect: 'NONE',
  routeEffect: 'UNCHANGED',
  privacyPolicy: 'METADATA_ONLY_NO_CUSTOMER_VALUES',
  replayPolicy: 'STRICT_ACTION_ID_AND_PRECONDITION',
  status: 'APPROVED',
});

export const SYNTHETIC_ACTIONS: readonly SafeAction[] = [
  base('fixture.safe-a', 'TOGGLE_LOCAL_VIEW', '/start', 'a'),
  { ...base('fixture.safe-b', 'CLICK_APPROVED_READ_CONTROL', '/start', 'detail'), expectedRouteClass: '/detail' },
  { ...base('fixture.back', 'RETURN_TO_ANCHOR', '/detail', 'start'), expectedRouteClass: '/start', locator: { kind: 'approved-route', routeClass: '/start' }, routeEffect: 'APPROVED_ROUTE' },
  base('fixture.safe-local-branch', 'TOGGLE_LOCAL_VIEW', '/start', 'local'),
  { ...base('fixture.resource-anomaly', 'CLICK_APPROVED_READ_CONTROL', '/start', 'resource'), oracle: 'RESOURCE_ANOMALY' } as SafeAction & { oracle: string },
  { ...base('fixture.mutation', 'CLICK_APPROVED_READ_CONTROL', '/start', 'mutation'), expectedReadFamilies: [], status: 'REVIEW_REQUIRED' },
  { ...base('fixture.unknown', 'CLICK_APPROVED_READ_CONTROL', '/start', 'unknown'), expectedReadFamilies: [], status: 'REVIEW_REQUIRED' },
  { ...base('fixture.new-host', 'CLICK_APPROVED_READ_CONTROL', '/start', 'host'), expectedReadFamilies: [], status: 'REVIEW_REQUIRED' },
  { ...base('fixture.unavailable', 'TOGGLE_LOCAL_VIEW', '/start', 'unavailable'), expectedReadFamilies: [], status: 'APPROVED' },
  { ...base('fixture.runtime-failure', 'TOGGLE_LOCAL_VIEW', '/start', 'runtime'), expectedReadFamilies: [], status: 'REVIEW_REQUIRED' },
  { ...base('fixture.route-escape', 'RETURN_TO_ANCHOR', '/start', 'escape'), expectedRouteClass: '/outside', locator: { kind: 'approved-route', routeClass: '/outside' }, expectedReadFamilies: [], status: 'REVIEW_REQUIRED' },
];

export const SYNTHETIC_SAFE_ACTION_IDS = [
  'fixture.safe-a',
  'fixture.safe-b',
  'fixture.back',
  'fixture.safe-local-branch',
  'fixture.resource-anomaly',
] as const;

function state(routeClass: string, view: string, availableActionIds: readonly string[] = SYNTHETIC_SAFE_ACTION_IDS): ExplorationStateInput {
  return {
    product: 'ripple',
    surface: 'fixture',
    routeClass,
    structuralFlags: { shell: true, fixtureSurface: true },
    safeViewState: { view },
    availableActionIds,
    semanticReadFamilies: [],
    authStateClass: 'AUTHENTICATED_DEV',
    terminalFlags: {},
  };
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface SyntheticFixtureOptions {
  readonly mode?: 'safe' | 'mutation' | 'unknown' | 'new-host' | 'runtime-failure' | 'route-escape';
  readonly unavailable?: boolean;
}

export function createSyntheticFixture(options: SyntheticFixtureOptions = {}): { runtime: ExplorationRuntime; catalog: readonly SafeAction[] } {
  const mode = options.mode ?? 'safe';
  const modeAction = mode === 'mutation' ? 'fixture.mutation'
    : mode === 'unknown' ? 'fixture.unknown'
      : mode === 'new-host' ? 'fixture.new-host'
        : mode === 'runtime-failure' ? 'fixture.runtime-failure'
          : mode === 'route-escape' ? 'fixture.route-escape' : null;
  const initialAvailable = modeAction === null
    ? [...SYNTHETIC_SAFE_ACTION_IDS]
    : [...SYNTHETIC_SAFE_ACTION_IDS, modeAction];
  if (options.unavailable) initialAvailable.push('fixture.unavailable');
  let current = state('/start', 'start', initialAvailable);
  const actionAvailable = (action: SafeAction): boolean => {
    if (options.unavailable && action.actionId === 'fixture.unavailable') return false;
    return current.availableActionIds.includes(action.actionId);
  };

  const execute = async (action: SafeAction): Promise<ActionExecutionResult> => {
    const failure = (reason: string): ActionExecutionResult => ({
      status: 'FAILED',
      nextState: current,
      routeDelta: { routeClass: current.routeClass },
      structuralDelta: {},
      semanticRequestDelta: [],
      oracleResults: [],
      safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
      durationClass: 'SHORT',
      failureReason: reason,
    });
    if (!actionAvailable(action)) return { ...failure('RUNTIME_CONTROL_ABSENT'), status: 'ACTION_NOT_AVAILABLE_AT_RUNTIME' };
    if (mode === 'mutation' && action.actionId === 'fixture.mutation') {
      return { ...failure('KNOWN_MUTATION'), safety: { ...failure('KNOWN_MUTATION').safety, knownMutations: 1 }, semanticRequestDelta: [{ family: 'fixture.mutation', classification: 'KNOWN_MUTATION', disposition: 'KNOWN_MUTATION', hostClass: 'TARGET' }] };
    }
    if (mode === 'unknown' && action.actionId === 'fixture.unknown') {
      return { ...failure('ACTION_CAUSED_UNKNOWN'), safety: { ...failure('ACTION_CAUSED_UNKNOWN').safety, actionCausedUnknown: 1 }, semanticRequestDelta: [{ family: 'fixture.unknown', classification: 'UNKNOWN', disposition: 'ACTION_CAUSED_UNKNOWN', hostClass: 'TARGET' }] };
    }
    if (mode === 'new-host' && action.actionId === 'fixture.new-host') {
      return { ...failure('NEW_HOST'), safety: { ...failure('NEW_HOST').safety, unknownDestinations: 1 }, semanticRequestDelta: [{ family: 'unknown-host', classification: 'UNKNOWN', disposition: 'ACTION_CAUSED_UNKNOWN', hostClass: 'UNKNOWN' }] };
    }
    if (mode === 'runtime-failure' && action.actionId === 'fixture.runtime-failure') return failure('RUNTIME_FAILURE');
    if (mode === 'route-escape' && action.actionId === 'fixture.route-escape') {
      return { ...failure('ROUTE_ESCAPE'), nextState: state('/outside', 'escape'), routeDelta: { routeClass: '/outside' } };
    }
    if (action.actionId === 'fixture.safe-a') current = state('/start', 'a');
    else if (action.actionId === 'fixture.safe-b') current = { ...state('/detail', 'detail', ['fixture.back']), semanticReadFamilies: ['fixture.safe-b'] };
    else if (action.actionId === 'fixture.back') current = state('/start', 'start');
    else if (action.actionId === 'fixture.safe-local-branch') current = state('/start', 'local');
    else if (action.actionId === 'fixture.resource-anomaly') current = state('/start', 'resource');
    const oracleResults = action.actionId === 'fixture.resource-anomaly' ? ['RESOURCE_ANOMALY'] : [];
    return {
      status: 'COMPLETED',
      nextState: current,
      routeDelta: { routeClass: current.routeClass },
      structuralDelta: action.expectedStructuralDelta,
      semanticRequestDelta: action.expectedReadFamilies.map((family) => ({ family, classification: 'KNOWN_READ', disposition: 'KNOWN_READ', hostClass: 'TARGET' })),
      oracleResults,
      safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
      durationClass: 'SHORT',
    };
  };

  return {
    catalog: SYNTHETIC_ACTIONS,
    runtime: {
      currentState: () => current,
      actionAvailable,
      execute,
    },
  };
}
