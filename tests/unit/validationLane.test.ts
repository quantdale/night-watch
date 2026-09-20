// F-PERF-5 validation lane composition tests.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  VALIDATION_LANE_DEFINITIONS,
  buildLaneExecution,
  validateLaneDefinitions,
} from '../../src/core/validation/validationLane';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'validation-lane.mjs');

test('both lanes declare non-certification authority and a target', () => {
  for (const lane of [VALIDATION_LANE_DEFINITIONS.dev, VALIDATION_LANE_DEFINITIONS.milestone]) {
    expect(lane.authority).toBe('NOT_CERTIFICATION');
    expect(lane.targetSeconds).toBeGreaterThan(0);
  }
  expect(VALIDATION_LANE_DEFINITIONS.dev.targetSeconds).toBe(120);
  expect(VALIDATION_LANE_DEFINITIONS.milestone.targetSeconds).toBe(300);
  expect(validateLaneDefinitions().violations).toEqual([]);
});

test('the dev lane cannot contain certification-authority steps', () => {
  const rendered = VALIDATION_LANE_DEFINITIONS.dev.steps.map((step) => (step.command ?? []).join(' ')).join(' ');
  expect(rendered).not.toContain('hardening:rules');
  expect(rendered).not.toContain('gate:local');
  expect(rendered).not.toContain('gate:clean');
  expect(rendered).not.toContain('npm test');
  const milestone = VALIDATION_LANE_DEFINITIONS.milestone.steps.map((step) => step.id);
  expect(milestone).toContain('hardening-rules');
  expect(milestone).toContain('project-check');
  expect(milestone).toContain('workspace-check');
});

test('lane execution binds the base and the selection into argv', () => {
  const execution = buildLaneExecution({
    lane: 'dev',
    base: 'origin/main',
    selectedTests: ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'],
    parallelShardCount: 3,
  });
  const affected = execution.steps.find((step) => step.id === 'affected-tests');
  expect(affected?.argv).toContain('--base=origin/main');
  const shards = execution.steps.find((step) => step.id === 'affected-shards');
  expect(shards?.argv.join(' ')).toContain('--files=tests/unit/a.test.ts,tests/unit/b.test.ts');
  expect(shards?.argv.join(' ')).toContain('--workers=3');
});

test('the CLI executes as a process and labels itself non-certification', () => {
  const result = spawnSync(process.execPath, [CLI, 'dev', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(0);
  const receipt = JSON.parse(result.stdout);
  expect(receipt.authority).toBe('NOT_CERTIFICATION');
  expect(receipt.label).toContain('NON-CERTIFICATION LANE');
  expect(receipt.result).toBe('DRY_RUN');
  expect(receipt.steps.length).toBeGreaterThan(3);
  expect(receipt.base).toBe('origin/main');
});

test('an unknown lane is refused', () => {
  const result = spawnSync(process.execPath, [CLI, 'certify-everything', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(2);
  expect(result.stderr).toContain('CLI_UNKNOWN_COMMAND');
});
