// ---------------------------------------------------------------------------
// Phase 8B.1.0 — coherent source-tree-scoped selfDev stack (test-only).
//
// One explicit dependency used by evaluation, replay, eligibility, planning,
// sandbox execution, and promotion: the full selfDev stack loaded from ONE
// synthetic source fixture (see selfDevSourceFixture.ts). Loading the stack
// from the fixture's source root makes every internal import (controller,
// evaluator, replay, trust, adoptedCases, localGit, planner, sandbox
// executor, promotion) resolve against the fixture's OWN rendered
// adopted-catalog state, so session evaluation, replay, contract/source
// digests, and eligibility all agree — regardless of which checkout the test
// process itself runs in (empty, one-entry, or exhausted). This is the same
// cache-isolated fresh-load pattern the Phase 8B.1 promotion modules use.
//
// This helper is reachable only from tests; production CLIs never load a
// foreign stack.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { loadSandboxModules } from '../../src/core/selfDevSandbox/sandboxLoader';

export interface SelfDevStackPlan {
  readonly planId: string;
  readonly sourceSessionArtifactId: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly evaluationId: string;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly targetPostimageDigest: string;
  readonly canonicalApply: string;
  readonly publication: string;
  readonly canonicalSourceWrites: number;
  readonly runtimeGitWrites: number;
  readonly externalCalls: number;
  readonly strategyClass: string;
  readonly adoptedCase: Record<string, unknown>;
  readonly sourceBundleDigestBefore: string;
  readonly contractDigestBefore: string;
  readonly plannedAgainstHeadSha: string;
  readonly expectedChangedFiles: readonly string[];
  readonly sandboxAuthority: string;
}

export interface SelfDevStackSandboxResult {
  readonly resultId: string;
  readonly adoptionStatus: string;
  readonly sandboxVerificationStatus: string;
  readonly failureClass: string;
  readonly canonicalApply: string;
  readonly publication: string;
  readonly strategyClass: string;
  readonly planId: string;
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
  readonly preAdoptionResult: string;
  readonly postEquivalentResult: string;
  readonly postVariantCoverageResult: string;
  readonly nonOverreachResult: string;
  readonly unsafeRegressionResult: string;
  readonly cleanupStatus: string;
  readonly sandboxSourceWrites: number;
  readonly canonicalSourceWrites: number;
  readonly runtimeGitWrites: number;
  readonly externalCalls: number;
}

export interface SelfDevStackPromotion {
  readonly promotionId: string;
  readonly canonicalAuthority: string;
  readonly maximumCanonicalSourceWrites: number;
  readonly runtimeGitWrites: number;
  readonly targetPath: string;
  readonly targetPreimageDigest: string;
  readonly targetPostimageDigest: string;
  readonly expectedPostSourceBundleDigest: string;
  readonly expectedPostContractDigest: string;
}

export interface SelfDevStackApproval {
  readonly approvalId: string;
  readonly maximumApplications: number;
}

export interface SelfDevStackReceipt {
  readonly receiptId: string;
  readonly applyOutcome: string;
  readonly canonicalSourceWrites: number;
  readonly runtimeGitWrites: number;
  readonly externalCalls: number;
  readonly gitCommitStatus: string;
  readonly targetPath: string;
  readonly targetPostimageDigest: string;
  readonly observedTargetPostimageDigest: string;
  readonly observedChangedFiles: readonly string[];
}

export interface SelfDevStackVerification {
  readonly verificationId: string;
  readonly verificationStatus: string;
  readonly postEquivalentResult: string;
  readonly postVariantCoverageResult: string;
  readonly nonOverreachResult: string;
  readonly unsafeRegressionResult: string;
  readonly canonicalSourceWrites: number;
  readonly runtimeGitWrites: number;
  readonly runtimeGitCommit: string;
  readonly postContractDigest: string;
}

