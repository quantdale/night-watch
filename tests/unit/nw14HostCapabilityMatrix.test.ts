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
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  collectDependencyReviewDue,
  collectDependencyReviewDueFromRecord,
  computeDueDate,
  evaluateAdvisoryCleanClaims,
  evaluateDependencyCurrency,
  evaluateLockfileVerification,
  evaluateVueReviewConditions,
  parseDependencyCurrencyRecord,
  qualifyRuntime,
  type DependencyCurrencyInput,
} from '../../src/core/dependencyCurrency/index';

const ROOT = path.resolve(__dirname, '../..');
const MATRIX_FILE = 'docs/HOST-CAPABILITY-MATRIX.md';
const RECORD_FILE = 'config/dependency-currency.v1.json';

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

// ---------------------------------------------------------------------------
// Group 9 (F-11) — dependency and supply-chain currency.
//
// The record in config/dependency-currency.v1.json carries the mechanized
// half of the assessment. These cases run the live record, then apply each
// recorded negative probe to a synthetic snapshot and require detection. The
// online advisory lane stays UNAVAILABLE; an absent scan is never a passing
// scan, and no current-answer document may imply one.
// ---------------------------------------------------------------------------

interface DependencyCurrencyRecordJson {
  readonly advisoryLaneId: string;
  readonly runtime: {
    readonly declaredRange: string;
    readonly qualifiedNode: readonly string[];
    readonly qualifiedOs: { readonly platform: string; readonly arch: string; readonly kernelMarker: string };
  };
  readonly vueReview: {
    readonly dependency: string;
    readonly version: string;
    readonly fixturePath: string;
    readonly specifier: string;
    readonly reviewDate: string;
    readonly reviewIntervalDays: number;
    readonly conditions: readonly string[];
    readonly mechanizedConditions: readonly string[];
  };
  readonly lockfileVerification: {
    readonly command: string;
    readonly date: string;
    readonly intervalDays: number;
    readonly result: string;
    readonly lockfileSha256: string;
  };
  readonly probes: ReadonlyArray<{ readonly id: string; readonly target: string; readonly description: string; readonly expectedFinding: string }>;
}

const DEPENDENCY_RECORD = JSON.parse(read(RECORD_FILE)) as DependencyCurrencyRecordJson;
const DEPENDENCY = DEPENDENCY_RECORD.vueReview.dependency;
const SPECIFIER = DEPENDENCY_RECORD.vueReview.specifier;
const FIXTURE = DEPENDENCY_RECORD.vueReview.fixturePath;

function trackedSources(): Array<{ path: string; text: string }> {
  const listed = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
  return listed
    .split('\n')
    .filter(Boolean)
    .filter((file) => /\.(?:ts|mjs)$/.test(file) && !file.startsWith('ui/') && !file.endsWith('.d.ts') && !file.endsWith('.d.mts'))
    .map((file) => ({ path: file, text: read(file) }));
}

function currentTruthDocuments(): Array<{ path: string; text: string }> {
  const roles = JSON.parse(read('config/document-role.v1.json')) as { documents: ReadonlyArray<{ path: string; role: string }> };
  return ['README.md', ...roles.documents.filter((entry) => entry.role === 'CURRENT_TRUTH').map((entry) => entry.path)]
    .map((file) => ({ path: file, text: read(file) }));
}

function observedLockfileSha256(): string {
  return `sha256:${createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'package-lock.json'))).digest('hex')}`;
}

