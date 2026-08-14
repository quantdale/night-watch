// ---------------------------------------------------------------------------
// Immutable AI artifact plus digest-bound human review projection.
// ---------------------------------------------------------------------------

import { digest } from './util';
import {
  AI_BUG_DRAFT_SCHEMA_VERSION,
  AI_HUMAN_REVIEW_SCHEMA_VERSION,
  AI_ORACLE_SUGGESTION_SCHEMA_VERSION,
  AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION,
  AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION,
  type AiBugDraft,
  type AiBugDraftV1,
  type AiBugReviewInput,
  type AiEffectiveReviewReason,
  type AiEffectiveReviewStatus,
  type AiHumanReviewRecord,
  type AiLegacyReviewArtifact,
  type AiOracleReviewInput,
  type AiOracleSuggestion,
  type AiOracleSuggestionV1,
  type AiReadableHumanReviewRecord,
  type AiReadableReviewArtifact,
  type AiReviewProjection,
} from './types';
import {
  assertBugInputFreshForDraft,
  assertOracleFreshForSuggestion,
  validateAiBugDraft,
  validateAiBugReviewInput,
  validateAiHumanReviewRecord,
  validateAiOracleReviewInput,
  validateAiOracleSuggestion,
  validateAnyAiBugDraft,
  validateAnyAiHumanReviewRecord,
  validateAnyAiOracleSuggestion,
} from './validation';

export function artifactDigest(value: AiReadableReviewArtifact): string {
  return digest(value);
}

function artifactId(value: AiReadableReviewArtifact): string {
  return 'draftId' in value ? value.draftId : value.suggestionId;
}

function artifactKind(value: AiReadableReviewArtifact): 'BUG_DRAFT' | 'ORACLE_SUGGESTION' {
  return 'draftId' in value ? 'BUG_DRAFT' : 'ORACLE_SUGGESTION';
}

function isLegacyArtifact(value: AiReadableReviewArtifact): value is AiLegacyReviewArtifact {
  return value.schemaVersion === AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION || value.schemaVersion === AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION;
}

function reviewId(record: Omit<AiHumanReviewRecord, 'reviewId'>): string {
  return `review:${digest(record)}`;
}

export function createHumanReviewRecord(input: {
  readonly artifact: AiBugDraft | AiOracleSuggestion;
  readonly decision: AiHumanReviewRecord['decision'];
  readonly reviewedAt: string;
  readonly notes: string;
}): AiHumanReviewRecord {
  const artifact = 'draftId' in input.artifact ? validateAiBugDraft(input.artifact) : validateAiOracleSuggestion(input.artifact);
  const base: Omit<AiHumanReviewRecord, 'reviewId'> = {
    schemaVersion: AI_HUMAN_REVIEW_SCHEMA_VERSION,
    artifactId: artifactId(artifact),
    artifactKind: artifactKind(artifact),
    artifactSchemaVersion: artifact.schemaVersion,
    decision: input.decision,
    reviewedAt: input.reviewedAt,
    reviewerClass: 'OWNER',
    notes: input.notes,
    artifactDigest: artifactDigest(artifact),
    reviewSchemaVersion: AI_HUMAN_REVIEW_SCHEMA_VERSION,
    publication: 'PROHIBITED',
  };
  return validateAiHumanReviewRecord({ ...base, reviewId: reviewId(base) });
}

function checkRecord(artifact: AiReadableReviewArtifact, record: AiReadableHumanReviewRecord): void {
  if (record.artifactId !== artifactId(artifact) || record.artifactKind !== artifactKind(artifact) || record.artifactDigest !== artifactDigest(artifact)) throw new Error('AI_REVIEW_ARTIFACT_DIGEST_MISMATCH');
  if (record.reviewerClass !== 'OWNER' || record.publication !== 'PROHIBITED') throw new Error('AI_REVIEW_OWNER_RECORD_INVALID');
  if (isLegacyArtifact(artifact)) {
    if (record.schemaVersion !== 'nightwatch.ai-human-review.private.v1') throw new Error('AI_REVIEW_ARTIFACT_DIGEST_MISMATCH');
  } else if (record.schemaVersion !== AI_HUMAN_REVIEW_SCHEMA_VERSION || record.artifactSchemaVersion !== artifact.schemaVersion) {
    throw new Error('AI_REVIEW_ARTIFACT_DIGEST_MISMATCH');
  }
}

