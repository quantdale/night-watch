// C-16 — expected information gain.
//
// design §9.2 gives the formula:
//
//     EIG = novelty × contract_depth × change_recency × blast_radius
//           ÷ (cost + duplicate_risk)
//
// §56 says not to blindly encode it, and the reason becomes obvious once you
// try. A float score makes the ORDERING depend on rounding, which undermines
// the determinism requirement at exactly the point it matters; and a
// multiplicative form turns a single zero into a deletion, so any factor whose
// value is unknown must not be allowed to reach zero by accident.
//
// So this module keeps the formula's SHAPE and refuses its arithmetic:
//
//   * every factor is a small bounded integer LEVEL with named members;
//   * the score is an exact RATIONAL — numerator and denominator held as
//     integers, never divided;
//   * ordering compares a/b against c/d as a·d against c·b, in integers, so
//     there is no rounding and no float drift;
//   * `UNKNOWN` is a LEVEL sitting mid-scale, never 0 and never the maximum,
//     because a zero would silently delete a target and a maximum would
//     silently promote one, and "we do not know" is neither.
//
// A HIGH SCORE GRANTS NOTHING. Not admission, not DEV execution, not
// production, not replay, not credentials, not environment access. This module
// orders what safety has already admitted and can never widen it, which is why
// it takes no admission input and exposes no gate.
//
// Data-only: no filesystem, process or network authority.

export const EIG_VERSION = 'nightwatch.expected-information-gain.v1' as const;

/**
 * `novelty` — §9.2: never observed > observed-but-no-oracle >
 * observed-with-oracle. A surface nobody has looked at teaches the most.
 */
export const NOVELTY_LEVELS = Object.freeze({
  NEVER_OBSERVED: 4,
  OBSERVED_WITHOUT_ORACLE: 3,
  UNKNOWN: 2,
  OBSERVED_WITH_ORACLE: 1,
});
export type NoveltyLevel = keyof typeof NOVELTY_LEVELS;

/**
 * `contract_depth` — §9.2: TYPE/COLLECTION beats SHAPE beats protocol-only.
 * These map onto C-09's admitted expectation classes exactly, so the factor
 * has a real consumer rather than a placeholder.
 */
export const CONTRACT_DEPTH_LEVELS = Object.freeze({
  /** C-09 `RESPONSE_PROPERTY_TYPE`, `_CARDINALITY` or `_ENUM`. */
  TYPE_OR_COLLECTION: 4,
  /** C-09 `RESPONSE_PROPERTY_SHAPE`. */
  SHAPE: 3,
  UNKNOWN: 2,
  /** No semantic expectation; only the protocol is checkable. */
  PROTOCOL_ONLY: 1,
});
export type ContractDepthLevel = keyof typeof CONTRACT_DEPTH_LEVELS;

/**
 * `change_recency` — §9.2: from the SOURCE-SNAPSHOT DIFF. §60 forbids
 * wall-clock age from an unverifiable value, so these levels describe PROVEN
 * change evidence, never elapsed time.
 */
export const CHANGE_RECENCY_LEVELS = Object.freeze({
  /** The operation's own source changed in the current snapshot diff. */
  CHANGED_IN_CURRENT_DIFF: 4,
  /** A file it transitively depends on changed. */
  DEPENDENCY_CHANGED: 3,
  /** No change intelligence is available for this target. */
  UNKNOWN: 2,
  /** Proven unchanged across the compared snapshots. */
  PROVEN_UNCHANGED: 1,
});
export type ChangeRecencyLevel = keyof typeof CHANGE_RECENCY_LEVELS;

/** `blast_radius` — §9.2: frontend consumers plus downstream services. */
export const BLAST_RADIUS_LEVELS = Object.freeze({
  MANY_CONSUMERS: 4,
  SOME_CONSUMERS: 3,
  UNKNOWN: 2,
  NO_KNOWN_CONSUMER: 1,
});
export type BlastRadiusLevel = keyof typeof BLAST_RADIUS_LEVELS;

/**
 * `cost` — budget units, in the DENOMINATOR. §9.2's explicit non-goal is that
 * a broad shallow sweep must score worse than a deep pass over new contracts,
 * and this is the term that makes that true.
 */
export const COST_LEVELS = Object.freeze({
  LOW: 1,
  MODERATE: 2,
  UNKNOWN: 3,
  HIGH: 4,
});
export type CostLevel = keyof typeof COST_LEVELS;

