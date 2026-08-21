// ---------------------------------------------------------------------------
// Phase 15P (A08) — cluster / confidence / dossier pipeline convergence.
//
// Local synthetic only. Proves, at the composed-pipeline level:
//   N1  noise-injection matrices: ordinal/count/timestamp/source-SHA noise
//       does NOT fragment equivalent semantics (semantic + protocol paths);
//   C1  PARTIAL / STALE / UNAVAILABLE / UNAVAILABLE-adjacent evidence can
//       never yield HIGH confidence — enforced by computation, including via
//       readiness-critical codes the evidence itself declares;
//   R1  READY requires the complete evidence set (replay + minimality +
//       semantic coherence) and every gate is strengthen-only;
//   V1  protocol-only historical path stays compatible (v1 dossiers and
//       legacy ledger-shaped entries keep working);
//   D1  determinism: >= 3 repeats deep-equal across the whole pipeline.
// Pure local/synthetic — no network, no browser, no filesystem.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  clusterSemanticObservations,
  semanticClusterKey,
  type SemanticObservation,
} from '../../src/oracles/semantic/cluster';
import { clusterAnomalies } from '../../src/core/triage/clustering';
import { rankSemanticConfidence } from '../../src/core/triage/semanticConfidence';
import {
  createSemanticTriageEvidence,
  type SemanticTriageEvidence,
} from '../../src/core/triage/semanticTriageEvidence';
import {
  createBugDossierV2,
  isReadySemanticDossier,
  isV1Dossier,
  parseBugDossierV2,
  DOSSIER_VERSION_V2,
} from '../../src/core/triage/dossierV2';
import { createBugDossier, validateBugDossier } from '../../src/core/triage/dossier';
import { DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION, type MinimizationResult } from '../../src/core/triage/types';
import {
  buildSemanticAwarePromotionResult,
  semanticPromotionEligible,
  stablePromotionResultJson,
} from '../../src/core/triage/promotionResult';

// --- Shared synthetic identities (fake values only) -------------------------

const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const EVIDENCE_A = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const EVIDENCE_B = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
const DERIV_V2 = 'nightwatch.real-source-expectation-derivation.v2';
const REPO = 'mobingilabs/ripple-api';
const EXP = 'ripple.common-exchange.read.real-source-deep';
const TARGET = 'ripple.common-exchange.read';
const T0 = '2026-08-20T00:00:00.000Z';
const T1 = '2026-08-20T09:31:07.123Z';

function fieldPresent(path: string[]): SemanticObservation['invariant'] {
  return { kind: 'FIELD_PRESENT', path, expected: true };
}

function semanticObservation(overrides: Partial<SemanticObservation> = {}): SemanticObservation {
  return {
    runId: 'run-1',
    observedAt: T0,
    expectationId: EXP,
    targetId: TARGET,
    invariant: fieldPresent(['0', 'month']),
    sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A },
    fingerprint: FP,
    reproduced: true,
    ...overrides,
  };
}

// --- Dossier v2 fixtures -----------------------------------------------------

function minimizationFixture(overrides: Partial<MinimizationResult> = {}): MinimizationResult {
  return {
    schemaVersion: FAILURE_MINIMIZATION_VERSION,
    status: 'MINIMIZED',
    originalSequence: ['a1', 'a2', 'a3'],
    minimalReproducingSequence: ['a1', 'a3'],
    removedActions: ['a2'],
    reproductionCount: 2,
    anomalyFingerprint: FP,
    modelVersion: FAILURE_MINIMIZATION_VERSION,
    catalogVersion: 'synthetic.catalog.v1',
    sourceVersion: SHA_A,
    confidence: 'HIGH',
    minimalityGuarantee: '1-MINIMAL',
    reductionEvidenceClass: 'MINIMALITY_PROVEN',
    budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 64, maxTotalReplays: 65 },
    replayCount: 3,
    candidateEvaluationCount: 3,
    candidateEvaluations: [],
    invalidCandidateCount: 0,
    safetyRejectionCount: 0,
    freshExactReplay: 'REPRODUCED',
    ...overrides,
  };
}

