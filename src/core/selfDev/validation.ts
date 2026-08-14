// ---------------------------------------------------------------------------
// Nightwatch Phase 8A.1 — strict DTO validation, semantic state invariants,
// and content-addressed identity.
//
// Candidate v1 remains the untrusted input contract. Evaluation/session v2
// are the only contracts eligible for replay assessment. Structural validity,
// semantic possibility, replay, and current-source provenance remain separate
// authorities.
// ---------------------------------------------------------------------------

import { canonicalJson, sha256Digest, sha256Hex } from './canonical';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_BUDGET,
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_EVALUATION_SCHEMA_VERSION,
  SELFDEV_LEGACY_EVALUATION_SCHEMA_VERSION,
  SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_PROVENANCE_SCHEMA_VERSION,
  SELFDEV_REPLAY_ALGORITHM_VERSION,
  SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_SYNTHETIC_FIXTURES,
  SELFDEV_TARGET_SURFACE,
  ZERO_SELFDEV_SAFETY_VECTOR,
  type SelfDevCandidate,
  type SelfDevEvaluation,
  type SelfDevExecutionSummary,
  type SelfDevLegacySessionArtifact,
  type SelfDevProvenance,
  type SelfDevReplayDescriptor,
  type SelfDevReasonCode,
  type SelfDevResultClass,
  type SelfDevSafetyVector,
  type SelfDevSessionArtifact,
  type SelfDevStoredArtifact,
} from './types';

export type SelfDevValidationCategory = 'SCHEMA' | 'SCOPE' | 'SAFETY' | 'PRIVACY';

export class SelfDevValidationError extends Error {
  constructor(
    readonly reasonCode: SelfDevReasonCode,
    readonly category: SelfDevValidationCategory,
  ) {
    super(`SELFDEV_${category}_${reasonCode}`);
    this.name = 'SelfDevValidationError';
  }
}

export type SelfDevIntegrityCode =
  | 'SESSION_IDENTITY_MISMATCH'
  | 'EVALUATION_STATE_INVALID'
  | 'BASELINE_MISMATCH'
  | 'CANDIDATE_BINDING_MISMATCH'
  | 'REPLAY_MISMATCH'
  | 'SOURCE_BUNDLE_MISMATCH'
  | 'CONTRACT_DIGEST_MISMATCH';

export class SelfDevIntegrityError extends Error {
  constructor(readonly code: SelfDevIntegrityCode) {
    super(`SELFDEV_${code}`);
    this.name = 'SelfDevIntegrityError';
  }
}

export class SelfDevRegistryError extends Error {
  constructor(readonly reasonCode: 'SCOPE_FIXTURE_UNKNOWN' | 'UNKNOWN_ACTION' | 'UNKNOWN_ASSERTION' | 'SCOPE_SOURCE_REF_UNKNOWN' | 'SCOPE_COVERAGE_CLAIM_UNKNOWN') {
    super(`SELFDEV_${reasonCode}`);
    this.name = 'SelfDevRegistryError';
  }
}

export const ZERO_SHA256_HEX = '0'.repeat(64);
export const ZERO_SHA256_DIGEST = `sha256:${ZERO_SHA256_HEX}`;
export const ZERO_CANDIDATE_ID = `candidate:${ZERO_SHA256_HEX}`;
export const ZERO_EVALUATION_ID = `evaluation:${ZERO_SHA256_DIGEST}`;

const CANDIDATE_KEYS = [
  'schemaVersion', 'candidateId', 'candidateKind', 'generatorClass',
  'baseNightwatchSha', 'fixtureId', 'targetSurface', 'title',
  'rationaleClass', 'actionIds', 'assertionIds', 'coverageClaims',
  'sourceRefs', 'safety', 'publication', 'adoptionAuthority',
] as const;
const CANDIDATE_OPTIONAL_KEYS = ['createdAt'] as const;

const SAFETY_KEYS = [
  'devContacts', 'nextContacts', 'productionContacts', 'productMutations',
  'databaseQueries', 'infrastructureQueries', 'externalAiCalls',
  'realModelCalls', 'publication', 'runtimeGitWrites',
  'nightwatchRuntimeSourceWrites', 'alphausWrites',
] as const;

const COVERAGE_KEYS = ['added', 'count'] as const;
const EXECUTION_KEYS = ['initialStateId', 'finalStateId', 'transitionClass', 'oracleClass', 'stableFingerprint'] as const;
const EVALUATION_KEYS = [
  'schemaVersion', 'evaluationId', 'candidateId', 'candidateDigest',
  'baseNightwatchSha', 'candidateKind', 'validationStatus', 'scopeStatus',
  'duplicateStatus', 'executionStatus', 'regressionStatus', 'safetyStatus',
  'privacyStatus', 'coverageDelta', 'execution', 'reasonCode', 'resultClass',
  'adoptionStatus', 'publication', 'sourceWrites', 'gitWrites',
  'externalCalls', 'safetyVector',
] as const;
const ARTIFACT_V2_KEYS = [
  'schemaVersion', 'artifactId', 'baseNightwatchSha', 'provenance',
  'replayDescriptor', 'proposerClass', 'candidateCount', 'evaluations',
  'adoptionStatus', 'publication', 'sourceWrites', 'gitWrites',
  'externalCalls', 'safetyVector',
] as const;
const ARTIFACT_V1_KEYS = [
  'schemaVersion', 'artifactId', 'baseNightwatchSha', 'proposerClass',
  'candidateCount', 'evaluations', 'adoptionStatus', 'publication',
  'sourceWrites', 'gitWrites', 'externalCalls', 'safetyVector',
] as const;
const PROVENANCE_KEYS = [
  'schemaVersion', 'gitHeadSha', 'sourceBundleDigest', 'contractDigest',
  'algorithmVersion', 'authoritativeSourceState', 'runtimeNodeVersion',
  'provenanceClass',
] as const;
const REPLAY_KEYS = [
  'schemaVersion', 'proposerClass', 'fixture', 'seed', 'baseNightwatchSha',
  'expectedProposalCount',
] as const;

