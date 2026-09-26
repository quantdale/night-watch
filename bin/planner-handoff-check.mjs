#!/usr/bin/env node

// Read-only Git/filesystem authority for the planner -> executor handoff.
// This checker validates route/currentness only. It does not parse OpenSpec
// prose, replace task continuity, or perform any write/network operation.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  HANDOFF_RECEIPT_SCHEMA,
  parseHandoffHeader,
  validateHandoffState,
  uniqueErrorCodes,
} from './planner-handoff-protocol.mjs';
import { fieldValue, findDuplicateFields, normalizeTaskStatus, parseKeyValuesWithLocations } from './agent-continuity-protocol.mjs';
import { inspectWorkspace } from './workspace-integrity.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const MAX_READ_BYTES = 512 * 1024;
const MAX_ROUTE_ENTRIES = 256;
const REQUIRED_OPEN_SPEC_FILES = Object.freeze(['audit.md', 'proposal.md', 'design.md', 'tasks.md']);
const SAFE_RELATIVE_PATH_RE = /^[A-Za-z0-9._/-]+$/;

function parseArgs(argv) {
  let root = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      const supplied = argv[index + 1];
      if (!supplied || supplied.startsWith('--')) throw new Error('HANDOFF_USAGE_INVALID');
      root = path.resolve(supplied);
      index += 1;
    } else {
      throw new Error('HANDOFF_USAGE_INVALID');
    }
  }
  return root;
}

function safeGitEnvironment(root = process.cwd()) {
  const environment = {
    PATH: '/usr/bin:/bin',
    HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null',
    LANG: 'C',
    LC_ALL: 'C',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_OPTIONAL_LOCKS: '0',
  };
  // D-04 / 4.10 — the gate-mode label is a non-secret classification input;
  // the continuity child must see the same mode its gate group runs in.
  const gateEnvironment = process.env['NIGHTWATCH_GATE_ENVIRONMENT'];
  if (gateEnvironment !== undefined && gateEnvironment !== '') {
    environment['NIGHTWATCH_GATE_ENVIRONMENT'] = gateEnvironment;
  }
  return environment;
}

