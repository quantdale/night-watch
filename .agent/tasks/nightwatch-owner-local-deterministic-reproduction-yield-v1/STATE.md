# STATE — nightwatch-owner-local-deterministic-reproduction-yield-v1

## Identity

Task ID: nightwatch-owner-local-deterministic-reproduction-yield-v1
Phase: W9_OWNER_LOCAL_DETERMINISTIC_REPRODUCTION_YIELD
Status: COMPLETE
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 8f385e5fd404bd694db516e0fe3be473f29380af
Last validated implementation SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
Last substantive checkpoint SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
Live HEAD authority: GIT
Branch: session/nightwatch-owner-local-determini-47add5e3
Last checkpoint: W9 implementation integrated and certified at `bb28480`; owner-local reproduction, explicit current-source proof/admission, host-owned retries, separated byte budgets, real local proof, subscribed-reasoner yield and HOUR_1 endurance are complete
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 8f385e5fd404bd694db516e0fe3be473f29380af
LAST_VALIDATED_IMPLEMENTATION_SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
LAST_SUBSTANTIVE_CHECKPOINT_SHA: bb28480c6a6969a06744c75c4c947851d5bece7c
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W9_OWNER_LOCAL_DETERMINISTIC_REPRODUCTION_YIELD_STATUS: COMPLETE

## Objective

Add a safe deterministic reproduction path for supported current owner-local source, distinguish retryable/transient failures from deterministic exhausted calls, repair/calibrate byte accounting before changing budgets, and exercise the capability with a truthful live-provider yield campaign while preserving all W7/W8 safety, leakage, memory, historical-replay and mechanical-admission invariants.

## Current Milestone

COMPLETE — M9 closed.
Milestone ID: M9
Milestone status: COMPLETE
All W9 milestones are closed. The implementation checkpoint `bb28480c6a6969a06744c75c4c947851d5bece7c` is integrated on `origin/main` and passed focused, full local and fresh Node 20 clean-clone certification. Parent programme status remains independently `IN_PROGRESS`.

## M2-M6 integration (this session)

Integration branch `session/nightwatch-owner-local-determini-47add5e3` was reviewed and integrated through `bb28480c6a6969a06744c75c4c947851d5bece7c`, cherry-picked lane by lane with reconciliation:

| Commit | Lane | Content |
|---|---|---|
| `072a66d` | contracts | proof digest kind binding |
| `3232063` | B | current-source repeated-failure admission beside the historical branch |
| `b817a80` | C | host-owned disposition retries + first byte ledger |
| `ccdff51` | integration | lane fixture repairs (stale driver script, ESM import, missing helper) |
| `febb49a`, `8c05616` | M6 | verdicts/dispositions/proof carriage/REAL_LOCAL default/readiness + neutral print instructions; `failedInspection` restore and per-`argumentDigest` transient budget |
| `7c56eb0`, `2c7a13f` | A | bounded `go list -deps -test` closure, byte-exact output cap, real `bwrap --unshare-net` execution, fixed toolchain allowlist, restored declarations |
| `de3098e` | D1 | exact component byte ledger |
| `979c370` | C | host-owned retry adversarial matrix (7 behavioral cases; no contract bug found) |
| `d91f11b` | D2 | separate provider transport and tool payload budget dimensions; calibrated v2 ceilings |
| `bb28480` | D2 repair | migrate v1 mixed totals once into payload carry so old tool-heavy checkpoints remain resumable |

Reconciliation defects found by orchestrator review and repaired in-lane before integration: whole-module-tree materialization instead of a dependency closure; output cap counted JS chars not UTF-8 bytes; `networkDisabled: true` asserted from `GOPROXY=off` alone with no network namespace; ambient `PATH`/`GOROOT` toolchain discovery; two commits that deleted declarations they were editing around; a readiness loop referencing a deleted binding; a retry budget summed across targets instead of per exact action digest.

## Exact byte accounting and calibrated endurance

`nightwatch.agent-byte-ledger.v1` names every component and reconciles exactly with the v2 budget totals: `chargedInputBytes = legacyInputBytes + renderedInputBytes`; `chargedOutputBytes = legacyOutputBytes + providerResponseBytes + providerStderrBytes`; `chargedToolPayloadBytes = legacyToolPayloadBytes + toolResultBytes`. Parsed reasoner output, prompt-memory/untrusted subsets, capped tool envelopes and checkpoint documents are measured but never charged twice. Structurally valid but arithmetically drifted ledgers fail closed.

