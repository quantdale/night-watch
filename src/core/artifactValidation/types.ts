// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — converged durable-artifact validation facade.
//
// One strict entry point, `validateArtifact(kind, value, context)`, for every
// durable private artifact format. Malformed or coherence-invalid data is
// REJECTED here before it can contaminate later triage/promotion stages.
//
// Contract:
// - READ-ONLY: inputs are never repaired and never mutated; the pure core has
//   no fs/network/child-process/DB/AI authority.
// - COMPOSITION, NOT FORKING: wherever a module-level validator exists it is
//   reused verbatim (campaign checkpoint, semantic receipts, replay plans,
//   dossiers v1/v2, morning brief, semantic source bundle). Formats without a
//   standalone validator (observations, clusters, reproduction records,
//   contract coverage reports) get strict validators HERE that compose over
//   the owning modules' types, digest helpers, and producers.
// - FAIL-CLOSED: unknown kinds are rejected; unknown fields are rejected
//   wherever the underlying frozen schema requires exact keys; contradictory
//   cross-field data is rejected even when each field is individually typed.
//
// Per-kind historical version acceptance (see ARTIFACT_KIND_VERSION_ACCEPTANCE):
// - campaign-checkpoint : nightwatch.campaign-checkpoint.private.v1
//     (with or without the optional Session-2 `candidateLifecycles` /
//     `runtimeContractVersions` fields — absent means a valid historical
//     pre-S2 checkpoint). Requires `context.manifest`.
// - observation         : unversioned triage AnomalyObservation v1 shape;
//     the sanitized form (extra verified `clusterKey`) is accepted when the
//     clusterKey re-derives exactly.
// - semantic-receipt    : nightwatch.semantic-evaluation-receipt.v1 AND .v2
//     (v1 must not carry the Phase-11 coverage fields).
// - replay-plan         : nightwatch.triage-replay-plan.private.v1 AND .v2
//     (dispatched on schemaVersion; both recompute their deterministic ids).
// - cluster             : nightwatch.anomaly-cluster.private.v1 (clusterId and
//     clusterKey must re-derive deterministically).
// - reproduction-record : unversioned campaign reproduction-record v1 shape
//     (the checkpoint-ledger record, validated standalone without ledger
//     referential context unless `context.knownClusterIds` /
//     `context.knownObservationRunIds` are supplied).
// - dossier             : nightwatch.bug-dossier.private.v1 (READY plus the
//     persisted INCOMPLETE stub) AND nightwatch.bug-dossier.private.v2
//     (READY/UNRESOLVED), dispatched on schemaVersion + status.
// - morning-brief       : nightwatch.campaign-morning-brief.private.v1.
// - source-bundle       : nightwatch.semantic-campaign-bundle.private.v1.
// - coverage-report     : nightwatch.contract-coverage-report.v1 (digest must
//     re-derive over the normalized report body).
// ---------------------------------------------------------------------------

import type { CampaignManifest } from '../campaign/types';

export const ARTIFACT_VALIDATION_FACADE_VERSION = 'nightwatch.artifact-validation.private.v1' as const;

/** Every durable private artifact kind this facade knows how to validate. */
export type ArtifactKind =
  | 'campaign-checkpoint'
  | 'observation'
  | 'semantic-receipt'
  | 'replay-plan'
  | 'cluster'
  | 'reproduction-record'
  | 'dossier'
  | 'morning-brief'
  | 'source-bundle'
  | 'coverage-report';

export const KNOWN_ARTIFACT_KINDS: readonly ArtifactKind[] = [
  'campaign-checkpoint',
  'observation',
  'semantic-receipt',
  'replay-plan',
  'cluster',
  'reproduction-record',
  'dossier',
  'morning-brief',
  'source-bundle',
  'coverage-report',
];

/**
 * Documented, per-kind historical version acceptance. Values marked
 * `shape:` are unversioned structural formats whose identity is the owning
 * module's current type; they carry no schemaVersion field of their own.
 */
export const ARTIFACT_KIND_VERSION_ACCEPTANCE: Readonly<Record<ArtifactKind, readonly string[]>> = Object.freeze({
  'campaign-checkpoint': ['nightwatch.campaign-checkpoint.private.v1'],
  'observation': ['shape:triage.anomaly-observation.v1', 'shape:triage.sanitized-anomaly-observation.v1'],
  'semantic-receipt': ['nightwatch.semantic-evaluation-receipt.v1', 'nightwatch.semantic-evaluation-receipt.v2'],
  'replay-plan': ['nightwatch.triage-replay-plan.private.v1', 'nightwatch.triage-replay-plan.private.v2'],
  'cluster': ['nightwatch.anomaly-cluster.private.v1'],
  'reproduction-record': ['shape:campaign.reproduction-record.v1'],
  'dossier': ['nightwatch.bug-dossier.private.v1', 'nightwatch.bug-dossier.private.v2'],
  'morning-brief': ['nightwatch.campaign-morning-brief.private.v1'],
  'source-bundle': ['nightwatch.semantic-campaign-bundle.private.v1'],
  'coverage-report': ['nightwatch.contract-coverage-report.v1'],
});

/** Optional referential context. Only `manifest` is required (and only for
 *  the campaign-checkpoint kind); ledger membership checks run only when the
 *  corresponding id sets are provided. */
export interface ArtifactValidationContext {
  /** Required for kind `campaign-checkpoint`; ignored elsewhere. */
  readonly manifest?: CampaignManifest;
  /** When provided, reproduction records must reference these clusters. */
  readonly knownClusterIds?: readonly string[];
  /** When provided, reproduction records must reference these observations. */
  readonly knownObservationRunIds?: readonly string[];
}

export type ArtifactValidationResult =
  | { readonly valid: true; readonly kind: ArtifactKind; readonly acceptedSchemaVersions: readonly string[] }
  | { readonly valid: false; readonly kind: string; readonly reason: string };
