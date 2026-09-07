// W9 admission lane — current-source finding admission acceptance.
// Pure deterministic fixtures only: no network, no filesystem, no clock.
// Covers the current-source branch (REPRODUCED_CURRENT_FAILURE + provider-
// minted proof), every forged-proof negative, mixed historical+current
// receipts, candidate/source linking, and byte-exact historical compatibility.
import { test, expect } from '@playwright/test';

import { AUTONOMOUS_FINDING_AUTHORITY } from '../../src/core/agentProtocol/finding';
import {
  AGENT_RUNTIME_STATE_VERSION,
  defaultAgentBudgetPolicy,
  ZERO_AGENT_BUDGET_USAGE,
} from '../../src/core/agentProtocol/runtime';
import type { AgentRuntimeState } from '../../src/core/agentProtocol/runtime';
import { OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION } from '../../src/core/localInvestigation/currentSourceProof';
import type { OwnerLocalCurrentSourceProof } from '../../src/core/localInvestigation/currentSourceProof';
import {
  LOCAL_INVESTIGATION_HISTORY_VERSION,
  LOCAL_REPRODUCTION_RECEIPT_VERSION,
} from '../../src/core/localInvestigation/types';
import type {
  LocalInvestigationHistory,
  LocalReproductionReceipt,
} from '../../src/core/localInvestigation/types';
import { admitLocalFinding } from '../../src/core/localInvestigation/admission';

const CANDIDATE_ID = 'cand-current';
const SOURCE_PATH = 'acme/shop:packages/checkout';
const SOURCE_EVIDENCE = 'ev:source:acme/shop:packages/checkout';
const REPRO_EVIDENCE = 'ev:repro:rep-cur-1';
const PROVIDER_ID = 'owner-local-repro-test';

const HIST_CANDIDATE = 'cand-hist';
const HIST_REPRO_EVIDENCE = 'ev:repro:rep-hist-1';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    knownTargets: [],
    campaignId: 'campaign-current-source-admission-test',
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

function makeProof(overrides: Partial<OwnerLocalCurrentSourceProof> = {}): OwnerLocalCurrentSourceProof {
  return {
    schemaVersion: OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
    proofKind: 'CURRENT_SOURCE_REPEATED_TEST_FAILURE',
    mintedBy: PROVIDER_ID,
    repository: 'acme/shop',
    packageRelativePath: 'packages/checkout',
    repositoryHeadSha: 'abcdef1234567890',
    sourcePath: SOURCE_PATH,
    sourceContentDigest: 'sha256:abc123',
    targetDigest: 'tgt:sha256:0123456789abcdef01234567',
    failureFingerprint: 'fp:sha256:abcdef0123456789abcdef01',
    executionCount: 2,
    failureClass: 'TEST_ASSERTION_FAILURE',
    discriminatorOrigin: 'PRE_EXISTING_REPOSITORY_TEST',
    siblingIdentityStable: true,
    networkDisabled: true,
    ...overrides,
  };
}

function makeCurrentReceipt(
  overrides: Partial<LocalReproductionReceipt> = {},
  proofOverrides: Partial<OwnerLocalCurrentSourceProof> = {},
): LocalReproductionReceipt {
  return {
    schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
    providerId: PROVIDER_ID,
    reproductionId: 'rep-cur-1',
    candidateId: CANDIDATE_ID,
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    evidenceRef: REPRO_EVIDENCE,
    verdict: 'REPRODUCED_CURRENT_FAILURE',
    preFix: 'FAIL',
    postFix: 'NOT_RUN',
    provenanceRefs: ['repro-provider:rep-cur-1'],
    currentSourceProof: makeProof(proofOverrides),
    ...overrides,
  };
}

function makeHistoricalReceipt(overrides: Partial<LocalReproductionReceipt> = {}): LocalReproductionReceipt {
  return {
    schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
    providerId: PROVIDER_ID,
    reproductionId: 'rep-hist-1',
    candidateId: HIST_CANDIDATE,
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    evidenceRef: HIST_REPRO_EVIDENCE,
    verdict: 'REPRODUCED',
    preFix: 'FAIL',
    postFix: 'PASS',
    provenanceRefs: ['repro-provider:rep-hist-1'],
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
    reproductions: [makeCurrentReceipt()],
    findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
    ...overrides,
  };
}

