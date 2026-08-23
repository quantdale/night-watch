// ---------------------------------------------------------------------------
// Nightwatch Phase 16C — portfolio runtime binding core (W1/W2/W3/W4).
//
// Deterministic, fail-closed bridge from the hardened Phase-16A/16H planning
// artifacts (portfolio -> allocation -> plan manifest -> inert DEV handoff)
// into the EXISTING Phase-7 campaign prepare/resume architecture.
//
// Hard invariants:
//   - the real approved universe is DERIVED from canonical current registries
//     (supplied here as a pure descriptor); synthetic fixture identities can
//     never enter it;
//   - admission verifies exact handoff/plan/universe coherence and consumes
//     the separately supplied authorization value; authorization NEVER rewrites
//     plan identity, members, budgets, order, or safety policy;
//   - the source handoff remains executable:false — this module only freezes
//     digests and bound identities; no execution authority exists here;
//   - budget mapping is monotone-restrictive: elementwise min() against the
//     currently approved bounded real profile; a unit value cannot create
//     permission, only restrict existing capability;
//   - selected members bind exactly once onto EXISTING campaign work-item
//     identities (`journey:`/`api:`/`explore:`) via canonical linkage.
//
// Pure module: no fs/network/child-process/browser/AI/DB/selfDev/persistence,
// no wall clock, no randomness. Canonical serialization reuses campaignDigest.
// ---------------------------------------------------------------------------

import {
  CAMPAIGN_PORTFOLIO_RUNTIME_BINDING_VERSION,
  type CampaignPortfolioBoundMember,
  type CampaignPortfolioBudgetCaps,
  type CampaignPortfolioRuntimeBinding,
} from "../campaign/types";
import { campaignDigest } from "../campaign/identity";
import type { DepthClass } from "../../oracles/expectations/coverageInventory";
import {
  REDACTED_ERROR_DETAIL,
  assertExactKeys,
  assertNonNegativeInteger,
  assertString,
  requireRuntimeArray,
  requireRuntimeRecord,
} from "../campaign/runtimeValidation";
import type { JourneyId } from "../changeIntelligence/types";
import {
  PORTFOLIO_MEMBER_KINDS,
  buildPortfolio,
  isPortfolioMemberId,
  portfolioMemberId,
  portfolioTextSafe,
  validatePortfolioMemberInput,
  type CampaignPortfolio,
  type PortfolioMemberInput,
  type PortfolioMemberKind,
} from "./types";
import {
  CAMPAIGN_PLAN_MANIFEST_VERSION,
  parseCampaignPlanManifestDocument,
  type CampaignPlanManifest,
} from "./manifest";
import {
  DEV_HANDOFF_REQUIRED_AUTHORIZATION,
  DEV_HANDOFF_VERSION,
  type DevHandoffPackage,
} from "./report";

export { DEV_HANDOFF_REQUIRED_AUTHORIZATION, DEV_HANDOFF_VERSION };
import { portfolioEligibility } from "./scoring";

// ---------------------------------------------------------------------------
// Versioned identity constants (W7).
// ---------------------------------------------------------------------------

/** Real approved universe builder identity version. */
export const REAL_UNIVERSE_VERSION =
  "nightwatch.portfolio-real-universe.v1" as const;

/** Portfolio-unit -> runtime-budget mapping policy version (W3). */
export const PORTFOLIO_BUDGET_MAPPING_VERSION =
  "nightwatch.portfolio-budget-mapping.v1" as const;

/**
 * The binding schema version is owned by campaign/types.ts so manifest
 * validation has a single literal authority; re-exported for operator
 * ergonomics.
 */
export const PORTFOLIO_RUNTIME_BINDING_VERSION =
  CAMPAIGN_PORTFOLIO_RUNTIME_BINDING_VERSION;

// ---------------------------------------------------------------------------
// Error vocabulary (bounded categorical codes only).
// ---------------------------------------------------------------------------

export const ERR_PORTFOLIO_ADMISSION = "PORTFOLIO_ADMISSION_REJECTED";

