# Phase 2B Ripple Journey Contracts

Status: `APPROVED_FOR_SYNTHETIC_IMPLEMENTATION`; no real DEV execution is
authorized by this document alone. The executable definitions are in
`src/products/ripple/journeyContracts.ts`; this document is the human-auditable
contract and source-proof index.

## Selection

Exactly three journeys are selected from the completed candidate inventory:

| ID | Journey | Customer purpose | Distinct behavior |
|---|---|---|---|
| `ripple-payer-exchange-read` | Payer exchange-rate read | Review payer-level exchange rates by vendor/month without changing settings | Payer-scoped analytical read |
| `ripple-common-exchange-read` | Common exchange-rate read | Review common-fee exchange rates by vendor/month without changing settings | Common-fee analytical read |
| `ripple-account-inventory` | Account inventory | Review registered cloud accounts and billing-group/payer association | Account inventory plus Blue billing-group list read |

The exchange journeys use the current v2 routes. The account journey uses the
source-default AWS view and does not select a vendor, row, detail, edit, or
export control. The three surfaces exercise different data scopes and API
families; none is a dashboard/shell duplicate.

## Shared contract

- Ripple UI source: `mobingilabs/ripple-ui@d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
  (`dev`, local `origin/dev` is `e46b8ed6...`, 0 ahead/21 behind; selected
  files are unchanged in that local tracking ref).
- Ripple API source: `mobingilabs/ripple-api@27bb007...` (`master` equals its
  local tracking ref).
- Global start condition: approved authenticated DEV target and the Phase 2A
  page-readable auth gate; `document.readyState === "complete"`,
  `.q-layout-container.layout` present, and the route stable for at least
  750 ms. `#app` remains a pre-mount diagnostic only.
- Allowed action vocabulary: `NAVIGATE_APPROVED_ROUTE`,
  `CLICK_READ_ONLY_CONTROL`, `SELECT_LOCAL_VIEW`,
  `SELECT_READ_QUERY_FILTER`, `OPEN_READ_ONLY_DETAIL`, and
  `WAIT_STRUCTURAL_CHECKPOINT`. No generic click, arbitrary script, fill,
  submit, save, export, or customer-derived selector is allowed.
- Every intentional network action must match an executable source-backed
  `KNOWN_READ` rule or be `LOCAL_ONLY`. `KNOWN_MUTATION` is blocked by the
  network observer. `UNKNOWN` is never intentionally invoked.
- Structural observations are booleans/counts and fixed selector IDs only;
  no DOM, text, labels, account identifiers, costs, bodies, headers, cookies,
  tokens, screenshots, or authenticated traces are persisted.
- A replay creates a new browser context and repeats the same definition and
  steps. Strict invariants are compared separately from bounded timing,
  ordering, passive-initialization-count, and background-block variance.

## Contract: `ripple-payer-exchange-read`

- `NAME`: Payer exchange-rate read
- `CUSTOMER_PURPOSE`: Review payer-level exchange rates by vendor/month without
  changing settings.
- `SOURCE_SHA`: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
- `START_ROUTE`: `/payer-exchange-rate-v2`
- `EXPECTED_END_ROUTE_OR_ROUTE_CLASS`: `/payer-exchange-rate-v2`
- `GLOBAL_SHELL_REQUIREMENT`: `.q-layout-container.layout`, complete document,
  route stable ≥750 ms.
- `JOURNEY_SPECIFIC_STRUCTURAL_MARKERS`: `.__ExchangeRate` and
  `.__ExchangeRateDataTable`, each count ≥1. The table root is from
  `src/pages/ExchangeRate_v2/PayerExchangeRate/DataTable.vue`.
- `ALLOWED_STEPS`:
  - `payer-navigate`: `NAVIGATE_APPROVED_ROUTE`; source route and page created
    hook dispatch the reviewed GET; expected read rule
    `ripple.payer-exchange.read`.
  - `payer-structural-checkpoint`:
    `WAIT_STRUCTURAL_CHECKPOINT`; table-root presence only; `LOCAL_ONLY`.
- `PROHIBITED_STEPS`: all save/create/edit/delete/export/action-menu/form
  interactions, row detail, POST/PUT/PATCH/DELETE controls, arbitrary script,
  random selection, nth-child, or customer-derived text.
- `KNOWN_READ_ENDPOINTS`: `ripple.payer-exchange.read`.
- `KNOWN_MUTATION_ENDPOINTS`: `ripple.payer-exchange.write` (POST; never
  intentionally triggered).
