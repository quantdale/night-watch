// ---------------------------------------------------------------------------
// Lane D — owner-private JSON snapshot for the Bug Atlas store.
//
// SQLite/FTS is not available in this lane (adding a native dependency would
// touch the frozen package-lock), so the structured local store is the
// in-memory index plus an optional JSON snapshot under owner-private state:
// NIGHTWATCH_BUG_ATLAS_STATE_DIR ?? ~/.nightwatch/bug-atlas — never the git
// tree. Directories are created 0700, files 0600, symlinks refused. Only
// normalised records (provenance required, secrets scrubbed) are persisted.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BUG_ATLAS_STORE_VERSION, type BugAtlasSnapshot, type BugAtlasSnapshotOptions } from './types';
import { normalizeBugAtlasRecord } from './validate';
import type { BugAtlasRecord } from '../agentProtocol/atlas';

export const BUG_ATLAS_SNAPSHOT_FILE = 'bug-atlas-snapshot.json' as const;

export function defaultBugAtlasStateDirectory(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const configured = environment['NIGHTWATCH_BUG_ATLAS_STATE_DIR'];
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return path.resolve(configured.trim());
  }
  return path.join(os.homedir(), '.nightwatch', 'bug-atlas');
}

function ensurePrivateDirectory(directory: string): void {
  try {
    if (fs.lstatSync(directory).isSymbolicLink()) {
      throw new Error('BUG_ATLAS_STATE_SYMLINK_REFUSED');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

export function snapshotFilePath(options: BugAtlasSnapshotOptions = {}): string {
  const directory =
    options.stateDirectory !== undefined && options.stateDirectory.trim().length > 0
      ? path.resolve(options.stateDirectory.trim())
      : defaultBugAtlasStateDirectory();
  return path.join(directory, options.fileName ?? BUG_ATLAS_SNAPSHOT_FILE);
}

/** Persist normalised records to owner-private state. Returns records kept. */
export function saveBugAtlasSnapshot(
  candidates: readonly unknown[],
  options: BugAtlasSnapshotOptions = {},
): { readonly file: string; readonly records: number } {
  const records: BugAtlasRecord[] = candidates.map(
    (candidate) => normalizeBugAtlasRecord(candidate).record,
  );
  const file = snapshotFilePath(options);
  ensurePrivateDirectory(path.dirname(file));
  const snapshot: BugAtlasSnapshot = {
    schemaVersion: BUG_ATLAS_STORE_VERSION,
    savedAt: new Date().toISOString(),
    records,
  };
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return { file, records: records.length };
}

/** Load and re-validate a snapshot. Fail-closed on schema drift. */
export function loadBugAtlasSnapshot(
  options: BugAtlasSnapshotOptions = {},
): BugAtlasSnapshot {
  const file = snapshotFilePath(options);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('BUG_ATLAS_SNAPSHOT_UNSAFE');
  }
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Record<string, unknown>)['schemaVersion'] !== BUG_ATLAS_STORE_VERSION ||
    !Array.isArray((parsed as Record<string, unknown>)['records'])
  ) {
    throw new Error('BUG_ATLAS_SNAPSHOT_SCHEMA_MISMATCH');
  }
  const raw = (parsed as { records: unknown[] }).records;
  const records = raw.map((candidate) => normalizeBugAtlasRecord(candidate).record);
  const savedAt = (parsed as Record<string, unknown>)['savedAt'];
  return {
    schemaVersion: BUG_ATLAS_STORE_VERSION,
    savedAt: typeof savedAt === 'string' ? savedAt : new Date(0).toISOString(),
    records,
  };
}
