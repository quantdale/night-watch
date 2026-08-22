// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (parallel agent A14) — cross-phase adversarial
// corpus architecture: synthetic payload builders for the highest-value
// families.
//
// Small pure builders that REUSE the existing corpus/phase15p fixtures and
// the owning src seams they wrap: candidate lifecycle transitions,
// sanitized anomaly clustering, source-contract movement observations,
// unified vocabulary adapters, artifact-kind payloads, and project snapshot
// deltas. Every value is a synthetic structural fake: no credentials, no
// customer data, no wall-clock timestamps beyond ARCHITECTURE_STATIC_NOW,
// no fs/network/environment access. Builders never randomize; calling one
// twice yields deep-equal results.
//
// EXECUTION IS DEFERRED: these builders only CONSTRUCT inputs/expected
// shapes for later adversarial execution in the dedicated hardening
// campaign. They invoke no executor, launcher, or matrix runner.
//
// Companion modules:
//   corpus/phase15p/adversarialFixtures.ts        (reused fixture builders)
//   corpus/phase15p/adversarialScenarioCatalog.ts (wave scenario classes)
//   src/core/adversarialCorpus/registry.ts         (cross-phase definitions)
// ---------------------------------------------------------------------------

import {
  SOURCE_SHA_A,
  SOURCE_SHA_B,
  EVIDENCE_A,
  movementObservation,
  compatibleAnalysisPair,
  breakingAnalysisPair,
  snapshotInputFixture,
  explorationPlanFixture,
} from '../adversarialFixtures';
import {
  initialLifecycleRecord,
  transitionCandidateLifecycle,
} from '../../../src/core/campaign/candidateLifecycle';
import type {
  CandidateLifecycleEvent,
  CandidateLifecycleRecord,
  CandidateLifecycleVariant,
} from '../../../src/core/campaign/candidateLifecycle';
import type { CampaignVersionFingerprint } from '../../../src/core/campaign/types';
import { sanitizeAnomalyObservation, clusterAnomalies } from '../../../src/core/triage/clustering';
import type { AnomalyCluster, AnomalyObservation, StableAnomalyFeatures } from '../../../src/core/triage/types';
import {
  classifySourceContractMovement,
  unifiedFromMovementClass,
} from '../../../src/oracles/expectations/lifecycle/sourceContractMovement';
import type {
  SourceContractMovementClass,
  SourceContractObservation,
} from '../../../src/oracles/expectations/lifecycle/sourceContractMovement';
import {
  unifiedFromSemanticReceiptOutcome,
} from '../../../src/oracles/expectations/lifecycle/semanticVocabulary';
import type { UnifiedContractResult } from '../../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import type { SemanticReceiptOutcome } from '../../../src/oracles/semantic/receipts';
import { buildProjectSnapshot, compareProjectSnapshots } from '../../../src/core/projectSnapshot';
import type { ProjectSnapshotDiff, ProjectSnapshotManifest } from '../../../src/core/projectSnapshot/types';
import type { ArtifactKind } from '../../../src/core/artifactValidation/types';

/** Fixed timestamp satisfying timestamp parsers; never the wall clock. */
export const ARCHITECTURE_STATIC_NOW = '2026-01-01T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Candidate lifecycle transitions (families P7 / P12).
//
// Phase 15H note: CANDIDATE_LIFECYCLE_STATES now includes the Phase-15P A05
// CLUSTERED state between MINIMIZED and TRIAGED. The happy-path event
// sequence below uses the still-legal direct MINIMIZED -> COMPLETE_TRIAGE
// edge; clustering-stage coverage lives in clusteredObservationPayload()
// via the real clustering seam.
// ---------------------------------------------------------------------------

const LIFECYCLE_HAPPY_PATH_EVENTS: readonly CandidateLifecycleEvent[] = Object.freeze([
  'ADMIT',
  'CONFIRM_REPRODUCTION',
  'APPLY_MINIMIZATION',
  'COMPLETE_TRIAGE',
  'MARK_DOSSIER_READY',
]);

export interface LifecycleTransitionCase {
  readonly variant: CandidateLifecycleVariant;
  readonly events: readonly CandidateLifecycleEvent[];
  /** Initial record plus one record per applied event, in order. */
  readonly records: readonly CandidateLifecycleRecord[];
}

/**
 * Fold a legal event sequence over a fresh PROTOCOL_ONLY record using the
 * real transition table. Illegal sequences fail closed through
 * transitionCandidateLifecycle exactly as production would.
 */
