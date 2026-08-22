// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — deterministic portfolio/scenario fixture corpus
// (ACCEPTANCE MATRIX F: >= 50 fixtures).
//
// Pure builders for every required scenario family: stale, unavailable,
// blocked (owner policy), phase-frozen, evidence-missing, not-evaluated,
// source-moved (SHA-only AND evidence-changed), contract/derivation-change,
// authority-change, high-duplicate, starved, partial-coverage, replayable,
// non-replayable, equal-score ties, and budget pressure.
//
// Every value is a synthetic structural fake: no credentials, no customer
// data, no wall-clock timestamps, no fs/network/environment access. Builders
// never randomize; calling any of them twice yields deep-equal results.
//
// Fixture targets reuse the REAL approved read-only Ripple target ids where a
// realistic identity is needed, plus clearly-namespaced synthetic ids
// (matching the established corpus convention) where extra volume is needed.
// ---------------------------------------------------------------------------

import type {
  PortfolioMemberInput,
  PortfolioYieldCounters,
} from "../../src/core/portfolio/types";
import {
  PORTFOLIO_SCHEMA_VERSION,
  buildPortfolio,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import type { PortfolioPreviousProvenance } from "../../src/core/portfolio/scoring";

/** Corpus identity version. */
export const PHASE16A_FIXTURE_VERSION =
  "nightwatch.portfolio-fixtures.v1" as const;

// ---------------------------------------------------------------------------
// Fixed synthetic identities.
// ---------------------------------------------------------------------------

export const P16_TARGET_PAYER = "ripple.payer-exchange.read";
export const P16_TARGET_COMMON = "ripple.common-exchange.read";
export const P16_TARGET_INVENTORY = "ripple.account-inventory.read";
export const P16_SYNTH_EXTRA_1 = "phase16a.synthetic-extra.one.read";
export const P16_SYNTH_EXTRA_2 = "phase16a.synthetic-extra.two.read";
export const P16_SYNTH_EXTRA_3 = "phase16a.synthetic-extra.three.read";

export const P16_APPROVED_BASE: readonly string[] = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_TARGET_INVENTORY,
];

export const P16_APPROVED_EXTENDED: readonly string[] = [
  ...P16_APPROVED_BASE,
  P16_SYNTH_EXTRA_1,
  P16_SYNTH_EXTRA_2,
  P16_SYNTH_EXTRA_3,
];

/** Synthetic 40-hex source SHAs. */
export const P16_SHA_A = "c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1";
export const P16_SHA_B = "d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2";

/** ev:sha256:<24> synthetic evidence digests. */
export const P16_EV_A = "ev:sha256:aabbccddeeff001122334455";
export const P16_EV_B = "ev:sha256:1122334455aabbccddeeff00";

export const P16_DERIVATION_V1 = "nightwatch.real-source-derivation.v1";
export const P16_DERIVATION_V2 = "nightwatch.real-source-derivation.v2";
export const P16_CONTRACT_V1 = "nightwatch.phase10b-contract.v1";
export const P16_CONTRACT_V2 = "nightwatch.phase10b-contract.v2";

