// ---------------------------------------------------------------------------
// Nightwatch Control Center — review-store operations contract.
//
// The operator-facing projection of an owner-local store that is designed to
// grow forever and never delete evidence. Three documents: an inventory, one
// finding's generation history, and the private filing artifact.
//
// Three properties are contract, not implementation detail:
//
// CURRENT AND HISTORICAL ARE DIFFERENT SHAPES, NOT DIFFERENT COLOURS. Every
// generation carries `currentness` as DATA. A surface that distinguished them
// by styling alone would collapse the distinction for anyone reading in
// monochrome, through a screen reader, or in a copied-out payload — and the
// distinction is the whole point of keeping stale reviews.
//
// AN UNKNOWN ENTRY IS NEVER NAMED. Canonical and temporary file names have
// pinned hex shapes and are safe to carry. An unrecognized entry's name is a
// string this repository did not choose, so the contract has no field for it:
// only a digest and a size. There is nothing to forget to redact.
//
// COUNTS ARE GLOBAL, ROWS ARE BOUNDED. Every list carries explicit page
// bounds. A 50,000-review store answers "how many" exactly and "which ones"
// a page at a time.
//
// Framework-neutral and free of fs, network, child-process, persistence and
// domain-service authority, like the rest of contracts/.
// ---------------------------------------------------------------------------

import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';
import type {
  SafeControlCenterCode,
  SafeControlCenterDigest,
  SafeControlCenterId,
  SafeControlCenterTimestamp,
} from './common';

