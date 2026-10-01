## ADDED Requirements

### Requirement: Task IDs are stable
A ledger check SHALL fail when any checklist line in an active change's
tasks.md loses or renames the `N.M` identifier it had at the change's
bootstrap commit.

#### Scenario: ID replaced by a DONE note
- **WHEN** `- [x] 3.1 …` is rewritten as `- [x] — DONE …`
- **THEN** agent:check fails and names the missing ID

### Requirement: Continuity agrees with git
ACTIVE_TASK, the task STATE and PLAN SHALL name the same current milestone and
next action, SHALL tick every task whose implementation is committed, and
SHALL attribute work to the commits that contain it.

#### Scenario: Committed but unticked
- **WHEN** a task's implementation is committed and it remains unticked
  after the checkpoint
- **THEN** the continuity check reports it

### Requirement: The validated anchor is never back-dated
`LAST_VALIDATED_IMPLEMENTATION_SHA` SHALL name the latest substantive commit
that passed validation. A task anchor ahead of the project baseline during an
IN_PROGRESS task SHALL be reported as `TASK_AHEAD_OF_PROJECT_BASELINE`
ATTENTION, only when the anchor is an ancestor of HEAD.

#### Scenario: Milestone validated mid-campaign
- **WHEN** a milestone passes validation at commit V
- **THEN** the anchor is V and project:check reports ATTENTION, not failure

#### Scenario: Anchor not an ancestor
- **WHEN** the task anchor is not an ancestor of HEAD
- **THEN** project:check fails

### Requirement: Undispositioned items block terminal closure
`LEDGER_UNDISPOSITIONED_ITEM` SHALL be an error when the active task declares
a terminal phase. A disposition token SHALL count only as a trailing marker
after the struck text.

#### Scenario: Token inside the struck description
- **WHEN** the word EXTERNAL appears only inside the struck text
- **THEN** the item is undispositioned

### Requirement: Committed files are not rewritten out of band
The repository SHALL declare a formatter policy that makes external formatter
runs no-ops. The canonical checkout SHALL be clean before any session starts.

#### Scenario: Global formatter run
- **WHEN** a formatter is run over the repository
- **THEN** no tracked file changes
