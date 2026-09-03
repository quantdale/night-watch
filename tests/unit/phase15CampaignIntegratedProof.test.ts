// ---------------------------------------------------------------------------
// Phase 15 Session 2 (Workstream G) — integrated synthetic campaign proof.
//
// One shared integrated scenario drives the REAL CampaignOrchestrator at full
// scope over the case categories that previously existed only in unit-level
// suites. The frozen budget policy caps one campaign at three promoted
// clusters (CAMPAIGN_CLUSTER_POLICY_EXCEEDED), so the scenario composes TWO
// synthetic campaigns from the same fixture family:
//    campaign A — duplicate occurrence pair (journey), reducible exploration
//                 cluster, vacuously non-reducible single-operation API cluster;
//    campaign B — multi-occurrence API candidate whose certified V2 replay
//                 fails closed (semantic path).
//   T1  duplicate occurrence identity at campaign scope: two observations
//       sharing one anomaly fingerprint collapse into ONE cluster with exactly
//       one coherent candidate-lifecycle progression (duplicate-suppression
//       semantics observed through the durable checkpoint ledger).
//   T2  API-phase replay divergence end to end: certified V2 replays
//       (executeReplayPlanV2 via CampaignOrchestrator.certifiedReplayClosure)
//       classify journey reduced plans exactly PRECONDITION_DIVERGENCE and API
//       plan-grammar violations fail closed INVALID — never silently PASS —
//       with the divergence visible in the campaign result and dossier inputs.
//   T3  reducible vs non-reducible minimization end to end: MINIMALITY_PROVEN
//       with a genuine reduced action set vs NO_REDUCIBLE_CANDIDATE, surfaced
//       truthfully in the SemanticAwarePromotionResult DTO.
//   T4  deterministic repeat proof: three fresh-orchestrator repeats of the
//       same fixtures produce deep-equal sanitized outputs (campaign result,
//       promotionResults stable JSON, checkpoints, persisted artifact bytes)
//       with zero privacy-sentinel leakage across every produced string.
//
// Synthetic fixtures only: synthetic sha/digest/fingerprint values, real
// journey contract step ids and approved Phase 4 read actions, frozen clock,
// temp PrivateArtifactStore per campaign. No credentials, no customer data,
// no network, no browser, no raw product values.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignOrchestrator,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignExecutor,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignPrivacyPolicy,
  type CampaignRunResult,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { clearCampaignSemanticBundles, registerCampaignSemanticBundles } from '../../src/core/campaign/realCampaignSemanticWiring';
import {
  CANDIDATE_LIFECYCLE_STATES,
  CANDIDATE_LIFECYCLE_VERSION,
  isTerminalCandidateLifecycleState,
  type CandidateLifecycleState,
} from '../../src/core/campaign/candidateLifecycle';
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
import { TRIAGE_REPLAY_PLAN_V2_VERSION, createTriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import { executeReplayPlanV2, validateReplayPlanV2 } from '../../src/core/triage/replayBinding';
import { DOSSIER_VERSION_V2, parseBugDossierV2 } from '../../src/core/triage/dossierV2';
import type { BugDossierV2 } from '../../src/core/triage/dossierV2';
import { stablePromotionResultJson, type SemanticAwarePromotionResult } from '../../src/core/triage/promotionResult';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION, createSemanticCampaignBundle, type SemanticCampaignBundle } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import type { CampaignSemanticCoverageState, CampaignSemanticCurrentness, CampaignSemanticReceiptOutcome } from '../../src/core/campaign/campaignSemanticEvidence';

const STATIC_NOW = '2026-08-21T02:00:00.000Z';
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
  // Frozen policy ceiling: at most three promoted clusters per campaign.
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
  nightwatchSourceSha: 'synthetic-phase15-integrated.v1',
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
  seedCorpusVersion: 'nightwatch.phase15.integrated-seeds.v1',
  budgetPolicyVersion: 'nightwatch.campaign-budget.private.v1',
  triageReplayPlanVersion: 'nightwatch.triage-replay-plan.private.v1',
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
const SYNTHETIC_SHA = '2222222222222222222222222222222222222222';
const SYNTHETIC_DIGEST = `ev:sha256:${'a'.repeat(24)}`;
const SYNTHETIC_INVARIANT = `inv:sha256:${'e'.repeat(24)}`;
const SYNTHETIC_FINDING_FP = `fp:sha256:${'f'.repeat(24)}`;
const DERIVATION_VERSION = REAL_SOURCE_DERIVATION_VERSION_V2;
const ADMISSION_VERSION = 'nightwatch.phase15.integrated-admission.synthetic.v1';

// Cluster fingerprints (fp:sha256:<24 hex> grammar).
const FP_DUP = 'fp:sha256:111111111111111111111111';
const FP_EXPLORATION_REDUCIBLE = 'fp:sha256:444444444444444444444444';
const FP_API_SINGLE = 'fp:sha256:555555555555555555555555';
const FP_API_MULTI_OCCURRENCE = 'fp:sha256:666666666666666666666666';

