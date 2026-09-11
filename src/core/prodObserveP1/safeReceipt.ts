// ---------------------------------------------------------------------------
// Nightwatch C-12 readiness — safe passive-observation receipt.
//
// The passive session is where a raw production value would be most likely to
// leak into evidence, because an arbitrary internal error carries whatever the
// failing code put in its message. This module makes the leak structurally
// impossible:
//
//   - the receipt carries only categorical fields, bounded counts, and an
//     injected digest over those fields;
//   - an internal error is reduced to a bounded ERROR CLASS taken from a fixed
//     allowlist, never the message, stack, or any fragment of either;
//   - no value-derived digest is computed anywhere: nothing hashes the error
//     text, the event payload, or an observed value.
//
// The guarded runner is a thin wrapper, not a second session implementation:
// it drives the real `attachP1ObservationSession` and converts both outcomes
// into the same safe receipt shape.
// ---------------------------------------------------------------------------

import { attachP1ObservationSession, type P1AttachRequest, type P1SessionResult } from './session';
import type { P1SessionOutcome } from './types';

export const P1_SAFE_OBSERVATION_RECEIPT_VERSION = 'nightwatch.p1-safe-observation-receipt.v1' as const;

export const P1_RECEIPT_OUTCOMES = [
  'NO_SUBJECT',
  'NO_QUALIFYING_OBSERVATION',
  'ATTRIBUTION_UNKNOWN',
  'NIGHTWATCH_TRAFFIC_DETECTED',
  'OBSERVATION_WINDOW_EMPTY',
  'PASSIVE_OBSERVATION_COMPLETE',
  'INTERNAL_ERROR',
] as const;
export type P1ReceiptOutcome = (typeof P1_RECEIPT_OUTCOMES)[number];

export const P1_RECEIPT_ACCEPTANCE_EVIDENCE = [
  'VALID_FOR_ACCEPTANCE',
  'INVALID_FOR_ACCEPTANCE',
  'NOT_APPLICABLE',
] as const;
export type P1ReceiptAcceptanceEvidence = (typeof P1_RECEIPT_ACCEPTANCE_EVIDENCE)[number];

/**
 * The bounded error classes the receipt may carry. Extraction accepts a token
 * ONLY when it is one of these; anything else becomes
 * `P1_INTERNAL_ERROR_UNCLASSIFIED`. A message like
 * `boom <customer value>` therefore contributes nothing.
 */
export const P1_RECEIPT_ERROR_CLASSES = [
  'P1_SESSION_ADMISSION_DENIED',
  'P1_SESSION_ADMISSION_ALREADY_ATTACHED',
  'P1_SESSION_SUBJECT_MISMATCH',
  'P1_SESSION_DEADLINE_ABSENT',
  'P1_SESSION_BOUNDS_INVALID',
  'P1_SESSION_KILL_SWITCH_ENGAGED_AT_ATTACH',
  'P1_SESSION_WINDOW_ALREADY_EXPIRED',
  'P1_ATTRIBUTION_CLASS_UNHANDLED',
  'P1_INTERNAL_ERROR_UNCLASSIFIED',
] as const;
export type P1ReceiptErrorClass = (typeof P1_RECEIPT_ERROR_CLASSES)[number];

const ERROR_CLASS_SET: ReadonlySet<string> = new Set(P1_RECEIPT_ERROR_CLASSES);

export interface P1SafeObservationReceipt {
  readonly schemaVersion: typeof P1_SAFE_OBSERVATION_RECEIPT_VERSION;
  readonly outcome: P1ReceiptOutcome;
  readonly termination: string;
  readonly completedCleanly: boolean;
  readonly acceptanceEvidence: P1ReceiptAcceptanceEvidence;
  readonly attributableRequestAborted: boolean;
  readonly requestCounts: {
    readonly total: number;
    readonly operatorPreexisting: number;
    readonly applicationAutonomous: number;
    readonly nightwatchAttributable: number;
    readonly unknown: number;
  };
  readonly errorClass: P1ReceiptErrorClass | null;
  readonly receiptDigest: string;
}

export type P1SafeObservationReceiptDraft = Omit<P1SafeObservationReceipt, 'receiptDigest'>;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}

export function sealP1SafeObservationReceipt(
  draft: P1SafeObservationReceiptDraft,
  digest: (canonical: string) => string,
): P1SafeObservationReceipt {
  return Object.freeze({ ...draft, receiptDigest: `p1receipt:${digest(canonical(draft))}` });
}

/** Reduce any thrown value to a bounded class; never copies message text. */
export function classifyP1InternalError(error: unknown): P1ReceiptErrorClass {
  const message = error instanceof Error ? error.message : '';
  const match = /^(P1_[A-Z0-9_]+?)(?::|$)/.exec(message);
  const token = match === null ? null : match[1] ?? null;
  if (token !== null && ERROR_CLASS_SET.has(token)) return token as P1ReceiptErrorClass;
  return 'P1_INTERNAL_ERROR_UNCLASSIFIED';
}

/**
 * A safe `INTERNAL_ERROR` receipt. Every field is a constant, a count (zero),
 * or a bounded class; the thrown value is never serialized and no digest is
 * taken over it.
 */
export function internalErrorReceipt(
  error: unknown,
  digest: (canonical: string) => string,
): P1SafeObservationReceipt {
  return sealP1SafeObservationReceipt(
    {
      schemaVersion: P1_SAFE_OBSERVATION_RECEIPT_VERSION,
      outcome: 'INTERNAL_ERROR',
      termination: 'INTERNAL_ERROR',
      completedCleanly: false,
      acceptanceEvidence: 'NOT_APPLICABLE',
      attributableRequestAborted: false,
      requestCounts: {
        total: 0,
        operatorPreexisting: 0,
        applicationAutonomous: 0,
        nightwatchAttributable: 0,
        unknown: 0,
      },
      errorClass: classifyP1InternalError(error),
    },
    digest,
  );
}

export function receiptForP1SessionResult(
  result: P1SessionResult,
  digest: (canonical: string) => string,
): P1SafeObservationReceipt {
  return sealP1SafeObservationReceipt(
    {
      schemaVersion: P1_SAFE_OBSERVATION_RECEIPT_VERSION,
      outcome: result.verdict as P1SessionOutcome,
      termination: result.termination,
      completedCleanly: result.completedCleanly,
      acceptanceEvidence: result.acceptanceEvidence,
      attributableRequestAborted: result.attributionAbortRequestId !== null,
      requestCounts: {
        total: result.tally.total,
        operatorPreexisting: result.tally.operatorPreexisting,
        applicationAutonomous: result.tally.applicationAutonomous,
        nightwatchAttributable: result.tally.nightwatchAttributable,
        unknown: result.tally.unknown,
      },
      errorClass: null,
    },
    digest,
  );
}

export type P1GuardedSessionResult =
  | { readonly ok: true; readonly result: P1SessionResult; readonly receipt: P1SafeObservationReceipt }
  | { readonly ok: false; readonly receipt: P1SafeObservationReceipt };

/**
 * Drive the real session and always produce a safe receipt. An error thrown by
 * the session (including one thrown by an injected event source) becomes an
 * `INTERNAL_ERROR` receipt rather than propagating the message.
 */
export function runP1ObservationSessionGuarded(
  request: P1AttachRequest,
  digest: (canonical: string) => string,
): P1GuardedSessionResult {
  try {
    const result = attachP1ObservationSession(request);
    return { ok: true, result, receipt: receiptForP1SessionResult(result, digest) };
  } catch (error) {
    return { ok: false, receipt: internalErrorReceipt(error, digest) };
  }
}
