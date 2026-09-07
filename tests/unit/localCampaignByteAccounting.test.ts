// W9 runtime lane: campaign-level byte-ledger fold and checkpoint exposure.
// Uses fake CLI reasoner scripts like localCampaign.test.ts. No network.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_BYTE_LEDGER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  chargedOutputBytes,
  type AgentByteLedger,
} from '../../src/core/agentProtocol';
import {
  LOCAL_CAMPAIGN_VERSION,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';
import { parseCheckpoint } from '../../src/core/agentRuntime';

const NODE = process.execPath;

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-w9-campaign-acct-'));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

function terminateScript(dir: string, name = 'terminate.mjs'): string {
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
    hypotheses: [],
  });
  return writeFake(
    dir,
    name,
    `
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(${JSON.stringify(body)});
});
`,
  );
}

function pauseScript(dir: string, name = 'pause.mjs'): string {
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'PAUSE' }],
    hypotheses: [],
  });
  return writeFake(
    dir,
    name,
    `
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(${JSON.stringify(body)});
});
`,
  );
}

/** First invocation issues a tool call, later invocations pause. Counts via a counter file. */
function toolThenPauseScript(dir: string, counterFile: string, name = 'tool-pause.mjs'): string {
  const toolBody = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'src/a.ts' } }],
    hypotheses: [],
  });
  const pauseBody = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'PAUSE' }],
    hypotheses: [],
  });
  return writeFake(
    dir,
    name,
    `
import fs from 'node:fs';
let n = 0;
try { n = Number(fs.readFileSync(${JSON.stringify(counterFile)}, 'utf8')) || 0; } catch {}
n += 1;
fs.writeFileSync(${JSON.stringify(counterFile)}, String(n));
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(n === 1 ? ${JSON.stringify(toolBody)} : ${JSON.stringify(pauseBody)});
});
`,
  );
}

