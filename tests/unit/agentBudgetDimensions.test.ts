// Lane D: separated budget dimensions. Provider transport and executor tool
// payload are charged and bounded independently, so a tool-heavy local
// campaign is bounded by its own payload ceiling instead of tripping the
// model-output guard. Stub drivers/executors only. No CLI spawn, no network.
import { test, expect } from '@playwright/test';
import {
  AGENT_BUDGET_VERSION_V1,
  REASONER_TURN_RESPONSE_VERSION,
  chargedInputBytes,
  chargedOutputBytes,
  chargedToolPayloadBytes,
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { AgentRuntime, parseCheckpoint } from '../../src/core/agentRuntime';
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

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[]) {
  return {
    driver: {
      protocolVersion: 'nightwatch.reasoner-driver.v1',
      transport: 'CLI',
      provenance: PROVENANCE,
      async complete(request: ReasonerTurnRequest): Promise<ReasonerCallResult> {
        void request;
        const entry = script.shift() ?? (() => completeNoFinding());
        return entry(request);
      },
    } as AgentRuntimeDeps['reasoner'],
  };
}

function stubTools(
  behavior: (call: AgentToolCall) => AgentToolResult,
): AgentToolExecutor & { calls: AgentToolCall[] } {
  const calls: AgentToolCall[] = [];
  return {
    calls,
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      calls.push(call);
      return behavior(call);
    },
  };
}

function generousPolicy(): AgentBudgetPolicy {
  return {
    ...defaultAgentBudgetPolicy('HOUR_1'),
    wallTimeMs: 600_000,
    reasonerCalls: 50,
    inputBytes: 50_000_000,
    outputBytes: 50_000_000,
    toolPayloadBytes: 500_000_000,
    toolActions: 500,
    candidateCap: 20,
    retries: 20,
    consecutiveFailures: 20,
    providerFailures: 20,
  };
}

function depsFor(
  campaignId: string,
  driver: AgentRuntimeDeps['reasoner'],
  tools: AgentToolExecutor,
  policy?: AgentBudgetPolicy,
): AgentRuntimeDeps {
  return { campaignId, budgetPolicy: policy ?? generousPolicy(), reasoner: driver, tools };
}

function okResponse(intents: unknown[]): ReasonerTurnResponse {
  return {
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: intents as AgentIntent[],
    hypotheses: [],
  };
}

function terminateResponse(): ReasonerTurnResponse {
  return {
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent],
    hypotheses: [],
  };
}

function inspectTurn(stdoutBytes: number, stderrBytes = 0): ScriptEntry {
  return () => ({
    ok: true,
    response: okResponse([
      { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } },
    ]),
    provenance: PROVENANCE,
    stdoutBytes,
    stderrBytes,
  });
}

function completeNoFinding(): ReasonerCallResult {
  return {
    ok: true,
    response: terminateResponse(),
    provenance: PROVENANCE,
    stdoutBytes: 10,
    stderrBytes: 0,
  };
}

function sourceFileTools(outputBytes: number): AgentToolExecutor & { calls: AgentToolCall[] } {
  return stubTools(() => ({
    ok: true,
    resultClass: 'SOURCE_FILE',
    evidenceRefs: [],
    outputBytes,
    untrusted: [],
  }));
}

