#!/usr/bin/env node

// Authoritative launcher for the deterministic synthetic campaign.
//
// This exists because the quality gate could report only that the campaign
// failed, never which cases failed. The gate deliberately discards child
// output, and its receipt parser understood exactly one structured schema
// (`nightwatch.semantic-compatibility.v1`), so a Playwright-backed group could
// not contribute diagnostics at all. An exact-head CI failure was therefore
// undebuggable from its own authoritative receipt.
//
// The fix is a bounded, categorical receipt — never raw child output. What
// crosses this boundary is: integer counts, test-file locations already
// present in this repository as tracked paths, and fixed enum classifications.
// Source contents, assertion values, environment values, stack frames,
// credentials and arbitrary child stderr never do.
//
// The file list is a versioned data-only manifest invoked as argv entries with
// shell=false; manifest values cannot become commands, flags, selectors, or
// paths outside `tests/`.
//
// F-PERF-6: the campaign may additionally run its declared file set as
// concurrent shards under the same determinism contract — every invocation
// stays `workers=1` / `retries=0`, the partition is a coverage-proven function
// of the declared execution classes (so guarded-source and Git-mutating tests
// still run alone), and the serial single-invocation path remains available
// unchanged as the fallback.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'campaign-synthetic',
  entry: 'bin/campaign-synthetic.mjs',
  purpose: 'Run the versioned deterministic synthetic campaign and emit a bounded receipt.',
  group: 'validate',
  flags: [
    { name: '--validate', shape: 'boolean', summary: 'validate the manifest without dispatching Playwright' },
    { name: '--shards', shape: 'integer', summary: 'concurrent shard count (1..8; 1 keeps the serial single invocation)' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};
const manifestPath = path.join(root, 'config', 'synthetic-campaign.v1.json');
const classesPath = path.join(root, 'config', 'validation-execution-classes.v1.json');
const weightsPath = path.join(root, 'config', 'shard-weights.v1.json');
const SCHEMA_VERSION = 'nightwatch.synthetic-campaign.v1';
const filePattern = /^tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts$/;
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function fail(code) {
  throw new Error(code);
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== SCHEMA_VERSION) fail('SYNTHETIC_CAMPAIGN_SCHEMA_UNSUPPORTED');
  // Serial, zero-retry execution is a determinism contract, not a preference:
  // retries would let a nondeterministic failure pass, and parallel workers
  // inside one invocation would let namespace/port-binding suites interfere.
  // F-PERF-6 keeps that contract PER INVOCATION and adds a coverage-proven
  // partition across invocations.
  if (manifest.execution?.project !== 'nightwatch' || manifest.execution?.workers !== 1 || manifest.execution?.retries !== 0 || manifest.execution?.serial !== true) {
    fail('SYNTHETIC_CAMPAIGN_EXECUTION_INVALID');
  }
  const declaredShardCount = manifest.execution?.shardCount;
  if (declaredShardCount !== undefined && (!Number.isInteger(declaredShardCount) || declaredShardCount < 1 || declaredShardCount > 8)) {
    fail('SYNTHETIC_CAMPAIGN_SHARD_COUNT_INVALID');
  }
  const maxFailedLocations = manifest.diagnostics?.maxFailedLocations;
  if (!Number.isInteger(maxFailedLocations) || maxFailedLocations < 1 || maxFailedLocations > 64) fail('SYNTHETIC_CAMPAIGN_DIAGNOSTICS_INVALID');
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail('SYNTHETIC_CAMPAIGN_FILES_INVALID');
  const files = [];
  const seen = new Set();
  for (const file of manifest.files) {
    if (typeof file !== 'string' || file.includes('..') || !filePattern.test(file) || seen.has(file)) fail(`SYNTHETIC_CAMPAIGN_FILE_INVALID:${String(file)}`);
    if (!fs.existsSync(path.join(root, file))) fail(`SYNTHETIC_CAMPAIGN_FILE_MISSING:${file}`);
    seen.add(file);
    files.push(file);
  }
  return { manifest, files, maxFailedLocations };
}

