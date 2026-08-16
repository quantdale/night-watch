// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — fixed corpus precision report (SPEC Phase 10A §26,
// §27, §45).
//
// The FIXED matrix: 4 seeded deep defects (raw bodies from
// corpus/phase10/defects) evaluated against (a) the HISTORICAL shape-only
// v1 expectations (baseline — must detect 0) and (b) the Phase 10 enriched
// v2 expectations (must detect 4/4); plus 10 benign cases (0 false
// positives). Raw counts only — no invented precision claims.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { SemanticExpectation } from '../../src/oracles/expectations';
import { evaluateSemanticResponse } from '../../src/oracles/semantic';
import { CURRENT_RIPPLE_API_SHA, deriveArchivedBaselineExpectations, derivePhase10FixtureExpectations } from '../../corpus/phase10/source-fixture/phase10Fixtures';

const CORPUS_ROOT = path.join(__dirname, '..', '..', 'corpus', 'phase10');
const DEEP_SOURCE = { repoId: 'corpus/phase10/repo-a', sha: 'cccccccccccccccccccccccccccccccccccccccc' };

function readBody(...segments: string[]): unknown {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_ROOT, ...segments), 'utf8'));
}

interface SeededDefect {
  readonly name: string;
  readonly targetId: string;
  readonly expectationId: string;
  readonly rawValues: readonly unknown[];
  readonly phase10Expectation: SemanticExpectation;
  readonly baselineExpectation: SemanticExpectation;
}

function buildDefects(
  deep: Map<string, SemanticExpectation>,
  baseline: Map<string, SemanticExpectation>,
): SeededDefect[] {
  const rows: SeededDefect[] = [];
  const perTarget: Record<string, string[]> = {
    'fixture-10.common-exchange.read': ['type-string', 'type-empty-array'],
    'fixture-10.payer-exchange.read': ['type-number', 'type-string'],
  };
  for (const [target, defects] of Object.entries(perTarget)) {
    const dir = target.includes('common') ? 'common-exchange' : 'payer-exchange';
    const deepExp = deep.get(target)!;
    const baselineId = target.replace('fixture-10', 'ripple').replace('real-source-deep', 'real-source-shape');
    const baseExp = baseline.get(baselineId);
    if (baseExp === undefined) throw new Error(`missing baseline expectation ${baselineId}`);
    for (const defect of defects) {
      const dirName = `${dir}-${defect}`;
      rows.push({
        name: dirName,
        targetId: target,
        expectationId: deepExp.expectationId,
        rawValues: [readBody('defects', dirName, 'response.json')],
        phase10Expectation: deepExp,
        baselineExpectation: baseExp,
      });
    }
  }
  return rows;
}

function evaluate(expectation: SemanticExpectation, rawValues: readonly unknown[]) {
  return evaluateSemanticResponse({
    oracleId: expectation.expectationId,
    expectation,
    rawValues,
    sourceSnapshot: DEEP_SOURCE,
    operationId: expectation.targetId,
  });
}

const DEEP = new Map(derivePhase10FixtureExpectations().derived.map((item) => [item.expectation.targetId, item.expectation]));
const BASELINE = new Map(deriveArchivedBaselineExpectations().derived.map((item) => [item.expectation.targetId, item.expectation]));
const DEFECTS = buildDefects(DEEP, BASELINE);

