// ---------------------------------------------------------------------------
// Control Center review authority — the ONLY local write path.
//
// Narrow by construction. It can record one terminal review decision into the
// owner-local review store and it can do nothing else: it holds a ReviewStore
// and no other capability, so it cannot edit a finding, a dossier, source or
// config, and it has no publication path. A hardening rule pins that import
// graph, because "it currently does not" and "it cannot" are different
// claims and only the second one is a guarantee.
//
// The client never chooses the binding it writes against. It submits the
// review identity the surface showed it; the authority REBUILDS the binding
// from current authority state through the same `reviewBindingFor` the read
// path uses, and refuses anything that does not match. A client that has
// gone stale — because the dossier was regenerated between render and click —
// is refused rather than silently binding to something it never saw.
//
// Timestamps are taken here, not accepted from the client: a caller-supplied
// `reviewedAt` would be a tamper vector into a digest-bound receipt.
// ---------------------------------------------------------------------------

import {
  FINDING_REVIEW_DECISIONS,
  type FindingReviewDecision,
} from '../../core/findingReview';
import { ReviewStore, ReviewStoreError, reviewIdentity, type ReviewStoreListing, type ReviewStoreReadResult } from '../../core/reviewStore';
import type { ReviewerLocalReviewInput } from '../adapters/reviewerAdapter';
import { currentReviewArtifacts, reviewBindingFor } from './reviewBinding';
import type { FindingsDossierMetadata } from './findingsAuthority';

const DECISION_SET: ReadonlySet<string> = new Set<string>(FINDING_REVIEW_DECISIONS);

/** Bounded well before the lifecycle's own 2000-character limit is reached. */
export const REVIEW_RATIONALE_MAX = 2000;

/**
 * Every outcome the write path can produce. Closed and categorical: a caller
 * never has to interpret a message, and the surface never has to guess
 * whether a refusal was a conflict or a mistake.
 */
export const REVIEW_WRITE_RESULTS = [
  'ACCEPTED',
  /** This binding already carries a decision. Decisions are terminal. */
  'ALREADY_DECIDED',
  /** The submitted identity is not the identity of current state. */
  'BINDING_MISMATCH',
  'UNKNOWN_FINDING',
  'INVALID_DECISION',
  'INVALID_RATIONALE',
  'STORE_UNAVAILABLE',
] as const;
export type ReviewWriteResultCode = (typeof REVIEW_WRITE_RESULTS)[number];

export interface ReviewDecisionRequest {
  readonly findingId: string;
  /** The identity the surface displayed. Must equal the recomputed identity. */
  readonly reviewIdentity: string;
  readonly decision: string;
  readonly rationale?: string;
  readonly reasonCode?: string;
}

export interface ReviewDecisionOutcome {
  readonly result: ReviewWriteResultCode;
  readonly reviewIdentity: string | null;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export interface ReviewAuthorityContext {
  readonly dossiers: readonly FindingsDossierMetadata[];
  readonly campaignId: string | null;
  readonly sourceSha?: string | null;
}

export interface ReviewAuthorityOptions {
  /** Test-injected store root. Omitted in normal use. */
  readonly root?: string;
  /** Injected for deterministic tests; defaults to the wall clock. */
  readonly now?: () => Date;
}

function instant(now: () => Date): string {
  return `${new Date(now().getTime()).toISOString().slice(0, 19)}Z`;
}

export class ControlCenterReviewAuthority {
  private readonly store: ReviewStore;
  private readonly now: () => Date;

  constructor(options: ReviewAuthorityOptions = {}) {
    this.store = new ReviewStore({ root: options.root });
    this.now = options.now ?? (() => new Date());
  }

  get storeRoot(): string {
    return this.store.root;
  }

  /** Raw store state for one finding, for diagnostics and tests. */
  readState(dossier: FindingsDossierMetadata, context: Omit<ReviewAuthorityContext, 'dossiers'>): ReviewStoreReadResult {
    return this.store.read(dossier.candidateId, currentReviewArtifacts(dossier, context));
  }

