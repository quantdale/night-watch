// Group 3 — exact-head CI authority: block record, substitutes, certification.
//
// The negative probes matter more than the happy path: a block without an
// owner action is incomplete, an expired block is stale, and no local
// substitute may set CI_EXECUTED_SHA. These are the properties that keep the
// external block from becoming a permanent excuse.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyCiExecutionEvidence,
  classifyCiExecutionEvidence,
  collectCiBlockStale,
  evaluateCiCertification,
  validateCiBlockRecord,
  validateCiRouteCandidates,
} from '../../bin/lib/ci-block-record.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const RECORD = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'ci-block-record.v1.json'), 'utf8'));
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function record(overrides: Record<string, unknown> = {}) {
  return { ...RECORD, ...overrides };
}

test.describe('CI block record completeness and staleness', () => {
  test('the live block record carries run identity, owner action and revisit condition', () => {
    const judgement = validateCiBlockRecord(RECORD);
    expect(judgement.errors).toEqual([]);
    expect(RECORD.runId).toMatch(/^\d+$/);
    expect(RECORD.jobId).toMatch(/^\d+$/);
    expect(RECORD.blockClass).toBe('NO_STEPS_BILLING_OR_PLATFORM_BLOCK');
    expect(RECORD.ownerAction.length).toBeGreaterThan(12);
    expect(RECORD.revisitCondition.length).toBeGreaterThan(12);
  });

  test('an omitted owner action is CI_BLOCK_RECORD_INCOMPLETE', () => {
    const judgement = validateCiBlockRecord(record({ ownerAction: '' }));
    expect(judgement.ok).toBe(false);
    expect(judgement.errors.map((entry) => entry.code)).toContain('CI_BLOCK_RECORD_INCOMPLETE');
  });

  test('an omitted revisit condition or run identity is CI_BLOCK_RECORD_INCOMPLETE', () => {
    for (const overrides of [{ revisitCondition: undefined }, { runId: undefined }, { jobId: undefined }, { blockClass: 'NOT_A_CLASS' }, { observedDate: 'yesterday' }]) {
      const judgement = validateCiBlockRecord(record(overrides));
      expect(judgement.ok, JSON.stringify(overrides)).toBe(false);
      expect(judgement.errors.map((entry) => entry.code)).toContain('CI_BLOCK_RECORD_INCOMPLETE');
    }
  });

  test('an expired revisit date is CI_BLOCK_RECORD_STALE and names the owner action', () => {
    const stale = collectCiBlockStale(record({ revisitDate: '2026-09-01' }), '2026-09-12');
    expect(stale).toHaveLength(1);
    expect(stale[0]!.code).toBe('CI_BLOCK_RECORD_STALE');
    expect(stale[0]!.ownerAction).toBe(RECORD.ownerAction);
    expect(collectCiBlockStale(record({ revisitDate: '2026-12-01' }), '2026-09-12')).toEqual([]);
  });
});

test.describe('substitutes may never set CI_EXECUTED_SHA', () => {
  test('a local gate:ci receipt is classified LOCAL_NOT_CI', () => {
    const judgement = classifyCiExecutionEvidence({ source: 'LOCAL_GATE_CI', exactHead: true, executedSteps: 1, sha: SHA_A });
    expect(judgement.classification).toBe('LOCAL_NOT_CI');
    expect(judgement.canSetCiExecutedSha).toBe(false);
  });

  test('the topology gate is classified RUNNER_TOPOLOGY_ONLY_NOT_CI', () => {
    const judgement = classifyCiExecutionEvidence({ source: 'GATE_TOPOLOGY', exactHead: true, executedSteps: 1, sha: SHA_A });
    expect(judgement.classification).toBe('RUNNER_TOPOLOGY_ONLY_NOT_CI');
    expect(judgement.canSetCiExecutedSha).toBe(false);
  });

  test('a substitute leaves the CI fields byte-identical and is refused by name', () => {
    const before = { ciObservedSha: 'NONE', ciExecutedSha: 'NONE', ciStatus: 'NOT_OBSERVED' };
    const applied = applyCiExecutionEvidence(before, { source: 'LOCAL_GATE_CI', exactHead: true, executedSteps: 1, sha: SHA_A });
    expect(applied.refused).toBe(true);
    expect(applied.code).toBe('CI_EXECUTED_SHA_SUBSTITUTE_REFUSED');
    expect(applied.field).toEqual(before);
  });

  test('a zero-step GitHub run is non-evidence, not executed CI', () => {
    const applied = applyCiExecutionEvidence({ ciObservedSha: 'NONE', ciExecutedSha: 'NONE', ciStatus: 'NOT_OBSERVED' }, { source: 'GITHUB_ACTIONS', exactHead: true, executedSteps: 0, sha: SHA_A });
    expect(applied.refused).toBe(true);
    expect(applied.code).toBe('CI_EXECUTED_FROM_ZERO_STEP_REFUSED');
    expect(applied.field.ciExecutedSha).toBe('NONE');
  });

  test('only an exact-head GitHub Actions run with executed steps sets the fields', () => {
    const applied = applyCiExecutionEvidence({ ciObservedSha: 'NONE', ciExecutedSha: 'NONE', ciStatus: 'NOT_OBSERVED' }, { source: 'GITHUB_ACTIONS', exactHead: true, executedSteps: 3, sha: SHA_A });
    expect(applied.refused).toBe(false);
    expect(applied.field.ciObservedSha).toBe(SHA_A);
    expect(applied.field.ciExecutedSha).toBe(SHA_A);
    expect(applied.field.ciStatus).toBe('EXECUTED_PASS');
    const ancestor = applyCiExecutionEvidence({ ciObservedSha: 'NONE', ciExecutedSha: 'NONE', ciStatus: 'NOT_OBSERVED' }, { source: 'GITHUB_ACTIONS', exactHead: false, executedSteps: 3, sha: SHA_A });
    expect(ancestor.refused).toBe(true);
  });
});

