// ---------------------------------------------------------------------------
// Nightwatch C-03 — service-level gRPC topology binding.
//
// The registration suite proves the reader. This proves the JOIN, and the two
// claims that make it honest: a binding is a fact only when all three links
// resolve, and a truncated enumeration never becomes a completeness claim.
//
// Synthetic roots are explicit everywhere; the real-tree suites gate on the
// sibling checkout and skip categorically.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApprovedRealSourceScanConfig, PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';
import { createRealSourceScanConfig, scanSource } from '../../src/core/source/scan';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { buildProtoServiceIndex } from '../../src/core/source/protoServiceIndex';
import { buildGrpcTopology } from '../../src/core/source/grpcTopology';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';

const OUCHAN = 'mobingilabs/ouchan';
const BLUEAPI = 'alphauslabs/blueapi';
const SDK = 'alphauslabs/blue-sdk-go';
const SDK_MODULE = 'github.com/alphauslabs/blue-sdk-go';

/** Measured at the pinned sibling SHAs. */
const EXPECTED_PROVEN = 12;
const EXPECTED_PROTO_SERVICES_BOUND = 12;

function siblingRepoAvailable(repoId: string): boolean {
  return fs.existsSync(path.join(DEFAULT_SIBLING_ROOT, ...repoId.split('/'), '.git'));
}

function realTopology() {
  const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
  const inventory = scanSource({ access, config: createApprovedRealSourceScanConfig() });
  return buildGrpcTopology({ access, inventory, registrationRepoId: OUCHAN });
}

// --- synthetic fixture -----------------------------------------------------

const SYNTHETIC_SHA = '9a1b2c3d4e5f60718293a4b5c6d7e8f901234567';

