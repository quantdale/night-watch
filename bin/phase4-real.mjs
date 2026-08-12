#!/usr/bin/env node
/** Phase 4 gated serial seeded exploration launcher. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let storage;
let uiUrl;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) throw new Error('phase4-real accepts --env only once');
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) throw new Error('phase4-real accepts --storage-state only once');
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) throw new Error('phase4-real accepts --ui-url only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run explore:phase4 -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
    process.exit(0);
  } else throw new Error(`phase4-real does not accept option ${arg}`);
}
if (env === undefined) throw new Error('phase4-real requires --env=dev|next');
if (storage === undefined && env === 'dev') {
  storage = path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json');
}
if (storage === undefined || storage.trim() === '') throw new Error('phase4-real requires an external storage-state path for this environment');
if (env === 'dev' && storage === path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json')) {
  const authDirectory = path.dirname(storage);
  fs.mkdirSync(authDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(authDirectory, 0o700);
  if (fs.existsSync(storage)) {
    const stateLink = fs.lstatSync(storage);
    if (stateLink.isSymbolicLink() || !stateLink.isFile()) throw new Error('phase4-real refuses an unsafe default DEV storage-state path');
    fs.chmodSync(storage, 0o600);
  }
}
const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const commonEnv = { ...process.env, NIGHTWATCH_ENV: env, NIGHTWATCH_STORAGE_STATE: storage, NIGHTWATCH_PHASE_4_REAL: '1', NIGHTWATCH_PHASE_4_AUTH_REFRESH: env === 'dev' ? '1' : '0', NIGHTWATCH_TRACE: 'off', NIGHTWATCH_HEADED: process.env.NIGHTWATCH_HEADED ?? '1', ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }) };
const gate = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], { cwd: root, env: commonEnv, stdio: 'inherit' });
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 2);
const run = spawnSync(cmd, ['test', '--config=playwright.phase4.config.ts', '--project=nightwatch', '--workers=1'], { cwd: root, env: commonEnv, stdio: 'inherit' });
process.exit(run.status ?? 1);
