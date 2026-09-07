# Task State

## Identity

Task ID: nightwatch-autonomous-bug-hunting-programme-v1
Phase: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
Last substantive checkpoint SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: W7 real-local investigation substrate integrated/certified; W8 autonomous-efficacy successor task created and handed off
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
LAST_SUBSTANTIVE_CHECKPOINT_SHA: e368f9255142d1b30dd66825d93f6f321ba6ecbf
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Deliver a locally executable autonomous bug-hunting programme above the existing Nightwatch safety kernel.

## Current Milestone

Milestone ID: W8
Milestone status: IN_PROGRESS
Child task: `nightwatch-autonomous-efficacy-real-local-substrate-v1`
Child task directory: `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1`

What is being attempted: autonomous efficacy on the now-real local substrate — bounded turn/campaign reasoning memory, target diversity, better evidence-grounded hypotheses, verification/reproduction readiness, and measured fixed-corpus/live-provider improvement so campaigns stop wasting budget on repetitive `NO_PROGRESS` behavior.

Sensing, reproduction sharing, and admission grounding are DONE in W7 and are not W8 plumbing work unless live recon finds a concrete regression. DEV/NEXT remain unauthorized. Do not declare the parent programme COMPLETE.

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

## Work In Progress

W8 is active at M0. No W8 implementation is accepted yet.

The honest efficacy baseline that motivates W8 remains:

- live OpenCode Go on the W7 real substrate;
- 8 investigations;
- 24 reasoner calls;
- 26 tool actions;
- 0 provider failures;
- ~595.5s;
- termination `NO_PROGRESS`;
- zero candidates / zero dossiers.

Likely causes to verify during W8 recon include stateless per-turn request context and insufficient cross-investigation strategic memory. These are hypotheses, not pre-approved conclusions.

## Exact Next Action

Execute `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{SPEC,PLAN,STATE,REPORT}.md` from live Git/workspace/session truth. Begin at M0 baseline capture, freeze W8 memory/readiness interfaces at M1, then continue through M9 integration, live-provider proof and certification. Do not re-plumb W7 sensing/reproduction/admission. DEV/NEXT unauthorized.

## Files Changed / programme surfaces

| Path | Purpose | Status |
|---|---|---|
| `src/core/agentProtocol/**` | existing frozen/autonomous contracts; W8 may evolve additively if required | integrated baseline |
| `src/core/agentRuntime/**` | runtime/campaign; W8 efficacy target | active W8 scope |
| `src/core/localInvestigation/**` | W7 real provider/reproduction/admission substrate | integrated; preserve |
| `src/core/benchmark/**` | historical efficacy measurement / strict EXACT + verified tier | active W8 measurement scope |
| `.agent/tasks/nightwatch-real-local-investigation-substrate-v1/**` | W7 terminal evidence | COMPLETE |
| `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/**` | W8 SPEC/PLAN/STATE/REPORT | IN_PROGRESS |
| `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` | W8 handoff | IN_PROGRESS |

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

- W8 bounded turn working memory;
- W8 cross-investigation strategy memory;
- material target-diversity / grounded-hypothesis improvement;
- live-provider verified-root-cause rediscovery under the W8 reasoning loop;
- previously unknown Alphaus bug yield;
- DEV/NEXT/production behavior;
- parent programme completion.

## Decisions

Decision: W8 is efficacy, not substrate plumbing.
Reason: W7 already mechanically proved the normal product path can sense, reproduce and admit safely; the live reasoner still stalls without candidates.

Decision: preserve strict `EXACT_REDISCOVERY` separately from mechanically meaningful verified root-cause reproduction.
Reason: lowering EXACT would hide rather than solve the efficacy problem.

Decision: require fixed-corpus before/after metrics and negative controls.
Reason: more actions/tokens do not by themselves prove better investigation.

Decision: freeze shared W8 memory/readiness contracts before parallel writes.
Reason: overlapping runtime/campaign/prompt changes can otherwise fork semantics and invalidate efficacy measurements.

## Blockers

No known blocker to M0-M7 deterministic/local W8 work. Live-provider quota/account availability may block M8; such a block does not authorize false completion while other work remains executable.

## Safety Events

NONE recorded for the W8 planning handoff.

## Deferred / Follow-Up

- DEV/NEXT hunt unauthorized.
- Communication-evidence atlas population unauthorized.
- Previously unknown Alphaus bug yield remains unproven.
- Literal full-hour live-provider endurance remains secondary to W8 efficacy and can follow once the reasoning loop demonstrates useful progress.

## Resume Recipe

1. Read `.agent/ACTIVE_TASK.md` and `.agent/EXECUTION_PROMPT.md`.
2. Read `.agent/tasks/nightwatch-autonomous-efficacy-real-local-substrate-v1/{SPEC,PLAN,STATE,REPORT}.md`.
3. Read W7 `nightwatch-real-local-investigation-substrate-v1/{STATE,REPORT}.md` and parent PROGRAMME/REPORT.
4. Discover live Git/workspace/session truth.
5. Execute W8 M0-M9; do not repeat W0-W7 or declare completion at an intermediate milestone.

## Completion Snapshot

Parent programme not complete. W8 has only been planned/handed off; populate W8 and parent completion evidence only after observed terminal criteria are met.
