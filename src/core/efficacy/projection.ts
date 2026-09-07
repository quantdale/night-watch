// ---------------------------------------------------------------------------
// W7 request projection for honest before/after efficacy measurement.
//
// The W8 baseline is NOT a different investigator and NOT a different corpus:
// it is the same investigator policy, the same substrate and the same commit,
// given exactly the reasoner-visible request surface that W7 shipped. That
// surface is frozen here as data so a test can prove the projection is
// faithful rather than a convenient subset.
//
// Pure data. No I/O.
// ---------------------------------------------------------------------------

import type { ReasonerTurnRequest } from '../agentProtocol/reasoner';

/** Exact `ReasonerTurnRequest` key set shipped by W7. */
export const W7_REQUEST_FIELDS: readonly string[] = Object.freeze([
  'schemaVersion',
  'campaignId',
  'turnId',
  'observation',
  'budgetRemaining',
]);

/** Exact `ReasonerObservation` key set shipped by W7. */
export const W7_OBSERVATION_FIELDS: readonly string[] = Object.freeze([
  'phase',
  'untrusted',
  'evidenceRefs',
  'allowedToolIds',
  'allowedIntentKinds',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Project a live request down to the W7 field set. Extra observation fields
 * (W8 working memory and anything added later) are dropped, so a baseline run
 * cannot accidentally consume post-W7 state.
 */
export function projectRequestToW7(request: ReasonerTurnRequest): ReasonerTurnRequest {
  const raw = request as unknown as Record<string, unknown>;
  const observationRaw = isRecord(raw['observation']) ? (raw['observation'] as Record<string, unknown>) : {};
  const observation: Record<string, unknown> = {};
  for (const field of W7_OBSERVATION_FIELDS) {
    if (field in observationRaw) observation[field] = observationRaw[field];
  }
  const projected: Record<string, unknown> = {};
  for (const field of W7_REQUEST_FIELDS) {
    if (field === 'observation') {
      projected[field] = observation;
      continue;
    }
    if (field in raw) projected[field] = raw[field];
  }
  return projected as unknown as ReasonerTurnRequest;
}
