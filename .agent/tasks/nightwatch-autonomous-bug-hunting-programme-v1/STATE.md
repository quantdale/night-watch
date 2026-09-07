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
Last checkpoint: Wave 6 lanes R and E integrated; first real historical reproduction
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 2437895c883902bbbccaf796c278863cade0cbbc
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Deliver a locally executable autonomous bug-hunting programme above the
existing Nightwatch safety kernel.

## Current Milestone

Milestone ID: W6
Milestone status: IN_PROGRESS
What is being attempted: Wave 6 delivered a contained historical test replay and multi-investigation campaigns. One real historical Alphaus defect is now mechanically reproduced with a dossier. EXACT rediscovery and real-world unknown-bug yield remain unproven; DEV unauthorized. Do not declare COMPLETE.


## Completed Milestones

- M0 recon: HEAD `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` == origin/main.
- W0 protocol freeze integrated at `b3a780816c111399026844615b8b915899cf7156`.
- W1 lanes A–G independently reviewed and integrated.
- Seeded positive / false-anomaly / injection loop tests 3/3.
- W5 bounded HOUR_1 campaigns executed on the real CLI path; provider fallback exercised.

## Work In Progress
Wave 6 integrated: lane R contained replay (worker `a842f9b`) and lane E multi-investigation campaigns (worker `de2f58e`, reconcile `7dd51cf`). Live mined hunt on `mined-bugatlas-git-mobingilabs-ouchan-5985281b43cd` reached VERIFY, called `RERUN_SAFE_REPRODUCTION`, and earned `reproductionCount=1`, `hasDossier=true`, `leaked=[]`. Orchestrator independently re-ran the real replay: `REPRODUCED` / `PRE_FAIL_POST_PASS`, sibling repo unmutated. Mined corpus is now 28 cases with 1 reproduction and EXACT still 0.
Wave 5 measured two HOUR_1 campaigns (`wave5-1h-local` BUDGET_EXHAUSTED via the consecutive-failure ceiling after Grok returned HTTP 402; `wave5-1h-opencode` NO_PROGRESS at 102s/12 actions). Wave 6 then removed the two structural limits those runs exposed. Mined historical corpus is 28 cases: 8 PARTIAL, 16 SAME_ROOT_CAUSE, 3 MISS under Grok, plus 3 OpenCode Go re-hunts, EXACT 0, and now exactly 1 real reproduction.


## Exact Next Action

Keep the programme IN_PROGRESS / PARTIAL. Reproduction of a real historical defect is now PROVEN; EXACT rediscovery and previously-unknown-bug yield are NOT. DEV/NEXT unauthorized. Do not declare COMPLETE.



## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/agentProtocol/**` | Frozen cross-lane contracts | in progress |
| `src/core/policy/ownerScope.ts` | `AUTONOMOUS_AGENT_LOCAL` | in progress |
| `.agent/tasks/nightwatch-autonomous-bug-hunting-programme-v1/**` | Continuity | in progress |

## Validation Ledger

Command: session start/claim
Result: PASS — worktree `nightwatch-autonomous-bug-huntin-725fbbbe`,
session `sess-d9ba4a6459ef`, base `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8`

Command: `npm run typecheck`
Result: PASS on the tree at documentation descendant
`ab658ebe800d10ff92d0198eac3efebc13fdeba6`, whose implementation content is
unchanged from `fe919b2cc1fcd3dc79062f336185647c3225a99a` (the range is
REPORT.md only).

Command: `npm test` (full regression)
Result: PASS on that same tree — 4288 passed, 0 failed, 13 skipped, 8.1m.
No unexplained regression against the 4076 historical baseline.

Command: `npm run hardening:check`, `npm run project:check`, `npm run workspace:check`
Result: PASS

Command: `npm run agent:check`
Result: FAIL then repaired, twice. Labelling the REPORT-only descendant as the
implementation checkpoint raised INVALID_IMPLEMENTATION_ROLE and
CONTINUITY_ANCHOR_MISMATCH; restoring `053f2731...` then raised
INVALID_DOCUMENTATION_CHECKPOINT because that range still contained
`src/`, `bin/` and `tests/` changes. The true implementation tip is
`fe919b2cc1fcd3dc79062f336185647c3225a99a`; `fe919b2..ab658eb` is REPORT.md
only. Final: PASS with 4 advisory warnings (CHECKPOINT_ADVANCE on approved
doc paths, 31 legacy v1 tasks, one non-live sibling STALE_SESSION, stale base).

Command: `npm run gate:local`
Result: FULL PASS at `20f830f3539dcd2687134e2df9cffade57cf0bb6`, all eleven
required groups, receipt `receipt:sha256:16ed7c4dfe9f939f64893483`
(SEMANTIC_COMPATIBILITY 2067 passed / 13 skipped / 0 failed, OWNER_PROVENANCE
91, SYNTHETIC_CAMPAIGN 1131 / 0 failed). An earlier attempt at `a75a0db`
stopped at PROJECT_TRUTH because the project baseline still named `053f2731...`.

Command: `npm run gate:clean`
Result: PASS at `20f830f3539dcd2687134e2df9cffade57cf0bb6` — Node 20 clean
clone, `installResult` PASS, `gateResult` PASS, inner receipt
`receipt:sha256:73bbcdd6a3201e7145f796f2`.

## Decisions Made During This Task

Decision: Merge Lane H into Lane A.
Reason: Checkpoint/budget/observability must not fork.
Evidence/constraint: programme brief overlapping-lane rule.

Decision: System Atlas overlay rather than mutating systemMap kinds.
Reason: C-15b fact-category contracts stay stable.
Evidence/constraint: `src/core/systemMap/model.ts` FACT_CATEGORIES.

## Discoveries

- Stale session `nightwatch-review-operations-his-7431812c` has uncommitted
  and committed review-operations work on the same base SHA. Do not touch.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- DEV/NEXT hunt unauthorized.
- Communication-evidence atlas population unauthorized.
- Full-hour endurance is provider-quality bound: the loop guard ends runs early, so a true 1h wall-clock campaign is still unproven.
- Historical sibling mining isolation PASS; rediscovery not proven.


## Resume Recipe

1. Read SPEC, PLAN, STATE, PROGRAMME.json.
2. Inspect git status in `session/nightwatch-autonomous-bug-huntin-725fbbbe`.
3. Continue Exact Next Action.

## Completion Snapshot

Populate only when complete.