export function lifecycleTransitionSequence(
  events: readonly CandidateLifecycleEvent[] = LIFECYCLE_HAPPY_PATH_EVENTS,
  variant: CandidateLifecycleVariant = 'PROTOCOL_ONLY',
): LifecycleTransitionCase {
  const initial = initialLifecycleRecord(variant);
  const records: CandidateLifecycleRecord[] = [initial];
  let current: CandidateLifecycleRecord = initial;
  for (const event of events) {
    current = transitionCandidateLifecycle(current, event);
    records.push(current);
  }
  return Object.freeze({ variant, events: Object.freeze([...events]), records: Object.freeze(records) });
}

// ---------------------------------------------------------------------------
// Sanitized anomaly clustering — the pipeline's CLUSTERED artifacts
// (families P13 / P15).
// ---------------------------------------------------------------------------

const ARCHITECTURE_CLUSTER_FEATURES: StableAnomalyFeatures = Object.freeze({
  journeyId: 'phase15p.architecture.journey',
  envelopeId: null,
  oracleId: 'PROTOCOL_ORACLE',
  routeClass: '/payer-exchange-rate-v2',
  operationFamily: 'READ_ONLY_JOURNEY',
  statusClass: 'HTTP_5XX',
  contentTypeClass: 'APPLICATION_JSON',
  runtimeCategory: 'BROWSER_API_DIVERGENCE',
  structuralState: null,
  failureActionId: 'p4.j1.vendor-local.aws',
  sourceImpactRegion: null,
  browserApiResultClass: 'UI_FAILURE_API_PASS',
});

function architectureAnomalyObservation(runIndex: number): AnomalyObservation {
  return {
    runId: `phase15p-architecture-run-${runIndex}`,
    observedAt: ARCHITECTURE_STATIC_NOW,
    fingerprint: `fp:sha256:${'ca'.repeat(12)}`,
    features: ARCHITECTURE_CLUSTER_FEATURES,
    timingClass: 'NONE' as const,
    reproduced: runIndex > 0,
    minimized: false,
    sourceFreshness: 'SOURCE_CURRENT_LOCALLY' as const,
  };
}

export interface ClusteredObservationPayload {
  readonly observations: readonly ReturnType<typeof sanitizeAnomalyObservation>[];
  readonly clusters: readonly AnomalyCluster[];
}

/**
 * Build N sanitized observations sharing one fingerprint and cluster them
 * through the real clustering seam, producing genuine AnomalyCluster
 * payloads (cluster ids/keys are digests of the fixed inputs).
 */
export function clusteredObservationPayload(occurrenceCount = 3): ClusteredObservationPayload {
  if (!Number.isInteger(occurrenceCount) || occurrenceCount < 1 || occurrenceCount > 16) {
    throw new Error('ARCHITECTURE_BUILDER_INVALID_OCCURRENCE_COUNT');
  }
  const observations = Array.from({ length: occurrenceCount }, (_, index) =>
    sanitizeAnomalyObservation(architectureAnomalyObservation(index)),
  );
  return Object.freeze({ observations: Object.freeze(observations), clusters: clusterAnomalies(observations) });
}

// ---------------------------------------------------------------------------
// Source-contract movement observations (families P9A / P10B / P14).
// ---------------------------------------------------------------------------

export type MovementPairKind = 'SEMANTICALLY_STABLE' | 'EVIDENCE_DRIFTED_COMPATIBLE' | 'EVIDENCE_DRIFTED_BREAKING';

export interface MovementPairCase {
  readonly kind: MovementPairKind;
  readonly expectedMovementClass: SourceContractMovementClass;
  readonly previous: SourceContractObservation;
  readonly current: SourceContractObservation;
}

/**
 * Build a previous/current observation pair over a moved SHA with a fixed
 * expected movement class: identical evidence across the move is stable;
 * superset/broken fact evolution reuses the existing analyzer pair fixtures.
 */
export function movementObservationPair(kind: MovementPairKind): MovementPairCase {
  if (kind === 'SEMANTICALLY_STABLE') {
    return Object.freeze({
      kind,
      expectedMovementClass: 'SEMANTICALLY_STABLE' as const,
      previous: movementObservation({ sourceSha: SOURCE_SHA_A }),
      current: movementObservation({ sourceSha: SOURCE_SHA_B, evidenceDigest: EVIDENCE_A }),
    });
  }
  const pair = kind === 'EVIDENCE_DRIFTED_COMPATIBLE' ? compatibleAnalysisPair() : breakingAnalysisPair();
  return Object.freeze({
    kind,
    expectedMovementClass: kind,
    previous: movementObservation({ analysis: pair.previous }),
    current: movementObservation({ analysis: pair.current }),
  });
}

export interface ClassifiedMovementCase extends MovementPairCase {
  readonly classification: ReturnType<typeof classifySourceContractMovement>;
}

