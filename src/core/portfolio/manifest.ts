// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — versioned campaign-plan manifest (WORKSTREAM W5).
//
// A deterministic, strictly validated plan manifest over the selected
// portfolio members: execution order, budgets, categorical reasons, expected
// oracle/semantic coverage, replay/minimization policy, checkpoint policy,
// and owner-scope requirements.
//
// Hard invariants (ACCEPTANCE MATRIX E):
//   - the manifest is strict/versioned/deterministic (no wall clock in
//     identity-bearing data; canonical serialization digest);
//   - changed contract/derivation/authority triggers correct
//     replan/invalidation via the companion replan module (W6);
//   - runtime execution requires a SEPARATE owner authorization: the
//     manifest itself carries no runtime authority and cannot be executed
//     from this phase alone;
//   - blocked members can never appear as selected;
//   - total allocated budget equals the allocation's bounded sum.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import {
  type CampaignPortfolio,
  type PortfolioMemberKind,
  portfolioDigestOf,
} from "./types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  type PortfolioAllocation,
} from "./allocation";
import { PORTFOLIO_PRIORITY_SCORE_VERSION } from "./scoring";

/** Plan manifest identity version. */
export const CAMPAIGN_PLAN_MANIFEST_VERSION =
  "nightwatch.campaign-plan-manifest.v1" as const;

/** Replay policy carried per selected member (bounded vocabulary). */
export const PLAN_REPLAY_POLICIES = [
  "NO_REPLAY",
  "REPLAY_ON_ANOMALY",
  "FIRST_PLUS_FRESH",
] as const;
export type PlanReplayPolicy = (typeof PLAN_REPLAY_POLICIES)[number];

/** Minimization policy carried per selected member. */
export const PLAN_MINIMIZATION_POLICIES = [
  "NONE",
  "ON_CONFIRMED_REPRODUCTION",
] as const;
export type PlanMinimizationPolicy =
  (typeof PLAN_MINIMIZATION_POLICIES)[number];

/** Checkpoint policy for the future runtime consumer. */
export interface PlanCheckpointPolicy {
  /** Checkpoints after every completed work item (deterministic ordinals). */
  readonly checkpointAfterEveryWorkItem: true;
  /** Resume must re-validate manifest fingerprint before continuing. */
  readonly resumeRequiresFingerprintMatch: true;
  /** Interrupted work bookkeeping required (Phase 15P A09 semantics). */
  readonly interruptedWorkBookkeepingRequired: true;
}

/** Owner-scope requirements embedded in every plan manifest. */
export interface PlanOwnerScopeRequirements {
  readonly status: "FROZEN_BY_OWNER";
  readonly reason: "INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE";
  /**
   * Runtime execution of this plan is IMPOSSIBLE from the planning phase
   * alone; it requires a separately granted owner authorization token for
   * one bounded contained-DEV campaign.
   */
  readonly runtimeAuthorizationRequired: "SEPARATE_OWNER_TOKEN_REQUIRED";
  /** Fixed marker: this planning phase grants zero runtime authority. */
  readonly planningPhaseExecutionAuthority: "NONE";
}

/** One selected member's plan entry. */
export interface CampaignPlanMember {
  readonly memberId: string;
  readonly targetId: string;
  readonly kind: PortfolioMemberKind;
  readonly order: number;
  readonly allocatedUnits: number;
  readonly maxRetries: number;
  /** Categorical selection reasons (score component names + movement class). */
  readonly reasons: readonly string[];
  readonly expectedSemanticDepth: string;
  readonly expectedCoverageClass: string;
  readonly replayPolicy: PlanReplayPolicy;
  readonly minimizationPolicy: PlanMinimizationPolicy;
}

/** One unselected member with its categorical exclusion reason. */
export interface CampaignPlanUnselectedMember {
  readonly memberId: string;
  readonly targetId: string;
  /** 'ZERO_BUDGET_<REASON>' for gate/evidence exclusions, 'BUDGET_EXHAUSTED' otherwise. */
  readonly reasonCode: string;
}

/** The versioned deterministic plan manifest. */
export interface CampaignPlanManifest {
  readonly manifestVersion: typeof CAMPAIGN_PLAN_MANIFEST_VERSION;
  /** `plan:sha256:<24>` identity over all identity-bearing fields below. */
  readonly planId: string;
  /** Fixed basis marker instead of a timestamp (no wall clock in identity). */
  readonly createdAtBasis: "DETERMINISTIC_INPUTS_ONLY";
  readonly portfolioDigest: string;
  readonly allocationDigest: string;
  readonly scoreVersion: typeof PORTFOLIO_PRIORITY_SCORE_VERSION;
  readonly allocationVersion: typeof PORTFOLIO_ALLOCATION_VERSION;
  /** Selected members sorted by order. */
  readonly selectedMembers: readonly CampaignPlanMember[];
  readonly unselectedMembers: readonly CampaignPlanUnselectedMember[];
  readonly totalAllocatedUnits: number;
  readonly unallocatedUnits: number;
  readonly checkpointPolicy: PlanCheckpointPolicy;
  readonly ownerScopeRequirements: PlanOwnerScopeRequirements;
  /** `plan:sha256:<24>` over the canonical serialization above. */
  readonly manifestDigest: string;
}

