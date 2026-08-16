// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — v2 admission matrix (SPEC Phase 10A §8, §24, §33,
// §44).
//
// Conforming derivation produces the deeper expectation (root ARRAY +
// FIELD_PRESENT + item-level TYPE_MATCH / TYPE_IN_SET) with the type-flow
// evidence bound into the digest; every deep-evidence mutation fails closed
// or re-derives differently; derivation is deterministic (3 repeats,
// 0 mismatches).
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import { deriveRealSourceExpectation, deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import { exchangeRateDeepFixture, routingDeepFixture } from '../../corpus/phase10/source-fixture/exchangeRateDeepFixture';
import {
  accountDeepFixture,
  billingGroupDeepFixture,
  CURRENT_RIPPLE_API_SHA,
  derivePhase10FixtureExpectations,
} from '../../corpus/phase10/source-fixture/phase10Fixtures';

function mapFor(files: Record<string, string>): ReturnType<typeof createMapSource> {
  return createMapSource([{ repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA, files }]);
}

const CURRENT_FILES = {
  'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
  'src/App/Route/Config/Routing.yaml': routingDeepFixture,
  'src/App/Handler/Account.php': accountDeepFixture,
  'src/App/Handler/BillingGroup.php': billingGroupDeepFixture,
};

test.describe('Phase 10A — conforming derivation (§8, §24.A)', () => {
  test('common-exchange v2 recipe derives with TYPE_MATCH OBJECT on exchange_rate', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const map = mapFor(CURRENT_FILES);
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { expectation } = result.derived;
    expect(expectation.expectationId).toBe('ripple.common-exchange.read.real-source-deep');
    expect(expectation.sourceProvenance.derivationVersion).toBe('nightwatch.real-source-expectation-derivation.v2');
    expect(expectation.sourceProvenance.sha).toBe(CURRENT_RIPPLE_API_SHA);
    expect(expectation.sourceProvenance.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    const kinds = expectation.invariantDefinitions.map((i) => i.kind);
    expect(kinds).toEqual(['TYPE_MATCH', 'FIELD_PRESENT', 'FIELD_PRESENT', 'TYPE_MATCH']);
    const typeInvariant = expectation.invariantDefinitions[3];
    expect(typeInvariant).toEqual({ kind: 'TYPE_MATCH', path: ['0', 'exchange_rate'], expectedType: 'OBJECT' });
  });

  test('payer-exchange v2 recipe derives with TYPE_IN_SET on exchange_rate', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.payer-exchange.read')!;
    const map = mapFor(CURRENT_FILES);
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { expectation } = result.derived;
    expect(expectation.expectationId).toBe('ripple.payer-exchange.read.real-source-deep');
    const typeInvariant = expectation.invariantDefinitions[expectation.invariantDefinitions.length - 1];
    expect(typeInvariant).toEqual({ kind: 'TYPE_IN_SET', path: ['0', 'exchange_rate'], allowedTypes: ['ARRAY', 'OBJECT'] });
  });

  test('fixture parity: 4 derived, 0 failures, both deep targets L3', () => {
    const report = derivePhase10FixtureExpectations();
    expect(report.derived).toHaveLength(4);
    const byTarget = new Map(report.derived.map((item) => [item.expectation.targetId, item.expectation]));
    const common = byTarget.get('fixture-10.common-exchange.read')!;
    const payer = byTarget.get('fixture-10.payer-exchange.read')!;
    expect(common.invariantDefinitions.some((i) => i.kind === 'TYPE_MATCH' && i.path.join('.') === '0.exchange_rate')).toBe(true);
    expect(payer.invariantDefinitions.some((i) => i.kind === 'TYPE_IN_SET' && i.path.join('.') === '0.exchange_rate')).toBe(true);
  });

  test('depth distribution: 2/4 targets carry an item-level type invariant', () => {
    const report = derivePhase10FixtureExpectations();
    const l3 = report.derived.filter((item) =>
      item.expectation.invariantDefinitions.some(
        (i) => (i.kind === 'TYPE_MATCH' || i.kind === 'TYPE_IN_SET') && i.path.length === 2,
      ),
    );
    expect(l3).toHaveLength(2);
  });
});

