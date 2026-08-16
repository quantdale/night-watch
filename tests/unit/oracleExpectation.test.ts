// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — expectation DTO/validator/provenance unit matrix
// (SPEC §62) + synthetic source fixture derivation determinism (§32).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PROJECTION_LIMITS } from '../../src/oracles/projections';
import {
  SEMANTIC_EXPECTATION_VERSION,
  admitExpectation,
  deriveExpectations,
  resolveExpectationFreshness,
  validateExpectation,
  validateExpectationBatch,
  type SemanticExpectation,
  type SourceProvenance,
} from '../../src/oracles/expectations';

const FIXTURE_SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FIXTURE_SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const PROVENANCE: SourceProvenance = {
  repoId: 'corpus/phase9/source-fixture',
  sha: FIXTURE_SHA_A,
  relativePath: 'contracts/entityCatalog.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

function validExpectation(overrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: SEMANTIC_EXPECTATION_VERSION,
    expectationId: 'test.expectation.valid',
    targetKind: 'API_OPERATION',
    targetId: 'ripple.synthetic.entity.read',
    sourceProvenance: PROVENANCE,
    projectionContract: { limits: {} },
    invariantDefinitions: [
      { kind: 'ENVELOPE_CLASS', expected: 'SUCCESS_ENVELOPE', successField: ['data'], errorField: ['error'] },
    ],
    ...overrides,
  };
}

const SNAPSHOT = { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA_A };

