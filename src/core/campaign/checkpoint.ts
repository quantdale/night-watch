// ---------------------------------------------------------------------------
// Phase 7 atomic owner-only manifest/checkpoint storage.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import { assertManifestCompatible, assertPersistedCandidateShape, stableCampaignJson, validateCampaignManifest } from './identity';
import { validateBudgetPolicy } from './budget';
import {
  arraysExactlyEqual,
  assertBoolean,
  assertEnum,
  assertExactKeys,
  assertFiniteNonNegative,
  assertIsoTimestamp,
  assertNonNegativeInteger,
  assertString,
  assertUniqueStrings,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
  type RuntimeRecord,
} from './runtimeValidation';
import {
  CAMPAIGN_CHECKPOINT_VERSION,
  CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION,
  CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED,
  type CampaignCheckpoint,
  type CampaignExecutionRecord,
  type CampaignManifest,
  type CampaignPrivacyStatus,
  type CampaignSafetyVector,
  type CampaignVersionFingerprint,
  type CampaignWorkKind,
  type CandidateLifecycleRecordShape,
} from './types';

const CHECKPOINT_KEYS = [
  'schemaVersion', 'campaignId', 'manifestFingerprint', 'campaignStatus',
  'stopReason', 'checkpointOrdinal', 'sourceSnapshots', 'selection',
  'selectedJourneys', 'selectedEnvelopes', 'selectedApiScenarios', 'seedLedger',
  'budgetPolicy', 'budgetUsed', 'budgetRemaining', 'executionLedger',
  'anomalyObservations', 'anomalyCandidates', 'anomalyClusters',
  'reproductionQueue', 'minimizationQueue', 'dossierLedger',
  'morningBriefStatus', 'bugCandidates', 'rejectedHypotheses', 'unresolved',
  'safetyEvents', 'safety', 'privacy', 'privacyStatus', 'versionDrift',
  'completedWorkItemIds', 'remainingWorkItemIds', 'nextExactAction',
  'resumeRecipe', 'executionGuarantees', 'runtimeElapsedMs', 'createdAt',
  'updatedAt',
] as const;
// Phase 15 Session 2 additions: optional so historical pre-S2 checkpoints
// remain valid; when present they are strictly validated below.
const CHECKPOINT_OPTIONAL_KEYS = ['candidateLifecycles', 'runtimeContractVersions'] as const;
const WORK_KINDS: readonly CampaignWorkKind[] = ['JOURNEY', 'API', 'EXPLORATION', 'REPRODUCTION', 'MINIMIZATION'];
const CAMPAIGN_STATUSES = ['IN_PROGRESS', 'COMPLETE_CLEAN', 'COMPLETE_WITH_FINDINGS', 'PARTIAL_BUDGET_EXHAUSTED', 'PARTIAL_AUTH_BLOCKED', 'PARTIAL_SAFETY_BLOCKED', 'PARTIAL_RUNTIME_INFRA_FAILURE', 'ABORTED_OWNER_POLICY', 'INCOMPLETE_PROCESS_INTERRUPTION'] as const;
const STOP_REASONS = ['NONE', 'OWNER_POLICY_BLOCKED', 'AUTH_BLOCKED', 'SAFETY_EVENT', 'PRIVACY_BLOCKED', 'BUDGET_EXHAUSTED', 'RUNTIME_TIMEOUT', 'FAILURE_STORM_SHARED_ROOT_SYMPTOM', 'CAMPAIGN_VERSION_DRIFT', 'PROCESS_INTERRUPTION', 'PREFLIGHT_FAILED'] as const;
const WORK_STATES = ['PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'REPLAY_REQUIRED', 'BLOCKED'] as const;
const EXECUTION_RESULTS = ['PASS', 'ANOMALY', 'TRANSIENT', 'NIGHTWATCH_DEFECT', 'AUTH_BLOCKED', 'SAFETY_BLOCKED', 'RUNTIME_FAILURE', 'INCOMPLETE'] as const;
const CANDIDATE_LIFECYCLE_VARIANTS = ['PROTOCOL_ONLY', 'SEMANTIC'] as const;
const CANDIDATE_LIFECYCLE_STATES = ['OBSERVED', 'ADMITTED', 'REPRODUCED', 'MINIMIZED', 'UNCHANGED', 'TRIAGED', 'DOSSIER_READY', 'REJECTED', 'UNRESOLVED'] as const;
// Matches the established uppercase snake reason-code idiom (e.g. BUDGET_EXHAUSTED).
const LIFECYCLE_REASON_CODE_RE = /^[A-Z][A-Z0-9_]*$/;

function checkpointIntegrity(reason: string): never {
  throw new Error(`CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:${reason}`);
}

function validateSafety(value: unknown, code: string): asserts value is CampaignSafetyVector {
  const safety = requireRuntimeRecord(value, code);
  assertExactKeys(safety, ['productionAttempts', 'proxyViolations', 'unknownDestinations', 'unknownApprovals', 'productMutations', 'actionCausedUnknown', 'databaseQueries', 'infrastructureQueries', 'externalPublicationAttempts'], code);
  for (const key of Object.keys(safety)) assertNonNegativeInteger(safety[key], `${code}:${key}`);
}

function validatePrivacy(value: unknown, code: string): asserts value is CampaignPrivacyStatus {
  const privacy = requireRuntimeRecord(value, code);
  assertExactKeys(privacy, ['result', 'rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'cookiesPersisted', 'tokensPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'], code);
  assertEnum(privacy.result, ['PASS', 'BLOCKED'], `${code}:RESULT`);
  for (const key of Object.keys(privacy).filter((key) => key !== 'result')) assertNonNegativeInteger(privacy[key], `${code}:${key}`);
  if (privacy.result === 'PASS' && Object.entries(privacy).some(([key, value]) => key !== 'result' && value !== 0)) checkpointIntegrity(`${code}:PASS_WITH_PERSISTED_PRIVACY_COUNTER`);
}

function validateBudgetUsage(value: unknown, policy: CampaignManifest['budgetPolicy'], code: string): void {
  const usage = requireRuntimeRecord(value, code);
  const keys = ['browserContexts', 'journeyContexts', 'explorationContexts', 'apiExecutions', 'replays', 'minimizationCandidates', 'totalActions', 'privateEvidenceBytes'] as const;
  assertExactKeys(usage, keys, code);
  const limits: Record<(typeof keys)[number], number> = {
    browserContexts: policy.maxTotalBrowserContexts,
    journeyContexts: policy.maxJourneyContexts,
    explorationContexts: policy.maxExplorationContexts,
    apiExecutions: policy.maxApiExecutions,
    replays: policy.maxReplays,
    minimizationCandidates: policy.maxMinimizationCandidates,
    totalActions: policy.maxTotalActions,
    privateEvidenceBytes: policy.maxPrivateEvidenceBytes,
  };
  for (const key of keys) {
    assertNonNegativeInteger(usage[key], `${code}:${key}`);
    if ((usage[key] as number) > limits[key]) checkpointIntegrity(`${code}:EXCEEDS_POLICY:${key}`);
  }
}

function validateExecutionRecord(value: unknown, manifest: CampaignManifest, knownIds: Set<string>): CampaignExecutionRecord {
  const record = requireRuntimeRecord(value, 'CHECKPOINT_EXECUTION_RECORD');
  assertExactKeys(record, ['workItemId', 'kind', 'state', 'attemptCount', 'executionGuarantee', 'result', 'reasonCode', 'actionsExecuted', 'apiExecutions', 'browserContextCreated', 'replay', 'anomalyFingerprints', 'safety', 'privacy'], 'CHECKPOINT_EXECUTION_RECORD');
  assertString(record.workItemId, 'CHECKPOINT_EXECUTION_ID');
  if (!knownIds.has(record.workItemId)) checkpointIntegrity(`UNKNOWN_WORK_ITEM:${record.workItemId}`);
  const manifestItem = manifest.workItems.find((item) => item.workItemId === record.workItemId);
  if (manifestItem === undefined || record.kind !== manifestItem.kind) checkpointIntegrity(`WORK_KIND_MISMATCH:${record.workItemId}`);
  assertEnum(record.kind, WORK_KINDS, 'CHECKPOINT_EXECUTION_KIND');
  assertEnum(record.state, WORK_STATES, 'CHECKPOINT_EXECUTION_STATE');
  assertNonNegativeInteger(record.attemptCount, 'CHECKPOINT_ATTEMPT_COUNT');
  assertEnum(record.executionGuarantee, ['EXACTLY_ONCE_LOGICAL', 'AT_LEAST_ONCE_SAFE', 'REPLAY_REQUIRED'], 'CHECKPOINT_EXECUTION_GUARANTEE');
  if (record.result !== null) assertEnum(record.result, EXECUTION_RESULTS, 'CHECKPOINT_EXECUTION_RESULT');
  if (record.reasonCode !== null) assertString(record.reasonCode, 'CHECKPOINT_EXECUTION_REASON');
  for (const key of ['actionsExecuted', 'apiExecutions']) assertNonNegativeInteger(record[key], `CHECKPOINT_EXECUTION:${key}`);
  assertBoolean(record.browserContextCreated, 'CHECKPOINT_EXECUTION_BROWSER');
  assertBoolean(record.replay, 'CHECKPOINT_EXECUTION_REPLAY');
  const fingerprints = requireRuntimeArray(record.anomalyFingerprints, 'CHECKPOINT_EXECUTION_FINGERPRINTS');
  assertUniqueStrings(fingerprints, 'CHECKPOINT_EXECUTION_FINGERPRINTS');
  for (const fingerprint of fingerprints) assertString(fingerprint, 'CHECKPOINT_EXECUTION_FINGERPRINT');
  validateSafety(record.safety, 'CHECKPOINT_EXECUTION_SAFETY');
  validatePrivacy(record.privacy, 'CHECKPOINT_EXECUTION_PRIVACY');
  if (record.state === 'PENDING' && (record.attemptCount !== 0 || record.result !== null || record.reasonCode !== null)) checkpointIntegrity(`PENDING_RECORD_HAS_EXECUTION:${record.workItemId}`);
  if (record.state === 'RUNNING' && (record.attemptCount < 1 || record.result !== null)) checkpointIntegrity(`RUNNING_RECORD_INVALID:${record.workItemId}`);
  if (record.state === 'REPLAY_REQUIRED' && (record.attemptCount < 1 || record.reasonCode === null || record.executionGuarantee !== 'REPLAY_REQUIRED')) checkpointIntegrity(`REPLAY_RECORD_INVALID:${record.workItemId}`);
  if ((record.state === 'SKIPPED' || record.state === 'BLOCKED') && record.reasonCode === null) checkpointIntegrity(`TERMINAL_BLOCK_RECORD_UNEXPLAINED:${record.workItemId}`);
  if (record.state === 'COMPLETED' && (record.attemptCount < 1 || record.result === null)) checkpointIntegrity(`COMPLETED_RECORD_INVALID:${record.workItemId}`);
  if ((record.result === 'AUTH_BLOCKED' || record.result === 'SAFETY_BLOCKED') && record.state !== 'BLOCKED') checkpointIntegrity(`BLOCKED_RESULT_STATE_MISMATCH:${record.workItemId}`);
  return record as unknown as CampaignExecutionRecord;
}

function validateReferenceLedgers(checkpoint: RuntimeRecord, manifest: CampaignManifest, executionLedger: readonly CampaignExecutionRecord[]): void {
  const knownWorkIds = new Set(manifest.workItems.map((item) => item.workItemId));
  const completed = requireRuntimeArray(checkpoint.completedWorkItemIds, 'CHECKPOINT_COMPLETED_IDS');
  const remaining = requireRuntimeArray(checkpoint.remainingWorkItemIds, 'CHECKPOINT_REMAINING_IDS');
  assertUniqueStrings(completed, 'CHECKPOINT_COMPLETED_IDS');
  assertUniqueStrings(remaining, 'CHECKPOINT_REMAINING_IDS');
  const completedIds = completed as readonly string[];
  const remainingIds = remaining as readonly string[];
  for (const id of [...completedIds, ...remainingIds]) if (!knownWorkIds.has(id)) checkpointIntegrity(`UNKNOWN_LEDGER_WORK_ID:${id}`);
  if (completedIds.some((id) => remainingIds.includes(id))) checkpointIntegrity('COMPLETED_REMAINING_OVERLAP');
  const expectedCompleted = executionLedger.filter((record) => record.state === 'COMPLETED').map((record) => record.workItemId).sort();
  const expectedRemaining = executionLedger.filter((record) => record.state === 'PENDING' || record.state === 'RUNNING' || record.state === 'REPLAY_REQUIRED').map((record) => record.workItemId);
  if (!arraysExactlyEqual(completedIds, expectedCompleted) || !arraysExactlyEqual(remainingIds, expectedRemaining)) checkpointIntegrity('LEDGER_SUMMARY_MISMATCH');
  const accounted = new Set([...completedIds, ...remainingIds, ...executionLedger.filter((record) => record.state === 'SKIPPED' || record.state === 'BLOCKED').map((record) => record.workItemId)]);
  if (accounted.size !== knownWorkIds.size || [...knownWorkIds].some((id) => !accounted.has(id))) checkpointIntegrity('LEDGER_DOES_NOT_COVER_MANIFEST');

  const clusters = requireRuntimeArray(checkpoint.anomalyClusters, 'CHECKPOINT_CLUSTERS');
  const clusterIds = new Set<string>();
  const observationIds = new Set<string>();
  for (const value of requireRuntimeArray(checkpoint.anomalyObservations, 'CHECKPOINT_OBSERVATIONS')) {
    const observation = requireRuntimeRecord(value, 'CHECKPOINT_OBSERVATION');
    assertString(observation.runId, 'CHECKPOINT_OBSERVATION_RUN_ID');
    assertString(observation.fingerprint, 'CHECKPOINT_OBSERVATION_FINGERPRINT');
    if (observationIds.has(observation.runId)) checkpointIntegrity(`DUPLICATE_OBSERVATION:${observation.runId}`);
    observationIds.add(observation.runId);
  }
  for (const value of requireRuntimeArray(checkpoint.anomalyCandidates, 'CHECKPOINT_CANDIDATES')) {
    const candidate = requireRuntimeRecord(value, 'CHECKPOINT_CANDIDATE');
    if ('replay' in candidate) checkpointIntegrity('PERSISTED_CANDIDATE_CONTAINS_EXECUTABLE');
    assertPersistedCandidateShape(candidate, 'CAMPAIGN_CHECKPOINT_CANDIDATE');
    const observation = requireRuntimeRecord(candidate.observation, 'CHECKPOINT_CANDIDATE_OBSERVATION');
    assertString(observation.runId, 'CHECKPOINT_CANDIDATE_RUN_ID');
    if (!observationIds.has(observation.runId)) checkpointIntegrity(`CANDIDATE_UNKNOWN_OBSERVATION:${observation.runId}`);
  }
  for (const value of clusters) {
    const cluster = requireRuntimeRecord(value, 'CHECKPOINT_CLUSTER');
    assertString(cluster.clusterId, 'CHECKPOINT_CLUSTER_ID');
    assertString(cluster.primaryRunId, 'CHECKPOINT_CLUSTER_PRIMARY_RUN');
    if (clusterIds.has(cluster.clusterId)) checkpointIntegrity(`DUPLICATE_CLUSTER:${cluster.clusterId}`);
    if (!observationIds.has(cluster.primaryRunId)) checkpointIntegrity(`UNKNOWN_CLUSTER_PRIMARY:${cluster.clusterId}`);
    clusterIds.add(cluster.clusterId);
    const runIds = requireRuntimeArray(cluster.runIds, 'CHECKPOINT_CLUSTER_RUNS');
    for (const runId of runIds) {
      assertString(runId, 'CHECKPOINT_CLUSTER_RUN_ID');
      if (!observationIds.has(runId)) checkpointIntegrity(`UNKNOWN_CLUSTER_RUN:${cluster.clusterId}`);
    }
  }
  const reproductionIds = new Set<string>();
  for (const value of requireRuntimeArray(checkpoint.reproductionQueue, 'CHECKPOINT_REPRODUCTION_QUEUE')) {
    const reproduction = requireRuntimeRecord(value, 'CHECKPOINT_REPRODUCTION');
    assertExactKeys(reproduction, ['clusterId', 'representativeRunId', 'state', 'result', 'admissionLevel', 'reasonCode', 'runId', 'safety', 'privacy'], 'CHECKPOINT_REPRODUCTION');
    assertString(reproduction.clusterId, 'CHECKPOINT_REPRODUCTION_CLUSTER');
    if (!clusterIds.has(reproduction.clusterId)) checkpointIntegrity(`UNKNOWN_REPRODUCTION_CLUSTER:${reproduction.clusterId}`);
    if (reproductionIds.has(reproduction.clusterId)) checkpointIntegrity(`DUPLICATE_REPRODUCTION:${reproduction.clusterId}`);
    reproductionIds.add(reproduction.clusterId);
    assertString(reproduction.representativeRunId, 'CHECKPOINT_REPRODUCTION_REPRESENTATIVE');
    if (!observationIds.has(reproduction.representativeRunId)) checkpointIntegrity(`UNKNOWN_REPRODUCTION_REPRESENTATIVE:${reproduction.clusterId}`);
    assertEnum(reproduction.state, ['PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'BLOCKED', 'REPLAY_REQUIRED'], 'CHECKPOINT_REPRODUCTION_STATE');
    if (reproduction.result !== null) assertEnum(reproduction.result, ['REPRODUCED', 'NOT_REPRODUCED', 'INVALID', 'SAFETY_BLOCKED', 'RUNTIME_FAILURE'], 'CHECKPOINT_REPRODUCTION_RESULT');
    assertEnum(reproduction.admissionLevel, ['L0', 'L1', 'L2', 'L3', 'L4'], 'CHECKPOINT_REPRODUCTION_ADMISSION');
    if (reproduction.reasonCode !== null) assertString(reproduction.reasonCode, 'CHECKPOINT_REPRODUCTION_REASON');
    if (reproduction.runId !== null) assertString(reproduction.runId, 'CHECKPOINT_REPRODUCTION_RUN');
    validateSafety(reproduction.safety, 'CHECKPOINT_REPRODUCTION_SAFETY');
    validatePrivacy(reproduction.privacy, 'CHECKPOINT_REPRODUCTION_PRIVACY');
    if (reproduction.state === 'PENDING' || reproduction.state === 'RUNNING' || reproduction.state === 'REPLAY_REQUIRED') {
      if (reproduction.result !== null) checkpointIntegrity(`PENDING_REPRODUCTION_HAS_RESULT:${reproduction.clusterId}`);
    }
  }
  const minimization = requireRuntimeArray(checkpoint.minimizationQueue, 'CHECKPOINT_MINIMIZATION_QUEUE');
  assertUniqueStrings(minimization, 'CHECKPOINT_MINIMIZATION_QUEUE');
  for (const clusterId of minimization as readonly string[]) if (!clusterIds.has(clusterId)) checkpointIntegrity(`UNKNOWN_MINIMIZATION_CLUSTER:${clusterId}`);
  const dossierClusters = new Set<string>();
  const bugCandidates = requireRuntimeArray(checkpoint.bugCandidates, 'CHECKPOINT_BUG_CANDIDATES');
  assertUniqueStrings(bugCandidates, 'CHECKPOINT_BUG_CANDIDATES');
  for (const value of requireRuntimeArray(checkpoint.dossierLedger, 'CHECKPOINT_DOSSIER_LEDGER')) {
    const dossier = requireRuntimeRecord(value, 'CHECKPOINT_DOSSIER');
    assertExactKeys(dossier, ['clusterId', 'candidateId', 'state', 'artifactPath', 'evidenceLevel', 'triagePriority'], 'CHECKPOINT_DOSSIER', ['dossierVersion']);
    assertString(dossier.clusterId, 'CHECKPOINT_DOSSIER_CLUSTER');
    if (!clusterIds.has(dossier.clusterId)) checkpointIntegrity(`UNKNOWN_DOSSIER_CLUSTER:${dossier.clusterId}`);
    if (dossierClusters.has(dossier.clusterId)) checkpointIntegrity(`DUPLICATE_DOSSIER_CLUSTER:${dossier.clusterId}`);
    dossierClusters.add(dossier.clusterId);
    assertString(dossier.candidateId, 'CHECKPOINT_DOSSIER_CANDIDATE');
    assertEnum(dossier.state, ['INCOMPLETE', 'READY', 'SKIPPED'], 'CHECKPOINT_DOSSIER_STATE');
    if (dossier.artifactPath !== null) assertString(dossier.artifactPath, 'CHECKPOINT_DOSSIER_PATH');
    assertEnum(dossier.evidenceLevel, ['L0', 'L1', 'L2', 'L3', 'L4'], 'CHECKPOINT_DOSSIER_EVIDENCE');
    assertString(dossier.triagePriority, 'CHECKPOINT_DOSSIER_PRIORITY');
    if (dossier.dossierVersion !== undefined) {
      assertString(dossier.dossierVersion, 'CHECKPOINT_DOSSIER_VERSION');
      if (dossier.dossierVersion !== 'nightwatch.bug-dossier.private.v1' && dossier.dossierVersion !== 'nightwatch.bug-dossier.private.v2') checkpointIntegrity('DOSSIER_VERSION_INVALID');
    }
    if (dossier.state === 'READY' && !bugCandidates.includes(dossier.candidateId)) checkpointIntegrity(`READY_DOSSIER_NOT_IN_BUG_CANDIDATES:${dossier.candidateId}`);
    if (dossier.state !== 'READY' && bugCandidates.includes(dossier.candidateId)) checkpointIntegrity(`UNRESOLVED_DOSSIER_IN_BUG_CANDIDATES:${dossier.candidateId}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 15 Session 2 runtime-contract fields (optional, strictly validated
// when present; absent means a historical pre-S2 checkpoint and is valid).
// ---------------------------------------------------------------------------

function validateCandidateLifecycleRecord(value: unknown, code: string): void {
  const record = requireRuntimeRecord(value, code);
  assertExactKeys(record, ['lifecycleVersion', 'variant', 'state', 'transitionCount', 'lastReasonCode'], code);
  if (record.lifecycleVersion !== CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle) {
    checkpointIntegrity('CAMPAIGN_CHECKPOINT_LIFECYCLE_VERSION_UNSUPPORTED');
  }
  assertEnum(record.variant, CANDIDATE_LIFECYCLE_VARIANTS, `${code}:VARIANT`);
  assertEnum(record.state, CANDIDATE_LIFECYCLE_STATES, `${code}:STATE`);
  assertNonNegativeInteger(record.transitionCount, `${code}:TRANSITION_COUNT`);
  if (record.lastReasonCode !== null) {
    assertString(record.lastReasonCode, `${code}:LAST_REASON_CODE`);
    if (!LIFECYCLE_REASON_CODE_RE.test(record.lastReasonCode)) checkpointIntegrity(`${code}:LAST_REASON_CODE_UNSAFE`);
  }
}

/**
 * There is no dedicated cluster-id regex anywhere in this module or
 * identity.ts: the established idiom is referential integrity against the
 * anomalyClusters ledger (UNKNOWN_REPRODUCTION_CLUSTER,
 * UNKNOWN_MINIMIZATION_CLUSTER, UNKNOWN_DOSSIER_CLUSTER). Lifecycle keys
 * follow the same idiom: non-empty string plus ledger membership.
 */
function validateSession2RuntimeContracts(checkpoint: RuntimeRecord): void {
  const versions = checkpoint.runtimeContractVersions;
  const lifecycles = checkpoint.candidateLifecycles;
  if (versions === undefined && lifecycles === undefined) return;
  if (versions !== undefined) {
    const contractVersions = requireRuntimeRecord(versions, 'CHECKPOINT_RUNTIME_CONTRACT_VERSIONS');
    assertExactKeys(contractVersions, ['candidateLifecycle', 'replayBinding', 'promotionResult'], 'CHECKPOINT_RUNTIME_CONTRACT_VERSIONS');
    for (const slot of ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const) {
      // Resume fail-closed gate: an incompatible future version never reaches
      // an executor callback.
      if (contractVersions[slot] !== CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot]) {
        checkpointIntegrity('CAMPAIGN_CHECKPOINT_RUNTIME_CONTRACT_VERSION_UNSUPPORTED');
      }
    }
  }
  if (lifecycles !== undefined) {
    const records = requireRuntimeRecord(lifecycles, 'CHECKPOINT_CANDIDATE_LIFECYCLES');
    const knownClusters = new Set<string>();
    for (const value of requireRuntimeArray(checkpoint.anomalyClusters, 'CHECKPOINT_CLUSTERS')) {
      knownClusters.add(requireRuntimeRecord(value, 'CHECKPOINT_CLUSTER').clusterId as string);
    }
    for (const [clusterId, record] of Object.entries(records)) {
      if (clusterId.length === 0) checkpointIntegrity('LIFECYCLE_CLUSTER_ID_EMPTY');
      validateCandidateLifecycleRecord(record, `CHECKPOINT_CANDIDATE_LIFECYCLE:${clusterId}`);
      if (!knownClusters.has(clusterId)) checkpointIntegrity(`UNKNOWN_LIFECYCLE_CLUSTER:${clusterId}`);
    }
  }
}

export type CheckpointRuntimeContractClassification = 'CURRENT_S2_CONTRACTS' | typeof CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION | 'INCOMPATIBLE_FUTURE';

/**
 * Pure, deterministic, total classification of a checkpoint's runtime
 * contract versions. INCOMPATIBLE_FUTURE only when present-and-mismatched
 * (validateCampaignCheckpoint already rejects those; this helper stays total
 * so it can be used on unvalidated values too).
 */
export function classifyCheckpointRuntimeContracts(checkpoint: CampaignCheckpoint): CheckpointRuntimeContractClassification {
  const versions = checkpoint.runtimeContractVersions;
  if (versions === undefined) return CAMPAIGN_LEGACY_RUNTIME_CONTRACT_CLASSIFICATION;
  const slots = ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const;
  if (slots.some((slot) => versions[slot] !== CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot])) return 'INCOMPATIBLE_FUTURE';
  return 'CURRENT_S2_CONTRACTS';
}

// ---------------------------------------------------------------------------
// Phase 15P A09 — resume compatibility classification (additive, pure,
// deterministic; no I/O, no persistence, no execution authority).
//
// validateCampaignCheckpoint / assertManifestCompatible remain the ONLY
// enforcement authorities on the resume path; these helpers exist so callers
// and tests can name WHICH version component drifted instead of seeing only
// the first integrity error. Precedence below deliberately mirrors the
// evaluation order of validateCampaignCheckpoint (schemaVersion, then
// campaign identity, then Session-2 runtime contracts, then per-record
// lifecycle versions), so the reported kind names the failure the strict
// validator would surface first for the same input.
// ---------------------------------------------------------------------------

/**
 * Slot-level drift between two runtime version fingerprints. Returns the
 * sorted union-key slot names whose values differ; an empty result means the
 * fingerprints are exactly equal. Total over extra/missing keys: a slot
 * present on only one side is drifted.
 */
export function classifyVersionFingerprintDrift(current: CampaignVersionFingerprint, expected: CampaignVersionFingerprint): readonly string[] {
  const left = current as unknown as RuntimeRecord;
  const right = expected as unknown as RuntimeRecord;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((slot) => left[slot] !== right[slot])
    .sort((a, b) => a.localeCompare(b));
}

export type CheckpointResumeDriftKind =
  | 'NONE'
  | 'CHECKPOINT_SCHEMA_VERSION_DRIFT'
  | 'CAMPAIGN_IDENTITY_DRIFT'
  | 'CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT'
  | 'CANDIDATE_LIFECYCLE_VERSION_DRIFT';

export interface CheckpointResumeDriftReport {
  readonly compatible: boolean;
  readonly kind: CheckpointResumeDriftKind;
  /** Sorted deterministic field/slot names that caused the classification. */
  readonly driftedFields: readonly string[];
}

const RESUME_CONTRACT_SLOTS = ['candidateLifecycle', 'replayBinding', 'promotionResult'] as const;

function incompatibleReport(kind: CheckpointResumeDriftKind, driftedFields: readonly string[]): CheckpointResumeDriftReport {
  return { compatible: false, kind, driftedFields: [...driftedFields].sort((a, b) => a.localeCompare(b)) };
}

/**
 * Total, deterministic classification of every persisted version component
 * that participates in the resume decision:
 * - checkpoint schema version (`schemaVersion`);
 * - campaign identity (`campaignId` + `manifestFingerprint`), which
 *   transitively binds the whole manifest version fingerprint (campaign
 *   fingerprint, replay-plan, semantic bundle, dossier v1/v2, and semantic
 *   expectation derivation versions all digest into it);
 * - Session-2 runtime contract versions (candidateLifecycle, replayBinding,
 *   promotionResult);
 * - per-record candidate lifecycle versions.
 *
 * Absent Session-2 fields stay LEGACY-compatible here exactly as in
 * validateCampaignCheckpoint. Malformed version-bearing shapes are classified
 * as drift of their container field, never as compatible.
 */
export function classifyCheckpointResumeDrift(checkpoint: unknown, manifest: Pick<CampaignManifest, 'campaignId' | 'manifestFingerprint'>): CheckpointResumeDriftReport {
  if (!isRuntimeRecord(checkpoint) || checkpoint.schemaVersion !== CAMPAIGN_CHECKPOINT_VERSION) {
    return incompatibleReport('CHECKPOINT_SCHEMA_VERSION_DRIFT', ['schemaVersion']);
  }
  const identity: string[] = [];
  if (checkpoint.campaignId !== manifest.campaignId) identity.push('campaignId');
  if (checkpoint.manifestFingerprint !== manifest.manifestFingerprint) identity.push('manifestFingerprint');
  if (identity.length > 0) return incompatibleReport('CAMPAIGN_IDENTITY_DRIFT', identity);
  const versions = checkpoint.runtimeContractVersions;
  if (versions !== undefined) {
    if (!isRuntimeRecord(versions)) return incompatibleReport('CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT', ['runtimeContractVersions']);
    const driftedSlots = RESUME_CONTRACT_SLOTS.filter((slot) => versions[slot] !== CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED[slot]);
    if (driftedSlots.length > 0) return incompatibleReport('CHECKPOINT_RUNTIME_CONTRACT_VERSION_DRIFT', driftedSlots);
  }
  const lifecycles = checkpoint.candidateLifecycles;
  if (lifecycles !== undefined) {
    if (!isRuntimeRecord(lifecycles)) return incompatibleReport('CANDIDATE_LIFECYCLE_VERSION_DRIFT', ['candidateLifecycles']);
    const expectedLifecycleVersion = CAMPAIGN_RUNTIME_CONTRACT_VERSIONS_EXPECTED.candidateLifecycle;
    const driftedRecords = Object.entries(lifecycles)
      .filter(([, record]) => !isRuntimeRecord(record) || record.lifecycleVersion !== expectedLifecycleVersion)
      .map(([clusterId]) => clusterId);
    if (driftedRecords.length > 0) return incompatibleReport('CANDIDATE_LIFECYCLE_VERSION_DRIFT', driftedRecords);
  }
  return { compatible: true, kind: 'NONE', driftedFields: [] };
}

export function validateCampaignCheckpoint(value: CampaignCheckpoint | unknown, manifest: CampaignManifest): asserts value is CampaignCheckpoint {
  validateCampaignManifest(manifest);
  const checkpoint = requireRuntimeRecord(value, 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID');
  try {
    assertExactKeys(checkpoint, CHECKPOINT_KEYS, 'CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID', CHECKPOINT_OPTIONAL_KEYS);
    if (checkpoint.schemaVersion !== CAMPAIGN_CHECKPOINT_VERSION) checkpointIntegrity('SCHEMA_INVALID');
    if (checkpoint.campaignId !== manifest.campaignId) checkpointIntegrity('CAMPAIGN_ID_MISMATCH');
    if (checkpoint.manifestFingerprint !== manifest.manifestFingerprint) checkpointIntegrity('MANIFEST_FINGERPRINT_MISMATCH');
    assertEnum(checkpoint.campaignStatus, CAMPAIGN_STATUSES, 'CHECKPOINT_STATUS');
    assertEnum(checkpoint.stopReason, STOP_REASONS, 'CHECKPOINT_STOP_REASON');
    assertNonNegativeInteger(checkpoint.checkpointOrdinal, 'CHECKPOINT_ORDINAL');
    if (stableCampaignJson(checkpoint.sourceSnapshots) !== stableCampaignJson(manifest.sourceSnapshots)) checkpointIntegrity('SOURCE_SNAPSHOT_MISMATCH');
    if (stableCampaignJson(checkpoint.selection) !== stableCampaignJson(manifest.selection)) checkpointIntegrity('SELECTION_MISMATCH');
    if (!arraysExactlyEqual(checkpoint.selectedJourneys as readonly unknown[], manifest.selectedJourneys) || !arraysExactlyEqual(checkpoint.selectedEnvelopes as readonly unknown[], manifest.selectedEnvelopes) || !arraysExactlyEqual(checkpoint.selectedApiScenarios as readonly unknown[], manifest.selectedApiScenarios) || !arraysExactlyEqual(checkpoint.seedLedger as readonly unknown[], manifest.seedSet)) checkpointIntegrity('SELECTED_LINEAGE_MISMATCH');
    if (stableCampaignJson(checkpoint.budgetPolicy) !== stableCampaignJson(manifest.budgetPolicy)) checkpointIntegrity('BUDGET_POLICY_MISMATCH');
    validateBudgetPolicy(manifest.budgetPolicy);
    validateBudgetUsage(checkpoint.budgetUsed, manifest.budgetPolicy, 'CHECKPOINT_BUDGET_USED');
    validateBudgetUsage(checkpoint.budgetRemaining, manifest.budgetPolicy, 'CHECKPOINT_BUDGET_REMAINING');
    const used = checkpoint.budgetUsed as RuntimeRecord;
    const remaining = checkpoint.budgetRemaining as RuntimeRecord;
    const dimensions = ['browserContexts', 'journeyContexts', 'explorationContexts', 'apiExecutions', 'replays', 'minimizationCandidates', 'totalActions', 'privateEvidenceBytes'] as const;
    const limits: Record<(typeof dimensions)[number], number> = { browserContexts: manifest.budgetPolicy.maxTotalBrowserContexts, journeyContexts: manifest.budgetPolicy.maxJourneyContexts, explorationContexts: manifest.budgetPolicy.maxExplorationContexts, apiExecutions: manifest.budgetPolicy.maxApiExecutions, replays: manifest.budgetPolicy.maxReplays, minimizationCandidates: manifest.budgetPolicy.maxMinimizationCandidates, totalActions: manifest.budgetPolicy.maxTotalActions, privateEvidenceBytes: manifest.budgetPolicy.maxPrivateEvidenceBytes };
    for (const dimension of dimensions) if ((used[dimension] as number) + (remaining[dimension] as number) !== limits[dimension]) checkpointIntegrity(`BUDGET_ARITHMETIC_MISMATCH:${dimension}`);
    const knownIds = new Set(manifest.workItems.map((item) => item.workItemId));
    const ledgerValues = requireRuntimeArray(checkpoint.executionLedger, 'CHECKPOINT_EXECUTION_LEDGER');
    if (ledgerValues.length !== manifest.workItems.length) checkpointIntegrity('EXECUTION_LEDGER_CARDINALITY_MISMATCH');
    const ledgerIds = new Set<string>();
    const ledger: CampaignExecutionRecord[] = [];
    for (const value of ledgerValues) {
      const record = validateExecutionRecord(value, manifest, knownIds);
      if (ledgerIds.has(record.workItemId)) checkpointIntegrity(`DUPLICATE_EXECUTION_RECORD:${record.workItemId}`);
      ledgerIds.add(record.workItemId);
      ledger.push(record);
    }
    if (ledgerIds.size !== knownIds.size || [...knownIds].some((id) => !ledgerIds.has(id))) checkpointIntegrity('EXECUTION_LEDGER_DOES_NOT_COVER_MANIFEST');
    validateReferenceLedgers(checkpoint, manifest, ledger);
    validateSession2RuntimeContracts(checkpoint);
    assertEnum(checkpoint.morningBriefStatus, ['NOT_STARTED', 'IN_PROGRESS', 'READY'], 'CHECKPOINT_BRIEF_STATUS');
    for (const key of ['bugCandidates', 'rejectedHypotheses', 'unresolved', 'safetyEvents', 'versionDrift', 'resumeRecipe']) {
      const values = requireRuntimeArray(checkpoint[key], `CHECKPOINT:${key}`);
      for (const item of values) assertString(item, `CHECKPOINT:${key}`);
      if (key !== 'resumeRecipe') assertUniqueStrings(values, `CHECKPOINT:${key}`);
    }
    assertString(checkpoint.nextExactAction, 'CHECKPOINT_NEXT_ACTION');
    validateSafety(checkpoint.safety, 'CHECKPOINT_SAFETY');
    validatePrivacy(checkpoint.privacy, 'CHECKPOINT_PRIVACY');
    assertEnum(checkpoint.privacyStatus, ['PASS', 'BLOCKED'], 'CHECKPOINT_PRIVACY_STATUS');
    if (checkpoint.privacyStatus !== checkpoint.privacy.result) checkpointIntegrity('PRIVACY_STATUS_MISMATCH');
    const guarantees = requireRuntimeRecord(checkpoint.executionGuarantees, 'CHECKPOINT_GUARANTEES');
    assertExactKeys(guarantees, WORK_KINDS, 'CHECKPOINT_GUARANTEES');
    for (const kind of WORK_KINDS) assertEnum(guarantees[kind], ['EXACTLY_ONCE_LOGICAL', 'AT_LEAST_ONCE_SAFE', 'REPLAY_REQUIRED'], `CHECKPOINT_GUARANTEE:${kind}`);
    assertFiniteNonNegative(checkpoint.runtimeElapsedMs, 'CHECKPOINT_RUNTIME');
    assertIsoTimestamp(checkpoint.createdAt, 'CHECKPOINT_CREATED_AT');
    assertIsoTimestamp(checkpoint.updatedAt, 'CHECKPOINT_UPDATED_AT');
    const typedCheckpoint = checkpoint as unknown as CampaignCheckpoint;
    if (typedCheckpoint.campaignStatus === 'IN_PROGRESS' && typedCheckpoint.stopReason !== 'NONE') checkpointIntegrity('IN_PROGRESS_WITH_TERMINAL_STOP');
    if (typedCheckpoint.campaignStatus === 'COMPLETE_CLEAN') {
      if (typedCheckpoint.stopReason !== 'NONE' || typedCheckpoint.unresolved.length > 0 || typedCheckpoint.remainingWorkItemIds.length > 0 || typedCheckpoint.minimizationQueue.length > 0 || typedCheckpoint.reproductionQueue.some((item) => ['PENDING', 'RUNNING', 'REPLAY_REQUIRED'].includes(item.state))) checkpointIntegrity('COMPLETE_CLEAN_HAS_PENDING_OR_UNRESOLVED_STATE');
    }
    if (typedCheckpoint.campaignStatus === 'COMPLETE_WITH_FINDINGS' && typedCheckpoint.dossierLedger.every((entry) => entry.state !== 'READY')) checkpointIntegrity('COMPLETE_WITH_FINDINGS_HAS_NO_READY_DOSSIER');
    if (typedCheckpoint.campaignStatus === 'PARTIAL_BUDGET_EXHAUSTED' && typedCheckpoint.stopReason !== 'BUDGET_EXHAUSTED' && typedCheckpoint.stopReason !== 'RUNTIME_TIMEOUT') checkpointIntegrity('BUDGET_RESULT_STOP_MISMATCH');
    if (typedCheckpoint.campaignStatus === 'PARTIAL_BUDGET_EXHAUSTED' && typedCheckpoint.stopReason === 'BUDGET_EXHAUSTED') {
      const exhausted = dimensions.some((dimension) => {
        const limit = limits[dimension];
        return limit > 0
          && (used[dimension] as number) === limit
          && (remaining[dimension] as number) === 0;
      });
      if (!exhausted) checkpointIntegrity('BUDGET_STOP_WITHOUT_POSITIVE_LIMIT_EXHAUSTION');
    }
    if (typedCheckpoint.campaignStatus === 'PARTIAL_AUTH_BLOCKED' && typedCheckpoint.stopReason !== 'AUTH_BLOCKED') checkpointIntegrity('AUTH_RESULT_STOP_MISMATCH');
    if (typedCheckpoint.campaignStatus === 'ABORTED_OWNER_POLICY' && typedCheckpoint.stopReason !== 'OWNER_POLICY_BLOCKED') checkpointIntegrity('OWNER_RESULT_STOP_MISMATCH');
    if (typedCheckpoint.campaignStatus === 'INCOMPLETE_PROCESS_INTERRUPTION' && typedCheckpoint.stopReason !== 'PROCESS_INTERRUPTION') checkpointIntegrity('INTERRUPTION_RESULT_STOP_MISMATCH');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CAMPAIGN_CHECKPOINT_INTEGRITY_INVALID:')) throw error;
    checkpointIntegrity(error instanceof Error ? error.message : 'SHAPE_INVALID');
  }
}

function fileStem(campaignId: string): string {
  if (!/^campaign:sha256:[a-f0-9]{24}$/i.test(campaignId)) throw new Error('CAMPAIGN_ID_INVALID');
  return campaignId.replaceAll(':', '-');
}
function readWrapper<T>(filePath: string, key: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(`CAMPAIGN_ARTIFACT_INVALID:${key}:MALFORMED_JSON`);
  }
  const parsedRecord = requireRuntimeRecord(parsed, `CAMPAIGN_ARTIFACT_INVALID:${key}`);
  assertExactKeys(parsedRecord, [key], `CAMPAIGN_ARTIFACT_INVALID:${key}`, ['status']);
  if (parsedRecord.status !== 'READY' && parsedRecord.status !== 'INCOMPLETE') throw new Error(`CAMPAIGN_ARTIFACT_INVALID:${key}:STATUS_INVALID`);
  const value = parsedRecord[key];
  if (value === null || typeof value !== 'object') throw new Error(`CAMPAIGN_ARTIFACT_INVALID:${key}`);
  return value as T;
}

export class CampaignCheckpointStore {
  readonly store: PrivateArtifactStore;

  constructor(store = new PrivateArtifactStore()) {
    this.store = store;
  }

  writeManifest(manifest: CampaignManifest): string {
    assertOwnerPolicyAllows('PRIVATE_EVIDENCE');
    validateCampaignManifest(manifest);
    return this.store.writeJson(`${fileStem(manifest.campaignId)}.manifest.json`, { manifest });
  }

  writeCheckpoint(checkpoint: CampaignCheckpoint, manifest?: CampaignManifest): string {
    assertOwnerPolicyAllows('PRIVATE_EVIDENCE');
    const effectiveManifest = manifest ?? this.readManifest(checkpoint.campaignId);
    validateCampaignCheckpoint(checkpoint, effectiveManifest);
    return this.store.writeJson(`${fileStem(checkpoint.campaignId)}.checkpoint.json`, { checkpoint });
  }

  readManifest(campaignId: string): CampaignManifest {
    const filePath = path.join(this.store.root, `${fileStem(campaignId)}.manifest.json`);
    const manifest = readWrapper<CampaignManifest>(filePath, 'manifest');
    validateCampaignManifest(manifest);
    return manifest;
  }

  readCheckpoint(campaignId: string, manifest?: CampaignManifest): CampaignCheckpoint {
    const filePath = path.join(this.store.root, `${fileStem(campaignId)}.checkpoint.json`);
    const checkpoint = readWrapper<CampaignCheckpoint>(filePath, 'checkpoint');
    const effectiveManifest = manifest ?? this.readManifest(campaignId);
    validateCampaignCheckpoint(checkpoint, effectiveManifest);
    // Keep the compatibility check as a separate, explicit guard for callers
    // that pass a manifest object. The strict validator above gives malformed
    // persisted identity a precise integrity classification before resume.
    assertManifestCompatible(effectiveManifest, checkpoint);
    return checkpoint;
  }

  paths(campaignId: string): { readonly manifest: string; readonly checkpoint: string } {
    const stem = fileStem(campaignId);
    return {
      manifest: path.join(this.store.root, `${stem}.manifest.json`),
      checkpoint: path.join(this.store.root, `${stem}.checkpoint.json`),
    };
  }
}
