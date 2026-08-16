// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — Phase 5 API semantic evaluation stage (SPEC §45).
//
// `evaluateApiResponse` (protocol) stays untouched; this module composes it
// with the deterministic semantic channel. Protocol failure short-circuits
// semantic evaluation when the body cannot be safely interpreted. Protocol
// PASS is NOT semantic PASS.
// ---------------------------------------------------------------------------

import { evaluateApiResponse } from './oracle';
import type { ApiOperation, ApiOracleObservation } from './types';
import { evaluateSemanticResponse, type SemanticEvaluationResult } from '../../oracles/semantic';
import type { SemanticExpectation, SourceSnapshot } from '../../oracles/expectations';

export type SemanticChannelStatus =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'EXPECTATION_UNAVAILABLE'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_INVALID'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED'
  | 'NOT_EVALUATED';

export interface SemanticChannelResult {
  readonly status: SemanticChannelStatus;
  readonly findings: SemanticEvaluationResult['findings'];
  readonly notEvaluatedReason?: 'PROTOCOL_NOT_PASS' | 'NO_EXPECTATION';
}

export interface ComposedApiEvaluation {
  readonly protocol: ApiOracleObservation;
  readonly semantic: SemanticChannelResult;
}

export interface SemanticApiEvaluationInput {
  readonly operation: ApiOperation;
  readonly status: number;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: Uint8Array;
  readonly complete?: boolean;
  /** Admitted source-backed expectation for this operation, if any. */
  readonly expectation?: SemanticExpectation | null;
  readonly sourceSnapshot?: SourceSnapshot | null;
  readonly journeyId?: string;
  readonly stepId?: string;
}

function notEvaluated(reason: 'PROTOCOL_NOT_PASS' | 'NO_EXPECTATION'): SemanticChannelResult {
  return { status: 'NOT_EVALUATED', findings: [], notEvaluatedReason: reason };
}

/** Two-stage evaluation: existing protocol oracle + Phase 9 semantic oracle. */
export function evaluateApiResponseSemantic(input: SemanticApiEvaluationInput): ComposedApiEvaluation {
  const protocol = evaluateApiResponse(input.operation, input.status, input.headers, input.body, input.complete);
  if (protocol.result !== 'ORACLE_PASS') {
    return { protocol, semantic: notEvaluated('PROTOCOL_NOT_PASS') };
  }
  const expectation = input.expectation ?? null;
  if (expectation === null) {
    return { protocol, semantic: notEvaluated('NO_EXPECTATION') };
  }
  let rawValue: unknown;
  try {
    rawValue = JSON.parse(Buffer.from(input.body).toString('utf8'));
  } catch {
    // The protocol oracle already proved parseability; this is defensive only.
    return { protocol, semantic: { status: 'INVALID_INPUT', findings: [] } };
  }
  const evaluation = evaluateSemanticResponse({
    oracleId: expectation.expectationId,
    expectation,
    rawValues: [rawValue],
    sourceSnapshot: input.sourceSnapshot ?? null,
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    operationId: input.operation.operationId,
  });
  return { protocol, semantic: { status: evaluation.outcome, findings: evaluation.findings } };
}
