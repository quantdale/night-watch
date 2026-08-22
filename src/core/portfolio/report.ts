// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — local operator tooling surfaces (WORKSTREAM W8).
//
// Read-only reporting APIs backing the portfolio CLI: portfolio inspect,
// score explanation, plan rendering, plan comparison, simulation reports,
// and the SEPARATELY OWNER-GATED DEV campaign handoff package.
//
// Hard rules:
//   - every renderer is deterministic (sorted keys via canonical JSON);
//   - outputs are private-safe (categorical codes only; inputs were already
//     sentinel-rejected at construction);
//   - the DEV handoff package carries NO execution authority: it embeds the
//     fixed requirement for a separate owner authorization token and an
//     executable:false marker; this phase NEVER executes it.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence.
// ---------------------------------------------------------------------------

import type { CampaignPlanManifest, CampaignPlanMember } from "./manifest";
import { parseCampaignPlanManifestDocument } from "./manifest";
import { PORTFOLIO_PRIORITY_SCORE_VERSION } from "./scoring";
import {
  SIMULATION_INTERPRETATION,
  type ShadowSimulationResult,
} from "./simulator";
import { type PriorityScore, duplicatePenalty } from "./scoring";
import {
  type PortfolioAllocation,
  verifyAllocationInvariants,
} from "./allocation";
import {
  type CampaignPortfolio,
  PORTFOLIO_SCHEMA_VERSION,
  portfolioDigestOf,
} from "./types";

/** Handoff package identity version. */
export const DEV_HANDOFF_VERSION =
  "nightwatch.dev-campaign-handoff.v1" as const;

/**
 * The exact separate authorization class a future runtime session must hold
 * to execute this handoff. This phase never grants it.
 */
export const DEV_HANDOFF_REQUIRED_AUTHORIZATION =
  "PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED" as const;

// ---------------------------------------------------------------------------
// Deterministic JSON rendering (canonical serialization).
// ---------------------------------------------------------------------------

/** Canonical sorted-key JSON serialization (deterministic across runs). */
export function renderDocumentJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number") {
    return Number.isFinite(value) || typeof value !== "number"
      ? JSON.stringify(value)
      : "null";
  }
  if (Array.isArray(value))
    return `[${value.map(renderDocumentJson).join(",")}]`;
  if (typeof value !== "object") return JSON.stringify(String(value));
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, child]) => `${JSON.stringify(key)}:${renderDocumentJson(child)}`,
    )
    .join(",")}}`;
}

// ---------------------------------------------------------------------------
// Inspect.
// ---------------------------------------------------------------------------

export interface PortfolioInspectRow {
  readonly memberId: string;
  readonly targetId: string;
  readonly kind: string;
  readonly semanticScope: string;
  readonly currentness: string;
  readonly depthClass: string;
  readonly duplicatePressure: number;
  readonly starvationAgeBuckets: number;
  readonly costClass: string;
  readonly replayable: boolean;
  readonly phaseFrozen: boolean;
  readonly ownerBlockedOperations: readonly string[];
}

/** One sorted row per member (inspect view). */
export function portfolioInspectRows(
  portfolio: CampaignPortfolio,
): readonly PortfolioInspectRow[] {
  return portfolio.members.map((member) => ({
    memberId: member.memberId,
    targetId: member.input.targetId,
    kind: member.input.kind,
    semanticScope: member.input.semanticScope,
    currentness: member.input.currentness,
    depthClass: member.input.depthClass,
    duplicatePressure: member.duplicatePressure,
    starvationAgeBuckets: member.input.starvationAgeBuckets,
    costClass: member.input.executionCostClass,
    replayable: member.input.replayable,
    phaseFrozen: member.input.phaseFrozen,
    ownerBlockedOperations: [...member.input.ownerBlockedOperations],
  }));
}

export function renderPortfolioInspect(portfolio: CampaignPortfolio): string {
  return [
    `portfolio ${portfolio.portfolioDigest} schema=${PORTFOLIO_SCHEMA_VERSION}`,
    `approvedTargets=${portfolio.approvedTargets.length} members=${portfolio.members.length}`,
    ...portfolioInspectRows(portfolio).map(
      (row) =>
        `- ${row.memberId} target=${row.targetId} kind=${row.kind} scope=${row.semanticScope} currentness=${row.currentness} depth=${row.depthClass} dup=${row.duplicatePressure} starve=${row.starvationAgeBuckets} cost=${row.costClass} replay=${row.replayable ? "Y" : "N"} frozen=${row.phaseFrozen ? "Y" : "N"} blockers=${row.ownerBlockedOperations.join("|") || "-"}`,
    ),
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Explain-score.
// ---------------------------------------------------------------------------

export function explainScoreLines(
  score: PriorityScore,
  duplicatePressure: number,
): readonly string[] {
  return [
    `score ${score.memberId} total=${score.total} version=${PORTFOLIO_PRIORITY_SCORE_VERSION} movement=${score.movementClass}`,
    ...score.components.map(
      (component) =>
        `- ${component.name} contribution=${component.contribution} basis=${component.basis}`,
    ),
    `- DUPLICATE_PRESSURE penalty=${duplicatePenalty(duplicatePressure)} pressure=${duplicatePressure}`,
    `digest=${score.digest}`,
  ];
}

// ---------------------------------------------------------------------------
// Plan rendering + comparison.
// ---------------------------------------------------------------------------

function planLine(member: CampaignPlanMember): string {
  return `- #${member.order} ${member.memberId} target=${member.targetId} units=${member.allocatedUnits} retries<=${member.maxRetries} replay=${member.replayPolicy} reasons=${member.reasons.join("|")}`;
}

