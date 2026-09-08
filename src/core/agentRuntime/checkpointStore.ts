// ---------------------------------------------------------------------------
// NW-04 — bounded, generation-bearing, crash-safe checkpoint persistence.
//
// The local campaign store published checkpoints with a direct
// `writeFileSync` onto the destination and then chmodded it. Three
// consequences, all measurable:
//
//   - an interrupted write left a TRUNCATED checkpoint where a complete one
//     had been, because the destination inode was rewritten in place;
//   - two processes running the same campaign id could each write the whole
//     file, and the loser's progress vanished with no signal;
//   - a fresh run deleted the stored checkpoint for its id BEFORE any new
//     durable progress existed, so a crash in that window destroyed the
//     owner's previous checkpoint outright.
//
// Reads had their own problem: the whole file was read and decoded with no
// size bound, and a corrupt file threw a native `SyntaxError` whose message
// carries a window of the checkpoint's own content.
//
// This module is the single publication and read path.
//
// Generations. Every published document carries `checkpointGeneration`, a
// positive integer one greater than the generation it replaced. The field is
// additive: `parseCheckpoint` reads named fields and ignores the rest, so a
// pre-NW-04 checkpoint (no generation) reads as generation 0 and the next
// write becomes generation 1.
//
// Same-ID writers. This is single-host local operation, so the protocol is
// compare-generation rather than a lock: the generation on disk is re-read
// immediately before the rename, and a change since staging means another
// writer for the same id won. That refuses with
// `CHECKPOINT_GENERATION_CONFLICT` instead of silently clobbering. It cannot
// eliminate the final rename race — two writers can still stage
// concurrently — but it converts the common interleaving from silent loss
// into a reported refusal, and the loser's bytes are never half-written into
// the winner's file.
//
// Durability is qualified deliberately. `fsync` on the file and on the
// containing directory is what the platform offers; this module does not
// claim durability guarantees a filesystem does not provide. What it does
// guarantee is ATOMIC VISIBILITY: a reader sees the complete previous
// document or the complete next one, never a partial one.
//
// Superseding, not deleting. Replacing a stored checkpoint for a fresh run of
// the same id moves the previous document aside as `<file>.superseded`
// instead of unlinking it, so owner progress is never destroyed to make a
// start-up succeed. Exactly one superseded document is retained per id, so
// the store stays bounded.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { errnoCode, sensitiveDiagnostic } from '../policy/sensitiveDiagnostics';

/** Checkpoints are bounded state, not an archive. */
export const MAX_CHECKPOINT_BYTES = 8 * 1024 * 1024;

export const CHECKPOINT_GENERATION_FIELD = 'checkpointGeneration' as const;
export const CHECKPOINT_SUPERSEDED_SUFFIX = '.superseded' as const;
const TEMPORARY_PREFIX = '.nightwatch-checkpoint-' as const;

export type CheckpointStoreFailure =
  | 'CHECKPOINT_STATE_SYMLINK_REFUSED'
  | 'CHECKPOINT_STATE_UNSAFE'
  | 'CHECKPOINT_DESTINATION_UNSAFE'
  | 'CHECKPOINT_OVERSIZED'
  | 'CHECKPOINT_CORRUPT'
  | 'CHECKPOINT_GENERATION_CONFLICT'
  | 'CHECKPOINT_PUBLISH_FAILED';

export class CheckpointStoreError extends Error {
  readonly code: CheckpointStoreFailure;

  constructor(code: CheckpointStoreFailure, detail: string) {
    super(`${code}: ${detail}`);
    this.code = code;
    this.name = 'CheckpointStoreError';
  }
}

/**
 * Deterministic crash-injection points, for the crash matrix. Production
 * callers pass nothing and no campaign input DTO carries these, so a
 * reasoner, a CLI flag or a config file cannot reach them.
 */
export interface CheckpointPublishHooks {
  /** After the temporary is fully written, fsynced and verified. */
  readonly afterStage?: () => void;
  /** After the generation re-read, immediately before the atomic rename. */
  readonly beforeRename?: () => void;
  /** After the rename, before the directory fsync and verification. */
  readonly afterRename?: () => void;
}

