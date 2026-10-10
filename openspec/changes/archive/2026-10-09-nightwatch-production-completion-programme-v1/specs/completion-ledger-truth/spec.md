# Spec — Completion ledger truth

Closes F-01. Measured at `36bd493`: `openspec list` shows 16 changes with
unchecked tasks (150 open items); fourteen of the fifteen non-terminal ones are
COMPLETE in their `.agent/tasks/<id>/STATE.md`;
`openspec list --specs` returns `No specs found` and `openspec/specs/` does not
exist; zero of 57 changes have been archived.

## ADDED Requirements

### Requirement: A change's task ledger SHALL agree with its continuity-v2 task state

`openspec/changes/<id>/tasks.md` and `.agent/tasks/<id>/STATE.md` are two
records of the same campaign. Today they disagree fourteen times and no check
compares them. The system SHALL mechanically enforce agreement, in the
direction that can be false: a task whose `STATE.md` declares a terminal status
(`COMPLETE` or `BLOCKED`) SHALL NOT leave unchecked task boxes in its OpenSpec
change, and a change with unchecked boxes SHALL NOT correspond to a task whose
`STATE.md` is terminal.

The check belongs in `bin/agent-state.mjs` (which already strict-validates
every v2 task directory) and SHALL run inside the `AGENT_CONTINUITY` required
group of `config/quality-gate.v1.json`, so a divergence fails
`gate:local` and `gate:ci` rather than being discovered by reading.

Pairing is by identity: the change directory name and the task directory name
are the same string for every campaign in this repository. A change with no
matching task directory, and a task directory with no matching change, are both
reported explicitly — `LEDGER_CHANGE_WITHOUT_TASK` and
`LEDGER_TASK_WITHOUT_CHANGE` — and neither is silently skipped. A change that
predates the continuity-v2 marker is reported as legacy (warning), consistent
with the existing legacy-v1 treatment, and never inferred to be complete.

Strikethrough entries (`- [ ] ~~…~~`), used in
`nightwatch-production-privacy-firewall-c10-v1` to record deliberately
not-started scope, SHALL be recognized as a distinct class
(`DECLARED_NOT_IN_SCOPE`) and SHALL NOT count as open work.

#### Scenario: a terminal task with unchecked boxes fails the gate
- **WHEN** `.agent/tasks/<id>/STATE.md` declares `Status: COMPLETE` and
  `openspec/changes/<id>/tasks.md` contains an unchecked, non-strikethrough
  `- [ ]` entry
- **THEN** `agent:check` reports `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS` with the
  change id, the task id, and the line number of each open entry
- **AND** the `AGENT_CONTINUITY` gate group fails

#### Scenario: an open ledger against an in-progress task passes
- **WHEN** `.agent/tasks/<id>/STATE.md` declares `Status: IN_PROGRESS` and the
  change carries unchecked entries
- **THEN** the check passes and reports the open count as information

#### Scenario: an orphan on either side is named, not skipped
- **WHEN** a change directory has no task directory of the same name
- **THEN** the check reports `LEDGER_CHANGE_WITHOUT_TASK` naming the change
- **AND** the reverse orphan reports `LEDGER_TASK_WITHOUT_CHANGE`

#### Scenario: declared out-of-scope work is not open work
- **WHEN** a task entry is written `- [ ] ~~C-11 PROD_OBSERVE~~ — not started
  in this campaign, by construction.`
- **THEN** it is classified `DECLARED_NOT_IN_SCOPE`
- **AND** it does not trigger `LEDGER_TERMINAL_TASK_HAS_OPEN_ITEMS`

### Requirement: The fifteen divergent ledgers SHALL be reconciled from task truth, without rewriting history

