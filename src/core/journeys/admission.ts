// ---------------------------------------------------------------------------
// Nightwatch — bounded anomaly admission.
//
// This is evidence bookkeeping, not root-cause inference. Exact fingerprints
// under one frozen journey contract are required for promotion; similar
// statuses or different resources never count as reproduction.
// ---------------------------------------------------------------------------

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type AdmissionLevel = 'L0' | 'L1' | 'L2';
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type AdmissionStatus =
  | 'L0_OBSERVED'
  | 'L1_REPRODUCED'
  | 'L2_REPEATED'
  | 'NOT_REPRODUCED'
  | 'REFUTED'
  | 'SUPERSEDED_BY_NIGHTWATCH_DEFECT';

export interface AnomalyObservation {
  runId: string;
  journeyId: string;
  contractVersion: string;
  contractDigest: string;
  fingerprint: string;
  contextKind: 'FIRST_OBSERVATION' | 'FRESH_CONTEXT_REPLAY' | 'BOUNDED_REPETITION';
}

export interface AdmissionResult {
  fingerprint: string;
  journeyId: string;
  contractDigest: string;
  status: AdmissionStatus;
  level: AdmissionLevel | null;
  exactRuns: readonly string[];
  distinctContextCount: number;
  reason: string;
}

function exactContexts(observations: readonly AnomalyObservation[]): AnomalyObservation[] {
  const seen = new Set<string>();
  return observations.filter((item) => {
    if (seen.has(item.runId)) return false;
    seen.add(item.runId);
    return true;
  });
}

/** Evaluate one hypothesis under a frozen contract and bounded observation set. */
export function evaluateAnomalyAdmission(input: {
  hypothesis: AnomalyObservation;
  observations: readonly AnomalyObservation[];
  matrixComplete?: boolean;
  supersededByNightwatchDefect?: boolean;
}): AdmissionResult {
  const { hypothesis } = input;
  if (input.supersededByNightwatchDefect === true) {
    return {
      fingerprint: hypothesis.fingerprint,
      journeyId: hypothesis.journeyId,
      contractDigest: hypothesis.contractDigest,
      status: 'SUPERSEDED_BY_NIGHTWATCH_DEFECT',
      level: null,
      exactRuns: [],
      distinctContextCount: 0,
      reason: 'measurement defect was proven before anomaly promotion',
    };
  }
  const exact = exactContexts(input.observations.filter((item) =>
    item.journeyId === hypothesis.journeyId &&
    item.contractVersion === hypothesis.contractVersion &&
    item.contractDigest === hypothesis.contractDigest &&
    item.fingerprint === hypothesis.fingerprint,
  ));
  const sameContractContexts = exactContexts(input.observations.filter((item) =>
    item.journeyId === hypothesis.journeyId &&
    item.contractVersion === hypothesis.contractVersion &&
    item.contractDigest === hypothesis.contractDigest,
  ));
  if (exact.length >= 3) {
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: 'L2_REPEATED', level: 'L2', exactRuns: exact.map((item) => item.runId), distinctContextCount: exact.length, reason: 'exact fingerprint in three or more independent contexts under the frozen contract' };
  }
  if (exact.length >= 2) {
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: 'L1_REPRODUCED', level: 'L1', exactRuns: exact.map((item) => item.runId), distinctContextCount: exact.length, reason: 'exact fingerprint reproduced in a fresh context under the frozen contract' };
  }
  if (exact.length === 1) {
    const status: AdmissionStatus = input.matrixComplete && sameContractContexts.length > 1 ? 'REFUTED' : 'L0_OBSERVED';
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status, level: 'L0', exactRuns: exact.map((item) => item.runId), distinctContextCount: 1, reason: status === 'REFUTED' ? 'bounded fresh-context matrix completed without exact fingerprint reproduction' : 'single bounded observation is retained as an L0 candidate' };
  }
  return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: input.matrixComplete ? 'REFUTED' : 'NOT_REPRODUCED', level: null, exactRuns: [], distinctContextCount: 0, reason: 'no exact fingerprint observed under the frozen contract' };
}
