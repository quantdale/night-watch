// ---------------------------------------------------------------------------
// Nightwatch — storage-state secret handling unit tests (Phase 1.1).
//
// Storage state is SECRET MATERIAL: location rules are fail-closed and the
// content shape must match Playwright's schema. Valid files live in an
// external user-owned location (os.tmpdir in tests) — never inside the
// Nightwatch repo or the Alphaus workspace.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  NIGHTWATCH_STORAGE_STATE_VAR,
  validateStorageStateFile,
  validateStorageStateOutputPath,
  atomicallyReplaceValidatedStorageState,
  resolveStorageStatePath,
  isAuthenticatedRun,
  inspectStorageStateKeyPresence,
  inspectStorageStateKeySemantics,
  inspectStorageStateCookiePageReadability,
} from '../../src/browser/fixtures/storageState';
import { inspectRipplePageAuthReadability } from '../../src/browser/fixtures/pageAuthReadability';
import { startFixtureServer } from '../../src/browser/fixtures/fixtureServer';
import { resolveScratchPath } from '../../src/core/workspace/ephemeralLayout';

const NIGHTWATCH_ROOT = path.resolve(__dirname, '..', '..');
/**
 * A SYNTHETIC workspace root, not `path.resolve(NIGHTWATCH_ROOT, '..')`.
 *
 * This suite writes its fixtures into `os.tmpdir()`, and the old derivation
 * made the workspace root "whatever directory contains this checkout". The
 * clean-checkout gate clones into `/tmp/nightwatch-quality-gate-clean-XXXX`,
 * so the workspace root became `/tmp`, every fixture was suddenly "inside the
 * Alphaus workspace", and eight acceptance cases failed — in `gate:clean`
 * only, while passing everywhere the author ever ran them.
 *
 * Containment is lexical, so a path that exists nowhere can never be an
 * ancestor of a fixture. The rejection cases are unaffected: "inside the
 * Nightwatch repo" still uses NIGHTWATCH_ROOT, and "inside the Alphaus
 * workspace" builds its own disposable synthetic root and asserts against
 * that.
 */
const WORKSPACE_ROOT = path.join(path.sep, 'synthetic-alphaus-workspace-root');

/** A valid Playwright storage-state payload with obvious synthetic secrets. */
const FAKE_STATE = {
  cookies: [
    { name: 'nw_session', value: 'FAKE_SESSION_COOKIE_SECRET_999', domain: '127.0.0.1', path: '/' },
  ],
  origins: [
    {
      origin: 'http://127.0.0.1',
      localStorage: [{ name: 'access_token', value: 'FAKE_LOCALSTORAGE_JWT_000' }],
    },
  ],
};

function tmpStateFile(content: unknown = FAKE_STATE, name = 'state.json'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-test-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content), { mode: 0o600 });
  return file;
}

