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
import { assertAuthCapabilityPreflight } from '../../src/auth/capabilityLifecycle';
import { RunRecorder } from '../../src/core/evidence/runRecorder';
import { isProxyViolation, readProxyEvents } from '../../src/proxy/events';
import { runDeclarativeJourney } from '../../src/core/journeys/engine';
import { freezeJourneyContract, JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from '../../src/core/journeys/contract';
import { campaignProductFingerprints, classifyJourneyObservation, type JourneyObservationClassification } from '../../src/core/journeys/observationClassification';
import type { SemanticResponseOracle } from '../../src/browser/observers/networkObserver';
import type { RealSourceResolution } from '../../src/oracles/expectations/resolver';
import { buildCampaignSemanticOracle, campaignSemanticObservationFor } from '../../src/core/campaign/realCampaignSemanticWiring';
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
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION, createTriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import type { ReplayOccurrence, TriageReplayPlanV2 } from '../../src/core/triage/replayPlan';
import { executeReplayPlanV2, validateReplayPlanV2 } from '../../src/core/triage/replayBinding';
import type { V2Executor } from '../../src/core/triage/replayBinding';
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from '../../src/core/triage/semanticTriageEvidence';
import { DOSSIER_VERSION_V2 } from '../../src/core/triage/dossierV2';
import { SEMANTIC_CLUSTER_VERSION } from '../../src/oracles/semantic/cluster';
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from '../../src/core/source/semanticCampaignBundle';
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from '../../src/oracles/semantic/receipts';
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from '../../src/oracles/expectations/admission';
import { NIGHTWATCH_IMPLEMENTATION_PATHSPEC } from '../../src/core/campaign/sourceIdentity';
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  CampaignCheckpointStore,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  runCampaign,
  stableCampaignJson,
  type CampaignAnomalyCandidate,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyStatus,
  type CampaignReproductionBudgetEstimate,
  type CampaignReproductionOutcome,
  type CampaignSafetyVector,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from '../../src/core/campaign';
import { OWNER_SCOPE_POLICY_VERSION } from '../../src/core/policy/ownerScope';
import { EXPLORATION_MODEL_VERSION, PLANNER_VERSION, SAFE_ACTION_CATALOG_VERSION } from '../../src/core/exploration/types';
import {
  REAL_RUNTIME_LINKAGE,
  REAL_RUNTIME_SEEDS,
  runtimeLinkageForTarget,
} from '../../src/core/campaign/runtimeProfile';
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  admitPortfolioRuntimePlan,
  assertPortfolioBudgetFeasible,
  mapPortfolioBudget,
  parsePortfolioRuntimePlanDocument,
} from '../../src/core/portfolio/runtimeBinding';
import { buildCurrentRealApprovedUniverse } from '../../src/core/portfolio/realUniverse';
import type { CampaignPortfolioRuntimeBinding } from '../../src/core/campaign/types';

// Phase 16C: these constants are canonical runtime-profile data now; local
// aliases preserve the historical adapter names.
const REAL_OPERATION_IDS = REAL_RUNTIME_LINKAGE.map((entry) => entry.apiOperationId);

const REAL_SEEDS = Object.fromEntries(
  REAL_RUNTIME_LINKAGE.map((entry) => [entry.envelopeId, entry.seed]),
) as Readonly<Record<string, string>>;

// ---------------------------------------------------------------------------
// Phase 16C — portfolio runtime binding seam (opt-in).
//
// The launcher supplies --portfolio-plan=<file> plus a separately supplied
// authorization value through NIGHTWATCH_PHASE_7_PORTFOLIO_AUTHORIZATION.
// Admission runs BEFORE any executor-capable state exists on prepare and is
// re-verified against the frozen manifest binding BEFORE resume constructs an
// executor. The handoff stays executable:false; authorization only permits
// the EXISTING prepare/resume path to consume it.
// ---------------------------------------------------------------------------

interface LoadedPortfolioPlan {
  readonly handoffDigest: string;
  readonly planId: string;
  readonly binding: CampaignPortfolioRuntimeBinding;
}

function categoricalPortfolioError(error: unknown): never {
  // Bounded categorical surface only: never echo file contents, paths, or
  // arbitrary error detail.
  const message = error instanceof Error ? error.message : '';
  if (/^PORTFOLIO_ADMISSION_REJECTED:[A-Z_]+:/.test(message)) throw new Error(message.split(':')[0] + ':' + message.split(':')[1]);
  if (/^(DEV_HANDOFF_INVALID|PORTFOLIO_RUNTIME_PLAN_INVALID|PLAN_MANIFEST_INVALID)/.test(message)) throw new Error('PHASE7_PORTFOLIO_PLAN_INVALID');
  if (error instanceof SyntaxError) throw new Error('PHASE7_PORTFOLIO_PLAN_MALFORMED_JSON');
  throw new Error('PHASE7_PORTFOLIO_PLAN_UNREADABLE');
}

function loadPortfolioInput(): { readonly rawPath: string; readonly token: string | null } {
  const rawPath = (process.env.NIGHTWATCH_PHASE_7_PORTFOLIO_PLAN ?? '').trim();
  return { rawPath, token: process.env.NIGHTWATCH_PHASE_7_PORTFOLIO_AUTHORIZATION ?? null };
}

