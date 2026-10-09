// ---------------------------------------------------------------------------
// Nightwatch NW-AUD-005 — the crash-consistent evidence-retention journal.
//
// Retention performs irreversible directory deletion. The historical shape was
// one best-effort write of a receipt saying `STARTED` with an EMPTY deleted set,
// the deletion, and then a second best-effort overwrite that could fail. A crash
// or a failed final write therefore left the only durable receipt claiming
// nothing had been deleted, while the command could still exit successfully
// with `result: APPLIED` and `receiptFinalized: false`.
//
// The rule this module makes mechanical: a non-terminal record is NEVER the
// last word. Deletion is bracketed by two durable, owner-only, symlink-refusing
// records — a PREPARED intent published BEFORE the first removal, and a
// TERMINAL receipt published and RE-VERIFIED afterwards. Only a verified
// terminal record may be reported as a deletion receipt, and a terminal record
// can never be replaced.
//
// This module is the recording AUTHORITY for the repository-local journal root
// (the ignored `.nightwatch/retention/` subtree). It never decides what may be
// deleted: that is `planRetention`'s refusal-first classification, which stays
// pure. The writer here is deliberately repository-local rather than the
// owner-private artifact store, because the journal's access contract is the
// opposite one — it lives inside the repository, purpose-built, and inherits
// none of the private-store semantics.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export const RETENTION_JOURNAL_VERSION = 'nightwatch.evidence-retention-operation-journal.v1' as const;

/** The journal root. Injectable so a disposable store can be exercised. */
export interface RetentionJournalStore {
  readonly root: string;
}

/** One reviewed removal candidate: its name and its measured size, never a path. */
export interface RetentionJournalCandidate {
  readonly name: string;
  readonly bytes: number | null;
}

/** The per-target outcome of the mutation, recorded after it happened. */
export interface RetentionJournalTarget {
  readonly name: string;
  readonly result: 'REMOVED' | 'PRESERVED';
  readonly reasonCode: string;
  /** The reviewed size, or null when the plan could not measure it. */
  readonly bytes: number | null;
}

/**
 * The durable record.
 *
 * `terminal` is the load-bearing field: a PREPARED record describes an INTENT
 * (what is about to be deleted) and is never a deletion receipt; only a
 * terminal record is, and only after `finalizeRetentionOperation` has written
 * and verified it.
 */
export interface RetentionOperationRecord {
  readonly schemaVersion: typeof RETENTION_JOURNAL_VERSION;
  /** Opaque operation identity. Never a path, never a customer value. */
  readonly operationId: string;
  readonly terminal: boolean;
  readonly status: 'PREPARED' | 'APPLIED' | 'PARTIAL' | 'PRESERVED';
  readonly appliedAt: string;
  /** Best-effort repository SHA for the record; null when unavailable. */
  readonly gitHead: string | null;
  readonly keepRecent: number;
  /**
   * Bounded digest of the exact reviewed plan's confirmation token.
   *
   * Named `...Digest` rather than `...Token` on purpose: the shared private-
   * payload screen's labeled-value tripwire reads a `token:` label followed by
   * a value as raw secret material, and the operator-facing token itself never
   * belongs in a durable record. Only its digest does.
   */
  readonly planConfirmationDigest: string;
  /** Bounded digest of the exact refusal set, so the receipt can prove it. */
  readonly refusalSetDigest: string;
  readonly entryCount: number;
  readonly refusedCount: number;
  readonly candidateCount: number;
  readonly reclaimableBytes: number | null;
  readonly referenceScanComplete: boolean;
  readonly candidates: readonly RetentionJournalCandidate[];
  /** Empty while PREPARED. Populated, and size-checked, only on a terminal record. */
  readonly deletedSet: readonly RetentionJournalCandidate[];
  readonly deletedBytes: number | null;
  readonly removedCount: number;
  readonly targets: readonly RetentionJournalTarget[];
}

export type RetentionJournalFailure =
  | 'OPERATION_ID_INVALID'
  | 'CANDIDATES_INVALID'
  | 'TARGETS_INVALID'
  | 'ROOT_UNUSABLE'
  | 'RECORD_WRITE_FAILED'
  | 'RECORD_VERIFICATION_FAILED'
  | 'RECORD_CORRUPT'
  | 'OPERATION_NOT_FOUND'
  | 'OPERATION_ALREADY_PREPARED'
  | 'OPERATION_ALREADY_TERMINAL'
  | 'OPERATION_INCOMPLETE';

export type RetentionJournalResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: RetentionJournalFailure };

