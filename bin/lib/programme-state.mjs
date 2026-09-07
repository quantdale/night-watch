// Deterministic raw-text validator for durable programme state.
//
// Ordinary `JSON.parse` silently keeps the last value when an object repeats a
// key, which once discarded a whole historical lane record (the Wave-1 System
// Atlas lane and the Wave-6 multi-investigation lane shared lane key `E`).
// This module therefore tokenizes the raw document FIRST — tracking JSON
// strings (with escapes) and object scopes — and rejects any duplicate key at
// the same object scope before parsing. Only a duplicate-free document is
// parsed and checked as a programme envelope with unambiguous lane/task/role
// identities.
//
// The validator is pure: no filesystem, network, subprocess, or environment
// access, no mutation of its input, and byte-identical input always yields
// byte-identical output. Diagnostics are bounded in count and length and
// carry only lane keys and safe identity fields, never arbitrary document
// bytes, so failure output cannot leak secret-adjacent values.

export const PROGRAMME_SCHEMA_VERSION = 'nightwatch.autonomous-programme-state.v1';

// Closed programme lifecycle vocabulary. `NONE` is an agent-task status, not
// a programme status, so it is deliberately absent here.
const PROGRAMME_STATUSES = new Set(['IN_PROGRESS', 'BLOCKED', 'COMPLETE']);

const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const SAFE_LANE_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const SAFE_ROLE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const SAFE_WAVE_PATTERN = /^W[0-9]{1,3}$/;

// Every diagnostic is truncated to this length; no error string may exceed it.
const MAX_DIAGNOSTIC_CHARS = 300;
// Short identity echo cap inside a diagnostic (lane key, task id, role, ...).
const MAX_IDENTITY_CHARS = 80;
// Raw duplicate-key reports are capped; the count line records the remainder.
const MAX_DUPLICATE_REPORTS = 5;
// Total envelope/lane diagnostics are capped; the count line records the rest.
const MAX_ERRORS = 20;
const MAX_DOCUMENT_CHARS = 256 * 1024;

/** Strip control characters and bound length so diagnostics stay one line. */
function sanitizeFragment(value, max = MAX_IDENTITY_CHARS) {
  const text = typeof value === 'string' ? value : String(value);
  return text.replace(/[\0-\x1F\x7F]+/g, '?').slice(0, max);
}

