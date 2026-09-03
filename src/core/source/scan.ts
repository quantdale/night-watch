// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — deterministic bounded source snapshot inventory.
//
// This module is a pure coordinator around the confined sibling-source access
// object. It never imports fs and never stores source text. Text returned by
// the reader exists only long enough to establish a content digest and, in a
// later milestone, invoke an existing bounded analyzer.
// ---------------------------------------------------------------------------

import {
  MAX_SIBLING_SOURCE_FILE_BYTES,
  MAX_SIBLING_SOURCE_SCAN_BYTES,
  MAX_SIBLING_SOURCE_SCAN_FILES,
  type SiblingSourceAccess,
} from './siblingSource';
import { worstCompleteness, type SourceCompletenessState } from './completeness';
import {
  REAL_SOURCE_SCAN_CONFIG_VERSION,
  REAL_SOURCE_SCAN_EXTRACTOR_VERSION,
  REAL_SOURCE_INVENTORY_COMPLETENESS_VERSION,
  REAL_SOURCE_SNAPSHOT_INVENTORY_VERSION,
  SOURCE_SCAN_ANALYZERS,
  SOURCE_SCAN_EXCLUDED_DIRECTORIES,
  SOURCE_SCAN_EXTENSIONS,
  SOURCE_SCAN_LANGUAGES,
  SOURCE_SCAN_REJECTION_REASONS,
  sourceContentDigest,
  sourceScanConfigDigest,
  sourceSnapshotDigest,
  type RealSourceScanConfig,
  type RealSourceScanConfigInput,
  type RealSourceScanRepositoryConfig,
  type RealSourceSnapshotInventory,
  type SourceScanAnalyzer,
  type SourceScanCounters,
  type SourceScanExcludedDirectory,
  type SourceScanExtension,
  type SourceScanFileStatus,
  type SourceScanLanguage,
  type SourceScanRejectionReason,
  type SourceSnapshotFileRecord,
  type SourceSnapshotRepositoryRecord,
  type SourceContentReadCompleteness,
  type SourceEnumerationCompleteness,
  type SourceInventoryCompleteness,
  type SourceRepositoryCompleteness,
} from './scanTypes';

