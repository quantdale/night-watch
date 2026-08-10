#!/usr/bin/env node
/**
 * Phase 2A first controlled authenticated observation.
 *
 * The local safety gate runs immediately before the opt-in Playwright test.
 * The test uses only the external storage-state path and performs one direct
 * landing observation followed by one identical fresh-context replay.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let storage;
let uiUrl;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) {
      console.error('observe:authenticated accepts --env only once');
      process.exit(2);
    }
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) {
      console.error('observe:authenticated accepts --storage-state only once');
      process.exit(2);
    }
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) {
      console.error('observe:authenticated accepts --ui-url only once');
      process.exit(2);
    }
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg !== '--help' && arg !== '-h') {
    console.error(`observe:authenticated does not accept option ${arg}`);
    process.exit(2);
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run observe:authenticated -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
  console.log('Runs the safety gate, one direct authenticated landing observation, and one fresh-context replay.');
  process.exit(0);
}
if (env === undefined || storage === undefined || storage.trim() === '') {
  console.error('observe:authenticated requires exactly one --env=dev|next and --storage-state=/absolute/external/state.json');
  process.exit(2);
}

const gate = path.join(root, 'bin', 'observe-gate.mjs');
const gateArgs = [gate, `--env=${env}`, `--storage-state=${storage}`];
if (uiUrl !== undefined) gateArgs.push(`--ui-url=${uiUrl}`);
const gateResult = spawnSync(process.execPath, gateArgs, {
  cwd: root,
  env: { ...process.env, NIGHTWATCH_ENV: env, NIGHTWATCH_STORAGE_STATE: storage, ...(uiUrl === undefined ? { NIGHTWATCH_UI_URL: '' } : { NIGHTWATCH_UI_URL: uiUrl }) },
  stdio: 'inherit',
});
if ((gateResult.status ?? 1) !== 0) process.exit(gateResult.status ?? 2);

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.authenticated.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: {
    ...process.env,
    NIGHTWATCH_ENV: env,
    NIGHTWATCH_STORAGE_STATE: storage,
    ...(uiUrl === undefined ? { NIGHTWATCH_UI_URL: '' } : { NIGHTWATCH_UI_URL: uiUrl }),
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: '0',
  },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);

