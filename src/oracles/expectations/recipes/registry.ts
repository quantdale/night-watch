// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — fixed real-source expectation recipe registry
// (SPEC §11, §17, §28, §32, §33).
//
// DATA ONLY. These recipes were admitted by the Phase 9A.1 candidate audit
// (2026-08-16) against mobingilabs/ripple-api @
// 27bb007ad0c798800b6bd3b29760c966422966e7 (evidence: candidate table in
// .agent/tasks/phase-9a-1-real-source-expectation-admission/STATE.md).
//
//   targetId                     route                              handler
//   ripple.common-exchange.read  /exchange_rate/global/{vendor}     ExchangeRate::getCommonExchangeRate
//   ripple.payer-exchange.read   /v2/payer/exchange_rate/{month}    ExchangeRate::getAccountExchangeForMonth
//   ripple.account-inventory.read /accts                           Account::getAccountVendor (rows: insertAccount)
//   ripple.billing-group-exchange.read /exchange_rate/billing_group/{month} BillingGroup::getExchangeRateForBillingGroup
//
// Every recipe: source paths, extractor sequence (fixed vocabulary), the
// expected source contract, and the expectation blueprint. The derivation
// fails closed unless the source mechanically reproduces the contract; the
// evidence digest binds repo @ SHA + relative path + symbol + normalized
// source structure.
//
// This module performs NO persistence and NO network I/O (hardening guard).
// ---------------------------------------------------------------------------

import { validateRealSourceRecipeBatch } from './validator';
import type { RealSourceExpectationRecipe } from './types';

/**
 * Approved read-only target identities: the Phase 5 catalog's KNOWN_READ
 * operationIds (mirror asserted by tests/unit/realSourceRegistryConsistency
 * against src/api/phase5/catalog.ts). An expectation can never make an
 * UNKNOWN or mutation endpoint eligible for DEV observation — the presence
 * of a semantic expectation never broadens network authority (SPEC §33).
 */
export const APPROVED_READ_ONLY_TARGET_IDS: readonly string[] = Object.freeze([
  'ripple.payer-exchange.read',
  'ripple.common-exchange.read',
  'ripple.account-inventory.read',
  'ripple.billing-groups.read',
  'ripple.billing-groups-legacy.read',
  'ripple.billing-group-exchange.read',
]);

/**
 * Recipe targets whose operation is observed by a current contained DEV
 * journey through a REVIEWED endpoint semantic ruleId of the SAME identity
 * (mirror asserted by tests against src/products/ripple/journeyContracts.ts
 * buildRippleJourneyEndpointRegistry). These are the Phase 9B-reachable
 * expectations.
 */
export const DEV_REACHABLE_RECIPE_TARGET_IDS: readonly string[] = Object.freeze([
  'ripple.payer-exchange.read',
  'ripple.common-exchange.read',
  'ripple.account-inventory.read',
]);

const recipeData: readonly unknown[] = [
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.ripple.common-exchange.read',
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
    recipeId: 'recipe.ripple.payer-exchange.read',
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
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.ripple.account-inventory.read',
    targetId: 'ripple.account-inventory.read',
    repoId: 'mobingilabs/ripple-api',
    sourcePaths: ['src/App/Handler/Account.php', 'src/App/Route/Config/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'insertAccount', accumulator: 'res', pattern: 'ASSIGN' },
      { kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER', symbol: 'getAccountVendor', accumulator: 'res', builderSymbol: 'insertAccount' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/accts', client: 'App\\Handler\\Account', method: 'getAccountVendor' },
    ],
    expectedContract: {
      topLevel: 'ARRAY',
      requiredItemKeys: [
        'account_id',
        'azure_customer_id',
        'billinggroup_id',
        'billinggroup_name',
        'company_id',
        'customer_id',
        'customer_name',
        'domain_name',
        'entitlement_id',
        'note',
        'payer',
        'project_id',
        'service_discount',
        'subscription_id',
        'vendor',
      ],
    },
    blueprint: {
      expectationId: 'ripple.account-inventory.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: [
        'account_id',
        'azure_customer_id',
        'billinggroup_id',
        'billinggroup_name',
        'company_id',
        'customer_id',
        'customer_name',
        'domain_name',
        'entitlement_id',
        'note',
        'payer',
        'project_id',
        'service_discount',
        'subscription_id',
        'vendor',
      ],
    },
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.ripple.billing-group-exchange.read',
    targetId: 'ripple.billing-group-exchange.read',
    repoId: 'mobingilabs/ripple-api',
    sourcePaths: ['src/App/Handler/BillingGroup.php', 'src/App/Route/Config/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getExchangeRateForBillingGroup', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/billing_group/{month}', client: 'App\\Handler\\BillingGroup', method: 'getExchangeRateForBillingGroup' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'] },
    blueprint: {
      expectationId: 'ripple.billing-group-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'],
    },
  },
];

const validated = validateRealSourceRecipeBatch(recipeData);

/** Registry-level admission gate (SPEC §33, §35): approved read-only target
 *  only; one recipe per target; no mutation/unknown target. Throws
 *  REAL_SOURCE_RECIPE_INVALID:<detail>. */
export function assertApprovedReadOnlyTargets(recipes: readonly RealSourceExpectationRecipe[]): void {
  const targetSet = new Set<string>();
  for (const recipe of recipes) {
    if (!APPROVED_READ_ONLY_TARGET_IDS.includes(recipe.targetId)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:target-not-approved-read-only:${recipe.targetId}`);
    }
    if (targetSet.has(recipe.targetId)) {
      throw new Error(`REAL_SOURCE_RECIPE_INVALID:duplicate-target:${recipe.targetId}`);
    }
    targetSet.add(recipe.targetId);
  }
}

assertApprovedReadOnlyTargets(validated);

/** The fixed admitted real-source recipe set (validated at load). */
export const REAL_SOURCE_EXPECTATION_RECIPES: readonly RealSourceExpectationRecipe[] = Object.freeze(validated);

export function getRealSourceRecipe(targetId: string): RealSourceExpectationRecipe | null {
  return REAL_SOURCE_EXPECTATION_RECIPES.find((recipe) => recipe.targetId === targetId) ?? null;
}
