// ---------------------------------------------------------------------------
// Nightwatch Phase 11 — collection-wide fixture definitions (SPEC Phase 11).
//
// SYNTHETIC ONLY. Validates the expected contract for collection-wide
// expectations using COLLECTION_ITEM_CONTRACT invariant kinds.
// ---------------------------------------------------------------------------

import type { CollectionItemContract, SemanticExpectation, SourceProvenance } from '../../../src/oracles/expectations/types';
import { DEFAULT_PROJECTION_LIMITS } from '../../../src/oracles/projections';

export const PHASE11_FIXTURE_REPO = 'corpus/phase11/source-fixture';
export const PHASE11_FIXTURE_SHA = 'dddddddddddddddddddddddddddddddddddddddd';

export const PHASE11_PROVENANCE: SourceProvenance = {
  repoId: PHASE11_FIXTURE_REPO,
  sha: PHASE11_FIXTURE_SHA,
  relativePath: 'fixtures/phase11CollectionContracts.ts',
  derivationVersion: 'nightwatch.expectation-derivation.v1',
};

// ---------------------------------------------------------------------------
// Collection-wide contract definitions.
// ---------------------------------------------------------------------------

export const PHASE11_COLLECTION_FIXTURES = {
  commonExchange: {
    expectationId: 'ripple.common-exchange.read.real-source-collection',
    requiredItemKeys: ['month', 'exchange_rate'],
    itemFieldTypeContracts: [
      { field: 'month', allowedTypes: ['STRING'] as const },
      { field: 'exchange_rate', allowedTypes: ['OBJECT', 'ARRAY'] as const },
    ],
  },
  payerExchange: {
    expectationId: 'ripple.payer-exchange.read.real-source-collection',
    requiredItemKeys: ['payer_id', 'exchange_rate'],
    itemFieldTypeContracts: [
      { field: 'payer_id', allowedTypes: ['STRING'] as const },
      { field: 'exchange_rate', allowedTypes: ['OBJECT', 'ARRAY'] as const },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Factory: build COLLECTION_ITEM_CONTRACT invariant definitions.
// ---------------------------------------------------------------------------

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
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'FIELD_PRESENT',
        itemRelativePath,
        itemExpected: options.itemExpected ?? true,
      };
    case 'FIELD_ABSENT':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'FIELD_ABSENT',
        itemRelativePath,
      };
    case 'TYPE_MATCH':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'TYPE_MATCH',
        itemRelativePath,
        itemExpectedType: options.itemExpectedType!,
      };
    case 'TYPE_IN_SET':
      return {
        kind: 'COLLECTION_ITEM_CONTRACT',
        collectionPath,
        itemInvariantKind: 'TYPE_IN_SET',
        itemRelativePath,
        itemAllowedTypes: options.itemAllowedTypes!,
      };
  }
}

/** Create a SemanticExpectation wrapping collection-item contracts. */
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
    sourceProvenance: PHASE11_PROVENANCE,
    projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
    invariantDefinitions: invariantDefs,
    ...overrides,
  };
}
