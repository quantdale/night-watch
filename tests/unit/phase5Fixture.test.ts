import { test, expect } from '@playwright/test';
import { executeNativePhase5Operation, startPhase5Relay, type RelayFetchResponse } from '../../src/api/phase5/relay';
import { API_CATALOG_VERSION, SCENARIO_GENERATOR_VERSION, type ApiCatalog, type ApiOperation } from '../../src/api/phase5/types';

const SOURCE_SHA = 'synthetic';

function fixtureOperation(id: string, shape: 'JSON_OBJECT_OR_ARRAY' | 'JSON_CHUNKS' | 'EMPTY' = 'JSON_OBJECT_OR_ARRAY'): ApiOperation {
  const expectedContentType = shape === 'EMPTY' ? 'empty' : 'application/json';
  return {
    operationId: id,
    product: 'ripple',
    service: 'phase5-fixture',
    sourceRepo: 'synthetic',
    sourceSHA: SOURCE_SHA,
    frontendCallsites: [],
    httpMethod: 'GET',
    pathTemplate: `/fixture/${id}`,
    semanticPurpose: 'Synthetic local fixture contract',
    semanticClass: 'KNOWN_READ',
    authClass: 'NONE_LOCAL_FIXTURE',
    requestSchema: { method: 'GET', pathTemplate: `/fixture/${id}`, bodyPolicy: 'EMPTY', hydrationProfile: 'empty', runtimePlaceholders: [] },
    safeHydrationStrategy: 'empty',
    responseShapePolicy: { oracleId: `${id}.oracle`, expectedContentType, shape, persistBody: false, maxBytes: 2 * 1024 * 1024 },
    streamingType: shape === 'JSON_CHUNKS' ? 'JSON_CHUNKED' : shape === 'EMPTY' ? 'EMPTY_OR_204' : 'SINGLE_JSON',
    expectedContentType,
    requiredHostClass: 'LOCAL_LOOPBACK',
    oracleProfile: `${id}.oracle`,
    replayPolicy: 'LOCAL_ONLY',
    sourceProvenance: ['synthetic fixture'],
    journeyLinks: [],
    generationStatus: 'GENERATION_ELIGIBLE',
  };
}

function catalog(operation: ApiOperation): ApiCatalog {
  return { schemaVersion: API_CATALOG_VERSION, generatedBy: SCENARIO_GENERATOR_VERSION, operations: [operation] };
}

async function runFixture(operation: ApiOperation, responseOrFactory: RelayFetchResponse | (() => Promise<RelayFetchResponse>), timeoutMs = 100): Promise<{ native: Awaited<ReturnType<typeof executeNativePhase5Operation>>; relay: Awaited<ReturnType<typeof startPhase5Relay>>; relayHttpStatus: number }> {
  const responder = typeof responseOrFactory === 'function' ? responseOrFactory : async () => responseOrFactory;
  const targetResolver = () => new URL('http://127.0.0.1:7312/fixture');
  const native = await executeNativePhase5Operation({ operation, mode: 'local', targetResolver, fetcher: responder, upstreamTimeoutMs: timeoutMs });
  const relay = await startPhase5Relay({ catalog: catalog(operation), mode: 'local', targetResolver, fetcher: responder, upstreamTimeoutMs: timeoutMs });
  const response = await fetch(`${relay.address}/v1/operations/${operation.operationId}`, {
    headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': operation.operationId },
  });
  return { native, relay, relayHttpStatus: response.status };
}

