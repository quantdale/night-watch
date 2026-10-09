// D-08 (M10 task 11.6) — the ui/control-center lockfile is assessed.
//
// The dependency assessment covered the root manifest and the root lockfile
// only, so `ui/control-center` — thirteen declared packages resolving to 217
// lockfile entries — was never assessed, and the census line "2 unrecorded
// moderate advisories" had no identifier, no affected range and no scan record
// behind it anywhere in the repository.
//
// These cases run the live manifest and lockfile through `assessUiLockfile`,
// then apply each registered negative probe to a synthetic snapshot and require
// detection. They also pin the boundary this task was NOT allowed to cross: no
// registry advisory query was authorized here, so `GHSA-82fw` is recorded as
// UNVERIFIABLE rather than given a fabricated affected range, severity or
// patched version.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  assessUiLockfile,
  evaluateDependencyCurrency,
  isUiSourcePath,
  parseDependencyCurrencyRecord,
  parseUiLockfileAssessmentSection,
  readUiLockfile,
  readUiManifest,
  selectUiProbes,
  UI_LOCKFILE_ASSESSMENT_VERSION,
  type DependencyCurrencyInput,
  type UiLockfileInput,
} from '../../src/core/dependencyCurrency/index';
import { loadLaneState } from '../../bin/lib/validation-lane-state.mjs';

const ROOT = path.resolve(__dirname, '../..');
const RECORD_FILE = 'config/dependency-currency.v1.json';
const MANIFEST_FILE = 'ui/control-center/package.json';
const LOCKFILE_FILE = 'ui/control-center/package-lock.json';
const UI_ROOT = 'ui/control-center/';

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

interface ProbeJson {
  readonly id: string;
  readonly target: string;
  readonly description: string;
  readonly expectedFinding: string;
}

interface DependencyCurrencyRecordJson {
  readonly advisoryLaneId: string;
  readonly runtime: {
    readonly declaredRange: string;
    readonly qualifiedNode: readonly string[];
    readonly qualifiedOs: { readonly platform: string; readonly arch: string; readonly kernelMarker: string };
  };
  readonly vueReview: { readonly reviewDate: string; readonly reviewIntervalDays: number };
  readonly lockfileVerification: { readonly date: string; readonly intervalDays: number };
  readonly uiLockfileAssessment: UiLockfileInput['section'] extends never ? never : Record<string, unknown>;
  readonly probes: readonly ProbeJson[];
}

const RECORD = JSON.parse(read(RECORD_FILE)) as DependencyCurrencyRecordJson;
const MANIFEST = JSON.parse(read(MANIFEST_FILE));
const LOCKFILE = JSON.parse(read(LOCKFILE_FILE));

interface SectionJson {
  readonly schemaVersion: string;
  readonly advisoryLaneId: string;
  readonly versionPinPolicy: string;
  readonly record: {
    readonly assessmentDate: string;
    readonly intervalDays: number;
    readonly lockfileSha256: string;
    readonly snapshot: {
      readonly manifestPath: string;
      readonly lockfilePath: string;
      readonly packageName: string;
      readonly packageVersion: string;
      readonly lockfileVersion: number;
      readonly packageCount: number;
      readonly toolchainImporters: readonly string[];
      readonly declared: ReadonlyArray<{ readonly name: string; readonly specifier: string; readonly kind: string; readonly resolvedVersion: string }>;
    };
    readonly advisoryScan: {
      readonly result: string;
      readonly executed: boolean;
      readonly queryDate: string | null;
      readonly registry: string | null;
      readonly unverifiableReason: string | null;
      readonly deferredToTask: string | null;
      readonly advisories: ReadonlyArray<Record<string, string>>;
    };
  };
}

const SECTION = RECORD.uiLockfileAssessment as unknown as SectionJson;
const SNAPSHOT = SECTION.record.snapshot;

function observedLockfileSha256(): string {
  return `sha256:${createHash('sha256').update(fs.readFileSync(path.join(ROOT, LOCKFILE_FILE))).digest('hex')}`;
}