function counters(
  overrides: Partial<PortfolioYieldCounters> = {},
): PortfolioYieldCounters {
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

type MemberOverrides = Partial<
  Omit<PortfolioMemberInput, "historicalYield">
> & {
  readonly historicalYield?: Partial<PortfolioYieldCounters>;
};

/** Deterministic member-input builder with sane defaults (CURRENT/eligible). */
export function p16Member(
  targetId: string,
  overrides: MemberOverrides = {},
): PortfolioMemberInput {
  const { historicalYield, ...rest } = overrides;
  return {
    targetId,
    journeyId: null,
    kind: "API",
    semanticScope: `${targetId}.scope`,
    currentness: "CURRENT",
    sourceSha: P16_SHA_A,
    evidenceDigest: P16_EV_A,
    derivationVersion: P16_DERIVATION_V2,
    contractVersion: P16_CONTRACT_V1,
    depthClass: "TYPE",
    replayable: true,
    executionCostClass: "LOW",
    starvationAgeBuckets: 0,
    ownerBlockedOperations: [],
    phaseFrozen: false,
    ...rest,
    historicalYield: counters(historicalYield ?? {}),
  };
}

/** Previous provenance matching p16Member defaults (no movement baseline). */
export function p16BaselineProvenance(): PortfolioPreviousProvenance {
  return {
    sourceSha: P16_SHA_A,
    evidenceDigest: P16_EV_A,
    derivationVersion: P16_DERIVATION_V2,
    contractVersion: P16_CONTRACT_V1,
  };
}

// ---------------------------------------------------------------------------
// Scenario fixtures.
// ---------------------------------------------------------------------------

export const P16_FIXTURE_CATEGORIES = [
  "STALE",
  "SOURCE_UNAVAILABLE",
  "OWNER_BLOCKED",
  "PHASE_FROZEN",
  "EVIDENCE_MISSING",
  "NOT_EVALUATED",
  "SHA_ONLY_MOVEMENT",
  "EVIDENCE_CHANGED_MOVEMENT",
  "CONTRACT_CHANGE",
  "DERIVATION_CHANGE",
  "AUTHORITY_CHANGE",
  "HIGH_DUPLICATE",
  "STARVED",
  "PARTIAL_COVERAGE",
  "REPLAYABLE",
  "NON_REPLAYABLE",
  "EQUAL_SCORE_TIE",
  "BUDGET_PRESSURE",
] as const;

export type Phase16aFixtureCategory = (typeof P16_FIXTURE_CATEGORIES)[number];

export interface PortfolioScenarioFixture {
  readonly fixtureId: string;
  readonly category: Phase16aFixtureCategory;
  /** Categorical one-line summary (safe tokens only). */
  readonly summary: string;
  readonly approvedTargets: readonly string[];
  readonly memberInputs: readonly PortfolioMemberInput[];
  /** Previous provenance per memberId for movement classification. */
  readonly previousProvenance?: Readonly<
    Record<string, PortfolioPreviousProvenance>
  >;
}

let fixtureSeq = 0;
function fixtureId(category: string, tag: string): string {
  fixtureSeq += 1;
  return `p16-${String(fixtureSeq).padStart(3, "0")}-${category.toLowerCase()}-${tag}`;
}

// --- STALE (5) ---------------------------------------------------------------
const staleFixtures: PortfolioScenarioFixture[] = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_TARGET_INVENTORY,
  P16_SYNTH_EXTRA_1,
  P16_SYNTH_EXTRA_2,
].map((target, index) => ({
  fixtureId: fixtureId("STALE", `m${index + 1}`),
  category: "STALE" as const,
  summary: "CURRENTNESS_STALE_MEMBER_FAILS_CLOSED",
  approvedTargets: [target],
  memberInputs: [p16Member(target, { currentness: "STALE" })],
}));

// --- SOURCE_UNAVAILABLE (4) --------------------------------------------------
const unavailableFixtures: PortfolioScenarioFixture[] = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_SYNTH_EXTRA_1,
  P16_SYNTH_EXTRA_2,
].map((target, index) => ({
  fixtureId: fixtureId("SOURCE_UNAVAILABLE", `m${index + 1}`),
  category: "SOURCE_UNAVAILABLE" as const,
  summary: "SOURCE_UNAVAILABLE_MEMBER_FAILS_CLOSED",
  approvedTargets: [target],
  memberInputs: [p16Member(target, { currentness: "SOURCE_UNAVAILABLE" })],
}));

// --- OWNER_BLOCKED (5) -------------------------------------------------------
const OWNER_BLOCKER_SAMPLES: readonly (readonly string[])[] = [
  ["DYNAMODB_DATA_ORACLE"],
  ["BIGQUERY_DATA_ORACLE"],
  ["SPANNER_DATA_ORACLE"],
  ["EXTERNAL_PUBLICATION"],
  ["AWS_IAM_INFRA_DISCOVERY"],
];
const ownerBlockedFixtures: PortfolioScenarioFixture[] =
  OWNER_BLOCKER_SAMPLES.map((blockers, index) => ({
    fixtureId: fixtureId("OWNER_BLOCKED", `m${index + 1}`),
    category: "OWNER_BLOCKED" as const,
    summary: "OWNER_POLICY_BLOCKED_HARD_GATE_ZERO_BUDGET",
    approvedTargets: [P16_APPROVED_BASE[index % P16_APPROVED_BASE.length]!],
    memberInputs: [
      p16Member(P16_APPROVED_BASE[index % P16_APPROVED_BASE.length]!, {
        ownerBlockedOperations: [...blockers],
        // Deliberately strong positive factors: the gate must still dominate.
        depthClass: "TYPE_COLLECTION",
        historicalYield: counters({ distinctClusterCount: 9 }),
        starvationAgeBuckets: 8,
      }),
    ],
  }));

