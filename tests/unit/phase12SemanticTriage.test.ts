import { test, expect } from '@playwright/test';
import { createSemanticTriageEvidence, validateSemanticTriageEvidence, MISSING_EVIDENCE_VOCABULARY } from '../../src/core/triage/semanticTriageEvidence';
import { rankSemanticConfidence } from '../../src/core/triage/semanticConfidence';
import { createBugDossierV2, parseBugDossierV2, isReadySemanticDossier, DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { createBugDossier, validateBugDossier } from '../../src/core/triage/dossier';
import { DOSSIER_VERSION } from '../../src/core/triage/types';
import { compareBrowserAndApi } from '../../src/core/triage/differential';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { localizeFaultBoundary } from '../../src/core/triage/localization';
import { rankTriagePriority } from '../../src/core/triage/summaries';
import type { SemanticTriageEvidence } from '../../src/core/triage/semanticTriageEvidence';
import type { MinimizationResult } from '../../src/core/triage/types';

const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const EVIDENCE = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';

function baseTriageEvidence(overrides: Partial<SemanticTriageEvidence> = {}): SemanticTriageEvidence {
  return createSemanticTriageEvidence({
    expectationId: 'ripple.test.expectation',
    targetId: 'ripple.test.target',
    semanticFindingFingerprint: FP,
    invariantDefinitionId: 'invariant:TYPE_MATCH:field',
    semanticOutcome: 'ANOMALY',
    receiptOutcome: 'ANOMALY',
    receiptVersion: 'nightwatch.semantic-evaluation-receipt.v2',
    sourceRepoId: 'mobingilabs/ripple-api',
    sourceSha: SHA,
    sourceEvidenceDigest: EVIDENCE,
    sourceDerivationVersion: 'nightwatch.real-source-expectation-recipe.v2',
    sourceCurrentness: 'CURRENT',
    exactReplayStatus: 'REPRODUCED',
    exactFingerprintMatch: true,
    minimalityGuarantee: '1-MINIMAL',
    freshContextReproductions: 1,
    minimalSequenceReproductions: 1,
    missingEvidence: [],
    ...overrides,
  });
}

function minimizationFixture(): MinimizationResult {
  return {
    schemaVersion: 'nightwatch.failure-minimization.private.v1',
    status: 'MINIMIZED',
    originalSequence: ['a1', 'a2', 'a3'],
    minimalReproducingSequence: ['a1', 'a3'],
    removedActions: ['a2'],
    reproductionCount: 2,
    anomalyFingerprint: FP,
    modelVersion: 'nightwatch.failure-minimization.private.v1',
    catalogVersion: 'synthetic.catalog.v1',
    sourceVersion: 'synthetic.source.v1',
    confidence: 'HIGH',
    minimalityGuarantee: '1-MINIMAL',
    budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 64, maxTotalReplays: 65 },
    replayCount: 3,
    candidateEvaluationCount: 3,
    candidateEvaluations: [],
    invalidCandidateCount: 0,
    safetyRejectionCount: 0,
    freshExactReplay: 'REPRODUCED',
  };
}

test.describe('Phase 12A WORKSTREAM_B — semantic triage evidence DTO', () => {
  test('strict schema accepts canonical valid evidence', () => {
    const e = baseTriageEvidence();
    expect(() => validateSemanticTriageEvidence(e)).not.toThrow();
  });
  test('unknown field rejection', () => {
    const e = { ...baseTriageEvidence(), extra: 'no' } as unknown as SemanticTriageEvidence;
    expect(() => validateSemanticTriageEvidence(e)).toThrow('TRIAGE_EVIDENCE_UNKNOWN_FIELD');
  });
  test('no raw values — sentinel blocked', () => {
    expect(() => baseTriageEvidence({ expectationId: 'CUSTOMER_SENTINEL' } as Partial<SemanticTriageEvidence>)).toThrow();
  });
  test('missing-evidence vocabulary deterministic sorted', () => {
    const a = createSemanticTriageEvidence({ ...baseTriageEvidence(), missingEvidence: ['DEPLOYMENT_STATUS_UNRESOLVED', 'EXACT_REPLAY_REQUIRED'] as unknown as SemanticTriageEvidence['missingEvidence'] });
    expect(a.missingEvidence).toEqual(['DEPLOYMENT_STATUS_UNRESOLVED', 'EXACT_REPLAY_REQUIRED'].sort());
    expect(() => validateSemanticTriageEvidence({ ...a, missingEvidence: ['EXACT_REPLAY_REQUIRED', 'DEPLOYMENT_STATUS_UNRESOLVED'] as unknown as SemanticTriageEvidence['missingEvidence'] } as SemanticTriageEvidence)).toThrow('TRIAGE_EVIDENCE_MISSING_EVIDENCE_NOT_SORTED');
  });
  test('missing-evidence codes strictly vocabulary', () => {
    expect(() => validateSemanticTriageEvidence({ ...baseTriageEvidence(), missingEvidence: ['MADE_UP_CODE' as unknown as SemanticTriageEvidence['missingEvidence'][number]] } as SemanticTriageEvidence)).toThrow();
  });
  test('deterministic repeat >=3 byte-identical canonical JSON', () => {
    const e1 = JSON.stringify(baseTriageEvidence());
    const e2 = JSON.stringify(baseTriageEvidence());
    const e3 = JSON.stringify(baseTriageEvidence());
    expect(e1).toBe(e2);
    expect(e2).toBe(e3);
  });
});

