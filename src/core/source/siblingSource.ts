// ---------------------------------------------------------------------------
// Nightwatch Phase 25 — confined, no-follow sibling-source access.
//
// This is the ONLY module allowed to read an Alphaus sibling checkout. The
// boundary is deliberately small: bounded regular-file text reads and
// read-only Git HEAD metadata. Every path component is lstat-checked before
// use, source files are opened with O_NOFOLLOW where the host provides it,
// and unsupported Git shapes fail closed. No source text crosses this module's
// read method boundary into persisted Nightwatch DTOs.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { RealSourceCurrentness, RealSourceReader } from '../../oracles/expectations/recipes/types';
import type { SourceScanExcludedDirectory, SourceScanRejectionReason } from './scanTypes';

export const DEFAULT_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
export const MAX_SIBLING_SOURCE_FILE_BYTES = 2_000_000;
export const MAX_SIBLING_GIT_METADATA_BYTES = 64 * 1024;
export const MAX_SIBLING_SOURCE_SCAN_FILES = 4096;
export const MAX_SIBLING_SOURCE_SCAN_BYTES = 64_000_000;

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_REF_RE = /^refs\/(?:heads|remotes|tags)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
/** Repository-relative path: no leading slash, no backslash, no NUL. */
const RELATIVE_PATH_RE = /^[^/\\][^\\]*$/;

export interface SiblingSourceFileEntry {
  readonly relativePath: string;
  readonly kind: 'REGULAR' | 'DIRECTORY' | 'SYMLINK' | 'SPECIAL';
  readonly byteCount: number | null;
}

export interface SiblingSourceRejectedPath {
  readonly relativePath: string;
  readonly reason: SourceScanRejectionReason;
}

export interface SiblingSourceEnumeration {
  readonly entries: readonly SiblingSourceFileEntry[];
  readonly rejectedPaths: readonly SiblingSourceRejectedPath[];
  readonly directoriesVisited: number;
  readonly truncated: boolean;
  readonly truncationReason: SourceScanRejectionReason | null;
}

export interface SiblingSourceEnumerationLimits {
  readonly maxFiles: number;
  readonly maxTotalBytes: number;
  readonly excludedDirectories: readonly SourceScanExcludedDirectory[];
}

/**
 * C-05 read ledger.
 *
 * The guarantee "an unapproved repository is never read" used to be expressed
 * as `operations === 0` for that repository, which is a property of OUTPUT: an
 * analyzer that opened every file and derived nothing would satisfy it just as
 * well as one that opened nothing. The ledger moves the claim to the call, so
 * the assertion becomes `contentReads(repo) === 0` — a statement about what was
 * ATTEMPTED, which is what the invariant actually says.
 */
export interface SiblingSourceReadLedger {
  /** Content reads attempted for a repository, refused or not. */
  readonly attempts: (repoId: string) => number;
  /** Reads that returned content. */
  readonly contentReads: (repoId: string) => number;
  /** Reads refused because the repository is not owner-approved. */
  readonly admissionRefusals: (repoId: string) => number;
  /** Every repository this access was asked about, in sorted order. */
  readonly repositoriesTouched: () => readonly string[];
  /** Total admission refusals across all repositories. */
  readonly totalAdmissionRefusals: () => number;
}

export interface SiblingSourceAccessOptions {
  /**
   * When present, the boundary itself refuses any repository outside this set.
   * Admission was previously enforced only by which repositories the scan
   * CONFIG happened to list, so nothing stopped a caller that built its own
   * config. Passing the owner-approved set makes the boundary fail closed.
   */
  readonly admittedRepositoryIds?: readonly string[];
}

export interface SiblingSourceAccess {
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
  readonly root: string;
  readonly enumerateFiles: (repoId: string, allowlistedRoots: readonly string[], limits: SiblingSourceEnumerationLimits) => SiblingSourceEnumeration;
  readonly readLedger: SiblingSourceReadLedger;
}

