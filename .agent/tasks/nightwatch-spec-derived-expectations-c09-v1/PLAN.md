# C-09 Spec-Derived Expectations

## Purpose

After C-09, Nightwatch holds a set of expectations about the PRODUCT that are
derived from committed product specification, bound to exact operations, and
carrying provenance strong enough to go stale — and it can say, for every
scenario in its own corpus, why that scenario is or is not one of them.

## Starting State

Task `nightwatch-spec-derived-expectations-c09-v1`; starting SHA
`da369dad6c96472820790ffa4b69a773d2d26033`; predecessor
`nightwatch-deployment-fact-binding-c08-v1` COMPLETE, certified at CI run
`33801673312`.

Established by measurement:

- `openspec/` holds only `changes/`: 332 `#### Scenario:` headings, 190
  requirements, 37 spec files. The historical ~823 estimate is refuted.
- Those scenarios specify NIGHTWATCH, not the product, so none can bind to a
  product operation. `OUTSIDE_SCOPE`, proven.
- The product specification is the generated OpenAPI: 642 operations
  (591 blueapi + 51 blueinternal), all with a resolved response schema.
- Material: 1,891 typed properties, 30 enum definitions, 534 nested `$ref`
  properties, 490 array properties, **0 `required` entries** (protobuf3 has no
  required, so none will be claimed).
- The read-only witness lattice ALREADY makes the §46 boundary structural:
  `READ_ONLY_PROVEN` needs one DECLARATION and one EFFECT witness, and W-SPEC
  is class `DOCUMENTARY`, which is neither. C-09 demonstrates the boundary
  rather than adding a guard for it.
- `W-SPEC` currently reports `UNSUPPORTED` with
  `SPEC_EXPECTATION_ANALYZER_ABSENT`.

## Scope

Scenario classification totality; a bounded OpenAPI expectation extractor in
four representable classes; provenance and currentness; W-SPEC becoming HELD
with its boundary demonstrated.

## Non-Goals

No natural-language interpretation; no fuzzy operation matching; no
required-key expectation; no new oracle invariant kind unless provably
necessary; no runtime contact.

## Safety Constraints

C-09 admits expectations; it evaluates nothing and issues no request. Sibling
repositories stay read-only; `siblingWrites` 0. All implementation inside the
owned session worktree `session/nightwatch-spec-derived-expectat-4dff694d`.

## Architecture / Approach

Two new pure modules.

`src/core/source/specScenarioInventory.ts` classifies the corpus. The
classification vocabulary is the one §42 names, and the totality rule is the
R-12 pattern: the classifier maps over the discovered scenario set so a
scenario cannot be omitted, and a count assertion proves it.

`src/core/source/specExpectations.ts` derives expectations from an
already-parsed OpenAPI document. Four classes, chosen because the existing
oracle vocabulary can represent each:

| Class | Assertion | Source material |
|---|---|---|
| `RESPONSE_PROPERTY_TYPE` | a named response property has a declared JSON type | 1,891 typed properties |
| `RESPONSE_PROPERTY_ENUM` | a property's `$ref` resolves to an enum definition with a fixed value set | 30 enum definitions |
| `RESPONSE_PROPERTY_SHAPE` | a property's `$ref` resolves to an object definition | 534 nested refs |
| `RESPONSE_PROPERTY_CARDINALITY` | a property is array-typed | 490 arrays |

The operation join is EXACT by construction: an expectation is derived from the
response `$ref` of a specific `(path, method)` entry, so the operation is the
one the document itself attaches the schema to. There is no matching step to
get wrong.

## Milestones

- M1 Task record, OpenSpec change, measured inventory — COMPLETE
- M2 Scenario classification with totality — NOT_STARTED
- M3 Expectation extractor, four classes, bounded — NOT_STARTED
- M4 Provenance, currentness and STALE — NOT_STARTED
- M5 W-SPEC becomes HELD; boundary demonstrated — NOT_STARTED
- M6 Hardening rule and negative probes — NOT_STARTED
- M7 Validation, integration, exact-head CI, closure — NOT_STARTED

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `workspace:check`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, the C-06 suite (which asserts the W-SPEC boundary), the
new C-09 suite, the canonical regression, `gate:local`, `gate:clean`,
exact-head GitHub Actions.

## Decision Log

- 2026-09-04 — Classify all 332 OpenSpec scenarios `OUTSIDE_SCOPE`. Reason:
  they specify Nightwatch's own behaviour, so they cannot bind to a product
  operation; treating them as product expectations would be the campaign's
  central error. Consequence: the admitted set comes entirely from the product
  OpenAPI, and the corpus classification is a totality exercise rather than a
  source of expectations.
- 2026-09-04 — Claim no `required`-key expectations. Reason: measured 0 across
  both artifacts, because protobuf3 has no required and these are
  gRPC-gateway generated. Consequence: one of §44's named classes is reported
  unavailable with its cause rather than approximated.
- 2026-09-04 — Demonstrate the §46 W-SPEC boundary rather than add a guard.
  Reason: `READ_ONLY_PROVEN` already requires a DECLARATION and an EFFECT
  witness while W-SPEC is `DOCUMENTARY`, so the boundary is structural; adding
  a second guard would create the duplicate-authority problem C-05 removed.

## Discoveries

- "Spec-derived expectations" cannot mean "derived from our own OpenSpec".
  The corpus is a specification OF NIGHTWATCH, and reading it as product
  specification would have produced 332 expectations about the wrong system.
- The `required`-key class is unavailable for a principled reason rather than
  by omission, which is worth recording because a future campaign might
  otherwise look for it again.

## Deferred Work

Evaluating these expectations against a running environment is C-07's DEV work
and beyond; C-09 admits and does not evaluate.

## Completion Criteria

The nine acceptance rows of `SPEC.md`, each carried in the REPORT requirement
ledger with exact evidence.
