// ---------------------------------------------------------------------------
// Nightwatch sanitized anomaly clustering and duplicate suppression.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import {
  ANOMALY_CLUSTER_VERSION,
  type AnomalyCluster,
  type AnomalyObservation,
  type SanitizedAnomalyObservation,
  type StableAnomalyFeatures,
} from './types';

const SAFE_CLASS_RE = /^[A-Za-z0-9_.:/-]{1,160}$/;
const FINGERPRINT_RE = /^fp:sha256:[a-f0-9]{12,64}$/i;
const RUN_ID_RE = /^[A-Za-z0-9_.-]{1,160}$/;
const FORBIDDEN_VALUE_RE = /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}

function digest(value: unknown): string {
  return crypto.createHash('sha256').update(stableJson(value), 'utf8').digest('hex').slice(0, 24);
}

function safeClass(value: string | null, field: string): string | null {
  if (value === null) return null;
  if (!SAFE_CLASS_RE.test(value) || FORBIDDEN_VALUE_RE.test(value)) throw new Error(`CLUSTER_FEATURE_UNSAFE:${field}`);
  return value;
}

function sanitizeFeatures(features: StableAnomalyFeatures): StableAnomalyFeatures {
  return {
    journeyId: safeClass(features.journeyId, 'journeyId'),
    envelopeId: safeClass(features.envelopeId, 'envelopeId'),
    oracleId: safeClass(features.oracleId, 'oracleId') ?? 'UNKNOWN_ORACLE',
    routeClass: safeClass(features.routeClass, 'routeClass'),
    operationFamily: safeClass(features.operationFamily, 'operationFamily'),
    statusClass: safeClass(features.statusClass, 'statusClass'),
    contentTypeClass: safeClass(features.contentTypeClass, 'contentTypeClass'),
    runtimeCategory: safeClass(features.runtimeCategory, 'runtimeCategory'),
    structuralState: safeClass(features.structuralState, 'structuralState'),
    failureActionId: safeClass(features.failureActionId, 'failureActionId'),
    sourceImpactRegion: safeClass(features.sourceImpactRegion, 'sourceImpactRegion'),
    browserApiResultClass: safeClass(features.browserApiResultClass, 'browserApiResultClass'),
  };
}

function clusterKey(fingerprint: string, features: StableAnomalyFeatures, timingClass: AnomalyObservation['timingClass']): string {
  if (!FINGERPRINT_RE.test(fingerprint)) throw new Error('CLUSTER_FINGERPRINT_INVALID');
  // Bounded timing is deliberately excluded. A genuinely transient class is
  // retained so a short-lived resource symptom does not merge with a stable
  // product anomaly merely because the other dimensions happen to match.
  return `cluster-key:sha256:${digest({ schemaVersion: ANOMALY_CLUSTER_VERSION, fingerprint, features, transient: timingClass === 'TRANSIENT' })}`;
}

export function sanitizeAnomalyObservation(input: AnomalyObservation): SanitizedAnomalyObservation {
  if (!RUN_ID_RE.test(input.runId)) throw new Error('CLUSTER_RUN_ID_INVALID');
  if (Number.isNaN(Date.parse(input.observedAt))) throw new Error('CLUSTER_TIMESTAMP_INVALID');
  if (!['SOURCE_CURRENT_LOCALLY', 'LOCAL_TRACKING_REF_ONLY', 'REMOTE_FRESHNESS_CONFIRMED', 'UNKNOWN'].includes(input.sourceFreshness)) throw new Error('CLUSTER_SOURCE_FRESHNESS_INVALID');
  const features = sanitizeFeatures(input.features);
  return {
    ...input,
    features,
    clusterKey: clusterKey(input.fingerprint, features, input.timingClass),
  };
}

export function clusterAnomalies(observations: readonly AnomalyObservation[]): readonly AnomalyCluster[] {
  const sanitized = observations.map(sanitizeAnomalyObservation);
  const buckets = new Map<string, SanitizedAnomalyObservation[]>();
  for (const observation of sanitized) {
    const bucket = buckets.get(observation.clusterKey) ?? [];
    bucket.push(observation);
    buckets.set(observation.clusterKey, bucket);
  }
  return [...buckets.entries()].map(([key, items]) => {
    const ordered = [...items].sort((a, b) => a.runId.localeCompare(b.runId) || a.observedAt.localeCompare(b.observedAt));
    const first = [...items].sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.runId.localeCompare(b.runId))[0]!;
    const last = [...items].sort((a, b) => b.observedAt.localeCompare(a.observedAt) || b.runId.localeCompare(a.runId))[0]!;
    const primary = [...items].sort((a, b) => Number(b.reproduced) - Number(a.reproduced) || Number(b.minimized) - Number(a.minimized) || a.runId.localeCompare(b.runId))[0]!;
    const timing: AnomalyCluster['timingVariance'] = items.some((item) => item.timingClass === 'TRANSIENT')
      ? 'TRANSIENT'
      : items.some((item) => item.timingClass === 'BOUNDED') ? 'BOUNDED' : 'NONE';
    const known = [...new Set(items.map((item) => item.knownFalsePositiveId).filter((value): value is string => value !== undefined))].sort()[0];
    return {
      clusterId: `cluster:sha256:${digest({ schemaVersion: ANOMALY_CLUSTER_VERSION, key })}`,
      clusterKey: key,
      fingerprint: primary.fingerprint,
      features: primary.features,
      occurrenceCount: items.length,
      reproductionCount: items.filter((item) => item.reproduced).length,
      runIds: ordered.map((item) => item.runId),
      firstObserved: first.observedAt,
      lastObserved: last.observedAt,
      timingVariance: timing,
      primaryRunId: primary.runId,
      ...(known === undefined ? {} : { knownFalsePositiveId: known }),
    };
  }).sort((a, b) => a.clusterId.localeCompare(b.clusterId));
}

/** One primary per stable cluster; occurrence IDs remain bounded metadata. */
export function suppressDuplicateClusters(clusters: readonly AnomalyCluster[], maxOccurrences = 100): readonly AnomalyCluster[] {
  if (!Number.isInteger(maxOccurrences) || maxOccurrences < 1) throw new Error('CLUSTER_RETENTION_INVALID');
  return clusters.map((cluster) => ({
    ...cluster,
    runIds: cluster.runIds.slice(0, maxOccurrences),
    occurrenceCount: Math.min(cluster.occurrenceCount, maxOccurrences),
  }));
}
