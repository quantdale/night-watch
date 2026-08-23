// Phase 20 — source-proven relational contracts over safe projections.
//
// The evaluator composes the existing invariant evaluator for aggregate/count
// relations and adds only a bounded vocabulary whose source proof is explicit.
// It never accepts raw observations or business mathematics inferred from
// field names.

import type { ProjectionContext } from "../../oracles/projections/identity";
import { projectionDigest, serializeProjection } from "../../oracles/projections/serializer";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { evaluateInvariant } from "../../oracles/invariants/evaluate";
import { resolvePath, resolvePathWithAmbiguity } from "../../oracles/invariants/paths";
import { semanticStateEquals } from "../../oracles/projections/shape";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { sourceEvidenceDigest, RELATIONAL_CONTRACT_VERSION, type ContractCandidate, type ContractCurrentness, type DiscoveredContractShape, type JsonTypeCategory, type SafeSourceProvenance } from "./types";

export type RelationalKind =
  | "FIELD_PRESENT_IF"
  | "TOTAL_EQUALS_SUM"
  | "COUNT_EQUALS_CARDINALITY"
  | "SET_SUBSET"
  | "MUTUALLY_EXCLUSIVE"
  | "EXACTLY_ONE_OF"
  | "MONOTONIC"
  | "ORDERING"
  | "GROUP_AGGREGATE"
  | "PAGINATION_CONSERVATION"
  | "NORMALIZATION_EQUIVALENCE"
  | "IDENTITY_PRESERVATION"
  | "MAPPING_CONSISTENCY";

export const RELATIONAL_KINDS: readonly RelationalKind[] = [
  "FIELD_PRESENT_IF", "TOTAL_EQUALS_SUM", "COUNT_EQUALS_CARDINALITY", "SET_SUBSET",
  "MUTUALLY_EXCLUSIVE", "EXACTLY_ONE_OF", "MONOTONIC", "ORDERING", "GROUP_AGGREGATE",
  "PAGINATION_CONSERVATION", "NORMALIZATION_EQUIVALENCE", "IDENTITY_PRESERVATION", "MAPPING_CONSISTENCY",
];

export type SafePath = readonly string[];

export type RelationalDefinition =
  | { readonly kind: "FIELD_PRESENT_IF"; readonly conditionPath: SafePath; readonly targetPath: SafePath; readonly conditionExpected: boolean }
  | { readonly kind: "TOTAL_EQUALS_SUM"; readonly collectionPath: SafePath; readonly numericFieldPath: SafePath; readonly scalarPath: SafePath }
  | { readonly kind: "COUNT_EQUALS_CARDINALITY"; readonly collectionPath: SafePath; readonly countPath: SafePath }
  | { readonly kind: "SET_SUBSET"; readonly leftCollectionPath: SafePath; readonly rightCollectionPath: SafePath; readonly itemIdentityPath: SafePath }
  | { readonly kind: "MUTUALLY_EXCLUSIVE"; readonly paths: readonly SafePath[] }
  | { readonly kind: "EXACTLY_ONE_OF"; readonly paths: readonly SafePath[] }
  | { readonly kind: "MONOTONIC"; readonly beforePath: SafePath; readonly afterPath: SafePath; readonly direction: "NON_DECREASING" | "NON_INCREASING" }
  | { readonly kind: "ORDERING"; readonly collectionPath: SafePath; readonly itemValuePath: SafePath; readonly direction: "ASCENDING" | "DESCENDING" }
  | { readonly kind: "GROUP_AGGREGATE"; readonly collectionPath: SafePath; readonly groupPath: SafePath; readonly groupCountPath: SafePath }
  | { readonly kind: "PAGINATION_CONSERVATION"; readonly pageCollectionPaths: readonly SafePath[]; readonly totalPath: SafePath; readonly itemIdentityPath: SafePath }
  | { readonly kind: "NORMALIZATION_EQUIVALENCE"; readonly leftPath: SafePath; readonly rightPath: SafePath }
  | { readonly kind: "IDENTITY_PRESERVATION"; readonly leftPath: SafePath; readonly rightPath: SafePath }
  | { readonly kind: "MAPPING_CONSISTENCY"; readonly leftPath: SafePath; readonly rightPath: SafePath };

