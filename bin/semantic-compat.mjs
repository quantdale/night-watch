#!/usr/bin/env node

// The Phase 9–24 compatibility cone is a versioned file manifest. It is
// intentionally invoked as argv entries with shell=false; manifest values
// cannot become commands, flags, paths outside tests, or selectors.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'config', 'semantic-compatibility.v1.json');
const filePattern = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;

function fail(code) {
  throw new Error(code);
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 'nightwatch.semantic-compatibility.v1') fail('SEMANTIC_COMPATIBILITY_SCHEMA_UNSUPPORTED');
  if (manifest.requiredPhaseRange?.first !== 9 || manifest.requiredPhaseRange?.last !== 24) fail('SEMANTIC_COMPATIBILITY_PHASE_RANGE_INVALID');
  if (manifest.execution?.project !== 'nightwatch' || manifest.execution?.workers !== 1 || manifest.execution?.serial !== true) fail('SEMANTIC_COMPATIBILITY_EXECUTION_INVALID');
  const files = [];
  const seen = new Set();
  const phases = new Set();
  for (const suite of manifest.phaseSuites ?? []) {
    if (!Number.isFinite(suite.phase) || phases.has(suite.phase)) fail('SEMANTIC_COMPATIBILITY_SUITE_INVALID');
    phases.add(suite.phase);
    for (const file of suite.files ?? []) {
      if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || seen.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
      if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
      seen.add(file);
      files.push(file);
    }
  }
  for (const file of manifest.supportFiles ?? []) {
    if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || seen.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
    if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
    seen.add(file);
    files.push(file);
  }
  for (let phase = 9; phase <= 24; phase += 1) {
    if (![...phases].some((candidate) => Math.floor(candidate) === phase)) fail(`SEMANTIC_COMPATIBILITY_PHASE_OMITTED:${phase}`);
  }
  return { manifest, files };
}

try {
  const { manifest, files } = loadManifest();
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'COMPATIBILITY' });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of ['NIGHTWATCH_PROXY_PORT', 'NIGHTWATCH_PROXY_LEASE_TOKEN', 'NIGHTWATCH_PROXY_LEASE_PATH', 'NIGHTWATCH_PROXY_LEASE_OWNER_PID']) delete environment[key];
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(npx, ['playwright', 'test', ...files, '--project=nightwatch', '--workers=1'], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 1_200_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const count = (pattern) => { const match = pattern.exec(output); return match ? Number(match[1]) : null; };
  const passed = count(/(\d+)\s+passed/i);
  const skipped = count(/(\d+)\s+skipped/i);
  let failed = count(/(\d+)\s+failed/i);
  const totalFromOutput = count(/Total:\s*(\d+)\s+tests?/i);
  if (result.status === 0 && failed === null) failed = 0;
  const total = totalFromOutput ?? ([passed, skipped, failed].every((value) => Number.isInteger(value)) ? passed + skipped + failed : null);
  const failedLocations = [...output.matchAll(/^\s*\d+\)\s+\[[^\]]+\]\s+›\s+(tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts):(\d+)(?::\d+)?\s+›/gm)]
    .slice(0, 16)
    .map((match) => `${match[1]}:${match[2]}`);
  const receipt = {
    schemaVersion: manifest.schemaVersion,
    phaseRange: manifest.requiredPhaseRange,
    phaseCount: manifest.phaseSuites.length,
    fileCount: files.length,
    total,
    passed,
    skipped,
    failed,
    failedLocations,
    result: result.status === 0 ? 'PASS' : result.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'TEST_FAILURE',
  };
  console.log(JSON.stringify(receipt));
  process.exitCode = result.status === 0 ? 0 : 1;
} catch (error) {
  console.error(JSON.stringify({ schemaVersion: 'nightwatch.semantic-compatibility.v1', result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'SEMANTIC_COMPATIBILITY_INVALID' }));
  process.exitCode = 2;
}
