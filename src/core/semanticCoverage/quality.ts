// Phase 21 — lifecycle coverage quality and deterministic gap planning.
// Quality is additive evidence, never execution authority.

import { safeSemanticDigest, type ContractCandidate, type ContractDiscoveryInventory, type ContractGraph } from "./types";
import type { SemanticGapClosureLedger } from "./closureLedger";
import type { DifferentialPairDiscoveryReport } from "./differential";
import type { SyntheticMutationMeasurement } from "./mutation";
import type { SemanticLifecycleReport } from "./lifecycle";

export const SEMANTIC_COVERAGE_QUALITY_VERSION = "nightwatch.semantic-coverage-quality.v1" as const;

export type CoverageQualityLevel =
  | "DISCOVERED_ONLY"
  | "PROJECTED"
  | "DETECTED_SYNTHETIC"
  | "REPLAYED"
  | "MINIMIZED"
  | "STABLE"
  | "HIGH_CONFIDENCE"
  | "DIFFERENTIAL_VERIFIED"
  | "FULL_LIFECYCLE";

export const COVERAGE_QUALITY_LEVELS: readonly CoverageQualityLevel[] = [
  "DISCOVERED_ONLY", "PROJECTED", "DETECTED_SYNTHETIC", "REPLAYED", "MINIMIZED", "STABLE", "HIGH_CONFIDENCE", "DIFFERENTIAL_VERIFIED", "FULL_LIFECYCLE",
];

export interface CoverageQualityRow {
  readonly candidateId: string;
  readonly quality: CoverageQualityLevel;
  readonly sourceCurrent: boolean;
  readonly projected: boolean;
  readonly syntheticDetected: boolean;
  readonly replayed: boolean;
  readonly minimized: boolean;
  readonly stable: boolean;
  readonly highConfidence: boolean;
  readonly differentialVerified: boolean;
  readonly reasonCodes: readonly string[];
}

export interface CoverageQualityReport {
  readonly schemaVersion: typeof SEMANTIC_COVERAGE_QUALITY_VERSION;
  readonly rows: readonly CoverageQualityRow[];
  readonly counts: Readonly<Record<CoverageQualityLevel, number>>;
  readonly fullLifecycleContractCount: number;
  readonly shallowHighImpactContractIds: readonly string[];
  readonly deterministicDigest: string;
}

export interface GapClosurePlanItem {
  readonly rank: number;
  readonly gapIdentity: string;
  readonly contractId: string;
  readonly gapClass: string;
  readonly reasonCode: string;
  readonly closureStatus: string;
  readonly expectedDetectionValuePermille: number;
  readonly deterministicCost: string;
  readonly quality: CoverageQualityLevel | null;
  readonly selectionReason: string;
}

