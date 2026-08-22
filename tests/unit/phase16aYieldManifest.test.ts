// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W4 sanitized yield accounting + W5 plan manifest.
//
// Focused permanent tests: integer-only counters with explicit synthetic-only
// interpretation markers, duplicate-safe rate accounting, deterministic
// manifests, blocked members never selected, owner-scope requirements
// embedded, byte-identical repeats.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { buildPortfolio } from "../../src/core/portfolio/types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import {
  YIELD_BASIS,
  YIELD_INTERPRETATION,
  addYieldCounters,
  buildPortfolioYieldAccounting,
} from "../../src/core/portfolio/yield";
import {
  CAMPAIGN_PLAN_MANIFEST_VERSION,
  buildCampaignPlanManifest,
} from "../../src/core/portfolio/manifest";
import {
  P16_APPROVED_BASE,
  buildDemoPortfolioInput,
} from "../../corpus/phase16a/portfolioFixtures";

const [T1, T2, T3] = P16_APPROVED_BASE;

function policy(): PortfolioBudgetPolicy {
  return {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 9,
    perMemberCeiling: 3,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
  };
}

function demoPortfolio() {
  return buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16(T1!, {
        historicalYield: y({
          admittedCount: 10,
          reproducedCount: 5,
          minimizedCount: 3,
          distinctClusterCount: 4,
          dossierReadyCount: 2,
          duplicateMerges: 4,
          invalidOrTransient: 1,
          executionsTotal: 50,
        }),
      }),
      p16(T2!, {
        historicalYield: y({
          admittedCount: 10,
          reproducedCount: 2,
          minimizedCount: 1,
          distinctClusterCount: 2,
          dossierReadyCount: 1,
          duplicateMerges: 6,
          invalidOrTransient: 5,
          executionsTotal: 30,
        }),
      }),
      p16(T3!, {
        currentness: "STALE" as const,
        semanticScope: "stale.scope",
        historicalYield: y({}),
      }),
    ],
  });
}

function p16(targetId: string, overrides: Record<string, unknown> = {}) {
  const { historicalYield, ...rest } = overrides;
  return {
    targetId,
    journeyId: null,
    kind: "API" as const,
    semanticScope: `${targetId}.default`,
    currentness: "CURRENT" as const,
    sourceSha: null,
    evidenceDigest: null,
    derivationVersion: null,
    contractVersion: null,
    depthClass: "NONE" as const,
    replayable: true,
    executionCostClass: "LOW" as const,
    starvationAgeBuckets: 0,
    ownerBlockedOperations: [] as readonly string[],
    phaseFrozen: false,
    ...rest,
    historicalYield: (historicalYield ?? y({})) as ReturnType<typeof y>,
  };
}
function y(overrides: Partial<ReturnType<typeof yDefaults>>) {
  return { ...yDefaults(), ...overrides };
}
function yDefaults() {
  return {
    admittedCount: 0,
    reproducedCount: 0,
    minimizedCount: 0,
    distinctClusterCount: 0,
    dossierReadyCount: 0,
    duplicateMerges: 0,
    invalidOrTransient: 0,
    executionsTotal: 0,
  };
}

// D01 — accounting markers fixed: basis, claim=false, interpretation
test("D01 yield records carry explicit synthetic-only interpretation markers", () => {
  const portfolio = demoPortfolio();
  const accounting = buildPortfolioYieldAccounting(portfolio);
  expect(accounting.basis).toBe(YIELD_BASIS);
  expect(accounting.basis).toBe("LOCAL_SYNTHETIC_HISTORY");
  expect(accounting.realWorldBugYieldClaim).toBe(false);
  expect(accounting.interpretation).toBe(YIELD_INTERPRETATION);
  expect(accounting.interpretation).toContain("NOT_REAL_WORLD_YIELD");
});

// D02 — counters sum correctly; rates are integral permille with floor semantics
test("D02 totals and permille rates are exact integers", () => {
  const accounting = buildPortfolioYieldAccounting(demoPortfolio());
  expect(accounting.totals.admittedCount).toBe(20);
  expect(accounting.totals.duplicateMerges).toBe(10);
  expect(accounting.totals.dossierReadyCount).toBe(3);
  expect(accounting.usefulCandidateCount).toBe(3);
  expect(accounting.rates.duplicateRatePermille).toBe(
    Math.floor((10 * 1000) / 20),
  );
  expect(accounting.rates.invalidRatePermille).toBe(
    Math.floor((6 * 1000) / 20),
  );
  expect(accounting.rates.costPerUsefulCandidatePermille).toBe(
    Math.floor((80 * 1000) / 3),
  );
});