export interface SelfDevStack {
  runSyntheticSelfDevSession(options: Record<string, unknown>): {
    readonly artifactId: string;
    readonly baseNightwatchSha: string;
    readonly evaluations: ReadonlyArray<Record<string, unknown> & { readonly resultClass: string; readonly candidateId: string; readonly candidateDigest: string; readonly execution: { readonly finalStateId: string; readonly transitionClass: string } | null; readonly coverageDelta: { readonly added: readonly string[]; readonly count: number } }>;
    readonly replayDescriptor: { readonly fixture: string; readonly seed: number; readonly baseNightwatchSha: string; readonly expectedProposalCount: number };
    readonly provenance: { readonly gitHeadSha: string; readonly sourceBundleDigest: string; readonly contractDigest: string };
    readonly candidateCount: number;
    readonly privateArtifact: { readonly persisted: boolean; readonly disposition: string };
    readonly schemaVersion: string;
    readonly proposerClass: string;
    readonly adoptionStatus: string;
    readonly publication: string;
    readonly sourceWrites: number;
    readonly gitWrites: number;
    readonly externalCalls: number;
  };
  replaySession(artifact: unknown): { readonly status: string; readonly reason: string; readonly passCandidateCount: number };
  verifiedPassCandidates(artifact: unknown): readonly unknown[];
  assessSelfDevArtifactIntegrity(value: unknown, current?: unknown): { readonly trustStatus: string; readonly replayStatus: string; readonly passCandidateCount: number; readonly sourceBundleMatch: string; readonly contractDigestMatch: string; readonly adoptionStatus: string; readonly publication: string; readonly sourceWrites: number; readonly gitWrites: number; readonly externalCalls: number };
  assessFutureReviewEligibility(value: unknown, current: unknown): { readonly eligible: boolean; readonly candidates: readonly unknown[]; readonly assessment: { readonly trustStatus: string; readonly replayStatus: string; readonly passCandidateCount: number; readonly adoptionStatus: string; readonly publication: string; readonly sourceWrites: number; readonly gitWrites: number; readonly externalCalls: number } };
  currentCheckoutState(options?: Record<string, unknown>): { readonly repositoryRoot: string; readonly gitHeadSha: string; readonly currentHeadSha: string; readonly sourceBundleDigest: string; readonly contractDigest: string; readonly authoritativeSourceState: 'CLEAN'; isAncestor(baseSha: string): boolean };
  readLocalNightwatchProvenance(options?: Record<string, unknown>): { readonly gitHeadSha: string; readonly sourceBundleDigest: string; readonly contractDigest: string };
  SelfDevPrivateArtifactStore: new (options?: Record<string, unknown>) => { readonly store: { readonly root: string }; writeSessionArtifact(artifact: unknown): string; readSessionArtifact(artifactId: string): { kind: string; artifact: unknown } };
  planAdoption(input: Record<string, unknown>): SelfDevStackPlan;
  revalidatePlan(...args: unknown[]): void;
  inspectSelfDevAdoption(...args: unknown[]): { readonly artifactId: string; readonly trustStatus: string; readonly eligible: boolean; readonly candidateCount: number; readonly candidateIds: readonly string[] };
  runSandboxAdoption(input: Record<string, unknown>): SelfDevStackSandboxResult;
  SelfDevAdoptionPlanStore: new (options?: Record<string, unknown>) => { writePlan(plan: unknown): string; readPlan(planId: string): Record<string, unknown> };
  SelfDevAdoptionResultStore: new (options?: Record<string, unknown>) => { writeResult(result: unknown): string; readResult(resultId: string): Record<string, unknown> };
  preparePromotion(input: Record<string, unknown>): SelfDevStackPromotion;
  approvePromotion(input: Record<string, unknown>): SelfDevStackApproval;
  applyPromotion(input: Record<string, unknown>): SelfDevStackReceipt;
  verifyCanonicalPromotion(input: Record<string, unknown>): SelfDevStackVerification;
  assessCanonicalPromotionCurrentness(input: Record<string, unknown>): string;
  SelfDevCanonicalPromotionIntentStore: new (options?: Record<string, unknown>) => unknown;
  SelfDevCanonicalPromotionApprovalStore: new (options?: Record<string, unknown>) => { isApprovalConsumed(approvalId: string): boolean };
  SelfDevCanonicalApplyReceiptStore: new (options?: Record<string, unknown>) => unknown;
  SelfDevCanonicalPromotionVerificationStore: new (options?: Record<string, unknown>) => unknown;
  SELFDEV_ADOPTED_CASES: readonly unknown[];
  deriveAdoptedCase(fixtureId: string, actionIds: readonly string[], assertionIds: readonly string[]): Record<string, unknown>;
  selfDevAdoptedEquivalentFingerprints(): readonly string[];
  selfDevAdoptedCoverageClasses(): readonly string[];
  selfDevContractDigest(): string;
  SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES: number;
  SELFDEV_ADOPTION_STRATEGY_CLASS: string;
}

/**
 * Loads the coherent stack from one source root. `nodeModulesAnchorPath`
 * must be a real `package.json` inside a checkout that has node_modules
 * (normally the running checkout's own package.json).
 */
