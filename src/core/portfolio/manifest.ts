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
  PORTFOLIO_MEMBER_KINDS,
  PORTFOLIO_DEPTH_CLASSES,
  isPortfolioMemberId,
  portfolioTextSafe,
} from "./types";
import {
  PORTFOLIO_ALLOCATION_VERSION,
  type PortfolioAllocation,
} from "./allocation";
import {
  PORTFOLIO_BLOCK_REASONS,
  PORTFOLIO_PRIORITY_SCORE_VERSION,
} from "./scoring";
import {
  assertExactKeys,
  assertNonNegativeInteger,
  requireRuntimeArray,
  requireRuntimeRecord,
} from "../campaign/runtimeValidation";

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
          ...(entry.selectionReasons ?? []),
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

// ---------------------------------------------------------------------------
// Strict document parsing (Phase 16H DEF-03): a rendered plan document is
// DATA, never authority. Parsing enforces exact keys, pinned versions, fixed
// owner/checkpoint obligations, canonical ordering, and recomputes BOTH
// identity digests so any tampered byte fails closed.
// ---------------------------------------------------------------------------

export const ERR_PLAN_MANIFEST_INVALID = "PLAN_MANIFEST_INVALID";
export const ERR_PLAN_MANIFEST_UNKNOWN_FIELD = "PLAN_MANIFEST_UNKNOWN_FIELD";

const MANIFEST_DOCUMENT_KEYS = [
  "manifestVersion",
  "planId",
  "createdAtBasis",
  "portfolioDigest",
  "allocationDigest",
  "scoreVersion",
  "allocationVersion",
  "selectedMembers",
  "unselectedMembers",
  "totalAllocatedUnits",
  "unallocatedUnits",
  "checkpointPolicy",
  "ownerScopeRequirements",
  "manifestDigest",
] as const;

const PLAN_MEMBER_KEYS = [
  "memberId",
  "targetId",
  "kind",
  "order",
  "allocatedUnits",
  "maxRetries",
  "reasons",
  "expectedSemanticDepth",
  "expectedCoverageClass",
  "replayPolicy",
  "minimizationPolicy",
] as const;

const UNSELECTED_MEMBER_KEYS = ["memberId", "targetId", "reasonCode"] as const;

const CHECKPOINT_POLICY_KEYS = [
  "checkpointAfterEveryWorkItem",
  "resumeRequiresFingerprintMatch",
  "interruptedWorkBookkeepingRequired",
] as const;

const OWNER_SCOPE_KEYS = [
  "status",
  "reason",
  "runtimeAuthorizationRequired",
  "planningPhaseExecutionAuthority",
] as const;

const EXPECTED_COVERAGE_CLASSES: readonly string[] = [
  "COVERAGE_GAP_PRESENT",
  "SEMANTIC_CONTRACT_COVERED",
];

const REASON_TOKEN_RE = /^[-A-Z0-9_:]{1,96}$/;
const PLAN_ID_RE = /^plan:sha256:[0-9a-f]{24}$/;
const TARGET_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;

function manifestFieldError(field: string): string {
  return `${ERR_PLAN_MANIFEST_INVALID}:${field}`;
}

/**
 * Strictly parse a rendered campaign-plan manifest document. Fails closed on
 * unknown fields, version drift, weakened owner/checkpoint policy, non-
 * canonical ordering, budget incoherence, and any identity-digest mismatch.
 */
