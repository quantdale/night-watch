// W10 M2 — reproduction-capability census engine.
// Pure deterministic checks only: the engine classifies through an injected
// callback, so no filesystem, process, network or clock is involved.
import { test, expect } from '@playwright/test';

import {
  REPRODUCTION_CAPABILITY_CENSUS_VERSION,
  type ReproductionCapabilityCensus,
} from '../../src/core/reproductionSurface/contracts';
import {
  buildReproductionCapabilityCensus,
  type CensusSourceRecord,
} from '../../src/core/reproductionSurface/census';
import {
  DEFAULT_OWNER_LOCAL_REPRODUCTION_LIMITS,
  OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
  type OwnerLocalEnvironmentBlock,
  type OwnerLocalReproductionTarget,
  type OwnerLocalTargetDiscovery,
  type OwnerLocalTargetRefusal,
} from '../../src/core/ownerLocalReproduction/contracts';

// Mirror of the measured live shape: one zero-coverage repository that sorts
// first, one repository with executable packages.
const ZERO_COVERAGE_REPO = 'alphauslabs/blue-sdk-go';
const EXECUTABLE_REPO = 'mobingilabs/ouchan';

function target(overrides: Partial<OwnerLocalReproductionTarget> = {}): OwnerLocalReproductionTarget {
  return {
    schemaVersion: OWNER_LOCAL_REPRODUCTION_TARGET_VERSION,
    repository: EXECUTABLE_REPO,
    sourcePath: `${EXECUTABLE_REPO}:pkg/almcreds/creds.go`,
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

function refused(refusal: OwnerLocalTargetRefusal): OwnerLocalTargetDiscovery {
  return { status: 'UNSUPPORTED', refusal };
}

function blocked(block: OwnerLocalEnvironmentBlock): OwnerLocalTargetDiscovery {
  return { status: 'BLOCKED', block };
}

function supported(packageRelativePath: string, sourceRelativePath: string): OwnerLocalTargetDiscovery {
  return {
    status: 'SUPPORTED',
    target: target({
      sourcePath: `${EXECUTABLE_REPO}:${sourceRelativePath}`,
      sourceRelativePath,
      packageRelativePath,
    }),
  };
}

/** Classify from an explicit table; anything unlisted is refused. Records every call. */
function tableClassify(
  table: ReadonlyMap<string, OwnerLocalTargetDiscovery>,
  fallback: OwnerLocalTargetDiscovery = refused('NO_SUPPORTED_EXECUTOR'),
): ((sourcePath: string) => OwnerLocalTargetDiscovery) & { calls: string[] } {
  const calls: string[] = [];
  const classify = ((sourcePath: string): OwnerLocalTargetDiscovery => {
    calls.push(sourcePath);
    return table.get(sourcePath) ?? fallback;
  }) as ((sourcePath: string) => OwnerLocalTargetDiscovery) & { calls: string[] };
  classify.calls = calls;
  return classify;
}

function record(repository: string, relativePath: string): CensusSourceRecord {
  return { repository, relativePath };
}

function sumValues(distribution: Readonly<Record<string, number>>): number {
  return Object.values(distribution).reduce((sum, count) => sum + count, 0);
}

function isSorted(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! <= value);
}

test('a live-shaped universe yields the correct executable and distinct-target counts', () => {
  // Deliberately ordered zero-coverage-first, like the W9 reasoner window: the
  // census must see past the prefix, not stop at it.
  const records: CensusSourceRecord[] = [
    record(ZERO_COVERAGE_REPO, 'pkg/auth/token.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/auth/session.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/store/store.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/store/memory.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/other.go'),
    record(EXECUTABLE_REPO, 'pkg/almuser/user.go'),
    record(EXECUTABLE_REPO, 'pkg/notes/notes.go'),
    record(EXECUTABLE_REPO, 'pkg/notes/index.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
      [`${EXECUTABLE_REPO}:pkg/almcreds/other.go`, supported('pkg/almcreds', 'pkg/almcreds/other.go')],
      [`${EXECUTABLE_REPO}:pkg/almuser/user.go`, supported('pkg/almuser', 'pkg/almuser/user.go')],
      [`${EXECUTABLE_REPO}:pkg/notes/notes.go`, refused('PACKAGE_TEST_FILES_ABSENT')],
      [`${EXECUTABLE_REPO}:pkg/notes/index.go`, refused('PACKAGE_TEST_FILES_ABSENT')],
    ]),
    refused('VENDOR_DIRECTORY_ABSENT'),
  );

  const census: ReproductionCapabilityCensus = buildReproductionCapabilityCensus({ records, classify });

  expect(census.schemaVersion).toBe(REPRODUCTION_CAPABILITY_CENSUS_VERSION);
  expect(census.eligibleSourceFiles).toBe(9);
  expect(census.executableSourceFiles).toBe(3);
  expect(census.distinctExecutableTargets).toBe(2);
  expect(census.truncated).toBe(false);
  expect(census.repositories.map((row) => row.repository)).toEqual([
    ZERO_COVERAGE_REPO,
    EXECUTABLE_REPO,
  ]);

  const zero = census.repositories[0]!;
  expect(zero.eligibleSourceFiles).toBe(4);
  expect(zero.executableSourceFiles).toBe(0);
  expect(zero.distinctExecutableTargets).toBe(0);
  expect(zero.refusalDistribution).toEqual({ VENDOR_DIRECTORY_ABSENT: 4 });

  const exec = census.repositories[1]!;
  expect(exec.eligibleSourceFiles).toBe(5);
  expect(exec.executableSourceFiles).toBe(3);
  expect(exec.distinctExecutableTargets).toBe(2);
  expect(exec.refusalDistribution).toEqual({ PACKAGE_TEST_FILES_ABSENT: 2 });
});

