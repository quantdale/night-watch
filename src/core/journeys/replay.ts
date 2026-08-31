// ---------------------------------------------------------------------------
// Nightwatch — fresh-context journey replay comparison.
//
// Strict invariants, bounded variance, safety, auth, and oracle dimensions are
// compared separately. Legacy Phase 2A/2B evidence remains readable: fields
// introduced by Phase 2C are used when both sides contain them.
// ---------------------------------------------------------------------------

import type {
  JourneyEvidence,
  JourneySemanticRequest,
  ReplayComparison,
  ReplayComparisonCategory,
  ReplayDivergenceClassification,
  ReplayDifferentialEvidence,
} from './types';
import { stableJsonSorted } from '../identity/canonicalDigest';

const MAX_REPLAY_CANONICAL_DEPTH = 64;
const MAX_REPLAY_CANONICAL_NODES = 8192;
const MAX_REPLAY_CANONICAL_BYTES = 256 * 1024;

interface ReplayCanonicalBudget {
  nodes: number;
}

/**
 * The historical canonical-digest helper intentionally preserves legacy
 * serialization quirks. Replay comparison has a stricter boundary: it only
 * accepts finite JSON-shaped trees, and rejects cycles and exotic objects
 * before canonicalization. That keeps an unsupported value from matching its
 * equally unsupported counterpart and turning an incomplete observation into
 * a PASS.
 */
function isSupportedReplayValue(value: unknown, seen: Set<object>, budget: ReplayCanonicalBudget, depth = 0): boolean {
  if (depth > MAX_REPLAY_CANONICAL_DEPTH) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (seen.has(value) || ++budget.nodes > MAX_REPLAY_CANONICAL_NODES) return false;
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    seen.add(value);
    try {
      for (const item of value) {
        if (!isSupportedReplayValue(item, seen, budget, depth + 1)) return false;
      }
      return true;
    } finally {
      seen.delete(value);
    }
  }
  if (prototype !== Object.prototype && prototype !== null) return false;
  seen.add(value);
  try {
    for (const item of Object.values(value as Record<string, unknown>)) {
      if (!isSupportedReplayValue(item, seen, budget, depth + 1)) return false;
    }
    return true;
  } finally {
    seen.delete(value);
  }
}

function sameJson(a: unknown, b: unknown): boolean {
  // Replay evidence is JSON-shaped, but object insertion order is an
  // incidental capture detail. Canonicalize object keys while retaining
  // array order: step/request order is meaningful where the comparator
  // explicitly preserves it, whereas marker/count object order is not.
  try {
    const budget = { nodes: 0 };
    if (!isSupportedReplayValue(a, new Set(), budget) || !isSupportedReplayValue(b, new Set(), budget)) return false;
    const first = stableJsonSorted(a);
    const replay = stableJsonSorted(b);
    if (typeof first !== 'string' || typeof replay !== 'string') return false;
    if (first.length > MAX_REPLAY_CANONICAL_BYTES || replay.length > MAX_REPLAY_CANONICAL_BYTES) return false;
    return first === replay;
  } catch {
    // Unsupported or cyclic evidence cannot be compared safely. Treat it as
    // a mismatch; never let a comparator exception become an implicit pass.
    return false;
  }
}

function semanticKey(item: JourneySemanticRequest): string {
  return [item.ruleId, item.classification, item.disposition, item.method.toUpperCase(), item.stepId ?? '', item.actionType ?? ''].join('|');
}

function strictSemanticLedger(evidence: JourneyEvidence): string[] | null {
  if (evidence.semanticRequests === undefined) return null;
  // The strict contract compares which approved semantic request shapes were
  // exercised, while bounded request-count variance covers repeated reads
  // caused by normal application rehydration/polling. Preserve method,
  // disposition, step, and action in the key so a mutation or action-caused
  // unknown request remains a strict divergence; ignore only duplicate
  // occurrences of an otherwise identical safe key.
  return [...new Set(evidence.semanticRequests
    .filter((item) => item.disposition !== 'PASSIVE_UNKNOWN_OBSERVED')
    .map(semanticKey)
  )].sort();
}

function semanticFamilies(evidence: JourneyEvidence): string[] {
  return [...new Set(evidence.semanticRuleIds.map((id) => id))].sort();
}

