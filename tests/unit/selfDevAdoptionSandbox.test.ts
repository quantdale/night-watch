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
import { SELFDEV_SANDBOX_ROOT_BASE } from '../../src/core/selfDevSandbox/sandboxMirror';
import { SelfDevAdoptionResultStore } from '../../src/core/selfDevSandbox/storage';
import type { SelfDevAdoptionPlan } from '../../src/core/selfDevSandbox/types';

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
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-sandbox-git-'));
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

function canonicalBytesOf(repository: string, relative: string): Buffer {
  return fs.readFileSync(path.join(repository, relative));
}

function buildEligiblePlan(repository: string): { readonly plan: SelfDevAdoptionPlan; readonly store: SelfDevPrivateArtifactStore } {
  const store = new SelfDevPrivateArtifactStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-sandbox-private-')) });
  const current = currentCheckoutState({ repositoryRoot: repository });
  const report: SelfDevSessionReport = runSyntheticSelfDevSession({
    provenance: { schemaVersion: 'nightwatch.selfdev-provenance.private.v1', gitHeadSha: current.gitHeadSha, sourceBundleDigest: current.sourceBundleDigest, contractDigest: current.contractDigest, algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1', authoritativeSourceState: 'CLEAN', runtimeNodeVersion: process.versions.node, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED' },
    artifactStore: store,
  });
  const passEvaluation = report.evaluations.find((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (passEvaluation === undefined) throw new Error('TEST_NO_PASS_CANDIDATE');
  const plan = planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore: store });
  return { plan, store };
}

const anchorPath = path.join(process.cwd(), 'package.json');

