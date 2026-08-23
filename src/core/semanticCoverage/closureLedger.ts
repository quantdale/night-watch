// Phase 21 — exact, privacy-safe closure accounting for the Phase 20 graph.
//
// The ledger is a measurement artifact, not a coverage authority. It records
// why each graph gap exists, what bounded capability would close it, and
// whether the gap is actionable under the current source/privacy/authority
// boundary. It never contains raw source or observation values.

import {
  safeSemanticDigest,
  type ContractCandidate,
  type ContractDiscoveryInventory,
  type ContractGraph,
  type ContractGraphGap,
  type SafeSourceProvenance,
} from "./types";

export const SEMANTIC_GAP_CLOSURE_VERSION = "nightwatch.semantic-gap-closure.v1" as const;

export type GapClosureStatus =
  | "OPEN_ACTIONABLE"
  | "CLOSED"
  | "MERGED_REDUNDANT"
  | "IRREDUCIBLE_PRIVACY_BOUNDARY"
  | "IRREDUCIBLE_SOURCE_PROOF"
  | "IRREDUCIBLE_NO_EQUIVALENT_SURFACE"
  | "DEFERRED_AUTHORITY"
  | "OBSOLETE_AFTER_GRAPH_REBUILD";

export type GapClosureClass =
  | "DIFFERENTIAL_PROJECTION"
  | "MECHANICALLY_PROVABLE_UNCOVERED"
  | "REPLAY"
  | "MINIMIZATION"
  | "DUPLICATE_SEMANTIC_COVERAGE"
  | "ANALYZER_UNSUPPORTED"
  | "NO_EQUIVALENT_SURFACE"
  | "OTHER_GRAPH_GAP";

export type GapBlockerClass =
  | "NONE"
  | "PRIVACY_BOUNDARY"
  | "SOURCE_PROOF"
  | "NO_EQUIVALENT_SURFACE"
  | "AUTHORITY"
  | "GRAPH_DUPLICATE"
  | "MISSING_CAPABILITY";

export type GapClosureEligibility = "ELIGIBLE" | "INELIGIBLE";

export type GapLifecycleStage =
  | "DISCOVERED_ONLY"
  | "PROJECTED"
  | "SCENARIO_BOUND"
  | "DIFFERENTIAL_CAPABLE"
  | "REPLAY_SUPPORTED"
  | "MINIMIZATION_SUPPORTED"
  | "STABILITY_CLASSIFIED"
  | "HIGH_CONFIDENCE"
  | "FULLY_COVERED"
  | "GRAPH_NORMALIZED";

export type GapRequiredCapability =
  | "PRIVACY_SAFE_MEMBERSHIP_ORACLE"
  | "SCENARIO_BINDING"
  | "REPLAY_ADAPTER"
  | "SEMANTIC_MINIMIZER"
  | "GRAPH_NORMALIZATION"
  | "SOURCE_PROOF"
  | "EQUIVALENT_SURFACE"
  | "BOUNDED_ORACLE";

export type GapClosureCost = "LOW" | "MEDIUM" | "HIGH";

export interface GapVerificationEvidence {
  readonly evidenceKind:
    | "PHASE21_BASELINE_GRAPH"
    | "PHASE21_SYNTHETIC_CAMPAIGN"
    | "PHASE21_REPLAY_CAMPAIGN"
    | "PHASE21_MINIMIZATION_CAMPAIGN"
    | "PHASE21_GRAPH_REBUILD";
  readonly graphDigest: string;
  readonly evidenceDigest: string;
}

