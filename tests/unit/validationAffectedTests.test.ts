// F-PERF-4 affected-test selection tests.
//
// Includes the three campaign-required negative probes: a hidden dependency
// must broaden, a shared-core change must fan out to dependents, and an
// unmapped path must never produce a zero-test selection.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { deriveAffectedTests, affectedSelectionIsRunnable, type AffectedTestsPolicy } from '../../src/core/validation/affectedTests';

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'affected-tests.mjs');

const POLICY: AffectedTestsPolicy = {
  broadenPrefixes: ['src/core/safety/', 'bin/', 'config/'],
  alwaysRun: ['tests/unit/safety.test.ts'],
  sourcePrefixes: ['src/', 'bin/', 'tests/'],
};

const UNIVERSE = [
  'tests/unit/safety.test.ts',
  'tests/unit/a.test.ts',
  'tests/unit/b.test.ts',
  'tests/unit/c.test.ts',
];

test('an empty change set is a refusal, never zero green tests', () => {
  const result = deriveAffectedTests({ changedFiles: [], testFiles: UNIVERSE, edges: [], policy: POLICY });
  expect(result.code).toBe('AFFECTED_NO_CHANGED_FILES');
  expect(result.ok).toBe(false);
  expect(affectedSelectionIsRunnable(result)).toBe(false);
});

test('a changed module fans out to its importers transitively', () => {
  const edges = [
    { from: 'src/core/shared.ts', to: 'src/core/leaf.ts' },
    { from: 'tests/unit/a.test.ts', to: 'src/core/shared.ts' },
    { from: 'tests/unit/b.test.ts', to: 'tests/unit/a.test.ts' },
  ];
  const result = deriveAffectedTests({ changedFiles: ['src/core/leaf.ts'], testFiles: UNIVERSE, edges, policy: POLICY });
  expect(result.code).toBe('AFFECTED_SELECTED');
  expect(result.selectedTests).toEqual(['tests/unit/a.test.ts', 'tests/unit/b.test.ts', 'tests/unit/safety.test.ts']);
});

test('negative probe: a hidden dependency broadens instead of silently passing', () => {
  const edges = [{ from: 'tests/unit/a.test.ts', to: 'src/core/shared.ts' }];
  const result = deriveAffectedTests({ changedFiles: ['src/core/hidden/new-module.ts'], testFiles: UNIVERSE, edges, policy: POLICY });
  expect(result.code).toBe('AFFECTED_BROADENED');
  expect(result.broadened).toBe(true);
  expect(result.selectedTests).toEqual([...UNIVERSE].sort());
  expect(result.unmappedChangedFiles).toEqual(['src/core/hidden/new-module.ts']);
});

test('negative probe: an unmapped path never produces zero tests', () => {
  const result = deriveAffectedTests({ changedFiles: ['src/mystery.ts'], testFiles: UNIVERSE, edges: [], policy: POLICY });
  expect(result.code).toBe('AFFECTED_BROADENED');
  expect(result.counts.selected).toBeGreaterThan(0);
});

test('negative probe: a shared-core change is included, not narrowed', () => {
  const edges = [
    { from: 'tests/unit/a.test.ts', to: 'src/core/shared.ts' },
    { from: 'tests/unit/b.test.ts', to: 'src/core/shared.ts' },
    { from: 'tests/unit/c.test.ts', to: 'src/core/shared.ts' },
  ];
  const result = deriveAffectedTests({ changedFiles: ['src/core/shared.ts'], testFiles: UNIVERSE, edges, policy: POLICY });
  expect(result.selectedTests).toContain('tests/unit/a.test.ts');
  expect(result.selectedTests).toContain('tests/unit/b.test.ts');
  expect(result.selectedTests).toContain('tests/unit/c.test.ts');
  expect(result.broadened).toBe(false);
});

test('safety, governance and test-infrastructure changes broaden', () => {
  for (const file of ['src/core/safety/outboundPolicy.ts', 'bin/quality-gate.mjs', 'config/quality-gate.v1.json']) {
    const result = deriveAffectedTests({ changedFiles: [file], testFiles: UNIVERSE, edges: [], policy: POLICY });
    expect(result.code).toBe('AFFECTED_BROADENED');
    expect(result.selectedTests).toEqual([...UNIVERSE].sort());
  }
});

test('a changed test file is selected and always-run tests are included', () => {
  const result = deriveAffectedTests({ changedFiles: ['tests/unit/c.test.ts'], testFiles: UNIVERSE, edges: [], policy: POLICY });
  expect(result.code).toBe('AFFECTED_SELECTED');
  expect(result.selectedTests).toContain('tests/unit/c.test.ts');
  expect(result.selectedTests).toContain('tests/unit/safety.test.ts');
});

test('a mapped change with no impacted test is a refusal, not a pass', () => {
  const edges = [{ from: 'src/core/lonely.ts', to: 'src/core/leaf.ts' }];
  const result = deriveAffectedTests({ changedFiles: ['src/core/lonely.ts'], testFiles: UNIVERSE, edges, policy: { ...POLICY, alwaysRun: [] } });
  expect(result.code).toBe('AFFECTED_NO_TESTS_MATCHED');
  expect(result.ok).toBe(false);
});

test('the CLI executes as a process and emits the selection schema', () => {
  const result = spawnSync(process.execPath, [CLI, '--base=HEAD', '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  const document = JSON.parse(result.stdout.trim());
  expect(document.schemaVersion).toBe('nightwatch.affected-tests.v1');
  expect(['AFFECTED_NO_CHANGED_FILES', 'AFFECTED_SELECTED', 'AFFECTED_BROADENED', 'AFFECTED_NO_TESTS_MATCHED']).toContain(document.code);
  expect([0, 2]).toContain(result.status);
});

test('a missing base is refused before any selection', () => {
  const result = spawnSync(process.execPath, [CLI, '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  expect(result.status).toBe(2);
  expect(JSON.parse(result.stderr.trim()).code).toBe('AFFECTED_BASE_REQUIRED');
});
