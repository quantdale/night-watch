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
  ReplayDifferentialEvidence,
} from './types';

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function semanticKey(item: JourneySemanticRequest): string {
  return [item.ruleId, item.classification, item.disposition, item.method.toUpperCase(), item.stepId ?? '', item.actionType ?? ''].join('|');
}

function strictSemanticLedger(evidence: JourneyEvidence): string[] | null {
  if (evidence.semanticRequests === undefined) return null;
  return evidence.semanticRequests
    .filter((item) => item.disposition !== 'PASSIVE_UNKNOWN_OBSERVED')
    .map(semanticKey)
    .sort();
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
  return {
    passed: mismatches.length === 0 && first.passed && replay.passed,
    categories: [...categories],
    strictInvariantMismatches: mismatches,
    boundedVariance: variance,
    differential,
  };
}