function oracleKeys(evidence: JourneyEvidence): string[] | null {
  if (evidence.oracleObservations === undefined) return null;
  return evidence.oracleObservations
    .filter((item) => item.triggered && item.anomalyClass !== 'EXPECTED_CONTAINMENT' && item.anomalyClass !== 'BROWSER_BACKGROUND')
    .map((item) => `${item.oracleId}|${item.severity}|${item.anomalyClass}|${item.fingerprint ?? ''}`)
    .sort();
}

function resourceFailureKeys(evidence: JourneyEvidence): string[] | null {
  if (evidence.resourceObservations === undefined) return null;
  return evidence.resourceObservations
    // Cancellation is retained in lifecycle/containment evidence, but is not
    // a strict resource failure. Expected policy blocks and document-replace
    // aborts can vary with browser timing without changing the journey.
    .filter((item) => item.state !== 'COMPLETED' && item.state !== 'REQUESTED' && !isCancellation(item.state))
    .map((item) => `${item.role}|${item.state}|${item.stepId ?? ''}`)
    .sort();
}

function isCancellation(state: string): boolean {
  return state === 'CANCELED_BY_NAVIGATION' || state === 'CANCELED_BY_DOCUMENT_REPLACEMENT' ||
    state === 'CANCELED_BY_BROWSER' || state === 'CANCELED_BY_POLICY';
}

function resourceContainmentKeys(evidence: JourneyEvidence): string[] | null {
  if (evidence.resourceObservations === undefined) return null;
  return evidence.resourceObservations
    .filter((item) => isCancellation(item.state))
    .map((item) => `${item.role}|${item.state}|${item.stepId ?? ''}`)
    .sort();
}

function onlyIn(first: readonly string[], second: readonly string[]): string[] {
  const other = new Set(second);
  return [...new Set(first)].filter((item) => !other.has(item)).sort();
}

function safetyEqual(first: JourneyEvidence, replay: JourneyEvidence): boolean {
  if (first.mutationCount !== replay.mutationCount || first.actionUnknownCount !== replay.actionUnknownCount ||
      first.safetyStatus !== replay.safetyStatus) return false;
  if (first.safetyCounts !== undefined && replay.safetyCounts !== undefined) {
    return sameJson(first.safetyCounts, replay.safetyCounts);
  }
  return true;
}

const TIMING_ONLY_VARIANCE = new Set(['route-stability-timing']);
const BENIGN_VARIANCE = new Set([
  'passive-unknown-count',
  'semantic-request-count',
  'background-and-cleanup-variance',
  'containment-count-variance',
  'resource-containment-variance',
]);

function hasTriggeredAnomalyClass(evidence: JourneyEvidence, anomalyClass: string): boolean {
  return evidence.oracleObservations?.some((item) => item.triggered && item.anomalyClass === anomalyClass) ?? false;
}

function hasProductStateDifference(first: JourneyEvidence, replay: JourneyEvidence, firstOracleKeys: string[] | null, replayOracleKeys: string[] | null): boolean {
  if (!hasTriggeredAnomalyClass(first, 'PRODUCT_BEHAVIOR_ANOMALY') && !hasTriggeredAnomalyClass(replay, 'PRODUCT_BEHAVIOR_ANOMALY')) return false;
  if (firstOracleKeys !== null && replayOracleKeys !== null && sameJson(firstOracleKeys, replayOracleKeys)) {
    return first.oracleStatus === 'FAIL' || replay.oracleStatus === 'FAIL' || !first.passed || !replay.passed;
  }
  return true;
}

