// ---------------------------------------------------------------------------
// Nightwatch Phase 10B — deterministic deep-acceptance mechanics (authorization
// §8, §9, §10, §16).
//
// Phase 9B only needed a decisive semantic evaluation. Phase 10B validates
// the NEW L3 contract: the current deep expectation's ITEM-LEVEL type
// invariant must itself be decisive. A root-array PASS alone is NOT deep
// validation, and an empty top-level array (item invariants NOT_APPLICABLE)
// is explicitly NOT acceptance (PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED).
//
// This module is ADDITIVE and PURE: it reuses the existing Phase 9B summary
// pure mechanics (summarizePhase9bPass / comparePhase9bReplaySummaries /
// evaluatePhase9bAcceptance) and adds the deep acceptance gate on top. It
// performs NO network, NO fs, NO child processes, and NO persistence
// (hardening-guarded). No receipt-schema change: the aggregate counts in the
// existing receipt/summary surface are sufficient for the fixed
// common-exchange canary (authorization §10).
// ---------------------------------------------------------------------------

import type { SemanticExpectation } from '../../oracles/expectations/types';
import {
  evaluatePhase9bAcceptance,
  type Phase9bAcceptanceChecks,
  type Phase9bSemanticSummary,
} from '../phase9b/summary';
import type { Phase9bFreshnessBlockReason } from '../phase9b/freshness';


/** The fixed Phase 10B deep item-level type contract that must be proven
 *  present in the RESOLVED expectation before any acceptance comparison
 *  (authorization §7/§8: do not hard-code counts independently of the
 *  resolved expectation). */
// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface DeepTypeContract {
  /** Item-relative safe path, e.g. ['0', 'exchange_rate']. */
  readonly path: readonly string[];
  readonly kind: 'TYPE_MATCH';
  readonly expectedType: 'OBJECT';
}

/** The exact Phase 10B fixed deep contract (source-derived; see the registry
 *  blueprint + PHP_ITEM_FIELD_TYPE_FLOW EMPTY_CAST_OBJECT). */
export const PHASE_10B_DEEP_TYPE_CONTRACT: DeepTypeContract = {
  path: ['0', 'exchange_rate'],
  kind: 'TYPE_MATCH',
  expectedType: 'OBJECT',
};

/** Derive the expected invariant total from the ACTUAL resolved deep
 *  expectation — never hard-code it independently of the registry. */
export function expectedInvariantTotalFor(expectation: SemanticExpectation): number {
  return expectation.invariantDefinitions.length;
}

function matchesDeepContract(invariant: SemanticExpectation['invariantDefinitions'][number], contract: DeepTypeContract): boolean {
  if (invariant.kind !== contract.kind) return false;
  if (invariant.path.length !== contract.path.length) return false;
  for (let index = 0; index < contract.path.length; index += 1) {
    if (invariant.path[index] !== contract.path[index]) return false;
  }
  return invariant.expectedType === contract.expectedType;
}

/** Prove the expected L3 item type contract exists in the RESOLVED deep
 *  expectation. Throws PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT when absent
 *  (authorization §7/§16 — no DEV contact on drift). */
export function assertDeepTypeContract(
  expectation: SemanticExpectation,
  contract: DeepTypeContract = PHASE_10B_DEEP_TYPE_CONTRACT,
): void {
  if (!expectation.invariantDefinitions.some((invariant) => matchesDeepContract(invariant, contract))) {
    throw new Error(
      `PHASE_10B_BLOCKED_DEEP_EXPECTATION_DRIFT: resolved expectation ${expectation.expectationId} ` +
        `does not carry the required deep ${contract.kind} [${contract.path.join(', ')}] ${contract.expectedType} contract ` +
        `(invariant definitions: ${expectation.invariantDefinitions.map((i) => i.kind).join(',')})`,
    );
  }
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface Phase10bDeepAcceptanceChecks {
  readonly pass: boolean;
  readonly failures: readonly string[];
}

/**
 * One-pass Phase 10B deep acceptance gate (authorization §8, §9, §29, §31,
 * §32):
 *
 *   1. the Phase 9B binding gate (resolved expectation + receipt + decisive
 *      evaluation, zero hard outcomes, exact expectation id / source SHA /
 *      evidence digest);
 *   2. the DEEP requirement: the observed invariant totals must equal the
 *      expected total derived from the resolved expectation, EVERY invariant
 *      must PASS, zero N/A (an N/A pass means the deep item-level type
 *      invariant was not exercised — NOT acceptance), zero violations, zero
 *      findings.
 *
 * A clean PASS therefore proves every current invariant — including the L3
 * item type contract — was actually evaluated and passed.
 */
export function evaluatePhase10bDeepAcceptance(
  summary: Phase9bSemanticSummary,
  expected: { expectationId: string; approvedSha: string; expectedInvariantTotal: number },
): Phase10bDeepAcceptanceChecks {
  const base: Phase9bAcceptanceChecks = evaluatePhase9bAcceptance(summary, {
    expectationId: expected.expectationId,
    approvedSha: expected.approvedSha,
  });
  const failures: string[] = [...base.failures];
  if (summary.invariantTotal !== expected.expectedInvariantTotal) {
    failures.push(`invariantTotal ${summary.invariantTotal} != expected ${expected.expectedInvariantTotal}`);
  }
  if (summary.invariantPassCount !== summary.invariantTotal) {
    failures.push(`invariantPassCount ${summary.invariantPassCount} != invariantTotal ${summary.invariantTotal}`);
  }
  if (summary.invariantNaCount !== 0) {
    failures.push(
      `PHASE_10B_BLOCKED_DEEP_INVARIANT_NOT_OBSERVED: invariantNaCount ${summary.invariantNaCount} > 0 — the deep item-level type invariant was not exercised (root-only PASS is NOT deep validation)`,
    );
  }
  if (summary.invariantViolationCount !== 0) {
    failures.push(`invariantViolationCount ${summary.invariantViolationCount} != 0`);
  }
  if (summary.findingCount !== 0) {
    failures.push(`findingCount ${summary.findingCount} != 0`);
  }
  return { pass: failures.length === 0, failures };
}

/** Map a shared source-freshness BLOCK reason to the exact Phase 10B blocker
 *  token (authorization §14, §15, §37). */
export function phase10bFreshnessBlockToken(reason: Phase9bFreshnessBlockReason): string {
  switch (reason) {
    case 'SOURCE_FRESHNESS_UNRESOLVED':
      return 'PHASE_10B_BLOCKED_SOURCE_FRESHNESS_UNRESOLVED';
    case 'REAL_SOURCE_CONTRACT_DRIFT':
      return 'PHASE_10B_BLOCKED_REAL_SOURCE_DEEP_CONTRACT_DRIFT';
    case 'JOURNEY_SOURCE_DRIFT':
      return 'PHASE_10B_BLOCKED_JOURNEY_SOURCE_DRIFT';
  }
}
