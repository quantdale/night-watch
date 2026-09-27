// M5 task 6.17 — the deterministic fake-reasoner synthetic hunt suite.
//
// ONE suite that drives the whole hunt chain end to end with deterministic
// fakes: admission, refusal, persistence, terminated resume, provider outage
// and signal pause. No network, no subscription, no clock dependence beyond
// the campaign's own injected timing.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  loadLocalCampaignCheckpoint,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';
import { createHistoricalLocalInvestigationContext } from '../../src/core/localInvestigation/historical';
import { AgentFindingStore } from '../../src/core/localInvestigation/agentFindingStore';
import {
  MINED_TEST_REPLAY_VERSION,
  parseMinedTestReplayDescriptor,
  type ContainedTestReplayResult,
} from '../../src/core/benchmark/containedTestReplay';

const FIX_SHA = 'b'.repeat(40);
const HIDDEN_TEST = 'hidden_total_test.go';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-hunt-suite-'));
  roots.push(root);
  return root;
}

function writeScript(root: string, name: string, source: string): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

function replayResult(): ContainedTestReplayResult {
  return {
    verdict: 'REPRODUCED',
    reason: 'PRE_FAIL_POST_PASS',
    preFix: { signal: 'FAIL', reason: 'TESTS_FAILED', exitCode: 1, timedOut: false },
    postFix: { signal: 'PASS', reason: 'TESTS_PASSED', exitCode: 0, timedOut: false },
    stderrHead: `${HIDDEN_TEST}: synthetic`,
    durationMs: 10,
    skippedSubmodules: [],
  };
}

function historicalContext(root: string) {
  const repositoriesRoot = path.join(root, 'repositories');
  fs.mkdirSync(path.join(repositoriesRoot, 'example', 'ledger'), { recursive: true });
  const descriptor = parseMinedTestReplayDescriptor({
    schemaVersion: MINED_TEST_REPLAY_VERSION,
    repository: 'example/ledger',
    fixCommit: FIX_SHA,
    testPath: HIDDEN_TEST,
    packageDir: '.',
  });
  if (descriptor === null) throw new Error('fixture descriptor must parse');
  return createHistoricalLocalInvestigationContext({
    visible: { blobs: ['inspect', '--- total.ts\nexport const total = 1;\n', 'observe'] },
    caseId: 'synthetic-hunt-suite',
    minedReplay: descriptor,
    repositoriesRoot,
    runReplay: async () => replayResult(),
  });
}

/** The full hunt chain: inspect, reproduce, propose, admit. */
const HUNTING_REASONER = `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const turn = Number(String(request.turnId).split(':').at(-1));
  const refs = Array.isArray(request.observation.evidenceRefs) ? request.observation.evidenceRefs : [];
  let intents;
  if (String(request.campaignId).endsWith(':inv:1')) {
    intents = [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  } else if (turn === 1) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'total.ts' } }];
  } else if (turn === 2) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
      reproductionId: 'repro-hunt', candidateId: 'candidate-hunt', sourcePath: 'total.ts',
      sourceEvidenceRef: refs[0], observedEvidenceRefs: refs } }];
  } else if (turn === 3) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'REQUEST_FINDING_PROPOSAL', arguments: {
      candidateId: 'candidate-hunt', evidenceRefs: refs,
      draft: { title: 'Total is wrong', description: 'The visible total path is wrong.', recommendedSeverity: 'S3' } } }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-hunt', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`;

/** Proposes a candidate with NO reproduction: the refusal path. */
const REFUSING_REASONER = `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const turn = Number(String(request.turnId).split(':').at(-1));
  const refs = Array.isArray(request.observation.evidenceRefs) ? request.observation.evidenceRefs : [];
  let intents;
  if (String(request.campaignId).endsWith(':inv:1')) {
    intents = [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  } else if (turn === 1) {
    // Grounded evidence, but NO reproduction attempt at all.
    intents = [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'total.ts' } }];
  } else if (turn === 2) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'REQUEST_FINDING_PROPOSAL', arguments: {
      candidateId: 'candidate-ungrounded', evidenceRefs: refs,
      draft: { title: 'Ungrounded', description: 'Proposed without a reproduction.' } } }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-ungrounded', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`;