test.describe('Phase 12A WORKSTREAM_B — categorical semantic confidence', () => {
  function rank(evidence: SemanticTriageEvidence, opts: Partial<Parameters<typeof rankSemanticConfidence>[0]> = {}) {
    return rankSemanticConfidence({
      evidence,
      browserApiDifferential: 'BROWSER_API_FAILURE_AGREE',
      oracleReliable: true,
      knownFalsePositive: false,
      safetyClean: true,
      privacyClean: true,
      semanticIdentityPresent: true,
      ...opts,
    });
  }

  test('clean full anomaly + exact replay can satisfy HIGH', () => {
    const e = baseTriageEvidence();
    const r = rank(e);
    expect(r.level).toBe('HIGH');
    expect(r.blockers).toEqual([]);
  });

  test('PARTIAL_COVERAGE blocks HIGH', () => {
    const e = baseTriageEvidence({ semanticOutcome: 'PARTIAL_COVERAGE', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' });
    expect(rank(e).level).not.toBe('HIGH');
    expect(rank(e).blockers).toContain('PARTIAL_COVERAGE');
  });
  test('stale source blocks HIGH', () => {
    const e = baseTriageEvidence({ sourceCurrentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE' });
    expect(rank(e).level).not.toBe('HIGH');
    expect(rank(e).blockers).toContain('EXPECTATION_SOURCE_STALE');
  });
  test('unavailable source blocks HIGH', () => {
    const e = baseTriageEvidence({ sourceCurrentness: 'UNAVAILABLE', receiptOutcome: 'EXPECTATION_SOURCE_UNAVAILABLE' });
    expect(rank(e).level).not.toBe('HIGH');
  });
  test('unknown source blocks HIGH', () => {
    const e = baseTriageEvidence({ sourceCurrentness: 'UNKNOWN' });
    expect(rank(e).level).not.toBe('HIGH');
  });
  test('different replay fingerprint blocks HIGH', () => {
    const e = baseTriageEvidence({ exactFingerprintMatch: false });
    expect(rank(e).level).not.toBe('HIGH');
    expect(rank(e).blockers).toContain('REPLAY_FINGERPRINT_MISMATCH');
  });
  test('exact replay NOT_REPRODUCED blocks HIGH', () => {
    const e = baseTriageEvidence({ exactReplayStatus: 'NOT_REPRODUCED', exactFingerprintMatch: false });
    expect(rank(e).level).not.toBe('HIGH');
  });
  test('safety nonzero blocks HIGH → UNRESOLVED', () => {
    const e = baseTriageEvidence();
    const r = rank(e, { safetyClean: false });
    expect(r.level).toBe('UNRESOLVED');
    expect(r.blockers).toContain('SAFETY_NONZERO');
  });
  test('privacy failure blocks HIGH → UNRESOLVED', () => {
    const e = baseTriageEvidence();
    expect(rank(e, { privacyClean: false }).level).toBe('UNRESOLVED');
  });
  test('known false-positive blocks HIGH → LOW', () => {
    const e = baseTriageEvidence();
    expect(rank(e, { knownFalsePositive: true }).level).toBe('LOW');
  });
  test('NO_EXPECTATION blocks HIGH', () => {
    const e = baseTriageEvidence({ semanticOutcome: 'NO_EXPECTATION', receiptOutcome: 'NO_EXPECTATION' });
    expect(rank(e).level).not.toBe('HIGH');
  });
  test('INTERNAL_ERROR blocks HIGH', () => {
    const e = baseTriageEvidence({ semanticOutcome: 'INTERNAL_ERROR', receiptOutcome: 'INTERNAL_ERROR' });
    expect(rank(e).level).not.toBe('HIGH');
  });
  test('browser/API agreement alone cannot create HIGH when semantic missing', () => {
    // Evidence missing semantic identity or not ANOMALY -> even with BROWSER_API_FAILURE_AGREE, not HIGH
    const e = baseTriageEvidence({ semanticOutcome: 'PASS', receiptOutcome: 'PASS' });
    const r = rank(e, { browserApiDifferential: 'BROWSER_API_FAILURE_AGREE' });
    expect(r.level).not.toBe('HIGH');
  });
  test('oracle unreliable blocks HIGH', () => {
    const e = baseTriageEvidence();
    expect(rank(e, { oracleReliable: false }).level).not.toBe('HIGH');
  });
  test('missing semantic identity blocks HIGH', () => {
    const e = baseTriageEvidence();
    expect(rank(e, { semanticIdentityPresent: false }).level).not.toBe('HIGH');
  });
  test('source relevance absent does not automatically negate if anomaly reproduced — still may be HIGH per rule', () => {
    // In semantic model, source relevance is not required for HIGH — source currentness is. So a CURRENT but no source change relevance still HIGH.
    const e = baseTriageEvidence();
    expect(rank(e).level).toBe('HIGH');
  });
  test('deterministic repeat >=3 identical level', () => {
    const e = baseTriageEvidence();
    expect(rank(e).level).toBe(rank(e).level);
    expect(rank(e).level).toBe(rank(e).level);
    expect(rank(e).blockers).toEqual(rank(e).blockers);
  });
});

test.describe('Phase 12A WORKSTREAM_B — dossier v1 compatibility and v2', () => {
  test('historical dossier v1 validation compatibility', async () => {
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' });
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
    const dossier = createBugDossier({
      firstObserved: '2026-08-13T00:00:00.000Z', lastObserved: '2026-08-13T00:01:00.000Z',
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['0x0001'], routeClass: '/ripple/exchange', apiOperationFamily: 'payer-exchange', oracleFingerprint: FP,
      evidenceLevel: 'L3', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'HIGH', reasons: ['reproduced'] }, technicalSeverity: 'MEDIUM', triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: 'HIGH', reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null,
    });
    expect(dossier.schemaVersion).toBe(DOSSIER_VERSION);
    expect(() => validateBugDossier(dossier)).not.toThrow();
  });

  test('v2 strict schema unknown field rejection', () => {
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' });
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
    const e = baseTriageEvidence();
    const dossier = createBugDossierV2({
      firstObserved: '2026-08-13T00:00:00.000Z', lastObserved: '2026-08-13T00:01:00.000Z',
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['0x0001'], routeClass: '/ripple/exchange', apiOperationFamily: 'payer-exchange', oracleFingerprint: FP,
      evidenceLevel: 'L3', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: 'HIGH', reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    expect(dossier.schemaVersion).toBe(DOSSIER_VERSION_V2);
    expect(() => parseBugDossierV2({ ...dossier, unknownField: 'x' } as unknown as typeof dossier)).toThrow('DOSSIER_V2_UNKNOWN_FIELD');
  });

  test('READY requires essential semantic identity — missing blocks READY', () => {
    // protocol-only with NOT_REPRODUCED should be not READY (no semantic evidence, but minimization failed)
    const notReproMin = { ...minimizationFixture(), freshExactReplay: 'NOT_REPRODUCED' as const, status: 'NO_REPRODUCTION' as const };
    const incomplete = isReadySemanticDossier({
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: notReproMin, browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: null,
    } as unknown as Parameters<typeof isReadySemanticDossier>[0]);
    expect(incomplete.ready).toBe(false);
    // Also check that missing essential identity via manual evidence object blocks READY (bypass strict creation)
    const manualMissing: SemanticTriageEvidence = { ...baseTriageEvidence(), expectationId: '' } as unknown as SemanticTriageEvidence;
    const r2 = isReadySemanticDossier({
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: minimizationFixture(), browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: manualMissing,
    } as unknown as Parameters<typeof isReadySemanticDossier>[0]);
    expect(r2.ready).toBe(false);
  });

  test('partial coverage dossier cannot be READY', () => {
    const e = baseTriageEvidence({ semanticOutcome: 'PARTIAL_COVERAGE', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' });
    const r = isReadySemanticDossier({
      firstObserved: null, lastObserved: null, journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: minimizationFixture(), browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: e,
    });
    expect(r.ready).toBe(false);
  });

  test('stale source dossier cannot be READY', () => {
    const e = baseTriageEvidence({ sourceCurrentness: 'STALE' });
    const r = isReadySemanticDossier({
      firstObserved: null, lastObserved: null, journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: minimizationFixture(), browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: e,
    });
    expect(r.ready).toBe(false);
  });

  test('non-reproduced replay cannot satisfy READY', () => {
    const e = baseTriageEvidence({ exactReplayStatus: 'NOT_REPRODUCED', exactFingerprintMatch: false });
    const r = isReadySemanticDossier({
      firstObserved: null, lastObserved: null, journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: minimizationFixture(), browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: e,
    });
    expect(r.ready).toBe(false);
  });

  test('known false-positive not READY', () => {
    const e = baseTriageEvidence();
    const r = isReadySemanticDossier({
      firstObserved: null, lastObserved: null, journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP, evidenceLevel: 'L3',
      minimization: minimizationFixture(), browserApiDifferential: compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null),
      sourceCorrelation: correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] }),
      likelyFaultBoundary: localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] }),
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: 'P1', knownNightwatchDefect: 'NW-AUTH-EXPIRED-REPLAY', alternativesRuledOut: [], missingEvidence: [],
      semanticTriageEvidence: e,
    });
    expect(r.ready).toBe(false);
  });

  test('clean high-confidence semantic candidate yields valid READY v2 when all requirements satisfied', () => {
    const e = baseTriageEvidence();
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' });
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
    const dossier = createBugDossierV2({
      firstObserved: '2026-08-13T00:00:00.000Z', lastObserved: '2026-08-13T00:01:00.000Z',
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['0x0001'], routeClass: '/ripple/exchange', apiOperationFamily: 'payer-exchange', oracleFingerprint: FP,
      evidenceLevel: 'L3', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'HIGH', reasons: [] }, technicalSeverity: 'MEDIUM', triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: 'HIGH', reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    expect(dossier.status).toBe('READY');
    expect(dossier.semanticConfidence?.level).toBe('HIGH');
    expect(() => parseBugDossierV2(dossier)).not.toThrow();
  });

  test('human recipe contains safe action IDs/categorical observation only — no raw values', () => {
    const e = baseTriageEvidence();
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null);
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] });
    const dossier = createBugDossierV2({
      firstObserved: null, lastObserved: null,
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/ripple/exchange', apiOperationFamily: null, oracleFingerprint: FP,
      evidenceLevel: 'L2', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'LOW', reasons: [] }, technicalSeverity: 'LOW', triagePriority: 'P3',
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    // recipe must not contain customer sentinels
    expect(dossier.humanReproductionRecipe.steps.join(' ')).not.toMatch(/CUSTOMER_SENTINEL|TOKEN_SENTINEL/);
    expect(dossier.humanReproductionRecipe.actionIds).toEqual(['a1', 'a3']);
  });

  test('AI-ready projection deterministic and sanitized — no raw values', () => {
    const e = baseTriageEvidence();
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null);
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] });
    const d1 = createBugDossierV2({
      firstObserved: null, lastObserved: null,
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP,
      evidenceLevel: 'L2', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'LOW', reasons: [] }, technicalSeverity: 'LOW', triagePriority: 'P3',
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    const d2 = createBugDossierV2({
      firstObserved: null, lastObserved: null,
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP,
      evidenceLevel: 'L2', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'LOW', reasons: [] }, technicalSeverity: 'LOW', triagePriority: 'P3',
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    expect(JSON.stringify(d1.aiReady)).toBe(JSON.stringify(d2.aiReady));
    expect(JSON.stringify(d1.aiReady.evidence)).not.toMatch(/CUSTOMER_SENTINEL/);
  });

  test('repeated confidence/dossier deterministic', () => {
    const e = baseTriageEvidence();
    const minimization = minimizationFixture();
    const differential = compareBrowserAndApi({ failed: true, routeClass: '/r', structuralState: 'x', operationFamily: 'op', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, null);
    const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [] });
    const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: false, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] });
    const d1 = createBugDossierV2({
      firstObserved: null, lastObserved: null,
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP,
      evidenceLevel: 'L2', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'LOW', reasons: [] }, technicalSeverity: 'LOW', triagePriority: 'P3',
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    const d2 = createBugDossierV2({
      firstObserved: null, lastObserved: null,
      journeyIds: ['ripple-payer-exchange-read'], seeds: ['s'], routeClass: '/r', apiOperationFamily: null, oracleFingerprint: FP,
      evidenceLevel: 'L2', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary,
      confidence: { level: 'LOW', reasons: [] }, technicalSeverity: 'LOW', triagePriority: 'P3',
      knownNightwatchDefect: null, alternativesRuledOut: [], missingEvidence: [], semanticEvidence: null, semanticTriageEvidence: e,
    });
    expect(d1.candidateId).toBe(d2.candidateId);
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  test('missing-evidence vocabulary deterministic sorted in dossier', () => {
    const e = baseTriageEvidence({ missingEvidence: ['DATASTORE_EVIDENCE_OUT_OF_SCOPE_BY_OWNER', 'EXACT_REPLAY_REQUIRED'] } as unknown as { missingEvidence: SemanticTriageEvidence['missingEvidence'] });
    expect(e.missingEvidence).toEqual([...e.missingEvidence].sort());
  });
});
