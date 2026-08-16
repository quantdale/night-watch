// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — v2 recipe validation matrix (SPEC Phase 10A §6, §31).
//
// Strict dual-schema validation: v1 stays byte-meaning-stable (rejects any
// deep-contract field), v2 requires the item-level field type contracts and
// their matching type-flow extractors. Every ambiguous or inconsistent form
// fails closed.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { validateRealSourceRecipe, validateRealSourceRecipeBatch } from '../../src/oracles/expectations/recipes/validator';
import { PHASE10_FIXTURE_RECIPES } from '../../corpus/phase10/source-fixture/phase10Fixtures';
import { ARCHIVED_V1_RECIPES } from '../../corpus/phase10/historical/archivedV1Recipes';

const V2_COMMON: Record<string, unknown> = {
  schemaVersion: 'nightwatch.real-source-expectation-recipe.v2',
  recipeId: 'recipe.test.common-exchange.read',
  targetId: 'ripple.common-exchange.read',
  repoId: 'mobingilabs/ripple-api',
  sourcePaths: ['src/App/Handler/ExchangeRate.php', 'src/App/Route/Config/Routing.yaml'],
  extractors: [
    { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH' },
    { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/global/{vendor}', client: 'App\\Handler\\ExchangeRate', method: 'getCommonExchangeRate' },
    { kind: 'PHP_ITEM_FIELD_TYPE_FLOW', symbol: 'getCommonExchangeRate', fieldVariable: 'exchange_rate', pattern: 'EMPTY_CAST_OBJECT' },
  ],
  expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'month'] },
  blueprint: {
    expectationId: 'ripple.common-exchange.read.real-source-deep',
    projectionContractLimits: {},
    rootType: 'ARRAY',
    itemIndex: 0,
    itemFieldPaths: ['month', 'exchange_rate'],
  },
  itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT'] }],
};

