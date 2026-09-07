// W7 real historical product-path proof — OPT-IN.
//
// This is the load-bearing architecture proof: a REAL mined Alphaus historical
// case (default `mobingilabs/ouchan` fix `5985281b43cd`) executed through the
// ordinary local campaign machinery (`runLocalCliCampaign`) with the REAL
// contained test replay engine. Nothing here is a stub: the reproduction
// provider is the shared product provider and it materializes disposable
// pre-fix/post-fix trees from read-only sibling Git plumbing.
//
// It is skipped unless `NIGHTWATCH_REAL_HISTORICAL_PROOF=1`, because it needs a
// local sibling checkout plus a Go toolchain and takes ~75s. Run it with:
//
//   NIGHTWATCH_REAL_HISTORICAL_PROOF=1 npx playwright test \
//     tests/unit/realHistoricalProductPathProof.test.ts --project=nightwatch --workers=1
//
// Sibling repositories are only ever read. The case is selected by mined
// provenance, not hard-coded behavior: any mined record whose fix SHA matches
// `NIGHTWATCH_REAL_HISTORICAL_FIX_SHA` is admitted the same way.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { detectBenchmarkLeakage } from '../../src/core/agentProtocol/benchmark';
import { runLocalCliCampaign } from '../../src/core/agentRuntime/localCampaign';
import { buildReasonerVisibleContext } from '../../src/core/benchmark/case';
import { resolveMinedRepoPath, tryDefineMinedBenchmarkCase } from '../../src/core/benchmark/minedCases';
import { mineLocalGitHistory } from '../../src/core/bugAtlas/miner';
import { loadBugAtlasSnapshot } from '../../src/core/bugAtlas/snapshot';
import {
  createHistoricalLocalInvestigationContext,
  type HistoricalReplayAudit,
} from '../../src/core/localInvestigation/historical';
import { DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import type { BugAtlasRecord } from '../../src/core/agentProtocol/atlas';

const ENABLED = process.env['NIGHTWATCH_REAL_HISTORICAL_PROOF'] === '1';
const FIX_SHA = process.env['NIGHTWATCH_REAL_HISTORICAL_FIX_SHA'] ?? '5985281b43cd9dd2191a2bca17fb2e5ca7d2720a';
const REPOSITORY = process.env['NIGHTWATCH_REAL_HISTORICAL_REPOSITORY'] ?? 'mobingilabs/ouchan';
const SIBLING_ROOT = process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;

function minedRecords(): readonly BugAtlasRecord[] {
  try {
    const snapshot = loadBugAtlasSnapshot({});
    if (snapshot.records.length > 0) return snapshot.records;
  } catch {
    // No owner-private snapshot: fall through to the bounded read-only miner.
  }
  const report = mineLocalGitHistory({ repositoriesRoot: SIBLING_ROOT, repositoryIds: [REPOSITORY] });
  return report.status === 'MINED' ? report.records : [];
}

/** Deterministic out-of-process reasoner: index, inspect, hypothesize, reproduce, propose. */
function writeReasoner(directory: string): { readonly script: string; readonly capture: string; readonly scratch: string } {
  const script = path.join(directory, 'reasoner.mjs');
  const capture = path.join(directory, 'requests.jsonl');
  const scratch = path.join(directory, 'scratch.json');
  fs.writeFileSync(scratch, '{}', { mode: 0o600 });
  fs.writeFileSync(script, `
import fs from 'node:fs';
const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
  const raw = Buffer.concat(chunks).toString('utf8');
  fs.appendFileSync(process.argv[2], raw + '\\n');
  const request = JSON.parse(raw);
  const scratchFile = process.argv[3];
  const state = JSON.parse(fs.readFileSync(scratchFile, 'utf8'));
  const turn = Number(String(request.turnId).split(':').at(-1));
  const refs = Array.isArray(request.observation?.evidenceRefs) ? request.observation.evidenceRefs : [];
  const envelopes = Array.isArray(request.observation?.untrusted) ? request.observation.untrusted : [];
  let intents;
  if (!String(request.campaignId).endsWith(':inv:0')) {
    intents = [{ kind: 'CANCEL' }];
  } else if (turn === 1) {
    intents = [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: {} }];
  } else if (turn === 2) {
    let selected = null;
    try {
      const index = JSON.parse(envelopes[0]?.bytes ?? '{}');
      const entries = Array.isArray(index.entries) ? index.entries : [];
      selected = (entries.find((entry) => String(entry.path).endsWith('.go')) ?? entries[0])?.path ?? null;
    } catch {}
    state.selected = selected;
    fs.writeFileSync(scratchFile, JSON.stringify(state));
    intents = selected === null
      ? [{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]
      : [{ kind: 'CALL_TOOL', toolId: 'INSPECT_SOURCE_SURFACE', arguments: { path: selected } }];
  } else if (turn === 3) {
    state.sourceRef = refs[refs.length - 1] ?? null;
    fs.writeFileSync(scratchFile, JSON.stringify(state));
    intents = [{
      kind: 'FORM_HYPOTHESIS',
      hypothesisId: 'h-real-1',
      statement: 'The defect is in the visible pre-fix source path ' + state.selected + '.',
      evidenceRefs: refs,
    }];
  } else if (turn === 4) {
    intents = [{
      kind: 'CALL_TOOL',
      toolId: 'RERUN_SAFE_REPRODUCTION',
      arguments: {
        reproductionId: 'repro-real-1',
        candidateId: 'candidate-real-1',
        sourcePath: state.selected,
        sourceEvidenceRef: state.sourceRef,
        observedEvidenceRefs: refs,
      },
    }];
  } else if (turn === 5) {
    intents = [{
      kind: 'CALL_TOOL',
      toolId: 'REQUEST_FINDING_PROPOSAL',
      arguments: {
        candidateId: 'candidate-real-1',
        evidenceRefs: refs,
        draft: {
          title: 'Defect reproduced in ' + state.selected,
          description: 'The visible pre-fix source reproduces a deterministic failure the fixed revision does not exhibit.',
          recommendedSeverity: 'S2',
          severityConfidence: 'MEDIUM',
          severityRationale: 'A deterministic local replay separates failing and passing revisions.',
          confidence: 'HIGH',
          alternativeHypotheses: ['A caller-side contract change could produce the same observation.'],
          reproductionCount: 99,
        },
      },
    }];
  } else {
    intents = [
      { kind: 'PROPOSE_CANDIDATE', candidateId: 'candidate-real-1', evidenceRefs: refs },
      { kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' },
    ];
  }
  process.stdout.write(JSON.stringify({ schemaVersion: 'nightwatch.reasoner-turn-response.v1', intents, hypotheses: [] }));
});
`, { mode: 0o700 });
  return { script, capture, scratch };
}

test.describe('real historical product-path proof', () => {
  test.skip(!ENABLED, 'opt-in: set NIGHTWATCH_REAL_HISTORICAL_PROOF=1 with a local sibling checkout and Go toolchain');
  test.setTimeout(600_000);

  test('a real mined historical defect is reproduced and admitted through the normal campaign path', async () => {
    const record = minedRecords().find((item) => String(item.provenance.sourceSha ?? '').startsWith(FIX_SHA.slice(0, 12)));
    expect(record, `no mined Bug Atlas record for ${FIX_SHA}`).toBeTruthy();
    if (!record) return;
    const repoPath = resolveMinedRepoPath(SIBLING_ROOT, record.repository);
    expect(repoPath, `sibling repository ${record.repository} is not readable`).not.toBeNull();
    if (repoPath === null) return;
    const definedCase = tryDefineMinedBenchmarkCase(record, repoPath);
    expect(definedCase, 'mined case must isolate its hidden ground truth').toBeTruthy();
    if (!definedCase) return;
    expect(definedCase.minedReplay).not.toBeNull();

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-real-proof-'));
    const auditBox: { current: HistoricalReplayAudit | null } = { current: null };
    try {
      // No runReplay override: the shared provider calls the real contained
      // replay engine against read-only sibling Git plumbing.
      const context = createHistoricalLocalInvestigationContext({
        visible: buildReasonerVisibleContext(definedCase),
        caseId: definedCase.caseId,
        minedReplay: definedCase.minedReplay,
        repositoriesRoot: SIBLING_ROOT,
        auditBox,
      });
      const reasoner = writeReasoner(directory);
      const result = await runLocalCliCampaign({
        campaignId: 'real-historical-product-path-proof',
        ceilingName: 'HOUR_1',
        executable: process.execPath,
        args: [reasoner.script, reasoner.capture, reasoner.scratch],
        provider: 'deterministic-local-proof',
        model: 'real-historical-product-path',
        maxTurns: 7,
        stateDirectory: path.join(directory, 'state'),
        investigationContext: context,
      });

      // Mechanically observed reproduction, not a model claim.
      expect(auditBox.current?.verdict).toBe('REPRODUCED');
      expect(auditBox.current?.reason).toBe('PRE_FAIL_POST_PASS');
      expect(result.candidateIds).toEqual(['candidate-real-1']);
      expect(result.dossierStatus).toBe('VERIFIED_REPRODUCTION');
      expect(result.reproductionCount).toBe(1);
      const admission = result.findingAdmissions[0];
      expect(admission?.admitted).toBe(true);
      if (!admission || !admission.admitted) throw new Error('expected a mechanically admitted finding');
      // The forged draft count is ignored; the derived count is authoritative.
      expect(admission.reproductionCount).toBe(1);
      expect(admission.dossier.reproductionCount).toBe(1);
      expect(admission.dossier.authority.humanReviewRequired).toBe(true);
      expect(admission.dossier.authority.externalPublication).toBe('PROHIBITED');
      // Grounded in a real visible source path from the mined pre-fix surface.
      expect(admission.sourcePaths).toHaveLength(1);
      expect(admission.sourcePaths[0]).toMatch(/\.go$/);

      // Zero hidden-ground-truth leakage into reasoner-visible requests.
      const requestBlobs = fs.readFileSync(reasoner.capture, 'utf8').split('\n').filter((line) => line.length > 0);
      expect(requestBlobs.length).toBeGreaterThan(0);
      expect(detectBenchmarkLeakage({ blobs: requestBlobs }, definedCase.hidden)).toEqual([]);
      const traffic = requestBlobs.join('\n');
      for (const value of Object.values(definedCase.hidden)) {
        if (typeof value === 'string' && value.length > 0) expect(traffic).not.toContain(value);
      }
      const dossierText = JSON.stringify(admission.dossier);
      for (const value of Object.values(definedCase.hidden)) {
        if (typeof value === 'string' && value.length > 0) expect(dossierText).not.toContain(value);
      }
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