export interface GapClosureRecord {
  readonly gapIdentity: string;
  readonly contractIdentity: string;
  readonly sourceProvenance: SafeSourceProvenance | null;
  readonly currentLifecycleStage: GapLifecycleStage;
  readonly targetLifecycleStage: GapLifecycleStage;
  readonly gapClass: GapClosureClass;
  readonly reasonCode: string;
  readonly blockerClass: GapBlockerClass;
  readonly privacyConstraint: "CATEGORICAL_OUTPUT_ONLY" | "NO_RAW_MEMBERS_OR_TOKENS" | "SOURCE_METADATA_ONLY";
  readonly mechanicalProofConstraint:
    | "CURRENT_SOURCE_EVIDENCE_REQUIRED"
    | "EXPLICIT_SURFACE_EQUIVALENCE_REQUIRED"
    | "CONTRACT_BOUND_FINDING_REQUIRED"
    | "DEPENDENCY_PROOF_REQUIRED"
    | "GRAPH_IDENTITY_REQUIRED"
    | "NONE";
  readonly requiredCapability: GapRequiredCapability;
  readonly estimatedDeterministicClosureCost: GapClosureCost;
  readonly closureEligibility: GapClosureEligibility;
  readonly closureStatus: GapClosureStatus;
  readonly verificationEvidence: GapVerificationEvidence;
  readonly deterministicDigest: string;
}

export interface SemanticGapClosureLedger {
  readonly schemaVersion: typeof SEMANTIC_GAP_CLOSURE_VERSION;
  readonly baselineGraphDigest: string;
  readonly currentGraphDigest: string;
  readonly graphNodeCount: number;
  readonly graphEdgeCount: number;
  readonly records: readonly GapClosureRecord[];
  readonly totalGapCount: number;
  readonly actionableGapCount: number;
  readonly closedGapCount: number;
  readonly irreducibleGapCount: number;
  readonly remainingGapCount: number;
  readonly statusCounts: Readonly<Record<GapClosureStatus, number>>;
  readonly classCounts: Readonly<Record<GapClosureClass, number>>;
  readonly reasonCounts: Readonly<Record<string, number>>;
  readonly deterministicDigest: string;
}

export interface GapClosureOverride {
  readonly closureStatus: GapClosureStatus;
  readonly evidenceKind?: GapVerificationEvidence["evidenceKind"];
  readonly reasonCode?: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_GAP_CLOSURE_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,220}$/;
const SAFE_CATEGORY_RE = /^[A-Z][A-Z0-9_.:/-]{0,120}$/;
const SAFE_DIGEST_RE = /^(?:ev|contract-graph|gap-closure|gap):sha256:[0-9a-f]{24}$/;

const STATUS_VALUES: readonly GapClosureStatus[] = [
  "OPEN_ACTIONABLE",
  "CLOSED",
  "MERGED_REDUNDANT",
  "IRREDUCIBLE_PRIVACY_BOUNDARY",
  "IRREDUCIBLE_SOURCE_PROOF",
  "IRREDUCIBLE_NO_EQUIVALENT_SURFACE",
  "DEFERRED_AUTHORITY",
  "OBSOLETE_AFTER_GRAPH_REBUILD",
];

const CLASS_VALUES: readonly GapClosureClass[] = [
  "DIFFERENTIAL_PROJECTION",
  "MECHANICALLY_PROVABLE_UNCOVERED",
  "REPLAY",
  "MINIMIZATION",
  "DUPLICATE_SEMANTIC_COVERAGE",
  "ANALYZER_UNSUPPORTED",
  "NO_EQUIVALENT_SURFACE",
  "OTHER_GRAPH_GAP",
];

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safeCategory(value: string, field: string): void {
  if (!SAFE_CATEGORY_RE.test(value)) invalid(`${field}_CATEGORY`);
}

function safeDigest(value: string, field: string): void {
  if (!SAFE_DIGEST_RE.test(value)) invalid(`${field}_DIGEST`);
}

function candidateFor(inventory: ContractDiscoveryInventory, contractId: string): ContractCandidate | null {
  return inventory.candidates.find((candidate) => candidate.candidateId === contractId) ?? null;
}

function classifyGap(gap: ContractGraphGap, candidate: ContractCandidate | null): GapClosureClass {
  if (gap.gap === "DIFFERENTIAL_ELIGIBLE") return "DIFFERENTIAL_PROJECTION";
  if (gap.gap === "SINGLE_SURFACE") return "NO_EQUIVALENT_SURFACE";
  if (gap.gap === "REPLAY_GAP") return "REPLAY";
  if (gap.gap === "MINIMIZATION_GAP") return "MINIMIZATION";
  if (gap.gap === "DUPLICATE_COVERAGE") return "DUPLICATE_SEMANTIC_COVERAGE";
  if (gap.gap === "NOT_ADMITTED") return "MECHANICALLY_PROVABLE_UNCOVERED";
  if (gap.gap === "UNEXERCISED" && gap.reasonCode === "SCENARIO_UNBOUND") return "MECHANICALLY_PROVABLE_UNCOVERED";
  if (gap.gap === "UNEXERCISED" || gap.gap === "HIGH_IMPACT_UNCOVERED") return "OTHER_GRAPH_GAP";
  if (candidate?.rejectionCode !== null && candidate?.rejectionCode !== undefined) return "ANALYZER_UNSUPPORTED";
  return "OTHER_GRAPH_GAP";
}

