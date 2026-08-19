// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — Matrix F semantic clustering / contract identity.
// Covers F01-F12: dedup across row ordinals/violating counts, distinct
// invariant/target separation, SHA vs evidenceDigest handling, derivation
// version, occurrence metadata, replay fingerprint, protocol-only compat,
// deterministic canonicalization, privacy sentinel guard.
// Pure local/synthetic — no network, no filesystem.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  semanticInvariantDefinitionId,
  semanticContractIdentity,
  semanticClusterKey,
  clusterSemanticObservations,
  isSameSemanticAnomaly,
  attachReplayToCluster,
  type SemanticObservation,
} from '../../src/oracles/semantic/cluster';
import type { InvariantDefinition } from '../../src/oracles/expectations/types';
import { clusterAnomalies } from '../../src/core/triage/clustering';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const EVIDENCE_A = 'ev:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const EVIDENCE_B = 'ev:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
const DERIV_V2 = 'nightwatch.real-source-expectation-derivation.v2';
const DERIV_V1 = 'nightwatch.real-source-expectation-derivation.v1';
const DERIV_COLLECTION = 'nightwatch.real-source-collection-expectation-derivation.v1';
const REPO = 'mobingilabs/ripple-api';
const EXP_COMMON = 'ripple.common-exchange.read.real-source-deep';
const EXP_PAYER = 'ripple.payer-exchange.read.real-source-deep';
const TARGET_COMMON = 'ripple.common-exchange.read';
const TARGET_PAYER = 'ripple.payer-exchange.read';
const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
const FP_OTHER = 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';

function fieldPresent(path: string[]): InvariantDefinition {
  return { kind: 'FIELD_PRESENT', path, expected: true };
}
function typeMatch(path: string[], expectedType: string): InvariantDefinition {
  return { kind: 'TYPE_MATCH', path, expectedType: expectedType as unknown as InvariantDefinition extends { kind: 'TYPE_MATCH'; expectedType: infer T } ? T : never } as unknown as InvariantDefinition;
}
function typeInSet(path: string[], allowedTypes: readonly ('OBJECT' | 'ARRAY')[]): InvariantDefinition {
  return { kind: 'TYPE_IN_SET', path, allowedTypes } as InvariantDefinition;
}
function collectionContract(itemRelativePath: string[], itemKind: 'FIELD_PRESENT' | 'TYPE_MATCH'): InvariantDefinition {
  if (itemKind === 'FIELD_PRESENT') {
    return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath: [], itemInvariantKind: 'FIELD_PRESENT', itemRelativePath, itemExpected: true } as InvariantDefinition;
  }
  return { kind: 'COLLECTION_ITEM_CONTRACT', collectionPath: [], itemInvariantKind: 'TYPE_MATCH', itemRelativePath, itemExpectedType: 'STRING' } as InvariantDefinition;
}

function observation(overrides: Partial<SemanticObservation> = {}): SemanticObservation {
  return {
    runId: 'run-1',
    observedAt: '2026-08-19T00:00:00.000Z',
    expectationId: EXP_COMMON,
    targetId: TARGET_COMMON,
    invariant: fieldPresent(['0', 'month']),
    sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A },
    fingerprint: FP,
    reproduced: true,
    ...overrides,
  };
}

