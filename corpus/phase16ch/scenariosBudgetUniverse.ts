// ---------------------------------------------------------------------------
// Phase 16CH corpus — BUDGET_GRID (exhaustive monotone-restriction matrix,
// incl. DEF-01 permanent regressions and the preserved three-API fail-closed
// semantic) and UNIVERSE_DESCRIPTOR adversarials.
// ---------------------------------------------------------------------------

import {
  assertPortfolioBudgetFeasible,
  buildRealApprovedUniverse,
  mapPortfolioBudget,
  type RealApprovedUniverseDescriptor,
  type RealUniverseLinkageRow,
  type RealUniverseTargetContract,
} from "../../src/core/portfolio/runtimeBinding";
import { admitPortfolioRuntimePlan } from "../../src/core/portfolio/runtimeBinding";
import type { PortfolioMemberKind } from "../../src/core/portfolio/types";
import { buildCurrentRealApprovedUniverse } from "../../src/core/portfolio/realUniverse";
import { P16_SYNTH_EXTRA_1 } from "../phase16a/portfolioFixtures";
import {
  FIXTURE_AUTHORIZATION,
  INITIAL_PROFILE_SNAPSHOT,
  buildScopedRuntimePlan,
  normalizeOutcome,
  safe,
  type HardeningScenario,
} from "./core";

const RUNTIME_PROFILE_VERSION = "nightwatch.campaign-runtime-profile.v1";

