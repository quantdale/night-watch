import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPhase24CandidatePortfolio } from '../../src/core/phase24/portfolio';
import { buildContractGraph } from '../../src/core/semanticCoverage/graph';
import { phase20Inventory } from '../../corpus/phase20/contracts';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { buildSourceReviewQueue, explainSourceSurface } from '../../src/core/source/review';

const RIPPLE_API_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-surfaces-'));
}

function makeRepo(root: string): string {
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/master\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'master'), `${RIPPLE_API_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Schema'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/accts":',
    '  client: App\\Handler\\Account',
    '  method: getAccountVendor',
    '  request: src/App/Schema/AccountRequest.json',
    '  response: src/App/Schema/AccountResponse.json',
    '"post:/accts":',
    '  client: App\\Handler\\Account',
    '  method: updateAccount',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) {
  $res[] = ['id' => 1, 'status' => 'safe'];
  return $res;
}
`);
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountRequest.json'), '{"type":"object","properties":{"page":{"type":"integer"}}}\n');
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Schema', 'AccountResponse.json'), '{"type":"array","items":{"type":"object"}}\n');
  return repo;
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

test.describe('Phase 25 source surface discovery and Phase 24 bridge', () => {
  test('discovers a static route, joins its handler contract, and reuses Phase 24 eligibility', () => {
    const root = tempRoot();
    try {
      makeRepo(root);
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{
          repoId: 'mobingilabs/ripple-api',
          expectedSourceSha: RIPPLE_API_SHA,
          allowlistedRoots: ['src'],
          allowedExtensions: ['.php', '.json', '.yaml'],
          maxFiles: 64,
          maxFileBytes: 64_000,
          maxTotalBytes: 1_000_000,
        }],
      });
      const discovery = discoverSourceSurfaces({ access, config });
      expect(discovery.operations).toHaveLength(2);
      const read = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/accts' && surface.operation.method === 'GET');
      const write = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/accts' && surface.operation.method === 'POST');
      expect(read).toBeDefined();
      expect(read?.operation.runtimeBinding).toBe('RUNTIME_BOUND_EXACT');
      expect(read?.operation.readOnlyClassification).toBe('PROVEN_READ_ONLY');
      expect(read?.contract.requestProof).toBe('PROVEN');
      expect(read?.contract.responseProof).toBe('PROVEN');
      expect(read?.contract.semanticProof).toBe('PROVEN');
      expect(read?.joins.filter((join) => join.state === 'PROVEN').map((join) => join.kind)).toEqual(['HANDLER_REQUEST_CONTRACT', 'HANDLER_RESPONSE_CONTRACT', 'ROUTE_HANDLER']);
      expect(read?.componentProvenance.state).toBe('EXACT_COMPONENT');
      expect(read?.operation.deploymentStatusUnresolved).toBe(true);
      expect(read?.exclusionReasons).toEqual([]);
      expect(read?.lifecycle).toBe('PROJECTABLE');

      expect(write?.operation.readOnlyClassification).toBe('PROVEN_MUTATION_CAPABLE');
      expect(write?.exclusionReasons).toContain('MUTATION_CAPABLE');
      expect(write?.exclusionReasons).toContain('RESPONSE_CONTRACT_UNPROVEN');

      const portfolio = buildPhase24CandidatePortfolio({ candidates: discovery.phase24Inputs });
      expect(portfolio.consideredCount).toBe(2);
      expect(portfolio.eligibleCount).toBe(1);
      expect(portfolio.candidates.find((candidate) => candidate.targetId === 'ripple.account-inventory.read')?.eligibility).toBe('ELIGIBLE');
      expect(portfolio.candidates.find((candidate) => candidate.targetId !== 'ripple.account-inventory.read')?.eligibility).toBe('EXCLUDED');
      const integrated = analyzeSourceSurfacesIntoPhase24({ access, config, maxCandidates: 1 });
      expect(integrated.snapshotAnalyses).toHaveLength(2);
      expect(integrated.portfolio.deterministicDigest).toBe(portfolio.deterministicDigest);
      expect(integrated.selection.selectedCandidateIds).toEqual([integrated.portfolio.candidates.find((candidate) => candidate.eligibility === 'ELIGIBLE')?.candidateId]);
      expect(integrated.deterministicDigest).toMatch(/^source-phase24-integration:sha256:[0-9a-f]{24}$/);
      const review = buildSourceReviewQueue({ discovery, portfolio: integrated.portfolio, selection: integrated.selection });
      expect(review.selectedCount).toBe(1);
      const changedPortfolio = buildPhase24CandidatePortfolio({ candidates: discovery.phase24Inputs.map((input, index) => index === 0 ? { ...input, semanticExpectationId: 'expectation.changed' } : input) });
      expect(() => buildSourceReviewQueue({ discovery, portfolio: changedPortfolio, selection: integrated.selection })).toThrow(/SELECTION_HEADER/);
      expect(review.rows.find((row) => row.surfaceId === read!.surfaceId)?.priorityFactors).toEqual(expect.arrayContaining(['RUNTIME_BOUND', 'READ_ONLY_CONFIDENCE_HIGH', 'SEMANTIC_DEPTH_PROVEN', 'REPLAY_SUPPORTED']));
      expect(explainSourceSurface({ discovery, portfolio: integrated.portfolio, selection: integrated.selection, surfaceId: read!.surfaceId } )?.surfaceId).toBe(read!.surfaceId);
      // Safe handler identities are allowed; source bodies and literal values are not.
      expect(JSON.stringify(discovery)).not.toContain('$res[]');
      expect(JSON.stringify(discovery)).not.toContain("'safe'");
      expect(discovery.deterministicDigest).toMatch(/^source-surface-discovery:sha256:[0-9a-f]{24}$/);

      const graph = buildContractGraph({
        inventory: phase20Inventory(),
        sourceSurfaces: discovery.surfaces,
        sourceSurfaceBindings: [{ surfaceId: read!.surfaceId, phase24CandidateId: `candidate:${read!.surfaceId}`, runtimeBindingId: 'runtime:ripple.account-inventory.read', replayPlanId: 'replay:ripple.account-inventory.read', dossierId: 'dossier:ripple.account-inventory.read', replayInvalidated: false, dossierInvalidated: false }],
      });
      expect(graph.nodes.some((node) => node.kind === 'REPOSITORY')).toBe(true);
      expect(graph.nodes.some((node) => node.kind === 'REQUEST_CONTRACT')).toBe(true);
      expect(graph.nodes.some((node) => node.kind === 'RESPONSE_CONTRACT')).toBe(true);
      expect(graph.nodes.some((node) => node.kind === 'SEMANTIC_CONTRACT')).toBe(true);
      expect(graph.nodes.some((node) => node.kind === 'PHASE24_CANDIDATE')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'DECLARES_ROUTE')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'BINDS_HANDLER')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'BINDS_REPLAY')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'INVALIDATES_DOSSIER')).toBe(false);
      expect(graph).toEqual(buildContractGraph({
        inventory: phase20Inventory(),
        sourceSurfaces: [...discovery.surfaces].reverse(),
        sourceSurfaceBindings: [{ surfaceId: read!.surfaceId, phase24CandidateId: `candidate:${read!.surfaceId}`, runtimeBindingId: 'runtime:ripple.account-inventory.read', replayPlanId: 'replay:ripple.account-inventory.read', dossierId: 'dossier:ripple.account-inventory.read', replayInvalidated: false, dossierInvalidated: false }],
      }));
      expect(JSON.stringify(graph)).not.toContain('$res[]');
    } finally {
      cleanup(root);
    }
  });

  test('retains missing and multiply-defined cross-file joins as non-authoritative', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.appendFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
        '"get:/missing":',
        '  client: App\\Handler\\Missing',
        '  method: missing',
        '"get:/ambiguous":',
        '  client: App\\Handler\\Account',
        '  method: duplicate',
        '',
      ].join('\n'));
      fs.appendFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), [
        'function duplicate() { return []; }',
        'function duplicate() { return []; }',
        '',
      ].join('\n'));
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access, config });
      const missing = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/missing');
      const ambiguous = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/ambiguous');
      expect(missing?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('MISSING_SYMBOL');
      expect(missing?.exclusionReasons).toContain('HANDLER_UNRESOLVED');
      expect(ambiguous?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('MULTIPLE_SYMBOLS');
      expect(ambiguous?.exclusionReasons).toContain('HANDLER_AMBIGUOUS');
      expect(discovery.surfaces.filter((surface) => surface.operation.routeTemplate === '/missing' || surface.operation.routeTemplate === '/ambiguous').every((surface) => surface.exclusionReasons.length > 0)).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('keeps source-only and dynamically unsupported surfaces visible without granting authority', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.writeFileSync(path.join(repo, 'src', 'routes.ts'), `router.get('/source-only/{item}', sourceOnly);\nrouter.get(makeDynamicRoute(), dynamicHandler);\n`);
      const access = createSiblingSourceAccess(root);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.ts', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access, config });
      const sourceOnly = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/source-only/{item}');
      expect(sourceOnly?.operation.runtimeBinding).toBe('SOURCE_ONLY');
      expect(sourceOnly?.operation.readOnlyClassification).toBe('READ_ONLY_METHOD_ONLY');
      expect(sourceOnly?.exclusionReasons).toContain('RUNTIME_BINDING_MISSING');
      expect(sourceOnly?.exclusionReasons).toContain('READ_ONLY_NOT_PROVEN');
      expect(discovery.operations.some((operation) => operation.routeTemplate.includes('makeDynamicRoute'))).toBe(false);
      expect(discovery.counters.routeOperationsFound).toBeGreaterThanOrEqual(3);
    } finally {
      cleanup(root);
    }
  });
});
