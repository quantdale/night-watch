#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Nightwatch agent-continuity protocol v2 — pure parsing/semantic layer.
//
// This module is intentionally FREE of fs/git/network access: it implements
// deterministic parsing (key-value records with locations, Markdown H2
// sections with fenced-code tracking, structured report fields) and the
// COMPLETE / BLOCKED / IN_PROGRESS task state machines. Git/process/
// filesystem authority stays in bin/agent-state.mjs, which imports this
// module and renders diagnostics.
//
// Protocol: nightwatch.agent-continuity.v2
// ---------------------------------------------------------------------------

export const PROTOCOL_V2 = 'nightwatch.agent-continuity.v2';
export const PROTOCOL_LEGACY = 'LEGACY_CONTINUITY_V1';

export const TASK_STATUSES = new Set(['NONE', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE']);

// Canonical human-readable continuity fields (exact keys as used in repo
// task files). Together with the UPPER_SNAKE pattern these are the ONLY
// structured keys subject to duplicate detection and placeholder scanning.
const KNOWN_HUMAN_FIELDS = new Set([
  'Task ID',
  'Phase',
  'Title',
  'Status',
  'Task directory',
  'Starting SHA',
  'Current milestone',
  'Last checkpoint',
  'Next action',
  'Authorization class',
  'Branch',
  'Current SHA',
  'Last validated implementation SHA',
  'Last substantive checkpoint SHA',
  'Last documentation checkpoint SHA',
  'Live HEAD authority',
  'Current local/remote HEAD',
]);

const UPPER_SNAKE_RE = /^[A-Z][A-Z0-9_]{1,79}$/;

export function isCanonicalKey(key) {
  const k = String(key ?? '').trim();
  return KNOWN_HUMAN_FIELDS.has(k) || UPPER_SNAKE_RE.test(k);
}

// ---------------------------------------------------------------------------
// Key-value parsing with locations (replaces first-occurrence semantics).
// ---------------------------------------------------------------------------

export function parseKeyValuesWithLocations(text) {
  const records = [];
  const lines = String(text ?? '').split(/\r?\n/);
  let inFence = false;
  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (trimmed === '' || trimmed.startsWith('|') || trimmed.startsWith('>') || trimmed.startsWith('#')) return;
    const match = /^([^:#][^:]*):\s*(.*)$/.exec(trimmed);
    if (!match) return;
    const key = match[1].trim();
    if (!isCanonicalKey(key)) return;
    records.push({ key, value: match[2].trim(), line: lineNumber });
  });
  const byKey = new Map();
  for (const record of records) {
    if (!byKey.has(record.key)) byKey.set(record.key, []);
    byKey.get(record.key).push(record);
  }
  return { records, byKey };
}

export function findDuplicateFields(parsed) {
  const duplicates = [];
  for (const [key, occurrences] of parsed.byKey) {
    if (occurrences.length > 1) {
      duplicates.push({
        key,
        lines: occurrences.map((record) => record.line),
        values: occurrences.map((record) => record.value),
      });
    }
  }
  return duplicates;
}

export function fieldValue(parsed, key) {
  const records = parsed.byKey.get(key);
  return records && records.length > 0 ? records[0].value : undefined;
}

export function allFieldValues(parsed, key) {
  const records = parsed.byKey.get(key) ?? [];
  return records.map((record) => record.value);
}

// ---------------------------------------------------------------------------
// Markdown H2 section parser (repository-native task files only).
// ---------------------------------------------------------------------------

export function parseMarkdownSections(text) {
  const sections = new Map();
  const fencedLines = new Set();
  const lines = String(text ?? '').split(/\r?\n/);
  let inFence = false;
  let current = null;
  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      fencedLines.add(lineNumber);
      return;
    }
    if (inFence) {
      fencedLines.add(lineNumber);
      return;
    }
    const h2 = /^##\s+(.+)$/.exec(trimmed);
    if (h2) {
      current = h2[1].trim();
      sections.set(current, { start: lineNumber, end: lineNumber, lines: [] });
      return;
    }
    if (current) {
      const entry = sections.get(current);
      entry.end = lineNumber;
      entry.lines.push({ lineNumber, text: raw });
    }
  });
  return { sections, fencedLines };
}

// Body lines of a section excluding fenced code, blockquotes and table rows.
export function sectionBodyLines(section) {
  return (section?.lines ?? []).filter(({ text }) => {
    const trimmed = text.trim();
    return !trimmed.startsWith('```') && !trimmed.startsWith('>') && !trimmed.startsWith('|');
  });
}

