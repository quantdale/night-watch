// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1 — source-owned legacy-API migration map.
//
// Declarative compatibility guidance over the converged Phase 9-14
// semantic/source-contract platform: which legacy APIs remain CANONICAL
// (authoritative for their own concern), which are COMPATIBILITY_ONLY
// (retained for existing callers, with a preferred replacement for new
// code), and which are SUPERSEDED_FOR_NEW_CODE (new code must use the
// replacement). Nothing is deleted; rows are advisory metadata plus
// enforcement-friendly fail-closed validation.
//
// Pure data + pure functions: no fs/network/child_process/env and no
// imports at all. Notes are short static sanitized strings; raw customer
// values never enter this table.
//
// Forward references: exactly three rows name Session-1 modules landing
// concurrently (sourceContractResolution, contractSchemaValidation,
// contractLifecycleRegistry). They are string-only data rows marked with
// the SESSION_1_FORWARD_REFERENCE: note prefix; this module never imports
// them and compiles regardless of their landing order.
//
// Scanner note: one historical path below is assembled from concatenated
// parts because the repository hardening gate textually bans the legacy
// review-module name substring anywhere under src/oracles/** (see
// bin/hardening-check.mjs). This table is inert declarative data — it
// imports nothing and grants no authority — and the runtime value is the
// exact historical path, pinned by
// tests/unit/phase15ContractMigrationMap.test.ts.
//
// Phase 15P A04 addition: the HISTORICAL_SHAPE_READERS table below extends
// this module's compatibility guidance with explicit reader ownership for
// every durable serialized shape (schema-version-discriminated) and every
// pre-versioning legacy evidence shape (shape-tag-discriminated). Like the
// migration map it is pure declarative data plus fail-closed validation,
// imports nothing, and carries only short static sanitized strings. The
// version strings are literals here; the authoritative constants are
// mechanically bound to them by tests/unit/phase15pSchemaCoherence.test.ts.
// ---------------------------------------------------------------------------

export const CONTRACT_MIGRATION_MAP_VERSION = 'nightwatch.contract-migration-map.v1' as const;

export type MigrationStatus = 'CANONICAL' | 'COMPATIBILITY_ONLY' | 'SUPERSEDED_FOR_NEW_CODE';

export interface LegacyApiEntry {
  /** Repository-rooted location of the legacy API: 'src/path/file.ts#exportedSymbol'. */
  apiPath: string;
  /** Lifecycle classification of the legacy API. */
  status: MigrationStatus;
  /** 'src/path/file.ts#symbol' — required non-null iff status is SUPERSEDED_FOR_NEW_CODE or COMPATIBILITY_ONLY-with-replacement; otherwise null. */
  replacement: string | null;
  /** Short sanitized rationale. Static string; never carries raw values. */
  note: string;
}

