# Phase 2B Ripple candidate journey inventory

Inventory recorded 2026-08-12 before implementation or real target activity.
The inventory is source archaeology, not runtime approval. No candidate was
executed while its semantic classification was unresolved.

## Candidate summary

| ID | Candidate | Customer purpose | Verdict |
|---|---|---|---|
| C01 | Authenticated dashboard summary | Confirm the authenticated cost-management landing surface | `REJECT_DUPLICATE_COVERAGE` / `REJECT_UNKNOWN_SEMANTICS`: already covered by Phase 2A shell observation and bootstraps several unrelated APIs. |
| C02 | Payer exchange-rate read | Review exchange rates by payer account, vendor, and month | `STRONG_CANDIDATE` |
| C03 | Common exchange-rate read | Review common-fee exchange rates by vendor and month | `STRONG_CANDIDATE` |
| C04 | Account inventory | Review registered accounts and their billing-group association | `STRONG_CANDIDATE` |
| C05 | Billing-group inventory | Review billing groups and their associated configuration summary | `USABLE_WITH_CONSTRAINTS`, not selected: legacy/MFE feature branching and a second template-read bootstrap make the deployed behavior less deterministic than C04. |
| C06 | Cost Drift analysis | Inspect usage-cost drift for a selected month | `REJECT_OTHER`: the Ouchan `billingd/services/costsdrift/costsdrift.go` handler returns `Unimplemented` whenever `RunEnv != env.Prod`; Phase 2B real execution is DEV only. The POST `:read` path is not intentionally triggered. |
| C07 | Invoice list/detail | Review invoice records or a detail | `REJECT_UNKNOWN_SEMANTICS` / `REJECT_MUTATION_RISK`: MFE/legacy routes include calculation, finalization, adjustment, and export siblings; a narrow read-only deployment contract is not proven. |
| C08 | Project inventory | Review project configuration/list data | `REJECT_UNKNOWN_SEMANTICS`: the page is coupled to create/edit/delete capabilities and the selected GET handler path was not proven end-to-end within the minimum archaeology scope. |
| C09 | Activity logs/export | Review or export activity records | `REJECT_MUTATION_RISK`: export/report behavior is explicitly not assumed read-only and backend job/persistence semantics were not proven. |
| C10 | Billing-group detail | Inspect a billing-group detail page | `REJECT_MUTATION_RISK` / `REJECT_UNKNOWN_SEMANTICS`: detail initialization fans out into settings/resources and the same component tree contains save/tag/account/invoice controls. |

Exactly three candidates are selected for contracts: C02, C03, and C04. They
exercise two independent read-handler paths and an inventory/list path. The
two exchange journeys are not duplicate dashboard tabs: payer scope and
common-fee scope use different routes, source components, endpoint paths, and
backend read methods, and their UI state transitions differ.

## Full inventory fields

