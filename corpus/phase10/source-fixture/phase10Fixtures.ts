// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — deep fixture recipes + map source state (SPEC Phase
// 10A §9).
//
// SYNTHETIC ONLY. v2 fixture recipes mirror the real registry structure for
// the two enriched targets (item-level type contracts + PHP_ITEM_FIELD_TYPE_
// FLOW extractor) plus v1 recipes for the shape-only targets, validated by
// the SAME strict validator as the real registry and derivable against the
// in-memory map source in CI (no sibling checkouts required).
// ---------------------------------------------------------------------------

import { deriveRealSourceExpectations } from '../../../src/oracles/expectations/admission';
import { createMapSource } from '../../../tests/helpers/phase9a1Fixtures';
import type { RealSourceExpectationRecipe } from '../../../src/oracles/expectations/recipes/types';
import { validateRealSourceRecipeBatch } from '../../../src/oracles/expectations/recipes/validator';
import { exchangeRateDeepFixture, routingDeepFixture } from './exchangeRateDeepFixture';
import { ARCHIVED_V1_RECIPES } from '../historical/archivedV1Recipes';

export const PHASE10_FIXTURE_REPO = 'corpus/phase10/repo-a';
export const PHASE10_FIXTURE_SHA = 'cccccccccccccccccccccccccccccccccccccccc';
/** The current-source SHA the deep fixture mirrors
 *  (mobingilabs/ripple-api master, read-only remote metadata, 2026-08-16). */
export const CURRENT_RIPPLE_API_SHA = '169df39d3cdf56c88f98d45d06eae6e48c3d8f6d';

const deepRecipeData: readonly unknown[] = [
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v2',
    recipeId: 'recipe.phase10.common-exchange.read',
    targetId: 'fixture-10.common-exchange.read',
    repoId: PHASE10_FIXTURE_REPO,
    sourcePaths: ['handlers/ExchangeRate.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCommonExchangeRate', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/global/{vendor}', client: 'App\\Handler\\ExchangeRate', method: 'getCommonExchangeRate' },
      { kind: 'PHP_ITEM_FIELD_TYPE_FLOW', symbol: 'getCommonExchangeRate', fieldVariable: 'exchange_rate', pattern: 'EMPTY_CAST_OBJECT' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'month'] },
    blueprint: {
      expectationId: 'fixture-10.common-exchange.read.real-source-deep',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['month', 'exchange_rate'],
    },
    itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['OBJECT'] }],
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v2',
    recipeId: 'recipe.phase10.payer-exchange.read',
    targetId: 'fixture-10.payer-exchange.read',
    repoId: PHASE10_FIXTURE_REPO,
    sourcePaths: ['handlers/ExchangeRate.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getAccountExchangeForMonth', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/v2/payer/exchange_rate/{month}', client: 'App\\Handler\\ExchangeRate', method: 'getAccountExchangeForMonth' },
      { kind: 'PHP_ITEM_FIELD_TYPE_FLOW', symbol: 'getAccountExchangeForMonth', fieldVariable: 'exchange_rate', pattern: 'EMPTY_ARRAY_OR_STRING_KEYS' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'id', 'name', 'vendor'] },
    blueprint: {
      expectationId: 'fixture-10.payer-exchange.read.real-source-deep',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['id', 'vendor', 'name', 'exchange_rate'],
    },
    itemFieldTypeContracts: [{ field: 'exchange_rate', itemIndex: 0, allowedTypes: ['ARRAY', 'OBJECT'] }],
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.phase10.account-inventory.read',
    targetId: 'fixture-10.account-inventory.read',
    repoId: PHASE10_FIXTURE_REPO,
    sourcePaths: ['handlers/Account.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'insertAccount', accumulator: 'res', pattern: 'ASSIGN' },
      { kind: 'PHP_FUNCTION_RETURNS_LIST_OF_BUILDER', symbol: 'getAccountVendor', accumulator: 'res', builderSymbol: 'insertAccount' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/accts', client: 'App\\Handler\\Account', method: 'getAccountVendor' },
    ],
    expectedContract: {
      topLevel: 'ARRAY',
      requiredItemKeys: [
        'account_id', 'azure_customer_id', 'billinggroup_id', 'billinggroup_name', 'company_id',
        'customer_id', 'customer_name', 'domain_name', 'entitlement_id', 'note', 'payer', 'project_id',
        'service_discount', 'subscription_id', 'vendor',
      ],
    },
    blueprint: {
      expectationId: 'fixture-10.account-inventory.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: [
        'account_id', 'azure_customer_id', 'billinggroup_id', 'billinggroup_name', 'company_id',
        'customer_id', 'customer_name', 'domain_name', 'entitlement_id', 'note', 'payer', 'project_id',
        'service_discount', 'subscription_id', 'vendor',
      ],
    },
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.phase10.billing-group-exchange.read',
    targetId: 'fixture-10.billing-group-exchange.read',
    repoId: PHASE10_FIXTURE_REPO,
    sourcePaths: ['handlers/BillingGroup.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getExchangeRateForBillingGroup', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/billing_group/{month}', client: 'App\\Handler\\BillingGroup', method: 'getExchangeRateForBillingGroup' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'] },
    blueprint: {
      expectationId: 'fixture-10.billing-group-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'],
    },
  },
];