test.describe('Phase 9 expectations — admission and validation', () => {
  test('1: a valid source-backed expectation is admitted', () => {
    const expectation = validateExpectation(validExpectation());
    expect(expectation.expectationId).toBe('test.expectation.valid');
    const admission = admitExpectation(validExpectation(), SNAPSHOT);
    expect(admission.result).toBe('EXPECTATION_ADMITTED');
    expect(admission.expectation).not.toBeNull();
  });

  test('2: missing provenance is rejected', () => {
    const invalid = validExpectation();
    delete (invalid as Record<string, unknown>)['sourceProvenance'];
    expect(() => validateExpectation(invalid)).toThrowError('SEMANTIC_EXPECTATION_INVALID');
    expect(() => validateExpectation(invalid)).toThrowError('sourceProvenance');
  });

  test('3: wrong SHA format is rejected', () => {
    const invalid = validExpectation({ sourceProvenance: { ...PROVENANCE, sha: 'not-a-sha' } });
    expect(() => validateExpectation(invalid)).toThrowError('sha-malformed');
  });

  test('4: source missing -> unavailable (no anomaly)', () => {
    const admission = admitExpectation(validExpectation(), null);
    expect(admission.result).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
    // A different repo id is also unavailable.
    const otherRepo = admitExpectation(validExpectation(), { repoId: 'other/repo', sha: FIXTURE_SHA_A });
    expect(otherRepo.result).toBe('EXPECTATION_SOURCE_UNAVAILABLE');
  });

  test('5: source advanced -> stale, fail-closed', () => {
    const admission = admitExpectation(validExpectation(), { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA_B });
    expect(admission.result).toBe('EXPECTATION_SOURCE_STALE');
    expect(resolveExpectationFreshness(admission.expectation!, { repoId: PROVENANCE.repoId, sha: FIXTURE_SHA_B })).toBe('EXPECTATION_SOURCE_STALE');
    expect(resolveExpectationFreshness(admission.expectation!, SNAPSHOT)).toBe('EXPECTATION_SOURCE_CURRENT');
  });

  test('6: duplicate expectation IDs are rejected', () => {
    expect(() => validateExpectationBatch([validExpectation(), validExpectation()])).toThrowError('duplicate-expectation-id');
  });

  test('7: unknown invariant kind is rejected', () => {
    const invalid = validExpectation({
      invariantDefinitions: [{ kind: 'EXECUTE_ARBITRARY_CODE', path: ['x'] }],
    });
    expect(() => validateExpectation(invalid)).toThrowError('kind-unsupported');
  });

  test('8: unbounded relations are rejected (no bound / too many invariants)', () => {
    const noBound = validExpectation({
      invariantDefinitions: [{ kind: 'CARDINALITY_MATCH', path: ['items'] }],
    });
    expect(() => validateExpectation(noBound)).toThrowError('no-bound');
    const tooMany = validExpectation({
      invariantDefinitions: Array.from({ length: 33 }, (_, i) => ({
        kind: 'FIELD_PRESENT',
        path: ['field' + i],
        expected: true,
      })),
    });
    expect(() => validateExpectation(tooMany)).toThrowError('invariantDefinitions-unbounded');
  });

  test('9: path traversal is rejected', () => {
    const invalid = validExpectation({
      sourceProvenance: { ...PROVENANCE, relativePath: '../../outside/contract.ts' },
    });
    expect(() => validateExpectation(invalid)).toThrowError('relativePath-escape');
    const wildcardPath = validExpectation({
      invariantDefinitions: [{ kind: 'FIELD_PRESENT', path: ['items', '*'], expected: true }],
    });
    expect(() => validateExpectation(wildcardPath)).toThrowError('wildcard-or-traversal');
    const deepPath = validExpectation({
      invariantDefinitions: [{ kind: 'FIELD_PRESENT', path: Array.from({ length: 17 }, (_, i) => `f${i}`), expected: true }],
    });
    expect(() => validateExpectation(deepPath)).toThrowError('too-deep');
  });

  test('10: prototype-key segments are rejected', () => {
    for (const bad of ['__proto__', 'constructor', 'prototype']) {
      const invalid = validExpectation({
        invariantDefinitions: [{ kind: 'FIELD_PRESENT', path: ['data', bad], expected: true }],
      });
      expect(() => validateExpectation(invalid)).toThrowError('forbidden-segment');
    }
  });

  test('11: free-form expression data is rejected', () => {
    const invalid = validExpectation({
      invariantDefinitions: [{ kind: 'FIELD_PRESENT', path: ['data'], expected: true }],
      expression: 'raw.body.items.length > 2',
    });
    expect(() => validateExpectation(invalid)).toThrowError('unknown-field');
    // Invariant objects carrying executable-looking fields are rejected too.
    const sneaky = validExpectation({
      invariantDefinitions: [{ kind: 'FIELD_PRESENT', path: ['data'], expected: true, callback: '() => true' }],
    });
    expect(() => validateExpectation(sneaky)).toThrowError('unknown-field');
  });

  test('12: benign optional-field and bounded contracts are accepted', () => {
    const benign = validExpectation({
      expectationId: 'test.expectation.benign-optional',
      invariantDefinitions: [
        { kind: 'FIELD_PRESENT', path: ['data'], expected: true },
        { kind: 'TYPE_MATCH', path: ['data'], expectedType: 'OBJECT' },
        { kind: 'CARDINALITY_MATCH', path: ['data', 'items'], min: 0, max: 1000 },
        { kind: 'FIELD_ABSENT', path: ['error'] },
      ],
    });
    const validated = validateExpectation(benign);
    expect(validated.invariantDefinitions).toHaveLength(4);
    expect(validateExpectation(validExpectation({ projectionContract: { limits: { maxDepth: 8 } } })).projectionContract.limits.maxDepth).toBe(8);
    expect(validateExpectation(validExpectation()).projectionContract.limits).toEqual(DEFAULT_PROJECTION_LIMITS);
  });

  test('13: synthetic source fixture derivation is deterministic and complete', () => {
    const fixturePath = path.join(__dirname, '..', '..', 'corpus', 'phase9', 'source-fixture', 'contracts', 'entityCatalog.ts');
    const sourceText = fs.readFileSync(fixturePath, 'utf8');
    const first = deriveExpectations({ sourceText, provenance: PROVENANCE });
    const second = deriveExpectations({ sourceText, provenance: PROVENANCE });
    expect(first.blockCount).toBe(5);
    expect(first.expectations).toHaveLength(5);
    expect(JSON.stringify(first.expectations)).toBe(JSON.stringify(second.expectations));
    expect(new Set(first.expectations.map((item) => item.expectationId)).size).toBe(5);
    const ids = first.expectations.map((item) => item.expectationId).sort();
    expect(ids).toEqual([
      'fixture.aggregate.read.line-items-equal-total',
      'fixture.collection.read.rows-equal-declared-count',
      'fixture.entity.list-detail.identity-consistency',
      'fixture.entity.read.success-envelope',
      'fixture.stage.read.transition-change',
    ]);
    for (const expectation of first.expectations) {
      expect(expectation.sourceProvenance).toEqual(PROVENANCE);
      expect(expectation.sourceProvenance.sha).toBe(FIXTURE_SHA_A);
    }
  });

  test('13b: malformed contract blocks fail with bounded classifications', () => {
    expect(() => deriveExpectations({ sourceText: '// @nightwatch-contract\n// {not json', provenance: PROVENANCE })).toThrowError('contract-block-not-json');
    expect(() => deriveExpectations({ sourceText: 'plain source, no contracts', provenance: PROVENANCE })).not.toThrow();
    expect(deriveExpectations({ sourceText: 'plain source, no contracts', provenance: PROVENANCE }).expectations).toHaveLength(0);
  });

  test('13c: admitted expectations are usable by the oracle layer (envelope example)', () => {
    const admission = admitExpectation(validExpectation(), SNAPSHOT);
    expect(admission.result).toBe('EXPECTATION_ADMITTED');
    const expectation = admission.expectation as SemanticExpectation;
    expect(expectation.targetKind).toBe('API_OPERATION');
    expect(expectation.invariantDefinitions[0]?.kind).toBe('ENVELOPE_CLASS');
  });
});
