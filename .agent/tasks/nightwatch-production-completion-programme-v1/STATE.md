# Task State

STATE — nightwatch-production-completion-programme-v1

## Identity

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Last substantive checkpoint SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-production-completion-programme-v1
Last checkpoint: planning checkpoint created at `36bd493`; the OpenSpec
change, this task directory and the READY_FOR_EXECUTION handoff are being
committed before the owned session starts.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_PRODUCTION_COMPLETION_PROGRAMME_V1_STATUS: IN_PROGRESS

## Objective

Execute the 21-group production completion programme specified in
`openspec/changes/nightwatch-production-completion-programme-v1/`, closing
every locally closable gap with evidence and recording every owner or
external dependency with its blocking class and next action.

## Current Milestone

Milestone ID: G1
Milestone status: IN_PROGRESS
What is being attempted: planning checkpoint and session open — create the
campaign task record, the routing block and the READY_FOR_EXECUTION handoff,
commit them to `main`, start the owned session worktree, and claim it; then
begin G1.1 baseline recording and the ledger reconciliation.

## Completed Milestones

- None yet. The programme's planning checkpoint was created after the
  predecessor `nightwatch-control-center-style-and-absence-truth-v1` was
  re-verified terminal COMPLETE at `36bd493`.

## Work In Progress

Planning checkpoint files are authored in the canonical checkout and not yet
committed: the OpenSpec programme change, this task directory, and the
rewritten `.agent/EXECUTION_PROMPT.md`. No implementation work has begun.

## Exact Next Action

From the canonical checkout, commit and push the planning checkpoint, then
run `node bin/nightwatch-session.mjs start --task
nightwatch-production-completion-programme-v1`; in the printed worktree run
`node bin/nightwatch-session.mjs claim --task
nightwatch-production-completion-programme-v1 --adopt`, then bind
`.agent/ACTIVE_TASK.md` and this `STATE.md` to the new campaign and begin
G1.1 (record the measured baseline at the starting SHA).

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `openspec/changes/nightwatch-production-completion-programme-v1/**` | the programme specification being executed | UNTRACKED -> TO COMMIT |
| `.agent/tasks/nightwatch-production-completion-programme-v1/SPEC.md` | frozen campaign intent | ADDED |
| `.agent/tasks/nightwatch-production-completion-programme-v1/PLAN.md` | 21-group milestone plan | ADDED |
| `.agent/tasks/nightwatch-production-completion-programme-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `.agent/tasks/nightwatch-production-completion-programme-v1/REPORT.md` | evidence ledger | ADDED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff at READY_FOR_EXECUTION | MODIFIED |

## Validation Ledger

Command: `openspec validate nightwatch-production-completion-programme-v1`
Result: PASS
When: 2026-09-12
Relevant failure/output summary: change is valid.

Command: `npm run session:status` before the planning commit
Result: FAIL
When: 2026-09-12
Relevant failure/output summary:
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE` — caused by the untracked
programme OpenSpec change in the canonical checkout while the foreign
`nightwatch-repository-hardening--e7b9be89` session is live; the planning
checkpoint commit is the repair (canonical becomes clean).

## Decisions Made During This Task

Decision: open the campaign route now (task directory, handoff, commit) and
execute all 21 groups serially from one owned session.
Reason: the OpenSpec change was untracked and unplanned; C-00 forbids
implementation writes in the canonical checkout, and group 1.1 itself
requires the campaign task directory and routing block before baseline.
Evidence/constraint: `npm run handoff:check` returned
`HANDOFF_ACTIVE_CONTINUITY_FAILED`; `session:status` returned FAIL on the
dirty canonical checkout.
Consequence: group statuses are milestones G1–G21 of one continuity-v2 task;
each group is validated and integrated independently.

## Discoveries

- The programme change existed only as untracked files in the canonical
  checkout: no task directory, no routing block, no ready handoff.
- The canonical checkout holds a stale `CANONICAL_MAINTENANCE` claim naming
  `nightwatch-control-center-render-truth-v1`; G6.4 must clear it.

## Blockers

None at the planning checkpoint.

## Safety Events

NONE

## Deferred / Follow-Up

- Owner/organizational decisions named by the programme (CI route, egress
  authorization, `mochi` read access, evidence reclaim, branch deletion,
  provider capability, DEV semantic acceptance, release status naming) remain
  open until the owner records an outcome; they are implemented as records
  and fail-closed gates, never self-authorized.

## Resume Recipe

1. Read `SPEC.md`.
2. Read `PLAN.md`.
3. Inspect `git status`, `git log`, and `npm run session:status`.
4. If the session worktree is not yet created, execute the Exact Next Action
   from the canonical checkout.
5. In the owned session, continue from the first incomplete task group.

## Completion Snapshot

The task is IN_PROGRESS; no completion snapshot exists yet. Nothing in this
record claims completion, and no live HEAD or CI value is stored here.
