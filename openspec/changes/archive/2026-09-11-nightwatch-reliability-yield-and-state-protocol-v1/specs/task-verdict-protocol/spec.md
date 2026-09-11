## ADDED Requirements

### Requirement: Active tasks declare an explicit project-verdict effect

Every active continuity-v2 task SHALL declare exactly one bounded
`PROJECT_VERDICT_EFFECT` value: `PRESERVE`, `REEVALUATE`, or `SUPERSEDE`.
The checker SHALL reject missing, duplicate, malformed, or free-form values.

#### Scenario: Explicit post-acceptance preservation is valid
- **WHEN** an authorized hardening task is `IN_PROGRESS` and declares `PRESERVE`
- **THEN** the project may remain `OPERATIONALLY_ACCEPTED` while task status remains active

#### Scenario: Missing preservation authority fails closed
- **WHEN** an `IN_PROGRESS` task has an accepted project verdict but no explicit effect
- **THEN** project-state validation fails with a bounded authorization error

#### Scenario: Malformed or duplicate effect fails closed
- **WHEN** the effect is unknown, repeated, or placed outside the canonical metadata block
- **THEN** the task and project-state validation fail without inferring a default

### Requirement: Verdict effects govern acceptance transitions semantically

`PRESERVE` SHALL be limited to explicit post-acceptance hardening;
`REEVALUATE` SHALL prevent an active acceptance campaign from projecting an
earned accepted verdict; and `SUPERSEDE` SHALL require explicit replacement
evidence before replacing the prior project verdict. Task names SHALL NOT
grant or remove these effects.

#### Scenario: Acceptance task cannot pre-certify
- **WHEN** an acceptance task declares `REEVALUATE` and remains `IN_PROGRESS`
- **THEN** the project status remains pending/blocked and cannot become `OPERATIONALLY_ACCEPTED`

#### Scenario: Requalification cannot preserve stale acceptance
- **WHEN** a requalification task declares `REEVALUATE` while prior acceptance evidence is under test
- **THEN** the checker reports the active project as under evaluation rather than silently preserving acceptance

#### Scenario: Task-name changes do not change authority
- **WHEN** two tasks have identical structured metadata but different IDs or prefixes
- **THEN** their project-verdict behavior is identical

### Requirement: Continuity status is parsed from structured fields only

The continuity checker SHALL derive task status, milestone status, work in
progress, blockers, exact next action, resume recipe, and completion snapshot
from their canonical structured fields and SHALL NOT infer state from
status vocabulary appearing in unrelated narrative prose.

#### Scenario: Narrative status words are inert
- **WHEN** a narrative paragraph says that historical behavior was pending or blocked
- **THEN** the current task state is unchanged unless the canonical field says otherwise

#### Scenario: Canonical status is authoritative
- **WHEN** the canonical field reads `Status: COMPLETE`
- **THEN** the checker uses COMPLETE semantics regardless of other prose

#### Scenario: Contradictory live fields fail
- **WHEN** status is COMPLETE but a live milestone, WIP, next action, or completion snapshot remains open
- **THEN** validation fails with the relevant bounded contradiction

### Requirement: Documentation truth checks are bounded to live state

Project and handoff validation SHALL detect meaningful contradictions among
active task identity, status, phase, verdict effect, execution prompt, current
state, and live documentation sections, while permitting historical prose
containing old statuses.

#### Scenario: Machine accepted and live narrative blocked is rejected
- **WHEN** the machine-owned project status is accepted and a live current-state section says BLOCKED
- **THEN** documentation truth validation fails

#### Scenario: Historical blocked record remains readable
- **WHEN** a clearly marked historical section describes a prior blocked campaign
- **THEN** the validator does not reject it solely for containing BLOCKED

#### Scenario: Active task identity mismatch is rejected
- **WHEN** ACTIVE_TASK, STATE, and EXECUTION_PROMPT name different current task IDs or phases
- **THEN** validation fails before any campaign execution authority is constructed

### Requirement: State transitions are interruption-safe and observable

Persisted campaign state SHALL use atomic/bounded checkpoints and explicit
state transitions so interruption before, during, and after manifest/evidence
writes can recover without duplicate or lost work or false COMPLETE status.

#### Scenario: Interrupted manifest write recovers safely
- **WHEN** execution stops before a manifest checkpoint is complete
- **THEN** resume rejects incomplete state or reconstructs a valid pending state without executing duplicate work

#### Scenario: Auth expiry is classified explicitly
- **WHEN** authentication expires before or during a work item
- **THEN** the state records a sanitized auth-divergence/block outcome and does not report a product failure

#### Scenario: Completed work is not repeated
- **WHEN** resume follows a checkpoint after an item completed and evidence was persisted
- **THEN** that item is not executed again and the remaining work is explicit