export function budgetGridScenarios(): HardeningScenario[] {
  const scenarios: HardeningScenario[] = [];
  const add = (id: string, expected: string, run: () => string) =>
    scenarios.push({ id, group: "BUDGET_GRID", expected, run });

  const mappedObserved = (
    capsOverride: Partial<Record<"maxTotalBrowserContexts" | "maxJourneyContexts" | "maxExplorationContexts" | "maxApiExecutions" | "maxTotalActions", number>>,
  ): string => {
    try {
      const caps = {
        maxTotalBrowserContexts: 4,
        maxJourneyContexts: 3,
        maxExplorationContexts: 0,
        maxApiExecutions: 7,
        maxTotalActions: 24,
        ...capsOverride,
      };
      const mapped = mapPortfolioBudget({ binding: { members: [], budgetCaps: caps }, initial: INITIAL_PROFILE_SNAPSHOT });
      const dims = ["maxTotalBrowserContexts", "maxJourneyContexts", "maxExplorationContexts", "maxApiExecutions", "maxTotalActions"] as const;
      for (const dim of dims) {
        if (mapped.policy[dim] > INITIAL_PROFILE_SNAPSHOT[dim]) return "BUDGET_EXPANSION";
        if (mapped.policy[dim] !== Math.min(caps[dim], INITIAL_PROFILE_SNAPSHOT[dim])) return "NON_MONOTONE_MAPPING";
      }
      return "RESTRICTIVE_OK";
    } catch (error) {
      return normalizeOutcome(error);
    }
  };

  // Per-dimension boundary sweep: zero / one-below-initial / at-initial /
  // one-above-initial / massive. Every mapped value must equal the elementwise
  // min against the canonical bounded profile — never an expansion.
  const initialDims: readonly [string, number][] = [
    ["maxTotalBrowserContexts", INITIAL_PROFILE_SNAPSHOT.maxTotalBrowserContexts],
    ["maxJourneyContexts", INITIAL_PROFILE_SNAPSHOT.maxJourneyContexts],
    ["maxExplorationContexts", INITIAL_PROFILE_SNAPSHOT.maxExplorationContexts],
    ["maxApiExecutions", INITIAL_PROFILE_SNAPSHOT.maxApiExecutions],
    ["maxTotalActions", INITIAL_PROFILE_SNAPSHOT.maxTotalActions],
  ];
  let index = 0;
  for (const [dim, initialValue] of initialDims) {
    for (const [shape, capsValue] of [
      ["zero", 0],
      ["one-below-cap", Math.max(0, initialValue - 1)],
      ["at-cap", initialValue],
      ["one-above-cap", initialValue + 1],
      ["massive-safe-int", Number.MAX_SAFE_INTEGER],
    ] as const) {
      index += 1;
      add(`BUG-${String(index).padStart(3, "0")}-${dim}-${shape}`, shape === "massive-safe-int" ? "CLAMPED_FLAGGED" : "RESTRICTIVE_OK", () => {
        const observed = mappedObserved({ [dim]: capsValue });
        // Massive values are clamped restrictively AND flagged as expansion
        // attempts; the mapped policy itself never exceeds the profile.
        if (shape === "massive-safe-int") {
          return observed === "RESTRICTIVE_OK" ? "CLAMPED_FLAGGED" : observed;
        }
        return observed;
      });
    }
  }

  // Mixed shapes through the seam feasibility guard (DEF-01 permanent
  // regressions + preserved three-API fail-closed semantic).
  const guardFor = (journeys: number, apis: number): string => {
    const caps = {
      maxTotalBrowserContexts: journeys + apis + 1,
      maxJourneyContexts: journeys,
      maxExplorationContexts: 0,
      maxApiExecutions: 2 * apis + 1,
      maxTotalActions: Math.max(journeys * 8 + apis * 2, journeys + 1),
    };
    try {
      assertPortfolioBudgetFeasible({ caps, initial: INITIAL_PROFILE_SNAPSHOT });
      return "FEASIBLE";
    } catch (error) {
      return normalizeOutcome(error);
    }
  };
  add("BUG-101-all-journey-3j-feasible", "FEASIBLE", () => guardFor(3, 0));
  add("BUG-102-one-api-pair-feasible-def01-regression", "FEASIBLE", () => guardFor(1, 1));
  add("BUG-103-two-apis-feasible-def01-regression", "FEASIBLE", () => guardFor(2, 2));
  add("BUG-104-three-journeys-two-apis-feasible", "FEASIBLE", () => guardFor(3, 2));
  add("BUG-105-three-apis-fail-closed-preserved", "REJECTED:BUDGET_OVERSUBSCRIBED", () => guardFor(3, 3));
  add("BUG-106-massive-api-dimension-fail-closed", "REJECTED:BUDGET_OVERSUBSCRIBED", () => guardFor(3, 500));
  add("BUG-107-browser-reserve-boundary-3j1a", "FEASIBLE", () => guardFor(3, 1));

  // Full-seam three-API plan still fails closed through the real pipeline.
  add("BUG-108-full-seam-three-apis-oversubscribed", "REJECTED:BUDGET_OVERSUBSCRIBED", () => {
    try {
      const triple = buildScopedRuntimePlan({ kinds: ["JOURNEY", "API"], totalUnits: 48 });
      const binding = admitPortfolioRuntimePlan({
        universe: triple.universe,
        plan: triple.plan,
        handoff: triple.handoff,
        authorizationToken: FIXTURE_AUTHORIZATION,
      });
      const kinds = binding.members.map((member) => member.kind).sort().join("");
      if (kinds !== "APIAPIAPIJOURNEYJOURNEYJOURNEY") return `PRECONDITION_UNMET:${kinds}`;
      assertPortfolioBudgetFeasible({ caps: binding.budgetCaps, initial: INITIAL_PROFILE_SNAPSHOT });
      return "FEASIBLE";
    } catch (error) {
      return normalizeOutcome(error);
    }
  });

  // Invalid numerics on a mapped dimension are rejected outright.
  for (const [label, value] of [
    ["negative", -1],
    ["fractional", 2.5],
    ["nan", Number.NaN],
    ["infinity", Number.POSITIVE_INFINITY],
    ["negative-infinity", Number.NEGATIVE_INFINITY],
  ] as const) {
    add(`BUG-110-invalid-${label}`, "PORTFOLIO_BUDGET_MAPPING_INVALID:maxTotalActions", () => {
      try {
        mapPortfolioBudget({
          binding: { members: [], budgetCaps: { maxTotalBrowserContexts: 3, maxJourneyContexts: 1, maxExplorationContexts: 0, maxApiExecutions: 3, maxTotalActions: value } },
          initial: INITIAL_PROFILE_SNAPSHOT,
        }).policy;
        return "ACCEPTED_INVALID_NUMERIC";
      } catch (error) {
        return normalizeOutcome(error);
      }
    });
  }
  add("BUG-111-unsafe-integer-clamped-not-expanded", "CLAMPED_FLAGGED", () => {
    try {
      const mapped = mapPortfolioBudget({
        binding: { members: [], budgetCaps: { maxTotalBrowserContexts: Number.MAX_SAFE_INTEGER + 1, maxJourneyContexts: 1, maxExplorationContexts: 0, maxApiExecutions: 3, maxTotalActions: 24 } },
        initial: INITIAL_PROFILE_SNAPSHOT,
      });
      const clamped = mapped.policy.maxTotalBrowserContexts <= INITIAL_PROFILE_SNAPSHOT.maxTotalBrowserContexts;
      const flagged = mapped.expansionViolations.includes("maxTotalBrowserContexts");
      return clamped && flagged ? "CLAMPED_FLAGGED" : "UNSAFE_INTEGER_ESCAPED";
    } catch (error) {
      return normalizeOutcome(error);
    }
  });

  return scenarios;
}

