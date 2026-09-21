import { test, expect } from '@playwright/test';

import { worstCompleteness } from '../../src/core/source/completeness';
import {
  YIELD_DENOMINATOR_SEMANTICS_VERSION,
  checkYieldDenominators,
  denominatorSemanticsFor,
  projectedPopulationDenominator,
  type YieldMetricDenominator,
} from '../../src/core/currentSourceYield/truncationFloor';

test.describe('W13 truncation floor semantics', () => {
  test('the census decision: Ouchan stays TRUNCATED at the contract ceiling', () => {
    // The approved scan config already pins Ouchan to MAX_SIBLING_SOURCE_SCAN_FILES
    // (4096) and the walk aborts there without a cursor, so a non-COMPLETE
    // population is the standing input and every denominator built from it is
    // a floor.
    const repositoryStates = ['COMPLETE', 'COMPLETE', 'TRUNCATED', 'COMPLETE'] as const;
    expect(worstCompleteness(...repositoryStates)).toBe('TRUNCATED');
  });

  test('a truncated population can only produce a FLOOR denominator', () => {
    const truncated = projectedPopulationDenominator({
      populationId: 'sourceInventory.filesAdmitted',
      statedCount: 4124,
      completeness: 'TRUNCATED',
    });
    expect(truncated.semantics).toBe('FLOOR');
    expect(truncated.exhaustive).toBe(false);
    expect(truncated.schemaVersion).toBe(YIELD_DENOMINATOR_SEMANTICS_VERSION);

    const unknown = projectedPopulationDenominator({
      populationId: 'sourceInventory.filesAdmitted',
      statedCount: 0,
      completeness: 'UNKNOWN',
    });
    expect(unknown.semantics).toBe('FLOOR');
    expect(unknown.exhaustive).toBe(false);
  });

  test('a complete population may state an EXACT denominator', () => {
    const complete = projectedPopulationDenominator({
      populationId: 'sourceInventory.filesAdmitted',
      statedCount: 57,
      completeness: 'COMPLETE',
    });
    expect(complete.semantics).toBe('EXACT');
    expect(complete.exhaustive).toBe(true);
    expect(denominatorSemanticsFor('COMPLETE')).toBe('EXACT');
    expect(denominatorSemanticsFor('TRUNCATED')).toBe('FLOOR');
    expect(denominatorSemanticsFor('UNKNOWN')).toBe('FLOOR');
  });

  test('a truncated population presented as an exhaustive total is mechanically rejected', () => {
    const populations = [
      projectedPopulationDenominator({ populationId: 'sourceFiles', statedCount: 4124, completeness: 'TRUNCATED' }),
      projectedPopulationDenominator({ populationId: 'rippleApiFiles', statedCount: 112, completeness: 'COMPLETE' }),
    ];
    const bad: YieldMetricDenominator[] = [
      { metricId: 'admissionRate', populationId: 'sourceFiles', denominator: 4124, semantics: 'EXACT', exhaustive: true },
    ];
    const rejected = checkYieldDenominators({ populations, metrics: bad });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.violations.map((violation) => violation.code)).toContain('YIELD_DENOMINATOR_TRUNCATED_AS_TOTAL');
      expect(rejected.violations[0]?.detail).toContain('TRUNCATED');
    }

    const floorOnly = checkYieldDenominators({
      populations,
      metrics: [
        { metricId: 'admissionRate', populationId: 'sourceFiles', denominator: 4124, semantics: 'FLOOR', exhaustive: false },
        { metricId: 'rippleApiRate', populationId: 'rippleApiFiles', denominator: 112, semantics: 'EXACT', exhaustive: true },
      ],
    });
    expect(floorOnly.ok).toBe(true);
  });

  test('an undeclared population reference is rejected rather than trusted', () => {
    const checked = checkYieldDenominators({
      populations: [projectedPopulationDenominator({ populationId: 'sourceFiles', statedCount: 4124, completeness: 'TRUNCATED' })],
      metrics: [{ metricId: 'orphanRate', populationId: 'missing', denominator: 10, semantics: 'FLOOR', exhaustive: false }],
    });
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.violations.map((violation) => violation.code)).toContain('YIELD_DENOMINATOR_POPULATION_UNKNOWN');
    }
  });
});
