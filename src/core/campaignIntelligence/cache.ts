// Phase 19 — bounded deterministic in-process caches for repeated pure graph
// construction. Keys include the complete sanitized input, so source drift
// or coverage changes cannot reuse an old report.

import { buildCampaignCoverageReport } from "./coverage";
import { buildCampaignImpactReport } from "./impact";
import type { CampaignCoverageFact, CampaignCoverageReport, CampaignImpactBinding, CampaignImpactReport, CampaignSourceCurrentness } from "./types";
import type { ChangedFile, SelectionResult } from "../changeIntelligence";
import { safeCampaignDigest } from "./types";

export const CAMPAIGN_CACHE_VERSION = "nightwatch.campaign-cache.v1" as const;
const MAX_ENTRIES = 32;

const coverageCache = new Map<string, CampaignCoverageReport>();
const impactCache = new Map<string, CampaignImpactReport>();
let coverageBuilds = 0;
let impactBuilds = 0;

function boundedInsert<T>(cache: Map<string, T>, key: string, value: T): void {
  cache.set(key, value);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export interface CampaignCacheResult<T> {
  readonly value: T;
  readonly cacheHit: boolean;
  readonly inputDigest: string;
}

export function buildCampaignCoverageReportCached(input: { readonly facts: readonly CampaignCoverageFact[] }): CampaignCacheResult<CampaignCoverageReport> {
  const inputDigest = safeCampaignDigest({ version: CAMPAIGN_CACHE_VERSION, kind: "coverage", input }, "cache-input");
  const cached = coverageCache.get(inputDigest);
  if (cached !== undefined) return { value: cached, cacheHit: true, inputDigest };
  const value = buildCampaignCoverageReport(input);
  coverageBuilds += 1;
  boundedInsert(coverageCache, inputDigest, value);
  return { value, cacheHit: false, inputDigest };
}

export function buildCampaignImpactReportCached(input: {
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly changedFiles: readonly Pick<ChangedFile, "repoId" | "path" | "status">[];
  readonly bindings: readonly CampaignImpactBinding[];
  readonly knownExpectationIds?: readonly string[];
  readonly selection?: Pick<SelectionResult, "selectedJourneys" | "impactReasons" | "deterministicDigest"> | null;
}): CampaignCacheResult<CampaignImpactReport> {
  const inputDigest = safeCampaignDigest({ version: CAMPAIGN_CACHE_VERSION, kind: "impact", input }, "cache-input");
  const cached = impactCache.get(inputDigest);
  if (cached !== undefined) return { value: cached, cacheHit: true, inputDigest };
  const value = buildCampaignImpactReport(input);
  impactBuilds += 1;
  boundedInsert(impactCache, inputDigest, value);
  return { value, cacheHit: false, inputDigest };
}

export function campaignCacheStats(): { readonly coverageBuilds: number; readonly impactBuilds: number; readonly coverageEntries: number; readonly impactEntries: number } {
  return { coverageBuilds, impactBuilds, coverageEntries: coverageCache.size, impactEntries: impactCache.size };
}

export function clearCampaignIntelligenceCaches(): void {
  coverageCache.clear();
  impactCache.clear();
  coverageBuilds = 0;
  impactBuilds = 0;
}
