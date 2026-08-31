// Phase 19 — deterministic, local campaign-yield accounting. This consumes
// sanitized outcome facts only; it is not telemetry and makes no real-world
// yield claim.

import {
  CAMPAIGN_YIELD_REPORT_VERSION,
  type CampaignScenarioOutcome,
  type CampaignYieldAttribution,
  type CampaignYieldReport,
  safeCampaignCanonical,
  safeCampaignDigest,
} from "./types";

function invalid(reason: string): never {
  throw new Error(`CAMPAIGN_YIELD_INVALID:${reason}`);
}

function safeToken(value: string, field: string): void {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(value)) invalid(`${field}_TOKEN`);
}

function validateOutcome(outcome: CampaignScenarioOutcome): void {
  safeToken(outcome.candidateId, "CANDIDATE");
  safeToken(outcome.scenarioGroup, "SCENARIO");
  if (!Array.isArray(outcome.oracleFamilies) || outcome.oracleFamilies.length > 32) invalid("ORACLE_FAMILIES");
  for (const family of outcome.oracleFamilies) safeToken(family, "ORACLE");
  for (const key of ["protocolFinding", "semanticFinding", "minimized", "benignControl", "falsePositive", "staleSource"] as const) {
    if (typeof outcome[key] !== "boolean") invalid(`${key}_BOOLEAN`);
  }
  if (outcome.clusterId !== null) safeToken(outcome.clusterId, "CLUSTER");
  if (!Array.isArray(outcome.coverageGained) || outcome.coverageGained.length > 128) invalid("COVERAGE_GAINED");
  for (const value of outcome.coverageGained) safeToken(value, "COVERAGE");
}

interface MutableAttribution {
  readonly candidateId: string;
  readonly scenarioGroup: string;
  readonly oracleFamily: string;
  semanticFindings: number;
  protocolFindings: number;
  usefulFindings: number;
  duplicatesRemoved: number;
  reproduced: number;
  minimized: number;
}

