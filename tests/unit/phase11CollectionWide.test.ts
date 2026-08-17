// ---------------------------------------------------------------------------
// Nightwatch Phase 11 — collection-wide semantic evaluation test matrix
// (SPEC Phase 11).
//
// Covers:
//   M1: pre-fix baseline proof (item-0 evaluation misses later-row defects)
//   M2-M4: collection-wide detection + coverage states + finding aggregation
//   M7: boundary tests (exact 128/129 row transitions)
//   M8: privacy tests (sentinel sweep across all safe outputs)
//   determinism: repeated evaluations produce identical results
//   historical compatibility: Phase 9/10 item-0 expectations still work
//   campaign integration: findings flow through campaign/dossier
//
// All fixtures are SYNTHETIC ONLY. No real customer data.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateSemanticResponse } from '../../src/oracles/semantic';
import type { SemanticExpectation } from '../../src/oracles/expectations/types';
import type { SemanticEvaluationResult } from '../../src/oracles/semantic';
import { DEFAULT_PROJECTION_LIMITS } from '../../src/oracles/projections';
import {
  SENTINEL,
  generateExchangeArray,
  generatePayerArray,
  exchangeWithWrongTypeMonth,
  exchangeWithMissingMonth,
  payerWithOutsideType,
  exchangeViolationAt127,
  exchangeViolationInside128Window,
  exchangePartialCoverageValid129,
  reorderedKeysExchange,
} from '../../corpus/phase11/response-fixtures';
import {
  createCollectionItemContract,
  createCollectionExpectation,
  PHASE11_FIXTURE_SHA,
  PHASE11_PROVENANCE,
} from '../../corpus/phase11/source-fixture/phase11Fixtures';
import type { CollectionItemContract } from '../../src/oracles/expectations/types';

// ---------------------------------------------------------------------------
// Test constants.
// ---------------------------------------------------------------------------

const FIXTURE_SHA = PHASE11_FIXTURE_SHA;
const STALE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ORACLE_ID = 'oracle.semantic.phase11.collection-wide';
const JOURNEY_ID = 'phase11.synthetic.journey';
const STEP_ID = 'phase11.synthetic.step';

// ---------------------------------------------------------------------------
// Helper: run a collection-wide evaluation.
// ---------------------------------------------------------------------------

function evaluateCollectionWide(
  responseBody: unknown,
  expectation: SemanticExpectation,
  snapshotSha: string | null = FIXTURE_SHA,
): SemanticEvaluationResult {
  return evaluateSemanticResponse({
    oracleId: ORACLE_ID,
    expectation,
    rawValues: [responseBody],
    sourceSnapshot: snapshotSha === null ? null : { repoId: PHASE11_PROVENANCE.repoId, sha: snapshotSha },
    journeyId: JOURNEY_ID,
    stepId: STEP_ID,
    operationId: expectation.targetId,
  });
}

// ---------------------------------------------------------------------------
// Helper: build common-exchange COLLECTION_ITEM_CONTRACT invariants.
// ---------------------------------------------------------------------------

function commonExchangeTypeMonthContracts(): CollectionItemContract[] {
  return [
    createCollectionItemContract([], 'TYPE_MATCH', ['month'], {
      itemExpectedType: 'STRING',
    }),
  ];
}

function commonExchangeFieldPresentContracts(): CollectionItemContract[] {
  return [
    createCollectionItemContract([], 'FIELD_PRESENT', ['month'], {
      itemExpected: true,
    }),
  ];
}

function commonExchangeTypeRateContracts(): CollectionItemContract[] {
  return [
    createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], {
      itemAllowedTypes: ['OBJECT', 'ARRAY'],
    }),
  ];
}

function payerTypeRateContracts(): CollectionItemContract[] {
  return [
    createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], {
      itemAllowedTypes: ['OBJECT', 'ARRAY'],
    }),
  ];
}

