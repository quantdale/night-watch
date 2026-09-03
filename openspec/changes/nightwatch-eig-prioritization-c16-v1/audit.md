# Audit — C-16

Read-only at `529b02a8d54a951eda1636e144a05a7442238c5b`.

## Orphan confirmation

`docs/design/PRODUCTION-OBSERVABILITY-INDEPENDENT-REVIEW.md` F-28:

> The gap matrix has 16 rows and the programme has 15 campaigns. Mapping them:
> `G-01→C-01`, `G-02→C-02`, `G-03→C-06`, `G-04→C-07`, `G-05→C-03`,
> `G-06→C-04`, `G-07→C-05`, `G-08→C-08`, `G-09→C-09`, `G-10→"inside
> C-02/C-03"`, `G-11→C-10`, `G-12→C-11…C-14`, `G-13→C-15`, `G-14→C-15`,
> `G-15→C-07`. **`G-16` has no owner.** Separately, EIG prioritization
> (`design.md §9.2`) — which is the fix for the orphaned change-intelligence
> layer (`A.10` item 4) — appears in no campaign's scope.

Also recorded as `MA-15` (SHOULD FIX) and `E-06` (MUST FIX BEFORE
IMPLEMENTATION).

## G-16, verbatim from the master plan gap matrix

> | G-16 | Stale duplicate figures in durable docs | "83 / 175 / 45-80-3"
> reads as current | one derived figure source | `audit.md §A.12` | future
> agents will use wrong numbers | G-14 | make the census the only writer of
> these figures; retire superseded narratives | manual correction (rejected:
> recurs) | none | assert no document contains a census figure absent from the
> current ledger | doc/ledger equality check in the gate | S | — | ✔ | — |

Two details matter. "Manual correction" was considered and **rejected because
it recurs** — so the fix must be mechanical. And the harm is stated as "future
agents will use wrong numbers", which is precisely the risk this overnight
campaign has been creating.

## EIG, verbatim from design §9.2

```
EIG = novelty × contract_depth × change_recency × blast_radius
      ÷ (cost + duplicate_risk)
```

- `novelty` — never observed > observed-but-no-oracle > observed-with-oracle
- `contract_depth` — `TYPE`/`COLLECTION` expectations beat `SHAPE` beat
  protocol-only
- `change_recency` — from the source-snapshot diff (this finally gives the
  orphaned change-intelligence layer a consumer, closing A.10 item 4)
- `blast_radius` — count of frontend consumers and downstream services from
  the system model
- `cost` — budget units
- `duplicate_risk` — prior fingerprints in the same cluster

> Explicitly **not** maximizing request volume: `cost` in the denominator and
> per-route budget caps make a broad shallow sweep score worse than a deep pass
> over new contracts.

## Available inputs, measured

| Factor | Input that exists today |
|---|---|
| `contract_depth` | C-09's admitted expectations: `TYPE` 1,475, `CARDINALITY` 416, `SHAPE` 216, `ENUM` 7 — mapping exactly onto §9.2's ordering |
| `blast_radius` | C-04's 382 consumer edges, 164 joined to a specific backend operation |
| `change_recency` | the change-intelligence layer, which §9.2 names as this factor's source |
| `novelty`, `cost`, `duplicate_risk` | the finding/fingerprint store and the budget architecture |

So no factor is a placeholder.

## Why the formula is not encoded literally

Two independent problems, both fatal to the requirements this campaign has to
meet.

**Floats break determinism where it matters.** §58 requires that the same
inputs yield an identical ranking. A float score makes the ORDER depend on
rounding, so two mathematically equal scores can compare unequal and two
unequal ones can compare equal. Holding the score as a rational and comparing
`a·d` against `c·b` in integers makes the order exact.

**A multiplicative form makes zero a deletion.** §56 requires that UNKNOWN
never become maximal or zero accidentally. Under multiplication a single
zero factor eliminates the target from consideration entirely, and a maximum
promotes it to the top. Neither is what "we do not know" means, so every factor
gets an explicit `UNKNOWN` level strictly between its minimum and maximum, and
no numerator level is permitted to be zero.
