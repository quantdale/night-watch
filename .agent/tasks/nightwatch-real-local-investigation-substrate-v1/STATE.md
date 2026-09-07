# Task State

## Identity

Task ID: nightwatch-real-local-investigation-substrate-v1
Phase: W7_REAL_LOCAL_INVESTIGATION_SUBSTRATE
Status: COMPLETE
Starting SHA: 9cb2ec76cc026eed093e86d2758f795ff018ad8a
Last validated implementation SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
Last substantive checkpoint SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
Live HEAD authority: GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: W7 complete — real owner-local sensing, shared deterministic reproduction, and mechanical dossier admission run on the normal campaign path; full local and clean-clone certification passed
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 9cb2ec76cc026eed093e86d2758f795ff018ad8a
LAST_VALIDATED_IMPLEMENTATION_SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Make the normal Nightwatch autonomous campaign path consume real owner-local source/intelligence/evidence/reproduction through shared safe providers, then prove one historical reproduced defect through that same product path.

## Current Milestone

COMPLETE — M0 through M9 are closed. W7 is finished; the parent programme remains IN_PROGRESS for its own terminal criteria.

## Completed Milestones

- M0: reconciled the owned orchestrator session with origin/main, inspected the product/benchmark seams, and reproduced the encoded semantic split with the 46-test focused baseline.
- M1: `bin/lib/programme-state.mjs` validates durable programme state from raw bytes (duplicate-key scan BEFORE `JSON.parse`, then envelope/lane/task/role identity checks) and is wired into `bin/agent-state.mjs` for every discovered `PROGRAMME.json`; `tests/unit/programmeState.test.ts` covers the historical duplicate-`E` shape, cross-lane duplicate task ids/roles, escaped key-like strings, and bounded malformed diagnostics.
- M2: `src/core/localInvestigation/types.ts` froze the only shared provider/context/history/reproduction contracts before any lane wrote implementation.
- M3: `createOwnerLocalInvestigationContext` + `createLocalInvestigationToolSession` serve the normal campaign path: bounded real source index, digest-verified selected reads, real System Map from `discoverSourceSurfaces` via the extracted `systemMapInputFromDiscovery`, owner-private Bug Atlas snapshot/miner, explicit-real-only System Atlas, and sanitized evidence. A BLOCKED provider is `ADAPTER_UNAVAILABLE`; no fixture ever substitutes for real data.
- M4: `src/core/localInvestigation/historical.ts` moved the benchmark's pre-fix source and contained-replay capability behind the shared `DeterministicReproductionProvider`; `benchmark/hunt.ts` now runs through the same session executor, `createPreFixViewExecutor` is a thin compatibility wrapper, reproduction requires an inspected source path plus its observed evidence ref, and replay audit/stderr stays harness-side.
- M5: `src/core/localInvestigation/admission.ts` derives reproduction count, evidence refs, provenance and dossier authority from runtime state plus tool-session receipts; forged `reproductionCount`, invented evidence refs, unlinked/ENVIRONMENT_BLOCKED receipts and missing proposals return typed refusals instead of a dossier. `REQUEST_FINDING_PROPOSAL` no longer builds a dossier at all — it captures a presentation-only draft.
- M6: `classifyVerifiedBenchmarkTier` adds `VERIFIED_ROOT_CAUSE_REDISCOVERY` (admitted + non-MISS score + mechanical reproduction + zero leakage) without touching EXACT constants or `scoreBenchmarkCandidate`.
- M7: `tests/unit/realLocalCampaignPath.test.ts` drives `runLocalCliCampaign` with an out-of-process CLI reasoner over a leak-isolated historical pre-fix surface: index → selected read → hypothesis → shared reproduction (pre-fix FAIL / post-fix PASS) → proposal → candidate, ending in `dossierStatus=VERIFIED_REPRODUCTION`, `reproductionCount=1`, and captured request traffic containing the visible source canary but never the hidden test path, fix SHA, or replay stderr.
- M8: bounded real-substrate campaigns executed through `bin/nightwatch-agent.mjs campaign run`: deterministic CLI (4 investigations, 12 tool actions, NO_PROGRESS) and live OpenCode Go (8 investigations, 24 reasoner calls, 26 tool actions, 0 provider failures, 595.5s, NO_PROGRESS). Neither fabricated a candidate or a dossier.
- M9: full regression, typecheck, hardening/agent/project/workspace checks, `gate:local` FULL PASS (11/11 groups, receipt `receipt:sha256:85ace28cea2d1e5de2af9723`) and `gate:clean` PASS on Node 20 (inner receipt `receipt:sha256:c6f3ecdc4d45b7494d961272`).

