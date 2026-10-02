// Shared OpenSpec ledger parsing for Nightwatch CLIs.
//
// One parser for the checkbox ledger of `openspec/changes/<id>/tasks.md`, used
// by both the completion-ledger agreement check (`bin/agent-state.mjs`) and the
// open-work report (`bin/nightwatch-status.mjs`). A strikethrough entry
// (`- [ ] ~~…~~`) is SETTLED only when its strike text carries a disposition
// token (A-21 / D1: every item ends in exactly one recorded disposition;
// `DEFERRED` is no longer accepted). A strike without a token is never
// settled: it is reported as `LEDGER_UNDISPOSITIONED_ITEM` and counted as
// undispositioned open work. A strikethrough may wrap across continuation
// lines.
//
// Read-only: this module only reads filesystem paths it is given.

import fs from 'node:fs';
import path from 'node:path';
import { normalizeTaskStatus, PROTOCOL_V2 } from '../agent-continuity-protocol.mjs';

export const LEDGER_TERMINAL_STATUSES = Object.freeze(['COMPLETE', 'BLOCKED']);
export const LEDGER_MISSING_TASK_STATUS = 'MISSING_TASK';
export const OPEN_WORK_MODEL_VERSION = 'nightwatch.open-work-report.v1';

/**
 * The one disposition vocabulary (design D1, extended by the audit's own
 * RECONCILE / RATCHET / EXECUTE forms). A struck item is settled only when
 * its strike text carries at least one of these tokens. `DEFERRED` is
 * deliberately absent: it named a hidden backlog, not a disposition.
 */
export const LEDGER_DISPOSITION_TOKENS = Object.freeze([
  'FIX',
  'NARROW',
  'QUARANTINE',
  'ACCEPTED_RESIDUAL',
  'COMPLETED_LATER',
  'SUPERSEDED',
  'HISTORICAL',
  'NON_GOAL',
  'EXTERNAL',
  'RECONCILE',
  'RATCHET',
  'EXECUTE',
]);

const DISPOSITION_TOKEN_RE = new RegExp(`\\b(?:${LEDGER_DISPOSITION_TOKENS.join('|')})\\b`);

/**
 * True when a struck entry carries a disposition token as a TRAILING MARKER:
 * the token must sit AFTER the entry's last closing strike (`~~`), outside the
 * struck text. A token that merely appears inside the struck task text (for
 * example a task whose own wording says "FIX" or "EXECUTE") is not a
 * disposition and never settles the entry (VA-04 / corrections task 5.4).
 */
export function carriesDispositionToken(strikeText) {
  const text = String(strikeText ?? '');
  const lastStrike = text.lastIndexOf('~~');
  if (lastStrike === -1) return false;
  return DISPOSITION_TOKEN_RE.test(text.slice(lastStrike + 2));
}

const OPEN_LINE_RE = /^\s*-\s*\[ \]\s*(.*)$/;
const DONE_LINE_RE = /^\s*-\s*\[[xX]\]/;
const ARCHIVE_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
const EXTERNAL_BLOCKER_RE = /\b(?:EXTERNAL|BLOCKED_EXTERNAL|owner|authorization|credential|cookie|access|CI|DEV|organization|network|egress|GCP|GKE)\b/i;

function readFileIfPresent(file) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Parse one tasks.md ledger. Returns the open (non-declared) entries with
 * their line numbers, the completed count, the settled struck count
 * (`declaredNotInScope`, disposition token present) and the UNDISPOSITIONED
 * struck entries (no token — never settled). Pure over text; deterministic.
 */
