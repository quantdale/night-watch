import { test, expect } from '@playwright/test';
import {
  minimizeFailure,
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  type MinimizationAction,
} from '../../src/core/triage';
import type { SafetyVector } from '../../src/core/exploration/types';

// Phase 15P A07 — minimality-truth adversarial suite. Every fixture attacks
// one way a minimization result could lie: executors that report without
// executing, reductions that were never exercised, vacuous survivors,
// exhausted budgets, divergent preconditions, and non-deterministic seeds.
// Synthetic fake values only; the replay callback is the only boundary.

const FP = 'fp:sha256:cccccccccccccccccccccccc';

const ZERO_SAFETY: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

type ReplayPhase = 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';

function action(actionId: string, routeClass = '/synthetic/truth'): MinimizationAction {
  return { actionId, semanticClass: 'KNOWN_READ', routeClass, sourceApproved: true, catalogVersion: 'synthetic.catalog.v15p' };
}

function outcome(failed: boolean, fingerprint = FP, safety = ZERO_SAFETY) {
  return { status: failed ? ('FAILURE' as const) : ('PASS' as const), ...(failed ? { anomalyFingerprint: fingerprint } : {}), safety };
}

interface RecordedCall {
  readonly phase: ReplayPhase;
  readonly actionIds: readonly string[];
}

type PreconditionCheck = (candidate: readonly MinimizationAction[]) => { valid: boolean; reason?: 'PRECONDITION_DIVERGENCE' };

interface RunOptions {
  readonly budget?: typeof SYNTHETIC_MINIMIZATION_BUDGET;
  readonly preconditionCheck?: PreconditionCheck;
  readonly approvedActionIds?: ReadonlySet<string>;
}

async function runMinimizer(
  sequence: readonly string[],
  replay: (ids: readonly string[], phase: ReplayPhase) => ReturnType<typeof outcome>,
  options: RunOptions = {},
) {
  const invocations: RecordedCall[] = [];
  const result = await minimizeFailure({
    originalSequence: sequence.map((id) => action(id)),
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v15p',
    catalogVersion: 'synthetic.catalog.v15p',
    approvedActionIds: options.approvedActionIds ?? new Set(sequence),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: options.budget ?? SYNTHETIC_MINIMIZATION_BUDGET,
    preconditionCheck: options.preconditionCheck,
    replay: (candidate, phase) => {
      invocations.push({ phase, actionIds: candidate.map((item) => item.actionId) });
      return replay(candidate.map((item) => item.actionId), phase);
    },
  });
  return { result, invocations };
}

function isOrderPreservingSubsequence(candidate: readonly string[], original: readonly string[]): boolean {
  let cursor = 0;
  for (const id of original) {
    if (cursor < candidate.length && candidate[cursor] === id) cursor += 1;
  }
  return cursor === candidate.length;
}

