// ---------------------------------------------------------------------------
// Phase 8B.1.0 — catalog-aware synthetic proposal portfolio matrix.
//
// Covers: portfolio descriptor identity, the pure deterministic novelty
// selector, base/seed independence, the concrete matrix fixtures, the
// empty/one-entry/exhausted controller states (through the coherent stack
// loaded from explicit source fixtures), replay/eligibility under each
// state, and the portfolio's contract binding.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  SELFDEV_CONTRACT_MANIFEST,
  SELFDEV_EXPAND_SUMMARY_VARIANT,
  SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT,
  SELFDEV_SELECTION_ALGORITHM_VERSION,
  SELFDEV_SYNTHETIC_PORTFOLIO_VERSION,
  SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS,
  SelfDevEvaluator,
  SyntheticDeterministicProposer,
  candidateIdFor,
  deriveAdoptedCase,
  selfDevContractDigest,
  selectNextSyntheticProposalVariant,
  sessionArtifactIdFor,
  sha256Digest,
  validateAdoptedCase,
  validateSessionArtifact,
  type SelfDevCandidate,
  type SelfDevSessionArtifact,
} from '../../src/core/selfDev';
import { SELFDEV_COVERAGE_CLASSES } from '../../src/core/selfDev/registry';
import {
  createSyntheticSelfDevSourceFixture,
  type SelfDevSourceFixture,
} from '../helpers/selfDevSourceFixture';
import { loadSelfDevStack, type SelfDevStack } from '../helpers/selfDevStack';

const BASE_SHA = 'b'.repeat(40);
const anchorPath = path.join(process.cwd(), 'package.json');

const A = SELFDEV_EXPAND_SUMMARY_VARIANT;
const B = SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT;

function emptyAdoptedState() {
  return { adoptedEquivalentFingerprints: [] as readonly string[], adoptedCoverageClasses: [] as readonly string[] };
}

function stateFor(...variants: Array<typeof A | typeof B>) {
  return {
    adoptedEquivalentFingerprints: variants.map((variant) => variant.equivalentFingerprint),
    adoptedCoverageClasses: [...new Set(variants.flatMap((variant) => variant.coverageClasses))].sort(),
  };
}

function makeFixture(state: 'EMPTY' | 'EXPAND_ONLY' | 'EXPAND_AND_COLLAPSE'): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture(state);
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

function artifactOf(report: { privateArtifact: unknown } & Record<string, unknown>): Record<string, unknown> {
  const { privateArtifact: _privateArtifact, ...artifact } = report;
  return artifact;
}

function sessionProvenance(stack: SelfDevStack, repository: string) {
  const current = stack.currentCheckoutState({ repositoryRoot: repository });
  return {
    provenance: {
      schemaVersion: 'nightwatch.selfdev-provenance.private.v1',
      gitHeadSha: current.gitHeadSha,
      sourceBundleDigest: current.sourceBundleDigest,
      contractDigest: current.contractDigest,
      algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1',
      authoritativeSourceState: 'CLEAN',
      runtimeNodeVersion: process.versions.node,
      provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
    },
  };
}

