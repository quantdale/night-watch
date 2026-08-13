// ---------------------------------------------------------------------------
// Phase 7 — one bounded private real-DEV campaign.
//
// This adapter composes the existing Phase 2C journey/oracle contract, Phase
// 3 source selector, Phase 4 safe exploration engine, and Phase 5 restricted
// API relay. It is opt-in through bin/phase7-real.mjs and never runs in the
// ordinary Playwright suite.
// ---------------------------------------------------------------------------

import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertSupportedEnvironment, loadEnvironmentConfig, type EnvironmentConfig } from '../../src/core/environment';
import { createNightwatchContext, validateUiUrl } from '../../src/browser/context';
import { inspectRipplePageAuthReadability } from '../../src/browser/fixtures/pageAuthReadability';
import { validateStorageStateFile } from '../../src/browser/fixtures/storageState';
import { AUTHENTICATED_BROWSER_CONTRACT } from '../../src/browser/contract';
import { DevAuthFailure, inspectDevAuthState, runDevAuthRefresh } from '../../src/auth/devAutoLogin';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { readProxyEvents } from '../../src/proxy/events';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import { freezeJourneyContract, JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { RIPPLE_JOURNEY_DEFINITIONS, buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import { createRippleExplorationRuntime } from '../../src/products/ripple/explorationRuntime';
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES, RIPPLE_PHASE4_BUDGET, envelopeById } from '../../src/products/ripple/explorationCatalog';
import { deriveSeed } from '../../src/core/exploration/rng';
import { runExploration as runExplorationEngine } from '../../src/core/exploration/engine';
import { catalogFingerprint, modelFingerprint } from '../../src/core/exploration/state';
import { minimizationActionFromSafeAction } from '../../src/core/triage/types';
import { adaptExplorationEvidence, adaptJourneyEvidence } from '../../src/core/triage/compatibility';
import { correlateSourceChanges } from '../../src/core/triage/correlation';
import { PHASE5_API_CATALOG, getPhase5Operation } from '../../src/api/phase5/catalog';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from '../../src/api/phase5/types';
import { createEphemeralRippleApiAuthProvider } from '../../src/api/phase5/auth';
import { generateRestrictedScenario, materializeRelayPort } from '../../src/api/phase5/generator';
import { assertGeneratedScenarioSafe, parseRestrictedOopsScenario } from '../../src/api/phase5/restrictedProfile';
import { startPhase5Relay, type RelayObservation } from '../../src/api/phase5/relay';
import { apiFingerprint } from '../../src/api/phase5/oracle';
import { collectChangeset, combineChangesets } from '../../src/core/changeIntelligence/git';
import { selectJourneys } from '../../src/core/changeIntelligence/selection';
import { DEPENDENCY_MAP_VERSION, RIPPLE_REPOSITORIES, SELECTOR_VERSION, type ChangeSet } from '../../src/core/changeIntelligence';
import { snapshotRepositories } from '../../src/core/repositories/snapshotter';
import type { RepoSnapshotRecord } from '../../src/core/evidence/types';
import { runRealRunGate, type RealRunGateResult } from '../../src/core/safety/realRunGate';
import { PRIVATE_ARTIFACT_POLICY_VERSION, PrivateArtifactStore } from '../../src/core/policy/privateArtifacts';
import {
  ANOMALY_CLUSTER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  DOSSIER_VERSION,
  type AnomalyObservation,
  type BrowserObservation,
  type MinimizationAction,
  type SourceFreshness,
} from '../../src/core/triage/types';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  runCampaign,
  type CampaignAnomalyCandidate,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyStatus,
  type CampaignSafetyVector,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { OWNER_SCOPE_POLICY_VERSION } from '../../src/core/policy/ownerScope';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';

const REAL_OPERATION_IDS = [
  'ripple.payer-exchange.read',
  'ripple.common-exchange.read',
  'ripple.account-inventory.read',
] as const;

const REAL_SEEDS = {
  'E1-J1-payer-exchange': '0x0000000000000101',
  'E2-J2-common-exchange': '0x0000000000000201',
  'E3-J3-account-inventory': '0x0000000000000301',
} as const;

interface RealCampaignContext {
  readonly root: string;
  readonly environment: EnvironmentConfig;
  readonly target: string;
  readonly statePath: string;
  readonly privateStore: PrivateArtifactStore;
  readonly repoSnapshots: readonly RepoSnapshotRecord[];
  readonly sourceSnapshots: readonly CampaignSourceSnapshot[];
  readonly changeset: ChangeSet;
  readonly nightwatchDirtyPaths: readonly string[];
}

function rootDirectory(): string {
  return path.resolve(__dirname, '..', '..');
}

function workspaceRepositoriesRoot(root: string): string {
  return path.resolve(root, '..');
}

function requiredEnvironment(): EnvironmentConfig {
  const name = assertSupportedEnvironment(process.env.NIGHTWATCH_ENV);
  if (name !== 'dev') throw new Error('PHASE7_REAL_DEV_ONLY');
  return loadEnvironmentConfig(name);
}

function targetFor(environment: EnvironmentConfig): string {
  const configured = new URL(environment.uiBaseUrl);
  const selected = new URL(process.env.NIGHTWATCH_UI_URL ?? environment.uiBaseUrl);
  if (selected.protocol !== 'https:' || selected.origin !== configured.origin || selected.pathname !== configured.pathname || selected.username !== '' || selected.password !== '' || selected.search !== '' || selected.hash !== '') {
    throw new Error('PHASE7_TARGET_MISMATCH');
  }
  return validateUiUrl(environment, selected.toString());
}

function gitResolve(repoPath: string, ref: string): string | null {
  const result = spawnSync('git', ['-C', repoPath, 'rev-parse', ref], { encoding: 'utf8' });
  const value = (result.stdout ?? '').trim();
  return result.status === 0 && /^[0-9a-f]{40}$/i.test(value) ? value : null;
}

function currentNightwatchDirtyPaths(root: string): readonly string[] {
  const result = spawnSync('git', ['-C', root, 'status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
  if (result.status !== 0) return ['<status-unavailable>'];
  return (result.stdout ?? '').split(/\r?\n/).map((line) => line.slice(3).trim()).filter(Boolean);
}

function sourceSnapshot(repoId: string, definition: (typeof RIPPLE_REPOSITORIES)[number], record: RepoSnapshotRecord, trackingSha: string | null): CampaignSourceSnapshot {
  if (!record.ok || !/^[0-9a-f]{40}$/i.test(record.headSha)) throw new Error(`SOURCE_SNAPSHOT_INVALID:${repoId}`);
  return {
    repoId,
    branch: record.branch,
    headSha: record.headSha,
    trackingRef: record.upstream,
    trackingSha,
    ahead: record.aheadBehind?.ahead ?? null,
    behind: record.aheadBehind?.behind ?? null,
    dirty: record.dirty,
    dirtyFileCount: record.dirtyFileCount,
    sourceMapSha: definition.sourceMapSha,
    freshness: 'LOCAL_TRACKING_REF_ONLY',
    readOnly: true,
  };
}

async function buildRealContext(root: string, environment: EnvironmentConfig, target: string, statePath: string, privateStore: PrivateArtifactStore): Promise<RealCampaignContext> {
  const reposRoot = workspaceRepositoriesRoot(root);
  const repoIds = RIPPLE_REPOSITORIES.map((repo) => repo.repoId);
  const records = await snapshotRepositories({ reposRoot, repos: repoIds });
  if (records.length !== repoIds.length || records.some((record) => !record.ok)) throw new Error('SOURCE_SNAPSHOT_BLOCKED');
  const sourceSnapshots = records.map((record, index) => {
    const definition = RIPPLE_REPOSITORIES[index];
    if (definition === undefined) throw new Error('SOURCE_SNAPSHOT_ORDER_INVALID');
    const repoPath = path.join(reposRoot, definition.repoId);
    const trackingSha = record.upstream === null ? null : gitResolve(repoPath, record.upstream);
    return sourceSnapshot(definition.repoId, definition, record, trackingSha);
  });
  const changesets = records.map((record, index) => {
    const definition = RIPPLE_REPOSITORIES[index];
    if (definition === undefined) throw new Error('SOURCE_CHANGESET_ORDER_INVALID');
    const snapshot = sourceSnapshots[index]!;
    return collectChangeset({
      repoPath: path.join(reposRoot, definition.repoId),
      repoId: definition.repoId,
      baseSha: snapshot.trackingSha ?? snapshot.headSha,
      headSha: snapshot.headSha,
      source: 'COMMITTED_UPSTREAM_CHANGE',
      sourceWindow: 'COMMITTED_ONLY',
    });
  });
  const changeset = combineChangesets(changesets);
  return {
    root,
    environment,
    target,
    statePath,
    privateStore,
    repoSnapshots: records,
    sourceSnapshots,
    changeset,
    nightwatchDirtyPaths: currentNightwatchDirtyPaths(root),
  };
}

function versionFingerprint(): CampaignVersionFingerprint {
  return {
    campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
    orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
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
  };
}

function privacyPass(): CampaignPrivacyStatus {
  return {
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
}

function safetyZero(): CampaignSafetyVector {
  return {
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
}

function safetyFromJourney(context: Awaited<ReturnType<typeof createNightwatchContext>>, recorder: RunRecorder, evidence: { readonly safetyCounts?: { readonly productionAttempts: number; readonly proxyViolations: number; readonly unknownDestinations: number; readonly unknownApprovals: number; readonly mutations: number; readonly actionCausedUnknown: number; readonly dbQueries: number } }): CampaignSafetyVector {
  recorder.syncProxyViolations();
  const proxyEvents = (() => {
    try { return readProxyEvents(path.join(recorder.dir, 'proxy.jsonl')); } catch { return []; }
  })();
  const counts = evidence.safetyCounts;
  return {
    productionAttempts: (counts?.productionAttempts ?? 0) + proxyEvents.filter((event) => event.classification === 'production').length,
    proxyViolations: (counts?.proxyViolations ?? 0) + proxyEvents.filter((event) => event.decision === 'deny').length,
    unknownDestinations: (counts?.unknownDestinations ?? 0) + proxyEvents.filter((event) => event.decision === 'deny' && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    unknownApprovals: counts?.unknownApprovals ?? 0,
    productMutations: (counts?.mutations ?? 0) + context.network.semanticRequests().filter((item) => item.disposition === 'KNOWN_MUTATION').length,
    actionCausedUnknown: (counts?.actionCausedUnknown ?? 0) + context.network.semanticRequests().filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    databaseQueries: counts?.dbQueries ?? 0,
    infrastructureQueries: 0,
    externalPublicationAttempts: 0,
  };
}

function safeRunId(workItem: CampaignWorkItem, attempt: number): string {
  return `phase7-${workItem.workItemId.replace(/[^A-Za-z0-9_.-]/g, '-')}-${attempt}`;
}

function routeForJourney(journeyId: string): string {
  return journeyId === 'ripple-payer-exchange-read' ? '/payer-exchange-rate-v2' : journeyId === 'ripple-common-exchange-read' ? '/global-exchange-rate-v2' : '/accounts';
}

function sourceCorrelationFor(manifest: CampaignManifest, journeyId: 'ripple-payer-exchange-read' | 'ripple-common-exchange-read' | 'ripple-account-inventory') {
  const freshness: SourceFreshness = manifest.sourceSnapshots.some((snapshot) => snapshot.freshness === 'UNKNOWN') ? 'UNKNOWN' : 'LOCAL_TRACKING_REF_ONLY';
  return correlateSourceChanges({ journeyIds: [journeyId], changedFiles: manifest.sourceWindow.changedFiles, sourceFreshness: freshness, sourceVersion: manifest.sourceWindow.changesetId });
}

function browserObservationFrom(input: { readonly anomaly: AnomalyObservation; readonly journeyId: string; readonly routeClass: string; readonly failed: boolean; readonly operationFamily: string }): BrowserObservation {
  return {
    failed: input.failed,
    routeClass: input.routeClass,
    structuralState: input.anomaly.features.structuralState ?? 'structural-state-unavailable',
    operationFamily: input.operationFamily,
    statusClass: input.failed ? '5xx' : '2xx',
    contentTypeClass: 'metadata-only',
    oracleFingerprint: input.anomaly.fingerprint,
    runtimeCategory: input.anomaly.features.runtimeCategory ?? 'unknown',
  };
}

function candidateFromObservation(input: {
  readonly manifest: CampaignManifest;
  readonly workItem: CampaignWorkItem;
  readonly observation: AnomalyObservation;
  readonly originalSequence: readonly MinimizationAction[];
  readonly browser: BrowserObservation;
  readonly api: CampaignAnomalyCandidate['api'];
  readonly contractVersion: string;
  readonly contractDigest: string;
  readonly replay?: CampaignAnomalyCandidate['replay'];
}): CampaignAnomalyCandidate {
  const journeyId = input.workItem.journeyId;
  if (journeyId === null) throw new Error('CAMPAIGN_ANOMALY_JOURNEY_MISSING');
  const correlation = sourceCorrelationFor(input.manifest, journeyId);
  return {
    observation: { ...input.observation, sourceFreshness: correlation.candidates[0]?.sourceFreshness ?? 'LOCAL_TRACKING_REF_ONLY' },
    journeyId,
    contractVersion: input.contractVersion,
    contractDigest: input.contractDigest,
    contextKind: input.observation.reproduced ? 'FRESH_CONTEXT_REPLAY' : 'FIRST_OBSERVATION',
    originalSequence: input.originalSequence,
    technicalSeverity: 'HIGH',
    breadth: 'NARROW',
    browser: input.browser,
    api: input.api,
    sourceCorrelation: {
      journeyIds: [journeyId],
      changedFiles: input.manifest.sourceWindow.changedFiles,
      sourceFreshness: correlation.candidates[0]?.sourceFreshness ?? 'LOCAL_TRACKING_REF_ONLY',
      sourceVersion: correlation.sourceVersion,
    },
    sourceRelevance: correlation.overallRelevance,
    alternativesRuledOut: ['auth-valid', 'production-deny-active', 'read-only-semantic-contract', 'datastore-evidence-out-of-scope-by-owner'],
    missingEvidence: ['deployment-status-unresolved', 'datastore-evidence-out-of-scope-by-owner'],
    knownNightwatchDefect: false,
    ...(input.replay === undefined ? {} : { replay: input.replay }),
  };
}

function invalidReducedReplay(): CampaignAnomalyCandidate['replay'] {
  return (sequence) => ({
    status: 'INVALID',
    invalidReason: sequence.length === 0 ? 'PRECONDITION_DIVERGENCE' : 'ACTION_NOT_APPROVED',
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
  });
}

function journeyCandidate(input: {
  readonly manifest: CampaignManifest;
  readonly workItem: CampaignWorkItem;
  readonly runId: string;
  readonly evidence: Awaited<ReturnType<typeof runDeclarativeJourney>>;
}): readonly CampaignAnomalyCandidate[] {
  const observations = adaptJourneyEvidence({ runId: input.runId, observedAt: new Date().toISOString(), evidence: input.evidence });
  const definition = RIPPLE_JOURNEY_DEFINITIONS.find((item) => item.journeyId === input.workItem.journeyId);
  if (definition === undefined) throw new Error('CAMPAIGN_JOURNEY_DEFINITION_MISSING');
  const sequence: MinimizationAction[] = input.evidence.stepResults.map((step) => ({
    actionId: step.stepId,
    semanticClass: 'KNOWN_READ',
    routeClass: step.routeClass,
    sourceApproved: true,
    catalogVersion: JOURNEY_CONTRACT_VERSION,
  }));
  return observations.map((observation) => candidateFromObservation({
    manifest: input.manifest,
    workItem: input.workItem,
    observation,
    originalSequence: sequence,
    browser: browserObservationFrom({ anomaly: observation, journeyId: input.workItem.journeyId!, routeClass: input.evidence.finalRouteClass, failed: true, operationFamily: input.workItem.journeyId! }),
    api: null,
    contractVersion: input.evidence.contractVersion ?? JOURNEY_CONTRACT_VERSION,
    contractDigest: input.evidence.contractDigest ?? `contract:${definition.sourceSha}`,
    replay: invalidReducedReplay(),
  }));
}

function explorationCandidate(input: {
  readonly manifest: CampaignManifest;
  readonly workItem: CampaignWorkItem;
  readonly runId: string;
  readonly evidence: Awaited<ReturnType<typeof runExplorationEngine>>;
}): readonly CampaignAnomalyCandidate[] {
  const observations = adaptExplorationEvidence({ runId: input.runId, observedAt: new Date().toISOString(), evidence: input.evidence });
  const sequence = input.evidence.plannedActions.map((actionId) => {
    const safe = RIPPLE_PHASE4_ACTIONS.find((candidate) => candidate.actionId === actionId);
    if (safe === undefined) throw new Error(`CAMPAIGN_EXPLORATION_ACTION_MISSING:${actionId}`);
    return minimizationActionFromSafeAction(safe);
  });
  if (sequence.length === 0) return [];
  return observations.map((observation) => candidateFromObservation({
    manifest: input.manifest,
    workItem: input.workItem,
    observation,
    originalSequence: sequence,
    browser: browserObservationFrom({ anomaly: observation, journeyId: input.workItem.journeyId!, routeClass: input.evidence.states.at(-1)?.routeClass ?? routeForJourney(input.workItem.journeyId!), failed: true, operationFamily: input.workItem.journeyId! }),
    api: null,
    contractVersion: JOURNEY_CONTRACT_VERSION,
    contractDigest: `exploration:${input.manifest.versions.explorationModelVersion}`,
    replay: invalidReducedReplay(),
  }));
}

function apiSafety(observation: RelayObservation): CampaignSafetyVector {
  const safety = safetyZero();
  if (observation.destinationHostClass !== 'DEV_API') return { ...safety, unknownDestinations: 1 };
  if (observation.safetyBlock === 'PRODUCTION_DESTINATION') return { ...safety, productionAttempts: 1 };
  if (observation.safetyBlock === 'UNKNOWN_DESTINATION') return { ...safety, unknownDestinations: 1 };
  if (observation.safetyBlock === 'KNOWN_MUTATION') return { ...safety, productMutations: 1 };
  if (observation.safetyBlock === 'UNKNOWN_OPERATION' || observation.safetyBlock === 'OPERATION_MISMATCH') return { ...safety, unknownApprovals: 1 };
  return safety;
}

function apiCandidate(input: {
  readonly manifest: CampaignManifest;
  readonly workItem: CampaignWorkItem;
  readonly operationId: string;
  readonly runId: string;
  readonly observation: RelayObservation;
  readonly first: boolean;
}): CampaignAnomalyCandidate | null {
  if (input.observation.oracle.result === 'ORACLE_PASS') return null;
  const operation = getPhase5Operation(input.operationId);
  const fingerprint = apiFingerprint({
    operationId: input.operationId,
    service: operation.service,
    oracleId: input.observation.oracle.oracleId,
    statusClass: input.observation.oracle.statusClass,
    contentTypeClass: input.observation.oracle.contentTypeClass,
    parseCategory: input.observation.oracle.parseCategory,
    streamCategory: input.observation.oracle.streamCategory,
    errorCategory: input.observation.oracle.result,
    catalogVersion: API_CATALOG_VERSION,
  });
  const observation: AnomalyObservation = {
    runId: input.runId,
    observedAt: new Date().toISOString(),
    fingerprint,
    features: {
      journeyId: input.workItem.journeyId,
      envelopeId: input.workItem.envelopeId,
      oracleId: input.observation.oracle.oracleId,
      routeClass: '/api-only',
      operationFamily: input.operationId,
      statusClass: input.observation.oracle.statusClass,
      contentTypeClass: input.observation.oracle.contentTypeClass,
      runtimeCategory: input.observation.oracle.result,
      structuralState: input.observation.oracle.parseCategory,
      failureActionId: input.operationId,
      sourceImpactRegion: input.operationId,
      browserApiResultClass: 'api-only',
    },
    timingClass: 'NONE',
    reproduced: !input.first,
    minimized: false,
    sourceFreshness: 'LOCAL_TRACKING_REF_ONLY',
  };
  const action: MinimizationAction = { actionId: input.operationId, semanticClass: 'KNOWN_READ', routeClass: '/api-only', sourceApproved: true, catalogVersion: API_CATALOG_VERSION };
  return candidateFromObservation({
    manifest: input.manifest,
    workItem: input.workItem,
    observation,
    originalSequence: [action],
    browser: browserObservationFrom({ anomaly: observation, journeyId: input.workItem.journeyId!, routeClass: '/api-only', failed: false, operationFamily: input.operationId }),
    api: {
      available: true,
      failed: true,
      operationFamily: input.operationId,
      routeClass: '/api-only',
      structuralState: input.observation.oracle.parseCategory,
      statusClass: input.observation.oracle.statusClass,
      contentTypeClass: input.observation.oracle.contentTypeClass,
      parseCategory: input.observation.oracle.parseCategory,
      oracleFingerprint: fingerprint,
    },
    contractVersion: API_CATALOG_VERSION,
    contractDigest: `api:${operation.sourceSHA}`,
    replay: invalidReducedReplay(),
  });
}

async function ensureAuth(browser: Browser, context: RealCampaignContext): Promise<void> {
  const current = inspectDevAuthState(context.statePath, context.target, context.environment);
  if (current.valid) return;
  if (process.env.NIGHTWATCH_PHASE_7_AUTH_REFRESH !== '1') throw new DevAuthFailure('AUTH_NETWORK_FAILURE');
  await runDevAuthRefresh({
    browser,
    environment: context.environment,
    uiUrl: context.target,
    storageStatePath: context.statePath,
    artifactsRoot: path.join(context.privateStore.root, 'auth-refresh'),
    nightwatchRoot: context.root,
    mfaCompletion: { wait: async () => { throw new DevAuthFailure('MFA_REQUIRED'); } },
  });
  if (!inspectDevAuthState(context.statePath, context.target, context.environment).valid) throw new DevAuthFailure('POST_LOGIN_AUTH_NOT_PAGE_READABLE');
}

function gateRepositories(context: RealCampaignContext) {
  return {
    snapshotRecorded: true,
    snapshotsValid: context.repoSnapshots.every((record) => record.ok),
    alphausRepositoriesSnapshotValid: context.repoSnapshots.every((record) => record.ok),
    nightwatchDirtyPaths: currentNightwatchDirtyPaths(context.root),
    documentedNightwatchDirtyPaths: [],
  };
}

function preflightGate(context: RealCampaignContext): Promise<RealRunGateResult> {
  return runRealRunGate({
    environment: context.environment,
    uiUrl: context.target,
    storageStatePath: context.statePath,
    storageStateEnvironment: 'dev',
    browser: AUTHENTICATED_BROWSER_CONTRACT,
    evidence: { metadataFirst: true, requestHeadersPersisted: false, requestBodiesPersisted: false, responseBodiesPersisted: false, queryValuesPersisted: false, querySanitized: true, storageStatePersisted: false, customerDomPersisted: false, screenshotsEnabled: false, tracesEnabled: false },
    actions: { passiveOnly: true, mutationRegistryEnabled: true },
    repositories: gateRepositories(context),
  });
}

async function runJourney(context: RealCampaignContext, browser: Browser, manifest: CampaignManifest, workItem: CampaignWorkItem, attempt: number): Promise<CampaignExecutionOutcome> {
  await ensureAuth(browser, context);
  const journeyId = workItem.journeyId;
  if (journeyId === null) throw new Error('CAMPAIGN_JOURNEY_MISSING');
  const definition = RIPPLE_JOURNEY_DEFINITIONS.find((item) => item.journeyId === journeyId);
  if (definition === undefined) throw new Error(`CAMPAIGN_JOURNEY_DEFINITION_MISSING:${journeyId}`);
  const contract = freezeJourneyContract(definition);
  const recorder = new RunRecorder({ runId: safeRunId(workItem, attempt), environment: 'dev', product: 'ripple', browser: 'chromium', scenario: `phase7-${journeyId}`, nightwatchSha: gitResolve(context.root, 'HEAD'), authenticated: true, artifactsRoot: path.join(context.privateStore.root, 'runs') });
  await recorder.writeRepositories([...context.repoSnapshots]);
  const nightwatch = await createNightwatchContext(browser, { env: context.environment, recorder, uiBaseUrl: context.target, storageStatePath: context.statePath, trace: 'off', bootstrapDiagnostics: true, endpointRegistry: buildRippleJourneyEndpointRegistry(context.environment), journeyId });
  let finalized = false;
  try {
    await nightwatch.page.goto(context.target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const auth = await inspectRipplePageAuthReadability(nightwatch.page);
    const authValid = auth.evaluationSucceeded && auth.tokenPageReadable && auth.tokenNonEmpty && auth.aggregatePageBootstrapSemantics === 'VALID';
    if (!authValid) return { result: 'AUTH_BLOCKED', safety: safetyZero(), privacy: privacyPass(), actionsExecuted: 0, apiExecutions: 0, browserContextCreated: true, replay: false, observations: [], reasonCode: 'AUTH_STATE_INVALID' };
    nightwatch.network.beginJourneyObservation();
    const evidence = await runDeclarativeJourney(nightwatch.page, { recorder, monitor: nightwatch.monitor, network: nightwatch.network }, contract.definition, { uiBaseUrl: context.target, authValid });
    const safety = safetyFromJourney(nightwatch, recorder, evidence);
    const candidates = evidence.anomalyFingerprints?.length ? journeyCandidate({ manifest, workItem, runId: safeRunId(workItem, attempt), evidence }) : [];
    await recorder.finalize({ passed: evidence.passed && Object.values(safety).every((value) => value === 0), notes: [`Phase 7 campaign journey ${journeyId}`, `anomalies=${candidates.length}`, `safety=${JSON.stringify(safety)}`] });
    finalized = true;
    return { result: candidates.length > 0 ? 'ANOMALY' : evidence.passed ? 'PASS' : 'RUNTIME_FAILURE', safety, privacy: privacyPass(), actionsExecuted: evidence.stepResults.length, apiExecutions: 0, browserContextCreated: true, replay: false, observations: candidates, journeyEvidence: evidence, reasonCode: evidence.passed ? undefined : 'JOURNEY_ORACLE_FAILURE' };
  } finally {
    await nightwatch.close();
    if (!finalized) {
      try { await recorder.finalize({ passed: false, notes: ['Phase 7 campaign journey did not reach normal finalization'] }); } catch { /* preserve primary failure */ }
    }
  }
}

async function runExploration(context: RealCampaignContext, browser: Browser, manifest: CampaignManifest, workItem: CampaignWorkItem, attempt: number): Promise<CampaignExecutionOutcome> {
  await ensureAuth(browser, context);
  const journeyId = workItem.journeyId;
  const envelopeId = workItem.envelopeId;
  if (journeyId === null || envelopeId === null) throw new Error('CAMPAIGN_EXPLORATION_LINEAGE_MISSING');
  const envelope = envelopeById(envelopeId);
  const definition = RIPPLE_JOURNEY_DEFINITIONS.find((item) => item.journeyId === journeyId);
  if (definition === undefined) throw new Error('CAMPAIGN_EXPLORATION_ANCHOR_MISSING');
  const contract = freezeJourneyContract(definition);
  const recorder = new RunRecorder({ runId: safeRunId(workItem, attempt), environment: 'dev', product: 'ripple', browser: 'chromium', scenario: `phase7-exploration-${envelopeId}`, seed: workItem.seed ?? undefined, nightwatchSha: gitResolve(context.root, 'HEAD'), authenticated: true, artifactsRoot: path.join(context.privateStore.root, 'runs') });
  await recorder.writeRepositories([...context.repoSnapshots]);
  const nightwatch = await createNightwatchContext(browser, { env: context.environment, recorder, uiBaseUrl: context.target, storageStatePath: context.statePath, trace: 'off', bootstrapDiagnostics: true, endpointRegistry: buildRippleJourneyEndpointRegistry(context.environment), journeyId });
  let finalized = false;
  try {
    await nightwatch.page.goto(context.target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const auth = await inspectRipplePageAuthReadability(nightwatch.page);
    const authValid = auth.evaluationSucceeded && auth.tokenPageReadable && auth.tokenNonEmpty && auth.aggregatePageBootstrapSemantics === 'VALID';
    if (!authValid) return { result: 'AUTH_BLOCKED', safety: safetyZero(), privacy: privacyPass(), actionsExecuted: 0, apiExecutions: 0, browserContextCreated: true, replay: false, observations: [], reasonCode: 'AUTH_STATE_INVALID' };
    nightwatch.network.beginJourneyObservation();
    const anchor = await runDeclarativeJourney(nightwatch.page, { recorder, monitor: nightwatch.monitor, network: nightwatch.network }, contract.definition, { uiBaseUrl: context.target, authValid });
    if (!anchor.passed) return { result: 'RUNTIME_FAILURE', safety: safetyFromJourney(nightwatch, recorder, anchor), privacy: privacyPass(), actionsExecuted: anchor.stepResults.length, apiExecutions: 0, browserContextCreated: true, replay: false, observations: [], reasonCode: 'EXPLORATION_ANCHOR_FAILED' };
    const runtime = createRippleExplorationRuntime({ page: nightwatch.page, uiBaseUrl: context.target, anchorJourney: journeyId, network: nightwatch.network, monitor: nightwatch.monitor, authValid: true });
    const evidence = await runExplorationEngine({ runId: safeRunId(workItem, attempt), seed: workItem.seed ?? REAL_SEEDS[envelopeId as keyof typeof REAL_SEEDS], derivedSeed: deriveSeed(workItem.seed ?? REAL_SEEDS[envelopeId as keyof typeof REAL_SEEDS], manifest.versions.explorationModelVersion, envelopeId, 0), catalog: RIPPLE_PHASE4_ACTIONS, envelope, budget: RIPPLE_PHASE4_BUDGET, runtime });
    const safety = safetyFromJourney(nightwatch, recorder, { safetyCounts: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, mutations: evidence.safety.knownMutations, actionCausedUnknown: evidence.safety.actionCausedUnknown, dbQueries: evidence.safety.dbQueries } });
    const candidates = evidence.anomalyFingerprints.length > 0 ? explorationCandidate({ manifest, workItem, runId: safeRunId(workItem, attempt), evidence }) : [];
    await recorder.finalize({ passed: candidates.length === 0 && Object.values(safety).every((value) => value === 0) && evidence.terminationReason !== 'RUN_INCOMPLETE', notes: [`Phase 7 campaign exploration ${envelopeId}`, `termination=${evidence.terminationReason}`, `safety=${JSON.stringify(safety)}`] });
    finalized = true;
    return { result: candidates.length > 0 ? 'ANOMALY' : evidence.terminationReason === 'RUN_INCOMPLETE' ? 'INCOMPLETE' : 'PASS', safety, privacy: privacyPass(), actionsExecuted: evidence.coverage.transitionsCompleted, apiExecutions: 0, browserContextCreated: true, replay: false, observations: candidates, coverage: { transitionsAttempted: evidence.coverage.transitionsAttempted, transitionsCompleted: evidence.coverage.transitionsCompleted, statesDiscovered: evidence.coverage.statesDiscovered }, reasonCode: candidates.length > 0 ? 'EXPLORATION_ORACLE_FAILURE' : undefined };
  } finally {
    await nightwatch.close();
    if (!finalized) {
      try { await recorder.finalize({ passed: false, notes: ['Phase 7 campaign exploration did not reach normal finalization'] }); } catch { /* preserve primary failure */ }
    }
  }
}

async function oneApiExecution(context: RealCampaignContext, operationId: string): Promise<RelayObservation> {
  const operation = getPhase5Operation(operationId);
  if (operation.semanticClass !== 'KNOWN_READ' || operation.generationStatus !== 'GENERATION_ELIGIBLE' || operation.replayPolicy === 'NEVER') throw new Error(`API_OPERATION_UNSAFE:${operationId}`);
  const scenario = generateRestrictedScenario(operation, PHASE5_API_CATALOG);
  assertGeneratedScenarioSafe(scenario.logicalYaml, operationId);
  const authProvider = createEphemeralRippleApiAuthProvider(context.statePath, context.environment);
  const relay = await startPhase5Relay({ catalog: PHASE5_API_CATALOG, mode: 'dev', environment: context.environment, authHeaders: async () => authProvider.headers() });
  try {
    const materialized = materializeRelayPort(scenario.logicalYaml, relay.port, operationId);
    const document = parseRestrictedOopsScenario(materialized, operationId);
    const request = document.run[0].http;
    const response = await fetch(request.url, { method: request.method, headers: request.headers, redirect: 'manual' });
    await response.arrayBuffer();
    const observation = relay.takeObservation(operationId);
    if (observation === undefined) throw new Error('API_RELAY_OBSERVATION_MISSING');
    return observation;
  } finally {
    await relay.close();
  }
}

async function runApi(context: RealCampaignContext, browser: Browser, manifest: CampaignManifest, workItem: CampaignWorkItem, attempt: number): Promise<CampaignExecutionOutcome> {
  await ensureAuth(browser, context);
  const operationId = workItem.apiOperationId;
  if (operationId === null || !REAL_OPERATION_IDS.includes(operationId as (typeof REAL_OPERATION_IDS)[number])) throw new Error('CAMPAIGN_API_LINEAGE_UNSAFE');
  const first = await oneApiExecution(context, operationId);
  const replay = await oneApiExecution(context, operationId);
  const firstCandidate = apiCandidate({ manifest, workItem, operationId, runId: `${safeRunId(workItem, attempt)}-first`, observation: first, first: true });
  const replayCandidate = apiCandidate({ manifest, workItem, operationId, runId: `${safeRunId(workItem, attempt)}-fresh`, observation: replay, first: false });
  const observations = [firstCandidate, replayCandidate].filter((candidate): candidate is CampaignAnomalyCandidate => candidate !== null);
  const safety = { ...apiSafety(first), ...apiSafety(replay) };
  const safetyMerged: CampaignSafetyVector = {
    productionAttempts: apiSafety(first).productionAttempts + apiSafety(replay).productionAttempts,
    proxyViolations: apiSafety(first).proxyViolations + apiSafety(replay).proxyViolations,
    unknownDestinations: apiSafety(first).unknownDestinations + apiSafety(replay).unknownDestinations,
    unknownApprovals: apiSafety(first).unknownApprovals + apiSafety(replay).unknownApprovals,
    productMutations: apiSafety(first).productMutations + apiSafety(replay).productMutations,
    actionCausedUnknown: 0,
    databaseQueries: 0,
    infrastructureQueries: 0,
    externalPublicationAttempts: 0,
  };
  return { result: observations.length > 0 ? 'ANOMALY' : Object.values(safety).some((value) => value !== 0) ? 'SAFETY_BLOCKED' : 'PASS', safety: safetyMerged, privacy: privacyPass(), actionsExecuted: 0, apiExecutions: 2, browserContextCreated: false, replay: true, observations, reasonCode: observations.length > 0 ? 'API_ORACLE_FAILURE' : undefined };
}

function buildInput(context: RealCampaignContext, mode: CampaignInput['mode']): CampaignInput {
  const sourceWindow = {
    changesetId: context.changeset.changesetId,
    baselines: context.changeset.repoBaselines.map((baseline) => ({ repoId: baseline.repoId, baseSha: baseline.baseSha, headSha: baseline.headSha, dirtyExcluded: true as const })),
    changedFiles: context.changeset.changedFiles,
    dirtyFiles: context.changeset.dirtyFiles,
    sourceWindow: context.changeset.sourceWindow,
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
  };
  const phase3Selection = mode === 'CHANGE_DIRECTED' ? selectJourneys(context.changeset) : null;
  return {
    mode,
    createdAt: new Date().toISOString(),
    sourceSnapshots: context.sourceSnapshots,
    sourceWindow,
    changeset: context.changeset,
    phase3Selection,
    seedCorpusVersion: 'nightwatch.phase7.real-dev-seeds.v1',
    seedSet: Object.values(REAL_SEEDS),
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: versionFingerprint(),
    budgetPolicy: INITIAL_REAL_CAMPAIGN_BUDGET,
    privacyPolicy: { storageClass: 'OWNER_ONLY_LOCAL', remotePrivacy: 'NO_REMOTE', externalPublication: 'PROHIBITED', rawBodiesPersisted: false, customerValuesPersisted: false, credentialsPersisted: false, cookiesPersisted: false, tokensPersisted: false, domPersisted: false, screenshotsPersisted: false, authenticatedTracesPersisted: false },
  };
}

function privacyAudit(root: string): void {
  const forbidden = /(?:Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const contents = fs.readFileSync(file, 'utf8');
        if (forbidden.test(contents)) throw new Error('PRIVATE_EVIDENCE_PRIVACY_BLOCKED');
      }
    }
  };
  walk(root);
}

test('Phase 7 bounded private real DEV campaign', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_7_REAL !== '1') { test.skip(); return; }
  const root = rootDirectory();
  const environment = requiredEnvironment();
  const target = targetFor(environment);
  const stateValue = process.env.NIGHTWATCH_STORAGE_STATE;
  if (stateValue === undefined || !path.isAbsolute(stateValue) || stateValue.trim() === '') throw new Error('DEV_AUTH_ACTION_REQUIRED');
  const statePath = validateStorageStateFile(stateValue);
  const privateStore = new PrivateArtifactStore();
  const context = await buildRealContext(root, environment, target, statePath, privateStore);
  const mode: CampaignInput['mode'] = context.changeset.changedFiles.length > 0 ? 'CHANGE_DIRECTED' : 'BASELINE_HEALTH';
  const input = buildInput(context, mode);
  const manifest = createCampaignManifest(input);
  const executor = {
    preflight: async () => {
      try {
        await ensureAuth(browser, context);
        const gate = await preflightGate(context);
        if (!gate.pass) {
          const failed = gate.checks.filter((check) => check.status === 'FAIL').map((check) => check.name);
          const authFailure = failed.includes('authentication-state');
          const safetyFailure = failed.some((name) => ['proxy-bound', 'proxy-health', 'proxy-contract', 'production-deny-canary', 'target-agreement'].includes(name));
          return { passed: false, code: authFailure ? 'AUTH_BLOCKED' as const : safetyFailure ? 'SAFETY_BLOCKED' as const : 'PREFLIGHT_FAILED' as const, failedChecks: failed, checkedAt: new Date().toISOString() };
        }
        if (context.nightwatchDirtyPaths.length > 0 || currentNightwatchDirtyPaths(context.root).length > 0) return { passed: false, code: 'PREFLIGHT_FAILED' as const, failedChecks: ['nightwatch-worktree-clean'], checkedAt: new Date().toISOString() };
        return { passed: true, code: 'PREFLIGHT_PASS' as const, failedChecks: [], checkedAt: new Date().toISOString() };
      } catch (error) {
        if (error instanceof DevAuthFailure || String(error).includes('AUTH')) return { passed: false, code: 'AUTH_BLOCKED' as const, failedChecks: ['auth-state'], checkedAt: new Date().toISOString() };
        return { passed: false, code: 'PREFLIGHT_FAILED' as const, failedChecks: ['preflight-exception'], checkedAt: new Date().toISOString() };
      }
    },
    execute: async ({ manifest: frozenManifest, workItem, attempt }: { readonly manifest: CampaignManifest; readonly workItem: CampaignWorkItem; readonly attempt: number }) => {
      if (workItem.kind === 'JOURNEY') return await runJourney(context, browser, frozenManifest, workItem, attempt);
      if (workItem.kind === 'EXPLORATION') return await runExploration(context, browser, frozenManifest, workItem, attempt);
      if (workItem.kind === 'API') return await runApi(context, browser, frozenManifest, workItem, attempt);
      throw new Error('CAMPAIGN_REPRODUCTION_ADAPTER_NOT_CONFIGURED');
    },
  };
  const result = await runCampaign(manifest, executor, { store: privateStore, maxTopFindings: 3 });
  privacyAudit(privateStore.root);
  expect(result.checkpoint.safety.productionAttempts).toBe(0);
  expect(result.checkpoint.safety.proxyViolations).toBe(0);
  expect(result.checkpoint.safety.unknownDestinations).toBe(0);
  expect(result.checkpoint.safety.unknownApprovals).toBe(0);
  expect(result.checkpoint.safety.productMutations).toBe(0);
  expect(result.checkpoint.safety.actionCausedUnknown).toBe(0);
  expect(result.checkpoint.safety.databaseQueries).toBe(0);
  expect(result.checkpoint.safety.infrastructureQueries).toBe(0);
  expect(result.checkpoint.safety.externalPublicationAttempts).toBe(0);
  expect(result.checkpoint.privacyStatus).toBe('PASS');
  console.log(JSON.stringify({
    campaignId: result.campaignId,
    mode: manifest.mode,
    resultClass: result.resultClass,
    stopReason: result.stopReason,
    selectedJourneys: manifest.selectedJourneys,
    selectedEnvelopes: manifest.selectedEnvelopes,
    selectedApiScenarios: manifest.selectedApiScenarios,
    seeds: manifest.seedSet,
    completedWorkItems: result.checkpoint.completedWorkItemIds,
    anomalyObservations: result.checkpoint.anomalyObservations.length,
    uniqueClusters: result.checkpoint.anomalyClusters.length,
    dossiers: result.dossiers.length,
    l4: 'OUT_OF_SCOPE_BY_OWNER',
    safety: result.checkpoint.safety,
    privacy: result.checkpoint.privacyStatus,
    headline: result.morningBrief.headline,
  }, null, 2));
});
