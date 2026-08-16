<?php
// ---------------------------------------------------------------------------
// SYNTHETIC PHASE 9A.1 FIXTURE — NOT REAL ALPHAUS SOURCE.
//
// Structural mirror of mobingilabs/ripple-api @ 27bb007a handler patterns
// used by the Phase 9A.1 real-source extractor fixtures (CI runs without
// sibling checkouts). The row literals, accumulator patterns and route
// bindings mirror the admitted candidates:
//   - getCommonExchangeRate    -> $res[] = ['month', 'exchange_rate'] + return $res;
//   - getAccountExchangeForMonth -> $res[] = ['id','vendor','name','exchange_rate']
// All identifiers/values are synthetic placeholders. No customer data.
// ---------------------------------------------------------------------------

namespace App\Handler;

class ExchangeRate
{
    public function getCommonExchangeRate(string $vendor): array
    {
        $res = [];
        // vendor check (synthetic mirror of the permission enum)
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
