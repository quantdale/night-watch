// ---------------------------------------------------------------------------
// Nightwatch C-15b - system map model, bounds, layout and the eight queries.
//
// Three claims are load-bearing and each is attacked rather than demonstrated:
//
//   * a projection reports EXACTLY what it dropped, and says so differently
//     when the total is unknowable;
//   * a join never produces a stronger fact category than its inputs;
//   * the layout is content-addressed - same input, same bytes; any
//     load-bearing change, different digest.
//
// Every fixture is explicit inline data.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  canonicalGraphBytes, FACT_CATEGORIES, graphDigest, projectionBound, safeLabel,
  weakerFactCategory, type SystemMapEdge, type SystemMapNode,
} from '../../src/core/systemMap/model';
import {
  DEFAULT_LAYOUT_OPTIONS, LAYOUT_ENGINE_ID, LAYOUT_ENGINE_VERSION, layoutSystemMap,
} from '../../src/core/systemMap/layout';
import {
  DISCLOSURE_LEVELS, OPERATOR_QUERIES, projectCompany, projectOperation, projectProduct,
  projectService, queryCoverageGaps, queryFindingsAttachedToTopology, queryMutationCapableRoutes,
  queryObservedProductionPaths, querySurfacesTouchingService, queryUiControlToHandler,
  queryUntestedReadOnlyRoutes, queryWhyUnproven, SYSTEM_MAP_PROJECTION_VERSION,
  type SystemMapInput,
} from '../../src/core/systemMap/projections';

const LIMITS = { nodeLimit: 1000, edgeLimit: 2000 } as const;
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

function operation(overrides: Partial<SystemMapInput['operations'][number]> = {}) {
  return {
    operationId: 'op-1', repoId: 'alphauslabs/blueapi', sourceSha: SHA,
    method: 'GET', routeTemplate: '/v1/things', factCategory: 'SOURCE_FACT' as const,
    readOnlyClassification: 'READ_ONLY_PROVEN', routeProof: 'PROVEN',
    protoServiceIdentity: 'blueapi.billing.v1.Billing', blockingStage: null, blockingReason: null,
    ...overrides,
  };
}

function input(overrides: Partial<SystemMapInput> = {}): SystemMapInput {
  return {
    operations: [operation()],
    serviceBindings: [{ protoServiceIdentity: 'blueapi.billing.v1.Billing', serviceDirectory: 'services/billingd', repoId: 'mobingilabs/ouchan', sourceSha: SHA, factCategory: 'SOURCE_FACT', proven: true }],
    consumerEdges: [{ edgeId: 'c-1', repoId: 'mobingilabs/ripple-ui', sourceSha: SHA, relativePath: 'src/vuex/api/things.js', method: 'GET', routeTemplate: '/v1/things', factCategory: 'SOURCE_FACT', backendOperationId: 'op-1' }],
    findings: [],
    operationPopulationTotal: 1,
    productOfRepository: { 'alphauslabs/blueapi': 'blue', 'mobingilabs/ouchan': 'blue', 'mobingilabs/ripple-ui': 'ripple' },
    ...overrides,
  };
}

test.describe('C-15b - projection bounds report exactly what was dropped', () => {
  test('a complete projection reports zero dropped and is not truncated', () => {
    const bound = projectionBound({ limit: 10, total: 4, projected: 4 });
    expect(bound).toMatchObject({ total: 4, projected: 4, dropped: 0, truncated: false, remainingUnknown: false });
  });

  test('a bounded projection reports the EXACT drop count, not a flag', () => {
    // The v1 defect: `truncated: true` cannot distinguish two missing nodes
    // from two thousand.
    const bound = projectionBound({ limit: 10, total: 412, projected: 10 });
    expect(bound.dropped).toBe(402);
    expect(bound.truncated).toBe(true);
    expect(bound.remainingUnknown).toBe(false);
  });

  test('an unknowable total is distinguished from a known one', () => {
    const bound = projectionBound({ limit: 10, total: null, projected: 10 });
    expect(bound.total).toBeNull();
    expect(bound.dropped).toBeNull();
    expect(bound.truncated).toBe(true);
    expect(bound.remainingUnknown).toBe(true);
  });

  test('a truncated upstream population makes the derived total unknowable', () => {
    const projection = queryCoverageGaps(input({ operationPopulationTotal: null, operations: [operation({ routeProof: 'AMBIGUOUS' })] }), LIMITS);
    expect(projection.nodeBound.total).toBeNull();
    expect(projection.nodeBound.remainingUnknown).toBe(true);
  });

  test('a node limit actually bounds the projection and reports the drop', () => {
    const many = Array.from({ length: 50 }, (_, index) => operation({ operationId: `op-${index}`, readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }));
    const projection = queryMutationCapableRoutes(input({ operations: many, operationPopulationTotal: 50 }), { nodeLimit: 10, edgeLimit: 10 });
    expect(projection.nodes).toHaveLength(10);
    expect(projection.nodeBound.dropped).toBe(40);
    expect(projection.nodeBound.truncated).toBe(true);
  });

  test('an edge whose endpoint was dropped is dropped too', () => {
    // A dangling edge would draw a relationship to something invisible.
    const projection = projectOperation(input(), 'op-1', { nodeLimit: 1, edgeLimit: 10 });
    expect(projection.nodes).toHaveLength(1);
    expect(projection.edges).toEqual([]);
  });
});