/** movementObservationPair plus its real classification (pure comparator). */
export function classifiedMovementPair(kind: MovementPairKind): ClassifiedMovementCase {
  const pair = movementObservationPair(kind);
  const classification = classifySourceContractMovement({ previous: pair.previous, current: pair.current });
  return Object.freeze({ ...pair, classification });
}

// ---------------------------------------------------------------------------
// Unified vocabulary adapters (families P9B / P11A / P12).
// ---------------------------------------------------------------------------

const NEVER_PASS_RECEIPT_OUTCOMES: readonly SemanticReceiptOutcome[] = Object.freeze([
  'NO_EXPECTATION',
  'EXPECTATION_SOURCE_STALE',
  'EXPECTATION_SOURCE_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

const SAMPLE_MOVEMENT_CLASSES: readonly SourceContractMovementClass[] = Object.freeze([
  'SEMANTICALLY_STABLE',
  'EVIDENCE_DRIFTED_COMPATIBLE',
  'SOURCE_STALE',
]);

export interface VocabularyAdapterSample {
  /** Never-PASS receipt outcomes mapped through the unified vocabulary. */
  readonly neverPassReceiptOutcomes: Readonly<Record<SemanticReceiptOutcome, UnifiedContractResult>>;
  /** Sample movement classes mapped through the unified vocabulary. */
  readonly movementClasses: Readonly<Record<SourceContractMovementClass, UnifiedContractResult>>;
}

/**
 * Map fixed receipt outcomes and movement classes through the converged
 * semantic-vocabulary adapters. Deterministic table lookups; no evaluation.
 */
export function vocabularyAdapterSample(): VocabularyAdapterSample {
  const neverPassReceiptOutcomes = {} as Record<SemanticReceiptOutcome, UnifiedContractResult>;
  for (const outcome of NEVER_PASS_RECEIPT_OUTCOMES) {
    neverPassReceiptOutcomes[outcome] = unifiedFromSemanticReceiptOutcome(outcome);
  }
  const movementClasses = {} as Record<SourceContractMovementClass, UnifiedContractResult>;
  for (const movementClass of SAMPLE_MOVEMENT_CLASSES) {
    movementClasses[movementClass] = unifiedFromMovementClass(movementClass);
  }
  return Object.freeze({
    neverPassReceiptOutcomes: Object.freeze(neverPassReceiptOutcomes),
    movementClasses: Object.freeze(movementClasses),
  });
}

// ---------------------------------------------------------------------------
// Artifact-kind payloads (families P13 / P15).
// ---------------------------------------------------------------------------

export interface ArtifactKindPayloads {
  /** Payload samples keyed by artifact kind; kinds without a proven-safe
   *  synthetic shape here are intentionally absent. */
  readonly payloads: Partial<Record<ArtifactKind, unknown>>;
}

/**
 * Representative synthetic payloads for the artifact kinds whose shapes this
 * corpus can construct truthfully today: a sanitized observation, its
 * cluster, and a v2 replay plan built by the existing fixture seam.
 */
export function artifactKindPayloads(): ArtifactKindPayloads {
  const clustered = clusteredObservationPayload(2);
  return Object.freeze({
    payloads: Object.freeze({
      observation: clustered.observations[0],
      cluster: clustered.clusters[0],
      'replay-plan': explorationPlanFixture(['p4.j1.vendor-local.aws', 'p4.j1.vendor-local.azure'], [0]),
    } as Partial<Record<ArtifactKind, unknown>>),
  });
}

// ---------------------------------------------------------------------------
// Project snapshot deltas (family P15P).
// ---------------------------------------------------------------------------

export interface SnapshotDeltaCase {
  readonly previous: ProjectSnapshotManifest;
  readonly current: ProjectSnapshotManifest;
  readonly diff: ProjectSnapshotDiff;
}

/**
 * Two manifests built from otherwise-identical snapshot inputs where only
 * one campaign fingerprint slot moved, compared with the real comparator.
 */
export function snapshotDeltaPair(): SnapshotDeltaCase {
  const baseVersions = { campaignSchemaVersion: 'nightwatch.campaign.private.v1' } as CampaignVersionFingerprint;
  const driftedVersions = {
    ...baseVersions,
    selectorVersion: 'nightwatch.synthetic.selectors.v2-drifted',
  } as CampaignVersionFingerprint;
  const previous = buildProjectSnapshot(snapshotInputFixture({ campaignVersions: baseVersions }));
  const current = buildProjectSnapshot(snapshotInputFixture({ campaignVersions: driftedVersions }));
  return Object.freeze({ previous, current, diff: compareProjectSnapshots(previous, current) });
}