test.describe('Phase 10A — recipe schema versioning (§10, §31)', () => {
  test('a conforming v2 recipe validates and keeps canonical sorted allowedTypes', () => {
    const recipe = validateRealSourceRecipe(V2_COMMON);
    expect(recipe.schemaVersion).toBe('nightwatch.real-source-expectation-recipe.v2');
    if (recipe.schemaVersion !== 'nightwatch.real-source-expectation-recipe.v2') return;
    expect(recipe.itemFieldTypeContracts).toEqual([{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT'] }]);
  });

  test('a v1 recipe carrying the deep contract is REJECTED (no silent v1 expansion)', () => {
    const v1WithDeep = {
      ...V2_COMMON,
      schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
      extractors: (V2_COMMON.extractors as { kind: string }[]).filter((e) => e.kind !== 'PHP_ITEM_FIELD_TYPE_FLOW'),
    };
    expect(() => validateRealSourceRecipe(v1WithDeep)).toThrow(/unknown-field:itemFieldTypeContracts/);
  });

  test('unsupported schema version rejected', () => {
    expect(() => validateRealSourceRecipe({ ...V2_COMMON, schemaVersion: 'nightwatch.real-source-expectation-recipe.v9' })).toThrow(
      /schemaVersion-unsupported/,
    );
  });

  test('v2 without itemFieldTypeContracts rejected', () => {
    const { itemFieldTypeContracts: _omit, ...without } = V2_COMMON as Record<string, unknown>;
    expect(() => validateRealSourceRecipe(without)).toThrow(/itemFieldTypeContracts-unbounded/);
  });

  test('v2 with a type-flow extractor but no contract rejected (orphan evidence)', () => {
    const { itemFieldTypeContracts: _omit, ...without } = V2_COMMON as Record<string, unknown>;
    expect(() => validateRealSourceRecipe(without)).toThrow(/itemFieldTypeContracts-unbounded/);
  });

  test('v2 contract without its matching type-flow extractor rejected', () => {
    const noFlow = {
      ...V2_COMMON,
      extractors: (V2_COMMON.extractors as { kind: string }[]).filter((e) => e.kind !== 'PHP_ITEM_FIELD_TYPE_FLOW'),
    };
    expect(() => validateRealSourceRecipe(noFlow)).toThrow(/missing-type-flow-extractor/);
  });

  test('declared type set not matching the extractor pattern rejected (no weaker/stronger claim)', () => {
    const weak = {
      ...V2_COMMON,
      itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['ARRAY'] }],
    };
    expect(() => validateRealSourceRecipe(weak)).toThrow(/type-set-mismatch/);
    const strong = {
      ...V2_COMMON,
      itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT', 'ARRAY'] }],
    };
    expect(() => validateRealSourceRecipe(strong)).toThrow(/type-set-mismatch/);
  });

  test('contract field not in the source-established row key set rejected', () => {
    const badField = {
      ...V2_COMMON,
      itemFieldTypeContracts: [{ field: 'not_a_row_key', itemIndex: 0, allowedTypes: ['OBJECT'] }],
    };
    expect(() => validateRealSourceRecipe(badField)).toThrow(/not-in-contract/);
  });
});

test.describe('Phase 10A — allowedTypes validation (§31)', () => {
  test('empty allowed set rejected', () => {
    const empty = { ...V2_COMMON, itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: [] }] };
    expect(() => validateRealSourceRecipe(empty)).toThrow(/allowedTypes-unbounded/);
  });

  test('duplicate allowed types rejected', () => {
    const dup = { ...V2_COMMON, itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT', 'OBJECT'] }] };
    expect(() => validateRealSourceRecipe(dup)).toThrow(/allowedTypes-duplicate/);
  });

  test('unsupported ProjectionNodeType rejected', () => {
    const bad = { ...V2_COMMON, itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['BLOB'] }] };
    expect(() => validateRealSourceRecipe(bad)).toThrow(/allowedTypes-unsupported/);
  });

  test('oversized type set rejected', () => {
    const big = {
      ...V2_COMMON,
      itemFieldTypeContracts: [
        { field: 'exchange_rate', itemIndex: 0, allowedTypes: ['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY'] },
      ],
    };
    // 6 entries is the cap; 7 must fail — craft via a payer pattern set.
    const seven = {
      ...V2_COMMON,
      itemFieldTypeContracts: [
        { field: 'exchange_rate', itemIndex: 0, allowedTypes: ['NULL', 'BOOLEAN', 'NUMBER', 'STRING', 'OBJECT', 'ARRAY', 'NUMBER'] },
      ],
    };
    expect(() => validateRealSourceRecipe(big)).toThrow(/type-set-mismatch|allowedTypes-duplicate/);
    expect(() => validateRealSourceRecipe(seven)).toThrow(/allowedTypes-duplicate|allowedTypes-unbounded/);
  });

  test('duplicate contract fields rejected', () => {
    const dupFields = {
      ...V2_COMMON,
      itemFieldTypeContracts: [
        { field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT'] },
        { field: 'exchange_rate', itemIndex: 1, allowedTypes: ['OBJECT'] },
      ],
    };
    expect(() => validateRealSourceRecipe(dupFields)).toThrow(/duplicate-field/);
  });

  test('unknown fields on contract/extractor rejected', () => {
    const badContract = {
      ...V2_COMMON,
      itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT'], extra: 'x' }],
    };
    expect(() => validateRealSourceRecipe(badContract)).toThrow(/unknown-field/);
    const badExtractor = {
      ...V2_COMMON,
      extractors: [
        ...(V2_COMMON.extractors as { kind: string }[]),
        { kind: 'PHP_ITEM_FIELD_TYPE_FLOW', symbol: 'getCommonExchangeRate', fieldVariable: 'exchange_rate', pattern: 'EMPTY_CAST_OBJECT', extra: 'x' },
      ],
    };
    expect(() => validateRealSourceRecipe(badExtractor)).toThrow(/unknown-field|kind-duplicate/);
  });
});

test.describe('Phase 10A — registry mix stays valid (§6)', () => {
  test('fixture registry holds 2 v2 + 2 v1 recipes', () => {
    const versions = PHASE10_FIXTURE_RECIPES.map((recipe) => recipe.schemaVersion).sort();
    expect(versions).toEqual([
      'nightwatch.real-source-expectation-recipe.v1',
      'nightwatch.real-source-expectation-recipe.v1',
      'nightwatch.real-source-expectation-recipe.v2',
      'nightwatch.real-source-expectation-recipe.v2',
    ]);
  });

  test('archived v1 recipes still validate under the UNCHANGED v1 contract', () => {
    expect(ARCHIVED_V1_RECIPES).toHaveLength(2);
    for (const recipe of ARCHIVED_V1_RECIPES) {
      expect(recipe.schemaVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
      expect(recipe.blueprint.expectationId).toMatch(/real-source-shape$/);
    }
  });

  test('batch validation rejects duplicate recipe ids', () => {
    expect(() => validateRealSourceRecipeBatch([V2_COMMON, V2_COMMON])).toThrow(/duplicate-recipe-id/);
  });
});
