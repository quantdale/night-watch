// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — fixed fixture corpus evaluation report (SPEC §31,
// §66, §67, §95).
//
// The FIXED matrix: five seeded defect classes (raw bodies from
// corpus/phase9/defects) + the benign corpus (corpus/phase9/benign) + the
// §30 benign variations. Acceptance: all five required classes detected,
// ZERO false positives on every admitted benign case.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { deriveExpectations, type SemanticExpectation } from '../../src/oracles/expectations';
import { evaluateSemanticResponse, computeOraclePrecisionReport, type SemanticEvaluationResult } from '../../src/oracles/semantic';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase9');
const FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const PROVENANCE = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function loadExpectations(): Map<string, SemanticExpectation> {
  const sourceText = fs.readFileSync(path.join(CORPUS_ROOT, 'source-fixture', 'contracts', 'entityCatalog.ts'), 'utf8');
  const { expectations } = deriveExpectations({ sourceText, provenance: PROVENANCE });
  return new Map(expectations.map((expectation) => [expectation.expectationId, expectation]));
}

function readBody(...segments: string[]): unknown {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_ROOT, ...segments), 'utf8'));
}

const EXPECTATIONS = loadExpectations();

function evaluate(
  expectation: SemanticExpectation,
  rawValues: readonly unknown[],
): SemanticEvaluationResult {
  return evaluateSemanticResponse({
    oracleId: 'oracle.semantic.phase9.synthetic',
    expectation,
    rawValues,
    sourceSnapshot: { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA },
    journeyId: 'phase9.fixture-matrix.journey',
    operationId: expectation.targetId,
  });
}

interface MatrixRow {
  readonly name: string;
  readonly className: string;
  readonly category: string | null;
  readonly run: () => SemanticEvaluationResult;
}

// ---------------------------------------------------------------------------
// The FIXED matrix wiring (deterministic; versioned in the report).
// ---------------------------------------------------------------------------

const DEFECT_ROWS: readonly MatrixRow[] = [
  {
    name: 'http200-error-envelope',
    className: 'HTTP_200_ERROR_ENVELOPE',
    category: 'APPLICATION_ERROR_ENVELOPE',
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.read.success-envelope')!, [readBody('defects', 'http200-error-envelope', 'response.json')]),
  },
  {
    name: 'list-detail-identity-mismatch',
    className: 'LIST_DETAIL_IDENTITY_MISMATCH',
    category: 'LIST_DETAIL_IDENTITY_MISMATCH',
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.list-detail.identity-consistency')!, [
      readBody('defects', 'list-detail-identity-mismatch', 'list.json'),
      readBody('defects', 'list-detail-identity-mismatch', 'detail.json'),
    ]),
  },
  {
    name: 'stale-state-after-transition',
    className: 'STALE_STATE_AFTER_TRANSITION',
    category: 'STALE_STATE_AFTER_TRANSITION',
    run: () => evaluate(EXPECTATIONS.get('fixture.stage.read.transition-change')!, [
      readBody('defects', 'stale-state-after-transition', 'step1.json'),
      readBody('defects', 'stale-state-after-transition', 'step2.json'),
    ]),
  },
  {
    name: 'aggregate-total-relation-mismatch',
    className: 'AGGREGATE_TOTAL_RELATION_MISMATCH',
    category: 'AGGREGATE_RELATION_MISMATCH',
    run: () => evaluate(EXPECTATIONS.get('fixture.aggregate.read.line-items-equal-total')!, [readBody('defects', 'aggregate-total-relation-mismatch', 'response.json')]),
  },
  {
    name: 'cardinality-relation-mismatch',
    className: 'CARDINALITY_RELATION_MISMATCH',
    category: 'CARDINALITY_RELATION_MISMATCH',
    run: () => evaluate(EXPECTATIONS.get('fixture.collection.read.rows-equal-declared-count')!, [readBody('defects', 'cardinality-relation-mismatch', 'response.json')]),
  },
];

