// ---------------------------------------------------------------------------
// Nightwatch AH-1 — the Alphaus-compatible human-review finding handoff.
//
// A PROJECTION-ONLY artifact derived from the canonical BugDossier
// (`src/core/triage`). It converts a privacy-safe, evidence-backed Nightwatch
// finding into a structured artifact compatible with the Alphaus
// bug-management / Leslie workflow described in owner-supplied Slack-derived
// operational evidence (2026-09-04, pilot-sensitive, NOT canonical policy).
//
// The final arrow is outside Nightwatch authority: this module produces a
// local/private human-review artifact. It cannot file, message, publish,
// approve, score, or submit anything. See the authority block below: every
// field is a literal type, so weakening it breaks compilation AND tests.
//
// Three categories (§12 of the campaign brief):
//   A. proven factual fields — mechanically established from the dossier;
//   B. suggested organizational classifications — recommendation + basis +
//      provenance, or UNKNOWN. Never guessed.
//   C. mandatory authority metadata — literal, non-weakable.
//
// Privacy: downstream of the dossier sanitization boundary. Free-text drafts
// are sentinel-scanned here (defense in depth: the dossier is already clean,
// drafts are the untrusted edge). The sentinel pattern mirrors
// `src/core/triage/dossier.ts` SENTINEL_RE deliberately rather than by
// import: the handoff cone stays import-isolated (see
// checkAlphausHandoffBoundary), and any divergence fails closed (reject).
// ---------------------------------------------------------------------------

import type { AiBugModelOutput } from '../aiReview/types';
import type { BugDossier } from '../triage/types';
import { sha256Hex, stableJsonSorted } from '../identity/canonicalDigest';

export const ALPHAUS_FINDING_HANDOFF_VERSION = 'nightwatch.alphaus-finding-handoff.v1' as const;

/** Leslie-style severity values (Slack-derived 2026-09-04; pilot-sensitive). */
export const ALPHAUS_SEVERITY_VALUES = ['blocker', 'critical', 'major', 'minor'] as const;
export type AlphausSeverityValue = (typeof ALPHAUS_SEVERITY_VALUES)[number];

/** Leslie-style catch-stage values (Slack-derived 2026-09-04). */
export const ALPHAUS_CATCH_STAGE_VALUES = ['pr_review', 'next', 'production', 'production_outage'] as const;
export type AlphausCatchStageValue = (typeof ALPHAUS_CATCH_STAGE_VALUES)[number];

/** Leslie-style source values (Slack-derived 2026-09-04). */
export const ALPHAUS_SOURCE_VALUES = ['self_found', 'customer_escaped'] as const;
export type AlphausSourceValue = (typeof ALPHAUS_SOURCE_VALUES)[number];

/** Contribution categories Nightwatch may suggest (Slack-derived). */
export const ALPHAUS_REPORT_TYPE_VALUES = [
  'BUG_REPORT',
  'PR_REVIEW_CONTRIBUTION',
  'TEST_CONTRIBUTION',
  'BUG_CLASS_REMOVAL',
] as const;
export type AlphausReportTypeValue = (typeof ALPHAUS_REPORT_TYPE_VALUES)[number];

/**
 * Observed consequence classes that may justify a severity recommendation
 * (§13). Each must be asserted by the caller with dossier evidence behind it;
 * the projector checks presence, never infers.
 */
export const ALPHAUS_SEVERITY_EVIDENCE_CLASSES = [
  'TOTAL_INABILITY_TO_USE_OR_TEST',
  'AUTHENTICATION_IMPOSSIBLE_CONFIRMED',
  'DATA_LOSS_CONFIRMED',
  'SECURITY_IMPACT_CONFIRMED',
  'DATA_CORRECTNESS_IMPACT_CONFIRMED',
  'INVOICING_FAILURE_CONFIRMED',
  'INTERMITTENT_KEY_FEATURE_FAILURE',
  'KEY_FUNCTION_TIMEOUT_CONFIRMED',
  'COSMETIC_ONLY_CONFIRMED',
] as const;
export type AlphausSeverityEvidenceClass = (typeof ALPHAUS_SEVERITY_EVIDENCE_CLASSES)[number];

