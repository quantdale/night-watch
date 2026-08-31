import { expect, test } from '@playwright/test';
import { createRealSourceSurfaceCache, sourceSurfaceCacheKey } from '../../src/core/source/cache';
import { sourceSurfaceAnalyzerSetIdentity } from '../../src/core/semanticCoverage/sourceAnalyzers';
import { safeSemanticDigest } from '../../src/core/semanticCoverage/types';
import type { RealSourceScanConfig, RealSourceSnapshotInventory } from '../../src/core/source/scanTypes';
import type { SourceSurfaceDiscovery } from '../../src/core/source/surfaces';
import { REAL_SOURCE_GAP_TAXONOMY_VERSION } from '../../src/core/source/gapTaxonomy';

function fakeDiscovery(id: string): SourceSurfaceDiscovery {
  return {
    schemaVersion: 'nightwatch.source-surface-discovery.v1',
    snapshotDigest: `srcsnapshot:sha256:${id.padEnd(64, '0')}`,
    configDigest: `srcconfig:sha256:${'a'.repeat(64)}`,
    extractorVersion: 'nightwatch.real-source-scan-extractor.v1',
    surfaces: [],
    counters: {
      routeFilesConsidered: 0,
      routeOperationsFound: 0,
      routeOperationsTruncated: 0,
      routeProofs: 0,
      ambiguousRoutes: 0,
      mutationCapableOperations: 0,
      readOnlyProvenOperations: 0,
      requestContracts: 0,
      responseContracts: 0,
      semanticContracts: 0,
      joinsAttempted: 0,
      joinsProven: 0,
      joinsRejected: 0,
      responseFlowAttempts: 0,
      responseFlowProven: 0,
      responseFlowRejected: 0,
      responseFlowResolvedCalls: 0,
      responseFlowDependencyDeclarations: 0,
      responseFlowDependencyEdges: 0,
      responseFlowMaxDepth: 0,
      analyzerInvocations: 0,
      responseProofGapCounts: [],
      semanticProofGapCounts: [],
      responseAnalyzerCounts: [],
    },
    deterministicDigest: `source-surface-discovery:sha256:${id.padEnd(64, '0')}`,
  } as unknown as SourceSurfaceDiscovery;
}

function baseConfig(): RealSourceScanConfig {
  return {
    configDigest: `srcconfig:sha256:${'a'.repeat(64)}`,
    extractorVersion: 'nightwatch.real-source-scan-extractor.v1',
    enabledAnalyzers: ['PHP_RETURN_ROOT_TYPE'],
    maxFiles: 4096,
    maxBytes: 64 * 1024 * 1024,
  } as unknown as RealSourceScanConfig;
}

function baseInventory(snapshotDigest = `srcsnapshot:sha256:${'b'.repeat(64)}`, sourceSha = 'a'.repeat(40)): RealSourceSnapshotInventory {
  return {
    schemaVersion: 'nightwatch.real-source-snapshot-inventory.v1',
    configDigest: `srcconfig:sha256:${'a'.repeat(64)}`,
    extractorVersion: 'nightwatch.real-source-scan-extractor.v1',
    snapshotDigest,
    repositories: [
      {
        repoId: 'mobingilabs/ripple-api',
        sourceSha,
        status: 'CURRENT',
        fileCount: 1,
        admittedFileCount: 1,
        rejectedFileCount: 0,
        bytesInspected: 100,
        rejectionCounts: {} as unknown as Record<string, unknown>,
      },
    ],
    counters: {
      repositoriesConsidered: 1,
      repositoriesInspected: 1,
      directoriesVisited: 1,
      filesConsidered: 1,
      filesRead: 1,
      filesAdmitted: 1,
      filesRejected: 0,
      bytesRead: 100,
      symlinkRejections: 0,
      pathRejections: 0,
      budgetRejections: 0,
    },
  } as unknown as RealSourceSnapshotInventory;
}

test('cache currentness — same SHA unchanged content hits', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  const config = baseConfig();
  const inventory = baseInventory();
  const key = sourceSurfaceCacheKey({ config, inventory });
  const discovery = fakeDiscovery('1111');
  cache.put(key, discovery);
  expect(cache.get(key)).toBe(discovery);
  expect(cache.stats().hits).toBe(1);
});

test('cache currentness — same SHA changed content misses (snapshotDigest changes)', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  const config = baseConfig();
  const inv1 = baseInventory(`srcsnapshot:sha256:${'b'.repeat(64)}`);
  const inv2 = baseInventory(`srcsnapshot:sha256:${'c'.repeat(64)}`);
  const key1 = sourceSurfaceCacheKey({ config, inventory: inv1 });
  const key2 = sourceSurfaceCacheKey({ config, inventory: inv2 });
  expect(key1).not.toBe(key2);
  cache.put(key1, fakeDiscovery('1111'));
  expect(cache.get(key2)).toBeUndefined();
  expect(cache.stats().misses).toBe(1);
});

test('cache currentness — changed SHA same content misses (sourceSha in key)', () => {
  const config = baseConfig();
  const inv1 = baseInventory(undefined, 'a'.repeat(40));
  const inv2 = baseInventory(undefined, 'b'.repeat(40));
  const k1 = sourceSurfaceCacheKey({ config, inventory: inv1 });
  const k2 = sourceSurfaceCacheKey({ config, inventory: inv2 });
  expect(k1).not.toBe(k2);
});

