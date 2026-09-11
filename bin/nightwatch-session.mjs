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
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

import {
  WORKSPACE_SESSION_SCHEMA,
  admitProspectiveWorktree,
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
  return { root: resolved, commonDir, gitDir, isLinked, worktreeName, policy: loadPolicy(resolved).policy };
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

// NW-06 test seam. Session creation is a multi-step mutation, so its rollback
// path can only be proven by failing after a step has already succeeded. The
// seam is deliberately narrow: exactly one environment variable, an exact
// allowlisted token, a loud announcement whenever it is active, and a hard
// CONFIG_INVALID for any other value — an unrecognised token never degrades
// into "no injection". It can only cause a start to fail and roll back; it
// grants no authority and reaches no other command.
const SESSION_FAULT_INJECTION_POINTS = new Set(['AFTER_WORKTREE_ADD', 'AFTER_RECORD_WRITE']);

function resolveFaultInjection(environment = process.env) {
  const raw = environment.NIGHTWATCH_SESSION_FAULT_INJECTION;
  if (raw === undefined || raw === '') return { point: null, invalid: null };
  if (!SESSION_FAULT_INJECTION_POINTS.has(raw)) return { point: null, invalid: raw };
  return { point: raw, invalid: null };
}

/**
 * Undo ONLY the registration this invocation just created, and only after
 * every identity claim is proven: the worktree resolves to the exact path we
 * created, it is on the exact branch we created, its HEAD is still the exact
 * base commit we created it at, its tree is clean, and the branch tip has not
 * moved. Any mismatch leaves everything untouched and reports a bounded
 * owner-action state, because a rollback that could delete an owner's work
 * would be worse than the partial state it repairs.
 */
function rollbackCreatedSession(context, { target, branch, baseSha }) {
  const steps = [];
  const observedTop = gitValue(target, ['rev-parse', '--show-toplevel']);
  if (observedTop === null || path.resolve(observedTop) !== path.resolve(target)) {
    return { complete: false, reason: 'ROLLBACK_REFUSED_PATH_UNPROVEN', steps };
  }
  if (gitValue(target, ['rev-parse', '--abbrev-ref', 'HEAD']) !== branch) {
    return { complete: false, reason: 'ROLLBACK_REFUSED_BRANCH_UNPROVEN', steps };
  }
  if (gitValue(target, ['rev-parse', 'HEAD']) !== baseSha) {
    return { complete: false, reason: 'ROLLBACK_REFUSED_HEAD_ADVANCED', steps };
  }
  const status = git(target, ['status', '--porcelain']);
  if (!status.ok) return { complete: false, reason: 'ROLLBACK_REFUSED_STATUS_UNKNOWN', steps };
  if (status.stdout.trim() !== '') return { complete: false, reason: 'ROLLBACK_REFUSED_WORKTREE_NOT_EMPTY', steps };
  const removed = git(context.root, ['worktree', 'remove', target]);
  if (!removed.ok) return { complete: false, reason: 'ROLLBACK_WORKTREE_REMOVE_FAILED', steps };
  steps.push('WORKTREE_REMOVED');
  const tip = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (tip === null) {
    steps.push('BRANCH_ABSENT');
    return { complete: true, reason: 'ROLLBACK_COMPLETE', steps };
  }
  // The branch was created at baseSha and start never commits, so an
  // unmoved tip proves the ref holds no work of its own.
  if (tip !== baseSha) return { complete: false, reason: 'ROLLBACK_BRANCH_RETAINED_TIP_MOVED', steps };
  const deleted = git(context.root, ['branch', '-D', branch]);
  if (!deleted.ok) return { complete: false, reason: 'ROLLBACK_BRANCH_DELETE_FAILED', steps };
  steps.push('BRANCH_DELETED');
  return { complete: true, reason: 'ROLLBACK_COMPLETE', steps };
}

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
  const fault = resolveFaultInjection();
  if (fault.invalid !== null) {
    return fail('SESSION_FAULT_INJECTION_INVALID', `NIGHTWATCH_SESSION_FAULT_INJECTION must be one of ${[...SESSION_FAULT_INJECTION_POINTS].join(', ')}`);
  }
  if (fault.point !== null) emit('SESSION_FAULT_INJECTION_ACTIVE', fault.point);
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
  // NW-06: admit the candidate registration against the same policy the
  // WORKSPACE_WORKTREE_METADATA invariant uses, BEFORE any mutation. Checking
  // the topology that already exists lets an at-the-bound start pass its own
  // precheck and then create the violation it was meant to prevent.
  const admission = admitProspectiveWorktree(pre, name, context.policy);
  if (!admission.admitted) {
    for (const refusal of admission.refusals) console.error(`[session] ${refusal.code}: ${refusal.detail}`);
    return fail(
      'SESSION_START_REFUSED_PROSPECTIVE_TOPOLOGY',
      `registered=${admission.registeredCount} prospective=${admission.prospectiveCount} max=${admission.maxWorktrees}; nothing was created`,
    );
  }
  const parent = options.directory ?? path.join(os.homedir(), '.nightwatch', 'worktrees');
  const target = path.join(parent, name);
  if (fs.existsSync(target)) return fail('SESSION_WORKTREE_PATH_OCCUPIED', name);
  // Proven absent before creation, so a rollback can never delete a branch
  // this invocation did not create.
  if (gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]) !== null) {
    return fail('SESSION_BRANCH_ALREADY_EXISTS', branch);
  }
  fs.mkdirSync(parent, { recursive: true });
  const added = git(context.root, ['worktree', 'add', '-b', branch, target, baseSha]);
  if (!added.ok) return fail('SESSION_WORKTREE_ADD_FAILED', added.stderr.trim().split('\n').pop() ?? '');

  // Past this point the workspace holds a partial creation, so every failure
  // path rolls it back rather than returning and leaving it registered.
  const abort = (code, detail) => {
    const rollback = rollbackCreatedSession(context, { target, branch, baseSha });
    if (rollback.complete) {
      emit('SESSION_START_ROLLED_BACK', `${rollback.reason} steps=${rollback.steps.join(',') || 'NONE'}`);
    } else {
      console.error(`[session] SESSION_START_ROLLBACK_INCOMPLETE: ${rollback.reason}; worktree ${name} and branch ${branch} need owner action`);
    }
    return fail(code, detail);
  };

  if (fault.point === 'AFTER_WORKTREE_ADD') return abort('SESSION_FAULT_INJECTED', 'AFTER_WORKTREE_ADD');
  const created = resolveContext(target);
  if (created === null) return abort('SESSION_WORKTREE_UNRESOLVED', name);
  const record = buildRecord({ taskId: options.taskId, campaignId: options.campaignId, role: options.role, branch, baseSha });
  // The creating process is not the owning agent; ownership starts released so
  // the agent that will actually write must claim it explicitly.
  record.ownershipState = 'RELEASED';
  record.holder = null;
  try {
    writeRecordExclusive(sessionRecordPath(created.commonDir, created.worktreeName, created.policy), record);
  } catch (error) {
    return abort('SESSION_RECORD_WRITE_FAILED', String(error?.code ?? 'UNKNOWN'));
  }
  if (fault.point === 'AFTER_RECORD_WRITE') return abort('SESSION_FAULT_INJECTED', 'AFTER_RECORD_WRITE');

  // Verify the registration the owner is about to be handed, against the same
  // model, rather than trusting that three successful steps composed. A
  // released-but-unclaimed session is STALE_SESSION by design: that is the
  // state `claim --adopt` consumes.
  const post = inspectWorkspace({ root: context.root });
  const registered = (post.worktrees ?? []).find((worktree) => worktree.name === name) ?? null;
  if (registered === null) return abort('SESSION_START_UNVERIFIED', `${name} is not registered after creation`);
  if ((registered.recordProblems ?? []).length > 0) {
    return abort('SESSION_START_RECORD_INVALID', registered.recordProblems.join(','));
  }
  if (registered.class !== 'STALE_SESSION') {
    return abort('SESSION_START_CLASS_UNEXPECTED', `${name} classified ${registered.class}: ${registered.classReason ?? 'no reason'}`);
  }
  const maxWorktrees = context.policy?.worktreePolicy?.maxWorktrees ?? 8;
  if ((post.worktrees ?? []).length > maxWorktrees) {
    return abort('SESSION_START_CAPACITY_VIOLATED', `${(post.worktrees ?? []).length} registered worktrees exceeds the ${maxWorktrees} bound`);
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

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch-session',
  entry: 'bin/nightwatch-session.mjs',
  purpose: 'Manage the C-00 session worktree lifecycle and fast-forward integration.',
  group: 'manage-sessions',
  commands: [
    { name: 'status', summary: 'report the workspace and session topology' },
    { name: 'check', summary: 'report topology and fail closed on an unsafe invariant' },
    { name: 'start', summary: 'create one owned session worktree and branch' },
    { name: 'claim', summary: 'claim or adopt an existing session worktree' },
    { name: 'release', summary: 'release this session ownership record' },
    { name: 'reconcile', summary: 'reconcile a stale session base' },
    { name: 'integrate', summary: 'fast-forward push the session to main' },
    { name: 'remove', summary: 'remove an owned session worktree and branch' },
  ],
  defaultCommand: 'status',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
    { name: '--adopt', shape: 'boolean', summary: 'adopt a stale session worktree deliberately' },
    { name: '--dry-run', shape: 'boolean', summary: 'report the planned action without mutating' },
    { name: '--offline', shape: 'boolean', summary: 'resolve remote state without contacting the remote' },
    { name: '--allow-drift', shape: 'boolean', summary: 'tolerate a pre-existing topology violation' },
    { name: '--delete-branch', shape: 'boolean', summary: 'delete the session branch on remove' },
    { name: '--abandon-unmerged', shape: 'boolean', summary: 'remove an unmerged worktree deliberately' },
    { name: '--task', shape: 'string', summary: 'task id owning the session' },
    { name: '--campaign', shape: 'string', summary: 'campaign id owning the session' },
    { name: '--role', shape: 'enum', values: ['IMPLEMENTATION', 'MAINTENANCE'], summary: 'session role' },
    { name: '--base', shape: 'string', summary: 'explicit base SHA' },
    { name: '--pid', shape: 'integer', summary: 'anchor process id for liveness' },
    { name: '--dir', shape: 'path', summary: 'explicit session worktree directory' },
    { name: '--name', shape: 'string', summary: 'session worktree name' },
    { name: '--root', shape: 'path', summary: 'repository root' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['$HOME/.nightwatch/worktrees/<name> session worktrees'],
};

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
  const cli = defineOperatorCli(CLI_METADATA);
  if (cli.stop) return;
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

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'nightwatch-session.mjs') {
  main();
}

export { parseArgs, resolveContext, holderIsLive, resolveFaultInjection, rollbackCreatedSession };
