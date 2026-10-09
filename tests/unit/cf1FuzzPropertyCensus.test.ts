// ---------------------------------------------------------------------------
// CF-1 / A-16 (M10 11.3) — the fuzz/property census, measured.
//
// The ledger entry "Fuzz/property >=20 cases PASS" was recorded at 12/12 and
// never measured again, so the campaign could not answer "is CF-1 met?" at all.
// This suite re-measures it and records the number:
//
//   - it COUNTS the declared `test(...)` cases of every declared subject suite
//     from the tracked bytes (no trust in a hand-written number);
//   - it drives the pure judgement in src/core/validation/cf1FuzzProperty.ts,
//     which enforces the CF-1 entry floor of 20, each subject's own floor, and
//     the recorded total as a high-water mark that only ever turns up;
//   - it proves the census FAILS when a suite loses a case, which is the whole
//     point of a ratchet that has never been re-measured.
//
// Pure judgement cases run in-process; the counting cases read tracked bytes.
// No network, no DEV, no credentials.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import {
  CF1_MINIMUM_ENTRY_CASES,
  CF1_FUZZ_PROPERTY_REPORT_VERSION,
  judgeCf1FuzzProperty,
  type Cf1SubjectDeclaration,
} from '../../src/core/validation/cf1FuzzProperty';

const REPO_ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(REPO_ROOT, 'config', 'cf1-fuzz-property.v1.json');

interface Cf1Config {
  readonly schemaVersion: string;
  readonly minimumCases?: unknown;
  readonly recordedTotalCases?: unknown;
  readonly recordedOn?: unknown;
  readonly subjects?: unknown;
}

function readConfig(): Cf1Config {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Cf1Config;
}

/**
 * Count the `test(...)` declarations of one suite from its tracked bytes.
 *
 * Anchored at the start of a line so a `test(` inside a longer expression is
 * not miscounted, and so `test.describe(` / `test.only(` / `test.step(` never
 * match: the census counts CASES, not groups or steps.
 */
