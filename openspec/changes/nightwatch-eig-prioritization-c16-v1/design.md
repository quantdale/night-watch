# Design — C-16

## Keeping the shape, refusing the arithmetic

design §9.2's formula is a good statement of intent and a bad specification of
computation. Encoded literally it fails two requirements at once, so this
module keeps the factor structure and replaces the arithmetic.

### Integer levels, exact rational score

Each factor is a small bounded integer level with named members. The score is
held as a numerator and a denominator and is NEVER divided:

```
numerator   = novelty × contract_depth × change_recency × blast_radius
denominator = cost + duplicate_risk
```

Ordering compares `a/b` against `c/d` as `a·d` against `c·b`. Integers, no
rounding, exactly reproducible — rather than reproducible in practice, which is
the most a float comparison can offer.

### UNKNOWN is a level, strictly mid-scale

| Factor | min | UNKNOWN | max |
|---|---|---|---|
| `novelty` | 1 `OBSERVED_WITH_ORACLE` | 2 | 4 `NEVER_OBSERVED` |
| `contract_depth` | 1 `PROTOCOL_ONLY` | 2 | 4 `TYPE_OR_COLLECTION` |
| `change_recency` | 1 `PROVEN_UNCHANGED` | 2 | 4 `CHANGED_IN_CURRENT_DIFF` |
| `blast_radius` | 1 `NO_KNOWN_CONSUMER` | 2 | 4 `MANY_CONSUMERS` |
| `cost` | 1 `LOW` | 3 | 4 `HIGH` |
| `duplicate_risk` | 0 `NO_PRIOR_FINDING` | 2 | 5 `MANY_PRIOR_CLUSTERS` |

`cost` and `duplicate_risk` are denominator terms, so their scales run the
other way — a higher level demotes. `duplicate_risk` may be 0 because it is
additive with `cost`, which is at least 1, so the denominator is never zero.
No numerator level may be zero at all, and the hardening rule enforces it.

### Tie-breaking is total

Equal scores order by `targetId`. Without it, two equal-scoring targets could
swap between runs and the "identical ranking" requirement would be false in
exactly the case nobody checks.

## G-16

An explicit tag, not free-text scanning:

```
<!--census:SOURCE_OPERATIONS=1851-->
```

Guessing which numbers in a document are census figures produces false
positives (receipt digests, run ids, SHAs, historical counts) and false
negatives, and neither is acceptable in a truth check. A document that wants a
checked figure says so. This is the same refusal C-08 made about inferring a
deployment fact from a hostname.

`HISTORICAL_MARKER` is ONE explicit tag. A first draft exempted any line
containing `historical`, `refuted`, `superseded`, `previously`, `no longer` or
`was ` — and `was ` alone would have exempted a large fraction of English
prose, including lines carrying live figures. An exemption that fires by
accident is worse than no exemption, because the check then passes while
proving nothing.

## Negative probes

| # | Mutation | Expected |
|---|---|---|
| E1 | set a factor's UNKNOWN to the minimum | DETECTED |
| E2 | add a zero level to a numerator factor | DETECTED |
| E3 | weaken `grantsAuthority` from a literal | DETECTED |
| E4 | order by dividing instead of cross-multiplying | DETECTED |
| E5 | remove tie-breaking | DETECTED |
| E6 | consume wall-clock time | DETECTED |
| E7 | import EIG into a request-authority surface | DETECTED |
| E8 | replace the single historical marker with a word list | DETECTED |
