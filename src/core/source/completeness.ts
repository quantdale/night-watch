// ---------------------------------------------------------------------------
// Nightwatch C-01 — shared truncation/completeness vocabulary.
//
// Data-only. This module has no filesystem, network, process, persistence, or
// runtime-admission authority. It exists so that every population Nightwatch
// reports (files enumerated, file bodies read, operations projected, surfaces
// censused) states the SAME three things in the SAME way:
//
//   COMPLETE  — the whole population was observed; the total is exact.
//   TRUNCATED — a bound was hit and a KNOWN number of members was dropped.
//   UNKNOWN   — a bound was hit upstream and the true total is not knowable
//               from this snapshot; the remainder cannot even be counted.
//
// UNKNOWN is never interpretable as COMPLETE. `isComplete` is the only
// predicate that may gate "we saw everything", and it is true for COMPLETE
// alone.
// ---------------------------------------------------------------------------

export const SOURCE_COMPLETENESS_STATES = ['COMPLETE', 'TRUNCATED', 'UNKNOWN'] as const;
export type SourceCompletenessState = (typeof SOURCE_COMPLETENESS_STATES)[number];

/** Conservative total order. A higher rank is a weaker claim about the
 * population, so combining states may only ever weaken the result:
 * COMPLETE < TRUNCATED < UNKNOWN. TRUNCATED outranks COMPLETE because members
 * were provably lost; UNKNOWN outranks TRUNCATED because the loss cannot even
 * be quantified. */
const COMPLETENESS_RANK: Readonly<Record<SourceCompletenessState, number>> = {
  COMPLETE: 0,
  TRUNCATED: 1,
  UNKNOWN: 2,
};

export function completenessRank(state: SourceCompletenessState): number {
  return COMPLETENESS_RANK[state];
}

/** Combine dimensions conservatively. With no inputs the result is UNKNOWN:
 * an unmeasured population is never COMPLETE by default. */
export function worstCompleteness(...states: readonly SourceCompletenessState[]): SourceCompletenessState {
  let worst: SourceCompletenessState = 'COMPLETE';
  if (states.length === 0) return 'UNKNOWN';
  for (const state of states) {
    if (COMPLETENESS_RANK[state] > COMPLETENESS_RANK[worst]) worst = state;
  }
  return worst;
}

/** The ONLY sanctioned "we saw everything" predicate. UNKNOWN and TRUNCATED
 * both answer false; there is deliberately no `isNotTruncated` helper that a
 * caller could mistake for this one. */
export function isComplete(state: SourceCompletenessState): boolean {
  return state === 'COMPLETE';
}

// ---------------------------------------------------------------------------
// R2 coverage states.
//
// Seven states, exhaustive over "what do we know about this population or
// contract". Coverage is an evidence report, never a permission:
//
//   PROVEN      — mechanically established from current source.
//   UNPROVEN    — attempted and not established; the construct is supported.
//   UNSUPPORTED — deliberately outside the analyzer's proven vocabulary.
//   TRUNCATED   — a bound dropped a known number of members before analysis.
//   STALE       — the evidence is bound to a source revision that moved.
//   UNKNOWN     — a bound made the true population unknowable.
//   UNMEASURED  — never attempted in this snapshot.
// ---------------------------------------------------------------------------

export const R2_COVERAGE_STATES = ['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED'] as const;
export type R2CoverageState = (typeof R2_COVERAGE_STATES)[number];

/** Coverage may DENY authority and may never GRANT it.
 *
 * There is intentionally no 'GRANT' member in this union. A PROVEN coverage
 * state is NO_EFFECT: it removes a coverage-based denial and nothing else.
 * Runtime admission authority stays with the existing owner-policy, safety and
 * eligibility authorities, which are unchanged by C-01. */
export type R2CoverageAuthorityEffect = 'DENY' | 'NO_EFFECT';

export function coverageAuthorityEffect(state: R2CoverageState): R2CoverageAuthorityEffect {
  return state === 'PROVEN' ? 'NO_EFFECT' : 'DENY';
}

/** Completeness is a population claim; coverage is an evidence claim. This is
 * the only sanctioned bridge between them, and it can only produce the three
 * population-shaped coverage states. */
export function coverageStateForCompleteness(state: SourceCompletenessState): R2CoverageState {
  if (state === 'TRUNCATED') return 'TRUNCATED';
  if (state === 'UNKNOWN') return 'UNKNOWN';
  return 'PROVEN';
}

/** Weakest-wins reduction over coverage states, used to roll a population of
 * rows up to one honest headline. With no inputs the result is UNMEASURED. */
const COVERAGE_RANK: Readonly<Record<R2CoverageState, number>> = {
  PROVEN: 0,
  UNPROVEN: 1,
  UNSUPPORTED: 2,
  STALE: 3,
  TRUNCATED: 4,
  UNKNOWN: 5,
  UNMEASURED: 6,
};

export function worstCoverageState(...states: readonly R2CoverageState[]): R2CoverageState {
  if (states.length === 0) return 'UNMEASURED';
  let worst: R2CoverageState = 'PROVEN';
  for (const state of states) {
    if (COVERAGE_RANK[state] > COVERAGE_RANK[worst]) worst = state;
  }
  return worst;
}
