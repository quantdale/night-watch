// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — the ONE canonical source-write executor.
//
// This is the only function in Nightwatch runtime permitted to mutate the
// canonical checkout. It performs at most one atomic write to the single
// fixed target (`src/core/selfDev/adoptedCaseCatalog.generated.ts`), never
// touches Git, and consumes its owner approval exactly once via an atomic
// no-replace consumption marker BEFORE the write — so a failed or repeated
// apply attempt can never produce a second canonical write.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { assertRepositoryFullyClean, currentCheckoutState, readWorkingTreeStatus } from '../provenance';
import { sha256Hex } from '../selfDev/canonical';
import { SELFDEV_ADOPTED_CATALOG_TARGET_PATH, type SelfDevAdoptedCase } from '../selfDev/adoptedCases';
import { loadSandboxModules } from '../selfDevSandbox/sandboxLoader';
import { SelfDevAdoptionPlanStore } from '../selfDevSandbox/storage';
import { receiptIdFor, validateCanonicalApplyReceipt } from './validation';
import {
  SelfDevCanonicalApplyReceiptStore,
  SelfDevCanonicalPromotionApprovalStore,
  SelfDevCanonicalPromotionIntentStore,
} from './storage';
import type { SelfDevCanonicalApplyOutcome, SelfDevCanonicalApplyReceipt } from './types';

export class SelfDevCanonicalPromotionApplyError extends Error {
  constructor(readonly code: string, readonly canonicalSourceWrites: 0 | 1 = 0) {
    super(`SELFDEV_CANONICAL_PROMOTION_${code}`);
    this.name = 'SelfDevCanonicalPromotionApplyError';
  }
}

function fail(code: string): never {
  throw new SelfDevCanonicalPromotionApplyError(code, 0);
}

export interface ApplyPromotionInput {
  readonly promotionId: string;
  readonly approvalId: string;
  readonly repositoryRoot: string;
  readonly nodeModulesAnchorPath: string;
  readonly promotionStore?: SelfDevCanonicalPromotionIntentStore;
  readonly approvalStore?: SelfDevCanonicalPromotionApprovalStore;
  readonly planStore?: SelfDevAdoptionPlanStore;
  readonly receiptStore?: SelfDevCanonicalApplyReceiptStore;
}

/** Fresh-loads the REPOSITORY's own catalog schema module (never a statically imported copy) so the already-adopted check and postimage render reflect `repositoryRoot`, not merely whichever process happens to run this code. */
function loadRepositoryAdoptedCasesModule(repositoryRoot: string, nodeModulesAnchorPath: string): {
  readonly SELFDEV_ADOPTED_CASES: readonly SelfDevAdoptedCase[];
  readonly renderAdoptedCatalogSource: (catalog: readonly SelfDevAdoptedCase[]) => string;
} {
  let modules: readonly unknown[];
  try {
    modules = loadSandboxModules([path.join(repositoryRoot, 'src/core/selfDev/adoptedCases.ts')], repositoryRoot, nodeModulesAnchorPath);
  } catch {
    fail('CATALOG_LOAD_FAILED');
  }
  const [adoptedCasesModule] = modules as [{
    SELFDEV_ADOPTED_CASES: readonly SelfDevAdoptedCase[];
    renderAdoptedCatalogSource: (catalog: readonly SelfDevAdoptedCase[]) => string;
  }];
  return adoptedCasesModule;
}

function assertTargetSafe(absoluteTarget: string, repositoryRoot: string): fs.Stats {
  const stat = fs.lstatSync(absoluteTarget);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('TARGET_UNSAFE');
  const resolvedRoot = fs.realpathSync(repositoryRoot);
  const resolvedParent = fs.realpathSync(path.dirname(absoluteTarget));
  if (resolvedParent !== resolvedRoot && !resolvedParent.startsWith(resolvedRoot + path.sep)) fail('TARGET_PATH_ESCAPE');
  return stat;
}