/** Bound a full diagnostic line. */
function diagnostic(code, detail) {
  return `${code}: ${sanitizeFragment(detail, MAX_DIAGNOSTIC_CHARS - code.length - 2)}`;
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Scan raw JSON text for duplicate keys at the same object scope.
 *
 * Minimal tokenizer: strings are decoded with backslash-escape handling so
 * key-like text inside string values (including escaped quotes) is never
 * mistaken for a key; `{`/`}`/`[`/`]` maintain scope; a string is a key only
 * when the enclosing scope is an object and the next non-whitespace byte is
 * `:`. Tolerant of malformed input — it never throws; `JSON.parse` owns
 * syntax errors afterwards.
 *
 * Returns `{ duplicates: [{ key, path, firstLine, line }], scannedLines }`.
 */
function scanDuplicateKeys(raw) {
  const duplicates = [];
  const stack = []; // { kind: 'object'|'array', keys: Map<string, number>, name: string }
  let pendingKey = null;
  let line = 1;
  let i = 0;
  const n = raw.length;

  const currentPath = () => {
    const parts = [];
    for (const frame of stack) {
      if (frame.name !== '') parts.push(frame.name);
    }
    if (pendingKey !== null && stack.length > 0 && stack[stack.length - 1].kind === 'object') {
      parts.push(pendingKey);
    }
    return parts.length === 0 ? '$' : `$.${parts.join('.')}`;
  };

  const skipWhitespace = () => {
    while (i < n) {
      const c = raw[i];
      if (c === ' ' || c === '\t' || c === '\r') i += 1;
      else if (c === '\n') {
        i += 1;
        line += 1;
      } else break;
    }
  };

  // Consumes a JSON string starting at the opening quote; returns the decoded
  // key/value text with standard escapes resolved, or null if unterminated.
  const readString = () => {
    // raw[i] === '"'
    let out = '';
    let j = i + 1;
    let currentLine = line;
    while (j < n) {
      const c = raw[j];
      if (c === '\\') {
        const next = raw[j + 1];
        if (next === undefined) {
          j += 1;
          break;
        }
        if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(raw.slice(j + 2, j + 6))) {
          out += String.fromCharCode(parseInt(raw.slice(j + 2, j + 6), 16));
          j += 6;
        } else {
          const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
          out += next in simple ? simple[next] : next;
          j += 2;
        }
      } else if (c === '"') {
        line = currentLine;
        i = j + 1;
        return out;
      } else {
        if (c === '\n') currentLine += 1;
        out += c;
        j += 1;
      }
    }
    line = currentLine;
    i = j;
    return null;
  };

  const consumeLiteral = () => {
    while (i < n && !' \t\r\n,]}:'.includes(raw[i])) i += 1;
    pendingKey = null;
  };

  while (i < n) {
    skipWhitespace();
    if (i >= n) break;
    const c = raw[i];
    if (c === '{' || c === '[') {
      stack.push({ kind: c === '{' ? 'object' : 'array', keys: new Map(), name: pendingKey ?? '' });
      pendingKey = null;
      i += 1;
    } else if (c === '}' || c === ']') {
      stack.pop();
      pendingKey = null;
      i += 1;
    } else if (c === '"') {
      const keyLine = line;
      const text = readString();
      if (text === null) return { duplicates, scannedLines: line };
      skipWhitespace();
      const top = stack[stack.length - 1];
      if (raw[i] === ':' && top !== undefined && top.kind === 'object') {
        if (top.keys.has(text)) {
          duplicates.push({
            key: text,
            path: currentPath(),
            firstLine: top.keys.get(text),
            line: keyLine,
          });
        } else {
          top.keys.set(text, keyLine);
        }
        pendingKey = text;
        i += 1; // consume ':'
      } else {
        pendingKey = null;
      }
    } else if (c === ',') {
      pendingKey = null;
      i += 1;
    } else if (c === ':') {
      i += 1;
    } else {
      consumeLiteral();
    }
  }
  return { duplicates, scannedLines: line };
}

/**
 * Validate a durable programme-state document from its raw text.
 *
 * Phase 1 scans the raw text for duplicate keys at the same object scope
 * (reported as `PROGRAMME_DUPLICATE_KEY` without parsing). Phase 2 parses
 * and checks the envelope (`PROGRAMME_*` diagnostics). Malformed input
 * yields bounded diagnostics; this function never throws for string input.
 *
 * @param {unknown} rawText raw `PROGRAMME.json` bytes as a string.
 * @returns {{ ok: boolean, errors: string[] }} empty `errors` iff valid.
 */
