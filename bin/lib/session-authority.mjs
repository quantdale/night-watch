#!/usr/bin/env node
// @ts-check

/**
 * C-00 session mutation authority admission core (NW-AUD-006).
 *
 * This module is PURE input validation and identity admission: it never reads
 * or writes the filesystem, never spawns a child and never opens a socket.
 * `bin/nightwatch-session.mjs` performs all Git/FS/network effects and passes
 * already-read text and records here, which keeps every admission decision
 * testable in isolation from the process that must obey it.
 *
 * Threat boundary: session IDs, revisions and expectations are PUBLIC
 * freshness and intent values, not authentication secrets. All agents share
 * one OS account, so this boundary is cooperative confused-deputy protection;
 * it is not cryptographic isolation from a hostile same-user process.
 */

import crypto from 'node:crypto';

export const SESSION_LOCK_SCHEMA = 'nightwatch.session-transition-lock.v1';
export const SESSION_ID_PATTERN = /^sess-[0-9a-f]{12}$/;
export const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;

export const SESSION_COMMAND_SET = Object.freeze([
  'status',
  'check',
  'start',
  'claim',
  'release',
  'reconcile',
  'integrate',
  'remove',
  'recover',
]);

/**
 * Command authority matrix.
 *
 * `explicitRoot`: `ALLOWED` keeps read-only cross-root inspection; `REFUSED`
 * removes arbitrary target selection from every mutator.
 * `checkout`: the invoking checkout class the command may run from.
 *   ANY       - read-only inspection.
 *   CURRENT   - the current worktree must be the session being mutated.
 *   LINKED    - the current checkout must be a linked session worktree.
 *   CANONICAL - the current checkout must be the canonical (main) worktree.
 * `expectSession`: when a record exists, the exact current record session ID
 *   must be supplied (`required`), or is required only for adoption.
 * `expectHead`: the exact HEAD must be supplied and unchanged at every effect.
 * `lock`: whether an ownership-record transition lock is held.
 * `continuity`: whether active-task/STATE continuity is admitted.
 */
export const SESSION_COMMAND_AUTHORITY = Object.freeze({
  status: Object.freeze({ mutates: false, explicitRoot: 'ALLOWED', checkout: 'ANY', expectSession: 'NONE', expectHead: false, lock: false, continuity: false }),
  check: Object.freeze({ mutates: false, explicitRoot: 'ALLOWED', checkout: 'ANY', expectSession: 'NONE', expectHead: false, lock: false, continuity: false }),
  start: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CANONICAL', expectSession: 'NONE', expectHead: false, lock: false, continuity: false }),
  claim: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'LINKED_OR_MAINTENANCE_CANONICAL', expectSession: 'ADOPT', expectHead: false, lock: true, continuity: false }),
  release: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CURRENT', expectSession: 'REQUIRED', expectHead: false, lock: true, continuity: true }),
  reconcile: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CURRENT', expectSession: 'REQUIRED', expectHead: false, lock: true, continuity: true }),
  integrate: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CURRENT', expectSession: 'REQUIRED', expectHead: true, lock: true, continuity: true }),
  remove: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CANONICAL', expectSession: 'REQUIRED', expectHead: false, lock: true, continuity: false }),
  recover: Object.freeze({ mutates: true, explicitRoot: 'REFUSED', checkout: 'CURRENT', expectSession: 'REQUIRED', expectHead: false, lock: false, continuity: false }),
});

/**
 * Command-compatible task statuses. Terminal completion stays compatible with
 * final integration/release; reconcile requires live work.
 */
export const SESSION_COMMAND_STATUS_COMPATIBILITY = Object.freeze({
  release: Object.freeze(['IN_PROGRESS', 'BLOCKED', 'COMPLETE']),
  reconcile: Object.freeze(['IN_PROGRESS']),
  integrate: Object.freeze(['IN_PROGRESS', 'COMPLETE']),
  remove: Object.freeze(['IN_PROGRESS', 'BLOCKED', 'COMPLETE']),
});

