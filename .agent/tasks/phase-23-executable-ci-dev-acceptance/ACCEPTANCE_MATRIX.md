# Phase 23 Acceptance Matrix

| ID | Capability | Required evidence | Status |
|---|---|---|---|
| A01 | Bootstrap and history boundary | Exact starting SHA, clean synchronization, Phase 19–22 records unchanged | PASS — bootstrap verified; historical task directories untouched |
| A02 | CI drift inventory | Machine-readable old workflow command/file inventory with phase, duplication, environment, sibling, and safety fields | PASS — 32 steps / 30 run commands / 55 unique files / 5 duplicate executions; current inventory 9 groups / 130 unique / 0 duplicates |
| A03 | Versioned quality gate | `nightwatch.quality-gate.v1`, fixed command mappings, unknown-group fail-closed tests | PASS — schema validator and Phase 23 focused coverage |
| A04 | Shared runner | Local/clean/CI modes use one serial runner and safe bounded result model | PASS — `gate:local`, `gate:ci`, `gate:clean`, `gate:predev` fixed modes |
| A05 | Semantic compatibility | Stable Phase 9–23 manifest and `npm run test:semantic-compat` with omission regression | PASS — 1,806 total / 1,805 passed / 1 skipped / 0 failed |
| A06 | Inventory and duplication | Deterministic group/file inventory, reason-coded intentional duplicates, no accidental repeats | PASS — 130 unique files, 0 duplicate executions, empty intentional-reason set |
| A07 | Safe gate receipt | `nightwatch.quality-gate-receipt.v1`, definition/receipt digests, no secrets/raw logs | PASS — bounded receipt implemented; full gate receipt pending clean run |
| A08 | Clean checkout | Disposable fresh checkout, npm ci ignore-scripts, clean state, sanitized environment, teardown proof | PASS — Node20 disposable clone; clean before/after; no auth/owner/sibling reuse |
| A09 | Linux equivalence | Ubuntu/Node20 workflow assumptions and permanent host-behavior regressions | PASS — Node20 clean gate, UTC/C/serial controls, Ubuntu workflow parity |
| A10 | Port/process reliability | Occupied-port, stale-child, startup-failure, interrupted-teardown, isolated-run regressions | PASS — 5/5 Phase 23 lease regressions |
| A11 | Workflow simplification | Thin workflow invokes only authoritative `npm run gate:ci` after bootstrap | PASS — exactly npm ci plus gate:ci, Node20/Ubuntu/fetch-depth0 |
| A12 | Workflow parity hardening | Static checks reject gate bypass, auth/product contact, private artifact upload, and permission broadening | PASS — offline hardening rule is active |
| A13 | External CI classifier | `steps=[]` is external block; pending/cancelled/head mismatch/API-unobservable are distinct | PASS — pure classifier tests include empty-step and executed-test-failure distinction |
| A14 | Exact-head authority | Current SHA + gate digest + executed required jobs + green/non-skipped result required | PASS — classifier and pre-DEV core require all bindings |
| A15 | Preflight V3 | LOCAL, CLEAN, EXTERNAL CI, SOURCE, AUTH, MANIFEST, CONTAINMENT categories all mandatory | PASS — core and external-file adapter implemented; external category remains pre-DEV blocker until Actions observation |
| A16 | Fresh source | Six Phase 22 candidates re-discovered and classified from current read-only source | PASS — current read-only SHA `27bb007…`; 6 considered / 3 eligible / 3 excluded |
| A17 | Fresh manifest | New Phase 23 manifest identity, max three targets, exact CI receipt/digest binding | PASS — v2 manifest `03a2beaf…`/`71836e51…`, exact reconciled-head gate binding |
| A18 | Dry run | Exactly one FIRST and <=1 replay per target, <=6 contexts, zero contact/mutation/raw persistence | PASS — deterministic v2 dry-run core and operator |
| A19 | Local qualification | Focused, compatibility, synthetic, owner, typecheck, hardening, continuity, project, full canonical/isolated parity | PASS — canonical 2,360/4/0 and isolated 2,360/4/0, exact enumeration/skip parity |
| A20 | External decision | One exact current-head Actions inspection with run/job/step/head/conclusion evidence | NOT_STARTED |
| A21 | Conditional DEV | Either one bounded DEV campaign after READY_FOR_DEV or zero DEV contact with truthful blocker | NOT_STARTED |
| A22 | Privacy/project closure | Post-run privacy audit when applicable, current-state reconciliation, terminal continuity, clean synchronized Git | NOT_STARTED |
