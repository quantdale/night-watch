import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  SELFDEV_BUDGET,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_EVALUATION_SCHEMA_VERSION,
  SELFDEV_FIXTURE_ID,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_TARGET_SURFACE,
  SyntheticDeterministicProposer,
  type SyntheticProposalFixture,
  SelfDevEvaluator,
  SelfDevPrivateArtifactStore,
  runSyntheticSelfDevSession,
  SelfDevSessionBudgetError,
  ZERO_SELFDEV_SAFETY_VECTOR,
  candidateIdFor,
  validateEvaluation,
  validateSessionArtifact,
  resolveSelfDevAction,
  resolveSelfDevAssertion,
  validateCandidate,
  type SelfDevCandidate,
} from '../../src/core/selfDev';

const BASE_SHA = 'b'.repeat(40);

function proposer(): SyntheticDeterministicProposer {
  return new SyntheticDeterministicProposer();
}

function reidentify(candidate: SelfDevCandidate, changes: Partial<Omit<SelfDevCandidate, 'candidateId'>>): SelfDevCandidate {
  const { candidateId: _candidateId, ...draft } = { ...candidate, ...changes };
  return { ...draft, candidateId: candidateIdFor(draft) };
}

test.describe('Phase 8A registries and deterministic evaluator', () => {
  test('known action and assertion IDs resolve, while mutation-shaped entries do not', () => {
    expect(resolveSelfDevAction('selfdev.synthetic.expand-summary').mutation).toBe(false);
    expect(resolveSelfDevAssertion('selfdev.assert.state.expanded').assertionClass).toBe('EXPECTED_STATE_ID');
    expect(() => resolveSelfDevAction('selfdev.synthetic.save-settings')).toThrow(/UNKNOWN_ACTION/);
    expect(() => resolveSelfDevAssertion('state === expanded')).toThrow(/UNKNOWN_ASSERTION/);
  });

  test('empty, duplicate, and oversized action/assertion lists fail before execution', () => {
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    expect(() => validateCandidate(reidentify(valid, { actionIds: [] }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate(reidentify(valid, { assertionIds: [] }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate(reidentify(valid, { actionIds: ['selfdev.synthetic.expand-summary', 'selfdev.synthetic.expand-summary'] }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate(reidentify(valid, { assertionIds: ['selfdev.assert.state.expanded', 'selfdev.assert.state.expanded'] }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate(reidentify(valid, { actionIds: Array.from({ length: SELFDEV_BUDGET.maxActionsPerCandidate + 1 }, (_, index) => `selfdev.synthetic.action-${index}`) }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateCandidate(reidentify(valid, { assertionIds: Array.from({ length: SELFDEV_BUDGET.maxAssertionsPerCandidate + 1 }, (_, index) => `selfdev.assert.assertion-${index}`) }))).toThrow(/SELFDEV_SCHEMA/);
  });

  test('valid edge, duplicate, and unsafe candidate form the full synthetic matrix', () => {
    const results = new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(proposer().propose({ baseNightwatchSha: BASE_SHA, seed: 7 }));
    expect(results).toHaveLength(3);
    expect(results[0]?.resultClass).toBe('EVALUATED_PASS_NOT_ADOPTED');
    expect(results[0]?.coverageDelta.count).toBeGreaterThan(0);
    expect(results[0]?.executionStatus).toBe('EXECUTED');
    expect(results[1]?.resultClass).toBe('REJECTED_DUPLICATE');
    expect(results[1]?.duplicateStatus).toBe('DUPLICATE');
    expect(results[2]?.resultClass).toBe('REJECTED_SAFETY');
    expect(results[2]?.executionStatus).toBe('NOT_STARTED');
    for (const result of results) {
      expect(result?.adoptionStatus).toBe('NOT_AUTHORIZED_PHASE_8A');
      expect(result?.publication).toBe('PROHIBITED');
      expect(result?.sourceWrites).toBe(0);
      expect(result?.gitWrites).toBe(0);
      expect(result?.externalCalls).toBe(0);
      expect(result?.safetyVector).toEqual(ZERO_SELFDEV_SAFETY_VECTOR);
    }
  });

  test('unknown actions and assertions reject before the fixture executes', () => {
    const p = proposer();
    const actionResult = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(p.propose({ baseNightwatchSha: BASE_SHA, fixture: 'UNSAFE_ACTION' })[0]);
    const assertionResult = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(p.propose({ baseNightwatchSha: BASE_SHA, fixture: 'UNSAFE_ASSERTION' })[0]);
    expect(actionResult.resultClass).toBe('REJECTED_UNKNOWN_ACTION');
    expect(actionResult.executionStatus).toBe('NOT_STARTED');
    expect(assertionResult.resultClass).toBe('REJECTED_UNKNOWN_ASSERTION');
    expect(assertionResult.executionStatus).toBe('NOT_STARTED');
  });

  test('scope, fake coverage, privacy, and forbidden-field proposals fail closed', () => {
    const p = proposer();
    const cases: Array<[SyntheticProposalFixture, string]> = [
      ['SCOPE_ESCALATION', 'REJECTED_SCOPE'],
      ['FAKE_COVERAGE', 'REJECTED_SCOPE'],
      ['PRIVACY_VALUE', 'REJECTED_PRIVACY'],
      ['CODE_FIELD', 'REJECTED_SCHEMA'],
      ['PATCH_FIELD', 'REJECTED_SCHEMA'],
      ['GIT_REQUEST', 'REJECTED_SCHEMA'],
      ['MODEL_REQUEST', 'REJECTED_SCHEMA'],
    ];
    for (const [fixture, expected] of cases) {
      const result = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(p.propose({ baseNightwatchSha: BASE_SHA, fixture })[0]);
      expect(result.resultClass, fixture).toBe(expected);
      expect(result.executionStatus, fixture).toBe('NOT_STARTED');
      expect(result.sourceWrites, fixture).toBe(0);
      expect(result.externalCalls, fixture).toBe(0);
    }
  });

  test('a known baseline edge adds no coverage and is rejected as duplicate', () => {
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    const baseline = reidentify(valid, {
      title: 'Observe synthetic summary read-only',
      actionIds: ['selfdev.synthetic.observe-ready'],
      assertionIds: ['selfdev.assert.state.ready', 'selfdev.assert.transition.observation'],
      coverageClaims: ['state-action:ready:selfdev.synthetic.observe-ready'],
    });
    const result = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(baseline);
    expect(result.resultClass).toBe('REJECTED_DUPLICATE');
    expect(result.coverageDelta).toEqual({ added: [], count: 0 });
  });

  test('candidate flood is rejected before any candidate evaluation', () => {
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0];
    const values = [valid, valid, valid, valid];
    expect(() => new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(values)).toThrow(SelfDevSessionBudgetError);
  });

  test('same seed/base/fixture is exactly deterministic', () => {
    const p = proposer();
    const first = new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(p.propose({ baseNightwatchSha: BASE_SHA, seed: 17 }));
    const second = new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(p.propose({ baseNightwatchSha: BASE_SHA, seed: 17 }));
    expect(first).toEqual(second);
    expect(first.map((result) => result.evaluationId)).toEqual(second.map((result) => result.evaluationId));
  });

  test('order-insensitive assertion/coverage/source metadata is canonicalized before identity', () => {
    const candidate = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    const reordered = reidentify(candidate, {
      assertionIds: [...candidate.assertionIds].reverse(),
      coverageClaims: [...candidate.coverageClaims].reverse(),
      sourceRefs: ['selfdev.source.registry'],
    });
    const equivalent = reidentify(candidate, {
      assertionIds: [...candidate.assertionIds],
      coverageClaims: [...candidate.coverageClaims],
      sourceRefs: ['selfdev.source.registry'],
    });
    expect(reordered.candidateId).toBe(equivalent.candidateId);
  });

  test('every safety-vector escalation rejects before execution and leaves all counters zero', () => {
    const fields = Object.keys(ZERO_SELFDEV_SAFETY_VECTOR) as Array<keyof typeof ZERO_SELFDEV_SAFETY_VECTOR>;
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    for (const field of fields) {
      const safety = { ...ZERO_SELFDEV_SAFETY_VECTOR, [field]: 1 };
      const candidate = reidentify(valid, { safety });
      const result = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(candidate);
      expect(result.resultClass, field).toBe('REJECTED_SAFETY');
      expect(result.executionStatus, field).toBe('NOT_STARTED');
      expect(result.sourceWrites, field).toBe(0);
      expect(result.gitWrites, field).toBe(0);
      expect(result.externalCalls, field).toBe(0);
    }
  });

  test('DEV/NEXT/production/network/data/infrastructure/owner/source/oracle escalation fails before execution', () => {
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    const surfaces = ['DEV', 'NEXT', 'PRODUCTION', 'HTTP', 'WEBSOCKET', 'DATABASE', 'GCP', 'AWS', 'SHELL', 'GIT', 'FILESYSTEM'] as const;
    for (const surface of surfaces) {
      const candidate = reidentify(valid, { targetSurface: surface as unknown as typeof SELFDEV_TARGET_SURFACE });
      const result = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(candidate);
      expect(result.resultClass, surface).toBe('REJECTED_SCOPE');
      expect(result.executionStatus, surface).toBe('NOT_STARTED');
    }
    for (const field of ['oracleRegistration', 'sourceWrite', 'git', 'publicationRequest', 'ownerDecision'] as const) {
      const candidate = { ...valid, [field]: 'synthetic-escalation' } as unknown;
      const result = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(candidate);
      expect(result.resultClass, field).toBe('REJECTED_SCHEMA');
      expect(result.executionStatus, field).toBe('NOT_STARTED');
    }
  });

  test('candidate and evaluation schemas remain exact-key and no-adoption', () => {
    const report = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false });
    expect(report.evaluations.every((evaluation) => evaluation.schemaVersion === SELFDEV_EVALUATION_SCHEMA_VERSION)).toBe(true);
    for (const evaluation of report.evaluations) {
      expect(validateEvaluation(evaluation)).toEqual(evaluation);
      expect(() => validateEvaluation({ ...evaluation, autoAdopt: true })).toThrow(/SELFDEV_SCHEMA/);
    }
    const artifact = {
      schemaVersion: report.schemaVersion,
      artifactId: report.privateArtifact.artifactId,
      baseNightwatchSha: report.baseNightwatchSha,
      proposerClass: report.proposerClass,
      candidateCount: report.candidateCount,
      evaluations: report.evaluations,
      adoptionStatus: report.adoptionStatus,
      publication: report.publication,
      sourceWrites: report.sourceWrites,
      gitWrites: report.gitWrites,
      externalCalls: report.externalCalls,
      safetyVector: report.safetyVector,
    };
    expect(validateSessionArtifact(artifact).adoptionStatus).toBe('NOT_AUTHORIZED_PHASE_8A');
  });

  test('monotonic candidate and session budgets fail closed without retries', () => {
    const valid = proposer().propose({ baseNightwatchSha: BASE_SHA })[0];
    let candidateTick = 0;
    const candidateBudgetResult = new SelfDevEvaluator({ clock: () => (candidateTick++ === 0 ? 0 : 30_001) }).evaluateCandidate(valid);
    expect(candidateBudgetResult.resultClass).toBe('EVALUATION_FAILED');
    expect(candidateBudgetResult.reasonCode).toBe('CANDIDATE_EVALUATION_BUDGET_EXCEEDED');
    let sessionTick = 0;
    const sessionBudgetResult = new SelfDevEvaluator({ clock: () => (sessionTick++ === 0 ? 0 : 120_001) }).evaluateSession([valid])[0]!;
    expect(sessionBudgetResult.resultClass).toBe('EVALUATION_FAILED');
    expect(sessionBudgetResult.reasonCode).toBe('SESSION_EVALUATION_BUDGET_EXCEEDED');
    expect(sessionBudgetResult.executionStatus).toBe('NOT_STARTED');
  });

  test('the proposer exposes only the synthetic deterministic class and bounded fixtures', () => {
    const p = proposer();
    expect(p.proposerClass).toBe(SELFDEV_PROPOSER_CLASS);
    expect(p.propose({ baseNightwatchSha: BASE_SHA }).length).toBe(3);
    expect(() => p.propose({ baseNightwatchSha: BASE_SHA, seed: 1000 })).toThrow();
    expect(() => p.propose({ baseNightwatchSha: BASE_SHA, seed: -1 })).toThrow();
    const malformed = ['UNKNOWN_FIELD', 'UNSAFE_ACTION', 'UNSAFE_ASSERTION', 'OVERSIZED', 'DUPLICATE', 'SCOPE_ESCALATION', 'FAKE_COVERAGE', 'CODE_FIELD', 'PATCH_FIELD', 'GIT_REQUEST', 'MODEL_REQUEST'] as const;
    for (const fixture of malformed) expect(p.propose({ baseNightwatchSha: BASE_SHA, fixture }).length).toBeGreaterThan(0);
  });

  test('candidate schema keeps the explicit local synthetic identity', () => {
    const candidate = proposer().propose({ baseNightwatchSha: BASE_SHA })[0] as SelfDevCandidate;
    expect(candidate.schemaVersion).toBe(SELFDEV_CANDIDATE_SCHEMA_VERSION);
    expect(candidate.fixtureId).toBe(SELFDEV_FIXTURE_ID);
    expect(candidate.targetSurface).toBe(SELFDEV_TARGET_SURFACE);
    expect(candidate.candidateId).toMatch(/^candidate:[a-f0-9]{64}$/);
  });

  test('private persistence uses the separate immutable self-development namespace', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-'));
    try {
      const store = new SelfDevPrivateArtifactStore({ root });
      const first = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, seed: 3, artifactStore: store });
      const second = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, seed: 3, artifactStore: store });
      expect(first.privateArtifact.persisted).toBe(true);
      expect(first.privateArtifact.namespace).toBe('self-development');
      expect(first.privateArtifact.disposition).toBe('CREATED');
      expect(second.privateArtifact.disposition).toBe('EXACT_DUPLICATE');
      const files = fs.readdirSync(root);
      expect(files).toHaveLength(1);
      const stored = JSON.parse(fs.readFileSync(path.join(root, files[0]!), 'utf8')) as Record<string, unknown>;
      expect(stored.status).toBe('READY');
      expect(JSON.stringify(stored)).not.toMatch(/CUSTOMER_SENTINEL|Bearer |PRIVATE KEY/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the controller can evaluate without persistence for isolated callers', () => {
    const report = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false });
    expect(report.privateArtifact.persisted).toBe(false);
    expect(report.privateArtifact.disposition).toBe('NOT_PERSISTED');
    expect(report.evaluations[0]?.resultClass).toBe('EVALUATED_PASS_NOT_ADOPTED');
  });
});
