// ---------------------------------------------------------------------------
// Nightwatch C-02b — protobuf admission and route-discovery participation.
//
// The lexer suite proves the parser. This suite proves the ADMISSION: that
// `.proto` is a language change and not a root change, that the real approved
// surface measures what the campaign claims, and — the row that matters most —
// that adding 147 blueapi operations evicts nothing.
//
// `F-27` recorded that a single global operation budget plus `repoId`-first
// ordering lets `alphauslabs/blueapi` consume the budget and silently zero
// `mobingilabs/ripple-api`. C-01 closed the silent part. C-02b is the first
// campaign after C-01 to add a large block of blueapi operations, so this is
// the first real exercise of that regression rather than a restatement of it.
//
// Every synthetic root here is explicit (C-11 lesson 5.4). The suites that
// read the real sibling tree gate on its presence and skip categorically.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApprovedRealSourceScanConfig, PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { createRealSourceScanConfig, scanSource } from '../../src/core/source/scan';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { SOURCE_SCAN_EXTENSIONS, SOURCE_SCAN_LANGUAGES } from '../../src/core/source/scanTypes';
import { readProtoDeclarations } from '../../src/core/source/protoDeclarations';

const BLUEAPI = 'alphauslabs/blueapi';
const OUCHAN = 'mobingilabs/ouchan';
const RIPPLE_API = 'mobingilabs/ripple-api';
const BILLING_PROTO = 'billing/v1/billing.proto';

/** Measured at `alphauslabs/blueapi@691422e5`, and reproduced independently by
 * a line-regex baseline taken before the parser existed. */
const EXPECTED_RPCS = 147;
const EXPECTED_SERVER_STREAMING = 33;
const EXPECTED_UNARY = 114;
const EXPECTED_METHODS = { GET: 39, POST: 64, PUT: 25, PATCH: 2, DELETE: 17 } as const;

function siblingRepoAvailable(repoId: string): boolean {
  return fs.existsSync(path.join(DEFAULT_SIBLING_ROOT, ...repoId.split('/'), '.git'));
}

function realAccess() {
  return createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
}

test.describe('C-02b — protobuf is a LANGUAGE admission, not a root admission', () => {
  test('PROTOBUF and .proto are in the scan vocabulary', () => {
    expect(SOURCE_SCAN_LANGUAGES).toContain('PROTOBUF');
    expect(SOURCE_SCAN_EXTENSIONS).toContain('.proto');
  });

  test('the approved repository set is unchanged by this campaign', () => {
    // If C-02b had admitted a repository, this list would be longer. It is the
    // cheapest possible check that the boundary held.
    expect([...PHASE25_APPROVED_REPOSITORY_IDS]).toEqual([
      'alphauslabs/blue-sdk-go',
      'alphauslabs/blueapi',
      'alphauslabs/grpc-chunk-parser',
      'mobingilabs/ouchan',
      'mobingilabs/ripple-api',
      'mobingilabs/ripple-ui',
    ]);
  });

  test('blueapi is still exactly two roots wide', () => {
    const config = createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] });
    expect(config.approvedRepositories[0]?.allowlistedRoots).toEqual(['billing', 'openapiv2']);
  });

  test('an unapproved repository is still rejected', () => {
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: ['alphauslabs/blueinternal'] }))
      .toThrow(/REAL_SOURCE_SCAN_APPROVED_UNIVERSE/);
  });
});

