// M5 task 6.1 (C-19, design D7) — the AgentFindingRecord identity.
// Pure deterministic fixtures only: no network, no filesystem, no clock.
import { test, expect } from '@playwright/test';

import {
  AGENT_FINDING_RECORD_ID_RE,
  AGENT_FINDING_RECORD_VERSION,
  agentFindingRecordId,
  deriveAgentFindingRecord,
  validateAgentFindingRecord,
} from '../../src/core/localInvestigation/agentFindingRecord';
import type { AgentFindingRecord } from '../../src/core/localInvestigation/agentFindingRecord';
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

const CANDIDATE_ID = 'cand-record';
const CAMPAIGN_ID = 'campaign-record-test';
const SOURCE_PATH = 'acme/shop:packages/checkout';
const SOURCE_EVIDENCE = 'ev:source:acme/shop:packages/checkout';
const REPRO_EVIDENCE = 'ev:repro:rep-record-1';
const PROVIDER_ID = 'owner-local-repro-test';

function makeState(overrides: Partial<AgentRuntimeState> = {}): AgentRuntimeState {
  return {
    schemaVersion: AGENT_RUNTIME_STATE_VERSION,
    knownTargets: [],
    campaignId: CAMPAIGN_ID,
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
    reproductionId: 'rep-record-1',
    candidateId: CANDIDATE_ID,
    sourcePath: SOURCE_PATH,
    sourceEvidenceRef: SOURCE_EVIDENCE,
    evidenceRef: REPRO_EVIDENCE,
    verdict: 'REPRODUCED_CURRENT_FAILURE',
    preFix: 'FAIL',
    postFix: 'NOT_RUN',
    provenanceRefs: ['repro-provider:rep-record-1'],
    currentSourceProof: makeProof(proofOverrides),
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

function admit(overrides: Parameters<typeof admitLocalFinding>[0] extends never ? never : Record<string, unknown> = {}) {
  return admitLocalFinding({
    state: makeState(),
    history: makeHistory(),
    candidateId: CANDIDATE_ID,
    ...overrides,
  } as Parameters<typeof admitLocalFinding>[0]);
}

function admittedRecord(): AgentFindingRecord {
  const result = admit();
  if (!result.admitted) throw new Error(`fixture must admit: ${result.reason} ${result.detail}`);
  return result.record;
}

test.describe('agent finding record derivation (6.1)', () => {
  test('a current-source admission carries a content-addressed identity bound to its evidence', () => {
    const record = admittedRecord();
    expect(record.schemaVersion).toBe(AGENT_FINDING_RECORD_VERSION);
    expect(record.dossierId).toMatch(AGENT_FINDING_RECORD_ID_RE);
    expect(agentFindingRecordId(record)).toBe(record.dossierId);
    expect(record.campaignId).toBe(CAMPAIGN_ID);
    expect(record.candidateId).toBe(CANDIDATE_ID);
    expect(record.sources).toEqual([
      {
        sourcePath: SOURCE_PATH,
        repository: 'acme/shop',
        headSha: 'abcdef1234567890',
        treeDigest: null,
        contentDigest: 'sha256:abc123',
      },
    ]);
    expect(record.currentFailureFingerprint).toBe('fp:sha256:abcdef0123456789abcdef01');
    expect(record.triageFingerprint).toBeNull();
    expect(record.testIdentity).toEqual({
      testFile: null,
      testName: null,
      packageRelativePath: 'packages/checkout',
      discriminatorOrigin: 'PRE_EXISTING_REPOSITORY_TEST',
      failureClass: 'TEST_ASSERTION_FAILURE',
    });
    expect(record.reasonerIdentity).toBeNull();
    expect(record.reproductionIds).toEqual(['rep-record-1']);
    expect(record.provenanceRefs).toContain('repro-provider:rep-record-1');
    const validation = validateAgentFindingRecord(record);
    expect(validation.ok).toBe(true);
  });

  test('derivation is deterministic and content addressed', () => {
    expect(admittedRecord()).toEqual(admittedRecord());

    const other = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: 'cand-other',
      receipts: [makeCurrentReceipt()],
    });
    expect(other.dossierId).not.toBe(admittedRecord().dossierId);

    const headChanged = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: CANDIDATE_ID,
      receipts: [makeCurrentReceipt({}, { repositoryHeadSha: 'ffffffffffff0000' })],
    });
    expect(headChanged.dossierId).not.toBe(admittedRecord().dossierId);
    expect(headChanged.sources[0]?.headSha).toBe('ffffffffffff0000');
  });

  test('host-observed source identity fills the tree digest without inventing one', () => {
    const withIdentity = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: CANDIDATE_ID,
      receipts: [makeCurrentReceipt()],
      sourceIdentities: [
        { sourcePath: SOURCE_PATH, repository: 'acme/shop', headSha: 'abcdef1234567890', treeDigest: 'sha256:tree0001' },
      ],
    });
    expect(withIdentity.sources[0]?.treeDigest).toBe('sha256:tree0001');

    // Unusable host identity input is ignored, never fabricated.
    const ignored = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: CANDIDATE_ID,
      receipts: [makeCurrentReceipt()],
      sourceIdentities: [
        { sourcePath: SOURCE_PATH, repository: 'not-a-repo', headSha: 'zz', treeDigest: 'not a digest' },
      ],
    });
    expect(ignored.sources[0]?.repository).toBe('acme/shop');
    expect(ignored.sources[0]?.headSha).toBe('abcdef1234567890');
    expect(ignored.sources[0]?.treeDigest).toBeNull();
  });

  test('triage fingerprint and reasoner identity are recorded only when well formed', () => {
    const record = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: CANDIDATE_ID,
      receipts: [makeCurrentReceipt()],
      triageFingerprint: 'cfe:sha256:0123456789abcdef01234567',
      testFile: 'services/checkout/checkout_test.go',
      testName: 'TestCheckoutTotal',
      reasonerIdentity: {
        executablePath: 'bin/nightwatch',
        executableDigest: 'sha256:exec',
        adapterDigest: 'sha256:adapter',
        printCliDigest: 'sha256:print',
        printArgsDigest: 'sha256:args',
        provider: 'openai',
        model: 'gpt-x',
      },
    });
    expect(record.triageFingerprint).toBe('cfe:sha256:0123456789abcdef01234567');
    expect(record.testIdentity?.testFile).toBe('services/checkout/checkout_test.go');
    expect(record.testIdentity?.testName).toBe('TestCheckoutTotal');
    expect(record.reasonerIdentity?.provider).toBe('openai');
    expect(record.reasonerIdentity?.model).toBe('gpt-x');

    const malformed = deriveAgentFindingRecord({
      campaignId: CAMPAIGN_ID,
      candidateId: CANDIDATE_ID,
      receipts: [makeCurrentReceipt()],
      triageFingerprint: 'cfe:not-a-digest',
      reasonerIdentity: { executablePath: 'bin/nightwatch', executableDigest: 'not a digest' } as never,
    });
    expect(malformed.triageFingerprint).toBeNull();
    expect(malformed.reasonerIdentity).toBeNull();
  });

  test('a model draft can never reach the record', () => {
    const withoutDraft = admittingRecordWithDraft(null);
    const withDraft = admittingRecordWithDraft({
      record: { dossierId: 'afr:sha256:ffffffffffffffffffffffff' },
      reasonerIdentity: { executablePath: 'forged', executableDigest: 'sha256:forged' },
      campaignId: 'forged-campaign',
      candidateId: 'forged-candidate',
      sources: [{ sourcePath: 'forged:path', repository: 'forged/repo', headSha: 'ffffffff', treeDigest: 'sha256:x', contentDigest: 'sha256:x' }],
    });
    expect(withDraft).toEqual(withoutDraft);
  });

  test('the validator fails closed on tampering, unknown fields, and malformed values', () => {
    const record = admittedRecord();

    const tamperedHead = validateAgentFindingRecord({
      ...record,
      sources: [{ ...record.sources[0], headSha: 'ffffffffffff0000' }],
    });
    expect(tamperedHead.ok).toBe(false);
    if (!tamperedHead.ok) {
      expect(tamperedHead.errors.map((error) => error.code)).toContain('AGENT_FINDING_RECORD_ID_MISMATCH');
    }

    const unknownField = validateAgentFindingRecord({ ...record, verified: true });
    expect(unknownField.ok).toBe(false);
    if (!unknownField.ok) {
      expect(unknownField.errors.map((error) => error.code)).toContain('AGENT_FINDING_RECORD_UNKNOWN_FIELD');
    }

    const missingField = validateAgentFindingRecord({ ...record, dossierId: undefined });
    expect(missingField.ok).toBe(false);

    const badId = validateAgentFindingRecord({ ...record, dossierId: 'afr:sha256:zz' });
    expect(badId.ok).toBe(false);

    const notObject = validateAgentFindingRecord('record');
    expect(notObject.ok).toBe(false);

    const wrongSchema = validateAgentFindingRecord({ ...record, schemaVersion: 'nightwatch.agent-finding-record.v0' });
    expect(wrongSchema.ok).toBe(false);

    const malformedSource = validateAgentFindingRecord({
      ...record,
      sources: [{ ...record.sources[0], sourcePath: '/absolute/path' }],
    });
    expect(malformedSource.ok).toBe(false);
  });

  test('the validator accepts a serialized round trip byte-for-byte', () => {
    const record = admittedRecord();
    const roundTrip = JSON.parse(JSON.stringify(record)) as unknown;
    const validation = validateAgentFindingRecord(roundTrip);
    expect(validation.ok).toBe(true);
    if (validation.ok) expect(validation.record).toEqual(record);
  });
});

function admittingRecordWithDraft(draft: Readonly<Record<string, unknown>> | null): AgentFindingRecord {
  const result = admit({ draft });
  if (!result.admitted) throw new Error(`fixture must admit: ${result.reason} ${result.detail}`);
  return result.record;
}
