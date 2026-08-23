// ---------------------------------------------------------------------------
// Nightwatch Phase 16C — deterministic local/synthetic seam fixtures.
//
// Builders over the REAL approved universe (canonical registries) used by the
// Phase-16C suites. Every value is synthetic/structural; no credentials, no
// customer data, no wall clock in identity-bearing output, no fs/network.
// The Phase-16A synthetic-fixture identities are deliberately referenced ONLY
// as adversarial rejection inputs (never as universe members).
// ---------------------------------------------------------------------------

import {
  allocatePortfolioBudget,
  buildCampaignPlanManifest,
  buildDevHandoffPackage,
  type CampaignPlanManifest,
  type DevHandoffPackage,
} from "../../src/core/portfolio";
import {
  PORTFOLIO_BUDGET_MAPPING_VERSION,
  REAL_UNIVERSE_VERSION,
  admitPortfolioRuntimePlan,
  type InitialBudgetProfile,
  type RealApprovedUniverse,
} from "../../src/core/portfolio/runtimeBinding";
import {
  buildCurrentRealApprovedUniverse,
} from "../../src/core/portfolio/realUniverse";
import type { PortfolioMemberInput } from "../../src/core/portfolio/types";
import { buildPortfolio } from "../../src/core/portfolio/types";

export const RUNTIME_PLAN_DOCUMENT_VERSION =
  "nightwatch.portfolio-runtime-plan-document.v1" as const;

/** Default deterministic allocation policy (mirrors bin/portfolio.mjs). */
export const DEFAULT_ALLOCATION_POLICY = {
  policyVersion: "nightwatch.portfolio-allocation.v1",
  totalUnits: 24,
  perMemberCeiling: 6,
  floorUnits: 2,
  starvationThresholdBuckets: 5,
  retryCeilingPerMember: 1,
  reservedExplorationUnits: 3,
} as const;

export interface RuntimePlanDocument {
  readonly documentVersion: typeof RUNTIME_PLAN_DOCUMENT_VERSION;
  readonly handoff: DevHandoffPackage;
  readonly planManifest: CampaignPlanManifest;
}

/** Build the combined runtime-plan document (the launcher file format). */
export function buildRuntimePlanDocument(
  plan: CampaignPlanManifest,
  handoff: DevHandoffPackage,
): RuntimePlanDocument {
  return {
    documentVersion: RUNTIME_PLAN_DOCUMENT_VERSION,
    handoff,
    planManifest: plan,
  };
}

/**
 * Universe restricted to runtime-admissible kinds (JOURNEY/API only today).
 * Default scope is the canonical payer-exchange PAIR (journey + linked API):
 * small enough that the deterministic allocator fully selects it, keeping
 * journey-lineage completeness structural rather than budget-dependent.
 */
export function admissibleUniversePortfolio(
  universe: RealApprovedUniverse,
  scope: { readonly targetId?: string } = {},
) {
  const targetId = scope.targetId ?? "ripple.payer-exchange.read";
  const admissibleInputs = universe.members
    .filter((member) => member.runtimeAdmissible)
    .filter((member) => member.targetId === targetId)
    .map((member) => memberInputFromUniverse(universe, member.memberId));
  return buildPortfolio({
    approvedTargets: universe.approvedTargets,
    memberInputs: admissibleInputs,
  });
}

function memberInputFromUniverse(
  universe: RealApprovedUniverse,
  memberId: string,
): PortfolioMemberInput {
  const member = universe.members.find((candidate) => candidate.memberId === memberId);
  if (member === undefined) throw new Error("fixture member missing");
  // The universe builder derived these inputs through
  // validatePortfolioMemberInput; find them again through the model portfolio.
  const modelMember = universe.portfolio.members.find((candidate) => candidate.memberId === memberId);
  if (modelMember === undefined) throw new Error("fixture model member missing");
  return modelMember.input;
}

/** Full pipeline: universe -> portfolio -> allocation -> plan -> handoff doc. */
export function buildAdmissibleRuntimePlan(input?: {
  readonly universe?: RealApprovedUniverse;
  readonly totalUnits?: number;
  readonly perMemberCeiling?: number;
}): {
  readonly universe: RealApprovedUniverse;
  readonly plan: CampaignPlanManifest;
  readonly handoff: DevHandoffPackage;
  readonly document: RuntimePlanDocument;
} {
  const universe = input?.universe ?? buildCurrentRealApprovedUniverse();
  const portfolio = admissibleUniversePortfolio(universe);
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: {
      ...DEFAULT_ALLOCATION_POLICY,
      ...(input?.totalUnits === undefined ? {} : { totalUnits: input.totalUnits }),
      ...(input?.perMemberCeiling === undefined ? {} : { perMemberCeiling: input.perMemberCeiling }),
    },
  });
  const plan = buildCampaignPlanManifest({ portfolio, allocation });
  const handoff = buildDevHandoffPackage(plan, portfolio.portfolioDigest);
  return { universe, plan, handoff, document: buildRuntimePlanDocument(plan, handoff) };
}
/** Admit with the exact owner authorization class token. */
export function admitFixture(input: {
  readonly universe: RealApprovedUniverse;
  readonly plan: CampaignPlanManifest;
  readonly handoff: DevHandoffPackage;
  readonly token?: string | null;
}) {
  return admitPortfolioRuntimePlan({
    universe: input.universe,
    plan: input.plan,
    handoff: input.handoff,
    authorizationToken: input.token === undefined ? "PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED" : input.token,
  });
}

/** Numeric profile of the current bounded real campaign budget (test view). */
export const INITIAL_PROFILE_SNAPSHOT: InitialBudgetProfile = {
  policyVersion: "nightwatch.campaign-budget.private.v1",
  maxTotalBrowserContexts: 6,
  maxJourneyContexts: 3,
  maxExplorationContexts: 0,
  maxApiExecutions: 6,
  maxReplays: 8,
  maxMinimizationCandidates: 4,
  maxTotalActions: 24,
  maxRuntimeMs: 15 * 60 * 1000,
  maxPerTestTimeoutMs: 120 * 1000,
  maxPromotedClusters: 1,
  maxPrivateEvidenceBytes: 10 * 1024 * 1024,
};

export const FIXTURE_TOKEN = "PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED";
export const VERSION_TOKENS = {
  realUniverseVersion: REAL_UNIVERSE_VERSION,
  budgetMappingVersion: PORTFOLIO_BUDGET_MAPPING_VERSION,
};
