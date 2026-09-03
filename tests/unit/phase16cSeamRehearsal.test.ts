// ---------------------------------------------------------------------------
// Phase 16C W8 — complete local synthetic seam rehearsal.
//
// canonical registries -> real approved universe -> plan -> inert handoff ->
// authorization admission -> restrictive budget mapping -> work-item binding
// -> existing prepareCampaign -> checkpoint -> existing resumeCampaign ->
// injected SYNTHETIC executor (+ owner-policy gate behavior).
//
// NO DEV. NO browser. NO network. NO auth state. Fully deterministic.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  ANOMALY_CLUSTER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  DOSSIER_VERSION,
} from '../../src/core/triage/types';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  type CampaignAnomalyCandidate,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION, type ChangeSet, type ChangedFile } from '../../src/core/changeIntelligence';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import { selectJourneys, changesetId } from '../../src/core/changeIntelligence';
import type { SourceFreshness } from '../../src/core/triage/types';
import {
  admitPortfolioRuntimePlan,
  mapPortfolioBudget,
} from '../../src/core/portfolio/runtimeBinding';
import type { CampaignPortfolioRuntimeBinding } from '../../src/core/campaign/types';
import {
  admitFixture,
  buildAdmissibleRuntimePlan,
  FIXTURE_TOKEN,
} from '../../corpus/phase16c/runtimeBindingFixtures';

const STATIC_NOW = '2026-08-23T01:00:00.000Z';
const REAL_SEEDS = ['0x0000000000000101', '0x0000000000000201', '0x0000000000000301'] as const;

const PRIVACY_POLICY: CampaignPrivacyPolicy = {
  storageClass: 'OWNER_ONLY_LOCAL',
  remotePrivacy: 'NO_REMOTE',
  externalPublication: 'PROHIBITED',
  rawBodiesPersisted: false,
  customerValuesPersisted: false,
  credentialsPersisted: false,
  cookiesPersisted: false,
  tokensPersisted: false,
  domPersisted: false,
  screenshotsPersisted: false,
  authenticatedTracesPersisted: false,
};

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase16c-source.v1',
  selectorVersion: SELECTOR_VERSION,
  dependencyMapVersion: DEPENDENCY_MAP_VERSION,
  journeyContractVersion: JOURNEY_CONTRACT_VERSION,
  journeyOracleVersion: ORACLE_VERSION,
  explorationCatalogVersion: SAFE_ACTION_CATALOG_VERSION,
  explorationModelVersion: EXPLORATION_MODEL_VERSION,
  explorationPlannerVersion: PLANNER_VERSION,
  apiCatalogVersion: API_CATALOG_VERSION,
  apiGeneratorVersion: SCENARIO_GENERATOR_VERSION,
  apiOracleVersion: 'nightwatch.api-oracle.phase5.v1',
  triageClusterVersion: ANOMALY_CLUSTER_VERSION,
  triageMinimizerVersion: FAILURE_MINIMIZATION_VERSION,
  dossierVersion: DOSSIER_VERSION,
  ownerScopePolicyVersion: OWNER_SCOPE_POLICY_VERSION,
  privateArtifactPolicyVersion: PRIVATE_ARTIFACT_POLICY_VERSION,
  seedCorpusVersion: 'nightwatch.phase7.real-dev-seeds.v1',
  budgetPolicyVersion: INITIAL_REAL_CAMPAIGN_BUDGET.policyVersion,
  triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
  triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: DOSSIER_VERSION_V2,
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
  semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
};

function snapshots(): readonly CampaignSourceSnapshot[] {
  return RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    branch: (repo.trackingRef ?? 'origin/main').replace(/^origin\//, ''),
    headSha: repo.checkedOutSha,
    trackingRef: repo.trackingRef,
    trackingSha: repo.checkedOutSha,
    ahead: 0,
    behind: 0,
    dirty: false,
    dirtyFileCount: 0,
    sourceMapSha: repo.sourceMapSha,
    freshness: 'LOCAL_TRACKING_REF_ONLY' as SourceFreshness,
    readOnly: true as const,
  }));
}

