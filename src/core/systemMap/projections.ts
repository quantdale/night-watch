// ---------------------------------------------------------------------------
// Nightwatch C-15b - progressive disclosure and the eight operator queries.
//
// Every projection here is bounded and reports exactly what it dropped. The
// browser asks for a LEVEL and receives that level; it never receives the whole
// company graph to hide client-side, which is what "progressive" means here.
//
// The eight operator queries are eight named functions with eight bounds, not
// filters over one generic result. A counter that says "8 queries" proves
// nothing; a function per question, each with its own test, is the claim.
//
// Data-only over already-derived facts. No filesystem, process, or network
// authority.
// ---------------------------------------------------------------------------

import {
  graphDigest, projectionBound, safeLabel, weakerFactCategory,
  type CoverageState, type EvidenceStatus, type FactCategory,
  type ProjectionBound, type SystemMapEdge, type SystemMapNode,
} from './model';

export const SYSTEM_MAP_PROJECTION_VERSION = 'nightwatch.system-map-projection.v2' as const;

export const DISCLOSURE_LEVELS = ['L1_COMPANY', 'L2_PRODUCT', 'L3_SERVICE', 'L4_OPERATION'] as const;
export type DisclosureLevel = (typeof DISCLOSURE_LEVELS)[number];

export const OPERATOR_QUERIES = [
  'WHY_UNPROVEN',
  'UI_CONTROL_TO_HANDLER',
  'SURFACES_TOUCHING_SERVICE',
  'OBSERVED_PRODUCTION_PATHS',
  'MUTATION_CAPABLE_ROUTES',
  'UNTESTED_READ_ONLY_ROUTES',
  'COVERAGE_GAPS',
  'FINDINGS_ATTACHED_TO_TOPOLOGY',
] as const;
export type OperatorQuery = (typeof OPERATOR_QUERIES)[number];

/** Whether a zero-row result means "we looked and found none" or "we never
 * looked". Query 4 is permanently the second until C-12 runs, and conflating
 * them would let an empty map read as a clean bill of health. */
export const MEASUREMENT_STATES = ['MEASURED', 'UNMEASURED'] as const;
export type MeasurementState = (typeof MEASUREMENT_STATES)[number];

// --- inputs -----------------------------------------------------------------

/** One backend HTTP operation, as the source campaigns produce it. */
export interface OperationFact {
  readonly operationId: string;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly method: string;
  readonly routeTemplate: string;
  readonly factCategory: FactCategory;
  readonly readOnlyClassification: string;
  readonly routeProof: string;
  /** The proto service this operation belongs to, when C-03 proved one. */
  readonly protoServiceIdentity: string | null;
  readonly blockingStage: string | null;
  readonly blockingReason: string | null;
}

/** One C-03 service binding. */
export interface ServiceBindingFact {
  readonly protoServiceIdentity: string;
  readonly serviceDirectory: string;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly factCategory: FactCategory;
  readonly proven: boolean;
}

/** One C-04 consumer edge. */
export interface ConsumerEdgeFact {
  readonly edgeId: string;
  readonly repoId: string;
  readonly sourceSha: string;
  readonly relativePath: string;
  readonly method: string | null;
  readonly routeTemplate: string | null;
  readonly factCategory: FactCategory;
  readonly backendOperationId: string | null;
}

export interface FindingFact {
  readonly findingId: string;
  readonly attachedOperationId: string;
  readonly severity: string;
}

export interface SystemMapInput {
  readonly operations: readonly OperationFact[];
  readonly serviceBindings: readonly ServiceBindingFact[];
  readonly consumerEdges: readonly ConsumerEdgeFact[];
  readonly findings: readonly FindingFact[];
  /** Null when the upstream population is itself truncated, which makes every
   * derived total unknowable rather than merely large. */
  readonly operationPopulationTotal: number | null;
  readonly productOfRepository: Readonly<Record<string, string>>;
}

export interface SystemMapProjection {
  readonly projectionVersion: typeof SYSTEM_MAP_PROJECTION_VERSION;
  readonly level: DisclosureLevel | null;
  readonly query: OperatorQuery | null;
  readonly focusId: string | null;
  readonly nodes: readonly SystemMapNode[];
  readonly edges: readonly SystemMapEdge[];
  readonly nodeBound: ProjectionBound;
  readonly edgeBound: ProjectionBound;
  readonly measurement: MeasurementState;
  readonly graphDigest: string;
}

// --- helpers ----------------------------------------------------------------

