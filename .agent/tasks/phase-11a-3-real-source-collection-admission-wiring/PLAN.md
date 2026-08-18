# PLAN — Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Authorization class: PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY
Continuity protocol: nightwatch.agent-continuity.v2

## Purpose

Close the confirmed gap between the Phase 11 collection evaluator and the real-source expectation admission path. Build an additive deterministic collection-admission bridge, prove it with current production derivation code and synthetic / current-source canaries, preserve every historical positional expectation, and stop before DEV.

## Starting State

- Expected task-package base: 5669146332d357b09a49b29404a603e3fa1e828e.
- Phase 11 collection evaluator exists and is locally validated.
- Phase 11A.1 receipt false-PASS is fixed locally at 51b886a4aeaee24aebfd3ecbc0cfe45f29aff6f3.
- Phase 11A.2 shared acceptance false-PASS is fixed locally at f763f3c42447c0c566f536ce6bdb38f2673ededc.
- Current real-source admission still emits positional `itemIndex: 0` invariants and historical IDs.
- Phase 11 tests construct collection expectations through synthetic fixture helpers.
- GitHub Actions is externally blocked before job start by billing/spending-limit.
- Phase 11B is NOT_AUTHORIZED.

## Scope

Implement only the missing real-source-to-collection expectation admission wiring plus tests, hardening, CI matrix, continuity, and docs. No DEV/NEXT/production. No product mutation. No new product target or route. No Alphaus writes. No DB/data plane. No infrastructure/Phase 6. No campaign/minimization redesign. No differential. No new source semantics. No AI/model execution. No selfDev/promotion/catalog/B adoption. No publication.

## Non-Goals

- No DEV/NEXT/production runtime execution.
- No Phase 11B contained DEV canary (separate owner authorization required).
- No product mutation, route expansion, or endpoint broadening.
- No Alphaus source code writes, annotations, or contract additions.
- No DB, infrastructure, GKE, AWS IAM, or data-plane work.
- No campaign / minimization / differential redesign.
- No AI / model authority or selfDev / promotion / catalog-B adoption.
- No external publication or shared-channel relay.
- No new APPROVED_READ_ONLY_TARGET_IDS or DEV_REACHABLE_RECIPE_TARGET_IDS entries.

## Safety Constraints

- Existing real-source extraction remains the semantic authority (recipe + bounded extractors + evidence digest).
- Historical derivation output, IDs, and semantics remain unchanged.
- Collection scope is explicit, fixed, and target-bound; no numeric-path magic.
- Unsupported positional invariants fail closed; strict validation enforced.
- Current resolver stays target-identity based; no hidden semantic-generation priority.
- No new network / filesystem / child-process / persistence authority in the new module.
- No raw product values enter collection admission.
- Sentinel-leak count is zero across result, findings, evaluations, and receipt.

## Architecture / Approach

Additive collection-admission layer placed in `src/oracles/expectations/collectionAdmission.ts`:

```
real source + Nightwatch fixed recipe
  -> existing deriveRealSourceExpectation() (UNCHANGED)
  -> historical positional expectation (unchanged IDs)
  -> deterministic collection admission transform
  -> distinct ...real-source-collection expectation
```

The transform consumes an already validated historical expectation plus its originating recipe. Root invariants (path `[]`) are preserved exactly once. Item invariants (those whose path begins with `String(recipe.blueprint.itemIndex)`) are converted into explicit `COLLECTION_ITEM_CONTRACT` definitions with `collectionPath: []` and the item-relative path. Supported kinds: `FIELD_PRESENT`, `FIELD_ABSENT`, `TYPE_MATCH`, `TYPE_IN_SET`. The transformed expectation is re-validated through `validateExpectation()`. The closed target→collection-ID table is the ONLY identity authority.

A batch API `deriveCollectionWideRealSourceExpectations(derived)` walks every historical derivation, returns derived + per-recipe failures, and rejects duplicate collection IDs.

The strict expectation validator is extended to admit the `COLLECTION_ITEM_CONTRACT` invariant class so the new collection expectation survives the same schema gate as every other expectation.

## Milestones

