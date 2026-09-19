// ---------------------------------------------------------------------------
// W13 R-04/R-06 — measurement completeness and per-provider attribution.
//
// W12's aggregate was a task artifact with no required-metric schema, so a
// required metric could be silently absent, and its run receipts carried a
// single provider with `providerRetries: "NOT_CAPTURED"` and no per-provider
// breakdown. This module owns the contract both must satisfy:
//
//   * every required global metric is present as a measured number, a measured
//     distribution, or an explicit NOT_CAPTURED carrying its reason;
//   * every run receipt that claims provider execution reports per-provider
//     calls, valid responses, failures by taxonomy class, retries, bytes, wall
//     time, and transitions, with no attribution-free blend.
//
// Data-only: no filesystem, network, process, or persistence authority.
// ---------------------------------------------------------------------------

export const YIELD_AGGREGATE_SCHEMA_VERSION = 'nightwatch.w13-current-source-yield-aggregation.v1' as const;
export const YIELD_RUN_RECEIPT_SCHEMA_VERSION = 'nightwatch.w13-run-receipt.v1' as const;

export type MetricSemantics = 'EXACT' | 'FLOOR';

export interface MeasuredNumber {
  readonly kind: 'MEASURED';
  readonly semantics: MetricSemantics;
  readonly value: number;
  readonly denominator?: string;
}

export interface MeasuredDistribution {
  readonly kind: 'MEASURED_DISTRIBUTION';
  readonly semantics: MetricSemantics;
  readonly value: Readonly<Record<string, number>>;
}

export interface NotCapturedMetric {
  readonly kind: 'NOT_CAPTURED';
  readonly reason: string;
}

export type MetricValue = MeasuredNumber | MeasuredDistribution | NotCapturedMetric;

/** The required global-metric list. A metric absent from this contract is
 * optional; a metric present here must appear in every aggregate. */
export const REQUIRED_GLOBAL_METRICS = Object.freeze([
  'plannedRuns',
  'attemptedRuns',
  'validRuns',
  'providerBlockedRuns',
  'investigationsStarted',
  'investigationsCompleted',
  'reasonerCalls',
  'providerFailuresByClass',
  'providerRetries',
  'providerTransitions',
  'toolActions',
  'uniqueRepositories',
  'uniqueInspectedSourcePaths',
  'visibleExecutableTargets',
  'hypothesesFormed',
  'reproductionAttempts',
  'reproductionExecutions',
  'qualifyingReproductions',
  'reproductionNotAvailable',
  'candidatesProposed',
  'refusalsByReason',
  'mechanicalAdmissions',
  'noveltyClasses',
  'leakageEvents',
  'providerResponseBytes',
  'providerStderrBytes',
  'renderedInputBytes',
  'toolPayloadBytes',
  'wallTimeMs',
  'terminationReasons',
] as const);

export type RequiredGlobalMetric = (typeof REQUIRED_GLOBAL_METRICS)[number];

export interface YieldAggregateRecord {
  readonly schemaVersion: typeof YIELD_AGGREGATE_SCHEMA_VERSION;
  readonly metrics: Readonly<Record<string, MetricValue>>;
}

export interface AggregateViolation {
  readonly code: string;
  readonly metricId: string;
  readonly detail: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateMetricValue(metricId: string, value: unknown, violations: AggregateViolation[]): void {
  if (!isRecord(value)) {
    violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: 'metric value is not an object' });
    return;
  }
  if (value.kind === 'NOT_CAPTURED') {
    if (typeof value.reason !== 'string' || value.reason.trim().length === 0) {
      violations.push({ code: 'YIELD_METRIC_NOT_CAPTURED_WITHOUT_REASON', metricId, detail: 'NOT_CAPTURED metric carries no reason' });
    }
    return;
  }
  if (value.kind === 'MEASURED') {
    if (value.semantics !== 'EXACT' && value.semantics !== 'FLOOR') {
      violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: `unknown semantics ${String(value.semantics)}` });
      return;
    }
    if (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0) {
      violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: 'MEASURED metric value must be a non-negative finite number' });
    }
    return;
  }
  if (value.kind === 'MEASURED_DISTRIBUTION') {
    if (value.semantics !== 'EXACT' && value.semantics !== 'FLOOR') {
      violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: `unknown semantics ${String(value.semantics)}` });
      return;
    }
    if (!isRecord(value.value)) {
      violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: 'distribution value must be an object' });
      return;
    }
    for (const [key, entry] of Object.entries(value.value)) {
      if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0) {
        violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: `distribution entry ${key} must be a non-negative finite number` });
      }
    }
    return;
  }
  violations.push({ code: 'YIELD_METRIC_MALFORMED', metricId, detail: `unknown metric kind ${String(value.kind)}` });
}

