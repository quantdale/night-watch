// ---------------------------------------------------------------------------
// Nightwatch Phase 8A — strict declarative self-development contracts.
//
// Candidate data is intentionally structural. There is no source, patch,
// path, URL, command, expression, callback, or executable oracle field.
// ---------------------------------------------------------------------------

export const SELFDEV_CANDIDATE_SCHEMA_VERSION = 'nightwatch.selfdev-candidate.private.v1' as const;
export const SELFDEV_LEGACY_EVALUATION_SCHEMA_VERSION = 'nightwatch.selfdev-evaluation.private.v1' as const;
export const SELFDEV_EVALUATION_SCHEMA_VERSION = 'nightwatch.selfdev-evaluation.private.v2' as const;
export const SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION = 'nightwatch.selfdev-session.private.v1' as const;
export const SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION = 'nightwatch.selfdev-session.private.v2' as const;
export const SELFDEV_PROVENANCE_SCHEMA_VERSION = 'nightwatch.selfdev-provenance.private.v1' as const;
export const SELFDEV_TRUST_ASSESSMENT_SCHEMA_VERSION = 'nightwatch.selfdev-trust-assessment.private.v1' as const;
export const SELFDEV_REPLAY_ALGORITHM_VERSION = 'nightwatch.selfdev-replay-algorithm.v1' as const;
export const SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION = 'nightwatch.selfdev-replay-descriptor.private.v1' as const;
export const SELFDEV_SYNTHETIC_FIXTURES = Object.freeze([
  'VALID_MATRIX',
  'UNKNOWN_FIELD',
  'UNSAFE_ACTION',
  'UNSAFE_ASSERTION',
  'UNSAFE_FIXTURE',
  'OVERSIZED',
  'DUPLICATE',
  'SCOPE_ESCALATION',
  'FAKE_COVERAGE',
  'CODE_FIELD',
  'PATCH_FIELD',
  'GIT_REQUEST',
  'MODEL_REQUEST',
  'PRIVACY_VALUE',
] as const);
export type SelfDevSyntheticFixture = (typeof SELFDEV_SYNTHETIC_FIXTURES)[number];

export const SELFDEV_CANDIDATE_KIND = 'SYNTHETIC_REGRESSION_CASE' as const;
export const SELFDEV_PROPOSER_CLASS = 'SYNTHETIC_DETERMINISTIC' as const;
export const SELFDEV_TARGET_SURFACE = 'LOCAL_SYNTHETIC' as const;
export const SELFDEV_PUBLICATION = 'PROHIBITED' as const;
export const SELFDEV_ADOPTION_STATUS = 'NOT_AUTHORIZED_PHASE_8A' as const;

export const SELFDEV_BUDGET = Object.freeze({
  maxCandidatesPerSession: 3,
  maxActionsPerCandidate: 8,
  maxAssertionsPerCandidate: 8,
  maxCandidateRuntimeMs: 30_000,
  maxSessionRuntimeMs: 120_000,
  maxCoverageClaims: 8,
  maxSourceRefs: 4,
  maxTitleLength: 120,
} as const);

export type SelfDevRationaleClass =
  | 'BOUNDARY_REGRESSION'
  | 'STATE_TRANSITION'
  | 'ORACLE_CLASSIFICATION';

export type SelfDevValidationStatus = 'PASS' | 'REJECTED';
export type SelfDevScopeStatus = 'IN_SCOPE' | 'REJECTED' | 'NOT_CHECKED';
export type SelfDevDuplicateStatus = 'UNIQUE' | 'DUPLICATE' | 'NOT_CHECKED';
export type SelfDevExecutionStatus = 'EXECUTED' | 'NOT_STARTED' | 'SKIPPED';
export type SelfDevRegressionStatus = 'PASS' | 'FAIL' | 'NOT_RUN';
export type SelfDevGateStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export type SelfDevSourceState = 'CLEAN';
export type SelfDevProvenanceClass = 'LOCAL_GIT_SOURCE_ATTESTED' | 'SYNTHETIC_TEST_ONLY';
export type SelfDevBaselineRelation = 'EXACT_BASE' | 'SOURCE_EQUIVALENT_DESCENDANT' | 'UNRELATED' | 'UNKNOWN';
export type SelfDevReplayStatus = 'PASS' | 'FAIL' | 'NON_REPLAYABLE_BUDGET_RESULT';

export type SelfDevResultClass =
  | 'REJECTED_SCHEMA'
  | 'REJECTED_SCOPE'
  | 'REJECTED_UNKNOWN_ACTION'
  | 'REJECTED_UNKNOWN_ASSERTION'
  | 'REJECTED_DUPLICATE'
  | 'REJECTED_SAFETY'
  | 'REJECTED_PRIVACY'
  | 'EVALUATION_FAILED'
  | 'EVALUATED_PASS_NOT_ADOPTED';

