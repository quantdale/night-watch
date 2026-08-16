// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — semantic oracle + cross-step invariant unit matrix
// (SPEC §63).
//
// For each required seeded semantic class:
//   - positive defect detection (from corpus/phase9/defects),
//   - negative benign control,
//   - NOT_APPLICABLE / ambiguity case,
//   - source-unavailable / stale classification.
//
// Expectations are DERIVED from the synthetic source fixture through the
// same adapter used for real source (SPEC §32), then admitted against the
// fixture snapshot SHA.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { deriveExpectations, type SemanticExpectation } from '../../src/oracles/expectations';
import { evaluateSemanticResponse } from '../../src/oracles/semantic';
import type { SemanticEvaluationResult } from '../../src/oracles/semantic';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9');
const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const STALE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const PROVENANCE = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function loadFixtureExpectations(): Map<string, SemanticExpectation> {
  const sourceText = fs.readFileSync(path.join(CORPUS_ROOT, 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
  return new Map(expectations.map((expectation) => [expectation.expectationId, expectation]));
}

function defectBody(directory: string, file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_ROOT, 'defects', directory, file), 'utf8'));
}

const EXPECTATIONS = loadFixtureExpectations();

function expectAnomaly(result: SemanticEvaluationResult, category: string): void {
  expect(result.outcome).toBe('ANOMALY');
  expect(result.findings.length).toBeGreaterThan(0);
  for (const finding of result.findings) {
    expect(finding.category).toBe(category);
    expect(finding.severity).toBe('ANOMALY');
    expect(finding.findingId).toMatch(/^finding:sha256:[0-9a-f]{24}$/);
    expect(finding.projectionDigests.every((digest) => digest.startsWith('proj:sha256:'))).toBe(true);
    expect(finding.sourceProvenance.sha).toBe(FIXTURE_SHA);
    expect(finding.sourceProvenance.relativePath).not.toContain('/home/');
    expect(finding.sourceProvenance.relativePath).not.toContain('/tmp/');
  }
}

function runExpectation(
  expectation: SemanticExpectation,
  rawValues: readonly unknown[],
  snapshotSha: string | null = FIXTURE_SHA,
): SemanticEvaluationResult {
  return evaluateSemanticResponse({
    oracleId: 'oracle.semantic.phase9.synthetic',
    expectation,
    rawValues,
    sourceSnapshot: snapshotSha === null ? null : { repoId: PROVENANCE.repoId, sha: snapshotSha },
    journeyId: 'phase9.synthetic.journey',
    stepId: 'phase9.synthetic.step',
    operationId: expectation.targetId,
  });
}