export const PORTFOLIO_ADMISSION_REASONS = [
  "AUTHORIZATION_MISSING",
  "AUTHORIZATION_MISMATCH",
  "HANDOFF_NOT_INERT",
  "HANDOFF_TOKEN_CLASS_MISMATCH",
  "HANDOFF_ENVIRONMENT_INVALID",
  "PLAN_VERSION_MISMATCH",
  "PLAN_ID_MISMATCH",
  "MANIFEST_DIGEST_MISMATCH",
  "PORTFOLIO_DIGEST_MISMATCH",
  "MEMBER_LIST_MISMATCH",
  "TOTAL_UNITS_MISMATCH",
  "TARGET_UNKNOWN",
  "SYNTHETIC_TARGET_REJECTED",
  "DUPLICATE_TARGET_MAPPING",
  "MEMBER_BLOCKED",
  "MEMBER_EVIDENCE_STALE",
  "MEMBER_EVIDENCE_UNAVAILABLE",
  "MEMBER_RUNTIME_RESTRICTED",
  "MEMBER_LINEAGE_INCOMPLETE",
  "WORK_ITEM_MAPPING_AMBIGUOUS",
  "PLAN_EMPTY_SELECTION",
  "BUDGET_OVERSUBSCRIBED",
  "UNIVERSE_EMPTY",
] as const;
export type PortfolioAdmissionReason =
  (typeof PORTFOLIO_ADMISSION_REASONS)[number];

function admissionError(reason: PortfolioAdmissionReason): never {
  throw new Error(`${ERR_PORTFOLIO_ADMISSION}:${reason}:${REDACTED_ERROR_DETAIL}`);
}

// ---------------------------------------------------------------------------
// W1 — real approved universe (pure builder over a canonical descriptor).
// ---------------------------------------------------------------------------

/** One canonical runtime linkage row supplied by the descriptor. */
export interface RealUniverseLinkageRow {
  readonly targetId: string;
  readonly journeyId: JourneyId;
  readonly envelopeId: string;
  readonly seed: string;
}

/** Per-target contract evidence derived from canonical registries. */
export interface RealUniverseTargetContract {
  readonly targetId: string;
  readonly depthClass: DepthClass;
  /** Runtime/recipe contract version participating in member identity. */
  readonly contractVersion: string | null;
  readonly derivationVersion: string | null;
}

/** Pure descriptor assembled from canonical registries by realUniverse.ts. */
export interface RealApprovedUniverseDescriptor {
  /** Registry versions that participate in universe identity (sorted). */
  readonly registryVersions: readonly string[];
  readonly linkage: readonly RealUniverseLinkageRow[];
  readonly contracts: readonly RealUniverseTargetContract[];
  /**
   * Member kinds that are currently NOT runtime-fundable under the approved
   * bounded real profile (e.g. exploration when its context budget is 0).
   * Represented explicitly — never silently dropped.
   */
  readonly runtimeRestrictedKinds: readonly PortfolioMemberKind[];
  readonly runtimeRestrictionCode: string;
}

/** One deterministic real-universe member. */
export interface RealApprovedUniverseMember {
  readonly memberId: string;
  readonly targetId: string;
  readonly kind: PortfolioMemberKind;
  readonly journeyId: string | null;
  readonly envelopeId: string | null;
  readonly apiOperationId: string | null;
  readonly seed: string | null;
  /** Existing campaign work-item identity this member binds to. */
  readonly workItemId: string;
  readonly runtimeAdmissible: boolean;
  readonly runtimeRestrictionCode: string | null;
}

/** The deterministic real approved universe snapshot (in-memory; not durable). */
export interface RealApprovedUniverse {
  readonly version: typeof REAL_UNIVERSE_VERSION;
  readonly digest: string;
  /** Sorted unique canonical target ids (authority proof surface). */
  readonly approvedTargets: readonly string[];
  readonly members: readonly RealApprovedUniverseMember[];
  /** The Phase-16A model portfolio built from these members' inputs. */
  readonly portfolio: CampaignPortfolio;
}

const UNIVERSE_SEMANTIC_SCOPE_SUFFIX = ".runtime";

function workItemIdentityFor(
  kind: PortfolioMemberKind,
  row: RealUniverseLinkageRow,
): string {
  if (kind === "JOURNEY") return `journey:${row.journeyId}`;
  // The canonical target identity IS the approved Phase-5 operation id.
  if (kind === "API") return `api:${row.targetId}`;
  return `explore:${row.envelopeId}:${row.seed}`;
}

/**
 * Build the deterministic real approved universe from a canonical descriptor.
 * Fails closed on empty linkage, unknown contracts, duplicate identities, or
 * any non-canonical shape. Synthetic fixture identities are absent by
 * construction: every member derives from a canonical linkage row.
 */
