#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Review-operations scale measurement (local-only).
//
// Compiles the probe fresh to a disposable directory, then runs ONE FRESH OS
// PROCESS PER STORE SIZE. A single process walking the sizes would let the
// first cell's warm JIT and settled heap flatter every later one, and the
// peak-RSS number would be meaningless.
//
// It measures. It makes no pass/fail claim beyond the probe completing, and
// the numbers it prints are evidence about THIS machine — not a platform
// guarantee.
//
// Usage: node bin/review-operations-scale.mjs [sizes] [--json]
// Default sizes: 10000,25000,50000
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let sizes = [10_000, 25_000, 50_000];
  let json = false;
  for (const argument of argv) {
    if (argument === '--json') json = true;
    else if (/^[0-9,]+$/.test(argument)) sizes = argument.split(',').filter(Boolean).map((value) => Number.parseInt(value, 10));
    else throw new Error(`unknown argument ${argument}`);
  }
  if (sizes.some((size) => !Number.isInteger(size) || size < 100 || size > 200_000)) throw new Error('sizes must be 100..200000');
  return { sizes, json };
}

function compileProbe() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-review-ops-scale-'));
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  const compiled = spawnSync(
    tsc,
    [
      'tests/unit/reviewOperationsScaleProbe.ts',
      '--outDir', outDir,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--strict', '--skipLibCheck', '--esModuleInterop',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 240_000 },
  );
  if (compiled.status !== 0) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw new Error(`probe compilation failed: ${(compiled.stderr || compiled.stdout || '').slice(0, 800)}`);
  }
  const entry = [
    path.join(outDir, 'tests', 'unit', 'reviewOperationsScaleProbe.js'),
    path.join(outDir, 'reviewOperationsScaleProbe.js'),
  ].find((candidate) => fs.existsSync(candidate));
  if (entry === undefined) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw new Error('compiled probe entry not found');
  }
  return { outDir, entry };
}

function mib(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`[review-ops:scale] usage: node bin/review-operations-scale.mjs [sizes] [--json] (${error.message})\n`);
  process.exit(1);
}

let probe;
try {
  probe = compileProbe();
} catch (error) {
  process.stderr.write(`[review-ops:scale] FAIL: ${error instanceof Error ? error.message : 'compilation error'}\n`);
  process.exit(1);
}

const cells = [];
let failed = false;
try {
  for (const size of options.sizes) {
    const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local' });
    environment.TZ = 'UTC';
    environment.LC_ALL = 'C';
    environment.NO_COLOR = '1';
    const result = spawnSync(process.execPath, [probe.entry, String(size)], {
      cwd: root,
      encoding: 'utf8',
      env: environment,
      timeout: 1_800_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (result.status !== 0) {
      failed = true;
      process.stderr.write(`[review-ops:scale] cell ${size} FAILED: ${(result.stderr || result.stdout || '').slice(0, 600)}\n`);
      continue;
    }
    const line = (result.stdout || '').trim().split('\n').filter(Boolean).pop() ?? '';
    let cell;
    try {
      cell = JSON.parse(line);
    } catch {
      failed = true;
      process.stderr.write(`[review-ops:scale] cell ${size} produced no measurement\n`);
      continue;
    }
    cells.push(cell);
    if (!options.json) {
      process.stdout.write(
        `[review-ops:scale] ${String(size).padStart(6)} reviews | ` +
          `disk ${mib(cell.storeBytes).padStart(10)} (${String(cell.bytesPerReview).padStart(4)} B/review) | ` +
          `discovery ${String(cell.discovery.medianMs).padStart(8)} ms | ` +
          `shallow ${String(cell.shallowInventory.medianMs).padStart(8)} ms | ` +
          `deep ${String(cell.deepInventory.medianMs).padStart(9)} ms | ` +
          `history ${String(cell.historyLookup.medianMs).padStart(7)} ms | ` +
          `reviewer page ${String(cell.reviewerPage.medianMs).padStart(8)} ms | ` +
          `json ${String(cell.jsonSerialize.medianMs).padStart(6)} ms | ` +
          `wire ${String(cell.wirePayloadBytes).padStart(6)} B | ` +
          `RSS ${mib(cell.peakRssBytes)}\n`
      );
    }
  }
} finally {
  fs.rmSync(probe.outDir, { recursive: true, force: true });
}

if (options.json) process.stdout.write(`${JSON.stringify({ schemaVersion: 'nightwatch.review-operations-scale.v1', cells }, null, 2)}\n`);

if (failed || cells.length === 0) {
  process.stderr.write('[review-ops:scale] FAIL: at least one cell did not produce a measurement\n');
  process.exit(1);
}
process.stdout.write(`[review-ops:scale] OK: ${cells.length} cells measured\n`);
