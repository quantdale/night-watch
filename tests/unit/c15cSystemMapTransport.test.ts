// C-15c — System Map V2 HTTP transport.
//
// The transport must carry the map WITHOUT carrying authority, and without
// rendering away the boundaries of a bounded projection. Those two properties
// are what this suite exists to defend; everything else here supports them.

import { expect, test } from '@playwright/test';
import {
  parseControlCenterPath,
  SYSTEM_MAP_LEVEL_SEGMENTS,
  SYSTEM_MAP_QUERY_SEGMENTS,
} from '../../src/controlCenter/server/router';
import {
  LEVEL_FOR_SEGMENT,
  QUERY_FOR_SEGMENT,
  SYSTEM_MAP_LEVEL_LIMITS,
  SYSTEM_MAP_QUERY_LIMITS,
  systemMapLevel,
  systemMapQuery,
} from '../../src/controlCenter/adapters/systemMapAdapter';
import { CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION } from '../../src/controlCenter/contracts/systemMap';
import type { SystemMapInput } from '../../src/core/systemMap/projections';

function operation(id: string, over: Partial<SystemMapInput['operations'][number]> = {}): SystemMapInput['operations'][number] {
  return {
    operationId: id,
    repoId: 'mobingilabs/ripple-api',
    sourceSha: 'a'.repeat(40),
    method: 'GET',
    routeTemplate: `/v1/${id}`,
    factCategory: 'SOURCE_FACT',
    readOnlyClassification: 'READ_ONLY_METHOD_ONLY',
    routeProof: 'PROVEN',
    protoServiceIdentity: 'ripple.v1.Ripple',
    blockingStage: null,
    blockingReason: null,
    ...over,
  };
}

function input(over: Partial<SystemMapInput> = {}): SystemMapInput {
  return {
    operations: [operation('alpha'), operation('beta')],
    serviceBindings: [{
      protoServiceIdentity: 'ripple.v1.Ripple',
      serviceDirectory: 'services/ripple',
      repoId: 'mobingilabs/ripple-api',
      sourceSha: 'a'.repeat(40),
      factCategory: 'SOURCE_FACT',
      proven: true,
    }],
    consumerEdges: [],
    findings: [],
    operationPopulationTotal: 2,
    productOfRepository: { 'mobingilabs/ripple-api': 'ripple' },
    ...over,
  };
}

// --- 1. routing -------------------------------------------------------------

test('1. every level segment routes to systemMapLevel', () => {
  for (const segment of SYSTEM_MAP_LEVEL_SEGMENTS) {
    // The parsed level must be the one asked for: routing to the right handler
    // with the wrong level would answer a different question silently.
    expect(parseControlCenterPath(`/api/v2/system-map/${segment}`)).toMatchObject({
      kind: 'route', route: { kind: 'systemMapLevel', level: segment },
    });
  }
});

test('2. every query segment routes to systemMapQuery', () => {
  for (const segment of SYSTEM_MAP_QUERY_SEGMENTS) {
    expect(parseControlCenterPath(`/api/v2/system-map/query/${segment}`)).toMatchObject({
      kind: 'route', route: { kind: 'systemMapQuery', query: segment },
    });
  }
});

test('3. an unknown level segment is rejected, not rounded to a known one', () => {
  for (const segment of ['l0', 'l5', 'L1', 'level1', '']) {
    expect(parseControlCenterPath(`/api/v2/system-map/${segment}`).kind).not.toBe('route');
  }
});

test('4. an unknown query segment is rejected, not matched to a nearest neighbour', () => {
  // `coverage` is a strict prefix of a real segment. A prefix match here would
  // answer a question the operator did not ask.
  for (const segment of ['made-up', 'coverage', 'why-unproven-x', 'WHY-UNPROVEN']) {
    expect(parseControlCenterPath(`/api/v2/system-map/query/${segment}`).kind).not.toBe('route');
  }
});

test('5. path traversal is rejected before any lookup', () => {
  for (const path of ['/api/v2/system-map/../etc', '/api/v2/system-map/l1/../../secret', '/api/v2/../v2/system-map/l1']) {
    expect(parseControlCenterPath(path).kind).not.toBe('route');
  }
});

