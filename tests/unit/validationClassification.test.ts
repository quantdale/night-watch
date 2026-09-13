// Validation classification truth (nightwatch-validation-classification-and-skip-truth-v1).
//
// The four static rules are pure over the universe JSON, the lane-state JSON,
// package.json scripts, the default Playwright testMatch, the tracked configs
// and the fixture sources. The live repository input must pass; every rule has
// a synthetic negative fixture.

import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  classifyValidationTruth,
  extractTestMatchGlobs,
  globToRegExp,
  matchesDefaultTestMatch,
  npmRunScripts,
} from '../../bin/lib/validation-classification.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function tracked(pattern: string): string[] {
  return execFileSync('git', ['ls-files', pattern], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
}

function liveInputs(): Record<string, unknown> {
  const packageManifest = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  const referenceGraph = JSON.parse(read('config/reference-graph.v1.json')) as { retention?: unknown };
  return {
    universe: JSON.parse(read('config/validation-universe.v1.json')),
    laneState: JSON.parse(read('config/validation-lane-state.v1.json')),
    packageScripts: packageManifest.scripts ?? {},
    testMatchGlobs: extractTestMatchGlobs(read('playwright.config.ts')),
    trackedPlaywrightConfigs: tracked('playwright*.config.ts'),
    packageScriptValues: Object.values(packageManifest.scripts ?? {}),
    binSources: tracked('bin/*.mjs').map((file) => ({ file, source: read(file) })),
    retentionEvidence: JSON.stringify(referenceGraph.retention ?? []),
    fixtureSources: tracked('tests/fixtures/*.mjs').map((file) => ({ file, source: read(file) })),
  };
}

test.describe('default testMatch matching', () => {
  test('the live globs match default-runner files and reject manual harnesses', () => {
    const globs = extractTestMatchGlobs(read('playwright.config.ts'));
    expect(globs).toEqual(['**/tests/**/*.{test,smoke}.ts', '**/scenarios/**/*.smoke.ts']);
    expect(matchesDefaultTestMatch('tests/smoke/safety.smoke.ts', globs)).toBe(true);
    expect(matchesDefaultTestMatch('tests/unit/example.test.ts', globs)).toBe(true);
    expect(matchesDefaultTestMatch('scenarios/ripple/local.smoke.ts', globs)).toBe(true);
    expect(matchesDefaultTestMatch('tests/manual/phase2c-real-journeys.ts', globs)).toBe(false);
  });

  test('glob translation is anchored and bounded', () => {
    expect(globToRegExp('**/tests/**/*.{test,smoke}.ts').test('tests/unit/x.test.ts')).toBe(true);
    expect(globToRegExp('**/tests/**/*.{test,smoke}.ts').test('src/unit/x.test.ts')).toBe(false);
    expect(globToRegExp('**/scenarios/**/*.smoke.ts').test('scenarios/a/b.smoke.ts')).toBe(true);
  });

  test('npm run references parse as script tokens', () => {
    expect(npmRunScripts('npm run test:browser under a qualified host')).toEqual(['test:browser']);
    expect(npmRunScripts('npm run control-center:ui:browser')).toEqual(['control-center:ui:browser']);
    expect(npmRunScripts('npm --prefix ui/control-center run build')).toEqual([]);
  });
});

test.describe('classification truth rules', () => {
  test('the live repository passes all four rules', () => {
    expect(classifyValidationTruth(liveInputs()).errors).toEqual([]);
  });

  test('default-runner files in an UNAVAILABLE class fail', () => {
    const result = classifyValidationTruth({
      universe: { classes: { MANUAL_OWNER: { evidenceLane: 'owner run', files: ['tests/smoke/safety.smoke.ts'] } } },
      laneState: { lanes: [{ laneId: 'owner-manual', class: 'UNAVAILABLE_CAPABILITY', classes: ['MANUAL_OWNER'], command: 'owner route' }] },
      packageScripts: {},
      testMatchGlobs: extractTestMatchGlobs(read('playwright.config.ts')),
    });
    expect(result.errors.map((entry) => entry.code)).toContain('VALIDATION_CLASS_UNAVAILABLE_BUT_DEFAULTED');
    expect(result.errors.map((entry) => entry.detail).join(' ')).toContain('tests/smoke/safety.smoke.ts');
  });

  test('an evidenceLane naming a non-existent script fails', () => {
    const result = classifyValidationTruth({
      universe: { classes: { BROWSER_WORKFLOW: { evidenceLane: 'browser lane — npm run test:browser', files: ['tests/browser/x.browser.ts'] } } },
      laneState: { lanes: [] },
      packageScripts: { test: 'playwright test' },
    });
    expect(result.errors.map((entry) => entry.code)).toContain('VALIDATION_EVIDENCE_SCRIPT_MISSING');
    expect(result.errors.map((entry) => entry.detail).join(' ')).toContain('test:browser');
  });

  test('an unbound Playwright config fails; the default config is bound by the default runner', () => {
    const unbound = classifyValidationTruth({
      universe: { classes: {} },
      laneState: { lanes: [] },
      packageScripts: {},
      trackedPlaywrightConfigs: ['playwright.example.config.ts'],
    });
    expect(unbound.errors.map((entry) => entry.code)).toContain('PLAYWRIGHT_CONFIG_UNBOUND');

    const baseBound = classifyValidationTruth({
      universe: { classes: {} },
      laneState: { lanes: [] },
      packageScripts: { test: 'playwright test' },
      trackedPlaywrightConfigs: ['playwright.config.ts'],
    });
    expect(baseBound.errors).toEqual([]);

    const explicitlyBound = classifyValidationTruth({
      universe: { classes: {} },
      laneState: { lanes: [] },
      packageScripts: { 'auth:capture-synthetic': 'playwright test --config=playwright.capture.synthetic.config.ts' },
      trackedPlaywrightConfigs: ['playwright.capture.synthetic.config.ts'],
    });
    expect(explicitlyBound.errors).toEqual([]);
  });

  test('a fixture with a local TypeScript transpiler fails', () => {
    const result = classifyValidationTruth({
      universe: { classes: {} },
      laneState: { lanes: [] },
      packageScripts: {},
      fixtureSources: [
        { file: 'tests/fixtures/fork-child.mjs', source: "require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(src, {}).outputText, f);" },
        { file: 'tests/fixtures/shared-child.mjs', source: "import { loadTypeScriptModule } from '../../bin/lib/typescript-runtime-loader.mjs';" },
      ],
    });
    const codes = result.errors.map((entry) => entry.code);
    expect(codes).toContain('FIXTURE_TYPESCRIPT_LOADER_FORK');
    expect(result.errors.map((entry) => entry.detail).join(' ')).toContain('fork-child.mjs');
    expect(result.errors.map((entry) => entry.detail).join(' ')).not.toContain('shared-child.mjs');
  });
});
