# Task State

## Identity

Task ID: nightwatch-shard-temp-isolation-v1
Phase: SHARD_TEMP_ISOLATION_V1
Status: IN_PROGRESS
Starting SHA: f41c6cc3c9e9e6a50f271acbd58ddb19b5afd6aa
Last validated implementation SHA: 473842c196ce28d5a0fb26528bd86fbc5884d293
Last substantive checkpoint SHA: 473842c196ce28d5a0fb26528bd86fbc5884d293
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-successor-campaign-en-628d8bb9
Last checkpoint: 2026-09-25 — implementation 473842c1 including validation-universe classification; focused/adversarial green, corrected gate:dev 5459/12, clean milestone pending.
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: f41c6cc3c9e9e6a50f271acbd58ddb19b5afd6aa
LAST_VALIDATED_IMPLEMENTATION_SHA: 473842c196ce28d5a0fb26528bd86fbc5884d293
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 473842c196ce28d5a0fb26528bd86fbc5884d293
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_SHARD_TEMP_ISOLATION_V1_STATUS: IN_PROGRESS

## Objective

Give every validation shard a private operating-system temporary namespace and remove only the invocation-owned scratch root.

## Current Milestone

M3 — checkpoint the implementation, then run the clean milestone gate and classify residuals.

## Completed Milestones

- M0 complete: exact cross-shard failure, isolated-pass control, scope, and OpenSpec contract recorded.
- M1/M2 complete: private external scratch roots, shared explicit proxy lease directory, bounded cleanup, process-level environment proof, and malformed-input refusal implemented.

## Work In Progress

Implementation and adversarial tests are complete. The corrected development
gate has no temp-isolation failure; milestone remains after the implementation
checkpoint.

## Exact Next Action

Commit the implementation checkpoint, run `gate:milestone` from the clean
checkpoint, then close or block this child without absorbing source drift.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-shard-temp-isolation-v1/` | child continuity | added/updated this session |
| `openspec/changes/nightwatch-shard-temp-isolation-v1/` | strict contract | added/validated this session |
| `bin/lib/shard-child-environment.{mjs,d.mts}` | validated child environment | implemented |
| `bin/run-shards.mjs` | one external run root and bounded lifecycle | implemented |
| `src/proxy/portLease.ts` | explicit shared validation lease directory | implemented |
| `config/environment-surface.v1.json` | new lease-directory environment contract | implemented |
| `tests/unit/{validationShardPlan,phase23PortLease,safety}.test.ts` | process/lease/environment regressions | implemented |

## Validation Ledger

Command: credential `gate:dev`
Result: REPRODUCED / CHILD SELECTED
When: 2026-09-25
Relevant failure/output summary: 5455 passed / 13 failed; 12 known live-source drift failures plus `reviewStore.test.ts` observing an unrelated `/tmp` file only in the parallel gate. The four shard-1 failures replayed in isolation and produced no review-store failure.

Command: credential clean `gate:milestone`
Result: TEST_FAILURE / INDEPENDENT SOURCE DRIFT
When: 2026-09-25
Relevant failure/output summary: all mandatory command steps passed; 5456 passed / 12 failed in 393 selected tests. The review-store race did not recur; the exact credential/live-source residuals were independently classified.

Command: focused shard/proxy/environment suites
Result: PASS — 56/56
When: 2026-09-25
Relevant failure/output summary: actual Node temp roots differ, shared lease directory coordinates distinct roots, malformed input fails closed, and concurrent/exclusive runner integration passes.

Command: hostile shared-temp replay of `reviewStore.test.ts`
Result: PASS — 54/54
When: 2026-09-25
Relevant failure/output summary: an unrelated process continuously created a global `/tmp` entry while the shard runner completed with PASS and no failed tests.

Command: first isolation `gate:dev`
Result: FAIL — TWO REPAIRED INTEGRATION DEFECTS
When: 2026-09-25
Relevant failure/output summary: 2605 passed / 92 failed. Repository-local temp scratch caused in-repo/workspace classification failures, and private temp roots split proxy lease coordination so one shard executed zero tests.

Command: corrected `npm run gate:dev`
Result: TEST_FAILURE / INDEPENDENT SOURCE DRIFT
When: 2026-09-25
Relevant failure/output summary: 5459 passed / 12 failed. The exact 12 live-source drift failures remain; the review-store temp race and both integration defects are absent.

Command: first isolation `gate:milestone`
Result: STEP_FAILED / REPLAY REQUIRED
When: 2026-09-25
Relevant failure/output summary: `validation-universe` rejected the new bin
module as unclassified and reported digest drift. The module was added to the
BIN_SYNTAX inventory and the digest was refreshed; replay from a clean commit.

## Decisions Made During This Task

Decision: isolate temp at the runner process boundary, not only in the failing test.
Reason: parallel shard children must not share ambient mutable filesystem state; a one-test workaround would leave the general validation defect.

Decision: keep proxy lease state shared inside one validation invocation.
Reason: port leases are cross-process coordination authority, not test-private scratch; splitting them breaks concurrent browser/proxy startup.

Decision: place the run root under the system temp directory, not the repository.
Reason: many tests intentionally prove that repository/workspace-contained scratch is rejected.

## Discoveries

- Initial implementation used repository-local scratch and per-shard proxy lease roots; broad validation mechanically exposed both as incompatible with existing containment and lease contracts.
- Corrected runner uses one external run root, private shard temp children, and one explicit shared proxy lease child.
- The explicit child environment inherits `TMPDIR`, `TEMP`, and `TMP` unchanged unless the validated runner override is applied.
- `reviewStore.test.ts` snapshots its parent temp directory, so an unrelated shard process can make a product-containment assertion fail.

## Blockers

None for implementation. Twelve live-source drift failures remain independent and must not be absorbed into this child. Clean milestone validation remains required after the implementation checkpoint.

## Safety Events

NONE. System-temp validation scratch and loopback lease files only; no external target, credential, customer value, sibling write, or product data.

## Deferred / Follow-Up

- Live-source test hermeticity/currentness after this child.
- Popup target admission remains architecturally blocked.

## Resume Recipe

1. Read SPEC, PLAN, STATE, and the strict OpenSpec artifacts.
2. Commit the implementation checkpoint and require a clean worktree.
3. Run `gate:milestone` and classify the exact residual.
4. Close or block this child, then reassess source drift and popup L0.

## Completion Snapshot

Not applicable while IN_PROGRESS.
