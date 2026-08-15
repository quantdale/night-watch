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
  renderAdoptedCatalogSource,
} from '../selfDev/adoptedCases';
import { runMetamorphicProbes, type SelfDevMetamorphicProbeResults } from '../selfDev/metamorphicProbes';
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
} from './types';

interface SandboxEvaluatorCtor {
  new (options?: { readonly seedEquivalentFingerprints?: readonly string[]; readonly seedCoverageClasses?: readonly string[] }): {
    evaluateCandidate(value: unknown): { readonly resultClass: string };
  };
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

    const EvaluatorCtor = evaluatorModule.SelfDevEvaluator;
    const seedFingerprints = adoptedCasesModule.selfDevAdoptedEquivalentFingerprints();
    const seedCoverage = adoptedCasesModule.selfDevAdoptedCoverageClasses();
    const probes: SelfDevMetamorphicProbeResults = runMetamorphicProbes(
      () => new EvaluatorCtor({ seedEquivalentFingerprints: seedFingerprints, seedCoverageClasses: seedCoverage }),
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
