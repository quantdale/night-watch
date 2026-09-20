// Validation timing telemetry core (F-PERF-1).
//
// Pure data arithmetic: no filesystem, no network, no clock, no child process,
// no environment access. Callers inject timestamps, workers and test events;
// this module only ranks, aggregates, validates and renders. That keeps every
// claim in the timing report reproducible from the raw documents and makes the
// hostile-input behavior (absolute paths, unknown fields, absurd counts)
// directly testable.
//
// Privacy: only repository-relative test paths and test titles (both
// repository-owned strings) cross this boundary. No environment values,
// assertion values, or machine-specific absolute paths are ever represented.

import { QUALITY_GATE_RECEIPT_SCHEMA as CANONICAL_QUALITY_GATE_RECEIPT_SCHEMA } from '../qualityGate/definition';

export const VALIDATION_TIMING_DOCUMENT_SCHEMA = 'nightwatch.playwright-timings.v1' as const;
export const VALIDATION_TIMING_REPORT_SCHEMA = 'nightwatch.validation-timings-report.v1' as const;
// The gate-receipt schema has exactly one owning module (A15 single
// ownership); this module references that owner instead of re-declaring the
// literal.
export const QUALITY_GATE_RECEIPT_SCHEMA = CANONICAL_QUALITY_GATE_RECEIPT_SCHEMA;

export const DEFAULT_TOP = 20;
export const MAX_TOP = 100;

/** A repository-relative path safe to persist: no absolute, traversal or symlink shape. */
const SAFE_RELATIVE_TEST_PATH = /^(?:tests|scenarios|ui)\/[A-Za-z0-9._/-]+$/;
const LANE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_TITLE_CHARS = 160;

export interface ValidationTimingEvent {
  readonly file: string;
  readonly title: string;
  readonly durationMs: number;
  readonly status: string;
  readonly retry?: number;
}

export interface ValidationTimingFileSummary {
  readonly file: string;
  readonly tests: number;
  readonly durationMs: number;
}

export interface ValidationTimingTestSummary {
  readonly file: string;
  readonly title: string;
  readonly durationMs: number;
  readonly status: string;
}

export interface ValidationTimingDocument {
  readonly schemaVersion: typeof VALIDATION_TIMING_DOCUMENT_SCHEMA;
  readonly lane: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly workers: number;
  readonly totals: {
    readonly files: number;
    readonly tests: number;
    readonly passed: number;
    readonly failed: number;
    readonly skipped: number;
    readonly timedOut: number;
    readonly interrupted: number;
    readonly retries: number;
  };
  readonly files: readonly ValidationTimingFileSummary[];
  readonly slowestTests: readonly ValidationTimingTestSummary[];
}

export interface GateGroupDuration {
  readonly id: string;
  readonly status: string;
  readonly durationMs: number | null;
  readonly counts: Record<string, number | null> | null;
}

export interface GateReceiptSummary {
  readonly receiptDigest: string | null;
  readonly environmentClass: string;
  readonly gitHead: string | null;
  readonly finalResult: string;
  readonly groups: readonly GateGroupDuration[];
  readonly measuredDurationMs: number;
  readonly unmeasuredGroups: readonly string[];
}

export interface TimingLaneSummary {
  readonly lane: string;
  readonly runs: number;
  readonly files: number;
  readonly tests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly totalDurationMs: number;
  readonly slowestFiles: readonly ValidationTimingFileSummary[];
  readonly slowestTests: readonly ValidationTimingTestSummary[];
}

export interface ValidationTimingReport {
  readonly schemaVersion: typeof VALIDATION_TIMING_REPORT_SCHEMA;
  readonly generatedAt: string;
  readonly documentCount: number;
  readonly lanes: readonly TimingLaneSummary[];
  readonly slowestFiles: readonly ValidationTimingFileSummary[];
  readonly slowestTests: readonly ValidationTimingTestSummary[];
  readonly gateReceipts: readonly GateReceiptSummary[];
  readonly unreadable: readonly string[];
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSafeTestPath(value: unknown): value is string {
  return typeof value === 'string' && SAFE_RELATIVE_TEST_PATH.test(value) && !value.includes('..');
}

function clampTop(value: number | undefined, fallback = DEFAULT_TOP): number {
  if (!Number.isInteger(value) || (value as number) < 1) return fallback;
  return Math.min(value as number, MAX_TOP);
}

function boundedTitle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.length > MAX_TITLE_CHARS ? `${value.slice(0, MAX_TITLE_CHARS)}…` : value;
}

