// ---------------------------------------------------------------------------
// Phase 15P A10 — local project health / readiness surface.
//
// Proves src/core/readiness/** (nightwatch.local-readiness.v1):
//   - category matrix per blocker kind plus deterministic precedence,
//   - JSON/text equivalence (both renderers derive from ONE model),
//   - determinism across repeated summarization/rendering,
//   - privacy screen (fail-closed on token-like blocker details; no sentinel
//     propagation through the model or either renderer),
//   - CLI smoke via child-process spawn of bin/nightwatch-status.mjs
//     (offline, read-only).
//
// Pure-library cases run over explicit synthetic inputs only; no network, no
// browser, no real environments, no credentials.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  EXPECTED_FROZEN_OPERATION_COUNT,
  renderLocalReadinessJson,
  renderLocalReadinessText,
  summarizeLocalReadiness,
} from '../../src/core/readiness/localReadiness';
import { collectLocalReadinessInputFromRepo } from '../../src/core/readiness/repoState';
import type {
  LocalReadinessBlocker,
  LocalReadinessContractFamily,
  LocalReadinessInput,
} from '../../src/core/readiness/types';

const STATUS_BIN = path.join(__dirname, '..', '..', 'bin', 'nightwatch-status.mjs');

function family(overrides: Partial<LocalReadinessContractFamily> = {}): LocalReadinessContractFamily {
  return {
    familyId: 'lifecycle:x.a.read.deep-expectation',
    targetId: 'x.a.read',
    kind: 'DEEP_TYPE',
    hasExpectationId: true,
    campaignEligible: true,
    historicalImmutable: false,
    ...overrides,
  };
}

function baseInput(overrides: {
  applies?: boolean;
  families?: LocalReadinessContractFamily[];
  currentnessByTargetId?: Record<string, LocalReadinessInput['sourceContracts']['currentnessByTargetId'][string]>;
  pinnedVersions?: Record<string, string>;
  observedVersions?: Record<string, string> | null;
  checkpointCompatibility?: LocalReadinessInput['checkpointCompatibility'];
  unresolvedBlockers?: LocalReadinessBlocker[];
  externalCi?: LocalReadinessInput['externalCi'];
  ownerScopeStatus?: string;
  ownerScopeReason?: string;
  frozenOperationCount?: number;
} = {}): LocalReadinessInput {
  return {
    applies: overrides.applies ?? true,
    sourceContracts: {
      approvedTargetIds: ['x.a.read'],
      families: overrides.families ?? [family()],
      currentnessByTargetId: overrides.currentnessByTargetId ?? { 'x.a.read': 'CURRENT' },
    },
    campaign: {
      pinnedVersions: overrides.pinnedVersions ?? { schemaV: 'nightwatch.schema.v1' },
      observedVersions: overrides.observedVersions !== undefined
        ? overrides.observedVersions
        : { schemaV: 'nightwatch.schema.v1' },
    },
    checkpointCompatibility: overrides.checkpointCompatibility ?? 'CURRENT_SCHEMA',
    unresolvedBlockers: overrides.unresolvedBlockers ?? [],
    externalCi: overrides.externalCi ?? 'PASS',
    ownerScope: {
      status: overrides.ownerScopeStatus ?? 'FROZEN_BY_OWNER',
      reason: overrides.ownerScopeReason ?? 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
      frozenOperationCount: overrides.frozenOperationCount ?? EXPECTED_FROZEN_OPERATION_COUNT,
    },
  };
}

function blocker(kind: LocalReadinessBlocker['kind'], code: string): LocalReadinessBlocker {
  return { kind, code };
}

// ---------------------------------------------------------------------------
// 1. Category matrix per blocker kind (+ precedence and fail-closed inputs).
// ---------------------------------------------------------------------------