function classifyReplayOutcome(input: {
  first: JourneyEvidence;
  replay: JourneyEvidence;
  mismatches: readonly string[];
  variance: readonly string[];
  firstOracleKeys: string[] | null;
  replayOracleKeys: string[] | null;
}): { classification: ReplayDivergenceClassification; reason: string; diagnosticCodes: readonly string[] } {
  const diagnostics = new Set<string>();
  const addMismatchDiagnostics = (): void => {
    for (const mismatch of input.mismatches) diagnostics.add(`STRICT_${mismatch.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`);
  };

  if (input.first.authValid !== input.replay.authValid) {
    diagnostics.add('AUTH_STATE_CHANGED');
    return { classification: 'AUTH_DIVERGENCE', reason: 'auth validity differs between observations', diagnosticCodes: [...diagnostics].sort() };
  }
  if (input.first.environmentInputDigest !== undefined && input.replay.environmentInputDigest !== undefined &&
      input.first.environmentInputDigest !== input.replay.environmentInputDigest) {
    diagnostics.add('ENVIRONMENT_INPUT_CHANGED');
    return { classification: 'ENVIRONMENT_DIVERGENCE', reason: 'declared environment input digest differs', diagnosticCodes: [...diagnostics].sort() };
  }
  if (input.first.observationSettlement === 'TIMED_OUT' || input.replay.observationSettlement === 'TIMED_OUT') {
    diagnostics.add('SETTLEMENT_TIMEOUT');
    return { classification: 'FRAMEWORK_CAPTURE_DEFECT', reason: 'response/oracle settlement did not complete within the bounded barrier', diagnosticCodes: [...diagnostics].sort() };
  }
  if (input.first.captureStatus === 'INCOMPLETE' || input.replay.captureStatus === 'INCOMPLETE') {
    diagnostics.add('CAPTURE_INCOMPLETE');
    return { classification: 'FRAMEWORK_CAPTURE_DEFECT', reason: 'one observation has incomplete response capture', diagnosticCodes: [...diagnostics].sort() };
  }
  if (input.first.captureStatus === 'UNKNOWN' || input.replay.captureStatus === 'UNKNOWN') {
    diagnostics.add('CAPTURE_STATUS_UNKNOWN');
    return { classification: 'FRAMEWORK_CAPTURE_DEFECT', reason: 'response capture health was not established for one observation', diagnosticCodes: [...diagnostics].sort() };
  }

  const productStateDifference = hasProductStateDifference(input.first, input.replay, input.firstOracleKeys, input.replayOracleKeys);
  const productOnlyMismatch = input.mismatches.length > 0 && input.mismatches.every((item) => item === 'oracle-set' || item === 'oracle-or-result-status');
  if (productStateDifference && (productOnlyMismatch || input.mismatches.length === 0)) {
    diagnostics.add('PRODUCT_ORACLE_STATE_CHANGED');
    return { classification: 'EXPECTED_PRODUCT_STATE_DRIFT', reason: 'the differing outcome is attributed to a product-behavior oracle', diagnosticCodes: [...diagnostics].sort() };
  }

  if (input.mismatches.length === 0 && input.variance.length === 0 && input.first.passed && input.replay.passed) {
    diagnostics.add('NO_DIFFERENCE');
    return { classification: 'MATCH', reason: 'strict invariants and bounded observation channels match', diagnosticCodes: [...diagnostics].sort() };
  }
  if (input.mismatches.length === 0 && input.variance.length > 0) {
    if (input.variance.every((item) => TIMING_ONLY_VARIANCE.has(item))) {
      diagnostics.add('TIMING_VARIANCE_ONLY');
      return { classification: 'TIMING_ONLY_OBSERVATION_DIFFERENCE', reason: 'only the bounded route-stability timing channel differs', diagnosticCodes: [...diagnostics].sort() };
    }
    if (input.variance.every((item) => BENIGN_VARIANCE.has(item) || TIMING_ONLY_VARIANCE.has(item))) {
      diagnostics.add('BENIGN_VARIANCE_ONLY');
      return { classification: 'BENIGN_TELEMETRY_VARIATION', reason: 'only bounded passive, timing, cleanup, containment, or multiplicity channels differ', diagnosticCodes: [...diagnostics].sort() };
    }
  }
  if (input.mismatches.length > 0) {
    addMismatchDiagnostics();
    return { classification: 'DETERMINISTIC_REPLAY_MISMATCH', reason: 'one or more strict replay invariants differ without a narrower safe classification', diagnosticCodes: [...diagnostics].sort() };
  }

  diagnostics.add('RUN_VERDICT_NOT_PASS');
  return { classification: 'UNKNOWN_DIVERGENCE', reason: 'the run verdict is non-pass without a classified strict or bounded difference', diagnosticCodes: [...diagnostics].sort() };
}

