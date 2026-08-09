// Regression for the Phase 2A auth:capture worker/TTY failure.
// The real capture is a parent Node CLI/library flow now. This test proves it
// no longer shells out to Playwright Test or depends on a worker's stdin.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

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
