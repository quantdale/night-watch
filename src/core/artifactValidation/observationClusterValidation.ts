// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — strict validators for triage observation and
// anomaly-cluster artifacts.
//
// Neither format had a standalone validator: `triage/clustering.ts` only
// *produces* sanitized observations and clusters. These validators compose
// that module's logic instead of forking it:
// - observations are re-run through `sanitizeAnomalyObservation` (run-id,
//   timestamp, freshness, fingerprint, and feature-safety checks) and a
//   persisted `clusterKey` must equal the module-derived value;
// - clusters re-derive `clusterKey` and `clusterId` through the same
//   canonical-digest identity (`prefixedDigest24` over the module's exact
//   payload) so tampered or hand-invented clusters fail closed.
//
// Read-only: inputs are never mutated (the sanitizer returns a new object).
// Pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import { sanitizeAnomalyObservation } from '../triage/clustering';
import { ANOMALY_CLUSTER_VERSION, type AnomalyCluster, type AnomalyObservation, type StableAnomalyFeatures } from '../triage/types';
import { prefixedDigest24 } from '../identity/canonicalDigest';
import {
  assertBoolean,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  assertUniqueStrings,
  isRuntimeRecord,
  requireRuntimeArray,
  requireRuntimeRecord,
  type RuntimeRecord,
} from '../campaign/runtimeValidation';

const OBSERVATION_REQUIRED_KEYS = ['runId', 'observedAt', 'fingerprint', 'features', 'reproduced', 'minimized', 'sourceFreshness'] as const;
const OBSERVATION_OPTIONAL_KEYS = ['timingClass', 'knownFalsePositiveId', 'clusterKey'] as const;

export const STABLE_FEATURE_KEYS = [
  'journeyId', 'envelopeId', 'oracleId', 'routeClass', 'operationFamily',
  'statusClass', 'contentTypeClass', 'runtimeCategory', 'structuralState',
  'failureActionId', 'sourceImpactRegion', 'browserApiResultClass',
] as const;

const TIMING_CLASSES = ['NONE', 'BOUNDED', 'TRANSIENT'] as const;
const SOURCE_FRESHNESS_VALUES = ['SOURCE_CURRENT_LOCALLY', 'LOCAL_TRACKING_REF_ONLY', 'REMOTE_FRESHNESS_CONFIRMED', 'UNKNOWN'] as const;

