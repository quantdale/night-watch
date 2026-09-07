// W9 M1 — frozen owner-local reproduction contracts.
// Pure deterministic checks only: no filesystem, process, network or clock.
import { test, expect } from '@playwright/test';

import {
  ACTION_FAILURE_DISPOSITIONS,
  AGENT_BYTE_LEDGER_VERSION,
  TRANSIENT_ACTION_RETRY_BUDGET,
  ZERO_AGENT_BYTE_LEDGER,
  chargedInputBytes,
  chargedOutputBytes,
  chargedToolPayloadBytes,
} from '../../src/core/agentProtocol/runtime';
import {
  CURRENT_SOURCE_FAILURE_CLASSES,
  CURRENT_SOURCE_PROOF_KINDS,
  MIN_CURRENT_SOURCE_EXECUTIONS,
  OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
  validateCurrentSourceProof,
  type OwnerLocalCurrentSourceProof,
} from '../../src/core/localInvestigation/currentSourceProof';
import type { LocalReproductionReceipt } from '../../src/core/localInvestigation/types';
import { LOCAL_REPRODUCTION_RECEIPT_VERSION } from '../../src/core/localInvestigation/types';
import { REPRODUCTION_READINESS_STATES } from '../../src/core/investigationMemory/types';
import {
  DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
  OWNER_LOCAL_EXECUTION_OUTCOMES,
  OWNER_LOCAL_EXECUTOR_KINDS,
  OWNER_LOCAL_PREREQUISITES,
  OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
  ownerLocalTargetDigest,
  type OwnerLocalReproductionTarget,
} from '../../src/core/ownerLocalReproduction/contracts';

const PROVIDER = 'nightwatch.owner-local-current-source-reproduction.v1';
const SOURCE = 'mobingilabs/ouchan:pkg/gcsv/info.go';

function target(): OwnerLocalReproductionTarget {
  return {
    schemaVersion: OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
    repository: 'mobingilabs/ouchan',
    sourcePath: SOURCE,
    sourceRelativePath: 'pkg/gcsv/info.go',
    sourceContentDigest: 'src:sha256:0123456789abcdef01234567',
    moduleRelativePath: '.',
    packageRelativePath: 'pkg/gcsv',
    executor: 'GO_VENDORED_PACKAGE_TEST',
    repositoryHeadSha: '0123456789abcdef0123456789abcdef01234567',
    prerequisites: [...OWNER_LOCAL_PREREQUISITES],
    limits: DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
  };
}

function proof(overrides: Partial<OwnerLocalCurrentSourceProof> = {}): OwnerLocalCurrentSourceProof {
  const descriptor = target();
  return {
    schemaVersion: OWNER_LOCAL_CURRENT_SOURCE_PROOF_VERSION,
    proofKind: 'CURRENT_SOURCE_REPEATED_TEST_FAILURE',
    mintedBy: PROVIDER,
    repository: descriptor.repository,
    packageRelativePath: descriptor.packageRelativePath,
    repositoryHeadSha: descriptor.repositoryHeadSha,
    sourcePath: SOURCE,
    sourceContentDigest: descriptor.sourceContentDigest,
    targetDigest: ownerLocalTargetDigest(descriptor),
    failureFingerprint: 'fp:sha256:0123456789abcdef01234567',
    executionCount: MIN_CURRENT_SOURCE_EXECUTIONS,
    failureClass: 'TEST_ASSERTION_FAILURE',
    discriminatorOrigin: 'PRE_EXISTING_REPOSITORY_TEST',
    siblingIdentityStable: true,
    networkDisabled: true,
    ...overrides,
  };
}

