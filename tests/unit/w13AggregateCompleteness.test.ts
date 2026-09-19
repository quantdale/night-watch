import { test, expect } from '@playwright/test';

import {
  REQUIRED_GLOBAL_METRICS,
  YIELD_AGGREGATE_SCHEMA_VERSION,
  validateAggregateCompleteness,
  validateProviderAttribution,
  type MetricValue,
} from '../../src/core/currentSourceYield/aggregation';
import {
  checkYieldDenominators,
  projectedPopulationDenominator,
} from '../../src/core/currentSourceYield/truncationFloor';

const measured = (value: number): MetricValue => ({ kind: 'MEASURED', semantics: 'EXACT', value });
const notCaptured = (reason: string): MetricValue => ({ kind: 'NOT_CAPTURED', reason });

function completeMetrics(): Record<string, MetricValue> {
  const metrics: Record<string, MetricValue> = {};
  for (const metricId of REQUIRED_GLOBAL_METRICS) {
    metrics[metricId] = measured(0);
  }
  metrics.providerFailuresByClass = { kind: 'MEASURED_DISTRIBUTION', semantics: 'EXACT', value: {} };
  metrics.refusalsByReason = { kind: 'MEASURED_DISTRIBUTION', semantics: 'EXACT', value: {} };
  metrics.noveltyClasses = { kind: 'MEASURED_DISTRIBUTION', semantics: 'EXACT', value: {} };
  metrics.terminationReasons = { kind: 'MEASURED_DISTRIBUTION', semantics: 'EXACT', value: {} };
  return metrics;
}

test.describe('W13 aggregate completeness contract', () => {
  test('a W12-style aggregate that omits required metrics is mechanically rejected', () => {
    const w12Style = {
      schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION,
      metrics: {
        plannedRuns: measured(9),
        attemptedRuns: measured(9),
        validRuns: measured(1),
        providerBlockedRuns: measured(8),
        reasonerCalls: measured(83),
        candidatesProposed: measured(2),
        mechanicalAdmissions: measured(0),
      },
    };
    const checked = validateAggregateCompleteness(w12Style);
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      const missing = checked.violations.filter((violation) => violation.code === 'YIELD_METRIC_REQUIRED_MISSING').map((violation) => violation.metricId);
      expect(missing).toContain('providerFailuresByClass');
      expect(missing).toContain('providerRetries');
      expect(missing).toContain('providerTransitions');
      expect(missing).toContain('leakageEvents');
      expect(missing).toContain('terminationReasons');
      expect(missing).toContain('toolPayloadBytes');
    }
  });

  test('a complete aggregate passes, and NOT_CAPTURED is only legal with a reason', () => {
    const complete = { schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION, metrics: completeMetrics() };
    expect(validateAggregateCompleteness(complete).ok).toBe(true);

    const withoutReason = completeMetrics();
    delete (withoutReason as Record<string, unknown>).providerRetries;
    (withoutReason as Record<string, MetricValue>).providerRetries = { kind: 'NOT_CAPTURED', reason: '' };
    const checked = validateAggregateCompleteness({ schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION, metrics: withoutReason });
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.violations.map((violation) => violation.code)).toContain('YIELD_METRIC_NOT_CAPTURED_WITHOUT_REASON');
    }

    const withReason = completeMetrics();
    withReason.providerRetries = notCaptured('provider CLI does not expose a retry counter for this transport');
    expect(validateAggregateCompleteness({ schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION, metrics: withReason }).ok).toBe(true);
  });

  test('an aggregate cannot smuggle in an unknown metric', () => {
    const metrics = { ...completeMetrics(), inventedMetric: measured(1) };
    const checked = validateAggregateCompleteness({ schemaVersion: YIELD_AGGREGATE_SCHEMA_VERSION, metrics });
    expect(checked.ok).toBe(false);
    if (!checked.ok) {
      expect(checked.violations.map((violation) => violation.code)).toContain('YIELD_METRIC_UNKNOWN');
    }
  });

  test('a truncated source population cannot supply an EXACT denominator to any metric', () => {
    const populations = [
      projectedPopulationDenominator({ populationId: 'filesAdmitted', statedCount: 4124, completeness: 'TRUNCATED' }),
    ];
    const checked = checkYieldDenominators({
      populations,
      metrics: [{ metricId: 'admissionRate', populationId: 'filesAdmitted', denominator: 4124, semantics: 'EXACT', exhaustive: true }],
    });
    expect(checked.ok).toBe(false);
  });
});

test.describe('W13 per-provider attribution contract', () => {
  const fullProvider = {
    provider: 'opencode-go/glm-5.3',
    calls: measured(35),
    validResponses: measured(27),
    failuresByClass: { kind: 'MEASURED_DISTRIBUTION', semantics: 'EXACT', value: { PROVIDER_RUNTIME_TIMEOUT: 5, PROVIDER_NONZERO_EXIT: 3 } } as MetricValue,
    retries: measured(8),
    responseBytes: measured(16564),
    stderrBytes: measured(205),
    wallTimeMs: measured(2432425),
    transitionsIn: [],
    transitionsOut: [],
  };

  test('a complete per-provider entry passes', () => {
    expect(validateProviderAttribution([fullProvider]).ok).toBe(true);
  });

  test('a single attribution-free provider blend is rejected', () => {
    const empty = validateProviderAttribution([]);
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.violations.map((violation) => violation.code)).toContain('YIELD_PROVIDER_ATTRIBUTION_MISSING');
    }
  });

  test('a provider entry missing fields or with NOT_CAPTURED-without-reason is rejected', () => {
    const { stderrBytes: _stderrBytes, ...missingField } = fullProvider;
    const missingChecked = validateProviderAttribution([missingField]);
    expect(missingChecked.ok).toBe(false);
    if (!missingChecked.ok) {
      expect(missingChecked.violations.map((violation) => violation.code)).toContain('YIELD_PROVIDER_ATTRIBUTION_FIELD_MISSING');
    }

    const badRetries = { ...fullProvider, retries: { kind: 'NOT_CAPTURED', reason: '' } };
    const retriesChecked = validateProviderAttribution([badRetries]);
    expect(retriesChecked.ok).toBe(false);
    if (!retriesChecked.ok) {
      expect(retriesChecked.violations.map((violation) => violation.code)).toContain('YIELD_METRIC_NOT_CAPTURED_WITHOUT_REASON');
    }
  });

  test('two providers must be attributed separately, not merged', () => {
    const second = { ...fullProvider, provider: 'opencode-go/kimi-k3', transitionsIn: ['opencode-go/glm-5.3'], transitionsOut: [] };
    expect(validateProviderAttribution([fullProvider, second]).ok).toBe(true);
    const duplicated = validateProviderAttribution([fullProvider, fullProvider]);
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.violations.map((violation) => violation.code)).toContain('YIELD_PROVIDER_ATTRIBUTION_DUPLICATE');
    }
  });
});
