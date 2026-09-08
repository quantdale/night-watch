// ---------------------------------------------------------------------------
// Nightwatch private local artifact policy.
//
// Real dossiers are owner-only local state. The default location is outside
// the repository under the operator's home directory; tests may inject a
// temporary root. Writes are atomic and owner-readable only. There is no
// upload, share, or publication fallback.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { assertOwnerPolicyAllows, type OwnerScopedOperation } from './ownerScope';
import { containsPrivatePayloadShape } from './privateScreening';
import { errnoCode } from './sensitiveDiagnostics';
import { assertOutsideSourceTopology, resolveSourceTopology, type SourceTopology } from './sourceTopology';

export const PRIVATE_ARTIFACT_POLICY_VERSION = 'nightwatch.private-artifact-policy.v1' as const;
export const PRIVATE_ARTIFACT_ROOT_ENV = 'NIGHTWATCH_PRIVATE_STATE_DIR' as const;
export const REVIEW_STORE_ROOT_ENV = 'NIGHTWATCH_REVIEW_STORE_DIR' as const;
export const PRIVATE_ARTIFACT_DEFAULT_RELATIVE_ROOT = path.join('.nightwatch', 'findings');

/**
 * The CLOSED set of owner-local private subtrees. A caller names a subtree,
 * never a path, so no caller can derive an arbitrary location: the root is
 * chosen from this table and then held to the same absolute / symlink-free /
 * owner-only / outside-the-repository contract as the findings root.
 */
export const PRIVATE_ARTIFACT_SUBTREES = ['findings', 'reviews'] as const;
export type PrivateArtifactSubtree = (typeof PRIVATE_ARTIFACT_SUBTREES)[number];

const SUBTREE_ROOT_ENV: Readonly<Record<PrivateArtifactSubtree, string>> = Object.freeze({
  findings: PRIVATE_ARTIFACT_ROOT_ENV,
  reviews: REVIEW_STORE_ROOT_ENV,
});

const SUBTREE_RELATIVE_ROOT: Readonly<Record<PrivateArtifactSubtree, string>> = Object.freeze({
  findings: PRIVATE_ARTIFACT_DEFAULT_RELATIVE_ROOT,
  reviews: path.join('.nightwatch', 'reviews'),
});

export type PrivateArtifactStatus = 'INCOMPLETE' | 'READY';

export interface PrivateRetentionPolicy {
  readonly maxOccurrenceRecords: number;
  readonly unresolvedFindingsOwnerControlled: true;
  readonly syntheticFixturesRetained: true;
  readonly autoDeleteActiveFindings: false;
}

export const PRIVATE_RETENTION_POLICY: PrivateRetentionPolicy = {
  maxOccurrenceRecords: 100,
  unresolvedFindingsOwnerControlled: true,
  syntheticFixturesRetained: true,
  autoDeleteActiveFindings: false,
};

export interface PrivateArtifactPolicyRecord {
  readonly policyVersion: typeof PRIVATE_ARTIFACT_POLICY_VERSION;
  readonly storageClass: 'OWNER_ONLY_LOCAL';
  readonly externalPublication: 'PROHIBITED';
  readonly remotePrivacy: 'NO_REMOTE' | 'PRIVATE_REMOTE_CONFIRMED' | 'REMOTE_PRIVACY_UNRESOLVED';
  readonly rootClass: 'OUTSIDE_REPOSITORY' | 'INJECTED_TEST_ROOT';
  readonly retention: PrivateRetentionPolicy;
}

const FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json$/;

/**
 * The publish temporary's name shape, pinned once. `temporaryPayload` builds
 * names to match it and the recovery scan recognizes only names that match
 * it, so an interrupted publish leaves an identifiable artifact and recovery
 * can never touch a file it did not create.
 */
export const PRIVATE_ARTIFACT_TEMPORARY_PREFIX = '.nightwatch-' as const;
const TEMPORARY_FILE_RE = /^\.nightwatch-\d{1,10}-[0-9a-f]{32}\.tmp$/;

/**
 * NW-02: these roots were derived from this module's own location, so the
 * exclusion set changed with the checkout — the canonical checkout excluded
 * `REPOSITORIES`, while a C-00 session worktree excluded only
 * `$HOME/.nightwatch/worktrees` and therefore ACCEPTED a private root beneath
 * canonical or a sibling source tree. The judgement now lives in one
 * topology-aware authority resolved from absolute, checkout-independent
 * facts.
 */
const sourceTopology = (): SourceTopology => resolveSourceTopology();