test.describe('C-15b - fact categories, and joins that never strengthen', () => {
  test('the weaker category always wins', () => {
    expect(weakerFactCategory('SOURCE_FACT', 'INFERENCE')).toBe('INFERENCE');
    expect(weakerFactCategory('INFERENCE', 'SOURCE_FACT')).toBe('INFERENCE');
    expect(weakerFactCategory('SOURCE_FACT', 'SOURCE_FACT')).toBe('SOURCE_FACT');
    expect(weakerFactCategory('DEPLOYMENT_FACT', 'OBSERVATION')).toBe('OBSERVATION');
  });

  test('a proven consumer joined to a weaker operation yields the weaker edge', () => {
    const projection = projectOperation(input({ operations: [operation({ factCategory: 'INFERENCE' })] }), 'op-1', LIMITS);
    const consumes = projection.edges.find((edge) => edge.kind === 'CONSUMES_ROUTE');
    expect(consumes?.factCategory).toBe('INFERENCE');
  });

  test('an inference consumer never becomes a fact by being joined', () => {
    const projection = projectOperation(input({ consumerEdges: [{ edgeId: 'c-1', repoId: 'mobingilabs/ripple-ui', sourceSha: SHA, relativePath: 'src/a.js', method: 'GET', routeTemplate: '/v1/things', factCategory: 'INFERENCE', backendOperationId: 'op-1' }] }), 'op-1', LIMITS);
    expect(projection.edges.find((edge) => edge.kind === 'CONSUMES_ROUTE')?.factCategory).toBe('INFERENCE');
  });

  test('every node and edge carries exactly one known fact category', () => {
    const projection = projectOperation(input(), 'op-1', LIMITS);
    for (const node of projection.nodes) expect(FACT_CATEGORIES).toContain(node.factCategory);
    for (const edge of projection.edges) expect(FACT_CATEGORIES).toContain(edge.factCategory);
  });

  test('a grouping node is not dressed up as a source fact', () => {
    // Nothing proved that "Alphaus" exists as a node; it is structure.
    const projection = projectCompany(input(), LIMITS);
    expect(projection.nodes.find((node) => node.kind === 'COMPANY')?.factCategory).toBe('INFERENCE');
  });

  test('a label is presentation data and cannot carry markup', () => {
    expect(safeLabel('<script>alert(1)</script>')).not.toContain('<');
    expect(safeLabel('GET /v1/accounts/{id}')).toBe('GET /v1/accounts/{id}');
  });
});

