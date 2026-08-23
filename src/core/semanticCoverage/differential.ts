// Phase 20 — explicit-equivalence cross-surface semantic comparison.

import { projectionDigest, serializeProjection } from "../../oracles/projections/serializer";
import { semanticStateEquals } from "../../oracles/projections/shape";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { resolvePathWithAmbiguity } from "../../oracles/invariants/paths";
import { DIFFERENTIAL_CONTRACT_VERSION, sourceEvidenceDigest, type ContractCurrentness, type SafeSourceProvenance } from "./types";
import type { SafePath } from "./relational";

export const DIFFERENTIAL_ALIGNMENT_VERSION = "nightwatch.semantic-differential-alignment.v1" as const;
export const DIFFERENTIAL_PAIR_DISCOVERY_VERSION = "nightwatch.semantic-differential-pair-discovery.v1" as const;

export type DifferentialAlignmentKind = "SCALAR_TO_SINGLETON_LIST" | "ORDERED_LIST_TO_SET" | "ABSENT_TO_NULL";

export interface DifferentialAlignmentRule {
  readonly schemaVersion: typeof DIFFERENTIAL_ALIGNMENT_VERSION;
  readonly kind: DifferentialAlignmentKind;
}

export type DifferentialOutcome =
  | "EXACT_EQUIVALENT"
  | "SEMANTICALLY_EQUIVALENT"
  | "EXPECTED_DIFFERENCE"
  | "CONTRACT_VIOLATION"
  | "SURFACE_NOT_APPLICABLE"
  | "SOURCE_STALE"
  | "PROJECTION_INCOMPATIBLE"
  | "INSUFFICIENT_AUTHORITY"
  | "INTERNAL_ERROR";

export const DIFFERENTIAL_OUTCOMES: readonly DifferentialOutcome[] = [
  "EXACT_EQUIVALENT", "SEMANTICALLY_EQUIVALENT", "EXPECTED_DIFFERENCE", "CONTRACT_VIOLATION",
  "SURFACE_NOT_APPLICABLE", "SOURCE_STALE", "PROJECTION_INCOMPATIBLE", "INSUFFICIENT_AUTHORITY", "INTERNAL_ERROR",
];

export interface SurfaceEquivalenceContract {
  readonly schemaVersion: typeof DIFFERENTIAL_CONTRACT_VERSION;
  readonly equivalenceId: string;
  readonly leftSurfaceId: string;
  readonly rightSurfaceId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  readonly sourceCurrentness: ContractCurrentness;
  readonly expected: "EQUAL" | "DIFFERENT";
  readonly comparison: "EXACT" | "SEMANTIC";
  readonly leftPath: SafePath;
  readonly rightPath: SafePath;
  readonly alignmentRule?: DifferentialAlignmentRule;
  readonly proofStatus: "ADMITTED" | "REJECTED";
  readonly deterministicDigest: string;
}

export interface SurfaceObservation {
  readonly surfaceId: string;
  readonly observationId: string;
  readonly sourceCurrentness: ContractCurrentness;
  readonly applicable: boolean;
  readonly projection: SemanticProjection | null;
}

export interface DifferentialEvaluation {
  readonly schemaVersion: typeof DIFFERENTIAL_CONTRACT_VERSION;
  readonly equivalenceId: string;
  readonly outcome: DifferentialOutcome;
  readonly leftSurfaceId: string;
  readonly rightSurfaceId: string;
  readonly leftProjectionDigest: string | null;
  readonly rightProjectionDigest: string | null;
  readonly comparedPathClasses: readonly string[];
  readonly alignmentRuleKind: DifferentialAlignmentKind | "NONE";
  readonly reasonCode: string;
  readonly deterministicDigest: string;
}

export interface DifferentialCoverageReport {
  readonly schemaVersion: typeof DIFFERENTIAL_CONTRACT_VERSION;
  readonly pairCount: number;
  readonly eligiblePairCount: number;
  readonly evaluatedPairCount: number;
  readonly exactEquivalentCount: number;
  readonly semanticEquivalentCount: number;
  readonly expectedDifferenceCount: number;
  readonly contractViolationCount: number;
  readonly staleCount: number;
  readonly incompatibleCount: number;
  readonly deterministicDigest: string;
}