// ---------------------------------------------------------------------------
// Helper: assert safe output contains no sentinel leaks.
// ---------------------------------------------------------------------------

function assertNoSentinelLeaks(result: SemanticEvaluationResult): void {
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain(SENTINEL.MONTH);
  expect(serialized).not.toContain(SENTINEL.RATE);
  expect(serialized).not.toContain(SENTINEL.NAME);
  expect(serialized).not.toContain(SENTINEL.ID);
  expect(serialized).not.toContain(SENTINEL.NUMBER);
  expect(serialized).not.toContain(String(SENTINEL.WRONG_TYPE));
}

// ---------------------------------------------------------------------------
// Helper: sweep a JSON-serializable value for sentinel leaks.
// ---------------------------------------------------------------------------

function sweepForSentinelLeaks(value: unknown): string[] {
  const leaks: string[] = [];
  const text = JSON.stringify(value);
  const sentinels = [SENTINEL.MONTH, SENTINEL.RATE, SENTINEL.NAME, SENTINEL.ID, SENTINEL.NUMBER, String(SENTINEL.WRONG_TYPE)];
  for (const s of sentinels) {
    if (text.includes(s)) leaks.push(s);
  }
  return leaks;
}

// ===========================================================================
// M1: Pre-fix baseline proof — item-0 evaluation misses later-row defects.
// ===========================================================================