The v1 snapshot had one ambiguous mixed output total. Migration drops no bytes: it moves the entire old total once into `legacyToolPayloadBytes`, resets v2 transport usage to zero, and restores the standard v2 transport ceiling. This conservatively over-attributes the small historical transport component but avoids making a tool-heavy valid v1 checkpoint terminate immediately against the much smaller v2 transport ceiling. Idempotent parsing, resumed accumulation and a 3,000,000-byte legacy case are permanent regressions.

Calibrated ceilings use the observed `w9-live-1` rate with two-times headroom: HOUR_1 = 200 reasoner calls / 5,000,000 input B / 160,000 transport B / 64,000,000 tool-payload B / 400 tool actions; longer tiers scale proportionally. Independent transport and payload runaway tests still terminate safely.

## M8 live proof

- Real owner-local reproduction, real toolchain, real containment: `mobingilabs/ouchan:pkg/almcreds/creds.go` discovered generically from repository metadata, module `ouchan` @ `565f00a87fb7616cc23c45d4ffeabee38a41c65f`, toolchain `go1.25.8` from the cached allowlisted path, two fresh disposable executions inside `bwrap --unshare-net`, both `TEST_PASS` (11.1 s / 9.8 s) → honest `NOT_REPRODUCED`, `preFix=PASS`, `postFix=NOT_RUN`, `currentSourceProof=null`, `siblingIdentityStable=true`, `networkDisabled=true`, zero temp residue, sibling repository unmodified. The capability executes; this package simply holds no qualifying defect.
- Initial live subscribed reasoner campaign `w9-live-1` (historical pre-owner model-switch run, ordinary `campaign run`, `opencode-go/deepseek-v4-flash`): 2 investigations, 19 reasoner calls, 0 provider failures, 14 real source targets, 14 evidence refs, 0 candidates; `BUDGET_EXHAUSTED` after 284.5 s. Ledger: rendered input 231,425 B; provider response 7,169 B; stderr 0 B; parsed output 8,085 B; tool result 2,950,229 B; tool envelope 153,909 B; checkpoint 20,371 B. This exposed the mixed-dimension defect; it is retained as historical evidence, not the final provider.
- The first post-repair endurance attempt was stopped immediately when the owner directed replacement of that model; no result or evidence claim was taken from it.
- Final owner-directed endurance campaign `w9-endurance-omen-1` used `opencode-go/omen-alpha` through ordinary `campaign run --reasoner=cli --duration=1h --max-turns=12`. It ran 3,673,995 ms, started/completed 7 investigations, made 79 reasoner calls and 56 tool actions, recorded 3 provider failures (2 timeouts + 1 nonzero exit) with 3 bounded provider retries, inspected 26 unique real source targets, minted 27 evidence refs, formed 28 grounded/verification-ready hypotheses, attempted 7 reproductions, and received 7 deterministic `NOT_AVAILABLE` outcomes because those inspected files had no supported executable target. Reproduction transient retries: 0. Candidates: 1; admissions: 0; refusals: 1 (`MISSING_REPRODUCTION`); qualifying current-source reproductions: 0.
- Endurance bytes: rendered input 1,112,083 B; memory contribution 435,205 B; untrusted contribution 573,362 B; provider response 51,720 B; provider stderr 113 B; parsed reasoner output 54,724 B; tool result 10,661,051 B; tool envelope 608,658 B; checkpoint 40,584 B. Final charged usage was input 1,112,083 / 5,000,000 B, transport 51,833 / 160,000 B, and tool payload 10,661,051 / 64,000,000 B.
- Exact outer termination: `BUDGET_EXHAUSTED` on HOUR_1 wall time (3,673,995 ms used vs 3,600,000 ms; one bounded in-flight call completed before termination), not input, transport, payload, calls, actions, candidates, retries or provider-failure ceilings. Inner outcomes: 2 `COMPLETE_NO_FINDING`, 5 `NO_PROGRESS`. No finding was fabricated; no previously unknown Alphaus defect is claimed.

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

None. W9 is terminal.

## Exact Next Action

