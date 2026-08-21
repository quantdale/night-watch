// ---------------------------------------------------------------------------
// Nightwatch Phase 15 — shared executor-outcome normalization.
//
// Single source of truth for the exact-vs-reduced outcome rule: a FAILURE
// whose anomaly fingerprint differs from the target fingerprint is never the
// target anomaly, so it is downgraded to a PASS outcome before any consumer
// (replay binding V2 and the deterministic minimizer) classifies it. Both
// consumers import this one implementation instead of restating the rule.
// Data-only and pure: no browser, network, filesystem, child-process, DB,
// or AI authority.
// ---------------------------------------------------------------------------

import type { CandidateReplayOutcome } from './types';

export function normalizeExecutorOutcome(result: CandidateReplayOutcome, targetFingerprint: string): CandidateReplayOutcome {
  // Exact fingerprint equality is load-bearing: a different fingerprint is
  // not reproduced, and must not be observable as a target FAILURE.
  if (result.status === 'FAILURE' && result.anomalyFingerprint !== undefined && result.anomalyFingerprint !== targetFingerprint) {
    return { status: 'PASS', safety: result.safety, routeClass: result.routeClass };
  }
  return result;
}
