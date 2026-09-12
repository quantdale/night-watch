import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PHASE5_API_CATALOG, phase5CatalogCounts } from '../../src/api/phase5/catalog';
import { generateRestrictedScenario, materializeRelayPort, scenarioIdentity } from '../../src/api/phase5/generator';
import { parseRestrictedOopsScenario, RestrictedScenarioError } from '../../src/api/phase5/restrictedProfile';
import { evaluateApiLineage, apiOperationAffectedByChange } from '../../src/api/phase5/lineage';
import { apiFingerprint, evaluateApiResponse } from '../../src/api/phase5/oracle';
import { API_CATALOG_VERSION, OOPS_ADAPTER_VERSION, OOPS_PROFILE_VERSION, SCENARIO_GENERATOR_VERSION, type ApiCatalog, type ApiOperation } from '../../src/api/phase5/types';
import { executeNativePhase5Operation, startPhase5Relay } from '../../src/api/phase5/relay';
import { buildOOPSAllowlistedEnvironment, runRestrictedOops, sha256Executable, validateRestrictedOopsInvocationArgs } from '../../src/core/oops/process';
import { assertL6RuntimeCapability, inspectOopsSandbox, qualifyL6RuntimeCapability } from '../../src/core/oops/sandbox';
import { createEphemeralRippleApiAuthProvider } from '../../src/api/phase5/auth';
import { loadEnvironmentConfig } from '../../src/core/environment';

const SYNTHETIC_OOPS_FIXTURE = path.join(__dirname, '..', 'fixtures', 'phase5-deterministic-oops.mjs');
const SOURCE_BUILT_OOPS_SOURCE_SHA = 'c4a129feb0b97dc0ae39f32c39a92abe834567f2';

interface SelectedOopsBinary {
  readonly path: string;
  readonly sourceSHA: string;
  readonly disposition: 'SOURCE_BUILT_BINARY' | 'DETERMINISTIC_SUBSTITUTE';
  readonly cleanup: () => void;
}