function lifecycleFor(gapClass: GapClosureClass): GapLifecycleStage {
  switch (gapClass) {
    case "DIFFERENTIAL_PROJECTION": return "PROJECTED";
    case "REPLAY": return "SCENARIO_BOUND";
    case "MINIMIZATION": return "REPLAY_SUPPORTED";
    case "DUPLICATE_SEMANTIC_COVERAGE": return "PROJECTED";
    case "ANALYZER_UNSUPPORTED": return "DISCOVERED_ONLY";
    case "NO_EQUIVALENT_SURFACE": return "PROJECTED";
    case "MECHANICALLY_PROVABLE_UNCOVERED": return "PROJECTED";
    case "OTHER_GRAPH_GAP": return "DISCOVERED_ONLY";
  }
}

function targetFor(gapClass: GapClosureClass): GapLifecycleStage {
  switch (gapClass) {
    case "DIFFERENTIAL_PROJECTION": return "DIFFERENTIAL_CAPABLE";
    case "REPLAY": return "REPLAY_SUPPORTED";
    case "MINIMIZATION": return "MINIMIZATION_SUPPORTED";
    case "DUPLICATE_SEMANTIC_COVERAGE": return "GRAPH_NORMALIZED";
    case "ANALYZER_UNSUPPORTED": return "PROJECTED";
    case "NO_EQUIVALENT_SURFACE": return "DIFFERENTIAL_CAPABLE";
    case "MECHANICALLY_PROVABLE_UNCOVERED": return "SCENARIO_BOUND";
    case "OTHER_GRAPH_GAP": return "FULLY_COVERED";
  }
}

function blockerFor(gapClass: GapClosureClass, candidate: ContractCandidate | null): GapBlockerClass {
  if (candidate?.rejectionCode !== null && candidate?.rejectionCode !== undefined) return "SOURCE_PROOF";
  switch (gapClass) {
    case "ANALYZER_UNSUPPORTED": return "SOURCE_PROOF";
    case "NO_EQUIVALENT_SURFACE": return "NO_EQUIVALENT_SURFACE";
    case "DUPLICATE_SEMANTIC_COVERAGE": return "GRAPH_DUPLICATE";
    default: return "NONE";
  }
}

function capabilityFor(gapClass: GapClosureClass): GapRequiredCapability {
  switch (gapClass) {
    case "DIFFERENTIAL_PROJECTION": return "PRIVACY_SAFE_MEMBERSHIP_ORACLE";
    case "REPLAY": return "REPLAY_ADAPTER";
    case "MINIMIZATION": return "SEMANTIC_MINIMIZER";
    case "DUPLICATE_SEMANTIC_COVERAGE": return "GRAPH_NORMALIZATION";
    case "ANALYZER_UNSUPPORTED": return "SOURCE_PROOF";
    case "NO_EQUIVALENT_SURFACE": return "EQUIVALENT_SURFACE";
    case "MECHANICALLY_PROVABLE_UNCOVERED": return "SCENARIO_BINDING";
    case "OTHER_GRAPH_GAP": return "BOUNDED_ORACLE";
  }
}

function costFor(gapClass: GapClosureClass): GapClosureCost {
  switch (gapClass) {
    case "DUPLICATE_SEMANTIC_COVERAGE": return "LOW";
    case "REPLAY":
    case "MINIMIZATION":
    case "MECHANICALLY_PROVABLE_UNCOVERED": return "MEDIUM";
    default: return "HIGH";
  }
}

