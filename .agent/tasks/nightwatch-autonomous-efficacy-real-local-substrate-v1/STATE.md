# STATE — nightwatch-autonomous-efficacy-real-local-substrate-v1

## Identity

Task ID: nightwatch-autonomous-efficacy-real-local-substrate-v1
Phase: W8_AUTONOMOUS_EFFICACY_REAL_LOCAL_SUBSTRATE
Status: COMPLETE
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
Last validated implementation SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Last substantive checkpoint SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Live HEAD authority: GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: W8 complete — bounded investigation/campaign memory, mechanical verification readiness, fixed-corpus before/after evidence, two live-provider proofs, full local and clean-clone certification
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
LAST_VALIDATED_IMPLEMENTATION_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W8_AUTONOMOUS_EFFICACY_REAL_LOCAL_SUBSTRATE_STATUS: COMPLETE

## Objective

Raise autonomous investigation efficacy on the already-proven W7 real local substrate. Preserve W7 sensing/reproduction/admission architecture; improve bounded reasoning memory, target diversity, hypothesis quality, verification readiness, reproduction targeting, and measured live-provider progress.

## Current Milestone

COMPLETE — M0 through M9 are closed. W8 is finished. The parent programme remains IN_PROGRESS for its own separate terminal criteria.

## Completed Milestones

- M0 live truth + baseline: canonical checkout was behind `origin/main`; fast-forwarded. Session worktree reconciled to `97c6536`. The four initiating hypotheses were CONFIRMED by reading live code, not assumed — see `## Discoveries`. Pre-change baseline captured with `node bin/efficacy-corpus.mjs baseline`.
- M1 shared-contract freeze, integrated at `87f0ded13e3d16b4130abeadfd95fa88aba04b61`: `src/core/investigationMemory/**` (bounded memory + campaign strategy contracts and their pure derivation), `reasoner-turn-request.v2` carrying `observation.memory`, an executor-confirmed target ledger and mechanical hypothesis lifecycle in `AgentRuntime`, memory-fact emission from the shared tool session, campaign-strategy threading and fail-closed resume in `localCampaign`, and the `src/core/efficacy/**` fixed-corpus before/after harness.
- M2 runtime working memory: a stateless turn now receives inspected targets WITH their grounding evidence refs, salient symbols, hypothesis progress, reproduction readiness, stagnation risk and deterministic advisory directives.
- M3 cross-investigation strategy: `runLocalCliCampaign` accumulates `nightwatch.campaign-strategy-state.v1` (inspected/unproductive/reproduced targets, candidate ids, stagnant investigations, prior outcomes), threads it into each fresh `AgentRuntime`, exposes it on `LocalCampaignResult`, and restores it fail-closed on resume.
- M4 verification/reproduction readiness: `ReproductionReadiness` and the `HypothesisProgress` ladder are derived from observed results only; `SUPPORTED`/`DISPROVED` transitions require an observed `REPRODUCED`/`NOT_REPRODUCED` verdict.
- M5 print/CLI reasoner contract: `bin/nightwatch-reasoner-print.mjs` renders the bounded memory (targets with refs, hypothesis progress, readiness, exhausted targets, directives) instead of one rigid scripted sequence, inside the existing byte caps and untrusted-quoting rules.
- M6 efficacy harness: `bin/efficacy-corpus.mjs baseline|candidate|compare` over `nightwatch.efficacy-corpus.v2` (13 cases, 2 negative controls, multi-file/multi-surface cases), one investigator policy, one commit, differing only by the mechanical `projectRequestToW7` projection.
- M7 integration review: five delegated lanes reviewed by diff and re-validated AFTER reconciliation, never accepted from worker reports — worker SHAs `fe4033fa` (memory proof), `c33535a` (campaign diversity), `20fbd08` (print adapter), `e1b3c087` (efficacy depth), `9352bac5` (leakage proof).
- M8 live-provider proof: the opt-in leak-isolated historical proof reached `VERIFIED_ROOT_CAUSE_REDISCOVERY` with mechanical reproduction on two of three cases and left the negative control candidate-free; two real owner-local campaigns ran on the W7 substrate and honestly produced no admitted finding.
- M9 certification at `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`: full regression, static checks, `gate:local` FULL PASS and `gate:clean` PASS on a fresh Node 20 clone — see `## Validation Ledger`.

