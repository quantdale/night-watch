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

Milestone ID: M6
Milestone status: IN_PROGRESS
What is being attempted: registration and UI validation — UI_LANE
registration and inventory digest, UI typecheck/tests/build, root typecheck,
`hardening:check` and `validation:universe`.

## Completed Milestones

- **M5 COMPLETE (R-03)** — the browser lane computes styles for three
  interpolated families in the built bundle: `status-ready` and
  `status-warning` backgrounds are non-transparent and distinct; every drawn
  `rect.graph-node` carries a non-`none` computed stroke (the SVG default is
  `none`, so the tone rule applies); and the `stage-chip` border width
  computes to `1px` (without the rule an element computes no border). The
  lane passes 4/4, including a run in which one earlier full-suite attempt
  hit the documented detached-row race in the 30-decision workflow; that
  workflow passed in isolation (6.2m) and in the repeated full lane (7.3m),
  and no retry was added.
- **M4 COMPLETE (R-02)** — one navigation path now owns the announcement:
  `navigate()` and the `hashchange` listener raise a navigation flag, and an
  effect on the active view sets `document.title` to
  `Nightwatch Control Center — <label>` and, only when the operator
  navigated, focuses the main content region (`tabIndex={-1}`, `ref`). Initial
  load and background refreshes leave focus alone. Two regressions cover nav
  click, hash navigation, title changes, initial-load focus and refresh focus
  preservation. App suite 39 passed.
- **M3 COMPLETE (R-01 all views)** — the harness now covers all sixteen
  contracts: reviewer, source summary/surfaces/graph and system map joined
  the matrix. Two generator defects were found and fixed (generic type
  arguments were unresolved, so `ReviewerElement<TValue>` produced invalid
  strings and crashed the view; named type aliases such as `EpistemicClass`
  were unresolved) and graph fixtures are now internally coherent (edge
  endpoints name real nodes). 32 leaf findings were closed by rendering:
  reviewer member finding ids, local-review authority and per-row verdict
  authority were bound; the source view gained an edge inventory, node
  lifecycle and id, the payload surface id, and an authority-rollups table
  covering every currentness/lifecycle/proof/capability entry; source gap
  reasons are named in the Safety Center; and the system map gained level,
  query, focus and measurement metadata, a node table fallback (kind, fact
  category, evidence, coverage, layer) and an edge inventory. `layer` is no
  longer exempt in either guard because it now renders. UI typecheck PASS;
  full UI suite 61 passed across 5 files; the matrix covers all 16 contracts
  in 21 seconds.
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

Command: `npm --prefix ui/control-center run test -- src/contractRender.test.tsx` with the M3 views
Result: FAIL then PASS
When: 2026-09-10
Relevant failure/output summary: the extended matrix reported 32
unobservable leaves across ReviewerSnapshot, SourceSummarySnapshot,
SourceGraphSnapshot and SystemMapSnapshot. All were rendered (or the
exemption removed where rendering proved it stale); the matrix then passed
3/3 in 21 seconds covering all 16 contracts.

Command: `npm --prefix ui/control-center run test`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 61 passed across 5 files. Three guards fired
first and were repaired rather than bypassed: the placement guard's `layer`
exemption became stale once the system map rendered the column, and two App
assertions named text this milestone changed.

Command: `npm --prefix ui/control-center run test -- src/App.test.tsx`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 39 passed, including the two new
announcement regressions (title and main-content focus after a nav click and
after a hash change; no focus movement on initial load or refresh).

Command: `npm run control-center:ui:browser`
Result: PASS (second run; first run hit a documented race)
When: 2026-09-10
Relevant failure/output summary: 4 passed in 7.3 minutes with the new
computed-style assertions. A first run failed the 30-consecutive-decisions
workflow at finding 8 of 30 with neither a decision nor a refusal; that is the
detached-row race the suite's own comment documents under SSE reconnect
pressure. The workflow passed alone in 6.2 minutes and in the repeated full
lane; no retry was added and no assertion was weakened.

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
- Generic type arguments and named type aliases must be resolved by a fixture
  generator or it produces values the view cannot render: unresolved
  `ReviewerElement<TValue>` produced a string where an object was expected and
  crashed the reviewer view.
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
