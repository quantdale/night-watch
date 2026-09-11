// ---------------------------------------------------------------------------
// Schema version lifecycle: definitions, dispositions, migration primitive,
// read-compatibility proof, bump report and bounded sanitized export.
// ---------------------------------------------------------------------------

export {
  MIGRATION_DISPOSITION_KINDS,
  SCHEMA_LIFECYCLE_ERROR_CODES,
  SCHEMA_STORE_LOCATIONS,
  SCHEMA_VERSION_LIFECYCLE_VERSION,
  SCHEMA_VERSION_ROLES,
  parseSchemaIdentifier,
  type DiscoveredSchemaIdentifier,
  type MigrationDispositionKind,
  type SchemaFamilyDeclaration,
  type SchemaLifecycleErrorCode,
  type SchemaLifecycleFinding,
  type SchemaLifecycleJudgement,
  type SchemaStoreLocation,
  type SchemaVersionDisposition,
  type SchemaVersionRole,
} from './types';
export { SCHEMA_IDENTIFIER_RE, discoverSchemaIdentifiers, type ScannedSourceFile } from './scanner';
export { SCHEMA_FAMILIES } from './declarations';
export {
  READ_COMPATIBILITY_FIXTURES,
  SYNTHETIC_PROBE_EVIDENCE,
  fixtureById,
  probeEvidenceFor,
  type ReadCompatibilityFixtureRegistration,
  type SyntheticProbeRegistration,
} from './fixtures';
export { SCHEMA_MIGRATIONS, migrationById, type SchemaMigrationRegistration } from './migrations';
export { decisionsCarry, validateSchemaLifecycle, type ValidateSchemaLifecycleInput } from './validate';
export {
  executeNonDestructiveMigration,
  runMigrationStep,
  type MigrationStepOutcome,
  type MigrationStepPlan,
  type NonDestructiveMigrationInput,
  type NonDestructiveMigrationIo,
  type NonDestructiveMigrationResult,
  type NonDestructiveMigrationStatus,
} from './migration';
export {
  SCHEMA_BUMP_IMPACT_VERSION,
  buildSchemaBumpImpactReport,
  type BuildBumpImpactInput,
  type PersistedStoreImpact,
  type SchemaBumpImpactReport,
} from './bumpReport';
export {
  SCHEMA_EXPORT_LIMITS,
  SCHEMA_EXPORT_VERSION,
  buildSanitizedExport,
  serializeSanitizedExport,
  writeSanitizedExport,
  type SanitizedExport,
  type SanitizedExportInput,
  type WriteExportInput,
} from './export';
export {
  countAffectedStores,
  countStoreRecordsAtVersion,
  readSourceTree,
  runSchemaLifecycleCheck,
  type CountStoreRecordsOptions,
  type SchemaLifecycleCheckOptions,
  type SchemaLifecycleCheckResult,
  type StoreCountProbe,
  type StoreRecordCount,
} from './check';
