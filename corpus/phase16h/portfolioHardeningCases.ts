// ---------------------------------------------------------------------------
// Nightwatch Phase 16H — campaign yield / portfolio adversarial corpus.
//
// Deterministic, pure-data hardening cases extending the Phase-16A fixture
// catalog to >= 80 scenario cases spanning SPEC H1-H9:
//   H1 parser/DTO strictness      -> PARSER_REJECTION_CASES
//   H2 scoring invariants         -> permutation canons + pressure ladder
//   H3 allocation/starvation      -> EDGE_BUDGET / RESERVE_EDGE / STARVATION
//   H4 yield arithmetic           -> YIELD_EDGE family
//   H5 manifest/version identity  -> MANIFEST_TAMPER_CASES
//   H6 replan transition matrix   -> MOVEMENT_MATRIX family + REPLAN rows
//   H7 simulator purity           -> SIM_MODEL_EDGES
//
// Every value is a synthetic structural fake. Builders never randomize;
// repeated evaluation yields deep-equal results. No fs/network/environment
// access; no credentials; no customer values.
// ---------------------------------------------------------------------------

import type { PortfolioMemberInput } from "../../src/core/portfolio/types";
import {
  PORTFOLIO_SCHEMA_VERSION,
  buildPortfolio,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import type { PortfolioPreviousProvenance } from "../../src/core/portfolio/scoring";
import type { CampaignPlanManifest } from "../../src/core/portfolio/manifest";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  allocatePortfolioBudget,
  type PortfolioBudgetPolicy,
} from "../../src/core/portfolio/allocation";
import { buildCampaignPlanManifest } from "../../src/core/portfolio/manifest";
import type { MemberYieldModel } from "../../src/core/portfolio/simulator";
import {
  P16_APPROVED_BASE,
  P16_APPROVED_EXTENDED,
  P16_CONTRACT_V2,
  P16_DERIVATION_V1,
  P16_EV_B,
  P16_SHA_B,
  P16_SYNTH_EXTRA_1,
  P16_TARGET_COMMON,
  P16_TARGET_INVENTORY,
  P16_TARGET_PAYER,
  listPhase16aScenarioFixtures,
  p16BaselineProvenance,
  p16Member,
} from "../phase16a/portfolioFixtures";

/** Phase-16H adversarial category vocabulary (superset coverage proof). */
export const PHASE16H_FIXTURE_CATEGORIES = [
  "PERMUTATION_CANON",
  "DUPLICATE_PRESSURE_LADDER",
  "EDGE_BUDGET",
  "ALL_GATED_STARVED",
  "RESERVE_EDGE",
  "STARVATION_BOUNDARY",
  "MOVEMENT_MATRIX",
  "YIELD_EDGE",
  "MIXED_GATES",
  "DEPTH_LADDER",
  "COST_LADDER",
  "ZERO_MEMBERS",
  "KIND_MIX",
] as const;

export type Phase16hFixtureCategory =
  (typeof PHASE16H_FIXTURE_CATEGORIES)[number];

export interface Phase16hScenarioFixture {
  readonly fixtureId: string;
  readonly category: Phase16hFixtureCategory;
  /** Categorical one-line summary (safe tokens only). */
  readonly summary: string;
  readonly approvedTargets: readonly string[];
  readonly memberInputs: readonly PortfolioMemberInput[];
  readonly previousProvenance?: Readonly<
    Record<string, PortfolioPreviousProvenance>
  >;
}

function counters(
  overrides: Partial<PortfolioMemberInput["historicalYield"]>,
): PortfolioMemberInput["historicalYield"] {
  return {
    admittedCount: 0,
    reproducedCount: 0,
    minimizedCount: 0,
    distinctClusterCount: 0,
    dossierReadyCount: 0,
    duplicateMerges: 0,
    invalidOrTransient: 0,
    executionsTotal: 0,
    ...overrides,
  };
}

// --- PERMUTATION_CANON (4) -----------------------------------------------------
// One canonical four-member universe declared under different input orders;
// every variant must normalize to byte-identical identities/digests.
const canonMembers = (): PortfolioMemberInput[] => [
  p16Member(P16_TARGET_PAYER, {
    semanticScope: "p16h.canon.one",
    kind: "JOURNEY",
  }),
  p16Member(P16_TARGET_COMMON, {
    semanticScope: "p16h.canon.two",
    depthClass: "SHAPE",
  }),
  p16Member(P16_TARGET_INVENTORY, {
    semanticScope: "p16h.canon.three",
    depthClass: "TYPE_COLLECTION",
    historicalYield: counters({ distinctClusterCount: 4 }),
  }),
  p16Member(P16_SYNTH_EXTRA_1, {
    semanticScope: "p16h.canon.four",
    kind: "EXPLORATION",
  }),
];
const canonTargets = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_TARGET_INVENTORY,
  P16_SYNTH_EXTRA_1,
];

const permutationCanonFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-permutation-canon-a",
    category: "PERMUTATION_CANON",
    summary: "CANONICAL_DECLARATION_ORDER_BASELINE",
    approvedTargets: [...canonTargets],
    memberInputs: canonMembers(),
  },
  {
    fixtureId: "p16h-permutation-canon-b",
    category: "PERMUTATION_CANON",
    summary: "REVERSED_MEMBER_INPUT_ORDER_MUST_NORMALIZE_IDENTICALLY",
    approvedTargets: [...canonTargets],
    memberInputs: [...canonMembers()].reverse(),
  },
  {
    fixtureId: "p16h-permutation-canon-c",
    category: "PERMUTATION_CANON",
    summary: "REVERSED_APPROVED_TARGET_ORDER_MUST_NORMALIZE_IDENTICALLY",
    approvedTargets: [...canonTargets].reverse(),
    memberInputs: canonMembers(),
  },
  {
    fixtureId: "p16h-permutation-canon-d",
    category: "PERMUTATION_CANON",
    summary: "BOTH_ORDERS_REVERSED_MUST_NORMALIZE_IDENTICALLY",
    approvedTargets: [...canonTargets].reverse(),
    memberInputs: [...canonMembers()].reverse(),
  },
];

