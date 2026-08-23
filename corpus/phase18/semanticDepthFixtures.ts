// ---------------------------------------------------------------------------
// Phase 18 permanent LOCAL/SYNTHETIC semantic contract corpus.
//
// Every case has a source-shaped expectation, one seeded business anomaly,
// and one benign control. Values are fixture-only tokens; they are never
// customer data and are consumed only in-memory by the unit corpus runner.
// ---------------------------------------------------------------------------

import type { InvariantDefinition, SemanticExpectation } from '../../src/oracles/expectations/types';
import { validateExpectation } from '../../src/oracles/expectations/validator';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const LIMITS = { maxDepth: 8, maxFieldsPerObject: 64, maxArrayItemsInspected: 128, maxProjectionNodes: 1024, maxIdentityTokens: 256, maxNumericRefs: 512, maxRawInputBytes: 1_000_000 } as const;
const SOURCE = { repoId: 'phase18/corpus-source', sha: SHA, relativePath: 'contracts/semantic-fixture.ts', derivationVersion: 'nightwatch.phase18.corpus.v1' } as const;

export interface Phase18SemanticFixture {
  readonly id: string;
  readonly invariantClass: string;
  readonly expectedCategory: string;
  readonly expectation: SemanticExpectation;
  readonly positiveRawValues: readonly unknown[];
  readonly benignRawValues: readonly unknown[];
}

function make(id: string, targetKind: SemanticExpectation['targetKind'], invariant: InvariantDefinition, expectedCategory: string, positiveRawValues: readonly unknown[], benignRawValues: readonly unknown[]): Phase18SemanticFixture {
  const expectation = validateExpectation({
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId: `phase18.corpus.${id}`,
    targetKind,
    targetId: `phase18.corpus.${id}`,
    sourceProvenance: SOURCE,
    projectionContract: { limits: LIMITS },
    invariantDefinitions: [invariant],
  });
  return { id, invariantClass: invariant.kind, expectedCategory, expectation, positiveRawValues, benignRawValues };
}

export const PHASE18_SEMANTIC_FIXTURES: readonly Phase18SemanticFixture[] = Object.freeze([
  make('aggregate-count', 'API_OPERATION', { kind: 'COUNT_RELATION', relationId: 'fixture.rows.count', operation: 'COUNT_EQUALS', collectionPath: ['items'], scalarPath: ['count'] }, 'CARDINALITY_RELATION_MISMATCH', [{ items: [{ id: 'fixture-a' }, { id: 'fixture-b' }], count: 1 }], [{ items: [{ id: 'fixture-a' }, { id: 'fixture-b' }], count: 2 }]),
  make('detail-identity', 'JOURNEY_TRANSITION', { kind: 'IDENTITY_PRESENT_IN_COLLECTION', collectionPath: ['items'], itemIdentityPath: ['id'], detailIdentityPath: ['id'], correlationContext: 'fixture-detail' }, 'LIST_DETAIL_IDENTITY_MISMATCH', [{ items: [{ id: 'fixture-a' }] }, { id: 'fixture-b' }], [{ items: [{ id: 'fixture-a' }] }, { id: 'fixture-a' }]),
  make('cross-step-state', 'JOURNEY_TRANSITION', { kind: 'STATE_RELATION', relationId: 'fixture.state.stable', beforePath: ['state'], afterPath: ['state'], expected: 'EQUAL' }, 'STATE_RELATION_MISMATCH', [{ state: 'fixture-open' }, { state: 'fixture-closed' }], [{ state: 'fixture-open' }, { state: 'fixture-open' }]),
  make('pagination-window', 'JOURNEY_TRANSITION', { kind: 'PAGINATION_WINDOW', relationId: 'fixture.pages.disjoint', leftCollectionPath: ['items'], rightCollectionPath: ['items'], itemIdentityPath: ['id'] }, 'PAGINATION_WINDOW_MISMATCH', [{ items: [{ id: 'fixture-a' }] }, { items: [{ id: 'fixture-a' }] }], [{ items: [{ id: 'fixture-a' }] }, { items: [{ id: 'fixture-b' }] }]),
  make('empty-state', 'API_OPERATION', { kind: 'EMPTY_STATE_CONSISTENCY', relationId: 'fixture.empty', collectionPath: ['items'], countPath: ['count'], emptyMarkerPath: ['empty'] }, 'EMPTY_STATE_CONTRADICTION', [{ items: [], count: 1, empty: true }], [{ items: [], count: 0, empty: true }]),
  make('lifecycle-transition', 'JOURNEY_TRANSITION', { kind: 'STATE_RELATION', relationId: 'fixture.lifecycle.transition', beforePath: ['state'], afterPath: ['state'], expected: 'NOT_EQUAL' }, 'STATE_RELATION_MISMATCH', [{ state: 'fixture-open' }, { state: 'fixture-open' }], [{ state: 'fixture-open' }, { state: 'fixture-closed' }]),
  make('cross-surface', 'JOURNEY_TRANSITION', { kind: 'SURFACE_EQUIVALENCE', relationId: 'fixture.surface', leftPath: ['entity'], rightPath: ['entity'], expected: 'EQUAL' }, 'CROSS_SURFACE_MISMATCH', [{ entity: { id: 'fixture-a', count: 1 } }, { entity: { id: 'fixture-b', count: 1 } }], [{ entity: { id: 'fixture-a', count: 1 } }, { entity: { id: 'fixture-a', count: 1 } }]),
  make('http-200-error-envelope', 'API_OPERATION', { kind: 'ENVELOPE_CLASS', expected: 'SUCCESS_ENVELOPE', successField: ['ok'], errorField: ['error'] }, 'APPLICATION_ERROR_ENVELOPE', [{ error: { present: true } }], [{ ok: true }]),
]);

export const PHASE18_SEMANTIC_FIXTURE_IDS: readonly string[] = Object.freeze(PHASE18_SEMANTIC_FIXTURES.map((fixture) => fixture.id));