test('two source files in one package deduplicate to one distinct target', () => {
  const records: CensusSourceRecord[] = [
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/other.go'),
    record(EXECUTABLE_REPO, 'pkg/almuser/user.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
      [`${EXECUTABLE_REPO}:pkg/almcreds/other.go`, supported('pkg/almcreds', 'pkg/almcreds/other.go')],
      [`${EXECUTABLE_REPO}:pkg/almuser/user.go`, supported('pkg/almuser', 'pkg/almuser/user.go')],
    ]),
  );

  const census = buildReproductionCapabilityCensus({ records, classify });

  expect(census.executableSourceFiles).toBe(3);
  expect(census.distinctExecutableTargets).toBe(2);
  // The deduplicated package contributes two files but one target.
  const exec = census.repositories.find((row) => row.repository === EXECUTABLE_REPO)!;
  expect(exec.executableSourceFiles).toBe(3);
  expect(exec.distinctExecutableTargets).toBe(2);
});

test('the refusal distribution is deterministically ordered and excludes executable entries', () => {
  // Inserted in deliberately non-alphabetical order.
  const records: CensusSourceRecord[] = [
    record(ZERO_COVERAGE_REPO, 'pkg/z/one.go'),
    record(EXECUTABLE_REPO, 'pkg/a/exec.go'),
    record(EXECUTABLE_REPO, 'pkg/b/noexec.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/a/two.go'),
    record(EXECUTABLE_REPO, 'pkg/c/packageless.go'),
    record(EXECUTABLE_REPO, 'pkg/d/blocked.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${ZERO_COVERAGE_REPO}:pkg/z/one.go`, refused('VENDOR_DIRECTORY_ABSENT')],
      [`${EXECUTABLE_REPO}:pkg/a/exec.go`, supported('pkg/a', 'pkg/a/exec.go')],
      [`${EXECUTABLE_REPO}:pkg/b/noexec.go`, refused('NO_SUPPORTED_EXECUTOR')],
      [`${ZERO_COVERAGE_REPO}:pkg/a/two.go`, refused('PACKAGE_TEST_FILES_ABSENT')],
      [`${EXECUTABLE_REPO}:pkg/c/packageless.go`, refused('MODULE_ROOT_NOT_FOUND')],
      [`${EXECUTABLE_REPO}:pkg/d/blocked.go`, blocked('TOOLCHAIN_UNAVAILABLE')],
    ]),
  );

  const first = buildReproductionCapabilityCensus({ records, classify });
  const second = buildReproductionCapabilityCensus({ records, classify });

  const keys = Object.keys(first.refusalDistribution);
  expect(keys).toEqual([...keys].sort());
  expect(isSorted(keys)).toBe(true);
  // Executable is not a refusal: four refused files, one executable, one
  // executable file excluded from the distribution.
  expect(first.refusalDistribution).toEqual({
    ENVIRONMENT_BLOCKED: 1,
    MODULE_ROOT_NOT_FOUND: 1,
    NO_SUPPORTED_EXECUTOR: 1,
    PACKAGE_TEST_FILES_ABSENT: 1,
    VENDOR_DIRECTORY_ABSENT: 1,
  });
  expect('EXECUTABLE_NOW' in first.refusalDistribution).toBe(false);
  expect(sumValues(first.refusalDistribution) + first.executableSourceFiles).toBe(
    first.eligibleSourceFiles,
  );
  // Deterministic across runs.
  expect(Object.keys(second.refusalDistribution)).toEqual(keys);
  expect(second.refusalDistribution).toEqual(first.refusalDistribution);
  for (const row of first.repositories) {
    const rowKeys = Object.keys(row.refusalDistribution);
    expect(rowKeys).toEqual([...rowKeys].sort());
  }
});

