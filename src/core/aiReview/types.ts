// ---------------------------------------------------------------------------
// Phase 7B bounded private AI review contracts.
//
// These are companion review types. They never replace deterministic evidence,
// campaign state, safety policy, or the existing AI-ready dossier projection.
// ---------------------------------------------------------------------------

import type { ChangeSet } from '../changeIntelligence/types';
import type { AiReadyEvidencePackage, BugDossier, EvidenceLevel, SourceChangeRelevance } from '../triage/types';

export const AI_REVIEW_INPUT_SCHEMA_VERSION = 'nightwatch.ai-review-input.private.v1' as const;
export const AI_BUG_DRAFT_SCHEMA_VERSION = 'nightwatch.ai-bug-draft.private.v2' as const;
export const AI_ORACLE_SUGGESTION_SCHEMA_VERSION = 'nightwatch.ai-oracle-suggestion.private.v2' as const;
export const AI_HUMAN_REVIEW_SCHEMA_VERSION = 'nightwatch.ai-human-review.private.v2' as const;
export const AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION = 'nightwatch.ai-bug-draft.private.v1' as const;
export const AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION = 'nightwatch.ai-oracle-suggestion.private.v1' as const;
export const AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION = 'nightwatch.ai-human-review.private.v1' as const;
export const AI_REVIEW_PROMPT_TEMPLATE_VERSION = 'nightwatch.ai-review-prompt.private.v1' as const;
export const AI_PROVIDER_ADAPTER_VERSION = 'nightwatch.ai-provider-adapter.private.v1' as const;
export const AI_BUG_DRAFT_OUTPUT_SCHEMA_VERSION = 'nightwatch.ai-bug-draft-output.private.v1' as const;
export const AI_ORACLE_SUGGESTION_OUTPUT_SCHEMA_VERSION = 'nightwatch.ai-oracle-suggestion-output.private.v1' as const;

export type AiProviderClass = 'SYNTHETIC_LOCAL' | 'LOOPBACK_LOCAL';
export type AiArtifactStatus =
  | 'AI_GENERATED_UNREVIEWED'
  | 'OWNER_APPROVED_DRAFT'
  | 'OWNER_REJECTED'
  | 'SUPERSEDED'
  | 'INVALID'
  | 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW';

export type AiStoredArtifactStatus = 'AI_GENERATED_UNREVIEWED';
export type AiEffectiveReviewStatus =
  | 'UNREVIEWED'
  | 'OWNER_APPROVED_DRAFT'
  | 'OWNER_REJECTED'
  | 'SUPERSEDED'
  | 'STALE'
  | 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW'
  | 'UNVERIFIED_LEGACY_REVIEW_STATE';

export type AiEffectiveReviewReason =
  | 'NO_OWNER_REVIEW_RECORD'
  | 'OWNER_APPROVED'
  | 'OWNER_REJECTED'
  | 'OWNER_SUPERSEDED'
  | 'INPUT_STALE'
  | 'LEGACY_STATUS_WITHOUT_REVIEW_RECORD';

export interface AiSafetyVector {
  readonly devContacts: number;
  readonly nextContacts: number;
  readonly productionAttempts: number;
  readonly proxyViolations: number;
  readonly unknownDestinations: number;
  readonly unknownApprovals: number;
  readonly productMutations: number;
  readonly actionCausedUnknown: number;
  readonly databaseQueries: number;
  readonly infrastructureQueries: number;
  readonly externalPublicationAttempts: number;
  readonly externalAiCalls: number;
  readonly aiToolExecutions: number;
  readonly aiSourceModifications: number;
}

export interface AiPrivacyVector {
  readonly result: 'PASS';
  readonly credentialsPersisted: false;
  readonly tokensPersisted: false;
  readonly cookiesPersisted: false;
  readonly storageStatePersisted: false;
  readonly customerDataPersisted: false;
  readonly financialValuesPersisted: false;
  readonly rawBodiesPersisted: false;
  readonly domPersisted: false;
  readonly screenshotsPersisted: false;
  readonly authenticatedTracesPersisted: false;
}

export const ZERO_AI_SAFETY: AiSafetyVector = {
  devContacts: 0,
  nextContacts: 0,
  productionAttempts: 0,
  proxyViolations: 0,
  unknownDestinations: 0,
  unknownApprovals: 0,
  productMutations: 0,
  actionCausedUnknown: 0,
  databaseQueries: 0,
  infrastructureQueries: 0,
  externalPublicationAttempts: 0,
  externalAiCalls: 0,
  aiToolExecutions: 0,
  aiSourceModifications: 0,
};

