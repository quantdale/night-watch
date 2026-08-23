// Phase 20 — additive integration with the Phase 19 coverage and planner
// layers. This module ranks semantic capability gaps; it never executes a
// campaign or grants owner authority.

import { buildCampaignCoverageReport } from "../campaignIntelligence/coverage";
import { buildCampaignPlan } from "../campaignIntelligence/planner";
import type {
  CampaignCandidateMetadata,
  CampaignCoverageFact,
  CampaignCoverageReport,
  CampaignImpactReport,
  CampaignPlan,
  CampaignReasonCode,
  CampaignSourceCurrentness,
} from "../campaignIntelligence/types";
import type { CampaignPortfolio as Portfolio } from "../portfolio/types";
import {
  safeSemanticDigest,
  type ContractCandidate,
  type ContractCurrentness,
  type ContractDiscoveryInventory,
  type ContractGraph,
} from "./types";
import type { SyntheticMutationMeasurement } from "./mutation";

export const SEMANTIC_CAMPAIGN_INTEGRATION_VERSION =
  "nightwatch.semantic-campaign-integration.v1" as const;

export type SemanticGapKind =
  | ContractGraph["gaps"][number]["gap"]
  | "MUTATION_SURVIVED"
  | "ANALYZER_REJECTED";

export interface SemanticCapabilityBinding {
  readonly capabilityId: string;
  readonly sourceCandidateId: string;
  readonly capabilityKind: "SOURCE_CONTRACT" | "RELATIONAL" | "DIFFERENTIAL" | "METAMORPHIC" | "MEMBERSHIP";
  readonly scenarioBound: boolean;
  readonly replaySupported: boolean;
  readonly replayReproduces: boolean;
  readonly minimizationSupported: boolean;
  readonly dossierExplainable: boolean;
  readonly observationSurfaceCount: number;
}

export interface SemanticCoverageMemberBinding {
  readonly candidateId: string;
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly expectationId: string | null;
  readonly scenarioBound: boolean;
  readonly replaySupported: boolean;
  readonly replayReproduces: boolean;
  readonly minimizationSupported: boolean;
  readonly triageClassifiable: boolean;
  readonly dossierExplainable: boolean;
  readonly supported: boolean;
}

export interface SemanticCoverageGapRow {
  readonly candidateId: string;
  readonly gap: SemanticGapKind;
  readonly reasonCode: CampaignReasonCode;
  readonly sourceCurrentness: ContractCurrentness;
  readonly sourceEvidenceDigest: string;
  readonly capabilityIds: readonly string[];
  readonly survivingMutantCount: number;
  readonly priorityComponents: {
    readonly impactPermille: number;
    readonly detectionGapPermille: number;
    readonly actionabilityPermille: number;
    readonly noveltyPermille: number;
  };
  readonly priorityPermille: number;
}

export interface SemanticCoverageGapReport {
  readonly schemaVersion: typeof SEMANTIC_CAMPAIGN_INTEGRATION_VERSION;
  readonly rows: readonly SemanticCoverageGapRow[];
  readonly reasonCounts: Readonly<Record<string, number>>;
  readonly discoveredCandidateCount: number;
  readonly mechanicallyProvableCandidateCount: number;
  readonly admittedCandidateCount: number;
  readonly staleCandidateCount: number;
  readonly survivingMutantCount: number;
  readonly differentialEligibleCount: number;
  readonly deterministicDigest: string;
}

export interface SemanticCampaignPlan {
  readonly schemaVersion: typeof SEMANTIC_CAMPAIGN_INTEGRATION_VERSION;
  readonly plan: CampaignPlan;
  readonly coverage: CampaignCoverageReport;
  readonly gapReport: SemanticCoverageGapReport;
  readonly composedCandidateCount: number;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_CAMPAIGN_INTEGRATION_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function boundedCount(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 2048) invalid(`${field}_COUNT`);
}

function currentnessForCampaign(value: ContractCurrentness): CampaignSourceCurrentness {
  if (value === "CURRENT") return "CURRENT";
  if (value === "SOURCE_UNAVAILABLE") return "UNAVAILABLE";
  return "STALE";
}

function candidateFor(inventory: ContractDiscoveryInventory, candidateId: string): ContractCandidate | undefined {
  return inventory.candidates.find((candidate) => candidate.candidateId === candidateId);
}

