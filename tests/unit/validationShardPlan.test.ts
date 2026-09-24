// F-PERF-3 shard planner and runner tests.
//
// The planner's purity makes the coverage proof, the exclusivity rule and the
// deterministic partition directly testable; one bounded end-to-end run proves
// the runner actually executes both the concurrent and the exclusive path.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  DEFAULT_PARALLEL_SHARDS,
  MAX_PARALLEL_SHARDS,
  planShards,
  resolveParallelShardCount,
  validateShardInputs,
  verifyShardCoverage,
  type Shard,
} from '../../src/core/validation/shardPlan';
import { detectExecutionClass, type ExecutionClass } from '../../src/core/validation/executionClasses';
import {
  MAX_SHARD_EXECUTION_RECEIPT_BYTES,
  SHARD_EXECUTION_RECEIPT_SCHEMA,
  createShardExecutionReceipt,
  parseShardExecutionReceipt,
  serializeShardExecutionReceipt,
} from '../../src/core/validation/shardExecutionReceipt';
import PlaywrightShardReporter from '../helpers/playwrightShardReporter';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'run-shards.mjs');

function classesFor(files: readonly string[], kind: ExecutionClass): Record<string, ExecutionClass> {
  return Object.fromEntries(files.map((file) => [file, kind]));
}

test('planning is deterministic, balanced and disjoint', () => {
  const universe = Array.from({ length: 9 }, (_, index) => `tests/unit/f${index}.test.ts`);
  const classes = classesFor(universe, 'PARALLEL_SAFE');
  const first = planShards({ universe, classes, parallelShardCount: 3 });
  const second = planShards({ universe: [...universe].reverse(), classes, parallelShardCount: 3 });
  expect(first.planDigest).toBe(second.planDigest);
  expect(first.parallelShards.map((shard) => shard.files.length)).toEqual([3, 3, 3]);
  const coverage = verifyShardCoverage({ universe, shards: first.parallelShards });
  expect(coverage.ok).toBe(true);
  expect(coverage.missing).toEqual([]);
  expect(coverage.duplicated).toEqual([]);
});

test('exclusive classes never share a concurrent shard', () => {
  const universe = ['tests/unit/a.test.ts', 'tests/unit/b.test.ts', 'tests/unit/c.test.ts', 'tests/unit/d.test.ts'];
  const classes: Record<string, ExecutionClass> = {
    'tests/unit/a.test.ts': 'PARALLEL_SAFE',
    'tests/unit/b.test.ts': 'PROCESS_ISOLATED_ONLY',
    'tests/unit/c.test.ts': 'SERIAL_REQUIRED',
    'tests/unit/d.test.ts': 'MUTATION_CAMPAIGN_EXCLUSIVE',
  };
  const plan = planShards({ universe, classes, parallelShardCount: 2 });
  const concurrent = plan.parallelShards.flatMap((shard) => shard.files);
  expect(concurrent.sort()).toEqual(['tests/unit/a.test.ts', 'tests/unit/b.test.ts']);
  expect([...(plan.exclusiveShard?.files ?? [])].sort()).toEqual(['tests/unit/c.test.ts', 'tests/unit/d.test.ts']);
  const coverage = verifyShardCoverage({ universe, shards: [...plan.parallelShards, plan.exclusiveShard as Shard] });
  expect(coverage.ok).toBe(true);
});

