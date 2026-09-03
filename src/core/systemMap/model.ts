// ---------------------------------------------------------------------------
// Nightwatch C-15b - system map model.
//
// One fact category per node and per edge, and a projection bound that reports
// exactly what it dropped.
//
// Both exist because of a specific defect. The v1 graph carried
// `truncated: boolean` and no counts, which cannot tell an operator whether
// two nodes are missing or two thousand - the floor-presented-as-a-total
// failure C-01 closed for operations and the graph never received. And v1
// nodes carried proof, currentness, lifecycle and capability but no fact
// category, so C-03's SOURCE_FACT bindings and C-04's INFERENCE edges became
// indistinguishable the moment they were drawn.
//
// Data-only. No filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';

export const SYSTEM_MAP_MODEL_VERSION = 'nightwatch.system-map-model.v2' as const;

/** Exactly one of these per node and per edge. Ordered weakest-last so a join
 * can take the weaker of two without a lookup table. */
export const FACT_CATEGORIES = ['SOURCE_FACT', 'DEPLOYMENT_FACT', 'RUNTIME_FACT', 'OBSERVATION', 'INFERENCE'] as const;
export type FactCategory = (typeof FACT_CATEGORIES)[number];

/** How strong the evidence behind an element is, as the operator sees it.
 * `RUNTIME_OBSERVED`, `PRODUCTION_OBSERVED` and `REPLAY_PROVEN` are declared
 * and deliberately unused: nothing in the approved universe can produce them
 * until C-12 and beyond, and inventing a producer would be the fabrication the
 * operating principles forbid. */
export const EVIDENCE_STATUSES = [
  'MECHANICALLY_PROVEN',
  'RUNTIME_OBSERVED',
  'PRODUCTION_OBSERVED',
  'SOURCE_ONLY',
  'PARTIAL',
  'INFERRED',
  'STALE',
  'UNAVAILABLE',
  'MUTATION_CAPABLE',
  'READ_ONLY_PROVEN',
  'REPLAY_PROVEN',
  'FINDING_PRESENT',
  'TRUNCATED',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** C-15a's seven-state coverage vocabulary, preserved verbatim. */
export const COVERAGE_STATES = ['PROVEN', 'UNPROVEN', 'UNSUPPORTED', 'TRUNCATED', 'STALE', 'UNKNOWN', 'UNMEASURED'] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

export const SYSTEM_MAP_NODE_KINDS = [
  'COMPANY', 'PRODUCT', 'REPOSITORY', 'SERVICE', 'PROTO_SERVICE', 'RPC',
  'HTTP_OPERATION', 'FRONTEND_CONSUMER', 'HANDLER', 'FINDING',
] as const;
export type SystemMapNodeKind = (typeof SYSTEM_MAP_NODE_KINDS)[number];

export const SYSTEM_MAP_EDGE_KINDS = [
  'CONTAINS', 'DECLARES', 'REGISTERS', 'IMPLEMENTS', 'EXPOSES',
  'CONSUMES_ROUTE', 'BELONGS_TO_SERVICE', 'ATTACHES_FINDING',
] as const;
export type SystemMapEdgeKind = (typeof SYSTEM_MAP_EDGE_KINDS)[number];

export interface SystemMapNode {
  readonly nodeId: string;
  readonly kind: SystemMapNodeKind;
  readonly label: string;
  readonly factCategory: FactCategory;
  readonly evidenceStatus: EvidenceStatus;
  readonly coverageState: CoverageState;
  /** Repository and SHA when the element came from source; null for the
   * synthetic COMPANY and PRODUCT grouping nodes, which are structure rather
   * than evidence. */
  readonly repoId: string | null;
  readonly sourceSha: string | null;
}

export interface SystemMapEdge {
  readonly edgeId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly kind: SystemMapEdgeKind;
  readonly factCategory: FactCategory;
  readonly evidenceStatus: EvidenceStatus;
}

/**
 * What a bounded projection dropped.
 *
 * `total` and `dropped` are null ONLY when genuinely unknowable, and
 * `remainingUnknown` says which case it is. `truncated: true` with
 * `dropped: null` is a materially different statement from `dropped: 412`,
 * and an operator needs to be able to tell them apart.
 */
export interface ProjectionBound {
  readonly limit: number;
  readonly total: number | null;
  readonly projected: number;
  readonly dropped: number | null;
  readonly truncated: boolean;
  readonly remainingUnknown: boolean;
}

export function projectionBound(input: {
  readonly limit: number;
  readonly total: number | null;
  readonly projected: number;
}): ProjectionBound {
  if (input.total === null) {
    return { limit: input.limit, total: null, projected: input.projected, dropped: null, truncated: true, remainingUnknown: true };
  }
  const dropped = Math.max(0, input.total - input.projected);
  return {
    limit: input.limit,
    total: input.total,
    projected: input.projected,
    dropped,
    truncated: dropped > 0,
    remainingUnknown: false,
  };
}

const CATEGORY_RANK: Readonly<Record<FactCategory, number>> = {
  SOURCE_FACT: 5, DEPLOYMENT_FACT: 4, RUNTIME_FACT: 3, OBSERVATION: 2, INFERENCE: 1,
};

/**
 * The weaker of two fact categories.
 *
 * There is no counterpart that returns the stronger, deliberately: a join must
 * never be able to strengthen its inputs, and the absence of the function is
 * the cheapest way to guarantee it.
 */
export function weakerFactCategory(left: FactCategory, right: FactCategory): FactCategory {
  return CATEGORY_RANK[left] <= CATEGORY_RANK[right] ? left : right;
}

/** Canonical serialization of a projection: sorted, structural, and free of
 * anything that varies between runs. This is what the layout identity and the
 * graph digest are taken over. */
export function canonicalGraphBytes(nodes: readonly SystemMapNode[], edges: readonly SystemMapEdge[]): string {
  const sortedNodes = [...nodes].sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const sortedEdges = [...edges].sort((left, right) => left.edgeId.localeCompare(right.edgeId));
  return JSON.stringify({
    nodes: sortedNodes.map((node) => [node.nodeId, node.kind, node.label, node.factCategory, node.evidenceStatus, node.coverageState]),
    edges: sortedEdges.map((edge) => [edge.edgeId, edge.fromNodeId, edge.toNodeId, edge.kind, edge.factCategory, edge.evidenceStatus]),
  });
}

export function graphDigest(nodes: readonly SystemMapNode[], edges: readonly SystemMapEdge[]): string {
  return prefixedDigest24('systemmapgraph', canonicalGraphBytes(nodes, edges));
}

/** A label is presentation data, never markup authority. Anything outside this
 * set is replaced rather than escaped, so no rendering path can be asked to
 * decide whether a label is safe. */
const SAFE_LABEL_RE = /^[A-Za-z0-9 ._:\-/{}]{1,160}$/;

export function safeLabel(value: string): string {
  const trimmed = value.slice(0, 160);
  return SAFE_LABEL_RE.test(trimmed) ? trimmed : trimmed.replace(/[^A-Za-z0-9 ._:\-/{}]/g, '?');
}
