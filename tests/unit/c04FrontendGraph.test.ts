// ---------------------------------------------------------------------------
// Nightwatch C-04 - the joined consumer graph, and the real measured yield.
//
// The parser suite proves classification. This proves the JOIN and the two
// claims the campaign is judged on: no non-literal path is ever a SOURCE_FACT,
// and the join never makes an edge stronger than its inputs.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApprovedRealSourceScanConfig } from '../../src/core/source/approvedScan';
import { createRealSourceScanConfig, scanSource } from '../../src/core/source/scan';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { buildFrontendConsumerGraph, canonicalConsumerRoute, type BackendRouteFact, type FrontendConsumerGraph } from '../../src/core/source/frontendJoin';
import { classifyLiveSourceTestState } from '../helpers/liveSourceTestAuthority';

const RIPPLE_UI = 'mobingilabs/ripple-ui';
const SYNTHETIC_SHA = '5f4e3d2c1b0a99887766554433221100ffeeddcc';
const APPROVED_LIVE_STATE = classifyLiveSourceTestState();

/** Measured over a COMPLETE enumeration of ripple-ui@d80b161b. */
const MEASURED_EDGES = 382;
const MEASURED_SOURCE_FACTS = 348;


function realGraph(): FrontendConsumerGraph {
  const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
  const discovery = discoverSourceSurfaces({ access, config: createApprovedRealSourceScanConfig() });
  const backendRoutes: BackendRouteFact[] = discovery.operations.map((operation) => ({
    repoId: operation.repository,
    sourceSha: operation.sourceSha,
    method: operation.method,
    routeTemplate: operation.routeTemplate,
    operationId: operation.operationId,
    evidenceClass: operation.routeProof === 'PROVEN' ? 'SOURCE_FACT' : 'UNKNOWN',
  }));
  return buildFrontendConsumerGraph({ access, inventory: discovery.inventory, frontendRepoId: RIPPLE_UI, backendRoutes });
}

/**
 * R2-N2: the live measurement skips with its declared identity instead of
 * passing vacuously. Every caller keeps a synthetic twin below.
 */
function liveGraphOrSkip(): FrontendConsumerGraph {
  test.skip(APPROVED_LIVE_STATE.kind !== 'CURRENT', `LIVE_SOURCE_${APPROVED_LIVE_STATE.kind}`);
  return realGraph();
}

