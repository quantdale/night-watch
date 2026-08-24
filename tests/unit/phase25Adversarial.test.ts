import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig } from '../../src/core/source/scan';
import { createRealSourceSurfaceCache } from '../../src/core/source/cache';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';

const SOURCE_SHA = '27bb007ad0c798800b6bd3b29760c966422966e7';

function fixture(): { readonly root: string; readonly repo: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase25-adversarial-'));
  const repo = path.join(root, 'mobingilabs', 'ripple-api');
  const git = path.join(repo, '.git');
  fs.mkdirSync(path.join(git, 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'refs', 'heads', 'main'), `${SOURCE_SHA}\n`);
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'src', 'routes.ts'), [
    "router.get('/client', readHandler);",
    "router.get('/dynamic/' + id, dynamicHandler);",
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'routes2.ts'), "router.get('/duplicate', firstHandler);\n");
  fs.writeFileSync(path.join(repo, 'src', 'routes3.ts'), "router.get('/duplicate', secondHandler);\n");
  fs.writeFileSync(path.join(repo, 'src', 'routes.go'), 'r.GET("/go", goHandler)\n');
  fs.writeFileSync(path.join(repo, 'src', 'openapi.json'), JSON.stringify({ paths: { '/schema': { get: { operationId: 'schemaRead' } } } }));
  fs.writeFileSync(path.join(repo, 'src', 'routes.yaml'), [
    '"get:/yaml":',
    '  client: App\\Handler\\Missing',
    '  method: missing',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(repo, 'src', 'privacy.ts'), 'const value = "CUSTOMER_SENTINEL";\n');
  fs.writeFileSync(path.join(repo, 'src', 'unknown.txt'), 'unsupported extension\n');
  return { root, repo };
}

function scanConfig(namespace = 'ripple') {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: namespace,
    approvedRepositories: [{ repoId: 'mobingilabs/ripple-api', expectedSourceSha: SOURCE_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.php', '.ts', '.go', '.json', '.yaml'], maxFiles: 64, maxFileBytes: 64_000, maxTotalBytes: 1_000_000 }],
  });
}

test.describe('Phase 25 adversarial source-surface corpus and cache', () => {
  test('keeps route families, ambiguity, unsupported syntax, privacy, and unsupported files explicit', () => {
    const { root } = fixture();
    try {
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: scanConfig() });
      const routes = discovery.operations.map((operation) => `${operation.method} ${operation.routeTemplate}`);
      expect(routes).toEqual(expect.arrayContaining(['GET /client', 'GET /duplicate', 'GET /go', 'GET /schema', 'GET /yaml']));
      expect(routes.some((route) => route.includes('dynamic'))).toBe(false);
      expect(discovery.counters.ambiguousRoutes).toBe(2);
      expect(discovery.surfaces.filter((surface) => surface.operation.routeTemplate === '/duplicate').every((surface) => surface.exclusionReasons.includes('ROUTE_AMBIGUOUS'))).toBe(true);
      expect(discovery.surfaces.find((surface) => surface.operation.routeTemplate === '/yaml')?.exclusionReasons).toContain('HANDLER_UNRESOLVED');
      expect(discovery.inventory.files.find((file) => file.relativePath === 'src/privacy.ts')?.rejectionReason).toBe('SOURCE_PRIVACY_REJECTED');
      expect(discovery.inventory.files.find((file) => file.relativePath === 'src/unknown.txt')?.rejectionReason).toBe('SOURCE_LANGUAGE_UNSUPPORTED');
      expect(JSON.stringify(discovery)).not.toContain('CUSTOMER_SENTINEL');
      expect(JSON.stringify(discovery)).not.toContain('unsupported extension');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('cache keys include content, config, extractor, and analyzer identity with bounded eviction', () => {
    const { root, repo } = fixture();
    try {
      const access = createSiblingSourceAccess(root);
      const cache = createRealSourceSurfaceCache({ maxEntries: 2 });
      const first = discoverSourceSurfaces({ access, config: scanConfig(), cache });
      const second = discoverSourceSurfaces({ access, config: scanConfig(), cache });
      expect(second).toBe(first);
      expect(cache.stats()).toMatchObject({ hits: 1, misses: 1, evictions: 0, entries: 1 });

      fs.appendFileSync(path.join(repo, 'src', 'routes.ts'), '// same SHA, changed inspected content\n');
      const changedContent = discoverSourceSurfaces({ access, config: scanConfig(), cache });
      expect(changedContent).not.toBe(first);
      expect(cache.stats().misses).toBe(2);

      discoverSourceSurfaces({ access, config: scanConfig('ripple.one'), cache });
      discoverSourceSurfaces({ access, config: scanConfig('ripple.two'), cache });
      discoverSourceSurfaces({ access, config: scanConfig('ripple.three'), cache });
      expect(cache.stats().evictions).toBeGreaterThan(0);
      expect(JSON.stringify(changedContent)).not.toContain('same SHA, changed inspected content');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
