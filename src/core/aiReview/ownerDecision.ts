// ---------------------------------------------------------------------------
// Internal owner-decision authority.
//
// This module is intentionally absent from src/core/aiReview/index.ts. The
// tracked owner-review CLI is the sole production loader. Tests may import it
// directly to exercise deterministic persistence and race behavior.
// ---------------------------------------------------------------------------

import {
  applyHumanDecision,
  artifactDigest,
  createHumanReviewRecord,
} from './review';
import {
  confirmationMatches,
  loadOwnerReviewSnapshot,
  OWNER_REVIEW_FIXED_NOTE,
  OWNER_REVIEW_FRESHNESS,
  OwnerReviewError,
  type OwnerReviewDecision,
  type OwnerReviewSnapshot,
  type OwnerReviewTarget,
} from './ownerReview';
import { AiReviewArtifactStore } from './storage';
import type { AiBugDraft, AiHumanReviewRecord, AiOracleSuggestion, AiReadableHumanReviewRecord } from './types';

function isLegacyArtifact(snapshot: OwnerReviewSnapshot): boolean {
  return snapshot.artifact.schemaVersion === 'nightwatch.ai-bug-draft.private.v1' || snapshot.artifact.schemaVersion === 'nightwatch.ai-oracle-suggestion.private.v1';
}

function isV2Artifact(snapshot: OwnerReviewSnapshot): boolean {
  return snapshot.artifact.schemaVersion === 'nightwatch.ai-bug-draft.private.v2' || snapshot.artifact.schemaVersion === 'nightwatch.ai-oracle-suggestion.private.v2';
}

export function assertOwnerDecisionWritable(snapshot: OwnerReviewSnapshot): void {
  if (snapshot.reviewRecord !== null) throw new OwnerReviewError('AI_REVIEW_ALREADY_REVIEWED');
  if (isLegacyArtifact(snapshot) || !isV2Artifact(snapshot)) throw new OwnerReviewError('AI_OWNER_REVIEW_LEGACY_READ_ONLY');
}

function readReview(store: AiReviewArtifactStore, artifactId: string): AiReadableHumanReviewRecord | null {
  try {
    const review = store.readHumanReviewOrNull(artifactId);
    if (review !== null && review.artifactId !== artifactId) throw new OwnerReviewError('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return review;
  } catch (error) {
    if (error instanceof OwnerReviewError) throw error;
    throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  }
}

function verifyReadBack(artifact: AiBugDraft | AiOracleSuggestion, expected: AiHumanReviewRecord, actual: AiReadableHumanReviewRecord | null): AiHumanReviewRecord {
  if (actual === null || !('reviewId' in actual) || actual.reviewId !== expected.reviewId || actual.artifactId !== expected.artifactId || actual.artifactDigest !== expected.artifactDigest || actual.decision !== expected.decision || actual.reviewerClass !== 'OWNER' || actual.publication !== 'PROHIBITED') throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  try {
    applyHumanDecision(artifact, actual);
  } catch {
    throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  }
  return actual;
}

// Deliberately private: no tracked runtime caller can submit an unconfirmed
// decision through this helper. The only exported writer requires the exact
// confirmation token below.
function recordOwnerDecision(input: {
  readonly store: AiReviewArtifactStore;
  readonly target: OwnerReviewTarget;
  readonly decision: OwnerReviewDecision;
  readonly expectedArtifactDigest: string;
  readonly reviewedAt?: string;
}): OwnerReviewSnapshot {
  const before = loadOwnerReviewSnapshot(input.store, input.target);
  if (before.artifactDigest !== input.expectedArtifactDigest) throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  assertOwnerDecisionWritable(before);
  const artifact = before.artifact as AiBugDraft | AiOracleSuggestion;
  let review: AiHumanReviewRecord;
  try {
    review = createHumanReviewRecord({ artifact, decision: input.decision, reviewedAt: input.reviewedAt ?? new Date().toISOString(), notes: OWNER_REVIEW_FIXED_NOTE });
  } catch {
    throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  }
  try {
    input.store.writeHumanReview(review);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AI_REVIEW_CONFLICTING_DECISIONS') {
      const existing = loadOwnerReviewSnapshot(input.store, input.target);
      if (existing.reviewRecord !== null) throw new OwnerReviewError('AI_REVIEW_ALREADY_REVIEWED');
    }
    if (message === 'AI_REVIEW_STATE_INVALID') throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
    throw new OwnerReviewError('AI_REVIEW_STORAGE_FAILED');
  }
  const readBack = readReview(input.store, input.target.artifactId);
  const validated = verifyReadBack(artifact, review, readBack);
  const projection = applyHumanDecision(artifact, validated);
  return {
    target: input.target,
    artifact,
    reviewRecord: validated,
    projection,
    artifactDigest: artifactDigest(artifact),
    freshness: OWNER_REVIEW_FRESHNESS,
  };
}

/** Sole write-capable owner-decision entry; exact confirmation is mandatory. */
export function recordConfirmedOwnerDecision(input: {
  readonly store: AiReviewArtifactStore;
  readonly target: OwnerReviewTarget;
  readonly decision: OwnerReviewDecision;
  readonly confirmation: string;
  readonly reviewedAt?: string;
  readonly expectedArtifactDigest: string;
}): OwnerReviewSnapshot {
  if (typeof input.expectedArtifactDigest !== 'string' || input.expectedArtifactDigest.length === 0) throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  if (!confirmationMatches(input.decision, input.confirmation)) throw new OwnerReviewError('AI_OWNER_REVIEW_CANCELLED');
  return recordOwnerDecision(input);
}