## Work In Progress

NONE.

## Exact Next Action

NONE — W8 is COMPLETE. Parent programme `nightwatch-autonomous-bug-hunting-programme-v1` continues from its own `exactNextAction`.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/investigationMemory/**` | Frozen bounded memory + campaign strategy contract and derivation | DONE |
| `src/core/agentProtocol/{reasoner,runtime,versions}.ts` | `reasoner-turn-request.v2`; additive action-record/state fields; `detectExhaustedAction` | DONE |
| `src/core/agentRuntime/{runtime,types,checkpoint}.ts` | Target ledger, memory facts, mechanical hypothesis lifecycle, exhausted-repeat guard, additive checkpoint validation | DONE |
| `src/core/agentRuntime/localCampaign.ts` | Campaign strategy accumulation, hand-off, fail-closed resume, `campaignStrategy` result field | DONE |
| `src/core/localInvestigation/session.ts` | Memory-fact emission (approved targets, salient symbols, reproduction/proposal subjects) | DONE |
| `src/core/benchmark/hunt.ts` | Additive harness-side `runtimeState`/`investigationHistory` for instrumentation | DONE |
| `src/core/efficacy/**`, `bin/efficacy-corpus.mjs`, `package.json` | Fixed-corpus before/after efficacy harness and its scripts | DONE |
| `bin/nightwatch-reasoner-print.mjs` | Memory-aware provider-neutral prompt | DONE |
| `tests/unit/{investigationMemory,investigationMemoryAdversarial,investigationMemoryLeakage,campaignStrategyMemory,efficacyCorpus,liveProviderEfficacyProof}.test.ts` | W8 acceptance and adversarial suites | DONE |
| `tests/unit/{agentRuntime,reasonerPrint,reasonerCli,localFindingAdmission}.test.ts` | Guard regression plus fixture updates for the additive fields | DONE |
| `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/**` | W8 contract, plan, continuity, evidence | DONE |
| `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md`, parent `PROGRAMME.json`/`STATE.md`/`REPORT.md`, `docs/CURRENT_STATE.md` | Programme truth advance | DONE |

## Validation Ledger

Command: `node bin/efficacy-corpus.mjs baseline` then `compare` on `nightwatch.efficacy-corpus.v2` (13 cases, 2 negative controls)
Result: baseline -> candidate: unique source targets 13 -> 31, grounded hypotheses 0 -> 17, verification-ready 0 -> 17, grounded reproduction attempts 0 -> 17 (0 refused), mechanical reproductions 0 -> 6, candidates admitted 0 -> 6, disproved hypotheses 0 -> 6, `VERIFIED_ROOT_CAUSE_REDISCOVERY` 0 -> 3, false positives 0 -> 0, leaked cases 0 -> 0, repeat source reads 0 -> 0, redundant index requests 0 -> 0, EXACT 0 -> 0 (unchanged), outcomes 13x`MISS` -> 3 `PARTIAL_REDISCOVERY` / 5 `SAME_ROOT_CAUSE_ALTERNATE` / 5 `MISS` / 0 `FALSE_POSITIVE`. Costs that rose: reasoner calls 39 -> 102, tool actions 26 -> 67, stagnation terminations 0 -> 1.

Command: 21 focused agent/memory/campaign/reasoner/benchmark/reproduction suites at the final head
Result: PASS — 248 passed, 0 failed.

Command: `NIGHTWATCH_LIVE_PROVIDER_PROOF=1 … npx playwright test tests/unit/liveProviderEfficacyProof.test.ts` (opencode-go/deepseek-v4-flash print mode)
Result: PASS in 7.5 min. `bench-billing-rounding-001`: 7 reasoner calls, `COMPLETE_WITH_FINDING`, 1 grounded hypothesis, 1 grounded reproduction attempt, 1 mechanical reproduction, 1 admitted candidate, `PARTIAL_REDISCOVERY`/`VERIFIED_ROOT_CAUSE_REDISCOVERY`, leaked=[]. `efficacy-billing-multifile-001`: 12 calls, 6 unique targets, 4 grounded hypotheses, 4 grounded reproduction attempts, 4 mechanical reproductions, 1 admitted candidate, `PARTIAL_REDISCOVERY`/`VERIFIED_ROOT_CAUSE_REDISCOVERY`, leaked=[]. Negative control `bench-negative-quiet-000`: `COMPLETE_NO_FINDING`, zero candidates, `MISS`, leaked=[]. EXACT 0 on all three.

Command: `node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h --max-turns=12 --id=w8-owner-local-live` (live opencode-go, real owner-local substrate)
Result: 3 investigations, 31 reasoner calls, 24 tool actions, 0 provider failures, 831.6s, `BUDGET_EXHAUSTED` (cumulative `outputBytes` 2,879,326 over the 2,000,000 ceiling), 13 unique real source targets with 0 repeat reads, 5 grounded hypotheses, 0 candidates, `dossierStatus=NONE`. Seven `RERUN_SAFE_REPRODUCTION` executions all returned `TOOL_ERROR`, and ONE argument digest was executed three times (turns 4, 6, 8 of `inv:0`).

Command: same command with `--id=w8-owner-local-live-2` after the repeat-guard fix
Result: 3 investigations, 28 reasoner calls, 23 tool actions, 0 provider failures, 795.5s, `BUDGET_EXHAUSTED` (`outputBytes` 1,808,741), 10 unique targets, 5 grounded hypotheses, 1 candidate proposed. The repeated failed fingerprint was blocked as `DEDUPED_REPEAT` instead of re-executed. Admission REFUSED the candidate: `MISSING_REPRODUCTION`, `reproductionCount=0`, `dossierStatus=REFUSED_NO_REPRODUCTION`. Zero dossiers, zero fabricated findings.

Command: `NIGHTWATCH_REAL_HISTORICAL_PROOF=1 npx playwright test tests/unit/realHistoricalProductPathProof.test.ts`
Result: PASS in 2.0 min at the final head — the W7 real mined `mobingilabs/ouchan` contained replay through `runLocalCliCampaign` is unbroken by W8.

Command: `npm test`
Result: PASS at `3d624fb` — 4429 passed, 0 failed, 15 skipped.

Command: `npm run typecheck`, `npm run hardening:check`, `npm run agent:check`, `npm run project:check`, `npm run workspace:check`, `npm run session:check`
Result: PASS at `3d624fb`. `agent:check` PASS with 4 warnings: `STALE_IMPLEMENTATION_BASELINE` (expected — the recorded baseline was still the W7 SHA until this document landed), 31 legacy v1 historical tasks, the foreign STALE `nightwatch-review-operations-his-7431812c` worktree, and `WORKSPACE_BASE_STALE` before integration.

Command: `npm run gate:local`
Result: FULL PASS 11/11 groups at `3d624fb`, receipt `receipt:sha256:0d892de64df3e499898a8289` (SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed, SYNTHETIC_CAMPAIGN 1194 passed / 0 failed, OWNER_PROVENANCE 91).

Command: `npm run gate:clean`
Result: PASS on a fresh Node 20 clone of `3d624fb` with no reused `node_modules`; `installResult=PASS`, `gateResult=PASS`, inner receipt `receipt:sha256:c6737eb5be31ce52f13647c4`.

Command: integration verification
Result: `git push origin HEAD:refs/heads/main` fast-forwarded; local HEAD and `origin/main` both `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`. No force push, no rebase, no history rewrite.

Command: sibling integrity check
Result: `alphauslabs/blue-sdk-go` HEAD `8883ee3d3a073352626c8c35e20e9fc5ed765373` with only its pre-existing untracked `AGENTS.md`; the real historical proof asserts `mobingilabs/ouchan` is unmutated. Zero sibling writes.

## Decisions Made During This Task

Decision: Measure before/after with ONE investigator policy, ONE corpus and ONE commit, differing only by a mechanical `projectRequestToW7` projection of the turn request.
Reason: comparing across commits or across model behaviour confounds the measurement. The projection is data (`W7_OBSERVATION_FIELDS`) so a test can prove the baseline surface is faithful rather than a convenient subset.

Decision: The simulated investigator reads ONLY the turn request, keeps no state between turns, and deliberately IGNORES host `directives`.
Reason: it must measure the information sufficiency of the contract, not the host answering the question for the model.

Decision: The investigator never infers a (path, evidenceRef) pairing by position.
Reason: that pairing is not derivable from a W7 request at all, and a positional guess would flatter the baseline while the host still refused the reproduction.

Decision: Working memory is DERIVED per turn and never persisted.
Reason: a checkpoint can then never carry a stale or forged memory, and there is no second authority to keep in sync with runtime state.

Decision: Only the executor may name a target; only a SUCCESSFUL source-surface result promotes one to "approved".
Reason: raw model arguments must not be able to inject an approved target. A refused read still names its subject so memory can mark it exhausted.

Decision: `reasoner-turn-request` bumped to `v2` rather than adding an optional field.
Reason: the reasoner-visible payload changed materially; an honest version boundary beats a silently-optional field consumers may ignore.

Decision: Hypothesis strength transitions are mechanical, with no new intent kind.
Reason: deriving `SUPPORTED`/`DISPROVED` from observed reproduction verdicts keeps Nightwatch the authority over what evidence counts.

Decision: The exhausted-repeat guard blocks a fingerprint that has EVER returned `TOOL_ERROR`/`DEDUPED_REPEAT` in the session, not merely a consecutive streak.
Reason: a tool call is deterministic in its own argument digest within a session, so repeating a call that already failed cannot yield new evidence. A justified re-check carries different arguments and a different digest, so it remains admissible.

Decision: Report the metrics that got worse (reasoner calls, tool actions, one stagnation termination) rather than only the improvements.
Reason: the SPEC forbids declaring efficacy from volume; an honest cost column is part of the evidence.

## Discoveries

Confirmed against live code before any change:

- `AgentRuntime.buildRequest()` sent only `phase`, `untrusted`, `evidenceRefs`, `allowedToolIds`, `allowedIntentKinds` and the budget. No hypotheses, no candidate ids, no action history, no target state.
- `pendingUntrusted` is CLEARED after each request, so a bounded source index was visible for exactly one turn and then unrecoverable. This is the concrete mechanism behind "the reasoner repeatedly asks for source indexes".
- The `(sourcePath, sourceEvidenceRef)` pair that `session.runReproduction` requires was NOT derivable from any W7 request field: the `SOURCE_FILE` envelope carries no evidence ref and `observation.evidenceRefs` is an unlabelled list. A stateless reasoner therefore could not reach verification at all, which explains `NO_PROGRESS` with zero candidates far better than "the model wandered".
- `AgentHypothesis.status` was only ever written as `'OPEN'`, so "disprove weak hypotheses" was unrepresentable.
- `DEDUPED_REPEAT` silently discarded a repeated call with no feedback reaching the reasoner.
- `localCampaign.runOneInvestigation` builds a fresh `AgentRuntime` AND a fresh tool session per investigation; accumulators were merged only for final admission and never fed forward.
- The print prompt encoded one rigid scripted sequence and rendered the whole request as raw JSON.

Found while implementing:

- The first target-ledger implementation learned the `REQUEST_FINDING_PROPOSAL` candidate id as an approved source target, so the investigator tried to `INSPECT_SOURCE_SURFACE` a candidate id, looped on `TOOL_ERROR`/`DEDUPED_REPEAT` and terminated `NO_PROGRESS` after earning a reproduction. Fixed by restricting promotion to successful source-surface tools. Caught by tracing the action log, not by a passing test.
- `extractSalientSymbols`' path pattern truncated ordinary identifiers (`lines.reduce` -> `lines.reduc`). Fixed with a non-letter lookahead so only real file-extension tokens match.
- The harness investigator enumerated new targets before admitting the current one, losing a turn per case. Fixed at `5dd8ee9`.
- The inherited W8 task documents never passed `npm run agent:check` (10 continuity errors). Repaired rather than relabelled.
- Live-campaign forensics found a REAL runtime defect that no synthetic fixture exposed: `detectRepeatedAction` only inspected a CONSECUTIVE streak, so one reproduction fingerprint was executed three times with productive reads in between. Reproduced as a failing test first, then fixed at `3d624fb`.
- The live campaigns terminate `BUDGET_EXHAUSTED` on the cumulative `outputBytes` ceiling, not on wall time or reasoner calls. That is the budget working as specified, not a stall.

## Blockers

NONE repository-owned. Live-provider quota was available and both live proofs executed.

## Safety Events

Event: three `_edit` calls intended for the session worktree resolved against the CANONICAL checkout (relative paths resolve from the process cwd) — two touching `src/core/benchmark/hunt.ts`, one touching `tests/unit/agentRuntime.test.ts`.
Response: each detected immediately with `git status`, reverse-applied with `git apply -R` on that single self-authored path, canonical verified clean, and every later edit used absolute session-worktree paths. No commit was ever created in the canonical checkout, and no other worktree, branch or sibling repository was touched.

## Deferred / Follow-Up

- Strict `EXACT_REDISCOVERY` remains 0 and deliberately unchanged; hidden failing-test names were never leaked to raise it.
- A previously unknown Alphaus defect remains unproven; the live owner-local candidate was mechanically refused for missing reproduction, which is the correct outcome, not a discovery.
- Contained real-replay coverage beyond the already-proven mined ouchan case.
- A full HOUR_1 wall-clock live campaign: both live runs ended on the `outputBytes` ceiling first.
- DEV/NEXT/production execution remains unauthorized.

## Resume Recipe

Task complete. Do not resume this task; the parent programme record `.agent/ACTIVE_TASK.md` owns the current milestone.

## Completion Snapshot

Completion status: COMPLETE
Terminal criteria: MET for W8 as specified in `SPEC.md` `## Completion criteria` 1-7. Bounded durable investigation memory reaches stateless CLI turns; fresh investigations receive bounded campaign strategy memory; verification/reproduction readiness is mechanically derived and leak-free; the fixed corpus shows material improvement with zero added false positives; one live-provider historical run reached mechanically verified root-cause rediscovery on two cases; one real owner-local live campaign made diversified grounded progress and honestly admitted nothing; every safety and certification gate passes.
Validated implementation checkpoint: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Live head discovery: GIT
Certification: `npm test` 4429 passed / 0 failed / 15 skipped; typecheck/hardening/agent/project/workspace/session PASS; `gate:local` FULL PASS 11/11 receipt `receipt:sha256:0d892de64df3e499898a8289`; `gate:clean` PASS on a fresh Node 20 clone, inner receipt `receipt:sha256:c6737eb5be31ce52f13647c4`.
Not claimed: previously unknown Alphaus bug discovery, `EXACT_REDISCOVERY`, DEV/NEXT execution, production contact, organizational approval, or parent programme completion.