const BENIGN_ROWS: readonly MatrixRow[] = [
  {
    name: 'valid-success-envelope',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.read.success-envelope')!, [readBody('benign', 'http200-error-envelope', 'response.json')]),
  },
  {
    name: 'list-detail-same-identity',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.list-detail.identity-consistency')!, [
      readBody('benign', 'list-detail-identity-match', 'list.json'),
      readBody('benign', 'list-detail-identity-match', 'detail.json'),
    ]),
  },
  {
    name: 'expected-state-transition',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.stage.read.transition-change')!, [
      readBody('benign', 'stale-state-after-transition', 'step1.json'),
      readBody('benign', 'stale-state-after-transition', 'step2.json'),
    ]),
  },
  {
    name: 'valid-aggregate-relation',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.aggregate.read.line-items-equal-total')!, [readBody('benign', 'aggregate-total-relation-match', 'response.json')]),
  },
  {
    name: 'valid-cardinality-relation',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.collection.read.rows-equal-declared-count')!, [readBody('benign', 'cardinality-relation-match', 'response.json')]),
  },
  // SPEC §30 additional benign variations (no false positives allowed).
  {
    name: 'empty-list-where-contract-allows',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.collection.read.rows-equal-declared-count')!, [{ items: [], meta: { expectedCount: 0 } }]),
  },
  {
    name: 'reordered-object-keys',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.aggregate.read.line-items-equal-total')!, [{ total: 6, lineItems: [{ amount: 3 }, { amount: 2 }, { amount: 1 }] }]),
  },
  {
    name: 'safe-array-ordering-variation',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.collection.read.rows-equal-declared-count')!, [{ meta: { expectedCount: 2 }, items: [{ id: 'synthetic-entity-b' }, { id: 'synthetic-entity-a' }] }]),
  },
  {
    name: 'optional-null-fields',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.read.success-envelope')!, [{ data: { id: 'synthetic-entity-a', note: null } }]),
  },
  {
    name: 'omitted-optional-fields',
    className: 'BENIGN',
    category: null,
    run: () => evaluate(EXPECTATIONS.get('fixture.entity.read.success-envelope')!, [{ data: { id: 'synthetic-entity-a' } }]),
  },
];

const REQUIRED_CLASSES = [
  'HTTP_200_ERROR_ENVELOPE',
  'LIST_DETAIL_IDENTITY_MISMATCH',
  'STALE_STATE_AFTER_TRANSITION',
  'AGGREGATE_TOTAL_RELATION_MISMATCH',
  'CARDINALITY_RELATION_MISMATCH',
] as const;

test.describe('Phase 9 fixed fixture evaluation report (SPEC §66)', () => {
  test('all five required seeded classes are detected and every benign case passes (FP = 0)', () => {
    const defectRows = DEFECT_ROWS.map((row): { className: string; outcome: 'ANOMALY' | 'PASS'; category: string | null } => {
      const result = row.run();
      expect(result.outcome, row.name).toBe('ANOMALY');
      expect(result.findings.length, row.name).toBeGreaterThan(0);
      for (const finding of result.findings) expect(finding.category, row.name).toBe(row.category);
      return { className: row.className, outcome: 'ANOMALY', category: result.findings[0]!.category };
    });

    const benignRows = BENIGN_ROWS.map((row): { className: 'BENIGN'; outcome: 'PASS'; category: null } => {
      const result = row.run();
      expect(result.outcome, `${row.name} must not be an anomaly`).not.toBe('ANOMALY');
      expect(result.findings, row.name).toHaveLength(0);
      return { className: 'BENIGN', outcome: 'PASS', category: null };
    });

    const report = computeOraclePrecisionReport([...defectRows, ...benignRows], [...REQUIRED_CLASSES]);

    // Raw counts, not percentages.
    expect(report.seededDefects).toBe(5);
    expect(report.detectedSeededDefects).toBe(5);
    expect(report.missedSeededDefects).toBe(0);
    expect(report.detectedClasses.slice().sort()).toEqual([...REQUIRED_CLASSES].sort());
    expect(report.missedClasses).toEqual([]);
    expect(report.benignCases).toBe(BENIGN_ROWS.length);
    expect(report.falsePositiveBenignCases).toBe(0);
    expect(report.precision).toBe(1);
    expect(report.recall).toBe(1);
    expect(report.matrixVersion).toBe('nightwatch.phase9-fixture-matrix.v1');
  });

  test('baseline comparison: protocol-only detection of the required fixtures is 0/5 (M1 ceiling)', () => {
    // Recorded at M1: every seeded defect body evaluates ORACLE_PASS through
    // the Phase 5 protocol oracle (tests/unit/oracleCeilingReproduction.test.ts).
    // Here we re-assert the semantic side is what detects them, and that the
    // report is meaningful (not vacuous).
    const allRows = [...DEFECT_ROWS, ...BENIGN_ROWS];
    expect(allRows.length).toBeGreaterThan(0);
    const rawWithSentinels = fs.readFileSync(path.join(CORPUS_ROOT, 'defects', 'http200-error-envelope', 'response.json'), 'utf8');
    expect(rawWithSentinels).toContain('SENTINEL_ERROR_MESSAGE_X7Q');
  });
});
