# Task State

## Identity

Task ID: nightwatch-systemmap-browser-stability-v1
Phase: SYSTEMMAP_BROWSER_STABILITY_V1
Status: IN_PROGRESS
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last validated implementation SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last substantive checkpoint SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-systemmap-browser-sta-9be47eca
Last checkpoint: M1 done — session claimed at 8974064; SPEC/PLAN/STATE + OpenSpec written; fix (M2) next
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_VALIDATED_IMPLEMENTATION_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_SYSTEMMAP_BROWSER_STABILITY_V1_STATUS: IN_PROGRESS

## Objective

Stabilize the C-15c browser spec's 6d/6e keyboard journeys with
member-readiness gates (test-only); prove 10/10 serial repeats; integrate.

## Current Milestone

M2 — Member-readiness gates (IN_PROGRESS).

## Completed Milestones

- **M1 task record and session (done).** Canonical HEAD == origin/main ==
  `8974064` (AH-1 integrated, tree clean) verified before start; session
  worktree created and claimed (`sess-c81fd2c8bf57`); SPEC frozen with
  fiber-probe diagnosis; PLAN/STATE written; OpenSpec change added;
  ACTIVE_TASK + EXECUTION_PROMPT routed to this task.

## Work In Progress

M2 edits to `tests/browser/systemMapV2.browser.ts` (two additive gates).

## Exact Next Action

Apply the 6d L2-member gate and the 6e L4-op-0 gates in the worktree,
then run typecheck and the browser lane.

## Files Changed

None yet (task record only, this checkpoint).

## Validation Ledger

M1: `session:status` PASS (lease-free; canonical safe; attention 0).
`handoff:check` to be run after routing files land.

## Decisions Made During This Task

Decision: test-only fix, no product change.
Reason: fiber probe + L4 traffic prove the projection/selection model
sound; the failure is the test acting on a stale committed render
(authority text is level-identical; crumbs gate navigation, not members).
Evidence/constraint: bad-run fiber state
(`selectedNodeId: op:op-1`, trail `l4:op:op-0`, L4 ready) and the
passing-run parity of server responses.

## Defects found and disposition

None introduced. Target defect is the pre-existing stale-UI race in the
browser spec (intermittent, diagnosed, fix pending in M2).

## Discoveries

- `map-authority` footer text is identical across levels/views, so it
  cannot gate level navigation (the exact hole at line 240).
- L3 sorts nodes by id with a 256 cap; positional arrows from a stale
  selection resolve to `op:op-1`, which then falls outside the L4 view.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

None. C-12 and all owner-gated campaigns remain out of scope.

## Resume Recipe

Continue at M2: apply the two gate edits, typecheck, browser repeats.

## Completion Snapshot

Not complete. No snapshot until M4.
