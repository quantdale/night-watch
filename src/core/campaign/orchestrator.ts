// ---------------------------------------------------------------------------
// Phase 7 private autonomous campaign orchestrator.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { evaluateAnomalyAdmission, type AnomalyObservation as AdmissionObservation } from '../journeys/admission';
import { assertOwnerPolicyAllows, OwnerPolicyBlockedError } from '../policy/ownerScope';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import { clusterAnomalies, suppressDuplicateClusters } from '../triage/clustering';
import { createIncompleteDossier, validateBugDossier } from '../triage/dossier';
import { triageAnomaly } from '../triage/pipeline';
import { REAL_DEV_MINIMIZATION_BUDGET } from '../triage/types';
import type {
  AnomalyCluster,
  AnomalyObservation as TriageAnomalyObservation,
  BugDossier,
  CandidateReplayOutcome,
  MinimizationAction,
  OvernightRunRecord,
} from '../triage/types';
import { buildCampaignMorningBrief, renderCampaignMorningBrief, validateCampaignMorningBrief } from './brief';
import { CampaignBudgetManager, CampaignTimeBudget, emptyBudgetUsage } from './budget';
import { CampaignCheckpointStore, validateCampaignCheckpoint } from './checkpoint';
import { assertManifestCompatible, stableCampaignJson, validateCampaignManifest } from './identity';
import { detectFailureStorm, type FailureStorm } from './storm';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  type CampaignAnomalyCandidate,
  type CampaignCheckpoint,
  type CampaignExecutionContext,
  type CampaignExecutionOutcome,
  type CampaignExecutionRecord,
  type CampaignExecutor,
  type CampaignManifest,
  type CampaignMorningBrief,
  type CampaignPreflightResult,
  type CampaignPrivacyStatus,
  type CampaignReproductionBudgetEstimate,
  type CampaignReproductionOutcome,
  type CampaignReproductionRecord,
  type CampaignResultClass,
  type CampaignRunOptions,
  type CampaignRunResult,
  type CampaignSafetyVector,
  type CampaignWorkItem,
  type CampaignWorkKind,
  type CampaignWorkState,
  type ExecutionGuarantee,
  ZERO_CAMPAIGN_PRIVACY,
  ZERO_CAMPAIGN_SAFETY,
} from './types';
import type { EvidenceLevel } from '../triage/types';

const DEFAULT_RESUME_RECIPE = [
  'validate owner policy and private storage',
  'validate manifest and catalog fingerprints',
  'skip completed logical work items',
  'replay any interrupted RUNNING item exactly through its safe adapter',
  'continue at the checkpoint nextExactAction',
] as const;

export class CampaignProcessInterruptionError extends Error {
  readonly code = 'PROCESS_INTERRUPTION' as const;

  constructor() {
    super('PROCESS_INTERRUPTION');
    this.name = 'CampaignProcessInterruptionError';
  }
}

function nowIso(now: () => Date): string {
  return now().toISOString();
}

