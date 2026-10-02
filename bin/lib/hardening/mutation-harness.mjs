#!/usr/bin/env node
// @ts-check

/**
 * R5-05 / review-5 task A4.3 — the committed BEHAVIOURAL mutation harness.
 *
 * The rule probe campaign (`probe-campaign.mjs`) proves a RULE fails when its
 * guard is mutated; it can only be satisfied by a text anchor or a structural
 * fixture inside the hardening engine. R5-05 found 16 equivalent mutants of the
 * collector/classifier guards that survived the whole campaign and nearly all
 * unit tests, because those guards were covered by `includes(literal)` anchors.
 *
 * This harness is the second, behavioural detector. Each registered MUTANT
 * (`behaviouralMutants` in the probe registry) is applied to a SCRATCH COPY of the
 * tracked working tree, never to the real tree, and must make either its declared
 * focused tests or `hardening:check` fail. A mutant that neither detects is a
 * SURVIVOR and the harness exits non-zero. The unmutated scratch copy must first
 * pass BOTH detectors (a failing baseline would "detect" everything vacuously).
 *
 * Totality: `behaviouralMutantRequirements` lists every finding tag the review
 * demanded; a tag with no registered mutant fails the harness, so a mutant can
 * be neither forgotten nor quietly dropped.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MUTANT_ID_RE = /^BM-\d{3}$/;
const FINDING_RE = /^R5-\d{2}\/[A-Za-z0-9._-]{1,40}$/;
const DETECTION_TIMEOUT_MS = 300_000;

/**
 * @typedef {{ file: string, search: string, replace: string }} MutantOp
 * @typedef {{ file: string, grep: string | null }} FocusedTest
 * @typedef {{ id: string, finding: string, guard: string, ops: MutantOp[], focusedTests: FocusedTest[] }} Mutant
 * @typedef {{ command: string, args: string[] }} Invocation
 */

/**
 * A focused test is a tracked file, optionally narrowed by a title pattern. When
 * EVERY entry of a mutant names a pattern the run is narrowed to their union;
 * one whole-file entry keeps the whole run.
 * @param {FocusedTest[]} tests
 * @returns {Invocation}
 */
function defaultTestInvocation(tests) {
  const files = [...new Set(tests.map((test) => test.file))];
  const grep = tests.every((test) => test.grep !== null) ? tests.map((test) => `(?:${test.grep})`).join('|') : null;
  return {
    command: process.execPath,
    args: [path.join('node_modules', '@playwright', 'test', 'cli.js'), 'test', ...files, '--project=nightwatch', '--workers=1', '--reporter=line', ...(grep === null ? [] : ['--grep', grep])],
  };
}

/** @returns {Invocation} */
function defaultHardeningInvocation() {
  return { command: process.execPath, args: [path.join('bin', 'hardening-check.mjs')] };
}

/**
 * Validate the registry's mutant section. Pure: returns findings, never throws.
 * @param {unknown} registry
 * @param {(file: string) => boolean} isTracked
 * @param {(file: string) => string | null} readFile
 * @returns {{ errors: string[], mutants: Mutant[], requirements: string[] }}
 */
