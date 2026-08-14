import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  SELFDEV_AUTHORITATIVE_PATHS,
  SELFDEV_BUDGET,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_CONTRACT_MANIFEST,
  selfDevContractDigest,
  SelfDevEvaluator,
  SyntheticDeterministicProposer,
  ZERO_SELFDEV_SAFETY_VECTOR,
  assertEvaluationStateInvariant,
  candidateIdFor,
  evaluationIdFor,
  replaySession,
  runSyntheticSelfDevSession,
  sessionArtifactIdFor,
  validateEvaluation,
  validateSessionArtifact,
  assessSelfDevArtifactIntegrity,
  missingSelfDevArtifactAssessment,
  verifiedPassCandidates,
  type SelfDevEvaluation,
  type SelfDevProvenance,
  type SelfDevCandidate,
  type SelfDevSessionArtifact,
  type SelfDevSessionReport,
} from '../../src/core/selfDev';
import { sha256Digest, sha256LengthPrefixedEntries } from '../../src/core/selfDev/canonical';
import { SELFDEV_LEGACY_FILE_PREFIX, SELFDEV_V2_FILE_PREFIX, SelfDevPrivateArtifactStore } from '../../src/core/selfDev/storage';
import { currentCheckoutState, sourceBundleDigest } from '../../src/core/provenance/localGit';

const BASE_SHA = 'b'.repeat(40);
const ZERO_SHA = '0'.repeat(40);
const TEST_PROVENANCE: SelfDevProvenance = {
  schemaVersion: 'nightwatch.selfdev-provenance.private.v1',
  gitHeadSha: BASE_SHA,
  sourceBundleDigest: `sha256:${'a'.repeat(64)}`,
  contractDigest: `sha256:${'c'.repeat(64)}`,
  algorithmVersion: 'nightwatch.selfdev-replay-algorithm.v1',
  authoritativeSourceState: 'CLEAN',
  runtimeNodeVersion: '20.0.0',
  provenanceClass: 'SYNTHETIC_TEST_ONLY',
};

function artifactFromReport(report: SelfDevSessionReport): SelfDevSessionArtifact {
  const { privateArtifact: _privateArtifact, ...artifact } = report;
  return artifact as SelfDevSessionArtifact;
}

function reidentifyArtifact(
  artifact: SelfDevSessionArtifact,
  changes: Partial<SelfDevSessionArtifact>,
): SelfDevSessionArtifact {
  const draft = { ...artifact, ...changes } as SelfDevSessionArtifact;
  return { ...draft, artifactId: sessionArtifactIdFor(draft) };
}

function reidentifyEvaluation(
  evaluation: SelfDevEvaluation,
  changes: Partial<SelfDevEvaluation>,
): SelfDevEvaluation {
  const draft = { ...evaluation, ...changes } as SelfDevEvaluation;
  const { evaluationId: _evaluationId, ...identity } = draft;
  return { ...draft, evaluationId: evaluationIdFor(identity) };
}

function withEvaluation(
  artifact: SelfDevSessionArtifact,
  index: number,
  changes: Partial<SelfDevEvaluation>,
): SelfDevSessionArtifact {
  const evaluations = [...artifact.evaluations];
  evaluations[index] = reidentifyEvaluation(evaluations[index]!, changes);
  return reidentifyArtifact(artifact, { evaluations });
}

function validExecution(evaluation: SelfDevEvaluation): NonNullable<SelfDevEvaluation['execution']> {
  if (evaluation.execution !== null) return evaluation.execution;
  const pass = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }).evaluations[0]!;
  if (pass.execution === null) throw new Error('TEST_EXECUTION_MISSING');
  return pass.execution;
}

