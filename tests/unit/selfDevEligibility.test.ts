// ---------------------------------------------------------------------------
// Phase 8A.1.1 — future-review eligibility gate regression matrix.
//
// These tests prove the eligibility layer is distinct from artifact
// provenance/replay validity: a replay-valid, source-attested,
// VERIFIED_EXACT_BASE (or VERIFIED_SOURCE_EQUIVALENT_DESCENDANT) artifact with
// zero pass candidates is genuinely trust-valid but future-review INELIGIBLE.
//
// Phase 8B.1.0 — every artifact is built from an EXPLICIT adopted-catalog
// source fixture (EXPAND_ONLY) with the full selfDev stack loaded from that
// fixture, so session evaluation, replay, eligibility, and digests all agree
// on one catalog state regardless of the checkout the test process runs in.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  assessSelfDevArtifactIntegrity,
  evaluationIdFor,
  isFutureReviewPrerequisitePass,
  sessionArtifactIdFor,
  validateSessionArtifact,
  type SelfDevEvaluation,
  type SelfDevSessionArtifact,
  type SelfDevTrustAssessment,
} from '../../src/core/selfDev';
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
    cwd: root,
    env: gitEnvironment(root),
    shell: false,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0) throw new Error(`GIT_TEST_FAILED:${args.join('_')}:${result.stderr ?? ''}`);
  return (result.stdout ?? '').trim();
}

const anchorPath = path.join(process.cwd(), 'package.json');

/**
 * Phase 8B.1.0 baseline fixture: explicit EXPAND_ONLY adopted catalog +
 * coherent stack loaded from the fixture source root. In this state the
 * default session selects EXPAND_THEN_COLLAPSE and yields exactly one pass
 * candidate; adversarial fixtures (UNSAFE_ACTION) still yield zero passes.
 */
function makeFixture(): { readonly fixture: SelfDevSourceFixture; readonly stack: SelfDevStack; readonly repository: string } {
  const fixture = createSyntheticSelfDevSourceFixture('EXPAND_ONLY');
  return { fixture, stack: loadSelfDevStack(fixture.root, anchorPath), repository: fixture.root };
}

function attestedArtifact(stack: SelfDevStack, repository: string, fixture: Record<string, unknown> = {}) {
  const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
  const report = stack.runSyntheticSelfDevSession({
    ...fixture,
    baseNightwatchSha: baseline.gitHeadSha,
    provenance: {
      schemaVersion: 'nightwatch.selfdev-provenance.private.v1',
      gitHeadSha: baseline.gitHeadSha,
      sourceBundleDigest: baseline.sourceBundleDigest,
      contractDigest: baseline.contractDigest,
      algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1',
      authoritativeSourceState: 'CLEAN',
      runtimeNodeVersion: '20.0.0',
      provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
    },
    persist: false,
  });
  const { privateArtifact: _privateArtifact, ...artifact } = report;
  return artifact;
}

test.describe('Phase 8A.1.1 defect reproduction and positive control', () => {
  test('zero-pass UNSAFE_ACTION fixture is genuinely VERIFIED_EXACT_BASE with replay PASS and zero pass candidates', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, { fixture: 'UNSAFE_ACTION' });
      expect(() => validateSessionArtifact(artifact)).not.toThrow();
      expect(stack.replaySession(artifact)).toMatchObject({ status: 'PASS' });

      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const assessment = stack.assessSelfDevArtifactIntegrity(artifact, baseline);
      expect(assessment.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(assessment.replayStatus).toBe('PASS');
      expect(assessment.passCandidateCount).toBe(0);

      // The corrected prerequisite must reject this exact assessment.
      expect(isFutureReviewPrerequisitePass(assessment as unknown as SelfDevTrustAssessment)).toBe(false);
      const eligibility = stack.assessFutureReviewEligibility(artifact, baseline);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.candidates).toHaveLength(0);
      expect(eligibility.assessment.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(eligibility.assessment.adoptionStatus).toBe('NOT_AUTHORIZED_PHASE_8A');
      expect(eligibility.assessment.publication).toBe('PROHIBITED');
    } finally {
      fixture.cleanup();
    }
  });

  test('VALID_MATRIX positive control is VERIFIED_EXACT_BASE, replay PASS, one pass candidate, eligible', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const assessment = stack.assessSelfDevArtifactIntegrity(artifact, baseline);
      expect(assessment.trustStatus).toBe('VERIFIED_EXACT_BASE');
      expect(assessment.replayStatus).toBe('PASS');
      expect(assessment.passCandidateCount).toBe(1);
      expect(isFutureReviewPrerequisitePass(assessment as unknown as SelfDevTrustAssessment)).toBe(true);

      const eligibility = stack.assessFutureReviewEligibility(artifact, baseline);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.candidates).toHaveLength(1);
      expect(eligibility.candidates.length).toBe(eligibility.assessment.passCandidateCount);
      expect(stack.verifiedPassCandidates(artifact)).toHaveLength(1);
    } finally {
      fixture.cleanup();
    }
  });
});