test.describe('C-15b - progressive disclosure', () => {
  test('the four levels exist and each is a separate projection', () => {
    expect([...DISCLOSURE_LEVELS]).toEqual(['L1_COMPANY', 'L2_PRODUCT', 'L3_SERVICE', 'L4_OPERATION']);
  });

  test('L1 shows products, not operations', () => {
    const projection = projectCompany(input(), LIMITS);
    expect(projection.level).toBe('L1_COMPANY');
    expect(projection.nodes.every((node) => node.kind === 'COMPANY' || node.kind === 'PRODUCT')).toBe(true);
    expect(projection.nodes.some((node) => node.kind === 'HTTP_OPERATION')).toBe(false);
  });

  test('L2 shows one product\'s repositories and services', () => {
    const projection = projectProduct(input(), 'blue', LIMITS);
    expect(projection.level).toBe('L2_PRODUCT');
    expect(projection.nodes.some((node) => node.kind === 'REPOSITORY')).toBe(true);
    expect(projection.nodes.some((node) => node.kind === 'SERVICE')).toBe(true);
    // The other product's repository is not in this projection.
    expect(projection.nodes.some((node) => node.nodeId === 'repo:mobingilabs/ripple-ui')).toBe(false);
  });

  test('L3 shows a service, its proto service and its operations', () => {
    const projection = projectService(input(), 'services/billingd', LIMITS);
    expect(projection.level).toBe('L3_SERVICE');
    expect(projection.nodes.some((node) => node.kind === 'PROTO_SERVICE')).toBe(true);
    expect(projection.nodes.some((node) => node.kind === 'HTTP_OPERATION')).toBe(true);
  });

  test('L4 shows an operation with its consumers and findings', () => {
    const projection = projectOperation(input({ findings: [{ findingId: 'f-1', attachedOperationId: 'op-1', severity: 'HIGH' }] }), 'op-1', LIMITS);
    expect(projection.level).toBe('L4_OPERATION');
    expect(projection.nodes.some((node) => node.kind === 'FRONTEND_CONSUMER')).toBe(true);
    expect(projection.nodes.some((node) => node.kind === 'FINDING')).toBe(true);
  });

  test('an unknown focus yields an empty projection rather than everything', () => {
    const projection = projectOperation(input(), 'op-missing', LIMITS);
    expect(projection.nodes).toEqual([]);
    expect(projection.nodeBound.total).toBe(0);
  });
});