## Work In Progress

NONE.

## Exact Next Action

NONE — W7 is COMPLETE. Parent programme `nightwatch-autonomous-bug-hunting-programme-v1` continues from its own `exactNextAction`.

## Known facts from the initiating audit

These are observations to verify against live code before acting, not permission to skip recon:

- AgentRuntime, CLI reasoner gateway, typed tool protocol, Bug Atlas, System Atlas schema, historical benchmark, contained replay, and dossier builder exist.
- `localCampaign.ts` currently constructs the generic LOCAL tool executor without real source/System Map/evidence providers.
- generic Bug/System Atlas queries can fall back to synthetic/fixture data.
- benchmark historical hunts have a richer source/reproduction executor than the generic product path.
- generic `RERUN_SAFE_REPRODUCTION` validates a plan but does not itself execute the contained replay.
- parent `PROGRAMME.json` previously contained a duplicate `E` lane key; the documentation record has been repaired to preserve W1 `E` and W6 `E6`, but machine enforcement is still required.
- strict `EXACT_REDISCOVERY` currently requires the hidden failing-test path to appear in candidate text; keep this metric but add a separately meaningful verified root-cause/reproduction tier.
- final dossier building must be bound to mechanically observed reproduction/evidence, not model-asserted counts.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{SPEC,PLAN,STATE,REPORT}.md` | W7 contract, plan, continuity, evidence | DONE |
| `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` | parent milestone advance; restored protocol-conformant handoff header | DONE |
| `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/PROGRAMME.json` | W7 lane record and programme proof fields | DONE |
| `src/core/localInvestigation/types.ts`, `index.ts` | frozen shared contracts and exports | DONE |
| `src/core/localInvestigation/session.ts` | provider-backed stateful tool session | DONE |
| `src/core/localInvestigation/ownerLocal.ts` | real owner-local providers (source, System Map, Bug Atlas, System Atlas, evidence) | DONE |
| `src/core/localInvestigation/historical.ts` | historical pre-fix source + shared contained-replay reproduction provider | DONE |
| `src/core/localInvestigation/admission.ts` | mechanical finding admission gate | DONE |
| `src/core/agentRuntime/localCampaign.ts`, `bin/nightwatch-agent.mjs` | campaign path consumes the injected real context; results carry admissions | DONE |
| `src/core/benchmark/hunt.ts` | benchmark hunts run through the shared session/provider contract | DONE |
| `src/core/benchmark/score.ts` | additive verified tier; EXACT untouched | DONE |
| `src/core/systemMap/input.ts`, `src/controlCenter/adapters/systemMapAdapter.ts` | extracted the real System Map input builder for reuse | DONE |
| `bin/lib/programme-state.mjs`, `bin/lib/programme-state.d.mts`, `bin/agent-state.mjs` | durable programme identity validation | DONE |
| `bin/nightwatch-reasoner-print.mjs` | prompt teaches grounded reproduction and proposal capture | DONE |
| `config/synthetic-campaign.v1.json` | W7 suites certified in an authoritative gate lane | DONE |
| `tests/unit/{programmeState,localInvestigationProviders,localFindingAdmission,benchmarkVerificationTier,historicalProductPath,realLocalCampaignPath}.test.ts` | W7 acceptance suites | DONE |
| `tests/unit/{benchmark,containedTestReplay,projectState,plannerHandoff}.test.ts` | adapted to the shared session contract and new checker dependency | DONE |

## Validation Ledger

Command: `npm run session:status` before and after reconciliation
Result: PASS. Owned orchestrator worktree; canonical clean; foreign review-operations worktree remains STALE and untouched. Initial origin/main advanced to `9cb2ec76...`; `node bin/nightwatch-session.mjs reconcile` created local merge `130231b0...`.

Command: `npx playwright test tests/unit/agentTools.test.ts tests/unit/localCampaign.test.ts tests/unit/benchmark.test.ts --project=nightwatch --workers=1`
Result: PASS — 46 passed. M0 encoded baseline proving generic reproduction was validation-only and generic campaigns lacked real providers.

Command: `npx playwright test tests/unit/programmeState.test.ts`
Result: PASS — 7 passed (independent orchestrator rerun of the continuity lane).

Command: `npx playwright test tests/unit/localFindingAdmission.test.ts tests/unit/benchmarkVerificationTier.test.ts`
Result: PASS — 26 passed (independent orchestrator rerun of the admission lane).

Command: `npx playwright test tests/unit/localInvestigationProviders.test.ts tests/unit/historicalProductPath.test.ts`
Result: PASS — 29 passed after orchestrator repairs (explicit `LocalReproductionRequest` typing, `reproductionId` injection, temp replay roots, session-observed evidence retrieval, proposal capture without dossier building).

Command: `npx playwright test tests/unit/benchmark.test.ts tests/unit/containedTestReplay.test.ts tests/unit/historicalProductPath.test.ts tests/unit/benchmarkVerificationTier.test.ts`
Result: PASS — 61 passed (cross-lane benchmark/product parity).

Command: `npx playwright test tests/unit/localCampaign.test.ts tests/unit/reasonerPrint.test.ts tests/unit/localInvestigationProviders.test.ts tests/unit/localFindingAdmission.test.ts`
Result: PASS — 52 passed (campaign integration).

Command: `npx playwright test tests/unit/realLocalCampaignPath.test.ts`
Result: PASS — hermetic product-path proof with an injected replay result: `dossierStatus=VERIFIED_REPRODUCTION`, `reproductionCount=1`, zero hidden-truth leakage in captured reasoner requests. This is the deterministic regression; the REAL-engine proof below is the load-bearing one.

Command: `NIGHTWATCH_REAL_HISTORICAL_PROOF=1 npx playwright test tests/unit/realHistoricalProductPathProof.test.ts --project=nightwatch --workers=1`
Result: PASS in 1.4m — the load-bearing architecture proof. A REAL mined Bug Atlas record (`bugatlas-git-mobingilabs-ouchan-5985281b43cd`, mined read-only from `mobingilabs/ouchan`) was isolated into a leak-free pre-fix case (4 visible files) and run through `runLocalCliCampaign` with NO replay stub: index -> selected `services/billingd/services/billingsvc/childbillinggroup.go` -> hypothesis -> `RERUN_SAFE_REPRODUCTION` -> proposal -> candidate. The shared provider executed `runContainedTestReplay`, which materialized disposable pre-fix/post-fix trees from read-only Git plumbing and returned `REPRODUCED / PRE_FAIL_POST_PASS` in 72.7s. Mechanical admission derived `reproductionCount=1` and ignored the draft's forged `reproductionCount: 99`; the dossier carries `humanReviewRequired=true`, `externalPublication=PROHIBITED`, source `childbillinggroup.go`, and no hidden test path. `detectBenchmarkLeakage` returned `[]` and every hidden field (fixCommit, fixDiff, bugDescription, knownFailingTest, explanation) was absent from all captured reasoner requests. Default-skip verified: the same file reports `1 skipped` without the env flag.

Command: `node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h --max-turns=6 --id=w7-owner-local-smoke` (deterministic CLI, real owner-local context)
Result: 6 real tool actions — SOURCE_INDEX and SOURCE_FILE over `alphauslabs/blue-sdk-go`, real System Map COVERAGE_GAPS containing `mobingilabs/ouchan` source-fact operations, mined Bug Atlas records (`bugatlas-git-alphauslabs-blueapi-f71bc3757f84`), and an explicit System Atlas refusal that minted no evidence.

Command: `node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h --max-turns=4 --id=w7-endurance-real-substrate`
Result: NO_PROGRESS after 4 investigations / 12 actions on the real substrate; no candidate, no dossier.

Command: `node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h --max-turns=3 --id=w7-live-opencode-2` (live OpenCode Go print adapter)
Result: NO_PROGRESS after 8 investigations, 24 live reasoner calls, 26 actions, 0 provider failures, 595.5s wall. Real live reasoning on the real substrate; zero fabricated findings. An earlier 900s-bounded attempt was cut off by the command deadline, not by a harness or provider failure.

Command: `npm run typecheck`
Result: PASS.

Command: `npm test`
Result: PASS — 4378 passed / 0 failed / 14 skipped after repairing the 27 checker-fixture failures caused by the new `bin/lib/programme-state.mjs` dependency (fixtures now copy it).

Command: `npm run hardening:check`, `npm run workspace:check`, `npm run agent:check`, `npm run handoff:check`
Result: PASS. `handoff:check` initially FAILED with `HANDOFF_HEADER_UNKNOWN_FIELD` / `HANDOFF_REQUIRED_FIELD_MISSING` — a pre-existing regression inherited from the W7 handoff commit `98abb37`; the header was restored to the protocol contract rather than the checker loosened.

Command: `npm run gate:local`
Result: FULL PASS 11/11 groups at `e368f9255142d1b30dd66825d93f6f321ba6ecbf`, receipt `receipt:sha256:85ace28cea2d1e5de2af9723` (SEMANTIC_COMPATIBILITY 2067 passed / 0 failed, SYNTHETIC_CAMPAIGN 1194 passed / 0 failed, OWNER_PROVENANCE 91).

Command: `npm run gate:clean`
Result: PASS on Node 20 clean clone of `e368f925...`; `installResult=PASS`, `gateResult=PASS`, inner receipt `receipt:sha256:c6f3ecdc4d45b7494d961272`.

Command: sibling integrity check on `REPOSITORIES/mobingilabs/ouchan`
Result: HEAD `565f00a87fb7616cc23c45d4ffeabee38a41c65f` unchanged, porcelain digest `e70962729e91fa4760c3878e4fbde1b02f99437c507de112f20f25625c82e04e` unchanged, single worktree, both before and after the two real contained replays. The three stash entries are the owner's, all dated 2026-07-15, weeks before this session. Zero sibling mutation.

## Decisions Made During This Task

Decision: prioritize normal product-path real local sensing/reproduction over forcing `EXACT_REDISCOVERY=1` or a literal full-hour soak.
Reason: the product/benchmark capability split is the highest-value blocker to a credible general autonomous bug hunter.
Evidence/constraint: initiating repository audit plus child SPEC.

Decision: shared provider interfaces must be frozen before parallel delegated writes.
Reason: source/replay/admission lanes otherwise risk forking authority and recreating benchmark-private behavior.
Evidence/constraint: C-00 ownership discipline and parent programme parallelism rules.

Decision: freeze one `LocalInvestigationContext` seam with six narrow providers and one harness-only tool-session history rather than widening `AgentRuntime`.
Reason: the runtime remains provider-neutral; product and benchmark adapters share the same executor semantics; hidden replay audit data cannot enter reasoner envelopes.
Evidence/constraint: `AgentToolExecutor` is already the runtime seam, while the current product/benchmark split lives entirely in executor construction.

Decision: provider absence is a typed BLOCKED result; every context property is required.
Reason: optional fixture fallback recreated the exact claimed-real ambiguity W7 must remove.
Evidence/constraint: SPEC A-C and the current `bugAtlasFixtureCorpus()` / `createSyntheticSystemAtlasOverlay()` defaults.

## Discoveries

- Parent programme durable state previously reused lane key `E`; the record was repaired to preserve W1 `E` and W6 `E6`, and the duplicate shape is now mechanically rejected before `JSON.parse` by `bin/lib/programme-state.mjs` inside `agent:check`.
- Parent programme remains PARTIAL/IN_PROGRESS; W7 completion does not imply unknown-bug yield or DEV/NEXT proof.
- Live Git after reconciliation: local session `130231b0968cf68a89ab780e22d2512996c451e9`; origin/main `9cb2ec76cc026eed093e86d2758f795ff018ad8a`; canonical main `e94f9455cd9ee0fa6bc148747191d072bcad7ab4`.
- The existing sibling-source module already provides bounded, no-follow, admission-ledgered reads and enumeration. The owner-local source provider will adapt it rather than create a second filesystem authority.
- Bug Atlas already has an owner-private snapshot loader and bounded read-only miner. System Atlas has no real snapshot loader today; absence must remain explicit rather than synthetic.
- The generic `RERUN_SAFE_REPRODUCTION` no longer exists as a plan validator: the session refuses any reproduction whose `sourcePath`/`sourceEvidenceRef` pair was not produced by an inspection in the same session (`UNSAFE_INTENT`), so grounding precedes execution on both product and benchmark paths.
- `REQUEST_FINDING_PROPOSAL` previously built a dossier from the model draft; that self-certification path was removed. Only `admitLocalFinding` can produce a dossier, and only from harness-observed receipts.
- The real System Map input builder lived in the Control Center adapter (`systemMapInputFromDiscovery`); it is now `src/core/systemMap/input.ts` and re-exported, so campaigns and the Control Center share one derivation.
- The reasoner-visible source index must be bounded independently of the provider page size: the full approved universe serialized past `UNTRUSTED_BYTE_CAP` and arrived truncated mid-JSON, so the session caps it at 32 entries and reports `truncated`.
- Inherited regression found and fixed during certification: `.agent/EXECUTION_PROMPT.md` had drifted off the planner-handoff header contract at commit `98abb37`, so `handoff:check` and the HANDOFF_TRUTH gate group were already failing before W7 implementation.

## Blockers

NONE.

## Safety Events

NONE

## Authorization

IMPLEMENTATION AUTHORIZED:
- Nightwatch repository source/tests/contracts/CLI/docs/OpenSpec/task state.
- owner-local read-only source/history/evidence adapters.
- Bug Atlas/System Atlas local integration.
- deterministic local historical reproduction in disposable temp trees.
- synthetic/fabricated test repositories and fixtures.
- read-only sibling Git history/object reads needed by existing bounded replay/mining contracts.

NOT AUTHORIZED:
- DEV/NEXT/production contact.
- C-07, C-08b, C-12/C-13/C-14 live execution.
- Slack/Leslie/Pondr/Notion or any communication scraping.
- external issue/PR/Slack filing or comments.
- credential acquisition, deployment, secrets changes.
- sibling writes or mutation.
- force push/history rewrite/destructive recovery.

## Deferred / Follow-Up

- DEV/NEXT and previously unknown Alphaus bug yield remain outside this task.
- Communication-evidence Atlas population remains unauthorized.
- Literal full-hour live-provider soak is secondary until the real product substrate works.

## Resume Recipe

Task complete. Do not resume this task; the parent programme record `.agent/ACTIVE_TASK.md` owns the current milestone.

## Completion Snapshot

Completion status: COMPLETE
Terminal criteria: MET for W7 as specified. The normal `nightwatch-agent campaign run` path consumes real owner-local source/System Map/Bug Atlas/System Atlas/evidence through shared fail-closed providers, executes the shared deterministic reproduction provider, and can only emit a dossier through the mechanical admission gate.
Validated implementation checkpoint: e368f9255142d1b30dd66825d93f6f321ba6ecbf
Intermediate documentation descendant: 20a6b9e044e56756c791a952aab9ed6b2e26d0cd (planner-handoff header repair; an earlier gate pass was observed there before the real-proof harness landed)
Live head discovery: GIT
Certification: `npm test` 4378 passed / 14 skipped; `npm run typecheck` PASS; hardening/workspace/agent/project/handoff checks PASS; `gate:local` FULL PASS receipt `receipt:sha256:85ace28cea2d1e5de2af9723`; `gate:clean` PASS on Node 20 inner receipt `receipt:sha256:c6f3ecdc4d45b7494d961272`.
Product-path proof: one historical pre-fix defect reproduced through the ordinary campaign machinery (`dossierStatus=VERIFIED_REPRODUCTION`, `reproductionCount=1`) with zero hidden-ground-truth leakage and zero sibling mutation.
Not claimed: previously unknown Alphaus bug discovery, EXACT rediscovery, DEV/NEXT execution, production contact, or parent programme completion.
