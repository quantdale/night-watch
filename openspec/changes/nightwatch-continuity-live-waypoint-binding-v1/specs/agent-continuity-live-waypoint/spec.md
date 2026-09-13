## ADDED Requirements

### Requirement: IN_PROGRESS waypoint fields SHALL agree across ACTIVE_TASK and STATE.md

For the active task whose `.agent/ACTIVE_TASK.md` Status normalizes to
`IN_PROGRESS`, the operational waypoint in ACTIVE_TASK and in
`.agent/tasks/<id>/STATE.md` SHALL name the same current milestone identity
and SHALL not describe contradictory next actions.

Milestone identity is the first token matching `^(G|W|M)\d+` in ACTIVE_TASK
`Current milestone` and in STATE.md `Milestone ID` if present, otherwise the
normalized first line of STATE.md `## Current Milestone`. Exact prose after
the token MAY differ. A missing token on either side while the other side
has one is disagreement.

Next-action contradiction means one side names a concrete completed
milestone identity as the thing to do next (for example ACTIVE_TASK "run the
G1.2 …" while STATE.md Milestone ID is `G4..G21` and G1 is recorded
COMPLETE_LOCAL). The check SHALL fail closed on that shape. It SHALL NOT
require byte-identical next-action paragraphs.

The check belongs in `bin/agent-continuity-protocol.mjs` and SHALL run inside
the required `AGENT_CONTINUITY` group. Duplicate canonical structured fields
remain errors (`DUPLICATE_CONTINUITY_FIELD`).

#### Scenario: drifted IN_PROGRESS milestone fails the gate

- **WHEN** ACTIVE_TASK `Current milestone` yields identity `G1` and STATE.md
  `Milestone ID` yields identity `G4`
- **THEN** `agent:check` reports `ACTIVE_TASK_MILESTONE_DRIFT` naming both
  identities
- **AND** the `AGENT_CONTINUITY` gate group fails

#### Scenario: matching milestone identities pass

- **WHEN** both sides yield identity `G4`
- **THEN** the milestone clause of this requirement passes even if the rest
  of the sentence differs

#### Scenario: COMPLETE tasks are unchanged

- **WHEN** the active task Status is `COMPLETE`
- **THEN** this requirement does not apply
- **AND** the existing COMPLETE terminal-milestone rules continue to apply

### Requirement: SESSION WORKTREE SHALL name a live worktree or NONE

The DEF-FC-04 routing block already requires a single `SESSION WORKTREE`
directive and occurrence-complete `session/…` scanning. It SHALL additionally
resolve that directive against live `git worktree` registrations of this
repository.

If the value is `session/<name>`, a registered worktree whose branch is
exactly that name MUST exist. If no owned session is live, the directive MUST
be `NONE` and STATE.md `Branch:` MUST be `main` (canonical). A routing block
that names a released, removed, or never-created session as if it were live
SHALL fail.

The check SHALL be read-only. It SHALL NOT create, adopt, release, or delete
a worktree.

#### Scenario: named session worktree is missing

- **WHEN** ACTIVE_TASK declares `SESSION WORKTREE: session/nightwatch-production-completion-3d648499`
- **AND** `git worktree list` has no worktree on that branch
- **THEN** `agent:check` reports `ACTIVE_TASK_SESSION_WORKTREE_MISSING` naming
  the declared value
- **AND** the `AGENT_CONTINUITY` gate group fails

#### Scenario: canonical-only work is explicit

- **WHEN** the routing block declares `SESSION WORKTREE: NONE`
- **AND** the only registered worktree is canonical `main`
- **AND** STATE.md `Branch:` is `main`
- **THEN** the live-worktree clause passes

#### Scenario: foreign session mention still fails

- **WHEN** any `session/…` occurrence in ACTIVE_TASK.md is not the declared
  SESSION WORKTREE
- **THEN** the existing `ACTIVE_TASK_ROUTING_FOREIGN_WORKTREE_REFERENCE`
  error still fires
- **AND** `NONE` is not a `session/…` occurrence

### Requirement: An active OpenSpec change SHALL have a continuity-v2 task

`LEDGER_CHANGE_WITHOUT_TASK` for a change directory under
`openspec/changes/<id>/` that is not archived SHALL be an error, not a
warning, when that change has no `.agent/tasks/<id>/STATE.md`.

`LEDGER_TASK_WITHOUT_CHANGE` for historical task directories SHALL remain a
warning. Mass-creating OpenSpec changes for the 149 historical tasks is
forbidden.

A change whose STATE.md exists but is legacy v1 remains
`LEDGER_LEGACY_CHANGE` (warning), unchanged.

#### Scenario: an active change without a task fails the gate

- **WHEN** `openspec/changes/nightwatch-control-center-design-system-v1/`
  exists with `tasks.md` and `.agent/tasks/nightwatch-control-center-design-system-v1/STATE.md`
  does not exist
- **THEN** `agent:check` reports `LEDGER_CHANGE_WITHOUT_TASK` as an error
  naming the change id and the open-box count
- **AND** the `AGENT_CONTINUITY` gate group fails

#### Scenario: this change and its audit siblings are not exempt

- **WHEN** `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/`,
  `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/`, or
  `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/`
  exists as an active change and the matching `.agent/tasks/<id>/STATE.md`
  does not exist
- **THEN** `agent:check` reports `LEDGER_CHANGE_WITHOUT_TASK` as an error
  for that id
- **AND** the `AGENT_CONTINUITY` gate group fails
- **AND** no exemption exists for changes created by the same campaign that
  introduced the error

#### Scenario: a historical task without a change stays a warning

- **WHEN** `.agent/tasks/phase-16a-campaign-yield-portfolio-optimization/`
  exists and `openspec/changes/` has no matching directory and the archive
  index has no matching stripped name
- **THEN** `LEDGER_TASK_WITHOUT_CHANGE` is reported as a warning
- **AND** `agent:check` does not fail for that orphan alone
