// ---------------------------------------------------------------------------
// Nightwatch Phase 15P A04 — schema / coherence / migration validation.
//
// Permanent focused proof for the Phase 15P schema-coherence hardening:
//
//   - cross-field contradiction matrices per audited DTO: lifecycle family
//     resolution records (kind vs derivation-version pairing; CURRENT/STALE
//     require an evidence digest), composed resolutions (families carry
//     active expectation kinds only), family descriptors (lineage ids never
//     self-reference), semantic evaluation receipts (non-ANOMALY outcomes
//     never carry findings), and semantic expectations (CARDINALITY_MATCH
//     exact bound inside its own optional min/max range);
//   - explicit historical compatibility paths: the frozen
//     HISTORICAL_SHAPE_READERS ownership table is mechanically bound to the
//     authoritative version constants and archived corpus, every owning
//     reader exists on disk, and old serialized versions still parse through
//     their declared readers (archived v1 recipes, replay plans v1+v2,
//     receipts v1, pre-S2 checkpoint classification);
//   - unknown-field rejection where schemas are frozen (one independent pin
//     per lifecycle DTO level plus the dispatcher guards);
//   - determinism: byte-stable canonical serialization, stable derived ids,
//     and repeatable validation verdicts.
//
// Synthetic/local only: fixtures are repository-owned synthetic values. No
// DEV, no real product, no network, no credentials.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertDeterministicRoundTrip,
  canonicalSerializeContractDto,
  validateContractFamilyDescriptorDto,
  validateContractSchema,
  validateComposedSourceContractResolutionDto,
  validateFamilyResolutionRecordDto,
  validateUnifiedContractResultDto,
} from '../../src/oracles/expectations/lifecycle/contractSchemaValidation';
import type { ContractFamilyDescriptor } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import { buildContractLifecycleRegistry } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import { resolveSourceContract } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type {
  ComposedSourceContractResolution,
  FamilyResolutionRecord,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import {
  HISTORICAL_READER_TABLE_VERSION,
  historicalReaderForSchemaVersion,
  historicalShapeReaders,
  validateHistoricalReaders,
  type HistoricalReaderEntry,
} from '../../src/oracles/expectations/lifecycle/contractMigrationMap';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import { validateExpectation } from '../../src/oracles/expectations/validator';
import { SEMANTIC_EXPECTATION_VERSION } from '../../src/oracles/expectations/types';
import { validateRealSourceRecipe } from '../../src/oracles/expectations/recipes/validator';
import {
  SEMANTIC_EVALUATION_RECEIPT_VERSION,
  SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
  SEMANTIC_RECEIPT_OUTCOMES,
  buildSemanticEvaluationReceipt,
  validateSemanticEvaluationReceipt,
} from '../../src/oracles/semantic/receipts';
import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  createTriageReplayPlan,
  createTriageReplayPlanV2,
  parseTriageReplayPlan,
  parseTriageReplayPlanV2,
} from '../../src/core/triage/replayPlan';
import { DOSSIER_VERSION_V2, isV1Dossier } from '../../src/core/triage/dossierV2';
import { DOSSIER_VERSION } from '../../src/core/triage/types';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
} from '../../src/core/campaign/types';
import { classifyCheckpointRuntimeContracts } from '../../src/core/campaign/checkpoint';
import { ARCHIVED_V1_RECIPES } from '../../corpus/phase10/historical/archivedV1Recipes';
import { PHASE10_FIXTURE_RECIPES } from '../../corpus/phase10/source-fixture/phase10Fixtures';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import type { MapSource } from '../helpers/phase9a1Fixtures';
import {
  accountFixture as realAccountFixture,
  billingGroupFixture as realBillingGroupFixture,
  exchangeRateFixture as realExchangeRateFixture,
  REAL_SOURCE_FIXTURE_REPO,
  REAL_SOURCE_FIXTURE_SHA,
  routingFixture as realRoutingFixture,
} from '../helpers/phase11a3Fixtures';

const REPO = REAL_SOURCE_FIXTURE_REPO;
const SHA = REAL_SOURCE_FIXTURE_SHA;
const TARGET = 'ripple.common-exchange.read';

