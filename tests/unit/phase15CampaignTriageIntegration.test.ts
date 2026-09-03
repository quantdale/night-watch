// ---------------------------------------------------------------------------
// Phase 15 Session 2 (Workstream G) — MODERATE CAMPAIGN/TRIAGE INTEGRATION PACK.
//
// One describe block per Session-2 campaign/triage case family; every case is
// END-TO-END through the REAL orchestrator (runCampaign, prepare+resume, or
// CampaignOrchestrator.run) and asserts the campaign result class, dossier
// versions/statuses, lifecycle terminal states, and promotion-result coherence:
//   F1  protocol-only: v1 dossier READY, PROTOCOL_ONLY lifecycle DOSSIER_READY
//   F2  semantic-current coherent: v2 READY + HIGH + eligible promotion result
//   F3  semantic-stale: v2 UNRESOLVED, never HIGH
//   F4  partial-coverage receipt: never HIGH/READY
//   F5  replay divergence: mismatched-fingerprint replay never certified
//   F6  reducible candidate: MINIMALITY_PROVEN with reachable 1-MINIMAL
//   F7  journey-style non-reducible: REDUCTION_PRECONDITION_UNAVAILABLE
//   F8  false-positive + transient REJECTED before dossier work
//   F9  duplicate occurrences: ONE cluster (occurrenceCount 2), one dossier,
//       one lifecycle record
//   F10 version drift on resume fails closed before any executor callback
//   F11 mid-campaign resume carries semantic lifecycle state legally forward
//   F12 determinism floor: full matrix deep-equal across three repeats
//   F13 safety/privacy floors incl. non-vacuous sentinel sweep + file modes
//
// Synthetic fixtures only: synthetic sha/digest/fingerprint values, real
// journey contract step ids (identities, not network calls), frozen clock,
// temp PrivateArtifactStore per test. No credentials, no customer data.
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
  CampaignProcessInterruptionError,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  assertManifestCompatible,
  classifyCheckpointRuntimeContracts,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  runCampaign,
  validateCampaignCheckpoint,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignCheckpoint,
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
import { minimizeFailure } from '../../src/core/triage/minimizer';
import { normalizeExecutorOutcome } from '../../src/core/triage/executorNormalization';
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from '../../src/core/triage/replayPlan';
import { DOSSIER_VERSION_V2, isReadySemanticDossier, parseBugDossierV2 } from '../../src/core/triage/dossierV2';
import type { BugDossierV2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION, createSemanticTriageEvidence } from '../../src/core/triage/semanticTriageEvidence';
import { rankSemanticConfidence } from '../../src/core/triage/semanticConfidence';
import { semanticPromotionEligible, type SemanticAwarePromotionResult } from '../../src/core/triage/promotionResult';
import { SEMANTIC_CLUSTER_VERSION, semanticContractIdentityFromInvariantId } from '../../src/oracles/semantic/cluster';
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
  maxPromotedClusters: 3,
  maxPrivateEvidenceBytes: 20 * 1024 * 1024,
});

// The determinism/safety matrix runs three sub-campaigns; TEST_BUDGET's
// maxPromotedClusters=3 is exactly the frozen policy cap.

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

// --- Synthetic identity (fixed approved target; V2 plan grammar needs fp:sha256:<24 hex>) ---

const TARGET = 'ripple.payer-exchange.read';
const JOURNEY_ID = 'ripple-payer-exchange-read' as const;
const ROUTE_CLASS = '/payer-exchange-rate-v2';
const ENVELOPE_ID = 'E1-J1-payer-exchange';
const JOURNEY_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;
const BOTH_PAYER_STEPS = (ids: readonly string[]): boolean => ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint');
const SYNTHETIC_SHA = '1111111111111111111111111111111111111111';
const SYNTHETIC_DIGEST = `ev:sha256:${'b'.repeat(24)}`;
const SYNTHETIC_INVARIANT = `inv:sha256:${'d'.repeat(24)}`;
// Distinct invariant identities: the semantic cluster key is expectation/
// target/invariant/provenance (NOT fingerprint), so same-target families need
// distinct invariant definitions to stay separate clusters.
const STALE_INVARIANT = `inv:sha256:${'e'.repeat(24)}`;
const PARTIAL_INVARIANT = `inv:sha256:${'f'.repeat(24)}`;
const DERIVATION_VERSION = REAL_SOURCE_DERIVATION_VERSION_V2;
const ADMISSION_VERSION = 'nightwatch.phase15.collection-admission.synthetic.v1';

// Distinct 24-hex fingerprints per family (lowercase hex only, plan-grammar safe).
const FP_PROTOCOL = 'fp:sha256:a1a1a1a1a1a1a1a1a1a1a1a1';
const FP_CURRENT = 'fp:sha256:b2b2b2b2b2b2b2b2b2b2b2b2';
const FP_STALE = 'fp:sha256:c3c3c3c3c3c3c3c3c3c3c3c3';
const FP_PARTIAL = 'fp:sha256:d4d4d4d4d4d4d4d4d4d4d4d4';
const FP_MISMATCH_TARGET = 'fp:sha256:e5e5e5e5e5e5e5e5e5e5e5e5';
const FP_MISMATCH_WRONG = 'fp:sha256:f0f0f0f0f0f0f0f0f0f0f0f0';
const FP_REDUCIBLE = 'fp:sha256:abababababababababababab';
const FP_DUP = 'fp:sha256:cdbdcdbdcdbdcdbdcdbdcdbd';
const FP_TRANSIENT = 'fp:sha256:918291829182918291829182';
const FP_FALSE_POSITIVE = 'fp:sha256:7a7a7a7a7a7a7a7a7a7a7a7a';

// Approved Phase 4 exploration actions (real catalog identities): a genuinely
// reducible 3-action sequence where the first two are required and the third
// is removable. All ids exist in RIPPLE_PHASE4_ACTIONS so the V2 exploration
// binding admits reduced-candidate replays.
const REDUCIBLE_SEQUENCE = ['p4.j2.vendor-read.aws', 'p4.j3.sort-account', 'p4.j1.vendor-local.gcp'] as const;
const EXPLORE_WORK_ITEM = 'explore:E3-J3-account-inventory:0x0000000000000301';

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
  /** null builds an exploration-kind candidate (no journey, no API observation). */
  readonly journeyId?: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory' | null;
  readonly operationFamily?: string;
  readonly calls?: ReplayCall[];
  /** When present the candidate routes through the semantic cluster path. */
  readonly semantic?: {
    readonly bundleId: string;
    readonly currentness: CampaignSemanticCurrentness;
    readonly receiptOutcome: CampaignSemanticReceiptOutcome;
    readonly coverageState?: CampaignSemanticCoverageState;
    /** Overrides the invariant definition identity (cluster-key input). */
    readonly invariantId?: string;
  };
}

