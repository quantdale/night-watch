// D-178 / §9G — the pre-request monetary admission.
//
// The engine has no monetary ceiling field and conserves byte budgets
// reactively after each call, so nothing stopped a campaign from spending past
// an authorized amount. These cases prove the replacement: a metered call is
// admitted BEFORE dispatch only when its cumulative WORST-CASE cost fits the
// authorized ceiling, the provider is provably never invoked for a refused
// request, and a metered run without a declared ceiling fails closed.
//
// Stub reasoner drivers + stub tool executors only. No CLI spawn, no network.
import { test, expect } from '@playwright/test';
import {
  REASONER_TURN_RESPONSE_VERSION,
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { AgentRuntime } from '../../src/core/agentRuntime';
import {
  SPEND_CEILING_VERSION,
  admitMeteredRunSpendCeiling,
  admitProviderCall,
  admitResumedSpendCeiling,
  admitRunSpendCeiling,
  admitSpendCeilingIdentity,
  committedSpendUsd,
  validateSpendCeiling,
  worstCaseCallCostUsd,
  worstCaseTokensForBytes,
  type SpendCeiling,
} from '../../src/core/agentRuntime/spendCeiling';
import type {
  AgentRuntimeDeps,
  AgentToolCall,
  AgentToolExecutor,
  AgentToolResult,
} from '../../src/core/agentRuntime';

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-reasoner',
  provider: 'stub',
  model: 'stub-1',
};

/**
 * The D-177 verified OpenDesign rate card (USD per million tokens), paired
 * with tokenizer-impossible worst-case bounds: 1 token per request byte and a
 * conservative 16 bytes per generated token.
 */
function openDesignCeiling(maxSpendUsd: number, maxOutputTokensPerCall = 8192): SpendCeiling {
  return {
    schemaVersion: SPEND_CEILING_VERSION,
    maxSpendUsd,
    rateCard: { inputUsdPerMillionTokens: 0.015, outputUsdPerMillionTokens: 0.06 },
    maxOutputTokensPerCall,
    maxBytesPerToken: 16,
    worstCaseTokensPerByte: 1,
    provider: 'open-design',
    model: 'deepseek-v4.1-flash',
  };
}

function okTurn(intents: unknown[]): ReasonerCallResult {
  return {
    ok: true,
    response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] } as unknown as ReasonerTurnResponse,
    provenance: PROVENANCE,
    stdoutBytes: 128,
    stderrBytes: 0,
  };
}

function completeNoFinding(): ReasonerCallResult {
  return okTurn([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent]);
}

function formHypothesis(id: string): ReasonerCallResult {
  return okTurn([{ kind: 'FORM_HYPOTHESIS', hypothesisId: id, statement: `draft ${id}`, evidenceRefs: [`ev:sha256:${id}`] }]);
}

function stubTools(): AgentToolExecutor {
  return {
    async execute(_call: AgentToolCall): Promise<AgentToolResult> {
      return { ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 16, untrusted: [] };
    },
  };
}

function scriptDriver(script: readonly ReasonerCallResult[]) {
  const requests: ReasonerTurnRequest[] = [];
  let calls = 0;
  return {
    requests,
    get calls() {
      return calls;
    },
    driver: {
      protocolVersion: 'nightwatch.reasoner-driver.v1',
      transport: 'CLI',
      provenance: PROVENANCE,
      async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
        calls += 1;
        requests.push(request);
        return script[Math.min(calls - 1, script.length - 1)] ?? completeNoFinding();
      },
    } as AgentRuntimeDeps['reasoner'],
  };
}

function generousPolicy(): AgentBudgetPolicy {
  return {
    ...defaultAgentBudgetPolicy('HOUR_1'),
    wallTimeMs: 600_000,
    reasonerCalls: 50,
    inputBytes: 50_000_000,
    outputBytes: 50_000_000,
    toolActions: 50,
    failures: 20,
    consecutiveFailures: 20,
    providerFailures: 20,
  };
}

function depsFor(
  campaignId: string,
  driver: AgentRuntimeDeps['reasoner'],
  spendCeiling: SpendCeiling | undefined,
): AgentRuntimeDeps {
  return { campaignId, budgetPolicy: generousPolicy(), reasoner: driver, tools: stubTools(), spendCeiling };
}

