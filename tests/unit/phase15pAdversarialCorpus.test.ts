// ---------------------------------------------------------------------------
// Phase 15P A14 — synthetic adversarial scenario-class matrix.
//
// ONE comprehensive suite enumerating every scenario class declared in
// corpus/phase15p/adversarialScenarioCatalog.ts (SC-01..SC-78) against the
// wave architecture, with deterministic fixture builders from
// corpus/phase15p/adversarialFixtures.ts and synthetic executors from
// corpus/phase15p/adversarialExecutors.ts.
//
// Guarantees proven here, per scenario class:
// - fail-closed outcomes (exact rejection codes, never success-looking);
// - truthful evidence classes (never a false current / stable / minimal /
//   proven claim);
// - executor-escape prevention (call-count assertions on every drift,
//   validation-failure, and gate path; checkpoint-drift classes stay at zero
//   executor calls while the positive control proves the harness reaches the
//   executor);
// - determinism (the whole matrix is executed three times; every pass must be
//   deep-equal and byte-equal to the first);
// - zero privacy leaks (a sweep over EVERY produced string of EVERY matrix
//   pass rejects credential-like sentinels; probed sentinel VALUES are fed
//   only to rejection paths and must never surface in any output).
//
// Synthetic executors only: no network, no browser, no real product API, no
// DEV/production targets. All values are structural synthetic fakes. The
// suite contains no Date.now/Math.random: clocks are frozen constants and
// every builder is pure.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// --- frozen adversarial corpus ---------------------------------------------

import {
  ADVERSARIAL_DOMAINS,
  ADVERSARIAL_SCENARIO_CLASSES,
  scenarioClassesByDomain,
} from '../../corpus/phase15p/adversarialScenarioCatalog';
import {
  DERIVATION_V1,
  DERIVATION_V2,
  EVIDENCE_A,
  EVIDENCE_B,
  EXPLORATION_ACTION_A,
  EXPLORATION_ACTION_B,
  MINIMIZER_CATALOG_VERSION,
  REPLAY_CONTRACT_DIGEST,
  REPLAY_CONTRACT_VERSION,
  REPLAY_FINGERPRINT,
  REPLAY_ROUTE,
  REPLAY_SOURCE_VERSION,
  SENTINEL_PROBES,
  SOURCE_SHA_A,
  SOURCE_SHA_B,
  TARGET_READ,
  ZERO_REPLAY_SAFETY,
  analyzerAnalysis,
  breakingAnalysisPair,
  compatibleAnalysisPair,
  explorationPlanFixture,
  healthyReadinessInput,
  lifecycleRecordFixture,
  minimizerOptions,
  minimizerSequence,
  movementObservation,
  replayOccurrences,
  snapshotInputFixture,
} from '../../corpus/phase15p/adversarialFixtures';
import { scriptedMinimizerReplay, spyV2Executor } from '../../corpus/phase15p/adversarialExecutors';

// --- SOURCE_CONTRACTS / CURRENTNESS_MOVEMENT / SEMANTIC_EVALUATION ---------

import {
  getContractLifecycleRegistry,
  terminalContractFamilyForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import type { ContractFamilyDescriptor } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import {
  assertHistoricalIdStability,
  buildContractLifecycleModel,
  composeLifecycleCurrentnessState,
  deriveContractLifecycleStates,
  getContractLifecycleStates,
  listContractLifecycleStatesForTarget,
} from '../../src/oracles/expectations/lifecycle/contractLifecycleModel';
import {
  evaluateComposedCurrentness,
  resolveSourceContract,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import {
  classifySourceContractMovement,
  composeSourceContractMovements,
  unifiedFromMovementClass,
} from '../../src/oracles/expectations/lifecycle/sourceContractMovement';
import { APPROVED_READ_ONLY_TARGET_IDS } from '../../src/oracles/expectations/recipes/registry';
import { MECHANICAL_ANALYZER_VERSION } from '../../src/oracles/expectations/extract/analyzer';
import {
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
} from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_COLLECTION_DERIVATION_VERSION } from '../../src/oracles/expectations/collectionAdmission';
import {
  SEMANTIC_VOCABULARY_PROVENANCE,
  canonicalReceiptOutcomeFromTriageOutcome,
  parseSemanticReceiptOutcome,
  parseSemanticTriageOutcome,
  parseUnifiedContractResultDto,
  unifiedFromInventoryCurrentness,
  unifiedFromSemanticReceiptOutcome,
  unifiedFromSourceFreshness,
  validateUnifiedContractResultDto,
  verifySemanticVocabularyProvenanceIntegrity,
} from '../../src/oracles/expectations/lifecycle/semanticVocabulary';
import {
  aggregateUnifiedContractResults,
  unifiedFromAnalyzerStatus,
  unifiedFromDerivationFailure,
} from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import {
  SEMANTIC_RECEIPT_NON_PASS_OUTCOMES,
  SEMANTIC_RECEIPT_OUTCOMES,
  buildSemanticEvaluationReceipt,
} from '../../src/oracles/semantic/receipts';

// --- readiness / project snapshot / artifact validation --------------------

import { summarizeLocalReadiness } from '../../src/core/readiness/localReadiness';
import {
  buildProjectSnapshot,
  compareProjectSnapshots,
  serializeProjectSnapshot,
} from '../../src/core/projectSnapshot';
import { KNOWN_ARTIFACT_KINDS, validateArtifact } from '../../src/core/artifactValidation';
import { buildContractCoverageReport } from '../../src/oracles/expectations/extract/contractCoverageReport';

// --- triage seam ------------------------------------------------------------

import {
  createTriageReplayPlan,
  createTriageReplayPlanV2,
  occurrenceIdentityToken,
  TRIAGE_REPLAY_PLAN_VERSION,
  TRIAGE_REPLAY_PLAN_V2_VERSION,
} from '../../src/core/triage/replayPlan';
import type { ReplayPhase, TriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import {
  buildRetainedActionsV2,
  executeReplayPlanV2,
  resolveRetainedOccurrenceIdentities,
} from '../../src/core/triage/replayBinding';
import type { V2Executor } from '../../src/core/triage/replayBinding';
import {
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  clusterAnomalies,
  createIncompleteDossier,
  minimizeFailure,
  sanitizeAnomalyObservation,
} from '../../src/core/triage';
import type { MinimizationOptions } from '../../src/core/triage/types';
import { ANOMALY_CLUSTER_VERSION, DOSSIER_VERSION, FAILURE_MINIMIZATION_VERSION } from '../../src/core/triage/types';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';

// --- campaign seam -----------------------------------------------------------

import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  ZERO_CAMPAIGN_PRIVACY,
  ZERO_CAMPAIGN_SAFETY,
  classifyCheckpointResumeDrift,
  classifyVersionFingerprintDrift,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
} from '../../src/core/campaign';
import {
  CANDIDATE_LIFECYCLE_EVENTS,
  gateBlockCandidateLifecycle,
  initialLifecycleRecord,
  isTerminalCandidateLifecycleState,
  stableLifecycleJson,
  transitionCandidateLifecycle,
  validateCandidateLifecycleRecord,
} from '../../src/core/campaign/candidateLifecycle';
import type {
  CandidateLifecycleEvent,
  CandidateLifecycleRecord,
  CandidateLifecycleState,
  CandidateLifecycleVariant,
} from '../../src/core/campaign/candidateLifecycle';
import type {
  CampaignBudgetPolicy,
  CampaignInput,
  CampaignManifest,
  CampaignPrivacyPolicy,
  CampaignSourceSnapshot,
  CampaignVersionFingerprint,
} from '../../src/core/campaign/types';
import { buildCampaignMorningBrief } from '../../src/core/campaign/brief';
import { PrivateArtifactStore } from '../../src/core/policy';
import { OWNER_SCOPE_POLICY_VERSION, PRIVATE_ARTIFACT_POLICY_VERSION } from '../../src/core/policy';

// --- harness-only producers/version constants (mirrors established suites) --

import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION, createSemanticCampaignBundle } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 as HARNESS_DERIVATION_V2 } from '../../src/oracles/expectations/admission';

// ---------------------------------------------------------------------------
// Shared synthetic constants (fake values only).
// ---------------------------------------------------------------------------

/** Probe-only target (its only lifecycle family is a mechanical probe). */
const PROBE_ONLY_TARGET = 'ripple.billing-groups.read';
const ACCOUNT_SHAPE_FAMILY = 'lifecycle:ripple.account-inventory.read.real-source-shape';
const ACCOUNT_COLLECTION_FAMILY = 'lifecycle:ripple.account-inventory.read.real-source-collection';

const FP_OTHER = `fp:sha256:${'fe'.repeat(12)}`;
const FP_MIN = `fp:sha256:${'ad'.repeat(12)}`;
const FP_MAL = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';

const NULL_READER = { readFile: () => null };
const NULL_CURRENTNESS = { currentSnapshot: () => null };

/**
 * Credential-like sentinels swept over EVERY produced string of EVERY matrix
 * pass. Deliberately excludes the token 'PRIVACY_SENTINEL': it is a substring
 * of the legitimate rejection-code names (…_PRIVACY_SENTINEL_REJECTED) and is
 * exercised through the other probe values instead.
 */
const CREDENTIAL_LIKE_SENTINELS: readonly string[] = Object.freeze([
  ...SENTINEL_PROBES.filter((sentinel) => sentinel !== 'PRIVACY_SENTINEL'),
  'Bearer ',
  'eyJhbGciOi',
  'AKIA',
  'aws_secret_access_key',
  'password=',
  'Set-Cookie:',
  '-----BEGIN',
  'sk-live-',
]);

// ---------------------------------------------------------------------------
// Small generic helpers.
// ---------------------------------------------------------------------------

type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };
type ProbeOutcome = Readonly<Record<string, Json>>;
type Probe = () => Promise<ProbeOutcome>;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Captures the message of a synchronous throw ('NO_THROW' when none). */
function captureThrow(fn: () => unknown): string {
  try {
    fn();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Captures the message of an async rejection ('NO_REJECTION' when none). */
async function captureRejection(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return 'NO_REJECTION';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) collectStrings(child, into);
  }
}

function invalidReasonOf(outcome: { status: string; invalidReason?: string }): string {
  return outcome.status === 'INVALID' ? String(outcome.invalidReason) : 'NOT_INVALID';
}

// ---------------------------------------------------------------------------
// Campaign harness (checkpoint-drift domain shared setup). Mirrors the
// established Phase 15P A09 scaffolding: frozen clock, temp private store per
// probe, scripted counting executor.
// ---------------------------------------------------------------------------

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

const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: 'synthetic-phase15p-a14-source.v1',
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
  semanticExpectationDerivationVersion: HARNESS_DERIVATION_V2,
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
    freshness: 'LOCAL_TRACKING_REF_ONLY' as const,
    readOnly: true as const,
  }));
}

function inputFor(mode: CampaignInput['mode']): CampaignInput {
  return {
    mode,
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase15p-a14',
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

function driftedVersions(slots: readonly string[]): CampaignVersionFingerprint {
  const value: Record<string, unknown> = { ...VERSIONS };
  for (const slot of slots) value[slot] = `${String(value[slot])}-p15pdrift`;
  return value as unknown as CampaignVersionFingerprint;
}

interface PreparedFixture {
  readonly root: string;
  readonly store: PrivateArtifactStore;
  readonly manifest: CampaignManifest;
  readonly checkpoint: Record<string, unknown>;
  readonly checkpointPath: string;
}

/** Fresh ordinal-zero manifest+checkpoint pair, built without any executor. */
function preparedFixture(mode: CampaignInput['mode'] = 'BASELINE_HEALTH'): PreparedFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-a14-'));
  const store = new PrivateArtifactStore({ root });
  const manifest = createCampaignManifest(inputFor(mode));
  const checkpoint = cloneJson(prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) })) as unknown as Record<string, unknown>;
  const checkpointPath = new CampaignCheckpointStore(store).paths(manifest.campaignId).checkpoint;
  return { root, store, manifest, checkpoint, checkpointPath };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function cloneWith(change: (value: Record<string, any>) => void): (checkpoint: Record<string, unknown>) => Record<string, unknown> {
  return (checkpoint: Record<string, unknown>) => {
    const value = cloneJson(checkpoint) as Record<string, any>;
    change(value);
    return value;
  };
}

function persistedLifecycleRecord(): Record<string, unknown> {
  return {
    lifecycleVersion: CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle,
    variant: 'PROTOCOL_ONLY',
    state: 'OBSERVED',
    transitionCount: 0,
    lastReasonCode: null,
  };
}

interface CountingExecutor {
  readonly executor: Parameters<typeof resumeCampaign>[1];
  readonly calls: { preflight: number; execute: number };
}

