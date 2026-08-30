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
import { createBugDossierV2, DOSSIER_VERSION_V2, isReadySemanticDossier, parseBugDossierV2 } from '../triage/dossierV2';
import { triageAnomaly } from '../triage/pipeline';
import { toSemanticDossierEvidence } from '../../oracles/semantic/dossier';
import { createSemanticTriageEvidence, type SemanticTriageEvidence } from '../triage/semanticTriageEvidence';
import {
  buildSemanticAwarePromotionResult,
  currentnessFromCampaignSemantic,
  currentnessFromSourceFreshness,
  dossierTargetForClusterKind,
  semanticPromotionEligible,
  type SemanticAwarePromotionResult,
  type PromotionMinimizationClass,
  type PromotionSourceCurrentness,
} from '../triage/promotionResult';
import { approvedMappingForBundle } from '../../oracles/semantic/campaignTargetMapping';
import { bundleSupportsTarget, campaignSemanticBundleById } from './realCampaignSemanticWiring';
import { validateCampaignSemanticEvidence, type CampaignSemanticEvidence } from './campaignSemanticEvidence';
import { createTriageReplayPlanV2 } from '../triage/replayPlan';
import { executeReplayPlanV2 } from '../triage/replayBinding';
import type { BugDossierV2, BugDossierV2Input } from '../triage/dossierV2';
import {
  gateBlockCandidateLifecycle,
  initialLifecycleRecord,
  isTerminalCandidateLifecycleState,
  transitionCandidateLifecycle,
  type CandidateLifecycleEvent,
  type CandidateLifecycleRecord,
  type CandidateLifecycleState,
  type CandidateLifecycleVariant,
} from './candidateLifecycle';
import { clusterSemanticObservations, semanticContractIdentityFromInvariantId } from '../../oracles/semantic/cluster';
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
import { CampaignCheckpointStore, evaluateResumeCompatibility, grantWorkItemAttempt, validateCampaignCheckpoint, type CheckpointResumeRefusal } from './checkpoint';
import { assertManifestCompatible, stableCampaignJson, validateCampaignManifest } from './identity';
import { detectFailureStorm, type FailureStorm } from './storm';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  type CampaignAnomalyCandidate,
  type CampaignCheckpoint,
  type CampaignExecutionContext,
  type CampaignExecutionOutcome,
  type CampaignExecutionRecord,
  type CampaignExecutor,
  type CampaignInterruptedWorkRecord,
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
  type CampaignWorkItemRetryRecord,
  type CampaignWorkKind,
  type CampaignWorkState,
  type ExecutionGuarantee,
  ZERO_CAMPAIGN_PRIVACY,
  ZERO_CAMPAIGN_SAFETY,
} from './types';
import type { EvidenceLevel } from '../triage/types';
import { createSemanticReplayFidelityReceipt, type SemanticReplayCurrentness, type SemanticReplayFidelityReceipt, type SemanticReplayOutcomeClass } from '../triage/semanticReplay';

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
  if (candidate.campaignSemanticEvidence !== undefined) {
    // Strict DTO validation is the privacy authority; unknown/raw sentinel
    // fields are rejected before any historical cluster admission.
    validateCampaignSemanticEvidence(candidate.campaignSemanticEvidence);
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

function hasValidSemanticEvidence(candidate: CampaignAnomalyCandidate): boolean {
  const evidence = candidate.campaignSemanticEvidence;
  if (evidence === undefined) return false;
  try {
    validateCampaignSemanticEvidence(evidence);
    // Mechanical completeness gate: bundle+finding facts must both be present;
    // otherwise route through historical protocol clustering.
    if (!evidence.bundleId || !evidence.bundleVersion || !evidence.targetId || !evidence.expectationId || !evidence.sourceEvidenceDigest || !evidence.invariantDefinitionId || !evidence.findingFingerprint) return false;
    return true;
  } catch {
    return false;
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

function terminalNextAction(): string {
  return 'inspect campaign checkpoint and morning brief';
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

/**
 * Maps the campaign receipt outcome onto the semantic-triage outcome
 * vocabulary. The vocabularies overlap except for EXPECTATION_SOURCE_
 * UNAVAILABLE, whose triage-side counterpart is EXPECTATION_UNAVAILABLE;
 * HIGH-confidence blocking keys off receiptOutcome/sourceCurrentness either
 * way, so this mapping never weakens a blocker.
 */
function semanticOutcomeFromReceipt(receiptOutcome: CampaignSemanticEvidence['receiptOutcome']): SemanticTriageEvidence['semanticOutcome'] {
  switch (receiptOutcome) {
    case 'PASS': return 'PASS';
    case 'ANOMALY': return 'ANOMALY';
    case 'NOT_APPLICABLE': return 'NOT_APPLICABLE';
    case 'NO_EXPECTATION': return 'NO_EXPECTATION';
    case 'EXPECTATION_SOURCE_STALE': return 'EXPECTATION_SOURCE_STALE';
    case 'EXPECTATION_SOURCE_UNAVAILABLE': return 'EXPECTATION_UNAVAILABLE';
    case 'INVALID_INPUT': return 'INVALID_INPUT';
    case 'PROJECTION_LIMIT_EXCEEDED': return 'PROJECTION_LIMIT_EXCEEDED';
    case 'INTERNAL_ERROR': return 'INTERNAL_ERROR';
    case 'PARTIAL_COVERAGE': return 'PARTIAL_COVERAGE';
  }
}

/**
 * Bridges the minimization fresh-exact classification onto the raw replay
 * outcome pair consumed by promotionReplayEvidenceFromOutcome. The promotion
 * DTO reads the pair as the replay-run verdict: PASS certifies the fresh
 * exact replay reproduced the target anomaly (the minimizer's REPRODUCED),
 * FAILURE records a non-reproducing run, INVALID an uncertified run.
 */
function freshExactReplayStatus(freshExactReplay: 'REPRODUCED' | 'NOT_REPRODUCED' | 'INVALID'): 'FAILURE' | 'PASS' | 'INVALID' {
  if (freshExactReplay === 'REPRODUCED') return 'PASS';
  return freshExactReplay === 'INVALID' ? 'INVALID' : 'FAILURE';
}

function replayCurrentnessFor(value: CampaignSemanticEvidence['sourceCurrentness']): SemanticReplayCurrentness {
  switch (value) {
    case 'CURRENT': return 'CURRENT';
    case 'STALE': return 'STALE';
    case 'UNAVAILABLE': return 'MISSING';
    case 'LOCAL_TRACKING_ONLY': return 'AMBIGUOUS';
    case 'UNKNOWN': return 'AMBIGUOUS';
  }
}

/** Build the Phase 18 receipt from the actual minimizer ledger. A historical
 * fresh replay is insufficient: the retained candidate must have an actual
 * occurrence-bound REPRODUCES evaluation before the receipt can say
 * REPRODUCED_EXACT. */
function semanticReplayFidelityFor(input: {
  readonly candidate: CampaignAnomalyCandidate;
  readonly evidence: CampaignSemanticEvidence;
  readonly minimization: Awaited<ReturnType<typeof triageAnomaly>>['minimization'];
  readonly safety: BugDossier['safety'];
  readonly privacy: BugDossier['privacy'];
}): SemanticReplayFidelityReceipt {
  const expectedContractIdentity = semanticContractIdentityFromInvariantId({
    expectationId: input.evidence.expectationId,
    targetId: input.evidence.targetId,
    invariantDefinitionId: input.evidence.invariantDefinitionId,
    sourceProvenance: {
      repoId: input.evidence.sourceRepoId,
      derivationVersion: input.evidence.sourceDerivationVersion,
      evidenceDigest: input.evidence.sourceEvidenceDigest,
    },
  });
  const evaluations = input.minimization.candidateEvaluations;
  const fresh = evaluations[0];
  const minimalSequence = input.minimization.minimalReproducingSequence;
  const minimalOrdinals = input.minimization.minimalReproducingOccurrenceOrdinals;
  const sameSequence = (evaluation: typeof evaluations[number]): boolean =>
    evaluation.sequence.length === minimalSequence.length
    && evaluation.sequence.every((actionId, index) => actionId === minimalSequence[index])
    && (minimalOrdinals === undefined
      || (evaluation.occurrenceOrdinals !== undefined
        && evaluation.occurrenceOrdinals.length === minimalOrdinals.length
        && evaluation.occurrenceOrdinals.every((ordinal, index) => ordinal === minimalOrdinals[index])));
  const minimal = minimalSequence.length === 0
    ? undefined
    : evaluations.find(sameSequence);
  const duplicateIds = new Set(input.candidate.originalSequence.map((action) => action.actionId).filter((id, index, all) => all.indexOf(id) !== index));
  const occurrenceBinding = minimal?.occurrenceOrdinals !== undefined
    ? 'BOUND' as const
    : duplicateIds.size > 0 ? 'AMBIGUOUS' as const : 'BOUND' as const;
  const sourceCurrentness = replayCurrentnessFor(input.evidence.sourceCurrentness);
  const safetyClean = Object.values(input.safety).every((value) => value === 0)
    && input.privacy.result === 'PASS'
    && Object.entries(input.privacy).filter(([key]) => key !== 'result').every(([, value]) => value === false);
  const deterministic = !evaluations.some((evaluation) => evaluation.reason === 'EXECUTOR_NONDETERMINISTIC');
  const observedSemanticFindingFingerprint = minimal?.semanticFindingFingerprint ?? fresh?.semanticFindingFingerprint;
  const observedContractIdentity = minimal?.semanticContractIdentity ?? fresh?.semanticContractIdentity;
  const minimalExact = minimal?.disposition === 'REPRODUCES'
    && minimal.fingerprintMatch === true
    && observedSemanticFindingFingerprint === input.evidence.findingFingerprint;
  let outcomeClass: SemanticReplayOutcomeClass;
  if (sourceCurrentness === 'STALE') outcomeClass = 'SOURCE_STALE';
  else if (sourceCurrentness !== 'CURRENT') outcomeClass = 'INVALID_REPLAY';
  else if (occurrenceBinding === 'AMBIGUOUS') outcomeClass = 'AMBIGUOUS_OCCURRENCE';
  else if (!safetyClean || !deterministic) outcomeClass = 'INFRA_FAILURE';
  else if (fresh?.disposition === 'INVALID') outcomeClass = fresh.reason === 'PRECONDITION_DIVERGENCE' ? 'PRECONDITION_DIVERGENCE' : fresh.reason === 'EXECUTOR_THROW' || fresh.reason === 'EXECUTOR_NONDETERMINISTIC' ? 'INFRA_FAILURE' : 'INVALID_REPLAY';
  else if (fresh?.disposition !== 'REPRODUCES') outcomeClass = 'NOT_REPRODUCED';
  else if (minimalExact) outcomeClass = 'REPRODUCED_EXACT';
  else if (minimal?.disposition === 'REPRODUCES' && observedContractIdentity === expectedContractIdentity) outcomeClass = 'REPRODUCED_EQUIVALENT_SEMANTIC';
  else if (minimal?.disposition === 'REPRODUCES' && (observedSemanticFindingFingerprint !== undefined || observedContractIdentity !== undefined)) outcomeClass = 'SEMANTIC_DIVERGENCE';
  else if (minimal?.disposition === 'INVALID' && minimal.reason === 'PRECONDITION_DIVERGENCE') outcomeClass = 'PRECONDITION_DIVERGENCE';
  else outcomeClass = 'NOT_REPRODUCED';
  const rejectionReason = outcomeClass === 'AMBIGUOUS_OCCURRENCE'
    ? 'ACTION_OCCURRENCE_AMBIGUOUS' as const
    : outcomeClass === 'PRECONDITION_DIVERGENCE'
      ? 'PREDECESSOR_CONTEXT_MISMATCH' as const
      : outcomeClass === 'SOURCE_STALE'
        ? 'SOURCE_CURRENTNESS_UNRESOLVED' as const
        : outcomeClass === 'INVALID_REPLAY'
          ? sourceCurrentness === 'CURRENT' ? 'EXECUTOR_NOT_RUN' as const : 'SOURCE_CURRENTNESS_UNRESOLVED' as const
          : outcomeClass === 'INFRA_FAILURE'
            ? deterministic ? 'EXECUTOR_NOT_RUN' as const : 'EXECUTOR_NONDETERMINISTIC' as const
            : undefined;
  return createSemanticReplayFidelityReceipt({
    expectedSemanticFindingFingerprint: input.evidence.findingFingerprint,
    expectedContractIdentity,
    ...(observedSemanticFindingFingerprint === undefined ? {} : { observedSemanticFindingFingerprint }),
    ...(observedContractIdentity === undefined ? {} : { observedContractIdentity }),
    outcomeClass,
    occurrenceBinding,
    originalOccurrenceCount: input.candidate.originalSequence.length,
    retainedOccurrenceCount: minimal?.occurrenceOrdinals?.length ?? (minimalSequence.length > 0 ? minimalSequence.length : 0),
    sourceCurrentness,
    safetyClean,
    deterministic,
    ...(rejectionReason === undefined ? {} : { rejectionReason }),
  });
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
  // Phase 15 Session 2 (T1): per-cluster candidate lifecycle records keyed by
  // clusterId. Authoritative in-memory; persisted into every new checkpoint as
  // `candidateLifecycles` and restored from it on resume.
  private readonly candidateLifecycles = new Map<string, CandidateLifecycleRecord>();
  // Phase 15 Session 2 (T5): one converged promotion verdict per promoted cluster.
  private readonly promotionResultLedger: SemanticAwarePromotionResult[] = [];
  // Phase 15P A09: bounded per-work-item retry reservations with explicit
  // reserved-attempt ids. Authoritative in-memory; persisted into every new
  // checkpoint as `workItemRetries` and restored from it on resume so the
  // attempt ceiling survives process restarts.
  private readonly workItemRetries = new Map<string, CampaignWorkItemRetryRecord>();
  // Phase 15P A09: structured last version-compatibility refusal (null while
  // compatible). Built from evaluateResumeCompatibility at the same sites that
  // record CAMPAIGN_VERSION_DRIFT; never replaces the thrown/stop behavior.
  private lastResumeRefusal: CheckpointResumeRefusal | null = null;
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
      this.lastResumeRefusal = this.versionDriftRefusal();
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
    // Session-2 lifecycle records survive resume; the checkpoint validator has
    // already proven their shape and cluster-ledger referential integrity.
    for (const [clusterId, record] of Object.entries(this.state.candidateLifecycles ?? {})) {
      this.candidateLifecycles.set(clusterId, record);
    }
    // Phase 15P A09: retry reservations survive resume the same way; the
    // checkpoint validator has already proven their shape and ledger mirror.
    for (const [workItemId, record] of Object.entries(this.state.workItemRetries ?? {})) {
      this.workItemRetries.set(workItemId, record);
    }
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

  /**
   * Phase 15P A09: structured drift envelope for the current version state.
   * Pure evaluation — it never reaches an executor callback and never
   * replaces the existing thrown/stop behavior; it only names the drifted
   * components for structured consumers.
   */
  private versionDriftRefusal(): CheckpointResumeRefusal {
    const current = typeof this.currentVersions === 'function' ? this.currentVersions() : this.currentVersions;
    return evaluateResumeCompatibility({
      checkpoint: this.state,
      manifest: this.manifest,
      ...(current === undefined ? {} : { currentVersions: current }),
    });
  }

  /** Phase 15P A09: last incompatible-drift envelope, or null while compatible. */
  get resumeRefusal(): CheckpointResumeRefusal | null {
    return this.lastResumeRefusal;
  }

  /**
   * Phase 15P A09: reserve the next attempt of a work item against the frozen
   * retry ceiling. Exhaustion or any counter inconsistency refuses fail-closed
   * before the executor callback is reachable.
   */
  private reserveAttempt(workItemId: string, nextAttempt: number): { readonly granted: true; readonly attemptId: string } | { readonly granted: false; readonly code: 'WORK_ITEM_RETRY_BUDGET_EXHAUSTED' } {
    const grant = grantWorkItemAttempt(workItemId, this.workItemRetries.get(workItemId), nextAttempt);
    if (!grant.granted) return grant;
    this.workItemRetries.set(workItemId, grant.record);
    return { granted: true, attemptId: grant.attemptId };
  }

  private loadDossiers(): void {
    for (const entry of this.state.dossierLedger) {
      if (entry.state !== 'READY' || entry.artifactPath === null || !fs.existsSync(entry.artifactPath)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(entry.artifactPath, 'utf8')) as Record<string, unknown>;
        // Session-2 v2 artifacts are persisted enveloped ({ dossier }) because
        // the artifact store spreads its own wrapper `status` over the top
        // level; unwrap before strict validation. Historical v1 remains
        // compatible: absent dossierVersion or explicit v1 uses v1 validator.
        const candidate = (raw.dossier ?? raw) as Record<string, unknown>;
        if (entry.dossierVersion === DOSSIER_VERSION_V2 || candidate.schemaVersion === DOSSIER_VERSION_V2) {
          parseBugDossierV2(candidate as unknown);
          // Session-2 (T4e): v2 dossiers are proven valid here but stay OUT of
          // the v1-only in-memory consumer list (brief/retention/summaries and
          // CampaignRunResult.dossiers). Re-promotion exclusion works through
          // the dossierLedger READY entry, not through this list.
          continue;
        }
        validateBugDossier(raw as unknown as BugDossier);
        this.dossiers.push(raw as unknown as BugDossier);
      } catch {
        this.nightwatchIssues.push('NIGHTWATCH_INTERNAL_DEFECT:DOSSIER_READBACK_FAILED');
      }
    }
  }

  checkpoint(): CampaignCheckpoint {
    // Session-2 additions are stamped on every newly built checkpoint. Records
    // whose cluster left the anomalyClusters ledger (duplicate-suppression cap)
    // are pruned from the persisted snapshot so the ledger cross-check stays
    // truthful; the live map keeps them in case the cluster reappears.
    const knownClusterIds = new Set(this.state.anomalyClusters.map((cluster) => cluster.clusterId));
    const persistedLifecycles: Record<string, CandidateLifecycleRecord> = {};
    for (const [clusterId, record] of this.candidateLifecycles) {
      if (knownClusterIds.has(clusterId)) persistedLifecycles[clusterId] = record;
    }
    // Phase 15P A09: durable interrupted-work bookkeeping — every mid-flight
    // execution-ledger / reproduction-queue state is recorded with the phase
    // reached, the ordinal, and its reservation state so resume reconstructs
    // exact continuation points without re-deriving them from queue states.
    const nextOrdinal = this.state.checkpointOrdinal + 1;
    const interruptedWork: CampaignInterruptedWorkRecord[] = [];
    for (const record of this.state.executionLedger) {
      if (record.state !== 'RUNNING' && record.state !== 'REPLAY_REQUIRED') continue;
      interruptedWork.push({ workItemId: record.workItemId, clusterId: null, phaseReached: record.state, ordinal: nextOrdinal, reservationState: record.state === 'RUNNING' ? 'RESERVED' : 'CONSUMED' });
    }
    for (const item of this.state.reproductionQueue) {
      if (item.state !== 'RUNNING' && item.state !== 'REPLAY_REQUIRED') continue;
      interruptedWork.push({ workItemId: null, clusterId: item.clusterId, phaseReached: item.state, ordinal: nextOrdinal, reservationState: item.state === 'RUNNING' ? 'RESERVED' : 'CONSUMED' });
    }
    const persistedRetries: Record<string, CampaignWorkItemRetryRecord> = {};
    for (const [workItemId, record] of this.workItemRetries) persistedRetries[workItemId] = record;
    // Phase 15H hardening: the interrupted-work/retry fields are RECOMPUTED
    // from current runtime state on every checkpoint. An explicit undefined
    // must override any value carried by the spread of the previous
    // checkpoint — omitting the key left stale mid-flight entries from an
    // earlier ordinal inside later checkpoints, and the integrity validator
    // correctly rejected them as ledger/bookkeeping divergence.
    const checkpoint: CampaignCheckpoint = {
      ...this.state,
      checkpointOrdinal: this.state.checkpointOrdinal + 1,
      budgetUsed: this.budget.used(),
      budgetRemaining: this.budget.remaining(),
      runtimeElapsedMs: this.time.elapsedMs(),
      updatedAt: nowIso(this.now),
      completedWorkItemIds: completedWorkItems(this.state.executionLedger),
      remainingWorkItemIds: remainingWorkItems(this.manifest, this.state.executionLedger),
      nextExactAction: this.state.campaignStatus === 'IN_PROGRESS'
        ? `execute ${remainingWorkItems(this.manifest, this.state.executionLedger)[0] ?? 'finalize morning brief'}`
        : this.state.campaignStatus === 'INCOMPLETE_PROCESS_INTERRUPTION'
          ? (this.state.executionLedger.find((record) => record.state === 'REPLAY_REQUIRED')?.workItemId === undefined
            ? (this.state.nextExactAction.startsWith('resume reproduction ') || this.state.nextExactAction.startsWith('replay ')
              ? this.state.nextExactAction
              : `execute ${remainingWorkItems(this.manifest, this.state.executionLedger)[0] ?? 'resume campaign'}`)
            : `replay ${this.state.executionLedger.find((record) => record.state === 'REPLAY_REQUIRED')!.workItemId}`)
          : terminalNextAction(),
      candidateLifecycles: persistedLifecycles,
      runtimeContractVersions: { ...CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED },
      ...(interruptedWork.length > 0 ? { interruptedWork } : { interruptedWork: undefined }),
      ...(Object.keys(persistedRetries).length > 0 ? { workItemRetries: persistedRetries } : { workItemRetries: undefined }),
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

  // ---------------------------------------------------------------------------
  // Phase 15 Session 2 (T1) — candidate lifecycle wiring.
  //
  // Mapping (each transition goes through transitionCandidateLifecycle; illegal
  // sequences throw CANDIDATE_LIFECYCLE_ILLEGAL_TRANSITION and are never bent):
  //   cluster created during recomputeClusters      => ADMIT                OBSERVED -> ADMITTED
  //   transient rejection in promoteFindings        => REJECT 'TRANSIENT'   ADMITTED -> REJECTED
  //   false-positive rejection                      => REJECT 'FALSE_POSITIVE'
  //   reproduction COMPLETED                        => CONFIRM_REPRODUCTION ADMITTED -> REPRODUCED
  //   reproduction BLOCKED/SKIPPED/failed           => FAIL_REPRODUCTION    ADMITTED -> UNRESOLVED
  //   minimization applied (status MINIMIZED)       => APPLY_MINIMIZATION   REPRODUCED -> MINIMIZED
  //   minimization unchanged (status UNCHANGED)     => KEEP_UNCHANGED       REPRODUCED -> UNCHANGED
  //   minimization NO_REPRODUCTION / INVALID_ORIGINAL / BOUNDED_BUDGET_EXHAUSTED
  //                                                 => FAIL_REPRODUCTION    REPRODUCED -> UNRESOLVED
  //   triage cluster formed (Phase 15P A05 r2)      => CLUSTERED 'TRIAGE_CLUSTER_FORMED'
  //                                                                         MINIMIZED -> CLUSTERED
  //   triage pipeline completed                     => COMPLETE_TRIAGE      MINIMIZED|CLUSTERED|UNCHANGED -> TRIAGED
  //   dossier READY (v1 or v2)                      => MARK_DOSSIER_READY   TRIAGED -> DOSSIER_READY
  //   dossier v2 UNRESOLVED                         => CLASSIFY_UNRESOLVED 'DOSSIER_UNRESOLVED'
  //   error after admission, before minimization    => FAIL_REPRODUCTION 'REPRODUCTION_FAILED'
  // Phase 15P (A05) gate routing — safety/privacy/currentness/budget gate
  // failures are load-bearing and always land in an explicit terminal state:
  //   safety event during reproduction              => GATE_BLOCK 'SAFETY_EVENT_DURING_REPRODUCTION'
  //   unclean reproduction privacy                  => GATE_BLOCK 'PRIVACY_BLOCKED'
  //   later pipeline errors (post-minimization)     => GATE_BLOCK <safe error code>
  //   finalized non-resumable run leftovers         => GATE_BLOCK <stopReason|PROMOTION_CAP_UNPROCESSED>
  // GATE_BLOCK is legal from every pre-triage open state and requires its
  // reason code; TRIAGED exits only through CLASSIFY_* (a gate failure there
  // routes via CLASSIFY_UNRESOLVED). Resumable process interruptions keep
  // their truthful mid-pipeline records.
  // Reason codes are safe uppercase tokens only; raw product values never enter
  // this ledger.
  // ---------------------------------------------------------------------------

  private lifecycleVariant(cluster: AnomalyCluster): CandidateLifecycleVariant {
    const representative = this.candidates.get(cluster.primaryRunId);
    return representative !== undefined && hasValidSemanticEvidence(representative) ? 'SEMANTIC' : 'PROTOCOL_ONLY';
  }

  /** Promotion DTO cluster kind derived from the same semantic-path evidence. */
  private promotionClusterKind(cluster: AnomalyCluster): 'PROTOCOL' | 'SEMANTIC' {
    return this.lifecycleVariant(cluster) === 'SEMANTIC' ? 'SEMANTIC' : 'PROTOCOL';
  }

  /** Admit a newly observed cluster exactly once; recompute is idempotent. */
  private admitClusterLifecycle(cluster: AnomalyCluster): void {
    if (this.candidateLifecycles.has(cluster.clusterId)) return;
    this.candidateLifecycles.set(cluster.clusterId, transitionCandidateLifecycle(initialLifecycleRecord(this.lifecycleVariant(cluster)), 'ADMIT'));
  }

  private lifecycleStateFor(clusterId: string): CandidateLifecycleState | null {
    return this.candidateLifecycles.get(clusterId)?.state ?? null;
  }

  private transitionClusterLifecycle(clusterId: string, event: CandidateLifecycleEvent, reasonCode?: string): void {
    const record = this.candidateLifecycles.get(clusterId);
    if (record === undefined) throw new Error('NIGHTWATCH_INTERNAL_DEFECT:LIFECYCLE_RECORD_MISSING');
    this.candidateLifecycles.set(clusterId, transitionCandidateLifecycle(record, event, reasonCode));
  }

  /**
   * Error-path classification: FAIL_REPRODUCTION is only legal before
   * minimization has been applied. Later failures leave the record at the
   * state the pipeline actually reached — truthful mid-pipeline progress —
   * instead of bending the machine through an illegal edge.
   */
  private failReproductionIfLegal(clusterId: string, reasonCode: string): void {
    const state = this.lifecycleStateFor(clusterId);
    if (state === 'OBSERVED' || state === 'ADMITTED' || state === 'REPRODUCED') {
      this.transitionClusterLifecycle(clusterId, 'FAIL_REPRODUCTION', reasonCode);
    }
  }

  /**
   * Phase 15P (A05) — load-bearing gate close. A safety/privacy/currentness/
   * budget gate failure must land the record in an explicit terminal state
   * with the gate's reason code; it is never left in an ambiguous mid-state.
   * TRIAGED has no GATE_BLOCK edge by design (classification edges are its
   * only exits), so a gate failure there routes through CLASSIFY_UNRESOLVED;
   * already-terminal records are left untouched (idempotent). A missing
   * record means the gate fired before admission — nothing to close.
   */
  private closeOnGateFailure(clusterId: string, reasonCode: string): void {
    const record = this.candidateLifecycles.get(clusterId);
    if (record === undefined || isTerminalCandidateLifecycleState(record.state)) return;
    if (record.state === 'TRIAGED') {
      this.transitionClusterLifecycle(clusterId, 'CLASSIFY_UNRESOLVED', reasonCode);
      return;
    }
    this.candidateLifecycles.set(clusterId, gateBlockCandidateLifecycle(record, reasonCode));
  }

  private recomputeClusters(): readonly AnomalyCluster[] {
    if (this.observations.length === 0) {
      this.state = { ...this.state, anomalyClusters: [] };
      return [];
    }
    // Explicit dual-path: semantic candidates via contract identity, protocol-only via historical clustering.
    const semanticCandidates = [...this.candidates.values()].filter(hasValidSemanticEvidence);
    if (semanticCandidates.length === 0) {
      const clusters = suppressDuplicateClusters(clusterAnomalies(this.observations), 100).map((cluster) => {
        const alias = this.clusterIdAliases.get(cluster.clusterId);
        return alias === undefined ? cluster : { ...cluster, clusterId: alias };
      });
      for (const cluster of clusters) this.admitClusterLifecycle(cluster);
      this.state = { ...this.state, anomalyClusters: clusters };
      return clusters;
    }
    const semanticCandidateRunIds = new Set(semanticCandidates.map((c) => c.observation.runId));
    const protocolObservations: TriageAnomalyObservation[] = this.observations.filter((o) => !semanticCandidateRunIds.has(o.runId));
    const semanticObservationsRaw = this.observations.filter((o) => semanticCandidateRunIds.has(o.runId));

    const protocolClusters =
      protocolObservations.length === 0
        ? []
        : suppressDuplicateClusters(clusterAnomalies(protocolObservations), 100).map((cluster) => {
            const alias = this.clusterIdAliases.get(cluster.clusterId);
            return alias === undefined ? cluster : { ...cluster, clusterId: alias };
          });

    // Build semantic observations for Phase-12 identity
    const semanticObservations: import('../../oracles/semantic/cluster').SemanticObservation[] = [];
    for (const obs of semanticObservationsRaw) {
      const cand = this.candidates.get(obs.runId);
      if (cand === undefined || !hasValidSemanticEvidence(cand)) continue;
      const ev = cand.campaignSemanticEvidence!;
      try {
        semanticObservations.push({
          runId: obs.runId,
          observedAt: obs.observedAt,
          expectationId: ev.expectationId,
          targetId: ev.targetId,
          // The campaign evidence already carries the source-derived
          // invariant identity. Keep the full contract out of persistence and
          // let the clustering adapter use that identity directly.
          // Compatibility carrier only: when invariantDefinitionId is
          // present, this placeholder is never canonicalized or persisted.
          invariant: { kind: 'FIELD_PRESENT', path: ['__semantic_contract_placeholder__'], expected: true },
          invariantDefinitionId: ev.invariantDefinitionId,
          sourceProvenance: {
            repoId: ev.sourceRepoId,
            derivationVersion: ev.sourceDerivationVersion,
            evidenceDigest: ev.sourceEvidenceDigest,
            sha: ev.sourceSha,
          },
          fingerprint: obs.fingerprint,
          reproduced: obs.reproduced,
        });
      } catch {
        // Fall back to protocol bucket for this observation if semantic identity cannot be established
        protocolObservations.push(obs);
      }
    }
    let semanticAnomalyClusters: AnomalyCluster[] = [];
    if (semanticObservations.length > 0) {
      const semanticClusters = clusterSemanticObservations(semanticObservations);
      // Convert each semantic cluster to an AnomalyCluster with a distinct namespace.
      // clusterId is the semantic clusterKey (sc:sha256:...) which never collides with
      // protocol cluster:sha256:... per D13. Other fields mirror the representative
      // candidate's stable features so promotion can still locate the representative.
      const runIdToCandidate = new Map([...this.candidates.values()].map((c) => [c.observation.runId, c] as const));
      const obsByRunId = new Map(this.observations.map((o) => [o.runId, o] as const));
      semanticAnomalyClusters = semanticClusters.map((sc) => {
        const repRunId = sc.runIds[0]!;
        const repCandidate = runIdToCandidate.get(repRunId);
        const repObs = obsByRunId.get(repRunId);
        const features = repCandidate?.observation.features ?? repObs?.features ?? {
          journeyId: sc.targetId,
          envelopeId: null,
          oracleId: sc.expectationId,
          routeClass: null,
          operationFamily: null,
          statusClass: null,
          contentTypeClass: null,
          runtimeCategory: null,
          structuralState: null,
          failureActionId: null,
          sourceImpactRegion: null,
          browserApiResultClass: null,
        };
        const sortedRunIds = [...sc.runIds].sort((a, b) => a.localeCompare(b));
        const firstObs = obsByRunId.get(sortedRunIds[0]!) ?? repObs;
        const lastObs = obsByRunId.get(sortedRunIds[sortedRunIds.length - 1]!) ?? repObs;
        return {
          clusterId: sc.clusterKey,
          clusterKey: sc.clusterKey,
          fingerprint: sc.fingerprint,
          features: features as AnomalyCluster['features'],
          occurrenceCount: sc.occurrenceCount,
          reproductionCount: sc.reproductionCount,
          runIds: sc.runIds,
          firstObserved: firstObs?.observedAt ?? sc.runIds[0]!,
          lastObserved: lastObs?.observedAt ?? sc.runIds[sc.runIds.length - 1]!,
          timingVariance: 'NONE' as const,
          primaryRunId: sc.runIds[0]!,
        };
      });
    }

    // Re-cluster any semantic observations that failed identity derivation via protocol fallback already handled above by not pushing;
    // protocolClusters already computed from initial split, so merge.
    const clusters = [...protocolClusters, ...semanticAnomalyClusters].sort((a, b) => a.clusterId.localeCompare(b.clusterId));
    // Apply duplicate suppression cap globally (semantic runIds already bounded by clusterSemanticObservations, but keep limit)
    const capped = suppressDuplicateClusters(clusters as unknown as AnomalyCluster[], 100) as unknown as AnomalyCluster[];
    // Note: suppressDuplicateClusters slices runIds but preserves semantic key distinctness; for now keep capped as-is
    // Apply alias mapping for REPRODUCTION_ONLY legacy after distinct namespaces
    const aliased = capped.map((cluster) => {
      const alias = this.clusterIdAliases.get(cluster.clusterId);
      return alias === undefined ? cluster : { ...cluster, clusterId: alias };
    });
    for (const cluster of aliased) this.admitClusterLifecycle(cluster);
    this.state = { ...this.state, anomalyClusters: aliased };
    return aliased;
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
      // Session-2 (T4e): additive v2 counts only — the brief's top findings
      // stay v1-only; v2-ready dossiers surface as safe count lines.
      semanticDossierCounts: {
        ready: this.state.dossierLedger.filter((entry) => entry.dossierVersion === DOSSIER_VERSION_V2 && entry.state === 'READY').length,
        unresolved: this.state.dossierLedger.filter((entry) => entry.dossierVersion === DOSSIER_VERSION_V2 && entry.state !== 'READY').length,
      },
    });
    validateCampaignMorningBrief(brief);
    const briefPath = this.checkpointStore.store.writeJson(`${this.manifest.campaignId.replaceAll(':', '-')}.morning-brief.json`, { brief, text: renderCampaignMorningBrief(brief) });
    if (!this.artifactPaths.includes(briefPath)) this.artifactPaths.push(briefPath);
    this.chargeArtifact(briefPath);
    return brief;
  }

  /**
   * Phase 15P (A05) — terminal-state completeness sweep. A finalized run that
   * will never be resumed must not leave any candidate lifecycle record in an
   * ambiguous mid-state: every still-open record is routed to a terminal
   * state carrying the run's stop reason as the safe reason code (leftovers
   * of a clean run are promotion-cap/queue remainders). Resumable process
   * interruptions are excluded — their mid-pipeline records are the truthful
   * resume point and are pinned by the Session-2 resume tests.
   */
  private sweepOpenLifecyclesToTerminal(stopReason: CampaignCheckpoint['stopReason']): void {
    if (stopReason === 'PROCESS_INTERRUPTION') return;
    const reasonCode = stopReason === 'NONE' ? 'PROMOTION_CAP_UNPROCESSED' : stopReason;
    for (const [clusterId, record] of this.candidateLifecycles) {
      if (isTerminalCandidateLifecycleState(record.state)) continue;
      this.closeOnGateFailure(clusterId, reasonCode);
    }
  }

  private async finalize(resultClass: CampaignResultClass, stopReason: CampaignCheckpoint['stopReason']): Promise<CampaignRunResult> {
    const safety = this.state.safety;
    const privacy = this.state.privacy;
    const unresolved = resultClass === 'COMPLETE_CLEAN'
      ? this.state.unresolved.filter((item) => item !== 'PROCESS_INTERRUPTION' && item !== 'PROCESS_INTERRUPTION_SIMULATED')
      : this.state.unresolved;
    this.sweepOpenLifecyclesToTerminal(stopReason);
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
    // unresolved is a set-valued field: repeated stops across resumes (e.g. a
    // second interrupted resume, or the same preflight code after restart)
    // must stay idempotent or the checkpoint validator rejects the write.
    this.state = { ...this.state, executionLedger: ledger, unresolved: [...new Set([...this.state.unresolved, reasonCode])] };
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
      // Phase 15P A09: explicit attempt reservation before the durable RUNNING
      // marker. Exhaustion of the frozen retry ceiling refuses fail-closed
      // here — the executor callback below is never reached for a refused
      // attempt, and ledger/retry counters stay mirrored.
      const reservation = this.reserveAttempt(item.workItemId, previousAttempts + 1);
      if (!reservation.granted) {
        this.updateRecord(item.workItemId, { state: 'BLOCKED', reasonCode: reservation.code });
        this.markPendingSkipped(reservation.code);
        this.checkpoint();
        return { stopped: { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' } };
      }
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
        state: outcome.result === 'AUTH_BLOCKED' || outcome.result === 'SAFETY_BLOCKED' || outcome.result === 'RUNTIME_FAILURE' || outcome.result === 'INCOMPLETE' ? 'BLOCKED' : 'COMPLETED',
        executionGuarantee: executionGuarantee(item.kind, replay),
        result: outcome.result,
        reasonCode: outcome.reasonCode ?? (outcome.result === 'RUNTIME_FAILURE' || outcome.result === 'INCOMPLETE' ? outcome.result : null),
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
      if (outcome.result === 'RUNTIME_FAILURE' || outcome.result === 'INCOMPLETE' || outcome.result === 'AUTH_BLOCKED') {
        this.markPendingSkipped(outcome.reasonCode ?? outcome.result);
        this.checkpoint();
        return {
          stopped: outcome.result === 'AUTH_BLOCKED'
            ? { resultClass: 'PARTIAL_AUTH_BLOCKED', stopReason: 'AUTH_BLOCKED' }
            : { resultClass: 'PARTIAL_RUNTIME_INFRA_FAILURE', stopReason: 'PREFLIGHT_FAILED' },
        };
      }
      this.checkpoint();
      return { stopped: outcome.result === 'SAFETY_BLOCKED' ? { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'SAFETY_EVENT' } : null };
    } catch (error) {
      const code = safeErrorCode(error);
      if (error instanceof CampaignProcessInterruptionError) {
        this.updateRecord(item.workItemId, { state: 'REPLAY_REQUIRED', reasonCode: code, executionGuarantee: 'REPLAY_REQUIRED' });
        this.state = { ...this.state, campaignStatus: 'INCOMPLETE_PROCESS_INTERRUPTION', stopReason: 'PROCESS_INTERRUPTION', nextExactAction: `replay ${item.workItemId}`, unresolved: [...new Set([...this.state.unresolved, 'PROCESS_INTERRUPTION'])] };
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
      // T1: transient / false-positive candidates are rejected before any
      // reproduction or dossier work; the lifecycle record closes as REJECTED.
      // Phase 15P (A05): resume re-enters promoteFindings over restored
      // records — an already-terminal record is never re-rejected (the frozen
      // table has no REJECT edge from REJECTED and must never be bent).
      const rejectState = this.lifecycleStateFor(item.cluster.clusterId);
      if (rejectState === null || isTerminalCandidateLifecycleState(rejectState)) continue;
      this.transitionClusterLifecycle(item.cluster.clusterId, 'REJECT', item.representative.knownNightwatchDefect ? 'FALSE_POSITIVE' : 'TRANSIENT');
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
        this.transitionClusterLifecycle(queueItem.clusterId, 'FAIL_REPRODUCTION', 'REPRODUCTION_BLOCKED');
        this.state = {
          ...this.state,
          reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === queueItem.clusterId ? { ...item, state: 'BLOCKED', reasonCode: 'REPRODUCTION_ADAPTER_UNAVAILABLE' } : item),
          minimizationQueue: this.state.minimizationQueue.filter((id) => id !== queueItem.clusterId),
          unresolved: [...new Set([...this.state.unresolved, `${queueItem.clusterId}:REPRODUCTION_ADAPTER_UNAVAILABLE`])],
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
          // Phase 15P (A05): the safety gate is load-bearing — the candidate's
          // lifecycle closes at a terminal state carrying the gate identity
          // instead of stalling mid-pipeline.
          this.closeOnGateFailure(cluster.clusterId, 'SAFETY_EVENT_DURING_REPRODUCTION');
          this.state = { ...this.state, safetyEvents: [...this.state.safetyEvents, 'SAFETY_EVENT_DURING_REPRODUCTION'] };
          this.markPendingSkipped('SAFETY_EVENT_DURING_REPRODUCTION');
          this.checkpoint();
          this.currentStorm = { kind: 'FAILURE_STORM', reasonCode: 'SHARED_ROOT_SYMPTOM', rootKey: 'safety-event', fingerprint: cluster.fingerprint, oracleId: cluster.features.oracleId, runtimeCategory: 'SAFETY', affectedRunIds: cluster.runIds, affectedSurfaces: [candidateSurface(representative)], occurrenceCount: cluster.occurrenceCount };
          break;
        }
        if (!privacyIsClean(reproduction.privacy)) {
          // Phase 15P (A05): the privacy gate was previously merged but never
          // enforced on the promotion path; it now routes the candidate to an
          // explicit blocked terminal exactly like the execution path does.
          this.closeOnGateFailure(cluster.clusterId, 'PRIVACY_BLOCKED');
          this.markPendingSkipped('PRIVACY_BLOCKED');
          this.checkpoint();
          this.promotionStop = { resultClass: 'PARTIAL_SAFETY_BLOCKED', stopReason: 'PRIVACY_BLOCKED' };
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
          // T1: the reproduction phase did not confirm this candidate.
          this.transitionClusterLifecycle(cluster.clusterId, 'FAIL_REPRODUCTION', reproduction.result);
          this.transients.push(`${cluster.clusterId}:${reproduction.result}`);
          this.checkpoint();
          continue;
        }
        this.transitionClusterLifecycle(cluster.clusterId, 'CONFIRM_REPRODUCTION');
        const replay = reproduction.candidate?.replay ?? representative.replay!;
        const minimizationCandidatesRemaining = this.budget.remaining().minimizationCandidates;
        const minimizationReplaysRemaining = this.budget.remaining().replays;
        if (minimizationCandidatesRemaining === 0 || minimizationReplaysRemaining === 0) {
          const reason = `${cluster.clusterId}:MINIMIZATION_BUDGET_UNAVAILABLE`;
          this.transitionClusterLifecycle(cluster.clusterId, 'FAIL_REPRODUCTION', 'MINIMIZATION_BUDGET_UNAVAILABLE');
          this.recordPromotionResult({
            clusterId: cluster.clusterId,
            clusterKind: this.promotionClusterKind(cluster),
            candidateId: null,
            minimizationClass: 'MINIMIZATION_SKIPPED',
            confidence: 'UNRESOLVED',
            readiness: 'UNRESOLVED',
            readinessReasonCodes: ['MINIMIZATION_BUDGET_UNAVAILABLE'],
            sourceCurrentness: this.currentnessForCluster(representative),
          });
          this.state = {
            ...this.state,
            reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'BLOCKED', reasonCode: 'MINIMIZATION_BUDGET_UNAVAILABLE' } : item),
            minimizationQueue: this.state.minimizationQueue.filter((id) => id !== cluster.clusterId),
            unresolved: [...new Set([...this.state.unresolved, reason])],
          };
          this.promotionStop = { resultClass: 'PARTIAL_BUDGET_EXHAUSTED', stopReason: 'BUDGET_EXHAUSTED' };
          this.checkpoint();
          break;
        }
        // T3: every replay phase for a promoted candidate is now certified
        // through the V2 replay contract (see certifiedReplayClosure). The
        // former canned FRESH_EXACT_REPLAY bypass is gone: fresh-exact
        // outcomes come from the candidate's own replay closure through a
        // validated plan and flow through normalizeExecutorOutcome inside
        // executeReplayPlanV2.
        const semanticEvidence = hasValidSemanticEvidence(reproCandidate) ? reproCandidate.campaignSemanticEvidence! : null;
        // Semantic promotion replays against the finding identity carried by
        // the admitted campaign evidence. The protocol observation fingerprint
        // remains a separate clustering/display field; it is never allowed to
        // substitute for the semantic anomaly identity at the replay gate.
        const replayTargetFingerprint = semanticEvidence?.findingFingerprint ?? cluster.fingerprint;
        const certifiedReplay = this.certifiedReplayClosure({
          candidate: reproCandidate,
          anomalyFingerprint: replayTargetFingerprint,
          catalogVersion: reproCandidate.originalSequence[0]?.catalogVersion ?? this.manifest.versions.explorationCatalogVersion,
          replay,
        });
        const family = candidateSurface(reproCandidate);
        const incomplete = createIncompleteDossier({ anomalyFingerprint: cluster.fingerprint, journeyOrApiFamily: family, missingSections: ['minimization', 'source-correlation', 'fault-boundary', 'private-finalization'] });
        const incompletePath = this.checkpointStore.store.writeIncomplete(`${incomplete.candidateId.replaceAll(':', '-')}.json`, incomplete);
        if (!this.artifactPaths.includes(incompletePath)) this.artifactPaths.push(incompletePath);
        this.chargeArtifact(incompletePath);
        const sourceCorrelation = reproCandidate.sourceCorrelation;
        const minimizationBudget = {
          ...REAL_DEV_MINIMIZATION_BUDGET,
          maxCandidateEvaluations: Math.min(REAL_DEV_MINIMIZATION_BUDGET.maxCandidateEvaluations, minimizationCandidatesRemaining),
          maxTotalReplays: Math.min(REAL_DEV_MINIMIZATION_BUDGET.maxTotalReplays, minimizationReplaysRemaining + 1),
        };
        // T4: semantic clusters emit a v2 dossier, so the intermediate v1
        // artifact is not written for them (store omitted); protocol-only
        // clusters keep the historical v1 artifact + ledger behavior.
        const triaged = await triageAnomaly({
          originalSequence: reproCandidate.originalSequence,
          anomalyFingerprint: replayTargetFingerprint,
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
          replay: certifiedReplay,
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
          semanticEvidence: toSemanticDossierEvidence(reproCandidate.semanticFindings ?? []),
          store: semanticEvidence === null ? this.checkpointStore.store : undefined,
        });
        this.budget.consumeBundle({
          minimizationCandidates: triaged.minimization.candidateEvaluationCount,
          replays: Math.max(0, triaged.minimization.replayCount - 1),
        });
        // T1: minimization outcome event derived from MinimizationResult.status.
        const reachedTriage = triaged.minimization.status === 'MINIMIZED' || triaged.minimization.status === 'UNCHANGED';
        if (triaged.minimization.status === 'MINIMIZED') {
          this.transitionClusterLifecycle(cluster.clusterId, 'APPLY_MINIMIZATION');
          // Phase 15P A05 r2: canonical path forms the triage cluster explicitly
          // before triage completes; the direct MINIMIZED -> COMPLETE_TRIAGE edge
          // stays legal for in-flight/persisted records.
          this.transitionClusterLifecycle(cluster.clusterId, 'CLUSTERED', 'TRIAGE_CLUSTER_FORMED');
          this.transitionClusterLifecycle(cluster.clusterId, 'COMPLETE_TRIAGE');
        } else if (triaged.minimization.status === 'UNCHANGED') {
          this.transitionClusterLifecycle(cluster.clusterId, 'KEEP_UNCHANGED');
          this.transitionClusterLifecycle(cluster.clusterId, 'COMPLETE_TRIAGE');
        } else {
          // NO_REPRODUCTION / INVALID_ORIGINAL / BOUNDED_BUDGET_EXHAUSTED:
          // reproduction evidence did not hold through triage; the record ends
          // UNRESOLVED truthfully even though the historical v1 ledger entry
          // below is still written for protocol compatibility.
          this.transitionClusterLifecycle(cluster.clusterId, 'FAIL_REPRODUCTION',
            triaged.minimization.status === 'NO_REPRODUCTION' ? 'NOT_REPRODUCED'
              : triaged.minimization.status === 'INVALID_ORIGINAL' ? 'INVALID'
                : 'MINIMIZATION_BUDGET_EXHAUSTED');
        }
        if (semanticEvidence === null) {
          // T4d: protocol-only clusters keep the historical v1 path — v1
          // dossier bytes, v1-implied ledger entry (no dossierVersion).
          validateBugDossier(triaged.dossier);
          this.dossiers.push(triaged.dossier);
          if (triaged.artifactPath !== null) {
            if (!this.artifactPaths.includes(triaged.artifactPath)) this.artifactPaths.push(triaged.artifactPath);
            this.chargeArtifact(triaged.artifactPath);
          }
          if (reachedTriage) this.transitionClusterLifecycle(cluster.clusterId, 'MARK_DOSSIER_READY', 'DOSSIER_READY');
          this.state = {
            ...this.state,
            dossierLedger: [...this.state.dossierLedger, {
              clusterId: cluster.clusterId,
              candidateId: triaged.dossier.candidateId,
              state: 'READY',
              artifactPath: triaged.artifactPath,
              evidenceLevel: triaged.dossier.evidenceLevel,
              triagePriority: triaged.dossier.triagePriority,
            }],
            bugCandidates: [...this.state.bugCandidates, triaged.dossier.candidateId],
          };
          this.recordPromotionResult({
            clusterId: cluster.clusterId,
            clusterKind: 'PROTOCOL',
            candidateId: triaged.dossier.candidateId,
            replayStatus: freshExactReplayStatus(triaged.minimization.freshExactReplay),
            replayPhase: 'FRESH_EXACT_REPLAY',
            minimizationClass: triaged.minimization.reductionEvidenceClass,
            confidence: triaged.dossier.confidence.level,
            readiness: 'READY',
            sourceCurrentness: currentnessFromSourceFreshness(reproCandidate.observation.sourceFreshness),
          });
          this.checkpoint();
        } else {
          // T4a-c: semantic authority is load-bearing at promotion. Bundle
          // coherence, real runtime replay/minimization facts, and the
          // deterministic semantic predicates decide READY vs UNRESOLVED.
          const semanticDossier = this.buildSemanticDossierV2({ cluster, candidate: reproCandidate, evidence: semanticEvidence, triaged });
          const ready = semanticDossier.dossier.status === 'READY';
          // A lifecycle record that already ended UNRESOLVED at the minimization
          // event has no further classification edge; only a TRIAGED record is
          // classified here.
          if (reachedTriage && ready) this.transitionClusterLifecycle(cluster.clusterId, 'MARK_DOSSIER_READY', 'DOSSIER_READY');
          else if (reachedTriage) this.transitionClusterLifecycle(cluster.clusterId, 'CLASSIFY_UNRESOLVED', 'DOSSIER_UNRESOLVED');
          // Envelope convention (mirrors manifest/checkpoint artifacts): the
          // store spreads a wrapper `status` over the top level, so the dossier
          // itself is nested under `dossier` to keep its truthful READY vs
          // UNRESOLVED verdict intact in the persisted bytes.
          const artifactPath = this.checkpointStore.store.writeJson(`${semanticDossier.dossier.candidateId.replaceAll(':', '-')}.json`, { dossier: semanticDossier.dossier });
          if (!this.artifactPaths.includes(artifactPath)) this.artifactPaths.push(artifactPath);
          this.chargeArtifact(artifactPath);
          this.state = {
            ...this.state,
            dossierLedger: [...this.state.dossierLedger, {
              clusterId: cluster.clusterId,
              candidateId: semanticDossier.dossier.candidateId,
              state: ready ? 'READY' : 'INCOMPLETE',
              artifactPath,
              evidenceLevel: triaged.dossier.evidenceLevel,
              triagePriority: semanticDossier.dossier.triagePriority,
              dossierVersion: DOSSIER_VERSION_V2,
            }],
            bugCandidates: ready ? [...this.state.bugCandidates, semanticDossier.dossier.candidateId] : this.state.bugCandidates,
          };
          this.recordPromotionResult({
            clusterId: cluster.clusterId,
            clusterKind: 'SEMANTIC',
            candidateId: semanticDossier.dossier.candidateId,
            replayStatus: freshExactReplayStatus(triaged.minimization.freshExactReplay),
            replayPhase: 'FRESH_EXACT_REPLAY',
            minimizationClass: triaged.minimization.reductionEvidenceClass,
            confidence: semanticDossier.dossier.semanticConfidence?.level ?? 'UNRESOLVED',
            confidenceBlockers: semanticDossier.dossier.semanticConfidence?.blockers ?? [],
            readiness: ready ? 'READY' : 'UNRESOLVED',
            readinessReasonCodes: semanticDossier.readinessReasonCodes,
            sourceCurrentness: currentnessFromCampaignSemantic(semanticEvidence.sourceCurrentness),
          });
          this.checkpoint();
        }
      } catch (error) {
        const code = safeErrorCode(error);
        if (error instanceof CampaignProcessInterruptionError) {
          this.state = {
            ...this.state,
            reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'REPLAY_REQUIRED', reasonCode: code } : item),
            campaignStatus: 'INCOMPLETE_PROCESS_INTERRUPTION',
            stopReason: 'PROCESS_INTERRUPTION',
            nextExactAction: `resume reproduction ${cluster.clusterId}`,
            unresolved: [...new Set([...this.state.unresolved, 'PROCESS_INTERRUPTION'])],
          };
          this.interruptionRequested = true;
          this.checkpoint();
          break;
        }
        // T1: a failure before minimization classifies the candidate
        // UNRESOLVED; later failures keep the truthful mid-pipeline state.
        this.failReproductionIfLegal(cluster.clusterId, 'REPRODUCTION_FAILED');
        // Phase 15P (A05): the queue loop always ends in a stop below, so any
        // record failReproductionIfLegal could not touch (MINIMIZED /
        // CLUSTERED / UNCHANGED / TRIAGED) is closed at a terminal state
        // carrying the safe error code — never left ambiguous. Resumable
        // interruptions returned above and keep their truthful mid-pipeline state.
        this.closeOnGateFailure(cluster.clusterId, code);
        this.state = { ...this.state, reproductionQueue: this.state.reproductionQueue.map((item) => item.clusterId === cluster.clusterId ? { ...item, state: 'BLOCKED', reasonCode: code } : item), minimizationQueue: this.state.minimizationQueue.filter((id) => id !== cluster.clusterId), unresolved: [...new Set([...this.state.unresolved, code])] };
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

  // ---------------------------------------------------------------------------
  // Phase 15 Session 2 (T3) — V2-certified replay for promoted candidates.
  //
  // The plan is built from the candidate's original sequence as occurrence
  // identity plus the requested retained subsequence mapped onto occurrence
  // ordinals. validateReplayPlanV2 runs inside executeReplayPlanV2; any
  // construction or validation failure returns fail-closed INVALID — a replay
  // is never certified without a validated plan. The injected executor
  // delegates to the candidate's existing replay closure, so scripted
  // synthetic closures keep working. JOURNEY reduced candidates classify
  // exactly PRECONDITION_DIVERGENCE (binding-enforced, executor never called).
  // Budget accounting is unchanged: counts derive from the minimization result.
  // ---------------------------------------------------------------------------

  private certifiedReplayClosure(input: {
    readonly candidate: CampaignAnomalyCandidate;
    readonly anomalyFingerprint: string;
    readonly catalogVersion: string;
    readonly replay: NonNullable<CampaignAnomalyCandidate['replay']>;
  }): (sequence: readonly MinimizationAction[], phase: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE') => Promise<CandidateReplayOutcome> {
    const candidateKind = input.candidate.journeyId !== null ? 'JOURNEY' as const : input.candidate.api !== null ? 'API' as const : 'EXPLORATION' as const;
    const targetId = candidateKind === 'JOURNEY'
      ? input.candidate.journeyId!
      : candidateKind === 'API'
        ? input.candidate.api!.operationFamily
        : input.candidate.observation.features.operationFamily ?? 'campaign-exploration';
    return async (sequence, phase) => {
      try {
        const originalOccurrences = input.candidate.originalSequence.map((action, ordinal) => ({ ordinal, expectedActionId: action.actionId }));
        const retainedOccurrenceOrdinals: number[] = [];
        const used = new Set<number>();
        for (const action of sequence) {
          // The minimizer retains the original action object, so reference
          // identity is the strongest local occurrence proof. If a caller
          // reconstructs an action object, a repeated ID is deliberately
          // ambiguous rather than greedily assigned to an occurrence.
          const byReference = input.candidate.originalSequence
            .map((original, ordinal) => ({ original, ordinal }))
            .filter((item) => item.original === action && !used.has(item.ordinal));
          const byId = originalOccurrences.filter((occurrence) => occurrence.expectedActionId === action.actionId && !used.has(occurrence.ordinal));
          const matches = byReference.length > 0 ? byReference.map((item) => item.ordinal) : byId.map((item) => item.ordinal);
          if (matches.length !== 1) {
            return { status: 'INVALID', safety: toTriageSafety(ZERO_CAMPAIGN_SAFETY), invalidReason: 'PRECONDITION_DIVERGENCE' };
          }
          retainedOccurrenceOrdinals.push(matches[0]!);
          used.add(matches[0]!);
        }
        if (retainedOccurrenceOrdinals.length === 0 || retainedOccurrenceOrdinals.some((ordinal, index) => index > 0 && ordinal <= retainedOccurrenceOrdinals[index - 1]!)) {
          // Requested sequence is not an order-preserving subsequence of the
          // admitted original occurrence identity: fail closed.
          return { status: 'INVALID', safety: toTriageSafety(ZERO_CAMPAIGN_SAFETY), invalidReason: 'ACTION_NOT_IN_ORIGINAL' };
        }
        const plan = createTriageReplayPlanV2({
          candidateKind,
          anomalyFingerprint: input.anomalyFingerprint,
          originalOccurrences,
          retainedOccurrenceOrdinals,
          phase,
          targetId,
          contractVersion: input.candidate.contractVersion,
          contractDigest: input.candidate.contractDigest,
          catalogVersion: input.catalogVersion,
          sourceVersion: input.candidate.sourceCorrelation.sourceVersion ?? 'campaign-source',
          routeClass: input.candidate.browser.routeClass,
        });
        return await executeReplayPlanV2(plan, (_validatedPlan, retainedActions) => input.replay(retainedActions, phase));
      } catch {
        // Plan construction impossible (e.g. malformed fingerprint/identity):
        // never certify without a validated plan.
        return { status: 'INVALID', safety: toTriageSafety(ZERO_CAMPAIGN_SAFETY), invalidReason: 'PRECONDITION_DIVERGENCE' };
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Phase 15 Session 2 (T4) — semantic authority is load-bearing at promotion.
  // ---------------------------------------------------------------------------

  /**
   * Bundle coherence gate: the evidence's target/digest/sha identity must be
   * supported by the frozen bundle registered for this process. Incoherent
   * evidence is classified SOURCE_CURRENTNESS_UNRESOLVED: never HIGH, never
   * READY (closes the S06/S07 shadow gap "promotion must check bundle").
   */
  private bundleCoherenceFor(evidence: CampaignSemanticEvidence): boolean {
    const bundle = campaignSemanticBundleById(evidence.bundleId);
    if (bundle === undefined) return false;
    const mapping = approvedMappingForBundle(bundle.approvedMapping.journeyOrOperationId);
    return bundleSupportsTarget(bundle, evidence.targetId)
      && bundle.expectationId === evidence.expectationId
      && bundle.sourceEvidenceDigest === evidence.sourceEvidenceDigest
      && bundle.freshnessApprovedSourceSha === evidence.sourceSha
      && mapping !== null && mapping.targetId === evidence.targetId;
  }

  private currentnessForCluster(representative: CampaignAnomalyCandidate): PromotionSourceCurrentness {
    if (hasValidSemanticEvidence(representative)) {
      return currentnessFromCampaignSemantic(representative.campaignSemanticEvidence!.sourceCurrentness);
    }
    return currentnessFromSourceFreshness(representative.observation.sourceFreshness);
  }

  /**
   * Build the semantic v2 dossier from real runtime facts: certified replay
   * outcome (via the minimization result), minimality evidence, and the
   * campaign semantic evidence's source/receipt identity. Bundle-incoherent
   * evidence is downgraded to UNRESOLVED / non-HIGH after construction and
   * re-validated strictly.
   */
  private buildSemanticDossierV2(input: {
    readonly cluster: AnomalyCluster;
    readonly candidate: CampaignAnomalyCandidate;
    readonly evidence: CampaignSemanticEvidence;
    readonly triaged: Awaited<ReturnType<typeof triageAnomaly>>;
  }): { readonly dossier: BugDossierV2; readonly readinessReasonCodes: readonly string[] } {
    const evidence = input.evidence;
    const bundleCoherent = this.bundleCoherenceFor(evidence);
    const exactReplayStatus = input.triaged.minimization.freshExactReplay;
    const freshEvaluation = input.triaged.minimization.candidateEvaluations[0];
    const minimalSequence = input.triaged.minimization.minimalReproducingSequence;
    const minimalOrdinals = input.triaged.minimization.minimalReproducingOccurrenceOrdinals;
    const minimalSequenceReproductions = input.triaged.minimization.candidateEvaluations
      .slice(1)
      .filter((evaluation) => evaluation.disposition === 'REPRODUCES'
        && evaluation.sequence.length === minimalSequence.length
        && evaluation.sequence.every((actionId, index) => actionId === minimalSequence[index])
        && (minimalOrdinals === undefined
          || (evaluation.occurrenceOrdinals !== undefined
            && evaluation.occurrenceOrdinals.length === minimalOrdinals.length
            && evaluation.occurrenceOrdinals.every((ordinal, index) => ordinal === minimalOrdinals[index])))).length;
    const exactFingerprintMatch = exactReplayStatus === 'REPRODUCED'
      && input.triaged.minimization.anomalyFingerprint === evidence.findingFingerprint
      && freshEvaluation?.disposition === 'REPRODUCES'
      && freshEvaluation.fingerprintMatch;
    // A BOUNDED_MINIMAL result with no reduced executor reproduction is not a
    // verified semantic minimization. Preserve the underlying minimizer fact
    // in the dossier reproduction block, but never copy its weaker historical
    // label into semantic confidence evidence.
    const semanticMinimalityGuarantee = minimalSequenceReproductions > 0
      ? input.triaged.minimization.minimalityGuarantee
      : 'NONE';
    const replayFidelity = semanticReplayFidelityFor({
      candidate: input.candidate,
      evidence,
      minimization: input.triaged.minimization,
      safety: input.triaged.dossier.safety,
      privacy: input.triaged.dossier.privacy,
    });
    const missingEvidenceCodes = new Set<string>();
    if (!bundleCoherent || evidence.sourceCurrentness === 'STALE' || evidence.sourceCurrentness === 'UNAVAILABLE' || evidence.sourceCurrentness === 'UNKNOWN') missingEvidenceCodes.add('SOURCE_CURRENTNESS_UNRESOLVED');
    if (evidence.receiptOutcome === 'PARTIAL_COVERAGE') missingEvidenceCodes.add('PARTIAL_COLLECTION_COVERAGE');
    if (exactReplayStatus !== 'REPRODUCED') missingEvidenceCodes.add('EXACT_REPLAY_REQUIRED');
    if (!exactFingerprintMatch) missingEvidenceCodes.add('REPLAY_FINGERPRINT_MISMATCH');
    if (replayFidelity.outcomeClass !== 'REPRODUCED_EXACT' || replayFidelity.occurrenceBinding !== 'BOUND') missingEvidenceCodes.add('EXACT_REPLAY_REQUIRED');
    const semanticTriageEvidence: SemanticTriageEvidence = createSemanticTriageEvidence({
      expectationId: evidence.expectationId,
      targetId: evidence.targetId,
      semanticFindingFingerprint: evidence.findingFingerprint,
      invariantDefinitionId: evidence.invariantDefinitionId,
      // Shared safe vocabulary: the receipt outcome is the observed semantic
      // outcome at promotion time, mapped onto the triage-side vocabulary.
      semanticOutcome: semanticOutcomeFromReceipt(evidence.receiptOutcome),
      receiptOutcome: evidence.receiptOutcome,
      ...(evidence.coverageState === undefined ? {} : { coverageState: evidence.coverageState }),
      receiptVersion: evidence.receiptVersion,
      sourceRepoId: evidence.sourceRepoId,
      sourceSha: evidence.sourceSha,
      sourceEvidenceDigest: evidence.sourceEvidenceDigest,
      sourceDerivationVersion: evidence.sourceDerivationVersion,
      sourceCurrentness: evidence.sourceCurrentness,
      findingCategory: evidence.findingCategory,
      exactReplayStatus,
      exactFingerprintMatch,
      minimalityGuarantee: semanticMinimalityGuarantee,
      freshContextReproductions: freshEvaluation?.disposition === 'REPRODUCES' ? 1 : 0,
      minimalSequenceReproductions,
      replayFidelity,
      missingEvidence: [...missingEvidenceCodes].sort() as SemanticTriageEvidence['missingEvidence'],
    });
    const v2Input: BugDossierV2Input = {
      firstObserved: input.candidate.observation.observedAt,
      lastObserved: input.candidate.observation.observedAt,
      journeyIds: input.candidate.journeyId === null ? [] : [input.candidate.journeyId],
      seeds: input.candidate.observation.features.envelopeId === null ? [] : [input.candidate.observation.features.envelopeId],
      routeClass: input.candidate.browser.routeClass,
      apiOperationFamily: input.candidate.api?.operationFamily ?? null,
      oracleFingerprint: input.cluster.fingerprint,
      evidenceLevel: input.triaged.dossier.evidenceLevel as Exclude<EvidenceLevel, 'L4'>,
      minimization: input.triaged.minimization,
      browserApiDifferential: input.triaged.browserApiDifferential,
      sourceCorrelation: input.triaged.sourceCorrelation,
      likelyFaultBoundary: input.triaged.faultBoundary,
      confidence: input.triaged.dossier.confidence,
      technicalSeverity: input.candidate.technicalSeverity,
      triagePriority: input.triaged.dossier.triagePriority,
      knownNightwatchDefect: input.candidate.knownNightwatchDefect ? 'NIGHTWATCH_FALSE_POSITIVE_CATALOG_MATCH' : null,
      alternativesRuledOut: input.candidate.alternativesRuledOut,
      missingEvidence: input.candidate.missingEvidence,
      semanticEvidence: toSemanticDossierEvidence(input.candidate.semanticFindings ?? []),
      semanticTriageEvidence,
    };
    const readiness = isReadySemanticDossier(v2Input);
    let dossier = createBugDossierV2(v2Input);
    let readinessReasonCodes: readonly string[] = readiness.ready ? [] : [readiness.reason ?? 'SOURCE_CURRENTNESS_UNRESOLVED'];
    if (!bundleCoherent) {
      // Incoherent bundle: demote to SOURCE_CURRENTNESS_UNRESOLVED-classified
      // regardless of what the evidence alone claimed, then re-validate.
      readinessReasonCodes = [...new Set([...readinessReasonCodes, 'SOURCE_CURRENTNESS_UNRESOLVED', 'BUNDLE_COHERENCE_FAILURE'])].sort();
      const baseLevel = dossier.semanticConfidence?.level ?? 'UNRESOLVED';
      dossier = parseBugDossierV2({
        ...dossier,
        status: 'UNRESOLVED',
        semanticConfidence: {
          level: baseLevel === 'HIGH' ? 'MEDIUM' : baseLevel,
          reasons: dossier.semanticConfidence?.reasons ?? [],
          blockers: [...new Set([...(dossier.semanticConfidence?.blockers ?? []), 'BUNDLE_COHERENCE_FAILURE'])].sort(),
        },
      });
    }
    return { dossier, readinessReasonCodes };
  }

  // ---------------------------------------------------------------------------
  // Phase 15 Session 2 (T5) — converged promotion result per promoted cluster.
  // ---------------------------------------------------------------------------

  private recordPromotionResult(input: {
    readonly clusterId: string;
    readonly clusterKind: 'PROTOCOL' | 'SEMANTIC';
    readonly candidateId: string | null;
    readonly replayStatus?: 'FAILURE' | 'PASS' | 'INVALID';
    readonly replayPhase?: 'FRESH_EXACT_REPLAY' | 'REDUCED_CANDIDATE';
    readonly minimizationClass: PromotionMinimizationClass;
    readonly confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
    readonly confidenceBlockers?: readonly string[];
    readonly readiness: 'READY' | 'UNRESOLVED' | 'NOT_ELIGIBLE';
    readonly readinessReasonCodes?: readonly string[];
    readonly sourceCurrentness: PromotionSourceCurrentness;
  }): void {
    const result = buildSemanticAwarePromotionResult({
      clusterId: input.clusterId,
      clusterKind: input.clusterKind,
      candidateId: input.candidateId,
      ...(input.replayStatus !== undefined && input.replayPhase !== undefined ? { replayStatus: input.replayStatus, replayPhase: input.replayPhase } : {}),
      minimization: input.minimizationClass,
      confidence: input.confidence,
      confidenceBlockers: input.confidenceBlockers,
      readiness: input.readiness,
      readinessReasonCodes: input.readinessReasonCodes,
      sourceCurrentness: input.sourceCurrentness,
      dossierVersionTarget: dossierTargetForClusterKind(input.clusterKind),
    });
    // Authority invariant, fail closed: an ineligible result can never
    // accompany a READY dossier or HIGH confidence. It binds the semantic
    // path where currentness/readiness are derived; protocol clusters keep
    // their historical unconditional-v1-READY semantics.
    if (input.clusterKind === 'SEMANTIC' && !semanticPromotionEligible(result) && (input.readiness === 'READY' || input.confidence === 'HIGH')) {
      throw new Error('PROMOTION_AUTHORITY_COHERENCE_FAILURE');
    }
    this.promotionResultLedger.push(result);
  }

  /** Session-2 (T5): converged promotion verdicts in promotion order. */
  get promotionResults(): readonly SemanticAwarePromotionResult[] {
    return [...this.promotionResultLedger];
  }

  /** READY findings across both dossier generations (v1 list + v2 ledger). */
  private hasAdmittedFindings(): boolean {
    return this.dossiers.length > 0 || this.state.dossierLedger.some((entry) => entry.state === 'READY');
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
        // Phase 15P A09: explicit attempt reservation before the durable
        // RUNNING marker; exhaustion refuses fail-closed before any
        // reproduction adapter callback.
        const reservation = this.reserveAttempt(item.workItemId, (existing?.attemptCount ?? 0) + 1);
        if (!reservation.granted) {
          this.updateRecord(item.workItemId, { state: 'BLOCKED', reasonCode: reservation.code });
          this.state = { ...this.state, unresolved: [...new Set([...this.state.unresolved, reservation.code])] };
          return await this.finalize('PARTIAL_RUNTIME_INFRA_FAILURE', 'PREFLIGHT_FAILED');
        }
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
          // Phase 15P (A05): the safety gate closes the target's lifecycle at
          // a terminal state carrying the gate identity.
          this.closeOnGateFailure(cluster.clusterId, 'SAFETY_EVENT_DURING_REPRODUCTION');
          this.state = { ...this.state, safetyEvents: [...this.state.safetyEvents, 'SAFETY_EVENT_DURING_REPRODUCTION'] };
          this.markPendingSkipped('SAFETY_EVENT_DURING_REPRODUCTION');
          return await this.finalize('PARTIAL_SAFETY_BLOCKED', 'SAFETY_EVENT');
        }
        if (!privacyIsClean(reproduction.privacy)) {
          // Phase 15P (A05): privacy gate enforced on the reproduction-only
          // path too — explicit blocked terminal, never a silent bypass.
          this.closeOnGateFailure(cluster.clusterId, 'PRIVACY_BLOCKED');
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
        this.state = { ...this.state, nextExactAction: `replay ${item.workItemId}`, unresolved: [...new Set([...this.state.unresolved, code])] };
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
    return await this.finalize(this.hasAdmittedFindings() ? 'COMPLETE_WITH_FINDINGS' : 'COMPLETE_CLEAN', 'NONE');
  }

  async run(options: CampaignRunOptions = {}): Promise<CampaignRunResult> {
    this.persistManifest();
    if (this.state.campaignStatus !== 'IN_PROGRESS' && this.state.campaignStatus !== 'INCOMPLETE_PROCESS_INTERRUPTION') {
      return await this.finalize(this.state.campaignStatus, this.state.stopReason);
    }
    try {
      this.assertCurrentVersions();
    } catch {
      this.lastResumeRefusal = this.versionDriftRefusal();
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
      this.state = { ...this.state, unresolved: [...new Set([...this.state.unresolved, ...globalPreflight.failedChecks])] };
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
          unresolved: [...new Set([...this.state.unresolved, 'PROCESS_INTERRUPTION_SIMULATED'])],
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
    return await this.finalize(this.hasAdmittedFindings() ? 'COMPLETE_WITH_FINDINGS' : 'COMPLETE_CLEAN', 'NONE');
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
