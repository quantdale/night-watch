// ---------------------------------------------------------------------------
// Phase 15P (A11) — converged durable-artifact validation facade.
//
// Per-kind ACCEPT matrices built from the real producers (never hand-faked
// "valid" artifacts), per-kind MALFORMED/CONTRADICTORY rejection matrices,
// unknown-kind fail-closed behavior, read-only guarantees, and determinism.
// Synthetic fake values only; no credentials, customer data, network, or
// real environments.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  ARTIFACT_KIND_VERSION_ACCEPTANCE,
  KNOWN_ARTIFACT_KINDS,
  isReplayResultEnvelopeKindRegistered,
  validateArtifact,
} from '../../src/core/artifactValidation';
import {
  ANOMALY_CLUSTER_VERSION,
  DOSSIER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  PASSIVE_MINIMIZATION_SAFETY,
  SYNTHETIC_MINIMIZATION_BUDGET,
  clusterAnomalies,
  compareBrowserAndApi,
  correlateSourceChanges,
  createBugDossier,
  createIncompleteDossier,
  localizeFaultBoundary,
  minimizeFailure,
  rankConfidence,
  rankTriagePriority,
  type MinimizationResult,
} from '../../src/core/triage';
import { initialLifecycleRecord } from '../../src/core/campaign/candidateLifecycle';
import { sanitizeAnomalyObservation } from '../../src/core/triage/clustering';
import { createBugDossierV2 } from '../../src/core/triage/dossierV2';
import { createTriageReplayPlan, createTriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import { buildSemanticEvaluationReceipt, SEMANTIC_EVALUATION_RECEIPT_VERSION_V1 } from '../../src/oracles/semantic/receipts';
import { buildCampaignMorningBrief } from '../../src/core/campaign/brief';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  CAMPAIGN_SCHEMA_VERSION,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  ZERO_CAMPAIGN_PRIVACY,
  ZERO_CAMPAIGN_SAFETY,
  createCampaignManifest,
  prepareCampaign,
  type CampaignBudgetPolicy,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
} from '../../src/core/campaign';
import { PrivateArtifactStore } from '../../src/core/policy';
import { createSemanticCampaignBundle } from '../../src/core/source/semanticCampaignBundle';
import { buildContractCoverageReport } from '../../src/oracles/expectations/extract/contractCoverageReport';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION } from '../../src/core/changeIntelligence';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from '../../src/products/ripple/explorationCatalog';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { OWNER_SCOPE_POLICY_VERSION, PRIVATE_ARTIFACT_POLICY_VERSION } from '../../src/core/policy';
import { EXPECTED_FROZEN_OPERATION_COUNT, summarizeLocalReadiness } from '../../src/core/readiness/localReadiness';

// ---------------------------------------------------------------------------
// Synthetic fixtures (fake values only).
// ---------------------------------------------------------------------------

const STATIC_NOW = '2026-08-13T01:00:00.000Z';
const SEEDS = ['0x0000000000000101', '0x0000000000000201', '0x0000000000000301'] as const;
const FP = 'fp:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** JSON round-trip into a plain mutable record for mutation matrices. */
function toRecord(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) deepFreeze((value as Record<string, unknown>)[key]);
    Object.freeze(value);
  }
  return value;
}

function observation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    runId: 'run-1',
    observedAt: '2026-08-13T00:00:00.000Z',
    fingerprint: FP,
    features: {
      journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', oracleId: 'oracle.protocol', routeClass: '/ripple/exchange', operationFamily: 'payer-exchange', statusClass: '5xx', contentTypeClass: 'json', runtimeCategory: 'product', structuralState: 'table-missing', failureActionId: 'p4.j1.read', sourceImpactRegion: 'ripple-ui:exchange', browserApiResultClass: 'same',
    },
    timingClass: 'NONE',
    reproduced: true,
    minimized: true,
    sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
    ...overrides,
  };
}

function replayPlanBase() {
  return {
    candidateKind: 'JOURNEY' as const,
    anomalyFingerprint: FP,
    originalActionIds: ['a1', 'a2'],
    retainedActionIds: ['a1'],
    phase: 'REDUCED_CANDIDATE' as const,
    targetId: 'ripple-payer-exchange-read',
    contractVersion: 'synthetic.contract.v1',
    contractDigest: `sha256:${'b'.repeat(64)}`,
    catalogVersion: 'synthetic.catalog.v1',
    sourceVersion: 'synthetic.source.v1',
    routeClass: '/ripple/exchange',
  };
}

function semanticReceipt() {
  return buildSemanticEvaluationReceipt({
    oracleId: 'oracle.protocol',
    outcome: 'ANOMALY',
    expectationId: 'exp:ripple.payer-exchange.v1',
    projectionDigests: [`proj:sha256:${'c'.repeat(24)}`],
    invariantTotal: 2,
    invariantPassCount: 1,
    invariantNaCount: 0,
    invariantViolationCount: 1,
    findingCount: 1,
    journeyId: 'ripple-payer-exchange-read',
    stepId: 'p4.j1.read',
  });
}

/** Re-seal a receipt body with the documented deterministic id derivation. */
function sealReceipt(body: Record<string, unknown>): Record<string, unknown> {
  const canonical = JSON.stringify(body, Object.keys(body).sort());
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 24);
  return { ...body, receiptId: `receipt:sha256:${digest}` };
}

async function runMinimizer(sequence: readonly string[], failedId: string): Promise<MinimizationResult> {
  return minimizeFailure({
    originalSequence: sequence.map((id) => ({ actionId: id, semanticClass: 'KNOWN_READ' as const, routeClass: '/ripple/exchange', sourceApproved: true as const, catalogVersion: 'synthetic.catalog.v1' })),
    anomalyFingerprint: FP,
    sourceVersion: 'synthetic.source.v1',
    catalogVersion: 'synthetic.catalog.v1',
    approvedActionIds: new Set(sequence),
    safety: PASSIVE_MINIMIZATION_SAFETY,
    budget: SYNTHETIC_MINIMIZATION_BUDGET,
    replay: (candidate) => ({
      status: candidate.map((item) => item.actionId).includes(failedId) ? 'FAILURE' as const : 'PASS' as const,
      ...(candidate.map((item) => item.actionId).includes(failedId) ? { anomalyFingerprint: FP } : {}),
      safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
    }),
  });
}