export type DifferentialPairDiscoveryOutcome =
  | "PAIR_ADMITTED"
  | "NO_SECOND_SURFACE"
  | "SEMANTICS_NOT_EQUIVALENT"
  | "PROJECTION_MISSING_LEFT"
  | "PROJECTION_MISSING_RIGHT"
  | "SOURCE_STALE"
  | "AUTHORITY_BLOCKED"
  | "AMBIGUOUS";

export interface DifferentialPairEvidence {
  readonly candidateId: string;
  readonly equivalenceId: string;
  readonly leftSurfaceId: string;
  readonly rightSurfaceId: string;
  readonly leftPath: SafePath;
  readonly rightPath: SafePath;
  readonly expected: "EQUAL" | "DIFFERENT";
  readonly comparison: "EXACT" | "SEMANTIC";
  readonly alignmentRule?: DifferentialAlignmentRule;
  readonly mechanicallyProven: boolean;
  readonly authorityAllowed: boolean;
  readonly projectionAvailableLeft: boolean;
  readonly projectionAvailableRight: boolean;
}

export interface DifferentialPairDiscoveryRow {
  readonly candidateId: string;
  readonly equivalenceId: string | null;
  readonly leftSurfaceId: string | null;
  readonly rightSurfaceId: string | null;
  readonly outcome: DifferentialPairDiscoveryOutcome;
  readonly reasonCode: string;
  readonly sourceCurrentness: ContractCurrentness;
  readonly deterministicDigest: string;
}

