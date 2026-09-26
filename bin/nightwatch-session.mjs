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
//
// NW-AUD-006 (nightwatch-session-mutation-authority-binding-v1): every
// mutating command derives its authority ONLY from the Git top-level that
// contains the process current directory, requires the executing CLI file to
// resolve inside that same worktree, requires explicit public
// session/HEAD expectations, admits continuity coherence, serializes
// ownership-record transitions with a bounded lock and a canonical revision
// compare-and-swap, and admits integration authority before any network
// callback. Read-only `status`/`check` keep explicit cross-root inspection.
//
// Threat boundary: expectations and revisions are PUBLIC freshness/intent
// values, not authentication secrets. This is cooperative confused-deputy
// protection for agents sharing one OS account; it is not cryptographic
// isolation from a hostile same-user process.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import {
  SESSION_COMMAND_AUTHORITY,
  SESSION_LOCK_SCHEMA,
  admitCheckoutRole,
  admitContinuity,
  admitExpectations,
  admitInvocationBinding,
  admitLockRecovery,
  isSessionId,
  parseExpectation,
  recordRevision,
} from './lib/session-authority.mjs';
import { normalizeTaskStatus } from './agent-continuity-protocol.mjs';

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
const CONTINUITY_MAX_BYTES = 512 * 1024;
const TRANSITION_LOCK_MAX_BYTES = 4096;

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

/**
 * Report one step of a dry-run plan.
 *
 * A plan line is deliberately distinguishable from a real outcome line: a
 * reader (or a test) must never mistake `SESSION_START_PLAN` for
 * `SESSION_WORKTREE_CREATED`. Every dry run ends with exactly one
 * `SESSION_DRY_RUN_NO_MUTATION` line naming the command, which is the
 * machine-checkable claim that nothing was written.
 */
function plan(code, detail) {
  console.log(detail === undefined ? `[session] PLAN ${code}` : `[session] PLAN ${code}: ${detail}`);
}

function dryRunComplete(command, nextCommand) {
  if (nextCommand !== undefined) plan('SESSION_NEXT_COMMAND', nextCommand);
  emit('SESSION_DRY_RUN_NO_MUTATION', command);
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
// invocation authority (NW-AUD-006)
// ---------------------------------------------------------------------------

/**
 * Resolve the invoking authority context. Every mutator uses this: the root is
 * ALWAYS the Git top-level containing `process.cwd()`, and the executing CLI
 * file must resolve inside that same exact real worktree. `--root` is
 * deliberately not consulted here; the parser refuses it for mutators before
 * this function is reached.
 */
function resolveInvocationContext() {
  const toplevel = gitValue(process.cwd(), ['rev-parse', '--show-toplevel']);
  if (toplevel === null) return { error: 'SESSION_NOT_A_GIT_WORKTREE' };
  const root = path.resolve(toplevel);
  let topReal;
  let cwdReal;
  let scriptReal;
  try {
    topReal = fs.realpathSync(root);
    cwdReal = fs.realpathSync(process.cwd());
    scriptReal = fs.realpathSync(process.argv[1]);
  } catch {
    return { error: 'SESSION_INVOCATION_UNRESOLVED', detail: 'the checkout, current directory or CLI path could not be resolved' };
  }
  const binding = admitInvocationBinding({ currentTopRealPath: topReal, scriptRealPath: scriptReal, cwdRealPath: cwdReal });
  if (!binding.ok) return { error: binding.code, detail: binding.detail };
  const context = resolveContext(root);
  if (context === null) return { error: 'SESSION_NOT_A_GIT_WORKTREE' };
  return { context };
}

function currentRecordFile(context) {
  return sessionRecordPath(context.commonDir, context.worktreeName, context.policy);
}

function readBoundedText(file, maxBytes) {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    if (stat.size > maxBytes) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function currentBranchOf(context) {
  const branch = gitValue(context.root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return branch === 'HEAD' ? null : branch;
}

/**
 * Admit active-task/STATE continuity for commands that bind the live campaign.
 * `worktreeName` is the registered linked worktree name, or `canonical`.
 */
function admitCommandContinuity(context, record, command) {
  const taskId = typeof record?.taskId === 'string' ? record.taskId : null;
  const activeTaskText = readBoundedText(path.join(context.root, '.agent', 'ACTIVE_TASK.md'), CONTINUITY_MAX_BYTES);
  const stateText = taskId === null || !/^[a-z0-9][a-z0-9._-]*$/.test(taskId)
    ? null
    : readBoundedText(path.join(context.root, '.agent', 'tasks', taskId, 'STATE.md'), CONTINUITY_MAX_BYTES);
  const branch = currentBranchOf(context) ?? '';
  return admitContinuity({
    command,
    record,
    // The routing directive names the session BRANCH; the registered worktree
    // name is a different identity and must never be substituted for it.
    worktreeName: branch === '' ? (context.worktreeName ?? 'canonical') : branch,
    currentBranch: branch,
    canonicalBranch: context.policy?.canonical?.branch ?? 'main',
    activeTaskText,
    stateText,
    normalizeStatus: normalizeTaskStatus,
  });
}

// ---------------------------------------------------------------------------
// ownership-record transition primitives (NW-AUD-006)
// ---------------------------------------------------------------------------

function transitionLockPath(recordFile) {
  return `${recordFile}.lock`;
}

/**
 * Inspect a transition lock without ever following a symlink. Returns
 * `{ state: 'ABSENT' | 'PRESENT' | 'MALFORMED' | 'IRREGULAR' | 'UNREADABLE' | 'OVERSIZED', lock?, bytes? }`.
 */
function readTransitionLock(recordFile) {
  const file = transitionLockPath(recordFile);
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    return { state: error?.code === 'ENOENT' ? 'ABSENT' : 'UNREADABLE', file };
  }
  if (stat.isSymbolicLink() || !stat.isFile()) return { state: 'IRREGULAR', file };
  if (stat.size > TRANSITION_LOCK_MAX_BYTES) return { state: 'OVERSIZED', file };
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { state: 'UNREADABLE', file };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: 'MALFORMED', file, bytes: text };
  }
  if (parsed === null || typeof parsed !== 'object' || parsed.schemaVersion !== SESSION_LOCK_SCHEMA) {
    return { state: 'MALFORMED', file, bytes: text };
  }
  return { state: 'PRESENT', file, lock: parsed, bytes: text };
}

