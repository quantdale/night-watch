import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REASONER_TURN_RESPONSE_VERSION } from '../../src/core/agentProtocol';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import {
  createHistoricalLocalInvestigationContext,
} from '../../src/core/localInvestigation/historical';
import {
  MINED_TEST_REPLAY_VERSION,
  parseMinedTestReplayDescriptor,
  type ContainedTestReplayResult,
} from '../../src/core/benchmark/containedTestReplay';

const FIX_SHA = 'b'.repeat(40);
const HIDDEN_TEST = 'hidden_total_test.go';
const STDERR_CANARY = 'hidden-stderr-canary';
const SOURCE_CANARY = 'visible-source-canary';

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function scratch(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-real-local-path-'));
  roots.push(root);
  return root;
}

function replayResult(): ContainedTestReplayResult {
  return {
    verdict: 'REPRODUCED',
    reason: 'PRE_FAIL_POST_PASS',
    preFix: { signal: 'FAIL', reason: 'TESTS_FAILED', exitCode: 1, timedOut: false },
    postFix: { signal: 'PASS', reason: 'TESTS_PASSED', exitCode: 0, timedOut: false },
    stderrHead: `${HIDDEN_TEST}: ${STDERR_CANARY}`,
    durationMs: 10,
    skippedSubmodules: [],
  };
}

function writeReasoner(root: string): { readonly executable: string; readonly capture: string } {
  const executable = path.join(root, 'reasoner.mjs');
  const capture = path.join(root, 'requests.jsonl');
  fs.writeFileSync(executable, `
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
    intents = [{ kind: 'FORM_HYPOTHESIS', hypothesisId: 'h-total', statement: 'total.ts applies the adjustment twice', evidenceRefs: refs }];
  } else if (turn === 3) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'RERUN_SAFE_REPRODUCTION', arguments: {
      reproductionId: 'repro-total', candidateId: 'candidate-total', sourcePath: 'total.ts',
      sourceEvidenceRef: refs[0], observedEvidenceRefs: refs,
    } }];
  } else if (turn === 4) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'REQUEST_FINDING_PROPOSAL', arguments: {
      candidateId: 'candidate-total', evidenceRefs: refs,
      draft: {
        title: 'Total adjustment is applied twice',
        description: 'The visible total path applies the same adjustment twice.',
        recommendedSeverity: 'S3', severityConfidence: 'MEDIUM',
        severityRationale: 'A deterministic local replay observes the wrong total.',
        confidence: 'HIGH', alternativeHypotheses: ['A stale caller may provide duplicate input.'],
        reproductionCount: 99,
      },
    } }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-total', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: '${REASONER_TURN_RESPONSE_VERSION}', intents, hypotheses: [] }));
});
`, { mode: 0o700 });
  return { executable, capture };
}

test('normal local campaign path mechanically admits one historical reproduction without leakage', async () => {
  const root = scratch();
  const repositoriesRoot = path.join(root, 'repositories');
  fs.mkdirSync(path.join(repositoriesRoot, 'example', 'ledger'), { recursive: true });
  const descriptor = parseMinedTestReplayDescriptor({
    schemaVersion: MINED_TEST_REPLAY_VERSION,
    repository: 'example/ledger',
    fixCommit: FIX_SHA,
    testPath: HIDDEN_TEST,
    packageDir: '.',
  });
  expect(descriptor).not.toBeNull();
  const context = createHistoricalLocalInvestigationContext({
    visible: { blobs: ['inspect', `--- total.ts\nexport const total = input - adjustment - adjustment; // ${SOURCE_CANARY}\n`, 'observe'] },
    caseId: 'historical-product-path',
    minedReplay: descriptor,
    repositoriesRoot,
    runReplay: async () => replayResult(),
  });
  const reasoner = writeReasoner(root);

  const result = await runLocalCliCampaign({
    campaignId: 'real-local-historical-path',
    ceilingName: 'HOUR_1',
    executable: process.execPath,
    args: [reasoner.executable, reasoner.capture],
    provider: 'deterministic-test-cli',
    model: 'product-path-proof',
    maxTurns: 6,
    stateDirectory: path.join(root, 'state'),
    investigationContext: context,
  });

  expect(result.terminationReason).toBe('CANCELLED');
  expect(result.candidateIds).toEqual(['candidate-total']);
  expect(result.dossierStatus).toBe('VERIFIED_REPRODUCTION');
  expect(result.reproductionCount).toBe(1);
  expect(result.findingAdmissions).toHaveLength(1);
  const admission = result.findingAdmissions[0];
  expect(admission?.admitted).toBe(true);
  if (!admission || !admission.admitted) throw new Error('expected admitted finding');
  expect(admission.reproductionCount).toBe(1);
  expect(admission.dossier.reproductionCount).toBe(1);
  expect(admission.dossier.authority.externalPublication).toBe('PROHIBITED');
  expect(admission.dossier.authority.humanReviewRequired).toBe(true);

  const requestTraffic = fs.readFileSync(reasoner.capture, 'utf8');
  expect(requestTraffic).toContain(SOURCE_CANARY);
  expect(requestTraffic).not.toContain(HIDDEN_TEST);
  expect(requestTraffic).not.toContain(FIX_SHA);
  expect(requestTraffic).not.toContain(STDERR_CANARY);
});
