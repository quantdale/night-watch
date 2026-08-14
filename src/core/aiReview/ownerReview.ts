// ---------------------------------------------------------------------------
// Private owner-review service and terminal-safe snapshot projection.
//
// This module deliberately has no provider, execution, network, or terminal
// dependency. The bin wrapper supplies prompts and output. This service only
// reads one exact artifact and renders a safe snapshot. Write-capable owner
// decision logic lives in the non-public ownerDecision.ts module.
// ---------------------------------------------------------------------------

import {
  artifactDigest,
  projectEffectiveBugReview,
  projectEffectiveOracleReview,
} from './review';
import { AiReviewArtifactStore } from './storage';
import type {
  AiBugDraft,
  AiBugDraftV1,
  AiHumanReviewRecord,
  AiLegacyReviewArtifact,
  AiOracleSuggestion,
  AiOracleSuggestionV1,
  AiReadableHumanReviewRecord,
  AiReadableReviewArtifact,
  AiReviewProjection,
} from './types';

export type OwnerReviewArtifactKind = 'bug' | 'oracle';
export type OwnerReviewDecision = AiHumanReviewRecord['decision'];

export type OwnerReviewErrorCode =
  | 'AI_OWNER_REVIEW_USAGE_INVALID'
  | 'AI_OWNER_REVIEW_INTERACTIVE_REQUIRED'
  | 'AI_REVIEW_ARTIFACT_NOT_FOUND'
  | 'AI_REVIEW_ARTIFACT_CORRUPT'
  | 'AI_REVIEW_ARTIFACT_INVALID_SCHEMA'
  | 'AI_REVIEW_ARTIFACT_ID_MISMATCH'
  | 'AI_REVIEW_STATE_INVALID'
  | 'AI_REVIEW_ALREADY_REVIEWED'
  | 'AI_OWNER_REVIEW_CANCELLED'
  | 'AI_OWNER_REVIEW_LEGACY_READ_ONLY'
  | 'AI_REVIEW_STORAGE_FAILED';

export const OWNER_REVIEW_FIXED_NOTE = 'Owner decision recorded through Nightwatch private owner-review CLI.' as const;
export const OWNER_REVIEW_FRESHNESS = 'SNAPSHOT_ONLY_NOT_REEVALUATED' as const;

const BUG_ARTIFACT_ID_RE = /^draft:sha256:[a-f0-9]{64}$/;
const ORACLE_ARTIFACT_ID_RE = /^suggestion:sha256:[a-f0-9]{64}$/;
const BIDI_CONTROLS = new Set([
  0x061c,
  0x200e,
  0x200f,
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
  0x206a,
  0x206b,
  0x206c,
  0x206d,
  0x206e,
  0x206f,
]);

export class OwnerReviewError extends Error {
  readonly code: OwnerReviewErrorCode;

  constructor(code: OwnerReviewErrorCode) {
    super(code);
    this.name = 'OwnerReviewError';
    this.code = code;
  }
}

export interface OwnerReviewTarget {
  readonly kind: OwnerReviewArtifactKind;
  readonly artifactId: string;
}

export interface OwnerReviewSnapshot {
  readonly target: OwnerReviewTarget;
  readonly artifact: AiReadableReviewArtifact;
  readonly reviewRecord: AiReadableHumanReviewRecord | null;
  readonly projection: AiReviewProjection;
  readonly artifactDigest: string;
  readonly freshness: typeof OWNER_REVIEW_FRESHNESS;
}

function artifactId(artifact: AiReadableReviewArtifact): string {
  return 'draftId' in artifact ? artifact.draftId : artifact.suggestionId;
}

function artifactKind(artifact: AiReadableReviewArtifact): 'BUG_DRAFT' | 'ORACLE_SUGGESTION' {
  return 'draftId' in artifact ? 'BUG_DRAFT' : 'ORACLE_SUGGESTION';
}

function isLegacyArtifact(artifact: AiReadableReviewArtifact): artifact is AiLegacyReviewArtifact {
  return artifact.schemaVersion === 'nightwatch.ai-bug-draft.private.v1' || artifact.schemaVersion === 'nightwatch.ai-oracle-suggestion.private.v1';
}

function isV2Bug(artifact: AiReadableReviewArtifact): artifact is AiBugDraft {
  return 'draftId' in artifact && artifact.schemaVersion === 'nightwatch.ai-bug-draft.private.v2';
}

