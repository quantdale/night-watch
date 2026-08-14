// ---------------------------------------------------------------------------
// Phase 8A.1 — derived read-only trust assessment.
//
// This module never computes local Git state itself. The narrow provenance
// boundary supplies a read-only current-checkout DTO; this module combines it
// with strict v2 validation and ordered replay. No assessment is persisted or
// written back into the artifact.
// ---------------------------------------------------------------------------

import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_PUBLICATION,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_TRUST_ASSESSMENT_SCHEMA_VERSION,
  type SelfDevBaselineRelation,
  type SelfDevSessionArtifact,
  type SelfDevTrustAssessment,
} from './types';
import {
  SelfDevIntegrityError,
  isV2SessionArtifact,
  validateLegacySessionArtifact,
  validateSessionArtifact,
} from './validation';
import { replaySession } from './replay';

export interface CurrentSelfDevSourceView {
  readonly currentHeadSha: string;
  readonly sourceBundleDigest: string;
  readonly contractDigest: string;
  readonly authoritativeSourceState: 'CLEAN' | 'DIRTY';
  isAncestor(baseSha: string): boolean;
}

const SHA_RE = /^[0-9a-f]{40}$/;
const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;

function safeArtifactId(value: unknown): string {
  return typeof value === 'string' && ARTIFACT_ID_RE.test(value) ? value : 'session:sha256:' + '0'.repeat(64);
}

function baseRelation(artifact: SelfDevSessionArtifact, current: CurrentSelfDevSourceView): SelfDevBaselineRelation {
  if (current.currentHeadSha === artifact.baseNightwatchSha) return 'EXACT_BASE';
  if (current.isAncestor(artifact.baseNightwatchSha)) return 'SOURCE_EQUIVALENT_DESCENDANT';
  return 'UNRELATED';
}

function assessmentBase(
  artifactId: string,
  schemaVersionInspected: string,
  baseNightwatchSha: string | null,
  currentHeadSha: string | null,
  trustStatus: SelfDevTrustAssessment['trustStatus'],
  baselineRelation: SelfDevBaselineRelation,
  sourceBundleMatch: SelfDevTrustAssessment['sourceBundleMatch'],
  contractDigestMatch: SelfDevTrustAssessment['contractDigestMatch'],
  replayStatus: SelfDevTrustAssessment['replayStatus'],
  passCandidateCount: number,
): SelfDevTrustAssessment {
  return {
    schemaVersion: SELFDEV_TRUST_ASSESSMENT_SCHEMA_VERSION,
    trustStatus,
    artifactId,
    schemaVersionInspected,
    baseNightwatchSha,
    currentHeadSha,
    sourceBundleMatch,
    contractDigestMatch,
    baselineRelation,
    replayStatus,
    passCandidateCount,
    adoptionStatus: SELFDEV_ADOPTION_STATUS,
    publication: SELFDEV_PUBLICATION,
    sourceWrites: 0,
    gitWrites: 0,
    externalCalls: 0,
  };
}

