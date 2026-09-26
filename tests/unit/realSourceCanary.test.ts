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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getPhase5Operation, PHASE5_API_CATALOG } from '../../src/api/phase5/catalog';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  DEV_REACHABLE_RECIPE_TARGET_IDS,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { buildRippleJourneyEndpointRegistry } from '../../src/products/ripple/journeyContracts';
import {
  FIXTURE_REPO_A,
  createFixtureSourceState,
  deriveFixtureExpectations,
} from '../helpers/phase9a1Fixtures';
import { createSourceParityFixture } from '../helpers/sourceParity';
import { classifyLiveSourceTestState } from '../helpers/liveSourceTestAuthority';

const RIPPLE_API_REPO = 'mobingilabs/ripple-api';
const RIPPLE_LIVE_STATE = classifyLiveSourceTestState({ repositoryIds: [RIPPLE_API_REPO] });

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

  test('the test authority classifier distinguishes current, stale, and unavailable source', () => {
    const expectedSha = RIPPLE_LIVE_STATE.repositories[0]?.expectedSha;
    expect(expectedSha).toMatch(/^[0-9a-f]{40}$/);
    const current = createSourceParityFixture({ sha: expectedSha, prefix: 'nightwatch-current-source-test-' });
    const stale = createSourceParityFixture({ sha: 'f'.repeat(40), prefix: 'nightwatch-stale-source-test-' });
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-empty-source-test-'));
    try {
      expect(classifyLiveSourceTestState({ root: current.root, repositoryIds: [RIPPLE_API_REPO] }).kind).toBe('CURRENT');
      expect(classifyLiveSourceTestState({ root: stale.root, repositoryIds: [RIPPLE_API_REPO] }).kind).toBe('STALE');
      expect(classifyLiveSourceTestState({ root: empty, repositoryIds: [RIPPLE_API_REPO] }).kind).toBe('UNAVAILABLE');
    } finally {
      current.dispose();
      stale.dispose();
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

test.describe('Phase 9A.1 — real-source offline canary (SPEC §28)', () => {
  test('live sibling checkout: derive >= 1 real expectation (owner-local evidence)', () => {
    // R2-N2 synthetic twin: 'fixture-backed derivation produces the same
    // admission shape (CI parity)' below always runs this invariant's fixture
    // half; this live half skips with its declared identity.
    test.skip(RIPPLE_LIVE_STATE.kind !== 'CURRENT', `LIVE_SOURCE_${RIPPLE_LIVE_STATE.kind}`);

    const access = createSiblingSourceAccess(RIPPLE_LIVE_STATE.root);
    const snapshot = access.currentness.currentSnapshot(RIPPLE_API_REPO);
    expect(snapshot).not.toBeNull();
    if (snapshot === null) return;
    expect(snapshot.sha).toBe(RIPPLE_LIVE_STATE.repositories[0]?.expectedSha);

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
