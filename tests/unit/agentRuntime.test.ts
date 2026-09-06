// Lane A focused suite: AgentRuntime over the frozen agent protocol.
// Stub reasoner drivers + stub tool executors only. No CLI spawn, no network.
import { test, expect } from '@playwright/test';
import {
  AGENT_PROTOCOL_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { AgentRuntime, parseCheckpoint, AgentCheckpointError } from '../../src/core/agentRuntime';
import type {
  AgentRuntimeDeps,
  AgentToolCall,
  AgentToolExecutor,
  AgentToolResult,
} from '../../src/core/agentRuntime';

void AGENT_PROTOCOL_VERSION;

const PROVENANCE: ReasonerProvenance = {
  transport: 'CLI',
  executableBasename: 'stub-reasoner',
  provider: 'stub',
  model: 'stub-1',
};

function okTurn(intents: unknown[], hypotheses: unknown[] = []): ReasonerCallResult {
  return {
    ok: true,
    response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses } as unknown as ReasonerTurnResponse,
    provenance: PROVENANCE,
    stdoutBytes: 128,
    stderrBytes: 0,
  };
}

function terminateTurn(reason: AgentIntent): ReasonerCallResult {
  return okTurn([reason]);
}

function completeNoFinding(): ReasonerCallResult {
  return terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent);
}

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[], onRequest?: (request: ReasonerTurnRequest) => void) {
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
        onRequest?.(request);
        const entry = script[Math.min(calls - 1, script.length - 1)] ?? (() => completeNoFinding());
        return entry(request);
      },
    } as AgentRuntimeDeps['reasoner'],
  };
}

function stubTools(behavior: (call: AgentToolCall) => AgentToolResult): AgentToolExecutor & { calls: AgentToolCall[] } {
  const calls: AgentToolCall[] = [];
  return {
    calls,
    async execute(call: AgentToolCall): Promise<AgentToolResult> {
      calls.push(call);
      return behavior(call);
    },
  };
}

const quietTools = () =>
  stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 16, untrusted: [] }));

function generousPolicy(): AgentBudgetPolicy {
  return {
    ...defaultAgentBudgetPolicy('HOUR_1'),
    wallTimeMs: 600_000,
    reasonerCalls: 50,
    inputBytes: 50_000_000,
    outputBytes: 50_000_000,
    toolActions: 50,
    candidateCap: 20,
    retries: 20,
    consecutiveFailures: 20,
    providerFailures: 20,
  };
}

function depsFor(campaignId: string, driver: AgentRuntimeDeps['reasoner'], tools: AgentToolExecutor, policy?: AgentBudgetPolicy): AgentRuntimeDeps {
  return { campaignId, budgetPolicy: policy ?? generousPolicy(), reasoner: driver, tools };
}