// --- DUPLICATE_PRESSURE_LADDER (5) ------------------------------------------------
const duplicatePressureLadderFixtures: Phase16hScenarioFixture[] = [
  2, 3, 4, 5, 6,
].map((count, ladderIndex) => ({
  fixtureId: `p16h-duplicate-pressure-${ladderIndex + 1}`,
  category: "DUPLICATE_PRESSURE_LADDER" as const,
  summary: `SHARED_SCOPE_PRESSURE_${ladderIndex}_MONOTONE_SUPPRESSION`,
  approvedTargets: P16_APPROVED_EXTENDED.slice(0, count),
  memberInputs: P16_APPROVED_EXTENDED.slice(0, count).map((target) =>
    p16Member(target, { semanticScope: "p16h.dup.ladder" }),
  ),
}));

// --- EDGE_BUDGET (5) ---------------------------------------------------------------
const edgeBudgetFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-edge-one-unit-solo",
    category: "EDGE_BUDGET",
    summary: "SINGLE_ELIGIBLE_MEMBER_UNDER_ONE_UNIT_TOTAL",
    approvedTargets: [P16_TARGET_PAYER],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.edge.solo" }),
    ],
  },
  {
    fixtureId: "p16h-edge-exact-fit-trio",
    category: "EDGE_BUDGET",
    summary: "TOTAL_EXACTLY_EQUALS_SUM_OF_MEMBER_CEILINGS",
    approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON, P16_TARGET_INVENTORY],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.fit.one" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "p16h.fit.two" }),
      p16Member(P16_TARGET_INVENTORY, { semanticScope: "p16h.fit.three" }),
    ],
  },
  {
    fixtureId: "p16h-edge-oversubscribed-quintet",
    category: "EDGE_BUDGET",
    summary: "AGGREGATE_DEMAND_FAR_EXCEEDS_TOTAL_BUDGET",
    approvedTargets: P16_APPROVED_EXTENDED.slice(0, 5),
    memberInputs: P16_APPROVED_EXTENDED.slice(0, 5).map((target, index) =>
      p16Member(target, {
        semanticScope: `p16h.over.demand.${index + 1}`,
        depthClass: "TYPE_COLLECTION",
        historicalYield: counters({ distinctClusterCount: 9 }),
      }),
    ),
  },
  {
    fixtureId: "p16h-edge-tiny-ceiling-pair",
    category: "EDGE_BUDGET",
    summary: "PER_MEMBER_CEILING_BINDS_BEFORE_TOTAL_BUDGET",
    approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.ceil.one" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "p16h.ceil.two" }),
    ],
  },
  {
    fixtureId: "p16h-edge-single-exploration",
    category: "EDGE_BUDGET",
    summary: "ONLY_EXPLORATION_MEMBER_MAY_CONSUME_RESERVE",
    approvedTargets: [P16_SYNTH_EXTRA_1],
    memberInputs: [
      p16Member(P16_SYNTH_EXTRA_1, {
        semanticScope: "p16h.solo.explore",
        kind: "EXPLORATION",
      }),
    ],
  },
];

// --- ALL_GATED_STARVED (4) -----------------------------------------------------------
function allGatedFixture(
  fixtureId: string,
  summary: string,
  gate: Partial<Parameters<typeof p16Member>[1]>,
): Phase16hScenarioFixture {
  return {
    fixtureId,
    category: "ALL_GATED_STARVED",
    summary,
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: P16_APPROVED_BASE.map((target, index) =>
      p16Member(target, {
        semanticScope: `p16h.gated.${index + 1}`,
        starvationAgeBuckets: 8,
        depthClass: "TYPE_COLLECTION",
        historicalYield: counters({ distinctClusterCount: 9 }),
        ...gate,
      }),
    ),
  };
}

const allGatedFixtures: Phase16hScenarioFixture[] = [
  allGatedFixture(
    "p16h-all-blocked-starved",
    "EVERY_MEMBER_OWNER_BLOCKED_FLOORS_CANNOT_RESURRECT",
    { ownerBlockedOperations: ["EXTERNAL_PUBLICATION"] },
  ),
  allGatedFixture(
    "p16h-all-stale-starved",
    "EVERY_MEMBER_STALE_STARVATION_CANNOT_OVERRIDE_CURRENTNESS",
    { currentness: "STALE" as const },
  ),
  allGatedFixture(
    "p16h-all-unavailable-starved",
    "EVERY_MEMBER_SOURCE_UNAVAILABLE_FAILS_CLOSED",
    { currentness: "SOURCE_UNAVAILABLE" as const },
  ),
  allGatedFixture(
    "p16h-all-not-evaluated-starved",
    "EVERY_MEMBER_UNEVALUATED_FAILS_CLOSED",
    { currentness: "NOT_EVALUATED" as const },
  ),
];