function legacyAssessment(value: unknown): SelfDevTrustAssessment {
  const artifactId = safeArtifactId(value !== null && typeof value === 'object' ? (value as Record<string, unknown>).artifactId : undefined);
  const schema = value !== null && typeof value === 'object' && typeof (value as Record<string, unknown>).schemaVersion === 'string'
    ? (value as Record<string, unknown>).schemaVersion as string
    : 'unknown';
  try {
    const legacy = validateLegacySessionArtifact(value);
    const count = legacy.evaluations.filter((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED').length;
    return assessmentBase(legacy.artifactId, schema, legacy.baseNightwatchSha, null, 'LEGACY_UNVERIFIED_NOT_ELIGIBLE', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', count);
  } catch {
    return assessmentBase(artifactId, schema, null, null, 'INVALID_SCHEMA', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', 0);
  }
}

/** Derive a trust status from an exact artifact and current read-only source DTO. */
export function assessSelfDevArtifactIntegrity(value: unknown, current?: CurrentSelfDevSourceView): SelfDevTrustAssessment {
  if (!isV2SessionArtifact(value)) {
    const schema = value !== null && typeof value === 'object' && typeof (value as Record<string, unknown>).schemaVersion === 'string'
      ? (value as Record<string, unknown>).schemaVersion as string
      : 'unknown';
    if (schema === 'nightwatch.selfdev-session.private.v1') return legacyAssessment(value);
  }

  const artifactId = safeArtifactId(value !== null && typeof value === 'object' ? (value as Record<string, unknown>).artifactId : undefined);
  let artifact: SelfDevSessionArtifact;
  try {
    const validated = validateSessionArtifact(value);
    if (!isV2SessionArtifact(validated)) return legacyAssessment(value);
    artifact = validated;
  } catch (error) {
    const status: SelfDevTrustAssessment['trustStatus'] = error instanceof SelfDevIntegrityError
      ? error.code === 'SESSION_IDENTITY_MISMATCH' ? 'SESSION_IDENTITY_MISMATCH'
        : error.code === 'BASELINE_MISMATCH' ? 'BASELINE_MISMATCH'
          : error.code === 'CANDIDATE_BINDING_MISMATCH' ? 'CANDIDATE_BINDING_MISMATCH'
            : 'EVALUATION_STATE_INVALID'
      : 'INVALID_SCHEMA';
    return assessmentBase(artifactId, SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION, null, current?.currentHeadSha ?? null, status, 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', 0);
  }

  const passCount = artifact.evaluations.filter((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED').length;
  if (artifact.provenance.provenanceClass !== 'LOCAL_GIT_SOURCE_ATTESTED' || current === undefined) {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current?.currentHeadSha ?? null, 'PROVENANCE_UNAVAILABLE', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', passCount);
  }
  if (current.authoritativeSourceState !== 'CLEAN') {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current.currentHeadSha, 'AUTHORITATIVE_SOURCE_DIRTY', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', passCount);
  }

  const relation = baseRelation(artifact, current);
  if (relation === 'UNRELATED') {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current.currentHeadSha, 'BASELINE_MISMATCH', relation, 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', passCount);
  }
  const sourceMatch = current.sourceBundleDigest === artifact.provenance.sourceBundleDigest;
  if (!sourceMatch) {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current.currentHeadSha, 'SOURCE_BUNDLE_MISMATCH', relation, 'MISMATCH', 'NOT_CHECKED', 'NOT_RUN', passCount);
  }
  const contractMatch = current.contractDigest === artifact.provenance.contractDigest;
  if (!contractMatch) {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current.currentHeadSha, 'CONTRACT_DIGEST_MISMATCH', relation, 'MATCH', 'MISMATCH', 'NOT_RUN', passCount);
  }

  const replay = replaySession(artifact);
  if (replay.status !== 'PASS') {
    return assessmentBase(artifact.artifactId, artifact.schemaVersion, artifact.baseNightwatchSha, current.currentHeadSha, 'REPLAY_MISMATCH', relation, 'MATCH', 'MATCH', replay.status, passCount);
  }
  return assessmentBase(
    artifact.artifactId,
    artifact.schemaVersion,
    artifact.baseNightwatchSha,
    current.currentHeadSha,
    relation === 'EXACT_BASE' ? 'VERIFIED_EXACT_BASE' : 'VERIFIED_SOURCE_EQUIVALENT_DESCENDANT',
    relation,
    'MATCH',
    'MATCH',
    'PASS',
    passCount,
  );
}

export function isFutureReviewPrerequisitePass(assessment: SelfDevTrustAssessment): boolean {
  return assessment.trustStatus === 'VERIFIED_EXACT_BASE' || assessment.trustStatus === 'VERIFIED_SOURCE_EQUIVALENT_DESCENDANT';
}

export function missingSelfDevArtifactAssessment(artifactId: string): SelfDevTrustAssessment {
  if (!ARTIFACT_ID_RE.test(artifactId)) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
  return assessmentBase(artifactId, 'unknown', null, null, 'ARTIFACT_NOT_FOUND', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', 0);
}
