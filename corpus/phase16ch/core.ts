// ---------------------------------------------------------------------------
// Nightwatch Phase 16CH — adversarial corpus core.
//
// Outcome normalization, white-box forging helpers (mutate ONE field while
// keeping identities internally coherent so a SPECIFIC gate is isolated),
// scoped plan builders over the CURRENT real approved universe, and the
// shared scenario/floor vocabulary. Scenario groups live in sibling modules;
// index.ts combines and runs them.
//
// Every value is synthetic/structural; no credentials, no customer data, no
// wall clock in identity-bearing output. Pure module: no fs/network/browser.
// ---------------------------------------------------------------------------

import {
  allocatePortfolioBudget,
  buildCampaignPlanManifest,
  buildDevHandoffPackage,
  buildPortfolio,
} from "../../src/core/portfolio";
import type {
  CampaignPlanManifest,
  DevHandoffPackage,
} from "../../src/core/portfolio";
import type { PortfolioMemberInput } from "../../src/core/portfolio/types";
import type { CampaignPortfolioRuntimeBinding } from "../../src/core/campaign/types";
import { DEFAULT_ALLOCATION_POLICY } from "../phase16c/runtimeBindingFixtures";
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  DEV_HANDOFF_VERSION,
} from "../../src/core/portfolio/report";
import {
  admitPortfolioRuntimePlan,
  type RealApprovedUniverse,
} from "../../src/core/portfolio/runtimeBinding";
import { buildCurrentRealApprovedUniverse } from "../../src/core/portfolio/realUniverse";
import { campaignDigest } from "../../src/core/campaign/identity";
import { INITIAL_PROFILE_SNAPSHOT } from "../phase16c/runtimeBindingFixtures";

export const FIXTURE_AUTHORIZATION = DEV_HANDOFF_REQUIRED_AUTHORIZATION;
export { DEFAULT_ALLOCATION_POLICY, INITIAL_PROFILE_SNAPSHOT };

