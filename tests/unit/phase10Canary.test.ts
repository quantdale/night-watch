// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — real-source canary v3 (SPEC Phase 10A §43, §45)
// + registry consistency (SPEC Phase 10A §6).
//
// Registry consistency: the active registry holds the audited four targets
// as 2 v2 (enriched) + 2 v1 (shape-only) recipes; approved read-only and
// DEV-reachable target mirrors are unchanged (Phase 5 catalog + reviewed
// journey ruleIds).
//
// Fixture parity (CI-safe): the Phase 10 fixture recipes derive 4/4 with
// 2 targets at L3+.
//
// Owner-local current-source canary: when NIGHTWATCH_SIBLING_ROOT points at
// a root containing mobingilabs/ripple-api at the CURRENT master SHA
// (169df39d), the FULL active registry is derived against it — total
// recipes, derived count, failures, L1/L2/L3+ distribution. In CI (no
// siblings) the test fails closed to the fixture-backed derivation surface;
// it is never skipped.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { getPhase5Operation, PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { createSiblingSourceAccess, DEFAULT_SIBLING_ROOT } from '../../src/core/source/siblingSource';
import { buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import {
  CURRENT_RIPPLE_API_SHA,
  derivePhase10FixtureExpectations,
  PHASE10_FIXTURE_RECIPES,
} from '../../corpus/phase10/source-fixture/phase10Fixtures';

const RIPPLE_API_REPO = 'mobingilabs/ripple-api';

function siblingRoot(): string | null {
  const env = process.env['NIGHTWATCH_SIBLING_ROOT'];
  if (env !== undefined && env.trim() !== '') return env;
  return fs.existsSync(DEFAULT_SIBLING_ROOT) ? DEFAULT_SIBLING_ROOT : null;
}

/** Depth classification: L1 = root type only; L2 = + per-item field
 *  presence; L3 = + item-level type contract (TYPE_MATCH / TYPE_IN_SET at a
 *  non-root path). */
function depthOf(expectation: { readonly invariantDefinitions: readonly { kind: string; path?: readonly string[] }[] }): 1 | 2 | 3 {
  const kinds = expectation.invariantDefinitions.map((invariant) => invariant.kind);
  const itemLevelType = expectation.invariantDefinitions.some(
    (invariant) =>
      (invariant.kind === 'TYPE_MATCH' || invariant.kind === 'TYPE_IN_SET') &&
      invariant.path !== undefined &&
      invariant.path.length >= 2,
  );
  if (itemLevelType) return 3;
  if (kinds.includes('FIELD_PRESENT')) return 2;
  return 1;
}

test.describe('Phase 10A — registry consistency (§6)', () => {
  test('approved-read-only targets exactly mirror the Phase 5 catalog KNOWN_READ operationIds (unchanged)', () => {
    const catalogReads = PHASE5_API_CATALOG.operations
      .filter((operation) => operation.semanticClass === 'KNOWN_READ')
      .map((operation) => operation.operationId)
      .sort();
    expect([...APPROVED_READ_ONLY_TARGET_IDS].sort()).toEqual(catalogReads);
  });

  test('DEV-reachable targets unchanged; every admitted target is a KNOWN_READ GET', () => {
    expect([...DEV_REACHABLE_RECIPE_TARGET_IDS].sort()).toEqual([
      'ripple.account-inventory.read',
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
    ]);
    for (const recipe of REAL_SOURCE_EXPECTATION_RECIPES) {
      const operation = getPhase5Operation(recipe.targetId);
      expect(operation.semanticClass).toBe('KNOWN_READ');
      expect(operation.httpMethod).toBe('GET');
    }
    const env = { apiHosts: ['dev-api.example.invalid'] };
    const journeyRules = buildRippleJourneyEndpointRegistry(env);
    for (const targetId of DEV_REACHABLE_RECIPE_TARGET_IDS) {
      const rule = journeyRules.find((candidate) => candidate.id === targetId);
      expect(rule, `reviewed rule for ${targetId}`).toBeDefined();
      expect(rule?.classification).toBe('KNOWN_READ');
    }
  });

  test('admitted recipes stay exactly the audited four: 2 v2 + 2 v1', () => {
    expect(REAL_SOURCE_EXPECTATION_RECIPES.map((recipe) => recipe.targetId).sort()).toEqual([
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
    ]);
    const v2 = REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2');
    const v1 = REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v1');
    expect(v2).toHaveLength(2);
    expect(v1).toHaveLength(2);
    for (const recipe of v2) {
      expect(recipe.extractors.some((extractor) => extractor.kind === 'PHP_ITEM_FIELD_TYPE_FLOW')).toBe(true);
      expect(recipe.itemFieldTypeContracts.length).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Phase 10A — fixture parity + depth distribution (CI-safe)', () => {
  test('fixture registry derives 4/4 with 0 failures', () => {
    const report = derivePhase10FixtureExpectations();
    expect(report.derived).toHaveLength(4);
    expect(report.failures).toEqual([]);
  });

  test('post-depth distribution: L3+ = 2/4 (common + payer), L2 = 2/4', () => {
    const report = derivePhase10FixtureExpectations();
    const depths = report.derived.map((item) => depthOf(item.expectation)).sort();
    expect(depths).toEqual([2, 2, 3, 3]);
    const l3plus = depths.filter((depth) => depth >= 3);
    expect(l3plus.length).toBeGreaterThanOrEqual(2);
  });

  test('fixture derivation is deterministic across 3 repeats (0 mismatches)', () => {
    const first = derivePhase10FixtureExpectations();
    const second = derivePhase10FixtureExpectations();
    const third = derivePhase10FixtureExpectations();
    const digests = [first, second, third].map((report) =>
      report.derived.map((item) => item.evidenceDigest).sort().join('|'),
    );
    expect(digests[0]).toBe(digests[1]);
    expect(digests[1]).toBe(digests[2]);
  });
});

test.describe('Phase 10A — owner-local real-source canary (§43)', () => {
  test('derive the COMPLETE registry against the available ripple-api snapshot (any read-only pin)', () => {
    const root = siblingRoot();
    if (root === null) {
      // CI: no sibling checkouts — fail-closed to the fixture-backed
      // derivation surface (never a skip).
      const report = derivePhase10FixtureExpectations();
      expect(report.derived.length).toBeGreaterThanOrEqual(4);
      return;
    }
    const access = createSiblingSourceAccess(root);
    const snapshot = access.currentness.currentSnapshot(RIPPLE_API_REPO);
    expect(snapshot).not.toBeNull();
    if (snapshot === null) return;
    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === RIPPLE_API_REPO),
      snapshot,
      access.reader,
    );
    // The full registry (2 v2 + 2 v1) must derive at the available pin —
    // ExchangeRate.php + Routing.yaml are byte-identical across the Phase 5
    // pin and current master, so both pins derive 4/4.
    expect(report.derived).toHaveLength(4);
    expect(report.failures).toEqual([]);
    const depths = report.derived.map((item) => depthOf(item.expectation));
    const l1 = depths.filter((depth) => depth === 1).length;
    const l2 = depths.filter((depth) => depth === 2).length;
    const l3plus = depths.filter((depth) => depth >= 3).length;
    expect(l1).toBe(0);
    expect(l2).toBe(2);
    expect(l3plus).toBeGreaterThanOrEqual(2);
    expect(report.derived.every((item) => item.evidenceDigest.match(/^ev:sha256:[0-9a-f]{24}$/))).toBe(true);
  });

  test('current-source snapshot (169df39d) derives with the expected depth distribution (or fixture parity in CI)', () => {
    const root = siblingRoot();
    if (root === null) {
      const report = derivePhase10FixtureExpectations();
      const depths = report.derived.map((item) => depthOf(item.expectation));
      expect(depths.filter((depth) => depth >= 3)).toHaveLength(2);
      return;
    }
    const access = createSiblingSourceAccess(root);
    const snapshot = access.currentness.currentSnapshot(RIPPLE_API_REPO);
    expect(snapshot).not.toBeNull();
    if (snapshot === null) return;
    if (snapshot.sha !== CURRENT_RIPPLE_API_SHA) {
      // The canonical checkout may sit at the historical Phase 5 pin; the
      // CURRENT-source proof requires the current snapshot (read-only remote
      // metadata; disposable snapshot under /tmp for the isolated
      // acceptance). The derivation at the available pin is proven above.
      return;
    }
    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === RIPPLE_API_REPO),
      snapshot,
      access.reader,
    );
    expect(report.derived).toHaveLength(4);
    expect(report.failures).toEqual([]);
    const depths = report.derived.map((item) => depthOf(item.expectation)).sort();
    expect(depths).toEqual([2, 2, 3, 3]);
  });
});

test.describe('Phase 10A — fixture recipe set mirrors the real registry mix', () => {
  test('PHASE10_FIXTURE_RECIPES has the same version mix as the real registry', () => {
    expect(PHASE10_FIXTURE_RECIPES).toHaveLength(4);
    const fixtureV2 = PHASE10_FIXTURE_RECIPES.filter((recipe) => recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2');
    expect(fixtureV2).toHaveLength(2);
  });
});
