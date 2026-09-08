# STATE — nightwatch-reproduction-surface-coverage-autonomous-yield-v1

## Identity

Task ID: nightwatch-reproduction-surface-coverage-autonomous-yield-v1
Phase: W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
Last validated implementation SHA: 9f990af5a7f9f071d859caf1b2e78f0b059c7a6c
Last substantive checkpoint SHA: 9f990af5a7f9f071d859caf1b2e78f0b059c7a6c
Live HEAD authority: GIT
Branch: session/nightwatch-reproduction-surface--0a9096be
Last checkpoint: M0-M8 and M10 implemented; broad and robustness HOUR_1 campaigns preserved; census-derived reproduction-rich HOUR_1 campaign running
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 0664c69cc72acbbf848bf6dd64e7e9d868d80601
LAST_VALIDATED_IMPLEMENTATION_SHA: 9f990af5a7f9f071d859caf1b2e78f0b059c7a6c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9f990af5a7f9f071d859caf1b2e78f0b059c7a6c
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W10_REPRODUCTION_SURFACE_COVERAGE_AUTONOMOUS_YIELD_STATUS: IN_PROGRESS

## Objective

Measure and materially expand safe current-source reproduction coverage across the owner-approved local universe, make reproduction capability visible to the bounded autonomous investigation loop before it spends a verification turn, improve executable reproduction selection/yield in long live campaigns, and preserve all W7-W9 safety/evidence invariants.

## Current Milestone

Milestone ID: M11
Milestone status: IN_PROGRESS
What is being attempted: full regression and certification of the final W10 implementation head after the review-driven repairs and the terminal live campaign series.

## Completed Milestones

- W7 substrate, W8 efficacy and W9 owner-local deterministic reproduction are frozen predecessor evidence.
- W9 validated implementation checkpoint: `bb28480c6a6969a06744c75c4c947851d5bece7c`.
- W9 terminal documentation head at W10 planning time: `0664c69cc72acbbf848bf6dd64e7e9d868d80601`.
- W9 final HOUR_1 Omen campaign: 26 unique targets / 28 grounded hypotheses / 7 reproduction attempts / 7 NOT_AVAILABLE / 1 candidate / 0 admissions; wall-time bound with byte headroom.
- **M0 COMPLETE** — live truth rediscovered, W9 baseline re-verified, bounded aggregate reproduction-capability census built with the live W9 rules, and the exact cause of W9's 7/7 `NOT_AVAILABLE` established mechanically. H1 DISPROVED as stated, H2 CONFIRMED, H3/H4 DISPROVED (M4 and M5 are NO-GO), H5 UNPROVEN. Evidence: `M0-CENSUS.md`.
- **M1 COMPLETE** — `nightwatch.reproduction-surface-map.v1`, the census and yield-metric contracts, and `selectDiverseSourceIndex` frozen and integrated. 20 contract tests.
- **M2 COMPLETE** — deterministic pure census engine (`src/core/reproductionSurface/census.ts`), 7 tests, mutation-probed.
- **M4 NO-GO (evidence-based)** — a Go local-cache executor class unlocks zero approved targets.
- **M5 NO-GO (evidence-based)** — no approved repository has a local direct non-Go runner.
- **M6 COMPLETE** — `nightwatch.current-failure-evidence.v1` sanitized triage evidence, 10 tests.
- **M7 COMPLETE** — fixed 59-case corpus and pure baseline-vs-final evaluator, 8 tests.
- **M10 COMPLETE** — 10 long-run resilience proofs (pause/resume, pre-W10 and pre-W9 checkpoint compatibility, transient budget survival, refusal non-spin, cancellation and timeout process-tree cleanup, exact ledger reconciliation, sibling integrity).
- **M3 COMPLETE** — capability readiness is carried through investigation memory and campaign strategy v2; target capabilities, unsupported targets, pre-action readiness, caps, injection inertia and resume behavior are covered by 16 dedicated tests. A live cross-investigation carry defect discovered by Run C was repaired and regression-covered before Run D.
- **M8 COMPLETE** — the unchanged W9 real proof passes, and a second distinct real package executes twice through the generic provider with sibling identity unchanged and no temp residue. Repository diversity is unavailable because the census proves only `mobingilabs/ouchan` has executable approved targets.
- **M9.2 COMPLETE** — full-stack broad campaign `w10-capability-omen-2`: 3,702,379 ms, 6/6 investigations, 63 calls, 71 actions, 7 provider failures, 21 inspected targets across all 8 repositories, 5 reproduction attempts with 5 host executions and 0 `NOT_AVAILABLE`, 2 candidates, 0 admissions, 2 correct `MISSING_REPRODUCTION` refusals.
- **M9.3 COMPLETE** — robustness campaign `w10-repeat-omen-3` after the carry repair: 3,696,810 ms, 5/5 investigations, 57 calls, 70 logged actions, 8 provider failures, 22 inspected targets across all 8 repositories, 5 attempts with 5 host executions and 0 `NOT_AVAILABLE`, 1 candidate, 0 admissions, 1 correct `MISSING_REPRODUCTION` refusal. Its checkpoint retains all 32 capability entries: 5 `EXECUTABLE_NOW`, 27 `NOT_EXECUTABLE`.
- **M9.1 COMPLETE** — census-scoped reproduction-rich campaign `w10-rich-omen-4` through the new host-owned `--repository=mobingilabs/ouchan` scope: 3,648,130 ms, 5/5 investigations, 60 calls, 69 logged actions, 5 provider failures, 22 inspected targets, a 32/32 `EXECUTABLE_NOW` window over 18 distinct targets, 6 reproduction attempts with 6 host executions across 6 distinct packages, 0 `NOT_AVAILABLE`, 1 candidate, 0 admissions, 1 correct `MISSING_REPRODUCTION` refusal.
- **Independent review repairs COMPLETE** — a read-only reviewer found eight issues on the integrated head; all were repaired with permanent tests: dead current-failure evidence now reaches the reasoner on qualifying results, campaign capability is seeded into fresh investigations and restored on resume, live yield is derived mechanically instead of by hand, operator repository scope persists and fails closed on resume, repeated-unsupported attempts are keyed by target rather than refusal class, index selection preserves entries beyond the probe ceiling, and the surface readiness tuple is fully enforced.

