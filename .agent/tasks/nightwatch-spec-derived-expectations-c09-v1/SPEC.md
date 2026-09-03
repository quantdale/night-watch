# SPEC — C-09 Spec-Derived Expectations

Task ID: nightwatch-spec-derived-expectations-c09-v1
Phase: SPEC_DERIVED_EXPECTATIONS_C09_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: da369dad6c96472820790ffa4b69a773d2d26033
Predecessor Task ID: nightwatch-deployment-fact-binding-c08-v1
Predecessor Status: COMPLETE
Authorization class: NIGHTWATCH_SPEC_DERIVED_EXPECTATIONS_C09_V1

## Frozen intent

Turn PRODUCT specification into mechanically checkable expectations bound to
specific operations with exact provenance, classify every scenario in the
corpus rather than dropping any, and prove that a specification witness alone
never grants a read-only proof.

A spec sentence is not a machine expectation.

## Measured inventory

### The OpenSpec corpus specifies NIGHTWATCH, not the product

`openspec/` contains only `changes/`: 32 change directories, 165 markdown
files, **332 `#### Scenario:` headings** across 37 `spec.md` files and 190
`### Requirement:` headings. There is no `openspec/specs/` and no archive.

The historical `~823` estimate is refuted by measurement; the current corpus
is 332.

More importantly, these scenarios specify Nightwatch's own behaviour —
"Evidence invalidates acceptance", "Auth expires during execution",
"Optimization is accepted", "discovery is admission-free". They describe the
tool, not the Alphaus product, so **none of them can bind to a product
operation**. They are classified `OUTSIDE_SCOPE` with that proof, not dropped.

This is the campaign's first real finding: "spec-derived expectations" cannot
mean "derived from our own OpenSpec", because our OpenSpec is not a product
specification.

### The product specification that DOES exist

The committed generated OpenAPI artifacts, admitted by C-02a and C-05:

| Repository | operations | definitions | operations with a resolved response schema |
|---|---|---|---|
| `alphauslabs/blueapi` | 591 | 1,179 | **591** |
| `alphauslabs/blueinternal` | 51 | 84 | **51** |

Available assertion material, measured across both:

| Material | blueapi | blueinternal | total |
|---|---|---|---|
| typed response properties | 1,756 | 135 | **1,891** |
| enum definitions with a fixed value set | 28 | 2 | **30** |
| nested `$ref` object properties | 523 | 11 | **534** |
| array-typed properties | 470 | 20 | **490** |
| `required` key entries | 0 | 0 | **0** |

The zeros are informative rather than a gap: these are gRPC-gateway generated
documents and protobuf3 has no `required`, so no required-key expectation can
be derived and none will be claimed. Enums exist as separate definitions with
a value set, not as inline property enums.

## Scope

- Classify all 332 OpenSpec scenarios, with `OUTSIDE_SCOPE` proven rather than
  asserted.
- Derive expectations from the product OpenAPI schemas in four classes that
  the existing oracle vocabulary can represent: response property TYPE, ENUM
  value set, nested object SHAPE, and array CARDINALITY.
- Bind every admitted expectation to an EXACT operation with full provenance:
  repository, source SHA, path, definition name, property path, operation id,
  extractor version, evidence digest, currentness.
- Make `W-SPEC` report `HELD` where an expectation exists, and DEMONSTRATE that
  it still cannot produce `READ_ONLY_PROVEN`.

## Non-goals

- No natural-language interpretation. No LLM, no prose parsing, no summary or
  description text becoming an assertion.
- No fuzzy or heuristic operation matching to raise the admitted count.
- No `required`-key expectation, because the artifacts contain none.
- No new oracle invariant kind unless the existing vocabulary provably cannot
  represent an otherwise-admissible expectation.
- No runtime contact of any kind. C-09 evaluates nothing; it admits.

## Absolute invariants

- Every scenario in the corpus receives exactly one classification. No silent
  omission.
- An expectation without mechanically verified derivation evidence is not an
  admitted expectation.
- A `W-SPEC` witness alone NEVER yields `READ_ONLY_PROVEN`, and never grants
  production admission.
- `AMBIGUOUS` and `NO_OPERATION_BINDING` grant nothing.
- A changed artifact makes an expectation `STALE`; it is never silently
  rebound to a new SHA.
- Correctness outranks the count: 28 sound expectations beat 40 unsound ones.

## Acceptance

1. All 332 scenarios classified, with the `OUTSIDE_SCOPE` verdict proven from
   the corpus itself rather than asserted.
2. Every classification vocabulary member is defined and reachable, and no
   scenario is silently dropped — enforced by a totality assertion.
3. At least 40 expectations admitted, each with an EXACT operation join; if
   fewer are sound, fewer are admitted and the blockers are reported.
4. Every admitted expectation carries complete provenance and a currentness
   state.
5. Only assertion classes the existing oracle vocabulary can represent are
   admitted; no prose becomes authority.
6. A changed artifact yields `STALE` rather than a silent rebind.
7. `W-SPEC` reports `HELD` where an expectation exists, and a negative test
   proves W-SPEC alone does not produce `READ_ONLY_PROVEN` and does not grant
   production admission.
8. Zero runtime contact.
9. Canonical regression zero failures; `gate:local` PASS; `gate:clean` PASS;
   exact-head CI PASS; `siblingWrites` 0; session released.

## Declared Deletions

None.