function isPathInside(candidate: string, parent: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedParent = path.resolve(parent);
  return resolvedCandidate === resolvedParent || resolvedCandidate.startsWith(`${resolvedParent}${path.sep}`);
}

/** Reject symlinks in every existing component of a path. */
function hasNoSymlinkPath(target: string): boolean {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) return false;
    } catch {
      // A missing component is safe to report as unavailable. The caller will
      // reject it; importantly, no later fs operation follows it.
      return false;
    }
  }
  return true;
}

function readRegularTextNoFollow(file: string, maxBytes: number): string | null {
  let descriptor: number | null = null;
  try {
    const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
    descriptor = fs.openSync(file, flags);
    const stats = fs.fstatSync(descriptor);
    if (!stats.isFile() || stats.size > maxBytes) return null;
    return fs.readFileSync(descriptor, { encoding: 'utf8' });
  } catch {
    return null;
  } finally {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch { /* fail closed at caller */ }
    }
  }
}

function safeRelativeParts(relativePath: string): readonly string[] | null {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || relativePath.includes('\0') || !RELATIVE_PATH_RE.test(relativePath)) return null;
  const parts = relativePath.split('/');
  if (parts.length === 0 || parts.some((part) => part.length === 0 || part === '.' || part === '..' || part === '.git')) return null;
  return parts;
}

function safeScanRootParts(relativePath: string): readonly string[] | null {
  if (relativePath === '') return [];
  return safeRelativeParts(relativePath);
}

function safeExcludedDirectory(value: string): value is SourceScanExcludedDirectory {
  return value === '.git' || value === 'node_modules' || value === 'vendor' || value === 'build' || value === 'dist';
}

function safeRepoId(repoId: string): boolean {
  if (!REPO_ID_RE.test(repoId) || repoId.includes('\0')) return false;
  const parts = repoId.split('/');
  return parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
}

function safeGitRef(ref: string): boolean {
  return SAFE_REF_RE.test(ref) && !ref.split('/').some((part) => part === '.' || part === '..');
}

function regularDirectory(target: string): boolean {
  try { return fs.lstatSync(target).isDirectory() && hasNoSymlinkPath(target); } catch { return false; }
}

/**
 * Resolve the metadata directory represented by a supported `.git` shape.
 * A `.git` file is accepted only when its gitdir target remains beneath the
 * caller-supplied approved root. The default is the repository itself, so a
 * direct call cannot accidentally authorize an arbitrary absolute gitdir.
 */
function resolveGitMetadataDirectory(repoRoot: string, approvedMetadataRoot = repoRoot): string | null {
  const absoluteRepo = path.resolve(repoRoot);
  const approvedRoot = path.resolve(approvedMetadataRoot);
  if (!regularDirectory(absoluteRepo) || !regularDirectory(approvedRoot) || !isPathInside(absoluteRepo, approvedRoot)) return null;

  const gitEntry = path.join(absoluteRepo, '.git');
  let stats: fs.Stats;
  try { stats = fs.lstatSync(gitEntry); } catch { return null; }
  if (stats.isSymbolicLink()) return null;
  if (stats.isDirectory()) return hasNoSymlinkPath(gitEntry) ? gitEntry : null;
  if (!stats.isFile()) return null;

  const content = readRegularTextNoFollow(gitEntry, 4096);
  if (content === null) return null;
  const match = /^gitdir:\s*(\S+)\s*$/.exec(content.trim());
  if (match === null || match[1] === undefined || match[1].includes('\0')) return null;
  const metadata = path.resolve(absoluteRepo, match[1]);
  if (!isPathInside(metadata, approvedRoot) || !regularDirectory(metadata)) return null;
  return metadata;
}