## Work In Progress

M9.1 `w10-rich-omen-4` is running through the ordinary CLI campaign path with the new host-owned `--repository=mobingilabs/ouchan` scope. The option is validated by the existing owner-approved source boundary before the reasoner starts; a permanent regression proves an unapproved repository exits 2 without spawning the reasoner.

## Measured W10 outcome so far

The live 32-entry window the reasoner actually receives, measured end to end
through `createOwnerLocalInvestigationContext().source.index()` on the real
approved universe:

| Measure | W9 (before) | W10 (after) |
|---|---:|---:|
| repositories represented | 1 | 8 |
| `EXECUTABLE_NOW` entries | 0 | 5 |
| distinct executable targets | 0 | 5 |

The first measurement after repository round-robin gave 8 repositories and 5
executable entries but only **1** distinct target: five sources in one Go
package are one reproduction. Adding executable-target spread to selection
took distinct targets from 1 to 5, so the same window now offers five
genuinely different verifications instead of one repeated four times.

Live reproduction yield, derived mechanically by `deriveCampaignYieldMetrics`
from each campaign's own action log:

| Campaign | attempts | executed | `NOT_AVAILABLE` | NA rate |
|---|---:|---:|---:|---:|
| W9 `w9-endurance-omen-1` | 7 | 0 | 7 | 1.0000 |
| Run B `w10-broad-omen-1` | 6 | 4 | 2 | 0.3333 |
| Run A `w10-rich-omen-4` | 6 | 6 | 0 | 0.0000 |
| Run C `w10-capability-omen-2` | 5 | 5 | 0 | 0.0000 |
| Run D `w10-repeat-omen-3` | 5 | 5 | 0 | 0.0000 |

An earlier hand reading of Run B claimed zero reproduction attempts; it had
counted admitted reproductions. The claim was wrong, is corrected in `REPORT.md`
rather than silently replaced, and is why the campaign now derives this table
itself.

Fixed-corpus benchmark (M7), same implementation, baseline vs final policy:

| Metric | BASELINE (W9-like) | FINAL (W10) |
|---|---:|---:|
| repositories visible | 1 | 3 |
| executable visible | 0 | 7 |
| executable targets | 0 | 6 |
| reproduction attempts | 7 | 7 |
| `NOT_AVAILABLE` rate | 1.0000 | 0.7143 |
| executable selection rate | 0.0000 | 0.2857 |
| attempts to first executable reproduction | none | 3 |

Both improved at an identical attempt budget, so the gain is selection
quality rather than activity volume.

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
observed paths were in that one repository.

Hypothesis verdicts: H1 DISPROVED as stated (coverage is not scarce);
H2 CONFIRMED (`deriveExecutionReadiness` skips targets with
`reproductionAttempts === 0`, so executability is only knowable after spending
a turn); H3 DISPROVED (a Go local-cache class unlocks zero approved targets);
H4 DISPROVED (no approved repository has a local direct non-Go runner);
H5 UNPROVEN (no qualifying current-source reproduction exists yet to triage).

M4 and M5 are therefore evidence-based NO-GO. All available W10 yield is in
capability-aware selection and index diversity.

## Exact Next Action

1. Complete M11 certification on the final implementation head: focused W10 and
   W7-W9 suites, `npm test`, typecheck, hardening, agent, handoff, project,
   workspace, session, `gate:local`, fresh Node 20 `gate:clean`, and the three
   opt-in real proofs.
2. Close W10 STATE/PLAN/REPORT, parent programme truth, `.agent/ACTIVE_TASK.md`,
   `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md` and OpenSpec.
3. Claim no previously unknown Alphaus defect, no strict EXACT, no DEV/NEXT
   authority and no parent-programme completion.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/SPEC.md` | W10 contract | CREATED |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/PLAN.md` | W10 long execution plan | CREATED |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/STATE.md` | W10 continuity | IN_PROGRESS |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/REPORT.md` | W10 evidence ledger | INITIAL |
| `.agent/tasks/nightwatch-reproduction-surface-coverage-autonomous-yield-v1/M0-CENSUS.md` | M0 bounded aggregate census evidence | CREATED |

## Validation Ledger

- Focused W10 and predecessor-compatible implementation validation before the latest CLI seam: 127 related tests PASS; real W9 owner-local proof 1 PASS; second-package generality proof 2 PASS; historical ouchan product-path proof 1 PASS.
- Full pre-carry implementation regression at `ed4e326`: 4,637 passed / 18 skipped / 0 failed.
- Pre-carry `gate:local`: all 11 groups PASS, `receipt:sha256:45349304b70ae8bab3de5a82`.
- Pre-carry fresh Node 20 `gate:clean`: PASS, `nodeModulesReused=false`, `cleanBefore/cleanAfter=true`, `siblingWrites=0`, `clean-receipt:sha256:fb15a890643aa2be97fa0b7d`.
- Campaign capability carry repair: focused 42 tests PASS; hardening PASS.
- Host-owned repository-scope CLI seam at `9f990af`: `localCampaign.test.ts` 6 passed; typecheck PASS; hardening PASS; workspace integrity PASS.
- Final M11 certification remains required after Run A and terminal documentation reconciliation.

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
