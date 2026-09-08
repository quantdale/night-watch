// ---------------------------------------------------------------------------
// W7 context lane — owner-local provider adapters behind the frozen context.
//
// createOwnerLocalInvestigationContext assembles a real LOCAL context from
// existing Nightwatch engines only: the confined sibling-source boundary, the
// approved source scan, the owner-private Bug Atlas snapshot plus the
// read-only Git miner, and explicitly configured System Atlas / evidence /
// reproduction inputs. Nothing here invents source, topology, Atlas facts,
// evidence, or reproduction outcomes.
//
// Fail-closed throughout: missing real data is an explicit BLOCKED provider
// result (NOT_CONFIGURED / DATA_BLOCKED / SOURCE_UNAVAILABLE / SOURCE_STALE /
// UNSAFE_INPUT). Synthetic Bug/System Atlas fixtures are never consulted on
// this path. The evidence provider reads a strict configured in-memory
// mapping by exact key only — no filesystem, no symlinks, no outside-repo
// reads by construction.
// ---------------------------------------------------------------------------

import type { BugAtlasRecord, SystemAtlasRecord } from '../agentProtocol/atlas';
import type { UntrustedSource } from '../agentProtocol/untrusted';
import type { AgentToolId } from '../agentProtocol/tools';
import { createBugAtlasStore, type BugAtlasStore } from '../bugAtlas/store';
import { loadBugAtlasSnapshot } from '../bugAtlas/snapshot';
import { mineLocalGitHistory } from '../bugAtlas/miner';
import { createApprovedRealSourceScanConfig } from '../source/approvedScan';
import {
  discoverSourceSurfaces,
  type SourceSurfaceDiscovery,
} from '../source/surfaces';
import type { RealSourceScanConfig, RealSourceSnapshotInventory } from '../source/scanTypes';
import {
  createSiblingSourceAccess,
  DEFAULT_SIBLING_ROOT,
  type SiblingSourceAccess,
} from '../source/siblingSource';
import { createSystemAtlasOverlay, type SystemAtlasOverlay } from '../systemAtlas/overlay';
import { SYSTEM_ATLAS_SYNTHETIC_PREFIX } from '../systemAtlas/model';
import type { SystemMapInput } from '../systemMap/projections';
import { systemMapInputFromDiscovery } from '../systemMap/input';
import type {
  DeterministicReproductionProvider,
  LocalBugAtlasProvider,
  LocalEvidenceProvider,
  LocalEvidenceRecord,
  LocalInvestigationContext,
  LocalInvestigationDataClass,
  LocalProviderBlockClass,
  LocalProviderResult,
  LocalSourceDocument,
  LocalSourceIndex,
  LocalSourceIndexEntry,
  LocalSourceProvider,
  LocalSystemAtlasProvider,
  LocalSystemMapProvider,
} from './types';
import { LOCAL_INVESTIGATION_CONTEXT_VERSION } from './types';
import {
  createOwnerLocalReproductionProvider,
  discoverOwnerLocalTarget,
} from '../ownerLocalReproduction/provider';
import {
  projectDiscovery,
  type ReproductionSurfaceEntry,
} from '../reproductionSurface/contracts';
import { selectDiverseSourceIndex } from '../reproductionSurface/selection';

export const OWNER_LOCAL_CONTEXT_VERSION = 'nightwatch.owner-local-investigation-context.v1' as const;

const OWNER_LOCAL_SOURCE_PROVIDER_ID = 'owner-local-source' as const;
const OWNER_LOCAL_SYSTEM_MAP_PROVIDER_ID = 'owner-local-system-map' as const;
const OWNER_LOCAL_BUG_ATLAS_PROVIDER_ID = 'owner-local-bug-atlas' as const;
const OWNER_LOCAL_SYSTEM_ATLAS_PROVIDER_ID = 'owner-local-system-atlas' as const;
const OWNER_LOCAL_EVIDENCE_PROVIDER_ID = 'owner-local-evidence' as const;
const UNAVAILABLE_REPRODUCTION_PROVIDER_ID = 'unavailable-local-reproduction' as const;

