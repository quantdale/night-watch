// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — deterministic explainable priority score
// (WORKSTREAM W2).
//
// A bounded, fully explainable, purely mechanical priority score over
// portfolio members. Categorical/mechanical inputs only; NO model/AI score.
//
// Hard invariants (ACCEPTANCE MATRIX B):
//   - safety/owner-policy blockers are HARD GATES evaluated before any
//     positive factor can contribute (never merely negative weights);
//   - stale/unavailable/unevaluated currentness cannot improve rank and
//     cannot certify readiness (fail closed);
//   - duplicate pressure monotonically SUPPRESSES the duplicate-sensitive
//     component; it can never increase novelty;
//   - SHA-only source movement with unchanged normalized evidence produces
//     ZERO movement relevance (no false semantic novelty);
//   - changed contract/derivation are the strongest relevance signals and
//     feed change-aware replanning (W6);
//   - identical normalized inputs produce byte-identical scores/digests.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import type { DepthClass } from "../../oracles/expectations/coverageInventory";
import {
  type PortfolioMember,
  type PortfolioMemberInput,
  portfolioDigestOf,
} from "./types";

/** Score identity version; a change makes scores from different versions incomparable. */
export const PORTFOLIO_PRIORITY_SCORE_VERSION =
  "nightwatch.portfolio-priority.v1" as const;

/** Why a member is excluded from ranking/budget. Single deterministic reason. */
export const PORTFOLIO_BLOCK_REASONS = [
  "PHASE_FROZEN",
  "OWNER_POLICY_BLOCKED",
  "SOURCE_UNAVAILABLE",
  "CURRENTNESS_STALE",
  "EVIDENCE_NOT_EVALUATED",
  "EVIDENCE_MISSING",
] as const;
export type PortfolioBlockReason = (typeof PORTFOLIO_BLOCK_REASONS)[number];

export type PortfolioEligibility =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reasonCode: PortfolioBlockReason };

/**
 * Mechanical source-movement classification between the member's current
 * provenance fields and its previously observed ones. This is the ONLY path
 * through which source movement can influence rank.
 */
export const PORTFOLIO_MOVEMENT_CLASSES = [
  "NO_MOVEMENT",
  "SHA_ONLY_NO_EVIDENCE_CHANGE",
  "EVIDENCE_LOST",
  "EVIDENCE_CHANGED",
  "DERIVATION_CHANGED",
  "CONTRACT_CHANGED",
] as const;
export type PortfolioMovementClass =
  (typeof PORTFOLIO_MOVEMENT_CLASSES)[number];

/** Previously observed provenance fields for one member (all nullable). */
export interface PortfolioPreviousProvenance {
  readonly sourceSha: string | null;
  readonly evidenceDigest: string | null;
  readonly derivationVersion: string | null;
  readonly contractVersion: string | null;
}

/**
 * Classify movement with strict precedence:
 * CONTRACT_CHANGED > DERIVATION_CHANGED > EVIDENCE_CHANGED >
 * SHA_ONLY_NO_EVIDENCE_CHANGE > NO_MOVEMENT (evidence loss reported when
 * only the digest disappeared).
 *
 * The core anti-false-novelty rule lives here: a moved source SHA whose
 * normalized evidence digest, derivation version, and contract version are
 * all unchanged classifies as SHA_ONLY_NO_EVIDENCE_CHANGE and contributes
 * zero movement relevance.
 */
export function classifyPortfolioSourceMovement(
  current: Pick<
    PortfolioMemberInput,
    "sourceSha" | "evidenceDigest" | "derivationVersion" | "contractVersion"
  >,
  previous: PortfolioPreviousProvenance,
): PortfolioMovementClass {
  const same = (left: string | null, right: string | null): boolean =>
    left === right;
  if (!same(current.sourceSha, previous.sourceSha)) {
    if (!same(current.contractVersion, previous.contractVersion))
      return "CONTRACT_CHANGED";
    if (!same(current.derivationVersion, previous.derivationVersion))
      return "DERIVATION_CHANGED";
    if (!same(current.evidenceDigest, previous.evidenceDigest)) {
      return current.evidenceDigest === null
        ? "EVIDENCE_LOST"
        : "EVIDENCE_CHANGED";
    }
    return "SHA_ONLY_NO_EVIDENCE_CHANGE";
  }
  // Same SHA: contract/derivation/evidence drift is still meaningful.
  if (!same(current.contractVersion, previous.contractVersion))
    return "CONTRACT_CHANGED";
  if (!same(current.derivationVersion, previous.derivationVersion))
    return "DERIVATION_CHANGED";
  if (!same(current.evidenceDigest, previous.evidenceDigest)) {
    return current.evidenceDigest === null
      ? "EVIDENCE_LOST"
      : "EVIDENCE_CHANGED";
  }
  return "NO_MOVEMENT";
}

