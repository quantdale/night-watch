// W7 admission lane — mechanical finding admission acceptance.
// Pure deterministic fixtures only: no network, no filesystem, no clock.
import { test, expect } from '@playwright/test';

import { AUTONOMOUS_FINDING_AUTHORITY } from '../../src/core/agentProtocol/finding';
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

const CANDIDATE_ID = 'cand-1';
const SOURCE_PATH = 'src/checkout/total.ts';
const SOURCE_EVIDENCE = 'ev:source:src/checkout/total.ts';
const REPRO_EVIDENCE = 'ev:repro:rep-1';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    knownTargets: [],
    campaignId: 'campaign-admission-test',
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

function makeReceipt(overrides: Partial<LocalReproductionReceipt> = {}): LocalReproductionReceipt {
  return {
    schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
    providerId: 'deterministic-repro-test',
    reproductionId: 'rep-1',
    candidateId: CANDIDATE_ID,
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    evidenceRef: REPRO_EVIDENCE,
    verdict: 'REPRODUCED',
    preFix: 'FAIL',
    postFix: 'PASS',
    provenanceRefs: ['repro-provider:rep-1'],
    ...overrides,
  };
}

function makeHistory(overrides: Partial<LocalInvestigationHistory> = {}): LocalInvestigationHistory {
  return {
    schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
    observedEvidence: [
      { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
      { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
    ],
    inspectedSources: [{ path: SOURCE_PATH, evidenceRef: SOURCE_EVIDENCE }],
    reproductions: [makeReceipt()],
    findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
    ...overrides,
  };
}

function suggestiveDraft(): Record<string, unknown> {
  return {
    title: 'Checkout total drifts under concurrent coupon apply',
    description: 'Two rapid coupon applications produce a blended total.',
    recommendedSeverity: 'S2',
    severityConfidence: 'HIGH',
    severityRationale: 'Wrong total observed after a realistic double-submit.',
    confidence: 'HIGH',
    alternativeHypotheses: ['Stale read from the totals cache.'],
  };
}

test.describe('mechanical admission refusals', () => {
  test('forged count 99 without runtime reproduction is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [] }),
      candidateId: CANDIDATE_ID,
      draft: { ...suggestiveDraft(), reproductionCount: 99 },
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('MISSING_REPRODUCTION');
    expect(result.reproductionCount).toBe(0);
    expect('dossier' in result).toBe(false);
  });

  test('invented proposal evidence is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: ['ev:forged:never-observed'], draft: null }],
      }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('INVENTED_EVIDENCE');
  });

  test('invented draft evidence is refused even with a valid proposal', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: { ...suggestiveDraft(), evidenceRefs: [SOURCE_EVIDENCE, 'ev:forged:draft-invention'] },
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('INVENTED_EVIDENCE');
  });

  test('unknown candidate is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: 'cand-ghost',
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNKNOWN_CANDIDATE');
  });

  test('candidate without a finding proposal is refused', () => {
    const result = admitLocalFinding({
      state: makeState({ candidateIds: [CANDIDATE_ID, 'cand-2'], evidenceRefs: [SOURCE_EVIDENCE] }),
      history: makeHistory(),
      candidateId: 'cand-2',
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('MISSING_PROPOSAL');
  });

  test('reproduction for an unrelated candidate cannot admit', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeReceipt({ candidateId: 'cand-other', reproductionId: 'rep-other', evidenceRef: 'ev:repro:rep-other' })],
        observedEvidence: [
          { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
          { evidenceRef: 'ev:repro:rep-other', toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
        ],
      }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(['MISSING_REPRODUCTION', 'UNLINKED_REPRODUCTION']).toContain(result.reason);
  });

  test('ENVIRONMENT_BLOCKED and NOT_REPRODUCED receipts mint no credit', () => {
    for (const verdict of ['ENVIRONMENT_BLOCKED', 'NOT_AVAILABLE', 'NOT_REPRODUCED'] as const) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [makeReceipt({ verdict })] }),
        candidateId: CANDIDATE_ID,
        draft: suggestiveDraft(),
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
    }
  });

  test('receipt without pre-fix FAIL and post-fix PASS is refused', () => {
    const flipped = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeReceipt({ preFix: 'PASS', postFix: 'PASS' })] }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(flipped.admitted).toBe(false);
    const inconclusive = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeReceipt({ preFix: 'FAIL', postFix: 'BLOCKED' })] }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(inconclusive.admitted).toBe(false);
  });

  test('receipt for a never-inspected source is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        inspectedSources: [],
        reproductions: [makeReceipt()],
      }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });
});

