#!/usr/bin/env node
/**
 * Nightwatch CLI (Phase 0/1).
 *
 * Wraps the Playwright test runner with Nightwatch's fail-closed environment
 * selection. production is NOT supported.
 *
 * Usage:
 *   node bin/nightwatch.mjs --env=local [--ui-url=http://127.0.0.1:8080]
 *                           [--product=ripple] [--scenario=scenarios/ripple/local.smoke.ts]
 *                           [-- playwright-test-args...]
 *
 * Environment selection is REQUIRED; missing or unsupported -> exit 2.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildChildEnvironment, emitChildStdio } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';
import { operatorCommandListing } from './lib/operator-command-listing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operatorCommands = new Set(['status', 'plan', 'coverage', 'campaign', 'contracts', 'gaps', 'differential', 'replay-coverage', 'minimization-coverage', 'mutation-score', 'findings', 'explain']);

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch',
  entry: 'bin/nightwatch.mjs',
  purpose: 'Run a scenario, or dispatch to an operator command or the local agent.',
  group: 'run-scenario',
  usage: 'node bin/nightwatch.mjs help | --env=local|dev|next [--ui-url=...] [--scenario=...] | <operator-command> ... | agent ...',
  commands: [
    { name: 'scenario', summary: 'Run one Playwright scenario with fail-closed environment selection' },
    { name: 'agent', summary: 'Dispatch to the local agent surface' },
    { name: 'status', summary: 'Show the local operator status' },
    { name: 'plan', summary: 'Show the campaign plan' },
    { name: 'coverage', summary: 'Show campaign coverage' },
    { name: 'campaign', summary: 'Show the campaign operator view' },
    { name: 'contracts', summary: 'Show the contract inventory' },
    { name: 'gaps', summary: 'Show the gap ledger' },
    { name: 'differential', summary: 'Show differential results' },
    { name: 'replay-coverage', summary: 'Show replay coverage' },
    { name: 'minimization-coverage', summary: 'Show minimization coverage' },
    { name: 'mutation-score', summary: 'Show the mutation score' },
    { name: 'findings', summary: 'Show local findings metadata' },
    { name: 'explain', summary: 'Explain one local surface' },
  ],
  defaultCommand: 'scenario',
  flags: [
    { name: '--env', shape: 'string', summary: 'select the scenario environment (local, dev, next)' },
    { name: '--ui-url', shape: 'string', summary: 'point the scenario at a local UI URL' },
    { name: '--product', shape: 'string', summary: 'select the product fixture' },
    { name: '--scenario', shape: 'path', summary: 'select the scenario file' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/<run-id>/ scenario evidence'],
  trailing: { summary: 'operator-command arguments and Playwright test arguments' },
};

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    console.log(`Usage: ${CLI_METADATA.usage}`);
    console.log('');
    console.log(operatorCommandListing(root).text);
    return;
  }
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;

  if (args[0] === 'agent') {
    const result = spawnSync(process.execPath, [path.join(root, 'bin', 'nightwatch-agent.mjs'), ...args.slice(1)], {
      cwd: root,
      env: buildChildEnvironment(process.env, {
        NIGHTWATCH_OPERATOR_SCOPE: 'LOCAL_SYNTHETIC_ONLY',
        NIGHTWATCH_REASONER_CLI: process.env.NIGHTWATCH_REASONER_CLI,
        NIGHTWATCH_REASONER_SCRIPT: process.env.NIGHTWATCH_REASONER_SCRIPT,
        NIGHTWATCH_REASONER_PROVIDER: process.env.NIGHTWATCH_REASONER_PROVIDER,
        NIGHTWATCH_REASONER_MODEL: process.env.NIGHTWATCH_REASONER_MODEL,
        NIGHTWATCH_PRINT_CLI: process.env.NIGHTWATCH_PRINT_CLI,
        NIGHTWATCH_PRINT_ARGS: process.env.NIGHTWATCH_PRINT_ARGS,
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
      maxBuffer: 2 * 1024 * 1024,
      shell: false,
    });
    emitChildStdio(result);
    process.exitCode = result.status ?? 1;
  } else if (operatorCommands.has(args[0])) {
    const result = spawnSync(process.execPath, [path.join(root, 'bin', 'nightwatch-intelligence.mjs'), ...args], {
      cwd: root,
      env: buildChildEnvironment(process.env, { NIGHTWATCH_OPERATOR_SCOPE: 'LOCAL_SYNTHETIC_ONLY' }),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    // Do not call process.exit here: stdout may still be draining when the
    // operator payload is larger than the pipe buffer. Explicit exit truncated
    // the Phase 21 gap ledger and made legacy JSON consumers see invalid JSON.
    process.exitCode = result.status ?? 1;
  } else {
    const envVars = {};
    let scenario = null;
    const rest = [];
    const SUPPORTED = new Set(['local', 'dev', 'next']);

    for (const a of args) {
      if (a.startsWith('--env=')) envVars.NIGHTWATCH_ENV = a.slice('--env='.length);
      else if (a.startsWith('--ui-url=')) envVars.NIGHTWATCH_UI_URL = a.slice('--ui-url='.length);
      else if (a.startsWith('--product=')) envVars.NIGHTWATCH_PRODUCT = a.slice('--product='.length);
      else if (a.startsWith('--scenario=')) scenario = a.slice('--scenario='.length);
      else rest.push(a);
    }

    if (!envVars.NIGHTWATCH_ENV) {
      console.error(
        'NIGHTWATCH: fail-closed — no environment selected.\n' +
          '  Usage: node bin/nightwatch.mjs --env=local|dev|next [--ui-url=...] [--scenario=...]\n' +
          '  production is NOT supported in Phase 1.'
      );
      process.exitCode = 2;
      return;
    }
    if (!SUPPORTED.has(envVars.NIGHTWATCH_ENV)) {
      console.error(`NIGHTWATCH: fail-closed — environment "${envVars.NIGHTWATCH_ENV}" is not supported (allowed: local, dev, next).`);
      process.exitCode = 2;
      return;
    }

    const scenarioPath = scenario ?? path.join('scenarios', 'ripple', 'local.smoke.ts');
    const pwBin = path.join(root, 'node_modules', '.bin', 'playwright');
    const cmd = process.platform === 'win32' ? `${pwBin}.cmd` : pwBin;

    const res = spawnSync(cmd, ['test', scenarioPath, '--project=nightwatch', ...rest], {
      cwd: root,
      env: buildChildEnvironment(process.env, envVars),
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000,
      maxBuffer: 2 * 1024 * 1024,
    });
    emitChildStdio(res);
    process.exitCode = res.status ?? 1;
  }
}

if (invokedDirectly(import.meta.url)) main();