function makeHistHistory(overrides: Partial<LocalInvestigationHistory> = {}): LocalInvestigationHistory {
  return {
    schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
    observedEvidence: [
      { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
      { evidenceRef: HIST_REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
    ],
    inspectedSources: [{ path: SOURCE_PATH, evidenceRef: SOURCE_EVIDENCE }],
    reproductions: [makeHistoricalReceipt()],
    findingProposals: [{ candidateId: HIST_CANDIDATE, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
    ...overrides,
  };
}

function makeHistState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return makeState({
    evidenceRefs: [SOURCE_EVIDENCE, HIST_REPRO_EVIDENCE],
    candidateIds: [HIST_CANDIDATE],
    ...overrides,
  });
}

test.describe('current-source admission positive', () => {
  test('one linked current-source receipt admits with repeated-failure dossier', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: { title: 'Checkout total fails its own unit test' },
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.reproductionIds).toEqual(['rep-cur-1']);
    expect(result.sourcePaths).toEqual([SOURCE_PATH]);
    expect(result.evidenceRefs).toEqual([REPRO_EVIDENCE, SOURCE_EVIDENCE].sort());
    expect(result.provenanceRefs).toContain(SOURCE_EVIDENCE);
    expect(result.provenanceRefs).toContain(REPRO_EVIDENCE);
    expect(result.provenanceRefs).toContain('repro-provider:rep-cur-1');
    const dossier = result.dossier;
    expect(dossier.reproductionCount).toBe(1);
    expect(dossier.environment).toBe('LOCAL');
    expect(dossier.team).toBe('UNKNOWN');
    expect(dossier.authority).toBe(AUTONOMOUS_FINDING_AUTHORITY);
    expect(dossier.authority.humanReviewRequired).toBe(true);
    expect(dossier.authority.externalPublication).toBe('PROHIBITED');
    expect(dossier.authority.autoFile).toBe(false);
    expect(dossier.authority.organizationalAuthority).toBe('NONE_LOCAL_REVIEW_ONLY');
    expect(dossier.reproduction).toContain('repeated CURRENT source failure');
    expect(dossier.reproduction).toContain('REPRODUCED_CURRENT_FAILURE');
    expect(dossier.reproduction).toContain('no post-fix PASS');
    expect(dossier.reproduction).not.toContain('post-fix PASS observed (verdict');
    expect(dossier.reproduction).not.toContain('previously unknown');
    expect(dossier.expected).toContain('repeated CURRENT source');
    expect(dossier.expected).toContain('no post-fix PASS claimed');
    expect(dossier.expected).not.toContain('previously unknown');
    expect(dossier.actual).toContain('repeated CURRENT source failure');
    expect(dossier.actual).toContain('REPRODUCED_CURRENT_FAILURE');
    expect(dossier.actual).not.toContain('previously unknown');
    const currentCheck = dossier.falsePositiveChecks.find((line) => line.includes('rep-cur-1'));
    expect(currentCheck).toContain('repeated CURRENT source failure');
    expect(currentCheck).toContain('REPRODUCED_CURRENT_FAILURE');
    expect(currentCheck).toContain('repeated test failure proof');
    expect(currentCheck).not.toContain('post-fix PASS observed');
    expect(dossier.falsePositiveChecks).toContain(
      'human-review-required: confirm scope, non-flakiness, and impact; no auto-file or external publication',
    );
    expect(JSON.stringify(dossier)).not.toContain('previously unknown');
  });

  test('default description names the repeated current failure without claiming a fix', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.dossier.description).toBe(
      `Mechanically admitted local finding ${CANDIDATE_ID} with linked repeated CURRENT source failure reproduction (no post-fix PASS observed or claimed).`,
    );
  });

  test('three executions still admit and proof digests never leak into the dossier', () => {
    const proof = makeProof({ executionCount: 3 });
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeCurrentReceipt({}, { executionCount: 3 })] }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    const dossierJson = JSON.stringify(result.dossier);
    expect(dossierJson).not.toContain(proof.failureFingerprint);
    expect(dossierJson).not.toContain(proof.targetDigest);
    expect(dossierJson).not.toContain('AUDIT');
    expect(result.evidenceRefs).not.toContain(proof.failureFingerprint);
    expect(result.evidenceRefs).not.toContain(proof.targetDigest);
    expect(result.provenanceRefs).not.toContain(proof.failureFingerprint);
    expect(result.provenanceRefs).not.toContain(proof.targetDigest);
  });

  test('forged draft count, proof, provenance, and authority are derived or pinned, not trusted', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: {
        title: 'Current checkout failure',
        reproductionCount: 99,
        currentSourceProof: { forged: true, executionCount: 99 },
        provenance: ['forged:evil-provenance'],
        authority: { humanReviewRequired: false, externalPublication: 'ALLOWED' },
      },
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.dossier.reproductionCount).toBe(1);
    expect(result.dossier.provenance).not.toContain('forged:evil-provenance');
    expect(JSON.stringify(result.dossier)).not.toContain('forged');
    expect(result.dossier.authority.humanReviewRequired).toBe(true);
    expect(result.dossier.authority.externalPublication).toBe('PROHIBITED');
  });

  test('a draft-carried proof alone admits nothing without a receipt proof', () => {
    const history = makeHistory({ reproductions: [makeCurrentReceipt({ currentSourceProof: null })] });
    const result = admitLocalFinding({
      state: makeState(),
      history,
      candidateId: CANDIDATE_ID,
      draft: { currentSourceProof: makeProof() },
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('admission is deterministic', () => {
    const input = {
      state: makeState(),
      history: makeHistory(),
      candidateId: CANDIDATE_ID,
      draft: { title: 'Checkout total fails its own unit test' },
    };
    expect(admitLocalFinding(input)).toEqual(admitLocalFinding(input));
  });
});

test.describe('current-source admission negatives', () => {
  test('receipt without any proof is refused as unlinked', () => {
    for (const proof of [null, undefined]) {
      const receipt = makeCurrentReceipt({ currentSourceProof: proof });
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [receipt] }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('UNLINKED_REPRODUCTION');
      expect(result.reproductionCount).toBe(0);
      expect('dossier' in result).toBe(false);
    }
  });

  test('proof bound to another provider is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { mintedBy: 'some-other-provider' })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('proof bound to another source path is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { sourcePath: 'acme/shop:packages/other' })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('a single execution is insufficient', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeCurrentReceipt({}, { executionCount: 1 })] }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('malformed failure fingerprints are refused', () => {
    for (const failureFingerprint of ['not-a-digest', 'FP:sha256:ABCDEF0123456789ABCDEF01', 'fp:sha256:abc']) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [makeCurrentReceipt({}, { failureFingerprint })] }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('UNLINKED_REPRODUCTION');
    }
  });

  test('malformed target digest is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { targetDigest: 'bogus-digest' })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('build, environment, timeout, and process failure classes never qualify', () => {
    for (const failureClass of ['BUILD_FAILURE', 'ENVIRONMENT_FAILURE', 'TIMEOUT', 'PROCESS_FAILURE'] as const) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [makeCurrentReceipt({}, { failureClass })] }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('UNLINKED_REPRODUCTION');
    }
  });

  test('model-generated discriminator never qualifies', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { discriminatorOrigin: 'MODEL_GENERATED_TEST' })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('unstable sibling identity is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { siblingIdentityStable: false })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('network-enabled execution is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt({}, { networkDisabled: false })],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('unknown proof kind and schema are refused', () => {
    const badKind = {
      ...makeProof(),
      proofKind: 'HISTORICAL_PRE_FAIL_POST_PASS',
    } as unknown as OwnerLocalCurrentSourceProof;
    const badSchema = {
      ...makeProof(),
      schemaVersion: 'nightwatch.owner-local-current-source-proof.v0',
    } as unknown as OwnerLocalCurrentSourceProof;
    for (const currentSourceProof of [badKind, badSchema]) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [makeCurrentReceipt({ currentSourceProof })] }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('UNLINKED_REPRODUCTION');
    }
  });

  test('current verdict with post-fix PASS or pre-fix PASS is refused', () => {
    for (const signals of [
      { preFix: 'FAIL', postFix: 'PASS' },
      { preFix: 'PASS', postFix: 'NOT_RUN' },
    ] as const) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({ reproductions: [makeCurrentReceipt({ ...signals })] }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('UNLINKED_REPRODUCTION');
    }
  });

  test('proof digests cannot serve as proposal evidence', () => {
    const proof = makeProof();
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        reproductions: [makeCurrentReceipt()],
        findingProposals: [
          { candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE, proof.failureFingerprint], draft: null },
        ],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('INVENTED_EVIDENCE');
  });

  test('histories with no reproduced verdict report missing reproduction', () => {
    for (const verdict of ['NOT_REPRODUCED', 'ENVIRONMENT_BLOCKED', 'NOT_AVAILABLE', 'INCONCLUSIVE'] as const) {
      const result = admitLocalFinding({
        state: makeState(),
        history: makeHistory({
          reproductions: [makeCurrentReceipt({ verdict, currentSourceProof: null })],
        }),
        candidateId: CANDIDATE_ID,
        draft: {},
      });
      expect(result.admitted).toBe(false);
      if (result.admitted !== false) throw new Error('expected refusal');
      expect(result.reason).toBe('MISSING_REPRODUCTION');
    }
  });
});

