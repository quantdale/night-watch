// ---------------------------------------------------------------------------
// Nightwatch MA-8 / F-13 — mechanical network-attribution for P1 (UA-8
// resolution).
//
// The future C-12 requirement is not `network traffic == 0`. It is
// `Nightwatch-attributable requests == 0`, with every relevant request
// accounted for. Traffic emitted by the application while Nightwatch watches
// is NOT automatically evidence Nightwatch caused it; conversely, traffic
// must not be classified as non-Nightwatch merely because it avoided
// Nightwatch's explicit request builder. Causality is decided here, per
// observed request, from mechanical evidence — never from timestamps alone,
// and never by disappearance: anything without sufficient provenance is
// `UNKNOWN`, and `UNKNOWN` fails closed.
//
// Evidence model. Each observed request carries:
//   - `observedAfterAttach`: whether the event stream saw it after attach;
//   - `preAttachProof`: whether independent evidence shows it predates attach
//     (in-flight request, established connection, replayed log entry);
//   - `nightwatchCausalLink`: whether a post-attach Nightwatch action
//     (navigation, fetch/XHR, click/type/submit, scripted trigger) caused it;
//   - `initiator`: event-stream initiator metadata, or null when absent.
//
// Decision table:
//   nightwatchCausalLink            → NIGHTWATCH_ATTRIBUTABLE (dominates all)
//   else preAttachProof             → OPERATOR_PREEXISTING
//   else initiator known, no link   → APPLICATION_AUTONOMOUS
//   else                            → UNKNOWN
//
// A Nightwatch causal link dominates even pre-attach existence: re-triggering
// an existing stream is still Nightwatch-attributable traffic.
// ---------------------------------------------------------------------------

import type { P1AttributionClass, P1SessionOutcome } from './types';

export interface ObservedRequestEvidence {
  /** Stable local identifier for accounting (sequence number, stream id). Never a customer value. */
  readonly requestId: string;
  readonly observedAfterAttach: boolean;
  readonly preAttachProof: boolean;
  readonly nightwatchCausalLink: boolean;
  /** Initiator metadata from the event stream, or null when the stream carries none. */
  readonly initiator: string | null;
}

export interface AttributedRequest {
  readonly requestId: string;
  readonly attribution: P1AttributionClass;
}

export function classifyObservedRequest(evidence: ObservedRequestEvidence): AttributedRequest {
  if (evidence.nightwatchCausalLink) {
    return { requestId: evidence.requestId, attribution: 'NIGHTWATCH_ATTRIBUTABLE' };
  }
  if (evidence.preAttachProof) {
    return { requestId: evidence.requestId, attribution: 'OPERATOR_PREEXISTING' };
  }
  if (
    evidence.observedAfterAttach &&
    typeof evidence.initiator === 'string' &&
    evidence.initiator !== ''
  ) {
    return { requestId: evidence.requestId, attribution: 'APPLICATION_AUTONOMOUS' };
  }
  return { requestId: evidence.requestId, attribution: 'UNKNOWN' };
}

export interface P1SessionAttributionTally {
  readonly total: number;
  readonly operatorPreexisting: number;
  readonly applicationAutonomous: number;
  readonly nightwatchAttributable: number;
  readonly unknown: number;
}

export function tallyAttribution(attributed: readonly AttributedRequest[]): P1SessionAttributionTally {
  let operatorPreexisting = 0;
  let applicationAutonomous = 0;
  let nightwatchAttributable = 0;
  let unknown = 0;
  for (const request of attributed) {
    switch (request.attribution) {
      case 'OPERATOR_PREEXISTING':
        operatorPreexisting += 1;
        break;
      case 'APPLICATION_AUTONOMOUS':
        applicationAutonomous += 1;
        break;
      case 'NIGHTWATCH_ATTRIBUTABLE':
        nightwatchAttributable += 1;
        break;
      case 'UNKNOWN':
        unknown += 1;
        break;
      default: {
        // Fail closed on an unknown class: unaccounted traffic must not
        // disappear from the denominator by taking an unhandled path.
        const unreachable: never = request.attribution;
        throw new Error(`P1_ATTRIBUTION_CLASS_UNHANDLED:${String(unreachable)}`);
      }
    }
  }
  return {
    total: attributed.length,
    operatorPreexisting,
    applicationAutonomous,
    nightwatchAttributable,
    unknown,
  };
}

export interface P1SessionVerdictInput {
  /** True when admission produced an attached subject; false when there was nothing to observe. */
  readonly subjectAttached: boolean;
  /** True when the observation window closed with no qualifying observation. */
  readonly windowEmpty: boolean;
  readonly tally: P1SessionAttributionTally;
}

/**
 * Terminal session classification (§10). Exactly one outcome is a PASS, and
 * it requires a real attached subject, a non-empty window, at least one
 * accounted request, zero Nightwatch-attributable traffic, and zero unknown
 * traffic. Zero samples never pass.
 */
export function classifyP1Session(input: P1SessionVerdictInput): P1SessionOutcome {
  if (!input.subjectAttached) return 'NO_SUBJECT';
  if (input.tally.nightwatchAttributable > 0) return 'NIGHTWATCH_TRAFFIC_DETECTED';
  if (input.tally.unknown > 0) return 'ATTRIBUTION_UNKNOWN';
  if (input.windowEmpty || input.tally.total === 0) {
    return input.windowEmpty ? 'OBSERVATION_WINDOW_EMPTY' : 'NO_QUALIFYING_OBSERVATION';
  }
  return 'PASSIVE_OBSERVATION_COMPLETE';
}

/** True only for the single passing outcome. */
export function isP1SessionPass(outcome: P1SessionOutcome): boolean {
  return outcome === 'PASSIVE_OBSERVATION_COMPLETE';
}
