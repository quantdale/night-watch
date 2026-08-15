// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — deterministic, pure adoption planner.
//
// Plan creation NEVER mutates source. It only reads the exact v2 session
// artifact, current local Git/source provenance, and the current canonical
// adopted-case catalog, then derives one content-addressed plan. The target
// path is code-defined (SELFDEV_ADOPTED_CATALOG_TARGET_PATH) and cannot be
// influenced by the artifact, candidate, or caller.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { assertOwnerPolicyAllows } from '../policy/ownerScope';
import { sha256Hex } from '../selfDev/canonical';
import {
  SELFDEV_ADOPTED_CASES,
  SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
  SELFDEV_ADOPTION_STRATEGY_CLASS,
  deriveAdoptedCase,
  renderAdoptedCatalogSource,
  type SelfDevAdoptedCase,
} from '../selfDev/adoptedCases';
import { SelfDevPrivateArtifactStore } from '../selfDev/storage';
import { assessFutureReviewEligibility, type CurrentSelfDevSourceView } from '../selfDev/trust';
import { candidateDigestFor } from '../selfDev/validation';
import type { SelfDevEvaluation, SelfDevSessionArtifact } from '../selfDev/types';
import { planIdFor, validateAdoptionPlan } from './validation';
import type { SelfDevAdoptionPlan } from './types';

export class SelfDevSandboxPlannerError extends Error {
  constructor(readonly code: string) {
    super(`SELFDEV_SANDBOX_${code}`);
    this.name = 'SelfDevSandboxPlannerError';
  }
}

function fail(code: string): never {
  throw new SelfDevSandboxPlannerError(code);
}

export interface SelfDevAdoptionInspection {
  readonly artifactId: string;
  readonly trustStatus: string;
  readonly eligible: boolean;
  readonly candidateCount: number;
  readonly candidateIds: readonly string[];
}

/** Read-only. No source mutation, no plan creation. */
export function inspectSelfDevAdoption(artifactId: string, current: CurrentSelfDevSourceView, artifactStore?: SelfDevPrivateArtifactStore): SelfDevAdoptionInspection {
  const store = artifactStore ?? new SelfDevPrivateArtifactStore({ readOnly: true });
  const stored = store.readSessionArtifact(artifactId);
  const eligibility = assessFutureReviewEligibility(stored.artifact, current);
  return {
    artifactId,
    trustStatus: eligibility.assessment.trustStatus,
    eligible: eligibility.eligible,
    candidateCount: eligibility.candidates.length,
    candidateIds: eligibility.candidates.map((candidate) => candidate.candidateId),
  };
}

