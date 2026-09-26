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
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { buildProtoServiceIndex } from '../../src/core/source/protoServiceIndex';
import { buildGrpcTopology } from '../../src/core/source/grpcTopology';
import { discoverSourceSurfaces } from '../../src/core/source/surfaces';
import { classifyLiveSourceTestState, liveSourceTestRoot } from '../helpers/liveSourceTestAuthority';

const OUCHAN = 'mobingilabs/ouchan';
const BLUEAPI = 'alphauslabs/blueapi';
const SDK = 'alphauslabs/blue-sdk-go';
const SDK_MODULE = 'github.com/alphauslabs/blue-sdk-go';
const RIPPLE_API = 'mobingilabs/ripple-api';
const RIPPLE_LIVE_STATE = classifyLiveSourceTestState({ repositoryIds: [RIPPLE_API] });
const NO_EVICTION_LIVE_STATE = classifyLiveSourceTestState({ repositoryIds: [OUCHAN, BLUEAPI, RIPPLE_API] });

/** Measured at the pinned sibling SHAs. */
const EXPECTED_PROVEN = 12;
const EXPECTED_PROTO_SERVICES_BOUND = 12;

function siblingRepoAvailable(repoId: string): boolean {
  return fs.existsSync(path.join(liveSourceTestRoot(), ...repoId.split('/'), '.git'));
}

function realTopology() {
  const access = createSiblingSourceAccess(liveSourceTestRoot());
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
    const access = createSiblingSourceAccess(liveSourceTestRoot());
    const inventory = scanSource({ access, config: createApprovedRealSourceScanConfig() });
    const index = buildProtoServiceIndex({ access, inventory });
    expect(index.descriptors.length).toBeGreaterThanOrEqual(15);
    expect(index.descriptors.every((descriptor) => descriptor.state === 'PROVEN')).toBe(true);
    expect(index.services.length).toBeGreaterThanOrEqual(15);
  });
});

test.describe('C-03 — the universe is unchanged', () => {
  test('the six repositories C-03 inherited are all still admitted', () => {
    // Equality against the universe of the day defends "C-03 admitted nothing"
    // by asserting nobody ever admits anything, so it broke when C-05 admitted
    // two under explicit owner authorization. Containment is the real property.
    for (const repoId of [
      'alphauslabs/blue-sdk-go',
      'alphauslabs/blueapi',
      'alphauslabs/grpc-chunk-parser',
      'mobingilabs/ouchan',
      'mobingilabs/ripple-api',
      'mobingilabs/ripple-ui',
    ]) {
      expect(PHASE25_APPROVED_REPOSITORY_IDS).toContain(repoId);
    }
  });

  test('an unapproved repository is still rejected', () => {
    // Was `blueinternal`, which C-05 admitted; the property needs a repository
    // that is genuinely unapproved.
    expect(() => createApprovedRealSourceScanConfig({ repositoryIds: ['alphauslabs/blue'] }))
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

  test('every operation identity discovered before the admission survives it', () => {
    test.skip(NO_EVICTION_LIVE_STATE.kind !== 'CURRENT', `LIVE_SOURCE_${NO_EVICTION_LIVE_STATE.kind}`);
    // C-03 adds 443 proto operations and raises ouchan's budget, which is the
    // largest single population change since C-01 closed the silent-loss
    // model. The assertion compares populations rather than trusting counts.
    const access = createSiblingSourceAccess(liveSourceTestRoot());
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
    test.skip(NO_EVICTION_LIVE_STATE.kind !== 'CURRENT', `LIVE_SOURCE_${NO_EVICTION_LIVE_STATE.kind}`);
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(liveSourceTestRoot()), config: createApprovedRealSourceScanConfig() });
    expect(discovery.operations.filter((operation) => operation.repository === RIPPLE_API)).toHaveLength(223);
  });
  test('the blueapi artifact still contributes exactly its own 591 operations', () => {
    test.skip(NO_EVICTION_LIVE_STATE.kind !== 'CURRENT', `LIVE_SOURCE_${NO_EVICTION_LIVE_STATE.kind}`);
    const discovery = discoverSourceSurfaces({ access: createSiblingSourceAccess(liveSourceTestRoot()), config: createApprovedRealSourceScanConfig() });
    // This filtered on sourcePath ALONE, which was never a unique identity: it
    // silently assumed only one repository in the universe could hold a file at
    // `openapiv2/apidocs.swagger.json`. C-05 admitted `blueinternal`, which
    // holds a file at exactly that path, and the count became 642. The
    // assertion was under-specified rather than wrong, so the repository is now
    // part of the identity.
    expect(discovery.operations.filter((operation) => operation.repository === BLUEAPI
      && operation.sourcePath === 'openapiv2/apidocs.swagger.json')).toHaveLength(591);
    // And the newly admitted artifact contributes its own, separately.
    expect(discovery.operations.filter((operation) => operation.repository === 'alphauslabs/blueinternal'
      && operation.sourcePath === 'openapiv2/apidocs.swagger.json')).toHaveLength(51);
  });
});

