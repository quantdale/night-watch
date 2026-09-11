#!/usr/bin/env node

// Local Nightwatch workspace hygiene. The default status/clean modes are
// read-only. Apply mode revalidates each exact target immediately before
// running normal (non-force) Git removal commands. It never prunes broadly,
// deletes branches by pattern, inspects sibling repositories, or contacts a
// network.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_VERSION = 'nightwatch.local-hygiene.v1';
const MAX_OUTPUT = 512 * 1024;
const MAX_BRANCHES = 512;
const MAX_WORKTREES = 256;
const MAX_OUTPUT_ROOTS = 512;
const MAX_OUTPUT_FILES = 100_000;
const SAFE_BRANCH = /^(?:swarm|swarm2)\//;
const GENERATED_OUTPUTS = Object.freeze(['artifacts', 'test-results', '.nightwatch', '.tmp-nightwatch', 'dist']);
// Runner output and scratch. The owned roots are `test-results` (Playwright
// output, one subdirectory per lane) and `.tmp-nightwatch` (scratch); the
// `test-results-*` and `.tmp-*` siblings are the pre-F-06 accumulation. The
// pattern is deliberately root-level and narrow: it cannot reach `artifacts`,
// `.nightwatch`, `node_modules` or any source tree.
const OUTPUT_ROOT_PATTERN = /^(?:test-results(?:-[A-Za-z0-9._-]+)?|\.tmp-[A-Za-z0-9._-]+)$/;
const OWNED_OUTPUT_ROOTS = Object.freeze(['test-results', '.tmp-nightwatch']);
const OWNED_OUTPUT_ROOT_SET = new Set(OWNED_OUTPUT_ROOTS);
const PROTECTED_ROOT_NAMES = new Set(['artifacts', '.nightwatch', 'node_modules', '.git', 'dist']);

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch-hygiene',
  entry: 'bin/nightwatch-hygiene.mjs',
  purpose: 'Report or clean local generated workspace outputs without touching tracked files.',
  group: 'manage-evidence',
  commands: [
    { name: 'status', summary: 'report the generated outputs and safe targets' },
    { name: 'clean', summary: 'remove the safe targets, or plan with --apply absent' },
  ],
  defaultCommand: 'status',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
    { name: '--apply', shape: 'boolean', summary: 'apply the clean plan (requires the clean command)' },
    { name: '--root', shape: 'path', summary: 'inspect a different repository root' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

function parseArgs(argv) {
  let command = 'status';
  let json = false;
  let apply = false;
  let suppliedRoot = null;
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === 'status' || argument === 'clean') {
      if (command !== 'status' || seen.has('command')) throw new Error('USAGE_MULTIPLE_COMMANDS');
      command = argument;
      seen.add('command');
    } else if (argument === '--json') {
      if (seen.has('json')) throw new Error('USAGE_DUPLICATE_JSON');
      json = true;
      seen.add('json');
    } else if (argument === '--apply') {
      if (seen.has('apply')) throw new Error('USAGE_DUPLICATE_APPLY');
      apply = true;
      seen.add('apply');
    } else if (argument === '--root') {
      if (seen.has('root')) throw new Error('USAGE_DUPLICATE_ROOT');
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('USAGE_ROOT_REQUIRED');
      suppliedRoot = value;
      seen.add('root');
      index += 1;
    } else if (typeof argument === 'string' && argument.startsWith('--root=')) {
      throw new Error('USAGE_ROOT_REQUIRES_SEPARATE_VALUE');
    } else {
      throw new Error('USAGE_UNKNOWN_ARGUMENT');
    }
  }
  if (apply && command !== 'clean') throw new Error('USAGE_APPLY_REQUIRES_CLEAN');
  return { command, json, apply, suppliedRoot };
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: buildChildEnvironment(process.env),
    timeout: 15_000,
    maxBuffer: MAX_OUTPUT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) {
    return { ok: false, stdout: '', code: `GIT_${args[0]?.toUpperCase() ?? 'COMMAND'}_FAILED` };
  }
  return { ok: true, stdout: result.stdout ?? '', code: null };
}

function requiredGitText(cwd, args) {
  const result = runGit(cwd, args);
  if (!result.ok) throw new Error(result.code);
  return result.stdout.trim();
}

function resolveRoot(suppliedRoot) {
  const candidate = path.resolve(suppliedRoot ?? DEFAULT_ROOT);
  const discovered = runGit(candidate, ['rev-parse', '--show-toplevel']);
  if (!discovered.ok) throw new Error('HYGIENE_ROOT_IS_NOT_A_GIT_REPOSITORY');
  const root = path.resolve(discovered.stdout.trim());
  if (suppliedRoot !== null && root !== candidate) throw new Error('HYGIENE_ROOT_RESOLUTION_MISMATCH');
  return root;
}