function selectOopsBinary(): SelectedOopsBinary {
  const configured = process.env.NIGHTWATCH_OOPS_BINARY;
  const candidate = configured ?? path.resolve('.tmp-nightwatch/oops-build/oops');
  if (configured !== undefined || fs.existsSync(candidate)) {
    return {
      path: candidate,
      sourceSHA: SOURCE_BUILT_OOPS_SOURCE_SHA,
      disposition: 'SOURCE_BUILT_BINARY',
      cleanup: () => undefined,
    };
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase5-oops-substitute-'));
  // Keep the module extension so the fixture's ESM imports remain executable
  // when Node is launched through its shebang.
  const binary = path.join(directory, 'oops.mjs');
  fs.copyFileSync(SYNTHETIC_OOPS_FIXTURE, binary);
  fs.chmodSync(binary, 0o700);
  return {
    path: binary,
    sourceSHA: 'synthetic-phase5-oops-fixture-v1',
    disposition: 'DETERMINISTIC_SUBSTITUTE',
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
}

test('Phase 5 catalog preserves the small evidence-backed semantic frontier', () => {
  expect(phase5CatalogCounts()).toMatchObject({ inventoried: 11, KNOWN_READ: 6, KNOWN_MUTATION: 4, UNKNOWN: 1, generationEligible: 6, blocked: 5 });
  expect(PHASE5_API_CATALOG.operations.filter((operation) => operation.journeyLinks.length > 0).map((operation) => operation.operationId)).toEqual([
    'ripple.payer-exchange.read',
    'ripple.common-exchange.read',
    'ripple.account-inventory.read',
    'ripple.billing-groups.read',
    'ripple.payer-exchange.write',
    'ripple.common-exchange.write',
    'ripple.account-inventory.write',
  ]);
  expect(PHASE5_API_CATALOG.operations.find((operation) => operation.operationId === 'ripple.historical-blue-cost.unknown')?.semanticClass).toBe('UNKNOWN');
});

test('Phase 5 generation is deterministic and contains only a relay operation ID', () => {
  const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === 'ripple.payer-exchange.read');
  if (operation === undefined) throw new Error('fixture catalog operation missing');
  const first = generateRestrictedScenario(operation, PHASE5_API_CATALOG);
  const replay = generateRestrictedScenario(operation, PHASE5_API_CATALOG);
  expect(first.scenarioId).toBe(replay.scenarioId);
  expect(first.logicalYaml).toBe(replay.logicalYaml);
  expect(first.logicalYaml).toContain('http://127.0.0.1:0/v1/operations/ripple.payer-exchange.read');
  expect(first.logicalYaml).not.toContain('2026-08');
  expect(first.logicalYaml).not.toMatch(/customer|account_id|company_id|billing_group_id|token|cookie/i);
  expect(scenarioIdentity(operation)).toBe(first.scenarioId);
  const materialized = materializeRelayPort(first.logicalYaml, 39123, operation.operationId);
  expect(materialized).toContain('127.0.0.1:39123');
  expect(parseRestrictedOopsScenario(materialized, operation.operationId).run[0].http.method).toBe('GET');
});

test('durable Phase 5 corpus templates match the deterministic generator and contain no runtime identifiers', () => {
  const index = JSON.parse(fs.readFileSync(path.resolve('corpus/phase5/api-corpus-index.json'), 'utf8')) as {
    counts: { generated: number; localOopsVerified: number };
    operations: Array<{ operationId: string; scenarioId?: string; scenarioFile?: string; localStatus: string }>;
  };
  expect(index.counts).toMatchObject({ generated: 6, localOopsVerified: 6 });
  const eligible = index.operations.filter((entry) => entry.localStatus === 'GENERATED_LOCAL_ONLY');
  expect(eligible).toHaveLength(6);
  for (const entry of eligible) {
    const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === entry.operationId);
    if (operation === undefined || entry.scenarioId === undefined || entry.scenarioFile === undefined) throw new Error(`corpus entry incomplete: ${entry.operationId}`);
    const generated = generateRestrictedScenario(operation, PHASE5_API_CATALOG);
    const durableText = fs.readFileSync(path.resolve('corpus/phase5', entry.scenarioFile), 'utf8');
    const durable = parseRestrictedOopsScenario(durableText, operation.operationId);
    expect(entry.scenarioId).toBe(generated.scenarioId);
    expect(durable.tags.scenario_id).toBe(generated.scenarioId);
    expect(JSON.stringify(durable)).toBe(JSON.stringify(generated.logicalDocument));
    expect(durableText).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/i);
    expect(durableText).not.toMatch(/company_id|billing_group_id|account_id|customer|email|token|cookie|password|bearer/i);
  }
});

test('restricted OOPS parser rejects shell, preprocess, notifications, arbitrary URLs, and unsupported YAML before spawn', () => {
  const attacks = [
    '{"maintainers":["nightwatch"],"tags":{"profile":"nightwatch.oops-profile.phase5.v1","operation_id":"ripple.payer-exchange.read"},"prepare":"#!/bin/sh\necho bad","run":[]}',
    '{"maintainers":["nightwatch"],"tags":{"profile":"nightwatch.oops-profile.phase5.v1","operation_id":"ripple.payer-exchange.read"},"run":[{"http":{"method":"GET","url":"https://production.invalid/mutation","headers":{"Accept":"application/json","X-Nightwatch-Operation-Id":"ripple.payer-exchange.read"},"query_params":{},"asserts":{"status_code":200}}}]}',
    'prepare: "#!/bin/sh\\necho bad"\nrun: []\n',
  ];
  for (const attack of attacks) {
    expect(() => parseRestrictedOopsScenario(attack, 'ripple.payer-exchange.read')).toThrow(RestrictedScenarioError);
  }
  expect(() => validateRestrictedOopsInvocationArgs(['--scenarios', 'safe.yaml', '--pre-process-hook', 'bad'])).toThrow(/prohibited|restricted/i);
  expect(() => validateRestrictedOopsInvocationArgs(['--scenarios', 'safe.yaml', '--report-slack'])).toThrow(/prohibited|restricted/i);
  expect(() => validateRestrictedOopsInvocationArgs(['--scenarios', 'safe.yaml', '--pubsub'])).toThrow(/prohibited|restricted/i);
});

test('mutation and unknown operations cannot enter the generator', () => {
  for (const operationId of ['ripple.payer-exchange.write', 'ripple.historical-blue-cost.unknown']) {
    const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === operationId);
    if (operation === undefined) throw new Error(`missing ${operationId}`);
    expect(() => generateRestrictedScenario(operation, PHASE5_API_CATALOG)).toThrow(/GENERATION_BLOCKED/);
  }
});