const OPERATION_ID_RE = /^retention-[0-9a-f]{24}$/;
const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const RECORD_KEYS = [
  'schemaVersion', 'operationId', 'terminal', 'status', 'appliedAt', 'gitHead', 'keepRecent',
  'planConfirmationDigest', 'refusalSetDigest', 'entryCount', 'refusedCount', 'candidateCount',
  'reclaimableBytes', 'referenceScanComplete', 'candidates', 'deletedSet', 'deletedBytes',
  'removedCount', 'targets',
] as const;
const RECORD_STATUSES = ['PREPARED', 'APPLIED', 'PARTIAL', 'PRESERVED'] as const;
const TARGET_RESULTS = ['REMOVED', 'PRESERVED'] as const;

/** The default journal root: the ignored `.nightwatch/retention/` subtree. */
export function retentionJournalStore(root: string): RetentionJournalStore {
  return { root };
}

function preparedFileName(operationId: string): string {
  return `${operationId}.prepared.json`;
}

function terminalFileName(operationId: string): string {
  return `${operationId}.terminal.json`;
}

function assertCandidates(candidates: readonly RetentionJournalCandidate[]): void {
  if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('RETENTION_JOURNAL_CANDIDATES_INVALID');
  for (const candidate of candidates) {
    if (typeof candidate?.name !== 'string' || !SAFE_NAME_RE.test(candidate.name)) throw new Error('RETENTION_JOURNAL_CANDIDATES_INVALID');
    if (candidate.bytes !== null && !Number.isSafeInteger(candidate.bytes)) throw new Error('RETENTION_JOURNAL_CANDIDATES_INVALID');
  }
}

function assertTargets(targets: readonly RetentionJournalTarget[]): void {
  if (!Array.isArray(targets)) throw new Error('RETENTION_JOURNAL_TARGETS_INVALID');
  for (const target of targets) {
    if (typeof target?.name !== 'string' || !SAFE_NAME_RE.test(target.name)) throw new Error('RETENTION_JOURNAL_TARGETS_INVALID');
    if (target.result !== 'REMOVED' && target.result !== 'PRESERVED') throw new Error('RETENTION_JOURNAL_TARGETS_INVALID');
    if (typeof target.reasonCode !== 'string' || target.reasonCode.length === 0) throw new Error('RETENTION_JOURNAL_TARGETS_INVALID');
    if (target.bytes !== null && !Number.isSafeInteger(target.bytes)) throw new Error('RETENTION_JOURNAL_TARGETS_INVALID');
  }
}

/** The terminal outcome is DERIVED from the recorded targets, never asserted by the caller. */
export function retentionOutcomeFromTargets(targets: readonly RetentionJournalTarget[]): {
  readonly status: 'APPLIED' | 'PARTIAL' | 'PRESERVED';
  readonly removedCount: number;
  readonly deletedSet: readonly RetentionJournalCandidate[];
  readonly deletedBytes: number | null;
} {
  assertTargets(targets);
  const removed = targets.filter((target) => target.result === 'REMOVED');
  const deletedSet = removed.map((target) => ({ name: target.name, bytes: target.bytes }));
  const deletedBytes = deletedSet.every((entry) => entry.bytes !== null)
    ? deletedSet.reduce((total, entry) => total + (entry.bytes ?? 0), 0)
    : null;
  return {
    // Reclaiming nothing is a valid, honest outcome — but it is recorded as
    // PRESERVED, never dressed up as APPLIED.
    status: removed.length === 0 ? 'PRESERVED' : removed.length === targets.length ? 'APPLIED' : 'PARTIAL',
    removedCount: removed.length,
    deletedSet,
    deletedBytes,
  };
}

/** Strict exact-key read. A record with any other shape is never accepted. */
function parseRecord(bytes: string): RetentionOperationRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const value = parsed as Record<string, unknown>;
  if (Object.keys(value).length !== RECORD_KEYS.length) return null;
  for (const key of RECORD_KEYS) {
    if (value[key] === undefined) return null;
  }
  const record = value as unknown as RetentionOperationRecord;
  if (record.schemaVersion !== RETENTION_JOURNAL_VERSION) return null;
  if (typeof record.operationId !== 'string' || !OPERATION_ID_RE.test(record.operationId)) return null;
  if (typeof record.terminal !== 'boolean') return null;
  if (!RECORD_STATUSES.includes(record.status)) return null;
  return record;
}

