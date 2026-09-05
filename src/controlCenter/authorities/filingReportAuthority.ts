// ---------------------------------------------------------------------------
// Nightwatch Control Center — the private human filing report, generated from
// real local authority state.
//
// `renderHumanFilingReport()` was certified by FC-1 and then called by nothing
// but its own tests. This module is the production-local path it never had: it
// composes the owner-local findings projection, the certified finding
// intelligence, and the persisted review state into the one artifact a human
// actually copies into Leslie or Pondr — by hand, because nothing here can
// send anything anywhere.
//
// WHAT IT WILL NOT DO. It never reaches a raw dossier. The findings authority
// deliberately withholds evidence bodies, source paths, titles it could not
// screen, and payload values, so the fields a filing report would like to
// contain — reproduction steps, evidence excerpts, an observed value — are
// simply not available to it. It says so, categorically, in the report. The
// alternative is a report that reads as though it reproduced something,
// which is the failure mode that matters here: this document exists to be
// pasted into a bug tracker by a person who will be believed.
//
// REVIEW STATE IS FOUR STATES. CURRENT, STALE, CORRUPT and NO_REVIEW render
// four different ways, and a corrupt generation never contributes a decision.
// Where a corrupt generation sits beside a valid one, the valid one is used
// AND the corruption is named in the unknowns — hiding it would make the
// report quieter than the store.
//
// Pure with respect to publication: no network, no child process, no external
// client, and hardening pins that.
// ---------------------------------------------------------------------------

import {
  renderHumanFilingReport,
  type FilingReportReview,
  type FilingReportReviewState,
  type HumanFilingReportInput,
} from '../../core/findingReview';
import type { ReviewStoreReadResult } from '../../core/reviewStore';
import type { FindingsDossierMetadata } from './findingsAuthority';
import type { ReviewerFindingInput } from '../adapters/reviewerAdapter';

/** Version stamped into every generated filing artifact. */
export const CONTROL_CENTER_FILING_REPORT_VERSION = 'nightwatch.control-center-filing-report.v1' as const;

/** Everything the report says about where it may go. It is one value: nowhere. */
export const FILING_REPORT_DISTRIBUTION = 'PRIVATE_LOCAL_MANUAL_COPY_ONLY' as const;

