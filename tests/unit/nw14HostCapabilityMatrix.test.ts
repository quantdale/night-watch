// NW-14 — the host capability and dependency matrix must stay true.
//
// Dependency and platform claims outlive their evidence quietly. The `vue`
// devDependency was once removed as "unused" while a test still reached it
// through `require.resolve` (DEF-FC-03), and the qualified-host requirements
// lived only in prose that nothing checked — so a host without Bubblewrap, a
// system Chrome or a Go toolchain could inherit a pass from one that had them.
//
// `checkHostCapabilityMatrix` in bin/hardening-check.mjs enforces this in a
// required gate group. These cases assert the same invariants directly, so
// drift is caught by the suite as well as by the gate, and record the
// evidence boundary the campaign is NOT allowed to cross.

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(__dirname, '../..');
const MATRIX_FILE = 'docs/HOST-CAPABILITY-MATRIX.md';

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

test.describe('NW-14 — the host capability matrix is current', () => {
  test('every declared dependency is assessed', () => {
    const manifest = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const matrix = read(MATRIX_FILE);
    const declared = Object.keys({ ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) });
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      // A dependency without an assessment is an unevidenced claim.
      expect(matrix, `${name} is declared but not assessed`).toContain(`\`${name}\``);
    }
  });

  test('every probed host capability is named, and its probe still exists', () => {
    const matrix = read(MATRIX_FILE);
    for (const [token, source] of [
      ['nightwatch.l6-runtime-capability.v1', 'src/core/oops/sandbox.ts'],
      ['TOOLCHAIN_UNAVAILABLE', 'src/core/ownerLocalReproduction/contracts.ts'],
      ['DEFAULT_SIBLING_ROOT', 'src/core/source/siblingSource.ts'],
      ['deepContainmentLane', 'bin/quality-gate.mjs'],
    ] as const) {
      // Both directions: a renamed probe must not leave a matrix row
      // describing something that no longer exists, and a live probe must not
      // be missing from the matrix.
      expect(read(source), `${source} no longer probes ${token}`).toContain(token);
      expect(matrix, `${token} is probed but not documented`).toContain(token);
    }
  });

  test('an unqualified host is stated to report unsupported capability, never a pass', () => {
    const matrix = read(MATRIX_FILE);
    expect(matrix).toMatch(/unsupported\s+capability/i);
    expect(matrix).toMatch(/never\s+inherits?/i);
  });

  test('the Vue fixture assessment records EOL, reachability, a decision and a review date', () => {
    const matrix = read(MATRIX_FILE);
    expect(matrix).toContain('2.6.12');
    // The upstream status matters: no patch will arrive, so retention rests
    // on reachability alone rather than on a promise of future fixes.
    expect(matrix).toMatch(/END OF LIFE|EOL/);
    expect(matrix).toMatch(/Reachability/i);
    expect(matrix).toMatch(/RETAIN/);
    expect(matrix).toMatch(/Review date/i);
    expect(matrix).toMatch(/Review conditions?/i);
  });

  test('the fixture still has exactly one call site, which is what the assessment rests on', () => {
    // The reachability argument is "one offline test, fixed render function".
    // A second consumer would invalidate it, so the count is the invariant.
    const selfName = path.basename(__filename).replace(/\.js$/, '.ts');
    const consumers = fs
      .readdirSync(path.join(ROOT, 'tests/unit'))
      .filter((name) => name.endsWith('.ts'))
      // This file quotes the specifier in order to search for it, so it would
      // otherwise count itself as a consumer.
      .filter((name) => name !== selfName)
      .filter((name) => read(path.join('tests/unit', name)).includes("require.resolve('vue/dist/vue.js')"));
    expect(consumers).toEqual(['rippleReadiness.test.ts']);
  });

  test('the online advisory lane is reported UNAVAILABLE, never as clean', () => {
    const matrix = read(MATRIX_FILE);
    // The campaign's safety boundary prohibits network dependency fetching,
    // so `npm audit` cannot run. An absent scan is not a passing scan, and
    // the document must not let a reader mistake one for the other.
    expect(matrix).toMatch(/UNAVAILABLE/);
    expect(matrix).toMatch(/never a passing scan|not a passing scan/i);
    expect(matrix).toMatch(/No current online advisory scan was performed/i);
  });

  test('the matrix names each validation lane as a separate claim', () => {
    const matrix = read(MATRIX_FILE);
    for (const lane of [
      'npm run typecheck',
      'node --check',
      'npm run hardening:check',
      'npm run gate:local',
      'npm test',
      'npm run gate:clean',
      'npm run validation:universe',
    ]) {
      expect(matrix, `${lane} is not named as a lane`).toContain(lane);
    }
    // None subsumes another: the document must say so rather than implying a
    // green gate covers the full regression.
    expect(matrix).toMatch(/None subsumes another/i);
  });

  test('README routes an operator to the matrix', () => {
    expect(read('README.md')).toContain('docs/HOST-CAPABILITY-MATRIX.md');
  });
});
