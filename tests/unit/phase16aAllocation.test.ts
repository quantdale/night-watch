// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W3 bounded budget allocation.
//
// Focused permanent tests: total never exceeded, caps/floors/retries
// enforced, starvation prevention without overriding gates, blocked members
// zero budget, exploration reserve constraints, deterministic tie-breaking,
// byte-identical repeats, and the C-matrix quality floors.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import { buildPortfolio } from "../../src/core/portfolio/types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  verifyAllocationInvariants,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import { allocationQualityFloors } from "../../src/core/portfolio/report";
import {
  P16_APPROVED_BASE,
  buildFixturePortfolio,
  listPhase16aScenarioFixtures,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const [T1, T2, T3] = P16_APPROVED_BASE;

function policy(
  overrides: Partial<PortfolioBudgetPolicy> = {},
): PortfolioBudgetPolicy {
  return {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 10,
    perMemberCeiling: 4,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
    ...overrides,
  };
}

function threeMembers() {
  return buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(T1!, {
        semanticScope: "alpha",
        depthClass: "TYPE_COLLECTION",
        historicalYield: {
          admittedCount: 9,
          reproducedCount: 4,
          minimizedCount: 3,
          distinctClusterCount: 4,
          dossierReadyCount: 2,
          duplicateMerges: 0,
          invalidOrTransient: 0,
          executionsTotal: 20,
        },
      }),
      p16Member(T2!, { semanticScope: "beta" }),
      p16Member(T3!, { semanticScope: "gamma" }),
    ],
  });
}

// C01 — total allocation never exceeds configured budget (all fixtures)
test("C01 total allocated never exceeds total across every fixture portfolio", () => {
  for (const fixture of listPhase16aScenarioFixtures()) {
    const portfolio = buildFixturePortfolio(fixture);
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: policy({ totalUnits: 6, perMemberCeiling: 3, floorUnits: 1 }),
    });
    const sum = allocation.selected.reduce(
      (total, entry) => total + entry.allocatedUnits,
      0,
    );
    expect(sum, fixture.fixtureId).toBeLessThanOrEqual(6);
    expect(allocation.allocatedUnits).toBe(sum);
    expect(allocation.unallocatedUnits).toBe(6 - sum);
  }
});

// C02 — blocked/frozen/stale members receive exactly zero budget
test("C02 blocked members receive zero budget with categorical reasons", () => {
  const portfolio = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(T1!, {
        semanticScope: "blocked",
        ownerBlockedOperations: ["EXTERNAL_PUBLICATION"],
      }),
      p16Member(T2!, { semanticScope: "frozen", phaseFrozen: true }),
      p16Member(T3!, { semanticScope: "stale", currentness: "STALE" }),
    ],
  });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: policy({ totalUnits: 12, perMemberCeiling: 8 }),
  });
  expect(allocation.selected).toHaveLength(0);
  expect(allocation.zeroBudget.map((entry) => entry.reasonCode).sort()).toEqual(
    ["CURRENTNESS_STALE", "OWNER_POLICY_BLOCKED", "PHASE_FROZEN"],
  );
  expect(allocation.allocatedUnits).toBe(0);
});

// C03 — per-member ceiling enforced even with huge budget
test("C03 ceiling binds before total", () => {
  const allocation = allocatePortfolioBudget({
    portfolio: threeMembers(),
    policy: policy({ totalUnits: 100, perMemberCeiling: 4 }),
  });
  for (const entry of allocation.selected) {
    expect(entry.allocatedUnits).toBeLessThanOrEqual(4);
  }
  expect(
    allocation.selected.reduce(
      (total, entry) => total + entry.allocatedUnits,
      0,
    ),
  ).toBe(12);
});

// C04 — starvation floors reach old eligible members but NEVER override gates
test("C04 starvation floor applies to eligible starved only", () => {
  const portfolio = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(T1!, {
        semanticScope: "old-eligible",
        starvationAgeBuckets: 8,
      }),
      p16Member(T2!, {
        semanticScope: "old-blocked",
        starvationAgeBuckets: 8,
        ownerBlockedOperations: ["KUBERNETES"],
      }),
      p16Member(T3!, { semanticScope: "young", starvationAgeBuckets: 1 }),
    ],
  });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: policy({
      totalUnits: 9,
      perMemberCeiling: 3,
      floorUnits: 2,
      starvationThresholdBuckets: 5,
    }),
  });
  const byId = new Map(
    allocation.selected.map((entry) => [entry.memberId, entry]),
  );
  const starvedEntries = allocation.selected.filter(
    (entry) => entry.starvationFloorApplied,
  );
  expect(starvedEntries).toHaveLength(1);
  // The blocked old member must have zero budget despite maximum age.
  expect(
    allocation.zeroBudget.find(
      (entry) => entry.reasonCode === "OWNER_POLICY_BLOCKED",
    ),
  ).toBeTruthy();
  void byId;
});

// C05 — exploration reserve constrains non-exploration allocation
test("C05 reserved exploration units unavailable to API/JOURNEY members", () => {
  const portfolio = threeMembers(); // all API kind
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: policy({
      totalUnits: 10,
      perMemberCeiling: 4,
      reservedExplorationUnits: 4,
    }),
  });
  // Non-exploration may consume at most 10 - 4 = 6 units.
  expect(allocation.allocatedUnits).toBe(6);
  expect(allocation.reservedExplorationUnused).toBe(4);
});