export function validateProgrammeState(rawText) {
  if (typeof rawText !== 'string') {
    return { ok: false, errors: [diagnostic('PROGRAMME_NOT_TEXT', typeof rawText)] };
  }
  if (rawText.trim() === '') {
    return { ok: false, errors: [diagnostic('PROGRAMME_EMPTY', 'document has no content')] };
  }
  if (rawText.length > MAX_DOCUMENT_CHARS) {
    return {
      ok: false,
      errors: [diagnostic('PROGRAMME_DOCUMENT_TOO_LARGE', `${rawText.length} chars`)],
    };
  }

  let scan;
  try {
    scan = scanDuplicateKeys(rawText);
  } catch {
    scan = { duplicates: [], scannedLines: 0 };
  }
  if (scan.duplicates.length > 0) {
    const errors = [];
    for (const duplicate of scan.duplicates.slice(0, MAX_DUPLICATE_REPORTS)) {
      errors.push(
        diagnostic(
          'PROGRAMME_DUPLICATE_KEY',
          `key "${sanitizeFragment(duplicate.key)}" repeats at ${sanitizeFragment(duplicate.path, 120)} (lines ${duplicate.firstLine}, ${duplicate.line})`
        )
      );
    }
    if (scan.duplicates.length > MAX_DUPLICATE_REPORTS) {
      errors.push(
        diagnostic('PROGRAMME_DUPLICATE_KEY', `${scan.duplicates.length - MAX_DUPLICATE_REPORTS} further duplicate(s) omitted`)
      );
    }
    return { ok: false, errors };
  }

  let document;
  try {
    document = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [diagnostic('PROGRAMME_MALFORMED_JSON', message)] };
  }

  const errors = [];
  const push = (code, detail) => {
    if (errors.length < MAX_ERRORS) errors.push(diagnostic(code, detail));
  };

  if (!isPlainObject(document)) {
    push('PROGRAMME_ENVELOPE_NOT_OBJECT', Array.isArray(document) ? 'array' : typeof document);
    return { ok: false, errors };
  }

  if (document.schemaVersion !== PROGRAMME_SCHEMA_VERSION) {
    push('PROGRAMME_SCHEMA_MISMATCH', String(document.schemaVersion ?? '<missing>'));
  }
  if (typeof document.programmeId !== 'string' || !SAFE_ID_PATTERN.test(document.programmeId)) {
    push('PROGRAMME_ID_UNSAFE', String(document.programmeId ?? '<missing>'));
  }
  if (typeof document.programmeStatus !== 'string' || !PROGRAMME_STATUSES.has(document.programmeStatus)) {
    push('PROGRAMME_STATUS_UNKNOWN', String(document.programmeStatus ?? '<missing>'));
  }
  if (typeof document.currentWave !== 'string' || !SAFE_WAVE_PATTERN.test(document.currentWave)) {
    push('PROGRAMME_WAVE_UNSAFE', String(document.currentWave ?? '<missing>'));
  }
  if (!isPlainObject(document.lanes)) {
    push('PROGRAMME_LANES_NOT_OBJECT', Array.isArray(document.lanes) ? 'array' : typeof document.lanes);
    return { ok: false, errors };
  }

  const taskIdOwners = new Map();
  const roleOwners = new Map();
  for (const [laneKey, lane] of Object.entries(document.lanes)) {
    if (!SAFE_LANE_KEY_PATTERN.test(laneKey)) {
      push('PROGRAMME_LANE_KEY_UNSAFE', laneKey);
      continue;
    }
    if (!isPlainObject(lane)) {
      push('PROGRAMME_LANE_NOT_OBJECT', `${laneKey} is ${Array.isArray(lane) ? 'array' : typeof lane}`);
      continue;
    }
    const taskId = lane.taskId;
    if (typeof taskId === 'string' && taskId !== '') {
      if (!SAFE_ID_PATTERN.test(taskId)) {
        push('PROGRAMME_TASK_ID_UNSAFE', `${laneKey} taskId "${taskId}"`);
      } else if (taskIdOwners.has(taskId)) {
        push('PROGRAMME_DUPLICATE_TASK_ID', `taskId "${taskId}" in lanes "${taskIdOwners.get(taskId)}", "${laneKey}"`);
      } else {
        taskIdOwners.set(taskId, laneKey);
      }
    } else if (taskId !== undefined && taskId !== null && taskId !== '') {
      push('PROGRAMME_TASK_ID_UNSAFE', `${laneKey} taskId is ${typeof taskId}`);
    }
    const role = lane.role;
    if (typeof role === 'string' && role !== '') {
      if (!SAFE_ROLE_PATTERN.test(role)) {
        push('PROGRAMME_ROLE_UNSAFE', `${laneKey} role "${role}"`);
      } else if (roleOwners.has(role)) {
        push('PROGRAMME_DUPLICATE_ROLE', `role "${role}" in lanes "${roleOwners.get(role)}", "${laneKey}"`);
      } else {
        roleOwners.set(role, laneKey);
      }
    } else if (role !== undefined && role !== null && role !== '') {
      push('PROGRAMME_ROLE_UNSAFE', `${laneKey} role is ${typeof role}`);
    }
  }

  return errors.length === 0 ? { ok: true, errors } : { ok: false, errors };
}