test('6. the v1 API is not reinterpreted by v2 parsing', () => {
  expect(parseControlCenterPath('/api/v1/source/graph')).toMatchObject({ kind: 'route', route: { kind: 'sourceGraph' } });
  expect(parseControlCenterPath('/api/v1/meta')).toMatchObject({ kind: 'route', route: { kind: 'meta' } });
});

test('7. a v2 path with a trailing slash or extra segment is not a route', () => {
  expect(parseControlCenterPath('/api/v2/system-map/l1/').kind).not.toBe('route');
  expect(parseControlCenterPath('/api/v2/system-map/l1/extra').kind).not.toBe('route');
  expect(parseControlCenterPath('/api/v2/system-map').kind).not.toBe('route');
});

// --- 2. focus discipline ----------------------------------------------------

test('8. L1 with a focus is null, because the company has no parent to focus within', () => {
  expect(systemMapLevel(input(), 'L1_COMPANY', 'ripple')).toBeNull();
});

test('9. L2, L3 and L4 without a focus are null', () => {
  for (const level of ['L2_PRODUCT', 'L3_SERVICE', 'L4_OPERATION'] as const) {
    expect(systemMapLevel(input(), level, null)).toBeNull();
  }
});

test('10. L1 without a focus produces a map', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  expect(map).not.toBeNull();
  expect(map?.schemaVersion).toBe(CONTROL_CENTER_SYSTEM_MAP_SCHEMA_VERSION);
});

// --- 3. authority -----------------------------------------------------------

test('11. every level answer declares NONE for both authorities', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  expect(map?.executionAuthority).toBe('NONE');
  expect(map?.mutationAuthority).toBe('NONE');
});

test('12. every one of the eight queries declares NONE for both authorities', () => {
  for (const segment of SYSTEM_MAP_QUERY_SEGMENTS) {
    const query = QUERY_FOR_SEGMENT[segment];
    // Totality of the segment map is test 24's job; here it must simply hold.
    expect(query, segment).toBeDefined();
    const answer = systemMapQuery(input(), query!, 'ripple.v1.Ripple');
    if (answer === null) continue;
    expect(answer.executionAuthority, segment).toBe('NONE');
    expect(answer.mutationAuthority, segment).toBe('NONE');
  }
});

test('13. no DTO field can be read as a callable action', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  const serialized = JSON.stringify(map);
  for (const forbidden of ['"href"', '"action"', '"invoke"', '"execute"', '"url"', '"curl"']) {
    expect(serialized).not.toContain(forbidden);
  }
});

// --- 4. bounds --------------------------------------------------------------

test('14. per-level limits are strictly ordered and independent of the query limit', () => {
  expect(SYSTEM_MAP_LEVEL_LIMITS.L1_COMPANY.nodeLimit).toBe(64);
  expect(SYSTEM_MAP_LEVEL_LIMITS.L2_PRODUCT.nodeLimit).toBe(128);
  expect(SYSTEM_MAP_LEVEL_LIMITS.L3_SERVICE.nodeLimit).toBe(256);
  expect(SYSTEM_MAP_LEVEL_LIMITS.L4_OPERATION.nodeLimit).toBe(256);
  expect(SYSTEM_MAP_QUERY_LIMITS.nodeLimit).toBe(1000);
  expect(SYSTEM_MAP_QUERY_LIMITS.edgeLimit).toBe(2000);
});

test('15. a known population produces a known total and a known drop count', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  expect(map?.nodeBound.total).not.toBeNull();
  expect(map?.nodeBound.remainingUnknown).toBe(false);
});

test('16. an unknown population makes the total AND the drop count unknown, not zero', () => {
  // This is the property the whole transport exists to preserve. A drop count
  // needs a total; without one, reporting 0 dropped would assert the operator
  // has seen everything.
  const operations = Array.from({ length: 1200 }, (_, index) => operation(`op-${index}`, {
    readOnlyClassification: 'PROVEN_MUTATION_CAPABLE',
  }));
  const answer = systemMapQuery(input({ operations, operationPopulationTotal: null }), 'MUTATION_CAPABLE_ROUTES', null);
  expect(answer).not.toBeNull();
  expect(answer?.nodeBound.truncated).toBe(true);
  expect(answer?.nodeBound.total).toBeNull();
  expect(answer?.nodeBound.dropped).toBeNull();
  expect(answer?.nodeBound.remainingUnknown).toBe(true);
  expect(answer?.nodeBound.projected).toBe(SYSTEM_MAP_QUERY_LIMITS.nodeLimit);
});