function decisionProjection<TArtifact extends AiReadableReviewArtifact>(artifact: TArtifact, record: AiReadableHumanReviewRecord): AiReviewProjection<TArtifact> {
  const oracle = artifactKind(artifact) === 'ORACLE_SUGGESTION';
  let effectiveStatus: AiEffectiveReviewStatus;
  if (record.decision === 'APPROVE_DRAFT') effectiveStatus = oracle ? 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW' : 'OWNER_APPROVED_DRAFT';
  else if (record.decision === 'REJECT') effectiveStatus = 'OWNER_REJECTED';
  else effectiveStatus = 'SUPERSEDED';
  const reason: AiEffectiveReviewReason = record.decision === 'APPROVE_DRAFT' ? 'OWNER_APPROVED' : record.decision === 'REJECT' ? 'OWNER_REJECTED' : 'OWNER_SUPERSEDED';
  return { artifact, reviewRecord: record, effectiveStatus, reason, current: true };
}

function projectArtifact<TArtifact extends AiReadableReviewArtifact>(
  artifactValue: TArtifact,
  recordValue: AiReadableHumanReviewRecord | readonly AiReadableHumanReviewRecord[] | null | undefined,
  currentInput: AiBugReviewInput | AiOracleReviewInput | undefined,
): AiReviewProjection<TArtifact> {
  const artifact = 'draftId' in artifactValue
    ? validateAnyAiBugDraft(artifactValue) as TArtifact
    : validateAnyAiOracleSuggestion(artifactValue) as TArtifact;
  const records = recordValue === undefined || recordValue === null ? [] : Array.isArray(recordValue) ? recordValue : [recordValue];
  if (records.length > 1) throw new Error('AI_REVIEW_CONFLICTING_DECISIONS');
  const record = records[0] === undefined ? null : validateAnyAiHumanReviewRecord(records[0]);

  if (currentInput !== undefined) {
    try {
      if ('draftId' in artifact) {
        validateAiBugReviewInput(currentInput);
        assertBugInputFreshForDraft(artifact, currentInput as AiBugReviewInput);
      } else {
        validateAiOracleReviewInput(currentInput);
        assertOracleFreshForSuggestion(artifact, currentInput as AiOracleReviewInput);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'AI_ARTIFACT_STALE') {
        return { artifact, reviewRecord: record, effectiveStatus: 'STALE', reason: 'INPUT_STALE', current: false };
      }
      throw error;
    }
  }

  if (record === null) {
    if (isLegacyArtifact(artifact) && artifact.status !== 'AI_GENERATED_UNREVIEWED') return { artifact, reviewRecord: null, effectiveStatus: 'UNVERIFIED_LEGACY_REVIEW_STATE', reason: 'LEGACY_STATUS_WITHOUT_REVIEW_RECORD', current: false };
    return { artifact, reviewRecord: null, effectiveStatus: 'UNREVIEWED', reason: 'NO_OWNER_REVIEW_RECORD', current: true };
  }
  checkRecord(artifact, record);
  return decisionProjection(artifact, record);
}

export function projectEffectiveBugReview(draft: AiBugDraft | AiBugDraftV1, record: AiReadableHumanReviewRecord | readonly AiReadableHumanReviewRecord[] | null | undefined, currentInput?: AiBugReviewInput): AiReviewProjection<AiBugDraft | AiBugDraftV1> {
  return projectArtifact(draft, record, currentInput);
}

