import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  AiReviewArtifactStore,
  AiReviewSession,
  SyntheticAiReviewProvider,
  artifactDigest,
  buildBugReviewInput,
  buildOracleReviewInput,
  confirmationMatches,
  confirmationTokenForDecision,
  decisionFromMenuChoice,
  digest,
  loadOwnerReviewSnapshot,
  renderOwnerReviewSnapshot,
  renderOwnerReviewStatus,
  sanitizeTerminalText,
  type AiHumanReviewRecord,
  type AiReadableHumanReviewRecord,
} from '../../src/core/aiReview';
import { recordConfirmedOwnerDecision } from '../../src/core/aiReview/ownerDecision';
import * as publicAiReview from '../../src/core/aiReview';
import { PrivateArtifactStore } from '../../src/core/policy';
import { createBugDossier, minimizeFailure, PASSIVE_MINIMIZATION_SAFETY } from '../../src/core/triage';
import { compareBrowserAndApi } from '../../src/core/triage/differential';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { localizeFaultBoundary } from '../../src/core/triage/localization';
import { rankConfidence } from '../../src/core/triage/confidence';
import { rankTriagePriority } from '../../src/core/triage/summaries';
import { CHANGE_INTELLIGENCE_SCHEMA_VERSION, SELECTOR_VERSION, selectJourneys, type ChangeSet } from '../../src/core/changeIntelligence';
import { runNodeRace } from './support/crossProcessRace';

const ROOT = path.resolve(__dirname, '../..');
const OWNER_RACE_CHILD = path.resolve(__dirname, '../fixtures/ai-owner-decision-race-child.mjs');
const BUG_FINGERPRINT = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FAILURE_SAFETY = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