function capabilityFor(
  bindings: readonly SemanticCapabilityBinding[],
  candidateId: string,
): readonly SemanticCapabilityBinding[] {
  return bindings
    .filter((binding) => binding.sourceCandidateId === candidateId)
    .sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function survivingFor(
  measurement: SyntheticMutationMeasurement | undefined,
  bindings: readonly SemanticCapabilityBinding[],
  candidateId: string,
): number {
  if (measurement === undefined) return 0;
  const capabilityIds = new Set(capabilityFor(bindings, candidateId).map((binding) => binding.capabilityId));
  return measurement.rows.filter((row) => {
    if (!row.applicable || !row.expectedViolation || row.detected) return false;
    return capabilityIds.has(row.contractId) || row.contractId === candidateId || row.contractId.startsWith(`${candidateId}.`);
  }).length;
}

function reasonForGap(
  gap: SemanticGapKind,
  candidate: ContractCandidate,
  capabilityBindings: readonly SemanticCapabilityBinding[],
): CampaignReasonCode {
  if (gap === "MUTATION_SURVIVED") return "SURVIVING_MUTANT";
  if (gap === "ANALYZER_REJECTED") return "ANALYZER_UNSUPPORTED";
  if (candidate.currentness !== "CURRENT") return "STALE_CONTRACT_REDERIVATION";
  switch (gap) {
    case "REPLAY_GAP": return "REPLAY_GAP";
    case "MINIMIZATION_GAP": return "MINIMIZATION_GAP";
    case "SINGLE_SURFACE":
    case "DIFFERENTIAL_ELIGIBLE": return "DIFFERENTIAL_PROJECTION_GAP";
    case "DUPLICATE_COVERAGE": return "DUPLICATE_SEMANTIC_COVERAGE";
    case "NOT_PROJECTABLE":
      return capabilityBindings.some((binding) => binding.capabilityKind === "RELATIONAL")
        ? "RELATIONAL_ORACLE_GAP"
        : "DIFFERENTIAL_PROJECTION_GAP";
    case "UNEXERCISED":
    case "NOT_ADMITTED":
    case "HIGH_IMPACT_UNCOVERED": return "MECHANICALLY_PROVABLE_UNCOVERED";
    case "STALE_SOURCE": return "STALE_CONTRACT_REDERIVATION";
    case "ORPHANED_EXPECTATION": return "RELATIONAL_ORACLE_GAP";
  }
}

function priorityComponents(input: {
  readonly candidate: ContractCandidate;
  readonly gap: SemanticGapKind;
  readonly survivingMutants: number;
  readonly capabilityBindings: readonly SemanticCapabilityBinding[];
}): SemanticCoverageGapRow["priorityComponents"] {
  const impactPermille = Math.min(1000, Math.max(0, input.candidate.impactWeight * 200));
  const detectionGapPermille = input.survivingMutants > 0
    ? 1000
    : input.gap === "NOT_ADMITTED" || input.gap === "UNEXERCISED" || input.gap === "HIGH_IMPACT_UNCOVERED"
      ? 800
      : input.gap === "NOT_PROJECTABLE"
        ? 700
        : 450;
  const actionabilityPermille = input.gap === "REPLAY_GAP"
    ? 300
    : input.gap === "MINIMIZATION_GAP"
      ? 400
      : input.capabilityBindings.some((binding) => binding.dossierExplainable) ? 800 : 500;
  const noveltyPermille = input.gap === "DUPLICATE_COVERAGE"
    ? 100
    : input.gap === "SINGLE_SURFACE" || input.gap === "DIFFERENTIAL_ELIGIBLE" ? 900 : 650;
  return { impactPermille, detectionGapPermille, actionabilityPermille, noveltyPermille };
}

function priorityOf(components: SemanticCoverageGapRow["priorityComponents"]): number {
  return Math.floor(
    (components.impactPermille * 3
      + components.detectionGapPermille * 3
      + components.actionabilityPermille * 2
      + components.noveltyPermille * 2) / 10,
  );
}

/** Convert the graph and synthetic measurement into Phase 19 planner inputs. */
export function buildSemanticCoverageGapInputs(input: {
  readonly inventory: ContractDiscoveryInventory;
  readonly graph: ContractGraph;
  readonly capabilityBindings?: readonly SemanticCapabilityBinding[];
  readonly mutationMeasurement?: SyntheticMutationMeasurement;
}): SemanticCoverageGapReport {
  if (input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  if (input.graph.schemaVersion !== "nightwatch.semantic-contract-graph.v1") invalid("GRAPH_VERSION");
  const bindings = [...(input.capabilityBindings ?? [])].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
  const candidates = [...input.inventory.candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const rows = new Map<string, SemanticCoverageGapRow>();
  const add = (candidateId: string, gap: SemanticGapKind, capabilityIds: readonly string[] = [], survivingMutants = 0): void => {
    const candidate = candidateFor(input.inventory, candidateId);
    if (candidate === undefined) return;
    const candidateBindings = capabilityFor(bindings, candidateId);
    const components = priorityComponents({ candidate, gap, survivingMutants, capabilityBindings: candidateBindings });
    const reasonCode = reasonForGap(gap, candidate, candidateBindings);
    const key = `${candidateId}|${gap}|${reasonCode}`;
    const prior = rows.get(key);
    const mergedCapabilityIds = [...new Set([...(prior?.capabilityIds ?? []), ...capabilityIds])].sort();
    const mergedSurvivors = Math.max(prior?.survivingMutantCount ?? 0, survivingMutants);
    rows.set(key, {
      candidateId,
      gap,
      reasonCode,
      sourceCurrentness: candidate.currentness,
      sourceEvidenceDigest: candidate.source.evidenceDigest,
      capabilityIds: mergedCapabilityIds,
      survivingMutantCount: mergedSurvivors,
      priorityComponents: components,
      priorityPermille: priorityOf(components),
    });
  };

  for (const candidate of candidates) {
    if (candidate.rejectionCode !== null) add(candidate.candidateId, "ANALYZER_REJECTED");
  }
  for (const gap of input.graph.gaps) add(gap.contractId, gap.gap);
  for (const candidate of candidates) {
    const survivors = survivingFor(input.mutationMeasurement, bindings, candidate.candidateId);
    if (survivors > 0) {
      const capabilityIds = capabilityFor(bindings, candidate.candidateId).map((binding) => binding.capabilityId);
      add(candidate.candidateId, "MUTATION_SURVIVED", capabilityIds, survivors);
    }
  }

  const ordered = [...rows.values()].sort((left, right) => right.priorityPermille - left.priorityPermille || left.candidateId.localeCompare(right.candidateId) || left.gap.localeCompare(right.gap));
  const reasonCounts: Record<string, number> = {};
  for (const row of ordered) reasonCounts[row.reasonCode] = (reasonCounts[row.reasonCode] ?? 0) + 1;
  const core = {
    schemaVersion: SEMANTIC_CAMPAIGN_INTEGRATION_VERSION,
    rows: ordered,
    reasonCounts,
    discoveredCandidateCount: candidates.length,
    mechanicallyProvableCandidateCount: input.inventory.mechanicallyProvableCount,
    admittedCandidateCount: input.inventory.admittedCount,
    staleCandidateCount: candidates.filter((candidate) => candidate.currentness !== "CURRENT").length,
    survivingMutantCount: ordered.reduce((sum, row) => sum + row.survivingMutantCount, 0),
    differentialEligibleCount: input.graph.gaps.filter((gap) => gap.gap === "DIFFERENTIAL_ELIGIBLE").length,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "semantic-gaps") };
}

function gapReasonsForCandidate(gapReport: SemanticCoverageGapReport, candidateId: string): readonly CampaignReasonCode[] {
  return [...new Set(gapReport.rows.filter((row) => row.candidateId === candidateId).map((row) => row.reasonCode))].sort();
}

/** Build the existing Phase 19 coverage facts from lifecycle bindings. */
export function buildPhase20CoverageFacts(input: {
  readonly inventory: ContractDiscoveryInventory;
  readonly gapReport: SemanticCoverageGapReport;
  readonly memberBindings: readonly SemanticCoverageMemberBinding[];
  readonly mutationMeasurement?: SyntheticMutationMeasurement;
}): readonly CampaignCoverageFact[] {
  const candidates = new Map(input.inventory.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const used = new Set<string>();
  const facts: CampaignCoverageFact[] = [];
  for (const binding of [...input.memberBindings].sort((left, right) => left.memberId.localeCompare(right.memberId))) {
    safeId(binding.memberId, "MEMBER");
    safeId(binding.candidateId, "CANDIDATE");
    if (used.has(binding.memberId)) invalid("DUPLICATE_MEMBER");
    used.add(binding.memberId);
    const candidate = candidates.get(binding.candidateId);
    if (candidate === undefined) invalid("ORPHAN_MEMBER_BINDING");
    const mutationRows = input.mutationMeasurement?.rows.filter((row) => row.contractId === binding.candidateId || row.contractId.startsWith(`${binding.candidateId}.`)) ?? [];
    const defects = mutationRows.filter((row) => row.expectedViolation && row.applicable);
    const syntheticDetectionProven = candidate.coverage.syntheticDetectionProven || (defects.length > 0 && defects.every((row) => row.detected));
    const stale = currentnessForCampaign(candidate.currentness);
    facts.push({
      memberId: binding.memberId,
      product: binding.product,
      surface: binding.surface,
      semanticContractId: binding.candidateId,
      expectationId: binding.expectationId,
      sourceCurrentness: stale,
      sourceSurfaceExists: candidate.coverage.sourceSurfaceExists,
      sourceMechanicallyUnderstood: candidate.coverage.sourceMechanicallyUnderstood,
      semanticContractAdmitted: candidate.coverage.semanticContractAdmitted,
      syntheticDetectionProven,
      scenarioExercisesContract: candidate.coverage.scenarioExercisesContract || binding.scenarioBound,
      replayAvailable: candidate.coverage.replayAvailable || binding.replaySupported,
      replayReproduces: candidate.coverage.replayReproduces || binding.replayReproduces,
      minimizationSupported: candidate.coverage.minimizationSupported || binding.minimizationSupported,
      triageClassifiable: candidate.coverage.triageClassifiable && binding.triageClassifiable,
      dossierExplainable: candidate.coverage.dossierExplainable && binding.dossierExplainable,
      unsupported: !binding.supported || candidate.rejectionCode !== null,
      reasons: gapReasonsForCandidate(input.gapReport, binding.candidateId),
    });
  }
  return facts;
}

export function buildPhase20CoverageReport(input: Parameters<typeof buildPhase20CoverageFacts>[0]): CampaignCoverageReport {
  return buildCampaignCoverageReport({ facts: buildPhase20CoverageFacts(input) });
}

export interface SemanticCandidateBinding {
  readonly candidateId: string;
  readonly memberId: string;
}

/** Add Phase 20 gap reason codes to existing Phase 19 candidate metadata. */
export function augmentCampaignCandidates(input: {
  readonly candidates: readonly CampaignCandidateMetadata[];
  readonly gapReport: SemanticCoverageGapReport;
  readonly bindings?: readonly SemanticCandidateBinding[];
}): readonly CampaignCandidateMetadata[] {
  const candidateByMember = new Map((input.bindings ?? []).map((binding) => [binding.memberId, binding.candidateId]));
  return input.candidates.map((candidate) => {
    const semanticCandidateId = candidateByMember.get(candidate.memberId) ?? candidate.semanticContractId;
    const extra = semanticCandidateId === null || semanticCandidateId === undefined ? [] : gapReasonsForCandidate(input.gapReport, semanticCandidateId);
    return { ...candidate, semanticGapReasons: [...new Set([...(candidate.semanticGapReasons ?? []), ...extra])].sort() };
  });
}

/** Compose the additive semantic gaps through the existing Phase 19 planner. */
export function composeSemanticCampaignPlan(input: {
  readonly portfolio: Portfolio;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly impact: CampaignImpactReport;
  readonly coverage: CampaignCoverageReport;
  readonly candidates: readonly CampaignCandidateMetadata[];
  readonly gapReport: SemanticCoverageGapReport;
  readonly candidateBindings?: readonly SemanticCandidateBinding[];
  readonly maxSelectedItems?: number;
}): SemanticCampaignPlan {
  const candidates = augmentCampaignCandidates({ candidates: input.candidates, gapReport: input.gapReport, bindings: input.candidateBindings });
  const plan = buildCampaignPlan({
    portfolio: input.portfolio,
    sourceCurrentness: input.sourceCurrentness,
    impact: input.impact,
    coverage: input.coverage,
    candidates,
    maxSelectedItems: input.maxSelectedItems,
  });
  const core = {
    schemaVersion: SEMANTIC_CAMPAIGN_INTEGRATION_VERSION,
    plan,
    coverage: input.coverage,
    gapReport: input.gapReport,
    composedCandidateCount: candidates.length,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "semantic-campaign") };
}
