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
import { errnoCode, sensitiveDiagnostic } from '../../core/policy/sensitiveDiagnostics';

export const NIGHTWATCH_STORAGE_STATE_VAR = 'NIGHTWATCH_STORAGE_STATE';

// Phase 15P A15 convergence: storage-state shapes/constants below are
// module-private; no external type callers remain (grep-proven).
const MAX_STORAGE_STATE_BYTES = 5 * 1024 * 1024;

interface StorageStateOptions {
  /** Nightwatch repo root (default: derived from this file). */
  nightwatchRoot?: string;
  /** Alphaus workspace root (default: parent of nightwatchRoot). */
  workspaceRoot?: string;
}

interface StorageStateOutputOptions extends StorageStateOptions {
  /** Only the approved direct auth-capture workflow may replace an existing external file. */
  allowExisting?: boolean;
}

interface AtomicStorageStateOptions extends StorageStateOptions {
  /** The destination may already exist only for an approved auth refresh. */
  allowExisting?: boolean;
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

function assertNoSymlinkComponents(target: string, errorCode: string): void {
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const component of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      // errno only: the native message embeds the absolute path.
      throw new Error(`${errorCode}: ${sensitiveDiagnostic(errorCode, { failure: 'IO_ERROR', errno: errnoCode(error) })}`);
    }
    if (stat.isSymbolicLink()) throw new Error(errorCode);
  }
}

