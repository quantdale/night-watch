// F-PERF-2 execution-class tests.
//
// The completeness assertion at the end is the certification-grade check: the
// shipped declaration must cover every tracked test file and must never be
// weaker than the mechanical detection, so a newly added test cannot slip
// into a parallel shard by omission.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  VALIDATION_EXECUTION_CLASSES_SCHEMA,
  EXECUTION_CLASS_ORDER,
  buildExecutionClassesDeclaration,
  detectExecutionClass,
  validateExecutionClasses,
  type ExecutionClassDeclaration,
} from '../../src/core/validation/executionClasses';

const ROOT = path.join(__dirname, '..', '..');
const CONFIG = path.join(ROOT, 'config', 'validation-execution-classes.v1.json');

function declarationFor(files: Record<string, { class: string; signals: string[] }>): ExecutionClassDeclaration {
  return { schemaVersion: VALIDATION_EXECUTION_CLASSES_SCHEMA, files } as ExecutionClassDeclaration;
}

test('detection is conservative and ordered', () => {
  expect(detectExecutionClass('import { test } from "@playwright/test";').proposed).toBe('PARALLEL_SAFE');
  expect(detectExecutionClass("const r = spawnSync('git', ['status']);").proposed).toBe('SERIAL_REQUIRED');
  expect(detectExecutionClass('process.chdir(tmp);').proposed).toBe('SERIAL_REQUIRED');
  expect(detectExecutionClass("server.listen(18987, '127.0.0.1');").proposed).toBe('PROCESS_ISOLATED_ONLY');
  expect(detectExecutionClass("path.join(os.homedir(), '.nightwatch')").proposed).toBe('PROCESS_ISOLATED_ONLY');
  expect(detectExecutionClass("spawnSync(process.execPath, ['bin/hardening-check.mjs', '--probe-campaign']);").proposed).toBe('MUTATION_CAMPAIGN_EXCLUSIVE');
  expect(detectExecutionClass("fs.writeFileSync(path.join(root, 'src/core/guarded.ts'), 'x');").proposed).toBe('MUTATION_CAMPAIGN_EXCLUSIVE');
});

test('a git-mutating file declared PARALLEL_SAFE is rejected', () => {
  const sources = new Map([['tests/unit/git.test.ts', "spawnSync('git', ['reset', '--hard']);"]]);
  const judgement = validateExecutionClasses({
    discovered: ['tests/unit/git.test.ts'],
    sources,
    declaration: declarationFor({ 'tests/unit/git.test.ts': { class: 'PARALLEL_SAFE', signals: [] } }),
  });
  expect(judgement.ok).toBe(false);
  expect(judgement.violations.map((violation) => violation.code)).toContain('EXECUTION_CLASS_WEAKER_THAN_DETECTED');
});

test('a stricter declaration is accepted', () => {
  const sources = new Map([['tests/unit/plain.test.ts', 'import { test } from "@playwright/test";']]);
  const judgement = validateExecutionClasses({
    discovered: ['tests/unit/plain.test.ts'],
    sources,
    declaration: declarationFor({ 'tests/unit/plain.test.ts': { class: 'SERIAL_REQUIRED', signals: ['conservative'] } }),
  });
  expect(judgement.ok).toBe(true);
});

test('missing declaration, stale declaration and unavailable source fail closed', () => {
  const sources = new Map([['tests/unit/a.test.ts', 'import { test } from "@playwright/test";']]);
  expect(validateExecutionClasses({
    discovered: ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'],
    sources: new Map([...sources, ['tests/unit/b.test.ts', 'x']]),
    declaration: declarationFor({ 'tests/unit/a.test.ts': { class: 'PARALLEL_SAFE', signals: [] } }),
  }).violations.map((violation) => violation.code)).toContain('EXECUTION_CLASS_MISSING');
  expect(validateExecutionClasses({
    discovered: ['tests/unit/a.test.ts'],
    sources,
    declaration: declarationFor({ 'tests/unit/a.test.ts': { class: 'PARALLEL_SAFE', signals: [] }, 'tests/unit/gone.test.ts': { class: 'PARALLEL_SAFE', signals: [] } }),
  }).violations.map((violation) => violation.code)).toContain('EXECUTION_CLASS_DECLARED_MISSING');
  expect(validateExecutionClasses({
    discovered: ['tests/unit/a.test.ts'],
    sources: new Map(),
    declaration: declarationFor({ 'tests/unit/a.test.ts': { class: 'PARALLEL_SAFE', signals: [] } }),
  }).violations.map((violation) => violation.code)).toContain('EXECUTION_CLASS_SOURCE_UNAVAILABLE');
  expect(validateExecutionClasses({
    discovered: ['tests/unit/a.test.ts'],
    sources,
    declaration: { schemaVersion: 'other' },
  }).violations.map((violation) => violation.code)).toContain('EXECUTION_CLASSES_SCHEMA_UNSUPPORTED');
});

test('generation fails closed for an unreadable source', () => {
  const built = buildExecutionClassesDeclaration({ discovered: ['tests/unit/missing.test.ts'], sources: new Map() });
  expect(built.files['tests/unit/missing.test.ts']!.class).toBe('SERIAL_REQUIRED');
  expect(built.files['tests/unit/missing.test.ts']!.signals).toContain('source-unavailable-fail-closed');
});

test('the shipped declaration covers every tracked test file without weakening', () => {
  const result = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  expect(result.status).toBe(0);
  const discovered = (result.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .filter((file) => /^tests\/.*\.(?:test|smoke)\.ts$/.test(file) || /^scenarios\/.*\.smoke\.ts$/.test(file))
    .sort();
  const sources = new Map<string, string>();
  for (const file of discovered) sources.set(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const declaration = JSON.parse(fs.readFileSync(CONFIG, 'utf8')) as ExecutionClassDeclaration;
  const judgement = validateExecutionClasses({ discovered, sources, declaration });
  expect(judgement.violations).toEqual([]);
  expect(judgement.ok).toBe(true);
  const classes = new Set(Object.values(declaration.files).map((entry) => entry.class));
  for (const name of EXECUTION_CLASS_ORDER) {
    expect(classes.has(name)).toBe(true);
  }
});
