// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — canonical promotion preparation.
//
// `preparePromotion` NEVER mutates canonical source. It re-reads and proves
// the full trust chain (clean whole repo -> exact v2 session -> current
// eligibility -> exact candidate -> matching PASS evaluation -> exact Phase
// 8B plan -> exact fully-verified sandbox result -> canonical catalog
// currency) before deriving one content-addressed promotion intent. No
// candidate-supplied source, patch, path, or Git authority is accepted or
// produced anywhere in this module.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { assertRepositoryFullyClean, currentCheckoutState } from '../provenance';
import { sha256Hex } from '../selfDev/canonical';
import {
  SELFDEV_ADOPTION_STRATEGY_CLASS,
  SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
  type SelfDevAdoptedCase,
} from '../selfDev/adoptedCases';
import { SelfDevPrivateArtifactStore } from '../selfDev/storage';
import { assessFutureReviewEligibility } from '../selfDev/trust';
import { candidateDigestFor } from '../selfDev/validation';
import { loadSandboxModules } from '../selfDevSandbox/sandboxLoader';
import { SelfDevAdoptionPlanStore, SelfDevAdoptionResultStore } from '../selfDevSandbox/storage';
import { promotionIdFor, validateCanonicalPromotionIntent } from './validation';
import { SelfDevCanonicalPromotionIntentStore } from './storage';
import type { SelfDevCanonicalPromotionIntent } from './types';

