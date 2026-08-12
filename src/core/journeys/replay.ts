// ---------------------------------------------------------------------------
// Nightwatch — fresh-context journey replay comparison.
// ---------------------------------------------------------------------------

import type { JourneyEvidence, ReplayComparison, ReplayComparisonCategory } from './types';

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function compareJourneyReplay(first: JourneyEvidence, replay: JourneyEvidence): ReplayComparison {
  const mismatches: string[] = [];
  const categories = new Set<ReplayComparisonCategory>();

  if (first.journeyId !== replay.journeyId || first.contractSourceSha !== replay.contractSourceSha) {
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
  if (!sameJson(first.stepResults.map((step) => ({ id: step.stepId, action: step.actionType, status: step.status, marker: step.structuralMarkerId, present: step.structuralPresent })),
    replay.stepResults.map((step) => ({ id: step.stepId, action: step.actionType, status: step.status, marker: step.structuralMarkerId, present: step.structuralPresent })))) {
    mismatches.push('step-results');
    categories.add('STRUCTURAL_DIVERGENCE');
  }
  if (!sameJson(first.semanticRuleIds, replay.semanticRuleIds) || !sameJson(first.semanticClasses, replay.semanticClasses)) {
    mismatches.push('semantic-endpoint-set');
    categories.add('SEMANTIC_REQUEST_DIVERGENCE');
  }
  if (first.mutationCount !== replay.mutationCount || first.actionUnknownCount !== replay.actionUnknownCount ||
      first.safetyStatus !== replay.safetyStatus) {
    mismatches.push('safety-ledger');
    categories.add('SAFETY_DIVERGENCE');
  }
  if (first.authValid !== replay.authValid) {
    mismatches.push('auth-validity');
    categories.add('AUTH_DIVERGENCE');
  }
  if (first.oracleStatus !== replay.oracleStatus || first.passed !== replay.passed) {
    mismatches.push('oracle-or-result-status');
    categories.add('ORACLE_DIVERGENCE');
  }
  if (first.privacyStatus !== replay.privacyStatus) {
    mismatches.push('privacy-status');
    categories.add('SAFETY_DIVERGENCE');
  }

  const variance: string[] = [];
  if (first.routeStabilityMs !== replay.routeStabilityMs) {
    variance.push('route-stability-timing');
    categories.add('EXPECTED_TIMING_VARIANCE');
  }
  if (first.passiveUnknownCount !== replay.passiveUnknownCount) {
    variance.push('passive-unknown-count');
    categories.add('EXPECTED_REQUEST_COUNT_VARIANCE');
  }

  if (mismatches.length === 0 && variance.length === 0) categories.add('MATCH');
  return {
    passed: mismatches.length === 0 && first.passed && replay.passed,
    categories: [...categories],
    strictInvariantMismatches: mismatches,
    boundedVariance: variance,
  };
}
