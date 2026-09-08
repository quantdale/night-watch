import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  CAMPAIGN_STAGNATION_LIMIT,
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
  // The campaign continues past per-investigation completions until global
  // stagnation: three empty COMPLETE_NO_FINDING investigations, then
  // NO_PROGRESS with no checkpoint and no fabricated finding.
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(result.investigationsCompleted).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(result.terminationCounts.COMPLETE_NO_FINDING).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(result.candidateIds).toEqual([]);
  expect(result.actionCount).toBeGreaterThan(0);
  expect(result.reasonerCalls).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(result.providerFailures).toBe(0);
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
  // The paused investigation counts as started but not completed.
  expect(paused.investigationsStarted).toBe(1);
  expect(paused.investigationsCompleted).toBe(0);
  expect(paused.terminationCounts.PAUSED).toBe(1);
  const listed = listLocalCampaigns(dir);
  expect(listed.map((item) => item.campaignId)).toContain('camp-pause-resume');
  const entry = listed.find((item) => item.campaignId === 'camp-pause-resume')!;
  expect(entry.status).toBe('PAUSED');
  expect(entry.investigationsStarted).toBe(1);
  expect(entry.investigationsCompleted).toBe(0);
  expect(entry.actionCount).toBe(0);
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
  // Resume finishes the paused investigation without replaying it, then the
  // campaign keeps hunting: three empty completions hit global stagnation.
  // The resumed slot is not recounted as a new start.
  expect(resumed.terminationReason).toBe('NO_PROGRESS');
  expect(resumed.investigationsStarted).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(resumed.investigationsCompleted).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(resumed.terminationCounts.PAUSED).toBe(1);
  expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBe(CAMPAIGN_STAGNATION_LIMIT);
  expect(resumed.checkpointFile).toBeNull();
  // The terminal campaign leaves no stale checkpoint behind for status.
  expect(listLocalCampaigns(dir)).toEqual([]);
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
  // The candidate is recorded but never packaged: the dossier stays refused,
  // and the campaign keeps hunting until the repeated identical finding hits
  // global stagnation — honestly admitting the campaign, not a success.
  expect(result.candidateIds).toEqual(['c1']);
  expect(result.dossierStatus).toBe('REFUSED_NO_REPRODUCTION');
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(1 + CAMPAIGN_STAGNATION_LIMIT);
  expect(result.terminationCounts.COMPLETE_WITH_FINDING).toBe(1 + CAMPAIGN_STAGNATION_LIMIT);
  expect(result.checkpointFile).toBeNull();
});

test('operator repository scope rejects an unapproved repository before the reasoner starts', () => {
  const dir = scratchDir();
  const marker = path.join(dir, 'reasoner-started');
  const fake = writeFake(
    dir,
    'must-not-start.mjs',
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, 'started');`,
  );
  const result = spawnSync(
    NODE,
    [
      path.join(process.cwd(), 'bin', 'nightwatch-agent.mjs'),
      'campaign',
      'run',
      '--reasoner=cli',
      '--duration=1h',
      '--id=camp-unapproved-repository',
      '--repository=not-approved/foreign',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        NIGHTWATCH_REASONER_CLI: NODE,
        NIGHTWATCH_REASONER_SCRIPT: fake,
      },
      timeout: 60_000,
    },
  );
  expect(result.status).toBe(2);
  expect(result.stderr).toContain('REAL_SOURCE_SCAN_APPROVED_UNIVERSE');
  expect(fs.existsSync(marker)).toBe(false);
});

test('a scoped campaign cannot be silently resumed against the full universe', async () => {
  const dir = scratchDir();
  const paused = await runLocalCliCampaign({
    campaignId: 'camp-scoped-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [pauseScript(dir)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 3,
    stateDirectory: dir,
    investigationScope: ['mobingilabs/ouchan'],
  });
  expect(paused.terminationReason).toBe('PAUSED');

  // Omitting the scope would widen the campaign back to every approved
  // repository: the operator note tells them to resume with only --id, so
  // this must fail rather than quietly change what is investigated.
  await expect(resumeLocalCliCampaign({
    campaignId: 'camp-scoped-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [terminateScript(dir)],
    maxTurns: 2,
    stateDirectory: dir,
  })).rejects.toMatchObject({ code: 'CAMPAIGN_SCOPE_MISMATCH' });

  // A different scope is equally refused.
  await expect(resumeLocalCliCampaign({
    campaignId: 'camp-scoped-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [terminateScript(dir)],
    maxTurns: 2,
    stateDirectory: dir,
    investigationScope: ['alphauslabs/blue-sdk-go'],
  })).rejects.toMatchObject({ code: 'CAMPAIGN_SCOPE_MISMATCH' });

  // The original scope resumes normally.
  const resumed = await resumeLocalCliCampaign({
    campaignId: 'camp-scoped-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [terminateScript(dir)],
    maxTurns: 2,
    stateDirectory: dir,
    investigationScope: ['mobingilabs/ouchan'],
  });
  expect(resumed.terminationReason).toBe('NO_PROGRESS');
});


