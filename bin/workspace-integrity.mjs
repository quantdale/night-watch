#!/usr/bin/env node

// Nightwatch C-00 — read-only workspace integrity inspection core.
//
// Authority: read-only Git queries and filesystem reads. This module never
// mutates the repository, never opens a socket, and never spawns a shell. All
// mutation for the session lifecycle lives in bin/nightwatch-session.mjs.
//
// It answers one question deterministically: is the repository-global Git
// state and the per-worktree session ownership state safe for a writing agent?
//
// Isolation facts this module depends on (empirically verified, and a
// correction to independent review §11 item 2):
//   - HEAD, the index (and therefore skip-worktree/assume-unchanged bits) and
//     the checkout are PER WORKTREE;
//   - info/exclude, hooks and config live in $GIT_COMMON_DIR and are SHARED;
//   - the object database is shared and append-only, hence safe.
// Both surfaces are therefore checked: shared state once, index state for
// every registered worktree.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const WORKSPACE_INTEGRITY_SCHEMA = 'nightwatch.workspace-integrity-report.v1';
export const WORKSPACE_SESSION_SCHEMA = 'nightwatch.workspace-session.v1';

// This module deliberately uses NO `import.meta`: it is imported by
// bin/agent-state.mjs, which is in turn imported by a TypeScript test through
// Playwright's CommonJS transform, where `import.meta` is a syntax error.
const POLICY_RELATIVE_PATH = 'config/workspace-integrity.v1.json';
const GIT_TIMEOUT_MS = 20_000;
const GIT_MAX_BUFFER = 8 * 1024 * 1024;

/**
 * Fail-safe policy for a repository that carries no committed policy file —
 * a disposable synthetic fixture, or a foreign checkout being inspected. It
 * mirrors config/workspace-integrity.v1.json exactly; `hardening:check`
 * asserts the committed file's values independently, and deleting the
 * committed file is itself caught by the declared-deletion gate.
 */
const DEFAULT_POLICY = Object.freeze({
  schemaVersion: 'nightwatch.workspace-integrity.v1',
  policyName: 'Nightwatch C-00 built-in default policy',
  sessionRecordSchema: WORKSPACE_SESSION_SCHEMA,
  sessionRecordFile: 'nightwatch-session.v1.json',
  canonical: Object.freeze({
    branch: 'main',
    remote: 'origin',
    sessionBranchPrefix: 'session/',
    mayHostImplementationSession: false,
    requireCleanWhenSessionLive: true,
  }),
  indexFlagPolicy: Object.freeze({
    allowedTags: Object.freeze(['H', 'M', 'R', 'C', 'K', '?']),
    skipWorktreeTags: Object.freeze(['S', 's']),
    maxReportedExamples: 8,
  }),
  excludePolicy: Object.freeze({
    allowedEffectivePatterns: Object.freeze([]),
    maxBytes: 8192,
    maxLines: 128,
  }),
  hookPolicy: Object.freeze({ allowedSuffix: '.sample', requireUnsetHooksPath: true, maxEntries: 64 }),
  worktreePolicy: Object.freeze({
    maxWorktrees: 8,
    maxRecordBytes: 4096,
    allowedRoles: Object.freeze(['IMPLEMENTATION', 'MAINTENANCE']),
    allowedOwnershipStates: Object.freeze(['OWNED', 'RELEASED']),
    allowedIntegrationStates: Object.freeze(['NOT_INTEGRATED', 'INTEGRATED']),
    requireOwnerRecordForLinkedWorktree: true,
    pruneIsOwnerDecision: true,
  }),
  deletionPolicy: Object.freeze({ declaredDeletionHeading: '## Declared Deletions', maxReportedExamples: 16 }),
});

const WORKTREE_CLASSES = Object.freeze([
  'CANONICAL_MAIN',
  'CANONICAL_MAINTENANCE',
  'OWNED_SESSION',
  'STALE_SESSION',
  'UNOWNED_WORKTREE',
  'UNKNOWN',
]);

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return { ok: false, stdout: '', code: null };
  return { ok: result.status === 0, stdout: result.stdout ?? '', code: result.status };
}

function gitValue(cwd, args) {
  const result = git(cwd, args);
  if (!result.ok) return null;
  const value = result.stdout.trim();
  return value === '' ? null : value;
}

function digest24(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 24);
}

/**
 * Truncated digest of the kernel boot identity. A reboot deterministically
 * invalidates every stale holder claim without persisting a machine
 * fingerprint. Absent boot identity degrades to pid-only liveness.
 */
export function bootDigest() {
  try {
    const raw = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
    if (raw !== '') return digest24(raw);
  } catch {
    // fall through
  }
  return 'NO_BOOT_IDENTITY';
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

function readTextIfPresent(file, maxBytes) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return { present: true, regular: false, text: null, bytes: stat.size };
    if (typeof maxBytes === 'number' && stat.size > maxBytes) {
      return { present: true, regular: true, text: null, bytes: stat.size, oversized: true };
    }
    return { present: true, regular: true, text: fs.readFileSync(file, 'utf8'), bytes: stat.size };
  } catch {
    return { present: false, regular: false, text: null, bytes: 0 };
  }
}

export function loadPolicy(root) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, POLICY_RELATIVE_PATH), 'utf8'));
    if (parsed?.schemaVersion === 'nightwatch.workspace-integrity.v1') return { policy: parsed, source: 'REPOSITORY' };
    return { policy: null, source: 'REPOSITORY_INVALID' };
  } catch {
    return { policy: DEFAULT_POLICY, source: 'BUILT_IN_DEFAULT' };
  }
}

// ---------------------------------------------------------------------------
// session ownership records
// ---------------------------------------------------------------------------

