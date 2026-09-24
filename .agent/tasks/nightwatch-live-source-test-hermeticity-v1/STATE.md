# Task State

## Identity

Task ID: nightwatch-live-source-test-hermeticity-v1
Phase: LIVE_SOURCE_TEST_HERMETICITY_V1
Status: COMPLETE
Starting SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
Last validated implementation SHA: b48604bec084b0ab3c6a7dd89c3eef6f8b82b575
Last substantive checkpoint SHA: b48604bec084b0ab3c6a7dd89c3eef6f8b82b575
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-successor-campaign-en-628d8bb9
Last checkpoint: 2026-09-25 — implementation b48604be; gate:dev 5472/0, gate:milestone 5472/0, and gate:local PASS; clean routing replay is umbrella closeout.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
LAST_VALIDATED_IMPLEMENTATION_SHA: b48604bec084b0ab3c6a7dd89c3eef6f8b82b575
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b48604bec084b0ab3c6a7dd89c3eef6f8b82b575
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_LIVE_SOURCE_TEST_HERMETICITY_V1_STATUS: COMPLETE

## Objective

Make affected real-source tests deterministic and truthful across absent, stale, and exact-current sibling source states without changing source authority or pins.

## Current Milestone

COMPLETE — focused, development, milestone, and local certification are green.

## Completed Milestones

- M0 complete: 12-failure broad residual, 129/11 empty-sibling reproduction, scope, ranking, and strict OpenSpec recorded.
- M1 complete: test-only CURRENT/STALE/UNAVAILABLE classifier and deterministic source-parity fixture proven.
- M2 complete: all 12 affected tests migrated without source rebinding or new skips.

## Work In Progress
None. The child implementation and required validation are complete.

## Exact Next Action

STOP — terminal child record; no further task action.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-live-source-test-hermeticity-v1/` | child continuity | added this session |
| `openspec/changes/nightwatch-live-source-test-hermeticity-v1/` | strict contract | added this session |
| `tests/helpers/liveSourceTestAuthority.ts` | exact currentness classifier | implemented |
| `tests/helpers/sourceParity.ts` | parameterized Git-backed fixture | implemented |
| `bin/nightwatch-intelligence.mjs` | standard local root injection | implemented |
| nine affected test files | hermetic live/stale/unavailable behavior | implemented |

## Validation Ledger

Command: isolation clean `gate:milestone`
Result: TEST_FAILURE / CHILD SELECTED
When: 2026-09-25
Relevant failure/output summary: 5459 passed / 12 failed; no isolation failure remained.

Command: empty-sibling affected-suite replay
Result: 129 PASS / 11 FAIL
When: 2026-09-25
Relevant failure/output summary: eleven tests still require an ambient source checkout; Phase 12 alone passes empty but fails when the canonical sibling has advanced.

Command: focused affected suites with default live state
Result: PASS — 141/141
When: 2026-09-25
Relevant failure/output summary: changed live checkout is classified stale;
blueapi-only current proof still runs; all formerly failing paths are truthful.

Command: focused affected suites with explicit empty `NIGHTWATCH_REPOS_ROOT`
Result: PASS — 141/141
When: 2026-09-25
Relevant failure/output summary: no ambient checkout is required and no
affected test fails or newly skips.

Command: source-analysis parity regression
Result: PASS — 2/2
When: 2026-09-25
Relevant failure/output summary: parameterized/expanded Git-backed fixture
retains byte-stable discovery/CLI behavior.

Command: `npm run gate:dev`
Result: PASS
When: 2026-09-25
Relevant failure/output summary: all mandatory steps passed; 393 selected tests,
5472 passed / 0 failed. The former 12-failure residual is eliminated.

Command: typecheck/bin/schema/universe/hardening/strict OpenSpec
Result: PASS
When: 2026-09-25
Relevant failure/output summary: all structural checks green; no source pin or
schema change.

## Decisions Made During This Task

Decision: repair tests, not source pins or production currentness.
Reason: changed Alphaus source must remain stale/unapproved; tests are the layer making ambient environment an unconditional authority.

Decision: inject the existing standard `NIGHTWATCH_REPOS_ROOT` into the local
intelligence CLI.
Reason: the test-only fixture must exercise the real CLI path without adding a
second source-root environment or changing default production behavior.

## Discoveries

- Eleven affected tests fail even with an explicitly empty sibling root.
- Phase 12's before/after immutability assertion is conflated with historical SHA currentness.
- The intelligence CLI previously ignored both historical test root variables;
  the standard repositories-root seam was the correct existing injection point.
- Phase 12 now distinguishes run-local immutability from historical currentness.

## Blockers

None.

## Safety Events

NONE. Read-only Git metadata and temporary synthetic source only.

## Deferred / Follow-Up

- Lower-level popup target admission.
- Future source re-admission requires separate evidence authorization.

## Resume Recipe

STOP — task complete; do not resume. The parent successor task owns final
clean-checkout replay, C-00 integration, and any newly authorized successor.

## Completion Snapshot

- Status: COMPLETE — all 12 live-source test hermeticity failures are closed.
- Starting SHA: `060cd592cf4e8db4b07fc6398d03c147b8a51f12`.
- Last validated implementation SHA: `b48604bec084b0ab3c6a7dd89c3eef6f8b82b575`.
- Focused live and explicit-empty suites: 141/141 each.
- `gate:dev` and `gate:milestone`: 5472 passed / 0 failed.
- `gate:local`: PASS, receipt `receipt:sha256:a55cac531dfae3c5f15ac598`.
- Source pins unchanged; Alphaus sibling writes 0; no external/product/credential effect.
