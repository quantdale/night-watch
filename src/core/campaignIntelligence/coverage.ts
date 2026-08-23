// Phase 19 — semantic coverage accounting. A contract is not simply covered
// or uncovered: each downstream capability has its own bounded state.

import {
  CAMPAIGN_COVERAGE_REPORT_VERSION,
  CAMPAIGN_SOURCE_CURRENTNESS,
  type CampaignCoverageFact,
  type CampaignCoverageReport,
  type CampaignCoverageRow,
  type CampaignReasonCode,
  type CampaignStageResult,
  type CoverageStage,
  type CoverageStageState,
  safeCampaignDigest,
} from "./types";

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_COVERAGE_INVALID:${reason}`);
}

function safeId(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)) invalid(`${field}_PRIVACY`);
}

function stateFor(
  value: boolean,
  input: CampaignCoverageFact,
  stage: CoverageStage,
): { readonly state: CoverageStageState; readonly reasons: readonly CampaignReasonCode[] } {
  if (!input.sourceSurfaceExists) return { state: "NOT_APPLICABLE", reasons: ["NOT_APPLICABLE"] };
  if (input.unsupported) return { state: "UNSUPPORTED", reasons: ["UNSUPPORTED_SURFACE"] };
  if (input.sourceCurrentness === "STALE" || input.sourceCurrentness === "UNAVAILABLE" || input.sourceCurrentness === "AMBIGUOUS" || input.sourceCurrentness === "MISSING") {
    if (stage !== "SOURCE_SURFACE_EXISTS") return { state: "STALE", reasons: ["STALE_SEMANTIC_AUTHORITY"] };
  }
  if (value) return { state: "PROVEN", reasons: [] };
  switch (stage) {
    case "SOURCE_MECHANICALLY_UNDERSTOOD":
    case "SEMANTIC_CONTRACT_ADMITTED":
      return { state: "GAP", reasons: ["SEMANTIC_COVERAGE_DEFICIT"] };
    case "SYNTHETIC_DETECTION_PROVEN":
      return { state: "PARTIAL", reasons: ["SEMANTIC_COVERAGE_DEFICIT"] };
    case "REPLAY_AVAILABLE":
      return { state: "GAP", reasons: ["NO_DETERMINISTIC_REPLAY"] };
    case "REPLAY_REPRODUCES":
      return { state: "PARTIAL", reasons: ["NO_DETERMINISTIC_REPLAY"] };
    case "MINIMIZATION_SUPPORTED":
      return { state: "GAP", reasons: ["MINIMIZATION_SUPPORTED"] };
    case "SCENARIO_EXERCISES_CONTRACT":
      return { state: "GAP", reasons: ["SEMANTIC_COVERAGE_DEFICIT"] };
    case "TRIAGE_CLASSIFIABLE":
    case "DOSSIER_EXPLAINABLE":
      return { state: "GAP", reasons: ["SEMANTIC_COVERAGE_DEFICIT"] };
  }
  return { state: "GAP", reasons: ["SEMANTIC_COVERAGE_DEFICIT"] };
}

function validateFact(fact: CampaignCoverageFact): void {
  safeId(fact.memberId, "MEMBER");
  safeId(fact.product, "PRODUCT");
  safeId(fact.surface, "SURFACE");
  safeId(fact.semanticContractId, "CONTRACT");
  if (fact.expectationId !== null) safeId(fact.expectationId, "EXPECTATION");
  if (!CAMPAIGN_SOURCE_CURRENTNESS.includes(fact.sourceCurrentness)) invalid("CURRENTNESS");
  for (const key of [
    "sourceSurfaceExists",
    "sourceMechanicallyUnderstood",
    "semanticContractAdmitted",
    "syntheticDetectionProven",
    "scenarioExercisesContract",
    "replayAvailable",
    "replayReproduces",
    "minimizationSupported",
    "triageClassifiable",
    "dossierExplainable",
    "unsupported",
  ] as const) {
    if (typeof fact[key] !== "boolean") invalid(`${key}_BOOLEAN`);
  }
  if (!Array.isArray(fact.reasons) || fact.reasons.length > 32) invalid("REASONS");
}

const STAGES: readonly CoverageStage[] = [
  "SOURCE_SURFACE_EXISTS",
  "SOURCE_MECHANICALLY_UNDERSTOOD",
  "SEMANTIC_CONTRACT_ADMITTED",
  "SYNTHETIC_DETECTION_PROVEN",
  "SCENARIO_EXERCISES_CONTRACT",
  "REPLAY_AVAILABLE",
  "REPLAY_REPRODUCES",
  "MINIMIZATION_SUPPORTED",
  "TRIAGE_CLASSIFIABLE",
  "DOSSIER_EXPLAINABLE",
];

function stageValues(fact: CampaignCoverageFact): readonly boolean[] {
  return [
    fact.sourceSurfaceExists,
    fact.sourceMechanicallyUnderstood,
    fact.semanticContractAdmitted,
    fact.syntheticDetectionProven,
    fact.scenarioExercisesContract,
    fact.replayAvailable,
    fact.replayReproduces,
    fact.minimizationSupported,
    fact.triageClassifiable,
    fact.dossierExplainable,
  ];
}

/** Build a matrix and aggregate metrics from sanitized contract facts. */
export function buildCampaignCoverageReport(input: {
  readonly facts: readonly CampaignCoverageFact[];
}): CampaignCoverageReport {
  if (!Array.isArray(input.facts) || input.facts.length > 1024) invalid("FACT_COUNT");
  const memberIds = new Set<string>();
  const contractCounts = new Map<string, number>();
  const rows: CampaignCoverageRow[] = [];
  for (const fact of [...input.facts].sort((left, right) => left.memberId.localeCompare(right.memberId))) {
    validateFact(fact);
    if (memberIds.has(fact.memberId)) invalid("DUPLICATE_MEMBER");
    memberIds.add(fact.memberId);
    contractCounts.set(fact.semanticContractId, (contractCounts.get(fact.semanticContractId) ?? 0) + 1);
    const stages: CampaignStageResult[] = STAGES.map((stage, index) => {
      const result = stateFor(stageValues(fact)[index] ?? false, fact, stage);
      return { stage, state: result.state, reasons: result.reasons };
    });
    const gapReasons = [...new Set([
      ...fact.reasons,
      ...stages.flatMap((stage) => stage.reasons),
    ])].sort() as CampaignReasonCode[];
    const fullyCovered = stages.every((stage) => stage.state === "PROVEN" || stage.state === "AVAILABLE");
    rows.push({
      memberId: fact.memberId,
      product: fact.product,
      surface: fact.surface,
      semanticContractId: fact.semanticContractId,
      expectationId: fact.expectationId,
      stages,
      gapReasons,
      fullyCovered,
    });
  }
  const stage = (row: CampaignCoverageRow, id: CoverageStage): CoverageStageState => row.stages.find((entry) => entry.stage === id)?.state ?? "GAP";
  const fullyCoveredContractCount = rows.filter((row) => row.fullyCovered).length;
  const executionOnlyCount = rows.filter((row) => stage(row, "SCENARIO_EXERCISES_CONTRACT") === "PROVEN" && stage(row, "SYNTHETIC_DETECTION_PROVEN") !== "PROVEN").length;
  const oracleOnlyCount = rows.filter((row) => stage(row, "SYNTHETIC_DETECTION_PROVEN") === "PROVEN" && stage(row, "SCENARIO_EXERCISES_CONTRACT") !== "PROVEN").length;
  const replayGapCount = rows.filter((row) => stage(row, "SEMANTIC_CONTRACT_ADMITTED") === "PROVEN" && stage(row, "REPLAY_AVAILABLE") !== "PROVEN").length;
  const minimizationGapCount = rows.filter((row) => stage(row, "REPLAY_REPRODUCES") === "PROVEN" && stage(row, "MINIMIZATION_SUPPORTED") !== "PROVEN").length;
  const staleSourceGapCount = rows.filter((row) => row.gapReasons.includes("STALE_SEMANTIC_AUTHORITY")).length;
  const semanticAuthorityGapCount = rows.filter((row) => stage(row, "SEMANTIC_CONTRACT_ADMITTED") !== "PROVEN").length;
  const orphanedScenarioCount = rows.filter((row) => row.expectationId === null).length;
  const redundantScenarioCount = [...contractCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const uncoveredHighImpactSurfaceCount = rows.filter((row) => !row.fullyCovered && row.gapReasons.some((reason) => ["CHANGED_SOURCE_ADJACENCY", "CHANGED_CONTRACT", "CHANGED_ROUTE"].includes(reason))).length;
  const core = {
    schemaVersion: CAMPAIGN_COVERAGE_REPORT_VERSION,
    rows,
    fullyCoveredContractCount,
    executionOnlyCount,
    oracleOnlyCount,
    replayGapCount,
    minimizationGapCount,
    staleSourceGapCount,
    semanticAuthorityGapCount,
    orphanedScenarioCount,
    redundantScenarioCount,
    uncoveredHighImpactSurfaceCount,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "ccover") };
}