export function parseLedgerTasks(tasksText) {
  const lines = String(tasksText ?? '').split(/\r?\n/);
  const open = [];
  const undispositioned = [];
  let done = 0;
  let declaredNotInScope = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const openMatch = OPEN_LINE_RE.exec(line);
    if (openMatch) {
      let entryText = openMatch[1];
      let cursor = index + 1;
      while (
        cursor < lines.length
        && /^\s+/.test(lines[cursor])
        && !/^\s*-\s*\[/.test(lines[cursor])
        && !/^\s*#/.test(lines[cursor])
      ) {
        entryText += `\n${lines[cursor]}`;
        cursor += 1;
      }
      if (/~~[\s\S]*?~~/.test(entryText)) {
        if (carriesDispositionToken(entryText)) declaredNotInScope += 1;
        else undispositioned.push({ line: index + 1, text: openMatch[1].trim().slice(0, 160) });
      } else {
        open.push({ line: index + 1, text: openMatch[1].trim().slice(0, 160) });
      }
      continue;
    }
    if (DONE_LINE_RE.test(line)) done += 1;
  }
  return { open, done, declaredNotInScope, undispositioned };
}

/** First non-empty line of the STATE `## Blockers` section, or null. */
export function parseBlockersSection(stateText) {
  const lines = String(stateText ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## Blockers');
  if (start === -1) return null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (/^##\s/.test(trimmed)) return null;
    if (trimmed === '') continue;
    if (/^none\b/i.test(trimmed)) return null;
    return trimmed.replace(/\s+/g, ' ').slice(0, 240);
  }
  return null;
}

export function classifyBlocker(blockerText) {
  if (blockerText === null || blockerText === undefined) return 'NONE';
  return EXTERNAL_BLOCKER_RE.test(blockerText) ? 'EXTERNAL' : 'INTERNAL';
}

/** Active (non-archived) change ids that carry a tasks.md ledger. */
export function listActiveChangeIds(root) {
  const changesRoot = path.join(root, 'openspec', 'changes');
  let entries = [];
  try {
    entries = fs.readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const ids = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    if (readFileIfPresent(path.join(changesRoot, entry.name, 'tasks.md')) === null) continue;
    ids.push(entry.name);
  }
  return ids.sort();
}

/** Archived change ids, with the date prefix stripped, for orphan pairing. */
export function listArchivedChangeIds(root) {
  const archiveRoot = path.join(root, 'openspec', 'changes', 'archive');
  let entries = [];
  try {
    entries = fs.readdirSync(archiveRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.replace(ARCHIVE_DATE_PREFIX_RE, ''));
}

/**
 * Per-change open-work input for the status surface. Includes every active
 * change whose continuity-v2 task status is non-terminal (or missing): the
 * change id, the state status, the open count net of DECLARED_NOT_IN_SCOPE
 * entries, the declared count, and the blocker with its internal/external
 * class. Terminal ledgers are omitted here; their disagreement is the
 * agreement check's failure, not a status row.
 */
export function collectOpenWorkInput(root) {
  const entries = [];
  for (const changeId of listActiveChangeIds(root)) {
    const tasksText = readFileIfPresent(path.join(root, 'openspec', 'changes', changeId, 'tasks.md')) ?? '';
    const { open, done, declaredNotInScope, undispositioned } = parseLedgerTasks(tasksText);
    const stateText = readFileIfPresent(path.join(root, '.agent', 'tasks', changeId, 'STATE.md'));
    if (stateText === null) {
      entries.push({
        changeId,
        taskStatus: LEDGER_MISSING_TASK_STATUS,
        openCount: open.length,
        declaredNotInScope,
        undispositionedCount: undispositioned.length,
        doneCount: done,
        blocker: 'missing continuity-v2 task record',
        blockerClass: 'INTERNAL',
      });
      continue;
    }
    const statusMatch = /^Status:\s*(\S+)/m.exec(stateText);
    const taskStatus = normalizeTaskStatus(statusMatch === null ? undefined : statusMatch[1]);
    // A-21 / R2-62: nothing is hidden. BLOCKED tasks are their own open-work
    // class (previously skipped and invisible), and a terminal ledger with
    // undispositioned strikes keeps reporting them — the strikes are not
    // settled, so the campaign is not closed.
    if (taskStatus === 'COMPLETE' && undispositioned.length === 0) continue;
    const blocker = parseBlockersSection(stateText);
    entries.push({
      changeId,
      taskStatus: taskStatus ?? 'UNKNOWN',
      openCount: open.length,
      declaredNotInScope,
      undispositionedCount: undispositioned.length,
      doneCount: done,
      blocker,
      blockerClass: classifyBlocker(blocker),
    });
  }
  return entries;
}

export const LEGACY_DRAIN_PATH = 'config/ledger-legacy-drain.v1.json';
export const LEGACY_DRAIN_SCHEMA = 'nightwatch.ledger-legacy-drain.v1';

/**
 * The declared per-change ceilings of legacy undispositioned strikes on
 * TERMINAL changes (VA-04 ratchet). An absent file is an empty ceiling set;
 * a malformed one is an error and grants nothing.
 * @returns {{ ceilings: Map<string, number>, errors: string[] }}
 */
function loadLegacyDrainCeilings(root) {
  const ceilings = new Map();
  const errors = [];
  const raw = readFileIfPresent(path.join(root, LEGACY_DRAIN_PATH));
  if (raw === null) return { ceilings, errors };
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    errors.push(`LEDGER_LEGACY_DRAIN_UNREADABLE: ${LEGACY_DRAIN_PATH} is not valid JSON`);
    return { ceilings, errors };
  }
  if (record?.schemaVersion !== LEGACY_DRAIN_SCHEMA || record.ceilings === null || typeof record.ceilings !== 'object' || Array.isArray(record.ceilings)) {
    errors.push(`LEDGER_LEGACY_DRAIN_UNREADABLE: ${LEGACY_DRAIN_PATH} does not carry schema ${LEGACY_DRAIN_SCHEMA} with a ceilings object`);
    return { ceilings, errors };
  }
  for (const [changeId, value] of Object.entries(record.ceilings)) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) ceilings.set(changeId, value);
    else errors.push(`LEDGER_LEGACY_DRAIN_ENTRY_INVALID: ${changeId} needs a positive integer ceiling`);
  }
  return { ceilings, errors };
}