/** Eligibility gate. Evaluated BEFORE scoring; blockers dominate everything. */
export function portfolioEligibility(
  member: PortfolioMember,
): PortfolioEligibility {
  const input = member.input;
  if (input.phaseFrozen) return { eligible: false, reasonCode: "PHASE_FROZEN" };
  if (input.ownerBlockedOperations.length > 0)
    return { eligible: false, reasonCode: "OWNER_POLICY_BLOCKED" };
  if (input.currentness === "SOURCE_UNAVAILABLE")
    return { eligible: false, reasonCode: "SOURCE_UNAVAILABLE" };
  if (input.currentness === "STALE")
    return { eligible: false, reasonCode: "CURRENTNESS_STALE" };
  if (input.currentness === "NOT_EVALUATED")
    return { eligible: false, reasonCode: "EVIDENCE_NOT_EVALUATED" };
  // Authority-critical evidence must be present whenever any semantic depth
  // is claimed; depthless members may be planned without derivation evidence.
  if (
    input.depthClass !== "NONE" &&
    (input.evidenceDigest === null ||
      input.derivationVersion === null ||
      input.contractVersion === null)
  ) {
    return { eligible: false, reasonCode: "EVIDENCE_MISSING" };
  }
  return { eligible: true };
}

// ---------------------------------------------------------------------------
// Score components.
// ---------------------------------------------------------------------------

export interface PriorityScoreComponent {
  /** Stable component name (part of the digest identity). */
  readonly name: string;
  /** Signed contribution to the total (weight already applied). */
  readonly contribution: number;
  /** Categorical derivation note (safe tokens only). */
  readonly basis: string;
}