function evidenceFor(category: FactCategory, readOnly?: string): EvidenceStatus {
  if (readOnly === 'PROVEN_MUTATION_CAPABLE') return 'MUTATION_CAPABLE';
  if (readOnly === 'READ_ONLY_PROVEN') return 'READ_ONLY_PROVEN';
  if (category === 'SOURCE_FACT') return 'MECHANICALLY_PROVEN';
  if (category === 'INFERENCE') return 'INFERRED';
  return 'SOURCE_ONLY';
}

function coverageFor(operation: OperationFact): CoverageState {
  if (operation.routeProof === 'PROVEN' && operation.factCategory === 'SOURCE_FACT') return 'PROVEN';
  if (operation.routeProof === 'AMBIGUOUS') return 'UNKNOWN';
  if (operation.routeProof === 'UNSUPPORTED') return 'UNSUPPORTED';
  return 'UNPROVEN';
}

function finish(input: {
  readonly level: DisclosureLevel | null;
  readonly query: OperatorQuery | null;
  readonly focusId: string | null;
  readonly nodes: readonly SystemMapNode[];
  readonly edges: readonly SystemMapEdge[];
  readonly nodeLimit: number;
  readonly edgeLimit: number;
  readonly nodeTotal: number | null;
  readonly edgeTotal: number | null;
  readonly measurement?: MeasurementState;
}): SystemMapProjection {
  // Clamp before slicing. `Array.slice(0, -5)` drops the LAST five elements
  // and returns the rest, so a negative limit would have widened the
  // projection instead of emptying it - the exact inversion a hostile or
  // buggy caller could exploit to see more, not less.
  const nodeLimit = Math.max(0, Math.trunc(input.nodeLimit));
  const edgeLimit = Math.max(0, Math.trunc(input.edgeLimit));
  const nodes = [...input.nodes].sort((left, right) => left.nodeId.localeCompare(right.nodeId)).slice(0, nodeLimit);
  const keep = new Set(nodes.map((node) => node.nodeId));
  // An edge whose endpoint was dropped is dropped too: a dangling edge would
  // draw a relationship to something the operator cannot see.
  const edges = [...input.edges]
    .filter((edge) => keep.has(edge.fromNodeId) && keep.has(edge.toNodeId))
    .sort((left, right) => left.edgeId.localeCompare(right.edgeId))
    .slice(0, edgeLimit);

  return {
    projectionVersion: SYSTEM_MAP_PROJECTION_VERSION,
    level: input.level,
    query: input.query,
    focusId: input.focusId,
    nodes,
    edges,
    nodeBound: projectionBound({ limit: nodeLimit, total: input.nodeTotal, projected: nodes.length }),
    edgeBound: projectionBound({ limit: edgeLimit, total: input.edgeTotal, projected: edges.length }),
    measurement: input.measurement ?? 'MEASURED',
    graphDigest: graphDigest(nodes, edges),
  };
}

function operationNode(operation: OperationFact): SystemMapNode {
  return {
    nodeId: `op:${operation.operationId}`,
    kind: 'HTTP_OPERATION',
    label: safeLabel(`${operation.method} ${operation.routeTemplate}`),
    factCategory: operation.factCategory,
    evidenceStatus: evidenceFor(operation.factCategory, operation.readOnlyClassification),
    coverageState: coverageFor(operation),
    repoId: operation.repoId,
    sourceSha: operation.sourceSha,
  };
}

// --- progressive disclosure -------------------------------------------------

/** L1 - the company and its products. */
export function projectCompany(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const products = [...new Set(Object.values(input.productOfRepository))].sort();
  const nodes: SystemMapNode[] = [{
    nodeId: 'company:alphaus',
    kind: 'COMPANY',
    label: 'Alphaus',
    // A grouping node is structure, not evidence. Calling it a SOURCE_FACT
    // would put a fact category on something nothing proved.
    factCategory: 'INFERENCE',
    evidenceStatus: 'SOURCE_ONLY',
    coverageState: 'UNMEASURED',
    repoId: null,
    sourceSha: null,
  }];
  const edges: SystemMapEdge[] = [];
  for (const product of products) {
    nodes.push({
      nodeId: `product:${product}`, kind: 'PRODUCT', label: safeLabel(product),
      factCategory: 'INFERENCE', evidenceStatus: 'SOURCE_ONLY', coverageState: 'UNMEASURED',
      repoId: null, sourceSha: null,
    });
    edges.push({
      edgeId: `company:alphaus->product:${product}`, fromNodeId: 'company:alphaus', toNodeId: `product:${product}`,
      kind: 'CONTAINS', factCategory: 'INFERENCE', evidenceStatus: 'SOURCE_ONLY',
    });
  }
  return finish({ level: 'L1_COMPANY', query: null, focusId: 'company:alphaus', nodes, edges, ...limits, nodeTotal: products.length + 1, edgeTotal: products.length });
}