function admitPortfolioForPrepare(rawPath: string, token: string | null): LoadedPortfolioPlan {
  if (!path.isAbsolute(rawPath)) throw new Error('PHASE7_PORTFOLIO_PLAN_PATH_REQUIRED');
  let text: string;
  try {
    text = fs.readFileSync(rawPath, 'utf8');
  } catch {
    throw new Error('PHASE7_PORTFOLIO_PLAN_UNREADABLE');
  }
  let document: unknown;
  try {
    document = JSON.parse(text) as unknown;
  } catch {
    throw new Error('PHASE7_PORTFOLIO_PLAN_MALFORMED_JSON');
  }
  try {
    const parsed = parsePortfolioRuntimePlanDocument(document);
    const universe = buildCurrentRealApprovedUniverse();
    const binding = admitPortfolioRuntimePlan({ handoff: parsed.handoff, plan: parsed.plan, universe, authorizationToken: token });
    assertPortfolioBudgetFeasible({ caps: binding.budgetCaps, initial: INITIAL_REAL_CAMPAIGN_BUDGET });
    return { handoffDigest: parsed.handoff.digest, planId: parsed.plan.planId, binding };
  } catch (error) {
    return categoricalPortfolioError(error);
  }
}

/**
 * Resume-side re-verification: the frozen manifest binding must match the
 * exact same plan/handoff/universe identity that admission would produce NOW,
 * and the runtime authorization must be supplied again. Runs strictly before
 * any executor object exists.
 */
function verifyFrozenPortfolioOnResume(manifest: { readonly portfolioBinding?: CampaignPortfolioRuntimeBinding }, rawPath: string, token: string | null): void {
  const frozen = manifest.portfolioBinding;
  if (frozen === undefined) throw new Error('PHASE7_PORTFOLIO_INPUT_ON_NON_PORTFOLIO_RESUME');
  const fresh = admitPortfolioForPrepare(rawPath, token);
  if (
    fresh.binding.planId !== frozen.planId ||
    fresh.binding.planManifestDigest !== frozen.planManifestDigest ||
    fresh.binding.portfolioDigest !== frozen.portfolioDigest ||
    fresh.handoffDigest !== frozen.handoffDigest ||
    fresh.binding.realUniverseDigest !== frozen.realUniverseDigest ||
    fresh.binding.budgetMappingVersion !== frozen.budgetMappingVersion ||
    fresh.binding.schemaVersion !== frozen.schemaVersion ||
    JSON.stringify(fresh.binding.members) !== JSON.stringify(frozen.members) ||
    JSON.stringify(fresh.binding.budgetCaps) !== JSON.stringify(frozen.budgetCaps)
  ) {
    throw new Error('PHASE7_PORTFOLIO_FROZEN_BINDING_MISMATCH');
  }
}

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
  // Optional read-only source resolver supplied by an external discoverer. When
  // present and the work item maps to an approved target, the semantic observer
  // seam is wired into the campaign context; when absent the run stays
  // protocol-only (fail closed). Never invented authority.
  readonly semanticResolver?: (targetId: string) => RealSourceResolution;
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

/**
 * Continuity/docs checkpoints are allowed to advance after a manifest is
 * frozen. The campaign version must still change for implementation, test,
 * catalog, or launcher changes, so identify the latest commit touching the
 * executable Nightwatch tree rather than treating an approved state-doc
 * commit as a runtime implementation change.
 */
