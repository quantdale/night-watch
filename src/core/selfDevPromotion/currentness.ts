// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — read-only post-commit promotion currentness.
//
// Derived only; never rewrites the immutable verification record. Answers
// "does the CURRENT clean canonical checkout still reflect this exact
// verified promotion" after the development session has committed it.
// ---------------------------------------------------------------------------

import { changedFilesBetweenCommits, type LocalCheckoutState } from '../provenance/localGit';
import { SELFDEV_AUTHORITATIVE_PATHS } from '../selfDev/provenanceManifest';
import type { SelfDevCanonicalPromotionCurrentness, SelfDevCanonicalPromotionVerification } from './types';

export interface AssessPromotionCurrentnessInput {
  readonly verification: SelfDevCanonicalPromotionVerification;
  readonly current: LocalCheckoutState;
}

/**
 * `current` must come from {@link currentCheckoutState}, i.e. the canonical
 * checkout must already be clean (the promotion commit exists). Calling this
 * against a still-dirty pre-commit tree is a caller error; use
 * `verifyCanonicalPromotion`'s own `verificationStatus` for that state
 * instead — `CANONICAL_PROMOTION_UNCOMMITTED` here specifically means "the
 * clean checkout's HEAD has not advanced past the verified promotion".
 */
export function assessCanonicalPromotionCurrentness(input: AssessPromotionCurrentnessInput): SelfDevCanonicalPromotionCurrentness {
  const { verification, current } = input;
  if (verification.verificationStatus !== 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED') return 'CANONICAL_PROMOTION_UNCOMMITTED';
  if (current.currentHeadSha === verification.preHeadSha) return 'CANONICAL_PROMOTION_UNCOMMITTED';
  if (!current.isAncestor(verification.preHeadSha)) return 'CANONICAL_PROMOTION_BASELINE_UNRELATED';
  if (current.sourceBundleDigest !== verification.postSourceBundleDigest) return 'CANONICAL_PROMOTION_SOURCE_MISMATCH';
  if (current.contractDigest !== verification.postContractDigest) return 'CANONICAL_PROMOTION_CONTRACT_MISMATCH';

  const changedSincePreHead = changedFilesBetweenCommits(current.repositoryRoot, verification.preHeadSha, current.currentHeadSha);
  if (!changedSincePreHead.includes(verification.targetPath)) return 'CANONICAL_PROMOTION_TARGET_MISMATCH';
  const authoritativeChanged = changedSincePreHead.filter((file) => SELFDEV_AUTHORITATIVE_PATHS.includes(file as (typeof SELFDEV_AUTHORITATIVE_PATHS)[number]));
  if (authoritativeChanged.length !== 1 || authoritativeChanged[0] !== verification.targetPath) return 'CANONICAL_PROMOTION_TARGET_MISMATCH';

  return changedSincePreHead.length === 1
    ? 'CANONICAL_PROMOTION_COMMITTED_EXACT'
    : 'CANONICAL_PROMOTION_COMMITTED_SOURCE_EQUIVALENT_DESCENDANT';
}
