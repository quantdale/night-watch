# Campaign multi-investigation (E-endurance) — Report

- Starting SHA: `d2aa960c2491817c70cd36f422b0e20c58dcc80d`
- Resulting SHA: `Live HEAD: DISCOVER_FROM_GIT` (commit on session branch at close)
- Task objective: make a bounded campaign a sequence of investigations under one
  shared budget so HOUR_1/HOUR_4 campaigns use their ceiling.
- Changes: `src/core/agentRuntime/localCampaign.ts` (campaign loop),
  `src/core/agentRuntime/index.ts` (new exports), `bin/nightwatch-agent.mjs`
  (resume parity + multi-investigation status), `tests/unit/localCampaign.test.ts`
  (expectations adapted to specified continuation), `tests/unit/campaignEndurance.test.ts`
  (new, six proofs).
- Tests/validation: exact commands and results below.
- Decisions: stagnation N=3; SAFETY_BLOCKED stops immediately; per-investigation
  remaining-budget policies; checkpoint = valid AgentCheckpoint + progress envelope;
  resume runs under the checkpoint's stored policy.
- Safety events: NONE.
- Deferred items: none.
- Remaining blockers: none.
- Recommended next phase/task: orchestrator integration (gate:local/gate:clean),
  then a real subscribed-CLI soak to observe multi-investigation behavior live.

Status: COMPLETE. Do not resume; any follow-up starts as a new authorized task.

## Design

`runLocalCliCampaign` / `resumeLocalCliCampaign` now drive `runCampaignLoop`, which
starts one fresh `AgentRuntime` per investigation with id `<campaignId>:inv:<n>`
(distinct ids visible to the reasoner; turnIds globally unique across the merged
log; each run owns its action log and no-progress window) and folds each finished
run into campaign accumulators that are never reset:

- sums: reasonerCalls, input/output bytes, toolActions, retries, providerFailures;
- candidateCount = unique campaign candidates;
- consecutiveFailures = trailing streak (an investigation ending with a failure
  streak adds it; ending clean resets it; a validated self-reported
  REASONER_FAILURE counts its event since the runtime streak reads zero);
- wallTimeMs measured live from campaign start (injectable `now` seam).

Each investigation receives a remaining-budget policy (campaign policy minus
consumed), so a fresh runtime can neither reset nor overshoot the shared ceiling;
the campaign check always uses the SAME `AgentBudgetPolicy` via the frozen
`classifyBudgetExhaustion`. Post-investigation stop order: CANCELLED (no
checkpoint) → PAUSED (checkpoint with embedded paused-investigation checkpoint
for verbatim resume) → SAFETY_BLOCKED (immediate, hostile) →
BUDGET_EXHAUSTED + checkpoint (safe termination, never success) → stagnation
(NO_PROGRESS, checkpoint removed) → else next investigation. Per-investigation
COMPLETE_* never surfaces: completion is per-investigation; campaigns end on
budget/fatal/stagnation. A fresh `run` deletes any stored checkpoint for its id
(supersede); a terminal resume deletes the stale file; resuming a TERMINATED
checkpoint is idempotent (reports stored outcome, restarts nothing). Legacy
`<id>:turn:<n>` checkpoints resume as investigation 0.

## Stagnation threshold

`CAMPAIGN_STAGNATION_LIMIT = 3` (exported, asserted). N=1 would end an hour
campaign on one unlucky empty investigation (defeats the mission); N=2 risks two
correlated duds from a deterministic reasoner hitting the same trap twice; N=3
grants two retries after the first empty investigation while staying bounded
(every investigation is turn-capped), and mirrors frozen
`NO_PROGRESS_REPEAT_LIMIT = 3` — the protocol tolerates 3 repeats in a run, the
campaign tolerates 3 empty investigations.

## Validation (exact commands, all in the session worktree)

- Baseline (pre-change reproduction): repeating-CALL_TOOL fake →
  `NO_PROGRESS, actionCount 7`, single investigation; terminate fake →
  `COMPLETE_NO_FINDING, actionCount 1`. Confirms one-AgentRuntime behavior.
- `npm run typecheck` → PASS (repo tsc via `./node_modules/.bin/tsc`; worktree
  installed with `npm ci --offline`, no network).
- `npm run hardening:check` → PASS.
- `npx playwright test tests/unit/localCampaign.test.ts
  tests/unit/campaignEndurance.test.ts tests/unit/agentRuntime.test.ts
  --project=nightwatch --workers=1` → 26 passed, 0 failed (5 localCampaign + 6
  endurance + 15 agentRuntime; agentRuntime untouched and still green).
- Existing localCampaign scenarios kept (fail-closed, malformed id, pause→resume,
  propose→refused); reason expectations adapted where the mission mandates
  continuation past the first completion (terminate→NO_PROGRESS via stagnation;
  resume→NO_PROGRESS; propose→NO_PROGRESS with dossier still
  REFUSED_NO_REPRODUCTION). Nothing weakened: every original assertion topic is
  still asserted, plus investigation metrics.

## Operator CLI evidence (deterministic local fake reasoners, real CLI path)

`NIGHTWATCH_REASONER_CLI=<node> NIGHTWATCH_REASONER_SCRIPT=/tmp/nw-op-terminate.mjs
node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h
--max-turns=2 --id=op-report-multi` →

```json
{
  "schemaVersion": "nightwatch.local-cli-campaign.v1",
  "campaignId": "op-report-multi",
  "terminationReason": "NO_PROGRESS",
  "candidateIds": [],
  "actionCount": 3,
  "checkpointFile": null,
  "environment": "LOCAL",
  "dossierStatus": "NONE",
  "investigationsStarted": 3,
  "investigationsCompleted": 3,
  "terminationCounts": {
    "COMPLETE_WITH_FINDING": 0,
    "COMPLETE_NO_FINDING": 3,
    "BUDGET_EXHAUSTED": 0,
    "CANCELLED": 0,
    "PAUSED": 0,
    "SAFETY_BLOCKED": 0,
    "NO_PROGRESS": 0,
    "REASONER_FAILURE": 0
  },
  "reasonerCalls": 3,
  "providerFailures": 0,
  "wallTimeMs": 63
}
```

Pause/status/resume via the real CLI: pause-script run → PAUSED with checkpoint
(started 1, completed 0); `campaign status` lists it with
`resumeCursor: op-report-pause:inv:0:turn:0`, investigationsStarted 1,
investigationsCompleted 0; `campaign resume --id=op-report-pause` (terminate
script) → NO_PROGRESS, started 3, completed 3, reasonerCalls 5, checkpoint
removed, status empty. Full outputs captured during execution.

## Could not do (with exact reasons)

- Full 4k suite / `gate:local` / `gate:clean`: forbidden by lane constraints;
  orchestrator runs them at integration.
- Real subscribed-CLI soak (e.g. Grok HTTP 402 × 6): no network/subscription in
  this environment. Covered instead by a `process.exit(1)` fake exercising the
  identical runtime counters (NONZERO_EXIT → provider/consecutive/retries++),
  asserting the campaign stops BUDGET_EXHAUSTED after exactly 3 bounded
  investigations with providerFailures 6.
- Real hour-long wall execution: covered by a deterministic injected-clock test
  (clock jumps past HOUR_1 after the fake proves it ran), asserting
  BUDGET_EXHAUSTED + valid checkpoint + wallTimeMs ≥ 3_600_000.
