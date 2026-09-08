// ---------------------------------------------------------------------------
// Nightwatch Control Center — reviewer projection.
//
// A projection, not a second opinion. Every value here comes from
// src/core/findingIntel/ or src/core/findingReview/; this module classifies
// each one as FACT, RECOMMENDATION or UNKNOWN from the provenance the cone
// already carries, and screens it for the public surface. It never derives a
// relationship, a recurrence or a class of its own, and it never supplies a
// default for an input the cones did not produce.
//
// Fail-closed is the default for malformed input. An absent OPTIONAL result is
// a real cone answer ("none identified") and projects as UNKNOWN; an input
// that is missing, mistyped, or outside the cone vocabulary is a contract
// breach and throws. Error codes name the field and never the value, so a
// rejected sentinel cannot escape through the error path.
//
// Pure: no fs, network, child_process, persistence, or domain-service
// authority. The Control Center gains no authority from this file.
// ---------------------------------------------------------------------------

import {
  EXPECTATION_PROVENANCE,
  FINDING_RECURRENCE,
  FINDING_RELATIONSHIPS,
  INTEL_CONFIDENCE,
  type DefectClass,
  type RecurrenceResult,
  type RelationshipResult,
} from '../../core/findingIntel';
import {
  FINDING_REVIEW_DECISIONS,
  FINDING_REVIEW_STATES,
  type FindingReviewReceipt,
  type FindingReviewRecord,
} from '../../core/findingReview';
import {
  asSafeControlCenterCode,
  asSafeControlCenterCursor,
  asSafeControlCenterId,
  asSafeControlCenterLabel,
  asSafeControlCenterTimestamp,
  isRecord,
} from '../contracts/common';
import type {
  SafeControlCenterCode,
  SafeControlCenterId,
  SafeControlCenterLabel,
  SafeControlCenterTimestamp,
} from '../contracts/common';
import {
  CONTROL_CENTER_REVIEWER_SCHEMA_VERSION,
  type ControlCenterAlphausRecommendationDto,
  type ControlCenterDefectClassValueDto,
  type ControlCenterDuplicateSuggestionDto,
  type ControlCenterLocalReviewValueDto,
  type ControlCenterRecurrenceValueDto,
  type ControlCenterRelationshipValueDto,
  type ControlCenterReviewerDto,
  type ControlCenterReviewerElementDto,
  type ControlCenterReviewerFindingDto,
} from '../contracts/reviewer';
import { boundedCollection,
  boundedCursorOffset, boundedCount, safePublicId } from './common';

/**
 * The same sentinel vocabulary the FC-1 filing report screens. Two screens
 * exist because two surfaces exist; a shared helper across the cone boundary
 * would give the Control Center a reason to import the review cone's
 * internals. Kept literal and in sync by hardening.
 */
const SENTINEL_RE =
  /(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

const MAX_DUPLICATES = 20;
const MAX_MEMBERS = 40;
const MAX_UNKNOWNS = 20;

/** Contract breach in the reviewer projection. Carries a field name, never a value. */
export class ReviewerProjectionError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`REVIEWER_PROJECTION_INVALID:${field}`);
    this.name = 'ReviewerProjectionError';
    this.field = field;
  }
}

function fail(field: string): never {
  throw new ReviewerProjectionError(field);
}

function screened(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(field);
  if (SENTINEL_RE.test(value)) fail(field);
  return value;
}

/** A code from a FIXED cone vocabulary. Anything outside it is a breach. */
function vocabularyCode(value: unknown, vocabulary: readonly string[], field: string): SafeControlCenterCode {
  const text = screened(value, field);
  if (!vocabulary.includes(text)) fail(field);
  const code = asSafeControlCenterCode(text);
  if (code === null) fail(field);
  return code;
}

function safeCode(value: unknown, field: string): SafeControlCenterCode {
  const code = asSafeControlCenterCode(screened(value, field));
  if (code === null) fail(field);
  return code;
}

function safeLabel(value: unknown, field: string): SafeControlCenterLabel {
  const label = asSafeControlCenterLabel(screened(value, field));
  if (label === null) fail(field);
  return label;
}

function safeId(value: unknown, field: string): SafeControlCenterId {
  const text = screened(value, field);
  return safePublicId(text, 'cc-reviewer');
}

function safeTimestamp(value: unknown, field: string): SafeControlCenterTimestamp {
  const stamp = asSafeControlCenterTimestamp(screened(value, field));
  if (stamp === null) fail(field);
  return stamp;
}

