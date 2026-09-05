#!/usr/bin/env node

// ---------------------------------------------------------------------------
// FC-1 fresh-process determinism certification (local-only).
//
// Compiles the frontier probe cone fresh to a disposable directory (the same
// discipline as bin/c12-preflight.mjs — no cache to invalidate), then runs it
// in N fresh OS processes and requires exactly one unique semantic digest.
//
// A second digest means a frontier-cone output depends on process state
// (per-process hash seeding, ambient time, locale, randomness) rather than on
// its inputs. Locale and timezone are deliberately varied across runs so an
// environment-sensitive output cannot hide behind a fixed environment.
//
// The probe touches no network, no production surface, and writes nothing
// outside the disposable compile directory.
//
// Usage: node bin/frontier-determinism.mjs [runs 1-200]   (default 20)
// Exit: 0 deterministic · 1 nondeterministic or probe failure.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function compileProbe() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-frontier-determinism-'));
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  const compiled = spawnSync(
    tsc,
    [
      'tests/unit/frontierDeterminismProbe.ts',
      '--outDir', outDir,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--strict', '--skipLibCheck', '--esModuleInterop',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180_000 },
  );
  if (compiled.status !== 0) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw new Error(`probe compilation failed: ${(compiled.stderr || compiled.stdout || '').slice(0, 600)}`);
  }
  const candidates = [
    path.join(outDir, 'tests', 'unit', 'frontierDeterminismProbe.js'),
    path.join(outDir, 'frontierDeterminismProbe.js'),
  ];
  const entry = candidates.find((candidate) => fs.existsSync(candidate));
  if (entry === undefined) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw new Error('compiled probe entry not found');
  }
  return { outDir, entry };
}

const requested = Number.parseInt(process.argv[2] ?? '20', 10);
if (!Number.isInteger(requested) || requested < 1 || requested > 200) {
  process.stderr.write('[frontier:determinism] usage: node bin/frontier-determinism.mjs [runs 1-200]\n');
  process.exit(1);
}

let compiledProbe;
try {
  compiledProbe = compileProbe();
} catch (error) {
  process.stderr.write(`[frontier:determinism] FAIL: ${error instanceof Error ? error.message : 'compilation error'}\n`);
  process.exit(1);
}

const digests = new Map();
const failures = [];
try {
  for (let run = 1; run <= requested; run += 1) {
    const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local' });
    environment.TZ = run % 2 === 0 ? 'UTC' : 'Asia/Manila';
    environment.LC_ALL = run % 3 === 0 ? 'en_US.UTF-8' : 'C';
    environment.NO_COLOR = '1';
    const result = spawnSync(process.execPath, [compiledProbe.entry], {
      cwd: root,
      encoding: 'utf8',
      env: environment,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    if (result.status !== 0) {
      failures.push(`run ${run}: exit ${result.status} ${String(result.stderr ?? '').slice(0, 300)}`);
      continue;
    }
    const digest = result.stdout.trim();
    digests.set(digest, (digests.get(digest) ?? 0) + 1);
  }
} finally {
  fs.rmSync(compiledProbe.outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`[frontier:determinism] ${failure}\n`);
  process.stderr.write(`[frontier:determinism] FAIL: ${failures.length}/${requested} runs did not complete\n`);
  process.exit(1);
}

for (const [digest, count] of digests) {
  process.stdout.write(`[frontier:determinism] ${digest} x${count}\n`);
}
if (digests.size !== 1) {
  process.stderr.write(`[frontier:determinism] FAIL: ${digests.size} unique semantic digests across ${requested} fresh processes (expected 1)\n`);
  process.exit(1);
}
process.stdout.write(`[frontier:determinism] PASS: 1 unique semantic digest across ${requested} fresh processes\n`);
