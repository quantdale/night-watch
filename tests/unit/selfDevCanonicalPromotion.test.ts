import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  SELFDEV_AUTHORITATIVE_PATHS,
  runSyntheticSelfDevSession,
  type SelfDevSessionReport,
} from '../../src/core/selfDev';
import { SelfDevPrivateArtifactStore } from '../../src/core/selfDev/storage';
import { currentCheckoutState } from '../../src/core/provenance/localGit';
import { planAdoption } from '../../src/core/selfDevSandbox/planner';
import { runSandboxAdoption } from '../../src/core/selfDevSandbox/sandboxExecutor';
import { SelfDevAdoptionPlanStore, SelfDevAdoptionResultStore } from '../../src/core/selfDevSandbox/storage';
import type { SelfDevAdoptionPlan, SelfDevAdoptionSandboxResult } from '../../src/core/selfDevSandbox/types';
import {
  applyPromotion,
  approvePromotion,
  preparePromotion,
  verifyCanonicalPromotion,
  SelfDevCanonicalPromotionValidationError,
  validateCanonicalApplyReceipt,
  validateCanonicalPromotionApproval,
  validateCanonicalPromotionIntent,
  validateCanonicalPromotionVerification,
  SelfDevCanonicalApplyReceiptStore,
  SelfDevCanonicalPromotionApprovalStore,
  SelfDevCanonicalPromotionIntentStore,
  SelfDevCanonicalPromotionVerificationStore,
} from '../../src/core/selfDevPromotion';

function gitEnvironment(root: string): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Nightwatch Synthetic',
    GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
    GIT_COMMITTER_NAME: 'Nightwatch Synthetic',
    GIT_COMMITTER_EMAIL: 'synthetic@example.invalid',
    GIT_OPTIONAL_LOCKS: '0',
  };
}

function git(root: string, args: readonly string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], {
    cwd: root, env: gitEnvironment(root), shell: false, encoding: 'utf8', timeout: 10_000, maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) throw new Error(`GIT_TEST_FAILED:${args.join('_')}:${result.stderr ?? ''}`);
  return (result.stdout ?? '').trim();
}