export function sessionRecordPath(commonDir, worktreeName, policy) {
  const file = policy?.sessionRecordFile ?? 'nightwatch-session.v1.json';
  return worktreeName === null
    ? path.join(commonDir, file)
    : path.join(commonDir, 'worktrees', worktreeName, file);
}

function validateRecord(raw, policy) {
  const problems = [];
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { valid: false, problems: ['NOT_AN_OBJECT'] };
  if (raw.schemaVersion !== WORKSPACE_SESSION_SCHEMA) problems.push('SCHEMA_UNSUPPORTED');
  for (const key of ['sessionId', 'taskId', 'role', 'branch', 'baseSha', 'createdAtIso', 'ownershipState', 'integrationState']) {
    if (typeof raw[key] !== 'string' || raw[key] === '') problems.push(`FIELD_INVALID:${key}`);
  }
  const roles = policy?.worktreePolicy?.allowedRoles ?? ['IMPLEMENTATION', 'MAINTENANCE'];
  const ownerships = policy?.worktreePolicy?.allowedOwnershipStates ?? ['OWNED', 'RELEASED'];
  const integrations = policy?.worktreePolicy?.allowedIntegrationStates ?? ['NOT_INTEGRATED', 'INTEGRATED'];
  if (typeof raw.role === 'string' && !roles.includes(raw.role)) problems.push('ROLE_UNKNOWN');
  if (typeof raw.ownershipState === 'string' && !ownerships.includes(raw.ownershipState)) problems.push('OWNERSHIP_STATE_UNKNOWN');
  if (typeof raw.integrationState === 'string' && !integrations.includes(raw.integrationState)) problems.push('INTEGRATION_STATE_UNKNOWN');
  if (typeof raw.baseSha === 'string' && !/^[0-9a-f]{40}$/.test(raw.baseSha)) problems.push('BASE_SHA_INVALID');
  if (raw.holder !== undefined && raw.holder !== null) {
    if (typeof raw.holder !== 'object' || Array.isArray(raw.holder)) problems.push('HOLDER_INVALID');
    else {
      // A process anchor is OPTIONAL: a conversational agent session has no
      // single long-lived pid. When absent, ownership is a declaration that
      // ends at explicit release or at reboot (bootDigest change).
      if (raw.holder.pid !== undefined && raw.holder.pid !== null && (!Number.isInteger(raw.holder.pid) || raw.holder.pid <= 0)) problems.push('HOLDER_PID_INVALID');
      if (typeof raw.holder.bootDigest !== 'string' || raw.holder.bootDigest === '') problems.push('HOLDER_BOOT_INVALID');
    }
  }
  // Durable project truth must not carry a machine-specific absolute path.
  if (typeof raw.worktreePath === 'string') problems.push('ABSOLUTE_PATH_PERSISTED');
  return { valid: problems.length === 0, problems };
}

function readRecord(file, policy, liveness) {
  const maxBytes = policy?.worktreePolicy?.maxRecordBytes ?? 4096;
  const found = readTextIfPresent(file, maxBytes);
  if (!found.present) return { present: false, valid: false, problems: [], record: null, holderLive: false };
  if (found.oversized === true) return { present: true, valid: false, problems: ['OVERSIZED'], record: null, holderLive: false };
  if (!found.regular || found.text === null) return { present: true, valid: false, problems: ['NOT_A_REGULAR_FILE'], record: null, holderLive: false };
  let parsed;
  try {
    parsed = JSON.parse(found.text);
  } catch {
    return { present: true, valid: false, problems: ['NOT_JSON'], record: null, holderLive: false };
  }
  const verdict = validateRecord(parsed, policy);
  if (!verdict.valid) return { present: true, valid: false, problems: verdict.problems, record: null, holderLive: false };
  const currentBoot = liveness.bootDigest();
  const holder = parsed.holder ?? null;
  const holderLive = holder !== null
    && parsed.ownershipState === 'OWNED'
    && holder.bootDigest === currentBoot
    && (holder.pid === undefined || holder.pid === null || liveness.processAlive(holder.pid));
  return { present: true, valid: true, problems: [], record: parsed, holderLive };
}

// ---------------------------------------------------------------------------
// worktree topology
// ---------------------------------------------------------------------------

function parseWorktreePorcelain(text) {
  const entries = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line === '') {
      if (current !== null) entries.push(current);
      current = null;
      continue;
    }
    const separator = line.indexOf(' ');
    const key = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1);
    if (key === 'worktree') {
      if (current !== null) entries.push(current);
      current = { path: value, headSha: null, branch: null, detached: false, bare: false, locked: false, prunable: false };
      continue;
    }
    if (current === null) continue;
    if (key === 'HEAD') current.headSha = value;
    else if (key === 'branch') current.branch = value.replace(/^refs\/heads\//, '');
    else if (key === 'detached') current.detached = true;
    else if (key === 'bare') current.bare = true;
    else if (key === 'locked') current.locked = true;
    else if (key === 'prunable') current.prunable = true;
  }
  if (current !== null) entries.push(current);
  return entries;
}