function codeList(values: unknown, field: string, limit: number): readonly SafeControlCenterCode[] {
  if (!Array.isArray(values)) fail(field);
  if (values.length > limit) fail(field);
  return values.map((value, index) => safeCode(value, `${field}[${index}]`));
}

/** UNKNOWN is a value-free state: no value, and no basis that could read as a pointer. */
function unknownElement(basis: readonly SafeControlCenterCode[] = []): ControlCenterReviewerElementDto<never> {
  return { epistemicClass: 'UNKNOWN', value: null, basis };
}

function factElement<T>(value: T, basis: readonly SafeControlCenterCode[]): ControlCenterReviewerElementDto<T> {
  return { epistemicClass: 'FACT', value, basis };
}

function recommendationElement<T>(value: T, basis: readonly SafeControlCenterCode[]): ControlCenterReviewerElementDto<T> {
  return { epistemicClass: 'RECOMMENDATION', value, basis };
}

export interface ReviewerAlphausRecommendationInput {
  readonly severity: string;
  readonly severityBasis: string;
  readonly catchStage: string;
  readonly catchStageBasis: string;
  readonly source: string;
  readonly sourceBasis: string;
  /** Exactly 'UNKNOWN' unless `teamEvidence` proves otherwise. */
  readonly team: string;
  readonly teamEvidence: string | null;
}

export interface ReviewerLocalReviewInput {
  readonly record: FindingReviewRecord;
  readonly receipt: FindingReviewReceipt | null;
  readonly bindingCurrentness: 'CURRENT' | 'STALE' | 'UNKNOWN';
}

export interface ReviewerFindingInput {
  readonly findingId: string;
  /** null when the cone found no comparable earlier finding. */
  readonly relationship: RelationshipResult | null;
  readonly probableDuplicates: readonly RelationshipResult[];
  /** null when no history was available to classify against. */
  readonly recurrence: RecurrenceResult | null;
  /** null when no defect class was identified. */
  readonly defectClass: DefectClass | null;
  readonly expectationProvenance: string;
  readonly confidence: string;
  readonly alphausRecommendation: ReviewerAlphausRecommendationInput;
  /** null when no local review decision has been recorded. */
  readonly localReview: ReviewerLocalReviewInput | null;
  /**
   * Identity a decision binds to; null or absent when no review store is
   * configured. Optional so a caller with no store need not say so twice.
   */
  readonly reviewIdentity?: string | null;
  readonly unknowns: readonly string[];
}

export interface ReviewerProjectionInput {
  readonly findings: readonly ReviewerFindingInput[];
  readonly available?: boolean;
  /**
   * Size of the corpus `findings` was drawn from, when the caller already
   * paged. Without it a page-scoped caller would report `truncated: false`
   * for a 10,000-finding corpus — a worse untruth than the latency the
   * page-scoping removes.
   */
  readonly total?: number;
  /**
   * NW-10. When the caller already selected the page, the offset it selected
   * at. Its presence means `findings` IS the page: the projection must not
   * slice again — doing so would page twice and skip records — and the
   * continuation cursor is measured from here instead of from the page
   * length.
   */
  readonly pageOffset?: number;
}

function projectRelationship(
  result: RelationshipResult | null | undefined,
  field: string
): ControlCenterReviewerElementDto<ControlCenterRelationshipValueDto> {
  if (result === undefined) fail(field);
  if (result === null) return unknownElement();
  if (!isRecord(result)) fail(field);
  const relationship = vocabularyCode(result.relationship, FINDING_RELATIONSHIPS, `${field}.relationship`);
  const confidence = vocabularyCode(result.confidence, INTEL_CONFIDENCE, `${field}.confidence`);
  // The cone's own advisory marking is what decides the class. A relationship
  // that lost `advisoryOnly` is a breach, not a promotion to fact.
  if (result.advisoryOnly !== true) fail(`${field}.advisoryOnly`);
  if (result.finalVerdictAuthority !== 'HUMAN_ORGANIZATIONAL') fail(`${field}.finalVerdictAuthority`);
  if (!Array.isArray(result.evidence)) fail(`${field}.evidence`);
  if (!Array.isArray(result.counterevidence)) fail(`${field}.counterevidence`);
  const basis = codeList(
    result.evidence.map((item) => (isRecord(item) ? item.kind : undefined)),
    `${field}.evidence`,
    MAX_MEMBERS
  );
  const counterevidence = codeList(
    result.counterevidence.map((item) => (isRecord(item) ? item.kind : undefined)),
    `${field}.counterevidence`,
    MAX_MEMBERS
  );

  if (relationship === ('UNKNOWN' as string)) {
    // UNKNOWN carries no advisory pointer, by contract. Counterevidence is
    // kept because "why we could not tell" is not an affirmative hint.
    if (result.possibleOriginalId !== null) fail(`${field}.possibleOriginalId`);
    return unknownElement(counterevidence);
  }

  const possibleOriginalId =
    result.possibleOriginalId === null ? null : safeId(result.possibleOriginalId, `${field}.possibleOriginalId`);
  return recommendationElement<ControlCenterRelationshipValueDto>(
    {
      relationship,
      confidence,
      possibleOriginalId,
      counterevidence,
      advisoryOnly: true,
      finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
    },
    basis
  );
}

