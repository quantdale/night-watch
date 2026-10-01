#!/usr/bin/env node
// @ts-check

/**
 * Invariant family: the validation universe and the quality gates.
 *
 * Typecheck coverage, the validation universe classification, the CLI
 * implementation contract, bin execution coverage, the Phase 23 quality gate,
 * campaign certification, the single cookie-expiry evaluator and declared
 * dependency resolvability. The shared property is that a check which claims to
 * cover something is mechanically proven to run.
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  root,
  fail,
  readIncludingComments,
  read,
  readDataFile,
  gitFiles,
  walkWorkingTree,
  codeWithCommentsBlanked,
  isRuleEngineSource,
} from '../kernel.mjs';
import { validateCampaignCertification } from '../../campaign-certification.mjs';
import { evidenceArtifactExistsAtSha, laneArtifactDemotions } from '../../evidence-artifact.mjs';
import { checkpointRoleViolations, unpairedCorrectionsInRange } from '../../checkpoint-role.mjs';
import { findBinsWithoutExecutingTest, verifyCliImplementationContract } from '../../cli-implementation-contract.mjs';
import { classifyValidationTruth, extractTestMatchGlobs } from '../../validation-classification.mjs';
import {
  DOCUMENT_ROLE_CORRECTIONS_FILE,
  DOCUMENT_ROLE_CORRECTIONS_SCHEMA,
  RELEASE_EVIDENCE_FILE,
  lineSha256Prefix,
  RELEASE_EVIDENCE_SCHEMA,
  guardHoldsForChange,
  verifyPersistedReceipt,
} from '../../release-evidence.mjs';
import { bindTreeProbe, receiptBindingRelation, resolveProbeBinding } from '../../probe-binding.mjs';
import { classifyCheckpointRange } from '../../checkpoint-range.mjs';
import { buildUiHarnessReceipt, evaluateUiHarnessReceipt, extractApiErrorKinds, UI_HARNESS_REQUIRED_TESTS, UI_HARNESS_SUITE } from '../../ui-harness-receipt.mjs';

import { parseAccessibilityCertificationRecord } from '../../accessibility-record.mjs';
/**
 * R4-08 / review-4 task 2.1 — the collector's certification decisions must stay
 * REAL. The review named equivalent mutants that survived the honesty and
 * classifier rules; this rule kills them with BEHAVIOURAL fixtures wherever a
 * pure decision can be executed, plus whole-expression anchors for the few
 * collector-internal facts only a full checker run could otherwise observe.
 *
 * Behavioural half: `verifyPersistedReceipt` on a fixture root (a hard-coded
 * `{verified:true}` stub fails), `resolveProbeBinding`/`bindTreeProbe` on the
 * checkpoint facts, `evaluateUiHarnessReceipt`, `evaluateYieldCampaignEvidence`
 * and `parseAccessibilityCertificationRecord` each bound to ANOTHER commit.
 * Anchored half: the collector must derive its HEAD, its clean-tree state, its
 * documentary-descendant fact, its changed-file list, its harness source at S,
 * its certifying flags and its receipt verifier EXACTLY as reviewed.
 */
export function checkReview4CollectorTotality() {
  const collector = read('bin/project-state-check.mjs');
  const S = 'a'.repeat(40);
  const OTHER = 'b'.repeat(40);

  // --- behavioural: the receipt verifier really verifies ------------------
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-review4-receipt-'));
  try {
    const crypto = { createHash };
    /** @param {unknown} value @returns {string} */
    const stableCanonical = (value) => {
      if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
      if (Array.isArray(value)) return `[${value.map(stableCanonical).join(',')}]`;
      const record = /** @type {Record<string, unknown>} */ (value);
      return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableCanonical(record[key])}`).join(',')}}`;
    };
    fs.mkdirSync(path.join(directory, 'artifacts/receipts'), { recursive: true });
    /** @param {string} name @param {Record<string, unknown>} body @returns {string} */
    const writeGateReceipt = (name, body) => {
      const digest = `receipt:sha256:${crypto.createHash('sha256').update(stableCanonical(body)).digest('hex').slice(0, 24)}`;
      fs.writeFileSync(path.join(directory, 'artifacts/receipts', `${name}.json`), `${JSON.stringify({ ...body, receiptDigest: digest })}\n`);
      return digest;
    };
    const passBody = { schemaVersion: 'nightwatch.quality-gate-receipt.v1', subject: 'authoritative-gate', gitHead: S, finalResult: 'PASS' };
    const failBody = { ...passBody, finalResult: 'FAIL' };
    const passDigest = writeGateReceipt('pass', passBody);
    const failDigest = writeGateReceipt('fail', failBody);
    if (verifyPersistedReceipt(directory, 'authoritative-gate', passDigest, S).verified !== true) {
      fail('REVIEW4_RECEIPT_VERIFIER_STUBBED a persisted PASS receipt with the right subject no longer verifies');
    }
    if (verifyPersistedReceipt(directory, 'authoritative-gate', failDigest, S).verified !== false) {
      fail('REVIEW4_RECEIPT_VERIFIER_STUBBED a hand-written FAIL receipt verifies; the verdict check is gone');
    }
    if (verifyPersistedReceipt(directory, 'root-compile', passDigest, S).verified !== false) {
      fail('REVIEW4_RECEIPT_VERIFIER_STUBBED a receipt that declares ANOTHER subject certifies this subject');
    }
    if (verifyPersistedReceipt(directory, 'authoritative-gate', passDigest, OTHER).verified !== false) {
      fail('REVIEW4_RECEIPT_VERIFIER_STUBBED a receipt bound to another SHA certifies this one');
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }

  // --- behavioural: the tree-probe binding facts --------------------------
  const same = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: S, treeClean: true });
  const documentary = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: true });
  const substantive = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: false });
  const dirty = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: false, documentaryDescendant: true });
  if (!same.atCheckpoint || !documentary.atCheckpoint) {
    fail('REVIEW4_PROBE_BINDING_STUBBED the probe binding no longer admits HEAD == S or a clean documentary descendant of S');
  }
  if (substantive.atCheckpoint || dirty.atCheckpoint) {
    fail('REVIEW4_PROBE_BINDING_STUBBED the probe binding admits a substantive descendant or a dirty tree');
  }
  if (bindTreeProbe(substantive, { state: 'MET', detail: 'x' }).state === 'MET') {
    fail('REVIEW4_PROBE_BINDING_STUBBED bindTreeProbe passes a substantive descendant through as MET');
  }

  // --- behavioural: the receipt-consuming probes bind to S -----------------
  const harnessSource = fs.readFileSync(path.join(root, 'ui/control-center/src/contractRender.test.tsx'), 'utf8');
  const typesSource = fs.readFileSync(path.join(root, 'ui/control-center/src/types.ts'), 'utf8');
  const harnessTestCount = (harnessSource.match(/^\s*(?:it|test)\(/gm) ?? []).length;
  const harnessSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite === UI_HARNESS_SUITE);
  const otherSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite !== UI_HARNESS_SUITE);
  const extras = harnessTestCount - harnessSuite.length - 1 - otherSuite.length;
  /** @param {string} sha @returns {Record<string, unknown> | null} */
  const buildHarness = (sha) => buildUiHarnessReceipt({
    files: [{
      filepath: `/repo/ui/control-center/src/contractRender.test.tsx`,
      tasks: [
        {
          type: 'suite',
          name: UI_HARNESS_SUITE,
          tasks: [
            ...harnessSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (self-test)`, result: { state: 'pass' } })),
            { type: 'test', name: 'offers retry only for NETWORK, TIMEOUT, 408 and 429', result: { state: 'pass' } },
            ...Array.from({ length: Math.max(0, extras) }, (_, index) => ({ type: 'test', name: `fixture remainder ${index}`, result: { state: 'pass' } })),
          ],
        },
        { type: 'suite', name: 'control center render truth', tasks: otherSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (self-test)`, result: { state: 'pass' } })) },
      ],
    }],
    headSha: sha,
    treeClean: true,
    typesSource,
    harnessSource,
    executedAt: '2026-10-01T00:00:00.000Z',
  });
  const harnessAtS = buildHarness(S);
  const harnessAtOther = buildHarness(OTHER);
  if (harnessAtS === null || harnessAtOther === null) {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED the UI-harness self-test fixture could not be built');
    return;
  }
  const kindsAtS = extractApiErrorKinds(typesSource);
  const boundHarness = evaluateUiHarnessReceipt(harnessAtS, { certifiedCheckpointSha: S, expectedKinds: kindsAtS, harnessSourceAtS: harnessSource });
  const otherHarness = evaluateUiHarnessReceipt(harnessAtOther, { certifiedCheckpointSha: S, expectedKinds: kindsAtS, harnessSourceAtS: harnessSource });
  if (boundHarness.relation !== 'BOUND') {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED a UI-harness receipt at S no longer resolves BOUND');
  }
  if (otherHarness.relation === 'BOUND') {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED a UI-harness receipt bound to ANOTHER commit resolves BOUND to S');
  }
  if (evaluateUiHarnessReceipt(harnessAtS, { certifiedCheckpointSha: S, expectedKinds: kindsAtS, harnessSourceAtS: null }).ok) {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED a UI-harness receipt with no source AT S is accepted; the harness-source cross-check is gone');
  }
  const accessibility = { file: 'ui/control-center/artifacts/accessibility-certification.v1.json', sha: S, measuredFocusIndicators: 3, minimumFocusContrast: 4.5, sections: [] };
  if (receiptBindingRelation(S, accessibility.sha) !== 'BOUND' || receiptBindingRelation(S, OTHER) === 'BOUND') {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED receiptBindingRelation no longer distinguishes the bound SHA from another SHA');
  }
  if (typeof parseAccessibilityCertificationRecord(accessibility).ok !== 'boolean') {
    fail('REVIEW4_RECEIPT_PROBES_STUBBED the accessibility record parser is unavailable');
  }

  // --- anchored: the collector must derive its facts EXACTLY as reviewed ---
  const required = [
    ['const headSha = headOutput === null ? null : headOutput.trim();', 'the HEAD resolution (a `const headSha = substantiveSha` rewrite must be visible)'],
    ["const porcelainOutput = gitReadOnly(root, ['status', '--porcelain']);", 'the clean-tree measurement (an empty-string stub must be visible)'],
    ["treeClean: porcelainOutput === null ? null : porcelainOutput.trim() === '',", 'the clean-tree fact fed to the probe binding'],
    ["documentaryDescendant: rangeClass === 'DOCUMENTARY_DESCENDANT',", 'the documentary-descendant fact (an unconditional `true` must be visible)'],
    ["const output = gitReadOnly(root, ['diff', '--name-only', '--no-renames', `${from}..${to}`]);", 'the changed-file range callback'],
    ['return output === null ? null : output.split', 'the changed-file fail-closed return (a `return []` rewrite must be visible)'],
    ["harnessSourceAtS = typeof harnessAtCheckpoint === 'string' ? harnessAtCheckpoint : null;", 'the harness source committed AT S'],
    ["if (evaluated.relation !== 'BOUND') {", 'the receipt binding relation check'],
    ['evidenceCertifying: Object.fromEntries(', 'the certifying flags map (a cleared map must be visible)'],
    ['verifyEvidenceReceipt: (', 'the subject-carrying receipt verifier call form'],
    ['=> verifyPersistedReceipt(root, subject, digest, evidenceSha).verified,', 'the subject-carrying receipt verifier body'],
    ["if (evaluated.relation === 'BOUND') {", 'the yield/UI BOUND branch'],
  ];
  for (const [needle, what] of required) {
    if (typeof needle === 'string' && collector.includes(needle)) continue;
    fail(`REVIEW4_COLLECTOR_FACT_WEAKENED bin/project-state-check.mjs no longer carries ${what} (${String(needle).slice(0, 90)})`);
  }
}

