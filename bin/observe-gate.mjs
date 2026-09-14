#!/usr/bin/env node
/**
 * Phase 2A pre-real-run gate wrapper.
 *
 * The invoked Playwright test starts only the local loopback proxy global
 * setup. The gate test itself creates no browser context and performs no
 * target DNS/TCP activity. A real target is not opened by this command.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { loadTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'observe-gate',
  entry: 'bin/observe-gate.mjs',
  purpose: 'Run the local Phase 2A pre-real-run safety gate without opening a target.',
  group: 'owner-gated',
  flags: [
    { name: '--env', shape: 'enum', values: ['dev', 'next'], summary: 'target environment; production is forbidden' },
    { name: '--storage-state', shape: 'path', summary: 'absolute external storage-state path' },
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
const env = typeof cli.flags['--env'] === 'string' ? cli.flags['--env'] : undefined;
const storage = typeof cli.flags['--storage-state'] === 'string' ? cli.flags['--storage-state'] : undefined;
const uiUrl = typeof cli.flags['--ui-url'] === 'string' ? cli.flags['--ui-url'] : undefined;
if (!env || !storage) {
  console.error('[observe-gate] CLI_ARGUMENT_MISSING: --env=dev|next and --storage-state=/absolute/external/state.json are required');
  process.exit(2);
}

try {
  const { requireValidAuthCapability } = loadTypeScriptModule('src/auth/capabilityLifecycle.ts', { root });
  const configured = JSON.parse(fs.readFileSync(path.join(root, 'config', 'environments', `${env}.json`), 'utf8'));
  const capability = requireValidAuthCapability({
    artefactPath: storage,
    environment: env,
    configuredUiBaseUrl: configured.uiBaseUrl,
    requiredValidityMs: 120_000,
  });
  if (capability.budgetWarning) {
    console.error(`[observe:gate] WARNING ${capability.budgetWarning.code}: remaining validity ${capability.budgetWarning.remainingValidityMs} ms is shorter than the declared run budget ${capability.budgetWarning.requiredValidityMs} ms`);
  }
} catch (error) {
  if (error && typeof error === 'object' && typeof error.code === 'string' && error.code.startsWith('AUTH_CAPABILITY_')) {
    console.error(`[observe:gate] REFUSED ${error.code}: ${error.message}`);
    process.exit(3);
  }
  throw error;
}

const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;
const result = spawnSync(cmd, ['test', '--config=playwright.gate.config.ts', '--project=nightwatch'], {
  cwd: root,
  env: buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: env,
    ...(uiUrl === undefined ? {} : { NIGHTWATCH_UI_URL: uiUrl }),
    NIGHTWATCH_STORAGE_STATE: storage,
    NIGHTWATCH_TRACE: 'off',
    NIGHTWATCH_HEADED: '0',
  }),
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 120_000,
  maxBuffer: 2 * 1024 * 1024,
});
process.exit(result.status ?? 1);
}
