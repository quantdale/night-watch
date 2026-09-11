# Proposal — C-16 Expected Information Gain + Orphaned Ownership Closure

## Why

The gap matrix has sixteen rows and the programme has fifteen campaigns. The
independent review's F-28 maps `G-01`…`G-15` onto campaigns and finds that
**`G-16` has no owner**, and separately that EIG prioritisation — design §9.2 —
appears in no campaign's scope at all.

An orphaned requirement is not a small bookkeeping problem: nobody is
responsible for it, so it is never done and never explicitly dropped.

## The two are unrelated

The ledger row reads "G-16 and EIG owners", which invites treating them as one
prioritisation concern. They are not.

**`G-16` is a documentation-truth requirement.** Its authoritative definition
is "stale duplicate figures in durable docs", where `"83 / 175 / 45-80-3"`
reads as current; its fix is "one derived figure source"; its assertion is "no
document contains a census figure absent from the current ledger".

Reading the row as one prioritisation concern would have produced an EIG module
and left G-16 unimplemented — while the condition it polices was actively
worsening, because this overnight campaign has been writing measured figures
into `docs/CURRENT_STATE.md` all night.

**EIG is design §9.2's scoring model.** Six named factors, a multiplicative
numerator over a cost-plus-duplicate-risk denominator, and an explicit non-goal
of maximising request volume.

## What changes

Both are assigned to C-16 and implemented.

`G-16` gets one derived figure source: a ledger declaring each census measure,
its current value and the campaign that established it, plus a check that
refuses any tagged figure the ledger does not support. A superseded narrative
is RETIRED by an explicit marker rather than deleted.

EIG keeps the formula's shape and refuses its arithmetic. Encoding it literally
goes wrong twice: a float score makes the ORDERING depend on rounding, and a
multiplicative form turns a single zero into a deletion. So every factor is a
bounded integer level, the score is an exact rational never divided, ordering
cross-multiplies integers, and each factor's `UNKNOWN` sits strictly mid-scale.

## What does not change

**A high score grants nothing** — not admission, not DEV execution, not
production, not replay, not credentials, not environment access. EIG orders
what safety has already admitted and cannot widen it, which is why it takes no
admission input and exposes no gate.
