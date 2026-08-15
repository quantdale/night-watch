// ---------------------------------------------------------------------------
// Nightwatch — pure metamorphic adoption-effect proof.
//
// Extracted from the Phase 8B sandbox executor so Phase 8B.1 canonical
// verification can prove the SAME four metamorphic invariants against the
// modified canonical checkout without duplicating the proof logic. This
// module is pure: it builds fixed synthetic probe candidates from an adopted
// case's semantics and interprets caller-supplied evaluator result classes.
// It never touches a filesystem, Git, or a sandbox mirror.
// ---------------------------------------------------------------------------

import type { SelfDevAdoptedCase } from './adoptedCases';
import { deriveAdoptedCaseCoverage } from './adoptedCases';
import { SELFDEV_ACTIONS, resolveSelfDevAction, resolveSelfDevFixture, SELFDEV_ASSERTIONS } from './registry';
import {
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_TARGET_SURFACE,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevCandidate,
  type SelfDevSafetyVector,
} from './types';
import { candidateIdFor } from './validation';

export type SelfDevMetamorphicProbeResult = 'PASS' | 'FAIL' | 'NOT_RUN';

export interface SelfDevMetamorphicProbeResults {
  readonly postEquivalentResult: SelfDevMetamorphicProbeResult;
  readonly postVariantCoverageResult: SelfDevMetamorphicProbeResult;
  readonly nonOverreachResult: SelfDevMetamorphicProbeResult;
  readonly unsafeRegressionResult: SelfDevMetamorphicProbeResult;
}

export interface SelfDevMetamorphicEvaluatorLike {
  evaluateCandidate(value: unknown): { readonly resultClass: string };
}

function buildCandidate(params: {
  readonly fixtureId: string;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly baseNightwatchSha: string;
  readonly title: string;
  readonly safety?: SelfDevSafetyVector;
}): SelfDevCandidate {
  const draft = {
    schemaVersion: SELFDEV_CANDIDATE_SCHEMA_VERSION,
    candidateKind: SELFDEV_CANDIDATE_KIND,
    generatorClass: SELFDEV_PROPOSER_CLASS,
    baseNightwatchSha: params.baseNightwatchSha,
    fixtureId: params.fixtureId,
    targetSurface: SELFDEV_TARGET_SURFACE,
    title: params.title,
    rationaleClass: 'STATE_TRANSITION' as const,
    actionIds: params.actionIds,
    assertionIds: params.assertionIds,
    coverageClaims: [] as readonly string[],
    sourceRefs: [] as readonly string[],
    safety: params.safety ?? { ...ZERO_SELFDEV_SAFETY_VECTOR },
    publication: SELFDEV_PUBLICATION,
    adoptionAuthority: 'NONE' as const,
  };
  return { ...draft, candidateId: candidateIdFor(draft) };
}

function simulateOutcome(fixtureId: string, actionIds: readonly string[]): { readonly finalStateId: string; readonly transitionClass: string } {
  const fixture = resolveSelfDevFixture(fixtureId);
  let currentState = fixture.initialStateId;
  let transitionClass = '';
  for (const actionId of actionIds) {
    const action = resolveSelfDevAction(actionId);
    if (action.fromStateId !== currentState) throw new Error('SELFDEV_METAMORPHIC_PROBE_SEQUENCE_INVALID');
    currentState = action.toStateId;
    transitionClass = action.transitionClass;
  }
  return { finalStateId: currentState, transitionClass };
}

/** Every assertion in the fixed registry that would validate true for this outcome. */
function validAssertionsForOutcome(finalStateId: string, transitionClass: string): readonly string[] {
  const result: string[] = [];
  for (const assertion of SELFDEV_ASSERTIONS) {
    if (assertion.assertionClass === 'EXPECTED_STATE_ID') {
      if (assertion.expectedValue === finalStateId) result.push(assertion.assertionId);
    } else if (assertion.assertionClass === 'EXPECTED_TRANSITION_CLASS') {
      if (assertion.expectedValue === transitionClass) result.push(assertion.assertionId);
    } else {
      // EXPECTED_ORACLE_CLASS / EXPECTED_STABLE_FINGERPRINT / EXPECTED_SAFETY_VECTOR
      // are true for every successful read-only execution in this registry.
      result.push(assertion.assertionId);
    }
  }
  return result;
}