function safeErrorCode(error: unknown): string {
  if (error instanceof OwnerPolicyBlockedError) return 'OWNER_POLICY_BLOCKED';
  if (error instanceof CampaignProcessInterruptionError) return 'PROCESS_INTERRUPTION';
  const message = error instanceof Error ? error.message : String(error);
  const code = message.split(':', 1)[0] ?? message;
  if (code === 'CAMPAIGN_BUDGET_EXHAUSTED' || code === 'BUDGET_EXHAUSTED') return 'BUDGET_EXHAUSTED';
  if (code === 'CAMPAIGN_VERSION_DRIFT') return 'CAMPAIGN_VERSION_DRIFT';
  if (code === 'CAMPAIGN_MANIFEST_INTEGRITY_INVALID' || code === 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID' || code === 'CAMPAIGN_ARTIFACT_INVALID') return 'CORRUPT_STATE';
  if (code === 'CAMPAIGN_RUNTIME_TIMEOUT') return 'RUNTIME_TIMEOUT';
  if (code === 'AUTH_BLOCKED' || code.startsWith('AUTH_')) return 'AUTH_BLOCKED';
  if (code === 'SAFETY_EVENT' || code.startsWith('SAFETY_') || code.startsWith('PRODUCTION_') || code.startsWith('UNKNOWN_') || code.startsWith('MUTATION_')) return 'SAFETY_EVENT';
  if (code === 'PRIVACY_BLOCKED' || code.startsWith('PRIVACY_') || code.startsWith('PRIVATE_ARTIFACT_PRIVACY_')) return 'PRIVACY_BLOCKED';
  return 'NIGHTWATCH_INTERNAL_DEFECT';
}

function addSafety(left: CampaignSafetyVector, right: CampaignSafetyVector): CampaignSafetyVector {
  return {
    productionAttempts: left.productionAttempts + right.productionAttempts,
    proxyViolations: left.proxyViolations + right.proxyViolations,
    unknownDestinations: left.unknownDestinations + right.unknownDestinations,
    unknownApprovals: left.unknownApprovals + right.unknownApprovals,
    productMutations: left.productMutations + right.productMutations,
    actionCausedUnknown: left.actionCausedUnknown + right.actionCausedUnknown,
    databaseQueries: left.databaseQueries + right.databaseQueries,
    infrastructureQueries: left.infrastructureQueries + right.infrastructureQueries,
    externalPublicationAttempts: left.externalPublicationAttempts + right.externalPublicationAttempts,
  };
}

function addPrivacy(left: CampaignPrivacyStatus, right: CampaignPrivacyStatus): CampaignPrivacyStatus {
  const result: CampaignPrivacyStatus = {
    result: left.result === 'BLOCKED' || right.result === 'BLOCKED' ? 'BLOCKED' : 'PASS',
    rawBodiesPersisted: left.rawBodiesPersisted + right.rawBodiesPersisted,
    customerValuesPersisted: left.customerValuesPersisted + right.customerValuesPersisted,
    credentialsPersisted: left.credentialsPersisted + right.credentialsPersisted,
    cookiesPersisted: left.cookiesPersisted + right.cookiesPersisted,
    tokensPersisted: left.tokensPersisted + right.tokensPersisted,
    domPersisted: left.domPersisted + right.domPersisted,
    screenshotsPersisted: left.screenshotsPersisted + right.screenshotsPersisted,
    authenticatedTracesPersisted: left.authenticatedTracesPersisted + right.authenticatedTracesPersisted,
  };
  return result;
}

function safetyIsZero(safety: CampaignSafetyVector): boolean {
  return Object.values(safety).every((value) => value === 0);
}

function privacyIsClean(privacy: CampaignPrivacyStatus): boolean {
  return privacy.result === 'PASS' && [
    privacy.rawBodiesPersisted,
    privacy.customerValuesPersisted,
    privacy.credentialsPersisted,
    privacy.cookiesPersisted,
    privacy.tokensPersisted,
    privacy.domPersisted,
    privacy.screenshotsPersisted,
    privacy.authenticatedTracesPersisted,
  ].every((value) => value === 0);
}

function validateCandidatePrivacy(candidate: CampaignAnomalyCandidate): void {
  const encoded = JSON.stringify(candidate, (_key, value: unknown) => typeof value === 'function' ? undefined : value);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(encoded)) {
    throw new Error('PRIVACY_BLOCKED:UNSAFE_ANOMALY_METADATA');
  }
  try {
    // Reuse the clustering sanitizer as the stable-feature admission gate;
    // unsafe classes are never appended to the durable observation ledger.
    clusterAnomalies([candidate.observation]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNSAFE')) throw new Error('PRIVACY_BLOCKED:UNSAFE_ANOMALY_METADATA');
    throw error;
  }
}

function toDossierSafety(safety: CampaignSafetyVector): BugDossier['safety'] {
  return {
    productionAttempts: safety.productionAttempts,
    proxyViolations: safety.proxyViolations,
    unknownDestinations: safety.unknownDestinations,
    unknownApprovals: safety.unknownApprovals,
    productMutations: safety.productMutations,
    actionCausedUnknown: safety.actionCausedUnknown,
    databaseQueries: safety.databaseQueries,
  };
}

function toTriageSafety(safety: CampaignSafetyVector): { productionAttempts: number; proxyViolations: number; unknownDestinations: number; unknownApprovals: number; knownMutations: number; actionCausedUnknown: number; dbQueries: number } {
  return {
    productionAttempts: safety.productionAttempts,
    proxyViolations: safety.proxyViolations,
    unknownDestinations: safety.unknownDestinations,
    unknownApprovals: safety.unknownApprovals,
    knownMutations: safety.productMutations,
    actionCausedUnknown: safety.actionCausedUnknown,
    dbQueries: safety.databaseQueries,
  };
}

function defaultOutcome(): CampaignExecutionOutcome {
  return {
    result: 'PASS',
    safety: ZERO_CAMPAIGN_SAFETY,
    privacy: ZERO_CAMPAIGN_PRIVACY,
    actionsExecuted: 0,
    apiExecutions: 0,
    browserContextCreated: false,
    replay: false,
    observations: [],
  };
}

function executionGuarantee(kind: CampaignWorkKind, replay: boolean): ExecutionGuarantee {
  if (replay) return 'AT_LEAST_ONCE_SAFE';
  if (kind === 'JOURNEY' || kind === 'EXPLORATION' || kind === 'API') return 'AT_LEAST_ONCE_SAFE';
  if (kind === 'REPRODUCTION' || kind === 'MINIMIZATION') return 'REPLAY_REQUIRED';
  return 'EXACTLY_ONCE_LOGICAL';
}

function remainingWorkItems(manifest: CampaignManifest, ledger: readonly CampaignExecutionRecord[]): readonly string[] {
  const complete = new Set(ledger.filter((item) => item.state === 'COMPLETED' || item.state === 'SKIPPED' || item.state === 'BLOCKED').map((item) => item.workItemId));
  return manifest.workItems.filter((item) => !complete.has(item.workItemId)).map((item) => item.workItemId);
}

function completedWorkItems(ledger: readonly CampaignExecutionRecord[]): readonly string[] {
  return ledger.filter((item) => item.state === 'COMPLETED').map((item) => item.workItemId).sort();
}

function workItem(manifest: CampaignManifest, id: string): CampaignWorkItem {
  const item = manifest.workItems.find((candidate) => candidate.workItemId === id);
  if (item === undefined) throw new Error(`CAMPAIGN_WORK_ITEM_MISSING:${id}`);
  return item;
}

function recordFor(item: CampaignWorkItem, state: CampaignWorkState = 'PENDING'): CampaignExecutionRecord {
  return {
    workItemId: item.workItemId,
    kind: item.kind,
    state,
    attemptCount: 0,
    executionGuarantee: executionGuarantee(item.kind, false),
    result: null,
    reasonCode: null,
    actionsExecuted: 0,
    apiExecutions: 0,
    browserContextCreated: false,
    replay: false,
    anomalyFingerprints: [],
    safety: ZERO_CAMPAIGN_SAFETY,
    privacy: ZERO_CAMPAIGN_PRIVACY,
  };
}

function initialCheckpoint(manifest: CampaignManifest, now: () => Date): CampaignCheckpoint {
  const ledger = manifest.workItems.map((item) => recordFor(item));
  return {
    schemaVersion: CAMPAIGN_CHECKPOINT_VERSION,
    campaignId: manifest.campaignId,
    manifestFingerprint: manifest.manifestFingerprint,
    campaignStatus: 'IN_PROGRESS',
    stopReason: 'NONE',
    checkpointOrdinal: 0,
    sourceSnapshots: manifest.sourceSnapshots,
    selection: manifest.selection,
    selectedJourneys: manifest.selectedJourneys,
    selectedEnvelopes: manifest.selectedEnvelopes,
    selectedApiScenarios: manifest.selectedApiScenarios,
    seedLedger: manifest.seedSet,
    budgetPolicy: manifest.budgetPolicy,
    budgetUsed: emptyBudgetUsage(),
    budgetRemaining: {
      browserContexts: manifest.budgetPolicy.maxTotalBrowserContexts,
      journeyContexts: manifest.budgetPolicy.maxJourneyContexts,
      explorationContexts: manifest.budgetPolicy.maxExplorationContexts,
      apiExecutions: manifest.budgetPolicy.maxApiExecutions,
      replays: manifest.budgetPolicy.maxReplays,
      minimizationCandidates: manifest.budgetPolicy.maxMinimizationCandidates,
      totalActions: manifest.budgetPolicy.maxTotalActions,
      privateEvidenceBytes: manifest.budgetPolicy.maxPrivateEvidenceBytes,
    },
    executionLedger: ledger,
    anomalyObservations: [],
    anomalyCandidates: [],
    anomalyClusters: [],
    reproductionQueue: [],
    minimizationQueue: [],
    dossierLedger: [],
    morningBriefStatus: 'NOT_STARTED',
    bugCandidates: [],
    rejectedHypotheses: [],
    unresolved: [],
    safetyEvents: [],
    safety: ZERO_CAMPAIGN_SAFETY,
    privacy: ZERO_CAMPAIGN_PRIVACY,
    privacyStatus: 'PASS',
    versionDrift: [],
    completedWorkItemIds: [],
    remainingWorkItemIds: manifest.workItems.map((item) => item.workItemId),
    nextExactAction: manifest.workItems[0] === undefined ? 'finalize morning brief' : `execute ${manifest.workItems[0].workItemId}`,
    resumeRecipe: DEFAULT_RESUME_RECIPE,
    executionGuarantees: {
      JOURNEY: 'AT_LEAST_ONCE_SAFE',
      API: 'AT_LEAST_ONCE_SAFE',
      EXPLORATION: 'AT_LEAST_ONCE_SAFE',
      REPRODUCTION: 'REPLAY_REQUIRED',
      MINIMIZATION: 'REPLAY_REQUIRED',
    },
    runtimeElapsedMs: 0,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
  };
}

function candidateSurface(candidate: CampaignAnomalyCandidate): string {
  return candidate.journeyId ?? candidate.observation.features.operationFamily ?? 'application-anomaly';
}

function admissionFor(cluster: AnomalyCluster, candidates: readonly CampaignAnomalyCandidate[]): { readonly level: EvidenceLevel; readonly reason: string; readonly contextCount: number } {
  const exactCandidates = candidates.filter((candidate) => candidate.observation.fingerprint === cluster.fingerprint);
  const representative = exactCandidates[0];
  if (representative === undefined) return { level: 'L0', reason: 'cluster representative metadata is unavailable', contextCount: 0 };
  const identity = candidateSurface(representative);
  const observations: AdmissionObservation[] = exactCandidates.map((candidate) => ({
    runId: candidate.observation.runId,
    journeyId: identity,
    contractVersion: candidate.contractVersion,
    contractDigest: candidate.contractDigest,
    fingerprint: candidate.observation.fingerprint,
    contextKind: candidate.contextKind,
  }));
  const result = evaluateAnomalyAdmission({ hypothesis: observations[0]!, observations });
  const levelRank: Record<'L0' | 'L1' | 'L2', number> = { L0: 0, L1: 1, L2: 2 };
  const hasIndependentDifferential = exactCandidates.some((candidate) => candidate.api !== null
    && candidate.api.available
    && candidate.browser.failed !== candidate.api.failed);
  if (hasIndependentDifferential && result.level !== null && levelRank[result.level] >= levelRank.L1) return { level: 'L3', reason: 'independent browser/API contradiction corroborates the exact cluster', contextCount: result.distinctContextCount };
  return { level: result.level ?? 'L0', reason: result.reason, contextCount: result.distinctContextCount };
}

function priorityKey(cluster: AnomalyCluster, candidate: CampaignAnomalyCandidate): string {
  const severityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };
  const confidenceRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, UNRESOLVED: 3 };
  const relevanceRank: Record<string, number> = { DIRECT_CHANGE_RELEVANCE: 0, SHARED_CHANGE_RELEVANCE: 1, TRANSITIVE_CHANGE_RELEVANCE: 2, NO_CURRENT_CHANGE_RELEVANCE: 3, UNKNOWN: 4 };
  const differentialRank = candidate.api === null ? 2 : candidate.browser.failed === candidate.api.failed ? 0 : 1;
  return [
    String(severityRank[candidate.technicalSeverity] ?? 9).padStart(2, '0'),
    String(confidenceRank[candidate.observation.reproduced ? 'HIGH' : 'LOW'] ?? 9).padStart(2, '0'),
    String(relevanceRank[candidate.sourceRelevance ?? 'UNKNOWN'] ?? 9).padStart(2, '0'),
    String(differentialRank),
    String(cluster.timingVariance === 'TRANSIENT' ? 1 : 0),
    cluster.clusterId,
  ].join('|');
}