export const PASS_AI_PRIVACY: AiPrivacyVector = {
  result: 'PASS',
  credentialsPersisted: false,
  tokensPersisted: false,
  cookiesPersisted: false,
  storageStatePersisted: false,
  customerDataPersisted: false,
  financialValuesPersisted: false,
  rawBodiesPersisted: false,
  domPersisted: false,
  screenshotsPersisted: false,
  authenticatedTracesPersisted: false,
};

export const AI_REVIEW_BUDGET = {
  policyVersion: 'nightwatch.ai-review-budget.private.v1',
  maxCandidateReviews: 3,
  maxOracleSuggestions: 3,
  maxInputBytes: 64 * 1024,
  maxOutputBytes: 32 * 1024,
  maxProviderCalls: 3,
  perCallTimeoutMs: 5_000,
  maxTotalRuntimeMs: 15_000,
} as const;

export type AiReviewFailureCode =
  | 'AI_PROVIDER_DISABLED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_NOT_LOCAL'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_OUTPUT_TOO_LARGE'
  | 'AI_PROVIDER_MALFORMED_OUTPUT'
  | 'AI_OUTPUT_SCHEMA_INVALID'
  | 'AI_OUTPUT_REFERENCE_INVALID'
  | 'AI_OUTPUT_PRIVACY_BLOCKED'
  | 'AI_INPUT_NOT_ELIGIBLE'
  | 'AI_INPUT_PRIVACY_BLOCKED'
  | 'AI_REVIEW_BUDGET_EXHAUSTED'
  | 'AI_REVIEW_PROVIDER_BUDGET_EXHAUSTED'
  | 'AI_REVIEW_RUNTIME_BUDGET_EXHAUSTED'
  | 'AI_REVIEW_ARTIFACT_DIGEST_MISMATCH'
  | 'AI_REVIEW_RECORD_REQUIRED'
  | 'AI_REVIEW_STATE_INVALID'
  | 'AI_REVIEW_CONFLICTING_DECISIONS'
  | 'AI_REVIEW_ARTIFACT_IMMUTABLE'
  | 'AI_REVIEW_STORAGE_FAILED'
  | 'AI_ARTIFACT_STALE'
  | 'AI_REVIEW_OWNER_RECORD_INVALID';

export interface AiBugReviewFacts {
  readonly candidateId: string;
  readonly evidenceLevel: Exclude<EvidenceLevel, 'L0' | 'L1' | 'L4' | 'L5'>;
  readonly routeClass: string;
  readonly apiOperationFamily: string | null;
  readonly oracleFingerprint: string;
  readonly sourceRelevance: SourceChangeRelevance;
  readonly deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED';
  readonly technicalSeverity: BugDossier['technicalSeverity'];
  readonly triagePriority: BugDossier['triagePriority'];
  readonly browserApiStatus: BugDossier['browserApiDifferential']['status'];
  readonly deterministicFaultBoundary: BugDossier['likelyFaultBoundary']['primaryBoundary'];
}

export interface AiBugReviewInput {
  readonly schemaVersion: typeof AI_REVIEW_INPUT_SCHEMA_VERSION;
  readonly kind: 'BUG_CANDIDATE';
  readonly inputPackageId: string;
  readonly inputPackageDigest: string;
  readonly dossierVersion: BugDossier['schemaVersion'];
  readonly upstreamPackage: AiReadyEvidencePackage;
  readonly facts: AiBugReviewFacts;
  readonly evidenceRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly sourceSnapshotRefs: readonly string[];
  readonly availableEvidenceRefs: readonly string[];
  readonly availableSourceRefs: readonly string[];
  readonly structuralEvidence: Readonly<{
    readonly title: string;
    readonly minimalActionIds: readonly string[];
    readonly routeClass: string;
    readonly apiOperationFamily: string | null;
    readonly browserApiStatus: BugDossier['browserApiDifferential']['status'];
    readonly sourceRelevance: SourceChangeRelevance;
    readonly uncertaintyClasses: readonly string[];
  }>;
  readonly privacy: AiPrivacyVector;
  readonly safety: AiSafetyVector;
}

export interface AiStructuralChange {
  readonly changeRef: string;
  readonly repoId: string;
  readonly path: string;
  readonly changeType: ChangeSet['changedFiles'][number]['status'];
  readonly dependencyEdgeIds: readonly string[];
  readonly affectedJourneyIds: readonly string[];
  readonly affectedApiFamilies: readonly string[];
  readonly sourceRelevance: SourceChangeRelevance;
}