export function sectionBodyText(section) {
  return sectionBodyLines(section ?? { lines: [] })
    .map(({ text }) => text)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Text normalization for token matching (deterministic, no NLP).
// ---------------------------------------------------------------------------

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/[`*_]/g, ' ')
    .replace(/^[\s\-•>#]+/, '')
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Status normalization.
// ---------------------------------------------------------------------------

export function normalizeTaskStatus(value) {
  const first = String(value ?? '').trim().split(/\s+/)[0].toUpperCase();
  return TASK_STATUSES.has(first) ? first : null;
}

// ---------------------------------------------------------------------------
// Phase-status key derivation.
// ---------------------------------------------------------------------------

export function phaseToken(phase) {
  const first = String(phase ?? '').trim().split(/\s+/)[0];
  return first;
}

export function derivePhaseStatusKey(phase) {
  const token = phaseToken(phase);
  const normalized = token.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return normalized === '' ? null : `PHASE_${normalized}_STATUS`;
}

// ---------------------------------------------------------------------------
// Terminal-token matchers (small explicit sets).
// ---------------------------------------------------------------------------

const NONTERMINAL_WORDS = /\b(?:pending|in progress|not started|to be done|todo|awaiting|wip)\b/i;

export function isTerminalMilestoneText(value) {
  const v = normalizeText(value);
  if (v === '') return false;
  return /^(?:complete|done|stop|closed)\b/.test(v) && !NONTERMINAL_WORDS.test(v);
}

const WIP_TERMINAL_PREFIX = /^(?:none|no active work|task complete)\b/i;

export function isTerminalWorkInProgressText(value) {
  const v = normalizeText(value);
  if (v === '') return false;
  return WIP_TERMINAL_PREFIX.test(v);
}

const NEXT_ACTION_TERMINAL_PREFIX = /^(?:stop|none|task complete)\b/i;
const NEXT_ACTION_FORBIDDEN = /\b(?:continue|resume|implement|write\b|finish|proceed|execute|rerun|commence)\b/i;

export function isTerminalNextActionText(value) {
  const v = normalizeText(value);
  if (v === '') return false;
  return NEXT_ACTION_TERMINAL_PREFIX.test(v) && !NEXT_ACTION_FORBIDDEN.test(v);
}

const RESUME_TERMINAL_INDICATOR =
  /\b(?:task complete|do not resume|historical task complete|future task requires|new authorization|separate fresh owner authorization|not started here)\b/i;
const RESUME_NEGATION_STRIP = /\b(?:do not|don'?t|never|no longer)\s+(?:resume|continue|run|finish|start)\b/gi;
const RESUME_POSITIVE_INSTRUCTION =
  /\b(?:resume|continue|run|finish|proceed)\s+(?:m\d+|milestones?|remaining|the\s+(?:exact\s+)?next\s+action|from\s+m\d+)/i;

export function isTerminalResumeRecipeText(value) {
  const v = normalizeText(value);
  if (!RESUME_TERMINAL_INDICATOR.test(v)) return false;
  const stripped = v.replace(RESUME_NEGATION_STRIP, ' ');
  return !RESUME_POSITIVE_INSTRUCTION.test(stripped);
}

const SNAPSHOT_POSITIVE = /\b(?:complete|pass|closed|stop)\b/i;

export function claimsTaskCompletion(snapshotText) {
  const v = normalizeText(snapshotText);
  if (/^(?:not|unfinished|in progress)\b/.test(v)) return false;
  // A completion CLAIM is a prefix statement ("task complete", "done",
  // "closed", "passed", ...) — incidental words such as "PASS" in prose
  // ("the result was PASS") or list items do not claim task completion.
  return /^(?:task\s+)?(?:complete|done|closed|passed?|succeeded|success)\b/.test(v);
}

export function isCompleteSnapshotText(snapshotText) {
  const v = normalizeText(snapshotText);
  if (v === '') return false;
  return SNAPSHOT_POSITIVE.test(v) && !hasClosurePlaceholder(v);
}

// ---------------------------------------------------------------------------
// Closure placeholder sentinels.
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE =
  /(?:\(filled\s+at\s+(?:close|closure)\)|\(filled\s+after\s+(?:push|finalization\s+push)\)|\(record\s+after\s+ci\)|\btbd\b|\bto_be_filled\b|\bfill_at_close\b|<final_sha>|<ci_run>|todo:\s*final|pending\s*\(final\)|\bunknown_at_close\b)/i;

// Note: the bare word "PLACEHOLDER" is intentionally NOT a sentinel — it is
// legitimate prose (e.g. this protocol's own documentation); the narrow
// sentinel forms above are the enforceable contract.

export function hasClosurePlaceholder(value) {
  return PLACEHOLDER_RE.test(String(value ?? ''));
}

// ---------------------------------------------------------------------------
// Structured report fields (numbered bold / bold / canonical key-value).
// ---------------------------------------------------------------------------

const NUMBERED_BOLD_RE = /^\s*\d+(?:\s*[-–—]\s*\d+)?\.?\s*\*\*([^*]+)\*\*\s*:\s*(.*)$/;
const BOLD_KEY_RE = /^\s*\*\*([^*]+)\*\*\s*:\s*(.*)$/;

export function parseReportFields(text) {
  const fields = [];
  const lines = String(text ?? '').split(/\r?\n/);
  let inFence = false;
  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence || trimmed === '' || trimmed.startsWith('|') || trimmed.startsWith('>') || trimmed.startsWith('#')) return;
    let match = NUMBERED_BOLD_RE.exec(trimmed);
    if (match) {
      let value = match[2].trim();
      let line = lineNumber;
      // Continuation-line values ("Key:\n    `value`") are joined.
      if (value === '') {
        const next = lines[index + 1];
        if (next !== undefined && next.trim() !== '' && !/^#{1,6}\s/.test(next) && !NUMBERED_BOLD_RE.test(next.trim()) && !BOLD_KEY_RE.test(next.trim()) && !/^[^:#][^:]*:/.test(next.trim())) {
          value = next.trim();
          line = lineNumber + 1;
        }
      }
      fields.push({ key: match[1].trim(), value, line, kind: 'numbered' });
      return;
    }
    match = BOLD_KEY_RE.exec(trimmed);
    if (match) {
      fields.push({ key: match[1].trim(), value: match[2].trim(), line: lineNumber, kind: 'bold' });
      return;
    }
    match = /^([^:#][^:]*):\s*(.*)$/.exec(trimmed);
    if (match && isCanonicalKey(match[1].trim())) {
      fields.push({ key: match[1].trim(), value: match[2].trim(), line: lineNumber, kind: 'kv' });
    }
  });
  return fields;
}

export function findDuplicateReportFields(fields) {
  const byKey = new Map();
  for (const field of fields) {
    if (!byKey.has(field.key)) byKey.set(field.key, []);
    byKey.get(field.key).push(field);
  }
  const duplicates = [];
  for (const [key, occurrences] of byKey) {
    if (occurrences.length > 1) {
      duplicates.push({ key, lines: occurrences.map((field) => field.line), values: occurrences.map((field) => field.value) });
    }
  }
  return duplicates;
}

// ---------------------------------------------------------------------------
// PLAN milestone status parsing.
// ---------------------------------------------------------------------------

const MILESTONE_STATUS_RE = /\b(DONE|COMPLETE|PASS|SUCCESS|CLOSED|PENDING|IN_PROGRESS|NOT_STARTED|TODO|BLOCKED|FAILED)\b/i;
const NONTERMINAL_MILESTONE_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'NOT_STARTED', 'TODO']);

export function parsePlanMilestoneLines(milestoneLines) {
  const out = [];
  for (const { lineNumber, text } of milestoneLines) {
    const trimmed = text.trim();
    const isItem =
      /^(?:[-*]|\d+[.)])\s+/.test(trimmed) || /\[[ xX]\]/.test(trimmed) || /\bM\d+([./]\d+)?\b/.test(trimmed);
    if (!isItem) continue;
    const unchecked = /\[ \]/.test(trimmed);
    // The LAST status token wins: milestone lines conventionally close with
    // the status ("M1 — DONE"), while the milestone TITLE may legitimately
    // mention other states ("M12 self-host (IN_PROGRESS mode) — DONE").
    const globalStatusRe = new RegExp(MILESTONE_STATUS_RE.source, 'gi');
    const statusMatches = [...trimmed.matchAll(globalStatusRe)];
    const statusMatch = statusMatches.length > 0 ? statusMatches[statusMatches.length - 1] : null;
    out.push({
      lineNumber,
      text: trimmed,
      status: statusMatch ? statusMatch[1].toUpperCase() : null,
      unchecked,
    });
  }
  return out;
}

export function findNonterminalPlanMilestones(milestoneLines) {
  return parsePlanMilestoneLines(milestoneLines).filter(
    (milestone) => milestone.unchecked || NONTERMINAL_MILESTONE_STATUSES.has(milestone.status)
  );
}

// ---------------------------------------------------------------------------
// Report anchor aliases (normalized key → anchor role).
// ---------------------------------------------------------------------------

export function reportAnchorRole(key) {
  const normalized = String(key ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (normalized.includes('validatedimplementationsha')) return 'validated';
  if (normalized.includes('substantive')) return 'substantive';
  if (normalized.includes('documentation')) return 'documentation';
  if (normalized.includes('startingsha')) return 'starting';
  return null;
}

export function cleanShaValue(value) {
  const cleaned = String(value ?? '').trim().replace(/`/g, '').trim();
  const hex = /[0-9a-f]{40}/i.exec(cleaned);
  return hex ? hex[0] : cleaned.replace(/[.,;:]+$/g, '');
}

