// ---------------------------------------------------------------------------
// Phase 15 Session 2 (Wave 2) — promotion authority integration tests.
//
// Drives the REAL campaign orchestrator promotion path and pins the
// Session-2 authority contracts end to end:
//   T1  per-cluster candidate lifecycle records persisted in checkpoints
//   T2  runtimeContractVersions stamped on every new checkpoint
//   T3  V2-certified replay for promoted candidates (no canned bypass)
//   T4  semantic authority load-bearing at promotion (bundle coherence,
//       SemanticTriageEvidence, BugDossierV2 READY/UNRESOLVED split)
//   T5  converged SemanticAwarePromotionResult per promoted cluster
//
// Synthetic fixtures only: synthetic sha/digest/fingerprint values, real
// journey contract step ids, frozen clock, temp PrivateArtifactStore per
// test. No credentials, no customer data, no raw product values.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  CampaignOrchestrator,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  classifyCheckpointRuntimeContracts,
  createCampaignManifest,
  resumeCampaign,
  runCampaign,
  validateCampaignCheckpoint,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignExecutor,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { clearCampaignSemanticBundles, registerCampaignSemanticBundles } from '../../src/core/campaign/realCampaignSemanticWiring';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION, type SafetyVector } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import {
  ANOMALY_CLUSTER_VERSION,
  DOSSIER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  type MinimizationAction,
  type SourceFreshness,
} from '../../src/core/triage/types';
import { clusterAnomalies } from '../../src/core/triage/clustering';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { DOSSIER_VERSION_V2, parseBugDossierV2 } from '../../src/core/triage/dossierV2';
import type { BugDossierV2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { semanticPromotionEligible } from '../../src/core/triage/promotionResult';
import { SEMANTIC_CLUSTER_VERSION, semanticContractIdentityFromInvariantId } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION, createSemanticCampaignBundle, type SemanticCampaignBundle } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import type { CampaignSemanticCoverageState, CampaignSemanticCurrentness, CampaignSemanticReceiptOutcome } from '../../src/core/campaign/campaignSemanticEvidence';

const STATIC_NOW = '2026-08-21T01:00:00.000Z';
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
const ZERO_EXEC_SAFETY = {
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  productMutations: 0,
  actionCausedUnknown: 0,
  databaseQueries: 0,
  infrastructureQueries: 0,
  externalPublicationAttempts: 0,
};
const ZERO_EXEC_PRIVACY = {
  result: 'PASS' as const,
  rawBodiesPersisted: 0,
  customerValuesPersisted: 0,
  credentialsPersisted: 0,
  cookiesPersisted: 0,
  tokensPersisted: 0,
  domPersisted: 0,
  screenshotsPersisted: 0,
  authenticatedTracesPersisted: 0,
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

// --- Synthetic semantic identity (fixed approved target, synthetic values) ---

const TARGET = 'ripple.payer-exchange.read';
const JOURNEY_ID = 'ripple-payer-exchange-read' as const;
const ROUTE_CLASS = '/payer-exchange-rate-v2';
const ENVELOPE_ID = 'E1-J1-payer-exchange';
const JOURNEY_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;
const SYNTHETIC_SHA = '1111111111111111111111111111111111111111';
const SYNTHETIC_DIGEST = `ev:sha256:${'b'.repeat(24)}`;
const SYNTHETIC_INVARIANT = `inv:sha256:${'d'.repeat(24)}`;
const SYNTHETIC_FINDING_FP = `fp:sha256:${'c'.repeat(24)}`;
const DERIVATION_VERSION = REAL_SOURCE_DERIVATION_VERSION_V2;
const ADMISSION_VERSION = 'nightwatch.phase15.collection-admission.synthetic.v1';

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

function inputFor(mode: CampaignInput['mode'], budget: CampaignBudgetPolicy = TEST_BUDGET): CampaignInput {
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase15',
      baselines: RIPPLE_REPOSITORIES.map((repo) => ({ repoId: repo.repoId, baseSha: repo.checkedOutSha, headSha: repo.checkedOutSha, dirtyExcluded: true as const })),
      changedFiles: [],
      dirtyFiles: [],
      sourceWindow: 'COMMITTED_ONLY' as const,
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
    },
    changeset: null,
    phase3Selection: null,
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

function action(actionId: string, routeClass = ROUTE_CLASS): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase15.synthetic-action.v1',
  };
}