| ID | Entry/page/auth | Potential actions and structural markers | Expected calls / semantic classes | Determinism, privacy, third-party, replay | Customer value / verdict |
|---|---|---|---|---|---|
| C01 | `/dashboard`; authenticated QLayout/dashboard components | Navigate and wait for dashboard root; many product cards and controls | Several boot/read calls; not all locally proven; no intentional controls | Timing/request fan-out and feature flags vary; customer data-heavy; no new third party proven; replay overlaps Phase 2A | Landing confirmation is already covered; reject |
| C02 | `/payer-exchange-rate-v2`; authenticated `ReadSettings` menu family | Navigate, wait `.__ExchangeRate`/`.__ExchangeRateDataTable`, local vendor/month/status selectors | `GET /v2/payer/exchange_rate/{month}` `KNOWN_READ`; adjacent POST save `KNOWN_MUTATION` prohibited | Bounded table/read timing; evidence boolean-only; no MFE; fresh-context safe | Payer-scope configuration review; strong candidate |
| C03 | `/global-exchange-rate-v2`; authenticated `ReadSettings` menu family | Navigate, wait `.__GlobalExchangeRateDataTable`, local vendor selector | `GET /exchange_rate/global/{vendor}` `KNOWN_READ`; adjacent POST save `KNOWN_MUTATION` prohibited | Bounded table/read timing; evidence boolean-only; no MFE; fresh-context safe | Common-fee configuration review; strong candidate |
| C04 | `/accounts`; authenticated `ReadAccount` menu family | Navigate, wait account table, optional AWS vendor view; source marker `accountTable` | `GET billing/v1/billinggroups` and `GET /accts?vendor=aws` `KNOWN_READ`; account POST/PUT/DELETE prohibited | AWS fixed by root state; table is customer-data-heavy but evidence structural; no MFE; fresh-context safe | Cloud-account inventory; strong candidate |
| C05 | `/billing-groups`; authenticated `ReadBillingGroup`; legacy or MFE branch | Navigate and wait `.__billing-groups`/legacy table; vendor selector is local/read | Legacy GET billing groups and invoice templates are source-read; MFE calls are not proven in this scope; mutation controls exist but are not clicked | Feature flag chooses branch; MFE/third-party and request-set variance; privacy structural-only; replay conditional | Useful inventory but less deterministic; constrained/rejected |
| C06 | `/cost-drift`; authenticated feature-flagged page | Navigate, wait drift table, month selector would trigger POST read-shaped request | `POST ...usagecostsdrift:read` remains `UNKNOWN` for Phase 2B DEV; billing-group GET follows; no action permitted | DEV handler returns Unimplemented; historical malformed JSON unresolved; no replay | Interesting analysis but unavailable/ambiguous in DEV; reject |
| C07 | Invoice MFE/list/detail family; authenticated invoice permissions | Navigate/read table would coexist with create, calculate, finalize, adjustment/export siblings | Endpoint set not proven narrowly; mutation/export semantics unknown | MFE and data variance; financial/privacy risk; replay not approved | Customer invoice behavior not safe for this phase; reject |
| C08 | `/projects`; authenticated project permissions | Navigate/list; page exposes create/edit/delete | Selected GET/backend path not end-to-end proven here; sibling POST/DELETE mutations | Feature and data variance; customer/project IDs; replay not approved | Inventory potentially valuable but source gap; reject |
| C09 | `/activity-logs` or export tools; authenticated tool permissions | Navigate or export | Export/job persistence semantics unknown; export is never presumed read-only | Raw logs/downloads and query/body risk; replay prohibited | Safety bar not met; reject |
| C10 | `/billing-groups/:id` or detail subroute; authenticated billing-group permissions | Navigate detail only would initialize settings/resources and expose save/tag/account/invoice actions | Mixed endpoint tree; not all reads/mutations isolated | Customer-specific ID required; high data and mutation risk; replay unsafe | Detail value does not justify ambiguity; reject |

## C02 — Payer exchange-rate read

- **Entry route:** `/payer-exchange-rate-v2` (the canonical menu route
  `/payer-exchange-rate` is converted to this route by Ripple's
  `router.afterEach` when the Multi Currency flag is active).
- **Page/components:** `src/pages/ExchangeRate_v2/PayerExchangeRate/index.vue`,
  `DataTable.vue`, and `DataTableSelectors.vue`.
- **Customer purpose:** inspect payer-level exchange rates without changing
  them.
- **Allowed actions:** approved navigation; wait for the source-defined
  `.__ExchangeRate` and `.__ExchangeRateDataTable` roots; optionally select
  an existing vendor/month/status view control. Status and vendor setters are
  Vuex local-view mutations; month selection triggers the source-defined read.
- **Expected read API:** UI `src/vuex/api/exchangeRatePayer_v2.js` calls
  `GET /v2/payer/exchange_rate/{month}`.
- **Backend proof:** Ripple API routing maps this GET to
  `App\\Handler\\ExchangeRate::getAccountExchangeForMonth`. That method reads
  user payer metadata and `secondaryListItems` values, then constructs the
  response. The adjacent POST maps to
  `saveAccountExchangeForMonth`, whose `master_tbl->updateItem` writes are
  outside the contract and are never clicked.
- **Structural markers:** source-defined page root and data-table root; no
  customer-derived selector is required.
- **Risk/determinism:** table values and payer identifiers are customer data,
  so evidence records only booleans/counts/classes. Request ordering and
  timing are bounded variance. The v2 route has no MFE dependency.

## C03 — Common exchange-rate read

- **Entry route:** `/global-exchange-rate-v2` (explicit v2 route avoids the
  legacy page's unrelated Azure exchange bootstrap; the route is authenticated
  and source-defined in the current router).
- **Page/components:** `src/pages/ExchangeRate_v2/GlobalExchangeRate/index.vue`,
  `DataTable.vue`, and `DataTableSelectors.vue`.
- **Customer purpose:** inspect common exchange rates used for common fees by
  vendor and month.
