// @ts-check
// A-01 / D2 — checkpoint-neutral evidence and correction bindings.
//
// The certification anchor chase was structural: evidence bindings lived on
// config paths that no checkpoint rule approved, so every re-bind commit
// became the new substantive anchor and the evidence it bound was instantly
// STALE_ANCESTOR of it. The fix is a closed-schema binding file whose values
// may change without a substantive commit, and NOTHING else may.
//
// Two files, two guards:
//   config/release-evidence.v1.json        — VALUES_ONLY_BINDINGS
//   config/document-role-corrections.v1.json — APPEND_ONLY_CORRECTIONS
//
// A guarded path is documentation-only for a commit only when the guard holds
// for that commit's exact byte diff. Adding, deleting, renaming, reordering,
// re-keying, or otherwise structurally touching either file is SUBSTANTIVE,
// always. Schema validation failure is substantive, always. Legacy bindings in
// the retired locations are read once as a compatibility fallback so older
// checkouts keep resolving, and are never authoritative when the new file
// carries the subject.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const RELEASE_EVIDENCE_SCHEMA = 'nightwatch.release-evidence.v1';
export const RELEASE_EVIDENCE_FILE = 'config/release-evidence.v1.json';
export const DOCUMENT_ROLE_CORRECTIONS_SCHEMA = 'nightwatch.document-role-corrections.v1';
export const DOCUMENT_ROLE_CORRECTIONS_FILE = 'config/document-role-corrections.v1.json';

const SHA40_RE = /^[0-9a-f]{40}$/i;
const DIGEST_RE = /^(?:receipt:)?sha256:[0-9a-f]{24,64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const SUBJECT_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const CORRECTION_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const LINE_DIGEST_RE = /^sha256:[0-9a-f]{24,64}$/;

/** Exact key set of one evidence binding. Closed: any other key is structural. */
export const EVIDENCE_BINDING_KEYS = Object.freeze(['subject', 'evidenceSha', 'receiptDigest', 'observedAt', 'executor']);
/** The ONLY fields a values-only change may touch. */
export const EVIDENCE_BINDING_VALUE_KEYS = Object.freeze(['evidenceSha', 'receiptDigest', 'observedAt', 'executor']);
/** Exact key set of one document-role correction entry. */
export const CORRECTION_ENTRY_KEYS = Object.freeze(['id', 'path', 'oldLineSha256', 'oldLineExcerpt', 'reason']);

export const GUARD_CLASSES = Object.freeze({
  'config/release-evidence.v1.json': 'VALUES_ONLY_BINDINGS',
  'config/document-role-corrections.v1.json': 'APPEND_ONLY_CORRECTIONS',
});

/** @param {string} file */
export function guardClassForPath(file) {
  return Object.hasOwn(GUARD_CLASSES, file) ? GUARD_CLASSES[file] : null;
}

/**
 * Closed-schema validation of one evidence binding record.
 * @param {unknown} record
 * @returns {{ ok: boolean, errors: string[], binding: null | { subject: string, evidenceSha: string | null, receiptDigest: string | null, observedAt: string | null, executor: string | null } }}
 */
export function parseEvidenceBinding(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['BINDING_NOT_AN_OBJECT'], binding: null };
  }
  const keys = Object.keys(record).sort();
  const expected = [...EVIDENCE_BINDING_KEYS].sort();
  if (keys.join(',') !== expected.join(',')) {
    errors.push(`BINDING_KEYS_INVALID:${keys.join(',')}`);
    return { ok: false, errors, binding: null };
  }
  /** @type {Record<string, unknown>} */
  const raw = record;
  const subject = raw.subject;
  if (typeof subject !== 'string' || !SUBJECT_RE.test(subject)) errors.push(`BINDING_SUBJECT_INVALID:${String(subject)}`);
  const valueOrNull = (value, pattern, label) => {
    if (value === null) return null;
    if (typeof value !== 'string' || !pattern.test(value)) {
      errors.push(`BINDING_${label}_INVALID:${String(value)}`);
      return null;
    }
    return value;
  };
  const evidenceSha = valueOrNull(raw.evidenceSha, SHA40_RE, 'EVIDENCE_SHA');
  const receiptDigest = valueOrNull(raw.receiptDigest, DIGEST_RE, 'RECEIPT_DIGEST');
  const observedAt = valueOrNull(raw.observedAt, ISO_RE, 'OBSERVED_AT');
  let executor = null;
  if (raw.executor !== null) {
    if (typeof raw.executor !== 'string' || raw.executor.trim() === '' || raw.executor.length > 200) {
      errors.push(`BINDING_EXECUTOR_INVALID:${String(raw.executor)}`);
    } else {
      executor = raw.executor;
    }
  }
  if (errors.length > 0) return { ok: false, errors, binding: null };
  return {
    ok: true,
    errors,
    binding: { subject, evidenceSha, receiptDigest, observedAt, executor },
  };
}

