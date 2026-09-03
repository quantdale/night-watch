// ---------------------------------------------------------------------------
// Nightwatch C-15b - Control Center authority, re-proven rather than inherited.
//
// C-15b touches the Control Center's read surface, so the invariants that make
// it observational have to be shown to still hold AFTER the change. Inheriting
// the claim from an earlier campaign is exactly the "presence is not proof"
// failure the C-11 review named.
//
// Also here: the C-10 production-findings exclusion, and the search/filter
// safety rules that come with giving the operator a search box for the first
// time.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createControlCenterServer } from '../../src/controlCenter/server';
import type { ControlCenterCollector } from '../../src/controlCenter/server/collector';
import { projectMeta } from '../../src/controlCenter/adapters/metaAdapter';
import {
  assertNotProductionFindingsRoot,
  CONTROL_CENTER_PRODUCTION_EXCLUSION_CODE,
  isProductionFindingsRoot,
  productionExcludedRoots,
} from '../../src/core/prodEvidence/controlCenterExclusion';
import { safeLabel } from '../../src/core/systemMap/model';
import {
  queryCoverageGaps, queryObservedProductionPaths, type SystemMapInput,
} from '../../src/core/systemMap/projections';

function request(port: number, requestPath: string, options: { readonly method?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const clientRequest = http.request({ host: '127.0.0.1', port, path: requestPath, method: options.method ?? 'GET' }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body }));
    });
    clientRequest.on('error', reject);
    clientRequest.end();
  });
}

/** Serves `meta` and refuses everything else.
 *
 * `meta` is real so the suite can show that GET still works — a 405 matrix
 * proves nothing if every method fails. Every other projector throws, so a
 * route that should not exist fails loudly instead of quietly returning an
 * empty document. */
function metaOnlyCollector(): ControlCenterCollector {
  const refuse = (): never => { throw new Error('CONTROL_CENTER_PROJECTOR_SHOULD_NOT_BE_REACHED'); };
  return new Proxy({}, {
    get: (_target, property) => {
      if (property === 'then') return undefined;
      if (property === 'meta') return () => projectMeta();
      return refuse;
    },
  }) as unknown as ControlCenterCollector;
}

const EMPTY_INPUT: SystemMapInput = {
  operations: [], serviceBindings: [], consumerEdges: [], findings: [],
  operationPopulationTotal: 0, productOfRepository: {},
};

test.describe('C-15b - the Control Center gains no authority', () => {
  test('meta still declares NONE for execution and mutation', () => {
    const meta = projectMeta();
    expect(meta.executionAuthority).toBe('NONE');
    expect(meta.mutationAuthority).toBe('NONE');
    expect(meta.readOnly).toBe(true);
  });

  test('every non-GET/HEAD method is refused with 405 and an Allow header', async () => {
    // Not just POST. A campaign that adds routes should be asked about every
    // verb an operator's tooling might send.
    const handle = createControlCenterServer({ collector: metaOnlyCollector(), port: 0 });
    const address = await handle.start();
    try {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
        const response = await request(address.port, '/api/v1/meta', { method });
        expect(response.status).toBe(405);
        expect(response.headers.allow).toBe('GET, HEAD');
      }
      const get = await request(address.port, '/api/v1/meta');
      expect(get.status).toBe(200);
      const head = await request(address.port, '/api/v1/meta', { method: 'HEAD' });
      expect(head.status).toBe(200);
    } finally {
      await handle.close();
    }
  });

  test('there is no execute, trigger or run-start route', async () => {
    const handle = createControlCenterServer({ collector: metaOnlyCollector(), port: 0 });
    const address = await handle.start();
    try {
      for (const route of ['/api/v1/execute', '/api/v1/run', '/api/v1/trigger', '/api/v1/campaign/start', '/api/v1/system-map/execute']) {
        const response = await request(address.port, route);
        // 404 or 400 - anything but a route that does something.
        expect([400, 404]).toContain(response.status);
      }
    } finally {
      await handle.close();
    }
  });
});

