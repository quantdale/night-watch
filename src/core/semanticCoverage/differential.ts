// Phase 20 — explicit-equivalence cross-surface semantic comparison.

import { projectionDigest, serializeProjection } from "../../oracles/projections/serializer";
import { semanticStateEquals } from "../../oracles/projections/shape";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { resolvePathWithAmbiguity } from "../../oracles/invariants/paths";
import { DIFFERENTIAL_CONTRACT_VERSION, sourceEvidenceDigest, type ContractCurrentness, type SafeSourceProvenance } from "./types";
import type { SafePath } from "./relational";

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

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_DIFFERENTIAL_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${label}_PRIVACY`);
}

function safePath(path: SafePath, label: string): void {
  if (!Array.isArray(path) || path.length === 0 || path.length > 16 || path.some((part) => !SAFE_PATH_RE.test(part) || FORBIDDEN_FIELD_NAMES.has(part))) invalid(`${label}_PATH`);
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
}): SurfaceEquivalenceContract {
  safeId(input.equivalenceId, "EQUIVALENCE");
  safeId(input.leftSurfaceId, "LEFT_SURFACE");
  safeId(input.rightSurfaceId, "RIGHT_SURFACE");
  safePath(input.leftPath, "LEFT");
  safePath(input.rightPath, "RIGHT");
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
  const core = {
    schemaVersion: DIFFERENTIAL_CONTRACT_VERSION,
    equivalenceId: input.contract.equivalenceId,
    outcome: input.outcome,
    leftSurfaceId: input.left.surfaceId,
    rightSurfaceId: input.right.surfaceId,
    leftProjectionDigest: safeProjectionDigest(input.left.projection),
    rightProjectionDigest: safeProjectionDigest(input.right.projection),
    comparedPathClasses: input.comparedPathClasses ?? [],
    reasonCode: input.reasonCode,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
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
  if (leftNode === undefined || rightNode === undefined) return evaluation({ contract, outcome: "SURFACE_NOT_APPLICABLE", left, right, reasonCode: "PATH_UNAVAILABLE" });
  const equal = semanticStateEquals(leftNode, rightNode);
  if (contract.expected === "DIFFERENT") return evaluation({ contract, outcome: equal ? "CONTRACT_VIOLATION" : "EXPECTED_DIFFERENCE", left, right, reasonCode: equal ? "EXPECTED_DIFFERENCE_MISSING" : "DECLARED_DIFFERENCE_HOLDS", comparedPathClasses: [leftNode.type, rightNode.type] });
  if (!equal) return evaluation({ contract, outcome: "CONTRACT_VIOLATION", left, right, reasonCode: "EQUIVALENCE_VIOLATED", comparedPathClasses: [leftNode.type, rightNode.type] });
  const outcome: DifferentialOutcome = contract.comparison === "EXACT" ? "EXACT_EQUIVALENT" : "SEMANTICALLY_EQUIVALENT";
  return evaluation({ contract, outcome, left, right, reasonCode: "EQUIVALENCE_HOLDS", comparedPathClasses: [leftNode.type] });
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
