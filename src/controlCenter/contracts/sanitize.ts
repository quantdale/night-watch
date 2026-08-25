// ---------------------------------------------------------------------------
// Control Center contract sanitizers.
//
// These functions intentionally accept `unknown` and construct each public
// object field-by-field. They are useful at adapter seams and in hostile-input
// tests: adding a private field to an internal record cannot make that field
// web-visible through object spreading.
// ---------------------------------------------------------------------------

import {
  asSafeControlCenterCode,
  asSafeControlCenterDigest,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterSha,
  asSafeControlCenterTimestamp,
  boundedInteger,
  isRecord,
} from './common';
import type { SafeControlCenterCode } from './common';
import type {
  ControlCenterFindingConfidence,
  ControlCenterFindingEvidenceLevel,
  ControlCenterFindingReproduction,
  ControlCenterFindingSeverity,
  ControlCenterFindingSummaryDto,
} from './findings';
import type {
  ControlCenterRunEnvironment,
  ControlCenterRunEventType,
  ControlCenterRunListItemDto,
  ControlCenterRunSeverity,
  ControlCenterRunStatus,
  ControlCenterTimelineEventDto,
} from './runs';

const MAX_COUNT = 1_000_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

const RUN_ENVIRONMENTS: readonly ControlCenterRunEnvironment[] = [
  'LOCAL_SYNTHETIC',
  'LOCAL',
  'DEV_RECORDED',
  'NEXT_RECORDED',
  'UNKNOWN',
];
const RUN_STATUSES: readonly ControlCenterRunStatus[] = [
  'PENDING',
  'RUNNING',
  'PASSED',
  'ORACLE_ONLY',
  'SAFETY_FAILURE',
  'FAILED',
  'BLOCKED',
  'INCOMPLETE',
  'SKIPPED',
];
const RUN_EVENT_TYPES: readonly ControlCenterRunEventType[] = [
  'start',
  'end',
  'env',
  'navigation',
  'request',
  'response',
  'console',
  'pageerror',
  'requestfailed',
  'policy',
  'telemetry',
  'optional-support',
  'browser-background',
  'oracle',
  'issue',
  'hard-failure',
  'screenshot',
  'stability',
  'download',
  'service-worker',
  'bootstrap',
  'journey',
  'journey-step',
];
const RUN_SEVERITIES: readonly ControlCenterRunSeverity[] = ['info', 'warn', 'error', 'fatal'];
const FINDING_SEVERITIES: readonly ControlCenterFindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
const FINDING_CONFIDENCES: readonly ControlCenterFindingConfidence[] = ['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'];
const FINDING_EVIDENCE_LEVELS: readonly ControlCenterFindingEvidenceLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const FINDING_REPRODUCTIONS: readonly ControlCenterFindingReproduction[] = [
  'REPRODUCED',
  'NOT_REPRODUCED',
  'BOUNDED',
  'INCOMPLETE',
  'UNKNOWN',
];

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : null;
}

function count(value: unknown): number | null {
  return boundedInteger(value, 0, MAX_COUNT);
}

