// M5 tasks 6.2/6.3 (C-01/C-02) — durable agent-finding persistence.
//
// Deterministic fake CLI reasoner + historical replay context (no network, no
// subscription). A real admitted finding is produced end-to-end, so the store
// is exercised against a record the admission gate really derived.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import {
  listLocalCampaigns,
  loadLocalCampaignCheckpoint,
  resumeLocalCliCampaign,
  runLocalCliCampaign,
} from '../../src/core/agentRuntime/localCampaign';
import { createHistoricalLocalInvestigationContext } from '../../src/core/localInvestigation/historical';
import { AgentFindingStore, AgentFindingStoreError } from '../../src/core/localInvestigation/agentFindingStore';
import { deriveAgentFindingRecord, validateAgentFindingRecord } from '../../src/core/localInvestigation/agentFindingRecord';
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-agent-findings-'));
  roots.push(root);
  return root;
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

const REASONER_SOURCE = `
import fs from 'node:fs';
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  fs.appendFileSync(process.argv[2], raw + '\\n');
  const request = JSON.parse(raw);
  const turn = Number(String(request.turnId).split(':').at(-1));
  const refs = Array.isArray(request.observation.evidenceRefs) ? request.observation.evidenceRefs : [];
  let intents;
  if (String(request.campaignId).endsWith(':inv:1')) {
    intents = [{ kind: 'CANCEL' }];
  } else if (turn === 1) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'total.ts' } }];
  } else if (turn === 2) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
      reproductionId: 'repro-total', candidateId: 'candidate-total', sourcePath: 'total.ts',
      sourceEvidenceRef: refs[0], observedEvidenceRefs: refs,
    } }];
  } else if (turn === 3) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'REQUEST_FINDING_PROPOSAL', arguments: {
      candidateId: 'candidate-total', evidenceRefs: refs,
      draft: { title: 'Total is wrong', description: 'The visible total path is wrong.', recommendedSeverity: 'S3' },
    } }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-total', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`;

function writeFake(root: string, name: string, source: string): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, source, { mode: 0o700 });
  return file;
}

function writeReasoner(root: string): { readonly executable: string; readonly capture: string } {
  const executable = path.join(root, 'reasoner.mjs');
  const capture = path.join(root, 'requests.jsonl');
  fs.writeFileSync(executable, REASONER_SOURCE, { mode: 0o700 });
  return { executable, capture };
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
    caseId: 'agent-findings-path',
    minedReplay: descriptor,
    repositoriesRoot,
    runReplay: async () => replayResult(),
  });
}

interface RunOptions {
  readonly findingsRoot: string;
  readonly campaignId: string;
  readonly stateDirectory?: string;
}

async function runCampaign(root: string, options: RunOptions) {
  const reasoner = writeReasoner(root);
  return runLocalCliCampaign({
    campaignId: options.campaignId,
    ceilingName: 'HOUR_1',
    executable: process.execPath,
    args: [reasoner.executable, reasoner.capture],
    provider: 'deterministic-test-cli',
    model: 'product-path-proof',
    maxTurns: 6,
    stateDirectory: options.stateDirectory ?? path.join(root, 'state'),
    findingsRoot: options.findingsRoot,
    investigationContext: historicalContext(root),
  });
}

/** A stored PAUSED checkpoint for `campaignId` (no admission, no deletion). */
async function pauseCampaign(
  root: string,
  options: { readonly stateDirectory: string; readonly campaignId: string; readonly findingsRoot: string },
) {
  const pauseScript = writeFake(
    root,
    `pause-${options.campaignId}.mjs`,
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
    campaignId: options.campaignId,
    ceilingName: 'HOUR_1',
    executable: process.execPath,
    args: [pauseScript],
    provider: 'deterministic-test-cli',
    model: 'product-path-proof',
    maxTurns: 8,
    stateDirectory: options.stateDirectory,
    findingsRoot: options.findingsRoot,
    investigationContext: historicalContext(root),
  });
  if (paused.terminationReason !== 'PAUSED') {
    throw new Error(`pause fixture must pause, saw ${paused.terminationReason}`);
  }
  return paused;
}