function sourceWindow(): {
  readonly changesetId: string;
  readonly baselines: readonly { readonly repoId: string; readonly baseSha: string; readonly headSha: string; readonly dirtyExcluded: true }[];
  readonly changedFiles: readonly ChangedFile[];
  readonly dirtyFiles: readonly { readonly repoId: string; readonly path: string; readonly status: string }[];
  readonly sourceWindow: ChangeSet['sourceWindow'];
  readonly deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
} {
  return {
    changesetId: changesetId({ repoBaselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, mergeBase: repo.checkedOutSha, rangeSemantics: 'BASE_SHA_TO_HEAD_SHA' as const, source: 'LOCAL_COMMITTED_CHANGE' as const, dirtyExcluded: true })), changedFiles: [], selectorVersion: SELECTOR_VERSION }),
    baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
    changedFiles: [],
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
}

/** Full local seam through admission into an existing campaign manifest. */
function portfolioCampaignInput(binding: CampaignPortfolioRuntimeBinding): CampaignInput {
  const mappedBudget = mapPortfolioBudget({
    binding,
    initial: INITIAL_REAL_CAMPAIGN_BUDGET,
  }).policy;
  return {
    mode: 'BASELINE_HEALTH',
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: sourceWindow(),
    changeset: null,
    phase3Selection: null,
    seedCorpusVersion: 'nightwatch.phase7.real-dev-seeds.v1',
    seedSet: [...REAL_SEEDS],
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: mappedBudget,
    privacyPolicy: PRIVACY_POLICY,
    ...(binding === undefined ? {} : { portfolioBinding: binding }),
  };
}

interface CountingExecutorOptions {
  readonly preflightCode?: 'PREFLIGHT_PASS' | 'OWNER_POLICY_BLOCKED';
}

function countingExecutor(counts: { preflight: number; execute: number }, options: CountingExecutorOptions = {}) {
  const outcome = (workItem: CampaignWorkItem): CampaignExecutionOutcome => ({
    result: 'PASS',
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
    privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
    actionsExecuted: 1,
    apiExecutions: workItem.kind === 'API' ? (workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1) : 0,
    browserContextCreated: workItem.kind !== 'API',
    replay: false,
    observations: [] as readonly CampaignAnomalyCandidate[],
  });
  return {
    preflight: () => {
      counts.preflight += 1;
      if (options.preflightCode === 'OWNER_POLICY_BLOCKED') {
        return { passed: false, code: 'OWNER_POLICY_BLOCKED' as const, failedChecks: ['owner-scope-policy'], checkedAt: STATIC_NOW };
      }
      return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
    },
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
      counts.execute += 1;
      return outcome(workItem);
    },
  };
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase16c-rehearsal-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

