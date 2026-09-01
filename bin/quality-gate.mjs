#!/usr/bin/env node

// Shared Nightwatch quality-gate executor. The JSON definition names only
// fixed command keys. No runtime string is passed to a shell.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definitionFile = path.join(root, 'config', 'quality-gate.v1.json');
const modes = new Set(['local', 'ci', 'clean', 'predev']);
const timeoutMs = { SHORT: 120_000, MEDIUM: 600_000, LONG: 1_200_000 };
const packageManager = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeExecutable = process.execPath;
const FORBIDDEN_ENVIRONMENT_KEYS = Object.freeze([
  'NIGHTWATCH_STORAGE_STATE', 'NIGHTWATCH_AUTH_FILE', 'NIGHTWATCH_OWNER_FINDINGS',
  'GITHUB_TOKEN', 'GH_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS', 'CLOUDSDK_AUTH_ACCESS_TOKEN',
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

function parseCounts(output) {
  const counts = { total: null, passed: null, skipped: null, failed: null };
  for (const line of output.split(/\r?\n/).reverse()) {
    try {
      const value = JSON.parse(line);
      if (value?.schemaVersion === 'nightwatch.semantic-compatibility.v1') {
        for (const key of ['total', 'passed', 'skipped', 'failed']) {
          if (Number.isInteger(value[key])) counts[key] = value[key];
        }
        if (counts.total === null && [counts.passed, counts.skipped, counts.failed].every((item) => Number.isInteger(item))) {
          counts.total = counts.passed + counts.skipped + counts.failed;
        }
        return counts;
      }
    } catch {
      // The child may also emit ordinary Playwright output; use the bounded
      // text patterns below when no structured summary is present.
    }
  }
  const total = /Total:\s*(\d+)\s+tests?/i.exec(output);
  const passed = /(\d+)\s+passed/i.exec(output);
  const skipped = /(\d+)\s+skipped/i.exec(output);
  const failed = /(\d+)\s+failed/i.exec(output);
  if (total) counts.total = Number(total[1]);
  if (passed) counts.passed = Number(passed[1]);
  if (skipped) counts.skipped = Number(skipped[1]);
  if (failed) counts.failed = Number(failed[1]);
  return counts;
}

function parseSafeDetails(output) {
  for (const line of output.split(/\r?\n/).reverse()) {
    try {
      const value = JSON.parse(line);
      if (value?.schemaVersion === 'nightwatch.semantic-compatibility.v1') {
        return { failedLocations: Array.isArray(value.failedLocations) ? value.failedLocations.slice(0, 16) : [] };
      }
    } catch {
      // Structured child receipts are optional diagnostics; raw output is
      // intentionally never copied into the quality-gate receipt.
    }
  }
  return null;
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
    command = packageManager;
    args = ['run', 'campaign:synthetic'];
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

function main() {
  const mode = process.argv[2];
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
  if (!head || packageLock === null || nodeMajor < 20 || ((mode === 'ci' || mode === 'clean') && nodeMajor !== 20)) {
    const receipt = { schemaVersion: 'nightwatch.quality-gate-receipt.v1', gateDefinitionDigest: `sha256:${sha256(canonical(definition))}`, gitHead: head, packageLockDigest: packageLock === null ? null : `sha256:${sha256(packageLock)}`, nodeMajor, environmentClass: mode.toUpperCase(), groups: [], finalResult: 'ENVIRONMENT_MISMATCH' };
    receipt.receiptDigest = `receipt:sha256:${sha256(canonical(receipt)).slice(0, 24)}`;
    console.log(JSON.stringify(receipt));
    process.exitCode = 1;
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
    groupIds: groups.map((group) => group.id),
    groups,
    finalResult,
  };
  receipt.receiptDigest = `receipt:sha256:${sha256(canonical(receipt)).slice(0, 24)}`;
  console.log(JSON.stringify(receipt));
  process.exitCode = finalResult === 'PASS' ? 0 : 1;
}

main();
