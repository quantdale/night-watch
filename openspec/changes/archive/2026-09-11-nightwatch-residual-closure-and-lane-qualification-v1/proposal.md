# Proposal — residual closure and lane qualification

The repository hardening campaign closed all fifteen master-plan findings and
left four lanes recorded UNAVAILABLE. Auditing those four against the live
host shows they are not equivalent: one of them already executes and passes
here, one has an observed external cause that project state does not record,
and two genuinely need an owner capability this campaign will not claim.

This change resolves what the host can actually prove today, and records the
rest as classified absence rather than as silence.

The browser workflow lane is qualified and executed inside an owned session
so its result becomes a receipt rather than an anecdote. The CI block is
recorded with its observed run evidence and its existing block class, so a
reader can tell an uninspected lane from an externally blocked one. The
predecessor campaign gets the `docs/CURRENT_STATE.md` closure section that
every prior campaign has, and the validated-SHA fields either advance to a
checkpoint whose receipts exist or state mechanically why they cannot. The
shipped opt-in review capability and its owner-local store reach the
entry-point documentation, and a supported check stops being reachable only
from a test. The two stale session worktrees get an explicit adopt-or-release
decision instead of a standing warning, and the legacy v1 task records are
either migrated or declared permanently historical.

Finally, evidence accumulation gets a retention policy it has never had:
13,367 run directories and 915 MB with no bounded prune. The prune is
owner-gated, defaults to reporting rather than removing, refuses to remove
anything referenced by tracked task state, and reports what it declined to
touch. Immutable evidence identity is not weakened to reclaim disk.

Nothing here reopens NW-01 through NW-15, splits the five append-heavy
archive documents, promotes the 84 `FULL_REGRESSION` suites into the
authoritative gate, or weakens a gate to produce green output. No network
egress, DEV, NEXT, production, cloud, datastore, external filing or
publication authority is claimed or exercised. Strict `EXACT_REDISCOVERY` and
previously-unknown-defect yield stay 0 and stay out of scope; they belong to
a separately authorized successor once provider capability is confirmed.
