# Task State

STATE — nightwatch-control-center-style-and-absence-truth-v1

## Identity

Task ID: nightwatch-control-center-style-and-absence-truth-v1
Phase: CONTROL_CENTER_STYLE_AND_ABSENCE_TRUTH_V1
Status: COMPLETE
Starting SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
Last validated implementation SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Last substantive checkpoint SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-control-center-style--5e5ddb63
Last checkpoint: M5 certification COMPLETE at implementation `88e3c3fb52937ff303b0944cc22cfee624bf807e`;
`gate:local` all eleven groups PASS at that checkpoint with receipt
`receipt:sha256:7945d6ad715fab8479e36d2a`, and a full offline regression
passed 4789 / 18 skipped / 0 failed. A-01 through A-04 are CLOSED with
acceptance evidence.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d904dc96156f8376c772e6c43a75ce8cde3fad04
LAST_VALIDATED_IMPLEMENTATION_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_CONTROL_CENTER_STYLE_AND_ABSENCE_TRUTH_V1_STATUS: COMPLETE

## Objective

Close the last three verification limits the render-truth campaign recorded —
family assertions, runtime class effect, collection absence — and remove the
system map's tone classes and rules that cannot match each other.

## Current Milestone

COMPLETE — M5 closed; the campaign is finished.
Milestone ID: M5
Milestone status: COMPLETE
What is being attempted: NOTHING. The campaign is closed. A-01 through A-04
are CLOSED with acceptance evidence; `gate:local` returned all eleven groups
PASS at implementation `88e3c3fb52937ff303b0944cc22cfee624bf807e` with
receipt `receipt:sha256:7945d6ad715fab8479e36d2a`, and the full offline
regression is 4789 passed / 18 skipped / 0 failed.

## Completed Milestones

- **M5 COMPLETE** — certification at implementation `88e3c3fb52937ff303b0944cc22cfee624bf807e`. `gate:local`
  all eleven groups PASS with receipt
  `receipt:sha256:7945d6ad715fab8479e36d2a`;
  SEMANTIC_COMPATIBILITY 2083/2070/13/0, OWNER_PROVENANCE 91,
  SYNTHETIC_CAMPAIGN 1797/1797/0 with `deepContainmentLane: PROVEN`. Full
  offline regression 4789 passed / 18 skipped / 0 failed in 11.8 minutes.
  Browser lane 4/4. Documentation reconciled; the certified checkpoint is
  integrated by fast-forward from this owned session.
- **M4 COMPLETE** — UI typecheck, 63 tests and build PASS; root `typecheck`
  PASS; `validation:universe` PASS with UI_LANE=5; `hardening:check` PASS
  after bumping the `docs/CURRENT_STATE.md` header to the day its last change
  actually landed.
- **M3 COMPLETE (A-03)** — the fixture generator records every array the
  generated value carries at every depth, and the absence pass empties each
  one and requires a view that can receive the contract to render a different
  DOM. `arrays.length > 20` guards vacuity. Every recorded collection was
  absence-observable, so the exemption list is empty; the staleness check is
  still wired and mutation-proven. Two mutation proofs: disabling array
  recording fails the vacuity assertion ("recorded no arrays"), and a fake
  exemption for the observable `SourceSummarySnapshot.currentness` fails the
  staleness assertion. The source-view activation became tolerant of an empty
  surface page, which is the absence case it must exercise. Harness 3/3 in
  24.8 seconds.
- **M2 COMPLETE (A-02)** — `tests/browser/helpers/classEffect.ts` sweeps every
  class the built composition renders and toggles it off its carrying element
  (element plus up to twelve descendants, so descendant-selector anchors are
  not called inert), comparing the full computed style with and without it.
  Transitions are disabled through a CSSOM `insertRule` on the app's own
  stylesheet — the page's `style-src 'self'` CSP blocks injected `<style>`
  elements, which had silently defeated the earlier guard. Native form
  controls are excluded with a reason: this browser environment forces their
  computed colours (a created button with inline colour, border and
  background computes the theme values). Four classes are declared
  base-only: `status-neutral`, `stage-neutral`, `text-neutral` and
  `graph-node-neutral`. Three real defects were found and fixed:
  `.run-detail-panel` lost the cascade to the later `.panel` rule and now uses
  `.panel.run-detail-panel`; the redundant `.campaign-metrics` class and rule
  (identical to `.metric-grid`) were removed; and the redundant
  `.graph-node-neutral` stroke restatement was removed with the family
  assertion updated. Both browser lanes run the sweep; the full lane passes
  4/4 in 4.9 minutes. Mutation proof: deleting the `.mini-state` rule fails
  the lane with exactly `mini-state`.
