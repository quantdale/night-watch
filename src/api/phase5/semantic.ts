// ---------------------------------------------------------------------------
// Nightwatch Phase 9 / 9A.1 — Phase 5 API semantic evaluation stage (SPEC
// §27, §45).
//
// `evaluateApiResponse` (protocol) stays untouched; this module composes it
// with the deterministic semantic channel. Protocol failure short-circuits
// semantic evaluation when the body cannot be safely interpreted. Protocol
// PASS is NOT semantic PASS.
//
// Phase 9A.1: the semantic channel is atomic — the caller passes the
// RESOLUTION (expectation + its exact source snapshot) and every evaluation
// yields a safe semantic-evaluation receipt distinguishing PASS /
// NO_EXPECTATION / STALE / UNAVAILABLE / N/A / ANOMALY / INVALID_INPUT /
// PROJECTION_LIMIT_EXCEEDED / INTERNAL_ERROR. A later DEV run must never
// infer PASS from findings.length === 0.
// ---------------------------------------------------------------------------

import { evaluateApiResponse } from './oracle';
import type { ApiOperation, ApiOracleObservation } from './types';
import { evaluateSemanticResolution } from '../../oracles/semantic/hook';
import type { SemanticEvaluationReceipt } from '../../oracles/semantic/receipts';
import type { RealSourceResolution } from '../../oracles/expectations/resolver';

// Phase 15P A15 convergence: semantic channel shapes are module-private.
type SemanticChannelStatus =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'NO_EXPECTATION'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_SOURCE_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'NOT_EVALUATED'
  | 'PARTIAL_COVERAGE';

interface SemanticChannelResult {
  readonly status: SemanticChannelStatus;
  readonly findings: readonly import('../../oracles/semantic').SemanticOracleFinding[];
  /** Phase 9A.1: the safe evaluation receipt (null only when the semantic
   *  channel was not entered because the protocol stage failed). */
  readonly receipt: SemanticEvaluationReceipt | null;
  readonly notEvaluatedReason?: 'PROTOCOL_NOT_PASS';
}

interface ComposedApiEvaluation {
  readonly protocol: ApiOracleObservation;
  readonly semantic: SemanticChannelResult;
}

interface SemanticApiEvaluationInput {
  readonly operation: ApiOperation;
  readonly status: number;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: Uint8Array;
  readonly complete?: boolean;
  /** Atomic resolution (expectation + exact source snapshot). */
  readonly resolution: RealSourceResolution;
  readonly journeyId?: string;
  readonly stepId?: string;
}

/** Two-stage evaluation: existing protocol oracle + Phase 9 semantic oracle. */
export function evaluateApiResponseSemantic(input: SemanticApiEvaluationInput): ComposedApiEvaluation {
  const protocol = evaluateApiResponse(input.operation, input.status, input.headers, input.body, input.complete);
  if (protocol.result !== 'ORACLE_PASS') {
    return { protocol, semantic: { status: 'NOT_EVALUATED', findings: [], receipt: null, notEvaluatedReason: 'PROTOCOL_NOT_PASS' } };
  }
  const result = evaluateSemanticResolution({
    resolution: input.resolution,
    rawText: Buffer.from(input.body).toString('utf8'),
    targetId: input.operation.operationId,
    ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
    ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
    operationId: input.operation.operationId,
  });
  return {
    protocol,
    semantic: {
      status: result.receipt?.outcome === undefined ? 'NOT_EVALUATED' : result.receipt.outcome,
      findings: result.findings,
      receipt: result.receipt,
    },
  };
}
