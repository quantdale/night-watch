// ---------------------------------------------------------------------------
// Phase 15P A06 — replay plan V2 / real-adapter binding completion suite.
//
// Permanent focused coverage for the local/source replay architecture:
//   - occurrence-aware action identity (duplicate actions stay distinguishable
//     and are handled explicitly, never silently deduplicated or re-executed);
//   - validation-before-execution proof (executor call-count assertions for
//     every fail-closed path — structural no-false-certification);
//   - exact vs reduced replay separation in plan grammar, execution path, and
//     recorded evidence classes;
//   - exploration/API/journey kind distinctions preserved end to end;
//   - validated-plan-as-value separation (execution of an unvalidated plan is
//     unrepresentable at the executor boundary);
//   - determinism of plan identity.
//
// Synthetic executors only: no network, no browser, no real product API.
// All values are structural synthetic fixtures; no secrets or customer data.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  createTriageReplayPlanV2,
  validateTriageReplayPlanV2,
  parseTriageReplayPlanV2,
  isOrderPreservingSubsequence,
  isOrderPreservingOrdinalSubsequence,
  duplicateActionOccurrences,
  hasDuplicateActionIds,
  duplicateActionHandling,
  occurrenceIdentityToken,
  type TriageReplayPlanV2,
  type ReplayOccurrence,
  type ReplayCandidateKind,
  type ReplayPhase,
} from '../../src/core/triage/replayPlan';
import {
  validateReplayPlanV2,
  executeReplayPlanV2,
  executeValidatedReplayPlanV2,
  buildRetainedActionsV2,
  resolveRetainedOccurrenceIdentities,
  type V2Executor,
} from '../../src/core/triage/replayBinding';
import { normalizeExecutorOutcome } from '../../src/core/triage/executorNormalization';
import { promotionReplayEvidenceFromOutcome } from '../../src/core/triage/promotionResult';
import type { CandidateReplayOutcome, MinimizationAction } from '../../src/core/triage/types';
import type { SafetyVector } from '../../src/core/exploration/types';

// --- Synthetic structural fixtures ------------------------------------------

const FP = `fp:sha256:${'a'.repeat(24)}`;
const FP_OTHER = `fp:sha256:${'b'.repeat(24)}`;
const ROUTE = '/payer-exchange-rate-v2';
const CATALOG_VERSION = 'nightwatch.safe-actions.phase4.v1';
const CONTRACT_VERSION = 'nightwatch.journey.phase2c.v1';
const CONTRACT_DIGEST = `sha256:${'c'.repeat(64)}`;
const SOURCE_VERSION = 'synthetic.phase15p.replay.v1';

const AWS = 'p4.j1.vendor-local.aws';
const AZURE = 'p4.j1.vendor-local.azure';
const JOURNEY_ID = 'ripple-payer-exchange-read';
const JOURNEY_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;
const API_READ = 'ripple.payer-exchange.read';
const API_WRITE = 'ripple.payer-exchange.write';

const ZERO_SAFETY: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

function occs(ids: readonly string[]): ReplayOccurrence[] {
  return ids.map((id, index) => ({ ordinal: index, expectedActionId: id }));
}

interface PlanFields {
  candidateKind: ReplayCandidateKind;
  anomalyFingerprint: string;
  originalOccurrences: readonly ReplayOccurrence[];
  retainedOccurrenceOrdinals: readonly number[];
  phase: ReplayPhase;
  targetId: string;
}

function planFields(kind: ReplayCandidateKind, phase: ReplayPhase, originalIds: readonly string[], retained: readonly number[], targetId: string): PlanFields {
  return {
    candidateKind: kind,
    anomalyFingerprint: FP,
    originalOccurrences: occs(originalIds),
    retainedOccurrenceOrdinals: [...retained],
    phase,
    targetId,
  };
}

function explorationPlan(phase: ReplayPhase, originalIds: readonly string[], retained: readonly number[]): TriageReplayPlanV2 {
  return createTriageReplayPlanV2({
    ...planFields('EXPLORATION', phase, originalIds, retained, 'phase15p.exploration.target'),
    contractVersion: CONTRACT_VERSION,
    contractDigest: CONTRACT_DIGEST,
    catalogVersion: CATALOG_VERSION,
    sourceVersion: SOURCE_VERSION,
    routeClass: ROUTE,
  });
}