function toRunRecord(manifest: CampaignManifest, record: CampaignExecutionRecord): OvernightRunRecord {
  const item = workItem(manifest, record.workItemId);
  const result: OvernightRunRecord['result'] = record.result === 'ANOMALY'
    ? 'ANOMALY'
    : record.result === 'NIGHTWATCH_DEFECT'
      ? 'NIGHTWATCH_DEFECT'
      : record.result === 'TRANSIENT'
        ? 'TRANSIENT'
        : record.result === 'INCOMPLETE'
          ? 'INCOMPLETE'
          : 'PASS';
  return {
    runId: `${manifest.campaignId}-${record.workItemId}`.replaceAll(':', '-'),
    journeyId: item.journeyId ?? item.apiOperationId ?? 'campaign',
    envelopeId: item.envelopeId ?? 'none',
    seed: item.seed ?? 'none',
    result,
    reproduced: record.result === 'ANOMALY' && record.anomalyFingerprints.length > 0,
    safety: toDossierSafety(record.safety),
  };
}

function makeReproductionRecord(cluster: AnomalyCluster, level: EvidenceLevel): CampaignReproductionRecord {
  return {
    clusterId: cluster.clusterId,
    representativeRunId: cluster.primaryRunId,
    state: 'PENDING',
    result: null,
    admissionLevel: level,
    reasonCode: null,
    runId: null,
    safety: ZERO_CAMPAIGN_SAFETY,
    privacy: ZERO_CAMPAIGN_PRIVACY,
  };
}

export class CampaignOrchestrator {
  readonly manifest: CampaignManifest;
  readonly executor: CampaignExecutor;
  readonly checkpointStore: CampaignCheckpointStore;
  readonly now: () => Date;
  readonly budget: CampaignBudgetManager;
  readonly time: CampaignTimeBudget;
  private state: CampaignCheckpoint;
  private observations: TriageAnomalyObservation[];
  private candidates = new Map<string, CampaignAnomalyCandidate>();
  private dossiers: BugDossier[] = [];
  private artifactPaths: string[] = [];
  private nightwatchIssues: string[] = [];
  private transients: string[] = [];
  private currentStorm: FailureStorm | null = null;
  private interruptionRequested = false;
  private readonly chargedArtifactPaths = new Set<string>();
  private readonly clusterIdAliases = new Map<string, string>();
  private readonly precompletedReproductions = new Map<string, CampaignReproductionOutcome>();
  private readonly maxTopFindings: number;
  private readonly currentVersions?: CampaignRunOptions['currentVersions'];
  private promotionStop: { readonly resultClass: CampaignResultClass; readonly stopReason: CampaignCheckpoint['stopReason'] } | null = null;

  constructor(manifest: CampaignManifest, executor: CampaignExecutor, options: CampaignRunOptions = {}) {
    validateCampaignManifest(manifest);
    this.manifest = manifest;
    this.executor = executor;
    this.checkpointStore = new CampaignCheckpointStore(options.store ?? new PrivateArtifactStore());
    this.now = options.now ?? (() => new Date());
    this.currentVersions = options.currentVersions;
    this.state = options.checkpoint === undefined ? initialCheckpoint(manifest, this.now) : options.checkpoint;
    validateCampaignCheckpoint(this.state, manifest);
    assertManifestCompatible(manifest, this.state);
    try {
      this.assertCurrentVersions();
    } catch {
      this.state = {
        ...this.state,
        versionDrift: [...new Set([...this.state.versionDrift, 'CAMPAIGN_VERSION_DRIFT'])],
        unresolved: [...new Set([...this.state.unresolved, 'CAMPAIGN_VERSION_DRIFT'])],
      };
    }
    const startedAt = this.now().getTime() - this.state.runtimeElapsedMs;
    this.budget = new CampaignBudgetManager(manifest.budgetPolicy, this.state.budgetUsed);
    this.time = new CampaignTimeBudget(manifest.runtimeCeilingMs, () => this.now().getTime(), startedAt);
    this.observations = [...this.state.anomalyObservations];
    for (const candidate of this.state.anomalyCandidates) this.candidates.set(candidate.observation.runId, candidate);
    if (manifest.mode === 'REPRODUCTION_ONLY' && manifest.reproductionTarget !== undefined) {
      const calculated = clusterAnomalies([manifest.reproductionTarget.candidate.observation])[0];
      if (calculated !== undefined && calculated.clusterId !== manifest.reproductionTarget.clusterId) {
        this.clusterIdAliases.set(calculated.clusterId, manifest.reproductionTarget.clusterId);
      }
    }
    this.maxTopFindings = Math.max(1, Math.min(3, options.maxTopFindings ?? 3));
    this.loadDossiers();
  }

  private assertCurrentVersions(): void {
    if (this.currentVersions === undefined) return;
    const current = typeof this.currentVersions === 'function' ? this.currentVersions() : this.currentVersions;
    if (stableCampaignJson(current) !== stableCampaignJson(this.manifest.versions)) throw new Error('CAMPAIGN_VERSION_DRIFT');
  }

  private loadDossiers(): void {
    for (const entry of this.state.dossierLedger) {
      if (entry.state !== 'READY' || entry.artifactPath === null || !fs.existsSync(entry.artifactPath)) continue;
      try {
        const value = JSON.parse(fs.readFileSync(entry.artifactPath, 'utf8')) as BugDossier;
        validateBugDossier(value);
        this.dossiers.push(value);
      } catch {
        this.nightwatchIssues.push('NIGHTWATCH_INTERNAL_DEFECT:DOSSIER_READBACK_FAILED');
      }
    }
  }

  checkpoint(): CampaignCheckpoint {
    const checkpoint: CampaignCheckpoint = {
      ...this.state,
      checkpointOrdinal: this.state.checkpointOrdinal + 1,
      budgetUsed: this.budget.used(),
      budgetRemaining: this.budget.remaining(),
      runtimeElapsedMs: this.time.elapsedMs(),
      updatedAt: nowIso(this.now),
      completedWorkItemIds: completedWorkItems(this.state.executionLedger),
      remainingWorkItemIds: remainingWorkItems(this.manifest, this.state.executionLedger),
    };
    validateCampaignCheckpoint(checkpoint, this.manifest);
    this.state = checkpoint;
    const checkpointPath = this.checkpointStore.writeCheckpoint(checkpoint, this.manifest);
    this.chargeArtifact(checkpointPath);
    return checkpoint;
  }

  private chargeArtifact(filePath: string): void {
    if (this.chargedArtifactPaths.has(filePath)) return;
    const bytes = fs.statSync(filePath).size;
    this.budget.addEvidenceBytes(bytes);
    this.chargedArtifactPaths.add(filePath);
  }

  private persistManifest(): void {
    const manifestPath = this.checkpointStore.writeManifest(this.manifest);
    if (!this.artifactPaths.includes(manifestPath)) this.artifactPaths.push(manifestPath);
    this.chargeArtifact(manifestPath);
  }

  private updateState(update: Partial<CampaignCheckpoint>): void {
    this.state = { ...this.state, ...update };
    this.checkpoint();
  }

