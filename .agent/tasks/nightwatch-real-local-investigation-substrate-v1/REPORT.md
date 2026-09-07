# REPORT — nightwatch-real-local-investigation-substrate-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1

## Starting truth

Session base `9cb2ec76cc026eed093e86d2758f795ff018ad8a` (origin/main at task start), reconciled into the owned session worktree `session/nightwatch-autonomous-bug-huntin-725fbbbe`. Certified implementation checkpoint: `20a6b9e044e56756c791a952aab9ed6b2e26d0cd`. Live HEAD is always discovered from Git.

## Mission

Connect the normal autonomous campaign path to real owner-local source/System Map/Bug Atlas/System Atlas/evidence/reproduction, unify product and historical benchmark tool semantics, mechanically ground final dossier admission, repair durable programme identity ambiguity, and prove at least one leak-free historical reproduced defect through that same normal product path.

## What changed

One shared seam replaced the product/benchmark capability split:

- `src/core/localInvestigation/types.ts` — the only shared provider/context/history/reproduction contract, frozen before any lane wrote code.
- `src/core/localInvestigation/session.ts` — one stateful `AgentToolExecutor` over that context. Bounded source index (capped at 32 reasoner-visible entries, `truncated` reported), digest-verified single-file reads, real System Map projections, Bug/System Atlas retrieval with no fixture fallback, re-sanitized evidence, grounded reproduction, capture-only finding proposals. A BLOCKED provider is `ADAPTER_UNAVAILABLE`; a provider that throws is also fail-closed. Provider `audit` payloads never enter envelopes or history.
- `src/core/localInvestigation/ownerLocal.ts` — real owner-local providers built only from existing engines: confined sibling-source access + approved scan, `discoverSourceSurfaces` for the System Map, owner-private Bug Atlas snapshot then bounded read-only miner, explicit-real-only System Atlas (synthetic concept ids are refused at construction), strict configured evidence mapping, injected-or-blocked reproduction.
- `src/core/localInvestigation/historical.ts` — the benchmark's pre-fix source view and contained test replay behind the same `LocalSourceProvider`/`DeterministicReproductionProvider` contract, with hidden replay coordinates and stderr retained harness-side.
- `src/core/localInvestigation/admission.ts` — the single gate that can produce a dossier, deriving reproduction count, evidence refs, provenance and authority from runtime state plus session receipts.
- `src/core/agentRuntime/localCampaign.ts` + `bin/nightwatch-agent.mjs` — the ordinary `campaign run` / `campaign resume` path builds one session per investigation from an injected `LocalInvestigationContext` (the CLI injects the real owner-local context) and reports `findingAdmissions`, `reproductionCount`, and a `dossierStatus` that can reach `VERIFIED_REPRODUCTION` only mechanically.
- `src/core/benchmark/hunt.ts` — historical hunts run through the shared session; `createPreFixViewExecutor` is now a thin compatibility wrapper; `reproductionCount` derives from session receipts (REPRODUCED only).
- `src/core/benchmark/score.ts` — additive `classifyVerifiedBenchmarkTier`; EXACT constants and `scoreBenchmarkCandidate` untouched.
- `src/core/systemMap/input.ts` — the real System Map input derivation extracted from the Control Center adapter and re-exported, so campaigns and the Control Center share one derivation.
- `bin/lib/programme-state.mjs` (+ `.d.mts`) wired into `bin/agent-state.mjs` — durable programme state is validated from raw bytes, rejecting duplicate lane keys before `JSON.parse` and rejecting ambiguous task/role identities.

## Evidence ledger

