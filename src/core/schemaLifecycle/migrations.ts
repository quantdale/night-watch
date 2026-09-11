// ---------------------------------------------------------------------------
// Schema version lifecycle — registered migration identities.
//
// A MIGRATE disposition names an implementation that must exist. This
// registry is metadata only: the implementation stays in the module that owns
// the schema (for agent-budget v1 -> v2 that is
// src/core/agentRuntime/checkpoint.ts), because a lifecycle module that
// reimplemented the transform would become a second, weaker authority on the
// shape it does not own. Tests resolve each id to the real implementation and
// run it against an old-version fixture.
//
// Data-only: no fs, no network, no persistence.
// ---------------------------------------------------------------------------

export interface SchemaMigrationRegistration {
  readonly migrationId: string;
  readonly schemaFamily: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  /** Module that owns the implementation, for the proof test to resolve. */
  readonly implementationModule: string;
  /** Exported surface the proof test drives. */
  readonly implementationEntry: string;
  readonly note: string;
}

export const SCHEMA_MIGRATIONS: readonly SchemaMigrationRegistration[] = Object.freeze([
  {
    migrationId: 'agent-budget-v1-to-v2',
    schemaFamily: 'nightwatch.agent-budget',
    fromVersion: 1,
    toVersion: 2,
    implementationModule: 'src/core/agentRuntime/checkpoint.ts',
    implementationEntry: 'parseCheckpoint',
    note: 'v1 outputBytes conflated provider transport and tool payload; the mixed total moves into toolPayloadBytes and the ledger is rebuilt as exact legacy carry.',
  },
]);

export function migrationById(migrationId: string): SchemaMigrationRegistration | null {
  return SCHEMA_MIGRATIONS.find((migration) => migration.migrationId === migrationId) ?? null;
}
