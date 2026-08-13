// ---------------------------------------------------------------------------
// Nightwatch private local artifact policy.
//
// Real dossiers are owner-only local state. The default location is outside
// the repository under the operator's home directory; tests may inject a
// temporary root. Writes are atomic and owner-readable only. There is no
// upload, share, or publication fallback.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
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

function defaultRoot(): string {
  const configured = process.env[PRIVATE_ARTIFACT_ROOT_ENV];
  return configured === undefined || configured.trim() === ''
    ? path.join(os.homedir(), PRIVATE_ARTIFACT_DEFAULT_RELATIVE_ROOT)
    : configured;
}

function assertOutsideCurrentRepository(root: string): void {
  const current = path.resolve(process.cwd());
  const relative = path.relative(current, root);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('PRIVATE_ARTIFACT_ROOT_INSIDE_REPOSITORY');
  }
}

function ensureAbsolute(root: string): string {
  const resolved = path.resolve(root);
  if (!path.isAbsolute(resolved)) throw new Error('PRIVATE_ARTIFACT_ROOT_NOT_ABSOLUTE');
  return resolved;
}

function ensureOwnerDirectory(root: string): void {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const mode = fs.statSync(root).mode & 0o777;
  if ((mode & 0o077) !== 0) throw new Error('PRIVATE_ARTIFACT_ROOT_PERMISSIONS_UNSAFE');
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
  if (injectedRoot === undefined) assertOutsideCurrentRepository(root);
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
  private nonce = 0;

  constructor(options: { root?: string; remotePrivacy?: PrivateArtifactPolicyRecord['remotePrivacy'] } = {}) {
    this.root = privateArtifactRoot(options.root);
    ensureOwnerDirectory(this.root);
    this.policy = privateArtifactPolicyRecord(options.remotePrivacy ?? 'NO_REMOTE', options.root);
  }

  writeJson(fileName: string, value: unknown, status: PrivateArtifactStatus = 'READY'): string {
    safeFileName(fileName);
    assertPrivatePayload(value);
    const destination = path.join(this.root, fileName);
    const temporary = path.join(this.root, `.${fileName}.${process.pid}.${this.nonce++}.tmp`);
    const payloadValue = value !== null && typeof value === 'object' ? value : { value };
    const payload = JSON.stringify({ ...(payloadValue as Record<string, unknown>), status }, null, 2) + '\n';
    const descriptor = fs.openSync(temporary, 'wx', 0o600);
    try {
      fs.writeFileSync(descriptor, payload, { encoding: 'utf8' });
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.chmodSync(temporary, 0o600);
    fs.renameSync(temporary, destination);
    return destination;
  }

  writeIncomplete(fileName: string, value: unknown): string {
    return this.writeJson(fileName, value, 'INCOMPLETE');
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
  const relative = path.relative(resolvedRoot, resolvedFile);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('PRIVATE_ARTIFACT_PATH_ESCAPE');
}