/** Where the underlying observation was made (Nightwatch-native provenance). */
export const ALPHAUS_OBSERVATION_STAGES = ['LOCAL', 'DEV', 'NEXT', 'PRODUCTION', 'SOURCE_ANALYSIS'] as const;
export type AlphausObservationStage = (typeof ALPHAUS_OBSERVATION_STAGES)[number];

export interface AlphausObservationProvenance {
  readonly stage: AlphausObservationStage;
  /** True only with explicit evidence that an outage occurred (§14). */
  readonly outageEvidence: boolean;
  /** True only when a customer report provably exists (§15). */
  readonly customerReported: boolean;
  /** Reference to the customer report; required when customerReported. */
  readonly customerReportRef: string | null;
}

/** A recommendation carries its basis and provenance, or is UNKNOWN. */
export interface AlphausRecommendation<T extends string> {
  readonly value: T | 'UNKNOWN';
  readonly basis: string;
  readonly provenance: string;
}

/** Proven factual fields (category A). Dossier identity IS candidateId. */
export interface AlphausFindingFacts {
  readonly candidateId: string;
  readonly dossierVersion: BugDossier['schemaVersion'];
  readonly campaignRef: string | null;
  readonly firstObserved: string | null;
  readonly lastObserved: string | null;
  readonly journeys: readonly string[];
  readonly seeds: readonly string[];
  readonly oracleFingerprint: string;
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly reproduction: BugDossier['reproduction'];
  readonly minimalSequence: readonly string[];
  readonly faultBoundary: BugDossier['likelyFaultBoundary']['primaryBoundary'];
  readonly confidence: BugDossier['confidence']['level'];
  readonly evidenceLevel: BugDossier['evidenceLevel'];
  readonly sourceRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly alternativesRuledOut: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly limitations: readonly string[];
}

/** Investigation-quality projection (reproduction / expected / actual). */
export interface AlphausInvestigationProjection {
  readonly reproduction: string | null;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly impact: string | null;
}

/** The handoff artifact (categories A + B + C). */
export interface AlphausFindingHandoff {
  readonly schemaVersion: typeof ALPHAUS_FINDING_HANDOFF_VERSION;
  readonly findingId: string;
  readonly facts: AlphausFindingFacts;
  readonly investigation: AlphausInvestigationProjection;
  readonly severityRecommendation: AlphausRecommendation<AlphausSeverityValue>;
  readonly catchStageRecommendation: AlphausRecommendation<AlphausCatchStageValue>;
  readonly sourceRecommendation: AlphausRecommendation<AlphausSourceValue>;
  /** v1 admits no proven team value: Nightwatch has no team-evidence source. */
  readonly teamRecommendation: AlphausRecommendation<never>;
  readonly reportTypeRecommendation: AlphausRecommendation<AlphausReportTypeValue>;
  readonly authority: {
    readonly humanReviewRequired: true;
    readonly executable: false;
    readonly externalPublication: 'PROHIBITED';
    readonly autoFile: false;
    readonly autoApprove: false;
  };
  readonly deterministicDigest: string;
}

export interface AlphausHandoffInput {
  readonly dossier: BugDossier;
  readonly bugDraft: AiBugModelOutput | null;
  readonly campaignRef: string | null;
  readonly observationProvenance: AlphausObservationProvenance;
  /** Asserted consequence classes, each backed by dossier evidence. */
  readonly severityEvidence: readonly AlphausSeverityEvidenceClass[];
  /** Provenance string for the severity basis (e.g. dossier + expectation id). */
  readonly severityProvenance: string;
  /**
   * Optional systematic-prevention evidence for BUG_CLASS_REMOVAL. Absent by
   * default: fixing one instance never implies a class removal.
   */
  readonly classRemovalEvidence: string | null;
}

export type { AiBugModelOutput, BugDossier };

export function alphausFindingDigest(value: unknown): string {
  return sha256Hex(stableJsonSorted(value)).slice(0, 24);
}