test.describe('Phase 9 oracle — HTTP_200_ERROR_ENVELOPE', () => {
  const expectation = EXPECTATIONS.get('fixture.entity.read.success-envelope')!;

  test('defect: protocol-valid 200 error envelope is detected', () => {
    const result = runExpectation(expectation, [defectBody('http200-error-envelope', 'response.json')]);
    expectAnomaly(result, 'APPLICATION_ERROR_ENVELOPE');
  });

  test('benign control: success envelope passes', () => {
    const result = runExpectation(expectation, [{ data: { id: 'synthetic-entity-a' } }]);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('ambiguous: both envelope fields -> NOT_APPLICABLE, never an anomaly', () => {
    const result = runExpectation(expectation, [{ data: { id: 'synthetic-entity-a' }, error: { code: 'synthetic-error' } }]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });

  test('ambiguous: neither envelope field -> NOT_APPLICABLE', () => {
    const result = runExpectation(expectation, [{ id: 'synthetic-entity-a' }]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });

  test('stale source: EXPECTATION_SOURCE_STALE, no finding', () => {
    const result = runExpectation(expectation, [defectBody('http200-error-envelope', 'response.json')], STALE_SHA);
    expect(result.outcome).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.findings).toHaveLength(0);
  });

  test('unavailable source: EXPECTATION_UNAVAILABLE, no finding', () => {
    const result = runExpectation(expectation, [defectBody('http200-error-envelope', 'response.json')], null);
    expect(result.outcome).toBe('EXPECTATION_UNAVAILABLE');
    expect(result.findings).toHaveLength(0);
  });
});

test.describe('Phase 9 oracle — LIST_DETAIL_IDENTITY_MISMATCH', () => {
  const expectation = EXPECTATIONS.get('fixture.entity.list-detail.identity-consistency')!;

  test('defect: list A / detail B mismatch is detected', () => {
    const result = runExpectation(expectation, [
      defectBody('list-detail-identity-mismatch', 'list.json'),
      defectBody('list-detail-identity-mismatch', 'detail.json'),
    ]);
    expectAnomaly(result, 'LIST_DETAIL_IDENTITY_MISMATCH');
  });

  test('benign control: list A / detail A passes', () => {
    const list = { items: [{ id: 'synthetic-entity-a' }, { id: 'synthetic-entity-c' }] };
    const detail = { id: 'synthetic-entity-a', name: 'synthetic-detail' };
    const result = runExpectation(expectation, [list, detail]);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('empty list with requested detail absent -> NOT_APPLICABLE (ambiguous, no anomaly)', () => {
    const result = runExpectation(expectation, [{ items: [] }, { id: 'synthetic-entity-a' }]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });

  test('truncated collection -> NOT_APPLICABLE (membership not provable)', () => {
    const { evaluateInvariant } = require('../../src/oracles/invariants');
    const { projectValue, ProjectionContext } = require('../../src/oracles/projections');
    const { DEFAULT_PROJECTION_LIMITS } = require('../../src/oracles/projections');
    const ctx = new ProjectionContext();
    const limits = { ...DEFAULT_PROJECTION_LIMITS, maxArrayItemsInspected: 1 };
    const ctxT = new ProjectionContext(limits);
    const list = { items: [{ id: 'synthetic-entity-a' }, { id: 'synthetic-entity-b' }] };
    const detail = { id: 'synthetic-entity-b' };
    const listProjection = projectValue(list, ctxT, limits).projection;
    const detailProjection = projectValue(detail, ctxT, limits).projection;
    const invariant = expectation.invariantDefinitions[0]!;
    const evaluation = evaluateInvariant(invariant, [listProjection, detailProjection], ctxT);
    expect(evaluation.verdict).toBe('NOT_APPLICABLE');
    expect(ctx.identityCount).toBe(0);
  });
});

test.describe('Phase 9 oracle — STALE_STATE_AFTER_TRANSITION', () => {
  const expectation = EXPECTATIONS.get('fixture.stage.read.transition-change')!;

  test('defect: unchanged state under an explicit CHANGE contract is detected', () => {
    const result = runExpectation(expectation, [
      defectBody('stale-state-after-transition', 'step1.json'),
      defectBody('stale-state-after-transition', 'step2.json'),
    ]);
    expectAnomaly(result, 'STALE_STATE_AFTER_TRANSITION');
  });

  test('benign control: state actually changes -> passes', () => {
    const result = runExpectation(expectation, [{ stage: 'synthetic-stage-a' }, { stage: 'synthetic-stage-b' }]);
    expect(result.outcome).toBe('PASS');
    expect(result.findings).toHaveLength(0);
  });

  test('benign control: two equal projections under CHANGE but different non-state fields are NOT flagged by a state-scoped contract', () => {
    const result = runExpectation(expectation, [{ stage: 'synthetic-stage-a', other: 1 }, { stage: 'synthetic-stage-b', other: 2 }]);
    expect(result.outcome).toBe('PASS');
  });

  test('equal projections under a REMAIN_STABLE contract pass', () => {
    const stableExpectation = EXPECTATIONS.get('fixture.stage.read.transition-change')!;
    const remainStable = { ...stableExpectation, expectationId: 'test.stage.read.remain-stable', invariantDefinitions: [{ kind: 'SHAPE_CHANGED' as const, expectedTransition: 'REMAIN_STABLE' as const, statePath: ['stage'] }] };
    const result = runExpectation(remainStable, [{ stage: 'synthetic-stage-a' }, { stage: 'synthetic-stage-a' }]);
    expect(result.outcome).toBe('PASS');
  });

  test('UNKNOWN transition contract is never an anomaly', () => {
    const unknownContract = { ...expectation, expectationId: 'test.stage.read.unknown-transition', invariantDefinitions: [{ kind: 'SHAPE_CHANGED' as const, expectedTransition: 'UNKNOWN' as const }] };
    const result = runExpectation(unknownContract, [{ stage: 'synthetic-stage-a' }, { stage: 'synthetic-stage-a' }]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });
});

test.describe('Phase 9 oracle — AGGREGATE_TOTAL_RELATION_MISMATCH', () => {
  const expectation = EXPECTATIONS.get('fixture.aggregate.read.line-items-equal-total')!;

  test('defect: line items do not sum to the declared total', () => {
    const result = runExpectation(expectation, [defectBody('aggregate-total-relation-mismatch', 'response.json')]);
    expectAnomaly(result, 'AGGREGATE_RELATION_MISMATCH');
    expect(result.findings[0]?.relationId).toBe('line-items-equal-total');
  });

  test('benign control: valid sum passes', () => {
    const result = runExpectation(expectation, [{ lineItems: [{ amount: 1 }, { amount: 2 }, { amount: 3 }], total: 6 }]);
    expect(result.outcome).toBe('PASS');
  });

  test('decimal amounts are evaluated deterministically (fixed-point)', () => {
    const result = runExpectation(expectation, [{ lineItems: [{ amount: 0.1 }, { amount: 0.2 }], total: 0.3 }]);
    expect(result.outcome).toBe('PASS');
    const mismatch = runExpectation(expectation, [{ lineItems: [{ amount: 0.1 }, { amount: 0.2 }], total: 0.31 }]);
    expect(mismatch.outcome).toBe('ANOMALY');
  });

  test('empty collection with zero total passes; missing scalar is NOT_APPLICABLE', () => {
    expect(runExpectation(expectation, [{ lineItems: [], total: 0 }]).outcome).toBe('PASS');
    expect(runExpectation(expectation, [{ lineItems: [{ amount: 1 }] }]).outcome).toBe('NOT_APPLICABLE');
  });

  test('raw numeric operands never appear in findings', () => {
    const result = runExpectation(expectation, [{ lineItems: [{ amount: 1 }, { amount: 2 }, { amount: 3 }], total: 7 }]);
    expect(result.outcome).toBe('ANOMALY');
    for (const finding of result.findings) {
      // Safe categorical fields must never carry the operand values or the
      // operand field names.
      expect(finding.expectedClass).not.toMatch(/\d/);
      expect(finding.observedClass).not.toMatch(/\d/);
      expect(finding.relationId ?? '').not.toMatch(/\d/);
      expect(finding.category).not.toMatch(/\d/);
      expect(JSON.stringify(Object.keys(finding))).not.toContain('amount');
      expect(JSON.stringify(Object.keys(finding))).not.toContain('total');
      expect(JSON.stringify(Object.keys(finding))).not.toContain('lineItems');
      // No raw operand values anywhere outside the fixed hex-encoded
      // identity fields (findingId, digests, provenance sha).
      const safeText = JSON.stringify({
        category: finding.category,
        expectedClass: finding.expectedClass,
        observedClass: finding.observedClass,
        relationId: finding.relationId,
        expectationId: finding.expectationId,
        oracleId: finding.oracleId,
      });
      expect(safeText).not.toContain('7');
      expect(safeText).not.toContain('amount');
    }
  });
});

test.describe('Phase 9 oracle — CARDINALITY_RELATION_MISMATCH', () => {
  const expectation = EXPECTATIONS.get('fixture.collection.read.rows-equal-declared-count')!;

  test('defect: row count contradicts the declared count', () => {
    const result = runExpectation(expectation, [defectBody('cardinality-relation-mismatch', 'response.json')]);
    expectAnomaly(result, 'CARDINALITY_RELATION_MISMATCH');
    expect(result.findings[0]?.relationId).toBe('rows-equal-declared-count');
  });

  test('benign control: matching count passes', () => {
    const result = runExpectation(expectation, [{ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], meta: { expectedCount: 3 } }]);
    expect(result.outcome).toBe('PASS');
  });

  test('COUNT_GTE relation passes on equal and above', () => {
    const gte = { ...expectation, expectationId: 'test.collection.read.min-rows', invariantDefinitions: [{ kind: 'COUNT_RELATION' as const, relationId: 'rows-min', operation: 'COUNT_GTE' as const, collectionPath: ['items'], expectedCount: 2 }] };
    expect(runExpectation(gte, [{ items: [{ id: 'a' }, { id: 'b' }] }]).outcome).toBe('PASS');
    expect(runExpectation(gte, [{ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }]).outcome).toBe('PASS');
    expect(runExpectation(gte, [{ items: [{ id: 'a' }] }]).outcome).toBe('ANOMALY');
  });

  test('missing collection is NOT_APPLICABLE (never an anomaly)', () => {
    const result = runExpectation(expectation, [{ meta: { expectedCount: 3 } }]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });
});

test.describe('Phase 9 oracle — projection limit fail-closed', () => {
  test('an over-limit body yields PROJECTION_LIMIT_EXCEEDED, never a false anomaly', () => {
    const expectation = EXPECTATIONS.get('fixture.entity.read.success-envelope')!;
    const deep = { data: { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } } };
    const limits = { ...require('../../src/oracles/projections').DEFAULT_PROJECTION_LIMITS, maxDepth: 3 };
    const result = evaluateSemanticResponse({
      oracleId: 'oracle.semantic.phase9.synthetic',
      expectation,
      rawValues: [deep],
      sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
      limits,
    });
    expect(result.outcome).toBe('PROJECTION_LIMIT_EXCEEDED');
    expect(result.findings).toHaveLength(0);
  });
});
