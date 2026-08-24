import { test, expect } from '@playwright/test';
import {
  classifyExternalCi,
  type ExternalCiObservation,
  type ExternalGateReceiptObservation,
} from '../../src/core/qualityGate/externalCi';
import { QUALITY_GATE_DEFINITION } from '../../src/core/qualityGate/definition';
import {
  evaluatePreDevAuthority,
  type GateReceiptEvidence,
  type PreDevFacts,
} from '../../src/core/qualityGate/preDev';

const HEAD = 'a'.repeat(40);
const OTHER_HEAD = 'b'.repeat(40);
const GATE_DIGEST = 'sha256:' + 'c'.repeat(64);
const RECEIPT_DIGEST = 'receipt:sha256:' + 'f'.repeat(24);
const MANIFEST_ID = 'manifest:sha256:' + 'd'.repeat(24);
const MANIFEST_DIGEST = 'manifest:sha256:' + 'e'.repeat(24);
const REQUIRED_GROUPS = QUALITY_GATE_DEFINITION.groups.map((group) => group.id);

function receipt(finalResult = 'PASS', gateDefinitionDigest = GATE_DIGEST): ExternalGateReceiptObservation {
  return {
    receiptDigest: RECEIPT_DIGEST,
    gateDefinitionDigest,
    finalResult,
    groups: REQUIRED_GROUPS.map((id) => ({ id, status: 'PASS' })),
  };
}

function observation(overrides: Partial<ExternalCiObservation> = {}): ExternalCiObservation {
  return {
    apiObservable: true,
    workflowFound: true,
    expectedWorkflowName: 'Nightwatch hardening',
    currentHeadSha: HEAD,
    run: {
      runId: '123456789',
      status: 'completed',
      conclusion: 'success',
      headSha: HEAD,
      workflowName: 'Nightwatch hardening',
    },
    jobs: [{
      id: '987654321',
      name: 'hardening',
      status: 'completed',
      conclusion: 'success',
      steps: [{ name: 'gate', status: 'completed', conclusion: 'success' }],
    }],
    requiredJobNames: ['hardening'],
    expectedGateDefinitionDigest: GATE_DIGEST,
    expectedRequiredGroupIds: REQUIRED_GROUPS,
    gateReceipt: receipt(),
    ...overrides,
  };
}

function gateEvidence(): GateReceiptEvidence {
  return {
    passed: true,
    gitHead: HEAD,
    gateDefinitionDigest: GATE_DIGEST,
    requiredGroups: REQUIRED_GROUPS.map((id) => ({ id, status: 'PASS' })),
  };
}

function preDevFacts(overrides: Partial<PreDevFacts> = {}): PreDevFacts {
  const external = classifyExternalCi(observation());
  return {
    currentHead: HEAD,
    expectedGateDefinitionDigest: GATE_DIGEST,
    requiredGroupIds: REQUIRED_GROUPS,
    localGate: gateEvidence(),
    cleanCheckoutGate: gateEvidence(),
    externalCi: external,
    sourceCurrent: true,
    authReady: true,
    manifest: {
      passed: true,
      schemaVersion: 'nightwatch.dev-semantic-acceptance-manifest.v2',
      manifestId: MANIFEST_ID,
      deterministicDigest: MANIFEST_DIGEST,
      nightwatchSha: HEAD,
      gateDefinitionDigest: GATE_DIGEST,
      targetCount: 3,
      plannedObservationContexts: 6,
    },
    containment: {
      environment: 'DEV',
      dryRunPassed: true,
      externalContactCount: 0,
      mutationCount: 0,
      rawPersistenceCount: 0,
      privacyPassed: true,
      ownerPolicyAllows: true,
    },
    ...overrides,
  };
}

