// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — disposable owner-private source mirror.
//
// Copies only the fixed SELFDEV_AUTHORITATIVE_PATHS set into a fresh 0700
// temporary directory outside the canonical repository, the parent
// workspace, and the private-findings root. No Git is used to build or
// inspect this mirror. Cleanup only ever removes a directory this module
// itself created beneath the fixed sandbox base.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256LengthPrefixedEntries } from '../selfDev/canonical';
import { SELFDEV_AUTHORITATIVE_PATHS } from '../selfDev/provenanceManifest';

const MAX_SOURCE_MIRROR_BYTES = 8 * 1024 * 1024;

export const SELFDEV_SANDBOX_ROOT_BASE = path.join(os.homedir(), '.nightwatch', 'selfdev-sandboxes');

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

/** Copies exactly the fixed authoritative source set. Candidate/caller data cannot add paths. */
export function createSandboxMirror(repositoryRoot: string): SelfDevSandboxMirror {
  fs.mkdirSync(SELFDEV_SANDBOX_ROOT_BASE, { recursive: true, mode: 0o700 });
  fs.chmodSync(SELFDEV_SANDBOX_ROOT_BASE, 0o700);
  assertNoSymlink(SELFDEV_SANDBOX_ROOT_BASE, 'SELFDEV_SANDBOX_BASE_UNSAFE');

  const sandboxRoot = fs.mkdtempSync(path.join(SELFDEV_SANDBOX_ROOT_BASE, 'sbx-'));
  fs.chmodSync(sandboxRoot, 0o700);
  const rootStat = assertNoSymlink(sandboxRoot, 'SELFDEV_SANDBOX_ROOT_UNSAFE');
  if (!rootStat.isDirectory()) throw new Error('SELFDEV_SANDBOX_ROOT_UNSAFE');

  const copiedPaths: string[] = [];
  let totalBytes = 0;
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

/** Only ever removes a directory beneath the fixed sandbox base that this module itself created. */
export function cleanupSandboxMirror(mirror: SelfDevSandboxMirror): 'PASS' | 'FAIL' {
  try {
    const resolvedBase = fs.realpathSync(SELFDEV_SANDBOX_ROOT_BASE);
    const resolvedRoot = path.resolve(mirror.root);
    if (!resolvedRoot.startsWith(resolvedBase + path.sep)) return 'FAIL';
    fs.rmSync(mirror.root, { recursive: true, force: false });
    return 'PASS';
  } catch {
    return 'FAIL';
  }
}
