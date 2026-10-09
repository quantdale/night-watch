// ---------------------------------------------------------------------------
// NW-AUD-011 — canonical promotion apply is serialized per TRANSACTION, not
// merely per approval ID.
//
// The one-shot gate in `apply.ts` is keyed by APPROVAL ID. Two distinct
// approvals prepared from the same clean preimage could therefore each pass
// preflight, each consume their own approval, and each write the one canonical
// catalog — and an interruption could leave a consumed approval and a changed
// target behind with no terminal receipt.
//
// The apply transaction is now claimed through a DURABLE EXCLUSIVE identity
// (one canonical repository, one checkout, one target, one preimage) BEFORE
// the approval is consumed and before the write. The identity deliberately
// contains neither the approval ID nor the postimage, so a second concurrent
// apply — even with a DIFFERENT approval — collides with the first instead of
// racing it.
//
// Everything here runs against a committed synthetic source fixture; the real
// Nightwatch checkout is never modified.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  canonicalApplyTransactionIdFor,
} from '../../src/core/selfDevPromotion';
import {
  createSyntheticSelfDevSourceFixture,
  type SelfDevSourceFixture,
} from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack, type SelfDevStack } from '../helpers/selfDevStack';

const anchorPath = path.join(process.cwd(), 'package.json');

interface Audit011ApprovalStore {
  readonly store: { readonly root: string };
  claimApplyTransaction(transactionId: string, claim: { readonly approvalId: string; readonly promotionId: string }): void;
  readApplyTransaction(transactionId: string): { readonly transactionId: string; readonly approvalId: string; readonly promotionId: string };
  isApplyTransactionClaimed(transactionId: string): boolean;
  isApprovalConsumed(approvalId: string): boolean;
}

/** A thrown apply error, recognised by NAME rather than by prototype: the fixture loads a second copy of the module. */
function applyError(caught: unknown): { readonly message: string; readonly canonicalSourceWrites: number } {
  const candidate = caught as { name?: unknown; message?: unknown; canonicalSourceWrites?: unknown };
  if (candidate === null || typeof candidate !== 'object' || candidate.name !== 'SelfDevCanonicalPromotionApplyError') {
    throw new Error(`AUD011_EXPECTED_APPLY_ERROR: ${String(candidate?.message ?? caught)}`);
  }
  return {
    message: typeof candidate.message === 'string' ? candidate.message : '',
    canonicalSourceWrites: typeof candidate.canonicalSourceWrites === 'number' ? candidate.canonicalSourceWrites : -1,
  };
}

function freshRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-aud011-${prefix}-`));
}

function makeFixture(): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY', 'aud011');
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

interface PreparedPromotion {
  readonly promotionId: string;
  readonly approvalId: string;
  readonly approvalStoreRoot: string;
  readonly approvalStore: Audit011ApprovalStore;
  readonly promotionStore: unknown;
  readonly planStore: unknown;
  readonly receiptStore: unknown;
  readonly targetPath: string;
  readonly preimageBytes: string;
  readonly preimageDigest: string;
}

/**
 * Prepare a promotion AND its owner approval WITHOUT applying it. The tree
 * stays clean and the target keeps its preimage, which is exactly the state
 * two concurrent applies would each independently reach.
 */
function prepareApprovedPromotion(stack: SelfDevStack, repository: string): PreparedPromotion {
  const artifactStore = new stack.SelfDevPrivateArtifactStore({ root: freshRoot('artifact') });
  const current = stack.currentCheckoutState({ repositoryRoot: repository });
  const report = stack.runSyntheticSelfDevSession({
    provenance: {
      schemaVersion: 'nightwatch.selfdev-provenance.private.v1', gitHeadSha: current.gitHeadSha,
      sourceBundleDigest: current.sourceBundleDigest, contractDigest: current.contractDigest,
      algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1', authoritativeSourceState: 'CLEAN',
      runtimeNodeVersion: process.versions.node, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
    },
    artifactStore,
  });
  const passEvaluation = report.evaluations.find((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (passEvaluation === undefined) throw new Error('TEST_NO_PASS_CANDIDATE');

  const plan = stack.planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore });
  const planStore = new stack.SelfDevAdoptionPlanStore({ root: freshRoot('plan') });
  planStore.writePlan(plan);

  const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore });
  const resultStore = new stack.SelfDevAdoptionResultStore({ root: freshRoot('result') });
  resultStore.writeResult(result);

  const promotionStore = new stack.SelfDevCanonicalPromotionIntentStore({ root: freshRoot('promotion') });
  const promotion = stack.preparePromotion({
    artifactId: report.artifactId, candidateId: passEvaluation.candidateId,
    adoptionPlanId: plan.planId, sandboxResultId: result.resultId,
    repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore, planStore, resultStore,
    promotionStore,
  });
  const approvalStoreRoot = freshRoot('approval');
  const approvalStore = new stack.SelfDevCanonicalPromotionApprovalStore({ root: approvalStoreRoot }) as unknown as Audit011ApprovalStore;
  const approval = stack.approvePromotion({
    promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
    promotionStore, approvalStore,
  });
  const receiptStore = new stack.SelfDevCanonicalApplyReceiptStore({ root: freshRoot('receipt') });
  const targetPath = path.join(repository, promotion.targetPath);
  return {
    promotionId: promotion.promotionId,
    approvalId: approval.approvalId,
    approvalStoreRoot,
    approvalStore, promotionStore, planStore, receiptStore,
    targetPath,
    preimageBytes: fs.readFileSync(targetPath, 'utf8'),
    preimageDigest: promotion.targetPreimageDigest,
  };
}

/** A second store instance over the SAME root stands in for a concurrent process. */
function concurrentApprovalStore(prepared: PreparedPromotion, stack: SelfDevStack): Audit011ApprovalStore {
  return new stack.SelfDevCanonicalPromotionApprovalStore({ root: prepared.approvalStoreRoot }) as unknown as Audit011ApprovalStore;
}

function transactionIdFor(repository: string, headSha: string, targetPath: string, preimageDigest: string): string {
  return canonicalApplyTransactionIdFor({
    repositoryRoot: fs.realpathSync(repository),
    headSha,
    targetPath,
    targetPreimageDigest: preimageDigest,
  });
}

const TARGET_RELATIVE_PATH = 'src/core/selfDev/adoptedCaseCatalog.generated.ts';

test.describe('NW-AUD-011 canonical apply is serialized per transaction, not per approval ID', () => {
  test('the transaction identity is the transaction, never the approval or the postimage', () => {
    const identity = canonicalApplyTransactionIdFor({
      repositoryRoot: '/synthetic/repository',
      headSha: 'a'.repeat(40),
      targetPath: TARGET_RELATIVE_PATH,
      targetPreimageDigest: `sha256:${'1'.repeat(64)}`,
    });
    // Deterministic, and independent of any approval or postimage, so two
    // DISTINCT approvals for the same transaction collide by construction.
    expect(canonicalApplyTransactionIdFor({
      repositoryRoot: '/synthetic/repository',
      headSha: 'a'.repeat(40),
      targetPath: TARGET_RELATIVE_PATH,
      targetPreimageDigest: `sha256:${'1'.repeat(64)}`,
    })).toBe(identity);
    expect(identity).toMatch(/^canonical-apply-transaction:[0-9a-f]{64}$/);

    // Any change to the repository, the checkout, the target or the preimage is
    // a different transaction.
    for (const overrides of [
      { repositoryRoot: '/synthetic/other-repository' },
      { headSha: 'b'.repeat(40) },
      { targetPath: 'src/core/selfDev/other.ts' },
      { targetPreimageDigest: `sha256:${'2'.repeat(64)}` },
    ]) {
      expect(canonicalApplyTransactionIdFor({
        repositoryRoot: '/synthetic/repository',
        headSha: 'a'.repeat(40),
        targetPath: TARGET_RELATIVE_PATH,
        targetPreimageDigest: `sha256:${'1'.repeat(64)}`,
        ...overrides,
      })).not.toBe(identity);
    }
  });

  test('the durable transaction claim is exclusive, exactly-once and records the first claimant', () => {
    const { stack } = makeFixture();
    const root = freshRoot('store');
    const first = new stack.SelfDevCanonicalPromotionApprovalStore({ root }) as unknown as Audit011ApprovalStore;
    const second = new stack.SelfDevCanonicalPromotionApprovalStore({ root }) as unknown as Audit011ApprovalStore;
    const transactionId = `canonical-apply-transaction:${'a'.repeat(64)}`;
    const otherTransactionId = `canonical-apply-transaction:${'b'.repeat(64)}`;
    const unknownTransactionId = `canonical-apply-transaction:${'c'.repeat(64)}`;

    expect(first.isApplyTransactionClaimed(transactionId)).toBe(false);
    first.claimApplyTransaction(transactionId, { approvalId: 'approval-one', promotionId: 'promotion-one' });
    expect(first.isApplyTransactionClaimed(transactionId)).toBe(true);
    expect(second.isApplyTransactionClaimed(transactionId)).toBe(true);

    // A second claimant — concurrent process, DISTINCT approval — is refused.
    expect(() => second.claimApplyTransaction(transactionId, { approvalId: 'approval-two', promotionId: 'promotion-two' }))
      .toThrow('SELFDEV_CANONICAL_PROMOTION_TRANSACTION_ALREADY_CLAIMED');
    // The first claimant's record survives: the loser never overwrote it.
    expect(second.readApplyTransaction(transactionId)).toEqual({
      transactionId,
      approvalId: 'approval-one',
      promotionId: 'promotion-one',
    });

    // A different transaction is still claimable; exclusivity is per identity.
    expect(() => second.claimApplyTransaction(otherTransactionId, { approvalId: 'approval-two', promotionId: 'promotion-two' })).not.toThrow();
    expect(() => first.readApplyTransaction(unknownTransactionId))
      .toThrow('SELFDEV_CANONICAL_PROMOTION_TRANSACTION_NOT_FOUND');
  });

  test('a successful apply records its transaction identity and consumes its approval exactly once', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const prepared = prepareApprovedPromotion(stack, repository);
      const headSha = stack.currentCheckoutState({ repositoryRoot: repository }).currentHeadSha;
      const transactionId = transactionIdFor(repository, headSha, TARGET_RELATIVE_PATH, prepared.preimageDigest);

      const receipt = stack.applyPromotion({
        promotionId: prepared.promotionId, approvalId: prepared.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        planStore: prepared.planStore, approvalStore: prepared.approvalStore, receiptStore: prepared.receiptStore, promotionStore: prepared.promotionStore,
      });
      expect(receipt.canonicalSourceWrites).toBe(1);

      // The durable transaction identity now exists and names the winner.
      expect(prepared.approvalStore.isApplyTransactionClaimed(transactionId)).toBe(true);
      expect(prepared.approvalStore.readApplyTransaction(transactionId).approvalId).toBe(prepared.approvalId);
      expect(prepared.approvalStore.readApplyTransaction(transactionId).promotionId).toBe(prepared.promotionId);

      // The pre-existing approval one-shot is preserved: the tree is now dirty
      // in exactly the target file, so a repeat reports the consumed approval
      // rather than being masked by the expected post-write dirtiness.
      let caught: unknown;
      try {
        stack.applyPromotion({
          promotionId: prepared.promotionId, approvalId: prepared.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
          planStore: prepared.planStore, approvalStore: prepared.approvalStore, receiptStore: prepared.receiptStore, promotionStore: prepared.promotionStore,
        });
      } catch (error) {
        caught = error;
      }
      const failure = applyError(caught);
      expect(failure.message).toBe('SELFDEV_CANONICAL_PROMOTION_APPROVAL_ALREADY_CONSUMED');
      expect(failure.canonicalSourceWrites).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('a transaction already claimed by another apply is refused before the approval is consumed and before any write', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const prepared = prepareApprovedPromotion(stack, repository);
      const headSha = stack.currentCheckoutState({ repositoryRoot: repository }).currentHeadSha;
      // Another process holds the exclusive transaction authority for this
      // exact repository/checkout/target preimage. Its own approval ID is
      // DIFFERENT, which is precisely the race the per-approval-ID one-shot
      // gate could not see.
      const other = concurrentApprovalStore(prepared, stack);
      other.claimApplyTransaction(transactionIdFor(repository, headSha, TARGET_RELATIVE_PATH, prepared.preimageDigest), {
        approvalId: `approval:${'d'.repeat(64)}`,
        promotionId: `promotion:${'e'.repeat(64)}`,
      });

      // The refused apply performs ZERO canonical source writes.
      let caught: unknown;
      try {
        stack.applyPromotion({
          promotionId: prepared.promotionId, approvalId: prepared.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
          planStore: prepared.planStore, approvalStore: prepared.approvalStore, receiptStore: prepared.receiptStore, promotionStore: prepared.promotionStore,
        });
      } catch (error) {
        caught = error;
      }
      const failure = applyError(caught);
      expect(failure.message).toBe('SELFDEV_CANONICAL_PROMOTION_TRANSACTION_ALREADY_CLAIMED');
      expect(failure.canonicalSourceWrites).toBe(0);

      // The target is byte-identical to the preimage: nothing was written.
      expect(fs.readFileSync(prepared.targetPath, 'utf8')).toBe(prepared.preimageBytes);
      // The refused apply did not burn this approval: it is still available.
      expect(other.isApprovalConsumed(prepared.approvalId)).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  test('restoring the preimage and a clean tree does not reopen a claimed transaction', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const prepared = prepareApprovedPromotion(stack, repository);
      const headSha = stack.currentCheckoutState({ repositoryRoot: repository }).currentHeadSha;
      const transactionId = transactionIdFor(repository, headSha, TARGET_RELATIVE_PATH, prepared.preimageDigest);

      // One successful apply, then the preimage restored so the whole
      // preflight would pass again. Before the fix this was the second write.
      stack.applyPromotion({
        promotionId: prepared.promotionId, approvalId: prepared.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        planStore: prepared.planStore, approvalStore: prepared.approvalStore, receiptStore: prepared.receiptStore, promotionStore: prepared.promotionStore,
      });
      fs.writeFileSync(prepared.targetPath, prepared.preimageBytes, 'utf8');
      expect(stack.currentCheckoutState({ repositoryRoot: repository }).authoritativeSourceState).toBe('CLEAN');

      // The transaction authority is still held, so the claim — not the
      // approval one-shot — is what refuses a second write attempt.
      expect(prepared.approvalStore.isApplyTransactionClaimed(transactionId)).toBe(true);
      // And the transaction record names the applicant that actually ran.
      expect(prepared.approvalStore.readApplyTransaction(transactionId).approvalId).toBe(prepared.approvalId);
    } finally {
      fixture.cleanup();
    }
  });
});
