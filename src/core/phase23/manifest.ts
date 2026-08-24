/**
 * Phase 23's fresh DEV manifest boundary.
 *
 * This is deliberately a new schema and validator. Phase 22 manifests remain
 * historical evidence and are never accepted by this module.
 */

import crypto from 'node:crypto';

export const PHASE23_MANIFEST_VERSION = 'nightwatch.dev-semantic-acceptance-manifest.v2' as const;
export const PHASE23_DRY_RUN_VERSION = 'nightwatch.dev-semantic-acceptance-dry-run.v2' as const;

export type Phase23MaterialClass = 'COLLECTION' | 'MEMBERSHIP' | 'RELATIONAL' | 'DIFFERENTIAL' | 'SHAPE' | 'PROTOCOL';

export interface Phase23SourceIdentity {
  readonly repoId: string;
  readonly sha: string;
  readonly evidenceDigest: string;
}

export interface Phase23ManifestTarget {
  readonly targetId: string;
  readonly product: string;
  readonly productSurfaceId: string;
  readonly journeyOrApiAdapter: string;
  readonly expectationId: string;
  readonly projectionId: string;
  readonly runtimeAdapterId: string;
  readonly source: Phase23SourceIdentity;
  readonly materialClass: Phase23MaterialClass;
  readonly anticipatedInvariantCount: number;
  readonly replay: {
    readonly firstCount: 1;
    readonly maxAdditionalContexts: 1;
    readonly freshContext: true;
  };
  readonly privacy: {
    readonly rawValuesPersisted: false;
    readonly rawDomPersisted: false;
    readonly screenshotsPersisted: false;
    readonly tracesPersisted: false;
  };
  readonly observation: {
    readonly mutationAllowed: false;
    readonly dynamicTargetDiscovery: false;
  };
}

export interface Phase23ManifestExclusion {
  readonly targetId: string;
  readonly reasonCode: string;
}

export interface Phase23QualityGateBinding {
  readonly receiptSchemaVersion: 'nightwatch.quality-gate-receipt.v1';
  readonly receiptDigest: string;
  readonly gateDefinitionDigest: string;
  readonly gitHead: string;
  readonly finalResult: 'PASS';
}

export interface Phase23Manifest {
  readonly schemaVersion: typeof PHASE23_MANIFEST_VERSION;
  readonly manifestId: string;
  readonly nightwatchSha: string;
  readonly environment: 'DEV';
  readonly maxTargets: 3;
  readonly maxObservationContexts: 6;
  readonly frozen: true;
  readonly qualityGate: Phase23QualityGateBinding;
  readonly privacyRules: readonly ['NO_RAW_VALUES', 'NO_RAW_DOM', 'NO_SCREENSHOTS', 'NO_TRACES', 'NO_PERSISTED_AUTH'];
  readonly targets: readonly Phase23ManifestTarget[];
  readonly exclusions: readonly Phase23ManifestExclusion[];
  readonly deterministicDigest: string;
}

export interface Phase23DryRunReceipt {
  readonly schemaVersion: typeof PHASE23_DRY_RUN_VERSION;
  readonly manifestId: string;
  readonly manifestDigest: string;
  readonly targetCount: number;
  readonly firstPlanCount: number;
  readonly replayPlanCount: number;
  readonly totalContexts: number;
  readonly externalContactCount: 0;
  readonly mutationCount: 0;
  readonly rawPersistenceCount: 0;
  readonly privacyPassed: true;
  readonly containmentPassed: true;
  readonly result: 'PASS';
  readonly deterministicDigest: string;
}

const SHA_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_RE = /^ev:sha256:[0-9a-f]{24}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const MANIFEST_DIGEST_RE = /^manifest:sha256:[0-9a-f]{24}$/;
const RECEIPT_DIGEST_RE = /^receipt:sha256:[0-9a-f]{24}$/;
const GATE_DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const MATERIAL_CLASSES: readonly Phase23MaterialClass[] = ['COLLECTION', 'MEMBERSHIP', 'RELATIONAL', 'DIFFERENTIAL', 'SHAPE', 'PROTOCOL'];
const PRIVACY_RULES: Phase23Manifest['privacyRules'] = ['NO_RAW_VALUES', 'NO_RAW_DOM', 'NO_SCREENSHOTS', 'NO_TRACES', 'NO_PERSISTED_AUTH'];

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('PHASE23_MANIFEST_NON_FINITE_NUMBER');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  throw new Error('PHASE23_MANIFEST_UNSUPPORTED_VALUE');
}

