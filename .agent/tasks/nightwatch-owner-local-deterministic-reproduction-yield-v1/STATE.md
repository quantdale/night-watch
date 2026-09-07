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
Last checkpoint: lanes A/B/C/M6 integrated at `979c370`; real owner-local reproduction and a live subscribed campaign both executed; budget-dimension calibration (Lane D live finding) delegated
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

Milestone ID: M7-M8
Milestone status: IN_PROGRESS

What is being attempted: reconcile every lane diff into the integration branch, then close the live-proof milestone. Lanes A (provider), B (admission), C (disposition/retry), D-part-1 (exact byte ledger) and M6 (readiness + neutral prompt instructions) are integrated and green; the live campaign exposed a budget-dimension defect now being repaired.

## M2-M6 integration (this session)

Integration branch `session/nightwatch-owner-local-determini-47add5e3` at `979c370`, cherry-picked lane by lane with reconciliation:

| Commit | Lane | Content |
|---|---|---|
| `072a66d` | contracts | proof digest kind binding |
| `3232063` | B | current-source repeated-failure admission beside the historical branch |
| `b817a80` | C | host-owned disposition retries + first byte ledger |
| `ccdff51` | integration | lane fixture repairs (stale driver script, ESM import, missing helper) |
| `febb49a`, `8c05616` | M6 | verdicts/dispositions/proof carriage/REAL_LOCAL default/readiness + neutral print instructions; `failedInspection` restore and per-`argumentDigest` transient budget |
| `7c56eb0`, `2c7a13f` | A | bounded `go list -deps -test` closure, byte-exact output cap, real `bwrap --unshare-net` execution, fixed toolchain allowlist, restored declarations |
| `de3098e` | D | exact component byte ledger (below) |
| `979c370` | C | host-owned retry adversarial matrix (7 behavioral cases; no contract bug found) |

Reconciliation defects found by orchestrator review and repaired in-lane before integration: whole-module-tree materialization instead of a dependency closure; output cap counted JS chars not UTF-8 bytes; `networkDisabled: true` asserted from `GOPROXY=off` alone with no network namespace; ambient `PATH`/`GOROOT` toolchain discovery; two commits that deleted declarations they were editing around; a readiness loop referencing a deleted binding; a retry budget summed across targets instead of per exact action digest.

## Exact byte accounting (`de3098e`)

`nightwatch.agent-byte-ledger.v1` now names every component and reconciles exactly with the frozen cumulative totals: `chargedInputBytes = legacyInputBytes + renderedInputBytes`, `chargedOutputBytes = legacyOutputBytes + providerResponseBytes + providerStderrBytes + toolResultBytes`. `reasonerOutputBytes` (the parsed response already carried by the provider response), `requestMemoryBytes`, `requestUntrustedBytes`, `toolEnvelopeBytes` and `checkpointBytes` are measured, never charged. A pre-W9 checkpoint with no ledger resumes through explicit legacy carry rather than fabricating provider/tool attribution, and `parseCheckpoint` now rejects a structurally valid but arithmetically drifted ledger. `checkpointBytes` counts the exact UTF-8 documents the checkpoint codec produced, resolved as the least fixed point of `bytes = priorBytes + size(document(bytes))` (the count lives inside the document it measures); a campaign envelope's `campaignProgress` framing is deliberately outside that fixed point.

## M8 live proof

- Real owner-local reproduction, real toolchain, real containment: `mobingilabs/ouchan:pkg/almcreds/creds.go` discovered generically from repository metadata, module `ouchan` @ `565f00a87fb7616cc23c45d4ffeabee38a41c65f`, toolchain `go1.25.8` from the cached allowlisted path, two fresh disposable executions inside `bwrap --unshare-net`, both `TEST_PASS` (11.1 s / 9.8 s) → honest `NOT_REPRODUCED`, `preFix=PASS`, `postFix=NOT_RUN`, `currentSourceProof=null`, `siblingIdentityStable=true`, `networkDisabled=true`, zero temp residue, sibling repository unmodified. The capability executes; this package simply holds no qualifying defect.
- Live subscribed reasoner campaign `w9-live-1` (`campaign run --reasoner=cli --duration=1h --max-turns=10`, real `opencode-go/deepseek-v4-flash`): 2 investigations, 19 reasoner calls, 0 provider failures, 14 real Alphaus source targets inspected, 14 evidence refs, 0 candidates, terminated `BUDGET_EXHAUSTED` after 284.5 s.
- Ledger from that live run: renderedInput 231 425 B, providerResponse 7 169 B, providerStderr 0 B, reasonerOutput 8 085 B, toolResult 2 950 229 B, toolEnvelope 153 909 B, checkpoint 20 371 B.

