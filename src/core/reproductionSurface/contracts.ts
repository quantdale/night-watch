// ---------------------------------------------------------------------------
// W10 frozen contract — reproduction surface capability.
//
// WHY THIS EXISTS
// W9 proved Nightwatch can execute a host-derived current-source reproduction.
// Its terminal live campaign then spent all seven reproduction attempts on
// sources that had no executable target, and returned `NOT_AVAILABLE` every
// time. The M0 census established the mechanism: the reasoner-visible source
// index is sorted by (repository, relativePath) and truncated to a fixed
// window, and that window happened to contain exactly one repository — one
// with no `vendor/` directory and therefore zero executable coverage. The
// first executable target in the approved universe sat 51 entries past the
// end of what the reasoner could see.
//
// So the defect was never reasoning quality and never executor breadth: it was
// that executable capability is invisible until a verification turn has already
// been spent. This module is the vocabulary that makes capability visible
// BEFORE the attempt.
//
// AUTHORITY BOUNDARY (load-bearing)
// Everything here is a PROJECTION of facts Nightwatch derived itself from the
// repository's own package metadata. A surface entry can never carry a
// command, argv, absolute path, module-cache location, toolchain path or
// environment value, and nothing the reasoner sends can mint one. Readiness is
// advisory: it informs selection, it never blocks an investigation. Unsupported
// source stays fully readable, because static reasoning and mechanical
// reproducibility are different capabilities.
//
// Pure data. No fs/network/process authority in this module.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import type {
  OwnerLocalExecutorKind,
  OwnerLocalTargetDiscovery,
} from '../ownerLocalReproduction/contracts';

export const REPRODUCTION_SURFACE_MAP_VERSION =
  'nightwatch.reproduction-surface-map.v1' as const;
export const REPRODUCTION_CAPABILITY_CENSUS_VERSION =
  'nightwatch.reproduction-capability-census.v1' as const;
export const W10_YIELD_METRICS_VERSION = 'nightwatch.w10-yield-metrics.v1' as const;

/** Deterministic target-identity prefix. Not a path; safe to show a reasoner. */
export const SURFACE_TARGET_ID_PREFIX = 'surface' as const;

/**
 * Neutral reasoner-visible readiness.
 *
 * `UNKNOWN` is a real state, not a placeholder: a source outside the bounded
 * classified window has not been classified, and saying so is honest where
 * claiming `NOT_EXECUTABLE` would be a fabricated negative.
 */
export const SURFACE_READINESS_CLASSES = [
  'EXECUTABLE_NOW',
  'NOT_EXECUTABLE',
  'UNKNOWN',
] as const;
export type SurfaceReadinessClass = (typeof SURFACE_READINESS_CLASSES)[number];

/**
 * Neutral refusal vocabulary, projected from the frozen W9 host vocabulary.
 *
 * Every W9 `OwnerLocalTargetRefusal` and `OwnerLocalEnvironmentBlock` maps into
 * exactly one of these. The environment blocks collapse into a single
 * `ENVIRONMENT_BLOCKED` class deliberately: which local toolchain is missing,
 * and where it would have been found, is host topology and is not the
 * reasoner's business.
 */
export const SURFACE_REFUSAL_CLASSES = [
  'PATH_MALFORMED',
  'PATH_NOT_APPROVED',
  'NO_SUPPORTED_EXECUTOR',
  'MODULE_ROOT_NOT_FOUND',
  'VENDOR_DIRECTORY_ABSENT',
  'PACKAGE_TEST_FILES_ABSENT',
  'SOURCE_NOT_CURRENT',
  'ENVIRONMENT_BLOCKED',
] as const;
export type SurfaceRefusalClass = (typeof SURFACE_REFUSAL_CLASSES)[number];

/** Hard caps. A capability map must never crowd out the evidence it annotates. */
export const SURFACE_CAPS = Object.freeze({
  /** Entries carried into one reasoner turn. */
  entries: 32,
  /** Distinct executable target ids summarized per campaign. */
  campaignExecutableTargets: 24,
  /** Unsupported targets remembered per campaign. */
  campaignUnsupportedTargets: 24,
  /** Maximum characters of any path-shaped field. */
  pathChars: 200,
});

/**
 * One classified approved source path.
 *
 * `sourcePath` is already reasoner-visible — it came from the approved index —
 * so echoing it grants nothing. `targetId` is a digest rather than a package
 * path so that two sources in the same package are visibly the same
 * verification target without publishing module layout.
 */
export interface ReproductionSurfaceEntry {
  readonly sourcePath: string;
  readonly readiness: SurfaceReadinessClass;
  /** Present only when readiness is `EXECUTABLE_NOW`. */
  readonly executorClass: OwnerLocalExecutorKind | null;
  /** Present only when readiness is `NOT_EXECUTABLE`. */
  readonly refusal: SurfaceRefusalClass | null;
  /** Deterministic package-level identity; null unless executable. */
  readonly targetId: string | null;
}

export interface ReproductionSurfaceMap {
  readonly schemaVersion: typeof REPRODUCTION_SURFACE_MAP_VERSION;
  /** Deterministically ordered; never longer than `SURFACE_CAPS.entries`. */
  readonly entries: readonly ReproductionSurfaceEntry[];
  readonly executableEntryCount: number;
  readonly distinctExecutableTargets: number;
  /** True when classification was bounded before the input was exhausted. */
  readonly truncated: boolean;
}

/**
 * Project one W9 discovery result into the neutral reasoner vocabulary.
 *
 * Total over the frozen W9 vocabulary: an unrecognized status is a contract
 * drift, and the honest projection of "I do not recognize this" is `UNKNOWN`,
 * never a guessed refusal.
 */
