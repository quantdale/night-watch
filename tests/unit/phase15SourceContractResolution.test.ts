// ---------------------------------------------------------------------------
// Nightwatch Phase 15 Session 1, Workstream D — composed source-contract
// resolution (permanent unit proof).
//
// Pins resolveSourceContract end-to-end over the REAL production recipes and
// the lifecycle registry: happy path (RESOLVED_CURRENT with PROVEN terminal
// family), stale, unavailable (currentness-null AND snapshot-null routes),
// derivation failure (fail-closed NO_EXPECTATION), unknown target,
// probe-only target, drift attachment (unchanged + changed evidence),
// privacy-sentinel rejection, invalid snapshot-SHA rejection, the composed
// currentness agreement rules, version pinning, DTO field minimality, and
// determinism.
//
// Synthetic source only: the repository-owned Phase 11A.3 fixture text
// (mechanically satisfying every extractor of the four admitted real
// recipes) served through the bounded in-memory map source from the Phase
// 9A.1 fixtures. No DEV, no real product, no network.
//
// Documented unreachability: the collection-transform-failure branch of
// resolveSourceContract cannot be triggered through public params — every
// admitted recipe target is in the fixed collection table and the transform
// deterministically succeeds for a mechanically derived expectation (the
// phase11a3 suite proves this permanently). That branch's exact mapping is
// therefore pinned at unit level by reproducing its precise input condition
// (a mismatched positional invariant index) through the same low-level API
// the module calls, plus the same unified adapter the module applies.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  SOURCE_CONTRACT_RESOLUTION_VERSION,
  evaluateComposedCurrentness,
  resolveSourceContract,
} from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import type { ComposedSourceContractResolution } from '../../src/oracles/expectations/lifecycle/sourceContractResolution';
import { terminalContractFamilyForTarget } from '../../src/oracles/expectations/lifecycle/contractLifecycleRegistry';
import { unifiedFromCollectionAdmissionFailure } from '../../src/oracles/expectations/lifecycle/contractResultVocabulary';
import {
  deriveCollectionWideRealSourceExpectation,
  REAL_SOURCE_COLLECTION_EXPECTATION_IDS,
} from '../../src/oracles/expectations/collectionAdmission';
import { deriveRealSourceExpectation } from '../../src/oracles/expectations/admission';
import type { DerivedRealSourceExpectation } from '../../src/oracles/expectations/admission';
import { getRealSourceRecipe, APPROVED_READ_ONLY_TARGET_IDS } from '../../src/oracles/expectations/recipes/registry';
import { isEvidenceDigest } from '../../src/core/identity/canonicalDigest';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import type { MapSource } from '../helpers/phase9a1Fixtures';
import {
  accountFixture as realAccountFixture,
  billingGroupFixture as realBillingGroupFixture,
  exchangeRateFixture as realExchangeRateFixture,
  REAL_SOURCE_FIXTURE_REPO,
  REAL_SOURCE_FIXTURE_SHA,
  routingFixture as realRoutingFixture,
} from '../helpers/phase11a3Fixtures';

const REPO = REAL_SOURCE_FIXTURE_REPO;
const SHA = REAL_SOURCE_FIXTURE_SHA;
const OTHER_SHA = 'dddddddddddddddddddddddddddddddddddddddd';

const COMMON = 'ripple.common-exchange.read';
const PAYER = 'ripple.payer-exchange.read';
const ACCOUNT = 'ripple.account-inventory.read';
const BGX = 'ripple.billing-group-exchange.read';
const BGS = 'ripple.billing-groups.read';
const UNKNOWN_TARGET = 'ripple.does-not-exist.read';

const FILES = {
  'src/App/Handler/ExchangeRate.php': realExchangeRateFixture,
  'src/App/Handler/Account.php': realAccountFixture,
  'src/App/Handler/BillingGroup.php': realBillingGroupFixture,
  'src/App/Route/Config/Routing.yaml': realRoutingFixture,
};

function freshMap(): MapSource {
  return createMapSource([{ repoId: REPO, sha: SHA, files: FILES }]);
}

function resolveFrom(
  map: MapSource,
  targetId: string,
  extra?: {
    snapshot?: { repoId: string; sha: string } | null;
    previousEvidenceDigestByFamilyId?: Readonly<Record<string, string>>;
    analyzerProbe?: { status: string; evidenceDigest: string } | null;
  },
): ComposedSourceContractResolution {
  return resolveSourceContract({
    targetId,
    reader: map.reader,
    currentness: map.currentness,
    snapshot: extra?.snapshot !== undefined ? extra.snapshot : { repoId: REPO, sha: SHA },
    ...(extra?.previousEvidenceDigestByFamilyId !== undefined
      ? { previousEvidenceDigestByFamilyId: extra.previousEvidenceDigestByFamilyId }
      : {}),
    ...(extra?.analyzerProbe !== undefined ? { analyzerProbe: extra.analyzerProbe } : {}),
  });
}

