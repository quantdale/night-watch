// ---------------------------------------------------------------------------
// Nightwatch Control Center — reviewer surface contract.
//
// FC-1 certified the finding intelligence but left it reachable only through
// the human filing report, so a reviewer working in the browser could not see
// it. This contract is the projection the reviewer surface consumes.
//
// The epistemic class is DATA, not presentation. Every element carries
// `epistemicClass` derived at the adapter from the same mechanical provenance
// the cone already computed, so no rendering decision can promote a
// recommendation to a fact and no styling choice can make UNKNOWN read as a
// weak yes. The UI renders what the element says.
//
// Framework-neutral and free of fs, network, child-process, persistence and
// domain-service authority, like the rest of contracts/.
// ---------------------------------------------------------------------------

import { CONTROL_CENTER_CONTRACT_NAMESPACE } from './common';
import type {
  ControlCenterCollection,
  SafeControlCenterCode,
  SafeControlCenterId,
  SafeControlCenterLabel,
  SafeControlCenterTimestamp,
} from './common';

export const CONTROL_CENTER_REVIEWER_SCHEMA_VERSION = `${CONTROL_CENTER_CONTRACT_NAMESPACE}.reviewer.v1` as const;

/**
 * What kind of claim an element makes.
 *
 * FACT — mechanically derived from evidence the cone holds.
 * RECOMMENDATION — advisory; a human makes the call. Anything the cone marks
 *   `advisoryOnly` lands here and can never be projected as FACT.
 * UNKNOWN — the cone reached no conclusion. First-class: it grants no
 *   authority, carries no advisory pointer, and is never a weak affirmative.
 */
export const CONTROL_CENTER_EPISTEMIC_CLASSES = ['FACT', 'RECOMMENDATION', 'UNKNOWN'] as const;
export type ControlCenterEpistemicClass = (typeof CONTROL_CENTER_EPISTEMIC_CLASSES)[number];

/** One projected claim: its value, what kind of claim it is, and why. */
export interface ControlCenterReviewerElementDto<TValue> {
  readonly epistemicClass: ControlCenterEpistemicClass;
  /** null exactly when `epistemicClass` is UNKNOWN. */
  readonly value: TValue | null;
  /** Categorical evidence codes only — never a value, never free prose. */
  readonly basis: readonly SafeControlCenterCode[];
}

export interface ControlCenterRelationshipValueDto {
  readonly relationship: SafeControlCenterCode;
  readonly confidence: SafeControlCenterCode;
  /** Advisory pointer to the earlier finding. Absent whenever the class is UNKNOWN. */
  readonly possibleOriginalId: SafeControlCenterId | null;
  readonly counterevidence: readonly SafeControlCenterCode[];
  readonly advisoryOnly: true;
  readonly finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL';
}

export interface ControlCenterDuplicateSuggestionDto {
  readonly findingId: SafeControlCenterId;
  readonly relationship: SafeControlCenterCode;
  readonly confidence: SafeControlCenterCode;
  readonly basis: readonly SafeControlCenterCode[];
  readonly advisoryOnly: true;
  readonly finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL';
}

export interface ControlCenterRecurrenceValueDto {
  readonly recurrence: SafeControlCenterCode;
  readonly priorFindingId: SafeControlCenterId | null;
}

export interface ControlCenterDefectClassValueDto {
  readonly classId: SafeControlCenterId;
  /** Identifier shape, not a display label: an expectation identity may
   *  legitimately contain vocabulary the label screen rejects. */
  readonly sharedInvariant: SafeControlCenterId;
  readonly memberFindingIds: readonly SafeControlCenterId[];
  readonly confidence: SafeControlCenterCode;
  readonly counterexampleCount: number;
  readonly unknownCount: number;
}

export interface ControlCenterAlphausRecommendationDto {
  readonly severity: ControlCenterReviewerElementDto<SafeControlCenterCode>;
  readonly catchStage: ControlCenterReviewerElementDto<SafeControlCenterCode>;
  readonly source: ControlCenterReviewerElementDto<SafeControlCenterCode>;
  /** UNKNOWN unless team attribution carries evidence; never inferred. */
  readonly team: ControlCenterReviewerElementDto<SafeControlCenterLabel>;
}

export interface ControlCenterLocalReviewValueDto {
  readonly state: SafeControlCenterCode;
  readonly decision: SafeControlCenterCode | null;
  readonly reviewedAt: SafeControlCenterTimestamp | null;
  readonly transitionCount: number;
  /**
   * Whether the recorded decision still binds to the current artifacts.
   * UNKNOWN when currentness was not established; a stale binding is never
   * silently displayed as a live decision.
   */
  readonly bindingCurrentness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
  readonly notEquivalentTo: readonly ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'];
}

export interface ControlCenterReviewerFindingDto {
  readonly findingId: SafeControlCenterId;
  readonly relationship: ControlCenterReviewerElementDto<ControlCenterRelationshipValueDto>;
  readonly probableDuplicates: readonly ControlCenterDuplicateSuggestionDto[];
  readonly recurrence: ControlCenterReviewerElementDto<ControlCenterRecurrenceValueDto>;
  readonly defectClass: ControlCenterReviewerElementDto<ControlCenterDefectClassValueDto>;
  readonly expectationProvenance: ControlCenterReviewerElementDto<SafeControlCenterCode>;
  readonly confidence: ControlCenterReviewerElementDto<SafeControlCenterCode>;
  readonly alphausRecommendation: ControlCenterAlphausRecommendationDto;
  readonly localReview: ControlCenterReviewerElementDto<ControlCenterLocalReviewValueDto>;
  /**
   * The identity a local decision must be submitted against.
   *
   * Null when no review store is configured, which is also when no decision
   * can be recorded. It is a digest of the review binding and carries no
   * finding content, so publishing it costs nothing; what it buys is that a
   * client submits the identity it was SHOWN. If the artifacts moved between
   * render and click, the server recomputes a different identity and refuses
   * the write instead of binding a decision to a state the reviewer never saw.
   */
  readonly reviewIdentity: SafeControlCenterId | null;
  readonly unknowns: readonly SafeControlCenterCode[];
}

export interface ControlCenterReviewerDto extends ControlCenterCollection<ControlCenterReviewerFindingDto> {
  readonly schemaVersion: typeof CONTROL_CENTER_REVIEWER_SCHEMA_VERSION;
  readonly state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE';
  /** Restated on the payload so a consumer reading one field cannot miss it. */
  readonly finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL';
  readonly organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY';
}