test.describe('lane D separated budget dimensions', () => {
  test('a runaway model terminates on the provider-transport ceiling', async () => {
    const policy: AgentBudgetPolicy = { ...generousPolicy(), outputBytes: 5000 };
    const stub = scriptDriver([inspectTurn(4000), inspectTurn(4000), () => ({
      ok: true,
      response: terminateResponse(),
      provenance: PROVENANCE,
      stdoutBytes: 10,
      stderrBytes: 0,
    })]);
    // A megabyte per tool call: if tool bytes still charged output, this
    // would trip instantly for the wrong reason; here they must not.
    const tools = sourceFileTools(1_000_000);
    const runtime = new AgentRuntime(depsFor('lane-d-runaway', stub.driver, tools, policy));
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    expect(result.checkpoint).not.toBeNull();
    expect(tools.calls).toHaveLength(2);
    const usage = result.state.budget.usage;
    const ledger = result.state.byteLedger!;
    expect(usage.outputBytes).toBe(8000);
    expect(usage.outputBytes).toBeGreaterThanOrEqual(5000);
    expect(usage.toolPayloadBytes).toBe(2_000_000);
    expect(usage.toolPayloadBytes).toBeLessThan(policy.toolPayloadBytes);
    expect(usage.inputBytes).toBe(chargedInputBytes(ledger));
    expect(usage.outputBytes).toBe(chargedOutputBytes(ledger));
    expect(usage.toolPayloadBytes).toBe(chargedToolPayloadBytes(ledger));
  });

  test('a heavy tool payload terminates on its own ceiling', async () => {
    const policy: AgentBudgetPolicy = { ...generousPolicy(), toolPayloadBytes: 5000 };
    const stub = scriptDriver([inspectTurn(100), inspectTurn(100), () => ({
      ok: true,
      response: terminateResponse(),
      provenance: PROVENANCE,
      stdoutBytes: 10,
      stderrBytes: 0,
    })]);
    const tools = sourceFileTools(4000);
    const runtime = new AgentRuntime(depsFor('lane-d-payload', stub.driver, tools, policy));
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    expect(tools.calls).toHaveLength(2);
    const usage = result.state.budget.usage;
    const ledger = result.state.byteLedger!;
    // Transport stayed tiny: only the payload dimension tripped.
    expect(usage.outputBytes).toBe(200);
    expect(usage.outputBytes).toBeLessThan(policy.outputBytes);
    expect(usage.toolPayloadBytes).toBe(8000);
    expect(usage.inputBytes).toBe(chargedInputBytes(ledger));
    expect(usage.outputBytes).toBe(chargedOutputBytes(ledger));
    expect(usage.toolPayloadBytes).toBe(chargedToolPayloadBytes(ledger));
  });

  test('v1 checkpoint resume charges the mixed total once, in the payload dimension', async () => {
    const first = scriptDriver([inspectTurn(1000, 200)]);
    const tools = sourceFileTools(500);
    const runtime = new AgentRuntime(depsFor('lane-d-v1-resume', first.driver, tools));
    await runtime.run({ maxTurns: 1 });
    const v2 = JSON.parse(JSON.stringify(runtime.checkpoint())) as Record<string, unknown>;
    const v2State = v2['state'] as Record<string, unknown>;
    const v2Budget = v2State['budget'] as Record<string, unknown>;
    const v2Usage = v2Budget['usage'] as Record<string, unknown>;
    const v2Ledger = v2State['byteLedger'] as Record<string, unknown>;

    // Downgrade to exactly what a v1 runtime would have persisted: no payload
    // dimension anywhere, and the mixed transport+tool total under output.
    const mixedOutput = (v2Usage['outputBytes'] as number) + (v2Ledger['toolResultBytes'] as number);
    const v1 = JSON.parse(JSON.stringify(v2)) as Record<string, unknown>;
    const v1State = v1['state'] as Record<string, unknown>;
    const v1Budget = v1State['budget'] as Record<string, unknown>;
    const v1Policy = v1Budget['policy'] as Record<string, unknown>;
    const v1Usage = v1Budget['usage'] as Record<string, unknown>;
    const v1Ledger = v1State['byteLedger'] as Record<string, unknown>;
    v1Policy['schemaVersion'] = AGENT_BUDGET_VERSION_V1;
    delete v1Policy['toolPayloadBytes'];
    v1Usage['outputBytes'] = mixedOutput;
    delete v1Usage['toolPayloadBytes'];
    delete v1Ledger['legacyToolPayloadBytes'];
    expect(mixedOutput).toBe(1700);

    const parsed = parseCheckpoint(v1);
    // A v1 total mixes transport with payload, so it is not a v2 outputBytes
    // value: it moves whole into the payload dimension, where measurement
    // shows nearly all of it belongs and where the ceiling is sized for it.
    expect(parsed.state.budget.usage.outputBytes).toBe(0);
    expect(parsed.state.budget.usage.toolPayloadBytes).toBe(1700);
    expect(parsed.state.budget.policy.outputBytes).toBe(defaultAgentBudgetPolicy('HOUR_1').outputBytes);
    expect(parsed.state.budget.policy.toolPayloadBytes).toBe(
      defaultAgentBudgetPolicy('HOUR_1').toolPayloadBytes,
    );
    // The v1 component breakdown is ambiguous once the dimensions split, so
    // the parser rebuilds exact carry rather than inventing components.
    expect(parsed.state.byteLedger!.legacyOutputBytes).toBe(0);
    expect(parsed.state.byteLedger!.legacyToolPayloadBytes).toBe(1700);
    expect(parsed.state.byteLedger!.toolResultBytes).toBe(0);

    const second = scriptDriver([inspectTurn(50), () => ({
      ok: true,
      response: terminateResponse(),
      provenance: PROVENANCE,
      stdoutBytes: 10,
      stderrBytes: 0,
    })]);
    const resumed = AgentRuntime.resumeFromCheckpoint(
      parsed,
      depsFor('lane-d-v1-resume', second.driver, sourceFileTools(70)),
    );
    expect(resumed.snapshot().budget.usage.toolPayloadBytes).toBe(1700);
    expect(resumed.snapshot().budget.usage.outputBytes).toBe(0);
    const finished = await resumed.run({ maxTurns: 3 });
    const usage = finished.state.budget.usage;
    const ledger = finished.state.byteLedger!;
    // Every pre-restore byte stays charged exactly once, and fresh traffic
    // lands in the dimension that produced it.
    expect(usage.toolPayloadBytes).toBe(1700 + 70);
    expect(usage.outputBytes).toBe(50 + 10);
    expect(usage.inputBytes).toBe(chargedInputBytes(ledger));
    expect(usage.outputBytes).toBe(chargedOutputBytes(ledger));
    expect(usage.toolPayloadBytes).toBe(chargedToolPayloadBytes(ledger));
  });

  test('a v1 campaign larger than the new transport ceiling still resumes', async () => {
    const first = scriptDriver([inspectTurn(1000, 200)]);
    const runtime = new AgentRuntime(depsFor('lane-d-v1-heavy', first.driver, sourceFileTools(500)));
    await runtime.run({ maxTurns: 1 });
    const document = JSON.parse(JSON.stringify(runtime.checkpoint())) as Record<string, unknown>;
    const state = document['state'] as Record<string, unknown>;
    const budget = state['budget'] as Record<string, unknown>;
    const policy = budget['policy'] as Record<string, unknown>;
    const usage = budget['usage'] as Record<string, unknown>;
    const ledger = state['byteLedger'] as Record<string, unknown>;
    // A real owner-local v1 campaign accumulated megabytes of source reads
    // under the old mixed total — far past the new transport ceiling.
    const mixed = 3_000_000;
    policy['schemaVersion'] = AGENT_BUDGET_VERSION_V1;
    delete policy['toolPayloadBytes'];
    usage['outputBytes'] = mixed;
    delete usage['toolPayloadBytes'];
    ledger['providerResponseBytes'] = mixed - (ledger['toolResultBytes'] as number) - (ledger['providerStderrBytes'] as number);
    delete ledger['legacyToolPayloadBytes'];
    expect(mixed).toBeGreaterThan(defaultAgentBudgetPolicy('HOUR_1').outputBytes);

    const parsed = parseCheckpoint(document);
    const resumed = AgentRuntime.resumeFromCheckpoint(
      parsed,
      depsFor('lane-d-v1-heavy', scriptDriver([completeNoFinding]).driver, sourceFileTools(10), defaultAgentBudgetPolicy('HOUR_1')),
    );
    const finished = await resumed.run({ maxTurns: 2 });
    // Charging those bytes against the transport ceiling would end the
    // campaign before it executed a single turn.
    expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(finished.state.budget.usage.toolPayloadBytes).toBe(mixed);
    expect(finished.state.budget.usage.outputBytes).toBeLessThan(defaultAgentBudgetPolicy('HOUR_1').outputBytes);
  });

  test('malformed v2 budgets fail closed', async () => {
    const stub = scriptDriver([inspectTurn(100)]);
    const runtime = new AgentRuntime(
      depsFor('lane-d-corrupt', stub.driver, sourceFileTools(10)),
    );
    await runtime.run({ maxTurns: 1 });
    const good = JSON.parse(JSON.stringify(runtime.checkpoint())) as Record<string, unknown>;
    const mutateBudget = (
      mutate: (budget: Record<string, unknown>) => void,
    ): Record<string, unknown> => {
      const clone = JSON.parse(JSON.stringify(good)) as Record<string, unknown>;
      mutate((clone['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>);
      return clone;
    };
    expect(() => parseCheckpoint(good)).not.toThrow();
    // Missing, mistyped, or negative payload dimension on either half.
    const policyOf = (doc: Record<string, unknown>): Record<string, unknown> =>
      ((doc['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>)[
        'policy'
      ] as Record<string, unknown>;
    const usageOf = (doc: Record<string, unknown>): Record<string, unknown> =>
      ((doc['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>)[
        'usage'
      ] as Record<string, unknown>;
    expect(() =>
      parseCheckpoint(mutateBudget((budget) => delete (budget['policy'] as Record<string, unknown>)['toolPayloadBytes'])),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() =>
      parseCheckpoint(mutateBudget((budget) => delete (budget['usage'] as Record<string, unknown>)['toolPayloadBytes'])),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() =>
      parseCheckpoint(
        mutateBudget((budget) => {
          (budget['usage'] as Record<string, unknown>)['toolPayloadBytes'] = -1;
        }),
      ),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() =>
      parseCheckpoint(
        mutateBudget((budget) => {
          (budget['policy'] as Record<string, unknown>)['toolPayloadBytes'] = 'many';
        }),
      ),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() =>
      parseCheckpoint(
        mutateBudget((budget) => {
          (budget['policy'] as Record<string, unknown>)['schemaVersion'] = 'nightwatch.agent-budget.v99';
        }),
      ),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    // A v1 schema with an underivable tier cannot migrate honestly either.
    expect(() =>
      parseCheckpoint(
        mutateBudget((budget) => {
          const policy = budget['policy'] as Record<string, unknown>;
          policy['schemaVersion'] = AGENT_BUDGET_VERSION_V1;
          policy['ceilingName'] = 'FORTNIGHT';
          delete policy['toolPayloadBytes'];
          delete (budget['usage'] as Record<string, unknown>)['toolPayloadBytes'];
        }),
      ),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(policyOf(good)['schemaVersion']).toBe('nightwatch.agent-budget.v2');
    expect(usageOf(good)['toolPayloadBytes']).toBe(10);
  });
});