// --- RESERVE_EDGE (4) ------------------------------------------------------------------
const reserveEdgeFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-reserve-total-no-explore",
    category: "RESERVE_EDGE",
    summary: "FULL_RESERVE_WITH_NO_EXPLORATION_MEMBER_ALLOCATES_ZERO",
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.res.a" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "p16h.res.b" }),
      p16Member(P16_TARGET_INVENTORY, { semanticScope: "p16h.res.c" }),
    ],
  },
  {
    fixtureId: "p16h-reserve-total-with-explore",
    category: "RESERVE_EDGE",
    summary: "FULL_RESERVE_REACHABLE_ONLY_BY_EXPLORATION_MEMBER",
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.res.d" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "p16h.res.e" }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "p16h.res.explore",
        kind: "EXPLORATION",
      }),
    ],
  },
  {
    fixtureId: "p16h-reserve-squeeze-floors",
    category: "RESERVE_EDGE",
    summary: "STARVED_NON_EXPLORATION_MEMBERS_SQUEEZED_BY_RESERVE",
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.squeeze.a",
        starvationAgeBuckets: 7,
      }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "p16h.squeeze.b",
        starvationAgeBuckets: 8,
      }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "p16h.squeeze.c",
        starvationAgeBuckets: 6,
      }),
    ],
  },
  {
    fixtureId: "p16h-exploration-only",
    category: "RESERVE_EDGE",
    summary: "EXPLORATION_ONLY_PORTFOLIO_CONSUMES_RESERVE_DIRECTLY",
    approvedTargets: [P16_SYNTH_EXTRA_1],
    memberInputs: [
      p16Member(P16_SYNTH_EXTRA_1, {
        semanticScope: "p16h.explore.only",
        kind: "EXPLORATION",
        starvationAgeBuckets: 8,
      }),
    ],
  },
];

// --- STARVATION_BOUNDARY (2) --------------------------------------------------------------
const starvationBoundaryFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-starvation-at-threshold",
    category: "STARVATION_BOUNDARY",
    summary: "MEMBERS_AT_THRESHOLD_QUALIFY_FOR_STARVATION_FLOOR",
    approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.starve.at.one",
        starvationAgeBuckets: 5,
      }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "p16h.starve.at.two",
        starvationAgeBuckets: 5,
      }),
    ],
  },
  {
    fixtureId: "p16h-starvation-below-threshold",
    category: "STARVATION_BOUNDARY",
    summary: "MEMBERS_BELOW_THRESHOLD_DO_NOT_QUALIFY_FOR_FLOOR",
    approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.starve.below.one",
        starvationAgeBuckets: 4,
      }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "p16h.starve.below.two",
        starvationAgeBuckets: 4,
      }),
    ],
  },
];

// --- MOVEMENT_MATRIX (6) --------------------------------------------------------------------
interface MovementCaseSpec {
  readonly fixtureId: string;
  readonly summary: string;
  readonly target: string;
  readonly overrides: Parameters<typeof p16Member>[1];
}

// weakRanking members carry HIGH cost + zero yield so tight test budgets leave
// them unselected deterministically; their evidence fields stay intact so the
// contract/derivation/evidence movement under test is real.
function weakRanking(): Parameters<typeof p16Member>[1] {
  return { executionCostClass: "HIGH" as const };
}

const movementCases: readonly MovementCaseSpec[] = [
  {
    fixtureId: "p16h-move-sha-only-selected",
    summary: "MOVED_SHA_UNCHANGED_EVIDENCE_ON_RANKED_MEMBER_NO_NOVELTY",
    target: P16_TARGET_PAYER,
    overrides: { semanticScope: "p16h.move.sha.selected", sourceSha: P16_SHA_B },
  },
  {
    fixtureId: "p16h-move-evidence-changed-unselected",
    summary: "CHANGED_EVIDENCE_ON_LOW_RANK_MEMBER_REPRIORITIZES",
    target: P16_TARGET_INVENTORY,
    overrides: {
      ...weakRanking(),
      semanticScope: "p16h.move.evch.unselected",
      sourceSha: P16_SHA_B,
      evidenceDigest: P16_EV_B,
    },
  },
  {
    fixtureId: "p16h-move-contract-changed-unselected",
    summary: "CONTRACT_CHANGE_ON_UNSELECTED_MEMBER_MUST_NOT_REUSE_PLAN",
    target: P16_TARGET_INVENTORY,
    overrides: {
      ...weakRanking(),
      semanticScope: "p16h.move.contract.unselected",
      contractVersion: P16_CONTRACT_V2,
    },
  },
  {
    fixtureId: "p16h-move-derivation-changed-selected",
    summary: "DERIVATION_CHANGE_ON_RANKED_MEMBER_INVALIDATES_PLAN",
    target: P16_TARGET_PAYER,
    overrides: {
      semanticScope: "p16h.move.deriv.selected",
      derivationVersion: P16_DERIVATION_V1,
    },
  },
  {
    fixtureId: "p16h-move-derivation-changed-unselected",
    summary: "DERIVATION_CHANGE_ON_UNSELECTED_MEMBER_MUST_NOT_REUSE_PLAN",
    target: P16_TARGET_INVENTORY,
    overrides: {
      ...weakRanking(),
      semanticScope: "p16h.move.deriv.unselected",
      derivationVersion: P16_DERIVATION_V1,
    },
  },
  {
    fixtureId: "p16h-move-evidence-lost-selected",
    summary: "EVIDENCE_LOST_ON_DEPTHLESS_RANKED_MEMBER_NEUTRAL_MOVEMENT",
    target: P16_TARGET_COMMON,
    overrides: {
      semanticScope: "p16h.move.evlost.selected",
      evidenceDigest: null,
      derivationVersion: null,
      contractVersion: null,
      depthClass: "NONE",
    },
  },
];

const movementMatrixFixtures: Phase16hScenarioFixture[] = movementCases.map(
  ({ fixtureId, summary, target, overrides }) => {
    const member = p16Member(target, overrides);
    return {
      fixtureId,
      category: "MOVEMENT_MATRIX" as const,
      summary,
      approvedTargets: [target],
      memberInputs: [member],
      previousProvenance: {
        [portfolioMemberId(member)]: p16BaselineProvenance(),
      },
    };
  },
);