export function buildRealApprovedUniverse(
  descriptor: RealApprovedUniverseDescriptor,
): RealApprovedUniverse {
  if (descriptor.linkage.length === 0) throw new Error(`${ERR_PORTFOLIO_ADMISSION}:UNIVERSE_EMPTY:${REDACTED_ERROR_DETAIL}`);
  if (descriptor.registryVersions.length === 0) throw new Error(`${ERR_PORTFOLIO_ADMISSION}:UNIVERSE_EMPTY:${REDACTED_ERROR_DETAIL}`);
  for (const version of descriptor.registryVersions) {
    if (!/^nightwatch\.[a-z0-9.-]+\.v[0-9]+$/.test(version)) {
      throw new Error(`${ERR_PORTFOLIO_ADMISSION}:UNIVERSE_EMPTY:${REDACTED_ERROR_DETAIL}`);
    }
  }
  const restricted = new Set<string>(descriptor.runtimeRestrictedKinds);
  for (const kind of restricted) {
    if (!(PORTFOLIO_MEMBER_KINDS as readonly string[]).includes(kind)) {
      throw new Error(`${ERR_PORTFOLIO_ADMISSION}:UNIVERSE_EMPTY:${REDACTED_ERROR_DETAIL}`);
    }
  }

  const contractByTarget = new Map(
    descriptor.contracts.map((contract) => [contract.targetId, contract]),
  );
  const seenWorkItems = new Set<string>();
  const seenMembers = new Set<string>();
  const memberInputs: PortfolioMemberInput[] = [];
  const members: RealApprovedUniverseMember[] = [];

  for (const row of descriptor.linkage) {
    const contract = contractByTarget.get(row.targetId);
    if (contract === undefined || contract.targetId !== row.targetId) {
      throw new Error(`${ERR_PORTFOLIO_ADMISSION}:TARGET_UNKNOWN:${REDACTED_ERROR_DETAIL}`);
    }
    for (const kind of ["JOURNEY", "API", "EXPLORATION"] as const) {
      const workItemId = workItemIdentityFor(kind, row);
      if (seenWorkItems.has(workItemId)) {
        throw new Error(`${ERR_PORTFOLIO_ADMISSION}:WORK_ITEM_MAPPING_AMBIGUOUS:${REDACTED_ERROR_DETAIL}`);
      }
      seenWorkItems.add(workItemId);
      // Deterministic member input: identity comes from target+journey+kind+scope.
      // The member id is the CANONICAL portfolio member id (single identity
      // authority shared with the model portfolio below).
      const semanticScope = `${row.targetId}${UNIVERSE_SEMANTIC_SCOPE_SUFFIX}`;
      const memberId = portfolioMemberId({
        targetId: row.targetId,
        journeyId: row.journeyId,
        kind,
        semanticScope,
      });
      if (seenMembers.has(memberId)) {
        throw new Error(`${ERR_PORTFOLIO_ADMISSION}:DUPLICATE_TARGET_MAPPING:${REDACTED_ERROR_DETAIL}`);
      }
      seenMembers.add(memberId);
      const admissible = !restricted.has(kind);
      const memberInput = {
        targetId: row.targetId,
        journeyId: row.journeyId,
        kind,
        semanticScope,
        currentness: "CURRENT" as const,
        sourceSha: null,
        evidenceDigest:
          contract.contractVersion === null
            ? null
            : `ev:sha256:${campaignDigest({
                targetId: contract.targetId,
                contractVersion: contract.contractVersion,
                derivationVersion: contract.derivationVersion,
                depthClass: contract.depthClass,
              }).slice(0, 24)}`,
        derivationVersion: contract.derivationVersion,
        contractVersion: contract.contractVersion,
        depthClass: contract.depthClass,
        replayable: true,
        executionCostClass:
          kind === "API" ? ("LOW" as const) : ("MEDIUM" as const),
        starvationAgeBuckets: 0,
        historicalYield: {
          admittedCount: 0,
          reproducedCount: 0,
          minimizedCount: 0,
          distinctClusterCount: 0,
          dossierReadyCount: 0,
          duplicateMerges: 0,
          invalidOrTransient: 0,
          executionsTotal: 0,
        },
        ownerBlockedOperations: [] as readonly string[],
        phaseFrozen: false,
      };
      validatePortfolioMemberInput(memberInput);
      memberInputs.push(memberInput);
      members.push({
        memberId,
        targetId: row.targetId,
        kind,
        journeyId: row.journeyId,
        envelopeId: kind === "EXPLORATION" ? row.envelopeId : null,
        apiOperationId: kind === "API" ? row.targetId : null,
        seed: kind === "EXPLORATION" ? row.seed : null,
        workItemId,
        runtimeAdmissible: admissible,
        runtimeRestrictionCode: admissible ? null : descriptor.runtimeRestrictionCode,
      });
    }
  }

  const portfolio = buildPortfolio({
    approvedTargets: [...new Set(descriptor.linkage.map((row) => row.targetId))],
    memberInputs,
  });
  members.sort((left, right) => left.memberId.localeCompare(right.memberId));
  const approvedTargets = [...new Set(descriptor.linkage.map((row) => row.targetId))]
    .sort((left, right) => left.localeCompare(right));
  const digestSource = {
    universeVersion: REAL_UNIVERSE_VERSION,
    registryVersions: [...descriptor.registryVersions].sort((a, b) => a.localeCompare(b)),
    runtimeRestrictedKinds: [...restricted].sort((a, b) => a.localeCompare(b)),
    runtimeRestrictionCode: descriptor.runtimeRestrictionCode,
    members: members.map((member) => ({
      memberId: member.memberId,
      workItemId: member.workItemId,
      runtimeAdmissible: member.runtimeAdmissible,
      runtimeRestrictionCode: member.runtimeRestrictionCode,
    })),
  };
  return {
    version: REAL_UNIVERSE_VERSION,
    digest: `pf:sha256:${campaignDigest(digestSource).slice(0, 24)}`,
    approvedTargets,
    members,
    portfolio,
  };
}

