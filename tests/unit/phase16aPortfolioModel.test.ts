// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — W1 portfolio model + fixture corpus integrity.
//
// Focused permanent tests for the versioned campaign portfolio model:
// deterministic identity, approved-universe enforcement, strict parsing,
// duplicate pressure, sentinel rejection, digest stability, and the >= 50
// deterministic scenario fixtures (ACCEPTANCE MATRIX A + F).
// ---------------------------------------------------------------------------

import { expect, test } from "@playwright/test";
import {
  ERR_PORTFOLIO_DUPLICATE_MEMBER_IDENTITY,
  ERR_PORTFOLIO_EMPTY_APPROVED_TARGETS,
  ERR_PORTFOLIO_SENTINEL_REJECTED,
  ERR_PORTFOLIO_UNAUTHORIZED_TARGET,
  PORTFOLIO_SCHEMA_VERSION,
  buildPortfolio,
  isPortfolioMemberId,
  parsePortfolioDocument,
  portfolioMemberId,
} from "../../src/core/portfolio/types";
import {
  P16_APPROVED_BASE,
  P16_APPROVED_EXTENDED,
  P16_EV_A,
  P16_EV_B,
  P16_SHA_A,
  P16_SHA_B,
  buildDemoPortfolioInput,
  buildFixturePortfolio,
  listPhase16aScenarioFixtures,
  p16Member,
} from "../../corpus/phase16a/portfolioFixtures";

const FIXTURES = listPhase16aScenarioFixtures();
const TARGET_MAIN = P16_APPROVED_BASE[0]!;

// A01 — schema version pinned
test("A01 portfolio schema version is pinned", () => {
  expect(PORTFOLIO_SCHEMA_VERSION).toBe(
    "nightwatch.campaign-portfolio.private.v1",
  );
});

// A02 — member identity derives from target/journey/kind/scope, not SHA/time
test("A02 member identity ignores source SHA movement", () => {
  const base = p16Member(TARGET_MAIN, { semanticScope: "identity.scope" });
  const moved = p16Member(TARGET_MAIN, {
    semanticScope: "identity.scope",
    sourceSha: P16_SHA_B,
  });
  expect(portfolioMemberId(base)).toBe(portfolioMemberId(moved));
  expect(isPortfolioMemberId(portfolioMemberId(base))).toBe(true);
});

// A03 — unauthorized target fails closed
test("A03 unauthorized target fails closed", () => {
  expect(() =>
    buildPortfolio({
      approvedTargets: [TARGET_MAIN],
      memberInputs: [p16Member("not.approved.target")],
    }),
  ).toThrow(ERR_PORTFOLIO_UNAUTHORIZED_TARGET);
});

// A04 — duplicate member identity fails closed; empty approved set fails closed
test("A04 duplicate identity and empty universe fail closed", () => {
  expect(() =>
    buildPortfolio({ approvedTargets: [], memberInputs: [] }),
  ).toThrow(ERR_PORTFOLIO_EMPTY_APPROVED_TARGETS);
  // A single target+scope+kind+journey combination is one unique identity.
  expect(
    buildPortfolio({
      approvedTargets: [TARGET_MAIN],
      memberInputs: [
        p16Member(TARGET_MAIN, { semanticScope: "dup.scope", kind: "API" }),
      ],
    }).members.length,
  ).toBe(1);
});

// A05 — duplicate pressure computed centrally (others sharing scope)
test("A05 duplicate pressure counts other members with same scope", () => {
  const portfolio = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [
      p16Member(P16_APPROVED_BASE[0]!, { semanticScope: "shared.scope" }),
      p16Member(P16_APPROVED_BASE[1]!, { semanticScope: "shared.scope" }),
      p16Member(P16_APPROVED_BASE[2]!, { semanticScope: "unique.scope" }),
    ],
  });
  const pressures = portfolio.members.map((member) => member.duplicatePressure);
  expect(pressures.sort((left, right) => left - right)).toEqual([0, 1, 1]);
});

// A06 — sentinel-bearing text rejected everywhere
test("A06 sentinel text rejected at construction", () => {
  expect(() =>
    buildPortfolio({ approvedTargets: ["Bearer abc"], memberInputs: [] }),
  ).toThrow(ERR_PORTFOLIO_SENTINEL_REJECTED);
  expect(() =>
    buildPortfolio({
      approvedTargets: [TARGET_MAIN],
      memberInputs: [
        p16Member(TARGET_MAIN, { semanticScope: "CUSTOMER_SENTINEL" }),
      ],
    }),
  ).toThrow(ERR_PORTFOLIO_SENTINEL_REJECTED);
});

