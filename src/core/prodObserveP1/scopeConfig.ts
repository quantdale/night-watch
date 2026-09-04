// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — external-only P1 observation-scope configuration.
//
// P1 scope is supplied EXTERNALLY, on the same discipline as C-11's
// observation config and storage state (D-13/D-20): absolute path, outside
// the Nightwatch repository, outside the Alphaus workspace, regular file,
// non-symlink, owner-only `0600`, named by a dedicated environment variable.
//
// The admitted host this yields is a SINGLE exact hostname. Per §17 there is
// no wildcard expansion, no scheme/port/path, no guessed host, and no
// deny-table inversion anywhere in this cone: the question asked is only "is
// this host exactly the admitted one". Absence of explicit admission denies.
//
// This module DUPLICATES the C-11 loader discipline rather than importing
// it, for the same F-12 reason recorded in `authorization.ts`: the C-11
// reverse-isolation rule fails non-test files outside `src/core/prodObserve/`
// that import `core/prodObserve`. The schema is P1-specific (subject scope,
// duration cap, evidence destination, implementation binding), so sharing
// would couple two different authorities anyway.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

export const P1_SCOPE_CONFIG_ENV = 'NIGHTWATCH_P1_SCOPE_CONFIG' as const;
export const P1_SCOPE_CONFIG_SCHEMA = 'nightwatch.p1-scope-config.v1' as const;

/** No P1 attachment may outlive this bound, however wide the window reads. */
export const P1_MAX_OBSERVATION_WINDOW_MS = 900_000 as const;

export const P1_CONFIG_INTEGRITY_FAILURES = [
  'P1_CONFIG_ENV_ABSENT',
  'P1_CONFIG_PATH_NOT_ABSOLUTE',
  'P1_CONFIG_PATH_TRAVERSAL',
  'P1_CONFIG_INSIDE_REPOSITORY',
  'P1_CONFIG_INSIDE_WORKSPACE',
  'P1_CONFIG_NOT_FOUND',
  'P1_CONFIG_SYMLINK',
  'P1_CONFIG_NOT_REGULAR_FILE',
  'P1_CONFIG_MODE_NOT_OWNER_ONLY',
  'P1_CONFIG_UNREADABLE',
  'P1_CONFIG_MALFORMED',
  'P1_CONFIG_SCHEMA_UNSUPPORTED',
  'P1_CONFIG_HOST_INVALID',
  'P1_CONFIG_WINDOW_INVALID',
  'P1_CONFIG_WINDOW_EXCESSIVE',
  'P1_CONFIG_DESTINATION_INVALID',
  'P1_CONFIG_IMPLEMENTATION_IDENTITY_INVALID',
] as const;

export type P1ConfigIntegrityFailure = (typeof P1_CONFIG_INTEGRITY_FAILURES)[number];

export interface P1ObservationWindow {
  readonly notBeforeMs: number;
  readonly notAfterMs: number;
}

export interface P1ScopeConfig {
  readonly schemaVersion: typeof P1_SCOPE_CONFIG_SCHEMA;
  /** The ONLY source of P1 host admissibility. Exactly one hostname. Never a deny-table inversion. */
  readonly admittedHost: string;
  readonly observationWindow: P1ObservationWindow;
  /** Upper bound on any single observation session, even inside a wider window. */
  readonly maxObservationDurationMs: number;
  /** Private production evidence root. Must resolve outside repository and workspace. */
  readonly evidenceDestination: string;
  /** The implementation SHA this scope is bound to. Compared against the grant by `P1_IMPLEMENTATION_IDENTITY`. */
  readonly expectedImplementationSha: string;
  /** Digest over the canonical config, for the receipt. Carries no host value. */
  readonly configIdentity: string;
}

export type P1ScopeConfigLoadResult =
  | { readonly ok: true; readonly config: P1ScopeConfig }
  | { readonly ok: false; readonly failure: P1ConfigIntegrityFailure };

export interface P1ScopeConfigLoadRequest {
  readonly environment?: Record<string, string | undefined>;
  /** The Nightwatch repository root; the config must lie outside it. */
  readonly repositoryRoot: string;
  /** The Alphaus workspace root; the config must lie outside it too. */
  readonly workspaceRoot: string;
  /** Injected so a test can compute a digest without a real crypto dependency here. */
  readonly digest: (canonical: string) => string;
}

function realPathOrNull(candidate: string): string | null {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return null;
  }
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Hostnames only, and deliberately restrictive. A wildcard, a scheme, a port
// or a path here would widen admission in a way the gate cannot reason about.
const HOST_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
const SHA_RE = /^[0-9a-f]{40}$/;

