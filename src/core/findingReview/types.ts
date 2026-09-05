// ---------------------------------------------------------------------------
// Post-dossier local review lifecycle + immutable review binding.
//
// Boundary: pre-dossier candidate progression lives in
// src/core/campaign/candidateLifecycle.ts (OBSERVED..DOSSIER_READY /
// REJECTED / UNRESOLVED). This cone starts where that machine ends: a
// DOSSIER_READY candidate whose dossier (and optional Alphaus handoff
// projection) awaits LOCAL human review.
//
// A local review decision is NOT an organizational verdict. It is never
// equivalent to a Leslie genuine/invalid verdict or a Pondr approval; the
// receipt carries that non-equivalence literally so no downstream consumer
// can mistake one for the other.
//
// Pure module: node:crypto only (via canonicalDigest). No fs/network/
// child_process/DB/AI authority. Never imports the alphausHandoff cone
// (hardening forbids non-test importers); it binds to precomputed digest
// strings and recomputes them from caller-supplied artifact values.
// ---------------------------------------------------------------------------

/** Version stamped into every review record and receipt. */
export const FINDING_REVIEW_LIFECYCLE_VERSION = 'nightwatch.finding-review-lifecycle.v1' as const;

/** Version stamped into every review receipt. */
export const FINDING_REVIEW_RECEIPT_VERSION = 'nightwatch.finding-review-receipt.v1' as const;

export const FINDING_REVIEW_STATES = [
  'REVIEW_PENDING',
  'REVIEWED',
  'FOLLOWUP_RECOMMENDED',
  'INSUFFICIENT_EVIDENCE',
  'DUPLICATE_CANDIDATE',
  'SUPERSEDED',
] as const;

export type FindingReviewState = (typeof FINDING_REVIEW_STATES)[number];

/**
 * Local-only review decisions. Advisory: they route Nightwatch-local
 * follow-up work and never decide organizational truth.
 */
export const FINDING_REVIEW_DECISIONS = [
  'ACCEPT_EVIDENCE',
  'REQUEST_FOLLOWUP',
  'MARK_INSUFFICIENT',
  'MARK_DUPLICATE_CANDIDATE',
  'SUPERSEDE',
] as const;

export type FindingReviewDecision = (typeof FINDING_REVIEW_DECISIONS)[number];

/** Exact artifact identity a review decision binds to. */
export interface FindingReviewBinding {
  readonly findingId: string;
  readonly findingDigest: string;
  readonly dossierDigest: string;
  /** Digest of the Alphaus handoff projection when one was reviewed; null when the review covered the dossier only. */
  readonly handoffDigest: string | null;
  readonly sourceSha: string;
  readonly campaignId: string;
  readonly handoffVersion: string;
  readonly privacyProjectionVersion: string;
}

export interface FindingReviewRecord {
  readonly lifecycleVersion: typeof FINDING_REVIEW_LIFECYCLE_VERSION;
  readonly state: FindingReviewState;
  readonly binding: FindingReviewBinding;
  readonly transitionCount: number;
  readonly lastReasonCode: string | null;
}

export interface FindingReviewReceipt {
  readonly schemaVersion: typeof FINDING_REVIEW_RECEIPT_VERSION;
  readonly reviewId: string;
  readonly binding: FindingReviewBinding;
  readonly decision: FindingReviewDecision;
  readonly resultingState: FindingReviewState;
  readonly reviewedAt: string;
  readonly rationale: string;
  /**
   * Literal non-equivalence guard: local review is not organizational
   * sign-off. Any consumer mapping this receipt to a Leslie/Pondr verdict
   * contradicts the receipt itself.
   */
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
  readonly notEquivalentTo: readonly ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'];
}