/** Aggregate one bounded synthetic/local campaign result set. */
export function buildCampaignYieldReport(input: {
  readonly outcomes: readonly CampaignScenarioOutcome[];
}): CampaignYieldReport {
  if (!Array.isArray(input.outcomes) || input.outcomes.length > 4096) invalid("OUTCOME_COUNT");
  for (const outcome of input.outcomes) validateOutcome(outcome);
  // Outcome arrival order is an execution detail.  Canonical processing keeps
  // duplicate ownership, high-confidence counts, and per-candidate
  // attribution stable when the same observations arrive from different
  // workers or campaigns in a different order.
  const outcomes = [...input.outcomes].sort((left, right) =>
    safeCampaignCanonical(left).localeCompare(safeCampaignCanonical(right)),
  );
  let scenariosAttempted = 0;
  let scenariosApplicable = 0;
  let scenariosSkippedByAuthority = 0;
  let scenariosSkippedUnsupported = 0;
  let scenariosSkippedStaleSource = 0;
  let semanticEvaluations = 0;
  let protocolFindings = 0;
  let semanticFindings = 0;
  let reproducedFindings = 0;
  let minimizedFindings = 0;
  let highConfidenceFindings = 0;
  let benignControlFalsePositives = 0;
  let staleSourceEvents = 0;
  let unsupportedSurfaceEvents = 0;
  const clusters = new Set<string>();
  const seenClusters = new Set<string>();
  let duplicatesRemoved = 0;
  const coverage = new Set<string>();
  const groups = new Map<string, { attempted: boolean; useful: boolean }>();
  const attributions = new Map<string, MutableAttribution>();

  for (const outcome of outcomes) {
    const group = groups.get(outcome.scenarioGroup) ?? { attempted: false, useful: false };
    if (outcome.disposition === "ATTEMPTED" || outcome.disposition === "APPLICABLE" || outcome.disposition === "EXECUTOR_FAILURE" || outcome.disposition === "NO_FINDING") {
      scenariosAttempted += 1;
      group.attempted = true;
      semanticEvaluations += 1;
    }
    if (outcome.disposition === "ATTEMPTED" || outcome.disposition === "APPLICABLE") scenariosApplicable += 1;
    if (outcome.disposition === "SKIPPED_AUTHORITY") { scenariosSkippedByAuthority += 1; }
    if (outcome.disposition === "SKIPPED_UNSUPPORTED") { scenariosSkippedUnsupported += 1; unsupportedSurfaceEvents += 1; }
    if (outcome.disposition === "SKIPPED_STALE_SOURCE") { scenariosSkippedStaleSource += 1; staleSourceEvents += 1; }
    if (outcome.staleSource) staleSourceEvents += 1;
    if (outcome.protocolFinding) protocolFindings += 1;
    if (outcome.semanticFinding) semanticFindings += 1;
    const hasFinding = outcome.protocolFinding || outcome.semanticFinding;
    const duplicate = outcome.clusterId !== null && seenClusters.has(outcome.clusterId);
    if (duplicate) duplicatesRemoved += 1;
    if (outcome.clusterId !== null) {
      clusters.add(outcome.clusterId);
      seenClusters.add(outcome.clusterId);
    }
    if (outcome.replayOutcome === "REPRODUCED_EXACT" || outcome.replayOutcome === "REPRODUCED_EQUIVALENT_SEMANTIC") reproducedFindings += hasFinding ? 1 : 0;
    if (outcome.minimized) minimizedFindings += hasFinding ? 1 : 0;
    if (outcome.confidence === "HIGH") highConfidenceFindings += hasFinding && !duplicate ? 1 : 0;
    if (outcome.benignControl && outcome.falsePositive) benignControlFalsePositives += 1;
    const useful = hasFinding && !outcome.falsePositive && !duplicate;
    if (useful) group.useful = true;
    for (const item of outcome.coverageGained) coverage.add(item);
    const families = outcome.oracleFamilies.length > 0 ? outcome.oracleFamilies : ["NO_ORACLE_FAMILY"];
    for (const family of families) {
      const key = `${outcome.candidateId}\u0000${outcome.scenarioGroup}\u0000${family}`;
      const record = attributions.get(key) ?? {
        candidateId: outcome.candidateId,
        scenarioGroup: outcome.scenarioGroup,
        oracleFamily: family,
        semanticFindings: 0,
        protocolFindings: 0,
        usefulFindings: 0,
        duplicatesRemoved: 0,
        reproduced: 0,
        minimized: 0,
      };
      record.semanticFindings += outcome.semanticFinding ? 1 : 0;
      record.protocolFindings += outcome.protocolFinding ? 1 : 0;
      record.usefulFindings += useful ? 1 : 0;
      record.duplicatesRemoved += duplicate ? 1 : 0;
      record.reproduced += outcome.replayOutcome === "REPRODUCED_EXACT" || outcome.replayOutcome === "REPRODUCED_EQUIVALENT_SEMANTIC" ? 1 : 0;
      record.minimized += outcome.minimized ? 1 : 0;
      attributions.set(key, record);
    }
    groups.set(outcome.scenarioGroup, group);
  }
  const zeroYieldScenarioGroups = [...groups.entries()]
    .filter(([, value]) => value.attempted && !value.useful)
    .map(([key]) => key)
    .sort();
  const materialAttributions: readonly CampaignYieldAttribution[] = [...attributions.values()]
    .map((record) => ({ ...record }))
    .sort((left, right) => `${left.candidateId}:${left.scenarioGroup}:${left.oracleFamily}`.localeCompare(`${right.candidateId}:${right.scenarioGroup}:${right.oracleFamily}`));
  const core = {
    schemaVersion: CAMPAIGN_YIELD_REPORT_VERSION,
    scenariosAttempted,
    scenariosApplicable,
    scenariosSkippedByAuthority,
    scenariosSkippedUnsupported,
    scenariosSkippedStaleSource,
    semanticEvaluations,
    protocolFindings,
    semanticFindings,
    uniqueClusters: clusters.size,
    reproducedFindings,
    minimizedFindings,
    highConfidenceFindings,
    duplicatesRemoved,
    benignControlFalsePositives,
    staleSourceEvents,
    unsupportedSurfaceEvents,
    coverageGained: [...coverage].sort(),
    zeroYieldScenarioGroups,
    attributions: materialAttributions,
  };
  return { ...core, deterministicDigest: safeCampaignDigest(core, "cyield") };
}
