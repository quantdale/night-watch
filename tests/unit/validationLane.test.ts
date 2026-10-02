// F-PERF-5 validation lane composition tests.

import fs from 'node:fs';
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

// R5-11 / review-5 task A9.2 — the pre-push lane every integrate step runs first.

test('the prepush lane carries every component whose omission caused a red CI run, and nothing milestone-scoped', () => {
  const prepush = VALIDATION_LANE_DEFINITIONS.prepush;
  expect(prepush.authority).toBe('NOT_CERTIFICATION');
  const ids = prepush.steps.map((step) => step.id);
  for (const required of ['typecheck', 'typecheck-bin', 'hardening-check', 'agent-check', 'project-check', 'affected-tests', 'affected-shards']) expect(ids, required).toContain(required);
  const commands = prepush.steps.map((step) => (step.command ?? []).join(' '));
  for (const forbidden of ['hardening:rules', 'hardening:mutants', 'gate:local', 'gate:clean', 'gate:ci']) expect(commands.some((command) => command.includes(forbidden)), forbidden).toBe(false);
  expect(validateLaneDefinitions().violations).toEqual([]);
  const execution = buildLaneExecution({ lane: 'prepush', base: 'origin/main', selectedTests: ['tests/unit/a.test.ts'], parallelShardCount: 2 });
  expect(execution.steps.find((step) => step.id === 'project-check')?.argv).toEqual(['npm', 'run', 'project:check']);
  expect(execution.steps.find((step) => step.id === 'affected-tests')?.argv).toContain('--base=origin/main');
});

test('npm run prepush runs the prepush lane, and the session integrate step names it', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  expect(manifest.scripts.prepush).toBe('node bin/validation-lane.mjs prepush');
  const session = fs.readFileSync(path.join(__dirname, '..', '..', 'bin', 'nightwatch-session.mjs'), 'utf8');
  expect(session).toContain("emit('SESSION_PREPUSH_REQUIRED'");
  expect(fs.readFileSync(path.join(__dirname, '..', '..', 'AGENTS.md'), 'utf8')).toContain('npm run prepush');
});

// R5-11 — a validator that is only ever run on the intact definition proves nothing: the guards
// must REFUSE a prepush lane that lost a required component or gained a milestone-scoped one.
test('the lane validator refuses a prepush lane that lost a required step or gained a certification step', () => {
  const steps = VALIDATION_LANE_DEFINITIONS.prepush.steps as unknown as Array<{ id: string; command?: readonly string[] }>;
  const index = steps.findIndex((step) => step.id === 'project-check');
  expect(index).toBeGreaterThanOrEqual(0);
  const removed = steps.splice(index, 1);
  try {
    expect(validateLaneDefinitions().violations).toContainEqual({ code: 'LANE_PREPUSH_STEP_MISSING', detail: 'project-check' });
  } finally {
    steps.splice(index, 0, ...removed);
  }
  expect(validateLaneDefinitions().violations).toEqual([]);
  steps.push({ id: 'synthetic-certification', command: ['npm', 'run', 'gate:local'] });
  try {
    expect(validateLaneDefinitions().violations.map((violation) => violation.code)).toContain('LANE_PREPUSH_FORBIDDEN_STEP');
  } finally {
    steps.pop();
  }
  expect(validateLaneDefinitions().violations).toEqual([]);
});