  /**
   * A lookup for `reviewerInputsFromFindings`, bound to one request's context.
   *
   * Returns null for a finding with no stored review, so the surface reports
   * UNKNOWN rather than inventing a pending record. A STALE stored review is
   * returned WITH its receipt and marked stale: it is evidence, and hiding it
   * would be as wrong as showing it as live.
   */
  localReviewLookup(context: Omit<ReviewAuthorityContext, 'dossiers'>): (dossier: FindingsDossierMetadata) => ReviewerLocalReviewInput | null {
    // ONE directory listing for the whole request, taken here rather than per
    // row. Per row it cost `rows x store`: at 10,000 reviews a 50-row page
    // spent 325 ms scanning half a million directory entries, and the cost
    // grew with the STORE rather than with the page.
    //
    // A store that cannot be listed yields an empty listing rather than
    // throwing, so a reviewer surface never goes down because persistence is
    // unavailable — every finding simply reads UNKNOWN.
    let listing: ReviewStoreListing;
    try {
      listing = this.store.snapshotListing();
    } catch {
      listing = { byDiscoveryKey: new Map<string, readonly string[]>() };
    }
    return (dossier) => {
      let state: ReviewStoreReadResult;
      try {
        state = this.store.read(dossier.candidateId, currentReviewArtifacts(dossier, context), listing);
      } catch {
        // A store failure is never allowed to take the reviewer surface down,
        // and it is never allowed to look like "no review" either — the
        // caller sees UNKNOWN, which is what it is.
        return null;
      }
      if (state.state === 'NO_REVIEW' || state.state === 'CORRUPT' || state.envelope === null) return null;
      return {
        record: state.envelope.record,
        receipt: state.envelope.receipt,
        bindingCurrentness: state.state === 'CURRENT' ? 'CURRENT' : 'STALE',
      };
    };
  }

  /**
   * Record one terminal decision.
   *
   * Order matters: the finding is resolved from CURRENT state, the binding is
   * rebuilt from it, and only an exactly matching submitted identity is
   * allowed to proceed. Nothing is written before all of that holds.
   */
  decide(request: ReviewDecisionRequest, context: ReviewAuthorityContext): ReviewDecisionOutcome {
    const refuse = (result: ReviewWriteResultCode): ReviewDecisionOutcome => ({
      result,
      reviewIdentity: null,
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    });

    if (typeof request.findingId !== 'string' || request.findingId === '') return refuse('UNKNOWN_FINDING');
    if (typeof request.decision !== 'string' || !DECISION_SET.has(request.decision)) return refuse('INVALID_DECISION');
    if (request.rationale !== undefined && (typeof request.rationale !== 'string' || request.rationale.length > REVIEW_RATIONALE_MAX)) {
      return refuse('INVALID_RATIONALE');
    }

    const dossier = context.dossiers.find((candidate) => candidate.candidateId === request.findingId);
    if (dossier === undefined) return refuse('UNKNOWN_FINDING');

    const binding = reviewBindingFor(dossier, context);
    const expected = reviewIdentity(binding);
    if (typeof request.reviewIdentity !== 'string' || request.reviewIdentity !== expected) return refuse('BINDING_MISMATCH');

    const at = instant(this.now);
    try {
      const written = this.store.putDecision({
        binding,
        decision: request.decision as FindingReviewDecision,
        reviewedAt: at,
        storedAt: at,
        rationale: request.rationale,
        reasonCode: request.reasonCode,
      });
      return { result: 'ACCEPTED', reviewIdentity: written.reviewIdentity, organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY' };
    } catch (error) {
      if (error instanceof ReviewStoreError && error.code === 'REVIEW_STORE_ALREADY_DECIDED') return refuse('ALREADY_DECIDED');
      const message = (error as Error).message;
      // The lifecycle's rationale screen is the authority on rationale
      // safety. This layer never re-implements it and never relaxes it.
      if (message.includes('FINDING_REVIEW_INVALID_RATIONALE')) return refuse('INVALID_RATIONALE');
      if (message.includes('FINDING_REVIEW_INVALID_REASON_CODE')) return refuse('INVALID_RATIONALE');
      if (message.includes('FINDING_REVIEW_INVALID_DECISION')) return refuse('INVALID_DECISION');
      return refuse('STORE_UNAVAILABLE');
    }
  }

  /** The review identity the surface should display for one finding. */
  identityFor(dossier: FindingsDossierMetadata, context: Omit<ReviewAuthorityContext, 'dossiers'>): string {
    return reviewIdentity(reviewBindingFor(dossier, context));
  }
}