function resultReferences(): readonly SelfDevEvaluation[] {
  const proposer = new SyntheticDeterministicProposer();
  const valid = proposer.propose({ baseNightwatchSha: BASE_SHA })[0]! as SelfDevCandidate;
  const assertionFailure = { ...valid, assertionIds: ['selfdev.assert.state.ready'] };
  const { candidateId: _candidateId, ...assertionDraft } = assertionFailure;
  const assertionCandidate = { ...assertionDraft, candidateId: candidateIdFor(assertionDraft) };
  let candidateTick = 0;
  const candidateBudget = new SelfDevEvaluator({ clock: () => (candidateTick++ === 0 ? 0 : SELFDEV_BUDGET.maxCandidateRuntimeMs + 1) }).evaluateCandidate(valid);
  let sessionTick = 0;
  const sessionBudget = new SelfDevEvaluator({ clock: () => (sessionTick++ === 0 ? 0 : SELFDEV_BUDGET.maxSessionRuntimeMs + 1) }).evaluateSession([valid])[0]!;
  const transitionCandidateDraft = { ...valid, actionIds: ['selfdev.synthetic.collapse-summary'] };
  const { candidateId: _transitionId, ...transitionWithoutId } = transitionCandidateDraft;
  const transitionCandidate = { ...transitionWithoutId, candidateId: candidateIdFor(transitionWithoutId) };
  return [
    ...runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }).evaluations,
    runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'UNKNOWN_FIELD', persist: false }).evaluations[0]!,
    runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'SCOPE_ESCALATION', persist: false }).evaluations[0]!,
    runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'UNSAFE_ACTION', persist: false }).evaluations[0]!,
    runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'UNSAFE_ASSERTION', persist: false }).evaluations[0]!,
    runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'PRIVACY_VALUE', persist: false }).evaluations[0]!,
    new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(assertionCandidate),
    new SelfDevEvaluator({ clock: () => 0 }).evaluateCandidate(transitionCandidate),
    candidateBudget,
    sessionBudget,
  ];
}

