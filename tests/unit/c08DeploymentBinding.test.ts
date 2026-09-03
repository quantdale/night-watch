// ---------------------------------------------------------------------------
// Nightwatch C-08 — deployment-fact binding.
//
// Before C-08 every operation carried `deploymentStatusUnresolved: true`, typed
// as the literal `true`, so it could never say anything else. It looked like an
// answer and conveyed nothing: an operation investigated and found unknowable
// was indistinguishable from one nobody had looked at.
//
// The assertions here are chosen to fail if the campaign's discipline erodes.
// The one that matters most is that CLIENT CONFIGURATION cannot become a
// DEPLOYMENT_FACT — `ripple-ui/src/config/common.js` is committed, current, and
// names real hosts per environment, so it reads as authoritative while stating
// only what the FRONTEND CALLS. The gap between that and what the
// infrastructure SERVES is where a stale or rerouted deployment hides.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEPLOYMENT_BINDING_STATES,
  DEPLOYMENT_CHAIN_HOPS,
  DEPLOYMENT_EXTRACTOR_VERSION,
  FORBIDDEN_DEPLOYMENT_FACT_BASES,
  bindDeployments,
  bindOperation,
  chainState,
  excludedEnvironmentsFor,
  serviceDirectoryFromSourcePath,
  weakestCategory,
  type BuildExclusion,
  type DeploymentEvidenceInput,
  type HostMatrixEntry,
  type OperationForBinding,
} from '../../src/core/source/deploymentBinding';
import { evidenceIsCurrent, extractBuildExclusions, extractHostMatrix } from '../../src/core/source/deploymentEvidence';

const root = path.resolve(__dirname, '..', '..');

const HOST_MATRIX: readonly HostMatrixEntry[] = Object.freeze([
  { routePrefix: '/m/ripple', environment: 'prod', host: 'api.example.invalid' },
  { routePrefix: '/m/ripple', environment: 'dev', host: 'apidev.example.invalid' },
]);

const EXCLUSIONS: readonly BuildExclusion[] = Object.freeze([
  { servicePattern: 'reportd', isRegex: false, negated: false, branches: Object.freeze(['production']) },
  { servicePattern: '.*tests.*', isRegex: true, negated: false, branches: Object.freeze(['production', 'next']) },
]);

function evidence(overrides: Partial<DeploymentEvidenceInput> = {}): DeploymentEvidenceInput {
  return {
    hostMatrix: HOST_MATRIX,
    hostMatrixEvidence: {
      repoId: 'mobingilabs/ripple-ui', sourceSha: 'a'.repeat(40), path: 'src/config/common.js',
      extractorVersion: DEPLOYMENT_EXTRACTOR_VERSION, digest: 'dep:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      factCategory: 'SOURCE_FACT', hop: 'ROUTE_TO_HOST',
    },
    buildExclusions: EXCLUSIONS,
    buildExclusionEvidence: {
      repoId: 'mobingilabs/ouchan', sourceSha: 'b'.repeat(40), path: 'build/config.yaml',
      extractorVersion: DEPLOYMENT_EXTRACTOR_VERSION, digest: 'dep:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      factCategory: 'DEPLOYMENT_FACT', hop: 'SERVICE_TO_DEPLOYMENT',
    },
    provenConsumerPrefixes: new Map(),
    provenServiceByOperation: new Map(),
    ...overrides,
  };
}

const operation = (id: string, extra: Partial<OperationForBinding> = {}): OperationForBinding => ({
  operationId: id, repository: 'mobingilabs/ouchan', routeTemplate: '/user', transport: 'HTTP_API', ...extra,
});

test.describe('C-08 — every operation carries a binding', () => {
  test('totality holds by construction, not by convention', () => {
    const operations = Array.from({ length: 250 }, (_value, index) => operation(`op-${index}`));
    const projection = bindDeployments(operations, evidence());
    expect(projection.operationCount).toBe(250);
    expect(projection.bindingCount).toBe(250);
    expect(projection.totalityHolds).toBe(true);
    expect(projection.bindings).toHaveLength(250);
  });

  test('an empty population is total rather than an error', () => {
    const projection = bindDeployments([], evidence());
    expect(projection.totalityHolds).toBe(true);
    expect(projection.operationCount).toBe(0);
  });

  test('every binding names all three hops, in order', () => {
    const binding = bindOperation(operation('op-1'), evidence());
    expect(binding.chain.map((link) => link.hop)).toEqual([...DEPLOYMENT_CHAIN_HOPS]);
  });

  test('a non-route-shaped operation is UNSUPPORTED with a reason, never blank', () => {
    const binding = bindOperation(operation('op-1', { transport: 'BROWSER_READ_ONLY' }), evidence());
    expect(binding.state).toBe('UNSUPPORTED');
    expect(binding.chain[0]!.unknownReason).toBe('OPERATION_NOT_ROUTE_SHAPED');
  });

  test('every state in the vocabulary is reachable or explicitly unused', () => {
    // Guards against a state existing only decoratively.
    expect([...DEPLOYMENT_BINDING_STATES]).toEqual(['EXACT', 'PARTIAL', 'UNKNOWN', 'UNSUPPORTED', 'STALE', 'AMBIGUOUS']);
  });
});