function parseWorktreeList(text) {
  const records = [];
  let current = null;
  const flush = () => {
    if (current !== null) records.push(current);
    current = null;
  };
  for (const line of text.split(/\r?\n/)) {
    if (line === '') {
      flush();
      continue;
    }
    const worktree = /^worktree (.+)$/.exec(line);
    if (worktree) {
      flush();
      current = { path: worktree[1], head: null, branch: null, detached: false, prunable: false };
      continue;
    }
    if (current === null) continue;
    const head = /^HEAD ([0-9a-f]{40})$/i.exec(line);
    if (head) current.head = head[1].toLowerCase();
    const branch = /^branch refs\/heads\/(.+)$/.exec(line);
    if (branch) current.branch = branch[1];
    if (line === 'detached') current.detached = true;
    if (line.startsWith('prunable ')) current.prunable = true;
  }
  flush();
  return records.slice(0, MAX_WORKTREES);
}

function localBranches(root) {
  const text = requiredGitText(root, [
    'for-each-ref',
    '--format=%(refname:short)%00%(objectname)%00%(upstream:short)',
    'refs/heads',
  ]);
  const branches = [];
  for (const record of text.split(/\r?\n/).filter(Boolean)) {
    const [name, head, upstream = ''] = record.split('\0');
    if (!name || !/^[0-9a-f]{40}$/i.test(head ?? '')) continue;
    branches.push({ name, head: head.toLowerCase(), upstream: upstream || null });
  }
  return branches.sort((left, right) => left.name.localeCompare(right.name)).slice(0, MAX_BRANCHES);
}

function isAncestor(root, ancestor, descendant) {
  const result = runGit(root, ['merge-base', '--is-ancestor', ancestor, descendant]);
  return result.ok;
}

function worktreeState(worktree) {
  const resolvedPath = path.resolve(worktree.path);
  let stat;
  try {
    stat = fs.lstatSync(resolvedPath);
  } catch {
    return { resolvedPath, available: false, clean: null, dirtyFileCount: null, reasonCode: 'WORKTREE_PATH_MISSING' };
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    return { resolvedPath, available: false, clean: null, dirtyFileCount: null, reasonCode: 'WORKTREE_PATH_UNSAFE' };
  }
  const result = runGit(resolvedPath, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!result.ok) return { resolvedPath, available: true, clean: null, dirtyFileCount: null, reasonCode: 'WORKTREE_STATUS_UNAVAILABLE' };
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return {
    resolvedPath,
    available: true,
    clean: lines.length === 0,
    dirtyFileCount: lines.length,
    reasonCode: lines.length === 0 ? 'WORKTREE_CLEAN' : 'WORKTREE_DIRTY',
  };
}

function generatedOutputState(root) {
  return GENERATED_OUTPUTS.map((name) => {
    const target = path.join(root, name);
    try {
      const stat = fs.lstatSync(target);
      return { name, present: true, kind: stat.isDirectory() ? 'DIRECTORY' : stat.isFile() ? 'FILE' : 'OTHER' };
    } catch {
      return { name, present: false, kind: null };
    }
  });
}

function ignoredOutputState(root) {
  // Include bounded untracked/ignored directory entries so the report does
  // not claim zero merely because the probe disabled untracked output. The
  // existing Git maxBuffer remains the hard observation bound; overflow is
  // reported as UNAVAILABLE rather than becoming a partial count.
  const result = runGit(root, ['status', '--porcelain=v1', '--ignored=traditional', '--untracked-files=normal']);
  if (!result.ok) return { status: 'UNAVAILABLE', ignoredEntryCount: null };
  const ignoredEntryCount = result.stdout.split(/\r?\n/).filter((line) => line.startsWith('!!')).length;
  return { status: 'OBSERVED_ONLY', ignoredEntryCount };
}

/** Tracked paths under one root-level name. Failure is unprovable, not empty. */
function trackedPathsUnder(root, name) {
  const result = runGit(root, ['ls-files', '-z', '--', name]);
  if (!result.ok) return { status: 'UNAVAILABLE', files: [], code: result.code };
  return { status: 'OBSERVED', files: result.stdout.split('\0').filter((line) => line.length > 0), code: null };
}