test('a truncated repository is reported and the top-level truncated flag is set', () => {
  const records: CensusSourceRecord[] = [
    record(ZERO_COVERAGE_REPO, 'pkg/auth/token.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
    ]),
    refused('VENDOR_DIRECTORY_ABSENT'),
  );

  const census = buildReproductionCapabilityCensus({
    records,
    classify,
    truncatedRepositories: [EXECUTABLE_REPO],
  });

  expect(census.truncated).toBe(true);
  expect(
    census.repositories.find((row) => row.repository === EXECUTABLE_REPO)!
      .enumerationTruncated,
  ).toBe(true);
  expect(
    census.repositories.find((row) => row.repository === ZERO_COVERAGE_REPO)!
      .enumerationTruncated,
  ).toBe(false);

  const complete = buildReproductionCapabilityCensus({ records, classify });
  expect(complete.truncated).toBe(false);
  expect(complete.repositories.every((row) => row.enumerationTruncated === false)).toBe(true);
});

test('exceeding maxRecords truncates deterministically rather than throwing', () => {
  const records: CensusSourceRecord[] = [
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/other.go'),
    record(EXECUTABLE_REPO, 'pkg/almuser/user.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/auth/token.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/store/store.go'),
    record(ZERO_COVERAGE_REPO, 'pkg/store/memory.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
      [`${EXECUTABLE_REPO}:pkg/almcreds/other.go`, supported('pkg/almcreds', 'pkg/almcreds/other.go')],
      [`${EXECUTABLE_REPO}:pkg/almuser/user.go`, supported('pkg/almuser', 'pkg/almuser/user.go')],
    ]),
    refused('VENDOR_DIRECTORY_ABSENT'),
  );

  let census: ReproductionCapabilityCensus | null = null;
  expect(() => {
    census = buildReproductionCapabilityCensus({ records, classify, maxRecords: 2 });
  }).not.toThrow();

  expect(census!.eligibleSourceFiles).toBe(2);
  expect(census!.executableSourceFiles).toBe(2);
  expect(census!.distinctExecutableTargets).toBe(1);
  expect(census!.truncated).toBe(true);
  // Only the bounded prefix was probed; nothing past the ceiling was classified.
  expect(classify.calls).toEqual([
    `${EXECUTABLE_REPO}:pkg/almcreds/creds.go`,
    `${EXECUTABLE_REPO}:pkg/almcreds/other.go`,
  ]);

  const whole = buildReproductionCapabilityCensus({ records, classify });
  expect(whole.eligibleSourceFiles).toBe(6);
  expect(whole.truncated).toBe(false);
});

