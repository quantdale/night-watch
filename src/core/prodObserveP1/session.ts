// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — the P1 passive observation session.
//
// The session is what attaches AFTER admission allowed. It is deliberately
// capability-poor: it consumes bounded observation events from an injected
// source, classifies each request, watches the kill switch and the deadline,
// and terminates. It cannot navigate, reload, click, type, submit, fetch,
// dispatch, replay, promote, or create authenticated state — not because it
// chooses not to, but because this cone imports no module that can do those
// things (proven by `checkP1ObservationScopeBoundary`, not by this comment).
//
// Three independent bounds make "run forever" structurally impossible:
// the admission deadline (monotonic), an event budget, and a poll budget.
// Every bound is injected, so stalled-observer and expiry behavior are
// deterministic in tests without fake timers.
//
// An attach binds exactly one admission to exactly one subject nonce. A
// second attach on the same admission throws; an attach past the deadline
// throws; an attach with a mismatched nonce throws. Interrupted state cannot
// resume on stale authority: there is no resume path at all.
//
// The session returns attributed evidence DTOs to its caller. It never writes
// files, never touches the network, and never projects raw values: projection
// through the production-cone privacy policy and persistence through the
// evidence firewall are the caller's steps, gated by `P1_PRIVACY_CAPABILITY`
// and `P1_EVIDENCE_DESTINATION` before this session ever existed.
// ---------------------------------------------------------------------------

import {
  classifyObservedRequest,
  classifyP1Session,
  isP1SessionPass,
  tallyAttribution,
  type AttributedRequest,
  type ObservedRequestEvidence,
  type P1SessionAttributionTally,
} from './attribution';
import { evaluateP1KillSwitch, type P1KillSwitchProbe } from './killSwitch';
import type { P1AdmissionOutcome } from './observer';
import type { P1SessionOutcome } from './types';

/** Bounded event source, injected. The mock subject fixture implements this locally. */
export interface P1ObservationEventSource {
  /**
   * Return the events observed since the previous poll at `nowMs`.
   * `sourceEnded` reports that the subject produced its final event.
   */
  readonly poll: (nowMs: number) => { readonly events: readonly ObservedRequestEvidence[]; readonly sourceEnded: boolean };
}

export interface P1SessionBounds {
  /** Maximum events classified in one session. Exceeding it terminates, never truncates silently. */
  readonly maxEvents: number;
  /** Maximum polls in one session. Exceeding it terminates, so a stalled source cannot spin forever. */
  readonly maxPolls: number;
}

export type P1SessionTermination =
  | 'SOURCE_ENDED'
  | 'OBSERVATION_WINDOW_EXPIRED'
  | 'KILL_SWITCH_ENGAGED'
  | 'EVENT_BUDGET_EXHAUSTED'
  | 'POLL_BUDGET_EXHAUSTED'
  | 'NIGHTWATCH_ATTRIBUTABLE_REQUEST_ABORT';

export interface P1AttachRequest {
  readonly admission: P1AdmissionOutcome;
  /** Must equal the admission's admitted subject nonce. */
  readonly subjectNonce: string;
  readonly source: P1ObservationEventSource;
  readonly bounds: P1SessionBounds;
  readonly killSwitchProbe: P1KillSwitchProbe | null;
  /** Injected clock, advanced by the caller between polls. */
  readonly clock: { readonly nowMs: () => number };
}

export interface P1SessionResult {
  readonly termination: P1SessionTermination;
  readonly verdict: P1SessionOutcome;
  /** True only for a PASS verdict that ran to a natural end (never killed, never budget-cut). */
  readonly completedCleanly: boolean;
  readonly tally: P1SessionAttributionTally;
  readonly attributed: readonly AttributedRequest[];
  readonly pollsUsed: number;
  /**
   * The origin identity of the first Nightwatch-attributable request, present
   * only when the session aborted because of one. Opaque local accounting id,
   * never a customer value.
   */
  readonly attributionAbortRequestId: string | null;
  /**
   * Whether the session's evidence may be used for PASSIVE acceptance. A
   * Nightwatch-attributable request marks it `INVALID_FOR_ACCEPTANCE` before
   * any other classification matters.
   */
  readonly acceptanceEvidence: 'VALID_FOR_ACCEPTANCE' | 'INVALID_FOR_ACCEPTANCE';
}

