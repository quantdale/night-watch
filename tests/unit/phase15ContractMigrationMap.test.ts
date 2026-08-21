// ---------------------------------------------------------------------------
// Phase 15 Session 1 — source-owned legacy-API migration map contract tests.
//
// Pins the declarative compatibility map over the converged Phase 9-14
// semantic/source-contract platform: version, uniqueness, on-disk existence
// of every mapped legacy API, lifecycle vocabulary, canonicalDigest
// delegation for superseded digest copies, Session-1 forward references,
// lookup behavior, the fail-closed validation matrix, and the sanitized
// static-string privacy contract of the notes.
//
// Synthetic fixtures only; no real credentials or customer data.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CONTRACT_MIGRATION_MAP_VERSION,
  contractMigrationMap,
  migrationStatusFor,
  validateMigrationMap,
  type LegacyApiEntry,
  type MigrationStatus,
} from '../../src/oracles/expectations/lifecycle/contractMigrationMap';

const FORWARD_REFERENCE_NOTE_PREFIX = 'SESSION_1_FORWARD_REFERENCE:';
const CANONICAL_DIGEST_REPLACEMENT_PREFIX = 'src/core/identity/canonicalDigest.ts#';
const MIGRATION_API_PATH_PATTERN = /^(?:src|corpus)\/[^#]+#[A-Za-z0-9_$]+$/;
const REPLACEMENT_PATH_PATTERN = /^src\/[^#]+#[A-Za-z0-9_$]+$/;

const STATUSES: readonly MigrationStatus[] = ['CANONICAL', 'COMPATIBILITY_ONLY', 'SUPERSEDED_FOR_NEW_CODE'];

const EXPECTED_SUPERSEDED_API_PATHS = new Set<string>([
  'src/core/aiReview/util.ts#stableJson',
  'src/core/triage/dossier.ts#digest',
  'src/core/triage/dossierV2.ts#digest',
  'src/core/triage/clustering.ts#digest',
  'src/oracles/semantic/cluster.ts#digest',
  'src/core/journeys/fingerprint.ts#fingerprintAnomaly',
]);

const EXPECTED_FORWARD_REFERENCE_API_PATHS = new Set<string>([
  'src/oracles/expectations/lifecycle/sourceContractResolution.ts#resolveSourceContract',
  'src/oracles/expectations/lifecycle/contractSchemaValidation.ts#validateContractSchema',
  'src/oracles/expectations/lifecycle/contractLifecycleRegistry.ts#buildContractLifecycleRegistry',
]);

/** Catches the exact validation error message, or reports NO_THROW. */
function validationMessageFor(entries: readonly LegacyApiEntry[]): string {
  try {
    validateMigrationMap(entries);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'NO_THROW';
}

/** Valid baseline entry that individual negative cases mutate one field at a time. */
function syntheticEntry(overrides: Partial<LegacyApiEntry> = {}): LegacyApiEntry {
  return {
    apiPath: 'src/example/synthetic.ts#symbol',
    status: 'CANONICAL',
    replacement: null,
    note: 'synthetic rationale for the negative matrix',
    ...overrides,
  };
}

test.describe('Phase 15 Session 1 contract migration map', () => {
  const map = contractMigrationMap();

  test('pins the migration map version constant', () => {
    expect(CONTRACT_MIGRATION_MAP_VERSION).toBe('nightwatch.contract-migration-map.v1');
    expect(typeof CONTRACT_MIGRATION_MAP_VERSION).toBe('string');
  });

  test('returns one frozen cached map instance that passes its own validation', () => {
    expect(contractMigrationMap()).toBe(map);
    expect(Object.isFrozen(map)).toBe(true);
    for (const entry of map) expect(Object.isFrozen(entry)).toBe(true);
    expect(() => validateMigrationMap(map)).not.toThrow();
  });

  test('apiPaths are unique and well-formed', () => {
    const apiPaths = map.map((entry) => entry.apiPath);
    expect(new Set(apiPaths).size).toBe(apiPaths.length);
    for (const apiPath of apiPaths) expect(apiPath, apiPath).toMatch(MIGRATION_API_PATH_PATTERN);
  });

  test('every non-forward-reference apiPath names a file that exists on disk', () => {
    const root = process.cwd();
    for (const entry of map) {
      if (entry.note.startsWith(FORWARD_REFERENCE_NOTE_PREFIX)) continue;
      const filePath = entry.apiPath.slice(0, entry.apiPath.indexOf('#'));
      expect(fs.existsSync(path.join(root, filePath)), entry.apiPath).toBe(true);
    }
  });

  test('statuses stay inside the frozen vocabulary and row counts are pinned', () => {
    for (const entry of map) expect(STATUSES, entry.apiPath).toContain(entry.status);
    expect(map.length).toBe(35);
    expect(map.filter((entry) => entry.status === 'SUPERSEDED_FOR_NEW_CODE').length).toBe(6);
    expect(map.filter((entry) => entry.status === 'COMPATIBILITY_ONLY').length).toBe(3);
    expect(map.filter((entry) => entry.note.startsWith(FORWARD_REFERENCE_NOTE_PREFIX)).length).toBe(3);
  });

  test('SUPERSEDED rows are exactly the six former digest copies and all delegate to canonicalDigest', () => {
    const superseded = map.filter((entry) => entry.status === 'SUPERSEDED_FOR_NEW_CODE');
    expect(new Set(superseded.map((entry) => entry.apiPath))).toEqual(EXPECTED_SUPERSEDED_API_PATHS);
    for (const entry of superseded) {
      expect(entry.replacement, entry.apiPath).toMatch(REPLACEMENT_PATH_PATTERN);
      expect(entry.replacement, entry.apiPath).toMatch(/^src\/core\/identity\/canonicalDigest\.ts#/);
      expect(entry.replacement?.startsWith(CANONICAL_DIGEST_REPLACEMENT_PREFIX), entry.apiPath).toBe(true);
    }
  });

  test('COMPATIBILITY_ONLY rows keep resolver replacements and the data-only archive stays replacement-free', () => {
    const compatibilityOnly = map.filter((entry) => entry.status === 'COMPATIBILITY_ONLY');
    expect(compatibilityOnly.length).toBeGreaterThanOrEqual(2);
    for (const entry of compatibilityOnly) {
      if (entry.apiPath.startsWith('src/oracles/expectations/provenance.ts#')) {
        expect(entry.replacement).toBe('src/oracles/expectations/resolver.ts#createRealSourceResolver');
      }
    }
    const archive = map.find((entry) => entry.apiPath === 'corpus/phase10/historical/archivedV1Recipes.ts#ARCHIVED_V1_RECIPES');
    expect(archive).toBeDefined();
    expect(archive?.replacement).toBeNull();
    expect(archive?.note ?? '').toMatch(/never active/i);
  });

  test('forward-reference rows are exactly the three Session-1 modules and carry the marker prefix', () => {
    const forwardReferences = map.filter((entry) => entry.note.startsWith(FORWARD_REFERENCE_NOTE_PREFIX));
    expect(new Set(forwardReferences.map((entry) => entry.apiPath))).toEqual(EXPECTED_FORWARD_REFERENCE_API_PATHS);
    for (const entry of forwardReferences) {
      expect(entry.status).toBe('CANONICAL');
      expect(entry.note.startsWith(FORWARD_REFERENCE_NOTE_PREFIX)).toBe(true);
    }
  });

  test('migrationStatusFor resolves exact hits and returns null on misses', () => {
    const admit = migrationStatusFor('src/oracles/expectations/provenance.ts#admitExpectation');
    expect(admit).not.toBeNull();
    expect(admit?.status).toBe('COMPATIBILITY_ONLY');
    expect(admit?.replacement).toBe('src/oracles/expectations/resolver.ts#createRealSourceResolver');

    const stableJson = migrationStatusFor('src/core/triage/dossier.ts#digest');
    expect(stableJson?.status).toBe('SUPERSEDED_FOR_NEW_CODE');

    // Replacement targets are not themselves mapped legacy APIs.
    expect(migrationStatusFor('src/core/identity/canonicalDigest.ts#stableJsonSorted')).toBeNull();
    expect(migrationStatusFor('src/oracles/expectations/doesNotExist.ts#symbol')).toBeNull();
    expect(migrationStatusFor('')).toBeNull();
  });

  test('validation negative matrix throws the exact fail-closed codes', () => {
    const base = syntheticEntry();
    const cases: ReadonlyArray<readonly [label: string, entries: LegacyApiEntry[], expected: string]> = [
      [
        'duplicate apiPath',
        [base, syntheticEntry({ note: 'second row with the same path' })],
        'MIGRATION_MAP_DUPLICATE_API_PATH:src/example/synthetic.ts#symbol',
      ],
      [
        'invalid status',
        [syntheticEntry({ status: 'MAGIC' as MigrationStatus })],
        'MIGRATION_MAP_INVALID_STATUS:MAGIC',
      ],
      [
        'superseded without replacement',
        [syntheticEntry({ status: 'SUPERSEDED_FOR_NEW_CODE', replacement: null })],
        'MIGRATION_MAP_REPLACEMENT_REQUIRED:src/example/synthetic.ts#symbol',
      ],
      [
        'canonical with replacement',
        [syntheticEntry({ replacement: 'src/other/synthetic.ts#thing' })],
        'MIGRATION_MAP_REPLACEMENT_FORBIDDEN:src/example/synthetic.ts#symbol',
      ],
      [
        'empty note',
        [syntheticEntry({ note: '' })],
        'MIGRATION_MAP_NOTE_REQUIRED:src/example/synthetic.ts#symbol',
      ],
      [
        'whitespace-only note',
        [syntheticEntry({ note: '   ' })],
        'MIGRATION_MAP_NOTE_REQUIRED:src/example/synthetic.ts#symbol',
      ],
      [
        'apiPath without #symbol',
        [syntheticEntry({ apiPath: 'src/example/synthetic.ts' })],
        'MIGRATION_MAP_API_PATH_FORMAT:src/example/synthetic.ts',
      ],
      [
        'apiPath outside src/ and corpus/',
        [syntheticEntry({ apiPath: 'docs/example/synthetic.ts#symbol' })],
        'MIGRATION_MAP_API_PATH_FORMAT:docs/example/synthetic.ts#symbol',
      ],
      [
        'apiPath with non-identifier symbol',
        [syntheticEntry({ apiPath: 'src/example/synthetic.ts#has-hyphen' })],
        'MIGRATION_MAP_API_PATH_FORMAT:src/example/synthetic.ts#has-hyphen',
      ],
      [
        'format is checked before status',
        [syntheticEntry({ apiPath: 'not-a-map-path', status: 'MAGIC' as MigrationStatus })],
        'MIGRATION_MAP_API_PATH_FORMAT:not-a-map-path',
      ],
    ];
    for (const [label, entries, expected] of cases) {
      expect(validationMessageFor(entries), label).toBe(expected);
    }
  });

  test('validation accepts corpus-rooted rows and forward-reference exemptions', () => {
    expect(validationMessageFor([
      syntheticEntry({ apiPath: 'corpus/phase10/historical/archivedV1Recipes.ts#ARCHIVED_V1_RECIPES' }),
    ])).toBe('NO_THROW');
    // A CANONICAL forward-reference row may carry a replacement without tripping
    // MIGRATION_MAP_REPLACEMENT_FORBIDDEN.
    expect(validationMessageFor([
      syntheticEntry({
        apiPath: 'src/oracles/expectations/lifecycle/future.ts#futureSymbol',
        replacement: 'src/oracles/expectations/lifecycle/other-future.ts#otherSymbol',
        note: 'SESSION_1_FORWARD_REFERENCE: synthetic exemption probe',
      }),
    ])).toBe('NO_THROW');
  });

  test('notes are static sanitized strings with no raw-value-looking content', () => {
    for (const entry of map) {
      for (const [field, value] of [['note', entry.note], ['apiPath', entry.apiPath], ['replacement', entry.replacement ?? '']] as const) {
        expect(value, `${entry.apiPath} ${field}`).toMatch(/^[\x20-\x7E]*$/);
        expect(value.length, `${entry.apiPath} ${field}`).toBeLessThanOrEqual(240);
        expect(value, `${entry.apiPath} ${field}`).not.toMatch(/:\/\//);
        expect(value, `${entry.apiPath} ${field}`).not.toMatch(/[0-9a-f]{40}/i);
        expect(value, `${entry.apiPath} ${field}`).not.toMatch(/Bearer\s|ghp_|AKIA[0-9A-Z]{16}/);
      }
    }
    // Static strings: repeated reads return byte-identical notes.
    const secondRead = contractMigrationMap();
    expect(secondRead.map((entry) => entry.note)).toEqual(map.map((entry) => entry.note));
  });
});
