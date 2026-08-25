import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { createResponseFlowIndex, MAX_RESPONSE_FLOW_DECLARATIONS, MAX_RESPONSE_FLOW_INDEX_DECLARATIONS, MAX_RESPONSE_FLOW_RETURN_SITES, MAX_RESPONSE_FLOW_SOURCE_BYTES, resolveResponseFlow } from '../../src/core/source/responseFlow';
import { buildSourceGapTaxonomy } from '../../src/core/source/gapTaxonomy';
import { compareSourceSurfaces } from '../../src/core/source/invalidation';
import { discoverSourceSurfaces, sourceProofGapCode } from '../../src/core/source/surfaces';
import { MAX_PHP_SOURCE_CHARS, tokenizePhp } from '../../src/oracles/expectations/extract/php';

const SOURCE_SHA = '8'.repeat(40);

function setup(source: string, options: { readonly maxFileBytes?: number } = {}): { readonly root: string; readonly config: ReturnType<typeof createRealSourceScanConfig> } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase28-source-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Route', 'Config'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'src', 'App', 'Handler'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Route', 'Config', 'Routing.yaml'), [
    '"get:/read":',
    '  client: App\\Handler\\Reader',
    '  method: read',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'App', 'Handler', 'Reader.php'), source);
  const maxFileBytes = options.maxFileBytes ?? 128_000;
  const config = createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'mobingilabs/ripple-api',
      expectedSourceSha: SOURCE_SHA,
      allowlistedRoots: ['src'],
      allowedExtensions: ['.php', '.yaml'],
      maxFiles: 16,
      maxFileBytes,
      maxTotalBytes: Math.max(1_000_000, maxFileBytes + 50_000),
    }],
  });
  return { root, config };
}

function discover(source: string, options: { readonly maxFileBytes?: number } = {}) {
  const { root, config } = setup(source, options);
  const access = createSiblingSourceAccess(root);
  return { root, access, config, discovery: discoverSourceSurfaces({ access, config }) };
}

