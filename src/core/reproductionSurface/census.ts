// ---------------------------------------------------------------------------
// W10 M2 — deterministic reproduction-capability census engine.
//
// WHY THIS EXISTS
// The M0 census proved reproduction coverage is not scarce (1,120 executable
// files in the live universe) but was invisible: the reasoner-visible index is
// a repository-major prefix, so all 32 visible entries came from one
// zero-coverage repository. This engine is the reusable, host-side aggregate
// that answers "how much of this universe is mechanically verifiable" with
// counts and class names only — no file lists, no absolute paths, no topology.
// It is NEVER reasoner-visible; the neutral reasoner vocabulary lives in
// `contracts.ts`, which this module consumes but does not extend.
//
// PURITY (load-bearing)
// The engine never touches fs, network, or child_process. Executability facts
// arrive through the injected `classify` callback, which the caller wires to
// the real host discovery. That is what makes this module unit-testable and
// keeps the hardening surface unchanged.
//
// FAIL-CLOSED RULES
// - Malformed records (non-object, empty repository, empty relativePath,
//   non-string fields) are never passed to `classify`, can never mint an
//   executable target, and are tallied as `PATH_MALFORMED` refusals. A
//   malformed record with a usable repository id is attributed to that
//   repository's row; one without is counted in the top-level totals only,
//   because there is no valid id to attribute it to.
// - A `classify` throw, a non-object discovery, an unrecognized status, or a
//   refusal outside the frozen neutral vocabulary projects as `UNKNOWN`:
//   counted as eligible, never as executable, never as a refusal.
// - Oversize input truncates deterministically (input order preserved) rather
//   than throwing; truncation is always reported honestly.
// ---------------------------------------------------------------------------

import {
  REPRODUCTION_CAPABILITY_CENSUS_VERSION,
  SURFACE_REFUSAL_CLASSES,
  projectDiscovery,
  type ReproductionCapabilityCensus,
  type ReproductionCapabilityCensusRepository,
  type ReproductionSurfaceEntry,
} from './contracts';
import type { OwnerLocalTargetDiscovery } from '../ownerLocalReproduction/contracts';

/** One approved source file as seen by the enumerator. Paths are relative ids, never absolute. */
export interface CensusSourceRecord {
  readonly repository: string;
  readonly relativePath: string;
}

export interface CensusInput {
  /** Enumeration-order records; the engine owns classification, never enumeration. */
  readonly records: readonly CensusSourceRecord[];
  /** Host discovery probe: approved `repository:relativePath` -> W9 discovery. Must be pure for a pure census. */
  readonly classify: (sourcePath: string) => OwnerLocalTargetDiscovery;
  /** Repository ids whose enumeration was bounded before exhaustion. */
  readonly truncatedRepositories?: readonly string[];
  /** Hard record ceiling; input beyond it is dropped deterministically. Defaults to `CENSUS_DEFAULT_MAX_RECORDS`. */
  readonly maxRecords?: number;
}

/**
 * Default hard ceiling on classified records. Large enough that real approved
 * universes (M0 measured ~4k eligible files) never truncate; small enough that
 * a runaway enumerator cannot crowd out the evidence the census annotates.
 */
export const CENSUS_DEFAULT_MAX_RECORDS = 100_000;

/** Refusal classes the census may ever emit: exactly the frozen neutral vocabulary. */
const REFUSAL_VOCABULARY: ReadonlySet<string> = new Set<string>([...SURFACE_REFUSAL_CLASSES]);

/** Deterministic ordering for every emitted key sequence (UTF-16 code-unit order). */
function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function unknownEntry(sourcePath: string): ReproductionSurfaceEntry {
  return {
    sourcePath,
    readiness: 'UNKNOWN',
    executorClass: null,
    refusal: null,
    targetId: null,
  };
}

/**
 * Total projection of one host discovery into the neutral vocabulary. Never
 * throws: unrecognized shapes are "not classified" (`UNKNOWN`), never a
 * guessed refusal and never executable.
 */
function classifySafely(
  sourcePath: string,
  classify: (sourcePath: string) => OwnerLocalTargetDiscovery,
): ReproductionSurfaceEntry {
  try {
    const discovery: unknown = classify(sourcePath);
    if (discovery === null || typeof discovery !== 'object') return unknownEntry(sourcePath);
    const status = (discovery as { readonly status?: unknown }).status;
    if (status !== 'SUPPORTED' && status !== 'UNSUPPORTED' && status !== 'BLOCKED') {
      return unknownEntry(sourcePath);
    }
    return projectDiscovery(sourcePath, discovery as OwnerLocalTargetDiscovery);
  } catch {
    return unknownEntry(sourcePath);
  }
}

/** A record well-formed enough to classify, or null when it must fail closed. */
function validRecordShape(raw: unknown): { repository: string; relativePath: string } | null {
  if (raw === null || typeof raw !== 'object') return null;
  const candidate = raw as { readonly repository?: unknown; readonly relativePath?: unknown };
  if (typeof candidate.repository !== 'string' || candidate.repository.length === 0) return null;
  if (typeof candidate.relativePath !== 'string' || candidate.relativePath.length === 0) {
    return null;
  }
  return { repository: candidate.repository, relativePath: candidate.relativePath };
}

/** Repository id usable for row attribution, or null when there is none. */
function attributableRepository(raw: unknown): string | null {
  if (raw === null || typeof raw !== 'object') return null;
  const repository = (raw as { readonly repository?: unknown }).repository;
  return typeof repository === 'string' && repository.length > 0 ? repository : null;
}

