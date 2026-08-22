// ---------------------------------------------------------------------------
// Nightwatch Phase 16H — campaign yield / portfolio adversarial hardening.
//
// Permanent regression + acceptance surface for SPEC H1-H9 against the
// Phase-16A portfolio layer, executed over the extended >= 80-case corpus:
//   A  DTO strictness / identity / permutation stability
//   B  scoring bounds, monotonicity, ties, false-novelty
//   C  allocation budgets, caps/floors, reserves, starvation, partitions
//   D  yield arithmetic + privacy
//   E  manifest strict parsing / tamper rejection / inertness
//   F  complete replan transition matrix
//   G  simulator purity/determinism/model fail-closed
//   I  DEV-handoff safety pins (never executed)
//   J  quality-floor runner (all ten floors, x3 deterministic repeats)
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  ERR_PORTFOLIO_UNAUTHORIZED_TARGET,
  buildPortfolio,
  parsePortfolioDocument,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  verifyAllocationInvariants,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import {
  classifyPortfolioSourceMovement,
  duplicatePenalty,
  portfolioEligibility,
  scorePortfolioMember,
} from "../../src/core/portfolio/scoring";
import {
  CAMPAIGN_PLAN_MANIFEST_VERSION,
  buildCampaignPlanManifest,
  parseCampaignPlanManifestDocument,
} from "../../src/core/portfolio/manifest";
import {
  YIELD_INTERPRETATION,
  addYieldCounters,
  buildPortfolioYieldAccounting,
  validateYieldCounters,
} from "../../src/core/portfolio/yield";
import { classifyPlanReplan } from "../../src/core/portfolio/replan";
import {
  SIM_MODEL_EDGES,
  PHASE16_CORPUS_IDENTITY,
  REPLAN_MATRIX_ROW_IDS,
  buildPhase16hFixturePortfolio,
  listPhase16hOwnScenarioFixtures,
  listPhase16hScenarioFixtures,
  MANIFEST_TAMPER_CASES,
  POLICY_INVALID_CASES,
  PARSER_REJECTION_CASES,
  type Phase16hScenarioFixture,
} from "../../corpus/phase16h/portfolioHardeningCases";
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  DEV_HANDOFF_VERSION,
  allocationQualityFloors,
  buildDevHandoffPackage,
  comparePlanManifests,
  renderDocumentJson,
} from "../../src/core/portfolio/report";
import {
  runShadowSimulation,
  yieldModelFromFacts,
  type MemberYieldModel,
} from "../../src/core/portfolio/simulator";
import type { ProjectSnapshotDiff } from "../../src/core/projectSnapshot/types";
import {
  P16_APPROVED_BASE,
  P16_CONTRACT_V2,
  P16_DERIVATION_V1,
  P16_EV_A,
  P16_EV_B,
  P16_SHA_A,
  P16_SHA_B,
  p16BaselineProvenance,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const [T1, T2, T3] = P16_APPROVED_BASE;
const PRIVACY_SCAN_RE =
  /[A-Z_]*SENTINEL|Bearer\s|eyJ[A-Za-z0-9_-]{8}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|password|credential|api[-_]key|authorization/i;

function basePolicy(): PortfolioBudgetPolicy {
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

function reservePolicy(): PortfolioBudgetPolicy {
  return { ...basePolicy(), reservedExplorationUnits: 2 };
}

interface FixturePipeline {
  readonly portfolio: ReturnType<typeof buildPortfolio>;
  readonly allocation: ReturnType<typeof allocatePortfolioBudget>;
  readonly manifest: ReturnType<typeof buildCampaignPlanManifest>;
  readonly accounting: ReturnType<typeof buildPortfolioYieldAccounting>;
  readonly simulation: ReturnType<typeof runShadowSimulation>;
  readonly handoff: ReturnType<typeof buildDevHandoffPackage>;
}

function runPipeline(
  fixture: Phase16hScenarioFixture | ReturnType<typeof listPhase16hScenarioFixtures>[number],
  policy: PortfolioBudgetPolicy = basePolicy(),
): FixturePipeline {
  const portfolio = buildPhase16hFixturePortfolio(fixture);
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy,
    ...(fixture.previousProvenance ? { previousProvenance: fixture.previousProvenance } : {}),
  });
  const manifest = buildCampaignPlanManifest({ portfolio, allocation });
  const accounting = buildPortfolioYieldAccounting(portfolio);
  const models: Record<string, MemberYieldModel> = {};
  for (const member of portfolio.members) {
    models[member.memberId] = yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: Math.max(
        1,
        member.input.historicalYield.distinctClusterCount,
      ),
      duplicatePressure: member.duplicatePressure,
      replayable: member.input.replayable,
    });
  }
  const simulation = runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels: models,
    starvationThresholdBuckets: policy.starvationThresholdBuckets,
  });
  const handoff = buildDevHandoffPackage(
    manifest,
    portfolio.portfolioDigest,
  );
  return { portfolio, allocation, manifest, accounting, simulation, handoff };
}

const PRIVACY_ARTIFACTS = [
  "portfolio",
  "allocation",
  "manifest",
  "accounting",
  "simulation",
  "handoff",
] as const;

/** Extract string VALUES only (keys are fixed categorical vocabulary). */
function collectStringLeaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectStringLeaves(child, out);
    return out;
  }
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectStringLeaves(child, out);
    }
  }
  return out;
}

function artifactValueLeaks(pipeline: FixturePipeline): number {
  let leaks = 0;
  for (const key of PRIVACY_ARTIFACTS) {
    const rendered = JSON.parse(renderDocumentJson(pipeline[key])) as unknown;
    for (const leaf of collectStringLeaves(rendered)) {
      if (PRIVACY_SCAN_RE.test(leaf)) leaks += 1;
    }
  }
  return leaks;
}

// ---------------------------------------------------------------------------
// J01/A01 — corpus floor and category coverage.
// ---------------------------------------------------------------------------

