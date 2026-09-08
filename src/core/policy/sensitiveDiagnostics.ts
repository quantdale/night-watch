// ---------------------------------------------------------------------------
// NW-13 — content-free diagnostics for sensitive read boundaries.
//
// A parser message is not a safe thing to forward. `JSON.parse` puts a window
// of the INPUT into `SyntaxError.message`, and `fs` errors carry absolute
// paths. Both then travel wherever the thrown error goes: a terminal, a CI
// log, a captured artifact.
//
// Measured on Node 22.22.1, the JSON leak is a window of roughly twenty
// characters centred on the offending token:
//
//   Unexpected token 'o', ..."_ABCDEF": oops}" is not valid JSON
//
// so the excerpt can be a prefix, a middle fragment, or a suffix of a secret
// depending on where the malformation sits. The invariant is therefore "no
// fragment", not "no prefix".
//
// A sensitive boundary reports a CATEGORY plus, at most, an allowlisted
// machine-readable fragment:
//
//   - the failure class, from a closed vocabulary;
//   - an errno code (`ENOENT`, `EACCES`, …), never the errno message;
//   - a byte count;
//   - a path digest and coarse path class, when the operator needs to tell
//     two locations apart without either being printed.
//
// Nothing derived from file CONTENT is ever included, and no native message is
// forwarded. The distinctions an operator needs — missing, unreadable,
// oversized, unsafe path, malformed JSON, schema-invalid — are all preserved,
// because collapsing them into one opaque failure would trade a privacy bug
// for a diagnosability bug.
//
// Pure: no I/O beyond hashing a string the caller already holds.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import path from 'node:path';
import { closedVocabulary } from '../agentProtocol/closedVocabulary';

export const SENSITIVE_READ_FAILURES = [
  'MISSING',
  'NOT_READABLE',
  'OVERSIZED',
  'UNSAFE_PATH',
  'MALFORMED_JSON',
  'SCHEMA_INVALID',
  'IO_ERROR',
] as const;
export type SensitiveReadFailure = (typeof SENSITIVE_READ_FAILURES)[number];

export const isSensitiveReadFailure = closedVocabulary(SENSITIVE_READ_FAILURES);

/** Coarse location class. Never the path itself. */
export const SENSITIVE_PATH_CLASSES = ['ABSOLUTE', 'RELATIVE'] as const;
export type SensitivePathClass = (typeof SENSITIVE_PATH_CLASSES)[number];

const ERRNO_CODE_RE = /^[A-Z][A-Z0-9_]{0,31}$/;

/**
 * The errno code alone. An `fs` error's `message` embeds the path and the
 * syscall; its `code` is a fixed token from a small set, which is the part an
 * operator can act on.
 */
export function errnoCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return typeof code === 'string' && ERRNO_CODE_RE.test(code) ? code : 'UNKNOWN';
}

export function sensitivePathClass(target: string): SensitivePathClass {
  return path.isAbsolute(target) ? 'ABSOLUTE' : 'RELATIVE';
}

/**
 * A stable short digest of a path, so two failures can be told apart and the
 * same location recognised across runs without printing it. Twelve hex
 * characters: enough to distinguish, too short to invert usefully.
 */
export function sensitivePathDigest(target: string): string {
  return createHash('sha256').update(target, 'utf8').digest('hex').slice(0, 12);
}

export interface SensitiveDiagnosticParts {
  /** What went wrong, from the closed vocabulary. */
  readonly failure: SensitiveReadFailure;
  /** The errno code, when the failure came from a syscall. */
  readonly errno?: string;
  /** Size in bytes, when the failure is about size. */
  readonly bytes?: number;
  /** The path whose digest and class may be reported. Never printed. */
  readonly target?: string;
}

/**
 * Render a diagnostic from allowlisted parts only. There is deliberately no
 * free-text parameter: a caller cannot pass content through this function
 * even by mistake.
 */
export function sensitiveDiagnostic(code: string, parts: SensitiveDiagnosticParts): string {
  if (!isSensitiveReadFailure(parts.failure)) throw new Error('SENSITIVE_DIAGNOSTIC_FAILURE_UNKNOWN');
  const fields = [`failure=${parts.failure}`];
  if (parts.errno !== undefined) {
    if (!ERRNO_CODE_RE.test(parts.errno)) throw new Error('SENSITIVE_DIAGNOSTIC_ERRNO_UNSAFE');
    fields.push(`errno=${parts.errno}`);
  }
  if (parts.bytes !== undefined) {
    if (!Number.isInteger(parts.bytes) || parts.bytes < 0) throw new Error('SENSITIVE_DIAGNOSTIC_BYTES_UNSAFE');
    fields.push(`bytes=${parts.bytes}`);
  }
  if (parts.target !== undefined) {
    fields.push(`pathClass=${sensitivePathClass(parts.target)}`);
    fields.push(`pathDigest=${sensitivePathDigest(parts.target)}`);
  }
  return `${code}: ${fields.join(' ')}`;
}