  private updateRecord(workItemId: string, update: Partial<CampaignExecutionRecord>): void {
    const ledger = this.state.executionLedger.map((record) => record.workItemId === workItemId ? { ...record, ...update } : record);
    this.state = { ...this.state, executionLedger: ledger };
  }

  private appendObservation(candidate: CampaignAnomalyCandidate): void {
    this.observations.push(candidate.observation);
    this.candidates.set(candidate.observation.runId, candidate);
    this.state = {
      ...this.state,
      anomalyObservations: [...this.observations],
      anomalyCandidates: [...this.candidates.values()].map(({ replay: _replay, ...persisted }) => persisted),
    };
  }

  private recomputeClusters(): readonly AnomalyCluster[] {
    const clusters = suppressDuplicateClusters(clusterAnomalies(this.observations), 100).map((cluster) => {
      const alias = this.clusterIdAliases.get(cluster.clusterId);
      return alias === undefined ? cluster : { ...cluster, clusterId: alias };
    });
    this.state = { ...this.state, anomalyClusters: clusters };
    return clusters;
  }

  private globalOwnerPreflight(item: CampaignWorkItem | null): void {
    assertOwnerPolicyAllows('PRIVATE_EVIDENCE');
    assertOwnerPolicyAllows('PRIVATE_TRIAGE');
    if (this.manifest.mode === 'LOCAL_SYNTHETIC') assertOwnerPolicyAllows('SYNTHETIC_FIXTURE');
    else if (item?.kind === 'API') assertOwnerPolicyAllows('CONTAINED_DEV_API');
    else if (item?.kind === 'JOURNEY' || item?.kind === 'EXPLORATION') assertOwnerPolicyAllows('CONTAINED_DEV_BROWSER');
    else if (item?.kind === 'REPRODUCTION' || item?.kind === 'MINIMIZATION') assertOwnerPolicyAllows('DETERMINISTIC_REPLAY');
  }

  private async preflight(item: CampaignWorkItem | null): Promise<CampaignPreflightResult> {
    try {
      this.globalOwnerPreflight(item);
    } catch (error) {
      return { passed: false, code: 'OWNER_POLICY_BLOCKED', failedChecks: ['owner-scope-policy'], checkedAt: nowIso(this.now) };
    }
    const result = await this.executor.preflight({ manifest: this.manifest, workItem: item });
    return result;
  }

