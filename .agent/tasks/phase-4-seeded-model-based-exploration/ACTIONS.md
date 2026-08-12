# Phase 4 Safe-Action Catalog and Candidate Inventory

Catalog version: `nightwatch.safe-actions.phase4.v1`
Status: `SOURCE_REVIEWED_PENDING_IMPLEMENTATION`

The catalog contains only source-reviewed, declarative actions. It contains
both admitted actions and rejected candidates; absence from the catalog never
means “not reviewed.” No live DOM crawling was used or is permitted.

## Candidate schema

Each candidate records: candidate ID, anchor, surface/control, source file and
symbol, source SHA/freshness, action type, precondition, locator strategy,
client-state effect, network effect, known reads, known mutations, unknown
endpoints, persisted preference effect, analytics effect, route effect,
expected state delta, replay safety, privacy risk, and verdict.

## Approved actions

The following actions are admitted to the v1 catalog. Their locators use only
source-defined component classes, source-defined labels/roles, and fixed
source-defined option values. They do not use customer text, row identifiers,
DOM enumeration, `nth-child`, or arbitrary callbacks.

| actionId | anchor / control | class | bounded value | source proof | expected effect |
|---|---|---|---|---|---|
| `p4.j1.vendor-local.aws` | J1 `DataTableSelectors` vendor Selector | `APPROVE_LOCAL_ONLY` | `aws` | `PayerExchangeRate/DataTableSelectors.vue` vendor v-model only; `exchangeRatePayer_v2.js` getter filters in memory | `safeViewState.vendor=aws`; no request |
| `p4.j1.vendor-local.azure` | J1 vendor Selector | `APPROVE_LOCAL_ONLY` | `azure` | same as above | `safeViewState.vendor=azure`; no request |
| `p4.j1.vendor-local.gcp` | J1 vendor Selector | `APPROVE_LOCAL_ONLY` | `gcp` | same as above; value comes from `lib/vendors.js` | `safeViewState.vendor=gcp`; no request |
| `p4.j1.status-local.set` | J1 exchange-rate status Selector | `APPROVE_LOCAL_ONLY` | `set` | `DataTableSelectors.vue` mutation plus `exchangeRatePayer_v2.js` status getter filter | `safeViewState.status=set`; no request |
| `p4.j1.status-local.not-set` | J1 status Selector | `APPROVE_LOCAL_ONLY` | `not_set` | same as above | `safeViewState.status=not_set`; no request |
| `p4.j2.vendor-read.aws` | J2 vendor Selector | `APPROVE_READ_ONLY` | `aws` | `GlobalExchangeRate/DataTableSelectors.vue` v-model; `index.vue` vendor watcher dispatches `fetch`; `exchangeRateGlobal.js` GET | `safeViewState.vendor=aws`; `ripple.common-exchange.read` |
| `p4.j2.vendor-read.azure` | J2 vendor Selector | `APPROVE_READ_ONLY` | `azure` | same as above; GCP is source-disabled | `safeViewState.vendor=azure`; `ripple.common-exchange.read` |
| `p4.j3.sort-account` | J3 account table Account column header | `APPROVE_LOCAL_ONLY` | source column `account` | `AccountManagement/DataTable.vue` declares sortable `account`; `CustomDataTable.vue` binds Quasar `q-table` data/pagination locally and does not persist sort | `safeViewState.sortKey=account`; no request |
| `p4.j3.sort-billinggroup` | J3 account table Billing group column header | `APPROVE_LOCAL_ONLY` | source column `billinggroup` | same source chain | `safeViewState.sortKey=billinggroup`; no request |
| `p4.j1.return-anchor` | J1 approved anchor route | `APPROVE_READ_ONLY` | `/payer-exchange-rate-v2` | existing Phase 2B router/journey contract and payer GET registry | returns only to the same approved route and reuses the trusted read |
| `p4.j2.return-anchor` | J2 approved anchor route | `APPROVE_READ_ONLY` | `/global-exchange-rate-v2` | existing Phase 2B router/journey contract and common GET registry | returns only to the same approved route and reuses the trusted read |
| `p4.j3.return-anchor` | J3 approved anchor route | `APPROVE_READ_ONLY` | `/accounts` | existing Phase 2B router/journey contract, account GET, and Blue billing GET proof | returns only to the same approved route and reuses trusted reads |

Common locator forms are declarative: `selector-option` scopes to the
source-defined surface and `.__C_Selector-Label` label, then selects one fixed
option; `vendor-tab` uses the source-defined tab role/value; `column-header`
uses one source-defined column-header name and requires a unique match. A
runtime count other than one is `RUNTIME_CONTROL_ABSENT`, never a reason to
search for a similar control.

## Rejected-action ledger

The rejected ledger is intentionally explicit:

