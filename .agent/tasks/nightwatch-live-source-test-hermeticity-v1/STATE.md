# Task State

## Identity

Task ID: nightwatch-live-source-test-hermeticity-v1
Phase: LIVE_SOURCE_TEST_HERMETICITY_V1
Status: IN_PROGRESS
Starting SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
Last validated implementation SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
Last substantive checkpoint SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-successor-campaign-en-628d8bb9
Last checkpoint: 2026-09-25 — selected after isolation milestone and empty-sibling reproduction.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
LAST_VALIDATED_IMPLEMENTATION_SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 060cd592cf4e8db4b07fc6398d03c147b8a51f12
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_LIVE_SOURCE_TEST_HERMETICITY_V1_STATUS: IN_PROGRESS

## Objective

Make affected real-source tests deterministic and truthful across absent, stale, and exact-current sibling source states without changing source authority or pins.

## Current Milestone

M3 — checkpoint the hermeticity implementation, run clean milestone, then perform final successor reassessment.

## Completed Milestones

- M0 complete: 12-failure broad residual, 129/11 empty-sibling reproduction, scope, ranking, and strict OpenSpec recorded.
- M1 complete: test-only CURRENT/STALE/UNAVAILABLE classifier and deterministic source-parity fixture proven.
- M2 complete: all 12 affected tests migrated without source rebinding or new skips.

## Work In Progress

Implementation, adversarial states, focused suites, and `gate:dev` are green.
Clean milestone and terminal reassessment remain.

## Exact Next Action

Commit the hermeticity implementation, run `gate:milestone` from the clean
checkpoint, then complete final popup/popup-residual reassessment and C-00 close.

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

None for implementation. Clean milestone and final popup reassessment remain.

## Safety Events

NONE. Read-only Git metadata and temporary synthetic source only.

## Deferred / Follow-Up

- Lower-level popup target admission.
- Future source re-admission requires separate evidence authorization.

## Resume Recipe

1. Commit the hermeticity implementation and require a clean worktree.
2. Run `gate:milestone` and prove source pins/sibling state unchanged.
3. Perform final popup and successor-engine reassessment.
4. Complete C-00 integration/release only from exact green checkpoints.

## Completion Snapshot

Not applicable while IN_PROGRESS.
