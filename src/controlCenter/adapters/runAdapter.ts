import type { RunEvent, RepoSnapshotRecord, RunSummary } from '../../core/evidence/types';
import {
  asSafeControlCenterCode,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterSha,
  asSafeControlCenterTimestamp,
  boundedSequence,
  boundedTimelineLimit,
} from '../contracts/common';
import type { SafeControlCenterCode } from '../contracts/common';
import type {
  ControlCenterRunDetailDto,
  ControlCenterRunEnvironment,
  ControlCenterRunEventType,
  ControlCenterRunListDto,
  ControlCenterRunListItemDto,
  ControlCenterRunSeverity,
  ControlCenterRunStatus,
  ControlCenterRepositorySnapshotDto,
  ControlCenterTimelineDto,
} from '../contracts/runs';
import {
  CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION,
  CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION,
  CONTROL_CENTER_TIMELINE_SCHEMA_VERSION,
} from '../contracts/runs';
import { boundedCollection, boundedCount, boundedDuration, safePublicId, sortedUniqueCodes } from './common';

const EVENT_TYPES: readonly ControlCenterRunEventType[] = [
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
const SEVERITIES: readonly ControlCenterRunSeverity[] = ['info', 'warn', 'error', 'fatal'];
const KNOWN_FAILURE_CODES = new Set([
  'OWNER_POLICY_BLOCKED',
  'POLICY_BLOCKED',
  'SAFETY_FAILURE',
  'EXECUTOR_FAILURE',
  'HARD_FAILURE',
]);
const ALLOWED_DATA_CODES = new Set([
  'ROUTE_CLASS',
  'STATUS_CLASS',
  'CONTENT_TYPE_CLASS',
  'POLICY_CODE',
  'ORACLE_CODE',
  'REASON_CODE',
  'SCENARIO_CLASS',
  'JOURNEY_CLASS',
]);

export interface RunAuthorityInput {
  readonly summary: RunSummary;
  readonly events?: readonly RunEvent[];
  readonly repositories?: readonly RepoSnapshotRecord[];
}

function countFrom(summary: RunSummary, key: string): number {
  return boundedCount(summary.counts[key]);
}

function severityCountFrom(summary: RunSummary, key: string): number {
  return boundedCount(summary.severityCounts[key]);
}

function environment(value: string): ControlCenterRunEnvironment {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'LOCAL_SYNTHETIC') return 'LOCAL_SYNTHETIC';
  if (normalized === 'LOCAL') return 'LOCAL';
  if (normalized === 'DEV') return 'DEV_RECORDED';
  if (normalized === 'NEXT') return 'NEXT_RECORDED';
  return 'UNKNOWN';
}

function hasValidLifecycle(summary: RunSummary): boolean {
  return asSafeControlCenterTimestamp(summary.startedAt) !== null && asSafeControlCenterTimestamp(summary.endedAt) !== null;
}

/** Presentation classification only; it does not replace the run authority. */
export function classifyRunStatus(summary: RunSummary): ControlCenterRunStatus {
  if (summary.eventCount <= 0 || !hasValidLifecycle(summary)) return 'INCOMPLETE';
  const issueCount = countFrom(summary, 'issue');
  if (summary.hardFailures.some((failure) => KNOWN_FAILURE_CODES.has(failure.reason))) {
    if (summary.hardFailures.some((failure) => failure.reason === 'OWNER_POLICY_BLOCKED')) return 'BLOCKED';
    return 'SAFETY_FAILURE';
  }
  if (summary.hardFailures.length > 0) return 'FAILED';
  if (issueCount > 0) return 'ORACLE_ONLY';
  return summary.passed ? 'PASSED' : 'FAILED';
}

