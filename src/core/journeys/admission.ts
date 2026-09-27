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

/**
 * M6 (7.3/C-10): the closed replay-context role vocabulary. A context is
 * ROLE-typed: independence is a property of the role, not of a run label.
 */
export const REPLAY_CONTEXT_ROLES = [
  'FIRST_OBSERVATION',
  'FRESH_CONTEXT_REPLAY',
  'BOUNDED_REPETITION',
] as const;
export type ReplayContextRole = (typeof REPLAY_CONTEXT_ROLES)[number];

export interface AnomalyObservation {
  runId: string;
  journeyId: string;
  contractVersion: string;
  contractDigest: string;
  fingerprint: string;
  contextKind: ReplayContextRole;
}

/**
 * M6 (7.3/C-10): the identity of one independent replay context. The SAME run
 * id observed under two roles is TWO contexts, and the same role observed
 * twice under one run id is ONE. The previous admission keyed on `runId`
 * alone, so a reused label could satisfy the repetition gates while a genuine
 * second role could be silently merged away.
 */
export function roleTypedContextId(observation: {
  readonly runId: string;
  readonly contextKind: ReplayContextRole;
}): string {
  return `${observation.contextKind}:${observation.runId}`;
}

export function isReplayContextRole(value: unknown): value is ReplayContextRole {
  return typeof value === 'string' && (REPLAY_CONTEXT_ROLES as readonly string[]).includes(value);
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
    const key = roleTypedContextId(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The number of DISTINCT roles the observations actually exercised. */
function distinctRoleCount(observations: readonly AnomalyObservation[]): number {
  return new Set(observations.map((item) => item.contextKind)).size;
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
  // M6 (7.3/C-10): repetition gates require a genuinely DIFFERENT role, so
  // three runs of one role can never stand in for independent contexts and a
  // reused run label can never merge two roles into one.
  const exactRoles = distinctRoleCount(exact);
  if (exact.length >= 3 && exactRoles >= 2) {
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: 'L2_REPEATED', level: 'L2', exactRuns: exact.map((item) => roleTypedContextId(item)), distinctContextCount: exact.length, reason: 'exact fingerprint in three or more independent role-typed contexts under the frozen contract' };
  }
  if (exact.length >= 2 && exactRoles >= 2) {
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: 'L1_REPRODUCED', level: 'L1', exactRuns: exact.map((item) => roleTypedContextId(item)), distinctContextCount: exact.length, reason: 'exact fingerprint reproduced in a genuinely different role-typed context under the frozen contract' };
  }
  if (exact.length >= 2) {
    // Repeated EXACTLY, but every repetition carried the SAME role: the
    // fingerprint is genuinely observed and is retained as an L0 candidate,
    // never promoted as a reproduction in a fresh context.
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: 'L0_OBSERVED', level: 'L0', exactRuns: exact.map((item) => roleTypedContextId(item)), distinctContextCount: exact.length, reason: 'exact fingerprint repeated within a single role-typed context; a second role is required for L1/L2' };
  }
  if (exact.length === 1) {
    const status: AdmissionStatus = input.matrixComplete && sameContractContexts.length > 1 ? 'REFUTED' : 'L0_OBSERVED';
    return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status, level: 'L0', exactRuns: exact.map((item) => roleTypedContextId(item)), distinctContextCount: 1, reason: status === 'REFUTED' ? 'bounded fresh-context matrix completed without exact fingerprint reproduction' : 'single bounded observation is retained as an L0 candidate' };
  }
  return { fingerprint: hypothesis.fingerprint, journeyId: hypothesis.journeyId, contractDigest: hypothesis.contractDigest, status: input.matrixComplete ? 'REFUTED' : 'NOT_REPRODUCED', level: null, exactRuns: [], distinctContextCount: 0, reason: 'no exact fingerprint observed under the frozen contract' };
}