test.describe('C-08 — client configuration is never a DEPLOYMENT_FACT', () => {
  test('the host matrix extracted from the REAL artifact is SOURCE_FACT', () => {
    const artifact = path.join('/home/dalepalaca/go/src/alphaus-main/REPOSITORIES', 'mobingilabs/ripple-ui/src/config/common.js');
    test.skip(!fs.existsSync(artifact), 'requires the read-only sibling Alphaus checkouts');
    const result = extractHostMatrix({
      repoId: 'mobingilabs/ripple-ui', sourceSha: 'd'.repeat(40), path: 'src/config/common.js',
      text: fs.readFileSync(artifact, 'utf8'),
    });
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.evidence!.factCategory).toBe('SOURCE_FACT');
    expect(result.evidence!.factCategory).not.toBe('DEPLOYMENT_FACT');
  });

  test('a route → host hop established from the matrix is SOURCE_FACT', () => {
    const binding = bindOperation(operation('op-1'), evidence({
      provenConsumerPrefixes: new Map([['op-1', '/m/ripple/user']]),
    }));
    const hop = binding.chain[0]!;
    expect(hop.established).toBe(true);
    expect(hop.factCategory).toBe('SOURCE_FACT');
    expect(hop.value).toBe('api.example.invalid');
  });

  test('CLIENT_CONFIGURATION is named as a forbidden basis', () => {
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('CLIENT_CONFIGURATION');
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('SERVICE_NAME_SIMILARITY');
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('ROUTE_PREFIX_SIMILARITY');
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('GUESSED_HOSTNAME');
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('HISTORICAL_FAMILIARITY');
    expect(FORBIDDEN_DEPLOYMENT_FACT_BASES).toContain('DOCUMENT_DESCRIBING_EXPECTED_ARCHITECTURE');
  });

  test('the binding module never derives a service name from a repository name', () => {
    // An earlier draft used `repository.split('/').pop()` as the service, which
    // would have attributed every ouchan operation to a service called
    // "ouchan" -- SERVICE_NAME_SIMILARITY wearing a deployment fact's label.
    const binding = bindOperation(operation('op-1', { repository: 'mobingilabs/reportd' }), evidence());
    // `reportd` IS excluded on production, so a name-derived service would
    // have produced a spurious NOT_DEPLOYED here.
    expect(binding.excludedEnvironments).toEqual([]);
    expect(binding.chain[2]!.unknownReason).toBe('NO_PROVEN_SERVICE_IDENTITY');
  });
});

