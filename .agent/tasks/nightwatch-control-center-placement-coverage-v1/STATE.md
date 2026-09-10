# Task State

STATE — nightwatch-control-center-placement-coverage-v1

## Identity

Task ID: nightwatch-control-center-placement-coverage-v1
Phase: CONTROL_CENTER_PLACEMENT_COVERAGE_V1
Status: IN_PROGRESS
Starting SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Last validated implementation SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Last substantive checkpoint SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-placem-f8abc223
Last checkpoint: M0 execution truth COMPLETE; the owned session
`nightwatch-control-center-placem-f8abc223` is claimed as
`sess-36f4ca096045` on base
`ceb8fe21f9dd90666190c9272030a0dbfabc458f`, `session:status` verdict PASS
with all seven workspace invariants PASS, and the predecessor is verified
terminal COMPLETE and untouched.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LAST_VALIDATED_IMPLEMENTATION_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_PLACEMENT_COVERAGE_V1_STATUS: IN_PROGRESS

## Objective

Make the Control Center contract-coverage guard prove placement instead of
file-level name reachability, close the 16 gaps the stronger guard exposes,
and close the predecessor's deferred paged-truncation, source-graph
undrawn-edge and placeholder-coverage residuals.

## Current Milestone

Milestone ID: M1
Milestone status: IN_PROGRESS
What is being attempted: replace the name-level assertion in
`ui/control-center/src/contractCoverage.test.ts` with the carrier model
described in `PLAN.md`, and run it to reproduce the measured 16 gaps.

## Completed Milestones

- **M0 COMPLETE** — execution truth. Owned session
  `nightwatch-control-center-placem-f8abc223` created and claimed as
  `sess-36f4ca096045` on base
  `ceb8fe21f9dd90666190c9272030a0dbfabc458f`; `session:status` verdict PASS
  with all seven invariants PASS; predecessor
  `nightwatch-control-center-ui-completion-v1` re-verified terminal COMPLETE.

## Work In Progress

M1. The planning route (SPEC, PLAN, STATE, REPORT, the OpenSpec change and the
bound `.agent/ACTIVE_TASK.md` / `.agent/EXECUTION_PROMPT.md`) is written and
about to be committed as the M0/registration checkpoint.

## Exact Next Action

Implement the placement guard in
`ui/control-center/src/contractCoverage.test.ts`, run
`npm --prefix ui/control-center run test -- contractCoverage`, and record the
measured failing set in this STATE before repairing any field.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/SPEC.md` | frozen campaign intent | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/PLAN.md` | milestone plan | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/REPORT.md` | evidence ledger | ADDED |
| `openspec/changes/nightwatch-control-center-placement-coverage-v1/audit.md` | live audit at the starting SHA | ADDED |
| `.agent/ACTIVE_TASK.md` | bound to this campaign | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff at IN_PROGRESS | MODIFIED |

## Validation Ledger

Command: `node bin/nightwatch-session.mjs start --task nightwatch-control-center-placement-coverage-v1`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: `SESSION_WORKTREE_CREATED`
`nightwatch-control-center-placem-f8abc223` on base `ceb8fe2`; claim adopt
succeeded as `sess-36f4ca096045`.

Command: `node bin/nightwatch-session.mjs status` in the owned worktree
Result: PASS
When: 2026-09-10
Relevant failure/output summary: verdict PASS; all seven workspace invariants
PASS; `class=OWNED_SESSION`, `owned=true`, `drift=false`, `base=CURRENT`.

Command: `git rev-parse HEAD origin/main` at the starting SHA
Result: PASS
When: 2026-09-10
Relevant failure/output summary: both `ceb8fe21f9dd90666190c9272030a0dbfabc458f`.

## Decisions Made During This Task

Decision: derive carriage mechanically instead of declaring a
contract-to-view map.
Reason: a declared map is a second authority that can drift from the code.
Evidence/constraint: `usePagedCollection<RunListSnapshot, …>` binds the
generic consumer at the call site, so paged fields stay mechanically tied to
the views that own the list.
Consequence: the guard resolves generic callees and containment access paths.

Decision: render the paged `truncated` rather than exempt it.
Reason: it is the server's answer about the server's own bound.
Evidence/constraint: `boundedCollection` derives `truncated` as "more remain
after this page"; the client read only `nextCursor`.
Consequence: `PagedSnapshot`, `PagedCollection` and `LoadMoreControl` change.

## Discoveries

- The name-level guard passes `RunListItemSnapshot.passed` only because the
  Safety Center contains the sentence "A route that is off is not a route that
  passed." The field reaches no render path.
- The placement model measured 16 unrendered fields inside their contracts'
  carriers and 5 deliberate non-renders, at the starting SHA.
- The Source Intelligence metric card states `250 / 500` as the graph
  "nodes / edges maximum"; those are the server's defaults and the declared
  maximums are `1000 / 2000`.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Conditionally reachable rendering is still not proven by a name-level
  carrier check; the guard states that limit.
- The stylesheet guard remains class-to-rule.

## Resume Recipe

Read `SPEC.md`, `PLAN.md` and this file; work in the owned worktree
`nightwatch-control-center-placem-f8abc223`; resume at the Exact Next Action,
run the named focused suites after each change, and record exact results here
before advancing a milestone.

## Completion Snapshot

Pending. The campaign is IN_PROGRESS; the completion snapshot is filled and
verified at M6 closure against the certified checkpoint's own receipts.