test.describe('agentRuntime loop phases', () => {
  test('cycles PLAN through REPLAN in order', async () => {
    const script: ScriptEntry[] = [];
    for (let index = 1; index <= 7; index += 1) {
      const id = `h-phase-${index}`;
      script.push(() => okTurn([{ kind: 'FORM_HYPOTHESIS', hypothesisId: id, statement: `phase draft ${id}`, evidenceRefs: [`ev:sha256:p${id}`] }]));
    }
    script.push(() => completeNoFinding());
    const stub = scriptDriver(script);
    const runtime = new AgentRuntime(depsFor('campaign-phases', stub.driver, quietTools()));
    const result = await runtime.run({ maxTurns: 8 });

    expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(stub.requests.map((request) => request.observation.phase)).toEqual([
      'PLAN',
      'OBSERVE',
      'ANALYZE',
      'HYPOTHESIZE',
      'VERIFY',
      'TRIAGE',
      'REPLAN',
      'PLAN',
    ]);
    expect(result.state.hypotheses.map((item) => item.hypothesisId)).toEqual([
      'h-phase-1',
      'h-phase-2',
      'h-phase-3',
      'h-phase-4',
      'h-phase-5',
      'h-phase-6',
      'h-phase-7',
    ]);
    expect(result.state.budget.usage.reasonerCalls).toBe(8);
  });

  test('campaign state accumulates hypotheses, evidence, and candidates', async () => {
    const tools = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: ['ev:sha256:abc'], outputBytes: 32, untrusted: [] }));
    const stub = scriptDriver([
      () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } }]),
      () => okTurn([{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-1', statement: 'null deref on empty input', evidenceRefs: ['ev:sha256:abc'] }]),
      () => okTurn([{ kind: 'PROPOSE_CANDIDATE', candidateId: 'c-1', evidenceRefs: ['ev:sha256:abc'] }]),
      () => terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' } as AgentIntent),
    ]);
    const runtime = new AgentRuntime(depsFor('campaign-state', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 6 });
    expect(result.terminationReason).toBe('COMPLETE_WITH_FINDING');
    expect(result.state.campaignId).toBe('campaign-state');
    expect(result.state.evidenceRefs).toContain('ev:sha256:abc');
    expect(result.state.hypotheses).toHaveLength(1);
    expect(result.state.hypotheses[0]).toMatchObject({ hypothesisId: 'h-1', status: 'OPEN' });
    expect(result.state.candidateIds).toEqual(['c-1']);
    expect(result.state.actionLog.map((item) => item.resultClass)).toEqual([
      'OBSERVATION',
      'HYPOTHESIS_FORMED',
      'CANDIDATE_PROPOSED',
      'TERMINATED_COMPLETE_WITH_FINDING',
    ]);
    expect(result.state.budget.usage.toolActions).toBe(1);
    expect(result.state.budget.usage.candidateCount).toBe(1);
    expect(result.checkpoint).toBeNull();
  });
});

test.describe('agentRuntime intent validation', () => {
const REJECTION_CASES: Array<{ name: string; intents: unknown[] }> = [
  { name: 'unknown intent kind', intents: [{ kind: 'FLY_TO_MOON' }] },
  { name: 'unsafe privileged intent', intents: [{ kind: 'SHELL', command: 'rm -rf /' }] },
  { name: 'unknown tool id', intents: [{ kind: 'CALL_TOOL', toolId: 'HACK_THE_PLANET', arguments: {} }] },
  {
    name: 'unauthorized environment tool',
    intents: [{ kind: 'CALL_TOOL', toolId: 'REQUEST_BROWSER_OBSERVATION', arguments: { url: 'https://dev.example' } }],
  },
];

for (const rejection of REJECTION_CASES) {
  test(`rejects ${rejection.name} fail-closed without executing tools`, async () => {
    const tools = quietTools();
    const stub = scriptDriver([() => okTurn(rejection.intents)]);
    const runtime = new AgentRuntime(depsFor('campaign-blocked', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 3 });

    expect(result.terminationReason).toBe('SAFETY_BLOCKED');
    expect(tools.calls).toHaveLength(0);
    expect(result.state.actionLog).toHaveLength(1);
    expect(result.state.actionLog[0]!.resultClass).toMatch(/^SAFETY_BLOCKED_/);
    expect(result.checkpoint).toBeNull();
  });
}
});

