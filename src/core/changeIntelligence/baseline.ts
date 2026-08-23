import fs from 'node:fs';
import path from 'node:path';
import type { BaselineRecord, BaselineState, ChangeSet, ExecutionDisposition } from './types';
import {
  assertExactKeys,
  assertString,
  requireRuntimeArray,
  requireRuntimeRecord,
  safeErrorDetail,
} from '../campaign/runtimeValidation';

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
const BASELINE_SCHEMA_VERSION = 'nightwatch.baseline.phase3.v1' as const;
const BASELINE_INVALID_DOCUMENT = 'BASELINE_INVALID_DOCUMENT';
const BASELINE_STATUSES: readonly BaselineRecord['status'][] = ['BOOTSTRAP_BASELINE', 'VERIFIED_BASELINE', 'PENDING_CHANGESET'];
const EXECUTION_STATUSES: readonly NonNullable<ExecutionDisposition['status']>[] = ['ACCEPTED_SUCCESS', 'FAILED', 'BLOCKED', 'NOT_RUN'];
const SHA_RE = /^[0-9a-f]{40}$/;
const REPO_ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const CHANGESET_ID_RE = /^cs-[0-9a-f]{24}$/;
const PROVENANCE_RE = /^[A-Za-z0-9_.:/,@()+; -]{1,240}$/;
const PROVENANCE_SECRET_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:customer|account|tenant|user|email)[-_ :/][A-Z0-9][A-Z0-9._:-]{2,})/i;

function invalidBaseline(reason: string): never {
  throw new Error(`${BASELINE_INVALID_DOCUMENT}:${safeErrorDetail(reason)}`);
}

function assertSafeRepoId(value: unknown): asserts value is string {
  assertString(value, `${BASELINE_INVALID_DOCUMENT}:REPO_ID`);
  if (!REPO_ID_RE.test(value)) invalidBaseline('REPO_ID_INVALID');
}

function assertSha(value: unknown, field: string): asserts value is string {
  assertString(value, `${BASELINE_INVALID_DOCUMENT}:${field}`);
  if (!SHA_RE.test(value)) invalidBaseline(`${field}_INVALID`);
}

function assertProvenance(value: unknown): asserts value is string {
  assertString(value, `${BASELINE_INVALID_DOCUMENT}:PROVENANCE`);
  if (!PROVENANCE_RE.test(value) || PROVENANCE_SECRET_RE.test(value)) invalidBaseline('PROVENANCE_INVALID');
}

function assertNullableChangesetId(value: unknown): asserts value is string | null {
  if (value === null) return;
  assertString(value, `${BASELINE_INVALID_DOCUMENT}:CHANGESET_ID`);
  if (!CHANGESET_ID_RE.test(value)) invalidBaseline('CHANGESET_ID_INVALID');
}

function assertNullableExecutionStatus(value: unknown): asserts value is ExecutionDisposition['status'] | null {
  if (value === null) return;
  if (typeof value !== 'string' || !EXECUTION_STATUSES.includes(value as ExecutionDisposition['status'])) invalidBaseline('EXECUTION_STATUS_INVALID');
}