function impossibleMutation(evaluation: SelfDevEvaluation, field: keyof SelfDevEvaluation): Partial<SelfDevEvaluation> {
  switch (field) {
    case 'validationStatus': return { validationStatus: evaluation.validationStatus === 'PASS' ? 'REJECTED' : 'PASS' };
    case 'scopeStatus': return { scopeStatus: evaluation.scopeStatus === 'IN_SCOPE' ? 'REJECTED' : 'IN_SCOPE' };
    case 'duplicateStatus': return { duplicateStatus: evaluation.duplicateStatus === 'UNIQUE' ? 'DUPLICATE' : 'UNIQUE' };
    case 'executionStatus': return { executionStatus: evaluation.executionStatus === 'EXECUTED' ? 'NOT_STARTED' : 'EXECUTED' };
    case 'regressionStatus': return { regressionStatus: evaluation.regressionStatus === 'PASS' ? 'FAIL' : 'PASS' };
    case 'safetyStatus': return { safetyStatus: evaluation.safetyStatus === 'PASS' ? 'FAIL' : 'PASS' };
    case 'privacyStatus': return { privacyStatus: evaluation.privacyStatus === 'PASS' ? 'FAIL' : 'PASS' };
    case 'reasonCode': return { reasonCode: evaluation.reasonCode === 'VALIDATION_OK' ? 'SCHEMA_INVALID' : 'VALIDATION_OK' };
    case 'coverageDelta': return evaluation.coverageDelta.count === 0
      ? { coverageDelta: { added: ['synthetic:mutation'], count: 1 } }
      : { coverageDelta: { added: [], count: 0 } };
    case 'execution': return { execution: evaluation.execution === null ? validExecution(evaluation) : null };
    case 'resultClass': return { resultClass: evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED' ? 'REJECTED_SCHEMA' : 'EVALUATED_PASS_NOT_ADOPTED' };
    default: throw new Error(`UNSUPPORTED_MUTATION:${field}`);
  }
}

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

function makeGitRepo(): string {
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-provenance-git-'));
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

test.describe('Phase 8A.1 v2 identity, semantics, and replay', () => {
  test('session identity is recomputed and filename cannot bypass internal identity', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }));
    const forged = { ...artifact, artifactId: `session:sha256:${'f'.repeat(64)}` };
    expect(() => validateSessionArtifact(forged)).toThrow(/SELFDEV_SESSION_IDENTITY_MISMATCH/);
    expect(validateSessionArtifact(artifact)).toEqual(artifact);

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-id-'));
    try {
      const store = new SelfDevPrivateArtifactStore({ root });
      const other = reidentifyArtifact(artifact, { provenance: { ...artifact.provenance, sourceBundleDigest: `sha256:${'d'.repeat(64)}` } });
      const requestedId = artifact.artifactId;
      const digest = requestedId.slice('session:sha256:'.length);
      store.store.writeJson(`${SELFDEV_V2_FILE_PREFIX}${digest}.json`, other);
      expect(() => store.readSessionArtifact(requestedId)).toThrow(/SELFDEV_ARTIFACT_ID_MISMATCH/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejected raw proposals are not retained in the v2 replay envelope', () => {
    const malformed = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'UNKNOWN_FIELD', persist: false }));
    const encoded = JSON.stringify(malformed);
    expect(encoded).not.toContain('unknownField');
    expect(encoded).not.toContain('synthetic patch');
    expect(encoded).not.toContain('return true');
    expect(malformed.replayDescriptor).toMatchObject({ proposerClass: 'SYNTHETIC_DETERMINISTIC', fixture: 'UNKNOWN_FIELD' });
  });

  test('recomputed impossible PASS state fails semantic validation', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }));
    const pass = artifact.evaluations[0]!;
    const forgedEvaluation = reidentifyEvaluation(pass, {
      validationStatus: 'REJECTED',
      executionStatus: 'NOT_STARTED',
      regressionStatus: 'NOT_RUN',
      reasonCode: 'SCHEMA_INVALID',
      coverageDelta: { added: [], count: 0 },
      execution: null,
    });
    expect(() => validateEvaluation(forgedEvaluation)).toThrow(/SELFDEV_EVALUATION_STATE_INVALID/);
    expect(() => assertEvaluationStateInvariant(forgedEvaluation)).toThrow(/SELFDEV_EVALUATION_STATE_INVALID/);
  });

  test('every evaluator result class has a positive reference and correlated mutations fail', () => {
    const references = resultReferences();
    const classes = new Set(references.map((evaluation) => evaluation.resultClass));
    expect(classes).toEqual(new Set([
      'EVALUATED_PASS_NOT_ADOPTED', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY',
      'REJECTED_SCHEMA', 'REJECTED_SCOPE', 'REJECTED_UNKNOWN_ACTION',
      'REJECTED_UNKNOWN_ASSERTION', 'REJECTED_PRIVACY', 'EVALUATION_FAILED',
    ]));
    const fields: readonly (keyof SelfDevEvaluation)[] = [
      'validationStatus', 'scopeStatus', 'duplicateStatus', 'executionStatus',
      'regressionStatus', 'safetyStatus', 'privacyStatus', 'reasonCode',
      'coverageDelta', 'execution', 'resultClass',
    ];
    for (const reference of references) {
      expect(() => validateEvaluation(reference), reference.resultClass).not.toThrow();
      for (const field of fields) {
        const mutated = reidentifyEvaluation(reference, impossibleMutation(reference, field));
        expect(() => validateEvaluation(mutated), `${reference.resultClass}:${field}`).toThrow(/SELFDEV_(?:EVALUATION_STATE_INVALID|SCHEMA)/);
      }
    }
  });

  test('candidate/evaluation/base binding is independently enforced', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }));
    const first = artifact.evaluations[0]!;
    const other = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, fixture: 'UNSAFE_ACTION', persist: false }).evaluations[0]!;
    const wrongCandidate = reidentifyArtifact(artifact, {
      evaluations: [reidentifyEvaluation(first, { candidateId: other.candidateId, candidateDigest: other.candidateDigest }), ...artifact.evaluations.slice(1)],
    });
    expect(replaySession(wrongCandidate).status).toBe('FAIL');

    const wrongDigest = reidentifyEvaluation(first, { candidateDigest: `sha256:${'e'.repeat(64)}` });
    expect(() => validateEvaluation(wrongDigest)).toThrow(/SELFDEV_CANDIDATE_BINDING_MISMATCH/);

    const wrongEvaluationBase = reidentifyEvaluation(first, { baseNightwatchSha: 'c'.repeat(40) });
    const wrongEvaluationArtifact = reidentifyArtifact(artifact, { evaluations: [wrongEvaluationBase, ...artifact.evaluations.slice(1)] });
    expect(() => validateSessionArtifact(wrongEvaluationArtifact)).toThrow(/SELFDEV_BASELINE_MISMATCH/);

    const mixedSessionBase = reidentifyArtifact(artifact, { baseNightwatchSha: 'd'.repeat(40) });
    expect(() => validateSessionArtifact(mixedSessionBase)).toThrow(/SELFDEV_BASELINE_MISMATCH/);

    const wrongProvenanceHead = reidentifyArtifact(artifact, { provenance: { ...artifact.provenance, gitHeadSha: 'e'.repeat(40) } });
    expect(() => validateSessionArtifact(wrongProvenanceHead)).toThrow(/SELFDEV_BASELINE_MISMATCH/);
  });

  test('ordered replay rejects stable fingerprint, coverage, result, and order tampering', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }));
    expect(replaySession(artifact)).toMatchObject({ status: 'PASS', reason: 'REPLAY_EXACT' });

    const pass = artifact.evaluations[0]!;
    const stableTampered = withEvaluation(artifact, 0, {
      execution: { ...validExecution(pass), stableFingerprint: `sha256:${'f'.repeat(64)}` },
    });
    expect(replaySession(stableTampered).status).toBe('FAIL');

    const coverageTampered = withEvaluation(artifact, 0, {
      coverageDelta: { added: ['state-action:ready:selfdev.synthetic.observe-ready'], count: 1 },
    });
    expect(replaySession(coverageTampered).status).toBe('FAIL');

    const forgedPass = withEvaluation(artifact, 2, {
      validationStatus: pass.validationStatus,
      scopeStatus: pass.scopeStatus,
      duplicateStatus: pass.duplicateStatus,
      executionStatus: pass.executionStatus,
      regressionStatus: pass.regressionStatus,
      safetyStatus: pass.safetyStatus,
      privacyStatus: pass.privacyStatus,
      coverageDelta: pass.coverageDelta,
      execution: pass.execution,
      reasonCode: pass.reasonCode,
      resultClass: pass.resultClass,
    });
    expect(validateSessionArtifact(forgedPass)).toBeTruthy();
    expect(replaySession(forgedPass).status).toBe('FAIL');

    const reordered = reidentifyArtifact(artifact, { evaluations: [artifact.evaluations[1]!, artifact.evaluations[0]!, artifact.evaluations[2]!] });
    expect(validateSessionArtifact(reordered)).toBeTruthy();
    expect(replaySession(reordered).status).toBe('FAIL');
    expect(verifiedPassCandidates(artifact)).toHaveLength(1);
    expect(() => verifiedPassCandidates(reordered)).toThrow(/SELFDEV_FUTURE_REVIEW_NOT_VERIFIED/);
  });

  test('replay descriptor is bounded, ordered, and part of session identity', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false }));
    for (const change of [
      { seed: 1 },
      { fixture: 'DUPLICATE' as const },
      { expectedProposalCount: 1 },
      { baseNightwatchSha: 'c'.repeat(40) },
    ]) {
      const changed = reidentifyArtifact(artifact, { replayDescriptor: { ...artifact.replayDescriptor, ...change } });
      expect(changed.artifactId).not.toBe(artifact.artifactId);
    }
    expect(() => validateSessionArtifact(reidentifyArtifact(artifact, {
      replayDescriptor: { ...artifact.replayDescriptor, seed: -1 as unknown as number },
    }))).toThrow(/SELFDEV_SCHEMA/);
    expect(() => validateSessionArtifact(reidentifyArtifact(artifact, {
      replayDescriptor: { ...artifact.replayDescriptor, unknown: true } as typeof artifact.replayDescriptor,
    }))).toThrow(/SELFDEV_SCHEMA/);
  });
});