// The deep L6 lane is a HOST capability. Recording which lane actually ran
// keeps a green receipt from implying containment coverage the run never had.
// The classification comes from the same predicate the runtime and the tests
// use, so the three can never disagree.
function deepContainmentLane() {
  try {
    const [l6] = loadTypeScriptModules(['src/core/oops/l6.ts'], { root });
    const availability = l6.l6ContainmentAvailability();
    return availability.available ? 'PROVEN' : `NOT_EXERCISED_${availability.blockerCode ?? 'UNKNOWN'}`;
  } catch {
    return 'NOT_EXERCISED_CLASSIFICATION_UNAVAILABLE';
  }
}

function campaignEnvironment(lane) {
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'SYNTHETIC_CAMPAIGN', NIGHTWATCH_TIMING_LANE: lane });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of ['NIGHTWATCH_PROXY_PORT', 'NIGHTWATCH_PROXY_LEASE_TOKEN', 'NIGHTWATCH_PROXY_LEASE_PATH', 'NIGHTWATCH_PROXY_LEASE_OWNER_PID']) delete environment[key];
  return environment;
}

function playwrightArguments(fileList, project, outputDir) {
  return ['playwright', 'test', ...fileList, `--project=${project}`, '--workers=1', '--retries=0', `--output=${outputDir}`];
}

function parseCampaignOutput(output, status, maxFailedLocations) {
  const count = (pattern) => { const match = pattern.exec(output); return match ? Number(match[1]) : null; };
  const passed = count(/(\d+)\s+passed/i);
  const skipped = count(/(\d+)\s+skipped/i);
  // Playwright reports tests it never reached as "did not run", NOT as
  // "skipped". A serial suite whose first case fails cascades every remaining
  // case into that bucket. The gate's aggregate parser could not see the word,
  // so five cases once vanished from an authoritative receipt without trace.
  const didNotRun = count(/(\d+)\s+did not run/i);
  let failed = count(/(\d+)\s+failed/i);
  if (status === 0 && failed === null) failed = 0;
  const total = [passed, skipped, failed, didNotRun]
    .map((value) => (Number.isInteger(value) ? value : 0))
    .reduce((left, right) => left + right, 0);
  // Only the tracked test path and 1-based line survive; the failure message,
  // received/expected values and stack are intentionally discarded here.
  const failedLocations = [...output.matchAll(/^\s*\d+\)\s+\[[^\]]+\]\s+›\s+(tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts):(\d+)(?::\d+)?\s+›/gm)]
    .map((match) => `${match[1]}:${match[2]}`)
    .filter((location, index, all) => all.indexOf(location) === index)
    .slice(0, maxFailedLocations);
  return { total, passed, skipped, didNotRun, failed, failedLocations };
}