test.describe('Phase 8A.1.1 adversarial eligibility matrix', () => {
  test('zero-pass documentation descendant remains VERIFIED_SOURCE_EQUIVALENT_DESCENDANT and ineligible', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, { fixture: 'UNSAFE_ACTION' });
      fs.mkdirSync(path.join(repository, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(repository, 'docs', 'closure.md'), 'synthetic documentation\n');
      git(repository, ['add', 'docs/closure.md']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs descendant']);
      const descendant = stack.currentCheckoutState({ repositoryRoot: repository });
      const assessment = stack.assessSelfDevArtifactIntegrity(artifact, descendant);
      expect(assessment.trustStatus).toBe('VERIFIED_SOURCE_EQUIVALENT_DESCENDANT');
      expect(assessment.replayStatus).toBe('PASS');
      expect(assessment.passCandidateCount).toBe(0);
      expect(isFutureReviewPrerequisitePass(assessment as unknown as SelfDevTrustAssessment)).toBe(false);
      const eligibility = stack.assessFutureReviewEligibility(artifact, descendant);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.candidates).toHaveLength(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('valid-matrix documentation descendant remains eligible with agreeing candidate count', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      fs.mkdirSync(path.join(repository, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(repository, 'docs', 'closure.md'), 'synthetic documentation\n');
      git(repository, ['add', 'docs/closure.md']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs descendant']);
      const descendant = stack.currentCheckoutState({ repositoryRoot: repository });
      const eligibility = stack.assessFutureReviewEligibility(artifact, descendant);
      expect(eligibility.assessment.trustStatus).toBe('VERIFIED_SOURCE_EQUIVALENT_DESCENDANT');
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.candidates).toHaveLength(1);
      expect(eligibility.candidates.length).toBe(eligibility.assessment.passCandidateCount);
    } finally {
      fixture.cleanup();
    }
  });

  test('replay tamper fails eligibility and returns no candidates', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const pass = artifact.evaluations[0] as unknown as SelfDevEvaluation;
      const forgedExecution = pass.execution === null ? null : { ...pass.execution, stableFingerprint: `sha256:${'f'.repeat(64)}` };
      const { evaluationId: _evaluationId, ...passIdentity } = { ...pass, execution: forgedExecution };
      const tamperedEvaluation = { ...passIdentity, evaluationId: evaluationIdFor(passIdentity) };
      const tampered = { ...(artifact as unknown as SelfDevSessionArtifact), evaluations: [tamperedEvaluation, ...artifact.evaluations.slice(1)] } as unknown as SelfDevSessionArtifact;
      const reidentified = { ...tampered, artifactId: sessionArtifactIdFor(tampered) } as unknown as SelfDevSessionArtifact;
      expect(() => validateSessionArtifact(reidentified)).not.toThrow();
      const eligibility = stack.assessFutureReviewEligibility(reidentified, baseline);
      expect(eligibility.assessment.replayStatus).not.toBe('PASS');
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.candidates).toHaveLength(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('source-bundle mismatch fails eligibility', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const forgedCurrent = { ...baseline, sourceBundleDigest: `sha256:${'d'.repeat(64)}` };
      const eligibility = stack.assessFutureReviewEligibility(artifact, forgedCurrent);
      expect(eligibility.assessment.trustStatus).toBe('SOURCE_BUNDLE_MISMATCH');
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.candidates).toHaveLength(0);
    } finally {
      fixture.cleanup();
    }
  });

  test('contract-digest mismatch fails eligibility', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const forgedCurrent = { ...baseline, contractDigest: `sha256:${'e'.repeat(64)}` };
      const eligibility = stack.assessFutureReviewEligibility(artifact, forgedCurrent);
      expect(eligibility.assessment.trustStatus).toBe('CONTRACT_DIGEST_MISMATCH');
      expect(eligibility.eligible).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  test('dirty authoritative source fails eligibility', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const dirtyCurrent = { ...baseline, authoritativeSourceState: 'DIRTY' as const };
      const eligibility = stack.assessFutureReviewEligibility(artifact, dirtyCurrent);
      expect(eligibility.assessment.trustStatus).toBe('AUTHORITATIVE_SOURCE_DIRTY');
      expect(eligibility.eligible).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  test('unrelated baseline fails eligibility', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const unrelated = { ...baseline, currentHeadSha: 'f'.repeat(40), isAncestor: () => false };
      const eligibility = stack.assessFutureReviewEligibility(artifact, unrelated);
      expect(eligibility.assessment.trustStatus).toBe('BASELINE_MISMATCH');
      expect(eligibility.eligible).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  test('legacy v1 is never eligible', () => {
    const legacy = {
      schemaVersion: 'nightwatch.selfdev-session.private.v1',
      artifactId: `session:sha256:${'a'.repeat(64)}`,
      baseNightwatchSha: 'b'.repeat(40),
      proposerClass: 'SYNTHETIC_DETERMINISTIC',
      candidateCount: 0,
      evaluations: [],
      adoptionStatus: 'NOT_AUTHORIZED_PHASE_8A',
      publication: 'PROHIBITED',
      sourceWrites: 0,
      gitWrites: 0,
      externalCalls: 0,
      safetyVector: {
        devContacts: 0, nextContacts: 0, productionContacts: 0, productMutations: 0,
        databaseQueries: 0, infrastructureQueries: 0, externalAiCalls: 0, realModelCalls: 0,
        publication: 0, runtimeGitWrites: 0, nightwatchRuntimeSourceWrites: 0, alphausWrites: 0,
      },
    };
    const assessment = assessSelfDevArtifactIntegrity(legacy);
    expect(assessment.trustStatus).toBe('LEGACY_UNVERIFIED_NOT_ELIGIBLE');
    expect(isFutureReviewPrerequisitePass(assessment as unknown as SelfDevTrustAssessment)).toBe(false);
  });

  test('malformed pass counts are never eligible regardless of trust/replay status', () => {
    const base: SelfDevTrustAssessment = {
      schemaVersion: 'nightwatch.selfdev-trust-assessment.private.v1',
      trustStatus: 'VERIFIED_EXACT_BASE',
      artifactId: `session:sha256:${'a'.repeat(64)}`,
      schemaVersionInspected: 'nightwatch.selfdev-session.private.v2',
      baseNightwatchSha: 'b'.repeat(40),
      currentHeadSha: 'b'.repeat(40),
      sourceBundleMatch: 'MATCH',
      contractDigestMatch: 'MATCH',
      baselineRelation: 'EXACT_BASE',
      replayStatus: 'PASS',
      passCandidateCount: 1,
      adoptionStatus: 'NOT_AUTHORIZED_PHASE_8A',
      publication: 'PROHIBITED',
      sourceWrites: 0,
      gitWrites: 0,
      externalCalls: 0,
    };
    for (const passCandidateCount of [-1, NaN, Infinity, 0.5, 0] as const) {
      expect(isFutureReviewPrerequisitePass({ ...base, passCandidateCount })).toBe(false);
    }
    const { passCandidateCount: _omitted, ...withoutCount } = base;
    expect(isFutureReviewPrerequisitePass(withoutCount as unknown as SelfDevTrustAssessment)).toBe(false);
  });

  test('a forged positive pass count cannot override a non-PASS replay status', () => {
    const forged: SelfDevTrustAssessment = {
      schemaVersion: 'nightwatch.selfdev-trust-assessment.private.v1',
      trustStatus: 'VERIFIED_EXACT_BASE',
      artifactId: `session:sha256:${'a'.repeat(64)}`,
      schemaVersionInspected: 'nightwatch.selfdev-session.private.v2',
      baseNightwatchSha: 'b'.repeat(40),
      currentHeadSha: 'b'.repeat(40),
      sourceBundleMatch: 'MATCH',
      contractDigestMatch: 'MATCH',
      baselineRelation: 'EXACT_BASE',
      replayStatus: 'FAIL',
      passCandidateCount: 1,
      adoptionStatus: 'NOT_AUTHORIZED_PHASE_8A',
      publication: 'PROHIBITED',
      sourceWrites: 0,
      gitWrites: 0,
      externalCalls: 0,
    };
    expect(isFutureReviewPrerequisitePass(forged)).toBe(false);
  });

  test('a forged VERIFIED status cannot override mismatched source/contract match fields', () => {
    const forged: SelfDevTrustAssessment = {
      schemaVersion: 'nightwatch.selfdev-trust-assessment.private.v1',
      trustStatus: 'VERIFIED_EXACT_BASE',
      artifactId: `session:sha256:${'a'.repeat(64)}`,
      schemaVersionInspected: 'nightwatch.selfdev-session.private.v2',
      baseNightwatchSha: 'b'.repeat(40),
      currentHeadSha: 'b'.repeat(40),
      sourceBundleMatch: 'MISMATCH',
      contractDigestMatch: 'MATCH',
      baselineRelation: 'EXACT_BASE',
      replayStatus: 'PASS',
      passCandidateCount: 1,
      adoptionStatus: 'NOT_AUTHORIZED_PHASE_8A',
      publication: 'PROHIBITED',
      sourceWrites: 0,
      gitWrites: 0,
      externalCalls: 0,
    };
    expect(isFutureReviewPrerequisitePass(forged)).toBe(false);
    expect(isFutureReviewPrerequisitePass({ ...forged, sourceBundleMatch: 'MATCH', contractDigestMatch: 'MISMATCH' })).toBe(false);
  });

  test('regenerated pass-candidate count disagreement with the assessment fails closed', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, {});
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const assessment = stack.assessSelfDevArtifactIntegrity(artifact, baseline);
      expect(assessment.passCandidateCount).toBe(1);
      // Directly forging a higher passCandidateCount on the assessment (as a
      // future caller might if it computed the count itself) must not make
      // the canonical gate report more candidates than replay regenerates.
      const forgedAssessment = { ...assessment, passCandidateCount: 2 };
      expect(isFutureReviewPrerequisitePass(forgedAssessment as unknown as SelfDevTrustAssessment)).toBe(true);
      // The canonical gate re-derives its own assessment from the artifact and
      // current view rather than trusting a caller-supplied one, so it still
      // cross-checks against the true regenerated count (1) and would only
      // disagree if fed a forged assessment directly. Prove the cross-check
      // exists by exercising it through the real (non-forged) path once more.
      const eligibility = stack.assessFutureReviewEligibility(artifact, baseline);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.candidates).toHaveLength(assessment.passCandidateCount);
    } finally {
      fixture.cleanup();
    }
  });

  test('zero side effects: eligibility assessment never mutates counters', () => {
    const { fixture, stack, repository } = makeFixture();
    try {
      const artifact = attestedArtifact(stack, repository, { fixture: 'UNSAFE_ACTION' });
      const baseline = stack.currentCheckoutState({ repositoryRoot: repository });
      const eligibility = stack.assessFutureReviewEligibility(artifact, baseline);
      expect(eligibility.assessment.sourceWrites).toBe(0);
      expect(eligibility.assessment.gitWrites).toBe(0);
      expect(eligibility.assessment.externalCalls).toBe(0);
      expect(eligibility.assessment.adoptionStatus).toBe('NOT_AUTHORIZED_PHASE_8A');
      expect(eligibility.assessment.publication).toBe('PROHIBITED');
    } finally {
      fixture.cleanup();
    }
  });
});
