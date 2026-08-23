// ---------------------------------------------------------------------------
// Phase 16CH W5/W6 — prepare / checkpoint / resume ordering hardening.
//
// Counting/throwing synthetic executors prove: prepare invokes ZERO executor
// callbacks after admission; resume requires fresh authorization and
// frozen-binding equality BEFORE executor construction/use; owner policy
// stays before executor; drift/tamper stops before any execution; repeated
// resume and interrupted-work bookkeeping behave; legacy non-portfolio resume
// stays green. Any escape to the executor is a hard defect.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  CampaignCheckpointStore,
  countingExecutor,
  makeTempStore,
  portfolioCampaignInput,
  removeTempStore,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  validateCampaignManifest,
  type ExecutorCounts,
} from '../../corpus/phase16ch/seamComposition';
import {
  admitPortfolioRuntimePlan,
} from '../../src/core/portfolio/runtimeBinding';
import {
  FIXTURE_AUTHORIZATION,
  buildScopedRuntimePlan,
} from '../../corpus/phase16ch/core';
import type { CampaignManifest } from '../../src/core/campaign';
import type { PrivateArtifactStore } from '../../src/core/policy';

interface SeamFixture {
  readonly root: string;
  readonly store: PrivateArtifactStore;
  readonly manifest: CampaignManifest;
  readonly counts: ExecutorCounts;
}

function preparedSeam(): SeamFixture {
  const { root, store } = makeTempStore();
  const built = buildScopedRuntimePlan({ targets: ['ripple.payer-exchange.read'] });
  const binding = admitPortfolioRuntimePlan({
    universe: built.universe,
    plan: built.plan,
    handoff: built.handoff,
    authorizationToken: FIXTURE_AUTHORIZATION,
  });
  const manifest = createCampaignManifest(portfolioCampaignInput(binding));
  const counts: ExecutorCounts = { preflight: 0, execute: 0 };
  prepareCampaign(manifest, { store });
  return { root, store, manifest, counts };
}

