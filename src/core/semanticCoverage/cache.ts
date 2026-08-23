// Phase 20 — bounded source-keyed caches for pure semantic inventory/graph
// construction. The cache stores only sanitized DTOs in memory; source text
// contributes to a digest key and is never retained by this module.

import { sha256Hex } from "../identity/canonicalDigest";
import { safeSemanticDigest, type ContractDiscoveryInventory, type ContractGraph } from "./types";
import { discoverContractInventory } from "./discovery";
import type { SourceAnalyzerArtifact } from "./sourceAnalyzers";
import { buildContractGraph, type ContractGraphInput } from "./graph";

export const SEMANTIC_CACHE_VERSION = "nightwatch.semantic-coverage-cache.v1" as const;
const MAX_ENTRIES = 16;

const inventoryCache = new Map<string, ContractDiscoveryInventory>();
const graphCache = new Map<string, ContractGraph>();
let inventoryBuilds = 0;
let graphBuilds = 0;

function boundedInsert<T>(cache: Map<string, T>, key: string, value: T): void {
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}
function sourceKey(input: {
  readonly artifacts: readonly SourceAnalyzerArtifact[];
  readonly currentSnapshots?: Readonly<Record<string, string>>;
}): string {
  const artifacts = [...input.artifacts].map((artifact) => ({
    artifactId: artifact.artifactId,
    language: artifact.language,
    repoId: artifact.repoId,
    sha: artifact.sha,
    relativePath: artifact.relativePath,
    symbol: artifact.symbol ?? null,
    observationSurfaces: [...artifact.observationSurfaces].sort(),
    hints: artifact.hints ?? [],
    sourceTextDigest: `sha256:${sha256Hex(artifact.sourceText).slice(0, 24)}`,
  })).sort((left, right) => left.artifactId.localeCompare(right.artifactId));
  const snapshots = Object.fromEntries(Object.entries(input.currentSnapshots ?? {}).sort(([left], [right]) => left.localeCompare(right)));
  return safeSemanticDigest({ schemaVersion: SEMANTIC_CACHE_VERSION, kind: "source", artifacts, snapshots }, "semantic-cache");
}

export interface SemanticCacheResult<T> {
  readonly value: T;
  readonly cacheHit: boolean;
  readonly inputDigest: string;
}

export function discoverContractInventoryCached(input: {
  readonly artifacts: readonly SourceAnalyzerArtifact[];
  readonly currentSnapshots?: Readonly<Record<string, string>>;
}): SemanticCacheResult<ContractDiscoveryInventory> {
  const inputDigest = sourceKey(input);
  const cached = inventoryCache.get(inputDigest);
  if (cached !== undefined) return { value: cached, cacheHit: true, inputDigest };
  const value = discoverContractInventory(input);
  inventoryBuilds += 1;
  boundedInsert(inventoryCache, inputDigest, value);
  return { value, cacheHit: false, inputDigest };
}

export function buildContractGraphCached(input: ContractGraphInput): SemanticCacheResult<ContractGraph> {
  const inputDigest = safeSemanticDigest({
    schemaVersion: SEMANTIC_CACHE_VERSION,
    kind: "graph",
    inventoryDigest: input.inventory.deterministicDigest,
    expectations: input.expectations ?? [],
    projections: input.projections ?? [],
    scenarios: input.scenarios ?? [],
    oracles: input.oracles ?? [],
    replays: input.replays ?? [],
    minimizers: input.minimizers ?? [],
    dossiers: input.dossiers ?? [],
    differentials: input.differentials ?? [],
  }, "semantic-cache");
  const cached = graphCache.get(inputDigest);
  if (cached !== undefined) return { value: cached, cacheHit: true, inputDigest };
  const value = buildContractGraph(input);
  graphBuilds += 1;
  boundedInsert(graphCache, inputDigest, value);
  return { value, cacheHit: false, inputDigest };
}

export function semanticCacheStats(): {
  readonly inventoryBuilds: number;
  readonly graphBuilds: number;
  readonly inventoryEntries: number;
  readonly graphEntries: number;
} {
  return { inventoryBuilds, graphBuilds, inventoryEntries: inventoryCache.size, graphEntries: graphCache.size };
}

export function clearSemanticCoverageCaches(): void {
  inventoryCache.clear();
  graphCache.clear();
  inventoryBuilds = 0;
  graphBuilds = 0;
}
