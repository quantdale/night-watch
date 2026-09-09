# Design — residual closure and lane qualification

## Lane qualification is a three-valued answer, not a boolean

The predecessor recorded four lanes as UNAVAILABLE, which conflated "the
host cannot do this" with "this campaign's authority did not cover it". The
distinction is load-bearing, so each lane resolves to exactly one of:

- `PROVEN` — executed in an owned session with a recorded receipt;
- `BLOCKED_EXTERNAL` — a specific external authority denies execution, with
  the observed evidence and block class recorded;
- `UNAVAILABLE_CAPABILITY` — the host or an owner capability is genuinely
  absent, with the acquisition condition named.

An absent run never becomes a pass in any of the three. What changes is that
a reader can tell them apart, and that a lane in the first class stops being
carried as unavailable.

## The receipt must come from an owning session

The browser lane already passes from the canonical checkout. That is
deliberately not enough: C-00 makes the canonical checkout a
non-implementation worktree, so a run there has no session identity to bind
a receipt to. The lane is therefore re-executed inside this campaign's owned
session worktree, and the recorded receipt names that session. This is the
same standard the campaign applies to every other lane, applied to a lane
whose result is already known.

## CI evidence is recorded as observation, never as projection

`docs/CI_HARDENING.md` already forbids projecting execution from a local
workflow parse, and already defines `NO_STEPS_BILLING_OR_PLATFORM_BLOCK` for
a required run with no steps. The gap is only that no observed instance is
recorded. The design records the run identity, the executed SHA where one
exists, the observed annotation and the block class — and leaves
`CI_STATUS` non-passing. Clearing the billing block is an owner action; this
campaign records the block, and does not model a hypothetical green run.

## Retention is refusal-first

A prune over immutable evidence is dangerous in exactly one direction, so the
default is inverted from the usual: reporting is the default mode, removal
requires an explicit owner flag, and the prune computes a refusal set before
it computes a removal set. An artifact is refused if tracked task state,
a REPORT receipt, or project state references it; if it cannot be proven
unreferenced, it is refused rather than removed. The prune reports counts for
both sets, and reclaiming nothing is a valid, honest outcome.

Retention never rewrites, truncates or replaces an artifact. It removes whole
unreferenced run directories or nothing, which preserves the no-replace
identity patterns the review and evidence stores depend on.

## Bookkeeping changes are additive to the archives

`docs/CURRENT_STATE.md` gains a closure section in the established shape and
its validated-SHA fields are reconciled. No historical section, receipt or
SHA is rewritten — NW-07's constraint against putting historical receipts at
risk for a readability gain still holds, and this campaign adds to the
archive rather than restructuring it.

## What the stale worktrees may and may not do

Both stale session worktrees claim terminal-COMPLETE tasks, so release is the
correct lifecycle step rather than adoption. Release and branch removal run
from the canonical checkout through `bin/nightwatch-session.mjs`, never by
deleting a directory or a branch by hand, and never against a worktree whose
holder is live. If any check reports a live holder, that worktree is left
exactly as it is and reported.
