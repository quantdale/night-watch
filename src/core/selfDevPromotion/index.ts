// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 canonical-promotion authority boundary.
//
// This is the ONLY module permitted to write the canonical Nightwatch
// adopted-case catalog at runtime. No campaign, AI review, browser, product,
// database, infrastructure, sandbox-automatic, or publication code may
// import it. Runtime Git commit/push authority and publication authority are
// not present anywhere in this boundary — the one canonical write this
// module performs is always committed by the development session, never by
// this runtime.
// ---------------------------------------------------------------------------

export type {
  SelfDevCanonicalApplyOutcome,
  SelfDevCanonicalApplyReceipt,
  SelfDevCanonicalPromotionApproval,
  SelfDevCanonicalPromotionCurrentness,
  SelfDevCanonicalPromotionIntent,
  SelfDevCanonicalPromotionVerification,
  SelfDevCanonicalPromotionVerificationStatus,
  SelfDevCanonicalVerificationProbeResult,
} from './types';
export {
  SELFDEV_CANONICAL_APPLY_RECEIPT_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFIRMATION,
  SELFDEV_CANONICAL_PROMOTION_APPROVAL_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_INTENT_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_VERIFICATION_SCHEMA_VERSION,
} from './types';
export {
  validateCanonicalApplyReceipt,
  validateCanonicalPromotionApproval,
  validateCanonicalPromotionIntent,
  validateCanonicalPromotionVerification,
  SelfDevCanonicalPromotionValidationError,
  SELFDEV_CANONICAL_PROMOTION_TARGET_PATH,
} from './validation';
export {
  SelfDevCanonicalApplyReceiptStore,
  SelfDevCanonicalPromotionApprovalStore,
  SelfDevCanonicalPromotionIntentStore,
  SelfDevCanonicalPromotionVerificationStore,
  SELFDEV_CANONICAL_PROMOTION_NAMESPACE,
} from './storage';
export { computeCanonicalPromotionIntentDraft, preparePromotion, SelfDevCanonicalPromotionPrepareError } from './prepare';
export type { PreparePromotionInput } from './prepare';
export { promotionIdFor } from './validation';
export { approvePromotion, SelfDevCanonicalPromotionApproveError } from './approve';
export type { ApprovePromotionInput } from './approve';
export { applyPromotion, SelfDevCanonicalPromotionApplyError } from './apply';
export type { ApplyPromotionInput } from './apply';
export { verifyCanonicalPromotion, SelfDevCanonicalPromotionVerifyError } from './verify';
export type { VerifyPromotionInput } from './verify';
export { assessCanonicalPromotionCurrentness } from './currentness';
export type { AssessPromotionCurrentnessInput } from './currentness';