export function compareJourneyReplay(first: JourneyEvidence, replay: JourneyEvidence): ReplayComparison {
  const mismatches: string[] = [];
  const variance: string[] = [];
  const categories = new Set<ReplayComparisonCategory>();

  if (first.contractDigest !== undefined && replay.contractDigest !== undefined) {
    if (first.journeyId !== replay.journeyId || first.contractDigest !== replay.contractDigest || first.contractVersion !== replay.contractVersion) {
      mismatches.push('journey-contract');
      categories.add('SEMANTIC_REQUEST_DIVERGENCE');
    }
  } else if (first.journeyId !== replay.journeyId || first.contractSourceSha !== replay.contractSourceSha) {
    mismatches.push('journey-contract');
    categories.add('SEMANTIC_REQUEST_DIVERGENCE');
  }

  if (first.finalRouteClass !== replay.finalRouteClass) {
    mismatches.push('final-route-class');
    categories.add('ROUTE_DIVERGENCE');
  }
  if (first.globalShellReady !== replay.globalShellReady || !sameJson(first.journeyMarkers, replay.journeyMarkers)) {
    mismatches.push('structural-checkpoints');
    categories.add('STRUCTURAL_DIVERGENCE');
  }

  const firstSteps = first.stepResults.map((step) => ({
    id: step.stepId,
    action: step.actionType,
    status: step.status,
    marker: step.structuralMarkerId,
    present: step.structuralPresent,
    requiredReads: [...step.requiredReadRuleIds].sort(),
    failure: step.failureClassification ?? null,
  }));
  const replaySteps = replay.stepResults.map((step) => ({
    id: step.stepId,
    action: step.actionType,
    status: step.status,
    marker: step.structuralMarkerId,
    present: step.structuralPresent,
    requiredReads: [...step.requiredReadRuleIds].sort(),
    failure: step.failureClassification ?? null,
  }));
  if (!sameJson(firstSteps, replaySteps)) {
    mismatches.push('step-results');
    categories.add('STRUCTURAL_DIVERGENCE');
  }

  if (!sameJson(semanticFamilies(first), semanticFamilies(replay)) || !sameJson(first.semanticClasses, replay.semanticClasses)) {
    mismatches.push('semantic-endpoint-families');
    categories.add('SEMANTIC_REQUEST_DIVERGENCE');
  }
  const firstStrictLedger = strictSemanticLedger(first);
  const replayStrictLedger = strictSemanticLedger(replay);
  if (firstStrictLedger !== null && replayStrictLedger !== null && !sameJson(firstStrictLedger, replayStrictLedger)) {
    mismatches.push('semantic-request-ledger');
    categories.add('SEMANTIC_REQUEST_DIVERGENCE');
  }

  if (!safetyEqual(first, replay)) {
    mismatches.push('safety-ledger');
    categories.add('SAFETY_DIVERGENCE');
  }
  if (first.authValid !== replay.authValid) {
    mismatches.push('auth-validity');
    categories.add('AUTH_DIVERGENCE');
  }

  const firstOracleKeys = oracleKeys(first);
  const replayOracleKeys = oracleKeys(replay);
  if (firstOracleKeys !== null && replayOracleKeys !== null && !sameJson(firstOracleKeys, replayOracleKeys)) {
    mismatches.push('oracle-set');
    categories.add('ORACLE_DIVERGENCE');
  }
  if (first.oracleStatus !== replay.oracleStatus || first.passed !== replay.passed) {
    mismatches.push('oracle-or-result-status');
    categories.add('ORACLE_DIVERGENCE');
  }
  const firstResourceFailures = resourceFailureKeys(first);
  const replayResourceFailures = resourceFailureKeys(replay);
  if (firstResourceFailures !== null && replayResourceFailures !== null && !sameJson(firstResourceFailures, replayResourceFailures)) {
    mismatches.push('resource-lifecycle');
    categories.add('ORACLE_DIVERGENCE');
  }
  const firstResourceContainment = resourceContainmentKeys(first);
  const replayResourceContainment = resourceContainmentKeys(replay);
  if (firstResourceContainment !== null && replayResourceContainment !== null && !sameJson(firstResourceContainment, replayResourceContainment)) {
    variance.push('resource-containment-variance');
    categories.add('EXPECTED_BACKGROUND_VARIANCE');
  }
  if (first.privacyStatus !== replay.privacyStatus) {
    mismatches.push('privacy-status');
    categories.add('SAFETY_DIVERGENCE');
  }

  const timingDelta = first.routeStabilityMs !== undefined && replay.routeStabilityMs !== undefined
    ? Math.abs(first.routeStabilityMs - replay.routeStabilityMs)
    : null;
  if (timingDelta !== null && timingDelta !== 0) {
    variance.push('route-stability-timing');
    categories.add('EXPECTED_TIMING_VARIANCE');
  }
  if (first.passiveUnknownCount !== replay.passiveUnknownCount) {
    variance.push('passive-unknown-count');
    categories.add('EXPECTED_REQUEST_COUNT_VARIANCE');
  }
  const firstRequestCount = first.boundedVariance?.requestCount ?? first.semanticRequests?.length ?? null;
  const replayRequestCount = replay.boundedVariance?.requestCount ?? replay.semanticRequests?.length ?? null;
  const requestCountDelta = firstRequestCount !== null && replayRequestCount !== null
    ? Math.abs(firstRequestCount - replayRequestCount)
    : null;
  if (requestCountDelta !== null && requestCountDelta !== 0 && mismatches.length === 0) {
    variance.push('semantic-request-count');
    categories.add('EXPECTED_REQUEST_COUNT_VARIANCE');
  }
  if (first.boundedVariance !== undefined && replay.boundedVariance !== undefined) {
    const boundedFields: Array<keyof NonNullable<JourneyEvidence['boundedVariance']>> = [
      'optionalSupportBlockedDelta', 'telemetryBlockedDelta',
      'browserBackgroundBlockedDelta', 'nonCriticalResourceFailureDelta',
      'cleanupIncompleteDelta', 'networkConcurrencyDelta',
    ];
    if (boundedFields.some((field) => first.boundedVariance?.[field] !== replay.boundedVariance?.[field])) {
      variance.push('background-and-cleanup-variance');
      categories.add('EXPECTED_BACKGROUND_VARIANCE');
    }
  }
  if (first.containmentCounts !== undefined && replay.containmentCounts !== undefined) {
    if (first.containmentCounts.optionalSupportBlocked !== replay.containmentCounts.optionalSupportBlocked ||
        first.containmentCounts.telemetryBlocked !== replay.containmentCounts.telemetryBlocked ||
        first.containmentCounts.browserBackgroundBlocked !== replay.containmentCounts.browserBackgroundBlocked) {
      variance.push('containment-count-variance');
      categories.add('EXPECTED_BACKGROUND_VARIANCE');
    }
  }

  if (mismatches.length === 0 && variance.length === 0) {
    categories.add('MATCH');
    categories.add('STRICT_MATCH');
  } else if (mismatches.length === 0) {
    categories.add('BOUNDED_MATCH');
    categories.add('EXPECTED_VARIANCE');
  }

  const differential: ReplayDifferentialEvidence = {
    routeClassSame: first.finalRouteClass === replay.finalRouteClass,
    structuralMarkersSame: first.globalShellReady === replay.globalShellReady && sameJson(first.journeyMarkers, replay.journeyMarkers),
    semanticReadFamiliesSame: sameJson(semanticFamilies(first), semanticFamilies(replay)),
    semanticStrictLedgerSame: firstStrictLedger === null || replayStrictLedger === null || sameJson(firstStrictLedger, replayStrictLedger),
    timingDeltaMs: timingDelta,
    requestCountDelta,
    passiveUnknownDelta: Math.abs(first.passiveUnknownCount - replay.passiveUnknownCount),
    oracleIdsOnlyInFirst: firstOracleKeys === null || replayOracleKeys === null ? [] : onlyIn(firstOracleKeys, replayOracleKeys),
    oracleIdsOnlyInReplay: firstOracleKeys === null || replayOracleKeys === null ? [] : onlyIn(replayOracleKeys, firstOracleKeys),
    resourceContainmentSame: firstResourceContainment === null || replayResourceContainment === null || sameJson(firstResourceContainment, replayResourceContainment),
    authEquivalent: first.authValid === replay.authValid,
    safetyEquivalent: safetyEqual(first, replay),
  };
  const classification = classifyReplayOutcome({
    first,
    replay,
    mismatches,
    variance,
    firstOracleKeys,
    replayOracleKeys,
  });
  const replayPasses = classification.classification === 'MATCH' ||
    classification.classification === 'TIMING_ONLY_OBSERVATION_DIFFERENCE' ||
    classification.classification === 'BENIGN_TELEMETRY_VARIATION';
  return {
    // A bounded retry is not a pass when capture/settlement/environment
    // evidence is incomplete or the classifier cannot explain the result.
    // Timing and explicitly bounded benign variation remain the only
    // non-strict outcomes allowed to pass.
    passed: mismatches.length === 0 && first.passed && replay.passed && replayPasses,
    categories: [...categories],
    strictInvariantMismatches: mismatches,
    boundedVariance: variance,
    classification: classification.classification,
    classificationReason: classification.reason,
    diagnosticCodes: classification.diagnosticCodes,
    differential,
  };
}
