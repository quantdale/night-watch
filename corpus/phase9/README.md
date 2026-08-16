# Phase 9 fixture corpus (synthetic only)

Deterministic synthetic fixtures for the Phase 9 deterministic semantic
oracle depth implementation. **No real customer data, no real product
bodies, no captured DEV/browser evidence** — every value is an obvious
synthetic placeholder.

## Layout

- `source-fixture/contracts/entityCatalog.ts` — tiny synthetic source
  repository representing code contracts for the seeded domain. Consumed by
  `src/oracles/expectations/sourceAdapter.ts` with the SAME static-text
  interface used for any real read-only Alphaus checkout (never executed).
  Five declarative `@nightwatch-contract` blocks define the admitted
  expectations.
- `defects/` — the five required seeded semantic defect classes (raw
  protocol-valid bodies + scenario manifests):
  1. `http200-error-envelope` — 200 + valid JSON carrying an application
     error envelope where a success envelope is contractually required.
  2. `list-detail-identity-mismatch` — list contains `synthetic-entity-a`;
     detail resolves `synthetic-entity-b`.
  3. `stale-state-after-transition` — step2 projection equals step1 under an
     explicit CHANGE transition contract.
  4. `aggregate-total-relation-mismatch` — line items 1+2+3 vs declared
     total 7 (relation `line-items-equal-total`).
  5. `cardinality-relation-mismatch` — 2 rows vs declared count 3 (relation
     `rows-equal-declared-count`).
- `benign/` — benign counterparts for every seeded defect plus the §30
  variations (valid envelope, same identity, expected transition, valid
  aggregate, valid cardinality, empty list where allowed, reordered keys,
  safe array order, optional/null fields, omitted optional fields).

## Contract provenance

Expectations bind to `repoId: corpus/phase9/source-fixture` @ the fixture
SHA used by the tests (`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` — a
synthetic 40-hex value). Staleness is exercised by a differing SHA.

## Sentinels

Raw fixtures deliberately plant obvious sentinels
(`SENTINEL_CUSTOMER_NAME_X7Q`, `SENTINEL_ACCOUNT_884422`,
`SENTINEL_EMAIL_X7Q@example.invalid`, `SENTINEL_AMOUNT_987654321`,
`SENTINEL_ERROR_MESSAGE_X7Q`) in raw-value locations. The sentinel harness
sweeps every safe output (projection serialization, findings, fingerprints,
recorder events, campaign checkpoint, triage artifacts, dossiers, AI-ready
package, error messages) and requires zero leaks.
