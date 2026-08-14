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
  type SelfDevCandidate,
  type SelfDevFutureReviewEligibility,
  type SelfDevSessionArtifact,
  type SelfDevTrustAssessment,
} from './types';
import {
  SelfDevIntegrityError,
  isV2SessionArtifact,
  validateLegacySessionArtifact,
  validateSessionArtifact,
} from './validation';
import { replaySession, verifiedPassCandidates } from './replay';

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

function isPositivePassCandidateCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Phase 8A.1.1 prerequisite check. This answers only "does this exact
 * assessment satisfy every eligibility precondition" — it is not itself
 * source-currentness-aware and trusts the assessment it is given. A caller
 * that wants a gate which cannot be fed a stale or hand-forged assessment
 * should use {@link assessFutureReviewEligibility}, which always derives its
 * own assessment.
 *
 * A replay-valid, source-attested artifact with zero pass candidates is
 * genuinely trust-valid (`VERIFIED_EXACT_BASE` /
 * `VERIFIED_SOURCE_EQUIVALENT_DESCENDANT` are unchanged) but is not
 * future-review eligible: it must also have replayed `PASS` and contain a
 * genuine positive integer count of passing candidates. `sourceBundleMatch`/
 * `contractDigestMatch` and the Phase 8A no-authority invariants are checked
 * defensively so a hand-forged assessment object cannot claim a verified
 * trust status while its own match/authority fields disagree.
 */
export function isFutureReviewPrerequisitePass(assessment: SelfDevTrustAssessment): boolean {
  const trustOk = assessment.trustStatus === 'VERIFIED_EXACT_BASE' || assessment.trustStatus === 'VERIFIED_SOURCE_EQUIVALENT_DESCENDANT';
  if (!trustOk) return false;
  if (assessment.sourceBundleMatch !== 'MATCH' || assessment.contractDigestMatch !== 'MATCH') return false;
  if (assessment.replayStatus !== 'PASS') return false;
  if (!isPositivePassCandidateCount(assessment.passCandidateCount)) return false;
  if (assessment.adoptionStatus !== SELFDEV_ADOPTION_STATUS || assessment.publication !== SELFDEV_PUBLICATION) return false;
  if (assessment.sourceWrites !== 0 || assessment.gitWrites !== 0 || assessment.externalCalls !== 0) return false;
  return true;
}

/**
 * Phase 8A.1.1 canonical future-review candidate-eligibility gate. This is
 * the one authoritative source-currentness-aware entry point: `current` is a
 * required parameter, so a caller cannot obtain an eligibility verdict while
 * skipping current-source trust by calling a replay-only helper instead. It
 * always derives its own assessment via {@link assessSelfDevArtifactIntegrity}
 * — a caller-supplied assessment is never trusted directly.
 *
 * On prerequisite failure this returns `{ eligible: false, candidates: [] }`
 * rather than throwing, so an ordinary ineligible artifact (invalid schema,
 * drifted source, zero pass candidates, replay mismatch, legacy v1, ...)
 * yields a stable structured result. On prerequisite pass it regenerates the
 * pass candidates via ordered replay and cross-checks the regenerated count
 * against the assessment's `passCandidateCount`; any disagreement fails
 * closed rather than being silently reconciled (no `Math.min()`, no trusting
 * one side).
 *
 * This function has no adoption, patch, source-write, or Git-write
 * authority. It is a read-only prerequisite check for a future, separately
 * authorized Phase 8B design.
 */
export function assessFutureReviewEligibility(value: unknown, current: CurrentSelfDevSourceView): SelfDevFutureReviewEligibility {
  const assessment = assessSelfDevArtifactIntegrity(value, current);
  if (!isFutureReviewPrerequisitePass(assessment)) {
    return { eligible: false, assessment, candidates: [] };
  }
  let candidates: readonly SelfDevCandidate[];
  try {
    candidates = verifiedPassCandidates(value as SelfDevSessionArtifact);
  } catch {
    return { eligible: false, assessment, candidates: [] };
  }
  if (candidates.length !== assessment.passCandidateCount) {
    return { eligible: false, assessment, candidates: [] };
  }
  return { eligible: true, assessment, candidates };
}

export function missingSelfDevArtifactAssessment(artifactId: string): SelfDevTrustAssessment {
  if (!ARTIFACT_ID_RE.test(artifactId)) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
  return assessmentBase(artifactId, 'unknown', null, null, 'ARTIFACT_NOT_FOUND', 'UNKNOWN', 'NOT_CHECKED', 'NOT_CHECKED', 'NOT_RUN', 0);
}
