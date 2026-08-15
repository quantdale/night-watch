// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — sandbox-confined adoption execution + metamorphic
// verification.
//
// Runs entirely against a disposable private source mirror. Loads and
// executes the MODIFIED sandbox evaluator (not a canonical simulation) to
// prove: the same regression semantics under a different valid base SHA
// become duplicate; a same-coverage assertion variant remains non-new; a
// genuinely different coverage edge still passes; an unsafe candidate
// remains rejected. Canonical source is never written.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { sha256Hex } from '../selfDev/canonical';
import {
  SELFDEV_ADOPTED_CASES,
  deriveAdoptedCaseCoverage,
  renderAdoptedCatalogSource,
  type SelfDevAdoptedCase,
} from '../selfDev/adoptedCases';
import { SELFDEV_ACTIONS, resolveSelfDevAction, resolveSelfDevFixture, SELFDEV_ASSERTIONS } from '../selfDev/registry';
import {
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_TARGET_SURFACE,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevCandidate,
  type SelfDevSafetyVector,
} from '../selfDev/types';
import { candidateIdFor } from '../selfDev/validation';
import { SelfDevPrivateArtifactStore } from '../selfDev/storage';
import type { CurrentSelfDevSourceView } from '../selfDev/trust';
import { revalidatePlan, SelfDevSandboxPlannerError } from './planner';
import {
  cleanupSandboxMirror,
  createSandboxMirror,
  diffSandboxAgainstCanonical,
  sandboxSourceBundleDigest,
  writeSandboxTarget,
  type SelfDevSandboxMirror,
} from './sandboxMirror';
import { loadSandboxModules } from './sandboxLoader';
import { resultIdFor, validateAdoptionSandboxResult } from './validation';
import {
  SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION,
  type SelfDevAdoptionPlan,
  type SelfDevAdoptionSandboxResult,
  type SelfDevSandboxFailureClass,
  type SelfDevSandboxProbeResult,
} from './types';