test('malformed records are excluded from classification but counted, without throwing', () => {
  const records = [
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
    { repository: '', relativePath: 'pkg/almcreds/nowhere.go' },
    { repository: EXECUTABLE_REPO, relativePath: '' },
    { repository: 42, relativePath: 'pkg/almcreds/numeric.go' },
    { repository: EXECUTABLE_REPO, relativePath: null },
    null,
    'not-a-record',
  ] as unknown as readonly CensusSourceRecord[];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
    ]),
  );

  let census: ReproductionCapabilityCensus | null = null;
  expect(() => {
    census = buildReproductionCapabilityCensus({ records, classify });
  }).not.toThrow();

  // The valid record still classifies; nothing malformed reached the probe.
  expect(classify.calls).toEqual([`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`]);
  expect(census!.eligibleSourceFiles).toBe(7);
  expect(census!.executableSourceFiles).toBe(1);
  expect(census!.distinctExecutableTargets).toBe(1);
  // All six malformed records are counted, none minted a target.
  expect(census!.refusalDistribution['PATH_MALFORMED']).toBe(6);
  // The two malformed records that still name a usable repository are
  // attributed to its row; the rest live in the top-level totals only.
  const exec = census!.repositories.find((row) => row.repository === EXECUTABLE_REPO)!;
  expect(exec.eligibleSourceFiles).toBe(3);
  expect(exec.refusalDistribution).toEqual({ PATH_MALFORMED: 2 });
  expect(census!.repositories.map((row) => row.repository)).toEqual([EXECUTABLE_REPO]);
});

test('the serialized census contains no absolute path and no file list', () => {
  const records: CensusSourceRecord[] = [
    record(ZERO_COVERAGE_REPO, 'pkg/auth/token.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/creds.go'),
    record(EXECUTABLE_REPO, 'pkg/almcreds/other.go'),
    record(EXECUTABLE_REPO, 'pkg/notes/notes.go'),
  ];
  const classify = tableClassify(
    new Map<string, OwnerLocalTargetDiscovery>([
      [`${EXECUTABLE_REPO}:pkg/almcreds/creds.go`, supported('pkg/almcreds', 'pkg/almcreds/creds.go')],
      [`${EXECUTABLE_REPO}:pkg/almcreds/other.go`, supported('pkg/almcreds', 'pkg/almcreds/other.go')],
      [`${EXECUTABLE_REPO}:pkg/notes/notes.go`, refused('PACKAGE_TEST_FILES_ABSENT')],
    ]),
    refused('VENDOR_DIRECTORY_ABSENT'),
  );

  const census = buildReproductionCapabilityCensus({ records, classify });
  const serialized = JSON.stringify(census);

  expect(serialized).not.toContain('/home/');
  expect(serialized).not.toContain('/tmp/');
  expect(serialized).not.toContain('.go');
  expect(serialized).not.toContain('go test');
  expect(serialized).not.toContain('vendor');
  expect(serialized).not.toContain('GOPROXY');
  // No file-list shaped field exists anywhere in the contract.
  expect(Object.keys(census).sort()).toEqual([
    'distinctExecutableTargets',
    'eligibleSourceFiles',
    'executableSourceFiles',
    'refusalDistribution',
    'repositories',
    'schemaVersion',
    'truncated',
  ]);
  for (const row of census.repositories) {
    expect(Object.keys(row).sort()).toEqual([
      'distinctExecutableTargets',
      'eligibleSourceFiles',
      'enumerationTruncated',
      'executableSourceFiles',
      'refusalDistribution',
      'repository',
    ]);
  }
});
