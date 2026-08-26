// ---------------------------------------------------------------------------
// Nightwatch Control Center — bounded local run-evidence reader.
//
// RunRecorder is the producer of repository-owned artifacts/<run-id>/ records.
// This module is the only Control Center boundary for those records. It reads
// a fixed root, follows no symlink, retries one changing file once, validates
// the typed evidence shape, and returns only the fields consumed by the V1
// projections. Event messages, arbitrary event data, screenshots, network
// bodies, console bodies, and manifest extensions never cross this boundary.
//
// The test-only constructor is deliberately named and separate from the
// normal constructor. The HTTP server does not accept a filesystem root.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { prefixedDigest24 } from '../../core/identity/canonicalDigest';
import { containsPrivatePayloadShape } from '../../core/policy/privateScreening';
import type { RepoSnapshotRecord, RunEvent, RunEventType, RunSeverity, RunSummary } from '../../core/evidence/types';
import type { RunAuthorityInput } from '../adapters/runAdapter';
import { isRecord } from '../contracts/common';

export const DEFAULT_RUN_EVIDENCE_ROOT = path.join(path.resolve(__dirname, '..', '..', '..'), 'artifacts');

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const RELATIVE_PATH_PATTERN = /^[^/\\][^\\]*$/;
const MAX_RUNS = 256;
const MAX_EVENTS = 25_000;
const MAX_EVENT_TEXT_LENGTH = 64 * 1024;
const MAX_SUMMARY_BYTES = 512 * 1024;
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_EVENTS_BYTES = 16 * 1024 * 1024;
const MAX_REPOSITORIES_BYTES = 2 * 1024 * 1024;
const MAX_REPOSITORIES = 128;
const MAX_COUNT = 1_000_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

const EVENT_TYPES: readonly RunEventType[] = [
  'start', 'end', 'env', 'navigation', 'request', 'response', 'console',
  'pageerror', 'requestfailed', 'policy', 'telemetry', 'optional-support',
  'browser-background', 'oracle', 'issue', 'hard-failure', 'screenshot',
  'stability', 'download', 'service-worker', 'bootstrap', 'journey',
  'journey-step',
];
const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);
const SEVERITIES: readonly RunSeverity[] = ['info', 'warn', 'error', 'fatal'];
const SEVERITY_SET = new Set<string>(SEVERITIES);
const ALLOWED_EVENT_DATA_KEYS = new Set([
  'ROUTE_CLASS',
  'STATUS_CLASS',
  'CONTENT_TYPE_CLASS',
  'POLICY_CODE',
  'ORACLE_CODE',
  'REASON_CODE',
  'SCENARIO_CLASS',
  'JOURNEY_CLASS',
]);
const KNOWN_FAILURE_REASONS = new Set([
  'OWNER_POLICY_BLOCKED',
  'POLICY_BLOCKED',
  'SAFETY_FAILURE',
  'EXECUTOR_FAILURE',
  'HARD_FAILURE',
]);

const RUN_COUNT_KEYS = new Set(EVENT_TYPES);
const SEVERITY_COUNT_KEYS = new Set(SEVERITIES);

export type RunEvidenceState = 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'UNKNOWN';

export type RunEvidenceReasonCode =
  | 'RUN_EVIDENCE_ROOT_UNAVAILABLE'
  | 'RUN_EVIDENCE_ROOT_UNSAFE'
  | 'RUN_EVIDENCE_EMPTY'
  | 'RUN_EVIDENCE_PARTIAL_CORRUPTION'
  | 'RUN_EVIDENCE_PRIVACY_BLOCKED'
  | 'RUN_EVIDENCE_SCHEMA_INVALID'
  | 'RUN_EVIDENCE_RECORD_UNSTABLE'
  | 'RUN_EVIDENCE_RECORD_OVERSIZED'
  | 'RUN_EVIDENCE_PATH_UNSAFE'
  | 'RUN_EVIDENCE_DUPLICATE_SEQUENCE';