async function bugInput() {
  const minimization = await minimizeFailure({
    originalSequence: [{ actionId: 'read.exchange', semanticClass: 'KNOWN_READ', routeClass: '/ripple/exchange', sourceApproved: true, catalogVersion: 'synthetic.catalog.v1' }],
    anomalyFingerprint: BUG_FINGERPRINT,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['read.exchange']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    replay: () => ({ status: 'FAILURE' as const, anomalyFingerprint: BUG_FINGERPRINT, safety: FAILURE_SAFETY }),
  });
  const browser = { failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: BUG_FINGERPRINT, runtimeCategory: 'product' };
  const api = { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' };
  const differential = compareBrowserAndApi(browser, api);
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimization.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return buildBugReviewInput(createBugDossier({
    firstObserved: '2026-08-14T00:00:00.000Z',
    lastObserved: '2026-08-14T00:01:00.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['synthetic-seed-1'],
    routeClass: '/ripple/exchange',
    apiOperationFamily: 'payer-exchange',
    oracleFingerprint: BUG_FINGERPRINT,
    evidenceLevel: 'L3',
    minimization,
    browserApiDifferential: differential,
    sourceCorrelation: source,
    likelyFaultBoundary: boundary,
    confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: ['deployment identity remains unresolved'],
  }), { sourceSnapshotRefs: ['repo:synthetic/ripple-ui@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'] });
}

function changeInput() {
  const changeSet: ChangeSet = {
    schemaVersion: CHANGE_INTELLIGENCE_SCHEMA_VERSION,
    selectorVersion: SELECTOR_VERSION,
    changesetId: 'cs-synthetic-owner-review',
    generatedAt: '2026-08-14T00:00:00.000Z',
    repoBaselines: [{ repoId: 'mobingilabs/ripple-ui', baseSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', headSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', mergeBase: null, rangeSemantics: 'BASE_SHA_TO_HEAD_SHA', source: 'LOCAL_COMMITTED_CHANGE', dirtyExcluded: true }],
    changedRepos: ['mobingilabs/ripple-ui'],
    changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    commits: [],
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  return buildOracleReviewInput(changeSet, selectJourneys(changeSet), { knownDeterministicInvariants: ['known-json-invariant'], missingCoverageClasses: ['content-type'] });
}

async function bugArtifact() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-owner-review-bug-'));
  const privateStore = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
  const store = new AiReviewArtifactStore(privateStore);
  const result = await new AiReviewSession(new SyntheticAiReviewProvider('VALID_BUG_DRAFT'), { store, now: () => new Date('2026-08-14T00:00:00.000Z') }).reviewBugCandidate(await bugInput());
  return { root, privateStore, store, result };
}

async function oracleArtifact() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-owner-review-oracle-'));
  const privateStore = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
  const store = new AiReviewArtifactStore(privateStore);
  const result = await new AiReviewSession(new SyntheticAiReviewProvider('VALID_ORACLE_SUGGESTION'), { store, now: () => new Date('2026-08-14T00:00:00.000Z') }).suggestOracle(changeInput());
  return { root, privateStore, store, result };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function privateFile(id: string, suffix: string): string {
  return `${id.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 150)}.${suffix}.json`;
}

type DecisionInput = Omit<Parameters<typeof recordConfirmedOwnerDecision>[0], 'confirmation' | 'expectedArtifactDigest'> & { expectedArtifactDigest?: string };

function recordDecision(input: DecisionInput) {
  const expectedArtifactDigest = input.expectedArtifactDigest ?? loadOwnerReviewSnapshot(input.store, input.target).artifactDigest;
  return recordConfirmedOwnerDecision({ ...input, expectedArtifactDigest, confirmation: confirmationTokenForDecision(input.decision) });
}

function cli(args: string[], privateRoot?: string) {
  const env = { ...process.env };
  let childRoot: string | undefined;
  try {
    if (privateRoot !== undefined) {
      // The private-store policy treats an env override as an operator root
      // and correctly rejects one inside the canonical workspace. A clean
      // checkout under /tmp therefore needs its synthetic child root outside
      // /tmp while retaining the same fixture bytes and owner-only modes.
      childRoot = fs.mkdtempSync(path.join('/var/tmp', 'nightwatch-owner-review-cli-'));
      fs.chmodSync(childRoot, 0o700);
      for (const file of fs.readdirSync(privateRoot)) {
        const source = path.join(privateRoot, file);
        const destination = path.join(childRoot, file);
        fs.copyFileSync(source, destination);
        fs.chmodSync(destination, 0o600);
      }
      env.NIGHTWATCH_PRIVATE_STATE_DIR = childRoot;
    }
    return spawnSync(process.execPath, [path.join(ROOT, 'bin', 'ai-owner-review.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', env });
  } finally {
    if (childRoot !== undefined) cleanup(childRoot);
  }
}

function legacyBug(artifact: Awaited<ReturnType<typeof bugArtifact>>['result']['artifact']) {
  const schemaVersion = 'nightwatch.ai-bug-draft.private.v1' as const;
  const draftId = `draft:${digest({ schemaVersion, inputPackageDigest: artifact.inputPackageDigest, providerClass: artifact.modelProviderClass, modelIdentifier: artifact.modelIdentifier, promptTemplateVersion: artifact.promptTemplateVersion, inputSchemaVersion: artifact.inputSchemaVersion, responseDigest: artifact.responseDigest })}`;
  return { ...artifact, schemaVersion, draftId, status: 'OWNER_APPROVED_DRAFT' as const };
}

function legacyOracle(artifact: Awaited<ReturnType<typeof oracleArtifact>>['result']['artifact']) {
  const schemaVersion = 'nightwatch.ai-oracle-suggestion.private.v1' as const;
  const suggestionId = `suggestion:${digest({ schemaVersion, inputChangePackageDigest: artifact.inputChangePackageDigest, providerClass: artifact.modelProviderClass, modelIdentifier: artifact.modelIdentifier, promptTemplateVersion: artifact.promptTemplateVersion, inputSchemaVersion: artifact.inputSchemaVersion, responseDigest: artifact.responseDigest })}`;
  return { ...artifact, schemaVersion, suggestionId, status: 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW' as const };
}

test.describe('Phase 7B.2 exact snapshot loading and safe rendering', () => {
  test('show renders a bug snapshot with snapshot-only freshness and visible AI prefixes', async () => {
    const fixture = await bugArtifact();
    try {
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId: fixture.result.artifact.draftId });
      const rendered = renderOwnerReviewSnapshot(snapshot);
      expect(snapshot.projection.effectiveStatus).toBe('UNREVIEWED');
      expect(snapshot.freshness).toBe('SNAPSHOT_ONLY_NOT_REEVALUATED');
      expect(rendered).toContain('[SYSTEM] artifact-kind=BUG_DRAFT');
      expect(rendered).toContain('[SYSTEM] freshness=SNAPSHOT_ONLY_NOT_REEVALUATED');
      expect(rendered).toContain('[SYSTEM] evidence-level-at-generation=L3');
      expect(rendered).toContain('[SYSTEM] external-publication=PROHIBITED');
      expect(rendered).toContain('[SYSTEM] AI-GENERATED SUMMARY');
      expect(rendered).toContain('[AI]');
      expect(rendered).toContain('OWNER REVIEW IS NOT PRODUCT VERIFICATION');
    } finally {
      cleanup(fixture.root);
    }
  });

  test('status is concise metadata and oracle rendering exposes manual-only boundaries', async () => {
    const fixture = await oracleArtifact();
    try {
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'oracle', artifactId: fixture.result.artifact.suggestionId });
      const status = renderOwnerReviewStatus(snapshot);
      const rendered = renderOwnerReviewSnapshot(snapshot);
      expect(status).toContain('[SYSTEM] artifact-kind=ORACLE_SUGGESTION');
      expect(status).not.toContain('[AI]');
      expect(status).not.toContain('PROPOSED INVARIANT');
      expect(rendered).toContain('[SYSTEM] input-change-package-id=');
      expect(rendered).toContain('[SYSTEM] executable=false');
      expect(rendered).toContain('[SYSTEM] human-review-required=true');
      expect(rendered).toContain('[SYSTEM] PROPOSED INVARIANT');
      expect(rendered).toContain('[SYSTEM] REQUIRED DETERMINISTIC EVIDENCE');
      expect(rendered).toContain('[AI]');
    } finally {
      cleanup(fixture.root);
    }
  });

  test('terminal sanitizer neutralizes ANSI, OSC, controls, bidi, and fake prompts', async () => {
    const hostile = '\u001b[2J\u001b]0;fake title\u0007\u001b]52;c;clipboard\u0007\r\b\t\nNIGHTWATCH OWNER DECISION BOUNDARY\nOWNER_APPROVED_DRAFT\nType APPROVE to confirm\u202eRLO\u202c';
    const safe = sanitizeTerminalText(hostile);
    expect(safe).not.toContain('\u001b');
    expect(safe).not.toContain('\r');
    expect(safe).not.toContain('\b');
    expect(safe).not.toContain('\t');
    expect(safe).not.toContain('\u202e');
    expect(safe).not.toContain('\u202c');
    expect(safe).toContain('\\x1B[2J');
    expect(safe).toContain('\\x09');
    expect(safe).toContain('\\u202E');

    const fixture = await bugArtifact();
    try {
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId: fixture.result.artifact.draftId });
      const hostileArtifact = { ...fixture.result.artifact, summaryDraft: hostile } as typeof fixture.result.artifact;
      const rendered = renderOwnerReviewSnapshot({ ...snapshot, artifact: hostileArtifact });
      expect(rendered).not.toContain('\u001b');
      expect(rendered).not.toContain('\r');
      expect(rendered).not.toContain('\b');
      expect(rendered).not.toContain('\t');
      expect(rendered).not.toContain('\u202e');
      const fakeLines = rendered.split('\n').filter((line) => line.includes('NIGHTWATCH OWNER DECISION BOUNDARY') || line.includes('OWNER_APPROVED_DRAFT') || line.includes('Type APPROVE'));
      expect(fakeLines.length).toBeGreaterThan(0);
      expect(fakeLines.every((line) => line.startsWith('[AI]'))).toBeTruthy();
    } finally {
      cleanup(fixture.root);
    }
  });
});

