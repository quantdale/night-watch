import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { projectFindings } from '../../src/controlCenter/adapters/findingsAdapter';
import { createFindingsAuthorityForTests } from '../../src/controlCenter/authorities/findingsAuthority';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { validateArtifact } from '../../src/core/artifactValidation';
import { PrivateArtifactStore } from '../../src/core/policy';
import {
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  compareBrowserAndApi,
  correlateSourceChanges,
  createBugDossier,
  createBugDossierV2,
  localizeFaultBoundary,
  minimizeFailure,
  rankConfidence,
  rankTriagePriority,
  type MinimizationResult,
} from '../../src/core/triage';
import { DOSSIER_VERSION } from '../../src/core/triage/types';

const FP_A = 'fp:sha256:' + 'a'.repeat(24);
const FP_B = 'fp:sha256:' + 'b'.repeat(24);

async function minimization(fingerprint: string): Promise<MinimizationResult> {
  return minimizeFailure({
    originalSequence: ['a1', 'a2', 'a3'].map((actionId) => ({ actionId, semanticClass: 'KNOWN_READ' as const, routeClass: '/synthetic/read', sourceApproved: true as const, catalogVersion: 'synthetic.catalog.v1' })),
    anomalyFingerprint: fingerprint,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(['a1', 'a2', 'a3']),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: SYNTHETIC_MINIMIZATION_BUDGET,
    replay: (sequence) => {
      const failure = sequence.some((action) => action.actionId === 'a1');
      return {
        status: failure ? 'FAILURE' as const : 'PASS' as const,
        ...(failure ? { anomalyFingerprint: fingerprint } : {}),
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
      };
    },
  });
}

async function dossierInputs(fingerprint: string) {
  const minimized = await minimization(fingerprint);
  const differential = compareBrowserAndApi(
    { failed: true, routeClass: '/synthetic/read', structuralState: 'table-missing', operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: fingerprint, runtimeCategory: 'synthetic' },
    { available: true, failed: false, operationFamily: 'synthetic-read', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: `fp:sha256:${'c'.repeat(24)}` },
  );
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'synthetic/repo', path: 'src/reader.ts', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimized.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return { minimized, differential, source, boundary, confidence };
}

async function v1Dossier(fingerprint: string) {
  const input = await dossierInputs(fingerprint);
  return createBugDossier({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0001'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: fingerprint,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: ['deployment-status-unresolved'],
  });
}

