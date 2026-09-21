## Why

Semantic projection nodes preserve truncation, but several evaluators collapse incomplete evidence into binary equality or success. `COLLECTION_ITEM_CONTRACT` ignores per-item `NOT_APPLICABLE` results and can return `FULLY_EVALUATED_PASS` when every item lacks the required field. Identity uniqueness, pagination disjointness, set subset, state relations, differential equivalence, and metamorphic equality can also pass over an inspected prefix while unseen items remain.

## What Changes

- Introduce a total comparison result that distinguishes equal, different, and incomplete observations.
- Propagate truncation and missing-item coverage through every invariant, relational, differential, and metamorphic evaluator.
- Make collection-item aggregation account for PASS, VIOLATED, NOT_APPLICABLE, and INVALID_INPUT for every inspected item.
- Forbid decisive PASS/HOLDS/equivalence or definitive violation when the deciding evidence is incomplete, unless a specific monotonic proof rule establishes the result.
- Add adversarial missing-path, prefix-collision, unseen-tail, nested-truncation, and singleton-alignment tests.

## Capabilities

### New Capabilities

- `semantic-partial-observation-soundness`: Defines completeness-aware semantic evaluation and comparison.

### Modified Capabilities

None.

## Impact

- Affects projections, invariant evaluation, semantic runner outcomes, Phase 18 relations, Phase 20 differential/metamorphic/relational coverage, receipts, and focused tests.
- Does not broaden observation or external execution authority.
