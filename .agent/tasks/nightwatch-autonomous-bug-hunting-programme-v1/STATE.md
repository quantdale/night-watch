# Task State

## Identity

Task ID: nightwatch-autonomous-bug-hunting-programme-v1
Phase: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: 2437895c883902bbbccaf796c278863cade0cbbc
Last substantive checkpoint SHA: 2437895c883902bbbccaf796c278863cade0cbbc
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: Wave 6 lanes R and E integrated; first real historical reproduction proven; W7 real-local substrate task authored
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Deliver a locally executable autonomous bug-hunting programme above the existing Nightwatch safety kernel.

## Current Milestone

Milestone ID: W7
Milestone status: IN_PROGRESS
What is being attempted: `nightwatch-real-local-investigation-substrate-v1`. Connect the ordinary autonomous campaign path to real owner-local source/System Map/Bug Atlas/System Atlas/evidence/deterministic reproduction through shared safe providers; mechanically ground final dossier admission; preserve strict EXACT while adding a meaningful verified root-cause/reproduction tier; prove one leak-free historical reproduced defect through the same normal product path. DEV/NEXT remain unauthorized. Do not declare the parent programme COMPLETE.

## Completed Milestones

- M0 recon: HEAD `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` == origin/main at programme start.
- W0 protocol freeze integrated at `b3a780816c111399026844615b8b915899cf7156`.
- W1 lanes A–G independently reviewed and integrated.
- Seeded positive / false-anomaly / injection loop tests 3/3.
- W5 bounded HOUR_1 campaigns executed on the real CLI path; provider fallback exercised.
- W6 integrated contained historical replay and multi-investigation campaigns.
- W6 real historical proof: `mobingilabs/ouchan` fix `5985281b43cd` reproduced as PRE_FAIL_POST_PASS; mined hunt reached VERIFY, earned `reproductionCount=1`, built a dossier, and leaked no hidden truth.

## Work In Progress

W7 child task: `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/`.

The initiating repository audit found that the autonomous runtime is real, but the normal `nightwatch-agent campaign run` path is not yet proven to consume real local source/System Map/evidence providers and can fall back to fixture/synthetic Atlas data, while the historical benchmark owns a richer private executor. W7 closes that product/benchmark split before spending effort optimizing EXACT=1 or a literal one-hour wall soak.

The same audit found a duplicate `E` key in durable `PROGRAMME.json`; the parent state has now been rewritten with unique `E` (W1 System Atlas) and `E6` (W6 multi-investigation) records. W7 must add machine enforcement so duplicate/ambiguous durable identities cannot recur silently.

Wave 5 measured two HOUR_1 campaigns (`wave5-1h-local` BUDGET_EXHAUSTED via the consecutive-failure ceiling after Grok returned HTTP 402; `wave5-1h-opencode` NO_PROGRESS at 102s/12 actions). Wave 6 removed the structural single-investigation limit. A literal full-hour live-provider soak remains useful but is secondary to wiring the real product substrate.

Historical mined corpus remains 28 cases with one mechanically reproduced defect and strict EXACT still 0. Do not weaken EXACT merely to turn the metric green.

## Exact Next Action

Execute `nightwatch-real-local-investigation-substrate-v1` from live repository truth to its terminal acceptance criteria. Read `.agent/EXECUTION_PROMPT.md` plus the child SPEC/PLAN/STATE/REPORT. Reproduce the current product-path limitations first, freeze shared provider interfaces, then implement/integrate/review/certify. Keep the parent programme IN_PROGRESS/PARTIAL. DEV/NEXT unauthorized.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/agentProtocol/**` | Frozen cross-lane contracts | integrated |
| `src/core/policy/ownerScope.ts` | `AUTONOMOUS_AGENT_LOCAL` | integrated |
| `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/**` | Parent continuity | in progress |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/**` | W7 task continuity | in progress |

## Validation Ledger

Command: session start/claim
Result: PASS — programme worktree `nightwatch-autonomous-bug-huntin-725fbbbe`, session `sess-d9ba4a6459ef`, base `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` at programme start.

Command: `npm run typecheck`
Result: PASS on the Wave-5 tree at documentation descendant `ab658ebe800d10ff92d0198eac3efebc13fdeba6`, whose implementation content was unchanged from `fe919b2cc1fcd3dc79062f336185647c3225a99a`.

Command: `npm test` (full regression)
Result: PASS on that Wave-5 tree — 4288 passed, 0 failed, 13 skipped, 8.1m. Later Wave-6 certification recorded 4315 passed / 0 failed / 13 skipped.

Command: `npm run hardening:check`, `npm run project:check`, `npm run workspace:check`
Result: PASS at the last certified implementation state.

Command: `npm run agent:check`
Result: earlier continuity failures were repaired rather than relabelled. Final pre-W7 state PASS with advisory warnings. W7 must rerun after its own documentation/code changes.

Command: `npm run gate:local`
Result: Wave-6 FULL PASS 11/11 at certified implementation SHA `3476d264f0b37be8c84246df247ac932e49c711e`; receipt recorded in parent REPORT. W7 must obtain a fresh gate after implementation.

Command: `npm run gate:clean`
Result: Wave-6 PASS on a Node 20 fresh clone at the certified implementation state. W7 must obtain a fresh clean-clone gate after implementation.

## Decisions Made During This Task

Decision: Merge Lane H into Lane A.
Reason: Checkpoint/budget/observability must not fork.

Decision: System Atlas overlay rather than mutating systemMap kinds.
Reason: C-15b fact-category contracts stay stable.

Decision: W7 prioritizes real product-path sensing/reproduction over forcing strict EXACT=1 or a literal one-hour soak.
Reason: the product/benchmark capability split is now the highest-value blocker to a credible general autonomous bug hunter.

Decision: Preserve strict `EXACT_REDISCOVERY` and add a separate mechanically meaningful verified root-cause/reproduction tier rather than lowering the strict metric.
Reason: naming a hidden regression-test path is useful but is not identical to independently identifying and mechanically proving the defect.

## Discoveries

- Pre-existing review-operations worktree/session remains foreign to this campaign and must not be touched.
- Parent `PROGRAMME.json` previously reused the `E` key for W1 System Atlas and W6 multi-investigation; ordinary JSON parsing would discard one record. Documentation repair is applied; machine enforcement is W7 work.
- Generic product tool semantics and historical benchmark tool semantics are not yet proven equivalent; W7 owns convergence.

## Blockers

None for locally executable W7 work. External provider quota/account blocks may affect live-model proof but do not authorize premature completion while deterministic/local work remains.

## Safety Events

NONE recorded through W6. W7 inherits the same prohibitions.

## Deferred / Follow-Up

- DEV/NEXT hunt unauthorized.
- Communication-evidence atlas population unauthorized.
- Previously unknown Alphaus bug yield unproven.
- Full-hour live-provider endurance remains useful after the real local substrate is wired.
- Historical replay coverage beyond currently executable cases remains follow-up unless required for the W7 shared provider proof.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/{SPEC,PLAN,STATE,REPORT}`.
3. Read parent PROGRAMME/STATE/REPORT and discover live Git/workspace/session truth.
4. Do not repeat W0-W6. Execute W7 to terminal criteria.

## Completion Snapshot

Parent programme not complete. Populate only when its full terminal criteria are independently satisfied.