/** Bounded, no-follow file count and byte size; null when unmeasurable. */
function boundedTreeStats(target) {
  let fileCount = 0;
  let bytes = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(child);
        continue;
      }
      try {
        bytes += fs.lstatSync(child).size;
      } catch {
        return null;
      }
      fileCount += 1;
      if (fileCount > MAX_OUTPUT_FILES) return null;
    }
  }
  return { fileCount, bytes };
}

/**
 * Root-level runner-output and scratch roots, with the exact disposition of
 * each. Only a directory whose tracked state proves it contains no tracked
 * file, and that is not a protected root, is a removal target. `artifacts/`
 * and `.nightwatch/` are outside the pattern by construction and protected by
 * name as well; neither can be reached from here.
 */
function outputRootState(root) {
  let names;
  try {
    names = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return { status: 'UNAVAILABLE', entries: [], unownedRoots: [] };
  }
  const entries = [];
  for (const entry of names) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (!OUTPUT_ROOT_PATTERN.test(entry.name)) continue;
    if (entries.length >= MAX_OUTPUT_ROOTS) return { status: 'UNAVAILABLE', entries: [], unownedRoots: [] };
    const target = path.join(root, entry.name);
    let stat;
    try {
      stat = fs.lstatSync(target);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
    const owned = OWNED_OUTPUT_ROOT_SET.has(entry.name);
    if (PROTECTED_ROOT_NAMES.has(entry.name)) {
      entries.push({
        name: entry.name,
        owned,
        trackedFileCount: null,
        fileCount: null,
        bytes: null,
        disposition: 'REFUSED_PROTECTED_ROOT',
        reasonCode: 'PROTECTED_ROOT_NAME',
      });
      continue;
    }
    const tracked = trackedPathsUnder(root, entry.name);
    let disposition = 'REMOVAL_TARGET';
    let reasonCode = 'RUNNER_OUTPUT_OR_SCRATCH';
    let stats = null;
    if (tracked.status !== 'OBSERVED') {
      disposition = 'REFUSED_UNPROVABLE';
      reasonCode = tracked.code ?? 'TRACKED_STATE_UNAVAILABLE';
    } else if (tracked.files.length > 0) {
      disposition = 'REFUSED_TRACKED_FILES_PRESENT';
      reasonCode = 'TRACKED_FILES_PRESENT';
    } else {
      stats = boundedTreeStats(target);
      if (stats === null) {
        disposition = 'REFUSED_UNPROVABLE';
        reasonCode = 'OUTPUT_TREE_UNMEASURABLE';
      }
    }
    entries.push({
      name: entry.name,
      owned,
      trackedFileCount: tracked.status === 'OBSERVED' ? tracked.files.length : null,
      fileCount: stats?.fileCount ?? null,
      bytes: stats?.bytes ?? null,
      disposition,
      reasonCode,
    });
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  return { status: 'OBSERVED', entries, unownedRoots: entries.filter((entry) => !entry.owned).map((entry) => entry.name) };
}

/**
 * Revalidate and remove exactly one previously planned output root. The exact
 * target is re-checked for tracked files immediately before removal, so a file
 * that became tracked between plan and apply is preserved, not deleted.
 */
function applyOutputTarget(root, name) {
  if (!OUTPUT_ROOT_PATTERN.test(name) || PROTECTED_ROOT_NAMES.has(name)) {
    return { name, result: 'PRESERVED', reasonCode: 'OUTPUT_TARGET_NOT_REMOVABLE' };
  }
  const target = path.join(root, name);
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch {
    return { name, result: 'PRESERVED', reasonCode: 'OUTPUT_TARGET_DISAPPEARED' };
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    return { name, result: 'PRESERVED', reasonCode: 'OUTPUT_TARGET_NOT_A_DIRECTORY' };
  }
  const tracked = trackedPathsUnder(root, name);
  if (tracked.status !== 'OBSERVED' || tracked.files.length > 0) {
    return { name, result: 'PRESERVED', reasonCode: 'TRACKED_FILES_PRESENT_OR_UNPROVABLE' };
  }
  try {
    fs.rmSync(target, { recursive: true, force: false });
  } catch {
    return { name, result: 'PRESERVED', reasonCode: 'OUTPUT_TARGET_REMOVE_FAILED' };
  }
  return { name, result: 'REMOVED', reasonCode: 'RUNNER_OUTPUT_OR_SCRATCH_REMOVED' };
}

function classifyRegistration(root, registration, branchByName, currentBranch, mainReference) {
  const state = worktreeState(registration);
  const base = {
    path: state.resolvedPath,
    head: registration.head,
    branch: registration.branch,
    detached: registration.detached,
    prunable: registration.prunable,
    available: state.available,
    clean: state.clean,
    dirtyFileCount: state.dirtyFileCount,
  };
  if (state.resolvedPath === root) return { ...base, disposition: 'PRESERVE_CANONICAL_WORKTREE', reasonCode: 'CANONICAL_WORKTREE' };
  if (!state.available) return { ...base, disposition: 'PRESERVE_UNSAFE_WORKTREE', reasonCode: state.reasonCode };
  if (registration.prunable) return { ...base, disposition: 'PRESERVE_UNSAFE_WORKTREE', reasonCode: 'GIT_MARKED_PRUNABLE' };
  if (!registration.branch) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'DETACHED_OR_UNBRANCHED_WORKTREE' };
  if (!SAFE_BRANCH.test(registration.branch)) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'NON_SWARM_BRANCH' };
  const branch = branchByName.get(registration.branch);
  if (!branch) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'BRANCH_REF_UNAVAILABLE' };
  if (registration.branch === currentBranch) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'CURRENT_BRANCH' };
  if (branch.upstream !== null) return { ...base, disposition: 'PRESERVE_REMOTE_TRACKING', reasonCode: 'BRANCH_HAS_UPSTREAM' };
  if (state.clean !== true) return { ...base, disposition: 'PRESERVE_DIRTY_WORKTREE', reasonCode: state.reasonCode };
  if (!mainReference) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'MAIN_REFERENCE_UNAVAILABLE' };
  if (registration.head !== branch.head) return { ...base, disposition: 'PRESERVE_UNVALIDATED_WORKTREE', reasonCode: 'WORKTREE_HEAD_DRIFT' };
  if (!isAncestor(root, branch.head, mainReference)) return { ...base, disposition: 'PRESERVE_UNREACHABLE_BRANCH', reasonCode: 'BRANCH_NOT_REACHABLE_FROM_MAIN' };
  return {
    ...base,
    disposition: 'SAFE_CLEAN_REACHABLE_TARGET',
    reasonCode: 'CLEAN_REACHABLE_SWARM_WORKTREE',
    target: { path: state.resolvedPath, branch: registration.branch },
  };
}

