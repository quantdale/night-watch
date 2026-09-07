# NightWatch campaign multi-investigation (E-endurance) — PLAN

## Purpose

Turn a bounded campaign from "one investigation, ends at first stall" into "a
sequence of investigations under one shared budget", so HOUR_1/HOUR_4 campaigns
use their ceiling. Fresh `AgentRuntime` per investigation (own action log and
no-progress window); campaign-level accumulation of wall time, reasoner calls,
tool actions, candidates, retries, provider/consecutive failures checked with the
same `AgentBudgetPolicy`.

## Starting State

- Task ID: `nightwatch-campaign-multi-investigation-v1`
- Starting Nightwatch SHA: `d2aa960c2491817c70cd36f422b0e20c58dcc80d`
- Relevant architecture: `AgentRuntime.run()` (frozen) terminates NO_PROGRESS on
  the repeated-action guard / turn cap, BUDGET_EXHAUSTED with checkpoint via
  `classifyBudgetExhaustion`; `localCampaign.ts:finishRun` runs exactly one
  runtime. Checkpoint codec `checkpoint.ts` round-trips `AgentCheckpoint`
  (ignores unknown fields on parse; `parseCheckpoint` rebuilds the 4-field
  object). `parseResumeCursor` strictly binds `<campaignId>:turn:<n>`.
- Dependencies: none. Parallel with mined-reproduction lane (no shared files).
- Established facts that must not be rediscovered: single-run behavior (see
  REPORT baseline); frozen interfaces listed in SPEC.md.

## Scope

- `src/core/agentRuntime/localCampaign.ts`: investigation loop, campaign budget
  accumulation, remaining-budget policy derivation, stagnation tracking, merged
  campaign checkpoint + campaignProgress envelope + transient in-progress
  investigation checkpoint, resume (fresh + legacy cursors, idempotent terminal
  resume), extended result/listing types.
- `src/core/agentRuntime/index.ts`: re-export new symbols.
- `bin/nightwatch-agent.mjs`: `campaign status` (already lists; gains new
  fields), `campaign resume` (checkpoint-policy reuse, PRINT_CLI fallback).
- `tests/unit/localCampaign.test.ts`: keep scenarios, adapt expectations to
  specified continuation semantics.
- `tests/unit/campaignEndurance.test.ts`: six proofs (see M3).
- `.agent/tasks/nightwatch-campaign-multi-investigation-v1/**`: SPEC/PLAN/STATE/REPORT.

## Non-Goals

See SPEC explicit non-goals. No `maxInvestigations` knob (stagnation + budget
bound the loop; avoids scope creep).

## Safety Constraints

See SPEC. No findings/candidates fabricated; checkpoints secret-scanned via the
existing `assertCheckpointHasNoSecrets`.

## Architecture / Approach