test("J01 phase-16h adversarial corpus reaches the >=80 scenario floor", () => {
  const combined = listPhase16hScenarioFixtures();
  expect(combined.length).toBeGreaterThanOrEqual(
    PHASE16_CORPUS_IDENTITY.minimumScenarioFloor,
  );
  const ownCategories = new Set(
    listPhase16hOwnScenarioFixtures().map((fixture) => fixture.category),
  );
  expect(ownCategories.size).toBeGreaterThanOrEqual(12);
  const ids = combined.map((fixture) => fixture.fixtureId);
  expect(new Set(ids).size).toBe(ids.length);
});

test("A03 permutation canon variants normalize to byte-identical portfolios", () => {
  const canons = listPhase16hOwnScenarioFixtures().filter((fixture) =>
    fixture.fixtureId.startsWith("p16h-permutation-canon-"),
  );
  expect(canons.length).toBe(4);
  const digests = canons.map(
    (fixture) => buildPhase16hFixturePortfolio(fixture).portfolioDigest,
  );
  for (const digest of digests) {
    expect(digest).toBe(digests[0]);
  }
  const memberOrders = canons.map((fixture) =>
    buildPhase16hFixturePortfolio(fixture)
      .members.map((member) => member.memberId)
      .join(","),
  );
  for (const order of memberOrders) {
    expect(order).toBe(memberOrders[0]);
  }
});

// ---------------------------------------------------------------------------
// DEF-02 reproducers — replan must fail closed on unselected-member movement.
// ---------------------------------------------------------------------------

interface ReplanTrioResult {
  readonly manifest: ReturnType<typeof buildCampaignPlanManifest>;
  readonly weakMemberId: string;
}

function replanTrio(
  mutation: "CONTRACT" | "DERIVATION" | "NONE",
): ReplanTrioResult {
  const strong = p16Member(T1!, {
    semanticScope: "r.strong",
    depthClass: "TYPE_COLLECTION",
    historicalYield: {
      admittedCount: 9,
      reproducedCount: 4,
      minimizedCount: 3,
      distinctClusterCount: 9,
      dossierReadyCount: 2,
      duplicateMerges: 0,
      invalidOrTransient: 0,
      executionsTotal: 20,
    },
  });
  const medium = p16Member(T2!, { semanticScope: "r.medium" });
  const weak = p16Member(T3!, {
    semanticScope: "r.weak",
    executionCostClass: "HIGH",
    ...(mutation === "CONTRACT" ? { contractVersion: P16_CONTRACT_V2 } : {}),
    ...(mutation === "DERIVATION"
      ? { derivationVersion: P16_DERIVATION_V1 }
      : {}),
  });
  const portfolio = buildPortfolio({
    approvedTargets: [T1!, T2!, T3!],
    memberInputs: [strong, medium, weak],
  });
  // Movements are a caller-computed replan input; they must NOT leak into the
  // allocation's own scoring (otherwise movement relevance re-ranks members
  // and the weak member would become selected).
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: { ...basePolicy(), totalUnits: 6, perMemberCeiling: 3 },
  });
  const weakMemberId = portfolioMemberId(weak);
  const selectedIds = allocation.selected.map((entry) => entry.memberId);
  expect(selectedIds).not.toContain(weakMemberId);
  const manifest = buildCampaignPlanManifest({ portfolio, allocation });
  return { manifest, weakMemberId };
}

test("F-row contract change on UNSELECTED member must force reprioritization", () => {
  const { manifest, weakMemberId } = replanTrio("CONTRACT");
  const movement = classifyPortfolioSourceMovement(
    // reconstruct the weak member's provenance movement
    {
      sourceSha: P16_SHA_A,
      evidenceDigest: P16_EV_A,
      derivationVersion: "nightwatch.real-source-derivation.v2",
      contractVersion: P16_CONTRACT_V2,
    },
    p16BaselineProvenance(),
  );
  expect(movement).toBe("CONTRACT_CHANGED");
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: { classification: "UNCHANGED", findings: [] },
    memberMovements: { [weakMemberId]: movement },
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("REPRIORITIZE");
  expect(decision.rebuildRequired).toBe(true);
  expect(decision.reasons).toContain("MEMBER_CONTRACT_CHANGED");
});

test("F-row derivation change on UNSELECTED member must force reprioritization", () => {
  const { manifest, weakMemberId } = replanTrio("DERIVATION");
  const movement = classifyPortfolioSourceMovement(
    {
      sourceSha: P16_SHA_A,
      evidenceDigest: P16_EV_A,
      derivationVersion: P16_DERIVATION_V1,
      contractVersion: "nightwatch.phase10b-contract.v1",
    },
    p16BaselineProvenance(),
  );
  expect(movement).toBe("DERIVATION_CHANGED");
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: { classification: "UNCHANGED", findings: [] },
    memberMovements: { [weakMemberId]: movement },
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("REPRIORITIZE");
  expect(decision.rebuildRequired).toBe(true);
  expect(decision.reasons).toContain("MEMBER_DERIVATION_CHANGED");
});

test("F-row unselected movements never pollute affectedSelectedMemberIds", () => {
  const { manifest, weakMemberId } = replanTrio("NONE");
  const decision = classifyPlanReplan({
    previousManifest: manifest,
    snapshotDiff: { classification: "UNCHANGED", findings: [] },
    memberMovements: { [weakMemberId]: "EVIDENCE_CHANGED" },
    currentnessByTarget: {},
  });
  expect(decision.verdict).toBe("REPRIORITIZE");
  expect(decision.affectedSelectedMemberIds).not.toContain(weakMemberId);
  expect(decision.affectedSelectedMemberIds).toEqual([]);
});

// ---------------------------------------------------------------------------
// DEF-01 reproducer — baseline starvation predicate must match policy.
// ---------------------------------------------------------------------------