// --- PHASE_FROZEN (3) --------------------------------------------------------
const phaseFrozenFixtures: PortfolioScenarioFixture[] = [0, 1, 2].map(
  (index) => ({
    fixtureId: fixtureId("PHASE_FROZEN", `m${index + 1}`),
    category: "PHASE_FROZEN" as const,
    summary: "FROZEN_PROGRAM_BOUNDARY_MEMBER_UNSELECTABLE",
    approvedTargets: [P16_APPROVED_BASE[index]!],
    memberInputs: [
      p16Member(P16_APPROVED_BASE[index]!, {
        kind: "EXPLORATION",
        phaseFrozen: true,
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 8,
      }),
    ],
  }),
);

// --- EVIDENCE_MISSING (3) ----------------------------------------------------
const evidenceMissingFixtures: PortfolioScenarioFixture[] = [0, 1, 2].map(
  (index) => ({
    fixtureId: fixtureId("EVIDENCE_MISSING", `m${index + 1}`),
    category: "EVIDENCE_MISSING" as const,
    summary: "DEPTH_WITHOUT_EVIDENCE_FAILS_CLOSED",
    approvedTargets: [P16_APPROVED_BASE[index]!],
    memberInputs: [
      p16Member(P16_APPROVED_BASE[index]!, {
        evidenceDigest: null,
        derivationVersion: null,
        contractVersion: null,
      }),
    ],
  }),
);

// --- NOT_EVALUATED (3) -------------------------------------------------------
const notEvaluatedFixtures: PortfolioScenarioFixture[] = [0, 1, 2].map(
  (index) => ({
    fixtureId: fixtureId("NOT_EVALUATED", `m${index + 1}`),
    category: "NOT_EVALUATED" as const,
    summary: "UNEVALUATED_CURRENTNESS_FAILS_CLOSED",
    approvedTargets: [P16_APPROVED_BASE[index]!],
    memberInputs: [
      p16Member(P16_APPROVED_BASE[index]!, { currentness: "NOT_EVALUATED" }),
    ],
  }),
);

// --- SHA_ONLY_MOVEMENT (4) ---------------------------------------------------
// One single-member fixture per moved-SHA member: identical evidence with a
// different source SHA must classify SHA_ONLY_NO_EVIDENCE_CHANGE.
const shaOnlyFixtures: PortfolioScenarioFixture[] = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_SYNTH_EXTRA_1,
  P16_SYNTH_EXTRA_2,
].map((target, index) => {
  const member = p16Member(target, {
    sourceSha: P16_SHA_B,
    semanticScope: `sha-only.scope.${index + 1}`,
  });
  return {
    fixtureId: fixtureId("SHA_ONLY_MOVEMENT", `m${index + 1}`),
    category: "SHA_ONLY_MOVEMENT" as const,
    summary: "MOVED_SHA_UNCHANGED_EVIDENCE_NO_FALSE_NOVELTY",
    approvedTargets: [target],
    memberInputs: [member],
    previousProvenance: {
      [portfolioMemberId(member)]: p16BaselineProvenance(),
    },
  };
});

// --- EVIDENCE_CHANGED_MOVEMENT (4) -------------------------------------------
const evidenceChangedFixtures: PortfolioScenarioFixture[] = [0, 1, 2, 3].map(
  (index) => {
    const target = [
      P16_TARGET_PAYER,
      P16_TARGET_COMMON,
      P16_SYNTH_EXTRA_1,
      P16_SYNTH_EXTRA_2,
    ][index]!;
    const member = p16Member(target, {
      sourceSha: P16_SHA_B,
      evidenceDigest: P16_EV_B,
      semanticScope: `evidence-changed.scope.${index + 1}`,
    });
    return {
      fixtureId: fixtureId("EVIDENCE_CHANGED_MOVEMENT", `m${index + 1}`),
      category: "EVIDENCE_CHANGED_MOVEMENT" as const,
      summary: "CHANGED_EVIDENCE_RAISES_MOVEMENT_RELEVANCE",
      approvedTargets: [target],
      memberInputs: [member],
      previousProvenance: {
        [portfolioMemberId(member)]: p16BaselineProvenance(),
      },
    };
  },
);