function countDeclaredCases(file: string): number {
  const absolute = path.join(REPO_ROOT, file);
  expect(fs.existsSync(absolute), `${file} is a declared census subject but does not exist`).toBe(true);
  const text = fs.readFileSync(absolute, 'utf8');
  return [...text.matchAll(/^[ \t]*test\(/gm)].length;
}

test.describe('CF-1 — the fuzz/property census is measured and ratcheted', () => {
  test('the declaration carries the CF-1 entry requirement and a dated measurement', () => {
    const config = readConfig();
    expect(config.schemaVersion).toBe('nightwatch.cf1-fuzz-property.v1');
    expect(config.minimumCases).toBeGreaterThanOrEqual(CF1_MINIMUM_ENTRY_CASES);
    expect(config.recordedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const subjects = config.subjects as Cf1SubjectDeclaration[];
    expect(Array.isArray(subjects) && subjects.length).toBeGreaterThanOrEqual(1);
    // Every declared subject exists, names what it proves, and owes at least one case.
    for (const subject of subjects) {
      expect(fs.existsSync(path.join(REPO_ROOT, subject.file)), subject.file).toBe(true);
      expect(subject.subject.trim().length, `${subject.file} states no subject`).toBeGreaterThanOrEqual(12);
      expect(subject.minimumCases).toBeGreaterThanOrEqual(1);
      expect(subject.recordedCases).toBeGreaterThanOrEqual(subject.minimumCases);
    }
  });

  test('the census is RE-MEASURED: the recorded number is what the suites actually declare', () => {
    const config = readConfig();
    const subjects = config.subjects as Cf1SubjectDeclaration[];
    const observed = subjects.map((subject) => ({ file: subject.file, cases: countDeclaredCases(subject.file) }));
    const judgement = judgeCf1FuzzProperty({
      subjects,
      observedCases: observed,
      minimumCases: config.minimumCases as number,
      recordedTotalCases: config.recordedTotalCases as number,
      recordedOn: config.recordedOn as string,
    });
    expect(judgement.findings.map((finding) => finding.code), JSON.stringify(judgement.findings)).toEqual([]);
    expect(judgement.schemaVersion).toBe(CF1_FUZZ_PROPERTY_REPORT_VERSION);
    // A-16's answer: the measured total, at least the CF-1 floor.
    expect(judgement.totalCases).toBeGreaterThanOrEqual(CF1_MINIMUM_ENTRY_CASES);
    expect(judgement.totalCases).toBe(judgement.recordedTotalCases);
    expect(judgement.subjectCount).toBe(subjects.length);
    // The recorded per-suite numbers are the measured ones.
    for (const subject of judgement.subjects) {
      expect(subject.measuredCases, `${subject.file} recorded ${subject.recordedCases} but declares ${subject.measuredCases}`).toBe(subject.recordedCases);
    }
  });

  test('the canonical fuzz suite alone meets the CF-1 entry threshold', () => {
    // The narrowest reading of the ledger entry — one fuzz/property suite by
    // itself — must hold, because that was the suite the earlier 12/12 record
    // named. The census declares exactly one such subject.
    const config = readConfig();
    const subjects = config.subjects as Cf1SubjectDeclaration[];
    const entrySubjects = subjects.filter((subject) => subject.cf1EntrySubject === true);
    expect(entrySubjects, 'exactly one subject carries the CF-1 entry threshold').toHaveLength(1);
    for (const subject of entrySubjects) {
      expect(subject.minimumCases).toBeGreaterThanOrEqual(CF1_MINIMUM_ENTRY_CASES);
      expect(countDeclaredCases(subject.file), `${subject.file} alone must meet the CF-1 entry floor`).toBeGreaterThanOrEqual(CF1_MINIMUM_ENTRY_CASES);
    }
    // The other subjects still owe their own recorded floors.
    for (const subject of subjects.filter((entry) => entry.cf1EntrySubject !== true)) {
      expect(countDeclaredCases(subject.file), `${subject.file} must meet its own floor`).toBeGreaterThanOrEqual(subject.minimumCases);
    }
  });

  test('the judgement is pure and fail-closed in every direction that matters', () => {
    const base = {
      subjects: [{ file: 'tests/unit/fuzzProperty.test.ts', kind: 'FUZZ' as const, subject: 'synthetic subject description', minimumCases: 20, recordedCases: 22, cf1EntrySubject: true }],
      observedCases: [{ file: 'tests/unit/fuzzProperty.test.ts', cases: 22 }],
      minimumCases: 20,
      recordedTotalCases: 22,
      recordedOn: '2026-10-09',
    };
    const codes = (input: Parameters<typeof judgeCf1FuzzProperty>[0]): string[] =>
      judgeCf1FuzzProperty(input).findings.map((finding) => finding.code);

    expect(codes(base)).toEqual([]);
    // An empty subject set is vacuous, not clean.
    expect(codes({ ...base, subjects: [] })).toEqual(['CF1_SUBJECT_SET_EMPTY', 'CF1_OBSERVATION_UNDECLARED', 'CF1_ENTRY_SUBJECT_UNDECLARED', 'CF1_RECORDED_TOTAL_MISMATCH', 'CF1_TOTAL_BELOW_MINIMUM', 'CF1_TOTAL_BELOW_RECORDED']);
    // A suite below the CF-1 entry floor fails even when its own floor is lower.
    expect(codes({ ...base, minimumCases: 0 })).toEqual(['CF1_MINIMUM_BELOW_ENTRY']);
    // A missing observation fails: the census cannot reason about uncounted
    // work, and an uncounted suite obviously cannot meet its floor either.
    expect(codes({ ...base, observedCases: [] })).toEqual(['CF1_OBSERVATION_MISSING_SUBJECT', 'CF1_TOTAL_BELOW_MINIMUM', 'CF1_TOTAL_BELOW_RECORDED']);
    // A counted suite that is not declared cannot join silently.
    expect(codes({ ...base, observedCases: [...base.observedCases, { file: 'tests/unit/undeclared.test.ts', cases: 3 }] })).toEqual(['CF1_OBSERVATION_UNDECLARED']);
    // A duplicate subject is counted twice, which is the same inflation.
    expect(codes({ ...base, subjects: [...base.subjects, base.subjects[0]!] })).toEqual(['CF1_DUPLICATE_SUBJECT', 'CF1_ENTRY_SUBJECT_DUPLICATE']);
    // Removing a case below a subject's own floor fails.
    expect(codes({ ...base, observedCases: [{ file: base.subjects[0]!.file, cases: 0 }] })).toEqual(['CF1_ENTRY_SUBJECT_BELOW_ENTRY', 'CF1_SUBJECT_CASES_BELOW_MINIMUM', 'CF1_SUBJECT_CASES_BELOW_RECORDED', 'CF1_TOTAL_BELOW_MINIMUM', 'CF1_TOTAL_BELOW_RECORDED']);
    // One case short of the entry threshold on the entry subject.
    expect(codes({ ...base, observedCases: [{ file: base.subjects[0]!.file, cases: 19 }] })).toEqual(['CF1_ENTRY_SUBJECT_BELOW_ENTRY', 'CF1_SUBJECT_CASES_BELOW_MINIMUM', 'CF1_SUBJECT_CASES_BELOW_RECORDED', 'CF1_TOTAL_BELOW_MINIMUM', 'CF1_TOTAL_BELOW_RECORDED']);
    // No subject carrying the entry threshold is a census that borrows its
    // sufficiency from the total.
    expect(codes({ ...base, subjects: base.subjects.map((subject) => ({ ...subject, cf1EntrySubject: false })) })).toEqual(['CF1_ENTRY_SUBJECT_UNDECLARED']);
    // Two subjects claiming it is the same ambiguity.
    expect(codes({
      ...base,
      subjects: [...base.subjects, { ...base.subjects[0]!, file: 'tests/unit/second.test.ts' }],
      observedCases: [...base.observedCases, { file: 'tests/unit/second.test.ts', cases: 22 }],
      recordedTotalCases: 44,
    })).toEqual(['CF1_ENTRY_SUBJECT_DUPLICATE']);
    // A recorded total that drifts from its own subjects fails.
    expect(codes({ ...base, recordedTotalCases: 99 })).toEqual(['CF1_RECORDED_TOTAL_MISMATCH', 'CF1_TOTAL_BELOW_RECORDED']);
    // An undated measurement cannot be re-taken.
    expect(codes({ ...base, recordedOn: 'last tuesday' })).toEqual(['CF1_RECORDED_DATE_MISSING']);
  });

  test('the census FAILS when a suite loses a case — the ratchet that was never measured', () => {
    const config = readConfig();
    const subjects = config.subjects as Cf1SubjectDeclaration[];
    const observed = subjects.map((subject) => ({ file: subject.file, cases: countDeclaredCases(subject.file) }));
    const withOneCaseRemoved = observed.map((entry, index) => (index === 0 ? { ...entry, cases: entry.cases - 1 } : entry));
    const judgement = judgeCf1FuzzProperty({
      subjects,
      observedCases: withOneCaseRemoved,
      minimumCases: config.minimumCases as number,
      recordedTotalCases: config.recordedTotalCases as number,
      recordedOn: config.recordedOn as string,
    });
    expect(judgement.findings.map((finding) => finding.code)).toEqual(['CF1_SUBJECT_CASES_BELOW_RECORDED', 'CF1_TOTAL_BELOW_RECORDED']);
    expect(judgement.totalCases).toBe((config.recordedTotalCases as number) - 1);
  });
});
