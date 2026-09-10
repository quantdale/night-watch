# Task State

STATE — nightwatch-control-center-placement-coverage-v1

## Identity

Task ID: nightwatch-control-center-placement-coverage-v1
Phase: CONTROL_CENTER_PLACEMENT_COVERAGE_V1
Status: COMPLETE
Starting SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
Last validated implementation SHA: 51da8c411dc7ebe0ec2929e456235777e2c009f2
Last substantive checkpoint SHA: 51da8c411dc7ebe0ec2929e456235777e2c009f2
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-placem-f8abc223
Last checkpoint: M6 certification COMPLETE at implementation
`51da8c411dc7ebe0ec2929e456235777e2c009f2`; `gate:local` all eleven groups
PASS at that checkpoint with receipt `receipt:sha256:c3dd3cf51709c4fe02f5ba1f`,
and P-01 through P-05 are CLOSED with acceptance evidence.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: ceb8fe21f9dd90666190c9272030a0dbfabc458f
LAST_VALIDATED_IMPLEMENTATION_SHA: 51da8c411dc7ebe0ec2929e456235777e2c009f2
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 51da8c411dc7ebe0ec2929e456235777e2c009f2
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_PLACEMENT_COVERAGE_V1_STATUS: COMPLETE

## Objective

Make the Control Center contract-coverage guard prove placement instead of
file-level name reachability, close the 16 gaps the stronger guard exposes,
and close the predecessor's deferred paged-truncation, source-graph
undrawn-edge and placeholder-coverage residuals.

## Current Milestone

COMPLETE — M6 closed; the campaign is finished.
Milestone ID: M6
Milestone status: COMPLETE
What is being attempted: NOTHING. The campaign is closed. P-01 through P-05
are CLOSED with acceptance evidence, the placement guard passes with five
reasoned exemptions, and `gate:local` returned all eleven groups PASS from
this owned session with receipt `receipt:sha256:c3dd3cf51709c4fe02f5ba1f`.

## Completed Milestones

- **M6 COMPLETE** — certification at implementation
  `51da8c411dc7ebe0ec2929e456235777e2c009f2`. `gate:local` all eleven groups
  PASS with receipt `receipt:sha256:c3dd3cf51709c4fe02f5ba1f`;
  SEMANTIC_COMPATIBILITY 2083/2070/13/0, OWNER_PROVENANCE 91,
  SYNTHETIC_CAMPAIGN 1797/1797/0 with `deepContainmentLane: PROVEN`. UI
  typecheck, 58 tests and build PASS; root typecheck and `hardening:check`
  PASS; `validation:universe` PASS; browser lane 4 passed / 0 failed. The
  certified checkpoint is integrated by fast-forward from this owned session.
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

NONE.

## Exact Next Action

STOP. The campaign is COMPLETE. Report the certified outcome to the owner.
Integration of the certified checkpoint by fast-forward from the owned session
is the campaign's final act; the post-push verification is `HEAD == origin/main`
discovered from Git. Do not reopen P-01 through P-05.

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

Command: `npm run gate:local` at implementation commit `51da8c4`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: all eleven required groups PASS at
`gitHead 51da8c411dc7ebe0ec2929e456235777e2c009f2`;
SEMANTIC_COMPATIBILITY 2083/2070/13/0, OWNER_PROVENANCE 91,
SYNTHETIC_CAMPAIGN 1797/1797/0 with `deepContainmentLane: PROVEN`;
`finalResult: PASS`; receipt `receipt:sha256:c3dd3cf51709c4fe02f5ba1f`.

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

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: 51da8c411dc7ebe0ec2929e456235777e2c009f2
Live HEAD: DISCOVER_FROM_GIT
Tests: `ui/control-center` typecheck PASS, 58 of 58 tests passed across 4
files (up from 55), build PASS at 3 files / 324,478 bytes with no external
references; root `typecheck` PASS; `hardening:check` PASS;
`validation:universe` PASS with UI_LANE=4; browser workflow lane 4 passed / 0
failed; `gate:local` all eleven groups PASS at `51da8c4` with receipt
`receipt:sha256:c3dd3cf51709c4fe02f5ba1f`.
Artifacts: `ui/control-center/src/{App.tsx,App.test.tsx,contractCoverage.test.ts}`,
`.agent/tasks/nightwatch-control-center-placement-coverage-v1/`,
`openspec/changes/nightwatch-control-center-placement-coverage-v1/`.
Known issues: the placement guard is name-scoped inside a carrier and proves
that a field reaches a component that can receive its contract, not that every
branch draws it; `passed` and `layer` remain reasoned exemptions; external CI
remains `BLOCKED_EXTERNAL` under the predecessor's classification. Integration
of this checkpoint by fast-forward is the campaign's final act.
Recommended next task: none selected; any follow-up requires a new authorized
task.
