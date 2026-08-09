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
  resolveStorageStatePath,
  isAuthenticatedRun,
} from '../../src/browser/fixtures/storageState';

const NIGHTWATCH_ROOT = path.resolve(__dirname, '..', '..');
const WORKSPACE_ROOT = path.resolve(NIGHTWATCH_ROOT, '..');

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
  fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
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

  test('relative paths are rejected', () => {
    expect(() =>
      validateStorageStateFile('relative/state.json', { nightwatchRoot: NIGHTWATCH_ROOT, workspaceRoot: WORKSPACE_ROOT })
    ).toThrow(/absolute path/);
  });

  test('files inside the Nightwatch repo are rejected', () => {
    const file = path.join(NIGHTWATCH_ROOT, '.tmp-test', 'evil-storage-state.json');
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
    const file = path.join(WORKSPACE_ROOT, 'alphauslabs', 'evil-storage-state.json');
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
});
