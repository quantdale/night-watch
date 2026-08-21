// ---------------------------------------------------------------------------
// Phase 15 Session 2 — checkpoint-boundary runtime-contract compatibility.
//
// Pins the version-safe contract surface added to CampaignCheckpoint:
// optional `candidateLifecycles` and `runtimeContractVersions`, strictly
// validated when present (absent stays a valid historical pre-S2 checkpoint),
// plus the resume fail-closed ordering that rejects an incompatible future
// runtime-contract version BEFORE any executor callback runs.
// Synthetic fixtures only; no real credentials or customer data.
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
  INITIAL_REAL_CAMPAIGN_BUDGET,
  classifyCheckpointRuntimeContracts,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  validateCampaignCheckpoint,
  type CampaignBudgetPolicy,
  type CampaignCheckpoint,
  type CampaignExecutor,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
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
const SYNTHETIC_RUN_ID = 'observation:phase15-synthetic';

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

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase15-source.v1',
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
  seedCorpusVersion: 'nightwatch.phase15.synthetic-seeds.v1',
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

function snapshots(): readonly CampaignSourceSnapshot[] {
  return RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    branch: repo.branch,
    headSha: repo.checkedOutSha,
    trackingRef: repo.trackingRef,
    trackingSha: repo.trackingSha,
    ahead: repo.ahead,
    behind: repo.behind,
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
      changesetId: 'cs-empty-phase15-compat',
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

interface PreparedFixture {
  readonly root: string;
  readonly store: PrivateArtifactStore;
  readonly manifest: CampaignManifest;
  readonly checkpoint: CampaignCheckpoint;
  readonly checkpointPath: string;
}

/** Fresh ordinal-zero manifest+checkpoint pair, built without any executor. */
function preparedFixture(): PreparedFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15-compat-'));
  const store = new PrivateArtifactStore({ root });
  const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
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
  value.anomalyObservations = [{ runId: SYNTHETIC_RUN_ID, fingerprint: 'fp:sha256:phase15synthetic000000' }];
  value.anomalyClusters = [{ clusterId: SYNTHETIC_CLUSTER_ID, primaryRunId: SYNTHETIC_RUN_ID, runIds: [SYNTHETIC_RUN_ID] }];
  change(value);
};