export interface AiOracleReviewInput {
  readonly schemaVersion: typeof AI_REVIEW_INPUT_SCHEMA_VERSION;
  readonly kind: 'ORACLE_SUGGESTION';
  readonly inputChangePackageId: string;
  readonly inputChangePackageDigest: string;
  readonly changeEvidenceRefs: readonly string[];
  readonly sourceSnapshotRefs: readonly string[];
  readonly affectedSurfaces: readonly string[];
  readonly structuralChanges: readonly AiStructuralChange[];
  readonly knownDeterministicInvariants: readonly string[];
  readonly missingCoverageClasses: readonly string[];
  readonly privacy: AiPrivacyVector;
  readonly safety: AiSafetyVector;
}

export interface AiBugModelHypothesis {
  readonly label: 'UNVERIFIED_HYPOTHESIS';
  readonly text: string;
  readonly supportingEvidenceRefs: readonly string[];
  readonly contradictingEvidenceRefs: readonly string[];
  readonly whatWouldDiscriminate: string;
}

export interface AiBugModelOutput {
  readonly schemaVersion: typeof AI_BUG_DRAFT_OUTPUT_SCHEMA_VERSION;
  readonly candidateId: string;
  readonly inputPackageId: string;
  readonly inputPackageDigest: string;
  readonly evidenceLevelAtGeneration: AiBugReviewFacts['evidenceLevel'];
  readonly summaryDraft: string;
  readonly reproductionDraft: string;
  readonly observedBehaviorDraft: string;
  readonly expectedBehaviorDraft: string;
  readonly impactDraft: string;
  readonly hypotheses: readonly AiBugModelHypothesis[];
  readonly evidenceRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly uncertainties: readonly string[];
}

export interface AiOracleModelOutput {
  readonly schemaVersion: typeof AI_ORACLE_SUGGESTION_OUTPUT_SCHEMA_VERSION;
  readonly inputChangePackageId: string;
  readonly changeEvidenceRefs: readonly string[];
  readonly sourceSnapshotRefs: readonly string[];
  readonly affectedSurface: string;
  readonly proposedInvariant: string;
  readonly proposedObservationClasses: readonly string[];
  readonly rationale: string;
  readonly possibleFalsePositiveModes: readonly string[];
  readonly requiredDeterministicEvidence: readonly string[];
  readonly requiredFixtureCoverage: readonly string[];
  readonly riskNotes: readonly string[];
}

export interface AiBugDraft {
  readonly schemaVersion: typeof AI_BUG_DRAFT_SCHEMA_VERSION;
  readonly draftId: string;
  readonly inputPackageId: string;
  readonly inputPackageDigest: string;
  readonly candidateId: string;
  readonly evidenceLevelAtGeneration: AiBugReviewFacts['evidenceLevel'];
  readonly modelProviderClass: AiProviderClass;
  readonly modelIdentifier: string;
  readonly modelInvocationId: string;
  readonly promptTemplateVersion: typeof AI_REVIEW_PROMPT_TEMPLATE_VERSION;
  readonly inputSchemaVersion: typeof AI_REVIEW_INPUT_SCHEMA_VERSION;
  readonly providerAdapterVersion: string;
  readonly dossierVersion: BugDossier['schemaVersion'];
  readonly generatedAt: string;
  readonly status: AiStoredArtifactStatus;
  readonly provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED';
  readonly summaryDraft: string;
  readonly reproductionDraft: string;
  readonly observedBehaviorDraft: string;
  readonly expectedBehaviorDraft: string;
  readonly impactDraft: string;
  readonly hypotheses: readonly AiBugModelHypothesis[];
  readonly evidenceRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly sourceSnapshotRefs: readonly string[];
  readonly uncertainties: readonly string[];
  readonly humanReviewRequired: true;
  readonly externalPublication: 'PROHIBITED';
  readonly safety: AiSafetyVector;
  readonly privacy: AiPrivacyVector;
  readonly responseDigest: string;
}

export interface AiOracleSuggestion {
  readonly schemaVersion: typeof AI_ORACLE_SUGGESTION_SCHEMA_VERSION;
  readonly suggestionId: string;
  readonly inputChangePackageId: string;
  readonly inputChangePackageDigest: string;
  readonly modelProviderClass: AiProviderClass;
  readonly modelIdentifier: string;
  readonly modelInvocationId: string;
  readonly promptTemplateVersion: typeof AI_REVIEW_PROMPT_TEMPLATE_VERSION;
  readonly inputSchemaVersion: typeof AI_REVIEW_INPUT_SCHEMA_VERSION;
  readonly providerAdapterVersion: string;
  readonly generatedAt: string;
  readonly changeEvidenceRefs: readonly string[];
  readonly sourceSnapshotRefs: readonly string[];
  readonly affectedSurface: string;
  readonly proposedInvariant: string;
  readonly proposedObservationClasses: readonly string[];
  readonly rationale: string;
  readonly possibleFalsePositiveModes: readonly string[];
  readonly requiredDeterministicEvidence: readonly string[];
  readonly requiredFixtureCoverage: readonly string[];
  readonly riskNotes: readonly string[];
  readonly humanReviewRequired: true;
  readonly executable: false;
  readonly status: AiStoredArtifactStatus;
  readonly provenanceLabel: 'AI-GENERATED — UNVERIFIED — HUMAN REVIEW REQUIRED';
  readonly externalPublication: 'PROHIBITED';
  readonly safety: AiSafetyVector;
  readonly privacy: AiPrivacyVector;
  readonly responseDigest: string;
}

