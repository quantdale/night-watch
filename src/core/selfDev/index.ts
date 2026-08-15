// Nightwatch Phase 8A self-development boundary.
// Keep this index explicit: no campaign, oracle, browser, product, database,
// infrastructure, or AI-review authority is re-exported here.

export * from './canonical';
export * from './types';
export * from './validation';
export * from './registry';
export * from './proposer';
export { SelfDevEvaluator, SelfDevSessionBudgetError } from './evaluator';
export { replaySession, verifiedPassCandidates, DeterministicReplayClock } from './replay';
export { assessSelfDevArtifactIntegrity, assessFutureReviewEligibility, isFutureReviewPrerequisitePass, missingSelfDevArtifactAssessment } from './trust';
export type { CurrentSelfDevSourceView } from './trust';
export { selfDevContractDigest, SELFDEV_CONTRACT_MANIFEST, SELFDEV_RESULT_STATE_MACHINE_VERSION } from './contract';
export { SELFDEV_AUTHORITATIVE_PATHS, SELFDEV_SOURCE_BUNDLE_ALGORITHM, SELFDEV_SOURCE_BUNDLE_MANIFEST_VERSION } from './provenanceManifest';
export { SelfDevController, runSyntheticSelfDevSession } from './controller';

// Phase 8B — declarative adopted-case catalog. This is data/schema surface
// only; the sandbox-confined planner/executor authority lives in the
// separate src/core/selfDevSandbox/ boundary and is never re-exported here.
export {
  SELFDEV_ADOPTED_CASE_SCHEMA_VERSION,
  SELFDEV_ADOPTED_CASES,
  SELFDEV_ADOPTED_CATALOG_MAX_ENTRIES,
  SELFDEV_ADOPTED_CATALOG_TARGET_PATH,
  SELFDEV_ADOPTION_STRATEGY_CLASS,
  SELFDEV_ADOPTION_STRATEGY_VERSION,
  SelfDevAdoptedCatalogError,
  adoptedCaseIdFor,
  adoptedCaseIdentityFields,
  deriveAdoptedCase,
  deriveAdoptedCaseCoverage,
  renderAdoptedCatalogSource,
  selfDevAdoptedCoverageClasses,
  selfDevAdoptedEquivalentFingerprints,
  validateAdoptedCase,
  validateAdoptedCatalog,
} from './adoptedCases';
export type { SelfDevAdoptedCase } from './adoptedCases';
