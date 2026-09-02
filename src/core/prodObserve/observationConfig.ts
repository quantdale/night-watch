// ---------------------------------------------------------------------------
// Nightwatch C-11 — external-only production observation configuration (F-09).
//
// The historical design proposed `config/observation/prod.v1.json` inside the
// repository. D-4's strength is that the only in-repo production artifact
// CANNOT BE LOADED; adding a second, loadable, in-repo file containing
// production hosts substitutes a naming convention for a structural property.
//
// So the configuration is external-only, on the same discipline as
// storage state (D-13/D-20) and for the same reason: absolute path, outside
// the Nightwatch repository, outside the Alphaus workspace, regular file,
// non-symlink, owner-only `0600`, named by a dedicated environment variable.
//
// The allowlist this yields is a SEPARATE structure. Per F-10,
// `KNOWN_PRODUCTION_HOSTS` stays deny-only in every mode, and this module must
// never import it — a table that means "deny" in three modes and "allow" in a
// fourth is one boolean from catastrophe. A hardening rule enforces the
// non-import; the absence of the import here is the point.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

export const PROD_OBSERVE_CONFIG_ENV = 'NIGHTWATCH_PROD_OBSERVE_CONFIG' as const;
export const PROD_OBSERVE_CONFIG_SCHEMA = 'nightwatch.prod-observe-config.v1' as const;

export const CONFIG_INTEGRITY_FAILURES = [
  'CONFIG_ENV_ABSENT',
  'CONFIG_PATH_NOT_ABSOLUTE',
  'CONFIG_PATH_TRAVERSAL',
  'CONFIG_INSIDE_REPOSITORY',
  'CONFIG_INSIDE_WORKSPACE',
  'CONFIG_NOT_FOUND',
  'CONFIG_SYMLINK',
  'CONFIG_NOT_REGULAR_FILE',
  'CONFIG_MODE_NOT_OWNER_ONLY',
  'CONFIG_UNREADABLE',
  'CONFIG_MALFORMED',
  'CONFIG_SCHEMA_UNSUPPORTED',
  'CONFIG_ALLOWLIST_EMPTY',
  'CONFIG_ALLOWLIST_INVALID',
  'CONFIG_WINDOW_INVALID',
] as const;

export type ConfigIntegrityFailure = (typeof CONFIG_INTEGRITY_FAILURES)[number];

export interface ObservationWindow {
  readonly notBeforeMs: number;
  readonly notAfterMs: number;
}

export interface ProdObserveConfig {
  readonly schemaVersion: typeof PROD_OBSERVE_CONFIG_SCHEMA;
  /** The ONLY source of production host admissibility. Never a deny-table inversion. */
  readonly admittedHosts: readonly string[];
  readonly observationWindow: ObservationWindow;
  /** Digest over the canonical config, for the receipt. Carries no host value. */
  readonly configIdentity: string;
}

export type ConfigLoadResult =
  | { readonly ok: true; readonly config: ProdObserveConfig }
  | { readonly ok: false; readonly failure: ConfigIntegrityFailure };

export interface ConfigLoadRequest {
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

// Hostnames only, and deliberately restrictive. A wildcard, a scheme, a port or
// a path here would widen admission in a way the gate cannot reason about.
const HOST_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

export function loadProdObserveConfig(request: ConfigLoadRequest): ConfigLoadResult {
  const environment = request.environment ?? process.env;
  const requested = environment[PROD_OBSERVE_CONFIG_ENV];
  if (typeof requested !== 'string' || requested.trim() === '') return { ok: false, failure: 'CONFIG_ENV_ABSENT' };
  if (!path.isAbsolute(requested)) return { ok: false, failure: 'CONFIG_PATH_NOT_ABSOLUTE' };
  // Checked on the LITERAL request, before normalization can hide it.
  if (requested.split(/[\\/]+/).includes('..')) return { ok: false, failure: 'CONFIG_PATH_TRAVERSAL' };

  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(requested);
  } catch {
    return { ok: false, failure: 'CONFIG_NOT_FOUND' };
  }
  // Refused, never followed: a symlink could point back into the repository
  // after the containment checks passed.
  if (stat.isSymbolicLink()) return { ok: false, failure: 'CONFIG_SYMLINK' };
  if (!stat.isFile()) return { ok: false, failure: 'CONFIG_NOT_REGULAR_FILE' };
  // Owner-only. A group- or world-readable production host list is a leak.
  if ((stat.mode & 0o077) !== 0) return { ok: false, failure: 'CONFIG_MODE_NOT_OWNER_ONLY' };

