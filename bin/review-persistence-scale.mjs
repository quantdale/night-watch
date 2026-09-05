#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Owner-local review persistence — scale measurement (local-only).
//
// Compiles the probe fresh to a disposable directory, then runs ONE FRESH OS
// PROCESS PER CELL of (corpus size x reviewed percentage). A single process
// walking the grid would let the first cell's warm JIT and settled heap
// flatter every later one.
//
// The question this answers is not "is the store fast". It is whether adding
// persistence changed the SHAPE of the served reviewer path, which the
// predecessor campaign measured and optimized to a page-scoped cost. So each
// cell measures the same page twice — without and with the store wired — and
// reports the delta alongside the store's own size.
//
// It measures. It makes no pass/fail claim beyond the probe completing.
//
// Usage: node bin/review-persistence-scale.mjs [sizes] [percents] [--json]
// Defaults: sizes 1000,5000,10000  percents 0,10,50,100
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  let sizes = [1000, 5000, 10000];
  let percents = [0, 10, 50, 100];
  let json = false;
  const numeric = [];
  for (const argument of argv) {
    if (argument === '--json') json = true;
    else if (/^[0-9,]+$/.test(argument)) numeric.push(argument.split(',').filter(Boolean).map((value) => Number.parseInt(value, 10)));
    else throw new Error(`unknown argument ${argument}`);
  }
  if (numeric.length > 0) sizes = numeric[0];
  if (numeric.length > 1) percents = numeric[1];
  if (sizes.some((size) => !Number.isInteger(size) || size < 2 || size > 200_000)) throw new Error('sizes must be 2..200000');
  if (percents.some((percent) => !Number.isInteger(percent) || percent < 0 || percent > 100)) throw new Error('percents must be 0..100');
  return { sizes, percents, json };
}

function compileProbe() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-review-scale-'));
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  const compiled = spawnSync(
    tsc,
    [
      'tests/unit/reviewPersistenceScaleProbe.ts',
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
    path.join(outDir, 'tests', 'unit', 'reviewPersistenceScaleProbe.js'),
    path.join(outDir, 'reviewPersistenceScaleProbe.js'),
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

function kib(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`[review:scale] usage: node bin/review-persistence-scale.mjs [sizes] [percents] [--json] (${error.message})\n`);
  process.exit(1);
}

let probe;
try {
  probe = compileProbe();
} catch (error) {
  process.stderr.write(`[review:scale] FAIL: ${error instanceof Error ? error.message : 'compilation error'}\n`);
  process.exit(1);
}

const cells = [];
let failed = false;
try {
  for (const size of options.sizes) {
    for (const percent of options.percents) {
      const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local' });
      environment.TZ = 'UTC';
      environment.LC_ALL = 'C';
      environment.NO_COLOR = '1';
      const result = spawnSync(process.execPath, [probe.entry, String(size), String(percent)], {
        cwd: root,
        encoding: 'utf8',
        env: environment,
        timeout: 900_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      if (result.status !== 0) {
        failed = true;
        process.stderr.write(`[review:scale] cell ${size}/${percent}% FAILED: ${(result.stderr || result.stdout || '').slice(0, 600)}\n`);
        continue;
      }
      const line = (result.stdout || '').trim().split('\n').filter(Boolean).pop() ?? '';
      let cell;
      try {
        cell = JSON.parse(line);
      } catch {
        failed = true;
        process.stderr.write(`[review:scale] cell ${size}/${percent}% produced no measurement\n`);
        continue;
      }
      cells.push(cell);
      if (!options.json) {
        process.stdout.write(
          `[review:scale] ${String(size).padStart(6)} findings @ ${String(percent).padStart(3)}% reviewed | ` +
            `store ${String(cell.storeFiles).padStart(6)} files ${kib(cell.storeBytes).padStart(11)} | ` +
            `page ${String(cell.baselinePageMs).padStart(7)} ms -> ${String(cell.servedPageMs).padStart(7)} ms | ` +
            `lookup ${String(cell.pageLookupMs).padStart(7)} ms | ` +
            `page reviews ${String(cell.pageCurrentReviews).padStart(3)}/${cell.pageRows} | ` +
            `RSS ${mib(cell.peakRssBytes)}\n`
        );
      }
    }
  }
} finally {
  fs.rmSync(probe.outDir, { recursive: true, force: true });
}

if (options.json) process.stdout.write(`${JSON.stringify({ schemaVersion: 'nightwatch.review-persistence-scale.v1', cells }, null, 2)}\n`);

if (failed || cells.length === 0) {
  process.stderr.write('[review:scale] FAIL: at least one cell did not produce a measurement\n');
  process.exit(1);
}
process.stdout.write(`[review:scale] OK: ${cells.length} cells measured\n`);
