import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  LOCAL_CAMPAIGN_VERSION,
  LocalCampaignError,
  listLocalCampaigns,
  resumeLocalCliCampaign,
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
  expect(result.dossierStatus).toBe('NONE');
});

function pauseScript(dir: string): string {
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [{ kind: 'PAUSE' }],
    hypotheses: [],
  });
  return writeFake(
    dir,
    'pause.mjs',
    `
const chunks = [];
process.stdin.on('data', (d) => chunks.push(d)).on('end', () => {
  process.stdout.write(${JSON.stringify(body)});
});
`,
  );
}

test('paused campaign writes a checkpoint that status lists and resume can finish', async () => {
  const dir = scratchDir();
  const paused = await runLocalCliCampaign({
    campaignId: 'camp-pause-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [pauseScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
  });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpointFile).toBeTruthy();
  const listed = listLocalCampaigns(dir);
  expect(listed.map((item) => item.campaignId)).toContain('camp-pause-resume');
  const resumed = await resumeLocalCliCampaign({
    campaignId: 'camp-pause-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [terminateScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
  });
  expect(resumed.terminationReason).toBe('COMPLETE_NO_FINDING');
  expect(resumed.candidateIds).toEqual([]);
});

test('a proposed candidate is not packaged without a reproduction', async () => {
  const dir = scratchDir();
  const body = JSON.stringify({
    schemaVersion: REASONER_TURN_RESPONSE_VERSION,
    intents: [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'c1', evidenceRefs: ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'] },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ],
    hypotheses: [],
  });
  const fake = writeFake(
    dir,
    'propose.mjs',
    `
process.stdin.on('data', () => {}).on('end', () => {
  process.stdout.write(${JSON.stringify(body)});
});
`,
  );
  const result = await runLocalCliCampaign({
    campaignId: 'camp-propose-no-repro',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [fake],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(result.candidateIds).toEqual(['c1']);
  expect(result.dossierStatus).toBe('REFUSED_NO_REPRODUCTION');
  expect(result.terminationReason).toBe('COMPLETE_WITH_FINDING');
});


