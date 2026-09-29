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

import crypto from 'node:crypto';
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
const ARTIFACT_PATH_RE = /^(?!\/)(?!.*\.\.)[A-Za-z0-9._/-]{1,200}$/;
const CORRECTION_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const LINE_DIGEST_RE = /^sha256:[0-9a-f]{24,64}$/;

/** Exact key set of one evidence binding. Closed: any other key is structural. */
export const EVIDENCE_BINDING_KEYS = Object.freeze(['subject', 'evidenceSha', 'receiptDigest', 'observedAt', 'executor', 'artifactPaths']);
/** The ONLY fields a values-only change may touch. `artifactPaths` is deliberately
 * structural: the declared evidence-artifact set is part of the evidence
 * contract (VB-02 / corrections task 2.2), never a refreshable value. */
export const EVIDENCE_BINDING_VALUE_KEYS = Object.freeze(['evidenceSha', 'receiptDigest', 'observedAt', 'executor']);
/** Max declared artifact paths per binding. */
export const EVIDENCE_BINDING_MAX_ARTIFACTS = 8;
/**
 * sha256-prefix digest of one line (no newline) — the exact digest semantics
 * the APPEND_ONLY guard and the correction entries share.
 */
export function lineSha256Prefix(text) {
  return `sha256:${crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 24)}`;
}

/**
 * VB-03 / corrections task 2.3 — the bounded historical exception for the
 * same-commit pairing rule. These entries were registered BEFORE the pairing
 * rule existed (two pre-registration appends, `8775b58a` and its follow-up,
 * exempted archive lines removed in later commits). They are INERT: every one
 * of their exempted lines is already absent from its archive (dormant count
 * 0, enforced by `correctionStillExemptsArchive`), so none can enable a
 * future rewrite. Enumerated exactly — a newly registered entry is NEVER on
 * this list and must pair its removal in its own commit. Recorded in
 * docs/DECISIONS.md D-146.
 */
export const LEGACY_PRE_REGISTERED_CORRECTION_IDS = Object.freeze(["CORR-7-001", "CORR-7-002", "CORR-7-003", "CORR-7-004", "CORR-7-005", "CORR-7-006", "CORR-PC-001", "CORR-W1-001", "CORR-W1-002", "CORR-W1-003", "CORR-H1-001", "CORR-DS-001", "CORR-W11-001", "CORR-W12-001", "CORR-W12-002", "CORR-W13-001", "CORR-PERF-001", "CORR-AUD-001", "CORR-AUD-010-001", "CORR-TERM-001", "CORR-SUCC-001", "CORR-SUCC-002"]);

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
  // VB-02 / corrections task 2.2: every binding declares its evidence artifact
  // paths - safe relative repository paths, de-duplicated, bounded. Host-local
  // evidence with no tracked artifact declares an empty list explicitly.
  let artifactPaths = [];
  if (!Array.isArray(raw.artifactPaths)) {
    errors.push('BINDING_ARTIFACT_PATHS_NOT_AN_ARRAY');
  } else if (raw.artifactPaths.length > EVIDENCE_BINDING_MAX_ARTIFACTS) {
    errors.push(`BINDING_ARTIFACT_PATHS_TOO_MANY:${raw.artifactPaths.length}`);
  } else {
    const seenPath = new Set();
    for (const entry of raw.artifactPaths) {
      if (typeof entry !== 'string' || !ARTIFACT_PATH_RE.test(entry)) {
        errors.push(`BINDING_ARTIFACT_PATH_INVALID:${String(entry)}`);
        continue;
      }
      if (seenPath.has(entry)) {
        errors.push(`BINDING_ARTIFACT_PATH_DUPLICATE:${entry}`);
        continue;
      }
      seenPath.add(entry);
      artifactPaths.push(entry);
    }
  }
  if (errors.length > 0) return { ok: false, errors, binding: null };
  return {
    ok: true,
    errors,
    binding: { subject, evidenceSha, receiptDigest, observedAt, executor, artifactPaths },
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
  const seenDigests = new Set();
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
    // RV-01 / corrections task 7.1: two entries exempting the SAME archive line
    // (same path, same digest) are one exemption stated twice — the second
    // could outlive the removal that justified the first.
    const digestKey = `${item.path}\u0000${item.oldLineSha256}`;
    if (seenDigests.has(digestKey)) errors.push(`CORRECTION_DIGEST_DUPLICATE:${item.id}`);
    seenDigests.add(digestKey);
    corrections.push({ id: item.id, path: item.path, oldLineSha256: item.oldLineSha256, oldLineExcerpt: item.oldLineExcerpt, reason: item.reason });
  }
  return { ok: errors.length === 0, errors, corrections };
}

