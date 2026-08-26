// ---------------------------------------------------------------------------
// Nightwatch Control Center — bounded approved-source authority bridge.
//
// This is the only Control Center authority that composes the Phase 25 source
// scanner. The sibling checkout boundary, scan policy, surface analyzer, and
// Phase 24 bridge retain their existing authority. This module only adds a
// fixed-root, read-only snapshot seam; it never exposes source text, source
// paths, symbols, credentials, runtime values, or execution callbacks.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import { createApprovedRealSourceScanConfig } from '../../core/source/approvedScan';
import { createRealSourceSurfaceCache, type RealSourceSurfaceCache } from '../../core/source/cache';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT, type SiblingSourceAccess } from '../../core/source/siblingSource';
import { analyzeSourceSurfacesIntoPhase24, discoverSourceSurfaces, type SourcePhase24Integration, type SourceSurfaceDiscovery } from '../../core/source/surfaces';
import type { RealSourceScanConfig, SourceScanRepositoryStatus } from '../../core/source/scanTypes';

export const CONTROL_CENTER_SOURCE_AUTHORITY_VERSION = 'nightwatch.control-center-source-authority.v1' as const;

export type SourceAuthorityState = 'AVAILABLE' | 'EMPTY' | 'STALE' | 'UNAVAILABLE' | 'UNKNOWN';

export const SOURCE_AUTHORITY_REASON_CODES = [
  'SOURCE_REPOSITORY_UNAVAILABLE',
  'SOURCE_STALE',
  'SOURCE_INVENTORY_EMPTY',
  'SOURCE_DISCOVERY_EMPTY',
  'SOURCE_DISCOVERY_UNAVAILABLE',
  'PHASE24_ANALYSIS_UNAVAILABLE',
  'SOURCE_AUTHORITY_INTERNAL_ERROR',
] as const;
export type SourceAuthorityReasonCode = (typeof SOURCE_AUTHORITY_REASON_CODES)[number];

export interface SourceAuthorityRepositoryStatus {
  readonly repoId: string;
  readonly currentness: SourceScanRepositoryStatus;
}

/** Internal snapshot: discovery/Phase 24 objects remain before the adapter boundary. */
export interface SourceAuthoritySnapshot {
  readonly schemaVersion: typeof CONTROL_CENTER_SOURCE_AUTHORITY_VERSION;
  readonly state: SourceAuthorityState;
  readonly inventoryDigest: string | null;
  readonly repositoryCount: number;
  readonly repositoryStatuses: readonly SourceAuthorityRepositoryStatus[];
  readonly discovery: SourceSurfaceDiscovery | null;
  readonly phase24: SourcePhase24Integration | null;
  readonly generation: string | null;
  readonly reasonCodes: readonly SourceAuthorityReasonCode[];
}

export interface SourceAuthority {
  readonly snapshot: () => SourceAuthoritySnapshot;
}

interface SourceAuthorityBuildInput {
  readonly access: SiblingSourceAccess;
  readonly config: RealSourceScanConfig;
  readonly cache: RealSourceSurfaceCache;
}