const SAFE_REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_NAMESPACE_RE = /^[A-Za-z][A-Za-z0-9_.:/-]{0,119}$/;
const SAFE_ROOT_PART_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,96}$/;
const PRIVACY_SENTINEL_RE = /(?:PRIVACY_SENTINEL|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|Bearer\s+|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

const EXTENSION_LANGUAGE: Readonly<Record<SourceScanExtension, SourceScanLanguage>> = {
  '.php': 'PHP',
  '.ts': 'TYPESCRIPT',
  '.tsx': 'TYPESCRIPT',
  '.js': 'JAVASCRIPT',
  '.jsx': 'JAVASCRIPT',
  '.go': 'GO',
  '.json': 'OPENAPI',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  // C-02b. This is a LANGUAGE admission, not a root admission: every .proto
  // file it reaches was already inside an owner-approved root and was being
  // rejected SOURCE_LANGUAGE_UNSUPPORTED on its extension alone.
  '.proto': 'PROTOBUF',
  // C-04. A LANGUAGE admission like `.proto` before it: 859 `.vue` files were
  // already inside the approved `ripple-ui` `src` root and were rejected
  // SOURCE_LANGUAGE_UNSUPPORTED on their extension alone.
  '.vue': 'VUE',
};

function invalid(reason: string): never {
  throw new Error(`REAL_SOURCE_SCAN_INVALID:${reason}`);
}

function sortedUnique<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

function validateRoot(root: string): void {
  if (root === '') return;
  if (root.startsWith('/') || root.includes('\\') || root.includes('\0')) invalid('ROOT_PATH');
  const parts = root.split('/');
  if (parts.length > 16 || parts.some((part) => part.length === 0 || part === '.' || part === '..' || part === '.git' || !SAFE_ROOT_PART_RE.test(part))) invalid('ROOT_PATH');
}

function validateRepositoryConfig(repository: RealSourceScanRepositoryConfig): RealSourceScanRepositoryConfig {
  if (!SAFE_REPO_ID_RE.test(repository.repoId) || repository.repoId.includes('\0')) invalid('REPOSITORY_ID');
  if (repository.expectedSourceSha !== null && !SAFE_SHA_RE.test(repository.expectedSourceSha)) invalid('EXPECTED_SHA');
  if (!Array.isArray(repository.allowlistedRoots) || repository.allowlistedRoots.length === 0 || repository.allowlistedRoots.length > 32) invalid('ROOTS');
  const roots = [...new Set(repository.allowlistedRoots)].sort((left, right) => left.localeCompare(right));
  roots.forEach(validateRoot);
  for (let index = 1; index < roots.length; index += 1) {
    const previous = roots[index - 1]!;
    const current = roots[index]!;
    if (current === previous || (previous !== '' && current.startsWith(`${previous}/`)) || (previous === '' && current !== '')) invalid('OVERLAPPING_ROOTS');
  }
  if (!Array.isArray(repository.allowedExtensions) || repository.allowedExtensions.length === 0) invalid('EXTENSIONS');
  const extensions = sortedUnique(repository.allowedExtensions);
  if (extensions.some((extension) => !isOneOf(SOURCE_SCAN_EXTENSIONS, extension))) invalid('EXTENSION');
  if (!Number.isInteger(repository.maxFiles) || repository.maxFiles < 1 || repository.maxFiles > MAX_SIBLING_SOURCE_SCAN_FILES) invalid('MAX_FILES');
  if (!Number.isInteger(repository.maxFileBytes) || repository.maxFileBytes < 1 || repository.maxFileBytes > MAX_SIBLING_SOURCE_FILE_BYTES) invalid('MAX_FILE_BYTES');
  if (!Number.isInteger(repository.maxTotalBytes) || repository.maxTotalBytes < 1 || repository.maxTotalBytes > MAX_SIBLING_SOURCE_SCAN_BYTES) invalid('MAX_TOTAL_BYTES');
  return { ...repository, allowlistedRoots: roots, allowedExtensions: extensions };
}

export function createRealSourceScanConfig(input: RealSourceScanConfigInput): RealSourceScanConfig {
  if (!Array.isArray(input.approvedRepositories) || input.approvedRepositories.length === 0 || input.approvedRepositories.length > 64) invalid('REPOSITORIES');
  const repositories = input.approvedRepositories.map(validateRepositoryConfig).sort((left, right) => left.repoId.localeCompare(right.repoId));
  if (new Set(repositories.map((repository) => repository.repoId)).size !== repositories.length) invalid('DUPLICATE_REPOSITORY');
  const excludedDirectories = sortedUnique(input.excludedDirectories ?? SOURCE_SCAN_EXCLUDED_DIRECTORIES);
  if (excludedDirectories.some((directory) => !isOneOf(SOURCE_SCAN_EXCLUDED_DIRECTORIES, directory))) invalid('EXCLUDED_DIRECTORY');
  const enabledAnalyzers = sortedUnique(input.enabledAnalyzers ?? ['PHASE20_SEMANTIC_ANALYZERS'] as readonly SourceScanAnalyzer[]);
  if (enabledAnalyzers.some((analyzer) => !isOneOf(SOURCE_SCAN_ANALYZERS, analyzer))) invalid('ANALYZER');
  if (!SAFE_NAMESPACE_RE.test(input.runtimeMappingNamespace)) invalid('RUNTIME_NAMESPACE');
  const core: Omit<RealSourceScanConfig, 'configDigest'> = {
    schemaVersion: REAL_SOURCE_SCAN_CONFIG_VERSION,
    approvedRepositories: repositories,
    excludedDirectories: excludedDirectories as readonly SourceScanExcludedDirectory[],
    enabledAnalyzers: enabledAnalyzers as readonly SourceScanAnalyzer[],
    runtimeMappingNamespace: input.runtimeMappingNamespace,
    extractorVersion: REAL_SOURCE_SCAN_EXTRACTOR_VERSION,
  };
  return { ...core, configDigest: sourceScanConfigDigest(core) };
}

export function validateRealSourceScanConfig(config: RealSourceScanConfig): void {
  const rebuilt = createRealSourceScanConfig({
    approvedRepositories: config.approvedRepositories,
    excludedDirectories: config.excludedDirectories,
    enabledAnalyzers: config.enabledAnalyzers,
    runtimeMappingNamespace: config.runtimeMappingNamespace,
  });
  if (config.schemaVersion !== REAL_SOURCE_SCAN_CONFIG_VERSION || config.extractorVersion !== REAL_SOURCE_SCAN_EXTRACTOR_VERSION || config.configDigest !== rebuilt.configDigest) invalid('CONFIG_DIGEST');
}

function emptyRejectionCounts(): Record<SourceScanRejectionReason, number> {
  return Object.fromEntries(SOURCE_SCAN_REJECTION_REASONS.map((reason) => [reason, 0])) as Record<SourceScanRejectionReason, number>;
}

function extensionFor(relativePath: string): SourceScanExtension | null {
  const dot = relativePath.lastIndexOf('.');
  if (dot < 0) return null;
  const extension = relativePath.slice(dot).toLowerCase();
  return isOneOf(SOURCE_SCAN_EXTENSIONS, extension) ? extension : null;
}

function fileRecord(input: {
  readonly repoId: string;
  readonly sourceSha: string | null;
  readonly relativePath: string;
  readonly language: SourceScanLanguage | null;
  readonly byteCount: number | null;
  readonly contentDigest: string | null;
  readonly status: SourceScanFileStatus;
  readonly rejectionReason: SourceScanRejectionReason | null;
}): SourceSnapshotFileRecord {
  return { ...input };
}

/**
 * Roll per-repository completeness up to one inventory-wide statement.
 *
 * Aggregation only ever weakens: a dimension is COMPLETE only when every
 * repository is COMPLETE in that dimension, and an empty repository set is
 * UNKNOWN rather than vacuously COMPLETE. A null total anywhere makes the
 * aggregate total null, because summing over an unknowable remainder would
 * manufacture a number that was never observed.
 */
function aggregateInventoryCompleteness(rows: readonly SourceRepositoryCompleteness[]): SourceInventoryCompleteness {
  const enumerationState: SourceCompletenessState = worstCompleteness(...rows.map((row) => row.enumeration.state));
  const contentReadState: SourceCompletenessState = worstCompleteness(...rows.map((row) => row.contentRead.state));
  const anyEnumerationTotalUnknown = rows.some((row) => row.enumeration.totalFiles === null);
  const anyEnumerationDroppedUnknown = rows.some((row) => row.enumeration.droppedFiles === null);
  const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
  const max = (values: readonly number[]): number => values.reduce((highest, value) => Math.max(highest, value), 0);
  const enumeration: SourceEnumerationCompleteness = {
    state: enumerationState,
    // Per-repository ceilings compose additively for the file count and the
    // walk byte budget; there is no single global ceiling to report.
    limit: sum(rows.map((row) => row.enumeration.limit)),
    byteLimit: sum(rows.map((row) => row.enumeration.byteLimit)),
    examinedFiles: sum(rows.map((row) => row.enumeration.examinedFiles)),
    totalFiles: anyEnumerationTotalUnknown ? null : sum(rows.map((row) => row.enumeration.totalFiles ?? 0)),
    droppedFiles: anyEnumerationDroppedUnknown ? null : sum(rows.map((row) => row.enumeration.droppedFiles ?? 0)),
    remainingUnknown: rows.some((row) => row.enumeration.remainingUnknown),
    truncationReason: rows.find((row) => row.enumeration.truncationReason !== null)?.enumeration.truncationReason ?? null,
  };
  const contentRead: SourceContentReadCompleteness = {
    state: contentReadState,
    // A per-file ceiling does not compose additively: report the widest one
    // actually applied.
    fileByteLimit: max(rows.map((row) => row.contentRead.fileByteLimit)),
    totalByteLimit: sum(rows.map((row) => row.contentRead.totalByteLimit)),
    candidateFiles: sum(rows.map((row) => row.contentRead.candidateFiles)),
    readFiles: sum(rows.map((row) => row.contentRead.readFiles)),
    admittedFiles: sum(rows.map((row) => row.contentRead.admittedFiles)),
    bytesRead: sum(rows.map((row) => row.contentRead.bytesRead)),
    droppedFiles: sum(rows.map((row) => row.contentRead.droppedFiles)),
    unreadableFiles: sum(rows.map((row) => row.contentRead.unreadableFiles)),
    policyExcludedFiles: sum(rows.map((row) => row.contentRead.policyExcludedFiles)),
  };
  return {
    schemaVersion: REAL_SOURCE_INVENTORY_COMPLETENESS_VERSION,
    state: worstCompleteness(enumerationState, contentReadState),
    enumeration,
    contentRead,
    repositories: rows,
  };
}

/**
 * Produce a safe, deterministic inventory from one approved source config.
 * The returned inventory contains no source text and no executable config.
 */
export function scanSource(input: { readonly access: SiblingSourceAccess; readonly config: RealSourceScanConfig }): RealSourceSnapshotInventory {
  validateRealSourceScanConfig(input.config);
  const files: SourceSnapshotFileRecord[] = [];
  const repositories: SourceSnapshotRepositoryRecord[] = [];
  let directoriesVisited = 0;
  let filesConsidered = 0;
  let filesRead = 0;
  let filesAdmitted = 0;
  let filesRejected = 0;
  let bytesRead = 0;
  let symlinkRejections = 0;
  let pathRejections = 0;
  // Enumeration and content-read exhaustion are DISJOINT failure modes and are
  // counted separately. A repository can be fully enumerated while only some
  // file bodies are read; conflating the two makes a complete inventory look
  // bounded and a bounded one look complete.
  let enumerationBudgetRejections = 0;
  let contentBudgetRejections = 0;
  const repositoryCompleteness: SourceRepositoryCompleteness[] = [];

  for (const repository of input.config.approvedRepositories) {
    const counts = emptyRejectionCounts();
    const unobserved = (reason: SourceScanRejectionReason): SourceRepositoryCompleteness => ({
      repoId: repository.repoId,
      // The repository was never walked, so neither dimension is knowable.
      // UNKNOWN, never COMPLETE-by-vacuity.
      enumeration: { state: 'UNKNOWN', limit: repository.maxFiles, byteLimit: repository.maxTotalBytes, examinedFiles: 0, totalFiles: null, droppedFiles: null, remainingUnknown: true, truncationReason: reason },
      contentRead: { state: 'UNKNOWN', fileByteLimit: repository.maxFileBytes, totalByteLimit: repository.maxTotalBytes, candidateFiles: 0, readFiles: 0, admittedFiles: 0, bytesRead: 0, droppedFiles: 0, unreadableFiles: 0, policyExcludedFiles: 0 },
    });
    const current = input.access.currentness.currentSnapshot(repository.repoId);
    if (current === null) {
      counts.SOURCE_REPOSITORY_UNAVAILABLE += 1;
      repositories.push({ repoId: repository.repoId, sourceSha: null, status: 'SOURCE_UNAVAILABLE', fileCount: 0, admittedFileCount: 0, rejectedFileCount: 0, bytesInspected: 0, rejectionCounts: counts });
      repositoryCompleteness.push(unobserved('SOURCE_REPOSITORY_UNAVAILABLE'));
      continue;
    }
    if (repository.expectedSourceSha !== null && current.sha !== repository.expectedSourceSha) {
      counts.SOURCE_STALE += 1;
      repositories.push({ repoId: repository.repoId, sourceSha: current.sha, status: 'SOURCE_STALE', fileCount: 0, admittedFileCount: 0, rejectedFileCount: 0, bytesInspected: 0, rejectionCounts: counts });
      repositoryCompleteness.push(unobserved('SOURCE_STALE'));
      continue;
    }

    const enumeration = input.access.enumerateFiles(repository.repoId, repository.allowlistedRoots, {
      maxFiles: repository.maxFiles,
      maxTotalBytes: repository.maxTotalBytes,
      excludedDirectories: input.config.excludedDirectories,
    });
    if (enumeration.truncationReason !== null && counts[enumeration.truncationReason] === 0) {
      counts[enumeration.truncationReason] += 1;
      enumerationBudgetRejections += 1;
    }
    directoriesVisited += enumeration.directoriesVisited;
    const repositoryFiles: SourceSnapshotFileRecord[] = [];
    let repositoryBytes = 0;
    for (const rejected of enumeration.rejectedPaths) {
      if (rejected.relativePath.length === 0) continue;
      const record = fileRecord({ repoId: repository.repoId, sourceSha: current.sha, relativePath: rejected.relativePath, language: null, byteCount: null, contentDigest: null, status: 'REJECTED', rejectionReason: rejected.reason });
      repositoryFiles.push(record);
      counts[rejected.reason] += 1;
      filesConsidered += 1;
      filesRejected += 1;
      if (rejected.reason === 'SOURCE_SYMLINK_REJECTED') symlinkRejections += 1;
      if (rejected.reason === 'SOURCE_ROOT_UNAPPROVED' || rejected.reason === 'SOURCE_PATH_ESCAPE' || rejected.reason === 'SOURCE_PATH_EXCLUDED') pathRejections += 1;
      if (rejected.reason === 'SOURCE_FILE_COUNT_EXCEEDED' || rejected.reason === 'SOURCE_TOTAL_BUDGET_EXCEEDED') enumerationBudgetRejections += 1;
    }
    let repositoryFilesRead = 0;
    let repositoryFilesAdmitted = 0;
    let repositoryBytesRead = 0;
    let repositoryContentDropped = 0;
    let repositoryUnreadable = 0;
    let repositoryPolicyExcluded = 0;
    for (const entry of enumeration.entries) {
      filesConsidered += 1;
      const extension = extensionFor(entry.relativePath);
      const language = extension === null ? null : EXTENSION_LANGUAGE[extension];
      let status: SourceScanFileStatus = 'ELIGIBLE';
      let rejectionReason: SourceScanRejectionReason | null = null;
      let contentDigest: string | null = null;
      let byteCount: number | null = entry.byteCount;
      if (extension === null || !repository.allowedExtensions.includes(extension)) {
        status = 'REJECTED';
        rejectionReason = 'SOURCE_LANGUAGE_UNSUPPORTED';
      } else if (entry.byteCount === null || entry.byteCount > repository.maxFileBytes) {
        status = 'REJECTED';
        rejectionReason = 'SOURCE_FILE_TOO_LARGE';
      } else {
        const sourceText = input.access.reader.readFile(repository.repoId, entry.relativePath);
        if (sourceText === null) {
          status = 'REJECTED';
          rejectionReason = 'SOURCE_READ_FAILED';
          byteCount = null;
        } else {
          filesRead += 1;
          repositoryFilesRead += 1;
          const actualBytes = Buffer.byteLength(sourceText, 'utf8');
          byteCount = actualBytes;
          bytesRead += actualBytes;
          repositoryBytesRead += actualBytes;
          contentDigest = sourceContentDigest(sourceText);
          if (actualBytes > repository.maxFileBytes) {
            status = 'REJECTED';
            rejectionReason = 'SOURCE_FILE_TOO_LARGE';
          } else if (actualBytes > repository.maxTotalBytes - repositoryBytes) {
            status = 'REJECTED';
            rejectionReason = 'SOURCE_TOTAL_BUDGET_EXCEEDED';
          } else if (PRIVACY_SENTINEL_RE.test(sourceText)) {
            status = 'REJECTED';
            rejectionReason = 'SOURCE_PRIVACY_REJECTED';
          } else {
            repositoryBytes += actualBytes;
          }
        }
      }
      const record = fileRecord({ repoId: repository.repoId, sourceSha: current.sha, relativePath: entry.relativePath, language, byteCount, contentDigest, status, rejectionReason });
      repositoryFiles.push(record);
      if (rejectionReason === null) {
        filesAdmitted += 1;
        repositoryFilesAdmitted += 1;
      } else {
        filesRejected += 1;
        counts[rejectionReason] += 1;
        // Budget exhaustion on a BODY: the file is enumerated and present in
        // the snapshot; only its content was not admitted.
        if (rejectionReason === 'SOURCE_FILE_TOO_LARGE' || rejectionReason === 'SOURCE_TOTAL_BUDGET_EXCEEDED') {
          contentBudgetRejections += 1;
          repositoryContentDropped += 1;
        }
        if (rejectionReason === 'SOURCE_READ_FAILED') repositoryUnreadable += 1;
        // Deliberate policy exclusions are not truncation and never weaken the
        // content-read completeness state.
        if (rejectionReason === 'SOURCE_LANGUAGE_UNSUPPORTED' || rejectionReason === 'SOURCE_PRIVACY_REJECTED') repositoryPolicyExcluded += 1;
      }
    }
    repositoryFiles.sort((left, right) => left.relativePath.localeCompare(right.relativePath) || left.status.localeCompare(right.status));
    files.push(...repositoryFiles);
    repositories.push({
      repoId: repository.repoId,
      sourceSha: current.sha,
      status: 'CURRENT',
      fileCount: repositoryFiles.length,
      admittedFileCount: repositoryFiles.filter((file) => file.status === 'ELIGIBLE').length,
      rejectedFileCount: repositoryFiles.filter((file) => file.status === 'REJECTED').length,
      bytesInspected: repositoryBytes,
      rejectionCounts: counts,
    });
    // Enumeration aborts on truncation, so a bounded walk leaves the remainder
    // not merely unlisted but uncountable: totals and drops are null and
    // remainingUnknown is true rather than a fabricated zero.
    const enumerationCompleteness: SourceEnumerationCompleteness = enumeration.truncated
      ? { state: 'TRUNCATED', limit: repository.maxFiles, byteLimit: repository.maxTotalBytes, examinedFiles: enumeration.entries.length, totalFiles: null, droppedFiles: null, remainingUnknown: true, truncationReason: enumeration.truncationReason }
      : { state: 'COMPLETE', limit: repository.maxFiles, byteLimit: repository.maxTotalBytes, examinedFiles: enumeration.entries.length, totalFiles: enumeration.entries.length, droppedFiles: 0, remainingUnknown: false, truncationReason: null };
    // Content-read completeness is measured against the ENUMERATED set, so it
    // stays exact even when enumeration itself was bounded.
    const contentReadCompleteness: SourceContentReadCompleteness = {
      state: repositoryContentDropped > 0 || repositoryUnreadable > 0 ? 'TRUNCATED' : 'COMPLETE',
      fileByteLimit: repository.maxFileBytes,
      totalByteLimit: repository.maxTotalBytes,
      candidateFiles: enumeration.entries.length,
      readFiles: repositoryFilesRead,
      admittedFiles: repositoryFilesAdmitted,
      bytesRead: repositoryBytesRead,
      droppedFiles: repositoryContentDropped,
      unreadableFiles: repositoryUnreadable,
      policyExcludedFiles: repositoryPolicyExcluded,
    };
    repositoryCompleteness.push({ repoId: repository.repoId, enumeration: enumerationCompleteness, contentRead: contentReadCompleteness });
  }

  files.sort((left, right) => left.repoId.localeCompare(right.repoId) || left.relativePath.localeCompare(right.relativePath) || (left.rejectionReason ?? '').localeCompare(right.rejectionReason ?? ''));
  repositories.sort((left, right) => left.repoId.localeCompare(right.repoId));
  const counters: SourceScanCounters = {
    repositoriesConsidered: input.config.approvedRepositories.length,
    repositoriesInspected: repositories.filter((repository) => repository.status === 'CURRENT').length,
    directoriesVisited,
    filesConsidered,
    filesRead,
    filesAdmitted,
    filesRejected,
    bytesRead,
    symlinkRejections,
    pathRejections,
    enumerationBudgetRejections,
    contentBudgetRejections,
  };
  repositoryCompleteness.sort((left, right) => left.repoId.localeCompare(right.repoId));
  const completeness = aggregateInventoryCompleteness(repositoryCompleteness);
  const core: Omit<RealSourceSnapshotInventory, 'snapshotDigest'> = {
    schemaVersion: REAL_SOURCE_SNAPSHOT_INVENTORY_VERSION,
    configDigest: input.config.configDigest,
    extractorVersion: REAL_SOURCE_SCAN_EXTRACTOR_VERSION,
    files,
    repositories,
    counters,
    completeness,
  };
  return { ...core, snapshotDigest: sourceSnapshotDigest(core) };
}