  const real = realPathOrNull(requested);
  if (real === null) return { ok: false, failure: 'CONFIG_UNREADABLE' };
  const realRepository = realPathOrNull(request.repositoryRoot);
  if (realRepository !== null && (real === realRepository || isWithin(realRepository, real))) {
    return { ok: false, failure: 'CONFIG_INSIDE_REPOSITORY' };
  }
  const realWorkspace = realPathOrNull(request.workspaceRoot);
  if (realWorkspace !== null && (real === realWorkspace || isWithin(realWorkspace, real))) {
    return { ok: false, failure: 'CONFIG_INSIDE_WORKSPACE' };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(real, 'utf8');
  } catch {
    return { ok: false, failure: 'CONFIG_UNREADABLE' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, failure: 'CONFIG_MALFORMED' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, failure: 'CONFIG_MALFORMED' };
  const value = parsed as Record<string, unknown>;
  if (value.schemaVersion !== PROD_OBSERVE_CONFIG_SCHEMA) return { ok: false, failure: 'CONFIG_SCHEMA_UNSUPPORTED' };

  const hosts = value.admittedHosts;
  if (!Array.isArray(hosts)) return { ok: false, failure: 'CONFIG_ALLOWLIST_INVALID' };
  // An empty allowlist is refused rather than treated as "allow nothing": an
  // empty admission table almost always means a malformed or truncated config,
  // and failing closed here surfaces that instead of silently qualifying.
  if (hosts.length === 0) return { ok: false, failure: 'CONFIG_ALLOWLIST_EMPTY' };
  const admitted: string[] = [];
  for (const host of hosts) {
    if (typeof host !== 'string' || !HOST_RE.test(host)) return { ok: false, failure: 'CONFIG_ALLOWLIST_INVALID' };
    admitted.push(host);
  }

  const window = value.observationWindow;
  if (window === null || typeof window !== 'object' || Array.isArray(window)) return { ok: false, failure: 'CONFIG_WINDOW_INVALID' };
  const notBeforeMs = (window as Record<string, unknown>).notBeforeMs;
  const notAfterMs = (window as Record<string, unknown>).notAfterMs;
  if (typeof notBeforeMs !== 'number' || typeof notAfterMs !== 'number'
    || !Number.isFinite(notBeforeMs) || !Number.isFinite(notAfterMs) || notAfterMs <= notBeforeMs) {
    return { ok: false, failure: 'CONFIG_WINDOW_INVALID' };
  }

  const canonicalHosts = [...admitted].sort();
  const canonical = JSON.stringify({
    schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA,
    admittedHostCount: canonicalHosts.length,
    // The digest binds the host SET without the receipt ever carrying a host.
    admittedHosts: canonicalHosts,
    observationWindow: { notBeforeMs, notAfterMs },
  });

  return {
    ok: true,
    config: Object.freeze({
      schemaVersion: PROD_OBSERVE_CONFIG_SCHEMA,
      admittedHosts: Object.freeze(canonicalHosts),
      observationWindow: Object.freeze({ notBeforeMs, notAfterMs }),
      configIdentity: `prodobscfg:${request.digest(canonical)}`,
    }),
  };
}

/**
 * Host admission. The ONLY question asked is "is this host explicitly present
 * in the external allowlist". There is deliberately no fallback, no pattern
 * match, no suffix rule and no deny-table consultation: a host is admissible
 * because the owner listed it, or it is not admissible.
 */
export function isAdmittedProductionHost(config: ProdObserveConfig, host: string): boolean {
  if (typeof host !== 'string' || host === '') return false;
  return config.admittedHosts.includes(host.toLowerCase());
}