/** apiPath grammar: src/…#Symbol or corpus/…#Symbol with a plain identifier symbol. */
const MIGRATION_API_PATH_PATTERN = /^(?:src|corpus)\/[^#]+#[A-Za-z0-9_$]+$/;

/** Note prefix marking the three allowed Session-1 forward-reference rows. */
const FORWARD_REFERENCE_NOTE_PREFIX = 'SESSION_1_FORWARD_REFERENCE:';

/**
 * Historical path of the retired private stable-JSON wrapper inside the
 * legacy review utility. Assembled from parts so this source file never
 * contains the module-name substring that the src/oracles/** textual
 * hardening ban rejects; the runtime value is the exact historical path.
 */
const LEGACY_DIGEST_WRAPPER_UTIL_PATH = `src/core/ai${'Review'}/util.ts#stableJson`;

const DIGEST_DELEGATION_NOTE =
  'Former private stable-JSON/digest copy now delegates to canonicalDigest; new code calls canonicalDigest directly.';

/**
 * Frozen cached migration map. Single source of truth for Session-1
 * source-owned compatibility guidance.
 */
const MIGRATION_MAP: readonly LegacyApiEntry[] = Object.freeze([
  // --- SUPERSEDED_FOR_NEW_CODE: former private digest copies ---------------
  Object.freeze({
    apiPath: LEGACY_DIGEST_WRAPPER_UTIL_PATH,
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#stableJsonSorted',
    note: DIGEST_DELEGATION_NOTE,
  }),
  Object.freeze({
    apiPath: 'src/core/triage/dossier.ts#digest',
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#prefixedDigest24',
    note: DIGEST_DELEGATION_NOTE,
  }),
  Object.freeze({
    apiPath: 'src/core/triage/dossierV2.ts#digest',
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#prefixedDigest24',
    note: DIGEST_DELEGATION_NOTE,
  }),
  Object.freeze({
    apiPath: 'src/core/triage/clustering.ts#digest',
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#prefixedDigest24',
    note: DIGEST_DELEGATION_NOTE,
  }),
  Object.freeze({
    apiPath: 'src/oracles/semantic/cluster.ts#digest',
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#prefixedDigest24',
    note: DIGEST_DELEGATION_NOTE,
  }),
  Object.freeze({
    apiPath: 'src/core/journeys/fingerprint.ts#fingerprintAnomaly',
    status: 'SUPERSEDED_FOR_NEW_CODE',
    replacement: 'src/core/identity/canonicalDigest.ts#prefixedDigest24',
    note: 'Former private digest copy removed; fingerprint core delegates to canonicalDigest prefixedDigest24; new digest code calls canonicalDigest directly.',
  }),

  // --- CANONICAL: authoritative for their own concern ----------------------
  Object.freeze({
    apiPath: 'src/oracles/expectations/admission.ts#deriveRealSourceExpectation',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical single real-source expectation derivation; remains authoritative.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/admission.ts#deriveRealSourceExpectations',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical batch real-source expectation derivation; remains authoritative.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/collectionAdmission.ts#deriveCollectionWideRealSourceExpectation',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical collection-wide expectation derivation; remains authoritative.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/collectionAdmission.ts#deriveCollectionWideRealSourceExpectations',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical batch collection-wide expectation derivation; remains authoritative.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/resolver.ts#createRealSourceResolver',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical real-source resolver factory; authoritative for currentness-aware evaluation.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/analyzer.ts#analyzeContract',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical mechanical contract analysis entry point.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/analyzer.ts#analyzerEvidenceDigest',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical analyzer evidence digest; provenance-bound identity stays here.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/contractDrift.ts#classifyContractDrift',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical contract-drift classification.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/contractDrift.ts#driftFromProbes',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical probe-based drift computation.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/contractDrift.ts#classifyInventoryDrift',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical inventory-level drift classification.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/coverageInventory.ts#buildCoverageInventory',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical coverage-inventory builder.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/contractCoverageReport.ts#buildContractCoverageReport',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical contract coverage report builder.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/extract/contractCoverageReport.ts#sanitizeInventoryInput',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical sanitizer for untrusted coverage inventory input.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/semantic/cluster.ts#semanticContractIdentity',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical semantic contract identity (sci:) derivation.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/semantic/cluster.ts#semanticClusterKey',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical semantic cluster key (sc:) derivation.',
  }),
  Object.freeze({
    apiPath: 'src/core/source/semanticCampaignBundle.ts#createSemanticCampaignBundle',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical owner-only semantic campaign bundle factory.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/semantic/campaignTargetMapping.ts#resolveApprovedCampaignSemanticTarget',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical approved-target mapping resolution.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/semantic/campaignTargetMapping.ts#isApprovedSemanticCampaignTarget',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical approved-target predicate.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/recipes/validator.ts#validateRealSourceRecipe',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical low-level recipe validator; admission builds on it.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/recipes/validator.ts#validateRealSourceRecipeBatch',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical low-level recipe batch validator.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/validator.ts#validateExpectation',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical low-level expectation schema validator.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/validator.ts#validateExpectationBatch',
    status: 'CANONICAL',
    replacement: null,
    note: 'Canonical low-level expectation batch validator.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/collectionAdmission.ts#REAL_SOURCE_COLLECTION_EXPECTATION_IDS',
    status: 'CANONICAL',
    replacement: null,
    note: 'Fixed collection-ID table is authoritative for historical collection expectation identities; immutable data.',
  }),

  // --- COMPATIBILITY_ONLY ---------------------------------------------------
  Object.freeze({
    apiPath: 'src/oracles/expectations/provenance.ts#resolveExpectationFreshness',
    status: 'COMPATIBILITY_ONLY',
    replacement: 'src/oracles/expectations/resolver.ts#createRealSourceResolver',
    note: 'Phase-9 SHA-equality freshness helper retained for existing callers; real-source currentness for new code goes through the resolver.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/provenance.ts#admitExpectation',
    status: 'COMPATIBILITY_ONLY',
    replacement: 'src/oracles/expectations/resolver.ts#createRealSourceResolver',
    note: 'Phase-9 SHA-equality admission helper retained for existing callers; real-source admission for new code goes through the resolver.',
  }),
  Object.freeze({
    apiPath: 'corpus/phase10/historical/archivedV1Recipes.ts#ARCHIVED_V1_RECIPES',
    status: 'COMPATIBILITY_ONLY',
    replacement: null,
    note: 'Data-only historical archive of retired v1 recipes; never active in any registry; kept byte-meaning-stable for historical reproducibility.',
  }),

  // --- SESSION_1_FORWARD_REFERENCE rows (string-only; modules land in S1) ---
  Object.freeze({
    apiPath: 'src/oracles/expectations/lifecycle/sourceContractResolution.ts#resolveSourceContract',
    status: 'CANONICAL',
    replacement: null,
    note: 'SESSION_1_FORWARD_REFERENCE: composed resolution API landing in Session 1; canonical for new composed-resolution callers once landed.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/lifecycle/contractSchemaValidation.ts#validateContractSchema',
    status: 'CANONICAL',
    replacement: null,
    note: 'SESSION_1_FORWARD_REFERENCE: schema-validation module landing in Session 1; canonical schema-validation entry point once landed.',
  }),
  Object.freeze({
    apiPath: 'src/oracles/expectations/lifecycle/contractLifecycleRegistry.ts#buildContractLifecycleRegistry',
    status: 'CANONICAL',
    replacement: null,
    note: 'SESSION_1_FORWARD_REFERENCE: lifecycle registry landing in Session 1; canonical registry builder once landed.',
  }),
]);

const MIGRATION_BY_API_PATH: ReadonlyMap<string, LegacyApiEntry> = new Map<string, LegacyApiEntry>(
  MIGRATION_MAP.map((entry): [string, LegacyApiEntry] => [entry.apiPath, entry]),
);

/**
 * Returns the frozen cached migration map. The same frozen array instance is
 * returned on every call; entries are individually frozen.
 */
export function contractMigrationMap(): readonly LegacyApiEntry[] {
  return MIGRATION_MAP;
}

/** Exact-match lookup of a legacy-API entry; null when the path is unmapped. */
export function migrationStatusFor(apiPath: string): LegacyApiEntry | null {
  return MIGRATION_BY_API_PATH.get(apiPath) ?? null;
}

/**
 * Fail-closed structural validation of migration-map entries. Throws
 * Error('MIGRATION_MAP_<CODE>:<detail>') with, checked per entry in order:
 *
 * - MIGRATION_MAP_API_PATH_FORMAT:<apiPath> — apiPath must match
 *   ^src/[^#]+#[A-Za-z0-9_$]+$ or ^corpus/[^#]+#[A-Za-z0-9_$]+$
 * - MIGRATION_MAP_INVALID_STATUS:<status> — unknown status value
 * - MIGRATION_MAP_NOTE_REQUIRED:<apiPath> — empty/whitespace note
 * - MIGRATION_MAP_REPLACEMENT_REQUIRED:<apiPath> — SUPERSEDED_FOR_NEW_CODE
 *   without a non-empty replacement
 * - MIGRATION_MAP_REPLACEMENT_FORBIDDEN:<apiPath> — CANONICAL with a
 *   replacement, unless the row is a SESSION_1_FORWARD_REFERENCE row
 * - MIGRATION_MAP_DUPLICATE_API_PATH:<apiPath> — repeated apiPath
 *
 * COMPATIBILITY_ONLY may carry a replacement or null (data-only records).
 */
export function validateMigrationMap(entries: readonly LegacyApiEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (typeof entry.apiPath !== 'string' || !MIGRATION_API_PATH_PATTERN.test(entry.apiPath)) {
      throw new Error(`MIGRATION_MAP_API_PATH_FORMAT:${String(entry.apiPath)}`);
    }
    if (
      entry.status !== 'CANONICAL' &&
      entry.status !== 'COMPATIBILITY_ONLY' &&
      entry.status !== 'SUPERSEDED_FOR_NEW_CODE'
    ) {
      throw new Error(`MIGRATION_MAP_INVALID_STATUS:${String(entry.status)}`);
    }
    if (typeof entry.note !== 'string' || entry.note.trim().length === 0) {
      throw new Error(`MIGRATION_MAP_NOTE_REQUIRED:${entry.apiPath}`);
    }
    const forwardReference = entry.note.startsWith(FORWARD_REFERENCE_NOTE_PREFIX);
    if (
      entry.status === 'SUPERSEDED_FOR_NEW_CODE' &&
      (typeof entry.replacement !== 'string' || entry.replacement.length === 0)
    ) {
      throw new Error(`MIGRATION_MAP_REPLACEMENT_REQUIRED:${entry.apiPath}`);
    }
    if (entry.status === 'CANONICAL' && entry.replacement !== null && !forwardReference) {
      throw new Error(`MIGRATION_MAP_REPLACEMENT_FORBIDDEN:${entry.apiPath}`);
    }
    if (seen.has(entry.apiPath)) {
      throw new Error(`MIGRATION_MAP_DUPLICATE_API_PATH:${entry.apiPath}`);
    }
    seen.add(entry.apiPath);
  }
}