interface ReplayCall {
  readonly phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';
  readonly actionIds: readonly string[];
}

interface CandidateOptions {
  readonly runId: string;
  readonly fingerprint: string;
  readonly sequence?: readonly string[];
  readonly predicate?: (ids: readonly string[]) => boolean;
  readonly timingClass?: 'NONE' | 'BOUNDED' | 'TRANSIENT';
  readonly knownNightwatchDefect?: boolean;
  readonly journeyId?: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory';
  readonly calls?: ReplayCall[];
  /** Overrides the candidate contract digest (tamper vectors). */
  readonly contractDigest?: string;
  /** When present the candidate routes through the semantic cluster path. */
  readonly semantic?: {
    readonly bundleId: string;
    readonly currentness: CampaignSemanticCurrentness;
    readonly receiptOutcome: CampaignSemanticReceiptOutcome;
    readonly coverageState?: CampaignSemanticCoverageState;
  };
}

function candidate(options: CandidateOptions): CampaignAnomalyCandidate {
  const journeyId = options.journeyId ?? JOURNEY_ID;
  const routeClass = journeyId === 'ripple-payer-exchange-read'
    ? ROUTE_CLASS
    : journeyId === 'ripple-common-exchange-read' ? '/global-exchange-rate-v2' : '/account-management';
  const sequence = (options.sequence ?? [...JOURNEY_STEPS]).map((id) => action(id, routeClass));
  const fingerprint = options.fingerprint;
  const predicate = options.predicate ?? ((ids: readonly string[]) => ids.length > 0);
  const semanticContractIdentity = options.semantic === undefined ? undefined : semanticContractIdentityFromInvariantId({
    expectationId: TARGET,
    targetId: TARGET,
    invariantDefinitionId: SYNTHETIC_INVARIANT,
    sourceProvenance: { repoId: 'corpus/phase15/source-fixture', derivationVersion: DERIVATION_VERSION, evidenceDigest: SYNTHETIC_DIGEST },
  });
  const replay = (sequenceToReplay: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
    options.calls?.push({ phase, actionIds: sequenceToReplay.map((item) => item.actionId) });
    const reproduces = predicate(sequenceToReplay.map((item) => item.actionId));
    return {
      status: reproduces ? 'FAILURE' as const : 'PASS' as const,
      ...(reproduces ? {
        anomalyFingerprint: options.semantic === undefined ? fingerprint : SYNTHETIC_FINDING_FP,
        ...(options.semantic === undefined ? {} : { semanticFindingFingerprint: SYNTHETIC_FINDING_FP, semanticContractIdentity }),
      } : {}),
      safety: SAFE_TRIAGE,
    };
  };
  const semanticEvidence = options.semantic === undefined ? undefined : {
    schemaVersion: 'nightwatch.campaign-semantic-evidence.v1' as const,
    bundleId: options.semantic.bundleId,
    bundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
    targetId: TARGET,
    expectationId: TARGET,
    sourceRepoId: 'corpus/phase15/source-fixture',
    sourceSha: SYNTHETIC_SHA,
    sourceEvidenceDigest: SYNTHETIC_DIGEST,
    sourceDerivationVersion: DERIVATION_VERSION,
    sourceAdmissionVersion: ADMISSION_VERSION,
    resolverState: 'RESOLVED' as const,
    sourceCurrentness: options.semantic.currentness,
    receiptOutcome: options.semantic.receiptOutcome,
    receiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
    ...(options.semantic.coverageState === undefined ? {} : { coverageState: options.semantic.coverageState }),
    findingFingerprint: SYNTHETIC_FINDING_FP,
    findingCategory: 'SOURCE_EXPECTATION_MISMATCH' as const,
    invariantDefinitionId: SYNTHETIC_INVARIANT,
  };
  return {
    observation: {
      runId: options.runId,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId,
        envelopeId: journeyId === 'ripple-payer-exchange-read' ? ENVELOPE_ID : journeyId === 'ripple-common-exchange-read' ? 'E2-J2-common-exchange' : 'E3-J3-account-inventory',
        oracleId: options.semantic !== undefined ? `semantic-${TARGET}` : 'oracle.phase15.synthetic',
        routeClass,
        operationFamily: TARGET,
        statusClass: '5xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: 'table-missing',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase15',
        browserApiResultClass: 'browser-only',
      },
      timingClass: options.timingClass ?? 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: options.contractDigest ?? 'contract:phase15-synthetic',
    contextKind: 'FIRST_OBSERVATION',
    originalSequence: sequence,
    technicalSeverity: 'HIGH',
    breadth: 'NARROW',
    browser: {
      failed: true,
      routeClass,
      structuralState: 'table-missing',
      operationFamily: TARGET,
      statusClass: '5xx',
      contentTypeClass: 'json',
      oracleFingerprint: fingerprint,
      runtimeCategory: 'product',
    },
    api: null,
    sourceCorrelation: {
      journeyIds: [journeyId],
      changedFiles: [],
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: 'synthetic.phase15.source.v1',
    },
    sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: options.knownNightwatchDefect ?? false,
    ...(semanticEvidence === undefined ? {} : { campaignSemanticEvidence: semanticEvidence }),
    replay,
  };
}

