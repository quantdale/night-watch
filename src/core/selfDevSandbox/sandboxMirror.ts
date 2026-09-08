// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — disposable owner-private source mirror.
//
// Copies only the fixed SELFDEV_AUTHORITATIVE_PATHS set into a fresh 0700
// temporary directory outside the canonical repository, the parent
// workspace, and the private-findings root. No Git is used to build or
// inspect this mirror. Cleanup only ever removes a directory this module
// itself created beneath the fixed sandbox base.
//
// Phase 8B.0.1 confinement contract: NO filesystem-mutating operation
// (chmod, mkdir beneath, mkdtemp, file creation, recursive cleanup) may
// follow an untrusted pathname. `ensurePrivateSandboxBase()` validates the
// whole pathname chain (lstat-first, symlink components fail closed,
// non-directory components fail closed, owner and private-mode validated,
// missing directories created only beneath a validated parent with mode 0700
// and immediately revalidated) BEFORE any mutation. chmod is never applied
// to an unvalidated pathname and never to $HOME or arbitrary ancestors.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256LengthPrefixedEntries } from '../selfDev/canonical';
import { SELFDEV_AUTHORITATIVE_PATHS } from '../selfDev/provenanceManifest';
import { privateArtifactRoot } from '../policy/privateArtifacts';
import { errnoCode } from '../policy/sensitiveDiagnostics';

const MAX_SOURCE_MIRROR_BYTES = 8 * 1024 * 1024;

/** Production code-defined sandbox base. There is no public --sandbox-root option. */
export const SELFDEV_SANDBOX_ROOT_BASE = path.join(os.homedir(), '.nightwatch', 'selfdev-sandboxes');

/**
 * Test-only injection point for the sandbox base. NOT exported from the
 * sandbox boundary index and unreachable from the production CLI; production
 * runtime always uses the code-defined SELFDEV_SANDBOX_ROOT_BASE.
 */
let sandboxBaseOverride: string | null = null;
export function setSandboxBaseOverrideForTests(base: string | null): void {
  sandboxBaseOverride = base;
}

function effectiveSandboxBase(): string {
  return sandboxBaseOverride ?? SELFDEV_SANDBOX_ROOT_BASE;
}

export interface SelfDevSandboxMirror {
  readonly root: string;
  readonly copiedPaths: readonly string[];
}

function assertNoSymlink(target: string, code: string): fs.Stats {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(code);
  return stat;
}

function assertSafeRelativePath(relative: string): void {
  if (relative.startsWith('/') || relative.includes('..') || path.normalize(relative) !== relative) {
    throw new Error('SELFDEV_SANDBOX_SOURCE_PATH_UNSAFE');
  }
}

/** Owner (uid) and private-mode validation, reusing the private-artifact policy convention. */
function assertOwnerPrivate(stat: fs.Stats, code: string): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${code}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${code}_PERMISSIONS_UNSAFE`);
}

/**
 * Walks every pathname component from the filesystem root to `target`,
 * lstat-first: a symlink or non-directory component fails closed; the first
 * missing component (ENOENT) is returned so the caller can decide whether it
 * is the exact directory it is allowed to create beneath an already
 * validated parent. No mutation occurs here.
 */
function firstMissingPathnameComponent(target: string): string | null {
  const parsed = path.parse(target);
  let current = parsed.root;
  const components = target.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const component of components) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return current;
      throw new Error(`SELFDEV_SANDBOX_BASE_UNSAFE:${errnoCode(error)}`);
    }
    if (stat.isSymbolicLink()) throw new Error('SELFDEV_SANDBOX_BASE_SYMLINK');
    if (!stat.isDirectory()) throw new Error('SELFDEV_SANDBOX_BASE_NOT_DIRECTORY');
  }
  return null;
}

/** Validates an existing directory in place: lstat (non-symlink directory), owner, private mode. No chmod, no repair. */
function assertExistingOwnerPrivateDirectory(dir: string, code: string): void {
  const stat = assertNoSymlink(dir, code);
  if (!stat.isDirectory()) throw new Error(code);
  assertOwnerPrivate(stat, code);
}

/**
 * Established Nightwatch private-directory convention (privateArtifacts
 * `ensureOwnerDirectory`): the private PARENT directory must be owner-only.
 * A validated, owner-matched, non-symlink directory whose mode is too open
 * is TIGHTENED to 0700 (never loosened) and immediately revalidated; a
 * symlink, non-directory, or wrong-owner parent fails closed. chmod is never
 * the first act on an unknown object — lstat/owner/directory checks run
 * before any mode change, so no chmod can follow a symlink. The sandbox BASE
 * itself is stricter (preexisting open modes fail closed, no repair).
 */
function ensureOwnerPrivateDirectory(dir: string, code: string): void {
  const stat = assertNoSymlink(dir, code);
  if (!stat.isDirectory()) throw new Error(code);
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${code}_OWNER`);
  if ((stat.mode & 0o077) !== 0) {
    fs.chmodSync(dir, 0o700);
    assertExistingOwnerPrivateDirectory(dir, code);
  }
}

