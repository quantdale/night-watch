// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1 (WORKSTREAM_B) — permanent unit tests for the
// unified contract-result vocabulary
// (src/oracles/expectations/lifecycle/contractResultVocabulary.ts).
//
// Coverage:
//   - exhaustive mapping matrix: EVERY member of every historical source
//     union (Phases 9–14) adapts to its specified unified category;
//   - PARTIAL producers (PARTIAL_PROOF_ONLY blocker, EVIDENCE_CHANGED_COMPATIBLE,
//     DERIVATION_VERSION_CHANGED);
//   - adapter DTO shape (version constant, verbatim sourceVocabulary/
//     sourceValue, targetId passthrough);
//   - aggregation semantics (empty fails closed, NOT_APPLICABLE floor,
//     severity ordering, common-targetId rule);
//   - privacy sentinel gate on `detail`;
//   - fail-closed behavior on unknown runtime source values.
//
// Synthetic fake values only; no raw product/customer values (privacy model).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  CONTRACT_RESULT_VOCABULARY_VERSION,
  UNIFIED_CONTRACT_RESULT_CATEGORIES,
  aggregateUnifiedContractResults,
  buildUnifiedContractResult,
  unifiedFromAnalyzerStatus,
  unifiedFromCollectionAdmissionFailure,
  unifiedFromCoverageDisposition,
  unifiedFromDerivationFailure,
  unifiedFromDriftClass,
  unifiedFromExpectationAdmissionResult,
  unifiedFromRealSourceResolution,
  type UnifiedContractResult,
  type UnifiedContractResultCategory,
} from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import type { AnalyzerStatus } from '../../src/oracles/expectations/extract/analyzer';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { ExpectationAdmissionResult } from '../../src/oracles/expectations/types';
import type { RealSourceDerivationFailure } from '../../src/oracles/expectations/recipes/types';
import type { RealSourceCollectionAdmissionFailure } from '../../src/oracles/expectations/collectionAdmission';
import type { ContractDriftClass } from '../../src/oracles/expectations/extract/contractDrift';
import type { CoverageDisposition } from '../../src/oracles/expectations/coverageInventory';

// ---------------------------------------------------------------------------
// Member rosters.
//
// Each roster object is checked with `satisfies Record<Union, true>`, so a
// missing or misspelled member breaks compilation — the runtime matrix below
// can never silently drift from the source union.
// ---------------------------------------------------------------------------

const ANALYZER_STATUS_MEMBERS = Object.keys({
  PROVEN: true,
  AMBIGUOUS: true,
  UNSUPPORTED: true,
  UNAVAILABLE: true,
} satisfies Record<AnalyzerStatus, true>) as AnalyzerStatus[];

const REAL_SOURCE_RESOLUTION_KINDS = Object.keys({
  RESOLVED: true,
  NO_EXPECTATION: true,
  SOURCE_UNAVAILABLE: true,
  SOURCE_STALE: true,
} satisfies Record<RealSourceResolution['kind'], true>) as RealSourceResolution['kind'][];

const EXPECTATION_ADMISSION_MEMBERS = Object.keys({
  EXPECTATION_ADMITTED: true,
  EXPECTATION_SOURCE_UNAVAILABLE: true,
  EXPECTATION_SOURCE_STALE: true,
  EXPECTATION_INVALID: true,
  EXPECTATION_AMBIGUOUS: true,
} satisfies Record<ExpectationAdmissionResult, true>) as ExpectationAdmissionResult[];

const DERIVATION_FAILURE_MEMBERS = Object.keys({
  SOURCE_UNAVAILABLE: true,
  SOURCE_PATH_MISSING: true,
  FUNCTION_NOT_FOUND: true,
  ACCUMULATOR_NOT_FOUND: true,
  NO_ROW_LITERAL: true,
  TOP_LEVEL_NOT_ARRAY: true,
  ITEM_KEYS_MISMATCH: true,
  ROUTE_NOT_FOUND: true,
  ROUTE_BINDING_MISMATCH: true,
  BUILDER_PUSH_NOT_FOUND: true,
  EXTRACTION_UNSUPPORTED: true,
  TYPE_FLOW_AMBIGUOUS: true,
  TYPE_FLOW_CONTRACT_MISMATCH: true,
  CONTRACT_MISMATCH: true,
} satisfies Record<RealSourceDerivationFailure, true>) as RealSourceDerivationFailure[];

