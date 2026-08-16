// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — deep source currentness + mutation canaries
// (SPEC Phase 10A §24, §44).
//
//   A. same source + same deep evidence          -> RESOLVED (CURRENT)
//   B. SHA changed, exact current re-derivation  -> fresh new expectation
//   C. deep source evidence changed              -> SOURCE_STALE (old
//      expectation can never remain current)
//   D. source unavailable                        -> SOURCE_UNAVAILABLE
//   E. unsupported new source pattern            -> derivation failure
// Plus the §44 source-mutation canaries: cast removed/added, unsupported
// type path, output-key disconnect, route drift — each fails closed at
// derivation or flips the resolver to SOURCE_STALE. No auto-rebinding.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { deriveRealSourceExpectation } from '../../src/oracles/expectations/admission';
import { createRealSourceResolver } from '../../src/oracles/expectations/resolver';
import { REAL_SOURCE_EXPECTATION_RECIPES } from '../../src/oracles/expectations/recipes/registry';
import { createMapSource } from '../helpers/phase9a1Fixtures';
import type { MapSource } from '../helpers/phase9a1Fixtures';
import { exchangeRateDeepFixture, routingDeepFixture } from '../../corpus/phase10/source-fixture/exchangeRateDeepFixture';
import { CURRENT_RIPPLE_API_SHA } from '../../corpus/phase10/source-fixture/phase10Fixtures';

const REPO = 'mobingilabs/ripple-api';
const FILES = {
  'src/App/Handler/ExchangeRate.php': exchangeRateDeepFixture,
  'src/App/Route/Config/Routing.yaml': routingDeepFixture,
};

function deriveCommon(map: MapSource, sha = CURRENT_RIPPLE_API_SHA) {
  const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.common-exchange.read')!;
  return deriveRealSourceExpectation(recipe, sha, map.reader);
}

test.describe('Phase 10A — source currentness matrix (§24)', () => {
  test('A — same source + same deep evidence: RESOLVED', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    const derived = deriveCommon(map);
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
  });

  test('B — SHA changed: STALE; exact current re-derivation yields a fresh expectation', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    const derived = deriveCommon(map);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    // The source advanced: the bound expectation is stale...
    const advancedSha = 'dddddddddddddddddddddddddddddddddddddddd';
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    });
    map.setSha(REPO, advancedSha);
    expect(resolver.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_STALE');
    // ...and only an explicit fresh derivation at the current snapshot
    // produces a NEW expectation bound to the new SHA (never silent re-bind).
    const fresh = deriveCommon(map, advancedSha);
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    expect(fresh.derived.expectation.sourceProvenance.sha).toBe(advancedSha);
    expect(fresh.derived.evidenceDigest).toBe(derived.derived.evidenceDigest); // identical evidence at identical structure
  });

  test('C — deep evidence changed: old expectation stale, re-derivation mismatches', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    const derived = deriveCommon(map);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    // Cast removed at the SAME sha (dirty tree): the type-flow extraction
    // fails closed -> the bound expectation can never resolve current.
    const withoutCast = exchangeRateDeepFixture.replace(`$exchange_rate = (object)$exchange_rate;`, `// cast removed`);
    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', withoutCast);
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    });
    expect(resolver.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_STALE');
    const rederive = deriveCommon(map);
    expect(rederive.ok).toBe(false);
    if (!rederive.ok) expect(rederive.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('D — source unavailable: SOURCE_UNAVAILABLE', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    const derived = deriveCommon(map);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    map.removeRepo(REPO);
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    });
    expect(resolver.resolve({ targetId: 'ripple.common-exchange.read' }).kind).toBe('SOURCE_UNAVAILABLE');
  });

  test('E — unsupported new source pattern: derivation failure (never weakened)', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    // Payer path gains an unguarded cast of a DIFFERENT variable — still an
    // unproven assignment pattern for exchange_rate.
    const mutated = exchangeRateDeepFixture.replace(
      `            }\n            $res[] = [\n                'id' => $v['id'],`,
      `            }\n            $exchange_rate = $other;\n            $res[] = [\n                'id' => $v['id'],`,
    );
    map.setFile(REPO, 'src/App/Handler/ExchangeRate.php', mutated);
    const recipe = REAL_SOURCE_EXPECTATION_RECIPES.find((r) => r.targetId === 'ripple.payer-exchange.read')!;
    const result = deriveRealSourceExpectation(recipe, CURRENT_RIPPLE_API_SHA, map.reader);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('no auto-rebinding: the resolver never re-binds a stale expectation', () => {
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]);
    const derived = deriveCommon(map);
    expect(derived.ok).toBe(true);
    if (!derived.ok) return;
    const advancedSha = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    map.setSha(REPO, advancedSha);
    // The stale expectation's provenance is untouched by resolution.
    const resolver = createRealSourceResolver({
      recipes: REAL_SOURCE_EXPECTATION_RECIPES,
      expectations: [derived.derived.expectation],
      reader: map.reader,
      currentness: map.currentness,
    });
    resolver.resolve({ targetId: 'ripple.common-exchange.read' });
    expect(derived.derived.expectation.sourceProvenance.sha).toBe(CURRENT_RIPPLE_API_SHA);
    expect(derived.derived.expectation.sourceProvenance.evidenceDigest).toBe(derived.derived.evidenceDigest);
  });
});

