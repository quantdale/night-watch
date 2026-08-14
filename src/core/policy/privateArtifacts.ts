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

export const PRIVATE_ARTIFACT_POLICY_VERSION = 'nightwatch.private-artifact-policy.v1' as const;
export const PRIVATE_ARTIFACT_ROOT_ENV = 'NIGHTWATCH_PRIVATE_STATE_DIR' as const;
export const PRIVATE_ARTIFACT_DEFAULT_RELATIVE_ROOT = path.join('.nightwatch', 'findings');

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
const SECRET_SHAPE_RE = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const PRIVATE_SENTINEL_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL)/i;
const PRIVATE_VALUE_RE = /(?:customer|account|billing[_-]?group|payer|cost|amount|email|cookie|token|password|secret|authorization)\s*[:=]\s*["']?[A-Za-z0-9@._:+/=-]{6,}/i;

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKSPACE_ROOT = path.resolve(REPOSITORY_ROOT, '..');

function defaultRoot(): string {
  const configured = process.env[PRIVATE_ARTIFACT_ROOT_ENV];
  return configured === undefined || configured.trim() === ''
    ? path.join(os.homedir(), PRIVATE_ARTIFACT_DEFAULT_RELATIVE_ROOT)
    : configured;
}

function isInside(dir: string, candidate: string): boolean {
  const relative = path.relative(dir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertOutsideCanonicalWorkspace(root: string): void {
  if (isInside(REPOSITORY_ROOT, root) || isInside(WORKSPACE_ROOT, root)) {
    throw new Error('PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY');
  }
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
      throw new Error(`${errorCode}:${(error as Error).message}`);
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
  const encoded = JSON.stringify(value);
  if (SECRET_SHAPE_RE.test(encoded) || PRIVATE_SENTINEL_RE.test(encoded) || PRIVATE_VALUE_RE.test(encoded)) {
    throw new Error('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
  }
}

export function privateArtifactRoot(injectedRoot?: string): string {
  const root = ensureAbsolute(injectedRoot ?? defaultRoot());
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

  constructor(options: { root?: string; remotePrivacy?: PrivateArtifactPolicyRecord['remotePrivacy'] } = {}) {
    this.root = privateArtifactRoot(options.root);
    ensureOwnerDirectory(this.root);
    this.policy = privateArtifactPolicyRecord(options.remotePrivacy ?? 'NO_REMOTE', options.root);
  }

  private temporaryPayload(payload: string): string {
    // The name is deliberately independent of the destination and includes
    // process randomness.  `wx` remains the actual collision primitive; the
    // random component prevents separate store instances in one process from
    // colliding merely because their local counters start at zero.
    const temporary = path.join(this.root, `.nightwatch-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
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
    ensureOwnerDirectory(this.root);
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