/**
 * Closed-schema validation of the release-evidence document. The subject set
 * is order-significant: reordering bindings is a structural change.
 * @param {unknown} record
 * @returns {{ ok: boolean, errors: string[], bindings: ReturnType<typeof parseEvidenceBinding>['binding'][] }}
 */
export function parseReleaseEvidence(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['RELEASE_EVIDENCE_NOT_AN_OBJECT'], bindings: [] };
  }
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== ['bindings', 'schemaVersion'].join(',')) {
    return { ok: false, errors: [`RELEASE_EVIDENCE_KEYS_INVALID:${keys.join(',')}`], bindings: [] };
  }
  /** @type {Record<string, unknown>} */
  const raw = record;
  if (raw.schemaVersion !== RELEASE_EVIDENCE_SCHEMA) {
    return { ok: false, errors: [`RELEASE_EVIDENCE_SCHEMA_UNSUPPORTED:${String(raw.schemaVersion)}`], bindings: [] };
  }
  if (!Array.isArray(raw.bindings)) {
    return { ok: false, errors: ['RELEASE_EVIDENCE_BINDINGS_NOT_AN_ARRAY'], bindings: [] };
  }
  const bindings = [];
  const seen = new Set();
  for (const entry of raw.bindings) {
    const parsed = parseEvidenceBinding(entry);
    for (const error of parsed.errors) errors.push(error);
    if (!parsed.ok) continue;
    if (seen.has(parsed.binding.subject)) errors.push(`BINDING_SUBJECT_DUPLICATE:${parsed.binding.subject}`);
    seen.add(parsed.binding.subject);
    bindings.push(parsed.binding);
  }
  return { ok: errors.length === 0, errors, bindings };
}

/**
 * Closed-schema validation of the document-role corrections document.
 * @param {unknown} record
 */
export function parseDocumentRoleCorrections(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, errors: ['CORRECTIONS_NOT_AN_OBJECT'], corrections: [] };
  }
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== ['corrections', 'schemaVersion'].join(',')) {
    return { ok: false, errors: [`CORRECTIONS_KEYS_INVALID:${keys.join(',')}`], corrections: [] };
  }
  /** @type {Record<string, unknown>} */
  const raw = record;
  if (raw.schemaVersion !== DOCUMENT_ROLE_CORRECTIONS_SCHEMA) {
    return { ok: false, errors: [`CORRECTIONS_SCHEMA_UNSUPPORTED:${String(raw.schemaVersion)}`], corrections: [] };
  }
  if (!Array.isArray(raw.corrections)) {
    return { ok: false, errors: ['CORRECTIONS_NOT_AN_ARRAY'], corrections: [] };
  }
  const corrections = [];
  const seen = new Set();
  for (const entry of raw.corrections) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push('CORRECTION_ENTRY_NOT_AN_OBJECT');
      continue;
    }
    const entryKeys = Object.keys(entry).sort();
    const expected = [...CORRECTION_ENTRY_KEYS].sort();
    if (entryKeys.join(',') !== expected.join(',')) {
      errors.push(`CORRECTION_ENTRY_KEYS_INVALID:${entryKeys.join(',')}`);
      continue;
    }
    /** @type {Record<string, unknown>} */
    const item = entry;
    let ok = true;
    if (typeof item.id !== 'string' || !CORRECTION_ID_RE.test(item.id)) {
      errors.push(`CORRECTION_ID_INVALID:${String(item.id)}`);
      ok = false;
    }
    if (typeof item.path !== 'string' || item.path === '' || item.path.includes('..')) {
      errors.push(`CORRECTION_PATH_INVALID:${String(item.path)}`);
      ok = false;
    }
    if (typeof item.oldLineSha256 !== 'string' || !LINE_DIGEST_RE.test(item.oldLineSha256)) {
      errors.push(`CORRECTION_DIGEST_INVALID:${String(item.oldLineSha256)}`);
      ok = false;
    }
    if (typeof item.oldLineExcerpt !== 'string' || item.oldLineExcerpt.length > 400) {
      errors.push(`CORRECTION_EXCERPT_INVALID:${String(item.id)}`);
      ok = false;
    }
    if (typeof item.reason !== 'string' || item.reason.trim() === '' || item.reason.length > 2000) {
      errors.push(`CORRECTION_REASON_INVALID:${String(item.id)}`);
      ok = false;
    }
    if (!ok) continue;
    if (seen.has(item.id)) errors.push(`CORRECTION_ID_DUPLICATE:${item.id}`);
    seen.add(item.id);
    corrections.push({ id: item.id, path: item.path, oldLineSha256: item.oldLineSha256, oldLineExcerpt: item.oldLineExcerpt, reason: item.reason });
  }
  return { ok: errors.length === 0, errors, corrections };
}

