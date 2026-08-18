// ---------------------------------------------------------------------------
// Nightwatch Phase 11A.3 — synthetic read-only source fixtures for the REAL
// real-source expectation recipes (SPEC §11, §12, M5, M6, M8).
//
// The permanent matrix and the current-source canary must run the ACTUAL
// production real-source recipes (REAL_SOURCE_EXPECTATION_RECIPES) through the
// real admission bridge — NOT the Phase 9A.1 fixture recipes. To keep that
// matrix deterministic AND repository-owned (CI has no sibling checkout), this
// helper supplies synthetic PHP source text that mechanically satisfies every
// extractor of the four admitted real recipes, served through a bounded
// in-memory reader at the exact recipe source paths. It mirrors the role of
// phase9a1Fixtures for the fixture recipes: the text is DATA ONLY, never
// executed, never annotated.
//
// The byte content is constructed to reproduce the exact source-established
// contracts (row key sets + type-flow patterns) the recipes declare. Changing
// recipe semantics anywhere else never changes this file silently — the
// derivation fails closed if a recipe drifts from these bytes.
// ---------------------------------------------------------------------------

import type { RealSourceReader } from '../../src/oracles/expectations/recipes/types';

export const REAL_SOURCE_FIXTURE_REPO = 'mobingilabs/ripple-api';
export const REAL_SOURCE_FIXTURE_SHA = 'cccccccccccccccccccccccccccccccccccccccc';

// ExchangeRate.php: satisfies BOTH the common-exchange (EMPTY_CAST_OBJECT) and
// payer (EMPTY_ARRAY_OR_STRING_KEYS) item field type-flow extractors, plus the
// PHP_FUNCTION_LIST_ROW_KEYS PUSH extraction for each handler.
export const exchangeRateFixture = `<?php
namespace App\\Handler;

class ExchangeRate
{
    public function getCommonExchangeRate(string $vendor): array
    {
        $res = [];
        $exchange_rate = [];
        if (empty($exchange_rate)) {
            $exchange_rate = (object)$exchange_rate;
        }
        $res[] = [
            'month' => $month,
            'exchange_rate' => $exchange_rate,
        ];
        return $res;
    }

    public function getAccountExchangeForMonth(string $month): array
    {
        $res = [];
        $exchange_rate = [];
        $exchange_rate['rate_usd'] = 1.0;
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
            'payer' => ($cs_id === $acct_id),
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
        $res[] = $this->insertAccount($v['company_id'], $v['company_id'], $v['account_id'], 'azure', $v);
        return $res;
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

export const routingFixture = `"get:/exchange_rate/global/{vendor}":
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

/** Bounded in-memory reader serving the synthetic source above at the exact
 *  real-recipe source paths for one repo. Returns null for unavailable paths,
 *  mirroring the fail-closed sibling reader contract. */
export function createRealSourceSyntheticState(): { reader: RealSourceReader; sha: string; repoId: string } {
  const files: Record<string, string> = {
    'src/App/Handler/ExchangeRate.php': exchangeRateFixture,
    'src/App/Handler/Account.php': accountFixture,
    'src/App/Handler/BillingGroup.php': billingGroupFixture,
    'src/App/Route/Config/Routing.yaml': routingFixture,
  };
  const repoId = REAL_SOURCE_FIXTURE_REPO;
  const sha = REAL_SOURCE_FIXTURE_SHA;
  const reader: RealSourceReader = {
    readFile(id: string, relativePath: string): string | null {
      if (id !== repoId) return null;
      if (relativePath.includes('..') || relativePath.includes('\\')) return null;
      return files[relativePath] ?? null;
    },
  };
  return { reader, sha, repoId };
}
