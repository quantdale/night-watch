// ---------------------------------------------------------------------------
// Nightwatch Phase 15P (A11) — strict standalone validator for the campaign
// reproduction-record artifact.
//
// The record shape lives in `campaign/types.ts` (`CampaignReproductionRecord`)
// and was previously validated only inline inside the checkpoint reference
// ledger (`campaign/checkpoint.ts`, not exported). This validator composes the
// same shared runtime primitives (`campaign/runtimeValidation.ts`) and mirrors
// the checkpoint's field/coherence rules so a standalone persisted queue entry
// cannot bypass them; referential integrity runs only when the caller supplies
// ledger id sets via the facade context.
//
// Read-only and pure: no fs/network/child-process/DB/AI authority.
// ---------------------------------------------------------------------------

import type { CampaignReproductionRecord } from '../campaign/types';
import {
  assertEnum,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  isRuntimeRecord,
  requireRuntimeRecord,
  safeErrorDetail,
  type RuntimeRecord,
} from '../campaign/runtimeValidation';

const REPRODUCTION_KEYS = ['clusterId', 'representativeRunId', 'state', 'result', 'admissionLevel', 'reasonCode', 'runId', 'safety', 'privacy'] as const;

const REPRODUCTION_STATES = ['PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'BLOCKED', 'REPLAY_REQUIRED'] as const;
const REPRODUCTION_RESULTS = ['REPRODUCED', 'NOT_REPRODUCED', 'INVALID', 'SAFETY_BLOCKED', 'RUNTIME_FAILURE'] as const;
const ADMISSION_LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'] as const;
const PRIVACY_RESULTS = ['PASS', 'BLOCKED'] as const;

const SAFETY_KEYS = ['productionAttempts', 'proxyViolations', 'unknownDestinations', 'unknownApprovals', 'productMutations', 'actionCausedUnknown', 'databaseQueries', 'infrastructureQueries', 'externalPublicationAttempts'] as const;
const PRIVACY_COUNTER_KEYS = ['rawBodiesPersisted', 'customerValuesPersisted', 'credentialsPersisted', 'cookiesPersisted', 'tokensPersisted', 'domPersisted', 'screenshotsPersisted', 'authenticatedTracesPersisted'] as const;

function invalid(reason: string): never {
  throw new Error(`ARTIFACT_REPRODUCTION_INVALID:${reason}`);
}

/** Exact safety-vector shape shared by every campaign artifact. */
export function validateCampaignSafetyVectorShape(value: unknown, code: string): void {
  const safety = requireRuntimeRecord(value, code);
  assertExactKeys(safety, SAFETY_KEYS, code);
  for (const key of SAFETY_KEYS) assertNonNegativeInteger(safety[key], `${code}:${key}`);
}

/** Exact privacy-status shape; PASS must carry all-zero persistence counters
 *  (same coherence rule as the checkpoint and morning-brief validators). */
export function validateCampaignPrivacyStatusShape(value: unknown, code: string): void {
  const privacy = requireRuntimeRecord(value, code);
  assertExactKeys(privacy, ['result', ...PRIVACY_COUNTER_KEYS], code);
  assertEnum(privacy.result, PRIVACY_RESULTS, `${code}:RESULT`);
  for (const key of PRIVACY_COUNTER_KEYS) assertNonNegativeInteger(privacy[key], `${code}:${key}`);
  if (privacy.result === 'PASS' && PRIVACY_COUNTER_KEYS.some((key) => privacy[key] !== 0)) invalid('PRIVACY_PASS_WITH_PERSISTED_COUNTERS');
}

/**
 * Strict validation of one reproduction record. Throws
 * ARTIFACT_REPRODUCTION_INVALID:* on any violation.
 *
 * `knownClusterIds` / `knownObservationRunIds` (when provided) enforce the
 * checkpoint's referential-integrity rules for standalone queue entries.
 */
export function validateReproductionRecordArtifact(
  value: unknown,
  context: { readonly knownClusterIds?: readonly string[]; readonly knownObservationRunIds?: readonly string[] } = {},
): void {
  if (!isRuntimeRecord(value)) invalid('OBJECT_REQUIRED');
  const record = requireRuntimeRecord(value, 'ARTIFACT_REPRODUCTION_INVALID');
  assertExactKeys(record, REPRODUCTION_KEYS, 'ARTIFACT_REPRODUCTION_INVALID');
  assertString(record.clusterId, 'ARTIFACT_REPRODUCTION_INVALID:CLUSTER_ID');
  assertString(record.representativeRunId, 'ARTIFACT_REPRODUCTION_INVALID:REPRESENTATIVE_RUN_ID');
  assertEnum(record.state, REPRODUCTION_STATES, 'ARTIFACT_REPRODUCTION_INVALID:STATE');
  if (record.result !== null) assertEnum(record.result, REPRODUCTION_RESULTS, 'ARTIFACT_REPRODUCTION_INVALID:RESULT');
  assertEnum(record.admissionLevel, ADMISSION_LEVELS, 'ARTIFACT_REPRODUCTION_INVALID:ADMISSION_LEVEL');
  if (record.reasonCode !== null) assertString(record.reasonCode, 'ARTIFACT_REPRODUCTION_INVALID:REASON_CODE');
  if (record.runId !== null) assertString(record.runId, 'ARTIFACT_REPRODUCTION_INVALID:RUN_ID');
  validateCampaignSafetyVectorShape(record.safety, 'ARTIFACT_REPRODUCTION_INVALID:SAFETY');
  validateCampaignPrivacyStatusShape(record.privacy, 'ARTIFACT_REPRODUCTION_INVALID:PRIVACY');

  // Same coherence rule as the checkpoint reference ledger: unfinished states
  // never carry a terminal result.
  if ((record.state === 'PENDING' || record.state === 'RUNNING' || record.state === 'REPLAY_REQUIRED') && record.result !== null) {
    invalid('UNFINISHED_STATE_WITH_RESULT');
  }
  // A terminal COMPLETED record must say what happened.
  if (record.state === 'COMPLETED' && record.result === null) invalid('COMPLETED_WITHOUT_RESULT');

  if (context.knownClusterIds !== undefined && !context.knownClusterIds.includes(record.clusterId)) {
    // Referential failures echo only a bounded categorical projection of the
    // rejected id — the raw value is caller-supplied and never trusted.
    invalid(`UNKNOWN_CLUSTER:${safeErrorDetail(record.clusterId)}`);
  }
  if (context.knownObservationRunIds !== undefined) {
    if (!context.knownObservationRunIds.includes(record.representativeRunId)) {
      invalid(`UNKNOWN_REPRESENTATIVE_OBSERVATION:${safeErrorDetail(record.representativeRunId)}`);
    }
    if (record.runId !== null && !context.knownObservationRunIds.includes(record.runId)) {
      invalid(`UNKNOWN_RUN:${safeErrorDetail(record.runId)}`);
    }
  }
}

export type { CampaignReproductionRecord };
