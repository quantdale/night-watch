// ---------------------------------------------------------------------------
// Nightwatch — authenticated storage-state resolution (Phase 1.1 hardened).
//
// NIGHTWATCH_STORAGE_STATE, when set, points at a Playwright storage-state
// JSON file (cookies/localStorage from a prior login). The file is SECRET
// MATERIAL:
//   - never committed (see .gitignore);
//   - never copied into artifacts/;
//   - never printed or logged — Nightwatch only ever passes the path to
//     Playwright;
//   - never included in summary output.
//
// Hardened rules (fail closed — any violation THROWS):
//   1. path must be absolute;
//   2. file must exist, be a regular file, and be readable;
//   3. file must NOT live inside the Nightwatch repo or the Alphaus workspace
//      (REPOSITORIES/...) — it must be user-owned, outside source control;
//   4. size cap (5 MB);
//   5. content must parse as JSON with the Playwright storage-state shape:
//      { cookies: [...], origins: [...] }.
//
// Nightwatch validates the SHAPE but never reads cookie values for evidence.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

export const NIGHTWATCH_STORAGE_STATE_VAR = 'NIGHTWATCH_STORAGE_STATE';

export const MAX_STORAGE_STATE_BYTES = 5 * 1024 * 1024;

export interface StorageStateOptions {
  /** Nightwatch repo root (default: derived from this file). */
  nightwatchRoot?: string;
  /** Alphaus workspace root (default: parent of nightwatchRoot). */
  workspaceRoot?: string;
}

function defaultRoots(opts?: StorageStateOptions): { nightwatchRoot: string; workspaceRoot: string } {
  const nightwatchRoot = opts?.nightwatchRoot ?? path.resolve(__dirname, '..', '..', '..');
  const workspaceRoot = opts?.workspaceRoot ?? path.resolve(nightwatchRoot, '..');
  return { nightwatchRoot, workspaceRoot };
}

function isInside(dir: string, file: string): boolean {
  const rel = path.relative(dir, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Validate a storage-state path + content. Returns the canonical path. */
export function validateStorageStateFile(p: string, opts?: StorageStateOptions): string {
  const { nightwatchRoot, workspaceRoot } = defaultRoots(opts);
  const abs = path.resolve(p);

  if (!path.isAbsolute(p)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} must be an absolute path (got: ${p})`);
  }
  if (isInside(nightwatchRoot, abs)) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} must NOT live inside the Nightwatch repo (${nightwatchRoot}) — use an external user-owned location`
    );
  }
  if (isInside(workspaceRoot, abs)) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} must NOT live inside the Alphaus workspace (${workspaceRoot}) — use an external user-owned location`
    );
  }
  if (!fs.existsSync(abs)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} points to a missing file: ${abs}`);
  }
  const st = fs.statSync(abs);
  if (!st.isFile()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} is not a regular file: ${abs}`);
  }
  if (st.size > MAX_STORAGE_STATE_BYTES) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file exceeds ${MAX_STORAGE_STATE_BYTES} bytes: ${abs}`
    );
  }
  try {
    fs.accessSync(abs, fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file is not readable: ${abs}: ${(err as Error).message}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file is not valid JSON: ${abs}: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} must be a JSON object (Playwright storage state)`);
  }
  const cfg = parsed as Record<string, unknown>;
  if (!Array.isArray(cfg['cookies']) || !Array.isArray(cfg['origins'])) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} must have Playwright storage-state shape { cookies: [], origins: [] }`
    );
  }
  return abs;
}

export interface StorageStateKeyPresence {
  cookieNames: Readonly<Record<string, boolean>>;
  localStorageNames: Readonly<Record<string, boolean>>;
  originCount: number;
}

/**
 * Boolean-only semantic facts for the fixed, source-proven Ripple bootstrap
 * cookie keys. Unlike `inspectStorageStateKeyPresence`, this reads the cookie
 * VALUES into a function-local variable long enough to test non-empty/equality,
 * then returns ONLY booleans. The values themselves are never returned, logged,
 * registered as secrets, hashed, or written to evidence. Callers must pass the
 * fixed source-defined key names and expected constants.
 */
export interface StorageStateKeySemantics {
  authTokenPresent: boolean;
  authTokenStructurallyNonEmpty: boolean;
  apiTypePresent: boolean;
  apiTypeExpectedValue: string;
  apiTypeMatchesExpected: boolean;
  appTypePresent: boolean;
  appTypeExpectedValue: string;
  appTypeMatchesExpected: boolean;
}