export interface GapClosurePlan {
  readonly schemaVersion: typeof SEMANTIC_COVERAGE_QUALITY_VERSION;
  readonly baselineGraphDigest: string;
  readonly selected: readonly GapClosurePlanItem[];
  readonly deferred: readonly GapClosurePlanItem[];
  readonly selectedCount: number;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_COVERAGE_QUALITY_INVALID:${reason}`);
}

function qualityRank(level: CoverageQualityLevel): number {
  return COVERAGE_QUALITY_LEVELS.indexOf(level);
}

function candidateFor(inventory: ContractDiscoveryInventory, candidateId: string): ContractCandidate | undefined {
  return inventory.candidates.find((candidate) => candidate.candidateId === candidateId);
}

function highest(values: readonly CoverageQualityLevel[]): CoverageQualityLevel {
  return [...values].sort((left, right) => qualityRank(right) - qualityRank(left) || left.localeCompare(right))[0] ?? "DISCOVERED_ONLY";
}

/** Derive quality from actual fixture, replay, and pair evidence. */
export function buildCoverageQualityReport(input: {
  readonly inventory: ContractDiscoveryInventory;
  readonly graph: ContractGraph;
  readonly mutationMeasurement?: SyntheticMutationMeasurement;
  readonly lifecycle?: SemanticLifecycleReport;
  readonly differential?: DifferentialPairDiscoveryReport;
}): CoverageQualityReport {
  if (input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  const lifecycleByContract = new Map<string, SemanticLifecycleReport["rows"]>([...new Set((input.lifecycle?.rows ?? []).map((row) => row.contractId))].map((contractId) => [contractId, (input.lifecycle?.rows ?? []).filter((row) => row.contractId === contractId)]));
  const differentialByCandidate = new Map<string, string[]>();
  for (const contract of input.differential?.admittedContracts ?? []) {
    const candidate = input.inventory.candidates.find((entry) => entry.source.evidenceDigest === contract.sourceProvenance.evidenceDigest);
    if (candidate !== undefined) differentialByCandidate.set(candidate.candidateId, [...(differentialByCandidate.get(candidate.candidateId) ?? []), contract.equivalenceId]);
  }
  const rows: CoverageQualityRow[] = input.inventory.candidates.filter((candidate) => candidate.proofStatus !== "REJECTED").sort((left, right) => left.candidateId.localeCompare(right.candidateId)).map((candidate) => {
    const relatedContractIds = [candidate.candidateId, ...(differentialByCandidate.get(candidate.candidateId) ?? [])];
    const mutationRows = input.mutationMeasurement?.rows.filter((row) => relatedContractIds.includes(row.contractId) || row.contractId.startsWith(`${candidate.candidateId}.`)) ?? [];
    const defectRows = mutationRows.filter((row) => row.expectedViolation && row.applicable);
    const syntheticDetected = defectRows.length > 0 && defectRows.every((row) => row.detected);
    const lifecycleRows = relatedContractIds.flatMap((contractId) => lifecycleByContract.get(contractId) ?? []);
    const capabilityRows = lifecycleRows.length > 0 ? lifecycleRows : (input.mutationMeasurement?.rows.filter((row) => row.contractId === candidate.candidateId) ?? []).filter((row) => row.expectedViolation);
    const replayed = capabilityRows.length > 0 && (lifecycleRows.length > 0 ? lifecycleRows.every((row) => row.replayed) : capabilityRows.every((row) => row.replayed));
    const minimized = capabilityRows.length > 0 && (lifecycleRows.length > 0 ? lifecycleRows.every((row) => row.minimized) : capabilityRows.every((row) => row.minimized));
    const stable = lifecycleRows.length > 0 && lifecycleRows.every((row) => row.replayReceipt.deterministic);
    const highConfidence = lifecycleRows.length > 0 && lifecycleRows.every((row) => row.highConfidence);
    const differentialVerified = differentialByCandidate.has(candidate.candidateId);
    const qualities: CoverageQualityLevel[] = [];
    if (candidate.currentness === "CURRENT" && candidate.coverage.semanticContractAdmitted) qualities.push("PROJECTED");
    if (syntheticDetected) qualities.push("DETECTED_SYNTHETIC");
    if (replayed) qualities.push("REPLAYED");
    if (minimized) qualities.push("MINIMIZED");
    if (stable) qualities.push("STABLE");
    if (highConfidence) qualities.push("HIGH_CONFIDENCE");
    if (differentialVerified) qualities.push("DIFFERENTIAL_VERIFIED");
    const full = highConfidence && (!candidate.observationSurfaces.includes("BROWSER") || differentialVerified);
    if (full) qualities.push("FULL_LIFECYCLE");
    const quality = highest(qualities);
    const reasonCodes = [
      ...(candidate.currentness !== "CURRENT" ? ["SOURCE_NOT_CURRENT"] : []),
      ...(candidate.coverage.semanticContractAdmitted ? [] : ["CONTRACT_NOT_ADMITTED"]),
      ...(!syntheticDetected ? ["SYNTHETIC_DETECTION_SHALLOW"] : []),
      ...(!replayed ? ["REPLAY_SHALLOW"] : []),
      ...(!minimized ? ["MINIMIZATION_SHALLOW"] : []),
      ...(candidate.observationSurfaces.includes("BROWSER") && !differentialVerified ? ["DIFFERENTIAL_UNVERIFIED"] : []),
    ];
    return { candidateId: candidate.candidateId, quality, sourceCurrent: candidate.currentness === "CURRENT", projected: candidate.coverage.semanticContractAdmitted, syntheticDetected, replayed, minimized, stable, highConfidence, differentialVerified, reasonCodes };
  });
  const counts = Object.fromEntries(COVERAGE_QUALITY_LEVELS.map((level) => [level, rows.filter((row) => row.quality === level).length])) as Record<CoverageQualityLevel, number>;
  const core = {
    schemaVersion: SEMANTIC_COVERAGE_QUALITY_VERSION,
    rows,
    counts,
    fullLifecycleContractCount: rows.filter((row) => row.quality === "FULL_LIFECYCLE").length,
    shallowHighImpactContractIds: rows.filter((row) => { const candidate = candidateFor(input.inventory, row.candidateId); return candidate !== undefined && candidate.impactWeight >= 4 && row.quality !== "FULL_LIFECYCLE"; }).map((row) => row.candidateId),
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "coverage-quality") };
}

function gapValue(gapClass: string): number {
  switch (gapClass) {
    case "DIFFERENTIAL_PROJECTION": return 1000;
    case "REPLAY": return 950;
    case "MECHANICALLY_PROVABLE_UNCOVERED": return 900;
    case "MINIMIZATION": return 850;
    case "DUPLICATE_SEMANTIC_COVERAGE": return 200;
    default: return 500;
  }
}

/** Rank open ledger records by closure value, source impact, and shallow quality. */
export function planSemanticGapClosure(input: {
  readonly inventory: ContractDiscoveryInventory;
  readonly graph: ContractGraph;
  readonly ledger: SemanticGapClosureLedger;
  readonly quality?: CoverageQualityReport;
  readonly maxSelected?: number;
}): GapClosurePlan {
  const qualityByCandidate = new Map((input.quality?.rows ?? []).map((row) => [row.candidateId, row.quality]));
  const items = input.ledger.records.filter((record) => record.closureStatus === "OPEN_ACTIONABLE").map((record) => {
    const candidate = candidateFor(input.inventory, record.contractIdentity);
    const impact = candidate?.impactWeight ?? 0;
    const shallow = qualityByCandidate.get(record.contractIdentity);
    const expected = Math.min(1000, gapValue(record.gapClass) + impact * 10 + (shallow !== undefined && qualityRank(shallow) < qualityRank("HIGH_CONFIDENCE") ? 30 : 0));
    return { rank: 0, gapIdentity: record.gapIdentity, contractId: record.contractIdentity, gapClass: record.gapClass, reasonCode: record.reasonCode, closureStatus: record.closureStatus, expectedDetectionValuePermille: expected, deterministicCost: record.estimatedDeterministicClosureCost, quality: shallow ?? null, selectionReason: record.gapClass === "DIFFERENTIAL_PROJECTION" ? "DIFFERENTIAL_FIRST" : shallow !== undefined && qualityRank(shallow) < qualityRank("HIGH_CONFIDENCE") ? "SHALLOW_COVERAGE_FIRST" : "ACTIONABLE_GAP" };
  }).sort((left, right) => right.expectedDetectionValuePermille - left.expectedDetectionValuePermille || left.deterministicCost.localeCompare(right.deterministicCost) || left.gapIdentity.localeCompare(right.gapIdentity));
  const selectedLimit = Math.max(0, Math.min(input.maxSelected ?? items.length, items.length));
  const selected = items.slice(0, selectedLimit).map((item, index) => ({ ...item, rank: index + 1 }));
  const deferred = items.slice(selectedLimit).map((item, index) => ({ ...item, rank: selected.length + index + 1 }));
  const core = { schemaVersion: SEMANTIC_COVERAGE_QUALITY_VERSION, baselineGraphDigest: input.ledger.baselineGraphDigest, selected, deferred, selectedCount: selected.length };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "closure-plan") };
}
