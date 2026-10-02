// R5-08 / review-5 task A6.2 — the behavioural half of the shared-parser guard.
//
// Every registered OPERATOR_CLI bin is run in a SCRATCH repository under
// `--help`, `--print-metadata` and an unknown flag. A help/metadata query must
// answer and exit 0 WITHOUT running module work, and an unknown flag must be
// refused (usage / fail-closed exit, never success and never a crash). After the
// whole sweep the scratch tree must be byte-for-byte clean: no bin created or
// changed a file merely because it was asked a question.

import { test, expect } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createScratch } from '../../bin/lib/hardening/mutation-harness.mjs';

const ROOT = path.join(__dirname, '..', '..');
const CONCURRENCY = 8;
const REFUSAL_EXIT_CODES = new Set([2, 3, 4]);
/**
 * Bins whose unknown-flag refusal is known to exit 1 instead of the contract's 2/3/4. Each is a
 * recorded deviation (a follow-up for the parent census), bounded EXACTLY: the entry must still
 * deviate and must still emit its refusal code, so the list can only shrink and never hide a new one.
 */
const KNOWN_EXIT_ONE_REFUSALS: Readonly<Record<string, RegExp>> = {
  'bin/phase23-dev.mjs': /DEV_LANE_PRECONDITION_OPEN/,
  'bin/selfdev-adopt-sandbox.mjs': /SELFDEV_ADOPT_SANDBOX_USAGE_INVALID/,
  'bin/selfdev-promote-canonical.mjs': /SELFDEV_PROMOTE_CANONICAL_USAGE_INVALID/,
  'bin/selfdev-verify.mjs': /SELFDEV_VERIFY_USAGE_INVALID/,
};

interface Outcome { status: number | null; stdout: string; stderr: string }

function invoke(cwd: string, home: string, bin: string, args: string[]): Promise<Outcome> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(cwd, bin), ...args], {
      cwd,
      shell: false,
      env: { PATH: process.env.PATH ?? '', HOME: home },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.on('close', (status) => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
  });
}

async function pool<T>(items: readonly T[], work: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item);
  }));
}

test('every OPERATOR_CLI bin answers --help and --print-metadata, refuses an unknown flag, and leaves a scratch repository untouched', async () => {
  test.setTimeout(600_000);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'operator-cli-surface.v1.json'), 'utf8')) as { bins: Array<{ file: string; disposition: string }> };
  const bins = registry.bins.filter((entry) => entry.disposition === 'OPERATOR_CLI').map((entry) => entry.file);
  expect(bins.length).toBeGreaterThanOrEqual(72);
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean).filter((file) => fs.existsSync(path.join(ROOT, file)));
  const scratch = createScratch(ROOT, files);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-sweep-home-'));
  const failures: string[] = [];
  try {
    await pool(bins, async (bin) => {
      const help = await invoke(scratch, home, bin, ['--help']);
      if (help.status !== 0 || !/usage/i.test(help.stdout)) failures.push(`${bin} --help: exit ${help.status}, stdout ${help.stdout.length} bytes`);
      const meta = await invoke(scratch, home, bin, ['--print-metadata']);
      let entry: unknown = null;
      try { entry = (JSON.parse(meta.stdout) as { entry?: string }).entry; } catch { entry = null; }
      if (meta.status !== 0 || entry !== bin) failures.push(`${bin} --print-metadata: exit ${meta.status}, entry ${String(entry)}`);
      const unknown = await invoke(scratch, home, bin, ['--nw-sweep-unknown-flag']);
      const known = KNOWN_EXIT_ONE_REFUSALS[bin];
      if (known !== undefined) {
        if (unknown.status !== 1 || !known.test(`${unknown.stdout}${unknown.stderr}`)) failures.push(`${bin} --nw-sweep-unknown-flag: the recorded exit-1 deviation is stale (exit ${unknown.status}); remove it from KNOWN_EXIT_ONE_REFUSALS`);
      } else if (unknown.status === null || !REFUSAL_EXIT_CODES.has(unknown.status)) {
        failures.push(`${bin} --nw-sweep-unknown-flag: exit ${unknown.status} (expected a usage/fail-closed refusal)`);
      }
    });
    // The scratch repository must be clean: nothing was created or changed by a question.
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: scratch, encoding: 'utf8' }).trim();
    if (status !== '') failures.push(`the scratch repository is dirty after the sweep:\n${status}`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
  expect(failures).toEqual([]);
});