const DEFAULT_SOURCE_INDEX_LIMIT = 200;
/**
 * Capability classification reads source bytes through the confined boundary,
 * so it is deliberately bounded: probe a small multiple of the window rather
 * than the whole universe. Four times the window is enough for capability to
 * reorder a repository's own share; the ceiling stops a large `indexLimit`
 * from turning an index call into a full-universe scan.
 */
const CAPABILITY_PROBE_MULTIPLIER = 4;
const CAPABILITY_PROBE_CEILING = 256;
const DATA_CLASSES: readonly LocalInvestigationDataClass[] = ['REAL_LOCAL', 'REAL_HISTORICAL', 'SYNTHETIC_TEST'];
const SOURCE_STALE_MARKER = 'OWNER_LOCAL_SOURCE_STALE' as const;

/** Strict configured evidence entry: source travels with the record. */
export interface OwnerLocalEvidenceInput {
  readonly source: UntrustedSource;
  readonly record: unknown;
}

export interface OwnerLocalInvestigationOptions {
  /** Defaults to REAL_LOCAL. */
  readonly dataClass?: LocalInvestigationDataClass;
  /** Defaults to NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT. */
  readonly siblingRoot?: string;
  /** Defaults to the full owner-approved universe. */
  readonly repositoryIds?: readonly string[];
  /** Full scan-config override (tests, historical surfaces). Defaults to the approved config. */
  readonly scanConfig?: RealSourceScanConfig;
  /** Defaults to NIGHTWATCH_BUG_ATLAS_STATE_DIR ?? ~/.nightwatch/bug-atlas. */
  readonly bugAtlasStateDirectory?: string;
  /** Defaults to NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT. */
  readonly bugAtlasRepositoriesRoot?: string;
  readonly bugAtlasMaxRepos?: number;
  readonly bugAtlasMaxCommitsPerRepo?: number;
  /**
   * Explicitly configured proven real System Atlas records. Absent means the
   * provider is BLOCKED (NOT_CONFIGURED) — synthetic records are never
   * substituted.
   */
  readonly systemAtlasRecords?: readonly SystemAtlasRecord[];
  /** Strict evidence mapping consulted by exact key. Defaults to empty (every ref BLOCKED). */
  readonly evidence?: Readonly<Record<string, OwnerLocalEvidenceInput>>;
  /** Injected deterministic reproduction provider. Absent means BLOCKED (NOT_CONFIGURED). */
  readonly reproduction?: DeterministicReproductionProvider;
  /** Defaults to 200 entries. */
  readonly sourceIndexLimit?: number;
}

function blocked<T>(cls: LocalProviderBlockClass, reason: string): LocalProviderResult<T> {
  return { status: 'BLOCKED', class: cls, reason };
}

/** Provider-unique approved path, verbatim for later reads. The repo id never contains ':'. */
function encodeSourcePath(repository: string, relativePath: string): string {
  return `${repository}:${relativePath}`;
}

function decodeSourcePath(path: string): { readonly repository: string; readonly relativePath: string } | null {
  const separator = path.indexOf(':');
  if (separator <= 0 || separator === path.length - 1) return null;
  return { repository: path.slice(0, separator), relativePath: path.slice(separator + 1) };
}

interface PreparedSource {
  readonly siblingRoot: string;
  readonly access: SiblingSourceAccess;
  readonly config: RealSourceScanConfig;
  readonly indexLimit: number;
  inventory(): RealSourceSnapshotInventory;
  discovery(): SourceSurfaceDiscovery;
}

function prepareSource(options: OwnerLocalInvestigationOptions): PreparedSource {
  const config = options.scanConfig ?? createApprovedRealSourceScanConfig(
    options.repositoryIds === undefined ? {} : { repositoryIds: options.repositoryIds },
  );
  const siblingRoot = options.siblingRoot ?? process.env['NIGHTWATCH_REPOS_ROOT'] ?? DEFAULT_SIBLING_ROOT;
  const access = createSiblingSourceAccess(siblingRoot, {
    admittedRepositoryIds: config.approvedRepositories.map((repository) => repository.repoId),
  });
  const indexLimit = options.sourceIndexLimit ?? DEFAULT_SOURCE_INDEX_LIMIT;
  let cached: SourceSurfaceDiscovery | null = null;
  const discovery = (): SourceSurfaceDiscovery => {
    if (cached === null) cached = discoverSourceSurfaces({ access, config });
    return cached;
  };
  return {
    access,
    siblingRoot,
    config,
    indexLimit,
    discovery,
    inventory(): RealSourceSnapshotInventory {
      return discovery().inventory;
    },
  };
}