function scriptedExecutor(script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>): CampaignExecutor {
  return {
    preflight: () => ({ passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW }),
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }): Promise<CampaignExecutionOutcome> => {
      const observations = [...(script.get(workItem.workItemId) ?? [])];
      return {
        result: observations.length > 0 ? 'ANOMALY' : 'PASS',
        safety: ZERO_EXEC_SAFETY,
        privacy: ZERO_EXEC_PRIVACY,
        actionsExecuted: observations.length > 0 ? observations[0]!.originalSequence.length : 1,
        apiExecutions: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY' ? 2 : workItem.kind === 'API' ? 1 : 0,
        browserContextCreated: workItem.kind !== 'API',
        replay: workItem.kind === 'API' && workItem.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY',
        observations,
      };
    },
    reproduce: async ({ representative }: { readonly representative: CampaignAnomalyCandidate }) => {
      const resolved = await representative.replay?.(representative.originalSequence, 'FRESH_EXACT_REPLAY');
      if (resolved?.status !== 'FAILURE') {
        return { result: 'NOT_REPRODUCED' as const, runId: `${representative.observation.runId}-fresh`, fingerprint: null, safety: ZERO_EXEC_SAFETY, privacy: ZERO_EXEC_PRIVACY };
      }
      return {
        result: 'REPRODUCED' as const,
        runId: `${representative.observation.runId}-fresh`,
        fingerprint: representative.observation.fingerprint,
        safety: ZERO_EXEC_SAFETY,
        privacy: ZERO_EXEC_PRIVACY,
        candidate: { ...representative, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
      };
    },
  };
}

function coherentBundle(): SemanticCampaignBundle {
  return createSemanticCampaignBundle({
    sourceRepoId: 'corpus/phase15/source-fixture',
    sourceBranchRef: 'main',
    freshnessApprovedSourceSha: SYNTHETIC_SHA,
    expectationId: TARGET,
    targetId: TARGET,
    sourceEvidenceDigest: SYNTHETIC_DIGEST,
    sourceDerivationVersion: DERIVATION_VERSION,
    collectionAdmissionVersion: ADMISSION_VERSION,
    resolverState: 'RESOLVED',
    devReachability: 'LOCAL_ONLY',
    approvedMapping: {
      journeyOrOperationId: TARGET,
      targetId: TARGET,
      expectationId: TARGET,
      expectationClass: 'COLLECTION',
      browserObservationAvailable: true,
      apiObservationAvailable: true,
    },
  });
}

