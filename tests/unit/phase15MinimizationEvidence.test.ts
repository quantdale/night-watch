import { test, expect } from '@playwright/test';
import {
  minimizeFailure,
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  type MinimizationAction,
} from '../../src/core/triage';
import type { SafetyVector } from '../../src/core/exploration/types';

const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FP_OTHER = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';

const ZERO_SAFETY: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

function action(actionId: string, routeClass = '/ripple/test'): MinimizationAction {
  return { actionId, semanticClass: 'KNOWN_READ', routeClass, sourceApproved: true, catalogVersion: 'synthetic.catalog.v1' };
}

function outcome(failed: boolean, fingerprint = FP, safety = ZERO_SAFETY) {
  return { status: failed ? 'FAILURE' as const : 'PASS' as const, ...(failed ? { anomalyFingerprint: fingerprint } : {}), safety };
}

type PreconditionCheck = (candidate: readonly MinimizationAction[]) => { valid: boolean; reason?: 'PRECONDITION_DIVERGENCE' };

async function runMinimizer(
  sequence: readonly string[],
  replay: (ids: readonly string[], phase: string) => ReturnType<typeof outcome>,
  options: { budget?: typeof SYNTHETIC_MINIMIZATION_BUDGET; preconditionCheck?: PreconditionCheck; approvedActionIds?: ReadonlySet<string> } = {},
) {
  let calls = 0;
  const result = await minimizeFailure({
    originalSequence: sequence.map((id) => action(id)),
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: options.approvedActionIds ?? new Set(sequence),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: options.budget ?? SYNTHETIC_MINIMIZATION_BUDGET,
    preconditionCheck: options.preconditionCheck,
    replay: (candidate, phase) => {
      calls += 1;
      return replay(candidate.map((item) => item.actionId), phase);
    },
  });
  return { result, calls };
}

