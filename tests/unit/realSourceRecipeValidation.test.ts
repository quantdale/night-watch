// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — recipe validation matrix (SPEC §35).
//
// At minimum the recipe layer must REJECT: unknown recipe fields, unknown
// extractor kinds, malformed SHAs (as recipe/expectation inputs), absolute
// paths, path traversal, duplicate recipe IDs, duplicate ambiguous targets,
// unsupported language/extractor pairing, arbitrary regex/script/expression
// fields, missing evidence binding (no contract), customer-value constants
// (no such field exists), mutation targets, unknown endpoint targets.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  APPROVED_READ_ONLY_TARGET_IDS,
  assertApprovedReadOnlyTargets,
  REAL_SOURCE_EXPECTATION_RECIPES,
} from '../../src/oracles/expectations/recipes/registry';
import { validateRealSourceRecipe, validateRealSourceRecipeBatch } from '../../src/oracles/expectations/recipes/validator';
import { FIXTURE_RECIPES } from '../helpers/phase9a1Fixtures';

function baseRecipe(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.test.base',
    targetId: 'fixture-a.common-exchange.read',
    repoId: 'corpus/phase9a1/repo-a',
    sourcePaths: ['handlers/ExchangeRate.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/global/{vendor}', client: 'App\\Handler\\ExchangeRate', method: 'getCommonExchangeRate' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'month'] },
    blueprint: {
      expectationId: 'fixture-a.common-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['month', 'exchange_rate'],
    },
    ...overrides,
  };
}

function expectRejected(value: unknown, detail: string): void {
  try {
    validateRealSourceRecipe(value);
    throw new Error(`expected rejection: ${detail}`);
  } catch (error) {
    expect(String(error instanceof Error ? error.message : error)).toContain('REAL_SOURCE_RECIPE_INVALID');
  }
}