function makeGitRepo(): string {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-canonical-promotion-schema-git-'));
  for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
    const source = path.join(process.cwd(), relative);
    const destination = path.join(repository, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  git(repository, ['init', '--quiet']);
  git(repository, ['add', '--all']);
  git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic baseline']);
  return repository;
}

function freshRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-canonical-promotion-schema-${prefix}-`));
}

const anchorPath = path.join(process.cwd(), 'package.json');

/** One full, real, valid promotion/approval/receipt/verification tuple built through the actual production functions, for mutation-based forgery-resistance tests below. */
function buildRealTuple() {
  const repository = makeGitRepo();
  const artifactStore = new SelfDevPrivateArtifactStore({ root: freshRoot('artifact') });
  const current = currentCheckoutState({ repositoryRoot: repository });
  const report: SelfDevSessionReport = runSyntheticSelfDevSession({
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

  const plan: SelfDevAdoptionPlan = planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore });
  const planStore = new SelfDevAdoptionPlanStore({ root: freshRoot('plan') });
  planStore.writePlan(plan);

  const result: SelfDevAdoptionSandboxResult = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore });
  const resultStore = new SelfDevAdoptionResultStore({ root: freshRoot('result') });
  resultStore.writeResult(result);

  const promotionStore = new SelfDevCanonicalPromotionIntentStore({ root: freshRoot('promotion') });
  const promotion = preparePromotion({
    artifactId: report.artifactId, candidateId: passEvaluation.candidateId,
    adoptionPlanId: plan.planId, sandboxResultId: result.resultId,
    repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore, planStore, resultStore,
    promotionStore,
  });
  const approvalStore = new SelfDevCanonicalPromotionApprovalStore({ root: freshRoot('approval') });
  const approval = approvePromotion({
    promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
    promotionStore, approvalStore,
  });
  const receiptStore = new SelfDevCanonicalApplyReceiptStore({ root: freshRoot('receipt') });
  const receipt = applyPromotion({
    promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
    planStore, approvalStore, receiptStore, promotionStore,
  });
  const verificationStore = new SelfDevCanonicalPromotionVerificationStore({ root: freshRoot('verification') });
  const verification = verifyCanonicalPromotion({
    promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
    planStore, sandboxResultStore: resultStore, receiptStore, verificationStore, promotionStore,
  });
  return { promotion, approval, receipt, verification };
}

test.describe('Phase 8B.1 canonical promotion — schema and identity validation', () => {
  test('a full real chain validates and every record is exact-key, content-addressed, and carries fixed authority markers', () => {
    const { promotion, approval, receipt, verification } = buildRealTuple();

    expect(validateCanonicalPromotionIntent(promotion)).toEqual(promotion);
    expect(validateCanonicalPromotionApproval(approval)).toEqual(approval);
    expect(validateCanonicalApplyReceipt(receipt)).toEqual(receipt);
    expect(validateCanonicalPromotionVerification(verification)).toEqual(verification);

    expect(promotion.runtimeGitWrites).toBe(0);
    expect(promotion.externalCalls).toBe(0);
    expect(promotion.publication).toBe('PROHIBITED');
    expect(approval.runtimeGitWrites).toBe(0);
    expect(receipt.canonicalSourceWrites).toBe(1);
    expect(receipt.runtimeGitWrites).toBe(0);
    expect(receipt.gitCommitStatus).toBe('NOT_PERFORMED_BY_RUNTIME');
    expect(verification.canonicalSourceWrites).toBe(0);
    expect(verification.runtimeGitWrites).toBe(0);
    expect(verification.runtimeGitCommit).toBe('NOT_AUTHORIZED');

    for (const [record, validator] of [
      [promotion, validateCanonicalPromotionIntent],
      [approval, validateCanonicalPromotionApproval],
      [receipt, validateCanonicalApplyReceipt],
      [verification, validateCanonicalPromotionVerification],
    ] as const) {
      expect(() => (validator as (value: unknown) => unknown)({ ...record, unknownExtraField: 'x' })).toThrow(SelfDevCanonicalPromotionValidationError);
      const { schemaVersion: _dropped, ...missingSchema } = record as unknown as Record<string, unknown>;
      expect(() => (validator as (value: unknown) => unknown)(missingSchema)).toThrow(SelfDevCanonicalPromotionValidationError);
    }
  });

  test('promotion intent: preimage/postimage must differ and the expected post digest must differ from the pre digest', () => {
    const { promotion } = buildRealTuple();
    expect(() => validateCanonicalPromotionIntent({ ...promotion, targetPostimageDigest: promotion.targetPreimageDigest })).toThrow(/ID_MISMATCH|NO_ACTUAL_CHANGE/);
    expect(() => validateCanonicalPromotionIntent({ ...promotion, promotionId: `canonical-promotion:sha256:${'0'.repeat(64)}` })).toThrow(/INTENT_ID_MISMATCH/);
    expect(() => validateCanonicalPromotionIntent({ ...promotion, maximumCanonicalSourceWrites: 2 })).toThrow();
    expect(() => validateCanonicalPromotionIntent({ ...promotion, runtimeGitWrites: 1 })).toThrow();
    expect(() => validateCanonicalPromotionIntent({ ...promotion, publication: 'ALLOWED' })).toThrow();
  });

  test('approval: exact schema/class/authority fields cannot be forged around a recomputed ID', () => {
    const { approval } = buildRealTuple();
    expect(() => validateCanonicalPromotionApproval({ ...approval, maximumApplications: 2 })).toThrow();
    expect(() => validateCanonicalPromotionApproval({ ...approval, approvalClass: 'OWNER_IMPLICIT' })).toThrow();
    expect(() => validateCanonicalPromotionApproval({ ...approval, canonicalSourceWriteAuthority: 'ANY_FILE' })).toThrow();
    expect(() => validateCanonicalPromotionApproval({ ...approval, runtimeGitWrites: 1 })).toThrow();
    expect(() => validateCanonicalPromotionApproval({ ...approval, approvalId: `canonical-promotion-approval:sha256:${'1'.repeat(64)}` })).toThrow(/APPROVAL_ID_MISMATCH/);
  });

  test('apply receipt: an APPLIED outcome requires the observed digest/changeset invariant even with a recomputed ID', () => {
    const { receipt } = buildRealTuple();
    const forged = { ...receipt, observedTargetPostimageDigest: receipt.targetPreimageDigest };
    expect(() => validateCanonicalApplyReceipt(forged)).toThrow(/RECEIPT_APPLIED_INVARIANT|RECEIPT_ID_MISMATCH/);
    const forgedChangeset = { ...receipt, observedChangedFiles: [receipt.targetPath, 'unexpected/extra.ts'] };
    expect(() => validateCanonicalApplyReceipt(forgedChangeset)).toThrow(/RECEIPT_APPLIED_INVARIANT|RECEIPT_ID_MISMATCH/);
    expect(() => validateCanonicalApplyReceipt({ ...receipt, canonicalSourceWrites: 0 })).toThrow();
    expect(() => validateCanonicalApplyReceipt({ ...receipt, gitCommitStatus: 'PERFORMED_BY_RUNTIME' })).toThrow();
  });

  test('verification: a claimed VERIFIED_UNCOMMITTED status requires all four probes PASS and real pre/post divergence', () => {
    const { verification } = buildRealTuple();
    expect(() => validateCanonicalPromotionVerification({ ...verification, nonOverreachResult: 'NOT_RUN' })).toThrow(/VERIFICATION_VERIFIED_INVARIANT|VERIFICATION_ID_MISMATCH/);
    expect(() => validateCanonicalPromotionVerification({ ...verification, unsafeRegressionResult: 'FAIL' })).toThrow(/VERIFICATION_VERIFIED_INVARIANT|VERIFICATION_ID_MISMATCH/);
    expect(() => validateCanonicalPromotionVerification({ ...verification, postSourceBundleDigest: verification.preSourceBundleDigest })).toThrow(/VERIFICATION_VERIFIED_INVARIANT|VERIFICATION_ID_MISMATCH/);
    expect(() => validateCanonicalPromotionVerification({ ...verification, observedChangedFiles: [verification.targetPath, 'unexpected/extra.ts'] })).toThrow(/VERIFICATION_VERIFIED_INVARIANT|VERIFICATION_ID_MISMATCH/);
    expect(() => validateCanonicalPromotionVerification({ ...verification, runtimeGitCommit: 'PERFORMED' })).toThrow();
    expect(() => validateCanonicalPromotionVerification({ ...verification, canonicalSourceWrites: 1 })).toThrow();
  });
});