test.describe('Phase 15 truthful minimization evidence (Workstream D)', () => {
  test('non-reproducing original reports NO_REDUCIBLE_CANDIDATE without any reduction claim', async () => {
    const { result } = await runMinimizer(['a1', 'a2'], () => outcome(false));
    expect(result.status).toBe('NO_REPRODUCTION');
    expect(result.freshExactReplay).toBe('NOT_REPRODUCED');
    expect(result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
    expect(result.minimalityGuarantee).toBe('NONE');
  });

  test('single-action original has nothing to reduce and stays vacuously minimal', async () => {
    const { result } = await runMinimizer(['a1'], (ids) => outcome(ids.includes('a1')));
    expect(result.status).toBe('UNCHANGED');
    expect(result.minimalReproducingSequence).toEqual(['a1']);
    // Vacuously 1-minimal (no non-empty proper subsequence exists), but no
    // reduced-candidate replay ever ran, so the evidence class says so.
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
    expect(result.candidateEvaluations.every((item) => item.disposition !== 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('genuine reduction with completed audit proves minimality', async () => {
    const { result } = await runMinimizer(['a1', 'a2', 'a3', 'a4'], (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['a1', 'a4']);
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    expect(result.candidateEvaluations.some((item) => item.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('budget exhaustion mid-audit leaves minimality unproven', async () => {
    const { result } = await runMinimizer(['a1', 'a2', 'a3', 'a4', 'a5'], (ids) => outcome(ids.includes('a1') && ids.includes('a5')), {
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 1, maxTotalReplays: 2 },
    });
    expect(result.status).toBe('BOUNDED_BUDGET_EXHAUSTED');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
  });

  test('all-invalid deletions never claim 1-MINIMAL even when status is UNCHANGED', async () => {
    // Journey-style policy: every reduced candidate diverges preconditions
    // before a genuine replay is possible; only the full original is legal.
    const { result, calls } = await runMinimizer(['a1', 'a2', 'a3'], () => outcome(true), {
      preconditionCheck: (candidate) => candidate.length === 3 ? { valid: true } : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
    });
    expect(calls).toBe(1); // only the fresh exact replay reached an executor
    expect(result.status).toBe('UNCHANGED');
    expect(result.freshExactReplay).toBe('REPRODUCED');
    // Conflation fix: INVALID dispositions are not proof, so the guarantee
    // must drop below 1-MINIMAL.
    expect(result.minimalityGuarantee).not.toBe('1-MINIMAL');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    const reduced = result.candidateEvaluations.slice(1);
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced.every((item) => item.disposition === 'INVALID' && item.reason === 'PRECONDITION_DIVERGENCE')).toBe(true);
    expect(result.invalidCandidateCount).toBe(reduced.length);
  });

  test('mixed invalid and genuine deletions prove minimality through the genuine evidence alone', async () => {
    const { result } = await runMinimizer(['a1', 'a2', 'a3'], (ids) => outcome(ids.includes('a1') && ids.includes('a3')), {
      preconditionCheck: (candidate) => candidate.some((item) => item.actionId === 'a2') && !candidate.some((item) => item.actionId === 'a1')
        ? { valid: false, reason: 'PRECONDITION_DIVERGENCE' }
        : { valid: true },
    });
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['a1', 'a3']);
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    expect(result.candidateEvaluations.some((item) => item.disposition === 'INVALID' && item.reason === 'PRECONDITION_DIVERGENCE')).toBe(true);
    expect(result.candidateEvaluations.some((item) => item.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('mismatched-fingerprint FAILURE is normalized to not-reproduced, never to reproduction', async () => {
    const { result } = await runMinimizer(['a1', 'a2'], (_ids, phase) => outcome(phase !== 'REDUCED_CANDIDATE', phase === 'REDUCED_CANDIDATE' ? FP_OTHER : FP));
    expect(result.status).toBe('UNCHANGED');
    expect(result.reproductionCount).toBe(1); // fresh exact replay only
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    const reduced = result.candidateEvaluations.slice(1);
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced.every((item) => item.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
    expect(reduced.every((item) => item.reason === 'FAILURE_NOT_OBSERVED' && item.fingerprintMatch === false)).toBe(true);
    expect(result.candidateEvaluations.filter((item) => item.disposition === 'REPRODUCES')).toHaveLength(1);
  });

  test('INVALID_ORIGINAL reports unavailable reduction preconditions without any replay', async () => {
    const { result, calls } = await runMinimizer(['a1'], () => outcome(true), { approvedActionIds: new Set(['other']) });
    expect(calls).toBe(0);
    expect(result.status).toBe('INVALID_ORIGINAL');
    expect(result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    expect(result.minimalityGuarantee).toBe('NONE');
  });

  test('safety-vector rejection propagation is unchanged and never counts as proof', async () => {
    const freshRejection = await runMinimizer(['a1', 'a2'], () => outcome(true, FP, { ...ZERO_SAFETY, knownMutations: 1 }));
    expect(freshRejection.result.status).toBe('NO_REPRODUCTION');
    expect(freshRejection.result.safetyRejectionCount).toBe(1);
    expect(freshRejection.result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
    expect(freshRejection.calls).toBe(1);

    // Reduced candidates rejected for nonzero safety are INVALID evidence:
    // no genuine reduced replay happened, so minimality stays unproven.
    const reducedRejection = await runMinimizer(['a1', 'a2'], (_ids, phase) => outcome(phase !== 'REDUCED_CANDIDATE', FP, phase === 'REDUCED_CANDIDATE' ? { ...ZERO_SAFETY, productionAttempts: 1 } : ZERO_SAFETY));
    expect(reducedRejection.result.status).toBe('UNCHANGED');
    expect(reducedRejection.result.safetyRejectionCount).toBe(2);
    expect(reducedRejection.result.minimalityGuarantee).not.toBe('1-MINIMAL');
    expect(reducedRejection.result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    expect(reducedRejection.result.candidateEvaluations.slice(1).every((item) => item.disposition === 'INVALID' && item.reason === 'SAFETY_VECTOR_NONZERO')).toBe(true);
  });

  test('identical inputs produce byte-identical results across repeated runs', async () => {
    const replay = (ids: readonly string[]) => outcome(ids[0] === 'a1' && ids.includes('a4'));
    const first = await runMinimizer(['a1', 'a2', 'a3', 'a4'], replay);
    const second = await runMinimizer(['a1', 'a2', 'a3', 'a4'], replay);
    const third = await runMinimizer(['a1', 'a2', 'a3', 'a4'], replay);
    expect(second.result).toEqual(first.result);
    expect(third.result).toEqual(first.result);
    expect(JSON.stringify(third.result)).toBe(JSON.stringify(first.result));
    expect(first.result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
  });
});
