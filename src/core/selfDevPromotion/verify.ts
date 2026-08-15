// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — fresh-load canonical promotion verification.
//
// Read-only: zero canonical writes, zero Git writes, zero external calls.
// Intended to be invoked as its own fresh CLI process after `apply` exits.
// Rather than relying implicitly on "a new OS process reloads everything",
// this module explicitly reloads the canonical `contract.ts`/`evaluator.ts`/
// `adoptedCases.ts` from the given `repositoryRoot` on every call, through
// the same bounded, cache-cleared TypeScript loader the Phase 8B sandbox uses
// (`loadSandboxModules` — its containment mechanism works for any root, not
// only a disposable mirror). This makes freshness an explicit, testable
// property instead of an assumption about process lifetime.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { currentHeadShaUnchecked, readWorkingTreeStatus, sourceBundleDigest } from '../provenance/localGit';
import { sha256Hex } from '../selfDev/canonical';
import type { SelfDevAdoptedCase } from '../selfDev/adoptedCases';
import { runMetamorphicProbes } from '../selfDev/metamorphicProbes';
import { loadSandboxModules } from '../selfDevSandbox/sandboxLoader';
import { SelfDevAdoptionPlanStore, SelfDevAdoptionResultStore } from '../selfDevSandbox/storage';
import { validateCanonicalPromotionVerification, verificationIdFor } from './validation';
import {
  SelfDevCanonicalApplyReceiptStore,
  SelfDevCanonicalPromotionIntentStore,
  SelfDevCanonicalPromotionVerificationStore,
} from './storage';
import type { SelfDevCanonicalPromotionVerification, SelfDevCanonicalVerificationProbeResult } from './types';