export function checkTypecheckCoverage() {
  let config;
  try {
    config = JSON.parse(readDataFile('tsconfig.json'));
  } catch {
    fail('tsconfig.json is not valid JSON');
    return;
  }
  if (!Array.isArray(config.include) || !config.include.includes('playwright*.config.ts')) fail('tsconfig.json must include the complete playwright*.config.ts root-config pattern');
  for (const file of fs.readdirSync(root).filter((item) => /^playwright.*\.config\.ts$/.test(item))) {
    if (!fs.statSync(path.join(root, file)).isFile()) fail(`root Playwright config is not a regular file: ${file}`);
  }
}

export function checkValidationUniverse() {
  const result = spawnSync(process.execPath, [path.join(root, 'bin', 'validation-universe.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || typeof result.stdout !== 'string' || result.stdout.trim() === '') {
    fail('validation universe could not be discovered');
    return;
  }
  let judgement;
  try {
    judgement = JSON.parse(result.stdout);
  } catch {
    fail('validation universe judgement was not readable');
    return;
  }
  for (const error of (judgement.errors ?? []).slice(0, 12)) {
    fail(`validation universe: ${error.code}: ${error.detail}`);
  }
  const remaining = (judgement.errors ?? []).length - 12;
  if (remaining > 0) fail(`validation universe: ${remaining} further violation(s)`);
  // A judgement that classified nothing would pass vacuously.
  if ((judgement.counts?.discovered ?? 0) < 100) {
    fail('validation universe discovered implausibly few tests; discovery is broken rather than clean');
  }
  // Classification truth: the stored lane/class declarations, the default
  // runner, package.json and the tracked Playwright configs must agree with
  // each other, and a fixture may not fork the TypeScript loader.
  let universeDeclaration;
  let laneStateDeclaration;
  let packageManifest;
  let playwrightConfigSource;
  let referenceGraph;
  try {
    universeDeclaration = JSON.parse(read('config/validation-universe.v1.json'));
    laneStateDeclaration = JSON.parse(read('config/validation-lane-state.v1.json'));
    packageManifest = JSON.parse(read('package.json'));
    playwrightConfigSource = read('playwright.config.ts');
    referenceGraph = JSON.parse(read('config/reference-graph.v1.json'));
  } catch (error) {
    const message = (/** @type {Error | undefined} */ (error))?.message;
    fail(`validation classification inputs unreadable: ${String(message ?? error).slice(0, 120)}`);
    return;
  }
  const tracked = gitFiles();
  const classification = classifyValidationTruth({
    universe: universeDeclaration,
    laneState: laneStateDeclaration,
    packageScripts: packageManifest.scripts ?? {},
    testMatchGlobs: extractTestMatchGlobs(playwrightConfigSource),
    trackedPlaywrightConfigs: tracked.filter((file) => /^playwright[^/]*\.config\.ts$/.test(file)).sort(),
    packageScriptValues: Object.values(packageManifest.scripts ?? {}),
    binSources: tracked
      .filter((file) => /^bin\/.*\.mjs$/.test(file))
      .map((file) => ({ file, source: readIncludingComments(file) })),
    retentionEvidence: JSON.stringify(referenceGraph.retention ?? []),
    fixtureSources: tracked
      .filter((file) => /^tests\/fixtures\/.*\.mjs$/.test(file))
      .map((file) => ({ file, source: read(file) })),
  });
  for (const violation of classification.errors.slice(0, 12)) {
    fail(`validation classification: ${violation.code}: ${violation.detail}`);
  }
  const remainingClassification = classification.errors.length - 12;
  if (remainingClassification > 0) fail(`validation classification: ${remainingClassification} further violation(s)`);
}

/**
 * F-15 — the CLI-to-implementation contract. Every path a bin hands to the
 * runtime TypeScript loader must be a string literal, must resolve to a real
 * module, and every symbol the call site reads must be exported by that module.
 * The loader's typed declaration is generated from the same call sites, so a
 * renamed export or a moved module fails here, before any bin executes.
 */
export function checkCliImplementationContract() {
  const tracked = gitFiles();
  const binFiles = tracked.filter((file) => /^bin\/.*\.mjs$/.test(file)).sort();
  const files = binFiles.map((file) => ({ file, source: readIncludingComments(file) }));
  const judgement = verifyCliImplementationContract({
    files,
    access: {
      readSource: (relativePath) => {
        try {
          return fs.readFileSync(path.join(root, relativePath), 'utf8');
        } catch {
          return null;
        }
      },
      fileExists: (relativePath) => fs.existsSync(path.join(root, relativePath)),
    },
    readLoaderTypeMap: () => {
      try {
        return fs.readFileSync(path.join(root, 'bin', 'lib', 'typescript-runtime-loader.d.mts'), 'utf8');
      } catch {
        return null;
      }
    },
  });
  for (const finding of judgement.findings) {
    fail(`CLI contract ${finding.code}: ${finding.detail}`);
  }
  // A lane that extracted nothing would otherwise report success vacuously.
  if (judgement.stats.callSites === 0) fail('CLI contract resolved zero loader call sites; the extractor is broken rather than clean');
  if (judgement.stats.distinctPaths === 0) fail('CLI contract resolved zero module paths; the extractor is broken rather than clean');
  if (judgement.stats.literalPaths === 0) fail('CLI contract literal scan found zero referenced paths; the scan is broken rather than clean');
}

export function checkBinExecutionCoverage() {
  const bins = walkWorkingTree('bin', (name) => name.endsWith('.mjs')).filter((file) => !file.slice('bin/'.length).includes('/'));
  const tests = walkWorkingTree('tests', (name) => name.endsWith('.ts')).map((file) => ({ file, source: readIncludingComments(file) }));
  const coverage = findBinsWithoutExecutingTest({ bins, tests });
  if (coverage.bins.length === 0) {
    fail('BIN_EXECUTION_COVERAGE_VACUOUS: zero tracked bin entry points discovered');
    return;
  }
  for (const bin of coverage.uncovered) {
    fail(`BIN_EXECUTION_COVERAGE_MISSING: ${bin} has no test that executes it as a process`);
  }
}

export function checkPhase23QualityGate() {
  const workflow = readDataFile('.github/workflows/hardening.yml');
  const packageJson = readDataFile('package.json');
  const runner = readIncludingComments('bin/quality-gate.mjs');
  const runnerCode = read("bin/quality-gate.mjs");
  const specCode = read("bin/quality-gate-spec.mjs");
  const semanticCode = read("bin/semantic-compat.mjs");
  const clean = readIncludingComments('bin/quality-gate-clean.mjs');
  const cleanCode = read("bin/quality-gate-clean.mjs");
  const cleanLibraryCode = read('bin/lib/cleanCheckoutReceipt.mjs');
  let gate;
  let compatibility;
  try {
    gate = JSON.parse(readDataFile('config/quality-gate.v1.json'));
    compatibility = JSON.parse(readDataFile('config/semantic-compatibility.v1.json'));
  } catch {
    fail('Phase 23 quality-gate definitions must be valid JSON');
    return;
  }
  if (gate.schemaVersion !== 'nightwatch.quality-gate.v1' || !Array.isArray(gate.groups)) fail('Phase 23 quality-gate schema/version is invalid');
  const requiredGroups = ['GATE_DEFINITION', 'STATIC', 'HARDENING', 'HARDENING_PROBES', 'HANDOFF_TRUTH', 'PROJECT_TRUTH', 'AGENT_CONTINUITY', 'SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE', 'SYNTHETIC_CAMPAIGN', 'PATCH_INTEGRITY', 'WORKSPACE_INTEGRITY'];
  for (const id of requiredGroups) {
    const group = gate.groups.find((candidate) => candidate.id === id);
    if (!group || group.required !== true) fail(`Phase 23 required quality-gate group missing or optional: ${id}`);
  }
  if (compatibility.schemaVersion !== 'nightwatch.semantic-compatibility.v1' || compatibility.requiredPhaseRange?.first !== 9 || compatibility.requiredPhaseRange?.last !== 26) {
    fail('Phase 26 semantic compatibility manifest must bind Phase 9 through Phase 26');
  }
  if (!Array.isArray(compatibility.phaseSuites) || !compatibility.phaseSuites.some((suite) => suite.phase === 23) || !compatibility.phaseSuites.some((suite) => suite.phase === 24) || !compatibility.phaseSuites.some((suite) => suite.phase === 25) || !compatibility.phaseSuites.some((suite) => suite.phase === 26)) fail('Phase 23/24/25/26 semantic compatibility suite is missing');
  if (!/"gate:ci"\s*:\s*"node bin\/quality-gate\.mjs ci"/.test(packageJson)) fail('package.json must expose the fixed gate:ci entry point');
  if (!/"handoff:check"\s*:\s*"node bin\/planner-handoff-check\.mjs"/.test(packageJson)) fail('package.json must expose the fixed handoff checker entry point');
  if (!/"test:semantic-compat"\s*:\s*"node bin\/semantic-compat\.mjs"/.test(packageJson)) fail('package.json must expose the fixed semantic compatibility entry point');
  // VC-05: dependency installs in gate scripts must not execute package
  // lifecycle scripts (esbuild ships one); a needed script must be a declared
  // exception in DECISIONS, never silently re-enabled here.
  if (!/"gate:ui"\s*:\s*"npm ci --ignore-scripts --prefix ui\/control-center/.test(packageJson)) fail('package.json gate:ui must install UI dependencies with --ignore-scripts');
  if (!/modes\s*=\s*new Set\(\['local', 'ci', 'clean', 'predev'\]\)/.test(runnerCode)) fail('quality-gate runner must use a fixed mode allowlist');
  if (!/commandKey === 'HANDOFF_CHECK'/.test(runnerCode) || !/planner-handoff-check\.mjs/.test(runnerCode)) fail('quality-gate runner must own exactly one fixed handoff checker command');
  // R3-09 / corrections task 8.8: the TOPOLOGY group binds the receipt to its
  // own HEAD and records the certifying flag; PROVEN_DEGRADED must never pass
  // silently as certification.
  if (!/details\.topologyGitHead !== gateHead/.test(runnerCode) || !/TOPOLOGY_RECEIPT_STALE_HEAD/.test(runnerCode)) {
    fail('quality-gate runner must reject a topology receipt whose gitHead is not its own HEAD');
  }
  if (!/typeof details\.topologyCertifying !== 'boolean'/.test(runnerCode) || !/TOPOLOGY_RECEIPT_CERTIFYING_UNRECORDED/.test(runnerCode)) {
    fail('quality-gate runner must require the topology certifying flag to be recorded');
  }
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(runner)) fail('quality-gate runner exposes shell-capable or unbounded child execution');
  // R4-10 / review-4 task 3.1: the child-environment construction moved into
  // bin/lib/gate-child-environment.mjs so it is testable in isolation; the
  // sanitisation invariants are asserted there and the gate keeps its own.
  const gateChildEnvCode = read('bin/lib/gate-child-environment.mjs');
  if (!/NIGHTWATCH_STORAGE_STATE/.test(gateChildEnvCode) || !/GITHUB_TOKEN/.test(gateChildEnvCode) || !/environment\.TZ\s*=\s*['"]UTC['"]/.test(gateChildEnvCode)) fail('quality-gate runner does not sanitize credentials and host behavior');
  if (!/buildGateChildEnvironment\(process\.env, \{ mode, commandKey \}\)/.test(runnerCode)) fail('quality-gate runner no longer builds its child environment through the extracted builder');
  if (!/filePattern/.test(specCode) || !/QUALITY_GATE_UNKNOWN_COMMAND/.test(specCode) || !/QUALITY_GATE_DEPENDENCY_ORDER_INVALID/.test(specCode)) fail('quality-gate spec validator lacks fixed command/dependency fail-closed checks');
  if (!/shell=false|shell=false|spawnSync/.test(semanticCode) || !/SEMANTIC_COMPATIBILITY_PHASE_OMITTED/.test(semanticCode)) fail('semantic compatibility runner lacks bounded argv/phase omission checks');
  // VC-06: cleanliness is verified through measureClean (whose status calls
  // live lock-free in the receipt library) and every result flows through the
  // pure verdict — a dirty clone or source root can never fall through to the
  // inner gate's PASS.
  if (!clean || !/\['ci',\s*'--ignore-scripts'\]/.test(cleanCode) || !/measureClean\(root\)/.test(cleanCode) || !/resolveCleanCheckoutVerdict\(\{/.test(cleanCode) || !/\['status',\s*'--porcelain'\]/.test(cleanLibraryCode)) fail('clean-checkout runner must use npm ci --ignore-scripts and verify Git cleanliness');

  for (const [script, pattern] of [
    ['dev:phase23:manifest', /"dev:phase23:manifest"\s*:\s*"node bin\/phase23-dev\.mjs manifest"/],
    ['dev:phase23:dry-run', /"dev:phase23:dry-run"\s*:\s*"node bin\/phase23-dev\.mjs dry-run"/],
    ['dev:phase23:execute', /"dev:phase23:execute"\s*:\s*"node bin\/phase23-dev\.mjs execute"/],
    ['dev:phase23:predev', /"dev:phase23:predev"\s*:\s*"node bin\/phase23-predev\.mjs evaluate"/],
    ['ci:phase23:observe', /"ci:phase23:observe"\s*:\s*"node bin\/phase23-ci\.mjs observe"/],
  ]) if (!pattern.test(packageJson)) fail(`package.json must expose the fixed Phase 23 operator entry point: ${script}`);

  const phase23Operator = read('bin/phase23-dev.mjs');
  const phase23Manifest = read('src/core/phase23/manifest.ts');
  const phase23Observer = read('bin/phase23-ci.mjs');
  const phase23Predev = read('bin/phase23-predev.mjs');
  if (!/nightwatch\.dev-semantic-acceptance-manifest\.v2/.test(phase23Manifest) || !/DYNAMIC_TARGET_DISCOVERY_FORBIDDEN/.test(phase23Operator) || !/launcherInvocations:\s*1/.test(phase23Operator)) fail('Phase 23 DEV operator lacks the fresh v2 manifest, discovery block, or single-invocation bound');
  if (!/args\.env !== 'dev'/.test(phase23Operator) || !/phase22-real\.mjs/.test(phase23Operator) || !/maxBuffer:/.test(phase23Operator)) fail('Phase 23 DEV operator does not retain the guarded DEV-only Phase 22 execution path');
  if (!/requiredStepsUnavailable/.test(phase23Observer) || !/['"]run['"],\s*['"]view/.test(phase23Observer) || !/REQUIRED_JOB_STEPS_EMPTY/.test(read('src/core/qualityGate/externalCi.ts'))) fail('Phase 23 CI observer does not preserve the empty-step external-block rule');
  if (!/evaluatePreDevAuthority/.test(phase23Predev)) fail('Phase 23 pre-DEV receipt adapter is missing');

  const runCommands = workflow.split(/\r?\n/)
    .filter((line) => /^\s{8}run:\s*/.test(line))
    .map((line) => line.replace(/^\s{8}run:\s*/, '').trim());
  if (/upload-artifact|NIGHTWATCH_STORAGE_STATE|phase22-real|campaign:real|auth:capture/i.test(runCommands.join('\n'))) fail('GitHub workflow contains a private/authenticated execution path');
  if (!/permissions:\s*\n\s+contents:\s+read/.test(workflow)) fail('GitHub workflow permissions must remain contents: read');
  if (!/runs-on:\s*ubuntu-24\.04/.test(workflow)) fail('GitHub workflow must qualify on ubuntu-24.04 (pinned runner image, D-19)');
  if (!/node-version:\s*22/.test(workflow)) fail('GitHub workflow must use Node 22 (the locally qualified runtime, D-19)');
  const timeout = /timeout-minutes:\s*(\d+)/.exec(workflow);
  if (!timeout || Number(timeout[1]) < 15 || Number(timeout[1]) > 45) fail('GitHub workflow timeout must be a justified bounded 15–45 minute budget');
  if (runCommands.length !== 2 || runCommands[0] !== 'npm ci --ignore-scripts' || runCommands[1] !== 'npm run gate:ci') fail('GitHub workflow must contain only npm ci --ignore-scripts and the authoritative npm run gate:ci commands');
  if ((workflow.match(/^\s{8}run:\s*npm run gate:ci\s*$/gm) ?? []).length !== 1) fail('GitHub workflow must invoke gate:ci exactly once');
  if (/npx playwright test|playwright test|campaign:real|auth:capture|phase22-real|phase7-real|upload-artifact|secrets\./i.test(runCommands.join('\n'))) fail('GitHub workflow run commands contain forbidden direct tests, authenticated execution, or private artifact handling');
  for (const use of workflow.match(/^\s{8}uses:\s*.*$/gm) ?? []) {
    // D-19 / NW-AUD-001: checkout/setup-node use their Node-24-native majors.
    // The safe, read-only topology receipt uploader is the sole additional
    // action admitted here, at its reviewed immutable v4.6.2 commit.
    const nativeCoreAction = /actions\/(?:checkout|setup-node)@[0-9a-f]{40}(?:\s|$)/.test(use);
    const reviewedReceiptUploader = /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02(?:\s|$)/.test(use);
    if (!nativeCoreAction && !reviewedReceiptUploader) fail(`GitHub workflow uses an unpinned or unreviewed action: ${use.trim()}`);
  }
}

/**
 * FC-1 C-12 offline-rehearsal invariants.
 *
 * `src/core/c12Rehearsal/` is the single authorized local consumer of the P1
 * machinery outside tests. The exception is narrow and itself checked: the
 * cone must stay transport/actuation-free, fixture-pinned to the synthetic
 * `.invalid` namespace, structurally incapable of conferring live
 * authorization, and decoupled from the c12Readiness/alphausHandoff cones
 * (version strings are deliberate literal duplicates, the F-12 discipline
 * the P1 cone documents in its own types.ts).
 */
/**
 * FC-2 declared-dependency resolvability.
 *
 * DEF-FC-03: the `vue` devDependency was removed as "unused" while
 * tests/unit/rippleReadiness.test.ts still reached it through
 * `require.resolve('vue/dist/vue.js')`. Stale node_modules residue in the
 * canonical checkout hid the break; only a fresh install failed. Import
 * scanners miss require.resolve, so the invariant is enforced here: every
 * bare module specifier reached from tracked source must be a declared
 * dependency. A dependency a test resolves is by definition used.
 */
export function checkDeclaredDependencyResolvability() {
  let manifest;
  try {
    manifest = JSON.parse(readDataFile('package.json'));
  } catch {
    fail('package.json is not valid JSON; declared-dependency resolvability cannot be evaluated');
    return;
  }
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]);
  const specifierPattern = /(?:require\.resolve\(|import\(|\bfrom\s+)\s*['"]([^'"]+)['"]/g;
  for (const file of gitFiles()) {
    if (!file.endsWith('.ts') && !file.endsWith('.mjs')) continue;
    // ui/** is a separate workspace with its own manifest.
    if (file.startsWith('ui/')) continue;
    const source = read(file);
    for (const match of source.matchAll(specifierPattern)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) continue;
      // Template placeholders are not real specifiers.
      if (specifier.includes('${') || specifier.includes('\\')) continue;
      const packageName = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
      if (!declared.has(packageName)) {
        fail(`${file} resolves '${specifier}' but '${packageName}' is not a declared dependency; a package tracked source reaches is used and must stay declared`);
      }
    }
  }
}

/**
 * Campaign certification registry totality.
 *
 * Three conjuncts, enforced in one place over one declarative registry:
 * every campaign in the task ledger is DECLARED; every declared suite EXISTS
 * on disk; every declared suite is REGISTERED in a lane a REQUIRED gate group
 * runs. The judgement itself is pure and lives in
 * `bin/lib/campaign-certification.mjs`, so every failure path is
 * negative-probed by `tests/unit/r12CampaignCertification.test.ts` rather than
 * only by hand. This function does the I/O and nothing else.
 *
 * Completeness is anchored to the campaign task directories, not to test
 * filenames: a filename rule would have missed all four C-01 suites, none of
 * which is named `c01*`, and would misfire on unrelated suites starting with
 * `c`. The task ledger is real metadata the task protocol already requires.
 */
export function checkCampaignCertificationRegistry() {
  const parse = (file) => {
    try {
      return JSON.parse(readIncludingComments(file));
    } catch {
      return undefined;
    }
  };
  const registry = parse('config/campaign-certification.v1.json');
  if (registry === undefined) {
    fail('config/campaign-certification.v1.json must be valid JSON');
    return;
  }
  const gate = parse('config/quality-gate.v1.json');
  if (gate === undefined) {
    fail('config/quality-gate.v1.json must be valid JSON');
    return;
  }
  const lanes = new Map();
  for (const lane of Array.isArray(registry.lanes) ? registry.lanes : []) {
    if (typeof lane !== 'string') continue;
    const manifest = parse(lane);
    if (manifest !== undefined) lanes.set(lane, manifest);
  }
  const taskRoot = typeof registry.campaignTaskRoot === 'string' ? registry.campaignTaskRoot : '.agent/tasks';
  let campaignTasks;
  try {
    campaignTasks = fs.readdirSync(path.join(root, taskRoot), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    fail(`the campaign task ledger ${taskRoot} must be a readable directory`);
    return;
  }
  for (const message of validateCampaignCertification({
    registry,
    gate,
    lanes,
    campaignTasks,
    suiteExists: (suite) => fs.existsSync(path.join(root, suite)),
  })) fail(message);
}

/**
 * F-21. Cookie expiry has exactly ONE evaluator.
 *
 * `src/browser/fixtures/storageState.ts` owns the domain/path/expiry arithmetic
 * (`cookieApplicabilityFacts`) and is the source the authenticated-capability
 * pre-flight calls. Two evaluators for one question can disagree, and the
 * disagreement is silent: the pre-flight would report VALID while the browser
 * sees a cookie the page cannot read, or the reverse. This rule makes the
 * single-evaluator property structural rather than a code-review convention.
 *
 * The detector reads CODE ONLY: comments are blanked with spaces so line
 * numbers survive. It matches cookie-expiry *evaluation* forms — a property
 * read (`.expires`), a bracketed read (`['expires']`), a direct comparison, or
 * one of the evaluator's computed facts (`hasFutureExpiry`,
 * `numericExpiryEpochSeconds`). It deliberately does NOT match an object key
 * write (`expires: ...`), because constructing a cookie fixture is not
 * evaluating an expiry; `tests/unit/storageState.test.ts` is full of such
 * writes and must stay legal.
 *
 * Non-vacuity: the allowed evaluator must still contain matches of the
 * detector before any file is accused. If a refactor renames those forms, the
 * detector fails loudly instead of passing because it found nothing anywhere.
 */
export const AUTH_CAPABILITY_EXPIRY_EVALUATOR_FILE = 'src/browser/fixtures/storageState.ts';
export const AUTH_CAPABILITY_EXPIRY_EVALUATOR_PATTERNS = Object.freeze([
  { label: 'a cookie `expires` property read', pattern: /\.expires\b/g },
  { label: 'a bracketed cookie `expires` read', pattern: /\[\s*['"]expires['"]\s*\]/g },
  { label: 'a direct cookie `expires` comparison', pattern: /\bexpires(?:Raw)?\s*(?:===|!==|<=|>=|<|>)/g },
  { label: 'a `hasFutureExpiry` computation', pattern: /\bhasFutureExpiry\b/g },
  { label: 'a `numericExpiryEpochSeconds` computation', pattern: /\bnumericExpiryEpochSeconds\b/g },
]);

export function checkAuthenticatedCapabilitySingleEvaluator() {
  const allowedSource = codeWithCommentsBlanked(readIncludingComments(AUTH_CAPABILITY_EXPIRY_EVALUATOR_FILE));
  let allowedMatches = 0;
  for (const { pattern } of AUTH_CAPABILITY_EXPIRY_EVALUATOR_PATTERNS) {
    allowedMatches += (allowedSource.match(new RegExp(pattern.source, 'g')) ?? []).length;
  }
  if (allowedMatches === 0) {
    fail(`AUTH_CAPABILITY_SINGLE_EVALUATOR_VACUOUS ${AUTH_CAPABILITY_EXPIRY_EVALUATOR_FILE} contains none of the cookie-expiry evaluation forms this rule detects; the detector is broken rather than the repository clean`);
    return;
  }
  let scanned = 0;
  for (const file of gitFiles().filter((entry) => (
    (entry.startsWith('src/') || entry.startsWith('bin/') || entry.startsWith('tests/'))
    && /\.(?:ts|tsx|mjs|js)$/.test(entry)
    && entry !== AUTH_CAPABILITY_EXPIRY_EVALUATOR_FILE
    && !isRuleEngineSource(entry)
  ))) {
    scanned += 1;
    const source = codeWithCommentsBlanked(readIncludingComments(file));
    for (const { label, pattern } of AUTH_CAPABILITY_EXPIRY_EVALUATOR_PATTERNS) {
      for (const match of source.matchAll(new RegExp(pattern.source, 'g'))) {
        const line = source.slice(0, match.index).split('\n').length;
        fail(`AUTH_CAPABILITY_SECOND_EXPIRY_EVALUATOR ${file}:${line} contains ${label}; cookie expiry must be evaluated only by ${AUTH_CAPABILITY_EXPIRY_EVALUATOR_FILE}`);
      }
    }
  }
  if (scanned === 0) fail('AUTH_CAPABILITY_SECOND_EXPIRY_EVALUATOR scanned zero files; the check would pass vacuously');
}

/**
 * NW-AUD-001 / D-19 / VC-08 - every workflow file pins every action by full
 * commit SHA. The matcher is TOKEN-based rather than one whole-line regex so
 * it covers every `uses` KEY form GitHub accepts - block (`uses: x`), compact
 * (`- uses: x`), flow (`- { uses: x }`) and quoted (`"uses": "x"`) - and every
 * occurrence on a line. YAML comments are stripped quote-aware first, so a
 * trailing `# vX` never hides or fakes a reference. A `uses` key with no
 * inline reference fails closed (a deferred or empty value cannot be pinned);
 * without a YAML parser a heredoc line shaped exactly like a uses mapping
 * counts as one - suspicious copy-paste material fails closed rather than
 * passing. A tag, branch or floating major is a mutable supply-chain input
 * and fails.
 */
export function checkWorkflowActionPinning() {
  const workflowsDirectory = path.join(root, '.github', 'workflows');
  let entries = [];
  try {
    entries = fs.readdirSync(workflowsDirectory).filter((name) => /\.ya?ml$/.test(name)).sort();
  } catch {
    entries = [];
  }
  if (entries.length === 0) {
    fail('workflow pinning: no workflow files discovered; the scan is broken rather than the repository clean');
    return;
  }
  /**
   * Quote-aware YAML comment stripping: `#` starts a comment only outside a
   * quoted scalar and only at line start or after whitespace. Single-quote
   * doubling and double-quote backslash escapes are followed so a quoted `#`
   * is never mistaken for a comment (which could hide a moving reference), and
   * an unterminated scalar swallows the rest of the line unstripped - the
   * fail-closed direction.
   * @param {string} line
   * @returns {string}
   */
  const stripComment = (line) => {
    let i = 0;
    while (i < line.length) {
      const ch = line.charAt(i);
      if (ch === '#') {
        if (i === 0 || /\s/.test(line.charAt(i - 1))) return line.slice(0, i);
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        const quote = ch;
        i += 1;
        while (i < line.length) {
          const inner = line.charAt(i);
          if (quote === '"' && inner === '\\') { i += 2; continue; }
          if (inner === quote) {
            if (quote === "'" && line.charAt(i + 1) === "'") { i += 2; continue; }
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }
      i += 1;
    }
    return line;
  };
  // VC-08 - token-based matching covers every `uses` KEY form: block, compact,
  // flow and quoted, every occurrence on a line, with the comment stripped
  // first so a trailing `# vX` can neither hide nor fake a reference.
  const USES_KEY_RE = /(?:^|[\s,{])(?:"uses"|'uses'|uses)\s*:\s*("[^"]+"|'[^']+'|[^\s,}]+)/g;
  const USES_EMPTY_RE = /(?:^|[\s,{])(?:"uses"|'uses'|uses)\s*:\s*[},]?\s*$/;
  for (const name of entries) {
    const relative = path.posix.join('.github/workflows', name);
    let text;
    try {
      text = fs.readFileSync(path.join(workflowsDirectory, name), 'utf8');
    } catch {
      fail(`workflow pinning: cannot read ${relative}`);
      continue;
    }
    text.split(/\r?\n/).forEach((line, index) => {
      const mapping = stripComment(line);
      if (USES_EMPTY_RE.test(mapping)) {
        // A uses key with no inline reference fails closed: a deferred or
        // empty action reference cannot be pinned at all.
        fail(`workflow pinning ${relative}:${index + 1} declares a uses key with no inline reference; a deferred or empty action reference cannot be pinned`);
        return;
      }
      for (const match of mapping.matchAll(USES_KEY_RE)) {
        const reference = (match[1] ?? '').replace(/^['"]|['"]$/g, '');
        // Local actions and reusable-workflow paths are still pinned by ref.
        const trimmed = reference.startsWith('./') || reference.startsWith('.github/') ? reference.replace(/^\.\/|^\.github\//, '') : reference;
        const at = trimmed.lastIndexOf('@');
        if (at <= 0) {
          fail(`workflow pinning ${relative}:${index + 1} uses an unowned action reference without a @ref: ${reference}`);
          continue;
        }
        const pinned = trimmed.slice(at + 1);
        if (!/^[0-9a-f]{40}$/.test(pinned)) {
          fail(`workflow pinning ${relative}:${index + 1} uses a moving action reference (full commit SHA required): ${reference}`);
        }
      }
    });
  }
}

/**
 * VB-06 / corrections task 2.6 — the diff-shape guards must stay REAL
 * dispatches and the commit-role classifier must consume them live. A stubbed
 * guard (`return true`) or a classifier that stops calling the guard silently
 * re-opens every binding/registry rewrite this campaign closed (VB-01
 * evidence erasure, VB-02 artifact paths, VB-03 pairing).
 */
export function checkCheckpointRoleGuardIntegrity() {
  // VB-06 / corrections task 2.6, made BEHAVIOURAL by RV-06 (task 7.5): the
  // diff-shape guards must stay REAL and the commit-role classifier must
  // consume them live. A text-presence check is defeated by an early
  // `return true` that keeps every needle in the file, so this rule RUNS the
  // guards on fixtures and demands the verdict each one exists to produce.
  // A stubbed guard (`return true`) passes the "must hold" fixtures and fails
  // every "must NOT hold" one — which is what a stub cannot fake.
  const sha = (/** @type {string} */ ch) => ch.repeat(40);
  const digest = (/** @type {string} */ ch) => `receipt:sha256:${ch.repeat(24)}`;
  const binding = (/** @type {Record<string, unknown>} */ overrides = {}) => ({
    subject: 'lane-one',
    evidenceSha: sha('a'),
    receiptDigest: digest('1'),
    observedAt: '2026-09-30T00:00:00.000Z',
    executor: 'gate:local',
    artifactPaths: [],
    certifying: true,
    ...overrides,
  });
  const evidence = (/** @type {unknown[]} */ bindings) => JSON.stringify({ schemaVersion: RELEASE_EVIDENCE_SCHEMA, bindings });
  const correction = (/** @type {string} */ id, /** @type {string} */ ch) => ({
    id,
    path: 'docs/CURRENT_STATE.md',
    oldLineSha256: `sha256:${ch.repeat(24)}`,
    oldLineExcerpt: 'retired line',
    reason: 'synthetic',
  });
  const corrections = (/** @type {unknown[]} */ entries) => JSON.stringify({ schemaVersion: DOCUMENT_ROLE_CORRECTIONS_SCHEMA, corrections: entries });
  /** @type {Array<[string, string | null, string | null, boolean, string, { verifyReceipt?: (subject: string, digest: string, sha: string) => boolean } | undefined]>} */
  const cases = [
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding()]), true, 'an unchanged bindings file', undefined],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ evidenceSha: sha('b'), receiptDigest: digest('2') })]), true, 'a re-bind that arrives with a new VERIFIED receipt', { verifyReceipt: () => true }],
    // R3-05 / corrections task 8.4: the same shape with an unverifiable
    // digest is substantive — a hand-written receipt is not evidence.
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ evidenceSha: sha('b'), receiptDigest: digest('2') })]), false, 'a re-bind whose receipt does not verify', { verifyReceipt: () => false }],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ receiptDigest: digest('2') })]), false, 'a receipt addition at the same SHA whose digest does not verify', { verifyReceipt: () => false }],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ evidenceSha: null })]), false, 'evidence erasure (VB-01)', undefined],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ artifactPaths: ['config/x.json'] })]), false, 'a non-value binding key (VB-02)', undefined],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ evidenceSha: sha('b'), receiptDigest: null })]), false, 'a re-bind with no receipt (RV-02)', undefined],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding({ evidenceSha: sha('b') })]), false, 'a re-bind that reuses the old receipt (RV-02)', undefined],
    [RELEASE_EVIDENCE_FILE, evidence([binding()]), evidence([binding(), binding({ subject: 'lane-two' })]), false, 'an added subject', undefined],
    [RELEASE_EVIDENCE_FILE, null, evidence([binding()]), false, 'an added bindings file', undefined],
    [DOCUMENT_ROLE_CORRECTIONS_FILE, corrections([correction('C-1', 'a')]), corrections([correction('C-1', 'a'), correction('C-2', 'b')]), true, 'a valid corrections append', undefined],
    [DOCUMENT_ROLE_CORRECTIONS_FILE, corrections([correction('C-1', 'a')]), corrections([correction('C-1', 'c')]), false, 'an edited correction', undefined],
    [DOCUMENT_ROLE_CORRECTIONS_FILE, corrections([correction('C-1', 'a'), correction('C-2', 'b')]), corrections([correction('C-1', 'a')]), false, 'a removed correction', undefined],
    ['docs/CURRENT_STATE.md', 'x\n', 'x\n', false, 'an unguarded path (no path-alone approval through the guard)', undefined],
  ];
  for (const [file, before, after, expected, what, options] of cases) {
    let actual;
    try {
      actual = guardHoldsForChange(file, before, after, options ?? {});
    } catch {
      actual = null;
    }
    if (actual !== expected) {
      fail(`CHECKPOINT_ROLE_GUARD_STUBBED guardHoldsForChange(${file}) returned ${String(actual)} for ${what}; expected ${String(expected)} — a stubbed or weakened guard re-opens every guarded rewrite`);
    }
  }
  // RV-03 / corrections task 7.3: the evidence-artifact existence probe that
  // condition AND lane bindings depend on must really consult git. A repo with
  // two commits proves presence, absence-at-an-earlier-commit, a missing path
  // and an unknown commit — a stub that answers `true` fails three of the five.
  verifyEvidenceArtifactProbe();
  // RV-04 / task 7.4: correction pairing is judged per commit and per entry's
  // own archive, proven on a real two-commit split.
  verifyCorrectionPairingFixture();
  // R3-11 / corrections task 8.10: the classifier dispatch is BEHAVIOURAL —
  // `checkpointRoleViolations` runs on a real git fixture, so `&& false` on the
  // guard call or an early return before the guard loop misclassifies a
  // substantive guarded rewrite and fails here.
  verifyCheckpointRoleClassifierFixture();
  // The classifier must still dispatch to the guard and exclude guarded paths
  // from path-alone approval.
  const checkpoint = read('bin/lib/checkpoint-role.mjs');
  const required = [
    ['guardHoldsForChange(file, before, after, guardOptions)', 'the classifier live guard consumption'],
    ['guardClassForPath(file) === null && !isApprovedCheckpointPath(file)', 'the guarded-path exclusion from path-alone approval'],
  ];
  for (const [needle, what] of required) {
    if (!checkpoint.includes(needle)) {
      fail(`CHECKPOINT_ROLE_GUARD_STUBBED bin/lib/checkpoint-role.mjs no longer carries ${what} (${needle}); a dropped guard re-opens every guarded rewrite`);
    }
  }
}

