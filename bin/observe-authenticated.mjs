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
import { buildObserveAuthenticatedEnvironment, parseObserveAuthenticatedArgs } from './observe-authenticated-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let parsed;
try {
  parsed = parseObserveAuthenticatedArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

if (parsed.help) {
  console.log('Usage: npm run observe:authenticated -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
  console.log('Runs the safety gate, one direct authenticated landing observation, and one fresh-context replay.');
  process.exit(0);
}
const { env, storage, uiUrl } = parsed;
if (env !== 'dev') throw new Error('observe-authenticated requires --env=dev; NEXT is reserved for human-led auth capture');

const gate = path.join(root, 'bin', 'observe-gate.mjs');
const gateArgs = [gate, `--env=${env}`, `--storage-state=${storage}`];
if (uiUrl !== undefined) gateArgs.push(`--ui-url=${uiUrl}`);
const gateResult = spawnSync(process.execPath, gateArgs, {
  cwd: root,
  env: buildObserveAuthenticatedEnvironment(process.env, { env, storage, uiUrl }),
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
if ((gateResult.status ?? 1) !== 0) process.exit(gateResult.status ?? 2);

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.authenticated.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: {
    ...buildObserveAuthenticatedEnvironment(process.env, { env, storage, uiUrl }),
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 15 * 60 * 1000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(result.status ?? 1);