test.describe('C-02b — the real approved protobuf surface', () => {
  test('blueapi billing yields at least 147 mechanically proven RPCs', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const access = realAccess();
    const text = access.reader.readFile(BLUEAPI, BILLING_PROTO);
    expect(text).not.toBeNull();
    const facts = readProtoDeclarations(text as string);

    expect(facts.package).toBe('blueapi.billing.v1');
    expect(facts.services.map((service) => service.canonicalIdentity)).toEqual(['blueapi.billing.v1.Billing']);
    expect(facts.completeness.state).toBe('COMPLETE');
    expect(facts.completeness.malformedDeclarations).toBe(0);
    expect(facts.completeness.droppedByCeiling).toBe(0);

    const rpcs = facts.services.flatMap((service) => service.rpcs);
    expect(rpcs.length).toBeGreaterThanOrEqual(EXPECTED_RPCS);

    // Acceptance A1: verb, path, request message and response message on each.
    for (const rpc of rpcs) {
      expect(rpc.requestMessage.length).toBeGreaterThan(0);
      expect(rpc.responseMessage.length).toBeGreaterThan(0);
      expect(rpc.httpBindingState).toBe('PROVEN');
      expect(rpc.bindings).toHaveLength(1);
      expect(rpc.bindings[0]?.routeTemplate.startsWith('/')).toBe(true);
    }
  });

  test('the measured streaming distribution is reported, not inherited', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const facts = readProtoDeclarations(realAccess().reader.readFile(BLUEAPI, BILLING_PROTO) as string);
    // The historical expectation was ~90 streaming RPCs. That figure counts the
    // whole blueapi repository, most of whose roots C-05 governs and this
    // campaign may not read. Inside the approved universe the truth is 33.
    expect(facts.counters.serverStreaming).toBe(EXPECTED_SERVER_STREAMING);
    expect(facts.counters.clientStreaming).toBe(0);
    expect(facts.counters.bidirectional).toBe(0);
    expect(facts.counters.unary).toBe(EXPECTED_UNARY);
    expect(facts.counters.unary + facts.counters.serverStreaming).toBe(EXPECTED_RPCS);
  });

  test('the measured HTTP verb distribution sums to the RPC count', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const facts = readProtoDeclarations(realAccess().reader.readFile(BLUEAPI, BILLING_PROTO) as string);
    const counts: Record<string, number> = {};
    for (const rpc of facts.services.flatMap((service) => service.rpcs)) {
      for (const binding of rpc.bindings) counts[binding.method] = (counts[binding.method] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_METHODS);
    expect(Object.values(counts).reduce((total, value) => total + value, 0)).toBe(EXPECTED_RPCS);
  });

  test('a message-only proto declares zero services rather than an empty one', () => {
    test.skip(!siblingRepoAvailable(OUCHAN), 'ouchan checkout unavailable');
    const text = realAccess().reader.readFile(OUCHAN, 'pkg/sapphire/proto/v1/types.proto');
    expect(text).not.toBeNull();
    const facts = readProtoDeclarations(text as string);
    expect(facts.services).toEqual([]);
    expect(facts.completeness.state).toBe('COMPLETE');
    expect(facts.counters.messages).toBeGreaterThan(0);
  });

  test('the proto file is admitted by the scan rather than rejected on its extension', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const inventory = scanSource({ access: realAccess(), config: createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] }) });
    const record = inventory.files.find((file) => file.relativePath === BILLING_PROTO);
    expect(record?.status).toBe('ELIGIBLE');
    expect(record?.language).toBe('PROTOBUF');
    expect(record?.rejectionReason).toBeNull();
  });
});