function readPackedRef(metadataRoot: string, wantedRef: string): string | null {
  const packedFile = path.join(metadataRoot, 'packed-refs');
  let stats: fs.Stats;
  try { stats = fs.lstatSync(packedFile); } catch { return null; }
  if (stats.isSymbolicLink() || !stats.isFile() || !hasNoSymlinkPath(packedFile)) return null;
  const packed = readRegularTextNoFollow(packedFile, MAX_SIBLING_GIT_METADATA_BYTES);
  if (packed === null) return null;
  let previousRef: string | null = null;
  let found: string | null = null;
  for (const line of packed.split(/\r?\n/)) {
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('^')) {
      if (previousRef === null || !SAFE_SHA_RE.test(line.slice(1))) return null;
      continue;
    }
    const parts = line.split(' ');
    if (parts.length !== 2 || !SAFE_SHA_RE.test(parts[0] ?? '') || !safeGitRef(parts[1] ?? '')) return null;
    const ref = parts[1]!;
    if (ref === wantedRef) {
      if (found !== null && found !== parts[0]) return null;
      found = parts[0]!;
    }
    previousRef = ref;
  }
  return found;
}

function resolveRefSha(metadataRoot: string, ref: string): string | null {
  if (!safeGitRef(ref)) return null;
  const looseRef = path.join(metadataRoot, ...ref.split('/'));
  try {
    const stats = fs.lstatSync(looseRef);
    if (stats.isSymbolicLink() || !stats.isFile() || !hasNoSymlinkPath(looseRef)) return null;
    const sha = readRegularTextNoFollow(looseRef, 256)?.trim() ?? null;
    return sha !== null && SAFE_SHA_RE.test(sha) ? sha : null;
  } catch {
    // A missing loose ref is the only case in which packed-refs is consulted.
    return readPackedRef(metadataRoot, ref);
  }
}

/** Read-only Git HEAD resolution. No child process, network, or writes. */
export function resolveGitHead(repoRoot: string, approvedMetadataRoot?: string): string | null {
  try {
    const metadataRoot = resolveGitMetadataDirectory(repoRoot, approvedMetadataRoot ?? repoRoot);
    if (metadataRoot === null) return null;
    const headFile = path.join(metadataRoot, 'HEAD');
    const head = readRegularTextNoFollow(headFile, 256)?.trim() ?? null;
    if (head === null) return null;
    if (SAFE_SHA_RE.test(head)) return head; // detached HEAD
    const refMatch = /^ref:\s*(\S+)$/.exec(head);
    if (refMatch === null || refMatch[1] === undefined || !safeGitRef(refMatch[1])) return null;
    return resolveRefSha(metadataRoot, refMatch[1]);
  } catch {
    return null;
  }
}

