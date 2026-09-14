// Regression for the Phase 2A auth:capture worker/TTY failure.
// The real capture is a parent Node CLI/library flow now. This test proves it
// no longer shells out to Playwright Test or depends on a worker's stdin.
//
// F-21 authenticated-capability lifecycle: the same file also covers the
// non-secret capture sidecar, the one-time adoption path, and the fail-closed
// pre-flight. Every synthetic artefact here is local and contains FAKE values
// only; no real credential file, browser, or network is touched.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  AUTHENTICATED_LANE_DEPENDENCIES,
  AUTH_CAPABILITY_PREFLIGHT_EXEMPT_MANUAL_OWNER_FILES,
  AUTH_CAPABILITY_RECORD_SCHEMA,
  AUTH_CAPABILITY_RECORD_SUFFIX,
  adoptAuthCaptureRecord,
  authLifecycleRecordPath,
  buildAuthCapabilityRecord,
  evaluateAuthCapabilityPreflight,
  writeAuthCaptureRecord,
} from '../../src/auth/capabilityLifecycle';

const root = path.resolve(__dirname, '..', '..');
const AUTH_CAPTURE = path.join(root, 'bin', 'auth-capture.mjs');
const PHASE2C_LAUNCHER = path.join(root, 'bin', 'phase2c-real.mjs');
const DEV_ORIGIN = 'https://appdev.alphaus.cloud';

const COOKIE_VALUE_SENTINEL = 'FAKE_COOKIE_VALUE_SENTINEL_0001';
const TOKEN_VALUE_SENTINEL = 'FAKE_TOKEN_VALUE_SENTINEL_0002';

test('auth:capture is a parent CLI and has no Playwright Test worker path', () => {
  const launcher = fs.readFileSync(path.join(root, 'bin', 'auth-capture.mjs'), 'utf8');
  expect(launcher).toContain('runDirectAuthCapture');
  expect(launcher).toContain('process.stdin.isTTY');
  expect(launcher).toContain("kind: 'human-parent-cli'");
  expect(launcher).not.toContain("'playwright', 'test'");
  expect(launcher).not.toContain('NIGHTWATCH_MANUAL_CAPTURE');
  expect(fs.existsSync(path.join(root, 'tests', 'manual', 'auth-capture.ts'))).toBe(false);
  expect(fs.existsSync(path.join(root, 'playwright.capture.config.ts'))).toBe(false);
});

// ---------------------------------------------------------------------------
// F-21 lifecycle fixtures (synthetic, outside the repository, owner-only).
// ---------------------------------------------------------------------------

interface SyntheticCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly?: boolean;
  secure?: boolean;
}

function lifecycleDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-lifecycle-'));
  fs.chmodSync(directory, 0o700);
  return directory;
}

function syntheticCookie(overrides: Partial<SyntheticCookie> = {}): SyntheticCookie {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    name: 'mo_access_token',
    value: TOKEN_VALUE_SENTINEL,
    domain: 'appdev.alphaus.cloud',
    path: '/',
    expires: nowSeconds + 10 * 60 * 60,
    httpOnly: false,
    secure: true,
    ...overrides,
  };
}