/**
 * A-02 / D-01 — the release registry's `implemented` flag must equal whether a
 * probe is wired. The flag is a claim about the collector: `implemented: true`
 * says the check resolves a real probe output at evaluation time, `false` says
 * its capability has not landed. This rule reads both sides — the registry
 * entries and the collector's output keys — and requires exact agreement,
 * including no orphan collector output. It fails loudly when either side
 * parses to nothing rather than passing vacuously.
 */
export function checkReleaseImplementedHonesty() {
  const registry = read('src/core/releaseCertification/index.ts');
  const collector = read('bin/project-state-check.mjs');
  const declared = [];
  const entryRe = /\{\s*id:\s*'([a-z0-9-]+)'[^}]*?implemented:\s*(true|false)/g;
  for (const match of registry.matchAll(entryRe)) {
    const id = match[1];
    const flag = match[2];
    if (id === undefined || flag === undefined) continue;
    declared.push({ id, implemented: flag === 'true' });
  }
  const collectStart = collector.indexOf('function collectReleaseCheckOutputs(');
  const collectEnd = collector.indexOf('function collectExternalTrack(');
  if (collectStart < 0 || collectEnd <= collectStart) {
    fail('collectReleaseCheckOutputs must exist before collectExternalTrack in bin/project-state-check.mjs');
    return;
  }
  const wired = new Set();
  for (const match of collector.slice(collectStart, collectEnd).matchAll(/^\s*'([a-z0-9-]+)':/gm)) {
    const id = match[1];
    if (id !== undefined) wired.add(id);
  }
  if (declared.length === 0 || wired.size === 0) {
    fail(`release implemented honesty cannot be evaluated: declared=${declared.length} wired=${wired.size}`);
    return;
  }
  const declaredIds = new Set(declared.map((entry) => entry.id));
  for (const check of declared) {
    const hasProbe = wired.has(check.id);
    if (check.implemented !== hasProbe) {
      fail(`RELEASE_IMPLEMENTED_FLAG_MISMATCH: ${check.id} declares implemented=${check.implemented} but the collector ${hasProbe ? 'carries' : 'does not carry'} a probe for it`);
    }
  }
  for (const id of wired) {
    if (!declaredIds.has(id)) {
      fail(`RELEASE_COLLECTOR_ORPHAN: the collector carries an output for undeclared check ${id}`);
    }
  }
  verifyD3ProbeBinding(collector, collector.slice(collectStart, collectEnd));
  verifyLaneArtifactWiring(collector);
}

