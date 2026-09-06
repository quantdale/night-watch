# Task State

## Identity

Task ID: nightwatch-autonomous-bug-hunting-programme-v1
Phase: AUTONOMOUS_BUG_HUNTING_PROGRAMME_V1
Status: IN_PROGRESS
Starting SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
Last validated implementation SHA: ab658ebe800d10ff92d0198eac3efebc13fdeba6
Last substantive checkpoint SHA: ab658ebe800d10ff92d0198eac3efebc13fdeba6
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-autonomous-bug-huntin-725fbbbe
Last checkpoint: Wave 5 campaigns + reasoner-provider comparison
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d1ebde90c1454b31d6b93d9df503a4c5f196d7c8
LAST_VALIDATED_IMPLEMENTATION_SHA: ab658ebe800d10ff92d0198eac3efebc13fdeba6
LAST_SUBSTANTIVE_CHECKPOINT_SHA: ab658ebe800d10ff92d0198eac3efebc13fdeba6
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Deliver a locally executable autonomous bug-hunting programme above the
existing Nightwatch safety kernel.

## Current Milestone

Milestone ID: W5
Milestone status: IN_PROGRESS
What is being attempted: Wave 5 bounded local campaigns executed on the real CLI path. Historical EXACT/reproduced still unproven; DEV unauthorized. Do not declare COMPLETE.


## Completed Milestones

- M0 recon: HEAD `d1ebde90c1454b31d6b93d9df503a4c5f196d7c8` == origin/main.
- W0 protocol freeze integrated at `b3a780816c111399026844615b8b915899cf7156`.
- W1 lanes A–G independently reviewed and integrated.
- Seeded positive / false-anomaly / injection loop tests 3/3.

## Work In Progress

Live mined historical set is now 27 Grok cases (8 PARTIAL + 16 SAME_ROOT_CAUSE + 3 MISS, EXACT 0, reproductionCount 0) plus 3 OpenCode Go re-hunts. Wave 5 ran two HOUR_1 campaigns on the real CLI path: `wave5-1h-local` BUDGET_EXHAUSTED via consecutiveFailures (Grok 402 balance exhausted), `wave5-1h-opencode` NO_PROGRESS at 102s/12 actions. No fabricated candidate or dossier.


## Exact Next Action

Keep the programme IN_PROGRESS / PARTIAL. Historical EXACT and mined reproduction are unproven. DEV/NEXT unauthorized. Do not declare COMPLETE.



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
Result: PASS at `ab658ebe800d10ff92d0198eac3efebc13fdeba6`

Command: `npm test` (full regression)
Result: PASS at `ab658ebe800d10ff92d0198eac3efebc13fdeba6` — 4288 passed, 0 failed,
13 skipped, 8.1m. No unexplained regression against the 4076 historical baseline.

Command: `npm run hardening:check`, `npm run agent:check`, `npm run project:check`,
`npm run workspace:check`
Result: PASS (agent:check PASS with 4 advisory warnings: stale-baseline before this
refresh, 31 legacy v1 tasks, one non-live sibling STALE_SESSION, stale session base)

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
