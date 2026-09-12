// GENERATED — the typed surface of the bounded TypeScript runtime loader.
// Regenerate with: node bin/bin-typecheck.mjs --write
// Each key is one literal path passed to loadTypeScriptModule(s); each value
// is that module's own type, so a bin destructure is checked against the
// module it loads rather than against `any`.

export const TYPESCRIPT_RUNTIME_LOADER_VERSION: string;
export const DEFAULT_TYPESCRIPT_RUNTIME_PROFILE: string;

export interface TypeScriptRuntimeLoaderOptions {
  readonly root?: string;
  readonly profile?: string;
}

export interface TypeScriptRuntimeLoaderModuleMap {
  "corpus/phase20/contracts.ts": typeof import("../../corpus/phase20/contracts");
  "corpus/phase21/adversarialMatrix.ts": typeof import("../../corpus/phase21/adversarialMatrix");
  "corpus/phase21/contracts.ts": typeof import("../../corpus/phase21/contracts");
  "src/auth/capabilityLifecycle.ts": typeof import("../../src/auth/capabilityLifecycle");
  "src/auth/devCredentialProvider.ts": typeof import("../../src/auth/devCredentialProvider");
  "src/auth/directRunner.ts": typeof import("../../src/auth/directRunner");
  "src/browser/fixtures/storageState.ts": typeof import("../../src/browser/fixtures/storageState");
  "src/controlCenter/authorities/reviewWriteAuthority.ts": typeof import("../../src/controlCenter/authorities/reviewWriteAuthority");
  "src/controlCenter/server/defaultCollector.ts": typeof import("../../src/controlCenter/server/defaultCollector");
  "src/controlCenter/server/index.ts": typeof import("../../src/controlCenter/server/index");
  "src/core/agentRuntime/localCampaign.ts": typeof import("../../src/core/agentRuntime/localCampaign");
  "src/core/aiReview/localCanary.ts": typeof import("../../src/core/aiReview/localCanary");
  "src/core/aiReview/ownerDecision.ts": typeof import("../../src/core/aiReview/ownerDecision");
  "src/core/aiReview/ownerReview.ts": typeof import("../../src/core/aiReview/ownerReview");
  "src/core/aiReview/storage.ts": typeof import("../../src/core/aiReview/storage");
  "src/core/campaign/runtimeProfile.ts": typeof import("../../src/core/campaign/runtimeProfile");
  "src/core/campaignIntelligence/coverage.ts": typeof import("../../src/core/campaignIntelligence/coverage");
  "src/core/campaignIntelligence/impact.ts": typeof import("../../src/core/campaignIntelligence/impact");
  "src/core/campaignIntelligence/planner.ts": typeof import("../../src/core/campaignIntelligence/planner");
  "src/core/campaignIntelligence/yield.ts": typeof import("../../src/core/campaignIntelligence/yield");
  "src/core/config/environmentSurface.ts": typeof import("../../src/core/config/environmentSurface");
  "src/core/config/reasonerExecutable.ts": typeof import("../../src/core/config/reasonerExecutable");
  "src/core/dependencyCurrency/index.ts": typeof import("../../src/core/dependencyCurrency/index");
  "src/core/efficacy/index.ts": typeof import("../../src/core/efficacy/index");
  "src/core/environment/index.ts": typeof import("../../src/core/environment/index");
  "src/core/evidenceRetention/index.ts": typeof import("../../src/core/evidenceRetention/index");
  "src/core/localInvestigation/ownerLocal.ts": typeof import("../../src/core/localInvestigation/ownerLocal");
  "src/core/oops/l6.ts": typeof import("../../src/core/oops/l6");
  "src/core/phase22/index.ts": typeof import("../../src/core/phase22/index");
  "src/core/phase23/manifest.ts": typeof import("../../src/core/phase23/manifest");
  "src/core/policy/privateArtifacts.ts": typeof import("../../src/core/policy/privateArtifacts");
  "src/core/portfolio/types.ts": typeof import("../../src/core/portfolio/types");
  "src/core/productionTrack/index.ts": typeof import("../../src/core/productionTrack/index");
  "src/core/provenance/index.ts": typeof import("../../src/core/provenance/index");
  "src/core/qualityGate/externalCi.ts": typeof import("../../src/core/qualityGate/externalCi");
  "src/core/qualityGate/preDev.ts": typeof import("../../src/core/qualityGate/preDev");
  "src/core/readiness/localReadiness.ts": typeof import("../../src/core/readiness/localReadiness");
  "src/core/readiness/openWork.ts": typeof import("../../src/core/readiness/openWork");
  "src/core/readiness/repoState.ts": typeof import("../../src/core/readiness/repoState");
  "src/core/releaseCertification/index.ts": typeof import("../../src/core/releaseCertification/index");
  "src/core/safety/redaction.ts": typeof import("../../src/core/safety/redaction");
  "src/core/schemaLifecycle/index.ts": typeof import("../../src/core/schemaLifecycle/index");
  "src/core/selfDev/adoptedCases.ts": typeof import("../../src/core/selfDev/adoptedCases");
  "src/core/selfDev/controller.ts": typeof import("../../src/core/selfDev/controller");
  "src/core/selfDev/portfolio.ts": typeof import("../../src/core/selfDev/portfolio");
  "src/core/selfDev/storage.ts": typeof import("../../src/core/selfDev/storage");
  "src/core/selfDev/trust.ts": typeof import("../../src/core/selfDev/trust");
  "src/core/selfDevPromotion/index.ts": typeof import("../../src/core/selfDevPromotion/index");
  "src/core/selfDevSandbox/planner.ts": typeof import("../../src/core/selfDevSandbox/planner");
  "src/core/selfDevSandbox/sandboxExecutor.ts": typeof import("../../src/core/selfDevSandbox/sandboxExecutor");
  "src/core/selfDevSandbox/storage.ts": typeof import("../../src/core/selfDevSandbox/storage");
  "src/core/semanticCoverage/index.ts": typeof import("../../src/core/semanticCoverage/index");
  "src/core/source/approvedScan.ts": typeof import("../../src/core/source/approvedScan");
  "src/core/source/populationCompleteness.ts": typeof import("../../src/core/source/populationCompleteness");
  "src/core/source/readonlyCandidateCensus.ts": typeof import("../../src/core/source/readonlyCandidateCensus");
  "src/core/source/review.ts": typeof import("../../src/core/source/review");
  "src/core/source/siblingSource.ts": typeof import("../../src/core/source/siblingSource");
  "src/core/source/surfaces.ts": typeof import("../../src/core/source/surfaces");
  "src/core/source/universe.ts": typeof import("../../src/core/source/universe");
  "src/oracles/expectations/admission.ts": typeof import("../../src/oracles/expectations/admission");
  "src/oracles/expectations/collectionAdmission.ts": typeof import("../../src/oracles/expectations/collectionAdmission");
  "src/oracles/expectations/coverageInventory.ts": typeof import("../../src/oracles/expectations/coverageInventory");
  "src/oracles/expectations/extract/contractCoverageReport.ts": typeof import("../../src/oracles/expectations/extract/contractCoverageReport");
  "src/oracles/expectations/recipes/registry.ts": typeof import("../../src/oracles/expectations/recipes/registry");
}

export function loadTypeScriptModule<
  T = never,
  const File extends string = string,
>(
  file: File,
  options?: TypeScriptRuntimeLoaderOptions,
): [T] extends [never]
  ? File extends keyof TypeScriptRuntimeLoaderModuleMap
    ? TypeScriptRuntimeLoaderModuleMap[File]
    : unknown
  : T;
export function loadTypeScriptModules<
  T = never,
  const Files extends readonly string[] = readonly string[],
>(
  files: Files,
  options?: TypeScriptRuntimeLoaderOptions,
): [T] extends [never]
  ? { -readonly [Index in keyof Files]: Files[Index] extends keyof TypeScriptRuntimeLoaderModuleMap ? TypeScriptRuntimeLoaderModuleMap[Files[Index]] : unknown }
  : T[];
export function clearTypeScriptRuntimeTranspileCache(): void;
export function typeScriptRuntimeTranspileCacheStats(): {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly transpiles: number;
  readonly entries: number;
  readonly maxEntries: number;
};
export function typeScriptRuntimeProfileNames(): readonly string[];