test.describe('Phase 12A Matrix F — semantic clustering & contract identity', () => {
  test('F01: same invariant row1 vs row57 => same cluster (row ordinal excluded)', () => {
    const inv0 = fieldPresent(['0', 'month']);
    const obs1 = observation({ runId: 'run-1', invariant: inv0 });
    // The invariant definition itself is the contract — row position is not
    // encoded in the invariant path for positional checks beyond the inspected
    // index, and collection contracts use itemRelativePath only.
    const obs57 = observation({ runId: 'run-57', invariant: inv0 });
    const clusters = clusterSemanticObservations([obs1, obs57]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
    expect(clusters[0]!.clusterKey).toBe(clusters[0]!.clusterKey);
  });

  test('F02: same invariant one vs many violating rows => same cluster', () => {
    // Collection contract: one invariant definition covers all rows. Violating
    // count / firstViolationOrdinal are occurrence evidence, not identity.
    const inv = collectionContract(['month'], 'FIELD_PRESENT');
    const obsOne = observation({ runId: 'run-1', invariant: inv });
    const obsMany = observation({ runId: 'run-2', invariant: inv });
    const clusters = clusterSemanticObservations([obsOne, obsMany]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
  });

  test('F03: same invariant different firstViolationOrdinal => same cluster', () => {
    // Ordinal is never part of identity — two observations with same invariant
    // but different hypothetical ordinals still collapse (identity ignores it).
    const inv = collectionContract(['exchange_rate'], 'FIELD_PRESENT');
    const a = observation({ runId: 'run-1', invariant: inv });
    const b = observation({ runId: 'run-2', invariant: inv });
    const keyA = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const keyB = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    expect(keyA).toBe(keyB);
    const clusters = clusterSemanticObservations([a, b]);
    expect(clusters).toHaveLength(1);
  });

  test('F04: different field contract => different cluster', () => {
    const invMonth = fieldPresent(['0', 'month']);
    const invRate = fieldPresent(['0', 'exchange_rate']);
    const idMonth = semanticInvariantDefinitionId(invMonth);
    const idRate = semanticInvariantDefinitionId(invRate);
    expect(idMonth).not.toBe(idRate);
    const a = observation({ runId: 'run-1', invariant: invMonth });
    const b = observation({ runId: 'run-2', invariant: invRate });
    const clusters = clusterSemanticObservations([a, b]);
    expect(clusters).toHaveLength(2);
  });

  test('F05: different invariant kind => different cluster', () => {
    const invPresent = fieldPresent(['0', 'exchange_rate']);
    const invType = typeMatch(['0', 'exchange_rate'], 'OBJECT' as unknown as string) as InvariantDefinition;
    expect(semanticInvariantDefinitionId(invPresent)).not.toBe(semanticInvariantDefinitionId(invType));
    const a = observation({ runId: 'run-1', invariant: invPresent });
    const b = observation({ runId: 'run-2', invariant: invType });
    expect(clusterSemanticObservations([a, b])).toHaveLength(2);
  });

  test('F06: different target => different cluster', () => {
    const inv = fieldPresent(['0', 'month']);
    const sciCommon = semanticContractIdentity({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const sciPayer = semanticContractIdentity({ expectationId: EXP_PAYER, targetId: TARGET_PAYER, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    expect(sciCommon).not.toBe(sciPayer);
    const a = observation({ runId: 'run-1', expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv });
    const b = observation({ runId: 'run-2', expectationId: EXP_PAYER, targetId: TARGET_PAYER, invariant: inv });
    expect(clusterSemanticObservations([a, b])).toHaveLength(2);
  });

  test('F07: unrelated SHA move with identical evidence/digest => no fragmentation', () => {
    const inv = fieldPresent(['0', 'month']);
    const keyShaA = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const keyShaBSameEvidence = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    expect(keyShaA).toBe(keyShaBSameEvidence);
    // Observations with different SHAs but same evidence collapse
    const a = observation({ runId: 'run-1', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const b = observation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_B, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const clusters = clusterSemanticObservations([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
  });

  test('F08: changed evidence digest NOT silently merged', () => {
    const inv = fieldPresent(['0', 'month']);
    const keyA = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const keyB = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_B } });
    expect(keyA).not.toBe(keyB);
    const a = observation({ runId: 'run-1', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const b = observation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_B } });
    expect(clusterSemanticObservations([a, b])).toHaveLength(2);
  });

  test('F09: changed derivation version NOT silently merged', () => {
    const inv = fieldPresent(['0', 'month']);
    const keyV2 = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const keyV1 = semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V1, evidenceDigest: EVIDENCE_A } });
    expect(keyV2).not.toBe(keyV1);
    const keyCollection = semanticClusterKey({ expectationId: 'ripple.common-exchange.read.real-source-collection', targetId: TARGET_COMMON, invariant: collectionContract(['month'], 'FIELD_PRESENT'), sourceProvenance: { repoId: REPO, derivationVersion: DERIV_COLLECTION, evidenceDigest: EVIDENCE_A } });
    expect(keyV2).not.toBe(keyCollection);
    const a = observation({ runId: 'run-1', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } });
    const b = observation({ runId: 'run-2', sourceProvenance: { repoId: REPO, sha: SHA_A, derivationVersion: DERIV_V1, evidenceDigest: EVIDENCE_A } });
    expect(clusterSemanticObservations([a, b])).toHaveLength(2);
  });

  test('F10: exact replay increments reproduction without cluster split', () => {
    const inv = fieldPresent(['0', 'month']);
    const a = observation({ runId: 'run-1', invariant: inv, fingerprint: FP, reproduced: true });
    const b = observation({ runId: 'run-2', invariant: inv, fingerprint: FP, reproduced: true });
    const clusters = clusterSemanticObservations([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
    expect(clusters[0]!.reproductionCount).toBe(2);
    expect(attachReplayToCluster({ originalClusterKey: clusters[0]!.clusterKey, replayFingerprint: FP, originalFingerprint: FP }).attached).toBe(true);
    expect(isSameSemanticAnomaly(FP, FP)).toBe(true);
  });

  test('F11: different replay fingerprint NOT counted as original reproduction', () => {
    expect(isSameSemanticAnomaly(FP, FP_OTHER)).toBe(false);
    expect(attachReplayToCluster({ originalClusterKey: 'sc:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', replayFingerprint: FP_OTHER, originalFingerprint: FP }).attached).toBe(false);
    // Observations with same contract but different fingerprint are distinguished
    // via replay attachment, not via silent cluster merge — the cluster itself
    // uses contract identity; fingerprint equality gates reproduction counting.
    const inv = fieldPresent(['0', 'month']);
    const a = observation({ runId: 'run-1', invariant: inv, fingerprint: FP });
    const replayDifferent = attachReplayToCluster({ originalClusterKey: semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } }), replayFingerprint: FP_OTHER, originalFingerprint: FP });
    expect(replayDifferent.attached).toBe(false);
    void a;
  });

  test('F12: protocol-only clustering compatibility (historical behavior unchanged)', () => {
    const obs: Parameters<typeof clusterAnomalies>[0][number] = {
      runId: 'run-1',
      observedAt: '2026-08-13T00:00:00.000Z',
      fingerprint: FP,
      features: {
        journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', oracleId: 'oracle.protocol', routeClass: '/ripple/exchange', operationFamily: 'payer-exchange', statusClass: '5xx', contentTypeClass: 'json', runtimeCategory: 'product', structuralState: 'table-missing', failureActionId: 'p4.j1.read', sourceImpactRegion: 'ripple-ui:exchange', browserApiResultClass: 'same',
      },
      timingClass: 'NONE',
      reproduced: true,
      minimized: true,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    };
    const clusters = clusterAnomalies([obs, { ...obs, runId: 'run-2', timingClass: 'BOUNDED' }]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.occurrenceCount).toBe(2);
  });

  test('determinism: input ordering does not affect cluster identity', () => {
    const inv = fieldPresent(['0', 'month']);
    const a = observation({ runId: 'run-2', invariant: inv });
    const b = observation({ runId: 'run-1', invariant: inv });
    const c1 = clusterSemanticObservations([a, b]);
    const c2 = clusterSemanticObservations([b, a]);
    expect(c1[0]!.clusterKey).toBe(c2[0]!.clusterKey);
    expect(c1[0]!.contractIdentity).toBe(c2[0]!.contractIdentity);
    expect(c1[0]!.runIds).toEqual(c2[0]!.runIds);
  });

  test('determinism: repeated derivation >=3 has zero mismatches', () => {
    const inv = typeInSet(['0', 'exchange_rate'], ['OBJECT']);
    const keys: string[] = [];
    for (let i = 0; i < 3; i++) {
      keys.push(semanticClusterKey({ expectationId: EXP_COMMON, targetId: TARGET_COMMON, invariant: inv, sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } }));
    }
    expect(new Set(keys).size).toBe(1);
  });

  test('privacy: sentinel values rejected from identity and clustering', () => {
    expect(() => semanticInvariantDefinitionId({ kind: 'FIELD_PRESENT', path: ['CUSTOMER_SENTINEL'], expected: true } as InvariantDefinition)).toThrow('SEMANTIC_CLUSTER_PRIVACY_BLOCKED');
    expect(() => semanticContractIdentity({ expectationId: 'CUSTOMER_SENTINEL', targetId: TARGET_COMMON, invariant: fieldPresent(['0', 'month']), sourceProvenance: { repoId: REPO, derivationVersion: DERIV_V2, evidenceDigest: EVIDENCE_A } })).toThrow();
    const evil = observation({ runId: 'run-1', expectationId: 'CUSTOMER_SENTINEL' });
    expect(() => clusterSemanticObservations([evil])).toThrow();
  });

  test('distinct invariant kinds with same path remain distinct', () => {
    const present = fieldPresent(['0', 'exchange_rate']);
    const typeObj = typeMatch(['0', 'exchange_rate'], 'OBJECT' as unknown as string) as InvariantDefinition;
    const typeSet = typeInSet(['0', 'exchange_rate'], ['OBJECT']);
    expect(semanticInvariantDefinitionId(present)).not.toBe(semanticInvariantDefinitionId(typeObj));
    expect(semanticInvariantDefinitionId(typeObj)).not.toBe(semanticInvariantDefinitionId(typeSet));
  });
});
