# Phase 3 Ripple canary dependency map

Map version: `nightwatch.ripple-dependency-map.v1`

The map is source-backed at the listed repository SHAs and is intentionally
narrow. It represents `change -> canary relevance`; it is not a failure
root-cause graph. Generated output and duplicate paths are deduplicated by
logical API/component identity.

## Journey contract identities

| Journey | Route | Required read behavior |
| --- | --- | --- |
| J1 `ripple-payer-exchange-read` | `/payer-exchange-rate-v2` | Ripple `GET /v2/payer/exchange_rate/{month}`; handler `getAccountExchangeForMonth` |
| J2 `ripple-common-exchange-read` | `/global-exchange-rate-v2` | Ripple `GET /exchange_rate/global/{vendor}`; handler `getCommonExchangeRate` |
| J3 `ripple-account-inventory` | `/accounts` | Ripple `GET /accts?vendor=...` plus Blue streamed `GET /billing/v1/billinggroups`; approved read only |

## J1 — payer exchange-rate read

* `DIRECT_UI_FILES`: `mobingilabs/ripple-ui/src/router.js`,
  `src/pages/ExchangeRate_v2/PayerExchangeRate/index.vue`,
  `src/pages/ExchangeRate_v2/PayerExchangeRate/DataTable.vue`,
  `src/vuex/api/exchangeRatePayer_v2.js`.
* `STORE_STATE`: `src/vuex/index.js` module `exchangeRate_v2`; the page maps
  its `fetch` action and current month/vendor state.
* `ROUTES`: router entry `/payer-exchange-rate-v2`, `requiresAuth: true`, and
  the shared `router.beforeEach` cookie/auth guard.
* `API_CLIENT_CALLS`: Axios `baseApi.get('/v2/payer/exchange_rate/' + month)`.
  The adjacent POST in the same module is a mutation surface and is not part
  of the canary.
* `API_HANDLER`: `mobingilabs/ripple-api/src/App/Route/Config/Routing.yaml`
  `get:/payer/exchange_rate/{month}` -> `App\\Handler\\User::getAccountExchangeForMonth`;
  implementation is `src/App/Handler/ExchangeRate.php`.
* `SHARED_INFRA`: `src/router.js`, `src/layouts/DefaultLayout.vue`,
  `src/axios.config.js`, authenticated bootstrap/auth guard, and relevant
  Vuex registration.
* `CONTRACT`: no Blue proto dependency proven for this HTTP read.

## J2 — common exchange-rate read

* `DIRECT_UI_FILES`: `mobingilabs/ripple-ui/src/router.js`,
  `src/pages/ExchangeRate_v2/GlobalExchangeRate/index.vue`,
  `src/pages/ExchangeRate_v2/GlobalExchangeRate/DataTable.vue`,
  `src/vuex/api/exchangeRateGlobal.js`.
* `STORE_STATE`: `src/vuex/index.js` module `exchangeRateGlobal`; the page
  watches vendor and dispatches the reviewed GET fetch.
* `ROUTES`: router entry `/global-exchange-rate-v2`, `requiresAuth: true`,
  plus the shared `router.beforeEach` cookie/auth guard.
* `API_CLIENT_CALLS`: Axios `baseApi.get('/exchange_rate/global/' + vendor)`.
  The adjacent POST write is not a canary dependency.
* `API_HANDLER`: `mobingilabs/ripple-api/src/App/Route/Config/Routing.yaml`
  `get:/exchange_rate/global/{vendor}` ->
  `App\\Handler\\ExchangeRate::getCommonExchangeRate`; implementation is
  `src/App/Handler/ExchangeRate.php`.
* `SHARED_INFRA`: same authenticated router/layout/HTTP configuration as J1.
* `CONTRACT`: no Blue proto dependency proven for this HTTP read.

## J3 — account inventory

* `DIRECT_UI_FILES`: `mobingilabs/ripple-ui/src/router.js`,
  `src/pages/Account/AccountManagement/AccountManagement.vue`,
  `src/pages/Account/AccountManagement/DataTable.vue`,
  `src/vuex/api/accounts.js`, `src/vuex/api/billingGroups.js`, and
  `src/vuex/api/admin.js`.
* `STORE_STATE`: `src/vuex/index.js` modules `accounts` and `billingGroups`;
  the page's `beforeMount` calls `billingGroups.fetch`, and its vendor watcher
  calls `accounts.fetchAccounts` (or the separately gated Azure v3 path).