function runInvocation(fileList, outputDir, lane, project) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(npx, playwrightArguments(fileList, project, outputDir), {
      cwd: root,
      env: campaignEnvironment(lane),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', () => resolve({ output, status: 1, errorCode: 'SPAWN_ERROR', wallMs: Date.now() - startedAt }));
    child.on('close', (code) => resolve({ output, status: code, errorCode: null, wallMs: Date.now() - startedAt }));
  });
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
try {
  const { manifest, files, maxFailedLocations } = loadManifest();
  // `--validate` is the bounded, contact-free observation surface: it proves
  // the manifest resolves to a complete, existing, uniquely-named file set
  // without dispatching Playwright. The default invocation remains the
  // authoritative campaign.
  if (process.argv.slice(2).includes('--validate')) {
    console.log(JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      result: 'VALID',
      fileCount: files.length,
      project: manifest.execution.project,
      workers: manifest.execution.workers,
      retries: manifest.execution.retries,
      shardCount: manifest.execution.shardCount ?? 1,
    }));
  } else {
  const requestedShards = cli.flags['--shards'] === undefined ? (manifest.execution.shardCount ?? 1) : Number(cli.flags['--shards']);
  if (!Number.isInteger(requestedShards) || requestedShards < 1 || requestedShards > 8) {
    console.error(JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: 'CONFIG_INVALID', code: 'SYNTHETIC_CAMPAIGN_SHARD_COUNT_INVALID' }));
    process.exitCode = 2;
  } else {
  const deepLane = deepContainmentLane();
  if (requestedShards === 1) {
    const result = await runInvocation(files, 'test-results/synthetic-1', 'campaign-synthetic', manifest.execution.project);
    const counts = parseCampaignOutput(result.output, result.status, maxFailedLocations);
    const receipt = {
      schemaVersion: SCHEMA_VERSION,
      fileCount: files.length,
      ...counts,
      shardCount: 1,
      deepContainmentLane: deepLane,
      result: result.status === 0 ? 'PASS' : result.errorCode === 'ETIMEDOUT' ? 'TIMEOUT' : 'TEST_FAILURE',
    };
    console.log(JSON.stringify(receipt));
    process.exitCode = result.status === 0 ? 0 : 1;
  } else {
    const [shardPlan] = loadTypeScriptModules(['src/core/validation/shardPlan.ts'], { root });
    const classesDeclaration = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
    const classes = {};
    for (const file of files) {
      const entry = classesDeclaration.files?.[file];
      if (entry === undefined) fail(`SYNTHETIC_CAMPAIGN_CLASS_MISSING:${file}`);
      classes[file] = entry.class;
    }
    let weights = null;
    try {
      const stored = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
      if (stored.schemaVersion === 'nightwatch.shard-weights.v1' && stored.weights !== null && typeof stored.weights === 'object') {
        weights = {};
        for (const file of files) if (typeof stored.weights[file] === 'number' && Number.isFinite(stored.weights[file])) weights[file] = stored.weights[file];
      }
    } catch {
      weights = null;
    }
    const plan = shardPlan.planShards({ universe: files, classes, parallelShardCount: requestedShards, ...(weights === null ? {} : { weights }) });
    const allShards = plan.exclusiveShard === null ? plan.parallelShards : [...plan.parallelShards, plan.exclusiveShard];
    const coverage = shardPlan.verifyShardCoverage({ universe: files, shards: allShards });
    if (!coverage.ok || plan.universeCount !== files.length) {
      console.error(JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: 'CONFIG_INVALID', code: 'SYNTHETIC_CAMPAIGN_COVERAGE_VIOLATION', coverage, fileCount: files.length }));
      process.exitCode = 2;
    } else {
      const parallelResults = await Promise.all(plan.parallelShards.map((shard) => runInvocation(shard.files, `test-results/synthetic-${shard.id}`, `campaign-synthetic-${shard.id}`, manifest.execution.project)));
      const exclusiveResults = plan.exclusiveShard === null ? [] : [await runInvocation(plan.exclusiveShard.files, 'test-results/synthetic-exclusive', 'campaign-synthetic-exclusive', manifest.execution.project)];
      const results = [...parallelResults, ...exclusiveResults];
      const failedLocations = [];
      const totals = { total: 0, passed: 0, skipped: 0, didNotRun: 0, failed: 0 };
      const parsed = results.map((result) => ({ result, counts: parseCampaignOutput(result.output, result.status, maxFailedLocations) }));
      for (const entry of parsed) {
        for (const key of Object.keys(totals)) totals[key] += entry.counts[key] ?? 0;
        failedLocations.push(...entry.counts.failedLocations);
      }
      const failed = parsed.some((entry) => entry.result.status !== 0 || (entry.counts.failed ?? 0) > 0 || (entry.counts.didNotRun ?? 0) > 0);
      const receipt = {
        schemaVersion: SCHEMA_VERSION,
        fileCount: files.length,
        ...totals,
        failedLocations: [...new Set(failedLocations)].slice(0, maxFailedLocations),
        shardCount: plan.parallelShards.length + (plan.exclusiveShard === null ? 0 : 1),
        planDigest: plan.planDigest,
        universeDigest: plan.universeDigest,
        coverage,
        shardWallMs: results.map((result) => result.wallMs),
        deepContainmentLane: deepLane,
        result: failed ? 'TEST_FAILURE' : 'PASS',
      };
      console.log(JSON.stringify(receipt));
      process.exitCode = failed ? 1 : 0;
    }
  }
  }
  }
} catch (error) {
  console.error(JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'SYNTHETIC_CAMPAIGN_INVALID' }));
  process.exitCode = 2;
}
}