function assertOwnerOnlyFile(stat: fs.Stats, errorCode: string): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${errorCode}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${errorCode}_PERMISSIONS_UNSAFE`);
}

function assertOwnerOnlyDirectory(directory: string, errorCode: string): void {
  const stat = fs.lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${errorCode}_NOT_DIRECTORY`);
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${errorCode}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${errorCode}_PERMISSIONS_UNSAFE`);
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
  assertNoSymlinkComponents(abs, 'STORAGE_STATE_SYMLINK_COMPONENT');
  const st = fs.lstatSync(abs);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} is not a regular file: ${abs}`);
  }
  assertOwnerOnlyFile(st, 'STORAGE_STATE_FILE');
  assertOwnerOnlyDirectory(path.dirname(abs), 'STORAGE_STATE_PARENT');
  if (st.size > MAX_STORAGE_STATE_BYTES) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file exceeds ${MAX_STORAGE_STATE_BYTES} bytes: ${abs}`
    );
  }
  try {
    fs.accessSync(abs, fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file is not readable: ${sensitiveDiagnostic('STORAGE_STATE_UNREADABLE', { failure: 'NOT_READABLE', errno: errnoCode(err), target: abs })}`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    // NW-13: the native SyntaxError embeds a window of the INPUT around the
    // offending token, so forwarding its message publishes credential bytes
    // into whatever captured the throw. The category is preserved — callers
    // and tests match on "not valid JSON" — and the location is identified by
    // digest rather than printed.
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file is not valid JSON: ${sensitiveDiagnostic('STORAGE_STATE_PARSE_REFUSED', { failure: 'MALFORMED_JSON', target: abs })}`,
    );
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

interface StorageStateKeyPresence {
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
interface StorageStateKeySemantics {
  authTokenPresent: boolean;
  authTokenStructurallyNonEmpty: boolean;
  apiTypePresent: boolean;
  apiTypeExpectedValue: string;
  apiTypeMatchesExpected: boolean;
  appTypePresent: boolean;
  appTypeExpectedValue: string;
  appTypeMatchesExpected: boolean;
}

/**
 * NW-13: the three key-inspection helpers each called `JSON.parse` with no
 * catch, so a malformed storage-state file threw a native SyntaxError whose
 * message carries a window of the credential bytes. They now share one reader
 * that refuses content-free.
 */
function readStorageStateObject(p: string): Record<string, unknown> {
  let raw: string;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (error) {
    throw new Error(sensitiveDiagnostic('STORAGE_STATE_UNREADABLE', { failure: 'NOT_READABLE', errno: errnoCode(error), target: p }));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(sensitiveDiagnostic('STORAGE_STATE_PARSE_REFUSED', { failure: 'MALFORMED_JSON', target: p }));
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(sensitiveDiagnostic('STORAGE_STATE_SHAPE_REFUSED', { failure: 'SCHEMA_INVALID', target: p }));
  }
  return parsed as Record<string, unknown>;
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
  const parsed = readStorageStateObject(p);
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
  const parsed = readStorageStateObject(p);
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
 * Context-side approximation of whether a browser WILL expose a named cookie
 * to the app page — WITHOUT reading any cookie value. Returns booleans only.
 *
 * Ripple reads `mo_access_token` via js-cookie (`Cookies.get`), which parses
 * `document.cookie`. A cookie is present in `document.cookie` only when ALL of:
 *   - the cookie's domain applies to the current origin's host;
 *   - the cookie's path is a prefix of the current path;
 *   - the cookie is NOT httpOnly (httpOnly cookies are hidden from JS);
 *   - the cookie is NOT expired (and not secure-required-on-a-non-https page,
 *     which never occurs for the appdev https target);
 *   - sameSite does not suppress the top-level navigation (Lax does not).
 *
 * This is deliberately context-derived; it does NOT prove the live page truly
 * received the cookie (only a real browser evaluation can). It upgrades the
 * Phase A claim from "capture file records a row" to "a browser at the app
 * origin would expose this non-httpOnly, unexpired, applicable cookie". The
 * page-readability result must still be classified conservatively.
 */
interface CookiePageReadability {
  /** The named cookie exists in the capture file. */
  present: boolean;
  /** Cookie domain equals the app host or covers it as a parent domain. */
  domainApplicable: boolean;
  /** Cookie path is a prefix of the app path. */
  pathApplicable: boolean;
  /** Cookie is httpOnly (hidden from document.cookie / page JS). */
  httpOnly: boolean;
  /** Cookie requires a secure context. */
  secure: boolean;
  /** Cookie is expired as of inspection time (or true when unknown). */
  expired: boolean;
  /**
   * True only when present && domainApplicable && pathApplicable && !httpOnly
   * && !expired && (page would be https). This mirrors the conditions under
   * which js-cookie can see the token from the app page.
   */
  pageReadable: boolean;
}

export function inspectStorageStateCookiePageReadability(
  p: string,
  opts: { cookieKey: string; appOrigin: string; appPath: string },
  atEpochSeconds: number = Math.floor(Date.now() / 1000),
): CookiePageReadability {
  const parsed = readStorageStateObject(p);
  const cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
  const record = cookies.find(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && (item as Record<string, unknown>).name === opts.cookieKey,
  );
  if (record === undefined) {
    return { present: false, domainApplicable: false, pathApplicable: false, httpOnly: false, secure: false, expired: false, pageReadable: false };
  }
  // appOrigin like "https://appdev.alphaus.cloud"
  const appHost: string = (opts.appOrigin.replace(/^https?:\/\//i, '').split('/')[0]) || '';
  const secureTarget = /^https:/i.test(opts.appOrigin);
  // Strip a leading "." from the cookie domain, then compare: cookie covers
  // the host if the host is the cookie domain or ends with "." + cookie domain.
  const cookieDomain = typeof record.domain === 'string' ? record.domain.replace(/^\./, '') : '';
  const hostMatches = (cookieDomain === appHost) || (cookieDomain !== '' && appHost.endsWith('.' + cookieDomain));
  const cookiePath = typeof record.path === 'string' ? record.path : '';
  const pathMatches =
    cookiePath === '' ||
    cookiePath === '/' ||
    opts.appPath.replace(/\/+$/, '') + '/' === cookiePath.replace(/\/+$/, '') + '/' ||
    opts.appPath === cookiePath ||
    (cookiePath !== '/' && opts.appPath.startsWith(cookiePath.replace(/\/+$/, '') + '/'));
  const httpOnly = record.httpOnly === true;
  const secure = record.secure === true;
  const expiresRaw = record.expires;
  // expires === -1 (session cookie) counts as unexpired for this session.
  const isSession = typeof expiresRaw === 'number' && expiresRaw === -1;
  const hasFutureExpiry = typeof expiresRaw === 'number' && expiresRaw > atEpochSeconds;
  const expired = !isSession && (!hasFutureExpiry);
  const pageReadable = hostMatches && pathMatches && !httpOnly && !expired && (secure ? secureTarget : true);
  return {
    present: true,
    domainApplicable: hostMatches,
    pathApplicable: pathMatches,
    httpOnly,
    secure,
    expired,
    pageReadable,
  };
}

/**
 * Validate a destination before a human-led capture writes secret state.
 * Normal callers fail closed on an existing path. The direct auth-capture
 * workflow may opt into an atomic replacement after the newly captured state
 * has passed validation; it never writes over the old file in place.
 */
export function validateStorageStateOutputPath(p: string, opts?: StorageStateOutputOptions): string {
  const { nightwatchRoot, workspaceRoot } = defaultRoots(opts);
  if (!path.isAbsolute(p)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must be an absolute path (got: ${p})`);
  }
  const abs = path.resolve(p);
  if (isInside(nightwatchRoot, abs) || isInside(workspaceRoot, abs)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must be outside the Nightwatch repo and Alphaus workspace`);
  }
  assertNoSymlinkComponents(abs, 'STORAGE_STATE_OUTPUT_SYMLINK_COMPONENT');
  if (!abs.toLowerCase().endsWith('.json')) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output must use a .json filename`);
  }
  if (fs.existsSync(abs)) {
    if (!opts?.allowExisting) {
      throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output already exists; refusing to overwrite secret state`);
    }
    const existing = fs.lstatSync(abs);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output is not a regular file: ${abs}`);
    }
    assertOwnerOnlyFile(existing, 'STORAGE_STATE_OUTPUT');
  }
  const parent = path.dirname(abs);
  assertNoSymlinkComponents(parent, 'STORAGE_STATE_OUTPUT_PARENT_SYMLINK');
  if (!fs.existsSync(parent) || !fs.lstatSync(parent).isDirectory()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent directory does not exist`);
  }
  try {
    fs.accessSync(parent, fs.constants.W_OK);
  } catch (err) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent is not writable: ${sensitiveDiagnostic('STORAGE_STATE_OUTPUT_PARENT_UNWRITABLE', { failure: 'NOT_READABLE', errno: errnoCode(err), target: parent })}`);
  }
  const parentStat = fs.lstatSync(parent);
  if (parentStat.isSymbolicLink()) throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent is a symlink`);
  if (process.getuid !== undefined && parentStat.uid !== process.getuid()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent is not owner-controlled`);
  }
  if ((parentStat.mode & 0o077) !== 0) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} output parent must not be group/world accessible`);
  }
  return abs;
}

/**
 * Harden a newly-created pending capture before any content validation reads
 * it. Playwright's `context.storageState({ path })` does not promise a
 * restrictive mode on every platform, so the capture boundary must establish
 * owner-only permissions itself. This helper is only for a freshly-created
 * pending file in an already-validated external output directory; it never
 * relaxes ownership, symlink, or repository-boundary checks.
 */
export function prepareStorageStateFileForValidation(p: string, opts?: StorageStateOptions): string {
  if (!path.isAbsolute(p)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} pending path must be absolute`);
  }
  const abs = path.resolve(p);
  const { nightwatchRoot, workspaceRoot } = defaultRoots(opts);
  if (isInside(nightwatchRoot, abs) || isInside(workspaceRoot, abs)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} pending path must be outside the Nightwatch workspace`);
  }
  assertNoSymlinkComponents(abs, 'STORAGE_STATE_PENDING_SYMLINK_COMPONENT');
  let stat = fs.lstatSync(abs);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} pending path is not a regular file`);
  }
  if (process.getuid !== undefined && stat.uid !== process.getuid()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} pending path is not owner-controlled`);
  }
  fs.chmodSync(abs, 0o600);
  stat = fs.lstatSync(abs);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} pending path changed to a non-file`);
  }
  assertOwnerOnlyFile(stat, 'STORAGE_STATE_PENDING');
  const directory = fs.openSync(path.dirname(abs), 'r');
  try {
    fs.fsyncSync(directory);
  } finally {
    fs.closeSync(directory);
  }
  return validateStorageStateOutputPath(abs, { ...opts, allowExisting: true });
}

