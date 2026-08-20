// ---------------------------------------------------------------------------
// Nightwatch Phase 13 — synthetic collection fixtures (no real source).
// Mirrors Phase 12 fixture shape but expands to cover occurrence-bound replay,
// semantic truth, cluster dedup/split, and bundle/version drift cases.
// All values are synthetic; no customer data, no real product bodies.
// ---------------------------------------------------------------------------

import type { CollectionItemContract, SemanticExpectation, SourceProvenance } from '../../../src/oracles/expectations/types';
import { DEFAULT_PROJECTION_LIMITS } from '../../../src/oracles/projections';

export const PHASE13_FIXTURE_REPO = 'corpus/phase13/source-fixture';
export const PHASE13_FIXTURE_BRANCH = 'refs/heads/main';
export const PHASE13_FIXTURE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const PHASE13_FIXTURE_SHA_ALT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
export const PHASE13_FIXTURE_SHA_FROZEN = 'cccccccccccccccccccccccccccccccccccccccc';
export const PHASE13_STALE_SHA = 'ffffffffffffffffffffffffffffffffffffffff';
export const PHASE13_UNRELATED_SHA = '1111111111111111111111111111111111111111';
export const PHASE13_DRIFT_DIGEST = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
export const PHASE13_SAME_EVIDENCE_DIGEST = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
export const PHASE13_ALT_EVIDENCE_DIGEST = 'ev:sha256:cccccccccccccccccccccccc';
export const PHASE13_DERIVATION_V1 = 'nightwatch.expectation-derivation.v1';
export const PHASE13_DERIVATION_V2 = 'nightwatch.expectation-derivation.v2';
export const PHASE13_COLLECTION_ADMISSION_V1 = 'nightwatch.collection-admission.v1';
export const PHASE13_COLLECTION_ADMISSION_V2 = 'nightwatch.collection-admission.v2';

export const PHASE13_PROVENANCE: SourceProvenance = {
  repoId: PHASE13_FIXTURE_REPO,
  sha: PHASE13_FIXTURE_SHA,
  relativePath: 'fixtures/phase13CollectionContracts.ts',
  derivationVersion: PHASE13_DERIVATION_V1,
  evidenceDigest: PHASE13_SAME_EVIDENCE_DIGEST,
};

export const PHASE13_PROVENANCE_ALT_SHA_SAME_EVIDENCE: SourceProvenance = {
  ...PHASE13_PROVENANCE,
  sha: PHASE13_FIXTURE_SHA_ALT,
};

export const PHASE13_PROVENANCE_DRIFT_DIGEST: SourceProvenance = {
  ...PHASE13_PROVENANCE,
  evidenceDigest: PHASE13_DRIFT_DIGEST,
};

export const PHASE13_PROVENANCE_ALT_DERIVATION: SourceProvenance = {
  ...PHASE13_PROVENANCE,
  derivationVersion: PHASE13_DERIVATION_V2,
};

export const PHASE13_PROVENANCE_ALT_EVIDENCE: SourceProvenance = {
  ...PHASE13_PROVENANCE,
  evidenceDigest: PHASE13_ALT_EVIDENCE_DIGEST,
};

export const PHASE13_STALE_PROVENANCE: SourceProvenance = {
  ...PHASE13_PROVENANCE,
  sha: PHASE13_STALE_SHA,
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
    sourceProvenance: PHASE13_PROVENANCE,
    projectionContract: { limits: { ...DEFAULT_PROJECTION_LIMITS } },
    invariantDefinitions: invariantDefs,
    ...overrides,
  };
}

export const PHASE13_EXPECTATIONS = {
  commonFieldPresent: createCollectionExpectation('phase13.common-exchange.field-present', [createCollectionItemContract([], 'FIELD_PRESENT', ['month'])]),
  commonTypeMonth: createCollectionExpectation('phase13.common-exchange.type-month', [createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' })]),
  payerTypeInSet: createCollectionExpectation('phase13.payer-exchange.type-in-set', [createCollectionItemContract([], 'TYPE_IN_SET', ['exchange_rate'], { itemAllowedTypes: ['OBJECT', 'ARRAY'] as const })]),
  commonTypeInSet: createCollectionExpectation('phase13.common-exchange.type-in-set', [createCollectionItemContract([], 'TYPE_IN_SET', ['month'], { itemAllowedTypes: ['STRING', 'NUMBER'] as const })]),
  twoInvariants: createCollectionExpectation('phase13.common-exchange.two-invariants', [
    createCollectionItemContract([], 'FIELD_PRESENT', ['month']),
    createCollectionItemContract([], 'TYPE_MATCH', ['month'], { itemExpectedType: 'STRING' }),
  ]),
  altFieldPresent: createCollectionExpectation('phase13.common-exchange.field-present.alt', [createCollectionItemContract([], 'FIELD_PRESENT', ['exchange_rate'])]),
} as const;

export function driftExpectation(expectation: SemanticExpectation): SemanticExpectation {
  return { ...expectation, sourceProvenance: PHASE13_PROVENANCE_DRIFT_DIGEST };
}

export function altEvidenceExpectation(expectation: SemanticExpectation): SemanticExpectation {
  return { ...expectation, sourceProvenance: PHASE13_PROVENANCE_ALT_EVIDENCE };
}

export function altDerivationExpectation(expectation: SemanticExpectation): SemanticExpectation {
  return { ...expectation, sourceProvenance: PHASE13_PROVENANCE_ALT_DERIVATION };
}

export function altShaSameEvidenceExpectation(expectation: SemanticExpectation): SemanticExpectation {
  return { ...expectation, sourceProvenance: PHASE13_PROVENANCE_ALT_SHA_SAME_EVIDENCE };
}
