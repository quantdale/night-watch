import { phase22Digest, phase22ManifestId } from './digest';
import type { Phase22EligibilityDecision } from './eligibility';
import {
  PHASE22_MANIFEST_VERSION,
  PHASE22_REQUIRED_PREFLIGHT_CHECKS,
  type Phase22DevAcceptanceManifest,
  type Phase22ManifestExclusion,
  type Phase22ManifestTarget,
  type Phase22SemanticMaterialClass,
} from './types';

const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const DIGEST_RE = /^[A-Za-z][A-Za-z0-9-]{0,48}:sha256:[0-9a-f]{24}$/;
const MATERIAL_CLASSES: readonly Phase22SemanticMaterialClass[] = [
  'COLLECTION', 'MEMBERSHIP', 'RELATIONAL', 'DIFFERENTIAL', 'SHAPE', 'PROTOCOL',
];

function invalid(reason: string): never {
  throw new Error(`PHASE22_MANIFEST_INVALID:${reason}`);
}

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
}

function validateSource(source: Phase22ManifestTarget['source']): void {
  safeId(source.repoId, 'SOURCE_REPO');
  if (!SHA_RE.test(source.sha)) invalid('SOURCE_SHA');
  if (!EVIDENCE_RE.test(source.evidenceDigest)) invalid('SOURCE_EVIDENCE');
}

function validateTarget(target: Phase22ManifestTarget): void {
  const expectedKeys = [
    'targetId', 'product', 'journeyOrApiAdapter', 'semanticContractId', 'expectationId', 'source',
    'projectionIdentity', 'differentialPairId', 'replay', 'observation', 'anticipatedInvariantCount',
    'requiredPreflightChecks', 'materialClass', 'historicalDevEvidence', 'selectionPriority',
  ].sort();
  if (JSON.stringify(Object.keys(target).sort()) !== JSON.stringify(expectedKeys)) invalid('TARGET_FIELDS');
  safeId(target.targetId, 'TARGET');
  safeId(target.product, 'PRODUCT');
  safeId(target.journeyOrApiAdapter, 'ADAPTER');
  safeId(target.semanticContractId, 'CONTRACT');
  safeId(target.expectationId, 'EXPECTATION');
  validateSource(target.source);
  if (!DIGEST_RE.test(target.projectionIdentity)) invalid('PROJECTION_IDENTITY');
  if (target.differentialPairId !== null) safeId(target.differentialPairId, 'DIFFERENTIAL_PAIR');
  if (target.replay.required !== true || target.replay.maxAdditionalContexts !== 1 || target.replay.freshContext !== true) invalid('REPLAY_BOUND');
  if (target.replay.allowedOutcomes.length === 0) invalid('REPLAY_OUTCOMES');
  if (target.observation.mutationAllowed !== false || target.observation.maxFirstObservations !== 1 || target.observation.maxReplayObservations !== 1 || target.observation.dynamicTargetDiscovery !== false) invalid('OBSERVATION_BOUND');
  if (!Number.isInteger(target.anticipatedInvariantCount) || target.anticipatedInvariantCount < 1 || target.anticipatedInvariantCount > 32) invalid('INVARIANT_COUNT');
  if (!MATERIAL_CLASSES.includes(target.materialClass)) invalid('MATERIAL_CLASS');
  if (typeof target.historicalDevEvidence !== 'boolean' || !Number.isInteger(target.selectionPriority) || target.selectionPriority < 1 || target.selectionPriority > 1000) invalid('SELECTION_PRIORITY');
  if (JSON.stringify([...target.requiredPreflightChecks].sort()) !== JSON.stringify([...PHASE22_REQUIRED_PREFLIGHT_CHECKS].sort())) invalid('PREFLIGHT_CHECKS');
}

export interface Phase22ManifestCandidate {
  readonly target: Phase22ManifestTarget;
  readonly eligibility: Phase22EligibilityDecision;
}

const MATERIAL_PRIORITY: Readonly<Record<Phase22SemanticMaterialClass, number>> = {
  COLLECTION: 2,
  MEMBERSHIP: 3,
  RELATIONAL: 4,
  DIFFERENTIAL: 5,
  SHAPE: 6,
  PROTOCOL: 7,
};

function candidateOrder(left: Phase22ManifestCandidate, right: Phase22ManifestCandidate): number {
  const historical = Number(right.target.historicalDevEvidence) - Number(left.target.historicalDevEvidence);
  if (historical !== 0) return historical;
  const material = MATERIAL_PRIORITY[left.target.materialClass] - MATERIAL_PRIORITY[right.target.materialClass];
  if (material !== 0) return material;
  const priority = left.target.selectionPriority - right.target.selectionPriority;
  if (priority !== 0) return priority;
  return left.target.targetId.localeCompare(right.target.targetId);
}

function selectEligible(candidates: readonly Phase22ManifestCandidate[]): Phase22ManifestCandidate[] {
  const ordered = [...candidates].filter((candidate) => candidate.eligibility.eligible).sort(candidateOrder);
  const selected: Phase22ManifestCandidate[] = [];
  const classes = new Set<Phase22SemanticMaterialClass>();
  for (const candidate of ordered) {
    if (selected.length >= 6) break;
    if (!classes.has(candidate.target.materialClass)) {
      selected.push(candidate);
      classes.add(candidate.target.materialClass);
    }
  }
  for (const candidate of ordered) {
    if (selected.length >= 6) break;
    if (!selected.some((item) => item.target.targetId === candidate.target.targetId)) selected.push(candidate);
  }
  return selected;
}

