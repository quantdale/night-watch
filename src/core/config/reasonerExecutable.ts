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

import { prefixedDigest24 } from '../identity/canonicalDigest';

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

/**
 * M5 (6.4/NW-AUD-044): the FULL reasoner identity a run is attributable to.
 * Digests cover the executable, the adapter, the print CLI and `PRINT_ARGS`,
 * plus the provider and model labels; `identityDigest` content-addresses the
 * whole thing so a resume can refuse a changed reasoner before any turn.
 */
export interface ResolvedReasonerRuntimeIdentity {
  readonly schemaVersion: typeof REASONER_IDENTITY_VERSION;
  readonly executablePath: string;
  readonly executableDigest: string;
  readonly adapterPath: string | null;
  readonly adapterDigest: string | null;
  readonly printCliPath: string | null;
  readonly printCliDigest: string | null;
  /** `rpa:sha256:<24>` over the normalized `PRINT_ARGS` string. */
  readonly printArgsDigest: string | null;
  readonly provider: string;
  readonly model: string;
  /** `rid:sha256:<24>` over every field above (the model label included). */
  readonly identityDigest: string;
}

const IDENTITY_LABEL_RE = /^[A-Za-z0-9._:/-]{1,128}$/;

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

/** Bound on the PATH scan for a bare print-CLI name. */
const MAX_PATH_ENTRIES = 64;

/**
 * Digest one identity component. A missing or non-regular target yields null
 * (the identity reports what it could NOT prove rather than a placeholder).
 */
function tryDigestComponent(value: string | null | undefined):
  | { readonly path: string; readonly digest: string }
  | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const candidate = value.trim();
  if (candidate.includes('\0')) return null;
  const direct = path.isAbsolute(candidate) || candidate.includes('/')
    ? (path.isAbsolute(candidate) ? candidate : null)
    : null;
  if (direct !== null) {
    try {
      const canonical = fs.realpathSync(direct);
      const stat = fs.statSync(canonical);
      if (!stat.isFile()) return null;
      return { path: canonical, digest: digestRegularFile(canonical).digest };
    } catch {
      return null;
    }
  }
  // A bare name (for example `opencode`): bounded PATH scan, first hit wins.
  const entries = (process.env.PATH ?? '').split(path.delimiter).filter((entry) => entry.length > 0);
  for (const entry of entries.slice(0, MAX_PATH_ENTRIES)) {
    const target = path.join(entry, candidate);
    try {
      const canonical = fs.realpathSync(target);
      const stat = fs.statSync(canonical);
      if (!stat.isFile()) continue;
      return { path: canonical, digest: digestRegularFile(canonical).digest };
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Compose the full reasoner runtime identity. Labels are validated, never
 * silently rewritten: an unusable label refuses before any process exists.
 */
export function resolveReasonerRuntimeIdentity(input: {
  readonly executable: string;
  readonly adapterPath?: string | null;
  readonly printCli?: string | null;
  readonly printArgs?: string | null;
  readonly provider?: string | null;
  readonly model?: string | null;
}): ResolvedReasonerRuntimeIdentity {
  const executable = resolveReasonerExecutable(input.executable);
  const adapter = tryDigestComponent(input.adapterPath ?? null);
  const printCli = tryDigestComponent(input.printCli ?? null);
  const printArgs =
    typeof input.printArgs === 'string' && input.printArgs.trim().length > 0
      ? prefixedDigest24('rpa', input.printArgs.trim())
      : null;
  const provider = normalizeLabel(input.provider, 'provider');
  const model = normalizeLabel(input.model, 'model');
  const identityDigest = prefixedDigest24('rid', {
    version: REASONER_IDENTITY_VERSION,
    executablePath: executable.path,
    executableDigest: executable.digest,
    adapterPath: adapter?.path ?? null,
    adapterDigest: adapter?.digest ?? null,
    printCliPath: printCli?.path ?? null,
    printCliDigest: printCli?.digest ?? null,
    printArgsDigest: printArgs,
    provider,
    model,
  });
  return Object.freeze({
    schemaVersion: REASONER_IDENTITY_VERSION,
    executablePath: executable.path,
    executableDigest: executable.digest,
    adapterPath: adapter?.path ?? null,
    adapterDigest: adapter?.digest ?? null,
    printCliPath: printCli?.path ?? null,
    printCliDigest: printCli?.digest ?? null,
    printArgsDigest: printArgs,
    provider,
    model,
    identityDigest,
  });
}

function normalizeLabel(value: string | null | undefined, field: string): string {
  const candidate = typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'configured';
  if (!IDENTITY_LABEL_RE.test(candidate)) {
    refuse('REASONER_IDENTITY_LABEL_MALFORMED', `${field} label must match [A-Za-z0-9._:/-], 1-128 chars`);
  }
  return candidate;
}
