// ---------------------------------------------------------------------------
// Nightwatch — designated DEV login credential provider.
//
// This is intentionally a narrow authentication-only abstraction. It is not a
// general secret-file reader and it is never used by exploration, evidence,
// planning, or repository code. The real credential lives outside the
// workspace in an owner-only file and is returned only to the guarded DEV
// login flow.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEV_CREDENTIAL_PROVIDER_TYPE = 'external-owner-only-file' as const;
export const DEV_CREDENTIAL_ENVIRONMENT = 'dev' as const;
export const DEV_CREDENTIAL_ACCOUNT_ALIAS = 'ripple-dev-designated-account' as const;
export const DEV_CREDENTIAL_SCHEMA_VERSION = 1 as const;
export const DEV_CREDENTIAL_STORAGE_CLASS = 'external-owner-only-secret-file' as const;

const SECRET_DIRECTORY = path.join('.nightwatch', 'secrets');
const SECRET_FILE = 'ripple-dev-designated-account.json';

export interface DevLoginCredential {
  username: string;
  password: string;
}

export interface DevCredentialSafeMetadata {
  configured: boolean;
  providerType: typeof DEV_CREDENTIAL_PROVIDER_TYPE;
  environment: typeof DEV_CREDENTIAL_ENVIRONMENT;
  accountAlias: typeof DEV_CREDENTIAL_ACCOUNT_ALIAS;
  storageClass: typeof DEV_CREDENTIAL_STORAGE_CLASS;
  storagePermissionsValid: boolean;
}

interface StoredDevCredential {
  schemaVersion: typeof DEV_CREDENTIAL_SCHEMA_VERSION;
  environment: typeof DEV_CREDENTIAL_ENVIRONMENT;
  accountAlias: typeof DEV_CREDENTIAL_ACCOUNT_ALIAS;
  username: string;
  password: string;
}

export class DevCredentialUnavailableError extends Error {
  readonly reason:
    | 'SECRET_FILE_MISSING'
    | 'SECRET_FILE_UNSAFE'
    | 'SECRET_FILE_INVALID'
    | 'SECRET_FILE_UNREADABLE';

  constructor(reason: DevCredentialUnavailableError['reason']) {
    super(reason);
    this.name = 'DevCredentialUnavailableError';
    this.reason = reason;
  }
}

function repositoryRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function workspaceRoot(): string {
  return path.resolve(repositoryRoot(), '..');
}

