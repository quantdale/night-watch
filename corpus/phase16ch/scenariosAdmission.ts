// ---------------------------------------------------------------------------
// Phase 16CH corpus — ADMISSION_REASON matrix.
// Every categorical admission gate gets a deterministic negative case; the
// positive control proves the correct token admits without mutating anything.
// ---------------------------------------------------------------------------

import { buildPortfolio, allocatePortfolioBudget } from "../../src/core/portfolio";
import type { PortfolioMemberInput } from "../../src/core/portfolio/types";
import { assertPortfolioBudgetFeasible } from "../../src/core/portfolio/runtimeBinding";
import { admitPortfolioRuntimePlan } from "../../src/core/portfolio/runtimeBinding";
import {
  admit,
  cloneUniverse,
  normalizeOutcome,
  pairScope,
  reforgeHandoff,
  reforgePlan,
  FIXTURE_AUTHORIZATION,
  INITIAL_PROFILE_SNAPSHOT,
  OTHER_PLAN_STYLE_ID,
  OTHER_PF_ID,
  SYNTHETIC_MEMBER_ID,
  buildScopedRuntimePlan,
  type HardeningScenario,
  type Mutable,
} from "./core";

export function admissionScenarios(): HardeningScenario[] {
  const scenarios: HardeningScenario[] = [];
  const add = (id: string, expected: string, run: () => string) =>
    scenarios.push({ id, group: "ADMISSION_REASON", expected, run });
  const base = pairScope();

  add("ADM-001-positive-control", "ADMITTED", admit(base));

  // Authorization gates (consumption point; never mutating).
  add("ADM-002-authorization-missing-null", "REJECTED:AUTHORIZATION_MISSING", admit({ ...base, token: null }));
  add("ADM-003-authorization-missing-whitespace", "REJECTED:AUTHORIZATION_MISSING", admit({ ...base, token: "   " }));
  add("ADM-004-authorization-mismatch-suffix", "REJECTED:AUTHORIZATION_MISMATCH", admit({ ...base, token: `${FIXTURE_AUTHORIZATION}X` }));
  add("ADM-005-authorization-mismatch-other-class", "REJECTED:AUTHORIZATION_MISMATCH", admit({ ...base, token: "PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE" }));

  // Inert-handoff safety facts.
  add("ADM-010-handoff-not-inert", "REJECTED:HANDOFF_NOT_INERT", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { (core.executable as unknown as boolean) = true; }),
  }));
  add("ADM-011-handoff-token-class-mismatch", "REJECTED:HANDOFF_TOKEN_CLASS_MISMATCH", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.requiredAuthorizationToken = "PHASE_16B_CONTAINED_DEV_PORTFOLIO_CAMPAIGN_ACCEPTANCE"; }),
  }));
  add("ADM-012-handoff-environment-invalid", "REJECTED:HANDOFF_ENVIRONMENT_INVALID", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.environmentRestriction = "NEXT_ONLY_NEVER_PRODUCTION"; }),
  }));

  // Handoff/plan coherence gates.
  add("ADM-020-plan-version-mismatch", "REJECTED:PLAN_VERSION_MISMATCH", admit({
    ...base,
    plan: reforgePlan(base.plan, (core) => { (core.manifestVersion as unknown as string) = "nightwatch.campaign-plan-manifest.v0"; }),
  }));
  add("ADM-021-plan-id-mismatch", "REJECTED:PLAN_ID_MISMATCH", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.planId = OTHER_PLAN_STYLE_ID; }),
  }));
  add("ADM-022-manifest-digest-mismatch", "REJECTED:MANIFEST_DIGEST_MISMATCH", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.planManifestDigest = OTHER_PLAN_STYLE_ID; }),
  }));
  add("ADM-023-portfolio-digest-mismatch", "REJECTED:PORTFOLIO_DIGEST_MISMATCH", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.portfolioDigest = OTHER_PF_ID; }),
  }));
  add("ADM-024-total-units-mismatch", "REJECTED:TOTAL_UNITS_MISMATCH", admit({
    ...base,
    handoff: reforgeHandoff(base.handoff, (core) => { core.totalAllocatedUnits += 1; }),
  }));

  // Universe membership / eligibility gates.
  {
    const wrongTargets = cloneUniverse(base.universe);
    (wrongTargets.approvedTargets as unknown as string[]) = ["ripple.common-exchange.read"];
    add("ADM-030-target-unknown-forged-target-set", "REJECTED:TARGET_UNKNOWN", admit({ universe: wrongTargets, plan: base.plan, handoff: base.handoff }));

    add("ADM-031-synthetic-member-consistent-list-swap", "REJECTED:SYNTHETIC_TARGET_REJECTED", () => {
      try {
        const plan = reforgePlan(base.plan, (core) => {
          (core.selectedMembers[0] as Mutable<{ memberId: string }>).memberId = SYNTHETIC_MEMBER_ID;
        });
        const handoff = reforgeHandoff(base.handoff, (core) => {
          core.planId = plan.planId;
          core.planManifestDigest = plan.manifestDigest;
          (core.selectedMemberIds as unknown as string[])[0] = SYNTHETIC_MEMBER_ID;
        });
        return admit({ universe: base.universe, plan, handoff })();
      } catch (error) {
        return normalizeOutcome(error);
      }
    });

    add("ADM-032-duplicate-target-mapping", "REJECTED:DUPLICATE_TARGET_MAPPING", () => {
      try {
        const plan = reforgePlan(base.plan, (core) => {
          const clone = JSON.parse(JSON.stringify(core.selectedMembers[0])) as { order: number; allocatedUnits: number };
          clone.order = core.selectedMembers.length;
          core.selectedMembers.push(clone as never);
          core.totalAllocatedUnits += clone.allocatedUnits;
        });
        const handoff = reforgeHandoff(base.handoff, (core) => {
          core.planId = plan.planId;
          core.planManifestDigest = plan.manifestDigest;
          core.totalAllocatedUnits = plan.totalAllocatedUnits;
          (core.selectedMemberIds as unknown as string[]).push([...core.selectedMemberIds][0]!);
        });
        return admit({ universe: base.universe, plan, handoff })();
      } catch (error) {
        return normalizeOutcome(error);
      }
    });

    const staleUniverse = cloneUniverse(base.universe);
    for (const member of staleUniverse.portfolio.members) {
      (member.input as Mutable<PortfolioMemberInput>).currentness = "STALE";
    }
    add("ADM-033-member-evidence-stale", "REJECTED:MEMBER_EVIDENCE_STALE", admit({ universe: staleUniverse, plan: base.plan, handoff: base.handoff }));

    const unavailableUniverse = cloneUniverse(base.universe);
    for (const member of unavailableUniverse.portfolio.members) {
      (member.input as Mutable<PortfolioMemberInput>).currentness = "SOURCE_UNAVAILABLE";
    }
    add("ADM-034-member-evidence-unavailable", "REJECTED:MEMBER_EVIDENCE_UNAVAILABLE", admit({ universe: unavailableUniverse, plan: base.plan, handoff: base.handoff }));

    // Blocked members can never be FUNDED even when planned into a portfolio.
    add("ADM-035-blocked-member-never-funded", "BLOCKED_MEMBER_UNFUNDED", () => {
      try {
        const inputs = base.universe.portfolio.members.map((member) =>
          member.input.kind === "JOURNEY"
            ? { ...member.input, ownerBlockedOperations: ["DYNAMODB_DATA_ORACLE"] }
            : member.input,
        );
        const blockedPortfolio = buildPortfolio({ approvedTargets: base.universe.approvedTargets, memberInputs: inputs });
        const allocation = allocatePortfolioBudget({ portfolio: blockedPortfolio, policy: { ...DEFAULT_ALLOCATION_POLICY_MIRROR } });
        const journeyFunded = allocation.selected.some((entry) => entry.kind === "JOURNEY");
        const journeyBlocked = blockedPortfolio.members
          .filter((member) => member.input.kind === "JOURNEY")
          .every((member) => member.input.ownerBlockedOperations.length > 0);
        return !journeyFunded && journeyBlocked ? "BLOCKED_MEMBER_UNFUNDED" : "BLOCKED_MEMBER_FUNDED";
      } catch (error) {
        return normalizeOutcome(error);
      }
    });

    // phaseFrozen variant of MEMBER_BLOCKED at admission level.
    const frozenUniverse = cloneUniverse(base.universe);
    for (const member of frozenUniverse.portfolio.members) {
      (member.input as Mutable<PortfolioMemberInput>).phaseFrozen = true;
    }
    add("ADM-036-member-phase-frozen-at-admission", "REJECTED:MEMBER_BLOCKED", admit({ universe: frozenUniverse, plan: base.plan, handoff: base.handoff }));
  }

  // Exploration restriction + lineage completeness.
  {
    const explorationScope = buildScopedRuntimePlan({
      kinds: ["JOURNEY", "EXPLORATION"],
      targets: ["ripple.payer-exchange.read"],
      totalUnits: 16,
    });
    const selectedKinds = new Set(explorationScope.plan.selectedMembers.map((member) => member.kind));
    add(
      "ADM-040-exploration-runtime-restricted",
      selectedKinds.has("EXPLORATION") ? "REJECTED:MEMBER_RUNTIME_RESTRICTED" : "ADMITTED_NO_EXPLORATION_SELECTED",
      admit(explorationScope),
    );

    const apiOnly = buildScopedRuntimePlan({ kinds: ["API"], targets: ["ripple.payer-exchange.read"], totalUnits: 12 });
    add("ADM-041-lineage-incomplete-single-api", "REJECTED:MEMBER_LINEAGE_INCOMPLETE", admit(apiOnly));

    const wideApiOnly = buildScopedRuntimePlan({ kinds: ["API"], totalUnits: 36 });
    add("ADM-042-lineage-incomplete-wide-api-only", "REJECTED:MEMBER_LINEAGE_INCOMPLETE", admit(wideApiOnly));
  }

  // Work-item ambiguity + empty selection.
  {
    const ambiguousUniverse = cloneUniverse(base.universe);
    const payerJourney = ambiguousUniverse.members.find((member) => member.kind === "JOURNEY" && member.targetId === "ripple.payer-exchange.read");
    const payerApi = ambiguousUniverse.members.find((member) => member.kind === "API" && member.targetId === "ripple.payer-exchange.read");
    if (payerJourney === undefined || payerApi === undefined) throw new Error("corpus fixture expects payer journey+API members");
    (payerApi as Mutable<{ workItemId: string }>).workItemId = payerJourney.workItemId;
    add("ADM-050-work-item-mapping-ambiguous", "REJECTED:WORK_ITEM_MAPPING_AMBIGUOUS", admit({ universe: ambiguousUniverse, plan: base.plan, handoff: base.handoff }));

    add("ADM-051-plan-empty-selection", "REJECTED:PLAN_EMPTY_SELECTION", () => {
      try {
        const plan = reforgePlan(base.plan, (core) => {
          (core.selectedMembers as unknown as unknown[]) = [];
          core.totalAllocatedUnits = 0;
          core.unallocatedUnits += base.plan.totalAllocatedUnits;
        });
        const handoff = reforgeHandoff(base.handoff, (core) => {
          core.planId = plan.planId;
          core.planManifestDigest = plan.manifestDigest;
          (core.selectedMemberIds as unknown as unknown[]) = [];
          core.totalAllocatedUnits = 0;
        });
        return admit({ universe: base.universe, plan, handoff })();
      } catch (error) {
        return normalizeOutcome(error);
      }
    });
  }

  // Budget oversubscription fires from the seam feasibility guard (mapping v1).
  {
    const triple = buildScopedRuntimePlan({ kinds: ["JOURNEY", "API"], totalUnits: 48 });
    add("ADM-060-budget-oversubscribed-three-apis-preserved", "REJECTED:BUDGET_OVERSUBSCRIBED", () => {
      try {
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
  }

  // Empty universe.
  {
    const emptyUniverse = cloneUniverse(base.universe);
    (emptyUniverse.members as unknown as unknown[]) = [];
    add("ADM-061-universe-empty-members", "REJECTED:UNIVERSE_EMPTY", admit({ universe: emptyUniverse, plan: base.plan, handoff: base.handoff }));
  }

  return scenarios;
}

const DEFAULT_ALLOCATION_POLICY_MIRROR = {
  policyVersion: "nightwatch.portfolio-allocation.v1",
  totalUnits: 24,
  perMemberCeiling: 6,
  floorUnits: 2,
  starvationThresholdBuckets: 5,
  retryCeilingPerMember: 1,
  reservedExplorationUnits: 3,
} as const;
