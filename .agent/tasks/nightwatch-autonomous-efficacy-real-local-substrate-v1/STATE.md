# STATE — nightwatch-autonomous-efficacy-real-local-substrate-v1

## Identity

Task ID: nightwatch-autonomous-efficacy-real-local-substrate-v1
Phase: W8_AUTONOMOUS_EFFICACY_REAL_LOCAL_SUBSTRATE
Status: IN_PROGRESS
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Starting SHA: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
Last validated implementation SHA: 87f0ded13e3d16b4130abeadfd95fa88aba04b61
Last substantive checkpoint SHA: 87f0ded13e3d16b4130abeadfd95fa88aba04b61
Live HEAD authority: GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: M0 baseline captured and M1 shared-contract freeze integrated
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 4b3b183e07a9a348b8904f618a3bc35e4990df1c
LAST_VALIDATED_IMPLEMENTATION_SHA: 87f0ded13e3d16b4130abeadfd95fa88aba04b61
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 87f0ded13e3d16b4130abeadfd95fa88aba04b61
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_W8_AUTONOMOUS_EFFICACY_REAL_LOCAL_SUBSTRATE_STATUS: IN_PROGRESS

## Objective

Raise autonomous investigation efficacy on the already-proven W7 real local substrate. Preserve W7 sensing/reproduction/admission architecture; improve bounded reasoning memory, target diversity, hypothesis quality, verification readiness, reproduction targeting, and measured live-provider progress.

## Current Milestone

Milestone ID: M7
Milestone status: IN_PROGRESS
What is being attempted: independent orchestrator review and integration of the five delegated lanes (memory proof, campaign diversity, print adapter, efficacy depth, leakage proof), then post-integration measurement, live-provider proof, and full certification.

## Completed Milestones