/** L2 - one product's repositories and services. */
export function projectProduct(input: SystemMapInput, productId: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const repositories = Object.entries(input.productOfRepository).filter(([, product]) => product === productId).map(([repoId]) => repoId).sort();
  const nodes: SystemMapNode[] = [{
    nodeId: `product:${productId}`, kind: 'PRODUCT', label: safeLabel(productId),
    factCategory: 'INFERENCE', evidenceStatus: 'SOURCE_ONLY', coverageState: 'UNMEASURED', repoId: null, sourceSha: null,
  }];
  const edges: SystemMapEdge[] = [];
  for (const repoId of repositories) {
    nodes.push({
      nodeId: `repo:${repoId}`, kind: 'REPOSITORY', label: safeLabel(repoId),
      factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN', coverageState: 'PROVEN', repoId, sourceSha: null,
    });
    edges.push({ edgeId: `product:${productId}->repo:${repoId}`, fromNodeId: `product:${productId}`, toNodeId: `repo:${repoId}`, kind: 'CONTAINS', factCategory: 'INFERENCE', evidenceStatus: 'SOURCE_ONLY' });
  }
  for (const binding of input.serviceBindings.filter((entry) => repositories.includes(entry.repoId))) {
    const nodeId = `service:${binding.serviceDirectory}`;
    if (!nodes.some((node) => node.nodeId === nodeId)) {
      nodes.push({
        nodeId, kind: 'SERVICE', label: safeLabel(binding.serviceDirectory),
        factCategory: binding.factCategory,
        evidenceStatus: binding.proven ? 'MECHANICALLY_PROVEN' : 'INFERRED',
        coverageState: binding.proven ? 'PROVEN' : 'UNPROVEN',
        repoId: binding.repoId, sourceSha: binding.sourceSha,
      });
    }
    edges.push({
      edgeId: `repo:${binding.repoId}->${nodeId}`, fromNodeId: `repo:${binding.repoId}`, toNodeId: nodeId,
      kind: 'CONTAINS', factCategory: binding.factCategory, evidenceStatus: binding.proven ? 'MECHANICALLY_PROVEN' : 'INFERRED',
    });
  }
  return finish({ level: 'L2_PRODUCT', query: null, focusId: `product:${productId}`, nodes, edges, ...limits, nodeTotal: nodes.length, edgeTotal: edges.length });
}

/** L3 - one service's proto service, RPCs and HTTP operations. */
export function projectService(input: SystemMapInput, serviceDirectory: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const bindings = input.serviceBindings.filter((entry) => entry.serviceDirectory === serviceDirectory);
  const identities = new Set(bindings.map((entry) => entry.protoServiceIdentity));
  const operations = input.operations.filter((operation) => operation.protoServiceIdentity !== null && identities.has(operation.protoServiceIdentity));

  const nodes: SystemMapNode[] = [{
    nodeId: `service:${serviceDirectory}`, kind: 'SERVICE', label: safeLabel(serviceDirectory),
    factCategory: bindings[0]?.factCategory ?? 'INFERENCE',
    evidenceStatus: bindings.some((entry) => entry.proven) ? 'MECHANICALLY_PROVEN' : 'INFERRED',
    coverageState: bindings.some((entry) => entry.proven) ? 'PROVEN' : 'UNPROVEN',
    repoId: bindings[0]?.repoId ?? null, sourceSha: bindings[0]?.sourceSha ?? null,
  }];
  const edges: SystemMapEdge[] = [];
  for (const binding of bindings) {
    const nodeId = `proto:${binding.protoServiceIdentity}`;
    nodes.push({
      nodeId, kind: 'PROTO_SERVICE', label: safeLabel(binding.protoServiceIdentity),
      factCategory: binding.factCategory,
      evidenceStatus: binding.proven ? 'MECHANICALLY_PROVEN' : 'INFERRED',
      coverageState: binding.proven ? 'PROVEN' : 'UNPROVEN',
      repoId: binding.repoId, sourceSha: binding.sourceSha,
    });
    edges.push({
      edgeId: `service:${serviceDirectory}->${nodeId}`, fromNodeId: `service:${serviceDirectory}`, toNodeId: nodeId,
      kind: 'REGISTERS', factCategory: binding.factCategory, evidenceStatus: binding.proven ? 'MECHANICALLY_PROVEN' : 'INFERRED',
    });
  }
  for (const operation of operations) {
    nodes.push(operationNode(operation));
    edges.push({
      edgeId: `proto:${operation.protoServiceIdentity as string}->op:${operation.operationId}`,
      fromNodeId: `proto:${operation.protoServiceIdentity as string}`, toNodeId: `op:${operation.operationId}`,
      kind: 'EXPOSES', factCategory: operation.factCategory, evidenceStatus: evidenceFor(operation.factCategory, operation.readOnlyClassification),
    });
  }
  return finish({ level: 'L3_SERVICE', query: null, focusId: `service:${serviceDirectory}`, nodes, edges, ...limits, nodeTotal: nodes.length, edgeTotal: edges.length });
}