interface SandboxEvaluatorCtor {
  new (options?: { readonly seedEquivalentFingerprints?: readonly string[]; readonly seedCoverageClasses?: readonly string[] }): {
    evaluateCandidate(value: unknown): { readonly resultClass: string };
  };
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
    if (action.fromStateId !== currentState) throw new Error('SELFDEV_SANDBOX_PROBE_SEQUENCE_INVALID');
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

interface MetamorphicProbeResults {
  readonly postEquivalentResult: SelfDevSandboxProbeResult;
  readonly postVariantCoverageResult: SelfDevSandboxProbeResult;
  readonly nonOverreachResult: SelfDevSandboxProbeResult;
  readonly unsafeRegressionResult: SelfDevSandboxProbeResult;
}

function runMetamorphicProbes(EvaluatorCtor: SandboxEvaluatorCtor, seedFingerprints: readonly string[], seedCoverage: readonly string[], adoptedCase: SelfDevAdoptedCase): MetamorphicProbeResults {
  const freshEvaluator = () => new EvaluatorCtor({ seedEquivalentFingerprints: seedFingerprints, seedCoverageClasses: seedCoverage });

  const futureBaseCandidate = buildCandidate({
    fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: adoptedCase.assertionIds,
    baseNightwatchSha: '1'.repeat(40), title: 'Sandbox metamorphic future base probe',
  });
  const equivalentEvaluation = freshEvaluator().evaluateCandidate(futureBaseCandidate);
  const postEquivalentResult: SelfDevSandboxProbeResult = equivalentEvaluation.resultClass === 'REJECTED_DUPLICATE' ? 'PASS' : 'FAIL';

  const outcome = simulateOutcome(adoptedCase.fixtureId, adoptedCase.actionIds);
  const genericAssertions = validAssertionsForOutcome(outcome.finalStateId, outcome.transitionClass);
  const variantAssertions = arraysEqualSorted(genericAssertions, adoptedCase.assertionIds)
    ? genericAssertions.filter((assertionId) => !adoptedCase.assertionIds.includes(assertionId))
    : genericAssertions;
  let postVariantCoverageResult: SelfDevSandboxProbeResult = 'NOT_RUN';
  if (variantAssertions.length > 0) {
    const variantCandidate = buildCandidate({
      fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: variantAssertions,
      baseNightwatchSha: '0'.repeat(40), title: 'Sandbox metamorphic assertion variant probe',
    });
    const variantEvaluation = freshEvaluator().evaluateCandidate(variantCandidate);
    postVariantCoverageResult = variantEvaluation.resultClass === 'REJECTED_DUPLICATE' ? 'PASS' : 'FAIL';
  }

  const nonOverreachActionIds = findNonOverreachActionIds(adoptedCase.fixtureId, adoptedCase.actionIds, adoptedCase.coverageClasses);
  let nonOverreachResult: SelfDevSandboxProbeResult = 'NOT_RUN';
  if (nonOverreachActionIds !== null) {
    const nonOverreachOutcome = simulateOutcome(adoptedCase.fixtureId, nonOverreachActionIds);
    const nonOverreachAssertions = validAssertionsForOutcome(nonOverreachOutcome.finalStateId, nonOverreachOutcome.transitionClass);
    const nonOverreachCandidate = buildCandidate({
      fixtureId: adoptedCase.fixtureId, actionIds: nonOverreachActionIds, assertionIds: nonOverreachAssertions,
      baseNightwatchSha: '0'.repeat(40), title: 'Sandbox metamorphic non overreach probe',
    });
    const nonOverreachEvaluation = freshEvaluator().evaluateCandidate(nonOverreachCandidate);
    nonOverreachResult = nonOverreachEvaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED' ? 'PASS' : 'FAIL';
  }

  const unsafeCandidate = buildCandidate({
    fixtureId: adoptedCase.fixtureId, actionIds: adoptedCase.actionIds, assertionIds: adoptedCase.assertionIds,
    baseNightwatchSha: '0'.repeat(40), title: 'Sandbox metamorphic unsafe probe',
    safety: { ...ZERO_SELFDEV_SAFETY_VECTOR, productMutations: 1 },
  });
  const unsafeEvaluation = freshEvaluator().evaluateCandidate(unsafeCandidate);
  const unsafeRegressionResult: SelfDevSandboxProbeResult = unsafeEvaluation.resultClass === 'REJECTED_SAFETY' ? 'PASS' : 'FAIL';

  return { postEquivalentResult, postVariantCoverageResult, nonOverreachResult, unsafeRegressionResult };
}

export interface RunSandboxAdoptionInput {
  readonly plan: SelfDevAdoptionPlan;
  readonly repositoryRoot: string;
  readonly nodeModulesAnchorPath: string;
  readonly current: CurrentSelfDevSourceView;
  readonly artifactStore?: SelfDevPrivateArtifactStore;
}

export function runSandboxAdoption(input: RunSandboxAdoptionInput): SelfDevAdoptionSandboxResult {
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_SANDBOX_ADOPTION');
  const { plan, repositoryRoot, nodeModulesAnchorPath, current, artifactStore } = input;

  // Truthful sandbox write accounting (Phase 8B.0.1): tracks the ACTUAL
  // executed effect — 0 before the single allowed target write has completed,
  // 1 immediately after it succeeds. Every result (success or failure) carries
  // the actual value; it is never inferred from the final success state.
  let sandboxSourceWrites = 0;
  const failure = (failureClass: SelfDevSandboxFailureClass, cleanupStatus: 'PASS' | 'FAIL'): SelfDevAdoptionSandboxResult => {
    const draft = {
      schemaVersion: SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION,
      planId: plan.planId,
      strategyClass: plan.strategyClass,
      sourceSessionArtifactId: plan.sourceSessionArtifactId,
      candidateId: plan.candidateId,
      candidateDigest: plan.candidateDigest,
      preSourceBundleDigest: null,
      postSourceBundleDigest: null,
      preContractDigest: null,
      postContractDigest: null,
      changedFiles: [] as readonly string[],
      targetPath: plan.targetPath,
      targetPreimageDigest: null,
      targetPostimageDigest: null,
      preAdoptionResult: 'NOT_RUN' as const,
      postEquivalentResult: 'NOT_RUN' as const,
      postVariantCoverageResult: 'NOT_RUN' as const,
      nonOverreachResult: 'NOT_RUN' as const,
      unsafeRegressionResult: 'NOT_RUN' as const,
      sandboxVerificationStatus: 'FAIL' as const,
      failureClass,
      cleanupStatus,
      sandboxSourceWrites,
      canonicalSourceWrites: 0 as const,
      runtimeGitWrites: 0 as const,
      externalCalls: 0 as const,
      adoptionStatus: 'SANDBOX_ADOPTION_FAILED' as const,
      canonicalApply: 'PROHIBITED' as const,
      publication: 'PROHIBITED' as const,
    };
    return validateAdoptionSandboxResult({ ...draft, resultId: resultIdFor(draft) });
  };

  try {
    revalidatePlan(plan, current, repositoryRoot, artifactStore);
  } catch (error) {
    const code = error instanceof SelfDevSandboxPlannerError ? error.code : 'PLAN_STALE';
    return failure(code === 'ALREADY_ADOPTED' ? 'ALREADY_ADOPTED' : 'PLAN_STALE', 'PASS');
  }

  let mirror: SelfDevSandboxMirror | null = null;
  try {
    mirror = createSandboxMirror(repositoryRoot);
    const preDigest = sandboxSourceBundleDigest(mirror);
    if (preDigest !== plan.sourceBundleDigestBefore) return failure('SANDBOX_COPY_MISMATCH', cleanupSandboxMirror(mirror));

    const postimageBytes = renderAdoptedCatalogSource([...SELFDEV_ADOPTED_CASES, plan.adoptedCase]);
    const postimageDigest = `sha256:${sha256Hex(postimageBytes)}`;
    if (postimageDigest !== plan.targetPostimageDigest) return failure('POSTIMAGE_DIGEST_MISMATCH', cleanupSandboxMirror(mirror));

    try {
      writeSandboxTarget(mirror, plan.targetPath, postimageBytes);
      sandboxSourceWrites = 1;
    } catch {
      return failure('SANDBOX_WRITE_FAILED', cleanupSandboxMirror(mirror));
    }

    const changedFiles = diffSandboxAgainstCanonical(repositoryRoot, mirror);
    if (changedFiles.length !== 1 || changedFiles[0] !== plan.targetPath) return failure('UNEXPECTED_CHANGED_FILE', cleanupSandboxMirror(mirror));

    const actualTargetBytes = fs.readFileSync(path.join(mirror.root, plan.targetPath), 'utf8');
    if (`sha256:${sha256Hex(actualTargetBytes)}` !== plan.targetPostimageDigest) return failure('POSTIMAGE_DIGEST_MISMATCH', cleanupSandboxMirror(mirror));

    const postSourceBundleDigest = sandboxSourceBundleDigest(mirror);
    if (postSourceBundleDigest === plan.sourceBundleDigestBefore) return failure('SANDBOX_WRITE_FAILED', cleanupSandboxMirror(mirror));

    let modules: readonly unknown[];
    try {
      modules = loadSandboxModules([
        path.join(mirror.root, 'src/core/selfDev/contract.ts'),
        path.join(mirror.root, 'src/core/selfDev/evaluator.ts'),
        path.join(mirror.root, 'src/core/selfDev/adoptedCases.ts'),
      ], mirror.root, nodeModulesAnchorPath);
    } catch {
      return failure('SANDBOX_MODULE_LOAD_FAILED', cleanupSandboxMirror(mirror));
    }
    const [contractModule, evaluatorModule, adoptedCasesModule] = modules as [
      { selfDevContractDigest(): string },
      { SelfDevEvaluator: SandboxEvaluatorCtor },
      { selfDevAdoptedEquivalentFingerprints(): readonly string[]; selfDevAdoptedCoverageClasses(): readonly string[] },
    ];

    const postContractDigest = contractModule.selfDevContractDigest();
    if (postContractDigest === plan.contractDigestBefore) return failure('SANDBOX_CONTRACT_NOT_CHANGED', cleanupSandboxMirror(mirror));

    const probes = runMetamorphicProbes(
      evaluatorModule.SelfDevEvaluator,
      adoptedCasesModule.selfDevAdoptedEquivalentFingerprints(),
      adoptedCasesModule.selfDevAdoptedCoverageClasses(),
      plan.adoptedCase,
    );

    const cleanupStatus = cleanupSandboxMirror(mirror);
    mirror = null;

    // A verified result requires every metamorphic proof to have run AND
    // passed (Phase 8B.0.1): NOT_RUN is never an acceptable verified state.
    if (probes.postEquivalentResult !== 'PASS' || probes.postVariantCoverageResult !== 'PASS') return failure('POST_ADOPTION_STILL_PASS', cleanupStatus);
    if (probes.nonOverreachResult === 'NOT_RUN') return failure('NON_OVERREACH_PROBE_UNAVAILABLE', cleanupStatus);
    if (probes.nonOverreachResult === 'FAIL') return failure('NON_OVERREACH_REGRESSION', cleanupStatus);
    if (probes.unsafeRegressionResult !== 'PASS') return failure('POST_ADOPTION_STILL_PASS', cleanupStatus);
    if (cleanupStatus !== 'PASS') return failure('CLEANUP_FAILED', cleanupStatus);

    const draft = {
      schemaVersion: SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION,
      planId: plan.planId,
      strategyClass: plan.strategyClass,
      sourceSessionArtifactId: plan.sourceSessionArtifactId,
      candidateId: plan.candidateId,
      candidateDigest: plan.candidateDigest,
      preSourceBundleDigest: plan.sourceBundleDigestBefore,
      postSourceBundleDigest,
      preContractDigest: plan.contractDigestBefore,
      postContractDigest,
      changedFiles,
      targetPath: plan.targetPath,
      targetPreimageDigest: plan.targetPreimageDigest,
      targetPostimageDigest: plan.targetPostimageDigest,
      preAdoptionResult: 'PASS' as const,
      postEquivalentResult: probes.postEquivalentResult,
      postVariantCoverageResult: probes.postVariantCoverageResult,
      nonOverreachResult: probes.nonOverreachResult,
      unsafeRegressionResult: probes.unsafeRegressionResult,
      sandboxVerificationStatus: 'PASS' as const,
      failureClass: 'NONE' as const,
      cleanupStatus: 'PASS' as const,
      sandboxSourceWrites,
      canonicalSourceWrites: 0 as const,
      runtimeGitWrites: 0 as const,
      externalCalls: 0 as const,
      adoptionStatus: 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED' as const,
      canonicalApply: 'PROHIBITED' as const,
      publication: 'PROHIBITED' as const,
    };
    return validateAdoptionSandboxResult({ ...draft, resultId: resultIdFor(draft) });
  } catch {
    return failure('SANDBOX_WRITE_FAILED', mirror === null ? 'PASS' : cleanupSandboxMirror(mirror));
  }
}