function syntheticGraph(files: Readonly<Record<string, string>>, backendRoutes: readonly BackendRouteFact[]) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c04-'));
  const repo = path.join(root, ...RIPPLE_UI.split('/'));
  fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SYNTHETIC_SHA}\n`);
  for (const [relativePath, text] of Object.entries(files)) {
    fs.mkdirSync(path.join(repo, path.dirname(relativePath)), { recursive: true });
    fs.writeFileSync(path.join(repo, relativePath), text);
  }
  const access = createSiblingSourceAccess(root);
  const inventory = scanSource({
    access,
    config: createRealSourceScanConfig({
      runtimeMappingNamespace: 'ripple',
      approvedRepositories: [{ repoId: RIPPLE_UI, expectedSourceSha: SYNTHETIC_SHA, allowlistedRoots: ['src'], allowedExtensions: ['.js', '.vue'], maxFiles: 64, maxFileBytes: 200_000, maxTotalBytes: 2_000_000 }],
    }),
  });
  return { root, graph: buildFrontendConsumerGraph({ access, inventory, frontendRepoId: RIPPLE_UI, backendRoutes }) };
}

const CONFIG_JS = "export const blueApi = axios.create({});\n";

function backendRoute(method: BackendRouteFact['method'], routeTemplate: string, evidenceClass: BackendRouteFact['evidenceClass'] = 'SOURCE_FACT'): BackendRouteFact {
  return { repoId: 'alphauslabs/blueapi', sourceSha: SYNTHETIC_SHA, method, routeTemplate, operationId: `op-${method}-${routeTemplate}`, evidenceClass };
}

test.describe('C-04 - canonical route identity', () => {
  test('placeholders collapse and a leading slash is optional', () => {
    expect(canonicalConsumerRoute('/v1/accounts/{id}')).toBe('/v1/accounts/{}');
    expect(canonicalConsumerRoute('admin/v1/x')).toBe('/admin/v1/x');
    expect(canonicalConsumerRoute('/v1/a/{}/b/{x}')).toBe('/v1/a/{}/b/{}');
  });
});

test.describe('C-04 - the join is categorical and never upgrades', () => {
  test('an exact match is PROVEN', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/things');" },
      [backendRoute('GET', '/v1/things')],
    );
    try {
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]?.joinState).toBe('PROVEN');
      expect(graph.edges[0]?.joinedEvidenceClass).toBe('SOURCE_FACT');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('a weaker backend fact drags the joined edge down, never up', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/things');" },
      [backendRoute('GET', '/v1/things', 'UNKNOWN')],
    );
    try {
      expect(graph.edges[0]?.consumerEvidenceClass).toBe('SOURCE_FACT');
      expect(graph.edges[0]?.joinedEvidenceClass).toBe('UNKNOWN');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('the same route under a different verb is METHOD_MISMATCH, not MISSING', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.post('/v1/things');" },
      [backendRoute('GET', '/v1/things')],
    );
    try {
      expect(graph.edges[0]?.joinState).toBe('METHOD_MISMATCH');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('two backend routes matching one edge are AMBIGUOUS, not first-wins', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/things');" },
      [backendRoute('GET', '/v1/things'), { ...backendRoute('GET', '/v1/things'), repoId: 'mobingilabs/ripple-api', operationId: 'other' }],
    );
    try {
      expect(graph.edges[0]?.joinState).toBe('AMBIGUOUS');
      expect(graph.edges[0]?.backendOperationId).toBeNull();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('an unresolved path is DYNAMIC and says nothing about the backend', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': 'blueApi.get(mystery);' },
      [backendRoute('GET', '/v1/things')],
    );
    try {
      expect(graph.edges[0]?.joinState).toBe('DYNAMIC');
      expect(graph.edges[0]?.joinedEvidenceClass).toBe('UNKNOWN');
      expect(graph.edges[0]?.backendOperationId).toBeNull();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('instances declared in one file are honoured in another', () => {
    const { root, graph } = syntheticGraph(
      { 'src/axios.config.js': CONFIG_JS, 'src/vuex/api/things.js': "const url = '/v1/things'; blueApi.get(url);" },
      [backendRoute('GET', '/v1/things')],
    );
    try {
      expect(graph.instances).toContain('blueApi');
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]?.joinState).toBe('PROVEN');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('the graph is deterministic', () => {
    const first = syntheticGraph({ 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/a');" }, [backendRoute('GET', '/v1/a')]);
    const second = syntheticGraph({ 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/a');" }, [backendRoute('GET', '/v1/a')]);
    try {
      expect(second.graph.graphDigest).toBe(first.graph.graphDigest);
    } finally {
      fs.rmSync(first.root, { recursive: true, force: true });
      fs.rmSync(second.root, { recursive: true, force: true });
    }
  });
});

test.describe('C-04 - the real measured yield', () => {
  test('ripple-ui enumerates completely and yields the measured edge count', () => {
    const graph = liveGraphOrSkip();
    expect(graph.completeness.enumerationState).toBe('COMPLETE');
    expect(graph.completeness.repositoryCompleteProof).toBe(true);
    expect(graph.counters.total).toBeGreaterThanOrEqual(MEASURED_EDGES);
    expect(graph.counters.sourceFact).toBeGreaterThanOrEqual(MEASURED_SOURCE_FACTS);
  });

  test('ZERO edges are SOURCE_FACT from a non-literal path', () => {
    const graph = liveGraphOrSkip();
    expect(graph.counters.nonLiteralSourceFacts).toBe(0);
    for (const edge of graph.edges) {
      if (edge.consumerEvidenceClass === 'SOURCE_FACT') {
        expect(['LITERAL', 'STRUCTURAL']).toContain(edge.pathClass);
        expect(edge.routeTemplate).not.toBeNull();
      }
    }
  });

  test('no durable edge carries a query value or a fragment', () => {
    const graph = liveGraphOrSkip();
    for (const edge of graph.edges) {
      expect(edge.routeTemplate ?? '').not.toContain('?');
      expect(edge.routeTemplate ?? '').not.toContain('#');
      expect(edge.routeTemplate ?? '').not.toContain('$');
    }
  });

  test('the eight declared axios instances are recovered', () => {
    const graph = liveGraphOrSkip();
    expect(graph.instances).toEqual(['authApi', 'baseApi', 'blueApi', 'emailAuthApi', 'loginApi', 'mfaApi', 'statusApi', 'usersApi']);
  });

  test('a substantial share of edges join a real backend route', () => {
    const graph = liveGraphOrSkip();
    expect(graph.counters.proven).toBeGreaterThan(100);
  });

  test('the >= 400 criterion is evaluated truthfully and does not pass', () => {
    const graph = liveGraphOrSkip();
    expect(graph.counters.total).toBeLessThan(400);
    expect(graph.counters.total).toBeGreaterThanOrEqual(MEASURED_EDGES);
  });
});

// R2-N2 — synthetic twins for the declared live-source skips above. The live
// suite measures ripple-ui and skips categorically; these twins prove the same
// mechanisms over explicit synthetic roots so the coverage never disappears
// with the host.

test.describe('C-04 - synthetic twins for the declared live-source skips', () => {
  test('synthetic twin — completeness and counters report the measured shape', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/a');" },
      [backendRoute('GET', '/v1/a')],
    );
    try {
      expect(graph.completeness.enumerationState).toBe('COMPLETE');
      expect(graph.completeness.repositoryCompleteProof).toBe(true);
      expect(graph.counters.total).toBeGreaterThan(0);
      expect(graph.counters.proven).toBeGreaterThan(0);
      expect(graph.counters.total).toBe(graph.edges.length);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('synthetic twin — ZERO edges are SOURCE_FACT from a non-literal path', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "const id = 'x'; blueApi.get('/v1/other/' + id);" },
      [backendRoute('GET', '/v1/other/{}')],
    );
    try {
      expect(graph.counters.nonLiteralSourceFacts).toBe(0);
      for (const edge of graph.edges) {
        if (edge.consumerEvidenceClass === 'SOURCE_FACT') {
          expect(['LITERAL', 'STRUCTURAL']).toContain(edge.pathClass);
          expect(edge.routeTemplate).not.toBeNull();
        }
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('synthetic twin — no durable edge carries a query value or a fragment', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': CONFIG_JS, 'src/api.js': "blueApi.get('/v1/a?x=1#frag');" },
      [backendRoute('GET', '/v1/a')],
    );
    try {
      for (const edge of graph.edges) {
        expect(edge.routeTemplate ?? '').not.toContain('?');
        expect(edge.routeTemplate ?? '').not.toContain('#');
        expect(edge.routeTemplate ?? '').not.toContain('$');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('synthetic twin — declared axios instances are recovered from the synthetic root', () => {
    const { root, graph } = syntheticGraph(
      { 'src/config.js': "export const blueApi = axios.create({});\nexport const statusApi = axios.create({});\n", 'src/api.js': "blueApi.get('/v1/a');" },
      [backendRoute('GET', '/v1/a')],
    );
    try {
      expect(graph.instances).toEqual(['blueApi', 'statusApi']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