test.describe('Phase 10A — baseline vs enriched detection (the load-bearing proof, §26)', () => {
  test('seeded deep defect count N and per-class wiring are fixed', () => {
    expect(DEFECTS.map((defect) => defect.name).sort()).toEqual([
      'common-exchange-type-empty-array',
      'common-exchange-type-string',
      'payer-exchange-type-number',
      'payer-exchange-type-string',
    ]);
    expect(DEFECTS).toHaveLength(4);
  });

  test('the historical shape-only baseline detects 0/4 deep defects', () => {
    const baselineDetections = DEFECTS.filter((defect) => evaluate(defect.baselineExpectation, defect.rawValues).outcome === 'ANOMALY');
    expect(baselineDetections).toHaveLength(0);
  });

  test('the Phase 10 enriched expectations detect 4/4 deep defects', () => {
    const phase10Detections = DEFECTS.filter((defect) => evaluate(defect.phase10Expectation, defect.rawValues).outcome === 'ANOMALY');
    expect(phase10Detections).toHaveLength(4);
  });

  test('every Phase 10 detection is a safe semantic finding with categorical metadata', () => {
    for (const defect of DEFECTS) {
      const result = evaluate(defect.phase10Expectation, defect.rawValues);
      expect(result.outcome).toBe('ANOMALY');
      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      for (const finding of result.findings) {
        expect(finding.expectationId).toBe(defect.expectationId);
        expect(finding.expectedClass).toMatch(/^TYPE_(MATCH|IN_SET)$/);
        expect(finding.observedClass).toBe('TYPE_CONTRADICTED');
        expect(finding.category).toBe('SOURCE_EXPECTATION_MISMATCH');
        expect(finding.projectionDigests.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('baselineDeepDefectDetections=0, phase10DeepDefectDetections=4 (raw counts)', () => {
    const baselineDetections = DEFECTS.filter((defect) => evaluate(defect.baselineExpectation, defect.rawValues).outcome === 'ANOMALY').length;
    const phase10Detections = DEFECTS.filter((defect) => evaluate(defect.phase10Expectation, defect.rawValues).outcome === 'ANOMALY').length;
    expect(baselineDetections).toBe(0);
    expect(phase10Detections).toBe(4);
    expect(phase10Detections).toBeGreaterThan(baselineDetections);
  });
});

test.describe('Phase 10A — benign corpus: 0 false positives (§27, §28)', () => {
  const benignCases: { name: string; targetId: string; rawValues: readonly unknown[] }[] = [
    { name: 'common-empty-top-level', targetId: 'fixture-10.common-exchange.read', rawValues: [readBody('benign', 'common-empty-top-level', 'response.json')] },
    { name: 'common-empty-object', targetId: 'fixture-10.common-exchange.read', rawValues: [readBody('benign', 'common-empty-object', 'response.json')] },
    { name: 'common-single-key', targetId: 'fixture-10.common-exchange.read', rawValues: [readBody('benign', 'common-single-key', 'response.json')] },
    { name: 'common-multi-key', targetId: 'fixture-10.common-exchange.read', rawValues: [readBody('benign', 'common-multi-key', 'response.json')] },
    { name: 'common-reordered-keys', targetId: 'fixture-10.common-exchange.read', rawValues: [readBody('benign', 'common-reordered-keys', 'response.json')] },
    { name: 'payer-empty-array', targetId: 'fixture-10.payer-exchange.read', rawValues: [readBody('benign', 'payer-empty-array', 'response.json')] },
    { name: 'payer-empty-object', targetId: 'fixture-10.payer-exchange.read', rawValues: [readBody('benign', 'payer-empty-object', 'response.json')] },
    { name: 'payer-multi-key', targetId: 'fixture-10.payer-exchange.read', rawValues: [readBody('benign', 'payer-multi-key', 'response.json')] },
    { name: 'payer-mixed-rows', targetId: 'fixture-10.payer-exchange.read', rawValues: [readBody('benign', 'payer-mixed-rows', 'response.json')] },
    { name: 'payer-empty-top-level', targetId: 'fixture-10.payer-exchange.read', rawValues: [readBody('benign', 'payer-empty-top-level', 'response.json')] },
  ];

  test('benign corpus size is fixed at 10', () => {
    expect(benignCases).toHaveLength(10);
  });

  test('zero false positives on the fixed benign corpus', () => {
    let falsePositives = 0;
    for (const benign of benignCases) {
      const expectation = DEEP.get(benign.targetId)!;
      const result = evaluate(expectation, benign.rawValues);
      if (result.outcome === 'ANOMALY') {
        falsePositives += 1;
        expect(result.findings, `false positive on ${benign.name}`).toEqual([]);
      }
      // Empty top-level arrays are legitimately NOT_APPLICABLE for the item
      // checks (ambiguity) while the root ARRAY contract PASSes.
      expect(result.outcome === 'ANOMALY').toBe(false);
    }
    expect(falsePositives).toBe(0);
  });

  test('the payer valid empty-ARRAY representation PASSes the combined contract (§28)', () => {
    const expectation = DEEP.get('fixture-10.payer-exchange.read')!;
    const result = evaluate(expectation, [readBody('benign', 'payer-empty-array', 'response.json')]);
    expect(result.outcome).not.toBe('ANOMALY');
    const typeEvaluation = result.invariantEvaluations.find((evaluation) => evaluation.invariantKind === 'TYPE_IN_SET');
    expect(typeEvaluation?.verdict).toBe('PASS');
  });
});