  private stopForPreflight(result: CampaignPreflightResult): { resultClass: CampaignResultClass; stopReason: CampaignCheckpoint['stopReason'] } {
    if (result.code === 'OWNER_POLICY_BLOCKED') return { resultClass: 'ABORTED_OWNER_POLICY', stopReason: 'OWNER_POLICY_BLOCKED' };
    if (result.code === 'AUTH_BLOCKED') return { resultClass: 'PARTIAL_AUTH_BLOCKED', stopReason: 'AUTH_BLOCKED' };
    if (result.code === 'SAFETY_BLOCKED') return { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' };
    return { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' };
  }

  private buildBrief(resultClass: CampaignResultClass, safety: CampaignSafetyVector, privacy: CampaignPrivacyStatus): CampaignMorningBrief {
    const runs = this.state.executionLedger.filter((record) => record.state === 'COMPLETED').map((record) => toRunRecord(this.manifest, record));
    const brief = buildCampaignMorningBrief({
      manifest: this.manifest,
      resultClass,
      runs,
      clusters: this.state.anomalyClusters,
      dossiers: this.dossiers,
      coverageGaps: this.state.unresolved,
      reproductionQueue: this.state.reproductionQueue,
      safety,
      privacy,
      nightwatchInternalIssues: this.nightwatchIssues,
      transientsAndNonFindings: this.transients,
      maxTopFindings: this.maxTopFindings,
    });
    validateCampaignMorningBrief(brief);
    const briefPath = this.checkpointStore.store.writeJson(`${this.manifest.campaignId.replaceAll(':', '-')}.morning-brief.json`, { brief, text: renderCampaignMorningBrief(brief) });
    if (!this.artifactPaths.includes(briefPath)) this.artifactPaths.push(briefPath);
    this.chargeArtifact(briefPath);
    return brief;
  }

  private async finalize(resultClass: CampaignResultClass, stopReason: CampaignCheckpoint['stopReason']): Promise<CampaignRunResult> {
    const safety = this.state.safety;
    const privacy = this.state.privacy;
    const unresolved = resultClass === 'COMPLETE_CLEAN'
      ? this.state.unresolved.filter((item) => item !== 'PROCESS_INTERRUPTION' && item !== 'PROCESS_INTERRUPTION_SIMULATED')
      : this.state.unresolved;
    this.state = { ...this.state, campaignStatus: resultClass, stopReason, unresolved, morningBriefStatus: 'IN_PROGRESS' };
    this.checkpoint();
    const brief = this.buildBrief(resultClass, safety, privacy);
    this.state = { ...this.state, morningBriefStatus: 'READY' };
    const finalCheckpoint = this.checkpoint();
    return {
      campaignId: this.manifest.campaignId,
      manifest: this.manifest,
      resultClass,
      stopReason,
      checkpoint: finalCheckpoint,
      morningBrief: brief,
      dossiers: [...this.dossiers],
      artifactPaths: [...this.artifactPaths],
    };
  }

  private markPendingSkipped(reasonCode: string): void {
    const ledger = this.state.executionLedger.map((record) => record.state === 'PENDING' || record.state === 'RUNNING'
      ? { ...record, state: 'SKIPPED' as const, reasonCode }
      : record);
    this.state = { ...this.state, executionLedger: ledger, unresolved: [...this.state.unresolved, reasonCode] };
  }

  private async executeWorkItem(item: CampaignWorkItem): Promise<{ readonly stopped: { resultClass: CampaignResultClass; stopReason: CampaignCheckpoint['stopReason'] } | null }> {
    const existing = this.state.executionLedger.find((record) => record.workItemId === item.workItemId);
    if (existing?.state === 'COMPLETED' || existing?.state === 'SKIPPED' || existing?.state === 'BLOCKED') return { stopped: null };
    try {
      this.time.assertAvailable();
      this.assertCurrentVersions();
      const preflight = await this.preflight(item);
      if (!preflight.passed) {
        this.updateRecord(item.workItemId, { state: 'BLOCKED', reasonCode: preflight.code });
        const stop = this.stopForPreflight(preflight);
        this.markPendingSkipped(preflight.code);
        this.checkpoint();
        return { stopped: stop };
      }
      const previousAttempts = existing?.attemptCount ?? 0;
      this.updateRecord(item.workItemId, { state: 'RUNNING', attemptCount: previousAttempts + 1, executionGuarantee: executionGuarantee(item.kind, previousAttempts > 0) });
      const replay = previousAttempts > 0;
      if (replay) this.budget.reserveWork(item.kind, true);
      else {
        // Phase 5's FIRST_PLUS_FRESH_REPLAY contract is one logical work item
        // with two bounded API executions. Reserve both before the adapter
        // starts so a partial adapter cannot exceed the frozen manifest.
        if (item.kind === 'API' && item.replayPolicy === 'FIRST_PLUS_FRESH_REPLAY') {
          this.budget.reserveFirstPlusApi();
        } else this.budget.reserveWork(item.kind, false);
      }
      // Persist the RUNNING marker and its reservation together. A crash
      // before this write leaves the prior PENDING checkpoint, so resume
      // allocates the first reservation exactly once; a crash after it
      // charges only the retry reservation.
      this.checkpoint();
      const context: CampaignExecutionContext = { manifest: this.manifest, workItem: item, budget: this.budget.snapshot(), attempt: previousAttempts + 1, executionGuarantee: executionGuarantee(item.kind, replay) };
      const outcome = await this.executor.execute(context);
      this.budget.addActions(outcome.actionsExecuted);
      if (outcome.apiExecutions > 0 && item.kind !== 'API') this.budget.consume('apiExecutions', outcome.apiExecutions);
      const executionPrivacy = addPrivacy(this.state.privacy, outcome.privacy);
      this.state = { ...this.state, safety: addSafety(this.state.safety, outcome.safety), privacy: executionPrivacy, privacyStatus: executionPrivacy.result };
      for (const candidate of outcome.observations) validateCandidatePrivacy(candidate);
      for (const candidate of outcome.observations) this.appendObservation(candidate);
      const anomalyFingerprints = outcome.observations.map((candidate) => candidate.observation.fingerprint).sort();
      const record: Partial<CampaignExecutionRecord> = {
        state: outcome.result === 'AUTH_BLOCKED' || outcome.result === 'SAFETY_BLOCKED' ? 'BLOCKED' : 'COMPLETED',
        executionGuarantee: executionGuarantee(item.kind, replay),
        result: outcome.result,
        reasonCode: outcome.reasonCode ?? null,
        actionsExecuted: outcome.actionsExecuted,
        apiExecutions: outcome.apiExecutions,
        browserContextCreated: outcome.browserContextCreated,
        replay: outcome.replay,
        anomalyFingerprints,
        safety: outcome.safety,
        privacy: outcome.privacy,
      };
      this.updateRecord(item.workItemId, record);
      if (outcome.result === 'NIGHTWATCH_DEFECT') this.nightwatchIssues.push(outcome.reasonCode ?? 'NIGHTWATCH_INTERNAL_DEFECT');
      if (outcome.result === 'TRANSIENT') this.transients.push(outcome.reasonCode ?? 'TRANSIENT_NON_ADMITTED');
      if (!safetyIsZero(outcome.safety)) {
        this.state = { ...this.state, safetyEvents: [...this.state.safetyEvents, 'SAFETY_EVENT'] };
        this.markPendingSkipped('SAFETY_EVENT');
        this.checkpoint();
        return { stopped: { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' } };
      }
      if (!privacyIsClean(outcome.privacy)) {
        this.markPendingSkipped('PRIVACY_BLOCKED');
        this.checkpoint();
        return { stopped: { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'PRIVACY_BLOCKED' } };
      }
      this.currentStorm = detectFailureStorm(this.observations);
      if (this.currentStorm !== null) {
        this.nightwatchIssues.push('FAILURE_STORM/SHARED_ROOT_SYMPTOM');
        this.recomputeClusters();
        this.markPendingSkipped('FAILURE_STORM_SHARED_ROOT_SYMPTOM');
        this.checkpoint();
        return { stopped: { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'FAILURE_STORM_SHARED_ROOT_SYMPTOM' } };
      }
      this.checkpoint();
      return { stopped: outcome.result === 'AUTH_BLOCKED' ? { resultClass: 'PARTIAL_AUTH_BLOCKED', stopReason: 'AUTH_BLOCKED' } : outcome.result === 'SAFETY_BLOCKED' ? { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' } : outcome.result === 'RUNTIME_FAILURE' || outcome.result === 'INCOMPLETE' ? { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' } : null };
    } catch (error) {
      const code = safeErrorCode(error);
      if (error instanceof CampaignProcessInterruptionError) {
        this.updateRecord(item.workItemId, { state: 'REPLAY_REQUIRED', reasonCode: code, executionGuarantee: 'REPLAY_REQUIRED' });
        this.state = { ...this.state, campaignStatus: 'INCOMPLETE_PROCESS_INTERRUPTION', stopReason: 'PROCESS_INTERRUPTION', nextExactAction: `replay ${item.workItemId}`, unresolved: [...this.state.unresolved, 'PROCESS_INTERRUPTION'] };
        this.checkpoint();
        return { stopped: { resultClass: 'INCOMPLETE_PROCESS_INTERRUPTION', stopReason: 'PROCESS_INTERRUPTION' } };
      }
      this.updateRecord(item.workItemId, { state: 'BLOCKED', reasonCode: code });
      if (code === 'CORRUPT_STATE' || code === 'NIGHTWATCH_INTERNAL_DEFECT') this.nightwatchIssues.push(code);
      if (code === 'PRIVACY_BLOCKED') {
        this.state = { ...this.state, privacy: { ...this.state.privacy, result: 'BLOCKED' }, privacyStatus: 'BLOCKED' };
      }
      this.markPendingSkipped(code);
      this.checkpoint();
      if (code === 'OWNER_POLICY_BLOCKED') return { stopped: { resultClass: 'ABORTED_OWNER_POLICY', stopReason: 'OWNER_POLICY_BLOCKED' } };
      if (code === 'AUTH_BLOCKED') return { stopped: { resultClass: 'PARTIAL_AUTH_BLOCKED', stopReason: 'AUTH_BLOCKED' } };
      if (code === 'SAFETY_EVENT') return { stopped: { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' } };
      if (code === 'BUDGET_EXHAUSTED') return { stopped: { resultClass: 'PARTIAL_BUDGET_EXHAUSTED', stopReason: 'BUDGET_EXHAUSTED' } };
      if (code === 'RUNTIME_TIMEOUT') return { stopped: { resultClass: 'PARTIAL_BUDGET_EXHAUSTED', stopReason: 'RUNTIME_TIMEOUT' } };
      if (code === 'CAMPAIGN_VERSION_DRIFT') {
        this.state = { ...this.state, versionDrift: [...this.state.versionDrift, 'CAMPAIGN_VERSION_DRIFT'] };
        this.checkpoint();
        return { stopped: { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'CAMPAIGN_VERSION_DRIFT' } };
      }
      if (code === 'PRIVACY_BLOCKED') return { stopped: { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'PRIVACY_BLOCKED' } };
      return { stopped: { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' } };
    }
  }

  private async promoteFindings(): Promise<void> {
    const clusters = this.recomputeClusters();
    const candidatesByCluster = new Map<string, CampaignAnomalyCandidate[]>();
    for (const cluster of clusters) {
      const values = [...this.candidates.values()].filter((candidate) => candidate.observation.fingerprint === cluster.fingerprint && candidate.observation.features.journeyId === cluster.features.journeyId && candidate.observation.features.operationFamily === cluster.features.operationFamily);
      candidatesByCluster.set(cluster.clusterId, values);
    }
    const ranked = clusters
      .map((cluster) => ({ cluster, representative: this.candidates.get(cluster.primaryRunId) ?? candidatesByCluster.get(cluster.clusterId)?.[0] }))
      .filter((item): item is { cluster: AnomalyCluster; representative: CampaignAnomalyCandidate } => item.representative !== undefined)
      .filter((item) => !this.state.dossierLedger.some((entry) => entry.clusterId === item.cluster.clusterId && entry.state === 'READY'))
      .sort((a, b) => priorityKey(a.cluster, a.representative).localeCompare(priorityKey(b.cluster, b.representative)));
    const queue: CampaignReproductionRecord[] = [];
    const eligible = ranked.filter((item) => !(item.cluster.timingVariance === 'TRANSIENT' && item.cluster.occurrenceCount === 1) && !item.representative.knownNightwatchDefect);
    for (const item of ranked.filter((candidate) => !eligible.includes(candidate))) {
      this.transients.push(`${item.cluster.clusterId}:${item.representative.knownNightwatchDefect ? 'KNOWN_NIGHTWATCH_FALSE_POSITIVE' : 'L0_TRANSIENT_NOT_REPRODUCED'}`);
      this.state = { ...this.state, rejectedHypotheses: [...this.state.rejectedHypotheses, item.cluster.clusterId] };
    }
    for (const item of eligible.slice(0, this.manifest.budgetPolicy.maxPromotedClusters)) {
      const admission = admissionFor(item.cluster, candidatesByCluster.get(item.cluster.clusterId) ?? [item.representative]);
      queue.push(makeReproductionRecord(item.cluster, admission.level));
    }
    this.state = { ...this.state, reproductionQueue: queue, minimizationQueue: queue.map((item) => item.clusterId) };
    this.checkpoint();
    if (this.currentStorm !== null) return;
    for (const queueItem of queue) {
      if (this.currentStorm !== null) break;
      const cluster = this.state.anomalyClusters.find((candidate) => candidate.clusterId === queueItem.clusterId);
      if (cluster === undefined || this.executor.reproduce === undefined) {
        this.state = {
          ...this.state,
          reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === queueItem.clusterId ? { ...item, state: 'BLOCKED', reasonCode: 'REPRODUCTION_ADAPTER_UNAVAILABLE' } : item),
          minimizationQueue: this.state.minimizationQueue.filter((id) => id !== queueItem.clusterId),
          unresolved: [...this.state.unresolved, `${queueItem.clusterId}:REPRODUCTION_ADAPTER_UNAVAILABLE`],
        };
        this.promotionStop = { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' };
        this.checkpoint();
        break;
      }
      const representative = this.candidates.get(cluster.primaryRunId);
      if (representative === undefined) continue;
      try {
        this.globalOwnerPreflight({ workItemId: `reproduce:${cluster.clusterId}`, kind: 'JOURNEY', order: 0, journeyId: representative.journeyId, envelopeId: representative.observation.features.envelopeId, apiOperationId: representative.observation.features.operationFamily, seed: null, linkedWorkItemIds: [], replayPolicy: 'ON_ADMISSION', selection: { selected: false, reason: 'derived representative', sourceImpact: 'ADMITTED_ANOMALY', confidence: 'UNRESOLVED', riskClass: 'TRIAGE', linkedJourneyId: representative.journeyId, linkedEnvelopeId: representative.observation.features.envelopeId, linkedApiOperationId: representative.observation.features.operationFamily } });
        const precompleted = this.precompletedReproductions.get(cluster.clusterId);
        if (precompleted === undefined) {
          this.reserveReproductionBudget(cluster, representative);
        }
        this.state = { ...this.state, reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'RUNNING' } : item) };
        this.checkpoint();
        const reproduction = precompleted ?? await this.executor.reproduce({ manifest: this.manifest, cluster, representative });
        const reproductionPrivacy = addPrivacy(this.state.privacy, reproduction.privacy);
        this.state = { ...this.state, safety: addSafety(this.state.safety, reproduction.safety), privacy: reproductionPrivacy, privacyStatus: reproductionPrivacy.result };
        if (!safetyIsZero(reproduction.safety)) {
          this.state = { ...this.state, safetyEvents: [...this.state.safetyEvents, 'SAFETY_EVENT_DURING_REPRODUCTION'] };
          this.markPendingSkipped('SAFETY_EVENT_DURING_REPRODUCTION');
          this.checkpoint();
          this.currentStorm = { kind: 'FAILURE_STORM', reasonCode: 'SHARED_ROOT_SYMPTOM', rootKey: 'safety-event', fingerprint: cluster.fingerprint, oracleId: cluster.features.oracleId, runtimeCategory: 'SAFETY', affectedRunIds: cluster.runIds, affectedSurfaces: [candidateSurface(representative)], occurrenceCount: cluster.occurrenceCount };
          break;
        }
        const reproCandidate = reproduction.candidate ?? representative;
        const reproducedObservation = reproduction.result === 'REPRODUCED'
          ? { ...reproCandidate.observation, runId: reproduction.runId, reproduced: true, observedAt: nowIso(this.now) }
          : null;
        if (reproducedObservation !== null) {
          if (!this.observations.some((observation) => observation.runId === reproducedObservation.runId)) this.observations.push(reproducedObservation);
          this.candidates.set(reproducedObservation.runId, { ...reproCandidate, observation: reproducedObservation });
        }
        this.state = {
          ...this.state,
          anomalyObservations: [...this.observations],
          anomalyCandidates: [...this.candidates.values()].map(({ replay: _replay, ...persisted }) => persisted),
          reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'COMPLETED', result: reproduction.result, reasonCode: reproduction.reasonCode ?? null, runId: reproduction.runId, safety: reproduction.safety, privacy: reproduction.privacy } : item),
          minimizationQueue: this.state.minimizationQueue.filter((id) => id !== cluster.clusterId),
        };
        // Recompute after adding the fresh observation so the durable cluster
        // ledger records its L1/L2 occurrence and reproduction count.
        this.recomputeClusters();
        if (reproduction.result !== 'REPRODUCED' || reproduction.candidate?.replay === undefined && representative.replay === undefined) {
          this.transients.push(`${cluster.clusterId}:${reproduction.result}`);
          this.checkpoint();
          continue;
        }
        const replay = reproduction.candidate?.replay ?? representative.replay!;
        const exactOutcome: CandidateReplayOutcome = {
          status: 'FAILURE',
          anomalyFingerprint: reproduction.fingerprint ?? cluster.fingerprint,
          safety: toTriageSafety(reproduction.safety),
        };
        const minimizationCandidatesRemaining = this.budget.remaining().minimizationCandidates;
        const minimizationReplaysRemaining = this.budget.remaining().replays;
        if (minimizationCandidatesRemaining === 0 || minimizationReplaysRemaining === 0) {
          const reason = `${cluster.clusterId}:MINIMIZATION_BUDGET_UNAVAILABLE`;
          this.state = {
            ...this.state,
            reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'BLOCKED', reasonCode: 'MINIMIZATION_BUDGET_UNAVAILABLE' } : item),
            minimizationQueue: this.state.minimizationQueue.filter((id) => id !== cluster.clusterId),
            unresolved: [...this.state.unresolved, reason],
          };
          this.promotionStop = { resultClass: 'PARTIAL_BUDGET_EXHAUSTED', stopReason: 'BUDGET_EXHAUSTED' };
          this.checkpoint();
          break;
        }
        const family = candidateSurface(reproCandidate);
        const incomplete = createIncompleteDossier({ anomalyFingerprint: cluster.fingerprint, journeyOrApiFamily: family, missingSections: ['minimization', 'source-correlation', 'fault-boundary', 'private-finalization'] });
        const incompletePath = this.checkpointStore.store.writeIncomplete(`${incomplete.candidateId.replaceAll(':', '-')}.json`, incomplete);
        if (!this.artifactPaths.includes(incompletePath)) this.artifactPaths.push(incompletePath);
        this.chargeArtifact(incompletePath);
        const wrappedReplay = async (sequence: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE'): Promise<CandidateReplayOutcome> => {
          if (phase === 'FRESH_EXACT_REPLAY') return exactOutcome;
          return await replay(sequence, phase);
        };
        const sourceCorrelation = reproCandidate.sourceCorrelation;
        const minimizationBudget = {
          ...REAL_DEV_MINIMIZATION_BUDGET,
          maxCandidateEvaluations: Math.min(REAL_DEV_MINIMIZATION_BUDGET.maxCandidateEvaluations, minimizationCandidatesRemaining),
          maxTotalReplays: Math.min(REAL_DEV_MINIMIZATION_BUDGET.maxTotalReplays, minimizationReplaysRemaining + 1),
        };
        const triaged = await triageAnomaly({
          originalSequence: reproCandidate.originalSequence,
          anomalyFingerprint: cluster.fingerprint,
          sourceVersion: reproCandidate.sourceCorrelation.sourceVersion ?? 'campaign-source',
          catalogVersion: this.manifest.versions.explorationCatalogVersion,
          approvedActionIds: new Set(reproCandidate.originalSequence.map((action) => action.actionId)),
          safety: {
            devOnly: true,
            authValid: true,
            outboundPolicySatisfied: true,
            safeActionCatalogSatisfied: true,
            semanticReadOnly: true,
            mutationTripwireZero: true,
            unknownTripwireZero: true,
            routeEnvelopeSatisfied: true,
            privacySatisfied: true,
          },
          budget: minimizationBudget,
          replay: wrappedReplay,
          observedAt: reproCandidate.observation.observedAt,
          journeyIds: reproCandidate.journeyId === null ? [] : [reproCandidate.journeyId],
          seeds: reproCandidate.observation.features.envelopeId === null ? [] : [reproCandidate.observation.features.envelopeId],
          routeClass: reproCandidate.browser.routeClass,
          apiOperationFamily: reproCandidate.api?.operationFamily ?? null,
          browser: reproCandidate.browser,
          api: reproCandidate.api,
          sourceCorrelation,
          evidenceLevel: admissionFor(cluster, [reproCandidate]).level as Exclude<EvidenceLevel, 'L4'>,
          technicalSeverity: reproCandidate.technicalSeverity,
          breadth: reproCandidate.breadth,
          knownNightwatchDefect: reproCandidate.knownNightwatchDefect,
          missingEvidence: reproCandidate.missingEvidence,
          alternativesRuledOut: reproCandidate.alternativesRuledOut,
          store: this.checkpointStore.store,
        });
        this.budget.consumeBundle({
          minimizationCandidates: triaged.minimization.candidateEvaluationCount,
          replays: Math.max(0, triaged.minimization.replayCount - 1),
        });
        validateBugDossier(triaged.dossier);
        this.dossiers.push(triaged.dossier);
        if (triaged.artifactPath !== null) {
          if (!this.artifactPaths.includes(triaged.artifactPath)) this.artifactPaths.push(triaged.artifactPath);
          this.chargeArtifact(triaged.artifactPath);
        }
        this.state = {
          ...this.state,
          dossierLedger: [...this.state.dossierLedger, { clusterId: cluster.clusterId, candidateId: triaged.dossier.candidateId, state: 'READY', artifactPath: triaged.artifactPath, evidenceLevel: triaged.dossier.evidenceLevel, triagePriority: triaged.dossier.triagePriority }],
          bugCandidates: [...this.state.bugCandidates, triaged.dossier.candidateId],
        };
        this.checkpoint();
      } catch (error) {
        const code = safeErrorCode(error);
        if (error instanceof CampaignProcessInterruptionError) {
          this.state = {
            ...this.state,
            reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'REPLAY_REQUIRED', reasonCode: code } : item),
            campaignStatus: 'INCOMPLETE_PROCESS_INTERRUPTION',
            stopReason: 'PROCESS_INTERRUPTION',
            nextExactAction: `resume reproduction ${cluster.clusterId}`,
            unresolved: [...this.state.unresolved, 'PROCESS_INTERRUPTION'],
          };
          this.interruptionRequested = true;
          this.checkpoint();
          break;
        }
        this.state = { ...this.state, reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'BLOCKED', reasonCode: code } : item), minimizationQueue: this.state.minimizationQueue.filter((id) => id !== cluster.clusterId), unresolved: [...this.state.unresolved, code] };
        this.checkpoint();
        if (code === 'AUTH_BLOCKED') {
          this.markPendingSkipped(code);
          this.promotionStop = { resultClass: 'PARTIAL_AUTH_BLOCKED', stopReason: 'AUTH_BLOCKED' };
          break;
        }
        if (code === 'SAFETY_EVENT') {
          this.markPendingSkipped(code);
          this.promotionStop = { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' };
          break;
        }
        if (code === 'PRIVACY_BLOCKED') {
          this.markPendingSkipped(code);
          this.promotionStop = { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'PRIVACY_BLOCKED' };
          break;
        }
        if (code === 'BUDGET_EXHAUSTED') {
          this.promotionStop = { resultClass: 'PARTIAL_BUDGET_EXHAUSTED', stopReason: 'BUDGET_EXHAUSTED' };
          break;
        }
        if (code === 'CAMPAIGN_VERSION_DRIFT') {
          this.promotionStop = { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'CAMPAIGN_VERSION_DRIFT' };
          break;
        }
        if (code === 'OWNER_POLICY_BLOCKED') {
          this.currentStorm = { kind: 'FAILURE_STORM', reasonCode: 'SHARED_ROOT_SYMPTOM', rootKey: 'owner-policy', fingerprint: cluster.fingerprint, oracleId: cluster.features.oracleId, runtimeCategory: 'OWNER_POLICY', affectedRunIds: cluster.runIds, affectedSurfaces: [candidateSurface(representative)], occurrenceCount: cluster.occurrenceCount };
          break;
        }
        this.promotionStop = { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' };
        break;
      }
    }
  }