// Approved Phase 4 read actions inside envelope E1-J1-payer-exchange.
const EXPLORED_ACTIONS = ['p4.j1.vendor-local.aws', 'p4.j1.status-local.set', 'p4.j1.return-anchor'] as const;
const PAYER_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;
const COMMON_STEPS = ['common-navigate', 'common-structural-checkpoint'] as const;

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
      changesetId: 'cs-empty-phase15-integrated',
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
    budgetPolicy: TEST_BUDGET,
    privacyPolicy: PRIVACY_POLICY,
  };
}

function action(actionId: string, routeClass: string): MinimizationAction {
  return {
    actionId,
    semanticClass: 'KNOWN_READ',
    routeClass,
    sourceApproved: true,
    catalogVersion: 'nightwatch.phase15.integrated-action.v1',
  };
}

interface ReplayCall {
  readonly phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';
  readonly actionIds: readonly string[];
}

type JourneyId = 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory';

interface CandidateOptions {
  readonly runId: string;
  readonly fingerprint: string;
  /** null (default) keeps the candidate journey-unattributed (API/exploration kind). */
  readonly journeyId?: JourneyId | null;
  readonly routeClass?: string;
  readonly operationFamily?: string;
  readonly envelopeId?: string | null;
  readonly sequence?: readonly string[];
  readonly predicate?: (ids: readonly string[]) => boolean;
  readonly apiFailed?: boolean;
  /** External certified-replay call log; kept OUT of the candidate DTO so the
   *  persisted-candidate exact-shape validation stays untouched. */
  readonly calls?: ReplayCall[];
  /** When present the candidate routes through the semantic cluster path. */
  readonly semantic?: {
    readonly bundleId: string;
    readonly currentness: CampaignSemanticCurrentness;
    readonly receiptOutcome: CampaignSemanticReceiptOutcome;
    readonly coverageState?: CampaignSemanticCoverageState;
  };
}