function proofConstraintFor(gapClass: GapClosureClass): GapClosureRecord["mechanicalProofConstraint"] {
  switch (gapClass) {
    case "DIFFERENTIAL_PROJECTION":
    case "NO_EQUIVALENT_SURFACE": return "EXPLICIT_SURFACE_EQUIVALENCE_REQUIRED";
    case "REPLAY": return "CONTRACT_BOUND_FINDING_REQUIRED";
    case "MINIMIZATION": return "DEPENDENCY_PROOF_REQUIRED";
    case "DUPLICATE_SEMANTIC_COVERAGE": return "GRAPH_IDENTITY_REQUIRED";
    case "ANALYZER_UNSUPPORTED": return "CURRENT_SOURCE_EVIDENCE_REQUIRED";
    default: return "CURRENT_SOURCE_EVIDENCE_REQUIRED";
  }
}

function initialStatus(gapClass: GapClosureClass, candidate: ContractCandidate | null): GapClosureStatus {
  if (gapClass === "ANALYZER_UNSUPPORTED" || (candidate?.rejectionCode !== null && candidate?.rejectionCode !== undefined)) return "IRREDUCIBLE_SOURCE_PROOF";
  if (gapClass === "NO_EQUIVALENT_SURFACE") return "IRREDUCIBLE_NO_EQUIVALENT_SURFACE";
  if (candidate !== null && candidate.currentness !== "CURRENT") return "DEFERRED_AUTHORITY";
  return "OPEN_ACTIONABLE";
}

function evidenceFor(input: { readonly graph: ContractGraph; readonly recordKey: string; readonly evidenceKind?: GapVerificationEvidence["evidenceKind"] }): GapVerificationEvidence {
  const evidenceKind = input.evidenceKind ?? "PHASE21_BASELINE_GRAPH";
  const evidenceDigest = safeSemanticDigest({ graph: input.graph.deterministicDigest, recordKey: input.recordKey, evidenceKind }, "ev");
  return { evidenceKind, graphDigest: input.graph.deterministicDigest, evidenceDigest };
}

function validateRecord(record: GapClosureRecord): void {
  safeDigest(record.gapIdentity, "GAP");
  safeId(record.contractIdentity, "CONTRACT");
  safeCategory(record.gapClass, "CLASS");
  safeCategory(record.reasonCode, "REASON");
  safeCategory(record.blockerClass, "BLOCKER");
  safeCategory(record.requiredCapability, "CAPABILITY");
  safeDigest(record.verificationEvidence.graphDigest, "GRAPH");
  safeDigest(record.verificationEvidence.evidenceDigest, "EVIDENCE");
  if (!STATUS_VALUES.includes(record.closureStatus)) invalid("STATUS");
  if (!CLASS_VALUES.includes(record.gapClass)) invalid("CLASS");
  if (record.closureEligibility === "ELIGIBLE" && record.closureStatus !== "OPEN_ACTIONABLE" && record.closureStatus !== "CLOSED" && record.closureStatus !== "MERGED_REDUNDANT" && record.closureStatus !== "OBSOLETE_AFTER_GRAPH_REBUILD") invalid("ELIGIBILITY_STATUS");
  if (record.closureEligibility === "INELIGIBLE" && record.closureStatus === "OPEN_ACTIONABLE") invalid("INELIGIBLE_OPEN");
}

