#!/usr/bin/env node
/**
 * Phase 5 bounded serial API runner.
 *
 * The runner is opt-in, DEV-only, and accepts only the external storage-state
 * path needed by the existing Nightwatch auth refresh. OOPS remains local
 * fixture-only when the available network namespace cannot reach the parent
 * Nightwatch relay; the real API path is the native Nightwatch relay fallback.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment, emitChildStdio } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let storage;
let uiUrl;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) throw new Error('phase5-real accepts --env only once');
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) throw new Error('phase5-real accepts --storage-state only once');
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) throw new Error('phase5-real accepts --ui-url only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run api:phase5 -- --env=dev --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
    process.exit(0);
  } else {
    throw new Error(`phase5-real does not accept option ${arg}`);
  }
}
if (env !== 'dev') throw new Error('phase5-real requires --env=dev; production and next are not Phase 5 targets');
if (storage === undefined) storage = path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json');
if (storage.trim() === '' || !path.isAbsolute(storage)) throw new Error('phase5-real requires an absolute external storage-state path');
if (storage === path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json') && fs.existsSync(storage)) {
  const stat = fs.lstatSync(storage);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('phase5-real refuses an unsafe default DEV storage-state path');
  fs.chmodSync(storage, 0o600);
  fs.chmodSync(path.dirname(storage), 0o700);
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.phase5.config.ts', '--project=nightwatch', '--workers=1'], {
  cwd: root,
  env: buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: env,
    NIGHTWATCH_STORAGE_STATE: storage,
    NIGHTWATCH_PHASE_5_REAL: '1',
    NIGHTWATCH_PHASE_5_AUTH_REFRESH: process.env.NIGHTWATCH_PHASE_5_AUTH_REFRESH === '0' ? '0' : '1',
    NIGHTWATCH_PHASE_5_OOPS_REAL: '0',
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: process.env.NIGHTWATCH_HEADED === '1' ? '1' : '0',
    ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
  }),
  timeout: 15 * 60 * 1000,
  stdio: ['ignore', 'pipe', 'pipe'],
  maxBuffer: 2 * 1024 * 1024,
});
emitChildStdio(result);
process.exit(result.status ?? 1);