- `UNKNOWN_ENDPOINTS`: none intentionally required; passive bootstrap traffic
  may remain `PASSIVE_UNKNOWN_OBSERVED`.
- `EXPECTED_PASSIVE_INITIALIZATION_REQUESTS`: source-unreviewed auth/bootstrap/
  feature traffic may be observed passively and is never replayed.
- `EXPECTED_BLOCKED_DESTINATIONS`: only policy-defined telemetry, optional
  support, and browser-background hosts.
- `STEP_TIMEOUTS`: navigation 30,000 ms; structural checkpoint 15,000 ms.
- `GENERIC_ORACLES`: unexpected status, malformed JSON/NDJSON, runtime/page
  errors, CSP, critical asset failure, structural readiness, route contradiction;
  navigation cancellation is not a critical-asset failure.
- `JOURNEY_ORACLES`: required table root and required read rule occur; route
  stays in the approved class.
- `PRIVACY_CONTRACT`: metadata-only fixed IDs/classes/booleans/counts/timings.
- `REPLAY_CONTRACT`: fresh context, same external auth, target, definition,
  selectors, policy, and steps; no third replay.
- `STRICT_INVARIANTS`: same journey/source contract, route class, marker set,
  required read rule/class, zero mutation/action-caused unknown/safety/DB
  events, auth validity, fatal-oracle status, and privacy result.
- `BOUNDED_VARIANCE`: timing, concurrent ordering, passive unknown count, and
  optional/background block counts.
- `STOP_CONDITIONS`: invalid auth, new/production/unknown destination, proxy
  violation, mutation, action-caused unknown, structural/oracle failure, or
  privacy failure.
- `SOURCE_EVIDENCE`: router; payer v2 page/DataTable; `exchangeRatePayer_v2.js`;
  Ripple API `Routing.yaml`; `ExchangeRate.php` read handler.

## Contract: `ripple-common-exchange-read`

- `NAME`: Common exchange-rate read
- `CUSTOMER_PURPOSE`: Review common-fee exchange rates by vendor/month without
  changing settings.
- `SOURCE_SHA`: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
- `START_ROUTE`: `/global-exchange-rate-v2`
- `EXPECTED_END_ROUTE_OR_ROUTE_CLASS`: `/global-exchange-rate-v2`
- `GLOBAL_SHELL_REQUIREMENT`: `.q-layout-container.layout`, complete document,
  route stable ≥750 ms.
- `JOURNEY_SPECIFIC_STRUCTURAL_MARKERS`: `.__GlobalExchangeRateDataTable`
  count ≥1 from the v2 GlobalExchangeRate DataTable root.
- `ALLOWED_STEPS`:
  - `common-navigate`: `NAVIGATE_APPROVED_ROUTE`; source route/page watcher
    invokes the reviewed GET; expected read rule
    `ripple.common-exchange.read`.
  - `common-structural-checkpoint`:
    `WAIT_STRUCTURAL_CHECKPOINT`; table-root presence only; `LOCAL_ONLY`.
- `PROHIBITED_STEPS`: all save/create/edit/delete/export/action-menu/form/row
  detail interactions, mutation methods, arbitrary script, random selection,
  nth-child, or customer-derived text.
- `KNOWN_READ_ENDPOINTS`: `ripple.common-exchange.read`.
- `KNOWN_MUTATION_ENDPOINTS`: `ripple.common-exchange.write` (POST; never
  intentionally triggered).
- `UNKNOWN_ENDPOINTS`: none intentionally required; passive bootstrap traffic
  is recorded separately.
- `EXPECTED_PASSIVE_INITIALIZATION_REQUESTS`: same passive-only bootstrap rule.
- `EXPECTED_BLOCKED_DESTINATIONS`: policy-defined telemetry, optional support,
  browser-background hosts only.
- `STEP_TIMEOUTS`: navigation 30,000 ms; structural checkpoint 15,000 ms.
- `GENERIC_ORACLES`, `JOURNEY_ORACLES`, `PRIVACY_CONTRACT`,
  `REPLAY_CONTRACT`, `STRICT_INVARIANTS`, `BOUNDED_VARIANCE`, and
  `STOP_CONDITIONS`: shared contract above, with this route and marker.
- `SOURCE_EVIDENCE`: router; GlobalExchangeRate v2 page/DataTable;
  `exchangeRateGlobal.js`; Ripple API `Routing.yaml`; `ExchangeRate.php` read
  handler.

## Contract: `ripple-account-inventory`

