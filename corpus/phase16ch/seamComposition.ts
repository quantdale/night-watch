// ---------------------------------------------------------------------------
// Nightwatch Phase 16CH — deterministic campaign-seam composition helpers.
//
// Ports the Phase-16C seam-rehearsal composition (canonical snapshots, fixed
// version fingerprint, privacy policy, counting executors, temp stores) into
// a reusable corpus module so every Phase-16CH suite composes IDENTICAL
// inputs. Local/synthetic only: no DEV, no network, no browser, no wall clock
// in identity-bearing output.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ANOMALY_CLUSTER_VERSION,
  FAILURE_MINIMIZATION_VERSION,
  DOSSIER_VERSION,
} from "../../src/core/triage/types";
import { TRIAGE_REPLAY_PLAN_VERSION, TRIAGE_REPLAY_PLAN_V2_VERSION } from "../../src/core/triage/replayPlan";
import { SEMANTIC_TRIAGE_EVIDENCE_VERSION } from "../../src/core/triage/semanticTriageEvidence";
import { DOSSIER_VERSION_V2 } from "../../src/core/triage/dossierV2";
import { SEMANTIC_CLUSTER_VERSION } from "../../src/oracles/semantic/cluster";
import { SEMANTIC_CAMPAIGN_BUNDLE_VERSION } from "../../src/core/source/semanticCampaignBundle";
import { SEMANTIC_EVALUATION_RECEIPT_VERSION } from "../../src/oracles/semantic/receipts";
import { REAL_SOURCE_DERIVATION_VERSION_V2 } from "../../src/oracles/expectations/admission";
import {
  CAMPAIGN_ORCHESTRATOR_VERSION,
  CAMPAIGN_SCHEMA_VERSION,
  CampaignCheckpointStore,
  INITIAL_REAL_CAMPAIGN_BUDGET,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  type CampaignAnomalyCandidate,
  type CampaignExecutionOutcome,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPrivacyPolicy,
  type CampaignSourceSnapshot,
  type CampaignVersionFingerprint,
  type CampaignWorkItem,
} from "../../src/core/campaign";
import { JOURNEY_CONTRACT_VERSION, ORACLE_VERSION } from "../../src/core/journeys/contract";
import {
  DEPENDENCY_MAP_VERSION,
  RIPPLE_REPOSITORIES,
  SELECTOR_VERSION,
  changesetId,
  type ChangedFile,
} from "../../src/core/changeIntelligence";
import {
  EXPLORATION_MODEL_VERSION,
  PLANNER_VERSION,
  SAFE_ACTION_CATALOG_VERSION,
} from "../../src/core/exploration/types";
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION } from "../../src/api/phase5/types";
import { PHASE5_API_CATALOG } from "../../src/api/phase5/catalog";
import { RIPPLE_PHASE4_ACTIONS, RIPPLE_PHASE4_ENVELOPES } from "../../src/products/ripple/explorationCatalog";
import {
  OWNER_SCOPE_POLICY_VERSION,
  PRIVATE_ARTIFACT_POLICY_VERSION,
  PrivateArtifactStore,
} from "../../src/core/policy";
import type { SourceFreshness } from "../../src/core/triage/types";
import { mapPortfolioBudget } from "../../src/core/portfolio/runtimeBinding";
import { validateCampaignManifest } from "../../src/core/campaign/identity";
import type { CampaignPortfolioRuntimeBinding } from "../../src/core/campaign/types";

export const STATIC_NOW = "2026-08-23T01:00:00.000Z";
export const REAL_SEEDS = ["0x0000000000000101", "0x0000000000000201", "0x0000000000000301"] as const;

export const PRIVACY_POLICY: CampaignPrivacyPolicy = {
  storageClass: "OWNER_ONLY_LOCAL",
  remotePrivacy: "NO_REMOTE",
  externalPublication: "PROHIBITED",
  rawBodiesPersisted: false,
  customerValuesPersisted: false,
  credentialsPersisted: false,
  cookiesPersisted: false,
  tokensPersisted: false,
  domPersisted: false,
  screenshotsPersisted: false,
  authenticatedTracesPersisted: false,
};