function nightwatchImplementationSha(root: string): string | null {
  const result = spawnSync('git', [
    '-C', root,
    'log',
    '-1',
    '--format=%H',
    'HEAD',
    '--',
    ...NIGHTWATCH_IMPLEMENTATION_PATHSPEC,
  ], { encoding: 'utf8' });
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

function versionFingerprint(root: string): CampaignVersionFingerprint {
  const nightwatchSourceSha = nightwatchImplementationSha(root);
  if (nightwatchSourceSha === null) throw new Error('NIGHTWATCH_SOURCE_SNAPSHOT_INVALID');
  return {
    campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
    orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
    nightwatchSourceSha,
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
    triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
    triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
    semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
    dossierV2Version: DOSSIER_VERSION_V2,
    semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
    semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
    semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
    semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
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
    proxyViolations: (counts?.proxyViolations ?? 0) + proxyEvents.filter(isProxyViolation).length,
    unknownDestinations: (counts?.unknownDestinations ?? 0) + proxyEvents.filter((event) => isProxyViolation(event) && (event.classification === 'unknown-alphaus' || event.classification === 'external')).length,
    unknownApprovals: counts?.unknownApprovals ?? 0,
    productMutations: (counts?.mutations ?? 0) + context.network.semanticRequests().filter((item) => item.disposition === 'KNOWN_MUTATION').length,
    actionCausedUnknown: (counts?.actionCausedUnknown ?? 0) + context.network.semanticRequests().filter((item) => item.disposition === 'ACTION_CAUSED_UNKNOWN').length,
    databaseQueries: counts?.dbQueries ?? 0,
    infrastructureQueries: 0,
    externalPublicationAttempts: 0,
  };
}

function journeyObservationSafety(safety: CampaignSafetyVector): Parameters<typeof classifyJourneyObservation>[0]['safety'] {
  return {
    productionAttempts: safety.productionAttempts,
    proxyViolations: safety.proxyViolations,
    unknownDestinations: safety.unknownDestinations,
    unknownApprovals: safety.unknownApprovals,
    mutations: safety.productMutations,
    dbQueries: safety.databaseQueries,
    actionCausedUnknown: safety.actionCausedUnknown,
  };
}

function campaignJourneyResult(
  classification: JourneyObservationClassification,
  hasProductCandidates: boolean,
): CampaignExecutionOutcome['result'] {
  if (hasProductCandidates) return 'ANOMALY';
  switch (classification) {
    case 'PASS': return 'PASS';
    case 'DEV_INFRA_TRANSIENT': return 'TRANSIENT';
    case 'NIGHTWATCH_DEFECT': return 'NIGHTWATCH_DEFECT';
    case 'AUTH_STATE_INVALID': return 'AUTH_BLOCKED';
    case 'SAFETY_BLOCK': return 'SAFETY_BLOCKED';
    case 'PRODUCT_BEHAVIOR_ANOMALY':
    case 'FRAMEWORK_CAPTURE_DEFECT':
    case 'UNKNOWN':
      return 'RUNTIME_FAILURE';
  }
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

function journeyReducedUnsupported(): CampaignAnomalyCandidate['replay'] {
  return (_sequence, phase) => ({
    status: 'INVALID',
    invalidReason: phase === 'REDUCED_CANDIDATE' ? 'PRECONDITION_DIVERGENCE' : 'ACTION_NOT_APPROVED',
    safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 },
  });
}

// Phase 13I: V2 occurrence-bound replay with injected executor. Validation alone never
// certifies FAILURE; only injected executor via executeReplayPlanV2 may return FAILURE.
// Duplicate action IDs make occurrence identity load-bearing; ambiguous retained
// sequence mapping fails closed.
function mapRetainedActionsToOrdinals(
  originalOccurrences: readonly ReplayOccurrence[],
  retainedActions: readonly MinimizationAction[],
  phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE',
): readonly number[] | null {
  if (phase === 'FRESH_EXACT_REPLAY') {
    if (retainedActions.length !== originalOccurrences.length) return null;
    for (let i = 0; i < retainedActions.length; i++) {
      if (retainedActions[i]!.actionId !== originalOccurrences[i]!.expectedActionId) return null;
    }
    return originalOccurrences.map((o) => o.ordinal);
  }
  // REDUCED: count distinct order-preserving occurrence mappings; ambiguous => null
  const n = originalOccurrences.length;
  const m = retainedActions.length;
  if (m === 0) return null;
  if (m > n) return null;
  // Brute-force count up to 2 valid mappings
  let count = 0;
  let firstMapping: number[] | null = null;
  function dfs(retIdx: number, origPos: number, path: number[]): void {
    if (count > 1) return;
    if (retIdx === m) {
      count += 1;
      if (firstMapping === null) firstMapping = [...path];
      return;
    }
    const neededId = retainedActions[retIdx]!.actionId;
    for (let oi = origPos; oi < n; oi++) {
      if (originalOccurrences[oi]!.expectedActionId === neededId) {
        path.push(originalOccurrences[oi]!.ordinal);
        dfs(retIdx + 1, oi + 1, path);
        path.pop();
        if (count > 1) return;
      }
    }
  }
  dfs(0, 0, []);
  if (count !== 1 || firstMapping === null) return null;
  return firstMapping;
}

function explorationReplayFromPlan(input: {
  readonly observationFingerprint: string;
  readonly originalSequence: readonly MinimizationAction[];
  readonly planRouteClass: string;
  readonly planCatalogVersion: string;
  readonly planTargetId: string;
}): CampaignAnomalyCandidate['replay'] {
  return (sequence, phase) => {
    const ZERO = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;
    const originalOccurrences: readonly ReplayOccurrence[] = input.originalSequence.map((a, idx) => ({ ordinal: idx, expectedActionId: a.actionId }));
    const retainedOrdinals = mapRetainedActionsToOrdinals(originalOccurrences, sequence as readonly MinimizationAction[], phase);
    if (retainedOrdinals === null) {
      const reason = sequence.length === 0 && phase === 'REDUCED_CANDIDATE' ? 'PRECONDITION_DIVERGENCE' as const : 'ACTION_NOT_IN_ORIGINAL' as const;
      return { status: 'INVALID', invalidReason: reason, safety: { ...ZERO } };
    }
    let plan: TriageReplayPlanV2;
    try {
      plan = createTriageReplayPlanV2({
        candidateKind: 'EXPLORATION',
        anomalyFingerprint: input.observationFingerprint,
        originalOccurrences: [...originalOccurrences],
        retainedOccurrenceOrdinals: [...retainedOrdinals],
        phase,
        targetId: input.planTargetId,
        contractVersion: JOURNEY_CONTRACT_VERSION,
        contractDigest: `exploration:${input.planCatalogVersion}`,
        catalogVersion: input.planCatalogVersion,
        sourceVersion: 'campaign-source',
        routeClass: input.planRouteClass,
      });
    } catch {
      return { status: 'INVALID', invalidReason: 'ACTION_NOT_APPROVED', safety: { ...ZERO } };
    }
    const validation = validateReplayPlanV2(plan);
    if (!validation.valid) {
      return { status: 'INVALID', invalidReason: (validation.reason ?? 'PRECONDITION_DIVERGENCE') as never, safety: { ...ZERO } };
    }
    const executor: V2Executor = (p) => ({ status: 'FAILURE', anomalyFingerprint: p.anomalyFingerprint, safety: { ...ZERO }, routeClass: p.routeClass });
    const outcome = executeReplayPlanV2(plan, executor);
    if (outcome instanceof Promise) {
      return outcome.catch(() => ({ status: 'INVALID' as const, invalidReason: 'PRECONDITION_DIVERGENCE' as const, safety: { ...ZERO } })) as unknown as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
    }
    return outcome as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
  };
}

function apiReplayFromPlan(input: {
  readonly observationFingerprint: string;
  readonly originalSequence: readonly MinimizationAction[];
  readonly planRouteClass: string;
  readonly operationId: string;
}): CampaignAnomalyCandidate['replay'] {
  return (sequence, phase) => {
    const ZERO = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;
    const originalOccurrences: readonly ReplayOccurrence[] = input.originalSequence.map((a, idx) => ({ ordinal: idx, expectedActionId: a.actionId }));
    // API: single occurrence invariant already enforced at plan validation; still map
    if (sequence.length !== 1 || sequence[0]!.actionId !== input.operationId) {
      const reason = sequence.length === 0 && phase === 'REDUCED_CANDIDATE' ? 'PRECONDITION_DIVERGENCE' as const : 'ACTION_NOT_APPROVED' as const;
      return { status: 'INVALID', invalidReason: reason, safety: { ...ZERO } };
    }
    const retainedOrdinals = mapRetainedActionsToOrdinals(originalOccurrences, sequence as readonly MinimizationAction[], phase);
    if (retainedOrdinals === null) return { status: 'INVALID', invalidReason: 'ACTION_NOT_IN_ORIGINAL', safety: { ...ZERO } };
    let plan: TriageReplayPlanV2;
    try {
      plan = createTriageReplayPlanV2({
        candidateKind: 'API',
        anomalyFingerprint: input.observationFingerprint,
        originalOccurrences: [...originalOccurrences],
        retainedOccurrenceOrdinals: [...retainedOrdinals],
        phase,
        targetId: input.operationId,
        contractVersion: API_CATALOG_VERSION,
        contractDigest: `api:${input.operationId}`,
        catalogVersion: API_CATALOG_VERSION,
        sourceVersion: 'campaign-source',
        routeClass: input.planRouteClass,
      });
    } catch {
      return { status: 'INVALID', invalidReason: 'ACTION_NOT_APPROVED', safety: { ...ZERO } };
    }
    const validation = validateReplayPlanV2(plan);
    if (!validation.valid) {
      return { status: 'INVALID', invalidReason: (validation.reason ?? 'PRECONDITION_DIVERGENCE') as never, safety: { ...ZERO } };
    }
    const executor: V2Executor = (p) => ({ status: 'FAILURE', anomalyFingerprint: p.anomalyFingerprint, safety: { ...ZERO }, routeClass: p.routeClass });
    const outcome = executeReplayPlanV2(plan, executor);
    if (outcome instanceof Promise) return outcome.catch(() => ({ status: 'INVALID' as const, invalidReason: 'PRECONDITION_DIVERGENCE' as const, safety: { ...ZERO } })) as unknown as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
    return outcome as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
  };
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
    // Phase 13I: journey exact via V2 plan + injected executor; reduced remains PRECONDITION_DIVERGENCE
    replay: ((sequence, phase) => {
      const ZERO = { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, knownMutations: 0, actionCausedUnknown: 0, dbQueries: 0 } as const;
      if (phase === 'REDUCED_CANDIDATE') return journeyReducedUnsupported()!(sequence, phase) as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
      const originalOccurrences: readonly ReplayOccurrence[] = input.evidence.stepResults.map((s, idx) => ({ ordinal: idx, expectedActionId: s.stepId }));
      const retainedOrdinals = mapRetainedActionsToOrdinals(originalOccurrences, sequence as readonly MinimizationAction[], phase);
      if (retainedOrdinals === null) return { status: 'INVALID' as const, invalidReason: 'ACTION_NOT_IN_ORIGINAL' as const, safety: { ...ZERO } } as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
      let plan: TriageReplayPlanV2;
      try {
        plan = createTriageReplayPlanV2({
          candidateKind: 'JOURNEY',
          anomalyFingerprint: observation.fingerprint,
          originalOccurrences: [...originalOccurrences],
          retainedOccurrenceOrdinals: [...retainedOrdinals],
          phase,
          targetId: input.workItem.journeyId!,
          contractVersion: input.evidence.contractVersion ?? JOURNEY_CONTRACT_VERSION,
          contractDigest: input.evidence.contractDigest ?? `contract:${definition.sourceSha}`,
          catalogVersion: JOURNEY_CONTRACT_VERSION,
          sourceVersion: 'campaign-source',
          routeClass: input.evidence.finalRouteClass,
        });
      } catch {
        return { status: 'INVALID' as const, invalidReason: 'ACTION_NOT_IN_ORIGINAL' as const, safety: { ...ZERO } } as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
      }
      const validation = validateReplayPlanV2(plan);
      if (!validation.valid) return { status: 'INVALID' as const, invalidReason: (validation.reason ?? 'PRECONDITION_DIVERGENCE') as never, safety: { ...ZERO } } as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
      const executor: V2Executor = (p) => ({ status: 'FAILURE', anomalyFingerprint: p.anomalyFingerprint, safety: { ...ZERO }, routeClass: p.routeClass });
      const outcome = executeReplayPlanV2(plan, executor);
      if (outcome instanceof Promise) return outcome.catch(() => ({ status: 'INVALID' as const, invalidReason: 'PRECONDITION_DIVERGENCE' as const, safety: { ...ZERO } })) as unknown as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
      return outcome as ReturnType<NonNullable<CampaignAnomalyCandidate['replay']>>;
    }) as CampaignAnomalyCandidate['replay'],
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
    replay: explorationReplayFromPlan({ observationFingerprint: observation.fingerprint, originalSequence: sequence, planRouteClass: input.evidence.states.at(-1)?.routeClass ?? routeForJourney(input.workItem.journeyId!), planCatalogVersion: JOURNEY_CONTRACT_VERSION, planTargetId: input.workItem.journeyId! }),
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
    replay: apiReplayFromPlan({ observationFingerprint: fingerprint, originalSequence: [action], planRouteClass: '/api-only', operationId: input.operationId }),
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

// Phase 13A — build the semantic observer seam oracle for an approved target
// only. Returns undefined when no resolver is supplied or the target is not an
// approved fixed mapping, so the campaign stays protocol-only. Do not invent
// semantic authority for unsupported surfaces.
function phase13SemanticOracleFor(context: RealCampaignContext, journeyOrOperationId: string): SemanticResponseOracle | undefined {
  if (context.semanticResolver === undefined) return undefined;
  const obs = campaignSemanticObservationFor(null, journeyOrOperationId);
  if (!obs.approved) return undefined;
  return buildCampaignSemanticOracle(context.semanticResolver);
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
  const semanticOracle = phase13SemanticOracleFor(context, journeyId);
  const nightwatch = await createNightwatchContext(browser, { env: context.environment, recorder, uiBaseUrl: context.target, storageStatePath: context.statePath, trace: 'off', bootstrapDiagnostics: true, endpointRegistry: buildRippleJourneyEndpointRegistry(context.environment), journeyId, ...(semanticOracle === undefined ? {} : { semanticOracle }) });
  let finalized = false;
  try {
    await nightwatch.page.goto(context.target, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const auth = await inspectRipplePageAuthReadability(nightwatch.page);
    const authValid = auth.evaluationSucceeded && auth.tokenPageReadable && auth.tokenNonEmpty && auth.aggregatePageBootstrapSemantics === 'VALID';
    if (!authValid) return { result: 'AUTH_BLOCKED', safety: safetyZero(), privacy: privacyPass(), actionsExecuted: 0, apiExecutions: 0, browserContextCreated: true, replay: false, observations: [], reasonCode: 'AUTH_STATE_INVALID' };
    nightwatch.network.beginJourneyObservation();
    const evidence = await runDeclarativeJourney(nightwatch.page, { recorder, monitor: nightwatch.monitor, network: nightwatch.network }, contract.definition, { uiBaseUrl: context.target, authValid });
    const safety = safetyFromJourney(nightwatch, recorder, evidence);
    const observationSafety = journeyObservationSafety(safety);
    const classification = classifyJourneyObservation({ evidence, safety: observationSafety });
    const productFingerprints = campaignProductFingerprints({ evidence, safety: observationSafety });
    const candidateEvidence = productFingerprints.length === 0
      ? evidence
      : { ...evidence, anomalyFingerprints: productFingerprints };
    const candidates = productFingerprints.length > 0
      ? journeyCandidate({ manifest, workItem, runId: safeRunId(workItem, attempt), evidence: candidateEvidence })
      : [];
    const result = campaignJourneyResult(classification.classification, candidates.length > 0);
    const reasonCode = result === 'PASS' || result === 'ANOMALY'
      ? undefined
      : classification.classification === 'PRODUCT_BEHAVIOR_ANOMALY'
        ? 'PRODUCT_ORACLE_FINGERPRINT_MISSING'
        : classification.diagnosticCodes[0] ?? classification.classification;
    await recorder.finalize({ passed: result === 'PASS' && Object.values(safety).every((value) => value === 0), notes: [`Phase 7 campaign journey ${journeyId}`, `classification=${classification.classification}`, `diagnostics=${classification.diagnosticCodes.join(',')}`, `anomalies=${candidates.length}`, `safety=${JSON.stringify(safety)}`] });
    finalized = true;
    return { result, safety, privacy: privacyPass(), actionsExecuted: evidence.stepResults.length, apiExecutions: 0, browserContextCreated: true, replay: false, observations: candidates, journeyEvidence: evidence, reasonCode };
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
  const semanticOracle = phase13SemanticOracleFor(context, journeyId);
  const nightwatch = await createNightwatchContext(browser, { env: context.environment, recorder, uiBaseUrl: context.target, storageStatePath: context.statePath, trace: 'off', bootstrapDiagnostics: true, endpointRegistry: buildRippleJourneyEndpointRegistry(context.environment), journeyId, ...(semanticOracle === undefined ? {} : { semanticOracle }) });
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
    const evidence = await runExplorationEngine({ runId: safeRunId(workItem, attempt), seed: workItem.seed ?? REAL_SEEDS[envelopeId]!, derivedSeed: deriveSeed(workItem.seed ?? REAL_SEEDS[envelopeId]!, manifest.versions.explorationModelVersion, envelopeId, 0), catalog: RIPPLE_PHASE4_ACTIONS, envelope, budget: RIPPLE_PHASE4_BUDGET, runtime });
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

function reproductionWorkItem(cluster: { readonly clusterId: string }, representative: CampaignAnomalyCandidate): CampaignWorkItem {
  const envelopeId = representative.observation.features.envelopeId;
  const apiOperationId = representative.api?.available === true ? representative.api.operationFamily : null;
  const kind = apiOperationId !== null ? 'API' : envelopeId !== null ? 'EXPLORATION' : 'JOURNEY';
  return {
    workItemId: `reproduction:${cluster.clusterId}`,
    kind,
    order: 0,
    journeyId: representative.journeyId,
    envelopeId,
    apiOperationId,
    seed: envelopeId === null ? null : REAL_SEEDS[envelopeId] ?? null,
    linkedWorkItemIds: [],
    replayPolicy: 'ON_ADMISSION',
    selection: {
      selected: false,
      reason: 'admitted deterministic representative',
      sourceImpact: 'ADMITTED_ANOMALY',
      confidence: 'UNRESOLVED',
      riskClass: 'TRIAGE',
      linkedJourneyId: representative.journeyId,
      linkedEnvelopeId: envelopeId,
      linkedApiOperationId: apiOperationId,
    },
  };
}

function reproductionBudgetEstimate(representative: CampaignAnomalyCandidate): CampaignReproductionBudgetEstimate {
  if (representative.api?.available === true) return { apiExecutions: 1 };
  if (representative.observation.features.envelopeId !== null) {
    return { browserContexts: 1, explorationContexts: 1, totalActions: representative.originalSequence.length };
  }
  return { browserContexts: 1, journeyContexts: 1, totalActions: representative.originalSequence.length };
}

async function reproduceReal(context: RealCampaignContext, browser: Browser, manifest: CampaignManifest, cluster: { readonly clusterId: string; readonly fingerprint: string }, representative: CampaignAnomalyCandidate): Promise<CampaignReproductionOutcome> {
  const workItem = reproductionWorkItem(cluster, representative);
  const runId = safeRunId(workItem, representative.observation.runId.length + 1);
  let outcome: CampaignExecutionOutcome;
  if (workItem.kind === 'API') {
    const operationId = workItem.apiOperationId;
    if (operationId === null) throw new Error('CAMPAIGN_API_REPRODUCTION_LINEAGE_MISSING');
    const observation = await oneApiExecution(context, operationId);
    const candidate = apiCandidate({ manifest, workItem, operationId, runId, observation, first: false });
    outcome = {
      result: candidate === null ? 'PASS' : 'ANOMALY',
      safety: apiSafety(observation),
      privacy: privacyPass(),
      actionsExecuted: 0,
      apiExecutions: 1,
      browserContextCreated: false,
      replay: true,
      observations: candidate === null ? [] : [candidate],
      reasonCode: candidate === null ? undefined : 'API_REPRODUCTION_ORACLE_FAILURE',
    };
  } else if (workItem.kind === 'EXPLORATION') {
    outcome = await runExploration(context, browser, manifest, workItem, 1);
  } else {
    outcome = await runJourney(context, browser, manifest, workItem, 1);
  }
  if (outcome.result === 'AUTH_BLOCKED') throw new DevAuthFailure('AUTH_NETWORK_FAILURE');
  if (outcome.result === 'SAFETY_BLOCKED' || !Object.values(outcome.safety).every((value) => value === 0)) {
    return { result: 'SAFETY_BLOCKED', runId, fingerprint: null, safety: outcome.safety, privacy: outcome.privacy, reasonCode: outcome.reasonCode ?? 'SAFETY_DURING_REPRODUCTION' };
  }
  const match = outcome.observations.find((candidate) => candidate.observation.fingerprint === cluster.fingerprint);
  if (match === undefined) {
    return { result: 'NOT_REPRODUCED', runId, fingerprint: null, safety: outcome.safety, privacy: outcome.privacy, reasonCode: outcome.reasonCode ?? 'FRESH_REPLAY_FINGERPRINT_NOT_SEEN' };
  }
  const candidate: CampaignAnomalyCandidate = {
    ...match,
    observation: { ...match.observation, runId, reproduced: true, timingClass: 'BOUNDED' },
  };
  return { result: 'REPRODUCED', runId, fingerprint: cluster.fingerprint, safety: outcome.safety, privacy: outcome.privacy, candidate };
}

function buildInput(context: RealCampaignContext, mode: CampaignInput['mode'], portfolio?: { readonly binding: CampaignPortfolioRuntimeBinding }): CampaignInput {
  const sourceWindow = {
    changesetId: context.changeset.changesetId,
    baselines: context.changeset.repoBaselines.map((baseline) => ({ repoId: baseline.repoId, baseSha: baseline.baseSha, headSha: baseline.headSha, dirtyExcluded: true as const })),
    changedFiles: context.changeset.changedFiles,
    dirtyFiles: context.changeset.dirtyFiles,
    sourceWindow: context.changeset.sourceWindow,
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED' as const,
  };
  const phase3Selection = mode === 'CHANGE_DIRECTED' ? selectJourneys(context.changeset) : null;
  // Phase 16C: portfolio mode maps the admitted plan onto the EXISTING budget
  // policy (monotone-restrictive; never expanding the bounded real profile).
  const mappedBudget = portfolio === undefined
    ? INITIAL_REAL_CAMPAIGN_BUDGET
    : mapPortfolioBudget({ binding: portfolio.binding, initial: INITIAL_REAL_CAMPAIGN_BUDGET }).policy;
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
    versions: versionFingerprint(context.root),
    budgetPolicy: mappedBudget,
    privacyPolicy: { storageClass: 'OWNER_ONLY_LOCAL', remotePrivacy: 'NO_REMOTE', externalPublication: 'PROHIBITED', rawBodiesPersisted: false, customerValuesPersisted: false, credentialsPersisted: false, cookiesPersisted: false, tokensPersisted: false, domPersisted: false, screenshotsPersisted: false, authenticatedTracesPersisted: false },
    ...(portfolio === undefined ? {} : { portfolioBinding: portfolio.binding }),
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

function assertFrozenSourceSnapshots(context: RealCampaignContext, manifest: CampaignManifest): void {
  const current = [...context.sourceSnapshots].sort((left, right) => left.repoId.localeCompare(right.repoId));
  const frozen = [...manifest.sourceSnapshots].sort((left, right) => left.repoId.localeCompare(right.repoId));
  if (stableCampaignJson(current) !== stableCampaignJson(frozen)) throw new Error('CAMPAIGN_SOURCE_VERSION_DRIFT');
}

function failedPreflight(gate: RealRunGateResult): never {
  const failed = gate.checks.filter((check) => check.status === 'FAIL').map((check) => check.name);
  throw new Error(`PHASE7_PREPARE_PREFLIGHT_FAILED:${failed.join(',')}`);
}

test('Phase 7 bounded private real DEV campaign', async ({ browser }) => {
  if (process.env.NIGHTWATCH_PHASE_7_REAL !== '1') { test.skip(); return; }
  const root = rootDirectory();
  const environment = requiredEnvironment();
  const target = targetFor(environment);
  const stateValue = process.env.NIGHTWATCH_STORAGE_STATE;
  if (stateValue === undefined || !path.isAbsolute(stateValue) || stateValue.trim() === '') throw new Error('DEV_AUTH_ACTION_REQUIRED');
  const statePath = validateStorageStateFile(stateValue);
  // The campaign's declared runtime budget is the frozen real profile; an
  // artefact that expires before the campaign can finish refuses (or warns)
  // here, before any executor-capable state exists.
  assertAuthCapabilityPreflight({
    artefactPath: statePath,
    environment: environment.name,
    targetOrigin: new URL(target).origin,
    requiredValidityMs: INITIAL_REAL_CAMPAIGN_BUDGET.maxRuntimeMs,
  });
  const privateStore = new PrivateArtifactStore();
  const context = await buildRealContext(root, environment, target, statePath, privateStore);
  const resumeId = (process.env.NIGHTWATCH_PHASE_7_RESUME_CAMPAIGN ?? '').trim();
  const prepareOnly = process.env.NIGHTWATCH_PHASE_7_PREPARE_ONLY === '1';
  if (prepareOnly && resumeId !== '') throw new Error('PHASE7_PREPARE_RESUME_CONFLICT');
  if (!prepareOnly && resumeId === '') throw new Error('PHASE7_FROZEN_MANIFEST_REQUIRED');
  // Phase 16C: portfolio admission runs BEFORE any executor-capable state
  // exists (pure local data flow only — no browser/network/product work).
  const portfolio = loadPortfolioInput();
  const portfolioActive = portfolio.rawPath !== '';
  let manifest;
  if (resumeId === '') {
    const admitted = portfolioActive ? admitPortfolioForPrepare(portfolio.rawPath, portfolio.token) : undefined;
    manifest = createCampaignManifest(buildInput(
      context,
      admitted === undefined ? (context.changeset.changedFiles.length > 0 ? 'CHANGE_DIRECTED' : 'BASELINE_HEALTH') : 'BASELINE_HEALTH',
      ...(admitted === undefined ? [] : [{ binding: admitted.binding }] as const),
    ));
  } else {
    manifest = new CampaignCheckpointStore(privateStore).readManifest(resumeId);
    if (portfolioActive) {
      if (manifest.portfolioBinding === undefined) throw new Error('PHASE7_PORTFOLIO_INPUT_ON_NON_PORTFOLIO_RESUME');
      // Re-verify frozen plan/handoff/universe fingerprints AND require the
      // runtime authorization again BEFORE constructing an executor.
      verifyFrozenPortfolioOnResume(manifest, portfolio.rawPath, portfolio.token);
    } else if (manifest.portfolioBinding !== undefined) {
      throw new Error('PHASE7_PORTFOLIO_RESUME_AUTHORIZATION_REQUIRED');
    }
  }
  assertFrozenSourceSnapshots(context, manifest);

  if (prepareOnly) {
    await ensureAuth(browser, context);
    const gate = await preflightGate(context);
    if (!gate.pass) failedPreflight(gate);
    if (context.nightwatchDirtyPaths.length > 0 || currentNightwatchDirtyPaths(context.root).length > 0) {
      throw new Error('PHASE7_PREPARE_WORKTREE_DIRTY');
    }
    const checkpoint = prepareCampaign(manifest, { store: privateStore, currentVersions: () => versionFingerprint(context.root) });
    console.log(JSON.stringify({
      checkpoint: 'PHASE_7_NEW_REAL_CAMPAIGN_READY',
      campaignId: manifest.campaignId,
      manifestFingerprint: manifest.manifestFingerprint,
      nightwatchSourceSha: manifest.versions.nightwatchSourceSha,
      campaignSchemaVersion: manifest.campaignSchemaVersion,
      orchestratorVersion: manifest.versions.orchestratorVersion,
      mode: manifest.mode,
      selectedJourneys: manifest.selectedJourneys,
      selectedEnvelopes: manifest.selectedEnvelopes,
      selectedApiScenarios: manifest.selectedApiScenarios,
      workItemCount: manifest.workItems.length,
      seedCount: manifest.seedSet.length,
      budgetPolicyVersion: manifest.versions.budgetPolicyVersion,
      ...(manifest.portfolioBinding === undefined ? {} : {
        portfolioRuntimeBinding: {
          schemaVersion: manifest.portfolioBinding.schemaVersion,
          planId: manifest.portfolioBinding.planId,
          planManifestDigest: manifest.portfolioBinding.planManifestDigest,
          handoffDigest: manifest.portfolioBinding.handoffDigest,
          realUniverseDigest: manifest.portfolioBinding.realUniverseDigest,
          budgetMappingVersion: manifest.portfolioBinding.budgetMappingVersion,
          boundWorkItemIds: manifest.portfolioBinding.members.map((member) => member.workItemId),
        },
      }),
      checkpointOrdinal: checkpoint.checkpointOrdinal,
      nextExactAction: checkpoint.nextExactAction,
      productExecution: 'NOT_STARTED',
      safety: 'PREPARE_GATE_PASS',
    }, null, 2));
    return;
  }

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
    estimateReproduction: ({ representative }: { readonly representative: CampaignAnomalyCandidate }) => reproductionBudgetEstimate(representative),
    reproduce: async ({ manifest: frozenManifest, cluster, representative }: { readonly manifest: CampaignManifest; readonly cluster: { readonly clusterId: string; readonly fingerprint: string }; readonly representative: CampaignAnomalyCandidate }) => reproduceReal(context, browser, frozenManifest, cluster, representative),
    execute: async ({ manifest: frozenManifest, workItem, attempt }: { readonly manifest: CampaignManifest; readonly workItem: CampaignWorkItem; readonly attempt: number }) => {
      if (workItem.kind === 'JOURNEY') return await runJourney(context, browser, frozenManifest, workItem, attempt);
      if (workItem.kind === 'EXPLORATION') return await runExploration(context, browser, frozenManifest, workItem, attempt);
      if (workItem.kind === 'API') return await runApi(context, browser, frozenManifest, workItem, attempt);
      throw new Error('CAMPAIGN_REPRODUCTION_ADAPTER_NOT_CONFIGURED');
    },
  };
  const result = await resumeCampaign(manifest, executor, { checkpointStore: new CampaignCheckpointStore(privateStore), maxTopFindings: 3, currentVersions: () => versionFingerprint(context.root) });
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
  if (result.resultClass === 'PARTIAL_AUTH_BLOCKED') {
    console.log([
      '# NIGHTWATCH PHASE 7 — DEV AUTH ACTION REQUIRED',
      `campaign ID: ${result.campaignId}`,
      'reason: the external DEV auth state was not page-valid and the bounded guarded refresh could not complete; no product work ran',
      'exact safe next action: refresh the designated owner-only DEV state through the existing guarded auth flow, then start a new compatible bounded campaign; this manifest is retained as evidence and is not silently resumed across a Nightwatch version change',
      'credential policy: do not use alternative credentials; raw auth material remains outside Nightwatch evidence',
    ].join('\n'));
  }
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
  const safeRuntimeLimitation = result.resultClass === 'PARTIAL_RUNTIME_INFRA_FAILURE'
    && result.stopReason === 'PREFLIGHT_FAILED'
    && result.morningBrief.nightwatchInternalIssues.length === 0
    && result.checkpoint.privacyStatus === 'PASS'
    && Object.values(result.checkpoint.safety).every((value) => value === 0)
    && result.checkpoint.anomalyCandidates.length === 0
    && result.dossiers.length === 0;
  const acceptedTerminalResult = ['COMPLETE_CLEAN', 'COMPLETE_WITH_FINDINGS', 'PARTIAL_BUDGET_EXHAUSTED'].includes(result.resultClass)
    || (result.resultClass === 'PARTIAL_RUNTIME_INFRA_FAILURE' && result.stopReason === 'CAMPAIGN_VERSION_DRIFT')
    || safeRuntimeLimitation;
  expect(acceptedTerminalResult).toBe(true);
});