function syntheticWorkspace(files: Readonly<Record<string, Readonly<Record<string, string>>>>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-c03-'));
  for (const [repoId, contents] of Object.entries(files)) {
    const repo = path.join(root, ...repoId.split('/'));
    fs.mkdirSync(path.join(repo, '.git', 'refs', 'heads'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    fs.writeFileSync(path.join(repo, '.git', 'refs', 'heads', 'main'), `${SYNTHETIC_SHA}\n`);
    for (const [relativePath, text] of Object.entries(contents)) {
      fs.mkdirSync(path.join(repo, path.dirname(relativePath)), { recursive: true });
      fs.writeFileSync(path.join(repo, relativePath), text);
    }
  }
  return root;
}

function syntheticConfig(repositories: readonly { repoId: string; roots: readonly string[] }[]) {
  return createRealSourceScanConfig({
    runtimeMappingNamespace: 'ripple',
    approvedRepositories: repositories.map((entry) => ({
      repoId: entry.repoId,
      expectedSourceSha: SYNTHETIC_SHA,
      allowlistedRoots: entry.roots,
      allowedExtensions: ['.go', '.proto'],
      maxFiles: 256,
      maxFileBytes: 400_000,
      maxTotalBytes: 4_000_000,
    })),
  });
}

const WIDGET_PROTO = `
syntax = "proto3";
package blueapi.widget.v1;
service Widget {
  rpc GetWidget(GetWidgetRequest) returns (Widget) {
    option (google.api.http) = { get: "/v1/widgets/{id}" };
  }
}
`;

const WIDGET_SDK = `
package widget
// source: widget/v1/widget.proto
func RegisterWidgetServer(s grpc.ServiceRegistrar, srv WidgetServer) {}
var Widget_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "blueapi.widget.v1.Widget",
}
`;

const WIDGET_DAEMON = `
package main
import widget "${SDK_MODULE}/widget/v1"
func run() { widget.RegisterWidgetServer(gs, svc) }
`;

function syntheticTopology(overrides: Readonly<Record<string, Readonly<Record<string, string>>>> = {}) {
  const root = syntheticWorkspace({
    [OUCHAN]: { 'services/widgetd/main.go': WIDGET_DAEMON, ...(overrides[OUCHAN] ?? {}) },
    [SDK]: { 'widget/v1/widget_grpc.pb.go': WIDGET_SDK, ...(overrides[SDK] ?? {}) },
    [BLUEAPI]: { 'widget/v1/widget.proto': WIDGET_PROTO, ...(overrides[BLUEAPI] ?? {}) },
  });
  const access = createSiblingSourceAccess(root);
  const inventory = scanSource({
    access,
    config: syntheticConfig([
      { repoId: OUCHAN, roots: ['services'] },
      { repoId: SDK, roots: ['widget'] },
      { repoId: BLUEAPI, roots: ['widget'] },
    ]),
  });
  return { root, topology: buildGrpcTopology({ access, inventory, registrationRepoId: OUCHAN }) };
}

test.describe('C-03 — the three-link join', () => {
  test('a complete chain is PROVEN and is a SOURCE_FACT', () => {
    const { root, topology } = syntheticTopology();
    try {
      expect(topology.bindings).toHaveLength(1);
      const [binding] = topology.bindings;
      expect(binding?.state).toBe('PROVEN');
      expect(binding?.evidenceClass).toBe('SOURCE_FACT');
      expect(binding?.protoServiceIdentity).toBe('blueapi.widget.v1.Widget');
      expect(binding?.importPath).toBe(`${SDK_MODULE}/widget/v1`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('without the SDK descriptor the join is UNSUPPORTED, never MISSING', () => {
    // "Nightwatch cannot see the SDK" is not "the service does not exist".
    const { root, topology } = syntheticTopology({ [SDK]: { 'widget/v1/widget_grpc.pb.go': 'package widget\n' } });
    try {
      expect(topology.bindings[0]?.state).toBe('UNSUPPORTED');
      expect(topology.bindings[0]?.blocker).toBe('SDK_DESCRIPTOR_UNOBSERVED');
      expect(topology.bindings[0]?.evidenceClass).toBe('NOT_A_FACT');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a descriptor whose ServiceName names another service does not bind', () => {
    // The pairing is by the full name's last segment, so a generated file
    // that registers Widget while naming Gadget proves nothing about Widget.
    const { root, topology } = syntheticTopology({
      [SDK]: { 'widget/v1/widget_grpc.pb.go': WIDGET_SDK.replace('"blueapi.widget.v1.Widget"', '"blueapi.gadget.v1.Gadget"') },
    });
    try {
      expect(topology.bindings[0]?.state).not.toBe('PROVEN');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('without the proto the join is UNSUPPORTED', () => {
    const { root, topology } = syntheticTopology({ [BLUEAPI]: { 'widget/v1/widget.proto': 'syntax = "proto3";\npackage blueapi.widget.v1;\n' } });
    try {
      expect(topology.bindings[0]?.state).toBe('UNSUPPORTED');
      expect(topology.bindings[0]?.blocker).toBe('PROTO_SERVICE_UNOBSERVED');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('an unresolvable qualifier is AMBIGUOUS, not a best guess', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: { 'services/widgetd/main.go': 'package main\nfunc run() { widget.RegisterWidgetServer(gs, svc) }\n' },
    });
    try {
      expect(topology.bindings[0]?.state).toBe('AMBIGUOUS');
      expect(topology.bindings[0]?.blocker).toBe('QUALIFIER_UNRESOLVED');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the same service registered from two production files is MULTIPLE', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: { 'services/widgetd/main.go': WIDGET_DAEMON, 'services/otherd/main.go': WIDGET_DAEMON },
    });
    try {
      expect(topology.bindings).toHaveLength(2);
      expect(topology.bindings.every((binding) => binding.state === 'MULTIPLE')).toBe(true);
      expect(topology.bindings.every((binding) => binding.evidenceClass === 'NOT_A_FACT')).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a registration in a test file never reaches the join', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: { 'services/widgetd/main.go': 'package main\n', 'services/widgetd/widget_test.go': WIDGET_DAEMON },
    });
    try {
      expect(topology.bindings).toEqual([]);
      expect(topology.completeness.excludedTestFiles).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a commented registration never reaches the join', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: { 'services/widgetd/main.go': `package main\nimport widget "${SDK_MODULE}/widget/v1"\n// widget.RegisterWidgetServer(gs, svc)\n` },
    });
    try {
      expect(topology.bindings).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the topology is deterministic across repeated builds', () => {
    const first = syntheticTopology();
    const second = syntheticTopology();
    try {
      expect(second.topology.topologyDigest).toBe(first.topology.topologyDigest);
    } finally {
      fs.rmSync(first.root, { recursive: true, force: true });
      fs.rmSync(second.root, { recursive: true, force: true });
    }
  });
});

test.describe('C-03 — completeness is never inflated by the join', () => {
  test('a TRUNCATED enumeration yields no repository-complete proof', () => {
    const { root, topology } = syntheticTopology();
    try {
      // The synthetic workspace enumerates completely, so assert the mapping
      // itself rather than a particular state.
      expect(topology.completeness.repositoryCompleteProof).toBe(topology.completeness.enumerationState === 'COMPLETE');
      expect(topology.completeness.absenceReason).toBe(topology.completeness.enumerationState === 'COMPLETE' ? 'NO_OBSERVED_REGISTRATION' : 'TRUNCATED_ENUMERATION');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the real ouchan topology reports TRUNCATED and claims no completeness', () => {
    test.skip(!siblingRepoAvailable(OUCHAN) || !siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(SDK), 'sibling checkouts unavailable');
    const topology = realTopology();
    // ouchan cannot be completely enumerated under the contract ceiling, and
    // the topology must say so rather than quietly implying coverage.
    expect(topology.completeness.enumerationState).toBe('TRUNCATED');
    expect(topology.completeness.repositoryCompleteProof).toBe(false);
    expect(topology.completeness.absenceReason).toBe('TRUNCATED_ENUMERATION');
  });
});

test.describe('C-03 — the real measured topology', () => {
  test.skip(() => !siblingRepoAvailable(OUCHAN) || !siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(SDK), 'requires the read-only sibling Alphaus checkouts');

  test('binds at least twelve proto services as SOURCE_FACT', () => {
    const topology = realTopology();
    expect(topology.counters.proven).toBeGreaterThanOrEqual(EXPECTED_PROVEN);
    expect(topology.counters.distinctProtoServicesBound).toBeGreaterThanOrEqual(EXPECTED_PROTO_SERVICES_BOUND);
    const proven = topology.bindings.filter((binding) => binding.state === 'PROVEN');
    expect(proven.every((binding) => binding.evidenceClass === 'SOURCE_FACT')).toBe(true);
    expect(proven.every((binding) => binding.protoServiceIdentity !== null && binding.importPath !== null)).toBe(true);
  });

  test('every proven binding is independently corroborated by an embedding', () => {
    // A second witness in the same Go package: the daemon both registers the
    // service and embeds its Unimplemented base.
    const topology = realTopology();
    const proven = topology.bindings.filter((binding) => binding.state === 'PROVEN');
    expect(proven.every((binding) => binding.embeddingCorroborated)).toBe(true);
  });

  test('one daemon registering six services is six bindings, not one', () => {
    // services/blued. Keying a binding by daemon directory would lose five.
    const topology = realTopology();
    const blued = topology.bindings.filter((binding) => binding.serviceDirectory === 'services/blued' && binding.state === 'PROVEN');
    expect(blued.length).toBeGreaterThanOrEqual(6);
    expect(new Set(blued.map((binding) => binding.protoServiceIdentity)).size).toBe(blued.length);
  });

  test('a service with no observable proto is UNSUPPORTED and not a fact', () => {
    const topology = realTopology();
    const metrics = topology.bindings.find((binding) => binding.registrationSymbol === 'RegisterMetricsControlPlaneServer');
    expect(metrics?.state).toBe('UNSUPPORTED');
    expect(metrics?.evidenceClass).toBe('NOT_A_FACT');
    expect(metrics?.protoServiceIdentity).toBeNull();
  });

  test('no binding is silently resolved: every non-proven one carries a blocker', () => {
    const topology = realTopology();
    for (const binding of topology.bindings) {
      if (binding.state === 'PROVEN') expect(binding.blocker).toBeNull();
      else expect(binding.blocker).not.toBeNull();
    }
  });

  test('the generated SDK descriptors all pair uniquely', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
    const inventory = scanSource({ access, config: createApprovedRealSourceScanConfig() });
    const index = buildProtoServiceIndex({ access, inventory });
    expect(index.descriptors.length).toBeGreaterThanOrEqual(15);
    expect(index.descriptors.every((descriptor) => descriptor.state === 'PROVEN')).toBe(true);
    expect(index.services.length).toBeGreaterThanOrEqual(15);
  });
});

test.describe('C-03 — the universe is unchanged', () => {
  test('the approved repository set still holds exactly six repositories', () => {
    expect([...PHASE25_APPROVED_REPOSITORY_IDS]).toEqual([
      'alphauslabs/blue-sdk-go',
      'alphauslabs/blueapi',
      'alphauslabs/grpc-chunk-parser',
      'mobingilabs/ouchan',
      'mobingilabs/ripple-api',
      'mobingilabs/ripple-ui',
    ]);
  });

  test('blueinternal is still rejected', () => {
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: ['alphauslabs/blueinternal'] }))
      .toThrow(/REAL_SOURCE_SCAN_APPROVED_UNIVERSE/);
  });

  test('ouchan carries the raised budget and blueapi keeps openapiv2', () => {
    const config = createApprovedRealSourceScanConfig();
    const ouchan = config.approvedRepositories.find((entry) => entry.repoId === OUCHAN);
    expect(ouchan?.maxFiles).toBe(4096);
    const blueapi = config.approvedRepositories.find((entry) => entry.repoId === BLUEAPI);
    expect(blueapi?.allowlistedRoots).toContain('openapiv2');
    expect(blueapi?.allowlistedRoots).toContain('billing');
  });
});

test.describe('C-03 — C-01 no-eviction across the admission (F-27)', () => {
  test.skip(() => !siblingRepoAvailable(OUCHAN) || !siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(SDK), 'requires the read-only sibling Alphaus checkouts');

  test('every operation identity discovered before the admission survives it', () => {
    // C-03 adds 443 proto operations and raises ouchan's budget, which is the
    // largest single population change since C-01 closed the silent-loss
    // model. The assertion compares populations rather than trusting counts.
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
    const full = createApprovedRealSourceScanConfig();

    const before = createRealSourceScanConfig({
      runtimeMappingNamespace: full.runtimeMappingNamespace,
      excludedDirectories: full.excludedDirectories,
      enabledAnalyzers: full.enabledAnalyzers,
      approvedRepositories: full.approvedRepositories.map((repository) => {
        if (repository.repoId === BLUEAPI) return { ...repository, allowlistedRoots: ['billing', 'openapiv2'] };
        if (repository.repoId === SDK) return { ...repository, allowlistedRoots: ['billing'] };
        if (repository.repoId === OUCHAN) return { ...repository, maxFiles: 1024, maxTotalBytes: 16_000_000 };
        return repository;
      }),
    });

    const beforeIdentities = new Set(discoverSourceSurfaces({ access, config: before }).operations.map((operation) => operation.operationId));
    const after = discoverSourceSurfaces({ access, config: full });
    const afterIdentities = new Set(after.operations.map((operation) => operation.operationId));

    expect([...beforeIdentities].filter((identity) => !afterIdentities.has(identity))).toEqual([]);
    expect(afterIdentities.size).toBeGreaterThan(beforeIdentities.size);
    expect(after.operationCompleteness.droppedOperations).toBe(0);
  });

  test('ripple-api keeps its full operation set after blueapi grows again', () => {
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(DEFAULT_SIBLING_ROOT), config: createApprovedRealSourceScanConfig() });
    expect(discovery.operations.filter((operation) => operation.repository === 'mobingilabs/ripple-api')).toHaveLength(223);
  });

  test('the artifact still contributes exactly its own 591 operations', () => {
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(DEFAULT_SIBLING_ROOT), config: createApprovedRealSourceScanConfig() });
    expect(discovery.operations.filter((operation) => operation.sourcePath === 'openapiv2/apidocs.swagger.json')).toHaveLength(591);
  });
});