export function isSessionId(value) {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

export function isFullSha(value) {
  return typeof value === 'string' && FULL_SHA_PATTERN.test(value);
}

/**
 * Parse one expectation argument. Empty/absent is `null`; a malformed value is
 * a refusal, never a silent fallback.
 * @param {unknown} value
 * @param {'session'|'head'} kind
 */
export function parseExpectation(value, kind) {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, code: 'SESSION_EXPECTATION_MALFORMED', detail: `${kind} expectation must be a string` };
  if (value === '') return { ok: true, value: null };
  if (kind === 'session' && !isSessionId(value)) {
    return { ok: false, code: 'SESSION_EXPECTATION_MALFORMED', detail: 'session expectation must match sess-<12 hex>' };
  }
  if (kind === 'head' && !isFullSha(value)) {
    return { ok: false, code: 'SESSION_EXPECTATION_MALFORMED', detail: 'head expectation must be a 40-hex commit SHA' };
  }
  return { ok: true, value };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * The canonical full record revision: a deterministic digest of the record
 * CONTENT (not its bytes), so formatting-only differences never count as a
 * transition and any semantic change does.
 * @param {Record<string, unknown>} record
 */
export function recordRevision(record) {
  return crypto.createHash('sha256').update(stableStringify(record), 'utf8').digest('hex');
}

/**
 * Admit the explicit expectations against the current record and HEAD.
 * @param {{ authority: { expectSession: string, expectHead: boolean }, record: Record<string, any> | null, head: string | null, expectSession: string | null, expectHead: string | null, adopting: boolean }} input
 */
export function admitExpectations(input) {
  const { authority, record, head, expectSession, expectHead, adopting } = input;
  const requiresSession = authority.expectSession === 'REQUIRED'
    || (authority.expectSession === 'ADOPT' && adopting);
  if (requiresSession) {
    if (record === null || !isSessionId(record.sessionId)) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'no valid current ownership record exists to bind the expected session to' };
    }
    if (!isSessionId(expectSession)) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: `pass --expect-session ${record.sessionId} (current record session)` };
    }
    if (expectSession !== record.sessionId) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: `expected session ${expectSession} does not match the current record session` };
    }
  }
  if (authority.expectHead === true) {
    if (!isFullSha(expectHead)) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'pass --expect-head <40-hex HEAD> for integration' };
    }
    if (!isFullSha(head)) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'the current HEAD could not be resolved' };
    }
    if (expectHead !== head) {
      return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'the expected HEAD does not match the current HEAD; prepare a fresh integration intent' };
    }
  }
  return { ok: true };
}

/** Parse the ACTIVE_TASK routing block's declared session worktree. */
export function parseActiveTaskSessionWorktree(activeTaskText) {
  if (typeof activeTaskText !== 'string' || activeTaskText === '') return null;
  const lines = activeTaskText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## Routing and safety');
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s+/.test(line.trim()));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n');
  const matches = [...body.matchAll(/^[ \t]*SESSION WORKTREE:[ \t]*(\S.*?)[ \t]*$/gm)];
  if (matches.length !== 1) return null;
  return matches[0][1];
}

/**
 * Parse the ACTIVE_TASK identity preamble. Deliberately narrow: only
 * Task ID / Status / Task directory before the first section are authority.
 */