async function dossierInputs() {
  const minimization = await runMinimizer(['a1', 'a2', 'a3'], 'a1');
  const differential = compareBrowserAndApi(
    { failed: true, routeClass: '/ripple/exchange', structuralState: 'table-missing', operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', oracleFingerprint: FP, runtimeCategory: 'product' },
    { available: true, failed: false, operationFamily: 'payer-exchange', statusClass: '2xx', contentTypeClass: 'json', parseCategory: 'json-valid', oracleFingerprint: `fp:sha256:${'d'.repeat(24)}` },
  );
  const source = correlateSourceChanges({ journeyIds: ['ripple-payer-exchange-read'], sourceFreshness: 'LOCAL_TRACKING_REF_ONLY', changedFiles: [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }] });
  const boundary = localizeFaultBoundary({ authInvalid: false, routeDiverged: false, structuralDiverged: true, browserRuntimeFailure: false, resourceFailure: false, apiAvailable: true, apiFailed: false, apiProtocolMismatch: false, sourceCandidates: source.candidates });
  const confidence = rankConfidence({ freshContextReproductions: 2, minimalSequenceReproductions: minimization.reproductionCount, browserApiDifferential: differential.status, sourceRelevance: source.overallRelevance, oracleReliable: true, knownFalsePositive: false, safetyClean: true });
  return { minimization, differential, source, boundary, confidence };
}

async function v1Dossier() {
  const input = await dossierInputs();
  return createBugDossier({
    firstObserved: '2026-08-13T00:00:00.000Z',
    lastObserved: '2026-08-13T00:01:00.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0001'],
    routeClass: '/ripple/exchange',
    apiOperationFamily: 'payer-exchange',
    oracleFingerprint: FP,
    evidenceLevel: 'L3',
    minimization: input.minimization,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: ['auth-state-invalid'],
    missingEvidence: ['deployment identity remains unresolved'],
  });
}

async function v2Dossier() {
  const input = await dossierInputs();
  return createBugDossierV2({
    firstObserved: '2026-08-13T00:00:00.000Z',
    lastObserved: '2026-08-13T00:01:00.000Z',
    journeyIds: ['ripple-payer-exchange-read'],
    seeds: ['0x0001'],
    routeClass: '/ripple/exchange',
    apiOperationFamily: 'payer-exchange',
    oracleFingerprint: FP,
    evidenceLevel: 'L3',
    minimization: input.minimization,
    browserApiDifferential: input.differential,
    sourceCorrelation: input.source,
    likelyFaultBoundary: input.boundary,
    confidence: input.confidence,
    technicalSeverity: 'MEDIUM',
    triagePriority: rankTriagePriority({ technicalSeverity: 'MEDIUM', confidence: input.confidence.level, reproduced: true, breadth: 'NARROW', knownNightwatchDefect: false }),
    knownNightwatchDefect: null,
    alternativesRuledOut: [],
    missingEvidence: [],
    semanticTriageEvidence: null,
  });
}

function incompleteDossier() {
  return createIncompleteDossier({ anomalyFingerprint: FP, journeyOrApiFamily: 'ripple-payer-exchange-read', missingSections: ['reproduction', 'minimization'] });
}

function sourceBundle() {
  return createSemanticCampaignBundle({
    sourceRepoId: 'mobingilabs/ripple-ui',
    sourceBranchRef: 'main',
    freshnessApprovedSourceSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
    expectationId: 'exp:ripple.payer-exchange.v1',
    targetId: 'ripple-payer-exchange-read',
    sourceEvidenceDigest: `ev:sha256:${'e'.repeat(24)}`,
    sourceDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
    collectionAdmissionVersion: 'nightwatch.collection-admission.private.v1',
    resolverState: 'RESOLVED',
    devReachability: 'LOCAL_ONLY',
    approvedMapping: {
      journeyOrOperationId: 'ripple-payer-exchange-read',
      targetId: 'ripple-payer-exchange-read',
      expectationId: 'exp:ripple.payer-exchange.v1',
      expectationClass: 'HISTORICAL',
      browserObservationAvailable: true,
      apiObservationAvailable: true,
    },
  });
}

function coverageInventory() {
  return {
    remoteSha: null,
    snapshotSha: null,
    snapshotMatchesRemote: true,
    canonicalUnchanged: true,
    entries: [
      {
        targetId: 'ripple-payer-exchange-read', approvedReadOnly: true, devReachable: false,
        observerClass: 'JSON_SINGLE_BROWSER_API' as const, recipeId: null, recipeVersion: null,
        historicalExpectationId: 'exp:ripple.payer-exchange.v1', collectionExpectationId: null,
        sourceRepo: null, sourcePath: null, sourceSymbol: null, sourceSha: null,
        evidenceDigest: `ev:sha256:${'f'.repeat(24)}`, depthClass: 'SHAPE' as const,
        disposition: 'APPROVED_AND_ADMITTED' as const, blockerCode: null, analyzerProbe: null,
        resolverState: 'RESOLVED' as const, currentness: 'CURRENT' as const,
      },
      {
        targetId: 'ripple-account-inventory', approvedReadOnly: true, devReachable: false,
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

// --- campaign manifest/checkpoint/brief scaffolding (mirrors the S2 compat suite) ---

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
  nightwatchSourceSha: 'synthetic-phase15p-a11-source.v1',
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
  triageReplayPlanVersion: 'nightwatch.triage-replay-plan.private.v1',
  triageReplayPlanV2Version: 'nightwatch.triage-replay-plan.private.v2',
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: 'nightwatch.bug-dossier.private.v2',
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: 'nightwatch.semantic-campaign-bundle.private.v1',
  semanticReceiptVersion: 'nightwatch.semantic-evaluation-receipt.v2',
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
    freshness: 'LOCAL_TRACKING_REF_ONLY' as const,
    readOnly: true as const,
  }));
}

