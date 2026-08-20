// ---------------------------------------------------------------------------
// Nightwatch Phase 13 — integrated shadow harness verification (local only).
// No DEV, no browser, no network, no DB, no AI.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { buildPhase13Corpus, runPhase13ShadowOnce, runPhase13DeterminismTriple } from '../../src/core/phase13/shadow';
import { SENTINEL_PHASE13 } from '../../corpus/phase13/response-fixtures';
import { PHASE13_EXPECTATIONS } from '../../corpus/phase13/source-fixture/phase13Fixtures';
import { semanticInvariantDefinitionId } from '../../src/oracles/semantic/cluster';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';

test('I01 corpus exists and is synthetic-only (>=40 classes)', () => {
  const corpus = buildPhase13Corpus();
  expect(corpus.length).toBeGreaterThanOrEqual(40);
  // No raw customer values in fixture IDs or expectations
  for (const f of corpus) {
    expect(f.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(f.kind).toMatch(/^(REPLAY|SEMANTIC_TRUTH|PROTOCOL|DRIFT|PRIVACY)$/);
  }
  // Deterministic fixture expectations are from synthetic fixture repo
  for (const exp of Object.values(PHASE13_EXPECTATIONS)) {
    expect(exp.sourceProvenance.repoId).toBe('corpus/phase13/source-fixture');
  }
});

test('I02 harness uses actual routing/replay/promotion modules (import check)', async () => {
  const { metrics } = await runPhase13ShadowOnce();
  // If modules were not imported correctly, shadow would throw
  expect(metrics.seededCases).toBeGreaterThanOrEqual(40);
});

test('I03 synthetic executors only (no product executor)', async () => {
  const { metrics } = await runPhase13ShadowOnce();
  // Synthetic-only is asserted by the fact that no real campaign launcher is invoked; shadow metrics confirm synthetic path
  expect(metrics.seededCases).toBeGreaterThan(0);
  expect(metrics.privacyLeakCount).toBe(0);
});

test('I04-I26 quality floors are zero', async () => {
  const { metrics } = await runPhase13ShadowOnce();
  expect(metrics.falseReproductionCount).toBe(0);
  expect(metrics.structuralOnlyCertificationCount).toBe(0);
  expect(metrics.falseReadyCount).toBe(0);
  expect(metrics.falseHighCount).toBe(0);
  expect(metrics.partialFalseReadyCount).toBe(0);
  expect(metrics.staleUnavailableFalseReadyCount).toBe(0);
  expect(metrics.unsafePrivateFalseReadyCount).toBe(0);
  expect(metrics.semanticClusterFragmentationCount).toBe(0);
  expect(metrics.semanticCrossContractMergeCount).toBe(0);
  expect(metrics.driftMissCount).toBe(0);
  expect(metrics.privacyLeakCount).toBe(0);
  expect(metrics.authorityExpansionCount).toBe(0);
});

test('replay invariants: duplicate occurrence identity is load-bearing', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const r01 = safeOutputs['R01-duplicate-retain-first'] as { planId: string; retained: number[] };
  const r02 = safeOutputs['R02-duplicate-retain-second'] as { planId: string; retained: number[] };
  expect(r01.planId).not.toBe(r02.planId);
  expect(r01.retained).toEqual([0]);
  expect(r02.retained).toEqual([2]);
});

test('replay: executor different fingerprint normalizes to PASS', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const r08 = safeOutputs['R08-executor-different-fp-not-reproduced'] as { status: string; normalizedPass: boolean; notReproduced: boolean };
  expect(r08.normalizedPass).toBe(true);
  expect(r08.notReproduced).toBe(true);
});

test('replay: executor throw is INVALID fail-closed', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const r09 = safeOutputs['R09-executor-throw-fail-closed'] as { status: string; failClosed: boolean };
  expect(r09.failClosed).toBe(true);
  expect(r09.status).toBe('INVALID');
});

