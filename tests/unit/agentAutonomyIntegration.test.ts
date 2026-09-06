import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  REASONER_TURN_RESPONSE_VERSION,
  defaultAgentBudgetPolicy,
} from '../../src/core/agentProtocol';
import { AgentRuntime } from '../../src/core/agentRuntime';
import type { AgentToolExecutor } from '../../src/core/agentRuntime';
import { createCliReasonerDriver } from '../../src/core/reasoner';
import { executeAgentTool } from '../../src/core/agentTools';

const NODE = process.execPath;
const RESPONSE = REASONER_TURN_RESPONSE_VERSION;
let scratch: string[] = [];

test.afterEach(() => {
  for (const dir of scratch) fs.rmSync(dir, { recursive: true, force: true });
  scratch = [];
});

function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-autonomy-int-'));
  scratch.push(dir);
  return dir;
}

function write(dir: string, name: string, body: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return file;
}

const sequentialFake = `
import fs from 'node:fs';
const seq = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const state = process.argv[3];
let index = 0;
try { index = Number(fs.readFileSync(state, 'utf8')); } catch { index = 0; }
const item = seq[Math.min(index, seq.length - 1)];
fs.writeFileSync(state, String(index + 1));
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  process.stdout.write(JSON.stringify(item));
});
`;

function sequentialDriver(turns: unknown[], authorizedEnvironments: readonly string[] = ['LOCAL']) {
  const dir = tmp();
  const script = write(dir, 'seq.mjs', sequentialFake);
  const seq = write(dir, 'seq.json', JSON.stringify(turns));
  const state = write(dir, 'state', '0');
  return createCliReasonerDriver({
    executable: NODE,
    args: [script, seq, state],
    provider: 'fixture',
    model: 'sequential-fake',
    killGraceMs: 100,
    stdioGraceMs: 300,
    validationContext: { authorizedEnvironments: authorizedEnvironments as ['LOCAL'] },
  });
}

const tools: AgentToolExecutor = {
  async execute(call) {
    const result = executeAgentTool(
      { kind: 'CALL_TOOL', toolId: call.toolId, arguments: call.arguments, argumentDigest: call.argumentDigest },
      {
        authorizedEnvironments: ['LOCAL'],
        fixtures: {
          sourceSurfaces: [{ path: 'src/billing.ts', language: 'TYPESCRIPT', text: 'export const total = lines.reduce((a,b)=>a+b,0)' }],
        },
      },
    );
    if (!result.ok) {
      return { ok: false, resultClass: result.class, evidenceRefs: [], outputBytes: 0, untrusted: [] };
    }
    return {
      ok: true,
      resultClass: 'OBSERVED',
      evidenceRefs: result.evidenceRefs,
      outputBytes: 16,
      untrusted: result.envelopes,
    };
  },
};

test.describe('cross-subsystem autonomous loop', () => {
  test('CLI reasoner + AgentRuntime + executeAgentTool admits a seeded finding', async () => {
    const evidence = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    const driver = sequentialDriver([
      { schemaVersion: RESPONSE, intents: [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/billing.ts' } }], hypotheses: [] },
      { schemaVersion: RESPONSE, intents: [{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'hyp-int', statement: 'sum omits last line', evidenceRefs: [evidence] }], hypotheses: [] },
      { schemaVersion: RESPONSE, intents: [{ kind: 'PROPOSE_CANDIDATE', candidateId: 'cand-int', evidenceRefs: [evidence] }], hypotheses: [] },
      { schemaVersion: RESPONSE, intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' }], hypotheses: [] },
    ]);
    const runtime = new AgentRuntime({
      campaignId: 'int-positive',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver,
      tools,
      authorizedEnvironments: ['LOCAL'],
    });
    const result = await runtime.run({ maxTurns: 8 });
    expect(result.terminationReason).toBe('COMPLETE_WITH_FINDING');
    expect(result.state.candidateIds).toEqual(['cand-int']);
  });

  test('CLI garbage output does not admit a finding', async () => {
    const dir = tmp();
    const script = write(dir, 'garbage.mjs', `
      const chunks = [];
      process.stdin.on('data', (c) => chunks.push(c)).on('end', () => { process.stdout.write('definitely not json'); });
    `);
    const driver = createCliReasonerDriver({
      executable: NODE,
      args: [script],
      provider: 'fixture',
      model: 'garbage',
      killGraceMs: 100,
      stdioGraceMs: 300,
      validationContext: { authorizedEnvironments: ['LOCAL'] },
    });
    const runtime = new AgentRuntime({
      campaignId: 'int-garbage',
      budgetPolicy: { ...defaultAgentBudgetPolicy('HOUR_1'), consecutiveFailures: 2, retries: 2, providerFailures: 2 },
      reasoner: driver,
      tools,
      authorizedEnvironments: ['LOCAL'],
      maxTurns: 4,
    });
    const result = await runtime.run({ maxTurns: 4 });
    expect(result.state.candidateIds).toEqual([]);
    expect(result.terminationReason === 'BUDGET_EXHAUSTED' || result.terminationReason === 'NO_PROGRESS').toBe(true);
  });

  test('CLI unknown tool is fail-closed and admits nothing', async () => {
    const driver = sequentialDriver([
      { schemaVersion: RESPONSE, intents: [{ kind: 'CALL_TOOL', toolId: 'HACK_THE_PLANET', arguments: {} }], hypotheses: [] },
    ]);
    const runtime = new AgentRuntime({
      campaignId: 'int-unknown',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver,
      tools,
      authorizedEnvironments: ['LOCAL'],
    });
    const result = await runtime.run({ maxTurns: 4 });
    expect(result.state.candidateIds).toEqual([]);
    expect(result.state.actionLog.some((item) => item.resultClass.includes('UNKNOWN_TOOL') || item.resultClass.includes('SAFETY'))).toBe(true);
  });

  test('DEV browser tool is unauthorized in LOCAL context and admits nothing', async () => {
    const driver = sequentialDriver([
      { schemaVersion: RESPONSE, intents: [{ kind: 'CALL_TOOL', toolId: 'REQUEST_BROWSER_OBSERVATION', arguments: { url: 'https://dev.example' } }], hypotheses: [] },
    ]);
    const runtime = new AgentRuntime({
      campaignId: 'int-dev',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver,
      tools,
      authorizedEnvironments: ['LOCAL'],
    });
    const result = await runtime.run({ maxTurns: 4 });
    expect(result.state.candidateIds).toEqual([]);
    expect(result.state.actionLog.some((item) => item.resultClass.includes('UNAUTHORIZED') || item.resultClass.includes('SAFETY'))).toBe(true);
  });
});