export interface RunEvidenceSnapshot {
  readonly state: RunEvidenceState;
  readonly records: readonly RunAuthorityInput[];
  readonly generation: string | null;
  readonly reasonCodes: readonly RunEvidenceReasonCode[];
}

export interface RunEvidenceReader {
  readonly snapshot: () => RunEvidenceSnapshot;
  readonly find: (runId: string) => RunAuthorityInput | null;
}

type FileReadResult =
  | { readonly kind: 'OK'; readonly text: string }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'UNAVAILABLE' }
  | { readonly kind: 'UNSAFE' }
  | { readonly kind: 'OVERSIZED' }
  | { readonly kind: 'UNSTABLE' };

type JsonReadResult =
  | { readonly kind: 'OK'; readonly value: unknown }
  | { readonly kind: 'MISSING' }
  | { readonly kind: 'UNAVAILABLE' }
  | { readonly kind: 'UNSAFE' }
  | { readonly kind: 'OVERSIZED' }
  | { readonly kind: 'UNSTABLE' }
  | { readonly kind: 'PRIVACY' }
  | { readonly kind: 'MALFORMED' };

interface SafeManifest {
  readonly runId: string;
  readonly timestamp: string;
  readonly environment: string;
  readonly product: string;
  readonly browser: string;
  readonly scenario: string;
  readonly nightwatchSha: string | null;
}

type SafeRunRead =
  | { readonly kind: 'OK'; readonly input: RunAuthorityInput }
  | { readonly kind: 'REJECTED'; readonly reason: RunEvidenceReasonCode };

function isSafeInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function isSafeString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum && !value.includes('\0');
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && ISO_TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function metadataLabel(value: unknown): string {
  if (!isSafeString(value, 160)) return 'UNKNOWN';
  return /^[A-Za-z0-9][A-Za-z0-9 ._:/@+(){}\[\]-]{0,159}$/.test(value) ? value : 'UNKNOWN';
}

function safeSha(value: unknown): string | null {
  return typeof value === 'string' && SHA_PATTERN.test(value) ? value : null;
}

function isRunEventType(value: unknown): value is RunEventType {
  return typeof value === 'string' && EVENT_TYPE_SET.has(value);
}

function isSeverity(value: unknown): value is RunSeverity {
  return typeof value === 'string' && SEVERITY_SET.has(value);
}

function pathInside(candidate: string, parent: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedParent = path.resolve(parent);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(`${resolvedParent}${path.sep}`);
}

function noSymlinkComponents(target: string): boolean {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const component of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function statSignature(stat: fs.Stats): string {
  return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
}

function readStableFile(root: string, file: string, maximumBytes: number): FileReadResult {
  if (!pathInside(file, root) || !noSymlinkComponents(root) || !noSymlinkComponents(file)) return { kind: 'UNSAFE' };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let before: fs.Stats;
    try {
      before = fs.lstatSync(file);
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT' ? { kind: 'MISSING' } : { kind: 'UNAVAILABLE' };
    }
    if (before.isSymbolicLink() || !before.isFile()) return { kind: 'UNSAFE' };
    if (before.size > maximumBytes) return { kind: 'OVERSIZED' };

    let descriptor: number | null = null;
    let changed = false;
    let result: FileReadResult | null = null;
    try {
      const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
      descriptor = fs.openSync(file, flags);
      const opened = fs.fstatSync(descriptor);
      if (!opened.isFile() || opened.size > maximumBytes) {
        result = opened.size > maximumBytes ? { kind: 'OVERSIZED' } : { kind: 'UNSAFE' };
      } else {
        const text = fs.readFileSync(descriptor, { encoding: 'utf8' });
        const after = fs.fstatSync(descriptor);
        changed = statSignature(opened) !== statSignature(after) || statSignature(before) !== statSignature(opened);
        if (!changed) result = { kind: 'OK', text };
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      result = code === 'ELOOP' ? { kind: 'UNSAFE' } : { kind: 'UNAVAILABLE' };
    } finally {
      if (descriptor !== null) {
        try { fs.closeSync(descriptor); } catch { /* read failure already fails closed */ }
      }
    }
    if (result !== null && !changed) return result;
  }
  return { kind: 'UNSTABLE' };
}

function readJson(root: string, file: string, maximumBytes: number): JsonReadResult {
  const text = readStableFile(root, file, maximumBytes);
  if (text.kind !== 'OK') return text;
  if (containsPrivatePayloadShape(text.text)) return { kind: 'PRIVACY' };
  if (text.text.includes('\0')) return { kind: 'MALFORMED' };
  try {
    return { kind: 'OK', value: JSON.parse(text.text) as unknown };
  } catch {
    return { kind: 'MALFORMED' };
  }
}

function safeCounts(value: unknown, allowed: ReadonlySet<string>): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (!allowed.has(key) || !isSafeInteger(count, 0, MAX_COUNT)) return null;
    result[key] = count;
  }
  return result;
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

