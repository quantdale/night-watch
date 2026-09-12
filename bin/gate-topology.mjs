#!/usr/bin/env node

// Group 3 — CI-topology clean gate (validation-lane-closure) and exact-head CI
// authority record checks (exact-head-ci-authority).
//
//   node bin/gate-topology.mjs run      # static checks + per-absence proof
//   node bin/gate-topology.mjs static   # no envelope, no suites
//   node bin/gate-topology.mjs probe --absence=bwrap
//
// The dynamic proof executes the authoritative capability lanes inside a
// rootless Bubblewrap envelope in which the runner-absent conditions are
// simulated categorically and independently: the real DEFAULT_SIBLING_ROOT is
// masked (never edited), bwrap itself is masked, Chrome is masked, and $HOME is
// a fresh directory. Under each absence the dependent lane must take its
// fail-closed branch and pass; a lane that claims the absent capability is a
// defect and fails the gate naming the lane and the absence.
//
// The gate never contacts GitHub, never writes outside the checkout's ignored
// artifacts directory and a disposable temp home, and never sets CI fields.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';
import {
  TOPOLOGY_ABSENCES,
  TOPOLOGY_GATE_SCHEMA,
  TOPOLOGY_REGRESSIONS_SCHEMA,
  canonicalBwrapCandidates,
  certificationReadsRecord,
  chromeCandidates,
  describeEnvelopePlan,
  absenceTookEffect,
  evaluateAbsence,
  parseSiblingRoot,
  scanExternalAbsolutePathDependence,
  scanUndeclaredBinaryInvocation,
  topologyReceiptDigest,
  validateTopologyRegistration,
} from './lib/topology-gate.mjs';
import {
  applyCiExecutionEvidence,
  collectCiBlockStale,
  evaluateCiCertification,
  validateCiBlockRecord,
  validateCiRouteCandidates,
} from './lib/ci-block-record.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeExecutable = process.execPath;
const REALTIME_TIMEOUT_MS = 1_800_000;
const RECEIPT_DIRECTORY = path.join(root, 'artifacts', 'topology-receipts');
const CI_BLOCK_RECORD_FILE = 'config/ci-block-record.v1.json';
const TOPOLOGY_REGRESSIONS_FILE = 'config/topology-regressions.v1.json';
const SIBLING_ROOT_SOURCE = 'src/core/source/siblingRoot.ts';
const UNIVERSE_FILE = 'config/validation-universe.v1.json';
const SYNTHETIC_MANIFEST = 'config/synthetic-campaign.v1.json';
const SEMANTIC_MANIFEST = 'config/semantic-compatibility.v1.json';
const OWNER_PROVENANCE_SUITES = Object.freeze([
  'tests/unit/privateArtifactAtomic.test.ts',
  'tests/unit/aiOwnerReview.test.ts',
  'tests/unit/aiReview.test.ts',
]);

/** @type {any} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'gate-topology',
  entry: 'bin/gate-topology.mjs',
  purpose: 'Prove the CI-topology fail-closed paths under independently togglable runner absences.',
  group: 'validate',
  usage: 'node bin/gate-topology.mjs [run|static|probe] [--absence=<id>] [--lane=<capability|campaign|full>] [--mode=<all|static|dynamic>] [--json]',
  commands: [
    { name: 'run', summary: 'Run static checks and the per-absence topology proof' },
    { name: 'static', summary: 'Run the record, registration and categorical regressions only' },
    { name: 'probe', summary: 'Observe one capability inside the current environment (used inside the envelope)' },
  ],
  defaultCommand: 'run',
  flags: [
    { name: '--absence', shape: 'enum', values: ['sibling-root', 'bwrap', 'chrome', 'fresh-home', 'all'], summary: 'restrict the proof to one absence (default all)' },
    { name: '--lane', shape: 'enum', values: ['capability', 'campaign', 'full'], summary: 'which authoritative lane runs under each absence (default capability)' },
    { name: '--mode', shape: 'enum', values: ['all', 'static', 'dynamic'], summary: 'static, dynamic, or both (default all)' },
    { name: '--no-receipt', shape: 'boolean', summary: 'do not persist the receipt under artifacts/topology-receipts' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/topology-receipts/*.json (ignored)'],
};

/** @param {string} relative */
function readText(relative) {
  try {
    return fs.readFileSync(path.join(root, relative), 'utf8');
  } catch {
    return null;
  }
}

