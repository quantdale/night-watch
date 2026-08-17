# Phase 11 fixture corpus (synthetic only)

Deterministic synthetic fixtures for the Phase 11 bounded collection-wide
semantic evaluation implementation. **No real customer data, no real product
bodies, no captured DEV/browser evidence** — every value is an obvious
synthetic placeholder.

## Layout

- `response-fixtures.ts` — helper functions to generate synthetic response
  bodies and shared sentinel constants for testing.
- `source-fixture/phase11Fixtures.ts` — validated fixture definitions for
  collection-wide expectations (COLLECTION_ITEM_CONTRACT invariant kinds).
- `defects/` — seven seeded defect classes (raw protocol-valid bodies):
  1. `common-exchange-wrong-type-row-1/` — item 0 valid, item 1 has wrong
     TYPE_MATCH for `month` field (number instead of string).
  2. `common-exchange-wrong-type-row-57/` — item 0 valid, item 57 has wrong
     TYPE_MATCH for `month` field.
  3. `common-exchange-missing-field-row-57/` — item 0 valid, item 57 missing
     required `month` field (FIELD_PRESENT violated).
  4. `payer-type-outside-set-row-1/` — item 0 valid, item 1 has type outside
     TYPE_IN_SET (number instead of OBJECT/ARRAY) for `exchange_rate`.
  5. `violation-at-row-127/` — 128 items, item 127 has wrong type.
  6. `violation-inside-128-window/` — >128 items, item 57 has wrong type.
  7. `partial-coverage-valid-129/` — 129+ items, all first 128 items valid,
     planted defect at row 128 (unobservable within the projection window).
- `benign/` — legitimate representations (7 cases): empty array, single row,
  multiple valid, exactly 128 valid, more than 128 valid (partial coverage),
  valid object/array type mix, reordered keys.

## Depth classification (Phase 11)

- L1 = root type only; L2 = + per-item field presence; L3 = + item-level
  JSON type contract (TYPE_MATCH / TYPE_IN_SET at an inspected item path);
  L4 = + collection-wide bounded evaluation (COLLECTION_ITEM_CONTRACT over
  every item in a bounded window).
- Phase 11 extends L3 contracts to L4 by evaluating item invariants across
  all inspected items (up to `maxArrayItemsInspected`), surfacing coverage
  metadata (FULLY_EVALUATED_PASS, VIOLATION, EMPTY_NOT_APPLICABLE,
  PARTIAL_COVERAGE_NO_VIOLATION, PROJECTION_LIMIT_EXCEEDED).

## Sentinels

Bodies deliberately plant obvious sentinels (`SENTINEL_PHASE11_MONTH_AA`,
`SENTINEL_PHASE11_RATE_BB`, `SENTINEL_PHASE11_NAME_CC`,
`SENTINEL_PHASE11_ID_DD`, `SENTINEL_PHASE11_NUM_EE`) in raw-value locations.
The Phase 11 sentinel harness sweeps every safe output (projection
serialization, findings, fingerprints, receipts, campaign checkpoints,
dossiers, error messages) and requires zero leaks. Raw key text never enters
contracts (no finite-key invariant is admitted —
`SOURCE_ENUM_FLOW_UNPROVEN`).

## Coverage state matrix

| Condition | Coverage State | Verdict |
|-----------|---------------|---------|
| Empty array / missing collection | EMPTY_NOT_APPLICABLE | NOT_APPLICABLE |
| All items valid, not truncated | FULLY_EVALUATED_PASS | PASS |
| At least one item violates | VIOLATION | VIOLATED |
| All valid but truncated (partial) | PARTIAL_COVERAGE_NO_VIOLATION | PASS |
| Projection fails | PROJECTION_LIMIT_EXCEEDED | NOT_APPLICABLE |
