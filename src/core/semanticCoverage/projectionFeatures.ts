// Phase 20 — additional privacy-safe observation features.
//
// Features are derived from an already validated Phase 9 projection. They
// contain only bounded categories, counts, and opaque digests; raw strings,
// numeric values, and identity tokens never leave the in-memory projection
// context.

import { projectionDigest, serializeProjection } from "../../oracles/projections/serializer";
import type { ProjectionContext } from "../../oracles/projections/identity";
import type { ProjectionNode, SemanticProjection } from "../../oracles/projections/types";
import { FORBIDDEN_FIELD_NAMES } from "../../oracles/projections/types";
import { resolvePathWithAmbiguity } from "../../oracles/invariants/paths";
import { sourceEvidenceDigest } from "./types";

export const PROJECTION_FEATURES_VERSION = "nightwatch.semantic-observation-features.v1" as const;

export type CardinalityClass = "NOT_APPLICABLE" | "MISSING" | "EMPTY" | "SINGLE" | "SMALL" | "LARGE" | "TRUNCATED";
export type OrderingClass = "NOT_APPLICABLE" | "ASCENDING" | "DESCENDING" | "STABLE" | "MIXED";

export interface ProjectionFeatureProbe {
  readonly path: readonly string[];
  readonly label: string;
}

export interface ProjectionFeatureRow {
  readonly label: string;
  readonly typeClass: ProjectionNode["type"] | "MISSING";
  readonly presenceClass: "PRESENT" | "ABSENT" | "AMBIGUOUS";
  readonly cardinalityClass: CardinalityClass;
  readonly orderingClass: OrderingClass;
  readonly setCardinalityClass: CardinalityClass;
  readonly relationTruthClass: "NOT_EVALUATED" | "TRUE" | "FALSE";
}

export interface SemanticObservationFeatures {
  readonly schemaVersion: typeof PROJECTION_FEATURES_VERSION;
  readonly projectionDigest: string;
  readonly rows: readonly ProjectionFeatureRow[];
  readonly fieldPresenceDigest: string;
  readonly typeCategoryDigest: string;
  readonly orderingDigest: string;
  readonly relationshipDigest: string;
  readonly deterministicDigest: string;
}

function invalid(reason: string): never {
  throw new Error(`SEMANTIC_PROJECTION_FEATURES_INVALID:${reason}`);
}

const SAFE_LABEL_RE = /^[A-Za-z][A-Za-z0-9_.:/-]{0,120}$/;
const SAFE_PATH_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,96}$/;

function safeProbe(probe: ProjectionFeatureProbe): void {
  if (!SAFE_LABEL_RE.test(probe.label)) invalid("LABEL");
  if (!Array.isArray(probe.path) || probe.path.length === 0 || probe.path.length > 16 || probe.path.some((part) => !SAFE_PATH_RE.test(part) || FORBIDDEN_FIELD_NAMES.has(part))) invalid("PATH");
}

function cardinality(node: ProjectionNode | undefined): CardinalityClass {
  if (node === undefined) return "MISSING";
  if (node.type !== "ARRAY") return "NOT_APPLICABLE";
  if (node.arrayTruncated === true) return "TRUNCATED";
  const count = node.itemCount ?? 0;
  if (count === 0) return "EMPTY";
  if (count === 1) return "SINGLE";
  return count <= 8 ? "SMALL" : "LARGE";
}

function ordering(node: ProjectionNode | undefined, ctx: ProjectionContext): OrderingClass {
  if (node?.type !== "ARRAY" || node.items === undefined || node.items.length < 2 || node.arrayTruncated === true) return "NOT_APPLICABLE";
  const values: number[] = [];
  for (const item of node.items) {
    if (item.type !== "NUMBER" || item.numericRef === undefined) return "NOT_APPLICABLE";
    const value = ctx.numericValue(item.numericRef);
    if (value === undefined) return "NOT_APPLICABLE";
    values.push(value);
  }
  const ascending = values.every((value, index) => index === 0 || values[index - 1]! <= value);
  const descending = values.every((value, index) => index === 0 || values[index - 1]! >= value);
  if (ascending && descending) return "STABLE";
  if (ascending) return "ASCENDING";
  if (descending) return "DESCENDING";
  return "MIXED";
}

function setCardinality(node: ProjectionNode | undefined): CardinalityClass {
  if (node?.type !== "ARRAY" || node.items === undefined) return node === undefined ? "MISSING" : "NOT_APPLICABLE";
  const identities = node.items.flatMap((item) => item.type === "STRING" && item.identityToken !== undefined ? [item.identityToken] : []);
  if (identities.length !== node.items.length) return "NOT_APPLICABLE";
  const size = new Set(identities).size;
  if (size === 0) return "EMPTY";
  if (size === 1) return "SINGLE";
  return size <= 8 ? "SMALL" : "LARGE";
}

/** Derive safe categories for explicitly selected paths. */
export function deriveProjectionFeatures(input: {
  readonly projection: SemanticProjection;
  readonly ctx: ProjectionContext;
  readonly probes: readonly ProjectionFeatureProbe[];
  readonly relationTruth?: Readonly<Record<string, boolean>>;
}): SemanticObservationFeatures {
  if (input.probes.length > 64) invalid("PROBE_COUNT");
  try { serializeProjection(input.projection); } catch { invalid("PROJECTION_SCHEMA"); }
  const seenLabels = new Set<string>();
  const rows: ProjectionFeatureRow[] = [];
  for (const probe of input.probes) {
    safeProbe(probe);
    if (seenLabels.has(probe.label)) invalid("DUPLICATE_LABEL");
    seenLabels.add(probe.label);
    const resolved = resolvePathWithAmbiguity(input.projection.root, probe.path);
    const node = resolved.na ? undefined : resolved.node;
    const truth = input.relationTruth?.[probe.label];
    rows.push({
      label: probe.label,
      typeClass: resolved.na ? "MISSING" : node?.type ?? "MISSING",
      presenceClass: resolved.na ? "AMBIGUOUS" : node === undefined ? "ABSENT" : "PRESENT",
      cardinalityClass: cardinality(node),
      orderingClass: ordering(node, input.ctx),
      setCardinalityClass: setCardinality(node),
      relationTruthClass: truth === undefined ? "NOT_EVALUATED" : truth ? "TRUE" : "FALSE",
    });
  }
  const ordered = rows.sort((left, right) => left.label.localeCompare(right.label));
  const core = {
    schemaVersion: PROJECTION_FEATURES_VERSION,
    projectionDigest: projectionDigest(input.projection),
    rows: ordered,
    fieldPresenceDigest: sourceEvidenceDigest(ordered.map((row) => [row.label, row.presenceClass])),
    typeCategoryDigest: sourceEvidenceDigest(ordered.map((row) => [row.label, row.typeClass])),
    orderingDigest: sourceEvidenceDigest(ordered.map((row) => [row.label, row.orderingClass])),
    relationshipDigest: sourceEvidenceDigest(ordered.map((row) => [row.label, row.relationTruthClass])),
  };
  return { ...core, deterministicDigest: sourceEvidenceDigest(core) };
}
