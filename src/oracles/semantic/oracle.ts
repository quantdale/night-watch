// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — deterministic semantic oracle (SPEC §15, §28, §40-43,
// §45).
//
// `evaluateSemanticExpectation` evaluates an ADMITTED expectation against one
// or two safe projections (single-projection invariants for API_OPERATION /
// JOURNEY_STEP targets; cross-step invariants for JOURNEY_TRANSITION
// targets) and emits `SemanticOracleFinding` DTOs for violated invariants.
//
// Fail-closed classification order:
//   1. source snapshot unavailable -> EXPECTATION_UNAVAILABLE (no finding)
//   2. expectation source stale      -> EXPECTATION_SOURCE_STALE (no finding)
//   3. projection limit exceeded     -> PROJECTION_LIMIT_EXCEEDED (no finding)
//   4. invariant INVALID_INPUT       -> INVALID_INPUT outcome (no finding)
//   5. all invariants PASS/N/A       -> PASS / NOT_APPLICABLE (no finding)
//   6. any invariant VIOLATED        -> ANOMALY + one finding per violation
//
// Protocol failure short-circuits at the caller (a body that cannot be
// safely interpreted is never semantically evaluated).
// ---------------------------------------------------------------------------

import type { ProjectionContext } from '../projections/identity';
import { projectionDigest, type SemanticProjection } from '../projections';
import { resolveExpectationFreshness } from '../expectations/provenance';
import { evaluateInvariant } from '../invariants/evaluate';
import type { InvariantEvaluation, SemanticOutcome } from '../invariants/types';
import type { SemanticExpectation, SourceSnapshot } from '../expectations/types';
import { semanticFindingFingerprint } from './fingerprint';
import {
  SEMANTIC_ORACLE_FINDING_VERSION,
  validateSemanticFinding,
  type SemanticFindingCategory,
  type SemanticOracleFinding,
} from './types';
import crypto from 'node:crypto';

export interface SemanticEvaluationInput {
  readonly oracleId: string;
  readonly expectation: SemanticExpectation;
  /** One projection for single-projection targets; two (before, after) for
   *  JOURNEY_TRANSITION targets. */
  readonly projections: readonly SemanticProjection[];
  readonly ctx: ProjectionContext;
  /** Current source snapshot; null when no source is resolvable. */
  readonly sourceSnapshot: SourceSnapshot | null;
  readonly journeyId?: string;
  readonly stepId?: string;
  readonly operationId?: string;
}

export interface SemanticEvaluationResult {
  readonly outcome: SemanticOutcome;
  readonly findings: readonly SemanticOracleFinding[];
  readonly invariantEvaluations: readonly InvariantEvaluation[];
}

function categoryForInvariant(
  invariantKind: string,
  expectedClass: string,
  observedClass: string,
  relationId: string | undefined,
): SemanticFindingCategory {
  if (invariantKind === 'ENVELOPE_CLASS' && expectedClass === 'SUCCESS_ENVELOPE' && observedClass === 'ERROR_ENVELOPE') {
    return 'APPLICATION_ERROR_ENVELOPE';
  }
  if (invariantKind === 'IDENTITY_PRESENT_IN_COLLECTION') return 'LIST_DETAIL_IDENTITY_MISMATCH';
  if (invariantKind === 'SHAPE_CHANGED' && expectedClass === 'CHANGE' && observedClass === 'UNCHANGED') {
    return 'STALE_STATE_AFTER_TRANSITION';
  }
  if (invariantKind === 'NUMERIC_SUM_RELATION' && relationId !== undefined) return 'AGGREGATE_RELATION_MISMATCH';
  if (invariantKind === 'COUNT_RELATION' && relationId !== undefined) return 'CARDINALITY_RELATION_MISMATCH';
  if (invariantKind === 'IDENTITY_UNIQUENESS' && relationId !== undefined) return 'IDENTITY_UNIQUENESS_VIOLATION';
  if (invariantKind === 'PAGINATION_WINDOW' && relationId !== undefined) return 'PAGINATION_WINDOW_MISMATCH';
  if (invariantKind === 'EMPTY_STATE_CONSISTENCY' && relationId !== undefined) return 'EMPTY_STATE_CONTRADICTION';
  if (invariantKind === 'STATE_RELATION' && relationId !== undefined) return 'STATE_RELATION_MISMATCH';
  if (invariantKind === 'SURFACE_EQUIVALENCE' && relationId !== undefined) return 'CROSS_SURFACE_MISMATCH';
  // Phase 11: COLLECTION_ITEM_CONTRACT violations are item-level contract
  // mismatches surfaced as a single finding per invariant.
  if (invariantKind === 'COLLECTION_ITEM_CONTRACT') return 'SOURCE_EXPECTATION_MISMATCH';
  return 'SOURCE_EXPECTATION_MISMATCH';
}

function observedClassFor(invariant: InvariantEvaluation, expectation: SemanticExpectation): string {
  switch (invariant.invariantKind) {
    case 'ENVELOPE_CLASS':
      return 'ERROR_ENVELOPE';
    case 'IDENTITY_PRESENT_IN_COLLECTION':
      return 'IDENTITY_ABSENT_FROM_COLLECTION';
    case 'SHAPE_CHANGED':
      return 'UNCHANGED';
    case 'NUMERIC_SUM_RELATION':
    case 'COUNT_RELATION':
      return 'RELATION_MISMATCH';
    case 'IDENTITY_UNIQUENESS':
      return 'DUPLICATE_IDENTITY';
    case 'PAGINATION_WINDOW':
      return 'WINDOW_IDENTITY_OVERLAP';
    case 'EMPTY_STATE_CONSISTENCY':
      return 'EMPTY_STATE_CONTRADICTED';
    case 'STATE_RELATION':
      return 'STATE_RELATION_CONTRADICTED';
    case 'SURFACE_EQUIVALENCE':
      return 'SURFACE_NOT_EQUIVALENT';
    case 'FIELD_PRESENT':
    case 'FIELD_ABSENT':
      return 'FIELD_PRESENCE_CONTRADICTED';
    case 'TYPE_MATCH':
    case 'TYPE_IN_SET':
      return 'TYPE_CONTRADICTED';
    case 'COLLECTION_ITEM_CONTRACT':
      return 'COLLECTION_ITEM_CONTRACT_VIOLATED';
    default:
      return expectation.expectationId;
  }
}

