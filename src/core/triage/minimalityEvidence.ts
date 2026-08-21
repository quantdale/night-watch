// ---------------------------------------------------------------------------
// Minimality evidence DTO (Phase 15P mass-implementation lane A07).
//
// Makes the EVIDENCE behind a minimality claim explicit and portable instead
// of implicit in the minimizer result: which replay path produced each
// survivor-deletion disposition, whether at least one genuine reduction was
// attempted before any claim, and what the replay budget actually funded.
//
// Structural guarantees:
//   - proven-minimality markers REQUIRE evidenceClass MINIMALITY_PROVEN,
//     reductionAttempted, exercisedReducedReplayCount >= 1 and at least one
//     REDUCED-path disposition — zero-reduction / zero-candidate paths can
//     never construct them;
//   - NO_REDUCIBLE_CANDIDATE-class evidence can never carry those markers;
//   - every disposition names the exact probe outcome class, keeping PASS /
//     FAILURE / INVALID / PRECONDITION_DIVERGENCE / UNSUPPORTED / NOT_REDUCED
//     distinct (never conflated into one bucket).
//
// Pure module — no fs/network/process/env/Date/random authority.
// ---------------------------------------------------------------------------

import { FAILURE_MINIMIZATION_VERSION, type MinimizationResult } from './types';
import { prefixedDigest24, sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';

export const MINIMALITY_EVIDENCE_VERSION = 'nightwatch.minimality-evidence.private.v1' as const;

/** Distinct probe outcome classes — never conflated. */
export type MinimalityProbeOutcome =
  | 'PASS'
  | 'FAILURE'
  | 'INVALID'
  | 'PRECONDITION_DIVERGENCE'
  | 'UNSUPPORTED'
  | 'NOT_REDUCED';

const MINIMALITY_PROBE_OUTCOMES: readonly MinimalityProbeOutcome[] = Object.freeze([
  'PASS',
  'FAILURE',
  'INVALID',
  'PRECONDITION_DIVERGENCE',
  'UNSUPPORTED',
  'NOT_REDUCED',
]);

/** Which bound-replay path produced a disposition. */
export type MinimalityReplayPath = 'EXACT' | 'REDUCED';

export interface MinimalityDeletionDisposition {
  readonly actionId: string;
  readonly probeOutcome: MinimalityProbeOutcome;
  readonly replayPath: MinimalityReplayPath;
}

export interface MinimalityBudgetConsumption {
  readonly dimension: string;
  readonly offered: number;
  readonly consumed: number;
}

export interface MinimalityEvidence {
  readonly schemaVersion: typeof MINIMALITY_EVIDENCE_VERSION;
  /** Verbatim reductionEvidenceClass from the minimizer result. */
  readonly evidenceClass: MinimizationResult['reductionEvidenceClass'];
  readonly failureMinimizationVersion: typeof FAILURE_MINIMIZATION_VERSION;
  /** At least one genuine reduced candidate was attempted before any claim. */
  readonly reductionAttempted: boolean;
  /** Completed REDUCED-path executor invocations (invocation ledger truth). */
  readonly exercisedReducedReplayCount: number;
  readonly survivorDeletions: readonly MinimalityDeletionDisposition[];
  readonly budget: readonly MinimalityBudgetConsumption[];
  readonly survivorIdentityDigest: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Map one candidate-evaluation disposition (+ reason) onto the explicit probe
 * outcome vocabulary. PRECONDITION_DIVERGENCE is distinguished from generic
 * INVALID by the recorded reason; budget-skipped candidates are NOT_REDUCED.
 */
export function probeOutcomeFromDisposition(disposition: MinimizationResult['candidateEvaluations'][number]['disposition'], reason: string): MinimalityProbeOutcome {
  switch (disposition) {
    case 'REPRODUCES':
      return 'PASS';
    case 'DOES_NOT_REPRODUCE':
      return 'FAILURE';
    case 'INVALID':
      return reason === 'PRECONDITION_DIVERGENCE' ? 'PRECONDITION_DIVERGENCE' : 'INVALID';
    case 'NOT_EVALUATED_BUDGET':
      return 'NOT_REDUCED';
    default:
      return 'UNSUPPORTED';
  }
}

export class MinimalityEvidenceError extends Error {}

function evidenceError(reason: string): never {
  throw new MinimalityEvidenceError(`MINIMALITY_EVIDENCE_INVALID:${reason}`);
}

/**
 * The ONE coherent constructor. Proven-minimality markers are structurally
 * impossible unless the evidence class is MINIMALITY_PROVEN with a genuine
 * attempted-and-exercised reduction behind it.
 */
export function buildMinimalityEvidenceDto(fields: {
  readonly evidenceClass: MinimizationResult['reductionEvidenceClass'];
  readonly reductionAttempted: boolean;
  readonly exercisedReducedReplayCount: number;
  readonly survivorDeletions: readonly MinimalityDeletionDisposition[];
  readonly budget: readonly MinimalityBudgetConsumption[];
  readonly survivorActionIds: readonly string[];
}): MinimalityEvidence {
  if (typeof fields.evidenceClass !== 'string') evidenceError('EVIDENCE_CLASS_REQUIRED');
  for (const deletion of fields.survivorDeletions) {
    if (!isRecord(deletion as unknown) || typeof deletion.actionId !== 'string' || deletion.actionId.length === 0) {
      evidenceError('DELETION_ACTION_ID_REQUIRED');
    }
    if (!MINIMALITY_PROBE_OUTCOMES.includes(deletion.probeOutcome)) evidenceError('PROBE_OUTCOME_UNKNOWN');
    if (deletion.replayPath !== 'EXACT' && deletion.replayPath !== 'REDUCED') evidenceError('REPLAY_PATH_UNKNOWN');
  }
  for (const entry of fields.budget) {
    if (!isRecord(entry as unknown) || typeof entry.dimension !== 'string' || entry.dimension.length === 0) {
      evidenceError('BUDGET_DIMENSION_REQUIRED');
    }
    if (!isBoundedInt(entry.offered) || !isBoundedInt(entry.consumed) || entry.consumed > entry.offered) {
      evidenceError('BUDGET_ACCOUNTING_INCOHERENT');
    }
  }
  if (!isBoundedInt(fields.exercisedReducedReplayCount)) evidenceError('EXERCISED_COUNT_INVALID');

  const provenMarkersPresent = fields.reductionAttempted &&
    fields.exercisedReducedReplayCount >= 1 &&
    fields.survivorDeletions.some((deletion) => deletion.replayPath === 'REDUCED');
  if ((fields.evidenceClass === 'MINIMALITY_PROVEN') !== provenMarkersPresent) {
    evidenceError(`PROVEN_MARKERS_MISMATCH_CLASS:${fields.evidenceClass}`);
  }
  if (fields.evidenceClass === 'MINIMALITY_PROVEN' && fields.exercisedReducedReplayCount < 1) {
    // Redundant with the marker check above; kept as defense in depth so a
    // zero-reduction path can never back a proven claim even if the marker
    // logic is later refactored.
    evidenceError('ZERO_REDUCTION_CANNOT_BE_PROVEN');
  }

  return Object.freeze({
    schemaVersion: MINIMALITY_EVIDENCE_VERSION,
    evidenceClass: fields.evidenceClass,
    failureMinimizationVersion: FAILURE_MINIMIZATION_VERSION,
    reductionAttempted: fields.reductionAttempted,
    exercisedReducedReplayCount: fields.exercisedReducedReplayCount,
    survivorDeletions: Object.freeze(fields.survivorDeletions.map((deletion) => Object.freeze({ ...deletion }))),
    budget: Object.freeze(fields.budget.map((entry) => Object.freeze({ ...entry }))),
    survivorIdentityDigest: prefixedDigest24('mne', sha256Hex(stableJsonSorted([...fields.survivorActionIds]))),
  });
}

/** Strict parser — rejects malformed/tampered evidence before downstream use. */
export function parseMinimalityEvidence(value: unknown): MinimalityEvidence {
  if (!isRecord(value)) evidenceError('PAYLOAD_NOT_RECORD');
  if (value.schemaVersion !== MINIMALITY_EVIDENCE_VERSION) evidenceError('SCHEMA_VERSION_UNKNOWN');
  if (value.failureMinimizationVersion !== FAILURE_MINIMIZATION_VERSION) evidenceError('FAILURE_MINIMIZATION_VERSION_UNKNOWN');
  const rebuilt = buildMinimalityEvidenceDto({
    evidenceClass: value.evidenceClass as MinimizationResult['reductionEvidenceClass'],
    reductionAttempted: value.reductionAttempted as boolean,
    exercisedReducedReplayCount: value.exercisedReducedReplayCount as number,
    survivorDeletions: (value.survivorDeletions ?? []) as readonly MinimalityDeletionDisposition[],
    budget: (value.budget ?? []) as readonly MinimalityBudgetConsumption[],
    survivorActionIds: [],
  });
  if (typeof value.survivorIdentityDigest !== 'string' || value.survivorIdentityDigest.length === 0) {
    evidenceError('SURVIVOR_DIGEST_REQUIRED');
  }
  return Object.freeze({
    ...rebuilt,
    // The digest is preserved verbatim on parse (the raw survivor ids are not
    // part of the durable payload); construction recomputes it from ids.
    survivorIdentityDigest: value.survivorIdentityDigest,
  });
}
