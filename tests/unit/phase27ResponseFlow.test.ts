import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildContractGraph } from '../../src/core/semanticCoverage/graph';
import { phase20Inventory } from '../../corpus/phase20/contracts';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { createResponseFlowIndex, resolveResponseFlow } from '../../src/core/source/responseFlow';
import { compareSourceSurfaces } from '../../src/core/source/invalidation';
import { createRealSourceSurfaceCache } from '../../src/core/source/cache';
import { analyzeSourceSurfacesIntoPhase24 } from '../../src/core/source/surfaces';
import { analyzeSourceArtifact } from '../../src/core/semanticCoverage/sourceAnalyzers';

const SOURCE_SHA = '7'.repeat(40);

function setup(source: { readonly reader: string; readonly factory?: string; readonly duplicateFactory?: string }): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase27-flow-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/helper":',
    '  client: App\\Handler\\Reader',
    '  method: read',
    '"get:/static":',
    '  client: App\\Handler\\Reader',
    '  method: readStatic',
    '"get:/self":',
    '  client: App\\Handler\\Reader',
    '  method: readSelf',
    '"get:/chain":',
    '  client: App\\Handler\\Reader',
    '  method: readChain',
    '"get:/dynamic":',
    '  client: App\\Handler\\Reader',
    '  method: readDynamic',
    '"get:/cycle":',
    '  client: App\\Handler\\Reader',
    '  method: readCycle',
    '"get:/branch":',
    '  client: App\\Handler\\Reader',
    '  method: readBranch',
    '"get:/deep":',
    '  client: App\\Handler\\Reader',
    '  method: readDeep',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Reader.php'), source.reader);
  if (source.factory !== undefined) fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'ResponseFactory.php'), source.factory);
  if (source.duplicateFactory !== undefined) fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'DuplicateFactory.php'), source.duplicateFactory);
  return root;
}

function scanConfig() {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.yaml'],
      maxFiles: 32,
      maxFileBytes: 64_000,
      maxTotalBytes: 1_000_000,
    }],
  });
}

const reader = `<?php
class Reader {
  public function read() { return $this->payload(); }
  private function payload() { return ['id' => 1, 'status' => 'ok']; }
  public function readStatic() { return ResponseFactory::success(); }
  public function readSelf() { return self::payloadStatic(); }
  private static function payloadStatic() { return ['id' => 1, 'status' => 'ok']; }
  public function readChain() { return $this->first(); }
  private function first() { return $this->second(); }
  private function second() { return ['id' => 1, 'status' => 'ok']; }
  public function readDynamic() { $method = 'payload'; return $this->$method(); }
  public function readCycle() { return $this->cycle(); }
  private function cycle() { return $this->readCycle(); }
  public function readBranch($mode) { if ($mode) return $this->left(); else return $this->right(); }
  private function left() { return ['id' => 1]; }
  private function right() { return ['id' => 1, 'status' => 'ok']; }
  public function readDeep() { return $this->deepOne(); }
  private function deepOne() { return $this->deepTwo(); }
  private function deepTwo() { return $this->deepThree(); }
  private function deepThree() { return ['id' => 1]; }
}
`;

