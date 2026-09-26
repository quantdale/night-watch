// Group 3 — CI-topology gate: categorical absences and permanent regressions.
//
// The dynamic envelope itself is exercised by `npm run gate:topology`; these
// tests pin its pure judgement (which absence is constructed, whether a lane
// passed by inheritance) and the two run-33572572053 defect classes as
// permanent categorical regressions:
//   * a suite may not depend on an absolute path outside the checkout without
//     an explicit declaration;
//   * a suite may not invoke a binary without a capability discriminant.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  TOPOLOGY_ABSENCES,
  absenceTookEffect,
  canonicalBwrapCandidates,
  describeEnvelopePlan,
  detectInheritanceClaim,
  evaluateAbsence,
  evaluateDirectObservation,
  parseSiblingRoot,
  scanExternalAbsolutePathDependence,
  scanUndeclaredBinaryInvocation,
  validateTopologyRegistration,
} from '../../bin/lib/topology-gate.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const GATE_BIN = path.join(REPO_ROOT, 'bin', 'gate-topology.mjs');

function absence(id: string) {
  const found = TOPOLOGY_ABSENCES.find((entry) => entry.id === id);
  expect(found, id).toBeDefined();
  return found!;
}

function bwrapAbsence() {
  return absence('bwrap');
}

function siblingAbsence() {
  return absence('sibling-root');
}

test.describe('absence declarations and envelope plans', () => {
  test('the four runner absences are declared independently and uniquely', () => {
    expect(TOPOLOGY_ABSENCES.map((entry) => entry.id)).toEqual(['sibling-root', 'bwrap', 'chrome', 'fresh-home']);
    for (const entry of TOPOLOGY_ABSENCES) {
      expect(entry.title.length).toBeGreaterThan(8);
      expect(entry.capability.length).toBeGreaterThan(4);
      expect(entry.dependentLanes.length).toBeGreaterThan(0);
      expect(entry.expectedClaim.length).toBeGreaterThan(12);
      if (entry.id !== 'fresh-home' && entry.id !== 'chrome') expect(entry.blockerCodes.length).toBeGreaterThan(0);
      for (const suite of entry.laneSuites) expect(fs.existsSync(path.join(REPO_ROOT, suite)), suite).toBe(true);
    }
  });

  test('the sibling root is parsed from the real constant and never edited', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'core', 'source', 'siblingRoot.ts'), 'utf8');
    const parsed = parseSiblingRoot(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.startsWith('/')).toBe(true);
    // The plan masks the parsed path; the source constant is untouched.
    const plan = describeEnvelopePlan({
      absence: 'sibling-root',
      worktree: REPO_ROOT,
      siblingRoot: parsed,
      resolveMaskPath: (candidate: string) => ({ kind: candidate === parsed ? 'directory' : 'absent', path: candidate === parsed ? candidate : null }),
    });
    const maskIndex = plan.indexOf(parsed!);
    expect(maskIndex).toBeGreaterThan(0);
    expect(plan[maskIndex - 1]).toBe('--tmpfs');
    expect(source).toContain(`'${parsed}'`);
  });

  test('the bwrap absence masks the runtime’s own candidate list', () => {
    const candidates = canonicalBwrapCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    const plan = describeEnvelopePlan({
      absence: 'bwrap',
      worktree: REPO_ROOT,
      resolveMaskPath: (candidate: string) => ({ kind: candidates.includes(candidate) ? 'file' : 'absent', path: candidate }),
    });
    for (const candidate of candidates) {
      const index = plan.indexOf(candidate);
      expect(index, candidate).toBeGreaterThan(0);
      expect(plan[index - 1]).toBe('/dev/null');
      expect(plan[index - 2]).toBe('--ro-bind');
    }
  });

  test('the fresh-home absence binds a fresh home and sets HOME', () => {
    const fresh = '/tmp/nightwatch-topology-test-home';
    const plan = describeEnvelopePlan({
      absence: 'fresh-home',
      worktree: REPO_ROOT,
      freshHome: fresh,
      resolveMaskPath: (candidate: string) => ({ kind: candidate === fresh ? 'directory' : 'absent', path: candidate === fresh ? candidate : null }),
    });
    expect(plan).toContain(fresh);
    const homeIndex = plan.indexOf('HOME');
    expect(homeIndex).toBeGreaterThan(0);
    expect(plan[homeIndex + 1]).toBe(fresh);
  });
});

