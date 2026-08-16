// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — bounded PHP extractor matrix (SPEC §12, §13, §14).
//
// Proves the fixed extractor vocabulary mechanically recovers the admitted
// contracts from synthetic PHP source WITHOUT executing it: PUSH and ASSIGN
// row-literal patterns, the builder-list pattern (multi-hop filter returns),
// route bindings, and the fail-closed negative classes.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  extractPhpFunctionListRowKeys,
  extractPhpFunctionReturnsListOfBuilder,
  extractPhpRouteGetBinding,
} from '../../src/oracles/expectations/extract/php';
import {
  accountFixture,
  billingGroupFixture,
  exchangeRateFixture,
  routingFixtureA,
  routingFixtureB,
  settingsFixture,
} from '../helpers/phase9a1Fixtures';

test.describe('Phase 9A.1 — PHP_FUNCTION_LIST_ROW_KEYS (PUSH)', () => {
  test('getCommonExchangeRate: 2 literal keys, top-level array', () => {
    const result = extractPhpFunctionListRowKeys(exchangeRateFixture, 'getCommonExchangeRate', 'res', 'PUSH');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect([...result.extraction.itemKeys].sort()).toEqual(['exchange_rate', 'month']);
    expect(result.extraction.pattern).toBe('PUSH');
    expect(result.extraction.rowLiteralCount).toBe(1);
  });

  test('getAccountExchangeForMonth: 4 literal keys', () => {
    const result = extractPhpFunctionListRowKeys(exchangeRateFixture, 'getAccountExchangeForMonth', 'res', 'PUSH');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect([...result.extraction.itemKeys].sort()).toEqual(['exchange_rate', 'id', 'name', 'vendor']);
  });

  test('getExchangeRateForBillingGroup: literal inside a conditional loop', () => {
    const result = extractPhpFunctionListRowKeys(billingGroupFixture, 'getExchangeRateForBillingGroup', 'res', 'PUSH');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect([...result.extraction.itemKeys].sort()).toEqual(['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate']);
  });

  test('function missing -> FUNCTION_NOT_FOUND', () => {
    const result = extractPhpFunctionListRowKeys(exchangeRateFixture, 'getMissingFunction', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('FUNCTION_NOT_FOUND');
  });

  test('accumulator never pushed -> ACCUMULATOR_NOT_FOUND', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $out = [];
        $out[] = ['a' => 1];
        return $out;
    }
}`;
    const result = extractPhpFunctionListRowKeys(source, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ACCUMULATOR_NOT_FOUND');
  });

  test('function returns something else -> TOP_LEVEL_NOT_ARRAY', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $res = [];
        $res[] = ['a' => 1];
        return ['not' => 'the accumulator'];
    }
}`;
    const result = extractPhpFunctionListRowKeys(source, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TOP_LEVEL_NOT_ARRAY');
  });

  test('no return -> TOP_LEVEL_NOT_ARRAY', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $res = [];
        $res[] = ['a' => 1];
    }
}`;
    const result = extractPhpFunctionListRowKeys(source, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TOP_LEVEL_NOT_ARRAY');
  });

  test('disagreeing row literals -> ITEM_KEYS_MISMATCH', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $res = [];
        $res[] = ['a' => 1];
        $res[] = ['a' => 1, 'b' => 2];
        return $res;
    }
}`;
    const result = extractPhpFunctionListRowKeys(source, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ITEM_KEYS_MISMATCH');
  });

  test('comments and strings do not disturb extraction', () => {
    const source = `<?php
// this is a comment with 'fake' => 'keys'
class X {
    /* block comment with 'x' => 1 */
    public function getData(): array {
        $res = []; // $res[] = ['wrong' => 1];
        $res[] = [
            'alpha' => 'one', // inline comment
            'beta' => 2,
        ];
        return $res;
    }
}`;
    const result = extractPhpFunctionListRowKeys(source, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect([...result.extraction.itemKeys].sort()).toEqual(['alpha', 'beta']);
  });
});