// --- CONTRACT_CHANGE (3) ------------------------------------------------------
const contractChangeFixtures: PortfolioScenarioFixture[] = [0, 1, 2].map(
  (index) => {
    const member = p16Member(P16_APPROVED_BASE[index]!, {
      contractVersion: P16_CONTRACT_V2,
      semanticScope: `contract-change.scope.${index + 1}`,
    });
    return {
      fixtureId: fixtureId("CONTRACT_CHANGE", `m${index + 1}`),
      category: "CONTRACT_CHANGE" as const,
      summary: "CONTRACT_CHANGE_INVALIDATES_PRIOR_PLAN",
      approvedTargets: [P16_APPROVED_BASE[index]!],
      memberInputs: [member],
      previousProvenance: {
        [portfolioMemberId(member)]: p16BaselineProvenance(),
      },
    };
  },
);

// --- DERIVATION_CHANGE (3) ----------------------------------------------------
const derivationChangeFixtures: PortfolioScenarioFixture[] = [0, 1, 2].map(
  (index) => {
    const member = p16Member(P16_APPROVED_BASE[index]!, {
      derivationVersion: P16_DERIVATION_V1,
      semanticScope: `derivation-change.scope.${index + 1}`,
    });
    return {
      fixtureId: fixtureId("DERIVATION_CHANGE", `m${index + 1}`),
      category: "DERIVATION_CHANGE" as const,
      summary: "DERIVATION_CHANGE_INVALIDATES_PRIOR_PLAN",
      approvedTargets: [P16_APPROVED_BASE[index]!],
      memberInputs: [member],
      previousProvenance: {
        [portfolioMemberId(member)]: p16BaselineProvenance(),
      },
    };
  },
);

// --- AUTHORITY_CHANGE (2) -----------------------------------------------------
const authorityChangeFixtures: PortfolioScenarioFixture[] = [
  {
    tag: "expansion",
    summary: "APPROVED_SET_EXPANSION_IS_AUTHORITY_EVENT",
    approved: P16_APPROVED_EXTENDED,
    members: [p16Member(P16_SYNTH_EXTRA_1)],
  },
  {
    tag: "revocation",
    summary: "APPROVED_SET_REVOCATION_IS_AUTHORITY_EVENT",
    approved: [P16_TARGET_COMMON],
    members: [p16Member(P16_TARGET_COMMON)],
  },
].map(({ tag, summary, approved, members }) => ({
  fixtureId: fixtureId("AUTHORITY_CHANGE", tag),
  category: "AUTHORITY_CHANGE" as const,
  summary,
  approvedTargets: approved,
  memberInputs: members,
}));

// --- HIGH_DUPLICATE (6) --------------------------------------------------------
const highDuplicateMembers = [0, 1, 2, 3, 4, 5].map((index) =>
  p16Member(P16_APPROVED_EXTENDED[index % P16_APPROVED_EXTENDED.length]!, {
    semanticScope: "shared.duplicate-scope",
    kind: index === 5 ? "EXPLORATION" : "API",
  }),
);
const highDuplicateFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("HIGH_DUPLICATE", "sextet-shared-scope"),
  category: "HIGH_DUPLICATE",
  summary: "SHARED_SCOPE_MEMBERS_SUPPRESS_EACH_OTHER",
  approvedTargets: P16_APPROVED_EXTENDED,
  memberInputs: highDuplicateMembers,
};

// --- STARVED (5) ----------------------------------------------------------------
const starvedMembers = [0, 1, 2, 3, 4].map((index) =>
  p16Member(P16_APPROVED_EXTENDED[index % P16_APPROVED_EXTENDED.length]!, {
    starvationAgeBuckets: 6 + (index % 3),
    semanticScope: `starved.scope.${index + 1}`,
  }),
);
const starvedFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("STARVED", "quintet-old-buckets"),
  category: "STARVED",
  summary: "OLD_MEMBERS_RECEIVE_FLOOR_WITHOUT_OVERRIDING_GATES",
  approvedTargets: P16_APPROVED_EXTENDED,
  memberInputs: starvedMembers,
};

// --- PARTIAL_COVERAGE (4) --------------------------------------------------------
const coverageDepths = [
  "NONE",
  "SHAPE",
  "COLLECTION",
  "SHAPE_COLLECTION",
] as const;
const partialCoverageMembers = coverageDepths.map((depthClass, index) =>
  p16Member(P16_APPROVED_EXTENDED[index % P16_APPROVED_EXTENDED.length]!, {
    depthClass,
    // NONE-depth members may omit derivation evidence entirely.
    ...(depthClass === "NONE"
      ? { evidenceDigest: null, derivationVersion: null, contractVersion: null }
      : {}),
    semanticScope: `coverage.scope.${index + 1}`,
  }),
);
const partialCoverageFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("PARTIAL_COVERAGE", "depth-ladder"),
  category: "PARTIAL_COVERAGE",
  summary: "MIXED_SEMANTIC_DEPTH_LADDER_SCORES_MONOTONICALLY",
  approvedTargets: P16_APPROVED_EXTENDED,
  memberInputs: partialCoverageMembers,
};