export function validateMutantRegistry(registry, isTracked, readFile) {
  /** @type {string[]} */
  const errors = [];
  const record = registry !== null && typeof registry === 'object' && !Array.isArray(registry) ? /** @type {Record<string, unknown>} */ (registry) : null;
  if (record === null) return { errors: ['MUTANT_REGISTRY_UNREADABLE'], mutants: [], requirements: [] };
  const rawMutants = record.behaviouralMutants;
  const rawRequirements = record.behaviouralMutantRequirements;
  if (!Array.isArray(rawMutants)) errors.push('MUTANT_REGISTRY_SECTION_MISSING: behaviouralMutants');
  if (!Array.isArray(rawRequirements)) errors.push('MUTANT_REGISTRY_SECTION_MISSING: behaviouralMutantRequirements');
  /** @type {Mutant[]} */
  const mutants = [];
  const seen = new Set();
  for (const entry of Array.isArray(rawMutants) ? rawMutants : []) {
    const item = entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? /** @type {Record<string, unknown>} */ (entry) : null;
    if (item === null) { errors.push('MUTANT_ENTRY_NOT_AN_OBJECT'); continue; }
    const id = typeof item.id === 'string' ? item.id : '';
    if (!MUTANT_ID_RE.test(id)) { errors.push(`MUTANT_ID_INVALID: ${JSON.stringify(item.id)}`); continue; }
    if (seen.has(id)) errors.push(`MUTANT_ID_DUPLICATE: ${id}`);
    seen.add(id);
    const finding = typeof item.finding === 'string' ? item.finding : '';
    if (!FINDING_RE.test(finding)) errors.push(`MUTANT_FINDING_INVALID: ${id}`);
    const guard = typeof item.guard === 'string' && item.guard.trim() !== '' ? item.guard : '';
    if (guard === '') errors.push(`MUTANT_GUARD_MISSING: ${id}`);
    const ops = Array.isArray(item.ops) ? item.ops : [];
    if (ops.length === 0) errors.push(`MUTANT_OPS_MISSING: ${id}`);
    /** @type {MutantOp[]} */
    const validOps = [];
    for (const op of ops) {
      const o = op !== null && typeof op === 'object' ? /** @type {Record<string, unknown>} */ (op) : {};
      if (typeof o.file !== 'string' || typeof o.search !== 'string' || typeof o.replace !== 'string' || o.search === '') {
        errors.push(`MUTANT_OP_INVALID: ${id}`);
        continue;
      }
      if (o.search === o.replace) errors.push(`MUTANT_OP_NOOP: ${id} replaces a literal with itself`);
      if (!isTracked(o.file)) { errors.push(`MUTANT_FILE_UNTRACKED: ${id} ${o.file}`); continue; }
      const text = readFile(o.file);
      const occurrences = text === null ? 0 : text.split(o.search).length - 1;
      // A mutant whose literal drifted is an UNPROVEN guard, never a pass.
      if (occurrences !== 1) errors.push(`MUTANT_SEARCH_NOT_UNIQUE: ${id} ${o.file} (${occurrences} occurrence(s))`);
      validOps.push({ file: o.file, search: o.search, replace: o.replace });
    }
    /** @type {FocusedTest[]} */
    const tests = [];
    for (const raw of Array.isArray(item.focusedTests) ? item.focusedTests : []) {
      const file = typeof raw === 'string' ? raw : (raw !== null && typeof raw === 'object' && typeof /** @type {Record<string, unknown>} */ (raw).file === 'string' ? String(/** @type {Record<string, unknown>} */ (raw).file) : '');
      const grepValue = raw !== null && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw).grep : undefined;
      if (file === '') { errors.push(`MUTANT_TEST_INVALID: ${id}`); continue; }
      if (grepValue !== undefined && (typeof grepValue !== 'string' || grepValue === '')) { errors.push(`MUTANT_TEST_GREP_INVALID: ${id}`); continue; }
      tests.push({ file, grep: typeof grepValue === 'string' ? grepValue : null });
    }
    if (tests.length === 0) errors.push(`MUTANT_FOCUSED_TESTS_MISSING: ${id}`);
    for (const test of tests) if (!isTracked(test.file)) errors.push(`MUTANT_TEST_UNTRACKED: ${id} ${test.file}`);
    mutants.push({ id, finding, guard, ops: validOps, focusedTests: tests });
  }
  const requirements = (Array.isArray(rawRequirements) ? rawRequirements : []).filter((value) => typeof value === 'string');
  const covered = new Set(mutants.map((mutant) => mutant.finding));
  for (const tag of requirements) {
    if (!FINDING_RE.test(tag)) errors.push(`MUTANT_REQUIREMENT_INVALID: ${tag}`);
    else if (!covered.has(tag)) errors.push(`MUTANT_REQUIREMENT_UNCOVERED: ${tag} has no registered behavioural mutant`);
  }
  if (mutants.length === 0) errors.push('MUTANT_REGISTRY_VACUOUS: no behavioural mutant is registered');
  return { errors, mutants, requirements };
}

/**
 * @param {string} cwd
 * @param {Invocation} invocation
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ ok: boolean, status: number | null, tail: string }}
 */
function run(cwd, invocation, env) {
  const result = spawnSync(invocation.command, invocation.args, { cwd, env, encoding: 'utf8', timeout: DETECTION_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024, shell: false });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return { ok: result.status === 0 && result.error === undefined, status: result.status, tail: output.trim().split("\n").slice(-40).join("\n") };
}

