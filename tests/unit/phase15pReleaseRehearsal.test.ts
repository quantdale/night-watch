// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A16) — synthetic release-candidate
// rehearsal (authorization PHASE_15_PARALLEL_16_AGENT_IMPLEMENTATION_LOCAL_ONLY,
// LOCAL/SOURCE only).
//
// ONE synthetic end-to-end rehearsal drives the REAL production modules across
// the full integrated pipeline:
//
//   source contract resolution -> currentness/drift -> readiness snapshot ->
//   campaign planning -> synthetic observation -> semantic/protocol evaluation
//   -> candidate lifecycle -> replay -> minimization -> clustering ->
//   confidence -> dossier -> checkpoint/resume -> private-safe status/brief
//
// Ten required release variants, each asserted end to end:
//   V1  happy path                    (semantic READY/HIGH + protocol 1-MINIMAL)
//   V2  stale source                  (fail-closed ceiling, never current)
//   V3  unavailable source            (fail-closed ceiling, never current)
//   V4  partial coverage              (blocks READY despite CURRENT source)
//   V5  duplicate replay actions      (occurrence identity, one cluster)
//   V6  minimization precondition divergence (never a proven-minimal claim)
//   V7  privacy block                 (load-bearing gate, explicit terminal)
//   V8  authority block               (owner policy, zero admissions)
//   V9  version drift                 (zero executor escape)
//   V10 interrupted/resumed campaign   (truthful mid-pipeline resume point)
//
// Plus the A16 seam-fix regression: a checkpoint lifecycle record carrying a
// sentinel-shaped reason code is rejected at the checkpoint boundary
// (LAST_REASON_CODE_UNSAFE) — the checkpoint validator now agrees with
// candidateLifecycle's strict validator instead of admitting what the strict
// validator later rejects.
//
// Determinism: the FULL rehearsal runs >= 3 times; sanitized outputs must be
// deep-equal across repeats; every produced string is swept for privacy
// sentinels; and zero false-current / false-admission / false-minimality /
// version-drift-executor-escape outcomes may appear anywhere.
//
// Synthetic fixtures only: synthetic sha/digest/fingerprint values, real
// journey contract step ids and approved Phase 4 read actions, frozen clock,
// temp PrivateArtifactStore per run (cleaned in finally). No credentials, no
// customer data, no network, no browser, no DEV, no real product values.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  CampaignOrchestrator,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  resumeCampaign,
  type CampaignAnomalyCandidate,
  type CampaignBudgetPolicy,
  type CampaignCheckpoint,
  type CampaignExecutor,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyPolicy,
  type CampaignPrivacyStatus,
  type CampaignRunResult,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { stableCampaignJson } from '../../src/core/campaign/identity';
import { clearCampaignSemanticBundles, registerCampaignSemanticBundles } from '../../src/core/campaign/realCampaignSemanticWiring';
import { renderCampaignMorningBrief } from '../../src/core/campaign/brief';
import {
  CANDIDATE_LIFECYCLE_VERSION,
  isTerminalCandidateLifecycleState,
} from '../../src/core/campaign/candidateLifecycle';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import {
  EXPLORATION_MODEL_VERSION,
  PLANNER_VERSION,
  SAFE_ACTION_CATALOG_VERSION,
  type SafetyVector,
} from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import {
  ANOMALY_CLUSTER_VERSION,
  DOSSIER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  type MinimizationAction,
  type SourceFreshness,
} from '../../src/core/triage/types';
import {
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
  duplicateActionOccurrences,
  duplicateActionHandling,
  occurrenceIdentityToken,
} from '../../src/core/triage/replayPlan';
import { DOSSIER_VERSION_V2, parseBugDossierV2 } from '../../src/core/triage/dossierV2';
import type { BugDossierV2 } from '../../src/core/triage/dossierV2';
import { semanticPromotionEligible, type SemanticAwarePromotionResult } from '../../src/core/triage/promotionResult';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { SEMANTIC_CLUSTER_VERSION, semanticContractIdentityFromInvariantId } from '../../src/oracles/semantic/cluster';
import {
  SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  createSemanticCampaignBundle,
} from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';
import { PRIVATE_ARTIFACT_POLICY_VERSION, OWNER_SCOPE_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy';
import { OWNER_SCOPE_REASON, OWNER_SCOPE_STATUS } from '../../src/core/policy/ownerScope';
import type {
  CampaignSemanticCoverageState,
  CampaignSemanticCurrentness,
  CampaignSemanticReceiptOutcome,
} from '../../src/core/campaign/campaignSemanticEvidence';
import { resolveSourceContract } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type {
  ComposedSourceContractResolution,
  FamilyResolutionRecord,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import {
  classifySourceContractMovement,
  observationFromFamilyRecord,
  unifiedFromMovementClass,
} from '../../src/oracles/expectations/lifecycle/sourceContractMovement';
import {
  CONTRACT_LIFECYCLE_REGISTRY_VERSION,
  getContractLifecycleRegistry,
  terminalContractFamilyForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import {
  parseUnifiedContractResultDto,
  unifiedFromSemanticReceiptOutcome,
  verifySemanticVocabularyProvenanceIntegrity,
} from '../../src/oracles/expectations/lifecycle/semanticVocabulary';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import { APPROVED_READ_ONLY_TARGET_IDS } from '../../src/oracles/expectations/recipes/registry';
import type { RealSourceCurrentness } from '../../src/oracles/expectations/recipes/types';
import {
  REPO_PINNED_CAMPAIGN_VERSIONS,
  collectLocalReadinessInputFromRepo,
  renderLocalReadinessJson,
  renderLocalReadinessText,
  summarizeLocalReadiness,
} from '../../src/core/readiness';
import {
  buildProjectSnapshot,
  compareProjectSnapshots,
  serializeProjectSnapshot,
  type ProjectSnapshotInput,
} from '../../src/core/projectSnapshot';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import type { MapSource } from '../helpers/phase9a1Fixtures';
import {
  accountFixture as realAccountFixture,
  billingGroupFixture as realBillingGroupFixture,
  exchangeRateFixture as realExchangeRateFixture,
  REAL_SOURCE_FIXTURE_REPO,
  REAL_SOURCE_FIXTURE_SHA,
  routingFixture as realRoutingFixture,
} from '../helpers/phase11a3Fixtures';

const STATIC_NOW = '2026-08-21T02:00:00.000Z';
const SEEDS = ['0x0000000000001601', '0x0000000000001602', '0x0000000000001603'] as const;

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
const ZERO_EXEC_PRIVACY: CampaignPrivacyStatus = {
  result: 'PASS',
  rawBodiesPersisted: 0,
  customerValuesPersisted: 0,
  credentialsPersisted: 0,
  cookiesPersisted: 0,
  tokensPersisted: 0,
  domPersisted: 0,
  screenshotsPersisted: 0,
  authenticatedTracesPersisted: 0,
};
/** Unclean reproduction privacy driving the V7 load-bearing privacy gate. */
const BLOCKED_PRIVACY: CampaignPrivacyStatus = {
  result: 'BLOCKED',
  rawBodiesPersisted: 1,
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
  nightwatchSourceSha: 'synthetic-phase15p-rehearsal.v1',
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
  seedCorpusVersion: 'nightwatch.phase15p.rehearsal-seeds.v1',
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
const ADMISSION_VERSION = 'nightwatch.phase15p.rehearsal-admission.synthetic.v1';

// Cluster fingerprints (fp:sha256:<24 hex> grammar).
const FP_SEMANTIC = 'fp:sha256:111111111111111111111111';
const FP_EXPLORATION = 'fp:sha256:222222222222222222222222';
const FP_DUP = 'fp:sha256:333333333333333333333333';
const FP_JOURNEY_PROTO = 'fp:sha256:444444444444444444444444';
const FP_RESUME_EXPLORE = 'fp:sha256:555555555555555555555555';

const JOURNEY_ITEM_ID = 'journey:ripple-payer-exchange-read';
const EXPLORE_ITEM_ID = 'explore:E1-J1-payer-exchange:0x0000000000001601';

// Approved Phase 4 read actions inside envelope E1-J1-payer-exchange.
const EXPLORED_ACTIONS = ['p4.j1.vendor-local.aws', 'p4.j1.status-local.set', 'p4.j1.return-anchor'] as const;
const PAYER_STEPS = ['payer-navigate', 'payer-structural-checkpoint'] as const;

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
      changesetId: 'cs-empty-phase15p-rehearsal',
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
    catalogVersion: 'nightwatch.phase15p.rehearsal-action.v1',
  };
}

interface ReplayCall {
  readonly phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';
  readonly actionIds: readonly string[];
}

type JourneyId = 'ripple-payer-exchange-read';

type ReplayPredicate = (ids: readonly string[]) => boolean;

const PAYER_PREDICATE: ReplayPredicate = (ids) =>
  ids.includes('payer-navigate') && ids.includes('payer-structural-checkpoint');
const REDUCIBLE_PAIR_PREDICATE: ReplayPredicate = (ids) =>
  ids.includes('p4.j1.vendor-local.aws') && ids.includes('p4.j1.status-local.set');

interface CandidateOptions {
  readonly runId: string;
  readonly fingerprint: string;
  readonly journeyId?: JourneyId | null;
  readonly routeClass?: string;
  readonly operationFamily?: string;
  readonly envelopeId?: string | null;
  readonly sequence?: readonly string[];
  readonly predicate?: ReplayPredicate;
  /** External certified-replay call log; kept OUT of the candidate DTO. */
  readonly calls?: Record<string, ReplayCall[]>;
  /** When present the candidate routes through the semantic cluster path. */
  readonly semantic?: {
    readonly bundleId: string;
    readonly currentness: CampaignSemanticCurrentness;
    readonly receiptOutcome: CampaignSemanticReceiptOutcome;
    readonly coverageState?: CampaignSemanticCoverageState;
    /** Overrides the invariant definition identity for cluster separation. */
    readonly invariantId?: string;
  };
}

function candidate(options: CandidateOptions): CampaignAnomalyCandidate {
  const journeyId = options.journeyId ?? null;
  const routeClass = options.routeClass ?? '/payer-exchange-rate-v2';
  const operationFamily = options.operationFamily ?? TARGET;
  const sequence = (options.sequence ?? [...PAYER_STEPS]).map((id) => action(id, routeClass));
  const fingerprint = options.fingerprint;
  const predicate = options.predicate ?? ((ids: readonly string[]) => ids.length > 0);
  const semanticContractIdentity = options.semantic === undefined ? undefined : semanticContractIdentityFromInvariantId({
    expectationId: TARGET,
    targetId: TARGET,
    invariantDefinitionId: options.semantic.invariantId ?? SYNTHETIC_INVARIANT,
    sourceProvenance: { repoId: 'corpus/phase15p/rehearsal-source-fixture', derivationVersion: DERIVATION_VERSION, evidenceDigest: SYNTHETIC_DIGEST },
  });
  if (options.calls !== undefined && options.calls[options.runId] === undefined) options.calls[options.runId] = [];
  const replay = (reducedSequence: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
    options.calls?.[options.runId]?.push({ phase, actionIds: reducedSequence.map((item) => item.actionId) });
    const reproduces = predicate(reducedSequence.map((item) => item.actionId));
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
    sourceRepoId: 'corpus/phase15p/rehearsal-source-fixture',
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
        oracleId: options.semantic !== undefined ? `semantic-${TARGET}` : 'oracle.phase15p.rehearsal',
        routeClass,
        operationFamily,
        statusClass: '5xx',
        contentTypeClass: 'json',
        runtimeCategory: 'product',
        structuralState: 'table-missing',
        failureActionId: sequence[0]?.actionId ?? null,
        sourceImpactRegion: 'synthetic.phase15p.rehearsal',
        browserApiResultClass: 'browser-only',
      },
      timingClass: 'NONE',
      reproduced: false,
      minimized: false,
      sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    },
    journeyId,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: 'contract:phase15p-rehearsal-synthetic',
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
      sourceVersion: 'synthetic.phase15p.rehearsal.source.v1',
    },
    sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
    alternativesRuledOut: ['auth-valid', 'safe-read-only-contract'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: false,
    ...(semanticEvidence === undefined ? {} : { campaignSemanticEvidence: semanticEvidence }),
    replay,
  };
}