function syntheticOperation(overrides: Partial<ApiOperation> = {}): ApiOperation {
  return {
    operationId: 'synthetic.fixture.read',
    product: 'ripple',
    service: 'fixture',
    sourceRepo: 'mobingilabs/ripple-api',
    sourceSHA: '27bb007ad0c798800b6bd3b29760c966422966e7',
    frontendCallsites: [],
    httpMethod: 'GET',
    pathTemplate: '/fixture/read',
    semanticPurpose: 'Synthetic read',
    semanticClass: 'KNOWN_READ',
    authClass: 'NONE_LOCAL_FIXTURE',
    requestSchema: { method: 'GET', pathTemplate: '/fixture/read', bodyPolicy: 'EMPTY', hydrationProfile: 'empty', runtimePlaceholders: [] },
    safeHydrationStrategy: 'empty',
    responseShapePolicy: { oracleId: 'synthetic.fixture.json', expectedContentType: 'application/json', shape: 'JSON_OBJECT_OR_ARRAY', persistBody: false, maxBytes: 1024 },
    streamingType: 'SINGLE_JSON',
    expectedContentType: 'application/json',
    requiredHostClass: 'LOCAL_LOOPBACK',
    oracleProfile: 'synthetic.fixture.json',
    replayPolicy: 'LOCAL_ONLY',
    sourceProvenance: ['synthetic'],
    journeyLinks: [],
    generationStatus: 'GENERATION_ELIGIBLE',
    ...overrides,
  };
}

test('Phase 5 metadata oracles distinguish status, content type, JSON, stream, and size without persisting bodies', () => {
  const operation = syntheticOperation();
  expect(evaluateApiResponse(operation, 200, { 'content-type': 'application/json; charset=utf-8' }, Buffer.from('{"ok":true}')).result).toBe('ORACLE_PASS');
  expect(evaluateApiResponse(operation, 200, { 'content-type': 'text/plain' }, Buffer.from('{"ok":true}')).result).toBe('CONTENT_TYPE_MISMATCH');
  expect(evaluateApiResponse(operation, 200, { 'content-type': 'application/json' }, Buffer.from('{bad')).result).toBe('JSON_PARSE_FAILURE');
  expect(evaluateApiResponse(operation, 500, { 'content-type': 'application/json' }, Buffer.from('sentinel')).result).toBe('STATUS_CLASS_MISMATCH');
  expect(evaluateApiResponse(operation, 200, { 'content-type': 'application/json' }, new Uint8Array(2 * 1024 * 1024 + 1)).result).toBe('BODY_LIMIT_EXCEEDED');
  const fingerprint = apiFingerprint({ operationId: operation.operationId, service: operation.service, oracleId: 'synthetic.fixture.json', statusClass: '2xx', contentTypeClass: 'application/json', parseCategory: 'json-valid', streamCategory: 'single-json', errorCategory: 'none', catalogVersion: API_CATALOG_VERSION });
  expect(fingerprint).toMatch(/^fp:sha256:[a-f0-9]{24}$/);
});

