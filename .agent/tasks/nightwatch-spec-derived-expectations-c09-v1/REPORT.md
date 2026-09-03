# C-09 Spec-Derived Expectations — Report

- Starting SHA: `da369dad6c96472820790ffa4b69a773d2d26033`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `481cb35`
- Certified exact-head checkpoint: `68f479b0035b94793446fbcadd8c8d262c78140e`, run `33806627149`
- Task objective: turn product specification into mechanically checkable
  expectations bound to exact operations with full provenance, classify every
  scenario rather than dropping any, and prove a specification witness alone
  never grants a read-only proof.
- Safety events: NONE
- Remaining blockers: none.
- Recommended next phase/task: C-16 EIG prioritisation (C-06G gate assessed
  first).

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | All 332 scenarios classified, `OUTSIDE_SCOPE` proven not asserted| PASS | 332 discovered, 332 classified, `totalityHolds: true`, all `OUTSIDE_SCOPE` via `NIGHTWATCH_OWN_SPECIFICATION`; the verdict comes from the corpus LOCATION, not from reading a sentence |
| 2 | Every vocabulary member defined and reachable; no silent drop| PASS | the eight-member vocabulary asserted exactly; `OUTSIDE_SCOPE` proven distinct from `NO_OPERATION_BINDING`; totality structural and probed (S4, S5) |
| 3 | ≥40 expectations admitted with EXACT operation joins, or fewer with blockers reported| PASS | **2,114 admitted** across **630** of 642 operations — TYPE 1,475 / CARDINALITY 416 / SHAPE 216 / ENUM 7; joins exact by construction, and probe S6 forbids similarity matching |
| 4 | Complete provenance and currentness on every admitted expectation| PASS | every admitted expectation carries repo, SHA, path, definition, property, operation, method, route, extractor version and digest; `provenanceIsComplete` tested both ways |
| 5 | Only oracle-representable classes admitted; no prose becomes authority| PASS | four classes, each representable by the existing oracle vocabulary; no prose-derived assertion (tested against `summary`/`description`/`title`); no `REQUIRED_KEY` class (probe S2) |
| 6 | A changed artifact yields STALE, never a silent rebind| PASS | STALE on digest, source-SHA or extractor-version change; the digest is over the normalized assertion, so reformatting is not a change |
| 7 | W-SPEC HELD, and proven not to produce READ_ONLY_PROVEN| PASS | W-SPEC HELD where expectations exist; proven to yield neither `READ_ONLY_PROVEN` nor production admission, and a count of 1,000,000 changes nothing a count of 0 does not; probe S1 guards the DOCUMENTARY class |
| 8 | Zero runtime contact| PASS | C-09 admits expectations and evaluates none; both modules data-only; no production, NEXT or DEV request |
| 9 | Regression, local, clean and exact-head CI green; siblingWrites 0; released| PASS | regression 3,519/3,506/13/**0 failed**; `gate:local` PASS; `gate:clean` PASS with `siblingWrites: 0`; exact-head CI PASS at `68f479b`; session released |

## Key measurements

| Measure | Value |
|---|---|
| OpenSpec scenarios | **332** (historical ~823 refuted); all `OUTSIDE_SCOPE` |
| operations examined / resolved schema | 642 / **642** |
| **admitted expectations** | **2,114** |
| operations carrying at least one | **630** |
| truncated | false |
| rejections | 12 `DEFINITION_HAS_NO_PROPERTIES`, 23 `PROPERTY_CARRIES_NO_REPRESENTABLE_ASSERTION` |
| `required` key material | **0** — protobuf3 emits none; reported, never approximated |

## CI skip accounting

| `SYNTHETIC_CAMPAIGN` | total | passed | skipped | failed |
|---|---|---|---|---|
| `70b8225` (post-C-08) | 799 | 762 | 37 | 0 |
| `68f479b` (certified) | 829 | 790 | **39** | 0 |
| delta | +30 | **+28** | **+2** | 0 |

The +2 is exactly the two sibling-gated cases (the real blueapi and
blueinternal artifacts), predicted before the run. 28 of the 30 new cases
execute in CI.

**Scope stated plainly:** CI verifies the deterministic classifier, extractor,
provenance, currentness and witness-boundary properties. The 2,114 figure is
measured against the real artifacts LOCALLY, because CI has no sibling
checkouts — the same scope every real-source count in this repository has.

## Defects

**DEF-C09-1 — my own rule tested an unanchored symbol name.
CAMPAIGN_INTRODUCED, caught by its own probe.** The rule asserted
`/PROSE_FIELDS/` against the whole file, and `XPROSE_FIELDS` contains
`PROSE_FIELDS`, so renaming the symbol left the check passing. Repaired by
anchoring on `export const PROSE_FIELDS =`.

Third instance this night of a check matching text it did not mean — after
C-08's comment-matching rule, and a C-09 TEST that failed on the word
"similarity" appearing inside the comment explaining why similarity matching is
forbidden. Consistent enough to state as a rule: a structural check must read a
DECLARATION, anchored, with comments stripped.

Status: COMPLETE