const REPLAY_BY_KIND: Readonly<Record<PortfolioMemberKind, PlanReplayPolicy>> =
  Object.freeze({
    JOURNEY: "FIRST_PLUS_FRESH",
    API: "FIRST_PLUS_FRESH",
    EXPLORATION: "REPLAY_ON_ANOMALY",
  });

const MINIMIZATION_BY_KIND: Readonly<
  Record<PortfolioMemberKind, PlanMinimizationPolicy>
> = Object.freeze({
  JOURNEY: "ON_CONFIRMED_REPRODUCTION",
  API: "ON_CONFIRMED_REPRODUCTION",
  EXPLORATION: "NONE",
});

/**
 * Build the plan manifest from a portfolio and its deterministic allocation.
 * Fails closed if the allocation references members that do not exist in the
 * portfolio or if any invariant is violated.
 */
export function buildCampaignPlanManifest(input: {
  readonly portfolio: CampaignPortfolio;
  readonly allocation: PortfolioAllocation;
}): CampaignPlanManifest {
  const { portfolio, allocation } = input;

  const memberById = new Map(
    portfolio.members.map((member) => [member.memberId, member]),
  );
  const zeroReasons = new Map(
    allocation.zeroBudget.map((entry) => [entry.memberId, entry.reasonCode]),
  );

  const selectedMembers: CampaignPlanMember[] = allocation.selected.map(
    (entry) => {
      const member = memberById.get(entry.memberId);
      if (!member) throw new Error("PLAN_MEMBER_UNKNOWN");
      // Blocked members can never be selected (hard gate, defensively enforced).
      if (zeroReasons.has(entry.memberId))
        throw new Error("PLAN_BLOCKED_MEMBER_SELECTED");
      return {
        memberId: entry.memberId,
        targetId: entry.targetId,
        kind: entry.kind,
        order: entry.executionOrder,
        allocatedUnits: entry.allocatedUnits,
        maxRetries: entry.maxRetries,
        reasons: [
          ...(member.input.ownerBlockedOperations.length > 0
            ? []
            : ["ELIGIBLE"]),
          `SCORE:${entry.priorityScore}`,
          ...(entry.starvationFloorApplied ? ["STARVATION_FLOOR_APPLIED"] : []),
        ],
        expectedSemanticDepth: member.input.depthClass,
        expectedCoverageClass:
          member.input.depthClass === "NONE"
            ? "COVERAGE_GAP_PRESENT"
            : "SEMANTIC_CONTRACT_COVERED",
        replayPolicy: REPLAY_BY_KIND[entry.kind],
        minimizationPolicy: MINIMIZATION_BY_KIND[entry.kind],
      };
    },
  );

  const fundedIds = new Set(allocation.selected.map((entry) => entry.memberId));
  const unfundedEligible = new Set(allocation.unfundedEligibleMemberIds);
  const unselectedMembers: CampaignPlanUnselectedMember[] = portfolio.members
    .filter((member) => !fundedIds.has(member.memberId))
    .map((member) => {
      if (zeroReasons.has(member.memberId)) {
        return {
          memberId: member.memberId,
          targetId: member.input.targetId,
          reasonCode: `ZERO_BUDGET_${zeroReasons.get(member.memberId)}`,
        };
      }
      if (!unfundedEligible.has(member.memberId)) {
        // The allocation partition guarantees this cannot happen.
        throw new Error("PLAN_UNSELECTED_MEMBER_UNACCOUNTED");
      }
      return {
        memberId: member.memberId,
        targetId: member.input.targetId,
        reasonCode: "BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT",
      };
    });
  unselectedMembers.sort((left, right) =>
    left.memberId.localeCompare(right.memberId),
  );

  const core = {
    manifestVersion: CAMPAIGN_PLAN_MANIFEST_VERSION,
    createdAtBasis: "DETERMINISTIC_INPUTS_ONLY" as const,
    portfolioDigest: portfolio.portfolioDigest,
    allocationDigest: allocation.digest,
    scoreVersion: PORTFOLIO_PRIORITY_SCORE_VERSION,
    allocationVersion: PORTFOLIO_ALLOCATION_VERSION,
    selectedMembers,
    unselectedMembers,
    totalAllocatedUnits: allocation.allocatedUnits,
    unallocatedUnits: allocation.unallocatedUnits,
    checkpointPolicy: {
      checkpointAfterEveryWorkItem: true,
      resumeRequiresFingerprintMatch: true,
      interruptedWorkBookkeepingRequired: true,
    },
    ownerScopeRequirements: {
      status: "FROZEN_BY_OWNER",
      reason: "INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE",
      runtimeAuthorizationRequired: "SEPARATE_OWNER_TOKEN_REQUIRED",
      planningPhaseExecutionAuthority: "NONE",
    },
  } satisfies Omit<CampaignPlanManifest, "planId" | "manifestDigest">;

  const planId = `plan:sha256:${portfolioDigestOf(core).slice("sha256:".length)}`;
  return {
    ...core,
    planId,
    manifestDigest: `plan:sha256:${portfolioDigestOf({ ...core, planId }).slice("sha256:".length)}`,
  };
}
