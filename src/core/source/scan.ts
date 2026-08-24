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
import {
  REAL_SOURCE_SCAN_CONFIG_VERSION,
  REAL_SOURCE_SCAN_EXTRACTOR_VERSION,
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
  let budgetRejections = 0;

  for (const repository of input.config.approvedRepositories) {
    const counts = emptyRejectionCounts();
    const current = input.access.currentness.currentSnapshot(repository.repoId);
    if (current === null) {
      counts.SOURCE_REPOSITORY_UNAVAILABLE += 1;
      repositories.push({ repoId: repository.repoId, sourceSha: null, status: 'SOURCE_UNAVAILABLE', fileCount: 0, admittedFileCount: 0, rejectedFileCount: 0, bytesInspected: 0, rejectionCounts: counts });
      continue;
    }
    if (repository.expectedSourceSha !== null && current.sha !== repository.expectedSourceSha) {
      counts.SOURCE_STALE += 1;
      repositories.push({ repoId: repository.repoId, sourceSha: current.sha, status: 'SOURCE_STALE', fileCount: 0, admittedFileCount: 0, rejectedFileCount: 0, bytesInspected: 0, rejectionCounts: counts });
      continue;
    }

    const enumeration = input.access.enumerateFiles(repository.repoId, repository.allowlistedRoots, {
      maxFiles: repository.maxFiles,
      maxTotalBytes: repository.maxTotalBytes,
      excludedDirectories: input.config.excludedDirectories,
    });
    if (enumeration.truncationReason !== null && counts[enumeration.truncationReason] === 0) {
      counts[enumeration.truncationReason] += 1;
      budgetRejections += 1;
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
      if (rejected.reason === 'SOURCE_FILE_COUNT_EXCEEDED' || rejected.reason === 'SOURCE_TOTAL_BUDGET_EXCEEDED') budgetRejections += 1;
    }
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
          const actualBytes = Buffer.byteLength(sourceText, 'utf8');
          byteCount = actualBytes;
          bytesRead += actualBytes;
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
      } else {
        filesRejected += 1;
        counts[rejectionReason] += 1;
        if (rejectionReason === 'SOURCE_FILE_TOO_LARGE' || rejectionReason === 'SOURCE_TOTAL_BUDGET_EXCEEDED') budgetRejections += 1;
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
    budgetRejections,
  };
  const core: Omit<RealSourceSnapshotInventory, 'snapshotDigest'> = {
    schemaVersion: REAL_SOURCE_SNAPSHOT_INVENTORY_VERSION,
    configDigest: input.config.configDigest,
    extractorVersion: REAL_SOURCE_SCAN_EXTRACTOR_VERSION,
    files,
    repositories,
    counters,
  };
  return { ...core, snapshotDigest: sourceSnapshotDigest(core) };
}