test.describe('phase15p local readiness category matrix', () => {
  test('healthy local input resolves READY_LOCAL_SYNTHETIC with fixed scope markers', () => {
    const summary = summarizeLocalReadiness(baseInput());
    expect(summary.category).toBe('READY_LOCAL_SYNTHETIC');
    expect(summary.scope).toBe('LOCAL_SYNTHETIC');
    expect(summary.readyClaim).toBe('LOCAL_SYNTHETIC_ONLY');
    expect(summary.modelVersion).toBe('nightwatch.local-readiness.v1');
    // No DEV/production-ready category can ever be produced.
    const categories = new Set(Object.values(summary));
    expect(categories.has('READY_DEV')).toBe(false);
    expect(categories.has('READY_PRODUCTION')).toBe(false);
  });

  test('each blocker kind maps onto its own blocking category', () => {
    expect(
      summarizeLocalReadiness(baseInput({ unresolvedBlockers: [blocker('AUTHORITY', 'OWNER_GATE_REQUIRED')] })).category,
    ).toBe('BLOCKED_AUTHORITY');
    expect(
      summarizeLocalReadiness(baseInput({ unresolvedBlockers: [blocker('SOURCE', 'CONTRACT_STALE')] })).category,
    ).toBe('BLOCKED_SOURCE');
    expect(
      summarizeLocalReadiness(baseInput({ unresolvedBlockers: [blocker('VERSION', 'MANIFEST_DRIFT')] })).category,
    ).toBe('BLOCKED_VERSION');
    expect(
      summarizeLocalReadiness(baseInput({ unresolvedBlockers: [blocker('EXTERNAL_CI', 'CI_RED')] })).category,
    ).toBe('BLOCKED_EXTERNAL_CI');
  });

  test('owner-scope marker drift blocks authority even without explicit blockers', () => {
    expect(summarizeLocalReadiness(baseInput({ ownerScopeStatus: 'UNFROZEN' })).category).toBe('BLOCKED_AUTHORITY');
    expect(summarizeLocalReadiness(baseInput({ ownerScopeReason: 'OTHER_REASON' })).category).toBe('BLOCKED_AUTHORITY');
    expect(
      summarizeLocalReadiness(baseInput({ frozenOperationCount: EXPECTED_FROZEN_OPERATION_COUNT + 1 })).category,
    ).toBe('BLOCKED_AUTHORITY');
    const summary = summarizeLocalReadiness(baseInput({ ownerScopeStatus: 'UNFROZEN' }));
    expect(summary.ownerScope.matchesFrozenMarkers).toBe(false);
  });

  test('structural source-contract gaps block SOURCE', () => {
    const missing = summarizeLocalReadiness(baseInput({ families: [] }));
    expect(missing.category).toBe('BLOCKED_SOURCE');
    expect(missing.sourceContracts.targetsMissingActiveFamily).toEqual(['x.a.read']);

    const unknown = summarizeLocalReadiness(baseInput({ families: [family({ targetId: 'unapproved.target' })] }));
    expect(unknown.category).toBe('BLOCKED_SOURCE');
    expect(unknown.sourceContracts.unknownFamilyTargets).toEqual(['unapproved.target']);
  });

  test('currentness categories: STALE and SOURCE_UNAVAILABLE block, CURRENT and NOT_EVALUATED do not', () => {
    expect(summarizeLocalReadiness(baseInput({ currentnessByTargetId: { 'x.a.read': 'STALE' } })).category).toBe('BLOCKED_SOURCE');
    expect(
      summarizeLocalReadiness(baseInput({ currentnessByTargetId: { 'x.a.read': 'SOURCE_UNAVAILABLE' } })).category,
    ).toBe('BLOCKED_SOURCE');
    expect(summarizeLocalReadiness(baseInput({ currentnessByTargetId: { 'x.a.read': 'NOT_EVALUATED' } })).category).toBe(
      'READY_LOCAL_SYNTHETIC',
    );
    const stale = summarizeLocalReadiness(baseInput({ currentnessByTargetId: { 'x.a.read': 'STALE' } }));
    expect(stale.sourceContracts.staleTargets).toEqual(['x.a.read']);
    expect(stale.sourceContracts.currentnessCounts.STALE).toBe(1);
  });

  test('campaign version drift and INCOMPATIBLE checkpoints block VERSION; UNMEASURED and LEGACY do not', () => {
    const drift = summarizeLocalReadiness(baseInput({ observedVersions: { schemaV: 'nightwatch.schema.v0' } }));
    expect(drift.category).toBe('BLOCKED_VERSION');
    expect(drift.campaign.category).toBe('DRIFT_DETECTED');
    expect(drift.campaign.driftKeys).toEqual(['schemaV']);

    const unmeasured = summarizeLocalReadiness(baseInput({ observedVersions: null }));
    expect(unmeasured.category).toBe('READY_LOCAL_SYNTHETIC');
    expect(unmeasured.campaign.category).toBe('UNMEASURED');
    expect(unmeasured.campaign.unmeasured).toBe(true);

    expect(
      summarizeLocalReadiness(baseInput({ checkpointCompatibility: 'INCOMPATIBLE' })).category,
    ).toBe('BLOCKED_VERSION');
    expect(
      summarizeLocalReadiness(baseInput({ checkpointCompatibility: 'LEGACY_PRE_S2_RUNTIME_CONTRACTS' })).category,
    ).toBe('READY_LOCAL_SYNTHETIC');
  });

  test('external CI categories: FAIL and BLOCKED_EXTERNAL_CI block; PASS and UNKNOWN do not', () => {
    expect(summarizeLocalReadiness(baseInput({ externalCi: 'FAIL' })).category).toBe('BLOCKED_EXTERNAL_CI');
    expect(summarizeLocalReadiness(baseInput({ externalCi: 'BLOCKED_EXTERNAL_CI' })).category).toBe('BLOCKED_EXTERNAL_CI');
    expect(summarizeLocalReadiness(baseInput({ externalCi: 'UNKNOWN' })).category).toBe('READY_LOCAL_SYNTHETIC');
    expect(summarizeLocalReadiness(baseInput({ externalCi: 'PASS' })).category).toBe('READY_LOCAL_SYNTHETIC');
  });

  test('NOT_APPLICABLE short-circuits every blocker kind', () => {
    const summary = summarizeLocalReadiness(
      baseInput({
        applies: false,
        unresolvedBlockers: [
          blocker('AUTHORITY', 'A'),
          blocker('SOURCE', 'B'),
          blocker('VERSION', 'C'),
          blocker('EXTERNAL_CI', 'D'),
        ],
        externalCi: 'FAIL',
      }),
    );
    expect(summary.category).toBe('NOT_APPLICABLE');
    expect(summary.applies).toBe(false);
    expect(summary.unresolvedBlockers).toHaveLength(4);
  });

  test('precedence is deterministic: AUTHORITY > SOURCE > VERSION > EXTERNAL_CI > ready', () => {
    const all = baseInput({
      unresolvedBlockers: [
        blocker('EXTERNAL_CI', 'CI'),
        blocker('VERSION', 'VER'),
        blocker('SOURCE', 'SRC'),
        blocker('AUTHORITY', 'AUTH'),
      ],
      externalCi: 'FAIL',
    });
    expect(summarizeLocalReadiness(all).category).toBe('BLOCKED_AUTHORITY');

    const noAuthority = baseInput({
      unresolvedBlockers: [blocker('EXTERNAL_CI', 'CI'), blocker('VERSION', 'VER'), blocker('SOURCE', 'SRC')],
      externalCi: 'FAIL',
    });
    expect(summarizeLocalReadiness(noAuthority).category).toBe('BLOCKED_SOURCE');

    const noSource = baseInput({
      unresolvedBlockers: [blocker('EXTERNAL_CI', 'CI'), blocker('VERSION', 'VER')],
      externalCi: 'FAIL',
    });
    expect(summarizeLocalReadiness(noSource).category).toBe('BLOCKED_VERSION');

    // Blockers normalize to kind order then code order.
    const normalized = summarizeLocalReadiness(all).unresolvedBlockers;
    expect(normalized.map((entry) => `${entry.kind}:${entry.code}`)).toEqual([
      'AUTHORITY:AUTH',
      'SOURCE:SRC',
      'VERSION:VER',
      'EXTERNAL_CI:CI',
    ]);
  });

  test('invalid inputs fail closed with exact codes', () => {
    expect(() => summarizeLocalReadiness(baseInput({ unresolvedBlockers: [{ kind: 'GENERAL' as never, code: 'X' }] })))
      .toThrow(/READINESS_INVALID_BLOCKER:kind/);
    expect(() => summarizeLocalReadiness(baseInput({ unresolvedBlockers: [blocker('SOURCE', 'lowercase_code')] })))
      .toThrow(/READINESS_INVALID_BLOCKER:code/);
    expect(() =>
      summarizeLocalReadiness(baseInput({ currentnessByTargetId: { 'x.a.read': 'FRESH' as never } })),
    ).toThrow(/READINESS_INVALID_CURRENTNESS/);
    expect(() => summarizeLocalReadiness(baseInput({ checkpointCompatibility: 'WHATEVER' as never })))
      .toThrow(/READINESS_INVALID_CHECKPOINT/);
    expect(() => summarizeLocalReadiness(baseInput({ externalCi: 'GREEN' as never })))
      .toThrow(/READINESS_INVALID_EXTERNAL_CI/);
    expect(() =>
      summarizeLocalReadiness(baseInput({ families: [family(), family()] })),
    ).toThrow(/READINESS_INVALID_FAMILIES:duplicate-family-id/);
    expect(() =>
      summarizeLocalReadiness({
        ...baseInput(),
        sourceContracts: { approvedTargetIds: [], families: [], currentnessByTargetId: {} },
      }),
    ).toThrow(/READINESS_INVALID_TARGETS:empty/);
    expect(() =>
      summarizeLocalReadiness(baseInput({ pinnedVersions: { ok: 'v1', bad: '' } })),
    ).toThrow(/READINESS_INVALID_VERSIONS:bad/);
  });
});