/**
 * F-01 completion-ledger agreement. A terminal continuity-v2 task
 * (COMPLETE/BLOCKED) must not leave unchecked non-declared boxes; an active
 * OpenSpec change without a continuity-v2 task is an error (a task without a
 * change stays a warning, because historical task directories are append-only
 * records rather than missing campaigns); a legacy v1 pairing is reported as
 * legacy and never inferred terminal. Read-only: never rewrites a ledger.
 */
export function inspectLedgerAgreement(root, readBlobAtCommit = null) {
  const errors = [];
  const warnings = [];
  const info = [];
  const changeIds = listActiveChangeIds(root);
  const archivedIds = new Set(listArchivedChangeIds(root));
  const legacyDrain = loadLegacyDrainCeilings(root);
  errors.push(...legacyDrain.errors);
  // R3-10 / corrections task 8.9: the legacy ceiling is DOWN-ONLY against
  // history. A ceiling raised, or a new changeId added, after origin/main is a
  // relaxation of the ratchet; only lowering (or removal) is admissible.
  if (readBlobAtCommit !== null && legacyDrain.ceilings.size > 0) {
    const historical = readBlobAtCommit('origin/main', LEGACY_DRAIN_PATH);
    if (historical === null || historical === undefined) {
      warnings.push('LEDGER_LEGACY_DRAIN_HISTORY_UNRESOLVED: origin/main does not expose the legacy drain ceilings; the down-only check was not evaluated');
    } else {
      let parsed = null;
      try {
        parsed = JSON.parse(historical);
      } catch {
        parsed = null;
      }
      if (parsed === null || typeof parsed !== 'object' || parsed.ceilings === null || typeof parsed.ceilings !== 'object' || Array.isArray(parsed.ceilings)) {
        warnings.push('LEDGER_LEGACY_DRAIN_HISTORY_UNRESOLVED: the origin/main legacy drain file is unreadable; the down-only check was not evaluated');
      } else {
        for (const [changeId, ceiling] of legacyDrain.ceilings) {
          const previous = parsed.ceilings[changeId];
          if (previous === undefined) {
            errors.push(`LEDGER_LEGACY_DRAIN_CEILING_ADDED: change ${changeId} gained a legacy ceiling ${ceiling} after origin/main; the ratchet only turns down`);
          } else if (typeof previous === 'number' && ceiling > previous) {
            errors.push(`LEDGER_LEGACY_DRAIN_CEILING_RAISED: change ${changeId} raised its legacy ceiling ${previous} -> ${ceiling}; the ratchet only turns down`);
          }
        }
      }
    }
  }
  for (const changeId of changeIds) {
    const text = readFileIfPresent(path.join(root, 'openspec', 'changes', changeId, 'tasks.md')) ?? '';
    const { open, done, declaredNotInScope, undispositioned } = parseLedgerTasks(text);
    const stateText = readFileIfPresent(path.join(root, '.agent', 'tasks', changeId, 'STATE.md'));
    const pairedStatus = normalizeTaskStatus((/^Status:\s*(\S+)/m.exec(stateText ?? '') ?? [])[1]);
    if (undispositioned.length > 0) {
      // A-21 / VA-04: a strike without a trailing disposition token is not
      // settled. Reported always, so a hidden backlog cannot look closed; at a
      // TERMINAL paired task it is an ERROR (a terminal phase cannot carry an
      // unsettled entry). The legacy population of non-terminal changes is
      // drained by the M13 ledger closure.
      const lines = undispositioned.map((entry) => entry.line).join(', ');
      const message = `LEDGER_UNDISPOSITIONED_ITEM: change ${changeId} leaves ${undispositioned.length} struck entr${undispositioned.length === 1 ? 'y' : 'ies'} without a disposition token at line${undispositioned.length === 1 ? '' : 's'} ${lines}`;
      if (stateText !== null && LEDGER_TERMINAL_STATUSES.includes(pairedStatus)) {
        // A terminal paired task is an ERROR — except for the LEGACY population
        // whose drain is the parent's M13 ledger closure: a declared per-change
        // ceiling (config/ledger-legacy-drain.v1.json) that may only turn DOWN.
        const ceiling = legacyDrain.ceilings.get(changeId);
        if (ceiling === undefined) errors.push(message);
        else if (undispositioned.length > ceiling) errors.push(`${message} (legacy ceiling ${ceiling}; the ratchet only turns down)`);
        else if (undispositioned.length < ceiling) errors.push(`LEDGER_LEGACY_DRAIN_CEILING_STALE: change ${changeId} has ${undispositioned.length} undispositioned entries but its ceiling is ${ceiling}; lower it in the same change`);
        else warnings.push(`LEDGER_UNDISPOSITIONED_ITEM_LEGACY: change ${changeId} still carries its ${ceiling} declared legacy undispositioned entries (drained by the parent M13 ledger closure)`);
      } else {
        warnings.push(message);
      }
    }
    if (stateText === null) {
      errors.push(
        `LEDGER_CHANGE_WITHOUT_TASK: change ${changeId} has no .agent/tasks/${changeId}/STATE.md (open=${open.length} declared_not_in_scope=${declaredNotInScope} done=${done})`,
      );
      continue;
    }
    const statusMatch = /^Status:\s*(\S+)/m.exec(stateText);
    const taskStatus = normalizeTaskStatus(statusMatch === null ? undefined : statusMatch[1]);
    const protocolMatch = /^CONTINUITY_PROTOCOL_VERSION:\s*(\S+)/m.exec(stateText);
    if (protocolMatch === null || protocolMatch[1] !== PROTOCOL_V2) {
      warnings.push(
        `LEDGER_LEGACY_CHANGE: change ${changeId} pairs with a legacy v1 task record; terminal inference is not applied (open=${open.length})`,
      );
      continue;
    }
    if (LEDGER_TERMINAL_STATUSES.includes(taskStatus) && open.length > 0) {
      const lines = open.map((entry) => entry.line).join(', ');
      errors.push(
        `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS: change ${changeId} pairs with task ${changeId} (Status: ${taskStatus}) but tasks.md leaves ${open.length} unchecked non-declared entr${open.length === 1 ? 'y' : 'ies'} at line${open.length === 1 ? '' : 's'} ${lines}`,
      );
    } else if (!LEDGER_TERMINAL_STATUSES.includes(taskStatus)) {
      info.push(
        `LEDGER_OPEN_ITEMS: change ${changeId} task=${taskStatus ?? 'UNKNOWN'} open=${open.length} declared_not_in_scope=${declaredNotInScope} done=${done}`,
      );
    }
  }
  const tasksRoot = path.join(root, '.agent', 'tasks');
  let taskEntries = [];
  try {
    taskEntries = fs.readdirSync(tasksRoot, { withFileTypes: true });
  } catch {
    taskEntries = [];
  }
  const changeSet = new Set(changeIds);
  const orphanV2 = [];
  let orphanLegacy = 0;
  for (const entry of taskEntries) {
    if (!entry.isDirectory()) continue;
    if (changeSet.has(entry.name) || archivedIds.has(entry.name)) continue;
    const stateText = readFileIfPresent(path.join(tasksRoot, entry.name, 'STATE.md'));
    if (stateText === null) {
      orphanLegacy += 1;
      continue;
    }
    const protocolMatch = /^CONTINUITY_PROTOCOL_VERSION:\s*(\S+)/m.exec(stateText);
    if (protocolMatch !== null && protocolMatch[1] === PROTOCOL_V2) orphanV2.push(entry.name);
    else orphanLegacy += 1;
  }
  for (const id of orphanV2.slice(0, 32)) {
    warnings.push(`LEDGER_TASK_WITHOUT_CHANGE: task ${id} has no openspec/changes/${id}`);
  }
  if (orphanV2.length > 32) {
    warnings.push(`LEDGER_TASK_WITHOUT_CHANGE: ${orphanV2.length - 32} additional v2 orphan task(s) not listed`);
  }
  if (orphanLegacy > 0) {
    warnings.push(
      `LEDGER_TASK_WITHOUT_CHANGE: ${orphanLegacy} legacy v1/historical task directories have no matching OpenSpec change`,
    );
  }
  return { errors, warnings, info };
}