const COLLECTION_ADMISSION_FAILURE_MEMBERS = Object.keys({
  COLLECTION_ADMISSION_PROOF_MISSING: true,
  COLLECTION_ADMISSION_TARGET_MISMATCH: true,
  COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH: true,
  COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT: true,
  COLLECTION_ADMISSION_UNKNOWN_TARGET: true,
  COLLECTION_ADMISSION_NOT_DERIVED: true,
  COLLECTION_ADMISSION_INVALID: true,
  COLLECTION_ADMISSION_DUPLICATE_ID: true,
} satisfies Record<RealSourceCollectionAdmissionFailure, true>) as RealSourceCollectionAdmissionFailure[];

const CONTRACT_DRIFT_CLASS_MEMBERS = Object.keys({
  EVIDENCE_UNCHANGED_SHA_MOVED: true,
  EVIDENCE_CHANGED_COMPATIBLE: true,
  EVIDENCE_CHANGED_BREAKING: true,
  DERIVATION_VERSION_CHANGED: true,
  SOURCE_STALE: true,
  SOURCE_UNAVAILABLE: true,
  CONTRACT_BECAME_AMBIGUOUS: true,
  CONTRACT_BECAME_PROVABLE: true,
  NO_APPROVED_TARGET: true,
} satisfies Record<ContractDriftClass, true>) as ContractDriftClass[];

const COVERAGE_DISPOSITION_MEMBERS = Object.keys({
  APPROVED_AND_ADMITTED: true,
  APPROVED_AND_ADMITTED_COLLECTION: true,
  APPROVED_NOT_ADMITTED_AMBIGUOUS: true,
  APPROVED_NOT_OBSERVABLE: true,
  APPROVED_SOURCE_UNAVAILABLE: true,
  APPROVED_SOURCE_STALE: true,
  APPROVED_NO_MECHANICAL_CONTRACT: true,
  NOT_APPROVED_OUT_OF_SCOPE: true,
} satisfies Record<CoverageDisposition, true>) as CoverageDisposition[];

// ---------------------------------------------------------------------------
// Specified mappings (mirror of the Phase 15 mapping tables under test).
// ---------------------------------------------------------------------------

const EXPECTED_ANALYZER_STATUS: Record<AnalyzerStatus, UnifiedContractResultCategory> = {
  PROVEN: 'PROVEN',
  AMBIGUOUS: 'AMBIGUOUS',
  UNSUPPORTED: 'UNSUPPORTED',
  UNAVAILABLE: 'UNAVAILABLE',
};

const EXPECTED_RESOLUTION_KIND: Record<RealSourceResolution['kind'], UnifiedContractResultCategory> = {
  RESOLVED: 'PROVEN',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NO_EXPECTATION: 'NOT_APPLICABLE',
};

const EXPECTED_EXPECTATION_ADMISSION: Record<ExpectationAdmissionResult, UnifiedContractResultCategory> = {
  EXPECTATION_ADMITTED: 'PROVEN',
  EXPECTATION_AMBIGUOUS: 'AMBIGUOUS',
  EXPECTATION_INVALID: 'UNSUPPORTED',
  EXPECTATION_SOURCE_STALE: 'STALE',
  EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
};

