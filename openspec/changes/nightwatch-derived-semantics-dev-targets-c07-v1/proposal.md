# Proposal — C-07 Derived Endpoint Semantics + Generated DEV Targets

## Why

`RIPPLE_ENDPOINT_SEMANTIC_REGISTRY` is `[]`, and its header explains why:
"HTTP method is not a read/write contract. Only source-backed, exact rules may
classify an API endpoint as KNOWN_READ or KNOWN_MUTATION." The registry is
empty because nothing had earned an entry.

Meanwhile the path from "an operation exists" to "a request is authorized" has
never been visible as a funnel. That matters more than the registry: a chain
whose stages are not counted cannot be audited, and cannot be shown to be
empty for a good reason rather than a bad one.

## What changes

The registry is DERIVED from evidence earlier campaigns established, with every
entry naming the evidence that produced it. And the target-generation funnel is
made explicit: considered, generated, eligible, rejected, with a count and a
reason at every stage.

## What the derivation actually yields

Over all 1,851 operations:

| Derived classification | Count | From |
|---|---|---|
| `KNOWN_READ` | **0** | `EFFECT_CLOSURE_PROOF` 0 |
| `MUTATION_CAPABLE` | 1,187 | refutation 1,107 + conditional 80 |
| `UNKNOWN` | 485 | `METHOD_ONLY_NO_EFFECT_PROOF` |
| `AMBIGUOUS` | 179 | `ROUTE_IDENTITY_UNPROVEN` |
| `UNSUPPORTED` | 0 | — |

**Zero `KNOWN_READ` entries**, because zero operations carry an effect proof.
This is not a C-07 result so much as a C-06 one made visible: `READ_ONLY_PROVEN`
fell 5 → 0 when method-only evidence stopped counting, and 6,114 unclassified
callee identities block promotion.

The 485 `UNKNOWN` operations are the temptation. Promoting them would produce a
registry that looks productive while asserting a read contract from an HTTP
verb — and would place 485 operations on a DEV work queue on the strength of
the word "GET". They stay `UNKNOWN`.

## The funnel, and the honest zero

considered 1,851 → generated 1,851 → **eligible 0** → rejected 1,851, with
reasons `MUTATION_CAPABLE` 1,187, `SEMANTICS_UNKNOWN` 485,
`SEMANTICS_AMBIGUOUS` 179 — summing exactly to the rejected count, so nothing
is unattributed.

The historical `≥ 30 generated DEV targets` figure is therefore **not met**, and
the blocker is named rather than engineered around. §66 requires each target to
pass the UNCHANGED admission chain, and that chain admits none of the 1,851.
The independent `portfolio` census agrees: considered 1,851, eligible 0,
excluded 1,851, across nine reason codes.

**No threshold, classification or gate is weakened to change this.** A relaxed
threshold would produce targets, and every one of them would be a request
Nightwatch could not justify.

## DEV execution

Blocked, on an INTERNAL blocker rather than an external prerequisite: §7's
sixth condition — "existing Nightwatch DEV admission accepts the target" —
fails because nothing is admitted. A DEV storage state does exist, and its
contents were never read, so this is not a credential-availability problem.

Product findings: zero, reported as zero. Zero legitimate findings is a
measurement, and fabricating one is the single thing §70 forbids outright.

## What does not change

EIG receives only the eligible set, so an inadmissible target has no path to a
rank. Generation grants no request authority. No production or NEXT contact.
