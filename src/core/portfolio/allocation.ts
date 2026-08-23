// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — bounded deterministic budget allocation
// (WORKSTREAM W3).
//
// Allocates a bounded unit budget across the eligible portfolio members with
// explicit caps/floors/starvation controls/reserved exploration share/retry
// ceilings. Allocation is a constrained deterministic selection problem, not
// a free-form heuristic.
//
// Hard invariants (ACCEPTANCE MATRIX C):
//   - total allocated budget NEVER exceeds the configured total;
//   - per-member ceiling/floor and retry ceiling enforced;
//   - blocked/ineligible members receive exactly zero budget (hard gate,
//     never overridden by starvation logic);
//   - stale/unavailable/unevaluated required evidence fails closed (zero
//     budget through the eligibility gate);
//   - starvation prevention works WITHOUT overriding safety/currentness
//     blockers;
//   - tie-breaking is deterministic (score desc, then memberId asc);
//   - identical normalized inputs produce byte-identical allocations.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import {
  type PORTFOLIO_COST_CLASSES,
  type CampaignPortfolio,
  type PortfolioMemberKind,
  portfolioDigestOf,
} from "./types";
import {
  type PortfolioBlockReason,
  type PortfolioPreviousProvenance,
  portfolioEligibility,
  scorePortfolioMember,
} from "./scoring";

/** Allocation identity version; a change makes allocations incomparable. */
export const PORTFOLIO_ALLOCATION_VERSION =
  "nightwatch.portfolio-allocation.v1" as const;

/** Deterministic execution-unit cost per class (bounded integers). */
export const PORTFOLIO_UNIT_COST: Readonly<
  Record<(typeof PORTFOLIO_COST_CLASSES)[number], number>
> = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

/** Versioned allocation policy. All fields are bounded non-negative integers. */
export interface PortfolioBudgetPolicy {
  readonly policyVersion: typeof PORTFOLIO_ALLOCATION_VERSION;
  /** Total execution units available to the plan. */
  readonly totalUnits: number;
  /** Maximum units allocatable to any single member. */
  readonly perMemberCeiling: number;
  /** Minimum grant for eligible starved members (starvation prevention). */
  readonly floorUnits: number;
  /** Eligible members at/above this bucket age qualify for the floor. */
  readonly starvationThresholdBuckets: number;
  /** Per-member retry ceiling carried into the plan manifest. */
  readonly retryCeilingPerMember: number;
  /** Units only EXPLORATION-kind members may consume. */
  readonly reservedExplorationUnits: number;
}

export function validatePortfolioBudgetPolicy(
  policy: PortfolioBudgetPolicy,
): void {
  if (policy.policyVersion !== PORTFOLIO_ALLOCATION_VERSION) {
    throw new Error("PORTFOLIO_ALLOCATION_POLICY_VERSION_INVALID");
  }
  const values = [
    policy.totalUnits,
    policy.perMemberCeiling,
    policy.floorUnits,
    policy.starvationThresholdBuckets,
    policy.retryCeilingPerMember,
    policy.reservedExplorationUnits,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("PORTFOLIO_ALLOCATION_POLICY_VALUE_INVALID");
  }
  if (policy.perMemberCeiling < 1)
    throw new Error("PORTFOLIO_ALLOCATION_CEILING_INVALID");
  if (policy.floorUnits > policy.perMemberCeiling)
    throw new Error("PORTFOLIO_ALLOCATION_FLOOR_EXCEEDS_CEILING");
  if (policy.reservedExplorationUnits > policy.totalUnits)
    throw new Error("PORTFOLIO_ALLOCATION_RESERVE_EXCEEDS_TOTAL");
}

/** One funded member of the plan. */
export interface PortfolioAllocationEntry {
  readonly memberId: string;
  readonly targetId: string;
  readonly kind: PortfolioMemberKind;
  readonly allocatedUnits: number;
  /** 0-based deterministic execution order among selected members. */
  readonly executionOrder: number;
  readonly maxRetries: number;
  readonly starvationFloorApplied: boolean;
  readonly priorityScore: number;
  /** Optional bounded source-impact reasons supplied by a change-aware planner. */
  readonly selectionReasons?: readonly string[];
}

