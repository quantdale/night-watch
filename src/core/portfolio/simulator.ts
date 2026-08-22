// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — deterministic shadow portfolio simulator/backtest
// (WORKSTREAM W7).
//
// A pure local/synthetic simulation comparing a BASELINE allocation strategy
// (equal split across all non-blocked members, ignoring evidence quality)
// against the OPTIMIZED portfolio allocation on the same fixed synthetic
// yield model.
//
// HARD INTERPRETATION RULE (ACCEPTANCE MATRIX D/F): every result carries the
// fixed marker that synthetic deltas demonstrate planner properties ONLY.
// They NEVER prove real-world bug-yield improvement; that requires a later
// separately authorized contained DEV campaign.
//
// The yield model per member is derived deterministically from the member's
// own fixture data (bounded concave useful-candidate curve with duplicate
// waste and hard zero for blocked/stale members). No randomness, no wall
// clock, identical inputs -> byte-identical outputs (verified x3 by tests).
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence.
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

/** Simulator identity version. */
export const PORTFOLIO_SIMULATOR_VERSION =
  "nightwatch.portfolio-simulator.v1" as const;

/** Fixed interpretation marker carried by EVERY simulation record. */
export const SIMULATION_INTERPRETATION =
  "PLANNER_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD" as const;

export const BASELINE_STRATEGIES = ["EQUAL_SPLIT_IGNORE_EVIDENCE"] as const;
export type BaselineStrategy = (typeof BASELINE_STRATEGIES)[number];

/**
 * Deterministic synthetic yield-model parameters for one member. All fields
 * are caller/fixture-supplied integers; nothing is inferred randomly.
 */
export interface MemberYieldModel {
  readonly memberId: string;
  /** Saturation cap: max useful candidates reachable at any spend. */
  readonly saturationCap: number;
  /** Half-saturation spend: units needed to reach cap/2. Minimum 1. */
  readonly halfSaturationUnits: number;
  /**
   * Duplicate-waste ratio permille: fraction of spend consumed by duplicate
   * re-observations before the curve applies (0..1000).
   */
  readonly duplicateWastePermille: number;
  /** Hard zero: model yields nothing regardless of spend. */
  readonly yieldsNothing: boolean;
}

/** One simulated side's aggregate metrics. */
export interface SimulationSideMetrics {
  readonly strategy: string;
  readonly totalUnitsSpent: number;
  /** Sum of useful candidates produced under the model. */
  readonly usefulCandidates: number;
  /** Units spent on members that could never yield (wasted by construction). */
  readonly wastedUnitsOnNonYielding: number;
  /** Members that received at least one unit. */
  readonly fundedMemberCount: number;
  /** Eligible starved members that remained unfunded (starvation failures). */
  readonly starvedEligibleMembers: number;
}

/** The complete deterministic backtest result. */
export interface ShadowSimulationResult {
  readonly simulatorVersion: typeof PORTFOLIO_SIMULATOR_VERSION;
  readonly interpretation: typeof SIMULATION_INTERPRETATION;
  readonly allocationVersion: typeof PORTFOLIO_ALLOCATION_VERSION;
  readonly portfolioDigest: string;
  readonly baseline: SimulationSideMetrics;
  readonly optimized: SimulationSideMetrics;
  /** optimized.usefulCandidates - baseline.usefulCandidates (integer delta). */
  readonly usefulCandidateDelta: number;
  /**
   * Fixed claim marker: this delta is planner-property evidence only, NOT a
   * real-world bug-yield proof.
   */
  readonly realWorldBugYieldClaim: false;
  /** `psim:sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
}

/** Fail-closed model accessor (noUncheckedIndexedAccess-safe). */
function requireModel(
  models: Readonly<Record<string, MemberYieldModel>>,
  memberId: string,
): MemberYieldModel {
  const model = models[memberId];
  if (!model) throw new Error("PORTFOLIO_SIM_MODEL_MISSING");
  return model;
}

/**
 * Strict model-shape validation (Phase 16H DEF-05). Malformed models must
 * fail closed BEFORE any metric is computed; garbage inputs previously
 * produced fabricated negative useful-candidate counts.
 */
export function validateMemberYieldModel(model: MemberYieldModel): void {
  const integerFields: readonly (readonly [string, unknown])[] = [
    ["saturationCap", model.saturationCap],
    ["halfSaturationUnits", model.halfSaturationUnits],
    ["duplicateWastePermille", model.duplicateWastePermille],
  ];
  for (const [field, value] of integerFields) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value < 0
    ) {
      throw new Error(`PORTFOLIO_SIM_MODEL_INVALID:${field}`);
    }
  }
  if (model.duplicateWastePermille > 1000) {
    throw new Error("PORTFOLIO_SIM_MODEL_INVALID:duplicateWastePermille");
  }
  if (typeof model.yieldsNothing !== "boolean") {
    throw new Error("PORTFOLIO_SIM_MODEL_INVALID:yieldsNothing");
  }
}