function writeSyntheticArtefact(directory: string, cookies: readonly SyntheticCookie[], name = 'ripple-dev-state.json'): string {
  const artefactPath = path.join(directory, name);
  fs.writeFileSync(artefactPath, JSON.stringify({ cookies: [...cookies], origins: [] }), { mode: 0o600 });
  fs.chmodSync(artefactPath, 0o600);
  return artefactPath;
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

test.describe('authenticated capability lifecycle', () => {
  test('the capture record carries only bounded metadata and never a secret value', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      const written = writeAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        validityWindowMs: 12 * 60 * 60 * 1000,
      });
      expect(written.recordPath).toBe(`${artefactPath}${AUTH_CAPABILITY_RECORD_SUFFIX}`);
      const raw = fs.readFileSync(written.recordPath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(Object.keys(parsed).sort()).toEqual([
        'artefactDigest',
        'captureInstant',
        'earliestCookieExpiry',
        'environment',
        'origin',
        'schemaVersion',
        'validityWindowMs',
      ]);
      expect(parsed.schemaVersion).toBe(AUTH_CAPABILITY_RECORD_SCHEMA);
      expect(parsed.environment).toBe('dev');
      expect(parsed.origin).toBe(DEV_ORIGIN);
      expect(typeof parsed.artefactDigest).toBe('string');
      expect(String(parsed.artefactDigest)).toMatch(/^sha256:[0-9a-f]{24}$/);
      // The record is metadata only: no cookie/token value, header or storage value.
      expect(raw).not.toContain(COOKIE_VALUE_SENTINEL);
      expect(raw).not.toContain(TOKEN_VALUE_SENTINEL);
      expect(raw).not.toContain('value');
      expect(buildAuthCapabilityRecord({ artefactPath, environment: 'dev', origin: DEV_ORIGIN }).artefactDigest).toBe(parsed.artefactDigest);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('an artefact without a record is UNKNOWN_AGE, and the refusal creates no file', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      const before = fs.readdirSync(directory).sort();
      const result = evaluateAuthCapabilityPreflight({ artefactPath, environment: 'dev', targetOrigin: DEV_ORIGIN });
      expect(result.state).toBe('UNKNOWN_AGE');
      expect(result.refusalCode).toBe('AUTH_CAPABILITY_UNKNOWN_AGE');
      expect(result.epistemicClass).toBe('UNKNOWN');
      expect(result.remedy).toContain('npm run auth:capture');
      expect(fs.readdirSync(directory).sort()).toEqual(before);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('adoption is one-time and never re-declares silently', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      const adopted = adoptAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(1),
      });
      expect(adopted.replacedExisting).toBe(false);
      expect(fs.existsSync(authLifecycleRecordPath(artefactPath))).toBe(true);
      expect(() => adoptAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(1),
      })).toThrow('AUTH_LIFECYCLE_RECORD_ALREADY_PRESENT');
      expect(() => adoptAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: undefined as unknown as string,
      })).toThrow('AUTH_CAPABILITY_ADOPTION_CAPTURE_INSTANT_REQUIRED');
      const replaced = adoptAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(2),
        replaceExisting: true,
      });
      expect(replaced.replacedExisting).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('resolves VALID, EXPIRED (window and cookie), WRONG_ENVIRONMENT, UNREADABLE and MISSING distinctly', () => {
    const directory = lifecycleDirectory();
    try {
      const validPath = writeSyntheticArtefact(directory, [syntheticCookie()], 'valid.json');
      writeAuthCaptureRecord({
        artefactPath: validPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(1),
      });
      const valid = evaluateAuthCapabilityPreflight({ artefactPath: validPath, environment: 'dev', targetOrigin: DEV_ORIGIN });
      expect(valid.state).toBe('VALID');
      expect(valid.remainingValidityMs).toBeGreaterThan(0);
      expect(valid.epistemicClass).toBe('FACT');

      const windowExpiredPath = writeSyntheticArtefact(directory, [syntheticCookie()], 'window-expired.json');
      writeAuthCaptureRecord({
        artefactPath: windowExpiredPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(13),
      });
      const windowExpired = evaluateAuthCapabilityPreflight({ artefactPath: windowExpiredPath, environment: 'dev', targetOrigin: DEV_ORIGIN });
      expect(windowExpired.state).toBe('EXPIRED');
      expect(windowExpired.refusalCode).toBe('AUTH_CAPABILITY_EXPIRED');

      const nowSeconds = Math.floor(Date.now() / 1000);
      const cookieExpiredPath = writeSyntheticArtefact(directory, [syntheticCookie({ expires: nowSeconds - 60 })], 'cookie-expired.json');
      writeAuthCaptureRecord({
        artefactPath: cookieExpiredPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(1),
      });
      expect(evaluateAuthCapabilityPreflight({ artefactPath: cookieExpiredPath, environment: 'dev', targetOrigin: DEV_ORIGIN }).state).toBe('EXPIRED');

      const wrongEnvironment = evaluateAuthCapabilityPreflight({ artefactPath: validPath, environment: 'next', targetOrigin: 'https://next.alphaus.cloud' });
      expect(wrongEnvironment.state).toBe('WRONG_ENVIRONMENT');
      expect(wrongEnvironment.refusalDetail).toContain('dev');
      expect(wrongEnvironment.refusalDetail).toContain('next');

      const unreadablePath = writeSyntheticArtefact(directory, [syntheticCookie()], 'unreadable.json');
      fs.writeFileSync(authLifecycleRecordPath(unreadablePath), '{not json', { mode: 0o600 });
      expect(evaluateAuthCapabilityPreflight({ artefactPath: unreadablePath, environment: 'dev', targetOrigin: DEV_ORIGIN }).state).toBe('UNREADABLE');

      const missing = evaluateAuthCapabilityPreflight({
        artefactPath: path.join(directory, 'absent.json'),
        environment: 'dev',
        targetOrigin: DEV_ORIGIN,
      });
      expect(missing.state).toBe('MISSING');
      expect(missing.present).toBe(false);

      // A changed artefact is no longer the one the record describes.
      const changedPath = writeSyntheticArtefact(directory, [syntheticCookie()], 'changed.json');
      writeAuthCaptureRecord({ artefactPath: changedPath, environment: 'dev', origin: DEV_ORIGIN });
      fs.appendFileSync(changedPath, '\n');
      expect(evaluateAuthCapabilityPreflight({ artefactPath: changedPath, environment: 'dev', targetOrigin: DEV_ORIGIN }).state).toBe('UNKNOWN_AGE');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('warns when remaining validity is shorter than the declared campaign budget', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()], 'budget.json');
      writeAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(11),
        validityWindowMs: 12 * 60 * 60 * 1000,
      });
      const result = evaluateAuthCapabilityPreflight({
        artefactPath,
        environment: 'dev',
        targetOrigin: DEV_ORIGIN,
        requiredValidityMs: 6 * 60 * 60 * 1000,
      });
      expect(result.state).toBe('VALID');
      expect(result.budgetWarning).not.toBeNull();
      expect(result.budgetWarning?.remainingValidityMs).toBeLessThan(6 * 60 * 60 * 1000);
      expect(result.budgetWarning?.requiredValidityMs).toBe(6 * 60 * 60 * 1000);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('auth:capture --adopt writes the record without a browser and refuses an unknown capture instant', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      const missingInstant = spawnSync(process.execPath, [
        AUTH_CAPTURE, '--adopt', '--env=dev', `--output=${artefactPath}`,
      ], { encoding: 'utf8', timeout: 60_000 });
      expect(missingInstant.status).toBe(2);
      expect(`${missingInstant.stderr}${missingInstant.stdout}`).toContain('--captured-at');

      const adopted = spawnSync(process.execPath, [
        AUTH_CAPTURE, '--adopt', '--env=dev', `--output=${artefactPath}`,
        `--captured-at=${hoursAgoIso(1)}`,
      ], { encoding: 'utf8', timeout: 60_000 });
      expect(adopted.status).toBe(0);
      expect(`${adopted.stderr}${adopted.stdout}`).not.toContain(TOKEN_VALUE_SENTINEL);
      expect(fs.existsSync(authLifecycleRecordPath(artefactPath))).toBe(true);
      const preflight = evaluateAuthCapabilityPreflight({ artefactPath, environment: 'dev', targetOrigin: DEV_ORIGIN });
      expect(preflight.state).toBe('VALID');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('an authenticated launcher refuses an unknown-age artefact before it can spawn Playwright', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      const noRecord = spawnSync(process.execPath, [
        PHASE2C_LAUNCHER, '--env=dev', `--storage-state=${artefactPath}`,
      ], { encoding: 'utf8', timeout: 120_000 });
      expect(noRecord.status).toBe(3);
      const noRecordOutput = `${noRecord.stderr}${noRecord.stdout}`;
      expect(noRecordOutput).toContain('AUTH_CAPABILITY_UNKNOWN_AGE');
      expect(noRecordOutput).toContain('npm run auth:capture');
      expect(noRecordOutput).not.toContain(TOKEN_VALUE_SENTINEL);

      writeAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(13),
      });
      const expired = spawnSync(process.execPath, [
        PHASE2C_LAUNCHER, '--env=dev', `--storage-state=${artefactPath}`,
      ], { encoding: 'utf8', timeout: 120_000 });
      expect(expired.status).toBe(3);
      expect(`${expired.stderr}${expired.stdout}`).toContain('AUTH_CAPABILITY_EXPIRED');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('observe:preflight reports authentication from metadata only', () => {
    const directory = lifecycleDirectory();
    try {
      const artefactPath = writeSyntheticArtefact(directory, [syntheticCookie()]);
      writeAuthCaptureRecord({
        artefactPath,
        environment: 'dev',
        origin: DEV_ORIGIN,
        captureInstant: hoursAgoIso(1),
      });
      const result = spawnSync(process.execPath, [path.join(root, 'bin', 'observe-preflight.mjs'), '--env=dev'], {
        cwd: root,
        env: { ...process.env, NIGHTWATCH_ENV: 'dev', NIGHTWATCH_STORAGE_STATE: artefactPath },
        encoding: 'utf8',
        timeout: 120_000,
      });
      expect(result.status).toBe(0);
      const report = JSON.parse(String(result.stdout)) as {
        authentication: { entries: { environment: string; state: string; remainingValidityMs: number | null }[] };
        network: string;
      };
      const dev = report.authentication.entries.find((entry) => entry.environment === 'dev');
      expect(dev?.state).toBe('VALID');
      expect(dev?.remainingValidityMs).toBeGreaterThan(0);
      expect(report.network).toContain('no cookie value read');
      expect(String(result.stdout)).not.toContain(TOKEN_VALUE_SENTINEL);
      expect(String(result.stdout)).not.toContain(COOKIE_VALUE_SENTINEL);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('G21.8 — all 12 MANUAL_OWNER files are wired consumers or named exemptions', () => {
    const universe = JSON.parse(fs.readFileSync(path.join(root, 'config/validation-universe.v1.json'), 'utf8')) as {
      classes: { MANUAL_OWNER: { files: string[] } };
    };
    const manual = universe.classes.MANUAL_OWNER.files;
    expect(manual).toHaveLength(12);
    const exempt = AUTH_CAPABILITY_PREFLIGHT_EXEMPT_MANUAL_OWNER_FILES;
    expect(exempt).toHaveLength(2);
    for (const file of exempt) {
      expect(manual, file).toContain(file);
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source, `${file} must not consume owner-capture preflight`).not.toContain('assertAuthCapabilityPreflight(');
      expect(source, `${file} must not consume owner-capture preflight`).not.toContain('requireValidAuthCapability(');
    }
    const wired = manual.filter((file) => !exempt.includes(file));
    expect(wired).toHaveLength(10);
    for (const file of wired) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      expect(source, `${file} must call assertAuthCapabilityPreflight`).toContain('assertAuthCapabilityPreflight(');
    }
    const synthetic = fs.readFileSync(path.join(root, 'tests/manual/auth-capture.synthetic.ts'), 'utf8');
    expect(synthetic).toContain('evaluateAuthCapabilityPreflight');
    expect(synthetic).toContain('AUTH_CAPABILITY_RECORD_SUFFIX');
    const canary = fs.readFileSync(path.join(root, 'tests/manual/phase2a-canary.ts'), 'utf8');
    expect(canary).toContain('canary refuses inherited storage state');
    expect(AUTHENTICATED_LANE_DEPENDENCIES.dev).toContain('MANUAL_OWNER_AUTHENTICATED_10_CHECKS');
    expect(AUTHENTICATED_LANE_DEPENDENCIES.dev).not.toContain('MANUAL_OWNER_12_CHECKS');
  });
});