STOP. W9 is closed and frozen. Any successor is a separate task requiring explicit owner authorization; DEV/NEXT, external filing and previously-unknown-defect claims remain unauthorized/unproven.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/SPEC.md` | W9 contract | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/PLAN.md` | W9 execution plan | DONE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/STATE.md` | continuity | COMPLETE |
| `.agent/tasks/nightwatch-owner-local-deterministic-reproduction-yield-v1/REPORT.md` | evidence ledger | COMPLETE |
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

M7 post-reconcile validation at implementation checkpoint `bb28480c6a6969a06744c75c4c947851d5bece7c`: full `tests/unit` 4531 passed / 16 skipped / 0 failed after the v1 migration correction; focused W9/W7/W8 matrix 295 passed / 3 skipped / 0 failed.

M8 final live validation: `w9-endurance-omen-1` ran through the ordinary subscribed CLI path with `opencode-go/omen-alpha` for 3,673,995 ms and ended on the HOUR_1 wall-time ceiling while all byte/count ceilings retained headroom. Metrics and non-claims are recorded above.

M9 certification at `bb28480`: `npm run typecheck`, `hardening:check`, `agent:check`, `handoff:check`, `project:check`, `workspace:check`, `session:check` PASS (only expected stale-task/worktree advisory warnings); full `npm test` 4565 passed / 16 skipped / 0 failed; `gate:local` all 11 groups PASS with `receipt:sha256:6fb76272f121ec1bed5b74bf`; fresh Node 20 `gate:clean` used no prior `node_modules`, left source clean, recorded `siblingWrites=0`, and PASS with `clean-receipt:sha256:d914db277a583699a1ff68c3`. Opt-in real historical ouchan product-path proof PASS; opt-in real current owner-local provider proof PASS.

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

Decision: migrate an ambiguous v1 mixed output total wholly into v2 payload carry, not v2 transport.
Reason: every byte remains charged exactly once; measured traffic was 99.8% tool payload, while retaining megabytes of old tool reads under the 160 KB transport guard would make valid pre-v2 checkpoints non-resumable. The bounded downside is a fresh small transport allowance on resume, explicitly tested and documented.

Decision: use `opencode-go/omen-alpha` for the final subscribed endurance campaign.
Reason: the owner explicitly replaced `opencode-go/deepseek-v4-flash`; the in-flight post-repair attempt on the old model was canceled and no result was claimed. Historical pre-directive `w9-live-1` data remains truthful provenance for the discovered accounting defect.

## Blockers

None for W9. Parent-level DEV/NEXT authorization, strict EXACT proof and independently established previously-unknown-defect status remain outside W9 and do not invalidate its terminal LOCAL result.

## Safety Events

No safety-boundary violations. Production/DEV/NEXT contacts, external publications, credential/deployment changes, force pushes/history rewrites and sibling writes: 0. Reproduction execution stayed in disposable Nightwatch-owned state with before/after sibling identity checks. The owner-directed reasoner switch was honored immediately; the superseded endurance process was canceled and the terminal campaign used `opencode-go/omen-alpha`.

## Deferred / Follow-Up

- DEV/NEXT/production remain unauthorized.
- Strict `EXACT_REDISCOVERY` remains separate and unproven.
- Parent programme completion remains separate.
- Previously unknown Alphaus bug yield remains unproven until independently evidenced.

## Resume Recipe

Task complete. Do not resume this task.
Read `.agent/ACTIVE_TASK.md`, parent PROGRAMME/STATE/REPORT and this terminal record only for continuity. A future successor requires new authorization and its own task from live Git truth; W9 safety/evidence contracts remain frozen.

## Completion Snapshot

Task complete.
Milestones M0-M9: COMPLETE.
Validated implementation and substantive checkpoint: `bb28480c6a6969a06744c75c4c947851d5bece7c`.
Local gate: PASS, `receipt:sha256:6fb76272f121ec1bed5b74bf`.
Fresh Node 20 clean gate: PASS, `clean-receipt:sha256:d914db277a583699a1ff68c3`.
Current-source capability: PROVEN for the bounded `GO_VENDORED_PACKAGE_TEST` class.
Live yield: zero admitted findings; one candidate correctly refused without qualifying reproduction.
Parent programme: IN_PROGRESS / PARTIAL. No parent-completion, strict-EXACT, DEV/NEXT/production, organizational-approval or previously-unknown-defect claim.