function digest(value: unknown, prefix: string): string {
  return `${prefix}${crypto.createHash('sha256').update(canonical(value), 'utf8').digest('hex').slice(0, 24)}`;
}

function invalid(reason: string): never {
  throw new Error(`PHASE23_MANIFEST_INVALID:${reason}`);
}

function id(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
}

function validateTarget(target: Phase23ManifestTarget): void {
  id(target.targetId, 'TARGET');
  id(target.product, 'PRODUCT');
  id(target.productSurfaceId, 'SURFACE');
  id(target.journeyOrApiAdapter, 'ADAPTER');
  id(target.expectationId, 'EXPECTATION');
  id(target.projectionId, 'PROJECTION');
  id(target.runtimeAdapterId, 'RUNTIME_ADAPTER');
  if (!idSource(target.source)) invalid('SOURCE');
  if (!MATERIAL_CLASSES.includes(target.materialClass)) invalid('MATERIAL_CLASS');
  if (!Number.isInteger(target.anticipatedInvariantCount) || target.anticipatedInvariantCount < 1 || target.anticipatedInvariantCount > 32) invalid('INVARIANT_COUNT');
  if (target.replay.firstCount !== 1 || target.replay.maxAdditionalContexts !== 1 || target.replay.freshContext !== true) invalid('REPLAY_BOUND');
  if (target.privacy.rawValuesPersisted !== false || target.privacy.rawDomPersisted !== false || target.privacy.screenshotsPersisted !== false || target.privacy.tracesPersisted !== false) invalid('PRIVACY_BOUND');
  if (target.observation.mutationAllowed !== false || target.observation.dynamicTargetDiscovery !== false) invalid('OBSERVATION_BOUND');
}

function idSource(source: Phase23SourceIdentity): boolean {
  return source !== null
    && typeof source === 'object'
    && SAFE_ID_RE.test(source.repoId)
    && SHA_RE.test(source.sha)
    && EVIDENCE_RE.test(source.evidenceDigest);
}

function validateQualityGate(binding: Phase23QualityGateBinding, nightwatchSha: string): void {
  if (binding.receiptSchemaVersion !== 'nightwatch.quality-gate-receipt.v1' || !RECEIPT_DIGEST_RE.test(binding.receiptDigest) || !GATE_DIGEST_RE.test(binding.gateDefinitionDigest) || binding.gitHead !== nightwatchSha || binding.finalResult !== 'PASS') invalid('QUALITY_GATE_BINDING');
}

function coreOf(manifest: Phase23Manifest): Record<string, unknown> {
  return {
    schemaVersion: manifest.schemaVersion,
    nightwatchSha: manifest.nightwatchSha,
    environment: manifest.environment,
    maxTargets: manifest.maxTargets,
    maxObservationContexts: manifest.maxObservationContexts,
    frozen: manifest.frozen,
    qualityGate: manifest.qualityGate,
    privacyRules: manifest.privacyRules,
    targets: manifest.targets,
    exclusions: manifest.exclusions,
  };
}

