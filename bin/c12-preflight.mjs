#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Nightwatch AH-1 — C-12 operator-readiness preflight CLI (local-only).
//
// Reads an operator-owned JSON descriptor, evaluates it with the pure
// `evaluateC12Readiness` library, and prints ONLY the readiness report.
// The descriptor itself is never echoed: it may reference external material
// that must not enter logs.
//
// Local-only guarantees: no browser, no DNS, no HTTP, no credential access,
// no authorization consumption. The TypeScript cone is compiled fresh to a
// disposable directory on every run (deterministic, no cache to invalidate).
//
// Usage: node bin/c12-preflight.mjs --input <EXTERNAL_DESCRIPTOR_PATH>
// Exit: 0 READY · 2 BLOCKED · 1 invalid usage or unreadable descriptor.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'c12-preflight',
  entry: 'bin/c12-preflight.mjs',
  purpose: 'Evaluate an operator-owned C-12 readiness descriptor locally and print only the readiness report.',
  group: 'validate',
  flags: [
    { name: '--input', shape: 'path', summary: 'external readiness descriptor path (at most 64 KiB)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

/** @param {string} message */
function fail(message) {
  console.error(`[c12-preflight] FAIL: ${message}`);
  process.exitCode = 1;
}

function compileCone() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c12-preflight-'));
  const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
  const compiled = spawnSync(
    tsc,
    [
      'src/core/c12Readiness/index.ts',
      'src/core/identity/canonicalDigest.ts',
      '--outDir', outDir,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--strict', '--skipLibCheck',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120000 },
  );
  if (compiled.status !== 0) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw new Error(`readiness cone compilation failed: ${(compiled.stderr || compiled.stdout || '').slice(0, 500)}`);
  }
  return outDir;
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  if (!cli.ok) {
    process.exitCode = 2;
    return;
  }
  const inputFlag = cli.flags['--input'];
  if (typeof inputFlag !== 'string' || inputFlag.trim() === '') {
    process.stderr.write('CLI_ARGUMENT_MISSING: --input <EXTERNAL_DESCRIPTOR_PATH> is required\n');
    process.exitCode = 2;
    return;
  }
  const inputPath = inputFlag;
  let descriptor;
  try {
    const stat = fs.statSync(inputPath);
    if (!stat.isFile() || stat.size > 65536) throw new Error('descriptor must be a regular file of at most 64 KiB');
    descriptor = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (error) {
    fail(`cannot read descriptor: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  let outDir;
  try {
    outDir = compileCone();
    const requireCone = createRequire(path.join(outDir, 'entry.cjs'));
    const candidates = [
      path.join(outDir, 'c12Readiness', 'index.js'),
      path.join(outDir, 'src', 'core', 'c12Readiness', 'index.js'),
    ];
    const entry = candidates.find((candidate) => fs.existsSync(candidate));
    if (entry === undefined) throw new Error('compiled readiness entry not found');
    const cone = requireCone(entry);
    const report = cone.evaluateC12Readiness(descriptor);
    // Authenticated-capability metadata only: the lifecycle report reads the
    // sidecar record and cookie expiry fields, never a browser or a value.
    const capabilityLifecycle = loadTypeScriptModule('src/auth/capabilityLifecycle.ts', { root });
    const authentication = capabilityLifecycle.collectAuthCapabilityReport({
      homeDirectory: os.homedir(),
      environmentVariable: process.env.NIGHTWATCH_STORAGE_STATE ?? null,
      selectedEnvironment: process.env.NIGHTWATCH_ENV ?? null,
    });
    process.stdout.write(`${JSON.stringify({
      ...report,
      authentication: {
        schemaVersion: authentication.schemaVersion,
        checkedAt: authentication.checkedAt,
        entries: authentication.entries,
        observedCaptureLifetimes: authentication.observedCaptureLifetimes,
        network: authentication.network,
        browser: authentication.browser,
      },
    }, null, 2)}\n`);
    process.exitCode = report.status === 'READY' ? 0 : 2;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    if (outDir !== undefined) fs.rmSync(outDir, { recursive: true, force: true });
  }
}

main();