test('the coverage proof detects a missing or duplicated member', () => {
  const universe = ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'];
  const shards: Shard[] = [
    { id: 'shard-1', files: ['tests/unit/a.test.ts'], digest: 'x', byClass: { PARALLEL_SAFE: 1 } },
    { id: 'shard-2', files: [], digest: 'y', byClass: {} },
  ];
  expect(verifyShardCoverage({ universe, shards }).missing).toEqual(['tests/unit/b.test.ts']);
  const duplicated: Shard[] = [
    { id: 'shard-1', files: ['tests/unit/a.test.ts'], digest: 'x', byClass: { PARALLEL_SAFE: 1 } },
    { id: 'shard-2', files: ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'], digest: 'y', byClass: { PARALLEL_SAFE: 2 } },
  ];
  const proof = verifyShardCoverage({ universe, shards: duplicated });
  expect(proof.ok).toBe(false);
  expect(proof.duplicated).toEqual(['tests/unit/a.test.ts']);
});

test('unclassified, unknown, stale and empty inputs fail closed', () => {
  expect(validateShardInputs({ universe: [], classes: {} }).violations.map((violation) => violation.code)).toContain('SHARD_UNIVERSE_EMPTY');
  const violations = validateShardInputs({
    universe: ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'],
    classes: { 'tests/unit/a.test.ts': 'PARALLEL_SAFE' as ExecutionClass, 'tests/unit/gone.test.ts': 'PARALLEL_SAFE' as ExecutionClass },
  }).violations.map((violation) => violation.code);
  expect(violations).toContain('SHARD_CLASS_MISSING');
  expect(violations).toContain('SHARD_CLASS_DECLARED_MISSING');
  expect(validateShardInputs({ universe: ['tests/unit/a.test.ts'], classes: { 'tests/unit/a.test.ts': 'WHATEVER' as ExecutionClass } }).ok).toBe(false);
});

test('worker overrides are validated and bounded', () => {
  expect(resolveParallelShardCount(undefined)).toBe(DEFAULT_PARALLEL_SHARDS);
  expect(resolveParallelShardCount('4')).toBe(4);
  expect(resolveParallelShardCount(1)).toBe(1);
  expect(resolveParallelShardCount(0)).toBeNull();
  expect(resolveParallelShardCount(MAX_PARALLEL_SHARDS + 1)).toBeNull();
  expect(resolveParallelShardCount('two')).toBeNull();
  expect(() => planShards({ universe: ['tests/unit/a.test.ts'], classes: { 'tests/unit/a.test.ts': 'PARALLEL_SAFE' }, parallelShardCount: 99 })).toThrow(/SHARD_COUNT_OUT_OF_RANGE/);
});

test('duration weights produce a deterministic balanced partition', () => {
  const universe = ['tests/unit/a.test.ts', 'tests/unit/b.test.ts', 'tests/unit/c.test.ts'];
  const classes = classesFor(universe, 'PARALLEL_SAFE');
  const weights = { 'tests/unit/a.test.ts': 100, 'tests/unit/b.test.ts': 90, 'tests/unit/c.test.ts': 10 };
  const first = planShards({ universe, classes, parallelShardCount: 2, weights });
  const second = planShards({ universe: [...universe].reverse(), classes, parallelShardCount: 2, weights });
  expect(first.planDigest).toBe(second.planDigest);
  const sizes = first.parallelShards.map((shard) => shard.files);
  expect(sizes.map((files) => files.length).sort()).toEqual([1, 2]);
  const heavy = sizes.find((files) => files.includes('tests/unit/a.test.ts')) ?? [];
  expect(heavy).toEqual(['tests/unit/a.test.ts']);
  const rest = sizes.find((files) => !files.includes('tests/unit/a.test.ts')) ?? [];
  expect(rest).toEqual(['tests/unit/b.test.ts', 'tests/unit/c.test.ts']);
  expect(verifyShardCoverage({ universe, shards: first.parallelShards }).ok).toBe(true);
});

test('a weight table cannot change membership proof or exclusivity', () => {
  const universe = ['tests/unit/a.test.ts', 'tests/unit/serial.test.ts'];
  const classes: Record<string, ExecutionClass> = { 'tests/unit/a.test.ts': 'PARALLEL_SAFE', 'tests/unit/serial.test.ts': 'SERIAL_REQUIRED' };
  const plan = planShards({ universe, classes, parallelShardCount: 2, weights: { 'tests/unit/a.test.ts': 5, 'tests/unit/serial.test.ts': 1 } });
  expect(plan.parallelShards.flatMap((shard) => shard.files)).toEqual(['tests/unit/a.test.ts']);
  expect(plan.exclusiveShard?.files).toEqual(['tests/unit/serial.test.ts']);
  expect(verifyShardCoverage({ universe, shards: [...plan.parallelShards, plan.exclusiveShard as Shard] }).ok).toBe(true);
});

test('the runner refuses an unclassified explicit selection', () => {
  const result = spawnSync(process.execPath, [CLI, '--dry-run', '--json', '--files=tests/unit/not-a-real-file.test.ts'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(2);
  expect(JSON.parse(result.stderr.trim())).toMatchObject({ result: 'REFUSED', code: 'SHARD_INPUTS_INVALID' });
});

test('the runner executes concurrent and exclusive shards end to end', () => {
  const parallelFile = 'tests/unit/validationTiming.test.ts';
  const exclusiveFile = 'tests/unit/validationExecutionClasses.test.ts';
  expect(detectExecutionClass('import { test } from "@playwright/test";').proposed).toBe('PARALLEL_SAFE');
  const result = spawnSync(process.execPath, [CLI, '--json', '--workers=2', `--files=${parallelFile},${exclusiveFile}`], { cwd: ROOT, encoding: 'utf8', timeout: 300_000 });
  expect(result.status).toBe(0);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.result).toBe('PASS');
  expect(receipt.coverage.ok).toBe(true);
  expect(receipt.parallelShardCount).toBe(2);
  expect(receipt.plan?.universeCount ?? receipt.universeCount).toBe(2);
  const exclusive = receipt.shards.find((shard: { id: string }) => shard.id === 'exclusive');
  expect(exclusive.files).toBe(1);
  expect(receipt.totals.failed).toBe(0);
  expect(receipt.totals.passed).toBeGreaterThan(0);
  expect(receipt.shardResults.every((result: { executionStatus: string }) => result.executionStatus === 'PASS')).toBe(true);
});

test('execution receipts distinguish pass, mixed skip, all skip, zero, and unknown outcomes', () => {
  const base = {
    shardId: 'shard-1',
    playwrightStatus: 'passed' as const,
    planned: 2,
    executed: 2,
    passed: 2,
    failed: 0,
    skipped: 0,
    didNotRun: 0,
    unknown: 0,
  };
  const parsedPass = parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt(base)), 'shard-1');
  expect(parsedPass).toMatchObject({ ok: true, disposition: 'PASS' });
  const mixed = parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt({ ...base, planned: 3, executed: 3, passed: 2, skipped: 1 })), 'shard-1');
  expect(mixed).toMatchObject({ ok: true, disposition: 'PASS' });
  const allSkipped = parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt({ ...base, passed: 0, skipped: 2 })), 'shard-1');
  expect(allSkipped).toMatchObject({ ok: true, disposition: 'ALL_SKIPPED' });
  const zero = parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt({ ...base, planned: 0, executed: 0, passed: 0, skipped: 0 })), 'shard-1');
  expect(zero).toMatchObject({ ok: true, disposition: 'NO_TESTS_EXECUTED' });
  const unknown = parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt({ ...base, passed: 1, unknown: 1 })), 'shard-1');
  expect(unknown).toMatchObject({ ok: true, disposition: 'UNKNOWN' });
  expect(parseShardExecutionReceipt('{bad', 'shard-1')).toMatchObject({ ok: false, code: 'SHARD_RECEIPT_MALFORMED' });
  expect(parseShardExecutionReceipt(JSON.stringify({ ...base, schemaVersion: SHARD_EXECUTION_RECEIPT_SCHEMA, extra: true }), 'shard-1')).toMatchObject({ ok: false, code: 'SHARD_RECEIPT_INVALID' });
  expect(parseShardExecutionReceipt(serializeShardExecutionReceipt(createShardExecutionReceipt(base)), 'other-shard')).toMatchObject({ ok: false, code: 'SHARD_RECEIPT_SHARD_MISMATCH' });
  expect(parseShardExecutionReceipt('x'.repeat(MAX_SHARD_EXECUTION_RECEIPT_BYTES + 1), 'shard-1')).toMatchObject({ ok: false, code: 'SHARD_RECEIPT_TOO_LARGE' });
});

