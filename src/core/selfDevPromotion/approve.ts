// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — explicit one-shot owner approval.
//
// `approvePromotion` revalidates the promotion intent and the current clean
// HEAD, then writes ONLY a private immutable approval artifact. It performs
// zero canonical source writes and zero Git writes. The approval alone never
// authorizes a source mutation — the separate one-shot consumption gate in
// `apply.ts` is what turns this into a single real write.
// ---------------------------------------------------------------------------

import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { assertRepositoryFullyClean, currentHeadShaUnchecked } from '../provenance/localGit';
import { SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION } from './types';
import { approvalIdFor, validateCanonicalPromotionApproval } from './validation';
import { SelfDevCanonicalPromotionApprovalStore, SelfDevCanonicalPromotionIntentStore } from './storage';
import type { SelfDevCanonicalPromotionApproval } from './types';

export class SelfDevCanonicalPromotionApproveError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_CANONICAL_PROMOTION_${code}`);
    this.name = 'SelfDevCanonicalPromotionApproveError';
  }
}

function fail(code: string): never {
  throw new SelfDevCanonicalPromotionApproveError(code);
}

export interface ApprovePromotionInput {
  readonly promotionId: string;
  readonly confirm: string;
  readonly repositoryRoot: string;
  readonly promotionStore?: SelfDevCanonicalPromotionIntentStore;
  readonly approvalStore?: SelfDevCanonicalPromotionApprovalStore;
}

export function approvePromotion(input: ApprovePromotionInput): SelfDevCanonicalPromotionApproval {
  if (input.confirm !== SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION) fail('APPROVAL_CONFIRMATION_INVALID');
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_CANONICAL_ADOPTION');
  assertRepositoryFullyClean({ repositoryRoot: input.repositoryRoot });

  const promotionStore = input.promotionStore ?? new SelfDevCanonicalPromotionIntentStore({ readOnly: true });
  const promotion = promotionStore.readPromotion(input.promotionId);

  const headSha = currentHeadShaUnchecked(input.repositoryRoot);
  if (headSha !== promotion.preparedAgainstHeadSha) fail('PROMOTION_SOURCE_ADVANCED');

  const draft = {
    schemaVersion: 'nightwatch.selfdev-canonical-promotion-approval.private.v1' as const,
    promotionId: promotion.promotionId,
    preparedAgainstHeadSha: promotion.preparedAgainstHeadSha,
    targetPath: promotion.targetPath,
    targetPostimageDigest: promotion.targetPostimageDigest,
    approvalClass: 'OWNER_EXPLICIT_ONE_SHOT' as const,
    maximumApplications: 1 as const,
    canonicalSourceWriteAuthority: 'EXACT_PROMOTION_ONLY' as const,
    runtimeGitWrites: 0 as const,
    publication: 'PROHIBITED' as const,
  };
  const approvalId = approvalIdFor(draft);
  const approval = validateCanonicalPromotionApproval({ ...draft, approvalId });

  const approvalStore = input.approvalStore ?? new SelfDevCanonicalPromotionApprovalStore();
  approvalStore.writeApproval(approval);
  return approval;
}