test.describe('spend ceiling — worst-case arithmetic', () => {
  test('the worst case charges the full output bound and an impossible tokenizer', () => {
    const ceiling = openDesignCeiling(1);
    // 100,000 request bytes at 1 token/byte and $0.015/M, plus the full 8,192
    // output tokens at $0.06/M: 0.0015 + 0.00049152 = 0.00199152 USD.
    expect(worstCaseCallCostUsd(ceiling, 100_000)).toBeCloseTo(0.00199152, 10);
    expect(worstCaseTokensForBytes(ceiling, 100_000)).toBe(100_000);
  });

  test('committed spend is charged conservatively from recorded bytes', () => {
    const ceiling = openDesignCeiling(1);
    // 1,000,000 input bytes = 1M worst-case tokens = $0.015; 1,000,000 output
    // bytes = 1M worst-case tokens = $0.06.
    expect(committedSpendUsd(ceiling, 1_000_000, 1_000_000)).toBeCloseTo(0.075, 10);
  });

  test('equality with the ceiling is admitted; the next worst case is refused', () => {
    const ceiling = openDesignCeiling(0.00199152);
    const admitted = admitProviderCall({ ceiling, requestBytes: 100_000, committedInputBytes: 0, committedOutputBytes: 0 });
    expect(admitted.ok).toBe(true);
    const refused = admitProviderCall({ ceiling, requestBytes: 100_001, committedInputBytes: 0, committedOutputBytes: 0 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.code).toBe('SPEND_CEILING_REFUSED_BEFORE_REQUEST');
      // The refusal is sanitized: it names amounts, never a credential.
      expect(refused.detail).toContain('USD');
    }
  });

  test('a malformed or missing ceiling fails closed, never reads as free', () => {
    for (const bad of [undefined, null, {}, { schemaVersion: SPEND_CEILING_VERSION }, openDesignCeiling(0), openDesignCeiling(-1), { ...openDesignCeiling(1), maxSpendUsd: Number.NaN }]) {
      expect(validateSpendCeiling(bad)).toBe(false);
      const admission = admitRunSpendCeiling(bad);
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_UNAUTHORISED');
    }
    expect(admitRunSpendCeiling(openDesignCeiling(0.09)).ok).toBe(true);
  });
});