/** Non-positive, non-integer, or non-numeric ceilings fail closed to zero; absent means the default. */
function normalizeCeiling(maxRecords: unknown): number {
  if (maxRecords === undefined) return CENSUS_DEFAULT_MAX_RECORDS;
  if (typeof maxRecords !== 'number' || !Number.isSafeInteger(maxRecords) || maxRecords < 0) {
    return 0;
  }
  return maxRecords;
}

interface RepositoryAccumulator {
  eligibleSourceFiles: number;
  executableSourceFiles: number;
  executableTargets: Set<string>;
  refusals: Map<string, number>;
}

function newRepositoryAccumulator(): RepositoryAccumulator {
  return {
    eligibleSourceFiles: 0,
    executableSourceFiles: 0,
    executableTargets: new Set<string>(),
    refusals: new Map<string, number>(),
  };
}

function tallyRefusal(into: Map<string, number>, refusal: string): void {
  into.set(refusal, (into.get(refusal) ?? 0) + 1);
}

/** Emit a refusal map as a plain object with keys in deterministic order. */
function sortedRefusalObject(refusals: Map<string, number>): Readonly<Record<string, number>> {
  const ordered = [...refusals.entries()].sort(([a], [b]) => compareStrings(a, b));
  const out: Record<string, number> = {};
  for (const [refusal, count] of ordered) out[refusal] = count;
  return Object.freeze(out);
}

function tallyEntry(
  entry: ReproductionSurfaceEntry,
  repo: RepositoryAccumulator,
  topTargets: Set<string>,
  topRefusals: Map<string, number>,
): { executable: boolean } {
  if (entry.readiness === 'EXECUTABLE_NOW') {
    repo.executableSourceFiles += 1;
    if (typeof entry.targetId === 'string' && entry.targetId.length > 0) {
      repo.executableTargets.add(entry.targetId);
      topTargets.add(entry.targetId);
    }
    return { executable: true };
  }
  if (
    entry.readiness === 'NOT_EXECUTABLE' &&
    typeof entry.refusal === 'string' &&
    REFUSAL_VOCABULARY.has(entry.refusal)
  ) {
    tallyRefusal(repo.refusals, entry.refusal);
    tallyRefusal(topRefusals, entry.refusal);
  }
  // UNKNOWN (or vocabulary-drift) entries stay eligible-only: honest, never guessed.
  return { executable: false };
}

/**
 * Aggregate one deterministic census over the given records.
 *
 * Pure: classification flows only through `input.classify`. Output carries
 * counts and class names only — no file lists, no absolute paths.
 */
export function buildReproductionCapabilityCensus(input: CensusInput): ReproductionCapabilityCensus {
  const untrusted = input as Partial<CensusInput> | null | undefined;
  const records: readonly unknown[] = Array.isArray(untrusted?.records) ? untrusted.records : [];
  const classify =
    typeof untrusted?.classify === 'function'
      ? (untrusted.classify as (sourcePath: string) => OwnerLocalTargetDiscovery)
      : null;

  const truncatedSet = new Set<string>();
  if (Array.isArray(untrusted?.truncatedRepositories)) {
    for (const name of untrusted.truncatedRepositories) {
      if (typeof name === 'string' && name.length > 0) truncatedSet.add(name);
    }
  }

  const ceiling = normalizeCeiling(untrusted?.maxRecords);
  const bounded = records.slice(0, ceiling);
  const ceilingCut = records.length > bounded.length;

  const byRepository = new Map<string, RepositoryAccumulator>();
  const topTargets = new Set<string>();
  const topRefusals = new Map<string, number>();
  let executableSourceFiles = 0;

  const repositoryOf = (repository: string): RepositoryAccumulator => {
    let acc = byRepository.get(repository);
    if (acc === undefined) {
      acc = newRepositoryAccumulator();
      byRepository.set(repository, acc);
    }
    return acc;
  };

  for (const raw of bounded) {
    const valid = validRecordShape(raw);
    if (valid === null) {
      // Fail closed: never classified, never executable, but counted.
      tallyRefusal(topRefusals, 'PATH_MALFORMED');
      const repository = attributableRepository(raw);
      if (repository !== null) {
        const repo = repositoryOf(repository);
        repo.eligibleSourceFiles += 1;
        tallyRefusal(repo.refusals, 'PATH_MALFORMED');
      }
      continue;
    }
    const repo = repositoryOf(valid.repository);
    repo.eligibleSourceFiles += 1;
    const sourcePath = `${valid.repository}:${valid.relativePath}`;
    const entry =
      classify === null ? unknownEntry(sourcePath) : classifySafely(sourcePath, classify);
    const { executable } = tallyEntry(entry, repo, topTargets, topRefusals);
    if (executable) executableSourceFiles += 1;
  }

  const repositories: ReproductionCapabilityCensusRepository[] = [...byRepository.entries()]
    .sort(([a], [b]) => compareStrings(a, b))
    .map(([repository, acc]) =>
      Object.freeze({
        repository,
        eligibleSourceFiles: acc.eligibleSourceFiles,
        executableSourceFiles: acc.executableSourceFiles,
        distinctExecutableTargets: acc.executableTargets.size,
        refusalDistribution: sortedRefusalObject(acc.refusals),
        enumerationTruncated: truncatedSet.has(repository),
      }),
    );

  return Object.freeze({
    schemaVersion: REPRODUCTION_CAPABILITY_CENSUS_VERSION,
    eligibleSourceFiles: bounded.length,
    executableSourceFiles,
    distinctExecutableTargets: topTargets.size,
    refusalDistribution: sortedRefusalObject(topRefusals),
    repositories: Object.freeze(repositories),
    truncated: ceilingCut || truncatedSet.size > 0,
  });
}