test.describe('Phase 8B sandbox-confined adoption execution', () => {
  test('a full sandbox run is verified, confined, metamorphically proven, and leaves canonical source untouched', () => {
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);
    const current = currentCheckoutState({ repositoryRoot: repository });

    const beforeCatalogBytes = canonicalBytesOf(repository, plan.targetPath);
    const beforeSourceBundleDigest = current.sourceBundleDigest;
    const beforeSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];

    const result = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

    expect(result.sandboxVerificationStatus).toBe('PASS');
    expect(result.failureClass).toBe('NONE');
    expect(result.adoptionStatus).toBe('SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED');
    expect(result.canonicalApply).toBe('PROHIBITED');
    expect(result.publication).toBe('PROHIBITED');
    expect(result.changedFiles).toEqual([plan.targetPath]);
    expect(result.sandboxSourceWrites).toBe(1);
    expect(result.canonicalSourceWrites).toBe(0);
    expect(result.runtimeGitWrites).toBe(0);
    expect(result.externalCalls).toBe(0);
    expect(result.preSourceBundleDigest).toBe(plan.sourceBundleDigestBefore);
    expect(result.postSourceBundleDigest).not.toBe(result.preSourceBundleDigest);
    expect(result.preContractDigest).toBe(plan.contractDigestBefore);
    expect(result.postContractDigest).not.toBe(result.preContractDigest);
    expect(result.targetPreimageDigest).toBe(plan.targetPreimageDigest);
    expect(result.targetPostimageDigest).toBe(plan.targetPostimageDigest);

    // Metamorphic proof.
    expect(result.preAdoptionResult).toBe('PASS');
    expect(result.postEquivalentResult).toBe('PASS');
    expect(result.postVariantCoverageResult).toBe('PASS');
    expect(result.nonOverreachResult).toBe('PASS');
    expect(result.unsafeRegressionResult).toBe('PASS');
    expect(result.cleanupStatus).toBe('PASS');

    // Canonical checkout is byte-for-byte unchanged.
    expect(canonicalBytesOf(repository, plan.targetPath).equals(beforeCatalogBytes)).toBe(true);
    expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
    const afterCurrent = currentCheckoutState({ repositoryRoot: repository });
    expect(afterCurrent.sourceBundleDigest).toBe(beforeSourceBundleDigest);

    // Sandbox cleanup removed the mirror; no residual directories were left behind.
    const afterSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
    expect(afterSandboxDirs).toEqual(beforeSandboxDirs);
  });

  test('the same plan run twice (fresh sandboxes) is deterministic: identical postimage/source/contract digests and resultId', () => {
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);
    const current = currentCheckoutState({ repositoryRoot: repository });

    const first = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
    const second = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

    expect(first.resultId).toBe(second.resultId);
    expect(first.postSourceBundleDigest).toBe(second.postSourceBundleDigest);
    expect(first.postContractDigest).toBe(second.postContractDigest);
    expect(first.targetPostimageDigest).toBe(second.targetPostimageDigest);
    // Canonical checkout remained clean after both runs.
    expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
  });

  test('a stale plan (source drifted since planning) is rejected before any sandbox mutation', () => {
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);

    fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// drift\n');
    git(repository, ['add', '--all']);
    git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'source drift']);
    const driftedCurrent = currentCheckoutState({ repositoryRoot: repository });

    const beforeSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
    const result = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current: driftedCurrent, artifactStore: store });
    expect(result.sandboxVerificationStatus).toBe('FAIL');
    expect(result.failureClass).toBe('PLAN_STALE');
    expect(result.adoptionStatus).toBe('SANDBOX_ADOPTION_FAILED');
    expect(result.sandboxSourceWrites).toBe(0);
    expect(result.changedFiles).toEqual([]);
    // No sandbox mirror was ever created for a plan rejected at revalidation.
    const afterSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
    expect(afterSandboxDirs).toEqual(beforeSandboxDirs);
  });

  test('a documentation-only descendant remains runnable', () => {
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);

    fs.writeFileSync(path.join(repository, 'README.md'), '# docs only\n');
    git(repository, ['add', '--all']);
    git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs only']);
    const docsCurrent = currentCheckoutState({ repositoryRoot: repository });

    const result = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current: docsCurrent, artifactStore: store });
    expect(result.sandboxVerificationStatus).toBe('PASS');
  });

  test('result forgery: an impossible result tuple cannot be made valid by recomputing resultId', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);
    const current = currentCheckoutState({ repositoryRoot: repository });
    const real = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
    expect(real.sandboxVerificationStatus).toBe('PASS');

    const forged = { ...real, canonicalSourceWrites: 1 } as unknown as Record<string, unknown>;
    const { resultId: _omit, ...withoutId } = forged;
    expect(() => validateAdoptionSandboxResult({ ...withoutId, resultId: resultIdFor(withoutId as never) })).toThrow();

    const equalDigests = { ...real, postSourceBundleDigest: real.preSourceBundleDigest } as unknown as Record<string, unknown>;
    const { resultId: _omit2, ...withoutId2 } = equalDigests;
    expect(() => validateAdoptionSandboxResult({ ...withoutId2, resultId: resultIdFor(withoutId2 as never) })).toThrow(/RESULT_VERIFIED_INVARIANT/);
  });

  test('module cache isolation: two independent runs neither leak nor inherit sandbox module state', () => {
    const repositoryA = makeGitRepo();
    const { plan: planA, store: storeA } = buildEligiblePlan(repositoryA);
    const currentA = currentCheckoutState({ repositoryRoot: repositoryA });
    const resultA1 = runSandboxAdoption({ plan: planA, repositoryRoot: repositoryA, nodeModulesAnchorPath: anchorPath, current: currentA, artifactStore: storeA });
    expect(resultA1.sandboxVerificationStatus).toBe('PASS');

    const repositoryB = makeGitRepo();
    const { plan: planB, store: storeB } = buildEligiblePlan(repositoryB);
    const currentB = currentCheckoutState({ repositoryRoot: repositoryB });
    const resultB = runSandboxAdoption({ plan: planB, repositoryRoot: repositoryB, nodeModulesAnchorPath: anchorPath, current: currentB, artifactStore: storeB });
    expect(resultB.sandboxVerificationStatus).toBe('PASS');
    // Both plans adopt the same base-independent semantics from freshly
    // built identical repos, so both fully-independent sandbox runs reach
    // the identical postimage/contract digest -- proving B's run did not
    // inherit or corrupt any cached state from A's run (or vice versa).
    expect(resultB.postContractDigest).toBe(resultA1.postContractDigest);
    expect(resultB.targetPostimageDigest).toBe(resultA1.targetPostimageDigest);

    // Re-running A's plan in a fresh sandbox afterward is still fully correct
    // (no leaked require.cache entries from B's run affect it).
    const resultA2 = runSandboxAdoption({ plan: planA, repositoryRoot: repositoryA, nodeModulesAnchorPath: anchorPath, current: currentA, artifactStore: storeA });
    expect(resultA2.sandboxVerificationStatus).toBe('PASS');
    expect(resultA2.resultId).toBe(resultA1.resultId);
  });

  test('private result storage is exact-ID, idempotent on duplicates, and immutable', () => {
    const repository = makeGitRepo();
    const { plan, store } = buildEligiblePlan(repository);
    const current = currentCheckoutState({ repositoryRoot: repository });
    const result = runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

    const resultStore = new SelfDevAdoptionResultStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-result-store-')) });
    expect(resultStore.writeResult(result)).toBe('CREATED');
    expect(resultStore.writeResult(result)).toBe('EXACT_DUPLICATE');
    expect(resultStore.readResult(result.resultId).resultId).toBe(result.resultId);
    expect(() => resultStore.readResult('adoption-sandbox-result:sha256:' + 'f'.repeat(64))).toThrow(/NOT_FOUND/);
  });
});