// Same idiom as triage/clustering.ts (module constants are not exported).
const FINGERPRINT_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const RUN_ID_RE = /^[A-Za-z0-9_.-]{1,160}$/;
const SAFE_CLASS_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const CLUSTER_ID_RE = /^cluster:sha256:[0-9a-f]{24}$/;
const CLUSTER_KEY_RE = /^cluster-key:sha256:[0-9a-f]{24}$/;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_OBSERVATION_INVALID:${reason}`);
}

function nullableSafeFeature(value: unknown, key: string): void {
  if (value === null) return;
  if (typeof value !== 'string' || value.length === 0 || !SAFE_CLASS_RE.test(value)) {
    invalid(`FEATURE_UNSAFE:${key}`);
  }
}

/** Exact-key, per-field shape check for StableAnomalyFeatures (all twelve
 *  fields required; every value a safe class string or null). */
export function validateStableAnomalyFeaturesShape(value: unknown): asserts value is StableAnomalyFeatures {
  const features = requireRuntimeRecord(value, 'ARTIFACT_OBSERVATION_INVALID:FEATURES_OBJECT_REQUIRED');
  assertExactKeys(features, STABLE_FEATURE_KEYS, 'ARTIFACT_OBSERVATION_INVALID');
  for (const key of STABLE_FEATURE_KEYS) nullableSafeFeature(features[key], key);
}

/** Strict standalone validation of one anomaly observation. Accepts the plain
 *  v1 shape and the sanitized shape; when `clusterKey` is present it must be
 *  exactly the value `sanitizeAnomalyObservation` derives. Throws
 *  ARTIFACT_OBSERVATION_INVALID:* on any violation. */
export function validateAnomalyObservationArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const observation = value as RuntimeRecord;
  assertExactKeys(observation, OBSERVATION_REQUIRED_KEYS, 'ARTIFACT_OBSERVATION_INVALID', OBSERVATION_OPTIONAL_KEYS);
  assertString(observation.runId, 'ARTIFACT_OBSERVATION_INVALID:RUN_ID');
  assertString(observation.observedAt, 'ARTIFACT_OBSERVATION_INVALID:OBSERVED_AT');
  assertString(observation.fingerprint, 'ARTIFACT_OBSERVATION_INVALID:FINGERPRINT');
  assertBoolean(observation.reproduced, 'ARTIFACT_OBSERVATION_INVALID:REPRODUCED');
  assertBoolean(observation.minimized, 'ARTIFACT_OBSERVATION_INVALID:MINIMIZED');
  if (observation.timingClass !== undefined && (typeof observation.timingClass !== 'string' || !(TIMING_CLASSES as readonly string[]).includes(observation.timingClass))) {
    invalid('TIMING_CLASS');
  }
  if (observation.knownFalsePositiveId !== undefined) {
    if (typeof observation.knownFalsePositiveId !== 'string' || !SAFE_CLASS_RE.test(observation.knownFalsePositiveId)) {
      invalid('KNOWN_FALSE_POSITIVE_ID');
    }
  }
  if (!(SOURCE_FRESHNESS_VALUES as readonly string[]).includes(observation.sourceFreshness as string)) invalid('SOURCE_FRESHNESS');
  validateStableAnomalyFeaturesShape(observation.features);

  // Compose the producing module's semantic checks (fingerprint pattern,
  // parseable timestamp, run-id pattern, feature sentinel safety).
  let sanitized;
  try {
    sanitized = sanitizeAnomalyObservation(observation as unknown as AnomalyObservation);
  } catch (error) {
    invalid(error instanceof Error ? error.message : 'SANITIZATION_FAILED');
  }
  if (observation.clusterKey !== undefined) {
    assertString(observation.clusterKey, 'ARTIFACT_OBSERVATION_INVALID:CLUSTER_KEY');
    if (observation.clusterKey !== sanitized.clusterKey) invalid('CLUSTER_KEY_MISMATCH');
  }
}

const CLUSTER_REQUIRED_KEYS = ['clusterId', 'clusterKey', 'fingerprint', 'features', 'occurrenceCount', 'reproductionCount', 'runIds', 'firstObserved', 'lastObserved', 'timingVariance', 'primaryRunId'] as const;
const CLUSTER_OPTIONAL_KEYS = ['knownFalsePositiveId'] as const;

function clusterInvalid(reason: string): never {
  throw new Error(`ARTIFACT_CLUSTER_INVALID:${reason}`);
}

/** Strict standalone validation of one persisted anomaly cluster (v1).
 *  Beyond shape and cross-field coherence, both identities re-derive:
 *  clusterKey from {schemaVersion, fingerprint, features, transient} and
 *  clusterId from {schemaVersion, key}, exactly as triage/clustering.ts
 *  builds them. Throws ARTIFACT_CLUSTER_INVALID:* on any violation. */
export function validateAnomalyClusterArtifact(value: unknown): void {
  if (!isRuntimeRecord(value)) clusterInvalid('OBJECT_REQUIRED');
  const cluster = value as RuntimeRecord;
  assertExactKeys(cluster, CLUSTER_REQUIRED_KEYS, 'ARTIFACT_CLUSTER_INVALID', CLUSTER_OPTIONAL_KEYS);
  assertString(cluster.clusterId, 'ARTIFACT_CLUSTER_INVALID:CLUSTER_ID');
  assertString(cluster.clusterKey, 'ARTIFACT_CLUSTER_INVALID:CLUSTER_KEY');
  assertString(cluster.fingerprint, 'ARTIFACT_CLUSTER_INVALID:FINGERPRINT');
  assertString(cluster.firstObserved, 'ARTIFACT_CLUSTER_INVALID:FIRST_OBSERVED');
  assertString(cluster.lastObserved, 'ARTIFACT_CLUSTER_INVALID:LAST_OBSERVED');
  assertString(cluster.primaryRunId, 'ARTIFACT_CLUSTER_INVALID:PRIMARY_RUN_ID');
  if (!CLUSTER_ID_RE.test(cluster.clusterId)) clusterInvalid('CLUSTER_ID_PATTERN');
  if (!CLUSTER_KEY_RE.test(cluster.clusterKey)) clusterInvalid('CLUSTER_KEY_PATTERN');
  if (!FINGERPRINT_RE.test(cluster.fingerprint)) clusterInvalid('FINGERPRINT_PATTERN');
  if (!RUN_ID_RE.test(cluster.primaryRunId)) clusterInvalid('PRIMARY_RUN_ID_PATTERN');
  if (Number.isNaN(Date.parse(cluster.firstObserved)) || Number.isNaN(Date.parse(cluster.lastObserved))) clusterInvalid('TIMESTAMP_INVALID');
  if (Date.parse(cluster.firstObserved) > Date.parse(cluster.lastObserved)) clusterInvalid('OBSERVATION_WINDOW_REVERSED');
  assertNonNegativeInteger(cluster.occurrenceCount, 'ARTIFACT_CLUSTER_INVALID:OCCURRENCE_COUNT');
  assertNonNegativeInteger(cluster.reproductionCount, 'ARTIFACT_CLUSTER_INVALID:REPRODUCTION_COUNT');
  if (!(TIMING_CLASSES as readonly string[]).includes(cluster.timingVariance as string)) clusterInvalid('TIMING_VARIANCE');
  if (cluster.reproductionCount > cluster.occurrenceCount) clusterInvalid('REPRODUCTIONS_EXCEED_OCCURRENCES');
  if (cluster.knownFalsePositiveId !== undefined) {
    if (typeof cluster.knownFalsePositiveId !== 'string' || !SAFE_CLASS_RE.test(cluster.knownFalsePositiveId)) {
      clusterInvalid('KNOWN_FALSE_POSITIVE_ID');
    }
  }
  const runIds = requireRuntimeArray(cluster.runIds, 'ARTIFACT_CLUSTER_INVALID:RUN_IDS');
  assertUniqueStrings(runIds, 'ARTIFACT_CLUSTER_INVALID:RUN_IDS');
  for (const runId of runIds) {
    assertString(runId, 'ARTIFACT_CLUSTER_INVALID:RUN_ID');
    if (!RUN_ID_RE.test(runId)) clusterInvalid('RUN_ID_PATTERN');
  }
  if (runIds.length !== cluster.occurrenceCount) clusterInvalid('OCCURRENCE_COUNT_MISMATCH');
  if (!runIds.includes(cluster.primaryRunId)) clusterInvalid('PRIMARY_RUN_NOT_IN_CLUSTER');
  validateStableAnomalyFeaturesShape(cluster.features);

  // Deterministic identity recomposition (same payload as clustering.ts).
  const expectedClusterKey = prefixedDigest24('cluster-key', {
    schemaVersion: ANOMALY_CLUSTER_VERSION,
    fingerprint: cluster.fingerprint,
    features: cluster.features,
    transient: cluster.timingVariance === 'TRANSIENT',
  });
  if (cluster.clusterKey !== expectedClusterKey) clusterInvalid('CLUSTER_KEY_MISMATCH');
  const expectedClusterId = prefixedDigest24('cluster', { schemaVersion: ANOMALY_CLUSTER_VERSION, key: cluster.clusterKey });
  if (cluster.clusterId !== expectedClusterId) clusterInvalid('CLUSTER_ID_MISMATCH');
}

/** Convenience: validate an array of clusters (order-independent). */
export function validateAnomalyClusterArtifacts(values: readonly unknown[]): void {
  requireRuntimeArray(values, 'ARTIFACT_CLUSTER_INVALID:ARRAY_REQUIRED').forEach((value) => validateAnomalyClusterArtifact(value));
}

// Re-exported for facade typing convenience.
export type { AnomalyCluster, AnomalyObservation };
