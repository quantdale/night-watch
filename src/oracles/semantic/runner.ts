// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — semantic response runner (integration convenience).
//
// Bounded ephemeral pipeline: raw value(s) -> projection (fresh context) ->
// expectation evaluation -> safe findings. The raw values and the context
// exist only for the duration of this call; only the safe evaluation result
// is returned. Used by the Phase 5 semantic stage and the network observer
// hook with the SAME code path.
// ---------------------------------------------------------------------------

import {
  DEFAULT_PROJECTION_LIMITS,
  ProjectionContext,
  SemanticProjectionError,
  SEMANTIC_PROJECTION_LIMIT_EXCEEDED,
  SEMANTIC_PROJECTION_UNSUPPORTED_INPUT,
  projectValue,
  type ProjectionLimits,
} from '../projections';
import type { SemanticExpectation, SourceSnapshot } from '../expectations/types';
import {
  evaluateSemanticExpectation,
  type SemanticEvaluationInput,
  type SemanticEvaluationResult,
} from './oracle';

export interface SemanticResponseEvaluationInput {
  readonly oracleId: string;
  readonly expectation: SemanticExpectation;
  /** Ephemeral raw values: one for single-projection targets, two (before,
   *  after) for JOURNEY_TRANSITION targets. Never persisted. */
  readonly rawValues: readonly unknown[];
  readonly sourceSnapshot: SourceSnapshot | null;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
  readonly limits?: ProjectionLimits;
}

export function evaluateSemanticResponse(input: SemanticResponseEvaluationInput): SemanticEvaluationResult {
  const limits = input.limits ?? DEFAULT_PROJECTION_LIMITS;
  const ctx = new ProjectionContext(limits);
  let projections;
  try {
    projections = input.rawValues.map((value) => projectValue(value, ctx, limits).projection);
  } catch (error) {
    if (error instanceof SemanticProjectionError) {
      if (error.classification === SEMANTIC_PROJECTION_LIMIT_EXCEEDED) {
        return { outcome: 'PROJECTION_LIMIT_EXCEEDED', findings: [], invariantEvaluations: [] };
      }
      if (error.classification === SEMANTIC_PROJECTION_UNSUPPORTED_INPUT) {
        return { outcome: 'INVALID_INPUT', findings: [], invariantEvaluations: [] };
      }
    }
    // A privacy violation must never be swallowed: rethrow as a Nightwatch
    // defect, never as a semantic outcome.
    throw error;
  }
  const evaluationInput: SemanticEvaluationInput = {
    oracleId: input.oracleId,
    expectation: input.expectation,
    projections,
    ctx,
    sourceSnapshot: input.sourceSnapshot,
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
  };
  return evaluateSemanticExpectation(evaluationInput);
}