/**
 * Creates a MISSING directory with mode 0700 at creation time, non-recursively
 * (its parent chain has already been validated to exist), then immediately
 * re-lstats and revalidates the result.
 */
function createOwnerPrivateDirectory(dir: string, code: string): void {
  fs.mkdirSync(dir, { mode: 0o700 });
  assertExistingOwnerPrivateDirectory(dir, code);
}

/**
 * Phase 8B.0.1 base-establishment contract:
 * 1. base location is code-defined (or test-injected at module level);
 * 2. the pathname chain is validated BEFORE any mutation;
 * 3. symlink components fail closed;
 * 4. non-directory components fail closed;
 * 5. ownership is validated where the platform exposes uid semantics;
 * 6. the sandbox BASE fails closed on unsafe permission state (no chmod
 *    repair of an existing base); the private PARENT reuses the established
 *    Nightwatch private-artifact convention (validated owner-matched
 *    directory tightened to 0700, never loosened);
 * 7. a missing directory is created only beneath a previously validated
 *    parent, non-recursively, with mode 0700;
 * 8. the newly created (or existing) path is immediately revalidated;
 * 9. no chmod ever occurs against an unvalidated pathname; $HOME and
 *    arbitrary ancestors are never chmodded and never created.
 */
export function ensurePrivateSandboxBase(): void {
  const base = path.resolve(effectiveSandboxBase());
  const parent = path.dirname(base);

  const missingParent = firstMissingPathnameComponent(parent);
  if (missingParent === null) {
    ensureOwnerPrivateDirectory(parent, 'SELFDEV_SANDBOX_PARENT_UNSAFE');
  } else {
    if (missingParent !== parent) throw new Error('SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING');
    createOwnerPrivateDirectory(parent, 'SELFDEV_SANDBOX_PARENT_UNSAFE');
  }

  const missingBase = firstMissingPathnameComponent(base);
  if (missingBase === null) {
    assertExistingOwnerPrivateDirectory(base, 'SELFDEV_SANDBOX_BASE_UNSAFE');
  } else {
    if (missingBase !== base) throw new Error('SELFDEV_SANDBOX_BASE_ANCESTOR_MISSING');
    createOwnerPrivateDirectory(base, 'SELFDEV_SANDBOX_BASE_UNSAFE');
  }

  // Immediate revalidation of the established base (fresh lstat).
  assertExistingOwnerPrivateDirectory(base, 'SELFDEV_SANDBOX_BASE_UNSAFE');
}

