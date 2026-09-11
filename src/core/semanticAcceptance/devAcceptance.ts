// ---------------------------------------------------------------------------
// Nightwatch group 11 — contained DEV acceptance assertion (F-10, task 11.2).
//
// `evaluatePhase9bAcceptance` / `evaluatePhase10bDeepAcceptance` are the raw
// mechanics gates. They can pass over synthetic fixture summaries, which is
// exactly why the ACCEPTANCE assertion is a separate, strict function: DEV
// acceptance requires evidence classified CONTAINED_DEV. A local synthetic
// pass therefore never satisfies a DEV acceptance assertion.
//
// The pre-browser auth gate (task 11.5) is asserted by stage: acceptance may
// only be requested after the auth gate has passed, never around it.
//
// Pure: no network, no fs, no child processes, no persistence.
// ---------------------------------------------------------------------------

import {
  evaluatePhase9bAcceptance,
  type Phase9bSemanticSummary,
} from '../phase9b/summary';
import { evaluatePhase10bDeepAcceptance } from '../phase10b/deepAcceptance';
import { DEFAULT_SEMANTIC_EVIDENCE_ACCEPTANCE_CLASS } from '../../oracles/semantic/receipts';

/** The only evidence acceptance class a DEV acceptance assertion accepts. */
export const SEMANTIC_ACCEPTANCE_DEV_EVIDENCE_CLASS = 'CONTAINED_DEV' as const;

export const SEMANTIC_ACCEPTANCE_LOCAL_SYNTHETIC_NEVER_SATISFIES_DEV =
  'SEMANTIC_ACCEPTANCE_LOCAL_SYNTHETIC_NEVER_SATISFIES_DEV' as const;

export const SEMANTIC_ACCEPTANCE_AUTH_GATE_BYPASSED = 'SEMANTIC_ACCEPTANCE_AUTH_GATE_BYPASSED' as const;

export interface ContainedDevAcceptanceChecks {
  readonly pass: boolean;
  readonly failures: readonly string[];
}

function devEvidenceClassFailures(summary: Phase9bSemanticSummary): readonly string[] {
  const classes = summary.evidenceAcceptanceClasses;
  if (classes.length === 1 && classes[0] === SEMANTIC_ACCEPTANCE_DEV_EVIDENCE_CLASS) return [];
  return [
    `${SEMANTIC_ACCEPTANCE_LOCAL_SYNTHETIC_NEVER_SATISFIES_DEV}: evidence acceptance classes [${classes.join(',')}] != [${SEMANTIC_ACCEPTANCE_DEV_EVIDENCE_CLASS}]; default is ${DEFAULT_SEMANTIC_EVIDENCE_ACCEPTANCE_CLASS}`,
  ];
}

/**
 * Phase 9B contained DEV acceptance: the raw per-pass gate AND CONTAINED_DEV
 * evidence only. A synthetic fixture that passes `evaluatePhase9bAcceptance`
 * fails here by construction.
 */
export function evaluateContainedDevAcceptance(
  summary: Phase9bSemanticSummary,
  expected: { expectationId: string; approvedSha: string },
): ContainedDevAcceptanceChecks {
  const base = evaluatePhase9bAcceptance(summary, expected);
  const failures = [...base.failures, ...devEvidenceClassFailures(summary)];
  return { pass: failures.length === 0, failures };
}

/**
 * Phase 10B contained DEV deep acceptance: the deep gate AND CONTAINED_DEV
 * evidence only.
 */
export function evaluateContainedDevDeepAcceptance(
  summary: Phase9bSemanticSummary,
  expected: { expectationId: string; approvedSha: string; expectedInvariantTotal: number },
): ContainedDevAcceptanceChecks {
  const base = evaluatePhase10bDeepAcceptance(summary, expected);
  const failures = [...base.failures, ...devEvidenceClassFailures(summary)];
  return { pass: failures.length === 0, failures };
}

/**
 * Task 11.5: acceptance runs AFTER the pre-browser auth gate, never around
 * it. The DEV runner calls this with the observed auth facts before evaluating
 * any acceptance assertion; a false auth gate with an acceptance request is a
 * hard refusal.
 */
export function assertAcceptanceRunsAfterAuthGate(input: {
  readonly authGatePassed: boolean;
  readonly acceptanceRequested: boolean;
}): void {
  if (input.acceptanceRequested && !input.authGatePassed) {
    throw new Error(
      `${SEMANTIC_ACCEPTANCE_AUTH_GATE_BYPASSED}: acceptance was requested before the pre-browser auth gate passed`,
    );
  }
}

/** The campaign result class an auth-refused run reports: product work is
 *  blocked, not failed, and the run is never an acceptance execution. */
export const SEMANTIC_ACCEPTANCE_AUTH_REFUSAL_RESULT_CLASS = 'PARTIAL_AUTH_BLOCKED' as const;
