// ---------------------------------------------------------------------------
// Nightwatch — authenticated storage-state resolution.
//
// NIGHTWATCH_STORAGE_STATE, when set, points at a Playwright storage-state
// JSON file (cookies/localStorage from a prior login). Nightwatch NEVER reads
// its content — the path is passed straight to Playwright. Misconfiguration
// (missing/unreadable path) THROWS: the run must fail closed rather than
// silently run unauthenticated.
// ---------------------------------------------------------------------------

import fs from 'node:fs';

export const NIGHTWATCH_STORAGE_STATE_VAR = 'NIGHTWATCH_STORAGE_STATE';

/** Resolve the storage-state path from the environment; null when unset. */
export function resolveStorageStatePath(): string | null {
  const raw = process.env[NIGHTWATCH_STORAGE_STATE_VAR];
  if (raw === undefined || raw.trim() === '') return null;
  const p = raw.trim();

  if (!fs.existsSync(p)) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} points to a missing file: ${p}`);
  }
  let st: fs.Stats;
  try {
    st = fs.statSync(p);
  } catch (err) {
    throw new Error(
      `fail-closed: cannot stat ${NIGHTWATCH_STORAGE_STATE_VAR} file ${p}: ${(err as Error).message}`
    );
  }
  if (!st.isFile()) {
    throw new Error(`fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} is not a regular file: ${p}`);
  }
  try {
    fs.accessSync(p, fs.constants.R_OK);
  } catch (err) {
    throw new Error(
      `fail-closed: ${NIGHTWATCH_STORAGE_STATE_VAR} file is not readable: ${p}: ${(err as Error).message}`
    );
  }
  return p;
}

/** True when a storage-state path is present (authenticated run). */
export function isAuthenticatedRun(path: string | null): boolean {
  return path !== null;
}