export function renderPlan(manifest: CampaignPlanManifest): string {
  return [
    `plan ${manifest.planId} digest=${manifest.manifestDigest}`,
    `allocated=${manifest.totalAllocatedUnits} unallocated=${manifest.unallocatedUnits} selected=${manifest.selectedMembers.length} unselected=${manifest.unselectedMembers.length}`,
    `ownerScope=${manifest.ownerScopeRequirements.status} runtimeAuthority=${manifest.ownerScopeRequirements.planningPhaseExecutionAuthority}`,
    ...manifest.selectedMembers.map(planLine),
    ...manifest.unselectedMembers.map(
      (entry) => `- UNSELECTED ${entry.memberId} reason=${entry.reasonCode}`,
    ),
    "",
  ].join("\n");
}

export interface PlanComparisonFinding {
  readonly kind:
    | "ADDED"
    | "REMOVED"
    | "BUDGET_CHANGED"
    | "ORDER_CHANGED"
    | "UNCHANGED_MEMBER";
  readonly memberId: string;
  readonly detail: string;
}

/**
 * Deterministic previous-vs-current plan comparison (no mutation).
 *
 * Phase 16H DEF-03: both inputs are strictly parsed first — foreign,
 * malformed, version-drifted, or digest-tampered documents fail closed
 * instead of producing fabricated diffs.
 */
export function comparePlanManifests(
  previous: CampaignPlanManifest | unknown,
  current: CampaignPlanManifest | unknown,
): {
  readonly identical: boolean;
  readonly findings: readonly PlanComparisonFinding[];
} {
  const validatedPrevious = parseCampaignPlanManifestDocument(previous);
  const validatedCurrent = parseCampaignPlanManifestDocument(current);
  const findings: PlanComparisonFinding[] = [];
  const previousById = new Map(
    validatedPrevious.selectedMembers.map((entry) => [entry.memberId, entry]),
  );
  const currentById = new Map(
    validatedCurrent.selectedMembers.map((entry) => [entry.memberId, entry]),
  );

  for (const entry of validatedCurrent.selectedMembers) {
    const prior = previousById.get(entry.memberId);
    if (!prior) {
      findings.push({
        kind: "ADDED",
        memberId: entry.memberId,
        detail: "newly selected",
      });
      continue;
    }
    if (prior.allocatedUnits !== entry.allocatedUnits) {
      findings.push({
        kind: "BUDGET_CHANGED",
        memberId: entry.memberId,
        detail: `${prior.allocatedUnits}->${entry.allocatedUnits}`,
      });
    } else if (prior.order === entry.order) {
      findings.push({
        kind: "UNCHANGED_MEMBER",
        memberId: entry.memberId,
        detail: "same budget+order",
      });
    } else {
      findings.push({
        kind: "ORDER_CHANGED",
        memberId: entry.memberId,
        detail: `${prior.order}->${entry.order}`,
      });
    }
  }
  for (const entry of validatedPrevious.selectedMembers) {
    if (!currentById.has(entry.memberId)) {
      findings.push({
        kind: "REMOVED",
        memberId: entry.memberId,
        detail: "no longer selected",
      });
    }
  }

  const material = findings.filter(
    (finding) => finding.kind !== "UNCHANGED_MEMBER",
  );
  material.sort((left, right) =>
    left.kind === right.kind
      ? left.memberId.localeCompare(right.memberId)
      : left.kind.localeCompare(right.kind),
  );
  return {
    identical:
      material.length === 0 &&
      validatedPrevious.manifestDigest === validatedCurrent.manifestDigest,
    findings: material,
  };
}

// ---------------------------------------------------------------------------
// Simulation rendering.
// ---------------------------------------------------------------------------

