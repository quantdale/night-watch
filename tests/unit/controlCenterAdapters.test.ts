import { expect, test } from '@playwright/test';
import {
  projectCampaignCoverage,
  projectCampaignSummary,
  projectExecutionGraph,
  projectFindings,
  projectMeta,
  projectReadiness,
  projectRunDetail,
  projectRunList,
  projectSafety,
  projectSourceGraph,
  projectSourceSummary,
  projectSourceSurfaces,
  projectTimeline,
} from '../../src/controlCenter/adapters';
import { EXPECTED_FROZEN_OPERATION_COUNT, summarizeLocalReadiness } from '../../src/core/readiness/localReadiness';
import type { LocalReadinessInput } from '../../src/core/readiness/types';
import type { RunEvent, RunSummary } from '../../src/core/evidence/types';
import type { CampaignCoverageReport, CampaignPlan } from '../../src/core/campaignIntelligence/types';
import type { SourceEligibilityCensus } from '../../src/core/source/eligibilityCensus';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';
import type { BugDossier } from '../../src/core/triage/types';

const SHA = 'a'.repeat(40);
const EVIDENCE = `ev:sha256:${'b'.repeat(24)}`;

function readinessInput(): LocalReadinessInput {
  return {
    applies: true,
    sourceContracts: {
      approvedTargetIds: ['target.read'],
      families: [{
        familyId: 'family.target.read',
        targetId: 'target.read',
        kind: 'DEEP_TYPE',
        hasExpectationId: true,
        campaignEligible: true,
        historicalImmutable: false,
      }],
      currentnessByTargetId: { 'target.read': 'CURRENT' },
    },
    campaign: {
      pinnedVersions: { schema: 'nightwatch.schema.v1' },
      observedVersions: { schema: 'nightwatch.schema.v1' },
    },
    checkpointCompatibility: 'CURRENT_SCHEMA',
    unresolvedBlockers: [],
    externalCi: 'UNKNOWN',
    ownerScope: {
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      frozenOperationCount: EXPECTED_FROZEN_OPERATION_COUNT,
    },
  };
}

function runSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    runId: 'run-01',
    environment: 'LOCAL_SYNTHETIC',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'synthetic-smoke',
    startedAt: '2026-08-26T10:20:30.000Z',
    endedAt: '2026-08-26T10:20:31.000Z',
    durationMs: 1000,
    passed: true,
    eventCount: 3,
    counts: { start: 1, request: 1, end: 1 },
    severityCounts: { info: 3 },
    hardFailures: [],
    screenshots: [],
    nightwatchSha: SHA,
    ...overrides,
  };
}

function runEvents(): RunEvent[] {
  return [
    { seq: 3, ts: '2026-08-26T10:20:31.000Z', type: 'end', severity: 'info', message: 'SENTINEL_RAW_MESSAGE' },
    {
      seq: 1,
      ts: '2026-08-26T10:20:30.000Z',
      type: 'request',
      severity: 'warn',
      message: 'SENTINEL_RAW_MESSAGE',
      data: { routeClass: 'READ', authorization: 'SENTINEL_AUTHORIZATION', body: 'SENTINEL_BODY' },
    },
    { seq: 2, ts: '2026-08-26T10:20:30.500Z', type: 'oracle', severity: 'info', message: 'SENTINEL_ORACLE_MESSAGE' },
  ];
}