const EXPECTED_DERIVATION_FAILURE: Record<RealSourceDerivationFailure, UnifiedContractResultCategory> = {
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  TYPE_FLOW_AMBIGUOUS: 'AMBIGUOUS',
  SOURCE_PATH_MISSING: 'UNSUPPORTED',
  FUNCTION_NOT_FOUND: 'UNSUPPORTED',
  ACCUMULATOR_NOT_FOUND: 'UNSUPPORTED',
  NO_ROW_LITERAL: 'UNSUPPORTED',
  TOP_LEVEL_NOT_ARRAY: 'UNSUPPORTED',
  ITEM_KEYS_MISMATCH: 'UNSUPPORTED',
  ROUTE_NOT_FOUND: 'UNSUPPORTED',
  ROUTE_BINDING_MISMATCH: 'UNSUPPORTED',
  BUILDER_PUSH_NOT_FOUND: 'UNSUPPORTED',
  EXTRACTION_UNSUPPORTED: 'UNSUPPORTED',
  TYPE_FLOW_CONTRACT_MISMATCH: 'UNSUPPORTED',
  CONTRACT_MISMATCH: 'UNSUPPORTED',
};

const EXPECTED_COLLECTION_ADMISSION_FAILURE: Record<RealSourceCollectionAdmissionFailure, UnifiedContractResultCategory> = {
  COLLECTION_ADMISSION_PROOF_MISSING: 'UNSUPPORTED',
  COLLECTION_ADMISSION_TARGET_MISMATCH: 'UNSUPPORTED',
  COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH: 'UNSUPPORTED',
  COLLECTION_ADMISSION_UNSUPPORTED_INVARIANT: 'UNSUPPORTED',
  COLLECTION_ADMISSION_UNKNOWN_TARGET: 'NOT_APPLICABLE',
  COLLECTION_ADMISSION_NOT_DERIVED: 'UNAVAILABLE',
  COLLECTION_ADMISSION_INVALID: 'UNSUPPORTED',
  COLLECTION_ADMISSION_DUPLICATE_ID: 'UNSUPPORTED',
};

const EXPECTED_CONTRACT_DRIFT_CLASS: Record<ContractDriftClass, UnifiedContractResultCategory> = {
  EVIDENCE_UNCHANGED_SHA_MOVED: 'PROVEN',
  CONTRACT_BECAME_PROVABLE: 'PROVEN',
  EVIDENCE_CHANGED_COMPATIBLE: 'PARTIAL',
  DERIVATION_VERSION_CHANGED: 'PARTIAL',
  CONTRACT_BECAME_AMBIGUOUS: 'AMBIGUOUS',
  EVIDENCE_CHANGED_BREAKING: 'UNSUPPORTED',
  SOURCE_STALE: 'STALE',
  SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NO_APPROVED_TARGET: 'NOT_APPLICABLE',
};

const EXPECTED_COVERAGE_DISPOSITION: Record<CoverageDisposition, UnifiedContractResultCategory> = {
  APPROVED_AND_ADMITTED: 'PROVEN',
  APPROVED_AND_ADMITTED_COLLECTION: 'PROVEN',
  APPROVED_NOT_ADMITTED_AMBIGUOUS: 'AMBIGUOUS',
  APPROVED_NOT_OBSERVABLE: 'UNSUPPORTED',
  APPROVED_NO_MECHANICAL_CONTRACT: 'UNSUPPORTED',
  APPROVED_SOURCE_STALE: 'STALE',
  APPROVED_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
  NOT_APPROVED_OUT_OF_SCOPE: 'NOT_APPLICABLE',
};

/** Severity ranking under test (highest first). */
const SEVERITY_ORDER: readonly UnifiedContractResultCategory[] = [
  'UNAVAILABLE',
  'STALE',
  'UNSUPPORTED',
  'AMBIGUOUS',
  'PARTIAL',
  'PROVEN',
  'NOT_APPLICABLE',
];

function fixture(value: string, category: UnifiedContractResultCategory, targetId?: string): UnifiedContractResult {
  return buildUnifiedContractResult({
    category,
    sourceVocabulary: 'test-fixture',
    sourceValue: value,
    ...(targetId !== undefined ? { targetId } : {}),
  });
}

