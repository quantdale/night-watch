// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — change-aware plan replanning (WORKSTREAM W6).
//
// Deterministically classifies whether a previously built campaign-plan
// manifest is still reusable, needs reprioritization, or is invalidated,
// using EXISTING hardened evidence surfaces:
//
//   - project snapshot classified diffs (projectSnapshot/compare.ts) for
//     authority/contract-level drift;
//   - portfolio source-movement classifications (scoring.ts) per member;
//   - current currentness per approved target (readiness vocabulary).
//
// Hard invariants (ACCEPTANCE MATRIX E):
//   - changed contract/derivation/authority triggers correct
//     replan-or-invalidation;
//   - authority change has the highest precedence and always invalidates;
//   - SHA-only movement with unchanged normalized evidence NEVER forces a
//     replan (no false novelty);
//   - degraded currentness on selected members forces at least a
//     reprioritization that excludes them;
//   - identical normalized inputs produce byte-identical verdicts.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import type { ProjectSnapshotDiff } from "../projectSnapshot/types";
import type { PortfolioMovementClass } from "./scoring";
import {
  CAMPAIGN_PLAN_MANIFEST_VERSION,
  type CampaignPlanManifest,
} from "./manifest";
import { portfolioDigestOf } from "./types";

export { CAMPAIGN_PLAN_MANIFEST_VERSION };

/** Replan identity version. */
export const PORTFOLIO_REPLAN_VERSION =
  "nightwatch.portfolio-replan.v1" as const;

export const REPLAN_VERDICTS = [
  "PLAN_REUSABLE",
  "REPRIORITIZE",
  "INVALIDATED",
] as const;
export type ReplanVerdict = (typeof REPLAN_VERDICTS)[number];

/** Degraded currentness values that force exclusion of an affected member. */
const DEGRADED_CURRENTNESS: ReadonlySet<string> = new Set([
  "STALE",
  "SOURCE_UNAVAILABLE",
  "NOT_EVALUATED",
]);

/** Movement classes that force invalidation of an affected SELECTED member. */
const INVALIDATING_MOVEMENTS: ReadonlySet<PortfolioMovementClass> = new Set([
  "CONTRACT_CHANGED",
  "DERIVATION_CHANGED",
]);

/** Movement classes that justify reprioritization (evidence actually moved). */
const REPRIO_MOVEMENTS: ReadonlySet<PortfolioMovementClass> = new Set([
  "EVIDENCE_CHANGED",
]);

/** One deterministic replan decision over a prior manifest. */
export interface ReplanDecision {
  readonly replanVersion: typeof PORTFOLIO_REPLAN_VERSION;
  readonly verdict: ReplanVerdict;
  /** Categorical reason codes in deterministic order (sorted, unique). */
  readonly reasons: readonly string[];
  /** Selected memberIds directly affected by the decision (sorted). */
  readonly affectedSelectedMemberIds: readonly string[];
  /**
   * True when the prior manifest must NOT be executed again and a fresh
   * plan must be built from fresh evidence.
   */
  readonly rebuildRequired: boolean;
  /** `preplan:sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
}

/** Snapshot classification -> (verdict fold, categorical reason). */
const SNAPSHOT_RULES: Readonly<
  Record<
    string,
    { readonly reason: string; readonly invalidate: boolean } | undefined
  >
> = Object.freeze({
  AUTHORITY_CHANGE: { reason: "SNAPSHOT_AUTHORITY_CHANGE", invalidate: true },
  INCOMPATIBLE_CHANGE: {
    reason: "SNAPSHOT_INCOMPATIBLE_CHANGE",
    invalidate: true,
  },
  SEMANTIC_CHANGE: { reason: "SNAPSHOT_SEMANTIC_CHANGE", invalidate: false },
});

/** Movement class -> (verdict fold, invalidating). */
function movementRule(
  movement: PortfolioMovementClass,
): { readonly reason: string; readonly invalidate: boolean } | null {
  if (INVALIDATING_MOVEMENTS.has(movement))
    return { reason: `MEMBER_${movement}`, invalidate: true };
  if (REPRIO_MOVEMENTS.has(movement))
    return { reason: `MEMBER_${movement}`, invalidate: false };
  return null;
}

/**
 * Classify the prior plan against current evidence.
 *
 * `snapshotDiff` is a caller-computed ProjectSnapshotDiff (pure compare of
 * two manifests); `memberMovements` maps memberId -> movement class computed
 * by classifyPortfolioSourceMovement; `currentnessByTarget` maps targetId ->
 * the target's CURRENT currentness category.
 */
export function classifyPlanReplan(input: {
  readonly previousManifest: CampaignPlanManifest;
  readonly snapshotDiff: ProjectSnapshotDiff;
  readonly memberMovements: Readonly<Record<string, PortfolioMovementClass>>;
  readonly currentnessByTarget: Readonly<Record<string, string>>;
}): ReplanDecision {
  const { previousManifest, snapshotDiff } = input;

  const reasons = new Set<string>();
  const affected = new Set<string>();
  let invalidated = false;
  let reprioritized = false;

  const applyRule = (rule: {
    readonly reason: string;
    readonly invalidate: boolean;
  }): void => {
    reasons.add(rule.reason);
    if (rule.invalidate) invalidated = true;
    else reprioritized = true;
  };

  // 1. Authority/structural snapshot drift dominates everything.
  const snapshotRule = SNAPSHOT_RULES[snapshotDiff.classification];
  if (snapshotRule) applyRule(snapshotRule);

  // 2. Per-selected-member evidence rules.
  for (const member of previousManifest.selectedMembers) {
    const movement = input.memberMovements[member.memberId];
    if (movement) {
      const rule = movementRule(movement);
      if (rule) {
        applyRule(rule);
        affected.add(member.memberId);
        if (rule.invalidate) continue;
      }
    }
    const currentness = input.currentnessByTarget[member.targetId];
    if (currentness && DEGRADED_CURRENTNESS.has(currentness)) {
      applyRule({
        reason: `MEMBER_CURRENTNESS_${currentness}`,
        invalidate: false,
      });
      affected.add(member.memberId);
    }
  }

  // 3. Unselected-member evidence changes still poison the plan's ranking
  // inputs: they require reprioritization but never invalidate valid selections.
  if (!invalidated && !reprioritized) {
    for (const [memberId, movement] of Object.entries(input.memberMovements)) {
      const rule = movementRule(movement);
      if (!rule || rule.invalidate) continue;
      if (
        previousManifest.selectedMembers.some(
          (entry) => entry.memberId === memberId,
        )
      )
        continue;
      applyRule(rule);
      affected.add(memberId);
    }
  }

  const verdict: ReplanVerdict = invalidated
    ? "INVALIDATED"
    : reprioritized
      ? "REPRIORITIZE"
      : "PLAN_REUSABLE";
  if (reasons.size === 0) reasons.add("NO_MATERIAL_EVIDENCE_CHANGE");

  const core = {
    replanVersion: PORTFOLIO_REPLAN_VERSION,
    verdict,
    reasons: [...reasons].sort((left, right) => left.localeCompare(right)),
    affectedSelectedMemberIds: [...affected].sort((left, right) =>
      left.localeCompare(right),
    ),
    rebuildRequired:
      verdict !== "PLAN_REUSABLE" ||
      previousManifest.manifestVersion !== CAMPAIGN_PLAN_MANIFEST_VERSION,
  };

  return {
    ...core,
    digest: `preplan:sha256:${portfolioDigestOf(core).slice("sha256:".length)}`,
  };
}