test.describe('agent finding persistence (6.2)', () => {
  test('an admission is written durably before the terminal checkpoint deletion', async () => {
    const root = scratch();
    const findingsRoot = path.join(root, 'findings');
    const result = await runCampaign(root, { findingsRoot, campaignId: 'camp-agent-findings' });

    expect(result.terminationReason).toBe('CANCELLED');
    expect(result.admissionPersistence).toBe('PERSISTED');
    expect(result.admissionPersistenceFailures).toEqual([]);
    expect(result.persistedFindings).toHaveLength(1);
    const persisted = result.persistedFindings[0];
    expect(persisted?.candidateId).toBe('candidate-total');
    expect(persisted?.fileName).toMatch(/^afr-sha256-[0-9a-f]{24}\.json$/);

    // The terminal cleanup removed the checkpoint only because the record is durable.
    const checkpoint = path.join(root, 'state', 'camp-agent-findings.checkpoint.json');
    expect(fs.existsSync(checkpoint)).toBe(false);

    const directory = path.join(findingsRoot, 'agent-findings');
    const files = fs.readdirSync(directory);
    expect(files).toEqual([persisted?.fileName]);
    const stat = fs.statSync(path.join(directory, files[0] as string));
    expect(stat.mode & 0o777).toBe(0o600);

    const store = new AgentFindingStore({ root: findingsRoot });
    const records = store.list();
    expect(records).toHaveLength(1);
    expect(records[0]?.dossierId).toBe(persisted?.dossierId);
    expect(records[0]?.campaignId).toBe('camp-agent-findings');
    const validation = validateAgentFindingRecord(records[0]);
    expect(validation.ok).toBe(true);

    // The persisted record is the admission's own record, not a re-derivation.
    const admission = result.findingAdmissions[0];
    if (!admission || !admission.admitted) throw new Error('expected an admitted finding');
    expect(records[0]).toEqual(admission.record);
  });

  test('a write failure is reported and keeps the resumable checkpoint', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const campaignId = 'camp-blocked-findings';

    // Phase A: pause mid-investigation, which writes the campaign checkpoint.
    const pauseScript = writeFake(
      root,
      'pause.mjs',
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
      args: [pauseScript],
      provider: 'deterministic-test-cli',
      model: 'product-path-proof',
      maxTurns: 8,
      stateDirectory,
      findingsRoot: path.join(root, 'findings'),
      investigationContext: historicalContext(root),
    });
    expect(paused.terminationReason).toBe('PAUSED');
    const checkpoint = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    expect(fs.existsSync(checkpoint)).toBe(true);

    // Phase B: resume under a BLOCKED findings root; the resumed investigation
    // admits a finding, and the terminal stagnation stop must NOT delete the
    // checkpoint because the admission could not be persisted.
    const blocked = path.join(root, 'blocked-findings');
    fs.writeFileSync(blocked, 'not a directory\n');
    const resumeScript = writeFake(
      root,
      'resume.mjs',
      `
let raw = '';
process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
  const request = JSON.parse(raw);
  const inv = Number(String(request.campaignId).split(':inv:')[1] ?? '-1');
  const refs = Array.isArray(request.observation.evidenceRefs) ? request.observation.evidenceRefs : [];
  const turn = Number(String(request.turnId).split(':').at(-1));
  let intents;
  if (inv !== 0) {
    intents = [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }];
  } else if (turn <= 3) {
    // A resumed runtime carries no reproduction capability, so the resumed
    // investigation re-inspects its target before reproducing it.
    intents = [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: 'total.ts' } }];
  } else if (turn === 4) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
      reproductionId: 'repro-total', candidateId: 'candidate-total', sourcePath: 'total.ts',
      sourceEvidenceRef: refs[0], observedEvidenceRefs: refs } }];
  } else if (turn === 5) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'REQUEST_FINDING_PROPOSAL', arguments: {
      candidateId: 'candidate-total', evidenceRefs: refs,
      draft: { title: 'Total is wrong', description: 'The visible total path is wrong.', recommendedSeverity: 'S3' } } }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-total', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`,
    );
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [resumeScript],
      provider: 'deterministic-test-cli',
      model: 'product-path-proof',
      maxTurns: 8,
      stateDirectory,
      findingsRoot: blocked,
      investigationContext: historicalContext(root),
    });
    expect(resumed.terminationReason).toBe('NO_PROGRESS');
    expect(resumed.admissionPersistence).toBe('NOT_PERSISTED');
    expect(resumed.admissionPersistenceFailures[0]?.code).toBe('AGENT_FINDING_STORE_UNAVAILABLE');
    // The checkpoint survives: the durable-record precondition was not met.
    expect(fs.existsSync(checkpoint)).toBe(true);
    expect(listLocalCampaigns(stateDirectory).map((item) => item.campaignId)).toEqual([campaignId]);
  });

  test('re-persisting the same deterministic record is idempotent', async () => {
    const root = scratch();
    const findingsRoot = path.join(root, 'findings');
    const first = await runCampaign(root, { findingsRoot, campaignId: 'camp-agent-findings' });
    expect(first.admissionPersistence).toBe('PERSISTED');
    expect(first.persistedFindings[0]?.alreadyPresent).toBe(false);

    const second = await runCampaign(root, { findingsRoot, campaignId: 'camp-agent-findings' });
    expect(second.admissionPersistence).toBe('PERSISTED');
    expect(second.persistedFindings[0]?.alreadyPresent).toBe(true);
    expect(second.persistedFindings[0]?.dossierId).toBe(first.persistedFindings[0]?.dossierId);

    const store = new AgentFindingStore({ root: findingsRoot });
    expect(store.list()).toHaveLength(1);
  });
});