test.describe('Phase 15P minimality truth (A07)', () => {
  test('lying executor that passes everything without executing lands in NO_REPRODUCTION, never in a minimality claim', async () => {
    // The executor never performs a single execution and reports PASS for the
    // fresh exact replay too. No reproduction is observed, so no reduction
    // and certainly no minimality claim may exist.
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3'], () => {
      return outcome(false); // lies: claims pass without executing anything
    });
    expect(result.status).toBe('NO_REPRODUCTION');
    expect(result.freshExactReplay).toBe('NOT_REPRODUCED');
    expect(result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
    expect(result.minimalityGuarantee).toBe('NONE');
    expect(result.confidence).toBe('UNRESOLVED');
    expect(result.minimalReproducingSequence).toEqual([]);
    expect(result.removedActions).toEqual([]);
    // Exactly one bound-path round trip happened (the fresh replay); no
    // reduced probe was ever spent on a run that could not reduce.
    expect(invocations).toHaveLength(1);
    expect(invocations[0]!.phase).toBe('FRESH_EXACT_REPLAY');
    expect(result.replayCount).toBe(1);
  });

  test('lying executor reporting pass on every reduced probe keeps the proven claim anchored to exercised bound-path probes', async () => {
    // Fresh replay honestly reproduces; the executor then claims PASS for
    // every reduced candidate without executing any of them. The minimizer
    // cannot observe executor-side execution, so its truthfulness contract is
    // narrower and mechanical: MINIMALITY_PROVEN may only rest on probes that
    // actually went through the bound replay path, recorded as reported.
    let executorSideReducedExecutions = 0; // the liar never executes; it only reports
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3'], (_ids, phase) => {
      if (phase === 'REDUCED_CANDIDATE') return outcome(false);
      return outcome(true);
    });
    expect(executorSideReducedExecutions).toBe(0);
    expect(result.status).toBe('UNCHANGED');
    expect(result.freshExactReplay).toBe('REPRODUCED');
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    // The claim is backed exclusively by genuinely routed reduced probes:
    // fresh (1) + four distinct reduced sequences ([a3], [a1,a2] in ddmin;
    // [a2,a3], [a1,a3] in the audit; the fifth deletion [a1,a2] is a cache
    // hit of an already-exercised probe).
    expect(result.replayCount).toBe(5);
    const reducedInvocations = invocations.filter((call) => call.phase === 'REDUCED_CANDIDATE');
    expect(reducedInvocations).toHaveLength(4);
    const probedSequences = new Set(reducedInvocations.map((call) => call.actionIds.join('|')));
    expect(probedSequences.size).toBe(4);
    const reducedLedger = result.candidateEvaluations.slice(1);
    expect(reducedLedger.length).toBeGreaterThan(0);
    expect(reducedLedger.every((item) => item.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
    expect(reducedLedger.every((item) => item.reason === 'FAILURE_NOT_OBSERVED' && item.fingerprintMatch === false)).toBe(true);
    expect(result.candidateEvaluations.filter((item) => item.disposition === 'REPRODUCES')).toHaveLength(1);
    expect(result.confidence).toBe('MEDIUM'); // reproductionCount is 1: only the fresh replay reproduced
  });

  test('fabricated reduced reproduction stays anchored to a genuine bound-path invocation of the reported minimum', async () => {
    // The executor fabricates a target reproduction for the very first
    // reduced probe without executing it. Fabrication itself is outside
    // minimizer authority (the executor is the only outcome authority), but
    // the reported minimum must still be a sequence that genuinely went
    // through the bound replay path — never an invented shortcut.
    let reducedCalls = 0;
    const { result, invocations } = await runMinimizer(['a', 'b', 'c'], (ids, phase) => {
      if (phase === 'REDUCED_CANDIDATE') {
        reducedCalls += 1;
        if (reducedCalls === 1) return outcome(true); // fabricated reproduction for the first probe
        return outcome(false);
      }
      return outcome(ids.length === 3);
    });
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['c']);
    expect(result.removedActions).toEqual(['a', 'b']);
    // Anchor invariant: the reported minimum is exactly the sequence of the
    // (fabricated) bound-path invocation — the claim never detaches from the
    // replay ledger.
    const fabricatedCall = invocations.find((call) => call.phase === 'REDUCED_CANDIDATE' && call.actionIds.join('|') === 'c');
    expect(fabricatedCall).toBeDefined();
    expect(result.minimalReproducingSequence).toEqual(fabricatedCall!.actionIds);
    expect(invocations[0]!.phase).toBe('FRESH_EXACT_REPLAY');
    expect(invocations[0]!.actionIds).toEqual(['a', 'b', 'c']);
    expect(result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE'); // vacuous single-action survivor
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
  });

  test('single-action original stays vacuously minimal but reports NO_REDUCIBLE_CANDIDATE', async () => {
    const { result, invocations } = await runMinimizer(['solo'], (ids) => outcome(ids.includes('solo')));
    expect(result.status).toBe('UNCHANGED');
    expect(result.minimalReproducingSequence).toEqual(['solo']);
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    // Zero-reduction truthfulness: no reduced candidate was ever produced or
    // admitted, so the evidence class must never say proven-minimal.
    expect(result.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
    expect(result.candidateEvaluations.every((item) => item.disposition !== 'DOES_NOT_REPRODUCE')).toBe(true);
    expect(invocations).toHaveLength(1);
    expect(result.replayCount).toBe(1);
  });

  test('all-invalid deletions report REDUCTION_PRECONDITION_UNAVAILABLE and never 1-MINIMAL', async () => {
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3'], () => outcome(true), {
      preconditionCheck: (candidate) => candidate.length === 3 ? { valid: true } : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
    });
    expect(invocations).toHaveLength(1); // only the fresh exact replay reached the executor
    expect(result.status).toBe('UNCHANGED');
    expect(result.freshExactReplay).toBe('REPRODUCED');
    expect(result.minimalityGuarantee).not.toBe('1-MINIMAL');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    const reduced = result.candidateEvaluations.slice(1);
    expect(reduced.length).toBeGreaterThan(0);
    // Precondition divergence stays distinct from a pass everywhere in the
    // recorded evidence DTO.
    expect(reduced.every((item) => item.disposition === 'INVALID' && item.reason === 'PRECONDITION_DIVERGENCE')).toBe(true);
    expect(reduced.every((item) => item.disposition !== 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('survivor deletions mixing unexercised divergence with genuine non-reproduction can never claim MINIMALITY_PROVEN or 1-MINIMAL', async () => {
    // Adversarial core of the Phase 15P fix. Action 'a' is a precondition
    // anchor: any candidate without it diverges before a replay. The anomaly
    // needs 'a' and 'c', so ddmin reduces to [a, c], whose own deletion set
    // mixes one never-replayed INVALID deletion ([c]) with one genuine
    // non-reproduction ([a]). The old rule let the single genuine deletion
    // back a 1-MINIMAL claim over the unexercised sibling; the truthful
    // outcome is BOUNDED_MINIMAL + MINIMALITY_NOT_PROVEN.
    const { result, invocations } = await runMinimizer(['a', 'b', 'c'],
      (ids) => outcome(ids.includes('a') && ids.includes('c')),
      {
        preconditionCheck: (candidate) => candidate.some((item) => item.actionId === 'a')
          ? { valid: true }
          : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
      });
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['a', 'c']);
    expect(result.removedActions).toEqual(['b']);
    expect(result.freshExactReplay).toBe('REPRODUCED');
    expect(result.minimalityGuarantee).not.toBe('1-MINIMAL');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
    expect(result.confidence).toBe('MEDIUM');
    // The unexercised survivor deletion is visible as INVALID evidence, and
    // it truly never reached the executor: every invoked sequence retains the
    // precondition anchor 'a'.
    const survivorDeletionC = result.candidateEvaluations.find((item) => item.sequence.join('|') === 'c');
    expect(survivorDeletionC).toBeDefined();
    expect(survivorDeletionC!.disposition).toBe('INVALID');
    expect(survivorDeletionC!.reason).toBe('PRECONDITION_DIVERGENCE');
    const survivorDeletionA = result.candidateEvaluations.find((item) => item.sequence.join('|') === 'a');
    expect(survivorDeletionA).toBeDefined();
    expect(survivorDeletionA!.disposition).toBe('DOES_NOT_REPRODUCE');
    expect(invocations.every((call) => call.actionIds.includes('a'))).toBe(true);
  });

  test('fully exercised survivor audit proves minimality through genuine evidence alone', async () => {
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3', 'a4'], (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['a1', 'a4']);
    expect(result.removedActions).toEqual(['a2', 'a3']);
    expect(result.minimalityGuarantee).toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    expect(result.confidence).toBe('HIGH');
    // Both survivor deletions were genuinely exercised through the bound
    // replay path and observed as non-reproductions.
    const reducedInvocations = invocations.filter((call) => call.phase === 'REDUCED_CANDIDATE');
    const probed = new Set(reducedInvocations.map((call) => call.actionIds.join('|')));
    expect(probed.has('a4')).toBe(true);
    expect(probed.has('a1')).toBe(true);
    expect(result.candidateEvaluations.some((item) => item.disposition === 'DOES_NOT_REPRODUCE')).toBe(true);
    expect(result.candidateEvaluations.every((item) => item.disposition !== 'NOT_EVALUATED_BUDGET')).toBe(true);
    // The reported minimum itself was genuinely replayed and observed
    // reproducing (the accepting ddmin/audit step), never assumed.
    const minimumInvocation = invocations.find((call) => call.actionIds.join('|') === 'a1|a4');
    expect(minimumInvocation).toBeDefined();
    expect(result.reproductionCount).toBeGreaterThanOrEqual(2);
  });

  test('candidate-budget exhaustion mid-search yields the distinct truthful bounded outcome', async () => {
    const { result } = await runMinimizer(['a1', 'a2', 'a3', 'a4', 'a5'], (ids) => outcome(ids.includes('a1') && ids.includes('a5')), {
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 1, maxTotalReplays: 2 },
    });
    expect(result.status).toBe('BOUNDED_BUDGET_EXHAUSTED');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
    expect(result.confidence).toBe('LOW');
    const skipped = result.candidateEvaluations.filter((item) => item.disposition === 'NOT_EVALUATED_BUDGET');
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped.every((item) => item.reason === 'BUDGET_EXHAUSTED' && item.fingerprintMatch === false)).toBe(true);
    // Budget bounds held: no more candidate evaluations than admitted.
    expect(result.candidateEvaluationCount).toBeLessThanOrEqual(1);
  });

  test('total-replay budget exhaustion surfaces its own distinct reason and stays bounded', async () => {
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3'], (ids) => outcome(ids.length === 3), {
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 1, maxTotalReplays: 1 },
    });
    expect(result.status).toBe('BOUNDED_BUDGET_EXHAUSTED');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    // The fresh exact replay consumed the entire replay budget; every reduced
    // probe was skipped with the distinct total-replay reason, never silently
    // treated as a pass or a reproduction.
    expect(result.replayCount).toBe(1);
    expect(invocations).toHaveLength(1);
    const skipped = result.candidateEvaluations.filter((item) => item.disposition === 'NOT_EVALUATED_BUDGET');
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped.every((item) => item.reason === 'TOTAL_REPLAY_BUDGET_EXHAUSTED')).toBe(true);
    expect(result.candidateEvaluations.some((item) => item.reason === 'BUDGET_EXHAUSTED')).toBe(false);
  });

  test('zero candidate-evaluation budget exhausts before any reduced probe reaches the executor', async () => {
    const { result, invocations } = await runMinimizer(['a1', 'a2', 'a3'], (ids) => outcome(ids.length === 3), {
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 0, maxTotalReplays: 1 },
    });
    expect(result.status).toBe('BOUNDED_BUDGET_EXHAUSTED');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
    expect(result.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(invocations).toHaveLength(1); // fresh replay only
    expect(result.candidateEvaluations.slice(1).every((item) => item.disposition === 'NOT_EVALUATED_BUDGET' && item.reason === 'BUDGET_EXHAUSTED')).toBe(true);
  });

  test('invalid budgets and empty sequences fail closed with explicit errors', async () => {
    const base = {
      originalSequence: [action('a1')],
      anomalyFingerprint: FP,
      sourceVersion: 'synthetic.source.v15p',
      catalogVersion: 'synthetic.catalog.v15p',
      safety: PASSIVE_MINIMIZATION_SAFETY,
      replay: () => outcome(true),
    };
    const invalidBudgets: readonly (readonly [number, number])[] = [
      [-1, 2],
      [2, 1],
      [0, 0],
      [3, 2],
    ];
    for (const [maxCandidateEvaluations, maxTotalReplays] of invalidBudgets) {
      let threw = '';
      try {
        await minimizeFailure({ ...base, budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations, maxTotalReplays } });
      } catch (error) {
        threw = error instanceof Error ? error.message : String(error);
      }
      expect(threw, `budget ${maxCandidateEvaluations}/${maxTotalReplays}`).toBe('MINIMIZATION_BUDGET_INVALID');
    }
    let emptyThrew = '';
    try {
      await minimizeFailure({ ...base, originalSequence: [] });
    } catch (error) {
      emptyThrew = error instanceof Error ? error.message : String(error);
    }
    expect(emptyThrew).toBe('MINIMIZATION_ORIGINAL_SEQUENCE_EMPTY');
  });

  test('non-deterministic seeded executor: first observation wins per sequence and repeats stay deep-equal', async () => {
    // Invocation-parity executor re-seeded per run: odd calls claim the target
    // failure, even calls claim pass. Within one run the per-sequence cache
    // makes the FIRST observation authoritative; across identically seeded
    // runs the whole result must be byte-stable.
    const runOnce = async () => {
      let invocationSeed = 0;
      const firstOutcomeByKey = new Map<string, string>();
      const { result } = await runMinimizer(['a1', 'a2', 'a3'], (ids) => {
        invocationSeed += 1;
        const failed = invocationSeed % 2 === 1;
        const key = ids.join('|');
        if (!firstOutcomeByKey.has(key)) firstOutcomeByKey.set(key, failed ? 'REPRODUCES' : 'DOES_NOT_REPRODUCE');
        return outcome(failed);
      });
      return { json: JSON.stringify(result), result, firstOutcomeByKey };
    };
    const runs = [await runOnce(), await runOnce(), await runOnce()];
    expect(runs[1]!.json).toBe(runs[0]!.json);
    expect(runs[2]!.json).toBe(runs[0]!.json);
    const { result, firstOutcomeByKey } = runs[0]!;
    // Every recorded disposition equals the classification of the first
    // bound-path observation of that exact sequence — no entry claims an
    // outcome the executor never reported for it.
    for (const item of result.candidateEvaluations) {
      const expected = firstOutcomeByKey.get(item.sequence.join('|'));
      expect(expected).toBeDefined();
      expect(item.disposition).toBe(expected);
    }
    // Bounds held despite the flip-flopping executor; the deterministic
    // parity schedule reduces to the single anchor action.
    expect(result.replayCount).toBeLessThanOrEqual(SYNTHETIC_MINIMIZATION_BUDGET.maxTotalReplays);
    expect(result.status).toBe('MINIMIZED');
    expect(result.minimalReproducingSequence).toEqual(['a1']);
  });

  test('exact replay and reduced replay stay separated in execution and recorded evidence', async () => {
    const original = ['a1', 'a2', 'a3', 'a4'];
    const { result, invocations } = await runMinimizer(original, (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    // Execution separation: exactly one fresh exact replay, first, on the
    // full original; everything else is a reduced candidate strictly inside
    // the original.
    expect(invocations.length).toBeGreaterThanOrEqual(2);
    expect(invocations[0]!.phase).toBe('FRESH_EXACT_REPLAY');
    expect(invocations[0]!.actionIds).toEqual(original);
    expect(invocations.slice(1).every((call) => call.phase === 'REDUCED_CANDIDATE')).toBe(true);
    expect(invocations.slice(1).every((call) => isOrderPreservingSubsequence(call.actionIds, original) && call.actionIds.length < original.length)).toBe(true);
    // Recorded-evidence separation: the first ledger record is the fresh
    // replay; the counted candidate evaluations exclude it.
    expect(result.candidateEvaluations[0]!.sequence).toEqual(original);
    expect(result.candidateEvaluationCount).toBe(result.candidateEvaluations.length - 1);
    expect(result.replayCount).toBe(invocations.length);
    expect(result.freshExactReplay).toBe('REPRODUCED');
    expect(result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
  });

  test('confidence tracks observed evidence: HIGH, MEDIUM, LOW, UNRESOLVED mappings', async () => {
    // HIGH: completed audit, 1-MINIMAL, at least two observed reproductions.
    const high = await runMinimizer(['a1', 'a2', 'a3', 'a4'], (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    expect(high.result.confidence).toBe('HIGH');
    expect(high.result.reproductionCount).toBeGreaterThanOrEqual(2);
    // MEDIUM: fresh reproduction with accepted reductions but unproven
    // minimality (mixed survivor-deletion evidence, no budget exhaustion).
    const medium = await runMinimizer(['a', 'b', 'c'],
      (ids) => outcome(ids.includes('a') && ids.includes('c')),
      {
        preconditionCheck: (candidate) => candidate.some((item) => item.actionId === 'a')
          ? { valid: true }
          : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
      });
    expect(medium.result.confidence).toBe('MEDIUM');
    // LOW: fresh reproduction held but the search ended on budget exhaustion.
    const low = await runMinimizer(['a1', 'a2', 'a3', 'a4', 'a5'], (ids) => outcome(ids.includes('a1') && ids.includes('a5')), {
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 1, maxTotalReplays: 2 },
    });
    expect(low.result.confidence).toBe('LOW');
    // UNRESOLVED: nothing reproduced, so no confidence may be claimed.
    const unresolved = await runMinimizer(['a1', 'a2'], () => outcome(false));
    expect(unresolved.result.confidence).toBe('UNRESOLVED');
  });

  test('nonzero-safety reduced outcomes stay INVALID evidence, distinct from pass, never proof', async () => {
    const { result } = await runMinimizer(['a1', 'a2'], (_ids, phase) =>
      outcome(phase !== 'REDUCED_CANDIDATE', FP, phase === 'REDUCED_CANDIDATE' ? { ...ZERO_SAFETY, productionAttempts: 1 } : ZERO_SAFETY));
    expect(result.status).toBe('UNCHANGED');
    expect(result.safetyRejectionCount).toBe(2);
    expect(result.minimalityGuarantee).not.toBe('1-MINIMAL');
    expect(result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    const reduced = result.candidateEvaluations.slice(1);
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced.every((item) => item.disposition === 'INVALID' && item.reason === 'SAFETY_VECTOR_NONZERO')).toBe(true);
    expect(reduced.every((item) => item.disposition !== 'DOES_NOT_REPRODUCE')).toBe(true);
  });

  test('invalid original reports unavailable preconditions with zero executor invocations', async () => {
    const { result, invocations } = await runMinimizer(['a1'], () => outcome(true), { approvedActionIds: new Set(['other']) });
    expect(invocations).toHaveLength(0);
    expect(result.status).toBe('INVALID_ORIGINAL');
    expect(result.reductionEvidenceClass).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
    expect(result.minimalityGuarantee).toBe('NONE');
    expect(result.confidence).toBe('UNRESOLVED');
  });

  test('determinism: three repeat runs produce deep-equal results on both the fixed and the hardened fixtures', async () => {
    const genuine = () => runMinimizer(['a1', 'a2', 'a3', 'a4'], (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    const mixed = () => runMinimizer(['a', 'b', 'c'],
      (ids) => outcome(ids.includes('a') && ids.includes('c')),
      {
        preconditionCheck: (candidate) => candidate.some((item) => item.actionId === 'a')
          ? { valid: true }
          : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
      });
    for (const scenario of [genuine, mixed]) {
      const first = JSON.stringify((await scenario()).result);
      const second = JSON.stringify((await scenario()).result);
      const third = JSON.stringify((await scenario()).result);
      expect(second).toBe(first);
      expect(third).toBe(first);
    }
    const anchor = await genuine();
    expect(anchor.result.reductionEvidenceClass).toBe('MINIMALITY_PROVEN');
    const hardenedAnchor = await mixed();
    expect(hardenedAnchor.result.reductionEvidenceClass).toBe('MINIMALITY_NOT_PROVEN');
  });
});
