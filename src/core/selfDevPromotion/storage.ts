// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1 — private immutable canonical-promotion storage.
//
// Exact-ID, atomic, no-replace. There is no list/enumeration/latest lookup
// and no replacement-capable write path anywhere in this module — mirrors
// the Phase 8B sandbox storage convention (src/core/selfDevSandbox/storage.ts).
// ---------------------------------------------------------------------------

import path from 'node:path';
import { PrivateArtifactStore, privateArtifactRoot } from '../policy/privateArtifacts';
import {
  approvalIdFor,
  promotionIdFor,
  receiptIdFor,
  validateCanonicalApplyReceipt,
  validateCanonicalPromotionApproval,
  validateCanonicalPromotionIntent,
  validateCanonicalPromotionVerification,
  verificationIdFor,
} from './validation';
import type {
  SelfDevCanonicalApplyReceipt,
  SelfDevCanonicalPromotionApproval,
  SelfDevCanonicalPromotionIntent,
  SelfDevCanonicalPromotionVerification,
} from './types';

export const SELFDEV_CANONICAL_PROMOTION_NAMESPACE = 'selfdev-canonical-promotion' as const;

export interface SelfDevCanonicalPromotionStoreOptions {
  readonly root?: string;
  readonly readOnly?: boolean;
}

function safeFileName(id: string, prefix: string): string {
  const mapped = id.replace(/:/g, '-');
  return `${prefix}-${mapped}.json`;
}

function stripStatus(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const { status: _status, ...rest } = value as Record<string, unknown>;
    return rest;
  }
  return value;
}

export class SelfDevCanonicalPromotionIntentStore {
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevCanonicalPromotionStoreOptions = {}) {
    this.store = new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_CANONICAL_PROMOTION_NAMESPACE, 'promotions'),
      createIfMissing: options.readOnly !== true,
    });
  }

  /** Idempotent on an exact duplicate; throws on a same-ID content conflict. */
  writePromotion(promotion: SelfDevCanonicalPromotionIntent): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(promotion.promotionId, 'promotion');
    try {
      this.store.writeImmutableJson(fileName, promotion);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateCanonicalPromotionIntent(stripStatus(this.store.readJson(fileName)));
        if (existing.promotionId !== promotion.promotionId || JSON.stringify(existing) !== JSON.stringify(promotion)) {
          throw new Error('SELFDEV_CANONICAL_PROMOTION_INTENT_CONFLICT');
        }
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  /** Exact promotion ID only. No list, latest, or enumeration. */
  readPromotion(promotionId: string): SelfDevCanonicalPromotionIntent {
    const fileName = safeFileName(promotionId, 'promotion');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_CANONICAL_PROMOTION_NOT_FOUND');
    const promotion = validateCanonicalPromotionIntent(stripStatus(raw));
    if (promotion.promotionId !== promotionId) throw new Error('SELFDEV_CANONICAL_PROMOTION_ID_MISMATCH');
    return promotion;
  }
}

export class SelfDevCanonicalPromotionApprovalStore {
  readonly store: PrivateArtifactStore;
  private readonly consumptionStore: PrivateArtifactStore;

  constructor(options: SelfDevCanonicalPromotionStoreOptions = {}) {
    const namespaceRoot = options.root ?? path.join(privateArtifactRoot(), SELFDEV_CANONICAL_PROMOTION_NAMESPACE);
    this.store = new PrivateArtifactStore({
      root: path.join(namespaceRoot, 'approvals'),
      createIfMissing: options.readOnly !== true,
    });
    this.consumptionStore = new PrivateArtifactStore({
      root: path.join(namespaceRoot, 'approval-consumption'),
      createIfMissing: options.readOnly !== true,
    });
  }