test.describe('terminated resume (6.3)', () => {
  test('returns the persisted record verbatim and never re-derives a refusal', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const findingsRoot = path.join(root, 'findings');
    const campaignId = 'camp-terminated-resume';

    // Phase A: a real admission persists its record.
    const admitted = await runCampaign(root, { findingsRoot, campaignId, stateDirectory });
    expect(admitted.admissionPersistence).toBe('PERSISTED');
    expect(admitted.persistedFindings).toHaveLength(1);

    // Phase B: a stored TERMINATED checkpoint for the same campaign (a real
    // pause checkpoint, flipped to its terminal status — the receipts are not
    // persisted, so re-derivation is impossible by construction).
    await pauseCampaign(root, { stateDirectory, campaignId, findingsRoot });
    const checkpointFile = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) as Record<string, unknown>;
    const state = document.state as Record<string, unknown>;
    state.status = 'TERMINATED';
    state.terminationReason = 'COMPLETE_WITH_FINDING';
    delete document.campaignProgress;
    fs.writeFileSync(checkpointFile, JSON.stringify(document, null, 2));

    // Phase C: resume. The reasoner must never run.
    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [writeFake(root, 'must-not-run.mjs', 'process.exit(97);\n')],
      provider: 'deterministic-test-cli',
      model: 'product-path-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(resumed.resumedFindingsStatus).toBe('RECORDS');
    expect(resumed.resumedFindings).toHaveLength(1);
    const record = resumed.resumedFindings[0];
    expect(validateAgentFindingRecord(record).ok).toBe(true);
    expect(record?.campaignId).toBe(campaignId);
    expect(resumed.dossierStatus).toBe('VERIFIED_REPRODUCTION');
    expect(resumed.findingAdmissions).toEqual([]);
    expect(resumed.admissionPersistence).toBe('PERSISTED');
    expect(resumed.reasonerCalls).toBe(0);

    // The record is byte-identical to what the admission derived.
    const stored = new AgentFindingStore({ root: findingsRoot }).read(record?.dossierId ?? '');
    expect(stored).toEqual(record);
  });

  test('reports UNAVAILABLE_NOT_PERSISTED when no record was ever written', async () => {
    const root = scratch();
    const stateDirectory = path.join(root, 'state');
    const findingsRoot = path.join(root, 'findings');
    const campaignId = 'camp-empty-resume';

    await pauseCampaign(root, { stateDirectory, campaignId, findingsRoot });
    const checkpointFile = path.join(stateDirectory, `${campaignId}.checkpoint.json`);
    const document = JSON.parse(fs.readFileSync(checkpointFile, 'utf8')) as Record<string, unknown>;
    const state = document.state as Record<string, unknown>;
    state.status = 'TERMINATED';
    state.terminationReason = 'COMPLETE_NO_FINDING';
    delete document.campaignProgress;
    fs.writeFileSync(checkpointFile, JSON.stringify(document, null, 2));

    const resumed = await resumeLocalCliCampaign({
      campaignId,
      ceilingName: 'HOUR_1',
      executable: process.execPath,
      args: [writeFake(root, 'unused.mjs', 'process.exit(97);\n')],
      provider: 'deterministic-test-cli',
      model: 'product-path-proof',
      maxTurns: 6,
      stateDirectory,
      findingsRoot,
      investigationContext: historicalContext(root),
    });
    expect(resumed.resumedFindingsStatus).toBe('UNAVAILABLE_NOT_PERSISTED');
    expect(resumed.resumedFindings).toEqual([]);
    expect(resumed.findingAdmissions).toEqual([]);
    expect(resumed.dossierStatus).toBe('NONE');
  });
});