export const VERSIONS: CampaignVersionFingerprint = {
  campaignSchemaVersion: CAMPAIGN_SCHEMA_VERSION,
  orchestratorVersion: CAMPAIGN_ORCHESTRATOR_VERSION,
  nightwatchSourceSha: "synthetic-phase16ch-source.v1",
  selectorVersion: SELECTOR_VERSION,
  dependencyMapVersion: DEPENDENCY_MAP_VERSION,
  journeyContractVersion: JOURNEY_CONTRACT_VERSION,
  journeyOracleVersion: ORACLE_VERSION,
  explorationCatalogVersion: SAFE_ACTION_CATALOG_VERSION,
  explorationModelVersion: EXPLORATION_MODEL_VERSION,
  explorationPlannerVersion: PLANNER_VERSION,
  apiCatalogVersion: API_CATALOG_VERSION,
  apiGeneratorVersion: SCENARIO_GENERATOR_VERSION,
  apiOracleVersion: "nightwatch.api-oracle.phase5.v1",
  triageClusterVersion: ANOMALY_CLUSTER_VERSION,
  triageMinimizerVersion: FAILURE_MINIMIZATION_VERSION,
  dossierVersion: DOSSIER_VERSION,
  ownerScopePolicyVersion: OWNER_SCOPE_POLICY_VERSION,
  privateArtifactPolicyVersion: PRIVATE_ARTIFACT_POLICY_VERSION,
  seedCorpusVersion: "nightwatch.phase7.real-dev-seeds.v1",
  budgetPolicyVersion: INITIAL_REAL_CAMPAIGN_BUDGET.policyVersion,
  triageReplayPlanVersion: TRIAGE_REPLAY_PLAN_VERSION,
  triageReplayPlanV2Version: TRIAGE_REPLAY_PLAN_V2_VERSION,
  semanticTriageEvidenceVersion: SEMANTIC_TRIAGE_EVIDENCE_VERSION,
  dossierV2Version: DOSSIER_VERSION_V2,
  semanticClusterVersion: SEMANTIC_CLUSTER_VERSION,
  semanticBundleVersion: SEMANTIC_CAMPAIGN_BUNDLE_VERSION,
  semanticReceiptVersion: SEMANTIC_EVALUATION_RECEIPT_VERSION,
  semanticExpectationDerivationVersion: REAL_SOURCE_DERIVATION_VERSION_V2,
};

