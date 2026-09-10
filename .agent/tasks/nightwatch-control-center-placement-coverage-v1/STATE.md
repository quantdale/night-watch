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

Milestone ID: M6
Milestone status: IN_PROGRESS
What is being attempted: certification. M1 through M5 are implemented and
locally green — the placement guard, the 16 rendered fields, the paged
truncation disclosure, the source-graph undrawn-edge parity, the placeholder
coverage and the declared-limits card. `gate:local` from this owned session at
the committed implementation checkpoint is the remaining receipt.

## Completed Milestones

- **M5 COMPLETE (P-04, P-05)** — `PlaceholderView` is exported and covered by
  a test that renders the fallback and asserts the view it stands in for; the
  Source Intelligence graph-limits card now quotes the declared
  `maxGraphNodes` / `maxGraphEdges` (`1000 / 2000` in the fixture) instead of
  the hardcoded default `250 / 500`. Both regressions pass.
- **M4 COMPLETE (P-03)** — `SourceGraphCanvas` counts edges whose endpoints are
  outside the projection, the footer reports `drawn of received`, and the
  disclosure callout names the count and attributes it to the projection. The
  source regression now proves `1 of 2 edges` and the disclosure with one
  endpoint-less edge.
- **M3 COMPLETE (P-02)** — `PagedSnapshot` and `PagedCollection` carry
  `truncated`; `usePagedCollection` reads the declared `page.truncated` field;
  `LoadMoreControl` states the server truncation independently of the cursor.
  The regression pages a truncated list to its complete end and asserts the
  statement appears and then disappears.
- **M2 COMPLETE (P-01 repair)** — all 16 measured gaps are closed: service
  identity, declared execution/mutation authority, service status, owner-scope
  status (safety and readiness) and the declared limits render in the Safety
  Center and readiness detail; the execution graph gains an edge inventory
  carrying each edge's proof; Campaign Intelligence renders the declared owner
  scope and each coverage row's gap reasons; source surfaces name their
  repository; the paged `truncated` fields render through M3. `passed` and
  `layer` remain exempt with stated reasons. The placement guard passes with
  exactly those five exemptions.
- **M1 COMPLETE (P-01)** — the placement guard replaces the name-level
  assertion. It derives carriers from component bodies, generic consumers bound
  at the call site and containment access paths; it measures its own extraction
  (33 contracts, 402 fields, 37 components, one deep containment chain); it
  reproduced the 16 measured gaps before the repairs; and two mutations fail
  it — removing `surface.repositoryId` fails on exactly that field, and
  removing the hook's `page.truncated` consumption fails on exactly the four
  paged contracts — while both restores pass.
- **M0 COMPLETE** — execution truth. Owned session
  `nightwatch-control-center-placem-f8abc223` created and claimed as
  `sess-36f4ca096045` on base
  `ceb8fe21f9dd90666190c9272030a0dbfabc458f`; `session:status` verdict PASS
  with all seven invariants PASS; predecessor
  `nightwatch-control-center-ui-completion-v1` re-verified terminal COMPLETE.

## Work In Progress

M6 certification. The implementation and its focused regressions are green;
the implementation checkpoint is committed next, then `gate:local` runs from
this owned session.

## Exact Next Action

Commit the implementation checkpoint from this owned session, run
`npm run gate:local`, and record its exact receipt here before reconciling the
documentation and integrating.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/SPEC.md` | frozen campaign intent | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/PLAN.md` | milestone plan | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `.agent/tasks/nightwatch-control-center-placement-coverage-v1/REPORT.md` | evidence ledger | ADDED |
| `ui/control-center/src/contractCoverage.test.ts` | placement guard | MODIFIED |
| `ui/control-center/src/App.tsx` | 16 fields rendered, paged truncation, source-graph parity, placeholder export, declared limits | MODIFIED |
| `ui/control-center/src/App.test.tsx` | regressions for P-02..P-05 and the new rows | MODIFIED |
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

Command: `npm --prefix ui/control-center run test -- src/contractCoverage.test.ts` before the repairs
Result: FAIL (expected, the guard measures the defect)
When: 2026-09-10
Relevant failure/output summary: exactly the 16 measured gaps, matching the
audit: CampaignCoverageSnapshot.gapReasons/.truncated,
CampaignSummarySnapshot.ownerScopeReason/.ownerScopeStatus,
ExecutionGraphSnapshot.proof, FindingsSnapshot.truncated,
HealthSnapshot.status, MetaSnapshot.executionAuthority/.limits/
.mutationAuthority/.service, ReadinessSnapshot.status,
ReviewerSnapshot.truncated, RunListSnapshot.truncated, SafetySnapshot.status,
SourceSurfaceSnapshot.repositoryId. Three other assertions passed (extraction,
exempt honesty, collision scoping).

Command: mutation of `SourceSurfaceSnapshot.repositoryId` carrier occurrence
Result: FAIL (expected)
When: 2026-09-10
Relevant failure/output summary: replacing `{surface.repositoryId}` with
`{surface.surfaceId}` failed the guard on exactly
`SourceSurfaceSnapshot.repositoryId`; restoring the file passed 4/4.

Command: mutation removing the hook's `page.truncated` consumption
Result: FAIL (expected)
When: 2026-09-10
Relevant failure/output summary: deleting the `truncated` property from
`usePagedCollection`'s return failed the guard on exactly
CampaignCoverageSnapshot, FindingsSnapshot, ReviewerSnapshot and
RunListSnapshot `truncated`; restoring the file passed 4/4. A weaker mutation
that kept the word but changed its role passed, which is the guard's stated
name-level limit.

Command: `npm --prefix ui/control-center run typecheck`, `run test`, `run build`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: typecheck clean; 58 tests across 4 files
passed (up from 55: the placement guard is 4 assertions and App gained two
regressions); build PASS at 3 files / 324,478 bytes with no external
references.

Command: `npm run typecheck` and `node bin/hardening-check.mjs`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: no diagnostics; offline structural invariants
hold.

Command: `npm run validation:universe`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: every discovered test belongs to exactly one
class; UI_LANE=4.

Command: `npm run control-center:ui:browser`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 4 passed / 0 failed in 4.1 minutes, including
the built-bundle qualification, the 30-consecutive-decision review workflow,
and the System Map V2 lane.

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
- The paged list contracts all declare `page.truncated`, and the shared
  collection read only `page.nextCursor`: a server-truncated page and a
  complete page rendered the same "All loaded." state.
- The placement guard is name-scoped inside carriers, by design and by its own
  header: a mutation that renames a property while keeping the word still
  passes. It catches a field that stops reaching its carrier, not a field that
  changes role inside one.

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