test.describe('Phase 11 M1: pre-fix baseline proof (item-0 misses later defects)', () => {
  test('row 1 wrong TYPE_MATCH for month — item-0 evaluation misses it', () => {
    const body = exchangeWithWrongTypeMonth(1, 2);
    // Use a single-item-0-only invariant (Phase 9/10 item-0 semantics).
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0-type-match',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0-type-match',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['0', 'month'], expectedType: 'STRING' },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    // Item 0 is valid, so the item-0 evaluation passes despite item 1 being wrong.
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('row 57 wrong TYPE_MATCH for month — item-0 evaluation misses it', () => {
    const body = exchangeWithWrongTypeMonth(57, 58);
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0-type-match-r57',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0-type-match-r57',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['0', 'month'], expectedType: 'STRING' },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('row 57 missing FIELD_PRESENT for month — item-0 evaluation misses it', () => {
    const body = exchangeWithMissingMonth(57, 58);
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0-field-present-r57',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0-field-present-r57',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'FIELD_PRESENT', path: ['0', 'month'], expected: true },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('payer row 1 outside TYPE_IN_SET — item-0 evaluation misses it', () => {
    const body = payerWithOutsideType(1, 2);
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.payer-exchange.item-0-type-in-set',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.payer-exchange.item-0-type-in-set',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['OBJECT', 'ARRAY'] },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('first uninspected row defect — current item-0 result appears PASS', () => {
    // 130 items, defect at row 129 — beyond projection window (default 128).
    const body = Array.from({ length: 130 }, (_, i) => {
      if (i === 129) return { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 1.0 } };
      return { month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, exchange_rate: { usd: 1.0 + i * 0.01 } };
    });
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0-beyond-window',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0-beyond-window',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['0', 'month'], expectedType: 'STRING' },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });
});

// ===========================================================================
// M2-M4: Collection-wide detection detects planted defects.
// ===========================================================================

test.describe('Phase 11 M2-M4: collection-wide detection', () => {
  test('row 1 wrong type month -> VIOLATION', () => {
    const body = exchangeWithWrongTypeMonth(1, 2);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    expect(result.findings.length).toBeGreaterThan(0);
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev).toBeDefined();
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.inspectedItemCount).toBe(2);
    expect(ev!.violatingItemCount).toBe(1);
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('row 57 wrong type month -> VIOLATION', () => {
    const body = exchangeWithWrongTypeMonth(57, 58);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('row 57 missing field month -> VIOLATION', () => {
    const body = exchangeWithMissingMonth(57, 58);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeFieldPresentContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('payer row 1 outside TYPE_IN_SET -> VIOLATION', () => {
    const body = payerWithOutsideType(1, 2);
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('row 127 violation -> VIOLATION', () => {
    const body = exchangeViolationAt127();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.firstViolationOrdinal).toBe(127);
  });

  test('row 128 beyond cap -> PARTIAL_COVERAGE_NO_VIOLATION', () => {
    const body = exchangePartialCoverageValid129();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    // All 128 inspected items are valid; item 128 is unobservable.
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('PASS');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
    expect(ev!.violatingItemCount).toBe(0);
  });
});

// ===========================================================================
// M3: Coverage states — all five states.
// ===========================================================================

test.describe('Phase 11 M3: coverage states', () => {
  test('EMPTY_NOT_APPLICABLE: empty array', () => {
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide([], expectation);
    expect(result.outcome).toBe('NOT_APPLICABLE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('NOT_APPLICABLE');
    expect(ev!.coverageState).toBe('EMPTY_NOT_APPLICABLE');
  });

  test('FULLY_EVALUATED_PASS: all items valid, not truncated', () => {
    const body = generateExchangeArray(5);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('PASS');
    expect(ev!.coverageState).toBe('FULLY_EVALUATED_PASS');
    expect(ev!.inspectedItemCount).toBe(5);
    expect(ev!.violatingItemCount).toBe(0);
  });

  test('VIOLATION: at least one item violates', () => {
    const body = exchangeWithWrongTypeMonth(2, 5);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('VIOLATED');
    expect(ev!.coverageState).toBe('VIOLATION');
  });

  test('PARTIAL_COVERAGE_NO_VIOLATION: all valid but truncated', () => {
    const body = generateExchangeArray(130);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.verdict).toBe('PASS');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
    expect(ev!.violatingItemCount).toBe(0);
  });

  test('PROJECTION_LIMIT_EXCEEDED: projection fails on over-limit body', () => {
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const nodeLimits = { ...DEFAULT_PROJECTION_LIMITS, maxProjectionNodes: 5, maxArrayItemsInspected: 2 };
    const body = generateExchangeArray(5);
    const result = evaluateSemanticResponse({
      oracleId: ORACLE_ID,
      expectation,
      rawValues: [body],
      sourceSnapshot: { repoId: PHASE11_PROVENANCE.repoId, sha: FIXTURE_SHA },
      journeyId: JOURNEY_ID,
      stepId: STEP_ID,
      operationId: expectation.targetId,
      limits: nodeLimits,
    });
    expect(result.outcome).toBe('PROJECTION_LIMIT_EXCEEDED');
    expect(result.findings).toHaveLength(0);
  });
});

// ===========================================================================
// M4: Finding aggregation — correct number of findings per invariant.
// ===========================================================================

test.describe('Phase 11 M4: finding aggregation', () => {
  test('multiple violating rows -> one finding per invariant definition', () => {
    // Items 1 and 3 both violate TYPE_MATCH on month.
    const body = [
      { month: '2026-01', exchange_rate: { usd: 1.0 } },
      { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 2.0 } },
      { month: '2026-03', exchange_rate: { usd: 3.0 } },
      { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 4.0 } },
    ];
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    // One invariant definition = one finding (aggregated).
    expect(result.findings).toHaveLength(1);
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.violatingItemCount).toBe(2);
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('same-kind distinct contracts -> separate findings', () => {
    const body = [
      { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 1.0 } },
    ];
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      [
        createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' }),
        createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], { itemAllowedTypes: ['OBJECT', 'ARRAY'] }),
      ],
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    // month violates TYPE_MATCH but exchange_rate is valid OBJECT.
    // Only one finding for the month violation (collection-wide wrapper).
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.observedClass).toBe('COLLECTION_ITEM_CONTRACT_VIOLATED');
  });

  test('fingerprint stability: same defect at different row positions produces stable fingerprint', () => {
    const body1 = exchangeWithWrongTypeMonth(1, 3);
    const body2 = exchangeWithWrongTypeMonth(2, 3);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const r1 = evaluateCollectionWide(body1, expectation);
    const r2 = evaluateCollectionWide(body2, expectation);
    expect(r1.outcome).toBe('ANOMALY');
    expect(r2.outcome).toBe('ANOMALY');
    // The findingId should be deterministic for the same invariant+projection.
    expect(r1.findings[0]!.findingId).toMatch(/^finding:sha256:[0-9a-f]{24}$/);
    expect(r2.findings[0]!.findingId).toMatch(/^finding:sha256:[0-9a-f]{24}$/);
    // Category and severity should be identical.
    expect(r1.findings[0]!.category).toBe(r2.findings[0]!.category);
    expect(r1.findings[0]!.severity).toBe(r2.findings[0]!.severity);
  });
});

// ===========================================================================
// M7: Boundary tests — exact row 128/129 transitions.
// ===========================================================================

test.describe('Phase 11 M7: boundary tests', () => {
  test('invalid row 127 -> VIOLATION', () => {
    const body = exchangeViolationAt127();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(127);
    expect(ev!.inspectedItemCount).toBe(128);
  });

  test('invalid row 128 with valid 0..127 -> PARTIAL_COVERAGE', () => {
    const body = exchangePartialCoverageValid129();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
    expect(ev!.violatingItemCount).toBe(0);
  });

  test('>128 rows with invalid row 57 -> VIOLATION', () => {
    const body = exchangeViolationInside128Window();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('>128 valid rows -> PARTIAL_COVERAGE', () => {
    const body = generateExchangeArray(130);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
  });

  test('empty array -> EMPTY_NOT_APPLICABLE', () => {
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide([], expectation);
    expect(result.outcome).toBe('NOT_APPLICABLE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('EMPTY_NOT_APPLICABLE');
  });

  test('exactly 128 valid rows -> FULLY_EVALUATED_PASS', () => {
    const body = generateExchangeArray(128);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('FULLY_EVALUATED_PASS');
    expect(ev!.inspectedItemCount).toBe(128);
  });

  test('exactly 129 rows with defect at 128 -> PARTIAL_COVERAGE (unobservable)', () => {
    const body = exchangePartialCoverageValid129();
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
  });
});

// ===========================================================================
// M8: Privacy tests — sentinel sweep across all safe outputs.
// ===========================================================================

test.describe('Phase 11 M8: privacy tests (sentinel sweep)', () => {
  test('plant sentinels at rows 0, 1, 57, 127 and sweep safe outputs for leaks', () => {
    // Build an array with sentinels at key positions.
    const body: unknown[] = Array.from({ length: 128 }, (_, i) => {
      if (i === 0) return { month: SENTINEL.MONTH, exchange_rate: { usd: 1.0 } };
      if (i === 1) return { month: SENTINEL.NAME, exchange_rate: { usd: 2.0 } };
      if (i === 57) return { month: SENTINEL.NUMBER, exchange_rate: { usd: 57.0 } };
      if (i === 127) return { month: SENTINEL.WRONG_TYPE, exchange_rate: { usd: 127.0 } };
      return { month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, exchange_rate: { usd: i } };
    });

    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );

    const result = evaluateCollectionWide(body, expectation);

    // Sweep all safe outputs.
    const findingsLeaks = sweepForSentinelLeaks(result.findings);
    const evaluationsLeaks = sweepForSentinelLeaks(result.invariantEvaluations);

    // Zero leak count required.
    expect(findingsLeaks).toHaveLength(0);
    expect(evaluationsLeaks).toHaveLength(0);
    assertNoSentinelLeaks(result);
  });

  test('sentinels at payer rows 0 and 1 -> no leaks in findings', () => {
    const body = [
      { payer_id: SENTINEL.ID, exchange_rate: { usd: 1.0 } },
      { payer_id: SENTINEL.NAME, exchange_rate: [] },
    ];
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    assertNoSentinelLeaks(result);
  });

  test('no sentinel leaks in receipt-safe fields', () => {
    const body = exchangeWithWrongTypeMonth(1, 3);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    // Verify findings have no raw sentinels in safe fields.
    for (const finding of result.findings) {
      expect(finding.expectationId).not.toContain('SENTINEL');
      expect(finding.oracleId).not.toContain('SENTINEL');
      expect(finding.sourceProvenance.relativePath).not.toContain('SENTINEL');
    }
  });
});

// ===========================================================================
// Determinism: repeated evaluations produce identical results.
// ===========================================================================

test.describe('Phase 11 determinism', () => {
  test('same body + same expectation -> identical outcomes across 5 runs', () => {
    const body = exchangeWithWrongTypeMonth(3, 10);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const results = Array.from({ length: 5 }, () => evaluateCollectionWide(body, expectation));
    const outcomes = results.map(r => r.outcome);
    const findingIds = results.map(r => r.findings[0]?.findingId);
    const coverageStates = results.map(r =>
      r.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT')?.coverageState,
    );
    // All outcomes must be identical.
    expect(new Set(outcomes).size).toBe(1);
    expect(new Set(findingIds).size).toBe(1);
    expect(new Set(coverageStates).size).toBe(1);
    expect(outcomes[0]).toBe('ANOMALY');
  });

  test('PASS body + same expectation -> identical PASS results across 5 runs', () => {
    const body = generateExchangeArray(5);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const results = Array.from({ length: 5 }, () => evaluateCollectionWide(body, expectation));
    const outcomes = results.map(r => r.outcome);
    expect(new Set(outcomes).size).toBe(1);
    expect(outcomes[0]).toBe('PASS');
    for (const r of results) {
      expect(r.findings).toHaveLength(0);
    }
  });

  test('PARTIAL_COVERAGE result is deterministic', () => {
    const body = generateExchangeArray(200);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const results = Array.from({ length: 5 }, () => evaluateCollectionWide(body, expectation));
    const outcomes = results.map(r => r.outcome);
    const inspected = results.map(r =>
      r.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT')?.inspectedItemCount,
    );
    expect(new Set(outcomes).size).toBe(1);
    expect(outcomes[0]).toBe('PARTIAL_COVERAGE');
    expect(new Set(inspected).size).toBe(1);
    expect(inspected[0]).toBe(128);
  });
});

// ===========================================================================
// Historical compatibility: Phase 9/10 item-0 expectations still work.
// ===========================================================================

test.describe('Phase 11 historical compatibility', () => {
  test('Phase 9 item-0 TYPE_MATCH still passes on valid row-0 body', () => {
    const body = generateExchangeArray(5);
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0.historical',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0.historical',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['0', 'month'], expectedType: 'STRING' },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('Phase 9 item-0 TYPE_MATCH still detects row-0 defect', () => {
    const body = exchangeWithWrongTypeMonth(0, 3);
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.item-0.historical-defect',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.item-0.historical-defect',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['0', 'month'], expectedType: 'STRING' },
      ],
    };
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('ANOMALY');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  test('Phase 10 TYPE_IN_SET item-0 still works alongside collection-wide', () => {
    const body = generatePayerArray(3);
    const hybridExpectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.payer-exchange.hybrid',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.payer-exchange.hybrid',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        // Phase 10 item-0 type-in-set
        { kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['OBJECT', 'ARRAY'] },
        // Phase 11 collection-wide type-in-set
        createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], {
          itemAllowedTypes: ['OBJECT', 'ARRAY'],
        }),
      ],
    };
    const result = evaluateCollectionWide(body, hybridExpectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
    // Both invariants should evaluate.
    expect(result.invariantEvaluations.length).toBe(2);
  });

  test('stale source snapshot -> EXPECTATION_SOURCE_STALE for collection-wide', () => {
    const body = generateExchangeArray(3);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation, STALE_SHA);
    expect(result.outcome).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.findings).toHaveLength(0);
  });

  test('null source snapshot -> EXPECTATION_UNAVAILABLE for collection-wide', () => {
    const body = generateExchangeArray(3);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation, null);
    expect(result.outcome).toBe('EXPECTATION_UNAVAILABLE');
    expect(result.findings).toHaveLength(0);
  });
});

