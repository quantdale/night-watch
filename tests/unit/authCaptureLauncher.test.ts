// Regression for the Phase 2A auth:capture discovery failure.
// The real manual helper is never executed here; --list only resolves the
// configured target and proves the launcher cannot silently run zero tests.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const playwright = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');

function listCaptureTests(): ReturnType<typeof spawnSync> {
  return spawnSync(
    playwright,
    [
      'test',
      '--config=playwright.capture.config.ts',
      'tests/manual/auth-capture.ts',
      '--project=nightwatch',
      '--list',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        NIGHTWATCH_ENV: 'local',
        NIGHTWATCH_MANUAL_CAPTURE: '',
        NIGHTWATCH_STORAGE_STATE: '',
      },
      encoding: 'utf8',
    }
  );
}

test('auth:capture resolves exactly one intended manual capture test', () => {
  const result = listCaptureTests();
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  expect(result.status, output).toBe(0);
  expect(output).not.toContain('No tests found');
  expect(output).toContain('manual authenticated state capture');
  expect((output.match(/manual authenticated state capture/g) ?? []).length).toBe(1);
});