test.describe('fail-closed evaluation and the inverse assertion', () => {
  test('an unconstructed absence proves nothing', () => {
    const effect = absenceTookEffect(bwrapAbsence(), { available: true, blockerCode: null });
    expect(effect.absent).toBe(false);
    const findings = evaluateAbsence({ absence: bwrapAbsence(), probe: { available: true, blockerCode: null }, lane: { status: 'PASS' } });
    expect(findings.map((entry) => entry.code)).toEqual(['TOPOLOGY_ABSENCE_NOT_CONSTRUCTED']);
  });

  test('an absent capability with a failing dependent lane fails naming the lane', () => {
    const findings = evaluateAbsence({
      absence: bwrapAbsence(),
      probe: { available: false, blockerCode: 'BWRAP_UNAVAILABLE' },
      lane: { status: 'FAIL' },
    });
    expect(findings.map((entry) => entry.code)).toContain('TOPOLOGY_LANE_FAILED');
    expect(findings.find((entry) => entry.code === 'TOPOLOGY_LANE_FAILED')!.detail).toContain('deepContainmentLane');
    expect(findings.find((entry) => entry.code === 'TOPOLOGY_LANE_FAILED')!.detail).toContain('bwrap');
  });

  test('a lane reporting PROVEN while bwrap is absent fails naming lane and absence', () => {
    const findings = evaluateAbsence({
      absence: bwrapAbsence(),
      probe: { available: false, blockerCode: 'BWRAP_UNAVAILABLE' },
      lane: { status: 'PASS', receipts: { deepContainmentLane: 'PROVEN' } },
    });
    const inheritance = findings.find((entry) => entry.code === 'TOPOLOGY_LANE_PASSED_BY_INHERITANCE');
    expect(inheritance).toBeDefined();
    expect(inheritance!.detail).toContain('deepContainmentLane');
    expect(inheritance!.detail).toContain('bwrap');
  });

  test('a census with a population while the sibling root is unreadable is inheritance', () => {
    const claim = detectInheritanceClaim(siblingAbsence(), { sourcePopulation: 3 });
    expect(claim).not.toBeNull();
    expect(claim!.lane).toBe('source-intelligence-census');
    expect(detectInheritanceClaim(siblingAbsence(), { sourcePopulation: 0 })).toBeNull();
  });

  test('a fresh home that is not the expected directory proves nothing', () => {
    const effect = absenceTookEffect(absence('fresh-home'), { home: '/home/someone', expectedHome: '/tmp/fresh', writable: true });
    expect(effect.absent).toBe(false);
    const ok = absenceTookEffect(absence('fresh-home'), { home: '/tmp/fresh', expectedHome: '/tmp/fresh', writable: true });
    expect(ok.absent).toBe(true);
  });

  test('the fail-closed path passes only when the absence took effect and the lane passed', () => {
    expect(evaluateAbsence({
      absence: siblingAbsence(),
      probe: { pathUsable: false, blockerCode: 'SOURCE_REPOSITORY_UNAVAILABLE' },
      lane: { status: 'PASS' },
    })).toEqual([]);
  });
});