function liveDependencyCurrencyInput(overrides: Partial<DependencyCurrencyInput> = {}): DependencyCurrencyInput {
  const rootRequire = createRequire(path.join(ROOT, 'package.json'));
  const laneState = JSON.parse(read('config/validation-lane-state.v1.json')) as { lanes: ReadonlyArray<{ laneId: string; class: string }> };
  const lane = laneState.lanes.find((entry) => entry.laneId === DEPENDENCY_RECORD.advisoryLaneId);
  return {
    record: DEPENDENCY_RECORD,
    today: new Date().toISOString().slice(0, 10),
    packageJson: JSON.parse(read('package.json')),
    sources: trackedSources(),
    documents: currentTruthDocuments(),
    matrixText: read(MATRIX_FILE),
    observed: { nodeVersion: process.version, platform: process.platform, arch: process.arch, kernelRelease: os.release() },
    observedLockfileSha256: observedLockfileSha256(),
    advisoryLaneClass: lane?.class ?? 'UNKNOWN',
    resolveSpecifier: (specifier) => {
      try {
        rootRequire.resolve(specifier);
        return true;
      } catch {
        return false;
      }
    },
    ...overrides,
  };
}

/** Built at runtime so this scanner never counts itself as a Vue call site. */
function callSiteText(): string {
  return `await page.addScriptTag({ path: require.resolve('${SPECIFIER}') });\n`;
}

function vueFindings(
  sources: Array<{ path: string; text: string }>,
  declared: readonly string[] = [DEPENDENCY],
  resolveSpecifier: (specifier: string) => boolean = () => true,
) {
  return evaluateVueReviewConditions({
    sources,
    dependency: DEPENDENCY,
    version: DEPENDENCY_RECORD.vueReview.version,
    fixturePath: FIXTURE,
    specifier: SPECIFIER,
    declaredDependencies: declared,
    resolveSpecifier,
  });
}