test.describe('Phase 28 source-intelligence taxonomy and rejection hardening', () => {
  test('retains the categorical flow rejection and removes the generic syntax collapse', () => {
    const fixture = discover(`<?php
class Reader {
  public function read() { $method = 'payload'; return $this->$method(); }
  private function payload() { return ['id' => 1]; }
}
`);
    try {
      const surface = fixture.discovery.surfaces[0]!;
      const diagnostic = surface.contract.responseAnalyzerDiagnostics.find((entry) => entry.analyzerId === 'PHP_RESPONSE_FLOW')!;
      expect(diagnostic.rejectionCode).toBeNull();
      expect(diagnostic.flowRejectionCode).toBe('RESPONSE_DYNAMIC_DISPATCH');
      expect(diagnostic.rejectionFamily).toBe('DYNAMIC_DISPATCH');
      expect(sourceProofGapCode(surface.contract.responseProof, surface.contract.responseAnalyzerDiagnostics, 'RESPONSE')).toBe('RESPONSE_FLOW_DYNAMIC_DISPATCH');
      expect(fixture.discovery.gapTaxonomy.dimensions.rejectionCode).toEqual(expect.arrayContaining([{ code: 'RESPONSE_DYNAMIC_DISPATCH', count: 1 }]));
      expect(fixture.discovery.gapTaxonomy.dimensions.rejectionFamily).toEqual(expect.arrayContaining([{ code: 'DYNAMIC_DISPATCH', count: 1 }]));
      expect(fixture.discovery.gapTaxonomy.dimensions.analyzerVersion).toEqual(expect.arrayContaining([{ code: 'nightwatch.real-source-response-flow.v1', count: 1 }]));
      expect(JSON.stringify(fixture.discovery)).not.toContain("'id' => 1");
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('taxonomy is bounded, deterministic, and reports safe structural dimensions', () => {
    const source = `<?php
class Reader {
  public function read() { return $this->left(); }
  private function left() { return $this->right(); }
  private function right() { return ['id' => 1, 'status' => 'ok']; }
}
`;
    const first = discover(source);
    const second = discover(source);
    try {
      expect(first.discovery.gapTaxonomy).toEqual(second.discovery.gapTaxonomy);
      expect(first.discovery.deterministicDigest).toBe(second.discovery.deterministicDigest);
      expect(first.discovery.gapTaxonomy.schemaVersion).toBe('nightwatch.real-source-gap-taxonomy.v3');
      expect(first.discovery.gapTaxonomy.surfaceCount).toBe(1);
      expect(first.discovery.gapTaxonomy.topGapSurfaces.length).toBeLessThanOrEqual(32);
      expect(first.discovery.gapTaxonomy.dimensions.repository).toEqual(expect.arrayContaining([{ code: 'mobingilabs/ripple-api', count: expect.any(Number) }]));
      expect(first.discovery.gapTaxonomy.dimensions.analyzerVersion).toEqual(expect.arrayContaining([{ code: 'nightwatch.semantic-source-analyzers.v1', count: expect.any(Number) }]));
      expect(first.discovery.gapTaxonomy.dimensions.rejectionFamily).toEqual(expect.arrayContaining([{ code: 'UNSUPPORTED_SYNTAX', count: expect.any(Number) }]));
      expect(first.discovery.performance.schemaVersion).toBe('nightwatch.real-source-surface-performance.v1');
      expect(first.discovery.performance.phpFilesTokenized).toBeGreaterThan(0);
      expect(first.discovery.performance.declarationsIndexed).toBeGreaterThan(0);
      expect(first.discovery.performance.maxDeclarationsPerFile).toBeGreaterThan(0);
      expect(first.discovery.performance.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(JSON.stringify(first.discovery.gapTaxonomy)).not.toContain("'status' => 'ok'");
      expect(buildSourceGapTaxonomy({ inventory: first.discovery.inventory, surfaces: [...first.discovery.surfaces].reverse() })).toEqual(first.discovery.gapTaxonomy);
    } finally {
      fs.rmSync(first.root, { recursive: true, force: true });
      fs.rmSync(second.root, { recursive: true, force: true });
    }
  });

  test('rejects a same-SHA stale snapshot instead of resolving against changed content', () => {
    const fixture = discover(`<?php
class Reader {
  public function read() { return $this->payload(); }
  private function payload() { return ['id' => 1]; }
}
`);
    try {
      const access = createSiblingSourceAccess(fixture.root);
      const prior = fixture.discovery;
      const operation = prior.surfaces[0]!.operation;
      fs.writeFileSync(path.join(fixture.root, 'mobingilabs', 'ripple-api', 'src', 'App', 'Handler', 'Reader.php'), `<?php
class Reader {
  public function read() { return $this->payload(); }
  private function payload() { return ['id' => 2]; }
}
`);
      const index = createResponseFlowIndex({ access, inventory: prior.inventory });
      expect(index.fileState(operation.repository, operation.handlerPath!)).toBe('SOURCE_STALE');
      const proof = resolveResponseFlow({ index, operation });
      expect(proof.rejectionCode).toBe('RESPONSE_DECLARATION_STALE');
      expect(JSON.stringify(proof)).not.toContain("'id' => 2");
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('emits a bounded before/after taxonomy delta without changing proof authority', () => {
    const fixture = discover(`<?php
class Reader {
  public function read() { $method = 'payload'; return $this->$method(); }
  private function payload() { return ['id' => 1]; }
}
`);
    try {
      const access = createSiblingSourceAccess(fixture.root);
      const prior = fixture.discovery;
      fs.writeFileSync(path.join(fixture.root, 'mobingilabs', 'ripple-api', 'src', 'App', 'Handler', 'Reader.php'), `<?php
class Reader {
  public function read() { return ['id' => 1]; }
}
`);
      const current = discoverSourceSurfaces({ access, config: fixture.config });
      const report = compareSourceSurfaces({ prior: { discovery: prior, portfolio: null }, current: { discovery: current, portfolio: null } });
      expect(report.gapTaxonomyChange.schemaVersion).toBe('nightwatch.real-source-gap-taxonomy-change.v1');
      expect(report.gapTaxonomyChange.priorDigest).not.toBe(report.gapTaxonomyChange.currentDigest);
      expect(report.gapTaxonomyChange.changedDimensions.length).toBeGreaterThan(0);
      expect(current.surfaces[0]?.contract.responseProof).toBe('PROVEN');
      expect(JSON.stringify(report.gapTaxonomyChange)).not.toContain("'id' => 1");
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('separates declaration-count exhaustion from depth exhaustion', () => {
    const helpers = Array.from({ length: MAX_RESPONSE_FLOW_DECLARATIONS + 1 }, (_, index) => `  private function helper${index}() { return ['id' => ${index}]; }`).join('\n');
    const calls = Array.from({ length: MAX_RESPONSE_FLOW_DECLARATIONS + 1 }, (_, index) => `  public function read${index}() { return $this->helper${index}(); }`).join('\n');
    const fixture = setup(`<?php\nclass Reader {\n${calls}\n${helpers}\n  public function read() { return $this->helper0(); }\n}\n`);
    try {
      const access = createSiblingSourceAccess(fixture.root);
      const discovery = discoverSourceSurfaces({ access, config: fixture.config });
      const surface = discovery.surfaces[0]!;
      const index = createResponseFlowIndex({ access, inventory: discovery.inventory });
      const proof = resolveResponseFlow({ index, operation: surface.operation });
      expect(proof.rejectionCode).not.toBe('RESPONSE_FLOW_DEPTH_EXCEEDED');
      expect(proof.rejectionCode).toBeNull();
      const fanoutSource = `<?php\nclass Reader {\n  public function read() {\n${Array.from({ length: MAX_RESPONSE_FLOW_DECLARATIONS + 1 }, (_, i) => `    if ($x${i}) return $this->helper${i}();`).join('\n')}\n  }\n${helpers}\n}\n`;
      fs.writeFileSync(path.join(fixture.root, 'mobingilabs', 'ripple-api', 'src', 'App', 'Handler', 'Reader.php'), fanoutSource);
      const changed = discoverSourceSurfaces({ access, config: fixture.config });
      const changedSurface = changed.surfaces[0]!;
      expect(changedSurface.contract.responseFlow?.rejectionCode).toBe('RESPONSE_FLOW_DECLARATIONS_EXCEEDED');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('does not count a repeated exact dependency twice against the declaration bound', () => {
    const uniqueHelpers = MAX_RESPONSE_FLOW_DECLARATIONS - 1;
    const calls = [...Array.from({ length: uniqueHelpers }, (_, index) => index), 0].map((index) => `    return $this->helper${index}();`).join('\n');
    const helpers = Array.from({ length: uniqueHelpers }, (_, index) => `  private function helper${index}() { return ['id' => 1]; }`).join('\n');
    const fixture = discover(`<?php\nclass Reader {\n  public function read() {\n${calls}\n  }\n${helpers}\n}\n`);
    try {
      expect(fixture.discovery.surfaces[0]?.contract.responseFlow?.status).toBe('PROVEN');
      expect(fixture.discovery.surfaces[0]?.contract.responseFlow?.declarations).toHaveLength(MAX_RESPONSE_FLOW_DECLARATIONS);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('rejects a bounded source-file budget before indexing declarations', () => {
    const largeComment = 'x'.repeat(MAX_RESPONSE_FLOW_SOURCE_BYTES + 1);
    const fixture = discover(`<?php /*${largeComment}*/ class Reader { public function read() { return ['id' => 1]; } }`, { maxFileBytes: MAX_RESPONSE_FLOW_SOURCE_BYTES + 10_000 });
    try {
      const surface = fixture.discovery.surfaces[0]!;
      expect(surface.contract.responseFlow?.rejectionCode).toBe('RESPONSE_SOURCE_BUDGET_EXCEEDED');
      expect(surface.contract.responseProof).toBe('PROVEN');
      expect(JSON.stringify(fixture.discovery)).not.toContain(largeComment);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('rejects a bounded return-site population before classifying every branch', () => {
    const branchCount = MAX_RESPONSE_FLOW_RETURN_SITES + 1;
    const returns = Array.from({ length: branchCount }, (_, index) => `    return $this->helper${index}();`).join('\n');
    const helpers = Array.from({ length: branchCount }, (_, index) => `  private function helper${index}() { return ['id' => ${index}]; }`).join('\n');
    const fixture = discover(`<?php\nclass Reader {\n  public function read() {\n${returns}\n  }\n${helpers}\n}\n`);
    try {
      expect(fixture.discovery.surfaces[0]?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_BRANCH_BUDGET_EXCEEDED');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('rejects a bounded declaration index before retaining an oversized symbol universe', () => {
    const declarationCount = MAX_RESPONSE_FLOW_INDEX_DECLARATIONS + 1;
    const declarations = Array.from({ length: declarationCount }, (_, index) => `  private function helper${index}() { return ['id' => ${index}]; }`).join('\n');
    const fixture = discover(`<?php\nclass Reader {\n  public function read() { return ['id' => 1]; }\n${declarations}\n}\n`, { maxFileBytes: MAX_RESPONSE_FLOW_SOURCE_BYTES });
    try {
      expect(fixture.discovery.surfaces[0]?.contract.responseFlow?.rejectionCode).toBe('RESPONSE_DECLARATION_INDEX_BUDGET_EXCEEDED');
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('enforces the tokenizer source bound before scanning pathological input', () => {
    expect(() => tokenizePhp('x'.repeat(MAX_PHP_SOURCE_CHARS + 1))).toThrow('PHP_LEX:source-limit');
  });
});
