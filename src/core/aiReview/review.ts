// ---------------------------------------------------------------------------
// Human-gated lifecycle for private AI companion artifacts.
// ---------------------------------------------------------------------------

import { digest } from './util';
import {
  AI_HUMAN_REVIEW_SCHEMA_VERSION,
  type AiBugDraft,
  type AiHumanReviewRecord,
  type AiOracleSuggestion,
} from './types';
import {
  assertBugInputFreshForDraft,
  assertOracleFreshForSuggestion,
  validateAiBugDraft,
  validateAiBugReviewInput,
  validateAiHumanReviewRecord,
  validateAiOracleReviewInput,
  validateAiOracleSuggestion,
} from './validation';
import type { AiBugReviewInput, AiOracleReviewInput } from './types';

export function artifactDigest(value: AiBugDraft | AiOracleSuggestion): string {
  return digest(value);
}

export function createHumanReviewRecord(input: {
  readonly artifact: AiBugDraft | AiOracleSuggestion;
  readonly decision: AiHumanReviewRecord['decision'];
  readonly reviewedAt: string;
  readonly notes: string;
}): AiHumanReviewRecord {
  const artifact = 'draftId' in input.artifact ? validateAiBugDraft(input.artifact) : validateAiOracleSuggestion(input.artifact);
  if (artifact.status !== 'AI_GENERATED_UNREVIEWED') throw new Error('AI_REVIEW_STATUS_TRANSITION_INVALID');
  const record: AiHumanReviewRecord = {
    schemaVersion: AI_HUMAN_REVIEW_SCHEMA_VERSION,
    artifactId: 'draftId' in artifact ? artifact.draftId : artifact.suggestionId,
    artifactKind: 'draftId' in artifact ? 'BUG_DRAFT' : 'ORACLE_SUGGESTION',
    decision: input.decision,
    reviewedAt: input.reviewedAt,
    reviewerClass: 'OWNER',
    notes: input.notes,
    artifactDigest: artifactDigest(artifact),
    reviewSchemaVersion: AI_HUMAN_REVIEW_SCHEMA_VERSION,
    publication: 'PROHIBITED',
  };
  return validateAiHumanReviewRecord(record);
}

function checkRecord(artifact: AiBugDraft | AiOracleSuggestion, record: AiHumanReviewRecord): void {
  const artifactId = 'draftId' in artifact ? artifact.draftId : artifact.suggestionId;
  const kind = 'draftId' in artifact ? 'BUG_DRAFT' : 'ORACLE_SUGGESTION';
  if (record.artifactId !== artifactId || record.artifactKind !== kind || record.artifactDigest !== artifactDigest(artifact)) throw new Error('AI_REVIEW_ARTIFACT_DIGEST_MISMATCH');
  if (record.reviewerClass !== 'OWNER' || record.publication !== 'PROHIBITED') throw new Error('AI_REVIEW_OWNER_RECORD_INVALID');
}

export function applyHumanDecision(artifact: AiBugDraft, record: AiHumanReviewRecord): AiBugDraft;
export function applyHumanDecision(artifact: AiOracleSuggestion, record: AiHumanReviewRecord): AiOracleSuggestion;
export function applyHumanDecision(artifact: AiBugDraft | AiOracleSuggestion, record: AiHumanReviewRecord): AiBugDraft | AiOracleSuggestion {
  checkRecord(artifact, validateAiHumanReviewRecord(record));
  if (artifact.status !== 'AI_GENERATED_UNREVIEWED') throw new Error('AI_REVIEW_STATUS_TRANSITION_INVALID');
  if ('draftId' in artifact) {
    const status = record.decision === 'APPROVE_DRAFT' ? 'OWNER_APPROVED_DRAFT' : record.decision === 'REJECT' ? 'OWNER_REJECTED' : 'SUPERSEDED';
    return validateAiBugDraft({ ...artifact, status });
  }
  const status = record.decision === 'APPROVE_DRAFT' ? 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW' : record.decision === 'REJECT' ? 'OWNER_REJECTED' : 'SUPERSEDED';
  return validateAiOracleSuggestion({ ...artifact, status });
}

export function supersedeStaleBugDraft(draft: AiBugDraft, currentInput: AiBugReviewInput): AiBugDraft {
  validateAiBugDraft(draft);
  validateAiBugReviewInput(currentInput);
  try {
    assertBugInputFreshForDraft(draft, currentInput);
    return draft;
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_ARTIFACT_STALE') return validateAiBugDraft({ ...draft, status: 'SUPERSEDED' });
    throw error;
  }
}

export function supersedeStaleOracleSuggestion(suggestion: AiOracleSuggestion, currentInput: AiOracleReviewInput): AiOracleSuggestion {
  validateAiOracleSuggestion(suggestion);
  validateAiOracleReviewInput(currentInput);
  try {
    assertOracleFreshForSuggestion(suggestion, currentInput);
    return suggestion;
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_ARTIFACT_STALE') return validateAiOracleSuggestion({ ...suggestion, status: 'SUPERSEDED' });
    throw error;
  }
}

export function assertCurrentBugDraft(draft: AiBugDraft, input: AiBugReviewInput): void {
  validateAiBugDraft(draft);
  validateAiBugReviewInput(input);
  assertBugInputFreshForDraft(draft, input);
  if (draft.status === 'SUPERSEDED' || draft.status === 'INVALID') throw new Error('AI_ARTIFACT_STALE');
}

export function assertCurrentOracleSuggestion(suggestion: AiOracleSuggestion, input: AiOracleReviewInput): void {
  validateAiOracleSuggestion(suggestion);
  validateAiOracleReviewInput(input);
  assertOracleFreshForSuggestion(suggestion, input);
  if (suggestion.status === 'SUPERSEDED' || suggestion.status === 'INVALID') throw new Error('AI_ARTIFACT_STALE');
}