/**
 * The diff-shape guard for `config/release-evidence.v1.json`: a change is
 * documentation-only when BOTH sides validate against the closed schema, the
 * ordered subject list is identical, and no binding key outside
 * {@link EVIDENCE_BINDING_VALUE_KEYS} differs. Everything else — a new or
 * removed subject, a reorder, a non-binding key, an unknown key, a malformed
 * value, or an unparseable side — is substantive.
 *
 * Pure over JSON texts. A null side means the file was added or deleted.
 * @param {string | null} beforeText
 * @param {string | null} afterText
 * @returns {{ valuesOnly: boolean, reason: string }}
 */
export function isValuesOnlyBindingChange(beforeText, afterText) {
  if (beforeText === null || afterText === null) {
    return { valuesOnly: false, reason: beforeText === null ? 'BINDING_FILE_ADDED' : 'BINDING_FILE_DELETED' };
  }
  let before;
  let after;
  try {
    before = parseReleaseEvidence(JSON.parse(beforeText));
    after = parseReleaseEvidence(JSON.parse(afterText));
  } catch {
    return { valuesOnly: false, reason: 'BINDING_FILE_UNPARSEABLE' };
  }
  if (!after.ok) return { valuesOnly: false, reason: `BINDING_SCHEMA_INVALID_AFTER:${after.errors.join(';')}` };
  if (!before.ok) return { valuesOnly: false, reason: `BINDING_SCHEMA_INVALID_BEFORE:${before.errors.join(';')}` };
  if (before.bindings.length !== after.bindings.length) {
    return { valuesOnly: false, reason: 'BINDING_SUBJECT_SET_CHANGED' };
  }
  const valueKeys = new Set(EVIDENCE_BINDING_VALUE_KEYS);
  for (let index = 0; index < before.bindings.length; index += 1) {
    const left = before.bindings[index];
    const right = after.bindings[index];
    if (left.subject !== right.subject) {
      return { valuesOnly: false, reason: 'BINDING_SUBJECT_SET_CHANGED' };
    }
    for (const key of EVIDENCE_BINDING_KEYS) {
      if (key === 'subject') continue;
      if (left[key] === right[key]) continue;
      if (valueKeys.has(key)) continue;
      return { valuesOnly: false, reason: `BINDING_NON_VALUE_KEY_CHANGED:${key}` };
    }
  }
  return { valuesOnly: true, reason: 'VALUES_ONLY' };
}

/**
 * The diff-shape guard for `config/document-role-corrections.v1.json`:
 * corrections are an append-only registry. Existing entries must survive
 * byte-identical and in order; new valid entries may be appended. Removal,
 * reordering, editing, or structural re-keying is substantive.
 * @param {string | null} beforeText
 * @param {string | null} afterText
 */
export function isAppendOnlyCorrectionsChange(beforeText, afterText) {
  if (beforeText === null || afterText === null) {
    return { appendOnly: false, reason: beforeText === null ? 'CORRECTIONS_FILE_ADDED' : 'CORRECTIONS_FILE_DELETED' };
  }
  let before;
  let after;
  try {
    before = parseDocumentRoleCorrections(JSON.parse(beforeText));
    after = parseDocumentRoleCorrections(JSON.parse(afterText));
  } catch {
    return { appendOnly: false, reason: 'CORRECTIONS_FILE_UNPARSEABLE' };
  }
  if (!after.ok) return { appendOnly: false, reason: `CORRECTIONS_SCHEMA_INVALID_AFTER:${after.errors.join(';')}` };
  if (!before.ok) return { appendOnly: false, reason: `CORRECTIONS_SCHEMA_INVALID_BEFORE:${before.errors.join(';')}` };
  if (after.corrections.length < before.corrections.length) {
    return { appendOnly: false, reason: 'CORRECTION_ENTRY_REMOVED' };
  }
  for (let index = 0; index < before.corrections.length; index += 1) {
    const left = before.corrections[index];
    const right = after.corrections[index];
    for (const key of CORRECTION_ENTRY_KEYS) {
      if (left[key] !== right[key]) {
        return { appendOnly: false, reason: `CORRECTION_EXISTING_ENTRY_CHANGED:${key}` };
      }
    }
  }
  return { appendOnly: true, reason: 'APPEND_ONLY' };
}

