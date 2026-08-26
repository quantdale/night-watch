import { expect, test } from '@playwright/test';
import type { Phase24CandidatePortfolio } from '../../src/core/phase24/types';
import { buildSourceEligibilityCensus } from '../../src/core/source/eligibilityCensus';
import type { SourceSurfaceDiscovery } from '../../src/core/source/surfaces';

function fixture(): { readonly discovery: SourceSurfaceDiscovery; readonly portfolio: Phase24CandidatePortfolio } {
  const surface = {
    schemaVersion: 'nightwatch.real-source-surface-descriptor.v3',
    surfaceId: 'surface:sha256:111111111111111111111111',
    targetId: 'ripple.synthetic.read',
    operation: {
      operationId: 'ripple.synthetic.read',
      repository: 'mobingilabs/ripple-api',
      sourceSha: '1'.repeat(40),
      sourcePath: 'src/App/Route/Config/Routing.yaml',
      language: 'YAML',
      evidenceDigest: 'ev:sha256:111111111111111111111111',
      method: 'GET',
      routeTemplate: '/synthetic',
      handlerSymbol: null,
      handlerPath: null,
      requestReference: null,
      responseReference: null,
      transport: 'HTTP_API',
      routeProof: 'PROVEN',
      routeRejectionReason: null,
      readOnlyClassification: 'READ_ONLY_METHOD_ONLY',
      runtimeBinding: 'SOURCE_ONLY',
      targetId: null,
      deploymentStatusUnresolved: true,
    },
    source: { repoId: 'mobingilabs/ripple-api', sha: '1'.repeat(40), evidenceDigest: 'ev:sha256:222222222222222222222222' },
    relevantFiles: ['src/App/Route/Config/Routing.yaml'],
    joins: [{ kind: 'ROUTE_HANDLER', fromIdentity: 'synthetic', toIdentity: null, state: 'MISSING_SYMBOL', evidenceDigest: null }],
    contract: {
      requestContractId: null,
      requestEvidenceDigest: null,
      requestProof: 'PROVEN',
      requestFieldCount: 0,
      responseContractId: null,
      responseEvidenceDigest: null,
      responseProof: 'MISSING_SYMBOL',
      semanticContractIds: [],
      semanticProof: 'MISSING_SYMBOL',
      responseAnalyzerDiagnostics: [],
      responseFlow: null,
    },
    componentProvenance: { state: 'REPOSITORY_ONLY', repository: 'mobingilabs/ripple-api', packageName: null, component: null, confidence: 'LOW' },
    currentness: 'CURRENT',
    lifecycle: 'DISCOVERED',
    projectionCapability: 'UNPROVEN',
    replayCapability: 'UNPROVEN',
    differentialCapability: 'UNPROVEN',
    exclusionReasons: ['HANDLER_UNRESOLVED', 'READ_ONLY_NOT_PROVEN', 'RESPONSE_CONTRACT_UNPROVEN', 'SEMANTIC_CONTRACT_UNPROVEN'],
    deterministicDigest: 'surface-descriptor:sha256:333333333333333333333333',
  };
  const discovery = {
    inventory: { snapshotDigest: 'srcsnapshot:sha256:444444444444444444444444', files: [] },
    operations: [surface.operation],
    surfaces: [surface],
    phase24Inputs: [],
    counters: {},
    gapTaxonomy: { dimensions: { rejectionFamily: [] }, proofGapSurfaceCount: 1, rejectedDiagnosticCount: 0 },
    performance: {},
    deterministicDigest: 'source-surface-discovery:sha256:555555555555555555555555',
  } as unknown as SourceSurfaceDiscovery;
  const portfolio = {
    schemaVersion: 'nightwatch.phase24-candidate-portfolio.v1',
    sourceSnapshots: [],
    candidates: [{ surfaceKey: surface.surfaceId, eligibility: 'EXCLUDED', reasonCodes: ['READ_ONLY_SUITABILITY_UNPROVEN', 'REPLAY_UNSUPPORTED'] }],
    eligibleCandidateIds: [],
    excludedCandidateIds: ['candidate.synthetic'],
    reasonCodeCoverage: ['READ_ONLY_SUITABILITY_UNPROVEN', 'REPLAY_UNSUPPORTED'],
    consideredCount: 1,
    eligibleCount: 0,
    excludedCount: 1,
    deterministicDigest: 'portfolio:sha256:666666666666666666666666',
  } as unknown as Phase24CandidatePortfolio;
  return { discovery, portfolio };
}

test.describe('deterministic source eligibility census', () => {
  test('projects a complete categorical chain without source values', () => {
    const input = fixture();
    const first = buildSourceEligibilityCensus(input);
    const second = buildSourceEligibilityCensus(input);
    expect(first).toEqual(second);
    expect(first.summary).toMatchObject({ totalOperations: 1, routeProofs: 1, requestContracts: 1, responseContracts: 0, semanticContractSurfaces: 0, readOnlyProven: 0, mutabilityUnknown: 1, phase24Eligible: 0, phase24Excluded: 1 });
    expect(first.rows[0]?.chain.firstBlockingStage).toBe('RESPONSE_CONTRACT');
    expect(first.summary.reasonFamilyCounts).toEqual(expect.arrayContaining([
      { code: 'MECHANICAL_PROOF_GAP', count: 1 },
      { code: 'SEMANTIC_OR_REPLAY_PREREQUISITE', count: 1 },
    ]));
    expect(JSON.stringify(first)).not.toContain('CUSTOMER_ELIGIBILITY_SENTINEL');
    expect(first.deterministicDigest).toMatch(/^source-eligibility-census:sha256:[0-9a-f]{24}$/);
  });

  test('fails closed on portfolio/surface mismatches', () => {
    const input = fixture();
    expect(() => buildSourceEligibilityCensus({ discovery: { ...input.discovery, surfaces: [] }, portfolio: input.portfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_SURFACE_COUNT');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, consideredCount: 2 } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_SURFACE_COUNT');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, candidates: [{ surfaceKey: 'surface:sha256:999999999999999999999999', eligibility: 'EXCLUDED', reasonCodes: [] }] } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_OUTSIDE_SURFACES');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, candidates: [input.portfolio.candidates[0], input.portfolio.candidates[0]] } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_COUNT');
  });
});