/** Build a deterministic one-record-per-gap closure ledger. */
export function buildSemanticGapClosureLedger(input: {
  readonly inventory: ContractDiscoveryInventory;
  readonly graph: ContractGraph;
  readonly overrides?: Readonly<Record<string, GapClosureOverride>>;
}): SemanticGapClosureLedger {
  if (input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  if (input.graph.schemaVersion !== "nightwatch.semantic-contract-graph.v1") invalid("GRAPH_VERSION");
  if (input.graph.gaps.length > 2048) invalid("GAP_COUNT");
  const orderedGaps = [...input.graph.gaps].sort((left, right) => left.contractId.localeCompare(right.contractId) || left.gap.localeCompare(right.gap) || left.reasonCode.localeCompare(right.reasonCode) || left.priorityComponent - right.priorityComponent);
  const occurrenceByKey = new Map<string, number>();
  const records: GapClosureRecord[] = [];
  for (const gap of orderedGaps) {
    const candidate = candidateFor(input.inventory, gap.contractId);
    const gapClass = classifyGap(gap, candidate);
    const key = `${gap.contractId}|${gap.gap}|${gap.reasonCode}`;
    const occurrence = (occurrenceByKey.get(key) ?? 0) + 1;
    occurrenceByKey.set(key, occurrence);
    const gapIdentity = safeSemanticDigest({ contractId: gap.contractId, gap: gap.gap, reasonCode: gap.reasonCode, occurrence }, "gap");
    const override = input.overrides?.[gapIdentity];
    const status = override?.closureStatus ?? initialStatus(gapClass, candidate);
    const eligibility: GapClosureEligibility = ["IRREDUCIBLE_PRIVACY_BOUNDARY", "IRREDUCIBLE_SOURCE_PROOF", "IRREDUCIBLE_NO_EQUIVALENT_SURFACE", "DEFERRED_AUTHORITY"].includes(status) ? "INELIGIBLE" : "ELIGIBLE";
    const reasonCode = override?.reasonCode ?? (candidate?.rejectionCode !== null && candidate?.rejectionCode !== undefined ? "ANALYZER_UNSUPPORTED" : gap.reasonCode);
    const core = {
      gapIdentity,
      contractIdentity: gap.contractId,
      sourceProvenance: candidate?.source ?? null,
      currentLifecycleStage: lifecycleFor(gapClass),
      targetLifecycleStage: targetFor(gapClass),
      gapClass,
      reasonCode,
      blockerClass: blockerFor(gapClass, candidate),
      privacyConstraint: gapClass === "DIFFERENTIAL_PROJECTION" ? "NO_RAW_MEMBERS_OR_TOKENS" as const : "CATEGORICAL_OUTPUT_ONLY" as const,
      mechanicalProofConstraint: proofConstraintFor(gapClass),
      requiredCapability: capabilityFor(gapClass),
      estimatedDeterministicClosureCost: costFor(gapClass),
      closureEligibility: eligibility,
      closureStatus: status,
      verificationEvidence: evidenceFor({ graph: input.graph, recordKey: gapIdentity, evidenceKind: override?.evidenceKind }),
    };
    const record = { ...core, deterministicDigest: safeSemanticDigest(core, "gap-closure") };
    validateRecord(record);
    records.push(record);
  }
  const statusCounts = Object.fromEntries(STATUS_VALUES.map((status) => [status, records.filter((record) => record.closureStatus === status).length])) as Record<GapClosureStatus, number>;
  const classCounts = Object.fromEntries(CLASS_VALUES.map((gapClass) => [gapClass, records.filter((record) => record.gapClass === gapClass).length])) as Record<GapClosureClass, number>;
  const reasonCounts: Record<string, number> = {};
  for (const record of records) reasonCounts[record.reasonCode] = (reasonCounts[record.reasonCode] ?? 0) + 1;
  const core = {
    schemaVersion: SEMANTIC_GAP_CLOSURE_VERSION,
    baselineGraphDigest: input.graph.deterministicDigest,
    currentGraphDigest: input.graph.deterministicDigest,
    graphNodeCount: input.graph.nodeCount,
    graphEdgeCount: input.graph.edgeCount,
    records,
    totalGapCount: records.length,
    actionableGapCount: records.filter((record) => record.closureEligibility === "ELIGIBLE" && record.closureStatus === "OPEN_ACTIONABLE").length,
    closedGapCount: records.filter((record) => record.closureStatus === "CLOSED" || record.closureStatus === "MERGED_REDUNDANT" || record.closureStatus === "OBSOLETE_AFTER_GRAPH_REBUILD").length,
    irreducibleGapCount: records.filter((record) => record.closureStatus.startsWith("IRREDUCIBLE_")).length,
    remainingGapCount: records.filter((record) => record.closureStatus === "OPEN_ACTIONABLE" || record.closureStatus.startsWith("IRREDUCIBLE_") || record.closureStatus === "DEFERRED_AUTHORITY").length,
    statusCounts,
    classCounts,
    reasonCounts,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "gap-closure") };
}

