// ---------------------------------------------------------------------------
// Nightwatch — backward-compatible journey-evidence boundary.
//
// Phase 2C adds fields but does not rewrite Phase 2A/2B artifacts. Parsing is
// shape validation only; it never accepts bodies, DOM, credentials, or raw
// customer values as part of the durable journey model.
// ---------------------------------------------------------------------------

import type { JourneyEvidence } from '../journeys/types';
import { EVIDENCE_SCHEMA_VERSION } from '../journeys/contract'; // Phase 15P A15: single owner of the phase2c evidence schema tag

const JOURNEY_ID = /^[a-z0-9][a-z0-9-]*$/;

export function parseJourneyEvidence(value: unknown): JourneyEvidence {
  if (value === null || typeof value !== 'object') throw new Error('journey evidence must be an object');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.journeyId !== 'string' || !JOURNEY_ID.test(candidate.journeyId)) throw new Error('journey evidence journeyId is invalid');
  if (typeof candidate.contractSourceSha !== 'string' || !/^[0-9a-f]{40}$/i.test(candidate.contractSourceSha)) throw new Error('journey evidence contractSourceSha is invalid');
  if (typeof candidate.passed !== 'boolean' || typeof candidate.finalRouteClass !== 'string' ||
      typeof candidate.globalShellReady !== 'boolean' || typeof candidate.journeyMarkers !== 'object' ||
      !Array.isArray(candidate.stepResults) || !Array.isArray(candidate.semanticRuleIds) ||
      !Array.isArray(candidate.semanticClasses) || typeof candidate.passiveUnknownCount !== 'number' ||
      typeof candidate.actionUnknownCount !== 'number' || typeof candidate.mutationCount !== 'number' ||
      typeof candidate.routeStabilityMs !== 'number' || typeof candidate.authValid !== 'boolean' ||
      (candidate.oracleStatus !== 'PASS' && candidate.oracleStatus !== 'FAIL') ||
      (candidate.privacyStatus !== 'PASS' && candidate.privacyStatus !== 'FAIL') ||
      (candidate.safetyStatus !== 'PASS' && candidate.safetyStatus !== 'FAIL')) {
    throw new Error('journey evidence has invalid legacy fields');
  }
  const safe: Record<string, unknown> = {
    journeyId: candidate.journeyId,
    contractSourceSha: candidate.contractSourceSha,
    passed: candidate.passed,
    finalRouteClass: candidate.finalRouteClass,
    globalShellReady: candidate.globalShellReady,
    journeyMarkers: candidate.journeyMarkers,
    stepResults: (candidate.stepResults as unknown[]).map((item) => {
      const step = item as Record<string, unknown>;
      return {
        stepId: step.stepId,
        actionType: step.actionType,
        status: step.status,
        routeClass: step.routeClass,
        structuralMarkerId: step.structuralMarkerId,
        structuralPresent: step.structuralPresent,
        requiredReadRuleIds: Array.isArray(step.requiredReadRuleIds) ? step.requiredReadRuleIds : [],
        elapsedMs: step.elapsedMs,
        ...(typeof step.routeStabilityMs === 'number' ? { routeStabilityMs: step.routeStabilityMs } : {}),
        ...(typeof step.failureClassification === 'string' ? { failureClassification: step.failureClassification } : {}),
      };
    }),
    semanticRuleIds: candidate.semanticRuleIds,
    semanticClasses: candidate.semanticClasses,
    passiveUnknownCount: candidate.passiveUnknownCount,
    actionUnknownCount: candidate.actionUnknownCount,
    mutationCount: candidate.mutationCount,
    routeStabilityMs: candidate.routeStabilityMs,
    authValid: candidate.authValid,
    oracleStatus: candidate.oracleStatus,
    privacyStatus: candidate.privacyStatus,
    safetyStatus: candidate.safetyStatus,
  };
  const optionalKeys = [
    'evidenceSchemaVersion', 'contractVersion', 'contractDigest', 'oracleVersion',
    'semanticRequests', 'safetyCounts', 'boundedVariance', 'oracleObservations',
    'anomalyFingerprints', 'failureAttribution', 'resourceObservations',
    'containmentCounts',
  ] as const;
  for (const key of optionalKeys) {
    if (candidate[key] !== undefined) safe[key] = candidate[key];
  }
  return safe as unknown as JourneyEvidence;
}

export function evidenceSchemaOf(evidence: JourneyEvidence): 'LEGACY_PHASE2' | 'PHASE2C_V1' {
  return evidence.evidenceSchemaVersion === EVIDENCE_SCHEMA_VERSION ? 'PHASE2C_V1' : 'LEGACY_PHASE2';
}
