# Active Task

Task ID: nightwatch-spec-derived-expectations-c09-v1
Phase: SPEC_DERIVED_EXPECTATIONS_C09_V1
Title: C-09 Spec-Derived Expectations
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-spec-derived-expectations-c09-v1
Starting SHA: da369dad6c96472820790ffa4b69a773d2d26033
Last validated implementation SHA: da369dad6c96472820790ffa4b69a773d2d26033
Last checkpoint: inventory measured read-only at da369da — 332 OpenSpec scenarios, refuting the historical ~823 estimate, and all of them specify NIGHTWATCH rather than the product so none can bind to a product operation; the product specification is the generated OpenAPI with 642 operations, 1,891 typed properties, 30 enum definitions, 534 nested refs, 490 arrays and 0 required-key entries
Current milestone: M2 — scenario classification with totality
Next action: write src/core/source/specScenarioInventory.ts so every discovered scenario receives exactly one classification and a count assertion proves none was dropped, with the OUTSIDE_SCOPE verdict PROVEN from the corpus itself rather than asserted in a comment
Authorization class: NIGHTWATCH_SPEC_DERIVED_EXPECTATIONS_C09_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LAST_VALIDATED_IMPLEMENTATION_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LAST_SUBSTANTIVE_CHECKPOINT_SHA: da369dad6c96472820790ffa4b69a773d2d26033
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_SPEC_DERIVED_EXPECTATIONS_C09_V1_STATUS: IN_PROGRESS

## Routing and safety

C-09 turns PRODUCT specification into mechanically checkable expectations bound
to exact operations with full provenance. A spec sentence is not a machine
expectation.

The finding that shapes the campaign: `openspec/` holds only `changes/`, with
332 scenario headings across 37 spec files — refuting the historical ~823
estimate — and every one of those scenarios specifies NIGHTWATCH's own
behaviour ("Evidence invalidates acceptance", "Auth expires during
execution"). They are a specification OF THE TOOL, so none can bind to a
product operation. Reading the corpus as product specification would have
produced 332 confident expectations about the wrong system. All 332 are
classified OUTSIDE_SCOPE with that reasoning, and none is dropped.

The product specification that does exist is the committed generated OpenAPI
admitted by C-02a and C-05: 642 operations, all with a resolved response
schema, offering 1,891 typed properties, 30 enum definitions with fixed value
sets, 534 nested object references and 490 array properties. There are ZERO
required-key entries, because protobuf3 has no required and these are
gRPC-gateway generated documents; that class is reported unavailable with its
cause rather than approximated.

Four expectation classes are admitted, each chosen because the existing oracle
vocabulary can already represent it: response property TYPE, ENUM value set,
nested object SHAPE and array CARDINALITY. The operation join is EXACT BY
CONSTRUCTION rather than by matching — an expectation is derived from the
response reference of one path-and-method entry, so the operation is whichever
one the document itself attached the schema to, and there is no fuzzy step
available to get wrong.

No natural-language interpretation: no LLM, no prose parsing, no summary or
description text becoming an assertion. No fuzzy operation matching to raise
the count. Correctness outranks the count — 28 sound expectations beat 40
unsound ones, and if fewer are sound then fewer are admitted and the blockers
are reported.

W-SPEC moves from UNSUPPORTED to HELD where an expectation exists, and the §46
boundary is DEMONSTRATED rather than re-guarded: READ_ONLY_PROVEN already
requires one DECLARATION and one EFFECT witness while W-SPEC is DOCUMENTARY,
which is neither, so a second guard would duplicate authority. A negative test
proves W-SPEC alone yields neither READ_ONLY_PROVEN nor production admission.

Zero runtime contact: C-09 admits expectations and evaluates none. No
production, NEXT or DEV request. C-12 remains NOT AUTHORIZED and is not begun.

All work happens in the owned session worktree
`session/nightwatch-spec-derived-expectat-4dff694d`; the canonical checkout is
never used for implementation.