export interface RelationalContract {
  readonly schemaVersion: typeof RELATIONAL_CONTRACT_VERSION;
  readonly contractId: string;
  readonly relationId: string;
  readonly sourceProvenance: SafeSourceProvenance;
  readonly sourceCandidateId: string;
  readonly sourceCurrentness: ContractCurrentness;
  readonly kind: RelationalKind;
  readonly definition: RelationalDefinition;
  readonly proofStatus: "MECHANICALLY_PROVABLE" | "ADMITTED" | "REJECTED";
  readonly rejectionCode: "SOURCE_STALE" | "RELATION_PROOF_MISSING" | "UNSUPPORTED_RELATION_KIND" | null;
  readonly observationSurfaces: readonly string[];
  readonly evidenceDigest: string;
  readonly deterministicDigest: string;
}

export type RelationalVerdict = "PASS" | "VIOLATED" | "NOT_APPLICABLE" | "SOURCE_STALE" | "INSUFFICIENT_AUTHORITY" | "PROJECTION_INCOMPATIBLE" | "INTERNAL_ERROR";

export interface RelationalEvaluation {
  readonly schemaVersion: typeof RELATIONAL_CONTRACT_VERSION;
  readonly relationId: string;
  readonly contractId: string;
  readonly kind: RelationalKind;
  readonly verdict: RelationalVerdict;
  readonly reasonCode: string;
  readonly expectedClass: string;
  readonly observedClass: string;
  readonly projectionDigests: readonly string[];
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`RELATIONAL_CONTRACT_INVALID:${reason}`);
}

const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;

function safeId(value: string, field: string): void {
  if (!SAFE_ID_RE.test(value)) invalid(`${field}_ID`);
  if (/(?:CUSTOMER_SENTINEL|ACCOUNT_SENTINEL|EMAIL_SENTINEL|COST_SENTINEL|TOKEN_SENTINEL|Bearer\s+|eyJ[A-Za-z0-9_-]{8,}\.|AKIA[0-9A-Z]{16})/i.test(value)) invalid(`${field}_PRIVACY`);
}

function safePath(path: SafePath, field: string): void {
  if (!Array.isArray(path) || path.length === 0 || path.length > 16 || path.some((segment) => !SAFE_PATH_RE.test(segment) || FORBIDDEN_FIELD_NAMES.has(segment))) invalid(`${field}_PATH`);
}

function validateDefinition(definition: RelationalDefinition): void {
  switch (definition.kind) {
    case "FIELD_PRESENT_IF": safePath(definition.conditionPath, "CONDITION"); safePath(definition.targetPath, "TARGET"); break;
    case "TOTAL_EQUALS_SUM": safePath(definition.collectionPath, "COLLECTION"); safePath(definition.numericFieldPath, "NUMERIC_FIELD"); safePath(definition.scalarPath, "SCALAR"); break;
    case "COUNT_EQUALS_CARDINALITY": safePath(definition.collectionPath, "COLLECTION"); safePath(definition.countPath, "COUNT"); break;
    case "SET_SUBSET": safePath(definition.leftCollectionPath, "LEFT_COLLECTION"); safePath(definition.rightCollectionPath, "RIGHT_COLLECTION"); safePath(definition.itemIdentityPath, "IDENTITY"); break;
    case "MUTUALLY_EXCLUSIVE":
    case "EXACTLY_ONE_OF": if (!Array.isArray(definition.paths) || definition.paths.length < 2 || definition.paths.length > 16) invalid(`${definition.kind}_PATHS`); for (const path of definition.paths) safePath(path, definition.kind); break;
    case "MONOTONIC": safePath(definition.beforePath, "BEFORE"); safePath(definition.afterPath, "AFTER"); break;
    case "ORDERING": safePath(definition.collectionPath, "COLLECTION"); safePath(definition.itemValuePath, "ITEM_VALUE"); break;
    case "GROUP_AGGREGATE": safePath(definition.collectionPath, "COLLECTION"); safePath(definition.groupPath, "GROUP"); safePath(definition.groupCountPath, "GROUP_COUNT"); break;
    case "PAGINATION_CONSERVATION": if (!Array.isArray(definition.pageCollectionPaths) || definition.pageCollectionPaths.length < 2 || definition.pageCollectionPaths.length > 8) invalid("PAGE_PATHS"); for (const path of definition.pageCollectionPaths) safePath(path, "PAGE"); safePath(definition.totalPath, "TOTAL"); safePath(definition.itemIdentityPath, "IDENTITY"); break;
    case "NORMALIZATION_EQUIVALENCE":
    case "IDENTITY_PRESERVATION":
    case "MAPPING_CONSISTENCY": safePath(definition.leftPath, "LEFT"); safePath(definition.rightPath, "RIGHT"); break;
  }
}