const ID_RE = /^[A-Za-z][A-Za-z0-9_.:-]{0,119}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const CANDIDATE_ID_RE = /^candidate:[0-9a-f]{64}$/;
const EVALUATION_ID_RE = /^evaluation:sha256:[0-9a-f]{64}$/;
const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const NODE_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

type RuntimeRecord = Record<string, unknown>;

function isRuntimeRecord(value: unknown): value is RuntimeRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRuntimeArray(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${code}:ARRAY_REQUIRED`);
  return value;
}

function assertExactKeys(value: RuntimeRecord, allowed: readonly string[], code: string, optional: readonly string[] = []): void {
  const accepted = new Set([...allowed, ...optional]);
  for (const key of Object.keys(value)) {
    if (!accepted.has(key)) throw new Error(`${code}:UNKNOWN_FIELD:${key}`);
  }
  for (const key of allowed) {
    if (!(key in value)) throw new Error(`${code}:MISSING_FIELD:${key}`);
  }
}

function assertString(value: unknown, code: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`${code}:STRING_REQUIRED`);
}

function assertNonNegativeInteger(value: unknown, code: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${code}:NON_NEGATIVE_INTEGER_REQUIRED`);
  }
}

function assertIsoTimestamp(value: unknown, code: string): asserts value is string {
  assertString(value, code);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${code}:TIMESTAMP_INVALID`);
}

function assertEnum<T extends string>(value: unknown, allowed: readonly T[], code: string): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${code}:ENUM_INVALID`);
}

function fail(reasonCode: SelfDevReasonCode, category: SelfDevValidationCategory): never {
  throw new SelfDevValidationError(reasonCode, category);
}

function record(value: unknown, code: SelfDevReasonCode = 'SCHEMA_INVALID'): RuntimeRecord {
  if (!isRuntimeRecord(value)) fail(code, 'SCHEMA');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code, 'SCHEMA');
  return value;
}

function boundedString(value: unknown, max: number, code: SelfDevReasonCode = 'SCHEMA_INVALID'): string {
  try {
    assertString(value, `SELFDEV_${code}`);
  } catch {
    fail(code, 'SCHEMA');
  }
  if (value.length < 1 || value.length > max || /[\u0000-\u001f\u007f-\u009f]/.test(value)) fail(code, 'SCHEMA');
  return value;
}

function safeId(value: unknown, code: SelfDevReasonCode = 'SCHEMA_INVALID'): string {
  const id = boundedString(value, 120, code);
  if (!ID_RE.test(id)) fail(code, 'SCHEMA');
  return id;
}

function stringList(value: unknown, maxItems: number, code: SelfDevReasonCode): readonly string[] {
  const values = requireRuntimeArray(value, `SELFDEV_${code}`);
  if (values.length > maxItems) fail(code, 'SCHEMA');
  const result = values.map((item) => safeId(item, code));
  if (new Set(result).size !== result.length) fail(code, 'SCHEMA');
  return result;
}

function assertZeroSafetyVector(value: unknown, category: SelfDevValidationCategory): SelfDevSafetyVector {
  const safety = record(value);
  try {
    assertExactKeys(safety, SAFETY_KEYS, 'SELFDEV_SAFETY');
  } catch {
    throw new SelfDevValidationError('SCHEMA_INVALID', 'SCHEMA');
  }
  for (const key of SAFETY_KEYS) {
    try {
      assertNonNegativeInteger(safety[key], `SELFDEV_SAFETY_${key}`);
    } catch {
      fail('SCHEMA_INVALID', 'SCHEMA');
    }
    if (safety[key] !== 0) fail('CANDIDATE_SAFETY_VECTOR_NONZERO', category);
  }
  return { ...ZERO_SELFDEV_SAFETY_VECTOR };
}

function semanticCandidateFields(candidate: Omit<SelfDevCandidate, 'candidateId' | 'createdAt'>): Record<string, unknown> {
  return {
    schemaVersion: candidate.schemaVersion,
    candidateKind: candidate.candidateKind,
    generatorClass: candidate.generatorClass,
    baseNightwatchSha: candidate.baseNightwatchSha,
    fixtureId: candidate.fixtureId,
    targetSurface: candidate.targetSurface,
    title: candidate.title,
    rationaleClass: candidate.rationaleClass,
    actionIds: [...candidate.actionIds],
    assertionIds: [...candidate.assertionIds].sort(),
    coverageClaims: [...candidate.coverageClaims].sort(),
    sourceRefs: [...candidate.sourceRefs].sort(),
    safety: candidate.safety,
    publication: candidate.publication,
    adoptionAuthority: candidate.adoptionAuthority,
  };
}