function candidate(options: CandidateOptions): CampaignAnomalyCandidate {
  const journeyId = options.journeyId ?? null;
  const routeClass = options.routeClass ?? '/payer-exchange-rate-v2';
  const operationFamily = options.operationFamily ?? (journeyId === 'ripple-common-exchange-read' ? 'ripple.common-exchange.read' : TARGET);
  const sequence = (options.sequence ?? [...PAYER_STEPS]).map((id) => action(id, routeClass));
  const fingerprint = options.fingerprint;
  const predicate = options.predicate ?? ((ids: readonly string[]) => ids.length > 0);
  const replay = (reducedSequence: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
    options.calls?.push({ phase, actionIds: reducedSequence.map((item) => item.actionId) });
    const reproduces = predicate(reducedSequence.map((item) => item.actionId));
    return {
      status: reproduces ? 'FAILURE' as const : 'PASS' as const,
      ...(reproduces ? { anomalyFingerprint: fingerprint } : {}),
      safety: SAFE_TRIAGE,
    };
  };
  const api = options.apiFailed === undefined ? null : {
    available: true,
    failed: options.apiFailed,
    operationFamily,
    routeClass,
    structuralState: options.apiFailed ? 'api-error' : 'api-ready',
    statusClass: options.apiFailed ? '5xx' : '2xx',
    contentTypeClass: 'json',
    parseCategory: 'json',
    oracleFingerprint: fingerprint,
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
        envelopeId: options.envelopeId ?? null,
        oracleId: options.semantic !== undefined ? `semantic-${TARGET}` : 'oracle.phase15.integrated',
        routeClass,
        operationFamily,
        statusClass: '5xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: 'table-missing',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase15.integrated',
        browserApiResultClass: 'browser-only',
      },
      timingClass: 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase15-integrated-synthetic',
    contextKind: 'FIRST_OBSERVATION',
    originalSequence: sequence,
    technicalSeverity: 'HIGH',
    breadth: 'NARROW',
    browser: {
      failed: true,
      routeClass,
      structuralState: 'table-missing',
      operationFamily,
      statusClass: '5xx',
      contentTypeClass: 'json',
      oracleFingerprint: fingerprint,
      runtimeCategory: 'product',
    },
    api,
    sourceCorrelation: {
      journeyIds: journeyId === null ? [] : [journeyId],
      changedFiles: [],
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: 'synthetic.phase15.integrated.source.v1',
    },
    sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: false,
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15-integrated-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

interface LifecycleShape {
  readonly lifecycleVersion: string;
  readonly variant: string;
  readonly state: CandidateLifecycleState;
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

/** One executed campaign inside the integrated scenario. */
interface CampaignLeg {
  readonly tag: 'DUP' | 'API_DIVERGENCE' | 'MINIMIZATION';
  readonly root: string;
  readonly result: CampaignRunResult;
  readonly promotions: readonly SemanticAwarePromotionResult[];
  readonly callLogs: Readonly<Record<string, readonly ReplayCall[]>>;
}

interface IntegratedScenario {
  readonly legs: readonly CampaignLeg[];
  readonly promotions: readonly SemanticAwarePromotionResult[];
  /** Locate a durable cluster by anomaly fingerprint across all legs. */
  clusterByFingerprint: (fingerprint: string) => { readonly leg: CampaignLeg } & CampaignRunResult['checkpoint']['anomalyClusters'][number];
  lifecycleFor: (legTag: CampaignLeg['tag'], clusterId: string) => LifecycleShape;
  v1DossierByFingerprint: (fingerprint: string) => CampaignRunResult['dossiers'][number];
  v2DossierByFingerprint: (fingerprint: string) => BugDossierV2;
}

/**
 * Duplicate occurrence pair: identical fingerprint AND identical stable
 * features => one clusterKey; only the runId differs. The journey contract
 * predicate makes every REDUCED_CANDIDATE plan diverge at the V2 binding.
 */
function buildDupPair(): { readonly script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>; readonly callLogs: Readonly<Record<string, readonly ReplayCall[]>> } {
  const logsByRunId: Record<string, ReplayCall[]> = {};
  const logFor = (runId: string): ReplayCall[] => {
    const log: ReplayCall[] = [];
    logsByRunId[runId] = log;
    return log;
  };
  const payerPredicate = (ids: readonly string[]): boolean => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint');
  // The durable execution ledger requires unique fingerprints per work-item
  // record, so the duplicate occurrences arrive from TWO linked work items of
  // the same journey surface: the journey run and its envelope exploration.
  // Identical fingerprint + identical stable features => one clusterKey.
  const dupA = candidate({
    runId: 'run-dup-a',
    fingerprint: FP_DUP,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: payerPredicate,
    calls: logFor('run-dup-a'),
  });
  const dupB = candidate({
    runId: 'run-dup-b',
    fingerprint: FP_DUP,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: payerPredicate,
    calls: logFor('run-dup-b'),
  });
  return {
    script: new Map([
      ['journey:ripple-payer-exchange-read', [dupA]],
      ['explore:E1-J1-payer-exchange:0x0000000000000101', [dupB]],
    ]),
    callLogs: logsByRunId,
  };
}

/** Reducible exploration cluster plus the vacuously non-reducible API cluster. */
function buildMinimizationPair(): { readonly script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>; readonly callLogs: Readonly<Record<string, readonly ReplayCall[]>> } {
  const logsByRunId: Record<string, ReplayCall[]> = {};
  const logFor = (runId: string): ReplayCall[] => {
    const log: ReplayCall[] = [];
    logsByRunId[runId] = log;
    return log;
  };
  const explorationReducible = candidate({
    runId: 'run-exploration-reducible',
    fingerprint: FP_EXPLORATION_REDUCIBLE,
    journeyId: null,
    routeClass: '/payer-exchange-rate-v2',
    operationFamily: 'synthetic.phase15.exploration',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: EXPLORED_ACTIONS,
    // Only subsequences containing BOTH aws and status-set reproduce; every
    // other candidate genuinely passes, so ddmin can prove the survivor.
    predicate: (ids) => ids.includes('p4.j1.vendor-local.aws') && ids.includes('p4.j1.status-local.set'),
    calls: logFor('run-exploration-reducible'),
  });
  const apiSingle = candidate({
    runId: 'run-api-single',
    fingerprint: FP_API_SINGLE,
    journeyId: null,
    routeClass: '/global-exchange-rate-v2',
    operationFamily: 'ripple.common-exchange.read',
    sequence: ['ripple.common-exchange.read'],
    apiFailed: true,
    calls: logFor('run-api-single'),
  });
  return {
    script: new Map([
      ['explore:E1-J1-payer-exchange:0x0000000000000101', [explorationReducible]],
      ['api:ripple.common-exchange.read', [apiSingle]],
    ]),
    callLogs: logsByRunId,
  };
}

/** Multi-occurrence API candidate whose certified V2 replay fails closed. */
function buildApiDivergence(): { readonly script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>; readonly callLogs: Readonly<Record<string, readonly ReplayCall[]>> } {
  const logsByRunId: Record<string, ReplayCall[]> = {};
  const log: ReplayCall[] = [];
  logsByRunId['run-api-multi-occurrence'] = log;
  const apiMulti = candidate({
    runId: 'run-api-multi-occurrence',
    fingerprint: FP_API_MULTI_OCCURRENCE,
    journeyId: null,
    routeClass: '/payer-exchange-rate-v2',
    operationFamily: TARGET,
    // Two occurrences of the same certified API operation: the V2 plan grammar
    // admits exactly one original occurrence for API candidates, so the
    // certified fresh replay must fail closed instead of silently passing.
    sequence: [TARGET, TARGET],
    apiFailed: true,
    // createSemanticCampaignBundle derives a deterministic content-hash id, so
    // this matches the bundle registered by runIntegratedScenario.
    semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
    calls: log,
  });
  return {
    script: new Map([['api:ripple.payer-exchange.read', [apiMulti]]]),
    callLogs: logsByRunId,
  };
}

async function runLeg(tag: CampaignLeg['tag'], built: { readonly script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>; readonly callLogs: Readonly<Record<string, readonly ReplayCall[]>> }): Promise<CampaignLeg> {
  const { root, store } = tempStore();
  try {
    const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
    const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(built.script), { store, now: () => new Date(STATIC_NOW) });
    const result = await orchestrator.run();
    return { tag, root, result, promotions: orchestrator.promotionResults, callLogs: built.callLogs };
  } catch (error) {
    cleanup(root);
    throw error;
  }
}

/**
 * Run the full integrated scenario once. The frozen budget policy caps one
 * campaign at three promoted clusters, so the scenario composes three
 * synthetic campaigns from the same fixture family:
 *   DUP           — duplicate occurrence pair on the payer journey;
 *   API_DIVERGENCE— multi-occurrence API candidate (certified replay diverges);
 *   MINIMIZATION  — reducible exploration cluster + non-reducible API cluster.
 */
async function runIntegratedScenario(): Promise<IntegratedScenario> {
  clearCampaignSemanticBundles();
  registerCampaignSemanticBundles([coherentBundle()]);
  const legs: CampaignLeg[] = [];
  try {
    legs.push(await runLeg('DUP', buildDupPair()));
    legs.push(await runLeg('API_DIVERGENCE', buildApiDivergence()));
    legs.push(await runLeg('MINIMIZATION', buildMinimizationPair()));
    const clusterByFingerprint = (fingerprint: string) => {
      for (const leg of legs) {
        const cluster = leg.result.checkpoint.anomalyClusters.find((item) => item.fingerprint === fingerprint);
        if (cluster !== undefined) return { leg, ...cluster };
      }
      throw new Error(`cluster for ${fingerprint} not found in any leg`);
    };
    const lifecycleFor = (legTag: CampaignLeg['tag'], clusterId: string): LifecycleShape => {
      const leg = legs.find((item) => item.tag === legTag)!;
      const record = leg.result.checkpoint.candidateLifecycles?.[clusterId];
      expect(record, `lifecycle record for ${clusterId}`).toBeDefined();
      return record!;
    };
    const v1DossierByFingerprint = (fingerprint: string) => {
      for (const leg of legs) {
        const dossier = leg.result.dossiers.find((item) => item.oracleFingerprint === fingerprint);
        if (dossier !== undefined) return dossier;
      }
      throw new Error(`v1 dossier for ${fingerprint} not found`);
    };
    const v2DossierByFingerprint = (fingerprint: string): BugDossierV2 => {
      const cluster = clusterByFingerprint(fingerprint);
      const entry = cluster.leg.result.checkpoint.dossierLedger.find((item) => item.clusterId === cluster.clusterId);
      expect(entry, `dossier ledger entry for ${fingerprint}`).toBeDefined();
      expect(entry!.artifactPath).not.toBeNull();
      const raw = JSON.parse(fs.readFileSync(path.join(cluster.leg.root, path.relative(cluster.leg.root, entry!.artifactPath!)), 'utf8')) as Record<string, unknown>;
      // Artifacts are enveloped ({ dossier }) because the store spreads its
      // own wrapper status over the top level; the inner dossier is truth.
      return parseBugDossierV2((raw.dossier ?? raw) as unknown);
    };
    return {
      legs,
      promotions: legs.flatMap((leg) => leg.promotions),
      clusterByFingerprint,
      lifecycleFor,
      v1DossierByFingerprint,
      v2DossierByFingerprint,
    };
  } catch (error) {
    for (const leg of legs) cleanup(leg.root);
    clearCampaignSemanticBundles();
    throw error;
  }
}

/** Release an integrated scenario's temporary stores and semantic wiring. */
function teardown(scenario: IntegratedScenario): void {
  for (const leg of scenario.legs) cleanup(leg.root);
  clearCampaignSemanticBundles();
}

/** Recursively list every file under a leg's private store, sorted by path. */
function storedFiles(root: string): readonly { readonly relPath: string; readonly content: string }[] {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }).sort();
  return walk(root).map((full) => ({
    relPath: path.relative(root, full),
    content: fs.readFileSync(full, 'utf8').split(root).join('<ROOT>'),
  }));
}

