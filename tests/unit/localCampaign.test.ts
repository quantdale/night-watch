import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  LOCAL_CAMPAIGN_VERSION,
  LocalCampaignError,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';

const NODE = process.execPath;

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-local-campaign-'));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

function terminateScript(dir: string): string {
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }],
    hypotheses: [],
  });
  return writeFake(
    dir,
    'terminate.mjs',
    `
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(${JSON.stringify(body)});
});
`,
  );
}

test('missing executable fails closed without starting a hunt', async () => {
  await expect(runLocalCliCampaign({
    campaignId: 'camp-missing-cli',
    ceilingName: 'HOUR_1',
    executable: '',
    maxTurns: 2,
    stateDirectory: scratchDir(),
  })).rejects.toMatchObject({ code: 'REASONER_CLI_NOT_CONFIGURED' });
});

test('malformed campaign id is rejected', async () => {
  await expect(runLocalCliCampaign({
    campaignId: 'has spaces',
    ceilingName: 'HOUR_1',
    executable: NODE,
    maxTurns: 1,
    stateDirectory: scratchDir(),
  })).rejects.toBeInstanceOf(LocalCampaignError);
});

test('fake CLI reasoner runs a LOCAL campaign and admits no finding', async () => {
  const dir = scratchDir();
  const result = await runLocalCliCampaign({
    campaignId: 'camp-fake-cli',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [terminateScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
  });
  expect(result.schemaVersion).toBe(LOCAL_CAMPAIGN_VERSION);
  expect(result.environment).toBe('LOCAL');
  expect(result.terminationReason).toBe('COMPLETE_NO_FINDING');
  expect(result.candidateIds).toEqual([]);
  expect(result.actionCount).toBeGreaterThan(0);
  expect(result.checkpointFile).toBeNull();
});