test.describe('agentRuntime loop guards', () => {
  test('repeated identical actions are deduped, not re-executed', async () => {
    const tools = quietTools();
    const callTool = () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/same.ts' } }]);
    const stub = scriptDriver([callTool, callTool, callTool, callTool]);
    const runtime = new AgentRuntime(depsFor('campaign-dedupe', stub.driver, tools));
    await runtime.run({ maxTurns: 4 });

    expect(tools.calls).toHaveLength(3);
    const classes = runtime.snapshot().actionLog.map((item) => item.resultClass);
    expect(classes).toEqual(['OBSERVATION', 'OBSERVATION', 'OBSERVATION', 'DEDUPED_REPEAT']);
  });

  test('no-progress loop terminates instead of spinning', async () => {
    const tools = quietTools();
    const callTool = () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/loop.ts' } }]);
    const stub = scriptDriver([callTool, callTool, callTool, callTool, callTool, callTool, callTool, callTool]);
    const runtime = new AgentRuntime(depsFor('campaign-stall', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 10 });

    expect(result.terminationReason).toBe('NO_PROGRESS');
    expect(tools.calls).toHaveLength(3);
    expect(result.state.actionLog).toHaveLength(7);
    expect(result.state.actionLog[result.state.actionLog.length - 1]!.resultClass).toBe('NO_PROGRESS_DETECTED');
  });

  test('budget exhaustion checkpoints instead of succeeding', async () => {
    const policy: AgentBudgetPolicy = { ...generousPolicy(), toolActions: 1 };
    const executor = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 8, untrusted: [] }));
    let n = 0;
    const stub = scriptDriver([
      () => {
        n += 1;
        if (n === 1) return okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/one.ts' } }]);
        return terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' } as AgentIntent);
      },
    ]);
    const runtime = new AgentRuntime(depsFor('campaign-budget', stub.driver, executor, policy));
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    expect(result.checkpoint).not.toBeNull();
    expect(result.checkpoint!.campaignId).toBe('campaign-budget');
    expect(result.checkpoint!.resumeCursor).toContain('campaign-budget');
    expect(parseCheckpoint(result.checkpoint)).toEqual(result.checkpoint);
  });
});

test.describe('agentRuntime pause, resume, and cancel', () => {
  test('pause checkpoints and resume continues without duplicating side effects', async () => {
    const executor = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: ['ev:sha256:resume'], outputBytes: 8, untrusted: [] }));
    const first = scriptDriver([
      () => okTurn([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/r.ts' } }]),
      () => okTurn([{ kind: 'PAUSE' }]),
    ]);
    const runtime = new AgentRuntime(depsFor('campaign-pause', first.driver, executor));
    const paused = await runtime.run({ maxTurns: 5 });

    expect(paused.terminationReason).toBe('PAUSED');
    expect(paused.checkpoint).not.toBeNull();
    expect(runtime.view.status).toBe('PAUSED');
    expect(executor.calls).toHaveLength(1);

    const second = scriptDriver([() => terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent)]);
    const resumed = AgentRuntime.resumeFromCheckpoint(paused.checkpoint, depsFor('campaign-pause', second.driver, executor));
    const finished = await resumed.run({ maxTurns: 5 });

    expect(finished.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(executor.calls).toHaveLength(1);
    expect(finished.state.actionLog.map((item) => item.resultClass)).toEqual([
      'OBSERVATION',
      'PAUSED',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
    const turnIds = finished.state.actionLog.map((item) => item.turnId);
    expect(new Set(turnIds).size).toBe(turnIds.length);
  });

  test('external cancel before the loop terminates CANCELLED', async () => {
    const tools = quietTools();
    const stub = scriptDriver([() => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('campaign-cancel', stub.driver, tools));
    runtime.cancel();
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('CANCELLED');
    expect(stub.calls).toBe(0);
    expect(runtime.snapshot().status).toBe('TERMINATED');
  });

  test('CANCEL intent terminates CANCELLED', async () => {
    const stub = scriptDriver([() => okTurn([{ kind: 'CANCEL' }])]);
    const runtime = new AgentRuntime(depsFor('campaign-intent-cancel', stub.driver, quietTools()));
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('CANCELLED');
    expect(result.checkpoint).toBeNull();
  });
});

test.describe('agentRuntime checkpoints', () => {
  test('corrupt checkpoints fail closed', async () => {
    const tools = quietTools();
    const stub = scriptDriver([() => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('campaign-corrupt', stub.driver, tools));
    await runtime.run({ maxTurns: 2 });
    const good = runtime.checkpoint();

    expect(() => parseCheckpoint({})).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() => parseCheckpoint({ ...good, schemaVersion: 'bogus' })).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() => parseCheckpoint({ ...good, resumeCursor: 'not-a-cursor' })).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() => parseCheckpoint({ ...good, state: { ...good.state, phase: 'FLY' } })).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    expect(() => AgentRuntime.resumeFromCheckpoint({ ...good, campaignId: 'other-campaign' }, depsFor('campaign-corrupt', stub.driver, tools))).toThrow(
      AgentCheckpointError,
    );
    expect(() => AgentRuntime.resumeFromCheckpoint(null, depsFor('campaign-corrupt', stub.driver, tools))).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
  });

  test('checkpoints never carry credentials, cookies, tokens, or customer secrets', async () => {
    const secret = 'Bearer abcdefghijklmnop-12345678';
    const executor = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: ['ev:sha256:clean'], outputBytes: 8, untrusted: [] }));
    const stub = scriptDriver([
      () =>
        okTurn([
          {
            kind: 'CALL_TOOL',
            toolId: 'INSPECT_SOURCE_SURFACE',
            arguments: { path: 'src/s.ts', Authorization: secret, cookie: 'session=xyz', customerSecret: 'shh' },
          },
        ]),
      () => okTurn([{ kind: 'PAUSE' }]),
    ]);
    const runtime = new AgentRuntime(depsFor('campaign-secrets', stub.driver, executor));
    const result = await runtime.run({ maxTurns: 4 });

    expect(result.terminationReason).toBe('PAUSED');
    const serialized = JSON.stringify(result.checkpoint);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('session=xyz');
    expect(serialized).not.toContain('customerSecret');
    expect(serialized).not.toContain('shh');
    expect(parseCheckpoint(result.checkpoint)).toEqual(result.checkpoint);
  });
});

