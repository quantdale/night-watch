// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — TYPE_IN_SET invariant matrix (SPEC Phase 10A §17,
// §28) + expectation-validator matrix for the new kind.
//
// Semantics: missing path -> NOT_APPLICABLE; ambiguity caused by an
// empty/uninspected parent array -> NOT_APPLICABLE; observed type in the
// source-established allowed set -> PASS; outside -> VIOLATED. The valid
// empty-ARRAY representation of the payer OBJECT|ARRAY union is a PASS —
// never a type violation (§28 regression).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { validateExpectation } from '../../src/oracles/expectations/validator';
import { evaluateInvariant } from '../../src/oracles/invariants/evaluate';
import { projectObservation } from '../../src/oracles/projections';
import { ProjectionContext } from '../../src/oracles/projections/identity';
import type { InvariantDefinition } from '../../src/oracles/expectations/types';

function evaluateTypeInSet(invariant: InvariantDefinition, value: unknown) {
  const projection = projectObservation({ value }).projection;
  const ctx = new ProjectionContext();
  return evaluateInvariant(invariant, [projection], ctx);
}

const TYPE_IN_SET_OBJ_ARRAY: InvariantDefinition = {
  kind: 'TYPE_IN_SET',
  path: ['0', 'exchange_rate'],
  allowedTypes: ['ARRAY', 'OBJECT'],
};

const TYPE_IN_SET_OBJECT: InvariantDefinition = {
  kind: 'TYPE_IN_SET',
  path: ['0', 'exchange_rate'],
  allowedTypes: ['OBJECT'],
};

test.describe('Phase 10A — TYPE_IN_SET evaluation (§17, §28)', () => {
  test('observed OBJECT in {OBJECT, ARRAY} -> PASS', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ exchange_rate: { jpy: 1.25 } }]);
    expect(evaluation).toEqual({ invariantKind: 'TYPE_IN_SET', verdict: 'PASS' });
  });

  test('observed empty ARRAY in {OBJECT, ARRAY} -> PASS (the §28 union regression — NEVER a type violation)', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ exchange_rate: [] }]);
    expect(evaluation.verdict).toBe('PASS');
  });

  test('observed NUMBER outside {OBJECT, ARRAY} -> VIOLATED', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ exchange_rate: 123.45 }]);
    expect(evaluation.verdict).toBe('VIOLATED');
  });

  test('observed STRING outside {OBJECT, ARRAY} -> VIOLATED', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ exchange_rate: '1.25' }]);
    expect(evaluation.verdict).toBe('VIOLATED');
  });

  test('observed ARRAY outside {OBJECT} (common empty-case regression) -> VIOLATED', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJECT, [{ exchange_rate: [] }]);
    expect(evaluation.verdict).toBe('VIOLATED');
  });

  test('missing path -> NOT_APPLICABLE', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ month: '2026-01' }]);
    expect(evaluation.verdict).toBe('NOT_APPLICABLE');
  });

  test('empty parent array -> NOT_APPLICABLE (ambiguity never an anomaly)', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, []);
    expect(evaluation.verdict).toBe('NOT_APPLICABLE');
  });

  test('index beyond the inspected window -> NOT_APPLICABLE', () => {
    const projection = projectObservation({ value: [{ exchange_rate: {} }] }).projection;
    const ctx = new ProjectionContext();
    const evaluation = evaluateInvariant(
      { kind: 'TYPE_IN_SET', path: ['3', 'exchange_rate'], allowedTypes: ['ARRAY', 'OBJECT'] },
      [projection],
      ctx,
    );
    expect(evaluation.verdict).toBe('NOT_APPLICABLE');
  });

  test('no projection -> NOT_APPLICABLE', () => {
    const ctx = new ProjectionContext();
    const evaluation = evaluateInvariant(TYPE_IN_SET_OBJ_ARRAY, [], ctx);
    expect(evaluation.verdict).toBe('NOT_APPLICABLE');
  });

  test('null node at path -> VIOLATED (NULL is a first-class type outside the allowed set)', () => {
    const evaluation = evaluateTypeInSet(TYPE_IN_SET_OBJ_ARRAY, [{ exchange_rate: null }]);
    // null projects as a NULL node — outside the allowed set. The source can
    // never emit null for exchange_rate (always []/object by construction),
    // so a NULL is a genuine type contradiction. This matches TYPE_MATCH
    // semantics (NULL is a first-class type).
    expect(evaluation.verdict).toBe('VIOLATED');
  });
});

test.describe('Phase 10A — expectation validator: TYPE_IN_SET (§31)', () => {
  const BASE = {
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId: 'test.type-in-set.expectation',
    targetKind: 'API_OPERATION',
    targetId: 'ripple.payer-exchange.read',
    sourceProvenance: {
      repoId: 'mobingilabs/ripple-api',
      sha: '169df39d3cdf56c88f98d45d06eae6e48c3d8f6d',
      relativePath: 'src/App/Handler/ExchangeRate.php',
      symbol: 'getAccountExchangeForMonth',
      derivationVersion: 'nightwatch.real-source-expectation-derivation.v2',
      evidenceDigest: 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    },
    projectionContract: { limits: {} },
    invariantDefinitions: [
      { kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['ARRAY', 'OBJECT'] },
    ],
  };

  test('conforming TYPE_IN_SET expectation validates; allowedTypes canonicalized sorted', () => {
    const validated = validateExpectation(BASE);
    expect(validated.invariantDefinitions[0]).toEqual({
      kind: 'TYPE_IN_SET',
      path: ['0', 'exchange_rate'],
      allowedTypes: ['ARRAY', 'OBJECT'],
    });
  });

  test('unsorted allowedTypes are canonicalized (deterministic DTO)', () => {
    const unsorted = {
      ...BASE,
      invariantDefinitions: [{ kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['OBJECT', 'ARRAY'] }],
    };
    const validated = validateExpectation(unsorted);
    expect(validated.invariantDefinitions[0]).toEqual({
      kind: 'TYPE_IN_SET',
      path: ['0', 'exchange_rate'],
      allowedTypes: ['ARRAY', 'OBJECT'],
    });
  });

  test('duplicate allowed types rejected', () => {
    const dup = { ...BASE, invariantDefinitions: [{ kind: 'TYPE_IN_SET', path: ['0', 'x'], allowedTypes: ['OBJECT', 'OBJECT'] }] };
    expect(() => validateExpectation(dup)).toThrow(/allowedTypes-duplicate/);
  });

  test('empty allowed set rejected', () => {
    const empty = { ...BASE, invariantDefinitions: [{ kind: 'TYPE_IN_SET', path: ['0', 'x'], allowedTypes: [] }] };
    expect(() => validateExpectation(empty)).toThrow(/allowedTypes-unbounded/);
  });

  test('unknown type rejected', () => {
    const bad = { ...BASE, invariantDefinitions: [{ kind: 'TYPE_IN_SET', path: ['0', 'x'], allowedTypes: ['BLOB'] }] };
    expect(() => validateExpectation(bad)).toThrow(/allowedTypes-unsupported/);
  });

  test('unknown field on the invariant rejected', () => {
    const extra = {
      ...BASE,
      invariantDefinitions: [{ kind: 'TYPE_IN_SET', path: ['0', 'x'], allowedTypes: ['OBJECT'], expectedType: 'OBJECT' }],
    };
    expect(() => validateExpectation(extra)).toThrow(/unknown-field/);
  });
});
