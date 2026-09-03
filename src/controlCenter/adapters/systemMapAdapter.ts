// C-15c — the System Map V2 adapter.
//
// Joins C-15b's bounded projections to its deterministic server-side layout and
// maps both onto the wire contract. The layout is computed HERE, on the server,
// and transported: the UI must stop reconstructing an independent semantic
// layout, because two layout implementations drift and the one the operator
// sees would stop being the one whose identity was digested.
//
// Nothing in this file can execute anything. It reads a projection and returns
// a DTO, and the DTO restates `executionAuthority: NONE` on the wire so a
// client cannot mistake a map for a control panel.

import {
  layoutSystemMap,
  type SystemMapLayout,
} from '../../core/systemMap/layout';
import type { ProjectionBound, SystemMapEdge, SystemMapNode } from '../../core/systemMap/model';
import {
  projectCompany,
  projectOperation,
  projectProduct,
  projectService,
  queryCoverageGaps,
  queryFindingsAttachedToTopology,
  queryMutationCapableRoutes,
  queryObservedProductionPaths,
  querySurfacesTouchingService,
  queryUiControlToHandler,
  queryUntestedReadOnlyRoutes,
  queryWhyUnproven,
  type DisclosureLevel,
  type OperatorQuery,
  type SystemMapInput,
  type SystemMapProjection,
} from '../../core/systemMap/projections';
import {
  CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION,
  type ControlCenterProjectionBoundDto,
  type ControlCenterSystemMapDto,
  type ControlCenterSystemMapEdgeDto,
  type ControlCenterSystemMapNodeDto,
  type ControlCenterSystemMapQueryDto,
} from '../contracts/systemMap';

/**
 * Per-level bounds. Each level is bounded INDEPENDENTLY so the browser asks
 * for the level it is showing and nothing more — a whole-company payload
 * hidden client-side would defeat the point of progressive disclosure.
 */
export const SYSTEM_MAP_LEVEL_LIMITS: Readonly<Record<DisclosureLevel, { readonly nodeLimit: number; readonly edgeLimit: number }>> = Object.freeze({
  L1_COMPANY: { nodeLimit: 64, edgeLimit: 128 },
  L2_PRODUCT: { nodeLimit: 128, edgeLimit: 256 },
  L3_SERVICE: { nodeLimit: 256, edgeLimit: 512 },
  L4_OPERATION: { nodeLimit: 256, edgeLimit: 512 },
});

/** Query bounds. The contract ceiling stays 1,000 / 2,000. */
export const SYSTEM_MAP_QUERY_LIMITS = Object.freeze({ nodeLimit: 1000, edgeLimit: 2000 });

function boundDto(bound: ProjectionBound): ControlCenterProjectionBoundDto {
  return Object.freeze({
    limit: bound.limit,
    total: bound.total,
    projected: bound.projected,
    dropped: bound.dropped,
    truncated: bound.truncated,
    remainingUnknown: bound.remainingUnknown,
  });
}

function nodeDto(node: SystemMapNode, layout: SystemMapLayout): ControlCenterSystemMapNodeDto {
  const placed = layout.nodes.find((candidate) => candidate.nodeId === node.nodeId);
  return Object.freeze({
    nodeId: node.nodeId,
    kind: node.kind,
    label: node.label,
    factCategory: node.factCategory,
    evidenceStatus: node.evidenceStatus,
    coverageState: node.coverageState,
    // A node the layout did not place still crosses the wire, at the origin,
    // rather than being dropped: silently losing a node would make the
    // transported node count disagree with the projection's own bound.
    x: placed?.x ?? 0,
    y: placed?.y ?? 0,
    layer: placed?.layer ?? 0,
  });
}

function edgeDto(edge: SystemMapEdge): ControlCenterSystemMapEdgeDto {
  return Object.freeze({
    edgeId: edge.edgeId,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    kind: edge.kind,
    factCategory: edge.factCategory,
    evidenceStatus: edge.evidenceStatus,
  });
}

function toDto(projection: SystemMapProjection, level: DisclosureLevel): ControlCenterSystemMapDto {
  const layout = layoutSystemMap({
    nodes: projection.nodes,
    edges: projection.edges,
    projectionVersion: projection.projectionVersion,
  });
  return Object.freeze({
    schemaVersion: CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION,
    level,
    focusId: projection.focusId,
    nodes: Object.freeze(projection.nodes.map((node) => nodeDto(node, layout))),
    edges: Object.freeze(projection.edges.map(edgeDto)),
    nodeBound: boundDto(projection.nodeBound),
    edgeBound: boundDto(projection.edgeBound),
    layout: Object.freeze({
      engineId: layout.engineId,
      engineVersion: layout.engineVersion,
      graphDigest: layout.graphDigest,
      layoutDigest: layout.layoutDigest,
      projectionVersion: layout.projectionVersion,
    }),
    executionAuthority: 'NONE' as const,
    mutationAuthority: 'NONE' as const,
  });
}

/**
 * Project one disclosure level. `focusId` is required for L2-L4 and refused at
 * L1, which has no parent — a focus at L1 would silently be ignored, and a
 * silently ignored parameter is how a client comes to believe it asked for
 * something narrower than it received.
 */
export function systemMapLevel(input: SystemMapInput, level: DisclosureLevel, focusId: string | null): ControlCenterSystemMapDto | null {
  const limits = SYSTEM_MAP_LEVEL_LIMITS[level];
  if (level === 'L1_COMPANY') {
    if (focusId !== null) return null;
    return toDto(projectCompany(input, limits), level);
  }
  if (focusId === null) return null;
  if (level === 'L2_PRODUCT') return toDto(projectProduct(input, focusId, limits), level);
  if (level === 'L3_SERVICE') return toDto(projectService(input, focusId, limits), level);
  return toDto(projectOperation(input, focusId, limits), level);
}