export class SelfDevCanonicalPromotionPrepareError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_CANONICAL_PROMOTION_${code}`);
    this.name = 'SelfDevCanonicalPromotionPrepareError';
  }
}

function fail(code: string): never {
  throw new SelfDevCanonicalPromotionPrepareError(code);
}

export interface PreparePromotionInput {
  readonly artifactId: string;
  readonly candidateId: string;
  readonly adoptionPlanId: string;
  readonly sandboxResultId: string;
  readonly repositoryRoot: string;
  readonly nodeModulesAnchorPath: string;
  readonly artifactStore?: SelfDevPrivateArtifactStore;
  readonly planStore?: SelfDevAdoptionPlanStore;
  readonly resultStore?: SelfDevAdoptionResultStore;
  readonly promotionStore?: SelfDevCanonicalPromotionIntentStore;
}

function readCanonicalTargetBytes(repositoryRoot: string): string {
  const targetPath = path.join(repositoryRoot, SELFDEV_ADOPTED_CATALOG_TARGET_PATH);
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('TARGET_NONCANONICAL');
  return fs.readFileSync(targetPath, 'utf8');
}

/**
 * Fresh-loads the REPOSITORY's own catalog module (never the statically
 * imported copy, which reflects only the process that happens to be running
 * this code) so the already-adopted check is correct even when
 * `repositoryRoot` is not this process's own checkout.
 */
function loadRepositoryAdoptedCases(repositoryRoot: string, nodeModulesAnchorPath: string): readonly SelfDevAdoptedCase[] {
  let modules: readonly unknown[];
  try {
    modules = loadSandboxModules([path.join(repositoryRoot, 'src/core/selfDev/adoptedCases.ts')], repositoryRoot, nodeModulesAnchorPath);
  } catch {
    fail('CATALOG_LOAD_FAILED');
  }
  const [adoptedCasesModule] = modules as [{ SELFDEV_ADOPTED_CASES: readonly SelfDevAdoptedCase[] }];
  return adoptedCasesModule.SELFDEV_ADOPTED_CASES;
}

/**
 * Pure computation of the promotion-intent draft: re-derives and cross-checks
 * the full trust chain but performs no persistence. Shared by
 * `preparePromotion` (which persists the result) and the read-only
 * `inspect` CLI command (which never writes a promotion artifact).
 */
export function computeCanonicalPromotionIntentDraft(input: PreparePromotionInput): Omit<SelfDevCanonicalPromotionIntent, 'promotionId'> {
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_CANONICAL_ADOPTION');
  assertRepositoryFullyClean({ repositoryRoot: input.repositoryRoot });
  const current = currentCheckoutState({ repositoryRoot: input.repositoryRoot });

  const artifactStore = input.artifactStore ?? new SelfDevPrivateArtifactStore({ readOnly: true });
  const stored = artifactStore.readSessionArtifact(input.artifactId);
  if (stored.kind !== 'V2') fail('CANDIDATE_NOT_ELIGIBLE');
  const eligibility = assessFutureReviewEligibility(stored.artifact, current);
  if (!eligibility.eligible) fail('CANDIDATE_NOT_ELIGIBLE');
  const candidate = eligibility.candidates.find((item) => item.candidateId === input.candidateId);
  if (candidate === undefined) fail('CANDIDATE_NOT_ELIGIBLE');
  const candidateDigest = candidateDigestFor(candidate);

  const matchingEvaluations = stored.artifact.evaluations.filter((evaluation) =>
    evaluation.candidateId === input.candidateId
    && evaluation.candidateDigest === candidateDigest
    && evaluation.candidateKind === 'SYNTHETIC_REGRESSION_CASE'
    && evaluation.baseNightwatchSha === stored.artifact.baseNightwatchSha
    && evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (matchingEvaluations.length !== 1) fail('CANDIDATE_NOT_ELIGIBLE');
  const evaluation = matchingEvaluations[0]!;

  const planStore = input.planStore ?? new SelfDevAdoptionPlanStore({ readOnly: true });
  const plan = planStore.readPlan(input.adoptionPlanId);
  if (plan.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('PLAN_STRATEGY_INVALID');
  if (plan.sourceSessionArtifactId !== input.artifactId) fail('PLAN_BINDING_MISMATCH');
  if (plan.candidateId !== input.candidateId) fail('PLAN_BINDING_MISMATCH');
  if (plan.candidateDigest !== candidateDigest) fail('PLAN_BINDING_MISMATCH');
  if (plan.evaluationId !== evaluation.evaluationId) fail('PLAN_BINDING_MISMATCH');
  if (plan.targetPath !== SELFDEV_ADOPTED_CATALOG_TARGET_PATH) fail('PLAN_TARGET_PATH_INVALID');

  const resultStore = input.resultStore ?? new SelfDevAdoptionResultStore({ readOnly: true });
  const result = resultStore.readResult(input.sandboxResultId);
  if (result.planId !== input.adoptionPlanId) fail('RESULT_BINDING_MISMATCH');
  if (result.candidateId !== input.candidateId) fail('RESULT_BINDING_MISMATCH');
  if (result.candidateDigest !== candidateDigest) fail('RESULT_BINDING_MISMATCH');
  if (result.sourceSessionArtifactId !== input.artifactId) fail('RESULT_BINDING_MISMATCH');
  if (result.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('RESULT_STRATEGY_INVALID');
  // `validateAdoptionSandboxResult` (invoked by `readResult`) already enforces
  // every Phase 8B.0.1 verified-result invariant for this status: all five
  // metamorphic probes PASS, sandboxSourceWrites === 1, cleanupStatus PASS,
  // and canonical/runtime/external counters all zero. Re-asserting the status
  // here documents the precondition without re-deriving it.
  if (result.adoptionStatus !== 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED') fail('RESULT_NOT_VERIFIED');
  if (result.targetPath !== SELFDEV_ADOPTED_CATALOG_TARGET_PATH) fail('RESULT_TARGET_PATH_INVALID');
  if (result.targetPreimageDigest !== plan.targetPreimageDigest) fail('RESULT_PLAN_TARGET_MISMATCH');
  if (result.targetPostimageDigest !== plan.targetPostimageDigest) fail('RESULT_PLAN_TARGET_MISMATCH');
  if (result.preSourceBundleDigest !== plan.sourceBundleDigestBefore) fail('RESULT_PLAN_SOURCE_MISMATCH');
  if (result.preContractDigest !== plan.contractDigestBefore) fail('RESULT_PLAN_CONTRACT_MISMATCH');

  if (current.sourceBundleDigest !== plan.sourceBundleDigestBefore) fail('PLAN_STALE');
  if (current.contractDigest !== plan.contractDigestBefore) fail('PLAN_STALE');

  const currentTargetBytes = readCanonicalTargetBytes(input.repositoryRoot);
  const currentTargetDigest = `sha256:${sha256Hex(currentTargetBytes)}`;
  if (currentTargetDigest !== plan.targetPreimageDigest) fail('TARGET_PREIMAGE_STALE');

  const repositoryAdoptedCases = loadRepositoryAdoptedCases(input.repositoryRoot, input.nodeModulesAnchorPath);
  if (repositoryAdoptedCases.some((entry) => entry.adoptedCaseId === plan.adoptedCase.adoptedCaseId || entry.equivalentFingerprint === plan.adoptedCase.equivalentFingerprint)) {
    fail('ALREADY_ADOPTED');
  }

  const postSourceBundleDigest = result.postSourceBundleDigest;
  const postContractDigest = result.postContractDigest;
  if (postSourceBundleDigest === null || postContractDigest === null) fail('RESULT_NOT_VERIFIED');

  const draft = {
    schemaVersion: 'nightwatch.selfdev-canonical-promotion.private.v1' as const,
    sourceSessionArtifactId: input.artifactId,
    candidateId: input.candidateId,
    candidateDigest,
    evaluationId: evaluation.evaluationId,
    adoptionPlanId: plan.planId,
    sandboxResultId: result.resultId,
    strategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS,
    preparedAgainstHeadSha: current.currentHeadSha,
    sourceBundleDigestBefore: current.sourceBundleDigest,
    contractDigestBefore: current.contractDigest,
    targetPath: SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
    targetPreimageDigest: plan.targetPreimageDigest,
    targetPostimageDigest: plan.targetPostimageDigest,
    expectedPostSourceBundleDigest: postSourceBundleDigest,
    expectedPostContractDigest: postContractDigest,
    sandboxResultStatus: 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED' as const,
    ownerApprovalRequired: true as const,
    canonicalAuthority: 'OWNER_GATED_ONE_FILE_ONLY' as const,
    maximumCanonicalSourceWrites: 1 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
    publication: 'PROHIBITED' as const,
  };
  return draft;
}

export function preparePromotion(input: PreparePromotionInput): SelfDevCanonicalPromotionIntent {
  const draft = computeCanonicalPromotionIntentDraft(input);
  const promotionId = promotionIdFor(draft);
  const promotion = validateCanonicalPromotionIntent({ ...draft, promotionId });

  const promotionStore = input.promotionStore ?? new SelfDevCanonicalPromotionIntentStore();
  promotionStore.writePromotion(promotion);
  return promotion;
}