* `ROUTES`: router entry `/accounts`, `requiresAuth: true`, plus the shared
  auth/layout path.
* `API_CLIENT_CALLS`: Ripple Axios `baseApi.get('/accts', {params: {vendor}})`;
  Blue `streamPromise('GET', 'billing/v1/billinggroups')`; the latter calls
  `parseGrpcData` with `baseUrlForService('blue')`.
* `RIPPLE_API_HANDLER`: `get:/accts` -> `App\\Handler\\Account::getAccountVendor`
  in `mobingilabs/ripple-api/src/App/Handler/Account.php`.
* `BLUE_BACKEND_HANDLER`: `mobingilabs/ouchan/services/billingd/service.go`
  `(*service).ListBillingGroups` ->
  `services/billingd/services/billingsvc.BillingService.ListBillingGroups`;
  the forwarding path uses `services/billingd/fwd/billingfwd.go` and the
  generated `blue-sdk-go/billing/v1` client.
* `CONTRACT`: `alphauslabs/blueapi/billing/v1/billing.proto` declares the
  streamed `Billing.ListBillingGroups` RPC and HTTP `GET /v1/billinggroups`.
  `alphauslabs/blue-sdk-go` is the generated client consumed by `ouchan`.
* `SHARED_TRANSPORT`: `alphauslabs/grpc-chunk-parser` is a direct package
  dependency of `ripple-ui` and is loaded by `src/vuex/api/admin.js`.

## Shared dependency edges

| Edge | Affected journeys | Reason code | Confidence | Risk classes |
| --- | --- | --- | --- | --- |
| Legacy `ripple-ui/src/router.js` route table or `router.beforeEach` | J1, J2, J3 | `SHARED_ROUTER` / `SHARED_AUTH` | HIGH | `ROUTING`, `AUTH_PERMISSIONS` |
| `ripple-ui/src/layouts/DefaultLayout.vue` and authenticated shell bootstrap | J1, J2, J3 | `SHARED_LAYOUT` | HIGH | `SHARED_UI_SHELL`, `RESOURCE_LOADING` |
| `ripple-ui/src/axios.config.js` base URL / request transport | J1, J2, J3 | `SHARED_TRANSPORT` | HIGH | `NETWORK_API_TRANSPORT`, `AUTH_PERMISSIONS` |
| `ripple-ui/src/vuex/index.js` module registration | J1, J2, J3 when the changed registration is global | `SHARED_STATE_INITIALIZATION` | MEDIUM | `SHARED_UI_SHELL`, `ERROR_HANDLING` |
| `ripple-api` shared request/auth dispatch only when source tracing proves it | relevant proven consumers | `SHARED_API_TRANSPORT` | MEDIUM | `NETWORK_API_TRANSPORT`, `AUTH_PERMISSIONS` |
| `grpc-chunk-parser` package | J3 only | `DIRECT_API_CALL` / `SHARED_TRANSPORT` | HIGH | `NETWORK_API_TRANSPORT`, `RESOURCE_LOADING` |

## Explicit non-edges

* A commit message containing `dashboard`, `cost`, `exchange`, or `account`
  does not create an edge.
* J1/J2 are not mapped to the Blue billing proto merely because they share the
  Ripple shell.
* J3 is not mapped to `blueinternal`, `blue-sdk-ts`, or `alupi` without a new
  source-proven callsite.
* Test fixtures, docs, comments, and CI files do not select a product journey
  unless the build/source graph proves runtime inclusion.
* Runtime/build configuration, package manifests, Docker/Make build inputs,
  asset-serving rules, and CSS are not suppressed by filename convention. If
  they have no source-backed edge, they are treated as unresolved runtime
  impact and invoke the visible all-canary fallback. This is conservative for
  structural UI/resource regressions; an isolated cosmetic stylesheet change
  is not silently assumed safe.
* The historical malformed-JSON endpoint remains unresolved and is not
  intentionally replayed or used as a journey dependency.

## Staleness and dead-edge rule

Every generated impact edge carries the repository SHA, map version, and
journey-contract source SHA. A map built at a different source SHA than the
change collector reports `STALE_EDGE` and invokes the conservative all-canary
fallback for relevant runtime changes. A deleted/renamed path is retained as a
historical tombstone only for the range that proves its prior existence.