function duration(value: unknown): number | null {
  return boundedInteger(value, 0, MAX_DURATION_MS);
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function safeCodeList(value: unknown): readonly SafeControlCenterCode[] {
  if (!Array.isArray(value)) return [];
  const values = value
    .map((item) => asSafeControlCenterCode(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function recordedEnvironment(value: unknown): ControlCenterRunEnvironment | null {
  if (value === 'DEV') return 'DEV_RECORDED';
  if (value === 'NEXT') return 'NEXT_RECORDED';
  return oneOf(value, RUN_ENVIRONMENTS);
}

/** Build a run-list item from an unknown internal record using an explicit allowlist. */
export function sanitizeRunListItem(value: unknown): ControlCenterRunListItemDto | null {
  if (!isRecord(value)) return null;
  const runId = asSafeControlCenterId(value.runId);
  const environment = recordedEnvironment(value.environment);
  const passed = booleanValue(value.passed);
  const eventCount = count(value.eventCount);
  const hardFailureCount = count(value.hardFailureCount);
  const oracleFindingCount = count(value.oracleFindingCount);
  if (runId === null || environment === null || passed === null || eventCount === null || hardFailureCount === null || oracleFindingCount === null) {
    return null;
  }
  const status = oneOf(value.status, RUN_STATUSES) ?? (passed ? 'PASSED' : 'FAILED');
  return {
    runId,
    environment,
    product: asSafeControlCenterLabel(value.product),
    browser: asSafeControlCenterLabel(value.browser),
    scenario: asSafeControlCenterLabel(value.scenario),
    startedAt: asSafeControlCenterTimestamp(value.startedAt),
    endedAt: asSafeControlCenterTimestamp(value.endedAt),
    durationMs: duration(value.durationMs),
    status,
    passed,
    eventCount,
    hardFailureCount,
    oracleFindingCount,
    nightwatchSha: asSafeControlCenterSha(value.nightwatchSha),
  };
}

/** Build a timeline event with categorical message/data codes only. */
export function sanitizeTimelineEvent(value: unknown): ControlCenterTimelineEventDto | null {
  if (!isRecord(value)) return null;
  const seq = boundedInteger(value.seq, 0, 2_147_483_647);
  const eventType = oneOf(value.eventType ?? value.type, RUN_EVENT_TYPES);
  const severity = oneOf(value.severity, RUN_SEVERITIES);
  const messageCode = asSafeControlCenterCode(value.messageCode);
  if (seq === null || eventType === null || severity === null || messageCode === null) return null;
  return {
    seq,
    timestamp: asSafeControlCenterTimestamp(value.timestamp ?? value.ts),
    eventType,
    severity,
    messageCode,
    dataCodes: safeCodeList(value.dataCodes),
  };
}

/** Build the deliberately metadata-only finding row. */
export function sanitizeFindingSummary(value: unknown): ControlCenterFindingSummaryDto | null {
  if (!isRecord(value)) return null;
  const findingId = asSafeControlCenterId(value.findingId);
  const severity = oneOf(value.severity, FINDING_SEVERITIES);
  const confidence = oneOf(value.confidence, FINDING_CONFIDENCES);
  const evidenceLevel = oneOf(value.evidenceLevel, FINDING_EVIDENCE_LEVELS);
  const reproduction = oneOf(value.reproduction, FINDING_REPRODUCTIONS);
  const reproductionCount = count(value.reproductionCount);
  const minimized = booleanValue(value.minimized);
  const categoryCode = asSafeControlCenterCode(value.categoryCode);
  const currentness = oneOf(value.sourceCurrentness, ['CURRENT', 'SOURCE_STALE', 'SOURCE_UNAVAILABLE'] as const);
  const dossierStatus = oneOf(value.dossierStatus, ['READY', 'INCOMPLETE', 'UNAVAILABLE', 'UNKNOWN'] as const);
  if (
    findingId === null ||
    severity === null ||
    confidence === null ||
    evidenceLevel === null ||
    reproduction === null ||
    reproductionCount === null ||
    minimized === null ||
    categoryCode === null ||
    currentness === null ||
    dossierStatus === null
  ) {
    return null;
  }
  return {
    findingId,
    fingerprint: asSafeControlCenterDigest(value.fingerprint),
    clusterId: asSafeControlCenterId(value.clusterId),
    title: asSafeControlCenterLabel(value.title),
    product: asSafeControlCenterLabel(value.product),
    surface: asSafeControlCenterLabel(value.surface),
    severity,
    confidence,
    evidenceLevel,
    reproduction,
    reproductionCount,
    minimized,
    sourceCurrentness: currentness,
    dossierStatus,
    firstObservedAt: asSafeControlCenterTimestamp(value.firstObservedAt),
    lastObservedAt: asSafeControlCenterTimestamp(value.lastObservedAt),
    categoryCode,
    provenanceDigest: asSafeControlCenterDigest(value.provenanceDigest),
  };
}
