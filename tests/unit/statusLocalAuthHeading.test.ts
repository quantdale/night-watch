// M6 task 7.10 (B-18) — `status:local` renders the authenticated-capability
// entries under their own heading, never under `blockers:`.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-status.mjs');

function render(): readonly string[] {
  const result = spawnSync(process.execPath, [CLI], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    shell: false,
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.split('\n');
}

test.describe('status:local auth heading (7.10)', () => {
  test('auth entries sit under their own heading, before the blockers section', () => {
    const lines = render();
    const authHeading = lines.findIndex((line) => line.startsWith('authenticated-capability:'));
    const blockersHeading = lines.findIndex((line) => line.startsWith('blockers:'));
    expect(authHeading).toBeGreaterThanOrEqual(0);
    expect(blockersHeading).toBeGreaterThan(authHeading);

    const authEntries = lines
      .map((line, index) => ({ line, index }))
      .filter((entry) => entry.line.startsWith('  - auth '));
    expect(authEntries.length).toBeGreaterThan(0);
    for (const entry of authEntries) {
      // Each auth entry is between the auth heading and the blockers heading.
      expect(entry.index).toBeGreaterThan(authHeading);
      expect(entry.index).toBeLessThan(blockersHeading);
    }
    // And no blocker line appears before the blockers heading.
    const blockerEntries = lines.filter((line) => line.startsWith('  - ') && !line.startsWith('  - auth '));
    for (const blocker of blockerEntries) {
      expect(lines.indexOf(blocker)).toBeGreaterThan(blockersHeading);
    }
  });

  test('the blockers count still reports the unresolved blockers', () => {
    const lines = render();
    const blockers = lines.find((line) => line.startsWith('blockers:'));
    expect(blockers).toMatch(/^blockers: \d+$/);
  });
});