  writeApproval(approval: SelfDevCanonicalPromotionApproval): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(approval.approvalId, 'approval');
    try {
      this.store.writeImmutableJson(fileName, approval);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateCanonicalPromotionApproval(stripStatus(this.store.readJson(fileName)));
        if (existing.approvalId !== approval.approvalId || JSON.stringify(existing) !== JSON.stringify(approval)) {
          throw new Error('SELFDEV_CANONICAL_PROMOTION_APPROVAL_CONFLICT');
        }
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  readApproval(approvalId: string): SelfDevCanonicalPromotionApproval {
    const fileName = safeFileName(approvalId, 'approval');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_CANONICAL_PROMOTION_APPROVAL_NOT_FOUND');
    const approval = validateCanonicalPromotionApproval(stripStatus(raw));
    if (approval.approvalId !== approvalId) throw new Error('SELFDEV_CANONICAL_PROMOTION_APPROVAL_ID_MISMATCH');
    return approval;
  }

  /**
   * The one-shot consumption gate (§27/§28 of the Phase 8B.1 mandate).
   * Atomic no-replace: exactly one caller may ever successfully claim an
   * approval, cross-bound to its exact promotion ID. A second claim attempt
   * — even from a concurrent process — fails with
   * `SELFDEV_CANONICAL_PROMOTION_APPROVAL_ALREADY_CONSUMED` and performs no
   * canonical source write. There is no reset/delete path.
   */
  claimApprovalConsumption(approvalId: string, promotionId: string): void {
    const fileName = safeFileName(approvalId, 'consumed');
    try {
      this.consumptionStore.writeImmutableJson(fileName, { approvalId, promotionId, consumed: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        throw new Error('SELFDEV_CANONICAL_PROMOTION_APPROVAL_ALREADY_CONSUMED');
      }
      throw error;
    }
  }

  isApprovalConsumed(approvalId: string): boolean {
    return this.consumptionStore.readJson(safeFileName(approvalId, 'consumed')) !== null;
  }
}

export class SelfDevCanonicalApplyReceiptStore {
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevCanonicalPromotionStoreOptions = {}) {
    this.store = new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_CANONICAL_PROMOTION_NAMESPACE, 'receipts'),
      createIfMissing: options.readOnly !== true,
    });
  }

  writeReceipt(receipt: SelfDevCanonicalApplyReceipt): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(receipt.receiptId, 'receipt');
    try {
      this.store.writeImmutableJson(fileName, receipt);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateCanonicalApplyReceipt(stripStatus(this.store.readJson(fileName)));
        if (existing.receiptId !== receipt.receiptId || JSON.stringify(existing) !== JSON.stringify(receipt)) {
          throw new Error('SELFDEV_CANONICAL_APPLY_RECEIPT_CONFLICT');
        }
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  readReceipt(receiptId: string): SelfDevCanonicalApplyReceipt {
    const fileName = safeFileName(receiptId, 'receipt');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_CANONICAL_APPLY_RECEIPT_NOT_FOUND');
    const receipt = validateCanonicalApplyReceipt(stripStatus(raw));
    if (receipt.receiptId !== receiptId) throw new Error('SELFDEV_CANONICAL_APPLY_RECEIPT_ID_MISMATCH');
    return receipt;
  }
}

export class SelfDevCanonicalPromotionVerificationStore {
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevCanonicalPromotionStoreOptions = {}) {
    this.store = new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_CANONICAL_PROMOTION_NAMESPACE, 'verifications'),
      createIfMissing: options.readOnly !== true,
    });
  }

  writeVerification(verification: SelfDevCanonicalPromotionVerification): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(verification.verificationId, 'verification');
    try {
      this.store.writeImmutableJson(fileName, verification);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateCanonicalPromotionVerification(stripStatus(this.store.readJson(fileName)));
        if (existing.verificationId !== verification.verificationId || JSON.stringify(existing) !== JSON.stringify(verification)) {
          throw new Error('SELFDEV_CANONICAL_PROMOTION_VERIFICATION_CONFLICT');
        }
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  readVerification(verificationId: string): SelfDevCanonicalPromotionVerification {
    const fileName = safeFileName(verificationId, 'verification');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_CANONICAL_PROMOTION_VERIFICATION_NOT_FOUND');
    const verification = validateCanonicalPromotionVerification(stripStatus(raw));
    if (verification.verificationId !== verificationId) throw new Error('SELFDEV_CANONICAL_PROMOTION_VERIFICATION_ID_MISMATCH');
    return verification;
  }
}

export { promotionIdFor, approvalIdFor, receiptIdFor, verificationIdFor };
