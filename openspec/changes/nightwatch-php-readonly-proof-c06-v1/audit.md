# Audit — PHP Read-Only Proof (C-06)

Every figure below was measured read-only, from current source, during this
campaign. Company repositories were read through the existing confined
`SiblingSourceAccess` boundary and were not modified.

## A.1 — The authority being removed

`src/core/source/surfaces.ts` (pre-C-06, lines 186-192) decided read-only
classification at PARSE time, before any handler, middleware or join had been
read:

```
if (binding.ambiguous) return 'AMBIGUOUS';
if (binding.operation?.semanticClass === 'KNOWN_MUTATION') return 'PROVEN_MUTATION_CAPABLE';
if (routeMethod !== 'GET') return 'PROVEN_MUTATION_CAPABLE';
if (binding.operation?.semanticClass === 'KNOWN_READ' && !binding.stale) return 'PROVEN_READ_ONLY';
return 'READ_ONLY_METHOD_ONLY';
```

`binding.operation` is a row of `PHASE5_API_CATALOG`
(`src/api/phase5/catalog.ts`): eleven hand-authored operations, six
`KNOWN_READ`, four `KNOWN_MUTATION`, one `UNKNOWN`.

Two of the six `KNOWN_READ` rows are the historical D-79 false-positive
admissions (`docs/DECISIONS.md` D-79):

| operationId | route | handler |
|---|---|---|
| `ripple.billing-groups-legacy.read` | `GET /m/ripple/billinggroup` | `BillingGroup::getBillingGroupAccount` |
| `ripple.billing-group-exchange.read` | `GET /m/ripple/exchange_rate/billing_group/{period}` | `BillingGroup::getExchangeRateForBillingGroup` |

## A.2 — The F-01 counterexample, re-measured

`mobingilabs/ripple-api` at `27bb007a`:

- `src/App/Route/Providor/RouteProvidor.php:16-26` constructs the header,
  x-header and subscription middleware; `:22,:24` attach two middlewares
  unconditionally; `:69-77` iterate the effective flag map and attach
  `$set_header` under `header`, and BOTH `$marketplace_subscription` and
  `$x_header` under `x-header`.
- `src/App/Route/Config/Routing.yaml:488-491` sets `default_config.middleware`
  to `header: true`, `x-header: true`.
- Exactly ONE of the 118 declared routes overrides those defaults:
  `get:/version` at `:505-513` sets both to `false`. Every other route in the
  repository therefore carries `MarketplaceSubscriptionMiddleware`.
- `src/App/Middleware/MarketplaceSubscriptionMiddleware.php:26` declares
  `__invoke($request, $response, $next)` with no HTTP-method guard; `:100-119`
  performs a `curl` request to a hard-coded external endpoint. The endpoint
  constant is referenced by file and line and is deliberately not reproduced.

`get:/version` is declared in the class form (`class: …::getVersion`,
`client: null`), so it carries no `client`/`method` pair and its route proof is
`UNSUPPORTED`. There is consequently no `ripple-api` route that both opts out
of the outbound-call middleware and resolves a handler join.

## A.3 — Callee surface

Distinct callee identifiers extracted from 95 PHP files under
`ripple-api/src/App`: 549 method-call identifiers, 202 bare function-call
identifiers. The measured write surface reproduces the T-02 seed figures
exactly: `updateItem` 145, `deleteItem` 82, `deleteHashData` 73,
`createItem` 72.

Declared wrapper surfaces used to seed the vocabulary, each read from its
declaration site: `Core/Dao/DynamoDbDao.php` (20 methods),
`Core/Utility/Cache.php` (26), `Core/Utility/Email.php` (7),
`Core/Utility/Slack.php` (14), `Core/Utility/Backlog.php` (5).

Dynamic dispatch is real and present: `Handler/IntegrateApp.php:58-131`
constructs method names by concatenation and invokes `$this->$callfnc()`;
`Handler/Traits/CalculationTrait.php` invokes `$this->{$this->modal->…}()` at
roughly 20 sites; `Route/Config.php` dispatches handlers through
`call_user_func_array`.

## A.4 — Result over the approved universe

Measured through `discoverSourceSurfaces` over the real approved universe,
before and after this campaign:

| figure | before | after |
|---|---|---|
| operations projected | 814 | 814 |
| operations truncated | 0 | 0 |
| `READ_ONLY_PROVEN` | **5** | **0** |
| mutation-capable | 548 | 549 |

After, per repository:

| repository | ops | proof states | classification |
|---|---|---|---|
| `mobingilabs/ripple-api` | 223 | 222 `MUTATION_CAPABLE`, 1 `UNKNOWN` | 143 `PROVEN_MUTATION_CAPABLE`, 79 `CONDITIONAL_MUTATION`, 1 `UNSUPPORTED` |
| `alphauslabs/blueapi` | 591 | 406 `MUTATION_CAPABLE`, 185 `READ_ONLY_SINGLE_WITNESS` | 406 `PROVEN_MUTATION_CAPABLE`, 185 `READ_ONLY_METHOD_ONLY` |

`ripple-api` effect ledger (occurrences across all analysed closures):
`PURE_READ` 7,506; `UNCLASSIFIED` 15,232; `DATA_WRITE` 272; `EXTERNAL_CALL`
230; `CACHE_WRITE` 150. First disqualifying kind per route: 79
`EXTERNAL_CALL`, 72 `DATA_WRITE`, 71 `CACHE_WRITE`.

Callee-classification coverage is NOT complete: 6,114 distinct unclassified
callee identities were reached across `ripple-api` closures. Every proof that
reaches one is denied with `CALLEE_CLASSIFICATION_INCOMPLETE`. That is the
`UNCLASSIFIED > 0` promotion block working, and it is reported rather than
papered over.

`alphauslabs/blueapi` has no effect analyzer at all — its 185 GET operations
are single-witness and DENIED. Generated-artifact route evidence from C-02a
grants no effect proof, which is the intended relationship.
