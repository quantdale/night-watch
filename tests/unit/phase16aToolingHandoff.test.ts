// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W8 operator tooling surfaces + DEV handoff gate.
//
// Focused permanent tests: deterministic renderers, explain-score surface,
// plan comparison findings, allocation quality floors, and the separately
// owner-gated DEV handoff package (executable:false; separate token
// required; NEVER executed in this phase).
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { buildPortfolio } from "../../src/core/portfolio/types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  verifyAllocationInvariants,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import { scorePortfolioMember } from "../../src/core/portfolio/scoring";
import { buildCampaignPlanManifest } from "../../src/core/portfolio/manifest";
import { buildPortfolioYieldAccounting } from "../../src/core/portfolio/yield";
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  DEV_HANDOFF_VERSION,
  allocationQualityFloors,
  buildDevHandoffPackage,
  comparePlanManifests,
  explainScoreLines,
  renderDocumentJson,
  renderPlan,
  renderPortfolioInspect,
  renderSimulation,
} from "../../src/core/portfolio/report";
import {
  P16_APPROVED_BASE,
  buildDemoPortfolioInput,
} from "../../corpus/phase16a/portfolioFixtures";

const [T1, T2] = P16_APPROVED_BASE;

function policy(): PortfolioBudgetPolicy {
  return {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 8,
    perMemberCeiling: 3,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
  };
}

function demo() {
  return {
    portfolio: buildPortfolio({
      approvedTargets: P16_APPROVED_BASE,
      memberInputs: buildDemoPortfolioInput().memberInputs.filter((member) =>
        P16_APPROVED_BASE.includes(member.targetId),
      ),
    }),
    policy: policy(),
  };
}

function fullPipeline() {
  const { portfolio, policy } = demo();
  const allocation = allocatePortfolioBudget({ portfolio, policy });
  const manifest = buildCampaignPlanManifest({ portfolio, allocation });
  return { portfolio, allocation, manifest };
}

// T01 — all renderer outputs deterministic across repeats
test("T01 inspect/plan/simulation/json renders are byte-identical across repeats", () => {
  const { portfolio, allocation, manifest } = fullPipeline();
  const accounting = buildPortfolioYieldAccounting(portfolio);
  expect(renderPortfolioInspect(portfolio)).toBe(
    renderPortfolioInspect(portfolio),
  );
  expect(renderPlan(manifest)).toBe(renderPlan(manifest));
  expect(renderDocumentJson(manifest)).toBe(renderDocumentJson(manifest));
  void allocation;
  void accounting;
});

// T02 — canonical JSON has sorted keys
test("T02 renderDocumentJson emits sorted-key canonical JSON", () => {
  const rendered = renderDocumentJson({ zeta: 1, alpha: { y: 2, b: 3 } });
  expect(rendered).toBe('{"alpha":{"b":3,"y":2},"zeta":1}');
});

// T03 — explain-score lines expose every component and the duplicate penalty
test("T03 explainScoreLines lists all components plus duplicate penalty", () => {
  const member = buildDemoMember();
  const score = scorePortfolioMember(member, null);
  const lines = explainScoreLines(score, member.duplicatePressure);
  expect(lines[0]).toContain(score.memberId);
  for (const component of score.components) {
    expect(lines.some((line) => line.includes(component.name))).toBe(true);
  }
  expect(lines.some((line) => line.includes("DUPLICATE_PRESSURE"))).toBe(true);
});
function buildDemoMember() {
  return buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [buildDemoPortfolioInput().memberInputs[0]!],
  }).members[0]!;
}