test("G-floor baseline starvedEligible uses the policy threshold like optimized side", () => {
  const young = p16Member(T1!, {
    semanticScope: "g.young",
    starvationAgeBuckets: 1,
  });
  const old = p16Member(T2!, {
    semanticScope: "g.old",
    starvationAgeBuckets: 6,
  });
  const portfolio = buildPortfolio({
    approvedTargets: [T1!, T2!],
    memberInputs: [young, old],
  });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: { ...basePolicy(), totalUnits: 0, floorUnits: 0 },
  });
  const models: Record<string, MemberYieldModel> = {};
  for (const member of portfolio.members) {
    models[member.memberId] = yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: 2,
      duplicatePressure: member.duplicatePressure,
      replayable: true,
    });
  }
  const result = runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels: models,
    starvationThresholdBuckets: 5,
  });
  expect(result.optimized.starvedEligibleMembers).toBe(1);
  expect(result.baseline.starvedEligibleMembers).toBe(1);
});

// ---------------------------------------------------------------------------
// DEF-05 reproducers — malformed simulator models must fail closed.
// ---------------------------------------------------------------------------

test("G03 malformed yield models fail closed instead of fabricating metrics", () => {
  const portfolio = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [p16Member(T1!, { semanticScope: "g.model" })],
  });
  const allocation = allocatePortfolioBudget({ portfolio, policy: basePolicy() });
  for (const edge of SIM_MODEL_EDGES) {
    expect(() =>
      runShadowSimulation({
        portfolio,
        optimizedAllocation: allocation,
        yieldModels: { [portfolio.members[0]!.memberId]: edge.model },
        starvationThresholdBuckets: 5,
      }),
      edge.caseId,
    ).toThrow();
  }
});

// ---------------------------------------------------------------------------
// DEF-03 reproducers — compare-plan must reject foreign/malformed manifests.
// ---------------------------------------------------------------------------

test("E01 compare-plan rejects empty-object manifests instead of fabricating diffs", () => {
  expect(() => comparePlanManifests({}, {})).toThrow();
});

test("E01 compare-plan rejects scalar and array manifests", () => {
  expect(() => comparePlanManifests(null as never, {} as never)).toThrow();
  expect(() => comparePlanManifests([] as never, [] as never)).toThrow();
});

// ---------------------------------------------------------------------------
// B-matrix — scoring bounds / monotonicity / ties / novelty.
// ---------------------------------------------------------------------------

test("B06 every score component stays within source-defined bounds", () => {
  const depths = [
    "NONE",
    "SHAPE",
    "COLLECTION",
    "TYPE",
    "SHAPE_COLLECTION",
    "TYPE_COLLECTION",
  ] as const;
  const costs = ["LOW", "MEDIUM", "HIGH"] as const;
  const clusterOptions = [0, 1, 3, 9] as const;
  const ageOptions = [0, 3, 8] as const;
  let checked = 0;
  for (const depthClass of depths) {
    for (const executionCostClass of costs) {
      for (const clusters of clusterOptions) {
        for (const buckets of ageOptions) {
          const memberInput = p16Member(T1!, {
            semanticScope: `bounds.${depthClass.toLowerCase()}.${executionCostClass.toLowerCase()}.${clusters}.${buckets}`,
            depthClass,
            executionCostClass,
            starvationAgeBuckets: buckets,
            historicalYield: {
              admittedCount: clusters > 0 ? 9 : 0,
              reproducedCount: 0,
              minimizedCount: 0,
              distinctClusterCount: clusters,
              dossierReadyCount: 0,
              duplicateMerges: 0,
              invalidOrTransient: 0,
              executionsTotal: 0,
            },
            ...(depthClass === "NONE"
              ? { evidenceDigest: null, derivationVersion: null, contractVersion: null }
              : {}),
          });
          const portfolio = buildPortfolio({
            approvedTargets: [T1!],
            memberInputs: [memberInput],
          });
          const score = scorePortfolioMember(portfolio.members[0]!, null);
          for (const component of score.components) {
            switch (component.name) {
              case "SOURCE_MOVEMENT_RELEVANCE":
                expect(component.contribution).toBeLessThanOrEqual(20);
                break;
              case "SEMANTIC_CONTRACT_DEPTH":
                expect(component.contribution).toBeLessThanOrEqual(15);
                break;
              case "COVERAGE_GAP":
                expect(component.contribution).toBeLessThanOrEqual(12);
                break;
              case "PRIOR_DISTINCT_YIELD":
                expect(component.contribution).toBeLessThanOrEqual(12);
                break;
              case "REPLAYABILITY":
                expect(component.contribution).toBeLessThanOrEqual(6);
                break;
              case "STARVATION_AGE":
                expect(component.contribution).toBeLessThanOrEqual(10);
                break;
              case "DUPLICATE_PRESSURE_SUPPRESSION":
                expect(component.contribution).toBeLessThanOrEqual(0);
                break;
              default:
                expect(component.contribution).toBeLessThanOrEqual(0);
            }
          }
          expect(score.total).toBeLessThanOrEqual(75);
          expect(score.total).toBeGreaterThanOrEqual(-34);
          expect(Number.isInteger(score.total)).toBe(true);
          checked += 1;
        }
      }
    }
  }
  expect(checked).toBe(6 * 3 * 4 * 3);
});

test("B03/B06 duplicate pressure monotonically suppresses across the ladder", () => {
  const penalties = [0, 1, 2, 3, 4, 5, 6].map(duplicatePenalty);
  for (let index = 1; index < penalties.length; index += 1) {
    expect(penalties[index]!).toBeGreaterThanOrEqual(penalties[index - 1]!);
  }
  const ladders = listPhase16hOwnScenarioFixtures()
    .filter((fixture) => fixture.category === "DUPLICATE_PRESSURE_LADDER")
    .sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));
  let focalScore = Number.POSITIVE_INFINITY;
  for (const fixture of ladders) {
    const portfolio = buildPhase16hFixturePortfolio(fixture);
    const focal = portfolio.members[0]!;
    const score = scorePortfolioMember(focal, null).total;
    expect(score, fixture.fixtureId).toBeLessThanOrEqual(focalScore);
    focalScore = score;
  }
});