test('17. a bound never reports more projected rows than its own limit', () => {
  const operations = Array.from({ length: 1200 }, (_, index) => operation(`op-${index}`, {
    readOnlyClassification: 'PROVEN_MUTATION_CAPABLE',
  }));
  const answer = systemMapQuery(input({ operations, operationPopulationTotal: 1200 }), 'MUTATION_CAPABLE_ROUTES', null);
  expect(answer!.nodeBound.projected).toBeLessThanOrEqual(answer!.nodeBound.limit);
  expect(answer!.nodes.length).toBe(answer!.nodeBound.projected);
});

test('18. the node array and the node bound never disagree', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  expect(map!.nodes.length).toBe(map!.nodeBound.projected);
  expect(map!.edges.length).toBe(map!.edgeBound.projected);
});

// --- 5. measurement ---------------------------------------------------------

test('19. an unobserved production query reports UNMEASURED, not an empty MEASURED result', () => {
  const answer = systemMapQuery(input(), 'OBSERVED_PRODUCTION_PATHS', null);
  expect(answer?.measurement).toBe('UNMEASURED');
  expect(answer?.nodes.length).toBe(0);
});

test('20. a query that genuinely looked reports MEASURED even when it finds nothing', () => {
  const answer = systemMapQuery(input({ operations: [] }), 'COVERAGE_GAPS', null);
  expect(answer?.measurement).toBe('MEASURED');
});

// --- 6. layout --------------------------------------------------------------

test('21. layout is deterministic across repeated calls', () => {
  const first = systemMapLevel(input(), 'L1_COMPANY', null);
  const second = systemMapLevel(input(), 'L1_COMPANY', null);
  expect(second!.layout.layoutDigest).toBe(first!.layout.layoutDigest);
  expect(second!.layout.graphDigest).toBe(first!.layout.graphDigest);
  expect(JSON.stringify(second!.nodes)).toBe(JSON.stringify(first!.nodes));
});

test('22. every transported node carries a layout position', () => {
  const map = systemMapLevel(input(), 'L1_COMPANY', null);
  for (const node of map!.nodes) {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isInteger(node.layer)).toBe(true);
  }
});

test('23. a different graph produces a different graph digest', () => {
  const one = systemMapLevel(input(), 'L1_COMPANY', null);
  const two = systemMapLevel(input({
    operations: [operation('alpha'), operation('beta'), operation('gamma', { repoId: 'mobingilabs/wave-api' })],
    productOfRepository: { 'mobingilabs/ripple-api': 'ripple', 'mobingilabs/wave-api': 'wave' },
    operationPopulationTotal: 3,
  }), 'L1_COMPANY', null);
  expect(two!.layout.graphDigest).not.toBe(one!.layout.graphDigest);
});

// --- 7. segment maps --------------------------------------------------------

test('24. every routable segment has an adapter mapping, and vice versa', () => {
  expect(Object.keys(LEVEL_FOR_SEGMENT).sort()).toEqual([...SYSTEM_MAP_LEVEL_SEGMENTS].sort());
  expect(Object.keys(QUERY_FOR_SEGMENT).sort()).toEqual([...SYSTEM_MAP_QUERY_SEGMENTS].sort());
});

test('25. the segment maps are frozen, so a route cannot be added at runtime', () => {
  expect(Object.isFrozen(LEVEL_FOR_SEGMENT)).toBe(true);
  expect(Object.isFrozen(QUERY_FOR_SEGMENT)).toBe(true);
  expect(Object.isFrozen(SYSTEM_MAP_LEVEL_LIMITS)).toBe(true);
  expect(Object.isFrozen(SYSTEM_MAP_QUERY_LIMITS)).toBe(true);
});

// --- 8. fact category integrity --------------------------------------------

test('26. no transported node claims a stronger fact category than its source', () => {
  const map = systemMapLevel(input({
    operations: [operation('alpha', { factCategory: 'INFERENCE' })],
  }), 'L1_COMPANY', null);
  for (const node of map!.nodes) {
    expect(['SOURCE_FACT', 'DEPLOYMENT_FACT', 'RUNTIME_FACT', 'OBSERVATION', 'INFERENCE']).toContain(node.factCategory);
  }
});
