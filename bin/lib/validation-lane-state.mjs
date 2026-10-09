// F-02 validation lane state. One versioned record per declared lane, with a
// three-valued class (`PROVEN` / `BLOCKED_EXTERNAL` / `UNAVAILABLE_CAPABILITY`)
// and a computed fourth report state, `STALE_EVIDENCE`.
//
// The class is what was proven. Staleness is derived by comparing the lane's
// evidence SHA with the last substantive implementation SHA; it is never
// stored. Every class declared in config/validation-universe.v1.json must
// resolve to exactly one lane entry, and a non-PROVEN lane must name a
// non-empty unblock condition and a revisit date.
//
// Read-only over the filesystem; staleness is computed from an injected
// ancestor predicate so the module stays deterministic and testable.

import fs from 'node:fs';
import path from 'node:path';
import { resolveEvidenceShaForSubject } from './release-evidence.mjs';

export const LANE_STATE_SCHEMA = 'nightwatch.validation-lane-state.v1';
export const LANE_STATE_FILE = Object.freeze({ config: 'config', name: 'validation-lane-state.v1.json' });
export const LANE_STATE_CLASSES = Object.freeze(['PROVEN', 'BLOCKED_EXTERNAL', 'UNAVAILABLE_CAPABILITY']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

/**
 * One lane entry as `validateLaneState` proved it: a named owner of declared
 * classes carrying an exact evidence binding. A field the record need not
 * declare is `undefined` rather than absent, so a runtime `??` fallback stays
 * available to a caller that never validated its input.
 *
 * @typedef {{ laneId: string, classes: readonly string[] | undefined, class: string | undefined, command: string | undefined, evidence: string | undefined, evidenceSha: string | null | undefined, unblockCondition: string | null | undefined, revisitDate: string | null | undefined }} LaneStateRecord
 * @typedef {{ code: string, detail: string }} LaneStateDiagnostic
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The two fields this loader reads out of the stored record. A JSON document
 * that is not an object declares neither, so its `schemaVersion` reads as
 * `undefined` and it is reported as an unsupported schema rather than as
 * unreadable JSON.
 *
 * @param {string} file
 * @returns {Partial<{ schemaVersion: unknown, lanes: unknown }> | null}
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** @param {string} root @returns {string} */
export function laneStatePath(root) {
  return path.join(root, LANE_STATE_FILE.config, LANE_STATE_FILE.name);
}

/**
 * @param {string} root
 * @returns {{ ok: boolean, errors: LaneStateDiagnostic[], lanes: unknown[] }}
 */
export function loadLaneState(root) {
  const raw = readJson(laneStatePath(root));
  if (raw === null) return { ok: false, errors: [{ code: 'LANE_STATE_UNREADABLE', detail: 'config/validation-lane-state.v1.json missing or invalid JSON' }], lanes: [] };
  if (raw.schemaVersion !== LANE_STATE_SCHEMA) {
    return { ok: false, errors: [{ code: 'LANE_STATE_SCHEMA_UNSUPPORTED', detail: String(raw.schemaVersion) }], lanes: [] };
  }
  /** @type {unknown[]} */
  const lanes = Array.isArray(raw.lanes) ? /** @type {unknown[]} */ (raw.lanes) : [];
  if (lanes.length === 0) {
    return { ok: false, errors: [{ code: 'LANE_STATE_EMPTY', detail: 'the lane-state record declares no lane' }], lanes: [] };
  }
  // A-01: evidence bindings live in config/release-evidence.v1.json (the
  // checkpoint-neutral location) and ONLY there. RV-08 / corrections task 7.6:
  // the lane record's own `evidenceSha` is a retired location and is no longer
  // consulted — an unbound lane resolves to null (an unevidenced PROVEN claim
  // then fails structurally), never to a stale copy left in the lane record.
  const resolved = lanes.map((lane) => {
    if (!isRecord(lane)) return lane;
    const laneId = typeof lane.laneId === 'string' ? lane.laneId : null;
    if (laneId === null) return lane;
    return { ...lane, evidenceSha: resolveEvidenceShaForSubject(root, laneId) };
  });
  return { ok: true, errors: [], lanes: resolved };
}

/**
 * Structural validation. `declaredClasses` is the list of classes declared in
 * config/validation-universe.v1.json; every one must resolve to exactly one
 * lane entry, and a lane may not claim an undeclared class.
 *
 * @param {readonly unknown[]} lanes
 * @param {readonly string[]} declaredClasses
 * @returns {LaneStateDiagnostic[]}
 */
export function validateLaneState(lanes, declaredClasses) {
  /** @type {LaneStateDiagnostic[]} */
  const errors = [];
  const seenIds = new Set();
  /** @type {Map<string, string>} */
  const classOwners = new Map();
  const declared = new Set(declaredClasses);
  for (const lane of lanes) {
    const entry = isRecord(lane) ? lane : {};
    const laneId = typeof entry.laneId === 'string' && entry.laneId !== '' ? entry.laneId : null;
    if (laneId === null) {
      errors.push({ code: 'LANE_STATE_LANE_ID_MISSING', detail: 'a lane entry declares no laneId' });
      continue;
    }
    if (seenIds.has(laneId)) errors.push({ code: 'LANE_STATE_DUPLICATE', detail: laneId });
    seenIds.add(laneId);
    const laneClass = typeof entry.class === 'string' ? entry.class : null;
    if (laneClass === null || !LANE_STATE_CLASSES.includes(laneClass)) {
      errors.push({ code: 'LANE_STATE_CLASS_INVALID', detail: `${laneId}: ${String(entry.class)}` });
    }
    if (typeof entry.evidence !== 'string' || entry.evidence.trim() === '') {
      errors.push({ code: 'LANE_STATE_EVIDENCE_MISSING', detail: laneId });
    }
    if (entry.evidenceSha !== null && entry.evidenceSha !== undefined) {
      if (typeof entry.evidenceSha !== 'string' || !SHA_RE.test(entry.evidenceSha)) {
        errors.push({ code: 'LANE_STATE_EVIDENCE_SHA_INVALID', detail: `${laneId}: ${String(entry.evidenceSha)}` });
      }
    } else if (laneClass === 'PROVEN') {
      // VB-01 / corrections task 2.1: a PROVEN claim requires EXACT evidence.
      // A null evidenceSha is not "no staleness" — it is an unevidenced
      // PROVEN claim and must fail structural validation, so a documentary
      // commit can never flip a lane to fresh-looking PROVEN by removing the
      // evidence it was proven against.
      errors.push({ code: 'LANE_STATE_EVIDENCE_SHA_MISSING', detail: laneId });
    }
    if (laneClass !== 'PROVEN') {
      if (typeof entry.unblockCondition !== 'string' || entry.unblockCondition.trim() === '') {
        errors.push({ code: 'LANE_STATE_CONDITION_MISSING', detail: laneId });
      }
      if (typeof entry.revisitDate !== 'string' || !DATE_RE.test(entry.revisitDate)) {
        errors.push({ code: 'LANE_STATE_REVISIT_MISSING', detail: laneId });
      }
    }
    /** @type {unknown[]} */
    const claimedClasses = Array.isArray(entry.classes) ? /** @type {unknown[]} */ (entry.classes) : [];
    for (const claimed of claimedClasses) {
      if (typeof claimed !== 'string' || !declared.has(claimed)) {
        errors.push({ code: 'LANE_STATE_CLASS_UNKNOWN', detail: `${laneId}: ${String(claimed)}` });
        continue;
      }
      if (classOwners.has(claimed)) errors.push({ code: 'LANE_STATE_CLASS_DUPLICATE', detail: claimed });
      else classOwners.set(claimed, laneId);
    }
  }
  for (const declaredClass of declaredClasses) {
    if (!classOwners.has(declaredClass)) errors.push({ code: 'LANE_STATE_CLASS_MISSING', detail: declaredClass });
  }
  return errors;
}

/**
 * Report state per lane. `isAncestor(a, b)` answers whether commit `a` is an
 * ancestor of `b`; the fourth state is report-only and never stored.
 *
 * @param {readonly LaneStateRecord[]} lanes
 * @param {string | null} lastSubstantiveSha
 * @param {(left: string, right: string) => boolean} isAncestor
 */
export function reportLaneState(lanes, lastSubstantiveSha, isAncestor) {
  return lanes.map((lane) => {
    const staleEvidence = typeof lane.evidenceSha === 'string'
      && typeof lastSubstantiveSha === 'string'
      && lane.evidenceSha !== lastSubstantiveSha
      && typeof isAncestor === 'function'
      && isAncestor(lane.evidenceSha, lastSubstantiveSha) === true;
    const currentClass = lane.class === 'PROVEN' && staleEvidence ? 'PROVEN (STALE_EVIDENCE)' : lane.class;
    return {
      laneId: lane.laneId,
      classes: lane.classes ?? [],
      class: lane.class,
      reportedClass: currentClass,
      command: lane.command ?? null,
      evidence: lane.evidence ?? null,
      evidenceSha: lane.evidenceSha ?? null,
      unblockCondition: lane.unblockCondition ?? null,
      revisitDate: lane.revisitDate ?? null,
      staleEvidence,
    };
  });
}

/**
 * Revisit-due lanes for an injected calendar date (YYYY-MM-DD).
 *
 * @param {readonly LaneStateRecord[]} lanes
 * @param {string} todayIso
 * @returns {{ laneId: string, revisitDate: string }[]}
 */
export function collectRevisitDue(lanes, todayIso) {
  const today = typeof todayIso === 'string' && DATE_RE.test(todayIso) ? todayIso : null;
  if (today === null) return [];
  /** @type {{ laneId: string, revisitDate: string }[]} */
  const due = [];
  for (const lane of lanes) {
    const revisitDate = lane?.revisitDate;
    if (typeof revisitDate !== 'string' || !DATE_RE.test(revisitDate) || revisitDate >= today) continue;
    due.push({ laneId: lane.laneId, revisitDate });
  }
  return due.sort((left, right) => left.laneId.localeCompare(right.laneId));
}
