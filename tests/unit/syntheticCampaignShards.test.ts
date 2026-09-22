// F-PERF-6 synthetic campaign shard-contract tests.
//
// The campaign manifest's determinism contract is data, and the shard
// partition is derived from the declared execution classes. These tests prove
// the contract, the coverage proof and the exclusivity rule against the REAL
// manifest without spending a campaign run.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { planShards, verifyShardCoverage } from '../../src/core/validation/shardPlan';
import type { ExecutionClass } from '../../src/core/validation/executionClasses';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'campaign-synthetic.mjs');
const MANIFEST = path.join(ROOT, 'config', 'synthetic-campaign.v1.json');
const CLASSES = path.join(ROOT, 'config', 'validation-execution-classes.v1.json');

test('the manifest keeps the serial zero-retry contract per invocation', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  expect(manifest.schemaVersion).toBe('nightwatch.synthetic-campaign.v1');
  expect(manifest.execution.workers).toBe(1);
  expect(manifest.execution.retries).toBe(0);
  expect(manifest.execution.serial).toBe(true);
  expect(manifest.files.length).toBe(106);
  expect(new Set(manifest.files).size).toBe(manifest.files.length);
});

test('every manifest file is classed and the partition is exhaustive and disjoint', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const declaration = JSON.parse(fs.readFileSync(CLASSES, 'utf8'));
  const classes: Record<string, ExecutionClass> = {};
  for (const file of manifest.files) {
    const entry = declaration.files[file];
    expect(entry, `manifest file without an execution class: ${file}`).toBeDefined();
    classes[file] = entry.class;
  }
  const plan = planShards({ universe: manifest.files, classes, parallelShardCount: 3 });
  const allShards = plan.exclusiveShard === null ? plan.parallelShards : [...plan.parallelShards, plan.exclusiveShard];
  const coverage = verifyShardCoverage({ universe: manifest.files, shards: allShards });
  expect(coverage.ok).toBe(true);
  expect(coverage.missing).toEqual([]);
  expect(coverage.duplicated).toEqual([]);
  expect(plan.universeCount).toBe(106);
  const concurrent = plan.parallelShards.flatMap((shard) => shard.files);
  const exclusive = plan.exclusiveShard?.files ?? [];
  expect(concurrent.length + exclusive.length).toBe(106);
  expect(plan.parallelShards.some((shard) => shard.files.length === 0)).toBe(false);
  for (const file of exclusive) expect(concurrent).not.toContain(file);
});

test('the launcher validates the manifest without dispatching Playwright', () => {
  const result = spawnSync(process.execPath, [CLI, '--validate'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(0);
  const receipt = JSON.parse(result.stdout.trim());
  expect(receipt).toMatchObject({ result: 'VALID', fileCount: 106, workers: 1, retries: 0 });
});

test('an out-of-range shard override is refused', () => {
  const result = spawnSync(process.execPath, [CLI, '--shards=99'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(2);
  expect(JSON.parse(result.stderr.trim()).code).toBe('SYNTHETIC_CAMPAIGN_SHARD_COUNT_INVALID');
});