- M0 — fetch origin, require clean main, reproduce the gap (positional item-0 only).
- M1 — fixed target→collection ID table, distinct derivation version, fail-closed vocabulary.
- M2 — additive transform module; supported item kinds; strict validation.
- M3 — batch derivation API; preserve historical semantics.
- M4 — resolver / currentness proof; both generations share the same recipe currentness.
- M5 — real-source fixture semantic proof (later-row, partial, replay).
- M6 — four-recipe structural matrix.
- M7 — privacy, determinism, hardening, authority stability.
- M8 — current-source owner-local canary.
- M9 — full local validation (all matrices + owner-provenance + campaign + agent + project + hardening).
- M10 — substantive checkpoint commit/push.
- M11 — clean post-checkpoint acceptance.
- M12 — docs/continuity closure; truthful external-CI terminalization.
- M13 — final exact CI truth.

## Validation Strategy

Decisive proof is not that a collection expectation can be constructed. It is:

```
real-source-style source fixture
  -> existing recipe extraction / derivation
  -> explicit collection admission
  -> current collection expectation
  -> existing resolver / currentness
  -> semantic evaluation
  -> later-row anomaly detected
  -> partial tail remains PARTIAL_COVERAGE
  -> shared acceptance gate rejects partial coverage
```

with the paired historical expectation missing the later-row-only defect, proving the real-source integration gap has actually been closed.

CI matrix: `Phase 11A.3 real-source collection admission matrix` runs the new permanent test in `tests/unit/phase11a3CollectionAdmission.test.ts` against the existing Phase 11 / Phase 11A.1 / Phase 11A.2 matrices. No DEV or live sibling repository contact.

## Decision Log

- D-61 — selected bounded collection-wide semantic evaluation.
- D-62 (Phase 11A.1) — receipt-layer partial-coverage truth.
- D-63 (Phase 11A.2) — shared acceptance-gate partial-coverage truth.
- D-64 (Phase 11A.3) — additive collection-admission bridge with a fixed target→ID table, distinct derivation version, and a fail-closed transform over mechanically derived positional expectations. No DEV.

## Discoveries

- The strict `validateExpectation()` did not list `COLLECTION_ITEM_CONTRACT`; extending the strict validator was required to admit the transformed expectation through the same gate as every other expectation.
- The Phase 11 synthetic fixture helper `createCollectionExpectation()` is not bound to any source-evidence digest; the new bridge reuses the historical digest, so the two expectations are not interchangeable.
- Common-exchange carries root ARRAY + collection FIELD_PRESENT month/exchange_rate + collection TYPE_MATCH exchange_rate OBJECT; payer carries root ARRAY + four field-presence contracts + collection TYPE_IN_SET exchange_rate (ARRAY | OBJECT); v1 recipes carry only collection FIELD_PRESENT contracts (no invented types).

## Deferred Work

- Phase 11B contained DEV collection-wide acceptance, only after Phase 11A.3 + exact CI readiness + separate owner authorization.
- High-confidence real semantic triage remains NEXT_AFTER Phase 11.

## Completion Criteria

All SPEC §22 / §24 / §25 gates pass locally:

1. The collection-admission module exists, is pure, and the strict validator admits `COLLECTION_ITEM_CONTRACT`.
2. The four real recipes each derive a distinct `...real-source-collection` expectation through the new bridge.
3. The historical positional expectations remain bit-meaning-stable.
4. The later-row synthetic test on a real-source-derived collection expectation yields ANOMALY while the paired historical expectation yields PASS — same source, opposite verdicts.
5. The `>128` partial-coverage real-source-derived collection expectation yields PARTIAL_COVERAGE through receipt + Phase 9B acceptance.
6. Zero privacy sentinel leaks across the new evaluation paths.
7. The full local regression is green (1247 unit + 91 owner-provenance + 27 campaign + Phase 9/9A.1/9B/10/10B/11/11A.1/11A.3 + hardening + project).
8. The owner-local current-source canary derives all four collection expectations at the current remote `mobingilabs/ripple-api` SHA.
9. GitHub Actions is re-checked after the substantive push; the truthful state is recorded.
10. Phase 11B remains NOT_AUTHORIZED; readiness is terminalized as `NOT_READY_EXTERNAL_CI` while Actions remains blocked, otherwise as `READY_FOR_SEPARATE_AUTHORIZATION` only if exact CI is green.