export function candidateIdentityFields(candidate: SelfDevCandidate): Record<string, unknown> {
  const { candidateId: _candidateId, createdAt: _createdAt, ...semantic } = candidate;
  return semanticCandidateFields(semantic as Omit<SelfDevCandidate, 'candidateId' | 'createdAt'>);
}

export function candidateSemanticDigest(candidate: SelfDevCandidate): string {
  return sha256Hex(canonicalJson(candidateIdentityFields(candidate)));
}

export function candidateIdFor(candidate: Omit<SelfDevCandidate, 'candidateId'>): string {
  const { createdAt: _createdAt, ...semantic } = candidate;
  return `candidate:${sha256Hex(canonicalJson(semanticCandidateFields(semantic as Omit<SelfDevCandidate, 'candidateId' | 'createdAt'>)))}`;
}

export function candidateDigestFor(candidate: SelfDevCandidate): string {
  return `sha256:${candidateSemanticDigest(candidate)}`;
}

export function candidateEquivalentFingerprint(candidate: SelfDevCandidate): string {
  return sha256Digest({
    fixtureId: candidate.fixtureId,
    actionIds: [...candidate.actionIds],
    assertionIds: [...candidate.assertionIds].sort(),
  });
}

export function validateCandidate(value: unknown): SelfDevCandidate {
  const candidate = record(value);
  try {
    assertExactKeys(candidate, CANDIDATE_KEYS, 'SELFDEV_CANDIDATE', CANDIDATE_OPTIONAL_KEYS);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNKNOWN_FIELD')) fail('SCHEMA_UNKNOWN_FIELD', 'SCHEMA');
    if (message.includes('MISSING_FIELD')) fail('SCHEMA_MISSING_FIELD', 'SCHEMA');
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  boundedString(candidate.schemaVersion, 80);
  if (candidate.schemaVersion !== SELFDEV_CANDIDATE_SCHEMA_VERSION) fail('SCHEMA_INVALID', 'SCHEMA');
  if (typeof candidate.candidateId !== 'string' || !CANDIDATE_ID_RE.test(candidate.candidateId)) fail('SCHEMA_INVALID', 'SCHEMA');
  if (candidate.candidateKind !== SELFDEV_CANDIDATE_KIND) fail('SCOPE_INVALID', 'SCOPE');
  if (candidate.generatorClass !== SELFDEV_PROPOSER_CLASS) fail('SCOPE_INVALID', 'SCOPE');
  const baseNightwatchSha = boundedString(candidate.baseNightwatchSha, 40);
  if (!SHA_RE.test(baseNightwatchSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  const fixtureId = safeId(candidate.fixtureId);
  if (candidate.targetSurface !== SELFDEV_TARGET_SURFACE) fail('SCOPE_INVALID', 'SCOPE');
  const title = boundedString(candidate.title, SELFDEV_BUDGET.maxTitleLength);
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._:-]{0,119}$/.test(title)) fail('SCHEMA_INVALID', 'SCHEMA');
  if (/(?:customer|email|account|payer|billing|invoice|cost|cookie|token|secret|password|bearer|aws|gcp|production|database|sql|shell|git|prompt|model|endpoint|https?|path|patch|diff|source\s*code|sentinel)/i.test(title)) {
    fail('CANDIDATE_PRIVACY_BLOCKED', 'PRIVACY');
  }
  assertEnum(candidate.rationaleClass, ['BOUNDARY_REGRESSION', 'STATE_TRANSITION', 'ORACLE_CLASSIFICATION'] as const, 'SELFDEV_RATIONALE');
  const actionIds = stringList(candidate.actionIds, SELFDEV_BUDGET.maxActionsPerCandidate, 'SCHEMA_INVALID');
  if (actionIds.length === 0) fail('SCHEMA_INVALID', 'SCHEMA');
  const assertionIds = stringList(candidate.assertionIds, SELFDEV_BUDGET.maxAssertionsPerCandidate, 'SCHEMA_INVALID');
  if (assertionIds.length === 0) fail('SCHEMA_INVALID', 'SCHEMA');
  const coverageClaims = stringList(candidate.coverageClaims, SELFDEV_BUDGET.maxCoverageClaims, 'SCHEMA_INVALID');
  const sourceRefs = stringList(candidate.sourceRefs, SELFDEV_BUDGET.maxSourceRefs, 'SCHEMA_INVALID');
  if (candidate.createdAt !== undefined) {
    if (typeof candidate.createdAt !== 'string' || !ISO_RE.test(candidate.createdAt)) fail('SCHEMA_INVALID', 'SCHEMA');
    try {
      assertIsoTimestamp(candidate.createdAt, 'SELFDEV_CREATED_AT');
    } catch {
      fail('SCHEMA_INVALID', 'SCHEMA');
    }
  }
  const safety = assertZeroSafetyVector(candidate.safety, 'SAFETY');
  if (candidate.publication !== SELFDEV_PUBLICATION || candidate.adoptionAuthority !== 'NONE') fail('SCOPE_INVALID', 'SCOPE');
  const normalized = { ...candidate, baseNightwatchSha, fixtureId, title, actionIds, assertionIds, coverageClaims, sourceRefs, safety } as SelfDevCandidate;
  if (normalized.candidateId !== candidateIdFor(normalized)) fail('SCHEMA_IDENTITY_MISMATCH', 'SCHEMA');
  return normalized;
}

function validateDigest(value: unknown, code: SelfDevReasonCode): string {
  const digest = boundedString(value, 71, code);
  if (!DIGEST_RE.test(digest)) fail(code, 'SCHEMA');
  return digest;
}

function validateExecution(value: unknown): SelfDevExecutionSummary | null {
  if (value === null) return null;
  const execution = record(value);
  try {
    assertExactKeys(execution, EXECUTION_KEYS, 'SELFDEV_EXECUTION');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  return {
    initialStateId: safeId(execution.initialStateId),
    finalStateId: safeId(execution.finalStateId),
    transitionClass: safeId(execution.transitionClass),
    oracleClass: safeId(execution.oracleClass),
    stableFingerprint: validateDigest(execution.stableFingerprint, 'SCHEMA_INVALID'),
  };
}

function evaluationIdentityFields(evaluation: Omit<SelfDevEvaluation, 'evaluationId'>): Record<string, unknown> {
  return {
    schemaVersion: evaluation.schemaVersion,
    candidateId: evaluation.candidateId,
    candidateDigest: evaluation.candidateDigest,
    baseNightwatchSha: evaluation.baseNightwatchSha,
    candidateKind: evaluation.candidateKind,
    validationStatus: evaluation.validationStatus,
    scopeStatus: evaluation.scopeStatus,
    duplicateStatus: evaluation.duplicateStatus,
    executionStatus: evaluation.executionStatus,
    regressionStatus: evaluation.regressionStatus,
    safetyStatus: evaluation.safetyStatus,
    privacyStatus: evaluation.privacyStatus,
    coverageDelta: evaluation.coverageDelta,
    execution: evaluation.execution,
    reasonCode: evaluation.reasonCode,
    resultClass: evaluation.resultClass,
    adoptionStatus: evaluation.adoptionStatus,
    publication: evaluation.publication,
    sourceWrites: evaluation.sourceWrites,
    gitWrites: evaluation.gitWrites,
    externalCalls: evaluation.externalCalls,
    safetyVector: evaluation.safetyVector,
  };
}

export function evaluationIdFor(evaluation: Omit<SelfDevEvaluation, 'evaluationId'>): string {
  return `evaluation:${sha256Digest(evaluationIdentityFields(evaluation))}`;
}

function assertCoverageShape(coverageDelta: { readonly added: readonly string[]; readonly count: number }): void {
  if (coverageDelta.count !== coverageDelta.added.length) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  for (let index = 1; index < coverageDelta.added.length; index += 1) {
    if (coverageDelta.added[index - 1]! >= coverageDelta.added[index]!) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }
}

function assertExactState(evaluation: SelfDevEvaluation, expected: Partial<SelfDevEvaluation>): void {
  const fields: (keyof SelfDevEvaluation)[] = [
    'validationStatus', 'scopeStatus', 'duplicateStatus', 'executionStatus',
    'regressionStatus', 'safetyStatus', 'privacyStatus', 'reasonCode',
    'resultClass',
  ];
  for (const field of fields) {
    if (field in expected && evaluation[field] !== expected[field]) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }
}

function assertExecutionState(evaluation: SelfDevEvaluation, shouldExist: boolean): void {
  if ((evaluation.execution !== null) !== shouldExist) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
}

/**
 * Canonical deterministic evaluator result-state machine. This deliberately
 * rejects enum-valid cross-products even when a caller recomputes the ID.
 */
export function assertEvaluationStateInvariant(evaluation: SelfDevEvaluation): void {
  assertCoverageShape(evaluation.coverageDelta);
  if (evaluation.adoptionStatus !== SELFDEV_ADOPTION_STATUS || evaluation.publication !== SELFDEV_PUBLICATION) {
    throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }
  if (evaluation.sourceWrites !== 0 || evaluation.gitWrites !== 0 || evaluation.externalCalls !== 0) {
    throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }
  if (Object.values(evaluation.safetyVector).some((value) => value !== 0)) {
    throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }

  switch (evaluation.resultClass) {
    case 'REJECTED_SCHEMA':
      assertExactState(evaluation, {
        validationStatus: 'REJECTED', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'NOT_CHECKED',
        privacyStatus: 'NOT_CHECKED', resultClass: 'REJECTED_SCHEMA',
      });
      if (!['SCHEMA_INVALID', 'SCHEMA_UNKNOWN_FIELD', 'SCHEMA_MISSING_FIELD', 'SCHEMA_IDENTITY_MISMATCH'].includes(evaluation.reasonCode)) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_SCOPE':
      if (!['SCOPE_INVALID', 'SCOPE_FIXTURE_UNKNOWN', 'SCOPE_SOURCE_REF_UNKNOWN', 'SCOPE_COVERAGE_CLAIM_UNKNOWN'].includes(evaluation.reasonCode)) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExactState(evaluation, {
        validationStatus: 'PASS', scopeStatus: 'REJECTED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN',
        safetyStatus: evaluation.reasonCode === 'SCOPE_INVALID' ? 'NOT_CHECKED' : 'PASS',
        privacyStatus: evaluation.reasonCode === 'SCOPE_INVALID' ? 'NOT_CHECKED' : 'PASS',
        resultClass: 'REJECTED_SCOPE',
      });
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_UNKNOWN_ACTION':
      assertExactState(evaluation, {
        validationStatus: 'PASS', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'PASS',
        privacyStatus: 'PASS', reasonCode: 'UNKNOWN_ACTION', resultClass: 'REJECTED_UNKNOWN_ACTION',
      });
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_UNKNOWN_ASSERTION':
      assertExactState(evaluation, {
        validationStatus: 'PASS', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'PASS',
        privacyStatus: 'PASS', reasonCode: 'UNKNOWN_ASSERTION', resultClass: 'REJECTED_UNKNOWN_ASSERTION',
      });
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_SAFETY':
      assertExactState(evaluation, {
        validationStatus: 'REJECTED', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'FAIL',
        privacyStatus: 'PASS', reasonCode: 'CANDIDATE_SAFETY_VECTOR_NONZERO', resultClass: 'REJECTED_SAFETY',
      });
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_PRIVACY':
      assertExactState(evaluation, {
        validationStatus: 'REJECTED', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
        executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'PASS',
        privacyStatus: 'FAIL', reasonCode: 'CANDIDATE_PRIVACY_BLOCKED', resultClass: 'REJECTED_PRIVACY',
      });
      if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, false);
      return;
    case 'REJECTED_DUPLICATE':
      if (evaluation.validationStatus !== 'PASS' || evaluation.scopeStatus !== 'IN_SCOPE' || evaluation.safetyStatus !== 'PASS' || evaluation.privacyStatus !== 'PASS') throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      if (evaluation.reasonCode === 'DUPLICATE_SEMANTIC_IDENTITY'
        || (evaluation.reasonCode === 'DUPLICATE_COVERAGE' && evaluation.executionStatus === 'NOT_STARTED')) {
        assertExactState(evaluation, { duplicateStatus: 'DUPLICATE', executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN' });
        if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
        assertExecutionState(evaluation, false);
        return;
      }
      if (evaluation.reasonCode === 'DUPLICATE_COVERAGE') {
        if (evaluation.duplicateStatus !== 'DUPLICATE' || evaluation.executionStatus !== 'EXECUTED' || evaluation.regressionStatus !== 'PASS' || evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
        assertExecutionState(evaluation, true);
        return;
      }
      throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
    case 'EVALUATION_FAILED':
      if (evaluation.reasonCode === 'SESSION_EVALUATION_BUDGET_EXCEEDED') {
        assertExactState(evaluation, {
          validationStatus: 'PASS', scopeStatus: 'NOT_CHECKED', duplicateStatus: 'NOT_CHECKED',
          executionStatus: 'NOT_STARTED', regressionStatus: 'NOT_RUN', safetyStatus: 'NOT_CHECKED',
          privacyStatus: 'NOT_CHECKED', resultClass: 'EVALUATION_FAILED',
        });
        if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
        assertExecutionState(evaluation, false);
        return;
      }
      if (evaluation.reasonCode === 'FIXTURE_TRANSITION_INVALID') {
        assertExactState(evaluation, {
          validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
          executionStatus: 'EXECUTED', regressionStatus: 'FAIL', safetyStatus: 'PASS',
          privacyStatus: 'PASS', resultClass: 'EVALUATION_FAILED',
        });
        if (evaluation.coverageDelta.count !== 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
        assertExecutionState(evaluation, false);
        return;
      }
      if (evaluation.reasonCode === 'ASSERTION_FAILED' || evaluation.reasonCode === 'CANDIDATE_EVALUATION_BUDGET_EXCEEDED') {
        assertExactState(evaluation, {
          validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
          executionStatus: 'EXECUTED', regressionStatus: 'FAIL', safetyStatus: 'PASS',
          privacyStatus: 'PASS', resultClass: 'EVALUATION_FAILED',
        });
        if (evaluation.coverageDelta.count === 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
        assertExecutionState(evaluation, true);
        return;
      }
      throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
    case 'EVALUATED_PASS_NOT_ADOPTED':
      assertExactState(evaluation, {
        validationStatus: 'PASS', scopeStatus: 'IN_SCOPE', duplicateStatus: 'UNIQUE',
        executionStatus: 'EXECUTED', regressionStatus: 'PASS', safetyStatus: 'PASS',
        privacyStatus: 'PASS', reasonCode: 'VALIDATION_OK', resultClass: 'EVALUATED_PASS_NOT_ADOPTED',
      });
      if (evaluation.coverageDelta.count <= 0) throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
      assertExecutionState(evaluation, true);
      return;
    default:
      throw new SelfDevIntegrityError('EVALUATION_STATE_INVALID');
  }
}

export function validateEvaluation(value: unknown): SelfDevEvaluation {
  const evaluation = record(value);
  try {
    assertExactKeys(evaluation, EVALUATION_KEYS, 'SELFDEV_EVALUATION');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (evaluation.schemaVersion !== SELFDEV_EVALUATION_SCHEMA_VERSION) fail('SCHEMA_INVALID', 'SCHEMA');
  if (typeof evaluation.evaluationId !== 'string' || !EVALUATION_ID_RE.test(evaluation.evaluationId)) fail('SCHEMA_INVALID', 'SCHEMA');
  if (typeof evaluation.candidateId !== 'string' || !CANDIDATE_ID_RE.test(evaluation.candidateId)) fail('SCHEMA_INVALID', 'SCHEMA');
  const candidateDigest = validateDigest(evaluation.candidateDigest, 'SCHEMA_INVALID');
  if (candidateDigest !== `sha256:${evaluation.candidateId.slice('candidate:'.length)}`) throw new SelfDevIntegrityError('CANDIDATE_BINDING_MISMATCH');
  const baseNightwatchSha = boundedString(evaluation.baseNightwatchSha, 40);
  if (!SHA_RE.test(baseNightwatchSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  if (evaluation.candidateKind !== SELFDEV_CANDIDATE_KIND) fail('SCHEMA_INVALID', 'SCHEMA');
  assertEnum(evaluation.validationStatus, ['PASS', 'REJECTED'] as const, 'SELFDEV_VALIDATION_STATUS');
  assertEnum(evaluation.scopeStatus, ['IN_SCOPE', 'REJECTED', 'NOT_CHECKED'] as const, 'SELFDEV_SCOPE_STATUS');
  assertEnum(evaluation.duplicateStatus, ['UNIQUE', 'DUPLICATE', 'NOT_CHECKED'] as const, 'SELFDEV_DUPLICATE_STATUS');
  assertEnum(evaluation.executionStatus, ['EXECUTED', 'NOT_STARTED', 'SKIPPED'] as const, 'SELFDEV_EXECUTION_STATUS');
  assertEnum(evaluation.regressionStatus, ['PASS', 'FAIL', 'NOT_RUN'] as const, 'SELFDEV_REGRESSION_STATUS');
  assertEnum(evaluation.safetyStatus, ['PASS', 'FAIL', 'NOT_CHECKED'] as const, 'SELFDEV_SAFETY_STATUS');
  assertEnum(evaluation.privacyStatus, ['PASS', 'FAIL', 'NOT_CHECKED'] as const, 'SELFDEV_PRIVACY_STATUS');
  const coverage = record(evaluation.coverageDelta);
  try {
    assertExactKeys(coverage, COVERAGE_KEYS, 'SELFDEV_COVERAGE');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  const added = stringList(coverage.added, SELFDEV_BUDGET.maxCoverageClaims, 'SCHEMA_INVALID');
  try {
    assertNonNegativeInteger(coverage.count, 'SELFDEV_COVERAGE_COUNT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (coverage.count !== added.length) fail('SCHEMA_INVALID', 'SCHEMA');
  const execution = validateExecution(evaluation.execution);
  assertEnum(evaluation.reasonCode, [
    'VALIDATION_OK', 'SCHEMA_INVALID', 'SCHEMA_UNKNOWN_FIELD', 'SCHEMA_MISSING_FIELD',
    'SCHEMA_IDENTITY_MISMATCH', 'SCOPE_INVALID', 'SCOPE_FIXTURE_UNKNOWN',
    'SCOPE_SOURCE_REF_UNKNOWN', 'SCOPE_COVERAGE_CLAIM_UNKNOWN', 'UNKNOWN_ACTION',
    'UNKNOWN_ASSERTION', 'DUPLICATE_SEMANTIC_IDENTITY', 'DUPLICATE_COVERAGE',
    'CANDIDATE_SAFETY_VECTOR_NONZERO', 'CANDIDATE_PRIVACY_BLOCKED',
    'CANDIDATE_EVALUATION_BUDGET_EXCEEDED', 'SESSION_EVALUATION_BUDGET_EXCEEDED',
    'FIXTURE_TRANSITION_INVALID', 'ASSERTION_FAILED', 'PRIVATE_ARTIFACT_CONFLICT',
  ] as const, 'SELFDEV_REASON_CODE');
  assertEnum(evaluation.resultClass, [
    'REJECTED_SCHEMA', 'REJECTED_SCOPE', 'REJECTED_UNKNOWN_ACTION',
    'REJECTED_UNKNOWN_ASSERTION', 'REJECTED_DUPLICATE', 'REJECTED_SAFETY',
    'REJECTED_PRIVACY', 'EVALUATION_FAILED', 'EVALUATED_PASS_NOT_ADOPTED',
  ] as const, 'SELFDEV_RESULT_CLASS');
  if (evaluation.adoptionStatus !== SELFDEV_ADOPTION_STATUS || evaluation.publication !== SELFDEV_PUBLICATION) fail('SCOPE_INVALID', 'SCOPE');
  for (const key of ['sourceWrites', 'gitWrites', 'externalCalls'] as const) {
    try {
      assertNonNegativeInteger(evaluation[key], `SELFDEV_${key}`);
    } catch {
      fail('SCHEMA_INVALID', 'SCHEMA');
    }
    if (evaluation[key] !== 0) fail('CANDIDATE_SAFETY_VECTOR_NONZERO', 'SAFETY');
  }
  const safetyVector = assertZeroSafetyVector(evaluation.safetyVector, 'SAFETY');
  const normalized = {
    ...evaluation,
    candidateDigest,
    baseNightwatchSha,
    coverageDelta: { added, count: added.length },
    execution,
    safetyVector,
  } as SelfDevEvaluation;
  if (normalized.evaluationId !== evaluationIdFor(normalized)) fail('SCHEMA_IDENTITY_MISMATCH', 'SCHEMA');
  assertEvaluationStateInvariant(normalized);
  return normalized;
}

function validateProvenance(value: unknown): SelfDevProvenance {
  const provenance = record(value);
  try {
    assertExactKeys(provenance, PROVENANCE_KEYS, 'SELFDEV_PROVENANCE');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  const gitHeadSha = boundedString(provenance.gitHeadSha, 40);
  if (!SHA_RE.test(gitHeadSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  const sourceBundleDigest = validateDigest(provenance.sourceBundleDigest, 'SCHEMA_INVALID');
  const contractDigest = validateDigest(provenance.contractDigest, 'SCHEMA_INVALID');
  if (provenance.schemaVersion !== SELFDEV_PROVENANCE_SCHEMA_VERSION || provenance.algorithmVersion !== SELFDEV_REPLAY_ALGORITHM_VERSION) fail('SCHEMA_INVALID', 'SCHEMA');
  if (provenance.authoritativeSourceState !== 'CLEAN') fail('SCHEMA_INVALID', 'SCHEMA');
  const runtimeNodeVersion = boundedString(provenance.runtimeNodeVersion, 40);
  if (!NODE_VERSION_RE.test(runtimeNodeVersion)) fail('SCHEMA_INVALID', 'SCHEMA');
  assertEnum(provenance.provenanceClass, ['LOCAL_GIT_SOURCE_ATTESTED', 'SYNTHETIC_TEST_ONLY'] as const, 'SELFDEV_PROVENANCE_CLASS');
  return { ...provenance, gitHeadSha, sourceBundleDigest, contractDigest, runtimeNodeVersion } as SelfDevProvenance;
}

function validateReplayDescriptor(value: unknown): SelfDevReplayDescriptor {
  const descriptor = record(value);
  try {
    assertExactKeys(descriptor, REPLAY_KEYS, 'SELFDEV_REPLAY_DESCRIPTOR');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (descriptor.schemaVersion !== SELFDEV_REPLAY_DESCRIPTOR_SCHEMA_VERSION || descriptor.proposerClass !== SELFDEV_PROPOSER_CLASS) fail('SCHEMA_INVALID', 'SCHEMA');
  assertEnum(descriptor.fixture, SELFDEV_SYNTHETIC_FIXTURES, 'SELFDEV_REPLAY_FIXTURE');
  try {
    assertNonNegativeInteger(descriptor.seed, 'SELFDEV_REPLAY_SEED');
    assertNonNegativeInteger(descriptor.expectedProposalCount, 'SELFDEV_REPLAY_COUNT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (descriptor.seed > 999 || descriptor.expectedProposalCount > SELFDEV_BUDGET.maxCandidatesPerSession) fail('SCHEMA_INVALID', 'SCHEMA');
  const baseNightwatchSha = boundedString(descriptor.baseNightwatchSha, 40);
  if (!SHA_RE.test(baseNightwatchSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  return { ...descriptor, baseNightwatchSha } as SelfDevReplayDescriptor;
}

function sessionIdentityFields(input: SelfDevSessionArtifact | Omit<SelfDevSessionArtifact, 'artifactId'>): Record<string, unknown> {
  const { artifactId: _artifactId, ...identity } = input as SelfDevSessionArtifact;
  return identity;
}

export function sessionArtifactIdFor(input: SelfDevSessionArtifact | Omit<SelfDevSessionArtifact, 'artifactId'>): string {
  return `session:${sha256Digest(sessionIdentityFields(input))}`;
}

function validateLegacyEvaluation(value: unknown): Record<string, unknown> {
  const evaluation = record(value);
  if (evaluation.schemaVersion !== SELFDEV_LEGACY_EVALUATION_SCHEMA_VERSION) throw new Error('SELFDEV_LEGACY_EVALUATION_SCHEMA_INVALID');
  if (typeof evaluation.evaluationId !== 'string' || !EVALUATION_ID_RE.test(evaluation.evaluationId)) throw new Error('SELFDEV_LEGACY_EVALUATION_ID_INVALID');
  return { ...evaluation };
}

export function validateLegacySessionArtifact(value: unknown): SelfDevLegacySessionArtifact {
  const artifact = record(value);
  try {
    assertExactKeys(artifact, ARTIFACT_V1_KEYS, 'SELFDEV_LEGACY_SESSION_ARTIFACT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (artifact.schemaVersion !== SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION) fail('SCHEMA_INVALID', 'SCHEMA');
  if (typeof artifact.artifactId !== 'string' || !ARTIFACT_ID_RE.test(artifact.artifactId)) fail('SCHEMA_INVALID', 'SCHEMA');
  const baseNightwatchSha = boundedString(artifact.baseNightwatchSha, 40);
  if (!SHA_RE.test(baseNightwatchSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  if (artifact.proposerClass !== SELFDEV_PROPOSER_CLASS) fail('SCOPE_INVALID', 'SCOPE');
  try {
    assertNonNegativeInteger(artifact.candidateCount, 'SELFDEV_LEGACY_CANDIDATE_COUNT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (artifact.candidateCount > SELFDEV_BUDGET.maxCandidatesPerSession) fail('SCHEMA_INVALID', 'SCHEMA');
  const evaluations = requireRuntimeArray(artifact.evaluations, 'SELFDEV_LEGACY_EVALUATIONS').map(validateLegacyEvaluation);
  if (evaluations.length !== artifact.candidateCount) fail('SCHEMA_INVALID', 'SCHEMA');
  if (artifact.adoptionStatus !== SELFDEV_ADOPTION_STATUS || artifact.publication !== SELFDEV_PUBLICATION) fail('SCOPE_INVALID', 'SCOPE');
  for (const key of ['sourceWrites', 'gitWrites', 'externalCalls'] as const) {
    if (artifact[key] !== 0) fail('CANDIDATE_SAFETY_VECTOR_NONZERO', 'SAFETY');
  }
  const safetyVector = assertZeroSafetyVector(artifact.safetyVector, 'SAFETY');
  return { ...artifact, baseNightwatchSha, evaluations, safetyVector } as unknown as SelfDevLegacySessionArtifact;
}

export function validateSessionArtifact(value: unknown): SelfDevSessionArtifact | SelfDevLegacySessionArtifact {
  const artifact = record(value);
  if (artifact.schemaVersion === SELFDEV_LEGACY_SESSION_ARTIFACT_SCHEMA_VERSION) return validateLegacySessionArtifact(artifact);
  try {
    assertExactKeys(artifact, ARTIFACT_V2_KEYS, 'SELFDEV_SESSION_ARTIFACT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (artifact.schemaVersion !== SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION) fail('SCHEMA_INVALID', 'SCHEMA');
  if (typeof artifact.artifactId !== 'string' || !ARTIFACT_ID_RE.test(artifact.artifactId)) fail('SCHEMA_INVALID', 'SCHEMA');
  try {
    if (artifact.artifactId !== sessionArtifactIdFor(artifact as unknown as SelfDevSessionArtifact)) {
      throw new SelfDevIntegrityError('SESSION_IDENTITY_MISMATCH');
    }
  } catch (error) {
    if (error instanceof SelfDevIntegrityError) throw error;
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  const baseNightwatchSha = boundedString(artifact.baseNightwatchSha, 40);
  if (!SHA_RE.test(baseNightwatchSha)) fail('SCHEMA_INVALID', 'SCHEMA');
  const provenance = validateProvenance(artifact.provenance);
  const replayDescriptor = validateReplayDescriptor(artifact.replayDescriptor);
  if (provenance.gitHeadSha !== baseNightwatchSha || replayDescriptor.baseNightwatchSha !== baseNightwatchSha) throw new SelfDevIntegrityError('BASELINE_MISMATCH');
  if (artifact.proposerClass !== SELFDEV_PROPOSER_CLASS) fail('SCOPE_INVALID', 'SCOPE');
  try {
    assertNonNegativeInteger(artifact.candidateCount, 'SELFDEV_ARTIFACT_CANDIDATE_COUNT');
  } catch {
    fail('SCHEMA_INVALID', 'SCHEMA');
  }
  if (artifact.candidateCount > SELFDEV_BUDGET.maxCandidatesPerSession) fail('SCHEMA_INVALID', 'SCHEMA');
  const evaluations = requireRuntimeArray(artifact.evaluations, 'SELFDEV_ARTIFACT_EVALUATIONS').map(validateEvaluation);
  if (evaluations.length !== artifact.candidateCount) fail('SCHEMA_INVALID', 'SCHEMA');
  for (const evaluation of evaluations) {
    if (evaluation.baseNightwatchSha !== baseNightwatchSha) throw new SelfDevIntegrityError('BASELINE_MISMATCH');
  }
  if (artifact.adoptionStatus !== SELFDEV_ADOPTION_STATUS || artifact.publication !== SELFDEV_PUBLICATION) fail('SCOPE_INVALID', 'SCOPE');
  for (const key of ['sourceWrites', 'gitWrites', 'externalCalls'] as const) {
    try {
      assertNonNegativeInteger(artifact[key], `SELFDEV_ARTIFACT_${key}`);
    } catch {
      fail('SCHEMA_INVALID', 'SCHEMA');
    }
    if (artifact[key] !== 0) fail('CANDIDATE_SAFETY_VECTOR_NONZERO', 'SAFETY');
  }
  const safetyVector = assertZeroSafetyVector(artifact.safetyVector, 'SAFETY');
  const normalized = {
    ...artifact,
    baseNightwatchSha,
    provenance,
    replayDescriptor,
    evaluations,
    safetyVector,
  } as unknown as SelfDevSessionArtifact;
  if (normalized.artifactId !== sessionArtifactIdFor(normalized)) throw new SelfDevIntegrityError('SESSION_IDENTITY_MISMATCH');
  return normalized;
}

export function isV2SessionArtifact(value: unknown): value is SelfDevSessionArtifact {
  return isRuntimeRecord(value) && value.schemaVersion === SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION;
}

export function resultClassForValidation(error: SelfDevValidationError): SelfDevResultClass {
  if (error.category === 'SAFETY') return 'REJECTED_SAFETY';
  if (error.category === 'PRIVACY') return 'REJECTED_PRIVACY';
  if (error.category === 'SCOPE') return 'REJECTED_SCOPE';
  return 'REJECTED_SCHEMA';
}

export function isSelfDevValidationError(error: unknown): error is SelfDevValidationError {
  return error instanceof SelfDevValidationError;
}

export function isRuntimeSafeForSelfDev(value: unknown): boolean {
  try {
    validateCandidate(value);
    return true;
  } catch {
    return false;
  }
}

export function classifyStoredArtifact(value: unknown): SelfDevStoredArtifact {
  if (isV2SessionArtifact(value)) return { kind: 'V2', artifact: validateSessionArtifact(value) as SelfDevSessionArtifact };
  return { kind: 'LEGACY_V1', artifact: validateLegacySessionArtifact(value) };
}
