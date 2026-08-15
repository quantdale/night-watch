// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — strict exact-key validation for plan/result records.
// ---------------------------------------------------------------------------

import { sha256Digest } from '../selfDev/canonical';
import { SELFDEV_ADOPTION_STRATEGY_CLASS, validateAdoptedCase } from '../selfDev/adoptedCases';
import {
  SELFDEV_ADOPTION_PLAN_SCHEMA_VERSION,
  SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION,
  type SelfDevAdoptionPlan,
  type SelfDevAdoptionSandboxResult,
  type SelfDevSandboxFailureClass,
  type SelfDevSandboxProbeResult,
} from './types';

export class SelfDevSandboxValidationError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_SANDBOX_${code}`);
    this.name = 'SelfDevSandboxValidationError';
  }
}

function fail(code: string): never {
  throw new SelfDevSandboxValidationError(code);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('RECORD_INVALID');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail('RECORD_INVALID');
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], code: string): void {
  const accepted = new Set(keys);
  for (const key of Object.keys(value)) if (!accepted.has(key)) fail(`${code}_UNKNOWN_FIELD`);
  for (const key of keys) if (!(key in value)) fail(`${code}_MISSING_FIELD`);
}

const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const CANDIDATE_ID_RE = /^candidate:[0-9a-f]{64}$/;
const EVALUATION_ID_RE = /^evaluation:sha256:[0-9a-f]{64}$/;
const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;
const PLAN_ID_RE = /^adoption-plan:sha256:[0-9a-f]{64}$/;
const RESULT_ID_RE = /^adoption-sandbox-result:sha256:[0-9a-f]{64}$/;

function digest(value: unknown): string {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) fail('DIGEST_INVALID');
  return value;
}

function nullableDigest(value: unknown): string | null {
  if (value === null) return null;
  return digest(value);
}

const PLAN_KEYS = [
  'schemaVersion', 'planId', 'strategyClass', 'sourceSessionArtifactId',
  'candidateId', 'candidateDigest', 'evaluationId', 'plannedAgainstHeadSha',
  'sourceBundleDigestBefore', 'contractDigestBefore', 'targetPath',
  'targetPreimageDigest', 'adoptedCase', 'targetPostimageDigest',
  'expectedChangedFiles', 'sandboxAuthority', 'canonicalApply', 'publication',
  'canonicalSourceWrites', 'runtimeGitWrites', 'externalCalls',
] as const;

function planIdentityFields(plan: Omit<SelfDevAdoptionPlan, 'planId'>): Record<string, unknown> {
  return {
    schemaVersion: plan.schemaVersion,
    strategyClass: plan.strategyClass,
    sourceSessionArtifactId: plan.sourceSessionArtifactId,
    candidateId: plan.candidateId,
    candidateDigest: plan.candidateDigest,
    evaluationId: plan.evaluationId,
    plannedAgainstHeadSha: plan.plannedAgainstHeadSha,
    sourceBundleDigestBefore: plan.sourceBundleDigestBefore,
    contractDigestBefore: plan.contractDigestBefore,
    targetPath: plan.targetPath,
    targetPreimageDigest: plan.targetPreimageDigest,
    adoptedCase: plan.adoptedCase,
    targetPostimageDigest: plan.targetPostimageDigest,
    expectedChangedFiles: [...plan.expectedChangedFiles],
    sandboxAuthority: plan.sandboxAuthority,
    canonicalApply: plan.canonicalApply,
    publication: plan.publication,
    canonicalSourceWrites: plan.canonicalSourceWrites,
    runtimeGitWrites: plan.runtimeGitWrites,
    externalCalls: plan.externalCalls,
  };
}

export function planIdFor(plan: Omit<SelfDevAdoptionPlan, 'planId'>): string {
  return `adoption-plan:${sha256Digest(planIdentityFields(plan))}`;
}

export function validateAdoptionPlan(value: unknown): SelfDevAdoptionPlan {
  const plan = record(value);
  assertExactKeys(plan, PLAN_KEYS, 'PLAN');
  if (plan.schemaVersion !== SELFDEV_ADOPTION_PLAN_SCHEMA_VERSION) fail('PLAN_SCHEMA_INVALID');
  // Strict strategy binding (Phase 8B.0.1): exactly the one production
  // adoption strategy class is accepted. A syntactically correct hash does
  // not confer semantic validity — an unknown strategy fails here before any
  // identity check, even with a recomputed planId.
  if (plan.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('PLAN_STRATEGY_INVALID');
  if (typeof plan.sourceSessionArtifactId !== 'string' || !ARTIFACT_ID_RE.test(plan.sourceSessionArtifactId)) fail('PLAN_ARTIFACT_ID_INVALID');
  if (typeof plan.candidateId !== 'string' || !CANDIDATE_ID_RE.test(plan.candidateId)) fail('PLAN_CANDIDATE_ID_INVALID');
  const candidateDigest = digest(plan.candidateDigest);
  if (candidateDigest !== `sha256:${(plan.candidateId as string).slice('candidate:'.length)}`) fail('PLAN_CANDIDATE_BINDING_MISMATCH');
  if (typeof plan.evaluationId !== 'string' || !EVALUATION_ID_RE.test(plan.evaluationId)) fail('PLAN_EVALUATION_ID_INVALID');
  if (typeof plan.plannedAgainstHeadSha !== 'string' || !SHA_RE.test(plan.plannedAgainstHeadSha)) fail('PLAN_HEAD_SHA_INVALID');
  const sourceBundleDigestBefore = digest(plan.sourceBundleDigestBefore);
  const contractDigestBefore = digest(plan.contractDigestBefore);
  if (plan.targetPath !== 'src/core/selfDev/adoptedCaseCatalog.generated.ts') fail('PLAN_TARGET_PATH_INVALID');
  const targetPreimageDigest = digest(plan.targetPreimageDigest);
  const adoptedCase = validateAdoptedCase(plan.adoptedCase);
  // Explicit plan/adopted-case strategy cross-binding (Phase 8B.0.1).
  if (plan.strategyClass !== adoptedCase.strategyClass) fail('PLAN_STRATEGY_MISMATCH');
  const targetPostimageDigest = digest(plan.targetPostimageDigest);
  if (targetPreimageDigest === targetPostimageDigest) fail('PLAN_NO_ACTUAL_CHANGE');
  if (!Array.isArray(plan.expectedChangedFiles) || plan.expectedChangedFiles.length !== 1 || plan.expectedChangedFiles[0] !== plan.targetPath) {
    fail('PLAN_CHANGED_FILES_INVALID');
  }
  if (plan.sandboxAuthority !== 'SANDBOX_ONLY') fail('PLAN_SANDBOX_AUTHORITY_INVALID');
  if (plan.canonicalApply !== 'PROHIBITED') fail('PLAN_CANONICAL_APPLY_INVALID');
  if (plan.publication !== 'PROHIBITED') fail('PLAN_PUBLICATION_INVALID');
  if (plan.canonicalSourceWrites !== 0 || plan.runtimeGitWrites !== 0 || plan.externalCalls !== 0) fail('PLAN_AUTHORITY_COUNTERS_NONZERO');
  const normalized = {
    ...plan,
    candidateDigest,
    sourceBundleDigestBefore,
    contractDigestBefore,
    targetPreimageDigest,
    adoptedCase,
    targetPostimageDigest,
    expectedChangedFiles: [plan.targetPath as string],
    canonicalSourceWrites: 0 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  } as unknown as SelfDevAdoptionPlan;
  if (typeof plan.planId !== 'string' || !PLAN_ID_RE.test(plan.planId)) fail('PLAN_ID_INVALID');
  if (plan.planId !== planIdFor(normalized)) fail('PLAN_ID_MISMATCH');
  return normalized;
}

const RESULT_KEYS = [
  'schemaVersion', 'resultId', 'planId', 'strategyClass', 'sourceSessionArtifactId',
  'candidateId', 'candidateDigest', 'preSourceBundleDigest', 'postSourceBundleDigest',
  'preContractDigest', 'postContractDigest', 'changedFiles', 'targetPath',
  'targetPreimageDigest', 'targetPostimageDigest', 'preAdoptionResult',
  'postEquivalentResult', 'postVariantCoverageResult', 'nonOverreachResult',
  'unsafeRegressionResult', 'sandboxVerificationStatus', 'failureClass',
  'cleanupStatus', 'sandboxSourceWrites', 'canonicalSourceWrites',
  'runtimeGitWrites', 'externalCalls', 'adoptionStatus', 'canonicalApply',
  'publication',
] as const;

const PROBE_RESULTS: readonly SelfDevSandboxProbeResult[] = ['PASS', 'FAIL', 'NOT_RUN'];
const FAILURE_CLASSES: readonly SelfDevSandboxFailureClass[] = [
  'NONE', 'PLAN_STALE', 'CANDIDATE_NOT_ELIGIBLE', 'CATALOG_NONCANONICAL',
  'ALREADY_ADOPTED', 'CATALOG_FULL', 'SANDBOX_COPY_MISMATCH', 'SANDBOX_WRITE_FAILED',
  'POSTIMAGE_DIGEST_MISMATCH', 'UNEXPECTED_CHANGED_FILE', 'SANDBOX_MODULE_LOAD_FAILED',
  'SANDBOX_CONTRACT_NOT_CHANGED', 'POST_ADOPTION_STILL_PASS', 'NON_OVERREACH_PROBE_UNAVAILABLE',
  'NON_OVERREACH_REGRESSION', 'CLEANUP_FAILED',
];

function assertProbeResult(value: unknown): asserts value is SelfDevSandboxProbeResult {
  if (typeof value !== 'string' || !PROBE_RESULTS.includes(value as SelfDevSandboxProbeResult)) fail('RESULT_PROBE_INVALID');
}

function resultIdentityFields(result: Omit<SelfDevAdoptionSandboxResult, 'resultId'>): Record<string, unknown> {
  return {
    schemaVersion: result.schemaVersion,
    planId: result.planId,
    strategyClass: result.strategyClass,
    sourceSessionArtifactId: result.sourceSessionArtifactId,
    candidateId: result.candidateId,
    candidateDigest: result.candidateDigest,
    preSourceBundleDigest: result.preSourceBundleDigest,
    postSourceBundleDigest: result.postSourceBundleDigest,
    preContractDigest: result.preContractDigest,
    postContractDigest: result.postContractDigest,
    changedFiles: [...result.changedFiles],
    targetPath: result.targetPath,
    targetPreimageDigest: result.targetPreimageDigest,
    targetPostimageDigest: result.targetPostimageDigest,
    preAdoptionResult: result.preAdoptionResult,
    postEquivalentResult: result.postEquivalentResult,
    postVariantCoverageResult: result.postVariantCoverageResult,
    nonOverreachResult: result.nonOverreachResult,
    unsafeRegressionResult: result.unsafeRegressionResult,
    sandboxVerificationStatus: result.sandboxVerificationStatus,
    failureClass: result.failureClass,
    cleanupStatus: result.cleanupStatus,
    sandboxSourceWrites: result.sandboxSourceWrites,
    canonicalSourceWrites: result.canonicalSourceWrites,
    runtimeGitWrites: result.runtimeGitWrites,
    externalCalls: result.externalCalls,
    adoptionStatus: result.adoptionStatus,
    canonicalApply: result.canonicalApply,
    publication: result.publication,
  };
}

export function resultIdFor(result: Omit<SelfDevAdoptionSandboxResult, 'resultId'>): string {
  return `adoption-sandbox-result:${sha256Digest(resultIdentityFields(result))}`;
}

/**
 * Validate a sandbox result. This is a semantic invariant gate, not merely a
 * shape check: a recomputed resultId cannot make an impossible tuple (e.g.
 * SANDBOX_VERIFIED with nonzero canonical writes, or pre==post digests)
 * valid — see the goal's "result forgery" adversarial requirement.
 */
export function validateAdoptionSandboxResult(value: unknown): SelfDevAdoptionSandboxResult {
  const result = record(value);
  assertExactKeys(result, RESULT_KEYS, 'RESULT');
  if (result.schemaVersion !== SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION) fail('RESULT_SCHEMA_INVALID');
  if (typeof result.planId !== 'string' || !PLAN_ID_RE.test(result.planId)) fail('RESULT_PLAN_ID_INVALID');
  // Strict strategy binding (Phase 8B.0.1): exactly the one production
  // adoption strategy class is accepted; a recomputed resultId cannot
  // legalize an unknown strategy.
  if (result.strategyClass !== SELFDEV_ADOPTION_STRATEGY_CLASS) fail('RESULT_STRATEGY_INVALID');
  if (typeof result.sourceSessionArtifactId !== 'string' || !ARTIFACT_ID_RE.test(result.sourceSessionArtifactId)) fail('RESULT_ARTIFACT_ID_INVALID');
  if (typeof result.candidateId !== 'string' || !CANDIDATE_ID_RE.test(result.candidateId)) fail('RESULT_CANDIDATE_ID_INVALID');
  const candidateDigest = digest(result.candidateDigest);
  if (candidateDigest !== `sha256:${(result.candidateId as string).slice('candidate:'.length)}`) fail('RESULT_CANDIDATE_BINDING_MISMATCH');
  const preSourceBundleDigest = nullableDigest(result.preSourceBundleDigest);
  const postSourceBundleDigest = nullableDigest(result.postSourceBundleDigest);
  const preContractDigest = nullableDigest(result.preContractDigest);
  const postContractDigest = nullableDigest(result.postContractDigest);
  if (!Array.isArray(result.changedFiles) || result.changedFiles.some((item) => typeof item !== 'string')) fail('RESULT_CHANGED_FILES_INVALID');
  if (result.targetPath !== 'src/core/selfDev/adoptedCaseCatalog.generated.ts') fail('RESULT_TARGET_PATH_INVALID');
  const targetPreimageDigest = nullableDigest(result.targetPreimageDigest);
  const targetPostimageDigest = nullableDigest(result.targetPostimageDigest);
  assertProbeResult(result.preAdoptionResult);
  assertProbeResult(result.postEquivalentResult);
  assertProbeResult(result.postVariantCoverageResult);
  assertProbeResult(result.nonOverreachResult);
  assertProbeResult(result.unsafeRegressionResult);
  if (result.sandboxVerificationStatus !== 'PASS' && result.sandboxVerificationStatus !== 'FAIL') fail('RESULT_VERIFICATION_STATUS_INVALID');
  if (typeof result.failureClass !== 'string' || !FAILURE_CLASSES.includes(result.failureClass as SelfDevSandboxFailureClass)) fail('RESULT_FAILURE_CLASS_INVALID');
  if (result.cleanupStatus !== 'PASS' && result.cleanupStatus !== 'FAIL') fail('RESULT_CLEANUP_STATUS_INVALID');
  if (typeof result.sandboxSourceWrites !== 'number' || !Number.isInteger(result.sandboxSourceWrites) || result.sandboxSourceWrites < 0 || result.sandboxSourceWrites > 1) fail('RESULT_SANDBOX_WRITES_INVALID');
  if (result.canonicalSourceWrites !== 0 || result.runtimeGitWrites !== 0 || result.externalCalls !== 0) fail('RESULT_AUTHORITY_COUNTERS_NONZERO');
  if (result.canonicalApply !== 'PROHIBITED') fail('RESULT_CANONICAL_APPLY_INVALID');
  if (result.publication !== 'PROHIBITED') fail('RESULT_PUBLICATION_INVALID');
  if (result.adoptionStatus !== 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED' && result.adoptionStatus !== 'SANDBOX_ADOPTION_FAILED') fail('RESULT_ADOPTION_STATUS_INVALID');

  // Semantic invariants for a claimed full pass — fail closed on any
  // impossible combination even if every individual field looks well-typed.
  if (result.adoptionStatus === 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED') {
    if (result.sandboxVerificationStatus !== 'PASS') fail('RESULT_VERIFIED_INVARIANT');
    if (result.failureClass !== 'NONE') fail('RESULT_VERIFIED_INVARIANT');
    if (result.changedFiles.length !== 1 || result.changedFiles[0] !== result.targetPath) fail('RESULT_VERIFIED_INVARIANT');
    if (result.sandboxSourceWrites !== 1) fail('RESULT_VERIFIED_INVARIANT');
    if (preSourceBundleDigest === null || postSourceBundleDigest === null || preSourceBundleDigest === postSourceBundleDigest) fail('RESULT_VERIFIED_INVARIANT');
    if (preContractDigest === null || postContractDigest === null || preContractDigest === postContractDigest) fail('RESULT_VERIFIED_INVARIANT');
    if (targetPreimageDigest === null || targetPostimageDigest === null || targetPreimageDigest === targetPostimageDigest) fail('RESULT_VERIFIED_INVARIANT');
    // A verified result means ALL FIVE metamorphic proofs ran and passed
    // (Phase 8B.0.1). NOT_RUN or FAIL on any proof is impossible for a
    // claimed verified result; a recomputed resultId cannot override this.
    if (result.preAdoptionResult !== 'PASS' || result.postEquivalentResult !== 'PASS' || result.postVariantCoverageResult !== 'PASS'
      || result.nonOverreachResult !== 'PASS' || result.unsafeRegressionResult !== 'PASS') fail('RESULT_VERIFIED_INVARIANT');
    if (result.cleanupStatus !== 'PASS') fail('RESULT_VERIFIED_INVARIANT');
  } else if (result.failureClass === 'NONE') {
    fail('RESULT_FAILED_INVARIANT');
  }

  const normalized = {
    ...result,
    candidateDigest,
    preSourceBundleDigest,
    postSourceBundleDigest,
    preContractDigest,
    postContractDigest,
    changedFiles: [...(result.changedFiles as string[])],
    targetPreimageDigest,
    targetPostimageDigest,
    canonicalSourceWrites: 0 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  } as unknown as SelfDevAdoptionSandboxResult;
  if (typeof result.resultId !== 'string' || !RESULT_ID_RE.test(result.resultId)) fail('RESULT_ID_INVALID');
  if (result.resultId !== resultIdFor(normalized)) fail('RESULT_ID_MISMATCH');
  return normalized;
}