/** L4 - one operation with its consumers and findings. */
export function projectOperation(input: SystemMapInput, operationId: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const operation = input.operations.find((entry) => entry.operationId === operationId);
  if (operation === undefined) {
    return finish({ level: 'L4_OPERATION', query: null, focusId: operationId, nodes: [], edges: [], ...limits, nodeTotal: 0, edgeTotal: 0 });
  }
  const nodes: SystemMapNode[] = [operationNode(operation)];
  const edges: SystemMapEdge[] = [];

  for (const consumer of input.consumerEdges.filter((entry) => entry.backendOperationId === operationId)) {
    const nodeId = `consumer:${consumer.edgeId}`;
    nodes.push({
      nodeId, kind: 'FRONTEND_CONSUMER', label: safeLabel(consumer.relativePath),
      factCategory: consumer.factCategory,
      evidenceStatus: consumer.factCategory === 'SOURCE_FACT' ? 'MECHANICALLY_PROVEN' : 'INFERRED',
      coverageState: consumer.factCategory === 'SOURCE_FACT' ? 'PROVEN' : 'UNPROVEN',
      repoId: consumer.repoId, sourceSha: consumer.sourceSha,
    });
    edges.push({
      edgeId: `${nodeId}->op:${operationId}`, fromNodeId: nodeId, toNodeId: `op:${operationId}`, kind: 'CONSUMES_ROUTE',
      // The join is never stronger than its weakest input.
      factCategory: weakerFactCategory(consumer.factCategory, operation.factCategory),
      evidenceStatus: consumer.factCategory === 'SOURCE_FACT' && operation.factCategory === 'SOURCE_FACT' ? 'MECHANICALLY_PROVEN' : 'INFERRED',
    });
  }
  for (const finding of input.findings.filter((entry) => entry.attachedOperationId === operationId)) {
    const nodeId = `finding:${finding.findingId}`;
    nodes.push({
      nodeId, kind: 'FINDING', label: safeLabel(finding.severity),
      factCategory: 'OBSERVATION', evidenceStatus: 'FINDING_PRESENT', coverageState: 'UNKNOWN', repoId: null, sourceSha: null,
    });
    edges.push({ edgeId: `op:${operationId}->${nodeId}`, fromNodeId: `op:${operationId}`, toNodeId: nodeId, kind: 'ATTACHES_FINDING', factCategory: 'OBSERVATION', evidenceStatus: 'FINDING_PRESENT' });
  }
  return finish({ level: 'L4_OPERATION', query: null, focusId: `op:${operationId}`, nodes, edges, ...limits, nodeTotal: nodes.length, edgeTotal: edges.length });
}

// --- the eight operator queries ---------------------------------------------

function operationsProjection(query: OperatorQuery, focusId: string | null, operations: readonly OperationFact[], input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }, measurement?: MeasurementState): SystemMapProjection {
  return finish({
    level: null, query, focusId,
    nodes: operations.map(operationNode), edges: [],
    ...limits,
    // The total is unknowable when the upstream population is truncated.
    nodeTotal: input.operationPopulationTotal === null ? null : operations.length,
    edgeTotal: 0,
    measurement,
  });
}

