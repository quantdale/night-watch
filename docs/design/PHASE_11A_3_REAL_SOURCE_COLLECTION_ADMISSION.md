# Phase 11A.3 — Real-Source Collection Admission Wiring

Status: AUTHORIZED_CORRECTIVE_CONTINUATION
Authorization class: `PHASE_11_COLLECTION_WIDE_SEMANTIC_IMPLEMENTATION_ONLY`
Task: `.agent/tasks/phase-11a-3-real-source-collection-admission-wiring/`
Parent design: `docs/design/PHASE_11_COLLECTION_WIDE_SEMANTICS.md`
Parent decisions: D-61 plus Phase 11A.1/11A.2 correctness closeouts

## Problem

Phase 11 implemented a bounded collection evaluator, but the current production real-source admission bridge still derives only the historical positional item-0 expectations from the fixed recipes.

Current source chain:

```text
REAL_SOURCE_EXPECTATION_RECIPES
  -> deriveRealSourceExpectation()
  -> FIELD_PRESENT / TYPE_MATCH / TYPE_IN_SET at ["0", ...]
  -> historical expectation IDs
```

Phase 11 tests prove collection semantics using synthetic helper-created `...real-source-collection` expectations. No current source path mechanically derives those collection expectations from real-source recipes.

Therefore a future runtime resolver would still receive the historical positional generation unless a caller manually manufactures a collection expectation. That would violate the Phase 11 source-authority model and make a Phase 11B DEV canary incapable of proving real-source collection-wide admission.

Classification:

`CONFIRMED_REAL_SOURCE_COLLECTION_EXPECTATION_ADMISSION_GAP`

## Architectural rule

Do not alter historical expectation meaning.

The correct architecture is additive:

```text
real source
  -> existing fixed recipe extraction
  -> existing historical positional expectation
  -> deterministic Nightwatch collection-admission transform
  -> distinct current collection expectation
```

The historical expectation remains valid evidence for Phase 9B/10B history. The collection expectation is a new evaluation representation of the SAME source-established item contract over every safely projected item.

## Collection identity

Current collection identities are fixed by target:

- `ripple.common-exchange.read.real-source-collection`
- `ripple.payer-exchange.read.real-source-collection`
- `ripple.account-inventory.read.real-source-collection`
- `ripple.billing-group-exchange.read.real-source-collection`

No runtime free-form suffix selection.

## Provenance

The collection expectation must preserve:

- repo ID;
- exact source SHA;
- relative source path;
- symbol when present;
- source evidence digest.

Use a distinct derivation identity such as:

`nightwatch.real-source-collection-expectation-derivation.v1`

The evidence digest may remain the same because the Alphaus source proof is unchanged. The derivation version records the Nightwatch representation transform.

## Transform semantics

For an already validated historical expectation and its originating recipe:

- root invariants remain unchanged exactly once;
- an item invariant may be transformed only when its path starts with exactly `String(recipe.blueprint.itemIndex)`;
- remove that fixed index and use the remaining segments as `itemRelativePath`;
- emit explicit `COLLECTION_ITEM_CONTRACT` with `collectionPath: []`;
- preserve the exact invariant semantic parameter.

Supported:

- FIELD_PRESENT
- FIELD_ABSENT
- TYPE_MATCH
- TYPE_IN_SET

Unsupported item-position semantics fail closed.

## Resolver model

Do not teach the resolver to guess between historical and collection generations.

The resolver remains deterministic over one explicit supplied expectation set:

- historical caller supplies historical expectations;
- Phase 11 current/future caller supplies collection expectations.

Both share the same recipe currentness and source-evidence re-extraction.

## Common-exchange contract

The collection representation must mechanically contain:

1. root `TYPE_MATCH [] ARRAY` once;
2. collection FIELD_PRESENT `month`;
3. collection FIELD_PRESENT `exchange_rate`;
4. collection TYPE_MATCH `exchange_rate` OBJECT.

No `["0", ...]` item invariant remains in the collection representation.

## Payer contract

Preserve the v2 source-established polymorphism exactly:

`exchange_rate in {ARRAY, OBJECT}`

as a collection TYPE_IN_SET contract across every inspected row.

## v1 contracts

Account inventory and billing-group exchange gain collection breadth only for source-proven required fields. They remain L2 shape contracts. Do not infer type semantics.

## Acceptance proof

A load-bearing Phase 11A.3 test cannot create the collection expectation directly through the Phase 11 synthetic fixture helper.

It must exercise:

```text
source fixture
  -> existing recipe extraction/admission
  -> collection-admission transform
  -> resolver
  -> semantic evaluation
```

Then compare the same later-row mutant:

- historical positional expectation: misses later-row-only defect;
- collection expectation: detects it.

This proves real-source admission, not merely evaluator capability.

## Partial coverage

Using a real-source-derived collection expectation:

```text
>128 rows, all inspected rows valid
  -> PARTIAL_COVERAGE_NO_VIOLATION
  -> semantic PARTIAL_COVERAGE
  -> receipt PARTIAL_COVERAGE
  -> shared acceptance FAIL
```

Phase 11A.1 and 11A.2 correctness fixes are therefore mandatory predecessors.

## Current-source canary

After fixture/local tests, derive against a fresh disposable read-only snapshot of the current `mobingilabs/ripple-api` remote.

No DEV product call occurs.

Report only safe structural metadata: source SHA, IDs, counts, invariant kinds, evidence digests, resolver state.

## Phase 11B readiness

Phase 11B is not ready merely because the evaluator exists.

Readiness requires:

- a current source-derived common-exchange collection expectation;
- atomic resolver `RESOLVED` at current source;
- existing KNOWN_READ/DEV-reachable target binding;
- later-row real-source-derived synthetic proof;
- partial-coverage non-pass truth;
- zero privacy leaks;
- complete regression;
- exact green CI.

Until exact CI can run successfully:

`PHASE_11B_DEV_READINESS: NOT_READY_EXTERNAL_CI`

Phase 11B remains `NOT_AUTHORIZED` in all Phase 11A.3 states.

## Boundaries

No DEV/NEXT/production. No new endpoints/routes/targets. No Alphaus writes. No DB/infra/Phase 6. No AI/model authority. No campaign/minimization redesign. No differential. No selfDev/promotion/catalog mutation. No publication.
