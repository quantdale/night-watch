// ---------------------------------------------------------------------------
// Nightwatch Control Center — owner-local review-store operations authority.
//
// One composition point for the three read-only operator questions: what is
// in the store, what happened to this finding across generations, and what
// would I file for it. The CLI and the browser surface both go through here,
// so they cannot answer the same question differently.
//
// READ-ONLY BY CONSTRUCTION. The store handle is built with
// `createIfMissing: false`, so every write method on it throws. This
// authority has no `putDecision`, no recovery, and no deletion of any kind —
// not by policy, but because it holds nothing that could perform one. The
// existing write path (`ControlCenterReviewAuthority`) remains the only way a
// decision is recorded, and it is a different object.
//
// CURRENTNESS COMES FROM THE FINDINGS AUTHORITY, OR NOT AT ALL. A stored
// review is CURRENT or STALE only relative to the artifacts that exist now.
// Where the finding's dossier is not in the current snapshot — deleted,
// beyond the projection's file bound, or from a campaign whose findings have
// moved on — the honest answer is UNKNOWN, and this authority returns UNKNOWN
// rather than guessing from recency.
// ---------------------------------------------------------------------------

import {
  ReviewStore,
  inventoryReviewStore,
  reviewHistoryFor,
  type ReviewArtifactCurrentness,
  type ReviewInventoryOptions,
  type ReviewStoreHistory,
  type ReviewStoreInventory,
  type ReviewStoreReadResult,
  type StoredReviewEnvelope,
} from '../../core/reviewStore';
import { verifyReviewCurrent, type CurrentReviewArtifacts } from '../../core/findingReview';
import { buildFilingReport, type FilingReportArtifact } from './filingReportAuthority';
import { currentReviewArtifacts } from './reviewBinding';
import { reviewerInputsFromFindings } from './reviewerAuthority';
import type { FindingsDossierMetadata } from './findingsAuthority';

/** Version stamped into every operations document this authority produces. */
export const CONTROL_CENTER_REVIEW_STORE_AUTHORITY_VERSION = 'nightwatch.control-center-review-store-authority.v1' as const;

export interface ReviewStoreAuthorityContext {
  /** The dossiers currently projected by the findings authority. */
  readonly dossiers: readonly FindingsDossierMetadata[];
  readonly campaignId: string | null;
  readonly sourceSha?: string | null;
}

export interface ReviewStoreAuthorityOptions {
  /** Test-injected store root. Omitted in normal use. */
  readonly root?: string;
}

/** Why a finding has no history document. Categorical, never a guess. */
export const REVIEW_HISTORY_ABSENCE_REASONS = ['FINDING_NOT_IN_CURRENT_SNAPSHOT'] as const;
export type ReviewHistoryAbsenceReason = (typeof REVIEW_HISTORY_ABSENCE_REASONS)[number];

export class ControlCenterReviewStoreAuthority {
  private readonly store: ReviewStore;

  constructor(options: ReviewStoreAuthorityOptions = {}) {
    // The whole read-only argument in one line. Everything below inherits it.
    this.store = new ReviewStore({ root: options.root, createIfMissing: false });
  }

  get storeRoot(): string {
    return this.store.root;
  }

  get storeExists(): boolean {
    return this.store.exists;
  }

  /**
   * Current artifacts by finding id, for the findings that exist right now.
   *
   * Built once per request. A finding absent from this map is not stale — it
   * is unresolvable, and the difference matters: "the review no longer binds"
   * and "we cannot see what it would bind to" are different facts about the
   * operator's store.
   */
  private currentArtifactsByFinding(context: ReviewStoreAuthorityContext): ReadonlyMap<string, CurrentReviewArtifacts> {
    const map = new Map<string, CurrentReviewArtifacts>();
    for (const dossier of context.dossiers) {
      map.set(dossier.candidateId, currentReviewArtifacts(dossier, { campaignId: context.campaignId, sourceSha: context.sourceSha ?? null }));
    }
    return map;
  }

