// ---------------------------------------------------------------------------
// Nightwatch NW-AUD-009 — the ONE governed publication boundary for ignored
// repository-local reports and receipts.
//
// Six `current.json` report writers published with `mkdirSync` plus a direct
// truncating `writeFileSync`. That shape follows a prepared ancestor or leaf
// symlink into an owner file, truncates the previous complete report before a
// replacement is durable, and inherits inconsistent file modes — while the
// schemas involved are declared persisted artifacts.
//
// This module is the single authority every such writer goes through. It
// admits bytes, schema, size, destination ancestry and leaf type BEFORE
// changing anything, publishes replaceable reports through same-directory
// exclusive staging and an atomic rename, and publishes historical receipts as
// immutable no-replace files. A platform that cannot provide a required
// primitive refuses publication rather than downgrading to a direct write.
//
// It provides no hostile same-operating-system-account isolation: a process
// that can arbitrarily rewrite the repository can also rewrite this module.
// The guarantee is that a normal, non-adversarial writer can no longer follow a
// symlink or leave a truncated report behind.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/**
 * `CURRENT_REPLACE` is for regenerable `current.json` reports: the previous
 * complete report or the new complete report, never a truncated intermediate.
 *
 * `APPEND_IMMUTABLE` is for historical certification receipts: one immutable
 * file per invocation, never overwritten even when timestamps or digests match.
 */
export const LOCAL_REPORT_PUBLICATION_PROFILES = ['CURRENT_REPLACE', 'APPEND_IMMUTABLE'] as const;
export type LocalReportPublicationProfile = typeof LOCAL_REPORT_PUBLICATION_PROFILES[number];

export type LocalReportPublicationFailure =
  | 'PAYLOAD_NOT_SERIALIZABLE'
  | 'SCHEMA_REJECTED'
  | 'SIZE_LIMIT_EXCEEDED'
  | 'DESTINATION_NOT_ABSOLUTE'
  | 'DESTINATION_TRAVERSAL'
  | 'ANCESTOR_NOT_A_DIRECTORY'
  | 'ANCESTOR_SYMLINK'
  | 'ANCESTOR_CREATE_FAILED'
  | 'LEAF_SYMLINK'
  | 'LEAF_NOT_A_REGULAR_FILE'
  | 'LEAF_MODE_UNSAFE'
  | 'STAGE_CREATE_FAILED'
  | 'STAGE_VERIFY_FAILED'
  | 'STAGE_WRITE_FAILED'
  | 'COMMIT_UNSUPPORTED'
  | 'COMMIT_FAILED'
  | 'COMMIT_REFUSED_IMMUTABLE'
  | 'VERIFICATION_FAILED'
  | 'DIRECTORY_SYNC_FAILED'
  | 'IMMUTABLE_NAME_EXHAUSTED';

export type LocalReportPublicationResult =
  | {
      readonly ok: true;
      readonly profile: LocalReportPublicationProfile;
      /** Absolute destination path. Callers must not print it verbatim. */
      readonly path: string;
      readonly bytes: number;
      readonly digest: string;
    }
  | { readonly ok: false; readonly failure: LocalReportPublicationFailure };

/** What every caller must supply: already-constructed data and its exact validator. */
export interface LocalReportPublicationRequest {
  readonly profile: LocalReportPublicationProfile;
  readonly payload: unknown;
  /** The caller's EXACT schema validator. It must throw on a disagreement. */
  readonly validate: (value: unknown) => void;
  /** A hard serialized-byte ceiling, applied before any filesystem change. */
  readonly maxBytes: number;
  /**
   * The destination. Its meaning is PROFILE-dependent and deliberate:
   *
   *   - `CURRENT_REPLACE` names the exact destination FILE (e.g.
   *     `artifacts/<report>/current.json`), which may be replaced;
   *   - `APPEND_IMMUTABLE` names the receipt DIRECTORY (e.g.
   *     `artifacts/topology-receipts/`), inside which this call mints its own
   *     never-replaced file name.
   */
  readonly destination: string;
  /** Canonicalizing digest, injected so this module stays free of a crypto dependency. */
  readonly digest: (canonical: string) => string;
  /** Injectable clock so immutable receipt naming is testable. */
  readonly nowMs?: number;
}

const MAX_IMMUTABLE_NAME_ATTEMPTS = 64;
/** Every published file is committed owner-only. A weaker mode is a refusal. */
const REQUIRED_MODE = 0o600;

function serialize(payload: unknown): string | null {
  try {
    return `${JSON.stringify(payload, null, 2)}\n`;
  } catch {
    return null;
  }
}