function linkedWorktreeNames(commonDir) {
  const directory = path.join(commonDir, 'worktrees');
  let names;
  try {
    names = fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return new Map();
  }
  const byPath = new Map();
  for (const name of names.sort()) {
    let gitdir;
    try {
      gitdir = fs.readFileSync(path.join(directory, name, 'gitdir'), 'utf8').trim();
    } catch {
      continue;
    }
    if (gitdir === '') continue;
    byPath.set(path.resolve(path.dirname(gitdir)), name);
  }
  return byPath;
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

function checkIndexFlags(worktrees, policy, errors) {
  const allowed = new Set(policy?.indexFlagPolicy?.allowedTags ?? ['H', 'M', 'R', 'C', 'K', '?']);
  const skipTags = new Set(policy?.indexFlagPolicy?.skipWorktreeTags ?? ['S', 's']);
  const maxExamples = policy?.indexFlagPolicy?.maxReportedExamples ?? 8;
  const findings = [];
  let inspected = 0;
  for (const worktree of worktrees) {
    if (!worktree.exists || worktree.bare) continue;
    const result = git(worktree.path, ['ls-files', '-v']);
    if (!result.ok) {
      errors.push({ code: 'WORKSPACE_INDEX_UNREADABLE', detail: `worktree ${worktree.name}` });
      continue;
    }
    inspected += 1;
    for (const line of result.stdout.split(/\r?\n/)) {
      if (line === '') continue;
      const tag = line[0];
      const file = line.slice(2);
      const lowercase = /^[a-z]$/.test(tag);
      if (skipTags.has(tag)) {
        findings.push({ worktree: worktree.name, tag, file, reason: tag === 's' ? 'SKIP_WORKTREE_AND_ASSUME_UNCHANGED' : 'SKIP_WORKTREE' });
      } else if (lowercase) {
        findings.push({ worktree: worktree.name, tag, file, reason: 'ASSUME_UNCHANGED' });
      } else if (!allowed.has(tag)) {
        findings.push({ worktree: worktree.name, tag, file, reason: 'UNKNOWN_TAG' });
      }
    }
  }
  const status = findings.length === 0 ? 'PASS' : 'VIOLATED';
  if (findings.length > 0) {
    for (const finding of findings.slice(0, maxExamples)) {
      errors.push({
        code: finding.reason === 'UNKNOWN_TAG' ? 'WORKSPACE_UNKNOWN_INDEX_TAG' : 'WORKSPACE_FORBIDDEN_INDEX_FLAG',
        detail: `${finding.reason} tag '${finding.tag}' on ${finding.file} in worktree ${finding.worktree}`,
      });
    }
  }
  return {
    id: 'WORKSPACE_INDEX_FLAGS',
    status,
    inspectedWorktrees: inspected,
    violationCount: findings.length,
    examples: findings.slice(0, maxExamples).map((finding) => ({ worktree: finding.worktree, tag: finding.tag, file: finding.file, reason: finding.reason })),
  };
}

function effectiveExcludePatterns(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/**
 * The shared-exclude invariant is an ALLOWLIST comparison, so it is only
 * meaningful where the inspected repository carries its own committed
 * allowlist. A foreign or disposable repository inspected with the built-in
 * default policy has no authoritative allowlist to compare against, so the
 * result is reported as NOT_APPLICABLE with an advisory rather than asserted
 * as a violation. Enforcement in the Nightwatch repository is unchanged.
 */
function checkExclude(commonDir, policy, policySource, errors, warnings) {
  const maxBytes = policy?.excludePolicy?.maxBytes ?? 8192;
  const maxLines = policy?.excludePolicy?.maxLines ?? 128;
  const allowed = new Set(policy?.excludePolicy?.allowedEffectivePatterns ?? []);
  const file = path.join(commonDir, 'info', 'exclude');
  const found = readTextIfPresent(file, maxBytes);
  if (!found.present) {
    return { id: 'WORKSPACE_EXCLUDE_POLICY', status: 'PASS', effectivePatternCount: 0, unauthorized: [], note: 'ABSENT' };
  }
  if (found.oversized === true) {
    errors.push({ code: 'WORKSPACE_EXCLUDE_OVERSIZED', detail: `${found.bytes} bytes exceeds the ${maxBytes}-byte bound` });
    return { id: 'WORKSPACE_EXCLUDE_POLICY', status: 'VIOLATED', effectivePatternCount: null, unauthorized: [], note: 'OVERSIZED' };
  }
  if (!found.regular || found.text === null) {
    errors.push({ code: 'WORKSPACE_EXCLUDE_UNREADABLE', detail: 'info/exclude is not a readable regular file' });
    return { id: 'WORKSPACE_EXCLUDE_POLICY', status: 'VIOLATED', effectivePatternCount: null, unauthorized: [], note: 'UNREADABLE' };
  }
  const lines = found.text.split(/\r?\n/);
  if (lines.length > maxLines) {
    errors.push({ code: 'WORKSPACE_EXCLUDE_OVERSIZED', detail: `${lines.length} lines exceeds the ${maxLines}-line bound` });
  }
  const patterns = effectiveExcludePatterns(found.text);
  const unauthorized = patterns.filter((pattern) => !allowed.has(pattern));
  const allowlistIsAuthoritative = policySource === 'REPOSITORY' || policySource === 'SUPPLIED';
  if (!allowlistIsAuthoritative) {
    if (unauthorized.length > 0) {
      warnings.push({
        code: 'WORKSPACE_EXCLUDE_ALLOWLIST_UNAVAILABLE',
        detail: `${unauthorized.length} effective shared exclude pattern(s) present, but this repository carries no committed allowlist to compare against`,
      });
    }
    return {
      id: 'WORKSPACE_EXCLUDE_POLICY',
      status: 'NOT_APPLICABLE',
      effectivePatternCount: patterns.length,
      unauthorized: [],
      note: 'NO_COMMITTED_ALLOWLIST',
    };
  }
  for (const pattern of unauthorized) {
    errors.push({ code: 'WORKSPACE_EXCLUDE_DRIFT', detail: `unauthorized shared exclude pattern: ${pattern}` });
  }
  return {
    id: 'WORKSPACE_EXCLUDE_POLICY',
    status: unauthorized.length === 0 && lines.length <= maxLines ? 'PASS' : 'VIOLATED',
    effectivePatternCount: patterns.length,
    unauthorized,
  };
}

function checkHooks(commonDir, worktreeRoot, policy, errors) {
  const suffix = policy?.hookPolicy?.allowedSuffix ?? '.sample';
  const maxEntries = policy?.hookPolicy?.maxEntries ?? 64;
  const directory = path.join(commonDir, 'hooks');
  let entries = [];
  let present = true;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    present = false;
  }
  const unexpected = [];
  if (present) {
    if (entries.length > maxEntries) {
      errors.push({ code: 'WORKSPACE_HOOKS_OVERSIZED', detail: `${entries.length} hook entries exceeds the ${maxEntries} bound` });
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(suffix)) unexpected.push(entry.name);
    }
    for (const name of unexpected) {
      errors.push({ code: 'WORKSPACE_UNEXPECTED_HOOK', detail: `non-sample hook entry: ${name}` });
    }
  }
  let hooksPath = null;
  if (policy?.hookPolicy?.requireUnsetHooksPath !== false) {
    hooksPath = gitValue(worktreeRoot, ['config', '--get', 'core.hooksPath']);
    if (hooksPath !== null) {
      errors.push({ code: 'WORKSPACE_HOOKS_PATH_OVERRIDDEN', detail: 'core.hooksPath is set; repository-local hook execution must stay unconfigured' });
    }
  }
  return {
    id: 'WORKSPACE_HOOKS_POLICY',
    status: unexpected.length === 0 && hooksPath === null && (!present || entries.length <= maxEntries) ? 'PASS' : 'VIOLATED',
    hooksDirectoryPresent: present,
    entryCount: present ? entries.length : 0,
    unexpected,
    hooksPathConfigured: hooksPath !== null,
  };
}