test('cache currentness — dependency change (configDigest) misses', () => {
  const inv = baseInventory();
  const c1 = { ...baseConfig(), configDigest: `srcconfig:sha256:${'a'.repeat(64)}` } as unknown as RealSourceScanConfig;
  const c2 = { ...baseConfig(), configDigest: `srcconfig:sha256:${'d'.repeat(64)}` } as unknown as RealSourceScanConfig;
  expect(sourceSurfaceCacheKey({ config: c1, inventory: inv })).not.toBe(sourceSurfaceCacheKey({ config: c2, inventory: inv }));
});

function expectedKey(config: RealSourceScanConfig, inventory: RealSourceSnapshotInventory, overrides: { analyzerSetVersion?: string; gapTaxonomyVersion?: string } = {}): string {
  const repositories = inventory.repositories.map((repository) => ({ repoId: repository.repoId, sourceSha: repository.sourceSha, status: repository.status })).sort((left, right) => left.repoId.localeCompare(right.repoId));
  return safeSemanticDigest({
    schemaVersion: 'nightwatch.real-source-surface-cache.v1',
    repositories,
    snapshotDigest: inventory.snapshotDigest,
    configDigest: config.configDigest,
    extractorVersion: config.extractorVersion,
    analyzerSetVersion: overrides.analyzerSetVersion ?? sourceSurfaceAnalyzerSetIdentity(),
    gapTaxonomyVersion: overrides.gapTaxonomyVersion ?? REAL_SOURCE_GAP_TAXONOMY_VERSION,
    enabledAnalyzers: [...config.enabledAnalyzers].sort(),
  }, 'source-surface-cache');
}

test('cache currentness — authoritative analyzer identity change misses', () => {
  const config = baseConfig();
  const inventory = baseInventory();
  const actual = sourceSurfaceCacheKey({ config, inventory });
  expect(actual).toBe(expectedKey(config, inventory));
  const changedAnalyzer = expectedKey(config, inventory, { analyzerSetVersion: 'ev:sha256:000000000000000000000099' });
  expect(changedAnalyzer).not.toBe(actual);
});

test('cache currentness — authoritative taxonomy version change misses', () => {
  const config = baseConfig();
  const inventory = baseInventory();
  const actual = sourceSurfaceCacheKey({ config, inventory });
  expect(actual).toBe(expectedKey(config, inventory));
  const changedTaxonomy = expectedKey(config, inventory, { gapTaxonomyVersion: 'nightwatch.real-source-gap-taxonomy.v999' });
  expect(changedTaxonomy).not.toBe(actual);
});

test('cache currentness — clearing an in-memory cache discards an entry', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  const key = sourceSurfaceCacheKey({ config: baseConfig(), inventory: baseInventory() });
  cache.put(key, fakeDiscovery('1111'));
  cache.clear();
  expect(cache.get(key)).toBeUndefined();
  expect(cache.stats().entries).toBe(0);
});

test('cache currentness — malformed key never hits (empty string)', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  cache.put('valid-key', fakeDiscovery('1111'));
  expect(cache.get('')).toBeUndefined();
  expect(cache.get('different-key')).toBeUndefined();
});

test('cache currentness — bounded LRU eviction never exceeds its entry limit', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 2 });
  const c = baseConfig();
  const inv1 = baseInventory(`srcsnapshot:sha256:${'1'.repeat(64)}`);
  const inv2 = baseInventory(`srcsnapshot:sha256:${'2'.repeat(64)}`);
  const inv3 = baseInventory(`srcsnapshot:sha256:${'3'.repeat(64)}`);
  const k1 = sourceSurfaceCacheKey({ config: c, inventory: inv1 });
  const k2 = sourceSurfaceCacheKey({ config: c, inventory: inv2 });
  const k3 = sourceSurfaceCacheKey({ config: c, inventory: inv3 });
  cache.put(k1, fakeDiscovery('1111'));
  cache.put(k2, fakeDiscovery('2222'));
  cache.put(k3, fakeDiscovery('3333'));
  expect(cache.stats().entries).toBe(2);
  expect(cache.stats().evictions).toBe(1);
  expect(cache.get(k1)).toBeUndefined(); // oldest evicted
  expect(cache.get(k2)).toBeDefined();
});

test('cache currentness — duplicate key overwrites deterministically (LWW)', () => {
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  const key = sourceSurfaceCacheKey({ config: baseConfig(), inventory: baseInventory() });
  cache.put(key, fakeDiscovery('1111'));
  cache.put(key, fakeDiscovery('2222'));
  expect(cache.get(key)?.deterministicDigest).toBe(fakeDiscovery('2222').deterministicDigest);
  expect(cache.stats().entries).toBe(1);
});

test('cache currentness — stale read after restart (new cache) misses', () => {
  const c = baseConfig();
  const inv = baseInventory();
  const key = sourceSurfaceCacheKey({ config: c, inventory: inv });
  const cache1 = createRealSourceSurfaceCache({ maxEntries: 8 });
  cache1.put(key, fakeDiscovery('1111'));
  const cache2 = createRealSourceSurfaceCache({ maxEntries: 8 }); // new instance simulates restart
  expect(cache2.get(key)).toBeUndefined();
});

test('cache currentness — deterministic key for same inputs (permutation stability)', () => {
  const c1 = baseConfig();
  const c2 = { ...c1, enabledAnalyzers: [...c1.enabledAnalyzers].sort().reverse() } as unknown as RealSourceScanConfig;
  const inv = baseInventory();
  // enabledAnalyzers sorted inside key, so reverse order still same key
  expect(sourceSurfaceCacheKey({ config: c1, inventory: inv })).toBe(sourceSurfaceCacheKey({ config: c2, inventory: inv }));
});
