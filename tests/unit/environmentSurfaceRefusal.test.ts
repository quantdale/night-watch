// M12 (task 13.1/13.2) — the environment-surface attack lane's permanent
// regression.
//
// Two defects were reproduced on 2026-10-10 and repaired:
//
//   1. `bin/nightwatch-agent.mjs status` let the startup assertion's
//      EnvironmentSurfaceError escape: exit 1 with a stack trace carrying the
//      checkout's ABSOLUTE path, instead of the coded fail-closed refusal
//      (exit 3) the `test`/`campaign` branches already had.
//   2. A malformed / unknown / duplicate / unreadable repository `.env` layer
//      threw an uncaught DotEnvLoadError from `nightwatch.mjs` (both the
//      `config` view and the startup path) and was flattened by the Control
//      Center's outer catch to the generic CONTROL_CENTER_START_FAILED. The
//      authority's own DOTENV_* code names the refusal; it now reaches the
//      operator as a clean coded refusal (exit 3), never a stack trace.
//
// This file writes a transient repository-root `.env`, so it is declared
// SERIAL_REQUIRED: no other unit file may observe the layer while it exists.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '..', '..');
const DOTENV_FILE = path.join(ROOT, '.env');

interface RunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function run(bin: string, args: readonly string[], env: Record<string, string | undefined>): RunResult {
  const result = spawnSync(process.execPath, [path.join(ROOT, bin), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, ...env },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/** No refusal may print a stack frame or an absolute machine path. */
function expectCleanSurface(result: RunResult, label: string): void {
  expect(result.stderr, `${label}: refusal printed a stack frame`).not.toMatch(/\n\s+at /);
  expect(result.stderr, `${label}: refusal printed a file:// module URL`).not.toContain('file://');
  expect(result.stderr, `${label}: refusal printed an absolute machine path`).not.toContain(ROOT);
  expect(result.stderr, `${label}: refusal printed the operator home directory`).not.toContain(os.homedir());
}

function withDotEnv(content: string | null, fn: () => void): void {
  if (content === null) {
    if (fs.existsSync(DOTENV_FILE)) fs.rmSync(DOTENV_FILE, { force: true });
    try {
      fn();
    } finally {
      if (fs.existsSync(DOTENV_FILE)) fs.rmSync(DOTENV_FILE, { force: true });
    }
    return;
  }
  fs.writeFileSync(DOTENV_FILE, content);
  try {
    fn();
  } finally {
    fs.rmSync(DOTENV_FILE, { force: true });
  }
}

test.describe('M12 13.1 — the environment surface refuses cleanly (defect repairs)', () => {
  test('an undeclared NIGHTWATCH_* name is reported unknown, never silently accepted', () => {
    const result = run('bin/nightwatch.mjs', ['config'], { NIGHTWATCH_DEFINITELY_NOT_DECLARED: '1' });
    expect(result.stderr).toContain('ENVIRONMENT_VARIABLE_UNKNOWN');
    expect(result.stderr).toContain('NIGHTWATCH_DEFINITELY_NOT_DECLARED');
    expectCleanSurface(result, 'unknown process variable');
  });

  test('a malformed declared value refuses every launcher as a coded fail-closed refusal', () => {
    const malformed = { NIGHTWATCH_GATE_ENVIRONMENT: 'BOGUS' };
    // The `config` view is the diagnostic surface: it REPORTS the refusal and
    // still renders, so the assertion there is the report itself.
    const config = run('bin/nightwatch.mjs', ['config'], malformed);
    expect(config.stderr).toContain('ENVIRONMENT_VALUE_MALFORMED');
    expectCleanSurface(config, 'nightwatch config malformed declared value');
    // Every launch path refuses.
    const agentStatus = run('bin/nightwatch-agent.mjs', ['status'], malformed);
    expect(agentStatus.status, `nightwatch-agent status: exit ${String(agentStatus.status)}`).toBe(3);
    expect(`${agentStatus.stdout}\n${agentStatus.stderr}`).toContain('ENVIRONMENT_VALUE_MALFORMED');
    expectCleanSurface(agentStatus, 'nightwatch-agent status malformed declared value');
    const dispatch = run('bin/nightwatch.mjs', ['--env=local'], malformed);
    expect(dispatch.status).toBe(3);
    expect(dispatch.stderr).toContain('ENVIRONMENT_VALUE_MALFORMED');
    expectCleanSurface(dispatch, 'nightwatch dispatch malformed declared value');
  });

  test('every .env failure mode refuses every launcher with the authority code, never a stack trace', () => {
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      ['an undeclared key', 'NIGHTWATCH_NOT_A_DECLARED_KEY=1\n', 'DOTENV_KEY_UNKNOWN'],
      ['a malformed line', 'this is not a key value line\n', 'DOTENV_LINE_MALFORMED'],
      ['a duplicate key', 'NIGHTWATCH_HEADED=1\nNIGHTWATCH_HEADED=0\n', 'DOTENV_KEY_DUPLICATE'],
    ];
    for (const [label, content, code] of cases) {
      withDotEnv(content, () => {
        for (const bin of ['bin/nightwatch.mjs', 'bin/nightwatch-agent.mjs']) {
          const result = run(bin, bin === 'bin/nightwatch.mjs' ? ['config'] : ['status'], {});
          const output = `${result.stdout}\n${result.stderr}`;
          expect(result.status, `${bin} (${label}): exit ${String(result.status)}`).toBe(3);
          expect(output, `${bin} (${label}) must name the authority code`).toContain(code);
          expectCleanSurface(result, `${bin} (${label})`);
        }
      });
    }
  });

  test('an unreadable .env layer refuses with DOTENV_UNREADABLE and the Control Center keeps its coded refusal', () => {
    withDotEnv(null, () => {
      fs.mkdirSync(DOTENV_FILE);
      try {
        for (const bin of ['bin/nightwatch.mjs', 'bin/nightwatch-agent.mjs']) {
          const result = run(bin, bin === 'bin/nightwatch.mjs' ? ['config'] : ['status'], {});
          expect(result.status, `${bin}: exit ${String(result.status)}`).toBe(3);
          expect(`${result.stdout}\n${result.stderr}`).toContain('DOTENV_UNREADABLE');
          expectCleanSurface(result, `${bin} unreadable .env`);
        }
        const control = run('bin/nightwatch-control-center.mjs', [], {});
        expect(control.status).not.toBe(0);
        expect(control.stderr).toContain('CONTROL_CENTER_ENVIRONMENT_CONFIGURATION_REFUSED');
        // M12 (13.1): the specific authority code reaches the operator too; the
        // outer allowlisted echo alone used to flatten it to START_FAILED.
        expect(control.stderr).toContain('DOTENV_UNREADABLE');
        expectCleanSurface(control, 'control center unreadable .env');
      } finally {
        fs.rmdirSync(DOTENV_FILE);
      }
    });
  });

  test('the happy path still renders the effective configuration without a .env layer', () => {
    withDotEnv(null, () => {
      const result = run('bin/nightwatch.mjs', ['config'], {});
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('NIGHTWATCH effective configuration');
      expect(result.stdout).not.toContain('ENVIRONMENT_VARIABLE_UNKNOWN');
    });
  });
});