/** Normalize an environment label into the repository's lane vocabulary. */
export function sanitizeTimingLane(value: unknown, fallback = 'default'): string {
  if (typeof value !== 'string') return fallback;
  const lowered = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!LANE_PATTERN.test(lowered)) return fallback;
  return lowered;
}

/**
 * Build one timing document from raw test events. Events with unsafe paths are
 * dropped rather than persisted; their count is not silently hidden because
 * the caller still sees the totals it supplied.
 */
export function summarizeTimingRun(input: {
  readonly lane: unknown;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly workers: number;
  readonly events: readonly ValidationTimingEvent[];
  readonly top?: number;
}): ValidationTimingDocument {
  const top = clampTop(input.top);
  const lane = sanitizeTimingLane(input.lane);
  const perFile = new Map<string, { tests: number; durationMs: number }>();
  const totals = { files: 0, tests: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0, retries: 0 };
  const tests: ValidationTimingTestSummary[] = [];
  for (const event of input.events) {
    if (!isSafeTestPath(event.file)) continue;
    if (!isFiniteNonNegative(event.durationMs)) continue;
    if (typeof event.retry === 'number' && event.retry > 0) totals.retries += 1;
    const file = perFile.get(event.file) ?? { tests: 0, durationMs: 0 };
    file.tests += 1;
    file.durationMs += event.durationMs;
    perFile.set(event.file, file);
    totals.tests += 1;
    if (event.status === 'passed' || event.status === 'expected') totals.passed += 1;
    else if (event.status === 'failed' || event.status === 'unexpected') totals.failed += 1;
    else if (event.status === 'skipped') totals.skipped += 1;
    else if (event.status === 'timedOut') totals.timedOut += 1;
    else if (event.status === 'interrupted') totals.interrupted += 1;
    tests.push({ file: event.file, title: boundedTitle(event.title), durationMs: event.durationMs, status: String(event.status) });
  }
  const files: ValidationTimingFileSummary[] = [...perFile.entries()]
    .map(([file, value]) => ({ file, tests: value.tests, durationMs: value.durationMs }))
    .sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file));
  totals.files = files.length;
  const slowestTests = [...tests]
    .sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file))
    .slice(0, top);
  return {
    schemaVersion: VALIDATION_TIMING_DOCUMENT_SCHEMA,
    lane,
    startedAt: typeof input.startedAt === 'string' ? input.startedAt : '',
    finishedAt: typeof input.finishedAt === 'string' ? input.finishedAt : '',
    durationMs: isFiniteNonNegative(input.durationMs) ? input.durationMs : 0,
    workers: Number.isInteger(input.workers) && input.workers > 0 ? input.workers : 1,
    totals,
    files,
    slowestTests,
  };
}

/**
 * Structural validation. Unknown or malformed fields are refused so a forged
 * timing document cannot contribute numbers to the report.
 */
