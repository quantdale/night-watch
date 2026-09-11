// ---------------------------------------------------------------------------
// Schema version lifecycle — the MIGRATE primitive.
//
// Two layers, separated so each is provable on its own:
//
//   1. `runMigrationStep` is the PURE transform. It validates the old value
//      against the OLD version's validator BEFORE touching it, so a record
//      that fails the old validator is reported corrupt and never migrated
//      into a shape the new validator would then bless. The transform itself
//      must be deterministic, total and pure; the plan carries no I/O.
//
//   2. `executeNonDestructiveMigration` performs the write protocol over
//      INJECTED io: read the original bytes, run the step, write ONLY the new
//      path, re-read it, and only then report MIGRATED. The original path is
//      never written, renamed or deleted by this module, so an interrupted or
//      failed migration leaves the original readable by construction rather
//      than by cleanup logic. `originalPath === newPath` is refused up front:
//      a migration must not overwrite the record it is migrating.
//
// The review store's no-replace primitive and the checkpoint store's
// supersede-not-delete rule are the same discipline; this module makes it
// expressible for any persisted reader.
// ---------------------------------------------------------------------------

export interface MigrationStepPlan<Old, New> {
  readonly migrationId: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  /** The OLD version's validator. Throws on a record that is not that shape. */
  readonly validateOld: (value: unknown) => Old;
  /** The NEW version's validator, run on the migrated result. Throws on drift. */
  readonly validateNew: (value: unknown) => New;
  /** Deterministic, total, pure transform from the old shape to the new one. */
  readonly migrate: (old: Old) => New;
}

export type MigrationStepOutcome<New> =
  | { readonly status: 'MIGRATED'; readonly value: New }
  | { readonly status: 'REFUSED_CORRUPT'; readonly reason: string }
  | { readonly status: 'REFUSED_MIGRATION_FAILED'; readonly reason: string };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Validate old, transform, validate new. A failure at the old validator is
 * CORRUPT (the bytes are not a record of that version); a failure in the
 * transform or the new validator is a migration defect, reported separately
 * so neither is silently classified as the other.
 */
export function runMigrationStep<Old, New>(value: unknown, plan: MigrationStepPlan<Old, New>): MigrationStepOutcome<New> {
  let old: Old;
  try {
    old = plan.validateOld(value);
  } catch (error) {
    return { status: 'REFUSED_CORRUPT', reason: `OLD_VALIDATOR_REJECTED:${errorText(error)}` };
  }
  let migrated: New;
  try {
    migrated = plan.migrate(old);
    plan.validateNew(migrated);
  } catch (error) {
    return { status: 'REFUSED_MIGRATION_FAILED', reason: errorText(error) };
  }
  return { status: 'MIGRATED', value: migrated };
}

export interface NonDestructiveMigrationIo {
  /** The original bytes, or null when no record exists. Never written here. */
  readonly readOriginal: () => string | null;
  /** Write the new record to a DIFFERENT path. May throw. */
  readonly writeNew: (bytes: string) => void;
  /** Re-read the new record for verification. Returns null when absent. */
  readonly readNew: () => string | null;
}

export type NonDestructiveMigrationStatus =
  | 'MIGRATED'
  | 'ALREADY_CURRENT'
  | 'REFUSED_NO_RECORD'
  | 'REFUSED_CORRUPT'
  | 'REFUSED_WRITE'
  | 'REFUSED_READBACK';

export interface NonDestructiveMigrationResult {
  readonly status: NonDestructiveMigrationStatus;
  readonly migrationId: string;
  /** True exactly when the original bytes are untouched and still readable. */
  readonly originalRetained: boolean;
  readonly reason: string;
  /** The migrated record when the outcome is MIGRATED. */
  readonly value?: unknown;
}

export interface NonDestructiveMigrationInput<Old, New> {
  readonly originalPath: string;
  readonly newPath: string;
  readonly plan: MigrationStepPlan<Old, New>;
  readonly parse: (text: string) => unknown;
  readonly serialize: (value: New) => string;
  readonly io: NonDestructiveMigrationIo;
  /** Optional detector: true when the parsed original is already the new version. */
  readonly isCurrent?: (value: unknown) => boolean;
}

/**
 * The write protocol. On every non-MIGRATED outcome the function has written
 * nothing to the original path and returns `originalRetained: true`; on
 * REFUSED_READBACK the new record exists but was not proven, so the original
 * still stands as the readable record.
 */
export function executeNonDestructiveMigration<Old, New>(
  input: NonDestructiveMigrationInput<Old, New>,
): NonDestructiveMigrationResult {
  const base = { migrationId: input.plan.migrationId, originalRetained: true };
  if (input.originalPath === input.newPath) {
    return { ...base, status: 'REFUSED_WRITE', reason: 'NEW_PATH_EQUALS_ORIGINAL_PATH' };
  }
  const originalBytes = input.io.readOriginal();
  if (originalBytes === null) {
    return { ...base, status: 'REFUSED_NO_RECORD', reason: 'NO_ORIGINAL_RECORD' };
  }
  let parsed: unknown;
  try {
    parsed = input.parse(originalBytes);
  } catch (error) {
    return { ...base, status: 'REFUSED_CORRUPT', reason: `ORIGINAL_UNPARSEABLE:${errorText(error)}` };
  }
  if (input.isCurrent !== undefined && input.isCurrent(parsed)) {
    return { ...base, status: 'ALREADY_CURRENT', reason: 'ORIGINAL_ALREADY_CURRENT' };
  }
  const step = runMigrationStep(parsed, input.plan);
  if (step.status === 'REFUSED_CORRUPT') {
    return { ...base, status: 'REFUSED_CORRUPT', reason: step.reason };
  }
  if (step.status === 'REFUSED_MIGRATION_FAILED') {
    return { ...base, status: 'REFUSED_WRITE', reason: step.reason };
  }
  const staged = input.serialize(step.value);
  try {
    input.io.writeNew(staged);
  } catch (error) {
    return { ...base, status: 'REFUSED_WRITE', reason: `WRITE_FAILED:${errorText(error)}` };
  }
  let readBack: string | null;
  try {
    readBack = input.io.readNew();
  } catch (error) {
    return { ...base, status: 'REFUSED_READBACK', reason: `READBACK_FAILED:${errorText(error)}` };
  }
  if (readBack === null) {
    return { ...base, status: 'REFUSED_READBACK', reason: 'READBACK_ABSENT' };
  }
  let reread: unknown;
  try {
    reread = input.parse(readBack);
    input.plan.validateNew(reread);
  } catch (error) {
    return { ...base, status: 'REFUSED_READBACK', reason: `READBACK_INVALID:${errorText(error)}` };
  }
  return { ...base, status: 'MIGRATED', reason: 'WRITTEN_AND_RE_READ', value: step.value };
}
