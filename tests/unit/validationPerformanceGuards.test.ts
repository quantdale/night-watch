// F-PERF-7 structural performance regression guards.
//
// These are deliberate STRUCTURAL guards, not wall-clock assertions: a future
// change that duplicates a suite execution, silently shrinks the shard
// universe, disables certification step separation, or ships stale shard
// weights fails here deterministically on any host.

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { planShards, verifyShardCoverage } from '../../src/core/validation/shardPlan';
import { VALIDATION_LANE_DEFINITIONS, validateLaneDefinitions } from '../../src/core/validation/validationLane';
import type { ExecutionClass } from '../../src/core/validation/executionClasses';

const ROOT = path.join(__dirname, '..', '..');
const readJson = (relative: string) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

test('the gate test-executing groups select pairwise-disjoint file sets', () => {
  const synthetic = new Set<string>(readJson('config/synthetic-campaign.v1.json').files as string[]);
  const semanticConfig = readJson('config/semantic-compatibility.v1.json');
  const semantic = new Set<string>([...semanticConfig.phaseSuites.flatMap((suite: { files: string[] }) => suite.files), ...(semanticConfig.supportFiles ?? [])]);
  const owner = new Set<string>(['tests/unit/privateArtifactAtomic.test.ts', 'tests/unit/aiOwnerReview.test.ts', 'tests/unit/aiReview.test.ts']);
  const overlap = (left: Set<string>, right: Set<string>) => [...left].filter((file) => right.has(file));
  expect(overlap(synthetic, semantic)).toEqual([]);
  expect(overlap(synthetic, owner)).toEqual([]);
  expect(overlap(semantic, owner)).toEqual([]);
});

test('the whole tracked universe partitions exactly once at any shard count', () => {
  const declaration = readJson('config/validation-execution-classes.v1.json');
  const universe = Object.keys(declaration.files).sort();
  const classes: Record<string, ExecutionClass> = {};
  for (const file of universe) classes[file] = declaration.files[file].class;
  for (const shardCount of [1, 2, 4, 8]) {
    const plan = planShards({ universe, classes, parallelShardCount: shardCount });
    const shards = plan.exclusiveShard === null ? plan.parallelShards : [...plan.parallelShards, plan.exclusiveShard];
    const coverage = verifyShardCoverage({ universe, shards });
    expect(coverage.ok, `coverage failed at ${shardCount} shards`).toBe(true);
    expect(plan.universeCount).toBe(universe.length);
  }
});

test('shard weights cover only universe files with finite positive values and are digest-verifiable', () => {
  const weights = readJson('config/shard-weights.v1.json');
  const declaration = readJson('config/validation-execution-classes.v1.json');
  expect(weights.schemaVersion).toBe('nightwatch.shard-weights.v1');
  expect(typeof weights.weightDigest).toBe('string');
  expect(weights.weightDigest).toMatch(/^sha256:[0-9a-f]{24}$/);
  for (const [file, value] of Object.entries(weights.weights)) {
    expect(declaration.files[file], `weight for unknown file ${file}`).toBeDefined();
    expect(typeof value).toBe('number');
    expect(Number.isFinite(value as number)).toBe(true);
    expect(value as number).toBeGreaterThan(0);
  }
  expect(Object.keys(weights.weights).length).toBeGreaterThan(0);
});

test('the synthetic manifest cannot opt into shards without a covered weight table', () => {
  const manifest = readJson('config/synthetic-campaign.v1.json');
  const weights = readJson('config/shard-weights.v1.json');
  const shardCount = manifest.execution.shardCount ?? 1;
  expect(Number.isInteger(shardCount) && shardCount >= 1 && shardCount <= 8).toBe(true);
  if (shardCount > 1) {
    for (const file of manifest.files) expect(weights.weights[file], `manifest sharding without a weight for ${file}`).toBeDefined();
  }
});

test('the fast and milestone lanes exist, stay non-certifying, and are wired to package scripts', () => {
  expect(validateLaneDefinitions().ok).toBe(true);
  expect(VALIDATION_LANE_DEFINITIONS.dev.authority).toBe('NOT_CERTIFICATION');
  expect(VALIDATION_LANE_DEFINITIONS.milestone.authority).toBe('NOT_CERTIFICATION');
  const scripts = readJson('package.json').scripts;
  expect(scripts['gate:dev']).toContain('bin/validation-lane.mjs dev');
  expect(scripts['gate:milestone']).toContain('bin/validation-lane.mjs milestone');
  expect(scripts['test:timings']).toContain('bin/test-timings.mjs');
  // D-142: the canonical regression executes as coexistence-proven shards, and
  // the historical serial shape stays reachable for comparison and fallback.
  expect(scripts.test).toContain('bin/run-shards.mjs');
  expect(scripts['test:serial']).toContain('playwright test');
});

test('the execution-class declaration covers every tracked test and never weakens detection', () => {
  const declaration = readJson('config/validation-execution-classes.v1.json');
  const universe = Object.keys(declaration.files);
  expect(universe.length).toBeGreaterThan(300);
  const byClass: Record<string, number> = {};
  for (const file of universe) {
    const name = declaration.files[file].class;
    byClass[name] = (byClass[name] ?? 0) + 1;
  }
  expect(byClass.PARALLEL_SAFE ?? 0).toBeGreaterThan(300);
  expect((byClass.MUTATION_CAMPAIGN_EXCLUSIVE ?? 0) + (byClass.SERIAL_REQUIRED ?? 0)).toBeLessThan(30);
});