/**
 * Full eligible entry set for CURRENT repositories, deterministically sorted.
 * Throws SOURCE_STALE_MARKER when stale checkouts (but no current ones)
 * exist, or a generic error when nothing is readable.
 */
function loadEligibleEntries(prepared: PreparedSource): readonly LocalSourceIndexEntry[] {
  const inventory = prepared.inventory();
  const current = new Set(
    inventory.repositories.filter((repository) => repository.status === 'CURRENT').map((repository) => repository.repoId),
  );
  if (current.size === 0) {
    const stale = inventory.repositories.some((repository) => repository.status === 'SOURCE_STALE');
    throw new Error(stale ? SOURCE_STALE_MARKER : 'OWNER_LOCAL_SOURCE_UNAVAILABLE');
  }
  const entries: LocalSourceIndexEntry[] = [];
  for (const file of inventory.files) {
    if (file.status !== 'ELIGIBLE') continue;
    if (!current.has(file.repoId)) continue;
    if (file.sourceSha === null || file.language === null || file.byteCount === null || file.contentDigest === null) continue;
    entries.push({
      path: encodeSourcePath(file.repoId, file.relativePath),
      repository: file.repoId,
      relativePath: file.relativePath,
      sourceSha: file.sourceSha,
      language: file.language,
      byteCount: file.byteCount,
      contentDigest: file.contentDigest,
    });
  }
  entries.sort((left, right) => (
    left.repository < right.repository ? -1
      : left.repository > right.repository ? 1
        : left.relativePath < right.relativePath ? -1
          : left.relativePath > right.relativePath ? 1 : 0
  ));
  return entries;
}

function isStaleMarker(error: unknown): boolean {
  return error instanceof Error && error.message === SOURCE_STALE_MARKER;
}