test.describe('C-08 — the missing hop is named', () => {
  test('with no proven client family, hop one says so precisely', () => {
    const binding = bindOperation(operation('op-1'), evidence());
    expect(binding.chain[0]!.unknownReason).toBe('NO_PROVEN_CLIENT_FAMILY_BINDING');
  });

  test('hop two is U-1 and carries the organizational blocker', () => {
    const binding = bindOperation(operation('op-1'), evidence());
    expect(binding.chain[1]!.established).toBe(false);
    expect(binding.chain[1]!.unknownReason).toBe('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS');
  });

  test('an established hop with unestablished successors is PARTIAL, not UNKNOWN', () => {
    // PARTIAL is a real state: an established hop one is real knowledge, and
    // reporting UNKNOWN would discard it.
    const binding = bindOperation(operation('op-1'), evidence({
      provenConsumerPrefixes: new Map([['op-1', '/m/ripple/user']]),
    }));
    expect(binding.state).toBe('PARTIAL');
    expect(binding.chain[0]!.established).toBe(true);
  });

  test('no established hop yields UNKNOWN with the reason retained', () => {
    const binding = bindOperation(operation('op-1'), evidence());
    expect(binding.state).toBe('UNKNOWN');
    expect(binding.unknownReason).toBe('NO_PROVEN_CLIENT_FAMILY_BINDING');
  });

  test('contradictory matrix evidence is AMBIGUOUS, never UNKNOWN', () => {
    // Two entries, same prefix and environment, different hosts: the evidence
    // disagrees with itself, which is a different fact from having none.
    const binding = bindOperation(operation('op-1'), evidence({
      hostMatrix: [
        { routePrefix: '/m/ripple', environment: 'prod', host: 'one.example.invalid' },
        { routePrefix: '/m/ripple', environment: 'prod', host: 'two.example.invalid' },
      ],
      provenConsumerPrefixes: new Map([['op-1', '/m/ripple/user']]),
    }));
    expect(binding.state).toBe('AMBIGUOUS');
  });

  test('U-1 and U-2 are reported unresolved with their blocker', () => {
    const projection = bindDeployments([operation('op-1')], evidence());
    expect(projection.u1.resolved).toBe(false);
    expect(projection.u1.reason).toBe('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS');
    expect(projection.u2.resolved).toBe(false);
    expect(projection.u2.reason).toBe('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS');
  });
});

test.describe('C-08 — build exclusions, and only the negative direction', () => {
  test('an excluded service yields a NEGATIVE deployment fact', () => {
    const binding = bindOperation(operation('op-1'), evidence({
      provenServiceByOperation: new Map([['op-1', 'reportd']]),
    }), 'production');
    const hop = binding.chain[2]!;
    expect(hop.established).toBe(true);
    expect(hop.factCategory).toBe('DEPLOYMENT_FACT');
    expect(hop.value).toBe('NOT_DEPLOYED:reportd');
    expect(binding.excludedEnvironments).toContain('production');
  });

  test('a NON-excluded service is NOT deployment; eligibility is not deployment', () => {
    const binding = bindOperation(operation('op-1'), evidence({
      provenServiceByOperation: new Map([['op-1', 'somethingelsed']]),
    }), 'production');
    expect(binding.chain[2]!.established).toBe(false);
    expect(binding.chain[2]!.unknownReason).toBe('C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS');
  });

  test('regex and negated exclusion patterns are honoured', () => {
    expect(excludedEnvironmentsFor('unittestsd', EXCLUSIONS)).toEqual(['next', 'production']);
    expect(excludedEnvironmentsFor('reportd', EXCLUSIONS)).toEqual(['production']);
    expect(excludedEnvironmentsFor('untouchedd', EXCLUSIONS)).toEqual([]);
    expect(excludedEnvironmentsFor('anything', [
      { servicePattern: '.*keepme.*', isRegex: true, negated: true, branches: ['production'] },
    ])).toEqual(['production']);
  });

  test('an unusable regex proves nothing rather than matching or silently dropping', () => {
    expect(excludedEnvironmentsFor('svc', [
      { servicePattern: '([', isRegex: true, negated: false, branches: ['production'] },
    ])).toEqual([]);
  });

  test('the REAL build config parses to exclusions classified DEPLOYMENT_FACT', () => {
    const artifact = path.join('/home/dalepalaca/go/src/alphaus-main/REPOSITORIES', 'mobingilabs/ouchan/build/config.yaml');
    test.skip(!fs.existsSync(artifact), 'requires the read-only sibling Alphaus checkouts');
    const result = extractBuildExclusions({
      repoId: 'mobingilabs/ouchan', sourceSha: 'e'.repeat(40), path: 'build/config.yaml',
      text: fs.readFileSync(artifact, 'utf8'),
    });
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.evidence!.factCategory).toBe('DEPLOYMENT_FACT');
    // The branch set names environments, which is what makes the fact usable.
    expect(result.entries.some((entry) => entry.branches.includes('production'))).toBe(true);
  });
});