function assertNoSymlinkComponents(target: string): void {
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
      throw new CheckpointStoreError('CHECKPOINT_STATE_UNSAFE', sensitiveDiagnostic('CHECKPOINT_STATE_UNSAFE', { failure: 'IO_ERROR', errno: errnoCode(error) }));
    }
    if (stat.isSymbolicLink()) {
      throw new CheckpointStoreError('CHECKPOINT_STATE_SYMLINK_REFUSED', 'a checkpoint path component is a symlink');
    }
  }
}

function assertOwnerOnly(stat: fs.Stats, code: CheckpointStoreFailure): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) {
    throw new CheckpointStoreError(code, 'checkpoint state is not owner-owned');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new CheckpointStoreError(code, 'checkpoint state permissions are too broad');
  }
}

export function ensureCheckpointDirectory(directory: string): void {
  assertNoSymlinkComponents(directory);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  assertNoSymlinkComponents(directory);
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new CheckpointStoreError('CHECKPOINT_STATE_UNSAFE', 'checkpoint state directory is not a directory');
  }
  assertOwnerOnly(stat, 'CHECKPOINT_STATE_UNSAFE');
}

/**
 * Read the raw bytes of a checkpoint, bounded BEFORE allocation. A corrupt
 * file is left exactly where it is: `CHECKPOINT_CORRUPT` is content-free and
 * the owner keeps the evidence.
 */
export function readCheckpointDocument(file: string): Record<string, unknown> | null {
  assertNoSymlinkComponents(file);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new CheckpointStoreError('CHECKPOINT_STATE_UNSAFE', sensitiveDiagnostic('CHECKPOINT_STATE_UNSAFE', { failure: 'IO_ERROR', errno: errnoCode(error) }));
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new CheckpointStoreError('CHECKPOINT_DESTINATION_UNSAFE', 'checkpoint is not a regular file');
  }
  assertOwnerOnly(stat, 'CHECKPOINT_DESTINATION_UNSAFE');
  // Bound before allocation: the size is known from the stat, so an oversized
  // file is refused without reading it.
  if (stat.size > MAX_CHECKPOINT_BYTES) {
    throw new CheckpointStoreError(
      'CHECKPOINT_OVERSIZED',
      sensitiveDiagnostic('CHECKPOINT_OVERSIZED', { failure: 'OVERSIZED', bytes: stat.size }),
    );
  }
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new CheckpointStoreError('CHECKPOINT_STATE_UNSAFE', sensitiveDiagnostic('CHECKPOINT_STATE_UNSAFE', { failure: 'NOT_READABLE', errno: errnoCode(error) }));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Content-free: a native SyntaxError carries a window of the checkpoint's
    // own bytes, which are investigation state.
    throw new CheckpointStoreError(
      'CHECKPOINT_CORRUPT',
      sensitiveDiagnostic('CHECKPOINT_CORRUPT', { failure: 'MALFORMED_JSON', bytes: stat.size, target: file }),
    );
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CheckpointStoreError(
      'CHECKPOINT_CORRUPT',
      sensitiveDiagnostic('CHECKPOINT_CORRUPT', { failure: 'SCHEMA_INVALID', target: file }),
    );
  }
  return parsed as Record<string, unknown>;
}

/** The generation of the document on disk; 0 when absent or pre-NW-04. */
export function storedCheckpointGeneration(file: string): number {
  let document: Record<string, unknown> | null;
  try {
    document = readCheckpointDocument(file);
  } catch (error) {
    // A corrupt or unreadable predecessor must not be treated as generation 0
    // and silently overwritten as if the slot were free.
    if (error instanceof CheckpointStoreError && error.code === 'CHECKPOINT_CORRUPT') return Number.NaN;
    throw error;
  }
  if (document === null) return 0;
  const generation = document[CHECKPOINT_GENERATION_FIELD];
  return typeof generation === 'number' && Number.isInteger(generation) && generation >= 0 ? generation : 0;
}

export interface PublishedCheckpoint {
  readonly file: string;
  readonly generation: number;
}

/**
 * Publish `document` to `file` atomically, stamped with the next generation.
 * Either the complete previous document or the complete new one is visible at
 * every instant.
 */