export function loadSelfDevStack(sourceRoot: string, nodeModulesAnchorPath: string): SelfDevStack {
  const entries = [
    'src/core/selfDev/controller.ts',
    'src/core/selfDev/replay.ts',
    'src/core/selfDev/trust.ts',
    'src/core/selfDev/storage.ts',
    'src/core/selfDev/adoptedCases.ts',
    'src/core/selfDev/contract.ts',
    'src/core/provenance/localGit.ts',
    'src/core/selfDevSandbox/planner.ts',
    'src/core/selfDevSandbox/sandboxExecutor.ts',
    'src/core/selfDevSandbox/storage.ts',
    'src/core/selfDevPromotion/index.ts',
  ].map((relative) => path.join(sourceRoot, relative));
  const modules = loadSandboxModules(entries, sourceRoot, nodeModulesAnchorPath) as unknown[];
  const [controller, replay, trust, storage, adoptedCases, contract, localGit, planner, sandboxExecutor, sandboxStorage, promotion] = modules;
  return {
    runSyntheticSelfDevSession: (controller as { runSyntheticSelfDevSession(options: Record<string, unknown>): unknown }).runSyntheticSelfDevSession,
    replaySession: (replay as { replaySession(artifact: unknown): unknown }).replaySession,
    verifiedPassCandidates: (replay as { verifiedPassCandidates(artifact: unknown): unknown }).verifiedPassCandidates,
    assessSelfDevArtifactIntegrity: (trust as { assessSelfDevArtifactIntegrity(value: unknown, current?: unknown): unknown }).assessSelfDevArtifactIntegrity,
    assessFutureReviewEligibility: (trust as { assessFutureReviewEligibility(value: unknown, current: unknown): unknown }).assessFutureReviewEligibility,
    currentCheckoutState: (localGit as { currentCheckoutState(options?: Record<string, unknown>): unknown }).currentCheckoutState,
    readLocalNightwatchProvenance: (localGit as { readLocalNightwatchProvenance(options?: Record<string, unknown>): unknown }).readLocalNightwatchProvenance,
    SelfDevPrivateArtifactStore: (storage as { SelfDevPrivateArtifactStore: unknown }).SelfDevPrivateArtifactStore,
    planAdoption: (planner as { planAdoption(input: Record<string, unknown>): unknown }).planAdoption,
    revalidatePlan: (planner as { revalidatePlan(...args: unknown[]): unknown }).revalidatePlan,
    inspectSelfDevAdoption: (planner as { inspectSelfDevAdoption(...args: unknown[]): unknown }).inspectSelfDevAdoption,
    runSandboxAdoption: (sandboxExecutor as { runSandboxAdoption(input: Record<string, unknown>): unknown }).runSandboxAdoption,
    SelfDevAdoptionPlanStore: (sandboxStorage as { SelfDevAdoptionPlanStore: unknown }).SelfDevAdoptionPlanStore,
    SelfDevAdoptionResultStore: (sandboxStorage as { SelfDevAdoptionResultStore: unknown }).SelfDevAdoptionResultStore,
    preparePromotion: (promotion as { preparePromotion(input: Record<string, unknown>): unknown }).preparePromotion,
    approvePromotion: (promotion as { approvePromotion(input: Record<string, unknown>): unknown }).approvePromotion,
    applyPromotion: (promotion as { applyPromotion(input: Record<string, unknown>): unknown }).applyPromotion,
    verifyCanonicalPromotion: (promotion as { verifyCanonicalPromotion(input: Record<string, unknown>): unknown }).verifyCanonicalPromotion,
    assessCanonicalPromotionCurrentness: (promotion as { assessCanonicalPromotionCurrentness(input: Record<string, unknown>): unknown }).assessCanonicalPromotionCurrentness,
    SelfDevCanonicalPromotionIntentStore: (promotion as { SelfDevCanonicalPromotionIntentStore: unknown }).SelfDevCanonicalPromotionIntentStore,
    SelfDevCanonicalPromotionApprovalStore: (promotion as { SelfDevCanonicalPromotionApprovalStore: unknown }).SelfDevCanonicalPromotionApprovalStore,
    SelfDevCanonicalApplyReceiptStore: (promotion as { SelfDevCanonicalApplyReceiptStore: unknown }).SelfDevCanonicalApplyReceiptStore,
    SelfDevCanonicalPromotionVerificationStore: (promotion as { SelfDevCanonicalPromotionVerificationStore: unknown }).SelfDevCanonicalPromotionVerificationStore,
    SELFDEV_ADOPTED_CASES: (adoptedCases as { SELFDEV_ADOPTED_CASES: unknown }).SELFDEV_ADOPTED_CASES,
    deriveAdoptedCase: (adoptedCases as { deriveAdoptedCase(fixtureId: string, actionIds: readonly string[], assertionIds: readonly string[]): unknown }).deriveAdoptedCase,
    selfDevAdoptedEquivalentFingerprints: (adoptedCases as { selfDevAdoptedEquivalentFingerprints(): unknown }).selfDevAdoptedEquivalentFingerprints,
    selfDevAdoptedCoverageClasses: (adoptedCases as { selfDevAdoptedCoverageClasses(): unknown }).selfDevAdoptedCoverageClasses,
    selfDevContractDigest: (contract as { selfDevContractDigest(): unknown }).selfDevContractDigest,
    SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES: (adoptedCases as { SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES: number }).SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
    SELFDEV_ADOPTION_STRATEGY_CLASS: (adoptedCases as { SELFDEV_ADOPTION_STRATEGY_CLASS: string }).SELFDEV_ADOPTION_STRATEGY_CLASS,
  } as SelfDevStack;
}
