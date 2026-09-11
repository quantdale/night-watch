// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — evaluation receipt matrix (SPEC §20, §21, §36).
//
// Required receipts: PASS, ANOMALY, NOT_APPLICABLE, NO_EXPECTATION,
// EXPECTATION_SOURCE_STALE, EXPECTATION_SOURCE_UNAVAILABLE, INVALID_INPUT,
// PROJECTION_LIMIT_EXCEEDED, INTERNAL_ERROR. Every receipt: strict schema
// validation, deterministic id, no absolute path, no raw scalar, no
// arbitrary exception text. NO_EXPECTATION/STALE/UNAVAILABLE/N-A/INTERNAL
// ERROR are NEVER PASS.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  buildSemanticEvaluationReceipt,
  SEMANTIC_EVALUATION_RECEIPT_VERSION,
  SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
  SEMANTIC_RECEIPT_NON_PASS_OUTCOMES,
  SEMANTIC_RECEIPT_OUTCOMES,
  validateSemanticEvaluationReceipt,
  type SemanticEvaluationReceipt,
  type SemanticReceiptOutcome,
} from '../../src/oracles/semantic/receipts';
import {
  evaluateSemanticResolution,
  semanticOutcomeToReceiptOutcome,
} from '../../src/oracles/semantic/hook';
import {
  FIXTURE_SHA_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import type { SemanticExpectation } from '../../src/oracles/expectations';

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    oracleId: 'receipt-matrix',
    outcome: 'PASS' as const,
    targetId: 'fixture-a.common-exchange.read',
    expectationId: 'fixture-a.common-exchange.read.real-source-shape',
    projectionDigests: ['proj:sha256:0123456789abcdef01234567'],
    invariantTotal: 3,
    invariantPassCount: 3,
    invariantNaCount: 0,
    invariantViolationCount: 0,
    findingCount: 0,
    ...overrides,
  };
}

test.describe('Phase 9A.1 — receipt schema validation', () => {
  test('valid receipt passes strict validation with a deterministic id', () => {
    const receipt = buildSemanticEvaluationReceipt(baseInput());
    expect(receipt.schemaVersion).toBe(SEMANTIC_EVALUATION_RECEIPT_VERSION);
    expect(receipt.receiptId).toMatch(/^receipt:sha256:[0-9a-f]{24}$/);
    validateSemanticEvaluationReceipt(receipt);
    // Deterministic: identical inputs -> identical ids.
    expect(buildSemanticEvaluationReceipt(baseInput()).receiptId).toBe(receipt.receiptId);
  });

  test('rejected: unknown fields, bad outcome, bad id, bad digests, count sums', () => {
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), rawBody: 'x' } as never)).toThrow(/unknown-input-field/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), outcome: 'MAYBE' } as never)).toThrow(/outcome/);
    expect(() => validateSemanticEvaluationReceipt({ ...buildSemanticEvaluationReceipt(baseInput()), receiptId: 'evil' })).toThrow(/receiptId/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), projectionDigests: ['proj:sha256:zz'] })).toThrow(/projection-digest/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), invariantTotal: 3, invariantPassCount: 2, invariantNaCount: 0, invariantViolationCount: 0 })).toThrow(/count-sum/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), outcome: 'PASS', invariantTotal: 4, invariantViolationCount: 1 })).toThrow(/violations-without-anomaly/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), outcome: 'ANOMALY', findingCount: 0 })).toThrow(/anomaly-without-finding/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), outcome: 'NO_EXPECTATION' })).toThrow(/no-expectation-with-expectation-id/);
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), outcome: 'NO_EXPECTATION', expectationId: undefined, sourceProvenance: undefined })).not.toThrow();
  });

  test('the full outcome vocabulary is exactly the ten required outcomes', () => {
    expect([...SEMANTIC_RECEIPT_OUTCOMES].sort()).toEqual([
      'ANOMALY',
      'EXPECTATION_SOURCE_STALE',
      'EXPECTATION_SOURCE_UNAVAILABLE',
      'INTERNAL_ERROR',
      'INVALID_INPUT',
      'NOT_APPLICABLE',
      'NO_EXPECTATION',
      'PARTIAL_COVERAGE',
      'PASS',
      'PROJECTION_LIMIT_EXCEEDED',
    ]);
  });

  test('NO_EXPECTATION/STALE/UNAVAILABLE/NOT_APPLICABLE/INTERNAL_ERROR are never PASS', () => {
    for (const outcome of SEMICONDUCTOR_NON_PASS) {
      expect(SEMANTIC_RECEIPT_NON_PASS_OUTCOMES.has(outcome)).toBe(true);
    }
    expect(SEMANTIC_RECEIPT_NON_PASS_OUTCOMES.has('PASS')).toBe(false);
    expect(SEMANTIC_RECEIPT_NON_PASS_OUTCOMES.has('ANOMALY')).toBe(false);
  });
});

