import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  createBugDossier,
  createIncompleteDossier,
  adaptApiOracleObservation,
  adaptExplorationEvidence,
  adaptJourneyEvidence,
  buildMorningBrief,
  buildOvernightSummary,
  captureRelevantRepoBeforeState,
  clusterAnomalies,
  compareBrowserAndApi,
  correlateSourceChanges,
  findKnownNightwatchDefect,
  localizeFaultBoundary,
  minimizeFailure,
  PASSIVE_MINIMIZATION_SAFETY,
  rankConfidence,
  rankTriagePriority,
  suppressDuplicateClusters,
  triageAnomaly,
  SYNTHETIC_MINIMIZATION_BUDGET,
  validateBugDossier,
  type MinimizationAction,
  type MinimizationResult,
} from '../../src/core/triage';
import { PrivateArtifactStore } from '../../src/core/policy';
import type { SafetyVector } from '../../src/core/exploration/types';

const FAILURE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};
const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FP_API = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
const FP_SHARED = 'fp:sha256:cccccccccccccccccccccccc';
const FP_RESOURCE = 'fp:sha256:dddddddddddddddddddddddd';

function action(actionId: string, routeClass = '/ripple/test'): MinimizationAction {
  return { actionId, semanticClass: 'KNOWN_READ', routeClass, sourceApproved: true, catalogVersion: 'synthetic.catalog.v1' };
}

function outcome(failed: boolean, fingerprint = FP, safety = FAILURE) {
  return { status: failed ? 'FAILURE' as const : 'PASS' as const, ...(failed ? { anomalyFingerprint: fingerprint } : {}), safety };
}

async function runMinimizer(sequence: readonly string[], predicate: (ids: readonly string[], phase: string) => ReturnType<typeof outcome>, budget = SYNTHETIC_MINIMIZATION_BUDGET, preconditionCheck?: (candidate: readonly MinimizationAction[]) => { valid: boolean; reason?: 'PRECONDITION_DIVERGENCE' }) : Promise<MinimizationResult> {
  return minimizeFailure({
    originalSequence: sequence.map((id) => action(id)),
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(sequence),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget,
    preconditionCheck,
    replay: (candidate, phase) => predicate(candidate.map((item) => item.actionId), phase),
  });
}

