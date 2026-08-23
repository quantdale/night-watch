// Phase 20 — bounded provenance-backed metamorphic relations.

import { projectionDigest, serializeProjection } from "../../oracles/projections/serializer";
import { semanticStateEquals } from "../../oracles/projections/shape";
import type { ProjectionContext } from "../../oracles/projections/identity";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { resolvePathWithAmbiguity, resolvePath } from "../../oracles/invariants/paths";
import { METAMORPHIC_RELATION_VERSION, sourceEvidenceDigest, type ContractCurrentness, type SafeSourceProvenance } from "./types";
import type { SafePath } from "./relational";

export type MetamorphicKind =
  | "STABLE_ORDER"
  | "IDEMPOTENT_NORMALIZATION"
  | "IRRELEVANT_FIELD_INVARIANCE"
  | "PAGINATION_MONOTONIC"
  | "DUPLICATE_INPUT_NORMALIZATION"
  | "DETERMINISTIC_GROUPING"
  | "PRESENTATION_IDENTITY";

export const METAMORPHIC_KINDS: readonly MetamorphicKind[] = [
  "STABLE_ORDER", "IDEMPOTENT_NORMALIZATION", "IRRELEVANT_FIELD_INVARIANCE", "PAGINATION_MONOTONIC",
  "DUPLICATE_INPUT_NORMALIZATION", "DETERMINISTIC_GROUPING", "PRESENTATION_IDENTITY",
];

export type MetamorphicDefinition =
  | { readonly kind: "STABLE_ORDER"; readonly collectionPath: SafePath; readonly itemValuePath: SafePath; readonly direction: "ASCENDING" | "DESCENDING" }
  | { readonly kind: "IDEMPOTENT_NORMALIZATION"; readonly path: SafePath }
  | { readonly kind: "IRRELEVANT_FIELD_INVARIANCE"; readonly comparedPath: SafePath }
  | { readonly kind: "PAGINATION_MONOTONIC"; readonly countPath: SafePath; readonly direction: "NON_DECREASING" | "NON_INCREASING" }
  | { readonly kind: "DUPLICATE_INPUT_NORMALIZATION"; readonly path: SafePath }
  | { readonly kind: "DETERMINISTIC_GROUPING"; readonly path: SafePath }
  | { readonly kind: "PRESENTATION_IDENTITY"; readonly path: SafePath };

export interface MetamorphicRelation {
  readonly schemaVersion: typeof METAMORPHIC_RELATION_VERSION;
  readonly relationId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  readonly sourceCurrentness: ContractCurrentness;
  readonly definition: MetamorphicDefinition;
  readonly proofStatus: "ADMITTED" | "REJECTED";
  readonly deterministicDigest: string;
}

export type MetamorphicOutcome = "HOLDS" | "VIOLATED" | "NOT_APPLICABLE" | "SOURCE_STALE" | "INSUFFICIENT_AUTHORITY" | "PROJECTION_INCOMPATIBLE" | "INTERNAL_ERROR";

export interface MetamorphicEvaluation {
  readonly schemaVersion: typeof METAMORPHIC_RELATION_VERSION;
  readonly relationId: string;
  readonly outcome: MetamorphicOutcome;
  readonly reasonCode: string;
  readonly projectionDigests: readonly string[];
  readonly deterministicDigest: string;
}

export type MetamorphicExerciseStatus = "EXERCISED" | "NOT_JUSTIFIED" | "NOT_EXERCISED";

export interface MetamorphicVocabularyRow {
  readonly kind: MetamorphicKind;
  readonly status: MetamorphicExerciseStatus;
  readonly relationIds: readonly string[];
  readonly reasonCode: string;
}

export interface MetamorphicVocabularyAudit {
  readonly schemaVersion: typeof METAMORPHIC_RELATION_VERSION;
  readonly rows: readonly MetamorphicVocabularyRow[];
  readonly exercisedKindCount: number;
  readonly notJustifiedKindCount: number;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`METAMORPHIC_RELATION_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;

function safeId(value: string, label: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${label}_ID`);
}

function safePath(path: SafePath, label: string): void {
  if (!Array.isArray(path) || path.length === 0 || path.length > 16 || path.some((part) => !SAFE_PATH_RE.test(part) || FORBIDDEN_FIELD_NAMES.has(part))) invalid(`${label}_PATH`);
}