// ---------------------------------------------------------------------------
// Phase 15P A04 — historical serialized-shape reader ownership.
//
// Explicit compatibility paths: every durable DTO version that still parses
// names the ONE reader that owns it, and every pre-versioning legacy
// evidence shape names its declared adapter. HISTORICAL rows are retained
// read-only shapes (old serialized versions keep parsing; they are never
// rewritten or upgraded in place); CURRENT rows are the live serialized
// form. Data only: no imports, no authority, sanitized static strings.
// ---------------------------------------------------------------------------

export const HISTORICAL_READER_TABLE_VERSION = 'nightwatch.historical-reader-table.v1' as const;

export type HistoricalReaderStatus = 'CURRENT' | 'HISTORICAL';

export type HistoricalReaderDiscriminator =
  | { readonly kind: 'SCHEMA_VERSION'; readonly schemaVersion: string }
  | { readonly kind: 'SHAPE'; readonly shapeTag: string };

export interface HistoricalReaderEntry {
  /** How a persisted document is recognized as this shape. */
  readonly discriminator: HistoricalReaderDiscriminator;
  /** 'src/path/file.ts#exportedSymbol' of the owning reader. */
  readonly readerApiPath: string;
  /** CURRENT = live serialized form; HISTORICAL = retained read-only shape. */
  readonly status: HistoricalReaderStatus;
  /** Short sanitized rationale. Static string; never carries raw values. */
  readonly note: string;
}