test.describe('agentRuntime isolation', () => {
  test('two concurrent campaigns keep fully separate state', async () => {
    const toolsA = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: ['ev:sha256:a'], outputBytes: 8, untrusted: [] }));
    const toolsB = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: ['ev:sha256:b'], outputBytes: 8, untrusted: [] }));
    const driverA = scriptDriver([
      () => okTurn([{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-a', statement: 'hypothesis A', evidenceRefs: ['ev:sha256:a'] }]),
      () => okTurn([{ kind: 'PROPOSE_CANDIDATE', candidateId: 'c-a', evidenceRefs: ['ev:sha256:a'] }]),
      () => terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' } as AgentIntent),
    ]);
    const driverB = scriptDriver([
      () => okTurn([{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-b', statement: 'hypothesis B', evidenceRefs: [] }]),
      () => terminateTurn({ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent),
    ]);
    const runtimeA = new AgentRuntime(depsFor('campaign-iso-a', driverA.driver, toolsA));
    const runtimeB = new AgentRuntime(depsFor('campaign-iso-b', driverB.driver, toolsB));

    const [resultA, resultB] = await Promise.all([runtimeA.run({ maxTurns: 5 }), runtimeB.run({ maxTurns: 5 })]);

    expect(resultA.terminationReason).toBe('COMPLETE_WITH_FINDING');
    expect(resultB.terminationReason).toBe('COMPLETE_NO_FINDING');
    expect(resultA.state.hypotheses.map((item) => item.hypothesisId)).toEqual(['h-a']);
    expect(resultB.state.hypotheses.map((item) => item.hypothesisId)).toEqual(['h-b']);
    expect(resultA.state.candidateIds).toEqual(['c-a']);
    expect(resultB.state.candidateIds).toEqual([]);
    expect(resultA.state.evidenceRefs).toEqual(['ev:sha256:a']);
    expect(resultB.state.evidenceRefs).toEqual([]);
    expect(resultA.state.campaignId).toBe('campaign-iso-a');
    expect(resultB.state.campaignId).toBe('campaign-iso-b');
    for (const record of resultA.state.actionLog) expect(record.turnId).toContain('campaign-iso-a');
    for (const record of resultB.state.actionLog) expect(record.turnId).toContain('campaign-iso-b');
  });
});