test.describe('W9 frozen owner-local reproduction contracts', () => {
  test('one conservative executable class and hard host-owned limits are frozen', () => {
    expect(OWNER_LOCAL_EXECUTOR_KINDS).toEqual(['GO_VENDORED_PACKAGE_TEST']);
    expect(OWNER_LOCAL_EXECUTION_OUTCOMES).toEqual([
      'TEST_FAILURE',
      'TEST_PASS',
      'NO_TESTS',
      'BUILD_FAILURE',
      'TIMEOUT',
      'ENVIRONMENT_BLOCKED',
      'PROCESS_FAILURE',
    ]);
    expect(DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS.executions).toBe(2);
    expect(DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS.executionMs).toBeLessThanOrEqual(180_000);
    expect(DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS.capturedOutputBytes).toBeLessThanOrEqual(256 * 1024);
  });

  test('current-source proof is explicit and distinct from historical PRE_FAIL_POST_PASS', () => {
    expect(CURRENT_SOURCE_PROOF_KINDS).toEqual(['CURRENT_SOURCE_REPEATED_TEST_FAILURE']);
    expect(CURRENT_SOURCE_FAILURE_CLASSES).toContain('TEST_ASSERTION_FAILURE');
    const receipt: LocalReproductionReceipt = {
      schemaVersion: LOCAL_REPRODUCTION_RECEIPT_VERSION,
      providerId: PROVIDER,
      reproductionId: 'rep-current-1',
      candidateId: 'cand-current-1',
      sourcePath: SOURCE,
      sourceEvidenceRef: 'srcobs:sha256:0123456789abcdef01234567',
      evidenceRef: 'ev:repro:current:1',
      verdict: 'REPRODUCED_CURRENT_FAILURE',
      preFix: 'FAIL',
      postFix: 'NOT_RUN',
      provenanceRefs: ['repo:mobingilabs/ouchan', 'sha:0123456789abcdef0123456789abcdef01234567'],
      currentSourceProof: proof(),
    };
    expect(receipt.verdict).not.toBe('REPRODUCED');
    expect(receipt.postFix).not.toBe('PASS');
    expect(receipt.currentSourceProof?.proofKind).toBe('CURRENT_SOURCE_REPEATED_TEST_FAILURE');
  });

  test('proof validation refuses inflation, generic failures and mutable execution', () => {
    const expectations = { providerId: PROVIDER, sourcePath: SOURCE };
    expect(validateCurrentSourceProof(proof(), expectations)).toBeNull();
    expect(validateCurrentSourceProof(proof({ executionCount: 1 }), expectations)).toBe(
      'PROOF_EXECUTIONS_INSUFFICIENT',
    );
    expect(validateCurrentSourceProof(proof({ failureClass: 'BUILD_FAILURE' }), expectations)).toBe(
      'PROOF_FAILURE_CLASS_NOT_QUALIFYING',
    );
    expect(validateCurrentSourceProof(proof({ discriminatorOrigin: 'MODEL_GENERATED_TEST' }), expectations)).toBe(
      'PROOF_DISCRIMINATOR_NOT_QUALIFYING',
    );
    expect(validateCurrentSourceProof(proof({ siblingIdentityStable: false }), expectations)).toBe(
      'PROOF_IDENTITY_UNSTABLE',
    );
    expect(validateCurrentSourceProof(proof({ networkDisabled: false }), expectations)).toBe(
      'PROOF_NETWORK_NOT_DISABLED',
    );
    expect(validateCurrentSourceProof(proof({ targetDigest: 'fp:sha256:0123456789abcdef01234567' }), expectations)).toBe(
      'PROOF_TARGET_DIGEST_INVALID',
    );
    expect(
      validateCurrentSourceProof(
        proof({ failureFingerprint: 'tgt:sha256:0123456789abcdef01234567' }),
        expectations,
      ),
    ).toBe('PROOF_FINGERPRINT_INVALID');
    expect(validateCurrentSourceProof(proof({ repository: 'alphauslabs/bluectl' }), expectations)).toBe(
      'PROOF_SOURCE_MISMATCH',
    );
  });

  test('transient retry policy is host-owned and strictly finite', () => {
    expect(ACTION_FAILURE_DISPOSITIONS).toEqual([
      'DETERMINISTIC_TERMINAL',
      'ENVIRONMENT_BLOCKED',
      'TRANSIENT_RETRYABLE',
    ]);
    expect(TRANSIENT_ACTION_RETRY_BUDGET).toBe(2);
  });

  test('byte ledger charges provider transport and tool payload exactly once each', () => {
    const ledger = {
      ...ZERO_AGENT_BYTE_LEDGER,
      renderedInputBytes: 300,
      providerResponseBytes: 100,
      providerStderrBytes: 20,
      reasonerOutputBytes: 91,
      toolResultBytes: 40,
      toolEnvelopeBytes: 32,
      checkpointBytes: 4_096,
    };
    expect(ledger.schemaVersion).toBe(AGENT_BYTE_LEDGER_VERSION);
    expect(chargedInputBytes(ledger)).toBe(300);
    expect(chargedOutputBytes(ledger)).toBe(120);
    expect(chargedToolPayloadBytes(ledger)).toBe(40);
    // The parsed reasoner output is measured, never charged a second time on
    // top of the provider response that already carried it; envelope and
    // checkpoint bytes are local measurements and are never charged at all.
    expect(chargedOutputBytes(ledger)).not.toBe(211);
    expect(chargedInputBytes(ledger)).not.toBe(300 + 32);
    expect(chargedOutputBytes(ledger)).not.toBe(120 + 4_096);
    expect(chargedToolPayloadBytes(ledger)).not.toBe(40 + 32);
  });

  test('readiness can distinguish all owner-local execution states without commands', () => {
    expect(REPRODUCTION_READINESS_STATES).toEqual(expect.arrayContaining([
      'NOT_READY_NO_EXECUTABLE_TARGET',
      'NOT_READY_TARGET_BLOCKED',
      'REFUSED_DETERMINISTIC',
      'TRANSIENT_RETRY_REMAINING',
      'CURRENT_FAILURE_REPRODUCED',
      'RAN_WITHOUT_REPRODUCING',
    ]));
  });
});