function isV2Oracle(artifact: AiReadableReviewArtifact): artifact is AiOracleSuggestion {
  return 'suggestionId' in artifact && artifact.schemaVersion === 'nightwatch.ai-oracle-suggestion.private.v2';
}

function mapReadFailure(error: unknown, artifact: boolean): OwnerReviewError {
  const message = error instanceof Error ? error.message : '';
  if (message === 'AI_REVIEW_ARTIFACT_NOT_FOUND') return new OwnerReviewError('AI_REVIEW_ARTIFACT_NOT_FOUND');
  if (message === 'PRIVATE_ARTIFACT_CORRUPT') return new OwnerReviewError(artifact ? 'AI_REVIEW_ARTIFACT_CORRUPT' : 'AI_REVIEW_STATE_INVALID');
  if (message === 'AI_REVIEW_ARTIFACT_ID_MISMATCH') return new OwnerReviewError('AI_REVIEW_ARTIFACT_ID_MISMATCH');
  if (artifact && message.startsWith('AI_OUTPUT_SCHEMA_INVALID')) return new OwnerReviewError('AI_REVIEW_ARTIFACT_INVALID_SCHEMA');
  if (message === 'AI_REVIEW_STATE_INVALID' || message.startsWith('AI_REVIEW_')) return new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  return new OwnerReviewError('AI_REVIEW_STATE_INVALID');
}

function assertTarget(target: OwnerReviewTarget): void {
  if (target.kind !== 'bug' && target.kind !== 'oracle') throw new OwnerReviewError('AI_OWNER_REVIEW_USAGE_INVALID');
  const valid = target.kind === 'bug' ? BUG_ARTIFACT_ID_RE.test(target.artifactId) : ORACLE_ARTIFACT_ID_RE.test(target.artifactId);
  if (!valid) throw new OwnerReviewError('AI_REVIEW_ARTIFACT_ID_MISMATCH');
}

