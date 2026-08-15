import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { runMetamorphicProbes } from '../../src/core/selfDev/metamorphicProbes';
import { loadSandboxModules } from '../../src/core/selfDevSandbox/sandboxLoader';
import type { SelfDevAdoptionPlan, SelfDevAdoptionSandboxResult } from '../../src/core/selfDevSandbox/types';
import {
  createSyntheticSelfDevSourceFixture,
  renderSyntheticCatalogSource,
  type SelfDevSourceFixture,
} from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack, type SelfDevStack } from '../helpers/selfDevStack';

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

function freshPrivateRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-canonical-promotion-${prefix}-`));
}

const anchorPath = path.join(process.cwd(), 'package.json');

/**
 * Phase 8B.1.0 baseline fixture: an explicit EXPAND_ONLY adopted-catalog
 * source repo with the FULL selfDev stack (session, replay, eligibility,
 * planner, sandbox executor, promotion) loaded from it — the selected
 * portfolio candidate is EXPAND_THEN_COLLAPSE (variant B). The whole chain
 * shares one explicit catalog state regardless of the checkout the test
 * process runs in. `marker` guarantees genuinely distinct commit trees (and
 * therefore distinct HEAD SHAs and downstream content-addressed IDs).
 */
function makeFixture(marker = 'default'): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY', marker);
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

interface EligibleFixture {
  readonly repository: string;
  readonly plan: SelfDevAdoptionPlan;
  readonly result: SelfDevAdoptionSandboxResult;
  readonly artifactStore: InstanceType<SelfDevStack['SelfDevPrivateArtifactStore']>;
  readonly planStore: InstanceType<SelfDevStack['SelfDevAdoptionPlanStore']>;
  readonly resultStore: InstanceType<SelfDevStack['SelfDevAdoptionResultStore']>;
}

/** Builds one full Phase 8B chain (eligible v2 session -> plan -> verified sandbox result) in an explicit EXPAND_ONLY synthetic repo, exactly like Phase 8B's own tests did but with an explicit adopted-catalog baseline. */
function buildEligibleFixture(stack: SelfDevStack, repository: string, marker = 'default'): EligibleFixture {
  const artifactStore = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot(`artifact-${marker}`) });
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

  const plan = stack.planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore }) as unknown as SelfDevAdoptionPlan;
  const planStore = new stack.SelfDevAdoptionPlanStore({ root: freshPrivateRoot(`plan-${marker}`) });
  planStore.writePlan(plan);

  const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore }) as unknown as SelfDevAdoptionSandboxResult;
  expect(result.adoptionStatus).toBe('SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED');
  const resultStore = new stack.SelfDevAdoptionResultStore({ root: freshPrivateRoot(`result-${marker}`) });
  resultStore.writeResult(result);

  return { repository, plan, result, artifactStore, planStore, resultStore };
}

interface PromotionStores {
  readonly promotionStore: InstanceType<SelfDevStack['SelfDevCanonicalPromotionIntentStore']>;
  readonly approvalStore: InstanceType<SelfDevStack['SelfDevCanonicalPromotionApprovalStore']>;
  readonly receiptStore: InstanceType<SelfDevStack['SelfDevCanonicalApplyReceiptStore']>;
  readonly verificationStore: InstanceType<SelfDevStack['SelfDevCanonicalPromotionVerificationStore']>;
}

function freshPromotionStores(stack: SelfDevStack, marker = 'default'): PromotionStores {
  return {
    promotionStore: new stack.SelfDevCanonicalPromotionIntentStore({ root: freshPrivateRoot(`promotion-${marker}`) }),
    approvalStore: new stack.SelfDevCanonicalPromotionApprovalStore({ root: freshPrivateRoot(`approval-${marker}`) }),
    receiptStore: new stack.SelfDevCanonicalApplyReceiptStore({ root: freshPrivateRoot(`receipt-${marker}`) }),
    verificationStore: new stack.SelfDevCanonicalPromotionVerificationStore({ root: freshPrivateRoot(`verification-${marker}`) }),
  };
}

test.describe('Phase 8B.1 owner-gated canonical promotion — full synthetic chain', () => {
  test('prepare -> approve -> apply -> verify -> commit proves exactly one canonical write, then currentness is COMMITTED_EXACT', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);

      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      expect(promotion.promotionId).toMatch(/^canonical-promotion:sha256:[0-9a-f]{64}$/);
      expect(promotion.canonicalAuthority).toBe('OWNER_GATED_ONE_FILE_ONLY');
      expect(promotion.maximumCanonicalSourceWrites).toBe(1);
      expect(promotion.runtimeGitWrites).toBe(0);

      // Deterministic: preparing again from the same exact evidence yields the same promotion ID.
      const again = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      expect(again.promotionId).toBe(promotion.promotionId);

      expect(() => stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'WRONG_TOKEN', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      })).toThrow(/APPROVAL_CONFIRMATION_INVALID/);

      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });
      expect(approval.approvalId).toMatch(/^canonical-promotion-approval:sha256:[0-9a-f]{64}$/);
      expect(approval.maximumApplications).toBe(1);

      const preApplyTargetStat = fs.lstatSync(path.join(repository, promotion.targetPath));

      const receipt = stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      });
      expect(receipt.applyOutcome).toBe('APPLIED');
      expect(receipt.canonicalSourceWrites).toBe(1);
      expect(receipt.runtimeGitWrites).toBe(0);
      expect(receipt.externalCalls).toBe(0);
      expect(receipt.gitCommitStatus).toBe('NOT_PERFORMED_BY_RUNTIME');
      expect(receipt.observedTargetPostimageDigest).toBe(promotion.targetPostimageDigest);

      const postApplyTargetStat = fs.lstatSync(path.join(repository, promotion.targetPath));
      expect(postApplyTargetStat.mode & 0o777).toBe(preApplyTargetStat.mode & 0o777);

      // Applying the SAME approval again must claim zero further canonical writes.
      expect(() => stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      })).toThrow(/APPROVAL_ALREADY_CONSUMED/);

      const verification = stack.verifyCanonicalPromotion({
        promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
        planStore: fixtureChain.planStore, sandboxResultStore: fixtureChain.resultStore, verificationStore: stores.verificationStore,
      });
      expect(verification.verificationStatus).toBe('CANONICAL_APPLIED_VERIFIED_UNCOMMITTED');
      expect(verification.postEquivalentResult).toBe('PASS');
      expect(verification.postVariantCoverageResult).toBe('PASS');
      expect(verification.nonOverreachResult).toBe('PASS');
      expect(verification.unsafeRegressionResult).toBe('PASS');
      expect(verification.canonicalSourceWrites).toBe(0);
      expect(verification.runtimeGitWrites).toBe(0);
      expect(verification.runtimeGitCommit).toBe('NOT_AUTHORIZED');

      // Development-session commit boundary (never performed by runtime code).
      git(repository, ['add', '--', promotion.targetPath]);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'canonical promotion']);
      const committedCurrent = stack.currentCheckoutState({ repositoryRoot: repository });
      expect(committedCurrent.sourceBundleDigest).toBe(promotion.expectedPostSourceBundleDigest);
      // `currentCheckoutState().contractDigest` reflects the STACK's own
      // (pre-commit) catalog module, not the just-committed postimage — the
      // same reason `verify` fresh-loads its contract module.
      // `verification.postContractDigest` was independently proven correct
      // via that fresh load, so it stands in for the synthetic repo's real
      // post-commit contract digest here.
      const committedCurrentForAssessment = { ...committedCurrent, contractDigest: verification.postContractDigest };

      const currentness = stack.assessCanonicalPromotionCurrentness({ verification, current: committedCurrentForAssessment });
      expect(currentness).toBe('CANONICAL_PROMOTION_COMMITTED_EXACT');

      // A documentation-only descendant commit remains a source-equivalent descendant.
      fs.writeFileSync(path.join(repository, 'DOCS_ONLY.md'), 'closure\n');
      git(repository, ['add', '--', 'DOCS_ONLY.md']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs closure']);
      const docsCurrent = stack.currentCheckoutState({ repositoryRoot: repository });
      const docsCurrentForAssessment = { ...docsCurrent, contractDigest: verification.postContractDigest };
      expect(stack.assessCanonicalPromotionCurrentness({ verification, current: docsCurrentForAssessment })).toBe('CANONICAL_PROMOTION_COMMITTED_SOURCE_EQUIVALENT_DESCENDANT');
    } finally {
      fixture.cleanup();
    }
  });

  test('the whole repository must be clean before prepare, approve, and apply', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);
      fs.writeFileSync(path.join(repository, 'untracked-noise.txt'), 'noise\n');

      expect(() => stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      })).toThrow();

      fs.unlinkSync(path.join(repository, 'untracked-noise.txt'));
      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });

      fs.writeFileSync(path.join(repository, 'another-noise.txt'), 'noise\n');
      expect(() => stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      })).toThrow();
      fs.unlinkSync(path.join(repository, 'another-noise.txt'));

      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });

      fs.writeFileSync(path.join(repository, 'yet-more-noise.txt'), 'noise\n');
      expect(() => stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      })).toThrow();
      expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);

      fs.unlinkSync(path.join(repository, 'yet-more-noise.txt'));
      const receipt = stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      });
      expect(receipt.applyOutcome).toBe('APPLIED');
    } finally {
      fixture.cleanup();
    }
  });

  test('apply requires the exact HEAD prepare ran against; a new commit blocks apply with zero writes', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);
      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });

      fs.writeFileSync(path.join(repository, 'DOCS_ADVANCE.md'), 'advance\n');
      git(repository, ['add', '--', 'DOCS_ADVANCE.md']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'unrelated docs advance']);

      expect(() => stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      })).toThrow(/PROMOTION_SOURCE_ADVANCED/);
      expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);

      // The pre-apply target bytes are the fixture's explicit EXPAND_ONLY
      // render (never the live checkout's catalog) — proving the write never
      // happened.
      const targetBytes = fs.readFileSync(path.join(repository, promotion.targetPath), 'utf8');
      expect(targetBytes).toBe(renderSyntheticCatalogSource('EXPAND_ONLY'));
    } finally {
      fixture.cleanup();
    }
  });

  test('an approval only authorizes its own exact promotion', () => {
    const fixtureA = makeFixture('fixture-a');
    const fixtureB = makeFixture('fixture-b');
    try {
      const chainA = buildEligibleFixture(fixtureA.stack, fixtureA.repository, 'fixture-a');
      const chainB = buildEligibleFixture(fixtureB.stack, fixtureB.repository, 'fixture-b');
      const storesA = freshPromotionStores(fixtureA.stack, 'fixture-a');
      const storesB = freshPromotionStores(fixtureB.stack, 'fixture-b');

      const promotionA = fixtureA.stack.preparePromotion({
        artifactId: chainA.plan.sourceSessionArtifactId, candidateId: chainA.plan.candidateId,
        adoptionPlanId: chainA.plan.planId, sandboxResultId: chainA.result.resultId,
        repositoryRoot: fixtureA.repository, nodeModulesAnchorPath: anchorPath, artifactStore: chainA.artifactStore,
        planStore: chainA.planStore, resultStore: chainA.resultStore, promotionStore: storesA.promotionStore,
      });
      const approvalA = fixtureA.stack.approvePromotion({
        promotionId: promotionA.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixtureA.repository,
        promotionStore: storesA.promotionStore, approvalStore: storesA.approvalStore,
      });

      const promotionB = fixtureB.stack.preparePromotion({
        artifactId: chainB.plan.sourceSessionArtifactId, candidateId: chainB.plan.candidateId,
        adoptionPlanId: chainB.plan.planId, sandboxResultId: chainB.result.resultId,
        repositoryRoot: fixtureB.repository, nodeModulesAnchorPath: anchorPath, artifactStore: chainB.artifactStore,
        planStore: chainB.planStore, resultStore: chainB.resultStore, promotionStore: storesB.promotionStore,
      });

      // Approval A cannot apply promotion B, even against B's own repository.
      expect(() => fixtureB.stack.applyPromotion({
        promotionId: promotionB.promotionId, approvalId: approvalA.approvalId, repositoryRoot: fixtureB.repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: storesB.promotionStore, approvalStore: storesA.approvalStore,
        planStore: chainB.planStore, receiptStore: storesB.receiptStore,
      })).toThrow(/WRONG_PROMOTION_FOR_APPROVAL/);
    } finally {
      fixtureA.fixture.cleanup();
      fixtureB.fixture.cleanup();
    }
  });

  test('a symlinked canonical target is rejected before any write', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);
      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });

      const targetAbsolute = path.join(repository, promotion.targetPath);
      const elsewhere = path.join(repository, 'elsewhere-catalog.ts');
      fs.renameSync(targetAbsolute, elsewhere);
      fs.symlinkSync(elsewhere, targetAbsolute);

      // Swapping a Git-tracked file for a symlink is itself an unstaged change,
      // so the whole-repository cleanliness gate (a stricter, earlier layer)
      // already rejects this before apply's own target-safety check gets a
      // chance to run — both layers independently fail closed. What matters is
      // zero writes and the symlink surviving untouched.
      expect(() => stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      })).toThrow();
      expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);
      expect(fs.lstatSync(targetAbsolute).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(targetAbsolute)).toBe(fs.realpathSync(elsewhere));
    } finally {
      fixture.cleanup();
    }
  });

  test('once adopted, the same candidate cannot be prepared for canonical promotion again; unsafe/new-coverage semantics survive', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);
      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });
      stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      });
      git(repository, ['add', '--', promotion.targetPath]);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'canonical promotion']);

      expect(() => stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore,
        promotionStore: new stack.SelfDevCanonicalPromotionIntentStore({ root: freshPrivateRoot('promotion-2') }),
      })).toThrow(/SELFDEV_CANONICAL_PROMOTION_/);

      // Post-promotion metamorphic proof against the now-committed SYNTHETIC
      // repository's OWN freshly loaded evaluator/catalog (never this test
      // process's own checkout — the same fresh-load mechanism `verify` uses):
      // the promoted semantics are now duplicate, a genuinely new coverage
      // edge remains reachable, and an unsafe candidate remains rejected.
      // With the EXPAND_ONLY baseline, the adopted case is EXPAND_THEN_COLLAPSE
      // and the postimage catalog holds exactly two entries; the non-overreach
      // probe proves the post-adoption evaluator exactly recognizes the
      // registry saturation (no further edge beyond baseline + adopted).
      const postModules = loadSandboxModules([
        path.join(repository, 'src/core/selfDev/evaluator.ts'),
        path.join(repository, 'src/core/selfDev/adoptedCases.ts'),
      ], repository, anchorPath);
      const [postEvaluatorModule, postAdoptedCasesModule] = postModules as [
        { SelfDevEvaluator: new (options?: { seedEquivalentFingerprints?: readonly string[]; seedCoverageClasses?: readonly string[] }) => { evaluateCandidate(value: unknown): { resultClass: string } } },
        { SELFDEV_ADOPTED_CASES: readonly unknown[]; selfDevAdoptedEquivalentFingerprints(): readonly string[]; selfDevAdoptedCoverageClasses(): readonly string[] },
      ];
      expect(postAdoptedCasesModule.SELFDEV_ADOPTED_CASES).toHaveLength(2);
      const postSeedFingerprints = postAdoptedCasesModule.selfDevAdoptedEquivalentFingerprints();
      const postSeedCoverage = postAdoptedCasesModule.selfDevAdoptedCoverageClasses();
      const postProbes = runMetamorphicProbes(
        () => new postEvaluatorModule.SelfDevEvaluator({ seedEquivalentFingerprints: postSeedFingerprints, seedCoverageClasses: postSeedCoverage }),
        fixtureChain.plan.adoptedCase,
      );
      expect(postProbes.postEquivalentResult).toBe('PASS');
      expect(postProbes.postVariantCoverageResult).toBe('PASS');
      expect(postProbes.nonOverreachResult).toBe('PASS');
      expect(postProbes.unsafeRegressionResult).toBe('PASS');
    } finally {
      fixture.cleanup();
    }
  });

  test('verify rejects a tampered target and an unexpected extra dirty file', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const fixtureChain = buildEligibleFixture(stack, repository);
      const stores = freshPromotionStores(stack);
      const promotion = stack.preparePromotion({
        artifactId: fixtureChain.plan.sourceSessionArtifactId, candidateId: fixtureChain.plan.candidateId,
        adoptionPlanId: fixtureChain.plan.planId, sandboxResultId: fixtureChain.result.resultId,
        repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureChain.artifactStore,
        planStore: fixtureChain.planStore, resultStore: fixtureChain.resultStore, promotionStore: stores.promotionStore,
      });
      const approval = stack.approvePromotion({
        promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: repository,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      });
      const receipt = stack.applyPromotion({
        promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
        planStore: fixtureChain.planStore, receiptStore: stores.receiptStore,
      });

      const targetAbsolute = path.join(repository, promotion.targetPath);
      const originalBytes = fs.readFileSync(targetAbsolute, 'utf8');
      fs.writeFileSync(targetAbsolute, `${originalBytes}\n// tampered\n`);
      expect(() => stack.verifyCanonicalPromotion({
        promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
        planStore: fixtureChain.planStore, sandboxResultStore: fixtureChain.resultStore, verificationStore: stores.verificationStore,
      })).toThrow(/TARGET_MISMATCH/);
      fs.writeFileSync(targetAbsolute, originalBytes);

      fs.writeFileSync(path.join(repository, 'extra-dirty.txt'), 'noise\n');
      expect(() => stack.verifyCanonicalPromotion({
        promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
        planStore: fixtureChain.planStore, sandboxResultStore: fixtureChain.resultStore, verificationStore: stores.verificationStore,
      })).toThrow(/TARGET_MISMATCH|UNEXPECTED_CHANGED_FILE|SELFDEV_CANONICAL_PROMOTION_/);
      fs.unlinkSync(path.join(repository, 'extra-dirty.txt'));

      const verification = stack.verifyCanonicalPromotion({
        promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath,
        promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
        planStore: fixtureChain.planStore, sandboxResultStore: fixtureChain.resultStore, verificationStore: stores.verificationStore,
      });
      expect(verification.verificationStatus).toBe('CANONICAL_APPLIED_VERIFIED_UNCOMMITTED');
    } finally {
      fixture.cleanup();
    }
  });
});