test.describe('categorical regressions for the run-33572572053 defect classes', () => {
  // Assembled at runtime so this suite's own fixture text is not itself an
  // absolute external path literal; the regression scans real text.
  const SIBLING_LITERAL = ['', 'home', 'dalepalaca', 'go', 'src', 'alphaus-main', 'REPOSITORIES'].join('/');

  test('an external absolute path without a declaration is rejected, naming file and path', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [{ path: 'tests/unit/oldEligibility.test.ts', text: `const SIBLINGS = '${SIBLING_LITERAL}';\nfs.readdirSync(SIBLINGS);` }],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('TOPOLOGY_EXTERNAL_PATH_DEPENDENCE');
    expect(findings[0]!.detail).toContain('tests/unit/oldEligibility.test.ts');
    expect(findings[0]!.detail).toContain(SIBLING_LITERAL);
  });

  test('a declaration records the debt instead of hiding it', () => {
    const file = { path: 'tests/unit/oldEligibility.test.ts', text: `const SIBLINGS = '${SIBLING_LITERAL}';` };
    expect(scanExternalAbsolutePathDependence({ files: [file] })).toHaveLength(1);
    expect(scanExternalAbsolutePathDependence({
      files: [file],
      declarations: [{ file: 'tests/unit/oldEligibility.test.ts', literal: SIBLING_LITERAL }],
    })).toEqual([]);
  });

  test('a negative assertion naming an external path is not a dependency', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [{ path: 'tests/unit/sentinel.test.ts', text: `expect(serialized).not.toContain('${SIBLING_LITERAL}');` }],
    });
    expect(findings).toEqual([]);
  });

  test('a binary invoked without a capability probe is rejected, naming file and binary', () => {
    // The historical shape: an unconditional Bubblewrap invocation with no
    // capability discriminant, exactly the DEF-CI-02 defect.
    const findings = scanUndeclaredBinaryInvocation({
      files: [{ path: 'tests/unit/oldL6.test.ts', text: "const result = spawnSync('bwrap', ['--version']);" }],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('TOPOLOGY_UNDECLARED_BINARY_INVOCATION');
    expect(findings[0]!.detail).toContain('bwrap');
  });

  test('a capability discriminant or an explicit declaration satisfies the binary rule', () => {
    const withProbe = { path: 'tests/unit/l6.test.ts', text: "import { l6ContainmentAvailability } from '../../src/core/oops/l6';\nconst available = l6ContainmentAvailability();\nspawnSync('bwrap', ['--version']);" };
    expect(scanUndeclaredBinaryInvocation({ files: [withProbe] })).toEqual([]);
    const declared = { path: 'tests/unit/other.test.ts', text: "spawnSync('custom-tool', []);" };
    expect(scanUndeclaredBinaryInvocation({ files: [declared], declarations: [{ file: 'tests/unit/other.test.ts', command: 'custom-tool' }] })).toEqual([]);
    const toolchain = { path: 'tests/unit/git.test.ts', text: "spawnSync('git', ['status', '--porcelain']);" };
    expect(scanUndeclaredBinaryInvocation({ files: [toolchain] })).toEqual([]);
  });

  test('the live gate suites pass both categorical regressions', () => {
    const synthetic = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'synthetic-campaign.v1.json'), 'utf8'));
    const semantic = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'semantic-compatibility.v1.json'), 'utf8'));
    const regressions = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'topology-regressions.v1.json'), 'utf8'));
    const suites = new Set<string>(synthetic.files);
    for (const suite of semantic.phaseSuites ?? []) for (const file of suite.files ?? []) suites.add(file);
    for (const file of semantic.supportFiles ?? []) suites.add(file);
    const files = [...suites].sort().map((file) => ({ path: file, text: fs.readFileSync(path.join(REPO_ROOT, file), 'utf8') }));
    expect(files.length).toBeGreaterThan(100);
    expect(scanExternalAbsolutePathDependence({ files, declarations: regressions.externalPathDeclarations })).toEqual([]);
    expect(scanUndeclaredBinaryInvocation({ files, declarations: regressions.binaryDeclarations })).toEqual([]);
  });
});

test.describe('registration membership', () => {
  test('package.json, the gate manifest and the validation universe all name the topology lane', () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).scripts;
    const universe = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'validation-universe.v1.json'), 'utf8'));
    const synthetic = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'synthetic-campaign.v1.json'), 'utf8'));
    const findings = validateTopologyRegistration({
      packageScripts: scripts,
      universe,
      gateManifestFiles: synthetic.files,
      binFile: 'bin/gate-topology.mjs',
      suiteFiles: ['tests/unit/gateTopology.test.ts', 'tests/unit/ciBlockRecord.test.ts'],
      fileExists: (relative: string) => fs.existsSync(path.join(REPO_ROOT, relative)),
    });
    expect(findings).toEqual([]);
    const binSyntax = universe.classes.BIN_SYNTAX.files as string[];
    expect(binSyntax).toContain('bin/gate-topology.mjs');
    expect(binSyntax).toContain('bin/lib/topology-gate.mjs');
    expect(binSyntax).toContain('bin/lib/ci-block-record.mjs');
    expect(synthetic.files).toContain('tests/unit/gateTopology.test.ts');
    expect(synthetic.files).toContain('tests/unit/ciBlockRecord.test.ts');
  });

  test('a missing registration fails closed by name', () => {
    const findings = validateTopologyRegistration({
      packageScripts: {},
      universe: { classes: { BIN_SYNTAX: { files: [] } } },
      gateManifestFiles: [],
      binFile: 'bin/gate-topology.mjs',
      suiteFiles: ['tests/unit/gateTopology.test.ts'],
      fileExists: () => true,
    });
    expect(findings.map((entry) => entry.code)).toContain('TOPOLOGY_GATE_UNREGISTERED');
    expect(findings.map((entry) => entry.code)).toContain('TOPOLOGY_SUITE_UNREGISTERED');
  });
});

