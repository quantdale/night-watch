import { test, expect } from '@playwright/test';
import { runExploration, replayExactSequence } from '../../src/core/exploration/engine';
import { createExplorationState, transitionIdentity } from '../../src/core/exploration/state';
import { approvedActions, validateSafeActionCatalog } from '../../src/core/exploration/catalog';
import { formatCanonicalSeed, SplitMix64 } from '../../src/core/exploration/rng';
import { createSyntheticFixture, SYNTHETIC_ACTIONS, SYNTHETIC_SAFE_ACTION_IDS } from '../../src/core/exploration/syntheticFixture';
import type { ExplorationBudget, ExplorationEnvelope, SafeAction } from '../../src/core/exploration/types';
import { BUDGET_POLICY_VERSION } from '../../src/core/exploration/types';
import { isSuccessfulPhase4Termination } from '../../src/core/exploration/acceptance';
import { RIPPLE_PHASE4_ACTIONS } from '../../src/products/ripple/explorationCatalog';
import { createRippleExplorationRuntime } from '../../src/products/ripple/explorationRuntime';

const budget: ExplorationBudget = {
  policyVersion: BUDGET_POLICY_VERSION,
  maxActionsPerSequence: 6,
  maxDepth: 6,
  maxStates: 12,
  maxTransitions: 12,
  maxRouteChanges: 4,
  maxRuntimeMs: 120_000,
  maxRealContexts: 9,
  maxSeeds: 6,
};

function envelope(actionIds: readonly string[] = SYNTHETIC_SAFE_ACTION_IDS, allowedRoutes: readonly string[] = ['/start', '/detail', '/outside']): ExplorationEnvelope {
  return {
    envelopeId: 'synthetic-phase4-envelope',
    anchorJourney: 'ripple-payer-exchange-read',
    allowedRoutes,
    allowedActionIds: actionIds,
    expectedReadFamilies: [],
    forbiddenRequestFamilies: ['fixture.mutation'],
    maxActionsPerSequence: 6,
    maxDepth: 6,
    maxStates: 12,
    maxTransitions: 12,
    maxStateVisits: 2,
    maxTransitionVisits: 2,
    maxImmediateBacktracks: 2,
    maxRouteChanges: 4,
  };
}

async function safeRun(seed: string) {
  const fixture = createSyntheticFixture();
  return runExploration({
    runId: 'synthetic-run',
    seed,
    catalog: fixture.catalog,
    envelope: envelope(),
    budget,
    runtime: fixture.runtime,
  });
}