function checkWorktreeMetadata(worktrees, policy, errors, warnings) {
  const maxWorktrees = policy?.worktreePolicy?.maxWorktrees ?? 8;
  if (worktrees.length > maxWorktrees) {
    errors.push({ code: 'WORKSPACE_WORKTREE_LIMIT_EXCEEDED', detail: `${worktrees.length} registered worktrees exceeds the ${maxWorktrees} bound` });
  }
  for (const worktree of worktrees) {
    if (!worktree.exists) {
      errors.push({ code: 'WORKSPACE_WORKTREE_PATH_MISSING', detail: `registered worktree ${worktree.name} has no directory` });
    } else if (worktree.isSymlink) {
      errors.push({ code: 'WORKSPACE_WORKTREE_PATH_SYMLINK', detail: `registered worktree ${worktree.name} resolves through a symlink` });
    }
    if (worktree.prunable) {
      warnings.push({ code: 'WORKSPACE_PRUNABLE_WORKTREE', detail: `worktree ${worktree.name} is prunable; pruning is an owner decision` });
    }
    if (worktree.class === 'UNOWNED_WORKTREE') {
      errors.push({ code: 'WORKSPACE_UNOWNED_SESSION_WORKTREE', detail: `linked worktree ${worktree.name} carries no Nightwatch session record` });
    }
    if (worktree.class === 'UNKNOWN') {
      errors.push({ code: 'WORKSPACE_SESSION_STATE_UNKNOWN', detail: `worktree ${worktree.name}: ${worktree.classReason}` });
    }
    if (worktree.class === 'STALE_SESSION') {
      warnings.push({ code: 'WORKSPACE_STALE_SESSION_WORKTREE', detail: `worktree ${worktree.name} claims task ${worktree.record?.taskId ?? 'UNKNOWN'} but its holder is not live; adopt or release explicitly` });
    }
  }
  const sessionIds = new Map();
  const liveTaskIds = new Map();
  for (const worktree of worktrees) {
    const record = worktree.record;
    if (record === null) continue;
    const seenSession = sessionIds.get(record.sessionId);
    if (seenSession !== undefined) {
      errors.push({ code: 'WORKSPACE_DUPLICATE_SESSION_ID', detail: `session ${record.sessionId} is claimed by worktrees ${seenSession} and ${worktree.name}` });
    } else {
      sessionIds.set(record.sessionId, worktree.name);
    }
    if (!worktree.holderLive) continue;
    const seenTask = liveTaskIds.get(record.taskId);
    if (seenTask !== undefined) {
      errors.push({ code: 'WORKSPACE_DUPLICATE_TASK_CLAIM', detail: `task ${record.taskId} is live in worktrees ${seenTask} and ${worktree.name}` });
    } else {
      liveTaskIds.set(record.taskId, worktree.name);
    }
  }
  const hardFailures = errors.filter((error) => error.code.startsWith('WORKSPACE_WORKTREE_') || error.code.startsWith('WORKSPACE_UNOWNED') || error.code.startsWith('WORKSPACE_SESSION_') || error.code.startsWith('WORKSPACE_DUPLICATE_'));
  return {
    id: 'WORKSPACE_WORKTREE_METADATA',
    status: hardFailures.length === 0 ? 'PASS' : 'VIOLATED',
    registeredWorktrees: worktrees.length,
    liveSessionCount: worktrees.filter((worktree) => worktree.class === 'OWNED_SESSION').length,
    staleSessionCount: worktrees.filter((worktree) => worktree.class === 'STALE_SESSION').length,
  };
}