function lstatOrNull(target: string): fs.Stats | null {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

/** Ensure `directory` exists as a real, non-symlink directory, creating it when allowed. Never follows a symlink. */
function ensureDirectory(directory: string, create: boolean): LocalReportPublicationFailure | null {
  if (!path.isAbsolute(directory)) return 'DESTINATION_NOT_ABSOLUTE';
  const parsed = path.parse(directory);
  let current = parsed.root;
  for (const component of directory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return 'ANCESTOR_NOT_A_DIRECTORY';
      if (!create) return 'ANCESTOR_NOT_A_DIRECTORY';
      try {
        fs.mkdirSync(current, { recursive: true, mode: 0o700 });
      } catch {
        return 'ANCESTOR_CREATE_FAILED';
      }
      try {
        stat = fs.lstatSync(current);
      } catch {
        return 'ANCESTOR_NOT_A_DIRECTORY';
      }
    }
    if (stat.isSymbolicLink()) return 'ANCESTOR_SYMLINK';
    if (!stat.isDirectory()) return 'ANCESTOR_NOT_A_DIRECTORY';
  }
  return null;
}

function fsyncDirectory(directory: string): LocalReportPublicationFailure | null {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(directory, 'r');
    fs.fsyncSync(descriptor);
    return null;
  } catch {
    return 'DIRECTORY_SYNC_FAILED';
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Close cleanup must not hide an already-reported sync failure.
      }
    }
  }
}

