// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — semantic response hook core (SPEC §44).
//
// Narrowly typed helper used by the network observer: resolves an admitted
// expectation for a response, evaluates the transient raw body text, and
// returns ONLY safe findings. The raw text is a transient argument — it never
// leaves this function and never enters any returned value.
// ---------------------------------------------------------------------------

import type { SemanticExpectation, SourceSnapshot } from '../expectations/types';
import { evaluateSemanticResponse } from './runner';
import type { SemanticOracleFinding } from './types';

export interface SemanticHookOracle {
  expectationFor(input: { url: string; method: string; contentType?: string }): SemanticExpectation | null;
  sourceSnapshot(): SourceSnapshot | null;
}

export interface SemanticHookInput {
  readonly oracle: SemanticHookOracle;
  /** Transient, in-memory raw response text (bounded by the caller). */
  readonly rawText: string;
  readonly status: number;
  readonly contentType?: string;
  readonly url: string;
  readonly method: string;
  readonly journeyId?: string;
  readonly stepId?: string;
}

export interface SemanticHookResult {
  readonly findings: readonly SemanticOracleFinding[];
}

/** Evaluate one complete 2xx JSON response through the semantic channel.
 *  Returns only safe findings; raw text is discarded. */
export function evaluateSemanticHook(input: SemanticHookInput): SemanticHookResult {
  if (input.status < 200 || input.status >= 300) return { findings: [] };
  const expectation = input.oracle.expectationFor({ url: input.url, method: input.method, contentType: input.contentType });
  if (expectation === null) return { findings: [] };
  let rawValue: unknown;
  try {
    rawValue = JSON.parse(input.rawText);
  } catch {
    return { findings: [] };
  }
  const evaluation = evaluateSemanticResponse({
    oracleId: expectation.expectationId,
    expectation,
    rawValues: [rawValue],
    sourceSnapshot: input.oracle.sourceSnapshot(),
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    operationId: expectation.targetId,
  });
  return { findings: evaluation.outcome === 'ANOMALY' ? evaluation.findings : [] };
}
