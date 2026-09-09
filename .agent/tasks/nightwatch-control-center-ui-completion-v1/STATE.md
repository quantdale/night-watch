# Task State

## Identity

Task ID: nightwatch-control-center-ui-completion-v1
Phase: CONTROL_CENTER_UI_COMPLETION_V1
Status: IN_PROGRESS
Starting SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
Last validated implementation SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
Last substantive checkpoint SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-ui-com-9a04214f
Last checkpoint: M0 through M7 implemented and locally certified in the owned
session; the implementation checkpoint is being committed and `gate:local` has
not yet been run from this session at that checkpoint.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
LAST_VALIDATED_IMPLEMENTATION_SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_UI_COMPLETION_V1_STATUS: IN_PROGRESS

## Objective

Render everything the Control Center UI already fetches, stop presenting a
client-applied bound as completeness, give every rendered class a stylesheet
rule, and install the two mechanical comparisons whose absence let all three
happen.

## Current Milestone

Milestone ID: M8
Milestone status: IN_PROGRESS
What is being attempted: commit the implementation checkpoint from this owned
session, then run `npm run gate:local` at that checkpoint and reconcile task
and project state to its result.

## Completed Milestones

- **M0 COMPLETE** — owned session `nightwatch-control-center-ui-com-9a04214f` created and
  claimed on base `11c9ea62405c5b9b0eddd011fb7083da83348ee7`;
  `npm run session:status` verdict PASS with all seven workspace invariants
  PASS; predecessor re-verified terminal COMPLETE and untouched.
- **M1 COMPLETE (U-01)** — `nodes.slice(0, 24)` and `edges.slice(0, 48)` removed from
  `GraphCanvas`; `layerAssignment` generalized to `LayoutGraph` and shared by
  both canvases; pan, zoom, search, execution-state filter and selection
  added; footer separates nodes drawn from filter matches and edges drawn from
  edges received; server truncation quoted with its bound; undrawn edges
  counted and attributed to the projection. Verified by reintroducing the
  slice: 2 of 3 new graph tests failed, and passed again on restore.
- **M2 COMPLETE (U-02)** — run detail and the run list. Repository provenance with
  dirty-tree state and file count, per-event-type and per-severity censuses,
  screenshot count, browser, ended timestamp, hard-failure count, hard-failure
  and note codes, and timeline truncation with the continuing sequence. Empty
  provenance and empty census state what absence means.
- **M3 COMPLETE (U-03)** — Every safety check listed by name with state and reason
  code; refused operation classes named; auth mode and network posture;
  declared authorization class, findings storage, owner scope and feature
  flags; product readiness. An empty check set renders as absence of evidence.
- **M4 COMPLETE (U-04)** — Approved targets and active-family coverage, currentness
  counts, stale and unavailable targets, compared and drifted campaign keys,
  pinned versus observed analyzer version and their agreement, deferred versus
  never-measured dimensions kept separate, blockers named with detail codes,
  external CI classification, frozen operation count, frozen-marker match.
- **M5 COMPLETE (U-02)** — the remaining surfaces. Surface binding, handler state
  and three capability states; source anchor, evidence digest and exclusion
  reasons; proof-family portfolio, stage/status census, Phase 24 exclusions;
  capability rollup and inventory-digest presence; repository filter; reviewer
  counterevidence, duplicate basis, shared invariant, transition count and
  non-equivalence; system map projection version.
- **M6 COMPLETE (U-05)** — Graph toolbar, search, filter and zoom styles; dimmed,
  selected and neutral node states and dimmed edges; run-detail code chips and
  census columns; `panel-full` for panels carrying tables. `orbit-ring-outer`
  and `safety-grid` were dangling modifiers with no rule and no effect, and
  were removed rather than given invented styles.
- **M7 COMPLETE (U-06)** — `ui/control-center/src/contractCoverage.test.ts` and
  `ui/control-center/src/styles.test.ts` added, each asserting its own
  extraction is non-vacuous and each carrying a reasoned exempt list. Both
  verified to FAIL on a reintroduced defect. Both registered in
  `config/validation-universe.v1.json` UI_LANE with `inventoryDigest`
  advanced from `sha256:b20bde104a58e1e4ed5c128a` to
  `sha256:e6ad9456574d63403ba96436`.

## Work In Progress

The implementation and its local certification are done. What is not done is
the `gate:local` run from this owned session at the committed checkpoint, and
the state/documentation reconciliation to that result.

## Exact Next Action

From `/home/dalepalaca/.nightwatch/worktrees/nightwatch-control-center-ui-com-9a04214f`,
run `npm run gate:local`, then set this file, `.agent/ACTIVE_TASK.md` and
`.agent/EXECUTION_PROMPT.md` to the outcome it reports.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `ui/control-center/src/App.tsx` | U-01 through U-05 rendering | MODIFIED |
| `ui/control-center/src/styles.css` | U-05 missing rules, `panel-full` | MODIFIED |
| `ui/control-center/src/App.test.tsx` | graph, run-detail, safety, readiness regressions | MODIFIED |
| `ui/control-center/src/contractCoverage.test.ts` | U-06 contract coverage guard | ADDED |
| `ui/control-center/src/styles.test.ts` | U-06 stylesheet coverage guard | ADDED |
| `tests/browser/controlCenterBrowser.browser.ts` | built-bundle and computed-style qualification | MODIFIED |
| `config/validation-universe.v1.json` | UI_LANE registration and digest | MODIFIED |
| `openspec/changes/nightwatch-control-center-ui-completion-v1/**` | campaign route | ADDED |
| `.agent/tasks/nightwatch-control-center-ui-completion-v1/**` | task record | ADDED |

