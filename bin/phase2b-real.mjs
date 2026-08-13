#!/usr/bin/env node
/**
 * Phase 2B gated serial real-run launcher.
 *
 * The first child performs the established no-browser pre-real gate. The
 * second child runs the generic journey test, which repeats the same gate and
 * boolean-only auth validation immediately before every fresh context.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let storage;
let uiUrl;
let journeyId;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) throw new Error('phase2b-real accepts --env only once');
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) throw new Error('phase2b-real accepts --storage-state only once');
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) throw new Error('phase2b-real accepts --ui-url only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg.startsWith('--journey-id=')) {
    if (journeyId !== undefined) throw new Error('phase2b-real accepts --journey-id only once');
    journeyId = arg.slice('--journey-id='.length);
    if (journeyId.trim() === '') throw new Error('phase2b-real --journey-id must not be empty');
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run journey:real -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/] [--journey-id=ripple-payer-exchange-read|ripple-common-exchange-read|ripple-account-inventory]');
    process.exit(0);
  } else {
    throw new Error(`phase2b-real does not accept option ${arg}`);
  }
}
if (env !== 'dev' || storage === undefined || storage.trim() === '') {
  throw new Error('phase2b-real requires exactly one --env=dev and --storage-state=/absolute/external/state.json; NEXT is reserved for human-led auth capture');
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const commonEnv = buildChildEnvironment(process.env, {
  NIGHTWATCH_ENV: env,
  NIGHTWATCH_STORAGE_STATE: storage,
  NIGHTWATCH_PHASE_2B_REAL: '1',
  NIGHTWATCH_TRACE: 'off',
  NIGHTWATCH_HEADED: '0',
  ...(journeyId === undefined ? {} : { NIGHTWATCH_PHASE_2B_JOURNEY_ID: journeyId }),
  ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
});

const gate = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: commonEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 2);

const run = spawnSync(cmd, ['test', '--config=playwright.phase2b.config.ts', '--project=nightwatch', '--workers=1'], {
  cwd: root,
  env: commonEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 15 * 60 * 1000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(run.status ?? 1);
