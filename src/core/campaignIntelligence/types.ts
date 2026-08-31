// Phase 19 — shared, sanitized DTOs for the integrated campaign-intelligence
// loop. These types are deliberately metadata-only. They carry identities,
// categories, bounded counts, and digests; they never carry observations,
// request values, DOM, credentials, or execution callbacks.

import { prefixedDigest24, stableJsonSorted } from "../identity/canonicalDigest";

/**
 * Plan v2 makes the mechanical selection inputs and the selection trace
 * explicit.  v1 plans are intentionally not byte-compatible: a plan whose
 * ranking inputs are incomplete must not be compared with a v2 plan.
 */
export const CAMPAIGN_PLAN_VERSION = "nightwatch.campaign-plan.v2" as const;
export const CAMPAIGN_IMPACT_REPORT_VERSION =
  "nightwatch.campaign-impact-report.v1" as const;
export const CAMPAIGN_COVERAGE_REPORT_VERSION =
  "nightwatch.campaign-coverage.v1" as const;
export const CAMPAIGN_YIELD_REPORT_VERSION =
  "nightwatch.campaign-yield.v1" as const;
export const CAMPAIGN_REPLAY_V4_VERSION =
  "nightwatch.replay-fidelity.v4" as const;
export const CAMPAIGN_MINIMIZATION_V2_VERSION =
  "nightwatch.minimization.v2" as const;
export const CAMPAIGN_STABILITY_VERSION =
  "nightwatch.nondeterminism.v1" as const;
export const CAMPAIGN_CLUSTER_V2_VERSION =
  "nightwatch.finding-cluster.v2" as const;
export const CAMPAIGN_CONFIDENCE_V2_VERSION =
  "nightwatch.confidence.v2" as const;
export const CAMPAIGN_DOSSIER_V3_VERSION =
  "nightwatch.owner-dossier.v3" as const;

export const OWNER_SCOPE_STATUS = "FROZEN_BY_OWNER" as const;
export const OWNER_SCOPE_REASON =
  "INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE" as const;

export type CampaignSourceCurrentness =
  | "CURRENT"
  | "STALE"
  | "UNAVAILABLE"
  | "AMBIGUOUS"
  | "MISSING"
  | "SYNTHETIC_ONLY";

export const CAMPAIGN_SOURCE_CURRENTNESS: readonly CampaignSourceCurrentness[] =
  ["CURRENT", "STALE", "UNAVAILABLE", "AMBIGUOUS", "MISSING", "SYNTHETIC_ONLY"];