const SENTINEL_PATTERN =
  /(CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+[A-Za-z0-9._~+/=-]{8,}|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

export function sentinelLeak(value: string): boolean {
  return SENTINEL_PATTERN.test(value);
}

export function normalizeOutcome(error: unknown): string {
  if (error instanceof SyntaxError) return "SYNTAX_ERROR";
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("is not valid JSON")) return "SYNTAX_ERROR";
  const segments = message.split(":");
  const label = segments[0] ?? "";
  if (label === "PORTFOLIO_ADMISSION_REJECTED") return `REJECTED:${segments[1] ?? ""}`;
  if (
    label === "DEV_HANDOFF_INVALID" ||
    label === "PLAN_MANIFEST_INVALID" ||
    label === "PORTFOLIO_RUNTIME_PLAN_INVALID" ||
    label === "DEV_HANDOFF_UNKNOWN_FIELD" ||
    label === "PLAN_MANIFEST_UNKNOWN_FIELD" ||
    label === "PORTFOLIO_RUNTIME_PLAN_UNKNOWN_FIELD" ||
    label === "PORTFOLIO_BUDGET_MAPPING_INVALID"
  ) {
    return segments.length > 1 ? `${label}:${segments[1]}` : label;
  }
  return label;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
export { Mutable };
type DeeplyMutable<T> = { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : DeeplyMutable<T[K]> };
export type MutablePlanCore = DeeplyMutable<Omit<CampaignPlanManifest, "planId" | "manifestDigest">>;
export type MutableBinding = DeeplyMutable<CampaignPortfolioRuntimeBinding>;

/** Clone a plan manifest, mutate its identity core, recompute BOTH digests exactly like buildCampaignPlanManifest. */
export function reforgePlan(
  plan: CampaignPlanManifest,
  mutate: (core: MutablePlanCore) => void,
): CampaignPlanManifest {
  const core: MutablePlanCore = JSON.parse(JSON.stringify({
    manifestVersion: plan.manifestVersion,
    createdAtBasis: plan.createdAtBasis,
    portfolioDigest: plan.portfolioDigest,
    allocationDigest: plan.allocationDigest,
    scoreVersion: plan.scoreVersion,
    allocationVersion: plan.allocationVersion,
    selectedMembers: plan.selectedMembers,
    unselectedMembers: plan.unselectedMembers,
    totalAllocatedUnits: plan.totalAllocatedUnits,
    unallocatedUnits: plan.unallocatedUnits,
    checkpointPolicy: plan.checkpointPolicy,
    ownerScopeRequirements: plan.ownerScopeRequirements,
  }));
  mutate(core);
  const planId = `plan:sha256:${campaignDigest(core).slice(0, 24)}`;
  return {
    ...core,
    planId,
    manifestDigest: `plan:sha256:${campaignDigest({ ...core, planId }).slice(0, 24)}`,
  } as unknown as CampaignPlanManifest;
}

/** Handoff core shape used by reforgeHandoff (mirrors buildDevHandoffPackage). */
interface MutableHandoffCore {
  handoffVersion: typeof DEV_HANDOFF_VERSION;
  executable: false;
  requiredAuthorizationToken: string;
  environmentRestriction: string;
  planId: string;
  planManifestDigest: string;
  portfolioDigest: string;
  selectedMemberIds: readonly string[];
  totalAllocatedUnits: number;
  runtimeObligations: readonly string[];
}

/** Clone an inert handoff, mutate one field, recompute its digest exactly like buildDevHandoffPackage. */
export function reforgeHandoff(
  handoff: DevHandoffPackage,
  mutate: (core: MutableHandoffCore) => void,
): DevHandoffPackage {
  const core = JSON.parse(JSON.stringify({
    handoffVersion: DEV_HANDOFF_VERSION,
    executable: false as const,
    requiredAuthorizationToken: DEV_HANDOFF_REQUIRED_AUTHORIZATION,
    environmentRestriction: "DEV_ONLY_NEVER_PRODUCTION",
    planId: handoff.planId,
    planManifestDigest: handoff.planManifestDigest,
    portfolioDigest: handoff.portfolioDigest,
    selectedMemberIds: handoff.selectedMemberIds,
    totalAllocatedUnits: handoff.totalAllocatedUnits,
    runtimeObligations: handoff.runtimeObligations,
  })) as unknown as MutableHandoffCore & { executable: false };
  mutate(core);
  return {
    ...core,
    digest: `handoff:sha256:${campaignDigest(core).slice(0, 24)}`,
  } as unknown as DevHandoffPackage;
}

export const OTHER_PLAN_STYLE_ID = "plan:sha256:aaaaaaaaaaaaaaaaaaaaaaaa";
export const OTHER_PF_ID = "pf:sha256:bbbbbbbbbbbbbbbbbbbbbbbb";
export const OTHER_HANDOFF_ID = "handoff:sha256:cccccccccccccccccccccccc";
export const SYNTHETIC_MEMBER_ID = "pm:sha256:dddddddddddddddddddddddd";

export interface ScopedRuntimePlan {
  readonly universe: RealApprovedUniverse;
  readonly plan: CampaignPlanManifest;
  readonly handoff: DevHandoffPackage;
}

export interface ScopedPlanRequest {
  readonly kinds?: readonly ("JOURNEY" | "API" | "EXPLORATION")[];
  readonly targets?: readonly string[];
  readonly totalUnits?: number;
  readonly perMemberCeiling?: number;
}

/** Portfolio + allocation + plan + handoff restricted to the requested member scope. */
export function buildScopedRuntimePlan(request: ScopedPlanRequest = {}): ScopedRuntimePlan {
  const universe = buildCurrentRealApprovedUniverse();
  const kinds = new Set(request.kinds ?? ["JOURNEY", "API"]);
  const targets = new Set(request.targets ?? [...universe.approvedTargets]);
  const inputs: PortfolioMemberInput[] = universe.members
    .filter((member) => kinds.has(member.kind) && targets.has(member.targetId))
    .map((member) => modelInput(universe, member.memberId));
  const portfolio = buildPortfolio({ approvedTargets: [...targets], memberInputs: inputs });
  const allocation = allocatePortfolioBudget({
    portfolio,
    policy: {
      ...DEFAULT_ALLOCATION_POLICY,
      reservedExplorationUnits: kinds.has("EXPLORATION") ? DEFAULT_ALLOCATION_POLICY.reservedExplorationUnits : 0,
      ...(request.totalUnits === undefined ? {} : { totalUnits: request.totalUnits }),
      ...(request.perMemberCeiling === undefined ? {} : { perMemberCeiling: request.perMemberCeiling }),
    },
  });
  const plan = buildCampaignPlanManifest({ portfolio, allocation });
  const handoff = buildDevHandoffPackage(plan, portfolio.portfolioDigest);
  return { universe, plan, handoff };
}

function modelInput(universe: RealApprovedUniverse, memberId: string): PortfolioMemberInput {
  const modelMember = universe.portfolio.members.find((candidate) => candidate.memberId === memberId);
  if (modelMember === undefined) throw new Error(`fixture model member missing: ${memberId}`);
  return modelMember.input;
}

export function cloneUniverse(universe: RealApprovedUniverse): RealApprovedUniverse {
  return JSON.parse(JSON.stringify(universe)) as RealApprovedUniverse;
}

/** Pair scope: the payer-exchange journey+API pair (canonical default scope). */
export function pairScope(): ScopedRuntimePlan {
  return buildScopedRuntimePlan({ targets: ["ripple.payer-exchange.read"] });
}

export interface AdmitRequest {
  readonly universe: RealApprovedUniverse;
  readonly plan: CampaignPlanManifest;
  readonly handoff: DevHandoffPackage;
  readonly token?: string | null;
}

export function admit(input: AdmitRequest): () => string {
  return () => {
    try {
      admitPortfolioRuntimePlan({
        universe: input.universe,
        plan: input.plan,
        handoff: input.handoff,
        authorizationToken: input.token === undefined ? FIXTURE_AUTHORIZATION : input.token,
      });
      return "ADMITTED";
    } catch (error) {
      return normalizeOutcome(error);
    }
  };
}

export function parse(fn: () => unknown): () => string {
  return () => {
    try {
      fn();
      return "PARSE_OK";
    } catch (error) {
      return normalizeOutcome(error);
    }
  };
}

export function safe(fn: () => unknown): unknown {
  try {
    return fn();
  } catch (error) {
    return error;
  }
}

export interface HardeningScenario {
  readonly id: string;
  readonly group:
    | "ADMISSION_REASON"
    | "PARSER_HANDOFF"
    | "PARSER_PLAN"
    | "DOC_BOUNDARY"
    | "BUDGET_GRID"
    | "UNIVERSE_DESCRIPTOR"
    | "FINGERPRINT_FIELD";
  readonly expected: string;
  /** Runs the scenario and returns the normalized observed token. */
  readonly run: () => string;
}

export type FloorKey =
  | "unauthorizedAdmissionCount"
  | "syntheticTargetAdmittedCount"
  | "unmappedSelectedMemberCount"
  | "ambiguousBindingAcceptedCount"
  | "budgetExpansionCount"
  | "executorBeforeAdmissionCount"
  | "executorBeforeOwnerPolicyCount"
  | "resumeFingerprintEscapeCount"
  | "legacyCampaignRegressionCount"
  | "launcherRawLeakCount"
  | "privacyLeakCount"
  | "determinismMismatchCount"
  | "singleExecutorViolationCount";

export const FLOOR_KEYS: readonly FloorKey[] = [
  "unauthorizedAdmissionCount",
  "syntheticTargetAdmittedCount",
  "unmappedSelectedMemberCount",
  "ambiguousBindingAcceptedCount",
  "budgetExpansionCount",
  "executorBeforeAdmissionCount",
  "executorBeforeOwnerPolicyCount",
  "resumeFingerprintEscapeCount",
  "legacyCampaignRegressionCount",
  "launcherRawLeakCount",
  "privacyLeakCount",
  "determinismMismatchCount",
  "singleExecutorViolationCount",
];

export function emptyFloors(): Record<FloorKey, number> {
  return {
    unauthorizedAdmissionCount: 0,
    syntheticTargetAdmittedCount: 0,
    unmappedSelectedMemberCount: 0,
    ambiguousBindingAcceptedCount: 0,
    budgetExpansionCount: 0,
    executorBeforeAdmissionCount: 0,
    executorBeforeOwnerPolicyCount: 0,
    resumeFingerprintEscapeCount: 0,
    legacyCampaignRegressionCount: 0,
    launcherRawLeakCount: 0,
    privacyLeakCount: 0,
    determinismMismatchCount: 0,
    singleExecutorViolationCount: 0,
  };
}
