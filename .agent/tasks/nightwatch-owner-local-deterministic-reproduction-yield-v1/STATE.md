# STATE — nightwatch-owner-local-deterministic-reproduction-yield-v1

## Identity

Task ID: nightwatch-owner-local-deterministic-reproduction-yield-v1
Phase: W9_OWNER_LOCAL_DETERMINISTIC_REPRODUCTION_YIELD
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 8f385e5fd404bd694db516e0fe3be473f29380af
Last validated implementation SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Last substantive checkpoint SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Live HEAD authority: GIT
Branch: DISCOVER_FROM_GIT
Last checkpoint: W9 task opened; implementation not started
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 8f385e5fd404bd694db516e0fe3be473f29380af
LAST_VALIDATED_IMPLEMENTATION_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W9_OWNER_LOCAL_DETERMINISTIC_REPRODUCTION_YIELD_STATUS: IN_PROGRESS

## Objective

Add a safe deterministic reproduction path for supported current owner-local source, distinguish retryable/transient failures from deterministic exhausted calls, repair/calibrate byte accounting before changing budgets, and exercise the capability with a truthful live-provider yield campaign while preserving all W7/W8 safety, leakage, memory, historical-replay and mechanical-admission invariants.

## Current Milestone

Milestone ID: M0
Milestone status: NOT_STARTED

What is being attempted: live recon, reproduction-gap proof and byte-accounting baseline. No W9 implementation has been validated yet.

## Starting facts carried from the accepted W8 closeout

These are observations/hypotheses to VERIFY from live code and traces before implementation:

- W8 is COMPLETE and integrated at implementation checkpoint `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`; later commits through W8 closeout are documentation/state descendants.
- W8 reasoner memory/campaign strategy/reproduction readiness materially improved fixed-corpus and live historical efficacy without raising false positives or leakage.
- Real owner-local campaigns still could not earn reproduction credit because the default owner-local context had no configured deterministic reproduction provider.
- The live candidate was mechanically refused `MISSING_REPRODUCTION`, which is correct behavior.
- The exhausted-action guard currently treats prior identical `TOOL_ERROR`/`DEDUPED_REPEAT` as exhausted; executable W9 providers may require a host-owned deterministic/transient failure distinction.
- W8 live runs terminated on cumulative `outputBytes` before HOUR_1 wall time; byte accounting must be audited before any ceiling increase.

## Work In Progress

NONE. W9 implementation has not begun.

## Exact Next Action

1. Discover live HEAD/origin/main/canonical/session/worktree truth.
2. Read SPEC/PLAN plus W7/W8 terminal STATE/REPORT and applicable instructions.
3. Reproduce the current owner-local `NOT_CONFIGURED` reproduction path through the normal campaign/session seam.
4. Capture byte-accounting evidence and verify whether response/tool/memory bytes are double-counted or otherwise amplified.
5. Verify exhausted-action behavior against deterministic vs transient failure possibilities.
6. Freeze W9 shared target/receipt/failure-disposition/byte-ledger contracts before parallel implementation.

Do not dispatch overlapping implementation lanes before step 6.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/SPEC.md` | W9 contract | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/PLAN.md` | W9 execution plan | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/STATE.md` | continuity | IN_PROGRESS |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/REPORT.md` | evidence ledger | IN_PROGRESS |

## Validation Ledger

No W9 implementation validation yet. The inherited certified implementation checkpoint is W8 `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`; W9 must earn its own implementation and certification anchors.

## Decisions Made During This Task

Decision: W9 is reproduction coverage + yield, not another reasoning-memory wave.
Reason: W8 proved the reasoner can form grounded hypotheses and reach verification readiness; current owner-local execution remains blocked at reproduction.

Decision: current-source reproduction must use an explicit proof kind distinct from historical `PRE_FAIL_POST_PASS`.
Reason: current source has no known post-fix revision; pretending otherwise would fabricate evidence semantics.

Decision: unknown-bug discovery is not a W9 completion requirement.
Reason: capability can be correctly implemented even when the inspected source contains no qualifying defect; forcing a bug would reward fabrication/cherry-picking.

Decision: do not raise `outputBytes` until accounting is measured and corrected.
Reason: longer runtime is not evidence of efficacy, and any double counting/waste should be fixed before policy expansion.

## Blockers

None known for repository-owned M0 work. Provider quota may affect later live proof but does not block deterministic/local implementation and testing.

## Safety Events

NONE in W9 at task creation.

## Deferred / Follow-Up

- DEV/NEXT/production remain unauthorized.
- Strict `EXACT_REDISCOVERY` remains separate and unproven.
- Parent programme completion remains separate.
- Previously unknown Alphaus bug yield remains unproven until independently evidenced.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read this task's SPEC/PLAN/STATE/REPORT.
3. Read W8 `nightwatch-autonomous-efficacy-real-local-substrate-v1/{STATE,REPORT}.md`.
4. Read W7 `nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md`.
5. Read parent PROGRAMME/STATE/REPORT and live Git/workspace/session truth.
6. Continue the Exact Next Action; do not reopen W0-W8.

## Completion Snapshot

Not complete. Populate only after M0-M9 are actually closed and W9 has its own certified implementation checkpoint.