// ---------------------------------------------------------------------------
// Scripted synthetic executor: preflight/execute/reproduce with call-log
// capture, an execute-invocation counter (version-drift escape guard), an
// optional failing preflight code (authority block), and an optional unclean
// reproduction privacy (privacy block). Reproduction decisions come from the
// per-fingerprint predicate registry so RESTORED (persisted, replay-stripped)
// candidates reproduce identically on resume.
// ---------------------------------------------------------------------------

interface ScriptedExecutorOptions {
  readonly script: ReadonlyMap<string, readonly CampaignAnomalyCandidate[]>;
  readonly predicates: ReadonlyMap<string, ReplayPredicate>;
  readonly calls?: Record<string, ReplayCall[]>;
  readonly failPreflightWith?: string;
  readonly reproducePrivacyOverride?: CampaignPrivacyStatus;
}

function scriptedExecutor(options: ScriptedExecutorOptions): {
  readonly executor: CampaignExecutor;
  readonly executeCalls: () => number;
} {
  let executeCount = 0;
  const replayFor = (fingerprint: string) => {
    return (reducedSequence: readonly MinimizationAction[], _phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => {
      const reproduces = options.predicates.get(fingerprint)!(reducedSequence.map((item) => item.actionId));
      return {
        status: reproduces ? ('FAILURE' as const) : ('PASS' as const),
        ...(reproduces ? { anomalyFingerprint: fingerprint } : {}),
        safety: SAFE_TRIAGE,
      };
    };
  };
  const executor: CampaignExecutor = {
    preflight: () =>
      options.failPreflightWith !== undefined
        ? { passed: false, code: options.failPreflightWith as 'OWNER_POLICY_BLOCKED', failedChecks: ['owner-scope-policy'], checkedAt: STATIC_NOW }
        : { passed: true, code: 'PREFLIGHT_PASS', failedChecks: [], checkedAt: STATIC_NOW },
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }) => {
      executeCount += 1;
      const observations = [...(options.script.get(workItem.workItemId) ?? [])];
      return {
        result: observations.length > 0 ? 'ANOMALY' as const : 'PASS' as const,
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
      const fingerprint = representative.observation.fingerprint;
      // Restored (persisted) candidates arrive replay-stripped; re-attach the
      // predicate-driven closure so the certified V2 replay path works on resume.
      const closure = representative.replay ?? replayFor(fingerprint);
      const resolved = await closure(representative.originalSequence, 'FRESH_EXACT_REPLAY');
      if (resolved.status !== 'FAILURE') {
        return { result: 'NOT_REPRODUCED' as const, runId: `${representative.observation.runId}-fresh`, fingerprint: null, safety: ZERO_EXEC_SAFETY, privacy: ZERO_EXEC_PRIVACY };
      }
      return {
        result: 'REPRODUCED' as const,
        runId: `${representative.observation.runId}-fresh`,
        fingerprint,
        safety: ZERO_EXEC_SAFETY,
        privacy: options.reproducePrivacyOverride ?? ZERO_EXEC_PRIVACY,
        candidate: {
          ...representative,
          ...(representative.replay === undefined ? { replay: closure } : {}),
          observation: { ...representative.observation, runId: `${representative.observation.runId}-fresh`, reproduced: true, timingClass: 'BOUNDED' as const },
        },
      };
    },
  };
  return { executor, executeCalls: () => executeCount };
}

