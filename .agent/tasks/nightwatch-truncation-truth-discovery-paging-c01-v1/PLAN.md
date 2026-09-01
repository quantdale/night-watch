# Plan

## Purpose

Make every population Nightwatch reports state, mechanically, whether it is
the whole population. Remove the silent operation-projection cap, keep
repository enumeration completeness disjoint from content-read budget
exhaustion, and surface both through the census, CLI, and Control Center
without changing runtime admission authority.

## Starting State

Measured read-only at `68e64a143d40aea051df186e050b3c0fa33d6ae5`:

- `src/core/source/surfaces.ts` capped operation projection at a private
  `MAX_DISCOVERED_OPERATIONS = 128` and dropped the remainder with a bare
  `continue`, incrementing a counter that no projection surfaced.
- `SourceScanCounters.budgetRejections` charged an aborted enumeration walk and
  an unread file body to one number, so a fully enumerated snapshot with
  unread bodies and a half-walked repository were indistinguishable.
- `buildPhase24CandidatePortfolio` capped candidates at 128 and
  `MAX_READONLY_CANDIDATE_HANDLER_FILES` at 128; both silently coincided with
  the discovery cap, so neither had ever been observed to overflow.
- Durable docs recorded 83 and then 43 response contracts for one snapshot,
  never reconciled, both measured over the capped population.

## Scope

- Repository/file enumeration completeness.
- Content-read / byte-budget completeness.
- Operation and result projection limits.
- Explicit COMPLETE | TRUNCATED | UNKNOWN semantics with truthful
  limit / examined / total-where-knowable / dropped.
- The seven R2 coverage states.
- Census, CLI, and Control Center (C-15a) surfacing.
- The 43-vs-83 response-contract metric resolution.

## Non-Goals

- C-02a OpenAPI admission.
- Protobuf.
- C-06 read-only proof.
- DEV / NEXT / production contact.
- Auth.
- Sibling repository modification.

## Safety Constraints

- Preserve every pre-C-01 operation identity; an earlier-sorting repository
  must not silently remove an existing identity.
- Coverage may deny authority and may never grant runtime authority.
- No new filesystem, network, process, persistence, or admission authority.
- All changes scoped to the owned C-01 session worktree; the canonical
  checkout is never used for implementation.

## Architecture / Approach

- One shared vocabulary module (`src/core/source/completeness.ts`) owns the
  three completeness states, the conservative combination order, the
  "we saw everything" predicate, and the seven R2 coverage states with an
  authority effect union that has no `GRANT` member.
- Completeness is measured per dimension at the layer that owns the bound:
  enumeration in the file walk, content read over the enumerated set,
  projection in the discovery core. Each layer reports its own exact facts and
  the upstream states it inherited; nothing is collapsed.
- Countability decides the state: a bound whose drops can be counted yields
  TRUNCATED; a bound that aborts observation yields UNKNOWN with null totals.
- One shared projection module (`src/core/source/populationCompleteness.ts`)
  renders those facts for every consumer, so no two surfaces can disagree.
- Ceilings are raised and aligned rather than removed, and overflow keeps
  failing closed.

## Milestones

- M1 — bounded, per-repository-fair operation projection with explicit
  completeness. DONE.
- M2 — shared completeness and R2 coverage vocabulary. DONE.
- M3 — disjoint enumeration and content-read completeness in the inventory,
  with `budgetRejections` split. DONE.
- M4 — operation projection consumes both upstream dimensions separately.
  DONE.
- M5 — census, CLI, and downstream ceiling propagation. DONE.
- M6 — C-15a Control Center backend contract and visible UI marking. DONE.
- M7 — 43-vs-83 durable-truth resolution (D-105). DONE.
- M8 — full validation and closure. DONE.

## Validation Strategy

Focused during development: `tsc --noEmit`, the two C-01 unit suites, the
adjacent source suites, the Control Center suites, the UI vitest and browser
qualification, `hardening-check`, and read-only CLI smoke runs against real
approved source. Full `gate:local` and the clean-checkout gate only at
closure.

## Decision Log

- Truncation is bounded but never silent; every drop is reported per
  repository.
- Per-repository round-robin dealing is the no-eviction mechanism.
- Enumeration and content-read completeness are independent dimensions; the
  inventory-wide state is their conservative combination.
- An aborted enumeration reports null totals and `remainingUnknown: true`,
  never a fabricated zero.
- UNKNOWN ranks above TRUNCATED: combining may only weaken a claim.
- Coverage has no GRANT effect by construction.
- Downstream ceilings are raised and aligned, not removed; overflow fails
  closed.
- Historical metric figures stay in the record, annotated as historical over
  the 128 cap; only current-truth statements are corrected, and analyzer
  semantics are not changed to force agreement.

## Discoveries

See `STATE.md` § Discoveries: the live enumeration truncation in
`mobingilabs/ouchan` and `mobingilabs/ripple-ui` against a complete
`mobingilabs/ripple-api`, the 43 + 9 + 76 = 128 proof that both historical
response-contract figures were capped measurements, and the two downstream
128 ceilings that had silently coincided with the discovery cap.

## Deferred Work

- `MAX_READONLY_CANDIDATE_HANDLER_FILES = 128` remains a hard fail-closed
  throw; it is the next ceiling coverage growth will reach.
- Raising the per-repository enumeration limits for `mobingilabs/ouchan` and
  `mobingilabs/ripple-ui` is a coverage decision, not a truth decision.

## Completion Criteria

- ripple-api yields all 223 operations with no silent cap.
- The no-eviction regression passes permanently.
- Completeness states limit, examined, total-where-knowable, dropped, and
  UNKNOWN explicitly, and UNKNOWN is never readable as COMPLETE.
- Enumeration completeness and content-read exhaustion are never conflated.
- The census, CLI, and Control Center all state the population they measured,
  and the UI visibly marks a truncated or incomplete one.
- The 43-vs-83 discrepancy is resolved in durable truth without changing
  analyzer semantics.
- Full required validation green.
