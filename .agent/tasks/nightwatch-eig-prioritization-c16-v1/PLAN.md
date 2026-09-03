# C-16 Expected Information Gain + Orphaned Ownership Closure

## Purpose

After C-16, two requirements that belonged to no campaign have an owner, and
Nightwatch can put its admissible targets in a defensible order — with every
position explained, nothing granted, and the same inputs always producing the
same list.

## Starting State

Task `nightwatch-eig-prioritization-c16-v1`; starting SHA
`529b02a8d54a951eda1636e144a05a7442238c5b`; predecessor
`nightwatch-spec-derived-expectations-c09-v1` COMPLETE, certified at CI run
`33806627149`.

Established, and not to be rediscovered:

- **G-16 is not about prioritisation.** It is "stale duplicate figures in
  durable docs", fixed by "one derived figure source", asserted as "no document
  contains a census figure absent from the current ledger". Owner: none.
- **EIG** is design §9.2's multiplicative formula with six named factors and an
  explicit non-goal of maximising request volume. Owner: none.
- The independent review's F-28 maps G-01…G-15 to campaigns and records both
  of these as orphaned.
- C-09 just produced the exact material `contract_depth` needs:
  `RESPONSE_PROPERTY_TYPE` (1,475), `RESPONSE_PROPERTY_CARDINALITY` (416),
  `RESPONSE_PROPERTY_SHAPE` (216), `RESPONSE_PROPERTY_ENUM` (7).
- C-04 supplies `blast_radius`: 382 consumer edges, 164 joined to a specific
  backend operation.
- The change-intelligence layer supplies `change_recency` and, per §9.2, this
  is what finally gives that orphaned layer a consumer.

## Scope

Ownership assignment and ledger closure; a bounded deterministic EIG; G-16 as
a doc/ledger figure check; an authority-independence proof.

## Non-Goals

No floating-point score; no wall-clock recency; no admission, execution or
environment authority; no target-selection widening.

## Safety Constraints

EIG orders what safety has already admitted and may never widen it. No runtime
contact. Sibling repositories read-only; `siblingWrites` 0. All implementation
inside the owned session worktree
`session/nightwatch-eig-prioritization-c1-20849857`.

## Architecture / Approach

**Integer levels, exact ordering, no floats.** §56 forbids blindly encoding the
arbitrary multiplicative formula. Each factor becomes a small bounded integer
level with named members, and the score is kept as an exact RATIONAL: a
numerator `novelty × depth × recency × blast` and a denominator
`cost + duplicate_risk`. Ordering compares `a/b` against `c/d` as `a·d` against
`c·b` in integer arithmetic, so there is no rounding, no float drift, and the
ordering is exactly reproducible rather than reproducible-in-practice.

**UNKNOWN is a level, not a number.** Every factor has an explicit `UNKNOWN`
member sitting at a defined position that is neither the minimum nor the
maximum. Zero would silently eliminate a target from consideration; the maximum
would silently promote it. Both are wrong for "we do not know", and the
multiplicative form makes a zero especially destructive.

**Tie-breaking is total.** Equal scores order by a stable key — target id —
so the ranking is a total order and no two runs can disagree.

**G-16** compares census figures appearing in durable documents against the
current ledger. The figure vocabulary is declared, so a document may only state
a census number the ledger actually carries.

## Milestones

- M1 Task record, OpenSpec change, orphan definitions established — COMPLETE
- M2 Ownership assignment and master ledger closure — COMPLETE
- M3 EIG factor model: bounded levels, UNKNOWN handling — COMPLETE
- M4 Exact integer ranking with total tie-breaking — COMPLETE
- M5 Explainability: factor breakdown and reason codes — COMPLETE
- M6 G-16 doc/ledger figure check — COMPLETE
- M7 Authority-independence proof and hardening probes — COMPLETE
- M8 Validation, integration, exact-head CI, closure — COMPLETE

## Validation Strategy

`typecheck`, `hardening:check`, `handoff:check`, `project:check`,
`agent:check`, `workspace:check`, `gate:inventory`, `test:semantic-compat`,
`campaign:synthetic`, the new C-16 suite, the canonical regression,
`gate:local`, `gate:clean`, exact-head GitHub Actions.

## Decision Log

- 2026-09-04 — Assign both orphans to C-16. Reason: §55 and §61 require an
  explicit owner and forbid inventing meanings; both definitions were read from
  the master plan and the independent review rather than reconstructed.
- 2026-09-04 — Score as an exact integer rational, never a float. Reason: §56
  forbids blindly encoding the formula, and a float score makes the ORDERING
  depend on rounding, which would undermine §58's determinism requirement at
  exactly the point it matters.
- 2026-09-04 — `UNKNOWN` sits mid-scale per factor, never 0 and never maximum.
  Reason: under a multiplicative form a zero deletes the target and a maximum
  promotes it, so either would turn an absence of knowledge into a decision.
- 2026-09-04 — Implement G-16 rather than defer it. Reason: §61 says implement
  only if compatible with this offline campaign, and a doc/ledger equality
  check is entirely offline. It is also the live risk this very campaign has
  been creating by writing measured figures into durable docs all night.

## Discoveries

- G-16 and EIG are unrelated requirements that happen to share the property of
  being orphaned. Treating "G-16 and EIG owners" as a single prioritisation
  concern — which the ledger row's phrasing invites — would have left the
  actual documentation-truth requirement unimplemented.
- §9.2's `contract_depth` ordering maps exactly onto C-09's expectation
  classes, so the factor has a real consumer rather than a placeholder.

## Deferred Work

Using EIG to order a live DEV cohort is C-07's work. C-16 produces the order
and grants nothing.

## Completion Criteria

The eleven acceptance rows of `SPEC.md`, each carried in the REPORT requirement
ledger with exact evidence.