- `NAME`: Account inventory
- `CUSTOMER_PURPOSE`: Review registered cloud accounts and their billing-group/
  payer association.
- `SOURCE_SHA`: `d80b161b684d9153c7e5acaa65ae1752d93d8ba9`
- `START_ROUTE`: `/accounts`
- `EXPECTED_END_ROUTE_OR_ROUTE_CLASS`: `/accounts`
- `GLOBAL_SHELL_REQUIREMENT`: `.q-layout-container.layout`, complete document,
  route stable ≥750 ms.
- `JOURNEY_SPECIFIC_STRUCTURAL_MARKERS`: `.__CustomDataTable` count ≥1 from
  AccountManagement’s `CustomDataTable` root.
- `ALLOWED_STEPS`:
  - `account-navigate`: `NAVIGATE_APPROVED_ROUTE`; source `defaultVendor` is
    AWS and initialization performs only the two reviewed list reads:
    `ripple.billing-groups.read` and `ripple.account-inventory.read`.
  - `account-structural-checkpoint`:
    `WAIT_STRUCTURAL_CHECKPOINT`; table-root presence only; `LOCAL_ONLY`.
- `PROHIBITED_STEPS`: vendor changes, row/detail opens, account or billing-group
  edits, create/delete/rate actions, exports, form/search input, arbitrary
  script, random selection, nth-child, and customer-derived text.
- `KNOWN_READ_ENDPOINTS`: `ripple.billing-groups.read`,
  `ripple.account-inventory.read`.
- `KNOWN_MUTATION_ENDPOINTS`: billing-group write and account POST/PUT/DELETE
  rules; none are intentionally triggered.
- `UNKNOWN_ENDPOINTS`: none intentionally required; passive bootstrap traffic
  is recorded separately.
- `EXPECTED_PASSIVE_INITIALIZATION_REQUESTS`: same passive-only bootstrap rule.
- `EXPECTED_BLOCKED_DESTINATIONS`: policy-defined telemetry, optional support,
  browser-background hosts only.
- `STEP_TIMEOUTS`: navigation 30,000 ms; structural checkpoint 15,000 ms.
- `GENERIC_ORACLES`, `JOURNEY_ORACLES`, `PRIVACY_CONTRACT`,
  `REPLAY_CONTRACT`, `STRICT_INVARIANTS`, `BOUNDED_VARIANCE`, and
  `STOP_CONDITIONS`: shared contract above, with this route and marker.
- `SOURCE_EVIDENCE`: router; `AccountManagement.vue`; account and billing-group
  Vuex API modules; Ripple API `Routing.yaml`/`Account.php`; Ouchan
  `billingd/services/billingsvc/billingsvc.go` list operation.

## Semantic endpoint registry

The executable registry is exact-host, source-proven, and path-anchored. Query
values are not used for classification. Any API host/path/method not matching a
rule remains `UNKNOWN`; no dynamic blessing is possible.

| Rule ID | Method/path class | Semantic proof | Action policy |
|---|---|---|---|
| `ripple.payer-exchange.read` | GET `/m/ripple/v2/payer/exchange_rate/YYYY-MM` | `exchangeRatePayer_v2` → Ripple `getAccountExchangeForMonth`, reads/assembles response | allowed intentional read |
| `ripple.payer-exchange.write` | POST same path | `saveAccountExchangeForMonth`, table update | block/stop |
| `ripple.common-exchange.read` | GET `/m/ripple/exchange_rate/global/{aws,azure}` | `exchangeRateGlobal` → `getCommonExchangeRate`, reads/assembles response | allowed intentional read |
| `ripple.common-exchange.write` | POST `/m/ripple/exchange_rate/global/{vendor}/YYYY-MM` | `setCommonExchangeRate`/create item | block/stop |
| `ripple.billing-groups.read` | GET `/m/blue/billing/v1/billinggroups` | Blue list → Ouchan `ListBillingGroups` read helpers | allowed intentional read |
| `ripple.billing-groups.write` | POST same base | Blue create operation | block/stop |
| `ripple.account-inventory.read` | GET `/m/ripple/accts` | account GET → `Account::getAccountVendor` read/cache assembly | allowed intentional read |
| `ripple.account-inventory.write.{post,put,delete}` | POST/PUT/DELETE `/m/ripple/accts...` | account create/edit/rate/delete handlers mutate state | block/stop |

No database query or datastore oracle is part of Phase 2B. The historical
malformed-JSON POST at `/m/blue/cost/v1/` remains unresolved and outside all
contracts; it is not deliberately replayed.