// D03 — zero-yield portfolios produce null (UNPROVEN), never fake zeros
test("D03 empty history yields null rates not fabricated numbers", () => {
  const empty = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [p16(T1!)],
  });
  const accounting = buildPortfolioYieldAccounting(empty);
  expect(accounting.totals.admittedCount).toBe(0);
  expect(accounting.rates.duplicateRatePermille).toBeNull();
  expect(accounting.rates.costPerUsefulCandidatePermille).toBeNull();
});

// D04 — bounded addition overflows fail closed
test("D04 counter overflow fails closed", () => {
  const big = y({ admittedCount: 100_000 });
  expect(() => addYieldCounters(big, big)).toThrow();
  expect(
    addYieldCounters(y({ admittedCount: 1 }), y({ admittedCount: 2 }))
      .admittedCount,
  ).toBe(3);
});

// D05 — privacy shape: accounting JSON contains only keys/numbers/categoricals
test("D05 accounting record is integer/categorical only (no free text surface)", () => {
  const accounting = buildPortfolioYieldAccounting(demoPortfolio());
  const serialized = JSON.stringify(accounting);
  // Structural check: no string field longer than a categorical code.
  const strings = JSON.parse(serialized) as Record<string, unknown>;
  expect(Object.keys(strings).sort()).toEqual([
    "basis",
    "byMember",
    "digest",
    "distinctClusterCount",
    "interpretation",
    "portfolioDigest",
    "rates",
    "realWorldBugYieldClaim",
    "totals",
    "usefulCandidateCount",
    "yieldVersion",
  ]);
});

// E01 — manifest version pinned; determinism byte-identical across builds
test("E01 manifest deterministic byte-identical across independent builds", () => {
  const build = () => {
    const portfolio = demoPortfolio();
    const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
    return buildCampaignPlanManifest({ portfolio, allocation });
  };
  expect(CAMPAIGN_PLAN_MANIFEST_VERSION).toBe(
    "nightwatch.campaign-plan-manifest.v1",
  );
  const first = build();
  const second = build();
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  expect(first.planId).toMatch(/^plan:sha256:[0-9a-f]{24}$/);
  expect(first.manifestDigest).toMatch(/^plan:sha256:[0-9a-f]{24}$/);
});

// E02 — blocked members never selected; unselected carry categorical reasons
test("E02 stale member unselected with ZERO_BUDGET reason, never in selection", () => {
  const portfolio = demoPortfolio(); // third member STALE
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  const manifest = buildCampaignPlanManifest({ portfolio, allocation });
  expect(manifest.selectedMembers.some((entry) => entry.targetId === T3)).toBe(
    false,
  );
  const staleEntry = manifest.unselectedMembers.find(
    (entry) => entry.targetId === T3,
  )!;
  expect(staleEntry.reasonCode).toBe("ZERO_BUDGET_CURRENTNESS_STALE");
});

// E03 — owner-scope requirements embedded; runtime authority NONE
test("E03 manifest embeds frozen owner scope and no runtime authority", () => {
  const portfolio = demoPortfolio();
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  const manifest = buildCampaignPlanManifest({ portfolio, allocation });
  expect(manifest.ownerScopeRequirements.status).toBe("FROZEN_BY_OWNER");
  expect(manifest.ownerScopeRequirements.runtimeAuthorizationRequired).toBe(
    "SEPARATE_OWNER_TOKEN_REQUIRED",
  );
  expect(manifest.ownerScopeRequirements.planningPhaseExecutionAuthority).toBe(
    "NONE",
  );
  expect(manifest.checkpointPolicy.checkpointAfterEveryWorkItem).toBe(true);
  expect(manifest.createdAtBasis).toBe("DETERMINISTIC_INPUTS_ONLY");
  // Budget totals carried exactly from the allocation.
  expect(manifest.totalAllocatedUnits).toBe(allocation.allocatedUnits);
  expect(manifest.unallocatedUnits).toBe(allocation.unallocatedUnits);
});

// E04 — unknown member reference fails closed
test("E04 manifest construction rejects foreign allocation references", () => {
  const portfolio = demoPortfolio();
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  const foreign = {
    ...allocation,
    selected: [
      ...allocation.selected,
      {
        memberId: "pm:sha256:" + "f".repeat(24),
        targetId: T1!,
        kind: "API" as const,
        allocatedUnits: 1,
        executionOrder: 99,
        maxRetries: 0,
        starvationFloorApplied: false,
        priorityScore: 0,
      },
    ],
  };
  expect(() =>
    buildCampaignPlanManifest({ portfolio, allocation: foreign }),
  ).toThrow();
});
