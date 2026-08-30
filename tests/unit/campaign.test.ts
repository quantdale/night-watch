import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignBudgetManager,
  CampaignCheckpointStore,
  CampaignProcessInterruptionError,
  CampaignTimeBudget,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  assertManifestCompatible,
  createCampaignManifest,
  emptyBudgetUsage,
  prepareCampaign,
  resumeCampaign,
  runCampaign,
  validateCampaignCheckpoint,
  validateCampaignManifest,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignExecutor,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignPrivacyPolicy,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
  type CampaignSourceSnapshot,
} from '../../src/core/campaign';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION, changesetId, selectJourneys, type ChangeSet, type ChangedFile } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION, type SafetyVector } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { ANOMALY_CLUSTER_VERSION, DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION, type MinimizationAction, type SourceFreshness } from '../../src/core/triage/types';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { clusterAnomalies } from '../../src/core/triage/clustering';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore, assertOwnerPolicyAllows } from '../../src/core/policy';

const STATIC_NOW = '2026-08-13T01:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201', '0x0000000000000301'] as const;
const SAFE_TRIAGE: SafetyVector = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  knownMutations: 0,
  actionCausedUnknown: 0,
  dbQueries: 0,
};

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
  nightwatchSourceSha: 'synthetic-phase7-source.v1',
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
  seedCorpusVersion: 'nightwatch.phase7.synthetic-seeds.v1',
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

function makeChangeSet(changedFiles: readonly ChangedFile[]): ChangeSet {
  const repoBaselines = RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    baseSha: repo.checkedOutSha,
    headSha: repo.checkedOutSha,
    mergeBase: repo.checkedOutSha,
    rangeSemantics: 'BASE_SHA_TO_HEAD_SHA' as const,
    source: 'LOCAL_COMMITTED_CHANGE' as const,
    dirtyExcluded: true,
  }));
  const id = changesetId({ repoBaselines, changedFiles, selectorVersion: SELECTOR_VERSION });
  return {
    schemaVersion: 'nightwatch.change-intelligence.phase3.v1',
    selectorVersion: SELECTOR_VERSION,
    changesetId: id,
    generatedAt: STATIC_NOW,
    repoBaselines,
    changedRepos: [...new Set(changedFiles.map((file) => file.repoId))].sort(),
    changedFiles,
    commits: [],
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY',
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
}

function sourceWindow(changedFiles: readonly ChangedFile[] = []) {
  return {
    changesetId: changedFiles.length === 0 ? 'cs-empty-phase7' : changesetId({ repoBaselines: makeChangeSet(changedFiles).repoBaselines, changedFiles, selectorVersion: SELECTOR_VERSION }),
    baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
    changedFiles,
    dirtyFiles: [],
    sourceWindow: 'COMMITTED_ONLY' as const,
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
  };
}

function inputFor(mode: CampaignInput['mode'] = 'LOCAL_SYNTHETIC', changedFiles: readonly ChangedFile[] = [], budget: CampaignBudgetPolicy = TEST_BUDGET): CampaignInput {
  const changeset = changedFiles.length > 0 ? makeChangeSet(changedFiles) : null;
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: sourceWindow(changedFiles),
    changeset,
    phase3Selection: changeset === null ? null : selectJourneys(changeset),
    seedCorpusVersion: VERSIONS.seedCorpusVersion,
    seedSet: SEEDS,
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: budget,
    privacyPolicy: PRIVACY_POLICY,
  };
}

function action(actionId: string, routeClass = '/payer-exchange-rate-v2'): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase7.synthetic-action.v1',
  };
}

function candidate(options: {
  readonly runId: string;
  readonly fingerprint: string;
  readonly journeyId: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory';
  readonly operationFamily?: string;
  readonly timingClass?: 'NONE' | 'BOUNDED' | 'TRANSIENT';
  readonly knownNightwatchDefect?: boolean;
  readonly sourceRelevance?: 'DIRECT_CHANGE_RELEVANCE' | 'SHARED_CHANGE_RELEVANCE' | 'TRANSITIVE_CHANGE_RELEVANCE' | 'NO_CURRENT_CHANGE_RELEVANCE' | 'UNKNOWN';
  readonly apiFailed?: boolean;
  readonly sequence?: readonly string[];
  readonly predicate?: (ids: readonly string[]) => boolean;
}): CampaignAnomalyCandidate {
  const operationFamily = options.operationFamily ?? options.journeyId;
  const routeClass = options.journeyId === 'ripple-payer-exchange-read'
    ? '/payer-exchange-rate-v2'
    : options.journeyId === 'ripple-common-exchange-read' ? '/global-exchange-rate-v2' : '/account-management';
  const sequence = (options.sequence ?? ['phase7.read.primary', 'phase7.read.secondary']).map((id) => action(id, routeClass));
  const apiFailed = options.apiFailed ?? false;
  const fingerprint = options.fingerprint;
  const browser = {
    failed: true,
    routeClass,
    structuralState: 'table-missing',
    operationFamily,
    statusClass: '5xx',
    contentTypeClass: 'json',
    oracleFingerprint: fingerprint,
    runtimeCategory: 'product',
  } as const;
  const api = options.apiFailed === undefined ? null : {
    available: true,
    failed: apiFailed,
    operationFamily,
    routeClass,
    structuralState: apiFailed ? 'api-error' : 'api-ready',
    statusClass: apiFailed ? '5xx' : '2xx',
    contentTypeClass: 'json',
    parseCategory: apiFailed ? 'invalid' : 'valid',
    oracleFingerprint: apiFailed ? fingerprint : 'fp:sha256:eeeeeeeeeeeeeeeeeeeeeeee',
  } as const;
  const predicate = options.predicate ?? ((ids: readonly string[]) => ids.length > 0);
  const replay = (sequenceToReplay: readonly MinimizationAction[]) => ({
    status: predicate(sequenceToReplay.map((item) => item.actionId)) ? 'FAILURE' as const : 'PASS' as const,
    ...(predicate(sequenceToReplay.map((item) => item.actionId)) ? { anomalyFingerprint: fingerprint } : {}),
    safety: SAFE_TRIAGE,
  });
  return {
    observation: {
      runId: options.runId,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId: options.journeyId,
        envelopeId: options.journeyId === 'ripple-payer-exchange-read' ? 'E1-J1-payer-exchange' : options.journeyId === 'ripple-common-exchange-read' ? 'E2-J2-common-exchange' : 'E3-J3-account-inventory',
        oracleId: 'oracle.phase7.synthetic',
        routeClass,
        operationFamily,
        statusClass: '5xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: 'table-missing',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase7',
        browserApiResultClass: api === null ? 'browser-only' : api.failed === browser.failed ? 'same' : 'diverge',
      },
      timingClass: options.timingClass ?? 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId: options.journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase7-synthetic',
    contextKind: 'FIRST_OBSERVATION',
    originalSequence: sequence,
    technicalSeverity: 'HIGH',
    breadth: 'NARROW',
    browser,
    api,
    sourceCorrelation: {
      journeyIds: [options.journeyId],
      changedFiles: [],
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: 'synthetic.phase7.source.v1',
    },
    sourceRelevance: options.sourceRelevance ?? 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract', 'known-cancellation-not-applicable'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: options.knownNightwatchDefect ?? false,
    replay,
  };
}

