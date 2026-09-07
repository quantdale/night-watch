// W9 runtime lane: host-owned disposition retry semantics over the frozen
// agent protocol. Stub reasoner drivers + stub tool executors only. No CLI
// spawn, no network.
import { test, expect } from '@playwright/test';
import {
  REASONER_TURN_RESPONSE_VERSION,
  TRANSIENT_ACTION_RETRY_BUDGET,
  defaultAgentBudgetPolicy,
  validateReasonerTurnResponse,
  type AgentBudgetPolicy,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { AgentRuntime } from '../../src/core/agentRuntime';
import type {
  AgentRuntimeDeps,
  AgentToolCall,
  AgentToolExecutor,
  AgentToolResult,
} from '../../src/core/agentRuntime';
import { prefixedDigest24 } from '../../src/core/identity/canonicalDigest';

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

function callTool(toolId: string, args: Record<string, unknown>, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'CALL_TOOL', toolId, arguments: args, ...extra };
}

type ScriptEntry = (request: ReasonerTurnRequest) => ReasonerCallResult;

function scriptDriver(script: ScriptEntry[]) {
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

function depsFor(campaignId: string, driver: AgentRuntimeDeps['reasoner'], tools: AgentToolExecutor): AgentRuntimeDeps {
  return { campaignId, budgetPolicy: generousPolicy(), reasoner: driver, tools };
}

const REPRO_ARGS = { sourcePath: 'src/same.ts', sourceEvidenceRef: 'ev:sha256:same' };

function reproTurn(extra: Record<string, unknown> = {}): ScriptEntry {
  return () => okTurn([callTool('RERUN_SAFE_REPRODUCTION', { ...REPRO_ARGS }, extra)]);
}

function deterministicTools(): AgentToolExecutor & { calls: AgentToolCall[] } {
  return stubTools(() => ({
    ok: false,
    resultClass: 'REPRODUCTION_REFUSED',
    evidenceRefs: [],
    outputBytes: 8,
    untrusted: [],
    disposition: 'DETERMINISTIC_TERMINAL',
  }));
}

test.describe('w9 deterministic and environment exhaustion', () => {
  test('deterministic terminal failures execute once then exhaust', async () => {
    const tools = deterministicTools();
    const stub = scriptDriver([reproTurn(), reproTurn(), reproTurn(), () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-deterministic', stub.driver, tools));
    await runtime.run({ maxTurns: 5 });

    expect(TRANSIENT_ACTION_RETRY_BUDGET).toBe(2);
    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(1);
    expect(runtime.snapshot().actionLog.map((item) => item.resultClass)).toEqual([
      'TOOL_ERROR',
      'DEDUPED_REPEAT',
      'DEDUPED_REPEAT',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
    expect(runtime.snapshot().actionLog[0]!.disposition).toBe('DETERMINISTIC_TERMINAL');
  });

  test('environment blocked failures execute once then exhaust', async () => {
    const tools = stubTools(() => ({
      ok: false,
      resultClass: 'REPRODUCTION_BLOCKED',
      evidenceRefs: [],
      outputBytes: 8,
      untrusted: [],
      disposition: 'ENVIRONMENT_BLOCKED',
    }));
    const stub = scriptDriver([reproTurn(), reproTurn(), () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-env-blocked', stub.driver, tools));
    await runtime.run({ maxTurns: 4 });

    expect(tools.calls).toHaveLength(1);
    expect(runtime.snapshot().actionLog.map((item) => item.resultClass)).toEqual([
      'TOOL_ERROR',
      'DEDUPED_REPEAT',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
    expect(runtime.snapshot().actionLog[0]!.disposition).toBe('ENVIRONMENT_BLOCKED');
  });

  test('legacy failures without disposition exhaust like deterministic', async () => {
    const tools = stubTools(() => ({ ok: false, resultClass: 'REPRODUCTION_REFUSED', evidenceRefs: [], outputBytes: 8, untrusted: [] }));
    const read = () => okTurn([callTool('INSPECT_SOURCE_SURFACE', { path: 'src/other.ts' })]);
    const stub = scriptDriver([reproTurn(), read, reproTurn(), () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-legacy', stub.driver, tools));
    await runtime.run({ maxTurns: 5 });

    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(1);
    expect(runtime.snapshot().actionLog[0]!.disposition).toBeUndefined();
  });
});

test.describe('w9 transient retry budget', () => {
  test('transient failure recovers on the second attempt', async () => {
    let attempts = 0;
    const tools = stubTools(() => {
      attempts += 1;
      if (attempts === 1) {
        return { ok: false, resultClass: 'TRANSIENT_RACE', evidenceRefs: [], outputBytes: 8, untrusted: [], disposition: 'TRANSIENT_RETRYABLE' };
      }
      return { ok: true, resultClass: 'SOURCE_FILE', evidenceRefs: ['ev:sha256:recovered'], outputBytes: 32, untrusted: [] };
    });
    const inspect = () => okTurn([callTool('INSPECT_SOURCE_SURFACE', { path: 'src/flaky.ts' })]);
    const stub = scriptDriver([inspect, inspect, () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-transient-recovery', stub.driver, tools));
    await runtime.run({ maxTurns: 4 });

    expect(tools.calls).toHaveLength(2);
    expect(runtime.snapshot().actionLog.map((item) => item.resultClass)).toEqual([
      'TOOL_ERROR',
      'SOURCE_FILE',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
    expect(runtime.snapshot().actionLog[0]!.disposition).toBe('TRANSIENT_RETRYABLE');
    expect(runtime.snapshot().evidenceRefs).toContain('ev:sha256:recovered');
  });

  test('persistent transient failures exhaust at the budget ceiling', async () => {
    const tools = stubTools(() => ({
      ok: false,
      resultClass: 'TRANSIENT_RACE',
      evidenceRefs: [],
      outputBytes: 8,
      untrusted: [],
      disposition: 'TRANSIENT_RETRYABLE',
    }));
    const stub = scriptDriver([reproTurn(), reproTurn(), reproTurn(), reproTurn(), () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-transient-ceiling', stub.driver, tools));
    await runtime.run({ maxTurns: 6 });

    expect(TRANSIENT_ACTION_RETRY_BUDGET).toBe(2);
    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(TRANSIENT_ACTION_RETRY_BUDGET);
    expect(runtime.snapshot().actionLog.map((item) => item.resultClass)).toEqual([
      'TOOL_ERROR',
      'TOOL_ERROR',
      'DEDUPED_REPEAT',
      'DEDUPED_REPEAT',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
  });

  test('unrelated actions between attempts do not reset the transient budget', async () => {
    const tools = stubTools((call) =>
      call.toolId === 'RERUN_SAFE_REPRODUCTION'
        ? { ok: false, resultClass: 'TRANSIENT_RACE', evidenceRefs: [], outputBytes: 8, untrusted: [], disposition: 'TRANSIENT_RETRYABLE' }
        : { ok: true, resultClass: 'SOURCE_FILE', evidenceRefs: [`ev:sha256:${call.turnId}`], outputBytes: 32, untrusted: [] },
    );
    const read = () => okTurn([callTool('INSPECT_SOURCE_SURFACE', { path: 'src/other.ts' })]);
    const stub = scriptDriver([reproTurn(), read, reproTurn(), read, reproTurn(), () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-interleaved', stub.driver, tools));
    await runtime.run({ maxTurns: 7 });

    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(2);
    expect(runtime.snapshot().actionLog.map((item) => item.resultClass)).toEqual([
      'TOOL_ERROR',
      'SOURCE_FILE',
      'TOOL_ERROR',
      'SOURCE_FILE',
      'DEDUPED_REPEAT',
      'TERMINATED_COMPLETE_NO_FINDING',
    ]);
  });

  test('changed canonical arguments are a fresh fingerprint', async () => {
    const tools = stubTools((call) =>
      (call.arguments['sourcePath'] as string) === 'src/same.ts'
        ? { ok: false, resultClass: 'TRANSIENT_RACE', evidenceRefs: [], outputBytes: 8, untrusted: [], disposition: 'TRANSIENT_RETRYABLE' }
        : { ok: true, resultClass: 'SOURCE_FILE', evidenceRefs: ['ev:sha256:fresh'], outputBytes: 32, untrusted: [] },
    );
    const same = () => okTurn([callTool('RERUN_SAFE_REPRODUCTION', { ...REPRO_ARGS })]);
    const fresh = () =>
      okTurn([callTool('RERUN_SAFE_REPRODUCTION', { sourcePath: 'src/fresh.ts', sourceEvidenceRef: 'ev:sha256:fresh' })]);
    const stub = scriptDriver([same, same, fresh, () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-fresh-digest', stub.driver, tools));
    await runtime.run({ maxTurns: 5 });

    expect(tools.calls.filter((call) => (call.arguments['sourcePath'] as string) === 'src/same.ts')).toHaveLength(2);
    expect(tools.calls.filter((call) => (call.arguments['sourcePath'] as string) === 'src/fresh.ts')).toHaveLength(1);
  });
});

test.describe('w9 digest forgery and self-label resistance', () => {
  test('identical args cannot rotate digests to evade exhaustion', async () => {
    const tools = deterministicTools();
    const forgedA = 'arg:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    const forgedB = 'arg:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
    const stub = scriptDriver([
      reproTurn({ argumentDigest: forgedA }),
      reproTurn({ argumentDigest: forgedB }),
      reproTurn(),
      () => completeNoFinding(),
    ]);
    const runtime = new AgentRuntime(depsFor('w9-digest-rotation', stub.driver, tools));
    await runtime.run({ maxTurns: 5 });

    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(1);
    const digests = new Set(tools.calls.map((call) => call.argumentDigest));
    expect(digests.size).toBe(1);
    expect([...digests][0]).toBe(prefixedDigest24('arg', REPRO_ARGS));
  });

  test('validate recomputes the digest and drops forged values', () => {
    const args = { path: 'src/same.ts' };
    const forged = 'arg:sha256:cccccccccccccccccccccccc';
    const parsed = validateReasonerTurnResponse(
      {
        schemaVersion: REASONER_TURN_RESPONSE_VERSION,
        intents: [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: args, argumentDigest: forged }],
        hypotheses: [],
      },
      { authorizedEnvironments: ['LOCAL'] },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.intents).toHaveLength(1);
    const intent = parsed.value.intents[0]!;
    expect(intent.kind).toBe('CALL_TOOL');
    if (intent.kind !== 'CALL_TOOL') return;
    expect(intent.argumentDigest).toBe(prefixedDigest24('arg', args));
    expect(intent.argumentDigest).not.toBe(forged);
  });

  test('the reasoner cannot self-label retryability through intent fields', async () => {
    const tools = stubTools(() => ({ ok: false, resultClass: 'REPRODUCTION_REFUSED', evidenceRefs: [], outputBytes: 8, untrusted: [] }));
    const labelled = () =>
      okTurn([callTool('RERUN_SAFE_REPRODUCTION', { ...REPRO_ARGS }, { disposition: 'TRANSIENT_RETRYABLE' })]);
    const stub = scriptDriver([labelled, labelled, () => completeNoFinding()]);
    const runtime = new AgentRuntime(depsFor('w9-self-label', stub.driver, tools));
    await runtime.run({ maxTurns: 4 });

    expect(tools.calls.filter((call) => call.toolId === 'RERUN_SAFE_REPRODUCTION')).toHaveLength(1);
    expect(runtime.snapshot().actionLog[0]!.disposition).toBeUndefined();
  });
});