function inspect(root) {
  const gitHead = requiredGitText(root, ['rev-parse', 'HEAD']).toLowerCase();
  const currentBranchResult = runGit(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']);
  const currentBranch = currentBranchResult.ok ? currentBranchResult.stdout.trim() : null;
  const mainResult = runGit(root, ['show-ref', '--verify', '--quiet', 'refs/heads/main']);
  const mainReference = mainResult.ok ? 'refs/heads/main' : null;
  const registrations = parseWorktreeList(requiredGitText(root, ['worktree', 'list', '--porcelain']));
  const branches = localBranches(root);
  const branchByName = new Map(branches.map((branch) => [branch.name, branch]));
  const classifiedRegistrations = registrations.map((registration) => classifyRegistration(root, registration, branchByName, currentBranch, mainReference));
  const registeredBranches = new Set(registrations.map((registration) => registration.branch).filter(Boolean));
  const branchStates = branches.map((branch) => ({
    name: branch.name,
    head: branch.head,
    upstream: branch.upstream,
    disposition: branch.name === 'main'
      ? 'PRESERVE_CANONICAL_BRANCH'
      : registeredBranches.has(branch.name)
        ? 'REGISTERED_WORKTREE_REVIEWED'
        : 'PRESERVE_UNLINKED_BRANCH',
    reasonCode: branch.name === 'main'
      ? 'CANONICAL_BRANCH'
      : registeredBranches.has(branch.name)
        ? 'WORKTREE_REGISTRATION_PRESENT'
        : 'UNLINKED_BRANCH_UNVALIDATED',
  }));
  const safeTargets = classifiedRegistrations
    .filter((registration) => registration.disposition === 'SAFE_CLEAN_REACHABLE_TARGET')
    .map((registration) => registration.target);
  const outputState = outputRootState(root);
  const outputRemovalPlan = outputState.entries
    .filter((entry) => entry.disposition === 'REMOVAL_TARGET')
    .map((entry) => entry.name);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'STATUS',
    result: safeTargets.length === 0 && outputRemovalPlan.length === 0 ? 'PRESERVED' : 'REMOVAL_TARGETS_FOUND',
    root,
    gitHead,
    currentBranch,
    mainReference,
    policy: {
      defaultIsReadOnly: true,
      applyRequiresCleanReachableSwarmTarget: true,
      forceRemovalAllowed: false,
      broadPruneAllowed: false,
      generatedOutputsAreObservedOnly: true,
      outputRemovalRequiresNoTrackedFiles: true,
    },
    safeTargets,
    registrations: classifiedRegistrations,
    branches: branchStates,
    generatedOutputs: generatedOutputState(root),
    ignoredOutputs: ignoredOutputState(root),
    outputRemovalTargets: outputState.entries,
    outputRemovalPlan,
    unownedOutputRoots: outputState.unownedRoots,
    outputStatus: outputState.status,
  };
}

