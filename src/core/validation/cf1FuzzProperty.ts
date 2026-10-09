// ---------------------------------------------------------------------------
// CF-1 fuzz/property census (A-16 / M10 11.3).
//
// The ledger entry carried forward from
// `nightwatch-continuous-deep-hardening-v1` task 3.2 reads "Fuzz/property ≥20
// cases PASS". It was recorded once at 12/12 — below its own threshold — and
// never measured again, so the campaign had no honest answer to "is CF-1 met?".
//
// This module is the JUDGEMENT half of the census. It is pure: the caller
// supplies the declared subject set (which suites are fuzz/property work, what
// each owes, and the recorded total) and an already-counted observation (how
// many `test(...)` cases each subject suite declares). It reads no filesystem
// and resolves no paths, so the same judgement runs in the gate, in a unit
// test and in a clean clone.
//
// The ratchet only turns one way. The CF-1 entry floor is a hard minimum; each
// subject owes its own recorded minimum; and the recorded TOTAL is the
// burn-down's high-water mark, so REMOVING a case fails while ADDING one does
// not. The record is re-measured deliberately, never silently.
// ---------------------------------------------------------------------------

export const CF1_FUZZ_PROPERTY_REPORT_VERSION = 'nightwatch.cf1-fuzz-property.v1' as const;

/** The closed class vocabulary of the census. */
export const CF1_SUBJECT_KINDS = ['FUZZ', 'PROPERTY'] as const;
export type Cf1SubjectKind = (typeof CF1_SUBJECT_KINDS)[number];

/** The ledger's own entry requirement, pinned in one place. */
export const CF1_MINIMUM_ENTRY_CASES = 20;

export interface Cf1SubjectDeclaration {
  /** Repository-relative path of the suite. */
  readonly file: string;
  readonly kind: Cf1SubjectKind;
  /** What the suite proves, in one sentence; a bare path is not a subject. */
  readonly subject: string;
  /** The per-suite floor. Removing a case below it fails the census. */
  readonly minimumCases: number;
  /** The measured count at the recording date; the historical record. */
  readonly recordedCases: number;
  /** Seeded property suites: how many generated cases each test runs. */
  readonly recordedGeneratedCasesPerSeed?: number;
  /**
   * Exactly ONE subject carries the CF-1 entry threshold. The ledger entry
   * names a fuzz/property suite, so at least one suite must meet the entry
   * floor BY ITSELF rather than borrowing cases from its siblings.
   */
  readonly cf1EntrySubject?: boolean;
}

export interface Cf1ObservedSubject {
  readonly file: string;
  readonly cases: number;
}

export interface Cf1SubjectResult {
  readonly file: string;
  readonly kind: Cf1SubjectKind;
  readonly subject: string;
  readonly measuredCases: number;
  readonly minimumCases: number;
  readonly recordedCases: number;
}

export interface Cf1Finding {
  readonly code: string;
  readonly detail: string;
}

export interface Cf1Judgement {
  readonly schemaVersion: typeof CF1_FUZZ_PROPERTY_REPORT_VERSION;
  readonly subjectCount: number;
  readonly totalCases: number;
  readonly minimumCases: number;
  readonly recordedTotalCases: number;
  readonly subjects: readonly Cf1SubjectResult[];
  readonly findings: readonly Cf1Finding[];
}

/**
 * The census judgement.
 *
 * Every direction that could quietly make the census vacuous fails closed: an
 * empty subject set, a subject with no path/subject/minimum, a duplicate
 * subject, an observation for an undeclared suite, a declared suite with no
 * observation, a recorded total that does not reconcile with its own subjects,
 * and an entry floor below the ledger's own requirement.
 */