test.describe('Phase 23 exact-head external CI authority', () => {
  test('classifies an empty step list as an external execution block', () => {
    const result = classifyExternalCi(observation({
      jobs: [{
        id: '987654321', name: 'hardening', status: 'completed', conclusion: 'failure', steps: [],
      }],
    }));
    expect(result.classification).toBe('NO_STEPS_BILLING_OR_PLATFORM_BLOCK');
    expect(result.classification).not.toBe('EXECUTED_TEST_FAILURE');
  });

  test('does not authorize a green historical run for the current head', () => {
    const result = classifyExternalCi(observation({
      run: {
        runId: '123456789', status: 'completed', conclusion: 'success', headSha: OTHER_HEAD, workflowName: 'Nightwatch hardening',
      },
    }));
    expect(result.classification).toBe('HEAD_MISMATCH');
    expect(result.exactHead).toBe(false);
  });

  test('requires executed steps, the exact gate digest, and every required group', () => {
    expect(classifyExternalCi(observation()).classification).toBe('EXECUTED_GREEN');
    expect(classifyExternalCi(observation({ gateReceipt: receipt('PASS', 'sha256:' + 'f'.repeat(64)) })).classification).toBe('UNKNOWN');
    expect(classifyExternalCi(observation({ gateReceipt: { ...receipt(), groups: [{ id: 'STATIC', status: 'PASS' }] } })).classification).toBe('UNKNOWN');
  });

  test('separates API unobservability and pending execution from test failure', () => {
    expect(classifyExternalCi(observation({ apiObservable: false })).classification).toBe('API_UNOBSERVABLE');
    expect(classifyExternalCi(observation({
      run: { runId: '123456789', status: 'in_progress', conclusion: null, headSha: HEAD, workflowName: 'Nightwatch hardening' },
    })).classification).toBe('RUN_PENDING');
  });

  test('classifies an executed gate failure separately from platform blocking', () => {
    expect(classifyExternalCi(observation({
      run: { runId: '123456789', status: 'completed', conclusion: 'failure', headSha: HEAD, workflowName: 'Nightwatch hardening' },
      jobs: [{ id: '987654321', name: 'hardening', status: 'completed', conclusion: 'failure', steps: [{ name: 'gate', status: 'completed', conclusion: 'failure' }] }],
      gateReceipt: receipt('TEST_FAILURE'),
    })).classification).toBe('EXECUTED_TEST_FAILURE');
    expect(classifyExternalCi(observation({
      run: { runId: '123456789', status: 'completed', conclusion: 'failure', headSha: HEAD, workflowName: 'Nightwatch hardening' },
      jobs: [{ id: '987654321', name: 'hardening', status: 'completed', conclusion: 'failure', steps: [{ name: 'install', status: 'completed', conclusion: 'failure' }] }],
    })).classification).toBe('EXECUTED_INFRA_FAILURE');
  });
});

test.describe('Phase 23 pre-DEV authority receipt', () => {
  test('blocks on external CI even when local and clean gates pass', () => {
    const receipt = evaluatePreDevAuthority(preDevFacts({
      externalCi: classifyExternalCi(observation({
        jobs: [{ id: '987654321', name: 'hardening', status: 'completed', conclusion: 'failure', steps: [] }],
      })),
    }));
    expect(receipt.schemaVersion).toBe('nightwatch.pre-dev-authority-receipt.v3');
    expect(receipt.state).toBe('BLOCKED_EXTERNAL_CI');
    expect(receipt.categories.find((category) => category.id === 'LOCAL_GATE')?.passed).toBe(true);
    expect(receipt.categories.find((category) => category.id === 'CLEAN_CHECKOUT_GATE')?.passed).toBe(true);
    expect(receipt.categories.find((category) => category.id === 'EXTERNAL_CI_GATE')?.passed).toBe(false);
  });

  test('reaches READY_FOR_DEV only with all exact bindings and bounded manifest facts', () => {
    const receipt = evaluatePreDevAuthority(preDevFacts());
    expect(receipt.state).toBe('READY_FOR_DEV');
    expect(receipt.externalCiClassification).toBe('EXECUTED_GREEN');
    expect(receipt.manifestId).toBe(MANIFEST_ID);
  });

  test('rejects a manifest bound to another head or over the Phase 23 bound', () => {
    const receipt = evaluatePreDevAuthority(preDevFacts({
      manifest: {
        passed: true,
        schemaVersion: 'nightwatch.dev-semantic-acceptance-manifest.v2',
        manifestId: MANIFEST_ID,
        deterministicDigest: MANIFEST_DIGEST,
        nightwatchSha: OTHER_HEAD,
        gateDefinitionDigest: GATE_DIGEST,
        targetCount: 4,
        plannedObservationContexts: 8,
      },
    }));
    expect(receipt.state).toBe('BLOCKED_MANIFEST');
  });
});