// --- REPLAYABLE / NON_REPLAYABLE (2 + 2) ------------------------------------------
const replayablePairFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("REPLAYABLE", "pair"),
  category: "REPLAYABLE",
  summary: "REPLAYABLE_MEMBERS_GAIN_REPLAYABILITY_FACTOR",
  approvedTargets: [P16_TARGET_PAYER, P16_TARGET_COMMON],
  memberInputs: [
    p16Member(P16_TARGET_PAYER, {
      semanticScope: "replay.yes.one",
      replayable: true,
    }),
    p16Member(P16_TARGET_COMMON, {
      semanticScope: "replay.yes.two",
      replayable: true,
    }),
  ],
};
const nonReplayablePairFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("NON_REPLAYABLE", "pair"),
  category: "NON_REPLAYABLE",
  summary: "NON_REPLAYABLE_MEMBERS_LOSE_REPLAYABILITY_FACTOR",
  approvedTargets: [P16_TARGET_INVENTORY, P16_SYNTH_EXTRA_1],
  memberInputs: [
    p16Member(P16_TARGET_INVENTORY, {
      semanticScope: "replay.no.one",
      replayable: false,
    }),
    p16Member(P16_SYNTH_EXTRA_1, {
      semanticScope: "replay.no.two",
      replayable: false,
    }),
  ],
};

// --- EQUAL_SCORE_TIE (4) -----------------------------------------------------------
// Four structurally IDENTICAL members on distinct targets: scores must tie
// exactly and allocation order must fall back to memberId ascending.
const equalScoreMembers = [
  P16_TARGET_PAYER,
  P16_TARGET_COMMON,
  P16_TARGET_INVENTORY,
  P16_SYNTH_EXTRA_1,
].map((target) => p16Member(target, { semanticScope: "tie.shared-scope" }));
const equalScoreTieFixture: PortfolioScenarioFixture = {
  fixtureId: fixtureId("EQUAL_SCORE_TIE", "quartet-identical"),
  category: "EQUAL_SCORE_TIE",
  summary: "IDENTICAL_INPUTS_TIE_AND_BREAK_BY_MEMBER_ID",
  approvedTargets: [
    P16_TARGET_PAYER,
    P16_TARGET_COMMON,
    P16_TARGET_INVENTORY,
    P16_SYNTH_EXTRA_1,
  ],
  memberInputs: equalScoreMembers,
};

// --- BUDGET_PRESSURE (5) -------------------------------------------------------------
const budgetPressureBase: readonly PortfolioScenarioFixture[] = [
  {
    tag: "zero-total",
    totalHint: "TOTAL_UNITS=0_NO_MEMBER_RECEIVES_BUDGET",
    members: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "pressure.zero.a" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "pressure.zero.b" }),
    ],
  },
  {
    tag: "one-unit-total",
    totalHint: "TOTAL_UNITS=1_FORCE_TOP_PRIORITY_ONLY",
    members: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "pressure.a",
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 8,
      }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "pressure.b" }),
      p16Member(P16_TARGET_INVENTORY, { semanticScope: "pressure.c" }),
    ],
  },
  {
    tag: "reserve-squeeze",
    totalHint: "RESERVE_SQUEEZES_NON_EXPLORATION_ALLOCATION",
    members: [
      p16Member(P16_TARGET_PAYER, { semanticScope: "reserve.api.one" }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "reserve.api.two" }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "reserve.explore",
        kind: "EXPLORATION",
      }),
    ],
  },
  {
    tag: "ceiling-tight",
    totalHint: "PER_MEMBER_CEILING_BINDS_BEFORE_TOTAL",
    members: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "ceiling.one",
        depthClass: "TYPE_COLLECTION",
        starvationAgeBuckets: 4,
      }),
      p16Member(P16_TARGET_COMMON, { semanticScope: "ceiling.two" }),
    ],
  },
  {
    tag: "starve-vs-budget",
    totalHint: "FLOOR_DEMAND_EXCEEDS_AVAILABLE_UNITS",
    members: [
      p16Member(P16_TARGET_PAYER, {
        semanticScope: "floor.one",
        starvationAgeBuckets: 7,
      }),
      p16Member(P16_TARGET_COMMON, {
        semanticScope: "floor.two",
        starvationAgeBuckets: 8,
      }),
      p16Member(P16_TARGET_INVENTORY, {
        semanticScope: "floor.three",
        starvationAgeBuckets: 6,
      }),
    ],
  },
].map(({ tag, totalHint, members }) => ({
  fixtureId: fixtureId("BUDGET_PRESSURE", tag),
  category: "BUDGET_PRESSURE" as const,
  summary: totalHint,
  approvedTargets: P16_APPROVED_BASE,
  memberInputs: members,
}));
const budgetPressureFixtures = budgetPressureBase;