test.describe('storage-state secret handling', () => {
  test('valid external file passes validation and returns the canonical path', () => {
    const file = tmpStateFile();
    try {
      const got = validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT });
      expect(got).toBe(path.resolve(file));
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('missing file fails closed', () => {
    expect(() =>
      validateStorageStateFile('/nonexistent/nw-state.json', { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
    ).toThrow(/missing file/);
  });

  test('symlinked storage files, parent components, and group-readable files fail closed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-storage-boundary-'));
    const realDirectory = path.join(directory, 'real');
    const linkedDirectory = path.join(directory, 'linked');
    fs.mkdirSync(realDirectory, { mode: 0o700 });
    const realFile = path.join(realDirectory, 'state.json');
    fs.writeFileSync(realFile, JSON.stringify(FAKE_STATE), { mode: 0o600 });
    fs.symlinkSync(realDirectory, linkedDirectory, 'dir');
    try {
      expect(() => validateStorageStateFile(path.join(realDirectory, '..', 'linked', 'state.json'), { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/SYMLINK/);
      fs.chmodSync(realFile, 0o640);
      expect(() => validateStorageStateFile(realFile, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/PERMISSIONS_UNSAFE/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('group-readable storage-state parent directories fail closed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-storage-parent-'));
    const file = path.join(directory, 'state.json');
    fs.writeFileSync(file, JSON.stringify(FAKE_STATE), { mode: 0o600 });
    fs.chmodSync(directory, 0o750);
    try {
      expect(() => validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/STORAGE_STATE_PARENT_PERMISSIONS_UNSAFE/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('validated pending state replaces the old capture atomically and keeps owner-only mode', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-atomic-state-'));
    const output = path.join(directory, 'state.json');
    const pending = path.join(directory, '.state.pending.json');
    const oldState = { cookies: [{ name: 'old', value: 'old-value' }], origins: [] };
    const newState = { cookies: [{ name: 'new', value: 'new-value' }], origins: [] };
    fs.writeFileSync(output, JSON.stringify(oldState), { mode: 0o600 });
    fs.writeFileSync(pending, JSON.stringify(newState), { mode: 0o600 });
    try {
      expect(atomicallyReplaceValidatedStorageState(pending, output, { allowExisting: true })).toBe(path.resolve(output));
      expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toEqual(newState);
      expect(fs.statSync(output).mode & 0o077).toBe(0);
      expect(fs.existsSync(pending)).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('invalid pending state leaves the previous capture untouched', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-atomic-state-fail-'));
    const output = path.join(directory, 'state.json');
    const pending = path.join(directory, '.state.pending.json');
    const oldState = { cookies: [{ name: 'old', value: 'old-value' }], origins: [] };
    fs.writeFileSync(output, JSON.stringify(oldState), { mode: 0o600 });
    fs.writeFileSync(pending, JSON.stringify({ cookies: [] }), { mode: 0o600 });
    try {
      expect(() => atomicallyReplaceValidatedStorageState(pending, output, { allowExisting: true })).toThrow();
      expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toEqual(oldState);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('relative paths are rejected', () => {
    expect(() =>
      validateStorageStateFile('relative/state.json', { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
    ).toThrow(/absolute path/);
  });

  test('files inside the Nightwatch repo are rejected', () => {
    const file = path.join(NIGHTWATCH_ROOT, resolveScratchPath('test', 'evil-storage-state.json'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(FAKE_STATE));
    try {
      expect(() =>
        validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
      ).toThrow(/must NOT live inside/);
    } finally {
      fs.rmSync(file, { force: true });
    }
  });

  test('files inside the Alphaus workspace are rejected', () => {
    // C-00: the fixture writes only inside its own disposable directory. A
    // writing agent's worktree lives outside the workspace tree, so deriving
    // the workspace root from this checkout's location would create stray
    // directories in owner-local state.
    const syntheticWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-workspace-root-'));
    const file = path.join(syntheticWorkspace, 'alphauslabs', 'evil-storage-state.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(FAKE_STATE));
    try {
      expect(() =>
        validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: syntheticWorkspace })
      ).toThrow(/must NOT live inside/);
    } finally {
      fs.rmSync(syntheticWorkspace, { recursive: true, force: true });
    }
  });

  test('non-JSON content fails closed', () => {
    const file = tmpStateFile('this is not json {');
    try {
      expect(() =>
        validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
      ).toThrow(/not valid JSON/);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('non-storage-state shapes fail closed', () => {
    for (const bad of [{}, { cookies: [] }, { origins: [] }, { cookies: 'x', origins: [] }, [1, 2]]) {
      const file = tmpStateFile(bad);
      try {
        expect(() =>
          validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
        ).toThrow(/storage-state shape|JSON object/);
      } finally {
        fs.rmSync(path.dirname(file), { recursive: true, force: true });
      }
    }
  });

  test('oversized files are rejected', () => {
    const file = tmpStateFile('x'.repeat(6 * 1024 * 1024));
    try {
      expect(() =>
        validateStorageStateFile(file, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
      ).toThrow(/exceeds/);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('unset environment variable resolves to null (unauthenticated mode)', () => {
    const prev = process.env[NIGHTWATCH_STORAGE_STATE_VAR];
    delete process.env[NIGHTWATCH_STORAGE_STATE_VAR];
    try {
      expect(resolveStorageStatePath()).toBeNull();
      expect(isAuthenticatedRun(null)).toBe(false);
    } finally {
      if (prev !== undefined) process.env[NIGHTWATCH_STORAGE_STATE_VAR] = prev;
    }
  });

  test('set environment variable resolves through full validation', () => {
    const file = tmpStateFile();
    const prev = process.env[NIGHTWATCH_STORAGE_STATE_VAR];
    process.env[NIGHTWATCH_STORAGE_STATE_VAR] = file;
    try {
      const got = resolveStorageStatePath();
      expect(got).toBe(path.resolve(file));
      expect(isAuthenticatedRun(got)).toBe(true);
    } finally {
      if (prev !== undefined) process.env[NIGHTWATCH_STORAGE_STATE_VAR] = prev;
      else delete process.env[NIGHTWATCH_STORAGE_STATE_VAR];
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('source-defined presence inspection returns booleans and never values', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_REALISTIC_TOKEN_SHOULD_NOT_ESCAPE', domain: '127.0.0.1', path: '/' },
        { name: 'api_type', value: 'dev', domain: '127.0.0.1', path: '/' },
      ],
      origins: [{ origin: 'http://127.0.0.1', localStorage: [{ name: 'secret-key', value: 'FAKE_LOCAL_SECRET' }] }],
    });
    try {
      const presence = inspectStorageStateKeyPresence(file, {
        cookie: ['mo_access_token', 'api_type', 'app_type'],
        localStorage: ['secret-key'],
      });
      expect(presence).toEqual({
        cookieNames: { mo_access_token: true, api_type: true, app_type: false },
        localStorageNames: { 'secret-key': true },
        originCount: 1,
      });
      expect(JSON.stringify(presence)).not.toContain('FAKE_REALISTIC_TOKEN_SHOULD_NOT_ESCAPE');
      expect(JSON.stringify(presence)).not.toContain('FAKE_LOCAL_SECRET');
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('semantic inspection returns booleans only and never leaks cookie values', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_REALISTIC_TOKEN_SHOULD_NOT_ESCAPE', domain: '127.0.0.1', path: '/' },
        { name: 'api_type', value: 'dev', domain: '127.0.0.1', path: '/' },
        { name: 'app_type', value: 'alphaus', domain: '127.0.0.1', path: '/' },
      ],
      origins: [],
    });
    try {
      const semantics = inspectStorageStateKeySemantics(file, {
        authTokenKey: 'mo_access_token',
        apiTypeKey: 'api_type',
        apiTypeExpected: 'dev',
        appTypeKey: 'app_type',
        appTypeExpected: 'alphaus',
      });
      expect(semantics).toEqual({
        authTokenPresent: true,
        authTokenStructurallyNonEmpty: true,
        apiTypePresent: true,
        apiTypeExpectedValue: 'dev',
        apiTypeMatchesExpected: true,
        appTypePresent: true,
        appTypeExpectedValue: 'alphaus',
        appTypeMatchesExpected: true,
      });
      expect(JSON.stringify(semantics)).not.toContain('FAKE_REALISTIC_TOKEN_SHOULD_NOT_ESCAPE');
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('semantic inspection: token present but empty, and mismatched env types, are INVALID', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: '', domain: '127.0.0.1', path: '/' },
        { name: 'api_type', value: 'next', domain: '127.0.0.1', path: '/' },
        { name: 'app_type', value: 'other', domain: '127.0.0.1', path: '/' },
      ],
      origins: [],
    });
    try {
      const semantics = inspectStorageStateKeySemantics(file, {
        authTokenKey: 'mo_access_token',
        apiTypeKey: 'api_type',
        apiTypeExpected: 'dev',
        appTypeKey: 'app_type',
        appTypeExpected: 'alphaus',
      });
      expect(semantics.authTokenStructurallyNonEmpty).toBe(false);
      expect(semantics.apiTypeMatchesExpected).toBe(false);
      expect(semantics.appTypeMatchesExpected).toBe(false);
      expect(JSON.stringify(semantics)).not.toContain('next');
      expect(JSON.stringify(semantics)).not.toContain('other');
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('semantic inspection: absent env cookies permit bootstrap validity with source fallback', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_TOKEN_ABC', domain: '127.0.0.1', path: '/' },
      ],
      origins: [],
    });
    try {
      const semantics = inspectStorageStateKeySemantics(file, {
        authTokenKey: 'mo_access_token',
        apiTypeKey: 'api_type',
        apiTypeExpected: 'dev',
        appTypeKey: 'app_type',
        appTypeExpected: 'alphaus',
      });
      expect(semantics.authTokenPresent).toBe(true);
      expect(semantics.authTokenStructurallyNonEmpty).toBe(true);
      expect(semantics.apiTypePresent).toBe(false);
      expect(semantics.appTypePresent).toBe(false);
      // Match the runner's aggregate rule: absent env cookies leave the env
      // clauses vacuously true, but only a present token yields VALID.
      const valid = semantics.authTokenPresent && (!semantics.apiTypePresent || semantics.apiTypeMatchesExpected) && (!semantics.appTypePresent || semantics.appTypeMatchesExpected);
      expect(valid).toBe(true);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('capture output requires an external absolute non-existing JSON path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-output-'));
    try {
      const output = path.join(dir, 'ripple-dev-state.json');
      expect(validateStorageStateOutputPath(output, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toBe(output);
      fs.writeFileSync(output, '{}');
      expect(() => validateStorageStateOutputPath(output, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/already exists/);
      expect(() => validateStorageStateOutputPath('relative.json', { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/absolute path/);
      expect(() => validateStorageStateOutputPath(path.join(NIGHTWATCH_ROOT, 'captured.json'), { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/outside/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('capture output rejects a destination symlink and an unsafe parent', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-auth-output-boundary-'));
    const target = path.join(directory, 'target.json');
    const destination = path.join(directory, 'state.json');
    fs.writeFileSync(target, JSON.stringify(FAKE_STATE), { mode: 0o600 });
    fs.symlinkSync(target, destination);
    try {
      expect(() => validateStorageStateOutputPath(destination, { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT, allowExisting: true })).toThrow(/SYMLINK/);
      fs.unlinkSync(destination);
      fs.chmodSync(directory, 0o755);
      expect(() => validateStorageStateOutputPath(path.join(directory, 'new.json'), { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })).toThrow(/group\/world accessible/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  test('page-readability: live applicable non-httpOnly cookie is readable', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'appdev.alphaus.cloud', path: '/ripple/', httpOnly: false, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 86400 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.present).toBe(true);
      expect(r.domainApplicable).toBe(true);
      expect(r.pathApplicable).toBe(true);
      expect(r.httpOnly).toBe(false);
      expect(r.expired).toBe(false);
      expect(r.pageReadable).toBe(true);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: expired applicable non-httpOnly cookie is NOT readable (the stale-capture case)', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'appdev.alphaus.cloud', path: '/ripple/', httpOnly: false, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) - 86400 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.present).toBe(true);
      expect(r.domainApplicable).toBe(true);
      expect(r.pathApplicable).toBe(true);
      expect(r.expired).toBe(true);
      expect(r.pageReadable).toBe(false);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: httpOnly cookie is NOT readable by page JS', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'appdev.alphaus.cloud', path: '/ripple/', httpOnly: true, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 86400 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.httpOnly).toBe(true);
      expect(r.pageReadable).toBe(false);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: path mismatch makes the cookie not readable', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'appdev.alphaus.cloud', path: '/other/', httpOnly: false, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 86400 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.pathApplicable).toBe(false);
      expect(r.pageReadable).toBe(false);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: session cookie (expires -1) counts as unexpired and readable', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'appdev.alphaus.cloud', path: '/ripple/', httpOnly: false, secure: false, sameSite: 'Lax', expires: -1 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.expired).toBe(false);
      expect(r.pageReadable).toBe(true);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: parent-domain cookie covers the app host', () => {
    const file = tmpStateFile({
      cookies: [
        { name: 'mo_access_token', value: 'FAKE_VAL_SHOULD_NOT_LEAK', domain: 'alphaus.cloud', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + 86400 },
      ],
      origins: [],
    });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.domainApplicable).toBe(true);
      expect(r.pathApplicable).toBe(true);
      expect(r.pageReadable).toBe(true);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: absent cookie reports not present and not readable', () => {
    const file = tmpStateFile({ cookies: [], origins: [] });
    try {
      const r = inspectStorageStateCookiePageReadability(file, { cookieKey: 'mo_access_token', appOrigin: 'https://appdev.alphaus.cloud', appPath: '/ripple/' });
      expect(r.present).toBe(false);
      expect(r.pageReadable).toBe(false);
    } finally {
      fs.rmSync(path.dirname(file), { recursive: true, force: true });
    }
  });

  test('page-readability: live browser document.cookie distinguishes fresh and expired cookies', async ({ browser }) => {
    const server = await startFixtureServer('good');
    const now = Math.floor(Date.now() / 1000);
    const liveContext = await browser.newContext({
      storageState: {
        cookies: [
          { name: 'mo_access_token', value: 'FAKE_LIVE_TOKEN', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now + 86_400 },
          { name: 'api_type', value: 'dev', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now + 86_400 },
          { name: 'app_type', value: 'alphaus', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now + 86_400 },
        ],
        origins: [],
      },
    });
    const expiredContext = await browser.newContext({
      storageState: {
        cookies: [
          { name: 'mo_access_token', value: 'FAKE_EXPIRED_TOKEN', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now - 86_400 },
          { name: 'api_type', value: 'dev', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now + 86_400 },
          { name: 'app_type', value: 'alphaus', domain: '127.0.0.1', path: '/', httpOnly: false, secure: false, sameSite: 'Lax', expires: now + 86_400 },
        ],
        origins: [],
      },
    });
    try {
      const livePage = await liveContext.newPage();
      await livePage.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const live = await inspectRipplePageAuthReadability(livePage);
      expect(live).toMatchObject({
        evaluationSucceeded: true,
        tokenPageReadable: true,
        tokenNonEmpty: true,
        apiTypePageVisible: true,
        apiTypeMatchesDev: true,
        appTypePageVisible: true,
        appTypeMatchesRipple: true,
        aggregatePageBootstrapSemantics: 'VALID',
        basis: 'page-javascript-document-cookie',
      });

      const expiredPage = await expiredContext.newPage();
      await expiredPage.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      const expired = await inspectRipplePageAuthReadability(expiredPage);
      expect(expired).toMatchObject({
        evaluationSucceeded: true,
        tokenPageReadable: false,
        tokenNonEmpty: false,
        apiTypePageVisible: true,
        apiTypeMatchesDev: true,
        appTypePageVisible: true,
        appTypeMatchesRipple: true,
        aggregatePageBootstrapSemantics: 'INVALID',
        basis: 'page-javascript-document-cookie',
      });
      const serialized = JSON.stringify({ live, expired });
      expect(serialized).not.toContain('FAKE_LIVE_TOKEN');
      expect(serialized).not.toContain('FAKE_EXPIRED_TOKEN');
    } finally {
      await liveContext.close();
      await expiredContext.close();
      await server.close();
    }
  });
});
