// ---------------------------------------------------------------------------
// Nightwatch C-04 — frontend consumer edges.
//
// Written BEFORE the parser. Its central claim is absolute and is the one the
// campaign is judged on:
//
//   no edge built from a non-literal path is ever a SOURCE_FACT.
//
// The shapes here are the ones ripple-ui actually contains, measured first:
// eight `axios.create` instances, and a function-local `url` variable rather
// than the `axios.get('/literal')` the historical design assumed — of which
// there are zero.
//
// Every fixture is explicit inline text. The parser takes source TEXT and has
// no filesystem authority (C-11 lesson 5.4).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { extractVueScripts, VUE_SFC_VERSION } from '../../src/core/source/vueSfc';
import {
  FRONTEND_CONSUMER_VERSION,
  readFrontendConsumers,
} from '../../src/core/source/frontendConsumer';

const INSTANCES = ['blueApi', 'baseApi'] as const;

function edges(sourceText: string, instances: readonly string[] = INSTANCES) {
  return readFrontendConsumers(sourceText, { knownInstances: instances }).edges;
}

function only(sourceText: string, instances: readonly string[] = INSTANCES) {
  const list = edges(sourceText, instances);
  return list[0];
}

test.describe('C-04 — the shapes ripple-ui actually contains', () => {
  test('a function-local url variable resolves to a literal route', () => {
    const edge = only(`
      export const actions = {
        async fetchThing() {
          let url = '/v1/things';
          const res = await blueApi.get(url);
          return res;
        },
      };
    `);
    expect(edge?.clientIdentifier).toBe('blueApi');
    expect(edge?.method).toBe('GET');
    expect(edge?.routeTemplate).toBe('/v1/things');
    expect(edge?.pathClass).toBe('LITERAL');
    expect(edge?.evidenceClass).toBe('SOURCE_FACT');
  });

  test('a direct literal argument resolves', () => {
    const edge = only("blueApi.post('/v1/things');");
    expect(edge?.method).toBe('POST');
    expect(edge?.routeTemplate).toBe('/v1/things');
    expect(edge?.evidenceClass).toBe('SOURCE_FACT');
  });

  test('a whole-segment interpolation becomes a structural route', () => {
    const edge = only('const url = `/v1/accounts/${accountId}`; baseApi.get(url);');
    expect(edge?.routeTemplate).toBe('/v1/accounts/{}');
    expect(edge?.pathClass).toBe('STRUCTURAL');
    expect(edge?.evidenceClass).toBe('SOURCE_FACT');
  });

  test('a query carrying a runtime value is stripped, and its value never persisted', () => {
    // The real ripple-ui shape: `admin/v1/aws/xacct/dca?type=${type}`.
    const edge = only('let url = `admin/v1/aws/xacct/dca?type=${type}`; blueApi.get(url);');
    expect(edge?.routeTemplate).toBe('admin/v1/aws/xacct/dca');
    expect(edge?.hasQuery).toBe(true);
    expect(edge?.pathClass).toBe('LITERAL');
    expect(JSON.stringify(edge)).not.toContain('type=');
  });

  test('a hash fragment is stripped too', () => {
    const edge = only("blueApi.get('/v1/things#section');");
    expect(edge?.routeTemplate).toBe('/v1/things');
    expect(edge?.hasHash).toBe(true);
  });

  test('all five verbs are read, and each is distinct', () => {
    const facts = readFrontendConsumers(`
      blueApi.get('/a');
      blueApi.post('/b');
      blueApi.put('/c');
      blueApi.patch('/d');
      blueApi.delete('/e');
    `, { knownInstances: INSTANCES });
    expect(facts.edges.map((edge) => edge.method)).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });
});