test.describe('certification refuses a mismatched CI_OBSERVED_SHA', () => {
  test('a CI-certified status with an observed SHA at another commit is refused naming both', () => {
    const judgement = evaluateCiCertification({
      completionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
      certifiedCheckpointSha: SHA_A,
      ciObservedSha: SHA_B,
      ciExecutedSha: SHA_B,
      ciStatus: 'EXECUTED_PASS',
    });
    expect(judgement.ok).toBe(false);
    const mismatch = judgement.errors.find((entry) => entry.code === 'CI_OBSERVED_SHA_MISMATCH');
    expect(mismatch).toBeDefined();
    expect(mismatch!.detail).toContain(SHA_A);
    expect(mismatch!.detail).toContain(SHA_B);
  });

  test('an exact-checkpoint executed pass certifies, and a local status is not judged', () => {
    expect(evaluateCiCertification({
      completionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
      certifiedCheckpointSha: SHA_A,
      ciObservedSha: SHA_A,
      ciExecutedSha: SHA_A,
      ciStatus: 'EXECUTED_PASS',
    }).ok).toBe(true);
    expect(evaluateCiCertification({
      completionStatus: 'OPERATIONALLY_ACCEPTED',
      certifiedCheckpointSha: SHA_A,
      ciObservedSha: SHA_B,
      ciExecutedSha: 'NONE',
      ciStatus: 'NOT_OBSERVED',
    }).ok).toBe(true);
  });

  test('a certification without executed CI is refused', () => {
    const judgement = evaluateCiCertification({
      completionStatus: 'PROJECT_COMPLETE_AND_CI_CERTIFIED',
      certifiedCheckpointSha: SHA_A,
      ciObservedSha: SHA_A,
      ciExecutedSha: SHA_A,
      ciStatus: 'EXECUTED_FAIL',
    });
    expect(judgement.errors.map((entry) => entry.code)).toContain('CI_CERTIFICATION_WITHOUT_EXECUTION');
  });
});

test.describe('CI route candidates are recorded with trade-offs and no owner selection', () => {
  test('the live record declares three routes with trade-offs and a pending owner decision', () => {
    const judgement = validateCiRouteCandidates(RECORD);
    expect(judgement.errors).toEqual([]);
    expect(judgement.routes).toHaveLength(3);
    expect(RECORD.routeSelection.state).toBe('OWNER_DECISION_REQUIRED');
  });

  test('a substitute route that could set CI_EXECUTED_SHA is refused', () => {
    const tampered = {
      ...RECORD,
      candidateRoutes: RECORD.candidateRoutes.map((route: { routeId: string }) => (
        route.routeId === 'scheduled-local-gate-ci' ? { ...route, canSetCiExecutedSha: true } : route
      )),
    };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_SUBSTITUTE_MAY_SET_CI_EXECUTED_SHA');
  });

  test('a route without trade-offs is refused', () => {
    const tampered = {
      ...RECORD,
      candidateRoutes: RECORD.candidateRoutes.map((route: { routeId: string }) => (
        route.routeId === 'self-hosted-runner' ? { ...route, tradeOffs: ['only one'] } : route
      )),
    };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_TRADE_OFF_MISSING');
  });

  test('a premature selection is refused while the decision is the owner’s', () => {
    const tampered = { ...RECORD, routeSelection: { ...RECORD.routeSelection, selectedRouteId: 'gate-topology-substitute' } };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_SELECTION_PREMATURE');
  });

  test('fewer than three routes is incomplete', () => {
    const tampered = { ...RECORD, candidateRoutes: RECORD.candidateRoutes.slice(0, 2) };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_CANDIDATES_INCOMPLETE');
  });
});