test("B04 sha-only movement creates zero false novelty end-to-end", () => {
  const movedShaOnly = p16Member(T1!, {
    semanticScope: "novelty.probe",
    sourceSha: P16_SHA_B,
  });
  const portfolio = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [movedShaOnly],
  });
  const member = portfolio.members[0]!;
  const withHistory = scorePortfolioMember(member, p16BaselineProvenance());
  const withoutHistory = scorePortfolioMember(member, null);
  expect(withHistory.movementClass).toBe("SHA_ONLY_NO_EVIDENCE_CHANGE");
  // Anti-false-novelty invariant: the movement class contributes ZERO, so the
  // total (and therefore rank) is identical with or without history.
  const movementComponent = withHistory.components.find(
    (component) => component.name === "SOURCE_MOVEMENT_RELEVANCE",
  )!;
  expect(movementComponent.contribution).toBe(0);
  expect(withHistory.total).toBe(withoutHistory.total);
  // Digest stability is per-normalized-evaluation: identical history repeats
  // must stay byte-identical.
  expect(scorePortfolioMember(member, p16BaselineProvenance()).digest).toBe(
    withHistory.digest,
  );
});

test("B01/B02 stale/unavailable/un-evaluated members never enter ranking", () => {
  for (const currentness of ["STALE", "SOURCE_UNAVAILABLE", "NOT_EVALUATED"] as const) {
    const gated = p16Member(T1!, {
      semanticScope: "gated.probe",
      currentness,
      depthClass: "TYPE_COLLECTION",
      historicalYield: {
        admittedCount: 9,
        reproducedCount: 9,
        minimizedCount: 9,
        distinctClusterCount: 9,
        dossierReadyCount: 9,
        duplicateMerges: 0,
        invalidOrTransient: 0,
        executionsTotal: 9,
      },
      starvationAgeBuckets: 8,
    });
    const healthy = p16Member(T2!, { semanticScope: "healthy.probe" });
    const portfolio = buildPortfolio({
      approvedTargets: [T1!, T2!],
      memberInputs: [gated, healthy],
    });
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: basePolicy(),
    });
    expect(allocation.selected.map((entry) => entry.targetId)).toEqual([T2]);
    expect(allocation.zeroBudget).toHaveLength(1);
    expect(allocation.zeroBudget[0]!.reasonCode).not.toBe("PHASE_FROZEN");
    void currentness;
  }
});

// ---------------------------------------------------------------------------
// C-matrix — allocation invariants over the ENTIRE corpus, multiple policies.
// ---------------------------------------------------------------------------

test("C01-C07 allocation invariants hold across every fixture and policy variant", () => {
  const corpus = listPhase16hScenarioFixtures();
  for (const policy of [basePolicy(), reservePolicy()]) {
    for (const fixture of corpus) {
      const portfolio = buildPhase16hFixturePortfolio(fixture);
      const allocation = allocatePortfolioBudget({
        portfolio,
        policy,
        ...(fixture.previousProvenance
          ? { previousProvenance: fixture.previousProvenance }
          : {}),
      });
      const sum = allocation.selected.reduce(
        (total, entry) => total + entry.allocatedUnits,
        0,
      );
      expect(sum, `${fixture.fixtureId}:${policy.reservedExplorationUnits}`).toBeLessThanOrEqual(
        policy.totalUnits,
      );
      expect(allocation.allocatedUnits).toBe(sum);
      expect(allocation.unallocatedUnits).toBe(policy.totalUnits - sum);
      for (const entry of allocation.selected) {
        expect(entry.allocatedUnits).toBeGreaterThan(0);
        expect(entry.allocatedUnits).toBeLessThanOrEqual(policy.perMemberCeiling);
        expect(entry.maxRetries).toBe(policy.retryCeilingPerMember);
      }
      for (const blocked of allocation.zeroBudget) {
        expect(
          allocation.selected.some((entry) => entry.memberId === blocked.memberId),
          fixture.fixtureId,
        ).toBe(false);
      }
      const verified = verifyAllocationInvariants(allocation, portfolio);
      expect(verified.clean, fixture.fixtureId).toBe(true);
      const floors = allocationQualityFloors(allocation, portfolio);
      expect(floors.authorityEscapeCount, fixture.fixtureId).toBe(0);
      expect(floors.stalePositiveRankCount, fixture.fixtureId).toBe(0);
      expect(floors.budgetOverflowCount, fixture.fixtureId).toBe(0);
      expect(floors.blockedWithBudgetCount, fixture.fixtureId).toBe(0);
    }
  }
});

test("C04/C05 starvation floors respect gates and thresholds at the boundary", () => {
  const atThreshold = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-starvation-at-threshold",
    )!,
  );
  const allocationAt = allocatePortfolioBudget({
    portfolio: atThreshold,
    policy: { ...basePolicy(), totalUnits: 4, perMemberCeiling: 2, floorUnits: 2 },
  });
  expect(allocationAt.selected.every((entry) => entry.starvationFloorApplied)).toBe(
    true,
  );

  const belowThreshold = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-starvation-below-threshold",
    )!,
  );
  const allocationBelow = allocatePortfolioBudget({
    portfolio: belowThreshold,
    policy: { ...basePolicy(), totalUnits: 2, perMemberCeiling: 2, floorUnits: 2 },
  });
  expect(
    allocationBelow.selected.every((entry) => !entry.starvationFloorApplied),
  ).toBe(true);

  const allBlocked = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-all-blocked-starved",
    )!,
  );
  const allocationBlocked = allocatePortfolioBudget({
    portfolio: allBlocked,
    policy: basePolicy(),
  });
  expect(allocationBlocked.selected).toHaveLength(0);
  expect(allocationBlocked.zeroBudget).toHaveLength(3);
  expect(allocationBlocked.allocatedUnits).toBe(0);
});

test("C05/C06 full-reserve portfolios degenerate deterministically", () => {
  const noExplore = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-reserve-total-no-explore",
    )!,
  );
  const allocationNoExplore = allocatePortfolioBudget({
    portfolio: noExplore,
    policy: { ...basePolicy(), totalUnits: 5, reservedExplorationUnits: 5 },
  });
  expect(allocationNoExplore.selected).toHaveLength(0);
  expect(allocationNoExplore.allocatedUnits).toBe(0);
  expect(allocationNoExplore.reservedExplorationUnused).toBe(5);

  const withExplore = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-reserve-total-with-explore",
    )!,
  );
  const allocationWithExplore = allocatePortfolioBudget({
    portfolio: withExplore,
    policy: { ...basePolicy(), totalUnits: 5, reservedExplorationUnits: 5 },
  });
  // The reserve is a reservation reachable ONLY by exploration members; the
  // per-member ceiling still binds first (4 of the 5 reserved units granted).
  expect(allocationWithExplore.selected).toHaveLength(1);
  expect(allocationWithExplore.selected[0]!.kind).toBe("EXPLORATION");
  expect(allocationWithExplore.allocatedUnits).toBe(4);
  expect(allocationWithExplore.reservedExplorationUnused).toBe(1);
});