export function projectDiscovery(
  sourcePath: string,
  discovery: OwnerLocalTargetDiscovery,
): ReproductionSurfaceEntry {
  if (discovery.status === 'SUPPORTED') {
    return {
      sourcePath,
      readiness: 'EXECUTABLE_NOW',
      executorClass: discovery.target.executor,
      refusal: null,
      targetId: surfaceTargetId(
        discovery.target.repository,
        discovery.target.moduleRelativePath,
        discovery.target.packageRelativePath,
      ),
    };
  }
  if (discovery.status === 'UNSUPPORTED') {
    return {
      sourcePath,
      readiness: 'NOT_EXECUTABLE',
      executorClass: null,
      refusal: discovery.refusal,
      targetId: null,
    };
  }
  if (discovery.status === 'BLOCKED') {
    // Every environment block collapses to one class on purpose: the specific
    // missing local toolchain is host topology, not reasoner-relevant.
    return {
      sourcePath,
      readiness: 'NOT_EXECUTABLE',
      executorClass: null,
      refusal: 'ENVIRONMENT_BLOCKED',
      targetId: null,
    };
  }
  return {
    sourcePath,
    readiness: 'UNKNOWN',
    executorClass: null,
    refusal: null,
    targetId: null,
  };
}

/** Deterministic package-level target identity. */
export function surfaceTargetId(
  repository: string,
  moduleRelativePath: string,
  packageRelativePath: string,
): string {
  return prefixedDigest24(SURFACE_TARGET_ID_PREFIX, {
    repository,
    moduleRelativePath,
    packageRelativePath,
  });
}

/**
 * Assemble a bounded map from already-projected entries.
 *
 * Order is preserved from the caller, which owns selection policy; this
 * function owns only the ceiling and the derived counts, so a caller can never
 * report a coverage number larger than the entries it actually carried.
 */
export function buildReproductionSurfaceMap(
  entries: readonly ReproductionSurfaceEntry[],
): ReproductionSurfaceMap {
  const bounded = entries.slice(0, SURFACE_CAPS.entries);
  const targets = new Set<string>();
  let executable = 0;
  for (const entry of bounded) {
    if (entry.readiness !== 'EXECUTABLE_NOW') continue;
    executable += 1;
    if (entry.targetId !== null) targets.add(entry.targetId);
  }
  return {
    schemaVersion: REPRODUCTION_SURFACE_MAP_VERSION,
    entries: Object.freeze([...bounded]),
    executableEntryCount: executable,
    distinctExecutableTargets: targets.size,
    truncated: entries.length > bounded.length,
  };
}

// ---------------------------------------------------------------------------
// Census — host-side aggregate. NEVER reasoner-visible.
// ---------------------------------------------------------------------------

/**
 * Aggregate reproduction capability over an approved universe.
 *
 * Counts and class names only. No file lists, no absolute paths, no module
 * cache locations: the census exists to answer "how much of this universe is
 * mechanically verifiable", and that question needs no topology.
 */
export interface ReproductionCapabilityCensus {
  readonly schemaVersion: typeof REPRODUCTION_CAPABILITY_CENSUS_VERSION;
  readonly eligibleSourceFiles: number;
  readonly executableSourceFiles: number;
  readonly distinctExecutableTargets: number;
  /** Refusal class -> file count, deterministically ordered by class name. */
  readonly refusalDistribution: Readonly<Record<string, number>>;
  readonly repositories: readonly ReproductionCapabilityCensusRepository[];
  /** True when enumeration was bounded before the universe was exhausted. */
  readonly truncated: boolean;
}

export interface ReproductionCapabilityCensusRepository {
  readonly repository: string;
  readonly eligibleSourceFiles: number;
  readonly executableSourceFiles: number;
  readonly distinctExecutableTargets: number;
  readonly refusalDistribution: Readonly<Record<string, number>>;
  readonly enumerationTruncated: boolean;
}

// ---------------------------------------------------------------------------
// W10 yield metrics.
// ---------------------------------------------------------------------------

/**
 * Yield of one campaign, measured so that improvement cannot be claimed from
 * activity volume. `notAvailableAttempts / reproductionAttempts` is the W9
 * regression guard: W9's reference is 7/7.
 */
export interface W10YieldMetrics {
  readonly schemaVersion: typeof W10_YIELD_METRICS_VERSION;
  /** Distinct approved sources the reasoner could see at all. */
  readonly visibleSources: number;
  /** Of those, how many were `EXECUTABLE_NOW`. */
  readonly visibleExecutableSources: number;
  /** Distinct executable targets represented in the visible surface. */
  readonly visibleExecutableTargets: number;
  /** Distinct repositories represented in the visible surface. */
  readonly visibleRepositories: number;
  readonly reproductionAttempts: number;
  readonly executableTargetAttempts: number;
  readonly notAvailableAttempts: number;
  /** Attempts against a target already known deterministically unsupported. */
  readonly repeatedUnsupportedAttempts: number;
  readonly qualifyingReproductions: number;
  /** Null when no executable reproduction was ever reached. */
  readonly attemptsToFirstExecutableReproduction: number | null;
  readonly callsToFirstExecutableReproduction: number | null;
}

/** Executable selection rate, or null when nothing was attempted. */
export function executableSelectionRate(metrics: W10YieldMetrics): number | null {
  if (metrics.reproductionAttempts === 0) return null;
  return metrics.executableTargetAttempts / metrics.reproductionAttempts;
}

/** `NOT_AVAILABLE` waste rate, or null when nothing was attempted. */
export function notAvailableRate(metrics: W10YieldMetrics): number | null {
  if (metrics.reproductionAttempts === 0) return null;
  return metrics.notAvailableAttempts / metrics.reproductionAttempts;
}
