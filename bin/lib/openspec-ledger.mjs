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

/** True when a struck entry's text carries at least one disposition token. */
export function carriesDispositionToken(strikeText) {
  return DISPOSITION_TOKEN_RE.test(String(strikeText ?? ''));
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

/**
 * F-01 completion-ledger agreement. A terminal continuity-v2 task
 * (COMPLETE/BLOCKED) must not leave unchecked non-declared boxes; an active
 * OpenSpec change without a continuity-v2 task is an error (a task without a
 * change stays a warning, because historical task directories are append-only
 * records rather than missing campaigns); a legacy v1 pairing is reported as
 * legacy and never inferred terminal. Read-only: never rewrites a ledger.
 */
export function inspectLedgerAgreement(root) {
  const errors = [];
  const warnings = [];
  const info = [];
  const changeIds = listActiveChangeIds(root);
  const archivedIds = new Set(listArchivedChangeIds(root));
  for (const changeId of changeIds) {
    const text = readFileIfPresent(path.join(root, 'openspec', 'changes', changeId, 'tasks.md')) ?? '';
    const { open, done, declaredNotInScope, undispositioned } = parseLedgerTasks(text);
    const stateText = readFileIfPresent(path.join(root, '.agent', 'tasks', changeId, 'STATE.md'));
    if (undispositioned.length > 0) {
      // A-21: a strike without a disposition token is not settled. Reported
      // always, so a hidden backlog cannot look closed. The full drain of the
      // legacy population is the M13 ledger closure.
      const lines = undispositioned.map((entry) => entry.line).join(', ');
      warnings.push(
        `LEDGER_UNDISPOSITIONED_ITEM: change ${changeId} leaves ${undispositioned.length} struck entr${undispositioned.length === 1 ? 'y' : 'ies'} without a disposition token at line${undispositioned.length === 1 ? '' : 's'} ${lines}`,
      );
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