/**
 * R3-08 / corrections task 8.7 — the lane-artifact demotion is BEHAVIOURAL:
 * the pure `laneArtifactDemotions` is executed on fixtures, and the collector
 * must consume it. A stubbed existence probe or a disabled lane loop fails.
 * @param {string} collectorSource the whole collector file
 */
function verifyLaneArtifactWiring(collectorSource) {
  const S = 'a'.repeat(40);
  const lanes = [{ laneId: 'lane-one', reportedClass: 'PROVEN' }];
  const bindings = new Map([['lane-one', { evidenceSha: S, artifactPaths: ['config/x.json'] }]]);
  const absent = laneArtifactDemotions(lanes, bindings, () => false);
  if (!absent.demoted.has('lane-one') || absent.findings.length !== 1) {
    fail('LANE_ARTIFACT_CHECK_UNWIRED: a PROVEN lane whose declared artifact is absent at its SHA must be demoted');
  }
  const present = laneArtifactDemotions(lanes, bindings, () => true);
  if (present.demoted.size !== 0 || present.findings.length !== 0) {
    fail('LANE_ARTIFACT_CHECK_UNWIRED: a PROVEN lane whose declared artifact exists must not be demoted');
  }
  const unproven = laneArtifactDemotions([{ laneId: 'lane-one', reportedClass: 'BLOCKED_EXTERNAL' }], bindings, () => false);
  if (unproven.demoted.size !== 0) {
    fail('LANE_ARTIFACT_CHECK_UNWIRED: a non-PROVEN lane must not be demoted by the artifact loop');
  }
  if (!collectorSource.includes('laneArtifactDemotions(reported, laneBindings.bySubject ?? new Map(), (sha, artifactPath) => evidenceArtifactExistsAtSha(root, sha, artifactPath))')) {
    fail('LANE_ARTIFACT_CHECK_UNWIRED: bin/project-state-check.mjs no longer routes its lane artifacts through laneArtifactDemotions/evidenceArtifactExistsAtSha');
  }
  if (collectorSource.includes('binding?.evidenceSha ?? lane.evidenceSha')) {
    fail('LANE_ARTIFACT_CHECK_UNWIRED: the dead binding?.evidenceSha ?? lane.evidenceSha overlay has returned');
  }
}

