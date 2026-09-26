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
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  root,
  errors,
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
import { findBinsWithoutExecutingTest, verifyCliImplementationContract } from '../../cli-implementation-contract.mjs';
import { classifyValidationTruth, extractTestMatchGlobs } from '../../validation-classification.mjs';

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
    fail(`validation classification inputs unreadable: ${String(error?.message ?? error).slice(0, 120)}`);
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
  const spec = readIncludingComments('bin/quality-gate-spec.mjs');
  const specCode = read("bin/quality-gate-spec.mjs");
  const semantic = readIncludingComments('bin/semantic-compat.mjs');
  const semanticCode = read("bin/semantic-compat.mjs");
  const clean = readIncludingComments('bin/quality-gate-clean.mjs');
  const cleanCode = read("bin/quality-gate-clean.mjs");
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
  if (!/modes\s*=\s*new Set\(\['local', 'ci', 'clean', 'predev'\]\)/.test(runnerCode)) fail('quality-gate runner must use a fixed mode allowlist');
  if (!/commandKey === 'HANDOFF_CHECK'/.test(runnerCode) || !/planner-handoff-check\.mjs/.test(runnerCode)) fail('quality-gate runner must own exactly one fixed handoff checker command');
  if (/shell\s*:\s*true|stdio\s*:\s*['"]inherit['"]|(?<!\.)\bexec(?:File)?\s*\(/.test(runner)) fail('quality-gate runner exposes shell-capable or unbounded child execution');
  if (!/NIGHTWATCH_STORAGE_STATE/.test(runnerCode) || !/GITHUB_TOKEN/.test(runnerCode) || !/environment\.TZ\s*=\s*['"]UTC['"]/.test(runnerCode)) fail('quality-gate runner does not sanitize credentials and host behavior');
  if (!/filePattern/.test(specCode) || !/QUALITY_GATE_UNKNOWN_COMMAND/.test(specCode) || !/QUALITY_GATE_DEPENDENCY_ORDER_INVALID/.test(specCode)) fail('quality-gate spec validator lacks fixed command/dependency fail-closed checks');
  if (!/shell=false|shell=false|spawnSync/.test(semanticCode) || !/SEMANTIC_COMPATIBILITY_PHASE_OMITTED/.test(semanticCode)) fail('semantic compatibility runner lacks bounded argv/phase omission checks');
  if (!clean || !/\['ci',\s*'--ignore-scripts'\]/.test(cleanCode) || !/status['\"],\s*['\"]--porcelain/.test(cleanCode)) fail('clean-checkout runner must use npm ci --ignore-scripts and verify Git cleanliness');

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
    // D-19 / NW-AUD-001: actions run their Node-24-native majors and are
    // pinned to a full commit SHA; a tag or branch is a moving target.
    if (!/actions\/(?:checkout|setup-node)@[0-9a-f]{40}(?:\s|$)/.test(use)) fail(`GitHub workflow uses an unpinned action (full commit SHA required): ${use.trim()}`);
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
 * NW-AUD-001 / D-19 — every workflow file pins every action by full commit
 * SHA. The previous check saw only one file and only 8-space `uses:` forms;
 * this one walks every `.github/workflows` YAML at any indentation (including
 * compact `- uses:` step forms) and anchors the reference to a 40-hex commit.
 * A tag, branch or floating major is a mutable supply-chain input and fails.
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
  const USES_LINE_RE = /^\s*(?:-\s+)?uses:\s*("[^"]+"|'[^']+'|\S+)\s*(?:#.*)?$/;
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
      const match = USES_LINE_RE.exec(line);
      if (match === null) return;
      const reference = match[1].replace(/^['"]|['"]$/g, '');
      // Local actions and reusable-workflow paths are still pinned by ref.
      const trimmed = reference.startsWith('./') || reference.startsWith('.github/') ? reference.replace(/^\.\/|^\.github\//, '') : reference;
      const at = trimmed.lastIndexOf('@');
      if (at <= 0) {
        fail(`workflow pinning ${relative}:${index + 1} uses an unowned action reference without a @ref: ${reference}`);
        return;
      }
      const pinned = trimmed.slice(at + 1);
      if (!/^[0-9a-f]{40}$/.test(pinned)) {
        fail(`workflow pinning ${relative}:${index + 1} uses a moving action reference (full commit SHA required): ${reference}`);
      }
    });
  }
}
