// W10 M1 — frozen reproduction-surface contracts and index selection.
// Pure deterministic checks only: no filesystem, process, network or clock.
import { test, expect } from '@playwright/test';

import {
  REPRODUCTION_SURFACE_MAP_VERSION,
  SURFACE_CAPS,
  SURFACE_READINESS_CLASSES,
  SURFACE_REFUSAL_CLASSES,
  buildReproductionSurfaceMap,
  executableSelectionRate,
  notAvailableRate,
  projectDiscovery,
  surfaceTargetId,
  type ReproductionSurfaceEntry,
  type W10YieldMetrics,
} from '../../src/core/reproductionSurface/contracts';
import { selectDiverseSourceIndex } from '../../src/core/reproductionSurface/selection';
import {
  OWNER_LOCAL_ENVIRONMENT_BLOCKS,
  OWNER_LOCAL_TARGET_REFUSALS,
  OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
  DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
  type OwnerLocalReproductionTarget,
} from '../../src/core/ownerLocalReproduction/contracts';

function target(
  overrides: Partial<OwnerLocalReproductionTarget> = {},
): OwnerLocalReproductionTarget {
  return {
    schemaVersion: OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
    repository: 'mobingilabs/ouchan',
    sourcePath: 'mobingilabs/ouchan:pkg/almcreds/creds.go',
    sourceRelativePath: 'pkg/almcreds/creds.go',
    sourceContentDigest: 'sha256:abc',
    moduleRelativePath: '.',
    packageRelativePath: 'pkg/almcreds',
    executor: 'GO_VENDORED_PACKAGE_TEST',
    repositoryHeadSha: 'f'.repeat(40),
    prerequisites: ['MODULE_MANIFEST', 'VENDOR_DIRECTORY', 'PACKAGE_TEST_FILES', 'NETWORK_DISABLED'],
    limits: DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
    ...overrides,
  };
}

test('every frozen W9 target refusal projects into the neutral vocabulary', () => {
  for (const refusal of OWNER_LOCAL_TARGET_REFUSALS) {
    const entry = projectDiscovery('repo/x:a.go', { status: 'UNSUPPORTED', refusal });
    expect(entry.readiness).toBe('NOT_EXECUTABLE');
    expect(SURFACE_REFUSAL_CLASSES).toContain(entry.refusal);
    expect(entry.executorClass).toBeNull();
    expect(entry.targetId).toBeNull();
  }
});

test('every frozen W9 environment block collapses to ENVIRONMENT_BLOCKED', () => {
  for (const block of OWNER_LOCAL_ENVIRONMENT_BLOCKS) {
    const entry = projectDiscovery('repo/x:a.go', { status: 'BLOCKED', block });
    expect(entry.readiness).toBe('NOT_EXECUTABLE');
    // Which local toolchain is missing is host topology, never reasoner-visible.
    expect(entry.refusal).toBe('ENVIRONMENT_BLOCKED');
  }
});

test('a supported discovery projects as executable with a package-level identity', () => {
  const entry = projectDiscovery('mobingilabs/ouchan:pkg/almcreds/creds.go', {
    status: 'SUPPORTED',
    target: target(),
  });
  expect(entry.readiness).toBe('EXECUTABLE_NOW');
  expect(entry.executorClass).toBe('GO_VENDORED_PACKAGE_TEST');
  expect(entry.refusal).toBeNull();
  expect(entry.targetId).not.toBeNull();
});

test('two sources in one package share a target id; a different package does not', () => {
  const first = projectDiscovery('mobingilabs/ouchan:pkg/almcreds/creds.go', {
    status: 'SUPPORTED',
    target: target(),
  });
  const sibling = projectDiscovery('mobingilabs/ouchan:pkg/almcreds/other.go', {
    status: 'SUPPORTED',
    target: target({ sourceRelativePath: 'pkg/almcreds/other.go' }),
  });
  const elsewhere = projectDiscovery('mobingilabs/ouchan:pkg/almuser/user.go', {
    status: 'SUPPORTED',
    target: target({ packageRelativePath: 'pkg/almuser' }),
  });
  expect(sibling.targetId).toBe(first.targetId);
  expect(elsewhere.targetId).not.toBe(first.targetId);
});

