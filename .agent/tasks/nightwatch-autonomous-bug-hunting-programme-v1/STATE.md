# Task State

## Identity

Task ID: nightwatch-autonomous-bug-hunting-programme-v1
Phase: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Last substantive checkpoint SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: W8 autonomous efficacy integrated and certified at 3d624fb; the parent programme stays IN_PROGRESS on its own separate criteria
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 3d624fbcc42da808ce1c7e9cbc6b780b82d90820
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Deliver a locally executable autonomous bug-hunting programme above the existing Nightwatch safety kernel.

## Current Milestone

Milestone ID: W9
Milestone status: NOT_STARTED
Child task: NONE — W9 requires a fresh task directory before implementation begins.

What is being attempted: nothing yet. W8 closed the efficacy gap; the parent programme's own terminal criteria (previously unknown Alphaus defect yield, strict `EXACT_REDISCOVERY`, DEV/NEXT execution) remain open and each needs a separately authorized wave.

Sensing, reproduction sharing, admission grounding (W7) and investigation/campaign memory plus the efficacy harness (W8) are DONE. DEV/NEXT remain unauthorized. Do not declare the parent programme COMPLETE.

## Completed Milestones

- M0 programme recon at `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`.
- W0 protocol freeze integrated.
- W1 lanes A-G integrated.
- Seeded positive / false-anomaly / injection loop proofs integrated.
- W5 bounded subscribed-CLI campaigns exercised provider fallback.
- W6 contained historical replay + multi-investigation campaigns integrated.
- W6 real historical proof: `mobingilabs/ouchan` fix `5985281b43cd` reproduced PRE_FAIL_POST_PASS; mined hunt reached VERIFY, earned `reproductionCount=1`, built a dossier, leak=[].
- W7 real-local substrate COMPLETE and integrated: ordinary campaign path uses real owner-local source/System Map/Bug Atlas/System Atlas/evidence providers, product/benchmark share deterministic reproduction/provider semantics, final dossier admission is mechanical, and durable programme identity is machine-validated.
- W7 load-bearing product-path proof: real mined ouchan case replayed through `runLocalCliCampaign` with the real contained engine, `REPRODUCED / PRE_FAIL_POST_PASS`, `dossierStatus=VERIFIED_REPRODUCTION`, mechanically derived `reproductionCount=1`, zero hidden-truth leakage, zero sibling mutation.
- W7 certification at implementation checkpoint `e368f9255142d1b30dd66825d93f6f321ba6ecbf`: `npm test` 4378 passed / 0 failed / 14 skipped; typecheck/hardening/workspace/agent/project/handoff PASS; `gate:local` FULL PASS 11/11 receipt `receipt:sha256:85ace28cea2d1e5de2af9723`; `gate:clean` PASS Node 20 inner receipt `receipt:sha256:c6f3ecdc4d45b7494d961272`.
- W8 autonomous efficacy COMPLETE and integrated at `3d624fbcc42da808ce1c7e9cbc6b780b82d90820`: bounded per-turn investigation memory (`nightwatch.investigation-memory.v1`) reaches stateless CLI turns through `reasoner-turn-request.v2`, bounded campaign strategy memory (`nightwatch.campaign-strategy-state.v1`) survives fresh investigations and resume, hypothesis strength and reproduction readiness are mechanically derived from observed results, and an exhausted-action guard stops re-executing a call that already failed.
- W8 fixed-corpus evidence (`nightwatch.efficacy-corpus.v2`, 13 cases incl. 2 negative controls), baseline -> final: unique source targets 13 -> 31, grounded hypotheses 0 -> 17, verification-ready 0 -> 17, grounded reproduction attempts 0 -> 17, mechanical reproductions 0 -> 6, admitted candidates 0 -> 6, disproved hypotheses 0 -> 6, `VERIFIED_ROOT_CAUSE_REDISCOVERY` 0 -> 3, false positives 0 -> 0, leaked cases 0 -> 0, `EXACT_REDISCOVERY` 0 -> 0 unchanged; costs rose honestly (reasoner calls 39 -> 102, tool actions 26 -> 67, stagnation terminations 0 -> 1).
- W8 live-provider proof (opencode-go/deepseek-v4-flash): the leak-isolated historical run reached `VERIFIED_ROOT_CAUSE_REDISCOVERY` with mechanical reproduction on 2 of 3 cases and left the negative control candidate-free with `leaked=[]`; two real owner-local campaigns explored distinct `blue-sdk-go` surfaces with grounded hypotheses, and the single live candidate was mechanically REFUSED (`MISSING_REPRODUCTION`) rather than admitted.
- W8 certification at `3d624fb`: `npm test` 4429 passed / 0 failed / 15 skipped; typecheck/hardening/agent/project/workspace/session PASS; `gate:local` FULL PASS 11/11 receipt `receipt:sha256:0d892de64df3e499898a8289`; `gate:clean` PASS on a fresh Node 20 clone, inner receipt `receipt:sha256:c6737eb5be31ce52f13647c4`; the opt-in W7 real ouchan product-path proof still PASSES at this head.