function expectedClassFor(invariant: InvariantEvaluation): string {
  switch (invariant.invariantKind) {
    case 'ENVELOPE_CLASS':
      return 'SUCCESS_ENVELOPE';
    case 'IDENTITY_PRESENT_IN_COLLECTION':
      return 'IDENTITY_PRESENT_IN_COLLECTION';
    case 'SHAPE_CHANGED':
      return 'CHANGE';
    case 'NUMERIC_SUM_RELATION':
      return 'SUM_EQUALS';
    case 'COUNT_RELATION':
      return 'COUNT_EQUALS';
    case 'IDENTITY_UNIQUENESS':
      return 'IDENTITY_UNIQUE';
    case 'PAGINATION_WINDOW':
      return 'WINDOW_IDENTITIES_DISJOINT';
    case 'EMPTY_STATE_CONSISTENCY':
      return 'EMPTY_STATE_CONSISTENT';
    case 'STATE_RELATION':
      return 'STATE_RELATION_ALLOWED';
    case 'SURFACE_EQUIVALENCE':
      return 'SURFACES_EQUIVALENT';
    case 'FIELD_PRESENT':
      return 'FIELD_PRESENT';
    case 'FIELD_ABSENT':
      return 'FIELD_ABSENT';
    case 'TYPE_MATCH':
      return 'TYPE_MATCH';
    case 'TYPE_IN_SET':
      return 'TYPE_IN_SET';
    case 'COLLECTION_ITEM_CONTRACT':
      return 'COLLECTION_ITEM_CONTRACT';
    default:
      return invariant.invariantKind;
  }
}

export function evaluateSemanticExpectation(input: SemanticEvaluationInput): SemanticEvaluationResult {
  const { expectation, projections } = input;
  const freshness = resolveExpectationFreshness(expectation, input.sourceSnapshot);
  if (freshness === 'EXPECTATION_SOURCE_UNAVAILABLE') {
    return { outcome: 'EXPECTATION_UNAVAILABLE', findings: [], invariantEvaluations: [] };
  }
  if (freshness === 'EXPECTATION_SOURCE_STALE') {
    return { outcome: 'EXPECTATION_SOURCE_STALE', findings: [], invariantEvaluations: [] };
  }

  const evaluations = expectation.invariantDefinitions.map((invariant) => evaluateInvariant(invariant, projections, input.ctx));
  const violations = evaluations.filter((evaluation) => evaluation.verdict === 'VIOLATED');
  const invalid = evaluations.some((evaluation) => evaluation.verdict === 'INVALID_INPUT');
  const anyPass = evaluations.some((evaluation) => evaluation.verdict === 'PASS');

  if (invalid) return { outcome: 'INVALID_INPUT', findings: [], invariantEvaluations: evaluations };
  if (violations.length === 0) {
    // Phase 11: check for partial coverage (all PASS but truncated collection)
    const partialCoverage = evaluations.some(e => e.coverageState === 'PARTIAL_COVERAGE_NO_VIOLATION');
    if (partialCoverage) {
      return {
        outcome: 'PARTIAL_COVERAGE',
        findings: [],
        invariantEvaluations: evaluations,
      };
    }
    return {
      outcome: anyPass ? 'PASS' : 'NOT_APPLICABLE',
      findings: [],
      invariantEvaluations: evaluations,
    };
  }

  const digests = projections.map(projectionDigest);
  const findings: SemanticOracleFinding[] = violations.map((violation) => {
    const expectedClass = expectedClassFor(violation);
    const observedClass = observedClassFor(violation, expectation);
    const category = categoryForInvariant(violation.invariantKind, expectedClass, observedClass, violation.relationId);
    const relationId = violation.relationId;
    const fingerprint = semanticFindingFingerprint({
      oracleId: input.oracleId,
      category,
      expectationId: expectation.expectationId,
      expectedClass,
      observedClass,
      relationId,
      sourceProvenance: expectation.sourceProvenance,
    });
    const findingId = `finding:sha256:${crypto.createHash('sha256').update(fingerprint + digests.join('|'), 'utf8').digest('hex').slice(0, 24)}`;
    const finding: SemanticOracleFinding = {
      schemaVersion: SEMANTIC_ORACLE_FINDING_VERSION,
      findingId,
      oracleId: input.oracleId,
      category,
      severity: 'ANOMALY',
      ...(input.journeyId === undefined ? {} : { journeyId: input.journeyId }),
      ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
      ...(input.operationId === undefined ? {} : { operationId: input.operationId }),
      expectationId: expectation.expectationId,
      sourceProvenance: expectation.sourceProvenance,
      expectedClass,
      observedClass,
      projectionDigests: digests,
      ...(relationId === undefined ? {} : { relationId }),
    };
    validateSemanticFinding(finding);
    return finding;
  });

  return { outcome: 'ANOMALY', findings, invariantEvaluations: evaluations };
}
