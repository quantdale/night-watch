// ---------------------------------------------------------------------------
// Phase 7 deterministic campaign identity and manifest construction.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  CAMPAIGN_MANIFEST_VERSION,
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  type CampaignInput,
  type CampaignAnomalyCandidate,
  type CampaignManifest,
  type CampaignMode,
  type CampaignPrivacyPolicy,
  type CampaignSelectionResult,
  type CampaignSourceWindow,
  type CampaignWorkItem,
} from './types';
import { buildCampaignSelection, validateCampaignInputs } from './selection';

const SHA_RE = /^[0-9a-f]{40}$/i;
const ID_RE = /^[A-Za-z0-9_.:/-]{1,200}$/;
const SEED_RE = /^0x[0-9a-f]{16}$/;

/** Canonical key-ordered JSON used for IDs and deterministic ordering. */
export function stableCampaignJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'undefined') return 'null';
  if (Array.isArray(value)) return `[${value.map(stableCampaignJson).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(String(value));
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableCampaignJson(child)}`)
    .join(',')}}`;
}

export function campaignDigest(value: unknown): string {
  return crypto.createHash('sha256').update(stableCampaignJson(value), 'utf8').digest('hex');
}

function persistedCandidate(candidate: CampaignAnomalyCandidate): Omit<CampaignAnomalyCandidate, 'replay'> {
  const { replay: _replay, ...metadata } = candidate;
  return metadata;
}

export function campaignIdFromManifestInput(input: Pick<CampaignInput, 'mode' | 'sourceSnapshots' | 'sourceWindow' | 'phase3Selection' | 'seedCorpusVersion' | 'seedSet' | 'versions' | 'budgetPolicy' | 'privacyPolicy' | 'reproductionTarget'>): string {
  const identity = {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    orchestratorVersion: input.versions.orchestratorVersion,
    mode: input.mode,
    sourceSnapshots: input.sourceSnapshots,
    sourceWindow: input.sourceWindow,
    phase3Selection: input.phase3Selection,
    seedCorpusVersion: input.seedCorpusVersion,
    seedSet: [...input.seedSet].sort(),
    versions: input.versions,
    budgetPolicy: input.budgetPolicy,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget === undefined ? null : {
      clusterId: input.reproductionTarget.clusterId,
      candidate: persistedCandidate(input.reproductionTarget.candidate),
    },
  };
  return `campaign:sha256:${campaignDigest(identity).slice(0, 24)}`;
}

export function manifestFingerprint(input: {
  readonly campaignId: string;
  readonly mode: CampaignMode;
  readonly sourceSnapshots: CampaignInput['sourceSnapshots'];
  readonly sourceWindow: CampaignSourceWindow;
  readonly selection: CampaignSelectionResult;
  readonly seedSet: readonly string[];
  readonly workItems: readonly CampaignWorkItem[];
  readonly budgetPolicy: CampaignInput['budgetPolicy'];
  readonly versions: CampaignInput['versions'];
  readonly privacyPolicy: CampaignPrivacyPolicy;
  readonly reproductionTarget?: CampaignInput['reproductionTarget'];
}): string {
  return `manifest:sha256:${campaignDigest({
    schemaVersion: CAMPAIGN_MANIFEST_VERSION,
    campaignId: input.campaignId,
    mode: input.mode,
    sourceSnapshots: input.sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: input.selection,
    seedSet: [...input.seedSet].sort(),
    workItems: input.workItems,
    budgetPolicy: input.budgetPolicy,
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget === undefined ? null : {
      clusterId: input.reproductionTarget.clusterId,
      candidate: persistedCandidate(input.reproductionTarget.candidate),
    },
  }).slice(0, 24)}`;
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  const objectValue = value as object;
  if (seen.has(objectValue)) return value;
  seen.add(objectValue);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function validateManifestIdentity(manifest: CampaignManifest): void {
  if (manifest.schemaVersion !== CAMPAIGN_MANIFEST_VERSION || manifest.campaignSchemaVersion !== CAMPAIGN_SCHEMA_VERSION) {
    throw new Error('CAMPAIGN_MANIFEST_SCHEMA_INVALID');
  }
  if (!/^campaign:sha256:[a-f0-9]{24}$/i.test(manifest.campaignId)) throw new Error('CAMPAIGN_ID_INVALID');
  if (!/^manifest:sha256:[a-f0-9]{24}$/i.test(manifest.manifestFingerprint)) throw new Error('CAMPAIGN_MANIFEST_FINGERPRINT_INVALID');
  if (!ID_RE.test(manifest.versions.nightwatchSourceSha)) throw new Error('CAMPAIGN_NIGHTWATCH_SOURCE_VERSION_INVALID');
  if (!ID_RE.test(manifest.seedCorpusVersion)) throw new Error('CAMPAIGN_SEED_CORPUS_VERSION_INVALID');
  for (const seed of manifest.seedSet) if (!SEED_RE.test(seed)) throw new Error('CAMPAIGN_SEED_INVALID');
  if (manifest.deploymentStatus !== 'DEPLOYMENT_STATUS_UNRESOLVED') throw new Error('CAMPAIGN_DEPLOYMENT_CLAIM_INVALID');
  if (manifest.ownerScopePolicy.status !== 'FROZEN_BY_OWNER' || manifest.ownerScopePolicy.l4 !== 'OUT_OF_SCOPE_BY_OWNER') {
    throw new Error('CAMPAIGN_OWNER_SCOPE_INVALID');
  }
  for (const snapshot of manifest.sourceSnapshots) {
    if (!ID_RE.test(snapshot.repoId) || !SHA_RE.test(snapshot.headSha) || !SHA_RE.test(snapshot.sourceMapSha) || snapshot.readOnly !== true) {
      throw new Error(`CAMPAIGN_SOURCE_SNAPSHOT_INVALID:${snapshot.repoId}`);
    }
  }
  const ids = new Set<string>();
  for (const item of manifest.workItems) {
    if (!ID_RE.test(item.workItemId) || ids.has(item.workItemId)) throw new Error(`CAMPAIGN_WORK_ITEM_INVALID:${item.workItemId}`);
    ids.add(item.workItemId);
    if (item.order < 0 || !Number.isInteger(item.order)) throw new Error(`CAMPAIGN_WORK_ORDER_INVALID:${item.workItemId}`);
  }
  if (manifest.workItems.some((item, index) => item.order !== index)) throw new Error('CAMPAIGN_WORK_ORDER_NOT_CANONICAL');
}

/** Build and deep-freeze the execution manifest before any executor runs. */
export function createCampaignManifest(input: CampaignInput): CampaignManifest {
  validateCampaignInputs(input);
  const selection = buildCampaignSelection(input);
  const sourceSnapshots = [...input.sourceSnapshots].sort((a, b) => a.repoId.localeCompare(b.repoId));
  // Identity is based on the work that can actually run. Unselected seed
  // entries are not allowed to make a J1-only campaign incompatible with its
  // own persisted manifest.
  const campaignId = campaignIdFromManifestInput({ ...input, sourceSnapshots, seedSet: selection.result.selectedSeeds });
  const workItems = selection.workItems;
  const fingerprint = manifestFingerprint({
    campaignId,
    mode: input.mode,
    sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: selection.result,
    seedSet: selection.result.selectedSeeds,
    workItems,
    budgetPolicy: input.budgetPolicy,
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    reproductionTarget: input.reproductionTarget,
  });
  const manifest: CampaignManifest = {
    schemaVersion: CAMPAIGN_MANIFEST_VERSION,
    campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
    campaignId,
    manifestFingerprint: fingerprint,
    mode: input.mode,
    createdAt: input.createdAt,
    sourceSnapshots,
    sourceWindow: input.sourceWindow,
    selection: selection.result,
    selectedJourneys: selection.result.selectedJourneys,
    selectedEnvelopes: selection.result.selectedEnvelopes,
    selectedApiScenarios: selection.result.selectedApiScenarios,
    seedSet: [...selection.result.selectedSeeds],
    seedCorpusVersion: input.seedCorpusVersion,
    workItems,
    budgetPolicy: input.budgetPolicy,
    runtimeCeilingMs: input.budgetPolicy.maxRuntimeMs,
    perTestTimeoutMs: input.budgetPolicy.maxPerTestTimeoutMs,
    replayBudget: {
      maxReplays: input.budgetPolicy.maxReplays,
      maxPromotedClusters: input.budgetPolicy.maxPromotedClusters,
    },
    minimizationBudget: {
      maxCandidateEvaluations: Math.min(input.budgetPolicy.maxMinimizationCandidates, Math.max(0, input.budgetPolicy.maxReplays - 1)),
      maxTotalReplays: Math.min(input.budgetPolicy.maxReplays, input.budgetPolicy.maxMinimizationCandidates + 1),
    },
    versions: input.versions,
    privacyPolicy: input.privacyPolicy,
    ...(input.reproductionTarget === undefined ? {} : {
      reproductionTarget: {
        clusterId: input.reproductionTarget.clusterId,
        candidate: persistedCandidate(input.reproductionTarget.candidate),
      },
    }),
    ownerScopePolicy: {
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      l4: 'OUT_OF_SCOPE_BY_OWNER',
    },
    deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
  };
  validateManifestIdentity(manifest);
  return deepFreeze(manifest);
}

export function assertManifestCompatible(manifest: CampaignManifest, checkpoint: { readonly manifestFingerprint: string; readonly campaignId: string }): void {
  if (manifest.campaignId !== checkpoint.campaignId || manifest.manifestFingerprint !== checkpoint.manifestFingerprint) {
    throw new Error('CAMPAIGN_VERSION_DRIFT');
  }
}

export function validateCampaignManifest(manifest: CampaignManifest): void {
  validateManifestIdentity(manifest);
  const expectedId = campaignIdFromManifestInput({
    mode: manifest.mode,
    sourceSnapshots: manifest.sourceSnapshots,
    sourceWindow: manifest.sourceWindow,
    phase3Selection: manifest.selection.phase3,
    seedCorpusVersion: manifest.seedCorpusVersion,
    seedSet: manifest.seedSet,
    versions: manifest.versions,
    budgetPolicy: manifest.budgetPolicy,
    privacyPolicy: manifest.privacyPolicy,
    reproductionTarget: manifest.reproductionTarget === undefined ? undefined : {
      clusterId: manifest.reproductionTarget.clusterId,
      candidate: manifest.reproductionTarget.candidate,
    },
  });
  if (expectedId !== manifest.campaignId) throw new Error('CAMPAIGN_ID_RECOMPUTATION_MISMATCH');
}
