# Task State

STATE — nightwatch-control-center-render-truth-v1

## Identity

Task ID: nightwatch-control-center-render-truth-v1
Phase: CONTROL_CENTER_RENDER_TRUTH_V1
Status: IN_PROGRESS
Starting SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Last validated implementation SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Last substantive checkpoint SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-render-287b0e00
Last checkpoint: M0 execution truth COMPLETE; the owned session
`nightwatch-control-center-render-287b0e00` is claimed as
`sess-390d800d5900` on base
`f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`, `session:status` verdict PASS,
and the predecessor is verified terminal COMPLETE and untouched.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LAST_VALIDATED_IMPLEMENTATION_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LAST_SUBSTANTIVE_CHECKPOINT_SHA: f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_RENDER_TRUTH_V1_STATUS: IN_PROGRESS

## Objective

Prove the Control Center's rendered DOM is the contract it claims: every
non-exempt contract leaf observably affects the DOM of the view that owns it;
view changes announce themselves to keyboard and assistive-technology
operators; and dynamic style classes apply in the built bundle.

## Current Milestone

Milestone ID: M3
Milestone status: IN_PROGRESS
What is being attempted: extend the harness to the reviewer, source
surfaces/graph and system map views, and close every field they expose.

## Completed Milestones

- **M2 COMPLETE (R-01 views)** — the harness now covers the runs list
  (`RunListSnapshot`), run detail (`RunDetailSnapshot`), timeline
  (`TimelineSnapshot`), execution graph, campaigns (summary and coverage) and
  findings, with the run-selection flow driving detail and graph. It exposed
  16 leaf findings and all were closed: the run list now renders `product`,
  `endedAt`, `durationMs` and `nightwatchSha`; run detail takes its identity
  from the payload (`detail.run.runId`); the timeline renders event
  `dataCodes` by value and surfaces a payload/selection identity mismatch;
  the execution-graph node inventory shows `nodeId` beside the label and a
  `reasonCode` column; campaigns render `executionOnly`, name `blockerCodes`
  and `reasonCodes`, show the coverage row `memberId` and render stage
  `reasonCodes`. `passed` is exempt by suffix as the boolean projection of
  `status`. UI typecheck PASS; full UI suite 61 passed across 5 files; harness
  matrix 11 seconds.
- **M1 COMPLETE (R-01 core)** — the harness exists at
  `ui/control-center/src/contractRender.test.tsx`: a TypeScript-AST fixture
  generator (fails closed on unknown shapes), a differential DOM runner that
  flips one leaf at a time and compares `document.body.innerHTML`, a reasoned
  exempt list, and the Overview/Safety views. It measured 34 interfaces, 16
  covered contracts, and more than 300 generated leaves; the covered
  assertion runs over 62 Health/Meta/Readiness/Safety leaves. Four genuinely
  unbound constant fields were exposed and fixed: `HealthSnapshot.readOnly`
  now bounds the Overview read-only posture (previously only meta's was
  read), and `MetaSnapshot.scope`, `MetaSnapshot.productContact` and
  `ReadinessSnapshot.ownerScope.reason` now render in their owning panels.
  `HealthSnapshot.scope` and `SafetySnapshot.scope` remain exempt as
  single-value constants asserted by the fixed loopback posture label. The
  mutation proof passed: removing the readiness owner-scope reason row fails
  the harness on exactly `ReadinessSnapshot.ownerScope.reason`, and restoring
  it passes. UI typecheck PASS; full UI suite 61 passed across 5 files.
- **M0 COMPLETE** — execution truth. Owned session
  `nightwatch-control-center-render-287b0e00` created and claimed as
  `sess-390d800d5900` on base
  `f0180d1f58d4ab1a1e7e8e226554cf0564ad7f16`; `session:status` verdict PASS
  with all seven invariants PASS; predecessor
  `nightwatch-control-center-placement-coverage-v1` re-verified terminal
  COMPLETE. A feasibility probe outside the tracked tree built the generator
  and differential runner and measured 137 observable Overview leaves in 4.8
  seconds; the probe is preserved under `/tmp/opencode/` and is not part of
  the repository.

## Work In Progress

M1. The planning route (SPEC, PLAN, STATE, REPORT, the OpenSpec change and the
bound `.agent/ACTIVE_TASK.md` / `.agent/EXECUTION_PROMPT.md`) is written and
about to be committed as the M0/registration checkpoint.

## Exact Next Action

Implement the harness core in
`ui/control-center/src/contractRender.test.tsx` for the Overview/Safety
family, run `npm --prefix ui/control-center run test -- contractRender`, and
record the measured observability results in this STATE.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-control-center-render-truth-v1/SPEC.md` | frozen campaign intent | ADDED |
| `.agent/tasks/nightwatch-control-center-render-truth-v1/PLAN.md` | milestone plan | ADDED |
| `.agent/tasks/nightwatch-control-center-render-truth-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `.agent/tasks/nightwatch-control-center-render-truth-v1/REPORT.md` | evidence ledger | ADDED |
| `openspec/changes/nightwatch-control-center-render-truth-v1/audit.md` | live audit at the starting SHA | ADDED |
| `.agent/ACTIVE_TASK.md` | bound to this campaign | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff at IN_PROGRESS | MODIFIED |

