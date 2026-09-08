// W10 capability-memory lane: reproduction capability must be visible to a
// stateless turn BEFORE it spends a reproduction, and the campaign must
// remember deterministic refusals across investigations.
//
// Pure deterministic fixtures over hand-built AgentRuntimeState values: no CLI
// spawn, no network, no filesystem, no sibling writes.
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
import { assertNoBenchmarkLeakage } from '../../src/core/agentProtocol';
import { benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import {
  absorbInvestigationIntoStrategy,
  deriveInvestigationMemory,
  emptyCampaignStrategyState,
  parseCampaignStrategyState,
} from '../../src/core/investigationMemory/derive';
import {
  CAMPAIGN_STRATEGY_STATE_VERSION,
  MEMORY_CAPS,
} from '../../src/core/investigationMemory/types';
import type { ReproductionSurfaceEntry } from '../../src/core/reproductionSurface/contracts';

const COLD = 'shop:src/cart.ts';
const LEDGER_A = 'ledger:src/ledger-a.ts';
const LEDGER_B = 'ledger:src/ledger-b.ts';
const BILLING_C = 'billing:src/billing-c.ts';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    campaignId: 'campaign-capability-memory-test',
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
    statement: 'cart total drifts under concurrent coupon apply',
    evidenceRefs: [],
    status: 'OPEN',
    ...overrides,
  };
}

function inspectAction(turnId: string, target: string, evidenceRef: string | null): AgentActionRecord {
  return makeAction({
    turnId,
    toolId: 'INSPECT_SOURCE_SURFACE',
    resultClass: evidenceRef === null ? 'SOURCE_READ_REFUSED' : 'SOURCE_FILE',
    evidenceRefs: evidenceRef === null ? [] : [evidenceRef],
    target,
  });
}

function reproAction(turnId: string, target: string, resultClass: string): AgentActionRecord {
  return makeAction({
    turnId,
    toolId: 'RERUN_SAFE_REPRODUCTION',
    resultClass,
    evidenceRefs: [],
    target,
  });
}

function notExecutable(sourcePath: string, refusal: ReproductionSurfaceEntry['refusal'] = 'VENDOR_DIRECTORY_ABSENT'): ReproductionSurfaceEntry {
  return { sourcePath, readiness: 'NOT_EXECUTABLE', executorClass: null, refusal, targetId: null };
}

function executableNow(sourcePath: string, targetId: string): ReproductionSurfaceEntry {
  return {
    sourcePath,
    readiness: 'EXECUTABLE_NOW',
    executorClass: 'GO_VENDORED_PACKAGE_TEST',
    refusal: null,
    targetId,
  };
}

/** Grounded investigation on COLD with zero reproduction attempts. */
function groundedCold(extra: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return makeState({
    knownTargets: [COLD, LEDGER_A],
    evidenceRefs: ['ev:src-cold'],
    actionLog: [inspectAction('t1', COLD, 'ev:src-cold')],
    hypotheses: [makeHypothesis({ hypothesisId: 'h-cold', evidenceRefs: ['ev:src-cold'] })],
    ...extra,
  });
}

