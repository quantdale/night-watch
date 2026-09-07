// Campaign endurance: a bounded campaign is a sequence of investigations under
// ONE shared budget. Deterministic FAKE CLI reasoners only (no subscription,
// no network). Each fake reads the turn request JSON on stdin (campaignId,
// turnId) and writes one response JSON to stdout.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  CAMPAIGN_STAGNATION_LIMIT,
  listLocalCampaigns,
  loadLocalCampaignCheckpoint,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';

const NODE = process.execPath;
const V = REASONER_TURN_RESPONSE_VERSION;

let scratchDirs: string[] = [];

test.afterEach(() => {
  for (const dir of scratchDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  scratchDirs = [];
});

function scratchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-campaign-endurance-'));
  scratchDirs.push(dir);
  return dir;
}

function writeFake(dir: string, name: string, source: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

/** Stateless responder: `decide(req)` returns the response object. */
function decideScript(dir: string, name: string, decide: string): string {
  return writeFake(
    dir,
    name,
    `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const req = JSON.parse(raw);
  const decide = ${decide};
  process.stdout.write(JSON.stringify(decide(req)));
});
`,
  );
}

const EMPTY_TERMINATE = `(req) => ({ schemaVersion: ${JSON.stringify(V)}, intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] })`;

function invIndexOf(req: { campaignId: string }): number {
  const part = String(req.campaignId).split(':inv:')[1];
  return part === undefined ? -1 : Number(part);
}

test('multiple investigations run under one campaign until stagnation', async () => {
  const dir = scratchDir();
  const result = await runLocalCliCampaign({
    campaignId: 'camp-endurance-multi',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [decideScript(dir, 'terminate.mjs', EMPTY_TERMINATE)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(CAMPAIGN_STAGNATION_LIMIT).toBe(3);
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(3);
  expect(result.investigationsCompleted).toBe(3);
  expect(result.terminationCounts.COMPLETE_NO_FINDING).toBe(3);
  expect(result.actionCount).toBe(3);
  expect(result.reasonerCalls).toBe(3);
  expect(result.providerFailures).toBe(0);
  expect(result.wallTimeMs).toBeGreaterThanOrEqual(0);
  expect(result.candidateIds).toEqual([]);
  expect(result.checkpointFile).toBeNull();
  expect(result.dossierStatus).toBe('NONE');
});

test('candidate budget accumulates across investigations and is not reset', async () => {
  const dir = scratchDir();
  // One fresh candidate (and fresh evidence) per investigation. If any
  // investigation reset the shared budget, the candidateCap of 20 would never
  // be reached; exhaustion at exactly 20 proves accumulation.
  const decide = `(req) => {
    const inv = Number(String(req.campaignId).split(':inv:')[1] ?? '0');
    const n = String(inv).padStart(4, '0');
    return { schemaVersion: ${JSON.stringify(V)}, hypotheses: [], intents: [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'cand-' + n, evidenceRefs: ['ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa' + n] },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ] };
  }`;
  const result = await runLocalCliCampaign({
    campaignId: 'camp-endurance-candidates',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [decideScript(dir, 'propose-each.mjs', decide)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
  expect(result.investigationsStarted).toBe(20);
  expect(result.investigationsCompleted).toBe(20);
  expect(result.candidateIds).toHaveLength(20);
  expect(result.candidateIds[0]).toBe('cand-0000');
  expect(result.candidateIds[19]).toBe('cand-0019');
  expect(result.terminationCounts.COMPLETE_WITH_FINDING).toBe(19);
  expect(result.terminationCounts.BUDGET_EXHAUSTED).toBe(1);
  expect(result.reasonerCalls).toBe(20);
  expect(result.dossierStatus).toBe('REFUSED_NO_REPRODUCTION');
});

test('wall-time exhaustion safe-terminates with a checkpoint, not success', async () => {
  const dir = scratchDir();
  const marker = path.join(dir, 'reasoner-ran');
  const script = writeFake(
    dir,
    'mark-terminate.mjs',
    `
import fs from 'node:fs';
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  fs.writeFileSync(${JSON.stringify(marker)}, 'ran\\n');
  process.stdout.write(JSON.stringify({ schemaVersion: ${JSON.stringify(V)}, intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
  );
  const start = 1_700_000_000_000;
  const result = await runLocalCliCampaign({
    campaignId: 'camp-endurance-wall',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [script],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
    // Frozen until the fake reasoner proves it ran, then past the HOUR_1
    // ceiling: deterministic wall-time exhaustion without waiting an hour.
    now: () => (fs.existsSync(marker) ? start + 3_600_001 : start),
  });
  expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
  expect(result.terminationReason).not.toMatch(/^COMPLETE_/);
  expect(result.investigationsStarted).toBe(1);
  expect(result.checkpointFile).toBeTruthy();
  expect(result.wallTimeMs).toBeGreaterThanOrEqual(3_600_000);
  const checkpoint = loadLocalCampaignCheckpoint('camp-endurance-wall', dir);
  expect(checkpoint.resumeCursor).toContain(':inv:1:turn:');
});

test('a persistently failing reasoner stops the campaign instead of looping forever', async () => {
  const dir = scratchDir();
  // The dead-provider case (e.g. HTTP 402 every turn): NONZERO_EXIT every
  // call. Each investigation ends at its turn cap with a failure streak the
  // campaign must accumulate rather than reset.
  const dead = writeFake(dir, 'dead.mjs', `process.exit(1);\n`);
  const result = await runLocalCliCampaign({
    campaignId: 'camp-endurance-dead',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [dead],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(result.terminationReason).toBe('BUDGET_EXHAUSTED');
  // Bounded: the first two capped investigations end NO_PROGRESS with a
  // failure streak of 2 each; the third exhausts its remaining
  // consecutive-failure allowance (6 - 4 = 2) internally. Either way the
  // shared streak — never reset — stops the campaign instead of spawning
  // endless fresh runs against the dead provider.
  expect(result.investigationsStarted).toBe(3);
  expect(result.investigationsCompleted).toBe(3);
  expect(result.terminationCounts.NO_PROGRESS).toBe(2);
  expect(result.terminationCounts.BUDGET_EXHAUSTED).toBe(1);
  expect(result.providerFailures).toBe(6);
  expect(result.reasonerCalls).toBe(6);
  expect(result.actionCount).toBe(6);
  expect(result.candidateIds).toEqual([]);
  expect(result.checkpointFile).toBeTruthy();
});

test('evidence resets stagnation; N consecutive empty investigations stop the campaign', async () => {
  const dir = scratchDir();
  // Investigations 0-1 contribute fresh hypotheses (streak resets); 2-4 are
  // empty, so the campaign must stop after exactly 3 consecutive empties.
  const decide = `(req) => {
    const inv = Number(String(req.campaignId).split(':inv:')[1] ?? '0');
    const V = ${JSON.stringify(V)};
    if (inv < 2) {
      const n = String(inv).padStart(4, '0');
      return { schemaVersion: V, hypotheses: [], intents: [
        { kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-probe-' + n, statement: 'stagnation probe ' + n, evidenceRefs: ['ev:sha256:probe-probe-probe-probe-' + n] },
        { kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' },
      ] };
    }
    return { schemaVersion: V, intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] };
  }`;
  const result = await runLocalCliCampaign({
    campaignId: 'camp-endurance-stagnant',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [decideScript(dir, 'mixed.mjs', decide)],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 2,
    stateDirectory: dir,
  });
  expect(result.terminationReason).toBe('NO_PROGRESS');
  expect(result.investigationsStarted).toBe(5);
  expect(result.investigationsCompleted).toBe(5);
  expect(result.terminationCounts.COMPLETE_NO_FINDING).toBe(5);
  expect(result.actionCount).toBe(7);
  expect(result.checkpointFile).toBeNull();
  expect(result.candidateIds).toEqual([]);
});

test('resume does not re-run completed investigations or duplicate side effects', async () => {
  const dir = scratchDir();
  const VLOCAL = V;
  // Phase A: inv0 completes with evidence; inv1 executes one tool call, then
  // PAUSEs on its second turn.
  const scriptA = decideScript(
    dir,
    'phase-a.mjs',
    `(req) => {
      const V = ${JSON.stringify(VLOCAL)};
      const inv = Number(String(req.campaignId).split(':inv:')[1] ?? '-1');
      const turn = Number(String(req.turnId).split(':turn:')[1] ?? '1');
      if (inv === 0) {
        return { schemaVersion: V, hypotheses: [], intents: [
          { kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-resume-0', statement: 'resume seed hypothesis', evidenceRefs: ['ev:sha256:resume-seed-resume-seed-00'] },
          { kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' },
        ] };
      }
      if (inv === 1 && turn <= 1) {
        return { schemaVersion: V, hypotheses: [], intents: [
          { kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'package.json' } },
        ] };
      }
      if (inv === 1) {
        return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'PAUSE' }] };
      }
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
    }`,
  );
  const paused = await runLocalCliCampaign({
    campaignId: 'camp-endurance-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [scriptA],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 5,
    stateDirectory: dir,
  });
  expect(paused.terminationReason).toBe('PAUSED');
  expect(paused.checkpointFile).toBeTruthy();
  expect(paused.investigationsStarted).toBe(2);
  expect(paused.investigationsCompleted).toBe(1);
  expect(paused.terminationCounts.COMPLETE_NO_FINDING).toBe(1);
  expect(paused.terminationCounts.PAUSED).toBe(1);
  // The merged log holds only finished investigations; the paused partial
  // turns wait in the embedded investigation checkpoint.
  expect(paused.actionCount).toBe(2);

  // Phase B: every investigation terminates empty — except the resumed inv1,
  // which files the carried evidence as a candidate before terminating.
  const scriptB = decideScript(
    dir,
    'phase-b.mjs',
    `(req) => {
      const V = ${JSON.stringify(VLOCAL)};
      const inv = Number(String(req.campaignId).split(':inv:')[1] ?? '-99');
      if (inv === 1) {
        return { schemaVersion: V, hypotheses: [], intents: [
          { kind: 'PROPOSE_CANDIDATE', candidateId: 'c-resumed', evidenceRefs: ['ev:sha256:resume-seed-resume-seed-00'] },
          { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
        ] };
      }
      return { schemaVersion: V, hypotheses: [], intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }] };
    }`,
  );
  const resumed = await resumeLocalCliCampaign({
    campaignId: 'camp-endurance-resume',
    ceilingName: 'HOUR_1',
    executable: NODE,
    args: [scriptB],
    provider: 'test-provider',
    model: 'fake-1',
    maxTurns: 5,
    stateDirectory: dir,
  });
  // inv1 (resumed, new candidate) + inv2/3/4 (empty) -> stagnation stop.
  expect(resumed.terminationReason).toBe('NO_PROGRESS');
  expect(resumed.investigationsStarted).toBe(5);
  expect(resumed.investigationsCompleted).toBe(5);
  expect(resumed.terminationCounts.PAUSED).toBe(1);
  expect(resumed.terminationCounts.COMPLETE_NO_FINDING).toBe(4);
  expect(resumed.terminationCounts.COMPLETE_WITH_FINDING).toBe(1);
  // Evidence and candidates carried across the resume boundary, honestly
  // reported (proposed, refused without reproduction — never fabricated).
  expect(resumed.candidateIds).toEqual(['c-resumed']);
  expect(resumed.dossierStatus).toBe('REFUSED_NO_REPRODUCTION');
  // Exact totals: inv0(2 records, 1 call) + inv1(4 records, 3 calls) +
  // inv2/3/4 (1 record, 1 call each). Any replayed turn or duplicated tool
  // execution would inflate these numbers.
  expect(resumed.actionCount).toBe(9);
  expect(resumed.reasonerCalls).toBe(7);
  expect(resumed.checkpointFile).toBeNull();
  expect(listLocalCampaigns(dir)).toEqual([]);
});