test.describe('mixed historical and current-source receipts', () => {
  function makeMixedHistory(
    historical: LocalReproductionReceipt,
    current: LocalReproductionReceipt,
  ): LocalInvestigationHistory {
    return {
      schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
      observedEvidence: [
        { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
        { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
        { evidenceRef: HIST_REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
      ],
      inspectedSources: [{ path: SOURCE_PATH, evidenceRef: SOURCE_EVIDENCE }],
      reproductions: [historical, current],
      findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
    };
  }

  function makeMixedState(): AgentRuntimeState {
    return makeState({ evidenceRefs: [SOURCE_EVIDENCE, REPRO_EVIDENCE, HIST_REPRO_EVIDENCE] });
  }

  test('one historical and one current receipt admit together with both narratives', () => {
    const historical = makeHistoricalReceipt({ candidateId: CANDIDATE_ID });
    const result = admitLocalFinding({
      state: makeMixedState(),
      history: makeMixedHistory(historical, makeCurrentReceipt()),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(2);
    expect(result.reproductionIds).toEqual(['rep-cur-1', 'rep-hist-1']);
    expect(result.sourcePaths).toEqual([SOURCE_PATH]);
    expect(result.dossier.reproductionCount).toBe(2);
    expect(result.dossier.reproduction).toContain('pre-fix FAIL observed, post-fix PASS observed');
    expect(result.dossier.reproduction).toContain('repeated CURRENT source failure observed');
    expect(result.dossier.reproduction).toContain('no post-fix PASS observed or claimed');
    expect(result.dossier.reproduction).not.toContain('previously unknown');
    expect(result.dossier.expected).toContain('repeated CURRENT source test failure');
    expect(result.dossier.expected).toContain('pre-fix FAIL/post-fix PASS');
    expect(result.dossier.actual).toContain('linked REPRODUCED receipt(s)');
    expect(result.dossier.actual).toContain('linked REPRODUCED_CURRENT_FAILURE receipt(s)');
    const checks = result.dossier.falsePositiveChecks;
    expect(checks.some((line) => line.includes('rep-hist-1') && line.includes('pre-fix FAIL and post-fix PASS'))).toBe(
      true,
    );
    expect(
      checks.some((line) => line.includes('rep-cur-1') && line.includes('repeated CURRENT source failure')),
    ).toBe(true);
    expect(result.dossier.authority.humanReviewRequired).toBe(true);
    expect(result.dossier.authority.externalPublication).toBe('PROHIBITED');
  });

  test('an invalid current proof leaves the historical receipt admitted with legacy prose', () => {
    const historical = makeHistoricalReceipt({ candidateId: CANDIDATE_ID });
    const current = makeCurrentReceipt({}, { executionCount: 1 });
    const result = admitLocalFinding({
      state: makeMixedState(),
      history: makeMixedHistory(historical, current),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.reproductionIds).toEqual(['rep-hist-1']);
    expect(result.dossier.reproduction).toContain('verdict REPRODUCED, 1 receipt(s)');
  });
});

test.describe('current-source candidate and source linking', () => {
  test('unattributed receipt admits when its source evidence is the candidate evidence', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeCurrentReceipt({ candidateId: null })] }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
  });

  test('unattributed receipt is refused when its source evidence is outside the candidate', () => {
    const otherEvidence = 'ev:source:unrelated';
    const result = admitLocalFinding({
      state: makeState({ evidenceRefs: [otherEvidence, REPRO_EVIDENCE] }),
      history: makeHistory({
        observedEvidence: [
          { evidenceRef: otherEvidence, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
          { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
        ],
        reproductions: [makeCurrentReceipt({ candidateId: null })],
        findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [otherEvidence], draft: null }],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('receipt attributed to another candidate cannot admit', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({ reproductions: [makeCurrentReceipt({ candidateId: 'cand-other' })] }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });

  test('receipt for a never-inspected source is refused', () => {
    const result = admitLocalFinding({
      state: makeState(),
      history: makeHistory({
        inspectedSources: [],
        reproductions: [makeCurrentReceipt()],
      }),
      candidateId: CANDIDATE_ID,
      draft: {},
    });
    expect(result.admitted).toBe(false);
    if (result.admitted !== false) throw new Error('expected refusal');
    expect(result.reason).toBe('UNLINKED_REPRODUCTION');
  });
});

test.describe('historical compatibility', () => {
  test('historical receipt keeps byte-exact dossier strings', () => {
    const result = admitLocalFinding({
      state: makeHistState(),
      history: makeHistHistory(),
      candidateId: HIST_CANDIDATE,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.reproductionIds).toEqual(['rep-hist-1']);
    expect(result.sourcePaths).toEqual([SOURCE_PATH]);
    expect(result.dossier.description).toBe(
      `Mechanically admitted local finding ${HIST_CANDIDATE} with linked pre-fix FAIL and post-fix PASS reproduction.`,
    );
    expect(result.dossier.reproduction).toBe(
      `RERUN_SAFE_REPRODUCTION rep-hist-1 on ${SOURCE_PATH}: ` +
        `pre-fix FAIL observed, post-fix PASS observed (verdict REPRODUCED, 1 receipt(s)). ` +
        `No audit bytes exposed.`,
    );
    expect(result.dossier.expected).toBe(
      'pre-fix signal FAIL and post-fix signal PASS on the inspected source-linked reproduction',
    );
    expect(result.dossier.actual).toBe(
      `observed 1 linked REPRODUCED receipt(s) rep-hist-1 on ${SOURCE_PATH} (pre-fix FAIL, post-fix PASS)`,
    );
    expect(result.dossier.falsePositiveChecks[0]).toBe(
      `mechanical reproduction rep-hist-1 on ${SOURCE_PATH}: ` +
        `pre-fix FAIL and post-fix PASS observed (provider ${PROVIDER_ID}, verdict REPRODUCED)`,
    );
  });

  test('historical refusal reasons and details are unchanged', () => {
    const missing = admitLocalFinding({
      state: makeHistState(),
      history: makeHistHistory({ reproductions: [] }),
      candidateId: HIST_CANDIDATE,
      draft: {},
    });
    expect(missing.admitted).toBe(false);
    if (missing.admitted !== false) throw new Error('expected refusal');
    expect(missing.reason).toBe('MISSING_REPRODUCTION');
    expect(missing.detail).toBe(`candidate ${HIST_CANDIDATE} has no REPRODUCED session receipt`);

    const unlinked = admitLocalFinding({
      state: makeHistState(),
      history: makeHistHistory({ inspectedSources: [] }),
      candidateId: HIST_CANDIDATE,
      draft: {},
    });
    expect(unlinked.admitted).toBe(false);
    if (unlinked.admitted !== false) throw new Error('expected refusal');
    expect(unlinked.reason).toBe('UNLINKED_REPRODUCTION');
    expect(unlinked.detail).toBe(
      `candidate ${HIST_CANDIDATE} has no linked pre-fix FAIL/post-fix PASS receipt for an inspected source`,
    );
  });

  test('historical admission ignores a current-source verdict without proof', () => {
    const currentWithoutProof = makeCurrentReceipt({
      reproductionId: 'rep-cur-2',
      candidateId: HIST_CANDIDATE,
      evidenceRef: 'ev:repro:rep-cur-2',
      currentSourceProof: null,
    });
    const result = admitLocalFinding({
      state: makeHistState({ evidenceRefs: [SOURCE_EVIDENCE, HIST_REPRO_EVIDENCE, 'ev:repro:rep-cur-2'] }),
      history: makeHistHistory({
        observedEvidence: [
          { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
          { evidenceRef: HIST_REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
          { evidenceRef: 'ev:repro:rep-cur-2', toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
        ],
        reproductions: [makeHistoricalReceipt(), currentWithoutProof],
      }),
      candidateId: HIST_CANDIDATE,
      draft: {},
    });
    expect(result.admitted).toBe(true);
    if (result.admitted !== true) throw new Error('expected admission');
    expect(result.reproductionCount).toBe(1);
    expect(result.reproductionIds).toEqual(['rep-hist-1']);
    expect(result.dossier.reproduction).toContain('verdict REPRODUCED, 1 receipt(s)');
    expect(result.dossier.reproduction).not.toContain('CURRENT');
  });
});