export function createSiblingSourceAccess(root: string, options: SiblingSourceAccessOptions = {}): SiblingSourceAccess {
  const resolvedRoot = path.resolve(root);
  const rootUsable = regularDirectory(resolvedRoot);
  // `undefined` means "this access enforces no admission set of its own", which
  // is the pre-C-05 behaviour and is preserved for existing callers. An empty
  // ARRAY is different and is honoured literally: it admits nothing.
  const admitted = options.admittedRepositoryIds === undefined ? null : new Set(options.admittedRepositoryIds);
  const attempts = new Map<string, number>();
  const contentReads = new Map<string, number>();
  const admissionRefusals = new Map<string, number>();
  const bump = (counter: Map<string, number>, repoId: string) => {
    counter.set(repoId, (counter.get(repoId) ?? 0) + 1);
  };

  /** True when this access may not touch the repository at all. */
  function admissionRefused(repoId: string): boolean {
    return admitted !== null && !admitted.has(repoId);
  }

  function repoRootFor(repoId: string): string | null {
    if (!rootUsable || !safeRepoId(repoId)) return null;
    const candidate = path.resolve(resolvedRoot, ...repoId.split('/'));
    if (!isPathInside(candidate, resolvedRoot) || !regularDirectory(candidate)) return null;
    // Requiring a supported git metadata shape keeps malformed or unsafe
    // repositories out of both the text and currentness APIs.
    return resolveGitMetadataDirectory(candidate, resolvedRoot) === null ? null : candidate;
  }

  function enumerateFiles(
    repoId: string,
    allowlistedRoots: readonly string[],
    limits: SiblingSourceEnumerationLimits,
  ): SiblingSourceEnumeration {
    if (admissionRefused(repoId)) {
      bump(attempts, repoId);
      bump(admissionRefusals, repoId);
      // Refused, and SAID so. Returning an empty enumeration without a reason
      // would be indistinguishable from an empty repository, which is exactly
      // the ambiguity the ledger exists to remove.
      return {
        entries: [],
        rejectedPaths: [{ relativePath: '', reason: 'SOURCE_REPOSITORY_UNAVAILABLE' }],
        directoriesVisited: 0,
        truncated: false,
        truncationReason: null,
      };
    }
    const repoRoot = repoRootFor(repoId);
    if (repoRoot === null) {
      return {
        entries: [],
        rejectedPaths: [{ relativePath: '', reason: 'SOURCE_REPOSITORY_UNAVAILABLE' }],
        directoriesVisited: 0,
        truncated: false,
        truncationReason: null,
      };
    }
    const sourceRoot = repoRoot;
    if (!Number.isInteger(limits.maxFiles) || limits.maxFiles < 1 || limits.maxFiles > MAX_SIBLING_SOURCE_SCAN_FILES
      || !Number.isInteger(limits.maxTotalBytes) || limits.maxTotalBytes < 1 || limits.maxTotalBytes > MAX_SIBLING_SOURCE_SCAN_BYTES
      || limits.excludedDirectories.some((directory) => !safeExcludedDirectory(directory))) {
      return {
        entries: [],
        rejectedPaths: [{ relativePath: '', reason: 'SOURCE_CONFIG_INVALID' }],
        directoriesVisited: 0,
        truncated: false,
        truncationReason: null,
      };
    }

    const entries: SiblingSourceFileEntry[] = [];
    const rejectedPaths: SiblingSourceRejectedPath[] = [];
    const excluded = new Set<string>(['.git', ...limits.excludedDirectories]);
    let directoriesVisited = 0;
    let considered = 0;
    let inspectedBytes = 0;
    let truncated = false;
    let truncationReason: SourceScanRejectionReason | null = null;

    function reject(relativePath: string, reason: SourceScanRejectionReason): void {
      rejectedPaths.push({ relativePath, reason });
    }

    function canConsider(relativePath: string): boolean {
      if (considered >= limits.maxFiles) {
        truncated = true;
        truncationReason = 'SOURCE_FILE_COUNT_EXCEEDED';
        return false;
      }
      considered += 1;
      if (relativePath.length === 0) {
        reject(relativePath, 'SOURCE_PATH_ESCAPE');
        return false;
      }
      return true;
    }

    function walk(directory: string, relativeDirectory: string): void {
      if (truncated) return;
      directoriesVisited += 1;
      let children: readonly fs.Dirent[];
      try {
        children = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
      } catch {
        reject(relativeDirectory, 'SOURCE_READ_FAILED');
        return;
      }
      for (const child of children) {
        if (truncated) break;
        const relativePath = relativeDirectory.length === 0 ? child.name : `${relativeDirectory}/${child.name}`;
        if (child.name === '.git' || excluded.has(child.name)) {
          if (canConsider(relativePath)) reject(relativePath, 'SOURCE_PATH_EXCLUDED');
          continue;
        }
        if (!canConsider(relativePath)) break;
        const absolutePath = path.resolve(sourceRoot, ...relativePath.split('/'));
        if (!isPathInside(absolutePath, sourceRoot) || !hasNoSymlinkPath(absolutePath)) {
          reject(relativePath, 'SOURCE_SYMLINK_REJECTED');
          continue;
        }
        let stats: fs.Stats;
        try { stats = fs.lstatSync(absolutePath); } catch {
          reject(relativePath, 'SOURCE_READ_FAILED');
          continue;
        }
        if (stats.isSymbolicLink()) {
          reject(relativePath, 'SOURCE_SYMLINK_REJECTED');
        } else if (stats.isDirectory()) {
          walk(absolutePath, relativePath);
        } else if (stats.isFile()) {
          if (stats.size > limits.maxTotalBytes - inspectedBytes) {
            reject(relativePath, 'SOURCE_TOTAL_BUDGET_EXCEEDED');
            truncated = true;
            truncationReason = 'SOURCE_TOTAL_BUDGET_EXCEEDED';
            continue;
          }
          inspectedBytes += stats.size;
          entries.push({ relativePath, kind: 'REGULAR', byteCount: stats.size });
        } else {
          reject(relativePath, 'SOURCE_FILE_NOT_REGULAR');
        }
      }
    }

    const roots = [...allowlistedRoots].sort((left, right) => left.localeCompare(right));
    for (const root of roots) {
      if (truncated) break;
      const parts = safeScanRootParts(root);
      if (parts === null) {
        reject(root, 'SOURCE_ROOT_UNAPPROVED');
        continue;
      }
      const absoluteRoot = path.resolve(sourceRoot, ...parts);
      if (!isPathInside(absoluteRoot, sourceRoot) || !hasNoSymlinkPath(absoluteRoot)) {
        reject(root, 'SOURCE_SYMLINK_REJECTED');
        continue;
      }
      let stats: fs.Stats;
      try { stats = fs.lstatSync(absoluteRoot); } catch {
        reject(root, 'SOURCE_ROOT_UNAPPROVED');
        continue;
      }
      if (stats.isSymbolicLink()) {
        reject(root, 'SOURCE_SYMLINK_REJECTED');
      } else if (!stats.isDirectory()) {
        reject(root, 'SOURCE_FILE_NOT_REGULAR');
      } else {
        walk(absoluteRoot, root);
      }
    }
    return { entries, rejectedPaths, directoriesVisited, truncated, truncationReason };
  }

  const reader: RealSourceReader = {
    readFile(repoId: string, relativePath: string): string | null {
      bump(attempts, repoId);
      if (admissionRefused(repoId)) {
        bump(admissionRefusals, repoId);
        return null;
      }
      const repoRoot = repoRootFor(repoId);
      const parts = safeRelativeParts(relativePath);
      if (repoRoot === null || parts === null) return null;
      const file = path.resolve(repoRoot, ...parts);
      if (!isPathInside(file, repoRoot) || !hasNoSymlinkPath(file)) return null;
      const text = readRegularTextNoFollow(file, MAX_SIBLING_SOURCE_FILE_BYTES);
      // Counted only when content actually crossed the boundary.
      if (text !== null) bump(contentReads, repoId);
      return text;
    },
  };

  const readLedger: SiblingSourceReadLedger = {
    attempts: (repoId: string) => attempts.get(repoId) ?? 0,
    contentReads: (repoId: string) => contentReads.get(repoId) ?? 0,
    admissionRefusals: (repoId: string) => admissionRefusals.get(repoId) ?? 0,
    repositoriesTouched: () => Object.freeze([...attempts.keys()].sort()),
    totalAdmissionRefusals: () => [...admissionRefusals.values()].reduce((left, right) => left + right, 0),
  };

  const currentness: RealSourceCurrentness = {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      if (admissionRefused(repoId)) {
        bump(attempts, repoId);
        bump(admissionRefusals, repoId);
        return null;
      }
      const repoRoot = repoRootFor(repoId);
      if (repoRoot === null) return null;
      const sha = resolveGitHead(repoRoot, resolvedRoot);
      return sha === null ? null : { repoId, sha };
    },
  };

  return { reader, currentness, root: resolvedRoot, enumerateFiles, readLedger };
}