export function inspectStorageStateKeySemantics(
  p: string,
  opts: {
    authTokenKey: string;
    apiTypeKey: string;
    apiTypeExpected: string;
    appTypeKey: string;
    appTypeExpected: string;
  },
): StorageStateKeySemantics {
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
  const cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
  const cookieMap = new Map<string, string>();
  for (const item of cookies) {
    if (item === null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.name !== 'string' || typeof record.value !== 'string') continue;
    cookieMap.set(record.name, record.value);
  }
  const authTokenValue = cookieMap.get(opts.authTokenKey);
  const apiTypeValue = cookieMap.get(opts.apiTypeKey);
  const appTypeValue = cookieMap.get(opts.appTypeKey);
  const authTokenPresent = authTokenValue !== undefined;
  const apiTypePresent = apiTypeValue !== undefined;
  const appTypePresent = appTypeValue !== undefined;
  return {
    authTokenPresent,
    authTokenStructurallyNonEmpty: authTokenPresent && authTokenValue.length > 0,
    apiTypePresent,
    apiTypeExpectedValue: opts.apiTypeExpected,
    apiTypeMatchesExpected: apiTypePresent && apiTypeValue === opts.apiTypeExpected,
    appTypePresent,
    appTypeExpectedValue: opts.appTypeExpected,
    appTypeMatchesExpected: appTypePresent && appTypeValue === opts.appTypeExpected,
  };
}

/**
 * Return presence booleans for a caller-supplied, source-defined key catalog.
 * This function intentionally does not return, log, hash, or register any
 * cookie/localStorage values. Callers must pass fixed key names rather than
 * names discovered from the state file.
 */
export function inspectStorageStateKeyPresence(
  p: string,
  keys: { cookie: readonly string[]; localStorage?: readonly string[] },
): StorageStateKeyPresence {
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
  const cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
  const origins = Array.isArray(parsed.origins) ? parsed.origins : [];
  const cookieNames = new Set(
    cookies
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => item.name)
      .filter((name): name is string => typeof name === 'string'),
  );
  const localStorageNames = new Set<string>();
  for (const origin of origins) {
    if (origin === null || typeof origin !== 'object') continue;
    const entries = (origin as Record<string, unknown>).localStorage;
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (entry === null || typeof entry !== 'object') continue;
      const name = (entry as Record<string, unknown>).name;
      if (typeof name === 'string') localStorageNames.add(name);
    }
  }
  return {
    cookieNames: Object.fromEntries(keys.cookie.map((key) => [key, cookieNames.has(key)])),
    localStorageNames: Object.fromEntries((keys.localStorage ?? []).map((key) => [key, localStorageNames.has(key)])),
    originCount: origins.length,
  };
}

/**
 * Validate a destination before a human-led capture writes secret state.
 * The destination must not already exist; capture never overwrites a file.
 */
export function validateStorageStateOutputPath(p: string, opts?: StorageStateOptions): string {
  const { nightwatchRoot, workspaceRoot } = defaultRoots(opts);
  if (!path.isAbsolute(p)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must be an absolute path (got: ${p})`);
  }
  const abs = path.resolve(p);
  if (isInside(nightwatchRoot, abs) || isInside(workspaceRoot, abs)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must be outside the Nightwatch repo and Alphaus workspace`);
  }
  if (!abs.toLowerCase().endsWith('.json')) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must use a .json filename`);
  }
  if (fs.existsSync(abs)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output already exists; refusing to overwrite secret state`);
  }
  const parent = path.dirname(abs);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent directory does not exist`);
  }
  try {
    fs.accessSync(parent, fs.constants.W_OK);
  } catch (err) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent is not writable: ${(err as Error).message}`);
  }
  const mode = fs.statSync(parent).mode;
  // Sticky world-writable directories such as /tmp are acceptable; an
  // ordinary world-writable parent is an obvious unsafe destination.
  if ((mode & 0o002) !== 0 && (mode & 0o1000) === 0) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent is world-writable without sticky protection`);
  }
  return abs;
}

/** Resolve the storage-state path from the environment; null when unset. */
export function resolveStorageStatePath(opts?: StorageStateOptions): string | null {
  const raw = process.env[NIGHTWATCH_STORAGE_STATE_VAR];
  if (raw === undefined || raw.trim() === '') return null;
  return validateStorageStateFile(raw.trim(), opts);
}

/** True when a storage-state path is present (authenticated run). */
export function isAuthenticatedRun(path: string | null): boolean {
  return path !== null;
}
