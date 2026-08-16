<?php
// ---------------------------------------------------------------------------
// SYNTHETIC PHASE 9A.1 FIXTURE — NOT REAL ALPHAUS SOURCE.
//
// Structural mirror of BillingGroup::getExchangeRateForBillingGroup
// (mobingilabs/ripple-api @ 27bb007a): inline row literal + `return $res;`.
// Synthetic only.
// ---------------------------------------------------------------------------

namespace App\Handler;

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