- **Allowed actions:** approved navigation; wait for
  `.__GlobalExchangeRateDataTable`; optionally select a vendor view. The
  selector only updates the exchange-rate Vuex view state and the page watcher
  invokes the same known GET for the selected vendor.
- **Expected read API:** `src/vuex/api/exchangeRateGlobal.js` calls
  `GET /exchange_rate/global/{vendor}`.
- **Backend proof:** Ripple API routing maps this GET to
  `App\\Handler\\ExchangeRate::getCommonExchangeRate`. The handler validates
  the vendor, reads user currency metadata and master-table lists, and builds
  the returned months/rates. The adjacent POST maps to
  `setCommonExchangeRate`, which calls `createItem`; it is a known mutation
  and is prohibited from the journey.
- **Structural markers:** source-defined v2 data-table root and table name;
  no customer-derived selector is required.
- **Risk/determinism:** customer rate values never enter evidence. Vendor
  view changes are bounded to the approved AWS/Azure read path; the source
  disables GCP in the selector. No export or edit menu is opened.

## C04 — Account inventory

- **Entry route:** `/accounts`.
- **Page/components:** `src/pages/Account/AccountManagement/AccountManagement.vue`,
  `DataTable.vue`, and `HeadContents.vue`.
- **Customer purpose:** inspect registered cloud accounts and their billing
  group/payer association.
- **Allowed actions:** approved navigation; wait for the account table; select
  the source-defined AWS vendor view if needed. The root store fixes
  `defaultVendor` to `aws`, so the initial source path is deterministic.
- **Expected read APIs:** page initialization first dispatches billing-group
  list fetch and then account fetch. The selected source paths are
  `GET billing/v1/billinggroups` via `streamPromise('GET', ...)` and
  `GET /accts?vendor=aws` via `src/vuex/api/accounts.js`.
- **Backend proof:** Ouchan `billingd` `ListBillingGroups` streams billing
  group data through read helpers; no write method is called. Ripple API
  routing maps `GET /accts` to `App\\Handler\\Account::getAccountVendor`.
  That method reads cache/table data, assembles the response, applies RBAC
  filtering, and only updates an internal cache on a miss. The adjacent POST,
  edit, rate, and DELETE routes are known mutations and are never triggered.
- **Structural markers:** source-defined `accountTable` component and the
  account-management page root/table wrapper. Evidence stores no account
  names, IDs, counts, or rendered text.
- **Risk/determinism:** the page exposes create/edit/delete controls but no
  control is clicked. AWS is fixed by source before the initial fetch; Azure
  v3 conditional code is not intentionally selected. Background request
  count/order is bounded variance.

## Semantic classification ledger

| Intentional/required source behavior | Class | Proof status | Contract status |
|---|---|---|---|
| `GET /v2/payer/exchange_rate/{month}` | `KNOWN_READ` | Ripple UI action → Ripple API route → `ExchangeRate::getAccountExchangeForMonth`; only reads/response assembly | Approved |
| `GET /exchange_rate/global/{vendor}` | `KNOWN_READ` | Ripple UI action → Ripple API route → `ExchangeRate::getCommonExchangeRate`; only reads/response assembly | Approved |
| `GET /billing/v1/billinggroups` | `KNOWN_READ` | Ripple UI `streamPromise('GET')` → Blue Billing list RPC → Ouchan list/read helpers | Approved |
| `GET /accts?vendor=aws` | `KNOWN_READ` | Ripple UI action → Ripple API route → `Account::getAccountVendor`; read/cache assembly | Approved |
| `POST /v2/payer/exchange_rate/{month}` | `KNOWN_MUTATION` | Maps to `saveAccountExchangeForMonth` and table updates | Prohibited; never triggered |
| `POST /exchange_rate/global/{vendor}/{month}` | `KNOWN_MUTATION` | Maps to `setCommonExchangeRate` and `createItem` | Prohibited; never triggered |
| `POST /billing/v1/...` and any account POST/PUT/DELETE | `KNOWN_MUTATION` or out of contract | Source mutation handlers exist | Prohibited; never triggered |
| Cost Drift `POST /billing/v1/aws/usagecostsdrift:read` | `UNKNOWN` for Phase 2B execution | Source has a POST read-shaped contract, but DEV handler is unimplemented and historical protocol anomaly remains unresolved | Rejected; not intentionally triggered |

Passive initialization traffic that is not one of the approved endpoint rules
remains `PASSIVE_UNKNOWN_OBSERVED`; it is never dynamically blessed. Any
unknown request causally attributable to an intentional step is a semantic
safety stop.
