# Nightwatch Agent Memory

`.agent/` is execution memory for the current and future Nightwatch tasks. It
is deliberately small, human-readable, and separate from `docs/`, which is
project memory across phases.

## Routing

Open `.agent/ACTIVE_TASK.md` first. It contains only the current task route,
status, SHA, checkpoint, and exact next action. An active `IN_PROGRESS` task
is read in this order: `SPEC.md`, `PLAN.md`, `STATE.md`; resume from STATE's
`Exact Next Action`.

## Two memory layers

- `docs/` answers: “What is Nightwatch today?” It stores durable architecture,
  decisions, safety facts, and roadmap state.
- `.agent/` answers: “What is the agent doing right now?” It stores frozen
  intent, a living plan, checkpoints, validation, and handoff material.

Do not turn `docs/CURRENT_STATE.md` into a session diary. Move durable facts
there and keep task waypoints in the active task directory.

## Context-compaction recovery

If context may have been compacted, or current work is uncertain:

1. Stop editing.
2. Read `ACTIVE_TASK.md`, then the task `SPEC.md`, `PLAN.md`, and `STATE.md`.
3. Inspect `git status --short` and the relevant diff.
4. Reconcile STATE with the actual working tree.
5. Run the smallest validation needed to establish current reality.
6. Update STATE if stale, then continue `Exact Next Action`.

Never reconstruct execution state from memory. Current tests and the working
tree are stronger evidence than a remembered conversation.

## Fresh-session recovery

A fresh agent loads the project docs, routes through `ACTIVE_TASK.md`, verifies
the current Git state, and resumes the active milestone. It inspects only files
directly needed by that milestone. If `Status: NONE`, it may begin a new task
using the templates and the task-plan contract.

## Checkpoints and handoff

`STATE.md` is updated after milestones, decisions, discoveries, meaningful
validation, safety events, before changing subproblems, before session end,
and before likely context loss. A completed task updates PLAN, STATE,
`REPORT.md`, project docs as needed, and ACTIVE_TASK, then commits the complete
handoff within Nightwatch.

## Planner -> executor handoff

`.agent/EXECUTION_PROMPT.md` carries the versioned
`nightwatch.planner-executor-handoff.v1` header. Its `READY_FOR_EXECUTION`
state binds a docs-only planning checkpoint to the named terminal predecessor;
`IN_PROGRESS`, `BLOCKED`, and `COMPLETE` bind the prompt to the current
continuity-v2 task and matching status. `npm run handoff:check` is the
read-only route/currentness checker for the prompt, exact OpenSpec route,
tracked regular files, planned-from ancestry, branch, and task binding. It
does not replace task continuity or parse OpenSpec prose.

The handoff check is a required `HANDOFF_TRUTH` group in the serial quality
gate and runs once before `PROJECT_TRUTH`. It is local, bounded, shell-disabled
for fixed Git/agent child processes, and never fetches, writes, contacts a
product, or emits task/source bodies.

## Continuity protocol v2

Every non-NONE active task declares
`CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2` in both
`ACTIVE_TASK.md` and `STATE.md`. The checker (`npm run agent:check`) enforces
the cross-file status state machine: COMPLETE tasks have terminal milestone /
WIP / next action / resume recipe, a complete report and completion snapshot,
closed PLAN milestones and no future-value placeholders; BLOCKED tasks have a
real blocker; IN_PROGRESS tasks have a real milestone and next action.
`npm run agent:audit` inventories every task directory (v2 strict, legacy v1
warnings only). Live HEAD is Git authority; a tracked document never predicts
the SHA or CI run of the commit containing itself.

The optional machine check is `npm run agent:check`; documentation remains the
primary protocol and the validator is only a deterministic consistency guard.
New task state records stable anchors: `LAST_VALIDATED_IMPLEMENTATION_SHA`
identifies the validated substantive implementation, and
`LAST_DOCUMENTATION_CHECKPOINT_SHA` is an optional approved descendant. Live
local/remote HEAD is always discovered from Git; it is not a required field in
the file that contains the state. `Current SHA`, `CURRENT_LOCAL_HEAD`,
`CURRENT_REMOTE_HEAD`, and `LAST_PUSHED_SHA` are deprecated historical
compatibility values only and never authority.

The active task's validated implementation anchor is classified as `SYNCED`
when it equals live HEAD with no changes; descendants containing only approved
continuity/documentation state are `CHECKPOINT_ADVANCE`; source/test/config or
unapproved changes are `STALE_IMPLEMENTATION_BASELINE`. A `COMPLETE` task
fails closure on that stale classification. A documentation-only SHA supplied
as the implementation role, or invalid checkpoint ancestry, is a precise
semantic error. The checker never rewrites task state or fetches remote refs.