test("C09 zero-member portfolio plans to an empty coherent manifest", () => {
  const pipeline = runPipeline(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-zero-members-empty-portfolio",
    )!,
  );
  expect(pipeline.allocation.selected).toHaveLength(0);
  expect(pipeline.manifest.selectedMembers).toHaveLength(0);
  expect(pipeline.manifest.unselectedMembers).toHaveLength(0);
  expect(pipeline.accounting.totals.admittedCount).toBe(0);
  expect(pipeline.accounting.rates.duplicateRatePermille).toBeNull();
  expect(JSON.stringify(runPipeline(listPhase16hOwnScenarioFixtures().find(
    (fixture) => fixture.fixtureId === "p16h-zero-members-empty-portfolio",
  )!))).toBe(JSON.stringify(pipeline));
});

test("C12 policy invalid cases all fail closed", () => {
  const portfolio = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [p16Member(T1!)],
  });
  for (const invalid of POLICY_INVALID_CASES) {
    expect(
      () =>
        allocatePortfolioBudget({
          portfolio,
          policy: {
            ...basePolicy(),
            ...invalid.overrides,
          } as PortfolioBudgetPolicy,
        }),
      invalid.caseId,
    ).toThrow();
  }
});

// ---------------------------------------------------------------------------
// D-matrix — yield arithmetic edges.
// ---------------------------------------------------------------------------

test("D01/D04 non-finite and negative counters fail closed everywhere", () => {
  const badValues = [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    2.5,
    "7",
    null,
  ];
  for (const value of badValues) {
    expect(
      () =>
        validateYieldCounters({
          admittedCount: value as number,
          reproducedCount: 0,
          minimizedCount: 0,
          distinctClusterCount: 0,
          dossierReadyCount: 0,
          duplicateMerges: 0,
          invalidOrTransient: 0,
          executionsTotal: 0,
        }),
      String(value),
    ).toThrow();
  }
  const big = {
    admittedCount: 100000,
    reproducedCount: 0,
    minimizedCount: 0,
    distinctClusterCount: 0,
    dossierReadyCount: 0,
    duplicateMerges: 0,
    invalidOrTransient: 0,
    executionsTotal: 0,
  };
  expect(() => addYieldCounters(big, big)).toThrow();
});

test("D02/D03 zero denominators yield explicit nulls; maxed counters stay integral", () => {
  const empty = buildPortfolio({
    approvedTargets: [T1!],
    memberInputs: [p16Member(T1!, { semanticScope: "yield.empty" })],
  });
  const emptyAccounting = buildPortfolioYieldAccounting(empty);
  expect(emptyAccounting.rates.duplicateRatePermille).toBeNull();
  expect(emptyAccounting.rates.invalidRatePermille).toBeNull();
  expect(emptyAccounting.rates.costPerUsefulCandidatePermille).toBeNull();

  const maxed = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-yield-maxed-counters",
    )!,
  );
  const maxedAccounting = buildPortfolioYieldAccounting(maxed);
  expect(maxedAccounting.totals.admittedCount).toBe(100000);
  for (const rate of Object.values(maxedAccounting.rates)) {
    expect(Number.isInteger(rate)).toBe(true);
  }

  const invalidHeavy = buildPhase16hFixturePortfolio(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-yield-invalid-heavy",
    )!,
  );
  const heavyAccounting = buildPortfolioYieldAccounting(invalidHeavy);
  expect(heavyAccounting.rates.invalidRatePermille).toBe(1000);
  const heavyScore = scorePortfolioMember(invalidHeavy.members[0]!, null);
  const penalty = heavyScore.components.find(
    (component) => component.name === "INVALID_TRANSIENT_HISTORY",
  )!;
  expect(penalty.contribution).toBe(-8);
});

// ---------------------------------------------------------------------------
// A/E — DTO parser rejection matrix + manifest strict parsing.
// ---------------------------------------------------------------------------

test("A02 every parser rejection case fails closed with categorical errors", () => {
  const LEAK_SHAPES = [
    /Bearer\s/,
    /eyJ[A-Za-z0-9_-]{8}\./,
    /AKIA[0-9A-Z]{16}/,
    /BEGIN [A-Z ]*PRIVATE KEY/,
    /CUSTOMER_SENTINEL/,
    /EMAIL_SENTINEL/,
  ];
  for (const rejection of PARSER_REJECTION_CASES) {
    let threw = false;
    try {
      parsePortfolioDocument(rejection.input());
    } catch (error) {
      threw = true;
      const message = error instanceof Error ? error.message : String(error);
      expect(message.startsWith("PORTFOLIO_"), `${rejection.caseId}: ${message}`).toBe(
        true,
      );
      for (const shape of LEAK_SHAPES) {
        expect(shape.test(message), `${rejection.caseId} echoed raw input`).toBe(
          false,
        );
      }
    }
    expect(threw, rejection.caseId).toBe(true);
  }
});

test("A03 unauthorized document target surfaces the authority error", () => {
  const member = p16Member("phase16a.synthetic-extra.three.read");
  expect(() =>
    buildPortfolio({ approvedTargets: [T1!], memberInputs: [member] }),
  ).toThrow(ERR_PORTFOLIO_UNAUTHORIZED_TARGET);
});