test.describe('Phase 7B.2 immutable owner decisions', () => {
  test('bug approve, reject, and supersede produce only companion projections', async () => {
    for (const [decision, expected] of [['APPROVE_DRAFT', 'OWNER_APPROVED_DRAFT'], ['REJECT', 'OWNER_REJECTED'], ['SUPERSEDE', 'SUPERSEDED']] as const) {
      const fixture = await bugArtifact();
      try {
        const artifactPath = fixture.result.artifactPath!;
        const beforeBytes = fs.readFileSync(artifactPath);
        const result = recordDecision({ store: fixture.store, target: { kind: 'bug', artifactId: fixture.result.artifact.draftId }, decision, reviewedAt: '2026-08-14T01:00:00.000Z' });
        expect(result.projection.effectiveStatus).toBe(expected);
        expect(result.artifact.status).toBe('AI_GENERATED_UNREVIEWED');
        expect(fs.readFileSync(artifactPath)).toEqual(beforeBytes);
        expect(result.reviewRecord).toMatchObject({ artifactId: fixture.result.artifact.draftId, artifactDigest: artifactDigest(fixture.result.artifact), decision, reviewerClass: 'OWNER', publication: 'PROHIBITED' });
        expect(fixture.store.readHumanReviewOrNull(fixture.result.artifact.draftId)?.notes).toBe('Owner decision recorded through Nightwatch private owner-review CLI.');
      } finally {
        cleanup(fixture.root);
      }
    }
  });

  test('oracle approval is manual implementation review only and catalog/source remain untouched', async () => {
    const fixture = await oracleArtifact();
    try {
      const result = recordDecision({ store: fixture.store, target: { kind: 'oracle', artifactId: fixture.result.artifact.suggestionId }, decision: 'APPROVE_DRAFT', reviewedAt: '2026-08-14T01:01:00.000Z' });
      expect(result.projection.effectiveStatus).toBe('APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW');
      expect(result.artifact.status).toBe('AI_GENERATED_UNREVIEWED');
      expect((result.artifact as { executable: boolean }).executable).toBe(false);
      expect((result.artifact as { externalPublication: string }).externalPublication).toBe('PROHIBITED');
    } finally {
      cleanup(fixture.root);
    }
  });

  test('read-back verifies review identity and a second terminal decision cannot overwrite', async () => {
    const fixture = await bugArtifact();
    try {
      const target = { kind: 'bug' as const, artifactId: fixture.result.artifact.draftId };
      const first = recordDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT', reviewedAt: '2026-08-14T01:02:00.000Z' });
      const filesBefore = fs.readdirSync(fixture.root).sort().map((file) => [file, fs.readFileSync(path.join(fixture.root, file))]);
      expect(() => recordDecision({ store: fixture.store, target, decision: 'REJECT', reviewedAt: '2026-08-14T01:03:00.000Z' })).toThrow('AI_REVIEW_ALREADY_REVIEWED');
      const filesAfter = fs.readdirSync(fixture.root).sort().map((file) => [file, fs.readFileSync(path.join(fixture.root, file))]);
      expect(filesAfter).toEqual(filesBefore);
      const stored = fixture.store.readHumanReview(fixture.result.artifact.draftId);
      expect('reviewId' in stored ? stored.reviewId : null).toBe('reviewId' in first.reviewRecord! ? first.reviewRecord.reviewId : null);
      expect(first.reviewRecord?.artifactDigest).toBe(artifactDigest(fixture.result.artifact));
    } finally {
      cleanup(fixture.root);
    }
  });

  test('competing APPROVE_DRAFT and REJECT processes leave exactly one valid digest-bound winner', async () => {
    const fixture = await bugArtifact();
    try {
      const artifactId = fixture.result.artifact.draftId;
      const artifactBefore = fs.readFileSync(fixture.result.artifactPath!);
      const results = await runNodeRace({
        script: OWNER_RACE_CHILD,
        labels: ['approve', 'reject'],
        argsForLabel: (label, barrierRoot) => [
          fixture.root,
          barrierRoot,
          label,
          'bug',
          artifactId,
          label === 'approve' ? 'APPROVE_DRAFT' : 'REJECT',
          label === 'approve' ? '2026-08-14T02:00:00.000Z' : '2026-08-14T02:00:01.000Z',
        ],
      });
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => result.code === 'AI_REVIEW_ALREADY_REVIEWED')).toHaveLength(1);
      const reviewFiles = fs.readdirSync(fixture.root).filter((file) => file.endsWith('.human-review.json'));
      expect(reviewFiles).toHaveLength(1);
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId });
      expect(['APPROVE_DRAFT', 'REJECT']).toContain(snapshot.reviewRecord?.decision);
      expect(snapshot.reviewRecord?.artifactId).toBe(artifactId);
      expect(snapshot.reviewRecord?.artifactDigest).toBe(artifactDigest(fixture.result.artifact));
      expect(fs.readFileSync(fixture.result.artifactPath!)).toEqual(artifactBefore);
    } finally {
      cleanup(fixture.root);
    }
  });

  test('competing oracle APPROVE_DRAFT and SUPERSEDE processes use the same first-writer-wins review path', async () => {
    const fixture = await oracleArtifact();
    try {
      const artifactId = fixture.result.artifact.suggestionId;
      const artifactBefore = fs.readFileSync(fixture.result.artifactPath!);
      const results = await runNodeRace({
        script: OWNER_RACE_CHILD,
        labels: ['oracle-approve', 'oracle-supersede'],
        argsForLabel: (label, barrierRoot) => [
          fixture.root,
          barrierRoot,
          label,
          'oracle',
          artifactId,
          label === 'oracle-approve' ? 'APPROVE_DRAFT' : 'SUPERSEDE',
          label === 'oracle-approve' ? '2026-08-14T02:01:00.000Z' : '2026-08-14T02:01:01.000Z',
        ],
      });
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => result.code === 'AI_REVIEW_ALREADY_REVIEWED')).toHaveLength(1);
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'oracle', artifactId });
      expect(['APPROVE_DRAFT', 'SUPERSEDE']).toContain(snapshot.reviewRecord?.decision);
      expect(snapshot.reviewRecord?.artifactDigest).toBe(artifactDigest(fixture.result.artifact));
      expect(snapshot.artifact).toMatchObject({ suggestionId: artifactId, executable: false, status: 'AI_GENERATED_UNREVIEWED' });
      expect(fs.readFileSync(fixture.result.artifactPath!)).toEqual(artifactBefore);
    } finally {
      cleanup(fixture.root);
    }
  });

  test('byte-identical review persistence is idempotent and creates no second record', async () => {
    const fixture = await bugArtifact();
    try {
      const target = { kind: 'bug' as const, artifactId: fixture.result.artifact.draftId };
      const first = recordDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT', reviewedAt: '2026-08-14T02:02:00.000Z' });
      const reviewPath = path.join(fixture.root, privateFile(target.artifactId, 'human-review'));
      const before = fs.readFileSync(reviewPath);
      expect(fixture.store.writeHumanReview(first.reviewRecord as AiHumanReviewRecord)).toBe(reviewPath);
      expect(fs.readFileSync(reviewPath)).toEqual(before);
      expect(fs.readdirSync(fixture.root).filter((file) => file.endsWith('.human-review.json'))).toHaveLength(1);
    } finally {
      cleanup(fixture.root);
    }
  });

  test('wrong confirmation cancels without a write and exact confirmation creates one record', async () => {
    const fixture = await bugArtifact();
    try {
      const target = { kind: 'bug' as const, artifactId: fixture.result.artifact.draftId };
      const before = fs.readdirSync(fixture.root).sort();
      const expectedArtifactDigest = loadOwnerReviewSnapshot(fixture.store, target).artifactDigest;
      expect(() => recordConfirmedOwnerDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT', confirmation: 'REJECT', expectedArtifactDigest })).toThrow('AI_OWNER_REVIEW_CANCELLED');
      expect(fs.readdirSync(fixture.root).sort()).toEqual(before);
      const result = recordConfirmedOwnerDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT', confirmation: 'APPROVE', expectedArtifactDigest, reviewedAt: '2026-08-14T01:02:30.000Z' });
      expect(result.reviewRecord).not.toBeNull();
      expect(fixture.store.readHumanReviewOrNull(target.artifactId)).not.toBeNull();
    } finally {
      cleanup(fixture.root);
    }
  });

  test('a changed artifact snapshot cannot be confirmed against the digest that was displayed', async () => {
    const fixture = await bugArtifact();
    try {
      const target = { kind: 'bug' as const, artifactId: fixture.result.artifact.draftId };
      const displayed = loadOwnerReviewSnapshot(fixture.store, target);
      const artifactPath = fixture.result.artifactPath!;
      const persisted = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as { artifact: Record<string, unknown>; status: string };
      persisted.artifact.summaryDraft = 'Synthetic changed snapshot after display.';
      fs.writeFileSync(artifactPath, JSON.stringify(persisted), { encoding: 'utf8', mode: 0o600 });
      expect(() => recordConfirmedOwnerDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT', confirmation: 'APPROVE', expectedArtifactDigest: displayed.artifactDigest })).toThrow('AI_REVIEW_STATE_INVALID');
      expect(fixture.store.readHumanReviewOrNull(target.artifactId)).toBeNull();
    } finally {
      cleanup(fixture.root);
    }
  });

  test('write failure and read-back mismatch fail closed', async () => {
    const fixture = await bugArtifact();
    try {
      class FailingStore extends AiReviewArtifactStore {
        override writeHumanReview(_review: AiHumanReviewRecord): string {
          throw new Error('synthetic write failure');
        }
      }
      expect(() => recordDecision({ store: new FailingStore(fixture.privateStore), target: { kind: 'bug', artifactId: fixture.result.artifact.draftId }, decision: 'REJECT' })).toThrow('AI_REVIEW_STORAGE_FAILED');

      class MismatchStore extends AiReviewArtifactStore {
        override readHumanReviewOrNull(id: string): AiReadableHumanReviewRecord | null {
          const value = super.readHumanReviewOrNull(id);
          if (value !== null && 'reviewId' in value) return { ...value, artifactDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
          return value;
        }
      }
      expect(() => recordDecision({ store: new MismatchStore(fixture.privateStore), target: { kind: 'bug', artifactId: fixture.result.artifact.draftId }, decision: 'REJECT' })).toThrow('AI_REVIEW_STATE_INVALID');
    } finally {
      cleanup(fixture.root);
    }
  });
});

test.describe('Phase 7B.2 exact identity, legacy, and corrupt-state handling', () => {
  test('malformed IDs, missing artifacts, filename collisions, and mismatched persisted IDs fail closed', async () => {
    const fixture = await bugArtifact();
    try {
      const valid = fixture.result.artifact.draftId;
      for (const artifactId of ['', 'suggestion:sha256:' + 'a'.repeat(64), 'draft:bad', 'draft:sha256:' + 'a'.repeat(63), 'draft:sha256:' + 'A'.repeat(64), 'draft:sha256:' + 'a'.repeat(64) + '/x', 'draft:sha256:' + 'a'.repeat(64) + '..', 'draft:sha256:' + 'a'.repeat(300)]) {
        expect(() => loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId })).toThrow(/AI_REVIEW_ARTIFACT_(?:ID_MISMATCH|NOT_FOUND)/);
      }
      const missing = 'draft:sha256:' + 'b'.repeat(64);
      expect(() => loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId: missing })).toThrow('AI_REVIEW_ARTIFACT_NOT_FOUND');

      const collision = 'draft:sha256:' + 'c'.repeat(64);
      fixture.privateStore.writeJson(privateFile(collision, 'bug-draft'), { schemaVersion: fixture.result.artifact.schemaVersion, artifactId: fixture.result.artifact.draftId, artifact: fixture.result.artifact });
      expect(() => loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId: collision })).toThrow('AI_REVIEW_ARTIFACT_ID_MISMATCH');
      expect(() => loadOwnerReviewSnapshot(fixture.store, { kind: 'bug', artifactId: valid })).not.toThrow();
    } finally {
      cleanup(fixture.root);
    }
  });

  test('absent review, corrupt artifact, corrupt review, and invalid schema remain distinct', async () => {
    const fixture = await bugArtifact();
    try {
      const target = { kind: 'bug' as const, artifactId: fixture.result.artifact.draftId };
      expect(loadOwnerReviewSnapshot(fixture.store, target).reviewRecord).toBeNull();
      fs.writeFileSync(path.join(fixture.root, privateFile(target.artifactId, 'bug-draft')), '{', { encoding: 'utf8', mode: 0o600 });
      expect(() => loadOwnerReviewSnapshot(fixture.store, target)).toThrow('AI_REVIEW_ARTIFACT_CORRUPT');

      const second = await bugArtifact();
      try {
        fs.writeFileSync(path.join(second.root, privateFile(second.result.artifact.draftId, 'human-review')), '{', { encoding: 'utf8', mode: 0o600 });
        expect(() => loadOwnerReviewSnapshot(second.store, { kind: 'bug', artifactId: second.result.artifact.draftId })).toThrow('AI_REVIEW_STATE_INVALID');
      } finally {
        cleanup(second.root);
      }

      const third = await bugArtifact();
      try {
        fs.writeFileSync(path.join(third.root, privateFile(third.result.artifact.draftId, 'bug-draft')), JSON.stringify({ status: 'READY', artifact: { invalid: true } }), { encoding: 'utf8', mode: 0o600 });
        expect(() => loadOwnerReviewSnapshot(third.store, { kind: 'bug', artifactId: third.result.artifact.draftId })).toThrow('AI_REVIEW_ARTIFACT_INVALID_SCHEMA');
      } finally {
        cleanup(third.root);
      }
    } finally {
      cleanup(fixture.root);
    }
  });

  test('legacy owner-looking status is unverified and legacy review is historical read-only provenance', async () => {
    const fixture = await bugArtifact();
    try {
      const artifact = legacyBug(fixture.result.artifact);
      fixture.privateStore.writeJson(privateFile(artifact.draftId, 'bug-draft'), { schemaVersion: artifact.schemaVersion, artifactId: artifact.draftId, artifact });
      const target = { kind: 'bug' as const, artifactId: artifact.draftId };
      const unverified = loadOwnerReviewSnapshot(fixture.store, target);
      expect(unverified.projection.effectiveStatus).toBe('UNVERIFIED_LEGACY_REVIEW_STATE');
      expect(() => recordDecision({ store: fixture.store, target, decision: 'APPROVE_DRAFT' })).toThrow('AI_OWNER_REVIEW_LEGACY_READ_ONLY');

      const historical = {
        schemaVersion: 'nightwatch.ai-human-review.private.v1' as const,
        artifactId: artifact.draftId,
        artifactKind: 'BUG_DRAFT' as const,
        decision: 'APPROVE_DRAFT' as const,
        reviewedAt: '2026-08-14T01:04:00.000Z',
        reviewerClass: 'OWNER' as const,
        notes: 'Historical validated provenance.',
        artifactDigest: artifactDigest(artifact),
        reviewSchemaVersion: 'nightwatch.ai-human-review.private.v1' as const,
        publication: 'PROHIBITED' as const,
      };
      fixture.privateStore.writeJson(privateFile(artifact.draftId, 'human-review'), historical);
      const reviewed = loadOwnerReviewSnapshot(fixture.store, target);
      expect(reviewed.projection.effectiveStatus).toBe('OWNER_APPROVED_DRAFT');
      expect(renderOwnerReviewStatus(reviewed)).toContain('HISTORICAL_V1_NO_REVIEW_ID');
      expect(() => recordDecision({ store: fixture.store, target, decision: 'REJECT' })).toThrow('AI_REVIEW_ALREADY_REVIEWED');
    } finally {
      cleanup(fixture.root);
    }
  });

  test('oracle legacy owner-looking status is also unverified without a matching record', async () => {
    const fixture = await oracleArtifact();
    try {
      const artifact = legacyOracle(fixture.result.artifact);
      fixture.privateStore.writeJson(privateFile(artifact.suggestionId, 'oracle-suggestion'), { schemaVersion: artifact.schemaVersion, artifactId: artifact.suggestionId, artifact });
      const snapshot = loadOwnerReviewSnapshot(fixture.store, { kind: 'oracle', artifactId: artifact.suggestionId });
      expect(snapshot.projection.effectiveStatus).toBe('UNVERIFIED_LEGACY_REVIEW_STATE');
      expect(() => recordDecision({ store: fixture.store, target: { kind: 'oracle', artifactId: artifact.suggestionId }, decision: 'APPROVE_DRAFT' })).toThrow('AI_OWNER_REVIEW_LEGACY_READ_ONLY');
    } finally {
      cleanup(fixture.root);
    }
  });
});

