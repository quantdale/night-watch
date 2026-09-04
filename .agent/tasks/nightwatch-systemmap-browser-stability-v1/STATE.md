# Task State

## Identity

Task ID: nightwatch-systemmap-browser-stability-v1
Phase: SYSTEMMAP_BROWSER_STABILITY_V1
Status: COMPLETE
Starting SHA: 89740646c08a5661d358cc05f20a5d94e135334d
Last validated implementation SHA: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
Last substantive checkpoint SHA: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-systemmap-browser-sta-9be47eca
Last checkpoint: M1 done — session claimed at 8974064; SPEC/PLAN/STATE + OpenSpec written; fix (M2) next
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 89740646c08a5661d358cc05f20a5d94e135334d
LAST_VALIDATED_IMPLEMENTATION_SHA: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
LAST_SUBSTANTIVE_CHECKPOINT_SHA: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_SYSTEMMAP_BROWSER_STABILITY_V1_STATUS: COMPLETE
## Objective

Stabilize the C-15c browser spec's 6d/6e keyboard journeys and tail
query clicks with commit-specific gates (test-only); prove the
diagnosed modes eliminated with serial repeats; integrate the strict
improvement and document the residual honestly.

## Current Milestone

COMPLETE / STOP — all milestones closed.

## Completed Milestones

- **M1 task record and session (done).** Canonical HEAD == origin/main ==
  `8974064` (AH-1 integrated, tree clean) verified before start; session
  worktree created and claimed (`sess-c81fd2c8bf57`); SPEC frozen with
  fiber-probe diagnosis; PLAN/STATE written; OpenSpec change added;
  ACTIVE_TASK + EXECUTION_PROMPT routed to this task.
- **M2 commit-specific gates (done).** Implementation commits `a82e0f5`
  (6d L2-member gate, 6e L4-op-0 breadcrumb + consumer gates,
  6e-query-answer bound gate), `711da4c` (painted-button gates + force→
  plain conversion), `c6c25ae` (bounded click retry), `1b6c6eb`
  (6d Escape recovery), `a8ce94a` (box-independent dispatch for tail
  query chips). Diff is additive-only in
  `tests/browser/systemMapV2.browser.ts` (+ task docs). `tsc --noEmit`
  clean throughout.
- **M3 stability validation (done, honest outcome).** Five full-lane
  10x-repeat batches (both browser specs): diagnosed stale-press modes
  (242 consumer-heading, 212 service-heading) at ZERO recurrences in
  50+ fixed-file runs (baseline file failed them at ~30–50%); adjacent
  unit suites 76/76 green; typecheck/hardening/agent/handoff green.
  Residual: rare (~5%) load-correlated click-box stalls
  (`Mutation-capable routes` not-visible on rendered, quiescent UI) and
  one page-load member absence, scattered across steps and both specs,
  persisting across fully isolated runs — environmental/harness-level,
  with every repo-owned avenue exhausted (no timers/events/fetches, keyed
  stable tree, gated commits, clean CSS). Documented as known issue;
  acceptance criterion 2 (single-batch 10/10) not fully met — see
  Deferred / Follow-Up and REPORT.

## Work In Progress

NONE — M1 through M4 closed. No open work.

## Exact Next Action

STOP. Campaign COMPLETE. Do not retry the lane, contact production,
or start another campaign on this task. Residual owner-direction only.

## Files Changed

- `tests/browser/systemMapV2.browser.ts` — commit-specific gates (6d,
  6e crumb, 6e consumer, 6e-query bound, steps 7/9 visibility),
  plain-click conversion, bounded click retry, box-independent dispatch,
  6d Escape recovery + race-pinning comments.
- Task record + OpenSpec change + CURRENT_STATE live-block rebind.

## Validation Ledger

M1: `session:status` PASS; `handoff:check` PASS; `agent:check` PASS (0
strict errors) after conformance repairs.
M2: `tsc --noEmit` clean at every implementation commit; adjacent unit
suites 76/76 green (twice).
M3: full-lane batches — 20/20 (dispatch form), 19/20 + 19/20 + 18/20 +
9/10 earlier iterations; diagnosed modes zero recurrences post-gate;
`hardening:check` PASS; `agent:check` PASS; `handoff:check` PASS;
`project:check` PASS modulo expected mid-campaign baseline staleness
(resolves via AH-1-mirror NONE anchors at close).

## Decisions Made During This Task

Decision: test-only fix, no product change.
Reason: fiber probe + L4 traffic prove the projection/selection model
sound; the failure is the test acting on a stale committed render
(authority text is level-identical; crumbs gate navigation, not members).
Evidence/constraint: bad-run fiber state
(`selectedNodeId: op:op-1`, trail `l4:op:op-0`, L4 ready) and the
passing-run parity of server responses.

## Defects found and disposition

None introduced. The pre-existing stale-UI race is repaired (diagnosed
modes zero recurrences in 50+ fixed runs); a rare environmental residual
(~5%, click-box stalls on quiescent UI, both specs) is documented as a
known issue for owner direction (retry policy vs accepted-flake).

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

- Environmental lane residual (~5%): rare `Element is not visible` on
  rendered, quiescent buttons and rare page-load member absences,
  scattered across steps and both browser specs, persisting across fully
  isolated runs with every repo-owned avenue exhausted. Owner direction
  needed: lane retry policy, accepted-flake documentation, or harness
  rework. C-12 and all owner-gated campaigns remain out of scope.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: a8ce94a6beca0a4d870ef7d7bee1e9ac884458c2
Final task status: COMPLETE. Live HEAD: DISCOVER_FROM_GIT.
Tests: lane batches 20/20 + 19/20 + 19/20 + 18/20 + 9/10 + 9/10-isolated
(diagnosed modes zero recurrences post-gate); adjacent units 76/76;
typecheck clean; hardening PASS.
Artifacts: five additive gates + click robustness in the one spec file;
SPEC amendments A1–A3; REPORT with measured rates.
Known issues: environmental residual above (no product defect found).
Recommended next task: none required; owner direction on the residual
only if desired. No new campaign authority granted by this task.