function campaignPlan(): CampaignPlan {
  const item = {
    candidateId: 'candidate-1',
    memberId: 'member-1',
    product: 'ripple',
    surface: 'read-surface',
    journeyClass: 'READ_ONLY',
    apiClass: 'GET',
    semanticContractId: 'contract-1',
    oracleFamilies: ['STRUCTURAL'],
    sourceImpactReasons: [],
    coverageGapReasons: ['REPLAY_GAP'] as const,
    priority: {
      surfaceRelevance: 1,
      defectProbability: 1,
      detectionPower: 1,
      actionability: 1,
      executionCost: 1,
      semanticDensity: 1,
      relationDensity: 0,
      sourceChangeSignal: 0,
      proofConfidence: 1,
      explorationAge: 0,
      anomalyDensity: 0,
      replayConfidence: 1,
      redundancyPenalty: 0,
      portfolioScoreSignal: 1,
      numerator: 1,
      priorityPermille: 1000,
      basePortfolioScore: 1,
    },
    costCategory: 'LOW' as const,
    replaySupport: 'SUPPORTED' as const,
    minimizationSupport: 'SUPPORTED' as const,
    provenance: ['synthetic'],
    selectionReasons: ['ORACLE_DETECTION_POWER'] as const,
    exclusionReasons: [] as const,
    selected: true,
    order: 1,
  };
  return {
    schemaVersion: 'nightwatch.campaign-plan.v2',
    sourceCurrentness: 'CURRENT',
    ownerScopeStatus: 'FROZEN_BY_OWNER',
    ownerScopeReason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    inputDigest: `campaign-input:sha256:${'c'.repeat(24)}`,
    selectedItems: [item],
    excludedItems: [],
    items: [item],
    emptyCampaign: false,
    deterministicDigest: `campaign-plan:sha256:${'d'.repeat(24)}`,
  };
}

function campaignCoverage(): CampaignCoverageReport {
  return {
    schemaVersion: 'nightwatch.campaign-coverage.v1',
    rows: [{
      memberId: 'member-1',
      product: 'ripple',
      surface: 'read-surface',
      semanticContractId: 'contract-1',
      expectationId: 'expectation-1',
      stages: [{ stage: 'SOURCE_SURFACE_EXISTS', state: 'PROVEN', reasons: [] }],
      gapReasons: [],
      fullyCovered: true,
    }],
    fullyCoveredContractCount: 1,
    executionOnlyCount: 0,
    oracleOnlyCount: 0,
    replayGapCount: 1,
    minimizationGapCount: 0,
    staleSourceGapCount: 0,
    semanticAuthorityGapCount: 0,
    orphanedScenarioCount: 0,
    redundantScenarioCount: 0,
    uncoveredHighImpactSurfaceCount: 0,
    deterministicDigest: `campaign-coverage:sha256:${'e'.repeat(24)}`,
  };
}

function sourceSurface(): RealSourceSurfaceDescriptor {
  return {
    schemaVersion: 'nightwatch.real-source-surface-descriptor.v4',
    surfaceId: 'surface-1',
    targetId: 'target-1',
    operation: {
      operationId: 'operation-1',
      repository: 'mobingilabs/ripple-api',
      sourceSha: SHA,
      sourcePath: 'src/App/Handler/SENTINEL.php',
      language: 'PHP',
      evidenceDigest: EVIDENCE,
      method: 'GET',
      routeTemplate: '/api/read/:id',
      handlerSymbol: 'Reader::read',
      handlerPath: 'src/App/Handler/SENTINEL.php',
      requestReference: null,
      responseReference: null,
      transport: 'HTTP_API',
      routeProof: 'PROVEN',
      routeRejectionReason: null,
      readOnlyClassification: 'PROVEN_READ_ONLY',
      runtimeBinding: 'RUNTIME_BOUND_EXACT',
      targetId: 'target-1',
      deploymentStatusUnresolved: true,
    },
    source: { repoId: 'mobingilabs/ripple-api', sha: SHA, evidenceDigest: EVIDENCE },
    relevantFiles: ['src/App/Handler/SENTINEL.php'],
    joins: [
      { kind: 'ROUTE_HANDLER', fromIdentity: 'operation-1', toIdentity: 'SENTINEL_HANDLER_PATH', state: 'PROVEN', evidenceDigest: EVIDENCE },
      { kind: 'RESPONSE_FLOW', fromIdentity: 'operation-1', toIdentity: null, state: 'AMBIGUOUS', evidenceDigest: null },
    ],
    contract: {
      requestContractId: null,
      requestEvidenceDigest: null,
      requestProof: 'MISSING_SYMBOL',
      requestFieldCount: 0,
      responseContractId: null,
      responseEvidenceDigest: null,
      responseProof: 'AMBIGUOUS',
      semanticContractIds: [],
      semanticProof: 'MISSING_SYMBOL',
      responseAnalyzerDiagnostics: [],
      responseFlow: null,
      responseDefinitions: [],
    },
    componentProvenance: {
      state: 'EXACT_COMPONENT',
      repository: 'mobingilabs/ripple-ui',
      packageName: 'ui',
      component: 'Reader',
      confidence: 'HIGH',
    },
    currentness: 'CURRENT',
    lifecycle: 'PROJECTABLE',
    projectionCapability: 'PROJECTABLE',
    replayCapability: 'SUPPORTED',
    differentialCapability: 'SUPPORTED',
    exclusionReasons: [],
    sourceEvidence: {
      schemaVersion: 'nightwatch.source-evidence-provenance.v1',
      evidenceClass: 'SOURCE_FACT',
      qualifier: 'DIRECT_SOURCE',
      generationCurrency: null,
      productionAdmission: { state: 'NOT_DENIED_BY_EVIDENCE_CLASS', denialCodes: [] },
    },
    deterministicDigest: `surface:sha256:${'f'.repeat(24)}`,
  };
}