  private reserveReproductionBudget(cluster: AnomalyCluster, representative: CampaignAnomalyCandidate): void {
    const estimate: CampaignReproductionBudgetEstimate | undefined = this.executor.estimateReproduction?.({ manifest: this.manifest, cluster, representative });
    const requirements: Partial<Record<'browserContexts' | 'journeyContexts' | 'explorationContexts' | 'apiExecutions' | 'totalActions' | 'replays', number>> = { replays: 1 };
    if (estimate === undefined) {
      this.budget.consumeBundle(requirements);
      return;
    }
    for (const dimension of ['browserContexts', 'journeyContexts', 'explorationContexts', 'apiExecutions', 'totalActions'] as const) {
      const amount = estimate[dimension] ?? 0;
      if (!Number.isInteger(amount) || amount < 0) throw new Error(`CAMPAIGN_REPRODUCTION_ESTIMATE_INVALID:${dimension}`);
      if (amount > 0) requirements[dimension] = amount;
    }
    this.budget.consumeBundle(requirements);
  }

  /**
   * Run a supplied admitted target without selecting any fresh coverage.
   * The exact replay is performed by the existing reproduction adapter; the
   * ordinary promotion path then owns bounded minimization and dossier write.
   */
  private async runReproductionOnly(): Promise<CampaignRunResult> {
    const target = this.manifest.reproductionTarget;
    const item = this.manifest.workItems[0];
    if (target === undefined || item === undefined || item.kind !== 'REPRODUCTION') {
      return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'PREFLIGHT_FAILED');
    }
    const preflight = await this.preflight(item);
    if (!preflight.passed) {
      this.updateRecord(item.workItemId, { state: 'BLOCKED', reasonCode: preflight.code });
      const stop = this.stopForPreflight(preflight);
      this.markPendingSkipped(preflight.code);
      return await this.finalize(stop.resultClass, stop.stopReason);
    }
    const calculated = clusterAnomalies([target.candidate.observation])[0];
    if (calculated === undefined) return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'PREFLIGHT_FAILED');
    const cluster = this.state.anomalyClusters.find((candidate) => candidate.clusterId === target.clusterId) ?? {
      ...calculated,
      clusterId: target.clusterId,
    };
    const representative = target.candidate;
    if (this.state.anomalyObservations.length === 0) {
      this.appendObservation(representative);
      this.recomputeClusters();
    }
    const existing = this.state.executionLedger.find((record) => record.workItemId === item.workItemId);
    if (existing?.state !== 'COMPLETED') {
      try {
        this.updateRecord(item.workItemId, { state: 'RUNNING', attemptCount: (existing?.attemptCount ?? 0) + 1, executionGuarantee: 'REPLAY_REQUIRED' });
        this.reserveReproductionBudget(cluster, representative);
        // Keep the reservation and RUNNING marker in the same persisted
        // checkpoint. A restart before this write replays the pending target
        // once; a restart after it charges only the next attempt.
        this.checkpoint();
        if (this.executor.reproduce === undefined) throw new Error('REPRODUCTION_ADAPTER_UNAVAILABLE');
        const reproduction = await this.executor.reproduce({ manifest: this.manifest, cluster, representative });
        this.precompletedReproductions.set(cluster.clusterId, reproduction);
        this.state = {
          ...this.state,
          safety: addSafety(this.state.safety, reproduction.safety),
          privacy: addPrivacy(this.state.privacy, reproduction.privacy),
          privacyStatus: reproduction.privacy.result,
        };
        this.updateRecord(item.workItemId, {
          state: reproduction.result === 'SAFETY_BLOCKED' ? 'BLOCKED' : 'COMPLETED',
          result: reproduction.result === 'REPRODUCED' ? 'ANOMALY' : reproduction.result === 'NOT_REPRODUCED' ? 'PASS' : reproduction.result === 'SAFETY_BLOCKED' ? 'SAFETY_BLOCKED' : 'RUNTIME_FAILURE',
          reasonCode: reproduction.reasonCode ?? null,
          replay: true,
          executionGuarantee: 'REPLAY_REQUIRED',
          safety: reproduction.safety,
          privacy: reproduction.privacy,
        });
        if (!safetyIsZero(reproduction.safety)) {
          this.state = { ...this.state, safetyEvents: [...this.state.safetyEvents, 'SAFETY_EVENT_DURING_REPRODUCTION'] };
          this.markPendingSkipped('SAFETY_EVENT_DURING_REPRODUCTION');
          return await this.finalize('PARTIAL_SAFETY_BLOCKED', 'SAFETY_EVENT');
        }
        if (!privacyIsClean(reproduction.privacy)) {
          this.markPendingSkipped('PRIVACY_BLOCKED');
          return await this.finalize('PARTIAL_SAFETY_BLOCKED', 'PRIVACY_BLOCKED');
        }
        if (reproduction.candidate !== undefined) {
          validateCandidatePrivacy(reproduction.candidate);
          this.appendObservation(reproduction.candidate);
        }
        this.checkpoint();
      } catch (error) {
        const code = safeErrorCode(error);
        this.updateRecord(item.workItemId, { state: error instanceof CampaignProcessInterruptionError ? 'REPLAY_REQUIRED' : 'BLOCKED', reasonCode: code, executionGuarantee: 'REPLAY_REQUIRED' });
        this.state = { ...this.state, nextExactAction: `replay ${item.workItemId}`, unresolved: [...this.state.unresolved, code] };
        this.checkpoint();
        if (code === 'OWNER_POLICY_BLOCKED') return await this.finalize('ABORTED_OWNER_POLICY', 'OWNER_POLICY_BLOCKED');
        if (code === 'AUTH_BLOCKED') return await this.finalize('PARTIAL_AUTH_BLOCKED', 'AUTH_BLOCKED');
        if (code === 'SAFETY_EVENT') return await this.finalize('PARTIAL_SAFETY_BLOCKED', 'SAFETY_EVENT');
        if (code === 'PROCESS_INTERRUPTION') return await this.finalize('INCOMPLETE_PROCESS_INTERRUPTION', 'PROCESS_INTERRUPTION');
        return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'PREFLIGHT_FAILED');
      }
    }
    await this.promoteFindings();
    if (this.interruptionRequested) return await this.finalize('INCOMPLETE_PROCESS_INTERRUPTION', 'PROCESS_INTERRUPTION');
    if (this.promotionStop !== null) return await this.finalize(this.promotionStop.resultClass, this.promotionStop.stopReason);
    if (this.currentStorm !== null) return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'FAILURE_STORM_SHARED_ROOT_SYMPTOM');
    return await this.finalize(this.dossiers.length > 0 ? 'COMPLETE_WITH_FINDINGS' : 'COMPLETE_CLEAN', 'NONE');
  }

  async run(options: CampaignRunOptions = {}): Promise<CampaignRunResult> {
    this.persistManifest();
    if (this.state.campaignStatus !== 'IN_PROGRESS' && this.state.campaignStatus !== 'INCOMPLETE_PROCESS_INTERRUPTION') {
      return await this.finalize(this.state.campaignStatus, this.state.stopReason);
    }
    try {
      this.assertCurrentVersions();
    } catch {
      this.state = {
        ...this.state,
        versionDrift: [...new Set([...this.state.versionDrift, 'CAMPAIGN_VERSION_DRIFT'])],
        unresolved: [...new Set([...this.state.unresolved, 'CAMPAIGN_VERSION_DRIFT'])],
      };
      return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'CAMPAIGN_VERSION_DRIFT');
    }
    const globalPreflight = await this.preflight(null);
    if (!globalPreflight.passed) {
      const stop = this.stopForPreflight(globalPreflight);
      this.state = { ...this.state, unresolved: [...this.state.unresolved, ...globalPreflight.failedChecks] };
      return await this.finalize(stop.resultClass, stop.stopReason);
    }
    this.checkpoint();
    if (this.manifest.mode === 'REPRODUCTION_ONLY') return await this.runReproductionOnly();
    let stop: { resultClass: CampaignResultClass; stopReason: CampaignCheckpoint['stopReason'] } | null = null;
    for (const item of this.manifest.workItems) {
      const result = await this.executeWorkItem(item);
      if (result.stopped !== null) { stop = result.stopped; break; }
      if (options.stopAfterWorkItemId === item.workItemId) {
        this.state = {
          ...this.state,
          campaignStatus: 'INCOMPLETE_PROCESS_INTERRUPTION',
          stopReason: 'PROCESS_INTERRUPTION',
          nextExactAction: `execute ${this.state.remainingWorkItemIds[0] ?? 'finalize morning brief'}`,
          unresolved: [...this.state.unresolved, 'PROCESS_INTERRUPTION_SIMULATED'],
        };
        return await this.finalize('INCOMPLETE_PROCESS_INTERRUPTION', 'PROCESS_INTERRUPTION');
      }
    }
    if (stop === null) {
      await this.promoteFindings();
      if (this.interruptionRequested) stop = { resultClass: 'INCOMPLETE_PROCESS_INTERRUPTION', stopReason: 'PROCESS_INTERRUPTION' };
      else if (this.promotionStop !== null) stop = this.promotionStop;
      else if (this.currentStorm !== null) stop = { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: this.currentStorm.reasonCode === 'SHARED_ROOT_SYMPTOM' ? 'FAILURE_STORM_SHARED_ROOT_SYMPTOM' : 'SAFETY_EVENT' };
    }
    if (stop !== null) return await this.finalize(stop.resultClass, stop.stopReason);
    const hasDossiers = this.dossiers.length > 0;
    return await this.finalize(hasDossiers ? 'COMPLETE_WITH_FINDINGS' : 'COMPLETE_CLEAN', 'NONE');
  }
}