// --- YIELD_EDGE (3) ----------------------------------------------------------------------------
const yieldEdgeFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-yield-maxed-counters",
    category: "YIELD_EDGE",
    summary: "COUNTERS_AT_UPPER_BOUND_ACCEPTED_AND_ACCOUNTED",
    approvedTargets: [P16_TARGET_PAYER],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.yield.maxed",
        historicalYield: counters({
          admittedCount: 100000,
          reproducedCount: 100000,
          minimizedCount: 100000,
          distinctClusterCount: 100000,
          dossierReadyCount: 100000,
          duplicateMerges: 100000,
          invalidOrTransient: 100000,
          executionsTotal: 100000,
        }),
      }),
    ],
  },
  {
    fixtureId: "p16h-yield-invalid-heavy",
    category: "YIELD_EDGE",
    summary: "INVALID_TRANSIENT_RATE_AT_MAXIMUM_APPLIES_SCORING_PENALTY",
    approvedTargets: [P16_TARGET_PAYER],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.yield.invalid",
        historicalYield: counters({
          admittedCount: 10,
          invalidOrTransient: 10,
        }),
      }),
    ],
  },
  {
    fixtureId: "p16h-yield-duplicate-heavy",
    category: "YIELD_EDGE",
    summary: "DUPLICATE_MERGES_DOMINATE_ADMISSIONS_COHERENTLY",
    approvedTargets: [P16_TARGET_PAYER],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.yield.dupheavy",
        historicalYield: counters({
          admittedCount: 4,
          duplicateMerges: 40,
          executionsTotal: 90,
        }),
      }),
    ],
  },
];

// --- MIXED_GATES (2) -------------------------------------------------------------------------------
const mixedGatesFixtures: Phase16hScenarioFixture[] = [
  {
    fixtureId: "p16h-mixed-gates-strong-positives",
    category: "MIXED_GATES",
    summary: "FROZEN_BLOCKED_STALE_MEMBERS_CARRY_MAX_POSITIVE_FACTORS_YET_LOSE",
    approvedTargets: P16_APPROVED_EXTENDED.slice(0, 4),
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.gates.frozen",
        phaseFrozen: true,
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 8,
        historicalYield: counters({ distinctClusterCount: 9 }),
      }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "p16h.gates.blocked",
        ownerBlockedOperations: ["DYNAMODB_DATA_ORACLE"],
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 8,
        historicalYield: counters({ distinctClusterCount: 9 }),
      }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "p16h.gates.stale",
        currentness: "STALE",
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 8,
      }),
      p16Member(P16_SYNTH_EXTRA_1, {
        semanticScope: "p16h.gates.eligible",
        depthClass: "TYPE",
      }),
    ],
  },
  {
    fixtureId: "p16h-mixed-gates-quintet",
    category: "MIXED_GATES",
    summary: "PARTIAL_GATE_QUINTET_PARTITIONS_SELECTED_ZERO_AND_UNFUNDED",
    approvedTargets: P16_APPROVED_EXTENDED,
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "p16h.q5.one",
        depthClass: "TYPE_COLLECTION",
        historicalYield: counters({ distinctClusterCount: 9 }),
      }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "p16h.q5.two" }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "p16h.q5.blocked",
        ownerBlockedOperations: ["SPANNER_DATA_ORACLE"],
      }),
      p16Member("phase16a.synthetic-extra.two.read", {
        semanticScope: "p16h.q5.stale",
        currentness: "STALE",
      }),
      p16Member("phase16a.synthetic-extra.three.read", {
        semanticScope: "p16h.q5.explorer",
        kind: "EXPLORATION",
        depthClass: "COLLECTION",
      }),
    ],
  },
];

// --- DEPTH_LADDER (1) ---------------------------------------------------------------------------------
const DEPTH_CLASSES = [
  "NONE",
  "SHAPE",
  "COLLECTION",
  "TYPE",
  "SHAPE_COLLECTION",
  "TYPE_COLLECTION",
] as const;

const depthLadderFixture: Phase16hScenarioFixture = {
  fixtureId: "p16h-depth-full-ladder",
  category: "DEPTH_LADDER",
  summary: "ALL_SIX_DEPTH_CLASSES_SCORE_DISTINCTLY_WITHOUT_GATE_DRIFT",
  approvedTargets: P16_APPROVED_EXTENDED,
  memberInputs: DEPTH_CLASSES.map((depthClass, index) =>
    p16Member(P16_APPROVED_EXTENDED[index]!, {
      semanticScope: `p16h.depth.${index + 1}`,
      depthClass,
      ...(depthClass === "NONE"
        ? { evidenceDigest: null, derivationVersion: null, contractVersion: null }
        : {}),
    }),
  ),
};

// --- COST_LADDER (1) ------------------------------------------------------------------------------------
const costLadderFixture: Phase16hScenarioFixture = {
  fixtureId: "p16h-cost-class-ladder",
  category: "COST_LADDER",
  summary: "EXECUTION_COST_CLASSES_APPLY_BOUNDED_PENALTIES",
  approvedTargets: P16_APPROVED_BASE,
  memberInputs: [
    p16Member(P16_TARGET_PAYER, {
      semanticScope: "p16h.cost.low",
      executionCostClass: "LOW",
    }),
    p16Member(P16_TARGET_COMMON, {
      semanticScope: "p16h.cost.medium",
      executionCostClass: "MEDIUM",
    }),
    p16Member(P16_TARGET_INVENTORY, {
      semanticScope: "p16h.cost.high",
      executionCostClass: "HIGH",
    }),
  ],
};

// --- ZERO_MEMBERS (1) -------------------------------------------------------------------------------------
const zeroMembersFixture: Phase16hScenarioFixture = {
  fixtureId: "p16h-zero-members-empty-portfolio",
  category: "ZERO_MEMBERS",
  summary: "APPROVED_UNIVERSE_WITH_ZERO_MEMBERS_DEGENERATES_CLEANLY",
  approvedTargets: [P16_TARGET_PAYER],
  memberInputs: [],
};

