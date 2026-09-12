// ---------------------------------------------------------------------------
// Nightwatch — the reasoner-executable surface.
//
// F-19. `NIGHTWATCH_REASONER_CLI` names the one program the local campaign
// engine spawns, and it was undocumented and unvalidated. This module resolves
// it to the exact absolute, existing, executable regular file that will be
// spawned, without shell interpretation, and records a content digest so a
// campaign's reasoner identity is attributable after the fact.
//
// Pure process mechanics: no spawn, no network, no environment mutation.
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const REASONER_IDENTITY_VERSION = 'nightwatch.reasoner-identity.v1' as const;
const MAX_EXECUTABLE_BYTES = 512 * 1024 * 1024;
const DIGEST_CHUNK_BYTES = 1024 * 1024;

export class ReasonerExecutableError extends Error {
  readonly code: string;
  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'ReasonerExecutableError';
    this.code = code;
  }
}

export interface ResolvedReasonerIdentity {
  readonly schemaVersion: typeof REASONER_IDENTITY_VERSION;
  /** The canonical, absolute executable path that will be spawned. */
  readonly path: string;
  /** `sha256:<64 hex>` over the exact bytes of the resolved regular file. */
  readonly digest: string;
  readonly sizeBytes: number;
}

function refuse(code: string, detail: string): never {
  throw new ReasonerExecutableError(code, detail);
}

/** Streamed, bounded digest of one regular file. Synchronous and allocation-bounded. */
function digestRegularFile(target: string): { readonly digest: string; readonly sizeBytes: number } {
  let fd: number;
  try {
    fd = fs.openSync(target, 'r');
  } catch {
    refuse('REASONER_EXECUTABLE_UNREADABLE', 'resolved executable cannot be opened');
  }
  const hash = createHash('sha256');
  const buffer = Buffer.alloc(DIGEST_CHUNK_BYTES);
  let sizeBytes = 0;
  try {
    for (;;) {
      const read = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (read <= 0) break;
      sizeBytes += read;
      if (sizeBytes > MAX_EXECUTABLE_BYTES) {
        refuse('REASONER_EXECUTABLE_TOO_LARGE', `executable exceeds ${MAX_EXECUTABLE_BYTES} bytes`);
      }
      hash.update(buffer.subarray(0, read));
    }
  } finally {
    fs.closeSync(fd);
  }
  return { digest: `sha256:${hash.digest('hex')}`, sizeBytes };
}

/**
 * Validate `NIGHTWATCH_REASONER_CLI` (or the process.execPath default) and
 * return the resolved identity. The value is never passed to a shell: the
 * resolver only canonicalizes a filesystem path, and the caller spawns it as
 * `spawn(path, argv, { shell: false })` with argv passed literally.
 */
export function resolveReasonerExecutable(value: string): ResolvedReasonerIdentity {
  if (typeof value !== 'string' || value.trim().length === 0) {
    refuse('REASONER_EXECUTABLE_MISSING', 'reasoner executable is not configured');
  }
  const candidate = value.trim();
  if (candidate.includes('\0')) refuse('REASONER_EXECUTABLE_MALFORMED', 'executable contains NUL');
  if (!path.isAbsolute(candidate)) {
    refuse('REASONER_EXECUTABLE_NOT_ABSOLUTE', 'executable must be an absolute path');
  }
  let canonical: string;
  try {
    canonical = fs.realpathSync(candidate);
  } catch {
    refuse('REASONER_EXECUTABLE_MISSING', 'executable path does not exist');
  }
  let stat: fs.Stats;
  try {
    stat = fs.statSync(canonical);
  } catch {
    refuse('REASONER_EXECUTABLE_UNREADABLE', 'executable cannot be stat-ed');
  }
  if (!stat.isFile()) refuse('REASONER_EXECUTABLE_NOT_A_FILE', 'executable is not a regular file');
  if ((stat.mode & 0o111) === 0) refuse('REASONER_EXECUTABLE_NOT_EXECUTABLE', 'executable has no execute bit');
  const { digest, sizeBytes } = digestRegularFile(canonical);
  return Object.freeze({
    schemaVersion: REASONER_IDENTITY_VERSION,
    path: canonical,
    digest,
    sizeBytes,
  });
}