- **M1 COMPLETE (A-01, A-04)** — `styles.test.ts` now asserts the
  `status-ready/warning/blocked` and `stage-ready/warning/blocked` concrete
  families and states `status-neutral`/`stage-neutral` as intentionally
  base-only against `.status-pill`/`.stage-chip`; the fragment set was trimmed
  to the prefixes still produced (`graph-node-`, `stage-`, `status-`, `text-`,
  `code-chip-`). The map divergence was confirmed statically: the 13-value
  core `EvidenceStatus` vocabulary cannot lowercase to `proven`, `unproven`,
  `unknown` or `refuted`, so the four `.map-node.node-*` tone rules and the
  `node-${...}`/`edge-${...}` interpolation were removed; `.map-node`,
  `.map-edge` and `.node-selected` remain, and no pixel changes because the
  removed rules never matched. Mutation proof: deleting `.stage-warning` fails
  the family assertion with exactly that class; restoring passes. UI
  typecheck PASS; UI suite 63/63.
- **M0 COMPLETE** — execution truth. Owned session
  `nightwatch-control-center-style--5e5ddb63` created and claimed as
  `sess-d0b803f0afbe` on base
  `d904dc96156f8376c772e6c43a75ce8cde3fad04`; `session:status` verdict PASS
  with all seven invariants PASS; predecessor
  `nightwatch-control-center-render-truth-v1` re-verified terminal COMPLETE.

## Work In Progress

NONE.

## Exact Next Action