async function v2Dossier(fingerprint: string) {
  const input = await dossierInputs(fingerprint);
  return createBugDossierV2({
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0002'],
    routeClass: '/synthetic/read',
    apiOperationFamily: 'synthetic-read',
    oracleFingerprint: fingerprint,
    evidenceLevel: 'L3',
    minimization: input.minimized,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'LOW',
    triagePriority: rankTriagePriority({ technicalSeverity: 'LOW', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticTriageEvidence: null,
  });
}

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-control-center-findings-'));
  fs.chmodSync(root, 0o700);
  return root;
}

test.describe('Control Center owner-local findings authority', () => {
  test('reads validated v1 and v2 envelopes, ignores other artifacts, and marks partial corruption UNKNOWN', async () => {
    const root = tempRoot();
    try {
      const store = new PrivateArtifactStore({ root });
      const v1 = await v1Dossier(FP_A);
      const v2 = await v2Dossier(FP_B);
      expect(validateArtifact('dossier', v1).valid).toBe(true);
      expect(validateArtifact('dossier', v2).valid).toBe(true);
      store.writeJson(`candidate-${v1.candidateId.replaceAll(':', '-')}.json`, v1);
      store.writeJson('semantic-envelope.json', { dossier: v2 });
      store.writeJson('unrelated.json', { schemaVersion: 'nightwatch.campaign-checkpoint.private.v1', status: 'READY' });
      store.writeJson('candidate-malformed-json-value.json', {
        ...v1,
        reproduction: { ...v1.reproduction, count: 'not-a-count' },
      });
      const corrupt = path.join(root, 'candidate-corrupt.json');
      fs.writeFileSync(corrupt, '{"schemaVersion":"nightwatch.bug-dossier.private.v1",', { encoding: 'utf8', mode: 0o600 });
      fs.chmodSync(corrupt, 0o600);

      const reader = createFindingsAuthorityForTests(root);
      const first = reader.snapshot();
      const second = reader.snapshot();
      expect(first.state).toBe('UNKNOWN');
      expect(first.dossiers).toHaveLength(2);
      expect(first.reasonCodes).toContain('FINDINGS_PARTIAL_CORRUPTION');
      expect(first.reasonCodes).toContain('FINDINGS_SCHEMA_INVALID');
      expect(first.generation).toBe(second.generation);
      expect(JSON.stringify(first)).not.toContain('candidate-corrupt.json');
      expect(JSON.stringify(first)).not.toContain('synthetic.catalog');
      expect(JSON.stringify(first)).not.toContain('src/reader.ts');
      expect(JSON.stringify(first)).not.toContain('candidateEvaluations');
      expect(first.dossiers.every((dossier) => !('sourceChangeCandidates' in dossier))).toBe(true);

      const projected = projectFindings({ dossiers: first.dossiers, state: first.state }, 50);
      expect(projected.state).toBe('UNKNOWN');
      expect(projected.items).toHaveLength(2);
      expect(projected.items.every((item) => item.dossierStatus === 'READY')).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('distinguishes absent, empty, privacy-blocked, and unsafe private roots', () => {
    const parent = tempRoot();
    const missing = path.join(parent, 'missing');
    const absent = createFindingsAuthorityForTests(missing).snapshot();
    expect(absent.state).toBe('UNAVAILABLE');
    expect(absent.reasonCodes).toContain('FINDINGS_ROOT_UNAVAILABLE');

    const emptyRoot = path.join(parent, 'empty');
    fs.mkdirSync(emptyRoot, { mode: 0o700 });
    fs.chmodSync(emptyRoot, 0o700);
    const empty = createFindingsAuthorityForTests(emptyRoot).snapshot();
    expect(empty.state).toBe('EMPTY');
    expect(empty.reasonCodes).toContain('FINDINGS_EMPTY');

    const unsafeRoot = path.join(parent, 'unsafe');
    fs.mkdirSync(unsafeRoot, { mode: 0o755 });
    fs.chmodSync(unsafeRoot, 0o755);
    const unsafe = createFindingsAuthorityForTests(unsafeRoot).snapshot();
    expect(unsafe.state).toBe('UNAVAILABLE');
    expect(unsafe.reasonCodes).toContain('FINDINGS_ROOT_PERMISSIONS_UNSAFE');

    const privacyRoot = path.join(parent, 'privacy');
    fs.mkdirSync(privacyRoot, { mode: 0o700 });
    fs.chmodSync(privacyRoot, 0o700);
    const privacyFile = path.join(privacyRoot, 'candidate-private.json');
    fs.writeFileSync(privacyFile, JSON.stringify({ schemaVersion: DOSSIER_VERSION, status: 'READY', CUSTOMER_SENTINEL: 'synthetic-only' }), { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(privacyFile, 0o600);
    const privacy = createFindingsAuthorityForTests(privacyRoot).snapshot();
    expect(privacy.state).toBe('UNKNOWN');
    expect(privacy.reasonCodes).toContain('FINDINGS_PRIVACY_BLOCKED');

    fs.rmSync(parent, { recursive: true, force: true });
  });

  test('collector shares the findings authority snapshot and keeps UNKNOWN explicit', async () => {
    const root = tempRoot();
    try {
      const corrupt = path.join(root, 'candidate-corrupt.json');
      fs.writeFileSync(corrupt, '{', { encoding: 'utf8', mode: 0o600 });
      fs.chmodSync(corrupt, 0o600);
      let reads = 0;
      const base = createFindingsAuthorityForTests(root);
      const authority = { snapshot: () => { reads += 1; return base.snapshot(); } };
      const collector = createDefaultControlCenterCollector({ findingsAuthority: authority, sourceSnapshotTtlMs: 10_000 });
      const first = await collector.findings({ limit: 50, cursor: null });
      const second = await collector.findings({ limit: 50, cursor: null });
      expect(first.state).toBe('UNKNOWN');
      expect(second).toEqual(first);
      expect(reads).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