export function parseCampaignPlanManifestDocument(
  value: unknown,
): CampaignPlanManifest {
  const record = requireRuntimeRecord(
    value,
    ERR_PLAN_MANIFEST_INVALID,
  );
  assertExactKeys(record, MANIFEST_DOCUMENT_KEYS, ERR_PLAN_MANIFEST_UNKNOWN_FIELD);

  if (record.manifestVersion !== CAMPAIGN_PLAN_MANIFEST_VERSION)
    throw new Error(manifestFieldError("manifestVersion"));
  if (record.createdAtBasis !== "DETERMINISTIC_INPUTS_ONLY")
    throw new Error(manifestFieldError("createdAtBasis"));
  if (record.scoreVersion !== PORTFOLIO_PRIORITY_SCORE_VERSION)
    throw new Error(manifestFieldError("scoreVersion"));
  if (record.allocationVersion !== PORTFOLIO_ALLOCATION_VERSION)
    throw new Error(manifestFieldError("allocationVersion"));

  for (const field of ["planId", "manifestDigest"] as const) {
    if (typeof record[field] !== "string" || !PLAN_ID_RE.test(record[field]))
      throw new Error(manifestFieldError(field));
  }
  for (const [field, prefix] of [
    ["portfolioDigest", "pf:"],
    ["allocationDigest", "palloc:"],
  ] as const) {
    const digest = record[field];
    if (
      typeof digest !== "string" ||
      !digest.startsWith(prefix) ||
      !PLAN_ID_RE.test(`plan:${digest.slice(prefix.length)}`)
    ) {
      throw new Error(manifestFieldError(field));
    }
  }

  assertNonNegativeInteger(
    record.totalAllocatedUnits,
    manifestFieldError("totalAllocatedUnits"),
  );
  assertNonNegativeInteger(
    record.unallocatedUnits,
    manifestFieldError("unallocatedUnits"),
  );

  const checkpointPolicy = requireRuntimeRecord(
    record.checkpointPolicy,
    `${ERR_PLAN_MANIFEST_INVALID}:checkpointPolicy`,
  );
  assertExactKeys(
    checkpointPolicy,
    CHECKPOINT_POLICY_KEYS,
    ERR_PLAN_MANIFEST_UNKNOWN_FIELD,
  );
  for (const key of CHECKPOINT_POLICY_KEYS) {
    if (checkpointPolicy[key] !== true)
      throw new Error(manifestFieldError(`checkpointPolicy.${key}`));
  }

  const ownerScopeRequirements = requireRuntimeRecord(
    record.ownerScopeRequirements,
    `${ERR_PLAN_MANIFEST_INVALID}:ownerScopeRequirements`,
  );
  assertExactKeys(
    ownerScopeRequirements,
    OWNER_SCOPE_KEYS,
    ERR_PLAN_MANIFEST_UNKNOWN_FIELD,
  );
  if (
    ownerScopeRequirements.status !== "FROZEN_BY_OWNER" ||
    ownerScopeRequirements.reason !==
      "INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE" ||
    ownerScopeRequirements.runtimeAuthorizationRequired !==
      "SEPARATE_OWNER_TOKEN_REQUIRED" ||
    ownerScopeRequirements.planningPhaseExecutionAuthority !== "NONE"
  ) {
    throw new Error(manifestFieldError("ownerScopeRequirements"));
  }

  const rawSelected = requireRuntimeArray(
    record.selectedMembers,
    `${ERR_PLAN_MANIFEST_INVALID}:selectedMembers`,
  );
  const seenIds = new Set<string>();
  let runningOrder = 0;
  let sumAllocated = 0;
  const selectedMembers = rawSelected.map((raw) => {
    const member = requireRuntimeRecord(
      raw,
      `${ERR_PLAN_MANIFEST_INVALID}:selectedMember`,
    );
    assertExactKeys(member, PLAN_MEMBER_KEYS, ERR_PLAN_MANIFEST_UNKNOWN_FIELD);
    if (
      typeof member.memberId !== "string" ||
      !isPortfolioMemberId(member.memberId) ||
      seenIds.has(member.memberId)
    ) {
      throw new Error(manifestFieldError("selectedMember.memberId"));
    }
    seenIds.add(member.memberId);
    if (
      typeof member.targetId !== "string" ||
      !TARGET_ID_RE.test(member.targetId) ||
      !portfolioTextSafe(member.targetId)
    ) {
      throw new Error(manifestFieldError("selectedMember.targetId"));
    }
    if (
      typeof member.kind !== "string" ||
      !(PORTFOLIO_MEMBER_KINDS as readonly string[]).includes(member.kind)
    ) {
      throw new Error(manifestFieldError("selectedMember.kind"));
    }
    assertNonNegativeInteger(
      member.order,
      manifestFieldError("selectedMember.order"),
    );
    if (member.order !== runningOrder)
      throw new Error(manifestFieldError("selectedMember.orderNotCanonical"));
    runningOrder += 1;
    assertNonNegativeInteger(
      member.allocatedUnits,
      manifestFieldError("selectedMember.allocatedUnits"),
    );
    if (member.allocatedUnits <= 0)
      throw new Error(manifestFieldError("selectedMember.allocatedUnitsPositive"));
    sumAllocated += member.allocatedUnits;
    assertNonNegativeInteger(
      member.maxRetries,
      manifestFieldError("selectedMember.maxRetries"),
    );
    const rawReasons = requireRuntimeArray(
      member.reasons,
      `${ERR_PLAN_MANIFEST_INVALID}:selectedMember.reasons`,
    );
    const reasonTokens: string[] = [];
    for (const reason of rawReasons) {
      if (typeof reason !== "string" || !REASON_TOKEN_RE.test(reason))
        throw new Error(manifestFieldError("selectedMember.reasonToken"));
      reasonTokens.push(reason);
    }
    if (
      typeof member.expectedSemanticDepth !== "string" ||
      !(PORTFOLIO_DEPTH_CLASSES as readonly string[]).includes(
        member.expectedSemanticDepth,
      )
    ) {
      throw new Error(manifestFieldError("selectedMember.expectedSemanticDepth"));
    }
    if (
      typeof member.expectedCoverageClass !== "string" ||
      !EXPECTED_COVERAGE_CLASSES.includes(member.expectedCoverageClass)
    ) {
      throw new Error(manifestFieldError("selectedMember.expectedCoverageClass"));
    }
    if (
      typeof member.replayPolicy !== "string" ||
      !PLAN_REPLAY_POLICIES.includes(
        member.replayPolicy as PlanReplayPolicy,
      )
    ) {
      throw new Error(manifestFieldError("selectedMember.replayPolicy"));
    }
    if (
      typeof member.minimizationPolicy !== "string" ||
      !PLAN_MINIMIZATION_POLICIES.includes(
        member.minimizationPolicy as PlanMinimizationPolicy,
      )
    ) {
      throw new Error(manifestFieldError("selectedMember.minimizationPolicy"));
    }
    return {
      memberId: member.memberId,
      targetId: member.targetId,
      kind: member.kind as PortfolioMemberKind,
      order: member.order,
      allocatedUnits: member.allocatedUnits,
      maxRetries: member.maxRetries,
      reasons: reasonTokens,
      expectedSemanticDepth: member.expectedSemanticDepth,
      expectedCoverageClass: member.expectedCoverageClass,
      replayPolicy: member.replayPolicy as PlanReplayPolicy,
      minimizationPolicy: member.minimizationPolicy as PlanMinimizationPolicy,
    };
  });
  if (sumAllocated !== record.totalAllocatedUnits)
    throw new Error(manifestFieldError("totalAllocatedUnitsMismatch"));

  const rawUnselected = requireRuntimeArray(
    record.unselectedMembers,
    `${ERR_PLAN_MANIFEST_INVALID}:unselectedMembers`,
  );
  const unselectedMembers: CampaignPlanUnselectedMember[] = [];
  let previousUnselectedId: string | null = null;
  for (const raw of rawUnselected) {
    const entry = requireRuntimeRecord(
      raw,
      `${ERR_PLAN_MANIFEST_INVALID}:unselectedMember`,
    );
    assertExactKeys(entry, UNSELECTED_MEMBER_KEYS, ERR_PLAN_MANIFEST_UNKNOWN_FIELD);
    if (
      typeof entry.memberId !== "string" ||
      !isPortfolioMemberId(entry.memberId) ||
      seenIds.has(entry.memberId)
    ) {
      throw new Error(manifestFieldError("unselectedMember.memberId"));
    }
    seenIds.add(entry.memberId);
    if (
      previousUnselectedId !== null &&
      previousUnselectedId.localeCompare(entry.memberId) >= 0
    ) {
      throw new Error(manifestFieldError("unselectedMembers.notCanonicallySorted"));
    }
    previousUnselectedId = entry.memberId;
    if (
      typeof entry.targetId !== "string" ||
      !TARGET_ID_RE.test(entry.targetId) ||
      !portfolioTextSafe(entry.targetId)
    ) {
      throw new Error(manifestFieldError("unselectedMember.targetId"));
    }
    if (typeof entry.reasonCode !== "string") {
      throw new Error(manifestFieldError("unselectedMember.reasonCode"));
    }
    const zeroBudgetReason = entry.reasonCode.startsWith("ZERO_BUDGET_")
      ? entry.reasonCode.slice("ZERO_BUDGET_".length)
      : null;
    const reasonValid =
      entry.reasonCode === "BUDGET_EXHAUSTED_OR_RESERVE_CONSTRAINT" ||
      (zeroBudgetReason !== null &&
        (PORTFOLIO_BLOCK_REASONS as readonly string[]).includes(zeroBudgetReason));
    if (!reasonValid) throw new Error(manifestFieldError("unselectedMember.reasonCode"));
    unselectedMembers.push({
      memberId: entry.memberId,
      targetId: entry.targetId,
      reasonCode: entry.reasonCode,
    });
  }

  // Identity recomputation must match EXACTLY how buildCampaignPlanManifest
  // derived both digests; any drift anywhere above fails closed here.
  const core = {
    manifestVersion: CAMPAIGN_PLAN_MANIFEST_VERSION,
    createdAtBasis: "DETERMINISTIC_INPUTS_ONLY" as const,
    portfolioDigest: record.portfolioDigest as string,
    allocationDigest: record.allocationDigest as string,
    scoreVersion: PORTFOLIO_PRIORITY_SCORE_VERSION,
    allocationVersion: PORTFOLIO_ALLOCATION_VERSION,
    selectedMembers,
    unselectedMembers,
    totalAllocatedUnits: record.totalAllocatedUnits,
    unallocatedUnits: record.unallocatedUnits,
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
  if (planId !== record.planId)
    throw new Error(manifestFieldError("planIdRecomputationMismatch"));
  const manifestDigest = `plan:sha256:${portfolioDigestOf({ ...core, planId }).slice("sha256:".length)}`;
  if (manifestDigest !== record.manifestDigest)
    throw new Error(manifestFieldError("manifestDigestRecomputationMismatch"));

  return { ...core, planId, manifestDigest };
}