function countingExecutor(): CountingExecutor {
  const calls = { preflight: 0, execute: 0 };
  const executor = {
    preflight: () => {
      calls.preflight += 1;
      return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: STATIC_NOW };
    },
    execute: async (): Promise<unknown> => {
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
  return { executor: executor as unknown as CountingExecutor['executor'], calls };
}

// ---------------------------------------------------------------------------
// Domain-local synthetic fixtures (MALFORMED_INPUTS / SNAPSHOT_DIFF / …).
// ---------------------------------------------------------------------------

function malformedObservation(): Record<string, unknown> {
  return {
    runId: 'run-a14-1',
    observedAt: STATIC_NOW,
    fingerprint: FP_MAL,
    features: {
      journeyId: 'phase15p-adversarial-journey',
      envelopeId: 'E-A14-1',
      oracleId: 'oracle.protocol',
      routeClass: '/phase15p/adversarial',
      operationFamily: 'adversarial-target',
      statusClass: '5xx',
      contentTypeClass: 'json',
      runtimeCategory: 'product',
      structuralState: 'table-missing',
      failureActionId: 'p4.a14.read',
      sourceImpactRegion: 'phase15p:a14',
      browserApiResultClass: 'same',
    },
    timingClass: 'NONE',
    reproduced: true,
    minimized: true,
    sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
  };
}

function reproductionRecordFixture(): Record<string, unknown> {
  return {
    clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    representativeRunId: 'run-a14-1',
    state: 'COMPLETED',
    result: 'REPRODUCED',
    admissionLevel: 'L2',
    reasonCode: null,
    runId: 'run-a14-1',
    safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
    privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
  };
}

function semanticReceiptFixture(): ReturnType<typeof buildSemanticEvaluationReceipt> {
  return buildSemanticEvaluationReceipt({
    oracleId: 'oracle.protocol',
    outcome: 'ANOMALY',
    expectationId: 'exp:phase15p.adversarial.v1',
    projectionDigests: ['proj:sha256:0123456789abcdef01234567'],
    invariantTotal: 2,
    invariantPassCount: 1,
    invariantNaCount: 0,
    invariantViolationCount: 1,
    findingCount: 1,
  });
}

function replayPlanV1Base(): Record<string, unknown> {
  return {
    candidateKind: 'JOURNEY' as const,
    anomalyFingerprint: FP_MAL,
    originalActionIds: ['a1', 'a2'],
    retainedActionIds: ['a1'],
    phase: 'REDUCED_CANDIDATE' as const,
    targetId: 'phase15p.adversarial.journey',
    contractVersion: REPLAY_CONTRACT_VERSION,
    contractDigest: REPLAY_CONTRACT_DIGEST,
    catalogVersion: MINIMIZER_CATALOG_VERSION,
    sourceVersion: REPLAY_SOURCE_VERSION,
    routeClass: REPLAY_ROUTE,
  };
}

function incompleteDossierFixture(): ReturnType<typeof createIncompleteDossier> {
  return createIncompleteDossier({
    anomalyFingerprint: FP_MAL,
    journeyOrApiFamily: 'phase15p.adversarial.journey',
    missingSections: ['reproduction', 'minimization'],
  });
}

function sourceBundleFixture(): ReturnType<typeof createSemanticCampaignBundle> {
  return createSemanticCampaignBundle({
    sourceRepoId: 'synthetic/a14-source',
    sourceBranchRef: 'main',
    freshnessApprovedSourceSha: SOURCE_SHA_A,
    expectationId: 'exp:phase15p.adversarial.v1',
    targetId: 'phase15p.adversarial.target',
    sourceEvidenceDigest: EVIDENCE_A,
    sourceDerivationVersion: DERIVATION_V2,
    collectionAdmissionVersion: 'nightwatch.collection-admission.private.v1',
    resolverState: 'RESOLVED',
    devReachability: 'LOCAL_ONLY',
    approvedMapping: {
      journeyOrOperationId: 'phase15p.adversarial.journey',
      targetId: 'phase15p.adversarial.target',
      expectationId: 'exp:phase15p.adversarial.v1',
      expectationClass: 'HISTORICAL',
      browserObservationAvailable: true,
      apiObservationAvailable: true,
    },
  });
}

function coverageInventoryFixture(): Parameters<typeof buildContractCoverageReport>[0]['inventory'] {
  return {
    remoteSha: null,
    snapshotSha: null,
    snapshotMatchesRemote: true,
    canonicalUnchanged: true,
    entries: [
      {
        targetId: 'phase15p-adversarial-covered', approvedReadOnly: true, devReachable: false,
        observerClass: 'JSON_SINGLE_BROWSER_API' as const, recipeId: null, recipeVersion: null,
        historicalExpectationId: 'exp:phase15p.adversarial.v1', collectionExpectationId: null,
        sourceRepo: null, sourcePath: null, sourceSymbol: null, sourceSha: null,
        evidenceDigest: EVIDENCE_A, depthClass: 'SHAPE' as const,
        disposition: 'APPROVED_AND_ADMITTED' as const, blockerCode: null, analyzerProbe: null,
        resolverState: 'RESOLVED' as const, currentness: 'CURRENT' as const,
      },
      {
        targetId: 'phase15p-adversarial-stale', approvedReadOnly: true, devReachable: false,
        observerClass: 'JSON_SINGLE_BROWSER_API' as const, recipeId: null, recipeVersion: null,
        historicalExpectationId: null, collectionExpectationId: null,
        sourceRepo: null, sourcePath: null, sourceSymbol: null, sourceSha: null,
        evidenceDigest: null, depthClass: 'NONE' as const,
        disposition: 'APPROVED_SOURCE_STALE' as const, blockerCode: 'SOURCE_STALE', analyzerProbe: null,
        resolverState: 'SOURCE_STALE' as const, currentness: 'STALE' as const,
      },
    ],
    metrics: {
      approvedTargetCount: 2, admittedHistoricalCount: 1, admittedCollectionCount: 0,
      deepTypeCount: 0, observerUnavailableCount: 0, ambiguousCount: 0,
      mechanicallyUncoveredCount: 0, newContractsAdded: 0, existingContractsDepthUplifted: 0,
      derivationFailures: 0, staleUnavailableFailures: 1,
    },
  };
}

function probeOnlyReadinessFamily(): {
  familyId: string; targetId: string; kind: 'MECHANICAL_PROBE'; hasExpectationId: false; campaignEligible: false; historicalImmutable: false;
} {
  return {
    familyId: `lifecycle:mechanical-probe:${TARGET_READ}`,
    targetId: TARGET_READ,
    kind: 'MECHANICAL_PROBE',
    hasExpectationId: false,
    campaignEligible: false,
    historicalImmutable: false,
  };
}

/** Raw (uncomputed-planId) V2 plan literal for grammar-level rejection probes. */
function rawExplorationPlan(retainedOrdinals: readonly number[], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: TRIAGE_REPLAY_PLAN_V2_VERSION,
    planId: `rp2:sha256:${'0'.repeat(24)}`,
    candidateKind: 'EXPLORATION',
    anomalyFingerprint: REPLAY_FINGERPRINT,
    originalOccurrences: replayOccurrences([EXPLORATION_ACTION_A, EXPLORATION_ACTION_B]),
    retainedOccurrenceOrdinals: [...retainedOrdinals],
    phase: 'REDUCED_CANDIDATE' as const,
    targetId: 'phase15p.adversarial.exploration.target',
    contractVersion: REPLAY_CONTRACT_VERSION,
    contractDigest: REPLAY_CONTRACT_DIGEST,
    catalogVersion: MINIMIZER_CATALOG_VERSION,
    sourceVersion: REPLAY_SOURCE_VERSION,
    routeClass: REPLAY_ROUTE,
    ...overrides,
  };
}

function journeyReducedPlan(): TriageReplayPlanV2 {
  return createTriageReplayPlanV2({
    candidateKind: 'JOURNEY',
    anomalyFingerprint: REPLAY_FINGERPRINT,
    originalOccurrences: [
      { ordinal: 0, expectedActionId: 'payer-navigate' },
      { ordinal: 1, expectedActionId: 'payer-structural-checkpoint' },
    ],
    retainedOccurrenceOrdinals: [0],
    phase: 'REDUCED_CANDIDATE' as const,
    targetId: 'ripple-payer-exchange-read',
    contractVersion: REPLAY_CONTRACT_VERSION,
    contractDigest: REPLAY_CONTRACT_DIGEST,
    catalogVersion: MINIMIZER_CATALOG_VERSION,
    sourceVersion: REPLAY_SOURCE_VERSION,
    routeClass: REPLAY_ROUTE,
  });
}

// ---------------------------------------------------------------------------
// Lifecycle-drive helper (CANDIDATE_LIFECYCLE domain shared setup).
// ---------------------------------------------------------------------------

const PATH_TO_STATE: Record<CandidateLifecycleState, readonly CandidateLifecycleEvent[]> = {
  OBSERVED: [],
  ADMITTED: ['ADMIT'],
  REPRODUCED: ['ADMIT', 'CONFIRM_REPRODUCTION'],
  MINIMIZED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION'],
  CLUSTERED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'CLUSTERED'],
  UNCHANGED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'KEEP_UNCHANGED'],
  TRIAGED: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'COMPLETE_TRIAGE'],
  DOSSIER_READY: ['ADMIT', 'CONFIRM_REPRODUCTION', 'APPLY_MINIMIZATION', 'COMPLETE_TRIAGE', 'MARK_DOSSIER_READY'],
  REJECTED: ['REJECT'],
  UNRESOLVED: ['ADMIT', 'FAIL_REPRODUCTION'],
};

function driveTo(variant: CandidateLifecycleVariant, state: CandidateLifecycleState): CandidateLifecycleRecord {
  let record = initialLifecycleRecord(variant);
  for (const event of PATH_TO_STATE[state]) record = transitionCandidateLifecycle(record, event);
  return record;
}

// ---------------------------------------------------------------------------
// The probe registry: ONE small deterministic probe per scenario-class id.
// Every probe builds fresh fixtures, exercises ONLY public APIs plus the
// frozen corpus fixtures/executors, and returns a JSON outcome capturing the
// fail-closed / truthful facts named by the class title.
// ---------------------------------------------------------------------------

