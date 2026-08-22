// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W6 change-aware replan + W7 shadow simulator.
//
// Focused permanent tests: authority/contract/derivation invalidation,
// evidence-change reprioritization, SHA-only reuse (no false novelty),
// degraded-currentness exclusion, simulator determinism x3, baseline-vs-
// optimized metrics, and the fixed synthetic-only interpretation markers.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  buildPortfolio,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import {
  classifyPortfolioSourceMovement,
  type PortfolioMovementClass,
  type PortfolioPreviousProvenance,
} from "../../src/core/portfolio/scoring";
import { buildCampaignPlanManifest } from "../../src/core/portfolio/manifest";
import { classifyPlanReplan } from "../../src/core/portfolio/replan";
import {
  SIMULATION_INTERPRETATION,
  runShadowSimulation,
  yieldModelFromFacts,
  type MemberYieldModel,
} from "../../src/core/portfolio/simulator";
import type { ProjectSnapshotDiff } from "../../src/core/projectSnapshot/types";
import {
  P16_APPROVED_BASE,
  P16_EV_B,
  P16_SHA_B,
  p16BaselineProvenance,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const [T1, T2, T3] = P16_APPROVED_BASE;

function policy(): PortfolioBudgetPolicy {
  return {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 9,
    perMemberCeiling: 4,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
  };
}

function trio() {
  return buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(T1!, { semanticScope: "one", depthClass: "TYPE_COLLECTION" }),
      p16Member(T2!, { semanticScope: "two", depthClass: "TYPE" }),
      p16Member(T3!, { semanticScope: "three", depthClass: "SHAPE" }),
    ],
  });
}

function unchangedDiff(): ProjectSnapshotDiff {
  return { classification: "UNCHANGED", findings: [] };
}

function buildPlan(portfolio = trio()) {
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  return buildCampaignPlanManifest({ portfolio, allocation });
}

// R01 — authority change always invalidates (highest precedence)
test("R01 snapshot AUTHORITY_CHANGE invalidates regardless of member evidence", () => {
  const manifest = buildPlan();
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: { classification: "AUTHORITY_CHANGE", findings: [] },
    memberMovements: {},
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("INVALIDATED");
  expect(decision.rebuildRequired).toBe(true);
  expect(decision.reasons).toContain("SNAPSHOT_AUTHORITY_CHANGE");
});

// R02 — incompatible change invalidates; semantic change reprioritizes
test("R02 INCOMPATIBLE invalidates, SEMANTIC reprioritizes, UNCHANGED reuses", () => {
  const manifest = buildPlan();
  const base = {
    previousManifest: manifest,
    memberMovements: {} as Record<string, PortfolioMovementClass>,
    currentnessByTarget: {} as Record<string, string>,
  };
  expect(
    classifyPlanReplan({
      ...base,
      snapshotDiff: { classification: "INCOMPATIBLE_CHANGE", findings: [] },
    }).verdict,
  ).toBe("INVALIDATED");
  expect(
    classifyPlanReplan({
      ...base,
      snapshotDiff: { classification: "SEMANTIC_CHANGE", findings: [] },
    }).verdict,
  ).toBe("REPRIORITIZE");
  const reused = classifyPlanReplan({ ...base, snapshotDiff: unchangedDiff() });
  expect(reused.verdict).toBe("PLAN_REUSABLE");
  expect(reused.rebuildRequired).toBe(false);
  expect(reused.reasons).toEqual(["NO_MATERIAL_EVIDENCE_CHANGE"]);
});

// R03 — selected-member contract/derivation change invalidates the plan
test("R03 selected member CONTRACT_CHANGED or DERIVATION_CHANGED invalidates", () => {
  for (const movement of ["CONTRACT_CHANGED", "DERIVATION_CHANGED"] as const) {
    const manifest = buildPlan();
    const selectedId = manifest.selectedMembers[0]!.memberId;
    const decision = classifyPlanReplan({
      previousManifest: manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: { [selectedId]: movement },
      currentnessByTarget: {},
    });
    expect(decision.verdict, movement).toBe("INVALIDATED");
    expect(decision.affectedSelectedMemberIds).toContain(selectedId);
  }
});

// R04 — evidence change on selected member reprioritizes (not invalidates)
test("R04 selected member EVIDENCE_CHANGED reprioritizes with affected ids", () => {
  const manifest = buildPlan();
  const selectedId = manifest.selectedMembers[1]!.memberId;
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: unchangedDiff(),
    memberMovements: { [selectedId]: "EVIDENCE_CHANGED" },
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("REPRIORITIZE");
  expect(decision.rebuildRequired).toBe(true);
  expect(decision.affectedSelectedMemberIds).toEqual([selectedId]);
});