/** `duplicate_risk` — prior fingerprints in the same cluster. Denominator. */
export const DUPLICATE_RISK_LEVELS = Object.freeze({
  NO_PRIOR_FINDING: 0,
  UNKNOWN: 2,
  ONE_PRIOR_CLUSTER: 3,
  MANY_PRIOR_CLUSTERS: 5,
});
export type DuplicateRiskLevel = keyof typeof DUPLICATE_RISK_LEVELS;

/**
 * Every factor's UNKNOWN member, asserted as data so a test can prove the
 * mid-scale property per factor rather than trusting the numbers above.
 */
export const UNKNOWN_LEVEL_NAMES = Object.freeze({
  novelty: 'UNKNOWN', contractDepth: 'UNKNOWN', changeRecency: 'UNKNOWN',
  blastRadius: 'UNKNOWN', cost: 'UNKNOWN', duplicateRisk: 'UNKNOWN',
});

/** Why a target sits where it does. Categorical, never prose. */
export const EIG_REASON_CODES = [
  'NOVEL_SURFACE_NEVER_OBSERVED',
  'DEEP_CONTRACT_AVAILABLE',
  'SOURCE_CHANGED_IN_CURRENT_DIFF',
  'WIDE_CONSUMER_FOOTPRINT',
  'DEMOTED_BY_PRIOR_FINDINGS',
  'DEMOTED_BY_COST',
  'DEMOTED_BY_ORACLE_ALREADY_PRESENT',
  'FACTORS_PARTLY_UNKNOWN',
] as const;
export type EigReasonCode = (typeof EIG_REASON_CODES)[number];

export interface EigFactors {
  readonly novelty: NoveltyLevel;
  readonly contractDepth: ContractDepthLevel;
  readonly changeRecency: ChangeRecencyLevel;
  readonly blastRadius: BlastRadiusLevel;
  readonly cost: CostLevel;
  readonly duplicateRisk: DuplicateRiskLevel;
}

export interface EigTarget {
  /** Stable identity; also the deterministic tie-breaker. */
  readonly targetId: string;
  readonly factors: EigFactors;
  /** Identity of the evidence the factors were derived from. */
  readonly evidenceDigest: string;
}

export interface EigScore {
  /** Exact rational. Never divided, so the ordering never rounds. */
  readonly numerator: number;
  readonly denominator: number;
}

export interface RankedTarget {
  readonly rank: number;
  readonly targetId: string;
  readonly score: EigScore;
  readonly factors: EigFactors;
  /** Resolved integer level per factor, so the score is reproducible by hand. */
  readonly factorLevels: Readonly<Record<keyof EigFactors, number>>;
  readonly reasonCodes: readonly EigReasonCode[];
  readonly evidenceDigest: string;
  /** True when any factor was UNKNOWN, so a reader can discount the position. */
  readonly partiallyUnknown: boolean;
}

export interface EigRanking {
  readonly schemaVersion: typeof EIG_VERSION;
  readonly consideredCount: number;
  readonly rankedCount: number;
  readonly limit: number;
  readonly droppedCount: number;
  readonly truncated: boolean;
  /** Null when the considered set was itself bounded out upstream. */
  readonly totalConsidered: number | null;
  readonly remainingUnknown: boolean;
  readonly ranked: readonly RankedTarget[];
  /**
   * Restated in the projection so a consumer reading only this object cannot
   * mistake an order for a permission.
   */
  readonly grantsAuthority: false;
}

export const DEFAULT_EIG_LIMIT = 256;

/** The exact rational score. No division is performed. */
export function eigScore(factors: EigFactors): EigScore {
  const numerator = NOVELTY_LEVELS[factors.novelty]
    * CONTRACT_DEPTH_LEVELS[factors.contractDepth]
    * CHANGE_RECENCY_LEVELS[factors.changeRecency]
    * BLAST_RADIUS_LEVELS[factors.blastRadius];
  // `cost` is at least 1 for every level, so the denominator is never zero even
  // when duplicate risk is NO_PRIOR_FINDING (0).
  const denominator = COST_LEVELS[factors.cost] + DUPLICATE_RISK_LEVELS[factors.duplicateRisk];
  return Object.freeze({ numerator, denominator });
}

/**
 * Compare two scores EXACTLY: a/b vs c/d as a·d vs c·b, in integers.
 * Returns a positive number when `left` ranks higher.
 */