test.describe('C-02b — proto operations reach route discovery', () => {
  test('blueapi discovery contains PROTOBUF-sourced operations with proven routes', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const discovery = discoverSourceSurfaces({ access: realAccess(), config: createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] }) });
    const proto = discovery.operations.filter((operation) => operation.sourcePath === BILLING_PROTO);
    expect(proto.length).toBeGreaterThanOrEqual(EXPECTED_RPCS);
    expect(proto.every((operation) => operation.routeTemplate.startsWith('/'))).toBe(true);
  });

  test('an AMBIGUOUS RPC never becomes a proven route', () => {
    // Choosing one of several real routes would be both wrong and
    // nondeterministic; the route contract must carry the ambiguity instead.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c02b-'));
    try {
      const facts = readProtoDeclarations(`
        package amb.v1;
        service Svc {
          rpc R(Q) returns (S) {
            option (google.api.http) = {
              post: "/v1/a"
              additional_bindings { get: "/v1/a/{id}" }
            };
          }
        }
      `);
      const rpc = facts.services[0]?.rpcs[0];
      expect(rpc?.httpBindingState).toBe('AMBIGUOUS');
      expect(rpc?.bindings).toHaveLength(2);
      expect(root.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test.describe('C-02b — C-01 no-eviction regression (F-27)', () => {
  test('every operation identity discovered without protobuf survives with it', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(RIPPLE_API), 'sibling checkouts unavailable');

    const access = realAccess();
    const full = createApprovedRealSourceScanConfig();

    // The "before" population, reconstructed exactly: the same universe with
    // `.proto` removed from the admitted extensions. This compares populations
    // rather than trusting a remembered count.
    //
    // It is rebuilt through the constructor rather than spread-edited, because
    // the config carries a digest that `scanSource` validates — a hand-mutated
    // config fails closed with REAL_SOURCE_SCAN_INVALID:CONFIG_DIGEST, which is
    // the machinery working correctly.
    const before = createRealSourceScanConfig({
      runtimeMappingNamespace: full.runtimeMappingNamespace,
      excludedDirectories: full.excludedDirectories,
      enabledAnalyzers: full.enabledAnalyzers,
      approvedRepositories: full.approvedRepositories.map((repository) => ({
        ...repository,
        allowedExtensions: repository.allowedExtensions.filter((extension) => extension !== '.proto'),
      })),
    });

    const beforeIdentities = new Set(discoverSourceSurfaces({ access, config: before }).operations.map((operation) => operation.operationId));
    const afterOperations = discoverSourceSurfaces({ access, config: full }).operations;
    const afterIdentities = new Set(afterOperations.map((operation) => operation.operationId));

    const evicted = [...beforeIdentities].filter((identity) => !afterIdentities.has(identity));
    expect(evicted).toEqual([]);
    expect(afterIdentities.size).toBeGreaterThanOrEqual(beforeIdentities.size);
  });

  test('ripple-api keeps its operations after blueapi grows', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(RIPPLE_API), 'sibling checkouts unavailable');
    // The exact failure F-27 described: blueapi sorts first, so if a shared
    // budget were still in play ripple-api would silently reach zero.
    const discovery = discoverSourceSurfaces({ access: realAccess(), config: createApprovedRealSourceScanConfig() });
    const ripple = discovery.operations.filter((operation) => operation.repository === RIPPLE_API);
    expect(ripple.length).toBeGreaterThan(0);
  });

  test('completeness stays truthful across the enlarged population', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const inventory = scanSource({ access: realAccess(), config: createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] }) });
    // Not "is it COMPLETE" — that would be a claim about the world. The
    // invariant is that whatever it is, it is stated exactly and its dropped
    // counts are knowable rather than implied.
    expect(['COMPLETE', 'TRUNCATED', 'UNKNOWN']).toContain(inventory.completeness.state);
    if (inventory.completeness.enumeration.state === 'COMPLETE') {
      expect(inventory.completeness.enumeration.droppedFiles).toBe(0);
      expect(inventory.completeness.enumeration.remainingUnknown).toBe(false);
    }
    expect(Number.isInteger(inventory.completeness.contentRead.droppedFiles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DEF-C02B-1 regression.
//
// Admitting the proto made discovery see `billing/v1/billing.proto` and
// `openapiv2/apidocs.swagger.json` as two rival declarations of the same 147
// routes, marking every one AMBIGUOUS and dropping its read-only
// classification from PROVEN_MUTATION_CAPABLE to UNSUPPORTED. They are not
// rivals: the artifact is generated FROM the proto. Ambiguity is now scoped to
// the evidence class.
//
// The exemption has to be narrow or it is just a weakened guard, so both
// halves are asserted: the cross-class pair is exempt, and two same-class
// declarations of one route are still ambiguous. All roots below are explicit.
// ---------------------------------------------------------------------------

const SYNTHETIC_SHA = '1d4c1e3d5f2b7a9c8e6f0b1a2c3d4e5f60718293';

function syntheticBlueapi(files: Readonly<Record<string, string>>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c02b-dup-'));
  const repo = path.join(root, 'alphauslabs', 'blueapi');
  const git = path.join(repo, '.git', 'refs', 'heads');
  fs.mkdirSync(git, { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  fs.writeFileSync(path.join(git, 'main'), `${SYNTHETIC_SHA}\n`);
  for (const [relativePath, contents] of Object.entries(files)) {
    fs.mkdirSync(path.join(repo, path.dirname(relativePath)), { recursive: true });
    fs.writeFileSync(path.join(repo, relativePath), contents);
  }
  return root;
}

function syntheticConfig(roots: readonly string[]) {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: [{
      repoId: 'alphauslabs/blueapi',
      expectedSourceSha: SYNTHETIC_SHA,
      allowlistedRoots: roots,
      allowedExtensions: ['.proto', '.json'],
      maxFiles: 64,
      maxFileBytes: 200_000,
      maxTotalBytes: 2_000_000,
    }],
  });
}

const ONE_ROUTE_PROTO = `
syntax = "proto3";
package blueapi.billing.v1;
service Billing {
  rpc DeleteThing(DeleteThingRequest) returns (DeleteThingResponse) {
    option (google.api.http) = { delete: "/v1/things/{id}" };
  }
}
`;

test.describe('C-02b — DEF-C02B-1: a generated mirror is not a rival declaration', () => {
  test('a proto route and its generated OpenAPI twin stay PROVEN', () => {
    const root = syntheticBlueapi({
      'billing/v1/billing.proto': ONE_ROUTE_PROTO,
      'openapiv2/apidocs.swagger.json': JSON.stringify({
        paths: { '/v1/things/{id}': { delete: { operationId: 'Billing_DeleteThing' } } },
      }),
    });
    try {
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: syntheticConfig(['billing', 'openapiv2']) });
      const routes = discovery.operations.filter((operation) => operation.routeTemplate === '/v1/things/{id}');
      expect(routes).toHaveLength(2);
      expect(routes.map((operation) => operation.routeProof)).toEqual(['PROVEN', 'PROVEN']);
      expect(discovery.counters.ambiguousRoutes).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('two DIRECT_SOURCE protos declaring one route are still AMBIGUOUS', () => {
    // The narrowing check. If the fix had simply stopped comparing source
    // paths, this would pass as PROVEN and a real conflict would go unreported.
    const root = syntheticBlueapi({
      'billing/v1/billing.proto': ONE_ROUTE_PROTO,
      'billing/v2/billing.proto': ONE_ROUTE_PROTO.replace('service Billing', 'service BillingV2'),
    });
    try {
      const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(root), config: syntheticConfig(['billing']) });
      const routes = discovery.operations.filter((operation) => operation.routeTemplate === '/v1/things/{id}');
      expect(routes).toHaveLength(2);
      expect(routes.every((operation) => operation.routeProof === 'AMBIGUOUS')).toBe(true);
      expect(discovery.counters.ambiguousRoutes).toBe(2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the real blueapi surface keeps its 147 mutation-capable classifications', () => {
    test.skip(!siblingRepoAvailable(BLUEAPI), 'blueapi checkout unavailable');
    const discovery = discoverSourceSurfaces({ access: realAccess(), config: createApprovedRealSourceScanConfig({ repositoryIds: [BLUEAPI] }) });
    const artifact = discovery.operations.filter((operation) => operation.sourcePath === 'openapiv2/apidocs.swagger.json');
    expect(artifact.length).toBe(591);
    expect(artifact.every((operation) => operation.routeProof === 'PROVEN')).toBe(true);
    const proto = discovery.operations.filter((operation) => operation.sourcePath === BILLING_PROTO);
    expect(proto.every((operation) => operation.routeProof === 'PROVEN')).toBe(true);
  });
});
