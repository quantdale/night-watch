import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  countDiagnosticSilencingAnnotations,
  judgeRatchet,
} from '../../bin/lib/typecheck-ratchet.mjs';
import type { RatchetConfig } from '../../bin/lib/typecheck-ratchet.mjs';

const ROOT = path.resolve(__dirname, '../..');
const BIN_TYPECHECK = path.join(ROOT, 'bin', 'bin-typecheck.mjs');

/**
 * A disposable copy of the lane's own inputs. The lane derives ROOT from its
 * own file location, so a probe copies `bin/` and `config/` into a synthetic
 * root where `tsconfig.bin.json` is under the test's control while the
 * committed repository is never mutated.
 */
function makeSandbox(): { cwd: string; lane: string; tsconfig: string } {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-bintc-'));
  fs.cpSync(path.join(ROOT, 'bin'), path.join(cwd, 'bin'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'config'), path.join(cwd, 'config'), { recursive: true });
  // The lane imports `typescript` through bin/lib/cli-implementation-contract.mjs,
  // so the synthetic root needs the real dependency tree. A symlink is enough:
  // the lane never writes through it.
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(cwd, 'node_modules'), 'dir');
  return { cwd, lane: path.join(cwd, 'bin', 'bin-typecheck.mjs'), tsconfig: path.join(cwd, 'tsconfig.bin.json') };
}

function writeTsconfig(tsconfig: string, include: string[]) {
  fs.writeFileSync(tsconfig, `${JSON.stringify({ include }, null, 2)}\n`);
}

function probeJson(sandbox: { cwd: string; lane: string }, args: string[]) {
  const result = spawnSync(process.execPath, [sandbox.lane, ...args], {
    cwd: sandbox.cwd,
    encoding: 'utf8',
    timeout: 180_000,
  });
  let parsed: { result?: string; hardErrors?: { code: string }[] } | null = null;
  try {
    parsed = JSON.parse(String(result.stdout));
  } catch {
    parsed = null;
  }
  return { result, parsed };
}

function codes(parsed: { hardErrors?: { code: string }[] } | null): string[] {
  return (parsed?.hardErrors ?? []).map((error) => error.code);
}

function shadowedCodes(parsed: { hardErrors?: { code: string }[] } | null): string[] {
  return codes(parsed).filter((code) => code === 'BIN_TYPECHECK_DECLARATION_SHADOWED');
}

