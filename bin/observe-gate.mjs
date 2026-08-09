#!/usr/bin/env node
/**
 * Phase 2A pre-real-run gate wrapper.
 *
 * The invoked Playwright test starts only the local loopback proxy global
 * setup. The gate test itself creates no browser context and performs no
 * target DNS/TCP activity. A real target is not opened by this command.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let env;
let uiUrl;
let storage;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) {
      console.error('observe:gate accepts exactly one --env selection');
      process.exit(2);
    }
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) {
      console.error('observe:gate accepts --ui-url only once');
      process.exit(2);
    }
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) {
      console.error('observe:gate accepts --storage-state only once');
      process.exit(2);
    }
    storage = arg.slice('--storage-state='.length);
  }
}

if (args.some((arg) => !arg.startsWith('--env=') && !arg.startsWith('--ui-url=') && !arg.startsWith('--storage-state=') && arg !== '--help' && arg !== '-h')) {
  console.error('Usage: npm run observe:gate -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
  process.exit(2);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: npm run observe:gate -- --env=dev|next --storage-state=/absolute/external/state.json [--ui-url=https://verified-host/]');
  console.log('Runs the local safety gate only; it does not create a browser context or contact the selected target.');
  process.exit(0);
}
if (!env || !storage) {
  console.error('observe:gate requires exactly one --env=dev|next and --storage-state=/absolute/external/state.json');
  process.exit(2);
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: {
    ...process.env,
    NIGHTWATCH_ENV: env,
    ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
    NIGHTWATCH_STORAGE_STATE: storage,
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: '0',
  },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
