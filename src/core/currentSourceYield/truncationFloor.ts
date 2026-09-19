// ---------------------------------------------------------------------------
// W13 R-05 — yield-denominator truncation floor semantics.
//
// The current-source census is truthfully TRUNCATED: the Ouchan enumeration
// aborts at the existing hard per-repository ceiling
// (`MAX_SIBLING_SOURCE_SCAN_FILES = 4096`) with no resumable cursor, and that
// resource contract is not raised or paginated by W13. Every W13 yield-metric
// denominator that consumes the source inventory must therefore treat a
// non-COMPLETE population as a FLOOR, never as a total, reusing the shared
// completeness vocabulary in `src/core/source/completeness.ts` rather than
// inventing a parallel one.
//
// Data-only: no filesystem, network, process, or persistence authority.
// ---------------------------------------------------------------------------

import { isComplete, type SourceCompletenessState } from '../source/completeness';

export const YIELD_DENOMINATOR_SEMANTICS_VERSION = 'nightwatch.yield-denominator-semantics.v1' as const;

/** EXACT only for a COMPLETE population; FLOOR/UNKNOWN are always floors. */
export type YieldDenominatorSemantics = 'EXACT' | 'FLOOR';

export interface YieldPopulationDenominator {
  readonly schemaVersion: typeof YIELD_DENOMINATOR_SEMANTICS_VERSION;
  readonly populationId: string;
  readonly statedCount: number;
  readonly semantics: YieldDenominatorSemantics;
  readonly exhaustive: boolean;
  readonly completeness: SourceCompletenessState;
}

export interface YieldMetricDenominator {
  readonly metricId: string;
  readonly populationId: string;
  readonly denominator: number;
  readonly semantics: YieldDenominatorSemantics;
  readonly exhaustive: boolean;
}

export interface YieldDenominatorViolation {
  readonly code: string;
  readonly metricId: string;
  readonly detail: string;
}

export function denominatorSemanticsFor(completeness: SourceCompletenessState): YieldDenominatorSemantics {
  return isComplete(completeness) ? 'EXACT' : 'FLOOR';
}

/**
 * Project one population into a denominator claim. A non-COMPLETE population
 * can only produce a FLOOR; the stated count is preserved as the observed
 * floor and can never be marked exhaustive.
 */
export function projectedPopulationDenominator(input: {
  readonly populationId: string;
  readonly statedCount: number;
  readonly completeness: SourceCompletenessState;
}): YieldPopulationDenominator {
  const semantics = denominatorSemanticsFor(input.completeness);
  return {
    schemaVersion: YIELD_DENOMINATOR_SEMANTICS_VERSION,
    populationId: input.populationId,
    statedCount: input.statedCount,
    semantics,
    exhaustive: semantics === 'EXACT',
    completeness: input.completeness,
  };
}

/**
 * Mechanical check: every metric denominator must agree with its population's
 * completeness. A TRUNCATED/UNKNOWN population presented as EXACT or
 * exhaustive is a violation; an unknown population reference is a violation.
 */
export function checkYieldDenominators(input: {
  readonly populations: readonly YieldPopulationDenominator[];
  readonly metrics: readonly YieldMetricDenominator[];
}): { readonly ok: true } | { readonly ok: false; readonly violations: readonly YieldDenominatorViolation[] } {
  const violations: YieldDenominatorViolation[] = [];
  const byId = new Map(input.populations.map((population) => [population.populationId, population]));
  for (const metric of input.metrics) {
    const population = byId.get(metric.populationId);
    if (population === undefined) {
      violations.push({
        code: 'YIELD_DENOMINATOR_POPULATION_UNKNOWN',
        metricId: metric.metricId,
        detail: `metric references undeclared population ${metric.populationId}`,
      });
      continue;
    }
    const required = denominatorSemanticsFor(population.completeness);
    if (required === 'FLOOR' && (metric.semantics === 'EXACT' || metric.exhaustive)) {
      violations.push({
        code: 'YIELD_DENOMINATOR_TRUNCATED_AS_TOTAL',
        metricId: metric.metricId,
        detail: `population ${population.populationId} is ${population.completeness}; its denominator must be a FLOOR and never exhaustive (stated=${metric.denominator})`,
      });
    }
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