export interface AiHumanReviewRecord {
  readonly schemaVersion: typeof AI_HUMAN_REVIEW_SCHEMA_VERSION;
  readonly reviewId: string;
  readonly artifactId: string;
  readonly artifactKind: 'BUG_DRAFT' | 'ORACLE_SUGGESTION';
  readonly artifactSchemaVersion: typeof AI_BUG_DRAFT_SCHEMA_VERSION | typeof AI_ORACLE_SUGGESTION_SCHEMA_VERSION;
  readonly decision: 'APPROVE_DRAFT' | 'REJECT' | 'SUPERSEDE';
  readonly reviewedAt: string;
  readonly reviewerClass: 'OWNER';
  readonly notes: string;
  readonly artifactDigest: string;
  readonly reviewSchemaVersion: typeof AI_HUMAN_REVIEW_SCHEMA_VERSION;
  readonly publication: 'PROHIBITED';
}

export type AiBugDraftV1 = Omit<AiBugDraft, 'schemaVersion' | 'status'> & {
  readonly schemaVersion: typeof AI_LEGACY_BUG_DRAFT_SCHEMA_VERSION;
  readonly status: Extract<AiArtifactStatus, 'AI_GENERATED_UNREVIEWED' | 'OWNER_APPROVED_DRAFT' | 'OWNER_REJECTED' | 'SUPERSEDED' | 'INVALID'>;
};

export type AiOracleSuggestionV1 = Omit<AiOracleSuggestion, 'schemaVersion' | 'status'> & {
  readonly schemaVersion: typeof AI_LEGACY_ORACLE_SUGGESTION_SCHEMA_VERSION;
  readonly status: Extract<AiArtifactStatus, 'AI_GENERATED_UNREVIEWED' | 'APPROVED_FOR_MANUAL_IMPLEMENTATION_REVIEW' | 'OWNER_REJECTED' | 'SUPERSEDED' | 'INVALID'>;
};

export interface AiHumanReviewRecordV1 {
  readonly schemaVersion: typeof AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION;
  readonly artifactId: string;
  readonly artifactKind: 'BUG_DRAFT' | 'ORACLE_SUGGESTION';
  readonly decision: 'APPROVE_DRAFT' | 'REJECT' | 'SUPERSEDE';
  readonly reviewedAt: string;
  readonly reviewerClass: 'OWNER';
  readonly notes: string;
  readonly artifactDigest: string;
  readonly reviewSchemaVersion: typeof AI_LEGACY_HUMAN_REVIEW_SCHEMA_VERSION;
  readonly publication: 'PROHIBITED';
}

export type AiReviewArtifact = AiBugDraft | AiOracleSuggestion;
export type AiLegacyReviewArtifact = AiBugDraftV1 | AiOracleSuggestionV1;
export type AiReadableReviewArtifact = AiReviewArtifact | AiLegacyReviewArtifact;
export type AiReadableHumanReviewRecord = AiHumanReviewRecord | AiHumanReviewRecordV1;

export interface AiReviewProjection<TArtifact extends AiReadableReviewArtifact = AiReadableReviewArtifact> {
  readonly artifact: TArtifact;
  readonly reviewRecord: AiReadableHumanReviewRecord | null;
  readonly effectiveStatus: AiEffectiveReviewStatus;
  readonly reason: AiEffectiveReviewReason;
  readonly current: boolean;
}

export interface AiReviewProvider {
  readonly providerClass: AiProviderClass;
  readonly adapterVersion: string;
  readonly modelIdentifier: string;
}

export interface BugReviewBuildOptions {
  readonly sourceSnapshotRefs?: readonly string[];
  readonly uncertaintyClasses?: readonly string[];
}

export interface OracleReviewBuildOptions {
  readonly knownDeterministicInvariants: readonly string[];
  readonly missingCoverageClasses: readonly string[];
}
