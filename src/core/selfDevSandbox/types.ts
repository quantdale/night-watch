// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — controlled source adoption sandbox contracts.
//
// This module is the sandbox-mutation authority boundary, deliberately
// separate from the pure deterministic src/core/selfDev/ trust/evaluation
// domain. It plans and, only inside a disposable private source mirror,
// applies ONE declarative adopted-case catalog entry — never canonical
// source, never Git, never a candidate-supplied path/patch/command.
// ---------------------------------------------------------------------------

import type { SelfDevAdoptedCase, SelfDevAdoptionStrategyClass } from '../selfDev/adoptedCases';

export const SELFDEV_ADOPTION_PLAN_SCHEMA_VERSION = 'nightwatch.selfdev-adoption-plan.private.v1' as const;
export const SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION = 'nightwatch.selfdev-adoption-sandbox-result.private.v1' as const;

export interface SelfDevAdoptionPlan {
  readonly schemaVersion: typeof SELFDEV_ADOPTION_PLAN_SCHEMA_VERSION;
  readonly planId: string;
  readonly strategyClass: SelfDevAdoptionStrategyClass;
  readonly sourceSessionArtifactId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly evaluationId: string;
  readonly plannedAgainstHeadSha: string;
  readonly sourceBundleDigestBefore: string;
  readonly contractDigestBefore: string;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly adoptedCase: SelfDevAdoptedCase;
  readonly targetPostimageDigest: string;
  readonly expectedChangedFiles: readonly string[];
  readonly sandboxAuthority: 'SANDBOX_ONLY';
  readonly canonicalApply: 'PROHIBITED';
  readonly publication: 'PROHIBITED';
  readonly canonicalSourceWrites: 0;
  readonly runtimeGitWrites: 0;
  readonly externalCalls: 0;
}

export type SelfDevSandboxProbeResult = 'PASS' | 'FAIL' | 'NOT_RUN';
export type SelfDevSandboxVerificationStatus = 'PASS' | 'FAIL';

export type SelfDevSandboxFailureClass =
  | 'NONE'
  | 'PLAN_STALE'
  | 'CANDIDATE_NOT_ELIGIBLE'
  | 'CATALOG_NONCANONICAL'
  | 'ALREADY_ADOPTED'
  | 'CATALOG_FULL'
  | 'SANDBOX_COPY_MISMATCH'
  | 'SANDBOX_WRITE_FAILED'
  | 'POSTIMAGE_DIGEST_MISMATCH'
  | 'UNEXPECTED_CHANGED_FILE'
  | 'SANDBOX_MODULE_LOAD_FAILED'
  | 'SANDBOX_CONTRACT_NOT_CHANGED'
  | 'POST_ADOPTION_STILL_PASS'
  | 'NON_OVERREACH_PROBE_UNAVAILABLE'
  | 'NON_OVERREACH_REGRESSION'
  | 'CLEANUP_FAILED';

export interface SelfDevAdoptionSandboxResult {
  readonly schemaVersion: typeof SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION;
  readonly resultId: string;
  readonly planId: string;
  readonly strategyClass: SelfDevAdoptionStrategyClass;
  readonly sourceSessionArtifactId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly preSourceBundleDigest: string | null;
  readonly postSourceBundleDigest: string | null;
  readonly preContractDigest: string | null;
  readonly postContractDigest: string | null;
  readonly changedFiles: readonly string[];
  readonly targetPath: string;
  readonly targetPreimageDigest: string | null;
  readonly targetPostimageDigest: string | null;
  readonly preAdoptionResult: SelfDevSandboxProbeResult;
  readonly postEquivalentResult: SelfDevSandboxProbeResult;
  readonly postVariantCoverageResult: SelfDevSandboxProbeResult;
  readonly nonOverreachResult: SelfDevSandboxProbeResult;
  readonly unsafeRegressionResult: SelfDevSandboxProbeResult;
  readonly sandboxVerificationStatus: SelfDevSandboxVerificationStatus;
  readonly failureClass: SelfDevSandboxFailureClass;
  readonly cleanupStatus: 'PASS' | 'FAIL';
  readonly sandboxSourceWrites: number;
  readonly canonicalSourceWrites: 0;
  readonly runtimeGitWrites: 0;
  readonly externalCalls: 0;
  readonly adoptionStatus: 'SANDBOX_VERIFIED_NOT_CANONICALLY_APPLIED' | 'SANDBOX_ADOPTION_FAILED';
  readonly canonicalApply: 'PROHIBITED';
  readonly publication: 'PROHIBITED';
}