test.describe('deterministic synthetic hunt suite (6.17)', () => {
  test('admission, persistence and terminated resume run the whole chain', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const findingsRoot = path.join(root, 'findings');
    const campaignId = 'hunt-admit-persist-resume';
    const reasoner = writeScript(root, 'hunting.mjs', HUNTING_REASONER);

    const run = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    // Admission: exactly one mechanically admitted finding, persisted durably.
    expect(run.dossierStatus).toBe('VERIFIED_REPRODUCTION');
    expect(run.admissionPersistence).toBe('PERSISTED');
    expect(run.persistedFindings).toHaveLength(1);
    const dossierId = run.persistedFindings[0]?.dossierId as string;
    expect(dossierId).toMatch(/^afr:sha256:[0-9a-f]{24}$/);
    const store = new AgentFindingStore({ root: findingsRoot });
    expect(store.list().map((record) => record.dossierId)).toEqual([dossierId]);

  });

  test('a terminated hunt returns the persisted record verbatim on resume', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const findingsRoot = path.join(root, 'findings');
    const campaignId = 'hunt-terminated-resume';
    const reasoner = writeScript(root, 'hunting.mjs', HUNTING_REASONER);
    const run = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(run.admissionPersistence).toBe('PERSISTED');
    const dossierId = run.persistedFindings[0]?.dossierId as string;

    // A stored TERMINATED checkpoint for the same campaign (a real pause
    // checkpoint flipped to its terminal status — receipts are not persisted,
    // so re-derivation is impossible by construction).
    const pauseReasoner = writeScript(
      root,
      'pause-hunt.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  const turn = Number(String(request.turnId).split(':').at(-1));
  const intents = inv === 0 && turn <= 1
    ? [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'total.ts' } }]
    : inv === 0
      ? [{ kind: 'PAUSE' }]
      : [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`,
    );
    const paused = await runLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [pauseReasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(paused.terminationReason).toBe('PAUSED');
    const checkpointFile = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) as Record<string, unknown>;
    const state = document.state as Record<string, unknown>;
    state.status = 'TERMINATED';
    state.terminationReason = 'COMPLETE_WITH_FINDING';
    delete document.campaignProgress;
    fs.writeFileSync(checkpointFile, JSON.stringify(document, null, 2));

    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(resumed.resumedFindingsStatus).toBe('RECORDS');
    expect(resumed.resumedFindings.map((record) => record.dossierId)).toEqual([dossierId]);
    expect(resumed.reasonerCalls).toBe(0);
  });

  test('a candidate with no reproduction is refused, and nothing is persisted', async () => {
    const root = scratch();
    const findingsRoot = path.join(root, 'findings');
    const reasoner = writeScript(root, 'refusing.mjs', REFUSING_REASONER);
    const run = await runLocalCliCampaign({
      campaignId: 'hunt-refusal',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 4,
      stateDirectory: path.join(root, 'state'),
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(run.dossierStatus).toBe('REFUSED_NO_REPRODUCTION');
    const refusal = run.findingAdmissions.find((admission) => !admission.admitted);
    expect(refusal?.admitted).toBe(false);
    if (refusal !== undefined && !refusal.admitted) {
      expect(refusal.reason).toBe('MISSING_REPRODUCTION');
    }
    expect(run.persistedFindings).toEqual([]);
    expect(run.admissionPersistence).toBe('NONE');
    expect(new AgentFindingStore({ root: findingsRoot }).list()).toEqual([]);
  });

  test('a dead provider is a provider outage, never budget exhaustion', async () => {
    const root = scratch();
    const dead = writeScript(root, 'dead.mjs', 'process.stderr.write("provider unreachable\\n");\nprocess.exit(9);\n');
    const run = await runLocalCliCampaign({
      campaignId: 'hunt-outage',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [dead],
      provider: 'dead-provider',
      model: 'dead-model',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state'),
      findingsRoot: path.join(root, 'findings'),
    });
    expect(run.terminationClass).toBe('PROVIDER_BLOCKED_BEFORE_SOURCE_ACTION');
    expect(run.terminationReason).toBe('REASONER_FAILURE');
    expect(run.terminationCounts.BUDGET_EXHAUSTED).toBe(0);
    expect(run.providerAttribution.sourceActions).toBe(0);
    expect(run.persistedFindings).toEqual([]);
  });

  test('a signal pauses the hunt with a durable checkpoint', async () => {
    const root = scratch();
    const reasoner = writeScript(
      root,
      'slow-hunt.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', async () => {
  await new Promise((resolve) => setTimeout(resolve, 8_000));
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents: [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }], hypotheses: [] }));
});
`,
    );
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 300);
    const started = Date.now();
    const run = await runLocalCliCampaign({
      campaignId: 'hunt-signal-pause',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state'),
      findingsRoot: path.join(root, 'findings'),
      pauseSignal: controller.signal,
    });
    expect(run.terminationReason).toBe('PAUSED');
    expect(Date.now() - started).toBeLessThan(6_000);
    const checkpoint = loadLocalCampaignCheckpoint('hunt-signal-pause', path.join(root, 'state'));
    expect(checkpoint.state.status).toBe('PAUSED');
    // A paused hunt resumes deterministically under the same identity.
    const resumed = await resumeLocalCliCampaign({
      campaignId: 'hunt-signal-pause',
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [reasoner],
      provider: 'deterministic-test-cli',
      model: 'hunt-proof',
      maxTurns: 3,
      stateDirectory: path.join(root, 'state'),
      findingsRoot: path.join(root, 'findings'),
    });
    expect(['PAUSED', 'NO_PROGRESS']).toContain(resumed.terminationReason);
  });
});