test.describe('operator entry point', () => {
  test('--help exits zero, prints usage, and performs no work', () => {
    const before = fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).sort();
    const result = spawnSync(process.execPath, [GATE_BIN, '--help'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30_000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('gate-topology');
    const after = fs.readdirSync(path.join(REPO_ROOT, 'artifacts')).sort();
    // --help must not create any path. A concurrent topology run may create its
    // own ignored receipt directory, which is tolerated.
    expect(after.filter((entry) => !before.includes(entry) && entry !== 'topology-receipts')).toEqual([]);
  });

  test('--print-metadata emits exactly one metadata document', () => {
    const result = spawnSync(process.execPath, [GATE_BIN, '--print-metadata'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30_000 });
    expect(result.status).toBe(0);
    const metadata = JSON.parse(result.stdout);
    expect(metadata.name).toBe('gate-topology');
    expect(metadata.schemaVersion).toBe('nightwatch.operator-cli.v1');
  });

  test('probe reports an observation for each declared absence', () => {
    for (const entry of TOPOLOGY_ABSENCES) {
      const result = spawnSync(process.execPath, [GATE_BIN, 'probe', `--absence=${entry.id}`, '--json'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30_000 });
      expect(result.status, entry.id).toBe(0);
      const probe = JSON.parse(result.stdout);
      expect(probe.schemaVersion).toBe('nightwatch.topology-probe.v1');
      expect(probe.absence).toBe(entry.id);
    }
  });

  test('static mode runs the record, registration and regression checks as a process', () => {
    const result = spawnSync(process.execPath, [GATE_BIN, 'static', '--json', '--no-receipt'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 120_000 });
    expect([0, 1]).toContain(result.status);
    const receipt = JSON.parse(result.stdout);
    expect(receipt.schemaVersion).toBe('nightwatch.gate-topology-receipt.v1');
    expect(receipt.mode).toBe('static');
    expect(receipt.ciBlockRecord.blockClass).toBe('NO_STEPS_BILLING_OR_PLATFORM_BLOCK');
    expect(receipt.defectClasses.historicalRun).toBe('33572572053');
    expect(receipt.inverseSelfTest.ok).toBe(true);
    expect(receipt.ciClaim.githubExecutionProven).toBe(false);
    expect(receipt.ciClaim.statement).toContain('never proves GitHub execution');
    expect(receipt.result).toBe(result.status === 0 ? 'PASS' : 'FAIL');
  });
});

test.describe('X-02 — imported path constants resolve through the scan', () => {
  const HOST_LITERAL = ['', 'home', 'dalepalaca', 'go', 'src', 'alphaus-main', 'REPOSITORIES'].join('/');
  const modules: Record<string, string> = {
    'src/core/siblingRoot.ts': `export const DEFAULT_SIBLING_ROOT = '${HOST_LITERAL}';\n`,
    'src/core/siblingSource.ts': `export { DEFAULT_SIBLING_ROOT } from './siblingRoot';\n`,
  };
  const suite = (text: string) => ({ path: 'tests/unit/importConsumer.test.ts', text });
  const readFile = (modulePath: string): string | null => modules[modulePath] ?? null;

  test('an imported path constant used in a path context is a declared-host-path dependency', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [suite([
        "import { DEFAULT_SIBLING_ROOT } from '../../src/core/siblingSource';",
        'const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);',
      ].join('\n'))],
      declarations: [],
      readFile,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('TOPOLOGY_EXTERNAL_PATH_DEPENDENCE');
    // The import statement itself never counts; only the path use does.
    expect(findings[0]!.line).toBe(2);
    expect(findings[0]!.detail).toContain('via imported constant DEFAULT_SIBLING_ROOT');
    expect(findings[0]!.literal).toBe(HOST_LITERAL);
  });

  test('a source-text assertion naming the constant is not a path dependency', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [suite("import { DEFAULT_SIBLING_ROOT } from '../../src/core/siblingSource';\nexpect(name).toMatch(/DEFAULT_SIBLING_ROOT/);")],
      declarations: [],
      readFile,
    });
    expect(findings).toEqual([]);
  });

  test('a declaration of the resolved literal suppresses the imported-constant finding', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [suite("import { DEFAULT_SIBLING_ROOT } from '../../src/core/siblingSource';\ncreateSiblingSourceAccess(DEFAULT_SIBLING_ROOT);")],
      declarations: [{ file: 'tests/unit/importConsumer.test.ts', literal: HOST_LITERAL }],
      readFile,
    });
    expect(findings).toEqual([]);
  });

  test('without a reader the scan keeps its literal-only behavior', () => {
    const findings = scanExternalAbsolutePathDependence({
      files: [suite("import { DEFAULT_SIBLING_ROOT } from '../../src/core/siblingSource';\ncreateSiblingSourceAccess(DEFAULT_SIBLING_ROOT);")],
      declarations: [],
    });
    expect(findings).toEqual([]);
  });
});