function safeReason(value: unknown): string {
  if (typeof value === 'string' && KNOWN_FAILURE_REASONS.has(value)) return value;
  return 'RUN_FAILURE_UNCLASSIFIED';
}

function parseManifest(value: unknown, runId: string): SafeManifest | null {
  if (!isRecord(value)) return null;
  if (value.runId !== runId || !isTimestamp(value.timestamp)) return null;
  if (!isSafeString(value.environment, 160) || !isSafeString(value.product, 160)
    || !isSafeString(value.browser, 160) || !isSafeString(value.scenario, 160)) return null;
  return {
    runId,
    timestamp: value.timestamp,
    environment: metadataLabel(value.environment),
    product: metadataLabel(value.product),
    browser: metadataLabel(value.browser),
    scenario: metadataLabel(value.scenario),
    nightwatchSha: safeSha(value.nightwatchSha),
  };
}

function parseProxy(value: unknown): RunSummary['proxy'] | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const keys = ['allowed', 'telemetryBlocked', 'optionalSupportBlocked', 'browserBackgroundBlocked', 'denied', 'unknown', 'violations'] as const;
  const result = {} as NonNullable<RunSummary['proxy']>;
  for (const key of keys) {
    if (!isSafeInteger(value[key], 0, MAX_COUNT)) return null;
    result[key] = value[key];
  }
  return result;
}

function parseSummary(value: unknown, manifest: SafeManifest): RunSummary | null {
  if (!isRecord(value)) return null;
  if (value.runId !== manifest.runId || !isSafeString(value.environment, 160)
    || !isSafeString(value.product, 160) || !isSafeString(value.browser, 160)
    || !isSafeString(value.scenario, 160) || !isTimestamp(value.startedAt)
    || !isTimestamp(value.endedAt) || !isSafeInteger(value.durationMs, 0, MAX_DURATION_MS)
    || typeof value.passed !== 'boolean' || !isSafeInteger(value.eventCount, 0, MAX_EVENTS)) return null;
  if (metadataLabel(value.environment) !== manifest.environment
    || metadataLabel(value.product) !== manifest.product
    || metadataLabel(value.browser) !== manifest.browser
    || metadataLabel(value.scenario) !== manifest.scenario) return null;
  const counts = safeCounts(value.counts, RUN_COUNT_KEYS);
  const severityCounts = safeCounts(value.severityCounts, SEVERITY_COUNT_KEYS);
  if (counts === null || severityCounts === null || sumCounts(counts) !== value.eventCount || sumCounts(severityCounts) !== value.eventCount) return null;
  if (!Array.isArray(value.hardFailures) || value.hardFailures.length > MAX_EVENTS) return null;
  const hardFailures: RunSummary['hardFailures'] = [];
  for (const failure of value.hardFailures) {
    if (!isRecord(failure) || !isTimestamp(failure.ts) || !isSafeString(failure.message, MAX_EVENT_TEXT_LENGTH) || !isSafeString(failure.reason, MAX_EVENT_TEXT_LENGTH)) return null;
    hardFailures.push({ ts: failure.ts, message: '[REDACTED_HARD_FAILURE]', reason: safeReason(failure.reason) });
  }
  if (hardFailures.length !== (counts['hard-failure'] ?? 0)) return null;
  if (!Array.isArray(value.screenshots) || value.screenshots.length > MAX_EVENTS || value.screenshots.some((item) => !isSafeString(item, 512))) return null;
  if (value.notes !== undefined && (!Array.isArray(value.notes) || value.notes.length > MAX_EVENTS || value.notes.some((item) => !isSafeString(item, MAX_EVENT_TEXT_LENGTH)))) return null;
  const proxy = parseProxy(value.proxy);
  if (proxy === null) return null;
  const summarySha = safeSha(value.nightwatchSha);
  if (summarySha !== null && manifest.nightwatchSha !== null && summarySha !== manifest.nightwatchSha) return null;
  const environment = metadataLabel(value.environment);
  const product = metadataLabel(value.product);
  const browser = metadataLabel(value.browser);
  const scenario = metadataLabel(value.scenario);
  return {
    runId: manifest.runId,
    environment,
    product,
    browser,
    scenario,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    durationMs: value.durationMs,
    passed: value.passed,
    eventCount: value.eventCount,
    counts,
    severityCounts,
    hardFailures,
    screenshots: [],
    nightwatchSha: summarySha ?? manifest.nightwatchSha,
    ...(proxy === undefined ? {} : { proxy }),
    ...(value.notes === undefined || value.notes.length === 0 ? {} : { notes: ['RUN_NOTE_PRESENT'] }),
  };
}

