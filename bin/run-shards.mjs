#!/usr/bin/env node

// F-PERF-3: concurrency-preserving shard runner.
//
//   node bin/run-shards.mjs [--dry-run] [--json] [--workers=N] [--files=a,b]
//
// The universe is the authoritative `playwright test --list --reporter=json`
// discovery, never a heuristic directory walk. Every universe file must carry
// a declared execution class; the plan must satisfy union == universe and
// pairwise disjointness; parallel-eligible files run as concurrent serial
// invocations, and `SERIAL_REQUIRED` / `MUTATION_CAMPAIGN_EXCLUSIVE` files run
// in one exclusive invocation after every concurrent shard has exited, so two
// Git-mutating tests can never overlap.
//
// Fail-closed: an unclassified file, an invalid worker override, a coverage
// violation, or an argv-bound violation refuses the run before anything
// executes.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLASSES_PATH = path.join(root, 'config', 'validation-execution-classes.v1.json');
const WEIGHTS_PATH = path.join(root, 'config', 'shard-weights.v1.json');
const npx = (() => { const b = path.join(root, 'node_modules', '.bin', 'playwright'); return process.platform === 'win32' ? `${b}.cmd` : b; })();

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'run-shards',
  entry: 'bin/run-shards.mjs',
  purpose: 'Run the declared test universe as coverage-proven concurrent shards with an exclusive serial group.',
  group: 'validate',
  flags: [
    { name: '--dry-run', shape: 'boolean', summary: 'print the plan and coverage proof without executing' },
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON receipt document' },
    { name: '--workers', shape: 'integer', summary: 'parallel shard count (bounded 1..8; default 2)' },
    { name: '--files', shape: 'string', summary: 'comma-separated explicit file selection instead of full discovery' },
    { name: '--weights', shape: 'path', summary: 'measured per-file duration table for deterministic balancing (default config/shard-weights.v1.json when present)' },
    { name: '--serial', shape: 'boolean', summary: 'run the whole universe in one invocation (the historical shape) for comparison or fallback' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['test-results/<shard>/ per invocation, test-results/timings/ telemetry'],
};

function discoverUniverse() {
  const result = spawnSync(npx, ['test', '--list', '--reporter=json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 || result.error) throw new Error('SHARD_UNIVERSE_DISCOVERY_FAILED');
  let report;
  try {
    report = JSON.parse(result.stdout ?? '');
  } catch {
    throw new Error('SHARD_UNIVERSE_REPORT_UNREADABLE');
  }
  const files = new Set();
  const walk = (suites) => {
    for (const suite of suites ?? []) {
      if (typeof suite.file === 'string' && suite.file.length > 0) files.add(path.relative(root, suite.file).split(path.sep).join('/'));
      if (Array.isArray(suite.suites)) walk(suite.suites);
    }
  };
  walk(report.suites ?? []);
  return [...files].sort();
}

function loadWeights(explicitPath) {
  const file = typeof explicitPath === 'string' ? explicitPath : WEIGHTS_PATH;
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (value.schemaVersion !== 'nightwatch.shard-weights.v1' || value.weights === null || typeof value.weights !== 'object') return null;
    const weights = {};
    for (const [key, raw] of Object.entries(value.weights)) {
      if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) weights[key] = raw;
    }
    return weights;
  } catch {
    return null;
  }
}

function loadClasses() {
  const declaration = JSON.parse(fs.readFileSync(CLASSES_PATH, 'utf8'));
  const classes = {};
  for (const [file, entry] of Object.entries(declaration.files ?? {})) classes[file] = entry.class;
  return classes;
}

function childEnvironment(lane, receiptPath, shardId) {
  const environment = buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: 'local',
    NIGHTWATCH_GATE_ENVIRONMENT: 'SHARDS',
    NIGHTWATCH_TIMING_LANE: lane,
    NIGHTWATCH_SHARD_RECEIPT_PATH: receiptPath,
    NIGHTWATCH_SHARD_ID: shardId,
    NODE_OPTIONS: '--expose-gc',
  });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of ['NIGHTWATCH_PROXY_PORT', 'NIGHTWATCH_PROXY_LEASE_TOKEN', 'NIGHTWATCH_PROXY_LEASE_PATH', 'NIGHTWATCH_PROXY_LEASE_OWNER_PID']) delete environment[key];
  return environment;
}