export const CONTROL_CENTER_REVIEW_STORE_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.review-store.v1` as const;
export const CONTROL_CENTER_REVIEW_HISTORY_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.review-history.v1` as const;
export const CONTROL_CENTER_REVIEW_FILING_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.review-filing.v1` as const;

/** Explicit bounds on every list this surface can return. */
export interface ControlCenterReviewPageDto {
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
  readonly truncated: boolean;
}

export interface ControlCenterReviewCountsDto {
  readonly entries: number;
  readonly canonicalArtifacts: number;
  readonly validArtifacts: number;
  readonly corruptArtifacts: number;
  readonly unreadableArtifacts: number;
  readonly temporaryArtifacts: number;
  readonly unknownEntries: number;
  readonly nonFileEntries: number;
  readonly uniqueFindings: number;
  readonly generations: number;
  readonly findingsWithMultipleGenerations: number;
  readonly current: number;
  readonly stale: number;
  readonly unknownCurrentness: number;
}

export interface ControlCenterReviewBytesDto {
  readonly total: number;
  readonly canonical: number;
  readonly temporary: number;
  readonly unknown: number;
  readonly nonFile: number;
}

/** One decision or resulting-state tally. A list, so the shape is stable. */
export interface ControlCenterReviewTallyDto {
  readonly code: SafeControlCenterCode;
  readonly count: number;
}

export interface ControlCenterReviewHealthDto {
  /** Every condition that holds, in declared severity order. Never collapsed. */
  readonly conditions: readonly SafeControlCenterCode[];
  readonly classification: SafeControlCenterCode;
}

export interface ControlCenterReviewCorruptionRowDto {
  /** Pinned hex shape; safe to carry. */
  readonly fileName: SafeControlCenterId;
  readonly code: SafeControlCenterCode;
}

/** An unrecognized entry. There is deliberately no name field. */
export interface ControlCenterReviewUnknownRowDto {
  readonly nameDigest: SafeControlCenterDigest;
  readonly bytes: number;
  readonly kind: SafeControlCenterCode;
}

export interface ControlCenterReviewTemporaryRowDto {
  readonly name: SafeControlCenterId;
  readonly bytes: number;
}

export interface ControlCenterReviewFindingRowDto {
  readonly findingId: SafeControlCenterId;
  readonly generations: number;
  readonly currentGenerations: number;
  readonly staleGenerations: number;
  readonly unknownGenerations: number;
}

export interface ControlCenterReviewStoreDto {
  readonly schemaVersion: typeof CONTROL_CENTER_REVIEW_STORE_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'UNAVAILABLE';
  readonly exists: boolean;
  readonly depth: SafeControlCenterCode;
  /**
   * Whether currentness was resolved at all. Without it every artifact reads
   * UNKNOWN, and a reader must be able to tell that from "nothing is current".
   */
  readonly currentnessResolved: boolean;
  readonly counts: ControlCenterReviewCountsDto;
  readonly bytes: ControlCenterReviewBytesDto;
  readonly health: ControlCenterReviewHealthDto;
  readonly byDecision: readonly ControlCenterReviewTallyDto[];
  readonly byResultingState: readonly ControlCenterReviewTallyDto[];
  readonly oldestStoredAt: SafeControlCenterTimestamp | null;
  readonly newestStoredAt: SafeControlCenterTimestamp | null;
  readonly corruption: readonly ControlCenterReviewCorruptionRowDto[];
  readonly corruptionPage: ControlCenterReviewPageDto;
  readonly unknownEntries: readonly ControlCenterReviewUnknownRowDto[];
  readonly unknownEntriesPage: ControlCenterReviewPageDto;
  readonly temporaries: readonly ControlCenterReviewTemporaryRowDto[];
  readonly temporariesPage: ControlCenterReviewPageDto;
  readonly findings: readonly ControlCenterReviewFindingRowDto[];
  readonly findingsPage: ControlCenterReviewPageDto;
  readonly inventoryDigest: SafeControlCenterDigest;
  /** Restated on the payload: this surface reads, and nothing else. */
  readonly readOnly: true;
  /** No retention policy exists to invoke, and the payload says so. */
  readonly retentionPolicy: 'NONE_OWNER_DECISION_PENDING';
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export interface ControlCenterReviewGenerationDto {
  readonly reviewIdentity: SafeControlCenterId;
  readonly sourceSha: SafeControlCenterId;
  readonly campaignId: SafeControlCenterId;
  readonly dossierDigest: SafeControlCenterDigest;
  readonly findingDigest: SafeControlCenterDigest;
  readonly reviewedAt: SafeControlCenterTimestamp;
  readonly storedAt: SafeControlCenterTimestamp;
  readonly decision: SafeControlCenterCode;
  readonly resultingState: SafeControlCenterCode;
  /** DATA, never styling. See the module note. */
  readonly currentness: 'CURRENT' | 'STALE';
  readonly staleReason: SafeControlCenterCode | null;
  /** Always null under the v1 binding; the reason names why. */
  readonly expectationId: null;
  readonly semanticContractId: null;
  readonly identityAbsenceReason: SafeControlCenterCode;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export interface ControlCenterReviewHistoryDto {
  readonly schemaVersion: typeof CONTROL_CENTER_REVIEW_HISTORY_SCHEMA_VERSION;
  readonly findingId: SafeControlCenterId;
  readonly state: SafeControlCenterCode;
  readonly generations: readonly ControlCenterReviewGenerationDto[];
  readonly page: ControlCenterReviewPageDto;
  readonly currentGeneration: SafeControlCenterId | null;
  readonly staleGenerationCount: number;
  readonly corruption: readonly ControlCenterReviewCorruptionRowDto[];
  /** A local historical fact about this store. Never an organizational claim. */
  readonly decisionChangedAcrossGenerations: boolean;
  /** Identities of the artifact as it exists NOW, never of a generation. */
  readonly currentExpectationId: SafeControlCenterId | null;
  readonly currentSemanticContractId: SafeControlCenterId | null;
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}

export interface ControlCenterReviewFilingDto {
  readonly schemaVersion: typeof CONTROL_CENTER_REVIEW_FILING_SCHEMA_VERSION;
  readonly findingId: SafeControlCenterId;
  readonly reviewState: SafeControlCenterCode;
  /** The copyable artifact. Bounded and screened before it reaches here. */
  readonly markdown: string;
  readonly distribution: 'PRIVATE_LOCAL_MANUAL_COPY_ONLY';
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}
