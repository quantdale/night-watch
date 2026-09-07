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
Branch: session/nightwatch-owner-local-determini-47add5e3
Last checkpoint: M0 diagnosis and M1 contracts complete; contract/historical compatibility/typecheck/hardening checks pass
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

Milestone ID: M2-M6
Milestone status: IN_PROGRESS

What is being attempted: implement the frozen contracts in separate C-00 worktrees: owner-local target/provider, explicit current-source admission, host-owned retry/exhaustion semantics, byte-ledger accounting repair, and reasoner-visible readiness.

## Starting facts carried from the accepted W8 closeout

These are observations/hypotheses to VERIFY from live code and traces before implementation:

- W8 is COMPLETE and integrated at implementation checkpoint `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`; later commits through W8 closeout are documentation/state descendants.
- W8 reasoner memory/campaign strategy/reproduction readiness materially improved fixed-corpus and live historical efficacy without raising false positives or leakage.
- Real owner-local campaigns still could not earn reproduction credit because the default owner-local context had no configured deterministic reproduction provider.
- The live candidate was mechanically refused `MISSING_REPRODUCTION`, which is correct behavior.
- The exhausted-action guard currently treats prior identical `TOOL_ERROR`/`DEDUPED_REPEAT` as exhausted; executable W9 providers may require a host-owned deterministic/transient failure distinction.
- W8 live runs terminated on cumulative `outputBytes` before HOUR_1 wall time; byte accounting must be audited before any ceiling increase.

## M0 discoveries

- Live session worktree: `session/nightwatch-owner-local-determini-47add5e3`, base `2886a85e3b3ceeabd05f4e291dc9cbc47b0d0bd9`; canonical main was clean and fast-forwarded to live `origin/main` before the session was created.
- `bin/nightwatch-agent.mjs` calls `createOwnerLocalInvestigationContext()` with zero options. `ownerLocal.ts` therefore installs `unavailable-local-reproduction`, whose `run()` returns `BLOCKED / NOT_CONFIGURED`; `session.ts` maps that to `ADAPTER_UNAVAILABLE`, mints no receipt, and admission returns `MISSING_REPRODUCTION`. Gap CONFIRMED.
- Every successful reasoner call charged raw `stdoutBytes + stderrBytes` and then charged `JSON.stringify(call.response)` again. The response is parsed from that same stdout, so provider response bytes were double-counted. Tool accounting also charged the pre-truncation object while the reasoner received a 16 KiB-capped envelope. Double counting/waste CONFIRMED; no HOUR_1 ceiling increase authorized before repair and calibration.
- `detectExhaustedAction` treated any prior `TOOL_ERROR` as terminal. Runtime collapses every executor `ok:false` result into `TOOL_ERROR`, including transient source-file races, stale-HEAD checks and provider throws. Over-broad transient exhaustion CONFIRMED. Model-supplied regex-shaped `argumentDigest` was also accepted without recomputing it, allowing retry-budget evasion.
- Host Go 1.25.3 plus cached Go 1.25.8 toolchain and `mobingilabs/ouchan/vendor/modules.txt` make one narrow offline class viable. A disposable 63 MiB import/test closure for `pkg/gcsv` ran with `GOPROXY=off`, `GOTOOLCHAIN=local`, `-mod=vendor`; its pre-existing `TestGolangCsv` failed identically twice at `info_test.go:557`. This is a real current-source repeated test failure, not evidence that it is previously unknown.

## M1 frozen contracts