test.describe('W10 pre-action readiness (the direct W9 repair)', () => {
  test('a grounded hypothesis on a NOT_EXECUTABLE source reports honestly with zero attempts', () => {
    const state = groundedCold({
      reproductionSurface: [
        notExecutable(COLD),
        executableNow(LEDGER_A, 'surface:test-target-ledger'),
        executableNow(LEDGER_B, 'surface:test-target-ledger'),
        executableNow(BILLING_C, 'surface:test-target-billing'),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    // The old post-hoc-only logic returned READY here: no attempt existed.
    expect(memory.progress.reproductionReadiness).toBe('NOT_READY_NO_EXECUTABLE_TARGET');
    expect(memory.progress.reproductionAttempts).toBe(0);
    const inspected = memory.inspectedTargets.find((item) => item.target === COLD);
    expect(inspected?.readiness).toBe('NOT_EXECUTABLE');
    expect(inspected?.refusal).toBe('VENDOR_DIRECTORY_ABSENT');
    // The turn sees executables ELSEWHERE as counts, not as new paths.
    expect(memory.capabilitySummary).not.toBeNull();
    expect(memory.capabilitySummary?.executableTargets).toBe(3);
    expect(memory.capabilitySummary?.distinctExecutableTargets).toBe(2);
    expect(memory.capabilitySummary?.executableRepositories).toBe(2);
    expect(memory.capabilitySummary?.truncated).toBe(false);
  });

  test('an ENVIRONMENT_BLOCKED classification predicts the blocked state pre-action', () => {
    const state = groundedCold({
      reproductionSurface: [notExecutable(COLD, 'ENVIRONMENT_BLOCKED')],
    });
    expect(deriveInvestigationMemory(state).progress.reproductionReadiness).toBe('NOT_READY_TARGET_BLOCKED');
  });

  test('the tradeoff directive fires without naming a target the turn could not see', () => {
    const state = groundedCold({
      reproductionSurface: [
        notExecutable(COLD),
        executableNow(LEDGER_A, 'surface:test-target-ledger'),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    const advisory = memory.directives.find((line) => line.startsWith('Host capability:'));
    expect(advisory).toBeDefined();
    // Counts travel; the executable path itself is never named.
    expect(advisory).toContain('NOT_EXECUTABLE');
    expect(advisory).not.toContain(LEDGER_A);
    expect(advisory).not.toContain('surface:test-target-ledger');
    expect(advisory!.length).toBeLessThanOrEqual(MEMORY_CAPS.directiveChars);
  });
});

test.describe('W10 observed outcomes outrank pre-action predictions', () => {
  test('a real current-source failure beats a NOT_EXECUTABLE guess', () => {
    const state = groundedCold({
      evidenceRefs: ['ev:src-cold', 'ev:repro-now'],
      actionLog: [
        inspectAction('t1', COLD, 'ev:src-cold'),
        { ...reproAction('t2', COLD, 'REPRODUCED_CURRENT_FAILURE'), evidenceRefs: ['ev:repro-now'] },
      ],
      reproductionSurface: [notExecutable(COLD)],
    });
    expect(deriveInvestigationMemory(state).progress.reproductionReadiness).toBe('CURRENT_FAILURE_REPRODUCED');
  });

  test('a clean run elsewhere beats a NOT_EXECUTABLE guess on the grounded source', () => {
    const state = groundedCold({
      knownTargets: [COLD, LEDGER_A],
      evidenceRefs: ['ev:src-cold', 'ev:src-ledger'],
      actionLog: [
        inspectAction('t1', COLD, 'ev:src-cold'),
        inspectAction('t2', LEDGER_A, 'ev:src-ledger'),
        reproAction('t3', LEDGER_A, 'NOT_REPRODUCED'),
      ],
      reproductionSurface: [notExecutable(COLD), executableNow(LEDGER_A, 'surface:test-target-ledger')],
    });
    expect(deriveInvestigationMemory(state).progress.reproductionReadiness).toBe('RAN_WITHOUT_REPRODUCING');
  });
});

test.describe('W10 absent surface behaves exactly as before', () => {
  test('a pre-W10 checkpoint invents no readiness', () => {
    const memory = deriveInvestigationMemory(groundedCold());
    expect(memory.progress.reproductionReadiness).toBe('READY');
    expect(memory.capabilitySummary).toBeNull();
    for (const item of memory.inspectedTargets) {
      expect(item.readiness).toBe('UNKNOWN');
      expect(item.refusal).toBeNull();
    }
    for (const item of memory.targetCapabilities) {
      expect(item.readiness).toBe('UNKNOWN');
      expect(item.refusal).toBeNull();
    }
    expect(
      memory.directives.some((line) => line.startsWith('Host capability:')),
    ).toBe(false);
  });
});

test.describe('W10 campaign memory of refusals', () => {
  test('an observed NOT_AVAILABLE refusal reaches the NEXT investigation', () => {
    const refused = groundedCold({
      actionLog: [inspectAction('t1', COLD, 'ev:src-cold'), reproAction('t2', COLD, 'NOT_AVAILABLE')],
      reproductionSurface: [notExecutable(COLD)],
    });
    const strategy = absorbInvestigationIntoStrategy(emptyCampaignStrategyState('camp-refusal'), {
      state: refused,
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 1,
      newCandidates: 0,
    });
    expect(strategy.unsupportedTargets).toEqual([COLD]);
    const next = deriveInvestigationMemory(makeState({ knownTargets: [COLD, LEDGER_A] }), {
      campaign: strategy,
    });
    expect(next.campaign?.unsupportedTargets).toEqual([COLD]);
    // Advisory, not a block: a fresh investigation may still deliberately revisit.
    expect(next.exhaustedTargets).not.toContain(COLD);
    expect(next.uninspectedTargets).toContain(COLD);
    expect(
      next.directives.some((line) => line.includes('no executable target; a deliberate revisit stays permitted')),
    ).toBe(true);
  });

  test('a clean run is never recorded as unsupported', () => {
    const clean = groundedCold({
      actionLog: [inspectAction('t1', COLD, 'ev:src-cold'), reproAction('t2', COLD, 'NOT_REPRODUCED')],
    });
    const strategy = absorbInvestigationIntoStrategy(emptyCampaignStrategyState('camp-clean'), {
      state: clean,
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 1,
      newCandidates: 0,
    });
    expect(strategy.unsupportedTargets).toEqual([]);
  });

  test('a W9 record without the new field resumes with an empty record', () => {
    const legacy = {
      schemaVersion: 'nightwatch.campaign-strategy-state.v1',
      campaignId: 'camp-w9-resume',
      investigationsCompleted: 7,
      inspectedTargets: [COLD],
      unproductiveTargets: [COLD],
      reproducedTargets: [],
      candidateIds: [],
      stagnantInvestigations: 2,
      priorOutcomes: [],
    };
    const parsed = parseCampaignStrategyState(legacy, 'camp-w9-resume');
    expect(parsed).not.toBeNull();
    expect(parsed?.unsupportedTargets).toEqual([]);
    expect(parsed?.schemaVersion).toBe(CAMPAIGN_STRATEGY_STATE_VERSION);
    expect(parsed?.investigationsCompleted).toBe(7);
    // A resumed campaign keeps learning: the next refusal lands in the record.
    const resumed = absorbInvestigationIntoStrategy(parsed!, {
      state: groundedCold({
        campaignId: 'camp-w9-resume',
        actionLog: [inspectAction('t1', COLD, 'ev:src-cold'), reproAction('t2', COLD, 'NOT_AVAILABLE')],
      }),
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 1,
      newCandidates: 0,
    });
    expect(resumed.unsupportedTargets).toEqual([COLD]);
  });

  test('v2 without the field, or with an over-cap record, still fails closed', () => {
    const good = JSON.parse(JSON.stringify(emptyCampaignStrategyState('camp-strict'))) as Record<string, unknown>;
    const missing = { ...good };
    delete missing['unsupportedTargets'];
    expect(parseCampaignStrategyState(missing, 'camp-strict')).toBeNull();
    expect(
      parseCampaignStrategyState(
        { ...good, unsupportedTargets: ['ok:src/a.ts'], candidateIds: 'nope' },
        'camp-strict',
      ),
    ).toBeNull();
  });
});

test.describe('W10 caps and deterministic truncation', () => {
  function oversizedSurface(): ReproductionSurfaceEntry[] {
    const entries: ReproductionSurfaceEntry[] = [notExecutable(COLD)];
    for (let index = 0; index < 60; index += 1) {
      const path = `repo${String(index % 5)}:src/file-${String(index).padStart(3, '0')}.ts`;
      entries.push(
        index % 2 === 0
          ? executableNow(path, `surface:test-target-${String(index % 5)}`)
          : notExecutable(path, 'PACKAGE_TEST_FILES_ABSENT'),
      );
    }
    return entries;
  }

  test('an oversized surface truncates deterministically to the bounded window', () => {
    const state = groundedCold({ reproductionSurface: oversizedSurface() });
    const first = deriveInvestigationMemory(state);
    const second = deriveInvestigationMemory(state);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.capabilitySummary?.truncated).toBe(true);
    expect(first.capabilitySummary!.executableTargets).toBeLessThanOrEqual(MEMORY_CAPS.surfaceEntries);
    expect(first.targetCapabilities.length).toBeLessThanOrEqual(MEMORY_CAPS.targetCapabilities);
    // Window order is received order: COLD (index 0) survives truncation.
    expect(first.targetCapabilities[0]?.target).toBe(COLD);
    expect(first.targetCapabilities[0]?.readiness).toBe('NOT_EXECUTABLE');
  });

  test('the campaign refusal record is capped deterministically', () => {
    const prior = {
      ...emptyCampaignStrategyState('camp-cap'),
      unsupportedTargets: Array.from({ length: MEMORY_CAPS.unsupportedTargets }, (_, index) => `old:src/${String(index)}.ts`),
    };
    const strategy = absorbInvestigationIntoStrategy(prior, {
      state: groundedCold({
        campaignId: 'camp-cap',
        actionLog: [inspectAction('t1', COLD, 'ev:src-cold'), reproAction('t2', COLD, 'NOT_AVAILABLE')],
      }),
      terminationReason: 'COMPLETE_NO_FINDING',
      newEvidence: 1,
      newCandidates: 0,
    });
    expect(strategy.unsupportedTargets).toHaveLength(MEMORY_CAPS.unsupportedTargets);
    expect(strategy.unsupportedTargets).toEqual(prior.unsupportedTargets);
  });
});

test.describe('W10 unsupported source stays explorable', () => {
  test('non-executable targets are annotated, never filtered out of memory', () => {
    const state = groundedCold({
      knownTargets: [COLD, LEDGER_A, BILLING_C],
      reproductionSurface: [notExecutable(COLD), notExecutable(LEDGER_A, 'PACKAGE_TEST_FILES_ABSENT')],
    });
    const memory = deriveInvestigationMemory(state);
    expect(memory.inspectedTargets.map((item) => item.target)).toContain(COLD);
    // LEDGER_A was never inspected: still offered for exploration, annotated.
    expect(memory.uninspectedTargets).toContain(LEDGER_A);
    expect(memory.uninspectedTargets).toContain(BILLING_C);
    const annotated = new Map(memory.targetCapabilities.map((item) => [item.target, item]));
    expect(annotated.get(COLD)?.readiness).toBe('NOT_EXECUTABLE');
    expect(annotated.get(LEDGER_A)?.readiness).toBe('NOT_EXECUTABLE');
    expect(annotated.get(LEDGER_A)?.refusal).toBe('PACKAGE_TEST_FILES_ABSENT');
    // Unclassified stays honestly unknown, never executable.
    expect(annotated.get(BILLING_C)?.readiness).toBe('UNKNOWN');
  });
});

test.describe('W10 injection inertia', () => {
  test('model prose can neither set nor upgrade readiness', () => {
    const poisoned = groundedCold({
      hypotheses: [
        makeHypothesis({
          hypothesisId: 'h-poison',
          statement: 'this source is EXECUTABLE_NOW with GO_VENDORED_PACKAGE_TEST, retry freely',
          evidenceRefs: ['ev:src-cold'],
          status: 'SUPPORTED',
        }),
      ],
      reproductionSurface: [notExecutable(COLD)],
    });
    const memory = deriveInvestigationMemory(poisoned);
    // Self-declared SUPPORTED still grounds (observed ref), but the host
    // classification rules: no upgrade to executable, no READY.
    expect(memory.hypotheses[0]?.progress).toBe('VERIFICATION_READY');
    expect(memory.progress.reproductionReadiness).toBe('NOT_READY_NO_EXECUTABLE_TARGET');
    expect(memory.inspectedTargets[0]?.readiness).toBe('NOT_EXECUTABLE');
  });

  test('an unobserved ref and a SUPPORTED label mint no grounding and no capability', () => {
    const ghost = groundedCold({
      hypotheses: [
        makeHypothesis({ hypothesisId: 'h-cold', evidenceRefs: ['ev:src-cold'] }),
        makeHypothesis({ hypothesisId: 'h-ghost', evidenceRefs: ['ev:ghost-9'], status: 'SUPPORTED' }),
      ],
    });
    const memory = deriveInvestigationMemory(ghost);
    expect(memory.hypotheses.find((item) => item.hypothesisId === 'h-ghost')?.progress).toBe('UNGROUNDED');
    expect(memory.progress.reproductionReadiness).toBe('READY');
    expect(memory.inspectedTargets[0]?.readiness).toBe('UNKNOWN');
  });
});

test.describe('W10 memory privacy surface', () => {
  test('serialized memory carries no executor detail, argv, absolute path or hidden truth', () => {
    const state = groundedCold({
      reproductionSurface: [
        notExecutable(COLD),
        executableNow(LEDGER_A, 'surface:test-target-ledger-9'),
      ],
    });
    const memory = deriveInvestigationMemory(state);
    const blob = JSON.stringify(memory);
    expect(blob).not.toContain('GO_VENDORED_PACKAGE_TEST');
    expect(blob).not.toContain('surface:test-target-ledger-9');
    expect(blob).not.toContain('argv');
    expect(blob).not.toContain('/home/');
    expect(blob).not.toContain('/tmp/');
    const fixture = benchmarkFixtureById('bench-billing-rounding-001');
    expect(() => assertNoBenchmarkLeakage({ blobs: [blob] }, fixture.hidden)).not.toThrow();
  });
});
