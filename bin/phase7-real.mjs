#!/usr/bin/env node
/**
 * Phase 7 bounded private real-DEV campaign runner.
 *
 * This is deliberately opt-in and serial. It passes only a validated external
 * storage-state path to the existing Playwright adapter; the campaign itself
 * owns no credentials and never publishes evidence.
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
let prepareOnly = false;
let resumeCampaign;
// Phase 16C opt-in portfolio input path (single mechanism; no competing path).
let portfolioPlan;
let portfolioAuthorization;
for (const arg of args) {
  if (arg.startsWith('--env=')) {
    if (env !== undefined) throw new Error('phase7-real accepts --env only once');
    env = arg.slice('--env='.length);
  } else if (arg.startsWith('--storage-state=')) {
    if (storage !== undefined) throw new Error('phase7-real accepts --storage-state only once');
    storage = arg.slice('--storage-state='.length);
  } else if (arg.startsWith('--ui-url=')) {
    if (uiUrl !== undefined) throw new Error('phase7-real accepts --ui-url only once');
    uiUrl = arg.slice('--ui-url='.length);
  } else if (arg === '--prepare-only') {
    if (prepareOnly) throw new Error('phase7-real accepts --prepare-only only once');
    prepareOnly = true;
  } else if (arg.startsWith('--resume-campaign=')) {
    if (resumeCampaign !== undefined) throw new Error('phase7-real accepts --resume-campaign only once');
    resumeCampaign = arg.slice('--resume-campaign='.length);
  } else if (arg.startsWith('--portfolio-plan=')) {
    if (portfolioPlan !== undefined) throw new Error('phase7-real accepts --portfolio-plan only once');
    portfolioPlan = arg.slice('--portfolio-plan='.length);
  } else if (arg.startsWith('--portfolio-authorization=')) {
    if (portfolioAuthorization !== undefined) throw new Error('phase7-real accepts --portfolio-authorization only once');
    portfolioAuthorization = arg.slice('--portfolio-authorization='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: npm run campaign:real -- --env=dev --prepare-only [--storage-state=/absolute/external/state.json] [--ui-url=https://verified-host/]');
    console.log('   or: npm run campaign:real -- --env=dev --resume-campaign=campaign:sha256:<24-hex> [--storage-state=/absolute/external/state.json] [--ui-url=https://verified-host/]');
    console.log('Portfolio mode (opt-in): add --portfolio-plan=/absolute/runtime-plan.json --portfolio-authorization=<token>');
    process.exit(0);
  } else {
    throw new Error(`phase7-real does not accept option ${arg}`);
  }
}

if ((portfolioPlan === undefined) !== (portfolioAuthorization === undefined)) {
  throw new Error('phase7-real requires --portfolio-plan and --portfolio-authorization together');
}
if (portfolioPlan !== undefined) {
  if (portfolioPlan.trim() === '' || !path.isAbsolute(portfolioPlan)) throw new Error('phase7-real requires an absolute portfolio plan path');
  let stat;
  try {
    stat = fs.lstatSync(portfolioPlan);
  } catch {
    throw new Error('phase7-real cannot read the portfolio plan file');
  }
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('phase7-real refuses an unsafe portfolio plan path');
}

if (env !== 'dev') throw new Error('phase7-real requires --env=dev; production and next are not Phase 7 targets');
if (prepareOnly && resumeCampaign !== undefined) throw new Error('phase7-real cannot prepare and resume in the same invocation');
if (!prepareOnly && resumeCampaign === undefined) throw new Error('phase7-real requires --prepare-only before the first run or --resume-campaign for execution');
if (resumeCampaign !== undefined && !/^campaign:sha256:[a-f0-9]{24}$/i.test(resumeCampaign)) throw new Error('phase7-real requires a valid campaign ID for --resume-campaign');
if (storage === undefined) storage = path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json');
if (storage.trim() === '' || !path.isAbsolute(storage)) throw new Error('phase7-real requires an absolute external storage-state path');
if (storage === path.join(os.homedir(), '.nightwatch', 'auth', 'ripple-dev-state.json') && fs.existsSync(storage)) {
  const stat = fs.lstatSync(storage);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('phase7-real refuses an unsafe default DEV storage-state path');
  fs.chmodSync(storage, 0o600);
  fs.chmodSync(path.dirname(storage), 0o700);
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.phase7.config.ts', '--project=nightwatch', '--workers=1'], {
  cwd: root,
  env: buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: env,
    NIGHTWATCH_STORAGE_STATE: storage,
    NIGHTWATCH_PHASE_7_REAL: '1',
    NIGHTWATCH_PHASE_7_PREPARE_ONLY: prepareOnly ? '1' : '0',
    NIGHTWATCH_PHASE_7_RESUME_CAMPAIGN: resumeCampaign ?? '',
    NIGHTWATCH_PHASE_7_AUTH_REFRESH: process.env.NIGHTWATCH_PHASE_7_AUTH_REFRESH === '0' ? '0' : '1',
    ...(portfolioPlan === undefined ? {} : { NIGHTWATCH_PHASE_7_PORTFOLIO_PLAN: portfolioPlan }),
    ...(portfolioAuthorization === undefined ? {} : { NIGHTWATCH_PHASE_7_PORTFOLIO_AUTHORIZATION: portfolioAuthorization }),
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