export interface DifferentialPairDiscoveryReport {
  readonly schemaVersion: typeof DIFFERENTIAL_PAIR_DISCOVERY_VERSION;
  readonly rows: readonly DifferentialPairDiscoveryRow[];
  readonly admittedContracts: readonly SurfaceEquivalenceContract[];
  readonly candidateCount: number;
  readonly pairCount: number;
  readonly admittedPairCount: number;
  readonly outcomeCounts: Readonly<Record<DifferentialPairDiscoveryOutcome, number>>;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_DIFFERENTIAL_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;

const ALIGNMENT_KINDS: readonly DifferentialAlignmentKind[] = ["SCALAR_TO_SINGLETON_LIST", "ORDERED_LIST_TO_SET", "ABSENT_TO_NULL"];

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${label}_PRIVACY`);
}

function safePath(path: SafePath, label: string): void {
  if (!Array.isArray(path) || path.length === 0 || path.length > 16 || path.some((part) => !SAFE_PATH_RE.test(part) || FORBIDDEN_FIELD_NAMES.has(part))) invalid(`${label}_PATH`);
}

function validateAlignment(rule: DifferentialAlignmentRule | undefined): void {
  if (rule === undefined) return;
  if (rule.schemaVersion !== DIFFERENTIAL_ALIGNMENT_VERSION || !ALIGNMENT_KINDS.includes(rule.kind)) invalid("ALIGNMENT_RULE");
}

/** Create an equivalence contract from an explicit source-backed proof. */
export function createSurfaceEquivalenceContract(input: {
  readonly equivalenceId: string;
  readonly leftSurfaceId: string;
  readonly rightSurfaceId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  readonly sourceCurrentness: ContractCurrentness;
  readonly expected: "EQUAL" | "DIFFERENT";
  readonly comparison: "EXACT" | "SEMANTIC";
  readonly leftPath: SafePath;
  readonly rightPath: SafePath;
  readonly mechanicallyProven: boolean;
  readonly alignmentRule?: DifferentialAlignmentRule;
}): SurfaceEquivalenceContract {
  safeId(input.equivalenceId, "EQUIVALENCE");
  safeId(input.leftSurfaceId, "LEFT_SURFACE");
  safeId(input.rightSurfaceId, "RIGHT_SURFACE");
  safePath(input.leftPath, "LEFT");
  safePath(input.rightPath, "RIGHT");
  validateAlignment(input.alignmentRule);
  if (input.leftSurfaceId === input.rightSurfaceId) invalid("SAME_SURFACE");
  const core = {
    schemaVersion: DIFFERENTIAL_CONTRACT_VERSION,
    equivalenceId: input.equivalenceId,
    leftSurfaceId: input.leftSurfaceId,
    rightSurfaceId: input.rightSurfaceId,
    sourceProvenance: input.sourceProvenance,
    sourceCurrentness: input.sourceCurrentness,
    expected: input.expected,
    comparison: input.comparison,
    leftPath: input.leftPath,
    rightPath: input.rightPath,
    proofStatus: input.mechanicallyProven && input.sourceCurrentness === "CURRENT" ? "ADMITTED" as const : "REJECTED" as const,
    ...(input.alignmentRule === undefined ? {} : { alignmentRule: input.alignmentRule }),
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function subtree(projection: SemanticProjection, path: SafePath): ProjectionNode | undefined {
  const result = resolvePathWithAmbiguity(projection.root, path);
  return result.na ? undefined : result.node;
}

function compatible(projection: SemanticProjection): boolean {
  try { serializeProjection(projection); return true; } catch { return false; }
}

function evaluation(input: {
  readonly contract: SurfaceEquivalenceContract;
  readonly outcome: DifferentialOutcome;
  readonly left: SurfaceObservation;
  readonly right: SurfaceObservation;
  readonly reasonCode: string;
  readonly comparedPathClasses?: readonly string[];
}): DifferentialEvaluation {
  const safeProjectionDigest = (projection: SemanticProjection | null): string | null => {
    if (projection === null) return null;
    try { return projectionDigest(projection); } catch { return null; }
  };
  const alignmentRuleKind: DifferentialEvaluation["alignmentRuleKind"] = input.contract.alignmentRule?.kind ?? "NONE";
  const core = {
    schemaVersion: DIFFERENTIAL_CONTRACT_VERSION,
    equivalenceId: input.contract.equivalenceId,
    outcome: input.outcome,
    leftSurfaceId: input.left.surfaceId,
    rightSurfaceId: input.right.surfaceId,
    leftProjectionDigest: safeProjectionDigest(input.left.projection),
    rightProjectionDigest: safeProjectionDigest(input.right.projection),
    comparedPathClasses: input.comparedPathClasses ?? [],
    alignmentRuleKind,
    reasonCode: input.reasonCode,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function alignedNodes(left: ProjectionNode | undefined, right: ProjectionNode | undefined, rule: DifferentialAlignmentRule | undefined): { readonly equal: boolean; readonly classes: readonly string[] } | null {
  if (left === undefined || right === undefined) {
    if (rule?.kind === "ABSENT_TO_NULL" && ((left === undefined && right?.type === "NULL") || (right === undefined && left?.type === "NULL"))) return { equal: true, classes: [left?.type ?? "MISSING", right?.type ?? "MISSING"] };
    return null;
  }
  if (rule === undefined) return { equal: semanticStateEquals(left, right), classes: [left.type, right.type] };
  if (rule.schemaVersion !== DIFFERENTIAL_ALIGNMENT_VERSION || !ALIGNMENT_KINDS.includes(rule.kind)) return null;
  if (rule.kind === "SCALAR_TO_SINGLETON_LIST") {
    const leftNode = left.type === "ARRAY" && left.items?.length === 1 ? left.items[0] : left;
    const rightNode = right.type === "ARRAY" && right.items?.length === 1 ? right.items[0] : right;
    if (leftNode === undefined || rightNode === undefined || (left.type !== "ARRAY" && right.type !== "ARRAY")) return null;
    return { equal: semanticStateEquals(leftNode, rightNode), classes: [left.type, right.type, leftNode.type] };
  }
  if (rule.kind === "ORDERED_LIST_TO_SET") {
    if (left.type !== "ARRAY" || right.type !== "ARRAY") return null;
    return { equal: semanticStateEquals(left, right), classes: [left.type, right.type, "SET"] };
  }
  return { equal: semanticStateEquals(left, right), classes: [left.type, right.type] };
}

/** Compare two sanitized observations only under an explicitly admitted pair. */
export function compareSurfaceSemantics(input: {
  readonly contract: SurfaceEquivalenceContract;
  readonly left: SurfaceObservation;
  readonly right: SurfaceObservation;
}): DifferentialEvaluation {
  const { contract, left, right } = input;
  if (contract.schemaVersion !== DIFFERENTIAL_CONTRACT_VERSION) return evaluation({ contract, outcome: "INTERNAL_ERROR", left, right, reasonCode: "UNKNOWN_SCHEMA" });
  if (contract.proofStatus !== "ADMITTED") return evaluation({ contract, outcome: "INSUFFICIENT_AUTHORITY", left, right, reasonCode: "EQUIVALENCE_NOT_ADMITTED" });
  if (contract.sourceCurrentness !== "CURRENT" || left.sourceCurrentness !== "CURRENT" || right.sourceCurrentness !== "CURRENT") return evaluation({ contract, outcome: "SOURCE_STALE", left, right, reasonCode: "SOURCE_CURRENTNESS" });
  if (left.surfaceId !== contract.leftSurfaceId || right.surfaceId !== contract.rightSurfaceId) return evaluation({ contract, outcome: "INSUFFICIENT_AUTHORITY", left, right, reasonCode: "SURFACE_PAIR_MISMATCH" });
  if (!left.applicable || !right.applicable || left.projection === null || right.projection === null) return evaluation({ contract, outcome: "SURFACE_NOT_APPLICABLE", left, right, reasonCode: "SURFACE_OBSERVATION_MISSING" });
  if (!compatible(left.projection) || !compatible(right.projection)) return evaluation({ contract, outcome: "PROJECTION_INCOMPATIBLE", left, right, reasonCode: "PROJECTION_SCHEMA" });
  const leftNode = subtree(left.projection, contract.leftPath);
  const rightNode = subtree(right.projection, contract.rightPath);
  if (leftNode === undefined || rightNode === undefined) {
    const absentAlignment = alignedNodes(leftNode, rightNode, contract.alignmentRule);
    if (absentAlignment === null) return evaluation({ contract, outcome: "SURFACE_NOT_APPLICABLE", left, right, reasonCode: "PATH_UNAVAILABLE" });
    if (contract.expected === "DIFFERENT") return evaluation({ contract, outcome: absentAlignment.equal ? "CONTRACT_VIOLATION" : "EXPECTED_DIFFERENCE", left, right, reasonCode: absentAlignment.equal ? "EXPECTED_DIFFERENCE_MISSING" : "DECLARED_DIFFERENCE_HOLDS", comparedPathClasses: absentAlignment.classes });
    if (!absentAlignment.equal) return evaluation({ contract, outcome: "CONTRACT_VIOLATION", left, right, reasonCode: "EQUIVALENCE_VIOLATED", comparedPathClasses: absentAlignment.classes });
    const absentOutcome: DifferentialOutcome = contract.comparison === "EXACT" ? "EXACT_EQUIVALENT" : "SEMANTICALLY_EQUIVALENT";
    return evaluation({ contract, outcome: absentOutcome, left, right, reasonCode: "EQUIVALENCE_HOLDS", comparedPathClasses: absentAlignment.classes });
  }
  const aligned = alignedNodes(leftNode, rightNode, contract.alignmentRule);
  if (aligned === null) return evaluation({ contract, outcome: "PROJECTION_INCOMPATIBLE", left, right, reasonCode: "ALIGNMENT_NOT_APPLICABLE", comparedPathClasses: [leftNode.type, rightNode.type] });
  const equal = aligned.equal;
  if (contract.expected === "DIFFERENT") return evaluation({ contract, outcome: equal ? "CONTRACT_VIOLATION" : "EXPECTED_DIFFERENCE", left, right, reasonCode: equal ? "EXPECTED_DIFFERENCE_MISSING" : "DECLARED_DIFFERENCE_HOLDS", comparedPathClasses: aligned.classes });
  if (!equal) return evaluation({ contract, outcome: "CONTRACT_VIOLATION", left, right, reasonCode: "EQUIVALENCE_VIOLATED", comparedPathClasses: aligned.classes });
  const outcome: DifferentialOutcome = contract.comparison === "EXACT" ? "EXACT_EQUIVALENT" : "SEMANTICALLY_EQUIVALENT";
  return evaluation({ contract, outcome, left, right, reasonCode: "EQUIVALENCE_HOLDS", comparedPathClasses: aligned.classes });
}

function discoveryRow(input: {
  readonly candidateId: string;
  readonly evidence: DifferentialPairEvidence | null;
  readonly outcome: DifferentialPairDiscoveryOutcome;
  readonly reasonCode: string;
  readonly sourceCurrentness: ContractCurrentness;
}): DifferentialPairDiscoveryRow {
  const core = {
    candidateId: input.candidateId,
    equivalenceId: input.evidence?.equivalenceId ?? null,
    leftSurfaceId: input.evidence?.leftSurfaceId ?? null,
    rightSurfaceId: input.evidence?.rightSurfaceId ?? null,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    sourceCurrentness: input.sourceCurrentness,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

/** Discover only explicit, source-bound surface equivalences; names alone never admit a pair. */
export function discoverDifferentialPairs(input: {
  readonly inventory: import("./types").ContractDiscoveryInventory;
  readonly evidence: readonly DifferentialPairEvidence[];
}): DifferentialPairDiscoveryReport {
  if (input.inventory.schemaVersion !== "nightwatch.contract-discovery.v1") invalid("INVENTORY_VERSION");
  const candidates = [...input.inventory.candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const evidenceByCandidate = new Map<string, DifferentialPairEvidence[]>();
  for (const evidence of input.evidence) {
    safeId(evidence.candidateId, "CANDIDATE");
    safeId(evidence.equivalenceId, "EQUIVALENCE");
    safeId(evidence.leftSurfaceId, "LEFT_SURFACE");
    safeId(evidence.rightSurfaceId, "RIGHT_SURFACE");
    safePath(evidence.leftPath, "LEFT");
    safePath(evidence.rightPath, "RIGHT");
    validateAlignment(evidence.alignmentRule);
    const list = evidenceByCandidate.get(evidence.candidateId) ?? [];
    list.push(evidence);
    evidenceByCandidate.set(evidence.candidateId, list);
  }
  const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
  for (const candidateId of evidenceByCandidate.keys()) {
    if (!candidateIds.has(candidateId)) invalid("ORPHAN_EVIDENCE");
  }
  const rows: DifferentialPairDiscoveryRow[] = [];
  const admittedContracts: SurfaceEquivalenceContract[] = [];
  for (const candidate of candidates) {
    const available = [...new Set(candidate.observationSurfaces)].sort();
    const evidence = evidenceByCandidate.get(candidate.candidateId) ?? [];
    if (available.length < 2) {
      rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: null, outcome: "NO_SECOND_SURFACE", reasonCode: "ONLY_ONE_OBSERVATION_SURFACE", sourceCurrentness: candidate.currentness }));
      continue;
    }
    if (evidence.length !== 1) {
      rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: evidence[0] ?? null, outcome: evidence.length === 0 ? "AMBIGUOUS" : "AMBIGUOUS", reasonCode: evidence.length === 0 ? "EXPLICIT_EQUIVALENCE_MISSING" : "MULTIPLE_EQUIVALENCES", sourceCurrentness: candidate.currentness }));
      continue;
    }
    const item = evidence[0]!;
    if (candidate.currentness !== "CURRENT") rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "SOURCE_STALE", reasonCode: "SOURCE_CURRENTNESS", sourceCurrentness: candidate.currentness }));
    else if (!item.authorityAllowed) rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "AUTHORITY_BLOCKED", reasonCode: "AUTHORITY_NOT_GRANTED", sourceCurrentness: candidate.currentness }));
    else if (!available.some((surface) => surface === item.leftSurfaceId)) rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "PROJECTION_MISSING_LEFT", reasonCode: "LEFT_SURFACE_NOT_DECLARED", sourceCurrentness: candidate.currentness }));
    else if (!available.some((surface) => surface === item.rightSurfaceId)) rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "PROJECTION_MISSING_RIGHT", reasonCode: "RIGHT_SURFACE_NOT_DECLARED", sourceCurrentness: candidate.currentness }));
    else if (!item.mechanicallyProven) rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "SEMANTICS_NOT_EQUIVALENT", reasonCode: "EQUIVALENCE_PROOF_MISSING", sourceCurrentness: candidate.currentness }));
    else {
      const contract = createSurfaceEquivalenceContract({ equivalenceId: item.equivalenceId, leftSurfaceId: item.leftSurfaceId, rightSurfaceId: item.rightSurfaceId, sourceProvenance: candidate.source, sourceCurrentness: candidate.currentness, expected: item.expected, comparison: item.comparison, leftPath: item.leftPath, rightPath: item.rightPath, mechanicallyProven: item.mechanicallyProven, alignmentRule: item.alignmentRule });
      admittedContracts.push(contract);
      rows.push(discoveryRow({ candidateId: candidate.candidateId, evidence: item, outcome: "PAIR_ADMITTED", reasonCode: "EXPLICIT_EQUIVALENCE_ADMITTED", sourceCurrentness: candidate.currentness }));
    }
  }
  const orderedRows = rows.sort((left, right) => left.candidateId.localeCompare(right.candidateId) || `${left.equivalenceId}`.localeCompare(`${right.equivalenceId}`));
  const outcomes: readonly DifferentialPairDiscoveryOutcome[] = ["PAIR_ADMITTED", "NO_SECOND_SURFACE", "SEMANTICS_NOT_EQUIVALENT", "PROJECTION_MISSING_LEFT", "PROJECTION_MISSING_RIGHT", "SOURCE_STALE", "AUTHORITY_BLOCKED", "AMBIGUOUS"];
  const outcomeCounts = Object.fromEntries(outcomes.map((outcome) => [outcome, orderedRows.filter((row) => row.outcome === outcome).length])) as Record<DifferentialPairDiscoveryOutcome, number>;
  const orderedContracts = admittedContracts.sort((left, right) => left.equivalenceId.localeCompare(right.equivalenceId));
  const core = { schemaVersion: DIFFERENTIAL_PAIR_DISCOVERY_VERSION, rows: orderedRows, admittedContracts: orderedContracts, candidateCount: orderedRows.length, pairCount: orderedContracts.length, admittedPairCount: orderedContracts.length, outcomeCounts };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

export function buildDifferentialCoverageReport(evaluations: readonly DifferentialEvaluation[]): DifferentialCoverageReport {
  const ordered = [...evaluations].sort((left, right) => left.equivalenceId.localeCompare(right.equivalenceId));
  const core = {
    schemaVersion: DIFFERENTIAL_CONTRACT_VERSION,
    pairCount: ordered.length,
    eligiblePairCount: ordered.filter((entry) => !["INSUFFICIENT_AUTHORITY", "SOURCE_STALE", "INTERNAL_ERROR"].includes(entry.outcome)).length,
    evaluatedPairCount: ordered.filter((entry) => ["EXACT_EQUIVALENT", "SEMANTICALLY_EQUIVALENT", "EXPECTED_DIFFERENCE", "CONTRACT_VIOLATION"].includes(entry.outcome)).length,
    exactEquivalentCount: ordered.filter((entry) => entry.outcome === "EXACT_EQUIVALENT").length,
    semanticEquivalentCount: ordered.filter((entry) => entry.outcome === "SEMANTICALLY_EQUIVALENT").length,
    expectedDifferenceCount: ordered.filter((entry) => entry.outcome === "EXPECTED_DIFFERENCE").length,
    contractViolationCount: ordered.filter((entry) => entry.outcome === "CONTRACT_VIOLATION").length,
    staleCount: ordered.filter((entry) => entry.outcome === "SOURCE_STALE").length,
    incompatibleCount: ordered.filter((entry) => entry.outcome === "PROJECTION_INCOMPATIBLE").length,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}