function createOwnerSourceProvider(prepared: PreparedSource): LocalSourceProvider {
  let allCache: readonly LocalSourceIndexEntry[] | null = null;
  let indexCache: LocalSourceIndex | null = null;
  const all = (): readonly LocalSourceIndexEntry[] => {
    if (allCache === null) allCache = loadEligibleEntries(prepared);
    return allCache;
  };
  const paged = (): LocalSourceIndex => {
    if (indexCache !== null) return indexCache;
    const entries = all();
    const truncated = entries.length > prepared.indexLimit;
    // W10. The old behaviour was `entries.slice(0, indexLimit)`, and because
    // `loadEligibleEntries` sorts repository-major, that prefix was not a
    // sample of the universe — it was the first repository. On the live
    // universe it produced 32 entries from one repository with zero executable
    // coverage while 152 executable targets sat behind it, which is exactly
    // how W9 spent every reproduction attempt on an unsupported surface.
    //
    // Diversity is decided first and capability-blind, so no repository can be
    // starved by having no executable packages. Only then is a bounded
    // oversample classified, and capability merely orders each repository's
    // own share. Classification is bounded because it reads source bytes
    // through the confined boundary: probing the whole universe would charge
    // thousands of reads to answer a question about 32 entries.
    const probeLimit = Math.min(
      entries.length,
      prepared.indexLimit * CAPABILITY_PROBE_MULTIPLIER,
      CAPABILITY_PROBE_CEILING,
    );
    const probed = selectDiverseSourceIndex({ entries, limit: probeLimit });
    const readinessByPath = new Map<string, ReproductionSurfaceEntry>();
    for (const entry of probed.entries) {
      readinessByPath.set(
        entry.path,
        projectDiscovery(
          entry.path,
          discoverOwnerLocalTarget({
            sourcePath: entry.path,
            siblingRoot: prepared.siblingRoot,
            repositoryIds: prepared.config.approvedRepositories.map((repository) => repository.repoId),
          }),
        ),
      );
    }
    const selected = selectDiverseSourceIndex({
      entries: probed.entries,
      limit: prepared.indexLimit,
      readinessByPath,
    });
    indexCache = {
      entries: Object.freeze(selected.entries.map((entry) => ({ ...entry }))),
      total: entries.length,
      truncated,
      surface: Object.freeze(
        selected.entries.map(
          (entry) => readinessByPath.get(entry.path) ?? projectDiscovery(entry.path, { status: 'UNKNOWN' } as never),
        ),
      ),
    };
    return indexCache;
  };
  return {
    providerId: OWNER_LOCAL_SOURCE_PROVIDER_ID,
    async index(): Promise<LocalProviderResult<LocalSourceIndex>> {
      try {
        return { status: 'AVAILABLE', value: paged() };
      } catch (error) {
        if (isStaleMarker(error)) {
          return blocked('SOURCE_STALE', 'owner-approved sources are stale relative to the approved scan; refusing a stale index');
        }
        return blocked('SOURCE_UNAVAILABLE', 'no CURRENT owner-approved source repository is readable; refusing to invent an index');
      }
    },
    async read(path: string): Promise<LocalProviderResult<LocalSourceDocument>> {
      const decoded = decodeSourcePath(path);
      if (decoded === null) {
        return blocked('UNSAFE_INPUT', 'source path is malformed; reads require the verbatim approved path from the index');
      }
      let entries: readonly LocalSourceIndexEntry[];
      try {
        entries = all();
      } catch (error) {
        if (isStaleMarker(error)) {
          return blocked('SOURCE_STALE', 'owner-approved sources are stale; refusing a stale read');
        }
        return blocked('SOURCE_UNAVAILABLE', 'no CURRENT owner-approved source repository is readable');
      }
      // Exact membership in the full eligible set: unknown paths fail closed
      // even when the paged index is truncated.
      const entry = entries.find((candidate) => candidate.path === path) ?? null;
      if (entry === null) {
        return blocked('SOURCE_UNAVAILABLE', 'path is not in the approved source index; refusing an out-of-scope read');
      }
      if (entry.repository !== decoded.repository || entry.relativePath !== decoded.relativePath) {
        return blocked('UNSAFE_INPUT', 'source path does not decode to its indexed repository entry');
      }
      // The checkout may have moved between index and read: re-check HEAD.
      const current = prepared.access.currentness.currentSnapshot(entry.repository);
      if (current === null || current.sha !== entry.sourceSha) {
        return blocked('SOURCE_STALE', 'repository HEAD moved after the approved scan; refusing a stale read');
      }
      const text = prepared.access.reader.readFile(entry.repository, entry.relativePath);
      if (text === null) {
        return blocked('SOURCE_UNAVAILABLE', 'approved source file could not be read within bounds; refusing a partial read');
      }
      return {
        status: 'AVAILABLE',
        value: { ...entry, text },
      };
    },
  };
}

function createOwnerSystemMapProvider(prepared: PreparedSource): LocalSystemMapProvider {
  let cached: SystemMapInput | null = null;
  return {
    providerId: OWNER_LOCAL_SYSTEM_MAP_PROVIDER_ID,
    async load(): Promise<LocalProviderResult<SystemMapInput>> {
      try {
        const discovery = prepared.discovery();
        const current = discovery.inventory.repositories.some(
          (repository) => repository.status === 'CURRENT',
        );
        if (!current) {
          return blocked(
            'SOURCE_UNAVAILABLE',
            'no CURRENT owner-approved source repository; refusing to invent topology',
          );
        }
        if (cached === null) cached = systemMapInputFromDiscovery(discovery);
        return { status: 'AVAILABLE', value: cached };
      } catch {
        return blocked(
          'SOURCE_UNAVAILABLE',
          'owner-approved source discovery failed; refusing to invent topology',
        );
      }
    },
  };
}