export function projectEffectiveOracleReview(suggestion: AiOracleSuggestion | AiOracleSuggestionV1, record: AiReadableHumanReviewRecord | readonly AiReadableHumanReviewRecord[] | null | undefined, currentInput?: AiOracleReviewInput): AiReviewProjection<AiOracleSuggestion | AiOracleSuggestionV1> {
  return projectArtifact(suggestion, record, currentInput);
}

/**
 * Validate and project one owner decision without rewriting the AI artifact.
 * The returned artifact remains byte-for-byte identical to the generated
 * value; effective approval exists only in this validated projection.
 */
export function applyHumanDecision(artifact: AiBugDraft, record: AiHumanReviewRecord): AiReviewProjection<AiBugDraft>;
export function applyHumanDecision(artifact: AiOracleSuggestion, record: AiHumanReviewRecord): AiReviewProjection<AiOracleSuggestion>;
export function applyHumanDecision(artifact: AiBugDraft | AiOracleSuggestion, record: AiHumanReviewRecord): AiReviewProjection<AiBugDraft | AiOracleSuggestion>;
export function applyHumanDecision(artifact: AiBugDraft | AiOracleSuggestion, record: AiHumanReviewRecord): AiReviewProjection<AiBugDraft | AiOracleSuggestion> {
  const validatedArtifact = 'draftId' in artifact ? validateAiBugDraft(artifact) : validateAiOracleSuggestion(artifact);
  const validatedRecord = validateAiHumanReviewRecord(record);
  checkRecord(validatedArtifact, validatedRecord);
  return decisionProjection(validatedArtifact, validatedRecord);
}

export function validateReviewedArtifact<TArtifact extends AiReadableReviewArtifact>(artifact: TArtifact, record: AiReadableHumanReviewRecord | null | undefined, currentInput: AiBugReviewInput | AiOracleReviewInput): AiReviewProjection<TArtifact> {
  if (record === null || record === undefined) throw new Error('AI_REVIEW_RECORD_REQUIRED');
  const projection = projectArtifact(artifact, record, currentInput);
  if (projection.effectiveStatus === 'STALE') throw new Error('AI_ARTIFACT_STALE');
  if (projection.effectiveStatus !== 'OWNER_APPROVED_DRAFT' && projection.effectiveStatus !== 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW') throw new Error('AI_REVIEW_STATE_INVALID');
  return projection;
}

export function supersedeStaleBugDraft(draft: AiBugDraft | AiBugDraftV1, currentInput: AiBugReviewInput, record?: AiReadableHumanReviewRecord): AiReviewProjection<AiBugDraft | AiBugDraftV1> {
  return projectEffectiveBugReview(draft, record, currentInput);
}

export function supersedeStaleOracleSuggestion(suggestion: AiOracleSuggestion | AiOracleSuggestionV1, currentInput: AiOracleReviewInput, record?: AiReadableHumanReviewRecord): AiReviewProjection<AiOracleSuggestion | AiOracleSuggestionV1> {
  return projectEffectiveOracleReview(suggestion, record, currentInput);
}

export function assertCurrentBugDraft(draft: AiBugDraft, input: AiBugReviewInput, record?: AiReadableHumanReviewRecord): void {
  const projection = projectEffectiveBugReview(draft, record, input);
  if (!projection.current || projection.effectiveStatus === 'SUPERSEDED' || projection.effectiveStatus === 'STALE') throw new Error('AI_ARTIFACT_STALE');
}

export function assertCurrentOracleSuggestion(suggestion: AiOracleSuggestion, input: AiOracleReviewInput, record?: AiReadableHumanReviewRecord): void {
  const projection = projectEffectiveOracleReview(suggestion, record, input);
  if (!projection.current || projection.effectiveStatus === 'SUPERSEDED' || projection.effectiveStatus === 'STALE') throw new Error('AI_ARTIFACT_STALE');
}