const SEMICONDUCTOR_NON_PASS: readonly SemanticReceiptOutcome[] = [
  'NO_EXPECTATION',
  'EXPECTATION_SOURCE_STALE',
  'EXPECTATION_SOURCE_UNAVAILABLE',
  'NOT_APPLICABLE',
  'INTERNAL_ERROR',
];

test.describe('Phase 9A.1 — receipt outcomes 1-9 through the evaluation core', () => {
  function expectationOf(expectationId: string): SemanticExpectation {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    const expectation = derivedA.find((item) => item.expectationId === expectationId);
    if (expectation === undefined) throw new Error(`expectation not found: ${expectationId}`);
    return expectation;
  }

  function envelopeCorpusExpectation(): SemanticExpectation {
    // Phase 9 corpus envelope expectation (ENVELOPE_CLASS with data/error
    // vocabulary) — the legitimate NOT_APPLICABLE source.
    const fs = require('node:fs');
    const path = require('node:path');
    const { deriveExpectations } = require('../../src/oracles/expectations');
    const sourceText = fs.readFileSync(
      path.join(__dirname, '..', '..', 'corpus', 'phase9', 'source-fixture', 'contracts', 'entityCatalog.ts'),
      'utf8',
    );
    const { expectations } = deriveExpectations({
      sourceText,
      provenance: {
        repoId: 'corpus/phase9/source-fixture',
        sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        relativePath: 'contracts/entityCatalog.ts',
        derivationVersion: 'nightwatch.expectation-derivation.v1',
      },
    });
    const expectation = expectations.find((item: SemanticExpectation) => item.expectationId === 'fixture.entity.read.success-envelope');
    if (expectation === undefined) throw new Error('envelope expectation not found');
    return expectation;
  }

  const EXPECTATION_ID = 'fixture-a.common-exchange.read.real-source-shape';
  const SNAPSHOT = { repoId: 'corpus/phase9a1/repo-a', sha: FIXTURE_SHA_A };
  const resolved = (): RealSourceResolution => ({ kind: 'RESOLVED', expectation: expectationOf(EXPECTATION_ID), sourceSnapshot: SNAPSHOT });

  test('1 — PASS receipt: conforming response, invariants pass', () => {
    const result = evaluateSemanticResolution({
      resolution: resolved(),
      rawText: JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 150 } }]),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('PASS');
    expect(result.receipt?.invariantPassCount).toBeGreaterThanOrEqual(1);
    expect(result.receipt?.findingCount).toBe(0);
    validateSemanticEvaluationReceipt(result.receipt!);
  });

  test('2 — ANOMALY receipt: root object (2xx error envelope)', () => {
    const result = evaluateSemanticResolution({
      resolution: resolved(),
      rawText: JSON.stringify({ error: { code: '1001', message: 'boom' } }),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('ANOMALY');
    expect(result.receipt?.invariantViolationCount).toBeGreaterThanOrEqual(1);
    expect(result.receipt?.findingCount).toBeGreaterThanOrEqual(1);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.findings[0]?.category).toBe('SOURCE_EXPECTATION_MISMATCH');
  });

  test('2b — ANOMALY receipt: item missing a source-required field', () => {
    const result = evaluateSemanticResolution({
      resolution: resolved(),
      rawText: JSON.stringify([{ month: '2026-01' }]), // missing exchange_rate
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('ANOMALY');
    expect(result.receipt?.findingCount).toBeGreaterThanOrEqual(1);
  });

  test('3 — NOT_APPLICABLE receipt: envelope ambiguous (both/neither envelope field)', () => {
    // An observation that cannot be classified against the contract's
    // envelope vocabulary is NOT_APPLICABLE — never an anomaly, never PASS.
    const result = evaluateSemanticResolution({
      resolution: {
        kind: 'RESOLVED',
        expectation: envelopeCorpusExpectation(),
        sourceSnapshot: { repoId: 'corpus/phase9/source-fixture', sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      },
      rawText: JSON.stringify({ data: { id: 'x' }, error: { code: '1' } }),
      targetId: 'fixture.entity.read.success-envelope',
    });
    expect(result.receipt?.outcome).toBe('NOT_APPLICABLE');
    expect(result.receipt?.invariantNaCount).toBeGreaterThanOrEqual(1);
    expect(result.receipt?.invariantPassCount).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  test('4 — NO_EXPECTATION receipt', () => {
    const result = evaluateSemanticResolution({
      resolution: { kind: 'NO_EXPECTATION', targetId: 'fixture-a.nonexistent.read' },
      rawText: JSON.stringify([{ month: '2026-01' }]),
      targetId: 'fixture-a.nonexistent.read',
    });
    expect(result.receipt?.outcome).toBe('NO_EXPECTATION');
    expect(result.receipt?.expectationId).toBeUndefined();
    expect(result.receipt?.findingCount).toBe(0);
  });

  test('5 — EXPECTATION_SOURCE_STALE receipt', () => {
    const result = evaluateSemanticResolution({
      resolution: { kind: 'SOURCE_STALE', expectation: expectationOf(EXPECTATION_ID) },
      rawText: JSON.stringify([{ month: '2026-01', exchange_rate: {} }]),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('EXPECTATION_SOURCE_STALE');
    expect(result.receipt?.expectationId).toBe(EXPECTATION_ID);
    expect(result.findings).toHaveLength(0);
  });

  test('6 — EXPECTATION_SOURCE_UNAVAILABLE receipt', () => {
    const result = evaluateSemanticResolution({
      resolution: { kind: 'SOURCE_UNAVAILABLE', expectation: expectationOf(EXPECTATION_ID) },
      rawText: JSON.stringify([{ month: '2026-01', exchange_rate: {} }]),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
  });

  test('7 — INVALID_INPUT receipt: unparseable body', () => {
    const result = evaluateSemanticResolution({
      resolution: resolved(),
      rawText: 'not json at all',
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('INVALID_INPUT');
  });

  test('8 — PROJECTION_LIMIT_EXCEEDED receipt', () => {
    // A body so deep it exceeds the projection depth budget.
    const deep: unknown[] = [];
    let cursor: unknown[] = deep;
    for (let i = 0; i < 40; i++) {
      const next: unknown[] = [];
      cursor.push(next);
      cursor = next;
    }
    const result = evaluateSemanticResolution({
      resolution: resolved(),
      rawText: JSON.stringify(deep),
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('PROJECTION_LIMIT_EXCEEDED');
  });

  test('9 — INTERNAL_ERROR receipt: privacy-contract violation (corrupt safe DTO)', () => {
    const corrupt = { ...expectationOf(EXPECTATION_ID), sourceProvenance: { ...expectationOf(EXPECTATION_ID).sourceProvenance, relativePath: '/abs/path' } };
    const result = evaluateSemanticResolution({
      resolution: { kind: 'RESOLVED', expectation: corrupt, sourceSnapshot: SNAPSHOT },
      rawText: JSON.stringify([{ month: '2026-01' }]), // violation -> finding build fails
      targetId: 'fixture-a.common-exchange.read',
    });
    expect(result.receipt?.outcome).toBe('INTERNAL_ERROR');
    expect(result.privacyViolation).toBe(true);
    expect(result.findings).toHaveLength(0);
    // The corrupt path never appears in the receipt.
    expect(JSON.stringify(result.receipt)).not.toContain('/abs/path');
  });

  test('outcome mapping is exhaustive and INTERNAL_ERROR is the defect outcome', () => {
    expect(semanticOutcomeToReceiptOutcome('PASS')).toBe('PASS');
    expect(semanticOutcomeToReceiptOutcome('ANOMALY')).toBe('ANOMALY');
    expect(semanticOutcomeToReceiptOutcome('NOT_APPLICABLE')).toBe('NOT_APPLICABLE');
    expect(semanticOutcomeToReceiptOutcome('EXPECTATION_UNAVAILABLE')).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
    expect(semanticOutcomeToReceiptOutcome('EXPECTATION_SOURCE_STALE')).toBe('EXPECTATION_SOURCE_STALE');
    expect(semanticOutcomeToReceiptOutcome('INVALID_INPUT')).toBe('INVALID_INPUT');
    expect(semanticOutcomeToReceiptOutcome('PROJECTION_LIMIT_EXCEEDED')).toBe('PROJECTION_LIMIT_EXCEEDED');
    expect(semanticOutcomeToReceiptOutcome('EXPECTATION_INVALID')).toBe('INTERNAL_ERROR');
    expect(semanticOutcomeToReceiptOutcome('something-else')).toBe('INTERNAL_ERROR');
  });

  test('no receipt ever carries raw text, exception text, or absolute paths', () => {
    const results = [
      evaluateSemanticResolution({ resolution: resolved(), rawText: JSON.stringify([{ month: '2026-01', exchange_rate: { jpy: 150 } }]), targetId: 'x' }),
      evaluateSemanticResolution({ resolution: { kind: 'NO_EXPECTATION' }, rawText: '{}', targetId: 'x' }),
      evaluateSemanticResolution({ resolution: resolved(), rawText: 'broken', targetId: 'x' }),
    ];
    for (const result of results) {
      const serialized = JSON.stringify(result.receipt);
      expect(serialized).not.toContain('2026-01');
      expect(serialized).not.toContain('jpy');
      expect(serialized).not.toContain('broken');
      // Repo-relative paths are safe metadata; ABSOLUTE paths are not.
      expect(serialized).not.toContain('/private/');
      expect(serialized).not.toContain('/etc/');
      expect(serialized).not.toContain('Error');
      expect(serialized).not.toContain('Exception');
    }
  });
});

// ---------------------------------------------------------------------------
// Group 11 (F-10) — the receipt records its evidence acceptance class.
// ---------------------------------------------------------------------------

test.describe('Group 11 — receipt acceptance class', () => {
  test('builder receipts default to LOCAL_SYNTHETIC and round-trip CONTAINED_DEV', () => {
    const synthetic = buildSemanticEvaluationReceipt(baseInput());
    expect(synthetic.acceptanceClass).toBe('LOCAL_SYNTHETIC');
    validateSemanticEvaluationReceipt(synthetic);
    const dev = buildSemanticEvaluationReceipt({ ...baseInput(), acceptanceClass: 'CONTAINED_DEV' });
    expect(dev.acceptanceClass).toBe('CONTAINED_DEV');
    validateSemanticEvaluationReceipt(dev);
    // The class participates in the deterministic identity.
    expect(dev.receiptId).not.toBe(synthetic.receiptId);
  });

  test('an unknown acceptance class is rejected', () => {
    expect(() => buildSemanticEvaluationReceipt({ ...baseInput(), acceptanceClass: 'DEV_ACCEPTED' as never })).toThrow(/acceptanceClass/);
  });

  test('v1 receipts never carry the v2 acceptance class; historical v1 bodies stay valid', () => {
    const v1WithClass = {
      ...buildSemanticEvaluationReceipt(baseInput()),
      schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
    } as unknown as SemanticEvaluationReceipt;
    expect(() => validateSemanticEvaluationReceipt(v1WithClass)).toThrow('SEMANTIC_RECEIPT_INVALID:v1-acceptance-class');
    const historical = { ...v1WithClass } as Record<string, unknown>;
    delete historical.acceptanceClass;
    expect(() => validateSemanticEvaluationReceipt(historical as unknown as SemanticEvaluationReceipt)).not.toThrow();
  });
});