function createOwnerBugAtlasProvider(options: OwnerLocalInvestigationOptions, prepared: PreparedSource): LocalBugAtlasProvider {
  let cached: BugAtlasStore | 'BLOCKED' | null = null;
  const store = (): BugAtlasStore | null => {
    if (cached !== null) return cached === 'BLOCKED' ? null : cached;
    // Owner-private snapshot first; the read-only miner only when no usable
    // snapshot exists. Both are real owner-local data — fixtures are never
    // consulted on this path.
    try {
      const snapshot = loadBugAtlasSnapshot(
        options.bugAtlasStateDirectory === undefined ? {} : { stateDirectory: options.bugAtlasStateDirectory },
      );
      if (snapshot.records.length > 0) {
        cached = createBugAtlasStore(snapshot.records);
        return cached;
      }
    } catch {
      // Absent or invalid snapshot: fall through to the miner.
    }
    const report = mineLocalGitHistory({
      repositoriesRoot: options.bugAtlasRepositoriesRoot,
      repositoryIds: prepared.config.approvedRepositories.map((repository) => repository.repoId),
      maxRepos: options.bugAtlasMaxRepos,
      maxCommitsPerRepo: options.bugAtlasMaxCommitsPerRepo,
    });
    if (report.status !== 'MINED' || report.records.length === 0) {
      cached = 'BLOCKED';
      return null;
    }
    try {
      cached = createBugAtlasStore(report.records);
    } catch {
      cached = 'BLOCKED';
      return null;
    }
    return cached;
  };
  return {
    providerId: OWNER_LOCAL_BUG_ATLAS_PROVIDER_ID,
    async load(): Promise<LocalProviderResult<BugAtlasStore>> {
      const value = store();
      if (value === null) {
        return blocked('DATA_BLOCKED', 'no owner-private Bug Atlas snapshot or mined history is available; refusing fixture fallback');
      }
      return { status: 'AVAILABLE', value };
    },
  };
}

function createOwnerSystemAtlasProvider(options: OwnerLocalInvestigationOptions): LocalSystemAtlasProvider {
  // Eager validation: misconfigured real records fail fast at harness setup,
  // never mid-investigation.
  let overlay: SystemAtlasOverlay | null = null;
  if (options.systemAtlasRecords !== undefined) {
    for (const record of options.systemAtlasRecords) {
      if (typeof record.conceptId === 'string' && record.conceptId.startsWith(SYSTEM_ATLAS_SYNTHETIC_PREFIX)) {
        throw new Error('OWNER_LOCAL_SYSTEM_ATLAS_SYNTHETIC_REFUSED:synthetic records are test-only and never load as real knowledge');
      }
    }
    overlay = createSystemAtlasOverlay(options.systemAtlasRecords);
  }
  return {
    providerId: OWNER_LOCAL_SYSTEM_ATLAS_PROVIDER_ID,
    async load(): Promise<LocalProviderResult<SystemAtlasOverlay>> {
      if (overlay === null) {
        return blocked('NOT_CONFIGURED', 'no proven real System Atlas records are configured; refusing synthetic substitution');
      }
      return { status: 'AVAILABLE', value: overlay };
    },
  };
}

function createOwnerEvidenceProvider(options: OwnerLocalInvestigationOptions): LocalEvidenceProvider {
  const mapping = options.evidence ?? {};
  return {
    providerId: OWNER_LOCAL_EVIDENCE_PROVIDER_ID,
    async get(evidenceRef: string): Promise<LocalProviderResult<LocalEvidenceRecord>> {
      // Exact-key lookup over the configured in-memory mapping only. There is
      // no path resolution, no filesystem, and no fetch — symlink and
      // outside-repo reads are impossible by construction.
      if (typeof evidenceRef !== 'string' || evidenceRef.length === 0) {
        return blocked('UNSAFE_INPUT', 'evidence ref must be a non-empty string');
      }
      const entry: OwnerLocalEvidenceInput | undefined = Object.prototype.hasOwnProperty.call(mapping, evidenceRef)
        ? mapping[evidenceRef]
        : undefined;
      if (entry === undefined || entry === null || typeof entry !== 'object') {
        return blocked('DATA_BLOCKED', 'evidence ref is not in the configured sanitized mapping');
      }
      return { status: 'AVAILABLE', value: { evidenceRef, source: entry.source, record: entry.record } };
    },
  };
}

function createBlockedReproductionProvider(): DeterministicReproductionProvider {
  return {
    providerId: UNAVAILABLE_REPRODUCTION_PROVIDER_ID,
    async run() {
      return blocked('NOT_CONFIGURED', 'no deterministic reproduction provider is configured; refusing to invent success');
    },
  };
}

/**
 * Build the real owner-local investigation context. Only bounded,
 * already-authorized local inputs are assembled, using existing engines.
 */