test('phase15 vocabulary: version constant and category list are frozen exactly', () => {
  expect(CONTRACT_RESULT_VOCABULARY_VERSION).toBe('nightwatch.contract-result-vocabulary.v1');
  expect([...UNIFIED_CONTRACT_RESULT_CATEGORIES].sort()).toEqual([
    'AMBIGUOUS',
    'NOT_APPLICABLE',
    'PARTIAL',
    'PROVEN',
    'STALE',
    'UNAVAILABLE',
    'UNSUPPORTED',
  ]);
});

test('phase15 vocabulary: analyzer-status maps every member to its specified category', () => {
  expect(ANALYZER_STATUS_MEMBERS).toHaveLength(4);
  for (const status of ANALYZER_STATUS_MEMBERS) {
    const result = unifiedFromAnalyzerStatus(status);
    expect(result.category).toBe(EXPECTED_ANALYZER_STATUS[status]);
    expect(result.sourceVocabulary).toBe('analyzer-status');
    expect(result.sourceValue).toBe(status);
  }
});

test('phase15 vocabulary: real-source-resolution maps every kind to its specified category', () => {
  expect(REAL_SOURCE_RESOLUTION_KINDS).toHaveLength(4);
  for (const kind of REAL_SOURCE_RESOLUTION_KINDS) {
    // The adapter dispatches on the discriminant only; synthetic stubs suffice.
    const resolution = { kind } as unknown as RealSourceResolution;
    const result = unifiedFromRealSourceResolution(resolution);
    expect(result.category).toBe(EXPECTED_RESOLUTION_KIND[kind]);
    expect(result.sourceVocabulary).toBe('real-source-resolution');
    expect(result.sourceValue).toBe(kind);
  }
});

test('phase15 vocabulary: expectation-admission maps every member to its specified category', () => {
  expect(EXPECTATION_ADMISSION_MEMBERS).toHaveLength(5);
  for (const member of EXPECTATION_ADMISSION_MEMBERS) {
    const result = unifiedFromExpectationAdmissionResult(member);
    expect(result.category).toBe(EXPECTED_EXPECTATION_ADMISSION[member]);
    expect(result.sourceVocabulary).toBe('expectation-admission');
    expect(result.sourceValue).toBe(member);
  }
});

test('phase15 vocabulary: derivation-failure maps all 14 members to their specified categories', () => {
  expect(DERIVATION_FAILURE_MEMBERS).toHaveLength(14);
  for (const member of DERIVATION_FAILURE_MEMBERS) {
    const result = unifiedFromDerivationFailure(member);
    expect(result.category).toBe(EXPECTED_DERIVATION_FAILURE[member]);
    expect(result.sourceVocabulary).toBe('derivation-failure');
    expect(result.sourceValue).toBe(member);
  }
});

test('phase15 vocabulary: collection-admission-failure maps all 8 members to their specified categories', () => {
  expect(COLLECTION_ADMISSION_FAILURE_MEMBERS).toHaveLength(8);
  for (const member of COLLECTION_ADMISSION_FAILURE_MEMBERS) {
    const result = unifiedFromCollectionAdmissionFailure(member);
    expect(result.category).toBe(EXPECTED_COLLECTION_ADMISSION_FAILURE[member]);
    expect(result.sourceVocabulary).toBe('collection-admission-failure');
    expect(result.sourceValue).toBe(member);
  }
});

test('phase15 vocabulary: contract-drift-class maps all 9 members to their specified categories', () => {
  expect(CONTRACT_DRIFT_CLASS_MEMBERS).toHaveLength(9);
  for (const member of CONTRACT_DRIFT_CLASS_MEMBERS) {
    const result = unifiedFromDriftClass(member);
    expect(result.category).toBe(EXPECTED_CONTRACT_DRIFT_CLASS[member]);
    expect(result.sourceVocabulary).toBe('contract-drift-class');
    expect(result.sourceValue).toBe(member);
  }
});

test('phase15 vocabulary: coverage-disposition maps all 8 members to their specified categories', () => {
  expect(COVERAGE_DISPOSITION_MEMBERS).toHaveLength(8);
  for (const member of COVERAGE_DISPOSITION_MEMBERS) {
    const result = unifiedFromCoverageDisposition(member);
    expect(result.category).toBe(EXPECTED_COVERAGE_DISPOSITION[member]);
    expect(result.sourceVocabulary).toBe('coverage-disposition');
    expect(result.sourceValue).toBe(member);
  }
});