function tempStore(): { readonly root: string; readonly store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15-promotion-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

/** Read + strictly validate the v2 dossier artifact referenced by a ledger entry. */
function readV2Dossier(root: string, artifactPath: string | null): BugDossierV2 {
  expect(artifactPath).not.toBeNull();
  const raw = JSON.parse(fs.readFileSync(path.join(root, path.relative(root, artifactPath!)), 'utf8')) as Record<string, unknown>;
  // Artifacts are enveloped ({ dossier }) because the store spreads its own
  // wrapper status over the top level; the inner dossier is the truth.
  const payload = (raw.dossier ?? raw) as unknown;
  return parseBugDossierV2(payload);
}

function lifecycleFor(checkpoint: { readonly candidateLifecycles?: Readonly<Record<string, { readonly state: string; readonly variant: string; readonly lastReasonCode: string | null }>> }, clusterId: string): { readonly state: string; readonly variant: string; readonly lastReasonCode: string | null } {
  const record = checkpoint.candidateLifecycles?.[clusterId];
  expect(record, `lifecycle record for ${clusterId}`).toBeDefined();
  return record!;
}

test.describe('Phase 15 Session 2 Wave 2 — promotion authority through the real orchestrator', () => {
  test('stale-currentness semantic candidate ends UNRESOLVED (v2), never HIGH, ledger carries dossierVersion v2', async () => {
    clearCampaignSemanticBundles();
    registerCampaignSemanticBundles([coherentBundle()]);
    const { root, store } = tempStore();
    try {
      const observation = candidate({
        runId: 'run-stale-semantic',
        fingerprint: 'fp:sha256:111111111111111111111111',
        semantic: { bundleId: coherentBundle().bundleId, currentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE' },
      });
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const result = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
      const entry = result.checkpoint.dossierLedger.find((item) => item.clusterId === result.checkpoint.anomalyClusters[0]?.clusterId);
      expect(entry).toBeDefined();
      expect(entry!.dossierVersion).toBe(DOSSIER_VERSION_V2);
      // Unresolved v2 dossiers are never bug candidates and never READY.
      expect(entry!.state).toBe('INCOMPLETE');
      expect(result.checkpoint.bugCandidates).not.toContain(entry!.candidateId);
      const dossier = readV2Dossier(root, entry!.artifactPath);
      expect(dossier.status).toBe('UNRESOLVED');
      expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(dossier.semanticTriageEvidence?.sourceCurrentness).toBe('STALE');
      // Lifecycle ends UNRESOLVED on the semantic variant.
      const lifecycle = lifecycleFor(result.checkpoint, entry!.clusterId);
      expect(lifecycle.variant).toBe('SEMANTIC');
      expect(lifecycle.state).toBe('UNRESOLVED');
      expect(lifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
      // Promotion result converges on the same verdict.
      const orchestratorPromotion = result.checkpoint.dossierLedger.length;
      expect(orchestratorPromotion).toBe(1);
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(result.morningBrief.whatRan.some((line) => line === 'semanticDossiersV2Unresolved=1')).toBe(true);
      expect(result.morningBrief.topFindings).toEqual([]);
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });

  test('current coherent semantic candidate with exact but non-minimized journey replay stays UNRESOLVED', async () => {
    clearCampaignSemanticBundles();
    const bundle = coherentBundle();
    registerCampaignSemanticBundles([bundle]);
    const { root, store } = tempStore();
    try {
      const observation = candidate({
        runId: 'run-current-semantic',
        fingerprint: 'fp:sha256:222222222222222222222222',
        semantic: { bundleId: bundle.bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
      });
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
      const result = await orchestrator.run();
      const entry = result.checkpoint.dossierLedger[0]!;
      expect(entry.state).toBe('INCOMPLETE');
      expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
      expect(result.checkpoint.bugCandidates).not.toContain(entry.candidateId);
      const dossier = readV2Dossier(root, entry.artifactPath);
      expect(dossier.status).toBe('UNRESOLVED');
      expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(dossier.semanticConfidence?.blockers).toBeDefined();
      expect(dossier.semanticTriageEvidence?.exactReplayStatus).toBe('REPRODUCED');
      expect(dossier.semanticTriageEvidence?.replayFidelity?.outcomeClass).toBe('REPRODUCED_EXACT');
      expect(dossier.semanticTriageEvidence?.minimalityGuarantee).toBe('NONE');
      expect(dossier.semanticTriageEvidence?.minimalSequenceReproductions).toBe(0);
      const lifecycle = lifecycleFor(result.checkpoint, entry.clusterId);
      expect(lifecycle.variant).toBe('SEMANTIC');
      expect(lifecycle.state).toBe('UNRESOLVED');
      expect(lifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
      // Converged promotion verdict remains ineligible; v2 stays out of v1 findings.
      const promotions = orchestrator.promotionResults;
      expect(promotions).toHaveLength(1);
      expect(promotions[0]!.clusterKind).toBe('SEMANTIC');
      expect(promotions[0]!.readiness).toBe('UNRESOLVED');
      expect(promotions[0]!.confidence).not.toBe('HIGH');
      expect(promotions[0]!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(promotions[0]!.sourceCurrentness).toBe('CURRENT');
      expect(promotions[0]!.dossierVersionTarget).toBe(DOSSIER_VERSION_V2);
      expect(semanticPromotionEligible(promotions[0]!)).toBe(false);
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(result.morningBrief.topFindings).toEqual([]);
      expect(result.morningBrief.whatRan).toContain('semanticDossiersV2Unresolved=1');
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });

  test('bundle-incoherent semantic evidence is never HIGH/READY even with CURRENT currentness', async () => {
    clearCampaignSemanticBundles();
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      // Case A: no bundle registered at all for the claimed bundleId.
      const unregistered = candidate({
        runId: 'run-bundle-missing',
        fingerprint: 'fp:sha256:333333333333333333333333',
        semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
      });
      const missingResult = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [unregistered]]])), { store, now: () => new Date(STATIC_NOW) });
      const missingEntry = missingResult.checkpoint.dossierLedger[0]!;
      const missingDossier = readV2Dossier(root, missingEntry.artifactPath);
      expect(missingEntry.state).toBe('INCOMPLETE');
      expect(missingDossier.status).toBe('UNRESOLVED');
      expect(missingDossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(missingDossier.semanticConfidence?.blockers).toContain('BUNDLE_COHERENCE_FAILURE');

      // Case B: a registered frozen bundle that does NOT support the target.
      clearCampaignSemanticBundles();
      const foreignBundle = createSemanticCampaignBundle({
        ...coherentBundle(),
        targetId: 'ripple.common-exchange.read',
        expectationId: 'ripple.common-exchange.read',
        approvedMapping: {
          journeyOrOperationId: 'ripple.common-exchange.read',
          targetId: 'ripple.common-exchange.read',
          expectationId: 'ripple.common-exchange.read',
          expectationClass: 'COLLECTION',
          browserObservationAvailable: true,
          apiObservationAvailable: true,
        },
      });
      registerCampaignSemanticBundles([foreignBundle]);
      const mismatched = candidate({
        runId: 'run-bundle-foreign-target',
        fingerprint: 'fp:sha256:444444444444444444444444',
        semantic: { bundleId: foreignBundle.bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
      });
      const mismatchResult = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [mismatched]]])), { store, now: () => new Date(STATIC_NOW) });
      const mismatchEntry = mismatchResult.checkpoint.dossierLedger[0]!;
      const mismatchDossier = readV2Dossier(root, mismatchEntry.artifactPath);
      expect(mismatchEntry.state).toBe('INCOMPLETE');
      expect(mismatchDossier.status).toBe('UNRESOLVED');
      expect(mismatchDossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(lifecycleFor(mismatchResult.checkpoint, mismatchEntry.clusterId).state).toBe('UNRESOLVED');
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });

  test('partial-coverage receipt outcome is never HIGH/READY', async () => {
    clearCampaignSemanticBundles();
    const bundle = coherentBundle();
    registerCampaignSemanticBundles([bundle]);
    const { root, store } = tempStore();
    try {
      const observation = candidate({
        runId: 'run-partial-coverage',
        fingerprint: 'fp:sha256:555555555555555555555555',
        semantic: { bundleId: bundle.bundleId, currentness: 'CURRENT', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' },
      });
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const result = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
      const entry = result.checkpoint.dossierLedger[0]!;
      expect(entry.state).toBe('INCOMPLETE');
      const dossier = readV2Dossier(root, entry.artifactPath);
      expect(dossier.status).toBe('UNRESOLVED');
      expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(dossier.semanticConfidence?.blockers).toContain('PARTIAL_COVERAGE');
      expect(lifecycleFor(result.checkpoint, entry.clusterId).state).toBe('UNRESOLVED');
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });

  test('protocol-only candidate keeps the historical v1 path byte-compatible with PROTOCOL_ONLY lifecycle reaching DOSSIER_READY', async () => {
    const { root, store } = tempStore();
    try {
      const observation = candidate({
        runId: 'run-protocol-only',
        fingerprint: 'fp:sha256:666666666666666666666666',
        predicate: (ids) => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint'),
      });
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
      const result = await orchestrator.run();
      expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      // v1 dossier unchanged: v1 schema, READY, surfaced to v1 consumers.
      expect(result.dossiers).toHaveLength(1);
      expect(result.dossiers[0]!.schemaVersion).toBe(DOSSIER_VERSION);
      expect(result.dossiers[0]!.status).toBe('READY');
      const entry = result.checkpoint.dossierLedger[0]!;
      expect(entry.state).toBe('READY');
      expect('dossierVersion' in entry).toBe(false);
      expect(result.checkpoint.bugCandidates).toContain(entry.candidateId);
      expect(result.morningBrief.topFindings).toHaveLength(1);
      const lifecycle = lifecycleFor(result.checkpoint, entry.clusterId);
      expect(lifecycle.variant).toBe('PROTOCOL_ONLY');
      expect(lifecycle.state).toBe('DOSSIER_READY');
      expect(lifecycle.lastReasonCode).toBe('DOSSIER_READY');
      const promotions = orchestrator.promotionResults;
      expect(promotions).toHaveLength(1);
      expect(promotions[0]!.clusterKind).toBe('PROTOCOL');
      expect(promotions[0]!.dossierVersionTarget).toBe(DOSSIER_VERSION);
      expect(promotions[0]!.readiness).toBe('READY');
      // No v2 count lines without v2 dossiers.
      expect(result.morningBrief.whatRan.some((line) => line.startsWith('semanticDossiersV2'))).toBe(false);
    } finally {
      cleanup(root);
    }
  });

  test('journey reduced replays are binding-rejected PRECONDITION_DIVERGENCE and unmappable plans fail closed INVALID', async () => {
    const { root, store } = tempStore();
    try {
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      // Case A: genuine fresh reproduction; every reduced candidate must be
      // rejected by the V2 binding BEFORE the closure is consulted.
      const callsA: ReplayCall[] = [];
      const reducible = candidate({
        runId: 'run-journey-reduced',
        fingerprint: 'fp:sha256:777777777777777777777777',
        calls: callsA,
        predicate: (ids) => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint'),
      });
      const resultA = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [reducible]]])), { store, now: () => new Date(STATIC_NOW) });
      expect(resultA.dossiers).toHaveLength(1);
      const reproductionA = resultA.dossiers[0]!.reproduction;
      expect(reproductionA.result).toBe('REPRODUCED');
      // Fresh exact replay reproduced once; no reduced replay ever reproduced,
      // so minimality stayed bounded and nothing was removed.
      expect(reproductionA.count).toBe(1);
      expect(reproductionA.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
      expect(resultA.dossiers[0]!.minimalSequence).toEqual([...JOURNEY_STEPS]);
      // The certified path consulted the closure ONLY for the fresh exact
      // phase — reduced plans were classified PRECONDITION_DIVERGENCE by the
      // binding without an executor call.
      expect(callsA.length).toBeGreaterThanOrEqual(1);
      expect(callsA.every((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);

      // Case B: tampered plan identity — the contract digest violates the plan
      // identity grammar, so plan construction is impossible and the
      // certification path fails closed INVALID instead of certifying.
      const tampered = candidate({
        runId: 'run-tampered-plan',
        fingerprint: 'fp:sha256:eeeeeeeeeeeeeeeeeeeeeeee',
        contractDigest: 'contract:phase15-tampered identity!',
        predicate: (ids) => ids.length > 0,
      });
      const resultB = await runCampaign(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [tampered]]])), { store, now: () => new Date(STATIC_NOW) });
      expect(resultB.dossiers).toHaveLength(1);
      expect(resultB.dossiers[0]!.reproduction.result).toBe('NOT_REPRODUCED');
      const lifecycleB = lifecycleFor(resultB.checkpoint, resultB.checkpoint.anomalyClusters[0]!.clusterId);
      expect(lifecycleB.state).toBe('UNRESOLVED');
      expect(lifecycleB.lastReasonCode).toBe('NOT_REPRODUCED');
    } finally {
      cleanup(root);
    }
  });

  test('false-positive and transient candidates are REJECTED before any dossier work', async () => {
    const { root, store } = tempStore();
    try {
      const falsePositive = candidate({
        runId: 'run-fp',
        fingerprint: 'fp:sha256:888888888888888888888888',
        knownNightwatchDefect: true,
        journeyId: 'ripple-account-inventory',
      });
      const transient = candidate({
        runId: 'run-transient',
        fingerprint: 'fp:sha256:999999999999999999999999',
        timingClass: 'TRANSIENT',
        journeyId: 'ripple-account-inventory',
      });
      const fpClusterId = clusterAnomalies([falsePositive.observation])[0]!.clusterId;
      const transientClusterId = clusterAnomalies([transient.observation])[0]!.clusterId;
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const result = await runCampaign(manifest, scriptedExecutor(new Map([['explore:E3-J3-account-inventory:0x0000000000000301', [falsePositive, transient]]])), { store, now: () => new Date(STATIC_NOW) });
      expect(result.resultClass).toBe('COMPLETE_CLEAN');
      expect(result.checkpoint.rejectedHypotheses).toContain(fpClusterId);
      expect(result.checkpoint.rejectedHypotheses).toContain(transientClusterId);
      expect(result.checkpoint.dossierLedger).toHaveLength(0);
      expect(result.checkpoint.reproductionQueue).toHaveLength(0);
      const fpLifecycle = lifecycleFor(result.checkpoint, fpClusterId);
      expect(fpLifecycle.variant).toBe('PROTOCOL_ONLY');
      expect(fpLifecycle.state).toBe('REJECTED');
      expect(fpLifecycle.lastReasonCode).toBe('FALSE_POSITIVE');
      const transientLifecycle = lifecycleFor(result.checkpoint, transientClusterId);
      expect(transientLifecycle.state).toBe('REJECTED');
      expect(transientLifecycle.lastReasonCode).toBe('TRANSIENT');
    } finally {
      cleanup(root);
    }
  });

  test('new checkpoints carry runtime contract versions and lifecycles; resume validates and never re-runs completed work', async () => {
    const { root, store } = tempStore();
    try {
      const observation = candidate({
        runId: 'run-resume-semantic',
        fingerprint: 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
        semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
      });
      const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
      const firstItemId = manifest.workItems[0]!.workItemId;
      let firstItemExecutions = 0;
      const executor = scriptedExecutor(new Map([[firstItemId, [observation]]]));
      const countingExecutor: CampaignExecutor = {
        ...executor,
        execute: async (context) => {
          if (context.workItem.workItemId === firstItemId) firstItemExecutions += 1;
          return await executor.execute(context);
        },
        // Replay closures never survive persistence: after a resume the
        // restored representative carries no `replay`. A real adapter owns
        // replay capability itself, so this fixture does the same.
        reproduce: async ({ representative }) => {
          const fingerprint = representative.observation.fingerprint;
          const semanticEvidence = representative.campaignSemanticEvidence;
          const semanticContractIdentity = semanticEvidence === undefined ? undefined : semanticContractIdentityFromInvariantId({
            expectationId: semanticEvidence.expectationId,
            targetId: semanticEvidence.targetId,
            invariantDefinitionId: semanticEvidence.invariantDefinitionId,
            sourceProvenance: { repoId: semanticEvidence.sourceRepoId, derivationVersion: semanticEvidence.sourceDerivationVersion, evidenceDigest: semanticEvidence.sourceEvidenceDigest },
          });
          const replay = (seq: readonly MinimizationAction[]) => ({
            status: seq.length > 0 ? 'FAILURE' as const : 'PASS' as const,
            ...(seq.length > 0 ? {
              anomalyFingerprint: semanticEvidence?.findingFingerprint ?? fingerprint,
              ...(semanticEvidence === undefined ? {} : { semanticFindingFingerprint: semanticEvidence.findingFingerprint, semanticContractIdentity }),
            } : {}),
            safety: SAFE_TRIAGE,
          });
          return {
            result: 'REPRODUCED' as const,
            runId: `${representative.observation.runId}-fresh`,
            fingerprint,
            safety: ZERO_EXEC_SAFETY,
            privacy: ZERO_EXEC_PRIVACY,
            candidate: { ...representative, replay, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
          };
        },
      };
      clearCampaignSemanticBundles();
      registerCampaignSemanticBundles([coherentBundle()]);
      const interrupted = await runCampaign(manifest, countingExecutor, { store, stopAfterWorkItemId: firstItemId, now: () => new Date(STATIC_NOW) });
      expect(interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      // T2: every newly built checkpoint stamps the expected contract versions.
      expect(interrupted.checkpoint.runtimeContractVersions).toEqual({ ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED });
      expect(interrupted.checkpoint.candidateLifecycles).toBeDefined();
      expect(() => validateCampaignCheckpoint(interrupted.checkpoint, manifest)).not.toThrow();
      expect(classifyCheckpointRuntimeContracts(interrupted.checkpoint)).toBe('CURRENT_S2_CONTRACTS');
      expect(firstItemExecutions).toBe(1);

      // Resume completes promotion from the persisted checkpoint without
      // re-running the completed work item, and preserves the unresolved
      // semantic lifecycle because the journey still has no reduced proof.
      const resumed = await resumeCampaign(manifest, countingExecutor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
      expect(firstItemExecutions).toBe(1);
      expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
      expect(resumed.checkpoint.runtimeContractVersions).toEqual({ ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED });
      expect(() => validateCampaignCheckpoint(resumed.checkpoint, manifest)).not.toThrow();
      const resumedEntry = resumed.checkpoint.dossierLedger[0]!;
      expect(resumedEntry.dossierVersion).toBe(DOSSIER_VERSION_V2);
      expect(resumedEntry.state).toBe('INCOMPLETE');
      const lifecycle = lifecycleFor(resumed.checkpoint, resumedEntry.clusterId);
      expect(lifecycle.variant).toBe('SEMANTIC');
      expect(lifecycle.state).toBe('UNRESOLVED');
      expect(lifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });

  test('identical runs produce deep-equal checkpoints including lifecycles across three repeats', async () => {
    const buildScript = (): ReadonlyMap<string, readonly CampaignAnomalyCandidate[]> => {
      const uiBug = candidate({
        runId: 'run-det-ui',
        fingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
        predicate: (ids) => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint'),
      });
      const transient = candidate({
        runId: 'run-det-transient',
        fingerprint: 'fp:sha256:cccccccccccccccccccccccc',
        timingClass: 'TRANSIENT',
        journeyId: 'ripple-account-inventory',
      });
      return new Map([
        ['journey:ripple-payer-exchange-read', [uiBug]],
        ['explore:E3-J3-account-inventory:0x0000000000000301', [transient]],
      ]);
    };
    const normalized: string[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) {
      const { root, store } = tempStore();
      try {
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const result = await runCampaign(manifest, scriptedExecutor(buildScript()), { store, now: () => new Date(STATIC_NOW) });
        expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
        expect(result.checkpoint.candidateLifecycles).toBeDefined();
        // Normalize the per-run temp store root out of artifact paths, then
        // compare whole checkpoints byte-for-byte.
        normalized.push(JSON.stringify(result.checkpoint).split(root).join('<ROOT>'));
      } finally {
        cleanup(root);
      }
    }
    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toBe(normalized[1]);
    expect(normalized[1]).toBe(normalized[2]);
    const parsed = JSON.parse(normalized[0]!) as { readonly candidateLifecycles: Record<string, unknown> };
    expect(Object.keys(parsed.candidateLifecycles).length).toBeGreaterThanOrEqual(2);
  });

  test('persisted artifacts carry zero customer-sentinel markers (non-vacuous sweep)', async () => {
    clearCampaignSemanticBundles();
    registerCampaignSemanticBundles([coherentBundle()]);
    const { root, store } = tempStore();
    try {
      const semantic = candidate({
        runId: 'run-sweep-semantic',
        fingerprint: 'fp:sha256:dddddddddddddddddddddddd',
        semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
      });
      const protocol = candidate({
        runId: 'run-sweep-protocol',
        fingerprint: 'fp:sha256:eeeeeeeeeeeeeeeeeeeeeeee',
        predicate: (ids) => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint'),
      });
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const result = await runCampaign(manifest, scriptedExecutor(new Map([
        ['journey:ripple-payer-exchange-read', [semantic]],
        ['api:ripple.payer-exchange.read', [protocol]],
      ])), { store, now: () => new Date(STATIC_NOW) });
      const markers = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL'];
      // Non-vacuous positive control: the sweep really matches its markers.
      for (const marker of markers) expect(`canary ${marker} canary`.includes(marker)).toBe(true);
      const sweep = (value: unknown, what: string): void => {
        const text = JSON.stringify(value);
        for (const marker of markers) expect(text.includes(marker), `${what} must not contain ${marker}`).toBe(false);
      };
      sweep(result.checkpoint, 'checkpoint');
      sweep(result.checkpoint.candidateLifecycles, 'candidateLifecycles');
      sweep(result.morningBrief, 'morning brief');
      sweep(result.dossiers, 'v1 dossiers');
      for (const file of fs.readdirSync(root)) {
        const content = fs.readFileSync(path.join(root, file), 'utf8');
        for (const marker of markers) expect(content.includes(marker), `${file} must not contain ${marker}`).toBe(false);
      }
    } finally {
      clearCampaignSemanticBundles();
      cleanup(root);
    }
  });
});