/**
 * Mechanical completeness: every required metric is present and well formed.
 * A required metric that is genuinely impossible to capture must say so with
 * a reason; it can never simply be missing.
 */
export function validateAggregateCompleteness(record: unknown): { readonly ok: true } | { readonly ok: false; readonly violations: readonly AggregateViolation[] } {
  const violations: AggregateViolation[] = [];
  if (!isRecord(record) || record.schemaVersion !== YIELD_AGGREGATE_SCHEMA_VERSION) {
    return { ok: false, violations: [{ code: 'YIELD_AGGREGATE_SCHEMA_UNSUPPORTED', metricId: '', detail: `schemaVersion must be ${YIELD_AGGREGATE_SCHEMA_VERSION}` }] };
  }
  const metrics = isRecord(record.metrics) ? record.metrics : null;
  if (metrics === null) {
    return { ok: false, violations: [{ code: 'YIELD_AGGREGATE_METRICS_MISSING', metricId: '', detail: 'aggregate has no metrics object' }] };
  }
  const unknown = Object.keys(metrics).filter((key) => !(REQUIRED_GLOBAL_METRICS as readonly string[]).includes(key));
  for (const metricId of unknown) {
    violations.push({ code: 'YIELD_METRIC_UNKNOWN', metricId, detail: 'aggregate carries a metric outside the W13 contract' });
  }
  for (const metricId of REQUIRED_GLOBAL_METRICS) {
    if (!(metricId in metrics)) {
      violations.push({ code: 'YIELD_METRIC_REQUIRED_MISSING', metricId, detail: 'required global metric is silently absent' });
      continue;
    }
    validateMetricValue(metricId, metrics[metricId], violations);
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

export interface ProviderAttribution {
  readonly provider: string;
  readonly calls: MetricValue;
  readonly validResponses: MetricValue;
  readonly failuresByClass: MetricValue;
  readonly retries: MetricValue;
  readonly responseBytes: MetricValue;
  readonly stderrBytes: MetricValue;
  readonly wallTimeMs: MetricValue;
  readonly transitionsIn: readonly string[];
  readonly transitionsOut: readonly string[];
}

const ATTRIBUTION_NUMBER_FIELDS = ['calls', 'validResponses', 'failuresByClass', 'retries', 'responseBytes', 'stderrBytes', 'wallTimeMs'] as const;

/**
 * Per-provider attribution contract (R-04). A receipt that reports provider
 * activity must report it separately for each provider; an attribution-free
 * blend is refused.
 */
export function validateProviderAttribution(providers: unknown): { readonly ok: true } | { readonly ok: false; readonly violations: readonly AggregateViolation[] } {
  const violations: AggregateViolation[] = [];
  if (!Array.isArray(providers) || providers.length === 0) {
    return { ok: false, violations: [{ code: 'YIELD_PROVIDER_ATTRIBUTION_MISSING', metricId: 'providerAttribution', detail: 'receipt reports no per-provider attribution' }] };
  }
  const seen = new Set<string>();
  for (const entry of providers) {
    if (!isRecord(entry) || typeof entry.provider !== 'string' || entry.provider.length === 0) {
      violations.push({ code: 'YIELD_PROVIDER_ATTRIBUTION_MALFORMED', metricId: 'providerAttribution', detail: 'provider entry has no provider identity' });
      continue;
    }
    if (seen.has(entry.provider)) {
      violations.push({ code: 'YIELD_PROVIDER_ATTRIBUTION_DUPLICATE', metricId: entry.provider, detail: 'provider appears more than once' });
      continue;
    }
    seen.add(entry.provider);
    for (const field of ATTRIBUTION_NUMBER_FIELDS) {
      if (!(field in entry)) {
        violations.push({ code: 'YIELD_PROVIDER_ATTRIBUTION_FIELD_MISSING', metricId: entry.provider, detail: `missing ${field}` });
        continue;
      }
      validateMetricValue(`${entry.provider}.${field}`, entry[field], violations);
    }
    for (const transitionField of ['transitionsIn', 'transitionsOut'] as const) {
      const value = entry[transitionField];
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        violations.push({ code: 'YIELD_PROVIDER_ATTRIBUTION_FIELD_MISSING', metricId: entry.provider, detail: `missing or malformed ${transitionField}` });
      }
    }
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
