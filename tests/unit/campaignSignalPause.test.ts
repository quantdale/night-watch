// M5 task 6.9 (C-07) — a signal pauses the campaign with a durable PAUSED
// checkpoint and kills the reasoner process group; progress is checkpointed
// after every absorbed investigation.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-signal-pause-'));
  roots.push(root);
  return root;
}

function writeScript(root: string, name: string, source: string): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

test.describe('signal-driven pause (6.9)', () => {
  test('a pause signal halts the campaign promptly, kills the reasoner, and checkpoints PAUSED', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const campaignId = 'camp-signal-pause';
    const marker = path.join(root, 'reasoner-still-alive');
    // The reasoner sleeps far longer than the pause: if the pause waited for
    // the call (or left the child running) the test would take seconds and the
    // marker would appear.
    const reasoner = writeScript(
      root,
      'sleepy.mjs',
      `
import fs from 'node:fs';
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', async () => {
  await new Promise((resolve) => setTimeout(resolve, 8_000));
  fs.writeFileSync(${JSON.stringify(marker)}, 'alive');
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const controller = new AbortController();
    const started = Date.now();
    setTimeout(() => controller.abort(), 400);
    const result = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'signal-proof',
      maxTurns: 3,
      stateDirectory,
      pauseSignal: controller.signal,
    });
    const wallMs = Date.now() - started;

    expect(result.terminationReason).toBe('PAUSED');
    // Prompt: the in-flight provider call was aborted, not awaited.
    expect(wallMs).toBeLessThan(6_000);
    expect(fs.existsSync(marker)).toBe(false);

    const checkpointFile = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    expect(fs.existsSync(checkpointFile)).toBe(true);
    const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) as {
      readonly state?: { readonly status?: string };
      readonly campaignProgress?: { readonly pausedInvestigation?: unknown };
    };
    expect(document.state?.status).toBe('PAUSED');
    expect(document.campaignProgress?.pausedInvestigation).toBeTruthy();
  });

  test('a repeated signal is absorbed instead of escalating', async () => {
    const root = scratch();
    const reasoner = writeScript(
      root,
      'pause-after-delay.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);
    setTimeout(() => controller.abort(), 150);
    const result = await runLocalCliCampaign({
      campaignId: 'camp-signal-repeat',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'signal-proof',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state'),
      pauseSignal: controller.signal,
    });
    expect(result.terminationReason).toBe('PAUSED');
    expect(result.terminationCounts.CANCELLED).toBe(0);
  });

  test('progress is checkpointed between investigations and such a checkpoint resumes', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const campaignId = 'camp-progress-checkpoint';
    const captured = path.join(root, 'captured-checkpoint.json');
    // Investigation 0 terminates empty; investigation 1 first copies the
    // CURRENT campaign checkpoint (written after investigation 0 was absorbed)
    // before terminating empty too.
    const reasoner = writeScript(
      root,
      'capture-progress.mjs',
      `
import fs from 'node:fs';
import path from 'node:path';
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  if (inv === 1) {
    const file = path.join(${JSON.stringify(stateDirectory)}, ${JSON.stringify(`${campaignId}.checkpoint.json`)});
    if (fs.existsSync(file)) fs.copyFileSync(file, ${JSON.stringify(captured)});
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const result = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'signal-proof',
      maxTurns: 2,
      stateDirectory,
    });
    expect(result.terminationReason).toBe('NO_PROGRESS');

    // The checkpoint captured mid-run is the between-investigations progress
    // checkpoint: PAUSED, one completed investigation, nothing in flight.
    expect(fs.existsSync(captured)).toBe(true);
    const progress = JSON.parse(fs.readFileSync(captured, 'utf8')) as {
      readonly state?: { readonly status?: string };
      readonly campaignProgress?: {
        readonly completedInvestigations?: number;
        readonly pausedInvestigation?: unknown;
      };
    };
    expect(progress.state?.status).toBe('PAUSED');
    expect(progress.campaignProgress?.pausedInvestigation ?? null).toBeNull();
    expect(progress.campaignProgress?.completedInvestigations).toBe(1);
  });
});