/** Useful-candidate curve: bounded concave with duplicate waste. */
function simulateUsefulCandidates(
  model: MemberYieldModel,
  units: number,
): number {
  if (model.yieldsNothing || units <= 0) return 0;
  const effectiveUnits = Math.max(
    0,
    Math.floor(
      (units *
        (1000 - Math.min(1000, Math.max(0, model.duplicateWastePermille)))) /
        1000,
    ),
  );
  if (effectiveUnits === 0) return 0;
  // Concave saturating curve: cap * k / (k + halfSaturation), floored.
  return Math.min(
    model.saturationCap,
    Math.floor(
      (model.saturationCap * effectiveUnits) /
        (effectiveUnits + Math.max(1, model.halfSaturationUnits)),
    ),
  );
}

function starvedCount(
  portfolio: CampaignPortfolio,
  allocation: {
    readonly selected: readonly { readonly memberId: string }[];
    readonly zeroBudget: readonly { readonly memberId: string }[];
  },
  starvationThresholdBuckets: number,
): number {
  const funded = new Set(allocation.selected.map((entry) => entry.memberId));
  return portfolio.members.filter(
    (member) =>
      !funded.has(member.memberId) &&
      member.input.currentness === "CURRENT" &&
      !member.input.phaseFrozen &&
      member.input.ownerBlockedOperations.length === 0 &&
      member.input.starvationAgeBuckets >= starvationThresholdBuckets,
  ).length;
}

/**
 * Baseline side: EQUAL_SPLIT_IGNORE_EVIDENCE across all non-phase-frozen
 * members (blocked-by-evidence and owner-blocked members still receive
 * budget — deliberately, to expose the waste the optimizer removes).
 */
function simulateBaselineSide(input: {
  readonly portfolio: CampaignPortfolio;
  readonly yieldModels: Readonly<Record<string, MemberYieldModel>>;
  readonly totalUnits: number;
  readonly starvationThresholdBuckets: number;
}): SimulationSideMetrics {
  const candidates = input.portfolio.members
    .filter((member) => !member.input.phaseFrozen)
    .sort((left, right) => left.memberId.localeCompare(right.memberId));
  const share =
    candidates.length > 0
      ? Math.floor(input.totalUnits / candidates.length)
      : 0;
  let remainder =
    candidates.length > 0
      ? input.totalUnits - share * candidates.length
      : input.totalUnits;

  let useful = 0;
  let wasted = 0;
  let funded = 0;
  const fundedIds = new Set<string>();
  for (const member of candidates) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    const units = share + extra;
    if (units <= 0) continue;
    funded += 1;
    fundedIds.add(member.memberId);
    const model = requireModel(input.yieldModels, member.memberId);
    const blocked =
      member.input.ownerBlockedOperations.length > 0 ||
      member.input.currentness !== "CURRENT";
    const produced = simulateUsefulCandidates(model, units);
    useful += produced;
    if (blocked || model.yieldsNothing || produced === 0) wasted += units;
  }

  // Baseline starvation failures: eligible starved members left unfunded.
  // Phase 16H DEF-01: the predicate MUST match the optimized side's policy
  // threshold (the previous `>= 0` vacuously counted every unfunded eligible
  // member, making the cross-side metric incoherent).
  const starvedEligibleMembers = input.portfolio.members.filter(
    (member) =>
      !fundedIds.has(member.memberId) &&
      member.input.currentness === "CURRENT" &&
      !member.input.phaseFrozen &&
      member.input.ownerBlockedOperations.length === 0 &&
      member.input.starvationAgeBuckets >= input.starvationThresholdBuckets,
  ).length;

  return {
    strategy: "EQUAL_SPLIT_IGNORE_EVIDENCE",
    totalUnitsSpent: input.totalUnits - Math.max(0, remainder),
    usefulCandidates: useful,
    wastedUnitsOnNonYielding: wasted,
    fundedMemberCount: funded,
    starvedEligibleMembers,
  };
}

