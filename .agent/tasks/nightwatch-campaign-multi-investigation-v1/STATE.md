# Task State

## Identity

Task ID: nightwatch-campaign-multi-investigation-v1
Phase: E-endurance implementation
Status: COMPLETE
Starting SHA: d2aa960c2491817c70cd36f422b0e20c58dcc80d
Last validated implementation SHA: de2f58e649f1c29e8b68f1a20d90d6285ce86d36
Last substantive checkpoint SHA: de2f58e649f1c29e8b68f1a20d90d6285ce86d36
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-campaign-multi-invest-2229385c
Last checkpoint: 2026-09-07 committed on session branch; targeted suites green
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: d2aa960c2491817c70cd36f422b0e20c58dcc80d
LAST_VALIDATED_IMPLEMENTATION_SHA: de2f58e649f1c29e8b68f1a20d90d6285ce86d36
LAST_SUBSTANTIVE_CHECKPOINT_SHA: de2f58e649f1c29e8b68f1a20d90d6285ce86d36
LIVE_HEAD_AUTHORITY: GIT

## Objective

Make a bounded campaign a sequence of investigations under one shared budget so
HOUR_1/HOUR_4 campaigns use their ceiling instead of ending at the first stalled
investigation, with safe budget termination, fatal-state stops, stagnation stop,
and correct checkpoint/resume.

## Current Milestone

COMPLETE / STOP. The multi-investigation campaign loop, shared cumulative
budget, fatal-state stops, stagnation stop and checkpoint/resume are all
implemented and proven. No further implementation remains in this task.

## Completed Milestones

- M1 baseline reproduced (single-AgentRuntime: NO_PROGRESS/7 actions,
  COMPLETE_NO_FINDING/1 action). SPEC/PLAN written.
- M2 campaign loop implemented in localCampaign.ts (+ index exports + CLI resume
  parity): `npm run typecheck` PASS, `npm run hardening:check` PASS.
- M3 tests: 6 new endurance proofs + 3 adapted localCampaign scenarios;
  `npx playwright test tests/unit/localCampaign.test.ts
  tests/unit/campaignEndurance.test.ts tests/unit/agentRuntime.test.ts
  --project=nightwatch --workers=1` → 26 passed.
- M4 operator CLI runs with deterministic local fakes (multi-investigation JSON,
  pause/status/resume shape); REPORT holds design, threshold justification,
  commands/outcomes, JSON, could-not-do list. Committed on session branch, not
  integrated.

## Work In Progress

NONE.

## Exact Next Action

STOP — task complete.

## Files Changed

| Path | Reason | Status |
|---|---|---|
| `src/core/agentRuntime/localCampaign.ts` | campaign investigation loop, shared budget, stops, checkpoints, resume | DONE |
| `src/core/agentRuntime/index.ts` | export CAMPAIGN_STAGNATION_LIMIT, CAMPAIGN_PROGRESS_VERSION, CampaignTerminationCounts | DONE |
| `bin/nightwatch-agent.mjs` | resume PRINT_CLI parity, checkpoint-policy note; status reflects new listing fields | DONE |
| `tests/unit/localCampaign.test.ts` | scenarios kept, expectations adapted to specified continuation | DONE |
| `tests/unit/campaignEndurance.test.ts` | six endurance proofs with fake CLIs | DONE |
| `.agent/tasks/nightwatch-campaign-multi-investigation-v1/SPEC.md` | task spec | DONE |
| `.agent/tasks/nightwatch-campaign-multi-investigation-v1/PLAN.md` | task plan, all milestones DONE | DONE |
| `.agent/tasks/nightwatch-campaign-multi-investigation-v1/STATE.md` | this file | DONE |
| `.agent/tasks/nightwatch-campaign-multi-investigation-v1/REPORT.md` | final report with operator JSON | DONE |

## Validation Ledger

