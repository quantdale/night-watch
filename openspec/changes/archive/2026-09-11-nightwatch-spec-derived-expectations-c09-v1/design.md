# Design — C-09

## The classification vocabulary, and why each member exists

§42 requires every scenario to land in exactly one bucket. The members are not
interchangeable, and collapsing any pair would hide something:

| Classification | Means |
|---|---|
| `CHECKABLE` | admitted: an exact operation join and a representable assertion |
| `NON_CHECKABLE` | a real product claim that no oracle can express |
| `AMBIGUOUS` | the claim resolves more than one way |
| `UNSUPPORTED` | the assertion class has no analyzer |
| `NO_OPERATION_BINDING` | a product claim that binds to no known operation |
| `MULTIPLE_BINDINGS` | binds to more than one operation, so the subject is unclear |
| `STALE` | derived once, and its artifact has since changed |
| `OUTSIDE_SCOPE` | not a claim about the product at all |

`OUTSIDE_SCOPE` and `NO_OPERATION_BINDING` are the pair most easily confused,
and the distinction carries the campaign: a scenario that says "an ambiguous
spec grants nothing" is not an unbound product claim, it is not a product claim.
All 332 OpenSpec scenarios are the second kind.

Totality is the R-12 pattern: the classifier maps over the discovered scenario
set, so a scenario cannot be omitted, and a count assertion proves it.

## Expectation classes

Four, each matched to what the existing oracle vocabulary can represent:

| Class | Assertion | Available |
|---|---|---|
| `RESPONSE_PROPERTY_TYPE` | property `p` of the response has declared JSON type `t` | 1,891 |
| `RESPONSE_PROPERTY_ENUM` | property `p` resolves to an enum with value set `V` | 30 definitions |
| `RESPONSE_PROPERTY_SHAPE` | property `p` resolves to an object definition | 534 |
| `RESPONSE_PROPERTY_CARDINALITY` | property `p` is array-typed | 490 |

`REQUIRED_KEY` is deliberately absent: measured 0, because protobuf3 has no
required and these documents are generator output. Reported unavailable with
its cause rather than approximated from `properties` membership — a property
being *present in the schema* is not a claim that it is *present in a
response*, and conflating the two would manufacture an expectation the
document does not make.

## The operation join is exact by construction

This is the part §45 warns about: the temptation is to match expectations to
operations by name or path similarity and reach 40. There is no matching step
here. An expectation is derived from the response `$ref` of one `(path,
method)` entry, so the operation is the one the document itself attached the
schema to. The join cannot be fuzzy because it is not performed — it is read.

Consequences kept honest:

- a response with no `$ref` yields no expectation, not a guessed one;
- a `$ref` that does not resolve to a definition is `AMBIGUOUS`, not skipped;
- a definition reached by two different operations produces one expectation per
  operation, because the subject of the claim is the operation.

## Provenance and currentness

Every admitted expectation carries `{ repoId, sourceSha, artifactPath,
definitionName, propertyPath, operationId, method, extractorVersion, digest }`.

The digest is over the normalized extracted assertion, so reformatting the
document does not invalidate an expectation while a semantic change does. On
mismatch the expectation is `STALE` and is NOT rebound: a rebind would let a
changed specification inherit the standing of the expectation it replaced,
which is the same "evidence is never upgraded in place" rule the rest of the
system holds.

## W-SPEC

`W-SPEC` moves from `UNSUPPORTED / SPEC_EXPECTATION_ANALYZER_ABSENT` to `HELD`
when the operation has at least one admitted expectation, and stays
`UNSUPPORTED` otherwise. Its class remains `DOCUMENTARY`.

Nothing else changes, because nothing else needs to: `READ_ONLY_PROVEN`
requires one DECLARATION and one EFFECT witness, and `DOCUMENTARY` is neither.
The negative test asserts the whole implication chain — W-SPEC HELD alone
yields a state that is not `READ_ONLY_PROVEN`, and a production admission that
is not granted.

## Negative probes

| # | Mutation | Expected |
|---|---|---|
| 1 | admit an expectation from a `summary`/`description` string | DETECTED |
| 2 | admit a `REQUIRED_KEY` expectation | DETECTED |
| 3 | match an expectation to an operation by path similarity | DETECTED |
| 4 | drop a scenario from the classification | DETECTED by totality |
| 5 | classify an OpenSpec scenario `CHECKABLE` | DETECTED |
| 6 | collapse `OUTSIDE_SCOPE` into `NO_OPERATION_BINDING` | DETECTED |
| 7 | let W-SPEC alone reach `READ_ONLY_PROVEN` | DETECTED |
| 8 | let W-SPEC grant production admission | DETECTED |
| 9 | rebind a STALE expectation to a new SHA | DETECTED |
| 10 | admit an expectation with incomplete provenance | DETECTED |