## Validation Ledger

Command: `node bin/nightwatch-session.mjs start --task nightwatch-control-center-render-truth-v1`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: `SESSION_WORKTREE_CREATED`
`nightwatch-control-center-render-287b0e00` on base `f0180d1`; claim adopt
succeeded as `sess-390d800d5900`.

Command: `node bin/nightwatch-session.mjs status` in the owned worktree
Result: PASS
When: 2026-09-10
Relevant failure/output summary: verdict PASS; all seven workspace invariants
PASS; `class=OWNED_SESSION`, `owned=true`, `drift=false`, `base=CURRENT`.

Command: feasibility probe of the differential render harness (untracked)
Result: PASS
When: 2026-09-10
Relevant failure/output summary: TS-AST generator extracted 34 interfaces and
213 Overview-family leaves; 137 leaves were each flipped and the DOM changed
for all 137 in 4.76 seconds; base HTML 14,438 bytes.

Command: `npm test` full offline regression at the starting state
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 4789 passed / 18 skipped / 0 failed in 16.4
minutes.

Command: `npm --prefix ui/control-center run test -- src/contractRender.test.tsx`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 3 tests passed in 5.4 seconds — generator
non-vacuity, deterministic re-render (identical fixtures produce identical
DOM), and the covered observability matrix.

Command: M1 mutation proof
Result: FAIL then PASS (expected)
When: 2026-09-10
Relevant failure/output summary: removing the
`ReadinessSnapshot.ownerScope.reason` row failed the harness on exactly that
key; restoring the file passed 3/3.

Command: `npm --prefix ui/control-center run test`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 61 passed across 5 files (up from 58 across
4).

Command: M1 field findings from the differential harness
Result: 4 fields rendered, 2 exempted
When: 2026-09-10
Relevant failure/output summary: before the repairs the harness reported
`HealthSnapshot.readOnly`, `MetaSnapshot.scope`, `MetaSnapshot.productContact`
and `ReadinessSnapshot.ownerScope.reason` unobservable; each was rendered in
its owning view. `HealthSnapshot.scope` and `SafetySnapshot.scope` are
single-value constants asserted by a fixed posture label.

Command: `npm --prefix ui/control-center run test -- src/contractRender.test.tsx` after the M2 views
Result: FAIL then PASS
When: 2026-09-10
Relevant failure/output summary: the extended matrix reported 16 unobservable
leaves across RunListSnapshot, RunDetailSnapshot, TimelineSnapshot,
ExecutionGraphSnapshot, CampaignSummarySnapshot, CampaignCoverageSnapshot and
FindingsSnapshot. Each was rendered or exempted; the matrix then passed 3/3 in
11 seconds.

Command: `npm --prefix ui/control-center run test`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 61 passed across 5 files after the M2
rendering repairs.

## Decisions Made During This Task

Decision: generate fixtures from the declared TypeScript AST instead of
hand-writing them.
Reason: hand-written fixtures drift from the contracts and silently skip new
fields.
Evidence/constraint: the probe generated 213 leaves across the Overview
family and rendered them after date-shaped strings became valid ISO values.
Consequence: the generator fails closed on an unresolvable shape.

Decision: prove observability by differential DOM comparison.
Reason: sentinel presence misses values that pass through formatters or
presence indicators.
Evidence/constraint: all 137 probed Overview leaves were observable under
differential comparison.
Consequence: one small render per leaf; the matrix is bounded.

## Discoveries

- The differential harness found four constant fields the placement guard
  could not distinguish: `HealthSnapshot.readOnly`, `MetaSnapshot.scope`,
  `MetaSnapshot.productContact` and `ReadinessSnapshot.ownerScope.reason`
  were declared, fetched, and bound to no render; their names appeared
  elsewhere in the same carrier components (`readOnly`, `scope`,
  `productContact`, `reason`), so the static guard passed.
- `App.tsx` contains no `focus()` call and no `document.title` assignment:
  view changes are silent to assistive technology and the window title is
  stale after navigation.
- The API layer validates `schemaVersion` per contract before the UI sees a
  snapshot, so no harness can flip that field and observe a normal view.
- The stylesheet guard proves rules exist; only one class
  (`.graph-controls`) has a computed-style assertion in the browser lane.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Visual correctness and layout remain unproven.
- Conditional branches a maximally revealing fixture does not take stay
  unproven; the exempt list records them.

## Resume Recipe

Read `SPEC.md`, `PLAN.md` and this file; work in the owned worktree
`nightwatch-control-center-render-287b0e00`; resume at the Exact Next Action,
run the named focused suites after each change, and record exact results here
before advancing a milestone.

## Completion Snapshot

Pending. The campaign is IN_PROGRESS; the completion snapshot is filled and
verified at M7 closure against the certified checkpoint's own receipts.