/**
 * Run one operator query. An unknown query name is refused by the caller
 * before reaching here; this function's own default is unreachable and returns
 * null rather than falling through to a plausible-looking empty map.
 */
export function systemMapQuery(input: SystemMapInput, query: OperatorQuery, focusId: string | null): ControlCenterSystemMapQueryDto | null {
  const limits = SYSTEM_MAP_QUERY_LIMITS;
  let projection: SystemMapProjection | null = null;
  let blockingChain: readonly { readonly stage: string; readonly reason: string | null }[] | undefined;

  switch (query) {
    case 'WHY_UNPROVEN': {
      if (focusId === null) return null;
      const result = queryWhyUnproven(input, focusId, limits);
      projection = result;
      blockingChain = result.blockingChain;
      break;
    }
    case 'UI_CONTROL_TO_HANDLER':
      if (focusId === null) return null;
      projection = queryUiControlToHandler(input, focusId, limits);
      break;
    case 'SURFACES_TOUCHING_SERVICE':
      if (focusId === null) return null;
      projection = querySurfacesTouchingService(input, focusId, limits);
      break;
    case 'OBSERVED_PRODUCTION_PATHS':
      // Permanently empty and UNMEASURED until C-12 runs. The measurement
      // state is what stops that emptiness reading as a clean bill of health.
      projection = queryObservedProductionPaths(input, limits);
      break;
    case 'MUTATION_CAPABLE_ROUTES':
      projection = queryMutationCapableRoutes(input, limits);
      break;
    case 'UNTESTED_READ_ONLY_ROUTES':
      projection = queryUntestedReadOnlyRoutes(input, limits);
      break;
    case 'COVERAGE_GAPS':
      projection = queryCoverageGaps(input, limits);
      break;
    case 'FINDINGS_ATTACHED_TO_TOPOLOGY':
      projection = queryFindingsAttachedToTopology(input, limits);
      break;
    default:
      return null;
  }
  if (projection === null) return null;
  const base = toDto(projection, projection.level ?? 'L1_COMPANY');
  return Object.freeze({
    ...base,
    query,
    measurement: projection.measurement,
    ...(blockingChain === undefined ? {} : { blockingChain }),
  });
}

/**
 * Build a `SystemMapInput` from the source authority's discovery.
 *
 * `operationPopulationTotal` is the one field that must not be guessed: it is
 * null whenever the upstream enumeration is truncated, because a derived total
 * over an unknown population is unknowable rather than merely large. The
 * ouchan enumeration IS truncated today, so this is null in practice — and
 * every bound downstream correctly reports `remainingUnknown`.
 */
export function systemMapInputFromDiscovery(discovery: {
  readonly operations?: readonly Record<string, unknown>[];
  readonly operationCompleteness?: { readonly totalOperations?: number | null };
} | null | undefined): SystemMapInput {
  const operations = discovery?.operations ?? [];
  const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
  const asNullableString = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);
  return Object.freeze({
    operations: Object.freeze(operations.map((operation) => Object.freeze({
      operationId: asString(operation.operationId),
      repoId: asString(operation.repository),
      sourceSha: asString(operation.sourceSha),
      method: asString(operation.method),
      routeTemplate: asString(operation.routeTemplate),
      // Every operation is source-derived; nothing here is a deployment or
      // runtime fact, and labelling one as such would strengthen a join.
      factCategory: 'SOURCE_FACT' as const,
      readOnlyClassification: asString(operation.readOnlyClassification, 'UNSUPPORTED'),
      routeProof: asString(operation.routeProof, 'UNSUPPORTED'),
      protoServiceIdentity: asNullableString(operation.protoServiceIdentity),
      blockingStage: asNullableString(operation.blockingStage),
      blockingReason: asNullableString(operation.blockingReason),
    }))),
    // C-03 topology and C-04 consumer edges are supplied by their own
    // authorities; absent here they are empty rather than invented.
    serviceBindings: Object.freeze([]),
    consumerEdges: Object.freeze([]),
    findings: Object.freeze([]),
    operationPopulationTotal: discovery?.operationCompleteness?.totalOperations ?? null,
    productOfRepository: Object.freeze({}),
  });
}

/** URL segment → disclosure level. The segment set is closed. */
export const LEVEL_FOR_SEGMENT: Readonly<Record<string, DisclosureLevel>> = Object.freeze({
  l1: 'L1_COMPANY', l2: 'L2_PRODUCT', l3: 'L3_SERVICE', l4: 'L4_OPERATION',
});

/** URL segment → operator query. The segment set is closed. */
export const QUERY_FOR_SEGMENT: Readonly<Record<string, OperatorQuery>> = Object.freeze({
  'why-unproven': 'WHY_UNPROVEN',
  'ui-control-to-handler': 'UI_CONTROL_TO_HANDLER',
  'surfaces-touching-service': 'SURFACES_TOUCHING_SERVICE',
  'observed-production-paths': 'OBSERVED_PRODUCTION_PATHS',
  'mutation-capable-routes': 'MUTATION_CAPABLE_ROUTES',
  'untested-read-only-routes': 'UNTESTED_READ_ONLY_ROUTES',
  'coverage-gaps': 'COVERAGE_GAPS',
  'findings-attached-to-topology': 'FINDINGS_ATTACHED_TO_TOPOLOGY',
});
