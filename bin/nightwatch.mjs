#!/usr/bin/env node
/**
 * Nightwatch CLI (Phase 0/1).
 *
 * Wraps the Playwright test runner with Nightwatch's fail-closed environment
 * selection. production is NOT supported.
 *
 * Usage:
 *   node bin/nightwatch.mjs --env=local [--ui-url=http://127.0.0.1:8080]
 *                           [--product=ripple] [--scenario=scenarios/ripple/local.smoke.ts]
 *                           [-- playwright-test-args...]
 *
 * Environment selection is REQUIRED; missing or unsupported -> exit 2.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildChildEnvironment } from './child-environment.mjs';

const args = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operatorCommands = new Set(['status', 'plan', 'coverage', 'campaign', 'contracts', 'gaps', 'findings', 'explain']);
if (operatorCommands.has(args[0])) {
  const result = spawnSync(process.execPath, [path.join(root, 'bin', 'nightwatch-intelligence.mjs'), ...args], {
    cwd: root,
    env: buildChildEnvironment(process.env, { NIGHTWATCH_OPERATOR_SCOPE: 'LOCAL_SYNTHETIC_ONLY' }),
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
const envVars = {};
let scenario = null;
const rest = [];
const SUPPORTED = new Set(['local', 'dev', 'next']);

for (const a of args) {
  if (a.startsWith('--env=')) envVars.NIGHTWATCH_ENV = a.slice('--env='.length);
  else if (a.startsWith('--ui-url=')) envVars.NIGHTWATCH_UI_URL = a.slice('--ui-url='.length);
  else if (a.startsWith('--product=')) envVars.NIGHTWATCH_PRODUCT = a.slice('--product='.length);
  else if (a.startsWith('--scenario=')) scenario = a.slice('--scenario='.length);
  else rest.push(a);
}

if (!envVars.NIGHTWATCH_ENV) {
  console.error(
    'NIGHTWATCH: fail-closed — no environment selected.\n' +
      '  Usage: node bin/nightwatch.mjs --env=local|dev|next [--ui-url=...] [--scenario=...]\n' +
      '  production is NOT supported in Phase 1.'
  );
  process.exit(2);
}
if (!SUPPORTED.has(envVars.NIGHTWATCH_ENV)) {
  console.error(`NIGHTWATCH: fail-closed — environment "${envVars.NIGHTWATCH_ENV}" is not supported (allowed: local, dev, next).`);
  process.exit(2);
}

const scenarioPath = scenario ?? path.join('scenarios', 'ripple', 'local.smoke.ts');
const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;

const res = spawnSync(cmd, ['test', scenarioPath, '--project=nightwatch', ...rest], {
  cwd: root,
  env: buildChildEnvironment(process.env, envVars),
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 15 * 60 * 1000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(res.status ?? 1);