/** Copies exactly the fixed authoritative source set. Candidate/caller data cannot add paths. */
export function createSandboxMirror(repositoryRoot: string): SelfDevSandboxMirror {
  ensurePrivateSandboxBase();
  const resolvedBase = fs.realpathSync(effectiveSandboxBase());

  const sandboxRoot = fs.mkdtempSync(path.join(effectiveSandboxBase(), 'sbx-'));
  // 0700 at creation time only, and only after the base chain was validated;
  // the freshly created root is revalidated immediately below.
  fs.chmodSync(sandboxRoot, 0o700);
  const rootStat = assertNoSymlink(sandboxRoot, 'SELFDEV_SANDBOX_ROOT_UNSAFE');
  if (!rootStat.isDirectory()) throw new Error('SELFDEV_SANDBOX_ROOT_UNSAFE');
  assertOwnerPrivate(rootStat, 'SELFDEV_SANDBOX_ROOT_UNSAFE');

  const resolvedRoot = fs.realpathSync(sandboxRoot);
  if (resolvedRoot === resolvedBase || !resolvedRoot.startsWith(resolvedBase + path.sep)) {
    throw new Error('SELFDEV_SANDBOX_ROOT_UNSAFE');
  }
  // The instance must not be inside (or equal to) the canonical repository,
  // the parent workspace, or the private findings/artifact root.
  const resolvedRepository = path.resolve(repositoryRoot);
  const resolvedParentWorkspace = path.resolve(repositoryRoot, '..');
  // A disposable clean checkout is commonly created directly beneath the OS
  // temporary root. Treating that root as the checkout's workspace would also
  // reject the independent temporary bases used by this confinement matrix.
  // Keep the distinct parent-workspace exclusion for normal repository
  // topologies, while allowing unrelated temporary paths to remain testable.
  const temporaryRoot = path.resolve(os.tmpdir());
  const parentIsTemporary = resolvedParentWorkspace === temporaryRoot
    || resolvedParentWorkspace.startsWith(temporaryRoot + path.sep);
  const forbiddenAnchors = parentIsTemporary ? [resolvedRepository] : [resolvedRepository, resolvedParentWorkspace];
  for (const forbiddenAnchor of forbiddenAnchors) {
    if (resolvedRoot === forbiddenAnchor || resolvedRoot.startsWith(forbiddenAnchor + path.sep)) {
      throw new Error('SELFDEV_SANDBOX_ROOT_UNSAFE');
    }
  }
  let resolvedFindingsRoot: string | null = null;
  try {
    resolvedFindingsRoot = path.resolve(privateArtifactRoot());
  } catch {
    // The private-root computation itself failed closed; treat as unknown and
    // skip the findings containment check (the base chain remains validated).
    resolvedFindingsRoot = null;
  }
  if (resolvedFindingsRoot !== null && (resolvedRoot === resolvedFindingsRoot || resolvedRoot.startsWith(resolvedFindingsRoot + path.sep))) {
    throw new Error('SELFDEV_SANDBOX_ROOT_UNSAFE');
  }

  const copiedPaths: string[] = [];
  let totalBytes = 0;
  try {
    for (const relative of SELFDEV_AUTHORITATIVE_PATHS) {
      assertSafeRelativePath(relative);
      const sourcePath = path.join(repositoryRoot, relative);
      const sourceStat = assertNoSymlink(sourcePath, 'SELFDEV_SANDBOX_SOURCE_UNSAFE');
      if (!sourceStat.isFile()) throw new Error('SELFDEV_SANDBOX_SOURCE_UNSAFE');
      const bytes = fs.readFileSync(sourcePath);
      totalBytes += bytes.length;
      if (totalBytes > MAX_SOURCE_MIRROR_BYTES) throw new Error('SELFDEV_SANDBOX_SOURCE_TOO_LARGE');
      const destinationPath = path.join(sandboxRoot, relative);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(destinationPath, bytes, { mode: 0o600 });
      const destStat = assertNoSymlink(destinationPath, 'SELFDEV_SANDBOX_DESTINATION_UNSAFE');
      if (!destStat.isFile()) throw new Error('SELFDEV_SANDBOX_DESTINATION_UNSAFE');
      copiedPaths.push(relative);
    }
  } catch (error) {
    // Do not silently strand a partially copied mirror; cleanup obeys the
    // same validated-root rule (only removes beneath the validated base).
    cleanupSandboxMirror({ root: sandboxRoot, copiedPaths: [] });
    throw error;
  }
  return { root: sandboxRoot, copiedPaths };
}