test.describe('group 9 — dependency and supply-chain currency (F-11)', () => {
  test('the live record passes every mechanized condition', () => {
    const parsed = parseDependencyCurrencyRecord(DEPENDENCY_RECORD);
    expect(parsed.ok).toBe(true);
    expect(DEPENDENCY_RECORD.vueReview.conditions).toHaveLength(4);
    expect(DEPENDENCY_RECORD.vueReview.mechanizedConditions).toHaveLength(3);
    const result = evaluateDependencyCurrency(liveDependencyCurrencyInput());
    expect(result.vueReviewDueDate).toBe(computeDueDate(DEPENDENCY_RECORD.vueReview.reviewDate, DEPENDENCY_RECORD.vueReview.reviewIntervalDays));
    expect(result.lockfileVerificationDueDate).toBe(computeDueDate(DEPENDENCY_RECORD.lockfileVerification.date, DEPENDENCY_RECORD.lockfileVerification.intervalDays));
    const runtimeFindings = result.findings.filter((finding) => finding.code.startsWith('DEPENDENCY_RUNTIME_UNQUALIFIED'));
    if (result.runtimeQualification?.state === 'QUALIFIED') {
      expect(runtimeFindings).toEqual([]);
    } else {
      // An unqualified host is reported, never inherited.
      expect(runtimeFindings).toHaveLength(1);
    }
    expect(result.findings.filter((finding) => !finding.code.startsWith('DEPENDENCY_RUNTIME_UNQUALIFIED'))).toEqual([]);
  });

  test('the declared engines range is separated from the qualified points', () => {
    const manifest = JSON.parse(read('package.json')) as { engines: { node: string } };
    const matrix = read(MATRIX_FILE);
    expect(manifest.engines.node).toBe(DEPENDENCY_RECORD.runtime.declaredRange);
    expect(matrix).toContain('Declared range');
    expect(matrix).toContain('Qualified points');
    expect(matrix).toContain(DEPENDENCY_RECORD.runtime.declaredRange);
    for (const point of DEPENDENCY_RECORD.runtime.qualifiedNode) expect(matrix).toContain(point);
    expect(matrix).toMatch(/UNQUALIFIED/);
    expect(matrix).toMatch(/never inherits the declared-range pass/i);
  });

  test('the advisory lane is unavailable and no current-answer document implies a clean scan', () => {
    const laneState = JSON.parse(read('config/validation-lane-state.v1.json')) as { lanes: ReadonlyArray<{ laneId: string; class: string; unblockCondition: string | null; revisitDate: string | null }> };
    const lane = laneState.lanes.find((entry) => entry.laneId === DEPENDENCY_RECORD.advisoryLaneId);
    expect(lane?.class).toBe('UNAVAILABLE_CAPABILITY');
    expect(lane?.unblockCondition ?? '').not.toBe('');
    expect(lane?.revisitDate ?? '').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(evaluateAdvisoryCleanClaims({ documents: currentTruthDocuments(), advisoryLaneClass: lane?.class ?? 'UNKNOWN' })).toEqual([]);
    const honest = { path: 'docs/SYNTHETIC.md', text: 'npm audit and any registry-backed advisory query are UNAVAILABLE, not clean.\n' };
    expect(evaluateAdvisoryCleanClaims({ documents: [honest], advisoryLaneClass: lane?.class ?? 'UNKNOWN' })).toEqual([]);
    const tainted = { path: 'docs/SYNTHETIC.md', text: 'Dependency scan: clean, 0 vulnerabilities.\n' };
    const findings = evaluateAdvisoryCleanClaims({ documents: [tainted], advisoryLaneClass: lane?.class ?? 'UNKNOWN' });
    expect(findings.map((finding) => finding.code)).toContain('DEPENDENCY_ADVISORY_CLEAN_CLAIM_WHILE_UNAVAILABLE');
    expect(findings[0]?.detail).toContain('never a passing scan');
    // A proven lane is allowed to state its result.
    expect(evaluateAdvisoryCleanClaims({ documents: [tainted], advisoryLaneClass: 'PROVEN' })).toEqual([]);
  });

  test('DC-001 — a second Vue call site fails naming both sites and the condition', () => {
    const second = { path: 'tests/unit/syntheticSecondConsumer.test.ts', text: callSiteText() };
    const findings = vueFindings([{ path: FIXTURE, text: read(FIXTURE) }, second]);
    const codes = findings.map((finding) => finding.code);
    expect(codes).toContain('DEPENDENCY_VUE_SECOND_CALL_SITE');
    const detail = findings.find((finding) => finding.code === 'DEPENDENCY_VUE_SECOND_CALL_SITE')?.detail ?? '';
    expect(detail).toContain(FIXTURE);
    expect(detail).toContain(second.path);
    expect(detail).toContain('second consumer');
  });

  test('DC-002 — a template compiled from a variable fails; literal content passes', () => {
    const variable = { path: FIXTURE, text: `new VueConstructor({ template: compiledSource });\n${callSiteText()}` };
    const variableCodes = vueFindings([variable]).map((finding) => finding.code);
    expect(variableCodes).toContain('DEPENDENCY_VUE_TEMPLATE_NON_LITERAL');
    const literal = { path: FIXTURE, text: `new VueConstructor({ template: '<div class="q-layout-container layout"></div>' });\n${callSiteText()}` };
    const literalCodes = vueFindings([literal]).map((finding) => finding.code);
    expect(literalCodes).not.toContain('DEPENDENCY_VUE_TEMPLATE_NON_LITERAL');
  });

  test('DC-003 — an undeclared or unresolvable require.resolve fails', () => {
    const sources = [{ path: FIXTURE, text: read(FIXTURE) }, { path: 'tests/unit/syntheticConsumer.test.ts', text: callSiteText() }];
    expect(vueFindings(sources, ['typescript']).map((finding) => finding.code)).toContain('DEPENDENCY_VUE_UNDECLARED');
    expect(vueFindings(sources, [DEPENDENCY], () => false).map((finding) => finding.code)).toContain('DEPENDENCY_REQUIRE_RESOLVE_UNRESOLVABLE');
  });

  test('DC-005/DC-008 — a stale lockfile verification date and drift fail', () => {
    const record = DEPENDENCY_RECORD.lockfileVerification;
    const stale = evaluateLockfileVerification(record, '2030-01-01', record.lockfileSha256);
    expect(stale.stale).toBe(true);
    expect(stale.findings.map((finding) => finding.code)).toContain('DEPENDENCY_LOCKFILE_VERIFICATION_STALE');
    const drift = evaluateLockfileVerification(record, record.date, `sha256:${'a'.repeat(64)}`);
    expect(drift.findings.map((finding) => finding.code)).toContain('DEPENDENCY_LOCKFILE_DRIFT');
    const live = evaluateLockfileVerification(record, new Date().toISOString().slice(0, 10), observedLockfileSha256());
    expect(live.findings).toEqual([]);
  });

  test('DC-006 — a runtime outside the qualified points is reported, never inherited', () => {
    const runtime = DEPENDENCY_RECORD.runtime;
    expect(qualifyRuntime(runtime, { nodeVersion: 'v22.22.1', platform: 'linux', arch: 'x64', kernelRelease: '6.6.87.2-microsoft-standard-WSL2' }).state).toBe('QUALIFIED');
    const unqualifiedNode = qualifyRuntime(runtime, { nodeVersion: 'v21.7.0', platform: 'linux', arch: 'x64', kernelRelease: '6.6.87.2-microsoft-standard-WSL2' });
    expect(unqualifiedNode.state).toBe('UNQUALIFIED_RUNTIME');
    expect(unqualifiedNode.detail).toContain('does not confer qualification');
    expect(qualifyRuntime(runtime, { nodeVersion: 'v20.19.0', platform: 'darwin', arch: 'arm64', kernelRelease: '23.0.0' }).state).toBe('UNQUALIFIED_OS');
  });

  test('DC-007 — an elapsed review is reported due with its interval', () => {
    const parsed = parseDependencyCurrencyRecord(DEPENDENCY_RECORD);
    expect(parsed.record).not.toBeNull();
    const record = parsed.record;
    if (record === null) return;
    const dueDate = computeDueDate(record.vueReview.reviewDate, record.vueReview.reviewIntervalDays);
    expect(dueDate).not.toBeNull();
    expect(collectDependencyReviewDue(record, record.vueReview.reviewDate)).toEqual([]);
    const due = collectDependencyReviewDue(record, '2030-01-01');
    expect(due).toHaveLength(1);
    expect(due[0]?.dueDate).toBe(dueDate);
    expect(due[0]?.condition).toContain('re-review');
    // The raw-record entry point agent:check would call.
    expect(collectDependencyReviewDueFromRecord(DEPENDENCY_RECORD, '2030-01-01')).toHaveLength(1);
    expect(collectDependencyReviewDueFromRecord({ schemaVersion: 'unreadable' }, '2030-01-01')).toEqual([]);
  });

  test('the registered probes are complete, unique and exercised', () => {
    const parsed = parseDependencyCurrencyRecord(DEPENDENCY_RECORD);
    expect(parsed.probes.length).toBeGreaterThanOrEqual(7);
    const ids = parsed.probes.map((probe) => probe.id);
    expect(new Set(ids).size).toBe(ids.length);
    const exercised = new Set([
      'DEPENDENCY_VUE_SECOND_CALL_SITE',
      'DEPENDENCY_VUE_TEMPLATE_NON_LITERAL',
      'DEPENDENCY_VUE_UNDECLARED',
      'DEPENDENCY_ADVISORY_CLEAN_CLAIM_WHILE_UNAVAILABLE',
      'DEPENDENCY_LOCKFILE_VERIFICATION_STALE',
      'DEPENDENCY_RUNTIME_UNQUALIFIED_RUNTIME',
      'DEPENDENCY_REVIEW_DUE',
      'DEPENDENCY_LOCKFILE_DRIFT',
    ]);
    for (const probe of parsed.probes) {
      expect(exercised.has(probe.expectedFinding), `${probe.id} names an unexercised finding ${probe.expectedFinding}`).toBe(true);
    }
    for (const code of exercised) expect(parsed.probes.map((probe) => probe.expectedFinding)).toContain(code);
  });
});