// ---------------------------------------------------------------------------
// W2 — strict handoff parsing + admission.
// ---------------------------------------------------------------------------

const HANDOFF_DOCUMENT_KEYS = [
  "handoffVersion",
  "executable",
  "requiredAuthorizationToken",
  "environmentRestriction",
  "planId",
  "planManifestDigest",
  "portfolioDigest",
  "selectedMemberIds",
  "totalAllocatedUnits",
  "runtimeObligations",
  "digest",
] as const;

const HANDOFF_ID_RE = /^handoff:sha256:[a-f0-9]{24}$/;
const PLAN_ID_RE = /^plan:sha256:[a-f0-9]{24}$/;
const PF_ID_RE = /^pf:sha256:[a-f0-9]{24}$/;

/**
 * Strictly parse a rendered DevHandoffPackage document. Fails closed on
 * unknown fields, version drift, a non-inert executable marker, weakened
 * environment restriction, non-canonical member lists, and digest mismatch.
 */
export function parseDevHandoffPackageDocument(value: unknown): DevHandoffPackage {
  const record = requireRuntimeRecord(value, "DEV_HANDOFF_INVALID");
  assertExactKeys(record, HANDOFF_DOCUMENT_KEYS, "DEV_HANDOFF_UNKNOWN_FIELD");
  if (record.handoffVersion !== DEV_HANDOFF_VERSION) throw new Error("DEV_HANDOFF_INVALID:handoffVersion");
  if (record.executable !== false) throw new Error("DEV_HANDOFF_INVALID:not-inert");
  assertString(record.requiredAuthorizationToken, "DEV_HANDOFF_INVALID:token");
  if (record.requiredAuthorizationToken !== DEV_HANDOFF_REQUIRED_AUTHORIZATION) throw new Error("DEV_HANDOFF_INVALID:token-class");
  if (record.environmentRestriction !== "DEV_ONLY_NEVER_PRODUCTION") throw new Error("DEV_HANDOFF_INVALID:environment");
  for (const [field, pattern] of [
    ["planId", PLAN_ID_RE],
    ["planManifestDigest", PLAN_ID_RE],
    ["portfolioDigest", PF_ID_RE],
    ["digest", HANDOFF_ID_RE],
  ] as const) {
    const raw = record[field];
    if (typeof raw !== "string" || !pattern.test(raw)) throw new Error(`DEV_HANDOFF_INVALID:${field}`);
  }
  assertNonNegativeInteger(record.totalAllocatedUnits, "DEV_HANDOFF_INVALID:units");
  const memberIds = requireRuntimeArray(record.selectedMemberIds, "DEV_HANDOFF_INVALID:members");
  const seen = new Set<string>();
  // Member ids appear in admitted PLAN order (not globally sorted); enforce
  // only identity format and uniqueness.
  for (const entry of memberIds) {
    assertString(entry, "DEV_HANDOFF_INVALID:member");
    if (!isPortfolioMemberId(entry) || seen.has(entry)) throw new Error("DEV_HANDOFF_INVALID:member");
    seen.add(entry);
  }
  const obligations = requireRuntimeArray(record.runtimeObligations, "DEV_HANDOFF_INVALID:obligations");
  const expectedObligations = [
    "OWNER_POLICY_GATE_REQUIRED",
    "CONTAINMENT_STACK_REQUIRED",
    "CHECKPOINT_RESUME_REQUIRED",
    "NO_PRODUCTION_CONTACT",
    "FINDINGS_OWNER_LOCAL_ONLY",
  ];
  if (obligations.length !== expectedObligations.length || obligations.some((entry: unknown, index: number) => entry !== expectedObligations[index])) {
    throw new Error("DEV_HANDOFF_INVALID:obligations");
  }
  // Digest recomputation must match the producer byte-for-byte.
  const core = {
    handoffVersion: record.handoffVersion as typeof DEV_HANDOFF_VERSION,
    executable: false as const,
    requiredAuthorizationToken: record.requiredAuthorizationToken as typeof DEV_HANDOFF_REQUIRED_AUTHORIZATION,
    environmentRestriction: "DEV_ONLY_NEVER_PRODUCTION" as const,
    planId: record.planId as string,
    planManifestDigest: record.planManifestDigest as string,
    portfolioDigest: record.portfolioDigest as string,
    selectedMemberIds: memberIds as readonly string[],
    totalAllocatedUnits: record.totalAllocatedUnits as number,
    runtimeObligations: expectedObligations as unknown as readonly [
      "OWNER_POLICY_GATE_REQUIRED",
      "CONTAINMENT_STACK_REQUIRED",
      "CHECKPOINT_RESUME_REQUIRED",
      "NO_PRODUCTION_CONTACT",
      "FINDINGS_OWNER_LOCAL_ONLY",
    ],
  };
  const digest = `handoff:sha256:${campaignDigest(core).slice(0, 24)}`;
  if (digest !== record.digest) throw new Error("DEV_HANDOFF_INVALID:digestRecomputationMismatch");
  return { ...core, digest };
}

