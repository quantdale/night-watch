// W9 runtime lane: component byte-accounting invariants for
// nightwatch.agent-byte-ledger.v1. Stub drivers/executors only. No CLI spawn,
// no network.
import { test, expect } from '@playwright/test';
import {
  AGENT_BYTE_LEDGER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  UNTRUSTED_ENVELOPE_VERSION,
  ZERO_AGENT_BYTE_LEDGER,
  chargedOutputBytes,
  defaultAgentBudgetPolicy,
  type AgentBudgetPolicy,
  type AgentIntent,
  type ReasonerCallResult,
  type ReasonerProvenance,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
  type UntrustedEnvelope,
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

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
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
        const entry = script[Math.min(calls - 1, script.length - 1)]!;
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

function depsFor(
  campaignId: string,
  driver: AgentRuntimeDeps['reasoner'],
  tools: AgentToolExecutor,
  policy?: AgentBudgetPolicy,
): AgentRuntimeDeps {
  return { campaignId, budgetPolicy: policy ?? generousPolicy(), reasoner: driver, tools };
}

function envelopeWith(bytes: string): UntrustedEnvelope {
  return {
    schemaVersion: UNTRUSTED_ENVELOPE_VERSION,
    trust: 'UNTRUSTED',
    source: 'SOURCE_CODE',
    digest: 'untrusted:sha256:0123456789abcdef01234567',
    bytes,
  };
}

function terminateResponse(): ReasonerTurnResponse {
  return {
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent],
    hypotheses: [],
  };
}

test.describe('w9 charged-output identity', () => {
  test('exact known bytes: output equals stdout plus stderr plus tool result', async () => {
    const toolResponse = okResponse([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } }]);
    const stub = scriptDriver([
      () => ({ ok: true, response: toolResponse, provenance: PROVENANCE, stdoutBytes: 1000, stderrBytes: 200 }),
      () => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 50, stderrBytes: 10 }),
    ]);
    const tools = stubTools(() => ({ ok: true, resultClass: 'SOURCE_FILE', evidenceRefs: [], outputBytes: 500, untrusted: [envelopeWith('hello')] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-exact', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 4 });
    const ledger = result.state.byteLedger!;

    expect(ledger.schemaVersion).toBe(AGENT_BYTE_LEDGER_VERSION);
    expect(ledger.providerStdoutBytes).toBe(1050);
    expect(ledger.providerStderrBytes).toBe(210);
    expect(ledger.toolResultBytes).toBe(500);
    expect(ledger.toolEnvelopeBytes).toBe(utf8Bytes('hello'));
    expect(ledger.parsedResponseBytes).toBe(utf8Bytes(JSON.stringify(toolResponse)) + utf8Bytes(JSON.stringify(terminateResponse())));
    expect(result.state.budget.usage.inputBytes).toBe(ledger.requestBytes);
    expect(result.state.budget.usage.outputBytes).toBe(1000 + 200 + 50 + 10 + 500);
    expect(result.state.budget.usage.outputBytes).toBe(chargedOutputBytes(ledger));
    expect(ledger.requestMemoryBytes).toBeLessThanOrEqual(ledger.requestBytes);
    expect(ledger.requestUntrustedBytes).toBeLessThanOrEqual(ledger.requestBytes);
  });

  test('whitespace and JSONL framing does not inflate parsed accounting', async () => {
    const response = okResponse([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' } as AgentIntent]);
    const stub = scriptDriver([
      // Transport framing (whitespace-padded JSONL) is charged once as stdout;
      // the canonical parsed document is measured separately and never charged.
      () => ({ ok: true, response, provenance: PROVENANCE, stdoutBytes: 5000, stderrBytes: 100 }),
    ]);
    const tools = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 0, untrusted: [] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-framing', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 2 });
    const ledger = result.state.byteLedger!;

    expect(ledger.providerStdoutBytes).toBe(5000);
    expect(ledger.parsedResponseBytes).toBe(utf8Bytes(JSON.stringify(response)));
    expect(ledger.parsedResponseBytes).toBeLessThan(ledger.providerStdoutBytes);
    expect(result.state.budget.usage.outputBytes).toBe(5100);
    expect(result.state.budget.usage.outputBytes).toBe(chargedOutputBytes(ledger));
  });

  test('failed provider calls record transport bytes with zero parsed bytes', async () => {
    const stub = scriptDriver([
      () => ({ ok: false, class: 'TIMEOUT', provenance: PROVENANCE, stdoutBytes: 300, stderrBytes: 40 }),
      () => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 50, stderrBytes: 10 }),
    ]);
    const tools = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 0, untrusted: [] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-failed-call', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 3 });
    const ledger = result.state.byteLedger!;

    expect(ledger.providerStdoutBytes).toBe(350);
    expect(ledger.providerStderrBytes).toBe(50);
    expect(ledger.parsedResponseBytes).toBe(utf8Bytes(JSON.stringify(terminateResponse())));
    expect(result.state.budget.usage.outputBytes).toBe(400);
    expect(result.state.budget.usage.outputBytes).toBe(chargedOutputBytes(ledger));
    expect(result.state.budget.usage.providerFailures).toBe(1);
  });

  test('tool output is charged pre-truncation while envelopes measure post-truncation bytes', async () => {
    const stub = scriptDriver([
      () => ({
        ok: true,
        response: okResponse([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/big.ts' } }]),
        provenance: PROVENANCE,
        stdoutBytes: 100,
        stderrBytes: 0,
      }),
      () => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 20, stderrBytes: 0 }),
    ]);
    const tools = stubTools(() => ({
      ok: true,
      resultClass: 'SOURCE_FILE',
      evidenceRefs: [],
      outputBytes: 100_000,
      untrusted: [envelopeWith('x'.repeat(100))],
    }));
    const runtime = new AgentRuntime(depsFor('w9-acct-envelope', stub.driver, tools));
    const result = await runtime.run({ maxTurns: 3 });
    const ledger = result.state.byteLedger!;

    expect(ledger.toolResultBytes).toBe(100_000);
    expect(ledger.toolEnvelopeBytes).toBe(100);
    expect(result.state.budget.usage.outputBytes).toBe(100 + 20 + 100_000);
    expect(result.state.budget.usage.outputBytes).toBe(chargedOutputBytes(ledger));
  });
});

