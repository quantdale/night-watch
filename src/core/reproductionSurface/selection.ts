// ---------------------------------------------------------------------------
// W10 — reasoner-visible source index selection.
//
// THE DEFECT THIS REPAIRS
// The owner-local source index is sorted by (repository, relativePath) and the
// reasoner receives a fixed-size prefix of it. A prefix of a
// repository-major ordering is not a sample of the universe: it is the first
// repository, and nothing else. The M0 census measured the consequence on the
// live universe — all 32 visible entries came from one repository, that
// repository had zero executable coverage, and the first executable target in
// the whole approved universe sat at ordered position 83. Every reproduction
// attempt in the W9 terminal campaign was therefore refused before the
// reasoner made a single choice.
//
// Raising the window would not fix this; it would only move the cliff. The
// ordering is what is wrong, so the ordering is what changes.
//
// WHAT THIS IS NOT
// It is not a filter. Every repository keeps representation, and unsupported
// source stays visible, because static root-cause reasoning does not require
// mechanical executability. Capability ordering only decides which of a
// repository's own entries are shown first when its share is smaller than its
// file count — which was already true, silently and alphabetically.
//
// Pure data. No fs/network/process authority in this module.
// ---------------------------------------------------------------------------

import type { ReproductionSurfaceEntry } from './contracts';

/** The minimum an index entry must expose for selection. */
export interface SelectableSourceEntry {
  readonly path: string;
  readonly repository: string;
}

export interface DiverseSelectionInput<T extends SelectableSourceEntry> {
  /** Deterministically ordered candidates; the caller owns enumeration. */
  readonly entries: readonly T[];
  /** Hard ceiling on the returned window. */
  readonly limit: number;
  /**
   * Optional capability annotation keyed by `path`. When present, a
   * repository's own share is ordered executable-first. Absent entries are
   * treated as not-known-executable, never as executable.
   */
  readonly readinessByPath?: ReadonlyMap<string, ReproductionSurfaceEntry>;
}

export interface DiverseSelectionResult<T extends SelectableSourceEntry> {
  readonly entries: readonly T[];
  /** Distinct repositories represented in the returned window. */
  readonly repositories: number;
  /** Candidates considered but not returned. */
  readonly omitted: number;
}

/**
 * Order executable entries so distinct verification targets come first.
 *
 * Five sources in one Go package are ONE reproduction: running the package
 * again cannot tell you anything the first run did not. Measured on the live
 * universe, a capability-first window that ignores this yields five executable
 * entries covering a single distinct target — better than W9's zero, but still
 * four wasted verification choices. Emitting one source per distinct target
 * before any second source of an already-covered target turns the same window
 * into that many genuinely different verifications.
 *
 * Stable within each target group, so selection stays deterministic.
 */
function spreadByTarget<T extends SelectableSourceEntry>(
  executable: readonly T[],
  readiness: ReadonlyMap<string, ReproductionSurfaceEntry>,
): readonly T[] {
  const groups = new Map<string, T[]>();
  for (const entry of executable) {
    // An executable entry without a target id cannot be proven distinct from
    // any other, so it gets its own group keyed by path rather than being
    // merged into a shared bucket it may not belong to.
    const key = readiness.get(entry.path)?.targetId ?? `path:${entry.path}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [entry]);
    else group.push(entry);
  }
  const spread: T[] = [];
  for (let round = 0; spread.length < executable.length; round += 1) {
    for (const group of groups.values()) {
      const entry = group[round];
      if (entry !== undefined) spread.push(entry);
    }
  }
  return spread;
}

/**
 * Select a bounded, repository-diverse window.
 *
 * Round-robin across repositories in sorted order, taking one entry from each
 * in turn. A repository with fewer entries than the others simply drops out of
 * later rounds, so the window degrades to "everything" when the universe is
 * smaller than the limit — the previous behaviour, preserved exactly where it
 * was never wrong.
 *
 * Deterministic for a deterministic input: the same universe always yields the
 * same window, which is what makes a campaign reproducible.
 */
export function selectDiverseSourceIndex<T extends SelectableSourceEntry>(
  input: DiverseSelectionInput<T>,
): DiverseSelectionResult<T> {
  const limit = Number.isSafeInteger(input.limit) && input.limit > 0 ? input.limit : 0;
  if (limit === 0 || input.entries.length === 0) {
    return { entries: Object.freeze([]), repositories: 0, omitted: input.entries.length };
  }

  const byRepository = new Map<string, T[]>();
  for (const entry of input.entries) {
    const bucket = byRepository.get(entry.repository);
    if (bucket === undefined) byRepository.set(entry.repository, [entry]);
    else bucket.push(entry);
  }

  const readiness = input.readinessByPath;
  if (readiness !== undefined) {
    for (const bucket of byRepository.values()) {
      // Stable partition, not a sort: original relative order survives inside
      // each capability group, so the selection stays reproducible and a
      // repository's alphabetical shape is still recognizable.
      const executable: T[] = [];
      const rest: T[] = [];
      for (const entry of bucket) {
        const annotation = readiness.get(entry.path);
        if (annotation !== undefined && annotation.readiness === 'EXECUTABLE_NOW') {
          executable.push(entry);
        } else {
          rest.push(entry);
        }
      }
      bucket.length = 0;
      bucket.push(...spreadByTarget(executable, readiness), ...rest);
    }
  }

  const repositories = [...byRepository.keys()].sort();
  const cursors = new Map<string, number>();
  for (const repository of repositories) cursors.set(repository, 0);

  const selected: T[] = [];
  let exhausted = false;
  while (selected.length < limit && !exhausted) {
    exhausted = true;
    for (const repository of repositories) {
      if (selected.length >= limit) break;
      const bucket = byRepository.get(repository)!;
      const cursor = cursors.get(repository)!;
      if (cursor >= bucket.length) continue;
      selected.push(bucket[cursor]!);
      cursors.set(repository, cursor + 1);
      exhausted = false;
    }
  }

  const represented = new Set<string>();
  for (const entry of selected) represented.add(entry.repository);

  return {
    entries: Object.freeze(selected),
    repositories: represented.size,
    omitted: input.entries.length - selected.length,
  };
}