test.describe('C-04 — no SOURCE_FACT from a non-literal path', () => {
  test('an interpolation inside a segment is PARTIAL_SEGMENT and at most INFERENCE', () => {
    const edge = only('const url = `/v1/acc${suffix}`; blueApi.get(url);');
    expect(edge?.pathClass).toBe('PARTIAL_SEGMENT');
    expect(edge?.evidenceClass).toBe('INFERENCE');
    expect(edge?.evidenceClass).not.toBe('SOURCE_FACT');
  });

  test('concatenation with a member expression is DYNAMIC and UNKNOWN', () => {
    const edge = only("const url = base + foo.bar; blueApi.get(url);");
    expect(edge?.pathClass).toBe('DYNAMIC');
    expect(edge?.evidenceClass).toBe('UNKNOWN');
    expect(edge?.routeTemplate).toBeNull();
  });

  test('a path assembled by a call is UNKNOWN', () => {
    const edge = only("const url = buildUrl(a, b); blueApi.get(url);");
    expect(edge?.evidenceClass).toBe('UNKNOWN');
  });

  test('a path assembled in another function does not resolve across the boundary', () => {
    const edge = only(`
      function elsewhere() { const url = '/v1/leaked'; return url; }
      export function caller() { blueApi.get(url); }
    `);
    expect(edge?.evidenceClass).toBe('UNKNOWN');
    expect(edge?.routeTemplate).toBeNull();
  });

  test('an unresolved identifier argument is UNRESOLVED', () => {
    const edge = only('blueApi.get(someUnknownThing);');
    expect(edge?.pathClass).toBe('UNRESOLVED');
    expect(edge?.evidenceClass).toBe('UNKNOWN');
  });

  test('a reassigned constant does not resolve to its first value', () => {
    const edge = only("let url = '/v1/first'; url = maybe(); blueApi.get(url);");
    expect(edge?.evidenceClass).not.toBe('SOURCE_FACT');
  });

  test('an imported constant is not resolved across the module boundary', () => {
    const edge = only("import { ROUTE } from './routes'; blueApi.get(ROUTE);");
    expect(edge?.evidenceClass).toBe('UNKNOWN');
  });

  test('every non-literal class is barred from SOURCE_FACT, exhaustively', () => {
    const cases = [
      'const url = `/v1/acc${x}`; blueApi.get(url);',
      'const url = a + b; blueApi.get(url);',
      'blueApi.get(unknownThing);',
      'blueApi.get(build());',
    ];
    for (const source of cases) {
      const edge = only(source);
      expect(edge?.evidenceClass).not.toBe('SOURCE_FACT');
    }
  });
});

test.describe('C-04 — only declared clients are HTTP clients', () => {
  test('a cookie accessor is not an HTTP GET', () => {
    // 56 real `Cookies.get(...)` sites. Treating any `.get(` as HTTP would
    // have manufactured them all as edges.
    expect(edges("Cookies.get('mo_access_token');")).toEqual([]);
  });

  test('an unknown identifier is not a client', () => {
    expect(edges("somethingElse.get('/v1/things');")).toEqual([]);
  });

  test('a dynamically selected client is not resolved to one', () => {
    expect(edges("clients[which].get('/v1/things');")).toEqual([]);
  });

  test('instances are recognised from axios.create declarations', () => {
    const facts = readFrontendConsumers(`
      export const blueApi = axios.create({ baseURL: 'https://example.invalid' });
      export const baseApi = axios.create({});
    `, {});
    expect([...facts.instances].sort()).toEqual(['baseApi', 'blueApi']);
  });

  test('an identifier not bound by axios.create is not an instance', () => {
    const facts = readFrontendConsumers("const Cookies = require('js-cookie');", {});
    expect(facts.instances).toEqual([]);
  });
});

test.describe('C-04 — comments and strings never produce an edge', () => {
  test('a call in a line comment yields nothing', () => {
    expect(edges("// blueApi.get('/v1/ghost');")).toEqual([]);
  });

  test('a call in a block comment yields nothing', () => {
    expect(edges("/* blueApi.get('/v1/ghost'); */")).toEqual([]);
  });

  test('a call inside a string yields nothing', () => {
    expect(edges(`const doc = "blueApi.get('/v1/ghost')";`)).toEqual([]);
  });
});