test.describe('Phase 10A — deep-evidence mutations fail closed (§44)', () => {
  function attempt(sourceText: string, targetId: string) {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === targetId)!;
    const map = mapFor({ ...CURRENT_FILES, 'src/App/Handler/ExchangeRate.php': sourceText });
    return deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
  }

  test('1. cast/type evidence removed -> derivation fails closed', () => {
    const withoutCast = exchangeRateDeepFixture.replace(
      `$exchange_rate = (object)$exchange_rate;`,
      `// cast removed`,
    );
    const result = attempt(withoutCast, 'ripple.common-exchange.read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('2. unsupported source type path added -> fails closed', () => {
    const withScalar = exchangeRateDeepFixture.replace(
      `            if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `            if (empty($exchange_rate)) {\n                $exchange_rate = 42;\n            }`,
    );
    const result = attempt(withScalar, 'ripple.common-exchange.read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('3. cast added to the payer path -> payer derivation fails closed', () => {
    const withCast = exchangeRateDeepFixture.replace(
      `            }\n            $res[] = [\n                'id' => $v['id'],`,
      `            }\n            $exchange_rate = (object)$exchange_rate;\n            $res[] = [\n                'id' => $v['id'],`,
    );
    const result = attempt(withCast, 'ripple.payer-exchange.read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('4. output-key source disconnected (field unbound) -> fails closed', () => {
    const unbound = exchangeRateDeepFixture.replace(
      `'exchange_rate' => $exchange_rate,`,
      `'exchange_rate' => $unrelated,`,
    );
    const result = attempt(unbound, 'ripple.common-exchange.read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('5. route binding changes -> derivation rejected', () => {
    const rebound = routingDeepFixture.replace('method: getCommonExchangeRate', 'method: getCommonExchangeRateRenamed');
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const map = mapFor({ ...CURRENT_FILES, 'src/App/Route/Config/Routing.yaml': rebound });
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_BINDING_MISMATCH');
  });

  test('6. row field mapping changes -> ITEM_KEYS_MISMATCH / digest change', () => {
    const rekeyed = exchangeRateDeepFixture.replace(`'month' => $month,`, `'month_extra' => $month,`);
    const result = attempt(rekeyed, 'ripple.common-exchange.read');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ITEM_KEYS_MISMATCH');
  });

  test('shape-only evidence unchanged while deep evidence changes -> deep digest still notices', () => {
    // Row keys and route stay identical; only the cast guard disappears. The
    // deep extraction fails closed even though the v1 shape extraction would
    // still succeed — proving the deep evidence is independently load-bearing.
    const withoutCast = exchangeRateDeepFixture.replace(`$exchange_rate = (object)$exchange_rate;`, `// cast removed`);
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const map = mapFor({ ...CURRENT_FILES, 'src/App/Handler/ExchangeRate.php': withoutCast });
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });
});

test.describe('Phase 10A — derivation determinism (§33) + digest binding (§23)', () => {
  test('3 repeats, 0 mismatches (same expectation bytes + digest)', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const runs = [0, 1, 2].map(() => {
      const map = mapFor(CURRENT_FILES);
      const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
      expect(result.ok).toBe(true);
      return result.ok ? { digest: result.derived.evidenceDigest, expectation: result.derived.expectation } : null;
    });
    expect(runs[0]?.digest).toBe(runs[1]?.digest);
    expect(runs[1]?.digest).toBe(runs[2]?.digest);
    expect(runs[0]?.expectation).toEqual(runs[1]?.expectation);
    expect(runs[1]?.expectation).toEqual(runs[2]?.expectation);
  });

  test('digest changes when deep evidence changes (subscript count participates)', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const base = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, mapFor(CURRENT_FILES).reader);
    expect(base.ok).toBe(true);
    const withExtraSubscript = exchangeRateDeepFixture.replace(
      `                        $exchange_rate[$v] = \${$v}[$month];`,
      `                        $exchange_rate[$v] = \${$v}[$month];\n                        $exchange_rate['jpy'] = 1.0;`,
    );
    const mutated = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, mapFor({ ...CURRENT_FILES, 'src/App/Handler/ExchangeRate.php': withExtraSubscript }).reader);
    expect(mutated.ok).toBe(true);
    if (base.ok && mutated.ok) {
      expect(mutated.derived.evidenceDigest).not.toBe(base.derived.evidenceDigest);
      expect(mutated.derived.expectation).not.toEqual(base.derived.expectation);
    }
  });

  test('digest is identical across independent derivations of the same snapshot (canonical form)', () => {
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
    const mapA = mapFor(CURRENT_FILES);
    const mapB = mapFor(CURRENT_FILES);
    const resultA = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, mapA.reader);
    const resultB = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, mapB.reader);
    expect(resultA.ok && resultB.ok).toBe(true);
    if (resultA.ok && resultB.ok) {
      expect(resultA.derived.evidenceDigest).toBe(resultB.derived.evidenceDigest);
      expect(resultA.derived.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
    }
  });

  test('registry-level derivation report: all 4 current-source recipes derive, 0 failures', () => {
    const map = mapFor(CURRENT_FILES);
    const report = deriveRealSourceExpectations(
      REAL_SOURCE_EXPECTATION_RECIPES.filter((recipe) => recipe.repoId === 'mobingilabs/ripple-api'),
      { repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA },
      map.reader,
    );
    expect(report.derived).toHaveLength(4);
    expect(report.failures).toEqual([]);
  });
});
