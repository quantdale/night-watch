// ---------------------------------------------------------------------------
// Owner-local review store — per-finding review history.
//
// `ReviewStore.read()` already returns every validated generation of one
// finding. It answers "what is the state now"; it does not answer "what was
// reviewed, when, against which artifact, and which of those still binds".
// This module answers the second question and only the second question — it
// adds no review semantics and calls no validator of its own.
//
// CHRONOLOGY COMES FROM RECORDS. The file name carries a discovery key and an
// identity digest; neither orders anything. Generations are ordered by
// `storedAt`, then `reviewedAt`, then `reviewIdentity`. The last key is what
// makes the order TOTAL: `storedAt` has second precision, so ties are
// ordinary rather than exotic, and a tie broken by directory order would make
// the whole view non-deterministic while looking correct in every test that
// happened to write its fixtures a second apart.
//
// THE CURRENT GENERATION IS PROVEN, NOT ASSUMED. It is the one whose receipt
// passes `verifyReviewCurrent` against the supplied artifacts — never "the
// newest", which is a guess that is usually right and therefore worse than
// one that is always checked. A finding whose newest generation no longer
// binds while an older one does is exactly the case the guess gets wrong.
//
// PER-GENERATION SEMANTIC IDENTITY IS ABSENT, AND SAYS SO. The v1 review
// binding carries no `expectationId` or `semanticContractId`, and adding one
// would change every review identity and mark every stored review corrupt.
// Rather than attribute the CURRENT artifact's identities to a historical
// generation — which would be a fabrication about what was reviewed — each
// generation reports null with a categorical reason, and the current
// artifact's identities are reported once, at the top level, where they are
// true.
//
// Pure: no fs authority. Every byte arrives through the store.
// ---------------------------------------------------------------------------

import type { CurrentReviewArtifacts, FindingReviewDecision, FindingReviewState } from '../findingReview';
import type { ReviewStoreCorruption, ReviewStoreReadResult, StoredReviewEnvelope } from './types';
import type { ReviewArtifactCurrentness } from './inventory';

/** Version stamped into every history document. */
export const REVIEW_STORE_HISTORY_VERSION = 'nightwatch.review-store-history.v1' as const;

/**
 * Why a generation carries no expectation / semantic-contract identity.
 *
 * A closed vocabulary rather than a null with no explanation: "we do not
 * know" and "this schema cannot know" are different answers, and only the
 * second one tells a future reader what would have to change.
 */
export const REVIEW_HISTORY_IDENTITY_ABSENCE = 'REVIEW_BINDING_CARRIES_NO_SEMANTIC_IDENTITY' as const;

