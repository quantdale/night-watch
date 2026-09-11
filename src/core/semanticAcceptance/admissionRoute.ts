// ---------------------------------------------------------------------------
// Nightwatch group 11 — the Phase 9A.1 admission route stays the only route
// (F-10, task 11.7).
//
// A real-product semantic expectation is admitted ONLY by the fixed
// recipe + bounded extractor + `ev:sha256` evidence-digest derivation against
// an approved read-only source snapshot. A provenance label alone grants no
// authority: a synthetic expectation relabelled with a real-looking SHA or a
// forged digest is refused with REAL_SOURCE_EXPECTATION_PROOF_MISSING. A DEV
// observation is evidence, never admission: evaluating an observation cannot
// create or modify an expectation.
//
// Pure: no network, no fs, no child processes, no persistence.
// ---------------------------------------------------------------------------

import {
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
} from '../../oracles/expectations/admission';
import type { SemanticExpectation } from '../../oracles/expectations/types';

export const REAL_SOURCE_EXPECTATION_PROOF_MISSING = 'REAL_SOURCE_EXPECTATION_PROOF_MISSING' as const;
export const DEV_OBSERVATION_CANNOT_ADMIT_EXPECTATION = 'DEV_OBSERVATION_CANNOT_ADMIT_EXPECTATION' as const;
export const DEV_OBSERVATION_ADMISSION_AUTHORITY = 'NONE' as const;

const EVIDENCE_DIGEST_PATTERN = /^ev:sha256:[0-9a-f]{24}$/;
const REAL_SOURCE_DERIVATION_VERSIONS: readonly string[] = [
  REAL_SOURCE_DERIVATION_VERSION,
  REAL_SOURCE_DERIVATION_VERSION_V2,
];

/** The missing-proof reason for an expectation, or null when its provenance
 *  carries mechanically verified real-source derivation evidence. A synthetic
 *  derivation version, a missing/malformed evidence digest, or an absent
 *  provenance all fail. */
export function realSourceExpectationProofFailure(expectation: SemanticExpectation): string | null {
  const provenance = expectation.sourceProvenance;
  if (provenance === undefined || provenance === null || typeof provenance !== 'object') {
    return REAL_SOURCE_EXPECTATION_PROOF_MISSING;
  }
  if (!REAL_SOURCE_DERIVATION_VERSIONS.includes(provenance.derivationVersion)) {
    return REAL_SOURCE_EXPECTATION_PROOF_MISSING;
  }
  const digest = provenance.evidenceDigest;
  if (typeof digest !== 'string' || !EVIDENCE_DIGEST_PATTERN.test(digest)) {
    return REAL_SOURCE_EXPECTATION_PROOF_MISSING;
  }
  return null;
}

/** Fail closed when an expectation cannot demonstrate the mechanical
 *  derivation proof. Throws REAL_SOURCE_EXPECTATION_PROOF_MISSING. */
export function assertRealSourceExpectationProof(expectation: SemanticExpectation): void {
  const failure = realSourceExpectationProofFailure(expectation);
  if (failure !== null) {
    throw new Error(`${failure}: expectation ${expectation?.expectationId ?? 'UNKNOWN'} carries no mechanically verified real-source derivation evidence`);
  }
}

/** A DEV observation is evidence, never admission. The admitted expectation
 *  identity set must be byte-identical before and after an observation; any
 *  creation from the observation fails closed. */
export function assertNoExpectationCreatedFromObservation(
  before: readonly SemanticExpectation[],
  after: readonly SemanticExpectation[],
): void {
  const idsBefore = before.map((expectation) => expectation.expectationId).sort().join(',');
  const idsAfter = after.map((expectation) => expectation.expectationId).sort().join(',');
  if (idsBefore !== idsAfter) {
    throw new Error(
      `${DEV_OBSERVATION_CANNOT_ADMIT_EXPECTATION}: admitted expectation set changed across an observation ([${idsBefore}] -> [${idsAfter}])`,
    );
  }
}
