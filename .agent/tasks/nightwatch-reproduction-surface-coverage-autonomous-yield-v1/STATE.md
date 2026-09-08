# STATE — nightwatch-reproduction-surface-coverage-autonomous-yield-v1

## Identity

Task ID: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
Phase: W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
Last validated implementation SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
Last substantive checkpoint SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
Live HEAD authority: GIT
Branch: DISCOVER_FROM_SESSION
Last checkpoint: W10 task opened from the W9 terminal documentation head; no W10 implementation has been validated yet
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
LAST_VALIDATED_IMPLEMENTATION_SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD_STATUS: IN_PROGRESS

## Objective

Measure and materially expand safe current-source reproduction coverage across the owner-approved local universe, make reproduction capability visible to the bounded autonomous investigation loop before it spends a verification turn, improve executable reproduction selection/yield in long live campaigns, and preserve all W7-W9 safety/evidence invariants.

## Current Milestone

Milestone ID: M1
Milestone status: IN_PROGRESS
What is being attempted: freeze the additive W10 reproduction-surface contracts now that M0 has mechanically identified target-universe collapse — not executor coverage — as the dominant yield defect.

## Completed Milestones

- W7 substrate, W8 efficacy and W9 owner-local deterministic reproduction are frozen predecessor evidence.
- W9 validated implementation checkpoint: `bb28480c6a6969a06744c75c4c947851d5bece7c`.
- W9 terminal documentation head at W10 planning time: `0664c69cc72acbbf848bf6dd64e7e9d868d80601`.
- W9 final HOUR_1 Omen campaign: 26 unique targets / 28 grounded hypotheses / 7 reproduction attempts / 7 NOT_AVAILABLE / 1 candidate / 0 admissions; wall-time bound with byte headroom.
- **M0 COMPLETE** — live truth rediscovered, W9 baseline re-verified, bounded aggregate reproduction-capability census built with the live W9 rules, and the exact cause of W9's 7/7 `NOT_AVAILABLE` established mechanically. H1 DISPROVED as stated, H2 CONFIRMED, H3/H4 DISPROVED (M4 and M5 are NO-GO), H5 UNPROVEN. Evidence: `M0-CENSUS.md`.

## Work In Progress

M1 shared contract freeze. No implementation lane has been dispatched.

## M0 evidence summary

Full aggregates in `M0-CENSUS.md` (same directory). Census run at base SHA
`1942ea37757bbb914de6281f505ee6118b5c67f0` using the live W9 rules unchanged.

Reasoner-visible universe: 4,109 eligible source files; 1,120 `EXECUTABLE_NOW`
(27.3%); 152 distinct executable targets. Refusals: `NO_SUPPORTED_EXECUTOR`
1,605, `PACKAGE_TEST_FILES_ABSENT` 1,327, `VENDOR_DIRECTORY_ABSENT` 57.

Root cause of W9's 7/7 `NOT_AVAILABLE`, established mechanically:
`loadEligibleEntries` sorts the owner-local source index by
`(repository, relativePath)`, and `runSourceIndex` truncates it to
`MAX_REASONER_SOURCE_INDEX_ENTRIES = 32`. Those 32 entries are 100%
`alphauslabs/blue-sdk-go`, which has zero executable coverage. The first
`mobingilabs/ouchan` entry sits at ordered index 75 and the first
`EXECUTABLE_NOW` entry anywhere at index 83. The reasoner's visible universe
therefore ends 51 entries before the first executable target in the approved
universe, and the preserved `w9-endurance-omen-1` checkpoint confirms all 32
observed paths were in that one repository. The W9 result was structurally
guaranteed, not a reasoning-quality outcome.

Hypothesis verdicts: H1 DISPROVED as stated (coverage is not scarce);
H2 CONFIRMED (`deriveExecutionReadiness` skips targets with
`reproductionAttempts === 0`, so executability is only knowable after spending
a turn); H3 DISPROVED (a Go local-cache class unlocks zero approved targets);
H4 DISPROVED (no approved repository has a local direct non-Go runner);
H5 UNPROVEN (no qualifying current-source reproduction exists yet to triage).

M4 and M5 are therefore evidence-based NO-GO. All available W10 yield is in
capability-aware selection and index diversity.

## Exact Next Action

1. Freeze the additive W10 contracts: reproduction capability/refusal taxonomy,
   bounded `ReproductionSurfaceMap`, executable readiness in investigation
   memory and campaign strategy, sanitized current-failure evidence, and the
   W10 coverage/yield metrics.
