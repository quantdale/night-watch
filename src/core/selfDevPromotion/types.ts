// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — owner-gated canonical promotion contracts.
//
// This module is the ONLY authority boundary that may ever write the
// canonical Nightwatch adopted-case catalog at runtime. It is deliberately
// separate from src/core/selfDev/ (pure evaluation) and
// src/core/selfDevSandbox/ (disposable private-mirror adoption). It never
// performs a Git write; a Git commit of its one permitted canonical source
// write is always performed by the development session, never by this
// runtime boundary.
// ---------------------------------------------------------------------------

import type { SelfDevAdoptionStrategyClass } from '../selfDev/adoptedCases';

export const SELFDEV_CANONICAL_PROMOTION_INTENT_SCHEMA_VERSION = 'nightwatch.selfdev-canonical-promotion.private.v1' as const;
export const SELFDEV_CANONICAL_PROMOTION_APPROVAL_SCHEMA_VERSION = 'nightwatch.selfdev-canonical-promotion-approval.private.v1' as const;
export const SELFDEV_CANONICAL_APPLY_RECEIPT_SCHEMA_VERSION = 'nightwatch.selfdev-canonical-apply-receipt.private.v1' as const;
export const SELFDEV_CANONICAL_PROMOTION_VERIFICATION_SCHEMA_VERSION = 'nightwatch.selfdev-canonical-promotion-verification.private.v1' as const;

export const SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION = 'CANONICAL_ONE_FILE_ONLY' as const;

export interface SelfDevCanonicalPromotionIntent {
  readonly schemaVersion: typeof SELFDEV_CANONICAL_PROMOTION_INTENT_SCHEMA_VERSION;
  readonly promotionId: string;
  readonly sourceSessionArtifactId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly evaluationId: string;
  readonly adoptionPlanId: string;
  readonly sandboxResultId: string;
  readonly strategyClass: SelfDevAdoptionStrategyClass;
  readonly preparedAgainstHeadSha: string;
  readonly sourceBundleDigestBefore: string;
  readonly contractDigestBefore: string;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly targetPostimageDigest: string;
  readonly expectedPostSourceBundleDigest: string;
  readonly expectedPostContractDigest: string;
  readonly sandboxResultStatus: 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED';
  readonly ownerApprovalRequired: true;
  readonly canonicalAuthority: 'OWNER_GATED_ONE_FILE_ONLY';
  readonly maximumCanonicalSourceWrites: 1;
  readonly runtimeGitWrites: 0;
  readonly externalCalls: 0;
  readonly publication: 'PROHIBITED';
}

export interface SelfDevCanonicalPromotionApproval {
  readonly schemaVersion: typeof SELFDEV_CANONICAL_PROMOTION_APPROVAL_SCHEMA_VERSION;
  readonly approvalId: string;
  readonly promotionId: string;
  readonly preparedAgainstHeadSha: string;
  readonly targetPath: string;
  readonly targetPostimageDigest: string;
  readonly approvalClass: 'OWNER_EXPLICIT_ONE_SHOT';
  readonly maximumApplications: 1;
  readonly canonicalSourceWriteAuthority: 'EXACT_PROMOTION_ONLY';
  readonly runtimeGitWrites: 0;
  readonly publication: 'PROHIBITED';
}

export type SelfDevCanonicalApplyOutcome = 'APPLIED' | 'CHANGESET_INVALID';

export interface SelfDevCanonicalApplyReceipt {
  readonly schemaVersion: typeof SELFDEV_CANONICAL_APPLY_RECEIPT_SCHEMA_VERSION;
  readonly receiptId: string;
  readonly promotionId: string;
  readonly approvalId: string;
  readonly appliedAgainstHeadSha: string;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly targetPostimageDigest: string;
  readonly observedTargetPostimageDigest: string;
  readonly observedChangedFiles: readonly string[];
  readonly applyOutcome: SelfDevCanonicalApplyOutcome;
  readonly canonicalSourceWrites: 1;
  readonly runtimeGitWrites: 0;
  readonly externalCalls: 0;
  readonly semanticVerificationStatus: 'PENDING';
  readonly gitCommitStatus: 'NOT_PERFORMED_BY_RUNTIME';
  readonly publication: 'PROHIBITED';
}

export type SelfDevCanonicalPromotionVerificationStatus =
  | 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED'
  | 'CANONICAL_APPLIED_VERIFICATION_FAILED';

export type SelfDevCanonicalVerificationProbeResult = 'PASS' | 'FAIL' | 'NOT_RUN';

export interface SelfDevCanonicalPromotionVerification {
  readonly schemaVersion: typeof SELFDEV_CANONICAL_PROMOTION_VERIFICATION_SCHEMA_VERSION;
  readonly verificationId: string;
  readonly promotionId: string;
  readonly approvalId: string;
  readonly receiptId: string;
  readonly sourceSessionArtifactId: string;
  readonly candidateId: string;
  readonly adoptionPlanId: string;
  readonly sandboxResultId: string;
  readonly preHeadSha: string;
  readonly preSourceBundleDigest: string;
  readonly postSourceBundleDigest: string;
  readonly preContractDigest: string;
  readonly postContractDigest: string;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly targetPostimageDigest: string;
  readonly observedChangedFiles: readonly string[];
  readonly priorCandidateEvaluation: 'EVALUATED_PASS_NOT_ADOPTED';
  readonly postEquivalentResult: SelfDevCanonicalVerificationProbeResult;
  readonly postVariantCoverageResult: SelfDevCanonicalVerificationProbeResult;
  readonly nonOverreachResult: SelfDevCanonicalVerificationProbeResult;
  readonly unsafeRegressionResult: SelfDevCanonicalVerificationProbeResult;
  readonly verificationStatus: SelfDevCanonicalPromotionVerificationStatus;
  readonly canonicalSourceWrites: 0;
  readonly runtimeGitWrites: 0;
  readonly externalCalls: 0;
  readonly runtimeGitCommit: 'NOT_AUTHORIZED';
  readonly publication: 'PROHIBITED';
}

export type SelfDevCanonicalPromotionCurrentness =
  | 'CANONICAL_PROMOTION_UNCOMMITTED'
  | 'CANONICAL_PROMOTION_COMMITTED_EXACT'
  | 'CANONICAL_PROMOTION_COMMITTED_SOURCE_EQUIVALENT_DESCENDANT'
  | 'CANONICAL_PROMOTION_SOURCE_MISMATCH'
  | 'CANONICAL_PROMOTION_CONTRACT_MISMATCH'
  | 'CANONICAL_PROMOTION_TARGET_MISMATCH'
  | 'CANONICAL_PROMOTION_BASELINE_UNRELATED';