export function compareScores(left: EigScore, right: EigScore): number {
  return left.numerator * right.denominator - right.numerator * left.denominator;
}

function reasonCodesFor(factors: EigFactors): readonly EigReasonCode[] {
  const codes: EigReasonCode[] = [];
  if (factors.novelty === 'NEVER_OBSERVED') codes.push('NOVEL_SURFACE_NEVER_OBSERVED');
  if (factors.novelty === 'OBSERVED_WITH_ORACLE') codes.push('DEMOTED_BY_ORACLE_ALREADY_PRESENT');
  if (factors.contractDepth === 'TYPE_OR_COLLECTION') codes.push('DEEP_CONTRACT_AVAILABLE');
  if (factors.changeRecency === 'CHANGED_IN_CURRENT_DIFF') codes.push('SOURCE_CHANGED_IN_CURRENT_DIFF');
  if (factors.blastRadius === 'MANY_CONSUMERS') codes.push('WIDE_CONSUMER_FOOTPRINT');
  if (factors.duplicateRisk === 'ONE_PRIOR_CLUSTER' || factors.duplicateRisk === 'MANY_PRIOR_CLUSTERS') codes.push('DEMOTED_BY_PRIOR_FINDINGS');
  if (factors.cost === 'HIGH') codes.push('DEMOTED_BY_COST');
  if (isPartiallyUnknown(factors)) codes.push('FACTORS_PARTLY_UNKNOWN');
  return Object.freeze(codes);
}

export function isPartiallyUnknown(factors: EigFactors): boolean {
  return (Object.keys(UNKNOWN_LEVEL_NAMES) as (keyof EigFactors)[])
    .some((factor) => factors[factor] === 'UNKNOWN');
}

/**
 * Rank targets. Deterministic and total: equal scores order by `targetId`, so
 * two runs over the same input cannot disagree about anything, including ties.
 *
 * `totalConsidered` is null when the caller's own enumeration was bounded,
 * because an unknown total must not be reported as a number.
 */
export function rankByExpectedInformationGain(
  targets: readonly EigTarget[],
  options: { readonly limit?: number; readonly consideredSetComplete?: boolean } = {},
): EigRanking {
  const limit = options.limit ?? DEFAULT_EIG_LIMIT;
  const complete = options.consideredSetComplete ?? true;
  const scored = targets.map((target) => ({ target, score: eigScore(target.factors) }));
  scored.sort((left, right) => {
    const byScore = compareScores(right.score, left.score);
    if (byScore !== 0) return byScore;
    // Total order. Without this, two equal-scoring targets could swap between
    // runs and the ranking would not be reproducible.
    return left.target.targetId < right.target.targetId ? -1 : left.target.targetId > right.target.targetId ? 1 : 0;
  });
  const kept = scored.slice(0, Math.max(0, limit));
  const ranked = kept.map((entry, index): RankedTarget => Object.freeze({
    rank: index + 1,
    targetId: entry.target.targetId,
    score: entry.score,
    factors: entry.target.factors,
    factorLevels: Object.freeze({
      novelty: NOVELTY_LEVELS[entry.target.factors.novelty],
      contractDepth: CONTRACT_DEPTH_LEVELS[entry.target.factors.contractDepth],
      changeRecency: CHANGE_RECENCY_LEVELS[entry.target.factors.changeRecency],
      blastRadius: BLAST_RADIUS_LEVELS[entry.target.factors.blastRadius],
      cost: COST_LEVELS[entry.target.factors.cost],
      duplicateRisk: DUPLICATE_RISK_LEVELS[entry.target.factors.duplicateRisk],
    }),
    reasonCodes: reasonCodesFor(entry.target.factors),
    evidenceDigest: entry.target.evidenceDigest,
    partiallyUnknown: isPartiallyUnknown(entry.target.factors),
  }));
  const dropped = Math.max(0, scored.length - ranked.length);
  return Object.freeze({
    schemaVersion: EIG_VERSION,
    consideredCount: targets.length,
    rankedCount: ranked.length,
    limit,
    droppedCount: dropped,
    truncated: dropped > 0,
    totalConsidered: complete ? targets.length : null,
    remainingUnknown: !complete,
    ranked: Object.freeze(ranked),
    // Stated in the data, not only in a comment.
    grantsAuthority: false as const,
  });
}