/** 1. Why is this unproven? Ordered blocking-stage chain with reason codes. */
export function queryWhyUnproven(input: SystemMapInput, operationId: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection & { readonly blockingChain: readonly { readonly stage: string; readonly reason: string | null }[] } {
  const operation = input.operations.find((entry) => entry.operationId === operationId);
  const projection = operationsProjection('WHY_UNPROVEN', operationId, operation === undefined ? [] : [operation], input, limits);
  const blockingChain = operation === undefined || operation.blockingStage === null
    ? []
    : [{ stage: operation.blockingStage, reason: operation.blockingReason }];
  return { ...projection, blockingChain };
}

/** 2. Path from a UI control to the backend handler. */
export function queryUiControlToHandler(input: SystemMapInput, consumerEdgeId: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const consumer = input.consumerEdges.find((entry) => entry.edgeId === consumerEdgeId);
  if (consumer === undefined || consumer.backendOperationId === null) {
    return finish({ level: null, query: 'UI_CONTROL_TO_HANDLER', focusId: consumerEdgeId, nodes: [], edges: [], ...limits, nodeTotal: 0, edgeTotal: 0 });
  }
  const operationProjection = projectOperation(input, consumer.backendOperationId, limits);
  const keep = new Set([`consumer:${consumer.edgeId}`, `op:${consumer.backendOperationId}`]);
  return finish({
    level: null, query: 'UI_CONTROL_TO_HANDLER', focusId: consumerEdgeId,
    nodes: operationProjection.nodes.filter((node) => keep.has(node.nodeId)),
    edges: operationProjection.edges.filter((edge) => keep.has(edge.fromNodeId) && keep.has(edge.toNodeId)),
    ...limits, nodeTotal: 2, edgeTotal: 1,
  });
}

/** 3. Every surface touching this service. */
export function querySurfacesTouchingService(input: SystemMapInput, serviceDirectory: string, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  return { ...projectService(input, serviceDirectory, limits), level: null, query: 'SURFACES_TOUCHING_SERVICE' };
}

/**
 * 4. All observed production paths.
 *
 * Permanently empty and permanently UNMEASURED until C-12 runs. The
 * measurement state is what stops an empty result reading as "production was
 * observed and is clean".
 */
export function queryObservedProductionPaths(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  return finish({
    level: null, query: 'OBSERVED_PRODUCTION_PATHS', focusId: null,
    nodes: [], edges: [], ...limits, nodeTotal: 0, edgeTotal: 0,
    measurement: 'UNMEASURED',
  });
}

/** 5. All mutation-capable routes. */
export function queryMutationCapableRoutes(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  return operationsProjection('MUTATION_CAPABLE_ROUTES', null, input.operations.filter((operation) => operation.readOnlyClassification === 'PROVEN_MUTATION_CAPABLE'), input, limits);
}

/**
 * 6. Untested read-only routes.
 *
 * Derived from the ledger every time. The historical count of 76 is
 * deliberately not written down anywhere: a constant would go stale silently
 * and read as a measurement.
 */
export function queryUntestedReadOnlyRoutes(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  return operationsProjection('UNTESTED_READ_ONLY_ROUTES', null, input.operations.filter((operation) => operation.readOnlyClassification === 'READ_ONLY_PROVEN' && operation.blockingStage !== null), input, limits);
}

/** 7. Coverage gaps - anything not PROVEN. */
export function queryCoverageGaps(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  return operationsProjection('COVERAGE_GAPS', null, input.operations.filter((operation) => coverageFor(operation) !== 'PROVEN'), input, limits);
}

/** 8. Findings attached to topology. */
export function queryFindingsAttachedToTopology(input: SystemMapInput, limits: { readonly nodeLimit: number; readonly edgeLimit: number }): SystemMapProjection {
  const attached = new Set(input.findings.map((finding) => finding.attachedOperationId));
  const operations = input.operations.filter((operation) => attached.has(operation.operationId));
  const nodes: SystemMapNode[] = operations.map(operationNode);
  const edges: SystemMapEdge[] = [];
  for (const finding of input.findings) {
    if (!attached.has(finding.attachedOperationId)) continue;
    const nodeId = `finding:${finding.findingId}`;
    nodes.push({ nodeId, kind: 'FINDING', label: safeLabel(finding.severity), factCategory: 'OBSERVATION', evidenceStatus: 'FINDING_PRESENT', coverageState: 'UNKNOWN', repoId: null, sourceSha: null });
    edges.push({ edgeId: `op:${finding.attachedOperationId}->${nodeId}`, fromNodeId: `op:${finding.attachedOperationId}`, toNodeId: nodeId, kind: 'ATTACHES_FINDING', factCategory: 'OBSERVATION', evidenceStatus: 'FINDING_PRESENT' });
  }
  return finish({
    level: null, query: 'FINDINGS_ATTACHED_TO_TOPOLOGY', focusId: null, nodes, edges, ...limits,
    nodeTotal: nodes.length, edgeTotal: edges.length,
    // Zero findings here is a measured zero: the finding set was consulted.
    measurement: 'MEASURED',
  });
}