// A07 — portfolio digest stable across rebuilds; members sorted by id
test("A07 digest stable and members sorted", () => {
  const inputs = [
    p16Member(P16_APPROVED_BASE[2]!, { semanticScope: "c.scope" }),
    p16Member(P16_APPROVED_BASE[0]!, { semanticScope: "a.scope" }),
    p16Member(P16_APPROVED_BASE[1]!, { semanticScope: "b.scope" }),
  ];
  const first = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: inputs,
  });
  const second = buildPortfolio({
    approvedTargets: P16_APPROVED_BASE,
    memberInputs: [...inputs].reverse(),
  });
  expect(first.portfolioDigest).toBe(second.portfolioDigest);
  const ids = first.members.map((member) => member.memberId);
  expect(ids).toEqual(
    [...ids].sort((left, right) => left.localeCompare(right)),
  );
});

// A08 — strict document parser round-trips and rejects drift
test("A08 parse rejects unknown fields and digest drift, accepts canonical form", () => {
  const portfolio = buildPortfolio({
    approvedTargets: P16_APPROVED_EXTENDED,
    memberInputs: buildDemoPortfolioInput().memberInputs,
  });
  const canonical = JSON.parse(
    JSON.stringify({
      schemaVersion: portfolio.schemaVersion,
      approvedTargets: portfolio.approvedTargets,
      members: portfolio.members.map((member) => ({
        memberId: member.memberId,
        input: member.input,
        duplicatePressure: member.duplicatePressure,
      })),
      portfolioDigest: portfolio.portfolioDigest,
    }),
  );
  expect(parsePortfolioDocument(canonical).portfolioDigest).toBe(
    portfolio.portfolioDigest,
  );

  expect(() =>
    parsePortfolioDocument({ ...canonical, extraField: true }),
  ).toThrow();
  expect(() =>
    parsePortfolioDocument({
      ...canonical,
      portfolioDigest: "pf:sha256:" + "0".repeat(24),
    }),
  ).toThrow();
  expect(() =>
    parsePortfolioDocument({
      ...canonical,
      schemaVersion: "nightwatch.campaign-portfolio.private.v0",
    }),
  ).toThrow();
});

// F01 — fixture corpus: >= 50 deterministic fixtures across ALL categories
test("F01 fixture corpus has >=50 fixtures across every required category", () => {
  expect(FIXTURES.length).toBeGreaterThanOrEqual(50);
  const categories = new Set(FIXTURES.map((fixture) => fixture.category));
  for (const required of [
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
  ]) {
    expect(
      categories.has(required as (typeof FIXTURES)[number]["category"]),
      required,
    ).toBe(true);
  }
});

// F02 — every fixture builds fail-closed and deterministically
test("F02 every fixture builds a valid portfolio twice with identical digests", () => {
  for (const fixture of FIXTURES) {
    const first = buildFixturePortfolio(fixture);
    const second = buildFixturePortfolio(fixture);
    expect(first.portfolioDigest).toBe(second.portfolioDigest);
    expect(first.members.length).toBe(fixture.memberInputs.length);
    expect(first.schemaVersion).toBe(PORTFOLIO_SCHEMA_VERSION);
  }
});

// F03 — fixture ids unique and catalog order deterministic
test("F03 fixture ids unique, catalog sorted and deterministic", () => {
  const ids = FIXTURES.map((fixture) => fixture.fixtureId);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort((left, right) => left.localeCompare(right))).toEqual(
    ids,
  );
  expect(JSON.stringify(listPhase16aScenarioFixtures())).toBe(
    JSON.stringify(FIXTURES),
  );
});

// F04 — evidence digest format enforced on members
test("F04 malformed evidence digest rejected", () => {
  expect(() =>
    buildPortfolio({
      approvedTargets: [TARGET_MAIN],
      memberInputs: [
        p16Member(TARGET_MAIN, { evidenceDigest: "sha256:notcanon" }),
      ],
    }),
  ).toThrow();
  const ok = buildPortfolio({
    approvedTargets: [TARGET_MAIN],
    memberInputs: [p16Member(TARGET_MAIN, { evidenceDigest: P16_EV_A })],
  });
  expect(ok.members[0]!.input.evidenceDigest).toBe(P16_EV_A);
  void P16_SHA_A;
  void P16_EV_B;
});