  private currentnessResolver(context: ReviewStoreAuthorityContext): (envelope: StoredReviewEnvelope) => ReviewArtifactCurrentness {
    const byFinding = this.currentArtifactsByFinding(context);
    return (envelope) => {
      const current = byFinding.get(envelope.findingId);
      if (current === undefined) return 'UNKNOWN';
      try {
        verifyReviewCurrent(envelope.receipt, current);
        return 'CURRENT';
      } catch (error) {
        // Only a STALENESS failure means stale. Any other disagreement is a
        // validation failure the inventory already counts as corruption when
        // the envelope itself is bad, and is not silently rounded to STALE.
        return (error as Error).message.startsWith('FINDING_REVIEW_STALE') ? 'STALE' : 'UNKNOWN';
      }
    };
  }

  /**
   * Inventory the store.
   *
   * `context` is optional. Without it — the CLI's default, which has no
   * findings snapshot in hand — currentness is not resolved, and the document
   * reports `currentnessResolved: false` rather than implying that nothing is
   * current.
   */
  inventory(options: ReviewInventoryOptions & { readonly context?: ReviewStoreAuthorityContext } = {}): ReviewStoreInventory {
    const { context, ...inventoryOptions } = options;
    return inventoryReviewStore(this.store, {
      ...inventoryOptions,
      ...(context === undefined ? {} : { currentnessFor: this.currentnessResolver(context) }),
    });
  }

  /** Raw store state for one finding. Null when the finding is not projected now. */
  readState(findingId: string, context: ReviewStoreAuthorityContext): ReviewStoreReadResult | null {
    const current = this.currentArtifactsByFinding(context).get(findingId);
    return current === undefined ? null : this.store.read(findingId, current);
  }

  /**
   * One finding's review history.
   *
   * Null when the finding is not in the current snapshot: a history document
   * asserts which generation is CURRENT, and that assertion cannot be made
   * without the current artifacts. Returning a document with every generation
   * marked stale would be a different, false claim.
   */
  history(
    findingId: string,
    context: ReviewStoreAuthorityContext,
    options: { readonly offset?: number; readonly limit?: number } = {}
  ): ReviewStoreHistory | { readonly absent: ReviewHistoryAbsenceReason } {
    const dossier = context.dossiers.find((candidate) => candidate.candidateId === findingId);
    if (dossier === undefined) return { absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' };
    const current = currentReviewArtifacts(dossier, { campaignId: context.campaignId, sourceSha: context.sourceSha ?? null });
    return reviewHistoryFor(this.store, findingId, current, {
      ...options,
      // True of the CURRENT artifact, and reported where that is what it
      // means — never copied onto a historical generation.
      currentArtifactIdentity: { expectationId: dossier.expectationId, semanticContractId: dossier.semanticContractId },
    });
  }

  /**
   * The private filing artifact for one finding, with its real review state.
   *
   * The intelligence is computed through the SAME certified path the reviewer
   * surface uses, scoped to this one finding's page, so a report and the row
   * a reviewer looked at cannot disagree.
   */
  filingReport(
    findingId: string,
    context: ReviewStoreAuthorityContext
  ): FilingReportArtifact | { readonly absent: ReviewHistoryAbsenceReason } {
    const dossier = context.dossiers.find((candidate) => candidate.candidateId === findingId);
    if (dossier === undefined) return { absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' };
    // Scoped to the ONE finding this report is about. Asking for the whole
    // corpus and discarding all but one row cost `corpus x corpus`, because
    // every projected row is classified against every earlier finding: 613 ms
    // at 500 findings to produce one document. The values are unchanged —
    // history still accumulates over the whole corpus — so this removes work,
    // not evidence.
    const projected = reviewerInputsFromFindings({
      dossiers: context.dossiers,
      campaignId: context.campaignId,
      sourceSha: context.sourceSha ?? null,
      onlyFindingIds: [findingId],
      limit: 1,
    });
    const intel = projected.findings.find((finding) => finding.findingId === findingId);
    if (intel === undefined) return { absent: 'FINDING_NOT_IN_CURRENT_SNAPSHOT' };
    return buildFilingReport({ dossier, intel, storeState: this.readState(findingId, context) });
  }
}