Per-investigation runtime id: `<campaignId>:inv:<index>` (distinct ids visible
```text
campaignUsage = { wallTimeMs: now()-campaignStart,
  reasonerCalls/inputBytes/outputBytes/toolActions/retries/providerFailures: sums,
  candidateCount: unique campaign candidates,
  consecutiveFailures: trailing streak (reset when an investigation ends clean) }
```

Per-investigation policy = campaign policy minus consumed (remaining-budget),
so a fresh runtime can neither reset nor overshoot the shared ceiling.
Stop-order after each investigation: CANCELLED -> campaign CANCELLED (no
checkpoint); PAUSED -> PAUSED (campaign + investigation checkpoints);
SAFETY_BLOCKED -> immediate (hostile); `classifyBudgetExhaustion(policy,
campaignUsage)` -> BUDGET_EXHAUSTED + checkpoint; stagnation counter reaches
`CAMPAIGN_STAGNATION_LIMIT = 3` -> NO_PROGRESS; else next investigation.

Stagnation N=3 justification: N=1 would end an hour campaign on one unlucky
empty investigation (defeats the mission); N=2 risks two correlated duds from a
deterministic reasoner hitting the same trap; N=3 gives two retries after the
first empty investigation while staying bounded (each investigation is itself
turn-capped), and mirrors the frozen `NO_PROGRESS_REPEAT_LIMIT = 3` (the
protocol tolerates 3 repeats in a run; the campaign tolerates 3 empty
investigations). Exported as `CAMPAIGN_STAGNATION_LIMIT`, asserted in tests.

Checkpoint file `<campaignId>.checkpoint.json` stays a valid `AgentCheckpoint`
(campaignId = campaign id, merged state, cursor
`<campaignId>:inv:<next>:turn:<totalTurns>`) plus a `campaignProgress` envelope
`{ version, nextInvestigationIndex, stagnantInvestigations, terminationCounts }`
for resume. PAUSED also writes transient `<campaignId>.investigation.json`
(the paused runtime checkpoint); deleted on terminal completion. Legacy
`<campaignId>:turn:<n>` cursors resume as investigation 0.

Result keeps all existing fields and adds `investigationsStarted`,
`investigationsCompleted`, `terminationCounts`, `reasonerCalls`,
`providerFailures`, `wallTimeMs`. Campaign terminals are only
BUDGET_EXHAUSTED / CANCELLED / PAUSED / SAFETY_BLOCKED / NO_PROGRESS:
per-investigation COMPLETE_* never surfaces (the loop continues by spec).

## Milestones

### M1 — Baseline reproduction + task records

- Objective: confirm single-run behavior with a deterministic fake before coding.
- Files/areas: `/tmp` fake scripts, REPORT baseline section.
- Implementation actions: run operator CLI with repeating-CALL_TOOL fake;
  observe one investigation, NO_PROGRESS, small actionCount.
- Acceptance criteria: baseline JSON captured.
- Validation commands: `node bin/nightwatch-agent.mjs campaign run ...`
- Status: DONE (baseline JSON captured pre-change; SPEC/PLAN written)

### M2 — Campaign loop implementation

- Objective: multi-investigation loop with shared budget, fatal/stagnation stops,
  checkpoints, resume, CLI updates.
- Files/areas: `src/core/agentRuntime/localCampaign.ts`,
  `src/core/agentRuntime/index.ts`, `bin/nightwatch-agent.mjs`.
- Implementation actions: implement per Architecture; keep existing exports.
- Acceptance criteria: `npm run typecheck` PASS.
- Validation commands: `npm run typecheck`, `npm run hardening:check`
- Status: DONE (loop, budget, stops, checkpoints, resume, CLI; typecheck + hardening PASS)

### M3 — Tests (endurance + adapted localCampaign)

- Objective: six proofs with fake CLI reasoners; existing scenarios preserved.
- Files/areas: `tests/unit/campaignEndurance.test.ts`,
  `tests/unit/localCampaign.test.ts`.
- Implementation actions: fake scripts keyed off investigation id where needed;
  wall-time exhaustion via injected `now`.
- Acceptance criteria: targeted Playwright command PASS.
- Validation commands: `npx playwright test tests/unit/localCampaign.test.ts tests/unit/campaignEndurance.test.ts tests/unit/agentRuntime.test.ts --project=nightwatch --workers=1`
- Status: DONE (26 passed across the three suites; 5 localCampaign + 6 endurance + 15 agentRuntime)

### M4 — Operator run, REPORT, commit

- Objective: real CLI run with local fake reasoner (>1 investigation JSON in
  REPORT), STATE/REPORT COMPLETE, Conventional Commit, clean worktree.
- Files/areas: REPORT.md, STATE.md, session branch.
- Implementation actions: run CLI, paste JSON, finalize docs, commit.
- Acceptance criteria: worktree clean, commit on session branch, not integrated.
- Validation commands: `git status --short`, `git log --oneline -3`
- Status: DONE (operator JSON in REPORT; STATE/REPORT COMPLETE; committed on session branch, not integrated)

## Validation Strategy

Targeted only (per lane constraints): typecheck, hardening:check, and the three
unit suites. No full suite / gate runs (orchestrator integrates).

## Decision Log

- 2026-09-07 — Decision: per-investigation remaining-budget policies; reason:
  a fresh runtime with the full policy would reset the campaign budget each
  investigation; evidence: `AgentRuntime` starts usage at zero; consequence:
  campaign ceiling cannot be overshot by a late investigation.
- 2026-09-07 — Decision: stagnation N=3 mirroring NO_PROGRESS_REPEAT_LIMIT;
  reason: see Architecture; consequence: exported const + test.
- 2026-09-07 — Decision: SAFETY_BLOCKED stops the campaign immediately;
  reason: retrying a safety block in fresh investigations circumvents the
  block; consequence: hostile-terminal handling + test-adjacent coverage.
- 2026-09-07 — Decision: campaign checkpoint = valid AgentCheckpoint with
  merged state + `campaignProgress` envelope; PAUSED adds transient
  investigation checkpoint; reason: reuses frozen codec/listings, no schema
  change, no side-effect duplication; consequence: resume loader validates both.

## Discoveries

- `parseResumeCursor` binds owner exactly, so campaign cursors
  `<id>:inv:<n>:turn:<t>` fail closed (CAMPAIGN_MISMATCH) if misused with
  `AgentRuntime.resumeFromCheckpoint` — safe by construction.

## Deferred Work

- None yet.

## Completion Criteria

M1-M4 DONE; acceptance commands green; REPORT holds design, threshold
justification, exact commands/outcomes, operator JSON, could-not-do list;
Conventional Commit on session branch; worktree clean; STATE/REPORT COMPLETE
with terminal next-action text.
