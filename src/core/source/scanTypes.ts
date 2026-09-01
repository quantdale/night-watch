// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — data-only bounded source scan contracts.
//
// These DTOs contain source identity and safe structural metadata only. They
// deliberately do not model source text, executable matchers, shell commands,
// or runtime values. Filesystem authority remains in siblingSource.ts.
// ---------------------------------------------------------------------------

import { prefixedDigest24, sha256Hex } from '../identity/canonicalDigest';
import type { SourceCompletenessState } from './completeness';

export const REAL_SOURCE_SCAN_CONFIG_VERSION = 'nightwatch.real-source-scan-config.v1' as const;
export const REAL_SOURCE_SNAPSHOT_INVENTORY_VERSION = 'nightwatch.real-source-snapshot-inventory.v1' as const;
export const REAL_SOURCE_SCAN_EXTRACTOR_VERSION = 'nightwatch.real-source-scan-extractor.v1' as const;
export const REAL_SOURCE_INVENTORY_COMPLETENESS_VERSION = 'nightwatch.source-inventory-completeness.v1' as const;

export const SOURCE_SCAN_LANGUAGES = ['PHP', 'TYPESCRIPT', 'JAVASCRIPT', 'GO', 'OPENAPI', 'YAML'] as const;
export type SourceScanLanguage = (typeof SOURCE_SCAN_LANGUAGES)[number];

export const SOURCE_SCAN_EXTENSIONS = ['.php', '.ts', '.tsx', '.js', '.jsx', '.go', '.json', '.yaml', '.yml'] as const;
export type SourceScanExtension = (typeof SOURCE_SCAN_EXTENSIONS)[number];

export const SOURCE_SCAN_ANALYZERS = [
  'PHASE20_SEMANTIC_ANALYZERS',
  'PHASE25_ROUTE_DISCOVERY',
  'PHASE25_CONTRACT_JOINS',
] as const;
export type SourceScanAnalyzer = (typeof SOURCE_SCAN_ANALYZERS)[number];

export const SOURCE_SCAN_EXCLUDED_DIRECTORIES = ['.git', 'node_modules', 'vendor', 'build', 'dist'] as const;
export type SourceScanExcludedDirectory = (typeof SOURCE_SCAN_EXCLUDED_DIRECTORIES)[number];

export const SOURCE_SCAN_REJECTION_REASONS = [
  'SOURCE_ROOT_UNAPPROVED',
  'SOURCE_PATH_ESCAPE',
  'SOURCE_SYMLINK_REJECTED',
  'SOURCE_FILE_NOT_REGULAR',
  'SOURCE_FILE_TOO_LARGE',
  'SOURCE_FILE_COUNT_EXCEEDED',
  'SOURCE_TOTAL_BUDGET_EXCEEDED',
  'SOURCE_LANGUAGE_UNSUPPORTED',
  'SOURCE_PATH_EXCLUDED',
  'SOURCE_REPOSITORY_UNAVAILABLE',
  'SOURCE_HEAD_UNAVAILABLE',
  'SOURCE_STALE',
  'SOURCE_READ_FAILED',
  'SOURCE_CONFIG_INVALID',
  'SOURCE_PRIVACY_REJECTED',
] as const;
export type SourceScanRejectionReason = (typeof SOURCE_SCAN_REJECTION_REASONS)[number];

export type SourceScanFileStatus = 'ELIGIBLE' | 'REJECTED';
export type SourceScanRepositoryStatus = 'CURRENT' | 'SOURCE_STALE' | 'SOURCE_UNAVAILABLE';

export interface RealSourceScanRepositoryConfig {
  readonly repoId: string;
  /** Null means use the exact read-only HEAD discovered at scan time. */
  readonly expectedSourceSha: string | null;
  /** Fixed relative roots only; an empty string means the repository root. */
  readonly allowlistedRoots: readonly string[];
  readonly allowedExtensions: readonly SourceScanExtension[];
  readonly maxFiles: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
}

export interface RealSourceScanConfig {
  readonly schemaVersion: typeof REAL_SOURCE_SCAN_CONFIG_VERSION;
  readonly approvedRepositories: readonly RealSourceScanRepositoryConfig[];
  readonly excludedDirectories: readonly SourceScanExcludedDirectory[];
  readonly enabledAnalyzers: readonly SourceScanAnalyzer[];
  readonly runtimeMappingNamespace: string;
  readonly extractorVersion: typeof REAL_SOURCE_SCAN_EXTRACTOR_VERSION;
  readonly configDigest: string;
}

export interface RealSourceScanConfigInput {
  readonly approvedRepositories: readonly RealSourceScanRepositoryConfig[];
  readonly excludedDirectories?: readonly SourceScanExcludedDirectory[];
  readonly enabledAnalyzers?: readonly SourceScanAnalyzer[];
  readonly runtimeMappingNamespace: string;
}

export interface SourceSnapshotFileRecord {
  readonly repoId: string;
  readonly sourceSha: string | null;
  readonly relativePath: string;
  readonly language: SourceScanLanguage | null;
  readonly byteCount: number | null;
  /** Full content digest of the exact text inspected; never source text. */
  readonly contentDigest: string | null;
  readonly status: SourceScanFileStatus;
  readonly rejectionReason: SourceScanRejectionReason | null;
}

