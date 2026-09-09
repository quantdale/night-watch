# Task State

## Identity

Task ID: nightwatch-control-center-ui-completion-v1
Phase: CONTROL_CENTER_UI_COMPLETION_V1
Status: COMPLETE
Starting SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
Last validated implementation SHA: 9b30e27af075ea3a62c463475388933ebe3dca9e
Last substantive checkpoint SHA: 9b30e27af075ea3a62c463475388933ebe3dca9e
Last documentation checkpoint SHA: fa5bef068a157df520934b811048e9300f597b81
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-ui-com-9a04214f
Last checkpoint: M8 certification COMPLETE at implementation
`9b30e27af075ea3a62c463475388933ebe3dca9e`; `gate:local` returned all eleven
groups PASS from this owned session at documentation descendant
`fa5bef068a157df520934b811048e9300f597b81` with receipt
`receipt:sha256:8f5e1452a0a909c6721ce272`, and U-01 through U-06 are CLOSED
with acceptance evidence.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 11c9ea62405c5b9b0eddd011fb7083da83348ee7
LAST_VALIDATED_IMPLEMENTATION_SHA: 9b30e27af075ea3a62c463475388933ebe3dca9e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9b30e27af075ea3a62c463475388933ebe3dca9e
LAST_DOCUMENTATION_CHECKPOINT_SHA: fa5bef068a157df520934b811048e9300f597b81
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_UI_COMPLETION_V1_STATUS: COMPLETE

## Objective

Render everything the Control Center UI already fetches, stop presenting a
client-applied bound as completeness, give every rendered class a stylesheet
rule, and install the two mechanical comparisons whose absence let all three
happen.

## Current Milestone

COMPLETE — M8 closed; the campaign is finished.
Milestone ID: M8
Milestone status: COMPLETE
What is being attempted: NOTHING. The campaign is closed. All six findings
U-01 through U-06 are CLOSED with acceptance evidence, every contract field
the UI fetches either renders or is exempt with a stated reason, every
rendered class has a stylesheet rule, and no client-applied bound is presented
as completeness.

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

NONE.

## Exact Next Action

STOP. Hold at this checkpoint and report the certified outcome to the owner.
Integration to `origin main` is an owner decision and has not been performed;
the certified checkpoint sits on
`session/nightwatch-control-center-ui-com-9a04214f`.

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

Command: `npm run campaign:synthetic`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: 1797 of 1797 passed, 0 failed,
`deepContainmentLane` PROVEN. The preceding run was 1796/1797: the single
failure was `tests/unit/nw07ContinuityCoherence.test.ts:80`, which reads
whichever task `ACTIVE_TASK.md` points at and requires each milestone STATE
calls COMPLETE to carry a `- **Status:** COMPLETE` line in PLAN. This task's
records used their own format, so the extraction matched nothing and the
test's anti-vacuity assertion fired. Corrected at `fa5bef0`.

Command: `npm run gate:local`
Result: PASS
When: 2026-09-09
Relevant failure/output summary: all eleven groups PASS at
`fa5bef068a157df520934b811048e9300f597b81`, receipt
`receipt:sha256:8f5e1452a0a909c6721ce272`. Three earlier runs from the
canonical checkout stopped at `STATIC`, then `HARDENING`, then
`HANDOFF_TRUTH`; a fourth from this session stopped at `SYNTHETIC_CAMPAIGN`.
Each failure and its cause is recorded above rather than smoothed over.

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

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: 9b30e27af075ea3a62c463475388933ebe3dca9e
Final documentation checkpoint: fa5bef068a157df520934b811048e9300f597b81
Live HEAD: DISCOVER_FROM_GIT
Tests: `ui/control-center` typecheck PASS and 55 of 55 passed across 4 files,
up from 41 across 2; `ui/control-center` build PASS at 321,234 bytes; root
`typecheck` PASS; `hardening:check` PASS; `campaign:synthetic` 1797 of 1797
passed with `deepContainmentLane` PROVEN; browser workflow lane 4 passed / 0
failed; `gate:local` all eleven groups PASS with receipt
`receipt:sha256:8f5e1452a0a909c6721ce272`.
Artifacts: `ui/control-center/src/{App.tsx,styles.css,App.test.tsx}`,
`ui/control-center/src/{contractCoverage,styles}.test.ts`,
`tests/browser/controlCenterBrowser.browser.ts`,
`config/validation-universe.v1.json`,
`openspec/changes/nightwatch-control-center-ui-completion-v1/`,
`.agent/tasks/nightwatch-control-center-ui-completion-v1/`.
Known issues: both coverage guards are name-level over `App.tsx` and prove a
field or class reaches the file, not its placement or visual correctness. The
browser lane's computed-style assertion covers one class. The source graph
still skips endpoint-less edges silently where the execution graph now
discloses them. This checkpoint has NOT been pushed; integration to
`origin main` remains an owner decision.
Recommended next task: a placement-level coverage check, asserting each
contract field renders in the view that owns it.
