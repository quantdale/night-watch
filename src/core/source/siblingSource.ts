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

export const DEFAULT_SIBLING_ROOT = '/home/dalepalaca/go/src/alphaus-main/REPOSITORIES';
export const MAX_SIBLING_SOURCE_FILE_BYTES = 2_000_000;
export const MAX_SIBLING_GIT_METADATA_BYTES = 64 * 1024;

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const SAFE_SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_REF_RE = /^refs\/(?:heads|remotes|tags)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
/** Repository-relative path: no leading slash, no backslash, no NUL. */
const RELATIVE_PATH_RE = /^[^/\\][^\\]*$/;

// Phase 15P A15 convergence: the structural return type remains module
// private. Existing callers consume only the injected reader/currentness API.
interface SiblingSourceAccess {
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
  readonly root: string;
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

export function createSiblingSourceAccess(root: string): SiblingSourceAccess {
  const resolvedRoot = path.resolve(root);
  const rootUsable = regularDirectory(resolvedRoot);

  function repoRootFor(repoId: string): string | null {
    if (!rootUsable || !safeRepoId(repoId)) return null;
    const candidate = path.resolve(resolvedRoot, ...repoId.split('/'));
    if (!isPathInside(candidate, resolvedRoot) || !regularDirectory(candidate)) return null;
    // Requiring a supported git metadata shape keeps malformed or unsafe
    // repositories out of both the text and currentness APIs.
    return resolveGitMetadataDirectory(candidate, resolvedRoot) === null ? null : candidate;
  }

  const reader: RealSourceReader = {
    readFile(repoId: string, relativePath: string): string | null {
      const repoRoot = repoRootFor(repoId);
      const parts = safeRelativeParts(relativePath);
      if (repoRoot === null || parts === null) return null;
      const file = path.resolve(repoRoot, ...parts);
      if (!isPathInside(file, repoRoot) || !hasNoSymlinkPath(file)) return null;
      return readRegularTextNoFollow(file, MAX_SIBLING_SOURCE_FILE_BYTES);
    },
  };

  const currentness: RealSourceCurrentness = {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      const repoRoot = repoRootFor(repoId);
      if (repoRoot === null) return null;
      const sha = resolveGitHead(repoRoot, resolvedRoot);
      return sha === null ? null : { repoId, sha };
    },
  };

  return { reader, currentness, root: resolvedRoot };
}
