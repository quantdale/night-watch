// ---------------------------------------------------------------------------
// Nightwatch Phase 29 — bounded call-scoped source read reuse.
//
// This view sits on top of the existing sibling-source authority only after a
// scan has established an exact source identity. It retains positive source
// text in memory for the duration of the caller's operation, never persists it,
// and never caches rejected, missing, ambiguous, or digest-mismatched reads.
// ---------------------------------------------------------------------------

import { sourceContentDigest, type RealSourceSnapshotInventory, type SourceSnapshotFileRecord } from './scanTypes';
import type { SiblingSourceAccess } from './siblingSource';

export const CALL_SCOPED_SOURCE_READ_VERSION = 'nightwatch.call-scoped-source-read.v1' as const;
export const MAX_CALL_SCOPED_SOURCE_READ_ENTRIES = 512;

export interface CallScopedSourceReadStats {
  readonly sourceReads: number;
  readonly cacheHits: number;
  readonly cachedEntries: number;
  readonly digestMismatches: number;
  readonly uncachedEntries: number;
}

export interface CallScopedSourceReadView {
  readonly access: SiblingSourceAccess;
  readonly stats: () => CallScopedSourceReadStats;
}

function lookupKey(repoId: string, relativePath: string): string {
  return `${repoId}\u0000${relativePath}`;
}

function identityKey(inventory: RealSourceSnapshotInventory, file: SourceSnapshotFileRecord): string | null {
  if (file.status !== 'ELIGIBLE' || file.sourceSha === null || file.contentDigest === null) return null;
  return [
    CALL_SCOPED_SOURCE_READ_VERSION,
    inventory.snapshotDigest,
    file.repoId,
    file.sourceSha,
    file.relativePath,
    file.contentDigest,
    file.status,
  ].join('\u0000');
}

/** Create one ephemeral exact-source read view for a single discovery call. */
export function createCallScopedSourceReadView(input: {
  readonly access: SiblingSourceAccess;
  readonly inventory: RealSourceSnapshotInventory;
}): CallScopedSourceReadView {
  const filesByPath = new Map<string, readonly SourceSnapshotFileRecord[]>();
  for (const file of input.inventory.files) {
    const key = lookupKey(file.repoId, file.relativePath);
    const entries = filesByPath.get(key) ?? [];
    filesByPath.set(key, [...entries, file]);
  }

  const cache = new Map<string, string>();
  let sourceReads = 0;
  let cacheHits = 0;
  let digestMismatches = 0;
  let uncachedEntries = 0;

  const reader = {
    readFile(repoId: string, relativePath: string): string | null {
      const records = filesByPath.get(lookupKey(repoId, relativePath));
      // An absent or duplicated inventory identity is not cache authority.
      if (records === undefined || records.length !== 1) return input.access.reader.readFile(repoId, relativePath);
      const file = records[0]!;
      const key = identityKey(input.inventory, file);
      if (key === null) return input.access.reader.readFile(repoId, relativePath);
      const cached = cache.get(key);
      if (cached !== undefined) {
        cacheHits += 1;
        return cached;
      }

      sourceReads += 1;
      const sourceText = input.access.reader.readFile(repoId, relativePath);
      if (sourceText === null) return null;
      if (sourceContentDigest(sourceText) !== file.contentDigest) {
        // Return the authoritative current read so existing callers still
        // classify it as stale; importantly, do not retain mismatched text.
        digestMismatches += 1;
        return sourceText;
      }
      if (cache.size >= MAX_CALL_SCOPED_SOURCE_READ_ENTRIES) {
        uncachedEntries += 1;
        return sourceText;
      }
      cache.set(key, sourceText);
      return sourceText;
    },
  };

  return {
    access: { ...input.access, reader },
    stats: () => Object.freeze({
      sourceReads,
      cacheHits,
      cachedEntries: cache.size,
      digestMismatches,
      uncachedEntries,
    }),
  };
}