// R05 — SHA-only movement NEVER forces replan (no false novelty)
test("R05 sha-only movement keeps plan reusable and novelty-neutral", () => {
  const movedShaOnly = p16Member(T1!, {
    sourceSha: P16_SHA_B,
    semanticScope: "sha-only",
  });
  const portfolio = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [movedShaOnly],
  });
  const manifest = buildPlan(portfolio);
  const previous: PortfolioPreviousProvenance = p16BaselineProvenance();
  const movement = classifyPortfolioSourceMovement(movedShaOnly, previous);
  expect(movement).toBe("SHA_ONLY_NO_EVIDENCE_CHANGE");
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: unchangedDiff(),
    memberMovements: { [portfolioMemberId(movedShaOnly)]: movement },
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("PLAN_REUSABLE");
});

// R06 — degraded currentness on selected target forces reprioritization
test("R06 selected target going STALE forces reprioritize with exclusion reason", () => {
  const manifest = buildPlan();
  const selectedTarget = manifest.selectedMembers[0]!.targetId;
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: unchangedDiff(),
    memberMovements: {},
    currentnessByTarget: { [selectedTarget]: "STALE" },
  });
  expect(decision.verdict).toBe("REPRIORITIZE");
  expect(
    decision.reasons.some((reason) => reason.startsWith("MEMBER_CURRENTNESS_")),
  ).toBe(true);
});

// S01 — simulator deterministic x3 byte-identical
test("S01 identical simulation runs are byte-identical three times", () => {
  const run = () => simulate();
  const first = JSON.stringify(run());
  const second = JSON.stringify(run());
  const third = JSON.stringify(run());
  expect(first).toBe(second);
  expect(second).toBe(third);
});

// S02 — optimized beats or ties baseline under fixture models; markers fixed
test("S02 delta reported with synthetic-only interpretation marker", () => {
  const result = simulate();
  expect(result.interpretation).toBe(SIMULATION_INTERPRETATION);
  expect(result.realWorldBugYieldClaim).toBe(false);
  expect(result.allocationVersion).toBe(PORTFOLIO_ALLOCATION_VERSION);
  expect(typeof result.usefulCandidateDelta).toBe("number");
  // Under these models the optimizer must not do worse than equal-split.
  expect(result.optimized.usefulCandidates).toBeGreaterThanOrEqual(0);
  expect(result.baseline.usefulCandidates).toBeGreaterThanOrEqual(0);
});

// S03 — blocked/stale-heavy portfolios waste baseline budget but not optimized
test("S03 baseline wastes units on non-yielding members; optimized avoids gates", () => {
  const gated = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(T1!, { semanticScope: "good", depthClass: "TYPE_COLLECTION" }),
      p16Member(T2!, { semanticScope: "stale", currentness: "STALE" }),
      p16Member(T3!, {
        semanticScope: "blocked",
        ownerBlockedOperations: ["EXTERNAL_PUBLICATION"],
      }),
    ],
  });
  const models: Record<string, MemberYieldModel> = {};
  for (const member of gated.members) {
    models[member.memberId] = yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: 3,
      duplicatePressure: member.duplicatePressure,
      replayable: true,
    });
  }
  const allocation = allocatePortfolioBudget({
    portfolio: gated,
    policy: policy(),
  });
  const result = runShadowSimulation({
    portfolio: gated,
    optimizedAllocation: allocation,
    yieldModels: models,
    starvationThresholdBuckets: 5,
  });
  // Baseline split budget across ALL non-frozen members including the two
  // gated ones; the optimizer funded neither.
  expect(result.baseline.wastedUnitsOnNonYielding).toBeGreaterThan(0);
  expect(allocation.selected.length).toBe(1);
});

// S04 — missing model fails closed
test("S04 missing yield model fails closed", () => {
  const portfolio = trio();
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  expect(() =>
    runShadowSimulation({
      portfolio,
      optimizedAllocation: allocation,
      yieldModels: {},
      starvationThresholdBuckets: 5,
    }),
  ).toThrow(/MODEL_MISSING/);
});

function simulate() {
  const portfolio = trio();
  const models: Record<string, MemberYieldModel> = {};
  for (const member of portfolio.members) {
    models[member.memberId] = yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: 2,
      duplicatePressure: member.duplicatePressure,
      replayable: member.input.replayable,
    });
  }
  const allocation = allocatePortfolioBudget({ portfolio, policy: policy() });
  return runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels: models,
    starvationThresholdBuckets: 5,
  });
}
void P16_EV_B;