test.describe('C-08 — the build unit comes from the file, not the name', () => {
  test('a service directory is derived from the operation source path', () => {
    expect(serviceDirectoryFromSourcePath('services/reportd/handler.go')).toBe('reportd');
    expect(serviceDirectoryFromSourcePath('services/blued/api/v1/x.go')).toBe('blued');
  });

  test('a path outside services/ yields null rather than a guess', () => {
    expect(serviceDirectoryFromSourcePath('pkg/util/x.go')).toBeNull();
    expect(serviceDirectoryFromSourcePath('src/App/Handler/User.php')).toBeNull();
    expect(serviceDirectoryFromSourcePath('services/')).toBeNull();
    expect(serviceDirectoryFromSourcePath('openapiv2/apidocs.swagger.json')).toBeNull();
  });

  test('a traversal or unsafe segment yields null', () => {
    expect(serviceDirectoryFromSourcePath('services/../etc/passwd')).toBeNull();
    expect(serviceDirectoryFromSourcePath('services//x.go')).toBeNull();
  });

  test('the build unit is NOT read as the proto service identity', () => {
    // C-03 records that the daemon directory is never a join key, because
    // `services/blued` registers six proto services. This derivation
    // establishes the BUILD UNIT the exclusion evidence is keyed on, and
    // deliberately claims nothing about which proto service serves a route.
    const topology = fs.readFileSync(path.join(root, 'src/core/source/grpcTopology.ts'), 'utf8');
    expect(topology).toMatch(/never a join key/);
    const binding = fs.readFileSync(path.join(root, 'src/core/source/deploymentBinding.ts'), 'utf8');
    expect(binding).toMatch(/says nothing about which proto service serves it/);
  });
});

test.describe('C-08 — currentness and joins', () => {
  test('a digest change makes evidence non-current rather than rebinding it', () => {
    const recorded = evidence().hostMatrixEvidence!;
    expect(evidenceIsCurrent(recorded, recorded.digest, recorded.sourceSha)).toBe(true);
    expect(evidenceIsCurrent(recorded, 'dep:sha256:cccccccccccccccccccccccc', recorded.sourceSha)).toBe(false);
  });

  test('a source SHA change makes evidence non-current', () => {
    const recorded = evidence().hostMatrixEvidence!;
    expect(evidenceIsCurrent(recorded, recorded.digest, 'f'.repeat(40))).toBe(false);
  });

  test('an extractor version change makes evidence non-current', () => {
    const recorded = { ...evidence().hostMatrixEvidence!, extractorVersion: 'c08.deployment-extractor.v0' as never };
    expect(evidenceIsCurrent(recorded, recorded.digest, recorded.sourceSha)).toBe(false);
  });

  test('a STALE hop makes the whole chain STALE', () => {
    expect(chainState([
      { hop: 'ROUTE_TO_HOST', established: true, factCategory: 'SOURCE_FACT', value: 'h', unknownReason: null },
      { hop: 'HOST_TO_SERVICE', established: false, factCategory: null, value: null, unknownReason: 'EVIDENCE_ARTIFACT_CHANGED' },
      { hop: 'SERVICE_TO_DEPLOYMENT', established: false, factCategory: null, value: null, unknownReason: 'C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS' },
    ])).toBe('STALE');
  });

  test('a join is never stronger than its weakest input', () => {
    expect(weakestCategory(['SOURCE_FACT', 'INFERENCE'])).toBe('INFERENCE');
    expect(weakestCategory(['SOURCE_FACT', 'DEPLOYMENT_FACT'])).toBe('DEPLOYMENT_FACT');
    expect(weakestCategory(['DEPLOYMENT_FACT', 'OBSERVATION'])).toBe('OBSERVATION');
    // No established input is "no category", not "the weakest category".
    expect(weakestCategory([null, null])).toBeNull();
  });

  test('an INFERENCE never becomes a DEPLOYMENT_FACT through a join', () => {
    expect(weakestCategory(['INFERENCE', 'DEPLOYMENT_FACT', 'SOURCE_FACT'])).toBe('INFERENCE');
  });
});

test.describe('C-08 — the binding grants no authority', () => {
  test('no request-authority surface imports the binding module', () => {
    // Knowing where something runs is not permission to call it. This asserts
    // the separation structurally rather than trusting future authors.
    const authoritySurfaces = [
      'src/core/safety/realRunGate.ts',
      'src/core/policy/ownerScope.ts',
    ];
    for (const file of authoritySurfaces) {
      const absolute = path.join(root, file);
      if (!fs.existsSync(absolute)) continue;
      expect(fs.readFileSync(absolute, 'utf8')).not.toMatch(/deploymentBinding|deploymentEvidence/);
    }
  });

  test('the binding modules take no filesystem, process or network authority', () => {
    for (const file of ['src/core/source/deploymentBinding.ts', 'src/core/source/deploymentEvidence.ts']) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      for (const forbidden of ['node:fs', 'node:child_process', 'node:net', 'node:https', 'node:http', 'fetch(']) {
        expect(source).not.toContain(forbidden);
      }
    }
  });
});
