#!/usr/bin/env node

// Shared Nightwatch quality-gate executor. The JSON definition names only
// fixed command keys. No runtime string is passed to a shell.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { GATE_RECEIPT_PATH_ENV, parseCounts, parseSafeDetails, persistGateReceipt, resolveGateReceiptTarget } from './lib/gate-receipt.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definitionFile = path.join(root, 'config', 'quality-gate.v1.json');
const modes = new Set(['local', 'ci', 'clean', 'predev']);

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'quality-gate',
  entry: 'bin/quality-gate.mjs',
  purpose: 'Run the authoritative Nightwatch quality gate for one environment class.',
  group: 'validate',
  usage: 'node bin/quality-gate.mjs <local|ci|clean|predev>',
  commands: [
    { name: 'local', summary: 'Run the serial local gate' },
    { name: 'ci', summary: 'Run the gate under CI authority' },
    { name: 'clean', summary: 'Run the gate in a disposable clean checkout' },
    { name: 'predev', summary: 'Run the pre-DEV required subset' },
  ],
  commandRequired: true,
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['artifacts/quality-gate receipts (NIGHTWATCH_GATE_RECEIPT_PATH overrides)'],
};
const timeoutMs = { SHORT: 120_000, MEDIUM: 600_000, LONG: 1_200_000 };
const packageManager = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeExecutable = process.execPath;
const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'NIGHTWATCH_STORAGE_STATE', 'NIGHTWATCH_AUTH_FILE', 'NIGHTWATCH_OWNER_FINDINGS',
  'GITHUB_TOKEN', 'GH_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'CLOUDSDK_AUTH_ACCESS_TOKEN',
  // The receipt destination belongs to THIS gate run. A child inheriting it
  // could overwrite the parent's authoritative receipt with its own.
  GATE_RECEIPT_PATH_ENV,
]);

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeChildEnvironment(mode) {
  const environment = buildChildEnvironment(process.env, {
    NIGHTWATCH_ENV: 'local',
    NIGHTWATCH_GATE_ENVIRONMENT: mode.toUpperCase(),
  });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  for (const key of FORBIDDEN_ENVIRONMENT_KEYS) delete environment[key];
  return environment;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10_000, maxBuffer: 256 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

function runFixedCommand(commandKey, mode, timeoutClass) {
  const environment = safeChildEnvironment(mode);
  let command;
  let args;
  if (commandKey === 'GATE_DEFINITION') {
    command = nodeExecutable;
    args = [path.join(root, 'bin', 'quality-gate-spec.mjs')];
  } else if (commandKey === 'TYPECHECK') {
    command = packageManager;
    args = ['run', 'typecheck'];
  } else if (commandKey === 'HARDENING_CHECK') {
    command = packageManager;
    args = ['run', 'hardening:check'];
  } else if (commandKey === 'HANDOFF_CHECK') {
    command = nodeExecutable;
    args = [path.join(root, 'bin', 'planner-handoff-check.mjs')];
  } else if (commandKey === 'PROJECT_CHECK') {
    command = packageManager;
    args = ['run', 'project:check'];
  } else if (commandKey === 'AGENT_CONTINUITY') {
    const first = spawnSync(packageManager, ['run', 'agent:check'], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (first.status !== 0 || first.error) return summarizeChild(first, 'AGENT_CONTINUITY');
    const second = spawnSync(packageManager, ['run', 'agent:audit'], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return summarizeChild(second, 'AGENT_CONTINUITY');
  } else if (commandKey === 'SEMANTIC_COMPATIBILITY') {
    command = packageManager;
    args = ['run', 'test:semantic-compat'];
  } else if (commandKey === 'OWNER_PROVENANCE') {
    command = packageManager;
    args = ['run', 'test:owner-provenance'];
  } else if (commandKey === 'SYNTHETIC_CAMPAIGN') {
    const synthetic = spawnSync(packageManager, ['run', 'campaign:synthetic'], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    const summary = summarizeChild(synthetic, 'SYNTHETIC_CAMPAIGN');
    if (summary.status !== 'PASS') return summary;
    // The deep L6 containment lane is a HOST capability: a runner without a
    // usable Bubblewrap binary genuinely cannot exercise it, and the suite
    // correctly proves the fail-closed path there instead. That absence must
    // never pass silently, so it is required to be PROVEN wherever the host
    // can provide it and merely RECORDED where it cannot.
    //
    // This mirrors PATCH_INTEGRITY's existing `mode !== 'local'` strictness:
    // the requirement varies by gate mode, the invariant does not. The
    // discriminator is the probed capability carried in the child receipt, not
    // an environment variable, and CI still fails closed on a lane that is
    // missing or unclassifiable rather than merely not PROVEN.
    const lane = summary.details?.deepContainmentLane;
    if (typeof lane !== 'string') return { ...summary, status: 'TEST_FAILURE', exitCode: 1, errorClass: 'SYNTHETIC_CAMPAIGN_DEEP_LANE_UNCLASSIFIED' };
    if (mode !== 'ci' && lane !== 'PROVEN') return { ...summary, status: 'TEST_FAILURE', exitCode: 1, errorClass: `SYNTHETIC_CAMPAIGN_DEEP_LANE_${lane}` };
    return summary;
  } else if (commandKey === 'PATCH_INTEGRITY') {
    const catalog = spawnSync(nodeExecutable, [path.join(root, 'bin', 'selfdev-catalog-integrity.mjs')], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (catalog.status !== 0 || catalog.error) return summarizeChild(catalog, 'PATCH_INTEGRITY');
    const diff = spawnSync('git', ['diff', '--check'], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 512 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (diff.status !== 0 || diff.error) return summarizeChild(diff, 'PATCH_INTEGRITY');
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 512 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (status.status !== 0 || status.error) return summarizeChild(status, 'PATCH_INTEGRITY');
    // Local developer qualification may run before the checkpoint commit;
    // CI/clean/pre-DEV authority still requires the checkout to be clean.
    const cleanRequired = mode !== 'local';
    const isClean = status.stdout.trim() === '';
    return { status: !cleanRequired || isClean ? 'PASS' : 'TEST_FAILURE', exitCode: !cleanRequired || isClean ? 0 : 1, counts: parseCounts('') };
  } else if (commandKey === 'WORKSPACE_INTEGRITY') {
    command = nodeExecutable;
    args = [path.join(root, 'bin', 'workspace-integrity.mjs'), 'check'];
  } else {
    return { status: 'CONFIG_INVALID', exitCode: null, counts: parseCounts(''), errorClass: 'UNKNOWN_COMMAND' };
  }
  const result = spawnSync(command, args, { cwd: root, env: environment, encoding: 'utf8', timeout: timeoutMs[timeoutClass], maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return summarizeChild(result, commandKey);
}

function summarizeChild(result, commandKey) {
  if (result.error?.code === 'ETIMEDOUT') return { status: 'TIMEOUT', exitCode: null, counts: parseCounts(''), errorClass: 'TIMEOUT' };
  if (result.error?.code === 'ENOENT') return { status: 'INSTALL_FAILURE', exitCode: null, counts: parseCounts(''), errorClass: 'TOOL_UNAVAILABLE' };
  if (result.error) return { status: 'ENVIRONMENT_MISMATCH', exitCode: null, counts: parseCounts(''), errorClass: 'SPAWN_ERROR' };
  if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') return { status: 'INTERRUPTED', exitCode: null, counts: parseCounts(`${result.stdout ?? ''}\n${result.stderr ?? ''}`), errorClass: result.signal };
  if (result.status === null) return { status: 'UNKNOWN_FAILURE', exitCode: null, counts: parseCounts(`${result.stdout ?? ''}\n${result.stderr ?? ''}`), errorClass: 'NO_EXIT_STATUS' };
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return { status: result.status === 0 ? 'PASS' : 'TEST_FAILURE', exitCode: result.status, counts: parseCounts(output), details: parseSafeDetails(output), errorClass: result.status === 0 ? null : `COMMAND_FAILED_${commandKey}` };
}

/**
 * Emit the receipt once, to both destinations, from ONE canonical string.
 *
 * Byte identity is structural here: there is a single `JSON.stringify` result
 * and both stdout and the file receive that exact string, so the two can never
 * drift and their `receiptDigest` values are necessarily equal.
 *
 * Persistence failure is a gate failure. A run whose evidence could not be
 * durably recorded is reported as such rather than passing quietly — that is
 * the whole point of the mechanism.
 */
function emitReceipt(receipt, target, exitCode) {
  receipt.receiptDigest = `receipt:sha256:${sha256(canonical(receipt)).slice(0, 24)}`;
  const canonicalBytes = JSON.stringify(receipt);
  console.log(canonicalBytes);
  if (target.file === undefined) {
    // The destination was rejected before any group ran; that refusal is
    // already reported and is itself the failure.
    process.exitCode = exitCode === 0 ? 1 : exitCode;
    return;
  }
  const persisted = persistGateReceipt(target.file, canonicalBytes);
  if (persisted.status !== 'WRITTEN') {
    // stderr only: stdout stays receipt-only so a consumer parsing the last
    // line still finds the receipt and nothing else.
    console.error(JSON.stringify({ status: 'RECEIPT_PERSISTENCE_FAILED', code: persisted.code, receiptDigest: receipt.receiptDigest }));
    process.exitCode = 3;
    return;
  }
  console.error(JSON.stringify({ status: 'RECEIPT_PERSISTED', origin: target.origin, receiptDigest: receipt.receiptDigest, file: persisted.file }));
  process.exitCode = exitCode;
}

function main(cli) {
  const mode = cli?.command ?? process.argv[2];
  if (!modes.has(mode)) {
    console.error(JSON.stringify({ status: 'CONFIG_INVALID', code: 'QUALITY_GATE_MODE_INVALID' }));
    process.exitCode = 2;
    return;
  }
  let definition;
  try {
    definition = readJson(definitionFile);
    if (definition.schemaVersion !== 'nightwatch.quality-gate.v1' || !Array.isArray(definition.groups) || definition.groups.length === 0) throw new Error('QUALITY_GATE_SCHEMA_INVALID');
  } catch (error) {
    console.error(JSON.stringify({ status: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'QUALITY_GATE_SCHEMA_INVALID' }));
    process.exitCode = 2;
    return;
  }
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const head = gitValue(['rev-parse', 'HEAD']);
  const packageLock = (() => { try { return fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'); } catch { return null; } })();
  // Fail closed on the receipt destination BEFORE any group runs: an unsafe or
  // unwritable path must cost no test time, and must never be discovered only
  // after the evidence it would have held already exists.
  const target = resolveGateReceiptTarget({ repositoryRoot: root, mode, gitHead: head });
  if (target.error !== undefined) {
    console.error(JSON.stringify({ status: 'CONFIG_INVALID', code: target.error }));
    process.exitCode = 2;
    return;
  }
  if (!head || packageLock === null || nodeMajor < 20 || ((mode === 'ci' || mode === 'clean') && nodeMajor !== 20)) {
    // An environment rejection is exactly the kind of result worth persisting.
    const receipt = { schemaVersion: 'nightwatch.quality-gate-receipt.v1', gateDefinitionDigest: `sha256:${sha256(canonical(definition))}`, gitHead: head, packageLockDigest: packageLock === null ? null : `sha256:${sha256(packageLock)}`, nodeMajor, environmentClass: mode.toUpperCase(), receiptPersistenceRequested: true, groups: [], finalResult: 'ENVIRONMENT_MISMATCH' };
    emitReceipt(receipt, target, 1);
    return;
  }
  const groups = [];
  let finalResult = 'PASS';
  for (const group of definition.groups) {
    const result = runFixedCommand(group.commandKey, mode, group.timeoutClass);
    groups.push({ id: group.id, required: group.required, status: result.status, exitCode: result.exitCode, counts: result.counts, ...(result.details === null || result.details === undefined ? {} : { details: result.details }) });
    if (group.required && result.status !== 'PASS') {
      finalResult = ['TIMEOUT', 'ENVIRONMENT_MISMATCH', 'INSTALL_FAILURE', 'INTERRUPTED', 'UNKNOWN_FAILURE', 'CONFIG_INVALID'].includes(result.status)
        ? result.status
        : 'TEST_FAILURE';
      for (const pending of definition.groups.slice(groups.length)) groups.push({ id: pending.id, required: pending.required, status: 'NOT_RUN', exitCode: null, counts: { total: null, passed: null, skipped: null, failed: null } });
      break;
    }
  }
  const receipt = {
    schemaVersion: 'nightwatch.quality-gate-receipt.v1',
    gateDefinitionDigest: `sha256:${sha256(canonical(definition))}`,
    gitHead: head,
    packageLockDigest: `sha256:${sha256(packageLock)}`,
    nodeMajor,
    environmentClass: mode.toUpperCase(),
    // Deterministic, and part of the digested body: the OUTCOME of persistence
    // cannot be, because the digest must exist before the bytes are written.
    receiptPersistenceRequested: true,
    groupIds: groups.map((group) => group.id),
    groups,
    finalResult,
  };
  emitReceipt(receipt, target, finalResult === 'PASS' ? 0 : 1);
}

if (invokedDirectly(import.meta.url)) {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (!cli.stop) main(cli);
}