export type SelfDevReasonCode =
  | 'VALIDATION_OK'
  | 'SCHEMA_INVALID'
  | 'SCHEMA_UNKNOWN_FIELD'
  | 'SCHEMA_MISSING_FIELD'
  | 'SCHEMA_IDENTITY_MISMATCH'
  | 'SCOPE_INVALID'
  | 'SCOPE_FIXTURE_UNKNOWN'
  | 'SCOPE_SOURCE_REF_UNKNOWN'
  | 'SCOPE_COVERAGE_CLAIM_UNKNOWN'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_ASSERTION'
  | 'DUPLICATE_SEMANTIC_IDENTITY'
  | 'DUPLICATE_COVERAGE'
  | 'CANDIDATE_SAFETY_VECTOR_NONZERO'
  | 'CANDIDATE_PRIVACY_BLOCKED'
  | 'CANDIDATE_EVALUATION_BUDGET_EXCEEDED'
  | 'SESSION_EVALUATION_BUDGET_EXCEEDED'
  | 'FIXTURE_TRANSITION_INVALID'
  | 'ASSERTION_FAILED'
  | 'PRIVATE_ARTIFACT_CONFLICT';

export interface SelfDevSafetyVector {
  readonly devContacts: number;
  readonly nextContacts: number;
  readonly productionContacts: number;
  readonly productMutations: number;
  readonly databaseQueries: number;
  readonly infrastructureQueries: number;
  readonly externalAiCalls: number;
  readonly realModelCalls: number;
  readonly publication: number;
  readonly runtimeGitWrites: number;
  readonly nightwatchRuntimeSourceWrites: number;
  readonly alphausWrites: number;
}

export const ZERO_SELFDEV_SAFETY_VECTOR: SelfDevSafetyVector = Object.freeze({
  devContacts: 0,
  nextContacts: 0,
  productionContacts: 0,
  productMutations: 0,
  databaseQueries: 0,
  infrastructureQueries: 0,
  externalAiCalls: 0,
  realModelCalls: 0,
  publication: 0,
  runtimeGitWrites: 0,
  nightwatchRuntimeSourceWrites: 0,
  alphausWrites: 0,
});

export interface SelfDevCandidate {
  readonly schemaVersion: typeof SELFDEV_CANDIDATE_SCHEMA_VERSION;
  readonly candidateId: string;
  readonly candidateKind: typeof SELFDEV_CANDIDATE_KIND;
  readonly generatorClass: typeof SELFDEV_PROPOSER_CLASS;
  readonly baseNightwatchSha: string;
  readonly fixtureId: string;
  readonly targetSurface: typeof SELFDEV_TARGET_SURFACE;
  readonly title: string;
  readonly rationaleClass: SelfDevRationaleClass;
  readonly actionIds: readonly string[];
  readonly assertionIds: readonly string[];
  readonly coverageClaims: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly createdAt?: string;
  readonly safety: SelfDevSafetyVector;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly adoptionAuthority: 'NONE';
}

export interface SelfDevCoverageDelta {
  readonly added: readonly string[];
  readonly count: number;
}

export interface SelfDevExecutionSummary {
  readonly initialStateId: string;
  readonly finalStateId: string;
  readonly transitionClass: string;
  readonly oracleClass: string;
  readonly stableFingerprint: string;
}

export interface SelfDevEvaluation {
  readonly schemaVersion: typeof SELFDEV_EVALUATION_SCHEMA_VERSION;
  readonly evaluationId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly baseNightwatchSha: string;
  readonly candidateKind: typeof SELFDEV_CANDIDATE_KIND;
  readonly validationStatus: SelfDevValidationStatus;
  readonly scopeStatus: SelfDevScopeStatus;
  readonly duplicateStatus: SelfDevDuplicateStatus;
  readonly executionStatus: SelfDevExecutionStatus;
  readonly regressionStatus: SelfDevRegressionStatus;
  readonly safetyStatus: SelfDevGateStatus;
  readonly privacyStatus: SelfDevGateStatus;
  readonly coverageDelta: SelfDevCoverageDelta;
  readonly execution: SelfDevExecutionSummary | null;
  readonly reasonCode: SelfDevReasonCode;
  readonly resultClass: SelfDevResultClass;
  readonly adoptionStatus: typeof SELFDEV_ADOPTION_STATUS;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly sourceWrites: 0;
  readonly gitWrites: 0;
  readonly externalCalls: 0;
  readonly safetyVector: SelfDevSafetyVector;
}

export interface SelfDevReplayDescriptor {
  readonly schemaVersion: typeof SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION;
  readonly proposerClass: typeof SELFDEV_PROPOSER_CLASS;
  readonly fixture: SelfDevSyntheticFixture;
  readonly seed: number;
  readonly baseNightwatchSha: string;
  readonly expectedProposalCount: number;
}

export interface SelfDevProvenance {
  readonly schemaVersion: typeof SELFDEV_PROVENANCE_SCHEMA_VERSION;
  readonly gitHeadSha: string;
  readonly sourceBundleDigest: string;
  readonly contractDigest: string;
  readonly algorithmVersion: typeof SELFDEV_REPLAY_ALGORITHM_VERSION;
  readonly authoritativeSourceState: SelfDevSourceState;
  readonly runtimeNodeVersion: string;
  readonly provenanceClass: SelfDevProvenanceClass;
}