## Live finding: the output ceiling is a tool-payload ceiling

Charging pre-truncation tool payloads into the same `outputBytes` ceiling as provider transport makes local source reads 99.8 % of that budget dimension: the HOUR_1 campaign died at 4.7 minutes of a 60-minute wall-time allowance while the model produced only 7 KB. Raising the number would hide the category error, so the repair separates the dimensions (`toolPayloadBytes` in policy/usage, `outputBytes` for provider transport only, budget schema v2 with v1 resume preserved) and calibrates all four ceilings from the measured per-turn rates. Delegated to the implementation lane with mandatory full-unit validation.

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

Lane implementation is complete and integrated except the budget-dimension calibration, which one lane owns exclusively because it edits budget policy, the campaign fold and the checkpoint parser together. Global W9/programme/current-state/OpenSpec files remain orchestrator-owned.

## Exact Next Action

1. Integrate the budget-dimension calibration commit, then rerun the full unit suite plus typecheck at the integration head.
2. Re-run the bounded HOUR_1 endurance campaign against the calibrated ceilings and record whether it is bounded by wall time/reasoner calls rather than bytes.
3. Re-run the real historical ouchan product-path proof, then M9: focused W9 + W7/W8 regression suites, `gate:local`, `gate:clean`, and the hygiene checks.
4. Reconcile the stale session base against `origin/main`, integrate, then update W9 STATE/PLAN/REPORT and parent programme truth and release the finished lane worktrees.

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
| `src/core/ownerLocalReproduction/provider.ts` | bounded closure, contained execution, fixed toolchain | DONE |
| `src/core/localInvestigation/{session,ownerLocal,admission}.ts` | verdicts, dispositions, REAL_LOCAL default, current-source admission | DONE |
| `src/core/agentRuntime/{runtime,checkpoint,localCampaign}.ts` | host-owned retries + exact byte accounting | DONE |
| `src/core/investigationMemory/derive.ts` | owner-local readiness + per-digest retry budget | DONE |
| `bin/nightwatch-reasoner-print.mjs` | neutral per-readiness instruction + standing host-owned retry rule | DONE |
| `tests/unit/{byteAccounting,localCampaignByteAccounting,agentRuntimeW9,reasonerPrintW9,ownerLocalReproduction*,localInvestigationProviders}.test.ts` | W9 behavioral suites | PASS |

## Validation Ledger

M0/M1 validation: `npx playwright test tests/unit/ownerLocalReproductionContracts.test.ts tests/unit/localFindingAdmission.test.ts tests/unit/containedTestReplay.test.ts --project=nightwatch --workers=1` PASS (41/41); `npm run typecheck` PASS; `npm run hardening:check` PASS. Initial attempts before `npm ci --ignore-scripts` failed because the new worktree had no local dependencies (`@playwright/test` missing; global TypeScript rejected legacy `moduleResolution=node10`); pinned local dependencies were installed, then all checks passed.

M2-M6 integration validation at `979c370`: `npm run typecheck` PASS; `npx playwright test tests/unit` PASS (4519 passed, 16 skipped, 8.4 min) at `de3098e` plus the retry matrix suite green in-lane (33/33) after the last cherry-pick; `npm run hardening:check` PASS; `npm run workspace:check`, `npm run agent:check`, `npm run project:check` PASS with expected mid-task warnings (stale implementation baseline, stale session base, one unrelated stale worktree claim).

M8 validation: `NIGHTWATCH_REAL_OWNER_LOCAL_PROOF=1 npx playwright test tests/unit/realOwnerLocalReproductionProof.test.ts --project=nightwatch --workers=1` PASS (26.4 s, real toolchain and containment); the same provider driven directly produced the `pkg/almcreds` receipt recorded above; `campaign run --reasoner=cli --duration=1h --max-turns=10 --id=w9-live-1` against the real subscribed provider completed with 0 provider failures and the ledger recorded above.

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

Decision: separate tool payload bytes from provider transport bytes in the budget instead of raising `outputBytes`.
Reason: the live campaign measured local tool payloads at 99.8 % of that ceiling, so one number was guarding two unrelated risks; the model-output guard must stay small while local reads get their own calibrated dimension.

Decision: calibrate every ceiling from measured per-turn rates and keep wall time and reasoner calls as the binding limits.
Reason: a byte ceiling that ends a 60-minute campaign in 4.7 minutes silently redefines the run; bytes should bound pathology, not ordinary work.

Decision: `checkpointBytes` is measured, never charged, and its fixed point covers only the checkpoint codec's own document.
Reason: checkpoints are local storage rather than model I/O, and including a wrapper's framing would make the value depend on the caller instead of the codec.

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