/** One explicitly unfunded member (hard gate / failed evidence). */
export interface PortfolioZeroBudgetEntry {
  readonly memberId: string;
  readonly targetId: string;
  readonly reasonCode: PortfolioBlockReason;
}

/** The complete deterministic allocation result. */
export interface PortfolioAllocation {
  readonly allocationVersion: typeof PORTFOLIO_ALLOCATION_VERSION;
  readonly policy: PortfolioBudgetPolicy;
  /** Selected members sorted by executionOrder. */
  readonly selected: readonly PortfolioAllocationEntry[];
  /** Unfunded members sorted by memberId. */
  readonly zeroBudget: readonly PortfolioZeroBudgetEntry[];
  /**
   * ELIGIBLE members that received zero units (budget exhausted or the
   * exploration-reserve constraint bound first). Sorted by memberId. The
   * three lists partition the portfolio exactly: selected + zeroBudget +
   * unfundedEligibleMemberIds covers every member once.
   */
  readonly unfundedEligibleMemberIds: readonly string[];
  readonly allocatedUnits: number;
  readonly unallocatedUnits: number;
  /** Portion of the exploration reserve left unconsumed. */
  readonly reservedExplorationUnused: number;
  /** Present only when an explicit source-impact ranking overlay was used. */
  readonly selectionContextDigest?: string;
  /** `palloc:sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
}

/** Safe score/reason override produced by a pure planning overlay. */
export interface PortfolioScoreOverride {
  readonly score: number;
  readonly selectionReasons: readonly string[];
}

interface RankedCandidate {
  readonly memberId: string;
  readonly targetId: string;
  readonly kind: PortfolioMemberKind;
  readonly score: number;
  readonly starvationEligible: boolean;
  readonly selectionReasons?: readonly string[];
}

function validateScoreOverrides(
  portfolio: CampaignPortfolio,
  overrides: Readonly<Record<string, PortfolioScoreOverride>> | undefined,
  selectionContextDigest: string | undefined,
): void {
  if (selectionContextDigest !== undefined && overrides === undefined) {
    throw new Error('PORTFOLIO_ALLOCATION_SELECTION_CONTEXT_WITHOUT_OVERRIDE');
  }
  if (selectionContextDigest !== undefined && !/^pci:sha256:[0-9a-f]{24}$/.test(selectionContextDigest)) {
    throw new Error('PORTFOLIO_ALLOCATION_SELECTION_CONTEXT_INVALID');
  }
  if (overrides === undefined) return;
  const memberIds = new Set(portfolio.members.map((member) => member.memberId));
  for (const [memberId, override] of Object.entries(overrides)) {
    if (!memberIds.has(memberId)) throw new Error('PORTFOLIO_ALLOCATION_SCORE_OVERRIDE_UNKNOWN_MEMBER');
    if (!Number.isInteger(override.score) || !Number.isFinite(override.score)) {
      throw new Error('PORTFOLIO_ALLOCATION_SCORE_OVERRIDE_INVALID');
    }
    if (!Array.isArray(override.selectionReasons) || override.selectionReasons.length > 16) {
      throw new Error('PORTFOLIO_ALLOCATION_SELECTION_REASONS_INVALID');
    }
    for (const reason of override.selectionReasons) {
      if (typeof reason !== 'string' || !/^[A-Z][A-Z0-9_:-]{0,79}$/.test(reason)) {
        throw new Error('PORTFOLIO_ALLOCATION_SELECTION_REASON_INVALID');
      }
    }
  }
}

/**
 * Allocate the bounded budget across one portfolio.
 *
 * `previousProvenance` maps memberId -> previously observed provenance used
 * by the movement classifier during scoring; absent entries mean "no
 * movement history" for that member.
 */
export function allocatePortfolioBudget(input: {
  readonly portfolio: CampaignPortfolio;
  readonly policy: PortfolioBudgetPolicy;
  readonly previousProvenance?: Readonly<
    Record<string, PortfolioPreviousProvenance>
  >;
  /** Optional effective score/reason overlay from a pure planner. */
  readonly scoreOverrides?: Readonly<Record<string, PortfolioScoreOverride>>;
  readonly selectionContextDigest?: string;
}): PortfolioAllocation {
  validatePortfolioBudgetPolicy(input.policy);
  validateScoreOverrides(input.portfolio, input.scoreOverrides, input.selectionContextDigest);

  const previousByMember = input.previousProvenance ?? {};
  const ranked: RankedCandidate[] = [];
  const zeroBudget: PortfolioZeroBudgetEntry[] = [];

  for (const member of input.portfolio.members) {
    const eligibility = portfolioEligibility(member);
    if (!eligibility.eligible) {
      zeroBudget.push({
        memberId: member.memberId,
        targetId: member.input.targetId,
        reasonCode: eligibility.reasonCode,
      });
      continue;
    }
    const score = scorePortfolioMember(
      member,
      previousByMember[member.memberId] ?? null,
    );
    const override = input.scoreOverrides?.[member.memberId];
    ranked.push({
      memberId: member.memberId,
      targetId: member.input.targetId,
      kind: member.input.kind,
      score: override?.score ?? score.total,
      ...(override === undefined ? {} : { selectionReasons: [...override.selectionReasons] }),
      starvationEligible:
        member.input.starvationAgeBuckets >=
        input.policy.starvationThresholdBuckets,
    });
  }

  // Deterministic order: priority score desc, then memberId asc.
  ranked.sort((left, right) =>
    left.score === right.score
      ? left.memberId.localeCompare(right.memberId)
      : right.score - left.score,
  );

  const allocatedByMember = new Map<string, number>();
  const floorApplied = new Set<string>();
  let totalAllocated = 0;
  let nonExplorationAllocated = 0;
  let reserveUsed = 0;
  const allocatableNonExploration =
    input.policy.totalUnits - input.policy.reservedExplorationUnits;

  const headroomFor = (candidate: RankedCandidate): number => {
    const already = allocatedByMember.get(candidate.memberId) ?? 0;
    const byCeiling = input.policy.perMemberCeiling - already;
    const byTotal = input.policy.totalUnits - totalAllocated;
    if (candidate.kind === "EXPLORATION") return Math.min(byCeiling, byTotal);
    return Math.min(
      byCeiling,
      byTotal,
      allocatableNonExploration - nonExplorationAllocated,
    );
  };

  const grant = (candidate: RankedCandidate, units: number): void => {
    if (units <= 0) return;
    allocatedByMember.set(
      candidate.memberId,
      (allocatedByMember.get(candidate.memberId) ?? 0) + units,
    );
    totalAllocated += units;
    if (candidate.kind === "EXPLORATION") {
      reserveUsed += Math.min(
        units,
        input.policy.reservedExplorationUnits - reserveUsed,
      );
    } else {
      nonExplorationAllocated += units;
    }
  };

  // Pass 1 — starvation floors for eligible starved members (priority order).
  // Floors never override blockers: only ranked (eligible) members are here.
  for (const candidate of ranked) {
    if (!candidate.starvationEligible || input.policy.floorUnits <= 0) continue;
    const grantable = Math.min(headroomFor(candidate), input.policy.floorUnits);
    if (grantable > 0) {
      grant(candidate, grantable);
      floorApplied.add(candidate.memberId);
    }
  }

  // Pass 2 — remaining budget by priority until exhaustion or ceilings.
  for (const candidate of ranked) {
    const headroom = headroomFor(candidate);
    if (headroom <= 0) continue;
    grant(candidate, headroom);
  }

  const selected: PortfolioAllocationEntry[] = ranked
    .filter((candidate) => (allocatedByMember.get(candidate.memberId) ?? 0) > 0)
    .map((candidate, index) => ({
      memberId: candidate.memberId,
      targetId: candidate.targetId,
      kind: candidate.kind,
      allocatedUnits: allocatedByMember.get(candidate.memberId) ?? 0,
      executionOrder: index,
      maxRetries: input.policy.retryCeilingPerMember,
      starvationFloorApplied: floorApplied.has(candidate.memberId),
      priorityScore: candidate.score,
      ...(candidate.selectionReasons === undefined ? {} : { selectionReasons: [...candidate.selectionReasons] }),
    }));

  const unfundedEligible = ranked
    .filter(
      (candidate) => (allocatedByMember.get(candidate.memberId) ?? 0) === 0,
    )
    .map((candidate) => candidate.memberId)
    .sort((left, right) => left.localeCompare(right));

  zeroBudget.sort((left, right) => left.memberId.localeCompare(right.memberId));

  const allocation = {
    allocationVersion: PORTFOLIO_ALLOCATION_VERSION,
    policy: input.policy,
    selected,
    zeroBudget,
    unfundedEligibleMemberIds: unfundedEligible,
    allocatedUnits: totalAllocated,
    unallocatedUnits: input.policy.totalUnits - totalAllocated,
    reservedExplorationUnused:
      input.policy.reservedExplorationUnits - reserveUsed,
    ...(input.selectionContextDigest === undefined ? {} : { selectionContextDigest: input.selectionContextDigest }),
  };

  const verified = verifyAllocationInvariants(allocation, input.portfolio);
  if (!verified.clean) {
    throw new Error(
      `PORTFOLIO_ALLOCATION_INVARIANT_VIOLATION:${verified.firstViolation}`,
    );
  }

  return {
    ...allocation,
    digest: `palloc:${portfolioDigestOf(allocation)}`,
  };
}

/**
 * Mechanical invariant verification. Returns categorical violation counts —
 * these are the ACCEPTANCE MATRIX C quality floors (must all be zero).
 */
export function verifyAllocationInvariants(
  allocation: Pick<
    PortfolioAllocation,
    "selected" | "zeroBudget" | "unfundedEligibleMemberIds" | "policy"
  > & { readonly allocatedUnits?: number },
  portfolio: CampaignPortfolio,
): {
  readonly clean: boolean;
  readonly firstViolation: string | null;
  readonly budgetOverflowCount: number;
  readonly blockedWithBudgetCount: number;
  readonly ceilingViolationsCount: number;
  readonly determinismKey: string;
} {
  const zeroReasons = new Set(
    allocation.zeroBudget.map((entry) => entry.memberId),
  );
  let overflow = 0;
  let blockedWithBudget = 0;
  let ceilingViolations = 0;

  let sum = 0;
  const seen = new Set<string>();
  for (const entry of allocation.selected) {
    if (seen.has(entry.memberId)) {
      ceilingViolations += 1;
      continue;
    }
    seen.add(entry.memberId);
    sum += entry.allocatedUnits;
    if (
      entry.allocatedUnits > allocation.policy.perMemberCeiling ||
      entry.allocatedUnits <= 0
    )
      ceilingViolations += 1;
    if (zeroReasons.has(entry.memberId)) blockedWithBudget += 1;
  }
  if (sum > allocation.policy.totalUnits) overflow += 1;

  // Every portfolio member appears exactly once across the partition:
  // selected + zeroBudget + unfundedEligibleMemberIds.
  const unfunded = new Set(allocation.unfundedEligibleMemberIds);
  let partitionViolations = 0;
  for (const member of portfolio.members) {
    const inSelected = seen.has(member.memberId);
    const inZero = zeroReasons.has(member.memberId);
    const inUnfunded = unfunded.has(member.memberId);
    const count =
      (inSelected ? 1 : 0) + (inZero ? 1 : 0) + (inUnfunded ? 1 : 0);
    if (count !== 1) partitionViolations += 1;
  }
  if (
    seen.size + zeroReasons.size + unfunded.size !==
    portfolio.members.length
  ) {
    partitionViolations += 1;
  }
  ceilingViolations += partitionViolations;

  const firstViolation =
    overflow > 0
      ? "BUDGET_OVERFLOW"
      : blockedWithBudget > 0
        ? "BLOCKED_MEMBER_FUNDED"
        : ceilingViolations > 0
          ? "CEILING_OR_ACCOUNTING_VIOLATION"
          : null;

  return {
    clean: firstViolation === null,
    firstViolation,
    budgetOverflowCount: overflow,
    blockedWithBudgetCount: blockedWithBudget,
    ceilingViolationsCount: ceilingViolations,
    determinismKey: `${sum}/${allocation.selected.length}:${allocation.zeroBudget.length}`,
  };
}