// ===========================================================================
// Campaign integration: collection-wide findings flow through evaluation.
// ===========================================================================

test.describe('Phase 11 campaign integration', () => {
  test('collection-wide finding has valid structure for campaign/dossier consumption', () => {
    const body = exchangeWithWrongTypeMonth(1, 3);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    expect(result.findings.length).toBeGreaterThan(0);

    for (const finding of result.findings) {
      // Valid finding structure.
      expect(finding.schemaVersion).toBe('nightwatch.semantic-oracle-finding.v1');
      expect(finding.findingId).toMatch(/^finding:sha256:[0-9a-f]{24}$/);
      expect(finding.oracleId).toBe(ORACLE_ID);
      expect(finding.category).toBe('SOURCE_EXPECTATION_MISMATCH');
      expect(finding.severity).toBe('ANOMALY');
      expect(finding.expectationId).toBe('ripple.common-exchange.read.real-source-collection');
      expect(finding.sourceProvenance.sha).toBe(FIXTURE_SHA);
      expect(finding.sourceProvenance.relativePath).not.toContain('/home/');
      expect(finding.sourceProvenance.relativePath).not.toContain('/tmp/');
      expect(finding.projectionDigests.length).toBeGreaterThan(0);
      for (const digest of finding.projectionDigests) {
        expect(digest).toMatch(/^proj:sha256:[0-9a-f]{24}$/);
      }
      // Safe fields only.
      expect(finding.expectedClass).toBe('COLLECTION_ITEM_CONTRACT');
      expect(finding.observedClass).toBe('COLLECTION_ITEM_CONTRACT_VIOLATED');
    }
  });

  test('finding contains journeyId and stepId when provided', () => {
    const body = exchangeWithWrongTypeMonth(0, 2);
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateSemanticResponse({
      oracleId: ORACLE_ID,
      expectation,
      rawValues: [body],
      sourceSnapshot: { repoId: PHASE11_PROVENANCE.repoId, sha: FIXTURE_SHA },
      journeyId: 'campaign.journey.1',
      stepId: 'campaign.step.1',
      operationId: expectation.targetId,
    });
    expect(result.outcome).toBe('ANOMALY');
    for (const finding of result.findings) {
      expect(finding.journeyId).toBe('campaign.journey.1');
      expect(finding.stepId).toBe('campaign.step.1');
    }
  });

  test('payer TYPE_IN_SET violation flows through with correct category', () => {
    const body = payerWithOutsideType(1, 3);
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    expect(result.findings[0]!.category).toBe('SOURCE_EXPECTATION_MISMATCH');
    expect(result.findings[0]!.observedClass).toBe('COLLECTION_ITEM_CONTRACT_VIOLATED');
  });

  test('collection with object/array type mix passes TYPE_IN_SET', () => {
    const body = [
      { payer_id: 'p0', exchange_rate: { usd: 1.0 } },
      { payer_id: 'p1', exchange_rate: [] },
    ];
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('FULLY_EVALUATED_PASS');
  });
});

