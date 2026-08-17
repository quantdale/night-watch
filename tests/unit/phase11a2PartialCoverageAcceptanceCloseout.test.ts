// ---------------------------------------------------------------------------
// Nightwatch Phase 11A.2 — partial-coverage acceptance-gate closeout
// permanent regression matrix (SPEC §6).
//
// Locks down the shared Phase 9B normalized acceptance path so a PARTIAL_COVERAGE
// receipt can NEVER be certified as full semantic acceptance, and proves the
// composed Phase 10B deep gate inherits that rejection. Each test is permanent:
// a regression would re-open CONFIRMED_PARTIAL_COVERAGE_ACCEPTANCE_GATE_FALSE_PASS.
//
// All fixtures are SYNTHETIC ONLY. No real customer data.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { buildSemanticEvaluationReceipt, type SemanticEvaluationReceipt } from '../../src/oracles/semantic/receipts';
import type { SourceProvenance } from '../../src/oracles/expectations/types';
import {
  comparePhase9bReplaySummaries,
  evaluatePhase9bAcceptance,
  summarizePhase9bPass,
  type Phase9bSemanticSummary,
} from '../../src/core/phase9b/summary';
import { evaluatePhase10bDeepAcceptance } from '../../src/core/phase10b/deepAcceptance';

const TARGET_ID = 'fixture.phase11a2.partial-coverage.target';
const EXPECTATION_ID = 'fixture.phase11a2.partial-coverage.expectation';
const APPROVED_SHA = 'dddddddddddddddddddddddddddddddddddddddd';
const PROVENANCE: SourceProvenance = {
  repoId: 'mobingilabs/ripple-api',
  sha: APPROVED_SHA,
  relativePath: 'fixtures/phase11a2Contracts.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
  evidenceDigest: 'ev:sha256:0123456789abcdef01234567',
};

function partialReceipt(extra: Partial<Parameters<typeof buildSemanticEvaluationReceipt>[0]> = {}): SemanticEvaluationReceipt {
  return buildSemanticEvaluationReceipt({
    oracleId: 'oracle.semantic.phase11a2',
    outcome: 'PARTIAL_COVERAGE',
    targetId: TARGET_ID,
    expectationId: EXPECTATION_ID,
    sourceProvenance: PROVENANCE,
    invariantTotal: 1,
    invariantPassCount: 1,
    invariantNaCount: 0,
    invariantViolationCount: 0,
    findingCount: 0,
    coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION',
    inspectedItemCount: 128,
    violatingItemCount: 0,
    ...extra,
  });
}

function passReceipt(extra: Partial<Parameters<typeof buildSemanticEvaluationReceipt>[0]> = {}): SemanticEvaluationReceipt {
  return buildSemanticEvaluationReceipt({
    oracleId: 'oracle.semantic.phase11a2',
    outcome: 'PASS',
    targetId: TARGET_ID,
    expectationId: EXPECTATION_ID,
    sourceProvenance: PROVENANCE,
    invariantTotal: 1,
    invariantPassCount: 1,
    invariantNaCount: 0,
    invariantViolationCount: 0,
    findingCount: 0,
    ...extra,
  });
}

function anomalyReceipt(extra: Partial<Parameters<typeof buildSemanticEvaluationReceipt>[0]> = {}): SemanticEvaluationReceipt {
  return buildSemanticEvaluationReceipt({
    oracleId: 'oracle.semantic.phase11a2',
    outcome: 'ANOMALY',
    targetId: TARGET_ID,
    expectationId: EXPECTATION_ID,
    sourceProvenance: PROVENANCE,
    invariantTotal: 1,
    invariantPassCount: 0,
    invariantNaCount: 0,
    invariantViolationCount: 1,
    findingCount: 1,
    coverageState: 'VIOLATION',
    inspectedItemCount: 1,
    violatingItemCount: 1,
    ...extra,
  });
}

function summarize(receipt: SemanticEvaluationReceipt, passId: 'first' | 'replay' = 'first'): Phase9bSemanticSummary {
  return summarizePhase9bPass({
    passId,
    receipts: [receipt],
    ledgerReceiptCount: 1,
    ledgerOverflow: false,
    findings: [],
    targetId: TARGET_ID,
  });
}

// ===========================================================================
// §6 #1: PARTIAL_COVERAGE receipt appears as partialCoverageCount = 1.
// ===========================================================================

test.describe('Phase 11A.2 §6.1: partial-coverage count is explicit', () => {
  test('PARTIAL_COVERAGE receipt populates partialCoverageCount = 1 and is not hidden', () => {
    const summary = summarize(partialReceipt());
    expect(summary.partialCoverageCount).toBe(1);
    expect(summary.passCount).toBe(0);
    expect(summary.anomalyCount).toBe(0);
    expect(summary.decisiveEvaluationCount).toBe(0);
    expect(summary.invariantPassCount).toBe(1);
  });

  test('a PASS receipt carries partialCoverageCount = 0', () => {
    const summary = summarize(passReceipt());
    expect(summary.partialCoverageCount).toBe(0);
    expect(summary.passCount).toBe(1);
  });
});

// ===========================================================================
// §6 #2: PARTIAL_COVERAGE receipt is not counted as decisive.
// ===========================================================================