function shapeSupports(kind: RelationalKind, shape: DiscoveredContractShape): boolean {
  switch (kind) {
    case "TOTAL_EQUALS_SUM":
    case "GROUP_AGGREGATE": return shape.kind === "AGGREGATION" && shape.operation === "SUM";
    case "COUNT_EQUALS_CARDINALITY": return (shape.kind === "AGGREGATION" && shape.operation === "COUNT") || shape.kind === "PAGINATION";
    case "FIELD_PRESENT_IF": return shape.kind === "PRESENCE_RELATION";
    case "ORDERING": return shape.kind === "SORT_ORDER";
    case "NORMALIZATION_EQUIVALENCE": return shape.kind === "NORMALIZATION";
    case "PAGINATION_CONSERVATION": return shape.kind === "PAGINATION";
    case "IDENTITY_PRESERVATION":
    case "MAPPING_CONSISTENCY": return shape.kind === "MAPPING" || shape.kind === "FIELD_SET";
    case "SET_SUBSET":
    case "MUTUALLY_EXCLUSIVE":
    case "EXACTLY_ONE_OF":
    case "MONOTONIC": return shape.kind === "FIELD_SET" || shape.kind === "MAPPING" || shape.kind === "RANGE" || shape.kind === "SORT_ORDER";
  }
}

/** Admit a relation only when the candidate's fixed shape proves its class. */
export function createRelationalContract(input: {
  readonly candidate: ContractCandidate;
  readonly relationId: string;
  readonly definition: RelationalDefinition;
  readonly observationSurfaces?: readonly string[];
}): RelationalContract {
  safeId(input.candidate.candidateId, "CANDIDATE");
  safeId(input.relationId, "RELATION");
  validateDefinition(input.definition);
  const kind = input.definition.kind;
  const current = input.candidate.currentness;
  const proven = input.candidate.proofStatus !== "REJECTED" && input.candidate.shape !== null && input.candidate.behaviorClass !== null && shapeSupports(kind, input.candidate.shape);
  const stale = current !== "CURRENT";
  const proofStatus: RelationalContract["proofStatus"] = stale ? "REJECTED" : proven ? "ADMITTED" : "REJECTED";
  const rejectionCode = stale ? "SOURCE_STALE" as const : proven ? null : "RELATION_PROOF_MISSING" as const;
  const surfaces = [...new Set(input.observationSurfaces ?? input.candidate.observationSurfaces)].sort();
  const evidenceDigest = sourceEvidenceDigest({ source: input.candidate.source.evidenceDigest, candidate: input.candidate.candidateId, relationId: input.relationId, kind, definition: input.definition });
  const core = {
    schemaVersion: RELATIONAL_CONTRACT_VERSION,
    contractId: safeSemanticContractId(input.candidate.candidateId, input.relationId),
    relationId: input.relationId,
    sourceProvenance: input.candidate.source,
    sourceCandidateId: input.candidate.candidateId,
    sourceCurrentness: current,
    kind,
    definition: input.definition,
    proofStatus,
    rejectionCode,
    observationSurfaces: surfaces,
    evidenceDigest,
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function safeSemanticContractId(candidateId: string, relationId: string): string {
  return safeSemanticId(`${candidateId}.${relationId}`);
}

function safeSemanticId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_.:/-]/g, "_");
  if (!SAFE_ID_RE.test(normalized)) invalid("CONTRACT_ID");
  return normalized.slice(0, 200);
}

function nodeAt(projection: SemanticProjection, path: SafePath): ProjectionNode | undefined {
  return resolvePathWithAmbiguity(projection.root, path).node;
}

function numberAt(node: ProjectionNode | undefined, ctx: ProjectionContext): number | undefined {
  return node?.type === "NUMBER" && node.numericRef !== undefined ? ctx.numericValue(node.numericRef) : undefined;
}

function identityTokens(node: ProjectionNode | undefined, path: SafePath): readonly string[] | undefined {
  if (node?.type !== "ARRAY" || node.items === undefined) return undefined;
  const tokens: string[] = [];
  for (const item of node.items) {
    const identity = resolvePath(item, path);
    if (identity?.type !== "STRING" || identity.identityToken === undefined) return undefined;
    tokens.push(identity.identityToken);
  }
  return tokens;
}

function classFor(verdict: RelationalVerdict, kind: RelationalKind): { readonly expected: string; readonly observed: string; readonly reason: string } {
  if (verdict === "PASS") return { expected: `${kind}:PASS`, observed: `${kind}:PASS`, reason: "RELATION_HOLDS" };
  if (verdict === "VIOLATED") return { expected: `${kind}:PASS`, observed: `${kind}:VIOLATED`, reason: "RELATION_VIOLATED" };
  return { expected: `${kind}:PASS`, observed: `${kind}:${verdict}`, reason: verdict };
}

