// ---------------------------------------------------------------------------
// Phase 15P A09 — checkpoint / resume / version-drift truth matrices.
//
// Proves, with synthetic fixtures only:
// - every version component (campaign version fingerprint slots incl.
//   replay-plan / semantic-bundle / dossier / derivation versions, checkpoint
//   schema version, Session-2 runtime contract versions, per-record lifecycle
//   versions) participates in resume compatibility and fails closed;
// - one-at-a-time AND multi-field drift matrices classify each drift kind
//   deterministically (classifyVersionFingerprintDrift,
//   classifyCheckpointResumeDrift);
// - resume with ANY incompatible version component stops BEFORE any executor
//   callback is reachable (preflight/execute call counts stay zero);
// - reservation/retry semantics on resume: a reserved-but-incomplete work
//   item resumes exactly once, retries are recorded and bounded by the frozen
//   budget;
// - checkpoint round-trip stability and construction determinism.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  CampaignOrchestrator,
  CampaignProcessInterruptionError,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  assertManifestCompatible,
  classifyCheckpointResumeDrift,
  classifyCheckpointRuntimeContracts,
  classifyVersionFingerprintDrift,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  runCampaign,
  stableCampaignJson,
  validateCampaignCheckpoint,
  type CampaignBudgetPolicy,
  type CampaignCheckpoint,
  type CampaignExecutionOutcome,
  type CampaignExecutor,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { ANOMALY_CLUSTER_VERSION, DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION, type SourceFreshness } from '../../src/core/triage/types';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { OWNER_SCOPE_POLICY_VERSION, PRIVATE_ARTIFACT_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';

const STATIC_NOW = '2026-08-13T01:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201', '0x0000000000000301'] as const;
const SYNTHETIC_CLUSTER_ID = 'cluster:sha256:syntheticphase150000000';
const SYNTHETIC_RUN_ID = 'observation:phase15p-synthetic';

const TEST_BUDGET: CampaignBudgetPolicy = Object.freeze({
  ...INITIAL_REAL_CAMPAIGN_BUDGET,
  maxTotalBrowserContexts: 6,
  maxJourneyContexts: 3,
  maxExplorationContexts: 3,
  maxApiExecutions: 12,
  maxReplays: 70,
  maxMinimizationCandidates: 64,
  maxTotalActions: 100,
  maxRuntimeMs: 60_000,
  maxPerTestTimeoutMs: 5_000,
  maxPromotedClusters: 3,
  maxPrivateEvidenceBytes: 20 * 1024 * 1024,
});

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

/**
 * Enlarged headroom for the interrupted-resume proof: the retry reservation
 * for the first work item consumes one extra journey/browser/replay unit on
 * top of the full BASELINE_HEALTH selection (mirrors the established
 * campaign.test.ts retry-test budget).
 */
const RETRY_TEST_BUDGET: CampaignBudgetPolicy = Object.freeze({
  ...TEST_BUDGET,
  maxTotalBrowserContexts: 10,
  maxJourneyContexts: 5,
  maxApiExecutions: 40,
  maxReplays: 100,
  maxTotalActions: 1_000,
  maxPrivateEvidenceBytes: 64 * 1024 * 1024,
});

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase15p-source.v1',
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
  seedCorpusVersion: 'nightwatch.phase15p.synthetic-seeds.v1',
  budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
  triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
  triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: DOSSIER_VERSION_V2,
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
  semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
};

/** Fingerprint slots whose values are pinned identity literals, not free strings. */
const IDENTITY_LITERAL_SLOTS = ['campaignSchemaVersion', 'orchestratorVersion'] as const;

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

function inputFor(mode: CampaignInput['mode']): CampaignInput {
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase15p-drift',
      baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
      changedFiles: [],
      dirtyFiles: [],
      sourceWindow: 'COMMITTED_ONLY',
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
    },
    changeset: null,
    phase3Selection: null,
    seedCorpusVersion: VERSIONS.seedCorpusVersion,
    seedSet: SEEDS,
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: TEST_BUDGET,
    privacyPolicy: PRIVACY_POLICY,
  };
}

