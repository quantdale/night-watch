// ---------------------------------------------------------------------------
// Nightwatch C-15b - deterministic layered layout and layout identity.
//
// The layout is a pure function of the projection, computed server-side, so
// two operators looking at the same snapshot see the same picture and a
// screenshot can be tied back to an exact graph.
//
// The identity binds the graph digest, the engine identity and version, the
// options and the projection version. Changing any one changes the digest;
// timing never enters it. That is what makes the layout content-addressed
// rather than merely reproducible-in-practice.
//
// No layout library. A layered assignment over a directed projection is a
// modest amount of code, and the repository's policy is to prefer the tooling
// already present over a dependency that would also have to be pinned,
// audited and version-bound into this very digest.
//
// Data-only. No filesystem, process, or network authority.
// ---------------------------------------------------------------------------

import { prefixedDigest24 } from '../identity/canonicalDigest';
import { graphDigest, type SystemMapEdge, type SystemMapNode } from './model';

export const LAYOUT_ENGINE_ID = 'nightwatch.layered-layout' as const;
/** Bumping this changes every layout identity, which is the point: a different
 * engine must never produce a colliding identity. */
export const LAYOUT_ENGINE_VERSION = '1.0.0' as const;
export const LAYOUT_SCHEMA_VERSION = 'nightwatch.system-map-layout.v1' as const;

export const MAX_LAYOUT_NODES = 1000;
export const MAX_LAYOUT_LAYERS = 64;

export interface LayoutOptions {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly layerGap: number;
  readonly siblingGap: number;
  readonly direction: 'LEFT_TO_RIGHT' | 'TOP_TO_BOTTOM';
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = Object.freeze({
  nodeWidth: 168,
  nodeHeight: 44,
  layerGap: 96,
  siblingGap: 20,
  direction: 'LEFT_TO_RIGHT',
});

export interface LaidOutNode {
  readonly nodeId: string;
  readonly layer: number;
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SystemMapLayout {
  readonly schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  readonly engineId: typeof LAYOUT_ENGINE_ID;
  readonly engineVersion: typeof LAYOUT_ENGINE_VERSION;
  readonly projectionVersion: string;
  readonly options: LayoutOptions;
  readonly nodes: readonly LaidOutNode[];
  readonly width: number;
  readonly height: number;
  readonly layerCount: number;
  /** Binds graph + engine + version + options + projection version. */
  readonly layoutDigest: string;
  readonly graphDigest: string;
}

/**
 * Assign each node to a layer by longest-path depth from a root.
 *
 * Cycles cannot extend a layer: a node already being visited contributes
 * nothing, so a cyclic projection lays out rather than hanging. The traversal
 * is iterative and bounded by MAX_LAYOUT_LAYERS.
 */
function assignLayers(nodes: readonly SystemMapNode[], edges: readonly SystemMapEdge[]): Map<string, number> {
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const node of nodes) indegree.set(node.nodeId, 0);
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) continue;
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  for (const node of nodes) layer.set(node.nodeId, 0);

  // Deterministic Kahn ordering: ties broken by nodeId so the result never
  // depends on insertion order.
  const ready = [...nodes].filter((node) => (indegree.get(node.nodeId) ?? 0) === 0).map((node) => node.nodeId).sort();
  const remaining = new Map(indegree);
  let processed = 0;
  while (ready.length > 0 && processed <= nodes.length) {
    ready.sort();
    const current = ready.shift() as string;
    processed += 1;
    const currentLayer = layer.get(current) ?? 0;
    for (const target of [...(outgoing.get(current) ?? [])].sort()) {
      const candidate = Math.min(currentLayer + 1, MAX_LAYOUT_LAYERS - 1);
      if (candidate > (layer.get(target) ?? 0)) layer.set(target, candidate);
      const left = (remaining.get(target) ?? 0) - 1;
      remaining.set(target, left);
      if (left === 0) ready.push(target);
    }
  }
  return layer;
}

/**
 * Lay out a projection.
 *
 * Deterministic in both axes: layer from longest-path depth, order within a
 * layer from the nodeId. Nothing consults wall-clock time, iteration order of
 * a hash map, or a random seed.
 */
export function layoutSystemMap(input: {
  readonly nodes: readonly SystemMapNode[];
  readonly edges: readonly SystemMapEdge[];
  readonly projectionVersion: string;
  readonly options?: LayoutOptions;
}): SystemMapLayout {
  const options = input.options ?? DEFAULT_LAYOUT_OPTIONS;
  const nodes = [...input.nodes].slice(0, MAX_LAYOUT_NODES).sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const layers = assignLayers(nodes, input.edges);

  const byLayer = new Map<number, string[]>();
  for (const node of nodes) {
    const index = layers.get(node.nodeId) ?? 0;
    byLayer.set(index, [...(byLayer.get(index) ?? []), node.nodeId]);
  }

  const placed: LaidOutNode[] = [];
  let maxAcross = 0;
  for (const [layerIndex, members] of [...byLayer.entries()].sort((left, right) => left[0] - right[0])) {
    // `members` is already in nodeId order: `nodes` is sorted on entry, which
    // is what makes BOTH the truncation choice and the within-layer order
    // deterministic. A second sort here looked like defence in depth and was
    // in fact dead code — a negative probe removed it and nothing failed, so
    // it is gone rather than left standing as a guarantee nothing tests.
    members.forEach((nodeId, order) => {
      const along = layerIndex * (options.layerGap + (options.direction === 'LEFT_TO_RIGHT' ? options.nodeWidth : options.nodeHeight));
      const across = order * ((options.direction === 'LEFT_TO_RIGHT' ? options.nodeHeight : options.nodeWidth) + options.siblingGap);
      placed.push({
        nodeId,
        layer: layerIndex,
        order,
        x: options.direction === 'LEFT_TO_RIGHT' ? along : across,
        y: options.direction === 'LEFT_TO_RIGHT' ? across : along,
        width: options.nodeWidth,
        height: options.nodeHeight,
      });
      maxAcross = Math.max(maxAcross, across);
    });
  }
  placed.sort((left, right) => left.nodeId.localeCompare(right.nodeId));

  const layerCount = byLayer.size;
  const alongExtent = Math.max(0, layerCount - 1) * (options.layerGap + (options.direction === 'LEFT_TO_RIGHT' ? options.nodeWidth : options.nodeHeight));
  const digestOfGraph = graphDigest(nodes, input.edges);

  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    engineId: LAYOUT_ENGINE_ID,
    engineVersion: LAYOUT_ENGINE_VERSION,
    projectionVersion: input.projectionVersion,
    options,
    nodes: placed,
    width: options.direction === 'LEFT_TO_RIGHT' ? alongExtent + options.nodeWidth : maxAcross + options.nodeWidth,
    height: options.direction === 'LEFT_TO_RIGHT' ? maxAcross + options.nodeHeight : alongExtent + options.nodeHeight,
    layerCount,
    // Every load-bearing input is in the digest. Timing is not.
    layoutDigest: prefixedDigest24('systemmaplayout', {
      graphDigest: digestOfGraph,
      engineId: LAYOUT_ENGINE_ID,
      engineVersion: LAYOUT_ENGINE_VERSION,
      projectionVersion: input.projectionVersion,
      options,
      placement: placed.map((node) => [node.nodeId, node.layer, node.order, node.x, node.y]),
    }),
    graphDigest: digestOfGraph,
  };
}
