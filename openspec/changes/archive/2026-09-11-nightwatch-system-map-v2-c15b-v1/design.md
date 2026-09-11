# Design — C-15b

## Contract v2

Every node and edge carries exactly one `factCategory`:

`SOURCE_FACT` · `DEPLOYMENT_FACT` · `RUNTIME_FACT` · `OBSERVATION` ·
`INFERENCE`

and an `evidenceStatus` drawn from the design vocabulary
(`MECHANICALLY_PROVEN`, `SOURCE_ONLY`, `PARTIAL`, `INFERRED`, `STALE`,
`UNAVAILABLE`, `MUTATION_CAPABLE`, `READ_ONLY_PROVEN`, `FINDING_PRESENT`,
`TRUNCATED`, and the runtime/production ones that stay unused until C-12).

The bare `truncated` flag is replaced by a bound block on every projection:

```
limit · total · projected · dropped · truncated · remainingUnknown
```

`total` and `dropped` are null only when genuinely unknowable, and
`remainingUnknown` says which case it is. `truncated: true` with
`dropped: null` is a different statement from `dropped: 412`, and an operator
needs both.

## Progressive disclosure

| Level | Focus | Children |
|---|---|---|
| L1 | company | products |
| L2 | product | repositories and services |
| L3 | service | routes and RPCs, grouped |
| L4 | operation | handler, contracts, downstream, frontend consumers, findings |

Each level is a separate bounded server-side projection. The browser asks for
a level and gets that level; it never receives the whole company graph to hide
client-side.

## Layout identity

Layout is deterministic and content-addressed. The identity binds:

- the canonical graph digest,
- the layout engine identity and version,
- the layout options,
- the projection version.

Changing any one changes the digest. Timing never enters it. The layout is a
pure function of the projection, computed server-side, so two operators looking
at the same snapshot see the same picture.

No new layout dependency is added unless the deterministic layered layout
proves impossible without one; a layered assignment over a directed acyclic
projection is a modest amount of code and stays inside the existing toolchain.

## The eight queries

Each is a named bounded projection with its own test, not a filter over one
generic result:

1. why is this unproven — ordered blocking-stage chain with reason codes
2. path from UI control to backend handler — consumes C-04 edges
3. every surface touching this service — consumes C-03 bindings
4. observed production paths — legitimately empty until C-12
5. mutation-capable routes
6. untested read-only routes — derived from the ledger, never a literal
7. coverage gaps
8. findings attached to topology

## Empty is not unknown

Query 4 returns zero rows. The contract distinguishes `measured: 0` from
`UNMEASURED`, and the view renders the difference. Nothing about an empty
result may imply that C-12 ran.
