// ---------------------------------------------------------------------------
// Owner-local review store — schema and vocabulary.
//
// This cone makes the CERTIFIED review lifecycle durable. It adds no review
// semantics: the record, the receipt and the binding are
// src/core/findingReview/ values stored verbatim, and verifyReviewCurrent
// remains the only binding validator. A second, weaker copy of that check
// living in a persistence layer is exactly the failure this store must not
// become.
//
// A stored review is owner-local and private. It is not an organizational
// verdict, it is never equivalent to a Leslie genuine/invalid verdict or a
// Pondr approval, and nothing in this cone can publish.
// ---------------------------------------------------------------------------

import type { FindingReviewRecord, FindingReviewReceipt } from '../findingReview';

/** Version stamped into every stored envelope. */
export const REVIEW_STORE_SCHEMA_VERSION = 'nightwatch.review-store.v1' as const;

/**
 * What the store knows about one finding's local review.
 *
 * NO_REVIEW — nothing is stored for this finding.
 * CURRENT   — a stored decision still binds to the current artifacts.
 * STALE     — a stored decision exists but its artifacts moved on. It stays
 *             auditable and is never rendered as a live decision.
 * CORRUPT   — bytes exist but did not survive validation. Fail-closed: this
 *             is never silently upgraded to any other state.
 */
export const REVIEW_STORE_READ_STATES = ['NO_REVIEW', 'CURRENT', 'STALE', 'CORRUPT'] as const;
export type ReviewStoreReadState = (typeof REVIEW_STORE_READ_STATES)[number];

/**
 * The complete categorical failure vocabulary. Exported as data so hardening
 * can hold the implementation to it: a store that can fail in a way this list
 * does not name is a store whose corruption semantics are not specified.
 */
export const REVIEW_STORE_ERROR_CODES = [
  /** Bytes are unreadable, malformed, or not the envelope shape. */
  'REVIEW_STORE_CORRUPT',
  /** A schema version this build does not support. Never read optimistically. */
  'REVIEW_STORE_VERSION_UNSUPPORTED',
  /** The stored binding failed validateReviewBinding. */
  'REVIEW_STORE_BINDING_INVALID',
  /** The receipt id does not recompute from the receipt's own contents. */
  'REVIEW_STORE_RECEIPT_TAMPERED',
  /** The envelope, its file name and the binding do not agree on identity. */
  'REVIEW_STORE_IDENTITY_MISMATCH',
  /** A stored receipt claims an authority a local review can never hold. */
  'REVIEW_STORE_AUTHORITY_INVALID',
  /** A stored record is not in a terminal decided state. */
  'REVIEW_STORE_STATE_INVALID',
  /** The record and the receipt disagree. */
  'REVIEW_STORE_RECORD_RECEIPT_MISMATCH',
  /** This binding already carries a decision; decisions are terminal. */
  'REVIEW_STORE_ALREADY_DECIDED',
  /** The filesystem cannot provide atomic no-replace publication. */
  'REVIEW_STORE_NO_REPLACE_UNSUPPORTED',
] as const;
export type ReviewStoreErrorCode = (typeof REVIEW_STORE_ERROR_CODES)[number];

/**
 * The persisted envelope. Deliberately minimal.
 *
 * No raw dossier, finding or handoff content is stored: the binding already
 * carries their digests, and duplicating the artifacts would create a second
 * privacy surface and buy nothing. Every field below has a reason —
 * `findingId` is the discovery key, `reviewIdentity` is recomputed on read so
 * a renamed file cannot make bytes authoritative, and `storedAt` records when
 * persistence happened as distinct from when the human decided.
 */
export interface StoredReviewEnvelope {
  readonly schemaVersion: typeof REVIEW_STORE_SCHEMA_VERSION;
  readonly reviewIdentity: string;
  readonly findingId: string;
  readonly receipt: FindingReviewReceipt;
  readonly record: FindingReviewRecord;
  readonly storedAt: string;
  /** Written by the underlying private-artifact publisher. */
  readonly status: 'READY';
}

/** One envelope that failed validation, named by file and cause. */
export interface ReviewStoreCorruption {
  readonly fileName: string;
  readonly code: ReviewStoreErrorCode;
  readonly detail: string;
}

/**
 * The answer for one finding.
 *
 * `corruption` is reported whatever the state: a corrupt generation never
 * yields CURRENT, but neither is it hidden because a different, valid
 * generation exists.
 */
export interface ReviewStoreReadResult {
  readonly state: ReviewStoreReadState;
  readonly envelope: StoredReviewEnvelope | null;
  /** Why the REPORTED review is STALE, from verifyReviewCurrent. Null otherwise. */
  readonly staleReason: string | null;
  /**
   * Why each non-binding generation does not bind, keyed by review identity.
   *
   * `read()` already evaluates every generation; it used to keep only the
   * first reason and discard the rest, which left a history view able to say
   * "this one is historical" but not "because the dossier changed". Recording
   * all of them adds no second judgement — it stops throwing away the one
   * already made.
   */
  readonly staleReasons: readonly { readonly reviewIdentity: string; readonly reason: string }[];
  readonly corruption: readonly ReviewStoreCorruption[];
  /** Every envelope that validated, newest generation first by identity order. */
  readonly generations: readonly StoredReviewEnvelope[];
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}