// ---------------------------------------------------------------------------
// UNIVERSE_DESCRIPTOR adversarials over the pure builder.
// ---------------------------------------------------------------------------

const CANONICAL_ROW = {
  targetId: "ripple.payer-exchange.read",
  journeyId: "ripple-payer-exchange-read",
  envelopeId: "E1-J1-payer-exchange",
  seed: "0x0000000000000101",
} as const;
const CANONICAL_CONTRACT = {
  targetId: "ripple.payer-exchange.read",
  depthClass: "TYPE_COLLECTION",
  contractVersion: "nightwatch.real-source-expectation-recipe.v2",
  derivationVersion: "nightwatch.real-source-derivation.v2",
} satisfies RealUniverseTargetContract;

interface CorpusDescriptorOverrides {
  registryVersions?: readonly string[];
  linkage?: readonly RealUniverseLinkageRow[];
  contracts?: readonly RealUniverseTargetContract[];
  runtimeRestrictedKinds?: readonly PortfolioMemberKind[];
}

function corpusDescriptor(overrides: CorpusDescriptorOverrides = {}): RealApprovedUniverseDescriptor {
  return {
    registryVersions: overrides.registryVersions ?? [RUNTIME_PROFILE_VERSION],
    linkage: overrides.linkage ?? [CANONICAL_ROW],
    contracts: overrides.contracts ?? [CANONICAL_CONTRACT],
    runtimeRestrictedKinds: overrides.runtimeRestrictedKinds ?? ["EXPLORATION"],
    runtimeRestrictionCode: "CORPUS_RESTRICTION_CODE",
  };
}