// ---------------------------------------------------------------------------
// VA-01 / corrections task 5.2 — the stable task-ID ledger.
//
// A task line's `N.M` prefix is its stable identity: other records cite it, and
// a campaign that strips or renumbers IDs silently detaches every citation.
// `config/task-id-ledger.v1.json` names, per change, the bootstrap commit whose
// tasks.md is the ID baseline; every ID present there must still open a task
// line in the current file. IDs may be ADDED (new task lines); none may vanish.
// ---------------------------------------------------------------------------

export const TASK_ID_LEDGER_PATH = 'config/task-id-ledger.v1.json';
export const TASK_ID_LEDGER_SCHEMA = 'nightwatch.task-id-ledger.v1';
// R5-17 / review-5 D-1: the ID may carry a letter-prefixed group (`A1.1`, `B1.1`,
// `C.1`). The letter class is DELIBERATELY bounded to A-C, the groups a campaign
// declares: the legacy `M<n>.<m>` milestone IDs of an earlier change were
// rewritten before the stable-ID rule existed, and reading them now would turn
// that history into fresh violations. Widening the class is an owner decision.
const TASK_LINE_ID_RE = /^\s*-\s*\[[ xX]\]\s*(?:~~)?((?:[A-C]\d*|\d+)\.\d+[a-z]?)\s/;

