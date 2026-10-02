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
  deriveCiStatusFromRecord,
  evaluateCiCertification,
  newestObservationPerSha,
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
    // D-03 / R2-61 + R4-12: the record's top level IS the latest observation,
    // whatever its class — the billing block is retained as history instead, and
    // a later RED run must be promotable without editing anything else. The
    // property is therefore "the top level is the newest recorded observation
    // and its class is a declared class", never a pinned class.
    const history = RECORD.history as Array<{ runId: string; observedDate: string; classification: string }>;
    // R5-09: the top level is the newest run BY RUN ORDER (two runs share a date).
    const newestRun = history.map((entry) => BigInt(entry.runId)).reduce((best, id) => (id > best ? id : best), 0n);
    expect(BigInt(RECORD.runId)).toBe(newestRun);
    const topLevelEntry = history.find((entry) => entry.runId === RECORD.runId);
    expect(topLevelEntry).toBeDefined();
    expect(RECORD.blockClass).toBe(topLevelEntry!.classification);
    expect(history.map((entry) => entry.classification)).toContain('NO_STEPS_BILLING_OR_PLATFORM_BLOCK');
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

  // R4-12 / review-4 task 3.3 — the top level is the LATEST observation. A red
  // run recorded in history whose observation is NEWER than the top level
  // means the record was never refreshed, so the record silently stopped
  // describing current CI truth.
  test('a top level older than its newest recorded RUN is CI_BLOCK_RECORD_TOP_LEVEL_STALE (run order, not date)', () => {
    const newerRun = { runId: String(BigInt(RECORD.runId) + 1n), jobId: '999000111', observedSha: SHA_A, observedDate: RECORD.observedDate, classification: 'EXECUTED_TEST_FAILURE' };
    // SAME date as the top level: the old date comparison could not see this stale record.
    const stale = { ...RECORD, history: [...RECORD.history, newerRun] };
    const verdict = validateCiBlockRecord(stale);
    expect(verdict.ok).toBe(false);
    expect(verdict.errors.map((entry) => entry.code)).toContain('CI_BLOCK_RECORD_TOP_LEVEL_STALE');
    expect(validateCiBlockRecord(RECORD).errors.map((entry) => entry.code)).not.toContain('CI_BLOCK_RECORD_TOP_LEVEL_STALE');
  });

  test('history is oldest-first with unique runs and unique jobs, and every entry is well formed', () => {
    const first = RECORD.history[0];
    const codes = (history: unknown[]) => validateCiBlockRecord({ ...RECORD, history }).errors.map((entry) => entry.code);
    expect(codes([...RECORD.history].reverse())).toContain('CI_BLOCK_RECORD_HISTORY_ORDER');
    expect(codes([first, first, ...RECORD.history.slice(1)])).toContain('CI_BLOCK_RECORD_HISTORY_DUPLICATE_RUN');
    const sharedJob = RECORD.history.map((entry: Record<string, unknown>, index: number) => (index === 1 ? { ...entry, jobId: first.jobId } : entry));
    expect(codes(sharedJob)).toContain('CI_BLOCK_RECORD_JOB_DUPLICATE');
    expect(codes([{ ...first, observedSha: 'short' }, ...RECORD.history.slice(1)])).toContain('CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID');
    expect(codes([{ ...first, classification: 'MOSTLY_GREEN' }, ...RECORD.history.slice(1)])).toContain('CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID');
    expect(codes([null, ...RECORD.history.slice(1)])).toContain('CI_BLOCK_RECORD_HISTORY_ENTRY_INVALID');
    // The shipped history satisfies every rule, and no run id belongs to two SHAs.
    expect(validateCiBlockRecord(RECORD).errors).toEqual([]);
    const shaByRun = new Map<string, string>();
    for (const entry of RECORD.history as Array<{ runId: string; observedSha: string }>) {
      expect(shaByRun.has(entry.runId), `run ${entry.runId} recorded twice`).toBe(false);
      shaByRun.set(entry.runId, entry.observedSha);
    }
  });

  // R5-09 — the claim "CI passed at S" is only as good as the NEWEST run at S.
  test('the newest observation per SHA decides: a later failure at the same SHA supersedes an earlier pass', () => {
    const at = (runId: string, classification: string) => ({ runId, jobId: String(Number(runId) + 1), observedSha: SHA_A, observedDate: '2026-10-02', classification });
    const failedAfterPass = { ...RECORD, runId: '300', jobId: '301', observedSha: SHA_B, blockClass: 'EXECUTED_PASS', history: [at('100', 'EXECUTED_PASS'), at('200', 'EXECUTED_TEST_FAILURE'), { ...at('300', 'EXECUTED_PASS'), observedSha: SHA_B }] };
    expect(newestObservationPerSha(failedAfterPass).get(SHA_A)).toEqual({ runId: '200', classification: 'EXECUTED_TEST_FAILURE' });
    expect(deriveCiStatusFromRecord({ value: 'EXECUTED_PASS', observed: SHA_A, executed: SHA_A, record: failedAfterPass })).toBeNull();
    expect(deriveCiStatusFromRecord({ value: 'EXECUTED_FAIL', observed: SHA_A, executed: SHA_A, record: failedAfterPass })).toBe('EXECUTED_FAIL');
    // The reverse order: a later pass supersedes an earlier failure — and the array order never matters.
    const passAfterFail = { ...failedAfterPass, history: [at('200', 'EXECUTED_PASS'), at('100', 'EXECUTED_TEST_FAILURE'), { ...at('300', 'EXECUTED_PASS'), observedSha: SHA_B }] };
    expect(deriveCiStatusFromRecord({ value: 'EXECUTED_PASS', observed: SHA_A, executed: SHA_A, record: passAfterFail })).toBe('EXECUTED_PASS');
    expect(deriveCiStatusFromRecord({ value: 'EXECUTED_FAIL', observed: SHA_A, executed: SHA_A, record: passAfterFail })).toBeNull();
    // Run ids compare numerically, not as strings ("99" < "100").
    const numeric = { ...failedAfterPass, history: [at('99', 'EXECUTED_TEST_FAILURE'), at('100', 'EXECUTED_PASS'), { ...at('300', 'EXECUTED_PASS'), observedSha: SHA_B }] };
    expect(deriveCiStatusFromRecord({ value: 'EXECUTED_PASS', observed: SHA_A, executed: SHA_A, record: numeric })).toBe('EXECUTED_PASS');
  });

  test('the derivation fails closed: an unknown word, a malformed or contradictory pair and an unobserved SHA all return null', () => {
    const run = (value: string, observed: string, executed: string) => deriveCiStatusFromRecord({ value, observed, executed, record: RECORD });
    expect(run('MOSTLY_GREEN', 'NONE', 'NONE')).toBeNull();
    expect(run('EXECUTED_PASS', 'short', 'short')).toBeNull();
    expect(run('EXECUTED_PASS', SHA_A, SHA_B)).toBeNull();
    expect(run('EXECUTED_PASS', SHA_A, SHA_A)).toBeNull();
    expect(run('NOT_OBSERVED', SHA_A, 'NONE')).toBeNull();
    expect(run('NOT_OBSERVED', 'NONE', 'NONE')).toBe('NOT_OBSERVED');
    // The live anchor: its own exact-head run (36790169165) is the newest at 027367d9.
    const anchor = '027367d9da22ea1198c0a60fb1b11805f6719d40';
    expect(newestObservationPerSha(RECORD).get(anchor)).toMatchObject({ runId: '36790169165', classification: 'EXECUTED_PASS' });
    expect(run('EXECUTED_PASS', anchor, anchor)).toBe('EXECUTED_PASS');
  });

  // R4-12: the red runs the review named are recorded, with their repair runs.
  test('the five review-4 red runs and their repairs are all recorded', () => {
    const runIds = new Set(RECORD.history.map((entry: { runId: string }) => entry.runId));
    for (const runId of ['36537649045', '36596242188', '36787018515', '36806004712', '36806699016']) {
      expect(runIds.has(runId), `run ${runId} is not recorded`).toBe(true);
    }
    const reds = RECORD.history.filter((entry: { classification: string }) => entry.classification !== 'EXECUTED_PASS');
    for (const red of reds) {
      const classified = Array.isArray(red.defectClasses) && red.defectClasses.length > 0;
      const detailed = typeof red.detail === 'string' && red.detail.length >= 20;
      expect(classified || detailed, `red run ${red.runId} carries neither a defect class nor a detail`).toBe(true);
    }
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
  test('the live record declares the candidate routes with trade-offs and the materialised owner route', () => {
    const judgement = validateCiRouteCandidates(RECORD);
    expect(judgement.errors).toEqual([]);
    expect(judgement.routes).toHaveLength(4);
    // D-03 / R2-61: the owner route that materialised is the restored
    // GitHub-hosted execution; the earlier candidate menu stays recorded.
    expect(RECORD.routeSelection.state).toBe('SELECTED_BY_OWNER');
    expect(RECORD.routeSelection.selectedRouteId).toBe('github-hosted-execution-restored');
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
    const tampered = { ...RECORD, routeSelection: { state: 'OWNER_DECISION_REQUIRED', ownerDecision: '3.11', selectedRouteId: 'gate-topology-substitute' } };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_SELECTION_PREMATURE');
  });

  test('fewer than three routes is incomplete', () => {
    const tampered = { ...RECORD, candidateRoutes: RECORD.candidateRoutes.slice(0, 2) };
    expect(validateCiRouteCandidates(tampered).errors.map((entry) => entry.code)).toContain('CI_ROUTE_CANDIDATES_INCOMPLETE');
  });
});