Each of the fifteen changes named in `audit.md` F-01 SHALL be reconciled by
reading its task `STATE.md` and `REPORT.md` and marking each task entry with
its actual disposition. Entries SHALL NOT be blanket-checked. An entry that the
campaign genuinely did not do SHALL be rewritten as a strikethrough
`DECLARED_NOT_IN_SCOPE` entry with the reason, or carried forward into this
programme's `tasks.md` as live work — never quietly ticked.

No receipt, SHA, measurement or dated section anywhere in
`openspec/changes/**` or `docs/**` may be altered by this reconciliation. The
diff SHALL consist of checkbox state, strikethrough annotations and added
reasons only, and that constraint SHALL be verifiable from the diff itself.

`nightwatch-final-assurance-release-readiness-hardening-v1` is terminal
`BLOCKED`, not complete. Its single open entry SHALL be reconciled as blocked
with the blocker preserved, not as done.

#### Scenario: reconciliation touches no measurement
- **WHEN** the reconciliation commit is inspected
- **THEN** every changed line is a checkbox, a strikethrough marker, or an
  added reason clause
- **AND** no line containing a `receipt:sha256:`, a 40-hex SHA, a test count or
  a date is modified

#### Scenario: a genuinely undone item survives reconciliation
- **WHEN** a terminal campaign's ledger entry names work that was never done
- **THEN** the entry is either struck through with a stated reason, or appears
  verbatim in this programme's `tasks.md`
- **AND** it is never marked `[x]`

### Requirement: Every terminal change SHALL be archived and the spec baseline published

`openspec/specs/` does not exist. The project runs a `spec-driven` schema in
which no spec has ever been published, so there is no consolidated statement of
required behaviour anywhere. The system SHALL archive every terminal change via
`openspec archive` and SHALL thereby produce `openspec/specs/<capability>/spec.md`
as the project's first capability baseline.

Changes that are infrastructure, tooling or documentation only SHALL be
archived with `--skip-specs` rather than forced to invent a capability. That
classification SHALL be recorded per change, so the reason a change published
no spec is readable afterwards.

Archiving SHALL be ordered oldest-first so that later changes' deltas apply to
the baseline their predecessors established, and SHALL stop at the first
validation failure rather than continuing with `--no-validate`.

After archiving, `openspec validate --all` SHALL pass, and
`openspec list --specs` SHALL return a non-empty set.

#### Scenario: the baseline exists and validates
- **WHEN** archiving completes
- **THEN** `openspec/specs/` contains at least one capability
- **AND** `openspec list --specs` returns a non-empty list
- **AND** `openspec validate --all` exits zero

#### Scenario: a doc-only change publishes no spec, with a reason
- **WHEN** a change is classified infrastructure/tooling/documentation
- **THEN** it is archived with `--skip-specs`
- **AND** its classification and reason are recorded in the archive index

#### Scenario: archiving halts rather than bypassing validation
- **WHEN** `openspec archive` fails validation for change N
- **THEN** the run stops at N
- **AND** no change is archived with `--no-validate`

### Requirement: The ledger SHALL be discoverable as the answer to "what is open"

A reader SHALL be able to obtain the list of genuinely open work from one
command rather than by reading 57 directories. `bin/nightwatch-status.mjs`
(`npm run status:local`) SHALL report, per open campaign: the change id, the
task status from `STATE.md`, the open task count net of `DECLARED_NOT_IN_SCOPE`
entries, the campaign's blocking condition if any, and whether that blocker is
internal or external.

The report SHALL derive every field; none may be hand-maintained. A hand-edited
summary is exactly the artifact that produced F-01.

#### Scenario: one command answers what is open
- **WHEN** `npm run status:local` runs in a clean canonical checkout
- **THEN** it lists only campaigns whose task `STATE.md` is non-terminal
- **AND** each row carries the open count and the blocking condition

#### Scenario: the report cannot be faked
- **WHEN** a campaign's `STATE.md` is terminal but its ledger has open items
- **THEN** the report omits the campaign and `agent:check` fails
- **AND** the failure, not the omission, is what the operator sees