function candidate(options: CandidateOptions): CampaignAnomalyCandidate {
  const journeyId = options.journeyId === undefined ? JOURNEY_ID : options.journeyId;
  const operationFamily = options.operationFamily ?? TARGET;
  const routeClass = journeyId === 'ripple-payer-exchange-read'
    ? ROUTE_CLASS
    : journeyId === 'ripple-common-exchange-read' ? '/global-exchange-rate-v2' : '/accounts';
  const envelopeId = journeyId === 'ripple-payer-exchange-read'
    ? ENVELOPE_ID
    : journeyId === 'ripple-common-exchange-read' ? 'E2-J2-common-exchange' : 'E3-J3-account-inventory';
  const sequence = (options.sequence ?? [...JOURNEY_STEPS]).map((id) => action(id, routeClass));
  const fingerprint = options.fingerprint;
  const predicate = options.predicate ?? ((ids: readonly string[]) => ids.length > 0);
  const semanticContractIdentity = options.semantic === undefined ? undefined : semanticContractIdentityFromInvariantId({
    expectationId: TARGET,
    targetId: TARGET,
    invariantDefinitionId: options.semantic.invariantId ?? SYNTHETIC_INVARIANT,
    sourceProvenance: { repoId: 'corpus/phase15/source-fixture', derivationVersion: DERIVATION_VERSION, evidenceDigest: SYNTHETIC_DIGEST },
  });
  const replay = (sequenceToReplay: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
    options.calls?.push({ phase, actionIds: sequenceToReplay.map((item) => item.actionId) });
    const reproduces = predicate(sequenceToReplay.map((item) => item.actionId));
    return {
      status: reproduces ? 'FAILURE' as const : 'PASS' as const,
      ...(reproduces ? {
        anomalyFingerprint: fingerprint,
        ...(options.semantic === undefined ? {} : { semanticFindingFingerprint: fingerprint, semanticContractIdentity }),
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
    findingFingerprint: fingerprint,
    findingCategory: 'SOURCE_EXPECTATION_MISMATCH' as const,
    invariantDefinitionId: options.semantic.invariantId ?? SYNTHETIC_INVARIANT,
  };
  return {
    observation: {
      runId: options.runId,
      observedAt: STATIC_NOW,
      fingerprint,
      features: {
        journeyId,
        envelopeId,
        oracleId: options.semantic !== undefined ? `semantic-${TARGET}` : 'oracle.phase15.synthetic',
        routeClass,
        operationFamily,
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
    contractDigest: 'contract:phase15-synthetic',
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
    api: null,
    sourceCorrelation: {
      journeyIds: journeyId === null ? [] : [journeyId],
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

interface ExecutorCounters {
  readonly preflight: () => number;
  readonly execute: () => number;
  readonly reproduce: () => number;
}

type ReproduceInput = Parameters<NonNullable<CampaignExecutor['reproduce']>>[0];
type ReproductionOutcome = Awaited<ReturnType<NonNullable<CampaignExecutor['reproduce']>>>;

function scriptedExecutor(
  script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>,
  overrides: {
    readonly reproduce?: (input: ReproduceInput) => Promise<ReproductionOutcome>;
    readonly counters?: ExecutorCounters;
  } = {},
): CampaignExecutor {
  const counters = overrides.counters;
  return {
    preflight: () => {
      counters?.preflight();
      return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
    },
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }): Promise<CampaignExecutionOutcome> => {
      counters?.execute();
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
    reproduce: async (input: ReproduceInput): Promise<ReproductionOutcome> => {
      counters?.reproduce();
      if (overrides.reproduce !== undefined) return await overrides.reproduce(input);
      const { representative } = input;
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15-integration-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

/** Read + strictly validate the v2 dossier artifact referenced by a ledger entry. */
function readV2Dossier(root: string, artifactPath: string | null): BugDossierV2 {
  expect(artifactPath).not.toBeNull();
  const raw = JSON.parse(fs.readFileSync(path.join(root, path.relative(root, artifactPath!)), 'utf8')) as Record<string, unknown>;
  // Artifacts are enveloped ({ dossier }); the inner dossier is the truth.
  const payload = (raw.dossier ?? raw) as unknown;
  return parseBugDossierV2(payload);
}

interface LifecycleRecordView {
  readonly state: string;
  readonly variant: string;
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

function lifecycleFor(checkpoint: CampaignCheckpoint, clusterId: string): LifecycleRecordView {
  const record = checkpoint.candidateLifecycles?.[clusterId];
  expect(record, `lifecycle record for ${clusterId}`).toBeDefined();
  return record!;
}

/**
 * Safety/privacy floor asserted on EVERY end-to-end run in this pack:
 * privacy PASS with zeroed counters, zeroed safety vector, publication
 * prohibited.
 */
function assertSafetyPrivacyFloors(result: CampaignRunResult): void {
  expect(result.checkpoint.privacyStatus).toBe('PASS');
  expect(result.checkpoint.safety).toEqual(ZERO_EXEC_SAFETY);
  expect(result.checkpoint.privacy).toEqual({ ...ZERO_EXEC_PRIVACY });
  expect(result.morningBrief.safety).toEqual(ZERO_EXEC_SAFETY);
  expect(result.morningBrief.privacy).toEqual({ ...ZERO_EXEC_PRIVACY });
  expect(result.morningBrief.externalPublication).toBe('PROHIBITED');
}

// --- Session-2 matrix ---------------------------------------------------------
// The full case-family matrix runs as THREE deterministic sub-campaigns because
// the frozen budget policy caps promoted clusters at 3 per campaign
// (validateBudgetPolicy: CAMPAIGN_CLUSTER_POLICY_EXCEEDED above 3):
//   A protocol families : F1/F7 protocol journey, F9 duplicate pair, F6 reducible
//   B semantic families : F2 current coherent, F3 stale, F4 partial coverage
//   C rejections        : F8 transient + false-positive
// ---------------------------------------------------------------------------

/**
 * Matrix executor. For the duplicate pair the fresh reproduction re-observes
 * the twin's existing runId, which the orchestrator deduplicates idempotently,
 * so the cluster keeps exactly its two original occurrences.
 */
function familyExecutor(script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>): CampaignExecutor {
  const inner = scriptedExecutor(script);
  return {
    ...inner,
    reproduce: async (input: ReproduceInput) => {
      const { representative } = input;
      if (representative.observation.fingerprint === FP_DUP) {
        return {
          result: 'REPRODUCED' as const,
          runId: representative.observation.runId === 'run-matrix-dup-a' ? 'run-matrix-dup-b' : 'run-matrix-dup-a',
          fingerprint: representative.observation.fingerprint,
          safety: ZERO_EXEC_SAFETY,
          privacy: ZERO_EXEC_PRIVACY,
          candidate: { ...representative, observation: { ...representative.observation, reproduced: true } },
        };
      }
      return await inner.reproduce!(input);
    },
  };
}

function protocolFamilyScript(): ReadonlyMap<string, readonly CampaignAnomalyCandidate[]> {
  const protocol = candidate({ runId: 'run-matrix-protocol', fingerprint: FP_PROTOCOL, predicate: BOTH_PAYER_STEPS });
  // Duplicate occurrence pair: identical stable features collapse into ONE cluster.
  const dupA = candidate({ runId: 'run-matrix-dup-a', fingerprint: FP_DUP, predicate: BOTH_PAYER_STEPS });
  const dupB = candidate({ runId: 'run-matrix-dup-b', fingerprint: FP_DUP, predicate: BOTH_PAYER_STEPS });
  const reducible = candidate({
    runId: 'run-matrix-reducible',
    fingerprint: FP_REDUCIBLE,
    journeyId: null,
    operationFamily: 'synthetic.phase15.exploration',
    sequence: REDUCIBLE_SEQUENCE,
    predicate: (ids) => ids.includes(REDUCIBLE_SEQUENCE[0]!) && ids.includes(REDUCIBLE_SEQUENCE[1]!),
  });
  return new Map([
    ['journey:ripple-payer-exchange-read', [protocol, dupA]],
    ['api:ripple.payer-exchange.read', [dupB]],
    [EXPLORE_WORK_ITEM, [reducible]],
  ]);
}

function semanticFamilyScript(bundleId: string): ReadonlyMap<string, readonly CampaignAnomalyCandidate[]> {
  const stale = candidate({
    runId: 'run-matrix-stale',
    fingerprint: FP_STALE,
    semantic: { bundleId, currentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE', invariantId: STALE_INVARIANT },
  });
  const partial = candidate({
    runId: 'run-matrix-partial',
    fingerprint: FP_PARTIAL,
    semantic: { bundleId, currentness: 'CURRENT', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION', invariantId: PARTIAL_INVARIANT },
  });
  const current = candidate({
    runId: 'run-matrix-current',
    fingerprint: FP_CURRENT,
    semantic: { bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
  });
  return new Map([
    ['journey:ripple-payer-exchange-read', [stale, partial]],
    ['api:ripple.payer-exchange.read', [current]],
  ]);
}

function rejectionFamilyScript(): ReadonlyMap<string, readonly CampaignAnomalyCandidate[]> {
  const transient = candidate({ runId: 'run-matrix-transient', fingerprint: FP_TRANSIENT, timingClass: 'TRANSIENT', journeyId: 'ripple-account-inventory' });
  const falsePositive = candidate({ runId: 'run-matrix-false-positive', fingerprint: FP_FALSE_POSITIVE, knownNightwatchDefect: true, journeyId: 'ripple-account-inventory' });
  return new Map([[EXPLORE_WORK_ITEM, [transient, falsePositive]]]);
}

type OrchestratorRunResult = CampaignRunResult & { readonly promotionResults: readonly SemanticAwarePromotionResult[] };

interface MatrixRun {
  readonly results: readonly OrchestratorRunResult[];
  readonly roots: readonly string[];
}

async function runMatrix(): Promise<MatrixRun> {
  const bundle = coherentBundle();
  clearCampaignSemanticBundles();
  registerCampaignSemanticBundles([bundle]);
  const roots: string[] = [];
  const results: OrchestratorRunResult[] = [];
  let success = false;
  try {
    for (const script of [protocolFamilyScript(), semanticFamilyScript(bundle.bundleId), rejectionFamilyScript()]) {
      // One store root per sub-campaign: identical inputs would otherwise
      // collide on the same campaignId inside a single store.
      const { root, store } = tempStore();
      roots.push(root);
      const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
      const orchestrator = new CampaignOrchestrator(manifest, familyExecutor(script), { store, now: () => new Date(STATIC_NOW) });
      const result = await orchestrator.run();
      results.push({ ...result, promotionResults: orchestrator.promotionResults });
    }
    success = true;
    return { results, roots };
  } finally {
    clearCampaignSemanticBundles();
    if (!success) for (const root of roots) cleanup(root);
  }
}


test.describe('Phase 15 Session 2 Workstream G — campaign/triage integration through the real orchestrator', () => {

  test.describe('F1 protocol-only v1 path', () => {
    test('v1 dossier READY with PROTOCOL_ONLY lifecycle DOSSIER_READY and a coherent v1 promotion result', async () => {
      const { root, store } = tempStore();
      try {
        const observation = candidate({ runId: 'run-f1-protocol', fingerprint: FP_PROTOCOL, predicate: BOTH_PAYER_STEPS });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
        // v1 dossier unchanged: v1 schema, READY, surfaced to v1 consumers.
        expect(result.dossiers).toHaveLength(1);
        expect(result.dossiers[0]!.schemaVersion).toBe(DOSSIER_VERSION);
        expect(result.dossiers[0]!.status).toBe('READY');
        const entry = result.checkpoint.dossierLedger[0]!;
        expect(entry.state).toBe('READY');
        expect('dossierVersion' in entry).toBe(false);
        expect(result.checkpoint.bugCandidates).toContain(entry.candidateId);
        const lifecycle = lifecycleFor(result.checkpoint, entry.clusterId);
        expect(lifecycle.variant).toBe('PROTOCOL_ONLY');
        expect(lifecycle.state).toBe('DOSSIER_READY');
        expect(lifecycle.lastReasonCode).toBe('DOSSIER_READY');
        expect(lifecycle.transitionCount).toBe(5);
        // Converged promotion verdict agrees with the v1 ledger. Protocol
        // clusters keep their historical unconditional-v1-READY semantics;
        // the semanticPromotionEligible authority invariant binds the
        // semantic path only.
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.clusterKind).toBe('PROTOCOL');
        expect(promotions[0]!.clusterId).toBe(entry.clusterId);
        expect(promotions[0]!.readiness).toBe('READY');
        expect(promotions[0]!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
        expect(promotions[0]!.minimization).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
        expect(promotions[0]!.dossierVersionTarget).toBe(DOSSIER_VERSION);
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F2 semantic-current coherent', () => {
    test('v2 stays UNRESOLVED when the current journey cannot prove a reduced semantic replay', async () => {
      clearCampaignSemanticBundles();
      const bundle = coherentBundle();
      registerCampaignSemanticBundles([bundle]);
      const { root, store } = tempStore();
      try {
        const observation = candidate({
          runId: 'run-f2-current',
          fingerprint: FP_CURRENT,
          semantic: { bundleId: bundle.bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
        });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_CLEAN');
        const entry = result.checkpoint.dossierLedger[0]!;
        expect(entry.state).toBe('INCOMPLETE');
        expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
        expect(result.checkpoint.bugCandidates).not.toContain(entry.candidateId);
        const dossier = readV2Dossier(root, entry.artifactPath);
        expect(dossier.status).toBe('UNRESOLVED');
        expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
        expect(dossier.semanticTriageEvidence?.exactReplayStatus).toBe('REPRODUCED');
        expect(dossier.semanticTriageEvidence?.exactFingerprintMatch).toBe(true);
        expect(dossier.semanticTriageEvidence?.findingCategory).toBe('SOURCE_EXPECTATION_MISMATCH');
        expect(dossier.semanticTriageEvidence?.replayFidelity?.outcomeClass).toBe('REPRODUCED_EXACT');
        expect(dossier.semanticTriageEvidence?.replayFidelity?.occurrenceBinding).toBe('BOUND');
        expect(dossier.semanticTriageEvidence?.minimalityGuarantee).toBe('NONE');
        expect(dossier.semanticTriageEvidence?.minimalSequenceReproductions).toBe(0);
        const lifecycle = lifecycleFor(result.checkpoint, entry.clusterId);
        expect(lifecycle.variant).toBe('SEMANTIC');
        expect(lifecycle.state).toBe('UNRESOLVED');
        expect(lifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.clusterKind).toBe('SEMANTIC');
        expect(promotions[0]!.readiness).toBe('UNRESOLVED');
        expect(promotions[0]!.confidence).not.toBe('HIGH');
        expect(promotions[0]!.sourceCurrentness).toBe('CURRENT');
        expect(promotions[0]!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
        expect(promotions[0]!.dossierVersionTarget).toBe(DOSSIER_VERSION_V2);
        expect(semanticPromotionEligible(promotions[0]!)).toBe(false);
        expect(result.morningBrief.whatRan).toContain('semanticDossiersV2Ready=0');
      } finally {
        clearCampaignSemanticBundles();
        cleanup(root);
      }
    });
  });

  test.describe('F3 semantic-stale', () => {
    test('stale currentness ends v2 UNRESOLVED, never HIGH, lifecycle terminal UNRESOLVED', async () => {
      clearCampaignSemanticBundles();
      registerCampaignSemanticBundles([coherentBundle()]);
      const { root, store } = tempStore();
      try {
        const observation = candidate({
          runId: 'run-f3-stale',
          fingerprint: FP_STALE,
          semantic: { bundleId: coherentBundle().bundleId, currentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE' },
        });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_CLEAN');
        const entry = result.checkpoint.dossierLedger[0]!;
        expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
        expect(entry.state).toBe('INCOMPLETE');
        expect(result.checkpoint.bugCandidates).not.toContain(entry.candidateId);
        const dossier = readV2Dossier(root, entry.artifactPath);
        expect(dossier.status).toBe('UNRESOLVED');
        expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
        expect(dossier.semanticConfidence?.blockers).toContain('EXPECTATION_SOURCE_STALE');
        expect(dossier.semanticTriageEvidence?.sourceCurrentness).toBe('STALE');
        const lifecycle = lifecycleFor(result.checkpoint, entry.clusterId);
        expect(lifecycle.variant).toBe('SEMANTIC');
        expect(lifecycle.state).toBe('UNRESOLVED');
        expect(lifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.readiness).toBe('UNRESOLVED');
        expect(promotions[0]!.sourceCurrentness).toBe('STALE');
        expect(promotions[0]!.confidence).not.toBe('HIGH');
        expect(semanticPromotionEligible(promotions[0]!)).toBe(false);
        expect(result.morningBrief.whatRan).toContain('semanticDossiersV2Unresolved=1');
        expect(result.morningBrief.topFindings).toEqual([]);
      } finally {
        clearCampaignSemanticBundles();
        cleanup(root);
      }
    });
  });

  test.describe('F4 partial-coverage receipt', () => {
    test('PARTIAL_COVERAGE receipt outcome is never HIGH and never READY', async () => {
      clearCampaignSemanticBundles();
      registerCampaignSemanticBundles([coherentBundle()]);
      const { root, store } = tempStore();
      try {
        const observation = candidate({
          runId: 'run-f4-partial',
          fingerprint: FP_PARTIAL,
          semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' },
        });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_CLEAN');
        const entry = result.checkpoint.dossierLedger[0]!;
        expect(entry.state).toBe('INCOMPLETE');
        expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
        const dossier = readV2Dossier(root, entry.artifactPath);
        expect(dossier.status).toBe('UNRESOLVED');
        expect(dossier.semanticConfidence?.level).not.toBe('HIGH');
        expect(dossier.semanticConfidence?.blockers).toContain('PARTIAL_COVERAGE');
        expect(lifecycleFor(result.checkpoint, entry.clusterId).state).toBe('UNRESOLVED');
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.readiness).toBe('UNRESOLVED');
        expect(promotions[0]!.confidence).not.toBe('HIGH');
        expect(semanticPromotionEligible(promotions[0]!)).toBe(false);
      } finally {
        clearCampaignSemanticBundles();
        cleanup(root);
      }
    });
  });

  test.describe('F5 replay divergence', () => {
    test('an exact replay whose fingerprint mismatches is never certified as reproduction', async () => {
      clearCampaignSemanticBundles();
      registerCampaignSemanticBundles([coherentBundle()]);
      const { root, store } = tempStore();
      try {
        const observation = candidate({
          runId: 'run-f5-mismatch',
          fingerprint: FP_MISMATCH_TARGET,
          semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
        });
        // The certified replay closure returns a FAILURE carrying a DIFFERENT
        // fingerprint for every phase: normalizeExecutorOutcome must downgrade
        // it to PASS, so nothing in this campaign may certify reproduction of
        // the target. The reproduction candidate keeps the cluster's own
        // identity (and its semantic evidence) so the fresh re-observation
        // stays inside the SAME semantic cluster.
        const wrongFingerprintReplay = (_sequenceToReplay: readonly MinimizationAction[], _phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => ({
          status: 'FAILURE' as const,
          anomalyFingerprint: FP_MISMATCH_WRONG,
          safety: SAFE_TRIAGE,
        });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const executor = scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]]), {
          reproduce: async ({ representative }) => ({
            result: 'REPRODUCED' as const,
            runId: `${representative.observation.runId}-fresh`,
            fingerprint: representative.observation.fingerprint,
            safety: ZERO_EXEC_SAFETY,
            privacy: ZERO_EXEC_PRIVACY,
            candidate: { ...representative, replay: wrongFingerprintReplay, observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const } },
          }),
        });
        const orchestrator = new CampaignOrchestrator(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        //
        // Truthful outcome (vocabulary defect fixed): the mismatched replay is
        // never certified as reproduction, and the semantic cluster still
        // receives its UNRESOLVED v2 dossier — never READY, never HIGH — via
        // the shared safe missing-evidence vocabulary instead of an
        // internal-defect promotion abort.
        //
        expect(result.checkpoint.unresolved).not.toContain('NIGHTWATCH_INTERNAL_DEFECT');
        expect(result.stopReason).not.toBe('PREFLIGHT_FAILED');
        expect(result.resultClass).toBe('COMPLETE_CLEAN');
        expect(result.checkpoint.anomalyClusters).toHaveLength(1);
        expect(result.checkpoint.anomalyClusters[0]!.fingerprint).toBe(FP_MISMATCH_TARGET);
        // Exactly one v2 dossier ledger entry, unresolved, never a bug candidate.
        expect(result.checkpoint.dossierLedger).toHaveLength(1);
        const entry = result.checkpoint.dossierLedger[0]!;
        expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
        expect(entry.state).toBe('INCOMPLETE');
        expect(result.checkpoint.bugCandidates).not.toContain(entry.candidateId);
        const mismatchDossier = readV2Dossier(root, entry.artifactPath);
        expect(mismatchDossier.status).toBe('UNRESOLVED');
        expect(mismatchDossier.semanticConfidence?.level ?? 'HIGH').not.toBe('HIGH');
        expect(mismatchDossier.semanticTriageEvidence?.exactReplayStatus).toBe('NOT_REPRODUCED');
        expect(mismatchDossier.semanticTriageEvidence?.missingEvidence).toContain('EXACT_REPLAY_REQUIRED');
        // Promotion verdict converges: unresolved and ineligible.
        expect(orchestrator.promotionResults).toHaveLength(1);
        const verdict = orchestrator.promotionResults[0]!;
        expect(verdict.readiness).toBe('UNRESOLVED');
        expect(verdict.confidence).not.toBe('HIGH');
        expect(semanticPromotionEligible(verdict)).toBe(false);
        expect(result.morningBrief.topFindings).toEqual([]);
        expect(result.morningBrief.whatRan).toContain('semanticDossiersV2Unresolved=1');
        // Lifecycle closed truthfully at the failed reproduction:
        // ADMIT -> CONFIRM_REPRODUCTION -> FAIL_REPRODUCTION('NOT_REPRODUCED').
        const lifecycle = lifecycleFor(result.checkpoint, result.checkpoint.anomalyClusters[0]!.clusterId);
        expect(lifecycle.variant).toBe('SEMANTIC');
        expect(lifecycle.state).toBe('UNRESOLVED');
        expect(lifecycle.lastReasonCode).toBe('NOT_REPRODUCED');
        expect(lifecycle.transitionCount).toBe(3);

        // --- Mismatch classification proven below the defective branch. ---
        // 1) normalizeExecutorOutcome: a FAILURE with a different fingerprint
        //    is downgraded to PASS before any consumer classifies it.
        const normalized = normalizeExecutorOutcome(
          { status: 'FAILURE', anomalyFingerprint: FP_MISMATCH_WRONG, safety: SAFE_TRIAGE },
          FP_MISMATCH_TARGET,
        );
        expect(normalized.status).toBe('PASS');
        // 2) minimizeFailure over that closure: fresh replay does not
        //    reproduce, so NO_REPRODUCTION with NO_REDUCIBLE_CANDIDATE and no
        //    minimal sequence — never certified as reproduction.
        const minimization = await minimizeFailure({
          originalSequence: observation.originalSequence,
          anomalyFingerprint: FP_MISMATCH_TARGET,
          sourceVersion: 'synthetic.phase15.source.v1',
          catalogVersion: 'nightwatch.phase15.synthetic-action.v1',
          approvedActionIds: new Set(observation.originalSequence.map((item) => item.actionId)),
          budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 4, maxTotalReplays: 5 },
          replay: wrongFingerprintReplay,
        });
        expect(minimization.status).toBe('NO_REPRODUCTION');
        expect(minimization.freshExactReplay).toBe('NOT_REPRODUCED');
        expect(minimization.minimalityGuarantee).toBe('NONE');
        expect(minimization.reproductionCount).toBe(0);
        expect(minimization.reductionEvidenceClass).toBe('NO_REDUCIBLE_CANDIDATE');
        expect(minimization.minimalReproducingSequence).toEqual([]);
        // 3) The v2 readiness/confidence layer records exactly the
        //    REPLAY_FINGERPRINT_MISMATCH-class evidence and refuses READY.
        const evidence = createSemanticTriageEvidence({
          expectationId: TARGET,
          targetId: TARGET,
          semanticFindingFingerprint: FP_MISMATCH_TARGET,
          invariantDefinitionId: SYNTHETIC_INVARIANT,
          semanticOutcome: 'ANOMALY',
          receiptOutcome: 'ANOMALY',
          coverageState: 'VIOLATION',
          receiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
          sourceRepoId: 'corpus/phase15/source-fixture',
          sourceSha: SYNTHETIC_SHA,
          sourceEvidenceDigest: SYNTHETIC_DIGEST,
          sourceDerivationVersion: DERIVATION_VERSION,
          sourceCurrentness: 'CURRENT',
          exactReplayStatus: minimization.freshExactReplay,
          exactFingerprintMatch: minimization.freshExactReplay === 'REPRODUCED',
          minimalityGuarantee: minimization.minimalityGuarantee,
          freshContextReproductions: 1,
          minimalSequenceReproductions: minimization.reproductionCount,
          missingEvidence: ['EXACT_REPLAY_REQUIRED'],
        });
        const confidence = rankSemanticConfidence({
          evidence,
          browserApiDifferential: 'NOT_AVAILABLE',
          oracleReliable: true,
          knownFalsePositive: false,
          safetyClean: true,
          privacyClean: true,
          semanticIdentityPresent: true,
        });
        expect(confidence.level).not.toBe('HIGH');
        expect(confidence.blockers).toContain('EXACT_REPLAY_NOT_REPRODUCED');
        expect(confidence.blockers).toContain('REPLAY_FINGERPRINT_MISMATCH');
        expect(isReadySemanticDossier({ semanticTriageEvidence: evidence, minimization, knownNightwatchDefect: null } as never)).toEqual({ ready: false, reason: 'EXACT_REPLAY_REQUIRED' });
      } finally {
        clearCampaignSemanticBundles();
        cleanup(root);
      }
    });
  });

  test.describe('F6 reducible candidate', () => {
    test('genuine reduction proves MINIMALITY_PROVEN with a reachable 1-MINIMAL sequence', async () => {
      const { root, store } = tempStore();
      try {
        const calls: ReplayCall[] = [];
        const observation = candidate({
          runId: 'run-f6-reducible',
          fingerprint: FP_REDUCIBLE,
          journeyId: null,
          operationFamily: 'synthetic.phase15.exploration',
          sequence: REDUCIBLE_SEQUENCE,
          predicate: (ids) => ids.includes(REDUCIBLE_SEQUENCE[0]!) && ids.includes(REDUCIBLE_SEQUENCE[1]!),
          calls,
        });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([[EXPLORE_WORK_ITEM, [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
        // Reduced-candidate replays genuinely ran through the certified V2
        // closure (the exploration binding admits them).
        expect(calls.some((call) => call.phase === 'REDUCED_CANDIDATE')).toBe(true);
        expect(calls.some((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);
        // The removable third action was removed; the required pair survived.
        const dossier = result.dossiers[0]!;
        expect(dossier.schemaVersion).toBe(DOSSIER_VERSION);
        expect(dossier.status).toBe('READY');
        expect(dossier.minimalSequence).toEqual([REDUCIBLE_SEQUENCE[0], REDUCIBLE_SEQUENCE[1]]);
        expect(dossier.reproduction.result).toBe('REPRODUCED');
        expect(dossier.reproduction.count).toBeGreaterThanOrEqual(2);
        expect(dossier.reproduction.minimalityGuarantee).toBe('1-MINIMAL');
        const lifecycle = lifecycleFor(result.checkpoint, result.checkpoint.anomalyClusters[0]!.clusterId);
        expect(lifecycle.variant).toBe('PROTOCOL_ONLY');
        expect(lifecycle.state).toBe('DOSSIER_READY');
        // Phase 15H hardening (DEF-13): reducible candidates route through
        // the A05-round-2 CLUSTERED state (+1 transition vs the historical
        // direct MINIMIZED -> TRIAGED edge).
        expect(lifecycle.transitionCount).toBe(6);
        // Truthful minimality evidence class on the converged promotion DTO.
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.minimization).toBe('MINIMALITY_PROVEN');
        expect(promotions[0]!.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
        expect(promotions[0]!.readiness).toBe('READY');
        expect(promotions[0]!.dossierVersionTarget).toBe(DOSSIER_VERSION);
        expect(semanticPromotionEligible(promotions[0]!)).toBe(true);
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F7 journey-style precondition-unavailable', () => {
    test('every reduced deletion is binding-rejected, so minimality stays REDUCTION_PRECONDITION_UNAVAILABLE and never 1-MINIMAL', async () => {
      const { root, store } = tempStore();
      try {
        const calls: ReplayCall[] = [];
        const observation = candidate({ runId: 'run-f7-journey', fingerprint: FP_PROTOCOL, predicate: BOTH_PAYER_STEPS, calls });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([['journey:ripple-payer-exchange-read', [observation]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
        // Fresh exact replay ran once; NO reduced replay ever reached the
        // executor: the V2 binding rejects journey reduced plans as
        // PRECONDITION_DIVERGENCE before any callback.
        expect(calls.length).toBeGreaterThanOrEqual(1);
        expect(calls.every((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);
        const dossier = result.dossiers[0]!;
        expect(dossier.reproduction.result).toBe('REPRODUCED');
        // Guarantee is truthful: bounded search ran, but no genuine reduced
        // replay evidence exists either way, so never 1-MINIMAL.
        expect(dossier.reproduction.minimalityGuarantee).not.toBe('1-MINIMAL');
        expect(dossier.reproduction.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
        expect(dossier.minimalSequence).toEqual([...JOURNEY_STEPS]);
        const lifecycle = lifecycleFor(result.checkpoint, result.checkpoint.anomalyClusters[0]!.clusterId);
        expect(lifecycle.variant).toBe('PROTOCOL_ONLY');
        // Lifecycle is truthful about how far the pipeline got: unchanged
        // minimization still completed triage and reached DOSSIER_READY.
        expect(lifecycle.state).toBe('DOSSIER_READY');
        expect(lifecycle.transitionCount).toBe(5);
        const promotions = orchestrator.promotionResults;
        expect(promotions).toHaveLength(1);
        expect(promotions[0]!.minimization).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
        expect(promotions[0]!.readiness).toBe('READY');
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F8 false-positive and transient', () => {
    test('both are REJECTED before any dossier work with truthful terminal lifecycles', async () => {
      const { root, store } = tempStore();
      try {
        const falsePositive = candidate({ runId: 'run-f8-fp', fingerprint: FP_FALSE_POSITIVE, knownNightwatchDefect: true, journeyId: 'ripple-account-inventory' });
        const transient = candidate({ runId: 'run-f8-transient', fingerprint: FP_TRANSIENT, timingClass: 'TRANSIENT', journeyId: 'ripple-account-inventory' });
        const fpClusterId = clusterAnomalies([falsePositive.observation])[0]!.clusterId;
        const transientClusterId = clusterAnomalies([transient.observation])[0]!.clusterId;
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        const orchestrator = new CampaignOrchestrator(manifest, scriptedExecutor(new Map([[EXPLORE_WORK_ITEM, [falsePositive, transient]]])), { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_CLEAN');
        expect(result.checkpoint.rejectedHypotheses).toContain(fpClusterId);
        expect(result.checkpoint.rejectedHypotheses).toContain(transientClusterId);
        expect(result.checkpoint.dossierLedger).toHaveLength(0);
        expect(result.checkpoint.reproductionQueue).toHaveLength(0);
        expect(result.dossiers).toHaveLength(0);
        expect(orchestrator.promotionResults).toHaveLength(0);
        const fpLifecycle = lifecycleFor(result.checkpoint, fpClusterId);
        expect(fpLifecycle.variant).toBe('PROTOCOL_ONLY');
        expect(fpLifecycle.state).toBe('REJECTED');
        expect(fpLifecycle.lastReasonCode).toBe('FALSE_POSITIVE');
        // OBSERVED -> ADMITTED (cluster admission) -> REJECTED.
        expect(fpLifecycle.transitionCount).toBe(2);
        const transientLifecycle = lifecycleFor(result.checkpoint, transientClusterId);
        expect(transientLifecycle.state).toBe('REJECTED');
        expect(transientLifecycle.lastReasonCode).toBe('TRANSIENT');
        expect(transientLifecycle.transitionCount).toBe(2);
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F9 duplicate occurrences', () => {
    test('two identical candidates collapse into ONE cluster (occurrenceCount 2) with exactly one dossier and one lifecycle record', async () => {
      const { root, store } = tempStore();
      try {
        const dupA = candidate({ runId: 'run-f9-dup-a', fingerprint: FP_DUP, predicate: BOTH_PAYER_STEPS });
        const dupB = candidate({ runId: 'run-f9-dup-b', fingerprint: FP_DUP, predicate: BOTH_PAYER_STEPS });
        const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
        // The pair arrives through two different work items (one observation
        // per execution-ledger record: a single record rejects duplicate
        // fingerprints). Identical stable features still collapse into ONE
        // cluster, and the fresh reproduction re-observes the twin's existing
        // runId, which the orchestrator's idempotent observation guard
        // deduplicates, so the cluster keeps exactly its two occurrences.
        const executor = scriptedExecutor(new Map([
          ['journey:ripple-payer-exchange-read', [dupA]],
          ['api:ripple.payer-exchange.read', [dupB]],
        ]), {
          reproduce: async ({ representative }) => ({
            result: 'REPRODUCED' as const,
            runId: 'run-f9-dup-b',
            fingerprint: representative.observation.fingerprint,
            safety: ZERO_EXEC_SAFETY,
            privacy: ZERO_EXEC_PRIVACY,
            candidate: { ...representative, observation: { ...representative.observation, reproduced: true } },
          }),
        });
        const orchestrator = new CampaignOrchestrator(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
        const result = await orchestrator.run();
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
        // Exactly ONE cluster carries both occurrences.
        expect(result.checkpoint.anomalyClusters).toHaveLength(1);
        const cluster = result.checkpoint.anomalyClusters[0]!;
        expect(cluster.occurrenceCount).toBe(2);
        expect(cluster.runIds).toEqual(['run-f9-dup-a', 'run-f9-dup-b']);
        // Exactly one dossier, one ledger entry, one bug candidate,
        // one promotion verdict, one lifecycle record.
        expect(result.dossiers).toHaveLength(1);
        expect(result.checkpoint.dossierLedger).toHaveLength(1);
        expect(result.checkpoint.bugCandidates).toHaveLength(1);
        expect(orchestrator.promotionResults).toHaveLength(1);
        expect(Object.keys(result.checkpoint.candidateLifecycles ?? {})).toHaveLength(1);
        const lifecycle = lifecycleFor(result.checkpoint, cluster.clusterId);
        expect(lifecycle.state).toBe('DOSSIER_READY');
        expect(orchestrator.promotionResults[0]!.clusterId).toBe(cluster.clusterId);
        expect(orchestrator.promotionResults[0]!.readiness).toBe('READY');
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F10 version drift', () => {
    test('resume against drifted runtime versions fails closed CAMPAIGN_VERSION_DRIFT before any executor callback', async () => {
      const { root, store } = tempStore();
      try {
        const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
        prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW), currentVersions: manifest.versions });
        let preflightCalls = 0;
        let executeCalls = 0;
        let reproduceCalls = 0;
        const counters: ExecutorCounters = {
          preflight: () => { preflightCalls += 1; return preflightCalls; },
          execute: () => { executeCalls += 1; return executeCalls; },
          reproduce: () => { reproduceCalls += 1; return reproduceCalls; },
        };
        const drifted: CampaignVersionFingerprint = { ...VERSIONS, nightwatchSourceSha: 'synthetic-phase15-source.drifted.v1' };
        const result = await resumeCampaign(manifest, scriptedExecutor(new Map(), { counters }), {
          checkpointStore: new CampaignCheckpointStore(store),
          now: () => new Date(STATIC_NOW),
          currentVersions: drifted,
        });
        assertSafetyPrivacyFloors(result);
        expect(result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
        expect(result.stopReason).toBe('CAMPAIGN_VERSION_DRIFT');
        expect(result.checkpoint.versionDrift).toEqual(['CAMPAIGN_VERSION_DRIFT']);
        expect(result.checkpoint.unresolved).toContain('CAMPAIGN_VERSION_DRIFT');
        expect(result.checkpoint.completedWorkItemIds).toEqual([]);
        // Fail-closed ordering: zero executor callbacks of any kind.
        expect(preflightCalls).toBe(0);
        expect(executeCalls).toBe(0);
        expect(reproduceCalls).toBe(0);
        // Manifest-level drift is equally rejected for a re-fingerprinted manifest.
        const changed = createCampaignManifest({ ...inputFor('BASELINE_HEALTH'), versions: drifted });
        expect(() => assertManifestCompatible(changed, { campaignId: manifest.campaignId, manifestFingerprint: manifest.manifestFingerprint })).toThrow('CAMPAIGN_VERSION_DRIFT');
      } finally {
        cleanup(root);
      }
    });
  });

  test.describe('F11 mid-campaign resume with semantic state', () => {
    test('interruption inside promotion persists ADMITTED semantic lifecycles; resume completes them to UNRESOLVED without re-running completed items', async () => {
      clearCampaignSemanticBundles();
      registerCampaignSemanticBundles([coherentBundle()]);
      const { root, store } = tempStore();
      try {
        const observation = candidate({
          runId: 'run-f11-semantic',
          fingerprint: FP_CURRENT,
          semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
        });
        const manifest = createCampaignManifest(inputFor('BASELINE_HEALTH'));
        const executions = new Map<string, number>();
        let reproduceAttempts = 0;
        const base = scriptedExecutor(new Map([[manifest.workItems[0]!.workItemId, [observation]]]));
        const executor: CampaignExecutor = {
          ...base,
          execute: async (context) => {
            executions.set(context.workItem.workItemId, (executions.get(context.workItem.workItemId) ?? 0) + 1);
            return await base.execute(context);
          },
          // Replay closures never survive persistence: after a resume the
          // restored representative carries no `replay`, so this adapter owns
          // the capability itself, like a real adapter would.
          reproduce: async ({ representative }) => {
            reproduceAttempts += 1;
            const fingerprint = representative.observation.fingerprint;
            const replay = (seq: readonly MinimizationAction[]) => ({
              status: seq.length > 0 ? 'FAILURE' as const : 'PASS' as const,
              ...(seq.length > 0 ? { anomalyFingerprint: fingerprint } : {}),
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
        const orchestrator = new CampaignOrchestrator(manifest, executor, { store, now: () => new Date(STATIC_NOW) });
        const originalWriteCheckpoint = orchestrator.checkpointStore.writeCheckpoint.bind(orchestrator.checkpointStore);
        let interruptedOnce = false;
        orchestrator.checkpointStore.writeCheckpoint = (...args: Parameters<CampaignCheckpointStore['writeCheckpoint']>) => {
          const written = originalWriteCheckpoint(...args);
          const [checkpoint] = args;
          if (!interruptedOnce && checkpoint.replayReservations?.some((reservation) => reservation.state === 'RESERVED') && checkpoint.reproductionQueue.some((item) => item.state === 'RUNNING')) {
            interruptedOnce = true;
            throw new CampaignProcessInterruptionError();
          }
          return written;
        };
        const interrupted = await orchestrator.run();
        expect(interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
        expect(interruptedOnce).toBe(true);
        expect(reproduceAttempts).toBe(0);
        expect(interrupted.checkpoint.runtimeContractVersions).toEqual({ ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED });
        expect(classifyCheckpointRuntimeContracts(interrupted.checkpoint)).toBe('CURRENT_S2_CONTRACTS');
        expect(() => validateCampaignCheckpoint(interrupted.checkpoint, manifest)).not.toThrow();
        // The semantic cluster was admitted and its mid-pipeline lifecycle
        // state persisted before the interruption hit the reproducer.
        const clusterId = interrupted.checkpoint.anomalyClusters[0]!.clusterId;
        const interruptedLifecycle = lifecycleFor(interrupted.checkpoint, clusterId);
        expect(interruptedLifecycle.variant).toBe('SEMANTIC');
        expect(interruptedLifecycle.state).toBe('ADMITTED');
        expect(interruptedLifecycle.transitionCount).toBe(1);

        const resumed = await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(store), now: () => new Date(STATIC_NOW) });
        assertSafetyPrivacyFloors(resumed);
        expect(resumed.resultClass).toBe('COMPLETE_CLEAN');
        expect(reproduceAttempts).toBe(1);
        // Completed work items were NOT re-executed across the resume boundary.
        for (const item of manifest.workItems) expect(executions.get(item.workItemId)).toBe(1);
        expect(resumed.checkpoint.completedWorkItemIds).toHaveLength(manifest.workItems.length);
        expect(resumed.checkpoint.runtimeContractVersions).toEqual({ ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED });
        expect(() => validateCampaignCheckpoint(resumed.checkpoint, manifest)).not.toThrow();
        // The persisted lifecycle continued legally to its terminal unresolved
        // state because the resumed journey still cannot prove a reduced
        // semantic replay.
        const resumedLifecycle = lifecycleFor(resumed.checkpoint, clusterId);
        expect(resumedLifecycle.variant).toBe('SEMANTIC');
        expect(resumedLifecycle.state).toBe('UNRESOLVED');
        expect(resumedLifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
        expect(resumedLifecycle.transitionCount).toBeGreaterThan(interruptedLifecycle.transitionCount);
        const entry = resumed.checkpoint.dossierLedger[0]!;
        expect(entry.clusterId).toBe(clusterId);
        expect(entry.dossierVersion).toBe(DOSSIER_VERSION_V2);
        expect(entry.state).toBe('INCOMPLETE');
      } finally {
        clearCampaignSemanticBundles();
        cleanup(root);
      }
    });
  });

  test.describe('F12 determinism floor', () => {
    test('the full Session-2 matrix is deep-equal across three repeats (mismatch counter 0)', async () => {
      const normalized: string[] = [];
      for (let repeat = 0; repeat < 3; repeat += 1) {
        const matrix = await runMatrix();
        try {
          expect(matrix.results).toHaveLength(3);
          const [protocolFamily, semanticFamily, rejections] = matrix.results;
          if (repeat === 0) {
            // Non-vacuous pinning of the matrix shape on the first repeat.
            // Sub-campaign A: protocol families (F1/F7 journey, F9 duplicates, F6 reducible).
            expect(protocolFamily!.resultClass).toBe('COMPLETE_WITH_FINDINGS');
            expect(protocolFamily!.checkpoint.anomalyClusters).toHaveLength(3);
            expect(Object.values(protocolFamily!.checkpoint.candidateLifecycles ?? {}).map((record) => record.state).sort())
              .toEqual(['DOSSIER_READY', 'DOSSIER_READY', 'DOSSIER_READY']);
            expect(protocolFamily!.promotionResults).toHaveLength(3);
            expect(protocolFamily!.dossiers).toHaveLength(3);
            expect(protocolFamily!.checkpoint.dossierLedger.filter((entry) => entry.state === 'READY' && !('dossierVersion' in entry))).toHaveLength(3);
            // Sub-campaign B: semantic families (F2 current-but-unresolved,
            // F3 stale, F4 partial). A semantic anomaly is not a finding for
            // campaign-result purposes until its strict dossier is READY.
            expect(semanticFamily!.resultClass).toBe('COMPLETE_CLEAN');
            expect(semanticFamily!.checkpoint.anomalyClusters).toHaveLength(3);
            expect(Object.values(semanticFamily!.checkpoint.candidateLifecycles ?? {}).map((record) => record.state).sort())
              .toEqual(['UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED']);
            expect(semanticFamily!.promotionResults).toHaveLength(3);
            expect(semanticFamily!.checkpoint.dossierLedger.filter((entry) => entry.state === 'READY' && entry.dossierVersion === DOSSIER_VERSION_V2)).toHaveLength(0);
            expect(semanticFamily!.checkpoint.dossierLedger.filter((entry) => entry.state === 'INCOMPLETE' && entry.dossierVersion === DOSSIER_VERSION_V2)).toHaveLength(3);
            // Sub-campaign C: rejections (F8 transient + false positive).
            expect(rejections!.resultClass).toBe('COMPLETE_CLEAN');
            expect(rejections!.checkpoint.anomalyClusters).toHaveLength(2);
            expect(Object.values(rejections!.checkpoint.candidateLifecycles ?? {}).map((record) => record.state).sort())
              .toEqual(['REJECTED', 'REJECTED']);
            expect(rejections!.promotionResults).toHaveLength(0);
            // Aggregates across the whole matrix.
            const allPromotions = [...protocolFamily!.promotionResults, ...semanticFamily!.promotionResults, ...rejections!.promotionResults];
            expect(allPromotions).toHaveLength(6);
            expect(allPromotions.filter((promotion) => promotion.minimization === 'MINIMALITY_PROVEN')).toHaveLength(1);
            // Only the MINIMALITY_PROVEN protocol cluster is eligible. The
            // current semantic journey is deliberately unresolved because its
            // reduced replay is precondition-divergent; stale/partial remain
            // unresolved as well.
            expect(allPromotions.filter((promotion) => semanticPromotionEligible(promotion))).toHaveLength(1);
          }
          for (const result of matrix.results) assertSafetyPrivacyFloors(result);
          // Normalize the per-sub-campaign temp store roots out of artifact
          // paths, then compare whole checkpoints, briefs, and verdicts.
          const normalizedRun = matrix.results.map((result, index) => {
            const checkpointJson = JSON.stringify(result.checkpoint).split(matrix.roots[index]!).join('<ROOT>');
            return JSON.stringify({ checkpoint: JSON.parse(checkpointJson), brief: result.morningBrief, promotions: result.promotionResults });
          });
          normalized.push(JSON.stringify(normalizedRun));
        } finally {
          for (const root of matrix.roots) cleanup(root);
        }
      }
      expect(normalized).toHaveLength(3);
      let mismatches = 0;
      if (normalized[0] !== normalized[1]) mismatches += 1;
      if (normalized[1] !== normalized[2]) mismatches += 1;
      if (normalized[0] !== normalized[2]) mismatches += 1;
      expect(mismatches).toBe(0);
    });
  });

  test.describe('F13 safety/privacy floors', () => {
    test('matrix run keeps privacy PASS, zeroed counters, tight file modes, and a sentinel-free store (non-vacuous sweep)', async () => {
      const bundleId = coherentBundle().bundleId;
      const matrix = await runMatrix();
      try {
        expect(matrix.results).toHaveLength(3);
        for (const result of matrix.results) {
          assertSafetyPrivacyFloors(result);
          expect(['COMPLETE_WITH_FINDINGS', 'COMPLETE_CLEAN']).toContain(result.resultClass);
        }
        const markers = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL'];
        const violationsOf = (text: string): readonly string[] => markers.filter((marker) => text.includes(marker));
        // Input hygiene: the fixture bytes fed to the orchestrator are clean.
        const fixtureInputBytes = JSON.stringify([
          ...protocolFamilyScript().values(),
          ...semanticFamilyScript(bundleId).values(),
          ...rejectionFamilyScript().values(),
        ].flat());
        expect(violationsOf(fixtureInputBytes)).toEqual([]);
        // Non-vacuous positive control: injecting each sentinel into a copy of
        // those very fixture bytes makes it present AND makes the sweep fire.
        for (const marker of markers) {
          const contaminated = fixtureInputBytes.replace('oracle.phase15.synthetic', marker);
          expect(contaminated.includes(marker)).toBe(true);
          expect(violationsOf(contaminated)).toContain(marker);
        }
        // Durable-state sweeps: in-memory results and every byte on disk.
        for (const result of matrix.results) {
          expect(violationsOf(JSON.stringify(result.checkpoint))).toEqual([]);
          expect(violationsOf(JSON.stringify(result.checkpoint.candidateLifecycles ?? {}))).toEqual([]);
          expect(violationsOf(JSON.stringify(result.morningBrief))).toEqual([]);
          expect(violationsOf(JSON.stringify(result.dossiers))).toEqual([]);
        }
        const collectFiles = (dir: string): readonly string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = path.join(dir, entry.name);
          return entry.isDirectory() ? collectFiles(full) : [full];
        });
        for (const root of matrix.roots) {
          const files = collectFiles(root);
          expect(files.length).toBeGreaterThanOrEqual(3);
          for (const file of files) {
            expect(fs.statSync(file).mode & 0o077, `${file} must be owner-only`).toBe(0);
            expect(violationsOf(fs.readFileSync(file, 'utf8')), `${file} must be sentinel-free`).toEqual([]);
          }
        }
      } finally {
        for (const root of matrix.roots) cleanup(root);
      }
    });
  });
});
