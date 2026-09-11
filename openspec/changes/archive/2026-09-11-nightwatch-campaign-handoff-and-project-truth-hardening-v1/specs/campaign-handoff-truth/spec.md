# Campaign Handoff + Project Truth — Delta Specification

## ADDED Requirements

### Requirement: Canonical execution handoff is versioned and machine-checkable

The repository SHALL define one versioned machine-readable handoff contract for .agent/EXECUTION_PROMPT.md.

#### Scenario: Fresh planned campaign is ready

- GIVEN a terminal predecessor task
- AND a tracked OpenSpec change with the required files
- AND a safe campaign ID, target branch main, and real Planned-From ancestor
- WHEN the planner checkpoint is in READY_FOR_EXECUTION state
- THEN handoff validation SHALL pass
- AND the predecessor MAY remain the active terminal task until executor activation
- AND the planning checkpoint SHALL NOT become a substantive implementation baseline.

#### Scenario: Unsupported or malformed header

- WHEN the handoff protocol version, status, required key, duplicate key, campaign ID, or path is malformed/unsupported
- THEN validation SHALL fail closed
- AND no fallback prose inference SHALL authorize execution.

### Requirement: Handoff campaign identity binds exactly one OpenSpec route

The handoff SHALL bind the campaign identity to exactly one OpenSpec route.

#### Scenario: Campaign and OpenSpec agree

- WHEN Campaign ID is X
- THEN OpenSpec SHALL resolve only to openspec/changes/X/
- AND audit.md, proposal.md, design.md, tasks.md, and at least one specs/*/spec.md SHALL exist as tracked regular repository files.

#### Scenario: Route is missing, untracked, ambiguous, traversing, or mismatched

- THEN handoff validation SHALL fail
- AND SHALL NOT silently search for a replacement campaign.

### Requirement: Planned-From and branch are Git-bound

The handoff SHALL bind Planned-From to a real commit ancestor of live HEAD and the target branch to the permitted branch.

#### Scenario: Valid planning baseline

- GIVEN Planned-From resolves to a real commit
- AND it is an ancestor of live HEAD
- AND Target Branch is main
- THEN the handoff MAY be current subject to the rest of the state model.

#### Scenario: Invalid Git relationship

- WHEN Planned-From is missing, non-commit, non-ancestor, or the target branch is not the permitted branch
- THEN validation SHALL fail with a bounded diagnostic.

### Requirement: Planned and active states are distinct

The handoff SHALL keep planned and active states distinct.

#### Scenario: READY handoff before activation

- GIVEN the prompt is READY_FOR_EXECUTION
- AND ACTIVE_TASK names the terminal predecessor declared by the handoff
- THEN validation SHALL pass if all other planning invariants hold.

#### Scenario: Active campaign begins

- WHEN the prompt transitions to IN_PROGRESS
- THEN ACTIVE_TASK SHALL route to the new campaign task
- AND continuity-v2 SHALL pass for that task.

#### Scenario: State mismatch

- WHEN the prompt is IN_PROGRESS/BLOCKED/COMPLETE but ACTIVE_TASK does not represent the matching task/status
- THEN validation SHALL fail closed.

### Requirement: Terminal stale prompt is rejected

The handoff SHALL reject a terminal stale prompt.

#### Scenario: Current live defect shape

- GIVEN ACTIVE_TASK is COMPLETE for campaign A
- AND EXECUTION_PROMPT is COMPLETE for unrelated campaign B
- WHEN authoritative handoff validation runs
- THEN the repository SHALL NOT treat B as the current executable route
- AND the mismatch SHALL be reported deterministically.

### Requirement: Task continuity remains the execution authority

The handoff protocol SHALL validate route/currentness only. It SHALL NOT replace ACTIVE_TASK/STATE as milestone/execution authority.

#### Scenario: Prompt and task disagree on execution details

- WHEN an active task's continuity-v2 state disagrees with prose in the prompt
- THEN task continuity and current implementation evidence retain their existing precedence
- AND handoff validation SHALL surface the route/state mismatch rather than inventing a merged state.

### Requirement: Planning checkpoints preserve SHA-role truth

Planning checkpoints SHALL preserve SHA-role truth.

#### Scenario: Docs-only planning commit follows substantive predecessor

- WHEN only approved planning/documentation paths change
- THEN the predecessor substantive implementation SHA SHALL remain the implementation-role anchor
- AND the planning commit MAY be classified as a documentation/checkpoint descendant.

#### Scenario: Docs-only commit is supplied as implementation role

- THEN continuity SHALL fail with an implementation-role diagnostic.

#### Scenario: Substantive source changes after baseline

- THEN a COMPLETE task SHALL fail stale-baseline validation until a new validated substantive checkpoint is established.

### Requirement: Machine-owned project-state block has a strict schema

The successor project-state protocol SHALL reject fields inside its machine-owned block that it does not validate or mechanically derive.

#### Scenario: Unknown or stale live-looking field is present

- GIVEN a machine block contains an unowned key such as a stale historical Phase-15 program-state field
- WHEN project-state validation runs
- THEN validation SHALL fail
- OR the field SHALL first be moved outside the machine-owned block as historical prose.

#### Scenario: Historical prose exists outside the block

- THEN the narrow project-state checker SHALL NOT be required to parse or validate that prose.

### Requirement: Project-state output is faithful to checked semantics

Project-state output SHALL be faithful to the semantics it checks.

#### Scenario: Declared lifecycle/effective authority is SPENT/NONE

- WHEN the protocol represents a consumed promotion authorization
- THEN the checker SHALL either project the declared value exactly
- OR expose distinct, unambiguous keys for lifecycle state and effective next authority
- AND SHALL NOT validate one meaning while outputting another under the same key.

### Requirement: Project-state remains narrow

The project-state machine block SHALL remain narrow.

#### Scenario: New historical phase information is documented

- THEN it SHALL NOT automatically be added to the machine block
- AND a new machine key requires an explicit derivation/validation owner and tests.

### Requirement: Handoff truth is part of authoritative acceptance

Handoff truth SHALL be part of authoritative acceptance.

#### Scenario: Unified gate runs

- WHEN gate:local, gate:ci, gate:clean, or another current authoritative mode evaluates agent/project truth
- THEN handoff validation SHALL execute exactly once through the owned gate path
- AND a handoff failure SHALL make the required gate non-green.

### Requirement: Handoff/project checkers are read-only and bounded

The handoff and project checkers SHALL be read-only and bounded.

#### Scenario: Checker executes

- THEN it SHALL perform zero filesystem writes
- AND zero Git mutation/remote operations
- AND zero network/model/product/auth/data/infra calls
- AND fixed-argv child processes SHALL use shell:false and bounded timeout/buffers
- AND diagnostics SHALL remain bounded and privacy-safe.

### Requirement: Full transition matrix has permanent synthetic proof

The full transition matrix SHALL have permanent synthetic proof.

#### Scenario: Protocol changes

- THEN deterministic fixtures SHALL cover planned, active, blocked, complete, stale, non-ancestor, wrong-route, docs-only, substantive-change, malformed, and project-state unknown-field cases
- AND repeated runs SHALL be byte/structure stable where outputs are specified deterministic.

### Requirement: External zero-step CI is non-evidence

External zero-step CI SHALL remain non-evidence.

#### Scenario: Exact-head Actions executes zero steps

- THEN the run SHALL remain classified as an external billing/platform block
- AND SHALL NOT be called green
- AND workflow semantics SHALL NOT be weakened to hide the condition.
