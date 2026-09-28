// F-02 validation lane state — negative probes and live-record checks.
//
// The lane-state record must resolve every class declared in
// `config/validation-universe.v1.json` exactly once, a non-PROVEN lane must
// name a condition and a revisit date, staleness is computed (never stored),
// and an expired revisit date is reported.

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  collectRevisitDue,
  loadLaneState,
  reportLaneState,
  validateLaneState,
} from '../../bin/lib/validation-lane-state.mjs';
import { isValuesOnlyBindingChange } from '../../bin/lib/release-evidence.mjs';
import { isApprovedCheckpointPath } from '../../bin/agent-continuity-protocol.mjs';
import type { LaneStateEntry } from '../../bin/lib/validation-lane-state.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const UNIVERSE_CLI = path.join(REPO_ROOT, 'bin', 'validation-universe.mjs');
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SHA_C = 'c'.repeat(40);

function lane(overrides: Partial<LaneStateEntry> = {}): LaneStateEntry {
  return {
    laneId: 'lane-one',
    classes: ['CLASS_ONE'],
    class: 'PROVEN',
    command: 'npm run example',
    evidence: 'observed',
    evidenceSha: SHA_A,
    unblockCondition: null,
    revisitDate: null,
    ...overrides,
  };
}

test.describe('validation lane state', () => {
  test('the live record resolves every declared class exactly once', () => {
    const declaration = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'validation-universe.v1.json'), 'utf8'));
    const loaded = loadLaneState(REPO_ROOT);
    expect(loaded.ok).toBe(true);
    expect(loaded.lanes.length).toBeGreaterThanOrEqual(10);
    const errors = validateLaneState(loaded.lanes, Object.keys(declaration.classes));
    expect(errors).toEqual([]);
  });

  test('a class with no lane entry fails', () => {
    const errors = validateLaneState([lane()], ['CLASS_ONE', 'CLASS_TWO']);
    expect(errors.map((entry) => entry.code)).toContain('LANE_STATE_CLASS_MISSING');
  });

  test('a class owned by two lane entries fails', () => {
    const errors = validateLaneState(
      [lane(), lane({ laneId: 'lane-two' })],
      ['CLASS_ONE'],
    );
    expect(errors.map((entry) => entry.code)).toContain('LANE_STATE_CLASS_DUPLICATE');
  });

  test('a non-PROVEN lane without a condition or revisit date fails', () => {
    const errors = validateLaneState(
      [lane({ class: 'UNAVAILABLE_CAPABILITY', unblockCondition: '', revisitDate: null })],
      ['CLASS_ONE'],
    );
    const codes = errors.map((entry) => entry.code);
    expect(codes).toContain('LANE_STATE_CONDITION_MISSING');
    expect(codes).toContain('LANE_STATE_REVISIT_MISSING');
  });

  // VB-01 (corrections task 2.1) — a documentary commit can never erase
  // evidence or make an unevidenced PROVEN claim look fresh.
  test('VB-01: a PROVEN lane with a nulled evidenceSha fails structural validation', () => {
    expect(validateLaneState([lane({ evidenceSha: null })], ['CLASS_ONE']).map((entry) => entry.code))
      .toContain('LANE_STATE_EVIDENCE_SHA_MISSING');
    // A PROVEN lane WITH its 40-hex evidence stays valid.
    expect(validateLaneState([lane()], ['CLASS_ONE'])).toEqual([]);
  });

  test('VB-01: erasing a binding evidence value is substantive, never values-only', () => {
    const binding = (evidenceSha: string | null) => JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha, receiptDigest: null, observedAt: null, executor: null }],
    });
    // The regression: non-null -> null used to classify VALUES_ONLY.
    expect(isValuesOnlyBindingChange(binding(SHA_A), binding(null))).toEqual({
      valuesOnly: false,
      reason: 'BINDING_VALUE_NULLED:evidenceSha',
    });
    // Every evidence value is protected the same way.
    const receipt = (receiptDigest: string | null) => JSON.stringify({
      schemaVersion: 'nightwatch.release-evidence.v1',
      bindings: [{ subject: 'root-compile', evidenceSha: SHA_A, receiptDigest, observedAt: null, executor: null }],
    });
    expect(isValuesOnlyBindingChange(receipt('receipt:sha256:' + 'a'.repeat(24)), receipt(null))).toEqual({
      valuesOnly: false,
      reason: 'BINDING_VALUE_NULLED:receiptDigest',
    });
    // Adding evidence where there was none, and refreshing values, stay
    // values-only — the guard is narrowed to erasure, not widened to every
    // value edit.
    expect(isValuesOnlyBindingChange(binding(null), binding(SHA_A)).valuesOnly).toBe(true);
    expect(isValuesOnlyBindingChange(binding(SHA_A), binding(SHA_B)).valuesOnly).toBe(true);
  });

  test('VB-01: any change to the lane-state record is substantive (class changes cannot hide)', () => {
    // validation-lane-state.v1.json is not an approved documentation-only
    // path and carries no diff guard that could admit a class change, so a
    // lane-class change is substantive by construction.
    expect(isApprovedCheckpointPath('config/validation-lane-state.v1.json')).toBe(false);
  });

  test('staleness is computed from evidence ancestry, never stored', () => {
    const lanes = [
      lane({ laneId: 'current', evidenceSha: SHA_B }),
      lane({ laneId: 'old', evidenceSha: SHA_A }),
      lane({ laneId: 'future', evidenceSha: SHA_C }),
    ];
    const report = reportLaneState(lanes, SHA_B, (left, right) => left === SHA_A && right === SHA_B);
    expect(report.find((entry) => entry.laneId === 'current')?.reportedClass).toBe('PROVEN');
    expect(report.find((entry) => entry.laneId === 'old')?.staleEvidence).toBe(true);
    expect(report.find((entry) => entry.laneId === 'old')?.reportedClass).toBe('PROVEN (STALE_EVIDENCE)');
    // an incomparable SHA is not asserted stale by the injected predicate
    expect(report.find((entry) => entry.laneId === 'future')?.staleEvidence).toBe(false);
  });

  test('an expired revisit date is reported, a future one is not', () => {
    const lanes = [
      lane({ laneId: 'due', class: 'BLOCKED_EXTERNAL', unblockCondition: 'owner action', revisitDate: '2026-09-01' }),
      lane({ laneId: 'future', class: 'BLOCKED_EXTERNAL', unblockCondition: 'owner action', revisitDate: '2026-12-01' }),
      lane({ laneId: 'proven' }),
    ];
    const due = collectRevisitDue(lanes, '2026-09-12');
    expect(due.map((entry) => entry.laneId)).toEqual(['due']);
  });

  test('the universe CLI emits the lane-state record and exits zero', () => {
    const result = spawnSync(process.execPath, [UNIVERSE_CLI, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean;
      laneState: { schemaVersion: string; lastSubstantiveSha: string; lanes: Array<{ laneId: string; reportedClass: string }> };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.laneState.schemaVersion).toBe('nightwatch.validation-lane-state.v1');
    expect(parsed.laneState.lanes.length).toBeGreaterThanOrEqual(10);
    expect(parsed.laneState.lanes.map((entry) => entry.laneId)).toContain('exact-checkpoint-ci');
  });

  test('an invalid lane-state file fails the universe judgement', () => {
    const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nw-lane-'));
    try {
      fs.mkdirSync(path.join(root, 'config'), { recursive: true });
      fs.copyFileSync(path.join(REPO_ROOT, 'config', 'validation-lane-state.v1.json'), path.join(root, 'config', 'validation-lane-state.v1.json'));
      const record = JSON.parse(fs.readFileSync(path.join(root, 'config', 'validation-lane-state.v1.json'), 'utf8'));
      record.lanes[0].classes = ['NOT_DECLARED'];
      fs.writeFileSync(path.join(root, 'config', 'validation-lane-state.v1.json'), JSON.stringify(record));
      const loaded = loadLaneState(root);
      const errors = validateLaneState(loaded.lanes, ['BIN_SYNTAX']);
      expect(errors.map((entry) => entry.code)).toEqual(
        expect.arrayContaining(['LANE_STATE_CLASS_UNKNOWN']),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
