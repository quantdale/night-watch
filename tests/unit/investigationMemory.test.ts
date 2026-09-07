// W8 memory-proof lane: derivation contract over hand-built AgentRuntimeState values.
// Pure deterministic fixtures only: no CLI spawn, no network, no filesystem.
import { test, expect } from '@playwright/test';
import {
  AGENT_RUNTIME_STATE_VERSION,
  defaultAgentBudgetPolicy,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol/runtime';
import type {
  AgentActionRecord,
  AgentHypothesis,
  AgentRuntimeState,
} from '../../src/core/agentProtocol/runtime';
import {
  absorbInvestigationIntoStrategy,
  deriveInvestigationMemory,
  emptyCampaignStrategyState,
  parseCampaignStrategyState,
} from '../../src/core/investigationMemory/derive';
import { MEMORY_CAPS } from '../../src/core/investigationMemory/types';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    campaignId: 'campaign-memory-test',
    status: 'RUNNING',
    phase: 'OBSERVE',
    hypotheses: [],
    actionLog: [],
    evidenceRefs: [],
    candidateIds: [],
    knownTargets: [],
    budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
    terminationReason: null,
    ...overrides,
  };
}

function makeAction(overrides: Partial<AgentActionRecord> = {}): AgentActionRecord {
  return {
    turnId: 't1',
    phase: 'OBSERVE',
    intentKind: 'CALL_TOOL',
    toolId: 'INSPECT_SOURCE_SURFACE',
    argumentDigest: null,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: [],
    ...overrides,
  };
}

function makeHypothesis(overrides: Partial<AgentHypothesis> = {}): AgentHypothesis {
  return {
    hypothesisId: 'h-1',
    statement: 'checkout total drifts under concurrent coupon apply',
    evidenceRefs: [],
    status: 'OPEN',
    ...overrides,
  };
}

function inspectAction(turnId: string, target: string, evidenceRef: string | null, salient: string[] = []): AgentActionRecord {
  return makeAction({
    turnId,
    toolId: 'INSPECT_SOURCE_SURFACE',
    resultClass: evidenceRef === null ? 'SOURCE_READ_REFUSED' : 'SOURCE_FILE',
    evidenceRefs: evidenceRef === null ? [] : [evidenceRef],
    target,
    salient,
  });
}

