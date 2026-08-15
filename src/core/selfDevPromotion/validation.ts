// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — strict exact-key validation for canonical promotion
// records. Mirrors the Phase 8B sandbox validation conventions: exact keys,
// recomputed content-addressed identity, and semantic invariants that a
// recomputed ID cannot legalize.
// ---------------------------------------------------------------------------

import { sha256Digest } from '../selfDev/canonical';
import { SELFDEV_ADOPTION_STRATEGY_CLASS } from '../selfDev/adoptedCases';
import {
  SELFDEV_CANONICAL_APPLY_RECEIPT_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_APPROVAL_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_INTENT_SCHEMA_VERSION,
  SELFDEV_CANONICAL_PROMOTION_VERIFICATION_SCHEMA_VERSION,
  type SelfDevCanonicalApplyOutcome,
  type SelfDevCanonicalApplyReceipt,
  type SelfDevCanonicalPromotionApproval,
  type SelfDevCanonicalPromotionIntent,
  type SelfDevCanonicalPromotionVerification,
  type SelfDevCanonicalVerificationProbeResult,
} from './types';

export class SelfDevCanonicalPromotionValidationError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_CANONICAL_PROMOTION_${code}`);
    this.name = 'SelfDevCanonicalPromotionValidationError';
  }
}

function fail(code: string): never {
  throw new SelfDevCanonicalPromotionValidationError(code);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('RECORD_INVALID');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail('RECORD_INVALID');
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  const accepted = new Set(keys);
  for (const key of Object.keys(value)) if (!accepted.has(key)) fail(`${code}_UNKNOWN_FIELD`);
  for (const key of keys) if (!(key in value)) fail(`${code}_MISSING_FIELD`);
}

const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const CANDIDATE_ID_RE = /^candidate:[0-9a-f]{64}$/;
const EVALUATION_ID_RE = /^evaluation:sha256:[0-9a-f]{64}$/;
const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;
const PLAN_ID_RE = /^adoption-plan:sha256:[0-9a-f]{64}$/;
const RESULT_ID_RE = /^adoption-sandbox-result:sha256:[0-9a-f]{64}$/;
const PROMOTION_ID_RE = /^canonical-promotion:sha256:[0-9a-f]{64}$/;
const APPROVAL_ID_RE = /^canonical-promotion-approval:sha256:[0-9a-f]{64}$/;
const RECEIPT_ID_RE = /^canonical-apply-receipt:sha256:[0-9a-f]{64}$/;
const VERIFICATION_ID_RE = /^canonical-promotion-verification:sha256:[0-9a-f]{64}$/;
const TARGET_PATH = 'src/core/selfDev/adoptedCaseCatalog.generated.ts';

function digest(value: unknown): string {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) fail('DIGEST_INVALID');
  return value;
}

// ---------------------------------------------------------------------------
// Promotion intent
// ---------------------------------------------------------------------------

const PROMOTION_KEYS = [
  'schemaVersion', 'promotionId', 'sourceSessionArtifactId', 'candidateId', 'candidateDigest',
  'evaluationId', 'adoptionPlanId', 'sandboxResultId', 'strategyClass', 'preparedAgainstHeadSha',
  'sourceBundleDigestBefore', 'contractDigestBefore', 'targetPath', 'targetPreimageDigest',
  'targetPostimageDigest', 'expectedPostSourceBundleDigest', 'expectedPostContractDigest',
  'sandboxResultStatus', 'ownerApprovalRequired', 'canonicalAuthority', 'maximumCanonicalSourceWrites',
  'runtimeGitWrites', 'externalCalls', 'publication',
] as const;

function promotionIdentityFields(promotion: Omit<SelfDevCanonicalPromotionIntent, 'promotionId'>): Record<string, unknown> {
  return {
    schemaVersion: promotion.schemaVersion,
    sourceSessionArtifactId: promotion.sourceSessionArtifactId,
    candidateId: promotion.candidateId,
    candidateDigest: promotion.candidateDigest,
    evaluationId: promotion.evaluationId,
    adoptionPlanId: promotion.adoptionPlanId,
    sandboxResultId: promotion.sandboxResultId,
    strategyClass: promotion.strategyClass,
    preparedAgainstHeadSha: promotion.preparedAgainstHeadSha,
    sourceBundleDigestBefore: promotion.sourceBundleDigestBefore,
    contractDigestBefore: promotion.contractDigestBefore,
    targetPath: promotion.targetPath,
    targetPreimageDigest: promotion.targetPreimageDigest,
    targetPostimageDigest: promotion.targetPostimageDigest,
    expectedPostSourceBundleDigest: promotion.expectedPostSourceBundleDigest,
    expectedPostContractDigest: promotion.expectedPostContractDigest,
    sandboxResultStatus: promotion.sandboxResultStatus,
    ownerApprovalRequired: promotion.ownerApprovalRequired,
    canonicalAuthority: promotion.canonicalAuthority,
    maximumCanonicalSourceWrites: promotion.maximumCanonicalSourceWrites,
    runtimeGitWrites: promotion.runtimeGitWrites,
    externalCalls: promotion.externalCalls,
    publication: promotion.publication,
  };
}

export function promotionIdFor(promotion: Omit<SelfDevCanonicalPromotionIntent, 'promotionId'>): string {
  return `canonical-promotion:${sha256Digest(promotionIdentityFields(promotion))}`;
}

export function validateCanonicalPromotionIntent(value: unknown): SelfDevCanonicalPromotionIntent {
  const promotion = record(value);
  assertExactKeys(promotion, PROMOTION_KEYS, 'INTENT');
  if (promotion.schemaVersion !== SELFDEV_CANONICAL_PROMOTION_INTENT_SCHEMA_VERSION) fail('INTENT_SCHEMA_INVALID');
  if (promotion.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('INTENT_STRATEGY_INVALID');
  if (typeof promotion.sourceSessionArtifactId !== 'string' || !ARTIFACT_ID_RE.test(promotion.sourceSessionArtifactId)) fail('INTENT_ARTIFACT_ID_INVALID');
  if (typeof promotion.candidateId !== 'string' || !CANDIDATE_ID_RE.test(promotion.candidateId)) fail('INTENT_CANDIDATE_ID_INVALID');
  const candidateDigest = digest(promotion.candidateDigest);
  if (candidateDigest !== `sha256:${(promotion.candidateId as string).slice('candidate:'.length)}`) fail('INTENT_CANDIDATE_BINDING_MISMATCH');
  if (typeof promotion.evaluationId !== 'string' || !EVALUATION_ID_RE.test(promotion.evaluationId)) fail('INTENT_EVALUATION_ID_INVALID');
  if (typeof promotion.adoptionPlanId !== 'string' || !PLAN_ID_RE.test(promotion.adoptionPlanId)) fail('INTENT_PLAN_ID_INVALID');
  if (typeof promotion.sandboxResultId !== 'string' || !RESULT_ID_RE.test(promotion.sandboxResultId)) fail('INTENT_RESULT_ID_INVALID');
  if (typeof promotion.preparedAgainstHeadSha !== 'string' || !SHA_RE.test(promotion.preparedAgainstHeadSha)) fail('INTENT_HEAD_SHA_INVALID');
  const sourceBundleDigestBefore = digest(promotion.sourceBundleDigestBefore);
  const contractDigestBefore = digest(promotion.contractDigestBefore);
  if (promotion.targetPath !== TARGET_PATH) fail('INTENT_TARGET_PATH_INVALID');
  const targetPreimageDigest = digest(promotion.targetPreimageDigest);
  const targetPostimageDigest = digest(promotion.targetPostimageDigest);
  if (targetPreimageDigest === targetPostimageDigest) fail('INTENT_NO_ACTUAL_CHANGE');
  const expectedPostSourceBundleDigest = digest(promotion.expectedPostSourceBundleDigest);
  const expectedPostContractDigest = digest(promotion.expectedPostContractDigest);
  if (expectedPostSourceBundleDigest === sourceBundleDigestBefore) fail('INTENT_EXPECTED_POST_SOURCE_UNCHANGED');
  if (promotion.sandboxResultStatus !== 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED') fail('INTENT_SANDBOX_STATUS_INVALID');
  if (promotion.ownerApprovalRequired !== true) fail('INTENT_APPROVAL_REQUIREMENT_INVALID');
  if (promotion.canonicalAuthority !== 'OWNER_GATED_ONE_FILE_ONLY') fail('INTENT_AUTHORITY_INVALID');
  if (promotion.maximumCanonicalSourceWrites !== 1) fail('INTENT_MAX_WRITES_INVALID');
  if (promotion.runtimeGitWrites !== 0 || promotion.externalCalls !== 0) fail('INTENT_AUTHORITY_COUNTERS_NONZERO');
  if (promotion.publication !== 'PROHIBITED') fail('INTENT_PUBLICATION_INVALID');

  const normalized = {
    ...promotion,
    candidateDigest,
    sourceBundleDigestBefore,
    contractDigestBefore,
    targetPreimageDigest,
    targetPostimageDigest,
    expectedPostSourceBundleDigest,
    expectedPostContractDigest,
    ownerApprovalRequired: true as const,
    canonicalAuthority: 'OWNER_GATED_ONE_FILE_ONLY' as const,
    maximumCanonicalSourceWrites: 1 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  } as unknown as SelfDevCanonicalPromotionIntent;
  if (typeof promotion.promotionId !== 'string' || !PROMOTION_ID_RE.test(promotion.promotionId)) fail('INTENT_ID_INVALID');
  if (promotion.promotionId !== promotionIdFor(normalized)) fail('INTENT_ID_MISMATCH');
  return normalized;
}

// ---------------------------------------------------------------------------
// Approval
// ---------------------------------------------------------------------------

const APPROVAL_KEYS = [
  'schemaVersion', 'approvalId', 'promotionId', 'preparedAgainstHeadSha', 'targetPath',
  'targetPostimageDigest', 'approvalClass', 'maximumApplications', 'canonicalSourceWriteAuthority',
  'runtimeGitWrites', 'publication',
] as const;

function approvalIdentityFields(approval: Omit<SelfDevCanonicalPromotionApproval, 'approvalId'>): Record<string, unknown> {
  return {
    schemaVersion: approval.schemaVersion,
    promotionId: approval.promotionId,
    preparedAgainstHeadSha: approval.preparedAgainstHeadSha,
    targetPath: approval.targetPath,
    targetPostimageDigest: approval.targetPostimageDigest,
    approvalClass: approval.approvalClass,
    maximumApplications: approval.maximumApplications,
    canonicalSourceWriteAuthority: approval.canonicalSourceWriteAuthority,
    runtimeGitWrites: approval.runtimeGitWrites,
    publication: approval.publication,
  };
}

export function approvalIdFor(approval: Omit<SelfDevCanonicalPromotionApproval, 'approvalId'>): string {
  return `canonical-promotion-approval:${sha256Digest(approvalIdentityFields(approval))}`;
}

export function validateCanonicalPromotionApproval(value: unknown): SelfDevCanonicalPromotionApproval {
  const approval = record(value);
  assertExactKeys(approval, APPROVAL_KEYS, 'APPROVAL');
  if (approval.schemaVersion !== SELFDEV_CANONICAL_PROMOTION_APPROVAL_SCHEMA_VERSION) fail('APPROVAL_SCHEMA_INVALID');
  if (typeof approval.promotionId !== 'string' || !PROMOTION_ID_RE.test(approval.promotionId)) fail('APPROVAL_PROMOTION_ID_INVALID');
  if (typeof approval.preparedAgainstHeadSha !== 'string' || !SHA_RE.test(approval.preparedAgainstHeadSha)) fail('APPROVAL_HEAD_SHA_INVALID');
  if (approval.targetPath !== TARGET_PATH) fail('APPROVAL_TARGET_PATH_INVALID');
  const targetPostimageDigest = digest(approval.targetPostimageDigest);
  if (approval.approvalClass !== 'OWNER_EXPLICIT_ONE_SHOT') fail('APPROVAL_CLASS_INVALID');
  if (approval.maximumApplications !== 1) fail('APPROVAL_MAX_APPLICATIONS_INVALID');
  if (approval.canonicalSourceWriteAuthority !== 'EXACT_PROMOTION_ONLY') fail('APPROVAL_AUTHORITY_INVALID');
  if (approval.runtimeGitWrites !== 0) fail('APPROVAL_AUTHORITY_COUNTERS_NONZERO');
  if (approval.publication !== 'PROHIBITED') fail('APPROVAL_PUBLICATION_INVALID');

  const normalized = {
    ...approval,
    targetPostimageDigest,
    maximumApplications: 1 as const,
    runtimeGitWrites: 0 as const,
  } as unknown as SelfDevCanonicalPromotionApproval;
  if (typeof approval.approvalId !== 'string' || !APPROVAL_ID_RE.test(approval.approvalId)) fail('APPROVAL_ID_INVALID');
  if (approval.approvalId !== approvalIdFor(normalized)) fail('APPROVAL_ID_MISMATCH');
  return normalized;
}

// ---------------------------------------------------------------------------
// Apply receipt
// ---------------------------------------------------------------------------

const RECEIPT_KEYS = [
  'schemaVersion', 'receiptId', 'promotionId', 'approvalId', 'appliedAgainstHeadSha', 'targetPath',
  'targetPreimageDigest', 'targetPostimageDigest', 'observedTargetPostimageDigest', 'observedChangedFiles',
  'applyOutcome', 'canonicalSourceWrites', 'runtimeGitWrites', 'externalCalls',
  'semanticVerificationStatus', 'gitCommitStatus', 'publication',
] as const;

const APPLY_OUTCOMES: readonly SelfDevCanonicalApplyOutcome[] = ['APPLIED', 'CHANGESET_INVALID'];

function receiptIdentityFields(receipt: Omit<SelfDevCanonicalApplyReceipt, 'receiptId'>): Record<string, unknown> {
  return {
    schemaVersion: receipt.schemaVersion,
    promotionId: receipt.promotionId,
    approvalId: receipt.approvalId,
    appliedAgainstHeadSha: receipt.appliedAgainstHeadSha,
    targetPath: receipt.targetPath,
    targetPreimageDigest: receipt.targetPreimageDigest,
    targetPostimageDigest: receipt.targetPostimageDigest,
    observedTargetPostimageDigest: receipt.observedTargetPostimageDigest,
    observedChangedFiles: [...receipt.observedChangedFiles],
    applyOutcome: receipt.applyOutcome,
    canonicalSourceWrites: receipt.canonicalSourceWrites,
    runtimeGitWrites: receipt.runtimeGitWrites,
    externalCalls: receipt.externalCalls,
    semanticVerificationStatus: receipt.semanticVerificationStatus,
    gitCommitStatus: receipt.gitCommitStatus,
    publication: receipt.publication,
  };
}

export function receiptIdFor(receipt: Omit<SelfDevCanonicalApplyReceipt, 'receiptId'>): string {
  return `canonical-apply-receipt:${sha256Digest(receiptIdentityFields(receipt))}`;
}

export function validateCanonicalApplyReceipt(value: unknown): SelfDevCanonicalApplyReceipt {
  const receipt = record(value);
  assertExactKeys(receipt, RECEIPT_KEYS, 'RECEIPT');
  if (receipt.schemaVersion !== SELFDEV_CANONICAL_APPLY_RECEIPT_SCHEMA_VERSION) fail('RECEIPT_SCHEMA_INVALID');
  if (typeof receipt.promotionId !== 'string' || !PROMOTION_ID_RE.test(receipt.promotionId)) fail('RECEIPT_PROMOTION_ID_INVALID');
  if (typeof receipt.approvalId !== 'string' || !APPROVAL_ID_RE.test(receipt.approvalId)) fail('RECEIPT_APPROVAL_ID_INVALID');
  if (typeof receipt.appliedAgainstHeadSha !== 'string' || !SHA_RE.test(receipt.appliedAgainstHeadSha)) fail('RECEIPT_HEAD_SHA_INVALID');
  if (receipt.targetPath !== TARGET_PATH) fail('RECEIPT_TARGET_PATH_INVALID');
  const targetPreimageDigest = digest(receipt.targetPreimageDigest);
  const targetPostimageDigest = digest(receipt.targetPostimageDigest);
  const observedTargetPostimageDigest = digest(receipt.observedTargetPostimageDigest);
  if (!Array.isArray(receipt.observedChangedFiles) || receipt.observedChangedFiles.some((item) => typeof item !== 'string')) fail('RECEIPT_CHANGED_FILES_INVALID');
  if (typeof receipt.applyOutcome !== 'string' || !APPLY_OUTCOMES.includes(receipt.applyOutcome as SelfDevCanonicalApplyOutcome)) fail('RECEIPT_OUTCOME_INVALID');
  if (receipt.canonicalSourceWrites !== 1) fail('RECEIPT_CANONICAL_WRITES_INVALID');
  if (receipt.runtimeGitWrites !== 0 || receipt.externalCalls !== 0) fail('RECEIPT_AUTHORITY_COUNTERS_NONZERO');
  if (receipt.semanticVerificationStatus !== 'PENDING') fail('RECEIPT_VERIFICATION_STATUS_INVALID');
  if (receipt.gitCommitStatus !== 'NOT_PERFORMED_BY_RUNTIME') fail('RECEIPT_GIT_COMMIT_STATUS_INVALID');
  if (receipt.publication !== 'PROHIBITED') fail('RECEIPT_PUBLICATION_INVALID');
  if (receipt.applyOutcome === 'APPLIED') {
    if (observedTargetPostimageDigest !== targetPostimageDigest) fail('RECEIPT_APPLIED_INVARIANT');
    if (receipt.observedChangedFiles.length !== 1 || receipt.observedChangedFiles[0] !== TARGET_PATH) fail('RECEIPT_APPLIED_INVARIANT');
  }

  const normalized = {
    ...receipt,
    targetPreimageDigest,
    targetPostimageDigest,
    observedTargetPostimageDigest,
    observedChangedFiles: [...(receipt.observedChangedFiles as string[])],
    canonicalSourceWrites: 1 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  } as unknown as SelfDevCanonicalApplyReceipt;
  if (typeof receipt.receiptId !== 'string' || !RECEIPT_ID_RE.test(receipt.receiptId)) fail('RECEIPT_ID_INVALID');
  if (receipt.receiptId !== receiptIdFor(normalized)) fail('RECEIPT_ID_MISMATCH');
  return normalized;
}

// ---------------------------------------------------------------------------
// Verification result
// ---------------------------------------------------------------------------

const VERIFICATION_KEYS = [
  'schemaVersion', 'verificationId', 'promotionId', 'approvalId', 'receiptId',
  'sourceSessionArtifactId', 'candidateId', 'adoptionPlanId', 'sandboxResultId',
  'preHeadSha', 'preSourceBundleDigest', 'postSourceBundleDigest', 'preContractDigest', 'postContractDigest',
  'targetPath', 'targetPreimageDigest', 'targetPostimageDigest', 'observedChangedFiles',
  'priorCandidateEvaluation', 'postEquivalentResult', 'postVariantCoverageResult',
  'nonOverreachResult', 'unsafeRegressionResult', 'verificationStatus',
  'canonicalSourceWrites', 'runtimeGitWrites', 'externalCalls', 'runtimeGitCommit', 'publication',
] as const;

const PROBE_RESULTS: readonly SelfDevCanonicalVerificationProbeResult[] = ['PASS', 'FAIL', 'NOT_RUN'];

function assertProbeResult(value: unknown): asserts value is SelfDevCanonicalVerificationProbeResult {
  if (typeof value !== 'string' || !PROBE_RESULTS.includes(value as SelfDevCanonicalVerificationProbeResult)) fail('VERIFICATION_PROBE_INVALID');
}

function verificationIdentityFields(verification: Omit<SelfDevCanonicalPromotionVerification, 'verificationId'>): Record<string, unknown> {
  return {
    schemaVersion: verification.schemaVersion,
    promotionId: verification.promotionId,
    approvalId: verification.approvalId,
    receiptId: verification.receiptId,
    sourceSessionArtifactId: verification.sourceSessionArtifactId,
    candidateId: verification.candidateId,
    adoptionPlanId: verification.adoptionPlanId,
    sandboxResultId: verification.sandboxResultId,
    preHeadSha: verification.preHeadSha,
    preSourceBundleDigest: verification.preSourceBundleDigest,
    postSourceBundleDigest: verification.postSourceBundleDigest,
    preContractDigest: verification.preContractDigest,
    postContractDigest: verification.postContractDigest,
    targetPath: verification.targetPath,
    targetPreimageDigest: verification.targetPreimageDigest,
    targetPostimageDigest: verification.targetPostimageDigest,
    observedChangedFiles: [...verification.observedChangedFiles],
    priorCandidateEvaluation: verification.priorCandidateEvaluation,
    postEquivalentResult: verification.postEquivalentResult,
    postVariantCoverageResult: verification.postVariantCoverageResult,
    nonOverreachResult: verification.nonOverreachResult,
    unsafeRegressionResult: verification.unsafeRegressionResult,
    verificationStatus: verification.verificationStatus,
    canonicalSourceWrites: verification.canonicalSourceWrites,
    runtimeGitWrites: verification.runtimeGitWrites,
    externalCalls: verification.externalCalls,
    runtimeGitCommit: verification.runtimeGitCommit,
    publication: verification.publication,
  };
}

export function verificationIdFor(verification: Omit<SelfDevCanonicalPromotionVerification, 'verificationId'>): string {
  return `canonical-promotion-verification:${sha256Digest(verificationIdentityFields(verification))}`;
}

/**
 * Semantic invariant gate, not merely a shape check: a recomputed
 * verificationId cannot legalize a claimed
 * `CANONICAL_APPLIED_VERIFIED_UNCOMMITTED` result against the wrong target,
 * wrong source/contract digest, an extra changed file, a missing PASS probe,
 * or a nonzero runtime Git/external counter.
 */
export function validateCanonicalPromotionVerification(value: unknown): SelfDevCanonicalPromotionVerification {
  const verification = record(value);
  assertExactKeys(verification, VERIFICATION_KEYS, 'VERIFICATION');
  if (verification.schemaVersion !== SELFDEV_CANONICAL_PROMOTION_VERIFICATION_SCHEMA_VERSION) fail('VERIFICATION_SCHEMA_INVALID');
  if (typeof verification.promotionId !== 'string' || !PROMOTION_ID_RE.test(verification.promotionId)) fail('VERIFICATION_PROMOTION_ID_INVALID');
  if (typeof verification.approvalId !== 'string' || !APPROVAL_ID_RE.test(verification.approvalId)) fail('VERIFICATION_APPROVAL_ID_INVALID');
  if (typeof verification.receiptId !== 'string' || !RECEIPT_ID_RE.test(verification.receiptId)) fail('VERIFICATION_RECEIPT_ID_INVALID');
  if (typeof verification.sourceSessionArtifactId !== 'string' || !ARTIFACT_ID_RE.test(verification.sourceSessionArtifactId)) fail('VERIFICATION_ARTIFACT_ID_INVALID');
  if (typeof verification.candidateId !== 'string' || !CANDIDATE_ID_RE.test(verification.candidateId)) fail('VERIFICATION_CANDIDATE_ID_INVALID');
  if (typeof verification.adoptionPlanId !== 'string' || !PLAN_ID_RE.test(verification.adoptionPlanId)) fail('VERIFICATION_PLAN_ID_INVALID');
  if (typeof verification.sandboxResultId !== 'string' || !RESULT_ID_RE.test(verification.sandboxResultId)) fail('VERIFICATION_RESULT_ID_INVALID');
  if (typeof verification.preHeadSha !== 'string' || !SHA_RE.test(verification.preHeadSha)) fail('VERIFICATION_HEAD_SHA_INVALID');
  const preSourceBundleDigest = digest(verification.preSourceBundleDigest);
  const postSourceBundleDigest = digest(verification.postSourceBundleDigest);
  const preContractDigest = digest(verification.preContractDigest);
  const postContractDigest = digest(verification.postContractDigest);
  if (verification.targetPath !== TARGET_PATH) fail('VERIFICATION_TARGET_PATH_INVALID');
  const targetPreimageDigest = digest(verification.targetPreimageDigest);
  const targetPostimageDigest = digest(verification.targetPostimageDigest);
  if (!Array.isArray(verification.observedChangedFiles) || verification.observedChangedFiles.some((item) => typeof item !== 'string')) fail('VERIFICATION_CHANGED_FILES_INVALID');
  if (verification.priorCandidateEvaluation !== 'EVALUATED_PASS_NOT_ADOPTED') fail('VERIFICATION_PRIOR_EVALUATION_INVALID');
  assertProbeResult(verification.postEquivalentResult);
  assertProbeResult(verification.postVariantCoverageResult);
  assertProbeResult(verification.nonOverreachResult);
  assertProbeResult(verification.unsafeRegressionResult);
  if (verification.verificationStatus !== 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED' && verification.verificationStatus !== 'CANONICAL_APPLIED_VERIFICATION_FAILED') {
    fail('VERIFICATION_STATUS_INVALID');
  }
  if (verification.canonicalSourceWrites !== 0 || verification.runtimeGitWrites !== 0 || verification.externalCalls !== 0) fail('VERIFICATION_AUTHORITY_COUNTERS_NONZERO');
  if (verification.runtimeGitCommit !== 'NOT_AUTHORIZED') fail('VERIFICATION_GIT_COMMIT_INVALID');
  if (verification.publication !== 'PROHIBITED') fail('VERIFICATION_PUBLICATION_INVALID');

  if (verification.verificationStatus === 'CANONICAL_APPLIED_VERIFIED_UNCOMMITTED') {
    if (preSourceBundleDigest === postSourceBundleDigest) fail('VERIFICATION_VERIFIED_INVARIANT');
    if (preContractDigest === postContractDigest) fail('VERIFICATION_VERIFIED_INVARIANT');
    if (targetPreimageDigest === targetPostimageDigest) fail('VERIFICATION_VERIFIED_INVARIANT');
    if (verification.observedChangedFiles.length !== 1 || verification.observedChangedFiles[0] !== TARGET_PATH) fail('VERIFICATION_VERIFIED_INVARIANT');
    if (verification.postEquivalentResult !== 'PASS' || verification.postVariantCoverageResult !== 'PASS'
      || verification.nonOverreachResult !== 'PASS' || verification.unsafeRegressionResult !== 'PASS') fail('VERIFICATION_VERIFIED_INVARIANT');
  }

  const normalized = {
    ...verification,
    preSourceBundleDigest,
    postSourceBundleDigest,
    preContractDigest,
    postContractDigest,
    targetPreimageDigest,
    targetPostimageDigest,
    observedChangedFiles: [...(verification.observedChangedFiles as string[])],
    canonicalSourceWrites: 0 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  } as unknown as SelfDevCanonicalPromotionVerification;
  if (typeof verification.verificationId !== 'string' || !VERIFICATION_ID_RE.test(verification.verificationId)) fail('VERIFICATION_ID_INVALID');
  if (verification.verificationId !== verificationIdFor(normalized)) fail('VERIFICATION_ID_MISMATCH');
  return normalized;
}

export const SELFDEV_CANONICAL_PROMOTION_TARGET_PATH = TARGET_PATH;