// ---------------------------------------------------------------------------
// 2. JSON/text equivalence — both renderers derive from the ONE model.
// ---------------------------------------------------------------------------

test.describe('phase15p local readiness renderers', () => {
  test('JSON round-trips exactly to the summary model', () => {
    const summary = summarizeLocalReadiness(
      baseInput({ unresolvedBlockers: [blocker('SOURCE', 'CONTRACT_STALE')], externalCi: 'UNKNOWN' }),
    );
    const parsed = JSON.parse(renderLocalReadinessJson(summary)) as typeof summary;
    expect(parsed).toEqual(summary);
  });

  test('text rendering carries the same facts as the model', () => {
    const summary = summarizeLocalReadiness(
      baseInput({
        unresolvedBlockers: [blocker('VERSION', 'MANIFEST_DRIFT'), blocker('SOURCE', 'CONTRACT_STALE')],
        currentnessByTargetId: { 'x.a.read': 'STALE' },
        externalCi: 'FAIL',
      }),
    );
    const text = renderLocalReadinessText(summary);
    const lines = text.split('\n').filter((line) => line !== '');
    expect(lines[0]).toBe(`nightwatch local readiness ${summary.modelVersion}`);
    expect(text).toContain(`category: ${summary.category}`);
    expect(text).toContain(`scope: ${summary.scope}`);
    expect(text).toContain(`checkpoint: ${summary.checkpointCompatibility}`);
    expect(text).toContain(`external-ci: ${summary.externalCi}`);
    expect(text).toContain(`campaign: ${summary.campaign.category}`);
    expect(text).toContain(`blockers: ${summary.unresolvedBlockers.length}`);
    expect(text).toContain('  - SOURCE CONTRACT_STALE');
    expect(text).toContain('  - VERSION MANIFEST_DRIFT');
    expect(text).toContain(`owner-scope: ${summary.ownerScope.status} / ${summary.ownerScope.reason}`);
    // Fixed line inventory guards against renderer/model logic drift.
    const prefixes = lines.map((line) => line.trim().split(/[:( ]/, 1)[0]);
    expect(prefixes).toEqual([
      'nightwatch',
      'category',
      'scope',
      'source-contracts',
      'currentness',
      'coverage',
      'campaign',
      'checkpoint',
      'analyzer',
      'verification',
      'external-ci',
      'owner-scope',
      'blockers',
      '-',
      '-',
    ]);
  });

  test('coverage counts in text match the model entries', () => {
    const input = baseInput({
      families: [
        family(),
        family({ familyId: 'lifecycle:x.a.read.probe', kind: 'MECHANICAL_PROBE', hasExpectationId: false }),
      ],
    });
    const summary = summarizeLocalReadiness(input);
    expect(summary.approvedTargetCoverage).toEqual([
      { targetId: 'x.a.read', coverage: 'COVERED', activeFamilies: 2, currentness: 'CURRENT' },
    ]);
    expect(renderLocalReadinessText(summary)).toContain('coverage: covered=1 partial=0 missing=0');

    const partial = summarizeLocalReadiness(
      baseInput({ families: [family({ hasExpectationId: false, campaignEligible: false })] }),
    );
    expect(partial.approvedTargetCoverage[0]?.coverage).toBe('PARTIAL');
    expect(renderLocalReadinessText(partial)).toContain('coverage: covered=0 partial=1 missing=0');
  });
});

// ---------------------------------------------------------------------------
// 3. Determinism — fixed inputs yield identical output, >= 3 repeats.
// ---------------------------------------------------------------------------

test.describe('phase15p local readiness determinism', () => {
  test('summarization and both renderings are byte-stable across repeats', () => {
    const make = () =>
      summarizeLocalReadiness(
        baseInput({
          families: [
            family(),
            family({ familyId: 'lifecycle:x.a.read.collection', kind: 'COLLECTION' }),
            family({
              familyId: 'lifecycle:x.a.read.archived',
              kind: 'ARCHIVED_HISTORICAL_SHAPE',
              historicalImmutable: true,
              campaignEligible: false,
            }),
          ],
          unresolvedBlockers: [blocker('EXTERNAL_CI', 'CI_UNKNOWN')],
          externalCi: 'UNKNOWN',
        }),
      );
    const first = make();
    for (let i = 0; i < 3; i += 1) {
      const repeat = make();
      expect(repeat).toEqual(first);
      expect(JSON.stringify(repeat)).toBe(JSON.stringify(first));
      expect(renderLocalReadinessJson(repeat)).toBe(renderLocalReadinessJson(first));
      expect(renderLocalReadinessText(repeat)).toBe(renderLocalReadinessText(first));
    }
    // Sorted, stable identity-bearing lists. Kinds are counted verbatim
    // (including archived); kinds with zero families get no key at all.
    expect(first.sourceContracts.familiesByKind).toEqual({
      COLLECTION: 1,
      DEEP_TYPE: 1,
      ARCHIVED_HISTORICAL_SHAPE: 1,
    });
  });

  test('no timestamps or volatile fields exist anywhere in the model', () => {
    const summary = summarizeLocalReadiness(baseInput());
    const flattened = JSON.stringify(summary);
    expect(flattened).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(flattened).not.toMatch(/[0-9a-f]{12,}/i);
    expect(Object.keys(summary)).not.toContain('generatedAt');
    expect(Object.keys(summary)).not.toContain('checkedAt');
  });
});

// ---------------------------------------------------------------------------
// 4. Privacy screen — fail-closed details, no sentinel propagation.
// ---------------------------------------------------------------------------

test.describe('phase15p local readiness privacy screen', () => {
  const SENTINELS = [
    'SUPER_SECRET_TOKEN_VALUE_123456',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'Set-Cookie: session=abcdef0123456789',
    'aws_secret_access_key=wJalrXUtnFEMI',
  ];

  test('token-like blocker details are rejected fail-closed', () => {
    for (const detail of SENTINELS) {
      expect(() =>
        summarizeLocalReadiness(baseInput({ unresolvedBlockers: [{ kind: 'SOURCE', code: 'HAS_DETAIL', detail }] })),
      ).toThrow(/READINESS_PRIVACY_BLOCKED:blocker-detail/);
    }
    // Non-categorical charset fails closed too.
    expect(() =>
      summarizeLocalReadiness(
        baseInput({ unresolvedBlockers: [{ kind: 'SOURCE', code: 'HAS_DETAIL', detail: 'value; curl http://x' }] }),
      ),
    ).toThrow(/READINESS_PRIVACY_BLOCKED:blocker-detail/);
    // Bounded categorical detail is accepted.
    expect(() =>
      summarizeLocalReadiness(
        baseInput({ unresolvedBlockers: [{ kind: 'SOURCE', code: 'HAS_DETAIL', detail: 'stale snapshot' }] }),
      ),
    ).not.toThrow();
  });

  test('unknown extra input fields never propagate into the model or renderings', () => {
    const contaminated = {
      ...family(),
      note: SENTINELS[0],
    } as unknown as LocalReadinessContractFamily;
    const summary = summarizeLocalReadiness(baseInput({ families: [contaminated] }));
    const json = renderLocalReadinessJson(summary);
    const text = renderLocalReadinessText(summary);
    for (const output of [JSON.stringify(summary), json, text]) {
      for (const sentinel of SENTINELS) {
        expect(output).not.toContain(sentinel);
      }
    }
  });

  test('healthy summaries carry no credential-shaped vocabulary at all', () => {
    const summary = summarizeLocalReadiness(baseInput());
    for (const output of [renderLocalReadinessJson(summary), renderLocalReadinessText(summary)]) {
      expect(output.toLowerCase()).not.toContain('bearer');
      expect(output.toLowerCase()).not.toContain('cookie');
      expect(output.toLowerCase()).not.toContain('password');
      expect(output.toLowerCase()).not.toContain('secret');
      expect(output.toLowerCase()).not.toContain('credential');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Repo adapter sanity + CLI smoke (offline, read-only child process).
// ---------------------------------------------------------------------------

test.describe('phase15p local readiness repo state + CLI smoke', () => {
  test('repo adapter produces a truthful, healthy local input', () => {
    const input = collectLocalReadinessInputFromRepo();
    expect(input.applies).toBe(true);
    expect(input.externalCi).toBe('UNKNOWN');
    expect(input.checkpointCompatibility).toBe('UNKNOWN');
    expect(input.campaign.observedVersions).toBeNull();
    expect(input.ownerScope.status).toBe('FROZEN_BY_OWNER');
    expect(input.ownerScope.frozenOperationCount).toBe(EXPECTED_FROZEN_OPERATION_COUNT);
    expect(input.sourceContracts.approvedTargetIds.length).toBeGreaterThan(0);

    const summary = summarizeLocalReadiness(input);
    expect(summary.category).toBe('READY_LOCAL_SYNTHETIC');
    expect(summary.sourceContracts.targetsMissingActiveFamily).toEqual([]);
    expect(summary.sourceContracts.unknownFamilyTargets).toEqual([]);
    expect(summary.approvedTargetCoverage.length).toBe(input.sourceContracts.approvedTargetIds.length);
  });

  test('CLI renders text for the current repo state with exit code 0', () => {
    const result = spawnSync(process.execPath, [STATUS_BIN], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, NIGHTWATCH_ENV: 'local' },
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('category: READY_LOCAL_SYNTHETIC');
    expect(result.stdout).toContain('ready claim: LOCAL_SYNTHETIC_ONLY');
    expect(result.stderr).toBe('');
  });

  test('CLI --json parses to the shared model and is stable across runs', () => {
    const first = spawnSync(process.execPath, [STATUS_BIN, '--json'], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, NIGHTWATCH_ENV: 'local' },
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(first.status).toBe(0);
    const parsedFirst = JSON.parse(first.stdout) as ReturnType<typeof summarizeLocalReadiness>;
    expect(parsedFirst.modelVersion).toBe('nightwatch.local-readiness.v1');
    expect(parsedFirst.category).toBe('READY_LOCAL_SYNTHETIC');
    expect(parsedFirst.scope).toBe('LOCAL_SYNTHETIC');

    const second = spawnSync(process.execPath, [STATUS_BIN, '--json'], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, NIGHTWATCH_ENV: 'local' },
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(second.status).toBe(0);
    expect(second.stdout).toBe(first.stdout);
  });
});