export function judgeCf1FuzzProperty(input: {
  readonly subjects: readonly Cf1SubjectDeclaration[];
  readonly observedCases: readonly Cf1ObservedSubject[];
  readonly minimumCases: number;
  readonly recordedTotalCases: number;
  readonly recordedOn: string;
}): Cf1Judgement {
  /** @type {Cf1Finding[]} */
  const findings: Cf1Finding[] = [];

  if (typeof input.recordedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.recordedOn)) {
    findings.push({ code: 'CF1_RECORDED_DATE_MISSING', detail: 'the census records no measurement date as YYYY-MM-DD; an undated measurement cannot be re-taken' });
  }
  if (!Number.isInteger(input.minimumCases) || input.minimumCases < CF1_MINIMUM_ENTRY_CASES) {
    findings.push({
      code: 'CF1_MINIMUM_BELOW_ENTRY',
      detail: `the census floor is ${String(input.minimumCases)}, below the CF-1 entry requirement of ${CF1_MINIMUM_ENTRY_CASES}; weakening the floor to fit a shrunken suite is not a census`,
    });
  }

  if (input.subjects.length === 0) {
    findings.push({ code: 'CF1_SUBJECT_SET_EMPTY', detail: 'the census declares no fuzz/property subject; an empty set satisfies every count and proves nothing' });
  }

  /** @type {Map<string, Cf1SubjectDeclaration>} */
  const declared = new Map();
  for (const subject of input.subjects) {
    if (
      typeof subject.file !== 'string' || subject.file.length === 0
      || typeof subject.subject !== 'string' || subject.subject.trim().length < 12
      || !Number.isInteger(subject.minimumCases) || subject.minimumCases < 1
      || !Number.isInteger(subject.recordedCases) || subject.recordedCases < 1
      || !(CF1_SUBJECT_KINDS as readonly string[]).includes(subject.kind)
    ) {
      findings.push({ code: 'CF1_SUBJECT_SHAPE_INVALID', detail: `a declared subject is incomplete: ${JSON.stringify(subject)}` });
      continue;
    }
    if (declared.has(subject.file)) {
      findings.push({ code: 'CF1_DUPLICATE_SUBJECT', detail: `${subject.file} is declared more than once; one suite cannot be counted twice` });
      continue;
    }
    declared.set(subject.file, subject);
  }

  /** @type {Map<string, number>} */
  const observed = new Map();
  for (const entry of input.observedCases) {
    if (typeof entry.file !== 'string' || entry.file.length === 0) {
      findings.push({ code: 'CF1_OBSERVATION_SHAPE_INVALID', detail: `an observation carries no suite path: ${JSON.stringify(entry)}` });
      continue;
    }
    if (!Number.isInteger(entry.cases) || entry.cases < 0) {
      findings.push({ code: 'CF1_OBSERVATION_COUNT_INVALID', detail: `${entry.file} was observed as ${String(entry.cases)} declared cases; a count is a non-negative integer` });
      continue;
    }
    if (observed.has(entry.file)) {
      findings.push({ code: 'CF1_OBSERVATION_DUPLICATE', detail: `${entry.file} was observed more than once` });
      continue;
    }
    observed.set(entry.file, entry.cases);
  }

  for (const file of observed.keys()) {
    if (!declared.has(file)) findings.push({ code: 'CF1_OBSERVATION_UNDECLARED', detail: `${file} was counted but is not a declared census subject; a suite cannot join the census silently` });
  }

  // Exactly one subject carries the CF-1 entry threshold, and it must owe the
  // entry floor itself. A census where every subject borrows its sufficiency
  // from the others is a census that reports a total the entry never asked for.
  const entrySubjects = input.subjects.filter((subject) => subject.cf1EntrySubject === true);
  if (entrySubjects.length === 0) {
    findings.push({ code: 'CF1_ENTRY_SUBJECT_UNDECLARED', detail: `no declared subject carries cf1EntrySubject; the CF-1 entry threshold of ${CF1_MINIMUM_ENTRY_CASES} must be met by at least one suite by itself` });
  } else if (entrySubjects.length > 1) {
    findings.push({ code: 'CF1_ENTRY_SUBJECT_DUPLICATE', detail: `${entrySubjects.length} subjects claim cf1EntrySubject; the entry threshold is owed by exactly one suite` });
  }
  for (const entry of entrySubjects) {
    if (entry.minimumCases < CF1_MINIMUM_ENTRY_CASES) {
      findings.push({ code: 'CF1_ENTRY_SUBJECT_FLOOR_TOO_LOW', detail: `${entry.file} carries the CF-1 entry threshold but owes only ${entry.minimumCases} cases` });
    }
    const measured = observed.get(entry.file);
    if (measured !== undefined && measured < CF1_MINIMUM_ENTRY_CASES) {
      findings.push({ code: 'CF1_ENTRY_SUBJECT_BELOW_ENTRY', detail: `${entry.file} carries the CF-1 entry threshold and declares only ${measured} cases, below the entry requirement of ${CF1_MINIMUM_ENTRY_CASES}` });
    }
  }

  const subjects: Cf1SubjectResult[] = [];
  let totalCases = 0;
  let recordedSum = 0;
  for (const [file, subject] of [...declared.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    recordedSum += subject.recordedCases;
    const measured = observed.get(file);
    if (measured === undefined) {
      findings.push({ code: 'CF1_OBSERVATION_MISSING_SUBJECT', detail: `${file} is a declared census subject but was never observed; the census cannot reason about a suite it did not count` });
      continue;
    }
    totalCases += measured;
    if (measured < subject.minimumCases) {
      findings.push({
        code: 'CF1_SUBJECT_CASES_BELOW_MINIMUM',
        detail: `${file} declares ${measured} fuzz/property cases, below its recorded minimum of ${subject.minimumCases}; restoring the cases is the repair, not lowering the minimum`,
      });
    }
    if (measured < subject.recordedCases) {
      findings.push({
        code: 'CF1_SUBJECT_CASES_BELOW_RECORDED',
        detail: `${file} declares ${measured} cases, below the ${subject.recordedCases} recorded on its measurement date; a fuzz/property suite only ever loses coverage by deletion`,
      });
    }
    subjects.push({
      file,
      kind: subject.kind,
      subject: subject.subject,
      measuredCases: measured,
      minimumCases: subject.minimumCases,
      recordedCases: subject.recordedCases,
    });
  }

  if (!Number.isInteger(input.recordedTotalCases) || input.recordedTotalCases < 1) {
    findings.push({ code: 'CF1_RECORDED_TOTAL_INVALID', detail: 'the recorded total is not a positive integer' });
  } else if (input.recordedTotalCases !== recordedSum) {
    findings.push({
      code: 'CF1_RECORDED_TOTAL_MISMATCH',
      detail: `the recorded total ${input.recordedTotalCases} does not reconcile with the sum of its subjects (${recordedSum}); a total that drifts from its own detail is not a measurement`,
    });
  }

  if (Number.isInteger(input.minimumCases) && totalCases < input.minimumCases) {
    findings.push({ code: 'CF1_TOTAL_BELOW_MINIMUM', detail: `the census measures ${totalCases} fuzz/property cases, below the floor of ${input.minimumCases}` });
  }
  if (Number.isInteger(input.recordedTotalCases) && totalCases < input.recordedTotalCases) {
    findings.push({
      code: 'CF1_TOTAL_BELOW_RECORDED',
      detail: `the census measures ${totalCases} cases, below the ${input.recordedTotalCases} recorded on its measurement date; CF-1 was met once and must not silently become unmet`,
    });
  }

  return {
    schemaVersion: CF1_FUZZ_PROPERTY_REPORT_VERSION,
    subjectCount: subjects.length,
    totalCases,
    minimumCases: input.minimumCases,
    recordedTotalCases: input.recordedTotalCases,
    subjects,
    findings,
  };
}