export interface FilingReportArtifact {
  readonly schemaVersion: typeof CONTROL_CENTER_FILING_REPORT_VERSION;
  readonly findingId: string;
  readonly reviewState: FilingReportReviewState;
  readonly markdown: string;
  readonly distribution: typeof FILING_REPORT_DISTRIBUTION;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

const SEVERITY_LABEL: Readonly<Record<string, string>> = Object.freeze({
  CRITICAL: 'BLOCKER',
  HIGH: 'CRITICAL',
  MEDIUM: 'MAJOR',
  LOW: 'MINOR',
});

/**
 * Map the store's read result onto the report's review vocabulary.
 *
 * Exported for direct test. The mapping is where a stale decision would most
 * plausibly become a current one — one wrong branch, in a function whose
 * output is prose — so it is a named total function over the four states
 * rather than a conditional buried in a template.
 */
export function filingReportReviewFor(state: ReviewStoreReadResult | null): FilingReportReview {
  const absent: FilingReportReview = { state: 'NO_REVIEW', decision: null, resultingState: null, reviewedAt: null, rationale: null };
  if (state === null) return absent;
  switch (state.state) {
    case 'CURRENT':
    case 'STALE': {
      const envelope = state.envelope;
      // A state that names a decision must have one. If the store somehow
      // reports CURRENT with no envelope, that is not a decision to render.
      if (envelope === null) return { ...absent, state: 'CORRUPT' };
      return {
        state: state.state,
        decision: envelope.receipt.decision,
        resultingState: envelope.record.state,
        reviewedAt: envelope.receipt.reviewedAt,
        rationale: envelope.receipt.rationale === '' ? null : envelope.receipt.rationale,
      };
    }
    case 'CORRUPT':
      return { ...absent, state: 'CORRUPT' };
    case 'NO_REVIEW':
    default:
      return absent;
  }
}

/**
 * The unknowns a filing report must carry, on top of the reviewer's own.
 *
 * Every one of these is a real limit of the local projection, stated so a
 * human reading the report knows what it did NOT establish.
 */
function filingUnknowns(
  dossier: FindingsDossierMetadata,
  intel: ReviewerFindingInput,
  review: FilingReportReview,
  storeState: ReviewStoreReadResult | null
): readonly string[] {
  const unknowns: string[] = [
    'Reproduction steps, evidence bodies and observed values are withheld by the owner-local findings projection and are not available to this report.',
  ];
  if (dossier.expectationId === null) unknowns.push('No expectation identity is mechanically established for this finding.');
  if (dossier.semanticContractId === null) unknowns.push('No semantic contract identity is mechanically established for this finding.');
  if (dossier.sourceCurrentness !== 'CURRENT') unknowns.push(`Source currentness is ${dossier.sourceCurrentness}; the finding may not describe current source.`);
  if (intel.defectClass === null) unknowns.push('No defect class was identified for this finding.');
  if (review.state === 'STALE') unknowns.push('The stored local review does not bind to this artifact generation; a human decision is required for it.');
  if (review.state === 'CORRUPT') unknowns.push('A stored local review exists for this finding and did not survive validation.');
  // A valid generation does not make an invalid sibling disappear. Naming it
  // here keeps the report from being quieter than the store it read.
  if (storeState !== null && storeState.corruption.length > 0 && review.state !== 'CORRUPT') {
    unknowns.push(`${storeState.corruption.length} stored review generation(s) for this finding did not survive validation and were excluded.`);
  }
  unknowns.push('Organizational severity, team ownership and duplicate status are decided by a human, not by this report.');
  return unknowns;
}

export interface FilingReportInput {
  readonly dossier: FindingsDossierMetadata;
  /** The certified intelligence for this finding, from reviewerInputsFromFindings. */
  readonly intel: ReviewerFindingInput;
  /** Persisted review state, or null when no review store is configured. */
  readonly storeState: ReviewStoreReadResult | null;
}

/**
 * Build the filing artifact for one finding.
 *
 * Every text field is derived from projected metadata and fixed vocabulary.
 * Nothing is invented: where the projection has no value, the report states
 * the absence rather than describing behaviour it did not observe.
 */
export function buildFilingReport(input: FilingReportInput): FilingReportArtifact {
  const { dossier, intel, storeState } = input;
  const review = filingReportReviewFor(storeState);
  const fingerprint = dossier.oracleFingerprint;
  const reproductionResult = dossier.reproduction.result;
  const severity = SEVERITY_LABEL[dossier.technicalSeverity] ?? 'UNKNOWN';

  const report: HumanFilingReportInput = {
    title: dossier.title ?? `Local finding ${dossier.candidateId}`,
    candidateId: dossier.candidateId,
    confidence: intel.confidence,
    confidenceBasis: `dossier confidence level ${dossier.confidence.level}, evidence level ${dossier.evidenceLevel}`,
    expectationId: dossier.expectationId ?? 'UNKNOWN',
    expectationProvenance: intel.expectationProvenance,
    semanticContractId: dossier.semanticContractId,
    classification: {
      severity,
      severityBasis: `dossier technical severity ${dossier.technicalSeverity}`,
      catchStage: intel.alphausRecommendation.catchStage,
      catchStageBasis: intel.alphausRecommendation.catchStageBasis,
      source: intel.alphausRecommendation.source,
      sourceBasis: intel.alphausRecommendation.sourceBasis,
      // Never inferred. The reviewer authority already refuses to name a team
      // without evidence, and this report does not get a second opinion.
      team: intel.alphausRecommendation.team,
      teamEvidence: intel.alphausRecommendation.teamEvidence,
    },
    reproduction: [
      `Reproduction outcome recorded by Nightwatch: ${reproductionResult} across ${dossier.reproduction.count} observation(s).`,
      `Minimality guarantee: ${dossier.reproduction.minimalityGuarantee}.`,
      `Deterministic oracle fingerprint: ${fingerprint}.`,
      'Concrete steps are held in the owner-local dossier and are not projected here.',
    ],
    expectedBehavior:
      dossier.expectationId === null
        ? 'No mechanically established expectation identity exists for this finding; the expected behaviour claim is UNKNOWN.'
        : `The expectation ${dossier.expectationId} is expected to hold for this operation.`,
    actualBehavior: `Nightwatch observed a violation with reproduction outcome ${reproductionResult} and evidence level ${dossier.evidenceLevel}. Observed values are withheld by the local privacy projection.`,
    evidence: [
      `Oracle fingerprint ${fingerprint}`,
      `Evidence level ${dossier.evidenceLevel}`,
      `Reproduction ${reproductionResult} x${dossier.reproduction.count}`,
      `Source currentness ${dossier.sourceCurrentness}`,
      `Dossier content digest ${dossier.contentDigest}`,
    ],
    relatedFindings: intel.probableDuplicates
      .map((duplicate) => duplicate.possibleOriginalId)
      .filter((id): id is string => typeof id === 'string')
      .map((id) => `${id} (advisory duplicate suggestion; a human decides)`),
    recurrence:
      intel.recurrence === null
        ? 'UNKNOWN_HISTORY — no mechanical history was available to classify against.'
        : `${intel.recurrence.recurrence}${intel.recurrence.priorFindingId === null ? '' : ` (prior ${intel.recurrence.priorFindingId})`}`,
    defectClass: intel.defectClass === null ? null : `${intel.defectClass.classId} over invariant ${intel.defectClass.sharedInvariant}`,
    review,
    unknowns: filingUnknowns(dossier, intel, review, storeState),
    privacyRedactions: [
      'raw evidence bodies',
      'source file paths',
      'request and response payload values',
      'customer, account and cost values',
    ],
  };

  return {
    schemaVersion: CONTROL_CENTER_FILING_REPORT_VERSION,
    findingId: dossier.candidateId,
    reviewState: review.state,
    markdown: renderHumanFilingReport(report),
    distribution: FILING_REPORT_DISTRIBUTION,
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}