test("E01/E04 strict manifest parser accepts canonical documents byte-stable", () => {
  const pipeline = runPipeline(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-kind-mix-journey-api-exploration",
    )!,
  );
  const rendered = JSON.parse(renderDocumentJson(pipeline.manifest)) as unknown;
  const parsed = parseCampaignPlanManifestDocument(rendered);
  expect(parsed.planId).toBe(pipeline.manifest.planId);
  expect(parsed.manifestDigest).toBe(pipeline.manifest.manifestDigest);
  expect(parsed.ownerScopeRequirements.planningPhaseExecutionAuthority).toBe("NONE");
  expect(CAMPAIGN_PLAN_MANIFEST_VERSION).toBe(
    "nightwatch.campaign-plan-manifest.v1",
  );
});

test("E01 every manifest tamper case is rejected by recomputation", () => {
  const valid = (() => {
    const fixture = listPhase16hOwnScenarioFixtures().find(
      (candidate) => candidate.fixtureId === "p16h-edge-exact-fit-trio",
    )!;
    const portfolio = buildPhase16hFixturePortfolio(fixture);
    // Tight budget funds only the top-ranked member so the document carries
    // TWO unselected entries and reorder mutations are observable.
    const allocation = allocatePortfolioBudget({
      portfolio,
      policy: {
        ...basePolicy(),
        totalUnits: 3,
        perMemberCeiling: 3,
        reservedExplorationUnits: 0,
      },
    });
    return JSON.parse(
      renderDocumentJson(buildCampaignPlanManifest({ portfolio, allocation })),
    ) as unknown;
  })();
  parseCampaignPlanManifestDocument(valid);
  for (const tamper of MANIFEST_TAMPER_CASES) {
    expect(
      () => parseCampaignPlanManifestDocument(tamper.mutate(valid as never)),
      tamper.caseId,
    ).toThrow();
  }
});

// ---------------------------------------------------------------------------
// F-matrix — complete replan transition matrix (SPEC H6).
// ---------------------------------------------------------------------------

function trioPlan() {
  const strong = p16Member(T1!, {
    semanticScope: "matrix.strong",
    depthClass: "TYPE_COLLECTION",
    historicalYield: {
      admittedCount: 9,
      reproducedCount: 4,
      minimizedCount: 3,
      distinctClusterCount: 9,
      dossierReadyCount: 2,
      duplicateMerges: 0,
      invalidOrTransient: 0,
      executionsTotal: 20,
    },
  });
  const medium = p16Member(T2!, { semanticScope: "matrix.medium" });
  const portfolio = buildPortfolio({
    approvedTargets: [T1!, T2!],
    memberInputs: [strong, medium],
  });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: basePolicy(),
  });
  return {
    portfolio,
    allocation,
    manifest: buildCampaignPlanManifest({ portfolio, allocation }),
    strongId: portfolioMemberId(strong),
    mediumId: portfolioMemberId(medium),
    strongTarget: strong.targetId,
    mediumTarget: medium.targetId,
  };
}

function unchangedDiff(): ProjectSnapshotDiff {
  return { classification: "UNCHANGED", findings: [] };
}

test("F01-F09 replan transition matrix classifies every row deterministically", () => {
  const executedRows: string[] = [];
  const expectVerdict = (
    rowId: string,
    decision: ReturnType<typeof classifyPlanReplan>,
    verdict: "PLAN_REUSABLE" | "REPRIORITIZE" | "INVALIDATED",
  ) => {
    expect(decision.verdict, rowId).toBe(verdict);
    executedRows.push(rowId);
  };

  const base = trioPlan();

  // unchanged-source-evidence
  expectVerdict(
    "unchanged-source-evidence",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {},
      currentnessByTarget: {},
    }),
    "PLAN_REUSABLE",
  );

  // sha-only-movement-selected (no false novelty)
  expectVerdict(
    "sha-only-movement-selected",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: { [base.strongId]: "SHA_ONLY_NO_EVIDENCE_CHANGE" },
      currentnessByTarget: {},
    }),
    "PLAN_REUSABLE",
  );

  // compatible-evidence-movement-selected
  expectVerdict(
    "compatible-evidence-movement-selected",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: { [base.strongId]: "EVIDENCE_CHANGED" },
      currentnessByTarget: {},
    }),
    "REPRIORITIZE",
  );

  // breaking-contract-movement-selected
  expectVerdict(
    "breaking-contract-movement-selected",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: { [base.strongId]: "CONTRACT_CHANGED" },
      currentnessByTarget: {},
    }),
    "INVALIDATED",
  );

  // derivation-version-change-selected
  expectVerdict(
    "derivation-version-change-selected",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: { [base.strongId]: "DERIVATION_CHANGED" },
      currentnessByTarget: {},
    }),
    "INVALIDATED",
  );

  // authority-change-snapshot
  expectVerdict(
    "authority-change-snapshot",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: { classification: "AUTHORITY_CHANGE", findings: [] },
      memberMovements: {},
      currentnessByTarget: {},
    }),
    "INVALIDATED",
  );

  // stale-currentness-selected-target
  expectVerdict(
    "stale-currentness-selected-target",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {},
      currentnessByTarget: { [base.strongTarget]: "STALE" },
    }),
    "REPRIORITIZE",
  );

  // unavailable-currentness-selected-target
  expectVerdict(
    "unavailable-currentness-selected-target",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {},
      currentnessByTarget: { [base.strongTarget]: "SOURCE_UNAVAILABLE" },
    }),
    "REPRIORITIZE",
  );

  // contract-change-unselected-member (fail closed to reprioritize)
  const contractRow = replanTrio("CONTRACT");
  expectVerdict(
    "contract-change-unselected-member",
    classifyPlanReplan({
      previousManifest: contractRow.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {
        [contractRow.weakMemberId]: "CONTRACT_CHANGED",
      },
      currentnessByTarget: {},
    }),
    "REPRIORITIZE",
  );

  // derivation-change-unselected-member (fail closed to reprioritize)
  const derivationRow = replanTrio("DERIVATION");
  expectVerdict(
    "derivation-change-unselected-member",
    classifyPlanReplan({
      previousManifest: derivationRow.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {
        [derivationRow.weakMemberId]: "DERIVATION_CHANGED",
      },
      currentnessByTarget: {},
    }),
    "REPRIORITIZE",
  );

  // incompatible-snapshot-change
  expectVerdict(
    "incompatible-snapshot-change",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: { classification: "INCOMPATIBLE_CHANGE", findings: [] },
      memberMovements: {},
      currentnessByTarget: {},
    }),
    "INVALIDATED",
  );

  // registry-removal-via-unavailability
  expectVerdict(
    "registry-removal-via-unavailability",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: unchangedDiff(),
      memberMovements: {},
      currentnessByTarget: {
        [base.strongTarget]: "SOURCE_UNAVAILABLE",
        [base.mediumTarget]: "SOURCE_UNAVAILABLE",
      },
    }),
    "REPRIORITIZE",
  );

  // registry-removal-via-authority-event
  expectVerdict(
    "registry-removal-via-authority-event",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: { classification: "AUTHORITY_CHANGE", findings: [] },
      memberMovements: {},
      currentnessByTarget: { [base.mediumTarget]: "SOURCE_UNAVAILABLE" },
    }),
    "INVALIDATED",
  );

  // mixed-signals-authority-dominates
  expectVerdict(
    "mixed-signals-authority-dominates",
    classifyPlanReplan({
      previousManifest: base.manifest,
      snapshotDiff: { classification: "AUTHORITY_CHANGE", findings: [] },
      memberMovements: { [base.strongId]: "CONTRACT_CHANGED" },
      currentnessByTarget: { [base.mediumTarget]: "STALE" },
    }),
    "INVALIDATED",
  );

  expect(executedRows.sort()).toEqual([...REPLAN_MATRIX_ROW_IDS].sort());
});