function safeEventData(value: unknown): Record<string, unknown> | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const normalized = key.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (ALLOWED_EVENT_DATA_KEYS.has(normalized)) data[normalized] = true;
  }
  return Object.keys(data).length === 0 ? undefined : data;
}

type ParsedEvents =
  | { readonly kind: 'OK'; readonly events: readonly RunEvent[] }
  | { readonly kind: 'REJECTED'; readonly reason: 'SCHEMA' | 'DUPLICATE_SEQUENCE' };

function parseEventsText(text: string): ParsedEvents {
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length > MAX_EVENTS || lines.some((line) => line.length === 0 || line.length > MAX_EVENT_TEXT_LENGTH)) return { kind: 'REJECTED', reason: 'SCHEMA' };
  const events: RunEvent[] = [];
  let previousSeq = -1;
  for (const line of lines) {
    let value: unknown;
    try { value = JSON.parse(line) as unknown; } catch { return { kind: 'REJECTED', reason: 'SCHEMA' }; }
    if (!isRecord(value) || !isSafeInteger(value.seq, 0, 2_147_483_647)) return { kind: 'REJECTED', reason: 'SCHEMA' };
    if (value.seq <= previousSeq) return { kind: 'REJECTED', reason: 'DUPLICATE_SEQUENCE' };
    if (!isTimestamp(value.ts) || !isRunEventType(value.type) || !isSeverity(value.severity)
      || !isSafeString(value.message, MAX_EVENT_TEXT_LENGTH)) return { kind: 'REJECTED', reason: 'SCHEMA' };
    const data = safeEventData(value.data);
    if (data === null) return { kind: 'REJECTED', reason: 'SCHEMA' };
    events.push({
      seq: value.seq,
      ts: value.ts,
      type: value.type,
      severity: value.severity,
      message: '[REDACTED_EVENT_MESSAGE]',
      ...(data === undefined ? {} : { data }),
    });
    previousSeq = value.seq;
  }
  return { kind: 'OK', events };
}

function countsFromEvents(events: readonly RunEvent[]): { counts: Record<string, number>; severityCounts: Record<string, number> } {
  const counts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
    severityCounts[event.severity] = (severityCounts[event.severity] ?? 0) + 1;
  }
  return { counts, severityCounts };
}