export function loadP1ScopeConfig(request: P1ScopeConfigLoadRequest): P1ScopeConfigLoadResult {
  const environment = request.environment ?? process.env;
  const requested = environment[P1_SCOPE_CONFIG_ENV];
  if (typeof requested !== 'string' || requested.trim() === '') {
    return { ok: false, failure: 'P1_CONFIG_ENV_ABSENT' };
  }
  if (!path.isAbsolute(requested)) return { ok: false, failure: 'P1_CONFIG_PATH_NOT_ABSOLUTE' };
  // Checked on the LITERAL request, before normalization can hide it.
  if (requested.split(/[\\/]+/).includes('..')) return { ok: false, failure: 'P1_CONFIG_PATH_TRAVERSAL' };

  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(requested);
  } catch {
    return { ok: false, failure: 'P1_CONFIG_NOT_FOUND' };
  }
  // Refused, never followed: a symlink could point back into the repository
  // after the containment checks passed.
  if (stat.isSymbolicLink()) return { ok: false, failure: 'P1_CONFIG_SYMLINK' };
  if (!stat.isFile()) return { ok: false, failure: 'P1_CONFIG_NOT_REGULAR_FILE' };
  // Owner-only. A group- or world-readable P1 scope file is a leak.
  if ((stat.mode & 0o077) !== 0) return { ok: false, failure: 'P1_CONFIG_MODE_NOT_OWNER_ONLY' };

  const real = realPathOrNull(requested);
  if (real === null) return { ok: false, failure: 'P1_CONFIG_UNREADABLE' };
  const realRepository = realPathOrNull(request.repositoryRoot);
  if (realRepository !== null && (real === realRepository || isWithin(realRepository, real))) {
    return { ok: false, failure: 'P1_CONFIG_INSIDE_REPOSITORY' };
  }
  const realWorkspace = realPathOrNull(request.workspaceRoot);
  if (realWorkspace !== null && (real === realWorkspace || isWithin(realWorkspace, real))) {
    return { ok: false, failure: 'P1_CONFIG_INSIDE_WORKSPACE' };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(real, 'utf8');
  } catch {
    return { ok: false, failure: 'P1_CONFIG_UNREADABLE' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, failure: 'P1_CONFIG_MALFORMED' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, failure: 'P1_CONFIG_MALFORMED' };
  }
  const value = parsed as Record<string, unknown>;
  if (value.schemaVersion !== P1_SCOPE_CONFIG_SCHEMA) {
    return { ok: false, failure: 'P1_CONFIG_SCHEMA_UNSUPPORTED' };
  }

  const admittedHost = value.admittedHost;
  if (typeof admittedHost !== 'string' || !HOST_RE.test(admittedHost)) {
    return { ok: false, failure: 'P1_CONFIG_HOST_INVALID' };
  }

  const window = value.observationWindow;
  if (window === null || typeof window !== 'object' || Array.isArray(window)) {
    return { ok: false, failure: 'P1_CONFIG_WINDOW_INVALID' };
  }
  const windowRecord = window as Record<string, unknown>;
  const notBeforeMs = windowRecord.notBeforeMs;
  const notAfterMs = windowRecord.notAfterMs;
  if (
    typeof notBeforeMs !== 'number' ||
    typeof notAfterMs !== 'number' ||
    !Number.isFinite(notBeforeMs) ||
    !Number.isFinite(notAfterMs) ||
    notAfterMs <= notBeforeMs
  ) {
    return { ok: false, failure: 'P1_CONFIG_WINDOW_INVALID' };
  }
  if (notAfterMs - notBeforeMs > P1_MAX_OBSERVATION_WINDOW_MS) {
    return { ok: false, failure: 'P1_CONFIG_WINDOW_EXCESSIVE' };
  }

  const maxObservationDurationMs = value.maxObservationDurationMs;
  if (
    typeof maxObservationDurationMs !== 'number' ||
    !Number.isFinite(maxObservationDurationMs) ||
    maxObservationDurationMs <= 0 ||
    maxObservationDurationMs > P1_MAX_OBSERVATION_WINDOW_MS
  ) {
    return { ok: false, failure: 'P1_CONFIG_WINDOW_EXCESSIVE' };
  }

  const evidenceDestination = value.evidenceDestination;
  if (typeof evidenceDestination !== 'string' || !path.isAbsolute(evidenceDestination)) {
    return { ok: false, failure: 'P1_CONFIG_DESTINATION_INVALID' };
  }
  if (evidenceDestination.split(/[\\/]+/).includes('..')) {
    return { ok: false, failure: 'P1_CONFIG_DESTINATION_INVALID' };
  }
  const realDestination = realPathOrNull(evidenceDestination) ?? path.normalize(evidenceDestination);
  if (realRepository !== null && (realDestination === realRepository || isWithin(realRepository, realDestination))) {
    return { ok: false, failure: 'P1_CONFIG_DESTINATION_INVALID' };
  }
  if (realWorkspace !== null && (realDestination === realWorkspace || isWithin(realWorkspace, realDestination))) {
    return { ok: false, failure: 'P1_CONFIG_DESTINATION_INVALID' };
  }

  const expectedImplementationSha = value.expectedImplementationSha;
  if (typeof expectedImplementationSha !== 'string' || !SHA_RE.test(expectedImplementationSha)) {
    return { ok: false, failure: 'P1_CONFIG_IMPLEMENTATION_IDENTITY_INVALID' };
  }

  const canonical = JSON.stringify({
    schemaVersion: P1_SCOPE_CONFIG_SCHEMA,
    admittedHost,
    observationWindow: { notBeforeMs, notAfterMs },
    maxObservationDurationMs,
  });

  return {
    ok: true,
    config: Object.freeze({
      schemaVersion: P1_SCOPE_CONFIG_SCHEMA,
      admittedHost,
      observationWindow: Object.freeze({ notBeforeMs, notAfterMs }),
      maxObservationDurationMs,
      evidenceDestination,
      expectedImplementationSha,
      configIdentity: `p1scopecfg:${request.digest(canonical)}`,
    }),
  };
}

/**
 * Host admission. The ONLY question asked is "is this host exactly the
 * admitted one". Lowercase exact match; nothing is expanded, guessed, or
 * inverted from any other table.
 */
export function isAdmittedP1Host(config: P1ScopeConfig, host: string): boolean {
  return typeof host === 'string' && host.toLowerCase() === config.admittedHost.toLowerCase();
}