/**
 * Strictly parse BOTH runtime-plan documents (handoff + plan manifest) and
 * verify they belong together before admission sees them. This is the single
 * document-level gate for the launcher file format.
 */
export function parsePortfolioRuntimePlanDocument(value: unknown): {
  readonly handoff: DevHandoffPackage;
  readonly plan: CampaignPlanManifest;
} {
  const record = requireRuntimeRecord(value, "PORTFOLIO_RUNTIME_PLAN_INVALID");
  assertExactKeys(record, ["documentVersion", "handoff", "planManifest"], "PORTFOLIO_RUNTIME_PLAN_UNKNOWN_FIELD");
  if (record.documentVersion !== "nightwatch.portfolio-runtime-plan-document.v1") {
    throw new Error("PORTFOLIO_RUNTIME_PLAN_INVALID:documentVersion");
  }
  return {
    handoff: parseDevHandoffPackageDocument(requireRuntimeRecord(record.handoff, "PORTFOLIO_RUNTIME_PLAN_INVALID:handoff")),
    plan: parseCampaignPlanManifestDocument(requireRuntimeRecord(record.planManifest, "PORTFOLIO_RUNTIME_PLAN_INVALID:planManifest")),
  };
}

function arraysExactlyMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Strict portfolio admission (W2). Consumes an already strictly parsed inert
 * handoff + plan manifest, the real approved universe, and the SEPARATELY
 * SUPPLIED authorization value. Returns the frozen runtime binding.
 *
 * Authorization permits consumption ONLY: it never mutates the plan, members,
 * budgets, ordering, or safety policy. Every rejection uses one bounded
 * categorical reason code; arbitrary detail is redacted.
 */