function validateDefinition(definition: MetamorphicDefinition): void {
  switch (definition.kind) {
    case "STABLE_ORDER": safePath(definition.collectionPath, "COLLECTION"); safePath(definition.itemValuePath, "ITEM"); break;
    default: safePath("path" in definition ? definition.path : "comparedPath" in definition ? definition.comparedPath : definition.countPath, "PATH"); break;
  }
}

export function createMetamorphicRelation(input: {
  readonly relationId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  readonly sourceCurrentness: ContractCurrentness;
  readonly definition: MetamorphicDefinition;
  readonly mechanicallyProven: boolean;
}): MetamorphicRelation {
  safeId(input.relationId, "RELATION");
  validateDefinition(input.definition);
  const core = {
    schemaVersion: METAMORPHIC_RELATION_VERSION,
    relationId: input.relationId,
    sourceProvenance: input.sourceProvenance,
    sourceCurrentness: input.sourceCurrentness,
    definition: input.definition,
    proofStatus: input.mechanicallyProven && input.sourceCurrentness === "CURRENT" ? "ADMITTED" as const : "REJECTED" as const,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function compatible(projection: SemanticProjection): boolean {
  try { serializeProjection(projection); return true; } catch { return false; }
}

function nodeAt(projection: SemanticProjection, path: SafePath): ProjectionNode | undefined {
  const resolved = resolvePathWithAmbiguity(projection.root, path);
  return resolved.na ? undefined : resolved.node;
}

function numeric(node: ProjectionNode | undefined, ctx: ProjectionContext): number | undefined {
  return node?.type === "NUMBER" && node.numericRef !== undefined ? ctx.numericValue(node.numericRef) : undefined;
}

function evaluateOrder(node: ProjectionNode | undefined, definition: Extract<MetamorphicDefinition, { kind: "STABLE_ORDER" }>, ctx: ProjectionContext): MetamorphicOutcome {
  if (node?.type !== "ARRAY" || node.items === undefined || node.items.length === 0 || node.arrayTruncated === true) return "NOT_APPLICABLE";
  const values: number[] = [];
  for (const item of node.items) {
    const value = numeric(resolvePath(item, definition.itemValuePath), ctx);
    if (value === undefined) return "NOT_APPLICABLE";
    values.push(value);
  }
  const holds = values.every((value, index) => index === 0 || (definition.direction === "ASCENDING" ? values[index - 1]! <= value : values[index - 1]! >= value));
  return holds ? "HOLDS" : "VIOLATED";
}

function output(input: { readonly relation: MetamorphicRelation; readonly outcome: MetamorphicOutcome; readonly projections: readonly SemanticProjection[]; readonly reasonCode: string }): MetamorphicEvaluation {
  const core = { schemaVersion: METAMORPHIC_RELATION_VERSION, relationId: input.relation.relationId, outcome: input.outcome, reasonCode: input.reasonCode, projectionDigests: input.projections.map(projectionDigest) };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

/** Evaluate a declared relation over one or two safe projections. */
export function evaluateMetamorphicRelation(input: {
  readonly relation: MetamorphicRelation;
  readonly baseline: SemanticProjection;
  readonly transformed: SemanticProjection;
  readonly ctx: ProjectionContext;
}): MetamorphicEvaluation {
  const { relation, baseline, transformed, ctx } = input;
  if (relation.schemaVersion !== METAMORPHIC_RELATION_VERSION) return output({ relation, outcome: "INTERNAL_ERROR", projections: [baseline, transformed], reasonCode: "UNKNOWN_SCHEMA" });
  if (relation.proofStatus !== "ADMITTED") return output({ relation, outcome: relation.sourceCurrentness === "CURRENT" ? "INSUFFICIENT_AUTHORITY" : "SOURCE_STALE", projections: [baseline, transformed], reasonCode: "RELATION_NOT_ADMITTED" });
  if (relation.sourceCurrentness !== "CURRENT") return output({ relation, outcome: "SOURCE_STALE", projections: [baseline, transformed], reasonCode: "SOURCE_CURRENTNESS" });
  if (!compatible(baseline) || !compatible(transformed)) return output({ relation, outcome: "PROJECTION_INCOMPATIBLE", projections: [baseline, transformed], reasonCode: "PROJECTION_SCHEMA" });
  const definition = relation.definition;
  if (definition.kind === "STABLE_ORDER") {
    const first = evaluateOrder(nodeAt(baseline, definition.collectionPath), definition, ctx);
    const second = evaluateOrder(nodeAt(transformed, definition.collectionPath), definition, ctx);
    const outcome = first === "VIOLATED" || second === "VIOLATED" ? "VIOLATED" : first === "HOLDS" && second === "HOLDS" ? "HOLDS" : "NOT_APPLICABLE";
    return output({ relation, outcome, projections: [baseline, transformed], reasonCode: outcome === "HOLDS" ? "ORDER_STABLE" : "ORDER_RELATION" });
  }
  if (definition.kind === "PAGINATION_MONOTONIC") {
    const left = numeric(nodeAt(baseline, definition.countPath), ctx);
    const right = numeric(nodeAt(transformed, definition.countPath), ctx);
    if (left === undefined || right === undefined) return output({ relation, outcome: "NOT_APPLICABLE", projections: [baseline, transformed], reasonCode: "COUNT_UNAVAILABLE" });
    const holds = definition.direction === "NON_DECREASING" ? right >= left : right <= left;
    return output({ relation, outcome: holds ? "HOLDS" : "VIOLATED", projections: [baseline, transformed], reasonCode: holds ? "MONOTONIC_HOLDS" : "MONOTONIC_VIOLATED" });
  }
  const leftPath = definition.kind === "IRRELEVANT_FIELD_INVARIANCE" ? definition.comparedPath : definition.path;
  const left = nodeAt(baseline, leftPath);
  const right = nodeAt(transformed, leftPath);
  if (left === undefined || right === undefined) return output({ relation, outcome: "NOT_APPLICABLE", projections: [baseline, transformed], reasonCode: "PATH_UNAVAILABLE" });
  const holds = semanticStateEquals(left, right);
  return output({ relation, outcome: holds ? "HOLDS" : "VIOLATED", projections: [baseline, transformed], reasonCode: holds ? "METAMORPHIC_RELATION_HOLDS" : "METAMORPHIC_RELATION_VIOLATED" });
}

export function metamorphicCoverage(evaluations: readonly MetamorphicEvaluation[]): { readonly relationCount: number; readonly admittedEvaluated: number; readonly holds: number; readonly violations: number; readonly notApplicable: number; readonly deterministicDigest: string } {
  const core = { relationCount: evaluations.length, admittedEvaluated: evaluations.filter((entry) => entry.outcome === "HOLDS" || entry.outcome === "VIOLATED").length, holds: evaluations.filter((entry) => entry.outcome === "HOLDS").length, violations: evaluations.filter((entry) => entry.outcome === "VIOLATED").length, notApplicable: evaluations.filter((entry) => entry.outcome === "NOT_APPLICABLE").length };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

/** Audit all seven vocabulary kinds without manufacturing unsupported proofs. */
export function auditMetamorphicVocabulary(input: {
  readonly relations: readonly MetamorphicRelation[];
  readonly notJustifiedReasons?: Readonly<Partial<Record<MetamorphicKind, string>>>;
}): MetamorphicVocabularyAudit {
  const rows = METAMORPHIC_KINDS.map((kind) => {
    const relationIds = input.relations.filter((relation) => relation.definition.kind === kind && relation.proofStatus === "ADMITTED").map((relation) => relation.relationId).sort();
    const reasonCode = input.notJustifiedReasons?.[kind] ?? (relationIds.length > 0 ? "ADMITTED_RELATION_EXERCISED" : "MECHANICAL_EXERCISE_NOT_BOUND");
    const status: MetamorphicExerciseStatus = relationIds.length > 0 ? "EXERCISED" : input.notJustifiedReasons?.[kind] !== undefined ? "NOT_JUSTIFIED" : "NOT_EXERCISED";
    return { kind, status, relationIds, reasonCode };
  });
  const core = { schemaVersion: METAMORPHIC_RELATION_VERSION, rows, exercisedKindCount: rows.filter((row) => row.status === "EXERCISED").length, notJustifiedKindCount: rows.filter((row) => row.status === "NOT_JUSTIFIED").length };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}