function defaultOutcome(overrides: Partial<CampaignExecutionOutcome> = {}): CampaignExecutionOutcome {
  return {
    result: 'PASS',
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
    privacy: { result: 'PASS', rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
    actionsExecuted: 0,
    apiExecutions: 0,
    browserContextCreated: false,
    replay: false,
    observations: [],
    ...overrides,
  };
}

function passingExecutor(script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]> = new Map(), options: { readonly throwOnWorkItemId?: string } = {}) {
  return {
    preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
      if (options.throwOnWorkItemId === workItem.workItemId) throw new CampaignProcessInterruptionError();
      const observations = [...(script.get(workItem.workItemId) ?? [])];
      return defaultOutcome({
        result: observations.length > 0 ? 'ANOMALY' : 'PASS',
        actionsExecuted: observations.length > 0 ? observations[0]!.originalSequence.length : 1,
        apiExecutions: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : workItem.kind === 'API' ? 1 : 0,
        browserContextCreated: workItem.kind !== 'API',
        replay: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY',
        observations,
      });
    },
    reproduce: async ({ representative }: { readonly representative: CampaignAnomalyCandidate }) => {
      const outcome = representative.replay?.(representative.originalSequence, 'FRESH_EXACT_REPLAY');
      const resolved = await outcome;
      if (resolved?.status !== 'FAILURE') return { result: 'NOT_REPRODUCED' as const, runId: `${representative.observation.runId}-fresh`, fingerprint: null, safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 }, privacy: { result: 'PASS' as const, rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 } };
      return {
        result: 'REPRODUCED' as const,
        runId: `${representative.observation.runId}-fresh`,
        fingerprint: representative.observation.fingerprint,
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
        privacy: { result: 'PASS' as const, rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
        candidate: { ...representative, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
      };
    },
  };
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase7-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

test.describe('Phase 7 campaign identity, selection, and policy', () => {
  test('manifest identity is deterministic and source-change selection preserves Phase 3 explanations', () => {
    const j1File: ChangedFile = { repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' };
    const first = createCampaignManifest(inputFor('CHANGE_DIRECTED', [j1File]));
    const second = createCampaignManifest(inputFor('CHANGE_DIRECTED', [j1File]));
    expect(first.campaignId).toBe(second.campaignId);
    expect(first.manifestFingerprint).toBe(second.manifestFingerprint);
    expect(first.selectedJourneys).toEqual(['ripple-payer-exchange-read']);
    expect(first.selectedApiScenarios).toEqual(['ripple.payer-exchange.read']);
    expect(first.selectedEnvelopes).toEqual(['E1-J1-payer-exchange']);
    expect(first.selection.nonSelectedJourneys).toHaveLength(2);
    expect(first.selection.explanations.find((entry) => entry.workItemKey === 'journey:ripple-payer-exchange-read')?.explanation.selected).toBe(true);
    expect(first.workItems.map((item) => item.kind)).toEqual(['JOURNEY', 'API', 'EXPLORATION']);
    expect(() => assertManifestCompatible(first, { campaignId: first.campaignId, manifestFingerprint: first.manifestFingerprint })).not.toThrow();
  });

  test('baseline, shared-change, and conservative fallback modes are explicit', () => {
    const baseline = createCampaignManifest(inputFor('BASELINE_HEALTH'));
    expect(baseline.selectedJourneys).toHaveLength(3);
    expect(baseline.selection.zeroSelectionJustified).toBe(false);

    const shared = createCampaignManifest(inputFor('CHANGE_DIRECTED', [{ repoId: 'mobingilabs/ripple-ui', path: 'src/router.js', status: 'modify' }]));
    expect(shared.selectedJourneys).toEqual([
      'ripple-payer-exchange-read',
      'ripple-common-exchange-read',
      'ripple-account-inventory',
    ]);
    expect(shared.selection.fallbackTriggered).toBe(false);

    const unknown = createCampaignManifest(inputFor('CHANGE_DIRECTED', [{ repoId: 'mobingilabs/ripple-ui', path: 'src/new-runtime-entry.ts', status: 'modify' }]));
    expect(unknown.selection.fallbackTriggered).toBe(true);
    expect(unknown.selectedJourneys).toHaveLength(3);
    expect(unknown.selection.explanations.every((entry) => entry.explanation.selected || entry.explanation.reason.length > 0)).toBe(true);
  });

  test('reproduction-only mode persists one target and selects no new coverage', () => {
    const target = candidate({ runId: 'run-reproduction-target', fingerprint: 'fp:sha256:888888888888888888888888', journeyId: 'ripple-payer-exchange-read' });
    const input = { ...inputFor('LOCAL_SYNTHETIC'), mode: 'REPRODUCTION_ONLY' as const, reproductionTarget: { clusterId: 'cluster:synthetic-target', candidate: target } };
    const manifest = createCampaignManifest(input);
    expect(manifest.mode).toBe('REPRODUCTION_ONLY');
    expect(manifest.selectedJourneys).toEqual([]);
    expect(manifest.selectedEnvelopes).toEqual([]);
    expect(manifest.selectedApiScenarios).toEqual([]);
    expect(manifest.workItems.map((item) => item.kind)).toEqual(['REPRODUCTION']);
    expect(manifest.workItems[0]!.workItemId).toBe('reproduction:cluster:synthetic-target');
    expect('replay' in (manifest.reproductionTarget?.candidate ?? {})).toBe(false);
  });

  test('reproduction-only mode executes the admitted target and bounded triage without fresh coverage', async () => {
    const { root, store } = tempStore();
    try {
      const target = candidate({ runId: 'run-reproduction-execution', fingerprint: 'fp:sha256:999999999999999999999999', journeyId: 'ripple-payer-exchange-read', sequence: ['payer-navigate', 'payer-structural-checkpoint'], predicate: (ids) => ids.includes('payer-navigate') });
      const cluster = clusterAnomalies([target.observation])[0];
      expect(cluster).toBeDefined();
      const input = { ...inputFor('LOCAL_SYNTHETIC'), mode: 'REPRODUCTION_ONLY' as const, reproductionTarget: { clusterId: cluster!.clusterId, candidate: target } };
      const manifest = createCampaignManifest(input);
      const executor = {
        preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
        execute: async () => { throw new Error('REPRODUCTION_ONLY_MUST_NOT_EXECUTE_NEW_WORK'); },
        reproduce: async ({ representative }: { readonly representative: CampaignAnomalyCandidate }) => {
          const replay = (sequence: readonly MinimizationAction[]) => ({
            status: sequence.some((actionItem) => actionItem.actionId === 'phase7.target') ? 'FAILURE' as const : 'PASS' as const,
            ...(sequence.some((actionItem) => actionItem.actionId === 'phase7.target') ? { anomalyFingerprint: representative.observation.fingerprint } : {}),
            safety: SAFE_TRIAGE,
          });
          return {
            result: 'REPRODUCED' as const,
            runId: `${representative.observation.runId}-fresh`,
            fingerprint: representative.observation.fingerprint,
            safety: {
              productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0,
              productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0,
              externalPublicationAttempts: 0,
            },
            privacy: {
              result: 'PASS' as const, rawBodiesPersisted: 0, customerValuesPersisted: 0,
              credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0,
              screenshotsPersisted: 0, authenticatedTracesPersisted: 0,
            },
            candidate: { ...representative, replay, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
          };
        },
      };
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      expect(result.checkpoint.selectedJourneys).toEqual([]);
      expect(result.checkpoint.selectedEnvelopes).toEqual([]);
      expect(result.checkpoint.selectedApiScenarios).toEqual([]);
      expect(result.checkpoint.executionLedger[0]?.state).toBe('COMPLETED');
      expect(result.checkpoint.budgetUsed.browserContexts).toBe(0);
      expect(result.checkpoint.budgetUsed.apiExecutions).toBe(0);
      expect(result.dossiers).toHaveLength(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('budget dimensions and accelerated time ceilings fail closed', () => {
    const budget = new CampaignBudgetManager(INITIAL_REAL_CAMPAIGN_BUDGET, emptyBudgetUsage());
    budget.reserveWork('JOURNEY');
    expect(budget.used().journeyContexts).toBe(1);
    expect(budget.used().browserContexts).toBe(1);
    expect(() => budget.consume('totalActions', INITIAL_REAL_CAMPAIGN_BUDGET.maxTotalActions + 1)).toThrow(/CAMPAIGN_BUDGET_EXHAUSTED/);

    const atomic = new CampaignBudgetManager({
      ...INITIAL_REAL_CAMPAIGN_BUDGET,
      maxTotalBrowserContexts: 1,
      maxJourneyContexts: 0,
      maxExplorationContexts: 0,
      maxApiExecutions: 2,
      maxReplays: 0,
    }, emptyBudgetUsage());
    expect(() => atomic.reserveWork('JOURNEY')).toThrow(/CAMPAIGN_BUDGET_EXHAUSTED:journeyContexts/);
    expect(atomic.used().browserContexts).toBe(0);
    expect(() => atomic.reserveFirstPlusApi()).toThrow(/CAMPAIGN_BUDGET_EXHAUSTED:replays/);
    expect(atomic.used().apiExecutions).toBe(0);

    let clock = 1_000;
    const time = new CampaignTimeBudget(100, () => clock, 1_000);
    expect(time.remainingMs()).toBe(100);
    clock += 100;
    expect(() => time.assertAvailable()).toThrow('CAMPAIGN_RUNTIME_TIMEOUT');
  });

  test('frozen infrastructure, datastore, and publication operations block before execution', () => {
    for (const operation of ['GKE_METADATA_INVESTIGATION', 'KUBERNETES', 'DYNAMODB_DATA_ORACLE', 'BIGQUERY_DATA_ORACLE', 'SPANNER_DATA_ORACLE', 'EXTERNAL_PUBLICATION']) {
      expect(() => assertOwnerPolicyAllows(operation)).toThrow('OWNER_POLICY_BLOCKED');
    }
  });
});

test.describe('Phase 7 deterministic synthetic campaign matrix', () => {
  test('runs the real orchestrator through safe execution, clustering, reproduction, minimization, dossier, brief, and privacy boundaries', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      // Phase 15 Session 2: promoted replays are certified through the V2
      // replay contract, so synthetic sequences use real journey contract
      // steps (the guard rejects invented action ids before any replay).
      const uiBug = candidate({ runId: 'run-ui-bug', fingerprint: 'fp:sha256:111111111111111111111111', journeyId: 'ripple-payer-exchange-read', sequence: ['payer-navigate', 'payer-structural-checkpoint'], predicate: (ids) => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint'), sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE' });
      const apiBug = candidate({ runId: 'run-api-bug', fingerprint: 'fp:sha256:222222222222222222222222', journeyId: 'ripple-common-exchange-read', operationFamily: 'ripple.common-exchange.read', apiFailed: true, sequence: ['common-navigate', 'common-structural-checkpoint'], sourceRelevance: 'SHARED_CHANGE_RELEVANCE' });
      const irreducible = candidate({ runId: 'run-irreducible', fingerprint: 'fp:sha256:333333333333333333333333', journeyId: 'ripple-account-inventory', sequence: ['account-navigate', 'account-structural-checkpoint'], predicate: (ids) => ids.join('|') === 'account-navigate|account-structural-checkpoint' });
      const transient = candidate({ runId: 'run-transient', fingerprint: 'fp:sha256:444444444444444444444444', journeyId: 'ripple-account-inventory', timingClass: 'TRANSIENT' });
      const falsePositive = candidate({ runId: 'run-false-positive', fingerprint: 'fp:sha256:555555555555555555555555', journeyId: 'ripple-account-inventory', knownNightwatchDefect: true });
      const script = new Map<string, readonly CampaignAnomalyCandidate[]>([
        ['journey:ripple-payer-exchange-read', [uiBug]],
        ['api:ripple.common-exchange.read', [apiBug]],
        ['explore:E3-J3-account-inventory:0x0000000000000301', [irreducible, transient, falsePositive]],
      ]);
      const result = await runCampaign(manifest, passingExecutor(script), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      expect(result.checkpoint.budgetUsed.apiExecutions).toBe(6);
      expect(result.checkpoint.budgetUsed.replays).toBeGreaterThanOrEqual(2);
      expect(result.checkpoint.anomalyClusters.length).toBe(5);
      expect(result.dossiers.length).toBe(3);
      expect(result.dossiers.some((dossier) => dossier.reproduction.result === 'REPRODUCED')).toBe(true);
      expect(result.dossiers.some((dossier) => dossier.reproduction.minimalityGuarantee === '1-MINIMAL' || dossier.reproduction.minimalityGuarantee === 'BOUNDED_MINIMAL')).toBe(true);
      expect(result.morningBrief.headline).toContain('finding');
      expect(result.morningBrief.topFindings.length).toBeLessThanOrEqual(3);
      expect(result.morningBrief.externalPublication).toBe('PROHIBITED');
      expect(result.checkpoint.privacyStatus).toBe('PASS');
      expect(result.checkpoint.safety).toEqual({ productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 });
      expect(fs.readdirSync(root).some((file) => file.endsWith('.morning-brief.json'))).toBe(true);
      for (const file of fs.readdirSync(root)) expect(fs.statSync(path.join(root, file)).mode & 0o077).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('deduplicates a shared failure storm and stops broader work before replay spending', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const first = candidate({ runId: 'run-storm-j1', fingerprint: 'fp:sha256:666666666666666666666666', journeyId: 'ripple-payer-exchange-read', operationFamily: 'shared-runtime-root' });
      const second = candidate({ runId: 'run-storm-j2', fingerprint: 'fp:sha256:666666666666666666666666', journeyId: 'ripple-common-exchange-read', operationFamily: 'shared-runtime-root' });
      const script = new Map<string, readonly CampaignAnomalyCandidate[]>([
        ['journey:ripple-payer-exchange-read', [first]],
        ['journey:ripple-common-exchange-read', [second]],
      ]);
      const result = await runCampaign(manifest, passingExecutor(script), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(result.stopReason).toBe('FAILURE_STORM_SHARED_ROOT_SYMPTOM');
      expect(result.checkpoint.anomalyClusters).toHaveLength(2);
      expect(result.checkpoint.reproductionQueue).toHaveLength(0);
      expect(result.checkpoint.budgetUsed.replays).toBe(0);
      expect(result.morningBrief.headline).toContain('SHARED DEV FAILURE');
      expect(result.dossiers).toHaveLength(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('surfaces an L0 candidate when reproduction/minimization is blocked by budget', async () => {
    const { root, store } = tempStore();
    try {
      const budget = { ...TEST_BUDGET, maxMinimizationCandidates: 0 };
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC', [], budget));
      const observation = candidate({ runId: 'run-budget-l0', fingerprint: 'fp:sha256:888888888888888888888888', journeyId: 'ripple-payer-exchange-read' });
      const result = await runCampaign(manifest, passingExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_BUDGET_EXHAUSTED');
      expect(result.stopReason).toBe('BUDGET_EXHAUSTED');
      expect(result.dossiers).toHaveLength(0);
      expect(result.checkpoint.reproductionQueue[0]).toMatchObject({ state: 'BLOCKED', reasonCode: 'MINIMIZATION_BUDGET_UNAVAILABLE' });
      expect(result.morningBrief.headline).toBe('UNRESOLVED L0 CANDIDATES — REPRODUCTION BLOCKED BY BUDGET');
      expect(result.morningBrief.coverageGaps.some((gap) => gap.includes('MINIMIZATION_BUDGET_UNAVAILABLE'))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('distinguishes a transient observation from a zero-observation clean campaign', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const transient = candidate({ runId: 'run-transient-brief', fingerprint: 'fp:sha256:999999999999999999999999', journeyId: 'ripple-account-inventory', timingClass: 'TRANSIENT' });
      const result = await runCampaign(manifest, passingExecutor(new Map([['explore:E3-J3-account-inventory:0x0000000000000301', [transient]]])), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(result.morningBrief.headline).toBe('TRANSIENTS NOT REPRODUCED');
      expect(result.morningBrief.topFindings).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('resumes from an interrupted work item without re-running completed logical work', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const calls: string[] = [];
      const executor = {
        ...passingExecutor(),
        execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
          calls.push(workItem.workItemId);
          return defaultOutcome({ apiExecutions: workItem.kind === 'API' ? (workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1) : 0, browserContextCreated: workItem.kind !== 'API' });
        },
      };
      const interrupted = await runCampaign(manifest, executor, { store, stopAfterWorkItemId: manifest.workItems[0]!.workItemId, now: () => new Date(STATIC_NOW) });
      expect(interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      expect(interrupted.checkpoint.completedWorkItemIds).toContain(manifest.workItems[0]!.workItemId);
      const resumed = await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(calls.filter((id) => id === manifest.workItems[0]!.workItemId)).toHaveLength(1);
      expect(resumed.checkpoint.completedWorkItemIds).toHaveLength(manifest.workItems.length);
      expect(resumed.morningBrief.headline).toBe('NO ANOMALIES OBSERVED');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('terminal runtime failure blocks the failed item, skips pending work, and derives a truthful next action', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const failedWorkItemId = manifest.workItems[0]!.workItemId;
      let executeCalls = 0;
      const executor = {
        ...passingExecutor(),
        execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
          executeCalls += 1;
          if (workItem.workItemId === failedWorkItemId) {
            return defaultOutcome({
              result: 'RUNTIME_FAILURE',
              reasonCode: 'JOURNEY_ORACLE_FAILURE',
              browserContextCreated: true,
            });
          }
          return defaultOutcome({ browserContextCreated: workItem.kind !== 'API' });
        },
      };
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(result.stopReason).toBe('PREFLIGHT_FAILED');
      expect(result.checkpoint.executionLedger.find((record) => record.workItemId === failedWorkItemId)).toMatchObject({
        state: 'BLOCKED',
        result: 'RUNTIME_FAILURE',
        reasonCode: 'JOURNEY_ORACLE_FAILURE',
      });
      expect(result.checkpoint.completedWorkItemIds).toEqual([]);
      expect(result.checkpoint.remainingWorkItemIds).toEqual([]);
      expect(result.checkpoint.executionLedger.filter((record) => record.state === 'SKIPPED')).toHaveLength(manifest.workItems.length - 1);
      expect(result.checkpoint.nextExactAction).toBe('inspect campaign checkpoint and morning brief');
      expect(() => validateCampaignCheckpoint(result.checkpoint, manifest)).not.toThrow();

      const resumed = await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
      expect(resumed.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(resumed.checkpoint.nextExactAction).toBe('inspect campaign checkpoint and morning brief');
      expect(executeCalls).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('prepares an ordinal-zero checkpoint without invoking an executor', () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const checkpoint = prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW), currentVersions: manifest.versions });
      expect(checkpoint.checkpointOrdinal).toBe(0);
      expect(checkpoint.campaignStatus).toBe('IN_PROGRESS');
      expect(checkpoint.completedWorkItemIds).toEqual([]);
      expect(store.root).toContain(root);
      const checkpointStore = new CampaignCheckpointStore(store);
      expect(checkpointStore.readManifest(manifest.campaignId).manifestFingerprint).toBe(manifest.manifestFingerprint);
      expect(checkpointStore.readCheckpoint(manifest.campaignId, manifest).remainingWorkItemIds).toEqual(manifest.workItems.map((item) => item.workItemId));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('refuses to overwrite an already prepared campaign', () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) });
      expect(() => prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) })).toThrow('CAMPAIGN_ALREADY_PREPARED');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('process interruption thrown by an executor is persisted as replay-required', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const result = await runCampaign(manifest, passingExecutor(new Map(), { throwOnWorkItemId: manifest.workItems[0]!.workItemId }), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      expect(result.checkpoint.executionLedger[0]!.state).toBe('REPLAY_REQUIRED');
      expect(result.checkpoint.nextExactAction).toContain('replay');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('resume after a partially consumed reservation charges the retry without resetting budget', async () => {
    const { root, store } = tempStore();
    try {
      const budget = {
        ...TEST_BUDGET,
        maxTotalBrowserContexts: 10,
        maxJourneyContexts: 5,
        maxApiExecutions: 40,
        maxReplays: 100,
        maxTotalActions: 1_000,
        maxPrivateEvidenceBytes: 64 * 1024 * 1024,
      };
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', [], budget));
      const attempts = new Map<string, number>();
      let interruptedOnce = false;
      const executor = {
        ...passingExecutor(),
        execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
          const count = (attempts.get(workItem.workItemId) ?? 0) + 1;
          attempts.set(workItem.workItemId, count);
          if (!interruptedOnce) {
            interruptedOnce = true;
            throw new CampaignProcessInterruptionError();
          }
          return defaultOutcome({
            apiExecutions: workItem.kind === 'API' ? (workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : 1) : 0,
            browserContextCreated: workItem.kind !== 'API',
          });
        },
      };
      const interrupted = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      const interruptedBrowser = interrupted.checkpoint.budgetUsed.browserContexts;
      const interruptedApi = interrupted.checkpoint.budgetUsed.apiExecutions;
      expect(interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      expect(interrupted.checkpoint.executionLedger[0]?.state).toBe('REPLAY_REQUIRED');
      expect(interruptedBrowser + interrupted.checkpoint.budgetRemaining.browserContexts).toBe(budget.maxTotalBrowserContexts);
      const resumed = await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(attempts.get(manifest.workItems[0]!.workItemId)).toBe(2);
      expect(resumed.checkpoint.budgetUsed.browserContexts).toBeGreaterThan(interruptedBrowser);
      expect(resumed.checkpoint.budgetUsed.apiExecutions).toBeGreaterThanOrEqual(interruptedApi);
      expect(resumed.checkpoint.budgetUsed.browserContexts + resumed.checkpoint.budgetRemaining.browserContexts).toBe(budget.maxTotalBrowserContexts);
      expect(resumed.checkpoint.budgetUsed.apiExecutions + resumed.checkpoint.budgetRemaining.apiExecutions).toBe(budget.maxApiExecutions);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('privacy sentinels are rejected before anomaly metadata reaches the durable ledger', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const unsafeBase = candidate({ runId: 'run-privacy-sentinel', fingerprint: 'fp:sha256:777777777777777777777777', journeyId: 'ripple-payer-exchange-read' });
      const unsafe = {
        ...unsafeBase,
        observation: {
          ...unsafeBase.observation,
          features: { ...unsafeBase.observation.features, structuralState: 'CUSTOMER_SENTINEL' },
        },
      };
      const script = new Map<string, readonly CampaignAnomalyCandidate[]>([['journey:ripple-payer-exchange-read', [unsafe]]]);
      const result = await runCampaign(manifest, passingExecutor(script), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_SAFETY_BLOCKED');
      expect(result.stopReason).toBe('PRIVACY_BLOCKED');
      expect(result.checkpoint.privacyStatus).toBe('BLOCKED');
      expect(result.checkpoint.anomalyObservations).toHaveLength(0);
      expect(result.dossiers).toHaveLength(0);
      for (const file of fs.readdirSync(root)) expect(fs.readFileSync(path.join(root, file), 'utf8')).not.toContain('CUSTOMER_SENTINEL');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('Phase 7 no-finding and drift contracts', () => {
  test('a clean baseline is a complete, useful campaign result', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const result = await runCampaign(manifest, passingExecutor(), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(result.morningBrief.headline).toBe('NO ANOMALIES OBSERVED');
      expect(result.morningBrief.topFindings).toEqual([]);
      expect(result.morningBrief.coverageGaps).toEqual([]);
      expect(result.morningBrief.transientsAndNonFindings).toContain('Historical J2 font 502: L0_NOT_REPRODUCED; not promoted.');
      expect(result.morningBrief.transientsAndNonFindings).toContain('Historical malformed JSON: UNKNOWN/HISTORICAL_ANOMALY_PRESENT; not deliberately replayed.');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('auth blocked before product work is explicit in the owner brief', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const executor = {
        ...passingExecutor(),
        preflight: () => ({ passed: false, code: 'AUTH_BLOCKED' as const, failedChecks: ['synthetic-auth'], checkedAt: STATIC_NOW }),
      };
      const result = await runCampaign(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_AUTH_BLOCKED');
      expect(result.morningBrief.headline).toBe('AUTH BLOCKED BEFORE PRODUCT WORK');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('manifest drift is rejected before a resumed campaign can mix versions', () => {
    const first = createCampaignManifest(inputFor('BASELINE_HEALTH'));
    const changed = createCampaignManifest(inputFor('COVERAGE_EXPANSION', [], { ...TEST_BUDGET, maxTotalActions: TEST_BUDGET.maxTotalActions - 1 }));
    expect(changed.campaignId).not.toBe(first.campaignId);
    expect(() => assertManifestCompatible(changed, { campaignId: first.campaignId, manifestFingerprint: first.manifestFingerprint })).toThrow('CAMPAIGN_VERSION_DRIFT');
  });

  test('runtime source-version drift stops a resumed campaign before new work', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      let executed = 0;
      const executor = {
        ...passingExecutor(),
        execute: async (context: { readonly workItem: CampaignWorkItem }) => {
          executed += 1;
          return passingExecutor().execute(context);
        },
      };
      const result = await runCampaign(manifest, executor, {
        store,
        currentVersions: { ...VERSIONS, nightwatchSourceSha: 'synthetic-phase7-source.changed.v1' },
      });
      expect(result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(result.stopReason).toBe('CAMPAIGN_VERSION_DRIFT');
      expect(result.checkpoint.versionDrift).toEqual(['CAMPAIGN_VERSION_DRIFT']);
      expect(executed).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('Campaign hardening adversarial persistence fixtures', () => {
  test('rejects the manifest tamper matrix before execution authority is rebuilt', () => {
    const base = createCampaignManifest(inputFor('BASELINE_HEALTH'));
    const mutate = (change: (value: Record<string, any>) => void): Record<string, any> => {
      const value = JSON.parse(JSON.stringify(base)) as Record<string, any>;
      change(value);
      return value;
    };
    const journey = base.workItems.find((item) => item.kind === 'JOURNEY')!;
    const api = base.workItems.find((item) => item.kind === 'API')!;
    const exploration = base.workItems.find((item) => item.kind === 'EXPLORATION')!;
    const cases: readonly [string, (value: Record<string, any>) => void][] = [
      ['changed workItemId', (value) => { value.workItems[0].workItemId = 'journey:tampered'; }],
      ['changed kind', (value) => { value.workItems[0].kind = 'API'; }],
      ['changed journeyId', (value) => { value.workItems[0].journeyId = 'ripple-common-exchange-read'; }],
      ['changed API operation ID', (value) => { value.workItems.find((item: any) => item.kind === 'API').apiOperationId = 'ripple.tampered.read'; }],
      ['changed seed', (value) => { value.workItems.find((item: any) => item.kind === 'EXPLORATION').seed = '0x0000000000000999'; }],
      ['changed order', (value) => { value.workItems[0].order = 1; value.workItems[1].order = 0; }],
      ['duplicate order', (value) => { value.workItems[1].order = value.workItems[0].order; }],
      ['duplicate work item', (value) => { value.workItems.push({ ...value.workItems[0], order: value.workItems.length }); }],
      ['removed work item', (value) => { value.workItems.pop(); }],
      ['changed selection', (value) => { value.selection.selectedJourneys = []; }],
      ['changed selected arrays', (value) => { value.selectedJourneys = []; }],
      ['changed budget', (value) => { value.budgetPolicy.maxTotalActions -= 1; }],
      ['changed source snapshot', (value) => { value.sourceSnapshots[0].headSha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; }],
      ['changed source window', (value) => { value.sourceWindow.changesetId = 'tampered-window'; }],
      ['changed owner scope', (value) => { value.ownerScopePolicy.l4 = 'IN_SCOPE'; }],
      ['changed versions', (value) => { value.versions.nightwatchSourceSha = 'tampered-version'; }],
      ['changed fingerprint', (value) => { value.manifestFingerprint = 'manifest:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'; }],
      ['valid old fingerprint plus modified executable field', (value) => { value.workItems[0].selection.reason = 'tampered executable selection'; }],
      ['extra execution material', (value) => { value.workItems[0].unexpectedExecutionField = 'unexpected'; }],
    ];
    expect(journey).toBeDefined();
    expect(api).toBeDefined();
    expect(exploration).toBeDefined();
    for (const [label, change] of cases) {
      expect(() => validateCampaignManifest(mutate(change)), label).toThrow(/CAMPAIGN_MANIFEST_(?:INTEGRITY_INVALID|FINGERPRINT_INVALID)|CAMPAIGN_ID_RECOMPUTATION_MISMATCH|CAMPAIGN_WORK/);
    }
  });

  test('rejects checkpoint corruption and malformed durable wrappers before callbacks', () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const checkpoint = prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) });
      const checkpointPath = new CampaignCheckpointStore(store).paths(manifest.campaignId).checkpoint;
      const writeRaw = (value: unknown): void => fs.writeFileSync(checkpointPath, JSON.stringify({ status: 'READY', checkpoint: value }));
      const mutate = (change: (value: Record<string, any>) => void): void => {
        const value = JSON.parse(JSON.stringify(checkpoint)) as Record<string, any>;
        change(value);
        writeRaw(value);
        expect(() => new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest)).toThrow(/CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID|CAMPAIGN_ARTIFACT_INVALID|CAMPAIGN_VERSION_DRIFT/);
      };
      mutate((value) => { value.budgetUsed.totalActions = -1; });
      mutate((value) => { value.budgetUsed.totalActions = 0; value.budgetRemaining.totalActions = 0; });
      mutate((value) => { value.budgetUsed.totalActions = manifest.budgetPolicy.maxTotalActions + 1; });
      mutate((value) => { value.budgetRemaining.totalActions -= 1; });
      mutate((value) => { value.executionLedger.push({ ...value.executionLedger[0] }); });
      mutate((value) => { value.executionLedger[0].workItemId = 'journey:unknown'; });
      mutate((value) => { value.executionLedger[0].kind = 'API'; });
      mutate((value) => { value.completedWorkItemIds = [manifest.workItems[0]!.workItemId]; value.remainingWorkItemIds = [manifest.workItems[0]!.workItemId, ...value.remainingWorkItemIds]; });
      mutate((value) => { value.executionLedger.pop(); });
      mutate((value) => { value.campaignStatus = 'COMPLETE_CLEAN'; });
      mutate((value) => { value.campaignStatus = 'PARTIAL_BUDGET_EXHAUSTED'; value.stopReason = 'BUDGET_EXHAUSTED'; });
      mutate((value) => { value.campaignStatus = 'PARTIAL_AUTH_BLOCKED'; value.stopReason = 'AUTH_BLOCKED'; value.completedWorkItemIds = [manifest.workItems[0]!.workItemId]; });
      mutate((value) => { value.safety.productionAttempts = -1; });
      mutate((value) => { value.privacyStatus = 'PASS'; value.privacy.rawBodiesPersisted = 1; });
      mutate((value) => { value.campaignId = 'campaign:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'; });
      mutate((value) => { value.manifestFingerprint = 'manifest:sha256:aaaaaaaaaaaaaaaaaaaaaaaa'; });
      mutate((value) => { value.checkpointOrdinal = 'not-a-number'; });
      mutate((value) => { value.budgetUsed.totalActions = '0'; });
      mutate((value) => {
        value.anomalyObservations = [{ runId: 'observation:unknown', fingerprint: 'fp:unknown' }];
        value.anomalyClusters = [{ clusterId: 'cluster:unknown', primaryRunId: 'observation:unknown', runIds: ['observation:unknown'] }];
        value.reproductionQueue = [
          { clusterId: 'cluster:not-present', representativeRunId: 'observation:unknown', state: 'PENDING', result: null, admissionLevel: 'L0', reasonCode: null, runId: null, safety: checkpoint.safety, privacy: checkpoint.privacy },
        ];
      });
      mutate((value) => {
        value.anomalyObservations = [{ runId: 'observation:known', fingerprint: 'fp:known' }];
        value.anomalyClusters = [{ clusterId: 'cluster:known', primaryRunId: 'observation:known', runIds: ['observation:known'] }];
        const reproduction = { clusterId: 'cluster:known', representativeRunId: 'observation:known', state: 'PENDING', result: null, admissionLevel: 'L0', reasonCode: null, runId: null, safety: checkpoint.safety, privacy: checkpoint.privacy };
        value.reproductionQueue = [reproduction, { ...reproduction }];
      });
      fs.writeFileSync(checkpointPath, '{"status":"READY","checkpoint":');
      expect(() => new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest)).toThrow('MALFORMED_JSON');
      fs.writeFileSync(checkpointPath, '{"status":"READY"');
      expect(() => new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest)).toThrow('MALFORMED_JSON');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the initial real profile freezes a deterministic reproduction reserve without raising caps', () => {
    const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', [], INITIAL_REAL_CAMPAIGN_BUDGET));
    expect(manifest.budgetPolicy.maxTotalBrowserContexts).toBe(6);
    expect(manifest.budgetPolicy.maxApiExecutions).toBe(6);
    expect(manifest.budgetPolicy.maxReplays).toBe(8);
    expect(manifest.budgetPolicy.maxPromotedClusters).toBe(1);
    expect(manifest.selectedJourneys).toHaveLength(3);
    expect(manifest.selectedEnvelopes).toEqual([]);
    expect(manifest.selectedApiScenarios).toHaveLength(2);
    expect(manifest.selection.explanations.some((entry) => !entry.explanation.selected && entry.explanation.reason.includes('reserve'))).toBe(true);
  });

  test('rejects a real-scale manifest whose frozen work cannot leave its reproduction reserve', () => {
    const impossible = {
      ...INITIAL_REAL_CAMPAIGN_BUDGET,
      maxTotalBrowserContexts: 3,
      maxJourneyContexts: 3,
      maxExplorationContexts: 0,
    };
    expect(() => createCampaignManifest(inputFor('BASELINE_HEALTH', [], impossible))).toThrow('CAMPAIGN_BUDGET_FEASIBILITY_INVALID');
  });

  test('rejects the I.1 false-positive before any executor callback', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', [], INITIAL_REAL_CAMPAIGN_BUDGET));
      const checkpoint = prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) });
      const corrupted = {
        ...checkpoint,
        campaignStatus: 'PARTIAL_BUDGET_EXHAUSTED' as const,
        stopReason: 'BUDGET_EXHAUSTED' as const,
      };
      expect(corrupted.budgetUsed.explorationContexts).toBe(0);
      expect(corrupted.budgetRemaining.explorationContexts).toBe(0);
      const positiveDimensions = [
        'browserContexts', 'journeyContexts', 'apiExecutions', 'replays',
        'minimizationCandidates', 'totalActions', 'privateEvidenceBytes',
      ] as const;
      for (const dimension of positiveDimensions) {
        expect(corrupted.budgetUsed[dimension]).toBe(0);
        expect(corrupted.budgetRemaining[dimension]).toBe(manifest.budgetPolicy[
          dimension === 'browserContexts' ? 'maxTotalBrowserContexts'
            : dimension === 'journeyContexts' ? 'maxJourneyContexts'
              : dimension === 'apiExecutions' ? 'maxApiExecutions'
                : dimension === 'replays' ? 'maxReplays'
                  : dimension === 'minimizationCandidates' ? 'maxMinimizationCandidates'
                    : dimension === 'totalActions' ? 'maxTotalActions'
                      : 'maxPrivateEvidenceBytes'
        ]);
      }
      const checkpointPath = new CampaignCheckpointStore(store).paths(manifest.campaignId).checkpoint;
      fs.writeFileSync(checkpointPath, JSON.stringify({ status: 'READY', checkpoint: corrupted }));
      let callbackCount = 0;
      const executor: CampaignExecutor = {
        preflight: () => {
          callbackCount += 1;
          return { passed: true, code: 'PREFLIGHT_PASS', failedChecks: [], checkedAt: STATIC_NOW };
        },
        execute: async () => {
          callbackCount += 1;
          return defaultOutcome();
        },
      };
      let thrown: unknown;
      try {
        await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toBe('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION');
      expect(callbackCount).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('accepts a legitimate positive-cap exhaustion checkpoint with exact arithmetic', async () => {
    const { root, store } = tempStore();
    try {
      const budget = {
        ...INITIAL_REAL_CAMPAIGN_BUDGET,
        maxTotalActions: 1,
        maxRuntimeMs: 60_000,
        maxPerTestTimeoutMs: 5_000,
      };
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH', [], budget));
      const result = await runCampaign(manifest, passingExecutor(), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_BUDGET_EXHAUSTED');
      expect(result.stopReason).toBe('BUDGET_EXHAUSTED');
      expect(result.checkpoint.budgetUsed.totalActions).toBe(1);
      expect(result.checkpoint.budgetRemaining.totalActions).toBe(0);
      expect(() => validateCampaignCheckpoint(result.checkpoint, manifest)).not.toThrow();
      expect(result.checkpoint.budgetUsed.totalActions + result.checkpoint.budgetRemaining.totalActions).toBe(manifest.budgetPolicy.maxTotalActions);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('accepts mixed zero-cap and genuinely exhausted positive-cap dimensions', async () => {
    const { root, store } = tempStore();
    try {
      const budget = {
        ...TEST_BUDGET,
        maxTotalBrowserContexts: 1,
        maxJourneyContexts: 1,
        maxExplorationContexts: 0,
      };
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC', [], budget));
      const result = await runCampaign(manifest, passingExecutor(), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('PARTIAL_BUDGET_EXHAUSTED');
      expect(result.stopReason).toBe('BUDGET_EXHAUSTED');
      expect(result.checkpoint.budgetUsed.explorationContexts).toBe(0);
      expect(result.checkpoint.budgetRemaining.explorationContexts).toBe(0);
      expect(result.checkpoint.budgetUsed.browserContexts).toBe(1);
      expect(result.checkpoint.budgetRemaining.browserContexts).toBe(0);
      expect(() => validateCampaignCheckpoint(result.checkpoint, manifest)).not.toThrow();
      for (const dimension of Object.keys(result.checkpoint.budgetUsed) as (keyof typeof result.checkpoint.budgetUsed)[]) {
        const limit = dimension === 'browserContexts' ? manifest.budgetPolicy.maxTotalBrowserContexts
          : dimension === 'journeyContexts' ? manifest.budgetPolicy.maxJourneyContexts
            : dimension === 'explorationContexts' ? manifest.budgetPolicy.maxExplorationContexts
              : dimension === 'apiExecutions' ? manifest.budgetPolicy.maxApiExecutions
                : dimension === 'replays' ? manifest.budgetPolicy.maxReplays
                  : dimension === 'minimizationCandidates' ? manifest.budgetPolicy.maxMinimizationCandidates
                    : dimension === 'totalActions' ? manifest.budgetPolicy.maxTotalActions
                      : manifest.budgetPolicy.maxPrivateEvidenceBytes;
        expect(result.checkpoint.budgetUsed[dimension] + result.checkpoint.budgetRemaining[dimension]).toBe(limit);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