export function syntheticSnapshots(): readonly CampaignSourceSnapshot[] {
  return RIPPLE_REPOSITORIES.map((repo) => ({
    repoId: repo.repoId,
    branch: (repo.trackingRef ?? 'origin/main').replace(/^origin\//, ''),
    headSha: repo.checkedOutSha,
    trackingRef: repo.trackingRef,
    trackingSha: repo.checkedOutSha,
    ahead: 0,
    behind: 0,
    dirty: false,
    dirtyFileCount: 0,
    sourceMapSha: repo.sourceMapSha,
    freshness: "LOCAL_TRACKING_REF_ONLY" as SourceFreshness,
    readOnly: true as const,
  }));
}

export function syntheticSourceWindow(): CampaignInput["sourceWindow"] {
  return {
    changesetId: changesetId({
      repoBaselines: RIPPLE_REPOSITORIES.map((repo) => ({
        repoId: repo.repoId,
        baseSha: repo.checkedOutSha,
        headSha: repo.checkedOutSha,
        mergeBase: repo.checkedOutSha,
        rangeSemantics: "BASE_SHA_TO_HEAD_SHA" as const,
        source: "LOCAL_COMMITTED_CHANGE" as const,
        dirtyExcluded: true,
      })),
      changedFiles: [],
      selectorVersion: SELECTOR_VERSION,
    }),
    baselines: RIPPLE_REPOSITORIES.map((repo) => ({
      repoId: repo.repoId,
      baseSha: repo.checkedOutSha,
      headSha: repo.checkedOutSha,
      dirtyExcluded: true as const,
    })),
    changedFiles: [] as readonly ChangedFile[],
    dirtyFiles: [],
    sourceWindow: "COMMITTED_ONLY" as const,
    deploymentStatus: "DEPLOYMENT_STATUS_UNRESOLVED" as const,
  };
}

/** Full portfolio-mode CampaignInput over an admitted binding (existing runtime). */
export function portfolioCampaignInput(
  binding: CampaignPortfolioRuntimeBinding | undefined,
): CampaignInput {
  const mappedBudget = binding === undefined
    ? INITIAL_REAL_CAMPAIGN_BUDGET
    : mapPortfolioBudget({ binding, initial: INITIAL_REAL_CAMPAIGN_BUDGET }).policy;
  return {
    mode: "BASELINE_HEALTH",
    createdAt: STATIC_NOW,
    sourceSnapshots: syntheticSnapshots(),
    sourceWindow: syntheticSourceWindow(),
    changeset: null,
    phase3Selection: null,
    seedCorpusVersion: "nightwatch.phase7.real-dev-seeds.v1",
    seedSet: [...REAL_SEEDS],
    safeActions: RIPPLE_PHASE4_ACTIONS,
    explorationEnvelopes: RIPPLE_PHASE4_ENVELOPES,
    apiOperations: PHASE5_API_CATALOG.operations,
    versions: VERSIONS,
    budgetPolicy: mappedBudget,
    privacyPolicy: PRIVACY_POLICY,
    ...(binding === undefined ? {} : { portfolioBinding: binding }),
  };
}

export interface ExecutorCounts {
  preflight: number;
  execute: number;
}

export interface CountingExecutorOptions {
  readonly preflightCode?: "PREFLIGHT_PASS" | "OWNER_POLICY_BLOCKED";
  readonly throwOnExecute?: boolean;
}

/** Counting/throwing SYNTHETIC executor (no browser/network/product contact). */
export function countingExecutor(counts: ExecutorCounts, options: CountingExecutorOptions = {}) {
  return {
    preflight: () => {
      counts.preflight += 1;
      if (options.preflightCode === "OWNER_POLICY_BLOCKED") {
        return { passed: false, code: "OWNER_POLICY_BLOCKED" as const, failedChecks: ["owner-scope-policy"], checkedAt: STATIC_NOW };
      }
      return { passed: true, code: "PREFLIGHT_PASS" as const, failedChecks: [], checkedAt: STATIC_NOW };
    },
    execute: async ({ workItem }: { readonly workItem: CampaignWorkItem }): Promise<CampaignExecutionOutcome> => {
      counts.execute += 1;
      if (options.throwOnExecute === true) throw new Error("SYNTHETIC_EXECUTOR_THROW");
      return {
        result: "PASS",
        safety: { productionAttempts: 0, proxyViolations: 0, unknownDestinations: 0, unknownApprovals: 0, productMutations: 0, actionCausedUnknown: 0, databaseQueries: 0, infrastructureQueries: 0, externalPublicationAttempts: 0 },
        privacy: { result: "PASS", rawBodiesPersisted: 0, customerValuesPersisted: 0, credentialsPersisted: 0, cookiesPersisted: 0, tokensPersisted: 0, domPersisted: 0, screenshotsPersisted: 0, authenticatedTracesPersisted: 0 },
        actionsExecuted: 1,
        apiExecutions: workItem.kind === "API" ? (workItem.replayPolicy === "FIRST_PLUS_FRESH_REPLAY" ? 2 : 1) : 0,
        browserContextCreated: workItem.kind !== "API",
        replay: false,
        observations: [] as readonly CampaignAnomalyCandidate[],
      };
    },
  };
}

export function makeTempStore(): { root: string; store: PrivateArtifactStore } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phase16ch-seam-"));
  return { root, store: new PrivateArtifactStore({ root }) };
}

export function removeTempStore(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

export {
  CampaignCheckpointStore,
  createCampaignManifest,
  prepareCampaign,
  resumeCampaign,
  validateCampaignManifest,
  type CampaignInput,
  type CampaignManifest,
  type CampaignPortfolioRuntimeBinding,
};
