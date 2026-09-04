# Proposal — MA-8 / F-13 P1 observation-scope prerequisite

## Why

C-11 built the thing that decides whether Nightwatch may *issue* a production
request. P1 never issues one: it observes an operator's already-loaded
production page. The eleven request-issuance gates therefore never naturally
execute for P1, and "P1 issues no requests" (UA-8) is false the moment an
authenticated SPA is involved — loading or interacting with it causes
application traffic, and causing the page to load while claiming "Nightwatch
issued nothing" is an accounting fiction (F-13).

Without a P1-specific observation-scope admission chain (MA-8, canonical E-16),
a future C-12 has no authority model for *observing an already-existing
subject* and no mechanical way to prove **zero requests attributable to
Nightwatch**. This change builds that architecture against local/mock subjects
only, with zero real production contact.

## What changes

1. A distinct `P1_OBSERVE` authorization class — fresh, one-shot, expiring,
   scoped to the exact campaign and P1 stage, bound to the implementation SHA
   and the PQ receipt digest — aliased to nothing, promotable to nothing.
2. A versioned named P1 observation-scope admission chain
   (`nightwatch.p1-observation-scope.v1`) establishing authority to *observe an
   already-existing subject* without granting authority to create that subject
   or generate production traffic.
3. An explicit operator-supplied subject model: Nightwatch never creates
   authenticated production state; absent or ambiguous subject denies.
4. External-only P1 scope configuration: exact admitted host (no wildcard, no
   deny-table inversion, no guessed host), bounded window with monotonic
   deadline, private evidence destination.
5. A mechanical four-class network-attribution model
   (`OPERATOR_PREEXISTING` / `APPLICATION_AUTONOMOUS` /
   `NIGHTWATCH_ATTRIBUTABLE` / `UNKNOWN`) with `UNKNOWN` failing closed and a
   terminal session classification that makes vacuous PASS impossible.
6. A machine-enforced passive capability cone (`src/core/prodObserveP1/`) that
   cannot import or invoke active-production, replay, DEV/NEXT, or
   mutation-capable browser machinery — structural enforcement, not comments.
7. Mandatory privacy projection before persisted observation evidence exists,
   kill-switch evaluation at admission and during observation, and an explicit
   P1-specific containment invariant (option B) recorded as a deliberate
   architecture decision.

## What does not change

- C-12 is not executed. No real production, DEV, NEXT, or C-08b contact.
- `src/core/prodObserve/**`, `src/core/prodPrivacy/**`,
  `src/core/prodEvidence/**` are consumed, never modified.
- No credential, session, token, profile, host, or customer identifier enters
  the repository. Fixtures are synthetic/local only.