- M0 live truth + baseline: canonical checkout was behind `origin/main`; fast-forwarded. `origin/main` had advanced to `97c6536` (a prior session's W8 planning commits). Session worktree `nightwatch-autonomous-bug-huntin-725fbbbe` reconciled to that head. The four initiating hypotheses were CONFIRMED by reading live code, not assumed — see `## Discoveries`. Pre-change baseline captured on the fixed corpus with `node bin/efficacy-corpus.mjs baseline`.
- M1 shared-contract freeze, integrated at `87f0ded13e3d16b4130abeadfd95fa88aba04b61`: `src/core/investigationMemory/**` (bounded memory + campaign strategy contracts and their pure derivation), `reasoner-turn-request.v2` carrying `observation.memory`, an executor-confirmed target ledger and mechanical hypothesis lifecycle in `AgentRuntime`, memory-fact emission from the shared tool session, campaign-strategy threading and fail-closed resume in `localCampaign`, and the `src/core/efficacy/**` fixed-corpus before/after harness.
- M2 runtime working memory: implemented inside the freeze. A stateless turn now receives inspected targets WITH their grounding evidence refs, salient symbols, hypothesis progress, reproduction readiness, stagnation risk and deterministic advisory directives.
- M4 verification/reproduction readiness: `ReproductionReadiness` and the `HypothesisProgress` ladder are derived from observed results only; `SUPPORTED`/`DISPROVED` transitions require an observed `REPRODUCED`/`NOT_REPRODUCED` verdict.
- M6 (first pass) efficacy harness: `bin/efficacy-corpus.mjs baseline|candidate|compare` runs the same stateless investigator policy over the same fixed corpus at one commit, with the baseline mechanically projected down to the frozen W7 request field set.

## Work In Progress

Five delegated lanes are running, each in its own C-00 session worktree, all based on `87f0ded`:

- `nightwatch-w8-memory-proof-lane-v1` — memory derivation + adversarial tests.
- `nightwatch-w8-campaign-diversity-lane-v1` — cross-investigation strategy/diversity/resume proof.
- `nightwatch-w8-prompt-adapter-lane-v1` — memory-aware print-mode prompt.
- `nightwatch-w8-efficacy-depth-lane-v1` — multi-target corpus, salient-grounded statements, before/after assertions.
- `nightwatch-w8-leakage-proof-lane-v1` — proof that memory cannot carry hidden truth or mint credit.

## Exact Next Action

Review each lane diff directly (never accept its report), cherry-pick into this session worktree, rerun each lane's acceptance suite AFTER reconciliation, then re-measure the fixed corpus, attempt the bounded live-provider proof, and run the full certification set.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/investigationMemory/**` | Frozen bounded memory + campaign strategy contract and derivation | integrated `87f0ded` |
| `src/core/agentProtocol/{reasoner,runtime,versions}.ts` | `reasoner-turn-request.v2`; additive action-record/state fields | integrated `87f0ded` |
| `src/core/agentRuntime/{runtime,types,checkpoint}.ts` | Target ledger, memory facts, mechanical hypothesis lifecycle, additive checkpoint validation | integrated `87f0ded` |
| `src/core/agentRuntime/localCampaign.ts` | Campaign strategy accumulation, hand-off, fail-closed resume | integrated `87f0ded` |
| `src/core/localInvestigation/session.ts` | Memory-fact emission (approved targets, salient symbols, reproduction/proposal subjects) | integrated `87f0ded` |
| `src/core/benchmark/hunt.ts` | Additive harness-side `runtimeState`/`investigationHistory` for instrumentation | integrated `87f0ded` |
| `src/core/efficacy/**`, `bin/efficacy-corpus.mjs` | Fixed-corpus before/after efficacy harness | integrated `87f0ded` |
| `tests/unit/{localFindingAdmission,reasonerCli}.test.ts` | Fixture updates for the additive state/observation fields | integrated `87f0ded` |
| `.agent/ACTIVE_TASK.md`, this task's `STATE.md`/`REPORT.md` | Continuity repair and W8 checkpoints | in progress |

## Validation Ledger

Command: `npx tsc --noEmit`
Result: PASS at `87f0ded`.

Command: `npx playwright test` over 14 focused agent/campaign/benchmark/reasoner suites (`agentProtocol`, `agentAutonomyLoop`, `agentRuntime`, `reasonerCli`, `agentTools`, `benchmark`, `localCampaign`, `localInvestigationProviders`, `localFindingAdmission`, `realLocalCampaignPath`, `campaignEndurance`, `historicalRediscovery`, `reasonerPrint`, `minedCases`)
Result: PASS — 164 passed, 0 failed, at `87f0ded`.

Command: `node bin/efficacy-corpus.mjs baseline` (pre-change baseline, 9-case fixed corpus)
Result: 27 reasoner calls, 18 tool actions, 9 unique source targets, 18 evidence refs, 0 hypotheses, 0 grounded hypotheses, 0 verification-ready hypotheses, 0 reproduction attempts, 0 mechanical reproductions, 0 candidates proposed, 0 admitted, 0 false positives, 0 leaked cases, 9/9 `MISS`, EXACT 0.

Command: `node bin/efficacy-corpus.mjs compare` at `87f0ded`
Result: baseline -> candidate: grounded hypotheses 0 -> 9, verification-ready 0 -> 9, grounded reproduction attempts 0 -> 9, mechanical reproductions 0 -> 3, candidates proposed 0 -> 3, candidates admitted 0 -> 3, disproved hypotheses 0 -> 1, repeat-target rate 0 -> 0, deduped repeats 0 -> 0, stagnation terminations 0 -> 0, false positives 0 -> 0, leaked cases 0 -> 0, benchmark outcomes 9x `MISS` in BOTH modes, EXACT 0 in both.

Command: `npm run agent:check`
Result: FAIL at the inherited W8 documents (10 errors: missing STATE headings, misplaced `PROJECT_VERDICT_EFFECT`, missing `CONTINUITY_PROTOCOL_VERSION`, non-SHA checkpoint fields, duplicate `Status` in `ACTIVE_TASK.md`, missing routing `SESSION WORKTREE`). Repaired in this checkpoint; must be rerun.

Command: `npm run gate:local`, `npm run gate:clean`, full `npm test`
Result: NOT YET RUN for W8. Required before closure.

## Decisions Made During This Task

Decision: Measure before/after with ONE investigator policy, ONE corpus and ONE commit, differing only by a mechanical `projectRequestToW7` projection of the turn request.
Reason: comparing across commits or across model behaviour confounds the measurement. The projection is data (`W7_OBSERVATION_FIELDS`) so a test can prove the baseline surface is faithful rather than a convenient subset.

Decision: The simulated investigator reads ONLY the turn request, keeps no state between turns, and deliberately IGNORES host `directives`.
Reason: it must measure the information sufficiency of the contract, not the host answering the question for the model. An improvement driven by obeying hints would be worthless.

Decision: The investigator never infers a (path, evidenceRef) pairing by position.
Reason: that pairing is not derivable from a W7 request at all, and a positional guess would flatter the baseline into looking capable while the host would still refuse the reproduction.

Decision: Working memory is DERIVED per turn and never persisted.
Reason: a checkpoint can then never carry a stale or forged memory, and there is no second authority to keep in sync with runtime state.

Decision: Only the executor may name a target; only a SUCCESSFUL source-surface result promotes one to "approved".
Reason: raw model arguments must not be able to inject an approved target. A refused read still names its subject so memory can mark it exhausted.

Decision: `reasoner-turn-request` bumped to `v2` rather than adding an optional field.
Reason: the reasoner-visible payload changed materially; an honest version boundary beats a silently-optional field that consumers may ignore.

Decision: Hypothesis strength transitions are mechanical, with no new intent kind.
Reason: adding intents widens the protocol the model can drive; deriving `SUPPORTED`/`DISPROVED` from observed reproduction verdicts keeps Nightwatch the authority over what evidence counts.

## Discoveries

Confirmed against live code at `4b3b183`/`97c6536` before any change:

- `AgentRuntime.buildRequest()` sent only `phase`, `untrusted`, `evidenceRefs`, `allowedToolIds`, `allowedIntentKinds` and the budget. No hypotheses, no candidate ids, no action history, no target state.
- `pendingUntrusted` is CLEARED after each request, so a bounded source index was visible for exactly one turn and then unrecoverable. This is the concrete mechanism behind "the reasoner repeatedly asks for source indexes".
- The `(sourcePath, sourceEvidenceRef)` pair that `session.runReproduction` requires was NOT derivable from any W7 request field: the `SOURCE_FILE` envelope carries no evidence ref and `observation.evidenceRefs` is an unlabelled list. A stateless reasoner therefore could not reach verification at all, which explains `NO_PROGRESS` with zero candidates far better than "the model wandered".
- `AgentHypothesis.status` was only ever written as `'OPEN'`; nothing could mark a hypothesis supported or disproved, so "disprove weak hypotheses" was unrepresentable.
- `DEDUPED_REPEAT` silently discarded a repeated call with no feedback reaching the reasoner.
- `localCampaign.runOneInvestigation` builds a fresh `AgentRuntime` AND a fresh tool session per investigation; accumulators were merged only for final admission and never fed forward.
- The print prompt encoded one rigid scripted sequence and rendered the whole request as raw JSON.

Found while implementing:

- The first target-ledger implementation learned the `REQUEST_FINDING_PROPOSAL` candidate id as an approved source target, so the investigator tried to `INSPECT_SOURCE_SURFACE` a candidate id, looped on `TOOL_ERROR`/`DEDUPED_REPEAT` and terminated `NO_PROGRESS` after earning a reproduction. Fixed by restricting promotion to successful source-surface tools. Caught by tracing the action log, not by a passing test.
- `extractSalientSymbols`' path pattern truncated ordinary identifiers (`lines.reduce` -> `lines.reduc`). Fixed with a non-letter lookahead so only real file-extension tokens match.
- The inherited W8 task documents never passed `npm run agent:check` (10 continuity errors). Repaired rather than relabelled.

## Blockers

None repository-owned. Network access to `origin` is intermittent (one `git fetch` and one `git ls-remote` timed out, later attempts succeeded); the M1 push to `origin/main` completed and was verified. Live-provider quota/auth for the M8 proof is unverified so far.

## Safety Events

Event: Two `_edit` calls intended for the session worktree resolved against the CANONICAL checkout (relative paths resolve from the process cwd), adding 15 lines to `src/core/benchmark/hunt.ts` there.
Response: detected immediately with `git status`, reverse-applied with `git apply -R` on that single self-authored path, canonical verified clean at `4b3b183`, then fast-forwarded to `origin/main`. No other worktree, branch or sibling repository was touched, and every later edit used absolute session-worktree paths. No commit was ever created in the canonical checkout.

## Deferred / Follow-Up

- Live-provider (M8) proof and the real owner-local campaign comparison against the recorded W7 trace.
- Full `npm test`, `gate:local`, `gate:clean` certification.
- Strict `EXACT_REDISCOVERY` remains 0 and deliberately unchanged.
- Contained real-replay coverage beyond the already-proven mined ouchan case.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md`, then this task's `SPEC.md`, `PLAN.md`, `STATE.md`, `REPORT.md`.
2. Discover live Git/worktree/session truth; do not trust SHAs in prose.
3. The shared contract is FROZEN and integrated at `87f0ded13e3d16b4130abeadfd95fa88aba04b61` — do not redesign it.
4. Continue at the `## Exact Next Action` above: review and integrate the five lanes, re-measure, attempt the live-provider proof, then certify.

## Completion Snapshot

Not complete. Populate only after M9 certification and the live-provider acceptance criteria are satisfied or the task is truthfully BLOCKED by an external prerequisite.