function incompleteSummary(manifest: SafeManifest, events: readonly RunEvent[]): RunSummary {
  const counts = countsFromEvents(events);
  const hardFailures: RunSummary['hardFailures'] = events
    .filter((event) => event.type === 'hard-failure')
    .map((event) => ({ ts: event.ts, message: '[REDACTED_HARD_FAILURE]', reason: 'RUN_FAILURE_UNCLASSIFIED' }));
  const endedAt = events[events.length - 1]?.ts ?? manifest.timestamp;
  return {
    runId: manifest.runId,
    environment: manifest.environment,
    product: manifest.product,
    browser: manifest.browser,
    scenario: manifest.scenario,
    startedAt: manifest.timestamp,
    endedAt,
    durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(manifest.timestamp)),
    passed: false,
    eventCount: events.length,
    counts: counts.counts,
    severityCounts: counts.severityCounts,
    hardFailures,
    screenshots: [],
    nightwatchSha: manifest.nightwatchSha,
  };
}

function parseRelativePath(value: unknown): boolean {
  if (!isSafeString(value, 512) || !RELATIVE_PATH_PATTERN.test(value)) return false;
  const parts = value.split('/');
  return parts.length > 0 && parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
}

function parseRepositories(value: unknown): readonly RepoSnapshotRecord[] | null {
  if (!Array.isArray(value) || value.length > MAX_REPOSITORIES) return null;
  const records: RepoSnapshotRecord[] = [];
  for (const [index, item] of value.entries()) {
    const aheadBehind = isRecord(item) ? item.aheadBehind : undefined;
    if (!isRecord(item) || !parseRelativePath(item.path) || !isSafeString(item.branch, 160)
      || !isSafeString(item.headSha, 160) || !(item.upstream === null || isSafeString(item.upstream, 160))
      || !(aheadBehind === null || (isRecord(aheadBehind)
        && isSafeInteger(aheadBehind.ahead, 0, MAX_COUNT)
        && isSafeInteger(aheadBehind.behind, 0, MAX_COUNT)))
      || typeof item.dirty !== 'boolean' || !isSafeInteger(item.dirtyFileCount, 0, MAX_COUNT)
      || !isTimestamp(item.lastCommit) || !isTimestamp(item.timestamp) || typeof item.ok !== 'boolean') return null;
    const boundedAheadBehind = aheadBehind === null ? null : {
      ahead: (aheadBehind as Record<string, unknown>).ahead as number,
      behind: (aheadBehind as Record<string, unknown>).behind as number,
    };
    records.push({
      path: `repository-${index + 1}`,
      branch: metadataLabel(item.branch),
      headSha: safeSha(item.headSha) ?? '',
      upstream: item.upstream === null ? null : metadataLabel(item.upstream),
      aheadBehind: boundedAheadBehind,
      dirty: item.dirty,
      dirtyFileCount: item.dirtyFileCount,
      lastCommit: item.lastCommit,
      timestamp: item.timestamp,
      ok: item.ok,
      ...(item.error === undefined ? {} : { error: 'REPOSITORY_SNAPSHOT_UNAVAILABLE' }),
    });
  }
  return records;
}

function recordsAgreeWithSummary(summary: RunSummary, events: readonly RunEvent[]): boolean {
  if (summary.eventCount !== events.length) return false;
  const actual = countsFromEvents(events);
  for (const type of EVENT_TYPES) if ((summary.counts[type] ?? 0) !== (actual.counts[type] ?? 0)) return false;
  for (const severity of SEVERITIES) if ((summary.severityCounts[severity] ?? 0) !== (actual.severityCounts[severity] ?? 0)) return false;
  return summary.hardFailures.length === events.filter((event) => event.type === 'hard-failure').length;
}

function reasonForJsonFailure(result: JsonReadResult): RunEvidenceReasonCode {
  if (result.kind === 'PRIVACY') return 'RUN_EVIDENCE_PRIVACY_BLOCKED';
  if (result.kind === 'OVERSIZED') return 'RUN_EVIDENCE_RECORD_OVERSIZED';
  if (result.kind === 'UNSTABLE') return 'RUN_EVIDENCE_RECORD_UNSTABLE';
  if (result.kind === 'UNSAFE') return 'RUN_EVIDENCE_PATH_UNSAFE';
  return 'RUN_EVIDENCE_SCHEMA_INVALID';
}

