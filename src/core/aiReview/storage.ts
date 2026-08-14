import path from 'node:path';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import type {
  AiBugDraft,
  AiBugDraftV1,
  AiHumanReviewRecord,
  AiHumanReviewRecordV1,
  AiReadableHumanReviewRecord,
  AiOracleSuggestion,
  AiOracleSuggestionV1,
} from './types';
import {
  validateAiBugDraft,
  validateAiHumanReviewRecord,
  validateAiOracleSuggestion,
  validateAnyAiBugDraft,
  validateAnyAiHumanReviewRecord,
  validateAnyAiOracleSuggestion,
} from './validation';
import { stableJson } from './util';

function fileName(id: string, suffix: string): string {
  const safe = id.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 150);
  return `${safe}.${suffix}.json`;
}

function assertArtifactId(id: string, prefix: 'draft' | 'suggestion'): void {
  if (!new RegExp(`^${prefix}:sha256:[a-f0-9]{64}$`).test(id)) throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function artifactIdentity(value: AiBugDraft | AiBugDraftV1 | AiOracleSuggestion | AiOracleSuggestionV1): string {
  return 'draftId' in value ? value.draftId : value.suggestionId;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function artifactPath(store: PrivateArtifactStore, destination: string): string {
  return path.join(store.root, destination);
}

function readArtifactWinnerAfterConflict(
  store: PrivateArtifactStore,
  destination: string,
  expected: AiBugDraft | AiOracleSuggestion,
  expectedId: string,
  validate: (value: unknown) => AiBugDraft | AiBugDraftV1 | AiOracleSuggestion | AiOracleSuggestionV1,
): void {
  let value: unknown;
  try {
    value = store.readJson(destination);
  } catch (error) {
    if (message(error) === 'PRIVATE_ARTIFACT_CORRUPT') throw new Error('AI_REVIEW_STATE_INVALID');
    throw error;
  }
  if (value === null) throw new Error('AI_REVIEW_ARTIFACT_IMMUTABLE');
  if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_STATE_INVALID');
  let artifact: AiBugDraft | AiBugDraftV1 | AiOracleSuggestion | AiOracleSuggestionV1;
  try {
    artifact = validate(value.artifact);
  } catch {
    throw new Error('AI_REVIEW_STATE_INVALID');
  }
  if (value.artifactId !== expectedId || value.schemaVersion !== artifact.schemaVersion || artifactIdentity(artifact) !== expectedId) {
    throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
  }
  if (stableJson(artifact) !== stableJson(expected)) throw new Error('AI_REVIEW_ARTIFACT_IMMUTABLE');
}

/** Companion storage over the existing owner-only atomic private store. */
export class AiReviewArtifactStore {
  readonly privateStore: PrivateArtifactStore;

  constructor(privateStore = new PrivateArtifactStore()) {
    this.privateStore = privateStore;
  }

  writeBugDraft(draft: AiBugDraft): string {
    validateAiBugDraft(draft);
    const destination = fileName(draft.draftId, 'bug-draft');
    const payload = { schemaVersion: draft.schemaVersion, artifactId: draft.draftId, artifact: draft };
    try {
      this.privateStore.writeImmutableJson(destination, payload);
    } catch (error) {
      if (message(error) !== 'PRIVATE_ARTIFACT_IMMUTABLE') throw error;
      readArtifactWinnerAfterConflict(this.privateStore, destination, draft, draft.draftId, validateAnyAiBugDraft);
    }
    return artifactPath(this.privateStore, destination);
  }

  writeOracleSuggestion(suggestion: AiOracleSuggestion): string {
    validateAiOracleSuggestion(suggestion);
    const destination = fileName(suggestion.suggestionId, 'oracle-suggestion');
    const payload = { schemaVersion: suggestion.schemaVersion, artifactId: suggestion.suggestionId, artifact: suggestion };
    try {
      this.privateStore.writeImmutableJson(destination, payload);
    } catch (error) {
      if (message(error) !== 'PRIVATE_ARTIFACT_IMMUTABLE') throw error;
      readArtifactWinnerAfterConflict(this.privateStore, destination, suggestion, suggestion.suggestionId, validateAnyAiOracleSuggestion);
    }
    return artifactPath(this.privateStore, destination);
  }

  writeHumanReview(review: AiHumanReviewRecord): string {
    validateAiHumanReviewRecord(review);
    const destination = fileName(review.artifactId, 'human-review');
    try {
      this.privateStore.writeImmutableJson(destination, { review });
    } catch (error) {
      if (message(error) !== 'PRIVATE_ARTIFACT_IMMUTABLE') throw error;
      let prior: AiReadableHumanReviewRecord | null;
      try {
        prior = this.readHumanReviewOrNull(review.artifactId);
      } catch {
        throw new Error('AI_REVIEW_STATE_INVALID');
      }
      if (prior === null) throw new Error('AI_REVIEW_STATE_INVALID');
      if (stableJson(prior) !== stableJson(review)) throw new Error('AI_REVIEW_CONFLICTING_DECISIONS');
    }
    return artifactPath(this.privateStore, destination);
  }

  readBugDraft(draftId: string): AiBugDraft | AiBugDraftV1 {
    assertArtifactId(draftId, 'draft');
    const value = this.privateStore.readJson(fileName(draftId, 'bug-draft'));
    if (value === null) throw new Error('AI_REVIEW_ARTIFACT_NOT_FOUND');
    if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_STATE_INVALID');
    const artifact = validateAnyAiBugDraft(value.artifact);
    if (value.artifactId !== draftId || value.schemaVersion !== artifact.schemaVersion || artifactIdentity(artifact) !== draftId) throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return artifact;
  }

  readOracleSuggestion(suggestionId: string): AiOracleSuggestion | AiOracleSuggestionV1 {
    assertArtifactId(suggestionId, 'suggestion');
    const value = this.privateStore.readJson(fileName(suggestionId, 'oracle-suggestion'));
    if (value === null) throw new Error('AI_REVIEW_ARTIFACT_NOT_FOUND');
    if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_STATE_INVALID');
    const artifact = validateAnyAiOracleSuggestion(value.artifact);
    if (value.artifactId !== suggestionId || value.schemaVersion !== artifact.schemaVersion || artifactIdentity(artifact) !== suggestionId) throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return artifact;
  }

  readHumanReview(artifactId: string): AiHumanReviewRecord | AiHumanReviewRecordV1 {
    const review = this.readHumanReviewOrNull(artifactId);
    if (review === null) throw new Error('AI_REVIEW_RECORD_REQUIRED');
    return review;
  }

  readHumanReviewOrNull(artifactId: string): AiReadableHumanReviewRecord | null {
    if (!/^(?:draft|suggestion):sha256:[a-f0-9]{64}$/.test(artifactId)) throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    const value = this.privateStore.readJson(fileName(artifactId, 'human-review'));
    if (value === null) return null;
    if (!isRecord(value) || value.status !== 'READY') throw new Error('AI_REVIEW_STATE_INVALID');
    let review: AiReadableHumanReviewRecord;
    if ('review' in value) review = validateAnyAiHumanReviewRecord(value.review);
    else {
      // Phase 7B v1 stored the review record directly in the private-store
      // envelope. Read that historical shape explicitly, removing only the
      // store-owned status key before exact DTO validation. A v1 status field
      // still has no authority without this validated digest-bound record.
      const { status: _status, ...legacyRecord } = value;
      review = validateAnyAiHumanReviewRecord(legacyRecord);
    }
    if (review.artifactId !== artifactId) throw new Error('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return review;
  }
}