/** @param {string} relative @returns {any} */
function readJson(relative) {
  const text = readText(relative);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** @param {string} candidate */
function isExecutableRegularFile(candidate) {
  try {
    const stat = fs.lstatSync(candidate);
    return stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

/** @param {string} candidate */
function hostPathExists(candidate) {
  try {
    fs.lstatSync(candidate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a path for masking. Symlink candidates are resolved first because
 * Bubblewrap cannot create a mountpoint over a symlink; masking the resolved
 * target is what makes the candidate genuinely unreachable.
 * @param {string} candidate
 * @returns {{ kind: 'file' | 'directory' | 'other' | 'absent', path: string | null }}
 */
function resolveMaskPath(candidate) {
  try {
    const target = fs.realpathSync(candidate);
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) return { kind: 'directory', path: target };
    if (stat.isFile()) return { kind: 'file', path: target };
    return { kind: 'other', path: target };
  } catch {
    return { kind: 'absent', path: null };
  }
}

function playwrightBrowsersPath(environment = process.env) {
  const configured = environment.PLAYWRIGHT_BROWSERS_PATH;
  if (typeof configured === 'string' && configured.startsWith('/')) return configured;
  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

function browserBundlePresent() {
  const directory = playwrightBrowsersPath();
  try {
    return fs.readdirSync(directory).length > 0;
  } catch {
    return false;
  }
}

/**
 * Observe one capability in the CURRENT environment. The dynamic runner calls
 * this inside the envelope, so the observation is made by the process that is
 * actually subject to the absence.
 * @param {string} absenceId
 * @returns {any}
 */
function probeCapability(absenceId) {
  const base = { schemaVersion: 'nightwatch.topology-probe.v1', absence: absenceId, observedAt: new Date().toISOString() };
  if (absenceId === 'bwrap') {
    const found = canonicalBwrapCandidates().filter(isExecutableRegularFile);
    return {
      ...base,
      available: found.length > 0,
      blockerCode: found.length > 0 ? null : 'BWRAP_UNAVAILABLE',
      found: found.length,
    };
  }
  if (absenceId === 'sibling-root') {
    const source = readText(SIBLING_ROOT_SOURCE);
    const siblingRoot = parseSiblingRoot(source ?? '');
    let pathUsable = false;
    /** @type {number | null} */
    let entries = null;
    if (typeof siblingRoot === 'string') {
      try {
        const stat = fs.lstatSync(siblingRoot);
        pathUsable = stat.isDirectory() && !stat.isSymbolicLink();
        if (pathUsable) entries = fs.readdirSync(siblingRoot).length;
      } catch {
        pathUsable = false;
      }
    }
    return {
      ...base,
      rootResolved: typeof siblingRoot === 'string',
      pathUsable,
      entries,
      blockerCode: pathUsable && typeof entries === 'number' && entries > 0 ? null : 'SOURCE_REPOSITORY_UNAVAILABLE',
    };
  }
  if (absenceId === 'chrome') {
    const candidates = chromeCandidates();
    const found = candidates.filter(isExecutableRegularFile);
    const bundle = browserBundlePresent();
    const available = found.length > 0 || bundle;
    return {
      ...base,
      available,
      blockerCode: available ? null : 'CHROME_UNAVAILABLE',
      executableCount: found.length,
      browserBundle: bundle,
    };
  }
  if (absenceId === 'fresh-home') {
    const home = os.homedir();
    let writable = false;
    try {
      fs.accessSync(home, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
    return {
      ...base,
      home,
      expectedHome: typeof process.env.NIGHTWATCH_TOPOLOGY_EXPECTED_HOME === 'string' ? process.env.NIGHTWATCH_TOPOLOGY_EXPECTED_HOME : null,
      writable,
    };
  }
  return { ...base, error: 'TOPOLOGY_UNKNOWN_ABSENCE' };
}

/**
 * The union of test suites the REQUIRED gate lanes actually select.
 * @param {any} synthetic
 * @param {any} semantic
 * @param {any} scripts
 * @returns {string[]}
 */
function gateSuiteFiles(synthetic, semantic, scripts) {
  const suites = new Set();
  for (const file of Array.isArray(synthetic?.files) ? synthetic.files : []) suites.add(file);
  for (const suite of Array.isArray(semantic?.phaseSuites) ? semantic.phaseSuites : []) {
    for (const file of Array.isArray(suite?.files) ? suite.files : []) suites.add(file);
  }
  for (const file of Array.isArray(semantic?.supportFiles) ? semantic.supportFiles : []) suites.add(file);
  for (const file of OWNER_PROVENANCE_SUITES) suites.add(file);
  const literals = JSON.stringify(scripts ?? {}).match(/(?:tests|scenarios)\/[A-Za-z0-9_/.-]+\.(?:test|smoke)\.ts/g) ?? [];
  for (const file of literals) suites.add(file);
  return [...suites].sort();
}

/**
 * @param {readonly string[]} relativeFiles
 * @returns {{ path: string, text: string }[]}
 */
function sourceTextFiles(relativeFiles) {
  /** @type {{ path: string, text: string }[]} */
  const result = [];
  for (const file of relativeFiles) {
    const text = readText(file);
    if (typeof text === 'string') result.push({ path: file, text });
  }
  return result;
}

/** The inverse assertion, exercised live on every run as a canary. */
function inverseSelfTest() {
  const absence = TOPOLOGY_ABSENCES.find((entry) => entry.id === 'bwrap');
  if (absence === undefined) return { ok: false, detail: 'bwrap absence declaration missing' };
  const mustDetect = evaluateAbsence({
    absence,
    probe: { available: false, blockerCode: 'BWRAP_UNAVAILABLE' },
    lane: { status: 'PASS', receipts: { deepContainmentLane: 'PROVEN' } },
  }).some((finding) => finding.code === 'TOPOLOGY_LANE_PASSED_BY_INHERITANCE');
  const mustNotFire = evaluateAbsence({
    absence,
    probe: { available: false, blockerCode: 'BWRAP_UNAVAILABLE' },
    lane: { status: 'PASS', receipts: { deepContainmentLane: 'NOT_EXERCISED_BWRAP_UNAVAILABLE' } },
  }).some((finding) => finding.code === 'TOPOLOGY_LANE_PASSED_BY_INHERITANCE');
  return {
    ok: mustDetect && !mustNotFire,
    detail: `inheritance-detected=${mustDetect} fail-closed-not-flagged=${!mustNotFire}`,
  };
}

function staticFindings() {
  const findings = [];
  const record = readJson(CI_BLOCK_RECORD_FILE);
  if (record === null) {
    findings.push({ code: 'CI_BLOCK_RECORD_UNREADABLE', detail: `${CI_BLOCK_RECORD_FILE} missing or invalid JSON` });
  } else {
    const completeness = validateCiBlockRecord(record);
    for (const error of completeness.errors) findings.push(error);
    for (const stale of collectCiBlockStale(record, todayIso())) findings.push({ code: stale.code, detail: `${stale.detail}; owner action: ${stale.ownerAction ?? 'UNSPECIFIED'}` });
    const routes = validateCiRouteCandidates(record);
    for (const error of routes.errors) findings.push(error);
  }

  const packageJson = readJson('package.json');
  const universe = readJson(UNIVERSE_FILE);
  const synthetic = readJson(SYNTHETIC_MANIFEST);
  const registration = validateTopologyRegistration({
    packageScripts: packageJson?.scripts ?? {},
    universe,
    gateManifestFiles: gateSuiteFiles(synthetic, readJson(SEMANTIC_MANIFEST), packageJson?.scripts),
    binFile: 'bin/gate-topology.mjs',
    suiteFiles: [
      'tests/unit/gateTopology.test.ts',
      'tests/unit/ciBlockRecord.test.ts',
    ],
    fileExists: (relative) => hostPathExists(path.join(root, relative)),
  });
  for (const finding of registration) findings.push(finding);

  const regressions = readJson(TOPOLOGY_REGRESSIONS_FILE) ?? {};
  if (regressions.schemaVersion !== undefined && regressions.schemaVersion !== TOPOLOGY_REGRESSIONS_SCHEMA) {
    findings.push({ code: 'TOPOLOGY_REGRESSIONS_SCHEMA_UNSUPPORTED', detail: String(regressions.schemaVersion) });
  }
  const suites = gateSuiteFiles(synthetic, readJson(SEMANTIC_MANIFEST), packageJson?.scripts);
  const files = sourceTextFiles(suites);
  for (const finding of scanExternalAbsolutePathDependence({
    files,
    declarations: Array.isArray(regressions.externalPathDeclarations) ? regressions.externalPathDeclarations : [],
  })) findings.push(finding);
  for (const finding of scanUndeclaredBinaryInvocation({
    files,
    declarations: Array.isArray(regressions.binaryDeclarations) ? regressions.binaryDeclarations : [],
  })) findings.push(finding);

  const block = readProjectStateBlock();
  if (block === null) {
    findings.push({ code: 'CI_CERTIFICATION_BLOCK_UNREADABLE', detail: 'docs/CURRENT_STATE.md project-state block not parsed; the certification match could not be evaluated locally' });
  } else {
    for (const error of evaluateCiCertification(certificationReadsRecord(block)).errors) findings.push(error);
  }

  // The substitute classification is itself asserted: a local gate:ci receipt
  // must be refused the CI_EXECUTED_SHA field, and a zero-step GitHub run must
  // never become executed CI.
  const substitute = applyCiExecutionEvidence(
    { ciObservedSha: block?.ciObservedSha ?? 'NONE', ciExecutedSha: block?.ciExecutedSha ?? 'NONE', ciStatus: block?.ciStatus ?? 'NOT_OBSERVED' },
    { source: 'LOCAL_GATE_CI', exactHead: true, executedSteps: 1, sha: 'a'.repeat(40) },
  );
  if (!substitute.refused || substitute.field.ciExecutedSha !== (block?.ciExecutedSha ?? 'NONE')) {
    findings.push({ code: 'CI_EXECUTED_SHA_SUBSTITUTE_ACCEPTED', detail: 'a local gate:ci execution was not refused the CI_EXECUTED_SHA field' });
  }
  const zeroStep = applyCiExecutionEvidence(
    { ciObservedSha: 'NONE', ciExecutedSha: 'NONE', ciStatus: 'NOT_OBSERVED' },
    { source: 'GITHUB_ACTIONS', exactHead: true, executedSteps: 0, sha: 'b'.repeat(40) },
  );
  if (!zeroStep.refused || zeroStep.code !== 'CI_EXECUTED_FROM_ZERO_STEP_REFUSED') {
    findings.push({ code: 'CI_EXECUTED_SHA_ZERO_STEP_ACCEPTED', detail: 'a zero-step run was not refused the CI_EXECUTED_SHA field' });
  }
  return { findings, record, routesOk: record !== null && validateCiRouteCandidates(record).ok };
}

/** Narrow read-only parse of the project-state block for the CI fields. */
function readProjectStateBlock() {
  const text = readText('docs/CURRENT_STATE.md');
  if (text === null) return null;
  /** @param {string} key */
  const field = (key) => {
    const match = new RegExp(`^${key}:\\s*(\\S+)\\s*$`, 'm').exec(text);
    return match === null ? null : match[1];
  };
  const completionStatus = field('PROJECT_COMPLETION_STATUS');
  if (completionStatus === null) return null;
  return {
    completionStatus,
    certifiedCheckpointSha: field('RELEASE_CHECKPOINT_SHA'),
    ciObservedSha: field('CI_OBSERVED_SHA') ?? 'NONE',
    ciExecutedSha: field('CI_EXECUTED_SHA') ?? 'NONE',
    ciStatus: field('CI_STATUS') ?? 'NOT_OBSERVED',
  };
}

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, timeoutMs?: number }} [options]
 */
function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? REALTIME_TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status,
    errorCode: /** @type {NodeJS.ErrnoException | undefined} */ (result.error)?.code ?? null,
    signal: result.signal ?? null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {string} output
 * @param {string} [marker]
 * @returns {any}
 */
function parseLastJsonLine(output, marker) {
  const lines = output.split(/\r?\n/).reverse();
  for (const line of lines) {
    if (!line.trim().startsWith('{')) continue;
    if (marker !== undefined && !line.includes(marker)) continue;
    try {
      return JSON.parse(line);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * @param {any} absence
 * @param {string} lane
 * @returns {{ kind: string, command: string, args: string[] } | null}
 */
function laneCommandFor(absence, lane) {
  if (absence.laneSuites.length === 0) return null;
  if (lane === 'full') return { kind: 'full', command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'gate:local'] };
  if (lane === 'campaign') return { kind: 'campaign', command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'campaign:synthetic'] };
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return { kind: 'capability', command: npx, args: ['playwright', 'test', ...absence.laneSuites, '--project=nightwatch', '--workers=1', '--retries=0'] };
}

function makeFreshHome() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-topology-home-'));
  fs.chmodSync(directory, 0o700);
  return directory;
}

/** @param {readonly string[]} args */
function quoteForDisplay(args) {
  return args.map((arg) => (/[\s"']/.test(arg) ? JSON.stringify(arg) : arg)).join(' ');
}

/**
 * @param {readonly any[]} selectedAbsences
 * @param {string} lane
 * @param {{ staticOnly?: boolean }} options
 * @returns {{ entries: any[], findings: any[] }}
 */
function runDynamic(selectedAbsences, lane, options) {
  const entries = [];
  const findings = [];
  const siblingRoot = parseSiblingRoot(readText(SIBLING_ROOT_SOURCE) ?? '');
  if (siblingRoot === null) {
    findings.push({ code: 'TOPOLOGY_SIBLING_ROOT_UNRESOLVED', detail: `${SIBLING_ROOT_SOURCE} does not declare a parseable absolute DEFAULT_SIBLING_ROOT` });
  }
  const chrome = chromeCandidates();
  const browsers = playwrightBrowsersPath();
  const capa = canonicalBwrapCandidates();
  const baselineSuites = [...new Set(TOPOLOGY_ABSENCES.flatMap((absence) => absence.laneSuites))];
  if (baselineSuites.length > 0 && lane !== 'full') {
    const baseline = laneCommandFor({ laneSuites: baselineSuites }, lane);
    const result = baseline === null ? null : runCapture(baseline.command, baseline.args, { timeoutMs: REALTIME_TIMEOUT_MS });
    const passed = result !== null && result.status === 0;
    entries.push({
      absence: 'baseline',
      constructed: true,
      lane: { status: passed ? 'PASS' : 'FAIL', detail: `${baseline === null ? 'no lane' : quoteForDisplay([baseline.command, ...baseline.args])} exit=${result?.status ?? 'SPAWN_ERROR'}` },
      findings: [],
    });
    if (!passed) {
      findings.push({ code: 'TOPOLOGY_BASELINE_FAILED', detail: `the no-absence control lane is not green, so absence-induced changes cannot be attributed (exit=${result?.status ?? 'SPAWN_ERROR'}${result?.errorCode === null || result?.errorCode === undefined ? '' : ` error=${result.errorCode}`})` });
    }
  }
  for (const absence of selectedAbsences) {
    const freshHome = absence.id === 'fresh-home' ? makeFreshHome() : null;
    const plan = describeEnvelopePlan({
      absence: absence.id,
      worktree: root,
      siblingRoot,
      chrome,
      playwrightBrowsersPath: browsers,
      freshHome,
      bwrapCandidates: capa,
      resolveMaskPath,
    });
    const environment = /** @type {Record<string, string | undefined>} */ ({
      ...process.env,
      NIGHTWATCH_ENV: 'local',
      NIGHTWATCH_HEADED: '0',
      TZ: 'UTC',
      LC_ALL: 'C',
      NO_COLOR: '1',
    });
    if (freshHome !== null) environment.NIGHTWATCH_TOPOLOGY_EXPECTED_HOME = freshHome;
    const probeArgs = [...plan, nodeExecutable, path.join(root, 'bin', 'gate-topology.mjs'), 'probe', `--absence=${absence.id}`, '--json'];
    const probeResult = runCapture('bwrap', probeArgs, { env: environment, timeoutMs: 120_000 });
    const probe = probeResult.status === 0 ? parseLastJsonLine(probeResult.stdout) : null;
    let laneOutcome = null;
    const laneSpec = laneCommandFor(absence, lane);
    if (!options.staticOnly && laneSpec !== null) {
      if (laneSpec.kind === 'full') {
        const receiptDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-topology-gate-'));
        const receiptFile = path.join(receiptDirectory, 'gate-receipt.json');
        const result = runCapture('bwrap', [...plan, laneSpec.command, ...laneSpec.args], {
          env: { ...environment, NIGHTWATCH_GATE_RECEIPT_PATH: receiptFile },
          timeoutMs: REALTIME_TIMEOUT_MS,
        });
        let receipt = null;
        try {
          receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
        } catch {
          receipt = null;
        } finally {
          fs.rmSync(receiptDirectory, { recursive: true, force: true });
        }
        const status = receipt?.finalResult === 'PASS' ? 'PASS' : (receipt?.finalResult ?? (result.status === 0 ? 'PASS' : 'FAIL'));
        laneOutcome = {
          status: status === 'PASS' ? 'PASS' : 'FAIL',
          detail: `gate:local finalResult=${receipt?.finalResult ?? 'NO_RECEIPT'} exit=${result.status ?? 'SPAWN_ERROR'}`,
          receipts: receipt === null ? null : { deepContainmentLane: extractDeepLane(receipt), checkable: true },
        };
      } else {
        const result = runCapture('bwrap', [...plan, laneSpec.command, ...laneSpec.args], { env: environment, timeoutMs: REALTIME_TIMEOUT_MS });
        const receipt = laneSpec.kind === 'campaign' ? parseLastJsonLine(`${result.stdout}\n${result.stderr}`, 'nightwatch.synthetic-campaign.v1') : null;
        laneOutcome = {
          status: result.status === 0 ? 'PASS' : 'FAIL',
          detail: `${quoteForDisplay([laneSpec.command, ...laneSpec.args])} exit=${result.status ?? 'SPAWN_ERROR'}`,
          receipts: receipt === null ? null : {
            deepContainmentLane: receipt.deepContainmentLane ?? null,
            sourcePopulation: null,
          },
        };
      }
    } else if (laneSpec === null) {
      laneOutcome = { status: 'NOT_IN_AUTHORITATIVE_GATE', detail: `no authoritative gate suite depends on ${absence.capability}; the absence is recorded without inheriting a pass`, receipts: null };
    }
    const absenceFindings = evaluateAbsence({ absence, probe, lane: laneOutcome });
    if (probe === null) {
      findings.push({ code: 'TOPOLOGY_PROBE_FAILED', detail: `absence=${absence.id}: probe did not produce an observation (exit=${probeResult.status ?? 'SPAWN_ERROR'}${probeResult.errorCode === null ? '' : ` error=${probeResult.errorCode}`})` });
    }
    for (const finding of absenceFindings) findings.push(finding);
    const effect = probe === null ? { absent: false, detail: 'probe produced no observation' } : absenceTookEffect(absence, probe);
    entries.push({
      absence: absence.id,
      constructed: effect.absent,
      probe: probe === null ? null : {
        absent: effect.absent,
        detail: effect.detail,
        blockerCode: probe.blockerCode ?? null,
      },
      lane: laneOutcome,
      findings: absenceFindings,
    });
    if (freshHome !== null) {
      try {
        fs.rmSync(freshHome, { recursive: true, force: true });
      } catch {
        // disposable; a cleanup miss is not a gate result
      }
    }
  }
  return { entries, findings };
}

/** @param {any} receipt */
function extractDeepLane(receipt) {
  if (receipt === null || typeof receipt !== 'object') return null;
  const groups = Array.isArray(receipt.groups) ? receipt.groups : [];
  const synthetic = groups.find((/** @type {any} */ group) => group?.id === 'SYNTHETIC_CAMPAIGN');
  return synthetic?.details?.deepContainmentLane ?? null;
}

/**
 * @param {any} document
 * @param {{ noReceipt?: boolean }} options
 */
function emitReceipt(document, options) {
  document.receiptDigest = topologyReceiptDigest(document, (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex'));
  const bytes = JSON.stringify(document);
  if (!options.noReceipt) {
    try {
      fs.mkdirSync(RECEIPT_DIRECTORY, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(path.join(RECEIPT_DIRECTORY, `${stamp}.json`), `${bytes}\n`, { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      process.stderr.write(`[gate-topology] RECEIPT_PERSISTENCE_FAILED: ${error instanceof Error ? error.message : 'unknown'}\n`);
      process.exitCode = 3;
      return;
    }
  }
  process.stdout.write(`${bytes}\n`);
  process.exitCode = document.result === 'PASS' ? 0 : 1;
}

/** @param {any} cli */
function main(cli) {
  const command = cli.command ?? 'run';
  if (command === 'probe') {
    const absence = cli.flags['--absence'];
    if (typeof absence !== 'string' || absence === 'all') {
      process.stderr.write('[gate-topology] CLI_ARGUMENT_MISSING: probe requires --absence=<id>\n');
      process.exitCode = 2;
      return;
    }
    process.stdout.write(`${JSON.stringify(probeCapability(absence))}\n`);
    return;
  }
  const mode = cli.flags['--mode'] ?? (command === 'static' ? 'static' : 'all');
  const selected = cli.flags['--absence'] ?? 'all';
  const lane = cli.flags['--lane'] ?? 'capability';
  const noReceipt = cli.flags['--no-receipt'] === true;
  const absences = selected === 'all' ? TOPOLOGY_ABSENCES : TOPOLOGY_ABSENCES.filter((absence) => absence.id === selected);
  const staticResult = mode === 'dynamic' ? { findings: [], record: null, routesOk: true } : staticFindings();
  const findings = [...staticResult.findings];
  const selfTest = inverseSelfTest();
  if (!selfTest.ok) {
    findings.push({ code: 'TOPOLOGY_INVERSE_SELFTEST_FAILED', detail: selfTest.detail });
  }
  let dynamic = null;
  if (mode !== 'static') {
    dynamic = runDynamic(absences, lane, { staticOnly: false });
    for (const finding of dynamic.findings) findings.push(finding);
  }
  const receipt = {
    schemaVersion: TOPOLOGY_GATE_SCHEMA,
    generatedAt: new Date().toISOString(),
    mode,
    lane,
    absences: absences.map((absence) => absence.id),
    defectClasses: {
      externalPathDependence: 'TOPOLOGY_EXTERNAL_PATH_DEPENDENCE',
      undeclaredBinaryInvocation: 'TOPOLOGY_UNDECLARED_BINARY_INVOCATION',
      historicalRun: '33572572053',
    },
    ciClaim: {
      runnerTopologyClass: findings.length === 0 && mode !== 'static' ? 'PROVEN' : 'NOT_PROVEN',
      githubExecutionProven: false,
      statement: 'gate:topology proves runner-topology fail-closed behaviour only; it never proves GitHub execution and never sets CI_EXECUTED_SHA.',
    },
    inverseSelfTest: selfTest,
    ciBlockRecord: staticResult.record === null ? null : {
      runId: staticResult.record.runId,
      jobId: staticResult.record.jobId,
      blockClass: staticResult.record.blockClass,
      observedDate: staticResult.record.observedDate,
      revisitDate: staticResult.record.revisitDate,
      ownerAction: staticResult.record.ownerAction,
      routeSelection: staticResult.record.routeSelection,
    },
    dynamic,
    findings,
    result: findings.length === 0 ? 'PASS' : 'FAIL',
  };
  emitReceipt(receipt, { noReceipt });
}

if (invokedDirectly(import.meta.url)) {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (!cli.stop) main(cli);
}
