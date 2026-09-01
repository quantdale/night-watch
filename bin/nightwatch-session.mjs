#!/usr/bin/env node

// Nightwatch C-00 — session/worktree lifecycle CLI.
//
// This is the ONLY Nightwatch surface that mutates worktree/branch/ownership
// state. It enforces the invariant
//   ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY
// and the fast-forward-only, never-force-push integration protocol.
//
// It never force-pushes, never rebases or amends another session's commits,
// never checks out the canonical branch, never resolves a conflict silently,
// and never deletes another live session's work.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  WORKSPACE_SESSION_SCHEMA,
  bootDigest,
  inspectWorkspace,
  loadPolicy,
  renderText,
  sessionRecordPath,
} from './workspace-integrity.mjs';

const GIT_TIMEOUT_MS = 30_000;
const GIT_NETWORK_TIMEOUT_MS = 180_000;
const GIT_MAX_BUFFER = 8 * 1024 * 1024;

function git(cwd, args, { network = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: network ? GIT_NETWORK_TIMEOUT_MS : GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return { ok: false, stdout: '', stderr: String(result.error.code ?? 'SPAWN_ERROR'), code: null };
  return { ok: result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.status };
}

function gitValue(cwd, args) {
  const result = git(cwd, args);
  if (!result.ok) return null;
  const value = result.stdout.trim();
  return value === '' ? null : value;
}

function fail(code, detail) {
  console.error(detail === undefined ? `[session] ERROR: ${code}` : `[session] ERROR: ${code}: ${detail}`);
  process.exitCode = 1;
  return null;
}

function emit(code, detail) {
  console.log(detail === undefined ? `[session] ${code}` : `[session] ${code}: ${detail}`);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}

function resolveContext(root) {
  const toplevel = gitValue(root, ['rev-parse', '--show-toplevel']);
  if (toplevel === null) return null;
  const resolved = path.resolve(toplevel);
  const commonDir = path.resolve(resolved, gitValue(resolved, ['rev-parse', '--git-common-dir']) ?? '.git');
  const gitDir = path.resolve(resolved, gitValue(resolved, ['rev-parse', '--git-dir']) ?? '.git');
  const isLinked = gitDir !== commonDir;
  const worktreeName = isLinked ? path.basename(gitDir) : null;
  return { root: resolved, commonDir, gitDir, isLinked, worktreeName, policy: loadPolicy(resolved) };
}

function buildRecord({ taskId, campaignId, role, branch, baseSha, anchorPid = null }) {
  const holder = { bootDigest: bootDigest(), startedAtIso: new Date().toISOString() };
  // A pid anchor is optional. A conversational agent session has no single
  // long-lived process, so ownership without an anchor ends at explicit
  // release or at reboot. A long-running process may anchor with --pid.
  if (anchorPid !== null) holder.pid = anchorPid;
  return {
    schemaVersion: WORKSPACE_SESSION_SCHEMA,
    sessionId: `sess-${crypto.randomBytes(6).toString('hex')}`,
    taskId,
    campaignId: campaignId ?? taskId,
    role,
    branch,
    baseSha,
    createdAtIso: new Date().toISOString(),
    ownershipState: 'OWNED',
    integrationState: 'NOT_INTEGRATED',
    holder,
  };
}

function writeRecordExclusive(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function writeRecordReplace(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function readRecordRaw(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function holderIsLive(record) {
  const holder = record?.holder ?? null;
  if (holder === null || record.ownershipState !== 'OWNED') return false;
  if (holder.bootDigest !== bootDigest()) return false;
  if (holder.pid === undefined || holder.pid === null) return true;
  if (!Number.isInteger(holder.pid) || holder.pid <= 0) return false;
  try {
    process.kill(holder.pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

function commandStatus(context, options) {
  const report = inspectWorkspace({ root: context.root });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const paths = new Map();
    const listed = git(context.root, ['worktree', 'list', '--porcelain']);
    if (listed.ok) {
      for (const line of listed.stdout.split(/\r?\n/)) {
        if (!line.startsWith('worktree ')) continue;
        const resolved = path.resolve(line.slice('worktree '.length));
        const name = resolved === path.resolve(path.dirname(context.commonDir)) ? 'canonical' : path.basename(resolved);
        paths.set(name, resolved);
      }
    }
    console.log(renderText(report, paths));
  }
  if (options.command === 'check' && report.verdict === 'FAIL') process.exitCode = 1;
  return report;
}

function commandClaim(context, options) {
  if (options.taskId === null) return fail('SESSION_TASK_ID_REQUIRED', 'pass --task <task-id>');
  if (!context.isLinked && options.role !== 'MAINTENANCE') {
    return fail('SESSION_CANONICAL_IMPLEMENTATION_REFUSED', 'the canonical checkout may only hold a MAINTENANCE claim; use start to create an implementation worktree');
  }
  const branch = gitValue(context.root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch === null || branch === 'HEAD') return fail('SESSION_DETACHED_HEAD', 'a session requires a named branch');
  const prefix = context.policy?.canonical?.sessionBranchPrefix ?? 'session/';
  if (context.isLinked && !branch.startsWith(prefix)) {
    return fail('SESSION_BRANCH_PREFIX_INVALID', `implementation session branches must start with ${prefix}`);
  }
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  const baseSha = options.baseSha
    ?? gitValue(context.root, ['merge-base', 'HEAD', `${remote}/${canonicalBranch}`])
    ?? gitValue(context.root, ['rev-parse', 'HEAD']);
  if (baseSha === null) return fail('SESSION_BASE_UNRESOLVED');
  const file = sessionRecordPath(context.commonDir, context.worktreeName, context.policy);
  const existing = readRecordRaw(file);
  if (existing !== null) {
    if (holderIsLive(existing)) {
      return fail('SESSION_ALREADY_OWNED', `worktree already owned by task ${existing.taskId} (session ${existing.sessionId})`);
    }
    if (!options.adopt) {
      return fail('SESSION_OWNER_STALE', `worktree holds a non-live claim for task ${existing.taskId}; re-run with --adopt to take ownership without deleting work`);
    }
  }
  const record = buildRecord({ taskId: options.taskId, campaignId: options.campaignId, role: options.role, branch, baseSha, anchorPid: options.anchorPid });
  try {
    if (existing === null) writeRecordExclusive(file, record);
    else writeRecordReplace(file, record);
  } catch (error) {
    if (error?.code === 'EEXIST') return fail('SESSION_ALREADY_OWNED', 'a concurrent claim won the exclusive create');
    return fail('SESSION_RECORD_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }
  emit('SESSION_CLAIMED', `task=${record.taskId} session=${record.sessionId} branch=${branch} base=${baseSha}`);
  return record;
}

function commandStart(context, options) {
  if (options.taskId === null) return fail('SESSION_TASK_ID_REQUIRED', 'pass --task <task-id>');
  const pre = inspectWorkspace({ root: context.root });
  if (pre.verdict === 'FAIL' && !options.allowDrift) {
    console.error(renderText(pre));
    return fail('SESSION_START_REFUSED_UNSAFE_WORKSPACE', 'resolve the reported workspace violations first');
  }
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  const baseSha = options.baseSha
    ?? gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`])
    ?? gitValue(context.root, ['rev-parse', 'HEAD']);
  if (baseSha === null) return fail('SESSION_BASE_UNRESOLVED');
  const prefix = context.policy?.canonical?.sessionBranchPrefix ?? 'session/';
  const name = `${slug(options.taskId)}-${crypto.randomBytes(4).toString('hex')}`;
  const branch = `${prefix}${name}`;
  const parent = options.directory ?? path.join(os.homedir(), '.nightwatch', 'worktrees');
  const target = path.join(parent, name);
  if (fs.existsSync(target)) return fail('SESSION_WORKTREE_PATH_OCCUPIED', name);
  fs.mkdirSync(parent, { recursive: true });
  const added = git(context.root, ['worktree', 'add', '-b', branch, target, baseSha]);
  if (!added.ok) return fail('SESSION_WORKTREE_ADD_FAILED', added.stderr.trim().split('\n').pop() ?? '');
  const created = resolveContext(target);
  if (created === null) return fail('SESSION_WORKTREE_UNRESOLVED', name);
  const record = buildRecord({ taskId: options.taskId, campaignId: options.campaignId, role: options.role, branch, baseSha });
  // The creating process is not the owning agent; ownership starts released so
  // the agent that will actually write must claim it explicitly.
  record.ownershipState = 'RELEASED';
  record.holder = null;
  try {
    writeRecordExclusive(sessionRecordPath(created.commonDir, created.worktreeName, created.policy), record);
  } catch (error) {
    return fail('SESSION_RECORD_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }
  emit('SESSION_WORKTREE_CREATED', `name=${name} branch=${branch} base=${baseSha} path=${target}`);
  emit('SESSION_NEXT_ACTION', `cd ${target} && node bin/nightwatch-session.mjs claim --task ${options.taskId} --adopt`);
  return record;
}

function commandRelease(context) {
  const file = sessionRecordPath(context.commonDir, context.worktreeName, context.policy);
  const existing = readRecordRaw(file);
  if (existing === null) return fail('SESSION_RECORD_ABSENT');
  const updated = { ...existing, ownershipState: 'RELEASED', holder: null };
  try {
    writeRecordReplace(file, updated);
  } catch (error) {
    return fail('SESSION_RECORD_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }
  emit('SESSION_RELEASED', `task=${existing.taskId} session=${existing.sessionId}`);
  return updated;
}

function commandReconcile(context, options) {
  const report = inspectWorkspace({ root: context.root });
  if (report.self?.class !== 'OWNED_SESSION') return fail('SESSION_NOT_OWNED', 'reconcile runs inside an owned session worktree');
  if (report.self.clean === false) return fail('SESSION_WORKTREE_DIRTY', 'commit or set aside your own changes before reconciling');
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  if (!options.offline) {
    const fetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
    if (!fetched.ok) return fail('SESSION_FETCH_FAILED', fetched.stderr.trim().split('\n').pop() ?? '');
  }
  const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
  if (remoteMain === null) return fail('SESSION_REMOTE_MAIN_UNKNOWN');
  if (git(context.root, ['merge-base', '--is-ancestor', remoteMain, 'HEAD']).ok) {
    emit('SESSION_ALREADY_CONTAINS_CANONICAL', remoteMain);
    return { merged: false };
  }
  // Merge, never rebase: another session's commits are never rewritten.
  // --no-ff keeps the reconciliation an explicit, auditable merge commit.
  const merged = git(context.root, ['merge', '--no-ff', '--no-edit', `${remote}/${canonicalBranch}`]);
  if (!merged.ok) {
    // Classify before aborting: an unmerged index means a real content
    // conflict; anything else is an environment/tooling failure and must not
    // be reported as a conflict.
    const unmerged = gitValue(context.root, ['ls-files', '-u']);
    git(context.root, ['merge', '--abort']);
    if (unmerged !== null) {
      return fail('SESSION_RECONCILE_CONFLICT', 'the merge was aborted; resolve deliberately and re-validate — nothing was rewritten');
    }
    return fail('SESSION_RECONCILE_FAILED', `${merged.stderr.trim().split('\n').pop() ?? 'merge failed'} — nothing was rewritten`);
  }
  emit('SESSION_RECONCILED', `merged ${remote}/${canonicalBranch}=${remoteMain}; re-run the full validation before integrating`);
  return { merged: true };
}

function commandIntegrate(context, options) {
  const report = inspectWorkspace({ root: context.root });
  if (report.verdict === 'FAIL') {
    console.error(renderText(report));
    return fail('SESSION_INTEGRATION_REFUSED_UNSAFE_WORKSPACE');
  }
  if (report.self?.class !== 'OWNED_SESSION') return fail('SESSION_NOT_OWNED', 'integration runs inside an owned session worktree');
  if (report.self.clean === false) return fail('SESSION_WORKTREE_DIRTY');
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  if (!options.offline) {
    const fetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
    if (!fetched.ok) return fail('SESSION_FETCH_FAILED', fetched.stderr.trim().split('\n').pop() ?? '');
  }
  const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
  const head = gitValue(context.root, ['rev-parse', 'HEAD']);
  if (remoteMain === null || head === null) return fail('SESSION_REMOTE_MAIN_UNKNOWN');
  if (remoteMain === head) {
    emit('SESSION_ALREADY_INTEGRATED', head);
    return { pushed: false, head };
  }
  if (!git(context.root, ['merge-base', '--is-ancestor', remoteMain, 'HEAD']).ok) {
    return fail('SESSION_INTEGRATION_NOT_FAST_FORWARD', `${remote}/${canonicalBranch}=${remoteMain} is not contained in HEAD; run reconcile, revalidate, then integrate — never force-push`);
  }
  if (options.dryRun) {
    emit('SESSION_INTEGRATION_READY', `fast-forward ${remoteMain} -> ${head}`);
    return { pushed: false, head };
  }
  // Serialized by the remote ref compare-and-swap. No force, no lease.
  const pushed = git(context.root, ['push', remote, `HEAD:refs/heads/${canonicalBranch}`], { network: true });
  if (!pushed.ok) {
    return fail('SESSION_PUSH_REJECTED', `${pushed.stderr.trim().split('\n').pop() ?? ''} — origin advanced; reconcile and revalidate, never force-push`);
  }
  const refetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
  if (!refetched.ok) return fail('SESSION_FETCH_FAILED', 'push succeeded but verification fetch failed');
  const verified = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
  if (verified !== head) return fail('SESSION_INTEGRATION_UNVERIFIED', `${remote}/${canonicalBranch}=${verified ?? 'UNKNOWN'} != HEAD=${head}`);
  const file = sessionRecordPath(context.commonDir, context.worktreeName, context.policy);
  const existing = readRecordRaw(file);
  if (existing !== null) {
    try {
      writeRecordReplace(file, { ...existing, integrationState: 'INTEGRATED' });
    } catch {
      emit('SESSION_RECORD_UPDATE_SKIPPED', 'integration succeeded but the ownership record could not be updated');
    }
  }
  emit('SESSION_INTEGRATED', `${remote}/${canonicalBranch}=${head}`);
  return { pushed: true, head };
}

function commandRemove(context, options) {
  if (options.name === null) return fail('SESSION_NAME_REQUIRED', 'pass --name <session-worktree-name>');
  if (context.isLinked && context.worktreeName === options.name) {
    return fail('SESSION_SELF_REMOVAL_REFUSED', 'run remove from the canonical checkout');
  }
  const file = sessionRecordPath(context.commonDir, options.name, context.policy);
  const record = readRecordRaw(file);
  if (record !== null && holderIsLive(record)) {
    return fail('SESSION_REMOVE_REFUSED_LIVE_HOLDER', `session ${record.sessionId} is live; never delete another session's work`);
  }
  const gitdirFile = path.join(context.commonDir, 'worktrees', options.name, 'gitdir');
  let target = null;
  try {
    target = path.resolve(path.dirname(fs.readFileSync(gitdirFile, 'utf8').trim()));
  } catch {
    return fail('SESSION_WORKTREE_UNKNOWN', options.name);
  }
  const branch = record?.branch ?? gitValue(target, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
  const headSha = gitValue(target, ['rev-parse', 'HEAD']);
  const contained = remoteMain !== null && headSha !== null && git(context.root, ['merge-base', '--is-ancestor', headSha, remoteMain]).ok;
  if (!contained && !options.abandonUnmerged) {
    return fail('SESSION_REMOVE_REFUSED_UNMERGED', `${options.name} holds commits not contained in ${remote}/${canonicalBranch}; integrate first or pass --abandon-unmerged deliberately`);
  }
  const removed = git(context.root, ['worktree', 'remove', target]);
  if (!removed.ok) return fail('SESSION_WORKTREE_REMOVE_FAILED', removed.stderr.trim().split('\n').pop() ?? '');
  if (options.deleteBranch && typeof branch === 'string' && branch !== canonicalBranch) {
    const deleted = git(context.root, ['branch', contained ? '-d' : '-D', branch]);
    if (!deleted.ok) emit('SESSION_BRANCH_RETAINED', `${branch}: ${deleted.stderr.trim().split('\n').pop() ?? ''}`);
    else emit('SESSION_BRANCH_DELETED', branch);
  }
  emit('SESSION_WORKTREE_REMOVED', `${options.name} contained=${String(contained)}`);
  return { removed: true };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const COMMANDS = new Set(['status', 'check', 'start', 'claim', 'release', 'reconcile', 'integrate', 'remove']);

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: args[0] ?? 'status',
    root: process.cwd(),
    json: false,
    taskId: null,
    campaignId: null,
    role: 'IMPLEMENTATION',
    baseSha: null,
    anchorPid: null,
    directory: null,
    name: null,
    adopt: false,
    dryRun: false,
    offline: false,
    allowDrift: false,
    deleteBranch: false,
    abandonUnmerged: false,
  };
  if (!COMMANDS.has(options.command)) return { error: `UNKNOWN_COMMAND:${options.command}` };
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index];
    const next = () => {
      index += 1;
      return args[index];
    };
    if (value === '--json') options.json = true;
    else if (value === '--adopt') options.adopt = true;
    else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--offline') options.offline = true;
    else if (value === '--allow-drift') options.allowDrift = true;
    else if (value === '--delete-branch') options.deleteBranch = true;
    else if (value === '--abandon-unmerged') options.abandonUnmerged = true;
    else if (value === '--task') options.taskId = next() ?? null;
    else if (value === '--campaign') options.campaignId = next() ?? null;
    else if (value === '--role') options.role = next() ?? 'IMPLEMENTATION';
    else if (value === '--base') options.baseSha = next() ?? null;
    else if (value === '--pid') {
      const supplied = Number.parseInt(next() ?? '', 10);
      if (!Number.isInteger(supplied) || supplied <= 0) return { error: 'PID_INVALID' };
      options.anchorPid = supplied;
    }
    else if (value === '--dir') options.directory = next() ?? null;
    else if (value === '--name') options.name = next() ?? null;
    else if (value === '--root') options.root = next() ?? process.cwd();
    else return { error: `UNKNOWN_ARGUMENT:${value}` };
  }
  if (!['IMPLEMENTATION', 'MAINTENANCE'].includes(options.role)) return { error: `UNKNOWN_ROLE:${options.role}` };
  return { options };
}

function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.error !== undefined) {
    console.error(`[session] CONFIG_INVALID: ${parsed.error}`);
    process.exitCode = 2;
    return;
  }
  const options = parsed.options;
  const context = resolveContext(options.root);
  if (context === null) {
    console.error('[session] ERROR: SESSION_NOT_A_GIT_WORKTREE');
    process.exitCode = 1;
    return;
  }
  if (options.command === 'status' || options.command === 'check') commandStatus(context, options);
  else if (options.command === 'start') commandStart(context, options);
  else if (options.command === 'claim') commandClaim(context, options);
  else if (options.command === 'release') commandRelease(context);
  else if (options.command === 'reconcile') commandReconcile(context, options);
  else if (options.command === 'integrate') commandIntegrate(context, options);
  else if (options.command === 'remove') commandRemove(context, options);
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}

export { parseArgs, resolveContext, holderIsLive };