// --- KIND_MIX (1) -------------------------------------------------------------------------------------------
const kindMixFixture: Phase16hScenarioFixture = {
  fixtureId: "p16h-kind-mix-journey-api-exploration",
  category: "KIND_MIX",
  summary: "ALL_THREE_MEMBER_KINDS_PLAN_WITH_KIND_APPROPRIATE_POLICIES",
  approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON, P16_SYNTH_EXTRA_1],
  memberInputs: [
    p16Member(P16_TARGET_PAYER, {
      semanticScope: "p16h.kind.journey",
      kind: "JOURNEY",
      journeyId: "ripple-payer-exchange-read",
    }),
    p16Member(P16_TARGET_COMMON, {
      semanticScope: "p16h.kind.api",
      kind: "API",
    }),
    p16Member(P16_SYNTH_EXTRA_1, {
      semanticScope: "p16h.kind.exploration",
      kind: "EXPLORATION",
    }),
  ],
};

// ------------------------------------------------------------------------------------------------------------
// Unified Phase-16H scenario catalog.
// ------------------------------------------------------------------------------------------------------------

export function listPhase16hOwnScenarioFixtures(): readonly Phase16hScenarioFixture[] {
  return [
    ...permutationCanonFixtures,
    ...duplicatePressureLadderFixtures,
    ...edgeBudgetFixtures,
    ...allGatedFixtures,
    ...reserveEdgeFixtures,
    ...starvationBoundaryFixtures,
    ...movementMatrixFixtures,
    ...yieldEdgeFixtures,
    ...mixedGatesFixtures,
    depthLadderFixture,
    costLadderFixture,
    zeroMembersFixture,
    kindMixFixture,
  ].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));
}

/**
 * Complete Phase-16H scenario corpus: the inherited Phase-16A catalog plus
 * every new adversarial scenario. The count is a coverage floor (>= 80).
 */
export function listPhase16hScenarioFixtures(): readonly (
  | Phase16hScenarioFixture
  | ReturnType<typeof listPhase16aScenarioFixtures>[number]
)[] {
  return [
    ...listPhase16aScenarioFixtures(),
    ...listPhase16hOwnScenarioFixtures(),
  ].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));
}

/** Build a validated portfolio from one Phase-16H fixture (fail closed). */
export function buildPhase16hFixturePortfolio(
  fixture:
    | Phase16hScenarioFixture
    | ReturnType<typeof listPhase16aScenarioFixtures>[number],
) {
  return buildPortfolio({
    approvedTargets: fixture.approvedTargets,
    memberInputs: fixture.memberInputs,
  });
}

// ------------------------------------------------------------------------------------------------------------
// Negative catalogs (H1/H5/H7 fail-closed surfaces).
// ------------------------------------------------------------------------------------------------------------

export interface ParserRejectionCase {
  readonly caseId: string;
  readonly surface:
    | "DOCUMENT_SHAPE"
    | "TOP_LEVEL_FIELDS"
    | "IDENTITY"
    | "UNIVERSE"
    | "MEMBER_SHAPE"
    | "FIELD_ENUM"
    | "FIELD_NUMERIC"
    | "SENTINEL";
  readonly description: string;
  readonly input: () => unknown;
}

function makeValidDocument(): Record<string, unknown> {
  const portfolio = buildPortfolio({
    approvedTargets: [P16_TARGET_PAYER],
    memberInputs: [p16Member(P16_TARGET_PAYER)],
  });
  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    approvedTargets: [...portfolio.approvedTargets],
    members: portfolio.members.map((member) => ({
      memberId: member.memberId,
      input: member.input,
      duplicatePressure: member.duplicatePressure,
    })),
    portfolioDigest: portfolio.portfolioDigest,
  };
}

function mutateValidDocument(
  mutator: (document: Record<string, unknown>) => void,
): () => unknown {
  return () => {
    const document = JSON.parse(JSON.stringify(makeValidDocument())) as Record<
      string,
      unknown
    >;
    mutator(document);
    return document;
  };
}

type MemberRecord = Record<string, unknown>;

function firstMember(document: Record<string, unknown>): MemberRecord {
  return (document.members as MemberRecord[])[0]!;
}

function firstMemberInput(document: Record<string, unknown>): MemberRecord {
  return firstMember(document).input as MemberRecord;
}

function makeDirectInputCase(
  caseId: string,
  surface: ParserRejectionCase["surface"],
  description: string,
  override: Record<string, unknown>,
): ParserRejectionCase {
  return {
    caseId,
    surface,
    description,
    input: () => ({
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
      approvedTargets: [P16_TARGET_PAYER],
      members: [
        {
          memberId: portfolioMemberId(p16Member(P16_TARGET_PAYER)),
          input: { ...p16Member(P16_TARGET_PAYER), ...override },
          duplicatePressure: 0,
        },
      ],
      portfolioDigest: "pf:sha256:" + "0".repeat(24),
    }),
  };
}

