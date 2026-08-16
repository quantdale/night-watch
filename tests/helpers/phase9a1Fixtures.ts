// ---------------------------------------------------------------------------
// Nightwatch Phase 9A.1 — test fixtures (in-memory map source + fixture
// recipes mirroring the admitted real-source patterns).
//
// The map source simulates read-only sibling checkouts WITHOUT touching the
// filesystem, so the whole matrix runs in CI. The fixture recipes are data
// of the same schema as the real registry and are validated by the same
// strict validator.
// ---------------------------------------------------------------------------

import { deriveRealSourceExpectations } from '../../src/oracles/expectations/admission';
import type { RealSourceExpectationRecipe } from '../../src/oracles/expectations/recipes/types';
import { validateRealSourceRecipeBatch } from '../../src/oracles/expectations/recipes/validator';
import type { SemanticExpectation } from '../../src/oracles/expectations/types';
import type { RealSourceCurrentness, RealSourceReader } from '../../src/oracles/expectations/recipes/types';

export const FIXTURE_REPO_A = 'corpus/phase9a1/repo-a';
export const FIXTURE_REPO_B = 'corpus/phase9a1/repo-b';
export const FIXTURE_SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const FIXTURE_SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

export interface MapSource {
  readonly reader: RealSourceReader;
  readonly currentness: RealSourceCurrentness;
  /** Test mutation handles (the reader/currentness read these live). */
  setSha(repoId: string, sha: string): void;
  removeRepo(repoId: string): void;
  setFile(repoId: string, relativePath: string, content: string): void;
  removeFile(repoId: string, relativePath: string): void;
}

export function createMapSource(initial: {
  repoId: string;
  sha: string;
  files: Record<string, string>;
}[]): MapSource {
  const files = new Map<string, string>(); // `${repoId}/${relativePath}` -> content
  const shas = new Map<string, string>();
  const available = new Set<string>();
  for (const repo of initial) {
    available.add(repo.repoId);
    shas.set(repo.repoId, repo.sha);
    for (const [relativePath, content] of Object.entries(repo.files)) {
      files.set(`${repo.repoId}/${relativePath}`, content);
    }
  }
  const reader: RealSourceReader = {
    readFile(repoId: string, relativePath: string): string | null {
      if (!available.has(repoId)) return null;
      if (relativePath.startsWith('/') || relativePath.includes('..') || relativePath.includes('\\')) return null;
      return files.get(`${repoId}/${relativePath}`) ?? null;
    },
  };
  const currentness: RealSourceCurrentness = {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      if (!available.has(repoId)) return null;
      const sha = shas.get(repoId);
      return sha === undefined ? null : { repoId, sha };
    },
  };
  return {
    reader,
    currentness,
    setSha(repoId: string, sha: string): void {
      shas.set(repoId, sha);
    },
    removeRepo(repoId: string): void {
      available.delete(repoId);
    },
    setFile(repoId: string, relativePath: string, content: string): void {
      available.add(repoId);
      files.set(`${repoId}/${relativePath}`, content);
    },
    removeFile(repoId: string, relativePath: string): void {
      files.delete(`${repoId}/${relativePath}`);
    },
  };
}

/** Fixture recipes mirroring the four admitted real candidates (repo A) plus
 *  a second-domain recipe (repo B) for multi-repo snapshot tests. */
const fixtureRecipeData: readonly unknown[] = [
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.fixture-a.common-exchange.read',
    targetId: 'fixture-a.common-exchange.read',
    repoId: FIXTURE_REPO_A,
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
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.fixture-a.payer-exchange.read',
    targetId: 'fixture-a.payer-exchange.read',
    repoId: FIXTURE_REPO_A,
    sourcePaths: ['handlers/ExchangeRate.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getAccountExchangeForMonth', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/v2/payer/exchange_rate/{month}', client: 'App\\Handler\\ExchangeRate', method: 'getAccountExchangeForMonth' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['exchange_rate', 'id', 'name', 'vendor'] },
    blueprint: {
      expectationId: 'fixture-a.payer-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['id', 'vendor', 'name', 'exchange_rate'],
    },
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.fixture-a.account-inventory.read',
    targetId: 'fixture-a.account-inventory.read',
    repoId: FIXTURE_REPO_A,
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
      expectationId: 'fixture-a.account-inventory.read.real-source-shape',
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
    recipeId: 'recipe.fixture-a.billing-group-exchange.read',
    targetId: 'fixture-a.billing-group-exchange.read',
    repoId: FIXTURE_REPO_A,
    sourcePaths: ['handlers/BillingGroup.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getExchangeRateForBillingGroup', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/exchange_rate/billing_group/{month}', client: 'App\\Handler\\BillingGroup', method: 'getExchangeRateForBillingGroup' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'] },
    blueprint: {
      expectationId: 'fixture-a.billing-group-exchange.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['billing_group_id', 'billing_group_name', 'company_id', 'exchange_rate'],
    },
  },
  {
    schemaVersion: 'nightwatch.real-source-expectation-recipe.v1',
    recipeId: 'recipe.fixture-b.settings.read',
    targetId: 'fixture-b.settings.read',
    repoId: FIXTURE_REPO_B,
    sourcePaths: ['handlers/Settings.php', 'routes/Routing.yaml'],
    extractors: [
      { kind: 'PHP_FUNCTION_LIST_ROW_KEYS', symbol: 'getCompanySettings', accumulator: 'res', pattern: 'PUSH' },
      { kind: 'PHP_ROUTE_GET_BINDING', routePath: '/settings/{vendor}', client: 'App\\Handler\\Settings', method: 'getCompanySettings' },
    ],
    expectedContract: { topLevel: 'ARRAY', requiredItemKeys: ['display_name', 'enabled', 'setting_id'] },
    blueprint: {
      expectationId: 'fixture-b.settings.read.real-source-shape',
      projectionContractLimits: {},
      rootType: 'ARRAY',
      itemIndex: 0,
      itemFieldPaths: ['setting_id', 'display_name', 'enabled'],
    },
  },
];