export function renderSimulation(result: ShadowSimulationResult): string {
  return [
    `shadow-simulation digest=${result.digest}`,
    `interpretation=${result.interpretation}`,
    `baseline strategy=${result.baseline.strategy} useful=${result.baseline.usefulCandidates} wasted=${result.baseline.wastedUnitsOnNonYielding} starvedEligible=${result.baseline.starvedEligibleMembers}`,
    `optimized strategy=${result.optimized.strategy} useful=${result.optimized.usefulCandidates} wasted=${result.optimized.wastedUnitsOnNonYielding} starvedEligible=${result.optimized.starvedEligibleMembers}`,
    `usefulCandidateDelta=${result.usefulCandidateDelta} realWorldBugYieldClaim=${result.realWorldBugYieldClaim}`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Allocation invariant surface (quality floors).
// ---------------------------------------------------------------------------

export function allocationQualityFloors(
  allocation: PortfolioAllocation,
  portfolio: CampaignPortfolio,
): {
  readonly authorityEscapeCount: number;
  readonly stalePositiveRankCount: number;
  readonly budgetOverflowCount: number;
  readonly blockedWithBudgetCount: number;
} {
  // Authority escape: any selected member whose target left the approved set.
  const approved = new Set(portfolio.approvedTargets);
  const authorityEscapeCount = allocation.selected.filter(
    (entry) => !approved.has(entry.targetId),
  ).length;

  // Stale-positive-rank: any selected member not CURRENT would have been
  // gated before ranking; recompute defensively from zero-budget reasons.
  const staleReasons = new Set([
    "CURRENTNESS_STALE",
    "SOURCE_UNAVAILABLE",
    "EVIDENCE_NOT_EVALUATED",
    "EVIDENCE_MISSING",
  ]);
  const stalePositiveRankCount = allocation.zeroBudget
    .filter((entry) => staleReasons.has(entry.reasonCode))
    .filter((entry) =>
      allocation.selected.some(
        (selected) => selected.memberId === entry.memberId,
      ),
    ).length;

  const verified = verifyAllocationInvariants(allocation, portfolio);
  return {
    authorityEscapeCount,
    stalePositiveRankCount,
    budgetOverflowCount: verified.budgetOverflowCount,
    blockedWithBudgetCount: verified.blockedWithBudgetCount,
  };
}

// ---------------------------------------------------------------------------
// Separately gated DEV handoff package (NEVER executed here).
// ---------------------------------------------------------------------------

export interface DevHandoffPackage {
  readonly handoffVersion: typeof DEV_HANDOFF_VERSION;
  /** Fixed marker: this package alone authorizes nothing. */
  readonly executable: false;
  readonly requiredAuthorizationToken: typeof DEV_HANDOFF_REQUIRED_AUTHORIZATION;
  readonly environmentRestriction: "DEV_ONLY_NEVER_PRODUCTION";
  /** The prepared plan identity (digest only — no runtime artifacts). */
  readonly planId: string;
  readonly planManifestDigest: string;
  readonly portfolioDigest: string;
  readonly selectedMemberIds: readonly string[];
  readonly totalAllocatedUnits: number;
  /** Runtime obligations the separately authorized session must satisfy. */
  readonly runtimeObligations: readonly [
    "OWNER_POLICY_GATE_REQUIRED",
    "CONTAINMENT_STACK_REQUIRED",
    "CHECKPOINT_RESUME_REQUIRED",
    "NO_PRODUCTION_CONTACT",
    "FINDINGS_OWNER_LOCAL_ONLY",
  ];
  /** `handoff:sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
}

/** Build the owner-gated handoff package for one prepared plan. */
export function buildDevHandoffPackage(
  manifest: CampaignPlanManifest,
  portfolioDigest: string,
): DevHandoffPackage {
  const core = {
    handoffVersion: DEV_HANDOFF_VERSION,
    executable: false as const,
    requiredAuthorizationToken: DEV_HANDOFF_REQUIRED_AUTHORIZATION,
    environmentRestriction: "DEV_ONLY_NEVER_PRODUCTION" as const,
    planId: manifest.planId,
    planManifestDigest: manifest.manifestDigest,
    portfolioDigest,
    selectedMemberIds: manifest.selectedMembers.map((entry) => entry.memberId),
    totalAllocatedUnits: manifest.totalAllocatedUnits,
    runtimeObligations: [
      "OWNER_POLICY_GATE_REQUIRED",
      "CONTAINMENT_STACK_REQUIRED",
      "CHECKPOINT_RESUME_REQUIRED",
      "NO_PRODUCTION_CONTACT",
      "FINDINGS_OWNER_LOCAL_ONLY",
    ] as const,
  };
  return {
    ...core,
    digest: `handoff:sha256:${portfolioDigestOf(core).slice("sha256:".length)}`,
  };
}