function assertKnownSubtree(subtree: PrivateArtifactSubtree): PrivateArtifactSubtree {
  // Runtime guard as well as a type: the union is the whole path-safety
  // argument, so an untyped caller must not be able to slip past it.
  if (!(PRIVATE_ARTIFACT_SUBTREES as readonly string[]).includes(subtree)) {
    throw new Error('PRIVATE_ARTIFACT_SUBTREE_UNKNOWN');
  }
  return subtree;
}

function defaultRoot(subtree: PrivateArtifactSubtree = 'findings'): string {
  const configured = process.env[SUBTREE_ROOT_ENV[assertKnownSubtree(subtree)]];
  return configured === undefined || configured.trim() === ''
    ? path.join(os.homedir(), SUBTREE_RELATIVE_ROOT[subtree])
    : configured;
}

function assertOutsideCanonicalWorkspace(root: string): void {
  assertOutsideSourceTopology(root, 'PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY', sourceTopology());
}

function ensureAbsolute(root: string): string {
  if (!path.isAbsolute(root)) throw new Error('PRIVATE_ARTIFACT_ROOT_NOT_ABSOLUTE');
  const resolved = path.normalize(root);
  return resolved;
}

function assertNoSymlinkComponents(target: string, errorCode: string): void {
  const resolved = ensureAbsolute(target);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const component of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      // NW-13: errno only. The native message embeds the absolute path.
      throw new Error(`${errorCode}:${errnoCode(error)}`);
    }
    if (stat.isSymbolicLink()) throw new Error(errorCode);
  }
}

function assertOwnerOnly(stat: fs.Stats, errorCode: string): void {
  if (process.getuid !== undefined && stat.uid !== process.getuid()) throw new Error(`${errorCode}_OWNER`);
  if ((stat.mode & 0o077) !== 0) throw new Error(`${errorCode}_PERMISSIONS_UNSAFE`);
}

function ensureOwnerDirectory(root: string): void {
  assertNoSymlinkComponents(root, 'PRIVATE_ARTIFACT_ROOT_SYMLINK');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  assertNoSymlinkComponents(root, 'PRIVATE_ARTIFACT_ROOT_SYMLINK');
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('PRIVATE_ARTIFACT_ROOT_NOT_DIRECTORY');
  assertOwnerOnly(stat, 'PRIVATE_ARTIFACT_ROOT');
}

function safeFileName(fileName: string): string {
  if (!FILE_NAME_RE.test(fileName) || fileName.includes('..')) throw new Error('PRIVATE_ARTIFACT_FILE_NAME_UNSAFE');
  return fileName;
}

