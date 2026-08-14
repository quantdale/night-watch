import path from 'node:path';
import { PrivateArtifactStore } from '../policy/privateArtifacts';
import type {
  AiBugDraft,
  AiBugDraftV1,
  AiHumanReviewRecord,
  AiHumanReviewRecordV1,
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

function existingArtifact<T>(value: unknown, expected: T): string | null {
  if (value === null) return null;
  if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_ARTIFACT_IMMUTABLE');
  if (stableJson(value.artifact) !== stableJson(expected)) throw new Error('AI_REVIEW_ARTIFACT_IMMUTABLE');
  return 'same';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    if (existingArtifact(this.privateStore.readJson(destination), draft) !== null) return path.join(this.privateStore.root, destination);
    this.privateStore.writeIncomplete(destination, payload);
    return this.privateStore.writeJson(destination, payload);
  }

  writeOracleSuggestion(suggestion: AiOracleSuggestion): string {
    validateAiOracleSuggestion(suggestion);
    const destination = fileName(suggestion.suggestionId, 'oracle-suggestion');
    const payload = { schemaVersion: suggestion.schemaVersion, artifactId: suggestion.suggestionId, artifact: suggestion };
    if (existingArtifact(this.privateStore.readJson(destination), suggestion) !== null) return path.join(this.privateStore.root, destination);
    this.privateStore.writeIncomplete(destination, payload);
    return this.privateStore.writeJson(destination, payload);
  }

  writeHumanReview(review: AiHumanReviewRecord): string {
    validateAiHumanReviewRecord(review);
    const destination = fileName(review.artifactId, 'human-review');
    const existing = this.privateStore.readJson(destination);
    if (existing !== null) {
      if (!isRecord(existing) || existing.status !== 'READY' || !('review' in existing)) throw new Error('AI_REVIEW_STATE_INVALID');
      const prior = validateAnyAiHumanReviewRecord(existing.review);
      if (stableJson(prior) !== stableJson(review)) throw new Error('AI_REVIEW_CONFLICTING_DECISIONS');
      return path.join(this.privateStore.root, destination);
    }
    return this.privateStore.writeImmutableJson(destination, { review });
  }

  readBugDraft(draftId: string): AiBugDraft | AiBugDraftV1 {
    const value = this.privateStore.readJson(fileName(draftId, 'bug-draft'));
    if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_STATE_INVALID');
    return validateAnyAiBugDraft(value.artifact);
  }

  readOracleSuggestion(suggestionId: string): AiOracleSuggestion | AiOracleSuggestionV1 {
    const value = this.privateStore.readJson(fileName(suggestionId, 'oracle-suggestion'));
    if (!isRecord(value) || value.status !== 'READY' || !('artifact' in value)) throw new Error('AI_REVIEW_STATE_INVALID');
    return validateAnyAiOracleSuggestion(value.artifact);
  }

  readHumanReview(artifactId: string): AiHumanReviewRecord | AiHumanReviewRecordV1 {
    const value = this.privateStore.readJson(fileName(artifactId, 'human-review'));
    if (!isRecord(value) || value.status !== 'READY') throw new Error('AI_REVIEW_RECORD_REQUIRED');
    if ('review' in value) return validateAnyAiHumanReviewRecord(value.review);

    // Phase 7B v1 stored the review record directly in the private-store
    // envelope. Read that historical shape explicitly, removing only the
    // store-owned status key before exact DTO validation. A v1 status field
    // still has no authority without this validated digest-bound record.
    const { status: _status, ...legacyRecord } = value;
    return validateAnyAiHumanReviewRecord(legacyRecord);
  }
}
