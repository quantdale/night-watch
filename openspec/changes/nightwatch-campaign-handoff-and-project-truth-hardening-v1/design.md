# Design: Planner→Executor Handoff and Project Truth

## Design goals

1. A fresh autonomous executor must never silently follow a stale or unrelated campaign prompt.
2. Planning state and active task state must be distinguishable and mechanically valid.
3. The execution prompt validates route/currentness; ACTIVE_TASK/STATE remain task-execution authority.
4. A docs-only checkpoint must never masquerade as a substantive implementation baseline.
5. A block labeled machine-checked must contain only fields actually checked or derived.
6. Every checker remains local, read-only, deterministic, bounded, and safe to run in CI/clean checkout.
7. Existing product/runtime/source/promotion authorities remain unchanged.

## Component A — versioned handoff header

Use .agent/EXECUTION_PROMPT.md as the single human-readable execution instruction, but add a strict machine-readable header.

The initial protocol should own fields equivalent to:

- HANDOFF_PROTOCOL_VERSION
- Status
- Campaign ID
- OpenSpec
- Planned-From
- Target Branch
- Predecessor Task ID
- Predecessor Status

Exact names may be adjusted during implementation, but ambiguity is not allowed.

Minimum status vocabulary:

- READY_FOR_EXECUTION — planner checkpoint exists; predecessor may remain terminal active task.
- IN_PROGRESS — campaign has been activated and ACTIVE_TASK must bind to the same task/campaign.
- BLOCKED — active campaign is blocked and task continuity must agree.
- COMPLETE — active campaign/task is terminal and closure fields must agree.

Do not overload NONE/COMPLETE from task continuity if doing so makes planned-state semantics ambiguous.

### READY_FOR_EXECUTION invariants

- Campaign ID is syntactically safe.
- OpenSpec points exactly to openspec/changes/<Campaign ID>/.
- Required OpenSpec files exist and are regular tracked files.
- Planned-From resolves to a commit and is an ancestor of live HEAD.
- Target Branch is main.
- Current ACTIVE_TASK is allowed to be the terminal predecessor named in the prompt.
- Predecessor Task ID matches ACTIVE_TASK and predecessor status is COMPLETE or another explicitly allowed terminal state.
- The planning checkpoint itself may be a docs-only descendant of the predecessor implementation baseline.
- No source implementation is implied by READY_FOR_EXECUTION.

### IN_PROGRESS invariants

- ACTIVE_TASK Task ID equals Campaign ID unless an explicit stable mapping is designed and tested.
- ACTIVE_TASK status is IN_PROGRESS.
- Task directory exists and continuity-v2 validates.
- OpenSpec route still exists and is unchanged in identity.
- Planned-From remains an ancestor.
- Prompt cannot remain bound to an unrelated predecessor as execution authority.

### BLOCKED / COMPLETE invariants

- Prompt status and active task status agree.
- COMPLETE requires continuity-v2 terminal closure.
- BLOCKED requires the existing continuity-v2 blocker semantics.
- A completed prompt must not instruct an executor to re-run a different campaign.
- Historical execution prompts may be preserved elsewhere if desired; the canonical prompt must represent the current handoff state.

## Component B — pure parser plus read-only Git-aware checker

Prefer a small pure parser/validator module plus one Git-aware read-only CLI checker.

Possible layout:

- bin/planner-handoff-protocol.mjs — pure parsing/state rules.
- bin/planner-handoff-check.mjs — filesystem/Git existence/currentness checks.

Alternative placement is allowed if ownership remains clear.

The checker must:

- use fixed argv, shell:false child-process calls if Git is needed;
- use bounded timeouts/maxBuffer;
- disable Git optional locks where existing read-only helpers do;
- perform no fetch/pull/write;
- perform no network/model/product operations;
- not parse arbitrary prose beyond its owned header;
- emit bounded categorical diagnostics and safe identifiers only.

Do not make the handoff checker validate business semantics inside proposal/design/spec/tasks. Existence, path binding, state, Git ancestry, and identity are enough.

## Component C — OpenSpec route integrity

The handoff must bind exactly one OpenSpec change.

At minimum require:

- audit.md
- proposal.md
- design.md
- tasks.md
- at least one specs/<capability>/spec.md

The checker should reject traversal, symlinks where repository rules require regular files, wrong change ID/path, missing files, ambiguous multiple routes in the header, or an untracked route.

It does not need an external OpenSpec CLI if none is repository-native. Structural checks plus the repository's tests are sufficient unless the executor proves a compatible native validator already exists.

## Component D — SHA-role transition matrix

Retain existing agent-state implementation/documentation role semantics and strengthen the complete workflow.