test.describe('Phase 8A.1 local source provenance', () => {
  test('contract digest is separate, deterministic, and sensitive to declared evaluator changes', () => {
    const declared = sha256Digest(SELFDEV_CONTRACT_MANIFEST);
    const changedBudget = sha256Digest({
      ...SELFDEV_CONTRACT_MANIFEST,
      budgets: { ...SELFDEV_CONTRACT_MANIFEST.budgets, maxCandidatesPerSession: SELFDEV_CONTRACT_MANIFEST.budgets.maxCandidatesPerSession + 1 },
    });
    expect(selfDevContractDigest()).toBe(declared);
    expect(changedBudget).not.toBe(declared);
    expect(SELFDEV_CONTRACT_MANIFEST.actionDescriptors.length).toBeGreaterThan(0);
    expect(SELFDEV_CONTRACT_MANIFEST.assertionDescriptors.length).toBeGreaterThan(0);
  });

  test('canonical source hashing is length-prefixed, order-normalized, and sensitive to bytes', () => {
    const first = sha256LengthPrefixedEntries([
      { path: 'b', bytes: Buffer.from('two') },
      { path: 'a', bytes: Buffer.from('one') },
    ]);
    const reordered = sha256LengthPrefixedEntries([
      { path: 'a', bytes: Buffer.from('one') },
      { path: 'b', bytes: Buffer.from('two') },
    ]);
    const changed = sha256LengthPrefixedEntries([
      { path: 'a', bytes: Buffer.from('ONE') },
      { path: 'b', bytes: Buffer.from('two') },
    ]);
    expect(first).toBe(reordered);
    expect(first).not.toBe(changed);
  });

  test('clean baseline, docs descendant, source drift, and authoritative dirt are distinct', () => {
    const repository = makeGitRepo();
    try {
      const baseline = currentCheckoutState({ repositoryRoot: repository });
      const initialDigest = baseline.sourceBundleDigest;
      const artifact = artifactFromReport(runSyntheticSelfDevSession({
        baseNightwatchSha: baseline.gitHeadSha,
        provenance: {
          ...TEST_PROVENANCE,
          gitHeadSha: baseline.gitHeadSha,
          sourceBundleDigest: baseline.sourceBundleDigest,
          contractDigest: baseline.contractDigest,
          provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
        },
        persist: false,
      }));
      const exact = assessSelfDevArtifactIntegrity(artifact, baseline);
      expect(exact.trustStatus).toBe('VERIFIED_EXACT_BASE');

      fs.mkdirSync(path.join(repository, 'docs'), { recursive: true });
      fs.writeFileSync(path.join(repository, 'docs', 'closure.md'), 'synthetic documentation\n');
      const docsDirty = currentCheckoutState({ repositoryRoot: repository });
      expect(docsDirty.sourceBundleDigest).toBe(initialDigest);
      expect(assessSelfDevArtifactIntegrity(artifact, docsDirty).trustStatus).toBe('VERIFIED_EXACT_BASE');
      git(repository, ['add', 'docs/closure.md']);
      git(repository, ['commit', '--quiet', '--no-gpg-sign', '-m', 'docs descendant']);
      const docsDescendant = currentCheckoutState({ repositoryRoot: repository });
      expect(docsDescendant.sourceBundleDigest).toBe(initialDigest);
      expect(docsDescendant.isAncestor(baseline.gitHeadSha)).toBe(true);
      expect(assessSelfDevArtifactIntegrity(artifact, docsDescendant).trustStatus).toBe('VERIFIED_SOURCE_EQUIVALENT_DESCENDANT');

      fs.appendFileSync(path.join(repository, 'src/core/selfDev/registry.ts'), '\n// authoritative synthetic drift\n');
      expect(sourceBundleDigest(repository)).not.toBe(initialDigest);
      expect(() => currentCheckoutState({ repositoryRoot: repository })).toThrow(/SELFDEV_AUTHORITATIVE_SOURCE_DIRTY/);
    } finally {
      fs.rmSync(repository, { recursive: true, force: true });
    }
  });

  test('staged and untracked authoritative changes fail while non-Git roots fail closed', () => {
    const stagedRepository = makeGitRepo();
    const untrackedRepository = makeGitRepo();
    const emptyRepository = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-non-git-'));
    try {
      fs.appendFileSync(path.join(stagedRepository, 'src/core/selfDev/types.ts'), '\n// staged synthetic drift\n');
      git(stagedRepository, ['add', 'src/core/selfDev/types.ts']);
      expect(() => currentCheckoutState({ repositoryRoot: stagedRepository })).toThrow(/SELFDEV_AUTHORITATIVE_SOURCE_DIRTY/);

      fs.writeFileSync(path.join(untrackedRepository, 'src/core/selfDev/untracked.ts'), 'export const synthetic = true;\n');
      expect(() => currentCheckoutState({ repositoryRoot: untrackedRepository })).toThrow(/SELFDEV_AUTHORITATIVE_SOURCE_UNTRACKED/);

      expect(() => currentCheckoutState({ repositoryRoot: emptyRepository })).toThrow(/SELFDEV_(?:GIT_COMMAND_FAILED|NON_GIT_ROOT)/);
    } finally {
      fs.rmSync(stagedRepository, { recursive: true, force: true });
      fs.rmSync(untrackedRepository, { recursive: true, force: true });
      fs.rmSync(emptyRepository, { recursive: true, force: true });
    }
  });
});

