// ---------------------------------------------------------------------------
// Nightwatch — deterministic single-observation classification.
//
// A failed oracle is not, by itself, evidence of product behavior. The
// observation must first prove that authentication, safety, response capture,
// and the bounded settlement barrier were healthy. This classifier is shared
// by the real Phase 2C runner and local tests so the per-observation verdict
// cannot drift from replay attribution.
// ---------------------------------------------------------------------------

import type { JourneyEvidence } from './types';

export type JourneyObservationClassification =
  | 'PASS'
  | 'PRODUCT_BEHAVIOR_ANOMALY'
  | 'DEV_INFRA_TRANSIENT'
  | 'AUTH_STATE_INVALID'
  | 'SAFETY_BLOCK'
  | 'FRAMEWORK_CAPTURE_DEFECT'
  | 'NIGHTWATCH_DEFECT'
  | 'UNKNOWN';

export interface JourneyObservationSafetySummary {
  readonly productionAttempts: number;
  readonly proxyViolations: number;
  readonly unknownDestinations: number;
  readonly unknownApprovals: number;
  readonly mutations: number;
  readonly dbQueries: number;
  readonly actionCausedUnknown: number;
}

export interface JourneyObservationClassificationResult {
  readonly classification: JourneyObservationClassification;
  readonly reason: string;
  readonly diagnosticCodes: readonly string[];
}

const SAFETY_FIELDS: readonly (keyof JourneyObservationSafetySummary)[] = [
  'productionAttempts',
  'proxyViolations',
  'unknownDestinations',
  'unknownApprovals',
  'mutations',
  'dbQueries',
  'actionCausedUnknown',
];

function safetyFailed(safety: JourneyObservationSafetySummary): boolean {
  return SAFETY_FIELDS.some((field) => safety[field] > 0);
}

function triggeredClasses(evidence: JourneyEvidence): Set<string> {
  return new Set(
    (evidence.oracleObservations ?? [])
      .filter((item) => item.triggered)
      .map((item) => item.anomalyClass),
  );
}

/**
 * Classify one real Phase 2C observation without promoting incomplete
 * framework evidence to a product finding.
 */
export function classifyJourneyObservation(input: {
  readonly evidence: JourneyEvidence;
  readonly safety: JourneyObservationSafetySummary;
}): JourneyObservationClassificationResult {
  const { evidence, safety } = input;

  if (safetyFailed(safety)) {
    return {
      classification: 'SAFETY_BLOCK',
      reason: 'the observation recorded a non-zero safety-boundary counter',
      diagnosticCodes: ['SAFETY_BOUNDARY_VIOLATION'],
    };
  }
  if (!evidence.authValid) {
    return {
      classification: 'AUTH_STATE_INVALID',
      reason: 'authenticated state was not valid for the observed page',
      diagnosticCodes: ['AUTH_STATE_INVALID'],
    };
  }
  if (evidence.observationSettlement !== 'SETTLED') {
    return {
      classification: 'FRAMEWORK_CAPTURE_DEFECT',
      reason: evidence.observationSettlement === 'TIMED_OUT'
        ? 'response/oracle settlement did not complete within the bounded barrier'
        : 'response/oracle settlement was not established for the observation',
      diagnosticCodes: [evidence.observationSettlement === 'TIMED_OUT' ? 'SETTLEMENT_TIMEOUT' : 'SETTLEMENT_STATUS_UNKNOWN'],
    };
  }
  if (evidence.captureStatus !== 'COMPLETE') {
    return {
      classification: 'FRAMEWORK_CAPTURE_DEFECT',
      reason: evidence.captureStatus === 'INCOMPLETE'
        ? 'response capture was incomplete for the observation'
        : 'response capture health was not established for the observation',
      diagnosticCodes: [evidence.captureStatus === 'INCOMPLETE' ? 'CAPTURE_INCOMPLETE' : 'CAPTURE_STATUS_UNKNOWN'],
    };
  }

  if (evidence.passed && evidence.oracleStatus === 'PASS') {
    return {
      classification: 'PASS',
      reason: 'the observation passed its bounded journey, oracle, and safety checks',
      diagnosticCodes: ['OBSERVATION_PASS'],
    };
  }

  const classes = triggeredClasses(evidence);
  if (evidence.oracleStatus === 'FAIL' && (classes.has('NIGHTWATCH_DEFECT') || classes.has('SOURCE_CONTRACT_STALE'))) {
    return {
      classification: 'NIGHTWATCH_DEFECT',
      reason: 'a Nightwatch-owned oracle or source-contract defect was triggered',
      diagnosticCodes: ['NIGHTWATCH_OWNED_ORACLE_FAILURE'],
    };
  }
  if (evidence.oracleStatus === 'FAIL' && classes.has('AUTH_STATE_INVALID')) {
    return {
      classification: 'AUTH_STATE_INVALID',
      reason: 'the observation oracle classified the failure as invalid authenticated state',
      diagnosticCodes: ['AUTH_ORACLE_FAILURE'],
    };
  }
  if (evidence.oracleStatus === 'FAIL' && (classes.has('DEV_INFRA_TRANSIENT') || classes.has('KNOWN_TRANSIENT'))) {
    return {
      classification: 'DEV_INFRA_TRANSIENT',
      reason: 'the observation oracle classified the failure as bounded DEV infrastructure transient behavior',
      diagnosticCodes: ['DEV_INFRA_TRANSIENT'],
    };
  }
  if (evidence.oracleStatus === 'FAIL' && classes.has('PRODUCT_BEHAVIOR_ANOMALY')) {
    return {
      classification: 'PRODUCT_BEHAVIOR_ANOMALY',
      reason: 'a settled observation triggered an explicitly product-classified oracle',
      diagnosticCodes: ['PRODUCT_ORACLE_FAILURE'],
    };
  }

  return {
    classification: 'UNKNOWN',
    reason: 'the non-pass observation has no explicit safe attribution',
    diagnosticCodes: ['UNCLASSIFIED_OBSERVATION_FAILURE'],
  };
}