## Work In Progress

NONE. W8 is integrated and certified; no wave is currently in flight.

The W7 live baseline that motivated W8 is preserved for comparison: live OpenCode Go on the real substrate, 8 investigations, 24 reasoner calls, 26 tool actions, 0 provider failures, ~595.5s, `NO_PROGRESS`, zero candidates. Its mechanical cause was confirmed during W8 recon: the `(sourcePath, sourceEvidenceRef)` pair required before any reproduction was not derivable from any `reasoner-turn-request.v1` field, so a stateless reasoner could not reach verification at all.

## Exact Next Action

Open a NEW task for the next wave; do not reopen W8. The parent programme's remaining criteria are yield, not plumbing: a previously unknown Alphaus defect still has no mechanical reproduction path on non-historical owner-local source, so grounded live hypotheses cannot earn reproduction credit. The concrete follow-ups are extending the deterministic reproduction provider to owner-local packages that already vendor their dependencies, and raising the live budget's cumulative `outputBytes` ceiling so a full `HOUR_1` endurance run is reachable (both W8 live campaigns terminated on that ceiling, not on wall time). Do not re-plumb W7 sensing/reproduction/admission or W8 memory/efficacy. DEV/NEXT unauthorized.

## Files Changed

| Path | Purpose | Status |
|---|---|---|
| `src/core/agentProtocol/**` | frozen/autonomous contracts; `reasoner-turn-request.v2` and the exhausted-action guard added additively | integrated |
| `src/core/agentRuntime/**` | runtime/campaign; W8 memory, target ledger, hypothesis lifecycle, campaign strategy | integrated |
| `src/core/investigationMemory/**` | W8 bounded investigation/campaign memory contracts and derivation | integrated |
| `src/core/efficacy/**`, `bin/efficacy-corpus.mjs` | W8 fixed-corpus before/after harness | integrated |
| `src/core/localInvestigation/**` | W7 real provider/reproduction/admission substrate; W8 added memory-fact emission | integrated; preserve |
| `src/core/benchmark/**` | historical efficacy measurement / strict EXACT + verified tier | integrated |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/**` | W7 terminal evidence | COMPLETE |
| `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/**` | W8 SPEC/PLAN/STATE/REPORT | COMPLETE |
| `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` | programme handoff | DONE |

## Validation Ledger

Command: W7 certification set (`npm test`, typecheck, hardening/workspace/agent/project/handoff, `gate:local`, `gate:clean`)
Result: PASS at the W7 implementation checkpoint `e368f9255142d1b30dd66825d93f6f321ba6ecbf` — see the Completed Milestones entry for the exact counts and gate receipts.

Command: W8 focused agent/campaign/benchmark/reasoner suites plus `npx tsc --noEmit`
Result: PASS at the W8 freeze `87f0ded13e3d16b4130abeadfd95fa88aba04b61` — 164 passed, 0 failed across 14 suites.

Command: `node bin/efficacy-corpus.mjs compare` at the W8 head
Result: `nightwatch.efficacy-corpus.v2`, 13 cases / 2 negative controls, baseline -> final: unique source targets 13 -> 31, grounded hypotheses 0 -> 17, verification-ready 0 -> 17, grounded reproduction attempts 0 -> 17, mechanical reproductions 0 -> 6, admitted candidates 0 -> 6, disproved hypotheses 0 -> 6, `VERIFIED_ROOT_CAUSE_REDISCOVERY` 0 -> 3, false positives 0 -> 0, leaked cases 0 -> 0, EXACT 0 in both modes. Full per-case table in the W8 task `REPORT.md`.

Command: W8 certification set at `3d624fbcc42da808ce1c7e9cbc6b780b82d90820` (`npm test`, typecheck, hardening/agent/project/workspace/session, `gate:local`, `gate:clean`, opt-in live-provider and real-historical proofs)
Result: PASS — 4429 passed / 0 failed / 15 skipped; `gate:local` FULL PASS 11/11 receipt `receipt:sha256:0d892de64df3e499898a8289`; `gate:clean` PASS on a fresh Node 20 clone, inner receipt `receipt:sha256:c6737eb5be31ce52f13647c4`; live historical proof PASS with 2 of 3 cases at `VERIFIED_ROOT_CAUSE_REDISCOVERY`; W7 real ouchan product-path proof still PASS.

## Discoveries

- The W7 `NO_PROGRESS` result has a mechanical cause, not merely a model-quality cause: the `(sourcePath, sourceEvidenceRef)` pair that the host demands before it will execute a deterministic reproduction was not derivable from ANY field of a `reasoner-turn-request.v1`. A stateless print-mode reasoner therefore could not reach verification at all. Details and the other confirmed causes are recorded in the W8 task `STATE.md` `## Discoveries`.
- `AgentHypothesis.status` was only ever written as `'OPEN'`, so "disproved hypothesis" was unrepresentable before W8.
- The inherited W8 planning documents did not pass `npm run agent:check`; they were repaired during W8 execution rather than relabelled.

## Current proof ledger

W7 proven:

- real product-path sensing;
- shared deterministic reproduction;
- mechanical final admission;
- zero hidden-truth leakage in the real historical proof;
- zero sibling mutation;
- strict `EXACT_REDISCOVERY` unchanged and still 0;
- additive `VERIFIED_ROOT_CAUSE_REDISCOVERY` exists;
- full local/clean certification passed.

Not yet proven:

- previously unknown Alphaus bug yield (the one live owner-local candidate was mechanically refused for missing reproduction);
- strict `EXACT_REDISCOVERY` (still 0, deliberately unchanged);
- full `HOUR_1` live wall-clock endurance (both W8 campaigns ended on the cumulative `outputBytes` ceiling first);
- contained replay coverage beyond the proven mined ouchan case;
- DEV/NEXT/production behavior;
- parent programme completion.

W8 proven (see the W8 task `REPORT.md` truth table): bounded turn working memory, cross-investigation strategy memory, target-diversity and grounded-hypothesis improvement, mechanical reproduction readiness, fixed-corpus efficacy improvement with zero added false positives, live-provider verified-root-cause rediscovery on 2 of 3 historical cases, and preserved leakage/admission/safety boundaries.

## Decisions Made During This Task

Decision: W8 is efficacy, not substrate plumbing.
Reason: W7 already mechanically proved the normal product path can sense, reproduce and admit safely; the live reasoner still stalls without candidates.

Decision: preserve strict `EXACT_REDISCOVERY` separately from mechanically meaningful verified root-cause reproduction.
Reason: lowering EXACT would hide rather than solve the efficacy problem.

Decision: require fixed-corpus before/after metrics and negative controls.
Reason: more actions/tokens do not by themselves prove better investigation.

Decision: freeze shared W8 memory/readiness contracts before parallel writes.
Reason: overlapping runtime/campaign/prompt changes can otherwise fork semantics and invalidate efficacy measurements.

## Blockers

No repository-owned blocker. Live-provider quota was available and both W8 live proofs executed. The remaining programme criteria are yield and authorization, not implementation.

## Safety Events

Event: during W8 execution three `_edit` calls intended for the session worktree resolved against the CANONICAL checkout because relative paths resolve from the process cwd.
Response: each was detected immediately with `git status`, reverse-applied with `git apply -R` on that single self-authored path, and canonical was verified clean. No commit was ever created in the canonical checkout; no other worktree, branch or sibling repository was touched.

## Deferred / Follow-Up

- DEV/NEXT hunt unauthorized.
- Communication-evidence atlas population unauthorized.
- Previously unknown Alphaus bug yield remains unproven.
- Literal full-hour live-provider endurance remains secondary to W8 efficacy and can follow once the reasoning loop demonstrates useful progress.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{SPEC,PLAN,STATE,REPORT}.md` for the W8 terminal evidence.
3. Read W7 `nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md` and parent `PROGRAMME.json`/`REPORT.md`.
4. Discover live Git/workspace/session truth; do not trust SHAs in prose.
5. Do not repeat W0-W8. If a next wave is authorized, open a fresh task directory and start from this file's `## Exact Next Action`.

## Completion Snapshot

Parent programme not complete. W0-W8 are integrated and certified, but the programme's own terminal criteria are still open: no previously unknown Alphaus defect has been mechanically reproduced, strict `EXACT_REDISCOVERY` is still 0, and DEV/NEXT execution remains unauthorized. Populate parent completion evidence only when those are independently satisfied.