function driftedVersions(slots: readonly string[]): CampaignVersionFingerprint {
  const value: Record<string, unknown> = { ...VERSIONS };
  for (const slot of slots) value[slot] = `${String(value[slot])}-p15pdrift`;
  return value as unknown as CampaignVersionFingerprint;
}

interface PreparedFixture {
  readonly root: string;
  readonly store: PrivateArtifactStore;
  readonly manifest: CampaignManifest;
  readonly checkpoint: CampaignCheckpoint;
  readonly checkpointPath: string;
}

/** Fresh ordinal-zero manifest+checkpoint pair, built without any executor. */
function preparedFixture(mode: CampaignInput['mode'] = 'BASELINE_HEALTH', budgetPolicy: CampaignBudgetPolicy = TEST_BUDGET): PreparedFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-drift-'));
  const store = new PrivateArtifactStore({ root });
  const manifest = createCampaignManifest({ ...inputFor(mode), budgetPolicy });
  const checkpoint = prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) });
  const checkpointPath = new CampaignCheckpointStore(store).paths(manifest.campaignId).checkpoint;
  return { root, store, manifest, checkpoint, checkpointPath };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function cloneWith(change: (value: Record<string, any>) => void): (checkpoint: CampaignCheckpoint) => Record<string, unknown> {
  return (checkpoint: CampaignCheckpoint) => {
    const value = JSON.parse(JSON.stringify(checkpoint)) as Record<string, any>;
    change(value);
    return value;
  };
}

/** Adds one synthetic observation + cluster so lifecycle keys can reference a real ledger entry. */
const withSyntheticCluster = (change: (value: Record<string, any>) => void) => (value: Record<string, any>): void => {
  value.anomalyObservations = [{ runId: SYNTHETIC_RUN_ID, fingerprint: 'fp:sha256:phase15psynthetic00000' }];
  value.anomalyClusters = [{ clusterId: SYNTHETIC_CLUSTER_ID, primaryRunId: SYNTHETIC_RUN_ID, runIds: [SYNTHETIC_RUN_ID] }];
  change(value);
};

function lifecycleRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lifecycleVersion: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle,
    variant: 'PROTOCOL_ONLY',
    state: 'OBSERVED',
    transitionCount: 0,
    lastReasonCode: null,
    ...overrides,
  };
}

interface CountingExecutor {
  readonly executor: CampaignExecutor;
  readonly calls: { preflight: number; execute: number; items: string[] };
}

function countingExecutor(outcomeOverrides: Partial<CampaignExecutionOutcome> = {}): CountingExecutor {
  const calls = { preflight: 0, execute: 0, items: [] as string[] };
  const executor: CampaignExecutor = {
    preflight: () => {
      calls.preflight += 1;
      return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
    },
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
      calls.execute += 1;
      calls.items.push(workItem.workItemId);
      return {
        result: 'PASS',
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
        privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
        actionsExecuted: 0,
        apiExecutions: workItem.kind === 'API' ? (workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1) : 0,
        browserContextCreated: workItem.kind !== 'API',
        replay: false,
        observations: [],
        ...outcomeOverrides,
      };
    },
  };
  return { executor, calls };
}