// Module-private. An admission binds exactly one attach; a second attach on
// the same admission object throws, so interrupted state cannot resume on
// stale authority and a consumed admission cannot fan out into two sessions.
// A Set (not a WeakSet) so the test reset below really clears it.
const attachedAdmissions = new Set<object>();

export function attachP1ObservationSession(request: P1AttachRequest): P1SessionResult {
  const admission = request.admission;
  if (!admission.allowed) throw new Error('P1_SESSION_ADMISSION_DENIED');
  if (attachedAdmissions.has(admission)) throw new Error('P1_SESSION_ADMISSION_ALREADY_ATTACHED');
  if (request.subjectNonce === '' || request.subjectNonce !== admission.admittedSubjectNonce) {
    throw new Error('P1_SESSION_SUBJECT_MISMATCH');
  }
  if (admission.observationDeadlineMs === null) throw new Error('P1_SESSION_DEADLINE_ABSENT');
  if (
    typeof request.bounds.maxEvents !== 'number' ||
    typeof request.bounds.maxPolls !== 'number' ||
    !Number.isFinite(request.bounds.maxEvents) ||
    !Number.isFinite(request.bounds.maxPolls) ||
    request.bounds.maxEvents <= 0 ||
    request.bounds.maxPolls <= 0
  ) {
    throw new Error('P1_SESSION_BOUNDS_INVALID');
  }
  if (evaluateP1KillSwitch(request.killSwitchProbe) === 'ENGAGED') {
    throw new Error('P1_SESSION_KILL_SWITCH_ENGAGED_AT_ATTACH');
  }
  if (request.clock.nowMs() >= admission.observationDeadlineMs) {
    throw new Error('P1_SESSION_WINDOW_ALREADY_EXPIRED');
  }
  attachedAdmissions.add(admission);

  const attributed: AttributedRequest[] = [];
  let pollsUsed = 0;
  let termination: P1SessionTermination | null = null;
  let attributionAbortRequestId: string | null = null;

  for (;;) {
    if (evaluateP1KillSwitch(request.killSwitchProbe) === 'ENGAGED') {
      termination = 'KILL_SWITCH_ENGAGED';
      break;
    }
    const nowMs = request.clock.nowMs();
    if (nowMs >= admission.observationDeadlineMs) {
      termination = 'OBSERVATION_WINDOW_EXPIRED';
      break;
    }
    if (pollsUsed >= request.bounds.maxPolls) {
      termination = 'POLL_BUDGET_EXHAUSTED';
      break;
    }
    const poll = request.source.poll(nowMs);
    pollsUsed += 1;
    for (const event of poll.events) {
      if (attributed.length >= request.bounds.maxEvents) {
        termination = 'EVENT_BUDGET_EXHAUSTED';
        break;
      }
      const classified = classifyObservedRequest(event);
      attributed.push(classified);
      if (classified.attribution === 'NIGHTWATCH_ATTRIBUTABLE') {
        // The request-accounting proof: the session ABORTS on the first
        // attributable request, records its origin, and marks its evidence
        // invalid for acceptance. It does not keep observing and report the
        // count at the end, because evidence gathered after Nightwatch caused
        // traffic is no longer passive evidence.
        attributionAbortRequestId = classified.requestId;
        termination = 'NIGHTWATCH_ATTRIBUTABLE_REQUEST_ABORT';
        break;
      }
    }
    if (termination !== null) break;
    if (poll.sourceEnded) {
      termination = 'SOURCE_ENDED';
      break;
    }
  }

  const frozen = Object.freeze(attributed);
  const tally = tallyAttribution(frozen);
  const verdict = classifyP1Session({
    subjectAttached: true,
    windowEmpty: termination === 'OBSERVATION_WINDOW_EXPIRED' && frozen.length === 0,
    tally,
  });
  const pass = isP1SessionPass(verdict);
  return {
    termination: termination ?? 'SOURCE_ENDED',
    verdict,
    completedCleanly:
      pass && (termination === 'SOURCE_ENDED' || termination === 'OBSERVATION_WINDOW_EXPIRED'),
    tally,
    attributed: frozen,
    pollsUsed,
    attributionAbortRequestId,
    acceptanceEvidence: tally.nightwatchAttributable > 0 ? 'INVALID_FOR_ACCEPTANCE' : 'VALID_FOR_ACCEPTANCE',
  };
}

/**
 * TEST ONLY. Resets the attach-once set between isolated test cases.
 * NOT A PRODUCTION AUTHORITY PATH.
 */
export function clearP1SessionAttachStateForTest(): void {
  attachedAdmissions.clear();
}