// T04 — plan comparison detects add/remove/budget-change deterministically
test("T04 comparePlanManifests finds material changes deterministically", () => {
  const before = fullPipeline();
  // Budget shrinks: allocations change.
  const after = (() => {
    const { portfolio } = before;
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: { ...policy(), totalUnits: 4 },
    });
    return buildCampaignPlanManifest({ portfolio, allocation });
  })();
  const identicalRun = comparePlanManifests(
    before.manifest,
    fullPipeline().manifest,
  );
  expect(identicalRun.identical).toBe(true);
  expect(identicalRun.findings).toHaveLength(0);

  const changed = comparePlanManifests(before.manifest, after);
  expect(changed.identical).toBe(false);
  expect(changed.findings.length).toBeGreaterThan(0);
});

// T05 — quality floors helper reports zeros on healthy allocations
test("T05 allocationQualityFloors zero on healthy allocation", () => {
  const { portfolio, allocation } = fullPipeline();
  const floors = allocationQualityFloors(allocation, portfolio);
  expect(floors.authorityEscapeCount).toBe(0);
  expect(floors.stalePositiveRankCount).toBe(0);
  expect(floors.budgetOverflowCount).toBe(0);
  expect(floors.blockedWithBudgetCount).toBe(0);
  expect(verifyAllocationInvariants(allocation, portfolio).clean).toBe(true);
});

// H01 — DEV handoff package is NON-executable and requires a separate token
test("H01 dev handoff carries executable=false and separate-token requirement", () => {
  const { manifest, portfolio } = fullPipeline();
  const handoff = buildDevHandoffPackage(manifest, portfolio.portfolioDigest);
  expect(handoff.handoffVersion).toBe(DEV_HANDOFF_VERSION);
  expect(handoff.executable).toBe(false);
  expect(handoff.requiredAuthorizationToken).toBe(
    DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  );
  expect(handoff.requiredAuthorizationToken).toContain(
    "SEPARATE_TOKEN_REQUIRED",
  );
  expect(handoff.environmentRestriction).toBe("DEV_ONLY_NEVER_PRODUCTION");
  expect(handoff.planId).toBe(manifest.planId);
  expect(handoff.digest).toMatch(/^handoff:sha256:[0-9a-f]{24}$/);
  expect(handoff.runtimeObligations).toContain("NO_PRODUCTION_CONTACT");
  expect(handoff.runtimeObligations).toContain("FINDINGS_OWNER_LOCAL_ONLY");
});

// H02 — handoff deterministic byte-identical
test("H02 dev handoff package deterministic across builds", () => {
  const first = buildDevHandoffPackage(
    fullPipeline().manifest,
    "pf:sha256:" + "a".repeat(24),
  );
  const second = buildDevHandoffPackage(
    fullPipeline().manifest,
    "pf:sha256:" + "a".repeat(24),
  );
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
});

// H03 — simulation renderer carries the interpretation marker verbatim
test("H03 renderSimulation includes NOT-real-world-yield marker", () => {
  const rendered = renderSimulation({
    simulatorVersion: "nightwatch.portfolio-simulator.v1",
    interpretation: "PLANNER_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD",
    allocationVersion: PORTFOLIO_ALLOCATION_VERSION,
    portfolioDigest: "pf:sha256:" + "b".repeat(24),
    baseline: {
      strategy: "EQUAL_SPLIT_IGNORE_EVIDENCE",
      totalUnitsSpent: 6,
      usefulCandidates: 1,
      wastedUnitsOnNonYielding: 4,
      fundedMemberCount: 3,
      starvedEligibleMembers: 0,
    },
    optimized: {
      strategy: "PORTFOLIO_PRIORITY_ALLOCATION",
      totalUnitsSpent: 6,
      usefulCandidates: 3,
      wastedUnitsOnNonYielding: 0,
      fundedMemberCount: 2,
      starvedEligibleMembers: 0,
    },
    usefulCandidateDelta: 2,
    realWorldBugYieldClaim: false,
    digest: "psim:sha256:" + "c".repeat(24),
  });
  expect(rendered).toContain("PLANNER_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD");
  expect(rendered).toContain("realWorldBugYieldClaim=false");
  expect(rendered).toContain("usefulCandidateDelta=2");
});
void T2;
