// ---------------------------------------------------------------------------
// Schema version lifecycle — vocabulary.
//
// Closes F-17. `src` declares hundreds of `nightwatch.<name>.v<n>` schema
// identifiers. Some describe bytes on the owner's disk; most describe values
// that never leave one process. Nothing marked which was which, so an author
// editing a version literal could not tell whether they were bumping an
// in-memory shape or orphaning owner state.
//
// This module is data-only: no fs, no network, no persistence. The scanner
// and the declaration validator are pure; only the `check`/`export`/`bump`
// entry points touch the filesystem, and they are named as such.
// ---------------------------------------------------------------------------

/** Version stamped into the schema-lifecycle judgement itself. */
export const SCHEMA_VERSION_LIFECYCLE_VERSION = 'nightwatch.schema-version-lifecycle.v1' as const;

/**
 * Where a persisted schema's bytes live. `IN_MEMORY` is the explicit answer
 * for a schema that is never written; a declaration may not omit the field.
 */
export const SCHEMA_STORE_LOCATIONS = [
  'REVIEW_STORE',
  'CAMPAIGN_CHECKPOINTS',
  'PRIVATE_ARTIFACTS',
  'GATE_RECEIPTS',
  'AGENT_RECORDS',
  'REPOSITORY_CORPUS',
  'IN_MEMORY',
] as const;
export type SchemaStoreLocation = (typeof SCHEMA_STORE_LOCATIONS)[number];

/**
 * The role of one DISCOVERED version of one schema family.
 *
 * CURRENT              — the version this build writes.
 * READ_COMPATIBLE      — an older version a current reader still accepts
 *                        unchanged; requires a registered fixture.
 * MIGRATED             — an older version readable only through a registered
 *                        migration; the old validator runs first.
 * ORPHANED             — deliberately unreadable; requires a recorded owner
 *                        decision in docs/DECISIONS.md. Never a default.
 * SYNTHETIC_PROBE      — a deliberate unknown-version literal in an
 *                        adversarial fixture, never owner data.
 * IN_MEMORY_HISTORICAL — an older in-process shape with no persistence cost.
 */
export const SCHEMA_VERSION_ROLES = [
  'CURRENT',
  'READ_COMPATIBLE',
  'MIGRATED',
  'ORPHANED',
  'SYNTHETIC_PROBE',
  'IN_MEMORY_HISTORICAL',
] as const;
export type SchemaVersionRole = (typeof SCHEMA_VERSION_ROLES)[number];

/** Every disposition a persisted version change may carry. */
export const MIGRATION_DISPOSITION_KINDS = ['MIGRATE', 'READ_COMPATIBLE', 'ORPHAN'] as const;
export type MigrationDispositionKind = (typeof MIGRATION_DISPOSITION_KINDS)[number];

/**
 * One recorded disposition for one persisted version transition.
 *
 * The proof field is required by kind, so a disposition cannot be asserted
 * without a mechanical witness:
 *   MIGRATE          -> migrationId, registered in SCHEMA_MIGRATIONS
 *   READ_COMPATIBLE  -> fixtureId, registered in READ_COMPATIBILITY_FIXTURES
 *   ORPHAN           -> decisionRef, present in docs/DECISIONS.md
 */
export interface SchemaVersionDisposition {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly kind: MigrationDispositionKind;
  readonly migrationId?: string;
  readonly fixtureId?: string;
  readonly decisionRef?: string;
  readonly reason: string;
}

export interface SchemaFamilyDeclaration {
  /** `nightwatch.<name>`, without the trailing `.v<n>`. */
  readonly family: string;
  readonly persisted: boolean;
  readonly store: SchemaStoreLocation;
  /** Version written by this build; null only for a probe-only synthetic family. */
  readonly currentVersion: number | null;
  /** Role of every DISCOVERED version of this family. */
  readonly versions: Readonly<Record<number, SchemaVersionRole>>;
  readonly dispositions: readonly SchemaVersionDisposition[];
  readonly note: string;
}

/** One discovered identifier, with the files that declare it. */
export interface DiscoveredSchemaIdentifier {
  readonly identifier: string;
  readonly family: string;
  readonly version: number;
  readonly files: readonly string[];
}

export const SCHEMA_LIFECYCLE_ERROR_CODES = [
  /** The scanner discovered zero identifiers; a non-vacuous scan is required. */
  'SCHEMA_SCAN_EMPTY',
  /** A discovered identifier has no declaration naming its exact version. */
  'SCHEMA_UNDECLARED',
  /** A declaration names a family/version the scanner did not discover. */
  'SCHEMA_DECLARATION_STALE',
  /** The same family is declared twice. */
  'SCHEMA_DECLARATION_DUPLICATE',
  /** A persisted family with no CURRENT version, or several. */
  'SCHEMA_CURRENT_VERSION_INVALID',
  /** A persisted non-current version carries no disposition. */
  'SCHEMA_DISPOSITION_MISSING',
  /** A disposition's kind disagrees with the version role it covers. */
  'SCHEMA_DISPOSITION_ROLE_MISMATCH',
  /** A MIGRATE disposition names a migration that is not registered. */
  'SCHEMA_MIGRATION_UNREGISTERED',
  /** A READ_COMPATIBLE disposition names a fixture that is not registered. */
  'SCHEMA_FIXTURE_UNREGISTERED',
  /** An ORPHAN disposition names a decision absent from DECISIONS.md. */
  'SCHEMA_ORPHAN_DECISION_MISSING',
  /** A registered fixture covers no READ_COMPATIBLE disposition. */
  'SCHEMA_FIXTURE_ORPHANED',
  /** A SYNTHETIC_PROBE version has no registered adversarial evidence. */
  'SCHEMA_PROBE_UNREGISTERED',
  /** A declaration's persisted flag and store location disagree. */
  'SCHEMA_STORE_LOCATION_INVALID',
  /** An in-memory family carries a disposition, which would misstate cost. */
  'SCHEMA_MEMORY_DISPOSITION_PRESENT',
] as const;
export type SchemaLifecycleErrorCode = (typeof SCHEMA_LIFECYCLE_ERROR_CODES)[number];

export interface SchemaLifecycleFinding {
  readonly code: SchemaLifecycleErrorCode;
  readonly detail: string;
}

export interface SchemaLifecycleJudgement {
  readonly schemaVersion: typeof SCHEMA_VERSION_LIFECYCLE_VERSION;
  readonly discoveredCount: number;
  readonly familyCount: number;
  readonly persistedFamilyCount: number;
  readonly fixtureCount: number;
  readonly migrationCount: number;
  readonly findings: readonly SchemaLifecycleFinding[];
  readonly ok: boolean;
}

/** Parse `nightwatch.<name>.v<n>`, or null when it is not one. */
export function parseSchemaIdentifier(identifier: string): { readonly family: string; readonly version: number } | null {
  const match = /^(nightwatch\.[A-Za-z0-9_.-]+)\.v([0-9]+)$/.exec(identifier);
  if (match === null || match[1] === undefined || match[2] === undefined) return null;
  const version = Number(match[2]);
  if (!Number.isSafeInteger(version) || version < 1) return null;
  return { family: match[1], version };
}
