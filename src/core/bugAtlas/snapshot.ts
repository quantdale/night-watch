// ---------------------------------------------------------------------------
// Lane D — owner-private JSON snapshot for the Bug Atlas store.
//
// SQLite/FTS is not available in this lane (adding a native dependency would
// touch the frozen package-lock), so the structured local store is the
// in-memory index plus an optional JSON snapshot under owner-private state:
// NIGHTWATCH_BUG_ATLAS_STATE_DIR ?? ~/.nightwatch/bug-atlas — never the git
// tree. Directories are created 0700, files 0600, symlinks refused. Only
// normalised records (provenance required, secrets scrubbed) are persisted.
//
// NW-03. The file name and the state directory are both caller-configurable,
// and neither was confined:
//
//   - `path.join(directory, options.fileName)` accepted
//     `'../synthetic-escape.json'`, so the snapshot was written OUTSIDE the
//     authorized root — and because the directory was created from
//     `path.dirname(file)`, an escaping name also created and chmodded a
//     directory the store had no business touching;
//   - `writeFileSync` was called directly on the destination, so an existing
//     leaf symlink was followed and its target truncated;
//   - the same direct write truncated the previous snapshot in place, so an
//     interrupted publish left a partial file where a complete one had been;
//   - only the state directory's own leaf was lstat-checked, so a symlinked
//     ancestor was accepted.
//
// Now: the name must be a strict basename matching the pinned shape, the
// joined path must be proven to resolve directly inside the authorized root,
// the state root is held to the shared NW-02 topology authority so
// owner-private Atlas state cannot land under tracked source, every path
// component is lstat-checked, and publication goes through an owner-only
// same-directory temporary published by `rename`.
//
// Replace semantics are explicit: a snapshot is MUTABLE state, so a
// republish deliberately replaces the previous file — but only ever by
// renaming over a destination proven to be a regular, owner-only,
// non-symlink file, never by truncating one in place.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { BUG_ATLAS_STORE_VERSION, type BugAtlasSnapshot, type BugAtlasSnapshotOptions } from './types';
import { normalizeBugAtlasRecord } from './validate';
import { assertOutsideSourceTopology } from '../policy/sourceTopology';
import type { BugAtlasRecord } from '../agentProtocol/atlas';

export const BUG_ATLAS_SNAPSHOT_FILE = 'bug-atlas-snapshot.json' as const;

/** The only shape a snapshot file name may take. */
const SNAPSHOT_FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$/;

/** Publish temporary shape, pinned so recovery can recognise only its own. */
const TEMPORARY_PREFIX = '.nightwatch-bug-atlas-' as const;

function safeSnapshotFileName(fileName: string): string {
  // A strict basename: the name must be exactly its own basename, match the
  // pinned shape, and contain no dot-segment. `path.basename` alone is not
  // enough — it would silently ACCEPT `../x.json` by rewriting it to `x.json`,
  // turning an escape attempt into a successful write to a different file.
  if (
    typeof fileName !== 'string'
    || fileName !== path.basename(fileName)
    || fileName.includes('..')
    || !SNAPSHOT_FILE_NAME_RE.test(fileName)
  ) {
    throw new Error('BUG_ATLAS_SNAPSHOT_FILE_NAME_UNSAFE');
  }
  return fileName;
}

/** Refuse a symlink at ANY path component, not merely at the leaf. */
function assertNoSymlinkComponents(target: string, errorCode: string): void {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const component of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error(`${errorCode}:${(error as NodeJS.ErrnoException).code ?? 'UNKNOWN'}`);
    }
    if (stat.isSymbolicLink()) throw new Error(errorCode);
  }
}