export interface ReviewHistoryGeneration {
  readonly reviewIdentity: string;
  readonly findingId: string;
  /** Source identity of the artifact that was reviewed, from the binding. */
  readonly sourceSha: string;
  readonly campaignId: string;
  readonly dossierDigest: string;
  readonly findingDigest: string;
  readonly reviewedAt: string;
  readonly storedAt: string;
  readonly decision: FindingReviewDecision;
  readonly resultingState: FindingReviewState;
  readonly currentness: ReviewArtifactCurrentness;
  /** Why this generation no longer binds, from verifyReviewCurrent. */
  readonly staleReason: string | null;
  /** Always null under the v1 binding; see the module note. */
  readonly expectationId: null;
  readonly semanticContractId: null;
  readonly identityAbsenceReason: typeof REVIEW_HISTORY_IDENTITY_ABSENCE;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export interface ReviewHistoryPage {
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly truncated: boolean;
}

/**
 * The identities of the artifact the finding CURRENTLY presents.
 *
 * Top-level, and never copied onto a generation: they describe what would be
 * reviewed now, not what was reviewed then.
 */
export interface ReviewHistoryCurrentArtifactIdentity {
  readonly expectationId: string | null;
  readonly semanticContractId: string | null;
}

export interface ReviewStoreHistory {
  readonly schemaVersion: typeof REVIEW_STORE_HISTORY_VERSION;
  readonly findingId: string;
  /** The store's overall answer for this finding, from ReviewStore.read(). */
  readonly state: ReviewStoreReadResult['state'];
  readonly generations: readonly ReviewHistoryGeneration[];
  readonly page: ReviewHistoryPage;
  /** Identity of the generation that binds to the current artifacts, if any. */
  readonly currentGeneration: string | null;
  readonly staleGenerationCount: number;
  readonly corruption: readonly { readonly fileName: string; readonly code: string }[];
  /**
   * True when the recorded decisions are not all the same. A local historical
   * fact about this store, and nothing more: it is not evidence that anything
   * was fixed, reopened, or organizationally re-judged.
   */
  readonly decisionChangedAcrossGenerations: boolean;
  readonly currentArtifactIdentity: ReviewHistoryCurrentArtifactIdentity;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

/** The narrow capability the history needs. */
export interface ReviewHistorySource {
  read(findingId: string, current: CurrentReviewArtifacts): ReviewStoreReadResult;
}

export interface ReviewHistoryOptions {
  readonly offset?: number;
  readonly limit?: number;
  /** Identities of the CURRENT artifact, where the caller knows them. */
  readonly currentArtifactIdentity?: ReviewHistoryCurrentArtifactIdentity;
}

/** A large history must not arrive as one object; fifty generations at a time. */
export const REVIEW_HISTORY_DEFAULT_LIMIT = 50;
export const REVIEW_HISTORY_MAX_LIMIT = 200;

/**
 * Total order over generations. Exported so the ordering itself is directly
 * testable, and so nothing else in the repository can invent a second one.
 *
 * Newest FIRST: an operator opening a history wants the decision that is in
 * force, or the one that most recently was.
 */
export function compareReviewGenerations(left: StoredReviewEnvelope, right: StoredReviewEnvelope): number {
  if (left.storedAt !== right.storedAt) return left.storedAt < right.storedAt ? 1 : -1;
  const leftReviewed = left.receipt.reviewedAt;
  const rightReviewed = right.receipt.reviewedAt;
  if (leftReviewed !== rightReviewed) return leftReviewed < rightReviewed ? 1 : -1;
  // Identity is a digest, so this tiebreak is arbitrary but STABLE, which is
  // the only property it needs. Without it two reviews stored in the same
  // second would order by whatever the directory returned.
  return left.reviewIdentity < right.reviewIdentity ? -1 : left.reviewIdentity > right.reviewIdentity ? 1 : 0;
}

function boundedLimit(requested: number | undefined): number {
  if (requested === undefined || !Number.isSafeInteger(requested) || requested <= 0) return REVIEW_HISTORY_DEFAULT_LIMIT;
  return Math.min(requested, REVIEW_HISTORY_MAX_LIMIT);
}

function boundedOffset(requested: number | undefined): number {
  return Number.isSafeInteger(requested) && (requested as number) >= 0 ? (requested as number) : 0;
}

function generationOf(
  envelope: StoredReviewEnvelope,
  currentness: ReviewArtifactCurrentness,
  staleReason: string | null
): ReviewHistoryGeneration {
  const binding = envelope.receipt.binding;
  return {
    reviewIdentity: envelope.reviewIdentity,
    findingId: envelope.findingId,
    sourceSha: binding.sourceSha,
    campaignId: binding.campaignId,
    dossierDigest: binding.dossierDigest,
    findingDigest: binding.findingDigest,
    reviewedAt: envelope.receipt.reviewedAt,
    storedAt: envelope.storedAt,
    decision: envelope.receipt.decision,
    resultingState: envelope.record.state,
    currentness,
    staleReason,
    expectationId: null,
    semanticContractId: null,
    identityAbsenceReason: REVIEW_HISTORY_IDENTITY_ABSENCE,
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}

/**
 * One finding's review history against its CURRENT artifacts.
 *
 * The rationale is deliberately NOT projected. It is bounded free text a human
 * typed, and this document is consumed by a CLI, an HTTP surface and a browser
 * view; the filing report is where a rationale belongs, behind that surface's
 * own screen.
 */
export function reviewHistoryFor(
  source: ReviewHistorySource,
  findingId: string,
  current: CurrentReviewArtifacts,
  options: ReviewHistoryOptions = {}
): ReviewStoreHistory {
  const result = source.read(findingId, current);
  const limit = boundedLimit(options.limit);
  const offset = boundedOffset(options.offset);

  // The current generation is decided by the store's own binding validation,
  // which `read()` already performed. Matching on identity rather than
  // re-running the check keeps ONE currentness judgement in the system.
  const currentIdentity = result.state === 'CURRENT' && result.envelope !== null ? result.envelope.reviewIdentity : null;

  // Every non-binding generation's reason, from the ONE currentness
  // judgement `read()` already made. Looked up by identity rather than
  // recomputed, so this module still has no staleness rule of its own.
  const reasonByIdentity = new Map(result.staleReasons.map((entry) => [entry.reviewIdentity, entry.reason]));
  const ordered = [...result.generations].sort(compareReviewGenerations);
  const rows = ordered.map((envelope) => {
    const currentness: ReviewArtifactCurrentness = envelope.reviewIdentity === currentIdentity ? 'CURRENT' : 'STALE';
    const staleReason = currentness === 'STALE' ? reasonByIdentity.get(envelope.reviewIdentity) ?? null : null;
    return generationOf(envelope, currentness, staleReason);
  });

  const decisions = new Set(rows.map((row) => row.decision));
  const corruption: readonly ReviewStoreCorruption[] = result.corruption;

  return {
    schemaVersion: REVIEW_STORE_HISTORY_VERSION,
    findingId,
    state: result.state,
    generations: rows.slice(offset, offset + limit),
    page: { offset, limit, total: rows.length, truncated: rows.length > offset + limit },
    currentGeneration: currentIdentity,
    staleGenerationCount: rows.filter((row) => row.currentness === 'STALE').length,
    // Code and file name only: a validator detail quotes the offending value,
    // and the offending value came out of an untrusted file.
    corruption: corruption.map((entry) => ({ fileName: entry.fileName, code: entry.code })),
    decisionChangedAcrossGenerations: decisions.size > 1,
    currentArtifactIdentity: options.currentArtifactIdentity ?? { expectationId: null, semanticContractId: null },
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}