test.describe('Phase 16C seam rehearsal (W8)', () => {
  test('deterministic end-to-end: admission x3 produce identical bindings and manifests', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
      const binding = admitFixture({ universe, plan, handoff });
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      seen.add(JSON.stringify({
        binding,
        campaignId: manifest.campaignId,
        fingerprint: manifest.manifestFingerprint,
        workItems: manifest.workItems.map((item) => item.workItemId),
        selectedJourneys: manifest.selectedJourneys,
        selectedApis: manifest.selectedApiScenarios,
        budget: manifest.budgetPolicy,
        versions: manifest.versions,
      }));
    }
    expect(seen.size).toBe(1);
  });

  test('bound work items exist exactly once in the frozen manifest', () => {
    const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
    const binding = admitFixture({ universe, plan, handoff });
    const manifest = createCampaignManifest(portfolioCampaignInput(binding));
    const ids = manifest.workItems.map((item) => item.workItemId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const member of binding.members) {
      expect(ids).toContain(member.workItemId);
      // unmappedSelectedMemberCount floor: every selected member maps exactly once.
      expect(ids.filter((id) => id === member.workItemId)).toHaveLength(1);
    }
    // No hidden extra work beyond the admitted plan membership.
    expect(manifest.workItems.length).toBe(binding.members.length);
    // Budget never expands beyond the bounded real profile (budgetExpansionCount floor).
    expect(manifest.budgetPolicy.maxJourneyContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxJourneyContexts);
    expect(manifest.budgetPolicy.maxExplorationContexts).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxExplorationContexts);
    expect(manifest.budgetPolicy.maxApiExecutions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxApiExecutions);
    expect(manifest.budgetPolicy.maxTotalActions).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalActions);
    expect(manifest.budgetPolicy.maxRuntimeMs).toBeLessThanOrEqual(INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs);
  });

  test('prepare freezes ordinal-zero checkpoint with zero executor invocations; resume runs the synthetic executor once per item', async () => {
    const { root, store } = tempStore();
    try {
      const counts = { preflight: 0, execute: 0 };
      const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
      const binding = admitPortfolioRuntimePlan({
        universe, plan, handoff,
        authorizationToken: FIXTURE_TOKEN,
      });
      // executorBeforeAdmissionCount floor: no executor exists until after admission.
      expect(counts.execute).toBe(0);
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      const checkpoint = prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW), currentVersions: VERSIONS });
      expect(checkpoint.checkpointOrdinal).toBe(0);
      expect(checkpoint.completedWorkItemIds).toEqual([]);
      expect(counts.execute).toBe(0);
      expect(counts.preflight).toBe(0);

      const resumed = await resumeCampaign(manifest, countingExecutor(counts), {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
        currentVersions: () => VERSIONS,
      });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(counts.execute).toBe(manifest.workItems.length);
      // Every executed item belongs to the frozen binding (no escape).
      const boundIds = new Set(binding.members.map((member) => member.workItemId));
      for (const record of resumed.checkpoint.executionLedger) {
        expect(boundIds.has(record.workItemId)).toBe(true);
      }
      // Privacy/safety floors hold on the synthetic run.
      expect(resumed.checkpoint.privacyStatus).toBe('PASS');
      expect(Object.values(resumed.checkpoint.safety).every((value) => value === 0)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('owner-policy gate stops before the executor (ABORTED_OWNER_POLICY)', async () => {
    const { root, store } = tempStore();
    try {
      const counts = { preflight: 0, execute: 0 };
      const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
      const binding = admitFixture({ universe, plan, handoff });
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) });
      const result = await resumeCampaign(manifest, countingExecutor(counts, { preflightCode: 'OWNER_POLICY_BLOCKED' }), {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      expect(result.resultClass).toBe('ABORTED_OWNER_POLICY');
      expect(result.stopReason).toBe('OWNER_POLICY_BLOCKED');
      expect(counts.execute).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('resume refuses checkpoint/tampered-manifest/version drift BEFORE the executor runs', async () => {
    const { root, store } = tempStore();
    try {
      const counts = { preflight: 0, execute: 0 };
      const { universe, plan, handoff } = buildAdmissibleRuntimePlan();
      const binding = admitFixture({ universe, plan, handoff });
      const manifest = createCampaignManifest(portfolioCampaignInput(binding));
      prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW), currentVersions: VERSIONS });

      // Checkpoint fingerprint escape attempt.
      await expect(resumeCampaign(manifest, countingExecutor(counts), {
        checkpointStore: new DriftedCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      })).rejects.toThrow(/CAMPAIGN_/);
      expect(counts.execute).toBe(0);

      // Frozen-binding field tamper: identity recomputation fails closed.
      const tamperedInput = portfolioCampaignInput(binding);
      const tamperedBinding = JSON.parse(JSON.stringify(tamperedInput.portfolioBinding)) as Record<string, unknown>;
      tamperedBinding.budgetMappingVersion = 'nightwatch.portfolio-budget-mapping.v0';
      const tamperedManifest = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>;
      tamperedManifest.portfolioBinding = tamperedBinding;
      tamperedManifest.manifestFingerprint = manifest.manifestFingerprint;
      const { validateCampaignManifest } = await import('../../src/core/campaign/identity');
      expect(() => validateCampaignManifest(tamperedManifest)).toThrow(/CAMPAIGN_(MANIFEST_INTEGRITY_INVALID|ID_RECOMPUTATION_MISMATCH)/);

      // Runtime version drift at resume: the existing orchestrator refuses
      // with a structured CAMPAIGN_VERSION_DRIFT stop BEFORE any executor use.
      const drifted = await resumeCampaign(manifest, countingExecutor(counts), {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
        currentVersions: () => ({ ...VERSIONS, nightwatchSourceSha: 'drifted-source.v2' }),
      });
      expect(drifted.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(drifted.stopReason).toBe('CAMPAIGN_VERSION_DRIFT');
      expect(counts.execute).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('changing the portfolio plan yields a NEW campaign identity (new prepare required)', () => {
    const first = buildAdmissibleRuntimePlan({ totalUnits: 24, perMemberCeiling: 6 });
    const second = buildAdmissibleRuntimePlan({ totalUnits: 24, perMemberCeiling: 4 });
    const bindingA = admitFixture(first);
    const bindingB = admitFixture(second);
    if (JSON.stringify(bindingA.members) === JSON.stringify(bindingB.members) && bindingA.planId === bindingB.planId) {
      throw new Error('fixture expected distinct plans');
    }
    const manifestA = createCampaignManifest(portfolioCampaignInput(bindingA));
    const manifestB = createCampaignManifest(portfolioCampaignInput(bindingB));
    expect(manifestA.campaignId).not.toBe(manifestB.campaignId);
    expect(manifestA.manifestFingerprint).not.toBe(manifestB.manifestFingerprint);
  });

  test('legacy non-portfolio campaigns remain fully compatible', async () => {
    const { root, store } = tempStore();
    try {
      const legacyInput: CampaignInput = {
        mode: 'LOCAL_SYNTHETIC',
        createdAt: STATIC_NOW,
        sourceSnapshots: snapshots(),
        sourceWindow: sourceWindow(),
        changeset: null,
        phase3Selection: null,
        seedCorpusVersion: 'nightwatch.phase7.synthetic-seeds.v1',
        seedSet: [...REAL_SEEDS],
        safeActions: RIPPLE_PHASE4_ACTIONS,
        explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
        apiOperations: PHASE5_API_CATALOG.operations,
        versions: { ...VERSIONS, seedCorpusVersion: 'nightwatch.phase7.synthetic-seeds.v1' },
        budgetPolicy: {
          ...INITIAL_REAL_CAMPAIGN_BUDGET,
          maxExplorationContexts: 3,
          maxApiExecutions: 12,
          maxTotalActions: 100,
          maxRuntimeMs: 60_000,
          maxPerTestTimeoutMs: 5_000,
          maxPromotedClusters: 3,
        },
        privacyPolicy: PRIVACY_POLICY,
      };
      const manifest = createCampaignManifest(legacyInput);
      expect(manifest.portfolioBinding).toBeUndefined();
      expect(selectJourneys !== undefined).toBe(true);
      const counts = { preflight: 0, execute: 0 };
      prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW), currentVersions: manifest.versions });
      const resumed = await resumeCampaign(manifest, countingExecutor(counts), {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
        currentVersions: () => manifest.versions,
      });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(counts.execute).toBe(manifest.workItems.length);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('sentinel sweep: produced documents and errors carry no sentinel material', () => {
    const { universe, plan, handoff, document } = buildAdmissibleRuntimePlan();
    const binding = admitFixture({ universe, plan, handoff });
    const surfaces = [
      renderSafe(document),
      renderSafe(binding),
      renderSafe(plan),
      renderSafe(handoff),
    ];
    const sentinel = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
    for (const surface of surfaces) {
      expect(sentinel.test(surface)).toBe(false);
    }
  });
});

function renderSafe(value: unknown): string {
  return JSON.stringify(value);
}

/** Checkpoint store wrapper that corrupts the persisted fingerprint. */
class DriftedCheckpointStore extends CampaignCheckpointStore {
  readCheckpoint(campaignId: string, manifest?: Parameters<CampaignCheckpointStore['readCheckpoint']>[1]): ReturnType<CampaignCheckpointStore['readCheckpoint']> {
    const checkpoint = super.readCheckpoint(campaignId, manifest) as unknown as Record<string, unknown>;
    checkpoint.manifestFingerprint = 'manifest:sha256:ffffffffffffffffffffffff';
    return checkpoint as unknown as ReturnType<CampaignCheckpointStore['readCheckpoint']>;
  }
}