function checkCanonicalProtection(worktrees, policy, errors) {
  const canonical = worktrees.find((worktree) => worktree.isMain) ?? null;
  if (canonical === null) {
    errors.push({ code: 'WORKSPACE_CANONICAL_WORKTREE_UNRESOLVED', detail: 'the main worktree could not be resolved' });
    return { id: 'WORKSPACE_CANONICAL_PROTECTION', status: 'VIOLATED', canonicalClass: null, canonicalClean: null };
  }
  const prefix = policy?.canonical?.sessionBranchPrefix ?? 'session/';
  const mayHost = policy?.canonical?.mayHostImplementationSession === true;
  const requireClean = policy?.canonical?.requireCleanWhenSessionLive !== false;
  const liveSessions = worktrees.filter((worktree) => !worktree.isMain && worktree.class === 'OWNED_SESSION');
  let status = 'PASS';
  if (!mayHost && canonical.record?.role === 'IMPLEMENTATION') {
    errors.push({ code: 'WORKSPACE_CANONICAL_IMPLEMENTATION_SESSION', detail: 'the canonical checkout claims an implementation session; implementation must run in a dedicated worktree' });
    status = 'VIOLATED';
  }
  // The hazard is the SHARED canonical checkout being used as an
  // implementation session. A solo checkout (a fresh clone, a CI checkout)
  // shares nothing, so the branch-name signal is only a violation once linked
  // worktrees exist. This is the documented bootstrap/maintenance exception.
  const shared = worktrees.length > 1;
  if (!mayHost && shared && typeof canonical.branch === 'string' && canonical.branch.startsWith(prefix)) {
    errors.push({ code: 'WORKSPACE_CANONICAL_SESSION_BRANCH', detail: `the canonical checkout is on session branch ${canonical.branch} while ${worktrees.length - 1} linked worktree(s) exist` });
    status = 'VIOLATED';
  }
  if (requireClean && liveSessions.length > 0 && canonical.clean === false) {
    errors.push({
      code: 'WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE',
      detail: `the canonical checkout has uncommitted changes while ${liveSessions.length} owned session worktree(s) are live`,
    });
    status = 'VIOLATED';
  }
  return {
    id: 'WORKSPACE_CANONICAL_PROTECTION',
    status,
    canonicalClass: canonical.class,
    canonicalClean: canonical.clean,
    canonicalBranch: canonical.branch,
    liveSessionCount: liveSessions.length,
  };
}