test.describe('Phase 9A.1 — recipe validation matrix (SPEC §35)', () => {
  test('a valid recipe is accepted', () => {
    const recipe = validateRealSourceRecipe(baseRecipe());
    expect(recipe.recipeId).toBe('recipe.test.base');
  });

  test('unknown recipe field -> rejected', () => {
    expectRejected(baseRecipe({ executableCode: 'evil()' }), 'unknown field');
    expectRejected(baseRecipe({ regex: '(.*)' }), 'arbitrary regex field');
    expectRejected(baseRecipe({ script: 'model-authored script' }), 'script field');
    expectRejected(baseRecipe({ expression: 'a + b' }), 'expression field');
    expectRejected(baseRecipe({ customerValue: 'secret-constant' }), 'customer-value constant');
  });

  test('unknown extractor kind -> rejected', () => {
    expectRejected(
      baseRecipe({ extractors: [{ kind: 'EVAL_ANY_CODE', code: 'process.exit()' }] }),
      'unknown extractor',
    );
  });

  test('extractor duplicate kind -> rejected', () => {
    expectRejected(
      baseRecipe({
        extractors: [
          { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'a', accumulator: 'res', pattern: 'PUSH' },
          { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'b', accumulator: 'res', pattern: 'PUSH' },
        ],
      }),
      'duplicate extractor kind',
    );
  });

  test('malformed ids and symbols -> rejected', () => {
    expectRejected(baseRecipe({ recipeId: '../evil' }), 'recipeId traversal');
    expectRejected(baseRecipe({ targetId: 'mutation endpoint with spaces' }), 'malformed targetId');
    expectRejected(baseRecipe({ extractors: [{ kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'bad name', accumulator: 'res', pattern: 'PUSH' }] }), 'malformed symbol');
    expectRejected(baseRecipe({ extractors: [{ kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'bad-name', pattern: 'PUSH' }] }), 'malformed accumulator');
  });

  test('absolute source path -> rejected', () => {
    expectRejected(baseRecipe({ sourcePaths: ['/etc/passwd', 'routes/Routing.yaml'] }), 'absolute path');
  });

  test('path traversal -> rejected', () => {
    expectRejected(baseRecipe({ sourcePaths: ['handlers/../../secrets.php', 'routes/Routing.yaml'] }), 'traversal');
    expectRejected(baseRecipe({ sourcePaths: ['handlers\\evil.php', 'routes/Routing.yaml'] }), 'backslash traversal');
  });

  test('no-extension source path -> rejected', () => {
    expectRejected(baseRecipe({ sourcePaths: ['handlers/noext', 'routes/Routing.yaml'] }), 'no extension');
  });

  test('unsupported language/extractor pairing -> rejected', () => {
    // Route binding without a Routing.yaml path.
    expectRejected(
      baseRecipe({ sourcePaths: ['handlers/ExchangeRate.php'] }),
      'route binding without routing yaml',
    );
    // Row-keys without a PHP handler path.
    expectRejected(
      baseRecipe({
        sourcePaths: ['routes/Routing.yaml'],
        extractors: [
          { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH' },
        ],
      }),
      'row keys without php handler',
    );
  });

  test('no top-level-array proof -> rejected', () => {
    expectRejected(
      baseRecipe({
        extractors: [{ kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'insertAccount', accumulator: 'res', pattern: 'ASSIGN' }],
      }),
      'top-level array unproven (ASSIGN only)',
    );
  });

  test('unknown extractor parameters (arbitrary regex/script/expression) -> rejected', () => {
    expectRejected(
      baseRecipe({
        extractors: [
          { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH', regex: '.*' },
        ],
      }),
      'regex in extractor params',
    );
  });

  test('unsupported pattern value -> rejected', () => {
    expectRejected(
      baseRecipe({
        extractors: [{ kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'EVERYTHING' }],
      }),
      'unsupported pattern',
    );
  });

  test('empty required key set -> rejected', () => {
    expectRejected(baseRecipe({ expectedContract: { topLevel: 'ARRAY', requiredItemKeys: [] } }), 'empty keys');
  });

  test('blueprint asserts a field outside the contract -> rejected', () => {
    expectRejected(
      baseRecipe({
        blueprint: {
          expectationId: 'fixture-a.common-exchange.read.real-source-shape',
          projectionContractLimits: {},
          rootType: 'ARRAY',
          itemIndex: 0,
          itemFieldPaths: ['month', 'not-in-contract'],
        },
      }),
      'field not in contract',
    );
  });

  test('unsupported topLevel / rootType -> rejected', () => {
    expectRejected(baseRecipe({ expectedContract: { topLevel: 'OBJECT', requiredItemKeys: ['a'] } }), 'object topLevel');
    expectRejected(baseRecipe({ blueprint: { ...(baseRecipe().blueprint as Record<string, unknown>), rootType: 'OBJECT' } }), 'object rootType');
  });

  test('out-of-range itemIndex -> rejected', () => {
    expectRejected(baseRecipe({ blueprint: { ...(baseRecipe().blueprint as Record<string, unknown>), itemIndex: 1000 } }), 'itemIndex');
  });

  test('unknown projection limit field -> rejected', () => {
    expectRejected(
      baseRecipe({ blueprint: { ...(baseRecipe().blueprint as Record<string, unknown>), projectionContractLimits: { maxDepth: 1, evil: 2 } } }),
      'unknown limit',
    );
  });

  test('duplicate recipe IDs -> rejected at batch level', () => {
    expect(() => validateRealSourceRecipeBatch([baseRecipe(), baseRecipe()])).toThrow(/duplicate-recipe-id/);
  });

  test('missing evidence binding (no expectedContract) -> rejected', () => {
    const { expectedContract: _dropped, ...rest } = baseRecipe();
    expectRejected(rest, 'missing contract');
  });

  test('registry admits only approved read-only targets (mutation/unknown rejected)', () => {
    // The real registry itself: every target is in the approved KNOWN_READ
    // set (enforced at module load — this test pins the invariant).
    for (const recipe of REAL_SOURCE_EXPECTATION_RECIPES) {
      expect(APPROVED_READ_ONLY_TARGET_IDS).toContain(recipe.targetId);
    }
    // A mutation-target recipe must be rejected by the registry gate.
    const mutation = validateRealSourceRecipe(
      baseRecipe({ recipeId: 'recipe.test.mutation', targetId: 'ripple.payer-exchange.write' }),
    );
    expect(() => assertApprovedReadOnlyTargets([mutation])).toThrow(/target-not-approved-read-only/);
    // An unknown endpoint target must be rejected too.
    const unknown = validateRealSourceRecipe(
      baseRecipe({ recipeId: 'recipe.test.unknown', targetId: 'ripple.nonexistent.read' }),
    );
    expect(() => assertApprovedReadOnlyTargets([unknown])).toThrow(/target-not-approved-read-only/);
  });

  test('fixture recipes are valid data of the same schema', () => {
    expect(FIXTURE_RECIPES.length).toBe(5);
    for (const recipe of FIXTURE_RECIPES) {
      expect(recipe.schemaVersion).toBe('nightwatch.real-source-expectation-recipe.v1');
    }
  });
});