/** Raw (uncomputed-planId) plan literal for fail-closed-path matrices. */
function rawPlan(fields: PlanFields, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: TRIAGE_REPLAY_PLAN_V2_VERSION,
    planId: `rp2:sha256:${'0'.repeat(24)}`,
    ...fields,
    contractVersion: CONTRACT_VERSION,
    contractDigest: CONTRACT_DIGEST,
    catalogVersion: CATALOG_VERSION,
    sourceVersion: SOURCE_VERSION,
    routeClass: ROUTE,
    ...overrides,
  };
}

interface SpyCall {
  readonly plan: TriageReplayPlanV2;
  readonly retained: readonly MinimizationAction[];
}

function spyExecutor(outcomeFor?: (plan: TriageReplayPlanV2, retained: readonly MinimizationAction[]) => CandidateReplayOutcome): {
  executor: V2Executor;
  calls: SpyCall[];
} {
  const calls: SpyCall[] = [];
  const executor: V2Executor = (plan, retained) => {
    calls.push({ plan, retained });
    if (outcomeFor) return outcomeFor(plan, retained);
    return { status: 'FAILURE', anomalyFingerprint: plan.anomalyFingerprint, safety: ZERO_SAFETY };
  };
  return { executor, calls };
}

async function expectInvalidBeforeExecutor(
  plan: TriageReplayPlanV2,
  expectedReason: string | RegExp,
): Promise<void> {
  const { executor, calls } = spyExecutor();
  const outcome = await executeReplayPlanV2(plan, executor);
  expect(outcome.status).toBe('INVALID');
  expect(calls).toHaveLength(0);
  expect(String(outcome.invalidReason)).toMatch(expectedReason);
}

// ---------------------------------------------------------------------------

