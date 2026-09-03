# Task State

## Identity

Task ID: nightwatch-system-map-v2-c15b-v1
Phase: SYSTEM_MAP_V2_C15B_V1
Status: IN_PROGRESS
Starting SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last validated implementation SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Last substantive checkpoint SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-system-map-v2-c15b-v1-19d4f1bd
Last checkpoint: M1 opened at the C-04 closure head 9ac83be with the 24-node UI ceiling and the 1,000-node contract maximum measured before any change
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_VALIDATED_IMPLEMENTATION_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9ac83bebbeb9ed747ff4a55e84701c4b95a1c692
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Rebuild the source-graph projection model and view so Nightwatch exposes whole
system topology and evidence status at the scale its contracts already permit,
with every node and edge carrying exactly one fact category and every
projection reporting exactly what it dropped.

## Current Milestone

Milestone ID: M1 — task record, OpenSpec change, measured baseline
Milestone status: IN_PROGRESS
What is being attempted: SPEC and PLAN are written; the OpenSpec change and the
`agent:check` / `handoff:check` pair remain.

## Completed Milestones

- None yet. M1 is the first.

## Work In Progress

M1. SPEC.md and PLAN.md are written. No source module and no test exists yet.

## Exact Next Action

Write the OpenSpec change
`openspec/changes/nightwatch-system-map-v2-c15b-v1/`, route
`.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md` to this campaign, run
`agent:check` and `handoff:check`, and commit the M1 checkpoint.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/SPEC.md` | frozen intent, measured baseline | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/PLAN.md` | living plan, eight milestones | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/STATE.md` | this waypoint | WRITTEN |
| `.agent/tasks/nightwatch-system-map-v2-c15b-v1/REPORT.md` | requirement ledger skeleton | WRITTEN |

## Validation Ledger

Command: `nightwatch-session.mjs start` / `claim`
Result: PASS
When: 2026-09-03
Relevant failure/output summary: C-04 released; canonical clean at 9ac83be;
session `sess-0bd97f5978bf` claimed.

Command: measured the C-15b baseline
Result: recorded
When: 2026-09-03
Relevant failure/output summary: discovery 5,826 ms for 1,745 operations and
1,745 surfaces; serialising 250 surfaces takes 4 ms and 1,205,421 bytes;
contract maxima 1,000 nodes / 2,000 edges at default depth 1; the UI draws at
most 24 nodes and 48 edges.

## Decisions Made During This Task

Decision: measure before changing the view.
Reason: §61 forbids claiming an improvement without numbers, and the baseline
is also what shows the defect is a view limit rather than a contract limit.
Evidence/constraint: contract 1,000 nodes against a 24-node `slice`.

## Discoveries

- The 24-node ceiling is two hard-coded `slice` calls and a modulo-3 grid in
  `SourceGraphCanvas`, not a rendering constraint. The contract was never what
  limited the operator.
- The graph contract carries `truncated: boolean` and no counts, so it cannot
  say how much was dropped — the defect C-01 fixed for operations and which the
  graph never received.
- Graph nodes and edges carry proof, currentness, lifecycle and capability but
  no FACT CATEGORY, so there is currently nowhere to record that an edge is a
  SOURCE_FACT rather than an INFERENCE.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- EIG prioritisation and G-16 ownership: planning-only reconciliation, no
  implementation.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect git status and current SHA in the session worktree.
4. Run the smallest relevant validation.
5. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