/** The ordered, de-duplicated stable IDs that open a task line in `tasksText`. */
/**
 * R3-10 / corrections task 8.9 — the bounded legacy reword exemption. These
 * IDs were reworded before the reword rule existed, during their campaigns'
 * normal evolution; they are inert (the exemption covers only the exact
 * change:ID pair, never a stripped ID and never a new rewording). A future
 * change may add an ANNOTATION (a bracketed segment or an appended DONE note)
 * but must preserve the original task text as a prefix.
 */
export const LEGACY_REWORD_EXEMPTIONS = Object.freeze([
  'nightwatch-credential-use-binding-successor-v1:3.3',
  'nightwatch-credential-use-binding-successor-v1:4.1',
  'nightwatch-final-completion-corrections-v1:2.7',
  'nightwatch-production-completion-programme-v1:13.1',
  'nightwatch-production-completion-programme-v1:21.8',
  'nightwatch-shard-temp-isolation-v1:2.2',
  'nightwatch-shard-temp-isolation-v1:2.3',
  'nightwatch-shard-temp-isolation-v1:3.2',
]);

/**
 * R3-10 / corrections task 8.9 — the bounded legacy strike exemption. These
 * IDs were struck (declared not in scope) after their bootstrap, before the
 * strike rule existed; each is recorded exactly, so a FUTURE strike of an
 * in-scope ID fails. The exemptions cover only the strike check.
 */