test.describe('private deterministic failure minimizer', () => {
  test('single-action, prefix, middle dependency, stateful order, and cycle cases are reduced', async () => {
    const single = await runMinimizer(['a1'], (ids) => outcome(ids.includes('a1')));
    expect(single.status).toBe('UNCHANGED');
    expect(single.minimalReproducingSequence).toEqual(['a1']);
    expect(single.minimalityGuarantee).toBe('1-MINIMAL');

    const prefix = await runMinimizer(['a1', 'a2', 'a3', 'a4'], (ids) => outcome(ids[0] === 'a1' && ids.includes('a4')));
    expect(prefix.minimalReproducingSequence).toEqual(['a1', 'a4']);
    expect(prefix.minimalityGuarantee).toBe('1-MINIMAL');

    const middle = await runMinimizer(['a1', 'a2', 'a3'], (ids) => outcome(ids.includes('a1') && ids.includes('a2')));
    expect(middle.minimalReproducingSequence).toEqual(['a1', 'a2']);

    const stateful = await runMinimizer(['a1', 'a2', 'a3'], (ids) => outcome(ids.join(',') === 'a1,a2,a3' || ids.join(',') === 'a1,a2'));
    expect(stateful.minimalReproducingSequence).toEqual(['a1', 'a2']);

    const cycle = await runMinimizer(['a1', 'a1', 'a2'], (ids) => outcome(ids.filter((id) => id === 'a1').length === 2 && ids.includes('a2')));
    expect(cycle.minimalReproducingSequence).toEqual(['a1', 'a1', 'a2']);
    expect(cycle.candidateEvaluationCount).toBeLessThanOrEqual(SYNTHETIC_MINIMIZATION_BUDGET.maxCandidateEvaluations);
  });

  test('only original action IDs are replayed and precondition divergence is invalid', async () => {
    const replayed: string[][] = [];
    const result = await runMinimizer(['a1', 'a2', 'a3'], (ids) => {
      replayed.push([...ids]);
      return outcome(ids.includes('a1') && ids.includes('a3'));
    }, SYNTHETIC_MINIMIZATION_BUDGET, (candidate) => candidate.some((item) => item.actionId === 'a2') && !candidate.some((item) => item.actionId === 'a1')
      ? { valid: false, reason: 'PRECONDITION_DIVERGENCE' }
      : { valid: true });
    expect(result.minimalReproducingSequence).toEqual(['a1', 'a3']);
    expect(replayed.flat()).not.toContain('a4');
    expect(result.candidateEvaluations.some((item) => item.disposition === 'INVALID' && item.reason === 'PRECONDITION_DIVERGENCE')).toBeTruthy();
  });

  test('fresh replay, flaky/non-reproducible, non-monotonic, safety, and budget outcomes stay distinct', async () => {
    const nonReproducible = await runMinimizer(['a1', 'a2'], () => outcome(false));
    expect(nonReproducible.status).toBe('NO_REPRODUCTION');
    expect(nonReproducible.freshExactReplay).toBe('NOT_REPRODUCED');

    let calls = 0;
    const flaky = await runMinimizer(['a1', 'a2'], (ids) => {
      calls += 1;
      return outcome(calls === 1 && ids.length === 2);
    });
    // A single fresh exact replay cannot prove flakiness; it remains an
    // unchanged bounded result with only one reproduction recorded.
    expect(flaky.status).toBe('UNCHANGED');
    expect(flaky.reproductionCount).toBe(1);

    const nonMonotonic = await runMinimizer(['a1', 'a2'], (ids) => outcome(ids.length === 2));
    expect(nonMonotonic.status).toBe('UNCHANGED');
    expect(nonMonotonic.minimalityGuarantee).toBe('1-MINIMAL');

    let unsafeCalls = 0;
    const unsafe = await runMinimizer(['a1', 'a2'], () => {
      unsafeCalls += 1;
      return outcome(true, FP, { ...FAILURE, knownMutations: 1 });
    });
    expect(unsafe.status).toBe('NO_REPRODUCTION');
    expect(unsafe.safetyRejectionCount).toBe(1);
    expect(unsafeCalls).toBe(1);

    const budget = await runMinimizer(['a1', 'a2', 'a3', 'a4', 'a5'], (ids) => outcome(ids.includes('a1') && ids.includes('a5')), {
      policyVersion: 'nightwatch.minimization-budget.private.v1',
      maxCandidateEvaluations: 1,
      maxTotalReplays: 2,
    });
    expect(budget.status).toBe('BOUNDED_BUDGET_EXHAUSTED');
    expect(budget.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
    expect(budget.candidateEvaluationCount).toBeLessThanOrEqual(1);
  });

  test('unsafe original action catalog is rejected before replay', async () => {
    let calls = 0;
    const result = await minimizeFailure({
      originalSequence: [action('a1')],
      anomalyFingerprint: FP,
      sourceVersion: 'synthetic.source.v1',
      catalogVersion: 'synthetic.catalog.v1',
      approvedActionIds: new Set(['other']),
      replay: () => { calls += 1; return outcome(true); },
    });
    expect(result.status).toBe('INVALID_ORIGINAL');
    expect(calls).toBe(0);
  });

  test('route divergence is invalid rather than being promoted to a product failure', async () => {
    const invalidRoute = await runMinimizer(['a1'], (ids) => outcome(ids.includes('a1')), SYNTHETIC_MINIMIZATION_BUDGET, () => ({ valid: false, reason: 'PRECONDITION_DIVERGENCE' }));
    expect(invalidRoute.status).toBe('INVALID_ORIGINAL');

    const routeEnvelope = await minimizeFailure({
      originalSequence: [action('a1', 'customer-route')],
      anomalyFingerprint: FP,
      sourceVersion: 'synthetic.source.v1',
      catalogVersion: 'synthetic.catalog.v1',
      approvedActionIds: new Set(['a1']),
      replay: () => outcome(true),
    });
    expect(routeEnvelope.status).toBe('INVALID_ORIGINAL');
  });
});

function observation(overrides: Partial<Parameters<typeof clusterAnomalies>[0][number]> = {}) {
  return {
    runId: 'run-1',
    observedAt: '2026-08-13T00:00:00.000Z',
    fingerprint: FP,
    features: {
      journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', oracleId: 'oracle.protocol', routeClass: '/ripple/exchange', operationFamily: 'payer-exchange', statusClass: '5xx', contentTypeClass: 'json', runtimeCategory: 'product', structuralState: 'table-missing', failureActionId: 'p4.j1.read', sourceImpactRegion: 'ripple-ui:exchange', browserApiResultClass: 'same',
    },
    timingClass: 'NONE' as const,
    reproduced: true,
    minimized: true,
    sourceFreshness: 'LOCAL_TRACKING_REF_ONLY' as const,
    ...overrides,
  };
}

test.describe('private clustering and app-layer differential', () => {
  test('bounded timing noise deduplicates while oracle/endpoint/source dimensions stay separate', () => {
    const clusters = clusterAnomalies([
      observation({ runId: 'run-2', timingClass: 'BOUNDED' }),
      observation({ runId: 'run-1' }),
      observation({ runId: 'run-3', features: { ...observation().features, oracleId: 'oracle.other' } }),
      observation({ runId: 'run-4', features: { ...observation().features, operationFamily: 'common-exchange' } }),
      observation({ runId: 'run-5', features: { ...observation().features, browserApiResultClass: 'different-backend-result' } }),
      observation({ runId: 'run-6', fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' }),
    ]);
    expect(clusters).toHaveLength(5);
    const primary = clusters.find((cluster) => cluster.fingerprint === FP && cluster.features.operationFamily === 'payer-exchange' && cluster.features.browserApiResultClass === 'same');
    expect(primary?.occurrenceCount).toBe(2);
    expect(primary?.reproductionCount).toBe(2);
    expect(suppressDuplicateClusters(clusters, 1).find((cluster) => cluster.clusterId === primary?.clusterId)?.runIds).toHaveLength(1);
  });

  test('privacy sentinels and malformed fingerprints cannot enter a cluster', () => {
    expect(() => clusterAnomalies([observation({ features: { ...observation().features, routeClass: 'CUSTOMER_SENTINEL' } })])).toThrow('CLUSTER_FEATURE_UNSAFE');
    expect(() => clusterAnomalies([observation({ fingerprint: 'not-a-fingerprint' })])).toThrow('CLUSTER_FINGERPRINT_INVALID');
  });

  test('browser/API differential is informative without becoming a root-cause oracle', () => {
    const browser = { failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'ui-structure' };
    const apiPass = compareBrowserAndApi(browser, { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' });
    expect(apiPass.status).toBe('UI_FAILURE_API_PASS');
    expect(apiPass.appLayerDiscriminator).toBe('UI_CLIENT_SIDE_STRONGER');
    expect(apiPass.rootCauseClaim).toBe('NONE');
    const apiFail = compareBrowserAndApi(browser, { available: true, failed: true, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-invalid', oracleFingerprint: FP });
    expect(apiFail.status).toBe('BROWSER_API_FAILURE_AGREE');
    expect(apiFail.appLayerDiscriminator).toBe('API_SERVER_PROTOCOL_STRONGER');
  });

  test('existing Phase 2C, Phase 4, and Phase 5 evidence remains readable through adapters', () => {
    const journey = adaptJourneyEvidence({
      runId: 'legacy-journey-1',
      observedAt: '2026-08-13T00:00:00.000Z',
      evidence: {
        journeyId: 'ripple-payer-exchange-read',
        finalRouteClass: '/ripple/exchange',
        globalShellReady: true,
        anomalyFingerprints: [FP],
        oracleObservations: [{ oracleId: 'oracle.protocol', triggered: true, severity: 'ERROR', anomalyClass: 'PRODUCT_BEHAVIOR_ANOMALY', causalToPrimaryFailure: 'LIKELY' }],
      } as unknown as Parameters<typeof adaptJourneyEvidence>[0]['evidence'],
    });
    const exploration = adaptExplorationEvidence({
      runId: 'legacy-exploration-1',
      observedAt: '2026-08-13T00:00:00.000Z',
      evidence: {
        envelopeId: 'E1-J1',
        anomalyFingerprints: [FP],
        oracleResults: ['oracle.protocol'],
        observedActions: ['p4.j1.read'],
        states: [{ routeClass: '/ripple/exchange' }],
        coverage: { statesDiscovered: 1 },
        terminationReason: 'FATAL_ORACLE',
      } as unknown as Parameters<typeof adaptExplorationEvidence>[0]['evidence'],
    });
    const api = adaptApiOracleObservation({
      runId: 'legacy-api-1',
      observedAt: '2026-08-13T00:00:00.000Z',
      operation: { operationId: 'exchange.read' } as Parameters<typeof adaptApiOracleObservation>[0]['operation'],
      observation: { oracleId: 'oracle.protocol', result: 'JSON_PARSE_FAILURE', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'invalid', streamCategory: 'single', bodyPersisted: false },
    });
    expect(journey[0]?.fingerprint).toBe(FP);
    expect(exploration[0]?.fingerprint).toBe(FP);
    expect(api[0]?.features.operationFamily).toBe('exchange.read');
  });

  test('synthetic dossier matrix keeps product, protocol, transient, false-positive, and source cases separate', async () => {
    const matrix = [
      observation({ runId: 'matrix-ui', fingerprint: FP, features: { ...observation().features, runtimeCategory: 'ui-structure' } }),
      observation({ runId: 'matrix-api', fingerprint: FP_API, features: { ...observation().features, oracleId: 'oracle.protocol', statusClass: '5xx', runtimeCategory: 'api-protocol' } }),
      observation({ runId: 'matrix-shared', fingerprint: FP_SHARED, features: { ...observation().features, browserApiResultClass: 'same' } }),
      observation({ runId: 'matrix-resource', fingerprint: FP_RESOURCE, timingClass: 'TRANSIENT', features: { ...observation().features, runtimeCategory: 'resource-loading' } }),
      observation({ runId: 'matrix-fp', fingerprint: 'fp:sha256:eeeeeeeeeeeeeeeeeeeeeeee', knownFalsePositiveId: 'NW-CANCELED-BY-POLICY' }),
      observation({ runId: 'matrix-nonrepro', fingerprint: 'fp:sha256:ffffffffffffffffffffffff', reproduced: false, minimized: false }),
      observation({ runId: 'matrix-source', fingerprint: 'fp:sha256:111111111111111111111111', features: { ...observation().features, sourceImpactRegion: 'ripple-ui:exchange' } }),
      observation({ runId: 'matrix-unrelated', fingerprint: 'fp:sha256:222222222222222222222222', features: { ...observation().features, sourceImpactRegion: 'unrelated:change' } }),
    ];
    const clusters = clusterAnomalies(matrix);
    expect(clusters).toHaveLength(matrix.length);
    expect(clusters.find((cluster) => cluster.knownFalsePositiveId === 'NW-CANCELED-BY-POLICY')?.timingVariance).toBe('NONE');
    expect(clusters.find((cluster) => cluster.features.runtimeCategory === 'resource-loading')?.timingVariance).toBe('TRANSIENT');

    const fiveStep = await runMinimizer(['a1', 'a2', 'a3', 'a4', 'a5'], (ids) => outcome(ids.includes('a1') && ids.includes('a5')));
    const irreducible = await runMinimizer(['a1', 'a2'], (ids) => outcome(ids.length === 2));
    expect(fiveStep.minimalReproducingSequence).toEqual(['a1', 'a5']);
    expect(irreducible.minimalReproducingSequence).toEqual(['a1', 'a2']);
  });
});

test.describe('source relevance, boundary, confidence, and false positives', () => {
  test('source changes classify direct/shared/transitive/no-current relevance', () => {
    const direct = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
    expect(direct.overallRelevance).toBe('DIRECT_CHANGE_RELEVANCE');
    expect(direct.rootCauseClaim).toBe('NONE');
    const shared = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/axios.config.js', status: 'modify' }] });
    expect(shared.overallRelevance).toBe('SHARED_CHANGE_RELEVANCE');
    const transitive = correlateSourceChanges({ journeyIds: ['ripple-account-inventory'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ouchan', path: 'pkg/blue/connection.go', status: 'modify' }] });
    expect(transitive.overallRelevance).toBe('TRANSITIVE_CHANGE_RELEVANCE');
    const unrelated = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/unreviewed/thing.js', status: 'modify' }] });
    expect(unrelated.overallRelevance).toBe('NO_CURRENT_CHANGE_RELEVANCE');
  });

  test('boundary localization, categorical confidence, and known Nightwatch defects stay conservative', () => {
    const ui = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: [] });
    expect(ui.primaryBoundary).toBe('UI_COMPONENT');
    expect(ui.candidateBoundaries).toContain('CLIENT_STATE');
    expect(ui.rootCauseClaim).toBe('NONE');
    const api = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: false, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: true, apiProtocolMismatch: true, sourceCandidates: [] });
    expect(api.primaryBoundary).toBe('PROTOCOL');
    expect(api.candidateBoundaries).not.toContain('DATASTORE');
    expect(rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: 2, browserApiDifferential: 'UI_FAILURE_API_PASS', sourceRelevance: 'DIRECT_CHANGE_RELEVANCE', oracleReliable: true, knownFalsePositive: false, safetyClean: true }).level).toBe('HIGH');
    expect(rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: 2, browserApiDifferential: 'UI_FAILURE_API_PASS', sourceRelevance: 'DIRECT_CHANGE_RELEVANCE', oracleReliable: true, knownFalsePositive: true, safetyClean: true }).level).toBe('LOW');
    expect(findKnownNightwatchDefect('malformed-json')?.disposition).toBe('HISTORICAL_NOT_REPRODUCED');
    expect(findKnownNightwatchDefect('j2-font-502')?.disposition).toBe('HISTORICAL_NOT_REPRODUCED');
  });
});

function dossierFixture(minimization: MinimizationResult): ReturnType<typeof createBugDossier> {
  const differential = compareBrowserAndApi({ failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' }, { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' });
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimization.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return createBugDossier({ firstObserved: '2026-08-13T00:00:00.000Z', lastObserved: '2026-08-13T00:01:00.000Z', journeyIds: ['ripple-payer-exchange-read'], seeds: ['0x0001'], routeClass: '/ripple/exchange', apiOperationFamily: 'payer-exchange', oracleFingerprint: FP, evidenceLevel: 'L3', minimization, browserApiDifferential: differential, sourceCorrelation: source, likelyFaultBoundary: boundary, confidence, technicalSeverity: 'MEDIUM', triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }), knownNightwatchDefect: null, alternativesRuledOut: ['auth-state-invalid', 'known-mutation'], missingEvidence: ['deployment identity remains unresolved'], });
}