test('the shard reporter writes a strict atomic receipt from planned and observed outcomes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-shard-reporter-'));
  const destination = path.join(root, 'receipt.json');
  const reporter = new PlaywrightShardReporter({ path: destination, shardId: 'shard-1' });
  const skipped = { id: 'skipped', outcome: () => 'skipped' } as any;
  const passed = { id: 'passed', outcome: () => 'expected' } as any;
  reporter.onBegin({} as any, { allTests: () => [skipped, passed] } as any);
  reporter.onTestEnd(skipped, {} as any);
  reporter.onTestEnd(passed, {} as any);
  reporter.onEnd({ status: 'passed' } as any);
  const parsed = parseShardExecutionReceipt(fs.readFileSync(destination, 'utf8'), 'shard-1');
  expect(parsed).toMatchObject({ ok: true, disposition: 'PASS' });
  expect(fs.existsSync(`${destination}.tmp`)).toBe(false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('the runner refuses an all-skipped shard even when Playwright exits zero', () => {
  const result = spawnSync(process.execPath, [CLI, '--json', '--workers=1', '--files=tests/unit/liveProviderEfficacyProof.test.ts'], { cwd: ROOT, encoding: 'utf8', timeout: 300_000 });
  expect(result.status).toBe(1);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.result).toBe('TEST_FAILURE');
  expect(receipt.shardResults[0]).toMatchObject({ executionStatus: 'ALL_SKIPPED', executionCode: 'SHARD_ALL_SKIPPED', exitStatus: 0 });
  expect(receipt.shardResults[0].counts).toMatchObject({ planned: 1, executed: 1, passed: 0, skipped: 1 });
});
