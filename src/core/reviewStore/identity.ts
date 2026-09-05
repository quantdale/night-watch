// ---------------------------------------------------------------------------
// Review identity and the derived discovery key.
//
// Identity is the digest of the COMPLETE binding, never the finding id. That
// is what makes multiple artifact generations safe: a regenerated dossier
// changes `dossierDigest`, so it changes the identity, so it lands in a
// different file. The first generation is never overwritten and stays
// auditable.
//
// The finding-id component of the file name is a DERIVED discovery key. It
// exists so one directory listing can serve a whole reviewer page instead of
// the store being scanned once per finding. It is recomputed on every read
// and the envelope is validated independently, so a renamed — or forged —
// file name can never make bytes authoritative. This is why there is no index
// file: there is nothing to corrupt and nothing to rebuild.
//
// Pure: node:crypto only, via canonicalDigest. No fs authority in this file.
// ---------------------------------------------------------------------------

import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';
import { validateReviewBinding, type FindingReviewBinding } from '../findingReview';

const IDENTITY_LENGTH = 24;
const DISCOVERY_KEY_LENGTH = 12;

/** File-name shape, pinned once and matched on every read. */
export const REVIEW_FILE_NAME_RE = /^review\.([0-9a-f]{12})\.([0-9a-f]{24})\.json$/;

/**
 * Deterministic identity of one review binding. The binding is validated
 * first, so an identity can never be computed over a shape the lifecycle
 * would refuse.
 */
export function reviewIdentity(binding: FindingReviewBinding): string {
  return sha256Hex(stableJsonSorted(validateReviewBinding(binding))).slice(0, IDENTITY_LENGTH);
}

/** Derived discovery key for a finding id. Not an identity; not authoritative. */
export function findingDiscoveryKey(findingId: string): string {
  if (typeof findingId !== 'string' || findingId === '') throw new Error('REVIEW_STORE_IDENTITY_MISMATCH');
  return sha256Hex(findingId).slice(0, DISCOVERY_KEY_LENGTH);
}

/** Canonical file name for one binding. */
export function reviewFileName(binding: FindingReviewBinding): string {
  const validated = validateReviewBinding(binding);
  return `review.${findingDiscoveryKey(validated.findingId)}.${reviewIdentity(validated)}.json`;
}

/** The listing prefix that selects every stored generation of one finding. */
export function reviewFileNamePrefix(findingId: string): string {
  return `review.${findingDiscoveryKey(findingId)}.`;
}

/** Parse a stored file name, or null when it is not one of ours. */
export function parseReviewFileName(fileName: string): { readonly discoveryKey: string; readonly identity: string } | null {
  const match = REVIEW_FILE_NAME_RE.exec(fileName);
  return match === null ? null : { discoveryKey: match[1] as string, identity: match[2] as string };
}
