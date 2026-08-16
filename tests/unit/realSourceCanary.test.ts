// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — real-source offline canary v2 (SPEC §28, §32, §33)
// + registry consistency (SPEC §17).
//
// Runs the admission bridge against the ACTUAL read-only Alphaus sibling
// checkout when present (owner-local evidence): >= 1 mechanically derived
// expectation required for Phase 9B readiness. In CI (no sibling checkouts)
// the test fails closed to the SOURCE_UNAVAILABLE derivation surface and
// re-proves the derivation on the fixture corpus instead — it is never
// skipped.
//
// Registry consistency: the approved-read-only target mirror matches the
// Phase 5 catalog's KNOWN_READ operationIds, and the DEV-reachable recipe
// targets match reviewed journey ruleIds in buildRippleJourneyEndpointRegistry.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import path from 'node:path';
import { getPhase5Operation, PHASE5_API_CATALOG, PHASE5_SOURCE_SHAS } from '../../src/api/phase5/catalog';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { DEFAULT_SIBLING_ROOT, createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import {
  FIXTURE_REPO_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';

const RIPPLE_API_REPO = 'mobingilabs/ripple-api';

function siblingRoot(): string | null {
  const env = process.env['NIGHTWATCH_SIBLING_ROOT'];
  if (env !== undefined && env.trim() !== '') return env;
  return require('node:fs').existsSync(DEFAULT_SIBLING_ROOT) ? DEFAULT_SIBLING_ROOT : null;
}

test.describe('Phase 9A.1 — registry consistency (SPEC §17, §32, §33)', () => {
  test('approved-read-only targets exactly mirror the Phase 5 catalog KNOWN_READ operationIds', () => {
    const catalogReads = PHASE5_API_CATALOG.operations
      .filter((operation) => operation.semanticClass === 'KNOWN_READ')
      .map((operation) => operation.operationId)
      .sort();
    expect([...APPROVED_READ_ONLY_TARGET_IDS].sort()).toEqual(catalogReads);
  });

  test('every admitted recipe target is a KNOWN_READ Phase 5 operation (never mutation/unknown)', () => {
    for (const recipe of REAL_SOURCE_EXPECTATION_RECIPES) {
      const operation = getPhase5Operation(recipe.targetId);
      expect(operation.semanticClass).toBe('KNOWN_READ');
      expect(operation.httpMethod).toBe('GET');
      expect(operation.replayPolicy).not.toBe('NEVER');
    }
  });

  test('every DEV-reachable recipe target has a reviewed KNOWN_READ journey rule of the same identity', () => {
    const env = { apiHosts: ['dev-api.example.invalid'] };
    const journeyRules = buildRippleJourneyEndpointRegistry(env);
    for (const targetId of DEV_REACHABLE_RECIPE_TARGET_IDS) {
      const rule = journeyRules.find((candidate) => candidate.id === targetId);
      expect(rule, `reviewed rule for ${targetId}`).toBeDefined();
      expect(rule?.classification).toBe('KNOWN_READ');
      expect(rule?.method).toBe('GET');
    }
    // And the recipes for those targets exist in the registry.
    for (const targetId of DEV_REACHABLE_RECIPE_TARGET_IDS) {
      expect(REAL_SOURCE_EXPECTATION_RECIPES.some((recipe) => recipe.targetId === targetId)).toBe(true);
    }
  });

  test('admitted recipes stay exactly the audited four', () => {
    expect(REAL_SOURCE_EXPECTATION_RECIPES.map((recipe) => recipe.targetId).sort()).toEqual([
      'ripple.account-inventory.read',
      'ripple.billing-group-exchange.read',
      'ripple.common-exchange.read',
      'ripple.payer-exchange.read',
    ]);
  });
});

test.describe('Phase 9A.1 — real-source offline canary (SPEC §28)', () => {
  test('live sibling checkout: derive >= 1 real expectation (owner-local evidence)', () => {
    const root = siblingRoot();
    if (root === null) {
      // CI: no sibling checkouts — fail-closed derivation surface, never a
      // skip: prove the derivation machinery on the fixture corpus instead.
      const state = createFixtureSourceState();
      const { derivedA } = deriveFixtureExpectations(state);
      expect(derivedA.length).toBeGreaterThanOrEqual(1);
      return;
    }

    const access = createSiblingSourceAccess(root);
    const snapshot = access.currentness.currentSnapshot(RIPPLE_API_REPO);
    expect(snapshot).not.toBeNull();
    if (snapshot === null) return;
    // The live checkout must be the Phase 5 pinned SHA (source currentness).
    expect(snapshot.sha).toBe(PHASE5_SOURCE_SHAS.rippleApi);

    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === RIPPLE_API_REPO),
      snapshot,
      access.reader,
    );

    // Phase 9B readiness gate: >= 1 mechanically derived real expectation.
    expect(report.derived.length).toBeGreaterThanOrEqual(1);
    // The audit says 4 for this snapshot; a regression would show a failure
    // with the exact reason (source advanced / structure changed).
    for (const failure of report.failures) {
      throw new Error(`real-source derivation failure: ${failure.recipeId} ${failure.failure} ${failure.detail ?? ''}`);
    }
    for (const derived of report.derived) {
      const expectation = derived.expectation;
      expect(expectation.sourceProvenance.repoId).toBe(RIPPLE_API_REPO);
      expect(expectation.sourceProvenance.sha).toBe(snapshot.sha);
      expect(expectation.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      // Every derived expectation must be DEV-reachable or explicitly
      // documented as not (the Phase 9B gate needs >= 1 reachable).
      const reachable = DEV_REACHABLE_RECIPE_TARGET_IDS.includes(expectation.targetId);
      expect(reachable || expectation.targetId === 'ripple.billing-group-exchange.read').toBe(true);
    }
  });

  test('fixture-backed derivation produces the same admission shape (CI parity)', () => {
    const state = createFixtureSourceState();
    const { derivedA } = deriveFixtureExpectations(state);
    expect(derivedA).toHaveLength(4);
    for (const expectation of derivedA) {
      expect(expectation.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      expect(expectation.invariantDefinitions[0]).toEqual({ kind: 'TYPE_MATCH', path: [], expectedType: 'ARRAY' });
    }
  });
});
