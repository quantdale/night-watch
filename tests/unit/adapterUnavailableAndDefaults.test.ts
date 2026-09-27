// M5 task 6.15 (C-29, NW-AUD-046/047) — malformed state is refused, defaulted
// presentation fields are marked, and the Lane C atlas adapters report
// ADAPTER_UNAVAILABLE rather than substituting a fixture.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AGENT_RUNTIME_STATE_VERSION,
  defaultAgentBudgetPolicy,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol/runtime';
import type { AgentRuntimeState } from '../../src/core/agentProtocol/runtime';
import {
  LOCAL_INVESTIGATION_HISTORY_VERSION,
  LOCAL_REPRODUCTION_RECEIPT_VERSION,
} from '../../src/core/localInvestigation/types';
import type {
  LocalInvestigationHistory,
  LocalReproductionReceipt,
} from '../../src/core/localInvestigation/types';
import { admitLocalFinding } from '../../src/core/localInvestigation/admission';
import { PRESENTATION_FIELDS } from '../../src/core/localInvestigation/agentFindingRecord';
import { createOwnerLocalInvestigationContext } from '../../src/core/localInvestigation/ownerLocal';

const CANDIDATE_ID = 'cand-adapter';
const SOURCE_PATH = 'acme/shop:packages/checkout';
const SOURCE_EVIDENCE = 'ev:source:acme/shop:packages/checkout';
const REPRO_EVIDENCE = 'ev:repro:rep-adapter-1';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    knownTargets: [],
    campaignId: 'camp-adapter-defaults',
    status: 'RUNNING',
    phase: 'VERIFY',
    hypotheses: [],
    actionLog: [],
    evidenceRefs: [SOURCE_EVIDENCE, REPRO_EVIDENCE],
    candidateIds: [CANDIDATE_ID],
    budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
    terminationReason: null,
    ...overrides,
  };
}

function makeHistory(): LocalInvestigationHistory {
  const receipt: LocalReproductionReceipt = {
    schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
    providerId: 'owner-local-repro-test',
    reproductionId: 'rep-adapter-1',
    candidateId: CANDIDATE_ID,
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    evidenceRef: REPRO_EVIDENCE,
    verdict: 'REPRODUCED',
    preFix: 'FAIL',
    postFix: 'PASS',
    provenanceRefs: ['repro-provider:rep-adapter-1'],
  };
  return {
    schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
    observedEvidence: [
      { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
      { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
    ],
    inspectedSources: [{ path: SOURCE_PATH, evidenceRef: SOURCE_EVIDENCE }],
    reproductions: [receipt],
    findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
  };
}

test.describe('malformed state, presentation defaults and atlas adapters (6.15)', () => {
  test('a non-array candidateIds is refused instead of falling back', () => {
    const malformed = makeState({ candidateIds: 'cand-adapter' as unknown as readonly string[] });
    const result = admitLocalFinding({ state: malformed, history: makeHistory(), candidateId: CANDIDATE_ID });
    expect(result.admitted).toBe(false);
    if (!result.admitted) {
      expect(result.reason).toBe('MALFORMED_STATE');
      expect(result.detail).toContain('not an array');
    }
  });

  test('an empty draft marks every defaulted presentation field on the result and the record', () => {
    const result = admitLocalFinding({ state: makeState(), history: makeHistory(), candidateId: CANDIDATE_ID });
    expect(result.admitted).toBe(true);
    if (!result.admitted) return;
    expect([...result.presentationDefaults].sort()).toEqual([...PRESENTATION_FIELDS].sort());
    expect([...result.record.presentationDefaults].sort()).toEqual([...PRESENTATION_FIELDS].sort());
  });

  test('a grounded draft marks only the fields the model actually omitted', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: {
        title: 'Model title',
        description: 'Model description',
        recommendedSeverity: 'S2',
        severityConfidence: 'HIGH',
        severityRationale: 'Model rationale',
        confidence: 'HIGH',
        alternativeHypotheses: ['A model hypothesis'],
      },
    });
    expect(result.admitted).toBe(true);
    if (!result.admitted) return;
    expect(result.presentationDefaults).toEqual([]);
    expect(result.record.presentationDefaults).toEqual([]);
  });

  test('the atlas adapters report ADAPTER_UNAVAILABLE when nothing is configured', async () => {
    // No owner-private snapshot and no minable history: the adapters must say
    // so rather than substituting a fixture.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-atlas-adapter-'));
    try {
      const context = createOwnerLocalInvestigationContext({
        bugAtlasStateDirectory: path.join(root, 'bug-atlas'),
        bugAtlasRepositoriesRoot: path.join(root, 'repositories'),
      });
      const bugAtlas = await context.bugAtlas.load();
      expect(bugAtlas.status).toBe('BLOCKED');
      if (bugAtlas.status === 'BLOCKED') {
        expect(bugAtlas.class).toBe('ADAPTER_UNAVAILABLE');
        expect(bugAtlas.reason).toContain('adapter is unavailable');
      }
      const systemAtlas = await context.systemAtlas.load();
      expect(systemAtlas.status).toBe('BLOCKED');
      if (systemAtlas.status === 'BLOCKED') {
        expect(systemAtlas.class).toBe('ADAPTER_UNAVAILABLE');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
