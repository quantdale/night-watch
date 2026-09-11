#!/usr/bin/env node

// ---------------------------------------------------------------------------
// RS-1 finding-intelligence scale measurement (local-only).
//
// Compiles the scale probe fresh to a disposable directory, then runs it in
// ONE FRESH OS PROCESS PER CORPUS SIZE. A single process measuring 1k, 5k and
// 10k in sequence would let the first size's warm JIT and settled heap flatter
// the later ones; separate processes make each number stand on its own.
//
// It prints per-stage CPU, peak RSS and wall latency, and the growth ratio
// between consecutive sizes. The ratio is the point: work that scales linearly
// grows about 5x from 1k to 5k, and work that is quadratic grows about 25x.
// The threshold is located from the numbers, not assumed from the shape of the
// code.
//
// This harness measures. It does not optimize, and it makes no pass/fail
// claim beyond the probe completing.
//
// Usage: node bin/finding-intel-scale.mjs [sizes] [--budget-ms N] [--json]
// Default sizes: 1000,5000,10000
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'finding-intel-scale',
  entry: 'bin/finding-intel-scale.mjs',
  purpose: 'Measure the bounded finding-intelligence hot-path scale without making a pass claim.',
  group: 'inspect-intelligence',
  positionals: { min: 0, max: 1, names: ['sizes'] },
  flags: [
    { name: '--budget-ms', shape: 'integer', summary: 'per-point wall budget in milliseconds' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['disposable compile directory under the system temporary directory'],
};

function parseArgs(argv) {
  let sizes = [1000, 5000, 10000];
  let budgetMs = 60_000;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') json = true;
    else if (argument === '--budget-ms') {
      budgetMs = Number.parseInt(argv[index + 1] ?? '', 10);
      index += 1;
    } else if (/^[0-9,]+$/.test(argument)) {
      sizes = argument.split(',').filter(Boolean).map((value) => Number.parseInt(value, 10));
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  if (!Number.isInteger(budgetMs) || budgetMs < 1000 || budgetMs > 600_000) throw new Error('--budget-ms must be 1000..600000');
  if (sizes.length === 0 || sizes.some((size) => !Number.isInteger(size) || size < 2 || size > 200_000)) {
    throw new Error('sizes must be integers in 2..200000');
  }
  return { sizes, budgetMs, json };
}

function compileProbe() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-intel-scale-'));
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  const compiled = spawnSync(
    tsc,
    [
      'tests/unit/findingIntelScaleProbe.ts',
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
    throw new Error(`probe compilation failed: ${(compiled.stderr || compiled.stdout || '').slice(0, 600)}`);
  }
  const entry = [
    path.join(outDir, 'tests', 'unit', 'findingIntelScaleProbe.js'),
    path.join(outDir, 'findingIntelScaleProbe.js'),
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

function ratio(previous, current) {
  if (previous === undefined || previous.wallMs <= 0) return null;
  return current.wallMs / previous.wallMs;
}

/**
 * Name the observed growth against the size growth. A stage whose time grows
 * with the square of the corpus is quadratic whatever the code looks like, and
 * a stage that merely looks quadratic but measures linear is not a problem to
 * solve today.
 */
function growthClass(sizeRatio, timeRatio) {
  if (timeRatio === null || sizeRatio <= 1) return 'UNKNOWN';
  const exponent = Math.log(timeRatio) / Math.log(sizeRatio);
  if (exponent < 0.5) return 'SUBLINEAR';
  if (exponent < 1.4) return 'LINEAR';
  if (exponent < 1.75) return 'SUPERLINEAR';
  if (exponent < 2.4) return 'QUADRATIC';
  return 'WORSE_THAN_QUADRATIC';
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`[intel:scale] usage: node bin/finding-intel-scale.mjs [sizes] [--budget-ms N] [--json] (${error.message})\n`);
  process.exit(1);
}

let probe;
try {
  probe = compileProbe();
} catch (error) {
  process.stderr.write(`[intel:scale] FAIL: ${error instanceof Error ? error.message : 'compilation error'}\n`);
  process.exit(1);
}

const runs = [];
try {
  for (const size of options.sizes) {
    const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local' });
    environment.TZ = 'UTC';
    environment.LC_ALL = 'C';
    environment.NO_COLOR = '1';
    const started = Date.now();
    const result = spawnSync(process.execPath, [probe.entry, String(size), String(options.budgetMs)], {
      cwd: root,
      encoding: 'utf8',
      env: environment,
      timeout: options.budgetMs * 8 + 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (result.status !== 0) {
      process.stderr.write(`[intel:scale] FAIL: size ${size} exited ${result.status}: ${String(result.stderr ?? '').slice(0, 400)}\n`);
      process.exit(1);
    }
    let parsed;
    try {
      parsed = JSON.parse(result.stdout.trim());
    } catch {
      process.stderr.write(`[intel:scale] FAIL: size ${size} produced unparseable output\n`);
      process.exit(1);
    }
    runs.push({ ...parsed, processWallMs: Date.now() - started });
  }
} finally {
  fs.rmSync(probe.outDir, { recursive: true, force: true });
}

const stageNames = runs.length === 0 ? [] : runs[0].stages.map((stage) => stage.stage);
const report = {
  schemaVersion: 'nightwatch.finding-intel-scale-report.v1',
  sizes: options.sizes,
  budgetMs: options.budgetMs,
  nodeMajor: runs[0]?.nodeMajor ?? null,
  stages: stageNames.map((name) => ({
    stage: name,
    points: runs.map((run) => {
      const stage = run.stages.find((candidate) => candidate.stage === name);
      return { findings: run.findings, ...stage };
    }),
    growth: runs.slice(1).map((run, index) => {
      const previousRun = runs[index];
      const previous = previousRun.stages.find((candidate) => candidate.stage === name);
      const current = run.stages.find((candidate) => candidate.stage === name);
      const sizeRatio = run.findings / previousRun.findings;
      const timeRatio = ratio(previous, current);
      return {
        from: previousRun.findings,
        to: run.findings,
        sizeRatio: Math.round(sizeRatio * 100) / 100,
        timeRatio: timeRatio === null ? null : Math.round(timeRatio * 100) / 100,
        growthClass: growthClass(sizeRatio, timeRatio),
      };
    }),
  })),
};

if (options.json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
}

for (const stage of report.stages) {
  process.stdout.write(`\n[intel:scale] ${stage.stage}\n`);
  for (const point of stage.points) {
    const completion = point.status === 'COMPLETED'
      ? `${point.workCompleted.toLocaleString('en-US')} ${point.workUnit}s`
      : `BUDGET_EXCEEDED after ${point.workCompleted.toLocaleString('en-US')} of ${point.workPlanned.toLocaleString('en-US')} ${point.workUnit}s`;
    process.stdout.write(
      `  ${String(point.findings).padStart(6)} findings  wall ${point.wallMs.toFixed(1).padStart(10)} ms  cpu ${(point.cpuUserMs + point.cpuSystemMs).toFixed(1).padStart(10)} ms  peak rss ${mib(point.peakRssBytes).padStart(10)}  ${completion}\n`
    );
  }
  for (const growth of stage.growth) {
    process.stdout.write(
      `  ${growth.from} -> ${growth.to}: size x${growth.sizeRatio}, time x${growth.timeRatio ?? 'n/a'} => ${growth.growthClass}\n`
    );
  }
}
process.stdout.write('\n[intel:scale] measurement only; no pass/fail claim is made here\n');
}