export function admitPortfolioRuntimePlan(input: {
  readonly handoff: DevHandoffPackage;
  readonly plan: CampaignPlanManifest;
  readonly universe: RealApprovedUniverse;
  /** Separately supplied runtime authorization value (owner decision token). */
  readonly authorizationToken: string | null | undefined;
}): CampaignPortfolioRuntimeBinding {
  const { handoff, plan, universe } = input;

  // --- Authorization first: consumption point for the runtime token class. ---
  if (input.authorizationToken === null || input.authorizationToken === undefined || input.authorizationToken.trim() === "") {
    admissionError("AUTHORIZATION_MISSING");
  }
  if (input.authorizationToken !== DEV_HANDOFF_REQUIRED_AUTHORIZATION) {
    admissionError("AUTHORIZATION_MISMATCH");
  }

  // --- Inert-handoff safety facts. ---
  if (handoff.executable !== false) admissionError("HANDOFF_NOT_INERT");
  if (handoff.requiredAuthorizationToken !== DEV_HANDOFF_REQUIRED_AUTHORIZATION) admissionError("HANDOFF_TOKEN_CLASS_MISMATCH");
  if (handoff.environmentRestriction !== "DEV_ONLY_NEVER_PRODUCTION") admissionError("HANDOFF_ENVIRONMENT_INVALID");

  // --- Exact handoff/plan coherence. ---
  if (plan.manifestVersion !== CAMPAIGN_PLAN_MANIFEST_VERSION) admissionError("PLAN_VERSION_MISMATCH");
  if (handoff.planId !== plan.planId) admissionError("PLAN_ID_MISMATCH");
  if (handoff.planManifestDigest !== plan.manifestDigest) admissionError("MANIFEST_DIGEST_MISMATCH");
  if (handoff.portfolioDigest !== plan.portfolioDigest) admissionError("PORTFOLIO_DIGEST_MISMATCH");
  if (handoff.totalAllocatedUnits !== plan.totalAllocatedUnits) admissionError("TOTAL_UNITS_MISMATCH");

  // --- Universe membership. ---
  if (universe.members.length === 0 || universe.approvedTargets.length === 0) admissionError("UNIVERSE_EMPTY");
  const universeByMemberId = new Map(universe.members.map((member) => [member.memberId, member]));
  const universeByWorkItem = new Map(universe.members.map((member) => [member.workItemId, member]));

  const planMemberIds = plan.selectedMembers.map((member) => member.memberId);
  if (plan.selectedMembers.length === 0) admissionError("PLAN_EMPTY_SELECTION");
  if (!arraysExactlyMatch([...handoff.selectedMemberIds].sort((a, b) => a.localeCompare(b)), [...planMemberIds].sort((a, b) => a.localeCompare(b))) || handoff.selectedMemberIds.length !== planMemberIds.length) {
    admissionError("MEMBER_LIST_MISMATCH");
  }

  const boundMembers: CampaignPortfolioBoundMember[] = [];
  const seenKindTargets = new Set<string>();
  const seenWorkItems = new Set<string>();
  const boundJourneys = new Set<string>();
  const nonJourneyJourneys: string[] = [];
  for (const planMember of plan.selectedMembers) {
    const universeMember = universeByMemberId.get(planMember.memberId);
    if (universeMember === undefined || universeMember.targetId !== planMember.targetId || universeMember.kind !== planMember.kind) {
      // A member id that resolves inside the fixture/demo corpus instead of
      // the real universe is exactly the synthetic-target case.
      admissionError("SYNTHETIC_TARGET_REJECTED");
    }
    if (!universe.approvedTargets.includes(planMember.targetId)) {
      admissionError("TARGET_UNKNOWN");
    }
    const kindTargetKey = `${planMember.targetId}|${planMember.kind}`;
    if (seenKindTargets.has(kindTargetKey)) {
      // Cross-kind members of one target are legitimate distinct identities;
      // a repeated (target, kind) pair is not.
      admissionError("DUPLICATE_TARGET_MAPPING");
    }
    seenKindTargets.add(kindTargetKey);
    if (seenWorkItems.has(universeMember.workItemId)) {
      admissionError("WORK_ITEM_MAPPING_AMBIGUOUS");
    }
    seenWorkItems.add(universeMember.workItemId);
    if (planMember.kind !== "JOURNEY") nonJourneyJourneys.push(universeMember.journeyId ?? "");
    else boundJourneys.add(universeMember.journeyId ?? "");

    // Defense-in-depth gates against blocked/frozen/stale members even though
    // the planner already hard-gates them.
    const portfolioMember = universe.portfolio.members.find((candidate) => candidate.memberId === planMember.memberId);
    if (portfolioMember === undefined) admissionError("TARGET_UNKNOWN");
    const eligibility = portfolioEligibility(portfolioMember!);
    if (!eligibility.eligible) {
      if (eligibility.reasonCode === "PHASE_FROZEN" || eligibility.reasonCode === "OWNER_POLICY_BLOCKED") admissionError("MEMBER_BLOCKED");
      if (eligibility.reasonCode === "CURRENTNESS_STALE") admissionError("MEMBER_EVIDENCE_STALE");
      if (eligibility.reasonCode === "SOURCE_UNAVAILABLE" || eligibility.reasonCode === "EVIDENCE_NOT_EVALUATED" || eligibility.reasonCode === "EVIDENCE_MISSING") admissionError("MEMBER_EVIDENCE_UNAVAILABLE");
      admissionError("MEMBER_BLOCKED");
    }
    if (!universeMember.runtimeAdmissible) admissionError("MEMBER_RUNTIME_RESTRICTED");

    const ambiguity = universeByWorkItem.get(universeMember.workItemId);
    if (ambiguity === undefined || ambiguity.memberId !== universeMember.memberId) admissionError("WORK_ITEM_MAPPING_AMBIGUOUS");

    boundMembers.push({
      memberId: planMember.memberId,
      targetId: planMember.targetId,
      kind: planMember.kind,
      planOrder: planMember.order,
      allocatedUnits: planMember.allocatedUnits,
      maxRetries: planMember.maxRetries,
      journeyId: universeMember.journeyId,
      envelopeId: universeMember.envelopeId,
      apiOperationId: universeMember.apiOperationId,
      seed: universeMember.seed,
      workItemId: universeMember.workItemId,
    });
  }
  boundMembers.sort((left, right) => left.planOrder - right.planOrder);

  // Every linked API/exploration member requires its anchor journey member in
  // the same plan (existing campaign lineage is journey-anchored).
  for (const journeyId of nonJourneyJourneys) {
    if (!boundJourneys.has(journeyId)) admissionError("MEMBER_LINEAGE_INCOMPLETE");
  }

  // --- W3: versioned monotone-restrictive budget mapping. ---
  const caps = derivePortfolioBudgetCaps({
    members: boundMembers,
    totalAllocatedUnits: plan.totalAllocatedUnits,
  });

  return {
    schemaVersion: CAMPAIGN_PORTFOLIO_RUNTIME_BINDING_VERSION,
    planId: plan.planId,
    planManifestVersion: plan.manifestVersion,
    planManifestDigest: plan.manifestDigest,
    portfolioDigest: plan.portfolioDigest,
    handoffVersion: handoff.handoffVersion,
    handoffDigest: handoff.digest,
    realUniverseVersion: universe.version,
    realUniverseDigest: universe.digest,
    budgetMappingVersion: PORTFOLIO_BUDGET_MAPPING_VERSION,
    requiredAuthorizationClass: DEV_HANDOFF_REQUIRED_AUTHORIZATION,
    environmentRestriction: "DEV_ONLY_NEVER_PRODUCTION",
    executableAtRest: false,
    members: boundMembers,
    budgetCaps: caps.caps,
  };
}

