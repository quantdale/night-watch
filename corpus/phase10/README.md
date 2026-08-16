# Phase 10 fixture corpus (synthetic only)

Deterministic synthetic fixtures for the Phase 10A deeper real-source
semantic contracts implementation. **No real customer data, no real product
bodies, no captured DEV/browser evidence** — every value is an obvious
synthetic placeholder.

## Layout

- `source-fixture/exchangeRateDeepFixture.ts` — current-source mirror of
  mobingilabs/ripple-api @ `169df39d` `ExchangeRate.php` + `Routing.yaml`
  (the mechanically relevant structure only): empty-guarded `(object)` cast
  in `getCommonExchangeRate` (empty case serializes `{}`), no-cast
  `[]`/string-key-subscript pattern in `getAccountExchangeForMonth`
  (OBJECT-or-ARRAY). Consumed through the SAME static-text
  `RealSourceReader` interface used for real read-only checkouts (never
  executed).
- `source-fixture/phase10Fixtures.ts` — validated fixture recipe set
  (2 v2 deep + 2 v1 shape-only) + in-memory map source state + derivation
  helper (CI-safe, no sibling checkouts required).
- `historical/archivedV1Recipes.ts` — the RETIRED Phase 9A.1 v1 recipes for
  common-exchange / payer-exchange, byte-meaning-stable, used ONLY for
  baseline (shape-only) and identity-history tests. Never part of the active
  registry.
- `defects/` — the four seeded deep defect classes (raw protocol-valid
  bodies + scenario manifests):
  1. `common-exchange-type-string` — `exchange_rate` is a JSON STRING
     (source establishes OBJECT).
  2. `common-exchange-type-empty-array` — `exchange_rate` is an uncast empty
     JSON ARRAY (source empty case is `(object)`-cast to `{}`).
  3. `payer-exchange-type-number` — `exchange_rate` is a JSON NUMBER
     (source establishes OBJECT-or-ARRAY).
  4. `payer-exchange-type-string` — `exchange_rate` is a JSON STRING.
- `benign/` — legitimate representations under the current source (10
  cases): empty top-level array; common `{}` / single-key / multi-key /
  reordered keys; payer `[]` (the OBJECT|ARRAY union regression) / `{}` /
  multi-key / mixed rows; payer empty top-level array.

## Depth classification (Phase 10A)

- L1 = root type only; L2 = + per-item field presence; L3 = + item-level
  JSON type contract (TYPE_MATCH / TYPE_IN_SET at an inspected item path).
- Post-Phase-10A distribution: common-exchange L3, payer-exchange L3,
  account-inventory L2, billing-group-exchange L2 (2/4 at L3+).

## Sentinels

Bodies deliberately plant obvious sentinels (`SENTINEL_MONTH_77AA`,
`SENTINEL_RATE_STRING_77AA`, `SENTINEL_PAYER_ID_77CC`, ...) in raw-value
locations. The Phase 10 sentinel harness sweeps every safe output
(projection serialization, findings, fingerprints, receipts, campaign
checkpoints, dossiers, error messages) and requires zero leaks. Raw key text
never enters contracts (no finite-key invariant is admitted —
`SOURCE_ENUM_FLOW_UNPROVEN`).
