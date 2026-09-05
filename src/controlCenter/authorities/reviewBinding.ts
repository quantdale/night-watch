// ---------------------------------------------------------------------------
// The canonical review binding for a Control-Center-originated review.
//
// ONE builder, used by BOTH the write path and the read path. If the two
// derived a binding independently they would eventually disagree, and a
// disagreement here does not look like a bug — it looks like every stored
// review silently going stale, or worse, a stale review reading as current.
//
// A Control Center review is DOSSIER-SCOPED, and the binding says so rather
// than implying a handoff was reviewed. Where a bound field has no value in
// this context, a declared literal names the absence; nothing is guessed.
//
// Pure: no fs, no network, no persistence authority.
// ---------------------------------------------------------------------------

import { findingArtifactDigest, type CurrentReviewArtifacts, type FindingReviewBinding } from '../../core/findingReview';
import { CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION, type FindingsDossierMetadata } from './findingsAuthority';

/**
 * No Alphaus handoff projection is reviewed on this surface, and the binding
 * records that as a fact rather than borrowing the handoff version.
 *
 * Deliberately a literal and not an import: F-12 reverse-isolation forbids
 * any file outside the AH-1 cones from importing src/core/alphausHandoff.
 * There is nothing to pin here — the point of the value is that no handoff
 * was involved.
 */
export const CONTROL_CENTER_REVIEW_HANDOFF_VERSION = 'NONE_DOSSIER_ONLY_REVIEW' as const;

/** Named absences. A review still binds to them, so a later arrival is drift. */
export const CONTROL_CENTER_REVIEW_NO_CAMPAIGN = 'local.no-campaign' as const;
export const CONTROL_CENTER_REVIEW_NO_SOURCE = 'synthetic.no-source-evidence' as const;

const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;

/**
 * The exact artifact values a review binds to, from the reviewer's point of
 * view.
 *
 * `finding` is the projected row the reviewer actually saw. `dossier` is the
 * digest of the whole parsed dossier file, so a change to a field the row
 * does not project still makes the review stale.
 */
export function currentReviewArtifacts(
  dossier: FindingsDossierMetadata,
  context: { readonly campaignId: string | null; readonly sourceSha?: string | null }
): CurrentReviewArtifacts {
  const sourceSha = typeof context.sourceSha === 'string' && SOURCE_SHA_RE.test(context.sourceSha)
    ? context.sourceSha
    : CONTROL_CENTER_REVIEW_NO_SOURCE;
  return {
    finding: dossier,
    dossier: dossier.contentDigest,
    handoff: null,
    sourceSha,
    campaignId: context.campaignId ?? CONTROL_CENTER_REVIEW_NO_CAMPAIGN,
    handoffVersion: CONTROL_CENTER_REVIEW_HANDOFF_VERSION,
    // The projection actually applied to what was reviewed. Re-versioning the
    // findings authority is a change to what the reviewer saw, and it should
    // make an earlier decision stale.
    privacyProjectionVersion: CONTROL_CENTER_FINDINGS_AUTHORITY_VERSION,
  };
}

/** The binding for those artifacts. Deterministic; the same inputs give the same identity. */
export function reviewBindingFor(
  dossier: FindingsDossierMetadata,
  context: { readonly campaignId: string | null; readonly sourceSha?: string | null }
): FindingReviewBinding {
  const current = currentReviewArtifacts(dossier, context);
  return {
    findingId: dossier.candidateId,
    findingDigest: findingArtifactDigest(current.finding),
    dossierDigest: findingArtifactDigest(current.dossier),
    handoffDigest: null,
    sourceSha: current.sourceSha,
    campaignId: current.campaignId,
    handoffVersion: current.handoffVersion,
    privacyProjectionVersion: current.privacyProjectionVersion,
  };
}