export function cleanIdValue(value) {
  return String(value ?? '').trim().replace(/`/g, '').trim();
}

// ---------------------------------------------------------------------------
// Per-task v2 semantic validation (ACTIVE-bound and history forms).
// ---------------------------------------------------------------------------

function makeError(code, path, line, detail) {
  return { code, path, line, detail };
}

/**
 * Validate one task under protocol v2.
 *
 * @param {object} task - { dir, stateText, statePath, planText, planPath,
 *   reportText|null, reportPath, activeText|null, activePath|null }
 * @param {object} opts - { bindActive: boolean }
 *   When bindActive is true, status source is ACTIVE Status and ACTIVE
 *   fields (Current milestone / Next action) are also checked.
 * @returns {{ errors: object[], warnings: object[] }}
 */
export function validateTaskV2(task, opts = {}) {
  const errors = [];
  const warnings = [];
  const bindActive = opts.bindActive === true;

  const stateParsed = parseKeyValuesWithLocations(task.stateText);
  const stateSections = parseMarkdownSections(task.stateText).sections;
  const planParsed = task.planText ? parseKeyValuesWithLocations(task.planText) : null;
  const planSections = task.planText ? parseMarkdownSections(task.planText).sections : null;
  const reportFields = task.reportText ? parseReportFields(task.reportText) : null;
  const activeParsed = task.activeText ? parseKeyValuesWithLocations(task.activeText) : null;

  const stateStatus = normalizeTaskStatus(fieldValue(stateParsed, 'Status'));
  const stateTaskId = fieldValue(stateParsed, 'Task ID');
  const statePhase = fieldValue(stateParsed, 'Phase');
  const stateProtocol = fieldValue(stateParsed, 'CONTINUITY_PROTOCOL_VERSION');

  // --- protocol version ---------------------------------------------------
  if (stateProtocol === undefined) {
    errors.push(makeError('ACTIVE_TASK_PROTOCOL_REQUIRED', task.statePath, null, `STATE missing CONTINUITY_PROTOCOL_VERSION (${PROTOCOL_V2} required for v2 tasks)`));
  } else if (stateProtocol !== PROTOCOL_V2) {
    errors.push(makeError('UNSUPPORTED_PROTOCOL_VERSION', task.statePath, null, `unsupported protocol ${stateProtocol}`));
  }
  if (bindActive && activeParsed) {
    const activeProtocol = fieldValue(activeParsed, 'CONTINUITY_PROTOCOL_VERSION');
    if (activeProtocol === undefined) {
      errors.push(makeError('ACTIVE_TASK_PROTOCOL_REQUIRED', task.activePath, null, 'ACTIVE_TASK missing CONTINUITY_PROTOCOL_VERSION'));
    } else if (stateProtocol !== undefined && activeProtocol !== stateProtocol) {
      errors.push(makeError('PROTOCOL_VERSION_MISMATCH', task.activePath, null, `ACTIVE ${activeProtocol} != STATE ${stateProtocol}`));
    } else if (activeProtocol !== PROTOCOL_V2) {
      errors.push(makeError('UNSUPPORTED_PROTOCOL_VERSION', task.activePath, null, `unsupported protocol ${activeProtocol}`));
    }
  }

  // --- duplicates ----------------------------------------------------------
  for (const duplicate of findDuplicateFields(stateParsed)) {
    errors.push(
      makeError(
        'DUPLICATE_CONTINUITY_FIELD',
        task.statePath,
        duplicate.lines.join(','),
        `key=${duplicate.key} values=${JSON.stringify(duplicate.values)}`
      )
    );
  }
  if (bindActive && activeParsed) {
    for (const duplicate of findDuplicateFields(activeParsed)) {
      errors.push(
        makeError(
          'DUPLICATE_CONTINUITY_FIELD',
          task.activePath,
          duplicate.lines.join(','),
          `key=${duplicate.key} values=${JSON.stringify(duplicate.values)}`
        )
      );
    }
  }

  // --- cross-file identity -------------------------------------------------
  const taskId = bindActive && activeParsed ? fieldValue(activeParsed, 'Task ID') : stateTaskId;
  const dirBasename = String(task.dir).split('/').filter(Boolean).pop();
  if (taskId !== undefined && dirBasename !== undefined && taskId !== dirBasename) {
    errors.push(makeError('TASK_ID_MISMATCH', task.statePath, null, `task id ${taskId} != directory ${dirBasename}`));
  }
  if (stateTaskId !== undefined && taskId !== undefined && stateTaskId !== taskId) {
    errors.push(makeError('TASK_ID_MISMATCH', task.statePath, null, `STATE task id ${stateTaskId} != ${taskId}`));
  }
  if (reportFields) {
    const reportTaskId = reportFields.find((field) => field.key === 'Task ID')?.value;
    if (reportTaskId !== undefined && cleanIdValue(reportTaskId) !== cleanIdValue(taskId)) {
      errors.push(makeError('TASK_ID_MISMATCH', task.reportPath, null, `REPORT task id ${reportTaskId} != ${taskId}`));
    }
  }
  if (planParsed) {
    const planTaskId = fieldValue(planParsed, 'Task ID');
    if (planTaskId !== undefined && cleanIdValue(planTaskId) !== cleanIdValue(taskId)) {
      errors.push(makeError('TASK_ID_MISMATCH', task.planPath, null, `PLAN task id ${planTaskId} != ${taskId}`));
    }
  }

  // --- phase binding ---------------------------------------------------------
  const phase = statePhase;
  const phaseKey = derivePhaseStatusKey(phase);
  let phaseStatusValue;
  let phaseStatusLine;
  if (phaseKey && stateParsed.byKey.has(phaseKey)) {
    const occurrences = stateParsed.byKey.get(phaseKey);
    phaseStatusValue = occurrences[0].value;
    phaseStatusLine = occurrences[0].line;
  }
  if (bindActive && activeParsed) {
    const activePhase = fieldValue(activeParsed, 'Phase');
    if (phase !== undefined && activePhase !== undefined && phaseToken(phase) !== phaseToken(activePhase)) {
      errors.push(makeError('TASK_PHASE_MISMATCH', task.activePath, null, `ACTIVE phase ${activePhase} != STATE phase ${phase}`));
    }
  }
  if (reportFields) {
    const reportPhase = reportFields.find((field) => field.key === 'Phase')?.value;
    if (reportPhase !== undefined && phase !== undefined && phaseToken(reportPhase) !== phaseToken(phase)) {
      errors.push(makeError('TASK_PHASE_MISMATCH', task.reportPath, null, `REPORT phase ${reportPhase} != STATE phase ${phase}`));
    }
  }

  // --- cross-file anchors ----------------------------------------------------
  const stateAnchors = {
    starting: fieldValue(stateParsed, 'Starting SHA') ?? fieldValue(stateParsed, 'STARTING_SHA'),
    validated: fieldValue(stateParsed, 'Last validated implementation SHA') ?? fieldValue(stateParsed, 'LAST_VALIDATED_IMPLEMENTATION_SHA'),
    substantive: fieldValue(stateParsed, 'Last substantive checkpoint SHA') ?? fieldValue(stateParsed, 'LAST_SUBSTANTIVE_CHECKPOINT_SHA'),
    documentation: fieldValue(stateParsed, 'Last documentation checkpoint SHA') ?? fieldValue(stateParsed, 'LAST_DOCUMENTATION_CHECKPOINT_SHA'),
  };
  if (bindActive && activeParsed) {
    const activeStarting = fieldValue(activeParsed, 'Starting SHA');
    const activeValidated = fieldValue(activeParsed, 'Last validated implementation SHA');
    if (activeStarting !== undefined && stateAnchors.starting !== undefined && activeStarting !== stateAnchors.starting) {
      errors.push(makeError('CONTINUITY_ANCHOR_MISMATCH', task.activePath, null, `ACTIVE Starting SHA ${activeStarting} != STATE ${stateAnchors.starting}`));
    }
    if (activeValidated !== undefined && stateAnchors.validated !== undefined && activeValidated !== stateAnchors.validated) {
      errors.push(makeError('CONTINUITY_ANCHOR_MISMATCH', task.activePath, null, `ACTIVE validated SHA ${activeValidated} != STATE ${stateAnchors.validated}`));
    }
  }
  if (reportFields) {
    const reportAnchors = {};
    for (const field of reportFields) {
      const role = reportAnchorRole(field.key);
      if (role && reportAnchors[role] === undefined) reportAnchors[role] = cleanShaValue(field.value);
    }
    for (const role of ['starting', 'validated', 'substantive', 'documentation']) {
      if (reportAnchors[role] !== undefined && stateAnchors[role] !== undefined && reportAnchors[role] !== stateAnchors[role]) {
        errors.push(
          makeError('CONTINUITY_ANCHOR_MISMATCH', task.reportPath, null, `REPORT ${role} anchor ${reportAnchors[role]} != STATE ${stateAnchors[role]}`)
        );
      }
    }
  }

  // --- status agreement ------------------------------------------------------
  const activeStatus = bindActive && activeParsed ? normalizeTaskStatus(fieldValue(activeParsed, 'Status')) : undefined;
  if (bindActive && activeStatus !== undefined && stateStatus !== undefined && activeStatus !== stateStatus) {
    errors.push(makeError('TASK_STATUS_MISMATCH', task.activePath, null, `ACTIVE status ${activeStatus} != STATE status ${stateStatus}`));
  }
  const status = bindActive && activeStatus !== undefined ? activeStatus : stateStatus;
  if (status === null || status === undefined) {
    // Missing/invalid status is reported by the base checker; nothing more to do here.
    return { errors, warnings };
  }

  // --- phase-specific status binding ------------------------------------------
  if (phaseStatusValue !== undefined) {
    const normalizedPhaseStatus = normalizeTaskStatus(phaseStatusValue);
    if (normalizedPhaseStatus !== status) {
      errors.push(
        makeError('CURRENT_PHASE_STATUS_MISMATCH', task.statePath, phaseStatusLine, `key=${phaseKey} value=${phaseStatusValue} does not normalize to ${status}`)
      );
    }
  }

  // --- section bodies ---------------------------------------------------------
  const stateMilestoneSection = sectionBodyText(stateSections.get('Current Milestone'));
  const stateWipSection = sectionBodyText(stateSections.get('Work In Progress'));
  const stateNextActionSection = sectionBodyText(stateSections.get('Exact Next Action'));
  const stateBlockersSection = sectionBodyText(stateSections.get('Blockers'));
  const stateResumeSection = sectionBodyText(stateSections.get('Resume Recipe'));
  const stateSnapshotSection = sectionBodyText(stateSections.get('Completion Snapshot'));
  const stateValidationLedgerSection = sectionBodyText(stateSections.get('Validation Ledger'));

  // Placeholder scan lines: canonical records + listed live sections.
  const placeholderScanLines = [];
  for (const record of stateParsed.records) {
    placeholderScanLines.push({ path: task.statePath, line: record.line, value: record.value });
  }
  for (const sectionName of ['Current Milestone', 'Work In Progress', 'Exact Next Action', 'Blockers', 'Validation Ledger', 'Resume Recipe', 'Completion Snapshot']) {
    const section = stateSections.get(sectionName);
    if (!section) continue;
    for (const { lineNumber, text } of sectionBodyLines(section)) {
      placeholderScanLines.push({ path: task.statePath, line: lineNumber, value: text });
    }
  }
  if (reportFields) {
    for (const field of reportFields) {
      placeholderScanLines.push({ path: task.reportPath, line: field.line, value: field.value });
    }
  }

  const unresolvedPlaceholders = status === 'COMPLETE' || status === 'BLOCKED'
    ? placeholderScanLines.filter(({ value }) => hasClosurePlaceholder(value))
    : [];
  for (const hit of unresolvedPlaceholders) {
    errors.push(makeError('COMPLETE_UNRESOLVED_PLACEHOLDER', hit.path, hit.line, `unresolved closure placeholder: ${hit.value.slice(0, 120)}`));
  }

  // Report duplicate fields.
  if (reportFields) {
    for (const duplicate of findDuplicateReportFields(reportFields)) {
      errors.push(
        makeError('DUPLICATE_REPORT_FIELD', task.reportPath, duplicate.lines.join(','), `key=${duplicate.key} values=${JSON.stringify(duplicate.values)}`)
      );
    }
  }

  // ---------------------------------------------------------------------------
  // State machines
  // ---------------------------------------------------------------------------
  const activeMilestone = bindActive && activeParsed ? fieldValue(activeParsed, 'Current milestone') : undefined;
  const activeNextAction = bindActive && activeParsed ? fieldValue(activeParsed, 'Next action') : undefined;

  const reportStatus = reportFields ? reportFields.find((field) => field.key === 'Status')?.value : undefined;
  const reportStatusNormalized = reportStatus === undefined ? undefined : normalizeTaskStatus(reportStatus);

  if (status === 'COMPLETE') {
    // 1. ACTIVE milestone terminal (when bound).
    if (activeMilestone !== undefined && !isTerminalMilestoneText(activeMilestone)) {
      errors.push(makeError('COMPLETE_MILESTONE_NONTERMINAL', task.activePath, null, `ACTIVE Current milestone "${activeMilestone}" is not terminal`));
    }
    // 2. STATE current milestone terminal.
    if (!isTerminalMilestoneText(stateMilestoneSection)) {
      errors.push(makeError('COMPLETE_MILESTONE_NONTERMINAL', task.statePath, null, `STATE Current Milestone "${stateMilestoneSection.slice(0, 120)}" is not terminal`));
    }
    // 3. WIP empty/terminal.
    if (!isTerminalWorkInProgressText(stateWipSection)) {
      errors.push(makeError('COMPLETE_HAS_WORK_IN_PROGRESS', task.statePath, null, `Work In Progress "${stateWipSection.slice(0, 120)}" is not terminal`));
    }
    // 4. Next actions terminal.
    if (activeNextAction !== undefined && !isTerminalNextActionText(activeNextAction)) {
      errors.push(makeError('COMPLETE_NEXT_ACTION_NONTERMINAL', task.activePath, null, `ACTIVE Next action "${activeNextAction}" is not terminal`));
    }
    if (!isTerminalNextActionText(stateNextActionSection)) {
      errors.push(makeError('COMPLETE_NEXT_ACTION_NONTERMINAL', task.statePath, null, `STATE Exact Next Action "${stateNextActionSection.slice(0, 120)}" is not terminal`));
    }
    // 5. Resume recipe terminal.
    if (!isTerminalResumeRecipeText(stateResumeSection)) {
      errors.push(makeError('COMPLETE_RESUME_RECIPE_NONTERMINAL', task.statePath, null, 'Resume Recipe instructs resuming unfinished work'));
    }
    // 6. Report mandatory and COMPLETE.
    if (!task.reportText) {
      errors.push(makeError('COMPLETE_REPORT_MISSING', task.statePath, null, 'REPORT.md is required for a COMPLETE v2 task'));
    } else if (reportStatusNormalized === undefined) {
      errors.push(makeError('COMPLETE_REPORT_STATUS_MISSING', task.reportPath, null, 'REPORT has no top-level Status field'));
    } else if (reportStatusNormalized !== 'COMPLETE') {
      errors.push(makeError('COMPLETE_REPORT_STATUS_MISMATCH', task.reportPath, null, `REPORT status ${reportStatusNormalized} != COMPLETE`));
    }
    // 7. Completion snapshot complete.
    if (!isCompleteSnapshotText(stateSnapshotSection)) {
      errors.push(makeError('COMPLETE_SNAPSHOT_INCOMPLETE', task.statePath, null, 'Completion Snapshot is empty, placeholder-only, or lacks a positive terminal token'));
    }
    // 8. PLAN milestones closed.
    if (planSections) {
      const milestoneLines = sectionBodyLines(planSections.get('Milestones'));
      const pending = findNonterminalPlanMilestones(milestoneLines);
      for (const milestone of pending) {
        errors.push(
          makeError('COMPLETE_PLAN_MILESTONE_PENDING', task.planPath, milestone.lineNumber, `milestone "${milestone.text.slice(0, 120)}" is not closed`)
        );
      }
    }
  } else if (status === 'BLOCKED') {
    const blockersClean = normalizeText(stateBlockersSection);
    if (blockersClean === '' || /^(?:none|n\/a|not applicable)$/.test(blockersClean)) {
      errors.push(makeError('BLOCKED_WITHOUT_BLOCKER', task.statePath, null, 'BLOCKED task has no actual blocker in ## Blockers'));
    }
    const nextActionClean = normalizeText(stateNextActionSection);
    if (nextActionClean === '') {
      errors.push(makeError('BLOCKED_NEXT_ACTION_MISSING', task.statePath, null, 'BLOCKED task has no Exact Next Action'));
    }
    if (reportStatusNormalized === 'COMPLETE') {
      errors.push(makeError('BLOCKED_REPORT_FALSE_COMPLETE', task.reportPath, null, 'BLOCKED task REPORT claims COMPLETE'));
    }
  } else if (status === 'IN_PROGRESS') {
    if (phaseStatusValue !== undefined && normalizeTaskStatus(phaseStatusValue) === 'COMPLETE') {
      errors.push(makeError('IN_PROGRESS_PHASE_STATUS_COMPLETE', task.statePath, phaseStatusLine, `key=${phaseKey} value=${phaseStatusValue} claims COMPLETE`));
    }
    if (normalizeText(stateMilestoneSection) === '') {
      errors.push(makeError('IN_PROGRESS_MILESTONE_MISSING', task.statePath, null, 'IN_PROGRESS task has no Current Milestone'));
    }
    if (activeMilestone !== undefined && normalizeText(activeMilestone) === '') {
      errors.push(makeError('IN_PROGRESS_MILESTONE_MISSING', task.activePath, null, 'IN_PROGRESS task has no ACTIVE Current milestone'));
    }
    if (normalizeText(stateNextActionSection) === '') {
      errors.push(makeError('IN_PROGRESS_NEXT_ACTION_MISSING', task.statePath, null, 'IN_PROGRESS task has no Exact Next Action'));
    } else if (isTerminalNextActionText(stateNextActionSection)) {
      errors.push(makeError('IN_PROGRESS_NEXT_ACTION_TERMINAL', task.statePath, null, 'IN_PROGRESS task next action is terminal (STOP) without a blocked explanation'));
    }
    if (activeNextAction !== undefined) {
      if (normalizeText(activeNextAction) === '') {
        errors.push(makeError('IN_PROGRESS_NEXT_ACTION_MISSING', task.activePath, null, 'IN_PROGRESS task has no ACTIVE Next action'));
      } else if (isTerminalNextActionText(activeNextAction)) {
        errors.push(makeError('IN_PROGRESS_NEXT_ACTION_TERMINAL', task.activePath, null, 'IN_PROGRESS task ACTIVE next action is terminal (STOP)'));
      }
    }
    if (reportStatusNormalized === 'COMPLETE') {
      errors.push(makeError('IN_PROGRESS_REPORT_FALSE_COMPLETE', task.reportPath, null, 'IN_PROGRESS task REPORT claims COMPLETE'));
    }
    if (claimsTaskCompletion(stateSnapshotSection)) {
      errors.push(makeError('IN_PROGRESS_SNAPSHOT_FALSE_COMPLETE', task.statePath, null, 'IN_PROGRESS task Completion Snapshot claims completion'));
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Legacy (v1) task structural inspection — warnings only.
// ---------------------------------------------------------------------------

export function inspectLegacyTask(task, status) {
  const warnings = [];
  if (status === 'COMPLETE' && !task.reportText) {
    warnings.push(makeError('LEGACY_TASK_MISSING_REPORT', task.statePath, null, 'legacy COMPLETE task has no REPORT.md'));
  }
  // Narrow high-severity scan: only an ACTIVE promotion instruction
  // (action verb near apply/approve/promotion) without a nearby negation is
  // flagged. Negative/containment statements such as "does not approve any
  // new hostname" are not findings.
  const nextAction = String(task.stateNextAction ?? '');
  const hasAction = /\b(?:run|execute|attempt|continue|proceed|perform|start)\b[^.\n]{0,60}\b(?:canonical\s+)?(?:promotion|apply|approval)\b/i.test(nextAction);
  const hasNegation = /\b(?:do not|don'?t|never|no longer|prohibited|not authorized|must not)\b/i.test(nextAction);
  if (status === 'COMPLETE' && hasAction && !hasNegation) {
    warnings.push(makeError('LEGACY_HIGH_SEVERITY_CONTINUITY_FINDING', task.statePath, null, 'legacy COMPLETE task has an active apply/approve/promote next action'));
  }
  return warnings;
}

export { PROTOCOL_LEGACY as LEGACY_PROTOCOL };