test.describe('Phase 9A.1 — PHP_FUNCTION_LIST_ROW_KEYS (ASSIGN) + builder list', () => {
  test('insertAccount ASSIGN: 15 literal keys', () => {
    const result = extractPhpFunctionListRowKeys(accountFixture, 'insertAccount', 'res', 'ASSIGN');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect(result.extraction.itemKeys).toHaveLength(15);
    expect(result.extraction.itemKeys).toContain('billinggroup_id');
    expect(result.extraction.itemKeys).toContain('entitlement_id');
    expect(result.extraction.itemKeys).toContain('payer');
  });

  test('getAccountVendor pushes builder rows and returns the filtered accumulator', () => {
    const result = extractPhpFunctionReturnsListOfBuilder(accountFixture, 'getAccountVendor', 'res', 'insertAccount');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_RETURNS_LIST_OF_BUILDER');
    if (result.extraction.kind !== 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER') return;
    expect(result.extraction.pushCount).toBe(2);
    expect(result.extraction.returnsAccumulatorList).toBe(true);
  });

  test('builder push missing -> BUILDER_PUSH_NOT_FOUND', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $res = [];
        $res[] = ['a' => 1];
        return $res;
    }
}`;
    const result = extractPhpFunctionReturnsListOfBuilder(source, 'getData', 'res', 'insertAccount');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('BUILDER_PUSH_NOT_FOUND');
  });

  test('accumulator returned as first argument after multi-hop chain', () => {
    const source = `<?php
class X {
    public function getData(): array {
        $res = [];
        $res[] = $this->buildRow(1);
        return $this->svc->filter($res, 'READ', 'company_id');
    }
}`;
    const result = extractPhpFunctionReturnsListOfBuilder(source, 'getData', 'res', 'buildRow');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_RETURNS_LIST_OF_BUILDER');
  });
});

test.describe('Phase 9A.1 — PHP_ROUTE_GET_BINDING', () => {
  test('route exists with the expected client+method', () => {
    const result = extractPhpRouteGetBinding(routingFixtureA, '/exchange_rate/global/{vendor}', 'App\\Handler\\ExchangeRate', 'getCommonExchangeRate');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_ROUTE_GET_BINDING');
  });

  test('route missing -> ROUTE_NOT_FOUND', () => {
    const result = extractPhpRouteGetBinding(routingFixtureA, '/no/such/route', 'App\\Handler\\X', 'y');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_NOT_FOUND');
  });

  test('wrong method binding -> ROUTE_BINDING_MISMATCH', () => {
    const result = extractPhpRouteGetBinding(routingFixtureA, '/exchange_rate/global/{vendor}', 'App\\Handler\\ExchangeRate', 'getWrongMethod');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_BINDING_MISMATCH');
  });

  test('wrong client -> ROUTE_BINDING_MISMATCH', () => {
    const result = extractPhpRouteGetBinding(routingFixtureA, '/accts', 'App\\Handler\\WrongClient', 'getAccountVendor');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_BINDING_MISMATCH');
  });

  test('repo-b settings route binds', () => {
    const result = extractPhpRouteGetBinding(routingFixtureB, '/settings/{vendor}', 'App\\Handler\\Settings', 'getCompanySettings');
    expect(result.ok).toBe(true);
  });

  test('comment-only block cannot fake a binding', () => {
    const yaml = `"get:/x":
    # client: App\\Handler\\X
    method: y
`;
    const result = extractPhpRouteGetBinding(yaml, '/x', 'App\\Handler\\X', 'y');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('ROUTE_BINDING_MISMATCH');
  });
});

test.describe('Phase 9A.1 — extractor bounds', () => {
  test('oversized source fails bounded (SOURCE_TOO_LARGE)', () => {
    const huge = `${'<?php\n'.padEnd(2_100_000, ' ')}\nclass X {}`;
    const result = extractPhpFunctionListRowKeys(huge, 'getData', 'res', 'PUSH');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('SOURCE_TOO_LARGE');
  });

  test('settings fixture extracts (repo-b domain)', () => {
    const result = extractPhpFunctionListRowKeys(settingsFixture, 'getCompanySettings', 'res', 'PUSH');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_FUNCTION_LIST_ROW_KEYS');
    if (result.extraction.kind !== 'PHP_FUNCTION_LIST_ROW_KEYS') return;
    expect([...result.extraction.itemKeys].sort()).toEqual(['display_name', 'enabled', 'setting_id']);
  });
});