| candidate | verdict | reason / evidence |
|---|---|---|
| `p4.j1.month-source-list` | `REJECT_NONDETERMINISTIC` | Month values come from runtime `user.months`; initial v1 has no fixed period enum and does not select by customer/runtime text. |
| `p4.j1.modify-all-payers` | `REJECT_MUTATION` | J1 `HeadContents.vue` is RBAC-gated and opens the write workflow; payer POST is `ripple.payer-exchange.write`. |
| `p4.j1.edit-exchange-rate` | `REJECT_MUTATION` | Edit dialog leads to POST exchange-rate write; visual proximity is not safety proof. |
| `p4.j1.search` | `REJECT_PERSISTED_PREFERENCE` | `CustomDataTable` writes search state to `sessionStorage`; free-text input is also outside v1. |
| `p4.j1.visible-columns` | `REJECT_PERSISTED_PREFERENCE` | `CustomDataTable` writes `table-visibleColumn-*` to `localStorage`. |
| `p4.j2.edit-rate-menu` | `REJECT_MUTATION` | `DataTable.vue` `ActionCellMenu` emits `edit`; `index.vue` opens the edit workflow and `exchangeRateGlobal.js` POST is known mutation. |
| `p4.j2.search` | `REJECT_PERSISTED_PREFERENCE` | shared table search is persisted in `sessionStorage`; no free-text exploration. |
| `p4.j2.visible-columns` | `REJECT_PERSISTED_PREFERENCE` | shared table column settings are persisted in `localStorage`. |
| `p4.j2.table-sort` | `REJECT_UNSTABLE_SELECTOR` | local sort is plausible, but the v1 J2 table has no independently unique header contract in the reviewed surface. |
| `p4.j3.vendor-switch` | `REJECT_OTHER` | Tracking ref `f6b2d2f6` changes account loading to append `POST cost/v1/{vendor}/aors:read`; deployment identity is unresolved and this family is not in the frozen J3 registry. `SOURCE_STALE_REVIEW_REQUIRED`. |
| `p4.j3.add-account` | `REJECT_MUTATION` | `HeadContents.vue` opens create-account modal; Ripple API POST `/accts` is `KNOWN_MUTATION`. |
| `p4.j3.account-action-menu` | `REJECT_MUTATION` | edit/service/delete actions open write workflows; API has POST/PUT/DELETE account mutations. |
| `p4.j3.row-detail` | `REJECT_CUSTOMER_SPECIFIC` | expanded detail is keyed by `customer_id` and renders account/customer/resource fields; v1 does not select or persist customer-specific rows. |
| `p4.j3.search` | `REJECT_PERSISTED_PREFERENCE` | shared table search is persisted in `sessionStorage`; no free-text exploration. |
| `p4.j3.visible-columns` | `REJECT_PERSISTED_PREFERENCE` | shared table column settings are persisted in `localStorage`. |
| `p4.j3.pagination` | `REJECT_UNSTABLE_SELECTOR` | q-table pagination is local, but the reviewed component exposes no unique source-backed pagination control contract; v1 will not infer one from DOM presence. |
| any unlisted button/control | `REJECT_UNKNOWN` | candidate discovery from live DOM is prohibited; no source semantic chain was admitted. |

## Review rule

A seed, model, runtime DOM, or visible label cannot promote a candidate. A
source change after catalog creation invalidates the relevant action until the
source delta is reviewed. The J3 vendor action is the concrete Phase 4
staleness example and remains excluded from all real runs.

## Semantic proof summary

- J1 vendor/status changes terminate in Vuex mutations/getters and do not call
  an action or API. J1 month is deliberately rejected because the value domain
  is runtime-provided; the already-trusted anchor owns the reviewed GET.
- J2 vendor changes call the existing watcher and `fetch`, whose only reviewed
  request is GET `/m/ripple/exchange_rate/global/(aws|azure)`, already present
  in `buildRippleJourneyEndpointRegistry`. The POST save path is explicitly
  forbidden and the edit menu is excluded.
- J3 sorting is a local Quasar table operation over the already-fetched
  `:data`; it is not a server request and `CustomDataTable` persists only
  search/column preferences, not sort. Account vendor switching is not admitted
  because the tracking-ref delta changed its request graph.

## Source provenance used

- Ripple UI checkout: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`.
- Ripple API checkout: `27bb007ad0...` (the exact full SHA is in
  `FRESHNESS.md`).
- Blue API billing read proof: `blueapi/billing/v1/billing.proto` declares GET
  `/v1/billinggroups`; write methods are POST/PUT/DELETE. This supports the
  trusted J3 anchor but does not broaden the J3 exploration catalog.
- Tracking-ref delta reviewed narrowly: Ripple UI `origin/dev`
  `f6b2d2f6d580ce52227596b4f822d983bbda533b`, only the J3 component and
  accounts module changed in the relevant paths; the delta adds the
  supplementary `cost/v1/{vendor}/aors:read` POST call.