function lstatOrNull(target: string): fs.Stats | null {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

/** Every ancestor of the journal root must be a real, non-symlink directory. */
function ensureJournalRoot(root: string): RetentionJournalFailure | null {
  if (!path.isAbsolute(root)) return 'ROOT_UNUSABLE';
  if (root.split(/[\\/]+/).includes('..')) return 'ROOT_UNUSABLE';
  let current = path.parse(root).root;
  for (const component of root.slice(path.parse(root).root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const stat = lstatOrNull(current);
    if (stat === null) {
      try {
        fs.mkdirSync(current, { recursive: true, mode: 0o700 });
      } catch {
        return 'ROOT_UNUSABLE';
      }
      const created = lstatOrNull(current);
      if (created === null || created.isSymbolicLink() || !created.isDirectory()) return 'ROOT_UNUSABLE';
      continue;
    }
    if (stat.isSymbolicLink()) return 'ROOT_UNUSABLE';
    if (!stat.isDirectory()) return 'ROOT_UNUSABLE';
  }
  try {
    fs.chmodSync(root, 0o700);
  } catch {
    return 'ROOT_UNUSABLE';
  }
  return null;
}

type PublishOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: 'DESTINATION_EXISTS' | 'RECORD_WRITE_FAILED' | 'COMMIT_UNSUPPORTED' };

/** Same-directory exclusive staging, then an atomic NO-REPLACE commit. */
function publishRecord(root: string, fileName: string, record: RetentionOperationRecord): PublishOutcome {
  const bytes = `${JSON.stringify(record, null, 2)}\n`;
  const destination = path.join(root, fileName);
  const temporary = path.join(root, `.retention-journal-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
  let descriptor: number;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
  } catch {
    return { ok: false, failure: 'RECORD_WRITE_FAILED' };
  }
  const discard = (): void => {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* cleanup is best effort */ }
  };
  try {
    fs.writeFileSync(descriptor, bytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
  } catch {
    try { fs.closeSync(descriptor); } catch { /* the original failure is reported */ }
    discard();
    return { ok: false, failure: 'RECORD_WRITE_FAILED' };
  }
  try {
    fs.closeSync(descriptor);
  } catch {
    discard();
    return { ok: false, failure: 'RECORD_WRITE_FAILED' };
  }
  const staged = lstatOrNull(temporary);
  if (staged === null || staged.isSymbolicLink() || !staged.isFile() || staged.size !== Buffer.byteLength(bytes)) {
    discard();
    return { ok: false, failure: 'RECORD_WRITE_FAILED' };
  }
  // The destination must be exactly the journal root: a symlinked or escaped
  // destination is refused, never followed.
  const existing = lstatOrNull(destination);
  if (existing !== null && (existing.isSymbolicLink() || !existing.isFile())) {
    discard();
    return { ok: false, failure: 'DESTINATION_EXISTS' };
  }
  try {
    // POSIX link creation is atomic and fails with EEXIST without replacing an
    // existing regular file, directory, or symlink. That is the immutability
    // primitive: a completed operation can never be overwritten.
    fs.linkSync(temporary, destination);
  } catch (error) {
    discard();
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') return { ok: false, failure: 'DESTINATION_EXISTS' };
    if (code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EINVAL' || code === 'EPERM') {
      return { ok: false, failure: 'COMMIT_UNSUPPORTED' };
    }
    return { ok: false, failure: 'RECORD_WRITE_FAILED' };
  }
  discard();
  try {
    const directoryDescriptor = fs.openSync(root, 'r');
    try {
      fs.fsyncSync(directoryDescriptor);
    } finally {
      try { fs.closeSync(directoryDescriptor); } catch { /* close cleanup is best effort */ }
    }
  } catch {
    // A directory fsync that the platform refuses is not a publication failure:
    // the record itself is already durable through the file fsync above.
  }
  return { ok: true };
}

function readRecordFile(root: string, fileName: string): RetentionOperationRecord | null {
  const destination = path.join(root, fileName);
  if (path.dirname(destination) !== path.resolve(root)) return null;
  const stat = lstatOrNull(destination);
  if (stat === null || stat.isSymbolicLink() || !stat.isFile()) return null;
  try {
    return parseRecord(fs.readFileSync(destination, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Write the PREPARED record before the first deletion.
 *
 * No-replace and durable: an interrupted operation therefore always leaves an
 * identifiable PREPARED record behind, and `hasIncompleteRetentionOperation`
 * can see it. If it cannot be written, nothing is removed — an unrecorded
 * deletion is refused, not performed.
 */
export function prepareRetentionOperation(
  store: RetentionJournalStore,
  intent: RetentionOperationIntent,
): RetentionJournalResult<RetentionOperationRecord> {
  if (!OPERATION_ID_RE.test(intent.operationId)) return { ok: false, failure: 'OPERATION_ID_INVALID' };
  try {
    assertCandidates(intent.candidates);
  } catch {
    return { ok: false, failure: 'CANDIDATES_INVALID' };
  }
  const rootFailure = ensureJournalRoot(store.root);
  if (rootFailure !== null) return { ok: false, failure: rootFailure };

  const record: RetentionOperationRecord = {
    schemaVersion: RETENTION_JOURNAL_VERSION,
    operationId: intent.operationId,
    terminal: false,
    status: 'PREPARED',
    appliedAt: intent.appliedAt,
    gitHead: intent.gitHead,
    keepRecent: intent.keepRecent,
    planConfirmationDigest: intent.planConfirmationDigest,
    refusalSetDigest: intent.refusalSetDigest,
    entryCount: intent.entryCount,
    refusedCount: intent.refusedCount,
    candidateCount: intent.candidateCount,
    reclaimableBytes: intent.reclaimableBytes,
    referenceScanComplete: intent.referenceScanComplete === true,
    candidates: intent.candidates.map((candidate) => ({ name: candidate.name, bytes: candidate.bytes })),
    deletedSet: [],
    deletedBytes: 0,
    removedCount: 0,
    targets: [],
  };
  const published = publishRecord(store.root, preparedFileName(intent.operationId), record);
  if (!published.ok) {
    return { ok: false, failure: published.failure === 'DESTINATION_EXISTS' ? 'OPERATION_ALREADY_PREPARED' : 'RECORD_WRITE_FAILED' };
  }
  return { ok: true, value: record };
}

/**
 * Write and VERIFY the terminal record.
 *
 * This is the only place a deletion receipt can come from. The record is
 * committed no-replace, then re-read from disk and compared byte-for-byte; any
 * disagreement — including a write that silently did not land — is
 * `RECORD_VERIFICATION_FAILED`, which the caller MUST report as a categorical
 * non-success rather than as `APPLIED` or `PARTIAL`.
 */
export function finalizeRetentionOperation(
  store: RetentionJournalStore,
  operationId: string,
  targets: readonly RetentionJournalTarget[],
): RetentionJournalResult<RetentionOperationRecord> {
  if (!OPERATION_ID_RE.test(operationId)) return { ok: false, failure: 'OPERATION_ID_INVALID' };
  try {
    assertTargets(targets);
  } catch {
    return { ok: false, failure: 'TARGETS_INVALID' };
  }

  const prepared = readRecordFile(store.root, preparedFileName(operationId));
  if (prepared === null) return { ok: false, failure: 'OPERATION_NOT_FOUND' };
  if (prepared.terminal) return { ok: false, failure: 'OPERATION_ALREADY_TERMINAL' };

  const outcome = retentionOutcomeFromTargets(targets);
  const record: RetentionOperationRecord = {
    ...prepared,
    terminal: true,
    status: outcome.status,
    deletedSet: outcome.deletedSet,
    deletedBytes: outcome.deletedBytes,
    removedCount: outcome.removedCount,
    targets: targets.map((target) => ({ name: target.name, result: target.result, reasonCode: target.reasonCode, bytes: target.bytes })),
  };

  const published = publishRecord(store.root, terminalFileName(operationId), record);
  if (!published.ok) {
    return { ok: false, failure: published.failure === 'DESTINATION_EXISTS' ? 'OPERATION_ALREADY_TERMINAL' : 'RECORD_WRITE_FAILED' };
  }

  // Durability is a fact to be re-read, not a claim to be asserted.
  const observed = readRecordFile(store.root, terminalFileName(operationId));
  if (observed === null || JSON.stringify(observed) !== JSON.stringify(record)) {
    return { ok: false, failure: 'RECORD_VERIFICATION_FAILED' };
  }
  return { ok: true, value: record };
}

/** The terminal record when one exists, otherwise the PREPARED intent, otherwise null. */
export function readRetentionOperation(store: RetentionJournalStore, operationId: string): RetentionOperationRecord | null {
  if (!OPERATION_ID_RE.test(operationId)) return null;
  return readRecordFile(store.root, terminalFileName(operationId))
    ?? readRecordFile(store.root, preparedFileName(operationId));
}

/**
 * True when a PREPARED record exists with no terminal record: an operation was
 * started and never finished, so a new apply must be blocked for inspection
 * rather than quietly deleting more.
 */
export function hasIncompleteRetentionOperation(store: RetentionJournalStore, operationId: string): boolean {
  const record = readRetentionOperation(store, operationId);
  return record !== null && !record.terminal;
}

/** A terminal record is the only shape that may be reported as a deletion receipt. */
export function assertTerminalRetentionRecord(record: RetentionOperationRecord | null): RetentionOperationRecord {
  if (record === null) throw new Error('RETENTION_JOURNAL_OPERATION_NOT_FOUND');
  if (!record.terminal) throw new Error('RETENTION_JOURNAL_OPERATION_INCOMPLETE');
  return record;
}

/** The reviewed plan facts a PREPARED record must bind. */
export interface RetentionOperationIntent {
  readonly operationId: string;
  readonly appliedAt: string;
  readonly gitHead: string | null;
  readonly keepRecent: number;
  readonly planConfirmationDigest: string;
  readonly refusalSetDigest: string;
  readonly entryCount: number;
  readonly refusedCount: number;
  readonly candidateCount: number;
  readonly reclaimableBytes: number | null;
  readonly referenceScanComplete: boolean;
  readonly candidates: readonly RetentionJournalCandidate[];
}