test('phase15 vocabulary: PARTIAL producers exist and work deterministically', () => {
  // Analyzer partial proof: AMBIGUOUS + PARTIAL_PROOF_ONLY => PARTIAL ...
  expect(unifiedFromAnalyzerStatus('AMBIGUOUS', { blockerCode: 'PARTIAL_PROOF_ONLY' }).category).toBe('PARTIAL');
  // ... while plain AMBIGUOUS (no blocker) stays AMBIGUOUS ...
  expect(unifiedFromAnalyzerStatus('AMBIGUOUS').category).toBe('AMBIGUOUS');
  expect(unifiedFromAnalyzerStatus('AMBIGUOUS', { blockerCode: null }).category).toBe('AMBIGUOUS');
  // ... and the blocker never rewrites a non-AMBIGUOUS status.
  expect(unifiedFromAnalyzerStatus('PROVEN', { blockerCode: 'PARTIAL_PROOF_ONLY' }).category).toBe('PROVEN');
  // Drift-class PARTIAL producers.
  expect(unifiedFromDriftClass('EVIDENCE_CHANGED_COMPATIBLE').category).toBe('PARTIAL');
  expect(unifiedFromDriftClass('DERIVATION_VERSION_CHANGED').category).toBe('PARTIAL');
});

test('phase15 vocabulary: adapter DTO shape records version, vocabularies, values, and targetId verbatim', () => {
  const withTarget = unifiedFromCoverageDisposition('APPROVED_AND_ADMITTED', { targetId: 'ripple.billing-groups.read' });
  expect(withTarget.resultVersion).toBe(CONTRACT_RESULT_VOCABULARY_VERSION);
  expect(withTarget.resultVersion).toBe('nightwatch.contract-result-vocabulary.v1');
  expect(withTarget.category).toBe('PROVEN');
  expect(withTarget.sourceVocabulary).toBe('coverage-disposition');
  expect(withTarget.sourceValue).toBe('APPROVED_AND_ADMITTED');
  expect(withTarget.targetId).toBe('ripple.billing-groups.read');

  const withoutTarget = unifiedFromDerivationFailure('CONTRACT_MISMATCH');
  expect(withoutTarget.targetId).toBeUndefined();
  expect(withoutTarget.detail).toBeUndefined();

  // The analyzer adapter records its fixed blocker vocabulary as sanitized
  // categorical detail.
  const blocked = unifiedFromAnalyzerStatus('AMBIGUOUS', { blockerCode: 'DYNAMIC_KEY_FLOW' });
  expect(blocked.detail).toBe('DYNAMIC_KEY_FLOW');
  expect(blocked.category).toBe('AMBIGUOUS');
});

test('phase15 aggregation: empty input fails closed', () => {
  expect(() => aggregateUnifiedContractResults([])).toThrow('UNIFIED_RESULT_AGGREGATION_EMPTY');
});

test('phase15 aggregation: all-NOT_APPLICABLE aggregates to NOT_APPLICABLE', () => {
  const aggregate = aggregateUnifiedContractResults([
    fixture('a', 'NOT_APPLICABLE'),
    fixture('b', 'NOT_APPLICABLE'),
  ]);
  expect(aggregate.category).toBe('NOT_APPLICABLE');
  expect(aggregate.sourceVocabulary).toBe('unified-aggregate');
  expect(aggregate.sourceValue).toBe('NOT_APPLICABLE');
  expect(aggregate.resultVersion).toBe(CONTRACT_RESULT_VOCABULARY_VERSION);
});

test('phase15 aggregation: NOT_APPLICABLE is ignored whenever any stronger category is present', () => {
  expect(aggregateUnifiedContractResults([fixture('a', 'NOT_APPLICABLE'), fixture('b', 'PROVEN')]).category).toBe('PROVEN');
  expect(aggregateUnifiedContractResults([fixture('a', 'STALE'), fixture('b', 'NOT_APPLICABLE')]).category).toBe('STALE');
});

