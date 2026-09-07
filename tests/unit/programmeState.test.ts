// W7 durable programme-state integrity — direct validator probes.
//
// The pure validator in `bin/lib/programme-state.mjs` must accept the live
// parent programme, reject the historical duplicate-`E` lane shape before
// parsing, reject ambiguous task/role identities across distinct lane keys,
// stay silent on key-like text inside (escaped) strings, and turn malformed
// documents into bounded diagnostics instead of throwing or passing.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { validateProgrammeState } from '../../bin/lib/programme-state.mjs';

const PARENT_PROGRAMME = path.join(
  __dirname,
  '..',
  '..',
  '.agent',
  'tasks',
  'nightwatch-autonomous-bug-hunting-programme-v1',
  'PROGRAMME.json'
);

function envelope(lanes: Record<string, unknown>): string {
  return JSON.stringify({
    schemaVersion: 'nightwatch.autonomous-programme-state.v1',
    programmeId: 'nightwatch-autonomous-bug-hunting-programme-v1',
    programmeStatus: 'IN_PROGRESS',
    currentWave: 'W7',
    lanes,
  });
}

function lane(taskId?: string, role?: string): Record<string, unknown> {
  const record: Record<string, unknown> = { status: 'integrated' };
  if (taskId !== undefined) record.taskId = taskId;
  if (role !== undefined) record.role = role;
  return record;
}

test('valid current parent programme passes', () => {
  const raw = fs.readFileSync(PARENT_PROGRAMME, 'utf8');
  const first = validateProgrammeState(raw);
  expect(first.ok).toBe(true);
  expect(first.errors).toEqual([]);
  // Pure and deterministic: repeated validation is byte-identical.
  expect(validateProgrammeState(raw)).toEqual(first);
});

test('synthetic duplicate E lane key fails before parsing', () => {
  const raw =
    '{"schemaVersion":"nightwatch.autonomous-programme-state.v1",' +
    '"programmeId":"nightwatch-autonomous-bug-hunting-programme-v1",' +
    '"programmeStatus":"IN_PROGRESS","currentWave":"W7",' +
    '"lanes":{"E":{"status":"integrated","taskId":"nightwatch-system-atlas-v1"},' +
    '"E":{"status":"integrated","taskId":"nightwatch-campaign-multi-investigation-v1"}}}';
  // Plain parsing would silently keep only the second E record.
  expect(() => JSON.parse(raw)).not.toThrow();
  expect(Object.keys((JSON.parse(raw) as { lanes: Record<string, unknown> }).lanes)).toEqual(['E']);
  const result = validateProgrammeState(raw);
  expect(result.ok).toBe(false);
  expect(result.errors.some((error) => error.includes('PROGRAMME_DUPLICATE_KEY') && error.includes('"E"'))).toBe(true);
});

test('two distinct lane keys with the same taskId fail', () => {
  const raw = envelope({
    E: lane('nightwatch-system-atlas-v1', 'W1_SYSTEM_ATLAS'),
    E6: lane('nightwatch-system-atlas-v1', 'W6_MULTI_INVESTIGATION_ENDURANCE'),
  });
  const result = validateProgrammeState(raw);
  expect(result.ok).toBe(false);
  expect(
    result.errors.some((error) => error.includes('PROGRAMME_DUPLICATE_TASK_ID') && error.includes('nightwatch-system-atlas-v1'))
  ).toBe(true);
});

test('two distinct lane keys with the same role fail', () => {
  const raw = envelope({
    E: lane('nightwatch-system-atlas-v1', 'W1_SYSTEM_ATLAS'),
    E6: lane('nightwatch-campaign-multi-investigation-v1', 'W1_SYSTEM_ATLAS'),
  });
  const result = validateProgrammeState(raw);
  expect(result.ok).toBe(false);
  expect(result.errors.some((error) => error.includes('PROGRAMME_DUPLICATE_ROLE') && error.includes('W1_SYSTEM_ATLAS'))).toBe(true);
});

test('escaped strings containing key-like text do not fail', () => {
  const raw =
    '{"schemaVersion":"nightwatch.autonomous-programme-state.v1",' +
    '"programmeId":"nightwatch-autonomous-bug-hunting-programme-v1",' +
    '"programmeStatus":"IN_PROGRESS","currentWave":"W7",' +
    '"lanes":{"A":{"status":"integrated","note":"saw \\"E\\": \\"E\\": twice, still one key"},' +
    '"E":{"status":"integrated","taskId":"nightwatch-system-atlas-v1","note":"lane \\"E6\\" is distinct"}}}';
  const result = validateProgrammeState(raw);
  expect(result.errors).toEqual([]);
  expect(result.ok).toBe(true);
});

test('malformed documents produce bounded diagnostics without throwing', () => {
  const cases = [
    '{"schemaVersion":"nightwatch.autonomous-programme-state.v1",',
    'not json at all {{{',
    '{"schemaVersion":1,"programmeId":null,"programmeStatus":"IN_PROGRESS","currentWave":"W7","lanes":[]}',
  ];
  for (const raw of cases) {
    let result: { ok: boolean; errors: string[] } | null = null;
    expect(() => {
      result = validateProgrammeState(raw);
    }).not.toThrow();
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(false);
    expect(result!.errors.length).toBeGreaterThan(0);
    for (const error of result!.errors) {
      expect(error.length).toBeLessThanOrEqual(300);
      expect(error).not.toMatch(/[\r\n]/);
    }
  }
});

test('unsafe envelope values fail closed', () => {
  const raw = envelope({ A: lane() });
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  parsed.schemaVersion = 'nightwatch.evil-programme.v9';
  parsed.programmeStatus = 'PARTIAL';
  const result = validateProgrammeState(JSON.stringify(parsed));
  expect(result.ok).toBe(false);
  expect(result.errors.some((error) => error.includes('PROGRAMME_SCHEMA_MISMATCH'))).toBe(true);
  expect(result.errors.some((error) => error.includes('PROGRAMME_STATUS_UNKNOWN'))).toBe(true);
});