test.describe('X-02 degraded envelope mode — direct observation on a bwrap-less host', () => {
  const absence = (/** @type {string} */ id: string) => {
    const found = TOPOLOGY_ABSENCES.find((entry) => entry.id === id);
    expect(found, id).toBeDefined();
    return found!;
  };

  test('an absence that took effect directly is constructible with no findings', () => {
    const direct = evaluateDirectObservation(absence('bwrap'), { available: false, blockerCode: 'BWRAP_UNAVAILABLE' });
    expect(direct.constructible).toBe(true);
    expect(direct.notExercised).toBe(false);
    expect(direct.findings).toEqual([]);
    // the constructed case still flows through the ordinary fail-closed judgement
    const findings = evaluateAbsence({ absence: absence('bwrap'), probe: { available: false, blockerCode: 'BWRAP_UNAVAILABLE' }, lane: { status: 'PASS', receipts: { deepContainmentLane: 'NOT_EXERCISED_BWRAP_UNAVAILABLE' } } });
    expect(findings.map((entry) => entry.code)).toEqual([]);
  });

  test('an absence this host cannot mask is a declared non-exercise, not a failure and not a pass', () => {
    const direct = evaluateDirectObservation(absence('chrome'), { available: true, blockerCode: null });
    expect(direct.constructible).toBe(false);
    expect(direct.notExercised).toBe(true);
    expect(direct.findings).toEqual([]);
  });

  test('a missing direct observation fails closed by name', () => {
    const direct = evaluateDirectObservation(absence('sibling-root'), null);
    expect(direct.constructible).toBe(false);
    expect(direct.notExercised).toBe(false);
    expect(direct.findings.map((entry) => entry.code)).toEqual(['TOPOLOGY_PROBE_FAILED']);
    expect(direct.findings[0]!.detail).toContain('sibling-root');
  });

  test('the gate wires one envelope decision and records it in the receipt', () => {
    const source = fs.readFileSync(GATE_BIN, 'utf8');
    expect(source).toContain('const envelopeAvailable = capa.filter(isExecutableRegularFile).length > 0;');
    expect(source).toContain('evaluateDirectObservation(absence, directProbe)');
    expect(source).toContain("envelope: envelopeAvailable ? 'BUBBLEWRAP' : 'BWRAP_UNAVAILABLE_DEGRADED'");
    // availability is decided once, before any spawn, so the decision and the
    // spawn can never disagree on a host without the binary
    expect(source.indexOf('const envelopeAvailable')).toBeLessThan(source.indexOf("runCapture('bwrap', probeArgs"));
  });
});
