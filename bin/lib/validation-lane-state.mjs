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

export const LANE_STATE_SCHEMA = 'nightwatch.validation-lane-state.v1';
export const LANE_STATE_FILE = Object.freeze({ config: 'config', name: 'validation-lane-state.v1.json' });
export const LANE_STATE_CLASSES = Object.freeze(['PROVEN', 'BLOCKED_EXTERNAL', 'UNAVAILABLE_CAPABILITY']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function laneStatePath(root) {
  return path.join(root, LANE_STATE_FILE.config, LANE_STATE_FILE.name);
}

export function loadLaneState(root) {
  const raw = readJson(laneStatePath(root));
  if (raw === null) return { ok: false, errors: [{ code: 'LANE_STATE_UNREADABLE', detail: 'config/validation-lane-state.v1.json missing or invalid JSON' }], lanes: [] };
  if (raw.schemaVersion !== LANE_STATE_SCHEMA) {
    return { ok: false, errors: [{ code: 'LANE_STATE_SCHEMA_UNSUPPORTED', detail: String(raw.schemaVersion) }], lanes: [] };
  }
  const lanes = Array.isArray(raw.lanes) ? raw.lanes : [];
  if (lanes.length === 0) {
    return { ok: false, errors: [{ code: 'LANE_STATE_EMPTY', detail: 'the lane-state record declares no lane' }], lanes: [] };
  }
  return { ok: true, errors: [], lanes };
}

/**
 * Structural validation. `declaredClasses` is the list of classes declared in
 * config/validation-universe.v1.json; every one must resolve to exactly one
 * lane entry, and a lane may not claim an undeclared class.
 */
export function validateLaneState(lanes, declaredClasses) {
  const errors = [];
  const seenIds = new Set();
  const classOwners = new Map();
  const declared = new Set(declaredClasses);
  for (const lane of lanes) {
    const laneId = typeof lane?.laneId === 'string' && lane.laneId !== '' ? lane.laneId : null;
    if (laneId === null) {
      errors.push({ code: 'LANE_STATE_LANE_ID_MISSING', detail: 'a lane entry declares no laneId' });
      continue;
    }
    if (seenIds.has(laneId)) errors.push({ code: 'LANE_STATE_DUPLICATE', detail: laneId });
    seenIds.add(laneId);
    if (!LANE_STATE_CLASSES.includes(lane?.class)) {
      errors.push({ code: 'LANE_STATE_CLASS_INVALID', detail: `${laneId}: ${String(lane?.class)}` });
    }
    if (typeof lane?.evidence !== 'string' || lane.evidence.trim() === '') {
      errors.push({ code: 'LANE_STATE_EVIDENCE_MISSING', detail: laneId });
    }
    if (typeof lane?.evidenceSha !== 'string' || !SHA_RE.test(lane.evidenceSha)) {
      errors.push({ code: 'LANE_STATE_EVIDENCE_SHA_INVALID', detail: `${laneId}: ${String(lane?.evidenceSha)}` });
    }
    if (lane?.class !== 'PROVEN') {
      if (typeof lane?.unblockCondition !== 'string' || lane.unblockCondition.trim() === '') {
        errors.push({ code: 'LANE_STATE_CONDITION_MISSING', detail: laneId });
      }
      if (typeof lane?.revisitDate !== 'string' || !DATE_RE.test(lane.revisitDate)) {
        errors.push({ code: 'LANE_STATE_REVISIT_MISSING', detail: laneId });
      }
    }
    for (const claimed of Array.isArray(lane?.classes) ? lane.classes : []) {
      if (!declared.has(claimed)) {
        errors.push({ code: 'LANE_STATE_CLASS_UNKNOWN', detail: `${laneId}: ${claimed}` });
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

/** Revisit-due lanes for an injected calendar date (YYYY-MM-DD). */
export function collectRevisitDue(lanes, todayIso) {
  const today = typeof todayIso === 'string' && DATE_RE.test(todayIso) ? todayIso : null;
  if (today === null) return [];
  return lanes
    .filter((lane) => typeof lane?.revisitDate === 'string' && DATE_RE.test(lane.revisitDate) && lane.revisitDate < today)
    .map((lane) => ({ laneId: lane.laneId, revisitDate: lane.revisitDate }))
    .sort((left, right) => left.laneId.localeCompare(right.laneId));
}
