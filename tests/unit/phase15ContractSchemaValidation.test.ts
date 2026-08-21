// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream E — permanent unit proof for the
// lifecycle DTO schema-validation gateway
// (src/oracles/expectations/lifecycle/contractSchemaValidation.ts).
//
// Coverage:
//   - every REAL producer output (lifecycle registry descriptors, unified
//     vocabulary adapter results, aggregates, family resolution records, and
//     composed source-contract resolutions across every reachable scenario)
//     passes its dedicated validator AND the validateContractSchema
//     dispatcher, with deep-equal identity of the returned DTO;
//   - strict unknown-field rejection at EVERY object level (top-level,
//     nested unified, nested families[i], nested drift) with EXACT error
//     paths;
//   - present-with-undefined-value rejection;
//   - enum violation matrix (category/kind/scope/currentnessClass/composed
//     kind/drift class);
//   - cross-field coherence matrix (derivation/evidence/currentness pairing
//     per kind, probe-vs-expectationId exclusivity, historicalImmutable iff
//     archived, lineage id prefixes, composed kind vs overall-category
//     allowlist, composed kind vs family currentness classes);
//   - privacy-sentinel screening on free-text surfaces;
//   - deterministic canonical serialization + round-trip proof, including
//     tampered-canonical detection, byte stability, and the
//     CONTRACT_SCHEMA_VALIDATION_REQUIRED unvalidated-input guard.
//
// Synthetic/local only: valid fixtures come from the REAL producers
// (buildContractLifecycleRegistry, the vocabulary adapters, and
// resolveSourceContract over the repository-owned Phase 11A.3 fixture text
// served through the Phase 9A.1 bounded map source). No DEV, no real
// product, no network.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  assertDeterministicRoundTrip,
  canonicalSerializeContractDto,
  CONTRACT_SCHEMA_VALIDATION_VERSION,
  validateContractFamilyDescriptorDto,
  validateContractSchema,
  validateComposedSourceContractResolutionDto,
  validateFamilyResolutionRecordDto,
  validateUnifiedContractResultDto,
} from '../../src/oracles/expectations/lifecycle/contractSchemaValidation';
import {
  buildContractLifecycleRegistry,
  MECHANICAL_ANALYZER_EVIDENCE_VERSION,
  SOURCE_EVIDENCE_DIGEST_VERSION,
  terminalContractFamilyForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import type { ContractFamilyDescriptor, ContractFamilyKind } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import {
  aggregateUnifiedContractResults,
  buildUnifiedContractResult,
  unifiedFromAnalyzerStatus,
  unifiedFromCollectionAdmissionFailure,
  unifiedFromCoverageDisposition,
  unifiedFromDerivationFailure,
  unifiedFromDriftClass,
  unifiedFromExpectationAdmissionResult,
} from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import type { UnifiedContractResult } from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import { resolveSourceContract } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type {
  ComposedSourceContractResolution,
  FamilyResolutionRecord,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import type { AnalyzerStatus } from '../../src/oracles/expectations/extract/analyzer';
import type { ExpectationAdmissionResult } from '../../src/oracles/expectations/types';
import type { RealSourceDerivationFailure } from '../../src/oracles/expectations/recipes/types';
import type { RealSourceCollectionAdmissionFailure } from '../../src/oracles/expectations/collectionAdmission';
import type { CoverageDisposition } from '../../src/oracles/expectations/coverageInventory';
import { stableJsonSorted } from '../../src/core/identity/canonicalDigest';
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
const OTHER_SHA = 'dddddddddddddddddddddddddddddddddddddddd';

const COMMON = 'ripple.common-exchange.read';
const ACCOUNT = 'ripple.account-inventory.read';
const BGS = 'ripple.billing-groups.read';
const UNKNOWN_TARGET = 'ripple.does-not-exist.read';

const FILES = {
  'src/App/Handler/ExchangeRate.php': realExchangeRateFixture,
  'src/App/Handler/Account.php': realAccountFixture,
  'src/App/Handler/BillingGroup.php': realBillingGroupFixture,
  'src/App/Route/Config/Routing.yaml': realRoutingFixture,
};

function freshMap(): MapSource {
  return createMapSource([{ repoId: REPO, sha: SHA, files: FILES }]);
}

function resolveFrom(
  map: MapSource,
  targetId: string,
  extra?: {
    snapshot?: { repoId: string; sha: string } | null;
    previousEvidenceDigestByFamilyId?: Readonly<Record<string, string>>;
  },
): ComposedSourceContractResolution {
  return resolveSourceContract({
    targetId,
    reader: map.reader,
    currentness: map.currentness,
    snapshot: extra?.snapshot !== undefined ? extra.snapshot : { repoId: REPO, sha: SHA },
    ...(extra?.previousEvidenceDigestByFamilyId !== undefined
      ? { previousEvidenceDigestByFamilyId: extra.previousEvidenceDigestByFamilyId }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// Scenario fixtures: every reachable composed-resolution shape, built once
// from the real producers and reused read-only (tamper tests always clone).
// ---------------------------------------------------------------------------

interface LifecycleScenarios {
  readonly current: ComposedSourceContractResolution;
  readonly accountCurrent: ComposedSourceContractResolution;
  readonly stale: ComposedSourceContractResolution;
  readonly unavailableNullCurrentness: ComposedSourceContractResolution;
  readonly unavailableNullSnapshot: ComposedSourceContractResolution;
  readonly derivationFailure: ComposedSourceContractResolution;
  readonly unknownTarget: ComposedSourceContractResolution;
  readonly probeOnly: ComposedSourceContractResolution;
  readonly driftUnchanged: ComposedSourceContractResolution;
  readonly driftChanged: ComposedSourceContractResolution;
  readonly driftStale: ComposedSourceContractResolution;
}

function terminalFamilyIdOf(targetId: string): string {
  const outcome = terminalContractFamilyForTarget(targetId);
  if (!outcome.ok) throw new Error(`no terminal family for ${targetId}: ${outcome.reason}`);
  return outcome.family.familyId;
}

function terminalRecordOf(
  resolution: ComposedSourceContractResolution,
  targetId: string,
): FamilyResolutionRecord {
  const familyId = terminalFamilyIdOf(targetId);
  const record = resolution.families.find((candidate) => candidate.familyId === familyId);
  if (record === undefined) throw new Error(`terminal family ${familyId} missing from resolution`);
  return record;
}

function buildScenarios(): LifecycleScenarios {
  const current = resolveFrom(freshMap(), COMMON);
  const accountCurrent = resolveFrom(freshMap(), ACCOUNT);

  const staleMap = freshMap();
  staleMap.setSha(REPO, OTHER_SHA);
  const stale = resolveFrom(staleMap, COMMON);

  const unavailableNullCurrentness = resolveSourceContract({
    targetId: COMMON,
    reader: freshMap().reader,
    currentness: { currentSnapshot: () => null },
    snapshot: { repoId: REPO, sha: SHA },
  });

  const unavailableNullSnapshot = resolveFrom(freshMap(), COMMON, { snapshot: null });

  const failureMap = freshMap();
  failureMap.setFile(REPO, 'src/App/Handler/ExchangeRate.php', '<?php\nnamespace App\\Handler;\n\nclass ExchangeRate\n{\n}\n');
  const derivationFailure = resolveFrom(failureMap, COMMON);

  const unknownTarget = resolveFrom(freshMap(), UNKNOWN_TARGET);
  const probeOnly = resolveFrom(freshMap(), BGS);

  const baseline = resolveFrom(freshMap(), COMMON);
  const terminalDigest = terminalRecordOf(baseline, COMMON).evidenceDigest;
  if (terminalDigest === null) throw new Error('terminal digest unexpectedly null');
  const terminalKey = terminalFamilyIdOf(COMMON);

  const driftUnchanged = resolveFrom(freshMap(), COMMON, {
    previousEvidenceDigestByFamilyId: { [terminalKey]: terminalDigest },
  });
  const driftChanged = resolveFrom(freshMap(), COMMON, {
    previousEvidenceDigestByFamilyId: { [terminalKey]: 'ev:sha256:000000000000000000000000' },
  });

  const driftStaleMap = freshMap();
  driftStaleMap.setSha(REPO, OTHER_SHA);
  const driftStale = resolveFrom(driftStaleMap, COMMON, {
    previousEvidenceDigestByFamilyId: { [terminalKey]: 'ev:sha256:000000000000000000000000' },
  });

  return {
    current,
    accountCurrent,
    stale,
    unavailableNullCurrentness,
    unavailableNullSnapshot,
    derivationFailure,
    unknownTarget,
    probeOnly,
    driftUnchanged,
    driftChanged,
    driftStale,
  };
}

let cachedScenarios: LifecycleScenarios | null = null;

function scenarios(): LifecycleScenarios {
  if (cachedScenarios === null) cachedScenarios = buildScenarios();
  return cachedScenarios;
}

function allScenarioEntries(): [string, ComposedSourceContractResolution][] {
  const set = scenarios();
  return [
    ['current', set.current],
    ['accountCurrent', set.accountCurrent],
    ['stale', set.stale],
    ['unavailableNullCurrentness', set.unavailableNullCurrentness],
    ['unavailableNullSnapshot', set.unavailableNullSnapshot],
    ['derivationFailure', set.derivationFailure],
    ['unknownTarget', set.unknownTarget],
    ['probeOnly', set.probeOnly],
    ['driftUnchanged', set.driftUnchanged],
    ['driftChanged', set.driftChanged],
    ['driftStale', set.driftStale],
  ];
}

// ---------------------------------------------------------------------------
// Tamper helpers.
// ---------------------------------------------------------------------------

/** Deep mutable plain-object copy overlaid with the given patch. */
function cloneWith(value: unknown, patch: Record<string, unknown>): Record<string, unknown> {
  return Object.assign(JSON.parse(JSON.stringify(value)) as Record<string, unknown>, patch);
}

function firstFamily(resolution: ComposedSourceContractResolution): FamilyResolutionRecord {
  const record = resolution.families[0];
  if (record === undefined) throw new Error('fixture expected at least one family record');
  return record;
}

function descriptorByKind(kind: ContractFamilyKind): ContractFamilyDescriptor {
  const found = buildContractLifecycleRegistry().find((family) => family.kind === kind);
  if (found === undefined) throw new Error(`registry has no ${kind} family`);
  return found;
}

/** Anchored matcher: the error message must be EXACTLY this code string. */
function exactCode(code: string): RegExp {
  return new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

// ---------------------------------------------------------------------------
// Unified-result fixtures built through the real vocabulary producers.
// ---------------------------------------------------------------------------

function unifiedSamples(): UnifiedContractResult[] {
  const proven = unifiedFromAnalyzerStatus('PROVEN' as AnalyzerStatus, { targetId: COMMON });
  const partial = unifiedFromAnalyzerStatus('AMBIGUOUS' as AnalyzerStatus, {
    blockerCode: 'PARTIAL_PROOF_ONLY',
    targetId: COMMON,
  });
  return [
    proven,
    partial,
    buildUnifiedContractResult({
      category: 'NOT_APPLICABLE',
      sourceVocabulary: 'unified-aggregate',
      sourceValue: 'PROVEN',
      detail: 'sanitized categorical note',
    }),
    unifiedFromExpectationAdmissionResult('EXPECTATION_ADMITTED' as ExpectationAdmissionResult, { targetId: COMMON }),
    unifiedFromDerivationFailure('FUNCTION_NOT_FOUND' as RealSourceDerivationFailure, { targetId: COMMON }),
    unifiedFromCollectionAdmissionFailure('COLLECTION_ADMISSION_PROOF_MISSING' as RealSourceCollectionAdmissionFailure, {
      targetId: COMMON,
    }),
    unifiedFromDriftClass('EVIDENCE_UNCHANGED_SHA_MOVED', { targetId: COMMON }),
    unifiedFromCoverageDisposition('APPROVED_AND_ADMITTED' as CoverageDisposition, { targetId: COMMON }),
    aggregateUnifiedContractResults([proven, partial]),
  ];
}

// ---------------------------------------------------------------------------

test.describe('Phase 15 Workstream E — contract schema validation', () => {
  test('version constant is pinned', () => {
    expect(CONTRACT_SCHEMA_VALIDATION_VERSION).toBe('nightwatch.contract-schema-validation.v1');
  });

  test('every lifecycle registry descriptor passes its validator and the dispatcher with identity', () => {
    const registry = buildContractLifecycleRegistry();
    expect(registry.length).toBeGreaterThan(0);
    const kinds = new Set(registry.map((family) => family.kind));
    expect([...kinds].sort()).toEqual([
      'ARCHIVED_HISTORICAL_SHAPE',
      'COLLECTION',
      'DEEP_TYPE',
      'HISTORICAL_SHAPE',
      'MECHANICAL_PROBE',
    ]);
    for (const family of registry) {
      expect(validateContractFamilyDescriptorDto(family)).toEqual(family);
      expect(validateContractSchema(family)).toEqual(family);
    }
  });

  test('every unified vocabulary producer output passes its validator and the dispatcher with identity', () => {
    for (const sample of unifiedSamples()) {
      expect(validateUnifiedContractResultDto(sample)).toEqual(sample);
      expect(validateContractSchema(sample)).toEqual(sample);
    }
  });

  test('real family resolution records pass their validator and the dispatcher with identity', () => {
    for (const [name, resolution] of allScenarioEntries()) {
      for (const record of resolution.families) {
        expect(validateFamilyResolutionRecordDto(record), `scenario ${name}`).toEqual(record);
        expect(validateContractSchema(record), `scenario ${name}`).toEqual(record);
      }
    }
  });

  test('composed resolutions across every reachable scenario pass their validator and the dispatcher with identity', () => {
    for (const [name, resolution] of allScenarioEntries()) {
      expect(validateComposedSourceContractResolutionDto(resolution), `scenario ${name}`).toEqual(resolution);
      expect(validateContractSchema(resolution), `scenario ${name}`).toEqual(resolution);
    }
  });

  test('unknown-field matrix: one bogus key at EVERY level yields the EXACT dotted path', () => {
    const set = scenarios();

    // Descriptor top level.
    expect(() => validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('DEEP_TYPE'), { bogus: 1 })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ContractFamilyDescriptor.bogus'));

    // Unified top level.
    const unified = firstFamily(set.current).unified;
    expect(() => validateUnifiedContractResultDto(cloneWith(unified, { bogus: true })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:UnifiedContractResult.bogus'));
    expect(() => validateContractSchema(cloneWith(unified, { bogus: true })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:UnifiedContractResult.bogus'));

    // Record top level + nested unified.
    const record = firstFamily(set.current);
    expect(() => validateFamilyResolutionRecordDto(cloneWith(record, { bogus: 'x' })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:FamilyResolutionRecord.bogus'));
    const recordNested = cloneWith(record, {});
    recordNested['unified'] = cloneWith(record.unified, { bogus: 'x' });
    expect(() => validateFamilyResolutionRecordDto(recordNested))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:FamilyResolutionRecord.unified.bogus'));

    // Composed top level + nested families[0] + nested families[0].unified.
    expect(() => validateComposedSourceContractResolutionDto(cloneWith(set.current, { bogus: 9 })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.bogus'));
    const composedFamily = cloneWith(set.current, {});
    composedFamily['families'] = [cloneWith(firstFamily(set.current), { bogus: 9 })];
    expect(() => validateComposedSourceContractResolutionDto(composedFamily))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.families[0].bogus'));
    const composedFamilyUnified = cloneWith(set.current, {});
    composedFamilyUnified['families'] = [
      cloneWith(firstFamily(set.current), { unified: cloneWith(firstFamily(set.current).unified, { bogus: 9 }) }),
    ];
    expect(() => validateComposedSourceContractResolutionDto(composedFamilyUnified))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.families[0].unified.bogus'));

    // Nested drift (needs a drift-carrying scenario).
    const driftCarrier = cloneWith(set.driftUnchanged, {});
    if (set.driftUnchanged.drift === null) throw new Error('driftUnchanged fixture expected a drift classification');
    driftCarrier['drift'] = cloneWith(set.driftUnchanged.drift, { bogus: 9 });
    expect(() => validateComposedSourceContractResolutionDto(driftCarrier))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.drift.bogus'));
  });

  test('present-with-undefined-value fields are rejected with the UNDEFINED_FIELD path', () => {
    const set = scenarios();
    const unified = firstFamily(set.current).unified;
    expect(() => validateUnifiedContractResultDto(cloneWith(unified, { detail: undefined })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNDEFINED_FIELD:UnifiedContractResult.detail'));

    const record = firstFamily(set.current);
    expect(() => validateFamilyResolutionRecordDto(cloneWith(record, { evidenceDigest: undefined })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNDEFINED_FIELD:FamilyResolutionRecord.evidenceDigest'));
    const recordNested = cloneWith(record, {});
    recordNested['unified'] = cloneWith(record.unified, { targetId: undefined });
    expect(() => validateFamilyResolutionRecordDto(recordNested))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNDEFINED_FIELD:FamilyResolutionRecord.unified.targetId'));

    expect(() => validateComposedSourceContractResolutionDto(cloneWith(set.current, { detail: undefined })))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNDEFINED_FIELD:ComposedSourceContractResolution.detail'));
  });

  test('enum violation matrix across every closed vocabulary', () => {
    const set = scenarios();
    const unified = firstFamily(set.current).unified;

    expect(() => validateUnifiedContractResultDto(cloneWith(unified, { category: 'BOGUS_CATEGORY' })))
      .toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:UnifiedContractResult.category:BOGUS_CATEGORY'));
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('DEEP_TYPE'), { kind: 'TELEPORTED_KIND' })),
    ).toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:ContractFamilyDescriptor.kind:TELEPORTED_KIND'));
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('DEEP_TYPE'), { scope: 'BOGUS_SCOPE' })),
    ).toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:ContractFamilyDescriptor.scope:BOGUS_SCOPE'));
    expect(() =>
      validateFamilyResolutionRecordDto(cloneWith(firstFamily(set.current), { currentnessClass: 'MAYBE_CURRENT' })),
    ).toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:FamilyResolutionRecord.currentnessClass:MAYBE_CURRENT'));
    expect(() => validateComposedSourceContractResolutionDto(cloneWith(set.current, { kind: 'TELEPORTED' })))
      .toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:ComposedSourceContractResolution.kind:TELEPORTED'));
    if (set.driftUnchanged.drift === null) throw new Error('driftUnchanged fixture expected drift');
    const badDrift = cloneWith(set.driftUnchanged, {});
    badDrift['drift'] = cloneWith(set.driftUnchanged.drift, { driftClass: 'NOT_A_DRIFT_CLASS' });
    expect(() => validateComposedSourceContractResolutionDto(badDrift))
      .toThrow(exactCode('CONTRACT_SCHEMA_ENUM_VIOLATION:ComposedSourceContractResolution.drift.driftClass:NOT_A_DRIFT_CLASS'));
  });

  test('descriptor cross-field matrix: derivation/evidence/currentness pairing per kind', () => {
    const mismatch = /^CONTRACT_SCHEMA_INCOHERENT:derivation-version-kind-mismatch:/;
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('DEEP_TYPE'), { derivationVersion: REAL_SOURCE_DERIVATION_VERSION }),
      ),
    ).toThrow(mismatch);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { derivationVersion: MECHANICAL_ANALYZER_VERSION }),
      ),
    ).toThrow(mismatch);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('COLLECTION'), { derivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2 }),
      ),
    ).toThrow(mismatch);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('MECHANICAL_PROBE'), { derivationVersion: REAL_SOURCE_COLLECTION_DERIVATION_VERSION }),
      ),
    ).toThrow(mismatch);

    const evidenceMismatch = /^CONTRACT_SCHEMA_INCOHERENT:evidence-version-kind-mismatch:/;
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { evidenceVersion: MECHANICAL_ANALYZER_EVIDENCE_VERSION }),
      ),
    ).toThrow(evidenceMismatch);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('MECHANICAL_PROBE'), { evidenceVersion: SOURCE_EVIDENCE_DIGEST_VERSION }),
      ),
    ).toThrow(evidenceMismatch);

    const currentnessMismatch = /^CONTRACT_SCHEMA_INCOHERENT:currentness-requirement-kind-mismatch:/;
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('MECHANICAL_PROBE'), { currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY' }),
      ),
    ).toThrow(currentnessMismatch);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { currentnessRequirement: 'ANALYZER_SOURCE_FRESHNESS' }),
      ),
    ).toThrow(currentnessMismatch);
  });

  test('descriptor cross-field matrix: probe-vs-expectationId exclusivity and target binding', () => {
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('MECHANICAL_PROBE'), { expectationId: 'ripple.billing-groups.read.probe-x' }),
      ),
    ).toThrow(/^CONTRACT_SCHEMA_INCOHERENT:probe-family-cannot-carry-expectation-id:/);
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { expectationId: null })),
    ).toThrow(/^CONTRACT_SCHEMA_INCOHERENT:non-probe-family-requires-expectation-id:/);
    expect(() =>
      validateContractFamilyDescriptorDto(
        cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { expectationId: 'other.target.real-source-shape' }),
      ),
    ).toThrow(/^CONTRACT_SCHEMA_INCOHERENT:expectation-id-target-mismatch:/);
  });

  test('descriptor cross-field matrix: historicalImmutable iff ARCHIVED_HISTORICAL_SHAPE; lineage id prefixes', () => {
    const immutableRule = /^CONTRACT_SCHEMA_INCOHERENT:historicalImmutable-iff-ARCHIVED_HISTORICAL_SHAPE:/;
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('ARCHIVED_HISTORICAL_SHAPE'), { historicalImmutable: false })),
    ).toThrow(immutableRule);
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('DEEP_TYPE'), { historicalImmutable: true })),
    ).toThrow(immutableRule);

    const lineagePrefix = /^CONTRACT_SCHEMA_INCOHERENT:.*predecessorFamilyId-must-be-null-or-lifecycle-prefixed:/;
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('HISTORICAL_SHAPE'), { predecessorFamilyId: 'nope' })),
    ).toThrow(lineagePrefix);
    expect(() =>
      validateContractFamilyDescriptorDto(cloneWith(descriptorByKind('DEEP_TYPE'), { successorFamilyId: 'family-x' })),
    ).toThrow(/^CONTRACT_SCHEMA_INCOHERENT:.*successorFamilyId-must-be-null-or-lifecycle-prefixed:/);
  });

  test('composed cross-field matrix: KIND -> OVERALL.CATEGORY allowlist violations', () => {
    const set = scenarios();
    expect(() =>
      validateComposedSourceContractResolutionDto(cloneWith(set.current, { overall: cloneWith(set.stale.overall, {}) })),
    ).toThrow(
      exactCode('CONTRACT_SCHEMA_INCOHERENT:composed-kind-RESOLVED_CURRENT-cannot-carry-overall-category-STALE'),
    );
    expect(() =>
      validateComposedSourceContractResolutionDto(cloneWith(set.stale, { overall: cloneWith(set.current.overall, {}) })),
    ).toThrow(exactCode('CONTRACT_SCHEMA_INCOHERENT:composed-kind-STALE-cannot-carry-overall-category-PROVEN'));
  });

  test('composed cross-field matrix: kind vs family currentness classes', () => {
    const set = scenarios();

    // RESOLVED_CURRENT demands at least one CURRENT record.
    const resolvedWithoutCurrent = cloneWith(set.derivationFailure, { kind: 'RESOLVED_CURRENT' });
    resolvedWithoutCurrent['overall'] = cloneWith(set.current.overall, {});
    expect(() => validateComposedSourceContractResolutionDto(resolvedWithoutCurrent))
      .toThrow(exactCode('CONTRACT_SCHEMA_INCOHERENT:RESOLVED_CURRENT-requires-at-least-one-CURRENT-family-record'));

    // STALE demands a STALE record or the mixed-blocked detail.
    const staleWithoutStale = cloneWith(set.derivationFailure, { kind: 'STALE' });
    staleWithoutStale['overall'] = cloneWith(set.stale.overall, {});
    expect(() => validateComposedSourceContractResolutionDto(staleWithoutStale))
      .toThrow(exactCode('CONTRACT_SCHEMA_INCOHERENT:STALE-requires-a-STALE-family-record-or-mixed-blocked-detail'));

    // NO_EXPECTATION demands empty families or all-NOT_APPLICABLE records
    // (pair-checked first: UNSUPPORTED is an allowed NO_EXPECTATION overall).
    const noExpectationWithCurrent = cloneWith(set.current, { kind: 'NO_EXPECTATION' });
    noExpectationWithCurrent['overall'] = cloneWith(set.derivationFailure.overall, {});
    expect(() => validateComposedSourceContractResolutionDto(noExpectationWithCurrent))
      .toThrow(exactCode('CONTRACT_SCHEMA_INCOHERENT:NO_EXPECTATION-requires-empty-families-or-all-NOT_APPLICABLE-records'));
  });

  test('allowlist rows whose producers are unreachable via public params still validate coherently', () => {
    const set = scenarios();
    // AMBIGUOUS_TARGET_SELECTION shares the fixed early-return NOT_APPLICABLE floor.
    const ambiguous = cloneWith(set.unknownTarget, { kind: 'AMBIGUOUS_TARGET_SELECTION' });
    expect(validateComposedSourceContractResolutionDto(ambiguous)).toEqual(ambiguous);
    // MIXED_CURRENTNESS_BLOCKED carries the fixed STALE overall + fail-closed detail.
    const mixedBlocked = cloneWith(set.stale, {
      kind: 'MIXED_CURRENTNESS_BLOCKED',
      detail: 'mixed-currentness-fail-closed',
    });
    expect(validateComposedSourceContractResolutionDto(mixedBlocked)).toEqual(mixedBlocked);
  });

  test('privacy sentinel screening on free-text surfaces', () => {
    const set = scenarios();
    const unified = firstFamily(set.current).unified;
    expect(() => validateUnifiedContractResultDto(cloneWith(unified, { detail: 'note PRIVACY_SENTINEL leak' })))
      .toThrow(exactCode('CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:UnifiedContractResult.detail'));
    expect(() => validateUnifiedContractResultDto(cloneWith(unified, { targetId: `${COMMON} AKIAEXAMPLE` })))
      .toThrow(exactCode('CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:UnifiedContractResult.targetId'));

    const recordNested = cloneWith(firstFamily(set.current), {});
    recordNested['unified'] = cloneWith(firstFamily(set.current).unified, { detail: 'note PRIVACY_SENTINEL leak' });
    expect(() => validateFamilyResolutionRecordDto(recordNested))
      .toThrow(exactCode('CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:FamilyResolutionRecord.unified.detail'));

    const composedOverall = cloneWith(set.current, {});
    composedOverall['overall'] = cloneWith(set.current.overall, { detail: 'note PRIVACY_SENTINEL leak' });
    expect(() => validateComposedSourceContractResolutionDto(composedOverall))
      .toThrow(exactCode('CONTRACT_SCHEMA_PRIVACY_SENTINEL_REJECTED:ComposedSourceContractResolution.overall.detail'));
  });

  test('dispatcher rejects non-DTO shapes', () => {
    expect(() => validateContractSchema(null)).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
    expect(() => validateContractSchema('x')).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
    expect(() => validateContractSchema([])).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
    expect(() => validateContractSchema({})).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
    expect(() => validateContractSchema({ unrelated: true })).toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_DTO_SHAPE'));
  });

  test('deterministic round trip holds for every real producer output', () => {
    for (const family of buildContractLifecycleRegistry()) {
      expect(() => assertDeterministicRoundTrip(family, validateContractFamilyDescriptorDto)).not.toThrow();
    }
    for (const sample of unifiedSamples()) {
      expect(() => assertDeterministicRoundTrip(sample, validateUnifiedContractResultDto)).not.toThrow();
    }
    for (const [, resolution] of allScenarioEntries()) {
      expect(() => assertDeterministicRoundTrip(resolution, validateComposedSourceContractResolutionDto)).not.toThrow();
    }
    expect(() =>
      assertDeterministicRoundTrip(firstFamily(scenarios().current), validateFamilyResolutionRecordDto),
    ).not.toThrow();
    // The generic dispatcher works as a round-trip validator too.
    expect(() => assertDeterministicRoundTrip(scenarios().current, validateContractSchema)).not.toThrow();
    expect(() =>
      assertDeterministicRoundTrip(descriptorByKind('MECHANICAL_PROBE'), validateContractSchema),
    ).not.toThrow();
  });

  test('canonical form is byte-stable and equals the canonicalDigest stable-JSON core', () => {
    const resolution = scenarios().current;
    const first = canonicalSerializeContractDto(resolution, validateComposedSourceContractResolutionDto);
    const second = canonicalSerializeContractDto(resolution, validateComposedSourceContractResolutionDto);
    expect(first).toBe(second);
    expect(first).toBe(stableJsonSorted(resolution));
    expect(() => JSON.parse(first)).not.toThrow();
  });

  test('tampered canonical JSON fails closed at entry; the re-validation wrap branch is pinned', () => {
    const canonical = canonicalSerializeContractDto(scenarios().stale, validateComposedSourceContractResolutionDto);

    // A tampered document never survives the entry validation of the first
    // canonical serialization: the underlying CONTRACT_SCHEMA_* code
    // propagates unwrapped and nothing about the tampered form is accepted.
    const unknownFieldTamper = JSON.parse(canonical) as Record<string, unknown>;
    unknownFieldTamper['bogus'] = true;
    expect(() => assertDeterministicRoundTrip(unknownFieldTamper, validateComposedSourceContractResolutionDto))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.bogus'));
    expect(() => validateContractSchema(unknownFieldTamper))
      .toThrow(exactCode('CONTRACT_SCHEMA_UNKNOWN_FIELD:ComposedSourceContractResolution.bogus'));

    const valueFlip = JSON.parse(canonical) as Record<string, unknown>;
    const overall = valueFlip['overall'];
    if (overall === null || typeof overall !== 'object') throw new Error('fixture expected an object overall');
    (overall as Record<string, unknown>)['category'] = 'PROVEN';
    expect(() => assertDeterministicRoundTrip(valueFlip, validateComposedSourceContractResolutionDto))
      .toThrow(
        exactCode('CONTRACT_SCHEMA_INCOHERENT:composed-kind-STALE-cannot-carry-overall-category-PROVEN'),
      );

    // Defensive wrap branch: when a first serialization succeeds but the
    // parsed form fails re-validation, the failure is reported as
    // CONTRACT_SCHEMA_ROUND_TRIP_MISMATCH with the cause preserved.
    let calls = 0;
    const divergingValidator = (value: unknown): unknown => {
      calls += 1;
      if (calls === 1) return value;
      throw new Error('CONTRACT_SCHEMA_ENUM_VIOLATION:defensive-branch:second-call');
    };
    expect(() => assertDeterministicRoundTrip({ probe: 1 }, divergingValidator))
      .toThrow(/^CONTRACT_SCHEMA_ROUND_TRIP_MISMATCH:re-validation-failed:CONTRACT_SCHEMA_ENUM_VIOLATION:defensive-branch:second-call$/);
  });

  test('canonical serialization refuses unvalidated input and non-JSON canonical forms', () => {
    const withoutValidator = canonicalSerializeContractDto as unknown as (value: unknown) => string;
    expect(() => withoutValidator({ category: 'PROVEN' }))
      .toThrow(exactCode('CONTRACT_SCHEMA_VALIDATION_REQUIRED'));

    expect(() => canonicalSerializeContractDto({ anything: 1 }, () => ({ later: undefined })))
      .toThrow(exactCode('CONTRACT_SCHEMA_NON_JSON_CANON'));
  });
});
