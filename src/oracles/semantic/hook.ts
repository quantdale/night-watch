// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — semantic response hook core (SPEC §19, §20, §21,
// §22, §23, §24, §36).
//
// Narrowly typed helper used by the network observer: atomically resolves an
// admitted real-source expectation WITH its exact source snapshot, evaluates
// the transient raw body text, and returns a SAFE EVALUATION RECEIPT + safe
// findings. The raw text is a transient argument — it never leaves this
// function and never enters any returned value.
//
// The hook is TOTAL: it never throws for ordinary semantic input errors. A
// privacy-contract violation (a non-classified exception escaping the
// projection/oracle core) is returned as a safe INTERNAL_ERROR receipt with
// `privacyViolation: true` so the observer can escalate through the existing
// safety architecture — it never becomes findings: [] / PASS / NOT_APPLICABLE
// (SPEC §24).
// ---------------------------------------------------------------------------

import type { SemanticExpectation, SourceSnapshot } from '../expectations/types';
import type { RealSourceResolution } from '../expectations/resolver';
import type { CoverageState } from '../invariants/types';
import { evaluateSemanticResponse } from './runner';
import {
  buildSemanticEvaluationReceipt,
  type SemanticEvaluationReceipt,
  type SemanticReceiptOutcome,
} from './receipts';
import type { SemanticOracleFinding } from './types';

export interface SemanticHookOracle {
  /** Atomic resolution: expectation + the exact verified source snapshot. */
  resolve(input: { targetId?: string; url?: string; method?: string }): RealSourceResolution;
}

export interface SemanticHookInput {
  readonly oracle: SemanticHookOracle;
  /** Transient, in-memory raw response text (bounded by the caller). */
  readonly rawText: string;
  readonly status: number;
  readonly contentType?: string;
  readonly url: string;
  readonly method: string;
  /** Reviewed endpoint semantic rule identity (never a URL substring). */
  readonly targetId?: string;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
}

export interface SemanticHookResult {
  /** The safe evaluation receipt. Null ONLY when the response is outside the
   *  semantic channel (non-2xx — the protocol oracle owns that surface).
   *  NO_EXPECTATION, STALE, UNAVAILABLE, N/A and INTERNAL_ERROR are all
   *  explicit receipt outcomes and are NEVER equal to PASS. */
  readonly receipt: SemanticEvaluationReceipt | null;
  readonly findings: readonly SemanticOracleFinding[];
  /** True when a privacy-contract violation was contained as a safe
   *  INTERNAL_ERROR receipt; the caller must escalate (never benign). */
  readonly privacyViolation?: boolean;
}

export function semanticOutcomeToReceiptOutcome(outcome: string): SemanticReceiptOutcome {
  switch (outcome) {
    case 'PASS':
      return 'PASS';
    case 'ANOMALY':
      return 'ANOMALY';
    case 'NOT_APPLICABLE':
      return 'NOT_APPLICABLE';
    case 'EXPECTATION_UNAVAILABLE':
      return 'EXPECTATION_SOURCE_UNAVAILABLE';
    case 'EXPECTATION_SOURCE_STALE':
      return 'EXPECTATION_SOURCE_STALE';
    case 'INVALID_INPUT':
      return 'INVALID_INPUT';
    case 'PROJECTION_LIMIT_EXCEEDED':
      return 'PROJECTION_LIMIT_EXCEEDED';
    case 'PARTIAL_COVERAGE':
      // Phase 11A.1: partial coverage is a distinct non-pass receipt outcome.
      // It is not an anomaly but it is not full semantic PASS — downstream
      // consumers must treat it as incomplete coverage.
      return 'PARTIAL_COVERAGE';
    case 'EXPECTATION_INVALID':
      // An expectation that fails its own schema is a Nightwatch defect.
      return 'INTERNAL_ERROR';
    default:
      return 'INTERNAL_ERROR';
  }
}

function countsFor(evaluation: { invariantEvaluations: readonly { verdict: string }[] }): {
  total: number;
  pass: number;
  na: number;
  violation: number;
} {
  let total = 0;
  let pass = 0;
  let na = 0;
  let violation = 0;
  for (const item of evaluation.invariantEvaluations) {
    total += 1;
    if (item.verdict === 'PASS') pass += 1;
    else if (item.verdict === 'NOT_APPLICABLE') na += 1;
    else if (item.verdict === 'VIOLATED') violation += 1;
  }
  return { total, pass, na, violation };
}

/** Evaluate one complete 2xx JSON response through the semantic channel.
 *  Returns a safe receipt + findings; raw text is discarded. */
export function evaluateSemanticHook(input: SemanticHookInput): SemanticHookResult {
  if (input.status < 200 || input.status >= 300) return { receipt: null, findings: [] };
  const resolution = input.oracle.resolve({ targetId: input.targetId, url: input.url, method: input.method });
  return evaluateSemanticResolution({
    resolution,
    rawText: input.rawText,
    targetId: input.targetId,
    journeyId: input.journeyId,
    stepId: input.stepId,
    operationId: input.operationId,
  });
}

export interface SemanticResolutionEvaluationInput {
  /** Atomic resolution (expectation + its exact source snapshot). */
  readonly resolution: RealSourceResolution;
  /** Transient, in-memory raw response text (bounded by the caller). */
  readonly rawText: string;
  readonly targetId?: string;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
}

