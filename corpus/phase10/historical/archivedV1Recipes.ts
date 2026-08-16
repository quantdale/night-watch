// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — archived v1 recipes for common-exchange and
// payer-exchange (SPEC Phase 10A §6).
//
// DATA ONLY — the RETIRED Phase 9A.1 v1 recipes for the two enriched
// targets, kept byte-meaning-stable so the historical
// `...real-source-shape` expectations remain reproducible for baseline and
// identity tests (Phase 9B-R1 evidence stays truthful at its old
// checkpoint). These archives are NEVER part of the active registry; the
// active registry holds v2 recipes for these targets.
// ---------------------------------------------------------------------------

import { validateRealSourceRecipeBatch } from '../../../src/oracles/expectations/recipes/validator';
import type { RealSourceExpectationRecipe } from '../../../src/oracles/expectations/recipes/types';

const archivedV1Data: readonly unknown[] = [
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.ripple.common-exchange.read.v1-archived',
    targetId: 'ripple.common-exchange.read',
    repoId: 'mobingilabs/ripple-api',
    sourcePaths: ['src/App/Handler/ExchangeRate.php', 'src/App/Route/Config/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/global/{vendor}', client: 'App\\Handler\\ExchangeRate', method: 'getCommonExchangeRate' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'month'] },
    blueprint: {
      expectationId: 'ripple.common-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['month', 'exchange_rate'],
    },
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.ripple.payer-exchange.read.v1-archived',
    targetId: 'ripple.payer-exchange.read',
    repoId: 'mobingilabs/ripple-api',
    sourcePaths: ['src/App/Handler/ExchangeRate.php', 'src/App/Route/Config/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getAccountExchangeForMonth', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/v2/payer/exchange_rate/{month}', client: 'App\\Handler\\ExchangeRate', method: 'getAccountExchangeForMonth' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'id', 'name', 'vendor'] },
    blueprint: {
      expectationId: 'ripple.payer-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['id', 'vendor', 'name', 'exchange_rate'],
    },
  },
];

/** Archived v1 recipes (validated under the unchanged v1 contract). */
export const ARCHIVED_V1_RECIPES: readonly RealSourceExpectationRecipe[] = Object.freeze(
  validateRealSourceRecipeBatch(archivedV1Data),
);