/**
 * Evaluate one file's guard for a raw byte change. Unknown guard classes fail
 * closed: only the two declared bindings files are guarded at all.
 * @param {string} file
 * @param {string | null} beforeText
 * @param {string | null} afterText
 */
export function guardHoldsForChange(file, beforeText, afterText) {
  const guard = guardClassForPath(file);
  if (guard === 'VALUES_ONLY_BINDINGS') return isValuesOnlyBindingChange(beforeText, afterText).valuesOnly;
  if (guard === 'APPEND_ONLY_CORRECTIONS') return isAppendOnlyCorrectionsChange(beforeText, afterText).appendOnly;
  return false;
}

// ---------------------------------------------------------------------------
// Loading (fs authority here; no git). Legacy fallback is read-once
// compatibility for pre-migration checkouts and never wins over the new file.
// ---------------------------------------------------------------------------

function readJsonFile(root, relative) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  } catch {
    return null;
  }
}

/** Legacy bindings may carry a literal HEAD token; the evaluator resolves it. */
function isLegacyEvidenceValue(value) {
  return typeof value === 'string' && (SHA40_RE.test(value) || /^HEAD$/i.test(value));
}

/**
 * @param {string} root
 * @param {{ requireFile?: boolean }} [options] `requireFile` fails closed when
 *   the release-evidence file is absent (the hardening rule); the default is
 *   the compatibility window — absent falls back to the retired locations.
 * @returns {{ ok: boolean, present: boolean, errors: string[], bySubject: Map<string, ReturnType<typeof parseEvidenceBinding>['binding']> }}
 */
export function loadReleaseEvidenceBindings(root, options = {}) {
  const raw = readJsonFile(root, RELEASE_EVIDENCE_FILE);
  if (raw === null) {
    const missing = [`RELEASE_EVIDENCE_UNREADABLE:${RELEASE_EVIDENCE_FILE}`];
    return {
      ok: options.requireFile !== true,
      present: false,
      errors: options.requireFile === true ? missing : [],
      bySubject: new Map(),
    };
  }
  const parsed = parseReleaseEvidence(raw);
  const bySubject = new Map();
  for (const binding of parsed.bindings) bySubject.set(binding.subject, binding);
  return { ok: parsed.ok, present: true, errors: parsed.errors, bySubject };
}

/**
 * Legacy compatibility: the retired binding locations, consulted only when the
 * release-evidence file carries no binding for the subject.
 * @param {string} root
 * @param {string} subject
 * @returns {string | null}
 */
export function legacyEvidenceSha(root, subject) {
  const certification = readJsonFile(root, 'config/release-certification.v1.json');
  const conditions = Array.isArray(certification?.conditions) ? certification.conditions : [];
  for (const condition of conditions) {
    if (condition !== null && typeof condition === 'object' && condition.id === subject) {
      return isLegacyEvidenceValue(condition.evidenceSha) ? condition.evidenceSha : null;
    }
  }
  const lanes = readJsonFile(root, 'config/validation-lane-state.v1.json');
  const laneEntries = Array.isArray(lanes?.lanes) ? lanes.lanes : [];
  for (const lane of laneEntries) {
    if (lane !== null && typeof lane === 'object' && lane.laneId === subject) {
      return isLegacyEvidenceValue(lane.evidenceSha) ? lane.evidenceSha : null;
    }
  }
  return null;
}

/**
 * Resolve a subject's bound evidence SHA: release-evidence.v1.json first, the
 * retired locations once for compatibility, then absent.
 * @param {string} root
 * @param {string} subject
 */
export function resolveEvidenceShaForSubject(root, subject) {
  const loaded = loadReleaseEvidenceBindings(root);
  const bound = loaded.bySubject.get(subject);
  if (bound !== undefined) return bound.evidenceSha;
  return legacyEvidenceSha(root, subject);
}

/**
 * The document-role corrections, new file first and the retired inline
 * `corrections` array once for compatibility.
 * @param {string} root
 */
export function loadDocumentRoleCorrections(root) {
  const raw = readJsonFile(root, DOCUMENT_ROLE_CORRECTIONS_FILE);
  if (raw !== null) {
    const parsed = parseDocumentRoleCorrections(raw);
    return { ok: parsed.ok, errors: parsed.errors, corrections: parsed.corrections, source: DOCUMENT_ROLE_CORRECTIONS_FILE };
  }
  const legacy = readJsonFile(root, 'config/document-role.v1.json');
  const corrections = Array.isArray(legacy?.corrections) ? legacy.corrections : [];
  return { ok: true, errors: [], corrections, source: 'config/document-role.v1.json (legacy fallback)' };
}
