// Synthetic-only coverage for the designated DEV credential provider.
// Every value in this file is fake test data and is deleted after each case.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEV_CREDENTIAL_ACCOUNT_ALIAS,
  DEV_CREDENTIAL_ENVIRONMENT,
  DEV_CREDENTIAL_SCHEMA_VERSION,
  DEV_CREDENTIAL_STORAGE_CLASS,
  DEV_CREDENTIAL_PROVIDER_TYPE,
  DevCredentialUnavailableError,
  createDevCredentialProvider,
} from '../../src/auth/devCredentialProvider';

const SYNTHETIC_PASSWORD = 'SYNTHETIC_HIGH_ENTROPY_PASSWORD_7f2a9c1e4d8b6a0';

function tempSecretFile(): { directory: string; file: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-dev-secret-test-'));
  return { directory, file: path.join(directory, 'ripple-dev-designated-account.json') };
}

function writeSyntheticSecret(file: string): void {
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: DEV_CREDENTIAL_SCHEMA_VERSION,
    environment: DEV_CREDENTIAL_ENVIRONMENT,
    accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
    username: 'synthetic-dev-user',
    password: SYNTHETIC_PASSWORD,
  }), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

test.describe('external DEV credential provider', () => {
  test('reads only a strict owner-only external file and exposes safe metadata', () => {
    const { directory, file } = tempSecretFile();
    fs.chmodSync(directory, 0o700);
    writeSyntheticSecret(file);
    try {
      const provider = createDevCredentialProvider(file);
      const credential = provider.getDevLoginCredential();
      expect(credential.username).toBe('synthetic-dev-user');
      expect(credential.password).toBe(SYNTHETIC_PASSWORD);
      expect(provider.inspect()).toEqual({
        configured: true,
        providerType: DEV_CREDENTIAL_PROVIDER_TYPE,
        environment: DEV_CREDENTIAL_ENVIRONMENT,
        accountAlias: DEV_CREDENTIAL_ACCOUNT_ALIAS,
        storageClass: DEV_CREDENTIAL_STORAGE_CLASS,
        storagePermissionsValid: true,
      });
      expect(JSON.stringify(provider.inspect())).not.toContain(SYNTHETIC_PASSWORD);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('rejects group/world-readable files without exposing their contents', () => {
    const { directory, file } = tempSecretFile();
    fs.chmodSync(directory, 0o700);
    writeSyntheticSecret(file);
    fs.chmodSync(file, 0o644);
    try {
      const provider = createDevCredentialProvider(file);
      expect(provider.inspect()).toMatchObject({ configured: false, storagePermissionsValid: false });
      expect(() => provider.getDevLoginCredential()).toThrow(DevCredentialUnavailableError);
      expect(() => provider.getDevLoginCredential()).toThrow('SECRET_FILE_UNSAFE');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('rejects missing and repository-local secret locations', () => {
    const { directory, file } = tempSecretFile();
    try {
      const provider = createDevCredentialProvider(file);
      expect(() => provider.getDevLoginCredential()).toThrow('SECRET_FILE_MISSING');
      expect(() => createDevCredentialProvider(path.join(__dirname, 'ripple-dev-designated-account.json'))).toThrow('SECRET_FILE_UNSAFE');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('configuration CLI has no credential argument path and uses hidden input', () => {
    const cli = fs.readFileSync(path.resolve(__dirname, '..', '..', 'bin', 'auth-configure.mjs'), 'utf8');
    expect(cli).toContain("process.stdin.setRawMode(true)");
    expect(cli).toContain('auth:configure accepts no credential or account arguments');
    expect(cli).not.toMatch(/--password|password=/);
  });
});