export function parseActiveTaskIdentity(activeTaskText) {
  if (typeof activeTaskText !== 'string' || activeTaskText === '') return null;
  const preamble = activeTaskText.split(/\r?\n/).reduce((accumulator, line) => {
    if (accumulator.done) return accumulator;
    if (/^##\s+/.test(line)) return { lines: accumulator.lines, done: true };
    accumulator.lines.push(line);
    return accumulator;
  }, { lines: [], done: false }).lines.join('\n');
  const value = (key) => {
    const match = new RegExp(`^[ \\t]*${key}:[ \\t]*(.+?)[ \\t]*$`, 'm').exec(preamble);
    return match === null ? null : match[1];
  };
  return { taskId: value('Task ID'), status: value('Status'), taskDirectory: value('Task directory') };
}

/** Parse the STATE.md Identity fields the session branch binds to. */
export function parseStateIdentity(stateText) {
  if (typeof stateText !== 'string' || stateText === '') return null;
  const sectionMatch = /^## Identity[ \t]*$/m.exec(stateText);
  if (sectionMatch === null) return null;
  const rest = stateText.slice(sectionMatch.index + sectionMatch[0].length);
  const end = rest.search(/^##\s+/m);
  const body = end === -1 ? rest : rest.slice(0, end);
  const value = (key) => {
    const match = new RegExp(`^[ \\t]*${key}:[ \\t]*(.+?)[ \\t]*$`, 'm').exec(body);
    return match === null ? null : match[1];
  };
  return { taskId: value('Task ID'), status: value('Status'), branch: value('Branch') };
}

/**
 * Admit continuity coherence for commands whose authority binds the active
 * task: record task/campaign, ACTIVE_TASK identity and routing, and the task
 * STATE branch/status must all agree with the current worktree.
 * @param {{ command: string, record: Record<string, any>, worktreeName: string, currentBranch: string, activeTaskText: string | null, stateText: string | null, normalizeStatus: (value: unknown) => string | null }} input
 */
export function admitContinuity(input) {
  const { command, record, worktreeName, currentBranch, activeTaskText, stateText, normalizeStatus } = input;
  if (record === null || typeof record !== 'object') {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'no valid ownership record to bind continuity to' };
  }
  if (record.role === 'MAINTENANCE') {
    // The canonical maintenance claim is explicitly bounded and carries no
    // implementation continuity; the record's own task is checked for a safe
    // task ID below without requiring routing to this worktree.
  }
  const active = parseActiveTaskIdentity(activeTaskText);
  if (active === null || typeof active.taskId !== 'string' || active.taskId === '') {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the active task identity is absent or unreadable' };
  }
  if (active.taskId !== record.taskId) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: `the active task ${active.taskId} does not match the ownership record task` };
  }
  const declaredWorktree = parseActiveTaskSessionWorktree(activeTaskText);
  if (record.role !== 'MAINTENANCE' && declaredWorktree !== null && declaredWorktree !== 'NONE' && declaredWorktree !== worktreeName) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the active task routing names a different session worktree' };
  }
  const state = parseStateIdentity(stateText);
  if (state === null || typeof state.status !== 'string' || state.status === '') {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the task STATE identity is absent or unreadable' };
  }
  if (state.taskId !== undefined && state.taskId !== null && state.taskId !== record.taskId) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the task STATE names a different task ID' };
  }
  if (typeof state.branch === 'string' && state.branch !== '' && state.branch !== currentBranch) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the task STATE branch does not match the current session branch' };
  }
  const status = normalizeStatus(active.status) ?? normalizeStatus(state.status);
  if (status === null) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: 'the task status is absent or unrecognized' };
  }
  const compatible = SESSION_COMMAND_STATUS_COMPATIBILITY[command] ?? null;
  if (compatible !== null && !compatible.includes(status)) {
    return { ok: false, code: 'SESSION_CONTINUITY_MISMATCH', detail: `task status ${status} is not compatible with ${command}` };
  }
  return { ok: true, status };
}

/**
 * Admit the invoking checkout class for a command.
 * @param {{ authority: { checkout: string }, isLinked: boolean, worktreeCount: number }} input
 */
export function admitCheckoutRole(input) {
  const { authority, isLinked, worktreeCount, role } = input;
  if (authority.checkout === 'LINKED' && !isLinked) {
    return { ok: false, code: 'SESSION_CHECKOUT_CLASS_REFUSED', detail: 'this command runs only inside a linked session worktree' };
  }
  if (authority.checkout === 'LINKED_OR_MAINTENANCE_CANONICAL' && !isLinked && role !== 'MAINTENANCE') {
    return { ok: false, code: 'SESSION_CANONICAL_IMPLEMENTATION_REFUSED', detail: 'the canonical checkout may only hold a MAINTENANCE claim; use start to create an implementation worktree' };
  }
  if (authority.checkout === 'CANONICAL' && isLinked) {
    return { ok: false, code: 'SESSION_CHECKOUT_CLASS_REFUSED', detail: 'this command runs only from the canonical checkout' };
  }
  if (authority.checkout === 'CURRENT' && worktreeCount > 1 && isLinked === false) {
    // A single-worktree topology has no shared state to protect; the
    // documented bootstrap exception keeps working.
  }
  return { ok: true };
}