export interface SelfDevSessionArtifact {
  readonly schemaVersion: typeof SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION;
  readonly artifactId: string;
  readonly baseNightwatchSha: string;
  readonly provenance: SelfDevProvenance;
  readonly replayDescriptor: SelfDevReplayDescriptor;
  readonly proposerClass: typeof SELFDEV_PROPOSER_CLASS;
  readonly candidateCount: number;
  readonly evaluations: readonly SelfDevEvaluation[];
  readonly adoptionStatus: typeof SELFDEV_ADOPTION_STATUS;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly sourceWrites: 0;
  readonly gitWrites: 0;
  readonly externalCalls: 0;
  readonly safetyVector: SelfDevSafetyVector;
}

export interface SelfDevLegacySessionArtifact {
  readonly schemaVersion: typeof SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION;
  readonly artifactId: string;
  readonly baseNightwatchSha: string;
  readonly proposerClass: typeof SELFDEV_PROPOSER_CLASS;
  readonly candidateCount: number;
  readonly evaluations: readonly Record<string, unknown>[];
  readonly adoptionStatus: typeof SELFDEV_ADOPTION_STATUS;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly sourceWrites: 0;
  readonly gitWrites: 0;
  readonly externalCalls: 0;
  readonly safetyVector: SelfDevSafetyVector;
}

export interface SelfDevPrivateArtifactReceipt {
  readonly persisted: boolean;
  readonly namespace: 'self-development';
  readonly artifactId: string;
  readonly disposition: 'CREATED' | 'EXACT_DUPLICATE' | 'NOT_PERSISTED';
}

export interface SelfDevSessionReport {
  readonly schemaVersion: typeof SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION;
  readonly baseNightwatchSha: string;
  readonly artifactId: string;
  readonly provenance: SelfDevProvenance;
  readonly replayDescriptor: SelfDevReplayDescriptor;
  readonly proposerClass: typeof SELFDEV_PROPOSER_CLASS;
  readonly candidateCount: number;
  readonly evaluations: readonly SelfDevEvaluation[];
  readonly privateArtifact: SelfDevPrivateArtifactReceipt;
  readonly adoptionStatus: typeof SELFDEV_ADOPTION_STATUS;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly sourceWrites: 0;
  readonly gitWrites: 0;
  readonly externalCalls: 0;
  readonly safetyVector: SelfDevSafetyVector;
}

export type SelfDevTrustStatus =
  | 'VERIFIED_EXACT_BASE'
  | 'VERIFIED_SOURCE_EQUIVALENT_DESCENDANT'
  | 'LEGACY_UNVERIFIED_NOT_ELIGIBLE'
  | 'INVALID_SCHEMA'
  | 'SESSION_IDENTITY_MISMATCH'
  | 'EVALUATION_STATE_INVALID'
  | 'CANDIDATE_BINDING_MISMATCH'
  | 'BASELINE_MISMATCH'
  | 'SOURCE_BUNDLE_MISMATCH'
  | 'CONTRACT_DIGEST_MISMATCH'
  | 'AUTHORITATIVE_SOURCE_DIRTY'
  | 'REPLAY_MISMATCH'
  | 'PROVENANCE_UNAVAILABLE'
  | 'ARTIFACT_NOT_FOUND'
  | 'UNRELATED_BASELINE';

export interface SelfDevTrustAssessment {
  readonly schemaVersion: typeof SELFDEV_TRUST_ASSESSMENT_SCHEMA_VERSION;
  readonly trustStatus: SelfDevTrustStatus;
  readonly artifactId: string;
  readonly schemaVersionInspected: string;
  readonly baseNightwatchSha: string | null;
  readonly currentHeadSha: string | null;
  readonly sourceBundleMatch: 'MATCH' | 'MISMATCH' | 'NOT_CHECKED';
  readonly contractDigestMatch: 'MATCH' | 'MISMATCH' | 'NOT_CHECKED';
  readonly baselineRelation: SelfDevBaselineRelation;
  readonly replayStatus: SelfDevReplayStatus | 'NOT_RUN';
  readonly passCandidateCount: number;
  readonly adoptionStatus: typeof SELFDEV_ADOPTION_STATUS;
  readonly publication: typeof SELFDEV_PUBLICATION;
  readonly sourceWrites: 0;
  readonly gitWrites: 0;
  readonly externalCalls: 0;
}

export interface SelfDevReplayResult {
  readonly status: SelfDevReplayStatus;
  readonly reason: string;
  readonly passCandidateCount: number;
}

export interface SelfDevStoredArtifactV2 {
  readonly kind: 'V2';
  readonly artifact: SelfDevSessionArtifact;
}

export interface SelfDevStoredLegacyArtifact {
  readonly kind: 'LEGACY_V1';
  readonly artifact: SelfDevLegacySessionArtifact;
}

export type SelfDevStoredArtifact = SelfDevStoredArtifactV2 | SelfDevStoredLegacyArtifact;