function assertOwnerOnly(stat: fs.Stats, errorCode: string): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${errorCode}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${errorCode}_PERMISSIONS_UNSAFE`);
}

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
  assertNoSymlinkComponents(directory, 'BUG_ATLAS_STATE_SYMLINK_REFUSED');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  // Re-check after creation: a component that became a symlink between the
  // check and the mkdir must not be inherited as safe.
  assertNoSymlinkComponents(directory, 'BUG_ATLAS_STATE_SYMLINK_REFUSED');
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('BUG_ATLAS_STATE_NOT_DIRECTORY');
  assertOwnerOnly(stat, 'BUG_ATLAS_STATE');
}

/** The authorized state root, proven absolute and outside tracked source. */
export function snapshotStateRoot(options: BugAtlasSnapshotOptions = {}): string {
  const directory =
    options.stateDirectory !== undefined && options.stateDirectory.trim().length > 0
      ? path.resolve(options.stateDirectory.trim())
      : defaultBugAtlasStateDirectory();
  // NW-02 authority: owner-private Atlas state must never land inside the
  // Nightwatch checkout, a sibling checkout, or a linked worktree, whatever
  // checkout is running.
  assertOutsideSourceTopology(directory, 'BUG_ATLAS_STATE_ROOT_INSIDE_REPOSITORY');
  return directory;
}

export function snapshotFilePath(options: BugAtlasSnapshotOptions = {}): string {
  const directory = snapshotStateRoot(options);
  const fileName = safeSnapshotFileName(options.fileName ?? BUG_ATLAS_SNAPSHOT_FILE);
  const file = path.join(directory, fileName);
  // Join then PROVE: the result must resolve to a direct child of the root.
  if (path.dirname(file) !== directory || path.basename(file) !== fileName) {
    throw new Error('BUG_ATLAS_SNAPSHOT_PATH_ESCAPE');
  }
  return file;
}

/**
 * Publish `payload` to `file` through an owner-only same-directory temporary
 * renamed into place. Never writes to the destination path directly, so an
 * interrupted publish leaves the complete previous file rather than a
 * truncated one, and a destination that is not a plain owner-only file is
 * refused before anything is replaced. Owned temporaries are removed in
 * `finally`.
 */
function publishSnapshot(directory: string, file: string, payload: string): void {
  assertNoSymlinkComponents(file, 'BUG_ATLAS_SNAPSHOT_PATH_SYMLINK');
  let existing: fs.Stats | null = null;
  try {
    existing = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (existing !== null) {
    if (existing.isSymbolicLink() || !existing.isFile()) throw new Error('BUG_ATLAS_SNAPSHOT_DESTINATION_UNSAFE');
    assertOwnerOnly(existing, 'BUG_ATLAS_SNAPSHOT_DESTINATION');
  }
  const temporary = path.join(directory, `${TEMPORARY_PREFIX}${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
  let descriptor: number | undefined;
  let published = false;
  try {
    // `wx` refuses to follow or clobber anything that already exists.
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, payload, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.chmodSync(temporary, 0o600);
    const staged = fs.lstatSync(temporary);
    if (staged.isSymbolicLink() || !staged.isFile()) throw new Error('BUG_ATLAS_SNAPSHOT_TEMP_UNSAFE');
    assertOwnerOnly(staged, 'BUG_ATLAS_SNAPSHOT_TEMP');
    // Revalidate the publication boundary immediately before replacing.
    assertNoSymlinkComponents(file, 'BUG_ATLAS_SNAPSHOT_PATH_SYMLINK');
    fs.renameSync(temporary, file);
    published = true;
    const written = fs.lstatSync(file);
    if (written.isSymbolicLink() || !written.isFile()) throw new Error('BUG_ATLAS_SNAPSHOT_DESTINATION_UNSAFE');
    assertOwnerOnly(written, 'BUG_ATLAS_SNAPSHOT_DESTINATION');
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Preserve the original failure; cleanup is best effort.
      }
    }
    if (!published) {
      try {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Preserve the original failure; cleanup is best effort.
      }
    }
  }
}

/** Temporaries left by an interrupted publish, recognised only by their pinned shape. */
export function listSnapshotTemporaries(options: BugAtlasSnapshotOptions = {}): readonly string[] {
  const directory = snapshotStateRoot(options);
  if (!fs.existsSync(directory)) return [];
  assertNoSymlinkComponents(directory, 'BUG_ATLAS_STATE_SYMLINK_REFUSED');
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(TEMPORARY_PREFIX) && entry.name.endsWith('.tmp'))
    .map((entry) => entry.name)
    .sort();
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
  // The directory is the PROVEN root, never `path.dirname(file)` — that was
  // how an escaping name got a directory created for it.
  const directory = snapshotStateRoot(options);
  ensurePrivateDirectory(directory);
  const snapshot: BugAtlasSnapshot = {
    schemaVersion: BUG_ATLAS_STORE_VERSION,
    savedAt: new Date().toISOString(),
    records,
  };
  publishSnapshot(directory, file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return { file, records: records.length };
}

/** Load and re-validate a snapshot. Fail-closed on schema drift. */
export function loadBugAtlasSnapshot(
  options: BugAtlasSnapshotOptions = {},
): BugAtlasSnapshot {
  const file = snapshotFilePath(options);
  assertNoSymlinkComponents(file, 'BUG_ATLAS_SNAPSHOT_PATH_SYMLINK');
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('BUG_ATLAS_SNAPSHOT_UNSAFE');
  }
  assertOwnerOnly(stat, 'BUG_ATLAS_SNAPSHOT');
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