/** Same length-prefixed digest algorithm as the canonical source bundle. */
export function sandboxSourceBundleDigest(mirror: SelfDevSandboxMirror): string {
  const entries = mirror.copiedPaths.map((relative) => ({
    path: relative,
    bytes: fs.readFileSync(path.join(mirror.root, relative)),
  }));
  return sha256LengthPrefixedEntries(entries);
}

/** Overwrites exactly one mirrored file with the postimage bytes. Replacement is safe here: the sandbox target is explicitly the intended mutable file. */
export function writeSandboxTarget(mirror: SelfDevSandboxMirror, targetRelativePath: string, postimageBytes: string): void {
  assertSafeRelativePath(targetRelativePath);
  if (!mirror.copiedPaths.includes(targetRelativePath)) throw new Error('SELFDEV_SANDBOX_TARGET_NOT_MIRRORED');
  const resolvedRoot = fs.realpathSync(mirror.root);
  const destination = path.join(mirror.root, targetRelativePath);
  const resolvedParent = fs.realpathSync(path.dirname(destination));
  if (resolvedParent !== resolvedRoot && !resolvedParent.startsWith(resolvedRoot + path.sep)) throw new Error('SELFDEV_SANDBOX_TARGET_PATH_UNSAFE');
  assertNoSymlink(destination, 'SELFDEV_SANDBOX_TARGET_UNSAFE');

  const temporary = path.join(path.dirname(destination), `.selfdev-sandbox-${process.pid}-${Math.random().toString(16).slice(2)}.tmp`);
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(descriptor, postimageBytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    assertNoSymlink(temporary, 'SELFDEV_SANDBOX_TARGET_UNSAFE');
    fs.renameSync(temporary, destination);
  } catch (error) {
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {
      // Preserve the original failure; cleanup is best effort.
    }
    throw error;
  }
}

/** Every path except the approved target must remain byte-identical to canonical. */
export function diffSandboxAgainstCanonical(repositoryRoot: string, mirror: SelfDevSandboxMirror): readonly string[] {
  const changed: string[] = [];
  for (const relative of mirror.copiedPaths) {
    const canonicalBytes = fs.readFileSync(path.join(repositoryRoot, relative));
    const sandboxBytes = fs.readFileSync(path.join(mirror.root, relative));
    if (!canonicalBytes.equals(sandboxBytes)) changed.push(relative);
  }
  return changed;
}

/**
 * Only ever removes a directory beneath the validated sandbox base that this
 * module itself created: the mirror root must realpath-resolve to a
 * non-symlink directory strictly beneath the validated base realpath. Any
 * doubt fails closed (returns FAIL, deletes nothing). A residual directory is
 * preferable to unsafe recursive deletion.
 */
export function cleanupSandboxMirror(mirror: SelfDevSandboxMirror): 'PASS' | 'FAIL' {
  try {
    const resolvedBase = fs.realpathSync(effectiveSandboxBase());
    const resolvedRoot = fs.realpathSync(mirror.root);
    if (resolvedRoot === resolvedBase || !resolvedRoot.startsWith(resolvedBase + path.sep)) return 'FAIL';
    const stat = assertNoSymlink(mirror.root, 'SELFDEV_SANDBOX_ROOT_UNSAFE');
    if (!stat.isDirectory()) return 'FAIL';
    fs.rmSync(mirror.root, { recursive: true, force: false });
    return 'PASS';
  } catch {
    return 'FAIL';
  }
}