function terminalFamilyIdOf(targetId: string): string {
  const outcome = terminalContractFamilyForTarget(targetId);
  if (!outcome.ok) throw new Error(`no terminal family for ${targetId}: ${outcome.reason}`);
  return outcome.family.familyId;
}

function terminalRecordOf(resolution: ComposedSourceContractResolution, targetId: string) {
  const familyId = terminalFamilyIdOf(targetId);
  const record = resolution.families.find((candidate) => candidate.familyId === familyId);
  if (record === undefined) throw new Error(`terminal family ${familyId} missing from resolution`);
  return record;
}

// ---------------------------------------------------------------------------

test.describe('Phase 15 Workstream D — composed source-contract resolution', () => {
  test('version constant is pinned', () => {
    expect(SOURCE_CONTRACT_RESOLUTION_VERSION).toBe('nightwatch.source-contract-resolution.v1');
  });

  test('happy path: fixture source at matching snapshot resolves CURRENT with PROVEN families', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON);

    expect(resolution.resolutionVersion).toBe(SOURCE_CONTRACT_RESOLUTION_VERSION);
    expect(resolution.targetId).toBe(COMMON);
    expect(resolution.kind).toBe('RESOLVED_CURRENT');

    // Registry order, active expectation families only: deep then collection;
    // the mechanical probe and the archived historical shape are excluded.
    expect(resolution.families.map((family) => family.kind)).toEqual(['DEEP_TYPE', 'COLLECTION']);
    const familyIds = resolution.families.map((family) => family.familyId);
    expect(familyIds).toContain('lifecycle:ripple.common-exchange.read.real-source-deep');
    expect(familyIds).toContain(`lifecycle:${REAL_SOURCE_COLLECTION_EXPECTATION_IDS[COMMON]!}`);
    expect(familyIds).not.toContain('lifecycle:mechanical-probe:ripple.common-exchange.read');
    expect(familyIds).not.toContain('lifecycle:ripple.common-exchange.read.real-source-shape');

    for (const family of resolution.families) {
      expect(family.currentnessClass).toBe('CURRENT');
      expect(family.unified.category).toBe('PROVEN');
      expect(family.unified.sourceValue).toBe('RESOLVED');
      expect(isEvidenceDigest(family.evidenceDigest)).toBe(true);
    }

    // Terminal (collection) family record is PROVEN/CURRENT with an ev digest.
    const terminal = terminalRecordOf(resolution, COMMON);
    expect(terminal.unified.category).toBe('PROVEN');
    expect(terminal.currentnessClass).toBe('CURRENT');
    expect(isEvidenceDigest(terminal.evidenceDigest)).toBe(true);

    expect(resolution.overall.category).toBe('PROVEN');
    expect(resolution.overall.sourceVocabulary).toBe('unified-aggregate');
    expect(resolution.drift).toBeNull();
    expect(resolution.detail).toBeUndefined();
  });

  test('happy path covers the v1 shape->collection chain too (account-inventory)', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, ACCOUNT);
    expect(resolution.kind).toBe('RESOLVED_CURRENT');
    expect(resolution.families.map((family) => family.kind)).toEqual(['HISTORICAL_SHAPE', 'COLLECTION']);
    expect(terminalRecordOf(resolution, ACCOUNT).unified.category).toBe('PROVEN');
    expect(resolution.overall.category).toBe('PROVEN');

    // Every remaining recipe target resolves current on the same fixture state.
    for (const targetId of [PAYER, BGX]) {
      const other = resolveFrom(map, targetId);
      expect(other.kind).toBe('RESOLVED_CURRENT');
      expect(other.overall.category).toBe('PROVEN');
    }
  });

  test('stale: currentness reporting a moved SHA yields STALE everywhere', () => {
    const map = freshMap();
    map.setSha(REPO, OTHER_SHA); // currentness now disagrees with the bound snapshot
    const resolution = resolveFrom(map, COMMON);

    expect(resolution.kind).toBe('STALE');
    expect(resolution.families.length).toBe(2);
    for (const family of resolution.families) {
      expect(family.currentnessClass).toBe('STALE');
      expect(family.unified.category).toBe('STALE');
      expect(family.unified.sourceValue).toBe('SOURCE_STALE');
      expect(isEvidenceDigest(family.evidenceDigest)).toBe(true);
    }
    expect(resolution.overall.category).toBe('STALE');
    expect(resolution.drift).toBeNull();
  });

  test('unavailable: currentness returning null yields SOURCE_UNAVAILABLE', () => {
    const map = freshMap();
    const nullCurrentness = { currentSnapshot: () => null };
    const resolution = resolveSourceContract({
      targetId: COMMON,
      reader: map.reader,
      currentness: nullCurrentness,
      snapshot: { repoId: REPO, sha: SHA },
    });

    expect(resolution.kind).toBe('SOURCE_UNAVAILABLE');
    for (const family of resolution.families) {
      expect(family.currentnessClass).toBe('UNAVAILABLE');
      expect(family.unified.category).toBe('UNAVAILABLE');
      expect(family.unified.sourceValue).toBe('SOURCE_UNAVAILABLE');
    }
    expect(resolution.overall.category).toBe('UNAVAILABLE');
    expect(resolution.drift).toBeNull();
  });

  test('unavailable: null snapshot skips derivation and records UNAVAILABLE with null digests', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON, { snapshot: null });

    expect(resolution.kind).toBe('SOURCE_UNAVAILABLE');
    expect(resolution.families.length).toBe(2);
    for (const family of resolution.families) {
      expect(family.currentnessClass).toBe('UNAVAILABLE');
      expect(family.unified.category).toBe('UNAVAILABLE');
      expect(family.unified.sourceVocabulary).toBe('derivation-failure');
      expect(family.unified.sourceValue).toBe('SOURCE_UNAVAILABLE');
      expect(family.evidenceDigest).toBeNull();
    }
    expect(resolution.overall.category).toBe('UNAVAILABLE');
  });

  test('derivation failure: corrupted source fails closed to NO_EXPECTATION with UNSUPPORTED records', () => {
    const map = freshMap();
    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', '<?php\nnamespace App\\Handler;\n\nclass ExchangeRate\n{\n}\n');
    const resolution = resolveFrom(map, COMMON);

    // No expectation family produced an evaluable expectation, so the
    // composed kind is NO_EXPECTATION (NOT_APPLICABLE classes are ignored and
    // the class list collapses to EMPTY) — never a success-looking kind.
    expect(resolution.kind).toBe('NO_EXPECTATION');
    expect(resolution.families.length).toBe(2);
    for (const family of resolution.families) {
      expect(family.currentnessClass).toBe('NOT_APPLICABLE');
      expect(family.evidenceDigest).toBeNull();
      expect(family.unified.sourceVocabulary).toBe('derivation-failure');
      expect(family.unified.sourceValue).toBe('FUNCTION_NOT_FOUND');
      expect(family.unified.category).toBe('UNSUPPORTED');
    }
    // The two UNSUPPORTED family unifieds aggregate to an UNSUPPORTED
    // overall (severity above the NOT_APPLICABLE floor) — informative and
    // never success-looking, while the composed kind stays NO_EXPECTATION.
    expect(resolution.overall.category).toBe('UNSUPPORTED');
    expect(resolution.overall.sourceVocabulary).toBe('unified-aggregate');
    expect(resolution.drift).toBeNull();
  });

  test('collection transform failure mapping pinned at unit level (branch unreachable via public params)', () => {
    // Reproduce the EXACT input condition the module's collection branch
    // handles: a derived positional expectation whose item invariants do not
    // start at the recipe's blueprint item index.
    const recipe = getRealSourceRecipe(COMMON);
    if (recipe === null) throw new Error('missing common-exchange recipe');
    const map = freshMap();
    const derived = deriveRealSourceExpectation(recipe, SHA, map.reader);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;

    const tampered = JSON.parse(JSON.stringify(derived.derived)) as DerivedRealSourceExpectation;
    for (const invariant of tampered.expectation.invariantDefinitions) {
      if ('path' in invariant && invariant.path.length > 0) {
        (invariant.path as string[])[0] = '9'; // mismatching item index
      }
    }

    const outcome = deriveCollectionWideRealSourceExpectation({ recipe, historical: tampered });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure).toBe('COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH');

    // The exact unified mapping the module applies to that failure.
    const unified = unifiedFromCollectionAdmissionFailure(outcome.failure, { targetId: COMMON });
    expect(unified.category).toBe('UNSUPPORTED');
    expect(unified.sourceVocabulary).toBe('collection-admission-failure');
    expect(unified.sourceValue).toBe('COLLECTION_ADMISSION_ITEM_INDEX_MISMATCH');

    // End-to-end counterpart: on healthy source the live transforms succeed,
    // so no resolved family ever carries a collection-admission failure.
    const healthy = resolveFrom(map, COMMON);
    for (const family of healthy.families) {
      expect(family.unified.sourceVocabulary).not.toBe('collection-admission-failure');
    }
  });

  test('unknown target: UNKNOWN_TARGET with NO_APPROVED_TARGET-sourced overall', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, UNKNOWN_TARGET);

    expect(resolution.kind).toBe('UNKNOWN_TARGET');
    expect(resolution.families).toEqual([]);
    expect(resolution.drift).toBeNull();
    expect(resolution.overall.category).toBe('NOT_APPLICABLE');
    expect(resolution.overall.sourceVocabulary).toBe('contract-drift-class');
    expect(resolution.overall.sourceValue).toBe('NO_APPROVED_TARGET');
  });

  test('probe-only target: NO_EXPECTATION with no evaluated families', () => {
    const map = freshMap();
    const probeTerminal = terminalContractFamilyForTarget(BGS);
    expect(probeTerminal.ok).toBe(true);
    if (probeTerminal.ok) expect(probeTerminal.family.kind).toBe('MECHANICAL_PROBE');

    const resolution = resolveFrom(map, BGS);
    expect(resolution.kind).toBe('NO_EXPECTATION');
    expect(resolution.families).toEqual([]);
    expect(resolution.drift).toBeNull();
    expect(resolution.overall.category).toBe('NOT_APPLICABLE');
  });

  test('MIXED_CURRENTNESS_BLOCKED is unreachable through public params (all targets agree)', () => {
    const map = freshMap();
    for (const targetId of APPROVED_READ_ONLY_TARGET_IDS) {
      const resolution = resolveFrom(map, targetId);
      expect(resolution.kind).not.toBe('MIXED_CURRENTNESS_BLOCKED');
    }
  });

  test('drift attached when previousEvidenceDigestByFamilyId supplied: unchanged evidence', () => {
    const map = freshMap();
    const baseline = resolveFrom(map, COMMON);
    const digest = terminalRecordOf(baseline, COMMON).evidenceDigest;
    if (digest === null) throw new Error('terminal digest unexpectedly null');

    const resolution = resolveFrom(map, COMMON, {
      previousEvidenceDigestByFamilyId: { [terminalFamilyIdOf(COMMON)]: digest },
    });
    expect(resolution.kind).toBe('RESOLVED_CURRENT');
    expect(resolution.drift).not.toBeNull();
    expect(resolution.drift?.driftClass).toBe('EVIDENCE_UNCHANGED_SHA_MOVED');
    expect(resolution.drift?.targetId).toBe(COMMON);
    expect(resolution.drift?.prevDigest).toBe(digest);
    expect(resolution.drift?.currDigest).toBe(digest);
    // Drift PROVEN + families PROVEN aggregate to PROVEN.
    expect(resolution.overall.category).toBe('PROVEN');
  });

  test('drift attached: changed evidence with both sides PROVEN is COMPATIBLE (PARTIAL overall)', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON, {
      previousEvidenceDigestByFamilyId: { [terminalFamilyIdOf(COMMON)]: 'ev:sha256:000000000000000000000000' },
    });
    expect(resolution.kind).toBe('RESOLVED_CURRENT');
    expect(resolution.drift?.driftClass).toBe('EVIDENCE_CHANGED_COMPATIBLE');
    // PARTIAL outranks PROVEN in the unified severity order.
    expect(resolution.overall.category).toBe('PARTIAL');
  });

  test('drift attached: stale composed outcome classifies SOURCE_STALE drift', () => {
    const map = freshMap();
    map.setSha(REPO, OTHER_SHA);
    const resolution = resolveFrom(map, COMMON, {
      previousEvidenceDigestByFamilyId: { [terminalFamilyIdOf(COMMON)]: 'ev:sha256:000000000000000000000000' },
    });
    expect(resolution.kind).toBe('STALE');
    expect(resolution.drift?.driftClass).toBe('SOURCE_STALE');
    expect(resolution.overall.category).toBe('STALE');
  });

  test('privacy sentinel rejection on caller-supplied probe status', () => {
    const map = freshMap();
    const digest = terminalRecordOf(resolveFrom(map, COMMON), COMMON).evidenceDigest ?? '';
    expect(() =>
      resolveFrom(map, COMMON, {
        analyzerProbe: { status: 'PROVEN PRIVACY_SENTINEL leak', evidenceDigest: digest },
      }),
    ).toThrow('RESOLUTION_PRIVACY_SENTINEL_REJECTED:analyzerProbe.status');
  });

  test('invalid snapshot sha rejection', () => {
    const map = freshMap();
    expect(() =>
      resolveSourceContract({
        targetId: COMMON,
        reader: map.reader,
        currentness: map.currentness,
        snapshot: { repoId: REPO, sha: 'not-a-valid-sha' },
      }),
    ).toThrow('RESOLUTION_INVALID_SNAPSHOT_SHA');
  });

  test('DTO field minimality and determinism', () => {
    const map = freshMap();
    const resolution = resolveFrom(map, COMMON);

    expect(Object.keys(resolution).sort()).toEqual([
      'drift',
      'families',
      'kind',
      'overall',
      'resolutionVersion',
      'targetId',
    ]);
    for (const family of resolution.families) {
      expect(Object.keys(family).sort()).toEqual([
        'currentnessClass',
        'derivationVersion',
        'evidenceDigest',
        'familyId',
        'kind',
        'unified',
      ]);
      expect(Object.keys(family.unified).sort()).toEqual([
        'category',
        'resultVersion',
        'sourceValue',
        'sourceVocabulary',
        'targetId',
      ]);
    }
    expect(Object.keys(resolution.overall).sort()).toEqual([
      'category',
      'resultVersion',
      'sourceValue',
      'sourceVocabulary',
      'targetId',
    ]);

    // Deterministic: identical inputs produce structurally identical output.
    const again = resolveFrom(freshMap(), COMMON);
    expect(JSON.stringify(again)).toBe(JSON.stringify(resolution));
  });
});