STOP. The campaign is COMPLETE. Report the certified outcome to the owner and
integrate the certified checkpoint by fast-forward from the owned session,
verifying `HEAD == origin/main`. Do not reopen A-01 through A-04.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/SPEC.md` | frozen campaign intent | ADDED |
| `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/PLAN.md` | milestone plan | ADDED |
| `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/STATE.md` | continuity v2 execution memory | ADDED |
| `.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/REPORT.md` | evidence ledger | ADDED |
| `openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/audit.md` | live audit at the starting SHA | ADDED |
| `.agent/ACTIVE_TASK.md` | bound to this campaign | MODIFIED |
| `.agent/EXECUTION_PROMPT.md` | campaign handoff at IN_PROGRESS | MODIFIED |

## Validation Ledger

Command: `node bin/nightwatch-session.mjs start --task nightwatch-control-center-style-and-absence-truth-v1`
Result: PASS
When: 2026-09-10
Relevant failure/output summary: `SESSION_WORKTREE_CREATED`
`nightwatch-control-center-style--5e5ddb63` on base `d904dc9`; claim adopt
succeeded as `sess-d0b803f0afbe`.

Command: `node bin/nightwatch-session.mjs status` in the owned worktree
Result: PASS
When: 2026-09-10
Relevant failure/output summary: verdict PASS; all seven workspace invariants
PASS; `class=OWNED_SESSION`, `owned=true`, `drift=false`, `base=CURRENT`.

Command: `npm --prefix ui/control-center run test` after M1
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 63 passed across 5 files with the extended
family assertions and the inert map classes/rules removed.

Command: M1 mutation proof
Result: FAIL then PASS (expected)
When: 2026-09-10
Relevant failure/output summary: removing the `.stage-warning` rule failed the
family assertion with exactly `stage-warning`; restoring the stylesheet passed
3/3.

Command: `npm run control-center:ui:browser` after M2
Result: PASS
When: 2026-09-10
Relevant failure/output summary: 4 passed in 4.9 minutes, including the
computed-effect sweep in `controlCenterBrowser` and `systemMapV2`.

Command: M2 mutation proof
Result: FAIL then PASS (expected)
When: 2026-09-10
Relevant failure/output summary: deleting the `.mini-state` rule failed the
lane with exactly `mini-state` as ineffective; restoring the stylesheet and
rebuilding passed.

Command: `npm --prefix ui/control-center run test -- src/contractRender.test.tsx` after M3
Result: PASS
When: 2026-09-11
Relevant failure/output summary: 3 tests passed in 24.8 seconds; every
recorded collection changes its view's DOM when emptied.

Command: M3 mutation proofs
Result: FAIL then PASS (expected)
When: 2026-09-11
Relevant failure/output summary: (1) disabling array recording failed with
"the generator recorded no arrays; the pass would be vacuous"; (2) a fake
exemption for `SourceSummarySnapshot.currentness` failed with "collection
exemptions are now observable; remove them". Both restored.

Command: `npm --prefix ui/control-center run test`, `run build`
Result: PASS
When: 2026-09-11
Relevant failure/output summary: 63 passed across 5 files; build at 3 files /
330,105 bytes.

Command: `npm run validation:universe`, `npm run typecheck`, `node bin/hardening-check.mjs`
Result: PASS
When: 2026-09-11
Relevant failure/output summary: UI_LANE=5, every discovered test classified;
root typecheck clean; hardening initially failed on the CURRENT_STATE header
date (a real rule), repaired by bumping it to 2026-09-11.

Command: `npm run gate:local` at implementation commit `88e3c3f`
Result: PASS
When: 2026-09-11
Relevant failure/output summary: all eleven required groups PASS at
`gitHead 88e3c3fb52937ff303b0944cc22cfee624bf807e`; receipt
`receipt:sha256:7945d6ad715fab8479e36d2a`; `finalResult: PASS`.

Command: `npm test` full offline regression at the implementation checkpoint
Result: PASS
When: 2026-09-11
Relevant failure/output summary: 4789 passed / 18 skipped / 0 failed in 11.8
minutes — identical to the campaign's starting baseline.

## Decisions Made During This Task

Decision: assert families from their known value sets instead of parsing
interpolations.
Reason: interpolations are not statically parseable; the produced value sets
are explicit in the code.
Evidence/constraint: `status-*` and `stage-*` come from `statusTone`, whose
value set is ready/warning/blocked/neutral.
Consequence: intentional base-only neutral values are stated with reasons.

Decision: resolve the map tone divergence by removal.
Reason: no rule can match any produced value, and inventing a colour taxonomy
is a design decision.
Evidence/constraint: `EVIDENCE_STATUSES` carries 13 values that cannot
lowercase to the four styled ones; no consumer references an `edge-*` class.
Consequence: the map keeps `.map-node`, `.map-edge` and `.node-selected`.

## Discoveries

- The system map's tone classes are inert: the 13-value core evidence
  vocabulary cannot produce the four values its stylesheet rules match.
- `status-neutral` and `stage-neutral` are produced but have no rule; they
  ride the base pill and chip classes.
- The page's CSP (`style-src 'self'`) blocks injected `<style>` elements, so
  a transition guard must use CSSOM `insertRule` on the app's own sheet.
- This browser environment forces computed colours on native form controls:
  a freshly created button with inline `color`, `border` and `background`
  computes the theme values, so button classes cannot be measured at runtime
  and are excluded with that reason.
- `.run-detail-panel`'s intended border colour never applied because the
  later `.panel` rule won the cascade; the specificity fix changes that
  border to the intended slate colour.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- A colour taxonomy for map evidence status is an owner-facing alternative to
  the A-04 removal.
- Whole-stylesheet dead-rule detection remains unperformed.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Live HEAD: DISCOVER_FROM_GIT
Tests: UI typecheck PASS; UI suite 63 passed across 5 files; UI build PASS at
3 files / 330,105 bytes with no external references; root `typecheck` PASS;
`hardening:check` PASS; `validation:universe` PASS with UI_LANE=5; browser
lane 4 passed / 0 failed (4.9 minutes) with the class-effect sweep in both
lanes; `gate:local` all eleven groups PASS at `88e3c3f` with receipt
`receipt:sha256:7945d6ad715fab8479e36d2a`; full offline regression 4789
passed / 18 skipped / 0 failed.
Artifacts: `tests/browser/helpers/classEffect.ts`,
`tests/browser/controlCenterBrowser.browser.ts`,
`tests/browser/systemMapV2.browser.ts`,
`ui/control-center/src/contractRender.test.tsx`,
`ui/control-center/src/styles.test.ts`, `ui/control-center/src/App.tsx`,
`ui/control-center/src/styles.css`,
`.agent/tasks/nightwatch-control-center-style-and-absence-truth-v1/`,
`openspec/changes/nightwatch-control-center-style-and-absence-truth-v1/`.
Known issues: native form controls are excluded from the runtime class-effect
sweep because this browser environment forces their computed colours, so
button classes are covered statically rather than at runtime; the absence
pass proves the DOM changes, not that the message is good; `status-neutral`,
`stage-neutral`, `text-neutral` and `graph-node-neutral` are declared
base-only. `.run-detail-panel` now applies its intended border colour (a real
cascade fix); `.campaign-metrics` and `.graph-node-neutral` were removed as
redundant. External CI remains `BLOCKED_EXTERNAL` under the predecessor's
classification.
Recommended next task: none selected; any follow-up requires a new authorized
task.