test.describe('Phase 8B.1.0 portfolio descriptors and identity', () => {
  test('portfolio is frozen, ordered, and exposes exactly the two intended variants', () => {
    expect(SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS.map((variant) => variant.variantId)).toEqual(['EXPAND_SUMMARY', 'EXPAND_THEN_COLLAPSE']);
    expect(Object.isFrozen(SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS)).toBe(true);
    expect(SELFDEV_SYNTHETIC_PORTFOLIO_VERSION).toBe('nightwatch.selfdev-synthetic-portfolio.v1');
    expect(SELFDEV_SELECTION_ALGORITHM_VERSION).toBe('nightwatch.selfdev-synthetic-selection.v1');
  });

  test('variant A is the historical expansion semantics; variant B is expand-then-collapse', () => {
    expect(A.actionIds).toEqual(['selfdev.synthetic.expand-summary']);
    expect(A.assertionIds).toEqual(['selfdev.assert.state.expanded', 'selfdev.assert.transition.expansion', 'selfdev.assert.oracle.structural-stable']);
    expect(B.actionIds).toEqual(['selfdev.synthetic.expand-summary', 'selfdev.synthetic.collapse-summary']);
    expect(B.assertionIds).toEqual(['selfdev.assert.state.ready', 'selfdev.assert.transition.collapse', 'selfdev.assert.oracle.structural-stable']);
    // The invalid reverse order is not a portfolio member.
    for (const variant of SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS) {
      expect(variant.actionIds).not.toEqual(['selfdev.synthetic.collapse-summary', 'selfdev.synthetic.expand-summary']);
    }
  });

  test('variant identities and coverage are distinct and registry-derived', () => {
    const adoptedA = deriveAdoptedCase(A.fixtureId, A.actionIds, A.assertionIds);
    const adoptedB = deriveAdoptedCase(B.fixtureId, B.actionIds, B.assertionIds);
    expect(adoptedA.adoptedCaseId).not.toBe(adoptedB.adoptedCaseId);
    expect(adoptedA.equivalentFingerprint).not.toBe(adoptedB.equivalentFingerprint);
    expect(A.equivalentFingerprint).toBe(adoptedA.equivalentFingerprint);
    expect(B.equivalentFingerprint).toBe(adoptedB.equivalentFingerprint);
    // Both adopted entries round-trip the real validator.
    expect(validateAdoptedCase(adoptedA)).toEqual(adoptedA);
    expect(validateAdoptedCase(adoptedB)).toEqual(adoptedB);
    // Coverage is exactly the registry-derived set (never candidate claims).
    for (const coverageClass of A.coverageClasses) expect(SELFDEV_COVERAGE_CLASSES).toContain(coverageClass);
    for (const coverageClass of B.coverageClasses) expect(SELFDEV_COVERAGE_CLASSES).toContain(coverageClass);
    // B's collapse classes are the one-entry novelty delta.
    expect(B.coverageClasses).toContain('state-action:expanded:selfdev.synthetic.collapse-summary');
    expect(B.coverageClasses).toContain('transition:expanded-read-only-collapse');
    expect(A.coverageClasses).not.toContain('state-action:expanded:selfdev.synthetic.collapse-summary');
  });

  test('candidate semantic digests differ between A and B while base SHA changes only identity', () => {
    const proposer = new SyntheticDeterministicProposer();
    const aCandidate = proposer.propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND' })[0] as SelfDevCandidate;
    const bCandidate = proposer.propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND_COLLAPSE' })[0] as SelfDevCandidate;
    const aOtherBase = proposer.propose({ baseNightwatchSha: 'c'.repeat(40), fixture: 'VALID_MATRIX_EXPAND' })[0] as SelfDevCandidate;
    expect(aCandidate.candidateId).not.toBe(bCandidate.candidateId);
    expect(aCandidate.candidateId).not.toBe(aOtherBase.candidateId);
    // Same fixture/base/seed -> identical candidates.
    const aAgain = proposer.propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND' })[0] as SelfDevCandidate;
    expect(aAgain.candidateId).toBe(aCandidate.candidateId);
  });

  test('the B candidate asserts its FINAL execution state (ready + collapse), not the expansion state', () => {
    const results = new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(
      new SyntheticDeterministicProposer().propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND_COLLAPSE' }),
    );
    const pass = results[0]!;
    expect(pass.resultClass).toBe('EVALUATED_PASS_NOT_ADOPTED');
    expect(pass.execution?.finalStateId).toBe('selfdev.state.ready.v1');
    expect(pass.execution?.transitionClass).toBe('READ_ONLY_COLLAPSE');
    expect(pass.coverageDelta.added).toEqual([
      'state-action:expanded:selfdev.synthetic.collapse-summary',
      'state-action:ready:selfdev.synthetic.expand-summary',
      'transition:expanded-read-only-collapse',
      'transition:ready-read-only-expansion',
    ]);
  });

  test('the B matrix duplicate duplicates B, and the unsafe member stays rejected', () => {
    const results = new SelfDevEvaluator({ clock: () => 0 }).evaluateSession(
      new SyntheticDeterministicProposer().propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND_COLLAPSE' }),
    );
    expect(results).toHaveLength(3);
    const duplicate = results[1]!;
    expect(duplicate.resultClass).toBe('REJECTED_DUPLICATE');
    expect(duplicate.duplicateStatus).toBe('DUPLICATE');
    // The duplicate is the SAME semantic identity (createdAt is excluded from
    // candidate identity) — it is rejected as a semantic duplicate of the
    // selected B member, never as an expansion duplicate.
    expect(duplicate.candidateId).toBe(results[0]!.candidateId);
    expect(duplicate.reasonCode).toBe('DUPLICATE_SEMANTIC_IDENTITY');
    expect(results[0]!.execution?.finalStateId).toBe('selfdev.state.ready.v1');
    const unsafe = results[2]!;
    expect(unsafe.resultClass).toBe('REJECTED_SAFETY');
    expect(unsafe.executionStatus).toBe('NOT_STARTED');
  });

  test('an invalid collapse-then-expand order fails the fixture state machine', () => {
    const original = new SyntheticDeterministicProposer().propose({ baseNightwatchSha: BASE_SHA, fixture: 'VALID_MATRIX_EXPAND_COLLAPSE' })[0] as SelfDevCandidate;
    const { candidateId: _candidateId, ...draft } = {
      ...original,
      actionIds: ['selfdev.synthetic.collapse-summary', 'selfdev.synthetic.expand-summary'],
    };
    const invalid = new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate({ ...draft, candidateId: candidateIdFor(draft) });
    expect(invalid.resultClass).toBe('EVALUATION_FAILED');
    expect(invalid.reasonCode).toBe('FIXTURE_TRANSITION_INVALID');
  });
});

