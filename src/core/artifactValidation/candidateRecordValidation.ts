// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11 round 2) — strict validator for the campaign
// candidate-record artifact: one campaign bug-candidate id bound to its
// lifecycle progression record.
//
// COMPOSITION, NOT FORKING:
// - The embedded lifecycle record is validated VERBATIM by
//   campaign/candidateLifecycle.validateCandidateLifecycleRecord — the single
//   strict authority for CandidateLifecycleRecord (exact keys, version,
//   variant/state enums, transitionCount, reason-code pattern + sentinel
//   screen). This is the same contract the campaign checkpoint's Session-2
//   `candidateLifecycles` ledger enforces through its module-local mirror.
// - Referential integrity mirrors the checkpoint ledger rules and runs only
//   when the caller supplies id sets via the facade context
//   (`knownClusterIds`, `knownBugCandidateIds`), exactly like the checkpoint's
//   UNKNOWN_LIFECYCLE_CLUSTER / bugCandidates membership checks.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority. Inputs are
// never mutated or repaired.
// ---------------------------------------------------------------------------

import { validateCandidateLifecycleRecord, type CandidateLifecycleRecord } from '../campaign/candidateLifecycle';
import {
  assertExactKeys,
  isRuntimeRecord,
  requireRuntimeRecord,
  safeErrorDetail,
} from '../campaign/runtimeValidation';

/**
 * Version of the wrapper shape itself. The embedded lifecycle record carries
 * its own version constant (CANDIDATE_LIFECYCLE_VERSION) and stays the
 * authority for its own acceptance.
 */
export const CAMPAIGN_CANDIDATE_RECORD_VERSION = 'nightwatch.campaign-candidate-record.private.v1' as const;

/** Durable binding of one campaign bug-candidate id to its lifecycle record. */
export interface CampaignCandidateRecord {
  readonly schemaVersion: typeof CAMPAIGN_CANDIDATE_RECORD_VERSION;
  /** Campaign bug-candidate id (checkpoint `bugCandidates` ledger idiom). */
  readonly candidateId: string;
  /** Owning anomaly-cluster id once clustered; null before clustering. */
  readonly clusterId: string | null;
  /** Strict lifecycle progression record (validated by the owning module). */
  readonly lifecycle: CandidateLifecycleRecord;
}

const CANDIDATE_RECORD_KEYS = ['schemaVersion', 'candidateId', 'clusterId', 'lifecycle'] as const;

// Checkpoint idiom for ledger ids: non-empty bounded string, no charset fork
// (see checkpoint.ts "There is no dedicated cluster-id regex anywhere...").
const ID_MAX_LENGTH = 200;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_CANDIDATE_RECORD_INVALID:${reason}`);
}

function assertBoundedId(value: unknown, code: string): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > ID_MAX_LENGTH) invalid(code);
}

/**
 * Strict validation of one persisted candidate record. Throws
 * ARTIFACT_CANDIDATE_RECORD_INVALID:* on any violation.
 *
 * `knownClusterIds` / `knownBugCandidateIds` (when provided) enforce the
 * checkpoint's referential-integrity rules for standalone records.
 */
export function validateCampaignCandidateRecordArtifact(
  value: unknown,
  context: { readonly knownClusterIds?: readonly string[]; readonly knownBugCandidateIds?: readonly string[] } = {},
): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const record = requireRuntimeRecord(value, 'ARTIFACT_CANDIDATE_RECORD_INVALID');
  assertExactKeys(record, CANDIDATE_RECORD_KEYS, 'ARTIFACT_CANDIDATE_RECORD_INVALID');
  if (record.schemaVersion !== CAMPAIGN_CANDIDATE_RECORD_VERSION) invalid('SCHEMA_VERSION_UNSUPPORTED');
  assertBoundedId(record.candidateId, 'CANDIDATE_ID');
  if (record.clusterId !== null) assertBoundedId(record.clusterId, 'CLUSTER_ID');

  // Compose the owning module's strict lifecycle validator verbatim; it owns
  // every rule about the embedded progression record, including the
  // reason-code pattern and sentinel screening.
  try {
    validateCandidateLifecycleRecord(record.lifecycle);
  } catch (error) {
    invalid(`LIFECYCLE:${error instanceof Error ? error.message : 'REJECTED'}`);
  }

  if (
    context.knownClusterIds !== undefined &&
    // assertBoundedId above already rejected any non-string non-null clusterId;
    // the typeof guard narrows the RuntimeRecord value for includes().
    typeof record.clusterId === 'string' &&
    !context.knownClusterIds.includes(record.clusterId)
  ) {
    // Referential failures echo only a bounded categorical projection of the
    // rejected id — the raw value is caller-supplied and never trusted.
    invalid(`UNKNOWN_CLUSTER:${safeErrorDetail(record.clusterId)}`);
  }
  if (context.knownBugCandidateIds !== undefined && !context.knownBugCandidateIds.includes(record.candidateId as string)) {
    invalid(`UNKNOWN_BUG_CANDIDATE:${safeErrorDetail(record.candidateId)}`);
  }
}
