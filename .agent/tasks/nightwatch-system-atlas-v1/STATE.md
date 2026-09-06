# nightwatch-system-atlas-v1 — STATE

Status: COMPLETE, committed on session branch.

Implementation:
- `src/core/systemAtlas/model.ts` — provenance/record constructors,
  COMMUNICATION_EVIDENCE refusal, INFERENCE-link refusal, relabel gate,
  fail-closed JSON validator.
- `src/core/systemAtlas/overlay.ts` — immutable overlay store (dup-conceptId
  refusal, deterministic conceptId order), bounded query (default 5 / hard 8,
  honest `truncated`), kind query, proven-link attachment (known ids only,
  unproven dropped + counted, INFERENCE un-linkable).
- `src/core/systemAtlas/fixtures.ts` — 4 synthetic fixtures (billing-group,
  payer, monthly-invoicing, billing-group-membership): `synthetic.*` ids,
  null repository/sha, file-anchored locators, no SOURCE_FACT, no
  COMMUNICATION_EVIDENCE, INFERENCE links empty.
- `src/core/systemAtlas/index.ts` — barrel.
- `tests/unit/systemAtlas.test.ts` — 17 adversarial tests, all passing.

Validation:
- `npx tsc --noEmit` — clean.
- `npx playwright test tests/unit/systemAtlas.test.ts --project=nightwatch
  --workers=1` — 17 passed.
- `node bin/hardening-check.mjs` — 1 pre-existing error in forbidden
  `docs/CURRENT_STATE.md` (base commit bd9be1b); not touched per lane rules.