test.describe('Phase 15P A06 — occurrence-aware action identity', () => {
  test('two structurally identical actions at different occurrences are distinguishable plan identities', async () => {
    const originals = [AWS, AZURE, AWS];
    const planFirst = explorationPlan('REDUCED_CANDIDATE', originals, [0]);
    const planSecond = explorationPlan('REDUCED_CANDIDATE', originals, [2]);
    expect(validateReplayPlanV2(planFirst).valid).toBe(true);
    expect(validateReplayPlanV2(planSecond).valid).toBe(true);
    // Same retained actionId string, different occurrence => different plan identity.
    expect(planFirst.planId).not.toBe(planSecond.planId);

    const first = spyExecutor();
    const firstOutcome = await executeReplayPlanV2(planFirst, first.executor);
    const second = spyExecutor();
    const secondOutcome = await executeReplayPlanV2(planSecond, second.executor);
    expect(firstOutcome.status).toBe('FAILURE');
    expect(secondOutcome.status).toBe('FAILURE');
    expect(first.calls).toHaveLength(1);
    expect(second.calls).toHaveLength(1);
    expect(first.calls[0]!.retained.map((a) => a.actionId)).toEqual([AWS]);
    expect(second.calls[0]!.retained.map((a) => a.actionId)).toEqual([AWS]);

    // Occurrence-resolved identities distinguish the two executions.
    const identitiesFirst = resolveRetainedOccurrenceIdentities(planFirst);
    const identitiesSecond = resolveRetainedOccurrenceIdentities(planSecond);
    expect(identitiesFirst[0]!.actionId).toBe(AWS);
    expect(identitiesSecond[0]!.actionId).toBe(AWS);
    expect(identitiesFirst[0]!.identityToken).not.toBe(identitiesSecond[0]!.identityToken);
    expect(identitiesFirst[0]!.identityToken).toBe(occurrenceIdentityToken(AWS, 0));
    expect(identitiesSecond[0]!.identityToken).toBe(occurrenceIdentityToken(AWS, 2));
  });

  test('occurrenceIdentityToken distinguishes duplicates, is deterministic, and fails closed on malformed input', () => {
    expect(occurrenceIdentityToken(AWS, 0)).toBe(`${AWS}#occ:0`);
    expect(occurrenceIdentityToken(AWS, 0)).toBe(occurrenceIdentityToken(AWS, 0));
    expect(occurrenceIdentityToken(AWS, 0)).not.toBe(occurrenceIdentityToken(AWS, 2));
    expect(occurrenceIdentityToken(AZURE, 0)).not.toBe(occurrenceIdentityToken(AWS, 0));
    expect(() => occurrenceIdentityToken('invalid id with spaces', 0)).toThrow(/OCCURRENCE_IDENTITY_TOKEN_ACTION_ID_INVALID/);
    expect(() => occurrenceIdentityToken('CUSTOMER_SENTINEL', 0)).toThrow(/OCCURRENCE_IDENTITY_TOKEN_ACTION_ID_INVALID/);
    expect(() => occurrenceIdentityToken(AWS, -1)).toThrow(/OCCURRENCE_IDENTITY_TOKEN_ORDINAL_INVALID/);
    expect(() => occurrenceIdentityToken(AWS, 1.5)).toThrow(/OCCURRENCE_IDENTITY_TOKEN_ORDINAL_INVALID/);
    expect(() => occurrenceIdentityToken(AWS, Number.NaN)).toThrow(/OCCURRENCE_IDENTITY_TOKEN_ORDINAL_INVALID/);
  });

  test('reordered, duplicated-retained, and duplicated-original ordinals are rejected before any executor call', async () => {
    const originals = [AWS, AZURE, AWS];
    // Reordered retained ordinals.
    await expectInvalidBeforeExecutor(
      rawPlan(planFields('EXPLORATION', 'REDUCED_CANDIDATE', originals, [2, 0], 'phase15p.exploration.target')) as never,
      /REPLAY_PLAN_V2_NOT_SUBSEQUENCE/,
    );
    // The same retained ordinal twice.
    await expectInvalidBeforeExecutor(
      rawPlan(planFields('EXPLORATION', 'REDUCED_CANDIDATE', originals, [0, 0], 'phase15p.exploration.target')) as never,
      /REPLAY_PLAN_V2_NOT_SUBSEQUENCE/,
    );
    // Duplicate ordinal among the originals themselves.
    const dupOriginal = validateTriageReplayPlanV2(rawPlan({
      ...planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1, 2], 'phase15p.exploration.target'),
      originalOccurrences: [
        { ordinal: 0, expectedActionId: AWS },
        { ordinal: 0, expectedActionId: AZURE },
      ],
      retainedOccurrenceOrdinals: [0],
    }));
    expect(dupOriginal.valid).toBe(false);
    if (!dupOriginal.valid) expect(dupOriginal.reason).toMatch(/occurrence_ordinal_DUPLICATE/);
  });

  test('subsequence semantics respect occurrence order for duplicate action IDs (v1 and v2)', () => {
    // v1 action-ID subsequences: greedy first-match occurrence order.
    expect(isOrderPreservingSubsequence(['a', 'b', 'a'], ['a', 'a'])).toBe(true);
    expect(isOrderPreservingSubsequence(['a', 'b', 'a'], ['a'])).toBe(true);
    expect(isOrderPreservingSubsequence(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(isOrderPreservingSubsequence(['a', 'b', 'a'], ['a', 'a', 'a'])).toBe(false);
    // v2 occurrence ordinals: retaining the SECOND occurrence of a duplicated
    // action is a legal, distinct selection.
    const occurrences = occs([AWS, AZURE, AWS]);
    expect(isOrderPreservingOrdinalSubsequence(occurrences, [2])).toBe(true);
    expect(isOrderPreservingOrdinalSubsequence(occurrences, [0, 2])).toBe(true);
    expect(isOrderPreservingOrdinalSubsequence(occurrences, [2, 0])).toBe(false);
  });
});