function git(root, args) {
  return spawnSync('git', args, {
    cwd: root,
    env: safeGitEnvironment(root),
    shell: false,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: MAX_READ_BYTES,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function lstatNoSymlinks(root, relativePath, errors, missingCode, noncanonicalCode = 'HANDOFF_NONCANONICAL_FILE') {
  if (!SAFE_RELATIVE_PATH_RE.test(relativePath)) {
    errors.push(missingCode);
    return null;
  }
  const components = relativePath.split('/').filter(Boolean);
  if (components.some((component) => component === '.' || component === '..')) {
    errors.push(missingCode);
    return null;
  }
  let absolute = root;
  for (const component of components) {
    absolute = path.join(absolute, component);
    let stat;
    try {
      stat = fs.lstatSync(absolute);
    } catch {
      errors.push(missingCode);
      return null;
    }
    if (stat.isSymbolicLink()) {
      errors.push(noncanonicalCode);
      return null;
    }
  }
  try {
    return { absolute, stat: fs.lstatSync(absolute) };
  } catch {
    errors.push(missingCode);
    return null;
  }
}

function readRegular(root, relativePath, errors, missingCode) {
  if (!SAFE_RELATIVE_PATH_RE.test(relativePath) || relativePath.includes('..')) {
    errors.push(missingCode);
    return null;
  }
  const resolved = lstatNoSymlinks(root, relativePath, errors, missingCode);
  if (resolved === null) {
    return null;
  }
  const { absolute, stat } = resolved;
  if (stat.isSymbolicLink() || !stat.isFile()) {
    errors.push('HANDOFF_NONCANONICAL_FILE');
    return null;
  }
  if (stat.size > MAX_READ_BYTES) {
    errors.push('HANDOFF_METADATA_OVERSIZED');
    return null;
  }
  try {
    return fs.readFileSync(absolute, 'utf8');
  } catch {
    errors.push(missingCode);
    return null;
  }
}

function trackedRegular(root, relativePath, errors) {
  const resolved = lstatNoSymlinks(root, relativePath, errors, 'HANDOFF_OPENSPEC_FILE_MISSING', 'HANDOFF_OPENSPEC_NONCANONICAL_FILE');
  if (resolved === null) {
    return false;
  }
  const { stat } = resolved;
  if (stat.isSymbolicLink() || !stat.isFile()) {
    errors.push('HANDOFF_OPENSPEC_NONCANONICAL_FILE');
    return false;
  }
  const result = git(root, ['ls-files', '--error-unmatch', '--', relativePath]);
  if (result.status !== 0 || (result.stdout ?? '').trim() !== relativePath) {
    errors.push('HANDOFF_OPENSPEC_FILE_UNTRACKED');
    return false;
  }
  return true;
}

function inspectOpenSpecRoute(root, fields, errors) {
  const route = fields.OpenSpec;
  const resolvedRoute = lstatNoSymlinks(root, route, errors, 'HANDOFF_OPENSPEC_ROUTE_MISSING');
  if (resolvedRoute === null) {
    return [];
  }
  const { stat: routeStat } = resolvedRoute;
  if (routeStat.isSymbolicLink() || !routeStat.isDirectory()) {
    errors.push('HANDOFF_OPENSPEC_ROUTE_NONCANONICAL');
    return [];
  }

  const files = [];
  for (const file of REQUIRED_OPEN_SPEC_FILES) {
    const relativePath = path.posix.join(route, file);
    if (trackedRegular(root, relativePath, errors)) files.push(relativePath);
  }

  const specsRelative = path.posix.join(route, 'specs');
  const resolvedSpecs = lstatNoSymlinks(root, specsRelative, errors, 'HANDOFF_OPENSPEC_SPEC_MISSING', 'HANDOFF_OPENSPEC_NONCANONICAL_FILE');
  if (resolvedSpecs === null || !resolvedSpecs.stat.isDirectory()) {
    errors.push('HANDOFF_OPENSPEC_SPEC_MISSING');
    return files;
  }
  let entries;
  try {
    entries = fs.readdirSync(resolvedSpecs.absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    errors.push('HANDOFF_OPENSPEC_SPEC_MISSING');
    return files;
  }
  if (entries.length > MAX_ROUTE_ENTRIES) {
    errors.push('HANDOFF_OPENSPEC_ROUTE_OVERSIZED');
    return files;
  }
  let specCount = 0;
  for (const entry of entries) {
    if (!SAFE_RELATIVE_PATH_RE.test(entry.name) || entry.name.includes('..')) {
      errors.push('HANDOFF_OPENSPEC_ROUTE_INVALID');
      continue;
    }
    if (entry.isSymbolicLink()) {
      errors.push('HANDOFF_OPENSPEC_NONCANONICAL_FILE');
      continue;
    }
    if (!entry.isDirectory()) continue;
    const specRelative = path.posix.join(specsRelative, entry.name, 'spec.md');
    if (trackedRegular(root, specRelative, errors)) {
      files.push(specRelative);
      specCount += 1;
    }
  }
  if (specCount === 0) errors.push('HANDOFF_OPENSPEC_SPEC_MISSING');
  return files.sort();
}

function inspectActiveTask(root, errors) {
  const text = readRegular(root, '.agent/ACTIVE_TASK.md', errors, 'HANDOFF_ACTIVE_TASK_MISSING');
  if (text === null) return { activeTaskId: undefined, activeTaskStatus: undefined, continuityOk: false };
  const parsed = parseKeyValuesWithLocations(text);
  for (const duplicate of findDuplicateFields(parsed)) errors.push('HANDOFF_ACTIVE_TASK_DUPLICATE_FIELD');
  const activeTaskId = fieldValue(parsed, 'Task ID');
  const activeTaskStatus = normalizeTaskStatus(fieldValue(parsed, 'Status'));
  if (activeTaskId === undefined) errors.push('HANDOFF_ACTIVE_TASK_ID_MISSING');
  if (activeTaskStatus === null || activeTaskStatus === undefined) errors.push('HANDOFF_ACTIVE_TASK_STATUS_INVALID');
  return { activeTaskId, activeTaskStatus, continuityOk: false };
}

function runContinuity(root) {
  const checker = path.join(root, 'bin', 'agent-state.mjs');
  try {
    if (!fs.lstatSync(checker).isFile()) return false;
  } catch {
    return false;
  }
  const result = spawnSync(process.execPath, [checker, '--root', root], {
    cwd: root,
    env: safeGitEnvironment(root),
    shell: false,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 && !result.error;
}

/**
 * True only when `branch` is a C-00 session branch that the current worktree
 * actually owns for the active task. This is a narrowing of the old
 * "must be on main" rule, not a widening: an unowned or foreign session
 * branch is still rejected.
 */
function ownedSessionBranch(root, branch) {
  if (typeof branch !== 'string' || !branch.startsWith('session/')) return false;
  const report = inspectWorkspace({ root });
  return report.verdict === 'PASS'
    && report.self !== null
    && report.self.class === 'OWNED_SESSION'
    && report.self.branch === branch;
}

function inspectGitBinding(root, fields, errors) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0 || path.resolve((top.stdout ?? '').trim()) !== path.resolve(root)) {
    errors.push('HANDOFF_GIT_ROOT_INVALID');
    return undefined;
  }
  // C-00: a writing agent works on an owned session branch whose integration
  // target is still the declared canonical branch. The declared target must
  // therefore be `main`, and the current branch must be either `main` itself
  // or a `session/*` branch that is owned by the active task in this worktree.
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const currentBranch = branch.status === 0 ? (branch.stdout ?? '').trim() : '';
  const targetBranch = fields['Target Branch'];
  if (targetBranch !== 'main') errors.push('HANDOFF_TARGET_BRANCH_MISMATCH');
  else if (currentBranch !== 'main' && !ownedSessionBranch(root, currentBranch)) {
    errors.push('HANDOFF_TARGET_BRANCH_MISMATCH');
  }
  const head = git(root, ['rev-parse', 'HEAD']);
  const headSha = head.status === 0 ? (head.stdout ?? '').trim() : undefined;
  if (!headSha) {
    errors.push('HANDOFF_GIT_HEAD_UNAVAILABLE');
    return undefined;
  }
  const commit = git(root, ['cat-file', '-e', `${fields['Planned-From']}^{commit}`]);
  if (commit.status !== 0) {
    errors.push('HANDOFF_PLANNED_FROM_NOT_FOUND');
  } else {
    const ancestor = git(root, ['merge-base', '--is-ancestor', fields['Planned-From'], headSha]);
    if (ancestor.status !== 0) errors.push('HANDOFF_PLANNED_FROM_NOT_ANCESTOR');
  }
  return headSha;
}

export function inspectHandoff(root) {
  const errors = [];
  const prompt = readRegular(root, '.agent/EXECUTION_PROMPT.md', errors, 'HANDOFF_PROMPT_MISSING');
  if (prompt === null) return { ok: false, errors: Object.freeze([...new Set(errors)]), receipt: null };
  const parsed = parseHandoffHeader(prompt);
  const header = parsed;
  if (!header.ok) errors.push(...(header.errors ?? []).map((item) => item.code));

  let fields = header.fields ?? {};
  let active = { activeTaskId: undefined, activeTaskStatus: undefined, continuityOk: false };
  let openSpecFiles = [];
  let headSha;
  if (header.ok) {
    const gitFields = inspectGitBinding(root, fields, errors);
    headSha = gitFields;
    openSpecFiles = inspectOpenSpecRoute(root, fields, errors);
    active = inspectActiveTask(root, errors);
    active.continuityOk = runContinuity(root);
    const stateResult = validateHandoffState(header, active);
    if (!stateResult.ok) errors.push(...stateResult.errors.map((item) => item.code));
  }
  const unique = [...new Set(errors)].slice(0, 32);
  if (unique.length > 0) return { ok: false, errors: Object.freeze(unique), receipt: null };
  return {
    ok: true,
    errors: Object.freeze([]),
    receipt: Object.freeze({
      status: 'PASS',
      schemaVersion: HANDOFF_RECEIPT_SCHEMA,
      handoffProtocolVersion: fields.HANDOFF_PROTOCOL_VERSION,
      handoffStatus: fields.Status,
      campaignId: fields['Campaign ID'],
      openSpec: fields.OpenSpec,
      plannedFrom: fields['Planned-From'],
      targetBranch: fields['Target Branch'],
      predecessorTaskId: fields['Predecessor Task ID'],
      predecessorStatus: fields['Predecessor Status'],
      activeTaskId: active.activeTaskId,
      activeTaskStatus: active.activeTaskStatus,
      liveHead: headSha,
      openSpecFiles,
    }),
  };
}

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'planner-handoff-check',
  entry: 'bin/planner-handoff-check.mjs',
  purpose: 'Validate the planner-to-executor handoff route and currentness without writing anything.',
  group: 'validate',
  flags: [
    { name: '--root', shape: 'path', summary: 'validate a different repository root' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function main() {
  const cli = defineOperatorCli(CLI_METADATA);
  if (cli.stop) return;
  let root;
  try {
    root = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(JSON.stringify({ status: 'FAIL', schemaVersion: HANDOFF_RECEIPT_SCHEMA, errors: ['HANDOFF_USAGE_INVALID'] }));
    process.exitCode = 2;
    return;
  }
  const result = inspectHandoff(root);
  if (!result.ok) {
    console.error(JSON.stringify({ status: 'FAIL', schemaVersion: HANDOFF_RECEIPT_SCHEMA, errors: uniqueErrorCodes(result.errors.map((code) => ({ code }))) }));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(result.receipt, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
