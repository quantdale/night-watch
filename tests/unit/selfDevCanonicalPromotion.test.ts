import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  SelfDevCanonicalPromotionValidationError,
  validateCanonicalApplyReceipt,
  validateCanonicalPromotionApproval,
  validateCanonicalPromotionIntent,
  validateCanonicalPromotionVerification,
} from '../../src/core/selfDevPromotion';
import {
  createSyntheticSelfDevSourceFixture,
  type SelfDevSourceFixture,
} from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack, type SelfDevStack } from '../helpers/selfDevStack';

function freshRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-canonical-promotion-schema-${prefix}-`));
}

const anchorPath = path.join(process.cwd(), 'package.json');

/**
 * Phase 8B.1.0 baseline fixture: an explicit EXPAND_ONLY adopted-catalog
 * source repo with the FULL selfDev stack (session, replay, eligibility,
 * planner, sandbox executor, promotion) loaded from it. The selected
 * portfolio candidate is EXPAND_THEN_COLLAPSE (variant B), proving the
 * promotion machinery consumes the fallback candidate. Every step of the
 * chain shares one explicit catalog state regardless of the checkout the
 * test process runs in.
 */
function makeFixture(): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

/** One full, real, valid promotion/approval/receipt/verification tuple built through the actual production functions, for mutation-based forgery-resistance tests below. */
function buildRealTuple(stack: SelfDevStack, repository: string) {
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
  const approvalStore = new stack.SelfDevCanonicalPromotionApprovalStore({ root: freshRoot('approval') });
  const approval = stack.approvePromotion({
    promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
    promotionStore, approvalStore,
  });
  const receiptStore = new stack.SelfDevCanonicalApplyReceiptStore({ root: freshRoot('receipt') });
  const receipt = stack.applyPromotion({
    promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
    planStore, approvalStore, receiptStore, promotionStore,
  });
  const verificationStore = new stack.SelfDevCanonicalPromotionVerificationStore({ root: freshRoot('verification') });
  const verification = stack.verifyCanonicalPromotion({
    promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
    planStore, sandboxResultStore: resultStore, receiptStore, verificationStore, promotionStore,
  });
  return { promotion, approval, receipt, verification };
}

test.describe('Phase 8B.1 canonical promotion — schema and identity validation', () => {
  test('a full real chain validates and every record is exact-key, content-addressed, and carries fixed authority markers', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { promotion, approval, receipt, verification } = buildRealTuple(stack, repository);

      expect(() => validateCanonicalPromotionIntent(promotion)).not.toThrow();
      expect(() => validateCanonicalPromotionApproval(approval)).not.toThrow();
      expect(() => validateCanonicalApplyReceipt(receipt)).not.toThrow();
      expect(() => validateCanonicalPromotionVerification(verification)).not.toThrow();

      expect(promotion.canonicalAuthority).toBe('OWNER_GATED_ONE_FILE_ONLY');
      expect(promotion.maximumCanonicalSourceWrites).toBe(1);
      expect(approval.maximumApplications).toBe(1);
      expect(receipt.canonicalSourceWrites).toBe(1);
      expect(receipt.runtimeGitWrites).toBe(0);
      expect(receipt.gitCommitStatus).toBe('NOT_PERFORMED_BY_RUNTIME');
      expect(verification.verificationStatus).toBe('CANONICAL_APPLIED_VERIFIED_UNCOMMITTED');
      expect(verification.runtimeGitCommit).toBe('NOT_AUTHORIZED');
      expect(promotion.promotionId).toMatch(/^canonical-promotion:sha256:[0-9a-f]{64}$/);
      expect(approval.approvalId).toMatch(/^canonical-promotion-approval:sha256:[0-9a-f]{64}$/);
      expect(receipt.receiptId).toMatch(/^canonical-apply-receipt:sha256:[0-9a-f]{64}$/);
      expect(verification.verificationId).toMatch(/^canonical-promotion-verification:sha256:[0-9a-f]{64}$/);
    } finally {
      fixture.cleanup();
    }
  });

  test('promotion intent: preimage/postimage must differ and the expected post digest must differ from the pre digest', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { promotion } = buildRealTuple(stack, repository);
      expect(promotion.targetPreimageDigest).not.toBe(promotion.targetPostimageDigest);
      expect(promotion.expectedPostSourceBundleDigest).not.toBe(promotion.targetPreimageDigest);
    } finally {
      fixture.cleanup();
    }
  });

  test('approval: exact schema/class/authority fields cannot be forged around a recomputed ID', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { approval } = buildRealTuple(stack, repository);
      const forged = { ...approval, maximumApplications: 2 } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalPromotionApproval(forged)).toThrow(SelfDevCanonicalPromotionValidationError);
      const forgedAuthority = { ...approval, canonicalAuthority: 'UNLIMITED_WRITES' } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalPromotionApproval(forgedAuthority)).toThrow(SelfDevCanonicalPromotionValidationError);
    } finally {
      fixture.cleanup();
    }
  });

  test('apply receipt: an APPLIED outcome requires the observed digest/changeset invariant even with a recomputed ID', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { receipt } = buildRealTuple(stack, repository);
      const forged = { ...receipt, applyOutcome: 'APPLIED', observedChangedFiles: [] } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalApplyReceipt(forged)).toThrow(SelfDevCanonicalPromotionValidationError);
      const forgedDigest = { ...receipt, observedTargetPostimageDigest: receipt.targetPostimageDigest.slice(0, -2) + '00' } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalApplyReceipt(forgedDigest)).toThrow(SelfDevCanonicalPromotionValidationError);
    } finally {
      fixture.cleanup();
    }
  });

  test('verification: a claimed VERIFIED_UNCOMMITTED status requires all four probes PASS and real pre/post divergence', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { verification } = buildRealTuple(stack, repository);
      const forgedProbe = { ...verification, postEquivalentResult: 'FAIL' } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalPromotionVerification(forgedProbe)).toThrow(SelfDevCanonicalPromotionValidationError);
      const forgedDivergence = { ...verification, preContractDigest: verification.postContractDigest } as unknown as Record<string, unknown>;
      expect(() => validateCanonicalPromotionVerification(forgedDivergence)).toThrow(SelfDevCanonicalPromotionValidationError);
    } finally {
      fixture.cleanup();
    }
  });
});