function projectDuplicates(
  results: readonly RelationshipResult[] | undefined,
  field: string
): readonly ControlCenterDuplicateSuggestionDto[] {
  if (!Array.isArray(results)) fail(field);
  if (results.length > MAX_DUPLICATES) fail(field);
  const rows: ControlCenterDuplicateSuggestionDto[] = [];
  results.forEach((result, index) => {
    const scope = `${field}[${index}]`;
    if (!isRecord(result)) fail(scope);
    if (result.advisoryOnly !== true) fail(`${scope}.advisoryOnly`);
    if (result.finalVerdictAuthority !== 'HUMAN_ORGANIZATIONAL') fail(`${scope}.finalVerdictAuthority`);
    // A duplicate suggestion without a subject is not a suggestion.
    if (result.possibleOriginalId === null || result.possibleOriginalId === undefined) fail(`${scope}.possibleOriginalId`);
    if (!Array.isArray(result.evidence)) fail(`${scope}.evidence`);
    rows.push({
      findingId: safeId(result.possibleOriginalId, `${scope}.possibleOriginalId`),
      relationship: vocabularyCode(result.relationship, FINDING_RELATIONSHIPS, `${scope}.relationship`),
      confidence: vocabularyCode(result.confidence, INTEL_CONFIDENCE, `${scope}.confidence`),
      basis: codeList(
        result.evidence.map((item) => (isRecord(item) ? item.kind : undefined)),
        `${scope}.evidence`,
        MAX_MEMBERS
      ),
      advisoryOnly: true,
      finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
    });
  });
  return rows.sort((left, right) => left.findingId.localeCompare(right.findingId));
}

function projectRecurrence(
  result: RecurrenceResult | null | undefined,
  field: string
): ControlCenterReviewerElementDto<ControlCenterRecurrenceValueDto> {
  if (result === undefined) fail(field);
  if (result === null) return unknownElement();
  if (!isRecord(result)) fail(field);
  const recurrence = vocabularyCode(result.recurrence, FINDING_RECURRENCE, `${field}.recurrence`);
  if (!Array.isArray(result.evidence)) fail(`${field}.evidence`);
  // The cone's recurrence evidence is prose written for the filing report. It
  // is not projected: unbounded free text is exactly what the public surface
  // must not carry. The basis is derived categorically from the same result.
  const basis = codeList(
    [recurrence, ...(result.priorFindingId === null ? [] : ['PRIOR_FINDING_MATCHED'])],
    `${field}.evidence`,
    MAX_MEMBERS
  );
  if (recurrence === ('UNKNOWN_HISTORY' as string)) {
    if (result.priorFindingId !== null) fail(`${field}.priorFindingId`);
    return unknownElement(basis);
  }
  // Recurrence is a mechanical derivation over recorded chronology, so it is a
  // FACT about what the history shows — not advice about what to do with it.
  return factElement<ControlCenterRecurrenceValueDto>(
    {
      recurrence,
      priorFindingId: result.priorFindingId === null ? null : safeId(result.priorFindingId, `${field}.priorFindingId`),
    },
    basis
  );
}