function reasonCodes(values: readonly SourceAuthorityReasonCode[]): readonly SourceAuthorityReasonCode[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stateFor(discovery: SourceSurfaceDiscovery): SourceAuthorityState {
  const statuses = discovery.inventory.repositories.map((repository) => repository.status);
  if (statuses.includes('SOURCE_UNAVAILABLE')) return 'UNAVAILABLE';
  if (statuses.includes('SOURCE_STALE')) return 'STALE';
  if (discovery.inventory.repositories.length === 0) return 'EMPTY';
  if (discovery.surfaces.length === 0) return 'EMPTY';
  return 'AVAILABLE';
}

function reasonsFor(discovery: SourceSurfaceDiscovery, state: SourceAuthorityState): readonly SourceAuthorityReasonCode[] {
  const reasons: SourceAuthorityReasonCode[] = [];
  if (state === 'UNAVAILABLE') reasons.push('SOURCE_REPOSITORY_UNAVAILABLE');
  if (state === 'STALE') reasons.push('SOURCE_STALE');
  if (state === 'EMPTY') {
    reasons.push(discovery.inventory.repositories.length === 0 ? 'SOURCE_INVENTORY_EMPTY' : 'SOURCE_DISCOVERY_EMPTY');
  }
  return reasonCodes(reasons);
}

function generationFor(input: {
  readonly state: SourceAuthorityState;
  readonly inventoryDigest: string | null;
  readonly repositoryStatuses: readonly SourceAuthorityRepositoryStatus[];
  readonly discoveryDigest: string | null;
  readonly phase24Digest: string | null;
  readonly reasonCodes: readonly SourceAuthorityReasonCode[];
}): string {
  return prefixedDigest24('cc-source-generation', {
    schemaVersion: CONTROL_CENTER_SOURCE_AUTHORITY_VERSION,
    state: input.state,
    inventoryDigest: input.inventoryDigest,
    repositoryStatuses: input.repositoryStatuses,
    discoveryDigest: input.discoveryDigest,
    phase24Digest: input.phase24Digest,
    reasonCodes: input.reasonCodes,
  });
}

function unavailableSnapshot(): SourceAuthoritySnapshot {
  const reasonCodes = ['SOURCE_DISCOVERY_UNAVAILABLE'] as const;
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_AUTHORITY_VERSION,
    state: 'UNKNOWN',
    inventoryDigest: null,
    repositoryCount: 0,
    repositoryStatuses: [],
    discovery: null,
    phase24: null,
    generation: null,
    reasonCodes,
  };
}

function buildSnapshot(input: SourceAuthorityBuildInput): SourceAuthoritySnapshot {
  let discovery: SourceSurfaceDiscovery;
  try {
    discovery = discoverSourceSurfaces({ access: input.access, config: input.config, cache: input.cache });
  } catch {
    return unavailableSnapshot();
  }

  const state = stateFor(discovery);
  const inventoryDigest = discovery.inventory.snapshotDigest;
  const repositoryStatuses = discovery.inventory.repositories
    .map((repository) => ({ repoId: repository.repoId, currentness: repository.status }))
    .sort((left, right) => left.repoId.localeCompare(right.repoId));
  const reasons = [...reasonsFor(discovery, state)];
  let phase24: SourcePhase24Integration | null = null;
  try {
    phase24 = analyzeSourceSurfacesIntoPhase24({
      access: input.access,
      config: input.config,
      discovery,
      maxCandidates: 6,
    });
  } catch {
    reasons.push('PHASE24_ANALYSIS_UNAVAILABLE');
  }
  const normalizedReasons = reasonCodes(reasons);
  return {
    schemaVersion: CONTROL_CENTER_SOURCE_AUTHORITY_VERSION,
    state,
    inventoryDigest,
    repositoryCount: discovery.inventory.repositories.length,
    repositoryStatuses,
    discovery,
    phase24,
    generation: generationFor({
      state,
      inventoryDigest,
      repositoryStatuses,
      discoveryDigest: discovery.deterministicDigest,
      phase24Digest: phase24?.deterministicDigest ?? null,
      reasonCodes: normalizedReasons,
    }),
    reasonCodes: normalizedReasons,
  };
}

/** Create the normal fixed-root source authority. */
export function createSourceAuthority(): SourceAuthority {
  const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
  const config = createApprovedRealSourceScanConfig();
  const cache = createRealSourceSurfaceCache({ maxEntries: 8 });
  return { snapshot: () => buildSnapshot({ access, config, cache }) };
}

/** Test-only in-process seam for synthetic authority fixtures. */
export function createSourceAuthorityForTests(
  value: SourceAuthoritySnapshot | (() => SourceAuthoritySnapshot),
): SourceAuthority {
  return {
    snapshot: () => typeof value === 'function' ? value() : value,
  };
}