export type CampaignCostCategory = "LOW" | "MEDIUM" | "HIGH";
export const CAMPAIGN_COST_CATEGORIES: readonly CampaignCostCategory[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

export const CAMPAIGN_DIVERSITY_DIMENSIONS = [
  "repository",
  "routeFamily",
  "entityType",
  "semanticInvariant",
  "journeyType",
  "interfaceType",
  "sourceChangeCluster",
] as const;
export type CampaignDiversityDimension =
  (typeof CAMPAIGN_DIVERSITY_DIMENSIONS)[number];

/** Optional, safe categorical keys used by the bounded selector. */
export interface CampaignDiversityDimensions {
  readonly repository?: string | null;
  readonly routeFamily?: string | null;
  readonly entityType?: string | null;
  readonly semanticInvariant?: string | null;
  readonly journeyType?: string | null;
  readonly interfaceType?: string | null;
  readonly sourceChangeCluster?: string | null;
}

export type CampaignImpactClass =
  | "CHANGED_SOURCE_ADJACENCY"
  | "CHANGED_CONTRACT"
  | "CHANGED_ROUTE"
  | "CHANGED_REQUEST_SHAPE"
  | "CHANGED_RESPONSE_SHAPE"
  | "CHANGED_ORACLE_BINDING"
  | "SELECTED_BY_CHANGE_INTELLIGENCE"
  | "COVERAGE_ONLY"
  | "UNKNOWN";

export type CampaignReasonCode =
  | "CHANGED_SOURCE_ADJACENCY"
  | "CHANGED_CONTRACT"
  | "CHANGED_ROUTE"
  | "CHANGED_REQUEST_SHAPE"
  | "CHANGED_RESPONSE_SHAPE"
  | "CHANGED_ORACLE_BINDING"
  | "SEMANTIC_COVERAGE_DEFICIT"
  | "HISTORICALLY_PRODUCTIVE_ORACLE"
  | "NO_DETERMINISTIC_REPLAY"
  | "STALE_SEMANTIC_AUTHORITY"
  | "REDUNDANT_COVERAGE"
  | "PREVIOUSLY_UNEXPLORED_CONTRACT"
  | "ORACLE_DETECTION_POWER"
  | "REPLAY_SUPPORTED"
  | "MINIMIZATION_SUPPORTED"
  | "EXPENSIVE_LOW_YIELD"
  | "UNSUPPORTED_SURFACE"
  | "SOURCE_UNAVAILABLE"
  | "MISSING_CANDIDATE_METADATA"
  | "BUDGET_EXHAUSTED"
  | "NO_BUDGET"
  | "NOT_APPLICABLE"
  | "EMPTY_CAMPAIGN"
  | "OWNER_POLICY_BLOCKED"
  | "PHASE_FROZEN"
  | "CURRENTNESS_STALE"
  | "EVIDENCE_NOT_EVALUATED"
  | "EVIDENCE_MISSING"
  | "MECHANICALLY_PROVABLE_UNCOVERED"
  | "RELATIONAL_ORACLE_GAP"
  | "DIFFERENTIAL_PROJECTION_GAP"
  | "METAMORPHIC_GAP"
  | "SYNTHETIC_DETECTION_GAP"
  | "REPLAY_GAP"
  | "MINIMIZATION_GAP"
  | "STALE_CONTRACT_REDERIVATION"
  | "SURVIVING_MUTANT"
  | "ANALYZER_UNSUPPORTED"
  | "DUPLICATE_SEMANTIC_COVERAGE"
  | "CAMPAIGN_AUTO_COMPOSED"
  | "DIVERSITY_BONUS"
  | "REDUNDANCY_DEFERRED";

export type CoverageStage =
  | "SOURCE_SURFACE_EXISTS"
  | "SOURCE_MECHANICALLY_UNDERSTOOD"
  | "SEMANTIC_CONTRACT_ADMITTED"
  | "SYNTHETIC_DETECTION_PROVEN"
  | "SCENARIO_EXERCISES_CONTRACT"
  | "REPLAY_AVAILABLE"
  | "REPLAY_REPRODUCES"
  | "MINIMIZATION_SUPPORTED"
  | "TRIAGE_CLASSIFIABLE"
  | "DOSSIER_EXPLAINABLE";

export type CoverageStageState =
  | "PROVEN"
  | "AVAILABLE"
  | "PARTIAL"
  | "GAP"
  | "STALE"
  | "UNSUPPORTED"
  | "NOT_APPLICABLE";

export interface CampaignStageResult {
  readonly stage: CoverageStage;
  readonly state: CoverageStageState;
  readonly reasons: readonly CampaignReasonCode[];
}

export interface CampaignCandidateMetadata {
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly journeyClass: string;
  readonly apiClass: string | null;
  readonly semanticContractId: string | null;
  readonly oracleFamilies: readonly string[];
  readonly applicable: boolean;
  readonly supported: boolean;
  readonly provenance: readonly string[];
  /** Phase 20 additive gap signals; these are planner inputs, never authority. */
  readonly semanticGapReasons?: readonly CampaignReasonCode[];
  /** Number of mechanically bound semantic contracts represented by this item. */
  readonly semanticContractCount?: number;
  /** Number of mechanically bound cross-surface relations represented by this item. */
  readonly relationCount?: number;
  /** Bounded source/proof confidence supplied by a mechanical adapter (0..5). */
  readonly proofConfidence?: number;
  /** Explicit diversity keys; omitted keys receive deterministic planner fallbacks. */
  readonly diversityDimensions?: CampaignDiversityDimensions;
  /** Normalized semantic-surface identity used for duplicate suppression. */
  readonly redundancyKey?: string | null;
}

export interface CampaignImpactBinding {
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly journeyClass: string;
  readonly semanticContractId: string;
  readonly expectationIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly affectedPathPrefixes: readonly string[];
  readonly sourceSha: string | null;
  readonly evidenceDigest: string | null;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly supported: boolean;
  readonly impactClasses: readonly CampaignImpactClass[];
}

export interface CampaignImpactReason {
  readonly code: CampaignReasonCode;
  readonly impactClass: CampaignImpactClass;
  readonly memberId: string;
  readonly contractId: string;
  readonly safePathClass: string;
}

export interface CampaignImpactRow {
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly semanticContractId: string;
  readonly affected: boolean;
  readonly currentness: CampaignSourceCurrentness;
  readonly impactClasses: readonly CampaignImpactClass[];
  readonly expectationIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly reasons: readonly CampaignImpactReason[];
  readonly requiresRederivation: boolean;
  readonly invalidated: boolean;
}

export interface CampaignImpactReport {
  readonly schemaVersion: typeof CAMPAIGN_IMPACT_REPORT_VERSION;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly changedPathClasses: readonly string[];
  readonly rows: readonly CampaignImpactRow[];
  readonly affectedContractIds: readonly string[];
  readonly affectedExpectationIds: readonly string[];
  readonly affectedScenarioIds: readonly string[];
  readonly orphanedExpectationIds: readonly string[];
  readonly invalidatedContractIds: readonly string[];
  readonly requiresRederivationContractIds: readonly string[];
  readonly newlyUncoveredSurfaceIds: readonly string[];
  readonly selectionDigest: string | null;
  readonly deterministicDigest: string;
}

export interface CampaignCoverageFact {
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly semanticContractId: string;
  readonly expectationId: string | null;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly sourceSurfaceExists: boolean;
  readonly sourceMechanicallyUnderstood: boolean;
  readonly semanticContractAdmitted: boolean;
  readonly syntheticDetectionProven: boolean;
  readonly scenarioExercisesContract: boolean;
  readonly replayAvailable: boolean;
  readonly replayReproduces: boolean;
  readonly minimizationSupported: boolean;
  readonly triageClassifiable: boolean;
  readonly dossierExplainable: boolean;
  readonly unsupported: boolean;
  readonly reasons: readonly CampaignReasonCode[];
}

export interface CampaignCoverageRow {
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly semanticContractId: string;
  readonly expectationId: string | null;
  readonly stages: readonly CampaignStageResult[];
  readonly gapReasons: readonly CampaignReasonCode[];
  readonly fullyCovered: boolean;
}

export interface CampaignCoverageReport {
  readonly schemaVersion: typeof CAMPAIGN_COVERAGE_REPORT_VERSION;
  readonly rows: readonly CampaignCoverageRow[];
  readonly fullyCoveredContractCount: number;
  readonly executionOnlyCount: number;
  readonly oracleOnlyCount: number;
  readonly replayGapCount: number;
  readonly minimizationGapCount: number;
  readonly staleSourceGapCount: number;
  readonly semanticAuthorityGapCount: number;
  readonly orphanedScenarioCount: number;
  readonly redundantScenarioCount: number;
  readonly uncoveredHighImpactSurfaceCount: number;
  readonly deterministicDigest: string;
}

export interface CampaignPlanPriority {
  readonly surfaceRelevance: number;
  readonly defectProbability: number;
  readonly detectionPower: number;
  readonly actionability: number;
  readonly executionCost: number;
  readonly semanticDensity: number;
  readonly relationDensity: number;
  readonly sourceChangeSignal: number;
  readonly proofConfidence: number;
  readonly explorationAge: number;
  readonly anomalyDensity: number;
  readonly replayConfidence: number;
  readonly redundancyPenalty: number;
  readonly portfolioScoreSignal: number;
  readonly numerator: number;
  readonly priorityPermille: number;
  readonly basePortfolioScore: number;
}

export interface CampaignPlanItem {
  readonly candidateId: string;
  readonly memberId: string;
  readonly product: string;
  readonly surface: string;
  readonly journeyClass: string;
  readonly apiClass: string | null;
  readonly semanticContractId: string | null;
  readonly oracleFamilies: readonly string[];
  readonly sourceImpactReasons: readonly CampaignReasonCode[];
  readonly coverageGapReasons: readonly CampaignReasonCode[];
  readonly priority: CampaignPlanPriority;
  readonly costCategory: CampaignCostCategory;
  readonly replaySupport: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
  readonly minimizationSupport: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";
  readonly provenance: readonly string[];
  readonly selectionReasons: readonly CampaignReasonCode[];
  readonly exclusionReasons: readonly CampaignReasonCode[];
  readonly selected: boolean;
  readonly order: number | null;
  /** Transparent, bounded second-stage selection trace. */
  readonly diversityBonusPermille?: number;
  readonly selectionScorePermille?: number;
  readonly diversityDimensions?: CampaignDiversityDimensions;
  readonly redundancyKey?: string;
}

export interface CampaignPlan {
  readonly schemaVersion: typeof CAMPAIGN_PLAN_VERSION;
  readonly sourceCurrentness: CampaignSourceCurrentness;
  readonly ownerScopeStatus: typeof OWNER_SCOPE_STATUS;
  readonly ownerScopeReason: typeof OWNER_SCOPE_REASON;
  readonly inputDigest: string;
  readonly selectedItems: readonly CampaignPlanItem[];
  readonly excludedItems: readonly CampaignPlanItem[];
  readonly items: readonly CampaignPlanItem[];
  readonly emptyCampaign: boolean;
  readonly deterministicDigest: string;
}

export type CampaignOutcomeDisposition =
  | "ATTEMPTED"
  | "APPLICABLE"
  | "SKIPPED_AUTHORITY"
  | "SKIPPED_UNSUPPORTED"
  | "SKIPPED_STALE_SOURCE"
  | "EXECUTOR_FAILURE"
  | "NO_FINDING";

export interface CampaignScenarioOutcome {
  readonly candidateId: string;
  readonly scenarioGroup: string;
  readonly oracleFamilies: readonly string[];
  readonly disposition: CampaignOutcomeDisposition;
  readonly protocolFinding: boolean;
  readonly semanticFinding: boolean;
  readonly clusterId: string | null;
  readonly replayOutcome:
    | "NOT_ATTEMPTED"
    | "REPRODUCED_EXACT"
    | "REPRODUCED_EQUIVALENT_SEMANTIC"
    | "DIVERGED"
    | "FAILED"
    | "AMBIGUOUS"
    | "NOT_APPLICABLE";
  readonly minimized: boolean;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";
  readonly benignControl: boolean;
  readonly falsePositive: boolean;
  readonly staleSource: boolean;
  readonly coverageGained: readonly string[];
}

export interface CampaignYieldAttribution {
  readonly candidateId: string;
  readonly scenarioGroup: string;
  readonly oracleFamily: string;
  readonly semanticFindings: number;
  readonly protocolFindings: number;
  readonly usefulFindings: number;
  readonly duplicatesRemoved: number;
  readonly reproduced: number;
  readonly minimized: number;
}

export interface CampaignYieldReport {
  readonly schemaVersion: typeof CAMPAIGN_YIELD_REPORT_VERSION;
  readonly scenariosAttempted: number;
  readonly scenariosApplicable: number;
  readonly scenariosSkippedByAuthority: number;
  readonly scenariosSkippedUnsupported: number;
  readonly scenariosSkippedStaleSource: number;
  readonly semanticEvaluations: number;
  readonly protocolFindings: number;
  readonly semanticFindings: number;
  readonly uniqueClusters: number;
  readonly reproducedFindings: number;
  readonly minimizedFindings: number;
  readonly highConfidenceFindings: number;
  readonly duplicatesRemoved: number;
  readonly benignControlFalsePositives: number;
  readonly staleSourceEvents: number;
  readonly unsupportedSurfaceEvents: number;
  readonly coverageGained: readonly string[];
  readonly zeroYieldScenarioGroups: readonly string[];
  readonly attributions: readonly CampaignYieldAttribution[];
  readonly deterministicDigest: string;
}

export function safeCampaignDigest(value: unknown, prefix: string): string {
  return prefixedDigest24(prefix, value);
}

export function safeCampaignCanonical(value: unknown): string {
  return stableJsonSorted(value);
}