export const PARSER_REJECTION_CASES: readonly ParserRejectionCase[] = [
  {
    caseId: "p16h-rej-doc-array",
    surface: "DOCUMENT_SHAPE",
    description: "array document rejected",
    input: () => [],
  },
  {
    caseId: "p16h-rej-doc-string",
    surface: "DOCUMENT_SHAPE",
    description: "string document rejected",
    input: () => "portfolio",
  },
  {
    caseId: "p16h-rej-doc-null",
    surface: "DOCUMENT_SHAPE",
    description: "null document rejected",
    input: () => null,
  },
  {
    caseId: "p16h-rej-doc-number",
    surface: "DOCUMENT_SHAPE",
    description: "number document rejected",
    input: () => 42,
  },
  mutateValidDocumentCase("p16h-rej-missing-schema-version", (doc) => {
    delete doc.schemaVersion;
  }),
  mutateValidDocumentCase("p16h-rej-missing-approved-targets", (doc) => {
    delete doc.approvedTargets;
  }),
  mutateValidDocumentCase("p16h-rej-missing-members", (doc) => {
    delete doc.members;
  }),
  mutateValidDocumentCase("p16h-rej-missing-digest", (doc) => {
    delete doc.portfolioDigest;
  }),
  mutateValidDocumentCase("p16h-rej-unknown-top-field", (doc) => {
    doc.extraTopLevelField = true;
  }),
  mutateValidDocumentCase("p16h-rej-schema-version-drift", (doc) => {
    doc.schemaVersion = "nightwatch.campaign-portfolio.private.v0";
  }),
  mutateValidDocumentCase("p16h-rej-digest-format-invalid", (doc) => {
    doc.portfolioDigest = "not-a-digest";
  }),
  mutateValidDocumentCase("p16h-rej-digest-value-drift", (doc) => {
    doc.portfolioDigest = "pf:sha256:" + "0".repeat(24);
  }),
  mutateValidDocumentCase("p16h-rej-approved-duplicates", (doc) => {
    doc.approvedTargets = [
      P16_TARGET_PAYER,
      P16_TARGET_PAYER,
    ];
  }),
  mutateValidDocumentCase("p16h-rej-approved-sentinel", (doc) => {
    doc.approvedTargets = ["CUSTOMER_SENTINEL"];
  }),
  mutateValidDocumentCase("p16h-rej-member-not-record", (doc) => {
    doc.members = ["not-a-member"];
  }),
  mutateValidDocumentCase("p16h-rej-member-id-bad-pattern", (doc) => {
    firstMember(doc).memberId = "pm:not-a-digest";
  }),
  mutateValidDocumentCase("p16h-rej-member-wrapper-unknown-field", (doc) => {
    firstMember(doc).extraWrapperField = true;
  }),
  mutateValidDocumentCase("p16h-rej-member-input-unknown-field", (doc) => {
    firstMemberInput(doc).extraInputField = true;
  }),
  mutateValidDocumentCase("p16h-rej-member-input-missing-field", (doc) => {
    delete firstMemberInput(doc).targetId;
  }),
  makeDirectInputCase(
    "p16h-rej-kind-invalid",
    "FIELD_ENUM",
    "kind REPRODUCTION rejected",
    { kind: "REPRODUCTION" },
  ),
  makeDirectInputCase(
    "p16h-rej-currentness-invalid",
    "FIELD_ENUM",
    "currentness FRESH rejected",
    { currentness: "FRESH" },
  ),
  makeDirectInputCase(
    "p16h-rej-depth-invalid",
    "FIELD_ENUM",
    "depthClass DEEP rejected",
    { depthClass: "DEEP" },
  ),
  makeDirectInputCase(
    "p16h-rej-cost-invalid",
    "FIELD_ENUM",
    "executionCostClass EXTREME rejected",
    { executionCostClass: "EXTREME" },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-negative",
    "FIELD_NUMERIC",
    "starvationAgeBuckets -1 rejected",
    { starvationAgeBuckets: -1 },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-nan",
    "FIELD_NUMERIC",
    "starvationAgeBuckets NaN rejected",
    { starvationAgeBuckets: Number.NaN },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-infinity",
    "FIELD_NUMERIC",
    "starvationAgeBuckets Infinity rejected",
    { starvationAgeBuckets: Number.POSITIVE_INFINITY },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-fractional",
    "FIELD_NUMERIC",
    "starvationAgeBuckets 1.5 rejected",
    { starvationAgeBuckets: 1.5 },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-string",
    "FIELD_NUMERIC",
    "starvationAgeBuckets '3' rejected",
    { starvationAgeBuckets: "3" },
  ),
  makeDirectInputCase(
    "p16h-rej-starvation-above-max",
    "FIELD_NUMERIC",
    "starvationAgeBuckets 9 above max rejected",
    { starvationAgeBuckets: 9 },
  ),
  makeDirectInputCase(
    "p16h-rej-counter-nan",
    "FIELD_NUMERIC",
    "counter NaN rejected",
    { historicalYield: countersOf({ admittedCount: Number.NaN }) },
  ),
  makeDirectInputCase(
    "p16h-rej-counter-negative",
    "FIELD_NUMERIC",
    "counter negative rejected",
    { historicalYield: countersOf({ admittedCount: -3 }) },
  ),
  makeDirectInputCase(
    "p16h-rej-counter-over-max",
    "FIELD_NUMERIC",
    "counter above max rejected",
    { historicalYield: countersOf({ admittedCount: 100001 }) },
  ),
  makeDirectInputCase(
    "p16h-rej-yield-unknown-field",
    "MEMBER_SHAPE",
    "historicalYield unknown field rejected",
    {
      historicalYield: {
        ...countersOf({}),
        extraCounter: 1,
      },
    },
  ),
  makeDirectInputCase(
    "p16h-rej-evidence-digest-bad-format",
    "IDENTITY",
    "evidence digest format enforced",
    { evidenceDigest: "sha256:notcanon" },
  ),
  {
    caseId: "p16h-rej-scope-sentinel",
    surface: "SENTINEL",
    description: "semanticScope sentinel rejected",
    input: () => ({
      schemaVersion: PORTFOLIO_SCHEMA_VERSION,
      approvedTargets: [P16_TARGET_PAYER],
      members: [
        {
          memberId: portfolioMemberId(p16Member(P16_TARGET_PAYER)),
          input: p16Member(P16_TARGET_PAYER, {
            semanticScope: "EMAIL_SENTINEL",
          }),
          duplicatePressure: 0,
        },
      ],
      portfolioDigest: "pf:sha256:" + "0".repeat(24),
    }),
  },
  makeDirectInputCase(
    "p16h-rej-scope-bad-pattern",
    "MEMBER_SHAPE",
    "semanticScope leading dot rejected",
    { semanticScope: ".leading.dot" },
  ),
  makeDirectInputCase(
    "p16h-rej-blocker-lowercase",
    "MEMBER_SHAPE",
    "owner blocker lowercase rejected",
    { ownerBlockedOperations: ["external_publication"] },
  ),
  makeDirectInputCase(
    "p16h-rej-blocker-not-array",
    "MEMBER_SHAPE",
    "owner blockers non-array rejected",
    { ownerBlockedOperations: "EXTERNAL_PUBLICATION" },
  ),
  makeDirectInputCase(
    "p16h-rej-replayable-string",
    "MEMBER_SHAPE",
    "replayable string rejected",
    { replayable: "true" },
  ),
  makeDirectInputCase(
    "p16h-rej-phase-frozen-number",
    "MEMBER_SHAPE",
    "phaseFrozen number rejected",
    { phaseFrozen: 1 },
  ),
  {
    caseId: "p16h-rej-foreign-target-in-document",
    surface: "UNIVERSE",
    description: "document member target outside its own universe rejected",
    input: mutateValidDocument((doc) => {
      doc.approvedTargets = [P16_TARGET_PAYER];
      const foreign = p16Member(P16_TARGET_COMMON);
      (doc.members as unknown[]).push({
        memberId: portfolioMemberId(foreign),
        input: foreign,
        duplicatePressure: 0,
      });
    }),
  },
];

