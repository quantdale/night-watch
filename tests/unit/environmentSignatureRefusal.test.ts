// M5 task 6.12 (C-18) — a known environment signature is classified before the
// assertion-failure test, and a candidate whose only reproduction evidence is
// environment-caused is refused with ENVIRONMENT_DEPENDENT.
import { test, expect } from '@playwright/test';
import {
  ENVIRONMENT_SIGNATURES,
  classifyEnvironmentSignature,
} from '../../src/core/ownerLocalReproduction/environmentSignature';
import { classifyGoTestOutput } from '../../src/core/ownerLocalReproduction/provider';
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

const CANDIDATE_ID = 'cand-environment';
const SOURCE_PATH = 'acme/shop:packages/checkout';
const SOURCE_EVIDENCE = 'ev:source:acme/shop:packages/checkout';
const REPRO_EVIDENCE = 'ev:repro:rep-env-1';

const SAMPLES: Readonly<Record<string, string>> = {
  NETWORK_DIAL: '--- FAIL: TestDial\ndial tcp 10.0.0.1:443: connect: connection refused',
  DNS_RESOLUTION: '--- FAIL: TestLookup\nlookup api.example.invalid: no such host',
  PERMISSION_DENIED: '--- FAIL: TestWrite\nopen /sandbox/out.txt: permission denied',
  PORT_IN_USE: '--- FAIL: TestBind\nlisten tcp :8080: bind: address already in use',
  TOOLCHAIN_MISSING: 'go: cannot find main module; executable file not found in $PATH',
  RESOURCE_LIMIT: '--- FAIL: TestBig\nruntime: out of memory',
};

test.describe('environment signatures (6.12)', () => {
  test('every declared signature matches its sample and a benign failure matches none', () => {
    for (const signature of ENVIRONMENT_SIGNATURES) {
      const verdict = classifyEnvironmentSignature(SAMPLES[signature] ?? '');
      expect(verdict.matched, signature).toBe(true);
      expect(verdict.signature).toBe(signature);
    }
    const benign = classifyEnvironmentSignature(
      '--- FAIL: TestTotal\nexpected 3, got 4\n    checkout_test.go:42: total mismatch',
    );
    expect(benign.matched).toBe(false);
    expect(benign.signature).toBeNull();
    expect(classifyEnvironmentSignature('').matched).toBe(false);
    // A bounded scan: signatures inside the window are found without unbounded
    // work, and text beyond the window is deliberately not scanned.
    expect(classifyEnvironmentSignature(`dial tcp 1.2.3.4:80\n${'x'.repeat(500_000)}`).signature).toBe('NETWORK_DIAL');
    expect(classifyEnvironmentSignature(`${'x'.repeat(500_000)}\ndial tcp 1.2.3.4:80`).signature).toBeNull();
  });

  test('the environment signature outranks the assertion failure it produced', () => {
    const withDial = '--- FAIL: TestApi\n    api_test.go:12: dial tcp 10.0.0.1:443: connect: connection refused';
    const benign = '--- FAIL: TestApi\n    api_test.go:12: expected 200, got 500';
    const run = (stdout: string) => ({
      stdout,
      stderr: '',
      exitCode: 1,
      timedOut: false,
      spawnFailed: null,
      truncated: false,
    });
    expect(classifyGoTestOutput(run(benign))).toBe('TEST_FAILURE');
    expect(classifyGoTestOutput(run(withDial))).toBe('ENVIRONMENT_BLOCKED');
  });

  test('admission refuses an environment-caused candidate with ENVIRONMENT_DEPENDENT', () => {
    const state: AgentRuntimeState = {
      schemaVersion: AGENT_RUNTIME_STATE_VERSION,
      knownTargets: [],
      campaignId: 'camp-environment-signature',
      status: 'RUNNING',
      phase: 'VERIFY',
      hypotheses: [],
      actionLog: [],
      evidenceRefs: [SOURCE_EVIDENCE, REPRO_EVIDENCE],
      candidateIds: [CANDIDATE_ID],
      budget: { policy: defaultAgentBudgetPolicy('HOUR_1'), usage: ZERO_AGENT_BUDGET_USAGE },
      terminationReason: null,
    };
    const receipt: LocalReproductionReceipt = {
      schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
      providerId: 'owner-local-repro-test',
      reproductionId: 'rep-env-1',
      candidateId: CANDIDATE_ID,
      sourcePath: SOURCE_PATH,
      sourceEvidenceRef: SOURCE_EVIDENCE,
      evidenceRef: REPRO_EVIDENCE,
      verdict: 'ENVIRONMENT_BLOCKED',
      preFix: 'BLOCKED',
      postFix: 'NOT_RUN',
      provenanceRefs: ['repro-provider:rep-env-1'],
    };
    const history: LocalInvestigationHistory = {
      schemaVersion: LOCAL_INVESTIGATION_HISTORY_VERSION,
      observedEvidence: [
        { evidenceRef: SOURCE_EVIDENCE, toolId: 'INSPECT_SOURCE_SURFACE', source: 'SOURCE_CODE' },
        { evidenceRef: REPRO_EVIDENCE, toolId: 'RERUN_SAFE_REPRODUCTION', source: 'LOG' },
      ],
      inspectedSources: [{ path: SOURCE_PATH, evidenceRef: SOURCE_EVIDENCE }],
      reproductions: [receipt],
      findingProposals: [{ candidateId: CANDIDATE_ID, evidenceRefs: [SOURCE_EVIDENCE], draft: null }],
    };
    const result = admitLocalFinding({ state, history, candidateId: CANDIDATE_ID });
    expect(result.admitted).toBe(false);
    if (!result.admitted) {
      expect(result.reason).toBe('ENVIRONMENT_DEPENDENT');
      expect(result.detail).toContain('environment-blocked');
    }
  });
});