/** Same-directory exclusive staging: unique unpredictable name, `wx`, owner-only. */
function stageBytes(directory: string, bytes: string): { ok: true; temporary: string } | { ok: false; failure: LocalReportPublicationFailure } {
  const temporary = path.join(directory, `.nightwatch-report-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
  let descriptor: number;
  try {
    descriptor = fs.openSync(temporary, 'wx', REQUIRED_MODE);
  } catch {
    return { ok: false, failure: 'STAGE_CREATE_FAILED' };
  }
  try {
    fs.writeFileSync(descriptor, bytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
  } catch {
    try { fs.closeSync(descriptor); } catch { /* the original failure is reported */ }
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* cleanup is best effort */ }
    return { ok: false, failure: 'STAGE_WRITE_FAILED' };
  }
  try {
    fs.closeSync(descriptor);
  } catch {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* cleanup is best effort */ }
    return { ok: false, failure: 'STAGE_WRITE_FAILED' };
  }
  // Re-open and verify by identity: a staged file that is not exactly the
  // regular file this invocation created is never committed.
  try {
    const stat = fs.lstatSync(temporary);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size !== Buffer.byteLength(bytes)) {
      throw new Error('STAGE_IDENTITY_MISMATCH');
    }
  } catch {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch { /* cleanup is best effort */ }
    return { ok: false, failure: 'STAGE_VERIFY_FAILED' };
  }
  return { ok: true, temporary };
}

function discardTemporary(temporary: string): void {
  try {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  } catch {
    // Cleanup is best effort and never replaces the original failure.
  }
}

function immutableName(directory: string, digest: string, nowMs: number, attempt: number): string {
  // A bounded sortable time component, the admitted content digest, and a
  // collision-resistant per-invocation token. An existing destination is never
  // overwritten, even when every other component matches.
  const stamp = new Date(nowMs).toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const token = randomBytes(attempt === 0 ? 8 : 8 + attempt).toString('hex');
  return `report-${stamp}-${digest}-${token}.json`;
}

/**
 * Publish one report or receipt. The result is categorical: a caller may claim
 * success only on `ok: true`, after which the bytes on disk are the admitted
 * bytes and nothing else.
 */
export function publishLocalReport(request: LocalReportPublicationRequest): LocalReportPublicationResult {
  const payloadValue = request.payload !== null && typeof request.payload === 'object' ? request.payload : { value: request.payload };

  // 1. Complete admission happens entirely in memory, before any filesystem
  //    change: serialization, exact schema, and a hard byte bound.
  const bytes = serialize(request.payload);
  if (bytes === null) return { ok: false, failure: 'PAYLOAD_NOT_SERIALIZABLE' };
  try {
    request.validate(payloadValue);
  } catch {
    return { ok: false, failure: 'SCHEMA_REJECTED' };
  }
  if (Buffer.byteLength(bytes) > request.maxBytes) return { ok: false, failure: 'SIZE_LIMIT_EXCEEDED' };
  const digest = request.digest(bytes);

  // 2. Destination identity: absolute, no traversal, every ancestor a real
  //    non-symlink directory. `APPEND_IMMUTABLE` names a DIRECTORY; every
  //    other profile names the destination FILE.
  if (!path.isAbsolute(request.destination)) return { ok: false, failure: 'DESTINATION_NOT_ABSOLUTE' };
  if (request.destination.split(/[\\/]+/).includes('..')) return { ok: false, failure: 'DESTINATION_TRAVERSAL' };
  const immutable = request.profile === 'APPEND_IMMUTABLE';
  const directory = immutable ? request.destination : path.dirname(request.destination);
  const ancestry = ensureDirectory(directory, true);
  if (ancestry !== null) return { ok: false, failure: ancestry };
  if (immutable) {
    const receiptRoot = lstatOrNull(directory);
    if (receiptRoot === null || receiptRoot.isSymbolicLink() || !receiptRoot.isDirectory()) {
      return { ok: false, failure: 'ANCESTOR_NOT_A_DIRECTORY' };
    }
  }

  // 3. Leaf type. An existing leaf may be a regular file; anything else —
  //    symlink, directory, device, FIFO, socket — is a refusal, never a follow.
  if (!immutable && fs.existsSync(request.destination)) {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(request.destination);
    } catch {
      return { ok: false, failure: 'LEAF_NOT_A_REGULAR_FILE' };
    }
    if (stat.isSymbolicLink()) return { ok: false, failure: 'LEAF_SYMLINK' };
    if (!stat.isFile()) return { ok: false, failure: 'LEAF_NOT_A_REGULAR_FILE' };
    if ((stat.mode & 0o777) !== REQUIRED_MODE) return { ok: false, failure: 'LEAF_MODE_UNSAFE' };
  }

  if (request.profile === 'APPEND_IMMUTABLE') {
    const nowMs = request.nowMs ?? Date.now();
    for (let attempt = 0; attempt < MAX_IMMUTABLE_NAME_ATTEMPTS; attempt += 1) {
      const candidate = path.join(directory, immutableName(directory, digest, nowMs, attempt));
      const staged = stageBytes(directory, bytes);
      if (!staged.ok) return { ok: false, failure: staged.failure };
      try {
        // POSIX link creation is atomic and fails with EEXIST without
        // replacing an existing regular file, directory, or symlink.
        fs.linkSync(staged.temporary, candidate);
      } catch (error) {
        discardTemporary(staged.temporary);
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EEXIST') continue;
        if (code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EINVAL' || code === 'EPERM') {
          return { ok: false, failure: 'COMMIT_UNSUPPORTED' };
        }
        return { ok: false, failure: 'COMMIT_FAILED' };
      }
      discardTemporary(staged.temporary);
      const sync = fsyncDirectory(directory);
      if (sync !== null) return { ok: false, failure: sync };
      const observed = Buffer.byteLength(bytes);
      if (fs.statSync(candidate).size !== observed) return { ok: false, failure: 'VERIFICATION_FAILED' };
      return { ok: true, profile: request.profile, path: candidate, bytes: observed, digest };
    }
    return { ok: false, failure: 'IMMUTABLE_NAME_EXHAUSTED' };
  }

  // 4. CURRENT_REPLACE: same-directory exclusive staging, then an atomic rename
  //    onto the destination. An observer therefore sees the preceding complete
  //    report or the new complete report, never a truncated intermediate.
  const staged = stageBytes(directory, bytes);
  if (!staged.ok) return { ok: false, failure: staged.failure };
  try {
    fs.chmodSync(staged.temporary, REQUIRED_MODE);
    // Re-verify the ancestry immediately before the commit, so a destination
    // that became unsafe after the earlier check is never replaced.
    const finalAncestry = ensureDirectory(path.dirname(request.destination), false);
    if (finalAncestry !== null) return { ok: false, failure: finalAncestry };
    fs.renameSync(staged.temporary, request.destination);
  } catch (error) {
    discardTemporary(staged.temporary);
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EINVAL' || code === 'EPERM') {
      return { ok: false, failure: 'COMMIT_UNSUPPORTED' };
    }
    return { ok: false, failure: 'COMMIT_FAILED' };
  }
  const sync = fsyncDirectory(directory);
  if (sync !== null) return { ok: false, failure: sync };
  try {
    const committed = fs.lstatSync(request.destination);
    if (committed.isSymbolicLink() || !committed.isFile()) return { ok: false, failure: 'VERIFICATION_FAILED' };
    if (committed.size !== Buffer.byteLength(bytes)) return { ok: false, failure: 'VERIFICATION_FAILED' };
  } catch {
    return { ok: false, failure: 'VERIFICATION_FAILED' };
  }
  return {
    ok: true,
    profile: request.profile,
    path: request.destination,
    bytes: Buffer.byteLength(bytes),
    digest,
  };
}