// ---------------------------------------------------------------------------
// W3 — versioned monotone-restrictive budget mapping.
// ---------------------------------------------------------------------------

/** Numeric dimensions of the currently approved bounded real profile. */
export interface InitialBudgetProfile {
  readonly policyVersion?: string;
  readonly maxTotalBrowserContexts: number;
  readonly maxJourneyContexts: number;
  readonly maxExplorationContexts: number;
  readonly maxApiExecutions: number;
  readonly maxReplays: number;
  readonly maxMinimizationCandidates: number;
  readonly maxTotalActions: number;
  readonly maxRuntimeMs: number;
  readonly maxPerTestTimeoutMs: number;
  readonly maxPromotedClusters: number;
  readonly maxPrivateEvidenceBytes: number;
}

interface DeriveCapsInput {
  readonly members: readonly CampaignPortfolioBoundMember[];
  readonly totalAllocatedUnits: number;
}

interface DerivedCaps {
  readonly caps: CampaignPortfolioBudgetCaps;
}

function assertValidUnitValue(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`PORTFOLIO_BUDGET_MAPPING_INVALID:${label}`);
  }
}

/**
 * Structural constant of mapping v1: every derived cap embeds the
 * promoted-cluster reproduction reserve exactly once.
 */
const PROMOTED_RESERVE_V1 = 1;

/**
 * ONE deterministic mapping policy from portfolio allocations onto runtime
 * budget caps. mapped(D) = min(initial(D), derived(D)) for every mapped
 * dimension — provably never expanding the currently approved profile.
 *
 * derived(D):
 *   browser contexts := bound journeys + bound explorations + promoted reserve
 *   journey contexts := bound journeys
 *   exploration ctx  := bound explorations (admission rejects them today)
 *   api executions   := 2 per bound API (first + fresh replay) + promoted reserve
 *   total actions    := max(total allocated units, mandatory actions floor)
 *
 * Unmapped dimensions keep the initial values (restriction-only policy).
 */
export function mapPortfolioBudget<T extends InitialBudgetProfile>(input: {
  readonly binding: Pick<CampaignPortfolioRuntimeBinding, "members" | "budgetCaps">;
  readonly initial: T;
}): {
  readonly policy: T;
  readonly expansionViolations: readonly string[];
} {
  const { initial } = input;
  const caps = input.binding.budgetCaps;
  const violations: string[] = [];
  const pairs: readonly (readonly [number, number, string])[] = [
    [caps.maxTotalBrowserContexts, initial.maxTotalBrowserContexts, "maxTotalBrowserContexts"],
    [caps.maxJourneyContexts, initial.maxJourneyContexts, "maxJourneyContexts"],
    [caps.maxExplorationContexts, initial.maxExplorationContexts, "maxExplorationContexts"],
    [caps.maxApiExecutions, initial.maxApiExecutions, "maxApiExecutions"],
    [caps.maxTotalActions, initial.maxTotalActions, "maxTotalActions"],
  ];
  for (const [mapped, initialValue, name] of pairs) {
    assertValidUnitValue(mapped, name);
    if (mapped > initialValue) violations.push(name);
  }
  const policy = {
    ...initial,
    maxTotalBrowserContexts: Math.min(caps.maxTotalBrowserContexts, initial.maxTotalBrowserContexts),
    maxJourneyContexts: Math.min(caps.maxJourneyContexts, initial.maxJourneyContexts),
    maxExplorationContexts: Math.min(caps.maxExplorationContexts, initial.maxExplorationContexts),
    maxApiExecutions: Math.min(caps.maxApiExecutions, initial.maxApiExecutions),
    maxTotalActions: Math.min(caps.maxTotalActions, initial.maxTotalActions),
  };
  return { policy: policy as T, expansionViolations: violations };
}