// ---------------------------------------------------------------------------
// G-matrix — simulator purity/determinism across the whole corpus.
// ---------------------------------------------------------------------------

test("G01/G02 simulator output is byte-identical across three repeats per fixture", () => {
  for (const fixture of listPhase16hScenarioFixtures()) {
    const runs: string[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) {
      runs.push(JSON.stringify(runPipeline(fixture).simulation));
    }
    expect(runs[0], fixture.fixtureId).toBe(runs[1]);
    expect(runs[1], fixture.fixtureId).toBe(runs[2]);
  }
});

test("G02 yield-model insertion order cannot alter simulation bytes", () => {
  const fixture = listPhase16hOwnScenarioFixtures().find(
    (candidate) => candidate.fixtureId === "p16h-depth-full-ladder",
  )!;
  const portfolio = buildPhase16hFixturePortfolio(fixture);
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: reservePolicy(),
  });
  const buildModels = () => {
    const models: Record<string, MemberYieldModel> = {};
    const ordered = [...portfolio.members];
    for (const member of ordered) {
      models[member.memberId] = yieldModelFromFacts({
        memberId: member.memberId,
        kind: member.input.kind,
        distinctClusterCount: Math.max(1, member.input.historicalYield.distinctClusterCount),
        duplicatePressure: member.duplicatePressure,
        replayable: member.input.replayable,
      });
    }
    return models;
  };
  const forward = runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels: buildModels(),
    starvationThresholdBuckets: 5,
  });
  const reversedModels: Record<string, MemberYieldModel> = {};
  for (const member of [...portfolio.members].reverse()) {
    reversedModels[member.memberId] = yieldModelFromFacts({
      memberId: member.memberId,
      kind: member.input.kind,
      distinctClusterCount: Math.max(1, member.input.historicalYield.distinctClusterCount),
      duplicatePressure: member.duplicatePressure,
      replayable: member.input.replayable,
    });
  }
  const backward = runShadowSimulation({
    portfolio,
    optimizedAllocation: allocation,
    yieldModels: reversedModels,
    starvationThresholdBuckets: 5,
  });
  expect(forward.digest).toBe(backward.digest);
  expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
});

test("D05/G03 simulation markers pin the synthetic-only claim boundary", () => {
  for (const fixture of listPhase16hOwnScenarioFixtures()) {
    const simulation = runPipeline(fixture).simulation;
    expect(simulation.interpretation).toContain("NOT_REAL_WORLD_YIELD");
    expect(simulation.realWorldBugYieldClaim).toBe(false);
  }
});

// ---------------------------------------------------------------------------
// I-matrix — DEV handoff safety pins.
// ---------------------------------------------------------------------------

test("I01-I05 dev handoff remains data-only, DEV-restricted, separately gated", () => {
  const pipeline = runPipeline(
    listPhase16hOwnScenarioFixtures().find(
      (fixture) => fixture.fixtureId === "p16h-kind-mix-journey-api-exploration",
    )!,
  );
  const handoff = pipeline.handoff;
  expect(DEV_HANDOFF_VERSION).toBe("nightwatch.dev-campaign-handoff.v1");
  expect(handoff.executable).toBe(false);
  expect(handoff.environmentRestriction).toBe("DEV_ONLY_NEVER_PRODUCTION");
  expect(handoff.requiredAuthorizationToken).toBe(
    DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  );
  expect(handoff.requiredAuthorizationToken.endsWith(
    "SEPARATE_TOKEN_REQUIRED",
  )).toBe(true);
  expect(handoff.runtimeObligations).toEqual([
    "OWNER_POLICY_GATE_REQUIRED",
    "CONTAINMENT_STACK_REQUIRED",
    "CHECKPOINT_RESUME_REQUIRED",
    "NO_PRODUCTION_CONTACT",
    "FINDINGS_OWNER_LOCAL_ONLY",
  ]);
  const serialized = renderDocumentJson(handoff);
  expect(serialized).not.toMatch(/Bearer|eyJ[A-Za-z0-9_-]{8}\.|AKIA[0-9A-Z]{16}/);
  expect(serialized).toContain('"executable":false');
});

// ---------------------------------------------------------------------------
// J-matrix — quality-floor runner over the entire corpus, x3 repeats.
// ---------------------------------------------------------------------------