function eventCode(event: RunEvent): ReturnType<typeof asSafeControlCenterCode> {
  const code = `EVENT_${event.type.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  return asSafeControlCenterCode(code) ?? asSafeControlCenterCode('EVENT_UNKNOWN')!;
}

function dataCodes(event: RunEvent): readonly SafeControlCenterCode[] {
  const values = Object.keys(event.data ?? {})
    .map((key) => key.toUpperCase().replace(/[^A-Z0-9]+/g, '_'))
    .filter((key) => ALLOWED_DATA_CODES.has(key))
    .map((key) => asSafeControlCenterCode(key))
    .filter((value): value is NonNullable<typeof value> => value !== null);
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function runItem(input: RunAuthorityInput): ControlCenterRunListItemDto {
  const summary = input.summary;
  return {
    runId: safePublicId(summary.runId, 'cc-run'),
    environment: environment(summary.environment),
    product: asSafeControlCenterLabel(summary.product),
    browser: asSafeControlCenterLabel(summary.browser),
    scenario: asSafeControlCenterLabel(summary.scenario),
    startedAt: asSafeControlCenterTimestamp(summary.startedAt),
    endedAt: asSafeControlCenterTimestamp(summary.endedAt),
    durationMs: boundedDuration(summary.durationMs),
    status: classifyRunStatus(summary),
    passed: summary.passed,
    eventCount: boundedCount(summary.eventCount),
    hardFailureCount: boundedCount(summary.hardFailures.length),
    oracleFindingCount: countFrom(summary, 'issue'),
    nightwatchSha: asSafeControlCenterSha(summary.nightwatchSha),
  };
}

function eventCounts(summary: RunSummary): readonly { readonly eventType: ControlCenterRunEventType; readonly count: number }[] {
  return EVENT_TYPES
    .map((eventType) => ({ eventType, count: countFrom(summary, eventType) }))
    .filter((entry) => entry.count > 0);
}

function severityCounts(summary: RunSummary): readonly { readonly severity: ControlCenterRunSeverity; readonly count: number }[] {
  return SEVERITIES
    .map((severity) => ({ severity, count: severityCountFrom(summary, severity) }))
    .filter((entry) => entry.count > 0);
}

function failureCodes(summary: RunSummary): readonly SafeControlCenterCode[] {
  const codes = summary.hardFailures.map((failure) =>
    KNOWN_FAILURE_CODES.has(failure.reason) ? asSafeControlCenterCode(failure.reason) : asSafeControlCenterCode('RUN_FAILURE_UNCLASSIFIED'),
  ).filter((value): value is NonNullable<typeof value> => value !== null);
  return [...new Set(codes)].sort((left, right) => left.localeCompare(right));
}

function repositorySnapshots(records: readonly RepoSnapshotRecord[]): readonly ControlCenterRepositorySnapshotDto[] {
  return records.map((record, index) => ({
    repositoryId: safePublicId(`repository-${index + 1}`, 'cc-repository'),
    branch: asSafeControlCenterLabel(record.branch),
    headSha: asSafeControlCenterSha(record.headSha),
    upstream: asSafeControlCenterLabel(record.upstream),
    ahead: record.aheadBehind === null ? null : boundedCount(record.aheadBehind.ahead),
    behind: record.aheadBehind === null ? null : boundedCount(record.aheadBehind.behind),
    dirty: record.dirty,
    dirtyFileCount: boundedCount(record.dirtyFileCount),
    lastCommitAt: asSafeControlCenterTimestamp(record.lastCommit),
    capturedAt: asSafeControlCenterTimestamp(record.timestamp),
    state: record.ok ? 'OK' : record.error === undefined ? 'UNKNOWN' : 'UNAVAILABLE',
    errorCode: record.error === undefined ? null : asSafeControlCenterCode('REPOSITORY_SNAPSHOT_UNAVAILABLE'),
  }));
}

export function projectRunList(inputs: readonly RunAuthorityInput[], requestedLimit?: unknown): ControlCenterRunListDto {
  const rows = inputs
    .map(runItem)
    .sort((left, right) => left.runId.localeCompare(right.runId));
  const collection = boundedCollection(rows, requestedLimit);
  return {
    schemaVersion: CONTROL_CENTER_RUN_LIST_SCHEMA_VERSION,
    ...collection,
  };
}

export function projectRunDetail(input: RunAuthorityInput): ControlCenterRunDetailDto {
  const summary = input.summary;
  return {
    schemaVersion: CONTROL_CENTER_RUN_DETAIL_SCHEMA_VERSION,
    run: runItem(input),
    repositories: repositorySnapshots(input.repositories ?? []),
    countsByEventType: eventCounts(summary),
    countsBySeverity: severityCounts(summary),
    screenshotCount: countFrom(summary, 'screenshot'),
    hardFailureCodes: failureCodes(summary),
    noteCodes: summary.notes === undefined || summary.notes.length === 0 ? [] : [asSafeControlCenterCode('RUN_NOTE_PRESENT')!],
    proxy: summary.proxy === undefined ? null : {
      allowed: boundedCount(summary.proxy.allowed),
      telemetryBlocked: boundedCount(summary.proxy.telemetryBlocked),
      optionalSupportBlocked: boundedCount(summary.proxy.optionalSupportBlocked),
      browserBackgroundBlocked: boundedCount(summary.proxy.browserBackgroundBlocked),
      denied: boundedCount(summary.proxy.denied),
      unknown: boundedCount(summary.proxy.unknown),
      violations: boundedCount(summary.proxy.violations),
    },
  };
}

export function projectTimeline(input: RunAuthorityInput, requestedAfterSeq: unknown = 0, requestedLimit?: unknown): ControlCenterTimelineDto {
  const runId = safePublicId(input.summary.runId, 'cc-run');
  const afterSeq = boundedSequence(requestedAfterSeq) ?? 0;
  const limit = boundedTimelineLimit(requestedLimit) ?? 100;
  const events = [...(input.events ?? [])].sort((left, right) => left.seq - right.seq);
  const projected = events
    .filter((event) => event.seq > afterSeq)
    .map((event) => ({
      seq: event.seq,
      timestamp: asSafeControlCenterTimestamp(event.ts),
      eventType: event.type,
      severity: event.severity,
      messageCode: eventCode(event)!,
      dataCodes: dataCodes(event),
    }))
    .filter((event) => event.seq <= 2_147_483_647)
    .slice(0, limit);
  const remaining = events.some((event) => event.seq > (projected[projected.length - 1]?.seq ?? afterSeq));
  return {
    schemaVersion: CONTROL_CENTER_TIMELINE_SCHEMA_VERSION,
    runId,
    afterSeq,
    events: projected,
    nextAfterSeq: remaining ? (projected[projected.length - 1]?.seq ?? afterSeq) : null,
    truncated: remaining,
  };
}

export function publicFailureCodes(summary: RunSummary): readonly SafeControlCenterCode[] {
  return sortedUniqueCodes(failureCodes(summary));
}