- Independent lane review: every delegated diff was read (not summarized) before integration; four lane commits were cherry-picked into the orchestrator session (`13313b5`, `f0d4077`, `2604852`, `153cb1d`) and each lane's acceptance suite was rerun by the orchestrator after reconciliation.
- Orchestrator repairs applied on top of lane work: strict single-shape `classifyVerifiedBenchmarkTier`; explicit `LocalReproductionRequest` typing; `reproductionId` injection for bare benchmark RERUN calls; temp replay roots in historical tests; session-observed evidence retrieval; removal of dossier building from `REQUEST_FINDING_PROPOSAL`; provider evidence/provenance ref shape validation; bounded reasoner-visible source index; `bin/lib/programme-state.d.mts` for typecheck; checker fixtures now copy the new validator.
- Real-substrate campaign (deterministic CLI, `w7-owner-local-smoke`): SOURCE_INDEX and SOURCE_FILE over `alphauslabs/blue-sdk-go`, System Map `COVERAGE_GAPS` containing real `mobingilabs/ouchan` source-fact operations, mined Bug Atlas records (`bugatlas-git-alphauslabs-blueapi-f71bc3757f84`), and a System Atlas refusal that minted no evidence.
- Endurance sanity: deterministic CLI 4 investigations / 12 actions → NO_PROGRESS; live OpenCode Go 8 investigations / 24 reasoner calls / 26 actions / 0 provider failures / 595.5s → NO_PROGRESS. No candidate or dossier was fabricated in either run.
- Product-path historical proof (`tests/unit/realLocalCampaignPath.test.ts`): out-of-process CLI reasoner over a leak-isolated pre-fix surface reaches `dossierStatus=VERIFIED_REPRODUCTION`, `reproductionCount=1`, dossier `externalPublication=PROHIBITED`, with captured request traffic containing the visible source canary and never the hidden test path, fix SHA, or replay stderr.
- Regression honesty: the first full-suite run after integration reported 27 failures in `projectState`/`plannerHandoff`; root cause was the new `bin/lib/programme-state.mjs` dependency missing from their synthetic checker fixtures. Fixed by copying the file into the fixtures, not by loosening a checker. `handoff:check` was already failing at the session base because the W7 handoff commit `98abb37` had drifted off the header contract; the header was restored.

## Required final truth table

| Claim | Final status | Evidence |
|---|---|---|
| Generic campaign can enumerate/read approved real local source | PROVEN | `w7-owner-local-smoke` SOURCE_INDEX + SOURCE_FILE on `alphauslabs/blue-sdk-go`; `tests/unit/localInvestigationProviders.test.ts` |
| Generic campaign uses real System Map when available | PROVEN | COVERAGE_GAPS projection containing real ouchan source-fact operations; BLOCKED when no CURRENT repository exists |
| Generic campaign uses real Bug Atlas rather than fixture fallback | PROVEN | mined `bugatlas-git-*` records; `DATA_BLOCKED` when neither snapshot nor mined history exists, asserted fixture-free |
| Generic campaign distinguishes real vs synthetic System Atlas | PROVEN | `NOT_CONFIGURED` refusal minted no evidence in the live run; synthetic concept ids rejected at construction |
| Generic campaign retrieves only sanitized real evidence | PROVEN | secret-shaped evidence redacted before envelopes; unknown refs `ADAPTER_UNAVAILABLE` |
| Product path executes shared deterministic reproduction | PROVEN | `realLocalCampaignPath` and `historicalProductPath` execute the shared provider; grounding gate refuses ungrounded calls |
| Benchmark and product reuse the same reproduction/provider contract | PROVEN | `benchmark/hunt.ts` runs through `createLocalInvestigationToolSession`; 61 benchmark/replay tests pass |
| reproductionCount is mechanically derived, not model supplied | PROVEN | forged `reproductionCount: 99` refused (`MISSING_REPRODUCTION`) and ignored when a real receipt exists |
| Final dossier requires observed reproduction/evidence | PROVEN | typed refusals for unknown candidate, missing proposal, invented evidence, unlinked/blocked reproduction |
| Historical defect reproduced through normal product path | PROVEN | `dossierStatus=VERIFIED_REPRODUCTION`, `reproductionCount=1` via `runLocalCliCampaign` |
| Hidden ground truth leakage remains zero | PROVEN | captured request traffic assertions; `assertNoBenchmarkLeakage` still fail-closed |
| Sibling repository mutation remains zero | PROVEN | ouchan HEAD `565f00a8...` and porcelain digest `e7096272...` unchanged, single worktree |
| Duplicate/ambiguous programme identity repaired and machine-checked | PROVEN | `bin/lib/programme-state.mjs` in `agent:check`; 7 validator tests |
| Full regression | PROVEN | `npm test` 4378 passed / 13 skipped |
| gate:local | PROVEN | FULL PASS 11/11, receipt `receipt:sha256:8205a52e13f74763a855dc41` |
| gate:clean | PROVEN | Node 20 clean clone PASS, inner receipt `receipt:sha256:c44ac4ba9ed23d2d5fbf6167` |

## Non-claims

- No previously unknown Alphaus bug was discovered.
- No `EXACT_REDISCOVERY` was achieved; the strict metric is unchanged and still 0.
- No DEV/NEXT/production contact, no credential acquisition, no external filing.
- Live-provider efficacy remains unproven: real campaigns terminated `NO_PROGRESS` without candidates.
- The parent autonomous programme is not complete.

## Programme verdict

`IN_PROGRESS` — W7 closed the product/benchmark substrate gap; parent terminal criteria remain open.
