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
