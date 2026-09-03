# Design — C-07

## The derivation table, and the one row that matters

| Source evidence | Derived | Basis |
|---|---|---|
| `READ_ONLY_PROVEN` | `KNOWN_READ` | `EFFECT_CLOSURE_PROOF` |
| `PROVEN_MUTATION_CAPABLE` | `MUTATION_CAPABLE` | `EFFECT_CLOSURE_REFUTATION` |
| `CONDITIONAL_MUTATION` | `MUTATION_CAPABLE` | `CONDITIONAL_MUTATION_EVIDENCE` |
| `READ_ONLY_METHOD_ONLY` | **`UNKNOWN`** | `METHOD_ONLY_NO_EFFECT_PROOF` |
| `UNSUPPORTED` | `UNSUPPORTED` | `ANALYZER_UNSUPPORTED` |
| route proof not `PROVEN` | `AMBIGUOUS` | `ROUTE_IDENTITY_UNPROVEN` |
| anything unrecognised | `AMBIGUOUS` | `CONFLICTING_EVIDENCE` |

The fourth row carries 485 operations, and it is where a productive-looking
registry would come from. `READ_ONLY_METHOD_ONLY` means the GET verb and
nothing else, and the module being replaced says in its own header that method
is not a read/write contract. So they are `UNKNOWN`.

Route identity is checked FIRST and taints everything: if we cannot prove which
operation the evidence belongs to, the evidence cannot classify it, however
strong it is on its own terms. That is why 179 operations with an
`UNSUPPORTED` read-only classification surface as `AMBIGUOUS` —
`routeProof` was `AMBIGUOUS` for 177 and `UNSUPPORTED` for 2.

## The funnel refuses to admit

`generateDevTargets` takes `admittedOperationIds` from the EXISTING chain. It
cannot admit; it reads a decision. The check order matters and is deliberate:

```
stale → mutation-capable → ambiguous → unsupported → unknown
      → not-known-read → runtime-binding → existing admission chain
```

The FIRST failing precondition is the reported reason, so the funnel stays
legible instead of attributing every rejection to whichever check happened to
run last. And the existing chain is consulted LAST, so its verdict is never
pre-empted by a local one.

Non-vacuity matters here: the funnel CAN admit — a proven-read, runtime-bound,
chain-admitted operation is eligible, and a test proves it. That is what makes
the real zero a measurement rather than a broken code path.

## EIG sees only the eligible set

§67 lets EIG choose ordering among already-admissible targets and forbids it
overriding safety. `orderableTargets()` returns `funnel.eligible` and nothing
else, so an inadmissible target has no path to a rank — because a ranked list
is something an operator reads as a work queue, and a high score sitting above
an inadmissible entry in one is precisely the confusion to prevent.

## Negative probes

| # | Mutation | Expected |
|---|---|---|
| 1 | derive `KNOWN_READ` from `READ_ONLY_METHOD_ONLY` | DETECTED |
| 2 | derive `KNOWN_READ` from a GET verb | DETECTED |
| 3 | treat `CONDITIONAL_MUTATION` as read-only | DETECTED |
| 4 | skip the route-identity check | DETECTED |
| 5 | let the funnel admit without the existing chain | DETECTED |
| 6 | pass the full population to EIG instead of the eligible set | DETECTED |
| 7 | repopulate the legacy registry by hand | DETECTED |
| 8 | give the module request authority | DETECTED |