// C06 — EXPLORATION members CAN consume the reserve
test("C06 exploration member consumes reserve", () => {
  const portfolio = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [
      p16Member(T1!, { kind: "EXPLORATION", semanticScope: "explorer" }),
    ],
  });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: policy({
      totalUnits: 5,
      perMemberCeiling: 4,
      reservedExplorationUnits: 3,
    }),
  });
  expect(allocation.selected[0]!.kind).toBe("EXPLORATION");
  expect(allocation.reservedExplorationUnused).toBe(0);
});

// C07 — deterministic tie-break by memberId on equal scores
test("C07 equal scores break ties by memberId ascending", () => {
  const first = p16Member(T1!, { semanticScope: "tie" });
  const second = p16Member(T2!, { semanticScope: "tie" });
  const third = p16Member(T3!, { semanticScope: "tie" });
  const portfolio = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [third, first, second],
  });
  const a = allocatePortfolioBudget({
    portfolio,
    policy: policy({ totalUnits: 3, perMemberCeiling: 1, floorUnits: 1 }),
  });
  const orders = a.selected.map((entry) => entry.memberId);
  expect(orders).toEqual(
    [...orders].sort((left, right) => left.localeCompare(right)),
  );
  // Repeat: identical result.
  const b = allocatePortfolioBudget({
    portfolio,
    policy: policy({ totalUnits: 3, perMemberCeiling: 1, floorUnits: 1 }),
  });
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
});

// C08 — retry ceiling carried per selected member
test("C08 retry ceiling propagated to every selection", () => {
  const allocation = allocatePortfolioBudget({
    portfolio: threeMembers(),
    policy: policy({ retryCeilingPerMember: 2 }),
  });
  for (const entry of allocation.selected) {
    expect(entry.maxRetries).toBe(2);
  }
});

// C09 — zero-total budget selects nobody and fails nothing
// Eligible-but-unfunded members appear in NEITHER list here: they are not
// gate-blocked (so not zeroBudget) and received no units (so not selected).
// The manifest layer reports them as BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT.
test("C09 zero total budget allocates nothing", () => {
  const allocation = allocatePortfolioBudget({
    portfolio: threeMembers(),
    policy: policy({ totalUnits: 0, perMemberCeiling: 1, floorUnits: 0 }),
  });
  expect(allocation.selected).toHaveLength(0);
  expect(allocation.zeroBudget).toHaveLength(0);
  expect(allocation.allocatedUnits).toBe(0);
});

// C10 — invariant verifier detects synthetic violations (floor measurement)
test("C10 verifier flags blocked-funded and overflow violations", () => {
  const portfolio = threeMembers();
  const good = allocatePortfolioBudget({ portfolio, policy: policy() });
  expect(verifyAllocationInvariants(good, portfolio).clean).toBe(true);

  const poisoned = {
    ...good,
    selected: [
      ...good.selected,
      {
        memberId: good.zeroBudget[0]?.memberId ?? "pm:sha256:" + "0".repeat(24),
        targetId: T1!,
        kind: "API" as const,
        allocatedUnits: 999,
        executionOrder: 99,
        maxRetries: 0,
        starvationFloorApplied: false,
        priorityScore: 0,
      },
    ],
  };
  const verified = verifyAllocationInvariants(poisoned, portfolio);
  expect(verified.clean).toBe(false);
});

// C11 — quality floors all zero across every fixture (A/C matrix floors)
test("C11 authorityEscape/stalePositiveRank/budgetOverflow/blockedWithBudget all zero", () => {
  let checked = 0;
  for (const fixture of listPhase16aScenarioFixtures()) {
    const portfolio = buildFixturePortfolio(fixture);
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: policy({ totalUnits: 7, perMemberCeiling: 3, floorUnits: 2 }),
    });
    const floors = allocationQualityFloors(allocation, portfolio);
    expect(floors.budgetOverflowCount, fixture.fixtureId).toBe(0);
    expect(floors.blockedWithBudgetCount, fixture.fixtureId).toBe(0);
    expect(floors.authorityEscapeCount, fixture.fixtureId).toBe(0);
    expect(floors.stalePositiveRankCount, fixture.fixtureId).toBe(0);
    checked += 1;
  }
  expect(checked).toBeGreaterThanOrEqual(50);
});

// C12 — invalid policies fail closed
test("C12 invalid budget policies fail closed", () => {
  expect(() =>
    allocatePortfolioBudget({
      portfolio: threeMembers(),
      policy: policy({ perMemberCeiling: 0 }),
    }),
  ).toThrow();
  expect(() =>
    allocatePortfolioBudget({
      portfolio: threeMembers(),
      policy: policy({ floorUnits: 5, perMemberCeiling: 4 }),
    }),
  ).toThrow();
  expect(() =>
    allocatePortfolioBudget({
      portfolio: threeMembers(),
      policy: policy({ reservedExplorationUnits: 11 }),
    }),
  ).toThrow();
  const driftedVersion = {
    ...policy(),
    policyVersion: "nightwatch.portfolio-allocation.v0",
  } as unknown as PortfolioBudgetPolicy;
  expect(() =>
    allocatePortfolioBudget({
      portfolio: threeMembers(),
      policy: driftedVersion,
    }),
  ).toThrow();
});
