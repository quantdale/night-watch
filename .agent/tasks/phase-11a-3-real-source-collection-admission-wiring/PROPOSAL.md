# PROPOSAL — Nightwatch Phase 11A.3 — Real-Source Collection Admission Wiring

Task ID: phase-11a-3-real-source-collection-admission-wiring
Phase: 11A.3-REAL-SOURCE-COLLECTION-ADMISSION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Continuity: `nightwatch.agent-continuity.v2`

## Why this task exists

Independent verification after Phase 11A.2 found a load-bearing integration gap.

Phase 11A implemented the `COLLECTION_ITEM_CONTRACT` evaluator, bounded coverage states, safe aggregation, receipt truth, and acceptance-gate truth. However, the current real-source admission path still produces only the historical positional expectations:

- `deriveRealSourceExpectation()` emits `FIELD_PRESENT`, `TYPE_MATCH`, and `TYPE_IN_SET` invariants at `[String(recipe.blueprint.itemIndex), ...]`;
- the fixed registry still uses `itemIndex: 0` and historical expectation IDs such as `...real-source-deep` / `...real-source-shape`;
- the resolver accepts whichever single expectation per target it is given, but no current production path derives a `...real-source-collection` expectation;
- the permanent Phase 11 tests exercise collection-wide behavior through synthetic fixture helpers, not through the real-source admission bridge.

Therefore the collection-wide evaluator is implemented, but current real-source derivation does not opt into it. A Phase 11B DEV run would otherwise resolve the same historical item-0 expectation and would not validate the Phase 11 architecture.

Classification:

`CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`

## Objective

Create the missing Nightwatch-owned, deterministic, fail-closed bridge from an already mechanically admitted real-source recipe/expectation to a distinct collection-wide expectation for the same approved target, without changing Alphaus source semantics or historical expectation meaning.

The bridge must:

1. reuse the existing source extraction/evidence proof;
2. preserve the historical positional derivation API and historical IDs unchanged;
3. create a distinct collection expectation identity per target;
4. transform only supported item-index invariants into explicit `COLLECTION_ITEM_CONTRACT` definitions;
5. retain root invariants exactly once;
6. bind the new expectation to the same repo/SHA/source evidence with a distinct collection-derivation identity;
7. remain compatible with the existing atomic resolver/currentness mechanism;
8. prove later-row detection using a **real-source-derived collection expectation**, not a synthetic helper-created expectation;
9. keep all product/network authority unchanged.

## Fixed architectural direction

Prefer an additive collection-admission layer rather than changing the historical recipe registry or silently changing `deriveRealSourceExpectation()` semantics.

Conceptually:

```text
real source + fixed recipe
  -> existing deriveRealSourceExpectation()
  -> historical positional expectation (unchanged)
  -> deterministic collection admission transform
  -> distinct ...real-source-collection expectation
```

A repository-native implementation may place this in `src/oracles/expectations/collectionAdmission.ts` or an equivalent narrow module.

Do not modify Alphaus source, add source annotations, guess business semantics, globally reinterpret numeric paths, or silently replace historical expectation IDs.

## Success condition

At least the current common-exchange real-source recipe must deterministically derive a collection-wide expectation that:

- has the expected distinct collection identity;
- carries the same mechanical source-evidence digest and current source snapshot;
- resolves atomically through the existing resolver;
- evaluates a conforming multi-row synthetic response as full PASS when completely inspected;
- detects a planted later-row violation that the historical item-0 expectation misses;
- yields `PARTIAL_COVERAGE` for an uninspected tail and is rejected by the shared acceptance gate;
- is mapped to an already approved `KNOWN_READ` target without any new route/network authority.

All four current real-source recipes should be collection-admitted if the transform is mechanically valid for their existing invariant shapes. Any unsupported shape must fail closed rather than be guessed.

Phase 11B remains NOT_AUTHORIZED and must not run in this task.