/**
 * The diff-shape guard for `config/release-evidence.v1.json`: a change is
 * documentation-only when BOTH sides validate against the closed schema, the
 * ordered subject list is identical, and no binding key outside
 * {@link EVIDENCE_BINDING_VALUE_KEYS} differs — with one exception: erasing
 * a value (non-null -> null) is substantive, because lost evidence is not a
 * documentation edit. Everything else — a new or removed subject, a reorder,
 * a non-binding key, an unknown key, a malformed value, or an unparseable
 * side — is substantive.
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
    // RV-02 / corrections task 7.2: re-pointing a subject at a DIFFERENT commit
    // (null -> A or A -> B) is documentary only when it comes WITH a new
    // receipt: a non-null receiptDigest that differs from the previous one,
    // and the observation time and executor that produced it. Values alone let
    // a docs-only commit re-bind a lane or condition to a fresh SHA without
    // any re-execution.
    if (right.evidenceSha !== null && right.evidenceSha !== left.evidenceSha) {
      if (right.receiptDigest === null || right.observedAt === null || right.executor === null) {
        return { valuesOnly: false, reason: `BINDING_REBIND_WITHOUT_RECEIPT:${left.subject}` };
      }
      if (right.receiptDigest === left.receiptDigest) {
        return { valuesOnly: false, reason: `BINDING_REBIND_RECEIPT_UNCHANGED:${left.subject}` };
      }
    }
    for (const key of EVIDENCE_BINDING_KEYS) {
      if (key === 'subject') continue;
      // Array-valued keys (artifactPaths) need element-wise equality: two
      // separately parsed [] are never `===`.
      if (Array.isArray(left[key]) && Array.isArray(right[key])) {
        if (left[key].length === right[key].length && left[key].every((entry, i) => entry === right[key][i])) continue;
        return { valuesOnly: false, reason: `BINDING_NON_VALUE_KEY_CHANGED:${key}` };
      }
      if (left[key] === right[key]) continue;
      // VB-01 / corrections task 2.1: erasing an evidence value (non-null ->
      // null) is a substantive loss of proof, never a values-only
      // documentation edit — a documentary commit must never be able to turn
      // a stale PROVEN lane into a fresh-looking one by removing its
      // evidence. Adding evidence where there was none (null -> value) and
      // value -> value refreshes stay values-only.
      if (valueKeys.has(key) && right[key] === null) {
        return { valuesOnly: false, reason: `BINDING_VALUE_NULLED:${key}` };
      }
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
/**
 * VB-03 / corrections task 2.3 — the correction entries appended by one
 * commit (after minus before, by id). null when either side is unparseable.
 * @param {string | null} beforeText
 * @param {string | null} afterText
 */
export function appendedCorrectionEntries(beforeText, afterText) {
  if (beforeText === null || afterText === null) return null;
  let before;
  let after;
  try {
    before = parseDocumentRoleCorrections(JSON.parse(beforeText));
    after = parseDocumentRoleCorrections(JSON.parse(afterText));
  } catch {
    return null;
  }
  if (!before.ok || !after.ok) return null;
  const beforeIds = new Set(before.corrections.map((entry) => entry.id));
  return after.corrections.filter((entry) => !beforeIds.has(entry.id));
}

/**
 * VB-03 — a correction append is documentary only when the SAME commit
 * removes exactly the archive line the entry exempts. The bounded legacy
 * exception covers the pre-rule registrations, which are inert (their lines
 * are already absent). `removedDigests` is the set of removed-line digests
 * from the entry's own path in that one commit.
 * @param {{ id: string, oldLineSha256: string }} entry
 * @param {ReadonlySet<string>} removedDigests
 */
