import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { Phase24CandidatePortfolio } from '../../src/core/phase24/types';
import { buildSourceEligibilityCensus } from '../../src/core/source/eligibilityCensus';
import type { SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import type { RealSourceSurfaceDescriptor } from '../../src/core/source/surfaceTypes';

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
    inventory: {
      snapshotDigest: 'srcsnapshot:sha256:444444444444444444444444',
      files: [],
      completeness: {
        schemaVersion: 'nightwatch.source-inventory-completeness.v1',
        state: 'COMPLETE',
        enumeration: { state: 'COMPLETE', limit: 64, byteLimit: 4_000_000, examinedFiles: 1, totalFiles: 1, droppedFiles: 0, remainingUnknown: false, truncationReason: null },
        contentRead: { state: 'COMPLETE', fileByteLimit: 400_000, totalByteLimit: 4_000_000, candidateFiles: 1, readFiles: 1, admittedFiles: 1, bytesRead: 64, droppedFiles: 0, unreadableFiles: 0, policyExcludedFiles: 0 },
        repositories: [],
      },
    },
    operations: [surface.operation],
    surfaces: [surface],
    phase24Inputs: [],
    counters: {},
    operationCompleteness: {
      schemaVersion: 'nightwatch.source-operation-projection-completeness.v1',
      state: 'COMPLETE',
      limit: 4096,
      examinedOperations: 1,
      totalOperations: 1,
      projectedOperations: 1,
      droppedOperations: 0,
      truncated: false,
      remainingUnknown: false,
      enumerationCompleteness: 'COMPLETE',
      contentReadCompleteness: 'COMPLETE',
      coverageState: 'PROVEN',
      repositories: [{ repository: 'mobingilabs/ripple-api', examinedOperations: 1, projectedOperations: 1, droppedOperations: 0 }],
    },
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

function variant(
  input: ReturnType<typeof fixture>,
  operation: Partial<RealSourceSurfaceDescriptor['operation']> = {},
  contract: Partial<RealSourceSurfaceDescriptor['contract']> = {},
): ReturnType<typeof fixture> {
  const surface = input.discovery.surfaces[0]!;
  const nextSurface = {
    ...surface,
    operation: { ...surface.operation, ...operation },
    contract: { ...surface.contract, ...contract },
  };
  return {
    discovery: { ...input.discovery, surfaces: [nextSurface] },
    portfolio: input.portfolio,
  };
}

test.describe('deterministic source eligibility census', () => {
  test('projects a complete categorical chain without source values', () => {
    const input = fixture();
    const first = buildSourceEligibilityCensus(input);
    const second = buildSourceEligibilityCensus(input);
    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe('nightwatch.real-source-eligibility-census.v3');
    // C-01: every census states the population its counts were measured over.
    expect(first.summary.population.state).toBe('COMPLETE');
    expect(first.summary.population.coverageState).toBe('PROVEN');
    expect(first.summary.population.operations.total).toBe(1);
    expect(first.summary.population.enumeration.state).toBe('COMPLETE');
    expect(first.summary.population.contentRead.state).toBe('COMPLETE');
    expect(first.summary).toMatchObject({ totalOperations: 1, routeProofs: 1, requestContracts: 1, responseContracts: 0, semanticContractSurfaces: 0, readOnlyProven: 0, mutabilityUnknown: 1, phase24Eligible: 0, phase24Excluded: 1 });
    expect(first.rows[0]?.chain.firstBlockingStage).toBe('RESPONSE_CONTRACT');
    expect(first.rows[0]?.chain.stages.map((entry) => entry.stage)).toEqual([
      'SOURCE_DISCOVERED',
      'ROUTE_PROVEN',
      'REQUEST_CONTRACT',
      'RESPONSE_CONTRACT',
      'SEMANTIC_CONTRACT',
      'MUTABILITY_CLASSIFICATION',
      'READ_ONLY_PROOF',
      'JOIN_GRAPH_REQUIREMENTS',
      'RUNTIME_BINDING',
      'REPLAY_REQUIREMENTS',
      'DOSSIER_REQUIREMENTS',
      'PHASE24_ELIGIBILITY',
    ]);
    expect(first.rows[0]?.chain.secondaryBlockingStages).toEqual([
      'SEMANTIC_CONTRACT',
      'MUTABILITY_CLASSIFICATION',
      'READ_ONLY_PROOF',
      'JOIN_GRAPH_REQUIREMENTS',
      'RUNTIME_BINDING',
      'REPLAY_REQUIREMENTS',
      'DOSSIER_REQUIREMENTS',
      'PHASE24_ELIGIBILITY',
    ]);
    expect(first.summary).toMatchObject({ runtimeBindings: 0, runtimeBindingMissing: 1, replayRequirementsProven: 0, dossierCompatible: 0, dossierIncompatible: 1, currentnessFailureCount: 0 });
    expect(first.summary.proofFamilyRanking).toHaveLength(5);
    expect(first.summary.proofFamilyRanking.map((entry) => entry.family).sort()).toEqual(['JOIN_GRAPH', 'PHASE24_BRIDGE', 'RESPONSE_CONTRACT', 'RUNTIME_BINDING', 'SEMANTIC_CONTRACT'].sort());
    expect(first.summary.proofFamilyRanking[0]?.family).toBe('RESPONSE_CONTRACT');
    expect(first.summary.cost).toEqual(expect.objectContaining({ filesInspected: 0, bytesInspected: 0, responseFlowAttempts: 0 }));
    expect(first.summary.reasonFamilyCounts).toEqual(expect.arrayContaining([
      { code: 'MECHANICAL_PROOF_GAP', count: 1 },
      { code: 'SEMANTIC_OR_REPLAY_PREREQUISITE', count: 1 },
    ]));
    expect(JSON.stringify(first)).not.toContain('CUSTOMER_ELIGIBILITY_SENTINEL');
    expect(first.deterministicDigest).toMatch(/^source-eligibility-census:sha256:[0-9a-f]{24}$/);
  });

  test('separates mutability classification from read-only proof and detects independent semantic gaps', () => {
    const base = fixture();
    const provenResponse = { responseProof: 'PROVEN' as const, semanticProof: 'PROVEN' as const };

    const mutation = buildSourceEligibilityCensus(variant(base, { readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }, provenResponse));
    expect(mutation.rows[0]?.chain.firstBlockingStage).toBe('READ_ONLY_PROOF');
    expect(mutation.rows[0]?.chain.stages).toEqual(expect.arrayContaining([
      { stage: 'MUTABILITY_CLASSIFICATION', status: 'PROVEN' },
      { stage: 'READ_ONLY_PROOF', status: 'UNSAFE' },
    ]));

    const methodOnly = buildSourceEligibilityCensus(variant(base, { readOnlyClassification: 'READ_ONLY_METHOD_ONLY' }, provenResponse));
    expect(methodOnly.rows[0]?.chain.firstBlockingStage).toBe('MUTABILITY_CLASSIFICATION');
    expect(methodOnly.rows[0]?.chain.stages).toEqual(expect.arrayContaining([
      { stage: 'MUTABILITY_CLASSIFICATION', status: 'UNPROVEN' },
      { stage: 'READ_ONLY_PROOF', status: 'UNPROVEN' },
    ]));

    const semanticGap = buildSourceEligibilityCensus(variant(base, {}, { responseProof: 'PROVEN', semanticProof: 'MISSING_SYMBOL' }));
    expect(semanticGap.rows[0]?.chain.firstBlockingStage).toBe('SEMANTIC_CONTRACT');
    expect(semanticGap.summary.proofFamilyRanking.find((entry) => entry.family === 'SEMANTIC_CONTRACT')?.assessment).toBe('MEASURE_ONLY');
  });

  test('fails closed on portfolio/surface mismatches', () => {
    const input = fixture();
    expect(() => buildSourceEligibilityCensus({ discovery: { ...input.discovery, surfaces: [] }, portfolio: input.portfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_SURFACE_COUNT');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, consideredCount: 2 } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_SURFACE_COUNT');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, candidates: [{ surfaceKey: 'surface:sha256:999999999999999999999999', eligibility: 'EXCLUDED', reasonCodes: [] }] } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_OUTSIDE_SURFACES');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, candidates: [input.portfolio.candidates[0], input.portfolio.candidates[0]] } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_CANDIDATE_COUNT');
    expect(() => buildSourceEligibilityCensus({ discovery: input.discovery, portfolio: { ...input.portfolio, eligibleCount: 1, excludedCount: 0 } as unknown as Phase24CandidatePortfolio })).toThrow('SOURCE_ELIGIBILITY_CENSUS_PHASE24_COUNT');
  });

  test('operator proof-chain census is byte-stable across three fresh processes', () => {
    const outputs = Array.from({ length: 3 }, () => spawnSync(process.execPath, [path.join(process.cwd(), 'bin/nightwatch-intelligence.mjs'), 'eligibility-census', '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 60_000,
      // The C-02a population (814 operations) renders ~2.4 MB of census JSON.
      // Node's default 1 MB spawnSync buffer would truncate it and surface as
      // a null exit status, which is a harness limit, not a product fact.
      maxBuffer: 64 * 1024 * 1024,
    }));
    for (const output of outputs) {
      expect(output.status).toBe(0);
      expect(output.stderr).toBe('');
    }
    const censuses = outputs.map((output) => {
      const parsed = JSON.parse(output.stdout) as { readonly census: { readonly summary: { readonly proofFamilyRanking: readonly { readonly family: string; readonly assessment: string }[] }; readonly deterministicDigest: string } };
      return parsed.census;
    });
    expect(censuses[1]).toEqual(censuses[0]);
    expect(censuses[2]).toEqual(censuses[0]);
    expect(censuses[0]?.summary.proofFamilyRanking.find((entry) => entry.family === 'SEMANTIC_CONTRACT')?.assessment).toBe('NO_INDEPENDENT_GAP');
    // C-02a moved the dominant gap family. Binding 591 generated-artifact
    // response contracts through the document's own `definitions` left
    // RESPONSE_CONTRACT's gap unchanged at 165 surfaces, while every one of
    // those 591 operations declares no handler symbol at all — a generated
    // Swagger document has none — so JOIN_GRAPH now carries 607 gap surfaces
    // and ranks first. Both facts are measurements, not targets.
    expect(censuses[0]?.summary.proofFamilyRanking[0]?.family).toBe('JOIN_GRAPH');
    expect(JSON.stringify(censuses[0])).not.toContain('CUSTOMER_ELIGIBILITY_SENTINEL');
  });
});