function isInside(dir: string, file: string): boolean {
  const relative = path.relative(dir, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** The only real storage location. Tests may supply a temporary external path. */
export function defaultDevCredentialPath(homeDirectory = os.homedir()): string {
  return path.join(homeDirectory, SECRET_DIRECTORY, SECRET_FILE);
}

function assertExternalSecretPath(secretPath: string): string {
  if (!path.isAbsolute(secretPath)) throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  const absolute = path.resolve(secretPath);
  if (isInside(repositoryRoot(), absolute) || isInside(workspaceRoot(), absolute)) {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
  if (!absolute.endsWith(path.sep + SECRET_FILE) && path.basename(absolute) !== SECRET_FILE) {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
  return absolute;
}

function currentUid(): number | null {
  return typeof process.getuid === 'function' ? process.getuid() : null;
}

function ownerOnlyMode(mode: number): boolean {
  return (mode & 0o077) === 0;
}

function ownerMatches(stat: fs.Stats): boolean {
  const uid = currentUid();
  return uid === null || stat.uid === uid;
}

function assertNoSymlinkInPath(directory: string): void {
  const absolute = path.resolve(directory);
  const root = path.parse(absolute).root;
  let current = root;
  for (const segment of absolute.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('symlink in secret path');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }
}

function assertPrivateDirectory(directory: string): void {
  let stat: fs.Stats;
  try {
    assertNoSymlinkInPath(directory);
    const link = fs.lstatSync(directory);
    if (!link.isDirectory() || link.isSymbolicLink()) throw new Error('unsafe directory');
    stat = fs.statSync(directory);
  } catch {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
  if (!ownerOnlyMode(stat.mode) || !ownerMatches(stat)) {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
}

function ensurePrivateDirectory(directory: string): void {
  try {
    assertNoSymlinkInPath(directory);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  } catch {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
  assertPrivateDirectory(directory);
}

function assertPrivateFile(secretPath: string): void {
  try {
    const link = fs.lstatSync(secretPath);
    if (!link.isFile() || link.isSymbolicLink()) throw new Error('unsafe file');
    const stat = fs.statSync(secretPath);
    if (!ownerOnlyMode(stat.mode) || !ownerMatches(stat)) throw new Error('unsafe permissions');
  } catch {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
}

function validateStoredCredential(value: unknown): StoredDevCredential {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DevCredentialUnavailableError('SECRET_FILE_INVALID');
  }
  const record = value as Record<string, unknown>;
  if (
    record['schemaVersion'] !== DEV_CREDENTIAL_SCHEMA_VERSION ||
    record['environment'] !== DEV_CREDENTIAL_ENVIRONMENT ||
    record['accountAlias'] !== DEV_CREDENTIAL_ACCOUNT_ALIAS ||
    typeof record['username'] !== 'string' ||
    typeof record['password'] !== 'string' ||
    record['username'].trim() === '' ||
    record['password'] === ''
  ) {
    throw new DevCredentialUnavailableError('SECRET_FILE_INVALID');
  }
  return {
    schemaVersion: DEV_CREDENTIAL_SCHEMA_VERSION,
    environment: DEV_CREDENTIAL_ENVIRONMENT,
    accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
    username: record['username'],
    password: record['password'],
  };
}

function readStoredCredential(secretPath: string): StoredDevCredential {
  const absolute = assertExternalSecretPath(secretPath);
  const directory = path.dirname(absolute);
  if (!fs.existsSync(absolute)) throw new DevCredentialUnavailableError('SECRET_FILE_MISSING');
  assertPrivateDirectory(directory);
  assertPrivateFile(absolute);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNREADABLE');
  }
  return validateStoredCredential(parsed);
}

function writeAtomicOwnerOnly(secretPath: string, value: StoredDevCredential): void {
  const absolute = assertExternalSecretPath(secretPath);
  const directory = path.dirname(absolute);
  ensurePrivateDirectory(directory);
  const temporary = path.join(
    directory,
    `.${SECRET_FILE}.${process.pid}.${Date.now()}.${crypto.randomBytes(8).toString('hex')}.tmp`,
  );
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.chmodSync(temporary, 0o600);
    assertPrivateFile(temporary);
    fs.renameSync(temporary, absolute);
    assertPrivateFile(absolute);
  } catch {
    if (descriptor !== undefined) {
      try { fs.closeSync(descriptor); } catch { /* best effort */ }
    }
    try { fs.unlinkSync(temporary); } catch { /* best effort */ }
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
}

export interface DevCredentialProvider {
  readonly providerType: typeof DEV_CREDENTIAL_PROVIDER_TYPE;
  readonly environment: typeof DEV_CREDENTIAL_ENVIRONMENT;
  readonly accountAlias: typeof DEV_CREDENTIAL_ACCOUNT_ALIAS;
  readonly storageClass: typeof DEV_CREDENTIAL_STORAGE_CLASS;
  getDevLoginCredential(): DevLoginCredential;
  inspect(): DevCredentialSafeMetadata;
}

/**
 * Construct the auth-only provider. The production path is fixed by
 * getDevCredentialProvider(); storagePath exists solely for isolated local
 * synthetic tests and is never accepted from a command-line secret option.
 */
export function createDevCredentialProvider(storagePath = defaultDevCredentialPath()): DevCredentialProvider {
  const secretPath = assertExternalSecretPath(storagePath);
  return {
    providerType: DEV_CREDENTIAL_PROVIDER_TYPE,
    environment: DEV_CREDENTIAL_ENVIRONMENT,
    accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
    storageClass: DEV_CREDENTIAL_STORAGE_CLASS,
    getDevLoginCredential(): DevLoginCredential {
      const stored = readStoredCredential(secretPath);
      return { username: stored.username, password: stored.password };
    },
    inspect(): DevCredentialSafeMetadata {
      try {
        readStoredCredential(secretPath);
        return {
          configured: true,
          providerType: DEV_CREDENTIAL_PROVIDER_TYPE,
          environment: DEV_CREDENTIAL_ENVIRONMENT,
          accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
          storageClass: DEV_CREDENTIAL_STORAGE_CLASS,
          storagePermissionsValid: true,
        };
      } catch {
        return {
          configured: false,
          providerType: DEV_CREDENTIAL_PROVIDER_TYPE,
          environment: DEV_CREDENTIAL_ENVIRONMENT,
          accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
          storageClass: DEV_CREDENTIAL_STORAGE_CLASS,
          storagePermissionsValid: false,
        };
      }
    },
  };
}

export function getDevCredentialProvider(): DevCredentialProvider {
  return createDevCredentialProvider();
}

export function getDevLoginCredential(): DevLoginCredential {
  return getDevCredentialProvider().getDevLoginCredential();
}

/** Configure only the designated DEV slot; input values never leave this module. */
export function configureDevCredential(username: string, password: string): DevCredentialSafeMetadata {
  if (typeof username !== 'string' || username.trim() === '' || typeof password !== 'string' || password === '') {
    throw new DevCredentialUnavailableError('SECRET_FILE_INVALID');
  }
  const secretPath = defaultDevCredentialPath();
  writeAtomicOwnerOnly(secretPath, {
    schemaVersion: DEV_CREDENTIAL_SCHEMA_VERSION,
    environment: DEV_CREDENTIAL_ENVIRONMENT,
    accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
    username,
    password,
  });
  const provider = getDevCredentialProvider();
  const metadata = provider.inspect();
  if (!metadata.configured || !metadata.storagePermissionsValid) {
    throw new DevCredentialUnavailableError('SECRET_FILE_UNSAFE');
  }
  return metadata;
}