function reasonForFileFailure(result: FileReadResult): RunEvidenceReasonCode {
  if (result.kind === 'OVERSIZED') return 'RUN_EVIDENCE_RECORD_OVERSIZED';
  if (result.kind === 'UNSTABLE') return 'RUN_EVIDENCE_RECORD_UNSTABLE';
  if (result.kind === 'UNSAFE') return 'RUN_EVIDENCE_PATH_UNSAFE';
  return 'RUN_EVIDENCE_SCHEMA_INVALID';
}

function readOneRun(root: string, runId: string): SafeRunRead {
  if (!RUN_ID_PATTERN.test(runId)) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_PATH_UNSAFE' };
  const runDirectory = path.join(root, runId);
  if (!pathInside(runDirectory, root) || !noSymlinkComponents(runDirectory)) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_PATH_UNSAFE' };
  const manifestFile = readJson(root, path.join(runDirectory, 'manifest.json'), MAX_MANIFEST_BYTES);
  if (manifestFile.kind !== 'OK') return { kind: 'REJECTED', reason: reasonForJsonFailure(manifestFile) };
  const manifest = parseManifest(manifestFile.value, runId);
  if (manifest === null) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };

  const summaryFile = readJson(root, path.join(runDirectory, 'summary.json'), MAX_SUMMARY_BYTES);
  if (summaryFile.kind !== 'OK' && summaryFile.kind !== 'MISSING') return { kind: 'REJECTED', reason: reasonForJsonFailure(summaryFile) };
  const eventFile = readStableFile(root, path.join(runDirectory, 'events.jsonl'), MAX_EVENTS_BYTES);
  if (eventFile.kind !== 'OK' && eventFile.kind !== 'MISSING') return { kind: 'REJECTED', reason: reasonForFileFailure(eventFile) };
  if (eventFile.kind === 'MISSING') {
    if (summaryFile.kind === 'OK') {
      const parsedSummary = parseSummary(summaryFile.value, manifest);
      if (parsedSummary === null) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };
      if (parsedSummary.eventCount !== 0) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };
    }
  }
  const parsedEvents = eventFile.kind === 'MISSING'
    ? { kind: 'OK' as const, events: [] as readonly RunEvent[] }
    : containsPrivatePayloadShape(eventFile.text)
      ? { kind: 'REJECTED' as const, reason: 'PRIVACY' as const }
      : parseEventsText(eventFile.text);
  if (parsedEvents.kind === 'REJECTED') {
    return {
      kind: 'REJECTED',
      reason: parsedEvents.reason === 'PRIVACY'
        ? 'RUN_EVIDENCE_PRIVACY_BLOCKED'
        : parsedEvents.reason === 'DUPLICATE_SEQUENCE'
          ? 'RUN_EVIDENCE_DUPLICATE_SEQUENCE'
          : 'RUN_EVIDENCE_SCHEMA_INVALID',
    };
  }
  const events = parsedEvents.events;

  const summary = summaryFile.kind === 'OK' ? parseSummary(summaryFile.value, manifest) : summaryFile.kind === 'MISSING' ? incompleteSummary(manifest, events) : null;
  if (summary === null || !recordsAgreeWithSummary(summary, events)) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };
  if (summaryFile.kind === 'MISSING' && eventFile.kind === 'MISSING' && summary.eventCount !== 0) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };

  const repositoriesFile = readJson(root, path.join(runDirectory, 'repositories.json'), MAX_REPOSITORIES_BYTES);
  if (repositoriesFile.kind !== 'OK' && repositoriesFile.kind !== 'MISSING') return { kind: 'REJECTED', reason: reasonForJsonFailure(repositoriesFile) };
  const repositories = repositoriesFile.kind === 'MISSING' ? [] : repositoriesFile.kind === 'OK' ? parseRepositories(repositoriesFile.value) : null;
  if (repositories === null) return { kind: 'REJECTED', reason: 'RUN_EVIDENCE_SCHEMA_INVALID' };

  return { kind: 'OK', input: { summary, events, repositories } };
}

