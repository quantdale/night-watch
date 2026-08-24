import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();

test.describe('Phase 25 local source operator boundary', () => {
  test('rejects environment execution flags before loading source or product modules', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/nightwatch-intelligence.mjs'), 'surfaces', '--env=dev', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('never accept environment execution');
    expect(result.stderr).not.toContain('Bearer');
    expect(result.stderr).not.toContain('CUSTOMER');
  });
});