export function isCorrectionAppendAdmissible(entry, removedDigests) {
  if (LEGACY_PRE_REGISTERED_CORRECTION_IDS.includes(entry.id)) {
    return { admissible: true, reason: 'LEGACY_PRE_REGISTERED_INERT' };
  }
  return removedDigests.has(entry.oldLineSha256)
    ? { admissible: true, reason: 'PAIRED_WITH_SAME_COMMIT_REMOVAL' }
    : { admissible: false, reason: 'CORRECTION_APPEND_UNPAIRED' };
}

/**
 * VB-03 — the total invariant: a correction entry may never exempt a line
 * that is still LIVE in its archive. A live exempted line is a purchased
 * future rewrite. Pure over the entry and the archive's current text.
 * @param {{ oldLineSha256: string }} entry
 * @param {string} archiveText
 */
export function correctionStillExemptsArchive(entry, archiveText) {
  return archiveText.split(/\r?\n/).some((line) => lineSha256Prefix(line) === entry.oldLineSha256);
}

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

/**
 * VB-05 / corrections task 2.5 — only an exact 40-hex commit identity is a
 * legacy evidence value. The literal `HEAD` is SELF-CERTIFYING (it resolves to
 * whatever HEAD is at evaluation time) and is invalid everywhere: no binding,
 * legacy field or definition may carry it.
 */
function isLegacyEvidenceValue(value) {
  return typeof value === 'string' && SHA40_RE.test(value);
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
    // VB-05 — the compatibility window is closed: the bindings file is the
    // evidence registry, and an absent registry is always an error (the
    // legacy `requireFile` option is retained as a no-op alias so existing
    // callers read the same intent).
    const missing = [`RELEASE_EVIDENCE_UNREADABLE:${RELEASE_EVIDENCE_FILE}`];
    return {
      ok: false,
      present: false,
      errors: missing,
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
 * Resolve a subject's bound evidence SHA from release-evidence.v1.json ONLY;
 * an unbound subject (or an absent/invalid registry) resolves to null.
 * @param {string} root
 * @param {string} subject
 */
export function resolveEvidenceShaForSubject(root, subject) {
  // VB-05 — project:check requires the bindings file AND its schema; a
  // missing or schema-invalid registry never falls through to the retired
  // locations (a fallthrough would let a broken registry self-certify from
  // the legacy copies). Only a PRESENT, VALID registry with the subject
  // UNBOUND consults the retired locations once.
  const loaded = loadReleaseEvidenceBindings(root, { requireFile: true });
  if (!loaded.ok || !loaded.present) return null;
  // RV-08 / corrections task 7.6: an UNBOUND subject is unevidenced (null); the
  // retired locations are never consulted, so a stale copy left behind in the
  // lane record or the certification definition cannot resurrect evidence.
  return loaded.bySubject.get(subject)?.evidenceSha ?? null;
}

/**
 * The document-role corrections from config/document-role-corrections.v1.json
 * (the retired inline array is no longer consulted; an absent file is an error).
 * @param {string} root
 */
export function loadDocumentRoleCorrections(root) {
  const raw = readJsonFile(root, DOCUMENT_ROLE_CORRECTIONS_FILE);
  if (raw !== null) {
    const parsed = parseDocumentRoleCorrections(raw);
    return { ok: parsed.ok, errors: parsed.errors, corrections: parsed.corrections, source: DOCUMENT_ROLE_CORRECTIONS_FILE };
  }
  // RV-08 / corrections task 7.6: an absent corrections file is an ERROR, never
  // a silent fall back to the retired inline array — that fallback let a
  // deleted registry read as "no corrections" and stop enforcing them.
  return { ok: false, errors: [`CORRECTIONS_FILE_MISSING:${DOCUMENT_ROLE_CORRECTIONS_FILE}`], corrections: [], source: DOCUMENT_ROLE_CORRECTIONS_FILE };
}
