<?php
// ---------------------------------------------------------------------------
// SYNTHETIC PHASE 9A.1 FIXTURE — NOT REAL ALPHAUS SOURCE.
//
// Structural mirror of the Account::getAccountVendor / insertAccount builder
// pattern (mobingilabs/ripple-api @ 27bb007a): a private row builder returns
// a fixed 15-key literal; the route-bound method accumulates builder rows
// and returns the list through a row-level filter call. Synthetic only.
// ---------------------------------------------------------------------------

namespace App\Handler;

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
