// F-PERF-3 shard planner and runner tests.
//
// The planner's purity makes the coverage proof, the exclusivity rule and the
// deterministic partition directly testable; one bounded end-to-end run proves
// the runner actually executes both the concurrent and the exclusive path.

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
});