- `src/core/ownerLocalReproduction/contracts.ts`: one `GO_VENDORED_PACKAGE_TEST` target class; host-owned paths, toolchain prerequisites and hard materialization/execution/output/file/byte/execution ceilings; explicit PASS / TEST_FAILURE / BUILD_FAILURE / TIMEOUT / ENVIRONMENT_BLOCKED / PROCESS_FAILURE outcomes.
- `src/core/localInvestigation/currentSourceProof.ts`: `CURRENT_SOURCE_REPEATED_TEST_FAILURE`, requiring a pre-existing repository test, `TEST_ASSERTION_FAILURE`, two fresh matching fingerprints, stable sibling identity, disabled network, and provider-bound minting. Historical `PRE_FAIL_POST_PASS` remains distinct.
- `src/core/agentProtocol/runtime.ts`: host-owned `DETERMINISTIC_TERMINAL | ENVIRONMENT_BLOCKED | TRANSIENT_RETRYABLE`, finite retry budget `2`, and `nightwatch.agent-byte-ledger.v1`.
- `src/core/investigationMemory/types.ts`: additive neutral owner-local readiness states without commands, paths, audit bytes or hidden truth.

## Work In Progress

Four non-overlapping implementation lanes are being opened from the frozen M1 checkpoint. Global W9/programme/current-state/OpenSpec files remain orchestrator-owned.

## Exact Next Action

1. Commit and integrate the M0/M1 contract freeze to `origin/main`.
2. Create separate C-00 leaf worktrees for provider, admission, runtime-accounting/retry, and session/readiness lanes.
3. Inspect every worker diff, reconcile against the current integration head, and rerun its acceptance suite.
4. Complete the fixed/adversarial W9 corpus, real owner-local proof, subscribed reasoner run, endurance accounting proof, and M9 certification.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/SPEC.md` | W9 contract | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/PLAN.md` | W9 execution plan | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/STATE.md` | continuity | IN_PROGRESS |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/REPORT.md` | evidence ledger | IN_PROGRESS |
| `src/core/localInvestigation/currentSourceProof.ts`, `types.ts` | explicit current-source proof/verdict contract | FROZEN |
| `src/core/ownerLocalReproduction/contracts.ts` | host-derived target/execution contract | FROZEN |
| `src/core/agentProtocol/runtime.ts` | disposition/retry/byte-ledger contract | FROZEN |
| `src/core/investigationMemory/types.ts` | owner-local readiness vocabulary | FROZEN |
| `tests/unit/ownerLocalReproductionContracts.test.ts` | M1 contract compatibility/anti-inflation proof | PASS |

## Validation Ledger

M0/M1 validation: `npx playwright test tests/unit/ownerLocalReproductionContracts.test.ts tests/unit/localFindingAdmission.test.ts tests/unit/containedTestReplay.test.ts --project=nightwatch --workers=1` PASS (41/41); `npm run typecheck` PASS; `npm run hardening:check` PASS. Initial attempts before `npm ci --ignore-scripts` failed because the new worktree had no local dependencies (`@playwright/test` missing; global TypeScript rejected legacy `moduleResolution=node10`); pinned local dependencies were installed, then all checks passed.

## Decisions Made During This Task

Decision: W9 is reproduction coverage + yield, not another reasoning-memory wave.
Reason: W8 proved the reasoner can form grounded hypotheses and reach verification readiness; current owner-local execution remains blocked at reproduction.

Decision: current-source reproduction must use an explicit proof kind distinct from historical `PRE_FAIL_POST_PASS`.
Reason: current source has no known post-fix revision; pretending otherwise would fabricate evidence semantics.

Decision: unknown-bug discovery is not a W9 completion requirement.
Reason: capability can be correctly implemented even when the inspected source contains no qualifying defect; forcing a bug would reward fabrication/cherry-picking.

Decision: do not raise `outputBytes` until accounting is measured and corrected.
Reason: longer runtime is not evidence of efficacy, and any double counting/waste should be fixed before policy expansion.

Decision: keep the HOUR_1 output-byte ceiling at 2,000,000 during implementation.
Reason: measured double counting and pre-truncation tool charging explain substantial W8 inflation; repair and live calibration come before any ceiling increase.

Decision: v1 current-source credit accepts only pre-existing repository tests failing twice with one stable normalized fingerprint.
Reason: no post-fix revision exists, and model-authored assertions or generic nonzero/build/environment failures cannot establish product truth.

Decision: combine runtime retry and byte-ledger implementation in one lane.
Reason: both irreducibly edit `agentRuntime/runtime.ts`; one owner avoids conflicting concurrent writes.

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