function findMatchingEvaluation(artifact: SelfDevSessionArtifact, candidateId: string, candidateDigest: string): SelfDevEvaluation {
  const matches = artifact.evaluations.filter((evaluation) =>
    evaluation.candidateId === candidateId
    && evaluation.candidateDigest === candidateDigest
    && evaluation.candidateKind === 'SYNTHETIC_REGRESSION_CASE'
    && evaluation.baseNightwatchSha === artifact.baseNightwatchSha
    && evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED');
  if (matches.length !== 1) fail('CANDIDATE_NOT_ELIGIBLE');
  return matches[0]!;
}

function readTargetBytes(repositoryRoot: string): string {
  const targetPath = path.join(repositoryRoot, SELFDEV_ADOPTED_CATALOG_TARGET_PATH);
  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('CATALOG_NONCANONICAL');
  return fs.readFileSync(targetPath, 'utf8');
}

function assertCatalogCanonical(repositoryRoot: string, catalog: readonly SelfDevAdoptedCase[]): string {
  const currentBytes = readTargetBytes(repositoryRoot);
  const canonicalBytes = renderAdoptedCatalogSource(catalog);
  if (currentBytes !== canonicalBytes) fail('CATALOG_NONCANONICAL');
  return currentBytes;
}

export interface PlanAdoptionInput {
  readonly artifactId: string;
  readonly candidateId: string;
  readonly current: CurrentSelfDevSourceView;
  readonly repositoryRoot: string;
  readonly artifactStore?: SelfDevPrivateArtifactStore;
  /** Test-only injection point; defaults to the real canonical catalog. */
  readonly catalog?: readonly SelfDevAdoptedCase[];
}

/**
 * Full plan-creation gate (exact v2 artifact -> eligibility -> exact
 * candidate -> matching PASS evaluation -> canonical catalog -> content-
 * addressed plan). No source mutation occurs here.
 */
export function planAdoption(input: PlanAdoptionInput): SelfDevAdoptionPlan {
  assertOwnerPolicyAllows('SELF_DEVELOPMENT_SANDBOX_ADOPTION');
  const catalog = input.catalog ?? SELFDEV_ADOPTED_CASES;
  const store = input.artifactStore ?? new SelfDevPrivateArtifactStore({ readOnly: true });
  const stored = store.readSessionArtifact(input.artifactId);
  const eligibility = assessFutureReviewEligibility(stored.artifact, input.current);
  if (!eligibility.eligible) fail('CANDIDATE_NOT_ELIGIBLE');
  if (stored.kind !== 'V2') fail('CANDIDATE_NOT_ELIGIBLE');
  const candidate = eligibility.candidates.find((item) => item.candidateId === input.candidateId);
  if (candidate === undefined) fail('CANDIDATE_NOT_ELIGIBLE');
  const artifact = stored.artifact;
  const candidateDigest = candidateDigestFor(candidate);
  const evaluation = findMatchingEvaluation(artifact, input.candidateId, candidateDigest);
  if (evaluation.coverageDelta.count <= 0 || evaluation.coverageDelta.added.length === 0) fail('CANDIDATE_NOT_ELIGIBLE');

  const adoptedCase: SelfDevAdoptedCase = deriveAdoptedCase(candidate.fixtureId, candidate.actionIds, candidate.assertionIds);
  if (adoptedCase.coverageClasses.length === 0 || !evaluation.coverageDelta.added.every((coverageClass) => adoptedCase.coverageClasses.includes(coverageClass))) {
    fail('CANDIDATE_NOT_ELIGIBLE');
  }
  if (catalog.some((entry) => entry.adoptedCaseId === adoptedCase.adoptedCaseId || entry.equivalentFingerprint === adoptedCase.equivalentFingerprint)) {
    fail('ALREADY_ADOPTED');
  }
  if (catalog.length + 1 > SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES) fail('CATALOG_FULL');

  const currentBytes = assertCatalogCanonical(input.repositoryRoot, catalog);
  const targetPreimageDigest = `sha256:${sha256Hex(currentBytes)}`;
  const postimageBytes = renderAdoptedCatalogSource([...catalog, adoptedCase]);
  const targetPostimageDigest = `sha256:${sha256Hex(postimageBytes)}`;

  const draft = {
    schemaVersion: 'nightwatch.selfdev-adoption-plan.private.v1' as const,
    strategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS,
    sourceSessionArtifactId: input.artifactId,
    candidateId: input.candidateId,
    candidateDigest,
    evaluationId: evaluation.evaluationId,
    plannedAgainstHeadSha: input.current.currentHeadSha,
    sourceBundleDigestBefore: input.current.sourceBundleDigest,
    contractDigestBefore: input.current.contractDigest,
    targetPath: SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
    targetPreimageDigest,
    adoptedCase,
    targetPostimageDigest,
    expectedChangedFiles: [SELFDEV_ADOPTED_CATALOG_TARGET_PATH],
    sandboxAuthority: 'SANDBOX_ONLY' as const,
    canonicalApply: 'PROHIBITED' as const,
    publication: 'PROHIBITED' as const,
    canonicalSourceWrites: 0 as const,
    runtimeGitWrites: 0 as const,
    externalCalls: 0 as const,
  };
  const planId = planIdFor(draft);
  return validateAdoptionPlan({ ...draft, planId });
}

/**
 * TOCTOU revalidation before any sandbox mutation. Requires the plan's
 * candidate to remain eligible and the source bundle, contract, and target
 * preimage to be byte-identical to plan time. A documentation-only
 * descendant (different HEAD, unchanged source/contract/target) remains
 * valid; genuine source drift fails closed.
 */
export function revalidatePlan(plan: SelfDevAdoptionPlan, current: CurrentSelfDevSourceView, repositoryRoot: string, artifactStore?: SelfDevPrivateArtifactStore, catalog: readonly SelfDevAdoptedCase[] = SELFDEV_ADOPTED_CASES): void {
  if (current.sourceBundleDigest !== plan.sourceBundleDigestBefore) fail('PLAN_STALE');
  if (current.contractDigest !== plan.contractDigestBefore) fail('PLAN_STALE');
  const currentBytes = readTargetBytes(repositoryRoot);
  const currentTargetDigest = `sha256:${sha256Hex(currentBytes)}`;
  if (currentTargetDigest !== plan.targetPreimageDigest) fail('PLAN_STALE');

  const store = artifactStore ?? new SelfDevPrivateArtifactStore({ readOnly: true });
  const stored = store.readSessionArtifact(plan.sourceSessionArtifactId);
  const eligibility = assessFutureReviewEligibility(stored.artifact, current);
  if (!eligibility.eligible) fail('PLAN_STALE');
  if (!eligibility.candidates.some((candidate) => candidate.candidateId === plan.candidateId)) fail('PLAN_STALE');
  if (catalog.some((entry) => entry.adoptedCaseId === plan.adoptedCase.adoptedCaseId || entry.equivalentFingerprint === plan.adoptedCase.equivalentFingerprint)) {
    fail('ALREADY_ADOPTED');
  }
}