test.describe('Phase 15P A09 runtime-fingerprint drift matrices', () => {
  test('every fingerprint slot drifted alone changes campaign identity and is classified exactly', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const slots = Object.keys(VERSIONS);
      expect(slots.length).toBeGreaterThanOrEqual(28);
      for (const slot of slots) {
        const drifted = driftedVersions([slot]);
        // Slot-level classification is exact for every slot, including the
        // pinned identity literals.
        expect(classifyVersionFingerprintDrift(drifted, VERSIONS), slot).toEqual([slot]);
        expect(classifyVersionFingerprintDrift(VERSIONS, VERSIONS)).toEqual([]);
        if ((IDENTITY_LITERAL_SLOTS as readonly string[]).includes(slot)) {
          // Pinned identity literals cannot form a manifest at all: creation
          // itself fails closed before any persistence or executor exists.
          expect(() => createCampaignManifest({ ...inputFor('BASELINE_HEALTH'), versions: drifted }), slot)
            .toThrow(/VERSION_IDENTITY_MISMATCH/);
          continue;
        }
        const driftedManifest = createCampaignManifest({ ...inputFor('BASELINE_HEALTH'), versions: drifted });
        // Participation proof: the slot digests into campaign identity.
        expect(driftedManifest.campaignId, slot).not.toBe(manifest.campaignId);
        expect(driftedManifest.manifestFingerprint, slot).not.toBe(manifest.manifestFingerprint);
        // Resume-boundary rejection in both directions.
        expect(() => assertManifestCompatible(driftedManifest, { campaignId: manifest.campaignId, manifestFingerprint: manifest.manifestFingerprint }), slot)
          .toThrow('CAMPAIGN_VERSION_DRIFT');
        expect(() => assertManifestCompatible(manifest, { campaignId: driftedManifest.campaignId, manifestFingerprint: driftedManifest.manifestFingerprint }), slot)
          .toThrow('CAMPAIGN_VERSION_DRIFT');
        expect(() => validateCampaignCheckpoint(JSON.parse(JSON.stringify(checkpoint)), driftedManifest), slot)
          .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_ID_MISMATCH');
        // The pure classifier names the persisted-side drift kind too.
        expect(classifyCheckpointResumeDrift(checkpoint, driftedManifest), slot).toEqual({
          compatible: false,
          kind: 'CAMPAIGN_IDENTITY_DRIFT',
          driftedFields: ['campaignId', 'manifestFingerprint'],
        });
      }
    } finally {
      cleanup(root);
    }
  });

  test('multi-field fingerprint drift combinations are classified as the exact sorted slot set', () => {
    const combos: readonly (readonly string[])[] = [
      ['semanticBundleVersion', 'dossierVersion'],
      ['triageReplayPlanV2Version', 'semanticExpectationDerivationVersion'],
      ['dossierV2Version', 'semanticBundleVersion', 'semanticExpectationDerivationVersion'],
      [...Object.keys(VERSIONS)],
    ];
    for (const combo of combos) {
      const drifted = driftedVersions(combo);
      expect(classifyVersionFingerprintDrift(drifted, VERSIONS), combo.join('+')).toEqual([...combo].sort((a, b) => a.localeCompare(b)));
      if (combo.some((slot) => (IDENTITY_LITERAL_SLOTS as readonly string[]).includes(slot))) continue;
      const driftedManifest = createCampaignManifest({ ...inputFor('BASELINE_HEALTH'), versions: drifted });
      expect(driftedManifest.campaignId).not.toBe(createCampaignManifest(inputFor('BASELINE_HEALTH')).campaignId);
      expect(() => assertManifestCompatible(driftedManifest, { campaignId: createCampaignManifest(inputFor('BASELINE_HEALTH')).campaignId, manifestFingerprint: createCampaignManifest(inputFor('BASELINE_HEALTH')).manifestFingerprint }))
        .toThrow('CAMPAIGN_VERSION_DRIFT');
    }
  });

  test('runtime currentVersions drift at resume stops before preflight or execute for single and multi-slot drift', async () => {
    const cases: readonly (readonly string[])[] = [
      ['nightwatchSourceSha'],
      ['semanticBundleVersion'],
      ['triageReplayPlanV2Version'],
      ['dossierVersion'],
      ['semanticExpectationDerivationVersion'],
      ['semanticBundleVersion', 'dossierV2Version', 'semanticReceiptVersion'],
    ];
    for (const slots of cases) {
      const { root, store, manifest } = preparedFixture();
      const harness = countingExecutor();
      try {
        const result = await resumeCampaign(manifest, harness.executor, {
          checkpointStore: new CampaignCheckpointStore(store),
          now: () => new Date(STATIC_NOW),
          currentVersions: driftedVersions(slots),
        });
        expect(result.resultClass, slots.join('+')).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
        expect(result.stopReason, slots.join('+')).toBe('CAMPAIGN_VERSION_DRIFT');
        expect(result.checkpoint.versionDrift).toEqual(['CAMPAIGN_VERSION_DRIFT']);
        expect(harness.calls.preflight).toBe(0);
        expect(harness.calls.execute).toBe(0);
        expect(classifyVersionFingerprintDrift(driftedVersions(slots), VERSIONS)).toEqual([...slots].sort((a, b) => a.localeCompare(b)));
      } finally {
        cleanup(root);
      }
    }
  });

  test('positive control: the same resume harness reaches the executor when no version component drifted', async () => {
    const { root, store, manifest } = preparedFixture();
    const harness = countingExecutor();
    try {
      const result = await resumeCampaign(manifest, harness.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
        currentVersions: VERSIONS,
      });
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(harness.calls.preflight).toBeGreaterThan(0);
      expect(harness.calls.execute).toBeGreaterThan(0);
      expect(result.checkpoint.versionDrift).toEqual([]);
    } finally {
      cleanup(root);
    }
  });
});

