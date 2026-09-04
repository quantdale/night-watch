// `explain` positional-id flag tolerance: flags may precede the id in
// any order without being mistaken for the id itself. Local synthetic
// preview only; no network, no auth, no product contact.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..', '..');

function runExplain(args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'nightwatch-intelligence.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { status: result.status, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

test.describe('explain positional-id flag tolerance', () => {
  test('bare form yields the null-id preview envelope', () => {
    const result = runExplain(['explain', '--json']);
    expect(result.status).toBe(0);
    const document = JSON.parse(result.stdout) as { command?: unknown; requestedId?: unknown; explanation?: unknown };
    expect(document.command).toBe('explain');
    expect(document.requestedId).toBeNull();
  });

  test('flag-first and id-first orders resolve identically', () => {
    const memberId = 'pm:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd';
    const flagFirst = runExplain(['explain', '--json', memberId]);
    const idFirst = runExplain(['explain', memberId, '--json']);
    expect(flagFirst.status).toBe(0);
    expect(idFirst.status).toBe(0);
    const flagDocument = JSON.parse(flagFirst.stdout) as { requestedId?: unknown; explanation?: unknown };
    const idDocument = JSON.parse(idFirst.stdout) as { requestedId?: unknown; explanation?: unknown };
    expect(flagDocument.requestedId).toBe(memberId);
    expect(idDocument).toEqual(flagDocument);
  });

  test('malformed id stays refused', () => {
    const result = runExplain(['explain', '!!bad id!!', '--json']);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('EXPLAIN_ID_UNSAFE');
  });
});