test.describe('C-04 — route normalisation', () => {
  test('repeated slashes are normalised', () => {
    expect(only("blueApi.get('/v1//things');")?.routeTemplate).toBe('/v1/things');
  });

  test('a trailing slash is normalised away', () => {
    expect(only("blueApi.get('/v1/things/');")?.routeTemplate).toBe('/v1/things');
  });

  test('a path containing a parent traversal is rejected outright', () => {
    const edge = only("blueApi.get('/v1/../secret');");
    expect(edge?.evidenceClass).not.toBe('SOURCE_FACT');
  });

  test('a relative path keeps its shape rather than being given a false root', () => {
    // Real ripple-ui routes are written without a leading slash.
    expect(only("blueApi.get('admin/v1/thing');")?.routeTemplate).toBe('admin/v1/thing');
  });

  test('an unsafe path is rejected rather than admitted', () => {
    expect(only("blueApi.get('/v1/<script>');")?.evidenceClass).not.toBe('SOURCE_FACT');
  });
});

test.describe('C-04 — Vue SFC script extraction', () => {
  test('a script block is extracted and its calls are read', () => {
    const extraction = extractVueScripts(`
<template><div>{{ x }}</div></template>
<script>
export default {
  methods: {
    async load() { const url = '/v1/things'; await blueApi.get(url); },
  },
};
</script>
<style scoped>.a { color: red; }</style>
`);
    expect(extraction.schemaVersion).toBe(VUE_SFC_VERSION);
    expect(extraction.state).toBe('COMPLETE');
    expect(extraction.blocks).toHaveLength(1);
    expect(only(extraction.blocks[0]?.content ?? '')?.routeTemplate).toBe('/v1/things');
  });

  test('template markup never reaches the JS reader', () => {
    const extraction = extractVueScripts(`
<template><div data-x="blueApi.get('/v1/ghost')"></div></template>
<script>const a = 1;</script>
`);
    expect(extraction.blocks).toHaveLength(1);
    expect(extraction.blocks[0]?.content).not.toContain('ghost');
  });

  test('a setup script block is extracted too', () => {
    const extraction = extractVueScripts("<script setup>\nblueApi.get('/v1/s');\n</script>");
    expect(extraction.blocks).toHaveLength(1);
    expect(extraction.blocks[0]?.content).toContain('/v1/s');
  });

  test('an unterminated script block fails closed', () => {
    expect(extractVueScripts('<script>const a = 1;').state).toBe('UNTERMINATED_SCRIPT');
  });

  test('a file with no script block yields nothing and is complete', () => {
    const extraction = extractVueScripts('<template><div/></template>');
    expect(extraction.blocks).toEqual([]);
    expect(extraction.state).toBe('COMPLETE');
  });
});

test.describe('C-04 — boundedness and determinism', () => {
  test('an oversized source fails closed', () => {
    const facts = readFrontendConsumers('var x = 1;\n'.repeat(400_000), { knownInstances: INSTANCES });
    expect(facts.completeness.state).not.toBe('COMPLETE');
    expect(facts.edges).toEqual([]);
  });

  test('the same source read twice yields identical facts', () => {
    const source = "const url = '/v1/things'; blueApi.get(url);";
    expect(JSON.stringify(readFrontendConsumers(source, { knownInstances: INSTANCES })))
      .toBe(JSON.stringify(readFrontendConsumers(source, { knownInstances: INSTANCES })));
  });

  test('an empty file is complete and empty', () => {
    const facts = readFrontendConsumers('', { knownInstances: INSTANCES });
    expect(facts.edges).toEqual([]);
    expect(facts.completeness.state).toBe('COMPLETE');
  });

  test('the schema version is carried', () => {
    expect(readFrontendConsumers('', {}).schemaVersion).toBe(FRONTEND_CONSUMER_VERSION);
  });
});
