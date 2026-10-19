## ADDED Requirements

### Requirement: Campaign-level success is a host-computed verdict
A campaign SHALL be reported `COMPLETED_SUCCESSFULLY` only when a host-computed
verdict over the whole investigation population holds: a finite investigation
plan declared before running, the plan exhausted, started count equal to
completed count, population of at least two, at least one investigation
reaching its own declared end, no investigation stopping for a non-completing
reason, no stagnation-guard exit, a derived `VALID_PROVIDER_RUN` class, and at
least one executed tool action. Any other termination SHALL remain its own
distinct, non-qualifying class.

#### Scenario: A stalled campaign never qualifies
- **WHEN** a campaign exits `NO_PROGRESS` (or `PAUSED`, `CANCELLED`,
  `SAFETY_BLOCKED`, `BUDGET_EXHAUSTED`, or with a degraded provider) at any
  point in its population
- **THEN** the campaign is not `COMPLETED_SUCCESSFULLY` and the release
  evaluator refuses the receipt without relabelling any reason

#### Scenario: A genuine completed plan qualifies
- **WHEN** a campaign declares a finite plan, runs and completes the same
  number of investigations with at least one declared end and no
  non-completing termination
- **THEN** the host verdict is `COMPLETED_SUCCESSFULLY` and the evaluator
  grades the receipt on its other conditions

### Requirement: Resumed campaigns are reconciled, not counted twice
A campaign that suspends investigations and later resumes them SHALL retire
the `PAUSED` suspension placeholder when the resumed investigation finishes,
and SHALL NOT erase a provider failure that occurred before the suspension.

#### Scenario: Pause then finish
- **WHEN** a campaign pauses one investigation and later completes it
- **THEN** the termination population counts the finished reason exactly once
  and completion remains reachable

### Requirement: A mistaken live claim is correctable only by owner-approved recovery
The session CLI SHALL expose exactly one operation that corrects the task id
of the current owned record, requiring the exact current session id, exact
expected HEAD, exact previous task id, exact replacement task id and explicit
owner-recovery intent; it SHALL preserve the session identity, base, branch,
commits, worktree and history; it SHALL refuse foreign, stale, released,
ambiguous or already-claimed targets; and it SHALL never edit tracked files or
weaken continuity, workspace uniqueness or fail-closed admission checks.

#### Scenario: The recorded misclaim is corrected
- **WHEN** the owning session runs the recovery with every exact expectation
- **THEN** only the task field of its own record changes, the audit line is
  recorded, and workspace uniqueness passes afterwards

#### Scenario: A foreign session is never retargeted
- **WHEN** the recovery is attempted with a wrong session id, a wrong HEAD, a
  wrong previous task, a foreign worktree, or without the owner-recovery intent
- **THEN** the command refuses before any effect and the record bytes are
  unchanged