test.describe('Phase 15P A06 — explicit duplicate-action handling', () => {
  test('duplicate-action detection classifies plans explicitly', () => {
    const duplicated = occs([AWS, AZURE, AWS]);
    const unique = occs([AWS, AZURE]);
    const dups = duplicateActionOccurrences(duplicated);
    expect(dups.size).toBe(1);
    expect([...dups.get(AWS)!]).toEqual([0, 2]);
    expect(hasDuplicateActionIds(duplicated)).toBe(true);
    expect(duplicateActionHandling(duplicated)).toBe('OCCURRENCE_DISTINGUISHED');
    expect(duplicateActionOccurrences(unique).size).toBe(0);
    expect(hasDuplicateActionIds(unique)).toBe(false);
    expect(duplicateActionHandling(unique)).toBe('UNAMBIGUOUS_SINGLE_OCCURRENCE');
  });

  test('retained duplicate occurrences are never silently deduplicated', async () => {
    const originals = [AWS, AZURE, AWS];
    const plan = explorationPlan('FRESH_EXACT_REPLAY', originals, [0, 1, 2]);
    expect(validateReplayPlanV2(plan).valid).toBe(true);
    const retained = buildRetainedActionsV2(plan);
    expect(retained).toHaveLength(3);
    expect(retained.map((a) => a.actionId)).toEqual([AWS, AZURE, AWS]);

    const { executor, calls } = spyExecutor();
    const outcome = await executeReplayPlanV2(plan, executor);
    expect(outcome.status).toBe('FAILURE');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.retained).toHaveLength(3);

    const identities = resolveRetainedOccurrenceIdentities(plan);
    expect(identities.map((i) => i.identityToken)).toEqual([
      occurrenceIdentityToken(AWS, 0),
      occurrenceIdentityToken(AZURE, 1),
      occurrenceIdentityToken(AWS, 2),
    ]);
  });

  test('selecting one occurrence of a duplicated action executes exactly that occurrence', async () => {
    const originals = [AWS, AZURE, AWS];
    const plan = explorationPlan('REDUCED_CANDIDATE', originals, [2]);
    const { executor, calls } = spyExecutor();
    const outcome = await executeReplayPlanV2(plan, executor);
    expect(outcome.status).toBe('FAILURE');
    expect(calls).toHaveLength(1);
    // Exactly one execution of exactly the selected occurrence — neither a
    // silent dedup skip nor a silent re-execution of the other occurrence.
    expect(calls[0]!.retained.map((a) => a.actionId)).toEqual([AWS]);
    expect(resolveRetainedOccurrenceIdentities(plan)[0]!.ordinal).toBe(2);
  });
});