export function createOwnerLocalInvestigationContext(options: OwnerLocalInvestigationOptions = {}): LocalInvestigationContext {
  const dataClass = options.dataClass ?? 'REAL_LOCAL';
  if (!DATA_CLASSES.includes(dataClass)) {
    throw new Error(`OWNER_LOCAL_DATA_CLASS_INVALID:${String(dataClass)}`);
  }
  const prepared = prepareSource(options);
  // One source provider instance serves reads and grounds reproduction: the
  // reproduction provider re-reads request.sourcePath through it and binds
  // the proof digest to the inspected source.
  const source = createOwnerSourceProvider(prepared);
  return {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass,
    source,
    systemMap: createOwnerSystemMapProvider(prepared),
    bugAtlas: createOwnerBugAtlasProvider(options, prepared),
    systemAtlas: createOwnerSystemAtlasProvider(options),
    evidence: createOwnerEvidenceProvider(options),
    reproduction: options.reproduction ?? createDefaultReproductionProvider(dataClass, prepared, source),
  };
}

/**
 * W9 zero-option REAL_LOCAL default: the host-owned current-source
 * reproduction provider over the same sibling root and approved repositories
 * the source provider reads. An explicit options.reproduction still overrides
 * (tests, historical composition); non-REAL_LOCAL data classes stay
 * fail-closed BLOCKED without an injected provider.
 */
function createDefaultReproductionProvider(
  dataClass: LocalInvestigationDataClass,
  prepared: PreparedSource,
  source: LocalSourceProvider,
): DeterministicReproductionProvider {
  if (dataClass !== 'REAL_LOCAL') return createBlockedReproductionProvider();
  return createOwnerLocalReproductionProvider({
    siblingRoot: prepared.siblingRoot,
    repositoryIds: prepared.config.approvedRepositories.map((repository) => repository.repoId),
    sourceProvider: source,
  });
}

const UNAVAILABLE_REASON =
  'this context carries no local providers; every provider-backed tool fails closed as ADAPTER_UNAVAILABLE' as const;

/**
 * Build a context with no local providers. Every provider-backed tool fails
 * closed; pure session semantics (gates, proposal capture) still apply.
 */
export function createUnavailableLocalInvestigationContext(
  dataClass: LocalInvestigationDataClass = 'REAL_LOCAL',
): LocalInvestigationContext {
  if (!DATA_CLASSES.includes(dataClass)) {
    throw new Error(`OWNER_LOCAL_DATA_CLASS_INVALID:${String(dataClass)}`);
  }
  return {
    schemaVersion: LOCAL_INVESTIGATION_CONTEXT_VERSION,
    dataClass,
    source: {
      providerId: 'unavailable-local-source',
      async index(): Promise<LocalProviderResult<LocalSourceIndex>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
      async read(): Promise<LocalProviderResult<LocalSourceDocument>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
    },
    systemMap: {
      providerId: 'unavailable-local-system-map',
      async load(): Promise<LocalProviderResult<SystemMapInput>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
    },
    bugAtlas: {
      providerId: 'unavailable-local-bug-atlas',
      async load(): Promise<LocalProviderResult<BugAtlasStore>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
    },
    systemAtlas: {
      providerId: 'unavailable-local-system-atlas',
      async load(): Promise<LocalProviderResult<SystemAtlasOverlay>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
    },
    evidence: {
      providerId: 'unavailable-local-evidence',
      async get(): Promise<LocalProviderResult<LocalEvidenceRecord>> {
        return blocked('NOT_CONFIGURED', UNAVAILABLE_REASON);
      },
    },
    reproduction: createBlockedReproductionProvider(),
  };
}

/** Tool ids whose executors are provider-backed (used by lanes reasoning about coverage). */
export const OWNER_LOCAL_PROVIDER_TOOL_IDS: readonly AgentToolId[] = Object.freeze([
  'INSPECT_SOURCE_SURFACE',
  'QUERY_SYSTEM_MAP',
  'QUERY_BUG_ATLAS',
  'QUERY_SYSTEM_ATLAS',
  'RETRIEVE_SANITIZED_EVIDENCE',
  'REQUEST_ROUTE_CONTRACT_PROOF',
  'RERUN_SAFE_REPRODUCTION',
  'REQUEST_RELATED_HISTORICAL_BUGS',
]);

export type { BugAtlasRecord };
export type { SystemAtlasRecord };