/**
 * Commit a validated Playwright storage state without ever overwriting the
 * previous capture in place. The pending file must be in the same directory
 * as the destination so rename is atomic on the local filesystem.
 */
export function atomicallyReplaceValidatedStorageState(
  pendingPath: string,
  outputPath: string,
  opts?: AtomicStorageStateOptions,
): string {
  const pending = prepareStorageStateFileForValidation(pendingPath, opts);
  validateStorageStateFile(pending, opts);
  const output = validateStorageStateOutputPath(outputPath, { ...opts, allowExisting: opts?.allowExisting ?? true });
  if (path.dirname(pending) !== path.dirname(output)) {
    throw new Error('fail-closed: pending storage state and destination must share a directory');
  }
  try {
    fs.chmodSync(pending, 0o600);
    const pendingStat = fs.lstatSync(pending);
    if (!pendingStat.isFile() || pendingStat.isSymbolicLink() || (pendingStat.mode & 0o077) !== 0) {
      throw new Error('pending storage state permissions are unsafe');
    }
    fs.renameSync(pending, output);
    const written = fs.lstatSync(output);
    if (written.isSymbolicLink() || !written.isFile()) throw new Error('written storage state is not a regular file');
    assertOwnerOnlyFile(written, 'STORAGE_STATE_OUTPUT');
    const directory = fs.openSync(path.dirname(output), 'r');
    try {
      fs.fsyncSync(directory);
    } finally {
      fs.closeSync(directory);
    }
  } catch (error) {
    throw new Error(`fail-closed: atomic storage-state replacement failed: ${sensitiveDiagnostic('STORAGE_STATE_REPLACE_FAILED', { failure: 'IO_ERROR', errno: errnoCode(error) })}`);
  }
  return output;
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