function readCheckpointDocument(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

test.describe('w9 campaign ledger exposure', () => {
  test('paused campaigns expose the folded ledger on the result and the checkpoint', async () => {
    const dir = scratchDir();
    const result = await runLocalCliCampaign({
      campaignId: 'w9-acct-pause',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [pauseScript(dir)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 3,
      stateDirectory: dir,
    });

    expect(result.schemaVersion).toBe(LOCAL_CAMPAIGN_VERSION);
    expect(result.terminationReason).toBe('PAUSED');
    expect(result.checkpointFile).not.toBeNull();
    // A paused investigation is suspended, not finished: its partial turns
    // stay in its own checkpoint and out of the merged campaign totals, so
    // the campaign ledger here is still zero but present with the frozen
    // version, exactly matching the persisted checkpoint state.
    expect(result.byteLedger.schemaVersion).toBe(AGENT_BYTE_LEDGER_VERSION);

    const document = readCheckpointDocument(result.checkpointFile!);
    const checkpoint = parseCheckpoint(document);
    expect(checkpoint.state.byteLedger).toEqual(result.byteLedger);
    expect(checkpoint.state.budget.usage.inputBytes).toBe(checkpoint.state.byteLedger!.renderedInputBytes);
    expect(checkpoint.state.budget.usage.outputBytes).toBe(chargedOutputBytes(checkpoint.state.byteLedger!));

    const progress = document['campaignProgress'] as Record<string, unknown>;
    const pausedInvestigation = progress['pausedInvestigation'] as Record<string, unknown>;
    const pausedLedger = (pausedInvestigation['state'] as Record<string, unknown>)['byteLedger'] as AgentByteLedger;
    expect(pausedLedger.renderedInputBytes).toBeGreaterThan(0);
    expect(pausedLedger.providerResponseBytes).toBeGreaterThan(0);
  });

  test('resume folds the paused investigation ledger into the campaign total', async () => {
    const dir = scratchDir();
    const counterFile = path.join(dir, 'counter.txt');
    const paused = await runLocalCliCampaign({
      campaignId: 'w9-acct-fold',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [toolThenPauseScript(dir, counterFile)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 4,
      stateDirectory: dir,
    });
    expect(paused.terminationReason).toBe('PAUSED');
    expect(paused.checkpointFile).not.toBeNull();

    const pausedDocument = readCheckpointDocument(paused.checkpointFile!);
    const progress = pausedDocument['campaignProgress'] as Record<string, unknown>;
    const pausedInvestigation = progress['pausedInvestigation'] as Record<string, unknown>;
    const pausedLedger = (pausedInvestigation['state'] as Record<string, unknown>)['byteLedger'] as AgentByteLedger;
    expect(pausedLedger.renderedInputBytes).toBeGreaterThan(0);
    const pausedInvestigationUsage = (pausedInvestigation['state'] as Record<string, unknown>)['budget'] as Record<string, unknown>;
    const pausedInvestigationOutput = (pausedInvestigationUsage['usage'] as Record<string, unknown>)['outputBytes'];
    expect(pausedInvestigationOutput).toBe(chargedOutputBytes(pausedLedger));

    const finished = await resumeLocalCliCampaign({
      campaignId: 'w9-acct-fold',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [terminateScript(dir, 'terminate.mjs')],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 3,
      stateDirectory: dir,
    });

    expect(finished.terminationReason).toBe('NO_PROGRESS');
    expect(finished.byteLedger.renderedInputBytes).toBeGreaterThanOrEqual(pausedLedger.renderedInputBytes);
    expect(finished.byteLedger.providerResponseBytes).toBeGreaterThanOrEqual(pausedLedger.providerResponseBytes);
    expect(finished.byteLedger.schemaVersion).toBe(AGENT_BYTE_LEDGER_VERSION);
  });

  test('pre-W9 campaign checkpoints without a ledger still resume', async () => {
    const dir = scratchDir();
    const paused = await runLocalCliCampaign({
      campaignId: 'w9-acct-legacy',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [pauseScript(dir)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 3,
      stateDirectory: dir,
    });
    expect(paused.checkpointFile).not.toBeNull();

    const document = readCheckpointDocument(paused.checkpointFile!);
    const state = document['state'] as Record<string, unknown>;
    delete state['byteLedger'];
    const progress = document['campaignProgress'] as Record<string, unknown>;
    const pausedInvestigation = progress['pausedInvestigation'] as Record<string, unknown>;
    delete (pausedInvestigation['state'] as Record<string, unknown>)['byteLedger'];
    fs.writeFileSync(paused.checkpointFile!, `${JSON.stringify(document)}\n`, { mode: 0o600 });

    const finished = await resumeLocalCliCampaign({
      campaignId: 'w9-acct-legacy',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [terminateScript(dir, 'terminate.mjs')],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 3,
      stateDirectory: dir,
    });

    expect(finished.terminationReason).toBe('NO_PROGRESS');
    expect(finished.byteLedger.schemaVersion).toBe(AGENT_BYTE_LEDGER_VERSION);
    expect(finished.byteLedger.renderedInputBytes).toBeGreaterThan(0);
  });

  test('the campaign checkpoint measures its own embedded document, not the envelope', async () => {
    const dir = scratchDir();
    const counterFile = path.join(dir, 'counter.txt');
    const result = await runLocalCliCampaign({
      campaignId: 'w9-acct-ckpt',
      ceilingName: 'HOUR_1',
      executable: NODE,
      args: [toolThenPauseScript(dir, counterFile)],
      provider: 'test-provider',
      model: 'fake-1',
      maxTurns: 4,
      stateDirectory: dir,
    });
    expect(result.checkpointFile).not.toBeNull();

    const document = readCheckpointDocument(result.checkpointFile!);
    const checkpoint = parseCheckpoint(document);
    // The campaign envelope adds campaignProgress framing on top of the
    // checkpoint; the measured value is a property of the checkpoint codec, so
    // it equals the embedded document exactly and stays below the file size.
    const embedded = checkpoint.state.byteLedger!.checkpointBytes;
    expect(embedded).toBe(Buffer.byteLength(JSON.stringify(checkpoint), 'utf8'));
    expect(embedded).toBeLessThan(fs.statSync(result.checkpointFile!).size);
    // The returned result reports the same accounting as the persisted file.
    expect(result.byteLedger).toEqual(checkpoint.state.byteLedger);
    // The paused investigation measured its own checkpoint independently.
    const progress = document['campaignProgress'] as Record<string, unknown>;
    const pausedInvestigation = progress['pausedInvestigation'] as Record<string, unknown>;
    const pausedLedger = (pausedInvestigation['state'] as Record<string, unknown>)['byteLedger'] as AgentByteLedger;
    expect(pausedLedger.checkpointBytes).toBe(Buffer.byteLength(JSON.stringify(pausedInvestigation), 'utf8'));
  });
});