test.describe('Phase 15 Session 2 Workstream G — integrated synthetic campaign proof', () => {
  test('T1: duplicate occurrence identity collapses into one cluster with exactly one coherent lifecycle progression', async () => {
    const scenario = await runIntegratedScenario();
    try {
      const dupLeg = scenario.legs[0]!;
      expect(dupLeg.tag).toBe('DUP');
      expect(dupLeg.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      // Both occurrences plus the fresh reproduction observation merge into
      // exactly ONE durable cluster: deduplicated/suppressed handling.
      const dupCluster = scenario.clusterByFingerprint(FP_DUP);
      expect(dupCluster.leg.tag).toBe('DUP');
      expect(dupCluster.occurrenceCount).toBe(3);
      expect(dupCluster.runIds).toEqual(['run-dup-a', 'run-dup-a-fresh', 'run-dup-b']);
      expect(dupCluster.reproductionCount).toBe(1);
      expect(dupCluster.primaryRunId).toBe('run-dup-a-fresh');
      // Exactly one cluster exists for the duplicated identity — the second
      // observation never got its own cluster or queue slot.
      expect(dupLeg.result.checkpoint.anomalyClusters.filter((item) => item.fingerprint === FP_DUP)).toHaveLength(1);
      expect(dupLeg.result.checkpoint.reproductionQueue.filter((item) => item.clusterId === dupCluster.clusterId)).toHaveLength(1);
      expect(dupLeg.result.checkpoint.reproductionQueue.find((item) => item.clusterId === dupCluster.clusterId)).toMatchObject({ state: 'COMPLETED', result: 'REPRODUCED' });
      // Exactly one lifecycle record progresses for the whole identity, along
      // the legal OBSERVED -> ... -> DOSSIER_READY path (5 transitions).
      const recordsForDup = Object.entries(dupLeg.result.checkpoint.candidateLifecycles ?? {}).filter(([clusterId]) => clusterId === dupCluster.clusterId);
      expect(recordsForDup).toHaveLength(1);
      const lifecycle = scenario.lifecycleFor('DUP', dupCluster.clusterId);
      expect(lifecycle.lifecycleVersion).toBe(CANDIDATE_LIFECYCLE_VERSION);
      expect(CANDIDATE_LIFECYCLE_STATES).toContain(lifecycle.state);
      expect(lifecycle.variant).toBe('PROTOCOL_ONLY');
      expect(lifecycle.state).toBe('DOSSIER_READY');
      expect(isTerminalCandidateLifecycleState(lifecycle.state)).toBe(true);
      expect(lifecycle.transitionCount).toBe(5);
      expect(lifecycle.lastReasonCode).toBe('DOSSIER_READY');
      // Global coherence: one lifecycle record per cluster, no duplicate
      // records anywhere, all terminal after the completed campaign.
      const lifecycles = dupLeg.result.checkpoint.candidateLifecycles ?? {};
      expect(Object.keys(lifecycles)).toHaveLength(dupLeg.result.checkpoint.anomalyClusters.length);
      expect(new Set(Object.keys(lifecycles)).size).toBe(dupLeg.result.checkpoint.anomalyClusters.length);
      for (const record of Object.values(lifecycles)) {
        expect(isTerminalCandidateLifecycleState(record.state)).toBe(true);
      }
      // Exactly one v1 bug candidate carries the duplicated identity forward.
      const dupLedgerEntries = dupLeg.result.checkpoint.dossierLedger.filter((item) => item.clusterId === dupCluster.clusterId);
      expect(dupLedgerEntries).toHaveLength(1);
      expect(dupLedgerEntries[0]!.state).toBe('READY');
      expect('dossierVersion' in dupLedgerEntries[0]!).toBe(false);
      expect(dupLeg.result.checkpoint.bugCandidates).toContain(dupLedgerEntries[0]!.candidateId);
      // The converged promotion verdict exists exactly once for this cluster.
      expect(scenario.promotions.filter((item) => item.clusterId === dupCluster.clusterId)).toHaveLength(1);
    } finally {
      teardown(scenario);
    }
  });

  test('T2: certified V2 replay divergence is visible end to end — journey reduced plans classify PRECONDITION_DIVERGENCE and API grammar violations fail closed INVALID', async () => {
    const scenario = await runIntegratedScenario();
    try {
      const dupLeg = scenario.legs[0]!;
      const apiLeg = scenario.legs[1]!;
      expect(dupLeg.tag).toBe('DUP');
      expect(apiLeg.tag).toBe('API_DIVERGENCE');
      expect(dupLeg.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      expect(apiLeg.result.resultClass).toBe('COMPLETE_CLEAN');

      // --- Journey reduced semantics: binding-rejected before any executor call.
      // The duplicate-pair cluster is journey-kind: every reduced candidate was
      // classified PRECONDITION_DIVERGENCE by the V2 binding WITHOUT calling
      // the executor — recorded calls are exclusively fresh-exact phases,
      // minimality stayed bounded, and the original sequence was never silently
      // reduced or passed through.
      const dupCluster = scenario.clusterByFingerprint(FP_DUP);
      const dupDossier = scenario.v1DossierByFingerprint(FP_DUP);
      expect(dupDossier.minimalSequence).toEqual([...PAYER_STEPS]);
      expect(dupDossier.reproduction.result).toBe('REPRODUCED');
      expect(dupDossier.reproduction.count).toBe(1);
      expect(dupDossier.reproduction.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
      // Only the cluster representative is ever replayed; across the whole
      // duplicate pair no REDUCED_CANDIDATE executor call exists — every
      // reduced plan was binding-rejected before execution (never silent PASS).
      const dupPairCalls = [...(dupLeg.callLogs['run-dup-a'] ?? []), ...(dupLeg.callLogs['run-dup-b'] ?? [])];
      expect(dupPairCalls.length).toBeGreaterThanOrEqual(1);
      expect(dupPairCalls.every((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);
      const dupPromotion = scenario.promotions.find((item) => item.clusterId === dupCluster.clusterId);
      expect(dupPromotion).toBeDefined();
      expect(dupPromotion!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(dupPromotion!.minimization).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
      expect(dupPromotion!.readiness).toBe('READY');
      expect(scenario.lifecycleFor('DUP', dupCluster.clusterId).state).toBe('DOSSIER_READY');

      // --- API reduced semantics: the V2 plan grammar admits exactly one
      // original occurrence for API candidates, so a two-occurrence API
      // original can never be certified. The divergence is visible across the
      // whole campaign result: CLEAN verdict (no admitted finding), UNRESOLVED
      // v2 dossier, EXACT_REPLAY_INVALID promotion verdict, terminal
      // UNRESOLVED lifecycle — never silent PASS.
      const apiCluster = scenario.clusterByFingerprint(FP_API_MULTI_OCCURRENCE);
      expect(apiCluster.leg.tag).toBe('API_DIVERGENCE');
      const apiEntry = apiLeg.result.checkpoint.dossierLedger.find((item) => item.clusterId === apiCluster.clusterId);
      expect(apiEntry).toBeDefined();
      expect(apiEntry!.state).toBe('INCOMPLETE');
      expect(apiEntry!.dossierVersion).toBe(DOSSIER_VERSION_V2);
      expect(apiLeg.result.checkpoint.bugCandidates).not.toContain(apiEntry!.candidateId);
      const apiDossier = scenario.v2DossierByFingerprint(FP_API_MULTI_OCCURRENCE);
      expect(apiDossier.status).toBe('UNRESOLVED');
      expect(apiDossier.semanticTriageEvidence?.exactReplayStatus).toBe('INVALID');
      expect(apiDossier.semanticTriageEvidence?.missingEvidence).toContain('EXACT_REPLAY_REQUIRED');
      expect(apiDossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(apiDossier.reproduction.result).toBe('NOT_REPRODUCED');
      const apiPromotion = scenario.promotions.find((item) => item.clusterId === apiCluster.clusterId);
      expect(apiPromotion).toBeDefined();
      expect(apiPromotion!.clusterKind).toBe('SEMANTIC');
      expect(apiPromotion!.replayEvidence).toBe('EXACT_REPLAY_INVALID');
      expect(apiPromotion!.minimization).toBe('NO_REDUCIBLE_CANDIDATE');
      expect(apiPromotion!.readiness).toBe('UNRESOLVED');
      expect(apiPromotion!.dossierVersionTarget).toBe(DOSSIER_VERSION_V2);
      const apiLifecycle = scenario.lifecycleFor('API_DIVERGENCE', apiCluster.clusterId);
      expect(apiLifecycle.variant).toBe('SEMANTIC');
      expect(apiLifecycle.state).toBe('UNRESOLVED');
      expect(apiLifecycle.lastReasonCode).toBe('NOT_REPRODUCED');
      // The adapter-level reproduction succeeded, but the CERTIFIED fresh
      // replay diverged fail-closed: the executor was invoked exactly once
      // (adapter reproduce), and the certified minimization path never reached
      // it — proof the divergence was classified before any execution.
      expect(apiLeg.result.checkpoint.reproductionQueue.find((item) => item.clusterId === apiCluster.clusterId)).toMatchObject({ state: 'COMPLETED', result: 'REPRODUCED' });
      const apiCalls = apiLeg.callLogs['run-api-multi-occurrence'] ?? [];
      expect(apiCalls).toHaveLength(1);
      expect(apiCalls[0]!.phase).toBe('FRESH_EXACT_REPLAY');

      // --- Binding-level classification, mirroring certifiedReplayClosure's
      // plan construction: journey REDUCED_CANDIDATE plans classify exactly
      // PRECONDITION_DIVERGENCE without invoking the executor; multi-
      // occurrence API plans cannot even be constructed (fail closed).
      let spyCalls = 0;
      const spy = (): { status: 'FAILURE'; safety: typeof SAFE_TRIAGE; anomalyFingerprint: string } => {
        spyCalls += 1;
        return { status: 'FAILURE', safety: SAFE_TRIAGE, anomalyFingerprint: FP_DUP };
      };
      const journeyReducedPlan = createTriageReplayPlanV2({
        candidateKind: 'JOURNEY',
        anomalyFingerprint: FP_DUP,
        originalOccurrences: [
          { ordinal: 0, expectedActionId: 'common-navigate' },
          { ordinal: 1, expectedActionId: 'common-structural-checkpoint' },
        ],
        retainedOccurrenceOrdinals: [0],
        phase: 'REDUCED_CANDIDATE',
        targetId: 'ripple-common-exchange-read',
        contractVersion: JOURNEY_CONTRACT_VERSION,
        contractDigest: 'contract:phase15-integrated-synthetic',
        catalogVersion: SAFE_ACTION_CATALOG_VERSION,
        sourceVersion: 'synthetic.phase15.integrated.source.v1',
        routeClass: '/global-exchange-rate-v2',
      });
      const journeyOutcome = await executeReplayPlanV2(journeyReducedPlan, spy);
      expect(journeyOutcome.status).toBe('INVALID');
      expect(journeyOutcome.invalidReason).toBe('PRECONDITION_DIVERGENCE');
      expect(spyCalls).toBe(0);
      const apiRawPlan = {
        schemaVersion: TRIAGE_REPLAY_PLAN_V2_VERSION,
        planId: `rp2:sha256:${'0'.repeat(24)}`,
        candidateKind: 'API',
        anomalyFingerprint: FP_API_MULTI_OCCURRENCE,
        originalOccurrences: [
          { ordinal: 0, expectedActionId: TARGET },
          { ordinal: 1, expectedActionId: TARGET },
        ],
        retainedOccurrenceOrdinals: [0, 1],
        phase: 'REDUCED_CANDIDATE',
        targetId: TARGET,
        contractVersion: JOURNEY_CONTRACT_VERSION,
        contractDigest: 'contract:phase15-integrated-synthetic',
        catalogVersion: SAFE_ACTION_CATALOG_VERSION,
        sourceVersion: 'synthetic.phase15.integrated.source.v1',
        routeClass: '/payer-exchange-rate-v2',
      };
      expect(validateReplayPlanV2(apiRawPlan as never).valid).toBe(false);
      expect(() => createTriageReplayPlanV2({
        candidateKind: 'API',
        anomalyFingerprint: FP_API_MULTI_OCCURRENCE,
        originalOccurrences: [
          { ordinal: 0, expectedActionId: TARGET },
          { ordinal: 1, expectedActionId: TARGET },
        ],
        retainedOccurrenceOrdinals: [0, 1],
        phase: 'REDUCED_CANDIDATE',
        targetId: TARGET,
        contractVersion: JOURNEY_CONTRACT_VERSION,
        contractDigest: 'contract:phase15-integrated-synthetic',
        catalogVersion: SAFE_ACTION_CATALOG_VERSION,
        sourceVersion: 'synthetic.phase15.integrated.source.v1',
        routeClass: '/payer-exchange-rate-v2',
      })).toThrow(/REPLAY_PLAN_V2_CREATE_FAILED/);
    } finally {
      teardown(scenario);
    }
  });

  test('T3: reducible vs non-reducible minimization surfaces truthful ReductionEvidenceClass values in SemanticAwarePromotionResult', async () => {
    const scenario = await runIntegratedScenario();
    try {
      const minimizationLeg = scenario.legs[2]!;
      expect(minimizationLeg.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');

      // Reducible exploration cluster: ddmin removes the return-anchor action,
      // a genuine reduced-candidate replay reproduces on the survivor, and the
      // bounded audit observes genuine non-reproductions => MINIMALITY_PROVEN
      // with a real reduced action set.
      const expCluster = scenario.clusterByFingerprint(FP_EXPLORATION_REDUCIBLE);
      const expDossier = scenario.v1DossierByFingerprint(FP_EXPLORATION_REDUCIBLE);
      expect(expDossier.minimalSequence).toEqual(['p4.j1.vendor-local.aws', 'p4.j1.status-local.set']);
      expect(expDossier.reproduction.result).toBe('REPRODUCED');
      expect(expDossier.reproduction.count).toBe(2);
      expect(expDossier.reproduction.minimalityGuarantee).toBe('1-MINIMAL');
      const expCalls = minimizationLeg.callLogs['run-exploration-reducible'] ?? [];
      // The survivor reduced set was genuinely executed during minimization.
      expect(expCalls.some((call) => call.phase === 'REDUCED_CANDIDATE' && call.actionIds.join('|') === 'p4.j1.vendor-local.aws|p4.j1.status-local.set')).toBe(true);
      const expPromotion = scenario.promotions.find((item) => item.clusterId === expCluster.clusterId);
      expect(expPromotion).toBeDefined();
      expect(expPromotion!.clusterKind).toBe('PROTOCOL');
      expect(expPromotion!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(expPromotion!.minimization).toBe('MINIMALITY_PROVEN');
      expect(expPromotion!.readiness).toBe('READY');
      expect(expPromotion!.dossierVersionTarget).toBe(DOSSIER_VERSION);
      const expLifecycle = scenario.lifecycleFor('MINIMIZATION', expCluster.clusterId);
      expect(expLifecycle.state).toBe('DOSSIER_READY');
      // Phase 15H hardening (DEF-13): reducible candidates route through the
      // A05-round-2 CLUSTERED state (+1 transition vs the historical count).
      expect(expLifecycle.transitionCount).toBe(6);

      // Non-reducible single-operation API cluster: the certified V2 API plan
      // grammar admits exactly one occurrence, so no reduced candidate ever
      // exists => NO_REDUCIBLE_CANDIDATE, truthfully not a proven minimum.
      const singleCluster = scenario.clusterByFingerprint(FP_API_SINGLE);
      const singleDossier = scenario.v1DossierByFingerprint(FP_API_SINGLE);
      expect(singleDossier.minimalSequence).toEqual(['ripple.common-exchange.read']);
      expect(singleDossier.reproduction.result).toBe('REPRODUCED');
      expect(singleDossier.reproduction.count).toBe(1);
      expect(singleDossier.reproduction.minimalityGuarantee).toBe('1-MINIMAL');
      const singleCalls = minimizationLeg.callLogs['run-api-single'] ?? [];
      expect(singleCalls.every((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);
      const singlePromotion = scenario.promotions.find((item) => item.clusterId === singleCluster.clusterId);
      expect(singlePromotion).toBeDefined();
      expect(singlePromotion!.clusterKind).toBe('PROTOCOL');
      expect(singlePromotion!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(singlePromotion!.minimization).toBe('NO_REDUCIBLE_CANDIDATE');
      expect(singlePromotion!.readiness).toBe('READY');
      expect(singlePromotion!.dossierVersionTarget).toBe(DOSSIER_VERSION);
      const singleLifecycle = scenario.lifecycleFor('MINIMIZATION', singleCluster.clusterId);
      expect(singleLifecycle.state).toBe('DOSSIER_READY');
      expect(singleLifecycle.lastReasonCode).toBe('DOSSIER_READY');

      // The DTO ledger carries both classes side by side, converged per
      // cluster, with no fabricated third verdict for either cluster.
      const classes = scenario.promotions
        .filter((item) => item.clusterId === expCluster.clusterId || item.clusterId === singleCluster.clusterId)
        .map((item) => item.minimization)
        .sort();
      expect(classes).toEqual(['MINIMALITY_PROVEN', 'NO_REDUCIBLE_CANDIDATE']);
    } finally {
      teardown(scenario);
    }
  });

  test('T4: three repeat runs produce deep-equal sanitized outputs with zero privacy-sentinel leakage', async () => {
    const markers = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL'];
    // Non-vacuous positive control: the sweep really matches its markers.
    for (const marker of markers) expect(`canary ${marker} canary`.includes(marker)).toBe(true);
    const sweepText = (text: string, what: string): void => {
      for (const marker of markers) expect(text.includes(marker), `${what} must not contain ${marker}`).toBe(false);
    };
    const sweepValue = (value: unknown, what: string): void => sweepText(JSON.stringify(value), what);

    const normalized: { checkpoints: string; promotions: string; briefs: string; resultJson: string; files: string }[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) {
      const scenario = await runIntegratedScenario();
      try {
        expect(scenario.legs.map((leg) => leg.result.resultClass)).toEqual(['COMPLETE_WITH_FINDINGS', 'COMPLETE_CLEAN', 'COMPLETE_WITH_FINDINGS']);
        expect(scenario.promotions).toHaveLength(4);
        // Structural spot-checks on the canonical repeat fixture.
        expect(scenario.legs[0]!.result.checkpoint.anomalyClusters.some((item) => item.occurrenceCount === 3)).toBe(true);
        expect(scenario.promotions.map((item) => item.minimization).sort()).toEqual([
          'MINIMALITY_PROVEN',
          'NO_REDUCIBLE_CANDIDATE',
          'NO_REDUCIBLE_CANDIDATE',
          'REDUCTION_PRECONDITION_UNAVAILABLE',
        ]);
        // Normalize the per-run temp store roots out of every artifact path,
        // then capture the sanitized outputs byte-for-byte.
        const normalizeWith = (roots: readonly string[], value: string): string =>
          roots.reduce((acc, root) => acc.split(root).join(`<ROOT_${root.length}>`), value);
        const roots = scenario.legs.map((leg) => leg.root);
        normalized.push({
          checkpoints: JSON.stringify(scenario.legs.map((leg) => normalizeWith(roots, JSON.stringify(leg.result.checkpoint)))),
          promotions: stablePromotionResultJson(scenario.promotions),
          briefs: JSON.stringify(scenario.legs.map((leg) => normalizeWith(roots, JSON.stringify(leg.result.morningBrief)))),
          resultJson: JSON.stringify(scenario.legs.map((leg) => normalizeWith(roots, JSON.stringify({
            campaignId: leg.result.campaignId,
            manifestFingerprint: leg.result.manifest.manifestFingerprint,
            resultClass: leg.result.resultClass,
            stopReason: leg.result.stopReason,
            checkpoint: leg.result.checkpoint,
            dossiers: leg.result.dossiers,
            artifactPaths: leg.result.artifactPaths,
          })))),
          files: JSON.stringify(scenario.legs.flatMap((leg) => storedFiles(leg.root))),
        });
        sweepValue(scenario.legs.map((leg) => leg.result.checkpoint), `repeat ${repeat} checkpoints`);
        sweepValue(scenario.promotions, `repeat ${repeat} promotionResults`);
        sweepText(stablePromotionResultJson(scenario.promotions), `repeat ${repeat} promotionResults stable JSON`);
        sweepText(normalized[normalized.length - 1]!.briefs, `repeat ${repeat} morning briefs`);
        sweepText(normalized[normalized.length - 1]!.files, `repeat ${repeat} persisted artifacts`);
      } finally {
        teardown(scenario);
      }
    }
    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toEqual(normalized[1]);
    expect(normalized[1]).toEqual(normalized[2]);

    // The repeated scenario really exercised all case categories.
    const parsedCheckpoints = (JSON.parse(normalized[0]!.checkpoints) as readonly string[]).map((raw) => JSON.parse(raw) as { readonly candidateLifecycles: Record<string, LifecycleShape>; readonly anomalyClusters: readonly { readonly occurrenceCount: number }[] });
    expect(parsedCheckpoints[0]!.anomalyClusters.some((item) => item.occurrenceCount === 3)).toBe(true);
    expect(Object.keys(parsedCheckpoints[0]!.candidateLifecycles)).toHaveLength(1);
    expect(Object.keys(parsedCheckpoints[2]!.candidateLifecycles)).toHaveLength(2);
    const parsedPromotions = JSON.parse(normalized[0]!.promotions) as readonly SemanticAwarePromotionResult[];
    expect(parsedPromotions.map((item) => item.minimization).sort()).toEqual([
      'MINIMALITY_PROVEN',
      'NO_REDUCIBLE_CANDIDATE',
      'NO_REDUCIBLE_CANDIDATE',
      'REDUCTION_PRECONDITION_UNAVAILABLE',
    ]);
    expect(parsedPromotions.some((item) => item.replayEvidence === 'EXACT_REPLAY_INVALID')).toBe(true);
  });
});