function derivePortfolioBudgetCaps(input: DeriveCapsInput): DerivedCaps {
  const journeys = input.members.filter((member) => member.kind === "JOURNEY").length;
  const apis = input.members.filter((member) => member.kind === "API").length;
  const explorations = input.members.filter((member) => member.kind === "EXPLORATION").length;
  for (const member of input.members) {
    assertValidUnitValue(member.allocatedUnits, "allocatedUnits");
    assertValidUnitValue(member.maxRetries, "maxRetries");
  }
  assertValidUnitValue(input.totalAllocatedUnits, "totalAllocatedUnits");
  const derivedActionsFloor = journeys + explorations + PROMOTED_RESERVE_V1;
  const totalActions = Math.max(input.totalAllocatedUnits, derivedActionsFloor);
  return {
    caps: {
      maxTotalBrowserContexts: journeys + explorations + PROMOTED_RESERVE_V1,
      maxJourneyContexts: journeys,
      maxExplorationContexts: explorations,
      maxApiExecutions: 2 * apis + PROMOTED_RESERVE_V1,
      maxTotalActions: totalActions,
    },
  };
}

/**
 * Feasibility guard over the derived caps using the same arithmetic as
 * analyzeCampaignBudgetFeasibility (kept local to stay pure): mandatory work +
 * promoted reserve must fit the mapped caps, otherwise the plan is honestly
 * oversubscribed under the restrictive rule and admission fails closed.
 */
/**
 * Feasibility guard over the derived caps using the same arithmetic as
 * analyzeCampaignBudgetFeasibility (kept local to stay pure): mandatory work +
 * promoted reserve must fit the MAPPED caps (elementwise min against the
 * initial approved profile), otherwise the plan is honestly oversubscribed
 * under the restrictive rule and the prepare seam fails closed.
 *
 * Phase-16CH DEF-01 repair: the v1 derived caps embed PROMOTED_RESERVE_V1
 * exactly once per dimension, so the needed amounts are computed by stripping
 * that embedded reserve first and re-applying the reservation once — the
 * previous form compared reserve-inclusive caps against themselves plus the
 * reserve again, which rejected every API-bearing shape (and could never fire
 * for browser/actions) regardless of the documented mapping-v1 feasibility
 * boundary (at most TWO linked APIs under the bounded profile).
 */
export function assertPortfolioBudgetFeasible(input: {
  readonly caps: CampaignPortfolioBudgetCaps;
  readonly initial: Pick<
    InitialBudgetProfile,
    | "maxPromotedClusters"
    | "maxTotalBrowserContexts"
    | "maxApiExecutions"
    | "maxTotalActions"
  >;
}): void {
  const journeys = input.caps.maxJourneyContexts;
  const explorations = input.caps.maxExplorationContexts;
  const browserNeeded = journeys + explorations;
  const apiNeeded = Math.max(0, input.caps.maxApiExecutions - PROMOTED_RESERVE_V1);
  const reserve = input.initial.maxPromotedClusters;
  const mappedTotalBrowserContexts = Math.min(
    input.caps.maxTotalBrowserContexts,
    input.initial.maxTotalBrowserContexts,
  );
  const mappedApiExecutions = Math.min(
    input.caps.maxApiExecutions,
    input.initial.maxApiExecutions,
  );
  const mappedTotalActions = Math.min(
    input.caps.maxTotalActions,
    input.initial.maxTotalActions,
  );
  if (browserNeeded + reserve > mappedTotalBrowserContexts) {
    admissionError("BUDGET_OVERSUBSCRIBED");
  }
  if (apiNeeded > 0 && apiNeeded + reserve > mappedApiExecutions) {
    admissionError("BUDGET_OVERSUBSCRIBED");
  }
  if (browserNeeded + reserve > mappedTotalActions) {
    admissionError("BUDGET_OVERSUBSCRIBED");
  }
}
