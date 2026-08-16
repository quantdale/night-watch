// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — expectation identity matrix (SPEC Phase 10A §11,
// §34).
//
// The historical `...real-source-shape` IDs remain historical-only; the new
// `...real-source-deep` IDs are stable, unambiguous, and never collide with
// the shape lineage. Receipts/fingerprints/dossiers use the deep identity
// for current contracts; the Phase 9B-R1 historical evidence (shape ID,
// derivation v1, old checkpoint) stays truthful and reproducible through
// the archived v1 recipes.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { deriveRealSourceExpectation } from '../../src/oracles/expectations/admission';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import { evaluateSemanticResponse, semanticFindingFingerprint } from '../../src/oracles/semantic';
import { exchangeRateDeepFixture, routingDeepFixture } from '../../corpus/phase10/source-fixture/exchangeRateDeepFixture';
import {
  CURRENT_RIPPLE_API_SHA,
  deriveArchivedBaselineExpectations,
  derivePhase10FixtureExpectations,
} from '../../corpus/phase10/source-fixture/phase10Fixtures';

test.describe('Phase 10A — identity model (§11, §34)', () => {
  test('the active registry carries deep IDs for the enriched targets only', () => {
    const common = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const payer = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.payer-exchange.read')!;
    expect(common.blueprint.expectationId).toBe('ripple.common-exchange.read.real-source-deep');
    expect(payer.blueprint.expectationId).toBe('ripple.payer-exchange.read.real-source-deep');
    // The two v2 (enriched) targets carry deep IDs; the two v1 targets keep
    // their historical shape IDs (unchanged depth, unchanged identity).
    const v2Ids = REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v2').map((recipe) => recipe.blueprint.expectationId);
    const v1Ids = REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.schemaVersion === 'nightwatch.real-source-expectation-recipe.v1').map((recipe) => recipe.blueprint.expectationId);
    expect(v2Ids.every((id) => id.endsWith('real-source-deep'))).toBe(true);
    expect(v1Ids.every((id) => id.endsWith('real-source-shape'))).toBe(true);
  });

  test('the shape IDs remain reproducible as historical-only via the archived v1 recipes', () => {
    const baseline = deriveArchivedBaselineExpectations();
    const ids = baseline.derived.map((item) => item.expectation.expectationId).sort();
    expect(ids).toEqual([
      'ripple.common-exchange.read.real-source-shape',
      'ripple.payer-exchange.read.real-source-shape',
    ]);
    for (const item of baseline.derived) {
      expect(item.expectation.sourceProvenance.derivationVersion).toBe('nightwatch.real-source-expectation-derivation.v1');
      expect(item.expectation.invariantDefinitions.every((i) => i.kind === 'TYPE_MATCH' || i.kind === 'FIELD_PRESENT')).toBe(true);
    }
  });

  test('deep IDs are distinct from shape IDs and from each other (no collision)', () => {
    const all = [
      'ripple.common-exchange.read.real-source-shape',
      'ripple.payer-exchange.read.real-source-shape',
      'ripple.common-exchange.read.real-source-deep',
      'ripple.payer-exchange.read.real-source-deep',
    ];
    expect(new Set(all).size).toBe(4);
  });

  test('deep expectations carry derivation v2 + a digest distinct from the v1 lineage', () => {
    const report = derivePhase10FixtureExpectations();
    const deep = report.derived.filter((item) => item.expectation.expectationId.endsWith('real-source-deep'));
    expect(deep).toHaveLength(2);
    for (const item of deep) {
      expect(item.expectation.sourceProvenance.derivationVersion).toBe('nightwatch.real-source-expectation-derivation.v2');
      expect(item.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    }
  });

  test('the v1 derivation digest differs from the v2 derivation digest (evidence differs)', () => {
    const baseline = deriveArchivedBaselineExpectations();
    const map = createMapSource([
      {
        repoId: 'mobingilabs/ripple-api',
        sha: CURRENT_RIPPLE_API_SHA,
        files: {
          'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
          'src/App/Route/Config/Routing.yaml': routingDeepFixture,
        },
      },
    ]);
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const deep = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(deep.ok).toBe(true);
    const shapeDigest = baseline.derived.find((item) => item.expectation.expectationId === 'ripple.common-exchange.read.real-source-shape')!.evidenceDigest;
    if (deep.ok) {
      expect(deep.derived.evidenceDigest).not.toBe(shapeDigest);
    }
  });

  test('findings and fingerprints bind the DEEP identity for current contracts', () => {
    const report = derivePhase10FixtureExpectations();
    const payer = report.derived.find((item) => item.expectation.targetId === 'fixture-10.payer-exchange.read')!;
    const evaluation = evaluateSemanticResponse({
      oracleId: 'oracle.phase10.identity',
      expectation: payer.expectation,
      rawValues: [[{ id: 'p1', vendor: 'aws', name: 'Payer', exchange_rate: 'broken' }]],
      sourceSnapshot: { repoId: payer.expectation.sourceProvenance.repoId, sha: payer.expectation.sourceProvenance.sha },
      operationId: payer.expectation.targetId,
    });
    expect(evaluation.outcome).toBe('ANOMALY');
    for (const finding of evaluation.findings) {
      expect(finding.expectationId).toBe('fixture-10.payer-exchange.read.real-source-deep');
      const fingerprint = semanticFindingFingerprint(finding);
      expect(fingerprint).toMatch(/^fp:sha256:[0-9a-f]{24}$/);
    }
  });

  test('the resolver keys on target identity and resolves the deep expectation only', () => {
    const map = createMapSource([
      {
        repoId: 'mobingilabs/ripple-api',
        sha: CURRENT_RIPPLE_API_SHA,
        files: {
          'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
          'src/App/Route/Config/Routing.yaml': routingDeepFixture,
        },
      },
    ]);
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const derived = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    });
    const resolution = resolver.resolve({ targetId: 'ripple.common-exchange.read' });
    expect(resolution.kind).toBe('RESOLVED');
    if (resolution.kind !== 'RESOLVED') return;
    expect(resolution.expectation.expectationId).toBe('ripple.common-exchange.read.real-source-deep');
  });
});
