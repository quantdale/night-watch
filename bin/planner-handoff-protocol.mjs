#!/usr/bin/env node
// @ts-check

// Pure parser/state layer for the repository's planner -> executor handoff.
// It owns only the machine-readable header in .agent/EXECUTION_PROMPT.md.
// Filesystem, Git, and task-continuity authority remains in the checker.

export const HANDOFF_PROTOCOL_VERSION = 'nightwatch.planner-executor-handoff.v1';
export const HANDOFF_RECEIPT_SCHEMA = 'nightwatch.planner-handoff-receipt.v1';
export const HANDOFF_STATUSES = new Set(['READY_FOR_EXECUTION', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE']);
export const HANDOFF_REQUIRED_FIELDS = Object.freeze([
  'HANDOFF_PROTOCOL_VERSION',
  'Status',
  'Campaign ID',
  'OpenSpec',
  'Planned-From',
  'Target Branch',
  'Predecessor Task ID',
  'Predecessor Status',
]);

const SAFE_ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const SHA_RE = /^[0-9a-f]{40}$/i;
const MAX_PROMPT_CHARS = 256 * 1024;
const MAX_HEADER_LINE_CHARS = 1024;
const MAX_FIELD_VALUE_CHARS = 512;
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/i,
  /\bAKIA[0-9A-Z]{16}\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i,
];

function error(code, line = null, field = null) {
  return Object.freeze({ code, line, field });
}

function valueIsSafe(value) {
  return typeof value === 'string'
    && value.length <= MAX_FIELD_VALUE_CHARS
    && !/[\u0000-\u001f\u007f]/.test(value)
    && !SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function isSafeCampaignId(value) {
  return typeof value === 'string' && SAFE_ID_RE.test(value);
}

export function isGitSha(value) {
  return typeof value === 'string' && SHA_RE.test(value);
}

/**
 * Parse only the contiguous machine header immediately following the first
 * Markdown H1. The body is deliberately opaque; no prose fallback exists.
 */
export function parseHandoffHeader(text) {
  const source = String(text ?? '');
  const errors = [];
  if (source.length > MAX_PROMPT_CHARS) errors.push(error('HANDOFF_METADATA_OVERSIZED'));

  const lines = source.split(/\r?\n/);
  let first = 0;
  while (first < lines.length && lines[first].trim() === '') first += 1;
  if (first >= lines.length || !/^#\s+\S/.test(lines[first].trim()) || /^##/.test(lines[first].trim())) {
    errors.push(error('HANDOFF_HEADER_MISSING', first < lines.length ? first + 1 : null));
    return Object.freeze({ ok: false, fields: Object.freeze({}), records: Object.freeze([]), errors: Object.freeze(errors) });
  }

  const records = [];
  const occurrences = new Map();
  let headerStarted = false;
  for (let index = first + 1; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    // Markdown headings conventionally have one blank line after the H1.
    // Permit leading blank lines before the owned header, but once a field has
    // started a blank terminates the header and leaves the body opaque.
    if (trimmed === '') {
      if (!headerStarted) continue;
      break;
    }
    headerStarted = true;
    if (raw.length > MAX_HEADER_LINE_CHARS) {
      errors.push(error('HANDOFF_METADATA_OVERSIZED', index + 1));
      continue;
    }
    const match = /^([^:#][^:]*):\s*(.*)$/.exec(raw);
    if (!match) {
      errors.push(error('HANDOFF_HEADER_MALFORMED', index + 1));
      continue;
    }
    const key = match[1].trim();
    const value = match[2].trim();
    const record = Object.freeze({ key, value, line: index + 1 });
    records.push(record);
    if (!occurrences.has(key)) occurrences.set(key, []);
    occurrences.get(key).push(record);
    if (!HANDOFF_REQUIRED_FIELDS.includes(key)) errors.push(error('HANDOFF_HEADER_UNKNOWN_FIELD', index + 1, key));
    if (!valueIsSafe(value)) {
      errors.push(error(
        value.length > MAX_FIELD_VALUE_CHARS ? 'HANDOFF_METADATA_OVERSIZED' : 'HANDOFF_METADATA_UNSAFE',
        index + 1,
        key,
      ));
    }
  }

  for (const [key, values] of occurrences) {
    if (values.length > 1) errors.push(error('HANDOFF_DUPLICATE_FIELD', values[0].line, key));
  }
  const fields = {};
  for (const record of records) if (fields[record.key] === undefined) fields[record.key] = record.value;
  for (const key of HANDOFF_REQUIRED_FIELDS) {
    if (fields[key] === undefined) errors.push(error('HANDOFF_REQUIRED_FIELD_MISSING', null, key));
  }
  return Object.freeze({
    ok: errors.length === 0,
    fields: Object.freeze(fields),
    records: Object.freeze(records),
    errors: Object.freeze(errors),
  });
}

export function validateHandoffHeader(parsedOrText) {
  const parsed = typeof parsedOrText === 'string' ? parseHandoffHeader(parsedOrText) : parsedOrText;
  const errors = [...(parsed?.errors ?? [])];
  const fields = parsed?.fields ?? {};
  const add = (code, field = null) => errors.push(error(code, null, field));

  if (fields.HANDOFF_PROTOCOL_VERSION !== HANDOFF_PROTOCOL_VERSION) add('HANDOFF_PROTOCOL_UNSUPPORTED', 'HANDOFF_PROTOCOL_VERSION');
  if (!HANDOFF_STATUSES.has(fields.Status)) add('HANDOFF_STATUS_UNSUPPORTED', 'Status');
  if (!isSafeCampaignId(fields['Campaign ID'])) add('HANDOFF_CAMPAIGN_ID_INVALID', 'Campaign ID');
  if (!isSafeCampaignId(fields['Predecessor Task ID'])) add('HANDOFF_PREDECESSOR_ID_INVALID', 'Predecessor Task ID');
  if (!isGitSha(fields['Planned-From'])) add('HANDOFF_PLANNED_FROM_INVALID', 'Planned-From');
  if (fields['Target Branch'] !== 'main') add('HANDOFF_TARGET_BRANCH_INVALID', 'Target Branch');
  if (fields['OpenSpec'] !== `openspec/changes/${fields['Campaign ID']}/`) add('HANDOFF_OPENSPEC_ROUTE_INVALID', 'OpenSpec');
  if (fields['Predecessor Status'] !== 'COMPLETE') add('HANDOFF_PREDECESSOR_STATUS_INVALID', 'Predecessor Status');

  return Object.freeze({
    ok: errors.length === 0,
    fields: Object.freeze({ ...fields }),
    errors: Object.freeze(errors),
  });
}

/**
 * Apply the state-only handoff rules to a safe active-task projection. The
 * checker supplies continuityOk after delegating milestone/closure semantics
 * to agent-continuity v2.
 */
export function validateHandoffState(parsedOrText, context = {}) {
  const header = validateHandoffHeader(parsedOrText);
  const errors = [...header.errors];
  if (!header.ok) return Object.freeze({ ok: false, fields: header.fields, errors: Object.freeze(errors) });

  const { fields } = header;
  const activeTaskId = context.activeTaskId;
  const activeTaskStatus = context.activeTaskStatus;
  if (!isSafeCampaignId(activeTaskId)) errors.push(error('HANDOFF_ACTIVE_TASK_INVALID'));
  if (!HANDOFF_STATUSES.has(activeTaskStatus) && !['NONE'].includes(activeTaskStatus)) errors.push(error('HANDOFF_ACTIVE_STATUS_INVALID'));
  if (context.continuityOk !== true) errors.push(error('HANDOFF_ACTIVE_CONTINUITY_FAILED'));

  if (fields.Status === 'READY_FOR_EXECUTION') {
    if (activeTaskId !== fields['Predecessor Task ID']) errors.push(error('HANDOFF_PREDECESSOR_TASK_MISMATCH'));
    if (activeTaskStatus !== fields['Predecessor Status']) errors.push(error('HANDOFF_PREDECESSOR_STATUS_MISMATCH'));
  } else {
    if (activeTaskId !== fields['Campaign ID']) errors.push(error('HANDOFF_ACTIVE_TASK_MISMATCH'));
    if (activeTaskStatus !== fields.Status) errors.push(error('HANDOFF_STATUS_MISMATCH'));
  }

  return Object.freeze({ ok: errors.length === 0, fields: header.fields, errors: Object.freeze(errors) });
}

export function uniqueErrorCodes(errors) {
  return [...new Set((errors ?? []).map((item) => item.code).filter(Boolean))];
}
