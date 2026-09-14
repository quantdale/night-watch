#!/usr/bin/env node
/**
 * Phase 2A unauthenticated real-connectivity canary.
 *
 * Preflight runs first and performs no network activity. The canary then runs
 * one dedicated Playwright test with storage state explicitly blank. It never
 * follows links or performs a click/form action.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'observe-canary',
  entry: 'bin/observe-canary.mjs',
  purpose: 'Run one unauthenticated direct-navigation canary after no-network preflight.',
  group: 'owner-gated',
  flags: [
    { name: '--env', shape: 'enum', values: ['dev', 'next'], summary: 'target environment; production is forbidden' },
    { name: '--ui-url', shape: 'string', summary: 'verified HTTPS UI URL override' },
  ],
  json: false,
  authorization: 'OWNER_GATED',
  artifacts: [],
};

const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
if (cli.stop) {
  // --help / --print-metadata / usage already emitted.
} else {
  const envFlag = cli.flags['--env'];
  const env = typeof envFlag === 'string' ? envFlag : undefined;
  const uiUrlFlag = cli.flags['--ui-url'];
  const uiUrl = typeof uiUrlFlag === 'string' ? uiUrlFlag : undefined;
  if (env === undefined) {
    process.stderr.write('[observe-canary] CLI_ARGUMENT_MISSING: --env=dev|next is required; production is forbidden\n');
    process.exitCode = 2;
  } else {
    const preflight = path.join(root, 'bin', 'observe-preflight.mjs');
    const preflightArgs = [preflight, `--env=${env}`];
    if (uiUrl !== undefined) preflightArgs.push(`--ui-url=${uiUrl}`);
    const preflightResult = spawnSync(process.execPath, preflightArgs, {
      cwd: root,
      env: buildChildEnvironment(process.env, { NIGHTWATCH_ENV: env, ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }) }),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    if ((preflightResult.status ?? 1) !== 0) process.exit(preflightResult.status ?? 2);

    const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
    const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
    const result = spawnSync(cmd, ['test', '--config=playwright.canary.config.ts', '--project=nightwatch'], {
      cwd: root,
      env: buildChildEnvironment(process.env, {
        NIGHTWATCH_ENV: env,
        ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
        // An unauthenticated canary must not inherit a user's real state.
        NIGHTWATCH_STORAGE_STATE: '',
        NIGHTWATCH_TRACE: 'off',
        NIGHTWATCH_HEADED: '0',
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    process.exit(result.status ?? 1);
  }
}
