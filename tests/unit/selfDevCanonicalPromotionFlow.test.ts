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
import { runMetamorphicProbes } from '../../src/core/selfDev/metamorphicProbes';
import { planAdoption } from '../../src/core/selfDevSandbox/planner';
import { runSandboxAdoption } from '../../src/core/selfDevSandbox/sandboxExecutor';
import { loadSandboxModules } from '../../src/core/selfDevSandbox/sandboxLoader';
import { SelfDevAdoptionPlanStore, SelfDevAdoptionResultStore } from '../../src/core/selfDevSandbox/storage';
import type { SelfDevAdoptionPlan, SelfDevAdoptionSandboxResult } from '../../src/core/selfDevSandbox/types';
import {
  applyPromotion,
  approvePromotion,
  preparePromotion,
  verifyCanonicalPromotion,
  assessCanonicalPromotionCurrentness,
  SelfDevCanonicalPromotionApplyError,
  SelfDevCanonicalPromotionApproveError,
  SelfDevCanonicalPromotionPrepareError,
  SelfDevCanonicalPromotionVerifyError,
  SelfDevCanonicalPromotionIntentStore,
  SelfDevCanonicalPromotionApprovalStore,
  SelfDevCanonicalApplyReceiptStore,
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

/**
 * `marker` guarantees genuinely distinct commit trees (and therefore distinct
 * HEAD SHAs and downstream content-addressed IDs) across independently built
 * synthetic repositories — two repos built from byte-identical source with
 * the same commit message could otherwise collide on the exact same commit
 * SHA if created within the same wall-clock second.
 */
function makeGitRepo(marker: string): string {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-canonical-promotion-git-'));
  for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
    const source = path.join(process.cwd(), relative);
    const destination = path.join(repository, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  fs.writeFileSync(path.join(repository, 'SYNTHETIC_REPO_MARKER.txt'), `${marker}\n`);
  git(repository, ['init', '--quiet']);
  git(repository, ['add', '--all']);
  git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'synthetic baseline']);
  return repository;
}

function freshPrivateRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nightwatch-canonical-promotion-${prefix}-`));
}

const anchorPath = path.join(process.cwd(), 'package.json');

interface EligibleFixture {
  readonly repository: string;
  readonly plan: SelfDevAdoptionPlan;
  readonly result: SelfDevAdoptionSandboxResult;
  readonly artifactStore: SelfDevPrivateArtifactStore;
  readonly planStore: SelfDevAdoptionPlanStore;
  readonly resultStore: SelfDevAdoptionResultStore;
}

/** Builds one full Phase 8B chain (eligible v2 session -> plan -> verified sandbox result) in a synthetic repo, exactly like Phase 8B's own tests do. */
function buildEligibleFixture(marker = 'default'): EligibleFixture {
  const repository = makeGitRepo(marker);
  const artifactStore = new SelfDevPrivateArtifactStore({ root: freshPrivateRoot('artifact') });
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

  const plan = planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore });
  const planStore = new SelfDevAdoptionPlanStore({ root: freshPrivateRoot('plan') });
  planStore.writePlan(plan);

  const result = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore });
  expect(result.adoptionStatus).toBe('SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED');
  const resultStore = new SelfDevAdoptionResultStore({ root: freshPrivateRoot('result') });
  resultStore.writeResult(result);

  return { repository, plan, result, artifactStore, planStore, resultStore };
}

interface PromotionStores {
  readonly promotionStore: SelfDevCanonicalPromotionIntentStore;
  readonly approvalStore: SelfDevCanonicalPromotionApprovalStore;
  readonly receiptStore: SelfDevCanonicalApplyReceiptStore;
  readonly verificationStore: SelfDevCanonicalPromotionVerificationStore;
}

function freshPromotionStores(): PromotionStores {
  return {
    promotionStore: new SelfDevCanonicalPromotionIntentStore({ root: freshPrivateRoot('promotion') }),
    approvalStore: new SelfDevCanonicalPromotionApprovalStore({ root: freshPrivateRoot('approval') }),
    receiptStore: new SelfDevCanonicalApplyReceiptStore({ root: freshPrivateRoot('receipt') }),
    verificationStore: new SelfDevCanonicalPromotionVerificationStore({ root: freshPrivateRoot('verification') }),
  };
}

test.describe('Phase 8B.1 owner-gated canonical promotion — full synthetic chain', () => {
  test('prepare -> approve -> apply -> verify -> commit proves exactly one canonical write, then currentness is COMMITTED_EXACT', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();

    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    expect(promotion.promotionId).toMatch(/^canonical-promotion:sha256:[0-9a-f]{64}$/);
    expect(promotion.canonicalAuthority).toBe('OWNER_GATED_ONE_FILE_ONLY');
    expect(promotion.maximumCanonicalSourceWrites).toBe(1);
    expect(promotion.runtimeGitWrites).toBe(0);

    // Deterministic: preparing again from the same exact evidence yields the same promotion ID.
    const again = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    expect(again.promotionId).toBe(promotion.promotionId);

    expect(() => approvePromotion({
      promotionId: promotion.promotionId, confirm: 'WRONG_TOKEN', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    })).toThrow(SelfDevCanonicalPromotionApproveError);

    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });
    expect(approval.approvalId).toMatch(/^canonical-promotion-approval:sha256:[0-9a-f]{64}$/);
    expect(approval.maximumApplications).toBe(1);

    const preApplyTargetStat = fs.lstatSync(path.join(fixture.repository, promotion.targetPath));

    const receipt = applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    });
    expect(receipt.applyOutcome).toBe('APPLIED');
    expect(receipt.canonicalSourceWrites).toBe(1);
    expect(receipt.runtimeGitWrites).toBe(0);
    expect(receipt.externalCalls).toBe(0);
    expect(receipt.gitCommitStatus).toBe('NOT_PERFORMED_BY_RUNTIME');
    expect(receipt.observedTargetPostimageDigest).toBe(promotion.targetPostimageDigest);

    const postApplyTargetStat = fs.lstatSync(path.join(fixture.repository, promotion.targetPath));
    expect(postApplyTargetStat.mode & 0o777).toBe(preApplyTargetStat.mode & 0o777);

    // Applying the SAME approval again must claim zero further canonical writes.
    expect(() => applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    })).toThrow(/APPROVAL_ALREADY_CONSUMED/);

    const verification = verifyCanonicalPromotion({
      promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
      planStore: fixture.planStore, sandboxResultStore: fixture.resultStore, verificationStore: stores.verificationStore,
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
    git(fixture.repository, ['add', '--', promotion.targetPath]);
    git(fixture.repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'canonical promotion']);
    const committedCurrent = currentCheckoutState({ repositoryRoot: fixture.repository });
    expect(committedCurrent.sourceBundleDigest).toBe(promotion.expectedPostSourceBundleDigest);
    // `currentCheckoutState().contractDigest` reflects THIS test process's own
    // (unrelated, still-empty) catalog via an ordinary import, not the
    // synthetic repo's just-committed one — the same reason `verify` had to
    // fresh-load its contract module. `verification.postContractDigest` was
    // already independently proven correct via that fresh load, so it stands
    // in for the synthetic repo's real post-commit contract digest here.
    const committedCurrentForAssessment = { ...committedCurrent, contractDigest: verification.postContractDigest };

    const currentness = assessCanonicalPromotionCurrentness({ verification, current: committedCurrentForAssessment });
    expect(currentness).toBe('CANONICAL_PROMOTION_COMMITTED_EXACT');

    // A documentation-only descendant commit remains a source-equivalent descendant.
    fs.writeFileSync(path.join(fixture.repository, 'DOCS_ONLY.md'), 'closure\n');
    git(fixture.repository, ['add', '--', 'DOCS_ONLY.md']);
    git(fixture.repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs closure']);
    const docsCurrent = currentCheckoutState({ repositoryRoot: fixture.repository });
    const docsCurrentForAssessment = { ...docsCurrent, contractDigest: verification.postContractDigest };
    expect(assessCanonicalPromotionCurrentness({ verification, current: docsCurrentForAssessment })).toBe('CANONICAL_PROMOTION_COMMITTED_SOURCE_EQUIVALENT_DESCENDANT');
  });

  test('the whole repository must be clean before prepare, approve, and apply', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();
    fs.writeFileSync(path.join(fixture.repository, 'untracked-noise.txt'), 'noise\n');

    expect(() => preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    })).toThrow();

    fs.unlinkSync(path.join(fixture.repository, 'untracked-noise.txt'));
    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });

    fs.writeFileSync(path.join(fixture.repository, 'another-noise.txt'), 'noise\n');
    expect(() => approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    })).toThrow();
    fs.unlinkSync(path.join(fixture.repository, 'another-noise.txt'));

    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });

    fs.writeFileSync(path.join(fixture.repository, 'yet-more-noise.txt'), 'noise\n');
    expect(() => applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    })).toThrow();
    expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);

    fs.unlinkSync(path.join(fixture.repository, 'yet-more-noise.txt'));
    const receipt = applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    });
    expect(receipt.applyOutcome).toBe('APPLIED');
  });

  test('apply requires the exact HEAD prepare ran against; a new commit blocks apply with zero writes', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();
    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });

    fs.writeFileSync(path.join(fixture.repository, 'DOCS_ADVANCE.md'), 'advance\n');
    git(fixture.repository, ['add', '--', 'DOCS_ADVANCE.md']);
    git(fixture.repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'unrelated docs advance']);

    expect(() => applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    })).toThrow(/PROMOTION_SOURCE_ADVANCED/);
    expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);

    const targetBytes = fs.readFileSync(path.join(fixture.repository, promotion.targetPath), 'utf8');
    expect(targetBytes).toContain('SELFDEV_ADOPTED_CASES = [];');
  });

  test('an approval only authorizes its own exact promotion', () => {
    const fixtureA = buildEligibleFixture('fixture-a');
    const fixtureB = buildEligibleFixture('fixture-b');
    const storesA = freshPromotionStores();
    const storesB = freshPromotionStores();

    const promotionA = preparePromotion({
      artifactId: fixtureA.plan.sourceSessionArtifactId, candidateId: fixtureA.plan.candidateId,
      adoptionPlanId: fixtureA.plan.planId, sandboxResultId: fixtureA.result.resultId,
      repositoryRoot: fixtureA.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureA.artifactStore,
      planStore: fixtureA.planStore, resultStore: fixtureA.resultStore, promotionStore: storesA.promotionStore,
    });
    const approvalA = approvePromotion({
      promotionId: promotionA.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixtureA.repository,
      promotionStore: storesA.promotionStore, approvalStore: storesA.approvalStore,
    });

    const promotionB = preparePromotion({
      artifactId: fixtureB.plan.sourceSessionArtifactId, candidateId: fixtureB.plan.candidateId,
      adoptionPlanId: fixtureB.plan.planId, sandboxResultId: fixtureB.result.resultId,
      repositoryRoot: fixtureB.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixtureB.artifactStore,
      planStore: fixtureB.planStore, resultStore: fixtureB.resultStore, promotionStore: storesB.promotionStore,
    });

    // Approval A cannot apply promotion B, even against B's own repository.
    expect(() => applyPromotion({
      promotionId: promotionB.promotionId, approvalId: approvalA.approvalId, repositoryRoot: fixtureB.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: storesB.promotionStore, approvalStore: storesA.approvalStore,
      planStore: fixtureB.planStore, receiptStore: storesB.receiptStore,
    })).toThrow(SelfDevCanonicalPromotionApplyError);
  });

  test('a symlinked canonical target is rejected before any write', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();
    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });

    const targetAbsolute = path.join(fixture.repository, promotion.targetPath);
    const elsewhere = path.join(fixture.repository, 'elsewhere-catalog.ts');
    fs.renameSync(targetAbsolute, elsewhere);
    fs.symlinkSync(elsewhere, targetAbsolute);

    // Swapping a Git-tracked file for a symlink is itself an unstaged change,
    // so the whole-repository cleanliness gate (a stricter, earlier layer)
    // already rejects this before apply's own target-safety check gets a
    // chance to run — both layers independently fail closed. What matters is
    // zero writes and the symlink surviving untouched.
    expect(() => applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    })).toThrow();
    expect(stores.approvalStore.isApprovalConsumed(approval.approvalId)).toBe(false);
    expect(fs.lstatSync(targetAbsolute).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(targetAbsolute)).toBe(fs.realpathSync(elsewhere));
  });

  test('once adopted, the same candidate cannot be prepared for canonical promotion again; unsafe/new-coverage semantics survive', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();
    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });
    applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    });
    git(fixture.repository, ['add', '--', promotion.targetPath]);
    git(fixture.repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'canonical promotion']);

    expect(() => preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore,
      promotionStore: new SelfDevCanonicalPromotionIntentStore({ root: freshPrivateRoot('promotion-2') }),
    })).toThrow(SelfDevCanonicalPromotionPrepareError);

    // Post-promotion metamorphic proof against the now-committed SYNTHETIC
    // repository's OWN freshly loaded evaluator/catalog (not this test
    // process's own real, still-unrelated catalog — `runSyntheticSelfDevSession`
    // is an ordinary in-process import bound to whichever project is actually
    // running it, so it cannot observe a synthetic fixture's committed state;
    // the same fresh-load mechanism `verify` uses is what makes this
    // provable here): the promoted semantics are now duplicate, a genuinely
    // new coverage edge remains reachable, and an unsafe candidate remains
    // rejected — one promotion does not terminate future self-development.
    const postModules = loadSandboxModules([
      path.join(fixture.repository, 'src/core/selfDev/evaluator.ts'),
      path.join(fixture.repository, 'src/core/selfDev/adoptedCases.ts'),
    ], fixture.repository, anchorPath);
    const [postEvaluatorModule, postAdoptedCasesModule] = postModules as [
      { SelfDevEvaluator: new (options?: { seedEquivalentFingerprints?: readonly string[]; seedCoverageClasses?: readonly string[] }) => { evaluateCandidate(value: unknown): { resultClass: string } } },
      { SELFDEV_ADOPTED_CASES: readonly unknown[]; selfDevAdoptedEquivalentFingerprints(): readonly string[]; selfDevAdoptedCoverageClasses(): readonly string[] },
    ];
    expect(postAdoptedCasesModule.SELFDEV_ADOPTED_CASES).toHaveLength(1);
    const postSeedFingerprints = postAdoptedCasesModule.selfDevAdoptedEquivalentFingerprints();
    const postSeedCoverage = postAdoptedCasesModule.selfDevAdoptedCoverageClasses();
    const postProbes = runMetamorphicProbes(
      () => new postEvaluatorModule.SelfDevEvaluator({ seedEquivalentFingerprints: postSeedFingerprints, seedCoverageClasses: postSeedCoverage }),
      fixture.plan.adoptedCase,
    );
    expect(postProbes.postEquivalentResult).toBe('PASS');
    expect(postProbes.postVariantCoverageResult).toBe('PASS');
    expect(postProbes.nonOverreachResult).toBe('PASS');
    expect(postProbes.unsafeRegressionResult).toBe('PASS');
  });

  test('verify rejects a tampered target and an unexpected extra dirty file', () => {
    const fixture = buildEligibleFixture();
    const stores = freshPromotionStores();
    const promotion = preparePromotion({
      artifactId: fixture.plan.sourceSessionArtifactId, candidateId: fixture.plan.candidateId,
      adoptionPlanId: fixture.plan.planId, sandboxResultId: fixture.result.resultId,
      repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath, artifactStore: fixture.artifactStore,
      planStore: fixture.planStore, resultStore: fixture.resultStore, promotionStore: stores.promotionStore,
    });
    const approval = approvePromotion({
      promotionId: promotion.promotionId, confirm: 'CANONICAL_ONE_FILE_ONLY', repositoryRoot: fixture.repository,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
    });
    const receipt = applyPromotion({
      promotionId: promotion.promotionId, approvalId: approval.approvalId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, approvalStore: stores.approvalStore,
      planStore: fixture.planStore, receiptStore: stores.receiptStore,
    });

    const targetAbsolute = path.join(fixture.repository, promotion.targetPath);
    const originalBytes = fs.readFileSync(targetAbsolute, 'utf8');
    fs.writeFileSync(targetAbsolute, `${originalBytes}\n// tampered\n`);
    expect(() => verifyCanonicalPromotion({
      promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
      planStore: fixture.planStore, sandboxResultStore: fixture.resultStore, verificationStore: stores.verificationStore,
    })).toThrow(/TARGET_MISMATCH/);
    fs.writeFileSync(targetAbsolute, originalBytes);

    fs.writeFileSync(path.join(fixture.repository, 'extra-dirty.txt'), 'noise\n');
    expect(() => verifyCanonicalPromotion({
      promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
      planStore: fixture.planStore, sandboxResultStore: fixture.resultStore, verificationStore: stores.verificationStore,
    })).toThrow(SelfDevCanonicalPromotionVerifyError);
    fs.unlinkSync(path.join(fixture.repository, 'extra-dirty.txt'));

    const verification = verifyCanonicalPromotion({
      promotionId: promotion.promotionId, receiptId: receipt.receiptId, repositoryRoot: fixture.repository, nodeModulesAnchorPath: anchorPath,
      promotionStore: stores.promotionStore, receiptStore: stores.receiptStore,
      planStore: fixture.planStore, sandboxResultStore: fixture.resultStore, verificationStore: stores.verificationStore,
    });
    expect(verification.verificationStatus).toBe('CANONICAL_APPLIED_VERIFIED_UNCOMMITTED');
  });
});
