// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — bounded extraction-result cache.
//
// The cache stores only sanitized discovery DTOs. Its key includes both the
// reported Git identity and the actual bounded inventory identity, so a dirty
// same-SHA source snapshot cannot reuse an older extraction.
// ---------------------------------------------------------------------------

import { analyzerSetIdentity } from '../semanticCoverage/sourceAnalyzers';
import { safeSemanticDigest } from '../semanticCoverage/types';
import type { RealSourceScanConfig, RealSourceSnapshotInventory } from './scanTypes';
import type { SourceSurfaceDiscovery } from './surfaces';

export const REAL_SOURCE_SURFACE_CACHE_VERSION = 'nightwatch.real-source-surface-cache.v1' as const;
const DEFAULT_MAX_ENTRIES = 8;

export interface SourceSurfaceCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly entries: number;
}

export interface RealSourceSurfaceCache {
  readonly get: (key: string) => SourceSurfaceDiscovery | undefined;
  readonly put: (key: string, value: SourceSurfaceDiscovery) => void;
  readonly stats: () => SourceSurfaceCacheStats;
  readonly clear: () => void;
}

/** Build the correctness key after the bounded inventory has been produced. */
export function sourceSurfaceCacheKey(input: { readonly config: RealSourceScanConfig; readonly inventory: RealSourceSnapshotInventory }): string {
  const repositories = input.inventory.repositories.map((repository) => ({ repoId: repository.repoId, sourceSha: repository.sourceSha, status: repository.status })).sort((left, right) => left.repoId.localeCompare(right.repoId));
  return safeSemanticDigest({
    schemaVersion: REAL_SOURCE_SURFACE_CACHE_VERSION,
    repositories,
    snapshotDigest: input.inventory.snapshotDigest,
    configDigest: input.config.configDigest,
    extractorVersion: input.config.extractorVersion,
    analyzerSetVersion: analyzerSetIdentity(),
    enabledAnalyzers: [...input.config.enabledAnalyzers].sort(),
  }, 'source-surface-cache');
}

export function createRealSourceSurfaceCache(input: { readonly maxEntries?: number } = {}): RealSourceSurfaceCache {
  const maxEntries = input.maxEntries ?? DEFAULT_MAX_ENTRIES;
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 32) throw new Error('REAL_SOURCE_CACHE_BOUND');
  const entries = new Map<string, SourceSurfaceDiscovery>();
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  return {
    get(key) {
      const value = entries.get(key);
      if (value === undefined) {
        misses += 1;
        return undefined;
      }
      // Deterministic bounded LRU: a hit becomes the newest entry.
      entries.delete(key);
      entries.set(key, value);
      hits += 1;
      return value;
    },
    put(key, value) {
      entries.delete(key);
      entries.set(key, value);
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        entries.delete(oldest);
        evictions += 1;
      }
    },
    stats() {
      return { hits, misses, evictions, entries: entries.size };
    },
    clear() {
      entries.clear();
      hits = 0;
      misses = 0;
      evictions = 0;
    },
  };
}