test.describe('C-15b - the production findings store stays unreachable', () => {
  test('the production root is recognised and excluded', () => {
    const root = path.join(os.homedir(), '.nightwatch', 'prod-findings');
    expect(isProductionFindingsRoot(root)).toBe(true);
    expect(() => assertNotProductionFindingsRoot(root)).toThrow(CONTROL_CENTER_PRODUCTION_EXCLUSION_CODE);
  });

  test('the parent root that would expose it is excluded too', () => {
    // Excluding only the exact directory would let a parent root walk into it.
    expect(productionExcludedRoots().length).toBeGreaterThan(0);
    for (const excluded of productionExcludedRoots()) {
      expect(() => assertNotProductionFindingsRoot(excluded)).toThrow(CONTROL_CENTER_PRODUCTION_EXCLUSION_CODE);
    }
  });

  test('a trailing-separator spelling of the same root is still excluded', () => {
    const root = `${path.join(os.homedir(), '.nightwatch', 'prod-findings')}${path.sep}`;
    expect(isProductionFindingsRoot(root)).toBe(true);
  });

  test('an unrelated root is not excluded, so the rule is not vacuous', () => {
    const unrelated = path.join(os.tmpdir(), 'nightwatch-unrelated-root');
    expect(isProductionFindingsRoot(unrelated)).toBe(false);
    expect(() => assertNotProductionFindingsRoot(unrelated)).not.toThrow();
  });

  test('no system map projection can name a production artifact', () => {
    // The map is built from source facts only. There is no seam through which
    // a production finding could enter it, and this asserts the absence.
    const projection = queryObservedProductionPaths(EMPTY_INPUT, { nodeLimit: 10, edgeLimit: 10 });
    expect(JSON.stringify(projection)).not.toContain('prod-findings');
    expect(projection.nodes).toEqual([]);
    expect(projection.measurement).toBe('UNMEASURED');
  });
});

test.describe('C-15b - search and filter are safe by construction', () => {
  test('a label cannot carry markup into the view', () => {
    expect(safeLabel('<img src=x onerror=alert(1)>')).not.toContain('<');
    expect(safeLabel('"><script>')).not.toContain('<');
  });

  test('a label is bounded in length', () => {
    expect(safeLabel('x'.repeat(5_000)).length).toBeLessThanOrEqual(160);
  });

  test('a label keeps the characters a route legitimately needs', () => {
    expect(safeLabel('GET /v1/billinggroups/{id}:paginated')).toBe('GET /v1/billinggroups/{id}:paginated');
  });

  test('filtering is deterministic in its order', () => {
    const operations = Array.from({ length: 20 }, (_, index) => ({
      operationId: `op-${index}`, repoId: 'r', sourceSha: 'a'.repeat(40), method: 'GET',
      routeTemplate: `/v1/x${index}`, factCategory: 'SOURCE_FACT' as const,
      readOnlyClassification: 'READ_ONLY_PROVEN', routeProof: 'AMBIGUOUS',
      protoServiceIdentity: null, blockingStage: null, blockingReason: null,
    }));
    const first = queryCoverageGaps({ ...EMPTY_INPUT, operations, operationPopulationTotal: 20 }, { nodeLimit: 5, edgeLimit: 5 });
    const second = queryCoverageGaps({ ...EMPTY_INPUT, operations: [...operations].reverse(), operationPopulationTotal: 20 }, { nodeLimit: 5, edgeLimit: 5 });
    expect(second.nodes.map((node) => node.nodeId)).toEqual(first.nodes.map((node) => node.nodeId));
    expect(second.graphDigest).toBe(first.graphDigest);
    // And the drop is still exact under a filter.
    expect(first.nodeBound.dropped).toBe(15);
  });
});

test.describe('C-15b - server-side limiting cannot be talked out of', () => {
  const operations = Array.from({ length: 100 }, (_, index) => ({
    operationId: `op-${String(index).padStart(3, '0')}`, repoId: 'r', sourceSha: 'a'.repeat(40), method: 'GET',
    routeTemplate: `/v1/x${index}`, factCategory: 'SOURCE_FACT' as const,
    readOnlyClassification: 'READ_ONLY_PROVEN', routeProof: 'AMBIGUOUS',
    protoServiceIdentity: null, blockingStage: null, blockingReason: null,
  }));
  const input: SystemMapInput = { ...EMPTY_INPUT, operations, operationPopulationTotal: 100 };

  test('a zero limit yields nothing rather than everything', () => {
    const projection = queryCoverageGaps(input, { nodeLimit: 0, edgeLimit: 0 });
    expect(projection.nodes).toEqual([]);
    expect(projection.nodeBound.dropped).toBe(100);
    expect(projection.nodeBound.truncated).toBe(true);
  });

  test('a negative limit yields nothing rather than everything', () => {
    const projection = queryCoverageGaps(input, { nodeLimit: -5, edgeLimit: -5 });
    expect(projection.nodes).toEqual([]);
  });

  test('a limit far above the population still reports the truth', () => {
    const projection = queryCoverageGaps(input, { nodeLimit: 10_000, edgeLimit: 10_000 });
    expect(projection.nodes).toHaveLength(100);
    expect(projection.nodeBound.dropped).toBe(0);
    expect(projection.nodeBound.truncated).toBe(false);
  });

  test('the drop count is always exact when the total is known', () => {
    for (const limit of [1, 7, 33, 99]) {
      const projection = queryCoverageGaps(input, { nodeLimit: limit, edgeLimit: limit });
      expect(projection.nodes).toHaveLength(limit);
      expect(projection.nodeBound.dropped).toBe(100 - limit);
    }
  });
});
