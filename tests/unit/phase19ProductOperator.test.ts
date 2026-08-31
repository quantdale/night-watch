import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { adapterFromProductConfig, PRODUCT_ADAPTER_VERSION, PRODUCT_ADAPTERS, validateProductAdapter } from "../../src/products";
import { PHASE19_SYNTHETIC_LEDGER_ADAPTER } from "../../corpus/phase19/productFixtures";
import { PHASE19_CAMPAIGN_CASES } from "../../corpus/phase19/campaignMatrix";
import { buildCampaignCoverageReportCached, campaignCacheStats, clearCampaignIntelligenceCaches } from "../../src/core/campaignIntelligence/cache";

const ROOT = process.cwd();

const FACT = {
  memberId: "phase19.cache.member",
  product: "synthetic-preview",
  surface: "summary",
  semanticContractId: "contract.cache.v1",
  expectationId: "expectation.cache.v1",
  sourceCurrentness: "SYNTHETIC_ONLY" as const,
  sourceSurfaceExists: true,
  sourceMechanicallyUnderstood: true,
  semanticContractAdmitted: true,
  syntheticDetectionProven: true,
  scenarioExercisesContract: true,
  replayAvailable: true,
  replayReproduces: true,
  minimizationSupported: true,
  triageClassifiable: true,
  dossierExplainable: true,
  unsupported: false,
  reasons: [] as const,
};

test.describe("Phase 19 product abstraction and operator surfaces", () => {
  test("generic adapters preserve read-only contracts without registering a fake real product", () => {
    validateProductAdapter(PRODUCT_ADAPTERS.ripple);
    validateProductAdapter(PHASE19_SYNTHETIC_LEDGER_ADAPTER);
    expect(PRODUCT_ADAPTERS.ripple.adapterVersion).toBe(PRODUCT_ADAPTER_VERSION);
    expect(PHASE19_SYNTHETIC_LEDGER_ADAPTER.syntheticFixtureOnly).toBe(true);
    expect(PHASE19_SYNTHETIC_LEDGER_ADAPTER.surfaces.map((surface) => surface.surfaceId)).toEqual(["summary", "detail"]);
    expect(Object.keys(PRODUCT_ADAPTERS)).toEqual(["ripple"]);
    expect(() => validateProductAdapter(Object.assign({}, PHASE19_SYNTHETIC_LEDGER_ADAPTER, { readOnlyOnly: false }) as unknown as typeof PHASE19_SYNTHETIC_LEDGER_ADAPTER)).toThrow("READ_ONLY_ONLY");
  });

  test("the adversarial corpus is data-driven, broad, and privacy-safe", () => {
    expect(PHASE19_CAMPAIGN_CASES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(PHASE19_CAMPAIGN_CASES.map((entry) => entry.caseId)).size).toBe(PHASE19_CAMPAIGN_CASES.length);
    expect(new Set(PHASE19_CAMPAIGN_CASES.map((entry) => entry.family))).toEqual(new Set(["SEMANTIC", "PROTOCOL", "REPLAY", "MINIMIZATION", "COVERAGE", "CLUSTER", "AUTHORITY", "PRIVACY", "BENIGN"]));
    expect(PHASE19_CAMPAIGN_CASES.every((entry) => entry.privacySafe && !entry.caseId.includes("CUSTOMER_SENTINEL"))).toBe(true);
    expect(PHASE19_CAMPAIGN_CASES.filter((entry) => entry.benignControl)).toHaveLength(1);
  });

  test("coverage graph cache reuses only identical sanitized inputs", () => {
    clearCampaignIntelligenceCaches();
    const first = buildCampaignCoverageReportCached({ facts: [FACT] });
    const second = buildCampaignCoverageReportCached({ facts: [{ ...FACT }] });
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.value).toEqual(first.value);
    expect(campaignCacheStats().coverageBuilds).toBe(1);
    const changed = buildCampaignCoverageReportCached({ facts: [{ ...FACT, sourceCurrentness: "STALE" }] });
    expect(changed.cacheHit).toBe(false);
    expect(campaignCacheStats().coverageBuilds).toBe(2);
  });

  test("operator commands are local, bounded, and do not require an environment", () => {
    const output = execFileSync(process.execPath, [path.join(ROOT, "bin/nightwatch.mjs"), "plan", "--json"], { cwd: ROOT, encoding: "utf8", timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
    const parsed = JSON.parse(output) as { scope: string; plan: { schemaVersion: string; ownerScopeStatus: string } };
    expect(parsed.scope).toBe("LOCAL_SYNTHETIC_ONLY");
    expect(parsed.plan.schemaVersion).toBe("nightwatch.campaign-plan.v2");
    expect(parsed.plan.ownerScopeStatus).toBe("FROZEN_BY_OWNER");
  });
});
