#!/usr/bin/env node
/**
 * Parent-process human-led authenticated storage-state capture.
 *
 * This command intentionally does not invoke `playwright test`. It loads the
 * guarded TypeScript library modules into this Node process, launches Chrome
 * through the Playwright Library API, and owns the interactive terminal wait.
 * Credentials and MFA values are entered only by the human in the headed
 * browser; Nightwatch never receives or prints them.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED = new Set(['dev', 'next']);

function usage() {
  console.log('Usage: npm run auth:capture -- --env=dev|next --output=/absolute/user-owned/ripple-state.json [--ui-url=https://verified-host/]');
  console.log('Human login/MFA is performed in the headed browser; Nightwatch never receives credentials.');
  console.log('An existing external state at the requested path is replaced atomically only after fresh capture validation.');
}

function fail(message) {
  console.error(`[auth:capture] FAIL: ${message}`);
  process.exit(2);
}

function printStage(event) {
  if (event.status === 'START') {
    console.log(`[auth:capture] STAGE ${event.stage} START`);
    return;
  }
  if (event.status === 'PASS') {
    console.log(`[auth:capture] STAGE ${event.stage} PASS`);
    return;
  }
  console.error('[auth:capture] FAIL');
  console.error(`stage: ${event.stage}`);
  console.error(`reason: ${event.reason ?? `${event.stage}_FAILED`}`);
  if (event.expected) {
    console.error(`expected: ${event.expected.origin}${event.expected.path}`);
  }
  if (event.actual) {
    console.error(`actual-origin: ${event.actual.origin}`);
    console.error(`actual-path: ${event.actual.path}`);
  }
  if (event.monitorReason) console.error(`monitor-reason: ${event.monitorReason}`);
  if (event.monitor) {
    if (event.monitor.host) console.error(`host: ${event.monitor.host}`);
    if (event.monitor.origin) console.error(`monitor-origin: ${event.monitor.origin}`);
    if (event.monitor.path) console.error(`monitor-path: ${event.monitor.path}`);
    if (event.monitor.policyClassification) console.error(`policy-classification: ${event.monitor.policyClassification}`);
    if (event.monitor.policyDecision) console.error(`policy-decision: ${event.monitor.policyDecision}`);
    if (event.monitor.guardType) console.error(`guard-type: ${event.monitor.guardType}`);
    if (event.monitor.lifecycleEvent) console.error(`lifecycle-event: ${event.monitor.lifecycleEvent}`);
    if (event.monitor.issueCategory) console.error(`event-category: ${event.monitor.issueCategory}`);
  }
  if (event.detail) console.error(`detail: ${event.detail}`);
}

/** Load the canonical TypeScript safety modules without a test runner. */
function loadTypeScriptModule(file) {
  const require = createRequire(import.meta.url);
  const typescript = require('typescript');
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = typescript.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }).outputText;
    module._compile(output, filename);
  };
  try {
    return require(file);
  } finally {
    if (previous === undefined) delete require.extensions['.ts'];
    else require.extensions['.ts'] = previous;
  }
}

function waitForHumanEnter() {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    const finish = () => {
      prompt.close();
      resolve();
    };
    prompt.once('line', finish);
    prompt.once('SIGINT', () => {
      prompt.close();
      reject(new Error('human cancelled capture'));
    });
  });
}

async function main() {
  let env;
  let uiUrl;
  let output;
  for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      usage();
      return;
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
  if (fs.existsSync(outputPath) && !fs.statSync(outputPath).isFile()) fail('--output must be a regular file when an existing path is replaced');
  const parent = path.dirname(outputPath);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) fail('--output parent directory must already exist');
  try {
    fs.accessSync(parent, fs.constants.W_OK);
  } catch {
    fail('--output parent directory is not writable');
  }
  const mode = fs.statSync(parent).mode;
  if ((mode & 0o002) !== 0 && (mode & 0o1000) === 0) fail('--output parent is world-writable without sticky protection');
  if ((process.env.NIGHTWATCH_STORAGE_STATE ?? '').trim() !== '') fail('direct capture refuses an existing NIGHTWATCH_STORAGE_STATE');

  printStage({ stage: 'PREFLIGHT', status: 'START' });
  const preflight = spawnSync(process.execPath, [path.join(root, 'bin', 'observe-preflight.mjs'), `--env=${env}`, ...(uiUrl === undefined ? [] : [`--ui-url=${uiUrl}`])], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (preflight.stdout) process.stdout.write(preflight.stdout);
  if (preflight.status !== 0) {
    printStage({ stage: 'PREFLIGHT', status: 'FAIL', reason: 'PREFLIGHT_REJECTED' });
    process.exit(preflight.status ?? 2);
  }
  printStage({ stage: 'PREFLIGHT', status: 'PASS' });

  const environmentModule = loadTypeScriptModule(path.join(root, 'src', 'core', 'environment', 'index.ts'));
  const runnerModule = loadTypeScriptModule(path.join(root, 'src', 'auth', 'directRunner.ts'));
  const environment = environmentModule.selectEnvironment(env);

  // This is the parent CLI's terminal, not a Playwright worker's stdin.
  if (!process.stdin.isTTY) fail('USER_ACTION_REQUIRED: run auth:capture from an interactive terminal so the human can complete login/MFA');

  const result = await runnerModule.runDirectAuthCapture({
    environment,
    uiUrl: uiUrl ?? environment.uiBaseUrl,
    outputPath,
    nightwatchRoot: root,
    stageReporter: printStage,
    onReady: (location) => {
      const configuredOrigin = new URL(environment.uiBaseUrl).origin;
      const isRippleTarget = location.origin === configuredOrigin;
      console.log(`[auth:capture] Guarded headed Chrome is ready on the approved ${env.toUpperCase()} ${isRippleTarget ? 'Ripple target' : `${env.toUpperCase()} authentication host`}.`);
      console.log(`current-origin: ${location.origin}`);
      console.log(`current-path: ${location.path}`);
      console.log('[auth:capture] Complete login/MFA manually, wait until authenticated Ripple is loaded, then press ENTER here.');
    },
    completion: { kind: 'human-parent-cli', wait: waitForHumanEnter },
  });
  console.log(`[auth:capture] PASS: guarded browser and proxy closed; external storage state was structurally validated and safe capture provenance was recorded for ${result.provenance.environment}. Secret values were not printed.`);
}

main().catch((error) => {
  // Do not echo Playwright/browser errors: they may contain page text or URL
  // details from an authenticated session. The recorder retains only sanitized
  // metadata and the human receives a category-only CLI failure.
  if (error && typeof error === 'object' && typeof error.stage === 'string') {
    printStage(error);
  } else {
    console.error('[auth:capture] FAIL: capture stopped before a sanitized successful result; no secret values were printed.');
  }
  process.exitCode = 1;
});
