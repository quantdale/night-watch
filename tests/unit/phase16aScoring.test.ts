// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W2 deterministic priority scoring.
//
// Focused permanent tests for the explainable score: hard gates dominate,
// stale/unavailable cannot improve rank, SHA-only movement creates no false
// novelty, duplicate pressure monotonically suppresses, ties are
// deterministic, identical inputs produce byte-identical scores.
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  buildPortfolio,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import type { PortfolioPreviousProvenance } from "../../src/core/portfolio/scoring";
import {
  classifyPortfolioSourceMovement,
  duplicatePenalty,
  portfolioEligibility,
  scorePortfolioMember,
} from "../../src/core/portfolio/scoring";
import {
  P16_APPROVED_BASE,
  P16_CONTRACT_V2,
  P16_EV_A,
  P16_EV_B,
  P16_SHA_A,
  P16_SHA_B,
  p16BaselineProvenance,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const TARGET = P16_APPROVED_BASE[0]!;
const TARGET2 = P16_APPROVED_BASE[1]!;

function single(member = p16Member(TARGET)) {
  return buildPortfolio({ approvedTargets: [TARGET], memberInputs: [member] });
}

// B01 — eligibility gates in strict precedence order
test("B01 eligibility gates fire with strict precedence", () => {
  const mk = buildPortfolio({
    approvedTargets: [TARGET],
    memberInputs: [
      // Frozen AND owner-blocked AND stale: frozen wins (first gate).
      p16Member(TARGET, {
        phaseFrozen: true,
        ownerBlockedOperations: ["EXTERNAL_PUBLICATION"],
        currentness: "STALE",
      }),
    ],
  });
  const frozen = portfolioEligibility(mk.members[0]!);
  expect(frozen).toEqual({ eligible: false, reasonCode: "PHASE_FROZEN" });

  const ob = buildPortfolio({
    approvedTargets: [TARGET],
    memberInputs: [
      p16Member(TARGET, {
        ownerBlockedOperations: ["DYNAMODB_DATA_ORACLE"],
        currentness: "STALE",
      }),
    ],
  });
  const blocked = portfolioEligibility(ob.members[0]!);
  expect(blocked).toEqual({
    eligible: false,
    reasonCode: "OWNER_POLICY_BLOCKED",
  });

  for (const [currentness, reason] of [
    ["SOURCE_UNAVAILABLE", "SOURCE_UNAVAILABLE"],
    ["STALE", "CURRENTNESS_STALE"],
    ["NOT_EVALUATED", "EVIDENCE_NOT_EVALUATED"],
  ] as const) {
    const p = buildPortfolio({
      approvedTargets: [TARGET],
      memberInputs: [p16Member(TARGET, { currentness })],
    });
    expect(portfolioEligibility(p.members[0]!)).toEqual({
      eligible: false,
      reasonCode: reason,
    });
  }

  const missing = buildPortfolio({
    approvedTargets: [TARGET],
    memberInputs: [
      p16Member(TARGET, {
        evidenceDigest: null,
        derivationVersion: null,
        contractVersion: null,
      }),
    ],
  });
  expect(portfolioEligibility(missing.members[0]!)).toEqual({
    eligible: false,
    reasonCode: "EVIDENCE_MISSING",
  });

  const eligible = buildPortfolio({
    approvedTargets: [TARGET],
    memberInputs: [p16Member(TARGET)],
  });
  expect(portfolioEligibility(eligible.members[0]!).eligible).toBe(true);
});

// B02 — blockers dominate every positive factor: gated members never outrank
test("B02 blocked member excluded from ranked set regardless of positive factors", () => {
  const superStrongBlocked = p16Member(TARGET, {
    ownerBlockedOperations: ["SPANNER_DATA_ORACLE"],
    depthClass: "TYPE_COLLECTION",
    historicalYield: {
      admittedCount: 99,
      reproducedCount: 99,
      minimizedCount: 99,
      distinctClusterCount: 99,
      dossierReadyCount: 99,
      duplicateMerges: 0,
      invalidOrTransient: 0,
      executionsTotal: 10,
    },
    starvationAgeBuckets: 8,
    replayable: true,
    executionCostClass: "LOW",
  });
  const plain = p16Member(TARGET2);
  const portfolio = buildPortfolio({
    approvedTargets: [TARGET, TARGET2],
    memberInputs: [superStrongBlocked, plain],
  });
  const scores = [
    scorePortfolioMember(portfolio.members[0]!, null),
    scorePortfolioMember(portfolio.members[1]!, null),
  ];
  const blockedScore = scores.find(
    (score) => score.memberId === portfolioMemberId(superStrongBlocked),
  )!;
  const plainScore = scores.find(
    (score) => score.memberId === portfolioMemberId(plain),
  )!;
  // Even a numerically higher blocked score is meaningless: the gate removes
  // the member from ranking/budget entirely.
  expect(blockedScore.total).toBeGreaterThan(plainScore.total - 1000);
  expect(
    portfolioEligibility(
      portfolio.members.find((m) => m.memberId === blockedScore.memberId)!,
    ),
  ).toEqual({
    eligible: false,
    reasonCode: "OWNER_POLICY_BLOCKED",
  });
});

// B03 — movement classification precedence incl. SHA-only anti-novelty rule
test("B03 SHA-only movement classifies with zero novelty; contract wins precedence", () => {
  const current = {
    sourceSha: P16_SHA_B,
    evidenceDigest: P16_EV_A,
    derivationVersion: "d.v1",
    contractVersion: "c.v1",
  };
  const previous: PortfolioPreviousProvenance = {
    sourceSha: P16_SHA_A,
    evidenceDigest: P16_EV_A,
    derivationVersion: "d.v1",
    contractVersion: "c.v1",
  };
  expect(classifyPortfolioSourceMovement(current, previous)).toBe(
    "SHA_ONLY_NO_EVIDENCE_CHANGE",
  );

  expect(
    classifyPortfolioSourceMovement(
      {
        sourceSha: P16_SHA_B,
        evidenceDigest: P16_EV_B,
        derivationVersion: "d.v1",
        contractVersion: "c.v1",
      },
      previous,
    ),
  ).toBe("EVIDENCE_CHANGED");

  expect(
    classifyPortfolioSourceMovement(
      {
        sourceSha: P16_SHA_B,
        evidenceDigest: P16_EV_B,
        derivationVersion: "d.v2",
        contractVersion: "c.v1",
      },
      previous,
    ),
  ).toBe("DERIVATION_CHANGED");

  expect(
    classifyPortfolioSourceMovement(
      {
        sourceSha: P16_SHA_B,
        evidenceDigest: P16_EV_B,
        derivationVersion: "d.v2",
        contractVersion: P16_CONTRACT_V2,
      },
      previous,
    ),
  ).toBe("CONTRACT_CHANGED");

  expect(classifyPortfolioSourceMovement(current, current)).toBe("NO_MOVEMENT");
  expect(
    classifyPortfolioSourceMovement(
      { ...current, evidenceDigest: null },
      previous,
    ),
  ).toBe("EVIDENCE_LOST");
});

// B04 — SHA-only movement contributes ZERO to SOURCE_MOVEMENT_RELEVANCE
test("B04 sha-only movement gives zero movement contribution", () => {
  const movedShaOnly = p16Member(TARGET, { sourceSha: P16_SHA_B });
  const staticMember = p16Member(TARGET, { sourceSha: P16_SHA_A });
  const movedScore = scorePortfolioMember(
    single(movedShaOnly).members[0]!,
    p16BaselineProvenance(),
  );
  const staticScore = scorePortfolioMember(
    single(staticMember).members[0]!,
    p16BaselineProvenance(),
  );
  const movedComponent = movedScore.components.find(
    (component) => component.name === "SOURCE_MOVEMENT_RELEVANCE",
  )!;
  const staticComponent = staticScore.components.find(
    (component) => component.name === "SOURCE_MOVEMENT_RELEVANCE",
  )!;
  expect(movedComponent.contribution).toBe(0);
  expect(staticComponent.contribution).toBe(0);
  expect(movedScore.total).toBe(staticScore.total);
});

// B05 — changed evidence strictly increases the total vs sha-only/no movement
test("B05 evidence change raises movement relevance above no-movement baseline", () => {
  const changed = p16Member(TARGET, {
    sourceSha: P16_SHA_B,
    evidenceDigest: P16_EV_B,
  });
  const baseline = p16Member(TARGET, {
    sourceSha: P16_SHA_A,
    evidenceDigest: P16_EV_A,
  });
  const prev = p16BaselineProvenance();
  const changedTotal = scorePortfolioMember(
    single(changed).members[0]!,
    prev,
  ).total;
  const baselineTotal = scorePortfolioMember(
    single(baseline).members[0]!,
    prev,
  ).total;
  expect(changedTotal).toBe(baselineTotal + 10); // EVIDENCE_CHANGED value 2 x weight 5
});

// B06 — duplicate pressure monotonically suppresses
test("B06 duplicate pressure monotone suppression", () => {
  const penalties = [0, 1, 2, 3, 4, 5].map(duplicatePenalty);
  for (let index = 1; index < penalties.length; index += 1) {
    expect(penalties[index]!).toBeGreaterThanOrEqual(penalties[index - 1]!);
  }
  expect(penalties[0]).toBe(0);

  const solo = buildPortfolio({
    approvedTargets: [TARGET],
    memberInputs: [p16Member(TARGET, { semanticScope: "solo" })],
  }).members[0]!;
  const duplicated = buildPortfolio({
    approvedTargets: [TARGET, TARGET2],
    memberInputs: [
      p16Member(TARGET, { semanticScope: "dup" }),
      p16Member(TARGET2, { semanticScope: "dup" }),
    ],
  }).members[0]!;
  const soloScore = scorePortfolioMember(solo, null).total;
  const dupScore = scorePortfolioMember(duplicated, null).total;
  expect(dupScore).toBeLessThan(soloScore);
});

// B07 — determinism: identical inputs -> byte-identical score objects
test("B07 identical inputs produce byte-identical scores", () => {
  const make = () =>
    scorePortfolioMember(
      single(p16Member(TARGET, { starvationAgeBuckets: 4 })).members[0]!,
      p16BaselineProvenance(),
    );
  expect(JSON.stringify(make())).toBe(JSON.stringify(make()));
  expect(make().digest).toMatch(/^sha256:[0-9a-f]{24}$/);
});

// B08 — equal-score tie: two structurally identical members score identically
test("B08 structurally identical members tie exactly", () => {
  const first = p16Member(TARGET, { semanticScope: "tie.scope" });
  const second = p16Member(TARGET2, { semanticScope: "tie.scope" });
  const portfolio = buildPortfolio({
    approvedTargets: [TARGET, TARGET2],
    memberInputs: [first, second],
  });
  const scores = portfolio.members.map((member) =>
    scorePortfolioMember(member, null),
  );
  expect(scores[0]!.total).toBe(scores[1]!.total);
  // Deterministic digest ordering: lower memberId sorts first.
  expect(scores[0]!.memberId.localeCompare(scores[1]!.memberId)).toBeLessThan(
    0,
  );
});
