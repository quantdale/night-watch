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

The optional machine check is `npm run agent:check`; documentation remains the
primary protocol and the validator is only a deterministic consistency guard.
The active task's `Last validated implementation SHA` is the baseline: exact
HEAD with no changes is `SYNCED`; descendants containing only approved
continuity/documentation state are `CHECKPOINT_ADVANCE`; any source/test/config
or unapproved change is `STALE`. The checker never rewrites task state.