test.describe('bin type-check lane structural completeness', () => {
  test('refuses an include that would let a declaration shadow its implementation', () => {
    // Regression: `tsconfig.bin.json` used to include `bin/**/*.d.mts` as well
    // as `bin/**/*.mjs`. TypeScript then treated each hand-written declaration
    // as its module's authoritative type and DROPPED the counted
    // implementation from the program, so 53 bin implementations - 30 of them
    // carrying 952 real diagnostics - were never checked while the lane
    // reported a clean number for them.
    const sandbox = makeSandbox();
    writeTsconfig(sandbox.tsconfig, ['bin/**/*.mjs', 'bin/**/*.d.mts']);
    const { result, parsed } = probeJson(sandbox, ['--config-check', '--json']);
    expect(result.status).toBe(1);
    expect(parsed?.result).toBe('FAIL');
    expect(shadowedCodes(parsed)).toContain('BIN_TYPECHECK_DECLARATION_SHADOWED');
    fs.rmSync(sandbox.cwd, { recursive: true, force: true });
  });

  test('refuses a broad include that sweeps declarations into the program', () => {
    const sandbox = makeSandbox();
    writeTsconfig(sandbox.tsconfig, ['bin/**/*']);
    const { result, parsed } = probeJson(sandbox, ['--config-check', '--json']);
    expect(result.status).toBe(1);
    expect(shadowedCodes(parsed)).toContain('BIN_TYPECHECK_DECLARATION_SHADOWED');
    fs.rmSync(sandbox.cwd, { recursive: true, force: true });
  });

  test('the implementation-only include the committed tsconfig uses is accepted', () => {
    const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.bin.json'), 'utf8')) as { include: string[] };
    const sandbox = makeSandbox();
    writeTsconfig(sandbox.tsconfig, committed.include);
    const { result, parsed } = probeJson(sandbox, ['--config-check', '--json']);
    expect(shadowedCodes(parsed)).toEqual([]);
    // A synthetic root carrying the committed include set reports clean: the
    // same inputs the real repository uses produce no hard error at all.
    expect(codes(parsed)).toEqual([]);
    expect(parsed?.result).toBe('PASS');
    expect(result.status).toBe(0);
    fs.rmSync(sandbox.cwd, { recursive: true, force: true });
  });

  test('the committed tsconfig.bin.json include cannot shadow a bin implementation', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.bin.json'), 'utf8')) as { include?: unknown };
    expect(Array.isArray(tsconfig.include)).toBe(true);
    const patterns = (tsconfig.include ?? []) as unknown[];
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(typeof pattern).toBe('string');
      expect(/\.d\.mts$/.test(String(pattern))).toBe(false);
      expect(['bin', 'bin/**', 'bin/**/*']).not.toContain(String(pattern));
    }
  });

  test('a clean tsc run is a judgement, never a toolchain failure', () => {
    // Regression: `runTsc` used to treat an EMPTY tsc output as
    // BIN_TYPECHECK_TOOLCHAIN_UNAVAILABLE. tsc prints nothing when a surface is
    // clean and exits 0, so that branch inverted the success case into a
    // fail-closed refusal and the first fully clean surface would have been
    // reported as a missing toolchain.
    const result = spawnSync(process.execPath, [BIN_TYPECHECK, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 600_000,
    });
    const report = JSON.parse(String(result.stdout)) as {
      result: string;
      mode: string;
      typeErrorDiagnostics: number;
      conformingBins: number;
      totalBins: number;
      exemptions: string[];
      hardErrors: { code: string }[];
    };
    expect(report.hardErrors.map((error) => error.code)).not.toContain('BIN_TYPECHECK_TOOLCHAIN_UNAVAILABLE');
    expect(report.typeErrorDiagnostics).toBe(0);
    expect(report.mode).toBe('BLOCKING');
    expect(report.exemptions).toEqual([]);
    expect(report.conformingBins).toBe(report.totalBins);
    expect(report.result).toBe('PASS');
    expect(result.status).toBe(0);
  });
});

test.describe('bin type-check ratchet', () => {
  function ratchet(
    perFile: Record<string, number>,
    ceilings: Record<string, number>,
    totalCeiling: number | null,
    annotations: number,
    anyAnnotationBudget: number | null,
  ) {
    const config: RatchetConfig = {
      perFile: new Map(Object.entries(ceilings)),
      totalCeiling,
      anyAnnotationBudget,
    };
    return judgeRatchet({ perFile: new Map(Object.entries(perFile)), annotations, config });
  }

  test('a multi-line JSDoc object type is counted as a widening annotation', () => {
    // The detector's `[^}]*` spans newlines, so the ` * ` continuation prefixes
    // of a multi-line JSDoc type land inside the braces and read as the `*`
    // wildcard. That is why every object shape in bin/ is single line, and why
    // the whole-surface count can be zero.
    const sources = [
      { file: 'bin/a.mjs', source: '/**\n * @param {{\n *   a: string,\n *   b: number\n * }} opts\n */\nfunction f(opts) {}\n' },
      { file: 'bin/b.mjs', source: '/** @param {{ a: string, b: number }} opts */\nfunction f(opts) {}\n' },
    ];
    expect(countDiagnosticSilencingAnnotations(sources)).toBe(1);
  });

  test('the committed lane is BLOCKING with no exemption, ceiling or widening annotation', () => {
    const lane = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'bin-typecheck.v1.json'), 'utf8')) as {
      mode: string;
      exemptions: unknown[];
      perFileCeilings: unknown[];
      totalCeiling: number;
      anyAnnotationBudget: number;
    };
    expect(lane.mode).toBe('BLOCKING');
    expect(lane.exemptions).toEqual([]);
    expect(lane.perFileCeilings).toEqual([]);
    expect(lane.totalCeiling).toBe(0);
    expect(lane.anyAnnotationBudget).toBe(0);
  });
});
