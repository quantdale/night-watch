// ---------------------------------------------------------------------------
// Nightwatch Phase 16A — sanitized novelty/yield accounting (WORKSTREAM W4).
//
// Local/synthetic-only yield accounting over Nightwatch's own prior campaign
// lifecycle evidence. Raw customer/product values can NEVER enter these
// records: the shape is bounded integers plus categorical codes only.
//
// Hard invariants (ACCEPTANCE MATRIX D):
//   - no raw customer/auth/product values in durable yield records
//     (structurally impossible: integer counters only);
//   - useful-yield counters derive from existing sanitized Nightwatch
//     lifecycle evidence vocabulary (admitted/reproduced/minimized/cluster/
//     dossier states);
//   - synthetic/historical estimates are EXPLICITLY distinguished from real-
//     world yield via fixed markers on every record;
//   - duplicate pressure cannot increase novelty accounting: duplicates are
//     counted as merges (suppressed observations), never as new discoveries.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness.
// ---------------------------------------------------------------------------

import {
  type CampaignPortfolio,
  PORTFOLIO_YIELD_COUNTER_MAX,
  type PortfolioYieldCounters,
  EMPTY_PORTFOLIO_YIELD,
  portfolioDigestOf,
} from "./types";

/** Accounting identity version. */
export const PORTFOLIO_YIELD_VERSION =
  "nightwatch.portfolio-yield-accounting.v1" as const;

/** Fixed evidence basis: prior LOCAL/SYNTHETIC Nightwatch campaign history. */
export const YIELD_BASIS = "LOCAL_SYNTHETIC_HISTORY" as const;

/**
 * Fixed interpretation marker. Synthetic/backtest deltas demonstrate planner
 * properties only; they are never proof of real-world bug yield.
 */
export const YIELD_INTERPRETATION =
  "PLANNER_AND_PLATFORM_PROPERTY_EVIDENCE_NOT_REAL_WORLD_YIELD" as const;

function boundedCounter(value: number, code: string): number {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > PORTFOLIO_YIELD_COUNTER_MAX
  ) {
    throw new Error(`PORTFOLIO_YIELD_COUNTER_INVALID:${code}`);
  }
  return value;
}

/** Validate one counter set (fail closed). */
export function validateYieldCounters(
  value: PortfolioYieldCounters,
): PortfolioYieldCounters {
  return {
    admittedCount: boundedCounter(value.admittedCount, "admittedCount"),
    reproducedCount: boundedCounter(value.reproducedCount, "reproducedCount"),
    minimizedCount: boundedCounter(value.minimizedCount, "minimizedCount"),
    distinctClusterCount: boundedCounter(
      value.distinctClusterCount,
      "distinctClusterCount",
    ),
    dossierReadyCount: boundedCounter(
      value.dossierReadyCount,
      "dossierReadyCount",
    ),
    duplicateMerges: boundedCounter(value.duplicateMerges, "duplicateMerges"),
    invalidOrTransient: boundedCounter(
      value.invalidOrTransient,
      "invalidOrTransient",
    ),
    executionsTotal: boundedCounter(value.executionsTotal, "executionsTotal"),
  };
}

/** Bounded addition of two counter sets (overflow fails closed). */
export function addYieldCounters(
  left: PortfolioYieldCounters,
  right: PortfolioYieldCounters,
): PortfolioYieldCounters {
  const keys = Object.keys(
    EMPTY_PORTFOLIO_YIELD,
  ) as (keyof PortfolioYieldCounters)[];
  const merged: Record<string, number> = {};
  for (const key of keys) {
    merged[key] = boundedCounter(left[key] + right[key], key);
  }
  return Object.freeze(merged) as unknown as PortfolioYieldCounters;
}

/** Rates are integral permille values (floor) so results stay deterministic. */
export interface YieldRatePermille {
  /** duplicateMerges / admittedCount, floor(permille); null when nothing admitted. */
  readonly duplicateRatePermille: number | null;
  /** invalidOrTransient / admittedCount, floor(permille); null when nothing admitted. */
  readonly invalidRatePermille: number | null;
  /** executionsTotal per dossierReadyCount, floor(permille x1000 semantics:
   *  floor(executions*1000/dossierReady)); null when zero dossier-ready
   *  candidates exist (UNPROVEN, never zero-cost). */
  readonly costPerUsefulCandidatePermille: number | null;
}

/** The complete versioned accounting record for one portfolio. */
export interface PortfolioYieldAccounting {
  readonly yieldVersion: typeof PORTFOLIO_YIELD_VERSION;
  readonly basis: typeof YIELD_BASIS;
  readonly realWorldBugYieldClaim: false;
  readonly interpretation: typeof YIELD_INTERPRETATION;
  readonly portfolioDigest: string;
  /** Summed sanitized counters across all members. */
  readonly totals: PortfolioYieldCounters;
  /** Dossier-ready candidates are the useful-yield unit. */
  readonly usefulCandidateCount: number;
  /** Distinct semantic clusters across the portfolio (duplicate-suppressed). */
  readonly distinctClusterCount: number;
  readonly rates: YieldRatePermille;
  /** Per-member counters keyed by memberId (sorted keys in canonical form). */
  readonly byMember: Readonly<Record<string, PortfolioYieldCounters>>;
  /** `pyield:sha256:<24>` over the canonical serialization above. */
  readonly digest: string;
}

/**
 * Build the accounting record from an already-validated portfolio. Member
 * counters were sentinel-checked and range-validated at portfolio
 * construction; they are re-validated here defensively (fail closed).
 */
export function buildPortfolioYieldAccounting(
  portfolio: CampaignPortfolio,
): PortfolioYieldAccounting {
  const byMember: Record<string, PortfolioYieldCounters> = {};
  let totals: PortfolioYieldCounters = { ...EMPTY_PORTFOLIO_YIELD };

  // Deterministic order: portfolio.members is sorted by memberId.
  for (const member of portfolio.members) {
    const counters = validateYieldCounters(member.input.historicalYield);
    byMember[member.memberId] = counters;
    totals = addYieldCounters(totals, counters);
  }

  const usefulCandidateCount = totals.dossierReadyCount;
  const rates: YieldRatePermille = {
    duplicateRatePermille:
      totals.admittedCount > 0
        ? Math.floor((totals.duplicateMerges * 1000) / totals.admittedCount)
        : null,
    invalidRatePermille:
      totals.admittedCount > 0
        ? Math.floor((totals.invalidOrTransient * 1000) / totals.admittedCount)
        : null,
    costPerUsefulCandidatePermille:
      usefulCandidateCount > 0
        ? Math.floor((totals.executionsTotal * 1000) / usefulCandidateCount)
        : null,
  };

  const record = {
    yieldVersion: PORTFOLIO_YIELD_VERSION,
    basis: YIELD_BASIS,
    realWorldBugYieldClaim: false as const,
    interpretation: YIELD_INTERPRETATION,
    portfolioDigest: portfolio.portfolioDigest,
    totals,
    usefulCandidateCount,
    distinctClusterCount: totals.distinctClusterCount,
    rates,
    byMember,
  };

  return {
    ...record,
    digest: `pyield:sha256:${portfolioDigestOf(record).slice(0, 24)}`,
  };
}
