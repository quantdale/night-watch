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

STARTING_SHA: <same stable task starting anchor>
LAST_VALIDATED_IMPLEMENTATION_SHA: <stable substantive implementation anchor>
LAST_SUBSTANTIVE_CHECKPOINT_SHA: <same anchor unless documented otherwise>
LAST_DOCUMENTATION_CHECKPOINT_SHA: <optional stable documentation descendant>
LIVE_HEAD_AUTHORITY: GIT

## Objective

<One short paragraph.>

## Current Milestone

Milestone ID: <milestone>
Status: IN_PROGRESS
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

## Completion Snapshot

Populate only when complete:

Final substantive checkpoint: <stable implementation SHA>
Final documentation checkpoint: <optional stable documentation SHA>
Live HEAD: DISCOVER_FROM_GIT
Tests: <exact results>
Artifacts: <files>
Known issues: <...>
Recommended next task: <...>