export function validateTimingDocument(value: unknown): { ok: boolean; errors: readonly string[] } {
  const errors: string[] = [];
  if (value === null || typeof value !== 'object') return { ok: false, errors: ['NOT_AN_OBJECT'] };
  const document = value as Record<string, unknown>;
  if (document.schemaVersion !== VALIDATION_TIMING_DOCUMENT_SCHEMA) errors.push('SCHEMA_UNSUPPORTED');
  if (sanitizeTimingLane(document.lane, '') === '') errors.push('LANE_INVALID');
  if (typeof document.durationMs !== 'number' || !isFiniteNonNegative(document.durationMs)) errors.push('DURATION_INVALID');
  if (!Number.isInteger(document.workers) || (document.workers as number) < 1) errors.push('WORKERS_INVALID');
  const totals = document.totals as Record<string, unknown> | undefined;
  if (totals === null || typeof totals !== 'object') errors.push('TOTALS_MISSING');
  else {
    for (const key of ['files', 'tests', 'passed', 'failed', 'skipped', 'timedOut', 'interrupted', 'retries']) {
      if (!Number.isInteger(totals[key]) || (totals[key] as number) < 0) errors.push(`TOTAL_${key.toUpperCase()}_INVALID`);
    }
  }
  if (!Array.isArray(document.files)) errors.push('FILES_MISSING');
  else {
    for (const entry of document.files) {
      if (entry === null || typeof entry !== 'object') { errors.push('FILE_ENTRY_INVALID'); continue; }
      const file = entry as Record<string, unknown>;
      if (!isSafeTestPath(file.file)) errors.push('FILE_PATH_UNSAFE');
      if (!isFiniteNonNegative(file.durationMs)) errors.push('FILE_DURATION_INVALID');
      if (!Number.isInteger(file.tests) || (file.tests as number) < 0) errors.push('FILE_TESTS_INVALID');
    }
  }
  if (!Array.isArray(document.slowestTests)) errors.push('SLOWEST_TESTS_MISSING');
  else {
    for (const entry of document.slowestTests) {
      if (entry === null || typeof entry !== 'object') { errors.push('TEST_ENTRY_INVALID'); continue; }
      const test = entry as Record<string, unknown>;
      if (!isSafeTestPath(test.file)) errors.push('TEST_FILE_PATH_UNSAFE');
      if (!isFiniteNonNegative(test.durationMs)) errors.push('TEST_DURATION_INVALID');
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Parse a persisted gate receipt into the timing-relevant projection. A group
 * without a finite `durationMs` is reported as unmeasured rather than zero so
 * a pre-telemetry receipt cannot be presented as instant.
 */
export function summarizeGateReceipt(value: unknown): GateReceiptSummary | null {
  if (value === null || typeof value !== 'object') return null;
  const receipt = value as Record<string, unknown>;
  if (receipt.schemaVersion !== QUALITY_GATE_RECEIPT_SCHEMA) return null;
  const groups: GateGroupDuration[] = [];
  const unmeasuredGroups: string[] = [];
  let measured = 0;
  for (const entry of Array.isArray(receipt.groups) ? receipt.groups : []) {
    if (entry === null || typeof entry !== 'object') continue;
    const group = entry as Record<string, unknown>;
    if (typeof group.id !== 'string' || group.id === '') continue;
    const duration = isFiniteNonNegative(group.durationMs) ? group.durationMs : null;
    if (duration === null) unmeasuredGroups.push(group.id);
    else measured += duration;
    const counts = group.counts !== null && typeof group.counts === 'object'
      ? Object.fromEntries(Object.entries(group.counts as Record<string, unknown>).map(([key, raw]) => [key, typeof raw === 'number' ? raw : null]))
      : null;
    groups.push({ id: group.id, status: typeof group.status === 'string' ? group.status : 'UNKNOWN', durationMs: duration, counts });
  }
  return {
    receiptDigest: typeof receipt.receiptDigest === 'string' ? receipt.receiptDigest : null,
    environmentClass: typeof receipt.environmentClass === 'string' ? receipt.environmentClass : 'UNKNOWN',
    gitHead: typeof receipt.gitHead === 'string' ? receipt.gitHead : null,
    finalResult: typeof receipt.finalResult === 'string' ? receipt.finalResult : 'UNKNOWN',
    groups,
    measuredDurationMs: measured,
    unmeasuredGroups,
  };
}

interface TimingLaneAccumulator {
  runs: number;
  files: number;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDurationMs: number;
  byFile: Map<string, ValidationTimingFileSummary>;
  testEntries: ValidationTimingTestSummary[];
}

/**
 * Aggregate validated timing documents into one report. Invalid documents are
 * refused with their filename recorded; they contribute nothing.
 */
export function aggregateTimingDocuments(input: {
  readonly generatedAt: string;
  readonly documents: readonly { readonly source: string; readonly value: unknown }[];
  readonly gateReceipts?: readonly GateReceiptSummary[];
  readonly top?: number;
}): ValidationTimingReport {
  const top = clampTop(input.top);
  const lanes = new Map<string, TimingLaneAccumulator>();
  const unreadable: string[] = [];
  for (const document of input.documents) {
    const validation = validateTimingDocument(document.value);
    if (!validation.ok) {
      unreadable.push(document.source);
      continue;
    }
    const timing = document.value as ValidationTimingDocument;
    let lane = lanes.get(timing.lane);
    if (lane === undefined) {
      lane = { runs: 0, files: 0, tests: 0, passed: 0, failed: 0, skipped: 0, totalDurationMs: 0, byFile: new Map<string, ValidationTimingFileSummary>(), testEntries: [] };
      lanes.set(timing.lane, lane);
    }
    lane.runs += 1;
    lane.files = Math.max(lane.files, timing.totals.files);
    lane.tests += timing.totals.tests;
    lane.passed += timing.totals.passed;
    lane.failed += timing.totals.failed;
    lane.skipped += timing.totals.skipped;
    lane.totalDurationMs += timing.durationMs;
    for (const file of timing.files) {
      const existing = lane.byFile.get(file.file) ?? { file: file.file, tests: 0, durationMs: 0 };
      lane.byFile.set(file.file, { file: file.file, tests: existing.tests + file.tests, durationMs: existing.durationMs + file.durationMs });
    }
    lane.testEntries.push(...timing.slowestTests);
  }
  const laneSummaries: TimingLaneSummary[] = [...lanes.entries()].map(([lane, value]) => ({
    lane,
    runs: value.runs,
    files: value.files,
    tests: value.tests,
    passed: value.passed,
    failed: value.failed,
    skipped: value.skipped,
    totalDurationMs: value.totalDurationMs,
    slowestFiles: [...value.byFile.values()].sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file)).slice(0, top),
    slowestTests: [...value.testEntries].sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file)).slice(0, top),
  })).sort((left, right) => right.totalDurationMs - left.totalDurationMs || left.lane.localeCompare(right.lane));
  const allFiles = new Map<string, ValidationTimingFileSummary>();
  const allTests: ValidationTimingTestSummary[] = [];
  for (const lane of laneSummaries) {
    for (const file of lane.slowestFiles) {
      const existing = allFiles.get(file.file) ?? { file: file.file, tests: 0, durationMs: 0 };
      allFiles.set(file.file, { file: file.file, tests: existing.tests + file.tests, durationMs: existing.durationMs + file.durationMs });
    }
    allTests.push(...lane.slowestTests);
  }
  return {
    schemaVersion: VALIDATION_TIMING_REPORT_SCHEMA,
    generatedAt: input.generatedAt,
    documentCount: input.documents.length - unreadable.length,
    lanes: laneSummaries,
    slowestFiles: [...allFiles.values()].sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file)).slice(0, top),
    slowestTests: allTests.sort((left, right) => right.durationMs - left.durationMs || left.file.localeCompare(right.file)).slice(0, top),
    gateReceipts: input.gateReceipts ?? [],
    unreadable,
  };
}