const FILES = {
  'src/App/Handler/ExchangeRate.php': realExchangeRateFixture,
  'src/App/Handler/Account.php': realAccountFixture,
  'src/App/Handler/BillingGroup.php': realBillingGroupFixture,
  'src/App/Route/Config/Routing.yaml': realRoutingFixture,
};

/** Deep mutable plain-object copy overlaid with the given patch. */
function cloneWith(value: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  return Object.assign(JSON.parse(JSON.stringify(value)) as Record<string, unknown>, patch);
}

/** Anchored matcher: the error message must be EXACTLY this code string. */
function exactCode(code: string): RegExp {
  return new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

// ---------------------------------------------------------------------------
// Registry-derived expectations about kind/version pairing (mirrors the
// gateway's own DERIVATION_VERSION_BY_KIND table).
// ---------------------------------------------------------------------------

const DERIVATION_VERSION_BY_KIND: Record<string, string> = {
  HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
  DEEP_TYPE: REAL_SOURCE_DERIVATION_VERSION_V2,
  COLLECTION: REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_PROBE: MECHANICAL_ANALYZER_VERSION,
  ARCHIVED_HISTORICAL_SHAPE: REAL_SOURCE_DERIVATION_VERSION,
};

const ALL_DERIVATION_VERSIONS = [
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
  REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
  MECHANICAL_ANALYZER_VERSION,
];

const ALL_FAMILY_KINDS = Object.keys(DERIVATION_VERSION_BY_KIND);

// ---------------------------------------------------------------------------
// Shared fixtures built once from the real producers.
// ---------------------------------------------------------------------------

interface CoherenceFixtures {
  readonly current: ComposedSourceContractResolution;
  readonly record: FamilyResolutionRecord;
}

function buildFixtures(): CoherenceFixtures {
  const map: MapSource = createMapSource([{ repoId: REPO, sha: SHA, files: FILES }]);
  const current = resolveSourceContract({
    targetId: TARGET,
    reader: map.reader,
    currentness: map.currentness,
    snapshot: { repoId: REPO, sha: SHA },
  });
  const record = current.families[0];
  if (record === undefined) throw new Error('fixture expected at least one family record');
  return { current, record };
}

let cachedFixtures: CoherenceFixtures | null = null;

function fixtures(): CoherenceFixtures {
  if (cachedFixtures === null) cachedFixtures = buildFixtures();
  return cachedFixtures;
}

/** Minimal valid semantic-expectation wrapper around one invariant. */
function expectationWith(invariant: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: SEMANTIC_EXPECTATION_VERSION,
    expectationId: 'synthetic.target.read.cardinality',
    targetKind: 'API_OPERATION',
    targetId: 'synthetic.target.read',
    sourceProvenance: {
      repoId: 'synthetic/repo',
      sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      relativePath: 'src/App/Handler/Synthetic.php',
      derivationVersion: 'nightwatch.synthetic-derivation.v1',
    },
    projectionContract: { limits: {} },
    invariantDefinitions: [invariant],
  };
}

/** Hand-built minimal receipt object (for direct-validator cases). */
function receiptObject(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
    receiptId: 'receipt:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    oracleId: 'synthetic-oracle',
    outcome: 'PASS',
    projectionDigests: [],
    invariantTotal: 0,
    invariantPassCount: 0,
    invariantNaCount: 0,
    invariantViolationCount: 0,
    findingCount: 0,
    ...overrides,
  };
}

