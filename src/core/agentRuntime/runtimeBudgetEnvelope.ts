// ---------------------------------------------------------------------------
// Runtime budget envelope authority. LOCAL environment only.
//
// The engine's `defaultAgentBudgetPolicy(ceilingName)` is the SINGLE authority
// for every shared runtime ceiling. A wave may declare a runtime envelope (for
// its freeze artifact), but that declaration is a derived copy that is
// validated field-by-field against the engine before any provider call; it can
// never independently redefine a ceiling. A disagreement fails closed with the
// mismatching field names rather than silently picking one value.
//
// This closes the W12/D-138 defect class: a frozen supplemental envelope
// recorded providerFailures=3 / consecutiveFailures=3 while the live HOUR_1
// policy enforced 8 / 6, and nothing compared them.
// ---------------------------------------------------------------------------

import {
  defaultAgentBudgetPolicy,
  type AgentBudgetCeilingName,
  type AgentBudgetPolicy,
} from '../agentProtocol';

export const RUNTIME_BUDGET_ENVELOPE_VERSION = 'nightwatch.runtime-budget-envelope.v1' as const;

/**
 * The subset of AgentBudgetPolicy a wave freeze may declare. `wallTimeMs` is
 * deliberately absent: each run's wall-clock ceiling is run-specific and is
 * bound by the evaluation freeze's own matrix, not by the engine envelope.
 */
export interface RuntimeBudgetEnvelope {
  readonly schemaVersion: typeof RUNTIME_BUDGET_ENVELOPE_VERSION;
  readonly ceilingName: AgentBudgetCeilingName;
  readonly reasonerCalls: number;
  readonly toolActions: number;
  readonly inputBytes: number;
  readonly outputBytes: number;
  readonly toolPayloadBytes: number;
  readonly failures: number;
  readonly consecutiveFailures: number;
  readonly providerFailures: number;
}

export const RUNTIME_BUDGET_ENVELOPE_FIELDS = Object.freeze([
  'ceilingName',
  'reasonerCalls',
  'toolActions',
  'inputBytes',
  'outputBytes',
  'toolPayloadBytes',
  'failures',
  'consecutiveFailures',
  'providerFailures',
] as const);

export function envelopeFromBudgetPolicy(policy: AgentBudgetPolicy): RuntimeBudgetEnvelope {
  return {
    schemaVersion: RUNTIME_BUDGET_ENVELOPE_VERSION,
    ceilingName: policy.ceilingName,
    reasonerCalls: policy.reasonerCalls,
    toolActions: policy.toolActions,
    inputBytes: policy.inputBytes,
    outputBytes: policy.outputBytes,
    toolPayloadBytes: policy.toolPayloadBytes,
    failures: policy.failures,
    consecutiveFailures: policy.consecutiveFailures,
    providerFailures: policy.providerFailures,
  };
}

export function deriveRuntimeBudgetEnvelope(ceilingName: AgentBudgetCeilingName): RuntimeBudgetEnvelope {
  return envelopeFromBudgetPolicy(defaultAgentBudgetPolicy(ceilingName));
}

export interface RuntimeBudgetEnvelopeMismatch {
  readonly field: string;
  readonly declared: unknown;
  readonly derived: unknown;
}

export type RuntimeBudgetEnvelopeCheck =
  | { readonly ok: true; readonly envelope: RuntimeBudgetEnvelope }
  | { readonly ok: false; readonly code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED'; readonly detail: string }
  | {
      readonly ok: false;
      readonly code: 'RUNTIME_BUDGET_ENVELOPE_MISMATCH';
      readonly mismatches: readonly RuntimeBudgetEnvelopeMismatch[];
    };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a declared envelope against the engine-derived one. Field-level:
 * every mismatch is reported by name with both values, so an operator sees
 * exactly which ceiling diverged. Unknown fields and malformed values fail
 * closed as well; a declared envelope is never partially trusted.
 */
export function checkRuntimeBudgetEnvelope(declared: unknown, derived: RuntimeBudgetEnvelope): RuntimeBudgetEnvelopeCheck {
  if (!isPlainRecord(declared)) {
    return { ok: false, code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED', detail: 'declared runtime budget envelope is not an object' };
  }
  if (declared.schemaVersion !== RUNTIME_BUDGET_ENVELOPE_VERSION) {
    return {
      ok: false,
      code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED',
      detail: `declared runtime budget envelope schemaVersion must be ${RUNTIME_BUDGET_ENVELOPE_VERSION}`,
    };
  }
  // M5 (6.7/C-16): an envelope declared before the `retries` -> `failures`
  // rename is read under the old name and compared under the new one. The
  // envelope is a declared, owner-authored copy of the engine policy (D-139),
  // so accepting its previous field name is a read-compatibility widening,
  // never a second authority.
  const normalizedDeclared: Record<string, unknown> =
    !('failures' in declared) && 'retries' in declared
      ? { ...(declared as Record<string, unknown>), failures: (declared as Record<string, unknown>)['retries'] }
      : (declared as Record<string, unknown>);
  for (const key of Object.keys(normalizedDeclared)) {
    if (key === 'schemaVersion') continue;
    if (key === 'retries') continue;
    if (!(RUNTIME_BUDGET_ENVELOPE_FIELDS as readonly string[]).includes(key)) {
      return { ok: false, code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED', detail: `declared runtime budget envelope has unknown field ${key}` };
    }
  }
  const mismatches: RuntimeBudgetEnvelopeMismatch[] = [];
  for (const field of RUNTIME_BUDGET_ENVELOPE_FIELDS) {
    if (!(field in normalizedDeclared)) {
      return { ok: false, code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED', detail: `declared runtime budget envelope is missing field ${field}` };
    }
    const value = normalizedDeclared[field];
    const expected = derived[field];
    if (field === 'ceilingName') {
      if (value !== expected) mismatches.push({ field, declared: value, derived: expected });
      continue;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      return { ok: false, code: 'RUNTIME_BUDGET_ENVELOPE_MALFORMED', detail: `declared runtime budget envelope field ${field} must be a non-negative integer` };
    }
    if (value !== expected) mismatches.push({ field, declared: value, derived: expected });
  }
  if (mismatches.length > 0) return { ok: false, code: 'RUNTIME_BUDGET_ENVELOPE_MISMATCH', mismatches };
  return { ok: true, envelope: derived };
}
