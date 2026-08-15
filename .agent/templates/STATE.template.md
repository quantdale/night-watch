# Task State

## Identity

Task ID: <task-id>
Phase: <phase>
Status: IN_PROGRESS
Starting SHA: <sha>
Last validated implementation SHA: <sha>
Last substantive checkpoint SHA: <sha>
Last documentation checkpoint SHA: <sha or optional>
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: <branch>
Last checkpoint: <timestamp and fact>
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: <same stable task starting anchor>
LAST_VALIDATED_IMPLEMENTATION_SHA: <stable substantive implementation anchor>
LAST_SUBSTANTIVE_CHECKPOINT_SHA: <same anchor unless documented otherwise>
LAST_DOCUMENTATION_CHECKPOINT_SHA: <optional stable documentation descendant>
LIVE_HEAD_AUTHORITY: GIT

<!--
Continuity protocol v2 closure semantics (enforced by npm run agent:check /
agent:audit for v2 tasks):

- The task STATUS vocabulary is NONE / IN_PROGRESS / BLOCKED / COMPLETE.
  If the repository convention declares PHASE_<TOKEN>_STATUS, its value must
  normalize to the same status.
- COMPLETE means: ACTIVE/STATE/REPORT statuses agree; current milestone and
  next action are terminal (e.g. "COMPLETE / STOP", "STOP"); Work In Progress
  is NONE; Resume Recipe does not instruct resuming milestones; Completion
  Snapshot contains real evidence; PLAN ## Milestones has no PENDING /
  IN_PROGRESS / NOT_STARTED / unchecked items; no future-value placeholders
  such as "(filled at close)" / "(filled after push)" appear in live/final
  fields.
- BLOCKED means actually blocked: ## Blockers is non-empty and Exact Next
  Action is STOP or a concrete unblock condition.
- IN_PROGRESS means actually active: real Current Milestone and concrete
  Exact Next Action; the Completion Snapshot must not claim completion.
- Record only SHAs/CI run IDs already known before this document is
  committed. Live HEAD: DISCOVER_FROM_GIT. Never write
  "Final SHA: <fill after push>"-style placeholders into a completed record.
-->

## Objective

<One short paragraph.>

## Current Milestone

Milestone ID: <milestone>
Milestone status: IN_PROGRESS
What is being attempted: <concrete work>

## Completed Milestones

- <Milestone result, files, validation command, exact result.>

## Work In Progress

<Exactly what is partial; avoid vague diary language.>

## Exact Next Action

<One concrete action a fresh agent can perform immediately.>

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `<path>` | <reason> | <status> |

## Validation Ledger

Command: `<command>`
Result: <PASS/FAIL>
When: <timestamp>
Relevant failure/output summary: <short summary>

## Decisions Made During This Task

Decision: <...>
Reason: <...>
Evidence/constraint: <...>

## Discoveries

- <New fact.>

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- <Out-of-scope follow-up.>

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA.
4. Run the smallest relevant validation.
5. Continue Exact Next Action.

When the task is COMPLETE, rewrite this section to a terminal form, e.g.:
"Task complete. Do not resume; any follow-up starts as a new authorized
task."

## Completion Snapshot

Populate only when complete — with real evidence, never placeholders:

Final substantive checkpoint: <stable implementation SHA, known before commit>
Final documentation checkpoint: <optional stable documentation SHA, known before commit>
Live HEAD: DISCOVER_FROM_GIT
Tests: <exact results>
Artifacts: <files>
Known issues: <...>
Recommended next task: <...>