test.describe('Phase 15P A04 — lifecycle record cross-field coherence', () => {
  test('record kind vs derivation-version contradiction matrix fails closed', () => {
    const { record } = fixtures();
    for (const kind of ALL_FAMILY_KINDS) {
      for (const version of ALL_DERIVATION_VERSIONS) {
        if (version === DERIVATION_VERSION_BY_KIND[kind]) continue;
        const tampered = cloneWith(record, { kind, derivationVersion: version });
        expect(
          () => validateFamilyResolutionRecordDto(tampered),
          `${kind} with ${version}`,
        ).toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:record-derivation-version-kind-mismatch:${kind}:${version}`));
      }
    }
  });

  test('every consistently re-paired record kind still validates (positive control)', () => {
    const { record } = fixtures();
    for (const kind of ALL_FAMILY_KINDS) {
      const repaired = cloneWith(record, {
        kind,
        derivationVersion: DERIVATION_VERSION_BY_KIND[kind],
      });
      expect(() => validateFamilyResolutionRecordDto(repaired), kind).not.toThrow();
    }
  });

  test('CURRENT and STALE records require an evidence digest; UNAVAILABLE may carry null', () => {
    const { record } = fixtures();
    const currentNullDigest = cloneWith(record, { evidenceDigest: null });
    expect(() => validateFamilyResolutionRecordDto(currentNullDigest))
      .toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:CURRENT-record-requires-evidence-digest:${String(record.familyId)}`));

    const staleWithDigest = cloneWith(record, { currentnessClass: 'STALE' });
    expect(() => validateFamilyResolutionRecordDto(staleWithDigest)).not.toThrow();
    const staleNullDigest = cloneWith(record, { currentnessClass: 'STALE', evidenceDigest: null });
    expect(() => validateFamilyResolutionRecordDto(staleNullDigest))
      .toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:STALE-record-requires-evidence-digest:${String(record.familyId)}`));

    const unavailableNullDigest = cloneWith(record, { currentnessClass: 'UNAVAILABLE', evidenceDigest: null });
    expect(() => validateFamilyResolutionRecordDto(unavailableNullDigest)).not.toThrow();
  });

  test('composed families reject mechanical-probe and archived-historical records', () => {
    const { current, record } = fixtures();

    const probeRecord = cloneWith(record, {
      familyId: `lifecycle:mechanical-probe:${TARGET}`,
      kind: 'MECHANICAL_PROBE',
      currentnessClass: 'NOT_APPLICABLE',
      evidenceDigest: null,
      derivationVersion: MECHANICAL_ANALYZER_VERSION,
    });
    // Standalone records are not kind-forbidden; only composition forbids them.
    expect(() => validateFamilyResolutionRecordDto(probeRecord)).not.toThrow();
    const withProbe = cloneWith(current, {});
    withProbe['families'] = [probeRecord];
    expect(() => validateComposedSourceContractResolutionDto(withProbe))
      .toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:families-must-not-carry-MECHANICAL_PROBE-records:lifecycle:mechanical-probe:${TARGET}`));

    const archivedRecord = cloneWith(record, {
      familyId: 'lifecycle:ripple.common-exchange.read.real-source-shape',
      kind: 'ARCHIVED_HISTORICAL_SHAPE',
      currentnessClass: 'NOT_APPLICABLE',
      evidenceDigest: null,
      derivationVersion: REAL_SOURCE_DERIVATION_VERSION,
    });
    expect(() => validateFamilyResolutionRecordDto(archivedRecord)).not.toThrow();
    const withArchived = cloneWith(current, {});
    withArchived['families'] = [archivedRecord];
    expect(() => validateComposedSourceContractResolutionDto(withArchived))
      .toThrow(exactCode('CONTRACT_SCHEMA_INCOHERENT:families-must-not-carry-ARCHIVED_HISTORICAL_SHAPE-records:lifecycle:ripple.common-exchange.read.real-source-shape'));

    // The generic dispatcher enforces the same composed-level rule.
    expect(() => validateContractSchema(withProbe))
      .toThrow(/families-must-not-carry-MECHANICAL_PROBE-records/);
  });

  test('real producer output still passes every hardened record/composed check', () => {
    const { current } = fixtures();
    for (const record of current.families) {
      expect(() => validateFamilyResolutionRecordDto(record)).not.toThrow();
    }
    expect(() => validateComposedSourceContractResolutionDto(current)).not.toThrow();
  });
});

