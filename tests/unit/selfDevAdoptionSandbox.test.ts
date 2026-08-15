import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { SELFDEV_ADOPTION_STRATEGY_CLASS } from '../../src/core/selfDev/adoptedCases';
import { validateAdoptionSandboxResult } from '../../src/core/selfDevSandbox/validation';
import { SELFDEV_SANDBOX_ROOT_BASE } from '../../src/core/selfDevSandbox/sandboxMirror';
import {
  createSyntheticSelfDevSourceFixture,
  type SelfDevSourceFixture,
} from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack, type SelfDevStack, type SelfDevStackPlan } from '../helpers/selfDevStack';

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

function canonicalBytesOf(repository: string, relative: string): Buffer {
  return fs.readFileSync(path.join(repository, relative));
}

const anchorPath = path.join(process.cwd(), 'package.json');

/**
 * Phase 8B.1.0 baseline fixture: an explicit EXPAND_ONLY adopted-catalog
 * source repo with the FULL selfDev stack loaded from it (session, replay,
 * eligibility, planner, sandbox executor all agree on one explicit catalog
 * state — the selected candidate is EXPAND_THEN_COLLAPSE, variant B).
 */
function makeFixture(): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

function buildEligiblePlan(stack: SelfDevStack, repository: string): { readonly plan: SelfDevStackPlan; readonly store: InstanceType<SelfDevStack['SelfDevPrivateArtifactStore']> } {
  const store = new stack.SelfDevPrivateArtifactStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-sandbox-private-')) });
  const current = stack.currentCheckoutState({ repositoryRoot: repository });
  const report = stack.runSyntheticSelfDevSession({
    provenance: { schemaVersion: 'nightwatch.selfdev-provenance.private.v1', gitHeadSha: current.gitHeadSha, sourceBundleDigest: current.sourceBundleDigest, contractDigest: current.contractDigest, algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1', authoritativeSourceState: 'CLEAN', runtimeNodeVersion: process.versions.node, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED' },
    artifactStore: store,
  });
  const passEvaluation = report.evaluations.find((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (passEvaluation === undefined) throw new Error('TEST_NO_PASS_CANDIDATE');
  const plan = stack.planAdoption({ artifactId: report.artifactId, candidateId: passEvaluation.candidateId, current, repositoryRoot: repository, artifactStore: store });
  return { plan, store };
}

/**
 * Phase 8B.0.1 test seam: rewrites the SELFDEV_ACTIONS array inside the
 * COPIED registry file of a synthetic repository (never the real source).
 * `keep` filters action entries; entries named in `bogusCoverageActionIds`
 * get their coverage replaced with a class that is NOT in
 * SELFDEV_COVERAGE_CLASSES — the evaluator's coverage allowlist filters it
 * out, so such an action adds zero real coverage. The STACK used for session
 * generation/selection is loaded BEFORE the rewrite (so its registry is
 * unaffected), while the sandbox MIRROR is copied from the repo AFTER the
 * rewrite — the probe is always evaluated against the MODIFIED mirror, never
 * against the stack.
 */
function rewriteCopiedRegistryActions(repository: string, keep: (entry: { actionId: string; fromStateId: string }) => boolean, bogusCoverageActionIds: readonly string[]): void {
  const file = path.join(repository, 'src/core/selfDev/registry.ts');
  const source = fs.readFileSync(file, 'utf8');
  const entryRe = /  \{\n    actionId: '([^']*)',\n    fromStateId: '([^']*)',\n    toStateId: '([^']*)',\n    transitionClass: '([^']*)',\n    coverageClasses: \[([\s\S]*?)\],\n    oracleClass: '([^']*)',\n    semanticClass: '([^']*)',\n    mutation: false,\n    externalContact: false,\n  \}/g;
  const entries: Array<{ text: string; actionId: string; fromStateId: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(source)) !== null) {
    entries.push({ text: match[0]!, actionId: match[1]!, fromStateId: match[2]! });
  }
  if (entries.length === 0) throw new Error('TEST_REGISTRY_PARSE_FAILED');
  const bogus = new Set(bogusCoverageActionIds);
  const rewritten = entries.filter((entry) => keep(entry)).map((entry) => bogus.has(entry.actionId)
    ? entry.text.replace(/coverageClasses: \[[\s\S]*?\],/, "coverageClasses: [\n      'state-action:expanded:selfdev.synthetic.bogus',\n    ],")
    : entry.text);
  for (const id of bogusCoverageActionIds) {
    if (!entries.some((entry) => entry.actionId === id)) throw new Error(`TEST_REGISTRY_ACTION_NOT_FOUND:${id}`);
    if (!rewritten.some((text) => text.includes(`actionId: '${id}'`) && text.includes('selfdev.synthetic.bogus'))) throw new Error(`TEST_REGISTRY_BOGUS_REWRITE_FAILED:${id}`);
  }
  const startMarker = 'SELFDEV_ACTIONS: readonly SelfDevActionDescriptor[] = Object.freeze([';
  const endMarker = ']);';
  const markerStart = source.indexOf(startMarker);
  const arrayEnd = source.indexOf(endMarker, markerStart);
  if (markerStart < 0 || arrayEnd < 0) throw new Error('TEST_REGISTRY_PARSE_FAILED');
  const bodyStart = markerStart + startMarker.length;
  fs.writeFileSync(file, `${source.slice(0, bodyStart)}\n${rewritten.join(',\n')}\n${source.slice(arrayEnd)}`);
}

test.describe('Phase 8B sandbox-confined adoption execution', () => {
  test('a full sandbox run is verified, confined, metamorphically proven, and leaves canonical source untouched', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });

      const beforeCatalogBytes = canonicalBytesOf(repository, plan.targetPath);
      const beforeSourceBundleDigest = current.sourceBundleDigest;
      const beforeSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];

      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

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

      // Metamorphic proof (variant B: post-write registry saturation is
      // exactly recognized — nonOverreachResult is PASS by exactness).
      expect(result.preAdoptionResult).toBe('PASS');
      expect(result.postEquivalentResult).toBe('PASS');
      expect(result.postVariantCoverageResult).toBe('PASS');
      expect(result.nonOverreachResult).toBe('PASS');
      expect(result.unsafeRegressionResult).toBe('PASS');
      expect(result.cleanupStatus).toBe('PASS');

      // Canonical checkout is byte-for-byte unchanged.
      expect(canonicalBytesOf(repository, plan.targetPath).equals(beforeCatalogBytes)).toBe(true);
      expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
      const afterCurrent = stack.currentCheckoutState({ repositoryRoot: repository });
      expect(afterCurrent.sourceBundleDigest).toBe(beforeSourceBundleDigest);

      // Sandbox cleanup removed the mirror; no residual directories were left behind.
      const afterSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
      expect(afterSandboxDirs).toEqual(beforeSandboxDirs);
    } finally {
      fixture.cleanup();
    }
  });

  test('the same plan run twice (fresh sandboxes) is deterministic: identical postimage/source/contract digests and resultId', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });

      const first = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      const second = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

      expect(first.resultId).toBe(second.resultId);
      expect(first.postSourceBundleDigest).toBe(second.postSourceBundleDigest);
      expect(first.postContractDigest).toBe(second.postContractDigest);
      expect(first.targetPostimageDigest).toBe(second.targetPostimageDigest);
      // Canonical checkout remained clean after both runs.
      expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
    } finally {
      fixture.cleanup();
    }
  });

  test('a stale plan (source drifted since planning) is rejected before any sandbox mutation', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);

      fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// drift\n');
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'source drift']);
      const driftedCurrent = stack.currentCheckoutState({ repositoryRoot: repository });

      const beforeSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current: driftedCurrent, artifactStore: store });
      expect(result.sandboxVerificationStatus).toBe('FAIL');
      expect(result.failureClass).toBe('PLAN_STALE');
      expect(result.adoptionStatus).toBe('SANDBOX_ADOPTION_FAILED');
      expect(result.sandboxSourceWrites).toBe(0);
      expect(result.changedFiles).toEqual([]);
      // No sandbox mirror was ever created for a plan rejected at revalidation.
      const afterSandboxDirs = fs.existsSync(SELFDEV_SANDBOX_ROOT_BASE) ? fs.readdirSync(SELFDEV_SANDBOX_ROOT_BASE) : [];
      expect(afterSandboxDirs).toEqual(beforeSandboxDirs);
    } finally {
      fixture.cleanup();
    }
  });

  test('a documentation-only descendant remains runnable', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);

      fs.writeFileSync(path.join(repository, 'README.md'), '# docs only\n');
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs only']);
      const docsCurrent = stack.currentCheckoutState({ repositoryRoot: repository });

      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current: docsCurrent, artifactStore: store });
      expect(result.sandboxVerificationStatus).toBe('PASS');
    } finally {
      fixture.cleanup();
    }
  });

  test('result forgery: an impossible result tuple cannot be made valid by recomputing resultId', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const real = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      expect(real.sandboxVerificationStatus).toBe('PASS');

      const forged = { ...real, canonicalSourceWrites: 1 } as unknown as Record<string, unknown>;
      const { resultId: _omit, ...withoutId } = forged;
      expect(() => validateAdoptionSandboxResult({ ...withoutId, resultId: resultIdFor(withoutId as never) })).toThrow();

      const equalDigests = { ...real, postSourceBundleDigest: real.preSourceBundleDigest } as unknown as Record<string, unknown>;
      const { resultId: _omit2, ...withoutId2 } = equalDigests;
      expect(() => validateAdoptionSandboxResult({ ...withoutId2, resultId: resultIdFor(withoutId2 as never) })).toThrow(/RESULT_VERIFIED_INVARIANT/);
    } finally {
      fixture.cleanup();
    }
  });

  test('module cache isolation: two independent runs neither leak nor inherit sandbox module state', () => {
    const { fixture: fixtureA, stack: stackA, repository: repositoryA } = makeFixture();
    try {
      const { plan: planA, store: storeA } = buildEligiblePlan(stackA, repositoryA);
      const currentA = stackA.currentCheckoutState({ repositoryRoot: repositoryA });
      const resultA1 = stackA.runSandboxAdoption({ plan: planA, repositoryRoot: repositoryA, nodeModulesAnchorPath: anchorPath, current: currentA, artifactStore: storeA });
      expect(resultA1.sandboxVerificationStatus).toBe('PASS');

      const { fixture: fixtureB, stack: stackB, repository: repositoryB } = makeFixture();
      try {
        const { plan: planB, store: storeB } = buildEligiblePlan(stackB, repositoryB);
        const currentB = stackB.currentCheckoutState({ repositoryRoot: repositoryB });
        const resultB = stackB.runSandboxAdoption({ plan: planB, repositoryRoot: repositoryB, nodeModulesAnchorPath: anchorPath, current: currentB, artifactStore: storeB });
        expect(resultB.sandboxVerificationStatus).toBe('PASS');
        // Both plans adopt the same base-independent semantics from freshly
        // built identical repos, so both fully-independent sandbox runs reach
        // the identical postimage/contract digest -- proving B's run did not
        // inherit or corrupt any cached state from A's run (or vice versa).
        expect(resultB.postContractDigest).toBe(resultA1.postContractDigest);
        expect(resultB.targetPostimageDigest).toBe(resultA1.targetPostimageDigest);

        // Re-running A's plan in a fresh sandbox afterward is still fully correct
        // (no leaked require.cache entries from B's run affect it).
        const resultA2 = stackA.runSandboxAdoption({ plan: planA, repositoryRoot: repositoryA, nodeModulesAnchorPath: anchorPath, current: currentA, artifactStore: storeA });
        expect(resultA2.sandboxVerificationStatus).toBe('PASS');
        expect(resultA2.resultId).toBe(resultA1.resultId);
      } finally {
        fixtureB.cleanup();
      }
    } finally {
      fixtureA.cleanup();
    }
  });

  test('private result storage is exact-ID, idempotent on duplicates, and immutable', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

      const resultStore = new stack.SelfDevAdoptionResultStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-adoption-result-store-')) });
      expect(resultStore.writeResult(result)).toBe('CREATED');
      expect(resultStore.writeResult(result)).toBe('EXACT_DUPLICATE');
      expect(resultStore.readResult(result.resultId).resultId).toBe(result.resultId);
      expect(() => resultStore.readResult('adoption-sandbox-result:sha256:' + 'f'.repeat(64))).toThrow(/NOT_FOUND/);
    } finally {
      fixture.cleanup();
    }
  });

  // ---------------------------------------------------------------------------
  // Phase 8B.0.1 — strategy binding, verified-result metamorphic invariants,
  // and truthful failure-path sandbox write accounting.
  // ---------------------------------------------------------------------------

  test('8B.0.1 strategy binding: the result strategy is exactly the single adoption strategy class; recomputed resultId cannot legalize an unknown strategy', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const real = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      expect(real.sandboxVerificationStatus).toBe('PASS');
      expect(real.strategyClass).toBe(SELFDEV_ADOPTION_STRATEGY_CLASS);

      for (const unknownStrategy of ['FUTURE_UNKNOWN_STRATEGY', 'DECLARATIVE_REGRESSION_CATALOG_PROMOTION_2', 'catalog-promotion-v9']) {
        const forged = { ...real, strategyClass: unknownStrategy } as unknown as Record<string, unknown>;
        const { resultId: _omit, ...withoutId } = forged;
        expect(() => validateAdoptionSandboxResult({ ...withoutId, resultId: resultIdFor(withoutId as never) }), `strategy ${unknownStrategy}`).toThrow(/RESULT_STRATEGY_INVALID/);
      }
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 verified-result invariant: all five metamorphic proofs must be PASS; NOT_RUN and FAIL are rejected for every proof field even with a recomputed resultId', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const real = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      expect(real.sandboxVerificationStatus).toBe('PASS');

      const probeFields = ['preAdoptionResult', 'postEquivalentResult', 'postVariantCoverageResult', 'nonOverreachResult', 'unsafeRegressionResult'] as const;
      for (const field of probeFields) {
        for (const badValue of ['NOT_RUN', 'FAIL'] as const) {
          const forged = { ...real, [field]: badValue } as unknown as Record<string, unknown>;
          const { resultId: _omit, ...withoutId } = forged;
          expect(() => validateAdoptionSandboxResult({ ...withoutId, resultId: resultIdFor(withoutId as never) }), `${field}=${badValue}`).toThrow(/RESULT_VERIFIED_INVARIANT/);
        }
      }
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 executor: a sandbox registry without the continuation action still fails closed (the probe is evaluated against the MODIFIED mirror, never against the stack)', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      // Remove the continuation action (`observe-ready`, the only action from
      // the selected EXPAND_THEN_COLLAPSE candidate's final `ready` state
      // that is not itself part of the adopted case) from the COPIED
      // registry. The STACK was loaded before the rewrite, so its registry
      // still knows the continuation and selects the bounded probe; the
      // sandbox MIRROR is copied after the rewrite, so the probe candidate is
      // EVALUATED by the modified evaluator and rejected as an unknown
      // action — a probe that RAN and FAILED yields
      // NON_OVERREACH_REGRESSION, never a verified result.
      rewriteCopiedRegistryActions(repository, (entry) => entry.actionId !== 'selfdev.synthetic.observe-ready', []);
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'registry without continuation action']);

      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

      expect(result.sandboxVerificationStatus).toBe('FAIL');
      expect(result.failureClass).toBe('NON_OVERREACH_REGRESSION');
      expect(result.adoptionStatus).toBe('SANDBOX_ADOPTION_FAILED');
      // The single sandbox target write DID happen before the probe gate; the
      // failure metadata is truthful about it.
      expect(result.sandboxSourceWrites).toBe(1);
      expect(result.canonicalSourceWrites).toBe(0);
      expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 executor: the non-overreach probe is exact under mirror-side coverage sabotage — for the terminal portfolio member no registry novelty remains, so a sabotaged continuation coverage cannot manufacture or destroy novelty (the verified result stays truthful)', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      // Give the continuation action (`observe-ready`) only bogus coverage
      // classes inside the COPIED registry: the evaluator's coverage
      // allowlist filters them out, so the action contributes zero real
      // coverage. For the selected EXPAND_THEN_COLLAPSE candidate this is the
      // terminal case — the probe candidate's only "extra" classes beyond the
      // adopted case are the built-in BASELINE observation classes, so the
      // post-adoption evaluator's novelty boundary (baseline + adopted)
      // correctly reports nothing new, and the probe PASSES by exactness.
      // Under the historical single-candidate semantics (where the
      // continuation added genuinely new coverage) the same sabotage failed
      // the probe; the Phase 8B.1.0 portfolio deliberately makes this
      // saturation exact — the probe never trusts raw registry coverage
      // claims, it verifies the evaluator's exact boundary.
      rewriteCopiedRegistryActions(repository, () => true, ['selfdev.synthetic.observe-ready']);
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'registry with bogus continuation coverage']);

      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });

      expect(result.sandboxVerificationStatus).toBe('PASS');
      expect(result.failureClass).toBe('NONE');
      expect(result.nonOverreachResult).toBe('PASS');
      expect(result.adoptionStatus).toBe('SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED');
      expect(result.sandboxSourceWrites).toBe(1);
      expect(result.canonicalSourceWrites).toBe(0);
      expect(git(repository, ['status', '--porcelain']).trim()).toBe('');
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 executor/validation: NON_OVERREACH_PROBE_UNAVAILABLE is the distinct valid failure classification for a missing bounded probe (never REGRESSION, never a verified result)', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    // End-to-end: when the whole coherent source lacks the continuation
    // action (`observe-ready` for the selected EXPAND_THEN_COLLAPSE
    // candidate), the bounded probe has NO candidate and the executor fails
    // closed with NON_OVERREACH_PROBE_UNAVAILABLE. The stack must be loaded
    // AFTER the rewrite so selection and evaluation observe the same
    // registry.
    const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
    try {
      rewriteCopiedRegistryActions(fixture.root, (entry) => entry.actionId !== 'selfdev.synthetic.observe-ready', []);
      git(fixture.root, ['add', '--all']);
      git(fixture.root, ['commit', '--quiet', '--no-gpg-sign', '-m', 'registry without continuation action']);
      const stack = loadSelfDevStack(fixture.root, anchorPath);
      const repository = fixture.root;

      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const unavailable = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      expect(unavailable.sandboxVerificationStatus).toBe('FAIL');
      expect(unavailable.failureClass).toBe('NON_OVERREACH_PROBE_UNAVAILABLE');
      expect(unavailable.adoptionStatus).toBe('SANDBOX_ADOPTION_FAILED');
      expect(unavailable.sandboxSourceWrites).toBe(1);

      // The class can never appear on a claimed verified result.
      const verifiedWithUnavailable = { ...unavailable, sandboxVerificationStatus: 'PASS', adoptionStatus: 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED' } as unknown as Record<string, unknown>;
      const { resultId: _omit2, ...verifiedWithoutId } = verifiedWithUnavailable;
      expect(() => validateAdoptionSandboxResult({ ...verifiedWithoutId, resultId: resultIdFor(verifiedWithoutId as never) })).toThrow(/RESULT_VERIFIED_INVARIANT/);
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 failure accounting: a failure AFTER the single sandbox target write truthfully reports sandboxSourceWrites = 1', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });

      // SANDBOX_MODULE_LOAD_FAILED is only reachable after the target write and
      // the exactly-one-changed-file/postimage-digest checks all passed.
      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: '/nonexistent/phase8b01/package.json', current, artifactStore: store });

      expect(result.sandboxVerificationStatus).toBe('FAIL');
      expect(result.failureClass).toBe('SANDBOX_MODULE_LOAD_FAILED');
      expect(result.adoptionStatus).toBe('SANDBOX_ADOPTION_FAILED');
      expect(result.sandboxSourceWrites).toBe(1);
      expect(result.canonicalSourceWrites).toBe(0);
      expect(result.runtimeGitWrites).toBe(0);
      expect(result.externalCalls).toBe(0);
      expect(result.cleanupStatus).toBe('PASS');
      // A truthful post-write failure record is itself valid provenance.
      expect(() => validateAdoptionSandboxResult(result)).not.toThrow();
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 failure accounting: a failure BEFORE any sandbox write reports sandboxSourceWrites = 0', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);

      fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// drift\n');
      git(repository, ['add', '--all']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'source drift']);
      const driftedCurrent = stack.currentCheckoutState({ repositoryRoot: repository });

      const result = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current: driftedCurrent, artifactStore: store });
      expect(result.failureClass).toBe('PLAN_STALE');
      expect(result.sandboxSourceWrites).toBe(0);
      expect(result.canonicalSourceWrites).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('8B.0.1 effect accounting: impossible sandbox write counts are rejected even with a recomputed resultId', async () => {
    const { validateAdoptionSandboxResult, resultIdFor } = await import('../../src/core/selfDevSandbox/validation');
    const { fixture, stack, repository } = makeFixture();
    try {
      const { plan, store } = buildEligiblePlan(stack, repository);
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const real = stack.runSandboxAdoption({ plan, repositoryRoot: repository, nodeModulesAnchorPath: anchorPath, current, artifactStore: store });
      expect(real.sandboxVerificationStatus).toBe('PASS');
      expect(real.sandboxSourceWrites).toBe(1);

      for (const impossible of [-1, 2, 1.5, '1']) {
        const forged = { ...real, sandboxSourceWrites: impossible } as unknown as Record<string, unknown>;
        const { resultId: _omit, ...withoutId } = forged;
        expect(() => validateAdoptionSandboxResult({ ...withoutId, resultId: resultIdFor(withoutId as never) }), `count ${String(impossible)}`).toThrow(/RESULT_SANDBOX_WRITES_INVALID/);
      }
      // Success still requires exactly one sandbox write.
      const zeroWrites = { ...real, sandboxSourceWrites: 0 } as unknown as Record<string, unknown>;
      const { resultId: _omit2, ...withoutId2 } = zeroWrites;
      expect(() => validateAdoptionSandboxResult({ ...withoutId2, resultId: resultIdFor(withoutId2 as never) })).toThrow(/RESULT_VERIFIED_INVARIANT/);
    } finally {
      fixture.cleanup();
    }
  });
});
