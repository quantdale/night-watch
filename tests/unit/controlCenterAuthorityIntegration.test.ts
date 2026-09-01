import { provenReadOnlyProof } from '../helpers/readOnlyProofFixtures';
import { expect, test } from '@playwright/test';
import { projectSourceSummary } from '../../src/controlCenter/adapters/sourceAdapter';
import { createCampaignAuthority } from '../../src/controlCenter/authorities/campaignAuthority';
import { createSourceAuthorityForTests, type SourceAuthoritySnapshot } from '../../src/controlCenter/authorities/sourceAuthority';
import { createDefaultControlCenterCollector } from '../../src/controlCenter/server/defaultCollector';
import { buildPhase24CandidatePortfolio, prioritizePhase24Portfolio, type Phase24CandidateInput } from '../../src/core/phase24';
import type { SourcePhase24Integration, SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';

const SHA = 'a'.repeat(40);
const EVIDENCE = `ev:sha256:${'b'.repeat(24)}`;

function sourceSurface(): RealSourceSurfaceDescriptor {
  return {
    schemaVersion: 'nightwatch.real-source-surface-descriptor.v5',
    surfaceId: 'synthetic.surface.read',
    targetId: 'synthetic.target.read',
    operation: {
      operationId: 'synthetic.operation.read',
      repository: 'approved/repo-a',
      sourceSha: SHA,
      sourcePath: 'src/SENTINEL.php',
      language: 'PHP',
      evidenceDigest: EVIDENCE,
      method: 'GET',
      routeTemplate: '/synthetic/read',
      handlerSymbol: 'SENTINEL_HANDLER',
      handlerPath: 'src/SENTINEL.php',
      requestReference: null,
      responseReference: null,
      transport: 'HTTP_API',
      routeProof: 'PROVEN',
      routeRejectionReason: null,
      readOnlyClassification: 'PROVEN_READ_ONLY',
      runtimeBinding: 'RUNTIME_BOUND_EXACT',
      targetId: 'synthetic.target.read',
      deploymentStatusUnresolved: true,
    },
    source: { repoId: 'approved/repo-a', sha: SHA, evidenceDigest: EVIDENCE },
    relevantFiles: ['src/SENTINEL.php'],
    joins: [{ kind: 'ROUTE_HANDLER', fromIdentity: 'SENTINEL_RAW_IDENTITY', toIdentity: 'SENTINEL_RAW_PATH', state: 'PROVEN', evidenceDigest: EVIDENCE }],
    contract: {
      requestContractId: null,
      requestEvidenceDigest: null,
      requestProof: 'MISSING_SYMBOL',
      requestFieldCount: 0,
      responseContractId: null,
      responseEvidenceDigest: null,
      responseProof: 'MISSING_SYMBOL',
      semanticContractIds: [],
      semanticProof: 'MISSING_SYMBOL',
      responseAnalyzerDiagnostics: [],
      responseFlow: null,
      responseDefinitions: [],
    },
    componentProvenance: { state: 'EXACT_COMPONENT', repository: 'approved/repo-a', packageName: 'fixtures', component: 'Reader', confidence: 'HIGH' },
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
    readOnlyProof: provenReadOnlyProof(),
    deterministicDigest: `surface:sha256:${'c'.repeat(24)}`,
  };
}

function candidate(): Phase24CandidateInput {
  return {
    surfaceKey: 'synthetic.surface.read',
    targetId: 'synthetic.target.read',
    product: 'synthetic-product',
    source: { repoId: 'approved/repo-a', sha: SHA, evidenceDigest: EVIDENCE },
    sourceAvailable: true,
    sourceSnapshotMatches: true,
    relevantFiles: ['src/SENTINEL.php'],
    route: { endpointId: 'synthetic.endpoint.read', method: 'GET', routeTemplate: '/synthetic/read', transport: 'SYNTHETIC' },
    routeIdentityProven: true,
    contract: { contractId: 'synthetic.contract.read', requestDigest: `request:sha256:${'d'.repeat(24)}`, responseDigest: `response:sha256:${'e'.repeat(24)}`, version: 'v1' },
    contractIdentityProven: true,
    behaviorOwner: { repository: 'approved/repo-a', packageName: 'fixtures', component: 'Reader', confidence: 'HIGH' },
    behaviorOwnerProven: true,
    sourceVersion: 'CURRENT',
    semanticExpectationId: 'synthetic.expectation.read',
    semanticContractProven: true,
    semanticPreconditions: ['SOURCE_CURRENT'],
    semanticPreconditionsBound: true,
    materialClass: 'COLLECTION',
    authRequirement: 'NONE',
    environmentRequirement: 'DEV_ONLY',
    mutationClassification: 'NONE',
    readOnlySuitable: true,
    projectionSafe: true,
    replay: { strategy: 'FIRST_REPLAY', planIdentity: 'synthetic.replay.read', maxContexts: 2, prerequisites: ['SOURCE_CURRENT'] },
    expectedEvidenceValue: 'HIGH',
    selectionPriority: 10,
    anticipatedInvariantCount: 1,
  };
}

function sourceSnapshot(): SourceAuthoritySnapshot {
  const phase24CandidatePortfolio = buildPhase24CandidatePortfolio({ candidates: [candidate()] });
  const phase24Selection = prioritizePhase24Portfolio({ portfolio: phase24CandidatePortfolio, maxCandidates: 1 });
  const discovery = {
    surfaces: [sourceSurface()],
    inventory: { repositories: [{ repoId: 'approved/repo-a', status: 'CURRENT' }] },
    deterministicDigest: 'discovery:sha256:' + '1'.repeat(24),
  } as unknown as SourceSurfaceDiscovery;
  const phase24 = {
    discovery,
    snapshotAnalyses: [],
    portfolio: phase24CandidatePortfolio,
    selection: phase24Selection,
    deterministicDigest: 'integration:sha256:' + '2'.repeat(24),
  } as unknown as SourcePhase24Integration;
  return {
    schemaVersion: 'nightwatch.control-center-source-authority.v1',
    state: 'AVAILABLE',
    inventoryDigest: 'srcsnapshot:sha256:' + '3'.repeat(24),
    repositoryCount: 1,
    repositoryStatuses: [{ repoId: 'approved/repo-a', currentness: 'CURRENT' }],
    discovery,
    phase24,
    generation: 'cc-source-generation:sha256:' + '4'.repeat(24),
    reasonCodes: [],
  };
}

test.describe('Control Center authority integration', () => {
  test('projects one synthetic source/campaign generation without raw source fields', async () => {
    const source = sourceSnapshot();
    const sourceAuthority = createSourceAuthorityForTests(source);
    const campaignAuthority = createCampaignAuthority({ sourceAuthority });
    const campaign = campaignAuthority.snapshot(source);
    expect(campaign.state).toBe('AVAILABLE');
    expect(campaign.plan?.selectedItems).toHaveLength(1);
    expect(campaign.coverage?.rows).toHaveLength(1);

    const collector = createDefaultControlCenterCollector({ sourceAuthority, campaignAuthority, sourceSnapshotTtlMs: 10_000 });
    const summary = await collector.sourceSummary();
    const surfaces = await collector.sourceSurfaces({ limit: 50, cursor: null, repositoryId: null });
    const graph = await collector.sourceGraph(null, 2);
    const campaignSummary = await collector.campaignSummary();
    const campaignCoverage = await collector.campaignCoverage({ limit: 50, cursor: null });
    expect(summary.state).toBe('AVAILABLE');
    expect(summary.inventoryDigest).toBe(source.inventoryDigest);
    expect(surfaces.items).toHaveLength(1);
    expect(graph?.nodes.length).toBeGreaterThan(0);
    expect(campaignSummary.planState).toBe('AVAILABLE');
    expect(campaignCoverage.items).toHaveLength(1);
    const serialized = JSON.stringify({ summary, surfaces, graph, campaignSummary, campaignCoverage });
    expect(serialized).not.toContain('SENTINEL_RAW');
    expect(serialized).not.toContain('SENTINEL.php');
    expect(serialized).not.toContain('SENTINEL_HANDLER');
  });

  test('preserves stale authority state even when a descriptor is present', () => {
    const stale = { ...sourceSnapshot(), state: 'STALE' as const, repositoryStatuses: [{ repoId: 'approved/repo-a', currentness: 'SOURCE_STALE' as const }], reasonCodes: ['SOURCE_STALE' as const] };
    const summary = projectSourceSummary(stale.discovery?.surfaces ?? [], {
      state: stale.state,
      inventoryDigest: stale.inventoryDigest,
      repositoryCount: stale.repositoryCount,
      repositoryCurrentness: stale.repositoryStatuses.map((entry) => entry.currentness),
      reasonCodes: stale.reasonCodes,
    });
    expect(summary.state).toBe('STALE');
    expect(summary.currentness).toEqual([{ key: 'SOURCE_STALE', count: 1 }]);
    expect(summary.gapReasons).toContain('SOURCE_STALE');
  });

  test('authority integration surfaces truncated completeness with exact dropped count via collector', async () => {
    const base = sourceSnapshot();
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
      repositories: [{ repository: 'approved/repo-a', examinedOperations: 5, projectedOperations: 2, droppedOperations: 3 }],
    } as unknown as import('../../src/core/source/surfaceTypes').SourceOperationProjectionCompleteness;
    const truncatedDiscovery = {
      ...(base.discovery as unknown as Record<string, unknown>),
      inventory: {
        repositories: [{ repoId: 'approved/repo-a', status: 'CURRENT' }],
        completeness: inventoryCompleteness,
        snapshotDigest: 'srcsnapshot:sha256:' + '9'.repeat(24),
      },
      operationCompleteness,
      surfaces: base.discovery!.surfaces,
    } as unknown as SourceSurfaceDiscovery;
    const truncatedSnapshot: SourceAuthoritySnapshot = {
      ...base,
      discovery: truncatedDiscovery,
      generation: 'cc-source-generation:sha256:' + '5'.repeat(24),
    };
    const sourceAuthority = createSourceAuthorityForTests(truncatedSnapshot);
    const campaignAuthority = createCampaignAuthority({ sourceAuthority });
    const collector = createDefaultControlCenterCollector({ sourceAuthority, campaignAuthority, sourceSnapshotTtlMs: 10_000 });
    const summary = await collector.sourceSummary();
    expect(summary.completeness.state).toBe('TRUNCATED');
    expect(summary.completeness.dropped).toBe(3);
    expect(summary.completeness.coverageState).toBe('TRUNCATED');
    expect(summary.completeness.total).toBe(5);
    expect(summary.completeness.enumeration.state).toBe('COMPLETE');
    expect(summary.completeness.contentRead.state).toBe('COMPLETE');
    expect(summary.completeness.enumeration.totalFiles).toBe(10);
    expect(summary.state).toBe('AVAILABLE');
    expect(JSON.stringify(summary.completeness)).not.toContain('SENTINEL');
  });

  test('authority integration fallback surfaces UNKNOWN/UNMEASURED with total null when discovery unavailable', async () => {
    const unavailable: SourceAuthoritySnapshot = {
      schemaVersion: 'nightwatch.control-center-source-authority.v1',
      state: 'UNKNOWN',
      inventoryDigest: null,
      repositoryCount: 0,
      repositoryStatuses: [],
      discovery: null,
      phase24: null,
      generation: null,
      reasonCodes: ['SOURCE_DISCOVERY_UNAVAILABLE'],
    };
    const sourceAuthority = createSourceAuthorityForTests(unavailable);
    const campaignAuthority = createCampaignAuthority({ sourceAuthority });
    const collector = createDefaultControlCenterCollector({ sourceAuthority, campaignAuthority, sourceSnapshotTtlMs: 10_000 });
    const summary = await collector.sourceSummary();
    expect(summary.completeness.state).toBe('UNKNOWN');
    expect(summary.completeness.coverageState).toBe('UNMEASURED');
    expect(summary.completeness.total).toBeNull();
    expect(summary.completeness.enumeration.totalFiles).toBeNull();
    expect(summary.completeness.enumeration.droppedFiles).toBeNull();
    expect(summary.completeness.enumeration.remainingUnknown).toBe(true);
    expect(summary.completeness.remainingUnknown).toBe(true);
    const direct = projectSourceSummary([], {});
    expect(direct.completeness.state).toBe('UNKNOWN');
    expect(direct.completeness.coverageState).toBe('UNMEASURED');
    expect(direct.completeness.total).toBeNull();
  });
});
