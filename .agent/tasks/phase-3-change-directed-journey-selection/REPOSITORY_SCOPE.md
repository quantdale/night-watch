# Phase 3 repository scope and freshness ledger

This ledger is the read-only source audit for Phase 3. It records local
checkout state as observed on 2026-08-12. No remote fetch was performed, so
tracking refs are local evidence only and are not deployment evidence.

## Scope rule

The change-intelligence graph contains only repositories that are proven to
feed one of the three Phase 2B/2C canaries. A repository can be reviewed and
excluded without becoming a selection dependency. Uncommitted work is never
part of a committed change window.

Every included repository has `READ_ONLY_ONLY = true`.

## Included repositories

| REPO_ID | PRODUCT_ROLE | WHY_RELEVANT_TO_EXISTING_CANARIES | CANARY_DEPENDENCIES | SOURCE_OF_MAPPING | CURRENT_BRANCH | CHECKED_OUT_SHA | TRACKING_REF | AHEAD/BEHIND | WORKTREE_STATUS | READ_ONLY_ONLY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mobingilabs/ripple-ui` | Legacy Ripple authenticated shell and the three canary pages | Phase 2B source SHA owns all three approved routes and their Vuex/API callsites | J1, J2, J3; shared router/auth/layout/transport | Phase 2B `JOURNEYS.md`; `src/router.js`; page and Vuex sources | `dev` | `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | `origin/dev` at `e46b8ed6540b647574bdb96ec59eca42fc8acdef` | `0 ahead / 21 behind` | pre-existing deleted `openspec/changes/add-reserveshield-export-report/*`; untracked `AGENTS.md` | true |
| `mobingilabs/ripple-api` | Legacy Ripple HTTP API | Routes the payer exchange read, common exchange read, and account inventory read | J1, J2, J3 | `src/App/Route/Config/Routing.yaml`; `src/App/Handler/ExchangeRate.php`; `src/App/Handler/Account.php` | `master` | `27bb007ad0c798800b6bd3b29760c966422966e7` | `origin/master` at same SHA | `0 ahead / 0 behind` | untracked `AGENTS.md` | true |
| `mobingilabs/ouchan` | Core Go Blue billing service and Ripple forwarding code | J3's approved Blue `GET billing/v1/billinggroups` path terminates in `billingd` and uses the generated Billing client | J3; `billingd` service, forwarding client, cache path | `services/billingd/service.go`; `services/billingd/fwd/billingfwd.go`; `services/billingd/services/billingsvc/billingsvc.go` | `master` | `565f00a87fb7616cc23c45d4ffeabee38a41c65f` | `origin/master` at `16910fc9969e86558828cb0f273eeabae81fcce3` | `0 ahead / 25 behind` | pre-existing tracked edits, deletions, and untracked files; includes unrelated `pkg/ripple/v3/payer.go` edit; preserved | true |
| `alphauslabs/blueapi` | Blue API contract source | J3's streamed Billing `ListBillingGroups` RPC maps to `GET /v1/billinggroups` | J3; `billing/v1/billing.proto` | `billing/v1/billing.proto` service/RPC/HTTP annotation | `main` | `691422e5dc81afd263d064986fb50fcb3ea432a9` | `origin/main` at same branch | `0 ahead / 2 behind` | untracked `AGENTS.md`; contains submodule `protos` at `d76357f6...` | true |
| `alphauslabs/blue-sdk-go` | Generated Go client consumed by `ouchan` billingd | `ouchan` imports `github.com/alphauslabs/blue-sdk-go/billing/v1` for the J3 RPC and stream | J3; generated `billing/v1` client | `ouchan/go.mod`; `services/billingd/fwd/billingfwd.go`; generated package | `main` | `8883ee3d3a073352626c8c35e20e9fc5ed765373` | `origin/main` at same branch | `0 ahead / 1 behind` | untracked `AGENTS.md` | true |
| `alphauslabs/grpc-chunk-parser` | Shared browser-side streamed-response parser | J3's `streamPromise('GET', 'billing/v1/billinggroups')` directly imports `parseGrpcData` | J3; shared API transport/parser | `ripple-ui/package.json`; `src/vuex/api/admin.js`; package `src/index.ts` | `main` | `66802f281698dfcf0903f0a117d4637fce3fd945` | `origin/main` at same SHA | `0 ahead / 0 behind` | clean | true |

## Reviewed but excluded from the current graph

| REPO_ID | DECISION | EVIDENCE / REASON |
| --- | --- | --- |
| `alphauslabs/alupi` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | The three approved route declarations in legacy `ripple-ui/src/router.js` import legacy Vue pages. `alupi` contains other MFE apps and shared libraries, but no current route/component edge for the three Phase 2B contracts. Its exchange-rate references are parallel MFE code/comments, not an exercised Phase 2B route. |
| `alphauslabs/ripple-ui-dashboard` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | Dashboard MFE is not imported by any of the three approved route declarations or journey-specific contracts. |
| `alphauslabs/ripple-ui-cost-finalization` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | Cost-finalization MFE is not imported by any of the three approved route declarations or journey-specific contracts. |
| `alphauslabs/blueinternal` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | J1/J2 use Ripple HTTP handlers and J3's proven Blue list path uses the public Billing contract; no current journey edge reaches an internal contract. |
| `alphauslabs/blue-sdk-ts` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | The approved legacy UI callsites use Axios and `@alphauslabs/grpc-chunk-parser`, not the generated TypeScript SDK. |
| `mobingilabs/protobuf` | `REVIEWED_NOT_CURRENT_CANARY_DEPENDENCY` | The selected J3 contract is sourced from `blueapi/billing/v1/billing.proto`; no direct Phase 2B/2C edge reaches the legacy protobuf repository. |

## Freshness semantics

* `COMMITTED_UPSTREAM_CHANGE`: a committed range between a persisted baseline
  and a locally available tracking/ref head. It remains a source-impact
  candidate; it is not called deployed without deployment identity.
* `LOCAL_COMMITTED_CHANGE`: a committed local-only range ahead of the tracking
  ref. It is eligible only for explicit local shadow analysis.
* `DIRTY_WORKTREE_CHANGE`: uncommitted state. It is excluded from the default
  committed/nightly window and is never allowed to advance a verified
  baseline.
* A behind checkout is reported as stale. The selector must not silently
  substitute a tracking-ref tree for the checked-out source map.

Current freshness is `LOCAL_TRACKING_REF_ONLY`, not `REMOTE_FRESHNESS_CONFIRMED`.
No deployment status is inferred.

## Default current window

Phase 3 uses explicit per-repository `verified baseline SHA -> checked-out HEAD`
for offline deterministic selection. A future tracking-based window may use a
locally available tracking ref only after freshness and map SHA checks pass.
The initial state is a `BOOTSTRAP_BASELINE`, not a claim that historical source
was exercised. Dirty files are reported separately and excluded.