/**
 * VD-01 / corrections tasks 4.1 and 4.5 (design D3): a release probe resolves
 * MET only at the certified checkpoint. The collector must therefore route
 * every D3-bound check through the binding, structurally and per check:
 *   - a probe that EXECUTES against the working tree is wrapped in
 *     `bindTreeProbe(binding, probeX(root))`;
 *   - a probe that consumes a RECEIPT is called with the certified checkpoint
 *     (`probeX(root, substantiveSha)`) and its own body can resolve
 *     NOT_AT_CHECKPOINT (`receiptNotAtCheckpoint(`) for a receipt bound to
 *     another commit;
 *   - the binding itself is derived from the certified checkpoint.
 * Each expression is matched whole (anchored), so an extra unsafe occurrence
 * elsewhere cannot be masked by a surviving safe one.
 * @param {string} collectorSource the whole collector file
 * @param {string} collectorBody the collectReleaseCheckOutputs function text
 */
function verifyD3ProbeBinding(collectorSource, collectorBody) {
  const treeBound = [
    'dead-architecture-closure-check',
    'schema-version-lifecycle-check',
    'configuration-contract-check',
    'authenticated-capability-lifecycle-check',
  ];
  const receiptBound = ['ui-error-taxonomy-check', 'yield-campaign-result', 'accessibility-certification'];
  const entryFor = (/** @type {string} */ id) => {
    const match = new RegExp(`^\\s*'${id}':\\s*(.+?),\\s*$`, 'm').exec(collectorBody);
    return match === null ? null : (match[1] ?? '').trim();
  };
  for (const id of treeBound) {
    const expression = entryFor(id);
    if (expression === null) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: the collector carries no single-line output for ${id}, so its checkpoint binding cannot be verified`);
    } else if (!/^bindTreeProbe\(binding,\s*probe[A-Za-z0-9]+\(root\)\)$/.test(expression)) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: ${id} must resolve through bindTreeProbe(binding, probeX(root)); a working-tree probe may be MET only at the certified checkpoint (found: ${expression})`);
    }
  }
  for (const id of receiptBound) {
    const expression = entryFor(id);
    if (expression === null) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: the collector carries no single-line output for ${id}, so its receipt binding cannot be verified`);
      continue;
    }
    const call = /^(probe[A-Za-z0-9]+)\(root, substantiveSha\)$/.exec(expression);
    if (call === null) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: ${id} must be called as probeX(root, substantiveSha) so its receipt is compared with the certified checkpoint (found: ${expression})`);
      continue;
    }
    const functionStart = collectorSource.indexOf(`function ${call[1]}(`);
    const functionEnd = functionStart < 0 ? -1 : collectorSource.indexOf('\n}\n', functionStart);
    const body = functionStart < 0 || functionEnd < 0 ? '' : collectorSource.slice(functionStart, functionEnd);
    if (body === '') {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: the body of ${call[1]} for ${id} could not be located`);
    } else if (!/\breceiptNotAtCheckpoint\(/.test(body)) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: ${call[1]} for ${id} never resolves NOT_AT_CHECKPOINT for a receipt bound to another commit`);
    }
  }
  // R3-04 / R3-07 / corrections task 8.6: EVERY other working-tree output is
  // bound through bindTreeProbe; an unwrapped probe is a measurement of the
  // working tree presented as a measurement of S.
  for (const match of collectorBody.matchAll(/^\s*'([a-z0-9-]+)':\s*(.+?),\s*$/gm)) {
    const id = match[1];
    const expression = (match[2] ?? '').trim();
    if (id === undefined || receiptBound.includes(id)) continue;
    if (!/^bindTreeProbe\(binding,\s*[A-Za-z0-9_.()\[\]' ,]+?\)$/.test(expression)) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: ${id} is not bound through bindTreeProbe(binding, ...) (found: ${expression})`);
    }
  }
  // The binding facts and the three receipt relations are exact expressions; a
  // flipped comparison or a hard-coded fact cannot survive them.
  /** @type {Array<[string, string]>} */
  const relationAnchors = [
    ["headSha,\n    treeClean: porcelainOutput === null ? null : porcelainOutput.trim() === '',", 'the binding facts read from Git, not hard-coded'],
    ["if (evaluated.relation !== 'BOUND') {", 'the G18 receipt relation comparison'],
    ["if (evaluated.relation === 'BOUND') {", 'the G12 receipt relation comparison'],
    ["if (receiptBindingRelation(certifiedCheckpointSha, parsed.summary.sha) !== 'BOUND') {", 'the G20 record relation comparison'],
  ];
  for (const [needle, what] of relationAnchors) {
    if (!collectorSource.includes(needle)) {
      fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: bin/project-state-check.mjs no longer carries ${what} (${needle}); a flipped relation or a hard-coded fact re-opens the D3 hole`);
    }
  }
  verifyD3ProbeBehaviour();
  if (!/resolveProbeBinding\(\{\s*certifiedCheckpointSha:\s*substantiveSha,/.test(collectorBody)) {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: the probe binding must be derived from the certified checkpoint (certifiedCheckpointSha: substantiveSha)');
  }
}


/**
 * R3-07 / corrections task 8.6 — the D3 clause is BEHAVIOURAL: the shared
 * predicates are executed on fixtures, so a mutant that makes the binding
 * accept a non-checkpoint measurement, or that inverts a receipt relation, is
 * detected by what the code DOES, not by what it says.
 */
function verifyD3ProbeBehaviour() {
  const S = 'a'.repeat(40);
  const OTHER = 'b'.repeat(40);
  const met = { state: 'MET', detail: 'fixture measurement' };
  const away = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: false });
  if (bindTreeProbe(away, met).state !== 'NOT_AT_CHECKPOINT') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: bindTreeProbe no longer demotes a MET measurement taken away from the certified checkpoint');
  }
  const documentary = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: true, documentaryDescendant: true });
  if (bindTreeProbe(documentary, met).state !== 'MET') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: a documentary descendant of S must keep a MET measurement (R3-03)');
  }
  const dirty = resolveProbeBinding({ certifiedCheckpointSha: S, headSha: OTHER, treeClean: false, documentaryDescendant: true });
  if (bindTreeProbe(dirty, met).state !== 'NOT_AT_CHECKPOINT') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: a dirty tree must never be at the certified checkpoint');
  }
  if (classifyCheckpointRange({ certifiedCheckpointSha: S, headSha: OTHER, isAncestor: () => true, changedFiles: () => ['docs/CURRENT_STATE.md'], checkpointRoleViolations: () => ['docs/CURRENT_STATE.md'] }) !== 'SUBSTANTIVE_DESCENDANT') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: classifyCheckpointRange no longer refuses a substantive descendant');
  }
  if (classifyCheckpointRange({ certifiedCheckpointSha: S, headSha: OTHER, isAncestor: () => false, changedFiles: () => [], checkpointRoleViolations: () => [] }) !== 'UNRELATED') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: classifyCheckpointRange no longer refuses an unrelated history');
  }
  if (receiptBindingRelation(S, S) !== 'BOUND' || receiptBindingRelation(S, OTHER) !== 'BOUND_TO_OTHER') {
    fail('RELEASE_PROBE_NOT_CHECKPOINT_BOUND: receiptBindingRelation no longer distinguishes BOUND from BOUND_TO_OTHER');
  }
  const kinds = ['NETWORK', 'HTTP', 'INVALID_RESPONSE', 'TIMEOUT', 'ABORTED'];
  const typesSource = `export const API_ERROR_KINDS = [${kinds.map((kind) => `'${kind}'`).join(', ')}] as const;`;
  const harnessSource = ['describe("fixture", () => {', ...Array.from({ length: 6 }, (_, index) => `  it("fixture ${index}", () => {});`), '});'].join('\n');
  const harnessSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite === UI_HARNESS_SUITE);
  const otherSuite = UI_HARNESS_REQUIRED_TESTS.filter((entry) => entry.suite !== UI_HARNESS_SUITE);
  const vitestFile = {
    filepath: '/repo/ui/control-center/src/contractRender.test.tsx',
    tasks: [
      {
        type: 'suite',
        name: UI_HARNESS_SUITE,
        tasks: [
          ...harnessSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })),
          { type: 'test', name: 'offers retry only for NETWORK, TIMEOUT, 408 and 429', result: { state: 'pass' } },
        ],
      },
      {
        type: 'suite',
        name: 'control center render truth',
        tasks: otherSuite.map((entry) => ({ type: 'test', name: `${entry.titlePrefix} (fixture)`, result: { state: 'pass' } })),
      },
    ],
  };
  const build = (/** @type {string} */ sha) => buildUiHarnessReceipt({ files: [vitestFile], headSha: sha, treeClean: true, typesSource, harnessSource, executedAt: '2026-09-30T00:00:00.000Z' });
  const context = { certifiedCheckpointSha: S, expectedKinds: kinds, harnessSourceAtS: harnessSource };
  const bound = evaluateUiHarnessReceipt(build(S), context);
  const other = evaluateUiHarnessReceipt(build(OTHER), context);
  if (bound.relation !== 'BOUND' || other.relation !== 'BOUND_TO_OTHER') {
    fail(`RELEASE_PROBE_NOT_CHECKPOINT_BOUND: evaluateUiHarnessReceipt no longer binds by the receipt SHA (got ${bound.relation}/${other.relation})`);
  }
}


/**
 * R3-11 / corrections task 8.10 — run the REAL classifier on a git fixture:
 * a values-only re-bind with a verifying receipt is documentary; a structural
 * (artifactPaths) change is substantive; a guarded path is never approved by
 * path alone. A stubbed or short-circuited dispatch cannot pass.
 */
function verifyCheckpointRoleClassifierFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-role-classifier-'));
  const run = (/** @type {string[]} */ args) => spawnSync('git', args, {
    cwd: directory,
    env: { PATH: '/usr/bin:/bin', HOME: directory, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid', LANG: 'C' },
    shell: false,
    encoding: 'utf8',
    timeout: 15_000,
  });
  const sha = (/** @type {string} */ ch) => ch.repeat(40);
  const binding = (/** @type {Record<string, unknown>} */ overrides = {}) => JSON.stringify({
    schemaVersion: RELEASE_EVIDENCE_SCHEMA,
    bindings: [{
      subject: 'root-compile',
      evidenceSha: sha('a'),
      receiptDigest: `receipt:sha256:${'1'.repeat(24)}`,
      observedAt: '2026-09-30T00:00:00.000Z',
      executor: 'gate:local',
      artifactPaths: [],
      certifying: true,
      ...overrides,
    }],
  });
  try {
    if (run(['init', '--quiet']).status !== 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the classifier fixture repository could not be created');
      return;
    }
    fs.mkdirSync(path.join(directory, 'config'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'config/release-evidence.v1.json'), binding());
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'binding base']);
    const base = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    const mainBranch = (run(['rev-parse', '--abbrev-ref', 'HEAD']).stdout ?? '').trim();
    // A values-only re-bind WITH a verifying receipt: documentary.
    fs.writeFileSync(path.join(directory, 'config/release-evidence.v1.json'), binding({ evidenceSha: sha('b'), receiptDigest: `receipt:sha256:${'2'.repeat(24)}` }));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'values-only re-bind']);
    const valuesOnly = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    // A structural change (artifactPaths): substantive.
    fs.writeFileSync(path.join(directory, 'config/release-evidence.v1.json'), binding({ evidenceSha: sha('b'), receiptDigest: `receipt:sha256:${'2'.repeat(24)}`, artifactPaths: ['config/x.json'] }));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'structural binding change']);
    const structural = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    /** @type {{ kind: 'commit', commit: string, verifyBindingReceipt: () => boolean }} */
    const context = { kind: 'commit', commit: valuesOnly, verifyBindingReceipt: () => true };
    const valuesViolations = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], context);
    if (valuesViolations.length !== 0) {
      fail(`CHECKPOINT_ROLE_GUARD_STUBBED the classifier no longer accepts a values-only re-bind with a verified receipt (got ${valuesViolations.join(',')})`);
    }
    const structuralViolations = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'commit', commit: structural, verifyBindingReceipt: () => true });
    if (structuralViolations.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the classifier no longer flags a structural binding change as substantive');
    }
    // A guarded path is never approved by path alone.
    const pathAlone = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'commit', commit: valuesOnly });
    if (pathAlone.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED a guarded path was approved by path alone without the guard or a receipt verifier');
    }
    // An UNGUARDED, non-approved path is a violation on the path filter alone;
    // `&& false` on that filter would silently drop it.
    const unguarded = checkpointRoleViolations(directory, ['fixture-unapproved.txt'], { kind: 'commit', commit: valuesOnly });
    if (unguarded.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED an unguarded non-approved path was approved (the path filter is short-circuited)');
    }
    // R4-08 / review-4 task 2.1 — a `kind: 'range'` classification must walk
    // EVERY commit in the range (a range-branch early return would classify the
    // aggregate as documentary). The range from the base to the VALUES-ONLY
    // commit is documentary with a verifier; the range to the STRUCTURAL commit
    // is substantive.
    const documentaryRange = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'range', from: base, to: valuesOnly, verifyBindingReceipt: () => true });
    if (documentaryRange.length !== 0) {
      fail(`CHECKPOINT_ROLE_GUARD_STUBBED the classifier no longer accepts a documentary RANGE with verified receipts (got ${documentaryRange.join(',')})`);
    }
    const substantiveRange = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'range', from: base, to: structural, verifyBindingReceipt: () => true });
    if (substantiveRange.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED a range containing a structural guarded rewrite was classified documentary (a range-branch early return or a dropped commit walk)');
    }
    // R4-08: a MERGE that carries a structural guarded rewrite against ONE
    // parent is substantive. Without `-m` a merge commit lists NOTHING, so the
    // rewrite would be invisible; first-parent-only handling hides it too.
    run(['checkout', '--quiet', '-b', 'fixture-side', structural]);
    fs.writeFileSync(path.join(directory, 'config/release-evidence.v1.json'), binding({ evidenceSha: null }));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'side structural null-out']);
    run(['checkout', '--quiet', mainBranch]);
    fs.writeFileSync(path.join(directory, 'fixture-mainline.txt'), 'mainline\n');
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'mainline prose']);
    run(['merge', '--no-ff', '--no-gpg-sign', '-m', 'merge the structural rewrite', 'fixture-side']);
    const merged = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    const mergeViolations = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'commit', commit: merged, verifyBindingReceipt: () => true });
    if (mergeViolations.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED a merge carrying a structural guarded rewrite against one parent was classified documentary (first-parent-only handling or a missing -m)');
    }
    // R4-08: an `ours`-resolution merge keeps the mainline tree, so the guarded
    // rewrite is visible ONLY against the SECOND parent. A first-parent-only
    // evaluation misses it; the per-parent loop must catch it.
    run(['checkout', '--quiet', '-b', 'fixture-side2', base]);
    fs.writeFileSync(path.join(directory, 'config/release-evidence.v1.json'), binding({ evidenceSha: sha('c'), receiptDigest: `receipt:sha256:${'3'.repeat(24)}`, artifactPaths: ['config/y.json'] }));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'side2 structural rewrite']);
    run(['checkout', '--quiet', mainBranch]);
    run(['merge', '--no-ff', '-s', 'ours', '--no-gpg-sign', '-m', 'merge ours: keep the mainline tree', 'fixture-side2']);
    const oursMerged = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    const oursViolations = checkpointRoleViolations(directory, ['config/release-evidence.v1.json'], { kind: 'commit', commit: oursMerged, verifyBindingReceipt: () => true });
    if (oursViolations.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED an `ours`-resolution merge hiding a structural guarded rewrite against its second parent was classified documentary (first-parent-only evaluation)');
    }
    // R4-08: an unpaired corrections APPEND must make the classifier's touch of
    // the corrections file substantive. The guard holds (append-only shape), so
    // only the pairing branch can catch it.
    fs.writeFileSync(path.join(directory, 'config/document-role-corrections.v1.json'), `${JSON.stringify({ schemaVersion: DOCUMENT_ROLE_CORRECTIONS_SCHEMA, corrections: [] })}\n`);
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'seed the corrections registry']);
    fs.writeFileSync(path.join(directory, 'config/document-role-corrections.v1.json'), `${JSON.stringify({ schemaVersion: DOCUMENT_ROLE_CORRECTIONS_SCHEMA, corrections: [{ id: 'CORR-SELFTEST', path: 'docs/archive.md', oldLineSha256: lineSha256Prefix('a line that still exists'), oldLineExcerpt: 'a line that still exists', reason: 'self-test' }] })}\n`);
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'unpaired correction append']);
    const unpairedCorrections = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    const pairingViolations = checkpointRoleViolations(directory, [DOCUMENT_ROLE_CORRECTIONS_FILE], { kind: 'commit', commit: unpairedCorrections });
    if (pairingViolations.length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED an unpaired correction append was classified documentary (the classifier no longer pairs corrections)');
    }
    // R4-13 / review-4 task 3.4: an `openspec/changes/archive/<dated>-<change>/`
    // path is documentary ONLY as a byte-identical move of the named change's
    // file in the same commit. A copy (source still present) or an edit is
    // substantive.
    fs.mkdirSync(path.join(directory, 'openspec/changes/fixture-change'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'openspec/changes/fixture-change/tasks.md'), '# tasks\n');
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'seed the change to archive']);
    fs.mkdirSync(path.join(directory, 'openspec/changes/archive/2026-10-01-fixture-change'), { recursive: true });
    fs.copyFileSync(path.join(directory, 'openspec/changes/fixture-change/tasks.md'), path.join(directory, 'openspec/changes/archive/2026-10-01-fixture-change/tasks.md'));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'copy (the source still exists)']);
    const copied = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    if (checkpointRoleViolations(directory, ['openspec/changes/archive/2026-10-01-fixture-change/tasks.md'], { kind: 'commit', commit: copied }).length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED an archive COPY (the source still present) was classified documentary');
    }
    fs.rmSync(path.join(directory, 'openspec/changes/fixture-change/tasks.md'));
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'move (source removed, bytes identical)']);
    const moved = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    if (checkpointRoleViolations(directory, ['openspec/changes/archive/2026-10-01-fixture-change/tasks.md'], { kind: 'commit', commit: moved }).length !== 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED a byte-identical archive MOVE was classified substantive');
    }
    fs.writeFileSync(path.join(directory, 'openspec/changes/archive/2026-10-01-fixture-change/tasks.md'), '# edited after archiving\n');
    run(['add', '.']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'edit the archived file']);
    const edited = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    if (checkpointRoleViolations(directory, ['openspec/changes/archive/2026-10-01-fixture-change/tasks.md'], { kind: 'commit', commit: edited }).length === 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED an EDIT of an archived file was classified documentary');
    }
    // The merge hook and the fail-closed touched-null branch stay present: a
    // merge must be judged against EVERY parent, and an unreadable diff must
    // fail closed rather than skip the guarded file.
    const checkpointSource = read('bin/lib/checkpoint-role.mjs');
    for (const [needle, what] of [
      ["['diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-m', '-r', commit]", 'the merge-aware guarded-file listing (-m per parent)'],
      ['if (touched === null) {\n      violations.push(...guarded);\n      continue;\n    }', 'the fail-closed unreadable-diff branch (an unreadable diff must still violate)'],
      ['for (const parent of parentRefs) {', 'the per-parent guard evaluation'],
    ]) {
      if (typeof needle === 'string' && checkpointSource.includes(needle)) continue;
      fail(`CHECKPOINT_ROLE_GUARD_STUBBED bin/lib/checkpoint-role.mjs no longer carries ${what} (${String(needle).slice(0, 80)})`);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function verifyEvidenceArtifactProbe() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-ev-artifact-'));
  const run = (/** @type {string[]} */ args) => spawnSync('git', args, {
    cwd: directory,
    env: { PATH: '/usr/bin:/bin', HOME: directory, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid', LANG: 'C' },
    shell: false,
    encoding: 'utf8',
    timeout: 15_000,
  });
  try {
    if (run(['init', '--quiet']).status !== 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the evidence-artifact fixture repository could not be created');
      return;
    }
    fs.writeFileSync(path.join(directory, 'a.txt'), 'a\n');
    run(['add', 'a.txt']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'one']);
    const first = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    fs.writeFileSync(path.join(directory, 'b.txt'), 'b\n');
    run(['add', 'b.txt']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', 'two']);
    const second = (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
    /** @type {Array<[string, string, boolean, string]>} */
    const cases = [
      [first, 'a.txt', true, 'an artifact present at its commit'],
      [first, 'b.txt', false, 'an artifact first added in a DESCENDANT'],
      [second, 'b.txt', true, 'an artifact present at the later commit'],
      [second, 'missing.txt', false, 'a path that never existed'],
      ['0'.repeat(40), 'a.txt', false, 'an unknown commit'],
    ];
    for (const [sha, artifact, expected, what] of cases) {
      if (evidenceArtifactExistsAtSha(directory, sha, artifact) !== expected) {
        fail(`CHECKPOINT_ROLE_GUARD_STUBBED evidenceArtifactExistsAtSha did not answer ${String(expected)} for ${what}; a stubbed existence probe lets an artifact-free binding read as evidenced`);
      }
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function verifyCorrectionPairingFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-pairing-'));
  const run = (/** @type {string[]} */ args) => spawnSync('git', args, {
    cwd: directory,
    env: { PATH: '/usr/bin:/bin', HOME: directory, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'nw', GIT_AUTHOR_EMAIL: 'nw@example.invalid', GIT_COMMITTER_NAME: 'nw', GIT_COMMITTER_EMAIL: 'nw@example.invalid', LANG: 'C' },
    shell: false,
    encoding: 'utf8',
    timeout: 15_000,
  });
  const file = 'config/document-role-corrections.v1.json';
  const write = (/** @type {string} */ relative, /** @type {string} */ text) => {
    fs.mkdirSync(path.dirname(path.join(directory, relative)), { recursive: true });
    fs.writeFileSync(path.join(directory, relative), text);
  };
  const entry = (/** @type {string} */ id, /** @type {string} */ archive, /** @type {string} */ line) => ({
    id, path: archive, oldLineSha256: lineSha256Prefix(line), oldLineExcerpt: line, reason: 'synthetic',
  });
  const registry = (/** @type {unknown[]} */ entries) => `${JSON.stringify({ schemaVersion: DOCUMENT_ROLE_CORRECTIONS_SCHEMA, corrections: entries })}\n`;
  const commit = (/** @type {string} */ message) => {
    run(['add', '--all']);
    run(['commit', '--quiet', '--no-gpg-sign', '-m', message]);
    return (run(['rev-parse', 'HEAD']).stdout ?? '').trim();
  };
  try {
    if (run(['init', '--quiet']).status !== 0) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the correction-pairing fixture repository could not be created');
      return;
    }
    write('docs/archive.md', 'keep\nsplit line\npaired line\n');
    write(file, registry([]));
    const seed = commit('seed');
    // Commit B appends an entry exempting 'split line' WITHOUT removing it.
    write(file, registry([entry('C-SPLIT', 'docs/archive.md', 'split line')]));
    const appendOnly = commit('append only');
    // Commit C removes the line: the range A..C aggregates to "paired", but B is unpaired.
    write('docs/archive.md', 'keep\npaired line\n');
    commit('removal in the NEXT commit');
    // Commit D pairs its own entry in ITS OWN archive in ONE commit.
    write(file, registry([entry('C-SPLIT', 'docs/archive.md', 'split line'), entry('C-PAIRED', 'docs/archive.md', 'paired line')]));
    write('docs/archive.md', 'keep\n');
    const paired = commit('paired append and removal');
    const split = unpairedCorrectionsInRange(directory, seed, appendOnly, file);
    if (split === null || split.length !== 1 || split[0]?.id !== 'C-SPLIT' || split[0]?.commit !== appendOnly) {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the per-commit pairing did not report the two-commit split at the appending commit; pairing over an aggregate range lets a split look paired');
    }
    const whole = unpairedCorrectionsInRange(directory, seed, paired, file);
    if (whole === null || whole.length !== 1 || whole[0]?.id !== 'C-SPLIT') {
      fail('CHECKPOINT_ROLE_GUARD_STUBBED the per-commit pairing over the full range must name exactly the split entry and admit the paired one (an entry pairs only by its own archive removal in its own commit)');
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