function acquireTransitionLock(recordFile, { command, sessionId }) {
  const observed = readTransitionLock(recordFile);
  if (observed.state !== 'ABSENT') {
    return { ok: false, code: observed.state === 'PRESENT' ? 'SESSION_TRANSITION_LOCKED' : 'SESSION_TRANSITION_LOCK_INVALID', detail: `lock state=${observed.state}; run recover --dry-run for the exact identity` };
  }
  const lock = {
    schemaVersion: SESSION_LOCK_SCHEMA,
    command,
    sessionId: sessionId ?? 'UNBOUND',
    bootDigest: bootDigest(),
    pid: process.pid,
    startedAtIso: new Date().toISOString(),
    operationId: crypto.randomBytes(8).toString('hex'),
  };
  fs.mkdirSync(path.dirname(recordFile), { recursive: true });
  try {
    fs.writeFileSync(transitionLockPath(recordFile), `${JSON.stringify(lock, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error?.code === 'EEXIST') return { ok: false, code: 'SESSION_TRANSITION_LOCKED', detail: 'a competing transition lock exists' };
    return { ok: false, code: 'SESSION_TRANSITION_LOCK_FAILED', detail: String(error?.code ?? 'UNKNOWN') };
  }
  return { ok: true, file: transitionLockPath(recordFile), lock };
}

function releaseTransitionLock(handle) {
  if (handle === null || handle === undefined) return;
  try {
    const observed = readTransitionLock(handle.file.replace(/\.lock$/, ''));
    if (observed.state === 'PRESENT' && observed.lock.operationId === handle.lock.operationId) fs.unlinkSync(observed.file);
  } catch {
    // A missing or already-replaced lock is not this invocation's to remove.
  }
}

/** Read the ownership record with bounded, symlink-refusing semantics. */
function readRecordDocument(file, policy) {
  const maxBytes = policy?.worktreePolicy?.maxRecordBytes ?? 4096;
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    return { state: error?.code === 'ENOENT' ? 'ABSENT' : 'UNREADABLE' };
  }
  if (stat.isSymbolicLink()) return { state: 'SYMLINK' };
  if (!stat.isFile()) return { state: 'IRREGULAR' };
  if (stat.size > maxBytes) return { state: 'OVERSIZED' };
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { state: 'UNREADABLE' };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: 'MALFORMED', bytes: text };
  }
  return { state: 'PRESENT', parsed, revision: recordRevision(parsed) };
}

/**
 * Publish a replacement ownership record durably: same-directory temporary
 * file, fsync, rename, directory fsync, reread verification. Any failure past
 * the rename is reported as UNCERTAIN rather than as a silent success.
 */
function publishRecordDurable(recordFile, record, policy) {
  const payload = `${JSON.stringify(record, null, 2)}\n`;
  const temporary = `${recordFile}.next-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  let handle;
  try {
    handle = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(handle, payload, 'utf8');
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temporary, recordFile);
    const directory = fs.openSync(path.dirname(recordFile), 'r');
    try {
      fs.fsyncSync(directory);
    } finally {
      fs.closeSync(directory);
    }
  } catch (error) {
    if (handle !== undefined) {
      try { fs.closeSync(handle); } catch { /* best effort */ }
    }
    try { fs.rmSync(temporary, { force: true }); } catch { /* best effort */ }
    return { ok: false, code: 'SESSION_RECORD_WRITE_UNCERTAIN', detail: String(error?.code ?? 'UNKNOWN') };
  }
  const reread = readRecordDocument(recordFile, policy);
  if (reread.state !== 'PRESENT') {
    return { ok: false, code: 'SESSION_RECORD_WRITE_UNCERTAIN', detail: `reread=${reread.state}` };
  }
  if (recordRevision(reread.parsed) !== recordRevision(record)) {
    return { ok: false, code: 'SESSION_RECORD_WRITE_UNCERTAIN', detail: 'reread content differs from the published record' };
  }
  return { ok: true };
}

/**
 * Run `body` while holding the transition lock for one ownership record. The
 * lock is released in a finally; a lock conflict or invalid lock refuses
 * before any effect.
 */
function withTransitionLock(recordFile, options, body) {
  const acquired = acquireTransitionLock(recordFile, options);
  if (!acquired.ok) return acquired;
  try {
    return body(acquired);
  } finally {
    releaseTransitionLock(acquired);
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
const SESSION_FAULT_INJECTION_POINTS = new Set(['AFTER_WORKTREE_ADD', 'AFTER_RECORD_WRITE', 'AFTER_INTEGRATION_VERIFY']);

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
  const roleAdmission = admitCheckoutRole({
    authority: SESSION_COMMAND_AUTHORITY.claim,
    isLinked: context.isLinked,
    worktreeCount: 1,
    role: options.role,
  });
  if (!roleAdmission.ok) return fail(roleAdmission.code, roleAdmission.detail);
  const branch = currentBranchOf(context);
  if (branch === null) return fail('SESSION_DETACHED_HEAD', 'a session requires a named branch');
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
  const file = currentRecordFile(context);
  const existing = readRecordDocument(file, context.policy);
  if (existing.state !== 'PRESENT' && existing.state !== 'ABSENT') {
    return fail('SESSION_RECORD_UNREADABLE', `the existing ownership record is ${existing.state}; inspect the worktree before claiming`);
  }
  if (existing.state === 'PRESENT') {
    if (holderIsLive(existing.parsed)) {
      return fail('SESSION_ALREADY_OWNED', `worktree already owned by task ${existing.parsed.taskId} (session ${existing.parsed.sessionId})`);
    }
    if (!options.adopt) {
      return fail('SESSION_OWNER_STALE', `worktree holds a non-live claim for task ${existing.parsed.taskId}; re-run with --adopt to take ownership without deleting work`);
    }
  }
  const record = buildRecord({ taskId: options.taskId, campaignId: options.campaignId, role: options.role, branch, baseSha, anchorPid: options.anchorPid });
  const admission = admitExpectations({
    authority: SESSION_COMMAND_AUTHORITY.claim,
    record: existing.state === 'PRESENT' ? existing.parsed : null,
    head: null,
    expectSession: options.expectSession,
    expectHead: null,
    adopting: options.adopt === true && existing.state === 'PRESENT',
  });
  if (!admission.ok) return fail(admission.code, admission.detail);
  if (options.dryRun) {
    plan('SESSION_CLAIM_PLAN', `task=${record.taskId} role=${record.role} branch=${branch} base=${baseSha}`);
    plan('SESSION_CLAIM_RECORD', `${existing.state === 'ABSENT' ? 'CREATE' : 'REPLACE'} ${file}${existing.state === 'ABSENT' ? '' : ` (adopting stale claim for task ${existing.parsed.taskId})`}`);
    dryRunComplete('claim');
    return { claimed: false, dryRun: true, record };
  }
  const transition = withTransitionLock(file, { command: 'claim', sessionId: record.sessionId }, () => {
    const current = readRecordDocument(file, context.policy);
    if (current.state === 'PRESENT' && holderIsLive(current.parsed)) {
      return { ok: false, code: 'SESSION_ALREADY_OWNED', detail: 'a competing claim won while this command held the transition lock' };
    }
    if (current.state === 'ABSENT') {
      try {
        writeRecordExclusive(file, record);
      } catch (error) {
        if (error?.code === 'EEXIST') return { ok: false, code: 'SESSION_ALREADY_OWNED', detail: 'a concurrent claim won the exclusive create' };
        return { ok: false, code: 'SESSION_RECORD_WRITE_FAILED', detail: String(error?.code ?? 'UNKNOWN') };
      }
      return { ok: true, record };
    }
    if (current.state !== 'PRESENT' || current.revision !== existing.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed while this command held the transition lock' };
    }
    const published = publishRecordDurable(file, record, context.policy);
    if (!published.ok) return published;
    return { ok: true, record };
  });
  if (transition.ok !== true) return fail(transition.code, transition.detail);
  emit('SESSION_CLAIMED', `task=${record.taskId} session=${record.sessionId} branch=${branch} base=${baseSha}`);
  emit('SESSION_NEXT_ACTION', `node bin/nightwatch-session.mjs release --expect-session ${record.sessionId}`);
  return record;
}

function commandStart(context, options) {
  if (options.taskId === null) return fail('SESSION_TASK_ID_REQUIRED', 'pass --task <task-id>');
  const roleAdmission = admitCheckoutRole({
    authority: SESSION_COMMAND_AUTHORITY.start,
    isLinked: context.isLinked,
    worktreeCount: 1,
    role: options.role,
  });
  if (!roleAdmission.ok) return fail(roleAdmission.code, roleAdmission.detail);
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
  // An EXPLICIT --base was previously taken on trust and only discovered to be
  // bogus when `git worktree add` failed -- after the parent directory had
  // been created. Verifying it here makes the real start fail before its first
  // mutation, and makes a dry run's "this start could proceed" answer true
  // rather than merely untested.
  if (gitValue(context.root, ['rev-parse', '--verify', '--quiet', `${baseSha}^{commit}`]) === null) {
    return fail('SESSION_BASE_INVALID', `${baseSha} does not resolve to a commit in this repository`);
  }
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
  // The last instruction boundary at which this invocation has mutated
  // NOTHING, and the first at which the whole plan is known. Every refusal
  // above -- unsafe workspace, unresolved base, capacity, occupied path,
  // existing branch, invalid fault token -- has already been evaluated, so a
  // dry run answers "could the real start proceed?" without creating the
  // directory, the branch, the worktree or the ownership record.
  if (options.dryRun) {
    plan('SESSION_START_PLAN', `task=${options.taskId} base=${baseSha} parent=${parent}`);
    // The candidate name carries 4 random bytes, so a later real start will
    // choose a DIFFERENT name. Saying so keeps the report honest rather than
    // implying a reservation this command did not make.
    plan('SESSION_START_CANDIDATE', `candidateName=${name} candidateBranch=${branch} candidatePath=${target} (candidate only; a real start draws a fresh suffix)`);
    plan('SESSION_START_CAPACITY', `registered=${admission.registeredCount} prospective=${admission.prospectiveCount} max=${admission.maxWorktrees} admitted=true`);
    dryRunComplete('start', `node bin/nightwatch-session.mjs start --task ${options.taskId}`);
    return { created: false, dryRun: true, baseSha, candidateName: name, candidateBranch: branch, candidatePath: target };
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
  // The copy-safe next command carries the public predecessor session ID, so
  // adoption is bound to the exact record this start created.
  emit('SESSION_NEXT_ACTION', `cd ${target} && node bin/nightwatch-session.mjs claim --task ${options.taskId} --adopt --expect-session ${record.sessionId}`);
  return record;
}

function commandRelease(context, options) {
  const authority = SESSION_COMMAND_AUTHORITY.release;
  const file = currentRecordFile(context);
  const observed = readRecordDocument(file, context.policy);
  if (observed.state !== 'PRESENT') {
    return fail(observed.state === 'ABSENT' ? 'SESSION_RECORD_ABSENT' : 'SESSION_RECORD_UNREADABLE', `the ownership record is ${observed.state}`);
  }
  const admission = admitExpectations({ authority, record: observed.parsed, head: null, expectSession: options.expectSession, expectHead: null, adopting: false });
  if (!admission.ok) return fail(admission.code, admission.detail);
  const continuity = admitCommandContinuity(context, observed.parsed, 'release');
  if (!continuity.ok) return fail(continuity.code, continuity.detail);
  const updated = { ...observed.parsed, ownershipState: 'RELEASED', holder: null };
  if (options.dryRun) {
    plan('SESSION_RELEASE_PLAN', `task=${observed.parsed.taskId} session=${observed.parsed.sessionId} ownershipState=${observed.parsed.ownershipState} -> RELEASED`);
    plan('SESSION_RELEASE_RECORD', `REPLACE ${file}`);
    dryRunComplete('release');
    return { released: false, dryRun: true, record: updated };
  }
  const transition = withTransitionLock(file, { command: 'release', sessionId: observed.parsed.sessionId }, () => {
    const current = readRecordDocument(file, context.policy);
    if (current.state !== 'PRESENT') return { ok: false, code: 'SESSION_RECORD_ABSENT', detail: `the ownership record became ${current.state}` };
    if (current.revision !== observed.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed during release; nothing was published' };
    }
    const published = publishRecordDurable(file, { ...current.parsed, ownershipState: 'RELEASED', holder: null }, context.policy);
    if (!published.ok) return published;
    return { ok: true, record: { ...current.parsed, ownershipState: 'RELEASED', holder: null } };
  });
  if (transition.ok !== true) return fail(transition.code, transition.detail);
  emit('SESSION_RELEASED', `task=${observed.parsed.taskId} session=${observed.parsed.sessionId}`);
  if (context.worktreeName !== null) {
    emit('SESSION_NEXT_ACTION', `node bin/nightwatch-session.mjs remove --name ${context.worktreeName} --expect-session ${observed.parsed.sessionId} --delete-branch   # from the canonical checkout`);
  }
  return transition.record;
}

function commandReconcile(context, options) {
  const authority = SESSION_COMMAND_AUTHORITY.reconcile;
  const file = currentRecordFile(context);
  const observed = readRecordDocument(file, context.policy);
  if (observed.state !== 'PRESENT') {
    return fail(observed.state === 'ABSENT' ? 'SESSION_RECORD_ABSENT' : 'SESSION_RECORD_UNREADABLE', `the ownership record is ${observed.state}`);
  }
  const admission = admitExpectations({ authority, record: observed.parsed, head: null, expectSession: options.expectSession, expectHead: null, adopting: false });
  if (!admission.ok) return fail(admission.code, admission.detail);
  const continuity = admitCommandContinuity(context, observed.parsed, 'reconcile');
  if (!continuity.ok) return fail(continuity.code, continuity.detail);
  const report = inspectWorkspace({ root: context.root });
  if (report.self?.class !== 'OWNED_SESSION') return fail('SESSION_NOT_OWNED', 'reconcile runs inside an owned session worktree');
  if (report.self.clean === false) return fail('SESSION_WORKTREE_DIRTY', 'commit or set aside your own changes before reconciling');
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  // A fetch WRITES the remote-tracking refs, so it is a mutation and a dry
  // run must not perform one. The plan is therefore computed against the
  // remote-tracking ref as it stands, and says so: a real reconcile may see a
  // newer tip.
  if (options.dryRun) {
    const localRemoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
    if (localRemoteMain === null) return fail('SESSION_REMOTE_MAIN_UNKNOWN');
    const head = gitValue(context.root, ['rev-parse', 'HEAD']);
    const contains = git(context.root, ['merge-base', '--is-ancestor', localRemoteMain, 'HEAD']).ok;
    plan('SESSION_RECONCILE_PLAN', `head=${head ?? 'UNKNOWN'} ${remote}/${canonicalBranch}=${localRemoteMain} (local tracking ref; no fetch performed)`);
    plan(contains ? 'SESSION_RECONCILE_NOT_REQUIRED' : 'SESSION_RECONCILE_WOULD_MERGE', contains
      ? 'HEAD already contains the canonical tip'
      : `merge --no-ff ${remote}/${canonicalBranch} into HEAD, then re-run the full validation`);
    if (!options.offline) plan('SESSION_RECONCILE_WOULD_FETCH', `${remote} ${canonicalBranch}`);
    dryRunComplete('reconcile');
    return { merged: false, dryRun: true };
  }
  // The transition lock is held across the fetch and merge: the record must
  // stay exactly as admitted until the reconciliation outcome is known.
  const transition = withTransitionLock(file, { command: 'reconcile', sessionId: observed.parsed.sessionId }, () => {
    const current = readRecordDocument(file, context.policy);
    if (current.state !== 'PRESENT') return { ok: false, code: 'SESSION_RECORD_ABSENT', detail: `the ownership record became ${current.state}` };
    if (current.revision !== observed.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed during reconcile; nothing was merged' };
    }
    if (!options.offline) {
      const fetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
      if (!fetched.ok) return { ok: false, code: 'SESSION_FETCH_FAILED', detail: 'the fetch failed; no merge was attempted' };
    }
    const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
    if (remoteMain === null) return { ok: false, code: 'SESSION_REMOTE_MAIN_UNKNOWN' };
    if (git(context.root, ['merge-base', '--is-ancestor', remoteMain, 'HEAD']).ok) {
      emit('SESSION_ALREADY_CONTAINS_CANONICAL', remoteMain);
      return { ok: true, merged: false };
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
        return { ok: false, code: 'SESSION_RECONCILE_CONFLICT', detail: 'the merge was aborted; resolve deliberately and re-validate — nothing was rewritten' };
      }
      return { ok: false, code: 'SESSION_RECONCILE_FAILED', detail: 'the merge failed and was aborted; nothing was rewritten' };
    }
    const verified = readRecordDocument(file, context.policy);
    if (verified.state !== 'PRESENT' || verified.revision !== observed.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed during the merge; re-validate before continuing' };
    }
    emit('SESSION_RECONCILED', `merged ${remote}/${canonicalBranch}=${remoteMain}; re-run the full validation before integrating`);
    return { ok: true, merged: true };
  });
  if (transition.ok !== true) return fail(transition.code, transition.detail);
  return transition;
}

function commandIntegrate(context, options) {
  const authority = SESSION_COMMAND_AUTHORITY.integrate;
  const fault = resolveFaultInjection();
  if (fault.invalid !== null) {
    return fail('SESSION_FAULT_INJECTION_INVALID', `NIGHTWATCH_SESSION_FAULT_INJECTION must be one of ${[...SESSION_FAULT_INJECTION_POINTS].join(', ')}`);
  }
  const roleAdmission = admitCheckoutRole({ authority, isLinked: context.isLinked, worktreeCount: 1, role: 'IMPLEMENTATION' });
  if (!roleAdmission.ok) return fail(roleAdmission.code, roleAdmission.detail);
  const file = currentRecordFile(context);
  const observed = readRecordDocument(file, context.policy);
  if (observed.state !== 'PRESENT') {
    return fail(observed.state === 'ABSENT' ? 'SESSION_RECORD_ABSENT' : 'SESSION_RECORD_UNREADABLE', `the ownership record is ${observed.state}`);
  }
  const head = gitValue(context.root, ['rev-parse', 'HEAD']);
  const admission = admitExpectations({ authority, record: observed.parsed, head, expectSession: options.expectSession, expectHead: options.expectHead, adopting: false });
  if (!admission.ok) return fail(admission.code, admission.detail);
  const continuity = admitCommandContinuity(context, observed.parsed, 'integrate');
  if (!continuity.ok) return fail(continuity.code, continuity.detail);
  const currentBranch = currentBranchOf(context);
  if (currentBranch === null || observed.parsed.branch !== currentBranch) {
    return fail('SESSION_CONTINUITY_MISMATCH', 'the ownership record branch does not match the current session branch');
  }
  const report = inspectWorkspace({ root: context.root });
  if (report.verdict === 'FAIL') {
    console.error(renderText(report));
    return fail('SESSION_INTEGRATION_REFUSED_UNSAFE_WORKSPACE');
  }
  if (report.self?.class !== 'OWNED_SESSION') return fail('SESSION_NOT_OWNED', 'integration runs inside an owned session worktree');
  if (report.self.clean === false) return fail('SESSION_WORKTREE_DIRTY');
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  // The dry run sits ABOVE the fetch and holds no transition lock: it is the
  // zero-mutation report the flag promises. Admission has already run.
  if (options.dryRun) {
    const localRemoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
    const localHead = gitValue(context.root, ['rev-parse', 'HEAD']);
    if (localRemoteMain === null || localHead === null) return fail('SESSION_REMOTE_MAIN_UNKNOWN');
    plan('SESSION_INTEGRATE_PLAN', `head=${localHead} ${remote}/${canonicalBranch}=${localRemoteMain} (local tracking ref; no fetch performed)`);
    if (localRemoteMain === localHead) {
      plan('SESSION_ALREADY_INTEGRATED', localHead);
    } else if (!git(context.root, ['merge-base', '--is-ancestor', localRemoteMain, 'HEAD']).ok) {
      plan('SESSION_INTEGRATION_NOT_FAST_FORWARD', `${remote}/${canonicalBranch}=${localRemoteMain} is not contained in HEAD; reconcile and revalidate first`);
    } else {
      plan('SESSION_INTEGRATION_READY', `fast-forward ${localRemoteMain} -> ${localHead}`);
    }
    dryRunComplete('integrate');
    return { pushed: false, dryRun: true, head: localHead };
  }
  // The transition lock is held through fetch, fast-forward recheck, push,
  // verification fetch and the durable record update. No other lifecycle
  // command may transition this record while the network effects are pending.
  const transition = withTransitionLock(file, { command: 'integrate', sessionId: observed.parsed.sessionId }, () => {
    const current = readRecordDocument(file, context.policy);
    if (current.state !== 'PRESENT') return { ok: false, code: 'SESSION_RECORD_ABSENT', detail: `the ownership record became ${current.state}` };
    if (current.revision !== observed.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed during admission; nothing was fetched or pushed' };
    }
    if (!options.offline) {
      const fetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
      if (!fetched.ok) return { ok: false, code: 'SESSION_FETCH_FAILED', detail: 'the fetch failed; no push was attempted' };
    }
    const headNow = gitValue(context.root, ['rev-parse', 'HEAD']);
    if (headNow !== options.expectHead) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'HEAD advanced after admission; prepare a fresh integration intent' };
    }
    const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
    if (remoteMain === null) return { ok: false, code: 'SESSION_REMOTE_MAIN_UNKNOWN' };
    const finalizeRecord = () => {
      const published = publishRecordDurable(file, { ...current.parsed, integrationState: 'INTEGRATED' }, context.policy);
      if (!published.ok) {
        return { ok: false, code: 'SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN', detail: `${published.code}:${published.detail ?? 'UNKNOWN'}; remote state is verified — do not re-push, inspect with status` };
      }
      return { ok: true };
    };
    if (remoteMain === headNow) {
      emit('SESSION_ALREADY_INTEGRATED', headNow);
      const finalized = finalizeRecord();
      if (!finalized.ok) return finalized;
      return { ok: true, pushed: false, head: headNow };
    }
    if (!git(context.root, ['merge-base', '--is-ancestor', remoteMain, 'HEAD']).ok) {
      return { ok: false, code: 'SESSION_INTEGRATION_NOT_FAST_FORWARD', detail: `${remote}/${canonicalBranch} is not contained in HEAD; run reconcile, revalidate, then integrate — never force-push` };
    }
    // Serialized by the remote ref compare-and-swap. No force, no lease.
    const pushed = git(context.root, ['push', remote, `HEAD:refs/heads/${canonicalBranch}`], { network: true });
    if (!pushed.ok) {
      return { ok: false, code: 'SESSION_PUSH_REJECTED', detail: `${remote}/${canonicalBranch} advanced or rejected the push; reconcile and revalidate, never force-push` };
    }
    const refetched = git(context.root, ['fetch', remote, canonicalBranch], { network: true });
    if (!refetched.ok) return { ok: false, code: 'SESSION_INTEGRATION_UNVERIFIED', detail: 'the push succeeded but the verification fetch failed' };
    const verified = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
    if (verified !== headNow) return { ok: false, code: 'SESSION_INTEGRATION_UNVERIFIED', detail: `${remote}/${canonicalBranch} did not verify at the pushed HEAD` };
    // Test-only seam: prove the uncertain-outcome contract without fabricating
    // a filesystem failure. It fires only after the remote effect is verified,
    // so the remote state is real and the local record stays truthfully stale.
    if (fault.point === 'AFTER_INTEGRATION_VERIFY') {
      emit('SESSION_FAULT_INJECTION_ACTIVE', fault.point);
      return { ok: false, code: 'SESSION_INTEGRATION_REMOTE_SUCCEEDED_LOCAL_RECORD_UNCERTAIN', detail: 'fault injection AFTER_INTEGRATION_VERIFY: remote verified, local record not updated' };
    }
    const finalized = finalizeRecord();
    if (!finalized.ok) return finalized;
    emit('SESSION_INTEGRATED', `${remote}/${canonicalBranch}=${headNow}`);
    return { ok: true, pushed: true, head: headNow };
  });
  if (transition.ok !== true) return fail(transition.code, transition.detail);
  return transition;
}