2. Keep every W9 target/proof/retry/byte contract backwards compatible.
3. Run the contract tests before dispatching any lane.
4. Then dispatch the non-overlapping implementation lanes in their own C-00
   session worktrees.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/SPEC.md` | W10 contract | CREATED |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/PLAN.md` | W10 long execution plan | CREATED |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/STATE.md` | W10 continuity | IN_PROGRESS |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/REPORT.md` | W10 evidence ledger | INITIAL |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/M0-CENSUS.md` | M0 bounded aggregate census evidence | CREATED |

## Validation Ledger

No W10 implementation validation yet.

Accepted predecessor certification to re-verify as appropriate:

- W9 focused W9/W7/W8: 295 passed / 3 skipped;
- W9 full `npm test`: 4565 passed / 16 skipped / 0 failed;
- W9 typecheck/hardening/agent/handoff/project/workspace/session: PASS;
- W9 `gate:local`: `receipt:sha256:6fb76272f121ec1bed5b74bf`;
- W9 clean clone: `clean-receipt:sha256:d914db277a583699a1ff68c3`;
- W9 real owner-local and historical ouchan product-path proofs: PASS.

## Decisions Made During This Task

Decision: W10 is reproduction-surface coverage and capability-aware yield, not a rewrite of W9 reproduction semantics.
Reason: W9 proved execution, retries and byte accounting; its final live run still spent seven reproduction attempts on surfaces with no supported target.

Decision: census before executor expansion.
Reason: adding language/tool support without measuring the actual live refusal distribution risks widening authority without improving yield.

Decision: unsupported source remains investigable.
Reason: source reasoning and mechanical reproducibility are distinct; W10 should inform the reasoner, not hide the codebase.

Decision: an unknown bug is not a W10 completion requirement.
Reason: a campaign must not manufacture a defect to satisfy a schedule. Capability/yield improvement can be proven with honest zero-admission results.

Decision: W10 is intentionally long-running.
Reason: the task includes census, contract freeze, parallel lanes, real generic proofs, multiple HOUR_1-class live campaigns, resilience tests and full clean-clone certification; stopping after a single success would not satisfy the mission.

Decision: M4 (`GO_LOCAL_CACHE_PACKAGE_TEST`) is NO-GO.
Reason: mechanically zero value. The only non-vendored Go module under an approved root is `mobingilabs/ouchan/.github/mcp`, which is outside the approved roots; `alphauslabs/blue-sdk-go`'s single `_test.go` lives in `session/`, which is not an approved service root. The class would unlock no approved target, so implementing it would widen the execution surface for no coverage.

Decision: M5 (one non-Go execution class) is NO-GO.
Reason: no approved repository has a local direct runner with already-local dependencies. `ripple-api`/`wave-api` have no `vendor/bin`; `ripple-ui` has no `node_modules`. Every candidate needs a network install, which the safety boundary prohibits.

Decision: W10's yield work targets reasoner-visible target selection, not executor breadth.
Reason: the census measured 152 distinct executable targets already reachable under the frozen W9 executor, while the reasoner's visible index contained zero of them. Selection is worth up to 152 targets; executor expansion is worth zero.

## Discoveries

Discovery: the owner-local source index collapses the reasoner's entire target universe into one repository.
Evidence: `loadEligibleEntries` (`src/core/localInvestigation/ownerLocal.ts`) sorts by `(repository, relativePath)`; `runSourceIndex` (`src/core/localInvestigation/session.ts`) slices to `MAX_REASONER_SOURCE_INDEX_ENTRIES = 32`. Measured live: all 32 visible entries are `alphauslabs/blue-sdk-go`, 0 are `EXECUTABLE_NOW`, the first `mobingilabs/ouchan` entry is at ordered index 75 and the first executable entry anywhere is at index 83.

Discovery: executable readiness is derived only post-hoc.
Evidence: `deriveExecutionReadiness` (`src/core/investigationMemory/derive.ts:278`) skips every target with `reproductionAttempts === 0`, so `NOT_READY_NO_EXECUTABLE_TARGET` can only appear after a turn has already been spent. Neither `MemoryInspectedTarget` nor `uninspectedTargets` carries a readiness field.

Discovery: campaign strategy does not persist refusal knowledge.
Evidence: the preserved `w9-endurance-omen-1` checkpoint records 7 deterministic no-target refusals yet `unproductiveTargets: []` and `reproducedTargets: []`. A fresh investigation in the same campaign cannot learn that a repository has zero executable coverage.

Discovery: reproduction coverage is not scarce.
Evidence: 1,120 of 4,109 eligible source files (27.3%) map to `EXECUTABLE_NOW` across 152 distinct targets under the frozen W9 executor, all in `mobingilabs/ouchan`.

Source-policy fact verified: the owner-approved universe is eight repositories. Only `mobingilabs/ouchan` and `alphauslabs/blue-sdk-go` contain Go under approved roots, and only ouchan vendors its dependencies.

## Blockers

None known for repository-owned M0 work.

Possible external blocker: subscribed provider quota/auth for M9 live campaigns. This does not block deterministic census/implementation/test work.

## Safety Events

NONE in W10 so far.

W8 historical safety events and W9 zero-safety-event closeout remain recorded in their own task histories and must not be rewritten.

## Deferred / Follow-Up

- DEV/NEXT/production remain unauthorized.
- Strict EXACT remains separate/unproven.
- Parent programme completion remains separate.
- Multi-language execution beyond one optional narrow W10 class is deferred unless a separate future task is justified.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read this task's SPEC, PLAN, STATE, REPORT.
3. Read W9 terminal STATE/REPORT, then W8/W7 terminal records as needed.
4. Discover live Git/workspace/session truth.
5. Continue from `## Exact Next Action`; do not restart W0-W9.

## Completion Snapshot

Not complete. Populate only after M0-M12 and full certification close truthfully.