// ---------------------------------------------------------------------------
// Catalog.
// ---------------------------------------------------------------------------

/** All fixtures, deterministically ordered by fixtureId. */
export function listPhase16aScenarioFixtures(): readonly PortfolioScenarioFixture[] {
  return [
    ...staleFixtures,
    ...unavailableFixtures,
    ...ownerBlockedFixtures,
    ...phaseFrozenFixtures,
    ...evidenceMissingFixtures,
    ...notEvaluatedFixtures,
    ...shaOnlyFixtures,
    ...evidenceChangedFixtures,
    ...contractChangeFixtures,
    ...derivationChangeFixtures,
    ...authorityChangeFixtures,
    highDuplicateFixture,
    starvedFixture,
    partialCoverageFixture,
    replayablePairFixture,
    nonReplayablePairFixture,
    equalScoreTieFixture,
    ...budgetPressureFixtures,
  ].sort((left, right) => left.fixtureId.localeCompare(right.fixtureId));
}

/** Build a validated portfolio from one fixture (fail closed). */
export function buildFixturePortfolio(fixture: PortfolioScenarioFixture) {
  return buildPortfolio({
    approvedTargets: fixture.approvedTargets,
    memberInputs: fixture.memberInputs,
  });
}

/** Full demo portfolio used by operator tooling (--demo): mixed universe. */
export function buildDemoPortfolioInput(): {
  readonly schemaVersion: typeof PORTFOLIO_SCHEMA_VERSION;
  readonly approvedTargets: readonly string[];
  readonly memberInputs: readonly PortfolioMemberInput[];
} {
  return {
    schemaVersion: PORTFOLIO_SCHEMA_VERSION,
    approvedTargets: P16_APPROVED_EXTENDED,
    memberInputs: [
      p16Member(P16_TARGET_PAYER, {
        journeyId: "ripple-payer-exchange-read",
        kind: "JOURNEY",
        depthClass: "TYPE_COLLECTION",
        historicalYield: counters({
          admittedCount: 9,
          reproducedCount: 4,
          minimizedCount: 3,
          distinctClusterCount: 4,
          dossierReadyCount: 2,
          duplicateMerges: 2,
          invalidOrTransient: 1,
          executionsTotal: 40,
        }),
      }),
      p16Member(P16_TARGET_COMMON, {
        journeyId: "ripple-common-exchange-read",
        kind: "JOURNEY",
        depthClass: "SHAPE_COLLECTION",
        starvationAgeBuckets: 6,
        historicalYield: counters({
          admittedCount: 5,
          reproducedCount: 2,
          minimizedCount: 1,
          distinctClusterCount: 2,
          dossierReadyCount: 1,
          duplicateMerges: 3,
          invalidOrTransient: 2,
          executionsTotal: 30,
        }),
      }),
      p16Member(P16_TARGET_INVENTORY, {
        journeyId: "ripple-account-inventory",
        kind: "JOURNEY",
        depthClass: "SHAPE",
        historicalYield: counters({
          admittedCount: 3,
          distinctClusterCount: 1,
          duplicateMerges: 2,
          invalidOrTransient: 2,
          executionsTotal: 18,
        }),
      }),
      p16Member(P16_SYNTH_EXTRA_1, { kind: "API", depthClass: "TYPE" }),
      p16Member(P16_SYNTH_EXTRA_2, {
        kind: "API",
        depthClass: "NONE",
        evidenceDigest: null,
        derivationVersion: null,
        contractVersion: null,
        starvationAgeBuckets: 4,
      }),
      p16Member(P16_SYNTH_EXTRA_3, {
        kind: "EXPLORATION",
        depthClass: "COLLECTION",
      }),
    ],
  };
}
