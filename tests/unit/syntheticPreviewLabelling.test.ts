// M6 task 7.9 (B-17, NW-AUD-041/042 narrowed) — the Phase 19-21 previews are
// labelled SYNTHETIC PREVIEW, and the measured surfaces are not.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'nightwatch-intelligence.mjs');

let roots: string[] = [];
test.afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots = [];
});

function runCli(args: string[], env: Record<string, string> = {}): Record<string, unknown> {
  const result = spawnSync(process.execPath, [CLI, ...args, '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...env },
    shell: false,
  });
  expect(result.status, result.stderr).toBe(0);
  const stdout = result.stdout.trim();
  const start = stdout.indexOf('{');
  expect(start, stdout.slice(0, 200)).toBeGreaterThanOrEqual(0);
  return JSON.parse(stdout.slice(start)) as Record<string, unknown>;
}

test.describe('synthetic preview labelling (7.9)', () => {
  test('every Phase 19-21 preview is labelled and disclaims measurement', () => {
    for (const command of ['status', 'plan', 'coverage', 'contracts', 'gaps', 'campaign']) {
      const output = runCli([command]);
      expect(output.dataOrigin, command).toBe('SYNTHETIC_PREVIEW');
      expect(output.measured, command).toBe(false);
      expect(output.measuredStateCommand, command).toBe('npm run status:local');
      expect(String(output.previewNote), command).toContain('not a measurement');
    }
  });

  test('the operator explain preview is labelled too', () => {
    const output = runCli(['explain']);
    expect(output.dataOrigin).toBe('SYNTHETIC_PREVIEW');
    expect(output.measured).toBe(false);
  });

  test('the owner-local findings surface is NOT labelled as a synthetic preview', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-preview-label-'));
    roots.push(root);
    const output = runCli(['findings'], { NIGHTWATCH_PRIVATE_STATE_DIR: root });
    expect(output.scope).toBe('OWNER_ONLY_LOCAL');
    expect(output.dataOrigin).toBeUndefined();
    expect(output.measured).toBeUndefined();
    // It is still a MEASURED surface: the count comes from the store.
    expect(typeof output.actionableFindings).toBe('number');
  });

  test('the human-readable header carries the label', () => {
    const result = spawnSync(process.execPath, [CLI, 'plan'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
      shell: false,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.split('\n')[0]).toContain('SYNTHETIC_PREVIEW');
  });
});