test.describe('Phase 4 exploration model', () => {
  test('same seed and model reproduce planner choices and state graph', async () => {
    const first = await safeRun('0x0000000000000001');
    const second = await safeRun('0x0000000000000001');
    expect(first.plannedActions).toEqual(second.plannedActions);
    expect(first.decisions).toEqual(second.decisions);
    expect(first.states.map((state) => state.stateId)).toEqual(second.states.map((state) => state.stateId));
    expect(first.transitions.map((transition) => transition.transitionId)).toEqual(second.transitions.map((transition) => transition.transitionId));
    expect(first.safety).toEqual({ productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 });
  });

  test('Ripple catalog validates source provenance and admits no stale action', () => {
    validateSafeActionCatalog(RIPPLE_PHASE4_ACTIONS);
    expect(approvedActions(RIPPLE_PHASE4_ACTIONS)).toHaveLength(RIPPLE_PHASE4_ACTIONS.length);
    expect(RIPPLE_PHASE4_ACTIONS.every((action) => action.semanticClass === 'KNOWN_READ' || action.semanticClass === 'LOCAL_ONLY')).toBeTruthy();
  });

  test('Ripple selector runtime supports Quasar menu items without an option role', async ({ page }) => {
    await page.setContent(`
      <div class="__ExchangeRateDataTable_Selectors">
        <div class="__C_Selector">
          <div class="__C_Selector-Label">Cloud Provider</div>
          <div class="q-select"><input value="" /><span>Amazon Web Services</span></div>
        </div>
      </div>
      <script>
        document.querySelector('.q-select').addEventListener('click', () => {
          const menu = document.createElement('div');
          menu.className = 'q-menu';
          const item = document.createElement('div');
          item.className = 'q-item';
          item.textContent = 'Microsoft Azure';
          item.addEventListener('click', () => menu.remove());
          menu.appendChild(item);
          document.body.appendChild(menu);
        });
      </script>
    `);
    const action = RIPPLE_PHASE4_ACTIONS.find((candidate) => candidate.actionId === 'p4.j1.vendor-local.azure')!;
    const alreadySelected = RIPPLE_PHASE4_ACTIONS.find((candidate) => candidate.actionId === 'p4.j1.vendor-local.aws')!;
    const network = {
      beginJourneyIntent: () => undefined,
      endJourneyIntent: () => undefined,
      journeySemanticRequests: () => [],
    } as never;
    const monitor = { safetyFailed: false, hardFailures: [] } as never;
    const runtime = createRippleExplorationRuntime({
      page,
      uiBaseUrl: 'https://appdev.alphaus.cloud/ripple/',
      anchorJourney: 'ripple-payer-exchange-read',
      network,
      monitor,
      authValid: true,
    });
    expect(await runtime.actionAvailable(alreadySelected)).toBeFalsy();
    expect(await runtime.actionAvailable(action)).toBeTruthy();
    expect((await runtime.execute(action)).status).toBe('COMPLETED');
  });

  test('different seeds can choose different safe branches', async () => {
    const plans = new Set<string>();
    for (let value = 1; value <= 8; value += 1) {
      const seed = `0x${value.toString(16).padStart(16, '0')}`;
      plans.add((await safeRun(seed)).plannedActions.join(','));
    }
    expect(plans.size).toBeGreaterThan(1);
  });

  test('candidate canonical ordering is independent of input array order', async () => {
    const fixture = createSyntheticFixture();
    const forward = await runExploration({ runId: 'forward', seed: '0x0000000000000042', catalog: fixture.catalog, envelope: envelope(), budget, runtime: fixture.runtime });
    const reverseFixture = createSyntheticFixture();
    const reverse = await runExploration({ runId: 'reverse', seed: '0x0000000000000042', catalog: [...reverseFixture.catalog].reverse(), envelope: envelope(), budget, runtime: reverseFixture.runtime });
    expect(forward.plannedActions).toEqual(reverse.plannedActions);
  });

  test('budget and cycle limits terminate without exceeding the action budget', async () => {
    const fixture = createSyntheticFixture();
    const constrained = { ...budget, maxActionsPerSequence: 2, maxDepth: 2 };
    const result = await runExploration({ runId: 'bounded', seed: '0x0000000000000002', catalog: fixture.catalog, envelope: { ...envelope(), maxActionsPerSequence: 2, maxDepth: 2 }, budget: constrained, runtime: fixture.runtime });
    expect(result.plannedActions.length).toBeLessThanOrEqual(2);
    expect(['BUDGET_EXHAUSTED', 'SAFE_FRONTIER_EXHAUSTED']).toContain(result.terminationReason);
  });

  test('state identity is timing/order insensitive and changes on modeled state', () => {
    const base = {
      product: 'ripple' as const,
      surface: 'fixture',
      routeClass: '/start',
      structuralFlags: { shell: true, fixtureSurface: true },
      safeViewState: { view: 'start' },
      availableActionIds: ['fixture.safe-a', 'fixture.safe-b'],
      semanticReadFamilies: ['fixture.read', 'fixture.read'],
      authStateClass: 'AUTHENTICATED_DEV' as const,
      terminalFlags: {},
    };
    const reordered = createExplorationState({ ...base, semanticReadFamilies: ['fixture.read'] });
    const same = createExplorationState({ ...base, semanticReadFamilies: ['fixture.read'] });
    const changed = createExplorationState({ ...base, safeViewState: { view: 'detail' } });
    expect(reordered.stateId).toBe(same.stateId);
    expect(changed.stateId).not.toBe(same.stateId);
    expect(() => createExplorationState({ ...base, safeViewState: { customerName: 'forbidden' } })).toThrow(/privacy-unsafe state key/);
  });

  test('state and transition IDs do not contain customer values or run IDs', () => {
    const state = createExplorationState({
      product: 'ripple', surface: 'fixture', routeClass: '/start', structuralFlags: { shell: true },
      safeViewState: { view: 'start' }, availableActionIds: [], semanticReadFamilies: [],
      authStateClass: 'AUTHENTICATED_DEV', terminalFlags: {},
    });
    const transition = transitionIdentity(state.stateId, 'fixture.safe-a', state.stateId);
    expect(state.stateId).not.toContain('customer');
    expect(transition).not.toContain('synthetic-run');
  });

  test('same seed RNG draws are reproducible and canonical', () => {
    const a = new SplitMix64('0x00000000000000aa');
    const b = new SplitMix64('0x00000000000000aa');
    const drawsA = [a.nextUint64(), a.nextUint64(), a.nextUint64()].map(formatCanonicalSeed);
    const drawsB = [b.nextUint64(), b.nextUint64(), b.nextUint64()].map(formatCanonicalSeed);
    expect(drawsA).toEqual(drawsB);
    expect(() => new SplitMix64('aa')).toThrow(/canonical/);
  });

  test('exact sequence replay executes action IDs without planner substitution', async () => {
    const first = await safeRun('0x0000000000000007');
    const originalFixture = createSyntheticFixture();
    const original = await runExploration({ runId: 'original', seed: '0x0000000000000007', catalog: originalFixture.catalog, envelope: envelope(), budget, runtime: originalFixture.runtime });
    const replayFixture = createSyntheticFixture();
    const replay = await replayExactSequence({
      initialStateId: original.initialStateId,
      actionIds: original.plannedActions,
      expectedStateIds: [original.initialStateId, ...original.transitions.map((transition) => transition.toStateId)],
      expectedTransitionIds: original.transitions.map((transition) => transition.transitionId),
      catalog: replayFixture.catalog,
      envelope: envelope(),
      runtime: replayFixture.runtime,
    });
    expect(first.plannedActions).toEqual(original.plannedActions);
    expect(replay.status).toBe('STRICT_MATCH');
  });

  test('mutation tripwire stops immediately and executes no subsequent action', async () => {
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.mutation')!;
    const fixture = createSyntheticFixture({ mode: 'mutation' });
    const result = await runExploration({ runId: 'mutation-tripwire', seed: '0x0000000000000001', catalog: [{ ...action, status: 'APPROVED', semanticClass: 'KNOWN_READ' }], envelope: envelope(['fixture.mutation'], ['/start']), budget, runtime: fixture.runtime });
    expect(result.terminationReason).toBe('KNOWN_MUTATION_DETECTED');
    expect(result.observedActions).toEqual(['fixture.mutation']);
    expect(result.safety.knownMutations).toBeGreaterThan(0);
  });

  test('action-caused UNKNOWN tripwire invalidates the edge and stops', async () => {
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.unknown')!;
    const fixture = createSyntheticFixture({ mode: 'unknown' });
    const result = await runExploration({ runId: 'unknown-tripwire', seed: '0x0000000000000001', catalog: [{ ...action, status: 'APPROVED', semanticClass: 'KNOWN_READ' }], envelope: envelope(['fixture.unknown'], ['/start']), budget, runtime: fixture.runtime });
    expect(result.terminationReason).toBe('ACTION_CAUSED_UNKNOWN');
    expect(result.observedActions).toEqual(['fixture.unknown']);
  });

  test('new host is fail-closed and classified separately from semantic unknown', async () => {
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.new-host')!;
    const fixture = createSyntheticFixture({ mode: 'new-host' });
    const result = await runExploration({ runId: 'new-host-tripwire', seed: '0x0000000000000001', catalog: [{ ...action, status: 'APPROVED', semanticClass: 'KNOWN_READ' }], envelope: envelope(['fixture.new-host'], ['/start']), budget, runtime: fixture.runtime });
    expect(result.terminationReason).toBe('NEW_HOST_BLOCKED');
    expect(result.observedActions).toEqual(['fixture.new-host']);
  });

  test('runtime-unavailable action is excluded without substitution and recorded', async () => {
    const fixture = createSyntheticFixture({ unavailable: true });
    const result = await runExploration({ runId: 'unavailable', seed: '0x0000000000000001', catalog: fixture.catalog, envelope: envelope(['fixture.unavailable'], ['/start']), budget, runtime: fixture.runtime });
    expect(result.terminationReason).toBe('SAFE_FRONTIER_EXHAUSTED');
    expect(result.coverage.actionsUnavailable).toBe(1);
    expect(result.observedActions).toEqual([]);
  });

  test('stale model actions are excluded and never executed', async () => {
    const action = { ...SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.safe-a')!, status: 'REVIEW_REQUIRED' as const };
    const fixture = createSyntheticFixture();
    const result = await runExploration({ runId: 'stale', seed: '0x0000000000000001', catalog: [action], envelope: envelope([action.actionId], ['/start']), budget, runtime: fixture.runtime });
    expect(result.terminationReason).toBe('SAFE_FRONTIER_EXHAUSTED');
    expect(result.observedActions).toEqual([]);
    expect(result.decisions[0]?.excludedActions).toEqual([{ actionId: action.actionId, reason: 'STALE_SOURCE' }]);
  });

  test('failed modeled actions retain an invalidated transition record', async () => {
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.runtime-failure')!;
    const fixture = createSyntheticFixture({ mode: 'runtime-failure' });
    const result = await runExploration({
      runId: 'failed-transition',
      seed: '0x0000000000000001',
      catalog: [{ ...action, status: 'APPROVED', semanticClass: 'LOCAL_ONLY' }],
      envelope: envelope([action.actionId], ['/start']),
      budget,
      runtime: fixture.runtime,
    });
    expect(result.terminationReason).toBe('RUNTIME_FAILURE');
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]?.actionOutcome).toBe('FAILED');
    expect(result.transitions[0]?.verification).toBe('INVALIDATED');
    expect(result.transitions[0]?.oracleResults).toContain('ACTION_TRANSITION_FAILED');
    expect(isSuccessfulPhase4Termination(result.terminationReason)).toBe(false);
  });

  test('safe action failure codes are retained without raw runtime error text', async () => {
    const fixture = createSyntheticFixture();
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.safe-a')!;
    const result = await runExploration({
      runId: 'coded-failure',
      seed: '0x0000000000000001',
      catalog: [{ ...action, status: 'APPROVED' }],
      envelope: envelope([action.actionId], ['/start']),
      budget,
      runtime: {
        ...fixture.runtime,
        execute: async () => ({
          status: 'FAILED' as const,
          nextState: await fixture.runtime.currentState(),
          routeDelta: { routeClass: '/start' },
          structuralDelta: {},
          semanticRequestDelta: [],
          oracleResults: [],
          safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
          durationClass: 'SHORT' as const,
          failureCode: 'OPTION_CLICK_FAILED' as const,
          failureReason: 'OPTION_CLICK_FAILED',
        }),
      },
    });
    expect(result.transitions[0]?.oracleResults).toContain('ACTION_FAILURE:OPTION_CLICK_FAILED');
    expect(result.transitions[0]?.oracleResults).not.toContain('raw runtime error');
  });

  test('only safe frontier, model-terminal, and bounded-budget terminations count as successful', () => {
    expect(isSuccessfulPhase4Termination('SAFE_FRONTIER_EXHAUSTED')).toBe(true);
    expect(isSuccessfulPhase4Termination('MODEL_TERMINAL_STATE')).toBe(true);
    expect(isSuccessfulPhase4Termination('BUDGET_EXHAUSTED')).toBe(true);
    for (const reason of ['AUTH_INVALID', 'SAFETY_BLOCK', 'ACTION_CAUSED_UNKNOWN', 'KNOWN_MUTATION_DETECTED', 'NEW_HOST_BLOCKED', 'UNEXPECTED_ROUTE_ESCAPE', 'FATAL_ORACLE', 'RUNTIME_FAILURE', 'REPLAY_DIVERGENCE', 'RUN_INCOMPLETE'] as const) {
      expect(isSuccessfulPhase4Termination(reason), reason).toBe(false);
    }
  });

  test('declared action structural/read contracts are independently enforced', async () => {
    const fixture = createSyntheticFixture();
    const action = SYNTHETIC_ACTIONS.find((candidate) => candidate.actionId === 'fixture.safe-a')!;
    const runtime = {
      ...fixture.runtime,
      execute: async (catalogAction: SafeAction) => {
        const result = await fixture.runtime.execute(action);
        return { ...result, structuralDelta: { view: 'actual' } };
      },
    };
    const result = await runExploration({
      runId: 'contract-mismatch',
      seed: '0x0000000000000001',
      catalog: [{ ...action, expectedStructuralDelta: { view: 'wrong' } }],
      envelope: envelope([action.actionId], ['/start']),
      budget,
      runtime,
    });
    expect(result.terminationReason).toBe('RUNTIME_FAILURE');
    expect(result.transitions[0]?.oracleResults).toContain('ACTION_TRANSITION_FAILED');
  });
});