test.describe('Phase 15 Session 2 checkpoint runtime-contract compatibility', () => {
  test('accepts historical checkpoints without the Session-2 fields', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      expect(checkpoint.candidateLifecycles).toBeUndefined();
      expect(checkpoint.runtimeContractVersions).toBeUndefined();
      expect(() => validateCampaignCheckpoint(JSON.parse(JSON.stringify(checkpoint)), manifest)).not.toThrow();
      expect(classifyCheckpointRuntimeContracts(checkpoint)).toBe(CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION);
    } finally {
      cleanup(root);
    }
  });

  test('accepts well-formed Session-2 fields', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      // Empty lifecycle map plus exact expected contract versions.
      const empty = cloneWith((value) => {
        value.candidateLifecycles = {};
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(empty, manifest)).not.toThrow();
      expect(classifyCheckpointRuntimeContracts(empty as unknown as CampaignCheckpoint)).toBe('CURRENT_S2_CONTRACTS');

      // Lifecycle record bound to a real anomalyClusters ledger entry.
      const populated = cloneWith(withSyntheticCluster((value) => {
        value.candidateLifecycles = {
          [SYNTHETIC_CLUSTER_ID]: lifecycleRecord({
            variant: 'SEMANTIC',
            state: 'ADMITTED',
            transitionCount: 2,
            lastReasonCode: 'OBSERVATION_RECORDED',
          }),
        };
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
      }))(checkpoint);
      expect(() => validateCampaignCheckpoint(populated, manifest)).not.toThrow();
      expect(classifyCheckpointRuntimeContracts(populated as unknown as CampaignCheckpoint)).toBe('CURRENT_S2_CONTRACTS');
    } finally {
      cleanup(root);
    }
  });

  test('rejects unsupported candidate-lifecycle versions', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      for (const badVersion of ['nightwatch.candidate-lifecycle.private.v0', 'nightwatch.candidate-lifecycle.private.v2', 'not-a-version']) {
        const mutated = cloneWith(withSyntheticCluster((value) => {
          value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord({ lifecycleVersion: badVersion }) };
        }))(checkpoint);
        expect(() => validateCampaignCheckpoint(mutated, manifest), badVersion)
          .toThrow('CAMPAIGN_CHECKPOINT_LIFECYCLE_VERSION_UNSUPPORTED');
      }
    } finally {
      cleanup(root);
    }
  });

  test('rejects unknown runtime-contract versions for each of the three slots', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const slots = ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const;
      for (const slot of slots) {
        const mutated = cloneWith((value) => {
          value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, [slot]: `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot]}-future` };
        })(checkpoint);
        expect(() => validateCampaignCheckpoint(mutated, manifest), slot)
          .toThrow('CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
      }
      // Extra or missing slots are also rejected before the version comparison.
      const extraSlot = cloneWith((value) => {
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, unexpected: 'v1' };
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(extraSlot, manifest)).toThrow(/CHECKPOINT_RUNTIME_CONTRACT_VERSIONS:UNKNOWN_FIELD:unexpected/);
      const missingSlot = cloneWith((value) => {
        value.runtimeContractVersions = { candidateLifecycle: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle, replayBinding: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.replayBinding };
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(missingSlot, manifest)).toThrow(/CHECKPOINT_RUNTIME_CONTRACT_VERSIONS:MISSING_FIELD:promotionResult/);
    } finally {
      cleanup(root);
    }
  });

  test('rejects lifecycle keys that are absent from the anomalyClusters ledger', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      // Ledger is empty on a fresh ordinal-zero checkpoint.
      const mutated = cloneWith((value) => {
        value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord() };
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(mutated, manifest))
        .toThrow(`UNKNOWN_LIFECYCLE_CLUSTER:${SYNTHETIC_CLUSTER_ID}`);
      const emptyKey = cloneWith((value) => {
        value.anomalyObservations = [{ runId: SYNTHETIC_RUN_ID, fingerprint: 'fp:sha256:phase15synthetic000000' }];
        value.anomalyClusters = [{ clusterId: SYNTHETIC_CLUSTER_ID, primaryRunId: SYNTHETIC_RUN_ID, runIds: [SYNTHETIC_RUN_ID] }];
        value.candidateLifecycles = { '': lifecycleRecord() };
      })(checkpoint);
      expect(() => validateCampaignCheckpoint(emptyKey, manifest)).toThrow('LIFECYCLE_CLUSTER_ID_EMPTY');
    } finally {
      cleanup(root);
    }
  });

  test('rejects malformed lifecycle records', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const cases: ReadonlyArray<readonly [label: string, record: unknown, expected: RegExp]> = [
        ['bad variant', lifecycleRecord({ variant: 'MAGIC' }), /VARIANT:ENUM_INVALID/],
        ['bad state', lifecycleRecord({ state: 'FLOATING' }), /STATE:ENUM_INVALID/],
        ['extra field', { ...lifecycleRecord(), unexpectedExecutableField: 'serialized-material' }, /UNKNOWN_FIELD:unexpectedExecutableField/],
        ['missing field', (({ transitionCount: _drop, ...rest }) => rest)(lifecycleRecord()), /MISSING_FIELD:transitionCount/],
        ['negative count', lifecycleRecord({ transitionCount: -1 }), /TRANSITION_COUNT:NON_NEGATIVE_INTEGER_REQUIRED/],
        ['non-integer count', lifecycleRecord({ transitionCount: 1.5 }), /TRANSITION_COUNT:NON_NEGATIVE_INTEGER_REQUIRED/],
        ['unsafe reason code', lifecycleRecord({ lastReasonCode: 'lowercase-reason!' }), /LAST_REASON_CODE_UNSAFE/],
        ['non-string reason code', lifecycleRecord({ lastReasonCode: 42 }), /LAST_REASON_CODE:STRING_REQUIRED/],
        ['non-object record', 'not-a-record', /OBJECT_REQUIRED/],
      ];
      for (const [label, record, expected] of cases) {
        const mutated = cloneWith(withSyntheticCluster((value) => {
          value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: record };
        }))(checkpoint);
        expect(() => validateCampaignCheckpoint(mutated, manifest), label).toThrow(expected);
      }
    } finally {
      cleanup(root);
    }
  });

  test('classifyCheckpointRuntimeContracts truth table is deterministic', () => {
    const { root, checkpoint } = preparedFixture();
    try {
      const base = JSON.parse(JSON.stringify(checkpoint)) as Record<string, any>;
      // Absent → historical legacy classification.
      expect(classifyCheckpointRuntimeContracts(base as CampaignCheckpoint)).toBe('LEGACY_PRE_S2_RUNTIME_CONTRACTS');
      // Present and exactly matching → current.
      const current = { ...base, runtimeContractVersions: { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED } };
      expect(classifyCheckpointRuntimeContracts(current as CampaignCheckpoint)).toBe('CURRENT_S2_CONTRACTS');
      // Any single mismatched slot → incompatible future.
      for (const slot of ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const) {
        const incompatible = {
          ...base,
          runtimeContractVersions: { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, [slot]: 'nightwatch.future.private.v999' },
        };
        expect(classifyCheckpointRuntimeContracts(incompatible as CampaignCheckpoint), slot).toBe('INCOMPATIBLE_FUTURE');
      }
      // Determinism across repeated evaluations.
      const inputs = [base as CampaignCheckpoint, current as CampaignCheckpoint];
      const seen = inputs.map((input) => [0, 1, 2].map(() => classifyCheckpointRuntimeContracts(input)));
      for (const results of seen) expect(new Set(results).size).toBe(1);
    } finally {
      cleanup(root);
    }
  });

  test('resume rejects an incompatible runtime-contract version before any executor callback', async () => {
    const { root, store, manifest, checkpointPath } = preparedFixture();
    const calls = { preflight: 0, execute: 0 };
    const countingExecutor: CampaignExecutor = {
      preflight: () => {
        calls.preflight += 1;
        return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
      },
      execute: async (): Promise<CampaignExecutionOutcome> => {
        calls.execute += 1;
        return {
          result: 'PASS',
          safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
          privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
          actionsExecuted: 0,
          apiExecutions: 0,
          browserContextCreated: false,
          replay: false,
          observations: [],
        };
      },
    };
    try {
      // Tamper the persisted wrapper with an incompatible future version.
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
      raw.checkpoint.runtimeContractVersions = {
        ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
        promotionResult: 'nightwatch.promotion-result.private.v999-future',
      };
      fs.writeFileSync(checkpointPath, JSON.stringify(raw));

      const attempt = async (): Promise<unknown> => resumeCampaign(manifest, countingExecutor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      await expect(attempt()).rejects.toThrow('CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
      expect(calls.preflight).toBe(0);
      expect(calls.execute).toBe(0);
    } finally {
      cleanup(root);
    }
  });

  test('positive control: the same harness invokes the executor when validation passes', async () => {
    const { root, store, manifest } = preparedFixture();
    const calls = { preflight: 0, execute: 0 };
    const countingExecutor: CampaignExecutor = {
      preflight: () => {
        calls.preflight += 1;
        return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
      },
      execute: async (): Promise<CampaignExecutionOutcome> => {
        calls.execute += 1;
        return {
          result: 'PASS',
          safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
          privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
          actionsExecuted: 0,
          apiExecutions: 0,
          browserContextCreated: false,
          replay: false,
          observations: [],
        };
      },
    };
    try {
      await resumeCampaign(manifest, countingExecutor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      });
      expect(calls.preflight).toBeGreaterThan(0);
      expect(calls.execute).toBeGreaterThan(0);
    } finally {
      cleanup(root);
    }
  });

  test('validation outcome is deterministic across repeated runs', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const valid = cloneWith(withSyntheticCluster((value) => {
        value.candidateLifecycles = { [SYNTHETIC_CLUSTER_ID]: lifecycleRecord() };
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
      }))(checkpoint);
      for (let run = 0; run < 3; run += 1) {
        expect(() => validateCampaignCheckpoint(JSON.parse(JSON.stringify(valid)), manifest), `valid run ${run}`).not.toThrow();
      }

      const invalid = cloneWith((value) => {
        value.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED, replayBinding: 'nightwatch.triage-replay-plan.private.v1' };
      })(checkpoint);
      const outcomes: string[] = [];
      for (let run = 0; run < 3; run += 1) {
        try {
          validateCampaignCheckpoint(JSON.parse(JSON.stringify(invalid)), manifest);
          outcomes.push('NO_THROW');
        } catch (error) {
          outcomes.push(error instanceof Error ? error.message : String(error));
        }
      }
      expect(outcomes[0]).toBeDefined();
      expect(outcomes[0]).not.toBe('NO_THROW');
      expect(new Set(outcomes).size).toBe(1);
    } finally {
      cleanup(root);
    }
  });
});