test.describe('Phase 15 Workstream D — evaluateComposedCurrentness agreement rules', () => {
  test('uniform classes agree', () => {
    expect(evaluateComposedCurrentness(['CURRENT'])).toEqual({ ok: true, agreed: 'CURRENT' });
    expect(evaluateComposedCurrentness(['CURRENT', 'CURRENT'])).toEqual({ ok: true, agreed: 'CURRENT' });
    expect(evaluateComposedCurrentness(['STALE', 'STALE'])).toEqual({ ok: true, agreed: 'STALE' });
    expect(evaluateComposedCurrentness(['UNAVAILABLE', 'UNAVAILABLE'])).toEqual({
      ok: true,
      agreed: 'UNAVAILABLE',
    });
  });

  test('NOT_APPLICABLE entries are ignored', () => {
    expect(evaluateComposedCurrentness(['NOT_APPLICABLE', 'CURRENT'])).toEqual({ ok: true, agreed: 'CURRENT' });
    expect(evaluateComposedCurrentness(['CURRENT', 'NOT_APPLICABLE', 'CURRENT'])).toEqual({
      ok: true,
      agreed: 'CURRENT',
    });
    expect(evaluateComposedCurrentness(['STALE', 'NOT_APPLICABLE'])).toEqual({ ok: true, agreed: 'STALE' });
  });

  test('mixed classes are rejected as MIXED_CURRENTNESS', () => {
    expect(evaluateComposedCurrentness(['CURRENT', 'STALE'])).toEqual({ ok: false, reason: 'MIXED_CURRENTNESS' });
    expect(evaluateComposedCurrentness(['CURRENT', 'UNAVAILABLE'])).toEqual({
      ok: false,
      reason: 'MIXED_CURRENTNESS',
    });
    expect(evaluateComposedCurrentness(['STALE', 'UNAVAILABLE', 'CURRENT'])).toEqual({
      ok: false,
      reason: 'MIXED_CURRENTNESS',
    });
    // NOT_APPLICABLE never participates in the disagreement.
    expect(evaluateComposedCurrentness(['NOT_APPLICABLE', 'CURRENT', 'STALE'])).toEqual({
      ok: false,
      reason: 'MIXED_CURRENTNESS',
    });
  });

  test('empty (or all-NOT_APPLICABLE) input is EMPTY', () => {
    expect(evaluateComposedCurrentness([])).toEqual({ ok: false, reason: 'EMPTY' });
    expect(evaluateComposedCurrentness(['NOT_APPLICABLE'])).toEqual({ ok: false, reason: 'EMPTY' });
    expect(evaluateComposedCurrentness(['NOT_APPLICABLE', 'NOT_APPLICABLE'])).toEqual({
      ok: false,
      reason: 'EMPTY',
    });
  });
});