function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

/** Human summary. Never claims a duration that was not measured. */
export function renderTimingReport(report: ValidationTimingReport, options: { readonly top?: number } = {}): string {
  const top = clampTop(options.top);
  const lines: string[] = [];
  lines.push(`[test-timings] ${report.schemaVersion} generated=${report.generatedAt}`);
  lines.push(`[test-timings] documents=${report.documentCount} lanes=${report.lanes.length} gateReceipts=${report.gateReceipts.length}`);
  if (report.unreadable.length > 0) lines.push(`[test-timings] unreadable=${report.unreadable.length} ${report.unreadable.slice(0, 5).join(', ')}`);
  for (const lane of report.lanes) {
    lines.push(`[lane ${lane.lane}] runs=${lane.runs} files=${lane.files} tests=${lane.tests} passed=${lane.passed} failed=${lane.failed} skipped=${lane.skipped} wall=${formatSeconds(lane.totalDurationMs)}`);
  }
  lines.push(`[test-timings] slowest files (top ${top}):`);
  for (const file of report.slowestFiles.slice(0, top)) {
    lines.push(`  ${formatSeconds(file.durationMs).padStart(9)}  ${file.file} (${file.tests} tests)`);
  }
  lines.push(`[test-timings] slowest tests (top ${top}):`);
  for (const test of report.slowestTests.slice(0, top)) {
    lines.push(`  ${formatSeconds(test.durationMs).padStart(9)}  ${test.file} > ${test.title}`);
  }
  for (const receipt of report.gateReceipts) {
    lines.push(`[gate ${receipt.environmentClass}] result=${receipt.finalResult} head=${(receipt.gitHead ?? 'unknown').slice(0, 12)} measured=${formatSeconds(receipt.measuredDurationMs)}${receipt.unmeasuredGroups.length > 0 ? ` unmeasuredGroups=${receipt.unmeasuredGroups.join(',')}` : ''}`);
    for (const group of [...receipt.groups].sort((left, right) => (right.durationMs ?? -1) - (left.durationMs ?? -1))) {
      lines.push(`  ${group.durationMs === null ? 'unmeasured' : formatSeconds(group.durationMs).padStart(9)}  ${group.id} ${group.status}`);
    }
  }
  if (report.lanes.length === 0 && report.gateReceipts.length === 0) {
    lines.push('[test-timings] no timing evidence found; run a lane or pass --dir/--receipts');
  }
  return `${lines.join('\n')}\n`;
}
