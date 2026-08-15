// ---------------------------------------------------------------------------
// Phase 8A.1 deterministic self-development contract manifest.
//
// This is declarative evaluator contract data. It is separate from the raw
// source bundle digest so a verifier can distinguish source bytes from the
// declared semantic contract.
// ---------------------------------------------------------------------------

import {
  SELFDEV_ACTIONS,
  SELFDEV_ASSERTIONS,
  SELFDEV_COVERAGE_CLASSES,
  SELFDEV_FIXTURE,
} from './registry';
import {
  SELFDEV_SELECTION_ALGORITHM_VERSION,
  SELFDEV_SYNTHETIC_PORTFOLIO_VERSION,
  SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS,
} from './portfolio';
import { canonicalJson, sha256Digest } from './canonical';
import {
  SELFDEV_ADOPTION_STATUS,
  SELFDEV_BUDGET,
  SELFDEV_CANDIDATE_KIND,
  SELFDEV_CANDIDATE_SCHEMA_VERSION,
  SELFDEV_EVALUATION_SCHEMA_VERSION,
  SELFDEV_PROPOSER_CLASS,
  SELFDEV_PUBLICATION,
  SELFDEV_REPLAY_ALGORITHM_VERSION,
  SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  SELFDEV_TARGET_SURFACE,
} from './types';
import {
  SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
  SELFDEV_ADOPTED_CASES,
  SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  SELFDEV_ADOPTION_STRATEGY_CLASS,
  SELFDEV_ADOPTION_STRATEGY_VERSION,
} from './adoptedCases';

/**
 * Phase 8B.1.0 — the contract manifest SHAPE gains a load-bearing semantic
 * sub-manifest (the synthetic proposal portfolio and its selection algorithm),
 * so the manifest version is deliberately bumped from v1 to v2. The version
 * is part of the manifest and therefore of `contractDigest`; deterministic
 * proposal semantics are now contract-bound.
 */
export const SELFDEV_CONTRACT_MANIFEST_VERSION = 'nightwatch.selfdev-contract.private.v2' as const;
export const SELFDEV_RESULT_STATE_MACHINE_VERSION = 'nightwatch.selfdev-result-state-machine.v1' as const;

export const SELFDEV_CONTRACT_MANIFEST = Object.freeze({
  schemaVersion: SELFDEV_CONTRACT_MANIFEST_VERSION,
  candidateSchemaVersion: SELFDEV_CANDIDATE_SCHEMA_VERSION,
  evaluationSchemaVersion: SELFDEV_EVALUATION_SCHEMA_VERSION,
  sessionSchemaVersion: SELFDEV_SESSION_ARTIFACT_SCHEMA_VERSION,
  candidateKind: SELFDEV_CANDIDATE_KIND,
  proposerClass: SELFDEV_PROPOSER_CLASS,
  targetSurface: SELFDEV_TARGET_SURFACE,
  budgets: SELFDEV_BUDGET,
  adoptionStatus: SELFDEV_ADOPTION_STATUS,
  publication: SELFDEV_PUBLICATION,
  actionDescriptors: SELFDEV_ACTIONS,
  assertionDescriptors: SELFDEV_ASSERTIONS,
  fixtureDescriptor: SELFDEV_FIXTURE,
  coverageClasses: SELFDEV_COVERAGE_CLASSES,
  resultStateMachineVersion: SELFDEV_RESULT_STATE_MACHINE_VERSION,
  replayAlgorithmVersion: SELFDEV_REPLAY_ALGORITHM_VERSION,
  adoptedCaseSchemaVersion: SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
  adoptionStrategyVersion: SELFDEV_ADOPTION_STRATEGY_VERSION,
  adoptionStrategyClass: SELFDEV_ADOPTION_STRATEGY_CLASS,
  adoptedCatalogMaxEntries: SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  adoptedCases: SELFDEV_ADOPTED_CASES,
  syntheticPortfolioVersion: SELFDEV_SYNTHETIC_PORTFOLIO_VERSION,
  syntheticSelectionAlgorithmVersion: SELFDEV_SELECTION_ALGORITHM_VERSION,
  syntheticProposalPortfolio: SELFDEV_SYNTHETIC_PROPOSAL_VARIANTS.map((entry) => ({
    variantId: entry.variantId,
    title: entry.title,
    fixtureId: entry.fixtureId,
    actionIds: entry.actionIds,
    assertionIds: entry.assertionIds,
    coverageClasses: entry.coverageClasses,
    equivalentFingerprint: entry.equivalentFingerprint,
  })),
} as const);

export function selfDevContractManifestBytes(): string {
  return canonicalJson(SELFDEV_CONTRACT_MANIFEST);
}

export function selfDevContractDigest(): string {
  return sha256Digest(SELFDEV_CONTRACT_MANIFEST);
}