test.describe('Phase 8A.1 storage, legacy quarantine, and trust assessment', () => {
  test('zero or absent provenance cannot persist and read-only stores create no root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-store-'));
    const missingRoot = path.join(root, 'missing');
    try {
      const readOnly = new SelfDevPrivateArtifactStore({ root: missingRoot, readOnly: true });
      expect(() => readOnly.readSessionArtifact(`session:sha256:${'a'.repeat(64)}`)).toThrow(/SELFDEV_ARTIFACT_NOT_FOUND/);
      expect(fs.existsSync(missingRoot)).toBe(false);
      expect(() => readOnly.store.writeJson('forbidden.json', {})).toThrow(/PRIVATE_ARTIFACT_READ_ONLY/);

      const writable = new SelfDevPrivateArtifactStore({ root });
      const zeroProvenance: SelfDevProvenance = {
        ...TEST_PROVENANCE,
        gitHeadSha: ZERO_SHA,
        provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED',
      };
      expect(() => runSyntheticSelfDevSession({ baseNightwatchSha: ZERO_SHA, provenance: zeroProvenance, artifactStore: writable })).toThrow(/SELFDEV_PROVENANCE_REQUIRED/);
      expect(fs.readdirSync(root)).toEqual([]);
      expect(() => runSyntheticSelfDevSession({ artifactStore: writable })).toThrow(/SELFDEV_PROVENANCE_REQUIRED/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('legacy v1 remains readable but permanently unverified and is not migrated', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-selfdev-legacy-'));
    try {
      const store = new SelfDevPrivateArtifactStore({ root });
      const report = runSyntheticSelfDevSession({ baseNightwatchSha: BASE_SHA, persist: false });
      const legacyId = report.artifactId;
      const legacy = {
        schemaVersion: 'nightwatch.selfdev-session.private.v1',
        artifactId: legacyId,
        baseNightwatchSha: BASE_SHA,
        proposerClass: SELFDEV_PROPOSER_CLASS,
        candidateCount: report.evaluations.length,
        evaluations: report.evaluations.map((evaluation) => ({ ...evaluation, schemaVersion: 'nightwatch.selfdev-evaluation.private.v1' })),
        adoptionStatus: report.adoptionStatus,
        publication: report.publication,
        sourceWrites: 0,
        gitWrites: 0,
        externalCalls: 0,
        safetyVector: ZERO_SELFDEV_SAFETY_VECTOR,
      };
      const digest = legacyId.slice('session:sha256:'.length);
      store.store.writeJson(`${SELFDEV_LEGACY_FILE_PREFIX}${digest}.json`, legacy);
      const stored = store.readSessionArtifact(legacyId);
      expect(stored.kind).toBe('LEGACY_V1');
      const assessment = assessSelfDevArtifactIntegrity(stored.artifact);
      expect(assessment.trustStatus).toBe('LEGACY_UNVERIFIED_NOT_ELIGIBLE');
      expect(fs.readdirSync(root)).toEqual([`${SELFDEV_LEGACY_FILE_PREFIX}${digest}.json`]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('missing artifact assessment is explicit and does not create state', () => {
    const assessment = missingSelfDevArtifactAssessment(`session:sha256:${'a'.repeat(64)}`);
    expect(assessment.trustStatus).toBe('ARTIFACT_NOT_FOUND');
    expect(assessment.adoptionStatus).toBe('NOT_AUTHORIZED_PHASE_8A');
    expect(assessment.sourceWrites).toBe(0);
    expect(() => missingSelfDevArtifactAssessment('not-an-artifact')).toThrow(/SELFDEV_ARTIFACT_ID_INVALID/);
  });

  test('source, contract, and baseline drift are independently non-trusted', () => {
    const artifact = artifactFromReport(runSyntheticSelfDevSession({
      baseNightwatchSha: BASE_SHA,
      provenance: { ...TEST_PROVENANCE, provenanceClass: 'LOCAL_GIT_SOURCE_ATTESTED' },
      persist: false,
    }));
    const current = {
      currentHeadSha: BASE_SHA,
      sourceBundleDigest: TEST_PROVENANCE.sourceBundleDigest,
      contractDigest: TEST_PROVENANCE.contractDigest,
      authoritativeSourceState: 'CLEAN' as const,
      isAncestor: () => true,
    };
    expect(assessSelfDevArtifactIntegrity(artifact, current).trustStatus).toBe('VERIFIED_EXACT_BASE');
    expect(assessSelfDevArtifactIntegrity(artifact, { ...current, sourceBundleDigest: `sha256:${'d'.repeat(64)}` }).trustStatus).toBe('SOURCE_BUNDLE_MISMATCH');
    expect(assessSelfDevArtifactIntegrity(artifact, { ...current, contractDigest: `sha256:${'e'.repeat(64)}` }).trustStatus).toBe('CONTRACT_DIGEST_MISMATCH');
    expect(assessSelfDevArtifactIntegrity(artifact, { ...current, currentHeadSha: 'f'.repeat(40), isAncestor: () => false }).trustStatus).toBe('BASELINE_MISMATCH');
    expect(assessSelfDevArtifactIntegrity(artifact, { ...current, authoritativeSourceState: 'DIRTY' }).trustStatus).toBe('AUTHORITATIVE_SOURCE_DIRTY');
  });
});
