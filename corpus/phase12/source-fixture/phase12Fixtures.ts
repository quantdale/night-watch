// ---------------------------------------------------------------------------
// Nightwatch Phase 12 — synthetic collection fixtures (no real source).
// Mirrors Phase 11 fixture shape so the backtest can exercise stale/unavailable
// and evidence-drift cases deterministically.
// ---------------------------------------------------------------------------

import type { CollectionItemContract, SemanticExpectation, SourceProvenance } from '../../../src/oracles/expectations/types';
import { DEFAULT_PROJECTION_LIMITS } from '../../../src/oracles/projections';

export const PHASE12_FIXTURE_REPO = 'corpus/phase12/source-fixture';
export const PHASE12_FIXTURE_SHA = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const PHASE12_DRIFT_DIGEST = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
export const PHASE12_SAME_EVIDENCE_DIGEST = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
export const STALE_SHA = 'ffffffffffffffffffffffffffffffffffffffff';
export const UNRELATED_SHA = '1111111111111111111111111111111111111111';

export const PHASE12_PROVENANCE: SourceProvenance = {
  repoId: PHASE12_FIXTURE_REPO,
  sha: PHASE12_FIXTURE_SHA,
  relativePath: 'fixtures/phase12CollectionContracts.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
  evidenceDigest: PHASE12_SAME_EVIDENCE_DIGEST,
};

export const PHASE12_DRIFT_PROVENANCE: SourceProvenance = {
  ...PHASE12_PROVENANCE,
  evidenceDigest: PHASE12_DRIFT_DIGEST,
};

export function createCollectionItemContract(
  collectionPath: readonly string[],
  itemInvariantKind: 'FIELD_PRESENT' | 'FIELD_ABSENT' | 'TYPE_MATCH' | 'TYPE_IN_SET',
  itemRelativePath: readonly string[],
  options: {
    itemExpected?: boolean;
    itemExpectedType?: 'NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY';
    itemAllowedTypes?: readonly ('NULL' | 'BOOLEAN' | 'NUMBER' | 'STRING' | 'OBJECT' | 'ARRAY')[];
  } = {},
): CollectionItemContract {
  switch (itemInvariantKind) {
    case 'FIELD_PRESENT':
      return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath, itemInvariantKind: 'FIELD_PRESENT', itemRelativePath, itemExpected: options.itemExpected ?? true };
    case 'FIELD_ABSENT':
      return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath, itemInvariantKind: 'FIELD_ABSENT', itemRelativePath };
    case 'TYPE_MATCH':
      return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath, itemInvariantKind: 'TYPE_MATCH', itemRelativePath, itemExpectedType: options.itemExpectedType! };
    case 'TYPE_IN_SET':
      return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath, itemInvariantKind: 'TYPE_IN_SET', itemRelativePath, itemAllowedTypes: options.itemAllowedTypes! };
  }
}

export function createCollectionExpectation(
  expectationId: string,
  invariantDefs: readonly CollectionItemContract[],
  overrides: Partial<Omit<SemanticExpectation, 'expectationId' | 'invariantDefinitions' | 'schemaVersion'>> = {},
): SemanticExpectation {
  return {
    schemaVersion: 'nightwatch.semantic-expectation.v1',
    expectationId,
    targetKind: 'API_OPERATION',
    targetId: expectationId,
    sourceProvenance: PHASE12_PROVENANCE,
    projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
    invariantDefinitions: invariantDefs,
    ...overrides,
  };
}

export const PHASE12_EXPECTATIONS = {
  commonFieldPresent: createCollectionExpectation('phase12.common-exchange.field-present', [createCollectionItemContract([], 'FIELD_PRESENT', ['month'])]),
  commonTypeMonth: createCollectionExpectation('phase12.common-exchange.type-month', [createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' })]),
  payerTypeInSet: createCollectionExpectation('phase12.payer-exchange.type-in-set', [createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], { itemAllowedTypes: ['OBJECT', 'ARRAY'] as const })]),
  twoInvariants: createCollectionExpectation('phase12.common-exchange.two-invariants', [
    createCollectionItemContract([], 'FIELD_PRESENT', ['month']),
    createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' }),
  ]),
} as const;

export function driftExpectation(expectation: SemanticExpectation): SemanticExpectation {
  return { ...expectation, sourceProvenance: PHASE12_DRIFT_PROVENANCE };
}
