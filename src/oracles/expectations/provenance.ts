// ---------------------------------------------------------------------------
// Nightwatch Phase 9 — expectation provenance and source freshness (SPEC
// §18, §52, §53, §58).
//
// Every real-source-derived expectation binds to the source snapshot it was
// derived from. If the current source SHA differs from the expectation's
// provenance, the expected state is EXPECTATION_SOURCE_STALE (fail-closed):
// evaluation must NOT proceed as if current. Never continue applying a stale
// product expectation silently.
// ---------------------------------------------------------------------------

import { validateExpectation } from './validator';
import type {
  ExpectationAdmissionResult,
  ExpectationFreshness,
  SemanticExpectation,
  SourceSnapshot,
} from './types';

/** Resolve whether an expectation is current against a source snapshot. */
export function resolveExpectationFreshness(
  expectation: Pick<SemanticExpectation, 'sourceProvenance'>,
  snapshot: SourceSnapshot | null,
): ExpectationFreshness {
  const provenance = expectation.sourceProvenance;
  if (snapshot === null) return 'EXPECTATION_SOURCE_UNAVAILABLE';
  if (snapshot.repoId !== provenance.repoId) return 'EXPECTATION_SOURCE_UNAVAILABLE';
  if (snapshot.sha !== provenance.sha) return 'EXPECTATION_SOURCE_STALE';
  return 'EXPECTATION_SOURCE_CURRENT';
}

/** Admission gate: schema-valid AND source current -> EXPECTATION_ADMITTED,
 *  otherwise the exact failure class. Admission never mutates anything. */
export function admitExpectation(
  expectation: unknown,
  snapshot: SourceSnapshot | null,
): { result: ExpectationAdmissionResult; expectation: SemanticExpectation | null } {
  let validated: SemanticExpectation;
  try {
    validated = validateExpectation(expectation);
  } catch {
    return { result: 'EXPECTATION_INVALID', expectation: null };
  }
  const freshness = resolveExpectationFreshness(validated, snapshot);
  switch (freshness) {
    case 'EXPECTATION_SOURCE_UNAVAILABLE':
      return { result: 'EXPECTATION_SOURCE_UNAVAILABLE', expectation: validated };
    case 'EXPECTATION_SOURCE_STALE':
      return { result: 'EXPECTATION_SOURCE_STALE', expectation: validated };
    default:
      return { result: 'EXPECTATION_ADMITTED', expectation: validated };
  }
}