export const LEGACY_STRIKE_EXEMPTIONS = Object.freeze([
  'nightwatch-child-process-census-indirection-v1:3.3',
  'nightwatch-child-process-census-indirection-v1:4.1',
  'nightwatch-child-process-census-indirection-v1:4.2',
  'nightwatch-exhaustive-repository-audit-proposals-v1:11.7',
  'nightwatch-proxy-event-firewall-v1:3.3',
  'nightwatch-proxy-event-firewall-v1:4.1',
  'nightwatch-proxy-event-firewall-v1:4.2',
  'nightwatch-real-source-expectation-authority-integrity-v1:2.6',
  'nightwatch-run-evidence-transaction-successor-v1:3.3',
  'nightwatch-run-evidence-transaction-successor-v1:4.1',
  'nightwatch-run-evidence-transaction-successor-v1:4.2',
  'nightwatch-semantic-receipt-acceptance-integrity-v1:2.6',
  'nightwatch-shard-certification-integrity-v1:4.1',
  'nightwatch-shard-certification-integrity-v1:4.2',
  'nightwatch-shard-certification-integrity-v1:4.3',
]);

/** The struck-ID form: a checkbox whose ID is crossed out. */
const STRUCK_TASK_ID_RE = /^\s*-\s*\[[ xX]\]\s*~~\s*((?:[A-C]\d*|\d+)\.\d+[a-z]?)/;

/**
 * The task text per ID, with the checkbox/ID prefix removed.
 * @param {string} tasksText
 * @returns {Map<string, string>}
 */
export function taskTextsById(tasksText) {
  const byId = new Map();
  for (const line of String(tasksText ?? '').split(/\r?\n/)) {
    const match = TASK_LINE_ID_RE.exec(line);
    if (match === null) continue;
    if (!byId.has(match[1])) byId.set(match[1], line.slice(match[0].length).trim());
  }
  return byId;
}

/**
 * The annotation-normalized task text: bracketed segments are annotations
 * (removed), unicode dashes are normalized, whitespace collapsed.
 * @param {string} text
 */