/** Optimized side: aggregate the portfolio allocation under the same model. */
function simulateOptimizedSide(input: {
  readonly portfolio: CampaignPortfolio;
  readonly yieldModels: Readonly<Record<string, MemberYieldModel>>;
  readonly allocation: PortfolioAllocation;
  readonly starvationThresholdBuckets: number;
}): SimulationSideMetrics {
  let useful = 0;
  let wasted = 0;
  for (const entry of input.allocation.selected) {
    const model = requireModel(input.yieldModels, entry.memberId);
    const produced = simulateUsefulCandidates(model, entry.allocatedUnits);
    useful += produced;
    if (produced === 0) wasted += entry.allocatedUnits;
  }
  return {
    strategy: "PORTFOLIO_PRIORITY_ALLOCATION",
    totalUnitsSpent: input.allocation.allocatedUnits,
    usefulCandidates: useful,
    wastedUnitsOnNonYielding: wasted,
    fundedMemberCount: input.allocation.selected.length,
    starvedEligibleMembers: starvedCount(
      input.portfolio,
      input.allocation,
      input.starvationThresholdBuckets,
    ),
  };
}

/**
 * Run the baseline-vs-optimized shadow backtest.
 *
 * `yieldModels` maps memberId -> fixture-derived model parameters. Models
 * must cover every portfolio member (fail closed otherwise).
 */
export function runShadowSimulation(input: {
  readonly portfolio: CampaignPortfolio;
  readonly optimizedAllocation: PortfolioAllocation;
  readonly yieldModels: Readonly<Record<string, MemberYieldModel>>;
  readonly starvationThresholdBuckets: number;
}): ShadowSimulationResult {
  const { portfolio, optimizedAllocation } = input;

  // Fail closed: every member needs a present AND well-shaped model.
  for (const member of portfolio.members) {
    if (!input.yieldModels[member.memberId])
      throw new Error("PORTFOLIO_SIM_MODEL_MISSING");
    validateMemberYieldModel(input.yieldModels[member.memberId]!);
  }

  const baselineMetrics = simulateBaselineSide({
    portfolio,
    yieldModels: input.yieldModels,
    totalUnits: optimizedAllocation.policy.totalUnits,
    starvationThresholdBuckets: input.starvationThresholdBuckets,
  });
  const optimizedMetrics = simulateOptimizedSide({
    portfolio,
    yieldModels: input.yieldModels,
    allocation: optimizedAllocation,
    starvationThresholdBuckets: input.starvationThresholdBuckets,
  });

  const core = {
    simulatorVersion: PORTFOLIO_SIMULATOR_VERSION,
    interpretation: SIMULATION_INTERPRETATION,
    allocationVersion: PORTFOLIO_ALLOCATION_VERSION,
    portfolioDigest: portfolio.portfolioDigest,
    baseline: baselineMetrics,
    optimized: optimizedMetrics,
    usefulCandidateDelta:
      optimizedMetrics.usefulCandidates - baselineMetrics.usefulCandidates,
    realWorldBugYieldClaim: false as const,
  };

  return {
    ...core,
    digest: `psim:sha256:${portfolioDigestOf(core).slice("sha256:".length)}`,
  };
}

/** Convenience: build a bounded yield model from member fixture facts. */
export function yieldModelFromFacts(input: {
  readonly memberId: string;
  readonly kind: PortfolioMemberKind;
  readonly distinctClusterCount: number;
  readonly duplicatePressure: number;
  readonly replayable: boolean;
}): MemberYieldModel {
  return {
    memberId: input.memberId,
    saturationCap: Math.min(6, Math.max(1, input.distinctClusterCount)),
    halfSaturationUnits: input.replayable ? 2 : 4,
    duplicateWastePermille: Math.min(
      900,
      Math.max(0, input.duplicatePressure) * 300,
    ),
    yieldsNothing: false,
  };
}
