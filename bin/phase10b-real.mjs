#!/usr/bin/env node
/**
 * Phase 10B gated real-run launcher (contained DEV deep-semantic acceptance).
 *
 * ONE acceptance execution only: the fixed ripple-common-exchange-read
 * journey pair (FIRST observation + ONE fresh-context replay) against the
 * canonical verified DEV URL, evaluating the CURRENT real-source v2 DEEP
 * expectation ripple.common-exchange.read.real-source-deep. The first child
 * performs the established no-browser pre-real gate; the second child runs
 * the Phase 10B journey test, which repeats the gate and boolean-only auth
 * validation immediately before every fresh context and performs the deep
 * semantic acceptance assertions.
 *
 * The launcher sets the one-shot gate NIGHTWATCH_PHASE_10B_REAL=1; normal
 * tests/runners never enable this automatically.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { parsePhase10bLauncherArgs, PHASE_10B_LAUNCHER_USAGE } from './phase10b-launcher-args.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parsed = parsePhase10bLauncherArgs(process.argv.slice(2));
if (parsed.help) {
  console.log(PHASE_10B_LAUNCHER_USAGE);
  process.exit(0);
}
if (parsed.env !== 'dev' || parsed.storageState === undefined || parsed.storageState.trim() === '') {
  throw new Error('phase10b-real requires exactly one --env=dev and --storage-state=/absolute/external/state.json; NEXT and production are forbidden');
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const commonEnv = buildChildEnvironment(process.env, {
  NIGHTWATCH_ENV: parsed.env,
  NIGHTWATCH_STORAGE_STATE: parsed.storageState,
  NIGHTWATCH_PHASE_10B_REAL: '1',
  NIGHTWATCH_TRACE: 'off',
  NIGHTWATCH_HEADED: '0',
  ...(process.env.NIGHTWATCH_PHASE_10B_CI_RUN_ID === undefined ? {} : { NIGHTWATCH_PHASE_10B_CI_RUN_ID: process.env.NIGHTWATCH_PHASE_10B_CI_RUN_ID }),
});

const gate = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: commonEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
if ((gate.status ?? 1) !== 0) process.exit(gate.status ?? 2);

const run = spawnSync(cmd, ['test', '--config=playwright.phase10b.config.ts', '--project=nightwatch', '--workers=1'], {
  cwd: root,
  env: commonEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 15 * 60 * 1000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(run.status ?? 1);