export function normalizeTaskText(text) {
  return String(text ?? '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function collectTaskIds(tasksText) {
  const ids = [];
  const seen = new Set();
  for (const line of String(tasksText ?? '').split(/\r?\n/)) {
    const match = TASK_LINE_ID_RE.exec(line);
    if (match === null) continue;
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Baseline IDs that no longer open a task line in the current text. */
export function taskIdLedgerViolations(baselineText, currentText) {
  const current = new Set(collectTaskIds(currentText));
  return collectTaskIds(baselineText).filter((id) => !current.has(id));
}

/**
 * Whether `openspec/changes/archive/<YYYY-MM-DD>-<changeId>/` exists.
 * @param {string} root
 * @param {string} changeId
 */
function isArchivedChange(root, changeId) {
  try {
    return fs.readdirSync(path.join(root, 'openspec', 'changes', 'archive'), { withFileTypes: true })
      .some((entry) => entry.isDirectory() && entry.name === entry.name.slice(0, 11) + changeId && /^\d{4}-\d{2}-\d{2}-/.test(entry.name));
  } catch {
    return false;
  }
}

/**
 * Check every ledger entry. `readBlobAtCommit(sha, relativePath)` returns the
 * file text at that commit or null when it cannot be read; it is injected so
 * this module stays free of process authority. An entry whose change is
 * archived (no active tasks.md) is skipped as information. An unreadable
 * baseline (a shallow checkout) is a WARNING, never a silent pass and never a
 * false error.
 * @returns {{ errors: string[], warnings: string[], info: string[] }}
 */
export function inspectTaskIdLedger(root, readBlobAtCommit) {
  const errors = [];
  const warnings = [];
  const info = [];
  const raw = readFileIfPresent(path.join(root, TASK_ID_LEDGER_PATH));
  if (raw === null) {
    // A repository with no active change has no task IDs to guard; one WITH an
    // active change must carry the ledger, or the guard is silently absent.
    if (listActiveChangeIds(root).length === 0) {
      info.push(`LEDGER_TASK_ID_LEDGER_NOT_APPLICABLE: no active change; ${TASK_ID_LEDGER_PATH} is not required`);
    } else {
      errors.push(`LEDGER_TASK_ID_LEDGER_MISSING: ${TASK_ID_LEDGER_PATH} is absent; stable task IDs are unguarded`);
    }
    return { errors, warnings, info };
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    errors.push(`LEDGER_TASK_ID_LEDGER_UNREADABLE: ${TASK_ID_LEDGER_PATH} is not valid JSON`);
    return { errors, warnings, info };
  }
  if (record?.schemaVersion !== TASK_ID_LEDGER_SCHEMA || !Array.isArray(record.changes)) {
    errors.push(`LEDGER_TASK_ID_LEDGER_UNREADABLE: ${TASK_ID_LEDGER_PATH} does not carry schema ${TASK_ID_LEDGER_SCHEMA} with a changes list`);
    return { errors, warnings, info };
  }
  for (const entry of record.changes) {
    const changeId = typeof entry?.changeId === 'string' ? entry.changeId : '';
    const sha = typeof entry?.bootstrapSha === 'string' ? entry.bootstrapSha : '';
    if (!/^[a-z0-9][a-z0-9-]*$/.test(changeId) || !/^[0-9a-f]{40}$/.test(sha)) {
      errors.push(`LEDGER_TASK_ID_LEDGER_ENTRY_INVALID: ${JSON.stringify(changeId)} needs a change id and a 40-hex bootstrapSha`);
      continue;
    }
    const relative = `openspec/changes/${changeId}/tasks.md`;
    const current = readFileIfPresent(path.join(root, relative));
    if (current === null) {
      // R5-10 / review-5 A8.1: an ARCHIVED change's entry is a stale pin (the review-4 entry
      // outlived its archive), detected here instead of being skipped as information. The
      // archive step of a child campaign removes its own entry in the same change.
      if (isArchivedChange(root, changeId)) {
        errors.push(`LEDGER_TASK_ID_ARCHIVED_ENTRY: change ${changeId} is archived under openspec/changes/archive; remove its entry from ${TASK_ID_LEDGER_PATH} (an archived change's IDs are no longer enforced)`);
        continue;
      }
      info.push(`LEDGER_TASK_ID_CHANGE_NOT_ACTIVE: change ${changeId} has no active tasks.md; its ID baseline is not enforced`);
      continue;
    }
    const baseline = readBlobAtCommit(sha, relative);
    if (baseline === null || baseline === undefined) {
      // R3-10 / corrections task 8.9: an unresolvable bootstrap FAILS — a
      // warning let a shallow or rewritten checkout disable the guard.
      errors.push(`LEDGER_TASK_ID_BASELINE_UNRESOLVABLE: bootstrap ${sha.slice(0, 8)} of change ${changeId} cannot be read; stable IDs cannot be verified`);
      continue;
    }
    const missing = taskIdLedgerViolations(baseline, current);
    if (missing.length > 0) {
      errors.push(`LEDGER_TASK_ID_STRIPPED: change ${changeId} lost stable task id${missing.length === 1 ? '' : 's'} ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` (+${missing.length - 12} more)` : ''} present at bootstrap ${sha.slice(0, 8)}`);
    }
    // R3-10 / corrections task 8.9: an ID that was IN SCOPE at bootstrap may
    // not be struck out later — that silently converts open work into a
    // declared-not-in-scope strike. The strike convention is legitimate only
    // when the ID was already struck at bootstrap.
    const struckAtBootstrap = new Set();
    for (const line of baseline.split(/\r?\n/)) {
      const struck = STRUCK_TASK_ID_RE.exec(line);
      if (struck !== null) struckAtBootstrap.add(struck[1]);
    }
    for (const line of current.split(/\r?\n/)) {
      const struck = STRUCK_TASK_ID_RE.exec(line);
      if (struck !== null && !struckAtBootstrap.has(struck[1]) && !LEGACY_STRIKE_EXEMPTIONS.includes(`${changeId}:${struck[1]}`)) {
        errors.push(`LEDGER_TASK_ID_STRUCK: change ${changeId} strikes task id ${struck[1]}, which was in scope at bootstrap ${sha.slice(0, 8)}; striking it silently declares it out of scope`);
      }
    }
    // R3-10: rewording or swapping the text under a stable ID is detected by
    // comparing the annotation-normalized text with the bootstrap text; only
    // the bounded legacy exemptions may differ. A TERMINAL change's wording is
    // historical record (its campaign is closed), so the guard applies to the
    // changes still in flight — exactly where a reword can hide work.
    const stateText = readFileIfPresent(path.join(root, '.agent', 'tasks', changeId, 'STATE.md'));
    const stateStatus = stateText === null ? null : /^Status:\s*(\S+)/m.exec(stateText)?.[1] ?? null;
    const terminal = normalizeTaskStatus(stateStatus) === 'COMPLETE';
    if (!terminal) {
      const baselineTexts = taskTextsById(baseline);
      const currentTexts = taskTextsById(current);
      for (const [id, baselineText] of baselineTexts) {
        const currentText = currentTexts.get(id);
        if (currentText === undefined) continue; // already reported as stripped
        if (LEGACY_REWORD_EXEMPTIONS.includes(`${changeId}:${id}`)) continue;
        const expected = normalizeTaskText(baselineText);
        const actual = normalizeTaskText(currentText);
        if (expected !== '' && !actual.startsWith(expected)) {
          errors.push(`LEDGER_TASK_ID_REWORDED: change ${changeId} task ${id} no longer preserves its bootstrap text (annotations are allowed; rewording is not)`);
        }
      }
    }
  }
  // R3-10: EVERY active change must carry a ledger entry, not only the listed
  // ones — an unlisted change's IDs would otherwise be silently unguarded.
  const listed = new Set(record.changes.map((entry) => (typeof entry?.changeId === 'string' ? entry.changeId : '')).filter((id) => id !== ''));
  for (const changeId of listActiveChangeIds(root)) {
    if (!listed.has(changeId)) {
      errors.push(`LEDGER_TASK_ID_LEDGER_ENTRY_MISSING: active change ${changeId} has no task-ID ledger entry; its stable IDs are unguarded`);
    }
  }
  return { errors, warnings, info };
}
