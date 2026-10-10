# Design — Certification closure and validation integrity

## The shape of the problem

Every item in this campaign is the same defect wearing a different coat: a
mechanism that REPORTS more than it PROVES.

- `--dry-run` reported a plan and performed the mutation.
- `hardening:rules` proved each rule detects its violation, and nothing ran it.
- Sixty rules declared TOTALITY; four stopped at the first failure.
- `withoutComments()` produced a "code-only" view with real code missing.
- A focus ring was drawn and could not be seen.
- A currentness pin said `27bb007a` while the source said `4e3e200d`.

So the design principle throughout is: make the claim and the proof the same
object, and make the failure mode loud.

## Decisions

### D1 — the dry-run contract is declared once and enforced at dispatch

A per-command `if (options.dryRun)` scattered through eight functions is how
five of them came to omit it. `DRY_RUN_SUPPORT` is a single table, checked
before any command runs, and a command with no entry cannot dispatch. The
alternative — documenting the flag per command in help text — was rejected: it
records intent without enforcing it, which is the original defect.

`NOT_APPLICABLE` commands REFUSE the flag rather than accepting it as a no-op.
A silently ignored flag is indistinguishable from a supported one, which is
exactly how `start --dry-run` looked correct for as long as nobody checked the
topology afterwards.

### D2 — the probe campaign becomes a required group, not an optional lane

Placing it behind a flag, an environment variable or a separate "deep" lane
reproduces the blind spot it exists to close: the reason HC-015 rotted is that
running it was optional. It is therefore REQUIRED, offline, and ordered between
`HARDENING` and `HANDOFF_TRUTH` — after the structural rules it validates, and
before anything that would waste time on a broken rule engine.

Running it against the real checkout was chosen over a disposable copy. The
campaign already restores in a `finally`, verifies byte-equality for every file
it touched, and requires `git status --porcelain` to be unchanged; a copy would
weaken the detection semantics (the rules read tracked state) to buy safety the
campaign already provides. The residual risk — two mutation runs racing — is
real, was hit during this campaign, and is now recorded rather than designed
around, because the gate runs its groups serially.

### D3 — a probe follows its rule's indirection rather than copying it

HC-015 named a task directory; its rule followed `.agent/ACTIVE_TASK.md` to
whatever the active task is. The two agreed until the active task changed. The
fix is not a better literal but a shared resolution: `<ACTIVE_TASK_DIR>` is
resolved by the campaign the same way the rule resolves it, and an unresolvable
placeholder throws rather than silently probing the wrong file.

### D4 — quantifier truth is asserted behaviourally where it can be

The existing self-check caught one syntactic shape (a non-global `.exec()`).
The new check catches the shape that actually shipped — `fail(...); return;`
inside the subject loop — and reports the loop line and the return line.
Nesting is computed by INDENTATION rather than brace matching, because the
comment-blanked view still contains strings and regex literals and a brace
inside one of those makes a matcher run past the real loop body. The first
implementation did exactly that and reported a `return` in a top-level
try/catch.

The code-view property is asserted by RUNNING the accessor over a fixed hazard
sample, not by inspecting how it is written. What matters is what it returns.

### D5 — re-admission compares derivations, never SHAs

The admitted source is re-derived at both snapshots and the results compared
field by field. The evidence digest binds the normalized source structure, so
digest equality across the move is a statement about the SOURCE rather than
about the label on it. A SHA edit alone would satisfy every currentness check
while proving nothing — which is precisely what the Phase 9A.1 rule forbids.

Where a second copy of the admitted SHA existed, it was REBOUND to the one
authority rather than re-pinned, because a second authority is what allowed the
drift to be partial. The one exception is an assertion that is ABOUT the
historical value; binding that to the live authority would make it vacuous.

### D6 — focus qualification measures cues, not rules

A stylesheet rule is not evidence that a composition renders it. The matrix
measures computed styles at every declared width in every view. A control
qualifies when at least one cue that CHANGED on focus is adequately
contrasted, unclipped and on screen — evaluating only the outline would fail
`.table-action`, whose outline is deliberately allowed to clip because the rule
also recolours border and fill. The unfocused signature is snapshotted before
each walk so a static border is never counted as an indicator.

Non-vacuity is expressed as named control kinds rather than a count, because a
count is satisfied by measuring the same navigation link forty-five times.

## Rejected alternatives

- **Pinning the sibling checkout back to `27bb007a`.** It would make the gate
  green without establishing anything, and the source has legitimately moved.
- **Widening an exemption list to absorb the focus findings.** The findings are
  real. One selector IS declared unreachable — with the reason that already
  applies to its base selector and its siblings, and without claiming the
  matrix measured it.
- **Lowering the contrast floor.** 3:1 is the WCAG 2.2 1.4.11 threshold the
  repository already names; the defects were 1.08:1.
