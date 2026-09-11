# Proposal — C-09 Spec-Derived Expectations

## Why

A spec sentence is not a machine expectation. Nightwatch has a large
specification corpus and a large product-specification corpus, and neither has
yet produced a single checkable, provenance-bound expectation about the product.

## The finding that shapes the campaign

`openspec/` contains only `changes/` — 32 change directories, **332
`#### Scenario:` headings** across 37 spec files, 190 requirements. The
historical `~823` estimate is refuted by measurement.

But the count is not the point. Those scenarios specify **Nightwatch's own
behaviour**: "Evidence invalidates acceptance", "Auth expires during
execution", "discovery is admission-free". They are a specification OF THE
TOOL. None of them can bind to a product operation, because none of them makes
a claim about the product.

So "spec-derived expectations" cannot mean "derived from our own OpenSpec".
Reading the corpus that way would have produced 332 confident expectations
about the wrong system. All 332 are classified `OUTSIDE_SCOPE` with that
reasoning, and none is dropped.

## Where product specification actually is

The committed generated OpenAPI artifacts admitted by C-02a and C-05:

| Repository | operations | definitions | with a resolved response schema |
|---|---|---|---|
| `alphauslabs/blueapi` | 591 | 1,179 | 591 |
| `alphauslabs/blueinternal` | 51 | 84 | 51 |

Measured assertion material: **1,891** typed response properties, **30** enum
definitions with a fixed value set, **534** nested `$ref` object properties,
**490** array-typed properties, and **0** `required` key entries.

That last zero is informative rather than missing. These are gRPC-gateway
generated documents and protobuf3 has no `required`, so no required-key
expectation can be derived — and none will be claimed. One of §44's named
classes is reported unavailable with its cause instead of being approximated.

## What changes

Four expectation classes, each chosen because the existing oracle vocabulary
can already represent it: response property TYPE, ENUM value set, nested
object SHAPE, and array CARDINALITY.

The operation join is EXACT by construction rather than by matching: an
expectation is derived from the response `$ref` of a specific `(path, method)`
entry, so the operation is whichever one the document itself attaches the
schema to. There is no fuzzy step available to get wrong, which is the point.

## The W-SPEC boundary is demonstrated, not re-guarded

`W-SPEC` currently reports `UNSUPPORTED /
SPEC_EXPECTATION_ANALYZER_ABSENT`. C-09 makes it `HELD` where an expectation
exists — and the §46 boundary already holds structurally, because
`READ_ONLY_PROVEN` requires one DECLARATION and one EFFECT witness while
W-SPEC is class `DOCUMENTARY`, which is neither. Adding a second guard would
recreate the duplicate-authority problem C-05 spent a campaign removing, so
C-09 adds the negative test that proves the existing structure holds.

## What does not change

No natural-language interpretation: no LLM, no prose parsing, no `summary` or
`description` text becoming an assertion. No fuzzy operation matching to raise
the count. No new oracle invariant kind unless the existing vocabulary
provably cannot represent an otherwise-admissible expectation. And no runtime
contact — C-09 admits expectations and evaluates none.

Correctness outranks the count: 28 sound expectations beat 40 unsound ones, and
if fewer than 40 are sound then fewer are admitted and the blockers are
reported.
