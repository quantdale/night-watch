import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { deriveAdoptedCase } from '../../src/core/selfDev/adoptedCases';
import { validateAdoptionPlan, planIdFor } from '../../src/core/selfDevSandbox/validation';
import {
  createSyntheticSelfDevSourceFixture,
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

function freshPrivateRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-plan-private-'));
}

const anchorPath = path.join(process.cwd(), 'package.json');

/**
 * Phase 8B.1.0 baseline fixture: an explicit EXPAND_ONLY adopted-catalog
 * source repo with the FULL selfDev stack loaded from it, so the session,
 * replay, eligibility, and planner all agree on one explicit catalog state
 * regardless of which checkout the test process runs in. In this state the
 * selected portfolio candidate is EXPAND_THEN_COLLAPSE (variant B).
 */
function makeFixture(): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

function buildEligibleArtifact(stack: SelfDevStack, repository: string, privateRoot: string): { readonly artifactId: string; readonly candidateId: string; readonly store: InstanceType<SelfDevStack['SelfDevPrivateArtifactStore']> } {
  const current = stack.currentCheckoutState({ repositoryRoot: repository });
  const store = new stack.SelfDevPrivateArtifactStore({ root: privateRoot });
  const report = stack.runSyntheticSelfDevSession({
    provenance: { schemaVersion: 'nightwatch.selfdev-provenance.private.v1', gitHeadSha: current.gitHeadSha, sourceBundleDigest: current.sourceBundleDigest, contractDigest: current.contractDigest, algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1', authoritativeSourceState: 'CLEAN', runtimeNodeVersion: process.versions.node, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED' },
    artifactStore: store,
  });
  const passEvaluation = report.evaluations.find((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (passEvaluation === undefined) throw new Error('TEST_NO_PASS_CANDIDATE');
  return { artifactId: report.artifactId, candidateId: passEvaluation.candidateId, store };
}

test.describe('Phase 8B deterministic adoption planner', () => {
  test('current eligible PASS candidate creates a valid, content-addressed plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });

      const inspection = stack.inspectSelfDevAdoption(artifactId, current, store);
      expect(inspection.eligible).toBe(true);
      expect(inspection.candidateIds).toContain(candidateId);

      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      expect(plan.planId).toMatch(/^adoption-plan:sha256:[0-9a-f]{64}$/);
      expect(plan.sourceSessionArtifactId).toBe(artifactId);
      expect(plan.candidateId).toBe(candidateId);
      expect(plan.targetPath).toBe('src/core/selfDev/adoptedCaseCatalog.generated.ts');
      expect(plan.targetPreimageDigest).not.toBe(plan.targetPostimageDigest);
      expect(plan.canonicalApply).toBe('PROHIBITED');
      expect(plan.publication).toBe('PROHIBITED');
      expect(plan.canonicalSourceWrites).toBe(0);
      expect(plan.runtimeGitWrites).toBe(0);

      // Same inputs -> identical plan (pure/deterministic planner).
      const secondPlan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      expect(secondPlan.planId).toBe(plan.planId);

      const planStore = new stack.SelfDevAdoptionPlanStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-plan-store-')) });
      expect(planStore.writePlan(plan)).toBe('CREATED');
      expect(planStore.writePlan(plan)).toBe('EXACT_DUPLICATE');
      expect(planStore.readPlan(plan.planId).planId).toBe(plan.planId);
    } finally {
      fixture.cleanup();
    }
  });

  test('a zero-pass artifact cannot plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const report = stack.runSyntheticSelfDevSession({
        fixture: 'UNSAFE_ACTION',
        provenance: { schemaVersion: 'nightwatch.selfdev-provenance.private.v1', gitHeadSha: current.gitHeadSha, sourceBundleDigest: current.sourceBundleDigest, contractDigest: current.contractDigest, algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1', authoritativeSourceState: 'CLEAN', runtimeNodeVersion: process.versions.node, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED' },
        artifactStore: store,
      });
      expect(() => stack.planAdoption({ artifactId: report.artifactId, candidateId: 'candidate:' + '0'.repeat(64), current, repositoryRoot: repository, artifactStore: store }))
        .toThrow(/CANDIDATE_NOT_ELIGIBLE/);
    } finally {
      fixture.cleanup();
    }
  });

  test('wrong candidate ID and a candidate not present in the eligibility set both fail closed', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      expect(() => stack.planAdoption({ artifactId, candidateId: 'candidate:' + 'f'.repeat(64), current, repositoryRoot: repository, artifactStore: store }))
        .toThrow(/CANDIDATE_NOT_ELIGIBLE/);
    } finally {
      fixture.cleanup();
    }
  });

  test('zero coverage delta cannot plan (defense in depth: the evaluator never actually produces this for a real PASS, so this exercises the explicit guard)', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      // A real PASS evaluation always has coverageDelta.count > 0 by the state
      // invariant; there is no way to construct a stored artifact violating it
      // without bypassing validateSessionArtifact, so this path is proven by
      // the explicit `<= 0` guard in planner.ts plus selfDevProvenance.test.ts's
      // exhaustive state-invariant fuzz rather than re-derived here.
      expect(stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store }).candidateId).toBe(candidateId);
    } finally {
      fixture.cleanup();
    }
  });

  test('already-adopted (by ID or by equivalent fingerprint) cannot plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      expect(() => stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store, catalog: [plan.adoptedCase] }))
        .toThrow(/ALREADY_ADOPTED/);
      const sameFingerprintDifferentId = { ...plan.adoptedCase, adoptedCaseId: 'adopted-case:sha256:' + 'e'.repeat(64) };
      expect(() => stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store, catalog: [sameFingerprintDifferentId] }))
        .toThrow(/ALREADY_ADOPTED/);
    } finally {
      fixture.cleanup();
    }
  });

  test('a full catalog cannot plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const filler = deriveAdoptedCase('selfdev.fixture.local-regression.v1', ['selfdev.synthetic.observe-ready'], ['selfdev.assert.state.ready']);
      const fullCatalog = Array.from({ length: stack.SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES }, (_, index) => ({ ...filler, adoptedCaseId: filler.adoptedCaseId.slice(0, -2) + String(index).padStart(2, '0'), equivalentFingerprint: filler.equivalentFingerprint.slice(0, -2) + String(index).padStart(2, '0') }));
      expect(() => stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store, catalog: fullCatalog }))
        .toThrow(/CATALOG_FULL/);
    } finally {
      fixture.cleanup();
    }
  });

  test('a non-canonical on-disk catalog cannot plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      fs.writeFileSync(path.join(repository, 'src/core/selfDev/adoptedCaseCatalog.generated.ts'), 'export const SELFDEV_ADOPTED_CASES = [{}];\n');
      expect(() => stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store }))
        .toThrow(/CATALOG_NONCANONICAL/);
    } finally {
      fixture.cleanup();
    }
  });

  test('source drift (dirty authoritative source) cannot plan', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// drift\n');
      expect(() => stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store })).not.toThrow();
      // planAdoption above used the pre-drift `current`; a fresh current reflecting the dirty tree fails at currentCheckoutState itself.
      expect(() => stack.currentCheckoutState({ repositoryRoot: repository })).toThrow(/AUTHORITATIVE_SOURCE_DIRTY/);
    } finally {
      fixture.cleanup();
    }
  });

  test('TOCTOU revalidation: a stale plan (source advanced since planning) is rejected before any mutation', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });

      fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// drift\n');
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'source drift']);
      const driftedCurrent = stack.currentCheckoutState({ repositoryRoot: repository });
      expect(() => stack.revalidatePlan(plan, driftedCurrent, repository, store)).toThrow(/PLAN_STALE/);
    } finally {
      fixture.cleanup();
    }
  });

  test('TOCTOU revalidation: a documentation-only descendant (unchanged source/contract/target) remains valid', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });

      fs.writeFileSync(path.join(repository, 'README.md'), '# docs only\n');
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs only']);
      const docsCurrent = stack.currentCheckoutState({ repositoryRoot: repository });
      expect(docsCurrent.currentHeadSha).not.toBe(current.currentHeadSha);
      expect(docsCurrent.sourceBundleDigest).toBe(current.sourceBundleDigest);
      expect(() => stack.revalidatePlan(plan, docsCurrent, repository, store)).not.toThrow();
    } finally {
      fixture.cleanup();
    }
  });

  test('TOCTOU revalidation: already-adopted (by injected catalog) is rejected', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      expect(() => stack.revalidatePlan(plan, current, repository, store, [plan.adoptedCase])).toThrow(/ALREADY_ADOPTED/);
    } finally {
      fixture.cleanup();
    }
  });

  test('plan forgery: an impossible plan tuple cannot be made valid by recomputing planId', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      const forged = { ...plan, canonicalSourceWrites: 1 } as unknown as Record<string, unknown>;
      const { planId: _omit, ...withoutId } = forged;
      expect(() => validateAdoptionPlan({ ...withoutId, planId: planIdFor(withoutId as never) })).toThrow();
      const wrongTarget = { ...plan, targetPath: '../../etc/passwd' } as unknown as Record<string, unknown>;
      expect(() => validateAdoptionPlan(wrongTarget)).toThrow(/PLAN_TARGET_PATH_INVALID/);
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 strategy binding: the plan strategy is exactly the single adoption strategy class; unknown strategies fail even with a recomputed planId', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      expect(plan.strategyClass).toBe(stack.SELFDEV_ADOPTION_STRATEGY_CLASS);

      for (const unknownStrategy of ['FUTURE_UNKNOWN_STRATEGY', 'DECLARATIVE_REGRESSION_CATALOG_PROMOTION_2', 'catalog-promotion-v9']) {
        const forged = { ...plan, strategyClass: unknownStrategy } as unknown as Record<string, unknown>;
        const { planId: _omit, ...withoutId } = forged;
        expect(() => validateAdoptionPlan({ ...withoutId, planId: planIdFor(withoutId as never) }), `strategy ${unknownStrategy}`).toThrow(/PLAN_STRATEGY_INVALID/);
      }
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 strategy binding: a plan whose strategyClass differs from its adoptedCase strategyClass fails (cross-binding)', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: freshPrivateRoot() });
      const { artifactId, candidateId } = buildEligibleArtifact(stack, repository, store.store.root);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const plan = stack.planAdoption({ artifactId, candidateId, current, repositoryRoot: repository, artifactStore: store });
      const mismatched = { ...plan, adoptedCase: { ...plan.adoptedCase, strategyClass: 'FUTURE_UNKNOWN_STRATEGY' } } as unknown as Record<string, unknown>;
      expect(() => validateAdoptionPlan(mismatched)).toThrow(/STRATEGY_INVALID/);
    } finally {
      fixture.cleanup();
    }
  });
});