test.describe('Phase 8B.1.0 deterministic novelty selector', () => {
  test('selection ladder: EMPTY -> A, A adopted -> B, A+B -> EXHAUSTED', () => {
    expect(selectNextSyntheticProposalVariant(emptyAdoptedState())?.variantId).toBe('EXPAND_SUMMARY');
    expect(selectNextSyntheticProposalVariant(stateFor(A))?.variantId).toBe('EXPAND_THEN_COLLAPSE');
    expect(selectNextSyntheticProposalVariant(stateFor(A, B))).toBeNull();
  });

  test('adopted entry ORDER does not change selection', () => {
    const reversed = { adoptedEquivalentFingerprints: [B.equivalentFingerprint, A.equivalentFingerprint], adoptedCoverageClasses: [...B.coverageClasses, ...A.coverageClasses] };
    expect(selectNextSyntheticProposalVariant(reversed)).toBeNull();
    // B-only adopted: A's entire coverage is subsumed by B's adopted
    // coverage, so its coverage delta is zero and it is NOT novel under §10 —
    // claiming it new would be exactly the forbidden "existing coverage is
    // new". The portfolio is therefore exhausted in this synthetic state.
    expect(selectNextSyntheticProposalVariant({ adoptedEquivalentFingerprints: [B.equivalentFingerprint], adoptedCoverageClasses: [...B.coverageClasses].sort() })).toBeNull();
  });

  test('an adopted coverage set without the fingerprint still blocks a variant with zero delta', () => {
    // A's full coverage adopted without its fingerprint: A is skipped (zero
    // delta), B is skipped (its delta classes are covered), portfolio is
    // exhausted — zero coverage delta blocks a variant even with a novel
    // fingerprint (§10, §92.9).
    expect(selectNextSyntheticProposalVariant({
      adoptedEquivalentFingerprints: [],
      adoptedCoverageClasses: [...SELFDEV_COVERAGE_CLASSES],
    })).toBeNull();
  });

  test('an adopted equivalent fingerprint blocks that exact variant (§92.8)', () => {
    // A's fingerprint adopted with NO coverage: A is blocked, and B (whose
    // coverage is not covered) is the next novel variant.
    expect(selectNextSyntheticProposalVariant({
      adoptedEquivalentFingerprints: [A.equivalentFingerprint],
      adoptedCoverageClasses: [],
    })?.variantId).toBe('EXPAND_THEN_COLLAPSE');
  });

  test('selection is deterministic across 100 repeated runs and never uses time/randomness', () => {
    const states = [emptyAdoptedState(), stateFor(A), stateFor(A, B)];
    for (const state of states) {
      const first = selectNextSyntheticProposalVariant(state);
      for (let index = 0; index < 100; index += 1) {
        expect(selectNextSyntheticProposalVariant(state)).toBe(first);
      }
    }
  });

  test('selection does not depend on seed or base SHA at the controller level', () => {
    const { fixture, stack, repository } = makeFixture('EXPAND_ONLY');
    try {
      for (const seed of [0, 1, 42, 999]) {
        for (const base of ['b'.repeat(40), 'c'.repeat(40), '0'.repeat(40)]) {
          const report = stack.runSyntheticSelfDevSession({
            baseNightwatchSha: base,
            seed,
            persist: false,
          });
          expect(report.replayDescriptor.fixture).toBe('VALID_MATRIX_EXPAND_COLLAPSE');
          expect(report.evaluations.map((evaluation) => evaluation.resultClass)).toEqual(['EVALUATED_PASS_NOT_ADOPTED', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY']);
        }
      }
    } finally {
      fixture.cleanup();
    }
  });

  test('changing seed/createdAt/base SHA never resurrects an adopted semantic variant', () => {
    // With A+B adopted, every seed/base still yields zero passes: identity
    // novelty is not semantic novelty.
    const { fixture, stack, repository } = makeFixture('EXPAND_AND_COLLAPSE');
    try {
      for (const seed of [0, 7, 999]) {
        const report = stack.runSyntheticSelfDevSession({
          baseNightwatchSha: BASE_SHA,
          seed,
          persist: false,
        });
        expect(report.evaluations.filter((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED')).toHaveLength(0);
        expect(report.evaluations.map((evaluation) => evaluation.resultClass)).toEqual(['REJECTED_DUPLICATE', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY']);
      }
    } finally {
      fixture.cleanup();
    }
  });
});

test.describe('Phase 8B.1.0 controller states (empty / one-entry / exhausted)', () => {
  test('EMPTY catalog: default session selects EXPAND_SUMMARY with the historical matrix shape', () => {
    const { fixture, stack, repository } = makeFixture('EMPTY');
    try {
      const report = stack.runSyntheticSelfDevSession({ persist: false, ...sessionProvenance(stack, repository) });
      expect(report.replayDescriptor.fixture).toBe('VALID_MATRIX_EXPAND');
      expect(report.candidateCount).toBe(3);
      expect(report.evaluations.map((evaluation) => evaluation.resultClass)).toEqual(['EVALUATED_PASS_NOT_ADOPTED', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY']);
      expect(stack.replaySession(artifactOf(report)).status).toBe('PASS');
      expect(stack.replaySession(artifactOf(report)).passCandidateCount).toBe(1);
      // The first candidate is exactly the historical expansion candidate.
      expect(report.evaluations[0]?.execution?.finalStateId).toBe('selfdev.state.expanded.v1');
      expect(report.evaluations[0]?.execution?.transitionClass).toBe('READ_ONLY_EXPANSION');
    } finally {
      fixture.cleanup();
    }
  });

  test('EXPAND_ONLY catalog: default session selects EXPAND_THEN_COLLAPSE with exactly one fresh PASS', () => {
    const { fixture, stack, repository } = makeFixture('EXPAND_ONLY');
    try {
      const report = stack.runSyntheticSelfDevSession({ persist: false, ...sessionProvenance(stack, repository) });
      expect(report.replayDescriptor.fixture).toBe('VALID_MATRIX_EXPAND_COLLAPSE');
      expect(report.candidateCount).toBe(3);
      expect(report.evaluations.map((evaluation) => evaluation.resultClass)).toEqual(['EVALUATED_PASS_NOT_ADOPTED', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY']);
      // The fresh PASS is variant B: its coverage delta is ONLY the collapse
      // novelty — expansion coverage is not pretended to be new.
      expect(report.evaluations[0]?.coverageDelta.added).toEqual([
        'state-action:expanded:selfdev.synthetic.collapse-summary',
        'transition:expanded-read-only-collapse',
      ]);
      expect(report.evaluations[0]?.execution?.finalStateId).toBe('selfdev.state.ready.v1');
      expect(report.evaluations[0]?.execution?.transitionClass).toBe('READ_ONLY_COLLAPSE');
      const replay = stack.replaySession(artifactOf(report));
      expect(replay.status).toBe('PASS');
      expect(replay.passCandidateCount).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });

  test('EXPAND_AND_COLLAPSE catalog: portfolio exhausted — session succeeds with zero PASS and no exception', () => {
    const { fixture, stack, repository } = makeFixture('EXPAND_AND_COLLAPSE');
    try {
      const report = stack.runSyntheticSelfDevSession({ persist: false, ...sessionProvenance(stack, repository) });
      expect(report.replayDescriptor.fixture).toBe('VALID_MATRIX_EXPAND');
      expect(report.candidateCount).toBe(3);
      expect(report.evaluations.map((evaluation) => evaluation.resultClass)).toEqual(['REJECTED_DUPLICATE', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY']);
      // Replay PASS with zero passes; provenance coherent; no writes anywhere.
      const artifact = artifactOf(report);
      const replay = stack.replaySession(artifact);
      expect(replay.status).toBe('PASS');
      expect(replay.passCandidateCount).toBe(0);
      const eligibility = stack.assessFutureReviewEligibility(artifact, stack.currentCheckoutState({ repositoryRoot: repository }));
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.candidates).toHaveLength(0);
      expect(eligibility.assessment.replayStatus).toBe('PASS');
      expect(eligibility.assessment.passCandidateCount).toBe(0);
      expect(stack.verifiedPassCandidates(artifact)).toHaveLength(0);
      expect(report.sourceWrites).toBe(0);
      expect(report.gitWrites).toBe(0);
      expect(report.externalCalls).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('exhausted session artifacts persist and verify coherently with zero pass candidates', () => {
    const { fixture, stack, repository } = makeFixture('EXPAND_AND_COLLAPSE');
    try {
      const store = new stack.SelfDevPrivateArtifactStore({ root: fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-portfolio-exhausted-')) });
      const report = stack.runSyntheticSelfDevSession({ ...sessionProvenance(stack, repository), artifactStore: store });
      const current = stack.currentCheckoutState({ repositoryRoot: repository });
      const assessment = stack.assessSelfDevArtifactIntegrity(artifactOf(report), current);
      expect(assessment.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(assessment.replayStatus).toBe('PASS');
      expect(assessment.passCandidateCount).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('unsafe matrix member remains rejected in every catalog state', () => {
    for (const state of ['EMPTY', 'EXPAND_ONLY', 'EXPAND_AND_COLLAPSE'] as const) {
      const { fixture, stack, repository } = makeFixture(state);
      try {
        const report = stack.runSyntheticSelfDevSession({ persist: false, ...sessionProvenance(stack, repository) });
        expect(report.evaluations[2]?.resultClass, state).toBe('REJECTED_SAFETY');
        expect(report.evaluations[2]?.executionStatus, state).toBe('NOT_STARTED');
      } finally {
        fixture.cleanup();
      }
    }
  });
});

test.describe('Phase 8B.1.0 portfolio contract binding', () => {
  test('the contract manifest binds the portfolio version, variants, and selection algorithm version', () => {
    expect(SELFDEV_CONTRACT_MANIFEST.syntheticPortfolioVersion).toBe(SELFDEV_SYNTHETIC_PORTFOLIO_VERSION);
    expect(SELFDEV_CONTRACT_MANIFEST.syntheticSelectionAlgorithmVersion).toBe(SELFDEV_SELECTION_ALGORITHM_VERSION);
    expect(SELFDEV_CONTRACT_MANIFEST.syntheticProposalPortfolio.map((variant) => variant.variantId)).toEqual(['EXPAND_SUMMARY', 'EXPAND_THEN_COLLAPSE']);
    expect(SELFDEV_CONTRACT_MANIFEST.syntheticProposalPortfolio[1]?.actionIds).toEqual(['selfdev.synthetic.expand-summary', 'selfdev.synthetic.collapse-summary']);
  });

  test('the manifest version was deliberately bumped to v2 (shape change) and the digest changed from the pre-task value', () => {
    expect(SELFDEV_CONTRACT_MANIFEST.schemaVersion).toBe('nightwatch.selfdev-contract.private.v2');
    // Regression anchor: the pre-task empty-catalog contract digest (v1
    // manifest, no portfolio binding). A post-fix digest equal to it would be
    // an integrity defect (§38).
    expect(selfDevContractDigest()).not.toBe('sha256:91b45f1020048c00b81a04e795d11d57dcd17084058430ab76b7a7f48d2d2c74');
  });

  test('portfolio order tampering changes the contract digest', () => {
    const tampered = {
      ...SELFDEV_CONTRACT_MANIFEST,
      syntheticProposalPortfolio: [SELFDEV_CONTRACT_MANIFEST.syntheticProposalPortfolio[1]!, SELFDEV_CONTRACT_MANIFEST.syntheticProposalPortfolio[0]!],
    };
    expect(sha256Digest(tampered)).not.toBe(selfDevContractDigest());
  });

  test('variant action-sequence tampering changes the contract digest', () => {
    const tampered = {
      ...SELFDEV_CONTRACT_MANIFEST,
      syntheticProposalPortfolio: SELFDEV_CONTRACT_MANIFEST.syntheticProposalPortfolio.map((variant, index) =>
        index === 1 ? { ...variant, actionIds: ['selfdev.synthetic.collapse-summary', 'selfdev.synthetic.expand-summary'] } : variant),
    };
    expect(sha256Digest(tampered)).not.toBe(selfDevContractDigest());
  });

  test('EMPTY / EXPAND_ONLY / EXPAND_AND_COLLAPSE produce three distinct contract digests', () => {
    const digests = new Set<string>();
    for (const state of ['EMPTY', 'EXPAND_ONLY', 'EXPAND_AND_COLLAPSE'] as const) {
      const { fixture, stack } = makeFixture(state);
      try {
        digests.add(stack.selfDevContractDigest());
      } finally {
        fixture.cleanup();
      }
    }
    expect(digests.size).toBe(3);
  });

  test('malformed adopted state fails upstream at stack load rather than creating novelty', () => {
    const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
    try {
      // Hand-corrupt the fixture's generated catalog (mutate a coverage
      // class). The catalog validator must reject it at module load, so the
      // stack cannot even be constructed — novelty can never be derived from
      // malformed adopted state.
      const target = path.join(fixture.root, 'src/core/selfDev/adoptedCaseCatalog.generated.ts');
      const bytes = fs.readFileSync(target, 'utf8');
      fs.writeFileSync(target, bytes.replace('state-action:ready:selfdev.synthetic.expand-summary', 'state-action:forged:selfdev.synthetic.bogus'));
      expect(() => loadSelfDevStack(fixture.root, anchorPath)).toThrow();
    } finally {
      fixture.cleanup();
    }
  });
});

test.describe('Phase 8B.1.0 replay descriptor compatibility', () => {
  test('historical VALID_MATRIX replay descriptors remain exactly supported under the new proposer', () => {
    // A v1-era artifact whose descriptor names the historical alias (no
    // concrete portfolio fixture) must still replay exactly under the empty
    // catalog: the proposer's VALID_MATRIX fixture semantics are unchanged.
    const { fixture, stack, repository } = makeFixture('EMPTY');
    try {
      const report = stack.runSyntheticSelfDevSession({ persist: false, ...sessionProvenance(stack, repository) });
      const artifact = artifactOf(report);
      const artifactRecord = artifact as unknown as SelfDevSessionArtifact;
      const historical = {
        ...artifactRecord,
        replayDescriptor: { ...artifactRecord.replayDescriptor, fixture: 'VALID_MATRIX' },
      };
      const reidentified = { ...historical, artifactId: sessionArtifactIdFor(historical as unknown as SelfDevSessionArtifact) } as unknown as SelfDevSessionArtifact;
      expect(() => validateSessionArtifact(reidentified)).not.toThrow();
      const replay = stack.replaySession(reidentified);
      expect(replay.status).toBe('PASS');
      expect(replay.passCandidateCount).toBe(1);
    } finally {
      fixture.cleanup();
    }
  });
});

test.describe('Phase 8B.1.0 production CLI under explicit catalog states', () => {
  function runCli(repository: string): { readonly status: number; readonly stdout: string } {
    const privateRoot = fs.mkdtempSync(path.join(os.homedir(), 'nightwatch-8b1p0-cli-'));
    try {
      const result = spawnSync(process.execPath, ['bin/selfdev-synthetic.mjs'], {
        cwd: repository,
        env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
        encoding: 'utf8',
        timeout: 30_000,
      });
      return { status: result.status ?? -1, stdout: result.stdout ?? '' };
    } finally {
      fs.rmSync(privateRoot, { recursive: true, force: true });
    }
  }

  test('one-entry checkout: the actual CLI succeeds, selects EXPAND_THEN_COLLAPSE, replay PASS, pass count 1', () => {
    const { fixture } = makeFixture('EXPAND_ONLY');
    try {
      const { status, stdout } = runCli(fixture.root);
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.SESSION).toBe('PASS');
      expect(parsed.passCount).toBe(1);
      expect(parsed.duplicateCount).toBe(1);
      expect(parsed.rejectedCount).toBe(1);
      expect(parsed.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(parsed.replayDescriptorFixture).toBe('VALID_MATRIX_EXPAND_COLLAPSE');
      expect(parsed.portfolioStatus).toBe('SELECTED');
      expect(parsed.selectedVariant).toBe('EXPAND_THEN_COLLAPSE');
      expect(parsed.sourceWrites).toBe(0);
      expect(parsed.gitWrites).toBe(0);
      expect(parsed.externalCalls).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('exhausted checkout: the actual CLI completes successfully with pass count 0 and EXHAUSTED portfolio status', () => {
    const { fixture } = makeFixture('EXPAND_AND_COLLAPSE');
    try {
      const { status, stdout } = runCli(fixture.root);
      expect(status).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.SESSION).toBe('PASS');
      expect(parsed.passCount).toBe(0);
      expect(parsed.duplicateCount).toBe(2);
      expect(parsed.rejectedCount).toBe(1);
      expect(parsed.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(parsed.replayDescriptorFixture).toBe('VALID_MATRIX_EXPAND');
      expect(parsed.portfolioStatus).toBe('EXHAUSTED');
      expect(parsed.selectedVariant).toBeNull();
      expect(parsed.sourceWrites).toBe(0);
      expect(parsed.gitWrites).toBe(0);
      expect(parsed.externalCalls).toBe(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('one-entry checkout: adopt-sandbox inspect reports the variant B artifact as eligible with one candidate', () => {
    const { fixture } = makeFixture('EXPAND_ONLY');
    try {
      const privateRoot = fs.mkdtempSync(path.join(os.homedir(), 'nightwatch-8b1p0-inspect-'));
      try {
        const session = spawnSync(process.execPath, ['bin/selfdev-synthetic.mjs'], {
          cwd: fixture.root,
          env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
          encoding: 'utf8',
          timeout: 30_000,
        });
        expect(session.status).toBe(0);
        const parsed = JSON.parse(session.stdout ?? '');
        const artifactId = parsed.artifactId as string;
        const inspect = spawnSync(process.execPath, ['bin/selfdev-adopt-sandbox.mjs', 'inspect', '--artifact-id', artifactId], {
          cwd: fixture.root,
          env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
          encoding: 'utf8',
          timeout: 30_000,
        });
        expect(inspect.status).toBe(0);
        const report = JSON.parse(inspect.stdout ?? '');
        expect(report.eligible).toBe(true);
        expect(report.candidateCount).toBe(1);
      } finally {
        fs.rmSync(privateRoot, { recursive: true, force: true });
      }
    } finally {
      fixture.cleanup();
    }
  });

  test('exhausted checkout: adopt-sandbox inspect reports eligible false with zero candidates and creates no plan', () => {
    const { fixture } = makeFixture('EXPAND_AND_COLLAPSE');
    try {
      const privateRoot = fs.mkdtempSync(path.join(os.homedir(), 'nightwatch-8b1p0-inspect-ex-'));
      try {
        const session = spawnSync(process.execPath, ['bin/selfdev-synthetic.mjs'], {
          cwd: fixture.root,
          env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
          encoding: 'utf8',
          timeout: 30_000,
        });
        expect(session.status).toBe(0);
        const parsed = JSON.parse(session.stdout ?? '');
        const artifactId = parsed.artifactId as string;
        const inspect = spawnSync(process.execPath, ['bin/selfdev-adopt-sandbox.mjs', 'inspect', '--artifact-id', artifactId], {
          cwd: fixture.root,
          env: { ...process.env, NIGHTWATCH_PRIVATE_STATE_DIR: privateRoot },
          encoding: 'utf8',
          timeout: 30_000,
        });
        expect(inspect.status).toBe(0);
        const report = JSON.parse(inspect.stdout ?? '');
        expect(report.eligible).toBe(false);
        expect(report.candidateCount).toBe(0);
        // No plan was created anywhere (private root still holds only the session artifact).
        expect(fs.readdirSync(privateRoot).filter((name) => name.includes('adoption-plan'))).toEqual([]);
      } finally {
        fs.rmSync(privateRoot, { recursive: true, force: true });
      }
    } finally {
      fixture.cleanup();
    }
  });
});