test.describe('Phase 10A — §44 source-mutation canaries', () => {
  test('1. cast/type evidence removed -> deeper type contract fails', () => {
    const withoutCast = exchangeRateDeepFixture.replace(`$exchange_rate = (object)$exchange_rate;`, `// cast removed`);
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Handler/ExchangeRate.php': withoutCast } }]);
    const result = deriveCommon(map);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('2. unsupported source type path added -> fail closed', () => {
    const mutated = exchangeRateDeepFixture.replace(
      `            if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `            if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            } else {\n                $exchange_rate = 'unexpected';\n            }`,
    );
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Handler/ExchangeRate.php': mutated } }]);
    const result = deriveCommon(map);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('3. finite-enum evidence is NOT load-bearing (no admitted finite-key contract)', () => {
    // Mutating CURRENCY_RANGE_VALIDATE must NOT change the derivation: the
    // constant is not part of any admitted contract's evidence (the deep
    // digest binds only the type-flow + row + route evidence). This is the
    // honest counterpart of "unrelated change leaves the digest unchanged".
    const mutated = exchangeRateDeepFixture.replace(`'inr' => [1, 999.00],`, `'inr' => [1, 500.00],`);
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Handler/ExchangeRate.php': mutated } }]);
    const base = deriveCommon(createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: FILES }]));
    const result = deriveCommon(map);
    expect(base.ok && result.ok).toBe(true);
    if (base.ok && result.ok) expect(result.derived.evidenceDigest).toBe(base.derived.evidenceDigest);
  });

  test('4. output-key variable disconnected from the field -> contract rejected', () => {
    const unbound = exchangeRateDeepFixture.replace(`'exchange_rate' => $exchange_rate,`, `'exchange_rate' => $rate,`);
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Handler/ExchangeRate.php': unbound } }]);
    const result = deriveCommon(map);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('5. route binding changes -> derivation rejected', () => {
    const rebound = routingDeepFixture.replace('method: getCommonExchangeRate', 'method: getCommonExchangeRateV2');
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Route/Config/Routing.yaml': rebound } }]);
    const result = deriveCommon(map);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_BINDING_MISMATCH');
  });

  test('6. shape-only evidence unchanged while deep evidence changes -> deep currentness notices', () => {
    const withoutCast = exchangeRateDeepFixture.replace(`$exchange_rate = (object)$exchange_rate;`, `// cast removed`);
    const map = createMapSource([{ repoId: REPO, sha: CURRENT_RIPPLE_API_SHA, files: { ...FILES, 'src/App/Handler/ExchangeRate.php': withoutCast } }]);
    const derived = deriveCommon(map);
    expect(derived.ok).toBe(false);
    // And the shape-only (v1) row/route extraction still succeeds on the
    // same mutated text — proving the deep evidence is what fails.
    const { extractPhpFunctionListRowKeys, extractPhpRouteGetBinding } = require('../../src/oracles/expectations/extract/php') as typeof import('../../src/oracles/expectations/extract/php');
    expect(extractPhpFunctionListRowKeys(withoutCast, 'getCommonExchangeRate', 'res', 'PUSH').ok).toBe(true);
    expect(extractPhpRouteGetBinding(routingDeepFixture, '/exchange_rate/global/{vendor}', 'App\\Handler\\ExchangeRate', 'getCommonExchangeRate').ok).toBe(true);
  });
});