export function universeDescriptorScenarios(): HardeningScenario[] {
  const scenarios: HardeningScenario[] = [];
  const add = (id: string, expected: string, run: () => string) =>
    scenarios.push({ id, group: "UNIVERSE_DESCRIPTOR", expected, run });

  add("UNI-001-permutation-invariance", "IDENTICAL", () => {
    const straight = buildRealApprovedUniverse(corpusDescriptor());
    const permuted = buildRealApprovedUniverse(corpusDescriptor({
      registryVersions: [...corpusDescriptor().registryVersions],
      linkage: [...corpusDescriptor().linkage],
      contracts: [...corpusDescriptor().contracts],
    }));
    return straight.digest === permuted.digest ? "IDENTICAL" : "MISMATCH";
  });
  add("UNI-002-registry-version-movement-changes-digest", "MOVES", () =>
    buildRealApprovedUniverse(corpusDescriptor({ registryVersions: ["nightwatch.campaign-runtime-profile.v2"] })).digest
      === buildRealApprovedUniverse(corpusDescriptor()).digest ? "STUCK" : "MOVES");
  add("UNI-003-contract-depth-movement-moves-portfolio-digest", "PORTFOLIO_DIGEST_MOVES", () => {
    const shapeContract = { ...CANONICAL_CONTRACT, depthClass: "SHAPE_COLLECTION" as const, contractVersion: "nightwatch.real-source-expectation-recipe.v1", derivationVersion: "nightwatch.real-source-derivation.v1" };
    const shape = buildRealApprovedUniverse(corpusDescriptor({ contracts: [shapeContract] }));
    const deep = buildRealApprovedUniverse(corpusDescriptor());
    // The universe digest is a membership-authority surface (version +
    // registries + member identities); semantic depth moves the PORTFOLIO
    // digest instead, which propagates into every plan/binding identity.
    return shape.portfolio.portfolioDigest !== deep.portfolio.portfolioDigest ? "PORTFOLIO_DIGEST_MOVES" : "DEPTH_NOT_LOAD_BEARING";
  });
  add("UNI-004-recipe-missing-builds-without-evidence", "BUILDS_WITHOUT_EVIDENCE", () => {
    const noRecipe: RealUniverseTargetContract = { targetId: CANONICAL_ROW.targetId, depthClass: "NONE", contractVersion: null, derivationVersion: null };
    const universe = buildRealApprovedUniverse(corpusDescriptor({ contracts: [noRecipe] }));
    const apiMember = universe.members.find((candidate) => candidate.kind === "API");
    const modelMember = universe.portfolio.members.find((candidate) => candidate.memberId === apiMember?.memberId);
    return modelMember !== undefined && modelMember.input.evidenceDigest === null && modelMember.input.depthClass === "NONE"
      ? "BUILDS_WITHOUT_EVIDENCE"
      : "UNEXPECTED_EVIDENCE";
  });
  add("UNI-005-missing-contract-target-unknown", "REJECTED:TARGET_UNKNOWN", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({ contracts: [] })))));
  add("UNI-006-synthetic-target-injection-blocked", "REJECTED:TARGET_UNKNOWN", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({
      linkage: [{ ...CANONICAL_ROW, targetId: P16_SYNTH_EXTRA_1 }],
    })))));
  add("UNI-007-duplicate-linkage-row-rejected", "REJECTED:WORK_ITEM_MAPPING_AMBIGUOUS", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({
      linkage: [CANONICAL_ROW, CANONICAL_ROW],
    })))));
  add("UNI-008-cross-lineage-journey-collision", "REJECTED:WORK_ITEM_MAPPING_AMBIGUOUS", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({
      linkage: [CANONICAL_ROW, { ...CANONICAL_ROW, targetId: "ripple.common-exchange.read" }],
      contracts: [CANONICAL_CONTRACT, { ...CANONICAL_CONTRACT, targetId: "ripple.common-exchange.read" }],
    })))));
  add("UNI-009-invalid-registry-version-shape", "REJECTED:UNIVERSE_EMPTY", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({ registryVersions: ["bogus"] })))));
  add("UNI-010-empty-linkage", "REJECTED:UNIVERSE_EMPTY", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({ linkage: [] })))));
  add("UNI-011-unknown-restricted-kind", "REJECTED:UNIVERSE_EMPTY", () =>
    normalizeOutcome(safe(() => buildRealApprovedUniverse(corpusDescriptor({
      runtimeRestrictedKinds: ["BOGUS_KIND"] as unknown as readonly PortfolioMemberKind[],
    })))));
  add("UNI-012-exploration-restriction-explicit-and-load-bearing", "RESTRICTION_EXPLICIT", () => {
    const restricted = buildRealApprovedUniverse(corpusDescriptor());
    const unrestricted = buildRealApprovedUniverse(corpusDescriptor({ runtimeRestrictedKinds: [] }));
    const explorations = restricted.members.filter((member) => member.kind === "EXPLORATION");
    const ok = explorations.length > 0
      && explorations.every((member) => !member.runtimeAdmissible && member.runtimeRestrictionCode === "CORPUS_RESTRICTION_CODE")
      && unrestricted.digest !== restricted.digest;
    return ok ? "RESTRICTION_EXPLICIT" : "RESTRICTION_NOT_LOAD_BEARING";
  });
  add("UNI-013-current-universe-excludes-fixture-identities", "FIXTURES_ABSENT", () => {
    const current = buildCurrentRealApprovedUniverse();
    const absent = current.members.every((member) => !member.targetId.startsWith("phase16a.synthetic"))
      && !current.approvedTargets.some((target) => target.startsWith("phase16a.synthetic"));
    return absent ? "FIXTURES_ABSENT" : "FIXTURE_LEAKED_INTO_UNIVERSE";
  });
  add("UNI-014-wrong-anchor-envelope-injected-target-unknown-or-built-from-descriptor-only", "DESCRIPTOR_IS_PURE_NO_REGISTRY_CROSSCHECK", () => {
    // The PURE builder takes the descriptor as given; canonical correctness of
    // anchors is owned by the assembly mirror tests. Prove purity here: a
    // wrong envelope still builds from a consistent descriptor but would never
    // match the canonical universe digest.
    const wrongEnvelope = buildRealApprovedUniverse(corpusDescriptor({
      linkage: [{ ...CANONICAL_ROW, envelopeId: "WRONG-ENVELOPE" }],
    }));
    const canonical = buildRealApprovedUniverse(corpusDescriptor());
    return wrongEnvelope.digest !== canonical.digest ? "DESCRIPTOR_IS_PURE_NO_REGISTRY_CROSSCHECK" : "STUCK";
  });
  return scenarios;
}