## Validation Ledger

Command: `npm --prefix ui/control-center run typecheck`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: no diagnostics.

Command: `npm --prefix ui/control-center run test`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 55 passed across 4 files, up from 41 across 2.

Command: `npm --prefix ui/control-center run build`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 3 built files, 321,234 bytes, no external
references or embedded content.

Command: `npm run typecheck`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: no diagnostics. One earlier failure,
`getComputedStyle` unresolved in the browser test, was fixed by naming the
global through a local structural type rather than widening the root program
with the DOM lib.

Command: `node bin/hardening-check.mjs`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: offline structural invariants hold. Two
earlier failures were the two new suites being undeclared, and then the
validation-universe digest drift; both were closed by registering them in
UI_LANE and advancing `inventoryDigest`.

Command: `npm run control-center:ui:browser`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 4 passed / 0 failed. Includes the new
built-bundle assertions and the computed-style assertion proving the graph
toolbar's rule applies. One earlier failure was a strict-mode locator
violation on a duplicated eyebrow string, fixed with `.first()`.

Command: `npm run session:status`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: verdict PASS, all seven workspace invariants
PASS, canonical clean, this session OWNED_SESSION and live.

Command: `npm run gate:local`
Result: NOT_RUN
When: pending
Relevant failure/output summary: to be run from this session at the committed
implementation checkpoint. Its earlier failures in the canonical checkout were
`STATIC` (the typecheck error above), then `HARDENING` (the two registration
errors above), then `HANDOFF_TRUTH` — which is what this task record exists to
resolve.

## Decisions Made During This Task

Decision: remove the client-side slice rather than raise it.
Reason: any client bound is undisclosed by construction, because `truncated`
reports only on the server's bound.
Evidence/constraint: `CONTROL_CENTER_LIMITS` permits 250/500 by default and
1000/2000 at maximum; the canvas drew 24/48 and printed `Complete`.

Decision: share one layered layout between both graph canvases.
Reason: C-15b fixed this defect on the source graph and the execution graph
kept it. Two copies of a layout are two chances to diverge again.
Evidence/constraint: `layerAssignment` only ever needed node identifiers and
edge endpoints, so a structural `LayoutGraph` type serves both contracts.

Decision: remove `orbit-ring-outer` and `safety-grid` instead of styling them.
Reason: inventing a rule to satisfy a checker changes the design to fit the
check. Both were modifiers whose base class did all the work.
Evidence/constraint: neither appears anywhere in `styles.css`, and removing
them changes no rendered pixel.

Decision: keep `PlaceholderView` although it is now unreachable.
Reason: it is the fail-safe for a view id added to `VIEW_DEFINITIONS` without
a render branch, which is a real future mistake worth catching softly.
Evidence/constraint: every current view id has a branch, so it renders never.

Decision: state the limit of both coverage checks in their own headers.
Reason: a check that implies more than it proves is the same class of defect
it was written to catch.
Evidence/constraint: both are name-level comparisons over `App.tsx`; neither
proves placement or reachability.

Decision: work in an owned session worktree rather than the canonical
checkout, despite the session being configured to work in place.
Reason: AGENTS.md makes stricter repository rules win, and C-00 is
mechanically enforced — `agent:check` refused the canonical route with
`WORKSPACE_CANONICAL_DIRTY_WHILE_SESSION_LIVE`.
Evidence/constraint: the transferred diff was byte-compared against the
canonical working tree before the canonical checkout was restored, and
`session:status` went from FAIL to PASS.

## Discoveries

- `truncated` on a bounded projection answers a question about the server. A
  client that slices afterwards silently invalidates it, and the previous
  canvas then rendered `Complete` from it.
- A UI can pass typecheck, a 41-test component suite and a real-browser
  qualification lane while rendering half of what it fetches. None of those
  compares a contract to a render.
- A className with no stylesheet rule ships a feature that computes correctly
  and shows nothing: the source graph's search and evidence filter recomputed
  `dimmed` on every keystroke and changed no pixel.
- A count is not a name. `safety.checks.length` in a metric card cannot say
  which check is unknown, which is the only question the Safety Center exists
  to answer.
- Registering a new UI suite requires both the UI_LANE file list and a
  refreshed `inventoryDigest`, and the universe discovers tracked files only —
  an untracked new suite reports as
  `VALIDATION_UNIVERSE_DECLARED_MISSING_FILE`.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Both coverage checks are name-level over `App.tsx`. A placement-level check
  — asserting a field renders in the view that owns it — is a larger piece of
  work and is not attempted here.
- The `PlaceholderView` fail-safe has no test, because no reachable view id
  can trigger it.
- The dangling-edge disclosure added to the execution graph applies equally to
  the source graph, which still skips such edges silently. Left unchanged to
  keep this task's diff to its registered findings.

## Resume Recipe

1. Read SPEC.
2. Read PLAN.
3. Inspect `git status` and the current SHA in this session worktree.
4. Run `npm --prefix ui/control-center run test` as the smallest relevant
   validation.
5. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