function campaignInput(): CampaignInput {
  return {
    mode: 'BASELINE_HEALTH',
    createdAt: STATIC_NOW,
    sourceSnapshots: snapshots(),
    sourceWindow: {
      changesetId: 'cs-empty-phase15p-a11',
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

interface PreparedFixture {
  readonly root: string;
  readonly manifest: CampaignManifest;
  readonly checkpoint: Record<string, unknown>;
}

function preparedFixture(): PreparedFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase15p-a11-'));
  const store = new PrivateArtifactStore({ root });
  const manifest = createCampaignManifest(campaignInput());
  const checkpoint = toRecord(prepareCampaign(manifest, { store, now: () => new Date(STATIC_NOW) }));
  return { root, manifest, checkpoint };
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Facade surface
// ---------------------------------------------------------------------------

test.describe('Phase 15P A11 artifact validation facade surface', () => {
  test('exposes exactly the converged kind set with documented version acceptance', () => {
    // Phase 15H hardening: the A11 round-2 mass implementation converged four
    // additional durable kinds onto the facade; this pin reflects the full
    // 14-kind registry (each kind has a static dispatch entry plus a
    // documented version acceptance in ARTIFACT_KIND_VERSION_ACCEPTANCE).
    expect(KNOWN_ARTIFACT_KINDS).toEqual([
      'campaign-checkpoint', 'observation', 'semantic-receipt', 'replay-plan', 'cluster',
      'reproduction-record', 'dossier', 'morning-brief', 'source-bundle', 'coverage-report',
      'candidate-record', 'replay-record', 'minimization-record', 'project-health-report',
    ]);
    for (const kind of KNOWN_ARTIFACT_KINDS) {
      expect(ARTIFACT_KIND_VERSION_ACCEPTANCE[kind]!.length, kind).toBeGreaterThan(0);
    }
  });

  test('unknown and non-string kinds fail closed', () => {
    for (const kind of ['dossier-v3', 'nope', '', 'COVERAGE', 'observation ', 123, null, undefined]) {
      const result = validateArtifact(kind as string, {});
      expect(result.valid, String(kind)).toBe(false);
      if (!result.valid) expect(result.reason, String(kind)).toBe(`ARTIFACT_KIND_UNKNOWN:${String(kind)}`);
    }
  });

  test('validation never mutates its input and is deterministic', async () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const dossier = await v1Dossier();
      const cluster = clusterAnomalies([observation() as never])[0]!;
      const frozenInputs: ReadonlyArray<readonly [string, unknown]> = [
        ['campaign-checkpoint', deepFreeze(cloneJson(checkpoint))],
        ['observation', deepFreeze(observation())],
        ['semantic-receipt', deepFreeze(cloneJson(semanticReceipt()))],
        ['replay-plan', deepFreeze(cloneJson(createTriageReplayPlan(replayPlanBase())))],
        ['cluster', deepFreeze(cloneJson(cluster))],
        ['dossier', deepFreeze(cloneJson(dossier))],
        ['source-bundle', deepFreeze(cloneJson(sourceBundle()))],
        ['coverage-report', deepFreeze(cloneJson(buildContractCoverageReport({ inventory: coverageInventory() })))],
      ];
      for (const [kind, value] of frozenInputs) {
        const snapshotBefore = JSON.stringify(value);
        const first = validateArtifact(kind, value, { manifest });
        const second = validateArtifact(kind, value, { manifest });
        expect(first.valid, `${kind}: ${!first.valid ? first.reason : ''}`).toBe(true);
        expect(second).toEqual(first);
        expect(JSON.stringify(value), kind).toBe(snapshotBefore);
      }
    } finally {
      cleanup(root);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-kind ACCEPT matrices (real producers only)
// ---------------------------------------------------------------------------

test.describe('Phase 15P A11 per-kind accept matrices', () => {
  test('campaign checkpoint (historical pre-S2 and Session-2 forms)', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      expect(validateArtifact('campaign-checkpoint', checkpoint, { manifest }).valid).toBe(true);
      const s2 = cloneJson(checkpoint) as Record<string, unknown>;
      s2.candidateLifecycles = {};
      s2.runtimeContractVersions = { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED };
      expect(validateArtifact('campaign-checkpoint', s2, { manifest }).valid).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('observations: plain and sanitized forms', () => {
    const plain = observation();
    expect(validateArtifact('observation', plain).valid).toBe(true);
    const sanitized = sanitizeAnomalyObservation(plain as never);
    expect(validateArtifact('observation', cloneJson(sanitized)).valid).toBe(true);
    // Transient class and known false-positive annotations stay acceptable.
    expect(validateArtifact('observation', observation({ runId: 'run-2', timingClass: 'TRANSIENT', knownFalsePositiveId: 'NW-CANCELED-BY-POLICY' })).valid).toBe(true);
  });

  test('semantic receipts: v2 built and v1 sealed bodies', () => {
    expect(validateArtifact('semantic-receipt', cloneJson(semanticReceipt())).valid).toBe(true);
    const v1Body = toRecord(semanticReceipt());
    delete v1Body.receiptId;
    v1Body.schemaVersion = SEMANTIC_EVALUATION_RECEIPT_VERSION_V1;
    expect(validateArtifact('semantic-receipt', sealReceipt(v1Body)).valid).toBe(true);
    const passing = buildSemanticEvaluationReceipt({ oracleId: 'oracle.journey', outcome: 'PASS', invariantTotal: 1, invariantPassCount: 1, invariantNaCount: 0, invariantViolationCount: 0, findingCount: 0 });
    expect(validateArtifact('semantic-receipt', cloneJson(passing)).valid).toBe(true);
  });

  test('replay plans: v1 reduced and v2 occurrence forms', () => {
    const v1 = createTriageReplayPlan(replayPlanBase());
    expect(validateArtifact('replay-plan', cloneJson(v1)).valid).toBe(true);
    const base = replayPlanBase();
    const v2 = createTriageReplayPlanV2({
      candidateKind: base.candidateKind,
      anomalyFingerprint: base.anomalyFingerprint,
      phase: base.phase,
      targetId: base.targetId,
      contractVersion: base.contractVersion,
      contractDigest: base.contractDigest,
      catalogVersion: base.catalogVersion,
      sourceVersion: base.sourceVersion,
      routeClass: base.routeClass,
      originalOccurrences: [{ ordinal: 0, expectedActionId: 'a1' }, { ordinal: 1, expectedActionId: 'a2' }],
      retainedOccurrenceOrdinals: [0],
    });
    expect(validateArtifact('replay-plan', cloneJson(v2)).valid).toBe(true);
    const v2Exact = createTriageReplayPlanV2({
      candidateKind: base.candidateKind,
      anomalyFingerprint: base.anomalyFingerprint,
      phase: 'FRESH_EXACT_REPLAY',
      targetId: base.targetId,
      contractVersion: base.contractVersion,
      contractDigest: base.contractDigest,
      catalogVersion: base.catalogVersion,
      sourceVersion: base.sourceVersion,
      routeClass: base.routeClass,
      originalOccurrences: [{ ordinal: 0, expectedActionId: 'a1' }],
      retainedOccurrenceOrdinals: [0],
    });
    expect(validateArtifact('replay-plan', cloneJson(v2Exact)).valid).toBe(true);
  });

  test('clusters produced by the real clustering engine', () => {
    const clusters = clusterAnomalies([
      observation() as never,
      observation({ runId: 'run-2', observedAt: '2026-08-13T00:05:00.000Z' }) as never,
      observation({ runId: 'run-3', fingerprint: `fp:sha256:${'1'.repeat(24)}`, timingClass: 'TRANSIENT' }) as never,
    ]);
    expect(clusters.length).toBe(2);
    for (const cluster of clusters) {
      expect(validateArtifact('cluster', cloneJson(cluster)).valid).toBe(true);
    }
  });

  test('reproduction records: standalone and ledger-bound', () => {
    const record = {
      clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      representativeRunId: 'run-1',
      state: 'COMPLETED',
      result: 'REPRODUCED',
      admissionLevel: 'L2',
      reasonCode: null,
      runId: 'run-1',
      safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
      privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
    };
    expect(validateArtifact('reproduction-record', cloneJson(record)).valid).toBe(true);
    expect(validateArtifact('reproduction-record', cloneJson(record), { knownClusterIds: [record.clusterId], knownObservationRunIds: ['run-1'] }).valid).toBe(true);
    const pending = { ...cloneJson(record), state: 'PENDING', result: null };
    expect(validateArtifact('reproduction-record', pending).valid).toBe(true);
  });

  test('dossiers: v1 READY, v1 INCOMPLETE stub, and v2', async () => {
    expect(validateArtifact('dossier', cloneJson(await v1Dossier())).valid).toBe(true);
    expect(validateArtifact('dossier', cloneJson(incompleteDossier())).valid).toBe(true);
    expect(validateArtifact('dossier', cloneJson(await v2Dossier())).valid).toBe(true);
  });

  test('morning brief built by the real producer', async () => {
    const { root, manifest } = preparedFixture();
    try {
      const dossier = await v1Dossier();
      const clusters = clusterAnomalies([observation() as never]);
      const brief = buildCampaignMorningBrief({
        manifest,
        resultClass: 'COMPLETE_WITH_FINDINGS',
        runs: [{ runId: 'run-1', journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', seed: '0x0001', result: 'ANOMALY', reproduced: true, safety: dossier.safety }],
        clusters,
        dossiers: [dossier],
        coverageGaps: [],
        reproductionQueue: [],
        safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
        privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
        nightwatchInternalIssues: [],
        transientsAndNonFindings: [],
      });
      expect(validateArtifact('morning-brief', cloneJson(brief)).valid).toBe(true);
    } finally {
      cleanup(root);
    }
  });

  test('semantic source bundle and contract coverage report', () => {
    expect(validateArtifact('source-bundle', cloneJson(sourceBundle())).valid).toBe(true);
    expect(validateArtifact('coverage-report', cloneJson(buildContractCoverageReport({ inventory: coverageInventory() }))).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Per-kind rejection matrices
// ---------------------------------------------------------------------------

function expectRejected(kind: string, value: unknown, reasonFragment: RegExp | string, context?: Parameters<typeof validateArtifact>[2]): void {
  const result = validateArtifact(kind, value, context);
  expect(result.valid, `${kind} should reject: ${JSON.stringify(value)?.slice(0, 200)}`).toBe(false);
  if (!result.valid) {
    if (reasonFragment instanceof RegExp) expect(result.reason, kind).toMatch(reasonFragment);
    else expect(result.reason, kind).toContain(reasonFragment);
  }
}

test.describe('Phase 15P A11 malformed-input rejection matrices', () => {
  test('truncated shapes are rejected for every kind', () => {
    const truncated: unknown[] = [null, undefined, 42, 'x', [], true];
    for (const kind of KNOWN_ARTIFACT_KINDS) {
      for (const value of truncated) {
        const result = validateArtifact(kind, value, { manifest: undefined });
        expect(result.valid, `${kind}/${String(value)}`).toBe(false);
      }
    }
  });

  test('campaign checkpoint: identity drift, unknown fields, and missing context', () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      expectRejected('campaign-checkpoint', cloneJson(checkpoint), 'ARTIFACT_CONTEXT_MISSING');
      const drifted = cloneJson(checkpoint) as Record<string, unknown>;
      drifted.campaignId = 'campaign:sha256:tampered0000000000';
      expectRejected('campaign-checkpoint', drifted, 'CAMPAIGN_ID_MISMATCH', { manifest });
      const extraField = cloneJson(checkpoint) as Record<string, unknown>;
      extraField.futureField = true;
      expectRejected('campaign-checkpoint', extraField, 'UNKNOWN_FIELD:futureField', { manifest });
      const overBudget = cloneJson(checkpoint) as Record<string, unknown>;
      (overBudget.budgetUsed as Record<string, unknown>).browserContexts = 99;
      expectRejected('campaign-checkpoint', overBudget, /EXCEEDS_POLICY|BUDGET_ARITHMETIC/, { manifest });
    } finally {
      cleanup(root);
    }
  });

  test('observations: shapes, unsafe values, and tampered cluster keys', () => {
    expectRejected('observation', {}, 'MISSING_FIELD:runId');
    expectRejected('observation', observation({ fingerprint: 123 }), 'FINGERPRINT:STRING_REQUIRED');
    expectRejected('observation', observation({ timingClass: 'SOMETIMES' }), 'TIMING_CLASS');
    expectRejected('observation', observation({ sourceFreshness: 'REMOTE_TRUSTED' }), 'SOURCE_FRESHNESS');
    const missingFeature = observation();
    delete (missingFeature.features as Record<string, unknown>).statusClass;
    expectRejected('observation', missingFeature, 'MISSING_FIELD:statusClass');
    expectRejected('observation', observation({ fingerprint: 'fp:sha256:nothex' }), 'CLUSTER_FINGERPRINT_INVALID');
    expectRejected('observation', observation({ extra: 1 }), 'UNKNOWN_FIELD:extra');
    const tamperedKey = toRecord(sanitizeAnomalyObservation(observation() as never));
    tamperedKey.clusterKey = 'cluster-key:sha256:aaaaaaaaaaaaaaaaaaaaaaaa';
    expectRejected('observation', tamperedKey, 'CLUSTER_KEY_MISMATCH');
  });

  test('semantic receipts: coherence rules and id recomposition', () => {
    expectRejected('semantic-receipt', { schemaVersion: 'nightwatch.semantic-evaluation-receipt.v9' }, 'SCHEMA_VERSION_UNSUPPORTED');
    const wrongSum = toRecord(semanticReceipt());
    wrongSum.invariantPassCount = 5;
    expectRejected('semantic-receipt', wrongSum, 'count-sum');
    const quietAnomaly = toRecord(semanticReceipt());
    quietAnomaly.findingCount = 0;
    expectRejected('semantic-receipt', quietAnomaly, 'anomaly-without-finding');
    const violationsWithoutAnomaly = toRecord(semanticReceipt());
    violationsWithoutAnomaly.outcome = 'PASS';
    expectRejected('semantic-receipt', violationsWithoutAnomaly, 'violations-without-anomaly');
    const unknownField = toRecord(semanticReceipt());
    unknownField.rawBody = 'CUSTOMER_SENTINEL';
    expectRejected('semantic-receipt', unknownField, 'unknown-field:rawBody');
    const tamperedId = toRecord(semanticReceipt());
    tamperedId.receiptId = 'receipt:sha256:bbbbbbbbbbbbbbbbbbbbbbbb';
    expectRejected('semantic-receipt', tamperedId, 'RECEIPT_ID_MISMATCH');
    // A v1 body carrying Phase-11 coverage fields is rejected by the module
    // validator even when the id is correctly sealed and the coverage fields
    // are internally coherent for a v2 body.
    const v1BodyWithCoverage = sealReceipt({
      ...(toRecord(semanticReceipt())),
      schemaVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION_V1,
      coverageState: 'FULLY_EVALUATED_PASS',
      inspectedItemCount: 1,
      violatingItemCount: 0,
    });
    expectRejected('semantic-receipt', v1BodyWithCoverage, 'v1-coverage-fields');
  });

  test('replay plans: versions, subsequences, cardinality, and freshness coherence', () => {
    expectRejected('replay-plan', { schemaVersion: 'nightwatch.triage-replay-plan.private.v3' }, 'SCHEMA_VERSION_UNSUPPORTED');
    const notSubsequence = toRecord(createTriageReplayPlan(replayPlanBase()));
    notSubsequence.retainedActionIds = ['a2', 'a1'];
    expectRejected('replay-plan', notSubsequence, 'REPLAY_PLAN_NOT_SUBSEQUENCE');
    const unknownField = toRecord(createTriageReplayPlan(replayPlanBase()));
    unknownField.selectors = ['#table'];
    expectRejected('replay-plan', unknownField, 'REPLAY_PLAN_UNKNOWN_FIELD:selectors');
    const apiCardinality = toRecord(createTriageReplayPlan(replayPlanBase()));
    apiCardinality.candidateKind = 'API';
    expectRejected('replay-plan', apiCardinality, 'API_ORIGINAL_MUST_BE_SINGLE');
    const freshMismatch = toRecord(createTriageReplayPlanV2({
      ...replayPlanBase(),
      originalOccurrences: [{ ordinal: 0, expectedActionId: 'a1' }, { ordinal: 1, expectedActionId: 'a2' }],
      retainedOccurrenceOrdinals: [0],
    }));
    freshMismatch.phase = 'FRESH_EXACT_REPLAY';
    expectRejected('replay-plan', freshMismatch, 'FRESH_EXACT_MUST_MATCH_ORIGINAL_OCCURRENCES');
    const unknownOrdinal = toRecord(createTriageReplayPlanV2({
      ...replayPlanBase(),
      originalOccurrences: [{ ordinal: 0, expectedActionId: 'a1' }],
      retainedOccurrenceOrdinals: [0],
    }));
    unknownOrdinal.retainedOccurrenceOrdinals = [7];
    expectRejected('replay-plan', unknownOrdinal, 'REPLAY_PLAN_V2_UNKNOWN_ORDINAL');
  });

  test('clusters: identity recomposition and cross-field contradictions', () => {
    const cluster = toRecord(clusterAnomalies([observation() as never])[0]!);
    expectRejected('cluster', {}, 'MISSING_FIELD:clusterId');
    const tamperedKey = cloneJson(cluster);
    tamperedKey.clusterKey = 'cluster-key:sha256:cccccccccccccccccccccccc';
    expectRejected('cluster', tamperedKey, 'CLUSTER_KEY_MISMATCH');
    const tamperedId = cloneJson(cluster);
    tamperedId.clusterId = 'cluster:sha256:dddddddddddddddddddddddd';
    expectRejected('cluster', tamperedId, 'CLUSTER_ID_MISMATCH');
    const inflated = cloneJson(cluster);
    inflated.reproductionCount = (inflated.occurrenceCount as number) + 1;
    expectRejected('cluster', inflated, 'REPRODUCTIONS_EXCEED_OCCURRENCES');
    const outsiderPrimary = cloneJson(cluster);
    outsiderPrimary.primaryRunId = 'run-not-in-cluster';
    expectRejected('cluster', outsiderPrimary, 'PRIMARY_RUN_NOT_IN_CLUSTER');
    const countMismatch = cloneJson(cluster);
    countMismatch.occurrenceCount = (countMismatch.occurrenceCount as number) + 1;
    expectRejected('cluster', countMismatch, 'OCCURRENCE_COUNT_MISMATCH');
    const reversedWindow = cloneJson(cluster);
    reversedWindow.firstObserved = '2026-08-14T00:00:00.000Z';
    reversedWindow.lastObserved = '2026-08-13T00:00:00.000Z';
    expectRejected('cluster', reversedWindow, 'OBSERVATION_WINDOW_REVERSED');
    const extraField = cloneJson(cluster);
    extraField.rawValues = [];
    expectRejected('cluster', extraField, 'UNKNOWN_FIELD:rawValues');
  });

  test('reproduction records: state/result coherence, privacy counters, referential context', () => {
    const record = {
      clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      representativeRunId: 'run-1',
      state: 'COMPLETED',
      result: 'REPRODUCED',
      admissionLevel: 'L2',
      reasonCode: null,
      runId: 'run-1',
      safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
      privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
    };
    const pendingWithResult = { ...cloneJson(record), state: 'PENDING', result: 'REPRODUCED' };
    expectRejected('reproduction-record', pendingWithResult, 'UNFINISHED_STATE_WITH_RESULT');
    const completedWithoutResult = { ...cloneJson(record), result: null };
    expectRejected('reproduction-record', completedWithoutResult, 'COMPLETED_WITHOUT_RESULT');
    const dirtyPrivacy = cloneJson(record) as Record<string, unknown>;
    (dirtyPrivacy.privacy as Record<string, unknown>).cookiesPersisted = 1;
    expectRejected('reproduction-record', dirtyPrivacy, 'PRIVACY_PASS_WITH_PERSISTED_COUNTERS');
    const badAdmission = { ...cloneJson(record), admissionLevel: 'L9' };
    expectRejected('reproduction-record', badAdmission, 'ADMISSION_LEVEL:ENUM_INVALID');
    const extraField = { ...cloneJson(record), replayScript: 'rm -rf /' };
    expectRejected('reproduction-record', extraField, 'UNKNOWN_FIELD:replayScript');
    expectRejected('reproduction-record', cloneJson(record), 'UNKNOWN_CLUSTER:', { knownClusterIds: ['cluster:sha256:000000000000000000000000'] });
    expectRejected('reproduction-record', cloneJson(record), 'UNKNOWN_REPRESENTATIVE_OBSERVATION:', { knownObservationRunIds: ['other-run'] });
  });

  test('dossiers: version dispatch, exact keys, scope, and stub coherence', async () => {
    const dossier = toRecord(await v1Dossier());
    expectRejected('dossier', { schemaVersion: 'nightwatch.bug-dossier.private.v3', status: 'READY' }, 'SCHEMA_VERSION_UNSUPPORTED');
    const extraField = cloneJson(dossier) as Record<string, unknown>;
    extraField.deploymentClaim = 'prod-fixed';
    expectRejected('dossier', extraField, 'UNKNOWN_FIELD:deploymentClaim');
    const l4 = cloneJson(dossier) as Record<string, unknown>;
    l4.evidenceLevel = 'L4';
    expectRejected('dossier', l4, 'DOSSIER_DATASTORE_SCOPE_INVALID');
    const dirtySafety = cloneJson(dossier) as Record<string, unknown>;
    (dirtySafety.safety as Record<string, unknown>).databaseQueries = 2;
    expectRejected('dossier', dirtySafety, 'DOSSIER_SAFETY_NOT_CLEAN');

    const stub = toRecord(incompleteDossier());
    expectRejected('dossier', { ...stub, missingSections: ['b', 'a'] }, 'MISSING_SECTIONS_NOT_SORTED');
    expectRejected('dossier', { ...stub, privacy: { result: 'PASS', confirmed: true } }, 'INCOMPLETE_PRIVACY_STUB');
    expectRejected('dossier', { ...stub, extra: 1 }, 'UNKNOWN_FIELD:extra');

    const v2 = toRecord(await v2Dossier());
    v2.unvalidatedClaim = 'root cause found';
    expectRejected('dossier', v2, 'DOSSIER_V2_UNKNOWN_FIELD:unvalidatedClaim');
  });

  test('morning brief: publication lock, privacy coherence, and identity binding', async () => {
    const { root, manifest } = preparedFixture();
    try {
      const dossier = await v1Dossier();
      const brief = buildCampaignMorningBrief({
        manifest,
        resultClass: 'COMPLETE_WITH_FINDINGS',
        runs: [],
        clusters: [],
        dossiers: [dossier],
        coverageGaps: [],
        reproductionQueue: [],
        safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
        privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
        nightwatchInternalIssues: [],
        transientsAndNonFindings: [],
      }) as unknown as Record<string, unknown>;
      expectRejected('morning-brief', { ...cloneJson(brief), externalPublication: 'ALLOWED' }, 'PUBLICATION_INVALID');
      const dirtyPrivacy = cloneJson(brief) as Record<string, unknown>;
      (dirtyPrivacy.privacy as Record<string, unknown>).domPersisted = 1;
      expectRejected('morning-brief', dirtyPrivacy, 'PRIVACY_MISMATCH');
      const idMismatch = cloneJson(brief) as Record<string, unknown>;
      (idMismatch.campaign as Record<string, unknown>).campaignId = 'campaign:sha256:othercampaign00000';
      expectRejected('morning-brief', idMismatch, 'ID_MISMATCH');
      const scopeDrift = cloneJson(brief) as Record<string, unknown>;
      (scopeDrift.campaign as Record<string, unknown>).datastoreStatus = 'QUERIED';
      expectRejected('morning-brief', scopeDrift, 'SCOPE_INVALID');
      const extraField = cloneJson(brief) as Record<string, unknown>;
      extraField.deploymentStatus = 'DEPLOYED';
      expectRejected('morning-brief', extraField, 'UNKNOWN_FIELD:deploymentStatus');
    } finally {
      cleanup(root);
    }
  });

  test('source bundles: frozen deployment truth, identity, and mapping coherence', () => {
    const bundle = toRecord(sourceBundle());
    expectRejected('source-bundle', { ...bundle, resolverState: 'RESOLVED_FUTURE' }, 'RESOLVER_STATE_INVALID');
    expectRejected('source-bundle', { ...bundle, deploymentStatusUnresolved: false }, 'DEPLOYMENT_STATUS_MUST_BE_UNRESOLVED');
    expectRejected('source-bundle', { ...bundle, freshnessApprovedSourceSha: 'not-a-sha' }, 'SOURCE_SHA_INVALID');
    const tamperedId = { ...bundle, bundleId: 'scb:sha256:eeeeeeeeeeeeeeeeeeeeeeee' };
    expectRejected('source-bundle', tamperedId, 'SEMANTIC_BUNDLE_ID_MISMATCH');
    const incoherentMapping = cloneJson(bundle) as Record<string, unknown>;
    incoherentMapping.targetId = 'ripple-account-inventory';
    expectRejected('source-bundle', incoherentMapping, 'TARGET_MAPPING_COHERENCE_MISMATCH');
    const extraField = cloneJson(bundle) as Record<string, unknown>;
    extraField.deployedSha = 'abcdefabcdefabcdefabcdefabcdefabcdefabcd';
    expectRejected('source-bundle', extraField, 'UNKNOWN_FIELD:deployedSha');
  });

  test('coverage reports: digest recomposition and count coherence', () => {
    const report = toRecord(buildContractCoverageReport({ inventory: coverageInventory() }));
    expectRejected('coverage-report', { ...report, reportVersion: 'nightwatch.contract-coverage-report.v2' }, 'REPORT_VERSION');
    expectRejected('coverage-report', { ...report, privacySafe: false }, 'PRIVACY_SAFE_MUST_BE_TRUE');
    const tamperedDigest = { ...report, digest: `ev:sha256:${'0'.repeat(24)}` };
    expectRejected('coverage-report', tamperedDigest, 'DIGEST_MISMATCH');
    const countMismatch = cloneJson(report) as Record<string, unknown>;
    countMismatch.approvedTargetCount = 7;
    expectRejected('coverage-report', countMismatch, 'APPROVED_TARGET_COUNT_MISMATCH');
    const badProofBucket = cloneJson(report) as Record<string, unknown>;
    badProofBucket.proofClasses = { SOME_PROOF: { proven: 1 } };
    expectRejected('coverage-report', badProofBucket, /PROOF_CLASS:SOME_PROOF:(MISSING_FIELD|UNKNOWN_FIELD)/);
    const negativeCount = cloneJson(report) as Record<string, unknown>;
    negativeCount.depthUpliftedSinceBaseline = -1;
    expectRejected('coverage-report', negativeCount, 'depthUpliftedSinceBaseline');
    const extraField = cloneJson(report) as Record<string, unknown>;
    extraField.deploymentStatus = 'DEPLOYED';
    expectRejected('coverage-report', extraField, 'UNKNOWN_FIELD:deploymentStatus');
  });
});

// ---------------------------------------------------------------------------
// Facade-wide bounded mutation audit (Durable Artifact + Control Center
// Truth Hardening M3). Every static registry kind gets a producer-shaped
// positive control and mutations at its first nested authority-bearing
// boundary. The reserved envelope seam is audited separately because it is
// intentionally outside KNOWN_ARTIFACT_KINDS.
// ---------------------------------------------------------------------------

type FacadeAuditContext = Parameters<typeof validateArtifact>[2];
type FacadeMutation = Readonly<{
  id: string;
  mutate: (value: Record<string, unknown>) => void;
}>;

type FacadeAuditEntry = Readonly<{
  kind: string;
  value: unknown;
  context?: FacadeAuditContext;
  mutations: readonly FacadeMutation[];
}>;

function readinessSummaryFixture() {
  return summarizeLocalReadiness({
    applies: true,
    sourceContracts: {
      approvedTargetIds: ['x.a.read'],
      families: [{
        familyId: 'lifecycle:x.a.read.deep',
        targetId: 'x.a.read',
        kind: 'DEEP_TYPE',
        hasExpectationId: true,
        campaignEligible: true,
        historicalImmutable: false,
      }],
      currentnessByTargetId: { 'x.a.read': 'CURRENT' },
    },
    campaign: {
      pinnedVersions: { schemaV: 'nightwatch.schema.v1' },
      observedVersions: { schemaV: 'nightwatch.schema.v1' },
    },
    checkpointCompatibility: 'CURRENT_SCHEMA',
    unresolvedBlockers: [],
    externalCi: 'PASS',
    ownerScope: {
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      frozenOperationCount: EXPECTED_FROZEN_OPERATION_COUNT,
    },
  });
}

function candidateRecordFixture() {
  return {
    schemaVersion: 'nightwatch.campaign-candidate-record.private.v1',
    candidateId: `candidate:sha256:${'1'.repeat(24)}`,
    clusterId: null,
    lifecycle: initialLifecycleRecord('PROTOCOL_ONLY'),
  };
}

function reproductionRecordFixture() {
  return {
    clusterId: 'cluster:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
    representativeRunId: 'run-1',
    state: 'COMPLETED',
    result: 'REPRODUCED',
    admissionLevel: 'L2',
    reasonCode: null,
    runId: 'run-1',
    safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
    privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
  };
}

function facadeMutation(id: string, mutate: (value: Record<string, unknown>) => void): FacadeMutation {
  return { id, mutate };
}

test.describe('Durable Artifact + Control Center Truth Hardening M3 facade audit', () => {
  test('every registered kind has a canonical fixture and bounded nested mutation disposition', async () => {
    const { root, manifest, checkpoint } = preparedFixture();
    try {
      const dossier = await v1Dossier();
      const cluster = clusterAnomalies([observation() as never])[0]!;
      const receipt = semanticReceipt();
      const replayPlan = createTriageReplayPlan(replayPlanBase());
      const reproduction = reproductionRecordFixture();
      const minimization = await runMinimizer(['a1', 'a2', 'a3'], 'a1');
      const coverage = buildContractCoverageReport({ inventory: coverageInventory() });
      const health = readinessSummaryFixture();
      const brief = buildCampaignMorningBrief({
        manifest,
        resultClass: 'COMPLETE_WITH_FINDINGS',
        runs: [{ runId: 'run-1', journeyId: 'ripple-payer-exchange-read', envelopeId: 'E1-J1', seed: '0x0001', result: 'ANOMALY', reproduced: true, safety: dossier.safety }],
        clusters: [cluster],
        dossiers: [dossier],
        coverageGaps: [],
        reproductionQueue: [],
        safety: cloneJson(ZERO_CAMPAIGN_SAFETY),
        privacy: cloneJson(ZERO_CAMPAIGN_PRIVACY),
        nightwatchInternalIssues: [],
        transientsAndNonFindings: [],
      });

      const entries: readonly FacadeAuditEntry[] = [
        {
          kind: 'campaign-checkpoint',
          value: checkpoint,
          context: { manifest },
          mutations: [
            facadeMutation('nested_budget_type', (value) => { (value.budgetUsed as Record<string, unknown>).browserContexts = '1'; }),
            facadeMutation('nested_source_enum', (value) => { (value.sourceSnapshots as Array<Record<string, unknown>>)[0]!.freshness = 'INVALID'; }),
            facadeMutation('sentinel_payload', (value) => { value.campaignId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
        {
          kind: 'observation',
          value: observation(),
          mutations: [
            facadeMutation('nested_feature_type', (value) => { (value.features as Record<string, unknown>).statusClass = 500; }),
            facadeMutation('nested_freshness_enum', (value) => { value.sourceFreshness = 'INVALID'; }),
            facadeMutation('sentinel_payload', (value) => { (value.features as Record<string, unknown>).statusClass = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
        {
          kind: 'semantic-receipt',
          value: receipt,
          mutations: [
            facadeMutation('nested_count_type', (value) => { value.invariantPassCount = '1'; }),
            facadeMutation('nested_outcome_enum', (value) => { value.outcome = 'INVALID'; }),
            facadeMutation('sentinel_payload', (value) => { value.oracleId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.rawBody = 'CUSTOMER_SENTINEL'; }),
          ],
        },
        {
          kind: 'replay-plan',
          value: replayPlan,
          mutations: [
            facadeMutation('nested_action_type', (value) => { value.retainedActionIds = [42]; }),
            facadeMutation('nested_phase_enum', (value) => { value.phase = 'INVALID'; }),
            facadeMutation('sentinel_payload', (value) => { value.targetId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
        {
          kind: 'cluster',
          value: cluster,
          mutations: [
            facadeMutation('nested_feature_type', (value) => { (value.features as Record<string, unknown>).statusClass = 500; }),
            facadeMutation('nested_identity_mismatch', (value) => { value.clusterKey = `cluster-key:sha256:${'0'.repeat(24)}`; }),
            facadeMutation('sentinel_payload', (value) => { value.primaryRunId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.rawValues = []; }),
          ],
        },
        {
          kind: 'reproduction-record',
          value: reproduction,
          context: { knownClusterIds: [reproduction.clusterId], knownObservationRunIds: ['run-1'] },
          mutations: [
            facadeMutation('nested_safety_type', (value) => { (value.safety as Record<string, unknown>).productionAttempts = '1'; }),
            facadeMutation('nested_state_enum', (value) => { value.state = 'INVALID'; }),
            facadeMutation('sentinel_payload', (value) => { value.clusterId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.replayScript = 'CUSTOMER_SENTINEL'; }),
          ],
        },
        {
          kind: 'dossier',
          value: dossier,
          mutations: [
            facadeMutation('nested_reproduction_count', (value) => { (value.reproduction as Record<string, unknown>).count = -1; }),
            facadeMutation('nested_recipe_type', (value) => { (value.humanReproductionRecipe as Record<string, unknown>).actionIds = 'a1'; }),
            facadeMutation('sentinel_payload', (value) => { value.title = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.deploymentClaim = 'prod-fixed'; }),
          ],
        },
        {
          kind: 'morning-brief',
          value: brief,
          mutations: [
            facadeMutation('nested_privacy_counter', (value) => { (value.privacy as Record<string, unknown>).domPersisted = 1; }),
            facadeMutation('nested_scope_enum', (value) => { (value.campaign as Record<string, unknown>).datastoreStatus = 'QUERIED'; }),
            facadeMutation('sentinel_payload', (value) => { (value.campaign as Record<string, unknown>).campaignId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.deploymentStatus = 'DEPLOYED'; }),
          ],
        },
        {
          kind: 'source-bundle',
          value: sourceBundle(),
          mutations: [
            facadeMutation('nested_mapping_identity', (value) => { (value.approvedMapping as Record<string, unknown>).targetId = 'wrong.target'; }),
            facadeMutation('nested_resolver_enum', (value) => { value.resolverState = 'RESOLVED_FUTURE'; }),
            facadeMutation('sentinel_payload', (value) => { value.sourceRepoId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.deployedSha = 'abcdef'; }),
          ],
        },
        {
          kind: 'coverage-report',
          value: coverage,
          mutations: [
            facadeMutation('nested_identity_type', (value) => { (value.normalizedEvidenceIdentities as Array<Record<string, unknown>>)[0]!.targetId = 7; }),
            facadeMutation('nested_proof_type', (value) => { value.proofClasses = []; }),
            facadeMutation('sentinel_payload', (value) => { (value.normalizedEvidenceIdentities as Array<Record<string, unknown>>)[0]!.targetId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.deploymentStatus = 'DEPLOYED'; }),
          ],
        },
        {
          kind: 'candidate-record',
          value: candidateRecordFixture(),
          mutations: [
            facadeMutation('nested_lifecycle_enum', (value) => { (value.lifecycle as Record<string, unknown>).state = 'INVALID'; }),
            facadeMutation('nested_lifecycle_unknown_field', (value) => { (value.lifecycle as Record<string, unknown>).futureField = true; }),
            facadeMutation('nested_lifecycle_sentinel', (value) => { (value.lifecycle as Record<string, unknown>).lastReasonCode = 'CUSTOMER_SENTINEL'; }),
          ],
        },
        {
          kind: 'replay-record',
          value: replayPlan,
          mutations: [
            facadeMutation('nested_retained_multiplicity', (value) => { value.retainedActionIds = ['a1', 'a1']; }),
            facadeMutation('nested_target_sentinel', (value) => { value.targetId = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('nested_action_sentinel', (value) => { value.originalActionIds = ['CUSTOMER_SENTINEL']; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
        {
          kind: 'minimization-record',
          value: minimization,
          mutations: [
            facadeMutation('nested_budget_type', (value) => { (value.budget as Record<string, unknown>).maxTotalReplays = '1'; }),
            facadeMutation('nested_evaluation_type', (value) => { (value.candidateEvaluations as Array<Record<string, unknown>>)[0]!.reason = 7; }),
            facadeMutation('sentinel_payload', (value) => { value.anomalyFingerprint = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
        {
          kind: 'project-health-report',
          value: health,
          mutations: [
            facadeMutation('nested_currentness_count', (value) => { (value.sourceContracts as Record<string, unknown>).currentnessCounts = { CURRENT: 99, STALE: 0, SOURCE_UNAVAILABLE: 0, NOT_EVALUATED: 0 }; }),
            facadeMutation('nested_coverage_currentness', (value) => { (value.approvedTargetCoverage as Array<Record<string, unknown>>)[0]!.currentness = 'STALE'; }),
            facadeMutation('sentinel_payload', (value) => { (value.ownerScope as Record<string, unknown>).reason = 'CUSTOMER_SENTINEL'; }),
            facadeMutation('root_unknown_field', (value) => { value.futureField = true; }),
          ],
        },
      ];

      expect(entries.map((entry) => entry.kind)).toEqual(KNOWN_ARTIFACT_KINDS);
      const ledger: Array<Record<string, unknown>> = [];
      for (const entry of entries) {
        const base = cloneJson(entry.value);
        const accepted = validateArtifact(entry.kind, base, entry.context);
        expect(accepted.valid, `${entry.kind}: ${!accepted.valid ? accepted.reason : ''}`).toBe(true);
        const original = JSON.stringify(entry.value);
        for (const mutation of entry.mutations) {
          const mutated = cloneJson(entry.value) as Record<string, unknown>;
          mutation.mutate(mutated);
          const result = validateArtifact(entry.kind, mutated, entry.context);
          ledger.push({ kind: entry.kind, mutation: mutation.id, accepted: result.valid, reason: result.valid ? 'ACCEPTED' : result.reason });
          expect(result.valid, `${entry.kind}/${mutation.id}: ${result.valid ? 'unexpected accept' : result.reason}`).toBe(false);
          expect(JSON.stringify(entry.value), `${entry.kind}/${mutation.id} mutated fixture`).toBe(original);
        }
      }
      console.log(`FACADE_WIDE_MUTATION_AUDIT=${JSON.stringify(ledger)}`);
      expect(ledger).toHaveLength(entries.reduce((total, entry) => total + entry.mutations.length, 0));
    } finally {
      cleanup(root);
    }
  });

  test('reserved replay-result-envelope registration path is present and rejects malformed payloads', () => {
    expect(isReplayResultEnvelopeKindRegistered()).toBe(true);
    const malformed = {
      schemaVersion: 'nightwatch.triage-replay-envelope.private.v1',
      plan: { schemaVersion: 'nightwatch.triage-replay-plan.private.v2', futureField: true },
    };
    const result = validateArtifact('replay-result-envelope', malformed);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('ARTIFACT_REPLAY_ENVELOPE_INVALID');
  });
});