/** Validated Phase 10 fixture recipes (2 v2 + 2 v1) — CI-safe mirror of the
 *  real registry mix. */
export const PHASE10_FIXTURE_RECIPES: readonly RealSourceExpectationRecipe[] = Object.freeze(
  validateRealSourceRecipeBatch(deepRecipeData),
);

/** Synthetic Account.php mirror (v1 shape-only targets). */
export const accountDeepFixture = `<?php
namespace App\\Handler;

class Account
{
    private function insertAccount(?string $cp_id, string $cs_id, string $acct_id, string $vendor, array $info): array
    {
        $res = [
            'billinggroup_id' => $this->bgs[$cp_id]['billinggroup_id'],
            'billinggroup_name' => $this->bgs[$cp_id]['billinggroup_name'],
            'company_id' => $cp_id,
            'customer_id' => $cs_id,
            'customer_name' => $info['customer_name'],
            'account_id' => $acct_id,
            'vendor' => $vendor,
            'note' => $info['note'],
            'payer' => ($cs_id === $acct_id) ? true : false,
            'service_discount' => $this->svcdiscount[$cs_id . '|' . $acct_id],
            'project_id' => $this->bgs[$cp_id]['project_id'] ?? null,
            'azure_customer_id' => $info['azure_customer_id'] ?? null,
            'domain_name' => $info['domain_name'],
            'subscription_id' => ($info['billing_type'] == 'usage') ? ($info['azure_plan_id'] ?? null) : $cs_id,
            'entitlement_id' => ($info['billing_type'] == 'usage') ? $cs_id : null,
        ];
        return $res;
    }

    public function getAccountVendor(string $vendor, bool $forceRefresh = false): array
    {
        $res = [];
        $res[] = $this->insertAccount($v['company_id'], $v['customer_id'], $v['account_id'], 'aws', $v);
        $res[] = $this->insertAccount($v['company_id'], $v['customer_id'], $v['account_id'], 'azure', $v);
        return $this->rbac->filter(
            $res, RbacMiddleware::REQUIRED_ACCOUNT_READ_ACTIONS, 'company_id'
        );
    }
}
`;

/** Synthetic BillingGroup.php mirror (v1 shape-only target). */
export const billingGroupDeepFixture = `<?php
namespace App\\Handler;

class BillingGroup
{
    public function getExchangeRateForBillingGroup(string $month): array
    {
        $res = [];
        foreach ($ex_type as $v) {
            if ($v['value'] === 'billing_group') {
                $keys = explode('|', $v['sort_key']);
                $res[] = [
                    'billing_group_id' => $bg_data[$keys[3]]['billinggroup_id'],
                    'billing_group_name' => $bg_data[$keys[3]]['billinggroup_name'],
                    'company_id' => $keys[3],
                    'exchange_rate' => $data[$get_sort_key . $keys[3]]['exchange_rate'],
                ];
            }
        }
        return $res;
    }
}
`;

/** Build the Phase 10 map source state (in-memory; CI-safe). */
export function createPhase10FixtureState(): {
  recipes: readonly RealSourceExpectationRecipe[];
  files: Record<string, string>;
} {
  return {
    recipes: PHASE10_FIXTURE_RECIPES,
    files: {
      'handlers/ExchangeRate.php': exchangeRateDeepFixture,
      'handlers/Account.php': accountDeepFixture,
      'handlers/BillingGroup.php': billingGroupDeepFixture,
      'routes/Routing.yaml': routingDeepFixture,
    },
  };
}

/** Derive the four fixture expectations (2 deep L3 + 2 shape-only L2) at the
 *  fixture SHA. Throws on any derivation failure. */
export function derivePhase10FixtureExpectations(): ReturnType<typeof deriveRealSourceExpectations> {
  const state = createPhase10FixtureState();
  const map = createMapSource([
    { repoId: PHASE10_FIXTURE_REPO, sha: PHASE10_FIXTURE_SHA, files: state.files },
  ]);
  const report = deriveRealSourceExpectations(
    state.recipes,
    { repoId: PHASE10_FIXTURE_REPO, sha: PHASE10_FIXTURE_SHA },
    map.reader,
  );
  if (report.failures.length > 0) {
    throw new Error(`phase10 fixture derivation failed: ${JSON.stringify(report.failures)}`);
  }
  return report;
}

/** Derive the HISTORICAL shape-only baseline expectations (the retired v1
 *  recipes for common/payer) against the current-source mirror text, bound
 *  to the current-source SHA. CI-safe: the archived v1 recipes + the deep
 *  fixture text reproduce the Phase 9A.1 shape contract exactly. */
export function deriveArchivedBaselineExpectations(): {
  derived: { expectation: import('../../../src/oracles/expectations/types').SemanticExpectation; evidenceDigest: string }[];
} {
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
  const report = deriveRealSourceExpectations(
    ARCHIVED_V1_RECIPES,
    { repoId: 'mobingilabs/ripple-api', sha: CURRENT_RIPPLE_API_SHA },
    map.reader,
  );
  if (report.failures.length > 0) {
    throw new Error(`archived baseline derivation failed: ${JSON.stringify(report.failures)}`);
  }
  return { derived: report.derived.map((item) => ({ expectation: item.expectation, evidenceDigest: item.evidenceDigest })) };
}