test.describe('investigationMemory inspected-target ledger', () => {
  test('a confirmed source read yields one inspected entry and leaves other known targets uninspected', async () => {
    const state = makeState({
      knownTargets: ['src/checkout/total.ts', 'src/checkout/coupon.ts'],
      evidenceRefs: ['ev:src-total'],
      actionLog: [inspectAction('t1', 'src/checkout/total.ts', 'ev:src-total', ['computeTotal', 'applyCoupon'])],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.inspectedTargets).toHaveLength(1);
    expect(memory.inspectedTargets[0]?.target).toBe('src/checkout/total.ts');
    expect(memory.inspectedTargets[0]?.evidenceRef).toBe('ev:src-total');
    expect(memory.inspectedTargets[0]?.salient).toEqual(['computeTotal', 'applyCoupon']);
    expect(memory.inspectedTargets[0]?.timesInspected).toBe(1);
    expect(memory.uninspectedTargets).toEqual(['src/checkout/coupon.ts']);
  });
});

test.describe('investigationMemory hypothesis progress ladder', () => {
  test('ungrounded, grounded, verification-ready and disproved classify from observed refs only', async () => {
    const state = makeState({
      knownTargets: ['src/checkout/total.ts'],
      evidenceRefs: ['ev:src-total', 'ev:obs-log'],
      actionLog: [inspectAction('t1', 'src/checkout/total.ts', 'ev:src-total')],
      hypotheses: [
        makeHypothesis({ hypothesisId: 'h-ungrounded', evidenceRefs: [] }),
        makeHypothesis({ hypothesisId: 'h-grounded', evidenceRefs: ['ev:obs-log'] }),
        makeHypothesis({ hypothesisId: 'h-ready', evidenceRefs: ['ev:src-total'] }),
        makeHypothesis({ hypothesisId: 'h-disproved', status: 'DISPROVED', evidenceRefs: ['ev:src-total'] }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    const progressOf = (id: string): string => memory.hypotheses.find((item) => item.hypothesisId === id)?.progress ?? 'MISSING';
    expect(progressOf('h-ungrounded')).toBe('UNGROUNDED');
    expect(progressOf('h-grounded')).toBe('GROUNDED');
    expect(progressOf('h-ready')).toBe('VERIFICATION_READY');
    expect(memory.hypotheses.find((item) => item.hypothesisId === 'h-ready')?.groundedOnTargets).toEqual([
      'src/checkout/total.ts',
    ]);
    expect(progressOf('h-disproved')).toBe('DISPROVED');
  });

  test('the same hypothesis becomes reproduced after an observed reproduction on its target', async () => {
    const base = makeState({
      knownTargets: ['src/checkout/total.ts'],
      evidenceRefs: ['ev:src-total'],
      actionLog: [inspectAction('t1', 'src/checkout/total.ts', 'ev:src-total')],
      hypotheses: [makeHypothesis({ hypothesisId: 'h-same', evidenceRefs: ['ev:src-total'] })],
    });
    expect(deriveInvestigationMemory(base).hypotheses[0]?.progress).toBe('VERIFICATION_READY');
    const afterRepro = makeState({
      ...base,
      evidenceRefs: ['ev:src-total', 'ev:repro-1'],
      actionLog: [
        ...base.actionLog,
        makeAction({
          turnId: 't2',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          resultClass: 'REPRODUCED',
          evidenceRefs: ['ev:repro-1'],
          target: 'src/checkout/total.ts',
        }),
      ],
    });
    const memory = deriveInvestigationMemory(afterRepro);
    expect(memory.hypotheses[0]?.progress).toBe('REPRODUCED');
    expect(memory.progress.mechanicalReproductions).toBe(1);
  });
});

test.describe('investigationMemory hypothesis ordering', () => {
  test('hypotheses sort strongest-first and truncate to the documented cap', async () => {
    const state = makeState({
      knownTargets: ['src/a.ts', 'src/b.ts'],
      evidenceRefs: ['ev:src-a', 'ev:src-b', 'ev:obs', 'ev:repro-b'],
      actionLog: [
        inspectAction('t1', 'src/a.ts', 'ev:src-a'),
        inspectAction('t2', 'src/b.ts', 'ev:src-b'),
        makeAction({
          turnId: 't3',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          resultClass: 'REPRODUCED',
          evidenceRefs: ['ev:repro-b'],
          target: 'src/b.ts',
        }),
      ],
      hypotheses: [
        makeHypothesis({ hypothesisId: 'h-disproved', status: 'DISPROVED', evidenceRefs: ['ev:src-a'] }),
        makeHypothesis({ hypothesisId: 'h-ungrounded', evidenceRefs: [] }),
        makeHypothesis({ hypothesisId: 'h-grounded', evidenceRefs: ['ev:obs'] }),
        makeHypothesis({ hypothesisId: 'h-ready', evidenceRefs: ['ev:src-a'] }),
        makeHypothesis({ hypothesisId: 'h-reproduced', evidenceRefs: ['ev:src-b'] }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.hypotheses.map((item) => item.hypothesisId)).toEqual([
      'h-reproduced',
      'h-ready',
      'h-grounded',
      'h-ungrounded',
      'h-disproved',
    ]);
  });

  test('more hypotheses than the cap keep the strongest-first prefix', async () => {
    const hypotheses = Array.from({ length: MEMORY_CAPS.hypotheses + 4 }, (_, index) =>
      makeHypothesis({ hypothesisId: `h-${String(index).padStart(2, '0')}` }),
    );
    const memory = deriveInvestigationMemory(makeState({ hypotheses }));
    expect(memory.hypotheses).toHaveLength(MEMORY_CAPS.hypotheses);
    expect(memory.hypotheses.map((item) => item.hypothesisId)).toEqual(
      hypotheses.slice(0, MEMORY_CAPS.hypotheses).map((item) => item.hypothesisId),
    );
  });
});

test.describe('investigationMemory reproduction readiness', () => {
  test('each of the four readiness states comes from the state that implies it', async () => {
    const empty = deriveInvestigationMemory(makeState());
    expect(empty.progress.reproductionReadiness).toBe('NOT_READY_NO_INSPECTED_SOURCE');

    const noEvidence = deriveInvestigationMemory(
      makeState({ actionLog: [inspectAction('t1', 'src/a.ts', null)] }),
    );
    expect(noEvidence.progress.reproductionReadiness).toBe('NOT_READY_NO_SOURCE_EVIDENCE');

    const noGrounded = deriveInvestigationMemory(
      makeState({
        evidenceRefs: ['ev:src-a'],
        actionLog: [inspectAction('t1', 'src/a.ts', 'ev:src-a')],
        hypotheses: [makeHypothesis({ hypothesisId: 'h-plain' })],
      }),
    );
    expect(noGrounded.progress.reproductionReadiness).toBe('NOT_READY_NO_GROUNDED_HYPOTHESIS');

    const ready = deriveInvestigationMemory(
      makeState({
        evidenceRefs: ['ev:src-a'],
        actionLog: [inspectAction('t1', 'src/a.ts', 'ev:src-a')],
        hypotheses: [makeHypothesis({ hypothesisId: 'h-ready', evidenceRefs: ['ev:src-a'] })],
      }),
    );
    expect(ready.progress.reproductionReadiness).toBe('READY');
  });
});

test.describe('investigationMemory progress and stagnation', () => {
  test('fresh evidence means no stagnation; ageing evidence elevates then criticals', async () => {
    const fresh = deriveInvestigationMemory(
      makeState({
        evidenceRefs: ['ev:src-a'],
        actionLog: [inspectAction('t1', 'src/a.ts', 'ev:src-a')],
      }),
    );
    expect(fresh.progress.turnsSinceNewEvidence).toBe(0);
    expect(fresh.progress.stagnationRisk).toBe('NONE');

    const stale = (turns: number): AgentRuntimeState =>
      makeState({
        evidenceRefs: ['ev:src-a'],
        actionLog: [
          inspectAction('t1', 'src/a.ts', 'ev:src-a'),
          ...Array.from({ length: turns - 1 }, (_, index) =>
            makeAction({ turnId: `t${String(index + 2)}`, toolId: 'QUERY_SYSTEM_MAP', resultClass: 'OBSERVATION' }),
          ),
        ],
      });
    const elevated = deriveInvestigationMemory(stale(3));
    expect(elevated.progress.turnsSinceNewEvidence).toBe(2);
    expect(elevated.progress.stagnationRisk).toBe('ELEVATED');
    const critical = deriveInvestigationMemory(stale(5));
    expect(critical.progress.turnsSinceNewEvidence).toBe(4);
    expect(critical.progress.stagnationRisk).toBe('CRITICAL');
  });

  test('a deduplicated repeat that gains no evidence counts but does not reset the counter', async () => {
    const state = makeState({
      evidenceRefs: ['ev:src-a'],
      actionLog: [
        inspectAction('t1', 'src/a.ts', 'ev:src-a'),
        makeAction({
          turnId: 't2',
          toolId: 'INSPECT_SOURCE_SURFACE',
          resultClass: 'DEDUPED_REPEAT',
          evidenceRefs: ['ev:src-a'],
          target: 'src/a.ts',
        }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.progress.repeatedActionCount).toBe(1);
    expect(memory.progress.turnsSinceNewEvidence).toBe(1);
    expect(memory.progress.stagnationRisk).toBe('ELEVATED');

    const twice = makeState({
      ...state,
      actionLog: [
        ...state.actionLog,
        makeAction({
          turnId: 't3',
          toolId: 'INSPECT_SOURCE_SURFACE',
          resultClass: 'DEDUPED_REPEAT',
          evidenceRefs: ['ev:src-a'],
          target: 'src/a.ts',
        }),
      ],
    });
    const critical = deriveInvestigationMemory(twice);
    expect(critical.progress.repeatedActionCount).toBe(2);
    expect(critical.progress.turnsSinceNewEvidence).toBe(2);
    expect(critical.progress.stagnationRisk).toBe('CRITICAL');
  });
});

test.describe('investigationMemory exhausted targets', () => {
  test('failed inspections, failed verifications and deduped targets exhaust; reproduced targets do not', async () => {
    const state = makeState({
      knownTargets: ['src/refused.ts', 'src/flaky.ts', 'src/dup.ts', 'src/proven.ts'],
      evidenceRefs: ['ev:src-flaky', 'ev:src-dup', 'ev:src-proven', 'ev:repro-proven'],
      actionLog: [
        inspectAction('t1', 'src/refused.ts', null),
        inspectAction('t2', 'src/flaky.ts', 'ev:src-flaky'),
        makeAction({
          turnId: 't3',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          resultClass: 'NOT_REPRODUCED',
          evidenceRefs: [],
          target: 'src/flaky.ts',
        }),
        inspectAction('t4', 'src/dup.ts', 'ev:src-dup'),
        makeAction({
          turnId: 't5',
          toolId: 'INSPECT_SOURCE_SURFACE',
          resultClass: 'DEDUPED_REPEAT',
          evidenceRefs: ['ev:src-dup'],
          target: 'src/dup.ts',
        }),
        inspectAction('t6', 'src/proven.ts', 'ev:src-proven'),
        makeAction({
          turnId: 't7',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          resultClass: 'REPRODUCED',
          evidenceRefs: ['ev:repro-proven'],
          target: 'src/proven.ts',
        }),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.exhaustedTargets).toContain('src/refused.ts');
    expect(memory.exhaustedTargets).toContain('src/flaky.ts');
    expect(memory.exhaustedTargets).toContain('src/dup.ts');
    expect(memory.exhaustedTargets).not.toContain('src/proven.ts');
  });
});

test.describe('investigationMemory directives', () => {
  test('ready grounding names the exact source path and evidence ref a reproduction must cite', async () => {
    const state = makeState({
      knownTargets: ['src/checkout/total.ts'],
      evidenceRefs: ['ev:src-total'],
      actionLog: [inspectAction('t1', 'src/checkout/total.ts', 'ev:src-total', ['computeTotal'])],
      hypotheses: [makeHypothesis({ hypothesisId: 'h-ready', evidenceRefs: ['ev:src-total'] })],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.progress.reproductionReadiness).toBe('READY');
    expect(memory.directives.length).toBeLessThanOrEqual(MEMORY_CAPS.directives);
    expect(memory.directives[0]).toContain('sourcePath=src/checkout/total.ts');
    expect(memory.directives[0]).toContain('sourceEvidenceRef=ev:src-total');
    expect(memory.directives[0]).toContain('h-ready');
    expect(deriveInvestigationMemory(state).directives).toEqual(memory.directives);
  });

  test('directives are capped and verification outranks browsing', async () => {
    const campaign = {
      ...emptyCampaignStrategyState('campaign-memory-test'),
      investigationsCompleted: 1,
      inspectedTargets: ['src/old.ts'] as readonly string[],
    };
    const state = makeState({
      knownTargets: ['src/new-a.ts', 'src/new-b.ts', 'src/new-c.ts', 'src/new-d.ts'],
      evidenceRefs: ['ev:ready', 'ev:ungrounded'],
      actionLog: [
        inspectAction('t1', 'src/ready.ts', 'ev:ready'),
        inspectAction('t2', 'src/ungrounded.ts', 'ev:ungrounded'),
        ...['t3', 't4', 't5', 't6'].map((turnId) =>
          makeAction({ turnId, toolId: 'QUERY_SYSTEM_MAP', resultClass: 'OBSERVATION' }),
        ),
      ],
      hypotheses: [makeHypothesis({ hypothesisId: 'h-ready', evidenceRefs: ['ev:ready'] })],
    });
    const memory = deriveInvestigationMemory(state, { campaign });
    expect(memory.progress.stagnationRisk).toBe('CRITICAL');
    expect(memory.directives).toHaveLength(MEMORY_CAPS.directives);
    expect(memory.directives[0]).toContain('RERUN_SAFE_REPRODUCTION is available');
    expect(deriveInvestigationMemory(state, { campaign }).directives).toEqual(memory.directives);
  });
});

test.describe('investigationMemory determinism', () => {
  test('deriving twice from the same state yields byte-identical output', async () => {
    const state = makeState({
      knownTargets: ['src/a.ts', 'src/b.ts'],
      evidenceRefs: ['ev:src-a'],
      actionLog: [inspectAction('t1', 'src/a.ts', 'ev:src-a', ['alpha'])],
      hypotheses: [makeHypothesis({ hypothesisId: 'h-1', evidenceRefs: ['ev:src-a'] })],
      candidateIds: ['cand-1'],
    });
    const first = JSON.stringify(deriveInvestigationMemory(state));
    const second = JSON.stringify(deriveInvestigationMemory(state));
    expect(second).toBe(first);
  });
});

test.describe('campaign strategy accumulation', () => {
  function productiveState(campaignId: string): AgentRuntimeState {
    return makeState({
      campaignId,
      evidenceRefs: ['ev:src-r', 'ev:repro-r'],
      actionLog: [
        inspectAction('t1', 'src/cold.ts', null),
        inspectAction('t2', 'src/r.ts', 'ev:src-r'),
        makeAction({
          turnId: 't3',
          toolId: 'RERUN_SAFE_REPRODUCTION',
          resultClass: 'REPRODUCED',
          evidenceRefs: ['ev:repro-r'],
          target: 'src/r.ts',
        }),
      ],
      candidateIds: ['cand-1'],
    });
  }

  test('two investigations accumulate targets, outcomes and stagnation honestly', async () => {
    const empty = emptyCampaignStrategyState('campaign-memory-test');
    const first = absorbInvestigationIntoStrategy(empty, {
      state: productiveState('campaign-memory-test'),
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 2,
      newCandidates: 1,
    });
    expect(first.investigationsCompleted).toBe(1);
    expect(first.inspectedTargets).toContain('src/cold.ts');
    expect(first.inspectedTargets).toContain('src/r.ts');
    expect(first.reproducedTargets).toEqual(['src/r.ts']);
    expect(first.unproductiveTargets).toContain('src/cold.ts');
    expect(first.unproductiveTargets).not.toContain('src/r.ts');
    expect(first.candidateIds).toEqual(['cand-1']);
    expect(first.priorOutcomes).toHaveLength(1);
    expect(first.stagnantInvestigations).toBe(0);

    const second = absorbInvestigationIntoStrategy(first, {
      state: makeState({ campaignId: 'campaign-memory-test' }),
      terminationReason: 'NO_PROGRESS',
      newEvidence: 0,
      newCandidates: 0,
    });
    expect(second.investigationsCompleted).toBe(2);
    expect(second.inspectedTargets).toEqual(first.inspectedTargets);
    expect(second.priorOutcomes).toHaveLength(2);
    expect(second.stagnantInvestigations).toBe(1);

    const revived = absorbInvestigationIntoStrategy(second, {
      state: productiveState('campaign-memory-test'),
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 1,
      newCandidates: 0,
    });
    expect(revived.stagnantInvestigations).toBe(0);
  });

  test('prior outcomes keep only the most recent investigations', async () => {
    let strategy = emptyCampaignStrategyState('campaign-memory-test');
    for (let index = 1; index <= MEMORY_CAPS.priorInvestigations + 2; index += 1) {
      strategy = absorbInvestigationIntoStrategy(strategy, {
        state: makeState({ campaignId: `inv-${String(index)}` }),
        terminationReason: 'NO_PROGRESS',
        newEvidence: 0,
        newCandidates: 0,
      });
    }
    expect(strategy.priorOutcomes).toHaveLength(MEMORY_CAPS.priorInvestigations);
    expect(strategy.priorOutcomes.map((item) => item.investigationId)).toEqual([
      'inv-3',
      'inv-4',
      'inv-5',
      'inv-6',
      'inv-7',
    ].slice(-MEMORY_CAPS.priorInvestigations));
    expect(strategy.investigationsCompleted).toBe(MEMORY_CAPS.priorInvestigations + 2);
    expect(strategy.stagnantInvestigations).toBe(MEMORY_CAPS.priorInvestigations + 2);
  });
});

test.describe('parseCampaignStrategyState', () => {
  test('a real strategy survives a JSON round-trip', async () => {
    const strategy = absorbInvestigationIntoStrategy(emptyCampaignStrategyState('campaign-memory-test'), {
      state: makeState({
        campaignId: 'campaign-memory-test',
        evidenceRefs: ['ev:src-a', 'ev:repro-a'],
        actionLog: [
          inspectAction('t1', 'src/a.ts', 'ev:src-a'),
          makeAction({
            turnId: 't2',
            toolId: 'RERUN_SAFE_REPRODUCTION',
            resultClass: 'REPRODUCED',
            evidenceRefs: ['ev:repro-a'],
            target: 'src/a.ts',
          }),
        ],
        candidateIds: ['cand-1'],
      }),
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 2,
      newCandidates: 1,
    });
    const parsed = parseCampaignStrategyState(
      JSON.parse(JSON.stringify(strategy)) as unknown,
      'campaign-memory-test',
    );
    expect(parsed).toEqual(strategy);
  });

  test('malformed or mismatched records fail closed to null', async () => {
    const strategy = emptyCampaignStrategyState('campaign-memory-test');
    const good = JSON.parse(JSON.stringify(strategy)) as Record<string, unknown>;
    expect(parseCampaignStrategyState({ ...good, schemaVersion: 'nightwatch.wrong.v9' }, 'campaign-memory-test')).toBeNull();
    expect(parseCampaignStrategyState(good, 'other-campaign')).toBeNull();
    expect(parseCampaignStrategyState({ ...good, investigationsCompleted: 1.5 }, 'campaign-memory-test')).toBeNull();
    expect(parseCampaignStrategyState({ ...good, investigationsCompleted: '1' }, 'campaign-memory-test')).toBeNull();
    expect(
      parseCampaignStrategyState(
        { ...good, inspectedTargets: Array.from({ length: MEMORY_CAPS.campaignTargets + 1 }, (_, index) => `src/t${String(index)}.ts`) },
        'campaign-memory-test',
      ),
    ).toBeNull();
    expect(
      parseCampaignStrategyState(
        {
          ...good,
          priorOutcomes: Array.from({ length: MEMORY_CAPS.priorInvestigations + 1 }, (_, index) => ({
            investigationId: `inv-${String(index)}`,
            terminationReason: 'NO_PROGRESS',
            newEvidence: 0,
            newCandidates: 0,
          })),
        },
        'campaign-memory-test',
      ),
    ).toBeNull();
    expect(parseCampaignStrategyState(null, 'campaign-memory-test')).toBeNull();
    expect(parseCampaignStrategyState('strategy', 'campaign-memory-test')).toBeNull();
    expect(parseCampaignStrategyState([], 'campaign-memory-test')).toBeNull();
  });
});