test.describe('Phase 15P A09 checkpoint-boundary drift matrices', () => {
  test('checkpoint schema version drift alone fails closed at validation, read, and resume', () => {
    const { root, manifest, checkpoint, checkpointPath, store } = preparedFixture();
    try {
      const mutated = cloneWith((value) => {
        value.schemaVersion = 'nightwatch.campaign-checkpoint.private.v2';
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(mutated, manifest)).toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:SCHEMA_INVALID');
      expect(classifyCheckpointResumeDrift(mutated, manifest)).toEqual({
        compatible: false,
        kind: 'CHECKPOINT_SCHEMA_VERSION_DRIFT',
        driftedFields: ['schemaVersion'],
      });
      // Persisted-bytes path: resume refuses before any callback exists.
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
      raw.checkpoint.schemaVersion = 'nightwatch.campaign-checkpoint.private.v2';
      fs.writeFileSync(checkpointPath, JSON.stringify(raw));
      expect(() => new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest)).toThrow(/SCHEMA_INVALID/);
    } finally {
      cleanup(root);
    }
  });

  test('each runtime-contract slot drifted alone and every multi-slot combination fails closed identically', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const slots = ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const;
      const combos: readonly (readonly (typeof slots)[number][])[] = [
        ...slots.map((slot) => [slot] as const),
        ['candidateLifecycle', 'replayBinding'] as const,
        ['replayBinding', 'promotionResult'] as const,
        ['candidateLifecycle', 'promotionResult'] as const,
        ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const,
      ];
      for (const combo of combos) {
        const mutated = cloneWith((value) => {
          value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
          for (const slot of combo) value.runtimeContractVersions[slot] = `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot]}-future`;
        })(checkpoint);
        expect(() => validateCampaignCheckpoint(mutated, manifest), combo.join('+'))
          .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
        expect(classifyCheckpointResumeDrift(mutated, manifest), combo.join('+')).toEqual({
          compatible: false,
          kind: 'CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT',
          driftedFields: [...combo].sort((a, b) => a.localeCompare(b)),
        });
        expect(classifyCheckpointRuntimeContracts(mutated as unknown as CampaignCheckpoint), combo.join('+')).toBe('INCOMPATIBLE_FUTURE');
      }
    } finally {
      cleanup(root);
    }
  });

  test('per-record lifecycle version drift alone is classified, and combined drift resolves in validator precedence order', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const lifecycleDrift = cloneWith(withSyntheticCluster((value) => {
        value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord({ lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v2' }) };
      }))(checkpoint);
      expect(() => validateCampaignCheckpoint(lifecycleDrift, manifest))
        .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_CHECKPOINT_LIFECYCLE_VERSION_UNSUPPORTED');
      expect(classifyCheckpointResumeDrift(lifecycleDrift, manifest)).toEqual({
        compatible: false,
        kind: 'CANDIDATE_LIFECYCLE_VERSION_DRIFT',
        driftedFields: [SYNTHETIC_CLUSTER_ID],
      });

      // Runtime-contract drift + lifecycle drift together: the strict
      // validator evaluates runtime contracts first, and the classifier
      // mirrors that precedence.
      const bothDrift = cloneWith(withSyntheticCluster((value) => {
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, promotionResult: 'nightwatch.promotion-result.private.v999' };
        value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord({ lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v2' }) };
      }))(checkpoint);
      expect(() => validateCampaignCheckpoint(bothDrift, manifest))
        .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
      expect(classifyCheckpointResumeDrift(bothDrift, manifest).kind).toBe('CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT');

      // Schema + identity + contract + lifecycle all drifted: schema wins in
      // both the validator and the classifier.
      const everythingDrift = cloneWith(withSyntheticCluster((value) => {
        value.schemaVersion = 'nightwatch.campaign-checkpoint.private.v9';
        value.campaignId = 'campaign:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
        value.manifestFingerprint = 'manifest:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, replayBinding: 'nightwatch.triage-replay-plan.private.v1' };
        value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord({ lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v0' }) };
      }))(checkpoint);
      expect(() => validateCampaignCheckpoint(everythingDrift, manifest)).toThrow(/SCHEMA_INVALID/);
      expect(classifyCheckpointResumeDrift(everythingDrift, manifest).kind).toBe('CHECKPOINT_SCHEMA_VERSION_DRIFT');
    } finally {
      cleanup(root);
    }
  });

  test('persisted identity tampering (campaignId / manifestFingerprint) fails closed with precise classifications', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const fingerprintTamper = cloneWith((value) => {
        value.manifestFingerprint = 'manifest:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(fingerprintTamper, manifest))
        .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:MANIFEST_FINGERPRINT_MISMATCH');
      expect(classifyCheckpointResumeDrift(fingerprintTamper, manifest)).toEqual({
        compatible: false,
        kind: 'CAMPAIGN_IDENTITY_DRIFT',
        driftedFields: ['manifestFingerprint'],
      });
      const idTamper = cloneWith((value) => {
        value.campaignId = 'campaign:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(idTamper, manifest))
        .toThrow('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_ID_MISMATCH');
      expect(classifyCheckpointResumeDrift(idTamper, manifest)).toEqual({
        compatible: false,
        kind: 'CAMPAIGN_IDENTITY_DRIFT',
        driftedFields: ['campaignId'],
      });
    } finally {
      cleanup(root);
    }
  });

  test('classifier stays total over malformed version-bearing shapes and non-object checkpoints', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      expect(classifyCheckpointResumeDrift(null, manifest).kind).toBe('CHECKPOINT_SCHEMA_VERSION_DRIFT');
      expect(classifyCheckpointResumeDrift('not-a-checkpoint', manifest).kind).toBe('CHECKPOINT_SCHEMA_VERSION_DRIFT');
      expect(classifyCheckpointResumeDrift([], manifest).kind).toBe('CHECKPOINT_SCHEMA_VERSION_DRIFT');
      const malformedContracts = cloneWith((value) => {
        value.runtimeContractVersions = 'not-a-record';
      })(checkpoint);
      expect(classifyCheckpointResumeDrift(malformedContracts, manifest)).toEqual({
        compatible: false,
        kind: 'CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT',
        driftedFields: ['runtimeContractVersions'],
      });
      expect(() => validateCampaignCheckpoint(malformedContracts, manifest)).toThrow(/CHECKPOINT_RUNTIME_CONTRACT_VERSIONS:OBJECT_REQUIRED/);
      const malformedLifecycles = cloneWith((value) => {
        value.candidateLifecycles = 42;
      })(checkpoint);
      expect(classifyCheckpointResumeDrift(malformedLifecycles, manifest)).toEqual({
        compatible: false,
        kind: 'CANDIDATE_LIFECYCLE_VERSION_DRIFT',
        driftedFields: ['candidateLifecycles'],
      });
      // Absent Session-2 fields stay legacy-compatible in both classifiers.
      expect(classifyCheckpointResumeDrift(checkpoint, manifest)).toEqual({ compatible: true, kind: 'NONE', driftedFields: [] });
      expect(classifyCheckpointRuntimeContracts(checkpoint)).toBe(CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION);
    } finally {
      cleanup(root);
    }
  });
});

test.describe('Phase 15P A09 resume stop-before-executor across all drift kinds', () => {
  test('resume rejects incompatible runtime-contract combinations with zero executor callbacks', async () => {
    const combos: readonly (readonly ('candidateLifecycle' | 'replayBinding' | 'promotionResult')[])[] = [
      ['candidateLifecycle'],
      ['replayBinding'],
      ['promotionResult'],
      ['candidateLifecycle', 'replayBinding', 'promotionResult'],
    ];
    for (const combo of combos) {
      const { root, store, manifest, checkpointPath } = preparedFixture();
      const harness = countingExecutor();
      try {
        const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
        raw.checkpoint.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
        for (const slot of combo) raw.checkpoint.runtimeContractVersions[slot] = `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot]}-future`;
        fs.writeFileSync(checkpointPath, JSON.stringify(raw));
        // Explicit capture (instead of expect().rejects) keeps the failure
        // message truthful even if the rejection carries a custom stack.
        let rejection: unknown;
        try {
          await resumeCampaign(manifest, harness.executor, {
            checkpointStore: new CampaignCheckpointStore(store),
            now: () => new Date(STATIC_NOW),
          });
          rejection = 'NO_THROW';
        } catch (error) {
          rejection = error instanceof Error ? error.message : String(error);
        }
        expect(String(rejection), combo.join('+')).toContain('CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
        expect(harness.calls.preflight, combo.join('+')).toBe(0);
        expect(harness.calls.execute, combo.join('+')).toBe(0);
      } finally {
        cleanup(root);
      }
    }
  });

  test('resume rejects schema-version drift in persisted bytes with zero executor callbacks', async () => {
    const { root, store, manifest, checkpointPath } = preparedFixture();
    const harness = countingExecutor();
    try {
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
      raw.checkpoint.schemaVersion = 'nightwatch.campaign-checkpoint.private.v2-future';
      fs.writeFileSync(checkpointPath, JSON.stringify(raw));
      let rejection: unknown;
      try {
        await resumeCampaign(manifest, harness.executor, {
          checkpointStore: new CampaignCheckpointStore(store),
          now: () => new Date(STATIC_NOW),
        });
        rejection = 'NO_THROW';
      } catch (error) {
        rejection = error instanceof Error ? error.message : String(error);
      }
      expect(String(rejection)).toContain('SCHEMA_INVALID');
      expect(harness.calls.preflight).toBe(0);
      expect(harness.calls.execute).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('resume against a manifest whose fingerprint family drifted is refused at orchestrator construction with zero callbacks', () => {
    const base = preparedFixture();
    try {
      const harness = countingExecutor();
      const driftedManifest = createCampaignManifest({
        ...inputFor('BASELINE_HEALTH'),
        versions: driftedVersions(['semanticBundleVersion', 'dossierVersion']),
      });
      expect(driftedManifest.campaignId).not.toBe(base.manifest.campaignId);
      expect(() => new CampaignOrchestrator(driftedManifest, harness.executor, {
        store: base.store,
        checkpoint: base.checkpoint,
        now: () => new Date(STATIC_NOW),
      })).toThrow(/CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_ID_MISMATCH|CAMPAIGN_VERSION_DRIFT/);
      expect(harness.calls.preflight).toBe(0);
      expect(harness.calls.execute).toBe(0);
    } finally {
      cleanup(base.root);
    }
  });
});

test.describe('Phase 15P A09 reservation and retry semantics on resume', () => {
  test('a reserved-but-incomplete work item resumes exactly once and is never re-run after completion', async () => {
    const { root, store, manifest } = preparedFixture('BASELINE_HEALTH', RETRY_TEST_BUDGET);
    let interruptedOnce = false;
    const firstRun = countingExecutor();
    const firstExecute = firstRun.executor.execute;
    const interruptingExecutor: CampaignExecutor = {
      ...firstRun.executor,
      execute: async (context) => {
        if (!interruptedOnce) {
          interruptedOnce = true;
          throw new CampaignProcessInterruptionError();
        }
        return await firstExecute(context);
      },
    };
    try {
      const interrupted = await runCampaign(manifest, interruptingExecutor, { store, now: () => new Date(STATIC_NOW) });
      expect(interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      const item0 = manifest.workItems[0]!.workItemId;
      expect(interrupted.checkpoint.executionLedger.find((record) => record.workItemId === item0)?.state).toBe('REPLAY_REQUIRED');
      expect(interrupted.checkpoint.executionLedger.find((record) => record.workItemId === item0)?.attemptCount).toBe(1);

      const resumed = countingExecutor();
      const result = await resumeCampaign(manifest, resumed.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      // Exactly-once resume: the interrupted item executes exactly one more
      // time during resume, then completes with the retry recorded.
      expect(resumed.calls.items.filter((id) => id === item0)).toHaveLength(1);
      const record = result.checkpoint.executionLedger.find((entry) => entry.workItemId === item0);
      expect(record?.state).toBe('COMPLETED');
      expect(record?.attemptCount).toBe(2);
      expect(record?.executionGuarantee).toBe('AT_LEAST_ONCE_SAFE');

      // A second resume after completion never re-executes anything.
      const callsBefore = resumed.calls.execute;
      const again = await resumeCampaign(manifest, resumed.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      expect(again.resultClass).toBe('COMPLETE_CLEAN');
      expect(resumed.calls.execute).toBe(callsBefore);
    } finally {
      cleanup(root);
    }
  });

  test('retry reservations are bounded by the frozen budget and every attempt is recorded', async () => {
    const { root, store, manifest } = preparedFixture();
    const alwaysInterrupting: CampaignExecutor = {
      preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
      execute: async () => {
        throw new CampaignProcessInterruptionError();
      },
    };
    try {
      // Attempt 1 consumes journeyContexts 1/3; each resume attempt charges
      // one more retry reservation until the frozen limit refuses attempt 4.
      let last = await runCampaign(manifest, alwaysInterrupting, { store, now: () => new Date(STATIC_NOW) });
      expect(last.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      for (let resumeOrdinal = 0; resumeOrdinal < 2; resumeOrdinal += 1) {
        last = await resumeCampaign(manifest, alwaysInterrupting, {
          checkpointStore: new CampaignCheckpointStore(store),
          now: () => new Date(STATIC_NOW),
        });
        expect(last.resultClass, `resume ${resumeOrdinal}`).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      }
      const bounded = await resumeCampaign(manifest, alwaysInterrupting, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      expect(bounded.resultClass).toBe('PARTIAL_BUDGET_EXHAUSTED');
      expect(bounded.stopReason).toBe('BUDGET_EXHAUSTED');
      const item0 = manifest.workItems[0]!.workItemId;
      const record = bounded.checkpoint.executionLedger.find((entry) => entry.workItemId === item0);
      expect(record?.state).toBe('BLOCKED');
      expect(record?.reasonCode).toBe('BUDGET_EXHAUSTED');
      // Three attempts actually reached the executor; the fourth was refused
      // by the reservation itself and is still truthfully recorded.
      expect(record?.attemptCount).toBe(4);
      expect(bounded.checkpoint.budgetUsed.journeyContexts).toBe(TEST_BUDGET.maxJourneyContexts);
      expect(bounded.checkpoint.budgetUsed.journeyContexts + bounded.checkpoint.budgetRemaining.journeyContexts)
        .toBe(TEST_BUDGET.maxJourneyContexts);
    } finally {
      cleanup(root);
    }
  });
});

test.describe('Phase 15P A09 checkpoint round-trip stability and determinism', () => {
  test('write → read round-trip preserves the checkpoint exactly and revalidates', () => {
    const { root, store, manifest, checkpoint } = preparedFixture();
    try {
      const checkpointStore = new CampaignCheckpointStore(store);
      checkpointStore.writeCheckpoint(checkpoint, manifest);
      const readBack = checkpointStore.readCheckpoint(manifest.campaignId, manifest);
      expect(stableCampaignJson(readBack)).toBe(stableCampaignJson(checkpoint));
      expect(JSON.parse(JSON.stringify(readBack))).toEqual(JSON.parse(JSON.stringify(checkpoint)));
      // Re-validation of the round-tripped bytes is deterministic.
      expect(() => validateCampaignCheckpoint(JSON.parse(JSON.stringify(readBack)), manifest)).not.toThrow();
      expect(classifyCheckpointResumeDrift(readBack, manifest)).toEqual({ compatible: true, kind: 'NONE', driftedFields: [] });
    } finally {
      cleanup(root);
    }
  });

  test('manifest + ordinal-zero checkpoint construction is byte-deterministic across stores', () => {
    const first = preparedFixture();
    try {
      const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-drift-det-'));
      try {
        const secondStore = new PrivateArtifactStore({ root: secondRoot });
        const secondManifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
        const secondCheckpoint = prepareCampaign(secondManifest, { store: secondStore, now: () => new Date(STATIC_NOW) });
        expect(secondManifest.campaignId).toBe(first.manifest.campaignId);
        expect(secondManifest.manifestFingerprint).toBe(first.manifest.manifestFingerprint);
        expect(stableCampaignJson(secondCheckpoint)).toBe(stableCampaignJson(first.checkpoint));
        const secondPath = new CampaignCheckpointStore(secondStore).paths(secondManifest.campaignId).checkpoint;
        expect(fs.readFileSync(secondPath, 'utf8')).toBe(fs.readFileSync(first.checkpointPath, 'utf8'));
      } finally {
        cleanup(secondRoot);
      }
    } finally {
      cleanup(first.root);
    }
  });

  test('drift classifications are deterministic across repeated evaluations', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const inputs: readonly { readonly label: string; readonly checkpoint: unknown }[] = [
        { label: 'legacy-compatible', checkpoint },
        {
          label: 'contract-drift',
          checkpoint: cloneWith((value) => {
            value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, candidateLifecycle: 'nightwatch.candidate-lifecycle.private.v9' };
          })(checkpoint),
        },
        {
          label: 'identity-drift',
          checkpoint: cloneWith((value) => {
            value.manifestFingerprint = 'manifest:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
          })(checkpoint),
        },
      ];
      for (const input of inputs) {
        const seen = [0, 1, 2].map(() => classifyCheckpointResumeDrift(input.checkpoint, manifest));
        expect(new Set(seen.map((report) => stableCampaignJson(report))).size, input.label).toBe(1);
      }
      const drifted = driftedVersions(['semanticBundleVersion']);
      const fingerprints = [0, 1, 2].map(() => classifyVersionFingerprintDrift(drifted, VERSIONS));
      expect(new Set(fingerprints.map((slots) => slots.join('|'))).size).toBe(1);
    } finally {
      cleanup(root);
    }
  });
});