export class SelfDevCanonicalPromotionVerifyError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_CANONICAL_PROMOTION_${code}`);
    this.name = 'SelfDevCanonicalPromotionVerifyError';
  }
}

function fail(code: string): never {
  throw new SelfDevCanonicalPromotionVerifyError(code);
}

interface CanonicalEvaluatorCtor {
  new (options?: { readonly seedEquivalentFingerprints?: readonly string[]; readonly seedCoverageClasses?: readonly string[] }): {
    evaluateCandidate(value: unknown): { readonly resultClass: string };
  };
}

export interface VerifyPromotionInput {
  readonly promotionId: string;
  readonly receiptId: string;
  readonly repositoryRoot: string;
  readonly nodeModulesAnchorPath: string;
  readonly promotionStore?: SelfDevCanonicalPromotionIntentStore;
  readonly receiptStore?: SelfDevCanonicalApplyReceiptStore;
  readonly planStore?: SelfDevAdoptionPlanStore;
  readonly sandboxResultStore?: SelfDevAdoptionResultStore;
  readonly verificationStore?: SelfDevCanonicalPromotionVerificationStore;
}

/**
 * Verifies one already-applied, still-uncommitted canonical promotion.
 * Every precondition violation (wrong IDs, HEAD advanced, unexpected
 * changeset, source/contract/target digest mismatch) throws a typed error —
 * a recomputed verification ID can never legalize those. Only the final
 * metamorphic-probe outcome is recorded as a persisted PASS/FAILED
 * verification result, since that is the one thing a legitimate evaluator
 * regression could genuinely fail.
 */
export function verifyCanonicalPromotion(input: VerifyPromotionInput): SelfDevCanonicalPromotionVerification {
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_CANONICAL_ADOPTION');

  const promotionStore = input.promotionStore ?? new SelfDevCanonicalPromotionIntentStore({ readOnly: true });
  const promotion = promotionStore.readPromotion(input.promotionId);

  const receiptStore = input.receiptStore ?? new SelfDevCanonicalApplyReceiptStore({ readOnly: true });
  const receipt = receiptStore.readReceipt(input.receiptId);
  if (receipt.promotionId !== input.promotionId) fail('RECEIPT_PROMOTION_MISMATCH');
  if (receipt.applyOutcome !== 'APPLIED') fail('RECEIPT_NOT_APPLIED');

  const currentHead = currentHeadShaUnchecked(input.repositoryRoot);
  if (currentHead !== promotion.preparedAgainstHeadSha) fail('HEAD_ADVANCED');

  const status = readWorkingTreeStatus({ repositoryRoot: input.repositoryRoot });
  if (status.stagedFiles.length !== 0) fail('UNEXPECTED_STAGED_CHANGE');
  if (status.untrackedFiles.length !== 0) fail('UNEXPECTED_UNTRACKED_FILE');
  if (status.unstagedFiles.length !== 1 || status.unstagedFiles[0] !== promotion.targetPath) fail('UNEXPECTED_CHANGESET');

  const targetBytes = fs.readFileSync(path.join(input.repositoryRoot, promotion.targetPath), 'utf8');
  const observedTargetPostimageDigest = `sha256:${sha256Hex(targetBytes)}`;
  if (observedTargetPostimageDigest !== promotion.targetPostimageDigest) fail('TARGET_MISMATCH');

  // Computed directly from current working-tree bytes; does NOT require Git
  // cleanliness (the tree is deliberately dirty in exactly the target file).
  const postSourceBundleDigest = sourceBundleDigest(input.repositoryRoot);
  if (postSourceBundleDigest !== promotion.expectedPostSourceBundleDigest) fail('POST_SOURCE_MISMATCH');

  // Fresh reload of the canonical contract/evaluator/catalog from
  // `repositoryRoot`, never a statically imported (and possibly stale-cached)
  // copy — see the module header.
  let modules: readonly unknown[];
  try {
    modules = loadSandboxModules([
      path.join(input.repositoryRoot, 'src/core/selfDev/contract.ts'),
      path.join(input.repositoryRoot, 'src/core/selfDev/evaluator.ts'),
      path.join(input.repositoryRoot, 'src/core/selfDev/adoptedCases.ts'),
    ], input.repositoryRoot, input.nodeModulesAnchorPath);
  } catch {
    fail('CANONICAL_MODULE_LOAD_FAILED');
  }
  const [contractModule, evaluatorModule, adoptedCasesModule] = modules as [
    { selfDevContractDigest(): string },
    { SelfDevEvaluator: CanonicalEvaluatorCtor },
    { selfDevAdoptedEquivalentFingerprints(): readonly string[]; selfDevAdoptedCoverageClasses(): readonly string[]; SELFDEV_ADOPTED_CASES: readonly SelfDevAdoptedCase[] },
  ];

  const postContractDigest = contractModule.selfDevContractDigest();
  if (postContractDigest !== promotion.expectedPostContractDigest) fail('POST_CONTRACT_MISMATCH');

  const sandboxResultStore = input.sandboxResultStore ?? new SelfDevAdoptionResultStore({ readOnly: true });
  const sandboxResult = sandboxResultStore.readResult(promotion.sandboxResultId);
  if (sandboxResult.postSourceBundleDigest !== postSourceBundleDigest) fail('SANDBOX_SOURCE_DIGEST_MISMATCH');
  if (sandboxResult.postContractDigest !== postContractDigest) fail('SANDBOX_CONTRACT_DIGEST_MISMATCH');

  const planStore = input.planStore ?? new SelfDevAdoptionPlanStore({ readOnly: true });
  const plan = planStore.readPlan(promotion.adoptionPlanId);
  if (plan.planId !== promotion.adoptionPlanId) fail('PLAN_BINDING_MISMATCH');
  if (!adoptedCasesModule.SELFDEV_ADOPTED_CASES.some((entry) => entry.adoptedCaseId === plan.adoptedCase.adoptedCaseId)) fail('ADOPTED_CASE_NOT_PRESENT');

  const EvaluatorCtor = evaluatorModule.SelfDevEvaluator;
  const seedFingerprints = adoptedCasesModule.selfDevAdoptedEquivalentFingerprints();
  const seedCoverage = adoptedCasesModule.selfDevAdoptedCoverageClasses();
  const probes = runMetamorphicProbes(
    () => new EvaluatorCtor({ seedEquivalentFingerprints: seedFingerprints, seedCoverageClasses: seedCoverage }),
    plan.adoptedCase,
  );

  const toVerificationProbe = (value: string): SelfDevCanonicalVerificationProbeResult =>
    value === 'PASS' || value === 'FAIL' ? value : 'NOT_RUN';

  const allPass = probes.postEquivalentResult === 'PASS'
    && probes.postVariantCoverageResult === 'PASS'
    && probes.nonOverreachResult === 'PASS'
    && probes.unsafeRegressionResult === 'PASS';
  const verificationStatus: 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED' | 'CANONICAL_APPLIED_VERIFICATION_FAILED' =
    allPass ? 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED' : 'CANONICAL_APPLIED_VERIFICATION_FAILED';

  const draft = {
    schemaVersion: 'nightwatch.selfdev-canonical-promotion-verification.private.v1' as const,
    promotionId: promotion.promotionId,
    approvalId: receipt.approvalId,
    receiptId: receipt.receiptId,
    sourceSessionArtifactId: promotion.sourceSessionArtifactId,
    candidateId: promotion.candidateId,
    adoptionPlanId: promotion.adoptionPlanId,
    sandboxResultId: promotion.sandboxResultId,
    preHeadSha: promotion.preparedAgainstHeadSha,
    preSourceBundleDigest: promotion.sourceBundleDigestBefore,
    postSourceBundleDigest,
    preContractDigest: promotion.contractDigestBefore,
    postContractDigest,
    targetPath: promotion.targetPath,
    targetPreimageDigest: promotion.targetPreimageDigest,
    targetPostimageDigest: promotion.targetPostimageDigest,
    observedChangedFiles: status.unstagedFiles,
    priorCandidateEvaluation: 'EVALUATED_PASS_NOT_ADOPTED' as const,
    postEquivalentResult: toVerificationProbe(probes.postEquivalentResult),
    postVariantCoverageResult: toVerificationProbe(probes.postVariantCoverageResult),
    nonOverreachResult: toVerificationProbe(probes.nonOverreachResult),
    unsafeRegressionResult: toVerificationProbe(probes.unsafeRegressionResult),
    verificationStatus,
    canonicalSourceWrites: 0 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
    runtimeGitCommit: 'NOT_AUTHORIZED' as const,
    publication: 'PROHIBITED' as const,
  };
  const verificationId = verificationIdFor(draft);
  const verification = validateCanonicalPromotionVerification({ ...draft, verificationId });

  const verificationStore = input.verificationStore ?? new SelfDevCanonicalPromotionVerificationStore();
  verificationStore.writeVerification(verification);
  return verification;
}