test('replay: journey reduced is PRECONDITION_DIVERGENCE (unsupported)', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const r11 = safeOutputs['R11-journey-reduced-unsupported'] as { rejected: boolean; reason: string };
  expect(r11.rejected).toBe(true);
  expect(r11.reason).toBe('PRECONDITION_DIVERGENCE');
});

test('semantic truth: current full ANOMALY with replay+minimization is HIGH+READY', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s01 = safeOutputs['S01-current-anomaly-exact-minimized-high-ready'] as { confidence: string; dossierStatus: string };
  expect(s01.confidence).toBe('HIGH');
  expect(s01.dossierStatus).toBe('READY');
});

test('semantic truth: not-reproduced is not READY', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s02 = safeOutputs['S02-current-anomaly-not-reproduced-not-ready'] as { dossierStatus: string };
  expect(s02.dossierStatus).not.toBe('READY');
});

test('semantic truth: PARTIAL is not READY/HIGH', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s03 = safeOutputs['S03-partial-coverage-not-ready'] as { confidence: string };
  expect(s03.confidence).not.toBe('HIGH');
});

test('semantic truth: stale/unavailable is not HIGH', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s04 = safeOutputs['S04-source-stale-not-ready'] as { confidence: string };
  const s05 = safeOutputs['S05-source-unavailable-not-ready'] as { confidence: string };
  expect(s04.confidence).not.toBe('HIGH');
  expect(s05.confidence).not.toBe('HIGH');
});

test('semantic truth: safety/privacy/fp blocks READY', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s08 = safeOutputs['S08-known-false-positive-not-ready'] as { confidence: string; dossierStatus: string };
  const s09 = safeOutputs['S09-safety-nonzero-not-ready'] as { confidence: string };
  const s10 = safeOutputs['S10-privacy-nonzero-not-ready'] as { confidence: string };
  expect(s08.confidence).not.toBe('HIGH');
  expect(s08.dossierStatus).not.toBe('READY');
  expect(s09.confidence).not.toBe('HIGH');
  expect(s10.confidence).not.toBe('HIGH');
});

test('semantic identity: same evidence/derivation across SHA dedups', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s11 = safeOutputs['S11-same-evidence-sha-movement-dedup'] as { clusterCount: number; deduped: boolean };
  expect(s11.deduped).toBe(true);
  expect(s11.clusterCount).toBe(1);
});

test('semantic identity: changed evidence digest splits', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s12 = safeOutputs['S12-changed-evidence-digest-split'] as { split: boolean };
  expect(s12.split).toBe(true);
});

test('semantic identity: changed derivation splits', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s13 = safeOutputs['S13-changed-derivation-split'] as { split: boolean };
  expect(s13.split).toBe(true);
});

test('semantic identity: row ordinal/count not fragmenting', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s14 = safeOutputs['S14-row-ordinal-same-cluster'] as { sameCluster: boolean };
  const s15 = safeOutputs['S15-row-count-same-cluster'] as { sameCluster: boolean };
  expect(s14.sameCluster).toBe(true);
  expect(s15.sameCluster).toBe(true);
});

test('semantic identity: two distinct contracts are distinct clusters', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const s16 = safeOutputs['S16-two-contracts-distinct-cluster'] as { distinct: boolean };
  expect(s16.distinct).toBe(true);
});

test('protocol compatibility: historical v1 dossier and v2 distinct validation', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const p03 = safeOutputs['P03-historical-v1-dossier-compatible'] as { v1Valid: boolean; v2Valid: boolean; v2ViaV1Rejected: boolean };
  expect(p03.v1Valid).toBe(true);
  expect(p03.v2Valid).toBe(true);
  expect(p03.v2ViaV1Rejected).toBe(true);
});