/**
 * Admit the script/current-checkout relationship. `scriptRealPath` must
 * resolve inside the exact non-symlink authority worktree.
 */
export function admitInvocationBinding(input) {
  const { currentTopRealPath, scriptRealPath, cwdRealPath } = input;
  if (typeof currentTopRealPath !== 'string' || currentTopRealPath === '') {
    return { ok: false, code: 'SESSION_INVOCATION_UNRESOLVED', detail: 'the current Git top-level could not be resolved' };
  }
  if (typeof scriptRealPath !== 'string' || scriptRealPath === '') {
    return { ok: false, code: 'SESSION_INVOCATION_UNRESOLVED', detail: 'the executing session CLI path could not be resolved' };
  }
  if (typeof cwdRealPath !== 'string' || cwdRealPath === '') {
    return { ok: false, code: 'SESSION_INVOCATION_UNRESOLVED', detail: 'the process current directory could not be resolved' };
  }
  const inside = (candidate) => candidate === currentTopRealPath || candidate.startsWith(`${currentTopRealPath}/`);
  if (!inside(scriptRealPath)) {
    return { ok: false, code: 'SESSION_SCRIPT_CHECKOUT_MISMATCH', detail: 'the executing session CLI belongs to a different checkout' };
  }
  if (!inside(cwdRealPath)) {
    return { ok: false, code: 'SESSION_INVOCATION_UNRESOLVED', detail: 'the process current directory is not inside the resolved Git top-level' };
  }
  return { ok: true };
}

/**
 * Admit recovery of a crashed transition lock. Age is never used: the lock is
 * provably stale only when its boot identity differs from the current boot or
 * its recorded process is not alive. The exact lock identity must be supplied
 * by the operator and must still match what was inspected.
 * @param {{ lock: Record<string, any> | null, lockState: string, currentBootDigest: string, processAlive: (pid: number) => boolean, expectedSessionId: string | null, expectedOperationId: string | null }} input
 */
export function admitLockRecovery(input) {
  const { lock, lockState, currentBootDigest, processAlive, expectedSessionId, expectedOperationId } = input;
  if (lockState === 'ABSENT') return { ok: true, stale: false, reason: 'NO_LOCK' };
  if (lockState !== 'PRESENT') {
    return { ok: false, code: 'SESSION_RECOVER_REFUSED', detail: `the transition lock is ${lockState}; owner inspection is required` };
  }
  if (isSessionId(expectedSessionId) === false || lock.sessionId !== expectedSessionId) {
    return { ok: false, code: 'SESSION_EXPECTATION_MISMATCH', detail: 'pass --expect-session of the locked session' };
  }
  if (typeof expectedOperationId !== 'string' || expectedOperationId === '' || lock.operationId !== expectedOperationId) {
    return { ok: false, code: 'SESSION_RECOVER_REFUSED', detail: 'the lock operation identity changed since inspection; re-inspect before recovery' };
  }
  const sameBoot = typeof lock.bootDigest === 'string' && lock.bootDigest !== '' && lock.bootDigest === currentBootDigest;
  if (sameBoot && (lock.pid === undefined || lock.pid === null || processAlive(lock.pid))) {
    return { ok: false, code: 'SESSION_RECOVER_REFUSED', detail: 'the transition process may still be live; recovery never reclaims by age or PID alone' };
  }
  return { ok: true, stale: true, reason: sameBoot ? 'PROCESS_NOT_ALIVE' : 'BOOT_IDENTITY_CHANGED' };
}