export interface PriorityScore {
  readonly scoreVersion: typeof PORTFOLIO_PRIORITY_SCORE_VERSION;
  readonly memberId: string;
  /** Total bounded score (can be negative; ranking clamps at member level). */
  readonly total: number;
  readonly components: readonly PriorityScoreComponent[];
  /** Deterministic digest `sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
  readonly movementClass: PortfolioMovementClass;
}

const MOVEMENT_VALUE: Readonly<Record<PortfolioMovementClass, number>> =
  Object.freeze({
    NO_MOVEMENT: 0,
    SHA_ONLY_NO_EVIDENCE_CHANGE: 0,
    EVIDENCE_LOST: 0,
    EVIDENCE_CHANGED: 2,
    DERIVATION_CHANGED: 3,
    CONTRACT_CHANGED: 4,
  });

const DEPTH_VALUE: Readonly<Record<DepthClass, number>> = Object.freeze({
  NONE: 0,
  SHAPE: 1,
  COLLECTION: 1,
  SHAPE_COLLECTION: 2,
  TYPE: 2,
  TYPE_COLLECTION: 3,
});

// Coverage gap is derived mechanically from semantic depth: shallower or
// missing contracts leave more under-covered surface.
const COVERAGE_GAP_VALUE: Readonly<Record<DepthClass, number>> = Object.freeze({
  NONE: 3,
  SHAPE: 2,
  COLLECTION: 1,
  SHAPE_COLLECTION: 1,
  TYPE: 1,
  TYPE_COLLECTION: 0,
});

function priorYieldValue(distinctClusterCount: number): number {
  if (distinctClusterCount <= 0) return 0;
  if (distinctClusterCount <= 2) return 1;
  if (distinctClusterCount <= 5) return 2;
  return 3;
}

function starvationValue(buckets: number): number {
  return Math.min(4, Math.floor(buckets / 2));
}

/** Monotone duplicate-pressure suppression table (pressure 0..4+ -> penalty). */
export function duplicatePenalty(duplicatePressure: number): number {
  if (duplicatePressure <= 0) return 0;
  if (duplicatePressure === 1) return 6;
  if (duplicatePressure === 2) return 11;
  if (duplicatePressure === 3) return 15;
  return 18;
}

function invalidHistoryPenalty(input: PortfolioMemberInput): number {
  if (input.historicalYield.admittedCount <= 0) return 0;
  const invalidRatePermille = Math.floor(
    (input.historicalYield.invalidOrTransient * 1000) /
      input.historicalYield.admittedCount,
  );
  if (invalidRatePermille >= 500) return 8;
  if (invalidRatePermille >= 200) return 4;
  return 0;
}

function executionCostPenalty(
  costClass: PortfolioMemberInput["executionCostClass"],
): number {
  if (costClass === "HIGH") return 8;
  if (costClass === "MEDIUM") return 4;
  return 0;
}

/**
 * Compute the full explainable score for one member. `previous` supplies the
 * previously observed provenance used by the movement classifier; pass null
 * to evaluate without movement history (movement component then reflects the
 * member's own evidence presence only through NO_MOVEMENT semantics).
 */
export function scorePortfolioMember(
  member: PortfolioMember,
  previous: PortfolioPreviousProvenance | null,
): PriorityScore {
  const input = member.input;
  const movementClass =
    previous === null
      ? "NO_MOVEMENT"
      : classifyPortfolioSourceMovement(input, previous);

  const movementContribution = MOVEMENT_VALUE[movementClass] * 5; // max 20
  const depthContribution = DEPTH_VALUE[input.depthClass] * 5; // max 15
  const gapContribution = COVERAGE_GAP_VALUE[input.depthClass] * 4; // max 12
  const yieldContribution =
    priorYieldValue(input.historicalYield.distinctClusterCount) * 4; // max 12
  const replayContribution = input.replayable ? 6 : 0;
  const starvationContribution =
    starvationValue(input.starvationAgeBuckets) * 2.5; // max 10
  const duplicate = duplicatePenalty(member.duplicatePressure);
  const invalidHistory = invalidHistoryPenalty(input);
  const cost = executionCostPenalty(input.executionCostClass);

  const components: PriorityScoreComponent[] = [
    {
      name: "SOURCE_MOVEMENT_RELEVANCE",
      contribution: movementContribution,
      basis: movementClass,
    },
    {
      name: "SEMANTIC_CONTRACT_DEPTH",
      contribution: depthContribution,
      basis: input.depthClass,
    },
    {
      name: "COVERAGE_GAP",
      contribution: gapContribution,
      basis: input.depthClass,
    },
    {
      name: "PRIOR_DISTINCT_YIELD",
      contribution: yieldContribution,
      basis: `clusters:${input.historicalYield.distinctClusterCount}`,
    },
    {
      name: "REPLAYABILITY",
      contribution: replayContribution,
      basis: input.replayable ? "REPLAYABLE" : "NOT_REPLAYABLE",
    },
    {
      name: "STARVATION_AGE",
      contribution: starvationContribution,
      basis: `buckets:${input.starvationAgeBuckets}`,
    },
    {
      name: "DUPLICATE_PRESSURE_SUPPRESSION",
      contribution: -duplicate,
      basis: `pressure:${member.duplicatePressure}`,
    },
    {
      name: "INVALID_TRANSIENT_HISTORY",
      contribution: -invalidHistory,
      basis: `invalid:${input.historicalYield.invalidOrTransient}`,
    },
    {
      name: "EXECUTION_COST",
      contribution: -cost,
      basis: input.executionCostClass,
    },
  ];

  // Fractional starvation contributions are avoided in the digest identity by
  // scaling once here; totals remain exact integers.
  const total = Math.round(
    components.reduce((sum, component) => sum + component.contribution, 0),
  );

  return {
    scoreVersion: PORTFOLIO_PRIORITY_SCORE_VERSION,
    memberId: member.memberId,
    total,
    components,
    digest: portfolioDigestOf({
      scoreVersion: PORTFOLIO_PRIORITY_SCORE_VERSION,
      memberId: member.memberId,
      total,
      components,
    }),
    movementClass,
  };
}