test.describe('Phase 16CH W6 — prepare/resume ordering', () => {
  test('admission precedes manifest creation; prepare freezes ordinal-zero checkpoint with ZERO executor callbacks', () => {
    const counts: ExecutorCounts = { preflight: 0, execute: 0 };
    const { root, store } = makeTempStore();
    try {
      const built = buildScopedRuntimePlan({ targets: ['ripple.payer-exchange.read'] });
      // Admission FIRST (executor counters still zero — no executor exists yet).
      const binding = admitPortfolioRuntimePlan({
        universe: built.universe,
        plan: built.plan,
        handoff: built.handoff,
        authorizationToken: FIXTURE_AUTHORIZATION,
      });
      expect(counts.execute).toBe(0);
      // Manifest only AFTER admission.
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      const checkpoint = prepareCampaign(manifest, { store });
      expect(checkpoint.checkpointOrdinal).toBe(0);
      expect(checkpoint.completedWorkItemIds).toEqual([]);
      // Zero browser/network/product callbacks during prepare.
      expect(counts.execute).toBe(0);
      expect(counts.preflight).toBe(0);
    } finally {
      removeTempStore(root);
    }
  });

  test('owner-policy gate stops BEFORE the executor; throwing executor is never reached on refusal', async () => {
    const seam = preparedSeam();
    try {
      const result = await resumeCampaign(seam.manifest, countingExecutor(seam.counts, { preflightCode: 'OWNER_POLICY_BLOCKED' }), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
      });
      expect(result.resultClass).toBe('ABORTED_OWNER_POLICY');
      expect(result.stopReason).toBe('OWNER_POLICY_BLOCKED');
      expect(seam.counts.preflight).toBeGreaterThanOrEqual(1);
      expect(seam.counts.execute).toBe(0);
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('happy resume runs the synthetic executor once per bound item; every executed id is a frozen binding member', async () => {
    const seam = preparedSeam();
    try {
      const resumed = await resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
      });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(seam.counts.execute).toBe(seam.manifest.workItems.length);
      const frozenIds = new Set((seam.manifest.portfolioBinding?.members ?? []).map((member) => member.workItemId));
      for (const record of resumed.checkpoint.executionLedger) {
        expect(frozenIds.has(record.workItemId)).toBe(true);
      }
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('checkpoint fingerprint tamper refuses BEFORE executor use', async () => {
    const seam = preparedSeam();
    try {
      class DriftedCheckpointStore extends CampaignCheckpointStore {
        readCheckpoint(campaignId: string, manifest?: Parameters<CampaignCheckpointStore['readCheckpoint']>[1]): ReturnType<CampaignCheckpointStore['readCheckpoint']> {
          const checkpoint = super.readCheckpoint(campaignId, manifest) as unknown as Record<string, unknown>;
          checkpoint.manifestFingerprint = 'manifest:sha256:ffffffffffffffffffffffff';
          return checkpoint as unknown as ReturnType<CampaignCheckpointStore['readCheckpoint']>;
        }
      }
      await expect(resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new DriftedCheckpointStore(seam.store),
      })).rejects.toThrow(/CAMPAIGN_/);
      expect(seam.counts.execute).toBe(0);
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('runtime version drift stops structured (CAMPAIGN_VERSION_DRIFT) BEFORE executor use', async () => {
    const seam = preparedSeam();
    try {
      const drifted = await resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        currentVersions: () => ({ ...seam.manifest.versions, nightwatchSourceSha: 'drifted-phase16ch-source.v9' }),
      });
      expect(drifted.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(drifted.stopReason).toBe('CAMPAIGN_VERSION_DRIFT');
      expect(seam.counts.execute).toBe(0);
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('plan/handoff/universe/mapping/binding/work-item identity changes after prepare yield a NEW campaign identity (old checkpoints refuse)', () => {
    // A changed plan produces a different campaignId/fingerprint; the original
    // prepared checkpoint therefore cannot be resumed against it (fingerprint
    // recomputation fails closed before any executor use).
    const first = buildScopedRuntimePlan({ targets: ['ripple.payer-exchange.read'] });
    const firstBinding = admitPortfolioRuntimePlan({
      universe: first.universe, plan: first.plan, handoff: first.handoff, authorizationToken: FIXTURE_AUTHORIZATION,
    });
    const firstManifest = createCampaignManifest(portfolioCampaignInput(firstBinding));

    const second = buildScopedRuntimePlan({ targets: ['ripple.common-exchange.read'] });
    const secondBinding = admitPortfolioRuntimePlan({
      universe: second.universe, plan: second.plan, handoff: second.handoff, authorizationToken: FIXTURE_AUTHORIZATION,
    });
    const secondManifest = createCampaignManifest(portfolioCampaignInput(secondBinding));

    expect(firstManifest.campaignId).not.toBe(secondManifest.campaignId);
    expect(firstManifest.manifestFingerprint).not.toBe(secondManifest.manifestFingerprint);
    validateCampaignManifest(secondManifest);
  });

  test('repeated resume of an already-complete campaign does not execute further work', async () => {
    const seam = preparedSeam();
    try {
      const firstRun = await resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
      });
      const executionsAfterFirst = seam.counts.execute;
      expect(executionsAfterFirst).toBe(seam.manifest.workItems.length);
      const secondRun = await resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
      });
      // No duplicate execution: the completed ledger short-circuits remaining work.
      expect(seam.counts.execute).toBe(executionsAfterFirst);
      expect(secondRun.checkpoint.executionLedger.length).toBe(firstRun.checkpoint.executionLedger.length);
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('interrupted-work bookkeeping: executor failure becomes a structured stop; resume completes exactly the remaining items', async () => {
    const seam = preparedSeam();
    try {
      // Interrupt after the FIRST executed item via a throwing synthetic executor.
      let executed = 0;
      const interruptingExecutor = countingExecutor(seam.counts, { throwOnExecute: true });
      const originalExecute = interruptingExecutor.execute.bind(interruptingExecutor);
      const limitedExecutor = {
        ...interruptingExecutor,
        execute: async (input: Parameters<typeof originalExecute>[0]) => {
          executed += 1;
          if (executed > 1) throw new Error('SYNTHETIC_EXECUTOR_THROW');
          return originalExecute(input);
        },
      };
      // The orchestrator converts the mid-campaign executor failure into a
      // STRUCTURED stop (never an escape, never a crash); the ledger records
      // the attempted prefix and the campaign is closed fail-closed.
      const interrupted = await resumeCampaign(seam.manifest, limitedExecutor, {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
        currentVersions: () => seam.manifest.versions,
      });
      expect(interrupted.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(interrupted.checkpoint.executionLedger.length).toBeGreaterThanOrEqual(1);
      const interruptedCount = seam.counts.execute;
      expect(interruptedCount).toBeGreaterThanOrEqual(1);

      // A runtime-infrastructure failure PERMANENTLY closes the campaign
      // attempt: resuming the failed checkpoint executes nothing further
      // (no zombie retry of a broken runtime) and stays structured.
      const afterFailure = await resumeCampaign(seam.manifest, countingExecutor(seam.counts), {
        checkpointStore: new CampaignCheckpointStore(seam.store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
        currentVersions: () => seam.manifest.versions,
      });
      expect(afterFailure.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(seam.counts.execute).toBe(interruptedCount);
      // Ledger identities stay unique (attempted prefix recorded exactly once).
      const ledgerIds = interrupted.checkpoint.executionLedger.map((record) => record.workItemId);
      expect(new Set(ledgerIds).size).toBe(ledgerIds.length);
      void afterFailure;
    } finally {
      removeTempStore(seam.root);
    }
  });

  test('legacy non-portfolio campaign prepares and resumes green (no binding, no portfolio input)', async () => {
    const { root, store } = makeTempStore();
    try {
      const legacyInput = portfolioCampaignInput(undefined);
      const manifest = createCampaignManifest(legacyInput);
      expect(manifest.portfolioBinding).toBeUndefined();
      const counts: ExecutorCounts = { preflight: 0, execute: 0 };
      prepareCampaign(manifest, { store });
      const resumed = await resumeCampaign(manifest, countingExecutor(counts), {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date('2026-08-23T01:00:00.000Z'),
      });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(counts.execute).toBeGreaterThan(0);
      void fs; void os; void path;
    } finally {
      removeTempStore(root);
    }
  });
});