/** Atomic same-directory temp-file write preserving the target's trusted original mode. */
function atomicWriteTarget(absoluteTarget: string, bytes: string, mode: number): void {
  const temporary = path.join(path.dirname(absoluteTarget), `.selfdev-canonical-${process.pid}-${randomBytes(8).toString('hex')}.tmp`);
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(descriptor, bytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    const temporaryStat = fs.lstatSync(temporary);
    if (temporaryStat.isSymbolicLink() || !temporaryStat.isFile()) throw new Error('SELFDEV_CANONICAL_PROMOTION_TEMP_UNSAFE');
    fs.chmodSync(temporary, mode);
    fs.renameSync(temporary, absoluteTarget);
  } catch (error) {
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {
      // Preserve the original failure; cleanup is best effort.
    }
    throw error;
  }
  try {
    const descriptorDir = fs.openSync(path.dirname(absoluteTarget), 'r');
    try {
      fs.fsyncSync(descriptorDir);
    } finally {
      fs.closeSync(descriptorDir);
    }
  } catch {
    // Directory durability is best-effort; the file rename itself is already durable.
  }
}

/**
 * Applies exactly one owner-approved canonical promotion. Throws a typed
 * `SelfDevCanonicalPromotionApplyError` for every precondition failure before
 * any write; `error.canonicalSourceWrites` is `1` only for the narrow
 * post-write failure classes (changeset validation, receipt persistence)
 * where the source byte-write itself already succeeded and cannot be
 * silently retried or rolled back by this runtime boundary.
 */
