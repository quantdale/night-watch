// ---------------------------------------------------------------------------
// Nightwatch Phase 10A — current-source mirror fixture (SPEC Phase 10A §9).
//
// SYNTHETIC ONLY. This PHP text mirrors the MECHANICALLY RELEVANT structure
// of mobingilabs/ripple-api @ 169df39d3cdf56c88f98d45d06eae6e48c3d8f6d
// (src/App/Handler/ExchangeRate.php): the empty-guarded `(object)` cast in
// getCommonExchangeRate (empty case serializes `{}`), and the no-cast
// `[]`/string-key-subscript pattern in getAccountExchangeForMonth
// (OBJECT-or-ARRAY). All values are obvious synthetic placeholders — no real
// customer data.
//
// The map source feeds the SAME static-text RealSourceReader interface used
// for any real read-only Alphaus checkout (never executed).
// ---------------------------------------------------------------------------

/** Mirror of getCommonExchangeRate + getAccountExchangeForMonth — the exact
 *  fixed patterns the PHP_ITEM_FIELD_TYPE_FLOW extractor proves. */
export const exchangeRateDeepFixture = `<?php
namespace App\\Handler;

class ExchangeRate
{
    const DEFAULT_CURRENCY = ['jpy'];
    const CURRENCY_RANGE_VALIDATE = [
        'usd' => [1, 999.00],
        'jpy' => [1, 999.00],
        'sgd' => [1, 999.00],
        'myr' => [1, 999.00],
        'idr' => [1, 99999.00],
        'inr' => [1, 999.00],
    ];

    public function getCommonExchangeRate(string $vendor): array
    {
        $res = [];
        $this->validate(['vendor' => $vendor], ['vendor' => ['type' => ['string'], 'permission' => ['aws', 'azure', 'gcp']]]);
        $user = $this->setClient('user', "App\\Handler\\User")->user->getUser();
        $currency = $user['meta']['support_currency'] ?? self::DEFAULT_CURRENCY;
        $jpy = [];
        $sgd = [];
        $myr = [];
        $idr = [];
        $inr = [];
        foreach ($user['months'] as $month) {
            if ((empty($jpy[$month]) && empty($sgd[$month]) && empty($myr[$month]) && empty($idr[$month]) && empty($inr[$month]))) {
                $exchange_rate = [];
            } else {
                $exchange_rate = [];
                foreach ($currency as $v) {
                    if ($v === 'usd') {
                        continue;
                    }
                    if (!empty(\${$v}[$month])) {
                        $exchange_rate[$v] = \${$v}[$month];
                    }
                }
            }
            if (empty($exchange_rate)) {
                $exchange_rate = (object)$exchange_rate;
            }
            $res[] = [
                'month' => $month,
                'exchange_rate' => $exchange_rate,
            ];
        }
        return $res;
    }

    public function getAccountExchangeForMonth(string $month): array
    {
        $res = [];
        $user = $this->setClient('user', "App\\Handler\\User")->user->getUser();
        $payers = $user['pay_accounts'];
        $currency = $user['meta']['support_currency'] ?? self::DEFAULT_CURRENCY;
        $jpy = [];
        $sgd = [];
        foreach ($payers as $v) {
            if ((empty($jpy["{$v['vendor']}|{$v['id']}"]) && empty($sgd["{$v['vendor']}|{$v['id']}"]))) {
                $exchange_rate = [];
            } else {
                $exchange_rate = [];
                foreach ($currency as $vc) {
                    if ($vc === 'usd') {
                        continue;
                    }
                    if (!empty(\${$vc}["{$v['vendor']}|{$v['id']}"])) {
                        $exchange_rate[$vc] = \${$vc}["{$v['vendor']}|{$v['id']}"];
                    }
                }
            }
            $res[] = [
                'id' => $v['id'],
                'vendor' => $v['vendor'],
                'name' => $v['name'],
                'exchange_rate' => $exchange_rate,
            ];
        }
        return $res;
    }
}
`;

/** Mirror of the Routing.yaml route blocks (get: keys with client/method). */
export const routingDeepFixture = `"get:/exchange_rate/global/{vendor}":
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