test('phase15 aggregation: severity ordering holds across every pair', () => {
  for (let i = 0; i < SEVERITY_ORDER.length; i++) {
    for (let j = i + 1; j < SEVERITY_ORDER.length; j++) {
      const stronger = SEVERITY_ORDER[i]!;
      const weaker = SEVERITY_ORDER[j]!;
      const aggregate = aggregateUnifiedContractResults([fixture('w', weaker), fixture('s', stronger)]);
      expect(aggregate.category).toBe(stronger);
    }
  }
  // Named spot-checks from the specification.
  expect(aggregateUnifiedContractResults([fixture('p', 'PROVEN'), fixture('s', 'STALE')]).category).toBe('STALE');
  const everything = SEVERITY_ORDER.map((c, idx) => fixture(`v${idx}`, c));
  expect(aggregateUnifiedContractResults(everything).category).toBe('UNAVAILABLE');
});

test('phase15 aggregation: common targetId survives only when every input shares it', () => {
  const allSame = aggregateUnifiedContractResults([
    fixture('a', 'PROVEN', 'ripple.billing-groups.read'),
    fixture('b', 'STALE', 'ripple.billing-groups.read'),
  ]);
  expect(allSame.targetId).toBe('ripple.billing-groups.read');

  const oneMissing = aggregateUnifiedContractResults([
    fixture('a', 'PROVEN', 'ripple.billing-groups.read'),
    fixture('b', 'STALE'),
  ]);
  expect(oneMissing.targetId).toBeUndefined();

  const conflicting = aggregateUnifiedContractResults([
    fixture('a', 'PROVEN', 'ripple.billing-groups.read'),
    fixture('b', 'STALE', 'ripple.users.read'),
  ]);
  expect(conflicting.targetId).toBeUndefined();

  const singleWithout = aggregateUnifiedContractResults([fixture('a', 'AMBIGUOUS')]);
  expect(singleWithout.targetId).toBeUndefined();
});

test('phase15 privacy: detail carrying a bearer token fails closed with the exact code', () => {
  expect(() =>
    buildUnifiedContractResult({
      category: 'PROVEN',
      sourceVocabulary: 'analyzer-status',
      sourceValue: 'PROVEN',
      detail: 'Bearer abc',
    }),
  ).toThrow('UNIFIED_RESULT_PRIVACY_SENTINEL_REJECTED:detail');
});

test('phase15 privacy: detail carrying an AWS access key id fails closed with the exact code', () => {
  expect(() =>
    buildUnifiedContractResult({
      category: 'UNSUPPORTED',
      sourceVocabulary: 'derivation-failure',
      sourceValue: 'SOURCE_PATH_MISSING',
      detail: 'AKIAIOSFODNN7EXAMPLE',
    }),
  ).toThrow('UNIFIED_RESULT_PRIVACY_SENTINEL_REJECTED:detail');
});

test('phase15 privacy: clean categorical detail passes through unchanged', () => {
  const result = buildUnifiedContractResult({
    category: 'PARTIAL',
    sourceVocabulary: 'analyzer-status',
    sourceValue: 'AMBIGUOUS',
    detail: 'partial proof only',
    targetId: 'ripple.billing-groups.read',
  });
  expect(result.detail).toBe('partial proof only');
  expect(result.category).toBe('PARTIAL');
});

test('phase15 vocabulary: unknown runtime source values fail closed with the exact coded error', () => {
  expect(() => unifiedFromDerivationFailure('TOTALLY_UNKNOWN' as RealSourceDerivationFailure)).toThrow(
    'UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE:derivation-failure:TOTALLY_UNKNOWN',
  );
  expect(() => unifiedFromCoverageDisposition('BOGUS_DISPOSITION' as CoverageDisposition)).toThrow(
    'UNIFIED_RESULT_UNSUPPORTED_SOURCE_VALUE:coverage-disposition:BOGUS_DISPOSITION',
  );
});