test('local Phase 5 fixture matrix keeps bodies in memory and classifies protocol cases', async () => {
  const cases: Array<{ name: string; operation: ApiOperation; response: RelayFetchResponse | (() => Promise<RelayFetchResponse>); expected: string; httpStatus?: number }> = [
    { name: '200 JSON', operation: fixtureOperation('synthetic.matrix.json'), response: { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"ok":true}') }, expected: 'ORACLE_PASS' },
    { name: '200 JSON chunks', operation: fixtureOperation('synthetic.matrix.chunks', 'JSON_CHUNKS'), response: { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"chunk":1}\n{"chunk":2}\n') }, expected: 'ORACLE_PASS' },
    { name: '204', operation: fixtureOperation('synthetic.matrix.empty', 'EMPTY'), response: { status: 204, headers: {}, body: new Uint8Array() }, expected: 'ORACLE_PASS' },
    { name: '404', operation: fixtureOperation('synthetic.matrix.404'), response: { status: 404, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"not":"persisted"}') }, expected: 'STATUS_CLASS_MISMATCH' },
    { name: '500', operation: fixtureOperation('synthetic.matrix.500'), response: { status: 500, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"not":"persisted"}') }, expected: 'STATUS_CLASS_MISMATCH' },
    { name: 'wrong content type', operation: fixtureOperation('synthetic.matrix.type'), response: { status: 200, headers: { 'content-type': 'text/plain' }, body: Buffer.from('{"ok":true}') }, expected: 'CONTENT_TYPE_MISMATCH' },
    { name: 'malformed JSON', operation: fixtureOperation('synthetic.matrix.malformed'), response: { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{invalid') }, expected: 'JSON_PARSE_FAILURE' },
    { name: 'slow response', operation: fixtureOperation('synthetic.matrix.slow'), response: async () => { await new Promise((resolve) => setTimeout(resolve, 250)); return { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') }; }, expected: 'NETWORK_FAILURE', httpStatus: 502 },
    { name: 'connection close', operation: fixtureOperation('synthetic.matrix.close'), response: async () => { throw new Error('synthetic connection close'); }, expected: 'NETWORK_FAILURE', httpStatus: 502 },
    { name: 'large response metadata', operation: fixtureOperation('synthetic.matrix.large'), response: { status: 200, headers: { 'content-type': 'application/json' }, body: new Uint8Array(2 * 1024 * 1024 + 1) }, expected: 'BODY_LIMIT_EXCEEDED' },
  ];
  for (const item of cases) {
    const result = await runFixture(item.operation, item.response, item.name === 'slow response' ? 25 : 100);
    expect(result.native.oracle.result, item.name).toBe(item.expected);
    expect(result.native.oracle.bodyPersisted, item.name).toBe(false);
    expect(result.relay.takeObservation(item.operation.operationId)?.oracle.result, item.name).toBe(item.expected);
    expect(result.relay.takeObservation(item.operation.operationId)?.bodyForwardedToOops, item.name).toBe(false);
    if (item.httpStatus !== undefined) expect(result.relayHttpStatus, item.name).toBe(item.httpStatus);
    await result.relay.close();
  }
});

test('loopback redirect policy approves same-origin fixture redirects and blocks external/production redirects', async () => {
  const approved = fixtureOperation('synthetic.redirect.approved');
  let approvedCalls = 0;
  const approvedResult = await runFixture(approved, async () => {
    approvedCalls += 1;
    return approvedCalls % 2 === 1
      ? { status: 302, headers: { location: 'http://127.0.0.1:7312/fixture/synthetic.redirect.approved' }, body: new Uint8Array() }
      : { status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') };
  });
  expect(approvedResult.native.redirect).toBe('APPROVED_SAME_ORIGIN');
  expect(approvedResult.native.oracle.result).toBe('ORACLE_PASS');
  expect(approvedResult.relay.takeObservation(approved.operationId)?.redirect).toBe('APPROVED_SAME_ORIGIN');
  await approvedResult.relay.close();

  const blocked = fixtureOperation('synthetic.redirect.blocked');
  const blockedResult = await runFixture(blocked, { status: 302, headers: { location: 'https://api.alphaus.cloud/m/prod' }, body: new Uint8Array() });
  expect(blockedResult.native.redirect).toBe('BLOCKED');
  expect(blockedResult.native.safetyBlock).toBe('UNKNOWN_DESTINATION');
  expect(blockedResult.relay.takeObservation(blocked.operationId)?.safetyBlock).toBe('UNKNOWN_DESTINATION');
  expect(blockedResult.relayHttpStatus).toBe(502);
  await blockedResult.relay.close();
});

test('relay rejects unknown operations, mutation operation IDs, mismatched IDs, and arbitrary query URLs', async () => {
  const read = fixtureOperation('synthetic.reject.read');
  const mutation = { ...fixtureOperation('synthetic.reject.mutation'), semanticClass: 'KNOWN_MUTATION' as const, generationStatus: 'GENERATION_BLOCKED' as const };
  const relay = await startPhase5Relay({ catalog: { ...catalog(read), operations: [read, mutation] }, mode: 'local', targetResolver: () => new URL('http://127.0.0.1:7312/fixture'), fetcher: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{}') }) });
  try {
    const unknown = await fetch(`${relay.address}/v1/operations/synthetic.unknown`, { headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': 'synthetic.unknown' } });
    expect(unknown.status).toBe(403);
    const mutationResponse = await fetch(`${relay.address}/v1/operations/${mutation.operationId}`, { headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': mutation.operationId } });
    expect(mutationResponse.status).toBe(403);
    const mismatch = await fetch(`${relay.address}/v1/operations/${read.operationId}`, { headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': mutation.operationId } });
    expect(mismatch.status).toBe(403);
    const arbitrary = await fetch(`${relay.address}/v1/operations/${read.operationId}?url=https://api.alphaus.cloud`, { headers: { Accept: 'application/json', 'X-Nightwatch-Operation-Id': read.operationId } });
    expect(arbitrary.status).toBe(403);
    expect(relay.violations).toEqual(expect.arrayContaining(['UNKNOWN_OPERATION', 'KNOWN_MUTATION', 'OPERATION_MISMATCH', 'UNSAFE_INBOUND_HEADER']));
  } finally {
    await relay.close();
  }
});