/** Preserve the baseline one-record-per-gap ledger across a deterministic
 * graph rebuild. Removed records are explicitly closed/merged; they are not
 * silently dropped from the historical census. */
export function rebuildSemanticGapClosureLedger(input: {
  readonly baseline: SemanticGapClosureLedger;
  readonly inventory: ContractDiscoveryInventory;
  readonly graph: ContractGraph;
}): SemanticGapClosureLedger {
  const current = buildSemanticGapClosureLedger({ inventory: input.inventory, graph: input.graph });
  const currentByKey = new Map(current.records.map((record) => [`${record.contractIdentity}|${record.gapClass}|${record.reasonCode}`, record]));
  const records: GapClosureRecord[] = [];
  for (const baselineRecord of input.baseline.records) {
    const currentRecord = currentByKey.get(`${baselineRecord.contractIdentity}|${baselineRecord.gapClass}|${baselineRecord.reasonCode}`);
    if (currentRecord !== undefined) {
      if (currentRecord.gapClass === "DUPLICATE_SEMANTIC_COVERAGE") {
        const verificationEvidence = evidenceFor({ graph: input.graph, recordKey: currentRecord.gapIdentity, evidenceKind: "PHASE21_GRAPH_REBUILD" });
        // Same shape is not an equivalence proof: OpenAPI and language-model
        // declarations can describe distinct contracts. Keep both gaps
        // explicitly irreducible until a source-bound join is admitted.
        const core = { ...currentRecord, reasonCode: "DUPLICATE_EQUIVALENCE_PROOF_MISSING", blockerClass: "SOURCE_PROOF" as const, closureStatus: "IRREDUCIBLE_SOURCE_PROOF" as const, closureEligibility: "INELIGIBLE" as const, verificationEvidence };
        records.push({ ...core, deterministicDigest: safeSemanticDigest(core, "gap-closure") });
      } else {
        records.push(currentRecord);
      }
      continue;
    }
    const status: GapClosureStatus = "OBSOLETE_AFTER_GRAPH_REBUILD";
    const verificationEvidence = evidenceFor({ graph: input.graph, recordKey: baselineRecord.gapIdentity, evidenceKind: "PHASE21_GRAPH_REBUILD" });
    const core = {
      ...baselineRecord,
      closureStatus: status,
      closureEligibility: "ELIGIBLE" as const,
      verificationEvidence,
    };
    records.push({ ...core, deterministicDigest: safeSemanticDigest(core, "gap-closure") });
  }
  const ordered = records.sort((left, right) => left.gapIdentity.localeCompare(right.gapIdentity));
  const statusCounts = Object.fromEntries(STATUS_VALUES.map((status) => [status, ordered.filter((record) => record.closureStatus === status).length])) as Record<GapClosureStatus, number>;
  const classCounts = Object.fromEntries(CLASS_VALUES.map((gapClass) => [gapClass, ordered.filter((record) => record.gapClass === gapClass).length])) as Record<GapClosureClass, number>;
  const reasonCounts: Record<string, number> = {};
  for (const record of ordered) reasonCounts[record.reasonCode] = (reasonCounts[record.reasonCode] ?? 0) + 1;
  const core = {
    schemaVersion: SEMANTIC_GAP_CLOSURE_VERSION,
    baselineGraphDigest: input.baseline.baselineGraphDigest,
    currentGraphDigest: input.graph.deterministicDigest,
    graphNodeCount: input.graph.nodeCount,
    graphEdgeCount: input.graph.edgeCount,
    records: ordered,
    totalGapCount: ordered.length,
    actionableGapCount: ordered.filter((record) => record.closureStatus === "OPEN_ACTIONABLE").length,
    closedGapCount: ordered.filter((record) => record.closureStatus === "CLOSED" || record.closureStatus === "MERGED_REDUNDANT" || record.closureStatus === "OBSOLETE_AFTER_GRAPH_REBUILD").length,
    irreducibleGapCount: ordered.filter((record) => record.closureStatus.startsWith("IRREDUCIBLE_")).length,
    remainingGapCount: input.graph.gaps.length,
    statusCounts,
    classCounts,
    reasonCounts,
  };
  return { ...core, deterministicDigest: safeSemanticDigest(core, "gap-closure") };
}
