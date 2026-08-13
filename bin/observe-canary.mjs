#!/usr/bin/env node
/**
 * Phase 2A unauthenticated real-connectivity canary.
 *
 * Preflight runs first and performs no network activity. The canary then runs
 * one dedicated Playwright test with storage state explicitly blank. It never
 * follows links or performs a click/form action.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let uiUrl;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) {
      console.error('observe:canary accepts exactly one --env selection');
      process.exit(2);
    }
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) {
      console.error('observe:canary accepts --ui-url only once');
      process.exit(2);
    }
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg !== '--help' && arg !== '-h') {
    console.error(`observe:canary does not accept option ${arg}`);
    process.exit(2);
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run observe:canary -- --env=dev|next [--ui-url=https://verified-host/]');
  console.log('Runs one unauthenticated direct-navigation canary after no-network preflight.');
  process.exit(0);
}
if (!env) {
  console.error('observe:canary requires exactly one --env=dev|next; production is forbidden');
  process.exit(2);
}

const preflight = path.join(root, 'bin', 'observe-preflight.mjs');
const preflightArgs = [preflight, `--env=${env}`];
if (uiUrl !== undefined) preflightArgs.push(`--ui-url=${uiUrl}`);
const preflightResult = spawnSync(process.execPath, preflightArgs, {
  cwd: root,
  env: buildChildEnvironment(process.env, { NIGHTWATCH_ENV: env, ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }) }),
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
if ((preflightResult.status ?? 1) !== 0) process.exit(preflightResult.status ?? 2);

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.canary.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: env,
    ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
    // An unauthenticated canary must not inherit a user's real state.
    NIGHTWATCH_STORAGE_STATE: '',
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: '0',
  }),
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(result.status ?? 1);