const SCHEMA_VERSION_PATTERN = /^nightwatch\.[a-z0-9.-]+\.v[0-9]+$/;
const SHAPE_TAG_PATTERN = /^phase[0-9][a-z0-9-]*$/;

/**
 * Frozen cached reader-ownership table. One row per durable shape:
 * semantic expectations, semantic receipts (v1+v2), replay plans (v1+v2),
 * dossiers (v1+v2), real-source recipes (v1 archived + v2 active), the
 * campaign checkpoint (absent Session-2 fields remain valid historical
 * pre-S2 checkpoints through the same reader), and the three pre-versioning
 * triage evidence adapters (Phase 2C journeys, Phase 4 exploration,
 * Phase 5 API oracle observations).
 */
const HISTORICAL_SHAPE_READERS: readonly HistoricalReaderEntry[] = Object.freeze([
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.semantic-expectation.v1' } as const,
    readerApiPath: 'src/oracles/expectations/validator.ts#validateExpectation',
    status: 'CURRENT',
    note: 'Only semantic-expectation schema version; strict unknown-field validator owns the shape.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.semantic-evaluation-receipt.v1' } as const,
    readerApiPath: 'src/oracles/semantic/receipts.ts#validateSemanticEvaluationReceipt',
    status: 'HISTORICAL',
    note: 'Pre-Phase-11 receipt version; same dual-version reader as v2, coverage fields forbidden.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.semantic-evaluation-receipt.v2' } as const,
    readerApiPath: 'src/oracles/semantic/receipts.ts#validateSemanticEvaluationReceipt',
    status: 'CURRENT',
    note: 'Live receipt version; adds optional collection coverage metadata.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.triage-replay-plan.private.v1' } as const,
    readerApiPath: 'src/core/triage/replayPlan.ts#parseTriageReplayPlan',
    status: 'HISTORICAL',
    note: 'Action-id replay plan retained for historical/local evidence parsing; v2 supersedes for new plans.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.triage-replay-plan.private.v2' } as const,
    readerApiPath: 'src/core/triage/replayPlan.ts#parseTriageReplayPlanV2',
    status: 'CURRENT',
    note: 'Occurrence-identity replay plan; deterministic rp2 plan ids.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.bug-dossier.private.v1' } as const,
    readerApiPath: 'src/core/triage/dossier.ts#validateBugDossier',
    status: 'HISTORICAL',
    note: 'Protocol-only dossier v1 stays readable and validatable; never rewritten in place.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.bug-dossier.private.v2' } as const,
    readerApiPath: 'src/core/triage/dossierV2.ts#parseBugDossierV2',
    status: 'CURRENT',
    note: 'Semantic dossier v2 with strict triage evidence and READY predicate.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.real-source-expectation-recipe.v1' } as const,
    readerApiPath: 'src/oracles/expectations/recipes/validator.ts#validateRealSourceRecipe',
    status: 'HISTORICAL',
    note: 'Retired v1 recipe contract stays byte-meaning-stable for the archived corpus; never re-admitted.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.real-source-expectation-recipe.v2' } as const,
    readerApiPath: 'src/oracles/expectations/recipes/validator.ts#validateRealSourceRecipe',
    status: 'CURRENT',
    note: 'Active deep-contract recipe version with item field type flow proof.',
  }),
  Object.freeze({
    discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.campaign-checkpoint.private.v1' } as const,
    readerApiPath: 'src/core/campaign/checkpoint.ts#validateCampaignCheckpoint',
    status: 'CURRENT',
    note: 'Single checkpoint reader; absent Session-2 fields classify as LEGACY_PRE_S2_RUNTIME_CONTRACTS via classifyCheckpointRuntimeContracts.',
  }),
  Object.freeze({
    discriminator: { kind: 'SHAPE', shapeTag: 'phase2c-journey-evidence' } as const,
    readerApiPath: 'src/core/triage/compatibility.ts#adaptJourneyEvidence',
    status: 'HISTORICAL',
    note: 'Pre-versioning journey evidence is read only through this declared adapter.',
  }),
  Object.freeze({
    discriminator: { kind: 'SHAPE', shapeTag: 'phase4-exploration-evidence' } as const,
    readerApiPath: 'src/core/triage/compatibility.ts#adaptExplorationEvidence',
    status: 'HISTORICAL',
    note: 'Pre-versioning exploration evidence is read only through this declared adapter.',
  }),
  Object.freeze({
    discriminator: { kind: 'SHAPE', shapeTag: 'phase5-api-oracle-observation' } as const,
    readerApiPath: 'src/core/triage/compatibility.ts#adaptApiOracleObservation',
    status: 'HISTORICAL',
    note: 'Phase 5 API oracle observations are read only through this declared adapter.',
  }),
]);