function triageEvidenceFixture(overrides: Partial<SemanticTriageEvidence> = {}): SemanticTriageEvidence {
  return createSemanticTriageEvidence({
    expectationId: EXP,
    targetId: TARGET,
    semanticFindingFingerprint: FP,
    invariantDefinitionId: 'inv:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    semanticOutcome: 'ANOMALY',
    receiptOutcome: 'ANOMALY',
    coverageState: 'VIOLATION',
    receiptVersion: 'nightwatch.semantic-evaluation-receipt.v2',
    sourceRepoId: REPO,
    sourceSha: SHA_A,
    sourceEvidenceDigest: EVIDENCE_A,
    sourceDerivationVersion: DERIV_V2,
    sourceCurrentness: 'CURRENT',
    exactReplayStatus: 'REPRODUCED',
    exactFingerprintMatch: true,
    minimalityGuarantee: '1-MINIMAL',
    freshContextReproductions: 2,
    minimalSequenceReproductions: 2,
    missingEvidence: [],
    ...overrides,
  });
}

function v2InputFixture(overrides: Record<string, unknown> = {}): Parameters<typeof createBugDossierV2>[0] {
  return {
    firstObserved: T0,
    lastObserved: T0,
    journeyIds: ['ripple-common-exchange-read'],
    seeds: ['0x0000000000000001'],
    routeClass: '/ripple/exchange',
    apiOperationFamily: null,
    oracleFingerprint: FP,
    evidenceLevel: 'L3',
    minimization: minimizationFixture(),
    browserApiDifferential: { status: 'BROWSER_API_FAILURE_AGREE', appLayerDiscriminator: 'INCONCLUSIVE', browserOperationFamily: 'ripple-common-exchange-read', apiOperationFamily: null, statusClassSame: null, contentTypeClassSame: null, routeClassSame: null, structuralStateSame: null, parseabilitySame: null, rootCauseClaim: 'NONE' },
    sourceCorrelation: { sourceVersion: SHA_A, deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED', candidates: [], overallRelevance: 'DIRECT_CHANGE_RELEVANCE', rootCauseClaim: 'NONE' },
    likelyFaultBoundary: { primaryBoundary: 'BACKEND_HANDLER', candidateBoundaries: [], confidence: 'HIGH', reasons: [], rootCauseClaim: 'NONE' },
    confidence: { level: 'HIGH', reasons: [] },
    technicalSeverity: 'MEDIUM',
    triagePriority: 'P1',
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticEvidence: null,
    semanticTriageEvidence: triageEvidenceFixture(),
    safetyClean: true,
    privacyClean: true,
    oracleReliable: true,
    ...overrides,
  } as Parameters<typeof createBugDossierV2>[0];
}

// ---------------------------------------------------------------------------
// N1 — noise-injection matrices: clustering stability
// ---------------------------------------------------------------------------

test.describe('Phase 15P A08 — noise-injection clustering stability', () => {
  test('semantic: timestamp/runId/sha/reproduced noise never fragments one contract', () => {
    const baseline = clusterSemanticObservations([
      semanticObservation({ runId: 'run-1' }),
      semanticObservation({ runId: 'run-2' }),
    ]);
    expect(baseline).toHaveLength(1);
    const baselineKey = baseline[0]!.clusterKey;

    // Each dimension varied independently; the equivalent semantics must stay
    // in exactly one cluster with the identical key.
    const variants: readonly (readonly SemanticObservation[])[] = [
      // timestamp noise
      [semanticObservation({ runId: 'run-1', observedAt: T1 }), semanticObservation({ runId: 'run-2', observedAt: '2025-01-01T00:00:00.000Z' })],
      // runId noise
      [semanticObservation({ runId: 'zzz-other-run' }), semanticObservation({ runId: 'aaa-other-run' })],
      // source-SHA movement with identical digest + derivation
      [semanticObservation({ runId: 'run-1', sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } }), semanticObservation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } })],
      // reproduction-flag noise (occurrence metadata)
      [semanticObservation({ runId: 'run-1', reproduced: false }), semanticObservation({ runId: 'run-2', reproduced: false })],
      // occurrence-count noise: extra duplicate collapses into the same cluster
      [semanticObservation({ runId: 'run-1' }), semanticObservation({ runId: 'run-2' }), semanticObservation({ runId: 'run-3' }), semanticObservation({ runId: 'run-4' })],
    ];
    for (const variant of variants) {
      const clusters = clusterSemanticObservations(variant);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.clusterKey).toBe(baselineKey);
      expect(clusters[0]!.contractIdentity).toBe(baseline[0]!.contractIdentity);
    }
    // Occurrence count remains truthful metadata.
    expect(clusterSemanticObservations(variants[4]!)[0]!.occurrenceCount).toBe(4);
  });

  test('semantic: genuine contract change still splits (anti-noise guard)', () => {
    const base = semanticObservation();
    const splits: readonly (readonly SemanticObservation[])[] = [
      [base, semanticObservation({ runId: 'run-2', invariant: fieldPresent(['0', 'exchange_rate']) })],
      [base, semanticObservation({ runId: 'run-2', targetId: 'ripple.payer-exchange.read', expectationId: 'ripple.payer-exchange.read.real-source-deep' })],
      [base, semanticObservation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_B } })],
      [base, semanticObservation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: 'nightwatch.real-source-expectation-derivation.v3', evidenceDigest: EVIDENCE_A } })],
    ];
    for (const pair of splits) {
      expect(clusterSemanticObservations(pair)).toHaveLength(2);
    }
    // Direct key check: SHA moves freely, digest/derivation never silently merge.
    const provenance = { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A };
    expect(semanticClusterKey({ expectationId: EXP, targetId: TARGET, invariant: fieldPresent(['0', 'month']), sourceProvenance: { ...provenance } }))
      .not.toBe(semanticClusterKey({ expectationId: EXP, targetId: TARGET, invariant: fieldPresent(['0', 'month']), sourceProvenance: { ...provenance, evidenceDigest: EVIDENCE_B } }));
  });

  test('protocol: timestamp/runId/freshness/timing noise keeps one historical cluster', () => {
    const features = {
      journeyId: 'ripple-common-exchange-read', envelopeId: 'E1-J1', oracleId: 'oracle.protocol', routeClass: '/ripple/exchange', operationFamily: 'common-exchange', statusClass: '5xx', contentTypeClass: 'json', runtimeCategory: 'product', structuralState: 'table-missing', failureActionId: 'p4.j1.read', sourceImpactRegion: 'ripple-ui:exchange', browserApiResultClass: 'same',
    };
    const base = {
      fingerprint: FP,
      features,
      reproduced: true,
      minimized: true,
      sourceFreshness: 'SOURCE_CURRENT_LOCALLY' as const,
    };
    const baseline = clusterAnomalies([
      { ...base, runId: 'run-1', observedAt: T0, timingClass: 'NONE' },
      { ...base, runId: 'run-2', observedAt: T0, timingClass: 'NONE' },
    ]);
    expect(baseline).toHaveLength(1);
    const key = baseline[0]!.clusterKey;
    const id = baseline[0]!.clusterId;

    const noisy = clusterAnomalies([
      // observedAt / runId / sourceFreshness / reproduced / minimized noise
      { ...base, runId: 'run-zzz', observedAt: T1, timingClass: 'BOUNDED', sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', reproduced: false, minimized: false },
      { ...base, runId: 'run-aaa', observedAt: '2024-12-31T23:59:59.000Z', timingClass: 'NONE', sourceFreshness: 'REMOTE_FRESHNESS_CONFIRMED' },
    ]);
    expect(noisy).toHaveLength(1);
    expect(noisy[0]!.clusterKey).toBe(key);
    expect(noisy[0]!.clusterId).toBe(id);
    // Transient class is deliberately identity-bearing: a transient symptom
    // must not merge with a stable product anomaly.
    const transient = clusterAnomalies([
      { ...base, runId: 'run-1', observedAt: T0, timingClass: 'NONE' },
      { ...base, runId: 'run-2', observedAt: T0, timingClass: 'TRANSIENT' },
    ]);
    expect(transient).toHaveLength(2);
  });

  test('clustering output is invariant under input permutation', () => {
    const obs = [
      semanticObservation({ runId: 'run-b', observedAt: T1 }),
      semanticObservation({ runId: 'run-a', observedAt: T0 }),
      semanticObservation({ runId: 'run-c', observedAt: T0, fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb', invariant: fieldPresent(['0', 'exchange_rate']) }),
    ];
    const permutations = [
      [obs[0]!, obs[1]!, obs[2]!],
      [obs[2]!, obs[1]!, obs[0]!],
      [obs[1]!, obs[2]!, obs[0]!],
      [obs[1]!, obs[0]!, obs[2]!],
      [obs[2]!, obs[0]!, obs[1]!],
      [obs[0]!, obs[2]!, obs[1]!],
    ];
    const reference = JSON.stringify(clusterSemanticObservations(permutations[0]!));
    for (const permutation of permutations) {
      expect(JSON.stringify(clusterSemanticObservations(permutation))).toBe(reference);
    }
  });
});

// ---------------------------------------------------------------------------
// C1 — confidence ceilings for PARTIAL / STALE / UNAVAILABLE (+ declared gaps)
// ---------------------------------------------------------------------------

test.describe('Phase 15P A08 — categorical confidence ceilings', () => {
  function maximalPositiveInput(evidence: SemanticTriageEvidence): Parameters<typeof rankSemanticConfidence>[0] {
    return {
      evidence,
      browserApiDifferential: 'BROWSER_API_FAILURE_AGREE',
      oracleReliable: true,
      knownFalsePositive: false,
      safetyClean: true,
      privacyClean: true,
      semanticIdentityPresent: true,
    };
  }

  test('PARTIAL / STALE / UNAVAILABLE / UNKNOWN can never yield HIGH even with maximal positive evidence', () => {
    const cases: readonly (readonly [string, SemanticTriageEvidence])[] = [
      ['PARTIAL_COVERAGE', triageEvidenceFixture({ semanticOutcome: 'PARTIAL_COVERAGE', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION', freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['STALE', triageEvidenceFixture({ sourceCurrentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE', freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['UNAVAILABLE', triageEvidenceFixture({ sourceCurrentness: 'UNAVAILABLE', receiptOutcome: 'EXPECTATION_SOURCE_UNAVAILABLE', freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['UNKNOWN', triageEvidenceFixture({ sourceCurrentness: 'UNKNOWN', freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['NO_EXPECTATION', triageEvidenceFixture({ semanticOutcome: 'NO_EXPECTATION', receiptOutcome: 'NO_EXPECTATION', coverageState: undefined, freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['INTERNAL_ERROR', triageEvidenceFixture({ semanticOutcome: 'INTERNAL_ERROR', receiptOutcome: 'INTERNAL_ERROR', coverageState: undefined, freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
      ['INVALID_INPUT', triageEvidenceFixture({ semanticOutcome: 'INVALID_INPUT', receiptOutcome: 'INVALID_INPUT', coverageState: undefined, freshContextReproductions: 100, minimalSequenceReproductions: 100 })],
    ];
    for (const [label, evidence] of cases) {
      const result = rankSemanticConfidence(maximalPositiveInput(evidence));
      expect(result.level, label).not.toBe('HIGH');
      expect(result.blockers.length, label).toBeGreaterThan(0);
    }
  });

  test('readiness-critical missingEvidence codes are structural HIGH ceilings', () => {
    const ceilingCodes = [
      'EXACT_REPLAY_REQUIRED',
      'SOURCE_CURRENTNESS_UNRESOLVED',
      'SEMANTIC_EXPECTATION_UNRESOLVED',
      'PARTIAL_COLLECTION_COVERAGE',
      'MINIMIZATION_BUDGET_EXHAUSTED',
      'REPLAY_FINGERPRINT_MISMATCH',
      'COVERAGE_STATE_UNRESOLVED',
    ] as const;
    for (const code of ceilingCodes) {
      const evidence = triageEvidenceFixture({ missingEvidence: [code], freshContextReproductions: 100, minimalSequenceReproductions: 100 });
      const result = rankSemanticConfidence(maximalPositiveInput(evidence));
      expect(result.level, code).not.toBe('HIGH');
      expect(result.blockers, code).toContain(code === 'EXACT_REPLAY_REQUIRED' ? 'EXACT_REPLAY_NOT_REPRODUCED' : code === 'SEMANTIC_EXPECTATION_UNRESOLVED' ? 'NO_EXPECTATION' : code === 'PARTIAL_COLLECTION_COVERAGE' ? 'PARTIAL_COVERAGE' : code);
    }
  });

  test('permanent scope facts never block HIGH', () => {
    const evidence = triageEvidenceFixture({
      missingEvidence: ['DEPLOYMENT_STATUS_UNRESOLVED', 'DATASTORE_EVIDENCE_OUT_OF_SCOPE_BY_OWNER', 'BROWSER_API_DIFFERENTIAL_UNAVAILABLE'],
      freshContextReproductions: 2,
      minimalSequenceReproductions: 2,
    });
    const result = rankSemanticConfidence(maximalPositiveInput(evidence));
    expect(result.level).toBe('HIGH');
    expect(result.blockers).toEqual([]);
  });

  test('source-SHA noise cannot move the confidence level', () => {
    const shaA = rankSemanticConfidence(maximalPositiveInput(triageEvidenceFixture({ sourceSha: SHA_A })));
    const shaB = rankSemanticConfidence(maximalPositiveInput(triageEvidenceFixture({ sourceSha: SHA_B })));
    expect(shaA.level).toBe(shaB.level);
    expect(shaA.blockers).toEqual(shaB.blockers);
  });
});

// ---------------------------------------------------------------------------
// R1 — READY completeness matrix (strengthen-only)
// ---------------------------------------------------------------------------

test.describe('Phase 15P A08 — dossier v2 READY completeness matrix', () => {
  test('complete evidence set is READY with HIGH semantic confidence', () => {
    const input = v2InputFixture();
    expect(isReadySemanticDossier(input)).toEqual({ ready: true });
    const dossier = createBugDossierV2(input);
    expect(dossier.status).toBe('READY');
    expect(dossier.semanticConfidence?.level).toBe('HIGH');
    expect(dossier.semanticConfidence?.blockers).toEqual([]);
  });

  test('each single missing dimension blocks READY with its specific reason', () => {
    const notReadyCases: readonly (readonly [string, Record<string, unknown>, string])[] = [
      ['replay-not-reproduced', { semanticTriageEvidence: triageEvidenceFixture({ exactReplayStatus: 'NOT_REPRODUCED', exactFingerprintMatch: false }) }, 'EXACT_REPLAY_REQUIRED'],
      ['fingerprint-mismatch-in-evidence', { semanticTriageEvidence: triageEvidenceFixture({ exactFingerprintMatch: false }) }, 'EXACT_REPLAY_REQUIRED'],
      ['stale-source', { semanticTriageEvidence: triageEvidenceFixture({ sourceCurrentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE' }) }, 'SOURCE_CURRENTNESS_UNRESOLVED'],
      ['unavailable-source', { semanticTriageEvidence: triageEvidenceFixture({ sourceCurrentness: 'UNAVAILABLE', receiptOutcome: 'EXPECTATION_SOURCE_UNAVAILABLE' }) }, 'SOURCE_CURRENTNESS_UNRESOLVED'],
      ['unknown-source', { semanticTriageEvidence: triageEvidenceFixture({ sourceCurrentness: 'UNKNOWN' }) }, 'SOURCE_CURRENTNESS_UNRESOLVED'],
      ['partial-coverage', { semanticTriageEvidence: triageEvidenceFixture({ semanticOutcome: 'PARTIAL_COVERAGE', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' }) }, 'PARTIAL_COLLECTION_COVERAGE'],
      ['non-anomaly-outcome', { semanticTriageEvidence: triageEvidenceFixture({ semanticOutcome: 'PASS', receiptOutcome: 'PASS', coverageState: 'FULLY_EVALUATED_PASS' }) }, 'NON_ANOMALY_OUTCOME'],
      ['known-false-positive', { knownNightwatchDefect: 'NIGHTWATCH_FALSE_POSITIVE_CATALOG_MATCH' }, 'KNOWN_FALSE_POSITIVE_PRESENT'],
      ['safety-nonzero', { safetyClean: false }, 'SAFETY_PRIVACY_NONZERO'],
      ['privacy-failure', { privacyClean: false }, 'SAFETY_PRIVACY_NONZERO'],
      ['oracle-unresolved', { oracleReliable: false }, 'ORACLE_RELIABILITY_UNRESOLVED'],
      ['minimality-none-despite-reproductions', { semanticTriageEvidence: triageEvidenceFixture({ minimalityGuarantee: 'NONE', minimalSequenceReproductions: 1 }) }, 'REPRODUCTION_EVIDENCE_MISSING'],
      ['declared-dossier-gap', { missingEvidence: ['EXACT_REPLAY_REQUIRED'] }, 'EXACT_REPLAY_REQUIRED'],
      ['declared-dossier-gap-currentness', { missingEvidence: ['SOURCE_CURRENTNESS_UNRESOLVED'] }, 'SOURCE_CURRENTNESS_UNRESOLVED'],
    ];
    // 1-MINIMAL with zero minimal-sequence reproductions is impossible to
    // construct through the validating factory — it fails closed there.
    expect(() => triageEvidenceFixture({ minimalSequenceReproductions: 0 })).toThrow('TRIAGE_EVIDENCE_MINIMALITY_REPRODUCTION_MISMATCH');
    for (const [label, overrides, expectedReason] of notReadyCases) {
      const input = v2InputFixture(overrides);
      const verdict = isReadySemanticDossier(input);
      expect(verdict.ready, label).toBe(false);
      if (expectedReason !== undefined) expect(verdict.reason, label).toBe(expectedReason);
      const dossier = createBugDossierV2(input);
      expect(dossier.status, label).toBe('UNRESOLVED');
    }
  });

  test('manual contradictory evidence (bypassing factory) still cannot be READY', () => {
    const manual = { ...triageEvidenceFixture(), minimalSequenceReproductions: 0 } as unknown as SemanticTriageEvidence;
    const verdict = isReadySemanticDossier(v2InputFixture({ semanticTriageEvidence: manual }));
    expect(verdict).toEqual({ ready: false, reason: 'REPRODUCTION_EVIDENCE_MISSING' });
  });

  test('protocol-only path: READY needs a reproduced fresh exact replay, unchanged otherwise', () => {
    const ready = isReadySemanticDossier(v2InputFixture({ semanticTriageEvidence: null, minimization: minimizationFixture() }));
    expect(ready).toEqual({ ready: true });
    const notReady = isReadySemanticDossier(v2InputFixture({
      semanticTriageEvidence: null,
      minimization: minimizationFixture({ status: 'NO_REPRODUCTION', freshExactReplay: 'NOT_REPRODUCED', minimalityGuarantee: 'NONE', reproductionCount: 0, minimalReproducingSequence: [], removedActions: [] }),
    }));
    expect(notReady).toEqual({ ready: false, reason: 'EXACT_REPLAY_REQUIRED' });
  });

  test('READY composes into the converged promotion verdict as eligible', () => {
    const dossier = createBugDossierV2(v2InputFixture());
    const promotion = buildSemanticAwarePromotionResult({
      clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      clusterKind: 'SEMANTIC',
      candidateId: dossier.candidateId,
      replayStatus: 'PASS',
      replayPhase: 'FRESH_EXACT_REPLAY',
      minimization: 'MINIMALITY_PROVEN',
      confidence: dossier.semanticConfidence?.level ?? 'UNRESOLVED',
      confidenceBlockers: dossier.semanticConfidence?.blockers ?? [],
      readiness: dossier.status === 'READY' ? 'READY' : 'UNRESOLVED',
      sourceCurrentness: 'CURRENT',
      dossierVersionTarget: DOSSIER_VERSION_V2,
    });
    expect(semanticPromotionEligible(promotion)).toBe(true);
    expect(promotion.dossierVersionTarget).toBe(DOSSIER_VERSION_V2);
  });
});

// ---------------------------------------------------------------------------
// V1 — protocol-only historical compatibility round-trips
// ---------------------------------------------------------------------------

test.describe('Phase 15P A08 — v1 dossier and legacy ledger compatibility', () => {
  test('v1 dossier JSON round-trip validates and stays distinct from v2', () => {
    const v1 = createBugDossier({ ...v2InputFixture(), semanticTriageEvidence: undefined } as unknown as Parameters<typeof createBugDossier>[0]);
    expect(v1.schemaVersion).toBe(DOSSIER_VERSION);
    expect(() => validateBugDossier(JSON.parse(JSON.stringify(v1)) as ReturnType<typeof createBugDossier>)).not.toThrow();
    expect(isV1Dossier(JSON.parse(JSON.stringify(v1)))).toBe(true);
    expect(isV1Dossier(JSON.parse(JSON.stringify(createBugDossierV2(v2InputFixture()))))).toBe(false);
    // v1 bytes must not validate through the v2 reader and vice versa.
    expect(() => parseBugDossierV2(JSON.parse(JSON.stringify(v1)))).toThrow('DOSSIER_V2_VERSION_INVALID');
  });

  test('v2 dossier JSON round-trip validates strictly', () => {
    const v2 = createBugDossierV2(v2InputFixture());
    const roundTripped = JSON.parse(JSON.stringify(v2)) as typeof v2;
    expect(() => parseBugDossierV2(roundTripped)).not.toThrow();
    expect(roundTripped.schemaVersion).toBe(DOSSIER_VERSION_V2);
    expect(() => parseBugDossierV2({ ...roundTripped, unexpected: true })).toThrow('DOSSIER_V2_UNKNOWN_FIELD');
  });

  test('legacy ledger entry shape (no dossierVersion) keeps working with v1 dossiers', () => {
    const v1 = createBugDossier({ ...v2InputFixture(), semanticTriageEvidence: undefined } as unknown as Parameters<typeof createBugDossier>[0]);
    // Historical pre-Phase-15 ledger entries carried exactly these fields.
    const legacyEntry = {
      clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      candidateId: v1.candidateId,
      state: 'READY',
      artifactPath: 'artifacts/legacy/dossier.json',
      evidenceLevel: v1.evidenceLevel,
      triagePriority: v1.triagePriority,
    };
    expect(legacyEntry.candidateId).toBe(v1.candidateId);
    expect(Object.prototype.hasOwnProperty.call(legacyEntry, 'dossierVersion')).toBe(false);
    expect(() => validateBugDossier(v1)).not.toThrow();
  });

  test('legacy evidence adapters keep feeding the historical protocol clustering', async () => {
    const { adaptJourneyEvidence } = await import('../../src/core/triage/compatibility');
    const observations = adaptJourneyEvidence({
      runId: 'legacy-run-1',
      observedAt: T0,
      evidence: {
        journeyId: 'ripple-common-exchange-read',
        anomalyFingerprints: [FP, FP],
        globalShellReady: true,
      },
    } as never);
    expect(observations).toHaveLength(2);
    const clusters = clusterAnomalies(observations);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// D1 — determinism: >= 3 repeats deep-equal across the pipeline
// ---------------------------------------------------------------------------

test.describe('Phase 15P A08 — end-to-end determinism and convergence', () => {
  test('full pipeline repeats deep-equal >= 3 times', () => {
    const observations = [
      semanticObservation({ runId: 'run-1' }),
      semanticObservation({ runId: 'run-2', observedAt: T1, sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } }),
    ];
    const evidence = triageEvidenceFixture();
    const input = v2InputFixture();
    let reference: string | null = null;
    for (let i = 0; i < 3; i++) {
      const clusters = clusterSemanticObservations(observations);
      const confidence = rankSemanticConfidence({
        evidence,
        browserApiDifferential: 'BROWSER_API_FAILURE_AGREE',
        oracleReliable: true,
        knownFalsePositive: false,
        safetyClean: true,
        privacyClean: true,
        semanticIdentityPresent: true,
      });
      const dossier = createBugDossierV2(input);
      const promotion = buildSemanticAwarePromotionResult({
        clusterId: `cluster:sha256:${clusters[0]!.clusterKey.slice(-24)}`,
        clusterKind: 'SEMANTIC',
        candidateId: dossier.candidateId,
        replayStatus: 'PASS',
        replayPhase: 'FRESH_EXACT_REPLAY',
        minimization: 'MINIMALITY_PROVEN',
        confidence: confidence.level,
        confidenceBlockers: [...confidence.blockers],
        readiness: dossier.status === 'READY' ? 'READY' : 'UNRESOLVED',
        sourceCurrentness: 'CURRENT',
        dossierVersionTarget: DOSSIER_VERSION_V2,
      });
      const snapshot = JSON.stringify({
        clusters,
        level: confidence.level,
        blockers: confidence.blockers,
        dossier,
        promotion: stablePromotionResultJson(promotion),
      });
      if (reference === null) reference = snapshot;
      expect(snapshot).toBe(reference);
    }
    expect(reference).not.toBeNull();
  });

  test('noise-injected pipeline inputs converge to identical cluster key and decision surface', () => {
    const quiet = (() => {
      const clusters = clusterSemanticObservations([semanticObservation()]);
      return {
        clusterKey: clusters[0]!.clusterKey,
        dossier: createBugDossierV2(v2InputFixture()),
      };
    })();
    // Observation-level noise only (runId/timestamp/SHA/reproduction flag):
    // identical contract identity, identical dossier bytes.
    const observationNoise = (() => {
      const clusters = clusterSemanticObservations([semanticObservation({
        runId: 'totally-different-run',
        observedAt: '2030-01-01T12:34:56.789Z',
        sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A },
        reproduced: false,
      })]);
      return { clusterKey: clusters[0]!.clusterKey, dossier: createBugDossierV2(v2InputFixture()) };
    })();
    expect(observationNoise.clusterKey).toBe(quiet.clusterKey);
    expect(JSON.stringify(observationNoise.dossier)).toBe(JSON.stringify(quiet.dossier));
    // Evidence-provenance noise (source SHA movement with identical digest):
    // same cluster key and same decision surface; the SHA itself stays as
    // truthful provenance metadata inside the persisted evidence record.
    const provenanceNoise = (() => {
      const clusters = clusterSemanticObservations([semanticObservation({
        sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A },
      })]);
      return {
        clusterKey: clusters[0]!.clusterKey,
        dossier: createBugDossierV2(v2InputFixture({ semanticTriageEvidence: triageEvidenceFixture({ sourceSha: SHA_B }) })),
      };
    })();
    expect(provenanceNoise.clusterKey).toBe(quiet.clusterKey);
    expect(provenanceNoise.dossier.status).toBe(quiet.dossier.status);
    expect(provenanceNoise.dossier.candidateId).toBe(quiet.dossier.candidateId);
    expect(provenanceNoise.dossier.semanticConfidence).toEqual(quiet.dossier.semanticConfidence);
    expect(provenanceNoise.dossier.semanticTriageEvidence?.sourceSha).toBe(SHA_B);
  });

  test('privacy: sentinel values fail closed through the whole pipeline', () => {
    expect(() => triageEvidenceFixture({ expectationId: 'CUSTOMER_SENTINEL' })).toThrow(/TRIAGE_EVIDENCE_(EXPECTATION_ID_INVALID|PRIVACY_BLOCKED)/);
    expect(() => clusterSemanticObservations([semanticObservation({ runId: 'TOKEN_SENTINEL' })])).toThrow('SEMANTIC_CLUSTER_PRIVACY_BLOCKED');
  });
});