export function publishCheckpointDocument(
  directory: string,
  file: string,
  document: Record<string, unknown>,
  hooks: CheckpointPublishHooks = {},
): PublishedCheckpoint {
  ensureCheckpointDirectory(directory);
  if (path.dirname(path.resolve(file)) !== path.resolve(directory)) {
    throw new CheckpointStoreError('CHECKPOINT_DESTINATION_UNSAFE', 'checkpoint file is not a direct child of the state directory');
  }
  assertNoSymlinkComponents(file);

  const observed = storedCheckpointGeneration(file);
  if (Number.isNaN(observed)) {
    // Corrupt predecessor: refuse rather than overwrite the owner's evidence.
    throw new CheckpointStoreError('CHECKPOINT_CORRUPT', 'the stored checkpoint is corrupt; it is preserved for owner action and was not replaced');
  }
  const generation = observed + 1;
  const payload = `${JSON.stringify({ ...document, [CHECKPOINT_GENERATION_FIELD]: generation })}\n`;
  const bytes = Buffer.byteLength(payload, 'utf8');
  if (bytes > MAX_CHECKPOINT_BYTES) {
    throw new CheckpointStoreError(
      'CHECKPOINT_OVERSIZED',
      sensitiveDiagnostic('CHECKPOINT_OVERSIZED', { failure: 'OVERSIZED', bytes }),
    );
  }

  const temporary = path.join(directory, `${TEMPORARY_PREFIX}${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
  let descriptor: number | undefined;
  let published = false;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, payload, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.chmodSync(temporary, 0o600);
    const staged = fs.lstatSync(temporary);
    if (staged.isSymbolicLink() || !staged.isFile()) {
      throw new CheckpointStoreError('CHECKPOINT_PUBLISH_FAILED', 'the staged checkpoint is not a regular file');
    }
    hooks.afterStage?.();

    // Compare-generation: another writer for this id may have published while
    // we were staging. Refuse rather than clobber.
    const current = storedCheckpointGeneration(file);
    if (Number.isNaN(current) || current !== observed) {
      throw new CheckpointStoreError(
        'CHECKPOINT_GENERATION_CONFLICT',
        `another writer published generation ${Number.isNaN(current) ? 'CORRUPT' : String(current)} while generation ${observed} was being replaced; nothing was overwritten`,
      );
    }
    const existing = fs.existsSync(file) ? fs.lstatSync(file) : null;
    if (existing !== null) {
      if (existing.isSymbolicLink() || !existing.isFile()) {
        throw new CheckpointStoreError('CHECKPOINT_DESTINATION_UNSAFE', 'checkpoint destination is not a regular file');
      }
      assertOwnerOnly(existing, 'CHECKPOINT_DESTINATION_UNSAFE');
    }
    hooks.beforeRename?.();
    fs.renameSync(temporary, file);
    published = true;
    hooks.afterRename?.();
    fsyncDirectory(directory);
    const written = fs.lstatSync(file);
    if (written.isSymbolicLink() || !written.isFile()) {
      throw new CheckpointStoreError('CHECKPOINT_DESTINATION_UNSAFE', 'the published checkpoint is not a regular file');
    }
    return { file, generation };
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

function fsyncDirectory(directory: string): void {
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(directory, 'r');
    fs.fsyncSync(descriptor);
  } catch {
    // Directory durability is platform-qualified. Visibility is already
    // atomic via rename; a directory that cannot be fsynced is reported by
    // the caller's own validation, not by pretending the publish failed.
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // Nothing further to report.
      }
    }
  }
}

/**
 * Move an existing checkpoint aside so a fresh run of the same id does not
 * shadow it, WITHOUT destroying it. Exactly one superseded document is kept
 * per id, so the store stays bounded.
 */
export function supersedeStoredCheckpoint(directory: string, file: string): string | null {
  if (!fs.existsSync(file)) return null;
  assertNoSymlinkComponents(file);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new CheckpointStoreError('CHECKPOINT_DESTINATION_UNSAFE', 'checkpoint destination is not a regular file');
  }
  const target = `${file}${CHECKPOINT_SUPERSEDED_SUFFIX}`;
  fs.renameSync(file, target);
  fsyncDirectory(directory);
  return target;
}

/** Temporaries left by an interrupted publish, by their pinned shape only. */
export function listCheckpointTemporaries(directory: string): readonly string[] {
  if (!fs.existsSync(directory)) return [];
  assertNoSymlinkComponents(directory);
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith(TEMPORARY_PREFIX) && entry.name.endsWith('.tmp'))
    .map((entry) => entry.name)
    .sort();
}