/**
 * Copy the tracked WORKING TREE into a fresh scratch git repository.
 *
 * When `root` is itself a Git repository the scratch is a SHARED CLONE of it
 * (history and objects are reachable, so a focused test that reads a committed
 * blob at the certified checkpoint behaves exactly as in the real tree) with the
 * working-tree files overlaid and committed on top, so the scratch tree is clean.
 * A non-Git root (a synthetic test fixture) falls back to a one-commit repository.
 * @param {string} root
 * @param {string[]} files
 * @returns {string} the scratch directory
 */
function createScratch(root, files) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-mutants-'));
  const git = (/** @type {string[]} */ args, /** @type {string} */ cwd = scratch) => spawnSync('git', ['-c', 'user.email=mutants@nightwatch.local', '-c', 'user.name=mutants', ...args], { cwd, encoding: 'utf8', shell: false });
  const isRepository = git(['rev-parse', '--git-dir'], root).status === 0;
  if (isRepository) {
    fs.rmSync(scratch, { recursive: true, force: true });
    git(['clone', '--shared', '--no-checkout', '--quiet', root, scratch], os.tmpdir());
    git(['checkout', '--quiet', '--detach', 'HEAD']);
    // Remove tracked files the working tree no longer has (a declared deletion).
    const present = new Set(files);
    for (const tracked of (git(['ls-files', '-z']).stdout ?? '').split('\0').filter(Boolean)) {
      if (!present.has(tracked)) fs.rmSync(path.join(scratch, tracked), { force: true });
    }
  }
  for (const file of files) {
    const destination = path.join(scratch, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, file), destination);
  }
  for (const modules of ['node_modules', path.join('ui', 'control-center', 'node_modules')]) {
    if (fs.existsSync(path.join(root, modules))) {
      fs.mkdirSync(path.dirname(path.join(scratch, modules)), { recursive: true });
      fs.symlinkSync(path.join(root, modules), path.join(scratch, modules));
    }
  }
  if (!isRepository) git(['init', '--quiet', '-b', 'main']);
  // node_modules is a symlink into the real tree: never part of the scratch commit.
  fs.appendFileSync(path.join(scratch, '.git', 'info', 'exclude'), 'node_modules\nui/control-center/node_modules\n');
  git(['add', '--all']);
  git(['commit', '--quiet', '--no-gpg-sign', '--allow-empty', '-m', 'mutation harness scratch']);
  return scratch;
}

/**
 * The engine kernel reads `import.meta` at load, so it is imported only when a
 * caller supplies none of the injectable facts (the CLI path); the unit tests
 * drive the harness on a synthetic repository without ever loading it.
 * @returns {Promise<typeof import('./kernel.mjs')>}
 */
function loadKernel() {
  return import('./kernel.mjs');
}

/**
 * @typedef {object} HarnessOptions
 * @property {string} [root]
 * @property {string} [registryPath]
 * @property {string} [onlyMutant]
 * @property {(tests: FocusedTest[]) => Invocation} [testInvocation]
 * @property {() => Invocation} [hardeningInvocation]
 * @property {string[]} [trackedFiles]
 * @property {NodeJS.ProcessEnv} [environment]
 * @property {(line: string) => void} [log]
 */

/**
 * @param {HarnessOptions} [options]
 * @returns {Promise<{ ok: boolean, mutants: number, detected: number, survived: string[], errors: string[] }>}
 */