function assertPrivatePayload(value: unknown): void {
  // Shared sentinel/secret screen (src/core/policy/privateScreening.ts) — the
  // single canonical pattern set for durable construction points.
  if (containsPrivatePayloadShape(JSON.stringify(value))) {
    throw new Error('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
  }
}

export function privateArtifactRoot(injectedRoot?: string, subtree: PrivateArtifactSubtree = 'findings'): string {
  assertKnownSubtree(subtree);
  const root = ensureAbsolute(injectedRoot ?? defaultRoot(subtree));
  // A DERIVED root is still held to the outside-the-repository contract; only
  // an explicitly injected test root is exempt, and it is labelled as such.
  if (injectedRoot === undefined) assertOutsideCanonicalWorkspace(root);
  return root;
}

export function privateArtifactPolicyRecord(remotePrivacy: PrivateArtifactPolicyRecord['remotePrivacy'], injectedRoot?: string): PrivateArtifactPolicyRecord {
  return {
    policyVersion: PRIVATE_ARTIFACT_POLICY_VERSION,
    storageClass: 'OWNER_ONLY_LOCAL',
    externalPublication: 'PROHIBITED',
    remotePrivacy,
    rootClass: injectedRoot === undefined ? 'OUTSIDE_REPOSITORY' : 'INJECTED_TEST_ROOT',
    retention: PRIVATE_RETENTION_POLICY,
  };
}

export class PrivateArtifactStore {
  readonly root: string;
  readonly policy: PrivateArtifactPolicyRecord;
  readonly readOnly: boolean;

  constructor(options: { root?: string; subtree?: PrivateArtifactSubtree; remotePrivacy?: PrivateArtifactPolicyRecord['remotePrivacy']; createIfMissing?: boolean } = {}) {
    this.root = privateArtifactRoot(options.root, options.subtree ?? 'findings');
    this.readOnly = options.createIfMissing === false;
    if (!this.readOnly) ensureOwnerDirectory(this.root);
    this.policy = privateArtifactPolicyRecord(options.remotePrivacy ?? 'NO_REMOTE', options.root);
  }

  private temporaryPayload(payload: string): string {
    // The name is deliberately independent of the destination and includes
    // process randomness.  `wx` remains the actual collision primitive; the
    // random component prevents separate store instances in one process from
    // colliding merely because their local counters start at zero.
    const temporary = path.join(this.root, `${PRIVATE_ARTIFACT_TEMPORARY_PREFIX}${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o600);
      fs.writeFileSync(descriptor, payload, { encoding: 'utf8' });
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.chmodSync(temporary, 0o600);
      const stat = fs.lstatSync(temporary);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRIVATE_ARTIFACT_TEMP_UNSAFE');
      assertOwnerOnly(stat, 'PRIVATE_ARTIFACT_TEMP');
      return temporary;
    } catch (error) {
      if (descriptor !== undefined) {
        try {
          fs.closeSync(descriptor);
        } catch {
          // Preserve the original failure; cleanup below is best effort.
        }
      }
      try {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Preserve the original safety failure; cleanup is best effort.
      }
      throw error;
    }
  }

  private fsyncDirectory(): void {
    let descriptor: number | undefined;
    try {
      descriptor = fs.openSync(this.root, 'r');
      fs.fsyncSync(descriptor);
    } catch {
      throw new Error('PRIVATE_ARTIFACT_DIRECTORY_FSYNC_FAILED');
    } finally {
      if (descriptor !== undefined) {
        try {
          fs.closeSync(descriptor);
        } catch {
          // Directory durability failure is already represented above when
          // fsync itself failed. Close cleanup must not hide it.
        }
      }
    }
  }

  private verifyPublishedFile(destination: string): void {
    const written = fs.lstatSync(destination);
    if (written.isSymbolicLink() || !written.isFile()) throw new Error('PRIVATE_ARTIFACT_DESTINATION_UNSAFE');
    assertOwnerOnly(written, 'PRIVATE_ARTIFACT_DESTINATION');
  }

  writeJson(fileName: string, value: unknown, status: PrivateArtifactStatus = 'READY'): string {
    if (this.readOnly) throw new Error('PRIVATE_ARTIFACT_READ_ONLY');
    safeFileName(fileName);
    assertPrivatePayload(value);
    ensureOwnerDirectory(this.root);
    const destination = path.join(this.root, fileName);
    assertNoSymlinkComponents(destination, 'PRIVATE_ARTIFACT_DESTINATION_SYMLINK');
    if (fs.existsSync(destination)) {
      const existing = fs.lstatSync(destination);
      if (existing.isSymbolicLink() || !existing.isFile()) throw new Error('PRIVATE_ARTIFACT_DESTINATION_UNSAFE');
      assertOwnerOnly(existing, 'PRIVATE_ARTIFACT_DESTINATION');
    }
    const payloadValue = value !== null && typeof value === 'object' ? value : { value };
    const payload = JSON.stringify({ ...(payloadValue as Record<string, unknown>), status }, null, 2) + '\n';
    let temporary: string | undefined;
    try {
      temporary = this.temporaryPayload(payload);
      fs.renameSync(temporary, destination);
      temporary = undefined;
      this.verifyPublishedFile(destination);
      this.fsyncDirectory();
    } catch (error) {
      try {
        if (temporary !== undefined && fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Preserve the original safety failure; cleanup is best effort.
      }
      throw error;
    }
    return destination;
  }

  writeIncomplete(fileName: string, value: unknown): string {
    return this.writeJson(fileName, value, 'INCOMPLETE');
  }

  /**
   * Read one owner-only JSON object for a narrowly scoped local reader.
   * Callers remain responsible for strict schema validation; malformed or
   * unsafe files fail closed and never become an implicit valid artifact.
   */
  readJson(fileName: string): unknown | null {
    safeFileName(fileName);
    if (!fs.existsSync(this.root)) return null;
    if (!this.readOnly) ensureOwnerDirectory(this.root);
    const destination = path.join(this.root, fileName);
    assertNoSymlinkComponents(destination, 'PRIVATE_ARTIFACT_PATH_SYMLINK');
    if (!fs.existsSync(destination)) return null;
    const stat = fs.lstatSync(destination);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRIVATE_ARTIFACT_DESTINATION_UNSAFE');
    assertOwnerOnly(stat, 'PRIVATE_ARTIFACT_DESTINATION');
    try {
      return JSON.parse(fs.readFileSync(destination, 'utf8')) as unknown;
    } catch {
      throw new Error('PRIVATE_ARTIFACT_CORRUPT');
    }
  }

  /** Write once; an existing destination can never be silently replaced. */
  writeImmutableJson(fileName: string, value: unknown, status: PrivateArtifactStatus = 'READY'): string {
    if (this.readOnly) throw new Error('PRIVATE_ARTIFACT_READ_ONLY');
    safeFileName(fileName);
    assertPrivatePayload(value);
    ensureOwnerDirectory(this.root);
    const destination = path.join(this.root, fileName);
    // This is a path-safety check only.  It is intentionally not used as an
    // existence/exclusion check; linkSync below is the filesystem race
    // primitive that decides the winner.
    assertNoSymlinkComponents(destination, 'PRIVATE_ARTIFACT_DESTINATION_SYMLINK');
    const payloadValue = value !== null && typeof value === 'object' ? value : { value };
    const payload = JSON.stringify({ ...(payloadValue as Record<string, unknown>), status }, null, 2) + '\n';
    let temporary: string | undefined;
    try {
      temporary = this.temporaryPayload(payload);
      // Re-check path components immediately before publication, but never
      // replace a path that became unsafe after the earlier check.
      assertNoSymlinkComponents(destination, 'PRIVATE_ARTIFACT_DESTINATION_SYMLINK');
      try {
        // POSIX link creation is atomic and fails with EEXIST without
        // replacing an existing regular file, directory, or symlink.
        fs.linkSync(temporary, destination);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EEXIST') throw new Error('PRIVATE_ARTIFACT_IMMUTABLE');
        if (code === 'ENOTSUP' || code === 'EOPNOTSUPP' || code === 'EXDEV' || code === 'EINVAL' || code === 'EPERM') {
          throw new Error('PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED');
        }
        throw error;
      }
      this.verifyPublishedFile(destination);
      fs.unlinkSync(temporary);
      temporary = undefined;
      this.fsyncDirectory();
      this.verifyPublishedFile(destination);
    } catch (error) {
      try {
        if (temporary !== undefined && fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Preserve the original safety failure; cleanup is best effort.
      }
      throw error;
    }
    return destination;
  }

  /**
   * Owner-only listing of this store's published JSON artifacts, optionally
   * narrowed to a name prefix. It returns only names this store would also
   * agree to read, so a listing can never widen what a caller can open.
   */
  listJson(namePrefix?: string): readonly string[] {
    if (!fs.existsSync(this.root)) return [];
    assertNoSymlinkComponents(this.root, 'PRIVATE_ARTIFACT_ROOT_SYMLINK');
    const prefix = namePrefix ?? '';
    const names: string[] = [];
    for (const entry of fs.readdirSync(this.root, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!FILE_NAME_RE.test(entry.name) || entry.name.includes('..')) continue;
      if (!entry.name.startsWith(prefix)) continue;
      names.push(entry.name);
    }
    return names.sort((left, right) => left.localeCompare(right));
  }

  /**
   * Temporaries left behind by an interrupted publish. Recognized ONLY by the
   * pinned name shape: an unknown file in the root is never reported and can
   * therefore never be removed by recovery.
   */
  listTemporaries(): readonly string[] {
    if (!fs.existsSync(this.root)) return [];
    assertNoSymlinkComponents(this.root, 'PRIVATE_ARTIFACT_ROOT_SYMLINK');
    const names: string[] = [];
    for (const entry of fs.readdirSync(this.root, { withFileTypes: true })) {
      if (entry.isFile() && TEMPORARY_FILE_RE.test(entry.name)) names.push(entry.name);
    }
    return names.sort((left, right) => left.localeCompare(right));
  }

  /**
   * Remove ONE interrupted-publish temporary. Any name that is not a store
   * temporary is refused, so this can never become a general delete.
   */
  removeTemporary(name: string): void {
    if (this.readOnly) throw new Error('PRIVATE_ARTIFACT_READ_ONLY');
    if (!TEMPORARY_FILE_RE.test(name)) throw new Error('PRIVATE_ARTIFACT_NOT_A_TEMPORARY');
    const target = path.join(this.root, name);
    assertNoSymlinkComponents(target, 'PRIVATE_ARTIFACT_PATH_SYMLINK');
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('PRIVATE_ARTIFACT_DESTINATION_UNSAFE');
    assertOwnerOnly(stat, 'PRIVATE_ARTIFACT_DESTINATION');
    fs.unlinkSync(target);
  }

  /** Always throws; external publication is not a Nightwatch capability. */
  publish(_operation: OwnerScopedOperation = 'EXTERNAL_PUBLICATION'): never {
    assertOwnerPolicyAllows(_operation);
    throw new Error('OWNER_POLICY_BLOCKED: external publication is prohibited');
  }
}

export function assertPrivateArtifactPath(filePath: string, root: string): void {
  const resolvedRoot = ensureAbsolute(root);
  const resolvedFile = ensureAbsolute(filePath);
  assertNoSymlinkComponents(resolvedRoot, 'PRIVATE_ARTIFACT_ROOT_SYMLINK');
  assertNoSymlinkComponents(resolvedFile, 'PRIVATE_ARTIFACT_PATH_SYMLINK');
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('PRIVATE_ARTIFACT_PATH_ESCAPE');
}