/** Build the only manifest shape accepted by the Phase 22 launcher. */
export function createFrozenPhase22Manifest(input: {
  readonly nightwatchSha: string;
  readonly candidates: readonly Phase22ManifestCandidate[];
  readonly additionalExclusions?: readonly Phase22ManifestExclusion[];
}): Phase22DevAcceptanceManifest {
  if (!SHA_RE.test(input.nightwatchSha)) invalid('NIGHTWATCH_SHA');
  const ids = new Set<string>();
  for (const candidate of input.candidates) {
    validateTarget(candidate.target);
    if (ids.has(candidate.target.targetId)) invalid('DUPLICATE_CANDIDATE');
    ids.add(candidate.target.targetId);
    if (!candidate.eligibility.eligible && candidate.eligibility.state === 'REAL_SOURCE_DEV_ACCEPTANCE_ELIGIBLE') invalid('ELIGIBILITY_CONTRADICTION');
  }
  const selected = selectEligible(input.candidates);
  const selectedIds = new Set(selected.map((candidate) => candidate.target.targetId));
  const exclusions: Phase22ManifestExclusion[] = input.candidates
    .filter((candidate) => !selectedIds.has(candidate.target.targetId))
    .map((candidate) => ({
      targetId: candidate.target.targetId,
      eligibility: candidate.eligibility.state,
      reasonCode: candidate.eligibility.eligible ? 'TARGET_BOUND_OR_MATERIAL_DIVERSITY' : candidate.eligibility.reasons[0] ?? 'NOT_ELIGIBLE',
    }))
    .concat(input.additionalExclusions ?? [])
    .sort((left, right) => left.targetId.localeCompare(right.targetId));
  if (new Set(exclusions.map((exclusion) => exclusion.targetId)).size !== exclusions.length) invalid('DUPLICATE_EXCLUSION');
  const targets = selected.map((candidate) => candidate.target);
  const core = {
    schemaVersion: PHASE22_MANIFEST_VERSION,
    nightwatchSha: input.nightwatchSha,
    environment: 'DEV' as const,
    maxTargets: 6 as const,
    maxObservationContexts: 12 as const,
    frozen: true as const,
    targets,
    exclusions,
  };
  const manifestId = phase22ManifestId(core);
  const withId = { ...core, manifestId };
  const manifest: Phase22DevAcceptanceManifest = {
    ...withId,
    deterministicDigest: phase22Digest(withId, 'manifest:sha256:'),
  };
  validatePhase22Manifest(manifest);
  return manifest;
}

export function validatePhase22Manifest(manifest: Phase22DevAcceptanceManifest): void {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) invalid('OBJECT');
  const expectedKeys = ['schemaVersion', 'manifestId', 'nightwatchSha', 'environment', 'maxTargets', 'maxObservationContexts', 'frozen', 'targets', 'exclusions', 'deterministicDigest'].sort();
  if (JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(expectedKeys)) invalid('FIELDS');
  if (manifest.schemaVersion !== PHASE22_MANIFEST_VERSION || manifest.environment !== 'DEV' || manifest.maxTargets !== 6 || manifest.maxObservationContexts !== 12 || manifest.frozen !== true) invalid('HEADER');
  if (!SHA_RE.test(manifest.nightwatchSha) || !/^manifest:sha256:[0-9a-f]{24}$/.test(manifest.manifestId) || !/^manifest:sha256:[0-9a-f]{24}$/.test(manifest.deterministicDigest)) invalid('IDENTITY');
  if (!Array.isArray(manifest.targets) || manifest.targets.length > 6 || manifest.targets.length * 2 > 12) invalid('TARGET_BOUND');
  const seen = new Set<string>();
  for (const target of manifest.targets) {
    validateTarget(target);
    if (seen.has(target.targetId)) invalid('DUPLICATE_TARGET');
    seen.add(target.targetId);
  }
  if (!Array.isArray(manifest.exclusions)) invalid('EXCLUSIONS');
  const canonical = {
    schemaVersion: manifest.schemaVersion,
    nightwatchSha: manifest.nightwatchSha,
    environment: manifest.environment,
    maxTargets: manifest.maxTargets,
    maxObservationContexts: manifest.maxObservationContexts,
    frozen: manifest.frozen,
    targets: manifest.targets,
    exclusions: manifest.exclusions,
  };
  if (manifest.manifestId !== phase22ManifestId(canonical)) invalid('MANIFEST_ID_DIGEST');
  if (manifest.deterministicDigest !== phase22Digest({ ...canonical, manifestId: manifest.manifestId }, 'manifest:sha256:')) invalid('MANIFEST_DIGEST');
}

export function manifestTargetCount(manifest: Phase22DevAcceptanceManifest): number {
  validatePhase22Manifest(manifest);
  return manifest.targets.length;
}