function shardReceiptPath(shard) {
  return path.join(root, 'test-results', shard.id, 'shard-execution.json');
}

function parseTextCounts(output) {
  const lastNumber = (pattern) => {
    let last = null;
    for (const match of output.matchAll(pattern)) last = Number(match[1]);
    return last;
  };
  return {
    passed: lastNumber(/(\d+)\s+passed/gi),
    failed: lastNumber(/(\d+)\s+failed/gi),
    skipped: lastNumber(/(\d+)\s+skipped/gi),
    didNotRun: lastNumber(/(\d+)\s+did not run/gi),
  };
}

function emptyCounts() {
  return { planned: null, executed: null, passed: null, failed: null, skipped: null, didNotRun: null, unknown: null };
}

function emptyExecutionCounts() {
  return { planned: 0, executed: 0, passed: 0, failed: 0, skipped: 0, didNotRun: 0, unknown: 0 };
}

function sumCounts(results) {
  const totals = emptyCounts();
  for (const key of Object.keys(totals)) {
    let sum = 0;
    let known = true;
    for (const result of results) {
      const value = result.counts?.[key];
      if (!Number.isSafeInteger(value) || value < 0) {
        known = false;
        break;
      }
      sum += value;
    }
    totals[key] = known ? sum : null;
  }
  return totals;
}

function executionCodeForDisposition(disposition) {
  if (disposition === 'ALL_SKIPPED') return 'SHARD_ALL_SKIPPED';
  if (disposition === 'NO_TESTS_EXECUTED') return 'SHARD_NO_TESTS_EXECUTED';
  if (disposition === 'UNKNOWN') return 'SHARD_EXECUTION_UNKNOWN';
  return disposition === 'PASS' ? null : 'SHARD_TESTS_FAILED';
}

function runShard(shard, execution) {
  const receiptPath = shardReceiptPath(shard);
  if (shard.files.length === 0) {
    return Promise.resolve({
      id: shard.id,
      files: 0,
      digest: shard.digest,
      exitStatus: 0,
      wallMs: 0,
      counts: emptyExecutionCounts(),
      textCounts: null,
      executionStatus: 'NO_TESTS_EXECUTED',
      executionCode: 'SHARD_NO_TESTS_EXECUTED',
      failedLocations: [],
      errorCode: 'SHARD_NO_TESTS_EXECUTED',
    });
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.rmSync(receiptPath, { force: true });
    const child = spawn(npx, [
      'test',
      ...shard.files,
      '--project=nightwatch',
      '--workers=1',
      '--retries=0',
      '--reporter=list,./tests/helpers/playwrightTimingReporter.ts,./tests/helpers/playwrightShardReporter.ts',
      `--output=test-results/${shard.id}`,
    ], {
      cwd: root,
      env: childEnvironment(shard.id, receiptPath, shard.id),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', () => resolve({
      id: shard.id,
      files: shard.files.length,
      digest: shard.digest,
      exitStatus: 1,
      wallMs: Date.now() - startedAt,
      counts: null,
      textCounts: null,
      executionStatus: 'UNKNOWN',
      executionCode: 'SPAWN_ERROR',
      failedLocations: [],
      errorCode: 'SPAWN_ERROR',
    }));
    child.on('close', (code) => {
      const exitStatus = code === 0 ? 0 : 1;
      const textCounts = parseTextCounts(output);
      let parsed;
      try {
        const serialized = fs.readFileSync(receiptPath, 'utf8');
        parsed = execution.parseShardExecutionReceipt(serialized, shard.id);
      } catch (error) {
        parsed = { ok: false, code: error?.code === 'ENOENT' ? 'SHARD_RECEIPT_MISSING' : 'SHARD_RECEIPT_UNREADABLE' };
      }
      let counts = null;
      let executionStatus = 'UNKNOWN';
      let executionCode = parsed.ok ? null : parsed.code;
      if (parsed.ok) {
        const { receipt, disposition } = parsed;
        counts = {
          planned: receipt.planned,
          executed: receipt.executed,
          passed: receipt.passed,
          failed: receipt.failed,
          skipped: receipt.skipped,
          didNotRun: receipt.didNotRun,
          unknown: receipt.unknown,
        };
        executionStatus = disposition;
        if (disposition !== 'PASS') executionCode = executionCodeForDisposition(disposition);
      }
      if (exitStatus !== 0 && executionStatus === 'PASS') {
        executionStatus = 'TESTS_FAILED';
        executionCode = 'SHARD_CHILD_EXIT_NONZERO';
      }
      const failedLocations = [...output.matchAll(/^\s*\d+\)\s+\[[^\]]+\]\s+›\s+(tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts):(\d+)(?::\d+)?\s+›/gm)]
        .map((match) => `${match[1]}:${match[2]}`)
        .filter((location, index, all) => all.indexOf(location) === index)
        .slice(0, 16);
      resolve({
        id: shard.id,
        files: shard.files.length,
        digest: shard.digest,
        exitStatus,
        wallMs: Date.now() - startedAt,
        counts,
        textCounts,
        executionStatus,
        executionCode,
        failedLocations,
        errorCode: executionCode,
      });
    });
  });
}

function displayCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? String(value) : 'UNKNOWN';
}

function renderShardReceipt(receipt) {
  const lines = [];
  lines.push(`[run-shards] ${receipt.result} files=${receipt.universeCount} shards=${receipt.shards.length}${receipt.serial === true ? ' mode=serial' : ` workers=${receipt.workerCount ?? receipt.parallelShardCount}`}`);
  lines.push(`[run-shards] coverage=${receipt.coverage.ok ? 'OK' : 'VIOLATION'} planDigest=${receipt.planDigest}`);
  for (const result of receipt.shardResults ?? []) {
    lines.push(`  ${result.id}: exit=${result.exitStatus} execution=${result.executionStatus} code=${result.executionCode ?? 'NONE'} wall=${(result.wallMs / 1000).toFixed(1)}s passed=${displayCount(result.counts?.passed)} failed=${displayCount(result.counts?.failed)} skipped=${displayCount(result.counts?.skipped)} didNotRun=${displayCount(result.counts?.didNotRun)}`);
  }
  lines.push(`[run-shards] totals passed=${displayCount(receipt.totals.passed)} failed=${displayCount(receipt.totals.failed)} skipped=${displayCount(receipt.totals.skipped)} didNotRun=${displayCount(receipt.totals.didNotRun)} executed=${displayCount(receipt.totals.executed)}`);
  for (const result of receipt.shardResults ?? []) {
    if (Array.isArray(result.failedLocations) && result.failedLocations.length > 0) lines.push(`  ${result.id} failures: ${result.failedLocations.join(', ')}`);
  }
  lines.push('[run-shards] NOT CERTIFICATION on its own: this is the canonical full-regression execution shape, not a release authority by itself.');
  return lines.join('\n');
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
  try {
    const [shardPlan, execution] = loadTypeScriptModules([
      'src/core/validation/shardPlan.ts',
      'src/core/validation/shardExecutionReceipt.ts',
    ], { root });
    const workerCount = shardPlan.resolveParallelShardCount(cli.flags['--workers']);
    if (workerCount === null) {
      console.error(JSON.stringify({ schemaVersion: 'nightwatch.shard-run-receipt.v1', result: 'CONFIG_INVALID', code: 'SHARD_WORKERS_OUT_OF_RANGE' }));
      process.exitCode = 2;
    } else {
      const explicit = typeof cli.flags['--files'] === 'string' && cli.flags['--files'].length > 0
        ? cli.flags['--files'].split(',').map((value) => value.trim()).filter(Boolean)
        : null;
      const universe = explicit ?? discoverUniverse();
      const declaredClasses = loadClasses();
      // With an explicit selection the universe is a subset of the declared
      // inventory by design; validation is scoped to what will actually run so
      // an unclassified selected file still fails closed.
      const classes = Object.fromEntries(universe.map((file) => [file, declaredClasses[file]]).filter(([, value]) => value !== undefined));
      const inputs = shardPlan.validateShardInputs({ universe, classes });
      if (!inputs.ok) {
        console.error(JSON.stringify({ schemaVersion: 'nightwatch.shard-run-receipt.v1', result: 'REFUSED', code: 'SHARD_INPUTS_INVALID', violations: inputs.violations.slice(0, 16) }));
        process.exitCode = 2;
      } else {
        const weights = loadWeights(cli.flags['--weights']);
        const plan = shardPlan.planShards({ universe, classes, parallelShardCount: workerCount, ...(weights === null ? {} : { weights }) });
        const weighted = weights !== null;
        const allShards = plan.exclusiveShard === null ? plan.parallelShards : [...plan.parallelShards, plan.exclusiveShard];
        const coverage = shardPlan.verifyShardCoverage({ universe, shards: allShards });
        const base = {
          schemaVersion: 'nightwatch.shard-run-receipt.v1',
          planDigest: plan.planDigest,
          universeDigest: plan.universeDigest,
          universeCount: plan.universeCount,
          parallelShardCount: plan.parallelShardCount,
          weighted,
          shards: allShards.map((shard) => ({ id: shard.id, files: shard.files.length, digest: shard.digest, classes: shard.byClass, exclusive: shard.id === 'exclusive' })),
          coverage,
        };
        if (!coverage.ok) {
          console.error(JSON.stringify({ ...base, result: 'REFUSED', code: 'SHARD_COVERAGE_VIOLATION' }));
          process.exitCode = 2;
        } else if (cli.flags['--dry-run'] === true) {
          const receipt = { ...base, result: 'DRY_RUN' };
          console.log(cli.json ? JSON.stringify(receipt, null, 2) : JSON.stringify(receipt));
        } else if (cli.flags['--serial'] === true) {
          const serialResult = await runShard({ id: 'serial', files: universe, digest: base.universeDigest, byClass: {} }, execution);
          const totals = sumCounts([serialResult]);
          const failed = serialResult.exitStatus !== 0 || serialResult.executionStatus !== 'PASS';
          const receipt = {
            ...base,
            serial: true,
            shards: [{ id: 'serial', files: universe.length, digest: base.universeDigest, classes: {}, exclusive: false }],
            shardResults: [serialResult],
            totals,
            result: failed ? 'TEST_FAILURE' : 'PASS',
          };
          console.log(cli.json ? JSON.stringify(receipt, null, 2) : renderShardReceipt(receipt));
          process.exitCode = failed ? 1 : 0;
        } else {
          const parallelResults = await Promise.all(plan.parallelShards.map((shard) => runShard(shard, execution)));
          const exclusiveResults = plan.exclusiveShard === null ? [] : [await runShard(plan.exclusiveShard, execution)];
          const results = [...parallelResults, ...exclusiveResults];
          const totals = sumCounts(results);
          const failed = results.some((result) => result.exitStatus !== 0 || result.executionStatus !== 'PASS');
          const receipt = {
            ...base,
            workerCount,
            shardResults: results,
            totals,
            result: failed ? 'TEST_FAILURE' : 'PASS',
          };
          console.log(cli.json ? JSON.stringify(receipt, null, 2) : renderShardReceipt(receipt));
          process.exitCode = failed ? 1 : 0;
        }
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ schemaVersion: 'nightwatch.shard-run-receipt.v1', result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'SHARD_RUN_INVALID' }));
    process.exitCode = 2;
  }
}