test('Phase 5 auth bridge reads a valid external state only into an in-memory relay header', () => {
  const environment = loadEnvironmentConfig('dev');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-phase5-auth-'));
  const statePath = path.join(directory, 'state.json');
  const sentinel = 'phase5-fake-token-never-durable';
  fs.writeFileSync(statePath, JSON.stringify({
    cookies: [
      { name: 'mo_access_token', value: sentinel, domain: 'appdev.alphaus.cloud', path: '/ripple/', secure: true, httpOnly: false, expires: -1 },
      { name: 'api_type', value: 'dev', domain: 'appdev.alphaus.cloud', path: '/ripple/', secure: true, httpOnly: false, expires: -1 },
      { name: 'app_type', value: 'alphaus', domain: 'appdev.alphaus.cloud', path: '/ripple/', secure: true, httpOnly: false, expires: -1 },
    ],
    origins: [],
  }), { mode: 0o600 });
  try {
    const provider = createEphemeralRippleApiAuthProvider(statePath, environment);
    expect(provider.metadata).toMatchObject({ provider: 'phase4-external-storage-state', persisted: false, passedToOops: false, authorizationHeaderCreatedInMemory: true });
    expect(provider.headers()).toEqual({ Authorization: `Bearer ${sentinel}` });
    expect(JSON.stringify(provider.metadata)).not.toContain(sentinel);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Phase 5 keeps the legacy namespace observation distinct from executable L6 qualification', () => {
  const status = inspectOopsSandbox();
  expect(status.schemaVersion).toBe('nightwatch.oops-sandbox-status.v2');
  expect(status.containmentLevel).toBe('L0_L5');
  expect(['PASS', 'UNAVAILABLE']).toContain(status.networkNamespaceProbe);
  expect(status.relayCompatible).toBe(false);
  expect(status.l6RuntimeIdentity).toBe('nightwatch.process-network-containment.v1');
  expect(status.l6Qualification).toBe('ON_DEMAND_EXECUTABLE_PROBE');
  expect(status.authenticatedOopsExecution).toBe('REQUIRES_L6_RUNTIME_QUALIFICATION');
  expect(status.localRestrictedExecution).toBe('ALLOWED_LOOPBACK_RELAY');
  expect(status.l6).toMatchObject({
    schemaVersion: 'nightwatch.l6-runtime-capability.v1',
    status: 'UNPROVEN',
    readiness: 'BLOCKED',
    processIsolation: 'NOT_PROVEN',
    directDnsDenial: 'NOT_PROVEN',
    directTcpDenial: 'NOT_PROVEN',
    directUdpDenial: 'NOT_PROVEN',
    syntheticRelayFlow: 'NOT_QUALIFIED',
    completeProcessIsolation: false,
    completeNetworkIsolation: false,
    blockerCode: 'L6_RUNTIME_QUALIFICATION_REQUIRED',
  });
  expect(() => assertL6RuntimeCapability(status.l6)).toThrow('L6_RUNTIME_CAPABILITY_REQUIRED');
});

test('authenticated OOPS uses the proven L6 envelope before creating its temporary workspace', async () => {
  // Topology honesty (G3.5): the capability is probed, never assumed. Where
  // the runner cannot provide the L6 envelope, the required outcome is the
  // fail-closed refusal, proven here rather than skipped.
  const sandbox = inspectOopsSandbox();
  if (sandbox.networkNamespaceProbe !== 'PASS') {
    const capability = await qualifyL6RuntimeCapability();
    expect(capability.status).not.toBe('PROVEN');
    expect(capability.readiness).not.toBe('READY');
    expect(capability.blockerCode).not.toBeNull();
    expect(() => assertL6RuntimeCapability(sandbox.l6)).toThrow('L6_RUNTIME_CAPABILITY_REQUIRED');
    return;
  }
  const selected = selectOopsBinary();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-oops-l6-block-'));
  const binary = selected.path;
  const operation = syntheticOperation({
    operationId: 'synthetic.authenticated.read',
    requiredHostClass: 'LOCAL_LOOPBACK',
    authClass: 'RELAY_EPHEMERAL_DEV_SESSION',
    sourceRepo: 'synthetic',
    sourceSHA: 'synthetic',
    sourceProvenance: ['synthetic fixture'],
  });
  const catalog: ApiCatalog = { schemaVersion: API_CATALOG_VERSION, generatedBy: SCENARIO_GENERATOR_VERSION, operations: [operation] };
  const relay = await startPhase5Relay({
    catalog,
    mode: 'local',
    targetResolver: () => new URL('http://127.0.0.1:7312/fixture'),
    fetcher: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"fixture":true}') }),
  });
  try {
    const digest = sha256Executable(binary);
    const result = await runRestrictedOops({
      binaryPath: binary,
      binarySourceSHA: 'synthetic-source-sha',
      expectedSourceSHA: 'synthetic-source-sha',
      expectedBinarySHA256: digest,
      scenario: generateRestrictedScenario(operation, catalog),
      operation,
      relay,
    });
    expect(result.outcome).toBe('SCENARIO_SUCCESS');
    expect(result.process.containment).toBe('L6_ROOTLESS_NAMESPACE');
    expect(result.workspace.cleaned).toBe(true);
  } finally {
    await relay.close();
    selected.cleanup();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('restricted OOPS binds the expected digest to an owner-controlled executable and rejects substitution paths', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-oops-provenance-'));
  const binary = path.join(directory, 'synthetic-oops');
  const link = path.join(directory, 'synthetic-oops-link');
  fs.writeFileSync(binary, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  fs.chmodSync(binary, 0o700);
  fs.symlinkSync(binary, link);
  try {
    const digest = sha256Executable(binary);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(() => sha256Executable(link)).toThrow('OOPS_BINARY_SYMLINK');
    await expect(runRestrictedOops({
      binaryPath: binary,
      binarySourceSHA: 'synthetic-source-sha',
      expectedSourceSHA: 'synthetic-source-sha',
      expectedBinarySHA256: '0'.repeat(64),
      scenario: undefined as never,
      operation: undefined as never,
      relay: undefined as never,
    })).rejects.toThrow('OOPS_BINARY_DIGEST_MISMATCH');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Phase 3 lineage marks relevant browser/client changes stale without reading customer data', () => {
  const operation = PHASE5_API_CATALOG.operations.find((candidate) => candidate.operationId === 'ripple.payer-exchange.read');
  if (operation === undefined) throw new Error('operation missing');
  expect(evaluateApiLineage(operation).staleness).toBe('FRESH');
  expect(apiOperationAffectedByChange(operation, [{ repoId: 'mobingilabs/ripple-ui', path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }])).toBe(true);
  expect(apiOperationAffectedByChange(operation, [{ repoId: 'mobingilabs/ripple-ui', path: 'src/pages/Unrelated.vue', status: 'modify' }])).toBe(false);
  expect(evaluateApiLineage(operation, [{ repoId: 'mobingilabs/ripple-api', productRole: 'test', scope: 'IN_SCOPE', checkedOutSha: '0000000000000000000000000000000000000000', trackingRef: null, sourceMapSha: '0000000000000000000000000000000000000000', readOnlyOnly: true }]).staleness).toBe('SOURCE_STALE');
});

test('restricted OOPS subprocess runs the local relay path without receiving fixture bodies or parent secrets', async () => {
  const selected = selectOopsBinary();
  const binaryPath = selected.path;
  const operation = syntheticOperation({ operationId: 'synthetic.oops.read', requiredHostClass: 'LOCAL_LOOPBACK', authClass: 'NONE_LOCAL_FIXTURE', sourceRepo: 'synthetic', sourceSHA: 'synthetic', sourceProvenance: ['synthetic fixture'] });
  const catalog: ApiCatalog = { schemaVersion: API_CATALOG_VERSION, generatedBy: SCENARIO_GENERATOR_VERSION, operations: [operation] };
  const secret = 'PARENT_SENTINEL_DO_NOT_INHERIT_9f4c';
  const safeEnvironment = buildOOPSAllowlistedEnvironment(path.resolve('.tmp-nightwatch/phase5-env-probe'));
  expect(safeEnvironment).not.toHaveProperty('NIGHTWATCH_PARENT_SENTINEL');
  const relay = await startPhase5Relay({
    catalog,
    mode: 'local',
    targetResolver: () => new URL('http://127.0.0.1:7312/fixture'),
    fetcher: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from(`{"fixture":"${secret}"}`) }),
  });
  try {
    const scenario = generateRestrictedScenario(operation, catalog);
    const native = await executeNativePhase5Operation({
      operation,
      mode: 'local',
      targetResolver: () => new URL('http://127.0.0.1:7312/fixture'),
      fetcher: async () => ({ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from(`{"fixture":"${secret}"}`) }),
    });
    const result = await runRestrictedOops({
      binaryPath,
      binarySourceSHA: selected.sourceSHA,
      expectedSourceSHA: selected.sourceSHA,
      expectedBinarySHA256: sha256Executable(binaryPath),
      scenario,
      operation,
      relay,
      parentSentinelValue: secret,
    });
    expect(result.adapterVersion).toBe(OOPS_ADAPTER_VERSION);
    expect(result.outcome).toBe('SCENARIO_SUCCESS');
    expect(result.process.exitCode).toBe(0);
    expect(result.process.shell).toBe(false);
    expect(result.relayObservation?.oracle.result).toBe('ORACLE_PASS');
    expect(native.oracle).toEqual(result.relayObservation?.oracle);
    expect(result.relayObservation?.bodyForwardedToOops).toBe(false);
    expect(result.output.secretLeakCount).toBe(0);
    expect(result.output.rawBodyDetected).toBe(false);
    expect(result.childEnvironment.parentSentinelInherited).toBe(false);
    expect(result.childEnvironment.credentialNamesPassed).toBe(0);
    expect(result.workspace.cleaned).toBe(true);
  } finally {
    await relay.close();
    selected.cleanup();
  }
});

test('restricted OOPS assertion failure remains a target/oracle result and not a process or privacy failure', async () => {
  const selected = selectOopsBinary();
  const binaryPath = selected.path;
  const operation = syntheticOperation({ operationId: 'synthetic.oops.failure', requiredHostClass: 'LOCAL_LOOPBACK', authClass: 'NONE_LOCAL_FIXTURE', sourceRepo: 'synthetic', sourceSHA: 'synthetic', sourceProvenance: ['synthetic fixture'] });
  const catalog: ApiCatalog = { schemaVersion: API_CATALOG_VERSION, generatedBy: SCENARIO_GENERATOR_VERSION, operations: [operation] };
  const secret = 'FAILURE_BODY_SENTINEL_NEVER_FORWARDED_5e7a';
  const relay = await startPhase5Relay({
    catalog,
    mode: 'local',
    targetResolver: () => new URL('http://127.0.0.1:7312/fixture'),
    fetcher: async () => ({ status: 500, headers: { 'content-type': 'application/json' }, body: Buffer.from(`{"customer":"${secret}"}`) }),
  });
  try {
    const result = await runRestrictedOops({
      binaryPath,
      binarySourceSHA: selected.sourceSHA,
      expectedSourceSHA: selected.sourceSHA,
      expectedBinarySHA256: sha256Executable(binaryPath),
      scenario: generateRestrictedScenario(operation, catalog),
      operation,
      relay,
      parentSentinelValue: secret,
    });
    expect(result.outcome).toBe('SCENARIO_ASSERTION_FAILURE');
    expect(result.process.exitCode).toBe(0);
    expect(result.relayObservation?.oracle.result).toBe('STATUS_CLASS_MISMATCH');
    expect(result.output.secretLeakCount).toBe(0);
    expect(result.output.rawBodyDetected).toBe(false);
    expect(result.workspace.cleaned).toBe(true);
  } finally {
    await relay.close();
    selected.cleanup();
  }
});

test('restricted OOPS validates every Phase 5 generated KNOWN_READ template against a loopback fixture', async () => {
  const selected = selectOopsBinary();
  const binaryPath = selected.path;
  const operations = PHASE5_API_CATALOG.operations.filter((operation) => operation.generationStatus === 'GENERATION_ELIGIBLE');
  expect(operations).toHaveLength(6);
  try {
    for (const operation of operations) {
      const localOperation: ApiOperation = {
        ...operation,
        requiredHostClass: 'LOCAL_LOOPBACK',
        authClass: 'NONE_LOCAL_FIXTURE',
      };
      const relay = await startPhase5Relay({
        catalog: PHASE5_API_CATALOG,
        mode: 'local',
        targetResolver: () => new URL('http://127.0.0.1:7312/catalog-fixture'),
        fetcher: async () => ({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: Buffer.from(operation.streamingType === 'JSON_CHUNKED' ? '{"chunk":1}\n{"chunk":2}\n' : '{"fixture":true}'),
        }),
      });
      try {
        const result = await runRestrictedOops({
          binaryPath,
          binarySourceSHA: selected.sourceSHA,
          expectedSourceSHA: selected.sourceSHA,
          expectedBinarySHA256: sha256Executable(binaryPath),
          scenario: generateRestrictedScenario(localOperation, PHASE5_API_CATALOG),
          operation: localOperation,
          relay,
        });
        expect(result.outcome, operation.operationId).toBe('SCENARIO_SUCCESS');
        expect(result.relayObservation?.oracle.result, operation.operationId).toBe('ORACLE_PASS');
        expect(result.output.secretLeakCount, operation.operationId).toBe(0);
        expect(result.output.rawBodyDetected, operation.operationId).toBe(false);
      } finally {
        await relay.close();
      }
    }
  } finally {
    selected.cleanup();
  }
});
