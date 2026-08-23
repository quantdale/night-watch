// ---------------------------------------------------------------------------
// Nightwatch Phase 18 — explicit semantic expectation currentness.
//
// The legacy resolver keeps its byte-stable RESOLVED/STALE/UNAVAILABLE
// contract. This finer, pure classification is an additive decision surface
// for triage and dossier evidence; it does not grant source authority and it
// never silently rebinds an expectation.
// ---------------------------------------------------------------------------

import type { SemanticExpectation, SourceSnapshot } from './types';

export type SourceCurrentnessState = 'CURRENT' | 'STALE' | 'AMBIGUOUS' | 'MISSING' | 'UNSUPPORTED' | 'SYNTHETIC_ONLY';
export type SourceEvidenceVerification = 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPLICABLE';

const SHA_RE = /^[0-9a-f]{40}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const EVIDENCE_DIGEST_RE = /^ev:sha256:[0-9a-f]{24}$/;

export function classifyExpectationCurrentness(input: {
  readonly expectation: unknown;
  readonly sourceSnapshot: SourceSnapshot | null;
  readonly evidenceVerification?: SourceEvidenceVerification;
  /** Optional read-only source admission facts. Omitting them preserves the
   * historical SHA-only check; supplying them lets callers distinguish a
   * removed/renamed surface, digest drift, and ambiguous source definitions. */
  readonly sourceFilePresent?: boolean;
  readonly sourceRelativePath?: string;
  readonly observedEvidenceDigest?: string;
  readonly sourceDefinitionCount?: number;
}): SourceCurrentnessState {
  if (input.sourceSnapshot !== null && (typeof input.sourceSnapshot !== 'object' || Array.isArray(input.sourceSnapshot) || Object.getPrototypeOf(input.sourceSnapshot) !== Object.prototype && Object.getPrototypeOf(input.sourceSnapshot) !== null || typeof input.sourceSnapshot.repoId !== 'string' || typeof input.sourceSnapshot.sha !== 'string' || !SAFE_ID_RE.test(input.sourceSnapshot.repoId) || !SHA_RE.test(input.sourceSnapshot.sha))) return 'UNSUPPORTED';
  if (input.expectation === null || typeof input.expectation !== 'object' || Array.isArray(input.expectation) || Object.getPrototypeOf(input.expectation) !== Object.prototype && Object.getPrototypeOf(input.expectation) !== null) return 'UNSUPPORTED';
  const expectation = input.expectation as Partial<SemanticExpectation>;
  const provenance = expectation.sourceProvenance;
  if (provenance === undefined || provenance === null || typeof provenance !== 'object') return 'MISSING';
  if (Array.isArray(provenance) || (Object.getPrototypeOf(provenance) !== Object.prototype && Object.getPrototypeOf(provenance) !== null)) return 'UNSUPPORTED';
  if (typeof provenance.repoId !== 'string' || typeof provenance.sha !== 'string' || typeof provenance.relativePath !== 'string' || typeof provenance.derivationVersion !== 'string') return 'MISSING';
  if (!SAFE_ID_RE.test(provenance.repoId) || !SHA_RE.test(provenance.sha) || provenance.relativePath.startsWith('/') || provenance.relativePath.includes('..') || provenance.relativePath.includes('\\') || !SAFE_ID_RE.test(provenance.derivationVersion)) return 'UNSUPPORTED';
  if (provenance.evidenceDigest !== undefined && !EVIDENCE_DIGEST_RE.test(provenance.evidenceDigest)) return 'UNSUPPORTED';
  // A fixture expectation intentionally has no real-source extraction digest.
  // It remains usable for LOCAL/SYNTHETIC evaluation but cannot be presented
  // as a mechanically admitted real-source expectation.
  if (provenance.evidenceDigest === undefined) return 'SYNTHETIC_ONLY';
  if (input.sourceSnapshot === null) return 'MISSING';
  if (input.sourceFilePresent === false) return 'MISSING';
  if (input.sourceRelativePath !== undefined && input.sourceRelativePath !== provenance.relativePath) return 'STALE';
  if (input.sourceDefinitionCount !== undefined && (!Number.isInteger(input.sourceDefinitionCount) || input.sourceDefinitionCount < 0 || input.sourceDefinitionCount > 64)) return 'UNSUPPORTED';
  if (input.sourceDefinitionCount === 0) return 'MISSING';
  if (input.sourceDefinitionCount !== undefined && input.sourceDefinitionCount > 1) return 'AMBIGUOUS';
  if (input.sourceSnapshot.repoId !== provenance.repoId) return 'AMBIGUOUS';
  if (input.sourceSnapshot.sha !== provenance.sha) return 'STALE';
  if (input.observedEvidenceDigest !== undefined) {
    if (!EVIDENCE_DIGEST_RE.test(input.observedEvidenceDigest)) return 'UNSUPPORTED';
    if (input.observedEvidenceDigest !== provenance.evidenceDigest) return 'STALE';
  }
  if (input.evidenceVerification !== undefined && input.evidenceVerification !== 'VERIFIED' && input.evidenceVerification !== 'NOT_APPLICABLE' && input.evidenceVerification !== 'UNVERIFIED') return 'UNSUPPORTED';
  if ((input.evidenceVerification ?? 'NOT_APPLICABLE') === 'UNVERIFIED') return 'AMBIGUOUS';
  return 'CURRENT';
}