test.describe('Phase 15P A06 — validation happens before any executor callback', () => {
  const originals = [AWS, AZURE];

  const invalidCases: ReadonlyArray<{ readonly name: string; readonly plan: unknown; readonly reason: string | RegExp }> = [
    {
      name: 'unknown field',
      plan: { ...explorationPlan('FRESH_EXACT_REPLAY', originals, [0, 1]), injectedField: 'x' },
      reason: /REPLAY_PLAN_V2_UNKNOWN_FIELD:injectedField/,
    },
    {
      name: 'schema version drift',
      plan: rawPlan(planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1], 'phase15p.exploration.target'), {
        schemaVersion: TRIAGE_REPLAY_PLAN_VERSION,
      }),
      reason: /REPLAY_PLAN_V2_VERSION_MISMATCH/,
    },
    {
      name: 'invalid candidate kind',
      plan: rawPlan(planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1], 'phase15p.exploration.target'), { candidateKind: 'UNKNOWN' }),
      reason: /REPLAY_PLAN_V2_KIND_INVALID/,
    },
    {
      name: 'invalid phase',
      plan: rawPlan(planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1], 'phase15p.exploration.target'), { phase: 'SOMETHING_ELSE' }),
      reason: /REPLAY_PLAN_V2_PHASE_INVALID/,
    },
    {
      name: 'malformed anomaly fingerprint',
      plan: rawPlan(planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1], 'phase15p.exploration.target'), { anomalyFingerprint: 'not-a-fingerprint' }),
      reason: /anomalyFingerprint_PATTERN_INVALID/,
    },
    {
      name: 'sentinel value in expectedActionId',
      plan: rawPlan({
        ...planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0, 1], 'phase15p.exploration.target'),
        originalOccurrences: [
          { ordinal: 0, expectedActionId: 'CUSTOMER_SENTINEL' },
          { ordinal: 1, expectedActionId: AZURE },
        ],
      }),
      reason: /occurrence_EXPECTED_ACTION_ID_SENTINEL/,
    },
    {
      name: 'unknown retained ordinal',
      plan: rawPlan(planFields('EXPLORATION', 'REDUCED_CANDIDATE', originals, [99], 'phase15p.exploration.target')),
      reason: /REPLAY_PLAN_V2_UNKNOWN_ORDINAL/,
    },
    {
      name: 'fresh exact replay retaining a subset',
      plan: rawPlan(planFields('EXPLORATION', 'FRESH_EXACT_REPLAY', originals, [0], 'phase15p.exploration.target')),
      reason: /FRESH_EXACT_MUST_MATCH_ORIGINAL_OCCURRENCES/,
    },
    {
      name: 'multi-occurrence API original',
      plan: rawPlan(planFields('API', 'REDUCED_CANDIDATE', [API_READ, API_READ], [0, 1], API_READ)),
      reason: /API_V2_ORIGINAL_MUST_BE_SINGLE/,
    },
    // Structurally valid plans rejected by binding-level kind guards: built
    // through the real constructor so the asserted reason comes from the guard,
    // not from plan-ID recomputation.
    {
      name: 'journey reduced candidate',
      plan: createTriageReplayPlanV2({
        ...planFields('JOURNEY', 'REDUCED_CANDIDATE', [...JOURNEY_STEPS], [0], JOURNEY_ID),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      reason: /^PRECONDITION_DIVERGENCE$/,
    },
    {
      name: 'journey exact with unknown journey target',
      plan: createTriageReplayPlanV2({
        ...planFields('JOURNEY', 'FRESH_EXACT_REPLAY', [...JOURNEY_STEPS], [0, 1], 'phase15p.unknown-journey'),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      reason: /^ACTION_NOT_APPROVED$/,
    },
    {
      name: 'journey exact with non-consecutive steps',
      plan: createTriageReplayPlanV2({
        ...planFields('JOURNEY', 'FRESH_EXACT_REPLAY', [...JOURNEY_STEPS].reverse(), [0, 1], JOURNEY_ID),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      reason: /^PRECONDITION_DIVERGENCE$/,
    },
    {
      name: 'exploration action outside the approved catalog',
      plan: createTriageReplayPlanV2({
        ...planFields('EXPLORATION', 'REDUCED_CANDIDATE', ['p4.unknown.action'], [0], 'phase15p.exploration.target'),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      reason: /^ACTION_NOT_APPROVED$/,
    },
    {
      name: 'API operation that is not KNOWN_READ',
      plan: createTriageReplayPlanV2({
        ...planFields('API', 'REDUCED_CANDIDATE', [API_WRITE], [0], API_WRITE),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      reason: /^ACTION_NOT_APPROVED$/,
    },
  ];

  for (const testCase of invalidCases) {
    test(`fail closed before executor: ${testCase.name}`, async () => {
      await expectInvalidBeforeExecutor(testCase.plan as never, testCase.reason);
    });
  }

  test('tampering with a created plan invalidates it before any executor call', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', originals, [0]);
    const tampered = { ...plan, anomalyFingerprint: FP_OTHER };
    await expectInvalidBeforeExecutor(tampered, /REPLAY_PLAN_V2_ID_MISMATCH/);
  });

  test('positive control: a valid plan reaches the executor exactly once (sync and async)', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', originals, [0]);
    const syncSpy = spyExecutor();
    const syncOutcome = await executeReplayPlanV2(plan, syncSpy.executor);
    expect(syncOutcome.status).toBe('FAILURE');
    expect(syncSpy.calls).toHaveLength(1);

    let asyncCalls = 0;
    const asyncExecutor: V2Executor = async (innerPlan) => {
      asyncCalls += 1;
      return { status: 'FAILURE', anomalyFingerprint: innerPlan.anomalyFingerprint, safety: ZERO_SAFETY };
    };
    const asyncOutcome = await executeReplayPlanV2(plan, asyncExecutor);
    expect(asyncOutcome.status).toBe('FAILURE');
    expect(asyncCalls).toBe(1);
  });
});

test.describe('Phase 15P A06 — exact vs reduced replay separation', () => {
  test('phase participates in plan identity: identical content differs only by phase', () => {
    const originals = [AWS, AZURE];
    const exact = explorationPlan('FRESH_EXACT_REPLAY', originals, [0, 1]);
    const reduced = explorationPlan('REDUCED_CANDIDATE', originals, [0, 1]);
    expect(exact.phase).toBe('FRESH_EXACT_REPLAY');
    expect(reduced.phase).toBe('REDUCED_CANDIDATE');
    expect(exact.planId).not.toBe(reduced.planId);
    expect(validateReplayPlanV2(exact).valid).toBe(true);
    expect(validateReplayPlanV2(reduced).valid).toBe(true);
  });

  test('the executor observes exactly the phase it was authorized for', async () => {
    const originals = [AWS, AZURE];
    const observedPhases: ReplayPhase[] = [];
    const wrapped: V2Executor = (plan) => {
      observedPhases.push(plan.phase);
      return { status: 'PASS', safety: ZERO_SAFETY };
    };
    await executeReplayPlanV2(explorationPlan('FRESH_EXACT_REPLAY', originals, [0, 1]), wrapped);
    await executeReplayPlanV2(explorationPlan('REDUCED_CANDIDATE', originals, [0]), wrapped);
    expect(observedPhases).toEqual(['FRESH_EXACT_REPLAY', 'REDUCED_CANDIDATE']);
  });

  test('journey reduced replay classifies PRECONDITION_DIVERGENCE without execution even for a legal prefix', async () => {
    // Retaining only the navigation step would be a legitimate journey prefix,
    // yet reduced journey replay stays unsupported: classified before execution.
    await expectInvalidBeforeExecutor(
      createTriageReplayPlanV2({
        ...planFields('JOURNEY', 'REDUCED_CANDIDATE', [...JOURNEY_STEPS], [0], JOURNEY_ID),
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      }),
      /^PRECONDITION_DIVERGENCE$/,
    );
  });

  test('recorded evidence classes keep exact and reduced outcomes strictly separated', () => {
    expect(promotionReplayEvidenceFromOutcome('PASS', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_REPRODUCED');
    expect(promotionReplayEvidenceFromOutcome('FAILURE', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_NOT_REPRODUCED');
    expect(promotionReplayEvidenceFromOutcome('INVALID', 'FRESH_EXACT_REPLAY')).toBe('EXACT_REPLAY_INVALID');
    expect(promotionReplayEvidenceFromOutcome('PASS', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_SUPPORTED');
    expect(promotionReplayEvidenceFromOutcome('FAILURE', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_PRECONDITION_DIVERGENCE');
    expect(promotionReplayEvidenceFromOutcome('INVALID', 'REDUCED_CANDIDATE')).toBe('REDUCED_REPLAY_PRECONDITION_DIVERGENCE');
  });
});

test.describe('Phase 15P A06 — exploration/API/journey kind-distinction matrix', () => {
  const CASES: ReadonlyArray<{
    readonly name: string;
    readonly kind: ReplayCandidateKind;
    readonly phase: ReplayPhase;
    readonly originalIds: readonly string[];
    readonly retained: readonly number[];
    readonly targetId: string;
    readonly mode: 'EXECUTES' | 'BINDING_REJECTED' | 'UNCONSTRUCTIBLE';
    readonly expectedReason?: string | RegExp;
  }> = [
    { name: 'journey exact full sequence', kind: 'JOURNEY', phase: 'FRESH_EXACT_REPLAY', originalIds: [...JOURNEY_STEPS], retained: [0, 1], targetId: JOURNEY_ID, mode: 'EXECUTES' },
    { name: 'journey reduced subset', kind: 'JOURNEY', phase: 'REDUCED_CANDIDATE', originalIds: [...JOURNEY_STEPS], retained: [0], targetId: JOURNEY_ID, mode: 'BINDING_REJECTED', expectedReason: /^PRECONDITION_DIVERGENCE$/ },
    { name: 'exploration exact full sequence', kind: 'EXPLORATION', phase: 'FRESH_EXACT_REPLAY', originalIds: [AWS, AZURE], retained: [0, 1], targetId: 'phase15p.exploration.target', mode: 'EXECUTES' },
    { name: 'exploration reduced prefix', kind: 'EXPLORATION', phase: 'REDUCED_CANDIDATE', originalIds: [AWS, AZURE], retained: [0], targetId: 'phase15p.exploration.target', mode: 'EXECUTES' },
    { name: 'API exact single read operation', kind: 'API', phase: 'FRESH_EXACT_REPLAY', originalIds: [API_READ], retained: [0], targetId: API_READ, mode: 'EXECUTES' },
    { name: 'API reduced single read operation', kind: 'API', phase: 'REDUCED_CANDIDATE', originalIds: [API_READ], retained: [0], targetId: API_READ, mode: 'EXECUTES' },
    { name: 'API multi-occurrence original', kind: 'API', phase: 'REDUCED_CANDIDATE', originalIds: [API_READ, API_READ], retained: [0, 1], targetId: API_READ, mode: 'UNCONSTRUCTIBLE', expectedReason: /API_V2_ORIGINAL_MUST_BE_SINGLE/ },
  ];

  for (const testCase of CASES) {
    test(`matrix: ${testCase.name} -> ${testCase.mode}`, async () => {
      const fields = planFields(testCase.kind, testCase.phase, testCase.originalIds, testCase.retained, testCase.targetId);
      const extras = {
        contractVersion: CONTRACT_VERSION,
        contractDigest: CONTRACT_DIGEST,
        catalogVersion: CATALOG_VERSION,
        sourceVersion: SOURCE_VERSION,
        routeClass: ROUTE,
      };
      const { executor, calls } = spyExecutor();
      if (testCase.mode === 'UNCONSTRUCTIBLE') {
        // Multi-occurrence API plans cannot even be constructed (fail closed),
        // and the raw grammar rejects them before any executor exposure.
        expect(() => createTriageReplayPlanV2({ ...fields, ...extras })).toThrow(/REPLAY_PLAN_V2_CREATE_FAILED/);
        const raw = rawPlan(fields);
        expect(validateTriageReplayPlanV2(raw).valid).toBe(false);
        const outcome = await executeReplayPlanV2(raw as never, executor);
        expect(outcome.status).toBe('INVALID');
        expect(String(outcome.invalidReason)).toMatch(testCase.expectedReason!);
        expect(calls).toHaveLength(0);
        return;
      }
      // Journey-reduced plans are structurally constructible; the BINDING
      // rejects them before execution. Everything else here is admitted.
      const plan = createTriageReplayPlanV2({ ...fields, ...extras });
      const outcome = await executeReplayPlanV2(plan, executor);
      if (testCase.mode === 'EXECUTES') {
        expect(outcome.status).toBe('FAILURE');
        expect(calls).toHaveLength(1);
      } else {
        expect(outcome.status).toBe('INVALID');
        expect(String(outcome.invalidReason)).toMatch(testCase.expectedReason!);
        expect(calls).toHaveLength(0);
      }
    });
  }
});

test.describe('Phase 15P A06 — validation vs execution separation', () => {
  test('a validated plan is a distinct value, never an executed result', () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', [AWS, AZURE], [0]);
    const result = validateReplayPlanV2(plan);
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error('unreachable');
    // The validated value carries the plan, not an outcome: no reproduction
    // claim exists on it.
    expect('status' in result.plan).toBe(false);
    expect(result.plan).toEqual(plan);
    expect(result.plan.planId).toBe(plan.planId);
  });

  test('executeValidatedReplayPlanV2 runs the executor exactly once for the validated value', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', [AWS, AZURE], [0]);
    const validated = validateReplayPlanV2(plan);
    if (!validated.valid) throw new Error('expected valid plan');
    const { executor, calls } = spyExecutor();
    const outcome = await executeValidatedReplayPlanV2(validated.plan, executor);
    expect(outcome.status).toBe('FAILURE');
    expect(outcome.anomalyFingerprint).toBe(FP);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.plan.planId).toBe(plan.planId);
  });

  test('execution of an unvalidated plan is unrepresentable at the executor boundary', () => {
    const { executor, calls } = spyExecutor();
    // Compile-time proof: handing a plain (unbranded) TriageReplayPlanV2 to the
    // executor boundary is a type error. The offending call sits inside a
    // closure that is never invoked, so nothing executes at runtime either.
    const attempt = (plan: TriageReplayPlanV2): unknown =>
      // @ts-expect-error — a plain plan lacks the validated-plan brand.
      executeValidatedReplayPlanV2(plan, executor);
    expect(typeof attempt).toBe('function');
    expect(calls).toHaveLength(0);
  });

  test('plan creation and parsing are deterministic', () => {
    const fields = {
      ...planFields('EXPLORATION', 'REDUCED_CANDIDATE', [AWS, AZURE, AWS], [2], 'phase15p.exploration.target'),
      contractVersion: CONTRACT_VERSION,
      contractDigest: CONTRACT_DIGEST,
      catalogVersion: CATALOG_VERSION,
      sourceVersion: SOURCE_VERSION,
      routeClass: ROUTE,
    };
    const first = createTriageReplayPlanV2(fields);
    const second = createTriageReplayPlanV2(fields);
    expect(second).toEqual(first);
    expect(second.planId).toBe(first.planId);
    // Round-trip through JSON preserves identity.
    const parsed = parseTriageReplayPlanV2(JSON.parse(JSON.stringify(first)));
    expect(parsed).toEqual(first);
    // Canonical payload ordering: key insertion order never changes the ID.
    const reordered: Record<string, unknown> = {};
    for (const key of Object.keys(first).reverse()) reordered[key] = (first as unknown as Record<string, unknown>)[key];
    expect(validateTriageReplayPlanV2(reordered).valid).toBe(true);
  });
});

test.describe('Phase 15P A06 — executor outcome normalization interplay', () => {
  test('matching-fingerprint FAILURE is preserved; different-fingerprint FAILURE is never observable as the target', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', [AWS], [0]);
    const matching = spyExecutor((innerPlan) => ({ status: 'FAILURE', anomalyFingerprint: innerPlan.anomalyFingerprint, safety: ZERO_SAFETY }));
    const matchingOutcome = await executeReplayPlanV2(plan, matching.executor);
    expect(matchingOutcome.status).toBe('FAILURE');
    expect(matchingOutcome.anomalyFingerprint).toBe(FP);

    const differing = spyExecutor(() => ({ status: 'FAILURE', anomalyFingerprint: FP_OTHER, safety: ZERO_SAFETY }));
    const differingOutcome = await executeReplayPlanV2(plan, differing.executor);
    expect(differingOutcome.status).toBe('PASS');
    expect(differingOutcome.anomalyFingerprint).toBeUndefined();

    // Unit-level rule pinned at the shared normalization seam.
    expect(normalizeExecutorOutcome({ status: 'FAILURE', anomalyFingerprint: FP_OTHER, safety: ZERO_SAFETY }, FP).status).toBe('PASS');
    expect(normalizeExecutorOutcome({ status: 'FAILURE', anomalyFingerprint: FP, safety: ZERO_SAFETY }, FP).status).toBe('FAILURE');
    expect(normalizeExecutorOutcome({ status: 'PASS', safety: ZERO_SAFETY }, FP).status).toBe('PASS');
  });

  test('nonzero safety on a matching FAILURE is preserved (only fingerprint mismatch normalizes)', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', [AWS], [0]);
    const unsafe: SafetyVector = { ...ZERO_SAFETY, proxyViolations: 1 };
    const { executor } = spyExecutor((innerPlan) => ({ status: 'FAILURE', anomalyFingerprint: innerPlan.anomalyFingerprint, safety: unsafe }));
    const outcome = await executeReplayPlanV2(plan, executor);
    expect(outcome.status).toBe('FAILURE');
    expect(outcome.safety.proxyViolations).toBe(1);
  });

  test('executor throw and async rejection fail closed to INVALID', async () => {
    const plan = explorationPlan('REDUCED_CANDIDATE', [AWS], [0]);
    const throwing: V2Executor = () => {
      throw new Error('SYNTHETIC_EXECUTOR_THROW');
    };
    const thrownOutcome = await executeReplayPlanV2(plan, throwing);
    expect(thrownOutcome.status).toBe('INVALID');

    const rejecting: V2Executor = async () => {
      throw new Error('SYNTHETIC_EXECUTOR_REJECT');
    };
    const rejectedOutcome = await executeReplayPlanV2(plan, rejecting);
    expect(rejectedOutcome.status).toBe('INVALID');
  });
});
