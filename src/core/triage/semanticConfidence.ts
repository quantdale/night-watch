// ---------------------------------------------------------------------------
// Nightwatch Phase 12A — semantic-aware categorical confidence.
// Deterministic, no percentages, no learned scoring, no arbitrary weights.
// HIGH is blocked by partial/stale/unavailable/non-reproduced/safety/privacy/
// false-positive/missing-identity. Browser/API alone never HIGH.
// Pure: no browser/network/fs/child-process/DB/AI/selfDev.
// ---------------------------------------------------------------------------

import type { BrowserApiDifferential } from './types';
import type { SemanticTriageEvidence } from './semanticTriageEvidence';

export type SemanticConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export interface SemanticConfidenceInput {
  readonly evidence: SemanticTriageEvidence;
  readonly browserApiDifferential: BrowserApiDifferential['status'];
  readonly oracleReliable: boolean;
  readonly knownFalsePositive: boolean;
  readonly safetyClean: boolean;
  readonly privacyClean: boolean;
  readonly semanticIdentityPresent: boolean;
}

export interface SemanticConfidenceResult {
  readonly level: SemanticConfidenceLevel;
  readonly reasons: readonly string[];
  readonly blockers: readonly string[];
}

function blocker(reason: string): string { return reason; }

export function rankSemanticConfidence(input: SemanticConfidenceInput): SemanticConfidenceResult {
  const { evidence, oracleReliable, knownFalsePositive, safetyClean, privacyClean, semanticIdentityPresent, browserApiDifferential } = input;
  const blockers: string[] = [];
  const reasons: string[] = [];

  // Mandatory HIGH blockers (spec B5)
  if (evidence.semanticOutcome === 'PARTIAL_COVERAGE' || evidence.receiptOutcome === 'PARTIAL_COVERAGE' || evidence.coverageState === 'PARTIAL_COVERAGE_NO_VIOLATION') {
    blockers.push(blocker('PARTIAL_COVERAGE'));
  }
  if (evidence.receiptOutcome === 'NO_EXPECTATION' || evidence.semanticOutcome === 'NO_EXPECTATION' || evidence.semanticOutcome === 'EXPECTATION_UNAVAILABLE') {
    blockers.push(blocker('NO_EXPECTATION'));
  }
  if (evidence.sourceCurrentness === 'STALE' || evidence.receiptOutcome === 'EXPECTATION_SOURCE_STALE' || evidence.semanticOutcome === 'EXPECTATION_SOURCE_STALE') {
    blockers.push(blocker('EXPECTATION_SOURCE_STALE'));
  }
  if (evidence.sourceCurrentness === 'UNAVAILABLE' || evidence.receiptOutcome === 'EXPECTATION_SOURCE_UNAVAILABLE') {
    blockers.push(blocker('EXPECTATION_SOURCE_UNAVAILABLE'));
  }
  if (evidence.sourceCurrentness === 'UNKNOWN') {
    blockers.push(blocker('SOURCE_CURRENTNESS_UNRESOLVED'));
  }
  if (evidence.semanticOutcome === 'INVALID_INPUT' || evidence.receiptOutcome === 'INVALID_INPUT') {
    blockers.push(blocker('INVALID_INPUT'));
  }
  if (evidence.semanticOutcome === 'PROJECTION_LIMIT_EXCEEDED' || evidence.receiptOutcome === 'PROJECTION_LIMIT_EXCEEDED' || evidence.coverageState === 'PROJECTION_LIMIT_EXCEEDED') {
    // Only blocks HIGH if no observed anomaly? Per spec: PROJECTION_LIMIT_EXCEEDED without observed anomaly blocks.
    // We treat any projection-limit as blocker for HIGH unless semanticOutcome is ANOMALY with violation. To keep conservative: always block.
    // But allow ANOMALY+VIOLATION case? Spec says without observed target anomaly. We'll allow if ANOMALY exists.
    if (evidence.semanticOutcome !== 'ANOMALY') blockers.push(blocker('PROJECTION_LIMIT_EXCEEDED'));
  }
  if (evidence.receiptOutcome === 'INTERNAL_ERROR' || evidence.semanticOutcome === 'INTERNAL_ERROR') {
    blockers.push(blocker('INTERNAL_ERROR'));
  }
  if (evidence.exactReplayStatus !== 'REPRODUCED') {
    blockers.push(blocker('EXACT_REPLAY_NOT_REPRODUCED'));
  }
  if (evidence.exactFingerprintMatch === false) {
    blockers.push(blocker('REPLAY_FINGERPRINT_MISMATCH'));
  }
  if (!safetyClean) blockers.push(blocker('SAFETY_NONZERO'));
  if (!privacyClean) blockers.push(blocker('PRIVACY_FAILURE'));
  if (knownFalsePositive) blockers.push(blocker('KNOWN_FALSE_POSITIVE'));
  if (!oracleReliable) blockers.push(blocker('ORACLE_RELIABILITY_UNRESOLVED'));
  if (!semanticIdentityPresent) blockers.push(blocker('SEMANTIC_IDENTITY_MISSING'));
  // semantic outcome must be ANOMALY for HIGH
  if (evidence.semanticOutcome !== 'ANOMALY' || evidence.receiptOutcome !== 'ANOMALY') {
    // Only push if not already blocked by more specific reason? Always block HIGH if not ANOMALY.
    blockers.push(blocker('NON_ANOMALY_OUTCOME'));
  }

  // Deduplicate blockers deterministically
  const uniqueBlockers = [...new Set(blockers)].sort();

  // Browser/API agreement alone check is handled by not granting HIGH without semantic replay etc.
  // Build reasons for non-HIGH levels
  if (evidence.semanticOutcome === 'ANOMALY') reasons.push('semantic outcome ANOMALY');
  if (evidence.sourceCurrentness === 'CURRENT') reasons.push('source current');
  if (evidence.exactReplayStatus === 'REPRODUCED' && evidence.exactFingerprintMatch) reasons.push('exact replay reproduces same fingerprint');
  if (safetyClean && privacyClean) reasons.push('safety/privacy clean');
  if (!knownFalsePositive) reasons.push('no known false-positive');
  if (oracleReliable) reasons.push('oracle reliable');
  if (browserApiDifferential === 'BROWSER_API_FAILURE_AGREE' || browserApiDifferential === 'UI_FAILURE_API_PASS') reasons.push('browser/API differential informative');

  const minimalEvidence = evidence.minimalSequenceReproductions >= 1 && evidence.minimalityGuarantee !== 'NONE';

  // Determine level
  if (uniqueBlockers.length > 0) {
    // If blocked, cannot be HIGH. Downgrade to MEDIUM/LOW/UNRESOLVED deterministically.
    // HIGH requires all above absent AND sufficient reproduction evidence.
    // Decide MEDIUM vs LOW vs UNRESOLVED
    const hasAnomaly = evidence.semanticOutcome === 'ANOMALY' && evidence.receiptOutcome === 'ANOMALY';
    const hasSafetyBlock = !safetyClean || !privacyClean;
    const hasFalsePositive = knownFalsePositive;
    const hasStaleUnavailable = evidence.sourceCurrentness === 'STALE' || evidence.sourceCurrentness === 'UNAVAILABLE' || evidence.sourceCurrentness === 'UNKNOWN';
    const hasReplayFail = evidence.exactReplayStatus !== 'REPRODUCED' || !evidence.exactFingerprintMatch;
    const hasIdentityMissing = !semanticIdentityPresent;

    if (hasSafetyBlock || hasFalsePositive || hasIdentityMissing) {
      // These are severe: UNRESOLVED if safety/privacy, LOW if false-positive/identity? Spec says known false-positive cannot be HIGH but may be LOW.
      if (!safetyClean || !privacyClean) return { level: 'UNRESOLVED', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
      if (knownFalsePositive) return { level: 'LOW', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
      if (!semanticIdentityPresent) return { level: 'UNRESOLVED', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
    }
    if (hasAnomaly && !hasReplayFail && !hasStaleUnavailable && oracleReliable && !hasSafetyBlock && !knownFalsePositive) {
      // Partial coverage etc already blocks but could still be MEDIUM if anomaly present and replay succeeded but blocked by partial? Spec says partial blocks HIGH but may allow MEDIUM/LOW.
      // So return MEDIUM if anomaly+replay+oracle reliable
      return { level: 'MEDIUM', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
    }
    if (hasAnomaly) return { level: hasStaleUnavailable || hasReplayFail ? 'LOW' : 'MEDIUM', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
    return { level: 'UNRESOLVED', reasons: [...new Set(reasons)].sort(), blockers: uniqueBlockers };
  }

  // No blockers: check sufficient independent evidence for HIGH
  // HIGH requires: original ANOMALY, current source, exact replay same fingerprint, safety/privacy clean, no false positive, oracle reliable, semantic identity present, enough reproduction
  const sufficientReproduction = evidence.freshContextReproductions >= 1 && evidence.minimalSequenceReproductions >= 1 && minimalEvidence;
  if (sufficientReproduction) {
    return { level: 'HIGH', reasons: [...new Set([...reasons, 'sufficient reproduction and minimization evidence'])].sort(), blockers: [] };
  }
  // Without sufficient reproduction, downgrade to MEDIUM
  return { level: 'MEDIUM', reasons: [...new Set(reasons)].sort(), blockers: [] };
}
