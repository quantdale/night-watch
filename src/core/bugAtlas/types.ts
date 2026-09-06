// ---------------------------------------------------------------------------
// Lane D (nightwatch-bug-atlas-v1) — Bug Atlas local vocabulary.
//
// Protocol types (BugAtlasRecord, AtlasQuery, …) live in
// src/core/agentProtocol/atlas.ts and are imported, never forked. This module
// only adds lane-local store/miner/snapshot shapes. Pure data: no fs, no
// child processes, no network, no AI authority.
// ---------------------------------------------------------------------------

import type {
  AtlasQuery,
  AtlasQueryResult,
  BugAtlasRecord,
} from '../agentProtocol/atlas';

export type { AtlasQuery, AtlasQueryResult, BugAtlasRecord };

/** Version stamped into every lane-owned Bug Atlas envelope. */
export const BUG_ATLAS_STORE_VERSION = 'nightwatch.bug-atlas-store.v1' as const;

/** Version stamped into the synthetic fixture corpus. */
export const BUG_ATLAS_FIXTURE_CORPUS_VERSION =
  'nightwatch.bug-atlas-fixture-corpus.v1' as const;

/** Version stamped into every miner report. */
export const BUG_ATLAS_MINER_VERSION = 'nightwatch.bug-atlas-miner.v1' as const;

/** Per-text-field storage cap applied before a record enters the store. */
export const BUG_ATLAS_FIELD_BYTE_CAP = 4096 as const;

/** Read-only `git log` per-repository commit ceiling. */
export const BUG_ATLAS_MINER_MAX_COMMITS_PER_REPO = 200 as const;

/** Repository enumeration ceiling for one mining pass. */
export const BUG_ATLAS_MINER_MAX_REPOS = 32 as const;

export type BugAtlasMinerStatus = 'MINED' | 'DATA_BLOCKED';

export interface BugAtlasMinerCounts {
  readonly repositoriesSeen: number;
  readonly repositoriesMined: number;
  readonly commitsScanned: number;
  readonly commitsKept: number;
  /** Historical texts flagged by the protocol injection screen (kept as data). */
  readonly quarantinedInjection: number;
  /** Credential-like spans redacted before records were built. */
  readonly redactedSecrets: number;
}

export interface BugAtlasMinerReport {
  readonly schemaVersion: typeof BUG_ATLAS_MINER_VERSION;
  readonly status: BugAtlasMinerStatus;
  /** Machine-readable reason: MINED_OK | SIBLING_ROOT_MISSING | … */
  readonly reason: string;
  readonly records: readonly BugAtlasRecord[];
  readonly counts: BugAtlasMinerCounts;
  readonly minedAt: string;
  readonly repositoriesRoot: string | null;
}

export interface BugAtlasMinerOptions {
  /** Defaults to NIGHTWATCH_REPOS_ROOT ?? DEFAULT_SIBLING_ROOT. */
  readonly repositoriesRoot?: string;
  /** Optional admission allowlist of `org/repo` ids. Omit for all admitted. */
  readonly repositoryIds?: readonly string[];
  readonly maxCommitsPerRepo?: number;
  readonly maxRepos?: number;
}

export interface BugAtlasSnapshotOptions {
  /** Defaults to NIGHTWATCH_BUG_ATLAS_STATE_DIR ?? ~/.nightwatch/bug-atlas. */
  readonly stateDirectory?: string;
  readonly fileName?: string;
}

export interface BugAtlasSnapshot {
  readonly schemaVersion: typeof BUG_ATLAS_STORE_VERSION;
  readonly savedAt: string;
  readonly records: readonly BugAtlasRecord[];
}