test.describe('C-03 — the method-level prototype is positive-only, and says so', () => {
  test.skip(() => !siblingRepoAvailable(OUCHAN) || !siblingRepoAvailable(BLUEAPI) || !siblingRepoAvailable(SDK), 'requires the read-only sibling Alphaus checkouts');

  test('a proven binding resolves its implementation type and observes handlers', () => {
    const topology = realTopology();
    const billing = topology.bindings.find((binding) => binding.protoServiceIdentity === 'blueapi.billing.v1.Billing');
    expect(billing?.methodBinding.state).toBe('POSITIVE_ONLY');
    expect(billing?.methodBinding.implementationType).toBe('service');
    expect(billing?.methodBinding.protoRpcCount).toBe(147);
    expect(billing?.methodBinding.observedHandlerCount).toBeGreaterThan(0);
  });

  test('an unobserved RPC is never reported as a completeness claim', () => {
    // The asymmetry that keeps W-EFFECT_RPC UNSUPPORTED: `unobservedRpcCount`
    // counts RPCs with no observed method, and that is NOT a claim that they
    // are unimplemented. billingd shows 143 of 147; whether the other four
    // fall through to the embedded base or simply were not read is not
    // decidable while enumeration is TRUNCATED.
    const topology = realTopology();
    for (const binding of topology.bindings) {
      expect(binding.methodBinding.completenessClaim).toBe('NONE');
      if (binding.methodBinding.state === 'POSITIVE_ONLY') {
        expect(binding.methodBinding.observedHandlerCount + binding.methodBinding.unobservedRpcCount).toBe(binding.methodBinding.protoRpcCount);
      }
    }
    expect(topology.completeness.repositoryCompleteProof).toBe(false);
  });

  test('a non-proven binding does not attempt a method binding at all', () => {
    const topology = realTopology();
    const metrics = topology.bindings.find((binding) => binding.registrationSymbol === 'RegisterMetricsControlPlaneServer');
    expect(metrics?.methodBinding.state).toBe('NOT_ATTEMPTED');
  });

  test('several services reach an exact handler count, which is an observation and not a proof', () => {
    const topology = realTopology();
    const exact = topology.bindings.filter((binding) => binding.methodBinding.state === 'POSITIVE_ONLY' && binding.methodBinding.protoRpcCount > 0 && binding.methodBinding.unobservedRpcCount === 0);
    expect(exact.length).toBeGreaterThan(0);
    // Even at 72/72 the state stays POSITIVE_ONLY. A complete-looking count
    // does not upgrade the evidence class.
    expect(exact.every((binding) => binding.methodBinding.state === 'POSITIVE_ONLY' && binding.methodBinding.completenessClaim === 'NONE')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Probe-driven additions. Negative probes B2, B4 and B7 all came back
// NOT_DETECTED against the suite above, and in each case the rule was sound
// while the assertion was too weak to notice it being deleted. These are the
// fixtures that make the three rules non-vacuous.
// ---------------------------------------------------------------------------

test.describe('C-03 — the join rules are asserted, not merely present', () => {
  test('B2: an ambiguous qualifier is distinguished from an unresolved one', () => {
    // Both end in AMBIGUOUS, so asserting the STATE alone cannot tell them
    // apart. The blocker is the part that carries the diagnosis.
    const { root, topology } = syntheticTopology({
      [OUCHAN]: {
        'services/widgetd/main.go': `package main
import (
  widget "${SDK_MODULE}/widget/v1"
  widget "github.com/example/other/widget"
)
func run() { widget.RegisterWidgetServer(gs, svc) }
`,
      },
    });
    try {
      expect(topology.bindings[0]?.state).toBe('AMBIGUOUS');
      expect(topology.bindings[0]?.blocker).toBe('QUALIFIER_AMBIGUOUS');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('B4: a generated file naming two services pairs each by its own name', () => {
    // With one service per file the pairing filter is invisible — any single
    // candidate is the right one. Two services in one file is what makes the
    // filter load-bearing: dropping it would let Widget bind to Gadget.
    const { root, topology } = syntheticTopology({
      [SDK]: {
        'widget/v1/widget_grpc.pb.go': `
package widget
func RegisterWidgetServer(s grpc.ServiceRegistrar, srv WidgetServer) {}
func RegisterGadgetServer(s grpc.ServiceRegistrar, srv GadgetServer) {}
var Gadget_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "blueapi.widget.v1.Gadget",
}
var Widget_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "blueapi.widget.v1.Widget",
}
`,
      },
    });
    try {
      expect(topology.bindings[0]?.state).toBe('PROVEN');
      expect(topology.bindings[0]?.protoServiceIdentity).toBe('blueapi.widget.v1.Widget');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('B7: an embedding from another package corroborates nothing', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: {
        'services/widgetd/main.go': WIDGET_DAEMON,
        'services/widgetd/service.go': `package main
import other "github.com/example/other/widget"
type service struct {
	other.UnimplementedWidgetServer
}
`,
      },
    });
    try {
      expect(topology.bindings[0]?.state).toBe('PROVEN');
      // Same service token, different package. Corroboration must not fire.
      expect(topology.bindings[0]?.embeddingCorroborated).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('B7: an embedding from the registered package does corroborate', () => {
    const { root, topology } = syntheticTopology({
      [OUCHAN]: {
        'services/widgetd/main.go': WIDGET_DAEMON,
        'services/widgetd/service.go': `package main
import widget "${SDK_MODULE}/widget/v1"
type service struct {
	widget.UnimplementedWidgetServer
}
`,
      },
    });
    try {
      expect(topology.bindings[0]?.embeddingCorroborated).toBe(true);
      expect(topology.bindings[0]?.methodBinding.implementationType).toBe('service');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// R2-N2 — every declared live-source skip keeps a synthetic twin that always
// runs. The live assertions above measure the real sibling checkouts and skip
// categorically when they are STALE or UNAVAILABLE; these twins prove the same
// invariants over explicit synthetic roots so the coverage never silently
// disappears with the host.

test.describe('C-03 — synthetic twins for the declared live-source skips', () => {

  test('synthetic twin — no-eviction: identities discovered before a synthetic admission survive it', () => {
    const root = syntheticWorkspace({
      [SDK]: { 'widget/v1/widget_grpc.pb.go': WIDGET_SDK, 'widget/v1/widget.proto': WIDGET_PROTO },
      [BLUEAPI]: { 'billing/v1/billing.proto': WIDGET_PROTO.replace('blueapi.widget.v1', 'blueapi.billing.v1').replace('Widget', 'Billing') },
    });
    const access = createSiblingSourceAccess(root);
    const before = syntheticConfig([
      { repoId: SDK, roots: ['widget'] },
    ]);
    const after = syntheticConfig([
      { repoId: SDK, roots: ['widget'] },
      { repoId: BLUEAPI, roots: ['billing'] },
    ]);
    const beforeIdentities = new Set(discoverSourceSurfaces({ access, config: before }).operations.map((operation) => operation.operationId));
    const afterResult = discoverSourceSurfaces({ access, config: after });
    const afterIdentities = new Set(afterResult.operations.map((operation) => operation.operationId));
    expect(beforeIdentities.size).toBeGreaterThan(0);
    expect([...beforeIdentities].filter((identity) => !afterIdentities.has(identity))).toEqual([]);
    expect(afterIdentities.size).toBeGreaterThan(beforeIdentities.size);
    expect(afterResult.operationCompleteness.droppedOperations).toBe(0);
  });

  test('synthetic twin — a repository keeps its full operation set when another repository grows', () => {
    const root = syntheticWorkspace({
      [RIPPLE_API]: { 'widget/v1/widget.proto': WIDGET_PROTO, 'billing/v1/billing.proto': WIDGET_PROTO.replace('blueapi.widget.v1', 'blueapi.billing.v1').replace('Widget', 'Billing') },
      [BLUEAPI]: { 'openapi/v1/api.proto': WIDGET_PROTO.replace('blueapi.widget.v1', 'blueapi.openapi.v1').replace('Widget', 'Openapi') },
    });
    const access = createSiblingSourceAccess(root);
    const before = discoverSourceSurfaces({
      access,
      config: syntheticConfig([{ repoId: RIPPLE_API, roots: ['widget', 'billing'] }]),
    });
    const after = discoverSourceSurfaces({
      access,
      config: syntheticConfig([
        { repoId: RIPPLE_API, roots: ['widget', 'billing'] },
        { repoId: BLUEAPI, roots: ['openapi'] },
      ]),
    });
    const rippleBefore = before.operations.filter((operation) => operation.repository === RIPPLE_API);
    const rippleAfter = after.operations.filter((operation) => operation.repository === RIPPLE_API);
    expect(rippleBefore.length).toBeGreaterThan(0);
    expect(rippleAfter.map((operation) => operation.operationId).sort()).toEqual(rippleBefore.map((operation) => operation.operationId).sort());
  });

  test('synthetic twin — artifact identity is repository + sourcePath, never sourcePath alone', () => {
    const artifact = JSON.stringify({
      swagger: '2.0',
      paths: {
        '/v1/first': { get: { operationId: 'firstGet', responses: { 200: { description: 'ok' } } } },
      },
    });
    const root = syntheticWorkspace({
      [BLUEAPI]: { 'apidocs/apidocs.swagger.json': artifact },
      'alphauslabs/blueinternal': { 'apidocs/apidocs.swagger.json': artifact.replace('firstGet', 'secondGet') },
    });
    const access = createSiblingSourceAccess(root);
    const config = createRealSourceScanConfig({
      runtimeMappingNamespace: 'ripple',
      approvedRepositories: [
        { repoId: BLUEAPI, expectedSourceSha: SYNTHETIC_SHA, allowlistedRoots: ['apidocs'], allowedExtensions: ['.json'], maxFiles: 64, maxFileBytes: 400_000, maxTotalBytes: 4_000_000 },
        { repoId: 'alphauslabs/blueinternal', expectedSourceSha: SYNTHETIC_SHA, allowlistedRoots: ['apidocs'], allowedExtensions: ['.json'], maxFiles: 64, maxFileBytes: 400_000, maxTotalBytes: 4_000_000 },
      ],
    });
    const discovery = discoverSourceSurfaces({ access, config });
    const blueapiOwn = discovery.operations.filter((operation) => operation.repository === BLUEAPI && operation.sourcePath === 'apidocs/apidocs.swagger.json');
    const internalOwn = discovery.operations.filter((operation) => operation.repository === 'alphauslabs/blueinternal' && operation.sourcePath === 'apidocs/apidocs.swagger.json');
    // The artifact analyzer derives evidence-shaped operation identities; the
    // twin's claim is the identity SHAPE: the same sourcePath in two
    // repositories yields two disjoint populations, never one merged count.
    expect(blueapiOwn.length).toBeGreaterThan(0);
    expect(internalOwn.length).toBeGreaterThan(0);
    const blueapiIds = new Set(blueapiOwn.map((operation) => operation.operationId));
    expect(internalOwn.every((operation) => !blueapiIds.has(operation.operationId))).toBe(true);
  });
});