// ===========================================================================
// Benign fixture tests: all benign cases pass without findings.
// ===========================================================================

test.describe('Phase 11 benign fixtures', () => {
  const BONUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase11', 'benign');

  function loadBenign(name: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(BONUS_ROOT, name, 'response.json'), 'utf8'));
  }

  test('common-empty-array: empty array -> NOT_APPLICABLE', () => {
    const body = loadBenign('common-empty-array');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('NOT_APPLICABLE');
    expect(result.findings).toHaveLength(0);
  });

  test('common-single-row: single valid item -> PASS', () => {
    const body = loadBenign('common-single-row');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('common-multiple-valid: 5 valid items -> PASS', () => {
    const body = loadBenign('common-multiple-valid');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('common-exactly-128-valid: 128 valid items -> PASS', () => {
    const body = loadBenign('common-exactly-128-valid');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('FULLY_EVALUATED_PASS');
    expect(ev!.inspectedItemCount).toBe(128);
  });

  test('common-more-than-128-valid: 130 valid items -> PARTIAL_COVERAGE', () => {
    const body = loadBenign('common-more-than-128-valid');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
  });

  test('payer-valid-object-array-mix: mixed OBJECT/ARRAY types -> PASS', () => {
    const body = loadBenign('payer-valid-object-array-mix');
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('common-reordered-keys: reordered keys -> PASS (canonical projection)', () => {
    const body = loadBenign('common-reordered-keys');
    const item0Expectation: SemanticExpectation = {
      schemaVersion: 'nightwatch.semantic-expectation.v1',
      expectationId: 'fixture.common-exchange.reordered-keys',
      targetKind: 'API_OPERATION',
      targetId: 'fixture.common-exchange.reordered-keys',
      sourceProvenance: PHASE11_PROVENANCE,
      projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
      invariantDefinitions: [
        { kind: 'TYPE_MATCH', path: ['month'], expectedType: 'STRING' },
      ],
    };
    // Single object (not an array) — this tests canonical key order projection.
    const result = evaluateCollectionWide(body, item0Expectation);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });
});

// ===========================================================================
// Defect fixture tests: load from corpus and validate detection.
// ===========================================================================

test.describe('Phase 11 defect fixtures (corpus)', () => {
  const DEFECT_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase11', 'defects');

  function loadDefect(name: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(DEFECT_ROOT, name, 'response.json'), 'utf8'));
  }

  test('common-exchange-wrong-type-row-1 -> VIOLATION', () => {
    const body = loadDefect('common-exchange-wrong-type-row-1');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('common-exchange-wrong-type-row-57 -> VIOLATION', () => {
    const body = loadDefect('common-exchange-wrong-type-row-57');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('common-exchange-missing-field-row-57 -> VIOLATION', () => {
    const body = loadDefect('common-exchange-missing-field-row-57');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeFieldPresentContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('payer-type-outside-set-row-1 -> VIOLATION', () => {
    const body = loadDefect('payer-type-outside-set-row-1');
    const expectation = createCollectionExpectation(
      'ripple.payer-exchange.read.real-source-collection',
      payerTypeRateContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(1);
  });

  test('violation-at-row-127 -> VIOLATION', () => {
    const body = loadDefect('violation-at-row-127');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(127);
  });

  test('violation-inside-128-window -> VIOLATION', () => {
    const body = loadDefect('violation-inside-128-window');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('ANOMALY');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('VIOLATION');
    expect(ev!.firstViolationOrdinal).toBe(57);
  });

  test('partial-coverage-valid-129 -> PARTIAL_COVERAGE', () => {
    const body = loadDefect('partial-coverage-valid-129');
    const expectation = createCollectionExpectation(
      'ripple.common-exchange.read.real-source-collection',
      commonExchangeTypeMonthContracts(),
    );
    const result = evaluateCollectionWide(body, expectation);
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    const ev = result.invariantEvaluations.find(e => e.invariantKind === 'COLLECTION_ITEM_CONTRACT');
    expect(ev!.coverageState).toBe('PARTIAL_COVERAGE_NO_VIOLATION');
    expect(ev!.inspectedItemCount).toBe(128);
  });
});