function mutateValidDocumentCase(
  caseId: string,
  mutator: (document: Record<string, unknown>) => void,
): ParserRejectionCase {
  return {
    caseId,
    surface: "TOP_LEVEL_FIELDS",
    description: caseId,
    input: mutateValidDocument(mutator),
  };
}

function countersOf(
  overrides: Partial<PortfolioMemberInput["historicalYield"]>,
): PortfolioMemberInput["historicalYield"] {
  return counters(overrides);
}

// ------------------------------------------------------------------------------------------------------------
// Manifest tamper cases (H5/E-matrix): every mutation must fail closed under
// the strict manifest parser.
// ------------------------------------------------------------------------------------------------------------

function makeValidManifest(): CampaignPlanManifest {
  const portfolio = buildPortfolio({
    approvedTargets: [
      P16_TARGET_PAYER,
      P16_TARGET_COMMON,
      P16_TARGET_INVENTORY,
    ],
    memberInputs: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "p16h.manifest.one" }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "p16h.manifest.two",
        depthClass: "SHAPE",
      }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "p16h.manifest.stale",
        currentness: "STALE" as const,
      }),
    ],
  });
  // Budget funds only the top-ranked member so the document carries BOTH
  // unselected classes (budget-exhausted eligible + zero-budget gate) and
  // reordering mutations are observable.
  const policy: PortfolioBudgetPolicy = {
    policyVersion: PORTFOLIO_ALLOCATION_VERSION,
    totalUnits: 3,
    perMemberCeiling: 3,
    floorUnits: 2,
    starvationThresholdBuckets: 5,
    retryCeilingPerMember: 1,
    reservedExplorationUnits: 0,
  };
  const allocation = allocatePortfolioBudget({ portfolio, policy });
  return buildCampaignPlanManifest({ portfolio, allocation });
}

export interface ManifestTamperCase {
  readonly caseId: string;
  readonly description: string;
  readonly mutate: (manifest: CampaignPlanManifest) => unknown;
}

export const MANIFEST_TAMPER_CASES: readonly ManifestTamperCase[] = [
  {
    caseId: "p16h-man-unknown-top-field",
    description: "unknown top-level field rejected",
    mutate: (manifest) => ({ ...manifest, extraField: true }),
  },
  {
    caseId: "p16h-man-wrong-manifest-version",
    description: "wrong manifestVersion rejected",
    mutate: (manifest) => ({
      ...manifest,
      manifestVersion: "nightwatch.campaign-plan-manifest.v0",
    }),
  },
  {
    caseId: "p16h-man-plan-id-tampered",
    description: "valid-format wrong planId rejected by recomputation",
    mutate: (manifest) => ({
      ...manifest,
      planId: "plan:sha256:" + "f".repeat(24),
    }),
  },
  {
    caseId: "p16h-man-manifest-digest-tampered",
    description: "valid-format wrong manifestDigest rejected",
    mutate: (manifest) => ({
      ...manifest,
      manifestDigest: "plan:sha256:" + "e".repeat(24),
    }),
  },
  {
    caseId: "p16h-man-budget-tampered",
    description: "allocated units tampered without digest update rejected",
    mutate: (manifest) => ({
      ...manifest,
      totalAllocatedUnits: manifest.totalAllocatedUnits + 100,
    }),
  },
  {
    caseId: "p16h-man-created-at-basis-changed",
    description: "createdAtBasis drift rejected",
    mutate: (manifest) => ({
      ...manifest,
      createdAtBasis: "WALL_CLOCK_STAMPED",
    }),
  },
  {
    caseId: "p16h-man-owner-scope-weakened",
    description: "weakened owner scope rejected",
    mutate: (manifest) => ({
      ...manifest,
      ownerScopeRequirements: {
        ...manifest.ownerScopeRequirements,
        planningPhaseExecutionAuthority: "IMPLICIT",
      },
    }),
  },
  {
    caseId: "p16h-man-checkpoint-policy-weakened",
    description: "checkpoint requirement dropped rejected",
    mutate: (manifest) => ({
      ...manifest,
      checkpointPolicy: {
        checkpointAfterEveryWorkItem: true,
        resumeRequiresFingerprintMatch: false,
        interruptedWorkBookkeepingRequired: true,
      },
    }),
  },
  {
    caseId: "p16h-man-selected-member-unknown-field",
    description: "unknown field inside selected member rejected",
    mutate: (manifest) => ({
      ...manifest,
      selectedMembers: manifest.selectedMembers.map((member) => ({
        ...member,
        extraMemberField: 1,
      })),
    }),
  },
  {
    caseId: "p16h-man-unselected-reordered-desc",
    description: "unselected members reordered descending rejected",
    mutate: (manifest) => ({
      ...manifest,
      unselectedMembers: [...manifest.unselectedMembers].reverse(),
    }),
  },
];