test.describe('w9 ledger snapshot, checkpoint, and resume', () => {
  test('checkpoint round-trips the ledger and resume folds new turns', async () => {
    const first = scriptDriver([
      () => ({
        ok: true,
        response: okResponse([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/r.ts' } }]),
        provenance: PROVENANCE,
        stdoutBytes: 400,
        stderrBytes: 20,
      }),
      () => ({ ok: true, response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents: [{ kind: 'PAUSE' }], hypotheses: [] } as unknown as ReasonerTurnResponse, provenance: PROVENANCE, stdoutBytes: 60, stderrBytes: 5 }),
    ]);
    const executor = stubTools(() => ({ ok: true, resultClass: 'SOURCE_FILE', evidenceRefs: [], outputBytes: 250, untrusted: [envelopeWith('abc')] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-resume', first.driver, executor));
    const paused = await runtime.run({ maxTurns: 4 });
    expect(paused.terminationReason).toBe('PAUSED');
    expect(paused.checkpoint).not.toBeNull();

    const pausedLedger = paused.state.byteLedger!;
    expect(parseCheckpoint(paused.checkpoint).state.byteLedger).toEqual(pausedLedger);
    expect(paused.state.budget.usage.outputBytes).toBe(chargedOutputBytes(pausedLedger));

    const second = scriptDriver([() => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 70, stderrBytes: 8 })]);
    const resumed = AgentRuntime.resumeFromCheckpoint(paused.checkpoint, depsFor('w9-acct-resume', second.driver, executor));
    expect(resumed.snapshot().byteLedger).toEqual(pausedLedger);
    const finished = await resumed.run({ maxTurns: 4 });
    const folded = finished.state.byteLedger!;

    expect(folded.requestBytes).toBeGreaterThan(pausedLedger.requestBytes);
    expect(folded.providerStdoutBytes).toBe(pausedLedger.providerStdoutBytes + 70);
    expect(folded.providerStderrBytes).toBe(pausedLedger.providerStderrBytes + 8);
    expect(folded.toolResultBytes).toBe(pausedLedger.toolResultBytes);
    expect(finished.state.budget.usage.inputBytes).toBe(folded.requestBytes);
    expect(finished.state.budget.usage.outputBytes).toBe(chargedOutputBytes(folded));
  });

  test('pre-W9 checkpoints without a ledger resume with a zero ledger', async () => {
    const first = scriptDriver([
      () => ({
        ok: true,
        response: okResponse([{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/r.ts' } }]),
        provenance: PROVENANCE,
        stdoutBytes: 400,
        stderrBytes: 20,
      }),
      () => ({ ok: true, response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents: [{ kind: 'PAUSE' }], hypotheses: [] } as unknown as ReasonerTurnResponse, provenance: PROVENANCE, stdoutBytes: 60, stderrBytes: 5 }),
    ]);
    const executor = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 8, untrusted: [] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-legacy', first.driver, executor));
    const paused = await runtime.run({ maxTurns: 4 });
    expect(paused.checkpoint).not.toBeNull();

    const legacy = JSON.parse(JSON.stringify(paused.checkpoint)) as Record<string, unknown>;
    delete (legacy['state'] as Record<string, unknown>)['byteLedger'];
    const parsed = parseCheckpoint(legacy);
    expect(parsed.state.byteLedger).toBeUndefined();

    const second = scriptDriver([() => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 10, stderrBytes: 0 })]);
    const resumed = AgentRuntime.resumeFromCheckpoint(parsed, depsFor('w9-acct-legacy', second.driver, executor));
    expect(resumed.snapshot().byteLedger).toEqual(ZERO_AGENT_BYTE_LEDGER);
    expect(resumed.snapshot().budget.usage.inputBytes).toBe(paused.state.budget.usage.inputBytes);
    const finished = await resumed.run({ maxTurns: 3 });
    expect(finished.state.byteLedger!.requestBytes).toBeGreaterThan(0);
  });

  test('malformed ledgers and unknown dispositions fail closed', async () => {
    const stub = scriptDriver([() => ({ ok: true, response: terminateResponse(), provenance: PROVENANCE, stdoutBytes: 10, stderrBytes: 0 })]);
    const runtime = new AgentRuntime(depsFor('w9-acct-corrupt', stub.driver, stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 0, untrusted: [] }))));
    await runtime.run({ maxTurns: 2 });
    const good = JSON.parse(JSON.stringify(runtime.checkpoint())) as Record<string, unknown>;
    const state = good['state'] as Record<string, unknown>;

    for (const badLedger of [
      { ...ZERO_AGENT_BYTE_LEDGER, schemaVersion: 'bogus' },
      { ...ZERO_AGENT_BYTE_LEDGER, requestBytes: -1 },
      { ...ZERO_AGENT_BYTE_LEDGER, toolResultBytes: 'many' },
      { ...ZERO_AGENT_BYTE_LEDGER, providerStdoutBytes: Number.NaN },
    ]) {
      expect(() => parseCheckpoint({ ...good, state: { ...state, byteLedger: badLedger } })).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
    }
    expect(() =>
      parseCheckpoint({
        ...good,
        state: { ...state, actionLog: [{ turnId: 't', phase: 'PLAN', intentKind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', argumentDigest: 'arg:sha256:0123456789abcdef01234567', resultClass: 'TOOL_ERROR', evidenceRefs: [], disposition: 'RETRY_FOREVER' }] },
      }),
    ).toThrow(/AGENT_CHECKPOINT_CORRUPT/);
  });

  test('the HOUR_1 output ceiling still terminates a runaway', async () => {
    const policy: AgentBudgetPolicy = { ...generousPolicy(), outputBytes: 500 };
    let hypotheses = 0;
    const stub = scriptDriver([
      () => {
        hypotheses += 1;
        return {
          ok: true,
          response: okResponse([
            { kind: 'FORM_HYPOTHESIS', hypothesisId: `h-${hypotheses}`, statement: `runaway draft ${hypotheses}`, evidenceRefs: [] },
          ]),
          provenance: PROVENANCE,
          stdoutBytes: 1000,
          stderrBytes: 0,
        };
      },
    ]);
    const tools = stubTools(() => ({ ok: true, resultClass: 'OBSERVATION', evidenceRefs: [], outputBytes: 0, untrusted: [] }));
    const runtime = new AgentRuntime(depsFor('w9-acct-ceiling', stub.driver, tools, policy));
    const result = await runtime.run({ maxTurns: 5 });

    expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
    expect(result.checkpoint).not.toBeNull();
    expect(result.state.budget.usage.outputBytes).toBeGreaterThanOrEqual(500);
    expect(result.state.budget.usage.outputBytes).toBe(chargedOutputBytes(result.state.byteLedger!));
    expect(defaultAgentBudgetPolicy('HOUR_1').outputBytes).toBe(2_000_000);
  });
});