const PROBES: Readonly<Record<string, Probe>> = {
  // --- SOURCE_CONTRACTS ----------------------------------------------------

  'SC-01': async () => {
    const first = buildContractLifecycleModel();
    const second = buildContractLifecycleModel();
    return {
      stateCount: first.length,
      byteDeterministic: JSON.stringify(first) === JSON.stringify(second),
      kinds: [...new Set(first.map((state) => state.kind))].sort().join('|'),
      scopes: [...new Set(first.map((state) => state.collectionScope))].sort().join('|'),
      derivations: [...new Set(first.map((state) => state.derivationVersion))].sort().join('|'),
      modelVersion: first[0]!.modelVersion,
    };
  },

  'SC-02': async () => {
    const archived = getContractLifecycleStates().filter((state) => state.kind === 'ARCHIVED_HISTORICAL_SHAPE');
    return {
      count: archived.length,
      allHistoricalImmutable: archived.every((state) => state.historicalIdCompatibility === 'HISTORICAL_IMMUTABLE_ID'),
      noneTerminal: archived.every((state) => state.compatibilityState !== 'ACTIVE_TERMINAL'),
      allSuperseded: archived.every((state) => state.supersededByFamilyId !== null),
      allFrozen: archived.every((state) => Object.isFrozen(state)),
    };
  },

  'SC-03': async () => {
    const targets = [...APPROVED_READ_ONLY_TARGET_IDS];
    const terminals = targets.map((targetId) => {
      const outcome = terminalContractFamilyForTarget(targetId);
      return outcome.ok ? outcome.family.familyId : `UNRESOLVED:${targetId}`;
    });
    return {
      targetCount: targets.length,
      allResolved: terminals.every((familyId) => !familyId.startsWith('UNRESOLVED:')),
      uniqueTerminals: new Set(terminals).size === terminals.length,
    };
  },

  'SC-04': async () => {
    const resolution = resolveSourceContract({
      targetId: 'ripple.unapproved-target.read',
      reader: NULL_READER,
      currentness: NULL_CURRENTNESS,
      snapshot: null,
    });
    return {
      kind: resolution.kind,
      familyCount: resolution.families.length,
      overallCategory: resolution.overall.category,
    };
  },

  'SC-05': async () => {
    const states = listContractLifecycleStatesForTarget(PROBE_ONLY_TARGET);
    const probe = states[0];
    return {
      stateCount: states.length,
      singletonTerminalSelf: states.length === 1 && probe !== undefined && probe.terminalFamilyId === probe.identity.familyId,
      admissionAuthority: probe?.admissionAuthority ?? 'MISSING',
      compatibilityState: probe?.compatibilityState ?? 'MISSING',
    };
  },

  'SC-06': async () => {
    const clone = clonedRegistry();
    const probeFamily = clone.find((family) => family.familyId === `lifecycle:mechanical-probe:${PROBE_ONLY_TARGET}`);
    if (probeFamily === undefined) throw new Error('probe family missing in clone');
    const duplicate = cloneJson(probeFamily);
    return { threw: captureThrow(() => deriveContractLifecycleStates([...clone, duplicate])) };
  },

  'SC-07': async () => {
    const clone = clonedRegistry();
    const probeFamily = clone.find((family) => family.familyId === `lifecycle:mechanical-probe:${PROBE_ONLY_TARGET}`);
    if (probeFamily === undefined) throw new Error('probe family missing in clone');
    probeFamily.derivationVersion = 'nightwatch.bogus-derivation.v9';
    return { threw: captureThrow(() => deriveContractLifecycleStates(clone)) };
  },

  'SC-08': async () => {
    const clone = clonedRegistry();
    const probeFamily = clone.find((family) => family.familyId === `lifecycle:mechanical-probe:${PROBE_ONLY_TARGET}`);
    if (probeFamily === undefined) throw new Error('probe family missing in clone');
    probeFamily.successorFamilyId = 'lifecycle:ghost-family';
    return { threw: captureThrow(() => deriveContractLifecycleStates(clone)) };
  },

  'SC-09': async () => {
    const clone = clonedRegistry();
    const shape = clone.find((family) => family.familyId === ACCOUNT_SHAPE_FAMILY);
    if (shape === undefined) throw new Error('account shape family missing in clone');
    shape.successorFamilyId = null; // leaves the collection predecessor asymmetric
    return { threw: captureThrow(() => deriveContractLifecycleStates(clone)) };
  },

  'SC-10': async () => {
    const descriptors = new Map(getContractLifecycleRegistry().map((family) => [family.familyId, family]));
    let mismatches = 0;
    const countByCompatibility: Record<string, number> = {};
    for (const state of getContractLifecycleStates()) {
      const family = descriptors.get(state.identity.familyId);
      if (family === undefined) throw new Error(`registry lost ${state.identity.familyId}`);
      const expectedCompatibility =
        family.historicalImmutable === true
          ? 'ARCHIVED_HISTORICAL'
          : family.successorFamilyId !== null
            ? 'SUPERSEDED'
            : 'ACTIVE_TERMINAL';
      const expectedAuthority = family.kind === 'MECHANICAL_PROBE' ? 'ANALYZER_PROBE_EVIDENCE_ONLY' : 'EXPECTATION_ADMISSION_REQUIRED';
      if (state.compatibilityState !== expectedCompatibility || state.admissionAuthority !== expectedAuthority) mismatches += 1;
      countByCompatibility[state.compatibilityState] = (countByCompatibility[state.compatibilityState] ?? 0) + 1;
    }
    return {
      stateCount: getContractLifecycleStates().length,
      mismatches,
      activeTerminals: countByCompatibility['ACTIVE_TERMINAL'] ?? 0,
      superseded: countByCompatibility['SUPERSEDED'] ?? 0,
      archivedHistorical: countByCompatibility['ARCHIVED_HISTORICAL'] ?? 0,
    };
  },

  'SC-11': async () => {
    const mixed = evaluateComposedCurrentness(['CURRENT', 'STALE']);
    const empty = evaluateComposedCurrentness([]);
    const agreed = evaluateComposedCurrentness(['CURRENT', 'NOT_APPLICABLE']);
    return {
      mixedBlocked: !mixed.ok && mixed.reason === 'MIXED_CURRENTNESS',
      composedMixed: composeLifecycleCurrentnessState(['CURRENT', 'STALE']),
      emptyFloored: !empty.ok && empty.reason === 'EMPTY',
      composedEmpty: composeLifecycleCurrentnessState([]),
      composedAgreed: composeLifecycleCurrentnessState(['CURRENT', 'NOT_APPLICABLE']),
      agreedValue: agreed.ok ? agreed.agreed : 'DISAGREED',
    };
  },

  'SC-12': async () => {
    const snapshot = getContractLifecycleStates();
    const archived = snapshot.find((state) => state.historicalIdCompatibility === 'HISTORICAL_IMMUTABLE_ID');
    if (archived === undefined) throw new Error('no archived historical state found');
    const removalThrew = captureThrow(() =>
      assertHistoricalIdStability(snapshot, snapshot.filter((state) => state.identity.familyId !== archived.identity.familyId)));
    const futureState = {
      ...cloneJson(archived),
      identity: {
        ...cloneJson(archived.identity),
        familyId: 'lifecycle:synthetic.a14-additive.read.real-source-future',
        expectationId: 'synthetic.a14-additive.read.real-source-future',
      },
    };
    let additiveOk = true;
    try {
      assertHistoricalIdStability(snapshot, [...snapshot, futureState]);
    } catch {
      additiveOk = false;
    }
    return { removalThrew, additiveOk };
  },

  // --- CURRENTNESS_MOVEMENT --------------------------------------------------

  'SC-13': async () => {
    const classification = classifySourceContractMovement({
      previous: movementObservation({ sourceSha: SOURCE_SHA_A }),
      current: movementObservation({ sourceSha: SOURCE_SHA_B }),
    });
    return {
      movementClass: classification.movementClass,
      ceiling: classification.currentnessCeiling,
      driftClass: classification.drift.driftClass,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-14': async () => {
    const pair = compatibleAnalysisPair();
    const classification = classifySourceContractMovement({
      previous: movementObservation({ analysis: pair.previous }),
      current: movementObservation({ evidenceDigest: EVIDENCE_B, analysis: pair.current }),
    });
    return {
      movementClass: classification.movementClass,
      driftClass: classification.drift.driftClass,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-15': async () => {
    const pair = breakingAnalysisPair();
    const classification = classifySourceContractMovement({
      previous: movementObservation({ analysis: pair.previous }),
      current: movementObservation({ evidenceDigest: EVIDENCE_B, analysis: pair.current }),
    });
    return {
      movementClass: classification.movementClass,
      driftClass: classification.drift.driftClass,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-16': async () => {
    const classification = classifySourceContractMovement({
      previous: movementObservation(),
      current: movementObservation({ currentness: 'STALE' }),
    });
    return {
      movementClass: classification.movementClass,
      ceiling: classification.currentnessCeiling,
      driftClass: classification.drift.driftClass,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-17': async () => {
    const classification = classifySourceContractMovement({
      previous: movementObservation(),
      current: movementObservation({ currentness: 'UNAVAILABLE' }),
    });
    return {
      movementClass: classification.movementClass,
      ceiling: classification.currentnessCeiling,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-18': async () => {
    const classification = classifySourceContractMovement({
      previous: movementObservation({ derivationVersion: DERIVATION_V1 }),
      current: movementObservation({ derivationVersion: DERIVATION_V2 }),
    });
    return {
      movementClass: classification.movementClass,
      driftClass: classification.drift.driftClass,
      category: unifiedFromMovementClass(classification.movementClass).category,
    };
  },

  'SC-19': async () => {
    const lost = classifySourceContractMovement({
      previous: movementObservation({ analysis: analyzerAnalysis('PROVEN', [
        { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['OBJECT'] },
      ]) }),
      current: movementObservation({ evidenceDigest: EVIDENCE_B, analysis: analyzerAnalysis('AMBIGUOUS') }),
    });
    const gained = classifySourceContractMovement({
      previous: movementObservation({ analysis: analyzerAnalysis('AMBIGUOUS') }),
      current: movementObservation({ evidenceDigest: EVIDENCE_B, analysis: analyzerAnalysis('PROVEN', [
        { proofClass: 'SCALAR_TYPE_FROM_CAST', itemKeys: ['exchange_rate'], allowedTypes: ['OBJECT'] },
      ]) }),
    });
    return {
      lostClass: lost.movementClass,
      lostCategory: unifiedFromMovementClass(lost.movementClass).category,
      gainedClass: gained.movementClass,
      gainedCategory: unifiedFromMovementClass(gained.movementClass).category,
    };
  },

  'SC-20': async () => {
    return {
      badSha: captureThrow(() => classifySourceContractMovement({
        previous: movementObservation({ sourceSha: 'nope' }),
        current: movementObservation(),
      })),
      badDigest: captureThrow(() => classifySourceContractMovement({
        previous: movementObservation(),
        current: movementObservation({ evidenceDigest: 'ev:sha256:short' }),
      })),
      badCurrentness: captureThrow(() => classifySourceContractMovement({
        previous: movementObservation(),
        current: movementObservation({ currentness: 'MAYBE' as never }),
      })),
    };
  },

  'SC-21': async () => {
    return {
      threw: captureThrow(() => classifySourceContractMovement({
        previous: movementObservation(),
        current: movementObservation({ derivationVersion: `${DERIVATION_V2} PRIVACY_SENTINEL leak` }),
      })),
    };
  },

  'SC-22': async () => {
    const stable = classifySourceContractMovement({
      previous: movementObservation(),
      current: movementObservation(),
    });
    const stale = classifySourceContractMovement({
      previous: movementObservation(),
      current: movementObservation({ currentness: 'STALE' }),
    });
    const mixed = composeSourceContractMovements([stable, stale]);
    const emptyComposed = composeSourceContractMovements([]);
    return {
      mixedKind: mixed.kind,
      mixedClass: mixed.movementClass ?? 'NULL',
      mixedOverallCategory: mixed.overall.category,
      emptyKind: emptyComposed.kind,
      emptyClass: emptyComposed.movementClass ?? 'NULL',
      emptyOverallCategory: emptyComposed.overall.category,
    };
  },

  // --- REPLAY_SEAM -----------------------------------------------------------

  'SC-23': async () => {
    const spy = spyV2Executor();
    const tampered = { ...explorationPlanFixture([EXPLORATION_ACTION_A, EXPLORATION_ACTION_B], [0]), injectedField: 'x' };
    const outcome = await executeReplayPlanV2(tampered as never, spy.executor);
    return { status: outcome.status, invalidReason: invalidReasonOf(outcome), executorCalls: spy.calls.length };
  },

  'SC-24': async () => {
    const spy = spyV2Executor();
    const outcome = await executeReplayPlanV2(journeyReducedPlan(), spy.executor);
    return { status: outcome.status, invalidReason: invalidReasonOf(outcome), executorCalls: spy.calls.length };
  },

  'SC-25': async () => {
    const spy = spyV2Executor();
    const plan = explorationPlanFixture(['p4.unknown.action'], [0]);
    const outcome = await executeReplayPlanV2(plan, spy.executor);
    return { status: outcome.status, invalidReason: invalidReasonOf(outcome), executorCalls: spy.calls.length };
  },

  'SC-26': async () => {
    const originals = [EXPLORATION_ACTION_A, EXPLORATION_ACTION_B, EXPLORATION_ACTION_A];
    const first = explorationPlanFixture(originals, [0]);
    const second = explorationPlanFixture(originals, [2]);
    const identityFirst = resolveRetainedOccurrenceIdentities(first)[0]!;
    const identitySecond = resolveRetainedOccurrenceIdentities(second)[0]!;
    return {
      tokenFirst: identityFirst.identityToken,
      tokenSecond: identitySecond.identityToken,
      distinctTokens: identityFirst.identityToken !== identitySecond.identityToken,
      canonicalZero: occurrenceIdentityToken(EXPLORATION_ACTION_A, 0),
      deterministicRepeat: occurrenceIdentityToken(EXPLORATION_ACTION_A, 2) === identitySecond.identityToken,
      planIdsDistinct: first.planId !== second.planId,
    };
  },

  'SC-27': async () => {
    const originals = [EXPLORATION_ACTION_A, EXPLORATION_ACTION_B, EXPLORATION_ACTION_A];
    const plan = explorationPlanFixture(originals, [0, 1, 2], 'FRESH_EXACT_REPLAY');
    const retained = buildRetainedActionsV2(plan);
    const spy = spyV2Executor();
    const outcome = await executeReplayPlanV2(plan, spy.executor);
    return {
      status: outcome.status,
      retainedCount: retained.length,
      retainedIds: retained.map((action) => action.actionId).join('|'),
      executorCalls: spy.calls.length,
      executorRetainedCount: spy.calls[0] !== undefined ? spy.calls[0]!.retained.length : -1,
      identities: resolveRetainedOccurrenceIdentities(plan).map((identity) => identity.identityToken).join('|'),
    };
  },

  'SC-28': async () => {
    const spy = spyV2Executor();
    const outcome = await executeReplayPlanV2(rawExplorationPlan([0, 0]) as never, spy.executor);
    return { status: outcome.status, invalidReason: invalidReasonOf(outcome), executorCalls: spy.calls.length };
  },

  'SC-29': async () => {
    const plan = explorationPlanFixture([EXPLORATION_ACTION_A], [0]);
    const throwing: V2Executor = () => {
      throw new Error('SYNTHETIC_EXECUTOR_THROW');
    };
    const rejecting: V2Executor = async () => {
      throw new Error('SYNTHETIC_EXECUTOR_REJECT');
    };
    const thrownOutcome = await executeReplayPlanV2(plan, throwing);
    const rejectedOutcome = await executeReplayPlanV2(plan, rejecting);
    return { throwStatus: thrownOutcome.status, rejectStatus: rejectedOutcome.status };
  },

  'SC-30': async () => {
    const spy = spyV2Executor(() => ({ status: 'FAILURE', anomalyFingerprint: FP_OTHER, safety: ZERO_REPLAY_SAFETY }));
    const outcome = await executeReplayPlanV2(explorationPlanFixture([EXPLORATION_ACTION_A], [0]), spy.executor);
    return {
      status: outcome.status,
      reportedFingerprint: outcome.anomalyFingerprint ?? 'NONE',
      executorCalls: spy.calls.length,
    };
  },

  'SC-31': async () => {
    const plan = explorationPlanFixture([EXPLORATION_ACTION_A, EXPLORATION_ACTION_B], [0]);
    const tampered = { ...plan, retainedOccurrenceOrdinals: [99] };
    const resolverThrew = captureThrow(() => resolveRetainedOccurrenceIdentities(tampered as never));
    const spy = spyV2Executor();
    const outcome = await executeReplayPlanV2(tampered as never, spy.executor);
    return {
      resolverThrew,
      status: outcome.status,
      invalidReason: invalidReasonOf(outcome),
      executorCalls: spy.calls.length,
    };
  },

  // --- MINIMIZATION_TRUTH ------------------------------------------------------

  'SC-32': async () => {
    const result = await minimizeFailure(minimizerOptions(['m1', 'm2', 'm3'], { reproduces: () => false, anomalyFingerprint: FP_MIN }));
    return {
      status: result.status,
      freshExactReplay: result.freshExactReplay,
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      confidence: result.confidence,
      minimalSequence: result.minimalReproducingSequence.join('|'),
      replayCount: result.replayCount,
    };
  },

  'SC-33': async () => {
    const result = await minimizeFailure(minimizerOptions(['solo'], { reproduces: () => true, anomalyFingerprint: FP_MIN }));
    return {
      status: result.status,
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      minimalSequence: result.minimalReproducingSequence.join('|'),
      replayCount: result.replayCount,
    };
  },

  'SC-34': async () => {
    const result = await minimizeFailure(minimizerOptions(['b1', 'b2', 'b3', 'b4', 'b5'], {
      reproduces: (ids) => ids.has('b1') && ids.has('b5'),
      anomalyFingerprint: FP_MIN,
      budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations: 1, maxTotalReplays: 2 },
    }));
    return {
      status: result.status,
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      confidence: result.confidence,
      skippedBudgetEntries: result.candidateEvaluations.filter((item) => item.disposition === 'NOT_EVALUATED_BUDGET').length,
    };
  },

  'SC-35': async () => {
    const result = await minimizeFailure(minimizerOptions(['a1', 'a2', 'a3', 'a4'], {
      reproduces: (ids) => ids.has('a1') && ids.has('a4'),
      anomalyFingerprint: FP_MIN,
    }));
    return {
      status: result.status,
      minimalSequence: result.minimalReproducingSequence.join('|'),
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      confidence: result.confidence,
    };
  },

  'SC-36': async () => {
    const scripted = scriptedMinimizerReplay(FP_MIN, () => true);
    const result = await minimizeFailure({
      originalSequence: minimizerSequence(['g1']),
      anomalyFingerprint: FP_MIN,
      sourceVersion: 'nightwatch.phase15p.adversarial-source.v1',
      catalogVersion: MINIMIZER_CATALOG_VERSION,
      approvedActionIds: new Set(['other.action']),
      safety: PASSIVE_MINIMIZATION_SAFETY,
      budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: scripted.replay,
    });
    return {
      status: result.status,
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      replayCount: result.replayCount,
      recordedInvocations: scripted.invocations.length,
    };
  },

  'SC-37': async () => {
    const replay: MinimizationOptions['replay'] = (_candidate, phase) => {
      if (phase === 'REDUCED_CANDIDATE') {
        return { status: 'FAILURE', anomalyFingerprint: FP_MIN, safety: { ...ZERO_REPLAY_SAFETY, productionAttempts: 1 } };
      }
      return { status: 'FAILURE', anomalyFingerprint: FP_MIN, safety: ZERO_REPLAY_SAFETY };
    };
    const result = await minimizeFailure({
      originalSequence: minimizerSequence(['n1', 'n2']),
      anomalyFingerprint: FP_MIN,
      sourceVersion: 'nightwatch.phase15p.adversarial-source.v1',
      catalogVersion: MINIMIZER_CATALOG_VERSION,
      approvedActionIds: new Set(['n1', 'n2']),
      safety: PASSIVE_MINIMIZATION_SAFETY,
      budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay,
    });
    const reduced = result.candidateEvaluations.slice(1);
    return {
      status: result.status,
      safetyRejectionCount: result.safetyRejectionCount,
      evidence: result.reductionEvidenceClass,
      reducedAllInvalidSafety: reduced.length > 0 && reduced.every((item) => item.disposition === 'INVALID' && item.reason === 'SAFETY_VECTOR_NONZERO'),
    };
  },

  'SC-38': async () => {
    const result = await minimizeFailure({
      originalSequence: minimizerSequence(['f1', 'f2']),
      anomalyFingerprint: FP_MIN,
      sourceVersion: 'nightwatch.phase15p.adversarial-source.v1',
      catalogVersion: MINIMIZER_CATALOG_VERSION,
      approvedActionIds: new Set(['f1', 'f2']),
      safety: PASSIVE_MINIMIZATION_SAFETY,
      budget: SYNTHETIC_MINIMIZATION_BUDGET,
      replay: () => ({ status: 'FAILURE', anomalyFingerprint: FP_OTHER, safety: ZERO_REPLAY_SAFETY }),
    });
    return {
      status: result.status,
      freshExactReplay: result.freshExactReplay,
      guarantee: result.minimalityGuarantee,
      minimalSequence: result.minimalReproducingSequence.join('|'),
    };
  },

  'SC-39': async () => {
    const scripted = scriptedMinimizerReplay(FP_MIN, () => true);
    const base = {
      originalSequence: minimizerSequence(['i1']),
      anomalyFingerprint: FP_MIN,
      sourceVersion: 'nightwatch.phase15p.adversarial-source.v1',
      catalogVersion: MINIMIZER_CATALOG_VERSION,
      approvedActionIds: new Set(['i1']),
      safety: PASSIVE_MINIMIZATION_SAFETY,
      replay: scripted.replay,
    };
    const budgetThrows: string[] = [];
    for (const [maxCandidateEvaluations, maxTotalReplays] of [[-1, 2], [2, 1], [0, 0], [3, 2]] as const) {
      budgetThrows.push(await captureRejection(() => minimizeFailure({
        ...base,
        budget: { policyVersion: 'nightwatch.minimization-budget.private.v1', maxCandidateEvaluations, maxTotalReplays },
      })));
    }
    const emptyThrow = await captureRejection(() => minimizeFailure({ ...base, originalSequence: minimizerSequence([]) }));
    return {
      budgetThrows: budgetThrows.join('|'),
      emptyThrow,
      recordedInvocationsAfterFailures: scripted.invocations.length,
    };
  },

  'SC-40': async () => {
    const result = await minimizeFailure(minimizerOptions(['c-a', 'c-b', 'c-c'], {
      reproduces: (ids) => ids.has('c-a') && ids.has('c-c'),
      anomalyFingerprint: FP_MIN,
      preconditionCheck: (candidate) => candidate.some((item) => item.actionId === 'c-a')
        ? { valid: true }
        : { valid: false, reason: 'PRECONDITION_DIVERGENCE' },
    }));
    return {
      status: result.status,
      minimalSequence: result.minimalReproducingSequence.join('|'),
      removedActions: result.removedActions.join('|'),
      guarantee: result.minimalityGuarantee,
      evidence: result.reductionEvidenceClass,
      confidence: result.confidence,
    };
  },

  // --- SEMANTIC_EVALUATION -----------------------------------------------------

  'SC-41': async () => {
    const categories: Record<string, string> = {};
    for (const outcome of SEMANTIC_RECEIPT_OUTCOMES) categories[outcome] = unifiedFromSemanticReceiptOutcome(outcome).category;
    return {
      outcomeCount: SEMANTIC_RECEIPT_OUTCOMES.length,
      nonPassCount: SEMANTIC_RECEIPT_NON_PASS_OUTCOMES.size,
      nonPassBelowProven: [...SEMANTIC_RECEIPT_NON_PASS_OUTCOMES].every((outcome) => categories[outcome] !== 'PROVEN'),
      passCategory: categories['PASS'] ?? 'MISSING',
      anomalyCategory: categories['ANOMALY'] ?? 'MISSING',
      staleCategory: categories['EXPECTATION_SOURCE_STALE'] ?? 'MISSING',
      internalErrorCategory: categories['INTERNAL_ERROR'] ?? 'MISSING',
    };
  },

  'SC-42': async () => {
    const triageMembers = [
      'PASS', 'ANOMALY', 'NOT_APPLICABLE', 'EXPECTATION_UNAVAILABLE', 'EXPECTATION_SOURCE_STALE',
      'EXPECTATION_INVALID', 'INVALID_INPUT', 'PROJECTION_LIMIT_EXCEEDED', 'PARTIAL_COVERAGE',
      'NO_EXPECTATION', 'INTERNAL_ERROR',
    ] as const;
    const allParseTotally = triageMembers.every((member) => parseSemanticTriageOutcome(member) === member);
    const allMapIntoReceiptOutcomes = triageMembers.every((member) =>
      SEMANTIC_RECEIPT_OUTCOMES.includes(canonicalReceiptOutcomeFromTriageOutcome(member)));
    return {
      triageMemberCount: triageMembers.length,
      allParseTotally,
      allMapIntoReceiptOutcomes,
      legacyUnavailableMapping: canonicalReceiptOutcomeFromTriageOutcome('EXPECTATION_UNAVAILABLE'),
      legacyInvalidMapping: canonicalReceiptOutcomeFromTriageOutcome('EXPECTATION_INVALID'),
      unknownReceiptThrow: captureThrow(() => parseSemanticReceiptOutcome('MAYBE')),
    };
  },

  'SC-43': async () => {
    const good = unifiedFromDerivationFailure('CONTRACT_MISMATCH');
    const analyzerDto = unifiedFromAnalyzerStatus('AMBIGUOUS', { blockerCode: 'PARTIAL_PROOF_ONLY' });
    return {
      categoryMismatchThrow: captureThrow(() => parseUnifiedContractResultDto(JSON.stringify({ ...good, category: 'PROVEN' }))),
      detailSentinelThrow: captureThrow(() => parseUnifiedContractResultDto(JSON.stringify({ ...analyzerDto, detail: 'Bearer abc' }))),
      unknownFieldThrow: captureThrow(() => parseUnifiedContractResultDto(JSON.stringify({ ...good, raw: 'x' }))),
    };
  },

  'SC-44': async () => {
    const dtos = [
      unifiedFromDerivationFailure('CONTRACT_MISMATCH'),
      unifiedFromSemanticReceiptOutcome('EXPECTATION_SOURCE_STALE', { targetId: 'fixture-a.phase15p.read' }),
      aggregateUnifiedContractResults([
        unifiedFromDerivationFailure('TYPE_FLOW_AMBIGUOUS'),
        unifiedFromSemanticReceiptOutcome('PARTIAL_COVERAGE'),
      ]),
    ];
    let allByteStable = true;
    let allValidate = true;
    for (const dto of dtos) {
      validateUnifiedContractResultDto(dto);
      if (JSON.stringify(parseUnifiedContractResultDto(JSON.stringify(dto))) !== JSON.stringify(dto)) allByteStable = false;
    }
    return { checked: dtos.length, allByteStable, allValidate };
  },

  'SC-45': async () => {
    const worst = aggregateUnifiedContractResults([
      unifiedFromSemanticReceiptOutcome('PARTIAL_COVERAGE'),
      unifiedFromDerivationFailure('CONTRACT_MISMATCH'),
    ]);
    return {
      emptyThrow: captureThrow(() => aggregateUnifiedContractResults([])),
      worstCategory: worst.category,
      worstSourceValue: worst.sourceValue,
    };
  },

  'SC-46': async () => {
    return {
      receiptThrow: captureThrow(() => unifiedFromSemanticReceiptOutcome('TOTALLY_UNKNOWN' as never)),
      inventoryThrow: captureThrow(() => unifiedFromInventoryCurrentness('FRESH' as never)),
      freshnessThrow: captureThrow(() => unifiedFromSourceFreshness('SORT_OF_CURRENT' as never)),
    };
  },

  'SC-47': async () => {
    let verified = true;
    try {
      verifySemanticVocabularyProvenanceIntegrity();
    } catch {
      verified = false;
    }
    return { verified, entryCount: SEMANTIC_VOCABULARY_PROVENANCE.length };
  },

  'SC-48': async () => {
    const dto = unifiedFromDerivationFailure('CONTRACT_MISMATCH');
    const serialized = JSON.stringify(dto);
    const reparsed = parseUnifiedContractResultDto(serialized);
    return {
      notJsonThrow: captureThrow(() => parseUnifiedContractResultDto('{nope')),
      numberThrow: captureThrow(() => parseUnifiedContractResultDto('42')),
      arrayThrow: captureThrow(() => parseUnifiedContractResultDto('[]')),
      canonicalRoundTrip: JSON.stringify(reparsed) === serialized,
    };
  },

  // --- PARTIAL_COVERAGE --------------------------------------------------------

  'SC-49': async () => {
    const report = buildContractCoverageReport({ inventory: coverageInventoryFixture() });
    const accepted = validateArtifact('coverage-report', cloneJson(report));
    const tamperResult = validateArtifact('coverage-report', { ...cloneJson(report), approvedTargetCount: 7 });
    const staleGap = report.unresolvedMechanicalCoverageGaps[0];
    return {
      valid: accepted.valid,
      staleGapCount: report.unresolvedMechanicalCoverageGaps.length,
      staleGapTarget: staleGap?.targetId ?? 'MISSING',
      staleBlockerCode: staleGap?.blockerCode ?? 'MISSING',
      tamperRejected: !tamperResult.valid,
      tamperReasonIncludesCount: !tamperResult.valid && String(tamperResult.reason).includes('APPROVED_TARGET_COUNT_MISMATCH'),
    };
  },

  'SC-50': async () => {
    const covered = summarizeLocalReadiness(healthyReadinessInput({})).approvedTargetCoverage[0]?.coverage ?? 'MISSING';
    const partial = summarizeLocalReadiness(healthyReadinessInput({ families: [probeOnlyReadinessFamily()] })).approvedTargetCoverage[0]?.coverage ?? 'MISSING';
    const missing = summarizeLocalReadiness(healthyReadinessInput({ families: [] })).approvedTargetCoverage[0]?.coverage ?? 'MISSING';
    return { covered, partial, missing };
  },

  'SC-51': async () => {
    return {
      gapCategory: summarizeLocalReadiness(healthyReadinessInput({ families: [] })).category,
      staleCategory: summarizeLocalReadiness(healthyReadinessInput({ currentness: { [TARGET_READ]: 'STALE' } })).category,
      healthyCategory: summarizeLocalReadiness(healthyReadinessInput({})).category,
    };
  },

  // --- CANDIDATE_LIFECYCLE -------------------------------------------------------

  'SC-52': async () => {
    const dossierReady = driveTo('PROTOCOL_ONLY', 'DOSSIER_READY');
    const rejected = driveTo('SEMANTIC', 'REJECTED');
    const unresolved = driveTo('PROTOCOL_ONLY', 'UNRESOLVED');
    return {
      dossierReadyState: dossierReady.state,
      dossierReadyTransitions: dossierReady.transitionCount,
      rejectedTransitions: rejected.transitionCount,
      unresolvedTransitions: unresolved.transitionCount,
      allTerminal: [dossierReady, rejected, unresolved].every((record) => isTerminalCandidateLifecycleState(record.state)),
    };
  },

  'SC-53': async () => {
    const terminals: readonly CandidateLifecycleState[] = ['DOSSIER_READY', 'REJECTED', 'UNRESOLVED'];
    let illegalThrows = 0;
    let sample = 'NO_SAMPLE';
    for (const terminal of terminals) {
      for (const event of CANDIDATE_LIFECYCLE_EVENTS) {
        const threw = captureThrow(() => transitionCandidateLifecycle(driveTo('PROTOCOL_ONLY', terminal), event));
        if (threw.includes('CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION')) illegalThrows += 1;
        if (terminal === 'DOSSIER_READY' && event === 'ADMIT') sample = threw;
      }
    }
    return { illegalThrows, eventCount: CANDIDATE_LIFECYCLE_EVENTS.length, sample };
  },

  'SC-54': async () => {
    const observed = initialLifecycleRecord('PROTOCOL_ONLY');
    return {
      observedConfirmThrow: captureThrow(() => transitionCandidateLifecycle(observed, 'CONFIRM_REPRODUCTION')),
      admittedApplyThrow: captureThrow(() => transitionCandidateLifecycle(driveTo('PROTOCOL_ONLY', 'ADMITTED'), 'APPLY_MINIMIZATION')),
      unknownEventThrow: captureThrow(() => transitionCandidateLifecycle(observed, 'NOT_AN_EVENT' as never)),
    };
  },

  'SC-55': async () => {
    const openStates: readonly CandidateLifecycleState[] = ['OBSERVED', 'ADMITTED', 'REPRODUCED', 'MINIMIZED', 'UNCHANGED'];
    const blockedStates = openStates.map((state) => gateBlockCandidateLifecycle(driveTo('SEMANTIC', state), 'SAFETY_EVENT_DURING_REPRODUCTION').state);
    return {
      blockedStates: blockedStates.join('|'),
      missingReasonThrow: captureThrow(() => transitionCandidateLifecycle(driveTo('PROTOCOL_ONLY', 'ADMITTED'), 'GATE_BLOCK')),
      triagedGateThrow: captureThrow(() => gateBlockCandidateLifecycle(driveTo('SEMANTIC', 'TRIAGED'), 'SAFETY_EVENT')),
    };
  },

  'SC-56': async () => {
    const closed = gateBlockCandidateLifecycle(driveTo('SEMANTIC', 'REPRODUCED'), 'PRIVACY_BLOCKED');
    const reclosed = gateBlockCandidateLifecycle(closed, 'SAFETY_EVENT');
    const terminalRecord = driveTo('PROTOCOL_ONLY', 'REJECTED');
    return {
      closedState: closed.state,
      closedReason: closed.lastReasonCode ?? 'NULL',
      reclosedIdentityPreserved: reclosed === closed,
      terminalNoop: gateBlockCandidateLifecycle(terminalRecord, 'BUDGET_EXHAUSTED') === terminalRecord,
    };
  },

  'SC-57': async () => {
    return {
      badState: captureThrow(() => validateCandidateLifecycleRecord(lifecycleRecordFixture('PROTOCOL_ONLY', { state: 'NOPE' as never }))),
      negativeCount: captureThrow(() => validateCandidateLifecycleRecord(lifecycleRecordFixture('PROTOCOL_ONLY', { transitionCount: -1 }))),
      wrongVersion: captureThrow(() => validateCandidateLifecycleRecord({
        ...lifecycleRecordFixture('PROTOCOL_ONLY'),
        lifecycleVersion: 'nightwatch.candidate-lifecycle.private.v0',
      })),
      sentinelReason: captureThrow(() => validateCandidateLifecycleRecord(lifecycleRecordFixture('PROTOCOL_ONLY', { lastReasonCode: 'CUSTOMER_SENTINEL' }))),
    };
  },

  'SC-58': async () => {
    const record = lifecycleRecordFixture();
    const json = stableLifecycleJson(record);
    const reordered: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort().reverse()) {
      reordered[key] = (record as unknown as Record<string, unknown>)[key];
    }
    let parsedValidates = false;
    try {
      validateCandidateLifecycleRecord(JSON.parse(json));
      parsedValidates = true;
    } catch {
      parsedValidates = false;
    }
    return {
      json,
      repeatStable: stableLifecycleJson(record) === json,
      reorderStable: stableLifecycleJson(reordered) === json,
      parsedValidates,
    };
  },

  // --- CHECKPOINT_DRIFT (zero executor calls on every drift class) ---------------

  'SC-59': async () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const reportOf = (mutate?: (value: Record<string, any>) => void): string => {
        const value = mutate === undefined ? checkpoint : cloneWith(mutate)(checkpoint);
        const report = classifyCheckpointResumeDrift(value, manifest);
        return `${report.kind}|${report.driftedFields.join(',')}`;
      };
      return {
        executorCalls: 0,
        clean: reportOf(),
        schema: reportOf((value) => { value.schemaVersion = 'nightwatch.campaign-checkpoint.private.v2'; }),
        campaignId: reportOf((value) => { value.campaignId = 'campaign:sha256:a14drifta14drifta14drift'; }),
        fingerprint: reportOf((value) => { value.manifestFingerprint = 'manifest:sha256:a14drifta14drifta14dri'; }),
        runtimeSlot: reportOf((value) => {
          value.runtimeContractVersions = {
            ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
            promotionResult: `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.promotionResult}-future`,
          };
        }),
        lifecycleRecord: reportOf((value) => {
          value.candidateLifecycles = {
            [SYNTHETIC_CLUSTER_ID]: {
              ...persistedLifecycleRecord(),
              lifecycleVersion: `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle}-future`,
            },
          };
        }),
      };
    } finally {
      cleanup(root);
    }
  },

  'SC-60': async () => {
    return {
      executorCalls: 0,
      pairSorted: classifyVersionFingerprintDrift(driftedVersions(['semanticBundleVersion', 'dossierVersion']), VERSIONS).join('|'),
      tripleSorted: classifyVersionFingerprintDrift(
        driftedVersions(['triageReplayPlanV2Version', 'dossierV2Version', 'semanticExpectationDerivationVersion']),
        VERSIONS,
      ).join('|'),
      identicalEmpty: classifyVersionFingerprintDrift(VERSIONS, VERSIONS).length === 0 ? 'EMPTY' : 'NONEMPTY',
    };
  },

  'SC-61': async () => {
    const { root, store, manifest, checkpointPath } = preparedFixture();
    const harness = countingExecutor();
    try {
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
      raw.checkpoint.runtimeContractVersions = {
        ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
        replayBinding: `${CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.replayBinding}-future`,
      };
      fs.writeFileSync(checkpointPath, JSON.stringify(raw));
      const rejection = await captureRejection(() => resumeCampaign(manifest, harness.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      }));
      return {
        rejection,
        preflightCalls: harness.calls.preflight,
        executeCalls: harness.calls.execute,
        executorCalls: harness.calls.preflight + harness.calls.execute,
      };
    } finally {
      cleanup(root);
    }
  },

  'SC-62': async () => {
    const { root, store, manifest, checkpointPath } = preparedFixture();
    const harness = countingExecutor();
    try {
      const raw = JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as Record<string, any>;
      raw.checkpoint.schemaVersion = 'nightwatch.campaign-checkpoint.private.v2-future';
      fs.writeFileSync(checkpointPath, JSON.stringify(raw));
      let readThrew = 'NO_THROW';
      try {
        new CampaignCheckpointStore(store).readCheckpoint(manifest.campaignId, manifest);
      } catch (error) {
        readThrew = error instanceof Error ? error.message : String(error);
      }
      const rejection = await captureRejection(() => resumeCampaign(manifest, harness.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
      }));
      return {
        readRejected: readThrew.includes('SCHEMA_INVALID'),
        resumeRejected: rejection.includes('SCHEMA_INVALID'),
        preflightCalls: harness.calls.preflight,
        executeCalls: harness.calls.execute,
        executorCalls: harness.calls.preflight + harness.calls.execute,
      };
    } finally {
      cleanup(root);
    }
  },

  'SC-63': async () => {
    const { root, store, manifest } = preparedFixture();
    const harness = countingExecutor();
    try {
      const result = await resumeCampaign(manifest, harness.executor, {
        checkpointStore: new CampaignCheckpointStore(store),
        now: () => new Date(STATIC_NOW),
        currentVersions: VERSIONS,
      });
      return {
        resultClass: result.resultClass,
        preflightCalls: harness.calls.preflight,
        executeCalls: harness.calls.execute,
        executorCalls: harness.calls.preflight + harness.calls.execute,
        reachedExecutor: harness.calls.execute > 0,
      };
    } finally {
      cleanup(root);
    }
  },

  // --- PRIVACY_SENTINELS ----------------------------------------------------------

  'SC-64': async () => {
    const tokenLikeDetails = [
      'SUPER_SECRET_TOKEN_VALUE_123456',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'Set-Cookie: session=abcdef0123456789',
      'aws_secret_access_key=wJalrXUtnFEMI',
      'value; curl http://x',
    ];
    let rejectedCount = 0;
    let sampleThrow = 'NO_THROW';
    for (const detail of tokenLikeDetails) {
      const threw = captureThrow(() => summarizeLocalReadiness(healthyReadinessInput({
        blockers: [{ kind: 'SOURCE', code: 'HAS_DETAIL', detail }],
      })));
      if (threw.startsWith('READINESS_PRIVACY_BLOCKED:blocker-detail:')) rejectedCount += 1;
      if (sampleThrow === 'NO_THROW') sampleThrow = threw;
    }
    let categoricalAccepted = false;
    try {
      summarizeLocalReadiness(healthyReadinessInput({
        blockers: [{ kind: 'SOURCE', code: 'HAS_DETAIL', detail: 'stale snapshot' }],
      }));
      categoricalAccepted = true;
    } catch {
      categoricalAccepted = false;
    }
    return { rejectedCount, sampleThrowPrefix: sampleThrow.split(':').slice(0, 2).join(':'), categoricalAccepted };
  },

  'SC-65': async () => {
    const gateReasons = ['CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL', 'TOKEN_SENTINEL', 'Bearer abcdefgh'];
    const gateThrows = gateReasons.map((reason) =>
      captureThrow(() => gateBlockCandidateLifecycle(initialLifecycleRecord('PROTOCOL_ONLY'), reason)));
    return {
      gateThrowsAllInvalid: gateThrows.every((message) => message === 'CANDIDATE_LIFECYCLE_REASON_CODE_INVALID'),
      gateThrowCount: gateThrows.length,
      recordFieldThrow: captureThrow(() => validateCandidateLifecycleRecord(
        lifecycleRecordFixture('PROTOCOL_ONLY', { lastReasonCode: 'CUSTOMER_SENTINEL' }),
      )),
    };
  },

  'SC-66': async () => {
    const probeStatusThrow = captureThrow(() => resolveSourceContract({
      targetId: TARGET_READ,
      reader: NULL_READER,
      currentness: NULL_CURRENTNESS,
      snapshot: { repoId: 'synthetic-repo', sha: SOURCE_SHA_A },
      analyzerProbe: { status: 'probe status Bearer leak', evidenceDigest: EVIDENCE_A },
    }));
    const snapshotShaThrow = captureThrow(() => resolveSourceContract({
      targetId: TARGET_READ,
      reader: NULL_READER,
      currentness: NULL_CURRENTNESS,
      snapshot: { repoId: 'synthetic-repo', sha: 'not-a-valid-sha' },
    }));
    return { probeStatusThrow, snapshotShaThrow };
  },

  // --- MALFORMED_INPUTS -------------------------------------------------------------

  'SC-67': async () => {
    const duplicatedTargets = snapshotInputFixture({ approvedTargets: [TARGET_READ, TARGET_READ] });
    const emptiedVersion = snapshotInputFixture({ analyzerVersion: '' });
    const duplicatedFamilies = snapshotInputFixture({
      families: [
        {
          familyId: 'lifecycle:duplicate',
          targetId: TARGET_READ,
          kind: 'DEEP_TYPE',
          scope: 'ITEM_FIELD_TYPE',
          expectationId: 'exp:ripple.payer-exchange.v1',
          derivationVersion: DERIVATION_V2,
          evidenceVersion: 'nightwatch.source-evidence-digest.v1',
          currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
          campaignEligible: 'CAMPAIGN_ELIGIBLE',
          predecessorFamilyId: null,
          successorFamilyId: null,
          historicalImmutable: false,
        },
        {
          familyId: 'lifecycle:duplicate',
          targetId: TARGET_READ,
          kind: 'DEEP_TYPE',
          scope: 'ITEM_FIELD_TYPE',
          expectationId: 'exp:ripple.payer-exchange.v1',
          derivationVersion: DERIVATION_V2,
          evidenceVersion: 'nightwatch.source-evidence-digest.v1',
          currentnessRequirement: 'SNAPSHOT_SHA_EQUALITY',
          campaignEligible: 'CAMPAIGN_ELIGIBLE',
          predecessorFamilyId: null,
          successorFamilyId: null,
          historicalImmutable: false,
        },
      ],
    });
    return {
      duplicateTargetsThrow: captureThrow(() => buildProjectSnapshot(duplicatedTargets)),
      emptyVersionThrow: captureThrow(() => buildProjectSnapshot(emptiedVersion)),
      duplicateFamilyThrow: captureThrow(() => buildProjectSnapshot(duplicatedFamilies)),
    };
  },

  'SC-68': async () => {
    const kinds: readonly unknown[] = ['dossier-v3', 'nope', '', 'COVERAGE', 'observation ', 123, null];
    const reasons = kinds.map((kind) => {
      const result = validateArtifact(kind as string, {});
      return result.valid ? 'WRONGLY_ACCEPTED' : String(result.reason);
    });
    return { reasons: reasons.join('|'), allRejected: reasons.every((reason) => reason.startsWith('ARTIFACT_KIND_UNKNOWN:')) };
  },

  'SC-69': async () => {
    const truncated: readonly unknown[] = [null, undefined, 42, 'x', [], true];
    let allRejected = true;
    for (const kind of KNOWN_ARTIFACT_KINDS) {
      for (const value of truncated) {
        const result = validateArtifact(kind, value);
        if (result.valid) allRejected = false;
      }
    }
    return { kindCount: KNOWN_ARTIFACT_KINDS.length, truncatedPerKind: truncated.length, allRejected };
  },

  'SC-70': async () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const missingContext = validateArtifact('campaign-checkpoint', cloneJson(checkpoint));
      const drifted = cloneJson(checkpoint) as Record<string, unknown>;
      drifted.campaignId = 'campaign:sha256:a14identitydrift00';
      const identityResult = validateArtifact('campaign-checkpoint', drifted, { manifest });
      return {
        contextMissingReason: missingContext.valid ? 'WRONGLY_ACCEPTED' : String(missingContext.reason),
        identityDriftAccepted: identityResult.valid,
        identityReasonIncludesMismatch: !identityResult.valid && String(identityResult.reason).includes('CAMPAIGN_ID_MISMATCH'),
        executorCalls: 0,
      };
    } finally {
      cleanup(root);
    }
  },

  'SC-71': async () => {
    const badFingerprint = validateArtifact('observation', { ...malformedObservation(), fingerprint: 123 });
    const tamperedSanitized = sanitizeAnomalyObservation(malformedObservation() as never) as unknown as Record<string, unknown>;
    const sanitizedRecord = cloneJson(tamperedSanitized) as Record<string, unknown>;
    sanitizedRecord.clusterKey = 'cluster-key:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    const tamperedKey = validateArtifact('observation', sanitizedRecord);
    const cluster = cloneJson(clusterAnomalies([malformedObservation() as never])[0]!) as unknown as Record<string, unknown>;
    cluster.reproductionCount = ((cluster.occurrenceCount as number) ?? 0) + 1;
    const inflated = validateArtifact('cluster', cluster);
    const dirtyPrivacy = reproductionRecordFixture();
    (dirtyPrivacy.privacy as Record<string, unknown>).cookiesPersisted = 1;
    const dirtyRecord = validateArtifact('reproduction-record', dirtyPrivacy);
    return {
      badFingerprintRejected: !badFingerprint.valid,
      badFingerprintReason: badFingerprint.valid ? 'WRONGLY_ACCEPTED' : String(badFingerprint.reason),
      tamperedKeyRejected: !tamperedKey.valid,
      inflatedClusterReason: inflated.valid ? 'WRONGLY_ACCEPTED' : String(inflated.reason),
      dirtyPrivacyReason: dirtyRecord.valid ? 'WRONGLY_ACCEPTED' : String(dirtyRecord.reason),
    };
  },

  'SC-72': async () => {
    const receipt = semanticReceiptFixture();
    const tamperedId = { ...cloneJson(receipt), receiptId: 'receipt:sha256:bbbbbbbbbbbbbbbbbbbbbbbb' };
    const tamperedIdResult = validateArtifact('semantic-receipt', tamperedId);
    const wrongSum = cloneJson(receipt) as unknown as Record<string, unknown>;
    wrongSum.invariantPassCount = 5;
    const wrongSumResult = validateArtifact('semantic-receipt', wrongSum);
    const notSubsequence = cloneJson(createTriageReplayPlan(replayPlanV1Base() as never)) as unknown as Record<string, unknown>;
    notSubsequence.retainedActionIds = ['a2', 'a1'];
    const notSubsequenceResult = validateArtifact('replay-plan', notSubsequence);
    const v2Plan = explorationPlanFixture([EXPLORATION_ACTION_A, EXPLORATION_ACTION_B], [0]);
    const unknownOrdinal = { ...v2Plan, retainedOccurrenceOrdinals: [7] };
    const unknownOrdinalResult = validateArtifact('replay-plan', unknownOrdinal);
    return {
      tamperedIdReason: tamperedIdResult.valid ? 'WRONGLY_ACCEPTED' : String(tamperedIdResult.reason),
      wrongSumReason: wrongSumResult.valid ? 'WRONGLY_ACCEPTED' : String(wrongSumResult.reason),
      notSubsequenceReason: notSubsequenceResult.valid ? 'WRONGLY_ACCEPTED' : String(notSubsequenceResult.reason),
      unknownOrdinalReason: unknownOrdinalResult.valid ? 'WRONGLY_ACCEPTED' : String(unknownOrdinalResult.reason),
    };
  },

  'SC-73': async () => {
    const { root, manifest } = preparedFixture();
    try {
      const stub = cloneJson(incompleteDossierFixture()) as unknown as Record<string, unknown>;
      const privacyViolation = validateArtifact('dossier', { ...stub, privacy: { result: 'PASS', confirmed: true } });
      const brief = buildCampaignMorningBrief({
        manifest,
        resultClass: 'COMPLETE_WITH_FINDINGS',
        runs: [],
        clusters: [],
        dossiers: [],
        coverageGaps: [],
        reproductionQueue: [],
        safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
        privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
        nightwatchInternalIssues: [],
        transientsAndNonFindings: [],
      }) as unknown as Record<string, unknown>;
      const publicationViolation = validateArtifact('morning-brief', { ...cloneJson(brief), externalPublication: 'ALLOWED' });
      const bundle = sourceBundleFixture();
      const bundleTampered = validateArtifact('source-bundle', { ...cloneJson(bundle), bundleId: 'scb:sha256:eeeeeeeeeeeeeeeeeeeeeeee' });
      const coverageReport = buildContractCoverageReport({ inventory: coverageInventoryFixture() });
      const digestViolation = validateArtifact('coverage-report', { ...cloneJson(coverageReport), digest: `ev:sha256:${'0'.repeat(24)}` });
      return {
        stubPrivacyReason: privacyViolation.valid ? 'WRONGLY_ACCEPTED' : String(privacyViolation.reason),
        briefPublicationReason: publicationViolation.valid ? 'WRONGLY_ACCEPTED' : String(publicationViolation.reason),
        bundleIdentityReason: bundleTampered.valid ? 'WRONGLY_ACCEPTED' : String(bundleTampered.reason),
        coverageDigestReason: digestViolation.valid ? 'WRONGLY_ACCEPTED' : String(digestViolation.reason),
      };
    } finally {
      cleanup(root);
    }
  },

  // --- SNAPSHOT_DIFF -----------------------------------------------------------------

  'SC-74': async () => {
    const previous = buildProjectSnapshot(snapshotInputFixture());
    const current = buildProjectSnapshot(snapshotInputFixture());
    const diff = compareProjectSnapshots(previous, current);
    return {
      classification: diff.classification,
      findingCount: diff.findings.length,
      digestStable: previous.manifestDigest === current.manifestDigest,
      serializationStable: serializeProjectSnapshot(previous) === serializeProjectSnapshot(current),
    };
  },

  'SC-75': async () => {
    const base = () => snapshotInputFixture();
    const additive = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), recipeSchemaVersions: [...base().recipeSchemaVersions, 'nightwatch.real-source-expectation-recipe.v3'] }),
    );
    const downgrade = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), semanticReceiptVersion: 'nightwatch.semantic-evaluation-receipt.v1' }),
    );
    const advance = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), analyzerVersion: 'nightwatch.mechanical-contract-analyzer.v3' }),
    );
    const removal = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), replayPlanVersions: base().replayPlanVersions.filter((version) => version !== 'nightwatch.triage-replay-plan.private.v2') }),
    );
    return {
      additiveClassification: additive.classification,
      additiveSection: additive.findings[0]?.section ?? 'MISSING',
      additiveKind: additive.findings[0]?.kind ?? 'MISSING',
      downgradeClassification: downgrade.classification,
      downgradeSection: downgrade.findings[0]?.section ?? 'MISSING',
      advanceClassification: advance.classification,
      advanceSection: advance.findings[0]?.section ?? 'MISSING',
      removalClassification: removal.classification,
      removalSection: removal.findings[0]?.section ?? 'MISSING',
      removalKind: removal.findings[0]?.kind ?? 'MISSING',
    };
  },

  'SC-76': async () => {
    const base = () => snapshotInputFixture();
    const expanded = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), approvedTargets: [...base().approvedTargets, 'synthetic.target-three.read'] }),
    );
    const revoked = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), approvedTargets: base().approvedTargets.filter((target) => target !== TARGET_READ) }),
    );
    const ownerScope = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({
        ...base(),
        ownerScope: { ...base().ownerScope, status: 'THAWED_BY_OWNER' },
      }),
    );
    return {
      expandedClassification: expanded.classification,
      expandedKind: expanded.findings[0]?.kind ?? 'MISSING',
      revokedClassification: revoked.classification,
      revokedKind: revoked.findings[0]?.kind ?? 'MISSING',
      ownerScopeClassification: ownerScope.classification,
      ownerScopeSection: ownerScope.findings[0]?.section ?? 'MISSING',
    };
  },

  'SC-77': async () => {
    const base = () => snapshotInputFixture();
    const driftedFamilyId = 'lifecycle:exp:ripple.payer-exchange.v1';
    const fieldDrift = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({
        ...base(),
        contractFamilies: base().contractFamilies.map((family) =>
          family.familyId === driftedFamilyId ? { ...family, derivationVersion: DERIVATION_V1 } : family),
      }),
    );
    const familyRemoval = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({ ...base(), contractFamilies: base().contractFamilies.filter((family) => family.familyId !== driftedFamilyId) }),
    );
    return {
      fieldDriftClassification: fieldDrift.classification,
      fieldDriftDetail: fieldDrift.findings[0]?.detail ?? 'MISSING',
      removalClassification: familyRemoval.classification,
      removalKind: familyRemoval.findings[0]?.kind ?? 'MISSING',
    };
  },

  'SC-78': async () => {
    const base = () => snapshotInputFixture();
    const combo = compareProjectSnapshots(
      buildProjectSnapshot(base()),
      buildProjectSnapshot({
        ...base(),
        ownerScope: { ...base().ownerScope, reason: 'SYNTHETIC_POLICY_REASON' },
        contractFamilies: base().contractFamilies.filter((family) => family.familyId !== 'lifecycle:exp:ripple.payer-exchange.v1'),
      }),
    );
    const previous = buildProjectSnapshot(base());
    const mutated = JSON.parse(serializeProjectSnapshot(previous)) as Record<string, unknown>;
    mutated['snapshotSchemaVersion'] = 'nightwatch.project-snapshot.v0';
    const schemaMismatch = compareProjectSnapshots(previous, mutated as unknown as ReturnType<typeof buildProjectSnapshot>);
    return {
      comboClassification: combo.classification,
      comboFindingClasses: combo.findings.map((finding) => finding.classification).join('|'),
      schemaClassification: schemaMismatch.classification,
      schemaFindingCount: schemaMismatch.findings.length,
      schemaFindingKind: schemaMismatch.findings[0]?.kind ?? 'MISSING',
    };
  },
};