test.describe('Phase 7B.2 fixed human gate and CLI boundary', () => {
  test('owner CLI and service remain outside provider, network, enumeration, and publication paths', () => {
    const cliSource = fs.readFileSync(path.join(ROOT, 'bin', 'ai-owner-review.mjs'), 'utf8');
    const serviceSource = fs.readFileSync(path.join(ROOT, 'src', 'core', 'aiReview', 'ownerReview.ts'), 'utf8');
    const decisionSource = fs.readFileSync(path.join(ROOT, 'src', 'core', 'aiReview', 'ownerDecision.ts'), 'utf8');
    expect(cliSource).not.toMatch(/AiReviewSession|SyntheticAiReviewProvider|LoopbackAiReviewProvider|fetch\s*\(|http\.request|https\.request|net\.connect|child_process|readdirSync|writeFileSync/);
    expect(serviceSource).not.toMatch(/AiReviewSession|SyntheticAiReviewProvider|LoopbackAiReviewProvider|fetch\s*\(|http\.request|https\.request|net\.connect|child_process|readdirSync|writeFileSync/);
    expect(cliSource).toContain('ownerReview.ts');
    expect(cliSource).toContain('ownerDecision.ts');
    expect(serviceSource).not.toMatch(/createHumanReviewRecord|writeHumanReview/);
    expect(decisionSource).toContain('createHumanReviewRecord');
    expect(decisionSource).toContain('writeHumanReview');
  });

  test('the public AI-review index does not expose human-decision write authority', () => {
    expect('recordOwnerDecision' in publicAiReview).toBe(false);
    expect('recordConfirmedOwnerDecision' in publicAiReview).toBe(false);
    expect('createHumanReviewRecord' in publicAiReview).toBe(false);
    const indexSource = fs.readFileSync(path.join(ROOT, 'src', 'core', 'aiReview', 'index.ts'), 'utf8');
    expect(indexSource).not.toMatch(/export\s+\*\s+from\s+['"]\.\/ownerReview['"]/);
    expect(indexSource).not.toMatch(/ownerDecision|recordOwnerDecision|recordConfirmedOwnerDecision|createHumanReviewRecord/);
  });

  test('menu and exact confirmation helpers fail closed on accidental or wrong input', () => {
    expect(decisionFromMenuChoice('A')).toBe('APPROVE_DRAFT');
    expect(decisionFromMenuChoice('r')).toBe('REJECT');
    expect(decisionFromMenuChoice('S')).toBe('SUPERSEDE');
    expect(decisionFromMenuChoice('Q')).toBe('CANCEL');
    expect(decisionFromMenuChoice('')).toBe('CANCEL');
    expect(decisionFromMenuChoice('approve')).toBeNull();
    expect(confirmationTokenForDecision('APPROVE_DRAFT')).toBe('APPROVE');
    expect(confirmationMatches('APPROVE_DRAFT', 'APPROVE')).toBe(true);
    expect(confirmationMatches('APPROVE_DRAFT', 'REJECT')).toBe(false);
    expect(confirmationMatches('REJECT', 'reject')).toBe(false);
  });

  test('CLI help, read-only show/status, decision-argument rejection, and non-TTY gate are deterministic', async () => {
    const help = cli(['--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('ai:owner-review');

    const fixture = await bugArtifact();
    try {
      const target = fixture.result.artifact.draftId;
      const show = cli(['show', '--kind', 'bug', '--id', target], fixture.root);
      expect(show.status).toBe(0);
      expect(show.stdout).toContain('[SYSTEM] artifact-id=' + target);
      expect(show.stdout).toContain('[AI]');
      const status = cli(['status', '--kind', 'bug', '--id', target], fixture.root);
      expect(status.status).toBe(0);
      expect(status.stdout).toContain('effective-review-status=UNREVIEWED');
      expect(status.stdout).not.toContain('[AI]');

      for (const flag of ['--approve', '--reject', '--supersede', '--decision=APPROVE_DRAFT', '--yes', '--force', '--non-interactive', '--json', '--root', '/tmp/forbidden']) {
        const rejected = cli(['decide', '--kind', 'bug', '--id', target, flag], fixture.root);
        expect(rejected.status).toBe(2);
        expect(rejected.stderr).toContain('AI_OWNER_REVIEW_USAGE_INVALID');
      }

      const before = fs.readdirSync(fixture.root).sort();
      const nonTty = cli(['decide', '--kind', 'bug', '--id', target], fixture.root);
      expect(nonTty.status).toBe(2);
      expect(nonTty.stderr).toContain('AI_OWNER_REVIEW_INTERACTIVE_REQUIRED');
      expect(fs.readdirSync(fixture.root).sort()).toEqual(before);
    } finally {
      cleanup(fixture.root);
    }
  });
});
