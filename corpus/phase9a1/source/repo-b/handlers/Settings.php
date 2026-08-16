<?php
// ---------------------------------------------------------------------------
// SYNTHETIC PHASE 9A.1 FIXTURE — NOT REAL ALPHAUS SOURCE.
//
// SECOND fixture repo (repo-b) for the multi-repo / per-expectation snapshot
// tests: a different handler domain with a different row shape. Synthetic
// only.
// ---------------------------------------------------------------------------

namespace App\Handler;

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
