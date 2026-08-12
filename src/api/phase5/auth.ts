// ---------------------------------------------------------------------------
// Nightwatch Phase 5 — ephemeral API authentication bridge.
//
// The browser storage-state path is validated with the existing Phase 4
// helpers. This module reads the token only to construct an in-memory bearer
// header for the Nightwatch relay; the value is never returned as evidence,
// passed to OOPS, placed in a scenario, or written to disk.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import type { EnvironmentConfig } from '../../core/environment/types';
import {
  inspectStorageStateCookiePageReadability,
  inspectStorageStateKeySemantics,
  validateStorageStateFile,
} from '../../browser/fixtures/storageState';

export interface EphemeralApiAuthMetadata {
  provider: 'phase4-external-storage-state';
  environment: 'dev';
  tokenPresent: boolean;
  tokenPageReadable: boolean;
  authorizationHeaderCreatedInMemory: boolean;
  persisted: false;
  passedToOops: false;
}

export interface EphemeralApiAuthProvider {
  readonly metadata: EphemeralApiAuthMetadata;
  headers(): Readonly<Record<string, string>>;
}

function exactEnvironmentTarget(environment: EnvironmentConfig): URL {
  if (environment.name !== 'dev') throw new Error('API authentication bridge is DEV-only');
  const target = new URL(environment.uiBaseUrl);
  if (target.protocol !== 'https:' || target.username !== '' || target.password !== '' || target.search !== '' || target.hash !== '') {
    throw new Error('API authentication bridge requires the verified HTTPS DEV UI target');
  }
  return target;
}

function readTokenValue(statePath: string, environment: EnvironmentConfig): string {
  const target = exactEnvironmentTarget(environment);
  const validated = validateStorageStateFile(statePath);
  const semantics = inspectStorageStateKeySemantics(validated, {
    authTokenKey: 'mo_access_token',
    apiTypeKey: 'api_type',
    apiTypeExpected: 'dev',
    appTypeKey: 'app_type',
    appTypeExpected: 'alphaus',
  });
  const readability = inspectStorageStateCookiePageReadability(validated, {
    cookieKey: 'mo_access_token',
    appOrigin: target.origin,
    appPath: target.pathname,
  });
  if (!semantics.authTokenPresent || !semantics.authTokenStructurallyNonEmpty || !readability.pageReadable) {
    throw new Error('AUTH_BLOCKED: external DEV storage state is not page-readable and semantically valid');
  }
  const parsed = JSON.parse(fs.readFileSync(validated, 'utf8')) as { cookies?: unknown };
  const cookie = Array.isArray(parsed.cookies)
    ? parsed.cookies.find((item): item is { name?: unknown; value?: unknown } => item !== null && typeof item === 'object' && (item as { name?: unknown }).name === 'mo_access_token')
    : undefined;
  const value = cookie?.value;
  if (typeof value !== 'string' || value.length === 0 || value.length > 16 * 1024 || /[\r\n]/.test(value)) {
    throw new Error('AUTH_BLOCKED: DEV token value is structurally unsafe');
  }
  return value;
}

export function createEphemeralRippleApiAuthProvider(statePath: string, environment: EnvironmentConfig): EphemeralApiAuthProvider {
  const token = readTokenValue(statePath, environment);
  const metadata: EphemeralApiAuthMetadata = {
    provider: 'phase4-external-storage-state',
    environment: 'dev',
    tokenPresent: true,
    tokenPageReadable: true,
    authorizationHeaderCreatedInMemory: true,
    persisted: false,
    passedToOops: false,
  };
  return {
    metadata,
    headers: () => ({ Authorization: `Bearer ${token}` }),
  };
}
