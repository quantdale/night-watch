#!/usr/bin/env node
/** Phase 2C gated, serial six-context real-run launcher. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment, emitChildStdio } from './child-environment.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let storage;
let uiUrl;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) throw new Error('phase2c-real accepts --env only once');
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) throw new Error('phase2c-real accepts --storage-state only once');
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) throw new Error('phase2c-real accepts --ui-url only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run journey:phase2c -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
    process.exit(0);
  } else throw new Error(`phase2c-real does not accept option ${arg}`);
}
if (env !== 'dev' || storage === undefined || storage.trim() === '') {
  throw new Error('phase2c-real requires exactly one --env=dev and --storage-state=/absolute/external/state.json; NEXT is reserved for human-led auth capture');
}

try {
  const configured = JSON.parse(fs.readFileSync(path.join(root, 'config', 'environments', `${env}.json`), 'utf8'));
  const { requireValidAuthCapability } = loadTypeScriptModule('src/auth/capabilityLifecycle.ts', { root });
  const capability = requireValidAuthCapability({
    artefactPath: storage,
    environment: env,
    configuredUiBaseUrl: configured.uiBaseUrl,
    requiredValidityMs: 15 * 60 * 1000,
  });
  if (capability.budgetWarning) {
    console.error(`[phase2c] WARNING ${capability.budgetWarning.code}: remaining validity ${capability.budgetWarning.remainingValidityMs} ms is shorter than the declared run budget ${capability.budgetWarning.requiredValidityMs} ms`);
  }
} catch (error) {
  if (error && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('AUTH_CAPABILITY_')) {
    console.error(`[phase2c] REFUSED ${error.code}: ${error.message}`);
    process.exit(3);
  }
  throw error;
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const commonEnv = buildChildEnvironment(process.env, {
  NIGHTWATCH_ENV: env,
  NIGHTWATCH_STORAGE_STATE: storage,
  NIGHTWATCH_PHASE_2C_REAL: '1',
  NIGHTWATCH_TRACE: 'off',
  NIGHTWATCH_HEADED: '0',
  ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
});
const gate = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], { cwd: root, env: commonEnv, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
emitChildStdio(gate);
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 2);
const run = spawnSync(cmd, ['test', '--config=playwright.phase2c.config.ts', '--project=nightwatch', '--workers=1'], { cwd: root, env: commonEnv, stdio: ['ignore', 'pipe', 'pipe'], timeout: 15 * 60 * 1000, maxBuffer: 2 * 1024 * 1024 });
emitChildStdio(run);
process.exit(run.status ?? 1);
