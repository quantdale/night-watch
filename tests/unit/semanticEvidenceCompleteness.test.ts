// M7 task 8.3 (NW-AUD-039 narrowed) — evidence that could not be evaluated is
// INCOMPLETE, never PASS: a NOT_APPLICABLE invariant, an invalid input or a
// truncated collection cannot be reported as a passing expectation.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateSemanticExpectation } from '../../src/oracles/semantic/oracle';
import { projectObservation } from '../../src/oracles/projections';
import { ProjectionContext } from '../../src/oracles/projections/identity';
import { SEMANTIC_EXPECTATION_VERSION } from '../../src/oracles/expectations/types';
import { DEFAULT_PROJECTION_LIMITS } from '../../src/oracles/projections/types';
import type { InvariantDefinition } from '../../src/oracles/expectations/types';

function expectation(invariants: readonly InvariantDefinition[]) {
  return {
    schemaVersion: SEMANTIC_EXPECTATION_VERSION,
    expectationId: 'fixture.record-readiness',
    targetKind: 'READ_OPERATION' as const,
    targetId: 'fixture.record-readiness.read',
    sourceProvenance: {
      repoId: 'example/ledger',
      sha: 'a'.repeat(40),
      relativePath: 'src/App/Handler/Record.php',
      derivationVersion: 'nightwatch.real-source-expectation-derivation.v1',
    },
    projectionContract: { limits: DEFAULT_PROJECTION_LIMITS },
    invariantDefinitions: invariants,
  } as unknown as Parameters<typeof evaluateSemanticExpectation>[0]['expectation'];
}

function evaluate(value: unknown, invariants: readonly InvariantDefinition[]) {
  const projection = projectObservation({ value }).projection;
  return evaluateSemanticExpectation({
    oracleId: 'record-readiness',
    expectation: expectation(invariants),
    projections: [projection],
    ctx: new ProjectionContext(),
    sourceSnapshot: { repoId: 'example/ledger', sha: 'a'.repeat(40) },
  });
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const FIELD_PRESENT: InvariantDefinition = { kind: 'FIELD_PRESENT', path: ['0', 'total'], expected: true };
/** A membership invariant whose path does not exist: NOT_APPLICABLE. */
const TYPE_IN_SET_ABSENT_PATH: InvariantDefinition = { kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['OBJECT'] };

test.describe('incomplete evidence is never PASS (8.3)', () => {
  test('every invariant passing is a PASS', () => {
    const result = evaluate([{ total: 3 }], [FIELD_PRESENT]);
    expect(result.outcome).toBe('PASS');
    expect(result.invariantEvaluations.map((evaluation) => evaluation.verdict)).toEqual(['PASS']);
  });

  test('a NOT_APPLICABLE invariant makes the whole evaluation PARTIAL_COVERAGE', () => {
    const result = evaluate([{ total: 3 }], [FIELD_PRESENT, TYPE_IN_SET_ABSENT_PATH]);
    // One invariant passed, one could not be evaluated: the expectation is
    // INCOMPLETE — the old `anyPass ? PASS` reported this as a pass.
    expect(result.outcome).toBe('PARTIAL_COVERAGE');
    expect(result.outcome).not.toBe('PASS');
    expect(result.invariantEvaluations.some((evaluation) => evaluation.verdict === 'NOT_APPLICABLE')).toBe(true);
  });

  test('no applicable invariant at all is NOT_APPLICABLE, never PASS', () => {
    const result = evaluate([{ total: 3 }], [TYPE_IN_SET_ABSENT_PATH]);
    expect(result.outcome).toBe('NOT_APPLICABLE');
  });

  test('the oracle never decides PASS from a single passing invariant', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'oracles', 'semantic', 'oracle.ts'), 'utf8');
    // The over-claim was `anyPass ? 'PASS' : 'NOT_APPLICABLE'`.
    expect(source).not.toContain("anyPass ? 'PASS'");
    expect(source).toContain("evaluations.every((e) => e.verdict === 'PASS')");
  });
});