Required synthetic transition matrix:

1. terminal predecessor at substantive implementation SHA;
2. docs-only planning checkpoint → still predecessor implementation role, handoff READY;
3. activate new task via docs/task records → handoff IN_PROGRESS and ACTIVE_TASK new task;
4. source/test implementation commit → new substantive implementation SHA;
5. docs-only closure commit → implementation baseline remains substantive; documentation checkpoint advances separately;
6. final terminal task + prompt COMPLETE;
7. stale source change after validated baseline → fail;
8. docs-only commit supplied as implementation role → fail;
9. non-ancestor planned-from → fail;
10. wrong branch / rewritten base / unrelated task → fail.

Do not solve this by simply widening APPROVED_CHECKPOINT_PATHS. Classification and role ownership must remain explicit.

## Component E — strict project-state v2 boundary

The current v1 block has become partially unchecked. Create a v2 contract or equivalently strict successor.

Principles:

- only fields with a mechanical validator/derivation belong inside the machine block;
- unknown fields in the machine block fail closed;
- historical phase notes live in prose outside the block;
- the checker does not become a general parser for all project history;
- output reflects exactly what was validated or clearly named derived projections.

Candidate owned fields include:

- protocol version
- live-head authority
- current-task authority
- validated-implementation authority
- canonical catalog target/count/digest/strategy
- Phase-8 terminal status if still needed as a durable invariant
- portfolio exhaustion derived from the real selector
- promotion authorization/effective-authority semantics with unambiguous naming

The executor should decide whether the cleanest contract is:

A. preserve NEXT_PROMOTION_AUTHORITY as the exact declared lifecycle token and project it exactly; or
B. split "authorization lifecycle = SPENT" from "effective next promotion authority = NONE".

Whichever is chosen, one JSON key must not silently substitute for another meaning.

Move PHASE_15_S1_CORE_CONVERGENCE and PHASE_15_PROGRAM_STATE out of the strict block unless the campaign introduces real current derivations for them. Do not add derivations merely to retain stale fields.

## Component F — authoritative gate integration

The handoff checker must not be optional.

Preferred integration options:

- incorporate handoff checking into the existing AGENT_CONTINUITY quality-gate group; or
- add a dedicated HANDOFF_TRUTH required group before project/task continuity.

If adding a group, update:

- config/quality-gate.v1.json
- bin/quality-gate.mjs
- quality-gate specification/inventory tests
- hardening guards

The unified local, CI, clean, and pre-DEV modes that currently depend on agent continuity must all receive equivalent fail-closed coverage.

Avoid duplicate execution if the check is already nested under agent:check.

## Component G — adversarial corpus

Minimum handoff fixtures:

- current stale-prompt reproduction: terminal task A + terminal prompt B
- READY campaign B + terminal predecessor A
- missing OpenSpec
- wrong OpenSpec ID
- traversal OpenSpec path
- untracked OpenSpec files
- missing required OpenSpec component
- malformed/duplicate header fields
- unsupported protocol version
- unknown status
- wrong branch
- planned-from nonexistent
- planned-from non-ancestor
- active task mismatch
- IN_PROGRESS prompt with terminal active task
- COMPLETE prompt with IN_PROGRESS task
- BLOCKED mismatch
- documentation-only planning checkpoint
- documentation-only commit misused as implementation
- source change after validated implementation
- secret/sentinel-like content in owned handoff metadata
- deterministic repeated output

Minimum project-state fixtures:

- current valid two-entry/exhausted state
- unknown machine-block field
- stale Phase-15 field inside strict block
- missing required field
- duplicate field
- NONE/SPENT semantics according to the selected v2 design
- checker PASS output equals declared/derived truth
- catalog count/digest mismatch
- selector available/exhausted mismatch
- active continuity failure
- dirty checkout where current contract requires clean
- unsupported protocol version

## Component H — documentation and migration

Update .agent/README.md and .agent/PLANNER_HANDOFF.md to describe the new handoff protocol.

Update AGENTS.md only if a permanent rule changes.

Update CURRENT_STATE machine block to v2 and move unowned historical fields outside it.

Preserve historical completed task records. Do not bulk-rewrite old execution prompts/task history.

## Performance and boundedness

The new checks should remain cheap relative to the quality gate. Record cold/warm wall time and peak RSS for:

- handoff check
- agent:check
- project:check
- combined quality gate portion

No absolute micro-benchmark is required, but repeated full Git object scans should be avoided if current helpers can be reused safely.

## CI truth

Observe the final exact-head Actions run once. If no steps execute, preserve the existing NO_STEPS_BILLING_OR_PLATFORM_BLOCK classification. Do not change workflow semantics solely to chase the external block.