export interface SourceSnapshotRepositoryRecord {
  readonly repoId: string;
  readonly sourceSha: string | null;
  readonly status: SourceScanRepositoryStatus;
  readonly fileCount: number;
  readonly admittedFileCount: number;
  readonly rejectedFileCount: number;
  readonly bytesInspected: number;
  readonly rejectionCounts: Readonly<Record<SourceScanRejectionReason, number>>;
}

export interface SourceScanCounters {
  readonly repositoriesConsidered: number;
  readonly repositoriesInspected: number;
  readonly directoriesVisited: number;
  readonly filesConsidered: number;
  readonly filesRead: number;
  readonly filesAdmitted: number;
  readonly filesRejected: number;
  readonly bytesRead: number;
  readonly symlinkRejections: number;
  readonly pathRejections: number;
  /** Files dropped because the ENUMERATION walk hit maxFiles/maxTotalBytes.
   * Disjoint from contentBudgetRejections: this bounds which files exist in
   * the snapshot at all. */
  readonly enumerationBudgetRejections: number;
  /** File BODIES dropped because a read hit maxFileBytes/maxTotalBytes. The
   * file is enumerated and present in the snapshot; only its content was not
   * admitted. Never conflate this with enumeration truncation. */
  readonly contentBudgetRejections: number;
}

/** Enumeration completeness: did the directory walk observe every file?
 *
 * The walk aborts on truncation, so when it is bounded the remainder is not
 * merely large, it is unknowable: totalFiles and droppedFiles are null and
 * remainingUnknown is true. */
export interface SourceEnumerationCompleteness {
  readonly state: SourceCompletenessState;
  /** maxFiles actually applied. */
  readonly limit: number;
  /** maxTotalBytes actually applied to the walk. */
  readonly byteLimit: number;
  readonly examinedFiles: number;
  /** Exact only when the walk completed; null when it was aborted. */
  readonly totalFiles: number | null;
  /** Exact only when knowable; null when the walk was aborted mid-tree. */
  readonly droppedFiles: number | null;
  readonly remainingUnknown: boolean;
  readonly truncationReason: SourceScanRejectionReason | null;
}

/** Content-read completeness: of the files that WERE enumerated, how many
 * bodies were actually read and admitted?
 *
 * This is measured against the enumerated set and is fully knowable even when
 * enumeration was truncated, which is exactly why it is a separate dimension.
 * Language and privacy exclusions are deliberate policy, not budget
 * exhaustion, and are reported separately so they never read as truncation. */
export interface SourceContentReadCompleteness {
  readonly state: SourceCompletenessState;
  readonly fileByteLimit: number;
  readonly totalByteLimit: number;
  /** Enumerated files whose bodies were in scope for reading. */
  readonly candidateFiles: number;
  readonly readFiles: number;
  readonly admittedFiles: number;
  readonly bytesRead: number;
  /** Bodies dropped by maxFileBytes / maxTotalBytes. Always knowable. */
  readonly droppedFiles: number;
  /** Bodies that could not be read at all (SOURCE_READ_FAILED). */
  readonly unreadableFiles: number;
  /** Deliberate policy exclusions; never counted as truncation. */
  readonly policyExcludedFiles: number;
}

export interface SourceRepositoryCompleteness {
  readonly repoId: string;
  readonly enumeration: SourceEnumerationCompleteness;
  readonly contentRead: SourceContentReadCompleteness;
}

/** Inventory-wide completeness. `state` is the conservative combination of
 * both dimensions and is never COMPLETE unless both are. */
export interface SourceInventoryCompleteness {
  readonly schemaVersion: typeof REAL_SOURCE_INVENTORY_COMPLETENESS_VERSION;
  readonly state: SourceCompletenessState;
  readonly enumeration: SourceEnumerationCompleteness;
  readonly contentRead: SourceContentReadCompleteness;
  readonly repositories: readonly SourceRepositoryCompleteness[];
}

export interface RealSourceSnapshotInventory {
  readonly schemaVersion: typeof REAL_SOURCE_SNAPSHOT_INVENTORY_VERSION;
  readonly configDigest: string;
  readonly extractorVersion: typeof REAL_SOURCE_SCAN_EXTRACTOR_VERSION;
  readonly files: readonly SourceSnapshotFileRecord[];
  readonly repositories: readonly SourceSnapshotRepositoryRecord[];
  readonly counters: SourceScanCounters;
  readonly completeness: SourceInventoryCompleteness;
  readonly snapshotDigest: string;
}

export function sourceContentDigest(sourceText: string): string {
  return `sha256:${sha256Hex(sourceText)}`;
}

export function sourceScanConfigDigest(input: Omit<RealSourceScanConfig, 'configDigest'>): string {
  return prefixedDigest24('srcconfig', input);
}

export function sourceSnapshotDigest(input: Omit<RealSourceSnapshotInventory, 'snapshotDigest'>): string {
  return prefixedDigest24('srcsnapshot', input);
}
