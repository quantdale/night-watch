# Design — repository master hardening implementation

## Principle

Deterministic authority stays beneath the reasoner and beneath the operator
surface. A value that has not been mechanically admitted has no effects, and
a claim that has not been mechanically measured is not made.

## Four rules, applied in dependency order

**Membership before effect.** Closed vocabularies are checked by own-key
membership and dispatched exhaustively. An inherited name, a coerced value or
an unknown discriminant is rejected before it can reach a terminal state, a
dossier field or a tool lookup. No default branch reinterprets an unknown
discriminant as a valid one.

**One authority per decision.** Private-path containment, publication
atomicity and operation deadlines each get exactly one owner, injected by
consumers rather than re-derived. Path authority resolves the canonical
Nightwatch root, the sibling `REPOSITORIES` root, registered linked
worktrees and permitted owner-state roots from `DEFAULT_SIBLING_ROOT` or an
explicit `NIGHTWATCH_REPOS_ROOT`, never from module location, and rejects
ambiguity. A relay operation creates one monotonic deadline and one
`AbortController` at its boundary and threads the remaining budget and signal
through auth, connection, redirect and body.

**Bound before allocate.** Readers cap file size before allocation and verify
file identity before reading. Writers stage canonical bytes into an
owner-only same-directory temporary, sync where supported, replace atomically
under verified parent and leaf identity, then publish generation metadata,
cleaning owned temporaries in `finally`. Mutable checkpoints get generations
and same-ID writer semantics; immutable reviews keep no-replace identity.
Corrupt owner evidence is preserved and reported, never deleted to make
startup succeed.

**Truthful surface.** Capability, staleness, page continuation, exclusion and
unavailability are represented explicitly. Absent, skipped, unavailable and
zero-step never render as PASS. A release receipt is bound to a discovered
inventory digest with executed, skipped and unavailable counts, and local,
clean-checkout, host-qualified and CI claims stay separate.

## What does not change

The permanent owner scope freeze; L6 process and network containment; the
Phase 9 / 9A.1 / 10 semantic admission rules; mechanical dossier admission and
`humanReviewRequired`; historical `PRE_FAIL_POST_PASS` and strict
`EXACT_REDISCOVERY` semantics; the W9 reproduction executor and the W10
`nightwatch.reproduction-surface-map.v1` contracts; loopback, Host/Origin,
CSRF and CSP guarantees; snapshot and checkpoint schema identities; lockfile
reproducibility; and C-00 worktree ownership.

## Ordering

Shared contracts freeze before their consumers change. NW-03, NW-04 and NW-09
consume the NW-02 path authority. NW-10 and NW-11 consume frozen NW-09
capability and pagination DTOs. NW-08 opens early for discovery and closes
after the changed surfaces stabilise, together with NW-14. NW-07 reconciles
last, once the records it must agree with are terminal.