function dossier(): BugDossier {
  return {
    candidateId: 'candidate-1',
    title: '<script>SENTINEL_TITLE</script>',
    routeClass: 'read-surface',
    oracleFingerprint: `fp:sha256:${'1'.repeat(24)}`,
    evidenceLevel: 'L2',
    l4Datastore: 'OUT_OF_SCOPE_BY_OWNER',
    status: 'READY',
    firstObserved: '2026-08-26T10:20:30.000Z',
    lastObserved: '2026-08-26T10:20:31.000Z',
    reproduction: { result: 'REPRODUCED', count: 2, minimalityGuarantee: '1-MINIMAL' },
    technicalSeverity: 'HIGH',
    confidence: { level: 'HIGH', reasons: [] },
    sourceChangeCandidates: [{ sourceFreshness: 'SOURCE_CURRENT_LOCALLY' } as never],
    privacy: {
      result: 'PASS',
      rawBodiesPersisted: false,
      customerValuesPersisted: false,
      credentialsPersisted: false,
      screenshotsPersisted: false,
      authenticatedTracesPersisted: false,
    },
  } as unknown as BugDossier;
}

test.describe('Control Center authoritative adapters', () => {
  test('meta and readiness preserve local-only posture and domain readiness category', () => {
    const meta = projectMeta();
    const readiness = projectReadiness(summarizeLocalReadiness(readinessInput()));
    expect(meta).toMatchObject({
      scope: 'LOCAL_LOOPBACK_ONLY',
      readOnly: true,
      executionAuthority: 'NONE',
      mutationAuthority: 'NONE',
      externalNetwork: 'DISABLED',
    });
    expect(readiness).toMatchObject({
      category: 'READY_LOCAL_SYNTHETIC',
      state: 'READY',
      scope: 'LOCAL_SYNTHETIC',
      readyClaim: 'LOCAL_SYNTHETIC_ONLY',
    });
    expect(JSON.stringify(meta)).not.toContain('SENTINEL');
  });

  test('safety projection never treats an empty check set as healthy', () => {
    const unknown = projectSafety({
      continuity: { state: 'UNKNOWN', branch: null, headSha: null, checkpointDigest: null },
      checks: [],
    });
    const blocked = projectSafety({
      continuity: { state: 'CURRENT', branch: 'main', headSha: SHA, checkpointDigest: EVIDENCE },
      checks: [{ checkCode: 'LOOPBACK_BIND', state: 'BLOCKED', reasonCode: 'NON_LOOPBACK_BIND' }],
    });
    expect(unknown.state).toBe('UNKNOWN');
    expect(blocked.state).toBe('FAILED');
    expect(blocked.operationPolicy.mutation).toBe('NONE');
    expect(blocked.blockedOperationClasses.length).toBeGreaterThan(0);
    expect(JSON.stringify(blocked)).not.toContain('NON_LOOPBACK_BINDING_SECRET');
  });

  test('run, detail, and timeline adapters distinguish incomplete, blocked, safety, oracle, and pass states', () => {
    const passed = { summary: runSummary({ runId: 'run-pass' }), events: runEvents() };
    const oracle = { summary: runSummary({ runId: 'run-oracle', passed: false, counts: { issue: 1 }, eventCount: 3 }), events: runEvents() };
    const blocked = { summary: runSummary({ runId: 'run-blocked', passed: false, hardFailures: [{ ts: '2026-08-26T10:20:31.000Z', message: 'SENTINEL', reason: 'OWNER_POLICY_BLOCKED' }] }), events: runEvents() };
    const safety = { summary: runSummary({ runId: 'run-safety', passed: false, hardFailures: [{ ts: '2026-08-26T10:20:31.000Z', message: 'SENTINEL', reason: 'SAFETY_FAILURE' }] }), events: runEvents() };
    const incomplete = { summary: runSummary({ runId: 'run-incomplete', eventCount: 0 }), events: [] };
    expect(projectRunList([passed, oracle, blocked, safety, incomplete], 10).items.map((item) => item.status).sort()).toEqual([
      'BLOCKED',
      'INCOMPLETE',
      'ORACLE_ONLY',
      'PASSED',
      'SAFETY_FAILURE',
    ]);
    const detail = projectRunDetail(blocked);
    expect(detail.run.status).toBe('BLOCKED');
    expect(detail.hardFailureCodes).toEqual(['OWNER_POLICY_BLOCKED']);
    const timeline = projectTimeline(passed, 1, 2);
    expect(timeline.events.map((event) => event.seq)).toEqual([2, 3]);
    expect(JSON.stringify({ detail, timeline })).not.toContain('SENTINEL');
    expect(JSON.stringify(timeline)).not.toContain('authorization');
  });

  test('execution graph is deterministic and enforces node/edge ceilings', () => {
    const input = { runId: 'run-graph', status: 'PASSED' as const, events: runEvents() };
    const first = projectExecutionGraph(input, 2, 1);
    const second = projectExecutionGraph(input, 2, 1);
    expect(second).toEqual(first);
    expect(first.nodes.length).toBeLessThanOrEqual(2);
    expect(first.edges.length).toBeLessThanOrEqual(1);
    expect(first.truncated).toBe(true);
    expect(JSON.stringify(first)).not.toContain('SENTINEL');
  });

  test('campaign adapters project existing reports without adding selector authority', () => {
    const input = { plan: campaignPlan(), coverage: campaignCoverage(), findingCount: 2 };
    const summary = projectCampaignSummary(input);
    const coverage = projectCampaignCoverage(input);
    expect(summary).toMatchObject({ planState: 'AVAILABLE', sourceCurrentness: 'CURRENT', counts: { selected: 1, findings: 2 } });
    expect(coverage.items).toHaveLength(1);
    expect(coverage.items[0]?.fullyCovered).toBe(true);
    expect(JSON.stringify({ summary, coverage })).not.toContain('inputDigest');
  });

  test('source adapters preserve proof/currentness categories and bound the graph without source paths', () => {
    const descriptor = sourceSurface();
    const summary = projectSourceSummary([descriptor]);
    const surfaces = projectSourceSurfaces([descriptor], undefined, 1);
    const graph = projectSourceGraph([descriptor], 'surface-1', 2, 3, 2);
    expect(summary).toMatchObject({ state: 'AVAILABLE', surfaceCount: 1 });
    expect(surfaces.items[0]).toMatchObject({ routeProof: 'PROVEN', currentness: 'CURRENT', lifecycle: 'PROJECTABLE' });
    expect(graph.nodes.length).toBeLessThanOrEqual(3);
    expect(graph.edges.length).toBeLessThanOrEqual(2);
    expect(JSON.stringify({ summary, surfaces, graph })).not.toContain('SENTINEL.php');
    expect(JSON.stringify({ summary, surfaces, graph })).not.toContain('SENTINEL_HANDLER_PATH');
    expect(projectSourceGraph([descriptor], 'surface-1', 2, 3, 2)).toEqual(graph);
  });

  test('source summary projects only bounded proof-chain aggregates', () => {
    const census = {
      schemaVersion: 'nightwatch.real-source-eligibility-census.v2',
      sourceSnapshotDigest: `srcsnapshot:sha256:${'a'.repeat(24)}`,
      sourceSurfaceDigest: `source-surface-discovery:sha256:${'b'.repeat(24)}`,
      phase24PortfolioDigest: `portfolio:sha256:${'c'.repeat(24)}`,
      deterministicDigest: `source-eligibility-census:sha256:${'d'.repeat(24)}`,
      summary: {
        totalOperations: 2,
        phase24Eligible: 1,
        phase24Excluded: 1,
        runtimeBindings: 1,
        runtimeBindingMissing: 1,
        replayRequirementsProven: 1,
        dossierCompatible: 2,
        currentnessFailureCount: 0,
        primaryBlockingStageCounts: [{ code: 'RUNTIME_BINDING', count: 1 }],
        stageStatusCounts: [{ stage: 'RUNTIME_BINDING', status: 'UNPROVEN', count: 1 }],
        proofFamilyRanking: [{
          family: 'RUNTIME_BINDING',
          assessment: 'NO_CURRENT_MATCH',
          rank: 1,
          gapSurfaceCount: 1,
          firstBlockerCount: 0,
          potentiallyUnlockableCount: 0,
          proofCompleteness: 'NONE',
          dependencyFanOut: 1,
          bugHuntingValue: 'HIGH',
        }],
      },
    } as unknown as SourceEligibilityCensus;
    const summary = projectSourceSummary([sourceSurface()], { proofChain: census });
    expect(summary.proofChain).toMatchObject({
      schemaVersion: 'nightwatch.real-source-eligibility-census.v2',
      totalOperations: 2,
      phase24Eligible: 1,
      runtimeBindingMissing: 1,
      primaryBlockingStages: [{ key: 'RUNTIME_BINDING', count: 1 }],
    });
    expect(JSON.stringify(summary)).not.toContain('SENTINEL.php');
    expect(JSON.stringify(summary)).not.toContain('SENTINEL_HANDLER');
  });

  test('source graph remains deterministic under a 1000-descriptor fixture and fixed ceilings', () => {
    const descriptors = Array.from({ length: 1_000 }, (_, index) => ({
      ...sourceSurface(),
      surfaceId: `surface-${String(index).padStart(4, '0')}`,
      operation: {
        ...sourceSurface().operation,
        operationId: `operation-${String(index).padStart(4, '0')}`,
      },
    }));
    const first = projectSourceGraph(descriptors, null, 4, 250, 500);
    const second = projectSourceGraph(descriptors, null, 4, 250, 500);
    expect(second).toEqual(first);
    expect(first.nodes.length).toBeLessThanOrEqual(250);
    expect(first.edges.length).toBeLessThanOrEqual(500);
    expect(first.truncated).toBe(true);
  });

  test('findings adapter is owner-local and removes unsafe dossiers explicitly', () => {
    const safe = projectFindings({ dossiers: [dossier()] });
    const unsafe = dossier();
    (unsafe as unknown as { privacy: { readonly result: 'PASS'; readonly rawBodiesPersisted: boolean; readonly customerValuesPersisted: boolean; readonly credentialsPersisted: boolean; readonly screenshotsPersisted: boolean; readonly authenticatedTracesPersisted: boolean } }).privacy = {
      result: 'PASS',
      rawBodiesPersisted: true,
      customerValuesPersisted: false,
      credentialsPersisted: false,
      screenshotsPersisted: false,
      authenticatedTracesPersisted: false,
    };
    const blocked = projectFindings({ dossiers: [unsafe] });
    expect(safe.state).toBe('AVAILABLE');
    expect(safe.items).toHaveLength(1);
    expect(safe.items[0]?.title).toBeNull();
    expect(blocked.state).toBe('EMPTY');
    expect(JSON.stringify(safe)).not.toContain('SENTINEL');
    expect(projectFindings({ dossiers: [], available: false }).state).toBe('UNAVAILABLE');
  });

  test('source completeness surfaces truncated projection with exact dropped count', () => {
    const inventoryCompleteness = {
      schemaVersion: 'nightwatch.source-inventory-completeness.v1' as const,
      state: 'COMPLETE' as const,
      enumeration: {
        state: 'COMPLETE' as const,
        limit: 1000,
        byteLimit: 10_000_000,
        examinedFiles: 10,
        totalFiles: 10,
        droppedFiles: 0,
        remainingUnknown: false,
        truncationReason: null,
      },
      contentRead: {
        state: 'COMPLETE' as const,
        fileByteLimit: 1_000_000,
        totalByteLimit: 10_000_000,
        candidateFiles: 10,
        readFiles: 10,
        admittedFiles: 10,
        bytesRead: 50000,
        droppedFiles: 0,
        unreadableFiles: 0,
        policyExcludedFiles: 0,
      },
      repositories: [],
    } as unknown as import('../../src/core/source/scanTypes').SourceInventoryCompleteness;
    const operationCompleteness = {
      schemaVersion: 'nightwatch.source-operation-projection-completeness.v1' as const,
      state: 'TRUNCATED' as const,
      limit: 2,
      examinedOperations: 5,
      totalOperations: 5,
      projectedOperations: 2,
      droppedOperations: 3,
      truncated: true,
      remainingUnknown: false,
      enumerationCompleteness: 'COMPLETE' as const,
      contentReadCompleteness: 'COMPLETE' as const,
      coverageState: 'TRUNCATED' as const,
      repositories: [{ repository: 'mobingilabs/ripple-api', examinedOperations: 5, projectedOperations: 2, droppedOperations: 3 }],
    } as unknown as import('../../src/core/source/surfaceTypes').SourceOperationProjectionCompleteness;
    const summary = projectSourceSummary([sourceSurface()], {
      operationCompleteness,
      inventoryCompleteness,
    });
    expect(summary.completeness.state).toBe('TRUNCATED');
    expect(summary.completeness.coverageState).toBe('TRUNCATED');
    expect(summary.completeness.limit).toBe(2);
    expect(summary.completeness.examined).toBe(5);
    expect(summary.completeness.projected).toBe(2);
    expect(summary.completeness.dropped).toBe(3);
    expect(summary.completeness.total).toBe(5);
    expect(summary.completeness.truncated).toBe(true);
    expect(summary.completeness.remainingUnknown).toBe(false);
    expect(summary.completeness.enumeration.state).toBe('COMPLETE');
    expect(summary.completeness.enumeration.examinedFiles).toBe(10);
    expect(summary.completeness.enumeration.totalFiles).toBe(10);
    expect(summary.completeness.enumeration.droppedFiles).toBe(0);
    expect(summary.completeness.contentRead.state).toBe('COMPLETE');
    expect(summary.completeness.contentRead.candidateFiles).toBe(10);
    expect(summary.completeness.contentRead.droppedFiles).toBe(0);
    expect(JSON.stringify(summary.completeness)).not.toContain('SENTINEL');
  });

  test('source completeness fallback surfaces UNKNOWN/UNMEASURED with total null', () => {
    const summary = projectSourceSummary([], {});
    expect(summary.completeness.state).toBe('UNKNOWN');
    expect(summary.completeness.coverageState).toBe('UNMEASURED');
    expect(summary.completeness.total).toBeNull();
    expect(summary.completeness.enumeration.totalFiles).toBeNull();
    expect(summary.completeness.enumeration.droppedFiles).toBeNull();
    expect(summary.completeness.enumeration.state).toBe('UNKNOWN');
    expect(summary.completeness.enumeration.remainingUnknown).toBe(true);
    expect(summary.completeness.contentRead.state).toBe('UNKNOWN');
    expect(summary.completeness.remainingUnknown).toBe(true);
    expect(JSON.stringify(summary)).not.toContain('SENTINEL');
  });
});