function projectDefectClass(
  defectClass: DefectClass | null | undefined,
  field: string
): ControlCenterReviewerElementDto<ControlCenterDefectClassValueDto> {
  if (defectClass === undefined) fail(field);
  if (defectClass === null) return unknownElement();
  if (!isRecord(defectClass)) fail(field);
  if (!Array.isArray(defectClass.memberFindingIds)) fail(`${field}.memberFindingIds`);
  if (defectClass.memberFindingIds.length > MAX_MEMBERS) fail(`${field}.memberFindingIds`);
  if (!Array.isArray(defectClass.mechanicalEvidence)) fail(`${field}.mechanicalEvidence`);
  if (!Array.isArray(defectClass.counterexamples)) fail(`${field}.counterexamples`);
  if (!Array.isArray(defectClass.unknowns)) fail(`${field}.unknowns`);
  return recommendationElement<ControlCenterDefectClassValueDto>(
    {
      classId: safeId(defectClass.classId, `${field}.classId`),
      sharedInvariant: safeId(defectClass.sharedInvariant, `${field}.sharedInvariant`),
      memberFindingIds: defectClass.memberFindingIds.map((member, index) =>
        safeId(member, `${field}.memberFindingIds[${index}]`)
      ),
      confidence: vocabularyCode(defectClass.confidence, INTEL_CONFIDENCE, `${field}.confidence`),
      counterexampleCount: boundedCount(defectClass.counterexamples.length),
      unknownCount: boundedCount(defectClass.unknowns.length),
    },
    // Same rule as recurrence: the cone's mechanicalEvidence is prose. The
    // counts above carry what the surface can state categorically.
    codeList(
      [
        'SHARED_SEMANTIC_INVARIANT',
        ...(defectClass.counterexamples.length === 0 ? ['NO_COUNTEREXAMPLES'] : ['COUNTEREXAMPLES_PRESENT']),
      ],
      `${field}.mechanicalEvidence`,
      MAX_MEMBERS
    )
  );
}

function projectProvenance(value: unknown, field: string): ControlCenterReviewerElementDto<SafeControlCenterCode> {
  const provenance = vocabularyCode(value, EXPECTATION_PROVENANCE, field);
  if (provenance === ('UNKNOWN' as string)) return unknownElement();
  // Where the "this is incorrect" claim came from is recorded, not inferred.
  return factElement(provenance, [provenance]);
}

function projectConfidence(value: unknown, field: string): ControlCenterReviewerElementDto<SafeControlCenterCode> {
  const confidence = vocabularyCode(value, INTEL_CONFIDENCE, field);
  // INSUFFICIENT means the evidence did not reach a level. Rendering it as a
  // low-but-real confidence is exactly the weak-affirmative the contract bans.
  if (confidence === ('INSUFFICIENT' as string)) return unknownElement([confidence]);
  return factElement(confidence, [confidence]);
}

function projectAlphausRecommendation(
  input: ReviewerAlphausRecommendationInput | undefined,
  field: string
): ControlCenterAlphausRecommendationDto {
  if (!isRecord(input)) fail(field);
  const element = (value: unknown, basis: unknown, name: string): ControlCenterReviewerElementDto<SafeControlCenterCode> =>
    recommendationElement(safeCode(value, `${field}.${name}`), [safeCode(basis, `${field}.${name}Basis`)]);

  const team = screened(input.team, `${field}.team`);
  const teamEvidence = input.teamEvidence;
  if (team !== 'UNKNOWN' && (teamEvidence === null || teamEvidence === undefined)) {
    // The FC-1 report rule, kept here rather than trusted upstream: a team
    // name without evidence is an inference, and inference is not projected.
    fail(`${field}.teamEvidence`);
  }
  return {
    severity: element(input.severity, input.severityBasis, 'severity'),
    catchStage: element(input.catchStage, input.catchStageBasis, 'catchStage'),
    source: element(input.source, input.sourceBasis, 'source'),
    team:
      team === 'UNKNOWN'
        ? unknownElement()
        : recommendationElement(safeLabel(team, `${field}.team`), [safeCode(teamEvidence, `${field}.teamEvidence`)]),
  };
}

function projectLocalReview(
  input: ReviewerLocalReviewInput | null | undefined,
  field: string
): ControlCenterReviewerElementDto<ControlCenterLocalReviewValueDto> {
  if (input === undefined) fail(field);
  if (input === null) return unknownElement();
  if (!isRecord(input)) fail(field);
  const record = input.record;
  if (!isRecord(record)) fail(`${field}.record`);
  const state = vocabularyCode(record.state, FINDING_REVIEW_STATES, `${field}.record.state`);
  const receipt = input.receipt ?? null;
  if (receipt !== null && !isRecord(receipt)) fail(`${field}.receipt`);
  // The non-equivalence guard is re-checked at the surface. A receipt that
  // lost it never reaches a reviewer's screen.
  if (receipt !== null && receipt.organizationalAuthority !== 'NONE_LOCAL_REVIEW_ONLY') {
    fail(`${field}.receipt.organizationalAuthority`);
  }
  const currentness = input.bindingCurrentness;
  if (currentness !== 'CURRENT' && currentness !== 'STALE' && currentness !== 'UNKNOWN') {
    fail(`${field}.bindingCurrentness`);
  }
  const value: ControlCenterLocalReviewValueDto = {
    state,
    decision: receipt === null ? null : vocabularyCode(receipt.decision, FINDING_REVIEW_DECISIONS, `${field}.receipt.decision`),
    reviewedAt: receipt === null ? null : safeTimestamp(receipt.reviewedAt, `${field}.receipt.reviewedAt`),
    transitionCount: boundedCount(record.transitionCount),
    bindingCurrentness: currentness,
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED'],
  };
  // A decision whose binding no longer holds, or was never established, is not
  // a live decision. It is shown, and it is shown as UNKNOWN.
  if (currentness !== 'CURRENT') return { epistemicClass: 'UNKNOWN', value, basis: [state] };
  return factElement(value, [state]);
}