test.describe('private dossier, storage, and summaries', () => {
  test('the real local triage pipeline packages one deterministic synthetic anomaly', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-pipeline-'));
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      const result = await triageAnomaly({
        originalSequence: [action('a1'), action('a2'), action('a3')],
        anomalyFingerprint: FP,
        sourceVersion: 'synthetic.source.v1',
        catalogVersion: 'synthetic.catalog.v1',
        approvedActionIds: new Set(['a1', 'a2', 'a3']),
        safety: PASSIVE_MINIMIZATION_SAFETY,
        budget: SYNTHETIC_MINIMIZATION_BUDGET,
        replay: (candidate) => outcome(candidate.map((item) => item.actionId).includes('a1') && candidate.map((item) => item.actionId).includes('a3')),
        observedAt: '2026-08-13T00:00:00.000Z',
        journeyIds: ['ripple-payer-exchange-read'],
        seeds: ['0x0001'],
        routeClass: '/ripple/exchange',
        apiOperationFamily: 'payer-exchange',
        browser: { failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' },
        api: { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: 'fp:sha256:cccccccccccccccccccccccc' },
        sourceCorrelation: { journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] },
        evidenceLevel: 'L3',
        technicalSeverity: 'MEDIUM',
        breadth: 'NARROW',
        knownNightwatchDefect: false,
        missingEvidence: ['deployment identity remains unresolved'],
        alternativesRuledOut: ['auth-state-invalid'],
        store,
      });
      expect(result.dossier.status).toBe('READY');
      expect(result.dossier.minimalSequence).toEqual(['a1', 'a3']);
      expect(result.artifactPath).toBeTruthy();
      expect(JSON.parse(fs.readFileSync(result.artifactPath!, 'utf8')).status).toBe('READY');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('dossier is deterministic, recipe is structural, L4 is explicit out-of-scope, and summaries prioritize locally', async () => {
    const minimization = await runMinimizer(['a1', 'a2'], (ids) => outcome(ids.includes('a1')));
    const first = dossierFixture(minimization);
    const second = dossierFixture(minimization);
    expect(first.candidateId).toBe(second.candidateId);
    expect(first.humanReproductionRecipe.steps.join('\n')).not.toContain('CUSTOMER_SENTINEL');
    expect(first.humanReproductionRecipe.prohibitedValues).toContain('CREDENTIALS');
    expect(first.l4Datastore).toBe('OUT_OF_SCOPE_BY_OWNER');
    validateBugDossier(first);
    const invalidEvidence = { evidenceLevel: 'L4' } as unknown as Parameters<typeof createBugDossier>[0];
    expect(() => createBugDossier(invalidEvidence)).toThrow('L4_DATASTORE_OUT_OF_SCOPE_BY_OWNER');

    const run = { runId: 'run-1', journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', seed: '0x0001', result: 'ANOMALY' as const, anomalyClusterId: 'cluster:1', reproduced: true, safety: first.safety };
    const summary = buildOvernightSummary({ runs: [run], uniqueClusters: 1, dossiers: [first], coverageGaps: ['common-exchange-not-covered'] });
    const brief = buildMorningBrief(summary, [first]);
    expect(summary.datastoreStatus).toBe('OUT_OF_SCOPE_BY_OWNER');
    expect(brief.externalPublication).toBe('PROHIBITED');
    expect(brief.topDossiers[0]?.candidateId).toBe(first.candidateId);
  });

  test('privacy sentinels are rejected and incomplete writes cannot become ready', () => {
    const incomplete = createIncompleteDossier({ anomalyFingerprint: FP, journeyOrApiFamily: 'ripple-payer-exchange-read', missingSections: ['fresh-replay'] });
    expect(incomplete.status).toBe('INCOMPLETE');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-private-'));
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      const incompletePath = store.writeIncomplete('candidate.json', incomplete);
      expect(JSON.parse(fs.readFileSync(incompletePath, 'utf8')).status).toBe('INCOMPLETE');
      expect(() => store.writeJson('unsafe.json', { value: 'CUSTOMER_SENTINEL' })).toThrow('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(() => store.publish()).toThrow('OWNER_POLICY_BLOCKED');
      expect(fs.statSync(root).mode & 0o077).toBe(0);
      expect(fs.statSync(incompletePath).mode & 0o077).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('relevant source before-state is narrow and read-only', async () => {
    const result = await captureRelevantRepoBeforeState({ reposRoot: path.resolve(__dirname, '../../..'), repos: ['nightwatch'], repoIds: ['nightwatch'] });
    expect(result.captured).toBe(true);
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0]?.dirtyFileCount).toBeGreaterThanOrEqual(0);
  });
});