test('a surface entry never carries a command, argv or absolute path', () => {
  const entry = projectDiscovery('mobingilabs/ouchan:pkg/almcreds/creds.go', {
    status: 'SUPPORTED',
    target: target(),
  });
  const serialized = JSON.stringify(entry);
  expect(serialized).not.toContain('/home/');
  expect(serialized).not.toContain('go test');
  expect(serialized).not.toContain('vendor');
  expect(serialized).not.toContain('GOPROXY');
  expect(Object.keys(entry).sort()).toEqual([
    'executorClass',
    'readiness',
    'refusal',
    'sourcePath',
    'targetId',
  ]);
});

test('the surface map is capped and reports truncation honestly', () => {
  const entries: ReproductionSurfaceEntry[] = [];
  for (let index = 0; index < SURFACE_CAPS.entries + 9; index += 1) {
    entries.push(projectDiscovery(`repo/x:file${index}.go`, {
      status: 'UNSUPPORTED',
      refusal: 'PACKAGE_TEST_FILES_ABSENT',
    }));
  }
  const map = buildReproductionSurfaceMap(entries);
  expect(map.schemaVersion).toBe(REPRODUCTION_SURFACE_MAP_VERSION);
  expect(map.entries.length).toBe(SURFACE_CAPS.entries);
  expect(map.truncated).toBe(true);
  expect(map.executableEntryCount).toBe(0);
});

test('map counts describe the carried entries, never the discarded ones', () => {
  const executable = projectDiscovery('mobingilabs/ouchan:pkg/almcreds/creds.go', {
    status: 'SUPPORTED',
    target: target(),
  });
  const filler: ReproductionSurfaceEntry[] = [];
  for (let index = 0; index < SURFACE_CAPS.entries; index += 1) {
    filler.push(projectDiscovery(`repo/x:file${index}.go`, {
      status: 'UNSUPPORTED',
      refusal: 'NO_SUPPORTED_EXECUTOR',
    }));
  }
  // The executable entry is pushed past the ceiling, so it must not be counted.
  const map = buildReproductionSurfaceMap([...filler, executable]);
  expect(map.executableEntryCount).toBe(0);
  expect(map.distinctExecutableTargets).toBe(0);
  expect(map.truncated).toBe(true);
});

test('readiness vocabulary keeps UNKNOWN distinct from NOT_EXECUTABLE', () => {
  expect(SURFACE_READINESS_CLASSES).toEqual(['EXECUTABLE_NOW', 'NOT_EXECUTABLE', 'UNKNOWN']);
  const unknown = projectDiscovery('repo/x:a.go', { status: 'WAT' } as never);
  expect(unknown.readiness).toBe('UNKNOWN');
  expect(unknown.refusal).toBeNull();
});

// ---------------------------------------------------------------------------
// Index selection — the W9 failure reproduced against the contract.
// ---------------------------------------------------------------------------

function universe(): { path: string; repository: string }[] {
  const entries: { path: string; repository: string }[] = [];
  // Mirrors the measured live shape: one alphabetically-first repository large
  // enough to fill the whole window, and the executable repository behind it.
  for (let index = 0; index < 57; index += 1) {
    entries.push({ path: `alphauslabs/blue-sdk-go:cost/v1/f${index}.go`, repository: 'alphauslabs/blue-sdk-go' });
  }
  for (let index = 0; index < 2638; index += 1) {
    entries.push({ path: `mobingilabs/ouchan:pkg/p${index}/x.go`, repository: 'mobingilabs/ouchan' });
  }
  for (let index = 0; index < 95; index += 1) {
    entries.push({ path: `mobingilabs/ripple-api:src/f${index}.php`, repository: 'mobingilabs/ripple-api' });
  }
  return entries;
}

test('a prefix of a repository-major ordering shows exactly one repository', () => {
  // This is the W9 defect, stated as a test: the old behaviour.
  const prefix = universe().slice(0, 32);
  expect(new Set(prefix.map((entry) => entry.repository)).size).toBe(1);
});

test('diverse selection represents every repository within the same window', () => {
  const result = selectDiverseSourceIndex({ entries: universe(), limit: 32 });
  expect(result.entries.length).toBe(32);
  expect(result.repositories).toBe(3);
  const counts = new Map<string, number>();
  for (const entry of result.entries) {
    counts.set(entry.repository, (counts.get(entry.repository) ?? 0) + 1);
  }
  // Round-robin over three repositories: no repository may starve.
  for (const count of counts.values()) expect(count).toBeGreaterThan(0);
});

