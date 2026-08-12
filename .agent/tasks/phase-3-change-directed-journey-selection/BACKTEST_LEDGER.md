# Phase 3 historical backtest ledger

Selector: `nightwatch.selector.phase3.v1`  
Dependency map: `nightwatch.ripple-dependency-map.v1`  
Collection date: 2026-08-12  
Evidence source: local Git ranges and independent source tracing of changed
paths/functions. Commit subjects were retained only as metadata and were not
used as selection evidence.

## Cases

| Case | Repository and range | Independently traced changed source | Actual selection | Fallback | Verdict |
| --- | --- | --- | --- | --- | --- |
| `historical-shared-exchange-surface` | `mobingilabs/ripple-ui` `2fe4e7d4..3af97821` | Both reviewed v2 exchange pages and both exchange Vuex clients changed; additional runtime paths are unmapped | J1, J2, J3 | yes | `SAFE_CONSERVATIVE_FALLBACK` |
| `historical-j2-with-unresolved-companion-runtime` | `mobingilabs/ripple-ui` `9756da44..afaff489` | J2 global exchange client changed; invoice runtime companions are not proven canary dependencies | J1, J2, J3 | yes | `SAFE_CONSERVATIVE_FALLBACK` |
| `historical-j3-backend-list-path` | `mobingilabs/ouchan` `2ae24351..6aea1f0f` | One changed file contains the `ListBillingGroups` implementation used by the J3 Blue list path | J3 | no | `TRUE_POSITIVE_SELECTION` |
| `historical-shared-router` | `mobingilabs/ripple-ui` `64ddee40..6c013139` | The one changed file is the global router/auth-guard file for all three approved routes | J1, J2, J3 in P0 order | no | `TRUE_POSITIVE_SELECTION` |
| `historical-doc-only` | `mobingilabs/ripple-ui` `b05ec86d..cb430dfb` | README.md only | none | no | `CORRECT_NON_SELECTION` |
| `historical-unknown-runtime-package` | `mobingilabs/ripple-ui` `6d425d4f..15609bbe` | package.json is runtime/build relevant but no canary edge is proven by this map | J1, J2, J3 | yes | `SAFE_CONSERVATIVE_FALLBACK` + `GROUND_TRUTH_UNRESOLVED` |
| `historical-rename-delete-tombstone` | `mobingilabs/ripple-ui` `34242571..0aa7e2f4` | Account Management files changed and three modal paths were detected as renames; unrelated runtime paths remain unresolved | J1, J2, J3 | yes | `SAFE_CONSERVATIVE_FALLBACK` |

The two direct J1/J2 isolated historical ranges were not claimed: available
local history either changes both v2 exchange surfaces together or carries
unresolved companion runtime files. The deterministic fixtures separately
prove isolated J1 and J2 path behavior without misrepresenting history.

## Counts

* True-positive selections: 2
* False-positive selections: 0 material; extra canaries were only introduced
  by visible conservative fallback, not hidden over-selection.
* False-negative selections: 0
* Conservative fallback cases: 4
* Correct non-selections: 1
* Ground-truth unresolved cases: 1, with safe all-canary fallback
* Rename/delete cases: 1; three `rename` records retained base and current
  paths and preserved J3 impact.
* Backend-only cases: 1; Ouchan `billingsvc.go` selected J3 without a UI diff.

No historical result is a commit-to-bug claim. The ledger records source
relevance only.