test.describe('C-15b - the eight operator queries, one at a time', () => {
  test('the vocabulary is exactly eight', () => {
    expect(OPERATOR_QUERIES).toHaveLength(8);
  });

  test('1. why is this unproven - an ordered blocking chain with reason codes', () => {
    const result = queryWhyUnproven(input({ operations: [operation({ routeProof: 'AMBIGUOUS', blockingStage: 'ROUTE_PROOF', blockingReason: 'ROUTE_AMBIGUOUS' })] }), 'op-1', LIMITS);
    expect(result.query).toBe('WHY_UNPROVEN');
    expect(result.blockingChain).toEqual([{ stage: 'ROUTE_PROOF', reason: 'ROUTE_AMBIGUOUS' }]);
  });

  test('2. path from a UI control to the backend handler', () => {
    const result = queryUiControlToHandler(input(), 'c-1', LIMITS);
    expect(result.query).toBe('UI_CONTROL_TO_HANDLER');
    expect(result.nodes.map((node) => node.kind).sort()).toEqual(['FRONTEND_CONSUMER', 'HTTP_OPERATION']);
    expect(result.edges).toHaveLength(1);
  });

  test('2. an unjoined consumer yields no path rather than a guessed one', () => {
    const result = queryUiControlToHandler(input({ consumerEdges: [{ edgeId: 'c-2', repoId: 'mobingilabs/ripple-ui', sourceSha: SHA, relativePath: 'src/a.js', method: 'GET', routeTemplate: null, factCategory: 'UNKNOWN' as never, backendOperationId: null }] }), 'c-2', LIMITS);
    expect(result.nodes).toEqual([]);
  });

  test('3. every surface touching this service', () => {
    const result = querySurfacesTouchingService(input(), 'services/billingd', LIMITS);
    expect(result.query).toBe('SURFACES_TOUCHING_SERVICE');
    expect(result.nodes.some((node) => node.kind === 'HTTP_OPERATION')).toBe(true);
  });

  test('4. observed production paths is EMPTY and UNMEASURED, not a clean bill of health', () => {
    // C-12 has not run. Empty must never imply that it did.
    const result = queryObservedProductionPaths(input(), LIMITS);
    expect(result.query).toBe('OBSERVED_PRODUCTION_PATHS');
    expect(result.nodes).toEqual([]);
    expect(result.measurement).toBe('UNMEASURED');
  });

  test('5. mutation-capable routes', () => {
    const result = queryMutationCapableRoutes(input({ operations: [operation({ readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' })] }), LIMITS);
    expect(result.query).toBe('MUTATION_CAPABLE_ROUTES');
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.evidenceStatus).toBe('MUTATION_CAPABLE');
  });

  test('6. untested read-only routes are derived, never a hard-coded 76', () => {
    const result = queryUntestedReadOnlyRoutes(input({ operations: [operation({ readOnlyClassification: 'READ_ONLY_PROVEN', blockingStage: 'REPLAY' })] }), LIMITS);
    expect(result.query).toBe('UNTESTED_READ_ONLY_ROUTES');
    expect(result.nodes).toHaveLength(1);
    // A read-only route with nothing blocking it is not "untested".
    expect(queryUntestedReadOnlyRoutes(input(), LIMITS).nodes).toEqual([]);
  });

  test('7. coverage gaps are anything not PROVEN', () => {
    const result = queryCoverageGaps(input({ operations: [operation({ routeProof: 'AMBIGUOUS' }), operation({ operationId: 'op-2' })] }), LIMITS);
    expect(result.query).toBe('COVERAGE_GAPS');
    expect(result.nodes).toHaveLength(1);
  });

  test('8. findings attached to topology, and a measured zero when there are none', () => {
    const withFinding = queryFindingsAttachedToTopology(input({ findings: [{ findingId: 'f-1', attachedOperationId: 'op-1', severity: 'HIGH' }] }), LIMITS);
    expect(withFinding.query).toBe('FINDINGS_ATTACHED_TO_TOPOLOGY');
    expect(withFinding.nodes.some((node) => node.kind === 'FINDING')).toBe(true);

    const none = queryFindingsAttachedToTopology(input(), LIMITS);
    expect(none.nodes).toEqual([]);
    // MEASURED, not UNMEASURED: the finding set was consulted and was empty.
    expect(none.measurement).toBe('MEASURED');
  });

  test('a measured zero and an unmeasured zero are different answers', () => {
    expect(queryFindingsAttachedToTopology(input(), LIMITS).measurement).toBe('MEASURED');
    expect(queryObservedProductionPaths(input(), LIMITS).measurement).toBe('UNMEASURED');
  });
});

test.describe('C-15b - deterministic, content-addressed layout', () => {
  const nodes: SystemMapNode[] = [
    { nodeId: 'a', kind: 'SERVICE', label: 'a', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN', coverageState: 'PROVEN', repoId: null, sourceSha: null },
    { nodeId: 'b', kind: 'HTTP_OPERATION', label: 'b', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN', coverageState: 'PROVEN', repoId: null, sourceSha: null },
    { nodeId: 'c', kind: 'HTTP_OPERATION', label: 'c', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN', coverageState: 'PROVEN', repoId: null, sourceSha: null },
  ];
  const edges: SystemMapEdge[] = [
    { edgeId: 'a->b', fromNodeId: 'a', toNodeId: 'b', kind: 'EXPOSES', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN' },
    { edgeId: 'a->c', fromNodeId: 'a', toNodeId: 'c', kind: 'EXPOSES', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN' },
  ];
  const base = { nodes, edges, projectionVersion: SYSTEM_MAP_PROJECTION_VERSION };

  test('the same graph twice yields identical bytes and digest', () => {
    const first = layoutSystemMap(base);
    const second = layoutSystemMap(base);
    expect(JSON.stringify(second.nodes)).toBe(JSON.stringify(first.nodes));
    expect(second.layoutDigest).toBe(first.layoutDigest);
  });

  test('shuffled input order yields the same canonical result', () => {
    const shuffled = layoutSystemMap({ ...base, nodes: [...nodes].reverse(), edges: [...edges].reverse() });
    expect(shuffled.layoutDigest).toBe(layoutSystemMap(base).layoutDigest);
  });

  test('a changed node changes the digest', () => {
    const changed = layoutSystemMap({ ...base, nodes: [...nodes.slice(1), { ...nodes[0] as SystemMapNode, label: 'different' }] });
    expect(changed.layoutDigest).not.toBe(layoutSystemMap(base).layoutDigest);
  });

  test('a changed edge changes the digest', () => {
    const changed = layoutSystemMap({ ...base, edges: [...edges, { edgeId: 'b->c', fromNodeId: 'b', toNodeId: 'c', kind: 'EXPOSES', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN' }] });
    expect(changed.layoutDigest).not.toBe(layoutSystemMap(base).layoutDigest);
  });

  test('a changed layout option changes the digest', () => {
    const changed = layoutSystemMap({ ...base, options: { ...DEFAULT_LAYOUT_OPTIONS, layerGap: 200 } });
    expect(changed.layoutDigest).not.toBe(layoutSystemMap(base).layoutDigest);
  });

  test('a changed projection version changes the digest', () => {
    const changed = layoutSystemMap({ ...base, projectionVersion: 'nightwatch.system-map-projection.v99' });
    expect(changed.layoutDigest).not.toBe(layoutSystemMap(base).layoutDigest);
  });

  test('the engine identity and version are bound into the layout', () => {
    const layout = layoutSystemMap(base);
    expect(layout.engineId).toBe(LAYOUT_ENGINE_ID);
    expect(layout.engineVersion).toBe(LAYOUT_ENGINE_VERSION);
  });

  test('no timing enters the identity', () => {
    const first = layoutSystemMap(base);
    const later = layoutSystemMap(base);
    expect(later.layoutDigest).toBe(first.layoutDigest);
    expect(JSON.stringify(first)).not.toMatch(/\b1[6-9][0-9]{11}\b/);
  });

  test('a cyclic projection lays out rather than hanging', () => {
    const cyclic = layoutSystemMap({ ...base, edges: [...edges, { edgeId: 'c->a', fromNodeId: 'c', toNodeId: 'a', kind: 'EXPOSES', factCategory: 'SOURCE_FACT', evidenceStatus: 'MECHANICALLY_PROVEN' }] });
    expect(cyclic.nodes).toHaveLength(3);
  });

  test('layers are assigned by depth, deterministically', () => {
    const layout = layoutSystemMap(base);
    expect(layout.nodes.find((node) => node.nodeId === 'a')?.layer).toBe(0);
    expect(layout.nodes.find((node) => node.nodeId === 'b')?.layer).toBe(1);
    expect(layout.nodes.find((node) => node.nodeId === 'c')?.layer).toBe(1);
    // Two nodes in one layer get distinct orders, chosen by nodeId.
    expect(layout.nodes.find((node) => node.nodeId === 'b')?.order).not.toBe(layout.nodes.find((node) => node.nodeId === 'c')?.order);
  });

  test('the canonical bytes are order-independent', () => {
    expect(canonicalGraphBytes([...nodes].reverse(), [...edges].reverse())).toBe(canonicalGraphBytes(nodes, edges));
    expect(graphDigest([...nodes].reverse(), edges)).toBe(graphDigest(nodes, edges));
  });
});

test.describe('C-15b - scale at the contract maxima', () => {
  test('a 1000-node / 2000-edge projection lays out within the contract bound', () => {
    const many = Array.from({ length: 1200 }, (_, index) => operation({ operationId: `op-${String(index).padStart(4, '0')}`, readOnlyClassification: 'PROVEN_MUTATION_CAPABLE' }));
    const projection = queryMutationCapableRoutes(input({ operations: many, operationPopulationTotal: 1200 }), LIMITS);
    expect(projection.nodes).toHaveLength(1000);
    expect(projection.nodeBound.dropped).toBe(200);

    const started = Date.now();
    const layout = layoutSystemMap({ nodes: projection.nodes, edges: projection.edges, projectionVersion: SYSTEM_MAP_PROJECTION_VERSION });
    const elapsed = Date.now() - started;
    expect(layout.nodes).toHaveLength(1000);
    // Generous: the assertion is that layout is not superlinear enough to be
    // unusable at the largest PERMITTED projection, not a benchmark.
    expect(elapsed).toBeLessThan(5_000);
  });

  test('no projection may exceed its contract bound', () => {
    const many = Array.from({ length: 5000 }, (_, index) => operation({ operationId: `op-${index}`, routeProof: 'AMBIGUOUS' }));
    const projection = queryCoverageGaps(input({ operations: many, operationPopulationTotal: 5000 }), LIMITS);
    expect(projection.nodes.length).toBeLessThanOrEqual(1000);
    expect(projection.edges.length).toBeLessThanOrEqual(2000);
  });
});