export async function runMutationHarness(options = {}) {
  const needsKernel = options.root === undefined || options.trackedFiles === undefined || options.registryPath === undefined || options.environment === undefined;
  const kernel = needsKernel ? await loadKernel() : null;
  const root = options.root ?? /** @type {typeof import('./kernel.mjs')} */ (kernel).root;
  const log = options.log ?? ((line) => console.log(line));
  const testInvocation = options.testInvocation ?? defaultTestInvocation;
  const hardeningInvocation = options.hardeningInvocation ?? defaultHardeningInvocation;
  const files = options.trackedFiles ?? /** @type {typeof import('./kernel.mjs')} */ (kernel).gitFiles();
  const tracked = new Set(files);
  /** @type {unknown} */
  let registry = null;
  try {
    registry = JSON.parse(fs.readFileSync(path.join(root, options.registryPath ?? /** @type {typeof import('./kernel.mjs')} */ (kernel).PROBE_REGISTRY_PATH), 'utf8'));
  } catch {
    registry = null;
  }
  const validated = validateMutantRegistry(registry, (file) => tracked.has(file), (file) => {
    try { return fs.readFileSync(path.join(root, file), 'utf8'); } catch { return null; }
  });
  /** @type {string[]} */
  const errors = [...validated.errors];
  for (const error of errors) log(`[mutants] ERROR ${error}`);
  const selected = options.onlyMutant === undefined ? validated.mutants : validated.mutants.filter((mutant) => mutant.id === options.onlyMutant);
  if (options.onlyMutant !== undefined && selected.length === 0) errors.push(`MUTANT_UNKNOWN: ${options.onlyMutant}`);
  if (errors.length > 0) {
    log(`[mutants] FAIL ${errors.length} registry error(s); no mutant was applied`);
    return { ok: false, mutants: selected.length, detected: 0, survived: [], errors };
  }
  const environment = { ...(options.environment ?? /** @type {typeof import('./kernel.mjs')} */ (kernel).childEnvironment), NODE_OPTIONS: '--expose-gc' };
  const scratch = createScratch(root, files);
  /** @type {string[]} */
  const survived = [];
  let detected = 0;
  try {
    // Baseline: the unmutated scratch copy must pass BOTH detectors.
    const baselineHardening = run(scratch, hardeningInvocation(), environment);
    if (!baselineHardening.ok) {
      errors.push('MUTANT_BASELINE_HARDENING_FAILED');
      log(`[mutants] BASELINE_FAILED hardening:check\n${baselineHardening.tail}`);
    }
    const distinctTestSets = new Map(selected.map((mutant) => [JSON.stringify(mutant.focusedTests), mutant.focusedTests]));
    for (const tests of distinctTestSets.values()) {
      const baseline = run(scratch, testInvocation(tests), environment);
      if (!baseline.ok) {
        errors.push(`MUTANT_BASELINE_TESTS_FAILED: ${tests.map((test) => test.file).join(',')}`);
        log(`[mutants] BASELINE_FAILED ${tests.map((test) => test.file).join(',')}\n${baseline.tail}`);
      }
    }
    if (errors.length > 0) return { ok: false, mutants: selected.length, detected: 0, survived: [], errors };
    for (const mutant of selected) {
      /** @type {Map<string, string>} */
      const originals = new Map();
      let verdict = 'SURVIVED';
      let committed = false;
      try {
        for (const op of mutant.ops) {
          const absolute = path.join(scratch, op.file);
          const before = originals.get(absolute) ?? fs.readFileSync(absolute, 'utf8');
          originals.set(absolute, before);
          const current = fs.readFileSync(absolute, 'utf8');
          if (current.split(op.search).length - 1 !== 1) throw new Error(`search literal is not unique in the scratch copy: ${op.file}`);
          fs.writeFileSync(absolute, current.replace(op.search, () => op.replace));
        }
        // Commit the mutation IN THE SCRATCH REPOSITORY before any detector runs: several
        // focused tests clone the repository at its committed HEAD (a shared fixture
        // root) and so would otherwise exercise the UNMUTATED code and report a survivor.
        spawnSync('git', ['-c', 'user.email=mutants@nightwatch.local', '-c', 'user.name=mutants', 'commit', '--quiet', '--no-gpg-sign', '--all', '-m', `mutant ${mutant.id}`], { cwd: scratch, encoding: 'utf8', shell: false });
        committed = true;
        const tests = run(scratch, testInvocation(mutant.focusedTests), environment);
        if (!tests.ok) {
          verdict = 'DETECTED_BY_TESTS';
        } else {
          const hardening = run(scratch, hardeningInvocation(), environment);
          if (!hardening.ok) verdict = 'DETECTED_BY_HARDENING';
        }
      } catch (error) {
        verdict = 'PROBE_ERROR';
        errors.push(`MUTANT_APPLY_FAILED: ${mutant.id}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        if (committed) spawnSync('git', ['reset', '--quiet', '--hard', 'HEAD~1'], { cwd: scratch, encoding: 'utf8', shell: false });
        for (const [absolute, text] of originals) fs.writeFileSync(absolute, text);
      }
      if (verdict.startsWith('DETECTED')) detected += 1;
      else if (verdict === 'SURVIVED') survived.push(mutant.id);
      log(`[mutants] ${mutant.finding} ${verdict} ${mutant.id} (${mutant.guard})`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  log(`[mutants] mutants=${selected.length} detected=${detected} survived=${survived.length} errors=${errors.length}`);
  return { ok: survived.length === 0 && errors.length === 0 && detected === selected.length && selected.length > 0, mutants: selected.length, detected, survived, errors };
}
