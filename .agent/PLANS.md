# Nightwatch Execution Plan Contract

A task plan is a living document, not a one-time proposal. It must stay true
to the implementation and be self-contained enough for a fresh agent to
execute from the working tree without prior conversation. Change a known-wrong
plan and record the reason in its Decision Log.

Every substantial task belongs under `.agent/tasks/<task-id>/` and contains:
`SPEC.md`, `PLAN.md`, `STATE.md`, and `REPORT.md`. `ACTIVE_TASK.md` routes to
the one task currently in progress.

## Required PLAN sections

Each PLAN contains these sections:

- `# <Task title>`
- `## Purpose` — why the change matters and the observable capability after it.
- `## Starting State` — task ID, starting SHA, relevant architecture,
  dependencies, and established facts that must not be rediscovered.
- `## Scope`
- `## Non-Goals`
- `## Safety Constraints`
- `## Architecture / Approach`
- `## Milestones` — each milestone has an objective, files/areas, actions,
  acceptance criteria, exact validation commands where known, and one status:
  `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, or `COMPLETE`.
- `## Validation Strategy`
- `## Decision Log` — date/time when practical, decision, reason, evidence,
  and consequence.
- `## Discoveries`
- `## Deferred Work`
- `## Completion Criteria` — an unambiguous definition of DONE.

## Execution rules

Before implementation, write SPEC/PLAN/STATE and the first checkpoint. For
each milestone, implement → validate → repair → record exact results in STATE
→ advance. Update STATE before a milestone commit and record stable
implementation/documentation anchors at the next checkpoint. Do not write a
field that claims to be the SHA of the commit containing that same field.
`LAST_VALIDATED_IMPLEMENTATION_SHA` and
`LAST_SUBSTANTIVE_CHECKPOINT_SHA` identify the validated substantive baseline;
`LAST_DOCUMENTATION_CHECKPOINT_SHA`, when used, identifies an approved
documentation descendant. Live local and remote HEAD come from Git. The
validator classifies the implementation anchor as `SYNCED` when it equals live
HEAD with no changes, `CHECKPOINT_ADVANCE` when all descendant/worktree changes
are on the explicit continuity/documentation allowlist, and
`STALE_IMPLEMENTATION_BASELINE` when any implementation, source, test, config,
or unapproved path changed. A documentation SHA cannot masquerade as the
implementation role, and a COMPLETE task cannot hide post-baseline source
changes. The validator never rewrites STATE.
Keep STATE concise; move durable history to REPORT or project docs. Never let a
plan preserve a known-wrong assumption for the sake of consistency.