test.describe('Phase 15P A04 — descriptor lineage coherence', () => {
  test('lineage ids never self-reference', () => {
    const registry = buildContractLifecycleRegistry();
    const linked = registry.find((family) => family.predecessorFamilyId !== null || family.successorFamilyId !== null);
    if (linked === undefined) throw new Error('fixture expected at least one lineage-linked descriptor');

    const selfPredecessor = cloneWith(linked, { predecessorFamilyId: linked.familyId });
    expect(() => validateContractFamilyDescriptorDto(selfPredecessor as unknown as ContractFamilyDescriptor))
      .toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:ContractFamilyDescriptor.predecessorFamilyId-cannot-self-reference:${linked.familyId}`));

    const selfSuccessor = cloneWith(linked, { successorFamilyId: linked.familyId });
    expect(() => validateContractFamilyDescriptorDto(selfSuccessor as unknown as ContractFamilyDescriptor))
      .toThrow(exactCode(`CONTRACT_SCHEMA_INCOHERENT:ContractFamilyDescriptor.successorFamilyId-cannot-self-reference:${linked.familyId}`));
  });

  test('the real registry still passes the hardened descriptor validator', () => {
    for (const family of buildContractLifecycleRegistry()) {
      expect(() => validateContractFamilyDescriptorDto(family), family.familyId).not.toThrow();
    }
  });
});

test.describe('Phase 15P A04 — semantic receipt findings coherence', () => {
  test('no non-ANOMALY outcome may carry findings (full outcome matrix)', () => {
    const nonAnomalyOutcomes = SEMANTIC_RECEIPT_OUTCOMES.filter((outcome) => outcome !== 'ANOMALY');
    expect(nonAnomalyOutcomes.length).toBe(SEMANTIC_RECEIPT_OUTCOMES.length - 1);
    for (const outcome of nonAnomalyOutcomes) {
      expect(
        () => buildSemanticEvaluationReceipt({ oracleId: 'synthetic-oracle', outcome, findingCount: 1 }),
        outcome,
      ).toThrow(exactCode('SEMANTIC_RECEIPT_INVALID:findings-without-anomaly'));
    }
  });

  test('positive controls: PASS carries zero findings; ANOMALY keeps its finding', () => {
    expect(() => buildSemanticEvaluationReceipt({ oracleId: 'synthetic-oracle', outcome: 'PASS' })).not.toThrow();
    expect(() =>
      buildSemanticEvaluationReceipt({
        oracleId: 'synthetic-oracle',
        outcome: 'ANOMALY',
        invariantTotal: 1,
        invariantViolationCount: 1,
        findingCount: 1,
      }),
    ).not.toThrow();
  });

  test('the rule lives in the shared validator, not just the builder', () => {
    expect(() => validateSemanticEvaluationReceipt(receiptObject({ findingCount: 2 }) as never))
      .toThrow(exactCode('SEMANTIC_RECEIPT_INVALID:findings-without-anomaly'));
    expect(() => validateSemanticEvaluationReceipt(receiptObject({}) as never)).not.toThrow();
  });

  test('historical v1 receipts stay readable and obey the same coherence rule', () => {
    const v1 = receiptObject({ schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 });
    expect(() => validateSemanticEvaluationReceipt(v1 as never)).not.toThrow();
    const v1WithFindings = receiptObject({
      schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
      findingCount: 1,
    });
    expect(() => validateSemanticEvaluationReceipt(v1WithFindings as never))
      .toThrow(exactCode('SEMANTIC_RECEIPT_INVALID:findings-without-anomaly'));
  });
});

test.describe('Phase 15P A04 — semantic expectation cardinality coherence', () => {
  test('an exact bound outside its own min/max range fails closed', () => {
    expect(() => validateExpectation(expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 2, min: 5 })))
      .toThrow(/exact-outside-min-max/);
    expect(() => validateExpectation(expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 12, max: 10 })))
      .toThrow(/exact-outside-min-max/);
    expect(() => validateExpectation(expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 12, min: 13 })))
      .toThrow(/exact-outside-min-max/);
  });

  test('consistent exact bounds and lone exact bounds still validate', () => {
    const inside = validateExpectation(
      expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 5, min: 1, max: 10 }),
    );
    expect(inside.invariantDefinitions[0]).toEqual({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 5, min: 1, max: 10 });
    const loneExact = validateExpectation(expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 3 }));
    expect(loneExact.invariantDefinitions[0]).toEqual({ kind: 'CARDINALITY_MATCH', path: ['items'], exact: 3 });
  });

  test('min>max rejection stays pinned ahead of the new rule', () => {
    expect(() => validateExpectation(expectationWith({ kind: 'CARDINALITY_MATCH', path: ['items'], min: 5, max: 1 })))
      .toThrow(/min-gt-max/);
  });
});

test.describe('Phase 15P A04 — historical-shape reader ownership table', () => {
  const table = historicalShapeReaders();

  test('version constant is pinned and the frozen table passes its own validation', () => {
    expect(HISTORICAL_READER_TABLE_VERSION).toBe('nightwatch.historical-reader-table.v1');
    expect(Object.isFrozen(table)).toBe(true);
    for (const entry of table) expect(Object.isFrozen(entry)).toBe(true);
    expect(() => validateHistoricalReaders(table)).not.toThrow();
  });

  test('row inventory is pinned: 13 rows, 10 schema-versioned, 3 shape-based', () => {
    expect(table.length).toBe(13);
    expect(table.filter((entry) => entry.discriminator.kind === 'SCHEMA_VERSION').length).toBe(10);
    expect(table.filter((entry) => entry.discriminator.kind === 'SHAPE').length).toBe(3);
    expect(table.filter((entry) => entry.status === 'CURRENT').length).toBe(6);
    expect(table.filter((entry) => entry.status === 'HISTORICAL').length).toBe(7);
  });

  test('every schema-version row is mechanically bound to its authoritative constant or corpus', () => {
    const versionOf = (version: string): string => {
      const entry = historicalReaderForSchemaVersion(version);
      if (entry === null) throw new Error(`missing reader row for ${version}`);
      return entry.discriminator.kind === 'SCHEMA_VERSION' ? entry.discriminator.schemaVersion : '';
    };
    expect(versionOf(SEMANTIC_EXPECTATION_VERSION)).toBe(SEMANTIC_EXPECTATION_VERSION);
    expect(versionOf(SEMANTIC_EVALUATION_RECEIPT_VERSION_V1)).toBe(SEMANTIC_EVALUATION_RECEIPT_VERSION_V1);
    expect(versionOf(SEMANTIC_EVALUATION_RECEIPT_VERSION)).toBe(SEMANTIC_EVALUATION_RECEIPT_VERSION);
    expect(versionOf(TRIAGE_REPLAY_PLAN_VERSION)).toBe(TRIAGE_REPLAY_PLAN_VERSION);
    expect(versionOf(TRIAGE_REPLAY_PLAN_V2_VERSION)).toBe(TRIAGE_REPLAY_PLAN_V2_VERSION);
    expect(versionOf(DOSSIER_VERSION)).toBe(DOSSIER_VERSION);
    expect(versionOf(DOSSIER_VERSION_V2)).toBe(DOSSIER_VERSION_V2);
    expect(versionOf(CAMPAIGN_CHECKPOINT_VERSION)).toBe(CAMPAIGN_CHECKPOINT_VERSION);
    // Recipe versions bind to the actual archived/active corpus documents.
    expect(versionOf(ARCHIVED_V1_RECIPES[0]?.schemaVersion ?? '')).toBe(ARCHIVED_V1_RECIPES[0]?.schemaVersion);
    expect(versionOf(PHASE10_FIXTURE_RECIPES[0]?.schemaVersion ?? '')).toBe(PHASE10_FIXTURE_RECIPES[0]?.schemaVersion);
  });

  test('every owning reader names a file that exists on disk', () => {
    const root = process.cwd();
    for (const entry of table) {
      const filePath = entry.readerApiPath.slice(0, entry.readerApiPath.indexOf('#'));
      expect(fs.existsSync(path.join(root, filePath)), entry.readerApiPath).toBe(true);
    }
  });

  test('lookup resolves exact hits and returns null on misses', () => {
    const receiptRow = historicalReaderForSchemaVersion(SEMANTIC_EVALUATION_RECEIPT_VERSION_V1);
    expect(receiptRow?.readerApiPath).toBe('src/oracles/semantic/receipts.ts#validateSemanticEvaluationReceipt');
    expect(receiptRow?.status).toBe('HISTORICAL');
    const replayV2Row = historicalReaderForSchemaVersion(TRIAGE_REPLAY_PLAN_V2_VERSION);
    expect(replayV2Row?.readerApiPath).toBe('src/core/triage/replayPlan.ts#parseTriageReplayPlanV2');
    expect(historicalReaderForSchemaVersion('nightwatch.does-not-exist.v9')).toBeNull();
    expect(historicalReaderForSchemaVersion('')).toBeNull();
  });

  test('validation negative matrix throws the exact fail-closed codes', () => {
    const base: HistoricalReaderEntry = {
      discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'nightwatch.synthetic.shape.v1' },
      readerApiPath: 'src/example/synthetic.ts#readSynthetic',
      status: 'HISTORICAL',
      note: 'synthetic reader row for the negative matrix',
    };
    const messageFor = (entries: readonly HistoricalReaderEntry[]): string => {
      try {
        validateHistoricalReaders(entries);
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
      return 'NO_THROW';
    };
    const cases: ReadonlyArray<readonly [label: string, entries: readonly HistoricalReaderEntry[], expected: string]> = [
      [
        'malformed schema version',
        [{ ...base, discriminator: { kind: 'SCHEMA_VERSION', schemaVersion: 'not-nightwatch-v1' } }],
        'HISTORICAL_READER_DISCRIMINATOR_FORMAT:not-nightwatch-v1',
      ],
      [
        'malformed shape tag',
        [{ ...base, discriminator: { kind: 'SHAPE', shapeTag: 'journey-evidence' } }],
        'HISTORICAL_READER_DISCRIMINATOR_FORMAT:journey-evidence',
      ],
      [
        'unknown discriminator kind',
        [{ ...base, discriminator: { kind: 'MAGIC' as never, schemaVersion: 'nightwatch.x.v1' } as never }],
        'HISTORICAL_READER_DISCRIMINATOR_FORMAT:unknown-kind',
      ],
      [
        'reader outside src/ and corpus/',
        [{ ...base, readerApiPath: 'docs/example/synthetic.ts#readSynthetic' }],
        'HISTORICAL_READER_API_PATH_FORMAT:docs/example/synthetic.ts#readSynthetic',
      ],
      ['invalid status', [{ ...base, status: 'MAGIC' as never }], 'HISTORICAL_READER_INVALID_STATUS:MAGIC'],
      ['empty note', [{ ...base, note: '' }], 'HISTORICAL_READER_NOTE_REQUIRED:nightwatch.synthetic.shape.v1'],
      [
        'duplicate discriminator',
        [base, { ...base, note: 'second row with the same discriminator' }],
        'HISTORICAL_READER_DUPLICATE_DISCRIMINATOR:nightwatch.synthetic.shape.v1',
      ],
    ];
    for (const [label, entries, expected] of cases) {
      expect(messageFor(entries), label).toBe(expected);
    }
  });

  test('notes are static sanitized strings with no raw-value-looking content', () => {
    for (const entry of table) {
      for (const value of [entry.note, entry.readerApiPath]) {
        expect(value, entry.readerApiPath).toMatch(/^[\x20-\x7E]*$/);
        expect(value.length, entry.readerApiPath).toBeLessThanOrEqual(240);
        expect(value, entry.readerApiPath).not.toMatch(/:\/\//);
        expect(value, entry.readerApiPath).not.toMatch(/[0-9a-f]{40}/i);
        expect(value, entry.readerApiPath).not.toMatch(/Bearer\s|ghp_|AKIA[0-9A-Z]{16}/);
      }
    }
    expect(historicalShapeReaders().map((entry) => entry.note)).toEqual(table.map((entry) => entry.note));
  });
});

test.describe('Phase 15P A04 — historical versions parse through their declared readers', () => {
  test('archived v1 recipes still validate under the unchanged v1 contract', () => {
    expect(ARCHIVED_V1_RECIPES.length).toBeGreaterThan(0);
    for (const recipe of ARCHIVED_V1_RECIPES) {
      expect(recipe.schemaVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
      expect(() => validateRealSourceRecipe(recipe), recipe.blueprint.expectationId).not.toThrow();
    }
    // Active v2 fixture recipes validate through the same dual reader.
    for (const recipe of PHASE10_FIXTURE_RECIPES) {
      expect(() => validateRealSourceRecipe(recipe), recipe.recipeId).not.toThrow();
    }
  });

  test('replay plans v1 and v2 round-trip through their own parsers', () => {
    const fingerprint = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    const contractDigest = `sha256:${'b'.repeat(64)}`;
    const v1Input = {
      candidateKind: 'API' as const,
      anomalyFingerprint: fingerprint,
      originalActionIds: ['action.one'],
      retainedActionIds: ['action.one'],
      phase: 'FRESH_EXACT_REPLAY' as const,
      targetId: 'synthetic.op',
      contractVersion: 'nightwatch.synthetic-contract.v1',
      contractDigest,
      catalogVersion: 'nightwatch.synthetic-catalog.v1',
      sourceVersion: 'nightwatch.synthetic-source.v1',
      routeClass: '/synthetic/route',
    };
    const v1 = createTriageReplayPlan(v1Input);
    expect(v1.schemaVersion).toBe(TRIAGE_REPLAY_PLAN_VERSION);
    expect(parseTriageReplayPlan(JSON.parse(JSON.stringify(v1)))).toEqual(v1);

    const v2 = createTriageReplayPlanV2({
      ...v1Input,
      originalOccurrences: [{ ordinal: 0, expectedActionId: 'action.one' }],
      retainedOccurrenceOrdinals: [0],
    });
    expect(v2.schemaVersion).toBe(TRIAGE_REPLAY_PLAN_V2_VERSION);
    expect(parseTriageReplayPlanV2(JSON.parse(JSON.stringify(v2)))).toEqual(v2);

    // Tampered identity fails closed in both readers.
    const tamperedV1 = JSON.parse(JSON.stringify(v1)) as Record<string, unknown>;
    tamperedV1['planId'] = 'rp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
    expect(() => parseTriageReplayPlan(tamperedV1)).toThrow(/REPLAY_PLAN_ID_MISMATCH/);
    const tamperedV2 = JSON.parse(JSON.stringify(v2)) as Record<string, unknown>;
    tamperedV2['planId'] = 'rp2:sha256:cccccccccccccccccccccccc';
    expect(() => parseTriageReplayPlanV2(tamperedV2)).toThrow(/REPLAY_PLAN_V2_ID_MISMATCH/);
  });

  test('dossier shape detection routes v1 and v2 to their declared readers', () => {
    expect(isV1Dossier({ schemaVersion: DOSSIER_VERSION })).toBe(true);
    expect(isV1Dossier({ schemaVersion: DOSSIER_VERSION_V2 })).toBe(false);
    expect(isV1Dossier(null)).toBe(false);
    expect(isV1Dossier('x')).toBe(false);
  });

  test('checkpoint runtime-contract classification truth table is deterministic', () => {
    const legacy = { schemaVersion: CAMPAIGN_CHECKPOINT_VERSION };
    expect(classifyCheckpointRuntimeContracts(legacy as never)).toBe(CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION);
    const current = {
      schemaVersion: CAMPAIGN_CHECKPOINT_VERSION,
      runtimeContractVersions: { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED },
    };
    expect(classifyCheckpointRuntimeContracts(current as never)).toBe('CURRENT_S2_CONTRACTS');
    for (const slot of ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const) {
      const incompatible = {
        schemaVersion: CAMPAIGN_CHECKPOINT_VERSION,
        runtimeContractVersions: { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, [slot]: 'nightwatch.future.private.v999' },
      };
      expect(classifyCheckpointRuntimeContracts(incompatible as never), slot).toBe('INCOMPATIBLE_FUTURE');
    }
    // Repeated evaluations agree.
    for (const input of [legacy, current]) {
      const verdicts = [0, 1, 2].map(() => classifyCheckpointRuntimeContracts(input as never));
      expect(new Set(verdicts).size).toBe(1);
    }
  });
});

test.describe('Phase 15P A04 — frozen-schema unknown-field rejection (independent pin)', () => {
  test('one bogus key at each lifecycle DTO level yields the exact dotted path', () => {
    const { current, record } = fixtures();
    const descriptor = buildContractLifecycleRegistry()[0];
    if (descriptor === undefined) throw new Error('fixture expected a registry descriptor');

    expect(() => validateContractFamilyDescriptorDto(cloneWith(descriptor, { bogus: 1 })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ContractFamilyDescriptor.bogus'));
    expect(() => validateUnifiedContractResultDto(cloneWith(record.unified, { bogus: true })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:UnifiedContractResult.bogus'));
    expect(() => validateFamilyResolutionRecordDto(cloneWith(record, { bogus: 'x' })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:FamilyResolutionRecord.bogus'));
    expect(() => validateComposedSourceContractResolutionDto(cloneWith(current, { bogus: 9 })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.bogus'));
    if (current.drift !== null) {
      expect(() => validateComposedSourceContractResolutionDto(cloneWith(current, { drift: cloneWith(current.drift, { bogus: 1 }) })))
        .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.drift.bogus'));
    }

    // Present-but-undefined and dispatcher guards stay pinned.
    expect(() => validateUnifiedContractResultDto(cloneWith(record.unified, { detail: undefined })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNDEFINED_FIELD:UnifiedContractResult.detail'));
    expect(() => validateContractSchema(null)).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
    expect(() => validateContractSchema({ unrelated: true })).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
  });

  test('semantic expectation and receipt builders reject unknown fields', () => {
    expect(() => validateExpectation(expectationWith({ kind: 'FIELD_PRESENT', path: ['items'], expected: true, bogus: 1 })))
      .toThrow(/unknown-field:bogus/);
    expect(() => buildSemanticEvaluationReceipt({ oracleId: 'synthetic-oracle', outcome: 'PASS', bogus: 1 } as never))
      .toThrow(/unknown-input-field:bogus/);
  });
});

test.describe('Phase 15P A04 — determinism', () => {
  test('canonical serialization is byte-stable and round-trips', () => {
    const { current, record } = fixtures();
    const first = canonicalSerializeContractDto(current, validateComposedSourceContractResolutionDto);
    const second = canonicalSerializeContractDto(current, validateComposedSourceContractResolutionDto);
    expect(first).toBe(second);
    expect(() => assertDeterministicRoundTrip(current, validateComposedSourceContractResolutionDto)).not.toThrow();
    expect(() => assertDeterministicRoundTrip(record, validateFamilyResolutionRecordDto)).not.toThrow();
    for (const family of buildContractLifecycleRegistry()) {
      expect(() => assertDeterministicRoundTrip(family, validateContractFamilyDescriptorDto)).not.toThrow();
    }
  });

  test('derived identities are stable across repeated construction', () => {
    const receiptA = buildSemanticEvaluationReceipt({ oracleId: 'synthetic-oracle', outcome: 'PASS' });
    const receiptB = buildSemanticEvaluationReceipt({ oracleId: 'synthetic-oracle', outcome: 'PASS' });
    expect(receiptA.receiptId).toBe(receiptB.receiptId);

    const planInput = {
      candidateKind: 'JOURNEY' as const,
      anomalyFingerprint: 'fp:sha256:dddddddddddddddddddddddd',
      originalActionIds: ['action.one', 'action.two'],
      retainedActionIds: ['action.one'],
      phase: 'REDUCED_CANDIDATE' as const,
      targetId: 'synthetic.journey',
      contractVersion: 'nightwatch.synthetic-contract.v1',
      contractDigest: `sha256:${'e'.repeat(64)}`,
      catalogVersion: 'nightwatch.synthetic-catalog.v1',
      sourceVersion: 'nightwatch.synthetic-source.v1',
      routeClass: '/synthetic/journey',
    };
    expect(createTriageReplayPlan(planInput).planId).toBe(createTriageReplayPlan(planInput).planId);
    const v2Input = {
      ...planInput,
      originalOccurrences: [
        { ordinal: 0, expectedActionId: 'action.one' },
        { ordinal: 1, expectedActionId: 'action.two' },
      ],
      retainedOccurrenceOrdinals: [0],
    };
    expect(createTriageReplayPlanV2(v2Input).planId).toBe(createTriageReplayPlanV2(v2Input).planId);
  });

  test('validation verdicts repeat identically across runs', () => {
    const { current, record } = fixtures();
    for (let run = 0; run < 3; run += 1) {
      expect(() => validateComposedSourceContractResolutionDto(current), `composed run ${run}`).not.toThrow();
      expect(() => validateFamilyResolutionRecordDto(record), `record run ${run}`).not.toThrow();
    }
    const invalid = cloneWith(record, { kind: 'COLLECTION', derivationVersion: MECHANICAL_ANALYZER_VERSION });
    const verdicts: string[] = [];
    for (let run = 0; run < 3; run += 1) {
      try {
        validateFamilyResolutionRecordDto(invalid);
        verdicts.push('NO_THROW');
      } catch (error) {
        verdicts.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(new Set(verdicts).size).toBe(1);
    expect(verdicts[0]).not.toBe('NO_THROW');
  });
});
