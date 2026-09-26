#!/usr/bin/env node

// The Phase 9–26 compatibility cone is a versioned file manifest. It is
// intentionally invoked as argv entries with shell=false; manifest values
// cannot become commands, flags, paths outside tests, or selectors.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';
import { evaluateSemanticSkipPolicy } from './lib/semantic-skip-policy.mjs';
import { extractSanitizedFailedLocations } from './lib/sanitized-failure-locations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'config', 'semantic-compatibility.v1.json');
const acceptanceClassPath = path.join(root, 'config', 'semantic-acceptance-class.v1.json');
const filePattern = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'semantic-compat',
  entry: 'bin/semantic-compat.mjs',
  purpose: 'Validate the Phase 9-26 compatibility manifest or run the full compatibility cone.',
  group: 'validate',
  flags: [
    { name: '--validate', shape: 'boolean', summary: 'validate the manifest without dispatching a suite' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function fail(code) {
  throw new Error(code);
}

// Group 11 (F-10): the semantic capability's acceptance class is part of any
// presentation of this lane. It is read from the versioned data file (the
// same source the TS module validates), so the bin cannot present the
// capability as DEV-accepted while the class says otherwise.
function loadSemanticAcceptanceClass() {
  const value = JSON.parse(fs.readFileSync(acceptanceClassPath, 'utf8'));
  if (value.schemaVersion !== 'nightwatch.semantic-acceptance-class.v1') fail('SEMANTIC_ACCEPTANCE_CLASS_SCHEMA_UNSUPPORTED');
  if (typeof value.acceptanceClass !== 'string' || typeof value.devResult !== 'string') fail('SEMANTIC_ACCEPTANCE_CLASS_INCOMPLETE');
  if (value.blocker !== null && typeof value.blocker !== 'string') fail('SEMANTIC_ACCEPTANCE_CLASS_INCOMPLETE');
  return {
    acceptanceClass: value.acceptanceClass,
    devResult: value.devResult,
    blocker: value.blocker,
  };
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 'nightwatch.semantic-compatibility.v1') fail('SEMANTIC_COMPATIBILITY_SCHEMA_UNSUPPORTED');
  if (manifest.requiredPhaseRange?.first !== 9 || manifest.requiredPhaseRange?.last !== 26) fail('SEMANTIC_COMPATIBILITY_PHASE_RANGE_INVALID');
  if (manifest.execution?.project !== 'nightwatch' || manifest.execution?.workers !== 1 || manifest.execution?.serial !== true) fail('SEMANTIC_COMPATIBILITY_EXECUTION_INVALID');
  const files = [];
  const seen = new Set();
  const phases = new Set();
  for (const suite of manifest.phaseSuites ?? []) {
    if (!Number.isFinite(suite.phase) || phases.has(suite.phase)) fail('SEMANTIC_COMPATIBILITY_SUITE_INVALID');
    phases.add(suite.phase);
    for (const file of suite.files ?? []) {
      if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || seen.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
      if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
      seen.add(file);
      files.push(file);
    }
  }
  for (const file of manifest.supportFiles ?? []) {
    if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || seen.has(file)) fail(`SEMANTIC_COMPATIBILITY_FILE_INVALID:${String(file)}`);
    if (!fs.existsSync(path.join(root, file))) fail(`SEMANTIC_COMPATIBILITY_FILE_MISSING:${file}`);
    seen.add(file);
    files.push(file);
  }
  for (let phase = 9; phase <= 26; phase += 1) {
    if (![...phases].some((candidate) => Math.floor(candidate) === phase)) fail(`SEMANTIC_COMPATIBILITY_PHASE_OMITTED:${phase}`);
  }
  return { manifest, files };
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
try {
  const { manifest, files } = loadManifest();
  // `--validate` is the bounded, contact-free observation surface: it proves
  // the manifest resolves to a complete 9..26 phase cone without dispatching
  // Playwright. The default invocation remains the full compatibility lane.
  if (process.argv.slice(2).includes('--validate')) {
    console.log(JSON.stringify({
      schemaVersion: manifest.schemaVersion,
      result: 'VALID',
      phaseRange: manifest.requiredPhaseRange,
      phaseCount: manifest.phaseSuites.length,
      fileCount: files.length,
      semanticAcceptance: loadSemanticAcceptanceClass(),
    }));
  } else {
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'COMPATIBILITY', NIGHTWATCH_TIMING_LANE: 'semantic-compatibility' });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of ['NIGHTWATCH_PROXY_PORT', 'NIGHTWATCH_PROXY_LEASE_TOKEN', 'NIGHTWATCH_PROXY_LEASE_PATH', 'NIGHTWATCH_PROXY_LEASE_OWNER_PID']) delete environment[key];
  // The list reporter keeps the existing human counts; the JSON reporter
  // (directed to a bounded temporary file, never stdout) carries the skip
  // identities the policy compares.
  const skipReportPath = path.join(os.tmpdir(), `nightwatch-semantic-compat-${process.pid}.json`);
  environment.PLAYWRIGHT_JSON_OUTPUT_NAME = skipReportPath;
  const npx = (() => { const b = path.join(root, 'node_modules', '.bin', 'playwright'); return process.platform === 'win32' ? `${b}.cmd` : b; })();
  const result = spawnSync(npx, ['test', ...files, '--project=nightwatch', '--workers=1', '--reporter=list', '--reporter=json'], {
    cwd: root,
    env: environment,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 1_200_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const count = (pattern) => { const match = pattern.exec(output); return match ? Number(match[1]) : null; };
  const passed = count(/(\d+)\s+passed/i);
  const skipped = count(/(\d+)\s+skipped/i);
  let failed = count(/(\d+)\s+failed/i);
  const totalFromOutput = count(/Total:\s*(\d+)\s+tests?/i);
  if (result.status === 0 && failed === null) failed = 0;
  const total = totalFromOutput ?? ([passed, skipped, failed].every((value) => Number.isInteger(value)) ? passed + skipped + failed : null);
  const failedLocations = extractSanitizedFailedLocations(output, 16);

  let skipReport = null;
  try {
    skipReport = JSON.parse(fs.readFileSync(skipReportPath, 'utf8'));
  } catch {
    skipReport = null;
  }
  try {
    fs.rmSync(skipReportPath, { force: true });
  } catch {
    // A leftover temporary report is not evidence; removal is best-effort.
  }
  const skipPolicy = evaluateSemanticSkipPolicy({
    report: skipReport,
    canonicalSkipIdentities: manifest.execution?.canonicalSkipIdentities,
    expectedSkipPolicy: manifest.execution?.expectedSkipPolicy,
  });
  const undeclaredSkips = skipPolicy.undeclared.slice(0, 16).map((identity) => `${identity.file}:${identity.line ?? '?'}`);
  let outcome = result.status === 0 ? 'PASS' : result.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'TEST_FAILURE';
  let exitCode = result.status === 0 ? 0 : 1;
  if (skipPolicy.result === 'SKIP_POLICY_UNCONFIGURED') {
    outcome = 'SKIP_POLICY_UNCONFIGURED';
    exitCode = 1;
  } else if (skipPolicy.result === 'UNDECLARED_SKIP') {
    outcome = 'UNDECLARED_SKIP';
    exitCode = 1;
  } else if (skipReport === null) {
    // Exit 0 without a readable report cannot be trusted as a pass.
    outcome = 'SEMANTIC_COMPATIBILITY_REPORT_UNREADABLE';
    exitCode = 1;
  }
  const receipt = {
    schemaVersion: manifest.schemaVersion,
    phaseRange: manifest.requiredPhaseRange,
    phaseCount: manifest.phaseSuites.length,
    fileCount: files.length,
    semanticAcceptance: loadSemanticAcceptanceClass(),
    total,
    passed,
    skipped,
    failed,
    failedLocations,
    skipPolicy: {
      result: skipPolicy.result,
      declared: skipPolicy.declared ?? 0,
      undeclared: skipPolicy.undeclared.length,
      undeclaredSkips,
    },
    result: outcome,
  };
  console.log(JSON.stringify(receipt));
  process.exitCode = exitCode;
  }
} catch (error) {
  console.error(JSON.stringify({ schemaVersion: 'nightwatch.semantic-compatibility.v1', result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'SEMANTIC_COMPATIBILITY_INVALID' }));
  process.exitCode = 2;
}
}