export const FIXTURE_RECIPES: readonly RealSourceExpectationRecipe[] = Object.freeze(validateRealSourceRecipeBatch(fixtureRecipeData));

export interface FixtureSourceState {
  readonly map: MapSource;
  readonly recipes: readonly RealSourceExpectationRecipe[];
}

/** Build the two-repo fixture source with the fixture recipes. */
export function createFixtureSourceState(): FixtureSourceState {
  const map = createMapSource([
    {
      repoId: FIXTURE_REPO_A,
      sha: FIXTURE_SHA_A,
      files: {
        'handlers/ExchangeRate.php': exchangeRateFixture,
        'handlers/Account.php': accountFixture,
        'handlers/BillingGroup.php': billingGroupFixture,
        'routes/Routing.yaml': routingFixtureA,
      },
    },
    {
      repoId: FIXTURE_REPO_B,
      sha: FIXTURE_SHA_B,
      files: {
        'handlers/Settings.php': settingsFixture,
        'routes/Routing.yaml': routingFixtureB,
      },
    },
  ]);
  return { map, recipes: FIXTURE_RECIPES };
}

/** Derive the admitted expectations from the fixture state at its current
 *  shas (fresh derivation per repo). */
export function deriveFixtureExpectations(state: FixtureSourceState): {
  derivedA: SemanticExpectation[];
  derivedB: SemanticExpectation[];
} {
  const reportA = deriveRealSourceExpectations(
    state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_A),
    { repoId: FIXTURE_REPO_A, sha: FIXTURE_SHA_A },
    state.map.reader,
  );
  const reportB = deriveRealSourceExpectations(
    state.recipes.filter((recipe) => recipe.repoId === FIXTURE_REPO_B),
    { repoId: FIXTURE_REPO_B, sha: FIXTURE_SHA_B },
    state.map.reader,
  );
  if (reportA.failures.length > 0 || reportB.failures.length > 0) {
    throw new Error(`fixture derivation failed: ${JSON.stringify([...reportA.failures, ...reportB.failures])}`);
  }
  return {
    derivedA: reportA.derived.map((item) => item.expectation),
    derivedB: reportB.derived.map((item) => item.expectation),
  };
}

// ---------------------------------------------------------------------------
// Fixture source text (kept in the helper so both the map source and any
// fs-based test can share the exact bytes).
// ---------------------------------------------------------------------------

export const exchangeRateFixture = `<?php
namespace App\\Handler;

class ExchangeRate
{
    public function getCommonExchangeRate(string $vendor): array
    {
        $res = [];
        $this->validate(['vendor' => $vendor], ['vendor' => ['type' => ['string'], 'permission' => ['aws', 'azure', 'gcp']]]);
        $exchange_rate = [];
        $exchange_rate = (object) $exchange_rate;
        $res[] = [
            'month' => $month,
            'exchange_rate' => $exchange_rate,
        ];
        return $res;
    }

    public function getAccountExchangeForMonth(string $month): array
    {
        $res = [];
        $res[] = [
            'id' => $v['id'],
            'vendor' => $v['vendor'],
            'name' => $v['name'],
            'exchange_rate' => $exchange_rate,
        ];
        return $res;
    }
}
`;

export const accountFixture = `<?php
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

export const billingGroupFixture = `<?php
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

export const settingsFixture = `<?php
namespace App\\Handler;

class Settings
{
    public function getCompanySettings(string $vendor): array
    {
        $res = [];
        $res[] = [
            'setting_id' => $v['setting_id'],
            'display_name' => $v['display_name'],
            'enabled' => $v['enabled'],
        ];
        return $res;
    }
}
`;

export const routingFixtureA = `"get:/exchange_rate/global/{vendor}":
    action: getExchangeRate
    client: App\\Handler\\ExchangeRate
    method: getCommonExchangeRate
    params:
        -
            vendor: args

"get:/v2/payer/exchange_rate/{month}":
    action: getAccountExchangeRate
    client: App\\Handler\\ExchangeRate
    method: getAccountExchangeForMonth
    params:
        -
            month: args

"get:/accts":
    action: getAccounts
    client: App\\Handler\\Account
    method: getAccountVendor
    params:
        -
            vendor: params

"get:/exchange_rate/billing_group/{month}":
    action: getExchangeRateforBillingGroup
    client: App\\Handler\\BillingGroup
    method: getExchangeRateForBillingGroup
    params:
        -
            month: args
`;

export const routingFixtureB = `"get:/settings/{vendor}":
    client: App\\Handler\\Settings
    method: getCompanySettings
`;