/** Strict parser for the versioned baseline document crossing the local file boundary. */
export function validateBaselineState(value: unknown): asserts value is BaselineState {
  const record = requireRuntimeRecord(value, BASELINE_INVALID_DOCUMENT);
  assertExactKeys(record, ['schemaVersion', 'records'], BASELINE_INVALID_DOCUMENT);
  if (record.schemaVersion !== BASELINE_SCHEMA_VERSION) invalidBaseline('SCHEMA_VERSION_INVALID');
  const rawRecords = requireRuntimeArray(record.records, BASELINE_INVALID_DOCUMENT);
  if (rawRecords.length > 64) invalidBaseline('RECORD_COUNT_EXCEEDS_BOUND');
  const repoIds: string[] = [];
  for (const raw of rawRecords) {
    const baseline = requireRuntimeRecord(raw, BASELINE_INVALID_DOCUMENT);
    assertExactKeys(baseline, ['repoId', 'baselineSha', 'status', 'provenance', 'lastChangesetId', 'lastAcceptedExecutionStatus'], BASELINE_INVALID_DOCUMENT);
    assertSafeRepoId(baseline.repoId);
    assertSha(baseline.baselineSha, 'BASELINE_SHA');
    if (typeof baseline.status !== 'string' || !BASELINE_STATUSES.includes(baseline.status as BaselineRecord['status'])) invalidBaseline('STATUS_INVALID');
    assertProvenance(baseline.provenance);
    assertNullableChangesetId(baseline.lastChangesetId);
    assertNullableExecutionStatus(baseline.lastAcceptedExecutionStatus);
    const status = baseline.status as BaselineRecord['status'];
    const changesetId = baseline.lastChangesetId as string | null;
    const executionStatus = baseline.lastAcceptedExecutionStatus as ExecutionDisposition['status'] | null;
    if (status === 'BOOTSTRAP_BASELINE' && (changesetId !== null || executionStatus !== null)) {
      invalidBaseline('BOOTSTRAP_REFERENCE_CONTRADICTION');
    }
    if (status === 'VERIFIED_BASELINE' && (changesetId === null || executionStatus !== 'ACCEPTED_SUCCESS')) {
      invalidBaseline('VERIFIED_REFERENCE_CONTRADICTION');
    }
    if (status === 'PENDING_CHANGESET' && (changesetId === null || executionStatus === null || executionStatus === 'ACCEPTED_SUCCESS')) {
      invalidBaseline('PENDING_REFERENCE_CONTRADICTION');
    }
    repoIds.push(baseline.repoId);
  }
  if (new Set(repoIds).size !== repoIds.length) invalidBaseline('DUPLICATE_REPO_ID');
  const sorted = [...repoIds].sort((left, right) => left.localeCompare(right));
  if (sorted.some((repoId, index) => repoId !== repoIds[index])) invalidBaseline('RECORD_ORDER_NOT_CANONICAL');
}

export function bootstrapBaseline(repoId: string, sha: string, provenance: string): BaselineRecord {
  return { repoId, baselineSha: sha, status: 'BOOTSTRAP_BASELINE', provenance, lastChangesetId: null, lastAcceptedExecutionStatus: null };
}

export function initialBaselineState(records: readonly BaselineRecord[]): BaselineState {
  return { schemaVersion: BASELINE_SCHEMA_VERSION, records: [...records].sort((a, b) => a.repoId.localeCompare(b.repoId)) };
}

export function applyExecutionDisposition(state: BaselineState, changeset: ChangeSet, disposition: ExecutionDisposition): BaselineState {
  if (disposition.changesetId !== changeset.changesetId) throw new Error('baseline disposition changeset does not match selected changeset');
  const byRepo = new Map(state.records.map((record) => [record.repoId, record]));
  for (const baseline of changeset.repoBaselines) {
    const existing = byRepo.get(baseline.repoId);
    if (!existing) throw new Error(`baseline record missing for ${baseline.repoId}`);
    const accepted = disposition.status === 'ACCEPTED_SUCCESS';
    byRepo.set(baseline.repoId, {
      ...existing,
      baselineSha: accepted ? baseline.headSha : existing.baselineSha,
      status: accepted ? 'VERIFIED_BASELINE' : 'PENDING_CHANGESET',
      provenance: accepted
        ? `Accepted ${changeset.changesetId} for selected journeys ${disposition.acceptedJourneyIds.join(',') || 'none'}.`
        : `Pending ${changeset.changesetId}; execution status ${disposition.status}; baseline did not advance.`,
      lastChangesetId: changeset.changesetId,
      lastAcceptedExecutionStatus: disposition.status,
    });
  }
  return { schemaVersion: BASELINE_SCHEMA_VERSION, records: [...byRepo.values()].sort((a, b) => a.repoId.localeCompare(b.repoId)) };
}

export function readBaseline(filePath: string): BaselineState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    invalidBaseline('JSON_PARSE_FAILED');
  }
  validateBaselineState(parsed);
  return parsed;
}

export function writeBaselineAtomic(filePath: string, state: BaselineState): void {
  validateBaselineState(state);
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch { /* preserve the original failure */ }
    throw error;
  }
}