export function createPhase23Manifest(input: {
  readonly nightwatchSha: string;
  readonly qualityGate: Phase23QualityGateBinding;
  readonly targets: readonly Phase23ManifestTarget[];
  readonly exclusions: readonly Phase23ManifestExclusion[];
}): Phase23Manifest {
  if (!SHA_RE.test(input.nightwatchSha)) invalid('NIGHTWATCH_SHA');
  if (input.targets.length < 1 || input.targets.length > 3 || input.targets.length * 2 > 6) invalid('TARGET_BOUND');
  const ids = new Set<string>();
  for (const target of input.targets) {
    validateTarget(target);
    if (ids.has(target.targetId)) invalid('DUPLICATE_TARGET');
    ids.add(target.targetId);
  }
  if (input.exclusions.some((exclusion) => !SAFE_ID_RE.test(exclusion.targetId) || !SAFE_ID_RE.test(exclusion.reasonCode))) invalid('EXCLUSION');
  if (new Set(input.exclusions.map((exclusion) => exclusion.targetId)).size !== input.exclusions.length) invalid('DUPLICATE_EXCLUSION');
  const sources = new Set(input.targets.map((target) => `${target.source.repoId}:${target.source.sha}`));
  if (sources.size !== 1) invalid('MULTIPLE_SOURCE_SNAPSHOTS');
  validateQualityGate(input.qualityGate, input.nightwatchSha);
  const manifestWithoutIdentity = {
    schemaVersion: PHASE23_MANIFEST_VERSION,
    nightwatchSha: input.nightwatchSha,
    environment: 'DEV' as const,
    maxTargets: 3 as const,
    maxObservationContexts: 6 as const,
    frozen: true as const,
    qualityGate: input.qualityGate,
    privacyRules: PRIVACY_RULES,
    targets: input.targets,
    exclusions: input.exclusions,
  };
  const manifestId = digest(manifestWithoutIdentity, 'manifest:sha256:');
  const withId = { ...manifestWithoutIdentity, manifestId };
  const manifest: Phase23Manifest = { ...withId, deterministicDigest: digest(withId, 'manifest:sha256:') };
  validatePhase23Manifest(manifest);
  return manifest;
}

export function validatePhase23Manifest(manifest: Phase23Manifest): void {
  const keys = ['schemaVersion', 'manifestId', 'nightwatchSha', 'environment', 'maxTargets', 'maxObservationContexts', 'frozen', 'qualityGate', 'privacyRules', 'targets', 'exclusions', 'deterministicDigest'].sort();
  if (manifest === null || typeof manifest !== 'object' || JSON.stringify(Object.keys(manifest).sort()) !== JSON.stringify(keys)) invalid('FIELDS');
  if (manifest.schemaVersion !== PHASE23_MANIFEST_VERSION || manifest.environment !== 'DEV' || manifest.maxTargets !== 3 || manifest.maxObservationContexts !== 6 || manifest.frozen !== true) invalid('HEADER');
  if (!SHA_RE.test(manifest.nightwatchSha) || !MANIFEST_DIGEST_RE.test(manifest.manifestId) || !MANIFEST_DIGEST_RE.test(manifest.deterministicDigest)) invalid('IDENTITY');
  validateQualityGate(manifest.qualityGate, manifest.nightwatchSha);
  if (JSON.stringify(manifest.privacyRules) !== JSON.stringify(PRIVACY_RULES)) invalid('PRIVACY_RULES');
  if (!Array.isArray(manifest.targets) || manifest.targets.length < 1 || manifest.targets.length > 3 || manifest.targets.length * 2 > 6) invalid('TARGET_BOUND');
  const ids = new Set<string>();
  for (const target of manifest.targets) {
    validateTarget(target);
    if (ids.has(target.targetId)) invalid('DUPLICATE_TARGET');
    ids.add(target.targetId);
  }
  if (!Array.isArray(manifest.exclusions) || manifest.exclusions.some((exclusion) => !SAFE_ID_RE.test(exclusion.targetId) || !SAFE_ID_RE.test(exclusion.reasonCode))) invalid('EXCLUSIONS');
  const core = coreOf(manifest);
  if (manifest.manifestId !== digest(core, 'manifest:sha256:')) invalid('MANIFEST_ID_DIGEST');
  if (manifest.deterministicDigest !== digest({ ...core, manifestId: manifest.manifestId }, 'manifest:sha256:')) invalid('MANIFEST_DIGEST');
}

export function simulatePhase23DevAcceptance(manifest: Phase23Manifest): Phase23DryRunReceipt {
  validatePhase23Manifest(manifest);
  const targetCount = manifest.targets.length;
  const core = {
    schemaVersion: PHASE23_DRY_RUN_VERSION,
    manifestId: manifest.manifestId,
    manifestDigest: manifest.deterministicDigest,
    targetCount,
    firstPlanCount: targetCount,
    replayPlanCount: targetCount,
    totalContexts: targetCount * 2,
    externalContactCount: 0 as const,
    mutationCount: 0 as const,
    rawPersistenceCount: 0 as const,
    privacyPassed: true as const,
    containmentPassed: true as const,
    result: 'PASS' as const,
  };
  return { ...core, deterministicDigest: digest(core, 'dry-run:sha256:') };
}
