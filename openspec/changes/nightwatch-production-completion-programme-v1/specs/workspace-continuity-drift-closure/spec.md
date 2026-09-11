# Spec — Workspace and continuity drift closure

Closes F-07. Measured at `36bd493`, `npm run session:status` returns
`verdict=PASS reason=WORKSPACE_INTEGRITY_SATISFIED` with all seven groups PASS
and `attention=0`, while simultaneously reporting that the canonical checkout
holds a `CANONICAL_MAINTENANCE` claim for
`nightwatch-control-center-render-truth-v1` — two campaigns stale — and that a
`live=true OWNED_SESSION` worktree is held for
`nightwatch-repository-hardening-implementation-v1`, whose `STATE.md` says
COMPLETE. `agent:check` reports 31 legacy v1 task records carrying 41 warnings.
R-05 left 16 non-merged branches for an owner decision that has not been taken.

## ADDED Requirements

### Requirement: A claim naming a terminal task SHALL be reported as attention, not PASS

The workspace guard validates that a claim is structurally well-formed. It
never asks whether the task the claim names is still open, so a claim outlives
its campaign indefinitely and the verdict stays PASS. Both observed drifts are
instances of this one gap.

`WORKSPACE_WORKTREE_METADATA` SHALL additionally resolve each claim's task id
against `.agent/tasks/<id>/STATE.md` and report `CLAIM_TASK_TERMINAL` when the
task's status is `COMPLETE` or `BLOCKED`. The finding SHALL raise the
`attention` count so `attention=0` means what an operator reads it to mean.

The report SHALL remain non-destructive. It SHALL name the owner action —
release the session, or re-point the maintenance claim at the active task — and
SHALL NOT release, adopt, retire or edit any session automatically. Releasing
another owner's session remains prohibited.

A claim whose task id has no task directory SHALL report `CLAIM_TASK_UNKNOWN`
rather than passing.

#### Scenario: the canonical stale maintenance claim is surfaced
- **WHEN** the canonical checkout's claim names a task whose `STATE.md` is
  terminal
- **THEN** `session:status` reports `CLAIM_TASK_TERMINAL` with both ids
- **AND** `attention` is at least 1

#### Scenario: a live session for a completed campaign is surfaced
- **WHEN** a `live=true OWNED_SESSION` worktree names a terminal task
- **THEN** the same finding is reported for that worktree
- **AND** the named owner action is to release it, through the session CLI

#### Scenario: nothing is released automatically
- **WHEN** the finding is reported
- **THEN** no worktree, branch or ownership record is modified
- **AND** the exit status distinguishes attention from failure

### Requirement: The two observed drifts SHALL be cleared through the session CLI

The canonical maintenance claim SHALL be re-pointed at the active task or
released. The `nightwatch-repository-hardening--e7b9be89` session SHALL be
released by its owner and its worktree removed, with its branch handled under
the branch decision below.

Both actions SHALL go through `bin/nightwatch-session.mjs` so the ownership
records and registrations stay consistent. Neither SHALL be performed by
deleting a directory, editing a record, or creating capacity by removing
another owner's session.

#### Scenario: drift is cleared and the verdict reflects it
- **WHEN** both claims are cleared through the session CLI
- **THEN** `session:status` reports `attention=0` with no `CLAIM_TASK_TERMINAL`
  finding
- **AND** `workspace:check` passes with no change to the C-00 invariants

### Requirement: The 31 legacy v1 task records SHALL be migrated or declared permanently historical

`agent:audit` reports `tasks=148 strict_v2=117 legacy_v1=31 strict_errors=0
legacy_warnings=41`. The existing rule is correct — do not mass-migrate; migrate
individually only when a future task depends on a record. The residual item is
that the 31 have never been classified, so every run re-emits 41 warnings that
carry no decision.

Each of the 31 SHALL receive one of two dispositions, recorded as data: migrated
to continuity v2, or declared `PERMANENTLY_HISTORICAL` with a one-line reason.
A declared-historical record SHALL be excluded from the warning count while
remaining readable, so the warning total becomes a live signal again rather
than a constant.

No historical record's content, SHA, receipt or date SHALL be altered by a
declaration.

#### Scenario: the warning count becomes meaningful
- **WHEN** all 31 records carry a disposition
- **THEN** `agent:check` reports zero legacy warnings
- **AND** a new undeclared legacy record raises the count to one

#### Scenario: declaration does not rewrite history
- **WHEN** a record is declared permanently historical
- **THEN** only the disposition field is added
- **AND** no existing line in the record is modified

### Requirement: The 16 undecided branches SHALL be decided

R-05 deleted six provably-merged branches and deliberately left 16 non-merged
branches for an owner decision. Undecided indefinitely is itself a decision,
made by default.

Each of the 16 SHALL be classified: contains work not present on `main` and is
to be kept, with the reason and the task it belongs to; or is superseded and is
to be deleted. The classification SHALL be derived from the actual diff against
`main`, not from the branch name.

Deletion SHALL be per-branch and owner-confirmed. No force-push, history
rewrite, or deletion of a branch held by a live session.

#### Scenario: classification comes from the diff
- **WHEN** a branch is classified
- **THEN** the classification cites the commits present on it and absent from
  `main`
- **AND** a branch with no unique commits is classified superseded

#### Scenario: a live session's branch is never deleted
- **WHEN** a branch is checked out by a registered worktree
- **THEN** it is excluded from deletion regardless of classification
