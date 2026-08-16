// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — bounded PHP_ITEM_FIELD_TYPE_FLOW extractor matrix
// (SPEC Phase 10A §7, §32).
//
// Proves the fixed type-flow pattern vocabulary mechanically recovers the
// JSON type sets of `exchange_rate` from the current-source mirror WITHOUT
// executing PHP: EMPTY_CAST_OBJECT (common-exchange: empty case casts to
// {}), EMPTY_ARRAY_OR_STRING_KEYS (payer-exchange: [] when empty, keyed
// object otherwise), plus the fail-closed negative classes (§32) — every
// ambiguous case fails closed, never "best effort".
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  extractPhpItemFieldTypeFlow,
  extractPhpFunctionListRowKeys,
  extractPhpRouteGetBinding,
} from '../../src/oracles/expectations/extract/php';
import { evidenceDigestFor } from '../../src/oracles/expectations/extract/evidence';
import { exchangeRateDeepFixture, routingDeepFixture } from '../../corpus/phase10/source-fixture/exchangeRateDeepFixture';

test.describe('Phase 10A — PHP_ITEM_FIELD_TYPE_FLOW: positive (current-source mirror)', () => {
  test('common-exchange getCommonExchangeRate: EMPTY_CAST_OBJECT -> allowedJsonTypes [OBJECT]', () => {
    const result = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_ITEM_FIELD_TYPE_FLOW');
    if (result.extraction.kind !== 'PHP_ITEM_FIELD_TYPE_FLOW') return;
    expect(result.extraction.pattern).toBe('EMPTY_CAST_OBJECT');
    expect(result.extraction.arrayInitSites).toBeGreaterThanOrEqual(1);
    expect(result.extraction.emptyGuardedCastSites).toBe(1);
    expect(result.extraction.subscriptAssignments).toBe(1);
    expect(result.extraction.otherAssignments).toBe(0);
    expect(result.extraction.rowFieldBinding).toBe(true);
    expect([...result.extraction.allowedJsonTypes].sort()).toEqual(['OBJECT']);
  });

  test('payer-exchange getAccountExchangeForMonth: EMPTY_ARRAY_OR_STRING_KEYS -> [OBJECT, ARRAY]', () => {
    const result = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getAccountExchangeForMonth', 'exchange_rate', 'EMPTY_ARRAY_OR_STRING_KEYS');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.extraction.kind).toBe('PHP_ITEM_FIELD_TYPE_FLOW');
    if (result.extraction.kind !== 'PHP_ITEM_FIELD_TYPE_FLOW') return;
    expect(result.extraction.pattern).toBe('EMPTY_ARRAY_OR_STRING_KEYS');
    expect(result.extraction.emptyGuardedCastSites).toBe(0);
    expect(result.extraction.subscriptAssignments).toBe(1);
    expect(result.extraction.otherAssignments).toBe(0);
    expect(result.extraction.rowFieldBinding).toBe(true);
    expect([...result.extraction.allowedJsonTypes].sort()).toEqual(['ARRAY', 'OBJECT']);
  });

  test('the wrong pattern request fails closed on the same source (pattern is a contract)', () => {
    // Asking for EMPTY_ARRAY_OR_STRING_KEYS on the cast-bearing common path
    // must fail: a cast site is present, so the no-cast pattern is not
    // reproducible.
    const commonAsNoCast = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_ARRAY_OR_STRING_KEYS');
    expect(commonAsNoCast.ok).toBe(false);
    if (!commonAsNoCast.ok) expect(commonAsNoCast.failure).toBe('TYPE_FLOW_AMBIGUOUS');
    // And the cast pattern must fail on the no-cast payer path.
    const payerAsCast = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getAccountExchangeForMonth', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(payerAsCast.ok).toBe(false);
    if (!payerAsCast.ok) expect(payerAsCast.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('row-keys + route binding still extract from the deep mirror (registry parity)', () => {
    const rows = extractPhpFunctionListRowKeys(exchangeRateDeepFixture, 'getCommonExchangeRate', 'res', 'PUSH');
    expect(rows.ok).toBe(true);
    if (rows.ok && rows.extraction.kind === 'PHP_FUNCTION_LIST_ROW_KEYS') {
      expect([...rows.extraction.itemKeys].sort()).toEqual(['exchange_rate', 'month']);
    }
    const route = extractPhpRouteGetBinding(routingDeepFixture, '/exchange_rate/global/{vendor}', 'App\\Handler\\ExchangeRate', 'getCommonExchangeRate');
    expect(route.ok).toBe(true);
  });
});

test.describe('Phase 10A — PHP_ITEM_FIELD_TYPE_FLOW: negative matrix (§32, fail-closed)', () => {
  test('symbol missing -> FUNCTION_NOT_FOUND', () => {
    const result = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getMissingFunction', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('FUNCTION_NOT_FOUND');
  });

  test('cast removed -> EMPTY_CAST_OBJECT ambiguous (no emptyGuardedCastSites)', () => {
    const withoutCast = exchangeRateDeepFixture.replace(
      `if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `if (empty($exchange_rate)) {\n                // cast removed\n            }`,
    );
    const result = extractPhpItemFieldTypeFlow(withoutCast, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('unguarded cast -> ambiguous (otherAssignments counted)', () => {
    const unguarded = exchangeRateDeepFixture.replace(
      `if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `$exchange_rate = (object)$exchange_rate;\n            if (empty($exchange_rate)) {}\n            `,
    );
    const result = extractPhpItemFieldTypeFlow(unguarded, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('cast added to payer path -> EMPTY_ARRAY_OR_STRING_KEYS ambiguous', () => {
    const withCast = exchangeRateDeepFixture.replace(
      `            }\n            $res[] = [\n                'id' => $v['id'],`,
      `            }\n            $exchange_rate = (object)$exchange_rate;\n            $res[] = [\n                'id' => $v['id'],`,
    );
    const result = extractPhpItemFieldTypeFlow(withCast, 'getAccountExchangeForMonth', 'exchange_rate', 'EMPTY_ARRAY_OR_STRING_KEYS');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('reassignment to a scalar -> ambiguous (otherAssignments)', () => {
    const scalar = exchangeRateDeepFixture.replace(
      `            if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `            if (empty($exchange_rate)) {\n                $exchange_rate = 'scalar';\n            }`,
    );
    const result = extractPhpItemFieldTypeFlow(scalar, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('row-literal field binding removed -> ambiguous', () => {
    const unbound = exchangeRateDeepFixture.replace(
      `'exchange_rate' => $exchange_rate,`,
      `'exchange_rate' => $something_else,`,
    );
    const result = extractPhpItemFieldTypeFlow(unbound, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('subscript assignments absent (no keys ever added) -> EMPTY_ARRAY_OR_STRING_KEYS ambiguous', () => {
    const noSubscript = exchangeRateDeepFixture.replace(
      `                    if (!empty(\${$vc}["{$v['vendor']}|{$v['id']}"])) {\n                        $exchange_rate[$vc] = \${$vc}["{$v['vendor']}|{$v['id']}"];\n                    }`,
      `                    if (!empty(\${$vc}["{$v['vendor']}|{$v['id']}"])) {\n                        // no subscript\n                    }`,
    );
    const result = extractPhpItemFieldTypeFlow(noSubscript, 'getAccountExchangeForMonth', 'exchange_rate', 'EMPTY_ARRAY_OR_STRING_KEYS');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure).toBe('TYPE_FLOW_AMBIGUOUS');
  });

  test('malformed function body / source too large -> fail closed', () => {
    const huge = '<?php\n' + '// padding\n'.repeat(600_000);
    const tooLarge = extractPhpItemFieldTypeFlow(huge + exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(tooLarge.ok).toBe(false);
    if (!tooLarge.ok) expect(tooLarge.failure).toBe('SOURCE_TOO_LARGE');
  });
});

test.describe('Phase 10A — evidence digest binds type-flow evidence (§23)', () => {
  test('digest changes when the type-flow evidence changes', () => {
    const base = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(base.ok).toBe(true);
    const withoutCast = exchangeRateDeepFixture.replace(
      `if (empty($exchange_rate)) {\n                $exchange_rate = (object)$exchange_rate;\n            }`,
      `if (empty($exchange_rate)) {\n                // cast removed\n            }`,
    );
    const mutated = extractPhpItemFieldTypeFlow(withoutCast, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(mutated.ok).toBe(false);
    // Even a SUBSCRIPT-ONLY mutation (same allowed types) must change the
    // canonical evidence because the counts participate in the digest.
    const extraSubscript = exchangeRateDeepFixture.replace(
      `                    if (!empty(\${$v}[$month])) {\n                        $exchange_rate[$v] = \${$v}[$month];\n                    }`,
      `                    if (!empty(\${$v}[$month])) {\n                        $exchange_rate[$v] = \${$v}[$month];\n                        $exchange_rate['jpy'] = 1.0;\n                    }`,
    );
    const withExtra = extractPhpItemFieldTypeFlow(extraSubscript, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(withExtra.ok).toBe(true);
    if (!base.ok || !withExtra.ok) return;
    const digestBase = evidenceDigestFor([base.extraction]);
    const digestExtra = evidenceDigestFor([withExtra.extraction]);
    expect(digestBase).not.toBe(digestExtra);
  });

  test('deterministic: 3 repeats produce identical extraction bytes', () => {
    const first = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    const second = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    const third = extractPhpItemFieldTypeFlow(exchangeRateDeepFixture, 'getCommonExchangeRate', 'exchange_rate', 'EMPTY_CAST_OBJECT');
    expect(first).toEqual(second);
    expect(second).toEqual(third);
    if (first.ok && second.ok && third.ok) {
      const digests = [first, second, third].map((r) => (r.ok ? evidenceDigestFor([r.extraction]) : ''));
      expect(digests[0]).toBe(digests[1]);
      expect(digests[1]).toBe(digests[2]);
    }
  });
});