function unavailableSnapshot(reasonCode: RunEvidenceReasonCode): RunEvidenceSnapshot {
  return { state: 'UNAVAILABLE', records: [], generation: null, reasonCodes: [reasonCode] };
}

function readSnapshot(root: string): RunEvidenceSnapshot {
  const absoluteRoot = path.resolve(root);
  let rootStat: fs.Stats;
  try {
    rootStat = fs.lstatSync(absoluteRoot);
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? unavailableSnapshot('RUN_EVIDENCE_ROOT_UNAVAILABLE')
      : unavailableSnapshot('RUN_EVIDENCE_ROOT_UNSAFE');
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory() || !noSymlinkComponents(absoluteRoot)) return unavailableSnapshot('RUN_EVIDENCE_ROOT_UNSAFE');

  let entries: readonly fs.Dirent[];
  try {
    entries = fs.readdirSync(absoluteRoot, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return unavailableSnapshot('RUN_EVIDENCE_ROOT_UNAVAILABLE');
  }
  const directories = entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink());
  if (directories.length > MAX_RUNS) return unavailableSnapshot('RUN_EVIDENCE_RECORD_OVERSIZED');

  const records: RunAuthorityInput[] = [];
  let rejected = 0;
  const detailedReasons = new Set<RunEvidenceReasonCode>();
  for (const entry of directories) {
    if (!RUN_ID_PATTERN.test(entry.name) || entry.isSymbolicLink()) {
      rejected += 1;
      detailedReasons.add('RUN_EVIDENCE_PATH_UNSAFE');
      continue;
    }
    const read = readOneRun(absoluteRoot, entry.name);
    if (read.kind === 'REJECTED') {
      rejected += 1;
      detailedReasons.add(read.reason);
      continue;
    }
    records.push(read.input);
  }
  records.sort((left, right) => left.summary.runId.localeCompare(right.summary.runId));
  const state: RunEvidenceState = records.length === 0
    ? (directories.length === 0 ? 'EMPTY' : 'UNKNOWN')
    : rejected === 0 ? 'AVAILABLE' : 'UNKNOWN';
  const reasonCodes: RunEvidenceReasonCode[] = [];
  if (state === 'EMPTY') reasonCodes.push('RUN_EVIDENCE_EMPTY');
  if (rejected > 0) reasonCodes.push('RUN_EVIDENCE_PARTIAL_CORRUPTION');
  reasonCodes.push(...detailedReasons);
  const generation = prefixedDigest24('runs', {
    state,
    reasonCodes: [...new Set(reasonCodes)],
    records: records.map((record) => ({ summary: record.summary, events: record.events ?? [], repositories: record.repositories ?? [] })),
  });
  return { state, records, generation, reasonCodes: [...new Set(reasonCodes)] };
}

function assertTestRoot(root: string): string {
  if (!path.isAbsolute(root) || root.includes('\0')) throw new Error('RUN_EVIDENCE_TEST_ROOT_INVALID');
  return path.resolve(root);
}

function createReader(root: string): RunEvidenceReader {
  const resolvedRoot = path.resolve(root);
  return {
    snapshot: () => readSnapshot(resolvedRoot),
    find: (runId) => {
      if (!RUN_ID_PATTERN.test(runId)) return null;
      return readSnapshot(resolvedRoot).records.find((record) => record.summary.runId === runId) ?? null;
    },
  };
}

/** Normal launcher boundary: only the repository-owned artifacts root. */
export function createRunEvidenceReader(): RunEvidenceReader {
  return createReader(DEFAULT_RUN_EVIDENCE_ROOT);
}

/** Synthetic/unit-test seam; never wired to an HTTP request or CLI argument. */
export function createRunEvidenceReaderForTests(root: string): RunEvidenceReader {
  return createReader(assertTestRoot(root));
}