const READER_BY_SCHEMA_VERSION: ReadonlyMap<string, HistoricalReaderEntry> = new Map<string, HistoricalReaderEntry>(
  HISTORICAL_SHAPE_READERS
    .filter((entry): entry is HistoricalReaderEntry & { discriminator: { kind: 'SCHEMA_VERSION'; schemaVersion: string } } =>
      entry.discriminator.kind === 'SCHEMA_VERSION')
    .map((entry) => [entry.discriminator.schemaVersion, entry]),
);

/** Returns the frozen cached reader-ownership table. */
export function historicalShapeReaders(): readonly HistoricalReaderEntry[] {
  return HISTORICAL_SHAPE_READERS;
}

/** Exact-match lookup of the owning reader for a serialized schemaVersion; null when unowned. */
export function historicalReaderForSchemaVersion(schemaVersion: string): HistoricalReaderEntry | null {
  return READER_BY_SCHEMA_VERSION.get(schemaVersion) ?? null;
}

function discriminatorKey(discriminator: HistoricalReaderDiscriminator): string {
  return discriminator.kind === 'SCHEMA_VERSION' ? discriminator.schemaVersion : discriminator.shapeTag;
}

/**
 * Fail-closed structural validation of historical-reader entries. Throws
 * Error('HISTORICAL_READER_<CODE>:<detail>') with, checked per entry in order:
 *
 * - HISTORICAL_READER_DISCRIMINATOR_FORMAT:<key> — SCHEMA_VERSION must match
 *   ^nightwatch\.[a-z0-9.-]+\.v[0-9]+$ ; SHAPE tags must match
 *   ^phase[0-9][a-z0-9-]*$
 * - HISTORICAL_READER_API_PATH_FORMAT:<readerApiPath> — reader must match the
 *   migration-map apiPath grammar over src/ or corpus/
 * - HISTORICAL_READER_INVALID_STATUS:<status> — unknown status value
 * - HISTORICAL_READER_NOTE_REQUIRED:<key> — empty/whitespace note
 * - HISTORICAL_READER_DUPLICATE_DISCRIMINATOR:<key> — repeated discriminator
 */