test.describe('mechanical admission success', () => {
  test('one linked pre-fail/post-pass receipt yields one human-review-only dossier', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.reproductionIds).toEqual(['rep-1']);
    expect(result.sourcePaths).toEqual([SOURCE_PATH]);
    expect(result.evidenceRefs).toContain(SOURCE_EVIDENCE);
    for (const ref of result.evidenceRefs) {
      expect([SOURCE_EVIDENCE, REPRO_EVIDENCE]).toContain(ref);
    }
    const dossier = result.dossier;
    expect(dossier.reproductionCount).toBe(1);
    expect(dossier.title).toContain('Checkout total');
    expect(dossier.environment).toBe('LOCAL');
    expect(dossier.team).toBe('UNKNOWN');
    expect(dossier.authority).toBe(AUTONOMOUS_FINDING_AUTHORITY);
    expect(dossier.authority.humanReviewRequired).toBe(true);
    expect(dossier.authority.externalPublication).toBe('PROHIBITED');
    expect(dossier.authority.autoFile).toBe(false);
    expect(dossier.authority.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    expect(dossier.falsePositiveChecks.length).toBeGreaterThanOrEqual(1);
    expect(dossier.provenance.length).toBeGreaterThanOrEqual(1);
    expect(dossier.sourceLocations).toContain(SOURCE_PATH);
  });

  test('forged draft count, provenance, and authority are derived or pinned, not trusted', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: {
        ...suggestiveDraft(),
        reproductionCount: 99,
        provenance: ['forged:evil-provenance'],
        authority: { humanReviewRequired: false, externalPublication: 'ALLOWED' },
      },
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.dossier.reproductionCount).toBe(1);
    expect(result.dossier.provenance).not.toContain('forged:evil-provenance');
    expect(result.dossier.authority.humanReviewRequired).toBe(true);
    expect(result.dossier.authority.externalPublication).toBe('PROHIBITED');
  });

  test('two linked receipts derive count two', () => {
    const second = makeReceipt({
      reproductionId: 'rep-2',
      evidenceRef: 'ev:repro:rep-2',
      provenanceRefs: ['repro-provider:rep-2'],
    });
    const result = admitLocalFinding({
      state: makeState({ evidenceRefs: [SOURCE_EVIDENCE, REPRO_EVIDENCE, 'ev:repro:rep-2'] }),
      history: makeHistory({
        observedEvidence: [
          { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
          { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
          { evidenceRef: 'ev:repro:rep-2', toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
        ],
        reproductions: [makeReceipt(), second],
      }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(2);
    expect(result.dossier.reproductionCount).toBe(2);
  });

  test('admission exposes no audit bytes', () => {
    const receiptWithAudit = {
      ...makeReceipt(),
      audit: 'AUDIT_SECRET_BYTES: stderr head with fix diff',
    } as LocalReproductionReceipt;
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [receiptWithAudit] }),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(JSON.stringify(result.dossier)).not.toContain('AUDIT_SECRET_BYTES');
  });

  test('admission is deterministic', () => {
    const input = {
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: suggestiveDraft(),
    };
    expect(admitLocalFinding(input)).toEqual(admitLocalFinding(input));
  });
});