/** Shared evaluation core used by the network observer hook and the Phase 5
 *  composed stage: resolution -> safe receipt + findings. */
export function evaluateSemanticResolution(input: SemanticResolutionEvaluationInput): SemanticHookResult {
  const base = {
    oracleId: 'real-source-semantic-hook',
    targetId: input.targetId,
    journeyId: input.journeyId,
    stepId: input.stepId,
    operationId: input.operationId ?? input.targetId,
  };

  const resolution = input.resolution;

  if (resolution.kind === 'NO_EXPECTATION') {
    const receipt = buildSemanticEvaluationReceipt({
      ...base,
      outcome: 'NO_EXPECTATION',
    });
    return { receipt, findings: [] };
  }
  if (resolution.kind === 'SOURCE_UNAVAILABLE') {
    const receipt = buildSemanticEvaluationReceipt({
      ...base,
      outcome: 'EXPECTATION_SOURCE_UNAVAILABLE',
      expectationId: resolution.expectation.expectationId,
      sourceProvenance: resolution.expectation.sourceProvenance,
    });
    return { receipt, findings: [] };
  }
  if (resolution.kind === 'SOURCE_STALE') {
    const receipt = buildSemanticEvaluationReceipt({
      ...base,
      outcome: 'EXPECTATION_SOURCE_STALE',
      expectationId: resolution.expectation.expectationId,
      sourceProvenance: resolution.expectation.sourceProvenance,
    });
    return { receipt, findings: [] };
  }

  // RESOLVED: expectation + its exact snapshot.
  const { expectation, sourceSnapshot } = resolution;
  let rawValue: unknown;
  try {
    rawValue = JSON.parse(input.rawText);
  } catch {
    const receipt = buildSemanticEvaluationReceipt({
      ...base,
      outcome: 'INVALID_INPUT',
      expectationId: expectation.expectationId,
      sourceProvenance: expectation.sourceProvenance,
    });
    return { receipt, findings: [] };
  }

  let evaluation;
  try {
    evaluation = evaluateSemanticResponse({
      oracleId: 'real-source-semantic-hook',
      expectation,
      rawValues: [rawValue],
      sourceSnapshot,
      ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
      ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
      operationId: input.operationId ?? expectation.targetId,
    });
  } catch {
    // A non-classified exception escaping the projection/oracle core is a
    // privacy-contract violation or a Nightwatch defect. It is NEVER
    // swallowed into findings: [] / PASS / NOT_APPLICABLE: the caller
    // receives a safe INTERNAL_ERROR receipt and must escalate. The suspect
    // expectation's provenance is intentionally NOT echoed into the receipt
    // (the expectation itself may be corrupt).
    const receipt = buildSemanticEvaluationReceipt({
      ...base,
      outcome: 'INTERNAL_ERROR',
      expectationId: expectation.expectationId,
    });
    return { receipt, findings: [], privacyViolation: true };
  }

  const counts = countsFor(evaluation);

  // Phase 11: extract coverage metadata from COLLECTION_ITEM_CONTRACT
  // evaluations for the receipt.
  let coverageState: CoverageState | undefined;
  let inspectedItemCount: number | undefined;
  let violatingItemCount: number | undefined;
  for (const ev of evaluation.invariantEvaluations) {
    if (ev.coverageState !== undefined) {
      coverageState = ev.coverageState;
      inspectedItemCount = ev.inspectedItemCount;
      violatingItemCount = ev.violatingItemCount;
      break;
    }
  }

  const receipt = buildSemanticEvaluationReceipt({
    ...base,
    outcome: semanticOutcomeToReceiptOutcome(evaluation.outcome),
    expectationId: expectation.expectationId,
    sourceProvenance: expectation.sourceProvenance,
    projectionDigests: evaluation.outcome === 'ANOMALY'
      ? evaluation.findings[0]?.projectionDigests ?? []
      : [],
    invariantTotal: counts.total,
    invariantPassCount: counts.pass,
    invariantNaCount: counts.na,
    invariantViolationCount: counts.violation,
    findingCount: evaluation.findings.length,
    ...(coverageState === undefined ? {} : { coverageState }),
    ...(inspectedItemCount === undefined ? {} : { inspectedItemCount }),
    ...(violatingItemCount === undefined ? {} : { violatingItemCount }),
  });
  return { receipt, findings: evaluation.outcome === 'ANOMALY' ? evaluation.findings : [] };
}

/** Re-exported for the observer's defensive catch path. */
export function buildInternalErrorReceipt(input: {
  targetId?: string;
  journeyId?: string;
  stepId?: string;
  operationId?: string;
  expectationId?: string;
  sourceProvenance?: SemanticExpectation['sourceProvenance'];
}): SemanticEvaluationReceipt {
  return buildSemanticEvaluationReceipt({
    oracleId: 'real-source-semantic-hook',
    outcome: 'INTERNAL_ERROR',
    ...(input.targetId === undefined ? {} : { targetId: input.targetId }),
    ...(input.expectationId === undefined ? {} : { expectationId: input.expectationId }),
    ...(input.sourceProvenance === undefined ? {} : { sourceProvenance: input.sourceProvenance }),
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
  });
}

export type { SourceSnapshot };