function readArtifact(store: AiReviewArtifactStore, target: OwnerReviewTarget): AiReadableReviewArtifact {
  try {
    const artifact = target.kind === 'bug' ? store.readBugDraft(target.artifactId) : store.readOracleSuggestion(target.artifactId);
    if (artifactId(artifact) !== target.artifactId || artifactKind(artifact) !== (target.kind === 'bug' ? 'BUG_DRAFT' : 'ORACLE_SUGGESTION')) throw new OwnerReviewError('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return artifact;
  } catch (error) {
    if (error instanceof OwnerReviewError) throw error;
    throw mapReadFailure(error, true);
  }
}

function readReview(store: AiReviewArtifactStore, artifactIdValue: string): AiReadableHumanReviewRecord | null {
  try {
    const review = store.readHumanReviewOrNull(artifactIdValue);
    if (review !== null && review.artifactId !== artifactIdValue) throw new OwnerReviewError('AI_REVIEW_ARTIFACT_ID_MISMATCH');
    return review;
  } catch (error) {
    if (error instanceof OwnerReviewError) throw error;
    throw mapReadFailure(error, false);
  }
}

export function loadOwnerReviewSnapshot(store: AiReviewArtifactStore, target: OwnerReviewTarget): OwnerReviewSnapshot {
  assertTarget(target);
  const artifact = readArtifact(store, target);
  const reviewRecord = readReview(store, target.artifactId);
  try {
    const projection = target.kind === 'bug'
      ? projectEffectiveBugReview(artifact as AiBugDraft | AiBugDraftV1, reviewRecord)
      : projectEffectiveOracleReview(artifact as AiOracleSuggestion | AiOracleSuggestionV1, reviewRecord);
    return {
      target,
      artifact,
      reviewRecord,
      projection,
      artifactDigest: artifactDigest(artifact),
      freshness: OWNER_REVIEW_FRESHNESS,
    };
  } catch (error) {
    if (error instanceof OwnerReviewError) throw error;
    throw new OwnerReviewError('AI_REVIEW_STATE_INVALID');
  }
}

export function decisionFromMenuChoice(value: string): OwnerReviewDecision | 'CANCEL' | null {
  if (value === 'A' || value === 'a') return 'APPROVE_DRAFT';
  if (value === 'R' || value === 'r') return 'REJECT';
  if (value === 'S' || value === 's') return 'SUPERSEDE';
  if (value === 'Q' || value === 'q' || value === '') return 'CANCEL';
  return null;
}

export function confirmationTokenForDecision(decision: OwnerReviewDecision): 'APPROVE' | 'REJECT' | 'SUPERSEDE' {
  if (decision === 'APPROVE_DRAFT') return 'APPROVE';
  if (decision === 'REJECT') return 'REJECT';
  return 'SUPERSEDE';
}

export function confirmationMatches(decision: OwnerReviewDecision, value: string): boolean {
  return value === confirmationTokenForDecision(decision);
}

export function decisionMeaning(kind: OwnerReviewArtifactKind, decision: OwnerReviewDecision): string {
  if (decision === 'APPROVE_DRAFT') {
    return kind === 'bug'
      ? 'OWNER_APPROVED_DRAFT — owner-reviewed draft text only; this does not verify the finding, root cause, evidence, current product state, or publication.'
      : 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW — manual review only; this does not register or execute an oracle, create code, or enter Phase 8.';
  }
  if (decision === 'REJECT') return 'OWNER_REJECTED — private owner review provenance only; deterministic evidence and campaign state are unchanged.';
  return 'SUPERSEDED — private owner review provenance only; deterministic evidence and campaign state are unchanged.';
}

function codeEscape(code: number): string {
  if (code <= 0xff) return `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`;
  return `\\u${code.toString(16).padStart(4, '0').toUpperCase()}`;
}

/** Make untrusted text incapable of emitting terminal controls or bidi marks. */
export function sanitizeTerminalText(value: string): string {
  let result = '';
  for (const character of String(value)) {
    const code = character.codePointAt(0) ?? 0;
    if (code === 0x0a) {
      result += '\n';
    } else if (code <= 0x1f || (code >= 0x7f && code <= 0x9f) || BIDI_CONTROLS.has(code) || code === 0x2028 || code === 0x2029) {
      result += codeEscape(code);
    } else {
      result += character;
    }
  }
  return result;
}

function prefixed(prefix: string, value: string): string[] {
  return sanitizeTerminalText(value).split('\n').map((line) => `${prefix} ${line}`);
}

function systemField(name: string, value: unknown): string[] {
  return prefixed('[SYSTEM]', `${name}=${String(value)}`);
}

function aiSection(title: string, value: string): string[] {
  return [...prefixed('[SYSTEM]', title), ...prefixed('[AI]', value)];
}

function reviewLines(record: AiReadableHumanReviewRecord | null): string[] {
  if (record === null) return systemField('review-record', 'ABSENT');
  const lines = systemField('review-record', 'PRESENT');
  lines.push(...systemField('review-artifact-id', record.artifactId));
  lines.push(...systemField('review-decision', record.decision));
  lines.push(...systemField('reviewed-at', record.reviewedAt));
  lines.push(...systemField('review-artifact-digest', record.artifactDigest));
  lines.push(...systemField('reviewer-class', record.reviewerClass));
  lines.push(...systemField('review-publication', record.publication));
  lines.push(...systemField('review-id', 'reviewId' in record ? record.reviewId : 'HISTORICAL_V1_NO_REVIEW_ID'));
  lines.push(...prefixed('[SYSTEM]', `review-notes=${record.notes}`));
  return lines;
}

function commonSnapshotLines(snapshot: OwnerReviewSnapshot): string[] {
  const artifact = snapshot.artifact;
  return [
    ...systemField('artifact-kind', artifactKind(artifact)),
    ...systemField('artifact-id', snapshot.target.artifactId),
    ...systemField('artifact-schema', artifact.schemaVersion),
    ...systemField('artifact-digest', snapshot.artifactDigest),
    ...systemField('stored-artifact-status', artifact.status),
    ...systemField('effective-review-status', snapshot.projection.effectiveStatus),
    ...systemField('effective-review-reason', snapshot.projection.reason),
    ...systemField('freshness', snapshot.freshness),
    ...systemField('semantic-boundary', 'OWNER REVIEW IS NOT PRODUCT VERIFICATION; OWNER APPROVAL IS NOT ROOT-CAUSE VERIFICATION OR EVIDENCE PROMOTION.'),
    ...systemField('publication', 'PROHIBITED'),
    ...reviewLines(snapshot.reviewRecord),
  ];
}

export function renderOwnerReviewSnapshot(snapshot: OwnerReviewSnapshot): string {
  const artifact = snapshot.artifact;
  const lines = [
    '[SYSTEM] NIGHTWATCH PRIVATE OWNER REVIEW SNAPSHOT',
    ...commonSnapshotLines(snapshot),
  ];
  if ('draftId' in artifact) {
    const draft = artifact as AiBugDraft | AiBugDraftV1;
    lines.push(
      ...systemField('candidate-id', draft.candidateId),
      ...systemField('evidence-level-at-generation', draft.evidenceLevelAtGeneration),
      ...systemField('input-package-id', draft.inputPackageId),
      ...systemField('input-package-digest', draft.inputPackageDigest),
      ...systemField('provider-class', draft.modelProviderClass),
      ...systemField('model-identifier', draft.modelIdentifier),
      ...systemField('prompt-template-version', draft.promptTemplateVersion),
      ...systemField('generated-at', draft.generatedAt),
      ...systemField('response-digest', draft.responseDigest),
      ...systemField('evidence-refs', draft.evidenceRefs.join(', ') || 'none'),
      ...systemField('source-refs', draft.sourceRefs.join(', ') || 'none'),
      ...systemField('source-snapshot-refs', draft.sourceSnapshotRefs.join(', ') || 'none'),
      ...systemField('human-review-required', draft.humanReviewRequired),
      ...systemField('external-publication', draft.externalPublication),
      ...aiSection('AI-GENERATED SUMMARY', draft.summaryDraft),
      ...aiSection('AI-GENERATED OBSERVED BEHAVIOR DRAFT', draft.observedBehaviorDraft),
      ...aiSection('AI-GENERATED EXPECTED BEHAVIOR DRAFT', draft.expectedBehaviorDraft),
      ...aiSection('AI-GENERATED REPRODUCTION DRAFT', draft.reproductionDraft),
      ...aiSection('AI-GENERATED IMPACT DRAFT', draft.impactDraft),
      ...prefixed('[SYSTEM]', 'AI-GENERATED UNVERIFIED HYPOTHESES'),
    );
    draft.hypotheses.forEach((hypothesis, index) => {
      lines.push(...prefixed('[AI]', `${index + 1}. ${hypothesis.label}: ${hypothesis.text}`));
      lines.push(...prefixed('[AI]', `discriminator: ${hypothesis.whatWouldDiscriminate}`));
    });
    lines.push(...prefixed('[SYSTEM]', 'AI-GENERATED UNRESOLVED QUESTIONS'));
    draft.uncertainties.forEach((uncertainty) => lines.push(...prefixed('[AI]', `- ${uncertainty}`)));
  } else {
    const suggestion = artifact as AiOracleSuggestion | AiOracleSuggestionV1;
    lines.push(
      ...systemField('input-change-package-id', suggestion.inputChangePackageId),
      ...systemField('input-change-package-digest', suggestion.inputChangePackageDigest),
      ...systemField('provider-class', suggestion.modelProviderClass),
      ...systemField('model-identifier', suggestion.modelIdentifier),
      ...systemField('prompt-template-version', suggestion.promptTemplateVersion),
      ...systemField('generated-at', suggestion.generatedAt),
      ...systemField('response-digest', suggestion.responseDigest),
      ...systemField('source-snapshot-refs', suggestion.sourceSnapshotRefs.join(', ') || 'none'),
      ...systemField('change-evidence-refs', suggestion.changeEvidenceRefs.join(', ') || 'none'),
      ...systemField('affected-surface', suggestion.affectedSurface),
      ...systemField('executable', suggestion.executable),
      ...systemField('human-review-required', suggestion.humanReviewRequired),
      ...systemField('external-publication', suggestion.externalPublication),
      ...aiSection('PROPOSED INVARIANT', suggestion.proposedInvariant),
      ...aiSection('PROPOSED OBSERVATION CLASSES', suggestion.proposedObservationClasses.join('; ')),
      ...aiSection('RATIONALE', suggestion.rationale),
      ...aiSection('POSSIBLE FALSE POSITIVE MODES', suggestion.possibleFalsePositiveModes.join('; ')),
      ...aiSection('REQUIRED DETERMINISTIC EVIDENCE', suggestion.requiredDeterministicEvidence.join('; ')),
      ...aiSection('REQUIRED FIXTURE COVERAGE', suggestion.requiredFixtureCoverage.join('; ')),
      ...aiSection('RISK NOTES', suggestion.riskNotes.join('; ')),
    );
  }
  return lines.join('\n');
}

export function renderOwnerReviewStatus(snapshot: OwnerReviewSnapshot): string {
  return [
    '[SYSTEM] NIGHTWATCH OWNER REVIEW STATUS',
    ...commonSnapshotLines(snapshot),
  ].join('\n');
}