export interface CampaignPrepareOptions {
  readonly store?: PrivateArtifactStore;
  readonly now?: () => Date;
  /** Optional runtime fingerprint check used before a manifest is frozen. */
  readonly currentVersions?: CampaignRunOptions['currentVersions'];
}

/**
 * Persist a fresh manifest and its ordinal-zero checkpoint without invoking
 * any executor callback. Real adapters use this as the explicit freeze point
 * before the separate resume command is allowed to perform product work.
 */
export function prepareCampaign(manifest: CampaignManifest, options: CampaignPrepareOptions = {}): CampaignCheckpoint {
  validateCampaignManifest(manifest);
  const store = new CampaignCheckpointStore(options.store ?? new PrivateArtifactStore());
  const paths = store.paths(manifest.campaignId);
  if (fs.existsSync(paths.manifest) || fs.existsSync(paths.checkpoint)) throw new Error('CAMPAIGN_ALREADY_PREPARED');
  if (options.currentVersions !== undefined) {
    const current = typeof options.currentVersions === 'function' ? options.currentVersions() : options.currentVersions;
    if (stableCampaignJson(current) !== stableCampaignJson(manifest.versions)) throw new Error('CAMPAIGN_VERSION_DRIFT');
  }
  const now = options.now ?? (() => new Date());
  const checkpoint = initialCheckpoint(manifest, now);
  assertManifestCompatible(manifest, checkpoint);
  store.writeManifest(manifest);
  store.writeCheckpoint(checkpoint, manifest);
  return checkpoint;
}

export async function runCampaign(manifest: CampaignManifest, executor: CampaignExecutor, options: CampaignRunOptions = {}): Promise<CampaignRunResult> {
  const orchestrator = new CampaignOrchestrator(manifest, executor, options);
  return await orchestrator.run(options);
}

export function resumeCampaign(manifest: CampaignManifest, executor: CampaignExecutor, options: Omit<CampaignRunOptions, 'checkpoint'> & { readonly checkpointStore?: CampaignCheckpointStore } = {}): Promise<CampaignRunResult> {
  const store = options.checkpointStore ?? new CampaignCheckpointStore(options.store ?? new PrivateArtifactStore());
  const checkpoint = store.readCheckpoint(manifest.campaignId, manifest);
  return runCampaign(manifest, executor, { ...options, store: store.store, checkpoint });
}