export function applyPromotion(input: ApplyPromotionInput): SelfDevCanonicalApplyReceipt {
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_CANONICAL_ADOPTION');

  const promotionStore = input.promotionStore ?? new SelfDevCanonicalPromotionIntentStore({ readOnly: true });
  const promotion = promotionStore.readPromotion(input.promotionId);

  const approvalStore = input.approvalStore ?? new SelfDevCanonicalPromotionApprovalStore();
  const approval = approvalStore.readApproval(input.approvalId);
  if (approval.promotionId !== input.promotionId) fail('WRONG_PROMOTION_FOR_APPROVAL');
  if (approval.preparedAgainstHeadSha !== promotion.preparedAgainstHeadSha) fail('WRONG_PROMOTION_FOR_APPROVAL');
  if (approval.targetPostimageDigest !== promotion.targetPostimageDigest) fail('WRONG_PROMOTION_FOR_APPROVAL');

  // Checked BEFORE whole-repository cleanliness: a successful apply
  // deliberately leaves the tree dirty in exactly the target file, so a
  // repeated apply attempt for an already-consumed approval must report
  // APPROVAL_ALREADY_CONSUMED rather than being masked by that expected
  // post-write dirtiness.
  if (approvalStore.isApprovalConsumed(input.approvalId)) fail('APPROVAL_ALREADY_CONSUMED');

  assertRepositoryFullyClean({ repositoryRoot: input.repositoryRoot });
  const current = currentCheckoutState({ repositoryRoot: input.repositoryRoot });
  if (current.currentHeadSha !== promotion.preparedAgainstHeadSha) fail('PROMOTION_SOURCE_ADVANCED');
  if (current.sourceBundleDigest !== promotion.sourceBundleDigestBefore) fail('PROMOTION_SOURCE_ADVANCED');
  if (current.contractDigest !== promotion.contractDigestBefore) fail('PROMOTION_SOURCE_ADVANCED');

  const absoluteTarget = path.join(input.repositoryRoot, promotion.targetPath);
  const targetStat = assertTargetSafe(absoluteTarget, input.repositoryRoot);
  const originalMode = targetStat.mode & 0o777;
  const currentBytes = fs.readFileSync(absoluteTarget, 'utf8');
  const currentDigest = `sha256:${sha256Hex(currentBytes)}`;
  if (currentDigest !== promotion.targetPreimageDigest) fail('TARGET_PREIMAGE_MISMATCH');

  const planStore = input.planStore ?? new SelfDevAdoptionPlanStore({ readOnly: true });
  const plan = planStore.readPlan(promotion.adoptionPlanId);
  const { SELFDEV_ADOPTED_CASES: repositoryAdoptedCases, renderAdoptedCatalogSource } = loadRepositoryAdoptedCasesModule(input.repositoryRoot, input.nodeModulesAnchorPath);
  if (repositoryAdoptedCases.some((entry) => entry.adoptedCaseId === plan.adoptedCase.adoptedCaseId || entry.equivalentFingerprint === plan.adoptedCase.equivalentFingerprint)) {
    fail('ALREADY_ADOPTED');
  }

  const postimageBytes = renderAdoptedCatalogSource([...repositoryAdoptedCases, plan.adoptedCase]);
  const recomputedPostimageDigest = `sha256:${sha256Hex(postimageBytes)}`;
  if (recomputedPostimageDigest !== promotion.targetPostimageDigest) fail('POSTIMAGE_DIGEST_MISMATCH');
  if (plan.targetPath !== SELFDEV_ADOPTED_CATALOG_TARGET_PATH || promotion.targetPath !== SELFDEV_ADOPTED_CATALOG_TARGET_PATH) fail('TARGET_PATH_INVALID');

  // One-shot consumption: claimed BEFORE the write. A second claim for the
  // same approval — even from a concurrent process — fails here with zero
  // canonical source writes.
  approvalStore.claimApprovalConsumption(input.approvalId, input.promotionId);

  atomicWriteTarget(absoluteTarget, postimageBytes, originalMode);
  // Only after the rename has succeeded is the write real.
  const canonicalSourceWrites = 1 as const;

  const observedBytes = fs.readFileSync(absoluteTarget, 'utf8');
  const observedTargetPostimageDigest = `sha256:${sha256Hex(observedBytes)}`;

  const status = readWorkingTreeStatus({ repositoryRoot: input.repositoryRoot });
  const changesetValid = status.stagedFiles.length === 0
    && status.untrackedFiles.length === 0
    && status.unstagedFiles.length === 1
    && status.unstagedFiles[0] === promotion.targetPath
    && observedTargetPostimageDigest === promotion.targetPostimageDigest;
  const applyOutcome: SelfDevCanonicalApplyOutcome = changesetValid ? 'APPLIED' : 'CHANGESET_INVALID';

  const draft = {
    schemaVersion: 'nightwatch.selfdev-canonical-apply-receipt.private.v1' as const,
    promotionId: promotion.promotionId,
    approvalId: approval.approvalId,
    appliedAgainstHeadSha: current.currentHeadSha,
    targetPath: promotion.targetPath,
    targetPreimageDigest: promotion.targetPreimageDigest,
    targetPostimageDigest: promotion.targetPostimageDigest,
    observedTargetPostimageDigest,
    observedChangedFiles: status.unstagedFiles,
    applyOutcome,
    canonicalSourceWrites,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
    semanticVerificationStatus: 'PENDING' as const,
    gitCommitStatus: 'NOT_PERFORMED_BY_RUNTIME' as const,
    publication: 'PROHIBITED' as const,
  };
  const receiptId = receiptIdFor(draft);
  const receipt = validateCanonicalApplyReceipt({ ...draft, receiptId });

  const receiptStore = input.receiptStore ?? new SelfDevCanonicalApplyReceiptStore();
  try {
    receiptStore.writeReceipt(receipt);
  } catch {
    // The canonical write already happened and cannot be silently rolled
    // back by this runtime boundary. Surface the exact failure with
    // canonicalSourceWrites truthfully reported as 1.
    throw new SelfDevCanonicalPromotionApplyError('APPLIED_RECEIPT_PERSIST_FAILED', 1);
  }

  if (applyOutcome !== 'APPLIED') {
    const changesetError = new SelfDevCanonicalPromotionApplyError('POSTWRITE_CHANGESET_INVALID', 1);
    throw changesetError;
  }

  return receipt;
}
