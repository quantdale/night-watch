// Phase 19 — unified deterministic campaign planner.
//
// This composes the established portfolio identity/eligibility/score model
// with source impact and the new staged coverage report. The planner is only a
// selector: the owner scope marker remains frozen and the returned plan has no
// execution authority.

import {
  portfolioEligibility,
  scorePortfolioMember,
  type PortfolioPreviousProvenance,
} from "../portfolio/scoring";
import type { CampaignPortfolio, PortfolioMember } from "../portfolio/types";
import {
  type CampaignCandidateMetadata,
  type CampaignCoverageReport,
  type CampaignDiversityDimensions,
  type CampaignImpactReport,
  type CampaignPlan,
  type CampaignPlanItem,
  type CampaignPlanPriority,
  type CampaignReasonCode,
  type CampaignSourceCurrentness,
  CAMPAIGN_SOURCE_CURRENTNESS,
  CAMPAIGN_COST_CATEGORIES,
  CAMPAIGN_DIVERSITY_DIMENSIONS,
  CAMPAIGN_PLAN_VERSION,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
  safeCampaignDigest,
} from "./types";

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_PLAN_INVALID:${reason}`);
}

const SAFE_METADATA_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

const MAX_MECHANICAL_COUNT = 64;
const REDUNDANCY_DEFERRED_PENALTY_PERMILLE = 100_000;

function safeMetadata(value: string | null, field: string): void {
  if (value === null) return;
  if (typeof value !== "string" || !SAFE_METADATA_RE.test(value)) invalid(`${field}_TOKEN`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function validateCandidateMetadata(metadata: CampaignCandidateMetadata): void {
  safeMetadata(metadata.memberId, "MEMBER");
  safeMetadata(metadata.product, "PRODUCT");
  safeMetadata(metadata.surface, "SURFACE");
  safeMetadata(metadata.journeyClass, "JOURNEY");
  safeMetadata(metadata.apiClass, "API");
  safeMetadata(metadata.semanticContractId, "CONTRACT");
  if (!Array.isArray(metadata.oracleFamilies) || metadata.oracleFamilies.length > 64) invalid("ORACLE_FAMILIES");
  for (const family of metadata.oracleFamilies) safeMetadata(family, "ORACLE");
  if (typeof metadata.applicable !== "boolean" || typeof metadata.supported !== "boolean") invalid("CANDIDATE_BOOLEAN");
  if (!Array.isArray(metadata.provenance) || metadata.provenance.length > 64) invalid("PROVENANCE");
  for (const provenance of metadata.provenance) safeMetadata(provenance, "PROVENANCE");
  if (metadata.semanticGapReasons !== undefined) {
    if (!Array.isArray(metadata.semanticGapReasons) || metadata.semanticGapReasons.length > 64) invalid("SEMANTIC_GAP_REASONS");
    for (const reason of metadata.semanticGapReasons) safeMetadata(reason, "SEMANTIC_GAP_REASON");
  }
  for (const [value, field] of [
    [metadata.semanticContractCount, "SEMANTIC_CONTRACT_COUNT"],
    [metadata.relationCount, "RELATION_COUNT"],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > MAX_MECHANICAL_COUNT)) invalid(field);
  }
  if (metadata.proofConfidence !== undefined) boundedScore(metadata.proofConfidence, "PROOF_CONFIDENCE");
  if (metadata.redundancyKey !== undefined) safeMetadata(metadata.redundancyKey, "REDUNDANCY_KEY");
  validateDiversityDimensions(metadata.diversityDimensions);
}

function validateDiversityDimensions(value: CampaignCandidateMetadata["diversityDimensions"]): void {
  if (value === undefined) return;
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid("DIVERSITY_DIMENSIONS");
  for (const key of Object.keys(value)) {
    if (!(CAMPAIGN_DIVERSITY_DIMENSIONS as readonly string[]).includes(key)) invalid("DIVERSITY_DIMENSION_KEY");
  }
  for (const dimension of CAMPAIGN_DIVERSITY_DIMENSIONS) {
    const dimensionValue = value[dimension];
    if (dimensionValue !== undefined) safeMetadata(dimensionValue, `DIVERSITY_${dimension.toUpperCase()}`);
  }
}

function boundedScore(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 5) invalid(`${field}_SCORE`);
  return value;
}

function boundedCount(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_MECHANICAL_COUNT) invalid(`${field}_COUNT`);
  return value;
}

function sortedReasons(values: readonly CampaignReasonCode[]): CampaignReasonCode[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function impactReasonsFor(
  member: PortfolioMember,
  impact: CampaignImpactReport["rows"][number] | undefined,
): CampaignReasonCode[] {
  if (impact === undefined) return [];
  const values = impact.reasons.map((reason) => reason.code);
  if (impact.affected && values.length === 0) values.push("CHANGED_SOURCE_ADJACENCY");
  if (impact.currentness === "STALE") values.push("STALE_SEMANTIC_AUTHORITY");
  if (impact.currentness === "UNAVAILABLE" || impact.currentness === "MISSING") values.push("SOURCE_UNAVAILABLE");
  if (member.input.semanticScope && impact.semanticContractId === member.input.semanticScope && impact.affected) values.push("CHANGED_CONTRACT");
  return sortedReasons(values);
}

function coverageReasonsFor(
  coverage: CampaignCoverageReport["rows"][number] | undefined,
  metadata: CampaignCandidateMetadata,
): CampaignReasonCode[] {
  const defaults: readonly CampaignReasonCode[] = coverage === undefined ? ["SEMANTIC_COVERAGE_DEFICIT"] : coverage.gapReasons;
  return sortedReasons([...defaults, ...(metadata.semanticGapReasons ?? [])]);
}

function hasReason(values: readonly CampaignReasonCode[], ...reasons: readonly CampaignReasonCode[]): boolean {
  return reasons.some((reason) => values.includes(reason));
}

function costDivisor(cost: CampaignPlanItem["costCategory"]): number {
  return cost === "LOW" ? 1 : cost === "MEDIUM" ? 2 : 4;
}

function stageState(
  coverage: CampaignCoverageReport["rows"][number] | undefined,
  stage: string,
): string {
  return coverage?.stages.find((entry) => entry.stage === stage)?.state ?? "GAP";
}

function sourceChangeSignal(reasons: readonly CampaignReasonCode[]): number {
  if (hasReason(reasons, "CHANGED_CONTRACT")) return 5;
  if (hasReason(reasons, "CHANGED_RESPONSE_SHAPE", "CHANGED_ORACLE_BINDING")) return 4;
  if (hasReason(reasons, "CHANGED_REQUEST_SHAPE", "CHANGED_ROUTE")) return 3;
  if (hasReason(reasons, "CHANGED_SOURCE_ADJACENCY")) return 2;
  return reasons.length > 0 ? 1 : 0;
}

function anomalyDensity(member: PortfolioMember): number {
  const clusters = member.input.historicalYield.distinctClusterCount;
  if (clusters <= 0) return 0;
  if (clusters === 1) return 1;
  if (clusters === 2) return 2;
  if (clusters <= 4) return 3;
  if (clusters <= 8) return 4;
  return 5;
}

function portfolioScoreSignal(value: number): number {
  if (!Number.isFinite(value)) invalid("PORTFOLIO_SCORE");
  if (value <= 0) return 0;
  if (value < 10) return 1;
  if (value < 25) return 2;
  if (value < 40) return 3;
  if (value < 60) return 4;
  return 5;
}

function replayConfidence(
  member: PortfolioMember,
  coverage: CampaignCoverageReport["rows"][number] | undefined,
): number {
  if (!member.input.replayable) return 0;
  if (stageState(coverage, "REPLAY_REPRODUCES") === "PROVEN") return 5;
  if (stageState(coverage, "REPLAY_AVAILABLE") === "PROVEN") return 4;
  return 2;
}

function semanticDensity(metadata: CampaignCandidateMetadata): number {
  const contracts = boundedCount(
    metadata.semanticContractCount ?? (metadata.semanticContractId === null ? 0 : 1),
    "SEMANTIC_CONTRACT",
  );
  return boundedScore(Math.min(5, contracts + Math.min(3, new Set(metadata.oracleFamilies).size)), "SEMANTIC_DENSITY");
}

function relationDensity(metadata: CampaignCandidateMetadata): number {
  const relationCount = metadata.relationCount ?? metadata.oracleFamilies.filter((family) => /RELATION/i.test(family)).length;
  return boundedScore(Math.min(5, boundedCount(relationCount, "RELATION") ), "RELATION_DENSITY");
}

function proofConfidence(metadata: CampaignCandidateMetadata): number {
  if (metadata.proofConfidence !== undefined) return boundedScore(metadata.proofConfidence, "PROOF_CONFIDENCE");
  if (!metadata.applicable || !metadata.supported) return 0;
  if (metadata.semanticContractId !== null && metadata.oracleFamilies.length > 0) return 5;
  if (metadata.semanticContractId !== null) return 4;
  return 2;
}

function fallbackDiversityDimensions(
  member: PortfolioMember,
  metadata: CampaignCandidateMetadata,
  impactReasons: readonly CampaignReasonCode[],
): CampaignDiversityDimensions {
  const supplied = metadata.diversityDimensions ?? {};
  const sourceChangeCluster = impactReasons.find((reason) => reason.startsWith("CHANGED_")) ?? null;
  return {
    repository: supplied.repository ?? metadata.product,
    routeFamily: supplied.routeFamily ?? metadata.surface,
    entityType: supplied.entityType ?? metadata.semanticContractId ?? metadata.surface,
    semanticInvariant: supplied.semanticInvariant ?? metadata.semanticContractId ?? (metadata.oracleFamilies[0] ?? null),
    journeyType: supplied.journeyType ?? metadata.journeyClass ?? member.input.kind,
    interfaceType: supplied.interfaceType ?? metadata.apiClass,
    sourceChangeCluster: supplied.sourceChangeCluster ?? sourceChangeCluster,
  };
}

function redundancyKeyFor(member: PortfolioMember, metadata: CampaignCandidateMetadata): string {
  return metadata.redundancyKey ?? safeCampaignDigest({
    memberKind: member.input.kind,
    product: metadata.product,
    surface: metadata.surface,
    journeyClass: metadata.journeyClass,
    apiClass: metadata.apiClass,
    semanticContractId: metadata.semanticContractId,
  }, "campaign-redundancy");
}

function candidateMetadata(
  member: PortfolioMember,
  metadata: CampaignCandidateMetadata | undefined,
): CampaignCandidateMetadata {
  if (metadata !== undefined) return metadata;
  return {
    memberId: member.memberId,
    product: "unknown",
    surface: member.input.targetId,
    journeyClass: member.input.journeyId ?? member.input.targetId,
    apiClass: null,
    semanticContractId: member.input.semanticScope || null,
    oracleFamilies: [],
    applicable: true,
    supported: false,
    provenance: ["MISSING_METADATA"],
  };
}

function priorityFor(input: {
  readonly member: PortfolioMember;
  readonly metadata: CampaignCandidateMetadata;
  readonly impactReasons: readonly CampaignReasonCode[];
  readonly coverageReasons: readonly CampaignReasonCode[];
  readonly coverage: CampaignCoverageReport["rows"][number] | undefined;
  readonly basePortfolioScore: number;
}): CampaignPlanPriority {
  const { member, metadata, impactReasons, coverageReasons, coverage, basePortfolioScore } = input;
  const surfaceRelevance = boundedScore(
    hasReason(impactReasons, "CHANGED_CONTRACT") ? 5
      : hasReason(impactReasons, "CHANGED_ROUTE", "CHANGED_REQUEST_SHAPE", "CHANGED_RESPONSE_SHAPE") ? 4
        : impactReasons.length > 0 ? 3
          : coverageReasons.length > 0 ? 2 : 1,
    "SURFACE_RELEVANCE",
  );
  const priorClusters = member.input.historicalYield.distinctClusterCount;
  const defectProbability = boundedScore(
    hasReason(impactReasons, "CHANGED_CONTRACT", "CHANGED_RESPONSE_SHAPE") ? 5
      : priorClusters > 0 ? 4
        : metadata.semanticContractId !== null ? 2 : 1,
    "DEFECT_PROBABILITY",
  );
  const detectionPower = boundedScore(
    metadata.oracleFamilies.length > 0 && stageState(coverage, "SYNTHETIC_DETECTION_PROVEN") === "PROVEN" ? 5
      : metadata.oracleFamilies.length > 0 ? 3 : 1,
    "DETECTION_POWER",
  );
  const replay = member.input.replayable && stageState(coverage, "REPLAY_AVAILABLE") === "PROVEN";
  const actionable = replay && stageState(coverage, "TRIAGE_CLASSIFIABLE") === "PROVEN"
    ? (stageState(coverage, "MINIMIZATION_SUPPORTED") === "PROVEN" && stageState(coverage, "DOSSIER_EXPLAINABLE") === "PROVEN" ? 5 : 4)
    : replay ? 3 : 1;
  const actionability = boundedScore(actionable, "ACTIONABILITY");
  const costCategory = member.input.executionCostClass;
  if (!CAMPAIGN_COST_CATEGORIES.includes(costCategory)) invalid("COST_CATEGORY");
  const executionCost = costDivisor(costCategory);
  const semanticDensityValue = semanticDensity(metadata);
  const relationDensityValue = relationDensity(metadata);
  const sourceChangeSignalValue = boundedScore(sourceChangeSignal(impactReasons), "SOURCE_CHANGE_SIGNAL");
  const proofConfidenceValue = proofConfidence(metadata);
  const explorationAgeValue = boundedScore(Math.min(5, member.input.starvationAgeBuckets), "EXPLORATION_AGE");
  const anomalyDensityValue = anomalyDensity(member);
  const replayConfidenceValue = replayConfidence(member, coverage);
  const redundancyPenaltyValue = boundedScore(Math.min(5, member.duplicatePressure), "REDUNDANCY_PENALTY");
  const portfolioScoreSignalValue = boundedScore(portfolioScoreSignal(basePortfolioScore), "PORTFOLIO_SCORE_SIGNAL");

  // This is an additive score on purpose.  A zero in one dimension must not
  // erase independently valuable source-change, proof, age, or anomaly
  // signals.  Every weight is an integer and the resulting terms remain
  // inspectable in the returned component fields.
  const numerator =
    surfaceRelevance * 80 +
    defectProbability * 70 +
    detectionPower * 60 +
    actionability * 55 +
    semanticDensityValue * 32 +
    relationDensityValue * 36 +
    sourceChangeSignalValue * 72 +
    proofConfidenceValue * 24 +
    explorationAgeValue * 20 +
    anomalyDensityValue * 48 +
    replayConfidenceValue * 22 +
    portfolioScoreSignalValue * 18 -
    redundancyPenaltyValue * 42;
  const priorityPermille = Math.max(0, Math.floor((numerator * 1000) / executionCost));
  return {
    surfaceRelevance,
    defectProbability,
    detectionPower,
    actionability,
    executionCost,
    semanticDensity: semanticDensityValue,
    relationDensity: relationDensityValue,
    sourceChangeSignal: sourceChangeSignalValue,
    proofConfidence: proofConfidenceValue,
    explorationAge: explorationAgeValue,
    anomalyDensity: anomalyDensityValue,
    replayConfidence: replayConfidenceValue,
    redundancyPenalty: redundancyPenaltyValue,
    portfolioScoreSignal: portfolioScoreSignalValue,
    numerator,
    priorityPermille,
    basePortfolioScore,
  };
}

function reasonsFor(input: {
  readonly member: PortfolioMember;
  readonly metadata: CampaignCandidateMetadata;
  readonly impactReasons: readonly CampaignReasonCode[];
  readonly coverageReasons: readonly CampaignReasonCode[];
  readonly coverage: CampaignCoverageReport["rows"][number] | undefined;
}): CampaignReasonCode[] {
  const values: CampaignReasonCode[] = [...input.impactReasons, ...input.coverageReasons];
  if (input.member.input.historicalYield.distinctClusterCount > 0) values.push("HISTORICALLY_PRODUCTIVE_ORACLE");
  if (input.member.input.historicalYield.distinctClusterCount === 0 && input.metadata.semanticContractId !== null) values.push("PREVIOUSLY_UNEXPLORED_CONTRACT");
  if (input.metadata.oracleFamilies.length > 0) values.push("ORACLE_DETECTION_POWER");
  if (input.member.input.replayable && stageState(input.coverage, "REPLAY_AVAILABLE") === "PROVEN") values.push("REPLAY_SUPPORTED");
  if (!input.member.input.replayable) values.push("NO_DETERMINISTIC_REPLAY");
  if (stageState(input.coverage, "MINIMIZATION_SUPPORTED") === "PROVEN") values.push("MINIMIZATION_SUPPORTED");
  if (input.member.duplicatePressure > 0) values.push("REDUNDANT_COVERAGE");
  if (input.member.input.executionCostClass === "HIGH" && input.member.input.historicalYield.distinctClusterCount === 0) values.push("EXPENSIVE_LOW_YIELD");
  if ((input.metadata.semanticGapReasons ?? []).length > 0) values.push("CAMPAIGN_AUTO_COMPOSED");
  if (!input.metadata.supported) values.push("UNSUPPORTED_SURFACE");
  return sortedReasons(values);
}

function candidateId(member: PortfolioMember, metadata: CampaignCandidateMetadata): string {
  return safeCampaignDigest({
    schemaVersion: CAMPAIGN_PLAN_VERSION,
    memberId: member.memberId,
    metadata,
  }, "candidate");
}

/** Build the unified plan. Every excluded item carries explicit gate/budget reasons. */
export function buildCampaignPlan(input: {
  readonly portfolio: CampaignPortfolio;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly impact: CampaignImpactReport;
  readonly coverage: CampaignCoverageReport;
  readonly candidates: readonly CampaignCandidateMetadata[];
  readonly previousProvenance?: Readonly<Record<string, PortfolioPreviousProvenance>>;
  readonly maxSelectedItems?: number;
}): CampaignPlan {
  if (!CAMPAIGN_SOURCE_CURRENTNESS.includes(input.sourceCurrentness)) invalid("SOURCE_CURRENTNESS");
  if (input.impact.schemaVersion !== "nightwatch.campaign-impact-report.v1") invalid("IMPACT_VERSION");
  if (input.coverage.schemaVersion !== "nightwatch.campaign-coverage.v1") invalid("COVERAGE_VERSION");
  if (input.maxSelectedItems !== undefined && (!Number.isInteger(input.maxSelectedItems) || input.maxSelectedItems < 0 || input.maxSelectedItems > 1024)) invalid("MAX_SELECTED_ITEMS");
  if (!Array.isArray(input.candidates) || input.candidates.length > 1024) invalid("CANDIDATE_COUNT");
  const metadataByMember = new Map<string, CampaignCandidateMetadata>();
  for (const metadata of input.candidates) {
    validateCandidateMetadata(metadata);
    if (metadataByMember.has(metadata.memberId)) invalid("DUPLICATE_CANDIDATE_METADATA");
    metadataByMember.set(metadata.memberId, metadata);
  }
  const impactByMember = new Map(input.impact.rows.map((row) => [row.memberId, row]));
  const coverageByMember = new Map(input.coverage.rows.map((row) => [row.memberId, row]));
  const items: CampaignPlanItem[] = [];
  for (const member of input.portfolio.members) {
    const metadata = candidateMetadata(member, metadataByMember.get(member.memberId));
    const impactReasons = impactReasonsFor(member, impactByMember.get(member.memberId));
    const coverage = coverageByMember.get(member.memberId);
    const coverageReasons = coverageReasonsFor(coverage, metadata);
    const baseScore = scorePortfolioMember(member, input.previousProvenance?.[member.memberId] ?? null);
    const priority = priorityFor({ member, metadata, impactReasons, coverageReasons, coverage, basePortfolioScore: baseScore.total });
    const diversityDimensions = fallbackDiversityDimensions(member, metadata, impactReasons);
    const redundancyKey = redundancyKeyFor(member, metadata);
    const reasons = reasonsFor({ member, metadata, impactReasons, coverageReasons, coverage });
    const hardExclusions: CampaignReasonCode[] = [];
    const eligibility = portfolioEligibility(member);
    if (!eligibility.eligible) hardExclusions.push(eligibility.reasonCode);
    if (metadataByMember.get(member.memberId) === undefined) hardExclusions.push("MISSING_CANDIDATE_METADATA");
    if (!metadata.applicable) hardExclusions.push("NOT_APPLICABLE");
    if (!metadata.supported) hardExclusions.push("UNSUPPORTED_SURFACE");
    const effectiveCurrentness = impactByMember.get(member.memberId)?.currentness;
    if (input.sourceCurrentness === "STALE" || input.sourceCurrentness === "UNAVAILABLE" || input.sourceCurrentness === "AMBIGUOUS" || input.sourceCurrentness === "MISSING") hardExclusions.push(input.sourceCurrentness === "STALE" ? "CURRENTNESS_STALE" : "SOURCE_UNAVAILABLE");
    if (effectiveCurrentness === "STALE") hardExclusions.push("STALE_SEMANTIC_AUTHORITY");
    const replaySupport: CampaignPlanItem["replaySupport"] = member.input.replayable ? "SUPPORTED" : "UNSUPPORTED";
    const minimizationSupport: CampaignPlanItem["minimizationSupport"] = stageState(coverage, "MINIMIZATION_SUPPORTED") === "PROVEN" ? "SUPPORTED" : coverage === undefined ? "UNKNOWN" : "UNSUPPORTED";
    items.push({
      candidateId: candidateId(member, metadata),
      memberId: member.memberId,
      product: metadata.product,
      surface: metadata.surface,
      journeyClass: metadata.journeyClass,
      apiClass: metadata.apiClass,
      semanticContractId: metadata.semanticContractId,
      oracleFamilies: [...new Set(metadata.oracleFamilies)].sort(),
      sourceImpactReasons: impactReasons,
      coverageGapReasons: coverageReasons,
      priority,
      costCategory: member.input.executionCostClass,
      replaySupport,
      minimizationSupport,
      provenance: [...new Set([...metadata.provenance, "PORTFOLIO_SCORE", "CHANGE_IMPACT_REPORT", "COVERAGE_MATRIX"])].sort(),
      selectionReasons: reasons,
      exclusionReasons: sortedReasons(hardExclusions),
      selected: false,
      order: null,
      diversityDimensions,
      redundancyKey,
    });
  }
  const cap = input.maxSelectedItems ?? items.length;
  const eligible = items
    .filter((item) => item.exclusionReasons.length === 0)
    .sort((left, right) => right.priority.priorityPermille - left.priority.priorityPermille || left.memberId.localeCompare(right.memberId));
  const selectedIds = new Set<string>();
  const selectionTrace = new Map<string, { readonly diversityBonusPermille: number; readonly selectionScorePermille: number; readonly deferredRedundancy: boolean }>();
  const deferredRedundancyIds = new Set<string>();
  const selectedItemsForComparison: CampaignPlanItem[] = [];
  const remaining = [...eligible];
  while (selectedItemsForComparison.length < cap && remaining.length > 0) {
    const selectedRedundancy = new Set(selectedItemsForComparison.map((item) => item.redundancyKey));
    const hasUnseenRedundancy = remaining.some((item) => !selectedRedundancy.has(item.redundancyKey));
    const scored = remaining.map((item) => {
      const freshDimensions = CAMPAIGN_DIVERSITY_DIMENSIONS.filter((dimension) => {
        const value = item.diversityDimensions?.[dimension];
        return value !== null && value !== undefined && !selectedItemsForComparison.some((selected) => selected.diversityDimensions?.[dimension] === value);
      }).length;
      // The first-stage priority remains dominant.  This bounded second-stage
      // bonus only resolves close choices and ensures that valid dimensions
      // are represented before a redundant slot is consumed.
      const diversityBonusPermille = freshDimensions * 35;
      const deferredRedundancy = hasUnseenRedundancy && selectedRedundancy.has(item.redundancyKey);
      if (deferredRedundancy) deferredRedundancyIds.add(item.memberId);
      const selectionScorePermille = item.priority.priorityPermille + diversityBonusPermille - (deferredRedundancy ? REDUNDANCY_DEFERRED_PENALTY_PERMILLE : 0);
      return { item, diversityBonusPermille, selectionScorePermille, deferredRedundancy };
    }).sort((left, right) =>
      right.selectionScorePermille - left.selectionScorePermille ||
      right.item.priority.priorityPermille - left.item.priority.priorityPermille ||
      left.item.memberId.localeCompare(right.item.memberId),
    );
    const next = scored[0]!;
    selectedItemsForComparison.push(next.item);
    selectedIds.add(next.item.memberId);
    selectionTrace.set(next.item.memberId, {
      diversityBonusPermille: next.diversityBonusPermille,
      selectionScorePermille: next.selectionScorePermille,
      deferredRedundancy: next.deferredRedundancy,
    });
    remaining.splice(remaining.findIndex((item) => item.memberId === next.item.memberId), 1);
  }
  const mutable = items.map((item) => {
    if (item.exclusionReasons.length > 0) return item;
    const trace = selectionTrace.get(item.memberId);
    if (selectedIds.has(item.memberId)) {
      const selectionReasons = trace?.diversityBonusPermille
        ? sortedReasons([...item.selectionReasons, "DIVERSITY_BONUS"])
        : item.selectionReasons;
      return {
        ...item,
        selectionReasons,
        selected: true,
        order: selectedItemsForComparison.findIndex((selected) => selected.memberId === item.memberId),
        diversityBonusPermille: trace?.diversityBonusPermille ?? 0,
        selectionScorePermille: trace?.selectionScorePermille ?? item.priority.priorityPermille,
      };
    }
    const selectionReasons = deferredRedundancyIds.has(item.memberId)
      ? sortedReasons([...item.selectionReasons, "REDUNDANCY_DEFERRED"])
      : item.selectionReasons;
    return {
      ...item,
      selectionReasons,
      exclusionReasons: sortedReasons(["BUDGET_EXHAUSTED"]),
      selected: false,
      order: null,
    };
  });
  const selectedItems = mutable.filter((item) => item.selected).sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const excludedItems = mutable.filter((item) => !item.selected).sort((left, right) => left.memberId.localeCompare(right.memberId));
  const inputCore = {
    portfolioDigest: input.portfolio.portfolioDigest,
    sourceCurrentness: input.sourceCurrentness,
    impactDigest: input.impact.deterministicDigest,
    coverageDigest: input.coverage.deterministicDigest,
    maxSelectedItems: cap,
    candidates: [...input.candidates]
      .sort((left, right) => left.memberId.localeCompare(right.memberId))
      .map((candidate) => candidate),
    previousProvenance: input.portfolio.members
      .map((member) => ({ memberId: member.memberId, provenance: input.previousProvenance?.[member.memberId] ?? null }))
      .sort((left, right) => left.memberId.localeCompare(right.memberId)),
  };
  const core = {
    schemaVersion: CAMPAIGN_PLAN_VERSION,
    sourceCurrentness: input.sourceCurrentness,
    ownerScopeStatus: OWNER_SCOPE_STATUS,
    ownerScopeReason: OWNER_SCOPE_REASON,
    inputDigest: safeCampaignDigest(inputCore, "plan-input"),
    selectedItems,
    excludedItems,
    items: mutable.sort((left, right) => left.memberId.localeCompare(right.memberId)),
    emptyCampaign: selectedItems.length === 0,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "plan") };
}