test.describe('agent finding store (6.2)', () => {
  test('refuses a malformed record, a corrupt file, and a mismatched name', () => {
    const root = scratch();
    const store = new AgentFindingStore({ root });
    expect(() => store.persist({ not: 'a record' })).toThrow(AgentFindingStoreError);
    expect(() => store.persist({ not: 'a record' })).toThrow(/AGENT_FINDING_STORE_RECORD_INVALID/);

    const record = deriveAgentFindingRecord({
      campaignId: 'camp-store',
      candidateId: 'cand-store',
      receipts: [
        {
          schemaVersion: 'nightwatch.local-reproduction-receipt.v1',
          providerId: 'p',
          reproductionId: 'rep-1',
          candidateId: 'cand-store',
          sourcePath: 'acme/shop:src/a.ts',
          sourceEvidenceRef: 'ev:source',
          evidenceRef: 'ev:repro',
          verdict: 'REPRODUCED',
          preFix: 'FAIL',
          postFix: 'PASS',
          provenanceRefs: ['repro-provider:rep-1'],
        },
      ],
    });
    const persisted = store.persist(record);
    expect(persisted.alreadyPresent).toBe(false);
    expect(store.read(record.dossierId)).toEqual(record);
    expect(store.has(record.dossierId)).toBe(true);

    // A file whose content does not match its own name is refused, not ignored.
    const directory = path.join(root, 'agent-findings');
    const other = deriveAgentFindingRecord({
      campaignId: 'camp-store',
      candidateId: 'cand-other',
      receipts: [],
    });
    const otherName = `${other.dossierId.replace(/:/g, '-')}.json`;
    fs.copyFileSync(path.join(directory, persisted.fileName), path.join(directory, otherName));
    expect(() => store.list()).toThrow(/AGENT_FINDING_STORE_IDENTITY_MISMATCH/);

    // Corrupt JSON is refused rather than silently skipped.
    fs.writeFileSync(path.join(directory, otherName), '{ not json', { mode: 0o600 });
    expect(() => store.list()).toThrow(/AGENT_FINDING_STORE_CORRUPT/);
  });
});