/** Fresh mutable deep copy of the built registry for corruption cases. */
function clonedRegistry(): ContractFamilyDescriptor[] {
  return JSON.parse(JSON.stringify(getContractLifecycleRegistry())) as ContractFamilyDescriptor[];
}

// ---------------------------------------------------------------------------
// The expected-pin registry: the exact fail-closed / truthful outcome for each
// scenario-class id. Deep-equality against these pins IS the per-id assertion.
// ---------------------------------------------------------------------------

const EXPECTED: Readonly<Record<string, ProbeOutcome>> = {
  // --- SOURCE_CONTRACTS ------------------------------------------------------

  'SC-01': {
    stateCount: 16,
    byteDeterministic: true,
    kinds: 'ARCHIVED_HISTORICAL_SHAPE|COLLECTION|DEEP_TYPE|HISTORICAL_SHAPE|MECHANICAL_PROBE',
    scopes: 'ANALYZER_EVIDENCE|COLLECTION_WIDE|ITEM_FIELD_TYPE|ROOT_ARRAY_SHAPE',
    derivations: [REAL_SOURCE_COLLECTION_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION, REAL_SOURCE_DERIVATION_VERSION_V2, MECHANICAL_ANALYZER_VERSION].sort().join('|'),
    modelVersion: 'nightwatch.contract-lifecycle-model.v1',
  },

  'SC-02': {
    count: 2,
    allHistoricalImmutable: true,
    noneTerminal: true,
    allSuperseded: true,
    allFrozen: true,
  },

  'SC-03': {
    targetCount: APPROVED_READ_ONLY_TARGET_IDS.length,
    allResolved: true,
    uniqueTerminals: true,
  },

  'SC-04': {
    kind: 'UNKNOWN_TARGET',
    familyCount: 0,
    overallCategory: 'NOT_APPLICABLE',
  },

  'SC-05': {
    stateCount: 1,
    singletonTerminalSelf: true,
    admissionAuthority: 'ANALYZER_PROBE_EVIDENCE_ONLY',
    compatibilityState: 'ACTIVE_TERMINAL',
  },

  'SC-06': {
    threw: `LIFECYCLE_MODEL_DUPLICATE_FAMILY_ID:lifecycle:mechanical-probe:${PROBE_ONLY_TARGET}`,
  },

  'SC-07': {
    threw: 'LIFECYCLE_MODEL_INVALID_DESCRIPTOR:unknown-derivation-version:nightwatch.bogus-derivation.v9',
  },

  'SC-08': {
    threw: `LIFECYCLE_MODEL_INVALID_LINEAGE:dangling-successor:lifecycle:mechanical-probe:${PROBE_ONLY_TARGET}`,
  },

  'SC-09': {
    threw: `LIFECYCLE_MODEL_INVALID_LINEAGE:asymmetric-predecessor:${ACCOUNT_COLLECTION_FAMILY}`,
  },

  'SC-10': {
    stateCount: 16,
    mismatches: 0,
    activeTerminals: 10,
    superseded: 4,
    archivedHistorical: 2,
  },

  'SC-11': {
    mixedBlocked: true,
    composedMixed: 'MIXED_CURRENTNESS_BLOCKED',
    emptyFloored: true,
    composedEmpty: 'NOT_EVALUATED',
    composedAgreed: 'CURRENT',
    agreedValue: 'CURRENT',
  },

  'SC-12': {
    removalThrew: `LIFECYCLE_IDENTITY_REBIND:lifecycle:ripple.common-exchange.read.real-source-shape:removed`,
    additiveOk: true,
  },

  // --- CURRENTNESS_MOVEMENT -----------------------------------------------------

  'SC-13': {
    movementClass: 'SEMANTICALLY_STABLE',
    ceiling: 'CURRENT',
    driftClass: 'EVIDENCE_UNCHANGED_SHA_MOVED',
    category: 'PROVEN',
  },

  'SC-14': {
    movementClass: 'EVIDENCE_DRIFTED_COMPATIBLE',
    driftClass: 'EVIDENCE_CHANGED_COMPATIBLE',
    category: 'PARTIAL',
  },

  'SC-15': {
    movementClass: 'EVIDENCE_DRIFTED_BREAKING',
    driftClass: 'EVIDENCE_CHANGED_BREAKING',
    category: 'UNSUPPORTED',
  },

  'SC-16': {
    movementClass: 'SOURCE_STALE',
    ceiling: 'STALE',
    driftClass: 'SOURCE_STALE',
    category: 'STALE',
  },

  'SC-17': {
    movementClass: 'SOURCE_UNAVAILABLE',
    ceiling: 'UNAVAILABLE',
    category: 'UNAVAILABLE',
  },

  'SC-18': {
    movementClass: 'DERIVATION_VERSION_MOVED',
    driftClass: 'DERIVATION_VERSION_CHANGED',
    category: 'PARTIAL',
  },

  'SC-19': {
    lostClass: 'PROVABILITY_LOST',
    lostCategory: 'AMBIGUOUS',
    gainedClass: 'PROVABILITY_GAINED',
    gainedCategory: 'PROVEN',
  },

  'SC-20': {
    badSha: 'MOVEMENT_INVALID_SOURCE_SHA:previous',
    badDigest: 'MOVEMENT_INVALID_EVIDENCE_DIGEST:current',
    badCurrentness: 'MOVEMENT_UNKNOWN_CURRENTNESS:MAYBE',
  },

  'SC-21': {
    threw: 'MOVEMENT_PRIVACY_SENTINEL_REJECTED:current.derivationVersion',
  },

  'SC-22': {
    mixedKind: 'MIXED_CURRENTNESS_BLOCKED',
    mixedClass: 'NULL',
    mixedOverallCategory: 'STALE',
    emptyKind: 'COMPOSED',
    emptyClass: 'NO_EVALUABLE_CONTRACT',
    emptyOverallCategory: 'NOT_APPLICABLE',
  },

  // --- REPLAY_SEAM -----------------------------------------------------------------

  'SC-23': {
    status: 'INVALID',
    invalidReason: 'REPLAY_PLAN_V2_UNKNOWN_FIELD:injectedField',
    executorCalls: 0,
  },

  'SC-24': {
    status: 'INVALID',
    invalidReason: 'PRECONDITION_DIVERGENCE',
    executorCalls: 0,
  },

  'SC-25': {
    status: 'INVALID',
    invalidReason: 'ACTION_NOT_APPROVED',
    executorCalls: 0,
  },

  'SC-26': {
    tokenFirst: `${EXPLORATION_ACTION_A}#occ:0`,
    tokenSecond: `${EXPLORATION_ACTION_A}#occ:2`,
    distinctTokens: true,
    canonicalZero: `${EXPLORATION_ACTION_A}#occ:0`,
    deterministicRepeat: true,
    planIdsDistinct: true,
  },

  'SC-27': {
    status: 'FAILURE',
    retainedCount: 3,
    retainedIds: `${EXPLORATION_ACTION_A}|${EXPLORATION_ACTION_B}|${EXPLORATION_ACTION_A}`,
    executorCalls: 1,
    executorRetainedCount: 3,
    identities: `${EXPLORATION_ACTION_A}#occ:0|${EXPLORATION_ACTION_B}#occ:1|${EXPLORATION_ACTION_A}#occ:2`,
  },

  'SC-28': {
    status: 'INVALID',
    invalidReason: 'REPLAY_PLAN_V2_NOT_SUBSEQUENCE',
    executorCalls: 0,
  },

  'SC-29': {
    throwStatus: 'INVALID',
    rejectStatus: 'INVALID',
  },

  'SC-30': {
    status: 'PASS',
    reportedFingerprint: 'NONE',
    executorCalls: 1,
  },

  'SC-31': {
    resolverThrew: 'RETAINED_OCCURRENCE_UNRESOLVED:99',
    status: 'INVALID',
    invalidReason: 'REPLAY_PLAN_V2_UNKNOWN_ORDINAL',
    executorCalls: 0,
  },

  // --- MINIMIZATION_TRUTH ------------------------------------------------------------

  'SC-32': {
    status: 'NO_REPRODUCTION',
    freshExactReplay: 'NOT_REPRODUCED',
    guarantee: 'NONE',
    evidence: 'NO_REDUCIBLE_CANDIDATE',
    confidence: 'UNRESOLVED',
    minimalSequence: '',
    replayCount: 1,
  },

  'SC-33': {
    status: 'UNCHANGED',
    guarantee: '1-MINIMAL',
    evidence: 'NO_REDUCIBLE_CANDIDATE',
    minimalSequence: 'solo',
    replayCount: 1,
  },

  'SC-34': {
    status: 'BOUNDED_BUDGET_EXHAUSTED',
    guarantee: 'BOUNDED_MINIMAL',
    evidence: 'MINIMALITY_NOT_PROVEN',
    confidence: 'LOW',
    skippedBudgetEntries: 1,
  },

  'SC-35': {
    status: 'MINIMIZED',
    minimalSequence: 'a1|a4',
    guarantee: '1-MINIMAL',
    evidence: 'MINIMALITY_PROVEN',
    confidence: 'HIGH',
  },

  'SC-36': {
    status: 'INVALID_ORIGINAL',
    guarantee: 'NONE',
    evidence: 'REDUCTION_PRECONDITION_UNAVAILABLE',
    replayCount: 0,
    recordedInvocations: 0,
  },

  'SC-37': {
    status: 'UNCHANGED',
    safetyRejectionCount: 2,
    evidence: 'REDUCTION_PRECONDITION_UNAVAILABLE',
    reducedAllInvalidSafety: true,
  },

  'SC-38': {
    status: 'NO_REPRODUCTION',
    freshExactReplay: 'NOT_REPRODUCED',
    guarantee: 'NONE',
    minimalSequence: '',
  },

  'SC-39': {
    budgetThrows: 'MINIMIZATION_BUDGET_INVALID|MINIMIZATION_BUDGET_INVALID|MINIMIZATION_BUDGET_INVALID|MINIMIZATION_BUDGET_INVALID',
    emptyThrow: 'MINIMIZATION_ORIGINAL_SEQUENCE_EMPTY',
    recordedInvocationsAfterFailures: 0,
  },

  'SC-40': {
    status: 'MINIMIZED',
    minimalSequence: 'c-a|c-c',
    removedActions: 'c-b',
    guarantee: 'BOUNDED_MINIMAL',
    evidence: 'MINIMALITY_NOT_PROVEN',
    confidence: 'MEDIUM',
  },

  // --- SEMANTIC_EVALUATION -------------------------------------------------------------

  'SC-41': {
    outcomeCount: 10,
    nonPassCount: 8,
    nonPassBelowProven: true,
    passCategory: 'PROVEN',
    anomalyCategory: 'PROVEN',
    staleCategory: 'STALE',
    internalErrorCategory: 'UNSUPPORTED',
  },

  'SC-42': {
    triageMemberCount: 11,
    allParseTotally: true,
    allMapIntoReceiptOutcomes: true,
    legacyUnavailableMapping: 'EXPECTATION_SOURCE_UNAVAILABLE',
    legacyInvalidMapping: 'INTERNAL_ERROR',
    unknownReceiptThrow: 'SEMANTIC_VOCABULARY_UNKNOWN_VALUE:semantic-receipt-outcome:MAYBE',
  },

  'SC-43': {
    categoryMismatchThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:category-mismatch',
    detailSentinelThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:detail-sentinel',
    unknownFieldThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:unknown-field:raw',
  },

  'SC-44': {
    checked: 3,
    allByteStable: true,
    allValidate: true,
  },

  'SC-45': {
    emptyThrow: 'UNIFIED_RESULT_AGGREGATION_EMPTY',
    worstCategory: 'UNSUPPORTED',
    worstSourceValue: 'UNSUPPORTED',
  },

  'SC-46': {
    receiptThrow: 'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:semantic-receipt-outcome:TOTALLY_UNKNOWN',
    inventoryThrow: 'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:inventory-currentness:FRESH',
    freshnessThrow: 'SEMANTIC_VOCABULARY_UNSUPPORTED_VALUE:source-freshness:SORT_OF_CURRENT',
  },

  'SC-47': {
    verified: true,
    // Phase 15H hardening: registry grew 50 -> 110 with the A02 round-2
    // triage-side vocabularies (mechanical provenance, integrity-verified).
    entryCount: 110,
  },

  'SC-48': {
    notJsonThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:not-json',
    numberThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:not-object',
    arrayThrow: 'SEMANTIC_VOCABULARY_DTO_INVALID:not-object',
    canonicalRoundTrip: true,
  },

  // --- PARTIAL_COVERAGE -----------------------------------------------------------------

  'SC-49': {
    valid: true,
    staleGapCount: 1,
    staleGapTarget: 'phase15p-adversarial-stale',
    staleBlockerCode: 'SOURCE_STALE',
    tamperRejected: true,
    tamperReasonIncludesCount: true,
  },

  'SC-50': {
    covered: 'COVERED',
    partial: 'PARTIAL',
    missing: 'MISSING',
  },

  'SC-51': {
    gapCategory: 'BLOCKED_SOURCE',
    staleCategory: 'BLOCKED_SOURCE',
    healthyCategory: 'READY_LOCAL_SYNTHETIC',
  },

  // --- CANDIDATE_LIFECYCLE -----------------------------------------------------------------

  'SC-52': {
    dossierReadyState: 'DOSSIER_READY',
    dossierReadyTransitions: 5,
    rejectedTransitions: 1,
    unresolvedTransitions: 2,
    allTerminal: true,
  },

  'SC-53': {
    // Phase 15H hardening: the A05 round-2 CLUSTERED event makes 12 events;
    // terminal illegality count = 3 terminals x 12 events = 36.
    illegalThrows: 36,
    eventCount: 12,
    sample: 'CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:DOSSIER_READY:EVENT:ADMIT:TO:NONE',
  },

  'SC-54': {
    observedConfirmThrow: 'CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:OBSERVED:EVENT:CONFIRM_REPRODUCTION:TO:NONE',
    admittedApplyThrow: 'CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:ADMITTED:EVENT:APPLY_MINIMIZATION:TO:NONE',
    unknownEventThrow: 'CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:OBSERVED:EVENT:UNKNOWN:TO:NONE',
  },

  'SC-55': {
    blockedStates: 'UNRESOLVED|UNRESOLVED|UNRESOLVED|UNRESOLVED|UNRESOLVED',
    missingReasonThrow: 'CANDIDATE_LIFECYCLE_GATE_REASON_REQUIRED',
    triagedGateThrow: 'CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION:FROM:TRIAGED:EVENT:GATE_BLOCK:TO:NONE',
  },

  'SC-56': {
    closedState: 'UNRESOLVED',
    closedReason: 'PRIVACY_BLOCKED',
    reclosedIdentityPreserved: true,
    terminalNoop: true,
  },

  'SC-57': {
    badState: 'CANDIDATE_LIFECYCLE_INVALID_RECORD:STATE:ENUM_INVALID',
    negativeCount: 'CANDIDATE_LIFECYCLE_INVALID_RECORD:TRANSITION_COUNT:NON_NEGATIVE_INTEGER_REQUIRED',
    wrongVersion: 'CANDIDATE_LIFECYCLE_INVALID_RECORD:VERSION_INVALID',
    sentinelReason: 'CANDIDATE_LIFECYCLE_INVALID_RECORD:PRIVACY_BLOCKED:candidateLifecycle.lastReasonCode',
  },

  'SC-58': {
    json: '{"lastReasonCode":null,"lifecycleVersion":"nightwatch.candidate-lifecycle.private.v1","state":"OBSERVED","transitionCount":0,"variant":"PROTOCOL_ONLY"}',
    repeatStable: true,
    reorderStable: true,
    parsedValidates: true,
  },

  // --- CHECKPOINT_DRIFT ----------------------------------------------------------------------

  'SC-59': {
    executorCalls: 0,
    clean: 'NONE|',
    schema: 'CHECKPOINT_SCHEMA_VERSION_DRIFT|schemaVersion',
    campaignId: 'CAMPAIGN_IDENTITY_DRIFT|campaignId',
    fingerprint: 'CAMPAIGN_IDENTITY_DRIFT|manifestFingerprint',
    runtimeSlot: 'CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT|promotionResult',
    lifecycleRecord: `CANDIDATE_LIFECYCLE_VERSION_DRIFT|${SYNTHETIC_CLUSTER_ID}`,
  },

  'SC-60': {
    executorCalls: 0,
    pairSorted: 'dossierVersion|semanticBundleVersion',
    tripleSorted: 'dossierV2Version|semanticExpectationDerivationVersion|triageReplayPlanV2Version',
    identicalEmpty: 'EMPTY',
  },

  'SC-61': {
    rejection: 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED',
    preflightCalls: 0,
    executeCalls: 0,
    executorCalls: 0,
  },

  'SC-62': {
    readRejected: true,
    resumeRejected: true,
    preflightCalls: 0,
    executeCalls: 0,
    executorCalls: 0,
  },

  'SC-63': {
    resultClass: 'COMPLETE_CLEAN',
    preflightCalls: 10,
    executeCalls: 9,
    executorCalls: 19,
    reachedExecutor: true,
  },

  // --- PRIVACY_SENTINELS -------------------------------------------------------------------------

  'SC-64': {
    rejectedCount: 5,
    sampleThrowPrefix: 'READINESS_PRIVACY_BLOCKED:blocker-detail',
    categoricalAccepted: true,
  },

  'SC-65': {
    gateThrowsAllInvalid: true,
    gateThrowCount: 6,
    recordFieldThrow: 'CANDIDATE_LIFECYCLE_INVALID_RECORD:PRIVACY_BLOCKED:candidateLifecycle.lastReasonCode',
  },

  'SC-66': {
    probeStatusThrow: 'RESOLUTION_PRIVACY_SENTINEL_REJECTED:analyzerProbe.status',
    snapshotShaThrow: 'RESOLUTION_INVALID_SNAPSHOT_SHA',
  },

  // --- MALFORMED_INPUTS -----------------------------------------------------------------------------

  'SC-67': {
    duplicateTargetsThrow: `PROJECT_SNAPSHOT_DUPLICATE_SET_ENTRY:approvedTargets:${TARGET_READ}`,
    emptyVersionThrow: 'PROJECT_SNAPSHOT_INVALID_INPUT:analyzerVersion',
    duplicateFamilyThrow: 'PROJECT_SNAPSHOT_DUPLICATE_FAMILY_ID:lifecycle:duplicate',
  },

  'SC-68': {
    reasons: [
      'ARTIFACT_KIND_UNKNOWN:dossier-v3',
      'ARTIFACT_KIND_UNKNOWN:nope',
      'ARTIFACT_KIND_UNKNOWN:',
      'ARTIFACT_KIND_UNKNOWN:COVERAGE',
      'ARTIFACT_KIND_UNKNOWN:observation ',
      'ARTIFACT_KIND_UNKNOWN:123',
      'ARTIFACT_KIND_UNKNOWN:null',
    ].join('|'),
    allRejected: true,
  },

  'SC-69': {
    kindCount: 14,
    truncatedPerKind: 6,
    allRejected: true,
  },

  'SC-70': {
    contextMissingReason: 'ARTIFACT_CONTEXT_MISSING:campaign-checkpoint:manifest',
    identityDriftAccepted: false,
    identityReasonIncludesMismatch: true,
    executorCalls: 0,
  },

  'SC-71': {
    badFingerprintRejected: true,
    badFingerprintReason: 'ARTIFACT_OBSERVATION_INVALID:FINGERPRINT:STRING_REQUIRED',
    tamperedKeyRejected: true,
    inflatedClusterReason: 'ARTIFACT_CLUSTER_INVALID:REPRODUCTIONS_EXCEED_OCCURRENCES',
    dirtyPrivacyReason: 'ARTIFACT_REPRODUCTION_INVALID:PRIVACY_PASS_WITH_PERSISTED_COUNTERS',
  },

  'SC-72': {
    tamperedIdReason: 'ARTIFACT_RECEIPT_INVALID:RECEIPT_ID_MISMATCH',
    wrongSumReason: 'SEMANTIC_RECEIPT_INVALID:count-sum',
    notSubsequenceReason: 'ARTIFACT_REPLAY_PLAN_INVALID:REPLAY_PLAN_NOT_SUBSEQUENCE',
    unknownOrdinalReason: 'ARTIFACT_REPLAY_PLAN_INVALID:REPLAY_PLAN_V2_UNKNOWN_ORDINAL',
  },

  'SC-73': {
    stubPrivacyReason: 'ARTIFACT_DOSSIER_INVALID:INCOMPLETE_PRIVACY_STUB',
    briefPublicationReason: 'CAMPAIGN_MORNING_BRIEF_PUBLICATION_INVALID',
    bundleIdentityReason: 'SEMANTIC_BUNDLE_ID_MISMATCH',
    coverageDigestReason: 'ARTIFACT_COVERAGE_REPORT_INVALID:DIGEST_MISMATCH',
  },

  // --- SNAPSHOT_DIFF -----------------------------------------------------------------------------------

  'SC-74': {
    classification: 'UNCHANGED',
    findingCount: 0,
    digestStable: true,
    serializationStable: true,
  },

  'SC-75': {
    additiveClassification: 'COMPATIBLE_CHANGE',
    additiveSection: 'recipeSchemaVersions',
    additiveKind: 'ADDED',
    downgradeClassification: 'INCOMPATIBLE_CHANGE',
    downgradeSection: 'semanticReceiptVersion',
    advanceClassification: 'SEMANTIC_CHANGE',
    advanceSection: 'analyzerVersion',
    removalClassification: 'INCOMPATIBLE_CHANGE',
    removalSection: 'replayPlanVersions',
    removalKind: 'REMOVED',
  },

  'SC-76': {
    expandedClassification: 'AUTHORITY_CHANGE',
    expandedKind: 'ADDED',
    revokedClassification: 'AUTHORITY_CHANGE',
    revokedKind: 'REMOVED',
    ownerScopeClassification: 'AUTHORITY_CHANGE',
    ownerScopeSection: 'ownerScope.status',
  },

  'SC-77': {
    fieldDriftClassification: 'SEMANTIC_CHANGE',
    fieldDriftDetail: 'lifecycle:exp:ripple.payer-exchange.v1:derivationVersion',
    removalClassification: 'INCOMPATIBLE_CHANGE',
    removalKind: 'REMOVED',
  },

  'SC-78': {
    comboClassification: 'AUTHORITY_CHANGE',
    comboFindingClasses: 'AUTHORITY_CHANGE|INCOMPATIBLE_CHANGE',
    schemaClassification: 'INCOMPATIBLE_CHANGE',
    schemaFindingCount: 1,
    schemaFindingKind: 'SCHEMA_MISMATCH',
  },
};

