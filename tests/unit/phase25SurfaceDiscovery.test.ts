import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPhase24CandidatePortfolio } from '../../src/core/phase24/portfolio';
import { buildContractGraph } from '../../src/core/semanticCoverage/graph';
import { phase20Inventory } from '../../corpus/phase20/contracts';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces, toPhase24CandidateInput } from '../../src/core/source/surfaces';
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
      expect(integrated.eligibilityCensus.summary).toMatchObject({
        totalOperations: 2,
        routeProofs: 2,
        requestContracts: 2,
        responseContracts: 1,
        semanticContractSurfaces: 1,
        mutationCapable: 1,
        readOnlyProven: 1,
        mutabilityUnknown: 0,
        phase24Eligible: 1,
        phase24Excluded: 1,
      });
      const censusRead = integrated.eligibilityCensus.rows.find((row) => row.surfaceId === read!.surfaceId);
      const censusWrite = integrated.eligibilityCensus.rows.find((row) => row.surfaceId === write!.surfaceId);
      expect(censusRead?.chain.firstBlockingStage).toBe(null);
      expect(censusRead?.chain.stages.at(-1)).toEqual({ stage: 'PHASE24_ELIGIBILITY', status: 'ELIGIBLE' });
      expect(censusWrite?.chain.firstBlockingStage).toBe('RESPONSE_CONTRACT');
      expect(censusWrite?.reasonFamilies).toContain('HARD_UNSAFE');
      expect(integrated.eligibilityCensus.deterministicDigest).toMatch(/^source-eligibility-census:sha256:[0-9a-f]{24}$/);
      const review = buildSourceReviewQueue({ discovery, portfolio: integrated.portfolio, selection: integrated.selection });
      expect(review.selectedCount).toBe(1);
      const changedPortfolio = buildPhase24CandidatePortfolio({ candidates: discovery.phase24Inputs.map((input, index) => index === 0 ? { ...input, semanticExpectationId: 'expectation.changed' } : input) });
      expect(() => buildSourceReviewQueue({ discovery, portfolio: changedPortfolio, selection: integrated.selection })).toThrow(/SELECTION_HEADER/);
      expect(review.rows.find((row) => row.surfaceId === read!.surfaceId)?.priorityFactors).toEqual(expect.arrayContaining(['RUNTIME_BOUND', 'READ_ONLY_CONFIDENCE_HIGH', 'SEMANTIC_DEPTH_PROVEN', 'REPLAY_SUPPORTED']));
      expect(explainSourceSurface({ discovery, portfolio: integrated.portfolio, selection: integrated.selection, surfaceId: read!.surfaceId } )?.surfaceId).toBe(read!.surfaceId);
      // Safe handler identities are allowed; source bodies and literal values are not.
      expect(JSON.stringify(discovery)).not.toContain('$res[]');
      expect(JSON.stringify(discovery)).not.toContain("'safe'");
      expect(JSON.stringify(integrated.eligibilityCensus)).not.toContain('$res[]');
      expect(JSON.stringify(integrated.eligibilityCensus)).not.toContain("'safe'");
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

  test('keeps a current source snapshot distinct from a stale runtime binding', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      const staleRuntimeSha = 'f'.repeat(40);
      fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'master'), `${staleRuntimeSha}\n`);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: staleRuntimeSha, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const access = createSiblingSourceAccess(root);
      const discovery = discoverSourceSurfaces({ access, config });
      const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/accts' && entry.operation.method === 'GET');
      expect(surface?.currentness).toBe('CURRENT');
      expect(surface?.operation.runtimeBinding).toBe('SOURCE_VERSION_MISMATCH');
      const candidate = toPhase24CandidateInput(surface!);
      expect(candidate.sourceVersion).toBe('DRIFTED');
      const integrated = analyzeSourceSurfacesIntoPhase24({ access, config, discovery });
      expect(integrated.portfolio.candidates.find((entry) => entry.surfaceKey === surface?.surfaceId)?.exclusionReasons.map((reason) => reason.code)).toContain('SOURCE_VERSION_DRIFT');
    } finally {
      cleanup(root);
    }
  });

  test('rejects an implicit PHP return fallthrough through public surface discovery', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($mode) {
  if ($mode) {
    return ['id' => 1, 'status' => 'safe'];
  }
}
`);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config });
      const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/accts' && entry.operation.method === 'GET');
      expect(surface?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('PROVEN');
      expect(surface?.contract.responseProof).not.toBe('PROVEN');
      expect(surface?.contract.semanticProof).not.toBe('PROVEN');
      expect(surface?.exclusionReasons).toContain('RESPONSE_CONTRACT_UNPROVEN');
    } finally {
      cleanup(root);
    }
  });

  test('ignores comments and strings while preserving real TypeScript and Go route identity', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.writeFileSync(path.join(repo, 'src', 'static.ts'), [
        '// app.get("/ghost", ghostHandler)',
        `const documentation = 'router.get("/also-ghost", anotherHandler)';`,
        'const routePattern = /app\\.get\\("\\/regex-ghost", regexHandler\\)/;',
        'app.get("/real", realHandler);',
        'Router.get("/real-capitalized", capitalizedHandler);',
      ].join('\n'));
      fs.writeFileSync(path.join(repo, 'src', 'static.js'), [
        '/* router.get("/block-ghost", blockGhostHandler) */',
        'app.get("/real-js", realJsHandler);',
      ].join('\n'));
      fs.writeFileSync(path.join(repo, 'src', 'static.go'), [
        '/* router.GET("/block-ghost-go", blockGhostGoHandler) */',
        '// router.GET("/ghost-go", ghostGoHandler)',
        'var documentation = `router.GET("/also-ghost-go", anotherGoHandler)`;',
        'router.Get("/mixed-case-ghost-go", mixedCaseGoHandler)',
        'router.GET("/real-go", realGoHandler)',
      ].join('\n'));
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml', '.ts', '.js', '.go'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config });
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.ts').map((operation) => operation.routeTemplate)).toEqual(['/real', '/real-capitalized']);
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.js').map((operation) => operation.routeTemplate)).toEqual(['/real-js']);
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.go').map((operation) => operation.routeTemplate)).toEqual(['/real-go']);
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.ts').map((operation) => operation.handlerSymbol)).toEqual(['realHandler', 'capitalizedHandler']);
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.js').map((operation) => operation.handlerSymbol)).toEqual(['realJsHandler']);
      expect(discovery.operations.filter((operation) => operation.sourcePath === 'src/static.go').map((operation) => operation.handlerSymbol)).toEqual(['realGoHandler']);
    } finally {
      cleanup(root);
    }
  });

  test('fails closed for malformed static lexical input instead of retaining a partial route list', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.writeFileSync(path.join(repo, 'src', 'malformed.ts'), 'app.get("/lost", lostHandler);\n/* unterminated comment');
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml', '.ts'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config });
      expect(discovery.operations.some((operation) => operation.sourcePath === 'src/malformed.ts')).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  test('counts only lexically real PHP declarations and still rejects two real declarations', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
// function getAccountVendor($source) { return []; }
/** function getAccountVendor($source) { return []; } */
$documentation = 'function getAccountVendor($source) { return []; }';
function getAccountVendor($source) {
  return ['id' => 1, 'status' => 'safe'];
}
`);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const access = createSiblingSourceAccess(root);
      const single = discoverSourceSurfaces({ access, config });
      const singleSurface = single.surfaces.find((entry) => entry.operation.routeTemplate === '/accts' && entry.operation.method === 'GET');
      expect(singleSurface?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('PROVEN');
      expect(singleSurface?.contract.responseProof).toBe('PROVEN');

      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function getAccountVendor($source) { return ['id' => 1]; }
function getAccountVendor($source) { return ['id' => 2]; }
`);
      const duplicate = discoverSourceSurfaces({ access, config });
      const duplicateSurface = duplicate.surfaces.find((entry) => entry.operation.routeTemplate === '/accts' && entry.operation.method === 'GET');
      expect(duplicateSurface?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('MULTIPLE_SYMBOLS');
      expect(duplicateSurface?.contract.responseProof).not.toBe('PROVEN');
    } finally {
      cleanup(root);
    }
  });

  test('counts a lexically real PHP reference-return declaration', () => {
    const root = tempRoot();
    try {
      const repo = makeRepo(root);
      fs.appendFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
        '"get:/by-ref":',
        '  client: App\\Handler\\Account',
        '  method: getAccountByReference',
        '',
      ].join('\n'));
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Account.php'), `<?php
function &getAccountByReference($source) {
  return ['id' => 1];
}
`);
      const config = createRealSourceScanConfig({
        runtimeMappingNamespace: 'ripple',
        approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: RIPPLE_API_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
      });
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config });
      const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/by-ref');
      expect(surface?.joins.find((join) => join.kind === 'ROUTE_HANDLER')?.state).toBe('PROVEN');
    } finally {
      cleanup(root);
    }
  });
});