test.describe('Phase 27 exact response-flow joins', () => {
  test('proves same-class, exact static, and bounded helper-chain flows', () => {
    const root = setup({ reader, factory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 1, \'status\' => \'ok\']; } }\n' });
    try {
      const access = createSiblingSourceAccess(root);
      const discovery = discoverSourceSurfaces({ access, config: scanConfig() });
      const helper = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/helper');
      const staticHelper = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/static');
      const selfHelper = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/self');
      const chain = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/chain');
      expect(helper?.contract.responseProof).toBe('PROVEN');
      expect(helper?.contract.responseFlow?.status).toBe('PROVEN');
      expect(helper?.contract.responseFlow?.depth).toBe(1);
      expect(helper?.contract.responseFlow?.declarations).toHaveLength(2);
      expect(helper?.joins.filter((join) => join.kind === 'RESPONSE_FLOW' && join.state === 'PROVEN')).toHaveLength(1);
      expect(helper?.relevantFiles).toEqual(['src/App/Handler/Reader.php', 'src/App/Route/Config/Routing.yaml']);
      expect(staticHelper?.contract.responseProof).toBe('PROVEN');
      expect(staticHelper?.contract.responseFlow?.status).toBe('PROVEN');
      expect(staticHelper?.relevantFiles).toEqual(['src/App/Handler/Reader.php', 'src/App/Handler/ResponseFactory.php', 'src/App/Route/Config/Routing.yaml']);
      expect(selfHelper?.contract.responseProof).toBe('PROVEN');
      expect(selfHelper?.contract.responseFlow?.status).toBe('PROVEN');
      expect(chain?.contract.responseProof).toBe('PROVEN');
      expect(chain?.contract.responseFlow?.depth).toBe(2);
      expect(chain?.contract.responseFlow?.declarations).toHaveLength(3);
      expect(discovery.counters.responseFlowAttempts).toBe(8);
      expect(discovery.counters.responseFlowProven).toBe(4);
      expect(discovery.counters.responseFlowRejected).toBe(4);
      expect(discovery.counters.responseFlowResolvedCalls).toBe(10);
      expect(discovery.counters.responseFlowMaxDepth).toBe(2);
      const graph = buildContractGraph({ inventory: phase20Inventory(), sourceSurfaces: discovery.surfaces });
      expect(graph.nodes.some((node) => node.kind === 'RESPONSE_DECLARATION')).toBe(true);
      expect(graph.nodes.some((node) => node.kind === 'RESPONSE_FLOW_CALLSITE')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'RESOLVES_RESPONSE_FLOW')).toBe(true);
      expect(graph.edges.some((edge) => edge.reason === 'PRODUCES_RESPONSE_CONTRACT' && graph.nodes.find((node) => node.nodeId === edge.from)?.kind === 'RESPONSE_DECLARATION')).toBe(true);
      expect(JSON.stringify(graph)).not.toContain("'status' => 'ok'");
      expect(JSON.stringify(discovery)).not.toContain("'status' => 'ok'");
      expect(discovery).toEqual(discoverSourceSurfaces({ access, config: scanConfig() }));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects dynamic dispatch, cycles, incompatible branch shapes, and depth overflow', () => {
    const root = setup({ reader });
    try {
      const access = createSiblingSourceAccess(root);
      const discovery = discoverSourceSurfaces({ access, config: scanConfig() });
      const surface = (route: string) => discovery.surfaces.find((entry) => entry.operation.routeTemplate === route);
      expect(surface('/dynamic')?.contract.responseProof).toBe('UNSUPPORTED_REFERENCE');
      expect(surface('/dynamic')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_DYNAMIC_DISPATCH');
      expect(surface('/cycle')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_FLOW_CYCLE');
      expect(surface('/branch')?.contract.responseProof).toBe('UNSUPPORTED_REFERENCE');
      expect(surface('/branch')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_BRANCH_INCOMPLETE');
      expect(surface('/deep')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_FLOW_DEPTH_EXCEEDED');
      expect(discovery.surfaces.filter((entry) => entry.contract.responseProof === 'PROVEN')).toHaveLength(3);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects an ambiguous exact static declaration and preserves a categorical proof reason', () => {
    const root = setup({
      reader,
      factory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 1]; } }\n',
      duplicateFactory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 2]; } }\n',
    });
    try {
      const access = createSiblingSourceAccess(root);
      const config = scanConfig();
      const discovery = discoverSourceSurfaces({ access, config });
      const staticSurface = discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/static');
      expect(staticSurface?.contract.responseProof).toBe('UNSUPPORTED_REFERENCE');
      expect(staticSurface?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_SYMBOL_AMBIGUOUS');
      expect(staticSurface?.contract.responseAnalyzerDiagnostics.find((diagnostic) => diagnostic.analyzerId === 'PHP_RESPONSE_FLOW')?.flowRejectionCode).toBe('RESPONSE_SYMBOL_AMBIGUOUS');

      const index = createResponseFlowIndex({ access, inventory: discovery.inventory });
      const proof = resolveResponseFlow({ index, operation: staticSurface!.operation });
      expect(proof).toEqual(staticSurface?.contract.responseFlow);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('invalidates dependent proof on same-SHA helper changes and preserves unrelated surfaces', () => {
    const root = setup({ reader, factory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 1, \'status\' => \'ok\']; } }\n' });
    try {
      const access = createSiblingSourceAccess(root);
      const config = scanConfig();
      const cache = createRealSourceSurfaceCache();
      const prior = discoverSourceSurfaces({ access, config, cache });
      const priorStatic = prior.surfaces.find((surface) => surface.operation.routeTemplate === '/static');
      expect(priorStatic?.contract.responseFlow?.status).toBe('PROVEN');
      expect(priorStatic?.operation.sourceSha).toBe(SOURCE_SHA);
      expect(cache.stats()).toMatchObject({ misses: 1, hits: 0 });
      expect(discoverSourceSurfaces({ access, config, cache }).deterministicDigest).toBe(prior.deterministicDigest);
      expect(cache.stats()).toMatchObject({ misses: 1, hits: 1 });

      fs.writeFileSync(path.join(root, 'mobingilabs', 'ripple-api', 'src', 'App', 'Handler', 'ResponseFactory.php'), '<?php class ResponseFactory { public static function success() { return [\'id\' => 2, \'status\' => \'changed\']; } }\n');
      const changed = discoverSourceSurfaces({ access, config, cache });
      const changedStatic = changed.surfaces.find((surface) => surface.operation.routeTemplate === '/static');
      expect(changedStatic?.contract.responseFlow?.status).toBe('PROVEN');
      expect(changedStatic?.contract.responseContractId).not.toBe(priorStatic?.contract.responseContractId);
      expect(changedStatic?.relevantFiles).toContain('src/App/Handler/ResponseFactory.php');
      const changedReport = compareSourceSurfaces({ prior: { discovery: prior, portfolio: null }, current: { discovery: changed, portfolio: null } });
      expect(changedReport.changedFiles.map((file) => file.relativePath)).toContain('src/App/Handler/ResponseFactory.php');
      expect(changedReport.changedResponseContracts.length).toBeGreaterThan(0);
      expect(changedReport.changedSemanticContracts.length).toBeGreaterThan(0);

      fs.writeFileSync(path.join(root, 'mobingilabs', 'ripple-api', 'src', 'Unrelated.php'), '<?php function unrelated() { return [\'safe\' => 1]; }\n');
      const unrelated = discoverSourceSurfaces({ access, config, cache });
      const unrelatedReport = compareSourceSurfaces({ prior: { discovery: changed, portfolio: null }, current: { discovery: unrelated, portfolio: null } });
      expect(unrelatedReport.addedFiles.map((file) => file.relativePath)).toEqual(['src/Unrelated.php']);
      expect(unrelatedReport.changedResponseContracts).toEqual([]);
      expect(unrelatedReport.changedSemanticContracts).toEqual([]);
      expect(unrelatedReport.unchangedSurfaceIds).toHaveLength(unrelated.surfaces.length);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('fails closed when a proven helper declaration disappears at the same source SHA', () => {
    const root = setup({ reader, factory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 1, \'status\' => \'ok\']; } }\n' });
    try {
      const access = createSiblingSourceAccess(root);
      const config = scanConfig();
      const prior = discoverSourceSurfaces({ access, config });
      fs.rmSync(path.join(root, 'mobingilabs', 'ripple-api', 'src', 'App', 'Handler', 'ResponseFactory.php'));
      const current = discoverSourceSurfaces({ access, config });
      const surface = current.surfaces.find((entry) => entry.operation.routeTemplate === '/static');
      expect(surface?.contract.responseFlow?.status).toBe('REJECTED');
      expect(surface?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_SYMBOL_MISSING');
      expect(surface?.contract.responseProof).toBe('UNSUPPORTED_REFERENCE');
      expect(surface?.contract.responseContractId).toBeNull();
      const report = compareSourceSurfaces({ prior: { discovery: prior, portfolio: null }, current: { discovery: current, portfolio: null } });
      expect(report.removedFiles.map((file) => file.relativePath)).toContain('src/App/Handler/ResponseFactory.php');
      expect(report.changedResponseContracts.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('keeps Phase 24 as the only portfolio authority in the synthetic flow path', () => {
    const root = setup({ reader, factory: '<?php class ResponseFactory { public static function success() { return [\'id\' => 1, \'status\' => \'ok\']; } }\n' });
    try {
      const access = createSiblingSourceAccess(root);
      const config = scanConfig();
      const discovery = discoverSourceSurfaces({ access, config });
      const integration = analyzeSourceSurfacesIntoPhase24({ access, config, discovery, maxCandidates: 6 });
      expect(integration.portfolio.consideredCount).toBe(discovery.surfaces.length);
      expect(integration.portfolio.eligibleCount).toBe(0);
      expect(integration.portfolio.excludedCount).toBe(discovery.surfaces.length);
      expect(discovery.surfaces.filter((surface) => surface.contract.responseProof === 'PROVEN').length).toBeGreaterThan(0);
      expect(discovery.surfaces.filter((surface) => surface.operation.readOnlyClassification === 'PROVEN_READ_ONLY')).toHaveLength(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('keeps namespace, inheritance, traits, magic methods, factories, and malformed declarations excluded', () => {
    const root = setup({ reader });
    try {
      const repo = path.join(root, 'mobingilabs', 'ripple-api');
      fs.appendFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
        '"get:/namespace":',
        '  client: App\\Handler\\Namespaced',
        '  method: read',
        '"get:/inheritance":',
        '  client: App\\Handler\\Inherited',
        '  method: read',
        '"get:/trait":',
        '  client: App\\Handler\\Traited',
        '  method: read',
        '"get:/magic":',
        '  client: App\\Handler\\Magic',
        '  method: read',
        '"get:/factory":',
        '  client: App\\Handler\\Constructed',
        '  method: read',
        '"get:/variable-function":',
        '  client: App\\Handler\\VariableFunction',
        '  method: read',
        '"get:/malformed":',
        '  client: App\\Handler\\Malformed',
        '  method: read',
        '',
      ].join('\n'));
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Namespaced.php'), '<?php namespace App\\Handler; class Namespaced { public function read() { return ResponseFactory::success(); } }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Inherited.php'), '<?php class Inherited extends Base { public function read() { return $this->payload(); } private function payload() { return [\'safe\' => 1]; } }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Traited.php'), '<?php trait PayloadTrait { private function payload() { return [\'safe\' => 1]; } } class Traited { use PayloadTrait; public function read() { return $this->payload(); } }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Magic.php'), '<?php class Magic { public function __call($name, $args) { return []; } public function read() { return $this->payload(); } }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Constructed.php'), '<?php class Constructed { public function read() { return new ResponseDto(); } }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'VariableFunction.php'), '<?php function read() { $fn = "payload"; return $fn(); }\n');
      fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Malformed.php'), '<?php function read( { return [\'safe\' => 1];\n');
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: scanConfig() });
      for (const route of ['/namespace', '/inheritance', '/trait', '/magic', '/factory', '/variable-function', '/malformed']) {
        const surface = discovery.surfaces.find((entry) => entry.operation.routeTemplate === route);
        expect(surface, route).toBeDefined();
        expect(surface?.contract.responseProof, route).not.toBe('PROVEN');
        expect(surface?.contract.responseContractId, route).toBeNull();
        expect(surface?.contract.responseFlow?.status, route).not.toBe('PROVEN');
      }
      expect(discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/namespace')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_DECLARATION_UNAPPROVED');
      expect(discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/factory')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_UNSUPPORTED_HELPER_SYNTAX');
      expect(discovery.surfaces.find((entry) => entry.operation.routeTemplate === '/variable-function')?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_DYNAMIC_DISPATCH');
      expect(JSON.stringify(discovery)).not.toContain("'safe' => 1");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('Phase 27 bounded PHP lexical hardening', () => {
  const artifact = (sourceText: string) => ({
    artifactId: 'phase27-lexer-hardening',
    language: 'PHP' as const,
    repoId: 'synthetic/phase27',
    sha: SOURCE_SHA,
    relativePath: 'src/Handler/Reader.php',
    symbol: 'read',
    sourceText,
    observationSurfaces: ['API', 'SYNTHETIC'] as const,
    includeExtendedResponseProof: true as const,
  });

  test('keeps oversized opaque string values lexable and structurally typed', () => {
    const longValue = 'x'.repeat(512);
    const observations = analyzeSourceArtifact(artifact(`function read() { return ['id' => 1, 'message' => '${longValue}']; }`));
    expect(observations.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(true);
    expect(observations.find((observation) => observation.analyzerId === 'PHP_RETURN_FIELD_TYPE' && observation.shape?.kind === 'FIELD_TYPE' && observation.shape.field === 'message')?.shape).toEqual({ kind: 'FIELD_TYPE', field: 'message', allowedTypes: ['STRING'] });
    expect(JSON.stringify(observations)).not.toContain(longValue);
    expect(JSON.stringify(observations)).not.toContain('PHP_LEX:token-too-long');
  });

  test('does not admit an oversized structural key and keeps privacy rejection ahead of lexing', () => {
    const longKey = 'k'.repeat(512);
    const keyObservations = analyzeSourceArtifact(artifact(`function read() { return ['${longKey}' => 1]; }`));
    expect(keyObservations.some((observation) => observation.analyzerId === 'PHP_RETURN_OBJECT_FIELDS' && observation.status === 'MECHANICALLY_PROVABLE')).toBe(false);
    expect(keyObservations.some((observation) => observation.rejectionCode === 'DYNAMIC_KEY_FLOW')).toBe(true);
    const privateObservations = analyzeSourceArtifact(artifact(`function read() { return ['message' => '${'PRIVACY_SENTINEL'}']; }`));
    expect(privateObservations).toHaveLength(1);
    expect(privateObservations[0]?.rejectionCode).toBe('PRIVACY_UNSAFE_SOURCE');
  });
});