// ------------------------------------------------------------------------------------------------------------
// Budget-policy invalid cases (C12 extension).
// ------------------------------------------------------------------------------------------------------------

export interface PolicyInvalidCase {
  readonly caseId: string;
  readonly description: string;
  readonly overrides: Record<string, unknown>;
}

export const POLICY_INVALID_CASES: readonly PolicyInvalidCase[] = [
  {
    caseId: "p16h-pol-ceiling-zero",
    description: "perMemberCeiling 0 rejected",
    overrides: { perMemberCeiling: 0 },
  },
  {
    caseId: "p16h-pol-floor-exceeds-ceiling",
    description: "floorUnits above ceiling rejected",
    overrides: { floorUnits: 5, perMemberCeiling: 4 },
  },
  {
    caseId: "p16h-pol-reserve-exceeds-total",
    description: "reserve above total rejected",
    overrides: { reservedExplorationUnits: 11, totalUnits: 10 },
  },
  {
    caseId: "p16h-pol-negative-total",
    description: "negative totalUnits rejected",
    overrides: { totalUnits: -1 },
  },
  {
    caseId: "p16h-pol-nan-total",
    description: "NaN totalUnits rejected",
    overrides: { totalUnits: Number.NaN },
  },
  {
    caseId: "p16h-pol-fractional-floor",
    description: "fractional floorUnits rejected",
    overrides: { floorUnits: 1.5 },
  },
  {
    caseId: "p16h-pol-negative-retry-ceiling",
    description: "negative retryCeilingPerMember rejected",
    overrides: { retryCeilingPerMember: -1 },
  },
  {
    caseId: "p16h-pol-infinity-ceiling",
    description: "Infinity perMemberCeiling rejected",
    overrides: { perMemberCeiling: Number.POSITIVE_INFINITY },
  },
];

// ------------------------------------------------------------------------------------------------------------
// Simulator model edges (H7/G03): malformed models must fail closed instead of
// fabricating negative/garbage useful-candidate counts.
// ------------------------------------------------------------------------------------------------------------

function baseModel(): MemberYieldModel {
  return {
    memberId: "pm:sha256:" + "a".repeat(24),
    saturationCap: 4,
    halfSaturationUnits: 2,
    duplicateWastePermille: 300,
    yieldsNothing: false,
  };
}

function modelEdge(
  caseId: string,
  description: string,
  overrides: Record<string, unknown>,
): SimulatorModelEdgeCase {
  return {
    caseId,
    description,
    model: { ...baseModel(), ...overrides } as MemberYieldModel,
  };
}

export interface SimulatorModelEdgeCase {
  readonly caseId: string;
  readonly description: string;
  readonly model: MemberYieldModel;
}

export const SIM_MODEL_EDGES: readonly SimulatorModelEdgeCase[] = [
  modelEdge("p16h-sim-cap-negative", "negative saturationCap fails closed", {
    saturationCap: -5,
  }),
  modelEdge("p16h-sim-cap-nan", "NaN saturationCap fails closed", {
    saturationCap: Number.NaN,
  }),
  modelEdge("p16h-sim-cap-fractional", "fractional saturationCap fails closed", {
    saturationCap: 2.5,
  }),
  modelEdge(
    "p16h-sim-cap-infinity",
    "infinite saturationCap fails closed",
    { saturationCap: Number.POSITIVE_INFINITY },
  ),
  modelEdge(
    "p16h-sim-halfsat-negative",
    "negative halfSaturationUnits fails closed",
    { halfSaturationUnits: -2 },
  ),
  modelEdge(
    "p16h-sim-waste-negative",
    "negative duplicateWastePermille fails closed",
    { duplicateWastePermille: -1 },
  ),
  modelEdge(
    "p16h-sim-waste-above-thousand",
    "duplicateWastePermille above 1000 fails closed",
    { duplicateWastePermille: 1001 },
  ),
  modelEdge(
    "p16h-sim-yieldsnothing-string",
    "non-boolean yieldsNothing fails closed",
    { yieldsNothing: "yes" },
  ),
];

// ------------------------------------------------------------------------------------------------------------
// Replan transition matrix (SPEC H6 rows; executed explicitly in tests).
// ------------------------------------------------------------------------------------------------------------

export const REPLAN_MATRIX_ROW_IDS = [
  "unchanged-source-evidence",
  "sha-only-movement-selected",
  "compatible-evidence-movement-selected",
  "breaking-contract-movement-selected",
  "derivation-version-change-selected",
  "authority-change-snapshot",
  "stale-currentness-selected-target",
  "unavailable-currentness-selected-target",
  "contract-change-unselected-member",
  "derivation-change-unselected-member",
  "incompatible-snapshot-change",
  "registry-removal-via-unavailability",
  "registry-removal-via-authority-event",
  "mixed-signals-authority-dominates",
] as const;

export type ReplanMatrixRowId = (typeof REPLAN_MATRIX_ROW_IDS)[number];

export const PHASE16_CORPUS_IDENTITY = {
  corpusVersion: "nightwatch.portfolio-hardening-fixtures.v16h1",
  inheritedCatalog: "corpus/phase16a/portfolioFixtures.ts",
  minimumScenarioFloor: 80,
  minimumDeterministicRepeats: 3,
} as const;
