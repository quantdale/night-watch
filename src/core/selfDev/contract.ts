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

export const SELFDEV_CONTRACT_MANIFEST_VERSION = 'nightwatch.selfdev-contract.private.v1' as const;
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
} as const);

export function selfDevContractManifestBytes(): string {
  return canonicalJson(SELFDEV_CONTRACT_MANIFEST);
}

export function selfDevContractDigest(): string {
  return sha256Digest(SELFDEV_CONTRACT_MANIFEST);
}
