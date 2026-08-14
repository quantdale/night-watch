import { PrivateArtifactStore } from '../policy/privateArtifacts';
import type { AiBugDraft, AiHumanReviewRecord, AiOracleSuggestion } from './types';
import { validateAiBugDraft, validateAiHumanReviewRecord, validateAiOracleSuggestion } from './validation';

function fileName(id: string, suffix: string): string {
  const safe = id.replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 150);
  return `${safe}.${suffix}.json`;
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
    this.privateStore.writeIncomplete(destination, { schemaVersion: draft.schemaVersion, artifactId: draft.draftId, artifact: draft });
    return this.privateStore.writeJson(destination, { schemaVersion: draft.schemaVersion, artifactId: draft.draftId, artifact: draft });
  }

  writeOracleSuggestion(suggestion: AiOracleSuggestion): string {
    validateAiOracleSuggestion(suggestion);
    const destination = fileName(suggestion.suggestionId, 'oracle-suggestion');
    this.privateStore.writeIncomplete(destination, { schemaVersion: suggestion.schemaVersion, artifactId: suggestion.suggestionId, artifact: suggestion });
    return this.privateStore.writeJson(destination, { schemaVersion: suggestion.schemaVersion, artifactId: suggestion.suggestionId, artifact: suggestion });
  }

  writeHumanReview(review: AiHumanReviewRecord): string {
    validateAiHumanReviewRecord(review);
    return this.privateStore.writeJson(fileName(review.artifactId, 'human-review'), review);
  }
}
