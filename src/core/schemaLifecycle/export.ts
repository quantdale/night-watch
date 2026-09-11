// ---------------------------------------------------------------------------
// Schema version lifecycle — bounded sanitized export.
//
// Before a migration can be attempted, or an orphan accepted, the owner must
// be able to preserve the records. This export is deliberately narrow:
//
//   - it is READ-ONLY over the source records;
//   - every string passes the existing redaction layer, so registered secrets
//     and secret shapes are scrubbed exactly as evidence already is;
//   - absolute private paths are replaced with a marker, because a dump of
//     owner state must not carry the owner's filesystem layout;
//   - secret-shaped keys are dropped whole;
//   - depth, key count, array length and total byte size are bounded, so an
//     adversarial record cannot turn the export into an unbounded operation;
//   - the destination must be an absolute path OUTSIDE the repository and is
//     written owner-only (0600). It is never referenced by any gate.
//
// The sanitizer is pure and unit-testable with a fake redaction layer; the
// writer is the only fs surface and is isolated at the bottom of the file.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { RedactionLayer } from '../safety/redaction';

export const SCHEMA_EXPORT_VERSION = 'nightwatch.schema-export.v1' as const;

export const SCHEMA_EXPORT_LIMITS = Object.freeze({
  maxDepth: 12,
  maxKeysPerRecord: 256,
  maxArrayLength: 512,
  maxRecords: 10_000,
  maxBytes: 64 * 1024 * 1024,
  maxStringLength: 16_384,
});

const SECRET_KEY_RE = /(?:authorization|cookie|token|secret|password|passwd|credential|api[_-]?key|private[_-]?key|session|csrf)/i;
const ABSOLUTE_PATH_RE = /(?:\/[\w.@+-]+){2,}/g;
const WINDOWS_PATH_RE = /\b[A-Za-z]:\\(?:[^\\\s]+\\?)+/g;

function scrubText(text: string, redaction: RedactionLayer): string {
  const scrubbed = redaction.redactText(text);
  return scrubbed.replace(ABSOLUTE_PATH_RE, '[REDACTED:path]').replace(WINDOWS_PATH_RE, '[REDACTED:path]');
}

export interface SanitizedExportInput {
  /** Owner-facing store name; must be a bounded safe token. */
  readonly store: string;
  /** The records read, in deterministic order. Never mutated. */
  readonly records: readonly unknown[];
  readonly redaction: RedactionLayer;
  readonly limits?: typeof SCHEMA_EXPORT_LIMITS;
}

export interface SanitizedExport {
  readonly schemaVersion: typeof SCHEMA_EXPORT_VERSION;
  readonly store: string;
  readonly recordCount: number;
  readonly truncated: boolean;
  readonly limits: typeof SCHEMA_EXPORT_LIMITS;
  readonly records: readonly unknown[];
}

function sanitizeValue(value: unknown, depth: number, limits: typeof SCHEMA_EXPORT_LIMITS, redaction: RedactionLayer): unknown {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    if (value.length > limits.maxStringLength) return `${scrubText(value.slice(0, limits.maxStringLength), redaction)}[TRUNCATED]`;
    return scrubText(value, redaction);
  }
  if (Array.isArray(value)) {
    if (depth >= limits.maxDepth) return '[TRUNCATED:depth]';
    return value.slice(0, limits.maxArrayLength).map((item) => sanitizeValue(item, depth + 1, limits, redaction));
  }
  if (typeof value === 'object') {
    if (depth >= limits.maxDepth) return '[TRUNCATED:depth]';
    const out: Record<string, unknown> = {};
    let keys = 0;
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (SECRET_KEY_RE.test(key)) continue;
      if (keys >= limits.maxKeysPerRecord) {
        out['[TRUNCATED:keys]'] = true;
        break;
      }
      keys += 1;
      out[key] = sanitizeValue((value as Record<string, unknown>)[key], depth + 1, limits, redaction);
    }
    return out;
  }
  return null;
}

/**
 * Pure bounded sanitizer. A `store` that is not a safe token fails closed: a
 * free-form store name would be an unredacted string channel.
 */
export function buildSanitizedExport(input: SanitizedExportInput): SanitizedExport {
  if (!/^[A-Za-z0-9_.:-]{1,96}$/.test(input.store)) throw new Error('SCHEMA_EXPORT_STORE_INVALID');
  const limits = input.limits ?? SCHEMA_EXPORT_LIMITS;
  const bounded = input.records.slice(0, limits.maxRecords);
  const records = bounded.map((record) => sanitizeValue(record, 0, limits, input.redaction));
  const serialized = JSON.stringify(records);
  if (Buffer.byteLength(serialized, 'utf8') > limits.maxBytes) throw new Error('SCHEMA_EXPORT_OVERSIZED');
  return {
    schemaVersion: SCHEMA_EXPORT_VERSION,
    store: input.store,
    recordCount: records.length,
    truncated: input.records.length > bounded.length,
    limits,
    records,
  };
}

export function serializeSanitizedExport(exported: SanitizedExport): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

export interface WriteExportInput {
  /** Absolute destination. It must lie outside `repositoryRoot`. */
  readonly destination: string;
  readonly repositoryRoot: string;
  readonly content: string;
}

/**
 * Write the sanitized export outside the repository, owner-only. No symlink
 * destination is followed, and no repository-relative path is accepted.
 */
export function writeSanitizedExport(input: WriteExportInput): string {
  if (!path.isAbsolute(input.destination)) throw new Error('SCHEMA_EXPORT_DESTINATION_NOT_ABSOLUTE');
  const resolved = path.resolve(input.destination);
  const repositoryRoot = path.resolve(input.repositoryRoot);
  if (resolved === repositoryRoot || resolved.startsWith(repositoryRoot + path.sep)) {
    throw new Error('SCHEMA_EXPORT_DESTINATION_INSIDE_REPOSITORY');
  }
  if (fs.existsSync(resolved)) {
    if (fs.lstatSync(resolved).isSymbolicLink()) throw new Error('SCHEMA_EXPORT_DESTINATION_SYMLINK');
    throw new Error('SCHEMA_EXPORT_DESTINATION_EXISTS');
  }
  const directory = path.dirname(resolved);
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('SCHEMA_EXPORT_DESTINATION_UNSAFE');
  fs.writeFileSync(resolved, input.content, { mode: 0o600, flag: 'wx' });
  fs.chmodSync(resolved, 0o600);
  return resolved;
}