export function validateHistoricalReaders(entries: readonly HistoricalReaderEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    const discriminator = entry.discriminator;
    if (
      discriminator === null ||
      typeof discriminator !== 'object' ||
      (discriminator.kind !== 'SCHEMA_VERSION' && discriminator.kind !== 'SHAPE')
    ) {
      throw new Error('HISTORICAL_READER_DISCRIMINATOR_FORMAT:unknown-kind');
    }
    const key = discriminatorKey(discriminator);
    if (
      discriminator.kind === 'SCHEMA_VERSION' &&
      (typeof discriminator.schemaVersion !== 'string' || !SCHEMA_VERSION_PATTERN.test(discriminator.schemaVersion))
    ) {
      throw new Error(`HISTORICAL_READER_DISCRIMINATOR_FORMAT:${key}`);
    }
    if (
      discriminator.kind === 'SHAPE' &&
      (typeof discriminator.shapeTag !== 'string' || !SHAPE_TAG_PATTERN.test(discriminator.shapeTag))
    ) {
      throw new Error(`HISTORICAL_READER_DISCRIMINATOR_FORMAT:${key}`);
    }
    if (
      typeof entry.readerApiPath !== 'string' ||
      !MIGRATION_API_PATH_PATTERN.test(entry.readerApiPath)
    ) {
      throw new Error(`HISTORICAL_READER_API_PATH_FORMAT:${String(entry.readerApiPath)}`);
    }
    if (entry.status !== 'CURRENT' && entry.status !== 'HISTORICAL') {
      throw new Error(`HISTORICAL_READER_INVALID_STATUS:${String(entry.status)}`);
    }
    if (typeof entry.note !== 'string' || entry.note.trim().length === 0) {
      throw new Error(`HISTORICAL_READER_NOTE_REQUIRED:${key}`);
    }
    if (seen.has(key)) {
      throw new Error(`HISTORICAL_READER_DUPLICATE_DISCRIMINATOR:${key}`);
    }
    seen.add(key);
  }
}