function evaluation(input: { readonly contract: RelationalContract; readonly verdict: RelationalVerdict; readonly projections: readonly SemanticProjection[]; readonly reasonOverride?: string }): RelationalEvaluation {
  const classes = classFor(input.verdict, input.contract.kind);
  const core = {
    schemaVersion: RELATIONAL_CONTRACT_VERSION,
    relationId: input.contract.relationId,
    contractId: input.contract.contractId,
    kind: input.contract.kind,
    verdict: input.verdict,
    reasonCode: input.reasonOverride ?? classes.reason,
    expectedClass: classes.expected,
    observedClass: classes.observed,
    projectionDigests: input.projections.map(projectionDigest),
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}

function validateProjection(projection: SemanticProjection): void {
  try { serializeProjection(projection); } catch { invalid("PROJECTION_INCOMPATIBLE"); }
}

/** Evaluate one admitted relation over sanitized projections only. */
export function evaluateRelationalContract(input: {
  readonly contract: RelationalContract;
  readonly projections: readonly SemanticProjection[];
  readonly ctx: ProjectionContext;
}): RelationalEvaluation {
  const { contract, projections, ctx } = input;
  if (contract.schemaVersion !== RELATIONAL_CONTRACT_VERSION) return evaluation({ contract, verdict: "INTERNAL_ERROR", projections, reasonOverride: "UNKNOWN_RELATIONAL_SCHEMA" });
  if (contract.proofStatus !== "ADMITTED") return evaluation({ contract, verdict: contract.sourceCurrentness === "CURRENT" ? "INSUFFICIENT_AUTHORITY" : "SOURCE_STALE", projections, reasonOverride: contract.rejectionCode ?? "RELATION_NOT_ADMITTED" });
  if (projections.length === 0 || projections.length > 8) return evaluation({ contract, verdict: "PROJECTION_INCOMPATIBLE", projections, reasonOverride: "PROJECTION_COUNT" });
  try { for (const projection of projections) validateProjection(projection); } catch { return evaluation({ contract, verdict: "PROJECTION_INCOMPATIBLE", projections, reasonOverride: "PROJECTION_SCHEMA" }); }
  let verdict: RelationalVerdict = "NOT_APPLICABLE";
  const definition = contract.definition;
  switch (definition.kind) {
    case "FIELD_PRESENT_IF": {
      const root = projections[0];
      if (root === undefined) break;
      const condition = nodeAt(root, definition.conditionPath);
      const target = resolvePathWithAmbiguity(root.root, definition.targetPath);
      if (condition?.type !== "BOOLEAN" || target.na) break;
      const expected = definition.conditionExpected ? "TRUE" : "FALSE";
      verdict = condition.booleanClass === expected ? (target.node === undefined ? "VIOLATED" : "PASS") : (target.node === undefined ? "PASS" : "VIOLATED");
      break;
    }
    case "TOTAL_EQUALS_SUM": {
      const root = projections[0];
      if (root === undefined) break;
      const result = evaluateInvariant({ kind: "NUMERIC_SUM_RELATION", relationId: contract.relationId, collectionPath: definition.collectionPath, numericFieldPath: definition.numericFieldPath, scalarPath: definition.scalarPath }, [root], ctx);
      verdict = result.verdict === "PASS" ? "PASS" : result.verdict === "VIOLATED" ? "VIOLATED" : result.verdict === "INVALID_INPUT" ? "PROJECTION_INCOMPATIBLE" : "NOT_APPLICABLE";
      break;
    }
    case "COUNT_EQUALS_CARDINALITY": {
      const root = projections[0];
      if (root === undefined) break;
      const result = evaluateInvariant({ kind: "COUNT_RELATION", relationId: contract.relationId, operation: "COUNT_EQUALS", collectionPath: definition.collectionPath, scalarPath: definition.countPath }, [root], ctx);
      verdict = result.verdict === "PASS" ? "PASS" : result.verdict === "VIOLATED" ? "VIOLATED" : result.verdict === "INVALID_INPUT" ? "PROJECTION_INCOMPATIBLE" : "NOT_APPLICABLE";
      break;
    }
    case "SET_SUBSET": {
      const root = projections[0];
      if (root === undefined) break;
      const left = identityTokens(nodeAt(root, definition.leftCollectionPath), definition.itemIdentityPath);
      const right = new Set(identityTokens(nodeAt(root, definition.rightCollectionPath), definition.itemIdentityPath) ?? []);
      if (left === undefined || right.size === 0) break;
      verdict = left.every((token) => right.has(token)) ? "PASS" : "VIOLATED";
      break;
    }
    case "MUTUALLY_EXCLUSIVE": {
      const root = projections[0];
      if (root === undefined) break;
      const presentCount = definition.paths.filter((path) => resolvePathWithAmbiguity(root.root, path).node !== undefined).length;
      verdict = presentCount <= 1 ? "PASS" : "VIOLATED";
      break;
    }
    case "EXACTLY_ONE_OF": {
      const root = projections[0];
      if (root === undefined) break;
      const presentCount = definition.paths.filter((path) => resolvePathWithAmbiguity(root.root, path).node !== undefined).length;
      verdict = presentCount === 1 ? "PASS" : "VIOLATED";
      break;
    }
    case "MONOTONIC": {
      const before = projections[0];
      const after = projections[1];
      if (before === undefined || after === undefined) break;
      const left = numberAt(nodeAt(before, definition.beforePath), ctx);
      const right = numberAt(nodeAt(after, definition.afterPath), ctx);
      if (left === undefined || right === undefined) break;
      verdict = definition.direction === "NON_DECREASING" ? (right >= left ? "PASS" : "VIOLATED") : (right <= left ? "PASS" : "VIOLATED");
      break;
    }
    case "ORDERING": {
      const root = projections[0];
      if (root === undefined) break;
      const collection = nodeAt(root, definition.collectionPath);
      if (collection?.type !== "ARRAY" || collection.items === undefined || collection.items.length === 0 || collection.arrayTruncated === true) break;
      const values: number[] = [];
      for (const item of collection.items) {
        const value = numberAt(resolvePath(item, definition.itemValuePath), ctx);
        if (value === undefined) { values.length = 0; break; }
        values.push(value);
      }
      if (values.length === 0) break;
      const ordered = values.every((value, index) => index === 0 || (definition.direction === "ASCENDING" ? values[index - 1]! <= value : values[index - 1]! >= value));
      verdict = ordered ? "PASS" : "VIOLATED";
      break;
    }
    case "GROUP_AGGREGATE": {
      const root = projections[0];
      if (root === undefined) break;
      const collection = nodeAt(root, definition.collectionPath);
      const groups = nodeAt(root, definition.groupPath);
      if (collection?.type !== "ARRAY" || groups?.type !== "ARRAY" || groups.items === undefined || collection.itemCount === undefined) break;
      let total = 0;
      for (const group of groups.items) {
        const count = numberAt(resolvePath(group, definition.groupCountPath), ctx);
        if (count === undefined) { total = -1; break; }
        total += count;
      }
      if (total < 0 || groups.arrayTruncated === true || collection.arrayTruncated === true) break;
      verdict = total === collection.itemCount ? "PASS" : "VIOLATED";
      break;
    }
    case "PAGINATION_CONSERVATION": {
      const root = projections[0];
      if (root === undefined) break;
      const all = new Set<string>();
      let count = 0;
      let valid = true;
      let duplicate = false;
      for (const path of definition.pageCollectionPaths) {
        const page = nodeAt(root, path);
        const tokens = identityTokens(page, definition.itemIdentityPath);
        if (tokens === undefined || page?.type !== "ARRAY" || page.arrayTruncated === true) { valid = false; break; }
        for (const token of tokens) { if (all.has(token)) duplicate = true; all.add(token); count += 1; }
      }
      const expected = numberAt(nodeAt(root, definition.totalPath), ctx);
      if (duplicate) verdict = "VIOLATED";
      else if (!valid || expected === undefined) break;
      else verdict = count === expected ? "PASS" : "VIOLATED";
      break;
    }
    case "NORMALIZATION_EQUIVALENCE":
    case "IDENTITY_PRESERVATION":
    case "MAPPING_CONSISTENCY": {
      const leftProjection = projections[0];
      const rightProjection = projections[1] ?? projections[0];
      if (leftProjection === undefined || rightProjection === undefined) break;
      const left = nodeAt(leftProjection, definition.leftPath);
      const right = nodeAt(rightProjection, definition.rightPath);
      if (left === undefined || right === undefined) break;
      verdict = semanticStateEquals(left, right) ? "PASS" : "VIOLATED";
      break;
    }
  }
  return evaluation({ contract, verdict, projections });
}

export function relationalContractFromSyntheticProof(input: {
  readonly candidate: ContractCandidate;
  readonly relationId: string;
  readonly definition: RelationalDefinition;
}): RelationalContract {
  return createRelationalContract(input);
}

export function relationalKindsWithProjectionSupport(): readonly RelationalKind[] {
  return [...RELATIONAL_KINDS];
}

export type { JsonTypeCategory };