function arraysEqualSorted(a: readonly string[], b: readonly string[]): boolean {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Finds one additional registered action that, appended, adds coverage not already in the adopted case. Null if the fixed registry has none. */
function findNonOverreachActionIds(adoptedFixtureId: string, adoptedActionIds: readonly string[], adoptedCoverageClasses: readonly string[]): readonly string[] | null {
  const outcome = simulateOutcome(adoptedFixtureId, adoptedActionIds);
  for (const action of SELFDEV_ACTIONS) {
    if (adoptedActionIds.includes(action.actionId)) continue;
    if (action.fromStateId !== outcome.finalStateId) continue;
    const candidateSequence = [...adoptedActionIds, action.actionId];
    const coverage = deriveAdoptedCaseCoverage(candidateSequence);
    if (coverage.some((coverageClass) => !adoptedCoverageClasses.includes(coverageClass))) return candidateSequence;
  }
  return null;
}

/**
 * Proves the four metamorphic invariants for one adopted case's semantics
 * against a caller-supplied evaluator factory (a sandbox-loaded evaluator
 * class, or a freshly loaded canonical evaluator class — this function does
 * not care which, and never loads a module itself):
 *
 * 1. the same regression semantics under a different valid base SHA become
 *    `REJECTED_DUPLICATE` (postEquivalentResult);
 * 2. a same-coverage assertion variant remains non-new (postVariantCoverageResult);
 * 3. one genuinely new coverage edge still passes (nonOverreachResult);
 * 4. an unsafe candidate remains rejected (unsafeRegressionResult).
 */
export function runMetamorphicProbes(
  freshEvaluator: () => SelfDevMetamorphicEvaluatorLike,
  adoptedCase: SelfDevAdoptedCase,
): SelfDevMetamorphicProbeResults {
  const futureBaseCandidate = buildCandidate({
    fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: adoptedCase.assertionIds,
    baseNightwatchSha: '1'.repeat(40), title: 'Metamorphic future base probe',
  });
  const equivalentEvaluation = freshEvaluator().evaluateCandidate(futureBaseCandidate);
  const postEquivalentResult: SelfDevMetamorphicProbeResult = equivalentEvaluation.resultClass === 'REJECTED_DUPLICATE' ? 'PASS' : 'FAIL';

  const outcome = simulateOutcome(adoptedCase.fixtureId, adoptedCase.actionIds);
  const genericAssertions = validAssertionsForOutcome(outcome.finalStateId, outcome.transitionClass);
  const variantAssertions = arraysEqualSorted(genericAssertions, adoptedCase.assertionIds)
    ? genericAssertions.filter((assertionId) => !adoptedCase.assertionIds.includes(assertionId))
    : genericAssertions;
  let postVariantCoverageResult: SelfDevMetamorphicProbeResult = 'NOT_RUN';
  if (variantAssertions.length > 0) {
    const variantCandidate = buildCandidate({
      fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: variantAssertions,
      baseNightwatchSha: '0'.repeat(40), title: 'Metamorphic assertion variant probe',
    });
    const variantEvaluation = freshEvaluator().evaluateCandidate(variantCandidate);
    postVariantCoverageResult = variantEvaluation.resultClass === 'REJECTED_DUPLICATE' ? 'PASS' : 'FAIL';
  }

  const nonOverreachActionIds = findNonOverreachActionIds(adoptedCase.fixtureId, adoptedCase.actionIds, adoptedCase.coverageClasses);
  let nonOverreachResult: SelfDevMetamorphicProbeResult = 'NOT_RUN';
  if (nonOverreachActionIds !== null) {
    const nonOverreachOutcome = simulateOutcome(adoptedCase.fixtureId, nonOverreachActionIds);
    const nonOverreachAssertions = validAssertionsForOutcome(nonOverreachOutcome.finalStateId, nonOverreachOutcome.transitionClass);
    const nonOverreachCandidate = buildCandidate({
      fixtureId: adoptedCase.fixtureId, actionIds: nonOverreachActionIds, assertionIds: nonOverreachAssertions,
      baseNightwatchSha: '0'.repeat(40), title: 'Metamorphic non overreach probe',
    });
    const nonOverreachEvaluation = freshEvaluator().evaluateCandidate(nonOverreachCandidate);
    nonOverreachResult = nonOverreachEvaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED' ? 'PASS' : 'FAIL';
  }

  const unsafeCandidate = buildCandidate({
    fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: adoptedCase.assertionIds,
    baseNightwatchSha: '0'.repeat(40), title: 'Metamorphic unsafe probe',
    safety: { ...ZERO_SELFDEV_SAFETY_VECTOR, productMutations: 1 },
  });
  const unsafeEvaluation = freshEvaluator().evaluateCandidate(unsafeCandidate);
  const unsafeRegressionResult: SelfDevMetamorphicProbeResult = unsafeEvaluation.resultClass === 'REJECTED_SAFETY' ? 'PASS' : 'FAIL';

  return { postEquivalentResult, postVariantCoverageResult, nonOverreachResult, unsafeRegressionResult };
}