// ---------------------------------------------------------------------------
// Matrix runner + completeness tracking.
// ---------------------------------------------------------------------------

const EXECUTED_IDS: Set<string> = new Set();

async function runProbe(id: string): Promise<ProbeOutcome> {
  const probe = PROBES[id];
  if (probe === undefined) throw new Error(`A14 corpus: no probe registered for ${id}`);
  const outcome = await probe();
  EXECUTED_IDS.add(id);
  return outcome;
}

async function runMatrixPass(): Promise<Record<string, ProbeOutcome>> {
  const outcomes: Record<string, ProbeOutcome> = {};
  for (const scenario of ADVERSARIAL_SCENARIO_CLASSES) {
    outcomes[scenario.id] = await runProbe(scenario.id);
  }
  return outcomes;
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test.describe('Phase 15P A14 adversarial corpus catalog integrity', () => {
  test('catalog declares 78 unique classes across 11 domains and every class has a probe and a pin', () => {
    expect(ADVERSARIAL_SCENARIO_CLASSES.length).toBe(78);
    const ids = ADVERSARIAL_SCENARIO_CLASSES.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(78);
    for (const scenario of ADVERSARIAL_SCENARIO_CLASSES) {
      expect(scenario.id, scenario.title).toMatch(/^SC-\d{2}$/);
      expect(ADVERSARIAL_DOMAINS, scenario.id).toContain(scenario.domain);
      expect(PROBES[scenario.id], `${scenario.id} has a probe`).toBeDefined();
      expect(EXPECTED[scenario.id], `${scenario.id} has a pin`).toBeDefined();
    }
    const partition = ADVERSARIAL_DOMAINS.flatMap((domain) => scenarioClassesByDomain(domain).map((scenario) => scenario.id)).sort();
    expect(partition).toEqual([...ids].sort());
  });
});

for (const domain of ADVERSARIAL_DOMAINS) {
  const classes = scenarioClassesByDomain(domain);
  const range = `${classes[0]!.id}..${classes[classes.length - 1]!.id}`;
  test.describe(`Phase 15P A14 adversarial domain ${domain} (${range})`, () => {
    test(`every scenario class ${range} meets its fail-closed/truthful pin`, async () => {
      for (const scenario of classes) {
        const outcome = await runProbe(scenario.id);
        expect(outcome, `${scenario.id}: ${scenario.title}`).toEqual(EXPECTED[scenario.id]!);
        // Executor-escape anchor: checkpoint-drift classes must never reach an
        // executor callback; the positive control (SC-63) must reach it.
        if (domain === 'CHECKPOINT_DRIFT') {
          const calls = outcome['executorCalls'];
          if (scenario.id === 'SC-63') {
            expect(calls, `${scenario.id} positive control reaches the executor`).toBeGreaterThan(0);
          } else {
            expect(calls, `${scenario.id} stops before any executor callback`).toBe(0);
          }
        }
      }
    });
  });
}

test.describe('Phase 15P A14 adversarial corpus determinism and privacy', () => {
  test('whole-matrix determinism: three repeat passes deep-equal, executed ids complete, zero credential sentinels', async () => {
    const passes: Record<string, ProbeOutcome>[] = [];
    for (let repeat = 0; repeat < 3; repeat += 1) passes.push(await runMatrixPass());

    // Completeness: executed ids === catalog ids, in catalog order, every pass.
    const catalogIds = ADVERSARIAL_SCENARIO_CLASSES.map((scenario) => scenario.id);
    for (const pass of passes) {
      expect(Object.keys(pass), 'matrix pass covers the catalog exactly').toEqual(catalogIds);
    }
    expect([...EXECUTED_IDS].sort(), 'executed ids equal catalog ids').toEqual([...catalogIds].sort());

    // Deep-equal AND byte-equal repeats.
    const baseline = JSON.stringify(passes[0]);
    expect(JSON.stringify(passes[1]), 'second pass byte-equals the first').toBe(baseline);
    expect(JSON.stringify(passes[2]), 'third pass byte-equals the first').toBe(baseline);
    expect(passes[1], 'second pass deep-equals the first').toEqual(passes[0]);
    expect(passes[2], 'third pass deep-equals the first').toEqual(passes[0]);

    // Sentinel sweep over EVERY produced string of EVERY pass.
    const produced: string[] = [];
    for (const pass of passes) collectStrings(pass, produced);
    expect(produced.length, 'the matrix produces strings to sweep').toBeGreaterThan(100);
    for (const value of produced) {
      for (const sentinel of CREDENTIAL_LIKE_SENTINELS) {
        expect(
          value.includes(sentinel),
          `produced string contains credential-like sentinel "${sentinel}": ${value.slice(0, 160)}`,
        ).toBe(false);
      }
    }
  });
});