function coherentBundle() {
  return createSemanticCampaignBundle({
    sourceRepoId: 'corpus/phase15p/rehearsal-source-fixture',
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-rehearsal-'));
  return { root, store: new PrivateArtifactStore({ root }) };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Variant scenarios.
// ---------------------------------------------------------------------------

interface ScenarioOptions extends ScriptedExecutorOptions {}

function semanticJourneyScenario(semantic: {
  readonly currentness: CampaignSemanticCurrentness;
  readonly receiptOutcome: CampaignSemanticReceiptOutcome;
  readonly coverageState?: CampaignSemanticCoverageState;
}): ScenarioOptions {
  const calls: Record<string, ReplayCall[]> = {};
  const candidate0 = candidate({
    runId: 'run-semantic-journey',
    fingerprint: FP_SEMANTIC,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
    semantic: { bundleId: coherentBundle().bundleId, ...semantic },
  });
  return {
    script: new Map([[JOURNEY_ITEM_ID, [candidate0]]]),
    predicates: new Map([[FP_SEMANTIC, PAYER_PREDICATE]]),
    calls,
  };
}

/** V1: semantic journey (READY/HIGH) plus reducible protocol exploration (1-MINIMAL). */
function happyScenario(): ScenarioOptions {
  const calls: Record<string, ReplayCall[]> = {};
  const semanticJourney = candidate({
    runId: 'run-happy-semantic',
    fingerprint: FP_SEMANTIC,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
    semantic: { bundleId: coherentBundle().bundleId, currentness: 'CURRENT', receiptOutcome: 'ANOMALY', coverageState: 'VIOLATION' },
  });
  const exploration = candidate({
    runId: 'run-happy-exploration',
    fingerprint: FP_EXPLORATION,
    journeyId: null,
    operationFamily: 'synthetic.phase15p.exploration',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: EXPLORED_ACTIONS,
    predicate: REDUCIBLE_PAIR_PREDICATE,
    calls,
  });
  return {
    script: new Map([
      [JOURNEY_ITEM_ID, [semanticJourney]],
      [EXPLORE_ITEM_ID, [exploration]],
    ]),
    predicates: new Map([
      [FP_SEMANTIC, PAYER_PREDICATE],
      [FP_EXPLORATION, REDUCIBLE_PAIR_PREDICATE],
    ]),
    calls,
  };
}

/** V5: duplicate occurrence pair — identical fingerprint AND stable features. */
function duplicateScenario(): ScenarioOptions {
  const calls: Record<string, ReplayCall[]> = {};
  const dupA = candidate({
    runId: 'run-dup-a',
    fingerprint: FP_DUP,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
  });
  const dupB = candidate({
    runId: 'run-dup-b',
    fingerprint: FP_DUP,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
  });
  return {
    script: new Map([
      [JOURNEY_ITEM_ID, [dupA]],
      [EXPLORE_ITEM_ID, [dupB]],
    ]),
    predicates: new Map([[FP_DUP, PAYER_PREDICATE]]),
    calls,
  };
}

/** Protocol-only journey candidate whose every reduced plan diverges. */
function protocolJourneyScenario(runId: string): ScenarioOptions {
  const calls: Record<string, ReplayCall[]> = {};
  const candidate0 = candidate({
    runId,
    fingerprint: FP_JOURNEY_PROTO,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
  });
  return {
    script: new Map([[JOURNEY_ITEM_ID, [candidate0]]]),
    predicates: new Map([[FP_JOURNEY_PROTO, PAYER_PREDICATE]]),
    calls,
  };
}

/** V6: minimization precondition divergence (protocol journey). */
function divergenceScenario(): ScenarioOptions {
  return protocolJourneyScenario('run-divergence-journey');
}

/** V7: privacy block — reproduction returns an unclean privacy vector. */
function privacyScenario(): ScenarioOptions {
  return { ...protocolJourneyScenario('run-privacy-journey'), reproducePrivacyOverride: BLOCKED_PRIVACY };
}

/** V8: authority block — preflight fails with OWNER_POLICY_BLOCKED. */
function authorityScenario(): ScenarioOptions {
  return {
    script: new Map<string, readonly CampaignAnomalyCandidate[]>([]),
    predicates: new Map<string, ReplayPredicate>([]),
    failPreflightWith: 'OWNER_POLICY_BLOCKED',
  };
}

/** V9: version drift — runtime fingerprint differs from the frozen manifest. */
function driftScenario(): ScenarioOptions & { readonly currentVersions: CampaignVersionFingerprint } {
  return {
    ...protocolJourneyScenario('run-drift-journey'),
    currentVersions: { ...VERSIONS, selectorVersion: 'nightwatch.phase15p.rehearsal-drift-selector' },
  };
}

/** V10: interrupted/resumed campaign — journey + reducible exploration. */
function resumeScenario(): ScenarioOptions {
  const calls: Record<string, ReplayCall[]> = {};
  const journey = candidate({
    runId: 'run-resume-journey',
    fingerprint: FP_JOURNEY_PROTO,
    journeyId: 'ripple-payer-exchange-read',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: PAYER_STEPS,
    predicate: PAYER_PREDICATE,
    calls,
  });
  const exploration = candidate({
    runId: 'run-resume-exploration',
    fingerprint: FP_RESUME_EXPLORE,
    journeyId: null,
    operationFamily: 'synthetic.phase15p.resume-exploration',
    envelopeId: 'E1-J1-payer-exchange',
    sequence: EXPLORED_ACTIONS,
    predicate: REDUCIBLE_PAIR_PREDICATE,
    calls,
  });
  return {
    script: new Map([
      [JOURNEY_ITEM_ID, [journey]],
      [EXPLORE_ITEM_ID, [exploration]],
    ]),
    predicates: new Map([
      [FP_JOURNEY_PROTO, PAYER_PREDICATE],
      [FP_RESUME_EXPLORE, REDUCIBLE_PAIR_PREDICATE],
    ]),
    calls,
  };
}

// ---------------------------------------------------------------------------
// Variant runners.
// ---------------------------------------------------------------------------

interface VariantRun {
  readonly name: string;
  readonly root: string;
  readonly manifest: CampaignManifest;
  readonly result: CampaignRunResult;
  readonly promotions: readonly SemanticAwarePromotionResult[];
  readonly calls: Readonly<Record<string, readonly ReplayCall[]>>;
  readonly executeCalls: number;
}

async function runVariant(name: string, options: ScenarioOptions & { readonly currentVersions?: CampaignVersionFingerprint }): Promise<VariantRun> {
  const { root, store } = tempStore();
  try {
    const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
    const { executor, executeCalls } = scriptedExecutor(options);
    const orchestrator = new CampaignOrchestrator(manifest, executor, {
      store,
      now: () => new Date(STATIC_NOW),
      ...(options.currentVersions !== undefined ? { currentVersions: options.currentVersions } : {}),
    });
    const result = await orchestrator.run();
    return { name, root, manifest, result, promotions: orchestrator.promotionResults, calls: options.calls ?? {}, executeCalls: executeCalls() };
  } catch (error) {
    cleanup(root);
    throw error;
  }
}

interface ResumeRun {
  readonly root: string;
  readonly manifest: CampaignManifest;
  readonly interrupted: CampaignRunResult;
  readonly interruptedCheckpoint: CampaignCheckpoint;
  readonly final: CampaignRunResult;
}

async function runResumeVariant(): Promise<ResumeRun> {
  const { root, store } = tempStore();
  try {
    const manifest = createCampaignManifest(inputFor('LOCAL_SYNTHETIC'));
    const first = scriptedExecutor(resumeScenario());
    const interruptedOrchestrator = new CampaignOrchestrator(manifest, first.executor, { store, now: () => new Date(STATIC_NOW) });
    const interrupted = await interruptedOrchestrator.run({ stopAfterWorkItemId: JOURNEY_ITEM_ID });
    const interruptedCheckpoint = new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest);
    const second = scriptedExecutor(resumeScenario());
    const final = await resumeCampaign(manifest, second.executor, { store, now: () => new Date(STATIC_NOW) });
    return { root, manifest, interrupted, interruptedCheckpoint, final };
  } catch (error) {
    cleanup(root);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Platform stages (pure, deterministic, exercised once per rehearsal).
// ---------------------------------------------------------------------------

const REPO_ID = REAL_SOURCE_FIXTURE_REPO;
const FIXTURE_SHA = REAL_SOURCE_FIXTURE_SHA;
const OTHER_SHA = 'd'.repeat(40);

const SOURCE_FILES = {
  'src/App/Handler/ExchangeRate.php': realExchangeRateFixture,
  'src/App/Handler/Account.php': realAccountFixture,
  'src/App/Handler/BillingGroup.php': realBillingGroupFixture,
  'src/App/Route/Config/Routing.yaml': realRoutingFixture,
};

function freshMap(): MapSource {
  return createMapSource([{ repoId: REPO_ID, sha: FIXTURE_SHA, files: SOURCE_FILES }]);
}

function terminalRecordOf(resolution: ComposedSourceContractResolution, targetId: string): FamilyResolutionRecord {
  const outcome = terminalContractFamilyForTarget(targetId);
  if (!outcome.ok) throw new Error(`no terminal family for ${targetId}`);
  const record = resolution.families.find((entry) => entry.familyId === outcome.family.familyId);
  if (record === undefined) throw new Error(`terminal family record missing for ${targetId}`);
  return record;
}

function resolutionStage() {
  const map = freshMap();
  const fresh = resolveSourceContract({
    targetId: TARGET,
    reader: map.reader,
    currentness: map.currentness,
    snapshot: { repoId: REPO_ID, sha: FIXTURE_SHA },
  });
  const staleCurrentness: RealSourceCurrentness = { currentSnapshot: () => ({ repoId: REPO_ID, sha: OTHER_SHA }) };
  const stale = resolveSourceContract({
    targetId: TARGET,
    reader: map.reader,
    currentness: staleCurrentness,
    snapshot: { repoId: REPO_ID, sha: FIXTURE_SHA },
  });
  const unavailableCurrentness: RealSourceCurrentness = { currentSnapshot: () => null };
  const unavailable = resolveSourceContract({
    targetId: TARGET,
    reader: map.reader,
    currentness: unavailableCurrentness,
    snapshot: { repoId: REPO_ID, sha: FIXTURE_SHA },
  });

  const previous = observationFromFamilyRecord({ record: terminalRecordOf(fresh, TARGET), sourceSha: FIXTURE_SHA });
  const stableCurrent = observationFromFamilyRecord({ record: terminalRecordOf(fresh, TARGET), sourceSha: OTHER_SHA });
  const staleObserved = observationFromFamilyRecord({ record: terminalRecordOf(stale, TARGET), sourceSha: OTHER_SHA });
  const unavailableObserved = observationFromFamilyRecord({ record: terminalRecordOf(unavailable, TARGET), sourceSha: null });
  const stableMove = classifySourceContractMovement({ previous, current: stableCurrent });
  const staleMove = classifySourceContractMovement({ previous, current: staleObserved });
  const unavailableMove = classifySourceContractMovement({ previous, current: unavailableObserved });

  return {
    freshKind: fresh.kind,
    staleKind: stale.kind,
    unavailableKind: unavailable.kind,
    stableMovement: stableMove.movementClass,
    staleMovement: staleMove.movementClass,
    staleCeiling: staleMove.currentnessCeiling,
    unavailableMovement: unavailableMove.movementClass,
    unavailableCeiling: unavailableMove.currentnessCeiling,
    stableCategory: unifiedFromMovementClass(stableMove.movementClass).category,
    staleCategory: unifiedFromMovementClass(staleMove.movementClass).category,
    unavailableCategory: unifiedFromMovementClass(unavailableMove.movementClass).category,
  };
}

function vocabularyStage() {
  verifySemanticVocabularyProvenanceIntegrity();
  const outcomes: readonly CampaignSemanticReceiptOutcome[] = [
    'ANOMALY',
    'EXPECTATION_SOURCE_STALE',
    'EXPECTATION_SOURCE_UNAVAILABLE',
    'PARTIAL_COVERAGE',
  ];
  const categories: Record<string, string> = {};
  for (const outcome of outcomes) categories[outcome] = unifiedFromSemanticReceiptOutcome(outcome).category;
  const roundTrip = parseUnifiedContractResultDto(JSON.stringify(unifiedFromSemanticReceiptOutcome('ANOMALY')));
  return { categories, roundTripCategory: roundTrip.category, roundTripSourceValue: roundTrip.sourceValue };
}

function readinessStage() {
  const repoInput = collectLocalReadinessInputFromRepo();
  const repoSummary = summarizeLocalReadiness(repoInput);
  const driftSummary = summarizeLocalReadiness({
    ...repoInput,
    campaign: {
      pinnedVersions: REPO_PINNED_CAMPAIGN_VERSIONS,
      observedVersions: { ...REPO_PINNED_CAMPAIGN_VERSIONS, orchestratorVersion: 'nightwatch.orchestrator.private.v9' },
    },
  });
  return {
    repoCategory: repoSummary.category,
    driftCategory: driftSummary.category,
    driftKeys: [...driftSummary.campaign.driftKeys],
    json: renderLocalReadinessJson(repoSummary),
    text: renderLocalReadinessText(repoSummary),
  };
}

function snapshotStageInput(): ProjectSnapshotInput {
  return {
    contractRegistryVersion: CONTRACT_LIFECYCLE_REGISTRY_VERSION,
    contractFamilies: getContractLifecycleRegistry().map((family) => ({ ...family })),
    recipeSchemaVersions: ['nightwatch.real-source-expectation-recipe.v2'],
    derivationVersions: [
      REAL_SOURCE_DERIVATION_VERSION,
      REAL_SOURCE_DERIVATION_VERSION_V2,
      REAL_SOURCE_COLLECTION_DERIVATION_VERSION,
      MECHANICAL_ANALYZER_VERSION,
    ],
    approvedTargets: [...APPROVED_READ_ONLY_TARGET_IDS],
    analyzerVersion: MECHANICAL_ANALYZER_VERSION,
    replayPlanVersions: [TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION],
    semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
    campaignVersions: VERSIONS,
    dossierVersions: [DOSSIER_VERSION, DOSSIER_VERSION_V2],
    ownerScope: { policyVersion: OWNER_SCOPE_POLICY_VERSION, status: OWNER_SCOPE_STATUS, reason: OWNER_SCOPE_REASON },
    adoptedCaseCatalogEntries: [{ caseId: 'phase15p-release-rehearsal', scope: 'LOCAL_SYNTHETIC' }],
  };
}

function snapshotStage() {
  const first = buildProjectSnapshot(snapshotStageInput());
  const second = buildProjectSnapshot(snapshotStageInput());
  const diff = compareProjectSnapshots(first, second);
  const serializedFirst = serializeProjectSnapshot(first);
  const serializedSecond = serializeProjectSnapshot(second);
  if (serializedFirst !== serializedSecond) throw new Error('project snapshot serialization not byte-stable');
  return { classification: diff.classification, canonical: serializedFirst };
}

// ---------------------------------------------------------------------------
// Sanitized capture + determinism harness.
// ---------------------------------------------------------------------------

interface VariantSanitized {
  readonly resultClass: string;
  readonly stopReason: string;
  readonly checkpointJson: string;
  readonly promotionsJson: string;
  readonly briefJson: string;
  readonly briefText: string;
  readonly filesJson: string;
  readonly executeCalls: number;
}

interface ResumeSanitized {
  readonly resultClass: string;
  readonly stopReason: string;
  readonly interruptedCheckpointJson: string;
  readonly finalCheckpointJson: string;
  readonly briefText: string;
  readonly filesJson: string;
}

interface RehearsalSanitized {
  readonly variants: Readonly<Record<string, VariantSanitized>>;
  readonly resume: ResumeSanitized;
  readonly resolution: string;
  readonly vocabulary: string;
  readonly readiness: { readonly repoCategory: string; readonly driftCategory: string; readonly json: string; readonly text: string };
  readonly snapshot: { readonly classification: string; readonly canonical: string };
}

function normalizeRoots(roots: readonly string[], value: string): string {
  return roots.reduce((acc, root) => acc.split(root).join('<ROOT>'), value);
}

/** Recursively list every file under a private store, sorted by path. */
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

function sanitizeVariant(variant: VariantRun, roots: readonly string[]): VariantSanitized {
  return {
    resultClass: variant.result.resultClass,
    stopReason: variant.result.stopReason,
    checkpointJson: normalizeRoots(roots, JSON.stringify(variant.result.checkpoint)),
    promotionsJson: stableCampaignJson(variant.promotions),
    briefJson: normalizeRoots(roots, JSON.stringify(variant.result.morningBrief)),
    briefText: normalizeRoots(roots, renderCampaignMorningBrief(variant.result.morningBrief)),
    filesJson: JSON.stringify(storedFiles(variant.root)),
    executeCalls: variant.executeCalls,
  };
}

function sanitizeResume(resume: ResumeRun, roots: readonly string[]): ResumeSanitized {
  return {
    resultClass: resume.final.resultClass,
    stopReason: resume.final.stopReason,
    interruptedCheckpointJson: normalizeRoots(roots, JSON.stringify(resume.interruptedCheckpoint)),
    finalCheckpointJson: normalizeRoots(roots, JSON.stringify(resume.final.checkpoint)),
    briefText: normalizeRoots(roots, renderCampaignMorningBrief(resume.final.morningBrief)),
    filesJson: JSON.stringify(storedFiles(resume.root)),
  };
}

interface RehearsalRuns {
  readonly happy: VariantRun;
  readonly stale: VariantRun;
  readonly unavailable: VariantRun;
  readonly partial: VariantRun;
  readonly duplicate: VariantRun;
  readonly divergence: VariantRun;
  readonly privacy: VariantRun;
  readonly authority: VariantRun;
  readonly drift: VariantRun;
  readonly resume: ResumeRun;
}

function buildSanitized(roots: readonly string[], runs: RehearsalRuns): RehearsalSanitized {
  const variants: Record<string, VariantSanitized> = {};
  for (const [name, run] of Object.entries(runs)) {
    if (name === 'resume') continue;
    variants[name] = sanitizeVariant(run as VariantRun, roots);
  }
  return {
    variants,
    resume: sanitizeResume(runs.resume, roots),
    resolution: JSON.stringify(resolutionStage()),
    vocabulary: JSON.stringify(vocabularyStage()),
    readiness: (() => {
      const stage = readinessStage();
      return { repoCategory: stage.repoCategory, driftCategory: stage.driftCategory, json: stage.json, text: stage.text };
    })(),
    snapshot: (() => {
      const stage = snapshotStage();
      return { classification: stage.classification, canonical: stage.canonical };
    })(),
  };
}

interface Rehearsal extends RehearsalRuns {
  readonly roots: readonly string[];
  readonly sanitized: RehearsalSanitized;
}

async function runRehearsal(): Promise<Rehearsal> {
  clearCampaignSemanticBundles();
  registerCampaignSemanticBundles([coherentBundle()]);
  const roots: string[] = [];
  const track = <T extends { readonly root: string }>(run: T): T => {
    roots.push(run.root);
    return run;
  };
  try {
    const happy = track(await runVariant('happy', happyScenario()));
    const stale = track(await runVariant('stale', semanticJourneyScenario({ currentness: 'STALE', receiptOutcome: 'EXPECTATION_SOURCE_STALE' })));
    const unavailable = track(await runVariant('unavailable', semanticJourneyScenario({ currentness: 'UNAVAILABLE', receiptOutcome: 'EXPECTATION_SOURCE_UNAVAILABLE' })));
    const partial = track(await runVariant('partial', semanticJourneyScenario({ currentness: 'CURRENT', receiptOutcome: 'PARTIAL_COVERAGE', coverageState: 'PARTIAL_COVERAGE_NO_VIOLATION' })));
    const duplicate = track(await runVariant('duplicate', duplicateScenario()));
    const divergence = track(await runVariant('divergence', divergenceScenario()));
    const privacy = track(await runVariant('privacy', privacyScenario()));
    const authority = track(await runVariant('authority', authorityScenario()));
    const drift = track(await runVariant('drift', driftScenario()));
    const resume = track(await runResumeVariant());
    const sanitized = buildSanitized(roots, { happy, stale, unavailable, partial, duplicate, divergence, privacy, authority, drift, resume });
    return { roots, happy, stale, unavailable, partial, duplicate, divergence, privacy, authority, drift, resume, sanitized };
  } catch (error) {
    for (const root of roots) cleanup(root);
    clearCampaignSemanticBundles();
    throw error;
  }
}

function teardownRehearsal(rehearsal: Rehearsal): void {
  for (const root of rehearsal.roots) cleanup(root);
  clearCampaignSemanticBundles();
}

// --- privacy sentinel sweep -------------------------------------------------

const SENTINEL_MARKERS = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL'] as const;

function sweepText(text: string, what: string): void {
  for (const marker of SENTINEL_MARKERS) {
    expect(text.includes(marker), `${what} must not contain ${marker}`).toBe(false);
  }
}

function sweepValue(value: unknown, what: string): void {
  sweepText(JSON.stringify(value), what);
}

function sweepRehearsal(rehearsal: Rehearsal, tag: string): void {
  sweepValue(rehearsal.sanitized, `${tag}:sanitized`);
  for (const run of [
    rehearsal.happy,
    rehearsal.stale,
    rehearsal.unavailable,
    rehearsal.partial,
    rehearsal.duplicate,
    rehearsal.divergence,
    rehearsal.privacy,
    rehearsal.authority,
    rehearsal.drift,
  ]) {
    sweepValue(run.result, `${tag}:${run.name}:result`);
    sweepValue(run.promotions, `${tag}:${run.name}:promotions`);
  }
  sweepValue(rehearsal.resume.final, `${tag}:resume:result`);
  sweepValue(rehearsal.resume.interrupted, `${tag}:resume:interrupted`);
}

// --- focused assertion helpers ----------------------------------------------

function clusterByFingerprint(run: VariantRun, fingerprint: string) {
  const cluster = run.result.checkpoint.anomalyClusters.find((item) => item.fingerprint === fingerprint);
  expect(cluster, `cluster for ${fingerprint} in ${run.name}`).toBeDefined();
  return cluster!;
}

function promotionFor(run: VariantRun, clusterId: string): SemanticAwarePromotionResult {
  const promo = run.promotions.find((item) => item.clusterId === clusterId);
  expect(promo, `promotion for ${clusterId} in ${run.name}`).toBeDefined();
  return promo!;
}

function lifecycleOf(run: VariantRun, clusterId: string) {
  const record = run.result.checkpoint.candidateLifecycles?.[clusterId];
  expect(record, `lifecycle for ${clusterId} in ${run.name}`).toBeDefined();
  return record!;
}

function v1DossierOf(run: VariantRun, fingerprint: string) {
  const dossier = run.result.dossiers.find((item) => item.oracleFingerprint === fingerprint);
  expect(dossier, `v1 dossier for ${fingerprint} in ${run.name}`).toBeDefined();
  return dossier!;
}

function readV2Dossier(run: VariantRun, fingerprint: string): BugDossierV2 {
  const cluster = clusterByFingerprint(run, fingerprint);
  const entry = run.result.checkpoint.dossierLedger.find((item) => item.clusterId === cluster.clusterId);
  expect(entry, `v2 ledger entry for ${fingerprint} in ${run.name}`).toBeDefined();
  expect(entry!.artifactPath).not.toBeNull();
  const raw = JSON.parse(fs.readFileSync(path.join(run.root, path.relative(run.root, entry!.artifactPath!)), 'utf8')) as Record<string, unknown>;
  // Artifacts are enveloped ({ dossier }); the inner dossier is truth.
  return parseBugDossierV2((raw.dossier ?? raw) as unknown);
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A16 — synthetic release-candidate rehearsal', () => {
  test('V1-V5: happy path, stale source, unavailable source, partial coverage, duplicate replay actions', async () => {
    const rehearsal = await runRehearsal();
    try {
      sweepRehearsal(rehearsal, 'v1-v5');

      // --- V1 happy path -----------------------------------------------------
      expect(rehearsal.happy.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      expect(rehearsal.happy.result.stopReason).toBe('NONE');
      const semCluster = clusterByFingerprint(rehearsal.happy, FP_SEMANTIC);
      const semEntry = rehearsal.happy.result.checkpoint.dossierLedger.find((item) => item.clusterId === semCluster.clusterId)!;
      // The journey adapter can reproduce the original semantic anomaly, but
      // its reduced candidates are binding-rejected. Phase 18 therefore keeps
      // the semantic dossier unresolved until minimized evidence exists.
      expect(semEntry.state).toBe('INCOMPLETE');
      expect(semEntry.dossierVersion).toBe(DOSSIER_VERSION_V2);
      const semDossier = readV2Dossier(rehearsal.happy, FP_SEMANTIC);
      expect(semDossier.status).toBe('UNRESOLVED');
      expect(semDossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(semDossier.aiReady.evidence.confidence).not.toBe('HIGH');
      expect(semDossier.semanticTriageEvidence?.sourceCurrentness).toBe('CURRENT');
      expect(semDossier.semanticTriageEvidence?.receiptOutcome).toBe('ANOMALY');
      expect(semDossier.semanticTriageEvidence?.exactReplayStatus).toBe('REPRODUCED');
      expect(semDossier.semanticTriageEvidence?.replayFidelity?.outcomeClass).toBe('REPRODUCED_EXACT');
      expect(semDossier.semanticTriageEvidence?.minimalityGuarantee).toBe('NONE');
      expect(semDossier.semanticTriageEvidence?.minimalSequenceReproductions).toBe(0);
      const semPromo = promotionFor(rehearsal.happy, semCluster.clusterId);
      expect(semPromo.clusterKind).toBe('SEMANTIC');
      expect(semPromo.readiness).toBe('UNRESOLVED');
      expect(semPromo.confidence).not.toBe('HIGH');
      expect(semPromo.sourceCurrentness).toBe('CURRENT');
      expect(semPromo.replayEvidence).toBe('EXACT_REPLAY_REPRODUCED');
      expect(semPromo.minimization).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
      expect(semPromo.dossierVersionTarget).toBe(DOSSIER_VERSION_V2);
      expect(semanticPromotionEligible(semPromo)).toBe(false);
      const semLifecycle = lifecycleOf(rehearsal.happy, semCluster.clusterId);
      expect(semLifecycle.lifecycleVersion).toBe(CANDIDATE_LIFECYCLE_VERSION);
      expect(semLifecycle.variant).toBe('SEMANTIC');
      expect(semLifecycle.state).toBe('UNRESOLVED');
      expect(isTerminalCandidateLifecycleState(semLifecycle.state)).toBe(true);
      // Protocol side: reducible exploration proves genuine minimality.
      const expCluster = clusterByFingerprint(rehearsal.happy, FP_EXPLORATION);
      const expDossier = v1DossierOf(rehearsal.happy, FP_EXPLORATION);
      expect(expDossier.minimalSequence).toEqual(['p4.j1.vendor-local.aws', 'p4.j1.status-local.set']);
      expect(expDossier.reproduction.minimalityGuarantee).toBe('1-MINIMAL');
      const expPromo = promotionFor(rehearsal.happy, expCluster.clusterId);
      expect(expPromo.clusterKind).toBe('PROTOCOL');
      expect(expPromo.minimization).toBe('MINIMALITY_PROVEN');
      expect(expPromo.readiness).toBe('READY');
      expect(expPromo.dossierVersionTarget).toBe(DOSSIER_VERSION);
      expect(lifecycleOf(rehearsal.happy, expCluster.clusterId).state).toBe('DOSSIER_READY');
      // Private-safe status/brief exists and validates (built by the orchestrator).
      expect(rehearsal.happy.result.morningBrief.resultClass).toBe('COMPLETE_WITH_FINDINGS');

      // --- V2 stale source ---------------------------------------------------
      expect(rehearsal.stale.result.resultClass).toBe('COMPLETE_CLEAN');
      const staleDossier = readV2Dossier(rehearsal.stale, FP_SEMANTIC);
      expect(staleDossier.status).toBe('UNRESOLVED');
      expect(staleDossier.semanticConfidence?.level).not.toBe('HIGH');
      expect(staleDossier.semanticConfidence?.blockers).toContain('EXPECTATION_SOURCE_STALE');
      expect(staleDossier.semanticTriageEvidence?.missingEvidence).toContain('SOURCE_CURRENTNESS_UNRESOLVED');
      const staleCluster = clusterByFingerprint(rehearsal.stale, FP_SEMANTIC);
      const stalePromo = promotionFor(rehearsal.stale, staleCluster.clusterId);
      expect(stalePromo.sourceCurrentness).toBe('STALE');
      expect(stalePromo.readiness).toBe('UNRESOLVED');
      expect(stalePromo.confidence).not.toBe('HIGH');
      expect(stalePromo.readinessReasonCodes).toContain('SOURCE_CURRENTNESS_UNRESOLVED');
      expect(semanticPromotionEligible(stalePromo)).toBe(false);
      const staleLifecycle = lifecycleOf(rehearsal.stale, staleCluster.clusterId);
      expect(staleLifecycle.state).toBe('UNRESOLVED');
      expect(staleLifecycle.lastReasonCode).toBe('DOSSIER_UNRESOLVED');
      expect(isTerminalCandidateLifecycleState(staleLifecycle.state)).toBe(true);
      expect(rehearsal.stale.result.checkpoint.bugCandidates).toHaveLength(0);

      // --- V3 unavailable source ---------------------------------------------
      expect(rehearsal.unavailable.result.resultClass).toBe('COMPLETE_CLEAN');
      const unavailableDossier = readV2Dossier(rehearsal.unavailable, FP_SEMANTIC);
      expect(unavailableDossier.status).toBe('UNRESOLVED');
      expect(unavailableDossier.semanticConfidence?.blockers).toContain('EXPECTATION_SOURCE_UNAVAILABLE');
      const unavailableCluster = clusterByFingerprint(rehearsal.unavailable, FP_SEMANTIC);
      const unavailablePromo = promotionFor(rehearsal.unavailable, unavailableCluster.clusterId);
      expect(unavailablePromo.sourceCurrentness).toBe('UNAVAILABLE');
      expect(unavailablePromo.readiness).toBe('UNRESOLVED');
      expect(semanticPromotionEligible(unavailablePromo)).toBe(false);
      expect(lifecycleOf(rehearsal.unavailable, unavailableCluster.clusterId).state).toBe('UNRESOLVED');
      expect(rehearsal.unavailable.result.checkpoint.bugCandidates).toHaveLength(0);

      // --- V4 partial coverage ------------------------------------------------
      expect(rehearsal.partial.result.resultClass).toBe('COMPLETE_CLEAN');
      const partialDossier = readV2Dossier(rehearsal.partial, FP_SEMANTIC);
      expect(partialDossier.status).toBe('UNRESOLVED');
      expect(partialDossier.semanticTriageEvidence?.missingEvidence).toContain('PARTIAL_COLLECTION_COVERAGE');
      expect(partialDossier.semanticConfidence?.blockers).toContain('PARTIAL_COVERAGE');
      const partialCluster = clusterByFingerprint(rehearsal.partial, FP_SEMANTIC);
      const partialPromo = promotionFor(rehearsal.partial, partialCluster.clusterId);
      // CURRENT source alone never admits a partial-coverage candidate.
      expect(partialPromo.sourceCurrentness).toBe('CURRENT');
      expect(partialPromo.readiness).toBe('UNRESOLVED');
      expect(semanticPromotionEligible(partialPromo)).toBe(false);
      expect(lifecycleOf(rehearsal.partial, partialCluster.clusterId).state).toBe('UNRESOLVED');
      expect(rehearsal.partial.result.checkpoint.bugCandidates).toHaveLength(0);

      // --- V5 duplicate replay actions ----------------------------------------
      expect(rehearsal.duplicate.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      const dupCluster = clusterByFingerprint(rehearsal.duplicate, FP_DUP);
      expect(dupCluster.occurrenceCount).toBe(3);
      expect(dupCluster.runIds).toEqual(['run-dup-a', 'run-dup-a-fresh', 'run-dup-b']);
      expect(rehearsal.duplicate.result.checkpoint.anomalyClusters.filter((item) => item.fingerprint === FP_DUP)).toHaveLength(1);
      const dupQueue = rehearsal.duplicate.result.checkpoint.reproductionQueue.filter((item) => item.clusterId === dupCluster.clusterId);
      expect(dupQueue).toHaveLength(1);
      expect(dupQueue[0]).toMatchObject({ state: 'COMPLETED', result: 'REPRODUCED' });
      const dupLifecycle = lifecycleOf(rehearsal.duplicate, dupCluster.clusterId);
      expect(dupLifecycle.variant).toBe('PROTOCOL_ONLY');
      expect(dupLifecycle.state).toBe('DOSSIER_READY');
      expect(dupLifecycle.transitionCount).toBe(5);
      expect(Object.keys(rehearsal.duplicate.result.checkpoint.candidateLifecycles ?? {})).toHaveLength(
        rehearsal.duplicate.result.checkpoint.anomalyClusters.length,
      );
      // Occurrence identity makes duplicates explicit, never silently deduplicated.
      const duplicatedOccurrences = [
        { ordinal: 0, expectedActionId: 'p4.j1.vendor-local.aws' },
        { ordinal: 1, expectedActionId: 'p4.j1.vendor-local.aws' },
      ];
      expect([...duplicateActionOccurrences(duplicatedOccurrences).keys()]).toEqual(['p4.j1.vendor-local.aws']);
      expect(duplicateActionOccurrences(duplicatedOccurrences).get('p4.j1.vendor-local.aws')).toEqual([0, 1]);
      expect(duplicateActionHandling(duplicatedOccurrences)).toBe('OCCURRENCE_DISTINGUISHED');
      expect(occurrenceIdentityToken('p4.j1.vendor-local.aws', 0)).not.toBe(occurrenceIdentityToken('p4.j1.vendor-local.aws', 1));
    } finally {
      teardownRehearsal(rehearsal);
    }
  });

  test('V6-V10: minimization divergence, privacy block, authority block, version drift, interrupted/resumed (+checkpoint seam regression)', async () => {
    const rehearsal = await runRehearsal();
    try {
      sweepRehearsal(rehearsal, 'v6-v10');

      // --- V6 minimization precondition divergence ----------------------------
      expect(rehearsal.divergence.result.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      const divCluster = clusterByFingerprint(rehearsal.divergence, FP_JOURNEY_PROTO);
      const divDossier = v1DossierOf(rehearsal.divergence, FP_JOURNEY_PROTO);
      expect(divDossier.minimalSequence).toEqual([...PAYER_STEPS]);
      expect(divDossier.reproduction.minimalityGuarantee).toBe('BOUNDED_MINIMAL');
      const divPromo = promotionFor(rehearsal.divergence, divCluster.clusterId);
      expect(divPromo.minimization).toBe('REDUCTION_PRECONDITION_UNAVAILABLE');
      expect(divPromo.minimization).not.toBe('MINIMALITY_PROVEN');
      // Every certified reduced plan was binding-rejected BEFORE any executor call.
      const divCalls = Object.values(rehearsal.divergence.calls).flat();
      expect(divCalls.length).toBeGreaterThanOrEqual(1);
      expect(divCalls.every((call) => call.phase === 'FRESH_EXACT_REPLAY')).toBe(true);
      expect(lifecycleOf(rehearsal.divergence, divCluster.clusterId).state).toBe('DOSSIER_READY');

      // --- V7 privacy block ----------------------------------------------------
      expect(rehearsal.privacy.result.resultClass).toBe('PARTIAL_SAFETY_BLOCKED');
      expect(rehearsal.privacy.result.stopReason).toBe('PRIVACY_BLOCKED');
      expect(rehearsal.privacy.result.checkpoint.privacyStatus).toBe('BLOCKED');
      const privCluster = clusterByFingerprint(rehearsal.privacy, FP_JOURNEY_PROTO);
      const privLifecycle = lifecycleOf(rehearsal.privacy, privCluster.clusterId);
      expect(privLifecycle.state).toBe('UNRESOLVED');
      expect(privLifecycle.lastReasonCode).toBe('PRIVACY_BLOCKED');
      expect(isTerminalCandidateLifecycleState(privLifecycle.state)).toBe(true);
      expect(rehearsal.privacy.result.checkpoint.dossierLedger).toHaveLength(0);
      expect(rehearsal.privacy.result.checkpoint.bugCandidates).toHaveLength(0);
      expect(rehearsal.privacy.promotions).toHaveLength(0);
      expect(rehearsal.privacy.result.checkpoint.unresolved).toContain('PRIVACY_BLOCKED');

      // --- V8 authority block --------------------------------------------------
      expect(rehearsal.authority.result.resultClass).toBe('ABORTED_OWNER_POLICY');
      expect(rehearsal.authority.result.stopReason).toBe('OWNER_POLICY_BLOCKED');
      expect(rehearsal.authority.executeCalls).toBe(0);
      expect(rehearsal.authority.result.checkpoint.anomalyClusters).toHaveLength(0);
      expect(rehearsal.authority.result.checkpoint.anomalyObservations).toHaveLength(0);
      expect(Object.keys(rehearsal.authority.result.checkpoint.candidateLifecycles ?? {})).toHaveLength(0);
      expect(rehearsal.authority.result.checkpoint.executionLedger.every((record) => record.state === 'PENDING')).toBe(true);

      // --- V9 version drift ------------------------------------------------------
      expect(rehearsal.drift.result.resultClass).toBe('PARTIAL_RUNTIME_INFRA_FAILURE');
      expect(rehearsal.drift.result.stopReason).toBe('CAMPAIGN_VERSION_DRIFT');
      expect(rehearsal.drift.result.checkpoint.versionDrift).toContain('CAMPAIGN_VERSION_DRIFT');
      // Zero executor escape: a drifted runtime never reaches any executor callback.
      expect(rehearsal.drift.executeCalls).toBe(0);

      // --- V10 interrupted/resumed campaign --------------------------------------
      expect(rehearsal.resume.interrupted.resultClass).toBe('INCOMPLETE_PROCESS_INTERRUPTION');
      expect(rehearsal.resume.interrupted.stopReason).toBe('PROCESS_INTERRUPTION');
      expect(rehearsal.resume.interruptedCheckpoint.anomalyClusters).toHaveLength(0);
      expect(rehearsal.resume.final.resultClass).toBe('COMPLETE_WITH_FINDINGS');
      expect(rehearsal.resume.final.checkpoint.checkpointOrdinal).toBeGreaterThan(rehearsal.resume.interrupted.checkpoint.checkpointOrdinal);
      expect(clusterByFingerprintRun(rehearsal.resume.final, FP_JOURNEY_PROTO)).toBeDefined();
      expect(clusterByFingerprintRun(rehearsal.resume.final, FP_RESUME_EXPLORE)).toBeDefined();
      expect(rehearsal.resume.final.checkpoint.bugCandidates).toHaveLength(2);
      const resumedClusters = rehearsal.resume.final.checkpoint.anomalyClusters;
      for (const cluster of resumedClusters) {
        const record = rehearsal.resume.final.checkpoint.candidateLifecycles?.[cluster.clusterId];
        expect(record, `resumed lifecycle for ${cluster.clusterId}`).toBeDefined();
        expect(record!.state).toBe('DOSSIER_READY');
        expect(isTerminalCandidateLifecycleState(record!.state)).toBe(true);
      }

      // --- A16 seam-fix regression ------------------------------------------------
      // A sentinel-shaped lifecycle reason code must be rejected AT the
      // checkpoint boundary (the checkpoint validator now agrees with
      // candidateLifecycle's strict validator), never admitted onto the resume
      // path to blow up later mid-campaign.
      const lifecycles = { ...rehearsal.happy.result.checkpoint.candidateLifecycles };
      const someClusterId = Object.keys(lifecycles)[0]!;
      const tampered: CampaignCheckpoint = {
        ...rehearsal.happy.result.checkpoint,
        candidateLifecycles: {
          ...lifecycles,
          [someClusterId]: { ...lifecycles[someClusterId]!, lastReasonCode: 'CUSTOMER_SENTINEL' },
        },
      };
      const store = new PrivateArtifactStore({ root: rehearsal.happy.root });
      expect(() => new CampaignCheckpointStore(store).writeCheckpoint(tampered, rehearsal.happy.manifest))
        .toThrow(/LAST_REASON_CODE_UNSAFE/);
    } finally {
      teardownRehearsal(rehearsal);
    }
  });

  test('platform stages: source-contract resolution/currentness/drift, semantic vocabulary, readiness snapshot, project snapshot', async () => {
    const resolution = resolutionStage();
    expect(resolution.freshKind).toBe('RESOLVED_CURRENT');
    expect(resolution.staleKind).toBe('STALE');
    expect(resolution.unavailableKind).toBe('SOURCE_UNAVAILABLE');
    // Identical normalized evidence across a moved SHA stays SEMANTICALLY_STABLE.
    expect(resolution.stableMovement).toBe('SEMANTICALLY_STABLE');
    expect(resolution.stableCategory).toBe('PROVEN');
    // Stale/unavailable ceilings cap the pair fail-closed — never current/stable.
    expect(resolution.staleMovement).toBe('SOURCE_STALE');
    expect(resolution.staleCeiling).toBe('STALE');
    expect(resolution.staleCategory).toBe('STALE');
    expect(resolution.unavailableMovement).toBe('SOURCE_UNAVAILABLE');
    expect(resolution.unavailableCeiling).toBe('UNAVAILABLE');
    expect(resolution.unavailableCategory).toBe('UNAVAILABLE');

    const vocabulary = vocabularyStage();
    expect(vocabulary.categories).toEqual({
      ANOMALY: 'PROVEN',
      EXPECTATION_SOURCE_STALE: 'STALE',
      EXPECTATION_SOURCE_UNAVAILABLE: 'UNAVAILABLE',
      PARTIAL_COVERAGE: 'PARTIAL',
    });
    expect(vocabulary.roundTripCategory).toBe('PROVEN');
    expect(vocabulary.roundTripSourceValue).toBe('ANOMALY');

    const readiness = readinessStage();
    expect(readiness.repoCategory).toBe('READY_LOCAL_SYNTHETIC');
    expect(readiness.driftCategory).toBe('BLOCKED_VERSION');
    expect(readiness.driftKeys).toEqual(['orchestratorVersion']);
    expect(readiness.json).toContain('"category": "READY_LOCAL_SYNTHETIC"');
    expect(readiness.text).toContain('category: READY_LOCAL_SYNTHETIC');
    sweepText(readiness.json, 'readiness json');
    sweepText(readiness.text, 'readiness text');

    const snapshot = snapshotStage();
    expect(snapshot.classification).toBe('UNCHANGED');
    expect(snapshot.canonical).toContain('psnap:sha256:');
    sweepText(snapshot.canonical, 'project snapshot canonical form');
  });

  test('release determinism: three full rehearsals are deep-equal, sentinel-free, and free of false-certification outcomes', async () => {
    const runs: RehearsalSanitized[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) {
      const rehearsal = await runRehearsal();
      try {
        sweepRehearsal(rehearsal, `repeat-${repeat}`);
        runs.push(rehearsal.sanitized);
      } finally {
        teardownRehearsal(rehearsal);
      }
    }
    expect(runs).toHaveLength(3);
    expect(runs[0]).toEqual(runs[1]);
    expect(runs[1]).toEqual(runs[2]);

    // Every required variant reached its truthful release verdict.
    const expectedClasses: Record<string, string> = {
      happy: 'COMPLETE_WITH_FINDINGS',
      stale: 'COMPLETE_CLEAN',
      unavailable: 'COMPLETE_CLEAN',
      partial: 'COMPLETE_CLEAN',
      duplicate: 'COMPLETE_WITH_FINDINGS',
      divergence: 'COMPLETE_WITH_FINDINGS',
      privacy: 'PARTIAL_SAFETY_BLOCKED',
      authority: 'ABORTED_OWNER_POLICY',
      drift: 'PARTIAL_RUNTIME_INFRA_FAILURE',
    };
    for (const [name, resultClass] of Object.entries(expectedClasses)) {
      expect(runs[0]!.variants[name], `variant ${name} present`).toBeDefined();
      expect(runs[0]!.variants[name]!.resultClass, `variant ${name} resultClass`).toBe(resultClass);
    }
    expect(runs[0]!.resume.resultClass).toBe('COMPLETE_WITH_FINDINGS');

    // Zero false-current: degraded sources never carry a CURRENT/eligible verdict.
    const promotionsFor = (name: string) =>
      JSON.parse(runs[0]!.variants[name]!.promotionsJson) as readonly SemanticAwarePromotionResult[];
    for (const name of ['stale', 'unavailable', 'partial']) {
      for (const promo of promotionsFor(name)) {
        expect(promo.readiness, `${name} readiness`).toBe('UNRESOLVED');
        expect(semanticPromotionEligible(promo), `${name} eligibility`).toBe(false);
      }
    }
    expect(promotionsFor('stale').every((promo) => promo.sourceCurrentness === 'STALE')).toBe(true);
    expect(promotionsFor('unavailable').every((promo) => promo.sourceCurrentness === 'UNAVAILABLE')).toBe(true);

    // Zero false-admission: the authority-blocked run admitted nothing.
    expect(runs[0]!.variants['authority']!.checkpointJson).toContain('"anomalyClusters":[]');

    // Zero false-minimality-certification: divergence never claims proven minimal.
    expect(promotionsFor('divergence').every((promo) => promo.minimization !== 'MINIMALITY_PROVEN')).toBe(true);
    expect(promotionsFor('happy').some((promo) => promo.minimization === 'MINIMALITY_PROVEN')).toBe(true);

    // Zero version-drift executor escape.
    expect(runs[0]!.variants['drift']!.executeCalls).toBe(0);
    expect(runs[0]!.variants['authority']!.executeCalls).toBe(0);

    // Protocol promotion remains ready; semantic promotion is deliberately
    // unresolved until the journey adapter supplies a reduced replay.
    expect(promotionsFor('happy').some((promo) => promo.clusterKind === 'PROTOCOL' && promo.readiness === 'READY')).toBe(true);
    expect(promotionsFor('happy').some((promo) => promo.clusterKind === 'SEMANTIC' && promo.readiness === 'UNRESOLVED' && promo.confidence !== 'HIGH')).toBe(true);
  });
});

/** Cluster lookup over a bare CampaignRunResult (resume path). */
function clusterByFingerprintRun(result: CampaignRunResult, fingerprint: string) {
  return result.checkpoint.anomalyClusters.find((item) => item.fingerprint === fingerprint);
}
