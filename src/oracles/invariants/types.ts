// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — cross-step invariant evaluation contracts.
//
// This layer consumes ONLY safe SemanticProjection objects plus declarative
// invariant contracts. It never receives original raw response bodies; raw
// numeric values are read ephemerally through ProjectionContext numeric refs
// and only relation facts are emitted (SPEC §12, §22).
// ---------------------------------------------------------------------------

import type { InvariantKind, SemanticExpectation } from '../expectations/types';
import type { SemanticProjection } from '../projections/types';

export type InvariantVerdict = 'PASS' | 'VIOLATED' | 'NOT_APPLICABLE' | 'INVALID_INPUT';

export interface InvariantEvaluation {
  readonly invariantKind: InvariantKind;
  readonly verdict: InvariantVerdict;
  readonly relationId?: string;
}

/** Expectation evaluation outcome; NOT_APPLICABLE/EXPECTATION_UNAVAILABLE are
 *  never anomalies (SPEC §31). */
export type SemanticOutcome =
  | 'PASS'
  | 'ANOMALY'
  | 'NOT_APPLICABLE'
  | 'EXPECTATION_UNAVAILABLE'
  | 'EXPECTATION_SOURCE_STALE'
  | 'EXPECTATION_INVALID'
  | 'INVALID_INPUT'
  | 'PROJECTION_LIMIT_EXCEEDED';

export interface SemanticExpectationEvaluation {
  readonly expectation: SemanticExpectation;
  readonly outcome: SemanticOutcome;
  readonly invariantEvaluations: readonly InvariantEvaluation[];
}

export type { SemanticProjection };