function commandRemove(context, options) {
  const authority = SESSION_COMMAND_AUTHORITY.remove;
  const roleAdmission = admitCheckoutRole({ authority, isLinked: context.isLinked, worktreeCount: 1, role: options.role });
  if (!roleAdmission.ok) return fail(roleAdmission.code, roleAdmission.detail);
  if (options.name === null) return fail('SESSION_NAME_REQUIRED', 'pass --name <session-worktree-name>');
  const file = sessionRecordPath(context.commonDir, options.name, context.policy);
  const observed = readRecordDocument(file, context.policy);
  if (observed.state !== 'PRESENT') {
    return fail('SESSION_RECORD_ABSENT', `no valid ownership record exists for ${options.name} (${observed.state})`);
  }
  if (holderIsLive(observed.parsed)) {
    return fail('SESSION_REMOVE_REFUSED_LIVE_HOLDER', `session ${observed.parsed.sessionId} is live; never delete another session's work`);
  }
  const admission = admitExpectations({ authority, record: observed.parsed, head: null, expectSession: options.expectSession, expectHead: null, adopting: false });
  if (!admission.ok) return fail(admission.code, admission.detail);
  const gitdirFile = path.join(context.commonDir, 'worktrees', options.name, 'gitdir');
  let target = null;
  try {
    target = path.resolve(path.dirname(fs.readFileSync(gitdirFile, 'utf8').trim()));
  } catch {
    return fail('SESSION_WORKTREE_UNKNOWN', options.name);
  }
  const branch = observed.parsed.branch ?? gitValue(target, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = context.policy?.canonical?.remote ?? 'origin';
  const canonicalBranch = context.policy?.canonical?.branch ?? 'main';
  const remoteMain = gitValue(context.root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${canonicalBranch}`]);
  const headSha = gitValue(target, ['rev-parse', 'HEAD']);
  const contained = remoteMain !== null && headSha !== null && git(context.root, ['merge-base', '--is-ancestor', headSha, remoteMain]).ok;
  if (!contained && !options.abandonUnmerged) {
    return fail('SESSION_REMOVE_REFUSED_UNMERGED', `${options.name} holds commits not contained in ${remote}/${canonicalBranch}; integrate first or pass --abandon-unmerged deliberately`);
  }
  if (options.dryRun) {
    plan('SESSION_REMOVE_PLAN', `name=${options.name} path=${target} branch=${typeof branch === 'string' ? branch : 'UNKNOWN'} contained=${String(contained)}`);
    plan('SESSION_REMOVE_WOULD_REMOVE_WORKTREE', target);
    if (options.deleteBranch && typeof branch === 'string' && branch !== canonicalBranch) {
      plan('SESSION_REMOVE_WOULD_DELETE_BRANCH', `${branch} (${contained ? '-d' : '-D'})`);
    } else {
      plan('SESSION_REMOVE_WOULD_RETAIN_BRANCH', typeof branch === 'string' ? branch : 'UNKNOWN');
    }
    dryRunComplete('remove');
    return { removed: false, dryRun: true };
  }
  const transition = withTransitionLock(file, { command: 'remove', sessionId: observed.parsed.sessionId }, () => {
    const current = readRecordDocument(file, context.policy);
    if (current.state !== 'PRESENT') return { ok: false, code: 'SESSION_RECORD_ABSENT', detail: `the ownership record became ${current.state}` };
    if (current.revision !== observed.revision) {
      return { ok: false, code: 'SESSION_RECORD_REVISION_CHANGED', detail: 'the ownership record changed during removal; nothing was removed' };
    }
    const removed = git(context.root, ['worktree', 'remove', target]);
    if (!removed.ok) return { ok: false, code: 'SESSION_WORKTREE_REMOVE_FAILED', detail: 'git worktree remove failed' };
    if (options.deleteBranch && typeof branch === 'string' && branch !== canonicalBranch) {
      const deleted = git(context.root, ['branch', contained ? '-d' : '-D', branch]);
      if (!deleted.ok) emit('SESSION_BRANCH_RETAINED', `${branch}: delete refused`);
      else emit('SESSION_BRANCH_DELETED', branch);
    }
    emit('SESSION_WORKTREE_REMOVED', `${options.name} contained=${String(contained)}`);
    return { ok: true, removed: true };
  });
  if (transition.ok !== true) return fail(transition.code, transition.detail);
  return transition;
}

/**
 * Explicit crashed-transition-lock recovery. It never reclaims by age or PID
 * alone: the boot identity must differ or the recorded process must be dead,
 * the exact lock operation identity must be echoed by the operator, and the
 * ownership record is never changed by recovery.
 */
function commandRecover(context, options) {
  const authority = SESSION_COMMAND_AUTHORITY.recover;
  const roleAdmission = admitCheckoutRole({ authority, isLinked: context.isLinked, worktreeCount: 1, role: options.role });
  if (!roleAdmission.ok) return fail(roleAdmission.code, roleAdmission.detail);
  const file = currentRecordFile(context);
  const observed = readTransitionLock(file);
  if (observed.state === 'ABSENT') {
    emit('SESSION_RECOVER_NOT_REQUIRED', 'NO_LOCK');
    return { recovered: false, reason: 'NO_LOCK' };
  }
  const currentBoot = bootDigest();
  const staleness = (lock) => {
    const sameBoot = typeof lock.bootDigest === 'string' && lock.bootDigest !== '' && lock.bootDigest === currentBoot;
    if (sameBoot && lock.pid !== undefined && lock.pid !== null && processAlive(lock.pid)) return 'PROCESS_ALIVE';
    if (sameBoot) return 'PROCESS_NOT_ALIVE';
    return 'BOOT_IDENTITY_CHANGED';
  };
  if (options.dryRun) {
    const stale = observed.state === 'PRESENT' ? staleness(observed.lock) : observed.state;
    plan('SESSION_RECOVER_PLAN', `lockState=${observed.state}${observed.state === 'PRESENT' ? ` operation=${observed.lock.operationId} session=${observed.lock.sessionId} command=${observed.lock.command} stale=${stale}` : ''}`);
    dryRunComplete('recover', observed.state === 'PRESENT' ? `node bin/nightwatch-session.mjs recover --expect-session ${observed.lock.sessionId} --expect-operation ${observed.lock.operationId}` : undefined);
    return { recovered: false, dryRun: true, lockState: observed.state };
  }
  const recovery = admitLockRecovery({
    lock: observed.state === 'PRESENT' ? observed.lock : null,
    lockState: observed.state,
    currentBootDigest: currentBoot,
    processAlive,
    expectedSessionId: options.expectSession,
    expectedOperationId: options.expectOperation,
  });
  if (!recovery.ok) return fail(recovery.code, recovery.detail);
  if (recovery.stale !== true) return fail('SESSION_RECOVER_REFUSED', `the transition lock is ${recovery.reason}`);
  const record = readRecordDocument(file, context.policy);
  if (record.state !== 'PRESENT' || record.parsed.sessionId !== observed.lock.sessionId) {
    return fail('SESSION_RECOVER_REFUSED', 'the current ownership record does not match the locked session; owner inspection is required');
  }
  // TOCTOU closure: re-read immediately before removal and require the exact
  // bytes that were inspected. A swapped lock is never removed.
  const confirm = readTransitionLock(file);
  if (confirm.state !== 'PRESENT' || confirm.bytes !== observed.bytes) {
    return fail('SESSION_RECOVER_REFUSED', 'the transition lock changed after inspection; re-inspect before recovery');
  }
  fs.unlinkSync(confirm.file);
  emit('SESSION_RECOVERED_LOCK', `operation=${observed.lock.operationId} session=${observed.lock.sessionId} proof=${recovery.reason}`);
  return { recovered: true };
}

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const COMMANDS = new Set(['status', 'check', 'start', 'claim', 'release', 'reconcile', 'integrate', 'remove', 'recover']);

/**
 * The `--dry-run` contract, declared once and enforced at dispatch.
 *
 * `SUPPORTED` means the command computes and reports its whole plan and then
 * returns having mutated NOTHING -- no ref, no branch, no worktree, no
 * ownership record, no lock, no file, no remote-tracking ref.
 *
 * `NOT_APPLICABLE` means the command never mutates, so "report the planned
 * action without mutating" says nothing the command does not already do.
 * Those commands REFUSE the flag rather than accepting it as a no-op: a flag
 * that is silently ignored is exactly how `start --dry-run` came to create a
 * worktree while reporting a plan.
 *
 * Every command in COMMANDS must appear here; `checkC00WorkspaceIntegrity`
 * fails a command that does not.
 * @type {Readonly<Record<string, 'SUPPORTED' | 'NOT_APPLICABLE'>>}
 */
const DRY_RUN_SUPPORT = Object.freeze({
  status: 'NOT_APPLICABLE',
  check: 'NOT_APPLICABLE',
  start: 'SUPPORTED',
  claim: 'SUPPORTED',
  release: 'SUPPORTED',
  reconcile: 'SUPPORTED',
  integrate: 'SUPPORTED',
  remove: 'SUPPORTED',
  recover: 'SUPPORTED',
});

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch-session',
  entry: 'bin/nightwatch-session.mjs',
  purpose: 'Manage the C-00 session worktree lifecycle and fast-forward integration.',
  group: 'manage-sessions',
  commands: [
    { name: 'status', summary: 'report the workspace and session topology (read-only; optional --root)' },
    { name: 'check', summary: 'report topology and fail closed on an unsafe invariant (read-only; optional --root)' },
    { name: 'start', summary: 'create one owned session worktree and branch (canonical checkout only)' },
    { name: 'claim', summary: 'claim or adopt an existing session worktree in the current checkout' },
    { name: 'release', summary: 'release this session ownership record' },
    { name: 'reconcile', summary: 'reconcile a stale session base' },
    { name: 'integrate', summary: 'fast-forward push the session to main (requires --expect-head)' },
    { name: 'remove', summary: 'remove an owned session worktree and branch (canonical checkout only)' },
    { name: 'recover', summary: 'inspect or remove an explicitly proven crashed transition lock' },
  ],
  defaultCommand: 'status',
  flags: [
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document' },
    { name: '--adopt', shape: 'boolean', summary: 'adopt a stale session worktree deliberately (requires --expect-session)' },
    { name: '--dry-run', shape: 'boolean', summary: 'report the planned action and mutate nothing (refused for status/check)' },
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
    { name: '--root', shape: 'path', summary: 'read-only inspection root (status/check only; refused for mutators)' },
    { name: '--expect-session', shape: 'string', summary: 'exact public current session id (sess-<12 hex>)' },
    { name: '--expect-head', shape: 'string', summary: 'exact 40-hex HEAD for integration intent' },
    { name: '--expect-operation', shape: 'string', summary: 'exact transition-lock operation id for recover' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['$HOME/.nightwatch/worktrees/<name> session worktrees'],
};

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    command: args[0] ?? 'status',
    root: null,
    rootExplicit: false,
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
    expectSession: null,
    expectHead: null,
    expectOperation: null,
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
    else if (value === '--root') {
      const supplied = next();
      if (supplied === undefined || supplied.startsWith('--')) return { error: 'ROOT_MISSING' };
      options.root = supplied;
      options.rootExplicit = true;
    }
    else if (value === '--expect-session') {
      const parsed = parseExpectation(next(), 'session');
      if (!parsed.ok) return { error: 'EXPECT_SESSION_INVALID' };
      options.expectSession = parsed.value;
    }
    else if (value === '--expect-head') {
      const parsed = parseExpectation(next(), 'head');
      if (!parsed.ok) return { error: 'EXPECT_HEAD_INVALID' };
      options.expectHead = parsed.value;
    }
    else if (value === '--expect-operation') {
      const supplied = next();
      if (supplied === undefined || !/^[0-9a-f]{16}$/.test(supplied)) return { error: 'EXPECT_OPERATION_INVALID' };
      options.expectOperation = supplied;
    }
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
  const authority = SESSION_COMMAND_AUTHORITY[options.command];
  if (options.dryRun && DRY_RUN_SUPPORT[options.command] !== 'SUPPORTED') {
    console.error(`[session] ERROR: SESSION_DRY_RUN_NOT_APPLICABLE: ${options.command} never mutates, so --dry-run has no supported meaning for it`);
    process.exitCode = 2;
    return;
  }
  if (authority.mutates && options.rootExplicit) {
    console.error('[session] ERROR: SESSION_MUTATION_ROOT_OVERRIDE_REFUSED: mutating commands operate only on the current checkout; --root is read-only inspection');
    process.exitCode = 1;
    return;
  }
  if (!authority.mutates) {
    const context = resolveContext(options.root ?? process.cwd());
    if (context === null) {
      console.error('[session] ERROR: SESSION_NOT_A_GIT_WORKTREE');
      process.exitCode = 1;
      return;
    }
    commandStatus(context, options);
    return;
  }
  const invocation = resolveInvocationContext();
  if (invocation.error !== undefined) {
    console.error(invocation.detail === undefined
      ? `[session] ERROR: ${invocation.error}`
      : `[session] ERROR: ${invocation.error}: ${invocation.detail}`);
    process.exitCode = 1;
    return;
  }
  const context = invocation.context;
  if (options.command === 'start') commandStart(context, options);
  else if (options.command === 'claim') commandClaim(context, options);
  else if (options.command === 'release') commandRelease(context, options);
  else if (options.command === 'reconcile') commandReconcile(context, options);
  else if (options.command === 'integrate') commandIntegrate(context, options);
  else if (options.command === 'remove') commandRemove(context, options);
  else if (options.command === 'recover') commandRecover(context, options);
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'nightwatch-session.mjs') {
  main();
}

export { parseArgs, resolveContext, holderIsLive, resolveFaultInjection, rollbackCreatedSession };