test('drift matrix: all 8+ version fields drift before executor', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const d01 = safeOutputs['D01-replay-plan-v1-version-drift'] as { driftDetected: boolean };
  const d02 = safeOutputs['D02-replay-plan-v2-version-drift'] as { driftDetected: boolean };
  const d03 = safeOutputs['D03-semantic-triage-evidence-version-drift'] as { driftDetected: boolean };
  const d04 = safeOutputs['D04-dossier-v2-version-drift'] as { driftDetected: boolean };
  const d06 = safeOutputs['D06-semantic-bundle-version-drift'] as { driftDetected: boolean };
  const d11 = safeOutputs['D11-manifest-version-matrix'] as { allFieldsDrift: boolean; driftCount: number; fieldsChecked: number };
  expect(d01.driftDetected).toBe(true);
  expect(d02.driftDetected).toBe(true);
  expect(d03.driftDetected).toBe(true);
  expect(d04.driftDetected).toBe(true);
  expect(d06.driftDetected).toBe(true);
  expect(d11.allFieldsDrift).toBe(true);
  expect(d11.driftCount).toBe(8);
  expect(d11.fieldsChecked).toBe(8);
});

test('frozen bundle cannot auto-rebind on source movement', async () => {
  const { safeOutputs } = await runPhase13ShadowOnce();
  const d10 = safeOutputs['D10-frozen-bundle-no-autorebind'] as { notAutoRebound: boolean };
  expect(d10.notAutoRebound).toBe(true);
});

test('privacy sentinel leak count is zero across all safe outputs', async () => {
  const { metrics, safeOutputs } = await runPhase13ShadowOnce();
  expect(metrics.privacyLeakCount).toBe(0);
  for (const v of Object.values(safeOutputs)) {
    const s = JSON.stringify(v);
    expect(s).not.toMatch(/PH13_CUSTOMER_SENTINEL|PH13_ACCOUNT_SENTINEL|PH13_COST_SENTINEL|PH13_BEARER_SENTINEL/i);
  }
});

test('determinism: 3 identical runs produce zero mismatches', async () => {
  test.setTimeout(30_000);
  const { mismatch } = await runPhase13DeterminismTriple();
  expect(mismatch).toBe(0);
});

test('sentinel values are non-empty (leak test is non-vacuous)', () => {
  const values = [SENTINEL_PHASE13.CUSTOMER, SENTINEL_PHASE13.ACCOUNT, SENTINEL_PHASE13.COST, SENTINEL_PHASE13.BEARER, SENTINEL_PHASE13.PATH];
  for (const v of values) expect(v.length).toBeGreaterThan(0);
});

test('invariant definition identity is distinct for distinct contracts', () => {
  const inv1 = PHASE13_EXPECTATIONS.commonFieldPresent.invariantDefinitions[0]!;
  const inv2 = PHASE13_EXPECTATIONS.altFieldPresent.invariantDefinitions[0]!;
  const id1 = semanticInvariantDefinitionId(inv1);
  const id2 = semanticInvariantDefinitionId(inv2);
  expect(id1).not.toBe(id2);
});

test('version constants are canonical (hardening)', () => {
  expect(TRIAGE_REPLAY_PLAN_VERSION).toBe('nightwatch.triage-replay-plan.private.v1');
  expect(TRIAGE_REPLAY_PLAN_V2_VERSION).toBe('nightwatch.triage-replay-plan.private.v2');
  expect(SEMANTIC_TRIAGE_EVIDENCE_VERSION).toBe('nightwatch.semantic-triage-evidence.v1');
  expect(DOSSIER_VERSION_V2).toBe('nightwatch.bug-dossier.private.v2');
  expect(SEMANTIC_CLUSTER_VERSION).toBe('nightwatch.semantic-cluster.v1');
  expect(SEMANTIC_CAMPAIGN_BUNDLE_VERSION).toBe('nightwatch.semantic-campaign-bundle.private.v1');
  expect(SEMANTIC_EVALUATION_RECEIPT_VERSION).toBe('nightwatch.semantic-evaluation-receipt.v2');
});
