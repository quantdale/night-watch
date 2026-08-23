// ---------------------------------------------------------------------------
// Phase 16C W6 — launcher opt-in input path safety (bin/phase7-real.mjs).
//
// Exercises ONLY the pre-spawn argument/file validation surface via child
// processes. The real Playwright adapter is never spawned by this suite.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';

const LAUNCHER = path.resolve(__dirname, '..', '..', 'bin', 'phase7-real.mjs');

interface RunResult {
  readonly status: number | null;
  readonly stderr: string;
}

function runLauncher(args: readonly string[]): RunResult {
  const result = spawnSync(process.execPath, [LAUNCHER, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  return {
    status: result.status,
    stderr: `${result.stderr ?? ''}${result.stdout ?? ''}`,
  };
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'phase16c-launcher-'));
}

test.describe('Phase 16C launcher input safety (W6)', () => {
  test('help documents the opt-in portfolio flags and exits clean', () => {
    const result = runLauncher(['--help']);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain('--portfolio-plan=');
    expect(result.stderr).toContain('--portfolio-authorization=');
  });

  test('duplicate or unknown options are rejected', () => {
    expect(runLauncher(['--env=dev', '--env=dev']).status).not.toBe(0);
    const { root } = { root: tempDir() };
    try {
      const plan = path.join(root, 'plan.json');
      fs.writeFileSync(plan, '{}');
      expect(runLauncher([
        '--env=dev', '--prepare-only',
        `--portfolio-plan=${plan}`, '--portfolio-authorization=T', `--portfolio-plan=${plan}`,
      ]).stderr).toContain('only once');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
    expect(runLauncher(['--env=dev', '--prepare-only', '--portfolio']).status).not.toBe(0);
  });

  test('portfolio flags must be supplied together', () => {
    const { root } = { root: tempDir() };
    try {
      const plan = path.join(root, 'plan.json');
      fs.writeFileSync(plan, '{}');
      expect(runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${plan}`]).status).not.toBe(0);
      expect(runLauncher(['--env=dev', '--prepare-only', '--portfolio-authorization=T']).status).not.toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('relative and unreadable plan paths are refused categorically', () => {
    expect(runLauncher([
      '--env=dev', '--prepare-only',
      '--portfolio-plan=relative/plan.json', '--portfolio-authorization=T',
    ]).stderr).toContain('absolute');
    const missing = path.join(os.tmpdir(), 'phase16c-missing-plan.json');
    try { fs.rmSync(missing, { force: true }); } catch { /* absent */ }
    expect(runLauncher([
      '--env=dev', '--prepare-only',
      `--portfolio-plan=${missing}`, '--portfolio-authorization=T',
    ]).stderr).toContain('cannot read');
  });

  test('symlinked plan files are refused', () => {
    const root = tempDir();
    try {
      const real = path.join(root, 'real.json');
      fs.writeFileSync(real, '{}');
      const link = path.join(root, 'link.json');
      fs.symlinkSync(real, link);
      expect(runLauncher([
        '--env=dev', '--prepare-only',
        `--portfolio-plan=${link}`, '--portfolio-authorization=T',
      ]).stderr).toContain('unsafe');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('directory instead of regular file is refused', () => {
    const root = tempDir();
    try {
      expect(runLauncher([
        '--env=dev', '--prepare-only',
        `--portfolio-plan=${root}`, '--portfolio-authorization=T',
      ]).stderr).toContain('unsafe');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('non-dev environments remain rejected with portfolio mode too', () => {
    const root = tempDir();
    try {
      const plan = path.join(root, 'plan.json');
      fs.writeFileSync(plan, '{}');
      expect(runLauncher([
        '--env=production', '--prepare-only',
        `--portfolio-plan=${plan}`, '--portfolio-authorization=T',
      ]).stderr).toContain('--env=dev');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