test.describe('Phase 11A.2 §6.2: partial coverage is never decisive', () => {
  test('PARTIAL_COVERAGE with positive invariant-pass count is not decisive', () => {
    const summary = summarize(partialReceipt({ invariantPassCount: 5, invariantTotal: 5 }));
    expect(summary.decisiveEvaluationCount).toBe(0);
  });

  test('PASS with invariant passes is decisive; ANOMALY is decisive', () => {
    expect(summarize(passReceipt()).decisiveEvaluationCount).toBe(1);
    expect(summarize(anomalyReceipt()).decisiveEvaluationCount).toBe(1);
  });
});

// ===========================================================================
// §6 #3: evaluatePhase9bAcceptance rejects partial coverage even with
// invariantPassCount > 0.
// ===========================================================================

test.describe('Phase 11A.2 §6.3: acceptance gate rejects partial coverage', () => {
  test('gate FAILS on partial coverage even with positive invariant-pass count', () => {
    const summary = summarize(partialReceipt({ invariantPassCount: 10, invariantTotal: 10 }));
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('PARTIAL_COVERAGE'))).toBe(true);
    expect(result.failures.some((f) => f.includes('decisive evaluations < 1'))).toBe(true);
  });

  test('gate FAILS even if the partial summary also carries a valid evidence digest', () => {
    const summary = summarize(partialReceipt());
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(false);
    // The evidence digest is valid; the rejection is driven by the partial state.
    expect(summary.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
  });
});

// ===========================================================================
// §6 #4: clean PASS still passes Phase 9B acceptance.
// ===========================================================================

test.describe('Phase 11A.2 §6.4: clean PASS still passes', () => {
  test('PASS receipt satisfies the shared acceptance gate', () => {
    const summary = summarize(passReceipt());
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

// ===========================================================================
// §6 #5: ANOMALY remains eligible evaluation evidence.
// ===========================================================================

test.describe('Phase 11A.2 §6.5: ANOMALY remains decisive evidence', () => {
  test('ANOMALY receipt still satisfies the shared acceptance gate', () => {
    const summary = summarize(anomalyReceipt());
    const result = evaluatePhase9bAcceptance(summary, { expectationId: EXPECTATION_ID, approvedSha: APPROVED_SHA });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
    // ANOMALY is decisive by outcome alone (no inspected-invariant passes).
    expect(summary.decisiveEvaluationCount).toBe(1);
  });
});

// ===========================================================================
// §6 #6/#7: replay comparison on partial-count.
// ===========================================================================

test.describe('Phase 11A.2 §6.6/6.7: replay comparison on partial count', () => {
  test('replay comparison detects a FIRST/REPLAY partial-count mismatch', () => {
    const first = summarize(partialReceipt(), 'first');
    const replay = summarize(passReceipt(), 'replay');
    const comparison = comparePhase9bReplaySummaries(first, replay);
    expect(comparison.pass).toBe(false);
    expect(comparison.mismatches.some((m) => m.includes('PARTIAL_COVERAGE'))).toBe(true);
  });

  test('replay comparison accepts identical partial summaries', () => {
    const first = summarize(partialReceipt(), 'first');
    const replay = summarize(partialReceipt(), 'replay');
    const comparison = comparePhase9bReplaySummaries(first, replay);
    expect(comparison.pass).toBe(true);
    expect(comparison.mismatches).toEqual([]);
  });

  test('replay comparison accepts identical PASS summaries', () => {
    const first = summarize(passReceipt(), 'first');
    const replay = summarize(passReceipt(), 'replay');
    expect(comparePhase9bReplaySummaries(first, replay).pass).toBe(true);
  });
});

// ===========================================================================
// §6 #8: Phase 10B deep acceptance rejects a partial summary.
// ===========================================================================

test.describe('Phase 11A.2 §6.8: Phase 10B deep gate rejects partial', () => {
  test('deep acceptance FAILS on partial coverage even when invariant totals look passing', () => {
    const summary = summarize(partialReceipt());
    const result = evaluatePhase10bDeepAcceptance(summary, {
      expectationId: EXPECTATION_ID,
      approvedSha: APPROVED_SHA,
      expectedInvariantTotal: 1,
    });
    expect(result.pass).toBe(false);
    expect(result.failures.some((f) => f.includes('PARTIAL_COVERAGE'))).toBe(true);
  });

  test('deep acceptance still passes a clean full-invariant PASS', () => {
    const summary = summarize(passReceipt({ invariantPassCount: 4, invariantTotal: 4 }));
    const result = evaluatePhase10bDeepAcceptance(summary, {
      expectationId: EXPECTATION_ID,
      approvedSha: APPROVED_SHA,
      expectedInvariantTotal: 4,
    });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

// ===========================================================================
// §6 #13: no raw-value / privacy fields are introduced by the new count.
// ===========================================================================

test.describe('Phase 11A.2 §6.13: privacy — no raw values in the summary', () => {
  test('partial summary serialization contains no sentinel / raw values', () => {
    const summary = summarize(partialReceipt());
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('SENTINEL');
    expect(serialized).not.toContain('jpy');
    expect(serialized).not.toContain('/home/');
    expect(serialized).not.toContain('/tmp/');
    // The new field is present and categorical.
    expect(serialized).toContain('partialCoverageCount');
  });
});