function activeTaskDirectory(root) {
  try {
    const text = fs.readFileSync(path.join(root, '.agent/ACTIVE_TASK.md'), 'utf8');
    const match = /^Task directory:\s*(\S+)\s*$/m.exec(text);
    if (match === null) return null;
    const candidate = match[1];
    if (candidate === 'NONE' || path.isAbsolute(candidate) || candidate.includes('..')) return null;
    return candidate;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// prospective admission (NW-06)
// ---------------------------------------------------------------------------

// `checkWorktreeMetadata` measures the topology that already exists, which is
// the right question for `status`/`check` and the wrong one for `start`: at the
// bound, a start that has not happened yet still passes, `git worktree add`
// creates the over-limit registration, and only the NEXT inspection reports
// `WORKSPACE_WORKTREE_LIMIT_EXCEEDED` — after the mutation, with the owner
// now holding an illegal workspace. So the candidate registration is modelled
// here, against the same policy the invariant uses, BEFORE anything is
// created.
//
// This is deliberately not bypassable by `--allow-drift`. Drift tolerance
// exists so an owner can start work in a workspace that already has an
// unrelated violation; it must not be a route to creating a new one.
export function admitProspectiveWorktree(report, candidateName, policy) {
  const maxWorktrees = policy?.worktreePolicy?.maxWorktrees ?? 8;
  const registered = Array.isArray(report?.worktrees) ? report.worktrees : [];
  const prospectiveCount = registered.length + 1;
  const refusals = [];
  if (prospectiveCount > maxWorktrees) {
    refusals.push({
      code: 'WORKSPACE_PROSPECTIVE_WORKTREE_LIMIT_EXCEEDED',
      detail: `creating ${candidateName} would register ${prospectiveCount} worktrees, exceeding the ${maxWorktrees} bound; release or remove a session you own first — never another owner's`,
    });
  }
  if (registered.some((worktree) => worktree.name === candidateName)) {
    refusals.push({
      code: 'WORKSPACE_PROSPECTIVE_WORKTREE_NAME_REGISTERED',
      detail: `a worktree named ${candidateName} is already registered`,
    });
  }
  return Object.freeze({
    admitted: refusals.length === 0,
    registeredCount: registered.length,
    prospectiveCount,
    maxWorktrees,
    refusals: Object.freeze(refusals),
  });
}

export function parseDeclaredDeletions(specText, heading) {
  const lines = specText.split(/\r?\n/);
  const declared = [];
  let inSection = false;
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      inSection = line.trim() === heading;
      continue;
    }
    if (!inSection) continue;
    const match = /^\s*[-*]\s+(?:`([^`]+)`|(\S+))\s*$/.exec(line);
    if (match === null) continue;
    const value = match[1] ?? match[2];
    if (value !== undefined && value !== 'NONE') declared.push(value);
  }
  return declared;
}

function checkDeclaredDeletions(root, self, policy, errors, warnings) {
  const heading = policy?.deletionPolicy?.declaredDeletionHeading ?? '## Declared Deletions';
  const maxExamples = policy?.deletionPolicy?.maxReportedExamples ?? 16;
  let base = null;
  let baseKind = 'NONE';
  if (self !== null && self.record?.baseSha !== undefined && self.class === 'OWNED_SESSION') {
    const resolved = gitValue(root, ['rev-parse', '--verify', '--quiet', `${self.record.baseSha}^{commit}`]);
    if (resolved !== null) {
      base = resolved;
      baseKind = 'SESSION_BASE';
    }
  }
  if (base === null) {
    const remote = policy?.canonical?.remote ?? 'origin';
    const branch = policy?.canonical?.branch ?? 'main';
    const mergeBase = gitValue(root, ['merge-base', 'HEAD', `${remote}/${branch}`]);
    if (mergeBase !== null) {
      base = mergeBase;
      baseKind = 'MERGE_BASE';
    }
  }
  if (base === null) {
    if (self !== null && self.class === 'OWNED_SESSION') {
      warnings.push({ code: 'WORKSPACE_DELETION_BASE_UNAVAILABLE', detail: 'no session base or canonical merge base could be resolved' });
    }
    return { id: 'WORKSPACE_DECLARED_DELETIONS', status: 'NOT_APPLICABLE', baseKind, deletionCount: null, undeclared: [] };
  }
  const result = git(root, ['diff', '--diff-filter=D', '--name-only', base]);
  if (!result.ok) {
    errors.push({ code: 'WORKSPACE_DELETION_DIFF_FAILED', detail: `git diff against ${baseKind} failed` });
    return { id: 'WORKSPACE_DECLARED_DELETIONS', status: 'VIOLATED', baseKind, deletionCount: null, undeclared: [] };
  }
  const deletions = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== '');
  if (deletions.length === 0) {
    return { id: 'WORKSPACE_DECLARED_DELETIONS', status: 'PASS', baseKind, deletionCount: 0, undeclared: [] };
  }
  const taskDirectory = activeTaskDirectory(root);
  let declared = [];
  if (taskDirectory !== null) {
    try {
      declared = parseDeclaredDeletions(fs.readFileSync(path.join(root, taskDirectory, 'SPEC.md'), 'utf8'), heading);
    } catch {
      declared = [];
    }
  }
  const declaredSet = new Set(declared);
  const undeclared = deletions.filter((file) => !declaredSet.has(file));
  for (const file of undeclared.slice(0, maxExamples)) {
    errors.push({
      code: 'WORKSPACE_UNDECLARED_TRACKED_DELETION',
      detail: `tracked file deleted without a declaration in the active task SPEC: ${file}`,
    });
  }
  return {
    id: 'WORKSPACE_DECLARED_DELETIONS',
    status: undeclared.length === 0 ? 'PASS' : 'VIOLATED',
    baseKind,
    deletionCount: deletions.length,
    declaredCount: declared.length,
    undeclared: undeclared.slice(0, maxExamples),
  };
}

function checkIntegrationReadiness(root, self, policy, warnings) {
  const remote = policy?.canonical?.remote ?? 'origin';
  const branch = policy?.canonical?.branch ?? 'main';
  const remoteMain = gitValue(root, ['rev-parse', '--verify', '--quiet', `refs/remotes/${remote}/${branch}`]);
  const headSha = gitValue(root, ['rev-parse', 'HEAD']);
  let baseState = 'UNKNOWN';
  // Base staleness only matters for a LIVE claim that may still integrate. A
  // released record keeps its historical base for audit and must not raise a
  // reconciliation advisory for work that is already closed.
  const baseSha = self !== null && self.holderLive ? (self.record?.baseSha ?? null) : null;
  if (remoteMain !== null && baseSha !== null) {
    if (baseSha === remoteMain) baseState = 'CURRENT';
    else if (git(root, ['merge-base', '--is-ancestor', baseSha, remoteMain]).ok) baseState = 'STALE';
    else baseState = 'DIVERGED';
  } else if (remoteMain !== null && headSha !== null && self === null) {
    baseState = headSha === remoteMain ? 'CURRENT' : 'UNKNOWN';
  }
  if (baseState === 'STALE') {
    warnings.push({ code: 'WORKSPACE_BASE_STALE', detail: `${remote}/${branch} advanced beyond the session base; reconcile by merging before integration` });
  }
  if (baseState === 'DIVERGED') {
    warnings.push({ code: 'WORKSPACE_BASE_DIVERGED', detail: `the session base is not an ancestor of ${remote}/${branch}; stop and reconcile` });
  }
  let canIntegrate = false;
  let reason = 'NOT_AN_OWNED_SESSION';
  if (self !== null && self.class === 'OWNED_SESSION') {
    if (self.clean === false) reason = 'SESSION_WORKTREE_DIRTY';
    else if (remoteMain === null) reason = 'REMOTE_MAIN_UNKNOWN';
    else if (headSha !== null && headSha === remoteMain) reason = 'SESSION_ALREADY_INTEGRATED_OR_EMPTY';
    else if (!git(root, ['merge-base', '--is-ancestor', remoteMain, 'HEAD']).ok) reason = 'REMOTE_MAIN_NOT_CONTAINED';
    else {
      canIntegrate = true;
      reason = 'FAST_FORWARD_AVAILABLE';
    }
  } else if (self !== null && self.isMain) {
    reason = 'CANONICAL_WORKTREE';
  }
  return {
    id: 'WORKSPACE_INTEGRATION_READINESS',
    status: 'PASS',
    remoteMainKnown: remoteMain !== null,
    baseState,
    canIntegrate,
    reason,
  };
}

// ---------------------------------------------------------------------------
// inspection entry point
// ---------------------------------------------------------------------------

/**
 * Read-only inspection of the workspace. Never mutates anything.
 *
 * @param {{ root?: string, policy?: object|null, liveness?: { bootDigest: () => string, processAlive: (pid: number) => boolean } }} [options]
 */
export function inspectWorkspace(options = {}) {
  const requestedRoot = options.root ?? process.cwd();
  const liveness = options.liveness ?? { bootDigest, processAlive };
  const errors = [];
  const warnings = [];

  const toplevel = gitValue(requestedRoot, ['rev-parse', '--show-toplevel']);
  if (toplevel === null) {
    return {
      schemaVersion: WORKSPACE_INTEGRITY_SCHEMA,
      verdict: 'NOT_APPLICABLE',
      reason: 'NOT_A_GIT_WORKTREE',
      self: null,
      invariants: [],
      worktrees: [],
      errors: [],
      warnings: [],
      bootstrapAnswers: null,
    };
  }
  const root = path.resolve(toplevel);
  const loaded = options.policy === undefined
    ? loadPolicy(root)
    : { policy: options.policy, source: 'SUPPLIED' };
  const policy = loaded.policy;
  const policySource = loaded.source;
  if (policy === null) {
    errors.push({ code: 'WORKSPACE_POLICY_INVALID', detail: `${POLICY_RELATIVE_PATH} does not declare the supported schema version` });
  }
  const rawCommonDir = gitValue(root, ['rev-parse', '--git-common-dir']) ?? '.git';
  const commonDir = path.resolve(root, rawCommonDir);
  const rawGitDir = gitValue(root, ['rev-parse', '--git-dir']) ?? '.git';
  const gitDir = path.resolve(root, rawGitDir);

  const listed = git(root, ['worktree', 'list', '--porcelain']);
  if (!listed.ok) {
    errors.push({ code: 'WORKSPACE_WORKTREE_LIST_FAILED', detail: 'git worktree list failed' });
  }
  const entries = parseWorktreePorcelain(listed.stdout);
  const namesByPath = linkedWorktreeNames(commonDir);
  const mainPath = path.basename(commonDir) === '.git' ? path.resolve(path.dirname(commonDir)) : null;

  const worktrees = entries.map((entry) => {
    const resolved = path.resolve(entry.path);
    const linkedName = namesByPath.get(resolved) ?? null;
    const isMain = linkedName === null && (mainPath === null ? entries[0]?.path === entry.path : resolved === mainPath);
    const name = isMain ? 'canonical' : (linkedName ?? `unregistered-${digest24(resolved).slice(0, 8)}`);
    let exists = false;
    let isSymlink = false;
    try {
      isSymlink = fs.lstatSync(resolved).isSymbolicLink();
      exists = fs.statSync(resolved).isDirectory();
    } catch {
      exists = false;
    }
    const recordFile = sessionRecordPath(commonDir, isMain ? null : linkedName, policy);
    const recordState = linkedName === null && !isMain
      ? { present: false, valid: false, problems: ['UNREGISTERED_WORKTREE'], record: null, holderLive: false }
      : readRecord(recordFile, policy, liveness);
    const clean = exists && !entry.bare ? (gitValue(resolved, ['status', '--porcelain']) === null) : null;

    let worktreeClass;
    let classReason = null;
    if (isMain) {
      if (!recordState.present) worktreeClass = 'CANONICAL_MAIN';
      else if (!recordState.valid) {
        worktreeClass = 'UNKNOWN';
        classReason = `canonical session record invalid: ${recordState.problems.join(',')}`;
      } else if (recordState.record.role === 'MAINTENANCE') worktreeClass = 'CANONICAL_MAINTENANCE';
      else {
        worktreeClass = 'UNKNOWN';
        classReason = 'canonical checkout carries a non-maintenance session record';
      }
    } else if (!recordState.present) {
      worktreeClass = 'UNOWNED_WORKTREE';
      classReason = 'no session record';
    } else if (!recordState.valid) {
      worktreeClass = 'UNKNOWN';
      classReason = `session record invalid: ${recordState.problems.join(',')}`;
    } else if (entry.branch !== null && recordState.record.branch !== entry.branch) {
      worktreeClass = 'UNKNOWN';
      classReason = `session record claims branch ${recordState.record.branch} but the worktree is on ${entry.branch}`;
    } else if (recordState.holderLive) {
      worktreeClass = 'OWNED_SESSION';
    } else {
      worktreeClass = 'STALE_SESSION';
      classReason = recordState.record.ownershipState === 'RELEASED' ? 'session released' : 'holder not live';
    }

    return {
      name,
      isMain,
      path: resolved,
      pathDigest: digest24(resolved),
      branch: entry.branch,
      headSha: entry.headSha,
      detached: entry.detached,
      bare: entry.bare,
      locked: entry.locked,
      prunable: entry.prunable,
      exists,
      isSymlink,
      clean,
      class: worktreeClass,
      classReason,
      record: recordState.record,
      recordProblems: recordState.problems,
      holderLive: recordState.holderLive,
    };
  });

  const selfPath = path.resolve(root);
  const self = worktrees.find((worktree) => worktree.path === selfPath) ?? null;
  if (self === null && worktrees.length > 0) {
    errors.push({ code: 'WORKSPACE_SELF_WORKTREE_UNRESOLVED', detail: 'the current worktree is not present in the registration list' });
  }

  const invariants = [
    checkIndexFlags(worktrees, policy, errors),
    checkExclude(commonDir, policy, policySource, errors, warnings),
    checkHooks(commonDir, root, policy, errors),
    checkWorktreeMetadata(worktrees, policy, errors, warnings),
    checkCanonicalProtection(worktrees, policy, errors),
    checkDeclaredDeletions(root, self, policy, errors, warnings),
    checkIntegrationReadiness(root, self, policy, warnings),
  ];

  const sharedDrift = invariants
    .filter((invariant) => ['WORKSPACE_INDEX_FLAGS', 'WORKSPACE_EXCLUDE_POLICY', 'WORKSPACE_HOOKS_POLICY'].includes(invariant.id))
    .some((invariant) => invariant.status === 'VIOLATED');
  const integration = invariants.find((invariant) => invariant.id === 'WORKSPACE_INTEGRATION_READINESS');
  const canonicalInvariant = invariants.find((invariant) => invariant.id === 'WORKSPACE_CANONICAL_PROTECTION');
  const attention = worktrees
    .filter((worktree) => ['STALE_SESSION', 'UNOWNED_WORKTREE', 'UNKNOWN'].includes(worktree.class) || worktree.prunable || !worktree.exists)
    .map((worktree) => ({ name: worktree.name, class: worktree.class, prunable: worktree.prunable, exists: worktree.exists }));

  const verdict = errors.length === 0 ? 'PASS' : 'FAIL';
  return {
    schemaVersion: WORKSPACE_INTEGRITY_SCHEMA,
    verdict,
    reason: verdict === 'PASS' ? 'WORKSPACE_INTEGRITY_SATISFIED' : 'WORKSPACE_INTEGRITY_VIOLATED',
    self: self === null ? null : {
      name: self.name,
      class: self.class,
      classReason: self.classReason,
      isMain: self.isMain,
      branch: self.branch,
      headSha: self.headSha,
      clean: self.clean,
      taskId: self.record?.taskId ?? null,
      sessionId: self.record?.sessionId ?? null,
      campaignId: self.record?.campaignId ?? null,
      role: self.record?.role ?? null,
      baseSha: self.record?.baseSha ?? null,
      ownershipState: self.record?.ownershipState ?? null,
      integrationState: self.record?.integrationState ?? null,
      holderLive: self.holderLive,
    },
    invariants,
    // Absolute machine paths are deliberately excluded from the durable JSON
    // surface; the interactive text renderer prints them for owner action.
    worktrees: worktrees.map((worktree) => ({
      name: worktree.name,
      class: worktree.class,
      classReason: worktree.classReason,
      isMain: worktree.isMain,
      branch: worktree.branch,
      headSha: worktree.headSha,
      pathDigest: worktree.pathDigest,
      exists: worktree.exists,
      isSymlink: worktree.isSymlink,
      prunable: worktree.prunable,
      locked: worktree.locked,
      clean: worktree.clean,
      holderLive: worktree.holderLive,
      taskId: worktree.record?.taskId ?? null,
      sessionId: worktree.record?.sessionId ?? null,
      recordProblems: worktree.recordProblems,
    })),
    bootstrapAnswers: {
      inOwnedImplementationWorktree: self !== null && self.class === 'OWNED_SESSION' && self.record?.role === 'IMPLEMENTATION',
      owningTaskId: self?.record?.taskId ?? null,
      sessionBaseSha: self?.record?.baseSha ?? null,
      sharedGitStateDrifted: sharedDrift,
      baseState: integration?.baseState ?? 'UNKNOWN',
      mayIntegrate: integration?.canIntegrate === true,
      mayIntegrateReason: integration?.reason ?? 'UNKNOWN',
      canonicalMainSafe: canonicalInvariant?.status === 'PASS' && !sharedDrift,
      worktreesRequiringOwnerAttention: attention,
    },
    errors,
    warnings,
    policySource,
    gitDirIsLinked: gitDir !== commonDir,
  };
}

// ---------------------------------------------------------------------------
// text rendering / CLI
// ---------------------------------------------------------------------------

export function renderText(report, worktreePaths = new Map()) {
  const lines = [];
  lines.push(`[workspace] verdict=${report.verdict} reason=${report.reason}`);
  if (report.verdict === 'NOT_APPLICABLE') return lines.join('\n');
  const self = report.self;
  lines.push(self === null
    ? '[workspace] self=UNRESOLVED'
    : `[workspace] self=${self.name} class=${self.class} branch=${self.branch ?? 'DETACHED'} task=${self.taskId ?? 'NONE'} base=${self.baseSha ?? 'NONE'} clean=${String(self.clean)}`);
  for (const invariant of report.invariants) {
    lines.push(`[workspace] ${invariant.id}=${invariant.status}`);
  }
  for (const worktree of report.worktrees) {
    const location = worktreePaths.get(worktree.name);
    lines.push(`[workspace] worktree ${worktree.name} class=${worktree.class} branch=${worktree.branch ?? 'DETACHED'} task=${worktree.taskId ?? 'NONE'} live=${String(worktree.holderLive)}${location === undefined ? '' : ` path=${location}`}`);
  }
  const answers = report.bootstrapAnswers;
  if (answers !== null) {
    lines.push(`[workspace] owned=${String(answers.inOwnedImplementationWorktree)} drift=${String(answers.sharedGitStateDrifted)} base=${answers.baseState} mayIntegrate=${String(answers.mayIntegrate)}:${answers.mayIntegrateReason} canonicalSafe=${String(answers.canonicalMainSafe)} attention=${answers.worktreesRequiringOwnerAttention.length}`);
  }
  for (const warning of report.warnings) lines.push(`[workspace] WARNING: ${warning.code}: ${warning.detail}`);
  for (const error of report.errors) lines.push(`[workspace] ERROR: ${error.code}: ${error.detail}`);
  return lines.join('\n');
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  let command = 'check';
  let root = process.cwd();
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === 'check' || value === 'status') command = value;
    else if (value === '--json') json = true;
    else if (value === '--root') {
      index += 1;
      const supplied = args[index];
      if (supplied === undefined) return { error: 'ROOT_MISSING' };
      root = supplied;
    } else return { error: `UNKNOWN_ARGUMENT:${value}` };
  }
  return { command, root, json };
}

function main() {
  const parsed = parseCliArgs(process.argv);
  if (parsed.error !== undefined) {
    console.error(`[workspace] CONFIG_INVALID: ${parsed.error}`);
    process.exitCode = 2;
    return;
  }
  const report = inspectWorkspace({ root: parsed.root });
  if (parsed.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const paths = new Map();
    const listed = git(parsed.root, ['worktree', 'list', '--porcelain']);
    if (listed.ok) {
      const commonDir = path.resolve(parsed.root, gitValue(parsed.root, ['rev-parse', '--git-common-dir']) ?? '.git');
      const namesByPath = linkedWorktreeNames(commonDir);
      for (const entry of parseWorktreePorcelain(listed.stdout)) {
        const resolved = path.resolve(entry.path);
        paths.set(namesByPath.get(resolved) ?? 'canonical', resolved);
      }
    }
    console.log(renderText(report, paths));
  }
  if (parsed.command === 'check' && report.verdict === 'FAIL') process.exitCode = 1;
}

if (typeof process.argv[1] === 'string' && path.basename(process.argv[1]) === 'workspace-integrity.mjs') {
  main();
}

export { WORKTREE_CLASSES, parseWorktreePorcelain };