function trackedUiSources(): Array<{ path: string; text: string }> {
  const listed = spawnSync('git', ['ls-files', UI_ROOT], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
  return listed
    .split('\n')
    .filter(Boolean)
    .filter((file) => isUiSourcePath(file, SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath))
    // A file deleted in the working tree but not yet committed is still in the
    // index; the assessment evaluates the sources that exist.
    .filter((file) => fs.existsSync(path.join(ROOT, file)))
    .map((file) => ({ path: file, text: read(file) }));
}

/** Deep clone of the live section, so a probe never mutates repository data. */
function liveSection(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(SECTION)) as Record<string, unknown>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function assessLive(overrides: Partial<UiLockfileInput> = {}) {
  return assessUiLockfile({
    section: SECTION,
    probes: RECORD.probes,
    today: today(),
    manifest: MANIFEST,
    lockfile: LOCKFILE,
    uiSources: trackedUiSources(),
    observedLockfileSha256: observedLockfileSha256(),
    ...overrides,
  });
}

function codes(findings: ReadonlyArray<{ readonly code: string }>): string[] {
  return findings.map((finding) => finding.code);
}

test.describe('D-08 — the ui/control-center lockfile half of the dependency assessment', () => {
  test('the live manifest and lockfile satisfy every mechanized UI rule', () => {
    const parsed = parseUiLockfileAssessmentSection(SECTION);
    expect(parsed.ok).toBe(true);
    const result = assessLive();
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.advisoryResult).toBe('UNVERIFIABLE');
    expect(result.reviewDue).toBe(false);
    expect(result.reviewDueDate).not.toBeNull();
  });

  test('the recorded snapshot is read from the live lockfile, not asserted', () => {
    // The recorded per-package resolved version must equal the version the
    // lockfile actually resolves — that is the only honest source for a
    // vulnerable-range comparison, and it is what the module checks.
    const parsed = readUiLockfile(LOCKFILE);
    expect(parsed).not.toBeNull();
    if (parsed === null) return;
    expect(SNAPSHOT.packageName).toBe(parsed.name);
    expect(SNAPSHOT.packageVersion).toBe(parsed.version);
    expect(SNAPSHOT.lockfileVersion).toBe(parsed.lockfileVersion);
    expect(SNAPSHOT.packageCount).toBe(parsed.packageCount);
    expect(SNAPSHOT.declared.length).toBeGreaterThan(0);

    const manifest = readUiManifest(MANIFEST);
    expect(manifest).not.toBeNull();
    if (manifest === null) return;
    const declaredNames = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect([...SNAPSHOT.declared.map((entry) => entry.name)].sort()).toEqual([...declaredNames].sort());
    for (const entry of SNAPSHOT.declared) {
      expect(parsed.resolvedVersions[entry.name], `${entry.name} is not resolved by the UI lockfile`).toBe(entry.resolvedVersion);
    }
    // The UI's pin policy is enforced by the module, and the live manifest obeys it.
    for (const name of declaredNames) {
      const specifier = manifest.dependencies[name] ?? manifest.devDependencies[name] ?? '';
      expect(specifier, `${name} is not an exact pin`).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    }
  });

  test('the recorded digest is the live one, and the snapshot carries no second digest', () => {
    expect(SECTION.record.lockfileSha256).toBe(observedLockfileSha256());
    expect((SNAPSHOT as Record<string, unknown>).lockfileSha256).toBeUndefined();
  });

  test('the production bundle closure and the test closure are mechanically separated', () => {
    const manifest = readUiManifest(MANIFEST);
    expect(manifest).not.toBeNull();
    if (manifest === null) return;
    const sources = trackedUiSources();
    // The same specifier grammar the module applies: only an import, a require
    // or a dynamic import counts, so a `"types": ["vitest/globals"]` entry in a
    // tsconfig.json is a mention, never a reach.
    const importersOf = (name: string) => sources.filter((source) => new RegExp(
      `(?:import\\s+(?:[^'"]+\\s+from\\s+)?|require\\s*\\(\\s*|import\\s*\\(\\s*)['"]${name}(?:\\/[^'"]*)?['"]`,
    ).test(source.text));

    // Every declared production dependency is imported by tracked application
    // source, so the bundle closure is not stale.
    const dependencyNames = Object.keys(manifest.dependencies);
    expect(dependencyNames.length).toBeGreaterThan(0);
    for (const name of dependencyNames) {
      expect(importersOf(name).length, `dependency ${name} is imported by no tracked UI source`).toBeGreaterThan(0);
    }
    // Every recorded toolchain importer exists and is not a test file.
    for (const importer of SNAPSHOT.toolchainImporters) {
      expect(sources.map((source) => source.path)).toContain(importer);
      expect(importer).not.toMatch(/\.(?:test|spec)\.(?:ts|tsx)$/);
    }
    // No devDependency reaches an application source that is neither a test nor
    // a recorded toolchain importer — that is the build-boundary reachability
    // proof the advisory record cites.
    for (const name of Object.keys(manifest.devDependencies)) {
      for (const importer of importersOf(name)) {
        const exempt = /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(importer.path) || SNAPSHOT.toolchainImporters.includes(importer.path);
        expect(exempt, `devDependency ${name} is imported by application source ${importer.path}`).toBe(true);
      }
    }
  });

  test('GHSA-82fw is recorded UNVERIFIABLE because its metadata is absent from the repository', () => {
    const advisories = SECTION.record.advisoryScan.advisories;
    expect(advisories.map((advisory) => advisory.advisoryId)).toContain('GHSA-82fw');
    const advisory = advisories.find((candidate) => candidate.advisoryId === 'GHSA-82fw');
    expect(advisory).toBeDefined();
    if (advisory === undefined) return;
    // No metadata may be asserted. Every field the registry would supply is
    // UNVERIFIED, and the provenance of the identifier itself is named.
    expect(advisory.affectedPackage).toBe('UNVERIFIED');
    expect(advisory.affectedRange).toBe('UNVERIFIED');
    expect(advisory.severity).toBe('UNVERIFIED');
    expect(advisory.fixedIn).toBe('UNVERIFIED');
    expect(advisory.reachability).toBe('UNVERIFIABLE');
    expect(advisory.reachabilityEvidence ?? '').not.toBe('');
    expect((advisory.reachabilityEvidence ?? '').length).toBeGreaterThan(80);
    expect(advisory.metadataSource).toContain('tasks.md');
    expect(advisory.metadataSource).toContain('audit.md');

    // The absence is a fact about the repository, asserted structurally rather
    // than by a fragile whole-repo text search: exactly ONE tracked structured
    // advisory record for GHSA-82fw may exist — this record's — so a later
    // session cannot quietly add a second, contradictory scan result, and no
    // other JSON surface can claim to have scanned it.
    const listed = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
    /** @type {string[]} */
    const advisoryRecords: string[] = [];
    for (const file of listed.split('\n').filter(Boolean).filter((candidate) => candidate.endsWith('.json'))) {
      const text = read(file);
      for (const match of text.matchAll(/"advisoryId"\s*:\s*"GHSA-82fw"/g)) advisoryRecords.push(file);
    }
    expect(advisoryRecords).toEqual([RECORD_FILE]);
  });

  test('the unverifiable scan is explained and deferred, never silent', () => {
    const scan = SECTION.record.advisoryScan;
    expect(scan.result).toBe('UNVERIFIABLE');
    expect(scan.executed).toBe(false);
    expect((scan.unverifiableReason ?? '').toLowerCase()).toContain('no registry advisory query');
    expect((scan.unverifiableReason ?? '').toLowerCase()).toContain('npm install');
    expect((scan.unverifiableReason ?? '').toLowerCase()).toContain('no advisory metadata');
    expect(scan.deferredToTask ?? '').toContain('15.4');
  });

  test('the advisory lane is still proven for the root closure, and the UI half never claims it', () => {
    const laneState = { lanes: loadLaneState(ROOT).lanes as ReadonlyArray<{ laneId: string; class: string }> };
    const advisoryLane = laneState.lanes.find((entry) => entry.laneId === SECTION.advisoryLaneId);
    expect(advisoryLane?.class).toBe('PROVEN');
    // The UI result is UNVERIFIABLE while the ROOT lane is PROVEN; the two must
    // never be conflated, because the executed 2026-09-12 query did not cover
    // this closure at all.
    expect(assessLive().advisoryResult).toBe('UNVERIFIABLE');
  });

  test('the UI half is judged only when it is supplied, and reports that honestly', () => {
    const roles = JSON.parse(read('config/document-role.v1.json')) as { documents: ReadonlyArray<{ path: string; role: string }> };
    const rootRequire = createRequire(path.join(ROOT, 'package.json'));
    const advisoryLaneClass = (loadLaneState(ROOT).lanes as ReadonlyArray<{ laneId: string; class: string }>)
      .find((entry) => entry.laneId === SECTION.advisoryLaneId)?.class ?? 'UNKNOWN';
    const base: Omit<DependencyCurrencyInput, 'uiLockfile'> = {
      record: RECORD,
      today: today(),
      packageJson: JSON.parse(read('package.json')),
      sources: (spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '')
        .split('\n')
        .filter(Boolean)
        .filter((file) => /\.(?:ts|mjs)$/.test(file) && !file.startsWith('ui/') && !file.endsWith('.d.ts') && !file.endsWith('.d.mts'))
        .filter((file) => fs.existsSync(path.join(ROOT, file)))
        .map((file) => ({ path: file, text: read(file) })),
      documents: ['README.md', ...roles.documents.filter((entry) => entry.role === 'CURRENT_TRUTH').map((entry) => entry.path)].map((file) => ({ path: file, text: read(file) })),
      matrixText: read('docs/HOST-CAPABILITY-MATRIX.md'),
      observed: { nodeVersion: process.version, platform: process.platform, arch: process.arch, kernelRelease: os.release() },
      observedLockfileSha256: `sha256:${createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'package-lock.json'))).digest('hex')}`,
      advisoryLaneClass,
      resolveSpecifier: (specifier: string) => {
        try {
          rootRequire.resolve(specifier);
          return true;
        } catch {
          return false;
        }
      },
    };
    const uiInput: UiLockfileInput = {
      section: SECTION,
      probes: RECORD.probes,
      today: today(),
      manifest: MANIFEST,
      lockfile: LOCKFILE,
      uiSources: trackedUiSources(),
      observedLockfileSha256: observedLockfileSha256(),
    };

    const combined = evaluateDependencyCurrency({ ...base, uiLockfile: uiInput });
    expect(combined.ok).toBe(true);
    expect(combined.uiLockfileAssessed).toBe(true);
    expect(combined.uiLockfileAdvisoryResult).toBe('UNVERIFIABLE');

    // A caller built before this half existed supplies nothing and is judged on
    // the root surface alone — reported as NOT assessed, never as a pass.
    const legacy = evaluateDependencyCurrency(base);
    expect(legacy.uiLockfileAssessed).toBe(false);
    expect(legacy.uiLockfileAdvisoryResult).toBeNull();
  });

  test('the root record is untouched by the UI extension', () => {
    const parsed = parseDependencyCurrencyRecord(RECORD);
    expect(parsed.ok).toBe(true);
    expect(parsed.record?.vueReview.reviewDate).toBe('2026-10-09');
    expect(parsed.record?.lockfileVerification.date).toBe('2026-10-01');
    expect(selectUiProbes(RECORD.probes).length).toBeGreaterThan(0);
    // One probe array serves both halves; a DC probe never masquerades as a UI
    // probe and the UI probes are all registered against UI codes.
    for (const probe of selectUiProbes(RECORD.probes)) {
      expect(probe.expectedFinding.startsWith('UI_')).toBe(true);
      expect(probe.id.startsWith('UID-')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Registered negative probes.
//
// Each probe is applied to a synthetic snapshot derived from the live one, so
// the live repository data is never mutated.
// ---------------------------------------------------------------------------

const UI_CODES = [
  'UI_LOCKFILE_ADVISORY_CLEAN_CLAIM',
  'UI_LOCKFILE_ADVISORY_RESULT_CONTRADICTION',
  'UI_LOCKFILE_ADVISORY_REACHABILITY_UNEVIDENCED',
  'UI_LOCKFILE_ADVISORY_METADATA_UNSOURCED',
  'UI_LOCKFILE_UNPINNED_SPECIFIER',
  'UI_LOCKFILE_DECLARATION_DRIFT',
  'UI_LOCKFILE_RESOLUTION_MISSING',
  'UI_LOCKFILE_DEV_DEPENDENCY_IN_APPLICATION_SOURCE',
  'UI_LOCKFILE_DIGEST_MISMATCH',
  'UI_LOCKFILE_ASSESSMENT_STALE',
  'UI_RECORD_INVALID',
  'UI_LOCKFILE_SOURCE_SET_EMPTY',
] as const;

/** The live section with its `record.advisoryScan` replaced by `patch`. */
function withAdvisoryScan(patch: Record<string, unknown>): Record<string, unknown> {
  const section = liveSection();
  section.record = { ...(section.record as Record<string, unknown>), advisoryScan: { ...(section.record as Record<string, unknown>).advisoryScan as Record<string, unknown>, ...patch } };
  return section;
}

test.describe('D-08 — the registered UI negative probes are complete and exercised', () => {
  test('UID-001 — a clean claim without an executed query fails', () => {
    expect(codes(assessLive({ section: withAdvisoryScan({ result: 'NO_ADVISORIES_FOUND', executed: false }) }).findings))
      .toContain('UI_LOCKFILE_ADVISORY_CLEAN_CLAIM');
  });

  test('UID-002 — an unverifiable result with an executed query is a contradiction', () => {
    expect(codes(assessLive({ section: withAdvisoryScan({ result: 'UNVERIFIABLE', executed: true }) }).findings))
      .toContain('UI_LOCKFILE_ADVISORY_RESULT_CONTRADICTION');
  });

  test('UID-003 — a reachability verdict without a known affected package fails', () => {
    const section = withAdvisoryScan({
      advisories: [{
        advisoryId: 'GHSA-synthetic',
        metadataSource: 'openspec/changes/nightwatch-final-product-completion-v1/tasks.md',
        affectedPackage: 'UNVERIFIED',
        affectedRange: 'UNVERIFIED',
        severity: 'UNVERIFIED',
        fixedIn: 'UNVERIFIED',
        reachability: 'UNREACHABLE_IN_NIGHTWATCH',
        reachabilityEvidence: 'dev-only fixture, literal template content, no runtime path',
      }],
    });
    expect(codes(assessLive({ section }).findings)).toContain('UI_LOCKFILE_ADVISORY_REACHABILITY_UNEVIDENCED');
  });

  test('UID-004 — an unsourced identifier with unverified metadata fails', () => {
    const section = withAdvisoryScan({
      advisories: [{
        advisoryId: 'GHSA-synthetic',
        metadataSource: '',
        affectedPackage: 'UNVERIFIED',
        affectedRange: 'UNVERIFIED',
        severity: 'UNVERIFIED',
        fixedIn: 'UNVERIFIED',
        reachability: 'UNVERIFIABLE',
        reachabilityEvidence: 'no advisory metadata is tracked for this identifier',
      }],
    });
    expect(codes(assessLive({ section }).findings)).toContain('UI_LOCKFILE_ADVISORY_METADATA_UNSOURCED');
  });

  test('UID-005 — a range specifier in the UI manifest fails the pin policy', () => {
    const manifest = JSON.parse(JSON.stringify(MANIFEST)) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    manifest.devDependencies['vitest'] = '^3.2.7';
    expect(codes(assessLive({ manifest }).findings)).toContain('UI_LOCKFILE_UNPINNED_SPECIFIER');
  });

  test('UID-006 — a manifest declaration the lockfile root does not carry fails', () => {
    const manifest = JSON.parse(JSON.stringify(MANIFEST)) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    manifest.devDependencies['ghost-package'] = '1.0.0';
    expect(codes(assessLive({ manifest }).findings)).toContain('UI_LOCKFILE_DECLARATION_DRIFT');
  });

  test('UID-007 — a declared package the lockfile does not resolve fails', () => {
    const lockfile = JSON.parse(JSON.stringify(LOCKFILE)) as { packages: Record<string, unknown> };
    delete lockfile.packages['node_modules/vitest'];
    expect(codes(assessLive({ lockfile }).findings)).toContain('UI_LOCKFILE_RESOLUTION_MISSING');
  });

  test('UID-008 — a devDependency imported by application source fails', () => {
    const sources = trackedUiSources();
    expect(sources.map((source) => source.path)).toContain('ui/control-center/src/App.tsx');
    // Built from parts so this file's own text never contains a bare
    // specifier naming that package: `checkDeclaredDependencyResolvability`
    // reads RAW source, and a synthetic fixture that reads like a real
    // import would make it demand a devDependency the root manifest does
    // not declare.
    const quote = "'";
    const syntheticSource = `import { expect } from ${quote}vitest${quote};\n`;
    // The runtime VALUE is a real import statement — that is what the module
    // must detect — while THIS FILE's text never contains the literal form.
    const SELF = 'tests/unit/uiLockfileDependencyAssessment.test.ts';
    expect(read(SELF)).not.toMatch(/from\s+['"]vitest['"]/);
    expect(syntheticSource).toContain(`from ${quote}vitest${quote}`);
    const findings = assessLive({
      uiSources: [...sources, { path: 'ui/control-center/src/syntheticConsumer.ts', text: syntheticSource }],
    }).findings;
    expect(codes(findings)).toContain('UI_LOCKFILE_DEV_DEPENDENCY_IN_APPLICATION_SOURCE');
    expect(findings.find((finding) => finding.code === 'UI_LOCKFILE_DEV_DEPENDENCY_IN_APPLICATION_SOURCE')?.detail)
      .toContain('ui/control-center/src/syntheticConsumer.ts');
  });

  test('UID-009 — a lockfile that no longer matches its recorded digest fails', () => {
    expect(codes(assessLive({ observedLockfileSha256: `sha256:${'a'.repeat(64)}` }).findings))
      .toContain('UI_LOCKFILE_DIGEST_MISMATCH');
  });

  test('UID-010 — an assessment past its interval is reported stale', () => {
    expect(SECTION.record.intervalDays).toBeGreaterThan(0);
    expect(codes(assessLive({ today: '2030-01-01' }).findings)).toContain('UI_LOCKFILE_ASSESSMENT_STALE');
  });

  test('UID-011 — a section that is not a versioned object fails closed', () => {
    const findings = assessUiLockfile({
      section: { schemaVersion: 'nightwatch.not-this.v1' },
      probes: RECORD.probes,
      today: today(),
      manifest: MANIFEST,
      lockfile: LOCKFILE,
      uiSources: trackedUiSources(),
      observedLockfileSha256: observedLockfileSha256(),
    }).findings;
    expect(codes(findings)).toContain('UI_RECORD_INVALID');
    // The clock is supplied by the caller, so a caller can prove both branches
    // of the interval check without the module ever reading a clock itself.
    expect(codes(assessLive({ section: 'not-an-object' }).findings)).toContain('UI_RECORD_INVALID');
  });

  test('UID-012 — an empty UI source set is never a passing scan', () => {
    expect(codes(assessLive({ uiSources: [] }).findings)).toContain('UI_LOCKFILE_SOURCE_SET_EMPTY');
  });

  test('the registered UI probes are complete, unique and exercised', () => {
    const probes = selectUiProbes(RECORD.probes);
    expect(probes.length).toBeGreaterThanOrEqual(UI_CODES.length);
    const ids = probes.map((probe) => probe.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const probe of probes) {
      expect(UI_CODES as readonly string[], `${probe.id} names an unexercised finding ${probe.expectedFinding}`).toContain(probe.expectedFinding);
    }
    for (const code of UI_CODES) expect(probes.map((probe) => probe.expectedFinding)).toContain(code);
  });

  test('the module identity is versioned and carried by the section', () => {
    expect(UI_LOCKFILE_ASSESSMENT_VERSION).toBe('nightwatch.ui-lockfile-assessment.v1');
    expect(SECTION.schemaVersion).toBe(UI_LOCKFILE_ASSESSMENT_VERSION);
    // The parsed section is what the assessment consumes, so a live section that
    // does not parse is already a failure here rather than downstream.
    expect(parseUiLockfileAssessmentSection(SECTION).section).not.toBeNull();
  });
});

test.describe('D-08 — the reachability source selector', () => {
  test('the manifest and the lockfile are never reachability sources', () => {
    expect(isUiSourcePath('ui/control-center/src/App.tsx', SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath)).toBe(true);
    expect(isUiSourcePath(SNAPSHOT.manifestPath, SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath)).toBe(false);
    expect(isUiSourcePath(SNAPSHOT.lockfilePath, SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath)).toBe(false);
    // A build output or a source map never enters the scan either, and a build
    // directory is git-ignored so it can never be a tracked source.
    expect(isUiSourcePath('ui/control-center/dist/bundle.js.map', SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath)).toBe(false);
    expect(isUiSourcePath('ui/control-center/src/styles.css', SNAPSHOT.manifestPath, SNAPSHOT.lockfilePath)).toBe(true);
  });
});