test('selection is deterministic for a deterministic universe', () => {
  const first = selectDiverseSourceIndex({ entries: universe(), limit: 32 });
  const second = selectDiverseSourceIndex({ entries: universe(), limit: 32 });
  expect(first.entries.map((entry) => entry.path)).toEqual(second.entries.map((entry) => entry.path));
});

test('a universe smaller than the limit is returned whole', () => {
  const entries = [
    { path: 'a/b:one.go', repository: 'a/b' },
    { path: 'c/d:two.go', repository: 'c/d' },
  ];
  const result = selectDiverseSourceIndex({ entries, limit: 32 });
  expect(result.entries.length).toBe(2);
  expect(result.omitted).toBe(0);
});

test('capability ordering surfaces executable entries without hiding the rest', () => {
  const entries = [
    { path: 'r/one:a.go', repository: 'r/one' },
    { path: 'r/one:b.go', repository: 'r/one' },
    { path: 'r/one:c.go', repository: 'r/one' },
  ];
  const readinessByPath = new Map<string, ReproductionSurfaceEntry>([
    ['r/one:c.go', projectDiscovery('r/one:c.go', { status: 'SUPPORTED', target: target() })],
  ]);
  const result = selectDiverseSourceIndex({ entries, limit: 3, readinessByPath });
  expect(result.entries[0]!.path).toBe('r/one:c.go');
  // Nothing was filtered away: unsupported source stays investigable.
  expect(result.entries.length).toBe(3);
  expect(result.omitted).toBe(0);
});

test('an unannotated path is never promoted as executable', () => {
  const entries = [
    { path: 'r/one:a.go', repository: 'r/one' },
    { path: 'r/one:b.go', repository: 'r/one' },
  ];
  const result = selectDiverseSourceIndex({
    entries,
    limit: 2,
    readinessByPath: new Map(),
  });
  expect(result.entries.map((entry) => entry.path)).toEqual(['r/one:a.go', 'r/one:b.go']);
});

test('a non-positive or unsafe limit selects nothing rather than everything', () => {
  for (const limit of [0, -1, Number.NaN, 1.5]) {
    const result = selectDiverseSourceIndex({ entries: universe(), limit });
    expect(result.entries.length).toBe(0);
    expect(result.omitted).toBe(universe().length);
  }
});

// ---------------------------------------------------------------------------
// Yield metrics.
// ---------------------------------------------------------------------------

function metrics(overrides: Partial<W10YieldMetrics> = {}): W10YieldMetrics {
  return {
    schemaVersion: 'nightwatch.w10-yield-metrics.v1',
    visibleSources: 32,
    visibleExecutableSources: 0,
    visibleExecutableTargets: 0,
    visibleRepositories: 1,
    reproductionAttempts: 7,
    executableTargetAttempts: 0,
    notAvailableAttempts: 7,
    repeatedUnsupportedAttempts: 0,
    qualifyingReproductions: 0,
    attemptsToFirstExecutableReproduction: null,
    callsToFirstExecutableReproduction: null,
    ...overrides,
  };
}

test('the W9 reference scores a total NOT_AVAILABLE rate and zero selection rate', () => {
  const w9 = metrics();
  expect(notAvailableRate(w9)).toBe(1);
  expect(executableSelectionRate(w9)).toBe(0);
});

test('rates are null rather than zero when nothing was attempted', () => {
  const idle = metrics({ reproductionAttempts: 0, notAvailableAttempts: 0 });
  expect(notAvailableRate(idle)).toBeNull();
  expect(executableSelectionRate(idle)).toBeNull();
});

test('surfaceTargetId is stable and collision-free across packages', () => {
  const a = surfaceTargetId('mobingilabs/ouchan', '.', 'pkg/almcreds');
  const b = surfaceTargetId('mobingilabs/ouchan', '.', 'pkg/almcreds');
  const c = surfaceTargetId('mobingilabs/ouchan', '.', 'pkg/almuser');
  expect(a).toBe(b);
  expect(a).not.toBe(c);
  expect(a.startsWith('surface:')).toBe(true);
});