Command: `npm run typecheck`
Result: PASS
When: 2026-09-07
Relevant failure/output summary: clean (repo tsc; worktree installed via npm ci --offline).

Command: `npm run hardening:check`
Result: PASS
When: 2026-09-07
Relevant failure/output summary: offline structural invariants hold.

Command: `npx playwright test tests/unit/localCampaign.test.ts tests/unit/campaignEndurance.test.ts tests/unit/agentRuntime.test.ts --project=nightwatch --workers=1`
Result: PASS (26 passed)
When: 2026-09-07
Relevant failure/output summary: one interim T6 count failure during development (real nextIndex bug, fixed, now exact).

Command: operator CLI `campaign run` (terminate fake) / pause-script run / `campaign status` / `campaign resume`
Result: PASS
When: 2026-09-07
Relevant failure/output summary: 3-investigation JSON; PAUSED listing with inv cursor; resume to NO_PROGRESS with exact predicted totals; status clean after.

## Decisions Made During This Task

Decision: per-investigation remaining-budget policies.
Reason: a fresh runtime with the full policy would reset the shared budget each investigation.
Evidence/constraint: AgentRuntime starts usage at zero; spec forbids resets.
Evidence: fixed during development — T6 trace showed inv:1 re-running after resume.

Decision: stagnation CAMPAIGN_STAGNATION_LIMIT=3 mirroring NO_PROGRESS_REPEAT_LIMIT.
Reason: N=1 defeats the mission; N=2 risks correlated duds; N=3 bounds while retrying.
Evidence/constraint: SPEC mission + frozen protocol constant.

Decision: SAFETY_BLOCKED stops the campaign immediately.
Reason: retrying a safety block in fresh investigations would circumvent the block.
Evidence/constraint: hostile-terminal clause in task spec.

Decision: campaign checkpoint = valid AgentCheckpoint (merged state) + campaignProgress envelope with embedded paused-investigation checkpoint.
Reason: reuses frozen codec/listings with no schema change; single file, no sync hazards; verbatim resume without side-effect duplication.
Evidence/constraint: parseCheckpoint ignores unknown fields; parseResumeCursor fails closed on campaign cursors.

Decision: resume runs under the checkpoint's stored policy; fresh run supersedes stored checkpoint; terminal resume is idempotent and cleans the file.
Reason: ceiling continuity; no stale PAUSED listings; never restart finished work.
Evidence/constraint: CLI resume + status demos.

Decision: NODE_PATH then worktree-local `npm ci --offline` for tooling (no symlink).
Reason: worktree has no install and no network; a symlink shows as untracked and breaks worktree cleanliness.
Evidence/constraint: git status check.

## Discoveries

- `parseResumeCursor` binds owner exactly, so campaign cursors fail closed if misused with AgentRuntime resume.
- Local `executeAgentTool` without fixtures answers ADAPTER_UNAVAILABLE, so CALL_TOOL fakes record TOOL_ERROR (still counts as executed — used for the no-duplication proof).
- A `process.exit(1)` fake maps to NONZERO_EXIT and increments reasonerCalls too (increment precedes the ok check) — asserted exactly in T4.

## Blockers

None.

## Safety Events

NONE

## Deferred / Follow-Up

- Orchestrator integration (gate:local/gate:clean) and a real subscribed-CLI soak.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

Final substantive checkpoint: DISCOVER_FROM_GIT (session branch, Conventional Commit, not integrated)
Final documentation checkpoint: DISCOVER_FROM_GIT
Live HEAD: DISCOVER_FROM_GIT
Tests: typecheck PASS; hardening:check PASS; 26/26 targeted Playwright tests PASS
Artifacts: src/core/agentRuntime/localCampaign.ts, index.ts, bin/nightwatch-agent.mjs, tests/unit/campaignEndurance.test.ts, updated tests/unit/localCampaign.test.ts
Known issues: none
Recommended next task: orchestrator integration of session/nightwatch-campaign-multi-invest-2229385c
