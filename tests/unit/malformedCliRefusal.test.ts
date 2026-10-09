// M12 (task 13.1/13.2) — the malformed-CLI attack lane's permanent regression.
//
// Two defects were reproduced on 2026-10-10 and repaired:
//
//   1. The DEV-lane guard (`guardDevLane`) and the phase*-real launchers' own
//      argument validation THREW, so a malformed invocation exited 1 with an
//      uncaught stack trace that printed the checkout's ABSOLUTE path on the
//      operator surface (a B-13 leak) instead of the operator-CLI convention's
//      coded refusal (usage → exit 2, fail-closed policy refusal → exit 3).
//   2. The three selfdev owner-gated bins exited 1 on their own usage refusals
//      (a deviation the help sweep had recorded as a parent-census follow-up).
//
// The pins below are deliberately stronger than the recorded deviations: a
// refusal must be CODED, must exit in the convention's refusal set {2,3,4} or
// 0 for help, and must print NEITHER a stack frame NOR an absolute machine
// path. No fail-closed refusal was weakened — the codes and the messages are
// the authorities' own.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '..', '..');
const REFUSAL_EXITS = new Set([2, 3, 4]);
const UNKNOWN_FLAG = '--nw-malformed-cli-attack-flag';

/** Every DEV-contacting launcher: the guard must refuse cleanly (3) or the shared parser (2). */
const DEV_LAUNCHERS = [
  'bin/phase2b-real.mjs',
  'bin/phase2c-real.mjs',
  'bin/phase4-real.mjs',
  'bin/phase5-real.mjs',
  'bin/phase7-real.mjs',
  'bin/phase9b-real.mjs',
  'bin/phase10b-real.mjs',
  'bin/phase22-real.mjs',
  'bin/phase23-dev.mjs',
  'bin/observe-authenticated.mjs',
  'bin/observe-canary.mjs',
  'bin/observe-gate.mjs',
  'bin/auth-capture.mjs',
];

/** The phase*-real bins whose own argv validation used to throw uncaught. */
const OWN_PARSER_LAUNCHERS = [
  'bin/phase2b-real.mjs',
  'bin/phase2c-real.mjs',
  'bin/phase4-real.mjs',
  'bin/phase5-real.mjs',
  'bin/phase7-real.mjs',
  'bin/phase9b-real.mjs',
  'bin/phase10b-real.mjs',
];

const SELFDEV_BINS = [
  'bin/selfdev-adopt-sandbox.mjs',
  'bin/selfdev-promote-canonical.mjs',
  'bin/selfdev-verify.mjs',
];

interface RunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function run(bin: string, args: readonly string[]): RunResult {
  const result = spawnSync(process.execPath, [path.join(ROOT, bin), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** A refusal must be coded, exit 2/3/4, and print no stack frame or absolute path. */
function expectCleanRefusal(result: RunResult, label: string, codePattern: RegExp): void {
  const output = `${result.stdout}\n${result.stderr}`;
  expect(result.status, `${label}: exit ${String(result.status)}`).not.toBeNull();
  expect(REFUSAL_EXITS.has(result.status ?? -1), `${label}: exit ${String(result.status)} is not a usage/fail-closed refusal`).toBe(true);
  expect(output, `${label}: must emit its refusal code`).toMatch(codePattern);
  // The defect this lane repaired: an uncaught throw printed a stack trace
  // (frames "    at …"), a `file://` module URL, and the checkout's absolute
  // path. A coded refusal must carry none of them.
  expect(result.stderr, `${label}: refusal printed a stack frame`).not.toMatch(/\n\s+at /);
  expect(result.stderr, `${label}: refusal printed a file:// module URL`).not.toContain('file://');
  expect(result.stderr, `${label}: refusal printed an absolute machine path`).not.toContain(ROOT);
  expect(result.stderr, `${label}: refusal printed the operator home directory`).not.toContain(require('node:os').homedir());
  expect(result.stderr, `${label}: refusal printed an internal throw`).not.toMatch(/^(Error|TypeError|ReferenceError):/m);
}

test.describe('M12 13.1 — malformed CLI arguments refuse cleanly everywhere (defect repairs)', () => {
  test('every DEV-contacting launcher refuses an unknown argument with a coded, stack-free refusal', () => {
    for (const launcher of DEV_LAUNCHERS) {
      const result = run(launcher, [UNKNOWN_FLAG]);
      // phase23-dev is DEV-only by construction, so the guard fires first; the
      // others are refused by the shared parser (the guard is not a DEV
      // invocation without --env=dev).
      expectCleanRefusal(result, `${launcher} ${UNKNOWN_FLAG}`, /CLI_UNKNOWN_ARGUMENT|DEV_LANE_PRECONDITION_OPEN/);
    }
  });

  test('a blocked DEV launch is a coded fail-closed refusal (exit 3), never a stack trace', () => {
    const result = run('bin/phase23-dev.mjs', ['--env=dev']);
    expect(result.status).toBe(3);
    expect(result.stderr).toContain('DEV_LANE_PRECONDITION_OPEN');
    expect(result.stderr).toMatch(/NW-AUD-(016|022|025|026|037|038)/);
    expect(result.stderr).not.toMatch(/\n\s+at /);
    expect(result.stderr).not.toContain('file://');
    expect(result.stderr).not.toContain(ROOT);
  });

  test('every own-parser phase launcher refuses a missing required flag as a usage refusal (exit 2)', () => {
    for (const launcher of OWN_PARSER_LAUNCHERS) {
      const result = run(launcher, []);
      expectCleanRefusal(result, `${launcher} (empty argv)`, /requires/);
    }
  });

  test('the selfdev owner-gated bins exit 2 on their own usage refusals', () => {
    for (const bin of SELFDEV_BINS) {
      const result = run(bin, [UNKNOWN_FLAG]);
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status, `${bin} ${UNKNOWN_FLAG}: exit ${String(result.status)}`).toBe(2);
      expect(output).toMatch(/SELFDEV_(ADOPT_SANDBOX|PROMOTE_CANONICAL|VERIFY)_USAGE_INVALID/);
      expect(result.stderr).not.toMatch(/\n\s+at /);
      expect(result.stderr).not.toContain(ROOT);
    }
  });

  test('no OPERATOR_CLI entry prints a stack trace or an absolute path on an unknown flag', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'operator-cli-surface.v1.json'), 'utf8')) as {
      bins: Array<{ file: string; disposition: string }>;
    };
    const bins = registry.bins.filter((entry) => entry.disposition === 'OPERATOR_CLI').map((entry) => entry.file);
    expect(bins.length).toBeGreaterThanOrEqual(72);
    for (const bin of bins) {
      const result = run(bin, [UNKNOWN_FLAG]);
      const label = `${bin} ${UNKNOWN_FLAG}`;
      expect(result.status, `${label}: exit ${String(result.status)}`).not.toBeNull();
      expect(REFUSAL_EXITS.has(result.status ?? -1), `${label}: exit ${String(result.status)} is not a usage/fail-closed refusal`).toBe(true);
      expect(result.stderr, `${label}: refusal printed a stack frame`).not.toMatch(/\n\s+at /);
      expect(result.stderr, `${label}: refusal printed a file:// module URL`).not.toContain('file://');
      expect(result.stderr, `${label}: refusal printed an absolute machine path`).not.toContain(ROOT);
      expect(result.stderr, `${label}: refusal printed the operator home directory`).not.toContain(require('node:os').homedir());
    }
  });
});