function projectFinding(input: ReviewerFindingInput, index: number): ControlCenterReviewerFindingDto {
  const scope = `findings[${index}]`;
  if (!isRecord(input)) fail(scope);
  return {
    findingId: safeId(input.findingId, `${scope}.findingId`),
    relationship: projectRelationship(input.relationship, `${scope}.relationship`),
    probableDuplicates: projectDuplicates(input.probableDuplicates, `${scope}.probableDuplicates`),
    recurrence: projectRecurrence(input.recurrence, `${scope}.recurrence`),
    defectClass: projectDefectClass(input.defectClass, `${scope}.defectClass`),
    expectationProvenance: projectProvenance(input.expectationProvenance, `${scope}.expectationProvenance`),
    confidence: projectConfidence(input.confidence, `${scope}.confidence`),
    alphausRecommendation: projectAlphausRecommendation(input.alphausRecommendation, `${scope}.alphausRecommendation`),
    localReview: projectLocalReview(input.localReview, `${scope}.localReview`),
    reviewIdentity: input.reviewIdentity === null || input.reviewIdentity === undefined
      ? null
      : safeId(input.reviewIdentity, `${scope}.reviewIdentity`),
    unknowns: codeList(input.unknowns, `${scope}.unknowns`, MAX_UNKNOWNS),
  };
}

export function projectReviewer(input: ReviewerProjectionInput, requestedLimit?: unknown, cursor?: unknown): ControlCenterReviewerDto {
  if (!isRecord(input)) fail('input');
  if (input.available === false) {
    return {
      schemaVersion: CONTROL_CENTER_REVIEWER_SCHEMA_VERSION,
      state: 'UNAVAILABLE',
      items: [],
      page: { limit: 0, nextCursor: null, truncated: false },
      finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
      organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
    };
  }
  if (!Array.isArray(input.findings)) fail('findings');
  if (input.total !== undefined && (!Number.isSafeInteger(input.total) || input.total < input.findings.length)) fail('total');
  const rows = input.findings
    .map((finding, index) => projectFinding(finding, index))
    .sort((left, right) => left.findingId.localeCompare(right.findingId));
  // NW-10. A caller that already paged hands us THE page, so slicing again
  // here would page twice. `pageOffset` is how we tell the two cases apart.
  const preSelected = typeof input.pageOffset === 'number' && Number.isSafeInteger(input.pageOffset) && input.pageOffset >= 0;
  const collection = preSelected
    ? boundedCollection(rows, requestedLimit)
    : boundedCollection(rows, requestedLimit, cursor);
  // How far into the corpus this page reaches. Both the truncation claim and
  // the fallback cursor must be expressed against THIS, not against the page
  // length: `items.length` equals the consumed count only on the first page,
  // so a fallback built from it re-emitted the same cursor on page two and
  // paged forever in place.
  const consumed = (preSelected ? (input.pageOffset as number) : boundedCursorOffset(cursor, rows.length))
    + collection.items.length;
  const total = input.total ?? rows.length;
  // Truncation is a claim about the corpus, not about the array that arrived.
  const truncated = collection.page.truncated || total > consumed;
  const nextCursor = truncated
    ? (collection.page.nextCursor ?? asSafeControlCenterCursor(String(consumed)))
    : null;
  return {
    schemaVersion: CONTROL_CENTER_REVIEWER_SCHEMA_VERSION,
    state: rows.length === 0 ? 'EMPTY' : 'AVAILABLE',
    items: collection.items,
    page: {
      ...collection.page,
      truncated,
      nextCursor,
    },
    finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL',
    organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY',
  };
}
