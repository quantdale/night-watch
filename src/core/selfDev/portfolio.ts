// ---------------------------------------------------------------------------
// Nightwatch Phase 8B.1.0 — bounded deterministic synthetic proposal portfolio.
//
// This module is the single trusted definition of the proposal portfolio:
// which safe deterministic proposal semantics exist, in which fixed order
// they are considered, and how "novelty" is derived from the live
// adopted-case catalog. It is pure declarative data plus one pure selection
// function: no callbacks, no executable values, no candidate-provided
// behavior, no time/random/network/base-SHA/seed input.
//
// Portfolio versioning is deliberate: changing membership, ordering, or the
// selection algorithm is a self-development CONTRACT change and must be
// reflected in the contract manifest (see contract.ts).
// ---------------------------------------------------------------------------

import { SELFDEV_BASELINE_COVERAGE, SELFDEV_FIXTURE_ID } from './registry';
import { deriveAdoptedCaseCoverage } from './adoptedCases';
import { selfDevEquivalentFingerprint } from './validation';

export const SELFDEV_SYNTHETIC_PORTFOLIO_VERSION = 'nightwatch.selfdev-synthetic-portfolio.v1' as const;
export const SELFDEV_SELECTION_ALGORITHM_VERSION = 'nightwatch.selfdev-synthetic-selection.v1' as const;

export type SelfDevSyntheticProposalVariantId = 'EXPAND_SUMMARY' | 'EXPAND_THEN_COLLAPSE';

/**
 * One trusted declarative portfolio member. `coverageClasses` and
 * `equivalentFingerprint` are DERIVED at module load from the fixed action
 * registry and the shared fingerprint computation — never supplied as free
 * data — so the descriptor can never drift from what a real candidate with
 * the same fixture/actions/assertions would produce.
 */
export interface SelfDevSyntheticProposalVariant {
  readonly variantId: SelfDevSyntheticProposalVariantId;
  readonly title: string;
  readonly fixtureId: typeof SELFDEV_FIXTURE_ID;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly coverageClasses: readonly string[];
  readonly equivalentFingerprint: string;
}

const EXPAND_ACTION_IDS: readonly string[] = ['selfdev.synthetic.expand-summary'];
const EXPAND_ASSERTION_IDS: readonly string[] = [
  'selfdev.assert.state.expanded',
  'selfdev.assert.transition.expansion',
  'selfdev.assert.oracle.structural-stable',
];
const EXPAND_COLLAPSE_ACTION_IDS: readonly string[] = [
  'selfdev.synthetic.expand-summary',
  'selfdev.synthetic.collapse-summary',
];
const EXPAND_COLLAPSE_ASSERTION_IDS: readonly string[] = [
  'selfdev.assert.state.ready',
  'selfdev.assert.transition.collapse',
  'selfdev.assert.oracle.structural-stable',
];

function variant(id: SelfDevSyntheticProposalVariantId, title: string, actionIds: readonly string[], assertionIds: readonly string[]): SelfDevSyntheticProposalVariant {
  return Object.freeze({
    variantId: id,
    title,
    fixtureId: SELFDEV_FIXTURE_ID,
    actionIds: Object.freeze([...actionIds]),
    assertionIds: Object.freeze([...assertionIds]),
    coverageClasses: deriveAdoptedCaseCoverage(actionIds),
    equivalentFingerprint: selfDevEquivalentFingerprint(SELFDEV_FIXTURE_ID, actionIds, assertionIds),
  });
}

/**
 * Portfolio member A — the historical default: one read-only expansion.
 * Final state `selfdev.state.expanded.v1`, terminal transition
 * `READ_ONLY_EXPANSION`.
 */
export const SELFDEV_EXPAND_SUMMARY_VARIANT: SelfDevSyntheticProposalVariant = variant(
  'EXPAND_SUMMARY',
  'Expand synthetic summary read-only',
  EXPAND_ACTION_IDS,
  EXPAND_ASSERTION_IDS,
);

/**
 * Portfolio member B — expand then collapse: the second genuinely distinct
 * safe semantic. Final state `selfdev.state.ready.v1`, terminal transition
 * `READ_ONLY_COLLAPSE`. Its collapse coverage
 * (`state-action:expanded:selfdev.synthetic.collapse-summary`,
 * `transition:expanded-read-only-collapse`) remains novel after A is adopted.
 */
export const SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT: SelfDevSyntheticProposalVariant = variant(
  'EXPAND_THEN_COLLAPSE',
  'Expand-collapse synthetic summary read-only',
  EXPAND_COLLAPSE_ACTION_IDS,
  EXPAND_COLLAPSE_ASSERTION_IDS,
);

/** The frozen ordered portfolio. Order is contract semantics — never rely on object/file/hash order. */
export const SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS: readonly SelfDevSyntheticProposalVariant[] = Object.freeze([
  SELFDEV_EXPAND_SUMMARY_VARIANT,
  SELFDEV_EXPAND_THEN_COLLAPSE_VARIANT,
]);

export function selfDevSyntheticProposalVariantById(variantId: SelfDevSyntheticProposalVariantId): SelfDevSyntheticProposalVariant {
  const found = SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS.find((item) => item.variantId === variantId);
  if (found === undefined) throw new Error('SELFDEV_PORTFOLIO_VARIANT_UNKNOWN');
  return found;
}

export interface SelfDevAdoptedStateInput {
  readonly adoptedEquivalentFingerprints: readonly string[];
  readonly adoptedCoverageClasses: readonly string[];
}

/**
 * The one deterministic catalog-aware novelty selector.
 *
 * A variant is the next novel candidate only when BOTH hold:
 * 1. its base-independent equivalent fingerprint is not already adopted, AND
 * 2. its action-registry-derived coverage adds at least one class not already
 *    covered by the built-in baseline plus the adopted coverage.
 *
 * Returns the first novel variant in the frozen portfolio order, or `null`
 * when the portfolio is EXHAUSTED. Selection never depends on
 * `baseNightwatchSha`, `seed`, `createdAt`, or `candidateId` — those are
 * identity/timestamp data, not semantics.
 */
export function selectNextSyntheticProposalVariant(input: SelfDevAdoptedStateInput): SelfDevSyntheticProposalVariant | null {
  const covered = new Set([...SELFDEV_BASELINE_COVERAGE, ...input.adoptedCoverageClasses]);
  for (const candidate of SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS) {
    if (input.adoptedEquivalentFingerprints.includes(candidate.equivalentFingerprint)) continue;
    const novelClasses = candidate.coverageClasses.filter((coverageClass) => !covered.has(coverageClass));
    if (novelClasses.length === 0) continue;
    return candidate;
  }
  return null;
}