test("J02-J10 all ten quality floors equal zero across the full corpus x3 repeats", () => {
  const corpus = listPhase16hScenarioFixtures();
  let determinismMismatchCount = 0;
  let privacyLeakCount = 0;
  let falseCurrentCount = 0;
  let authorityEscapeCount = 0;
  let blockedMemberBudgetCount = 0;
  let budgetOverflowCount = 0;
  let falseNoveltyIncreaseCount = 0;
  let invalidReplanReuseCount = 0;
  let realYieldClaimCount = 0;
  let executableHandoffCount = 0;

  const STALE_REASONS = new Set([
    "CURRENTNESS_STALE",
    "SOURCE_UNAVAILABLE",
    "EVIDENCE_NOT_EVALUATED",
    "EVIDENCE_MISSING",
  ]);

  for (let repeat = 0; repeat < 3; repeat += 1) {
    for (const fixture of corpus) {
      const pipelines = [
        runPipeline(fixture, basePolicy()),
        runPipeline(fixture, reservePolicy()),
      ];
      const firstRun = JSON.stringify(
        pipelines.map((pipeline) => ({
          d: pipeline.portfolio.portfolioDigest,
          a: pipeline.allocation.digest,
          m: pipeline.manifest.manifestDigest,
          y: pipeline.accounting.digest,
          s: pipeline.simulation.digest,
          h: pipeline.handoff.digest,
        })),
      );
      const rerun = JSON.stringify(
        [
          runPipeline(fixture, basePolicy()),
          runPipeline(fixture, reservePolicy()),
        ].map((pipeline) => ({
          d: pipeline.portfolio.portfolioDigest,
          a: pipeline.allocation.digest,
          m: pipeline.manifest.manifestDigest,
          y: pipeline.accounting.digest,
          s: pipeline.simulation.digest,
          h: pipeline.handoff.digest,
        })),
      );
      if (firstRun !== rerun) determinismMismatchCount += 1;

      for (const pipeline of pipelines) {
        privacyLeakCount += artifactValueLeaks(pipeline);

        const { portfolio, allocation, manifest, accounting, simulation, handoff } =
          pipeline;

        const verified = verifyAllocationInvariants(allocation, portfolio);
        budgetOverflowCount += verified.budgetOverflowCount;
        blockedMemberBudgetCount += verified.blockedWithBudgetCount;
        const floors = allocationQualityFloors(allocation, portfolio);
        authorityEscapeCount += floors.authorityEscapeCount;
        falseCurrentCount += floors.stalePositiveRankCount;

        for (const blocked of allocation.zeroBudget) {
          if (
            STALE_REASONS.has(blocked.reasonCode) &&
            allocation.selected.some((entry) => entry.memberId === blocked.memberId)
          ) {
            falseCurrentCount += 1;
          }
        }

        if (accounting.realWorldBugYieldClaim !== false) realYieldClaimCount += 1;
        if (simulation.realWorldBugYieldClaim !== false) realYieldClaimCount += 1;
        if (!accounting.interpretation.includes("NOT_REAL_WORLD_YIELD"))
          realYieldClaimCount += 1;
        if (!simulation.interpretation.includes("NOT_REAL_WORLD_YIELD"))
          realYieldClaimCount += 1;
        if (handoff.executable !== false) executableHandoffCount += 1;

        // Reuse-classification floor: degraded currentness on ANY selected
        // target must never leave the prior plan reusable.
        if (manifest.selectedMembers.length > 0) {
          const degradedTarget = manifest.selectedMembers[0]!.targetId;
          const decision = classifyPlanReplan({
            previousManifest: manifest,
            snapshotDiff: unchangedDiff(),
            memberMovements: {},
            currentnessByTarget: { [degradedTarget]: "SOURCE_UNAVAILABLE" },
          });
          if (decision.verdict === "PLAN_REUSABLE") invalidReplanReuseCount += 1;
        }

        // False-novelty floor: sha-only provenance movement must never raise
        // the member's own score.
        if (fixture.previousProvenance) {
          for (const member of portfolio.members) {
            const previous =
              fixture.previousProvenance[member.memberId] ?? null;
            if (!previous) continue;
            const movement = classifyPortfolioSourceMovement(
              member.input,
              previous,
            );
            if (movement !== "SHA_ONLY_NO_EVIDENCE_CHANGE") continue;
            const withHistory = scorePortfolioMember(member, previous);
            const withoutHistory = scorePortfolioMember(member, null);
            if (withHistory.total > withoutHistory.total)
              falseNoveltyIncreaseCount += 1;
          }
        }
      }
    }
  }

  expect(determinismMismatchCount).toBe(0);
  expect(privacyLeakCount).toBe(0);
  expect(falseCurrentCount).toBe(0);
  expect(authorityEscapeCount).toBe(0);
  expect(blockedMemberBudgetCount).toBe(0);
  expect(budgetOverflowCount).toBe(0);
  expect(falseNoveltyIncreaseCount).toBe(0);
  expect(invalidReplanReuseCount).toBe(0);
  expect(realYieldClaimCount).toBe(0);
  expect(executableHandoffCount).toBe(0);
});

// ---------------------------------------------------------------------------
// A04 — end-to-end permutation stability across every fixture.
// ---------------------------------------------------------------------------

test("A04 member-input permutation cannot alter any pipeline artifact", () => {
  for (const fixture of listPhase16hOwnScenarioFixtures()) {
    const forward = runPipeline(fixture, reservePolicy());
    const permuted: Phase16hScenarioFixture = {
      ...fixture,
      approvedTargets: [...fixture.approvedTargets].reverse(),
      memberInputs: [...fixture.memberInputs].reverse(),
    };
    if (permuted.memberInputs.length === 0) continue;
    const backward = runPipeline(permuted, reservePolicy());
    expect(
      forward.portfolio.portfolioDigest,
      fixture.fixtureId,
    ).toBe(backward.portfolio.portfolioDigest);
    expect(forward.allocation.digest, fixture.fixtureId).toBe(
      backward.allocation.digest,
    );
    expect(forward.manifest.manifestDigest, fixture.fixtureId).toBe(
      backward.manifest.manifestDigest,
    );
    expect(forward.simulation.digest, fixture.fixtureId).toBe(
      backward.simulation.digest,
    );
    expect(forward.handoff.digest, fixture.fixtureId).toBe(
      backward.handoff.digest,
    );
  }
});

void P16_EV_B;