function applyTarget(root, target) {
  const current = inspect(root);
  const match = current.safeTargets.find((candidate) => candidate.path === target.path && candidate.branch === target.branch);
  if (!match) return { target, result: 'PRESERVED', reasonCode: 'TARGET_FAILED_REVALIDATION' };
  const removed = runGit(root, ['worktree', 'remove', match.path]);
  if (!removed.ok) return { target, result: 'PRESERVED', reasonCode: 'WORKTREE_REMOVE_FAILED' };
  const deleted = runGit(root, ['branch', '-d', '--', match.branch]);
  if (!deleted.ok) return { target, result: 'PRESERVED', reasonCode: 'BRANCH_DELETE_FAILED' };
  return { target, result: 'APPLIED', reasonCode: 'CLEAN_REACHABLE_TARGET_REMOVED' };
}

function renderText(report) {
  const applied = report.applyResults?.filter((entry) => entry.result === 'APPLIED').length ?? 0;
  const outputsApplied = report.outputRemovalResults?.filter((entry) => entry.result === 'REMOVED').length ?? 0;
  const lines = [
    `Nightwatch hygiene: ${report.result}`,
    `mode=${report.mode} head=${report.gitHead} main=${report.mainReference ?? 'unavailable'}`,
    `registrations=${report.registrations.length} branches=${report.branches.length} safeTargets=${report.safeTargets.length} applied=${applied}`,
    `generatedOutputsObserved=${report.generatedOutputs.filter((entry) => entry.present).length} ignoredEntries=${report.ignoredOutputs.ignoredEntryCount ?? 'unavailable'}`,
    `outputRoots=${report.outputRemovalTargets?.length ?? 0} unownedOutputRoots=${report.unownedOutputRoots?.length ?? 0} outputRemovalPlan=${report.outputRemovalPlan?.length ?? 0}`,
  ];
  for (const name of report.outputRemovalPlan ?? []) lines.push(`would remove ${name}`);
  for (const entry of report.outputRemovalTargets ?? []) {
    if (entry.disposition.startsWith('REFUSED')) lines.push(`preserve ${entry.name} ${entry.reasonCode}`);
  }
  lines.push(...(report.applyResults ?? []).map((entry) => `${entry.result} ${entry.target.branch} ${entry.reasonCode}`));
  lines.push(...(report.outputRemovalResults ?? []).map((entry) => `${entry.result} ${entry.name} ${entry.reasonCode}`));
  if (report.mode === 'APPLY') lines.push(`outputsApplied=${outputsApplied}`);
  return lines.join('\n') + '\n';
}

function execute(options) {
  const root = resolveRoot(options.suppliedRoot);
  if (!options.apply) {
    const report = inspect(root);
    report.mode = options.command === 'clean' ? 'DRY_RUN' : 'STATUS';
    return report;
  }
  const before = inspect(root);
  const applyResults = before.safeTargets.map((target) => applyTarget(root, target));
  const outputRemovalResults = before.outputRemovalPlan.map((name) => applyOutputTarget(root, name));
  const after = inspect(root);
  after.mode = 'APPLY';
  after.applyPlan = before.safeTargets;
  after.applyResults = applyResults;
  after.outputRemovalResults = outputRemovalResults;
  const appliedCount = applyResults.filter((entry) => entry.result === 'APPLIED').length
    + outputRemovalResults.filter((entry) => entry.result === 'REMOVED').length;
  const preservedCount = applyResults.filter((entry) => entry.result === 'PRESERVED').length
    + outputRemovalResults.filter((entry) => entry.result === 'PRESERVED').length;
  after.result = appliedCount > 0 ? (preservedCount > 0 ? 'PARTIAL' : 'APPLIED') : 'PRESERVED';
  return after;
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop) {
const options = (() => {
  try {
    return parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'USAGE_INVALID');
    process.exit(2);
  }
})();

try {
  const report = execute(options);
  process.stdout.write(options.json ? `${JSON.stringify(report)}\n` : renderText(report));
} catch {
  if (options.json) process.stdout.write(`${JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: 'BLOCKED', code: 'HYGIENE_EXECUTION_BLOCKED' })}\n`);
  else console.error('HYGIENE_EXECUTION_BLOCKED');
  process.exitCode = 2;
}
}
