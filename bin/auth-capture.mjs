#!/usr/bin/env node
/**
 * Human-led authenticated storage-state capture.
 *
 * This wrapper performs only local argument/path checks and a no-network target
 * preflight before delegating to the guarded Playwright helper. It never asks
 * for, prints, or stores credentials itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED = new Set(['dev', 'next']);

function usage() {
  console.log('Usage: npm run auth:capture -- --env=dev|next --output=/absolute/user-owned/ripple-state.json [--ui-url=https://verified-host/]');
  console.log('Human login/MFA is performed in the headed browser; Nightwatch never receives credentials.');
}

function fail(message) {
  console.error(`[auth:capture] FAIL: ${message}`);
  process.exit(2);
}

let env;
let uiUrl;
let output;
for (const arg of process.argv.slice(2)) {
  if (arg === '--help' || arg === '-h') {
    usage();
    process.exit(0);
  }
  if (arg.startsWith('--env=')) {
    if (env !== undefined) fail('exactly one --env is required');
    env = arg.slice('--env='.length).trim().toLowerCase();
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) fail('--ui-url may be supplied only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg.startsWith('--output=')) {
    if (output !== undefined) fail('--output may be supplied only once');
    output = arg.slice('--output='.length);
  } else {
    fail(`unknown option ${arg}`);
  }
}

if (!env || !SUPPORTED.has(env)) fail('exactly one supported environment is required: dev or next; production is forbidden');
if (!output || !path.isAbsolute(output)) fail('--output must be an absolute path outside the Nightwatch repository and workspace');
const outputPath = path.resolve(output);
const workspaceRoot = path.resolve(root, '..');
const inside = (dir, file) => {
  const rel = path.relative(dir, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};
if (inside(root, outputPath) || inside(workspaceRoot, outputPath)) fail('--output must be outside the Nightwatch repository and Alphaus workspace');
if (!outputPath.toLowerCase().endsWith('.json')) fail('--output must use a .json filename');
if (fs.existsSync(outputPath)) fail('--output already exists; refusing to overwrite secret state');
const parent = path.dirname(outputPath);
if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) fail('--output parent directory must already exist');
try {
  fs.accessSync(parent, fs.constants.W_OK);
} catch {
  fail('--output parent directory is not writable');
}
const mode = fs.statSync(parent).mode;
if ((mode & 0o002) !== 0 && (mode & 0o1000) === 0) fail('--output parent is world-writable without sticky protection');

const preflight = spawnSync(process.execPath, [path.join(root, 'bin', 'observe-preflight.mjs'), `--env=${env}`, ...(uiUrl === undefined ? [] : [`--ui-url=${uiUrl}`])], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
if (preflight.stdout) process.stdout.write(preflight.stdout);
if (preflight.status !== 0) {
  if (preflight.stderr) process.stderr.write(preflight.stderr);
  process.exit(preflight.status ?? 2);
}

const playwright = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const result = spawnSync(playwright, ['test', 'tests/manual/auth-capture.ts', '--project=nightwatch', '--headed'], {
  cwd: root,
  env: {
    ...process.env,
    NIGHTWATCH_ENV: env,
    NIGHTWATCH_UI_URL: uiUrl ?? '',
    NIGHTWATCH_CAPTURE_OUTPUT: outputPath,
    NIGHTWATCH_MANUAL_CAPTURE: '1',
    NIGHTWATCH_HEADED: '1',
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_STORAGE_STATE: '',
  },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