test.describe('spend ceiling — pre-request enforcement in the runtime', () => {
  test('a request that could exceed the ceiling is refused WITHOUT reaching the provider', async () => {
    const stub = scriptDriver([completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('campaign-spend-refuse', stub.driver, openDesignCeiling(0.000001)));
    const result = await runtime.run({ maxTurns: 3 });
    // The provider was never invoked: the refusal precedes dispatch.
    expect(stub.calls).toBe(0);
    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    const classes = result.state.actionLog.map((entry) => entry.resultClass);
    expect(classes).toContain('SPEND_CEILING_REFUSED_BEFORE_REQUEST');
  });

  test('a ceiling sized for one call admits it and refuses the next BEFORE dispatch', async () => {
    // Measure one rendered request against the deterministic stub (no ceiling),
    // then size the ceiling to exactly its worst case. The first call is
    // admitted at equality; after it commits usage, the second call's
    // cumulative worst case is strictly above the ceiling and is refused
    // before the provider is ever invoked.
    const measure = scriptDriver([formHypothesis('h-measure'), completeNoFinding()]);
    await new AgentRuntime(depsFor('campaign-spend-cumulative', measure.driver, undefined)).run({ maxTurns: 3 });
    expect(measure.calls).toBe(2);
    const requestBytes = Buffer.byteLength(JSON.stringify(measure.requests[0]), 'utf8');
    const oneCallWorstUsd = worstCaseCallCostUsd(openDesignCeiling(1), requestBytes);

    const tight = scriptDriver([formHypothesis('h-tight'), completeNoFinding()]);
    const runtime = new AgentRuntime(
      depsFor('campaign-spend-cumulative', tight.driver, openDesignCeiling(oneCallWorstUsd + 1e-9)),
    );
    const result = await runtime.run({ maxTurns: 3 });
    // Exactly the admitted call reached the provider; the refused one never did.
    expect(tight.calls).toBe(1);
    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    expect(result.state.actionLog.map((entry) => entry.resultClass)).toContain('SPEND_CEILING_REFUSED_BEFORE_REQUEST');
  });

  test('a generous ceiling dispatches normally and the run completes', async () => {
    const stub = scriptDriver([completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('campaign-spend-allow', stub.driver, openDesignCeiling(0.09)));
    const result = await runtime.run({ maxTurns: 3 });
    expect(stub.calls).toBe(1);
    expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
  });
});

test.describe('spend ceiling — metered-run, identity and resume admissions (D-183)', () => {
  test('a metered run is refused without a valid ceiling, a metered rate card, identity or the hard stop', () => {
    const ceiling = openDesignCeiling(0.09);
    const identity = { provider: 'open-design', model: 'deepseek-v4.1-flash' };
    const hardStop = 'open-design per-key spend limit <= 0.09 USD verified 2026-10-19';
    expect(admitMeteredRunSpendCeiling({ ceiling, ...identity, accountSideHardStop: hardStop }).ok).toBe(true);

    // Missing / malformed ceiling.
    for (const bad of [undefined, null, {}, 'free', openDesignCeiling(0)]) {
      const admission = admitMeteredRunSpendCeiling({ ceiling: bad, ...identity, accountSideHardStop: hardStop });
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_UNAUTHORISED');
    }

    // The "free" label bypass: a zero-rate card on a metered run is refused.
    const free = { ...openDesignCeiling(0.09), rateCard: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 } };
    const freeAdmission = admitMeteredRunSpendCeiling({ ceiling: free, ...identity, accountSideHardStop: hardStop });
    expect(freeAdmission.ok).toBe(false);
    if (!freeAdmission.ok) expect(freeAdmission.code).toBe('SPEND_CEILING_RATE_CARD_INVALID');

    // Identity disagreement / absence.
    for (const wrong of [{ provider: 'amr', model: 'deepseek-v4.1-flash' }, { provider: 'open-design', model: 'other' }, { provider: null, model: null }]) {
      const admission = admitMeteredRunSpendCeiling({ ceiling, ...wrong, accountSideHardStop: hardStop });
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_IDENTITY_MISMATCH');
    }

    // Unenforceable output bound: no account-side hard stop.
    for (const stop of [undefined, null, '', '   ']) {
      const admission = admitMeteredRunSpendCeiling({ ceiling, ...identity, accountSideHardStop: stop });
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_OUTPUT_BOUND_UNENFORCEABLE');
    }
  });

  test('identity agreement binds exactly one provider and model', () => {
    const ceiling = openDesignCeiling(0.09);
    expect(admitSpendCeilingIdentity(ceiling, { provider: 'open-design', model: 'deepseek-v4.1-flash' }).ok).toBe(true);
    for (const wrong of [{ provider: 'open-design', model: 'x' }, { provider: 'x', model: 'deepseek-v4.1-flash' }, { provider: '', model: 'deepseek-v4.1-flash' }, { provider: 'open-design', model: undefined }]) {
      const admission = admitSpendCeilingIdentity(ceiling, wrong);
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_IDENTITY_MISMATCH');
    }
  });

  test('a resume is held to the persisted ceiling: absent, widened and substituted are refused', () => {
    const persisted = openDesignCeiling(0.09);
    expect(admitResumedSpendCeiling({ persisted, supplied: openDesignCeiling(0.09) }).ok).toBe(true);

    // Absent on either side.
    for (const input of [
      { persisted: null, supplied: openDesignCeiling(0.09) },
      { persisted: openDesignCeiling(0.09), supplied: null },
      { persisted: openDesignCeiling(0.09), supplied: undefined },
    ]) {
      const admission = admitResumedSpendCeiling(input);
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_RESUME_ABSENT');
    }

    // Widened in each dimension (any loosening is a widening).
    const widenings: SpendCeiling[] = [
      openDesignCeiling(0.10),
      { ...openDesignCeiling(0.09), rateCard: { inputUsdPerMillionTokens: 0.014, outputUsdPerMillionTokens: 0.06 } },
      { ...openDesignCeiling(0.09), rateCard: { inputUsdPerMillionTokens: 0.015, outputUsdPerMillionTokens: 0.05 } },
      openDesignCeiling(0.09, 8193),
      { ...openDesignCeiling(0.09), worstCaseTokensPerByte: 0.5 },
      { ...openDesignCeiling(0.09), maxBytesPerToken: 17 },
    ];
    for (const widened of widenings) {
      const admission = admitResumedSpendCeiling({ persisted, supplied: widened });
      expect(admission.ok).toBe(false);
      if (!admission.ok) expect(admission.code).toBe('SPEND_CEILING_RESUME_WIDENED');
    }

    // Provider/model substitution is never a resume.
    const substituted = { ...openDesignCeiling(0.09), model: 'other' };
    const substitution = admitResumedSpendCeiling({ persisted, supplied: substituted });
    expect(substitution.ok).toBe(false);
    if (!substitution.ok) expect(substitution.code).toBe('SPEND_CEILING_RESUME_MISMATCH');

    // A pure tightening resumes (it can only over-reserve).
    const tightened = openDesignCeiling(0.08);
    expect(admitResumedSpendCeiling({ persisted, supplied: tightened }).ok).toBe(true);

    // A malformed persisted envelope is never assumed unlimited.
    const corrupt = admitResumedSpendCeiling({ persisted: { ...openDesignCeiling(0.09), maxSpendUsd: 'lots' }, supplied: openDesignCeiling(0.09) });
    expect(corrupt.ok).toBe(false);
    if (!corrupt.ok) expect(corrupt.code).toBe('SPEND_CEILING_RESUME_ABSENT');
  });
});
