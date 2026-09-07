# NightWatch campaign multi-investigation (E-endurance) — SPEC

## Task purpose

A bounded NightWatch campaign (`campaign run --duration=1h`) currently builds ONE
`AgentRuntime` and returns when that single run terminates, so a real HOUR_1
campaign ended `NO_PROGRESS` after ~102s / 12 actions instead of using its
3_600_000 ms ceiling. This task adds a campaign-level investigation loop in
`src/core/agentRuntime/localCampaign.ts`: a finished non-fatal investigation
starts a fresh one under the same campaign until a campaign-level stop condition
(budget exhaustion, fatal state, global stagnation) is hit.

## Established starting state

- Task ID: `nightwatch-campaign-multi-investigation-v1`
- Starting SHA: `d2aa960c2491817c70cd36f422b0e20c58dcc80d`
- Branch: `session/nightwatch-campaign-multi-invest-2229385c`
- Worktree: `/home/dalepalaca/.nightwatch/worktrees/nightwatch-campaign-multi-invest-2229385c`
- Current `runLocalCliCampaign` builds one `AgentRuntime` and returns its result
  (`finishRun` in `localCampaign.ts`).
- Frozen (must not change shapes): `src/core/agentProtocol/**`
  (`AgentBudgetPolicy`, `AgentBudgetUsage`, `classifyBudgetExhaustion`,
  `AGENT_BUDGET_CEILINGS` with HOUR_1 = 3_600_000 ms, termination reasons),
  `resultClass` values `REPRODUCED`/`NOT_REPRODUCED`/`NOT_AVAILABLE`,
  `src/core/benchmark/hunt.ts` reproduction counting, leak isolation.
- Forbidden writes: `src/core/benchmark/**`, `src/core/agentRuntime/runtime.ts`,
  `src/core/agentRuntime/checkpoint.ts`, `src/core/agentProtocol/**`,
  `.agent/ACTIVE_TASK.md`, `docs/*.md` (CURRENT_STATE/ARCHITECTURE/ROADMAP/DECISIONS),
  `openspec/**`, `package-lock.json`, other lane paths.

## Required deliverables

1. Campaign-level investigation loop in `localCampaign.ts`: fresh `AgentRuntime`
   per investigation (distinct investigation id, own action log, own no-progress
   window) on non-fatal terminals (`NO_PROGRESS`, `COMPLETE_WITH_FINDING`,
   `COMPLETE_NO_FINDING`, `REASONER_FAILURE`, `BUDGET_EXHAUSTED`-at-investigation
   folds into the campaign budget check).
2. Shared cumulative campaign budget checked with the SAME `AgentBudgetPolicy`
   via `classifyBudgetExhaustion`; per-investigation runtimes receive
   remaining-budget policies so no investigation can reset or overshoot the
   campaign ceiling. Campaign `BUDGET_EXHAUSTED` safe-terminates WITH a
   checkpoint, never reported as success.
3. Immediate campaign stop on fatal/hostile terminals: `CANCELLED`, `PAUSED`
   (with checkpoint), `SAFETY_BLOCKED` (hostile; retrying a safety block in a
   fresh investigation would be block-circumvention), and consecutive reasoner
   failures reaching the policy ceiling (Grok HTTP 402 x6 case).
4. Global stagnation stop: N consecutive investigations with zero new evidence
   AND zero new candidates stop the campaign with `NO_PROGRESS`. N is an
   exported, tested constant.
5. Extended `LocalCampaignResult` (existing fields unchanged): investigations
   started/completed, per-reason termination counts, cumulative reasoner calls,
   provider-failure count, wall time.
6. Correct checkpoint/resume: merged campaign checkpoint + in-progress
   investigation checkpoint for PAUSED; resume continues without duplicating
   side effects or restarting finished investigations; idempotent resume of
   terminal checkpoints; `campaign status`/`resume` CLI reflects the new shape.
7. `tests/unit/campaignEndurance.test.ts` proving: multiple investigations; budget
   accumulation without reset; budget-exhaustion checkpoint + non-success; dead
   reasoner stops; stagnation stops; resume correctness.
8. Existing `tests/unit/localCampaign.test.ts` scenarios kept (expectations
   adapted to the specified multi-investigation semantics where the spec mandates
   continuation past the first completion).
9. Real operator-CLI run with a deterministic local fake reasoner; JSON pasted
   into REPORT.md showing >1 investigation.
10. `npm run typecheck` PASS, `npm run hardening:check` PASS, targeted
    Playwright suites PASS. Commit on session branch; no integration.

## Explicit non-goals

- Any change to the runtime loop, no-progress guard, checkpoint codec/schema,
  or budget policy shapes.
- Mined-reproduction discriminator work (other lane).
- DEV/NEXT/production contact, network use, credentials anywhere.

## Safety constraints

- LOCAL environment only; owner-private checkpoints (0700/0600), no secrets.
- Never fabricate findings or candidates.
- Read-only sibling Alphaus repos; no worktrees inside them.

## Acceptance criteria

- `npm run typecheck` PASS, `npm run hardening:check` PASS.
- `npx playwright test tests/unit/localCampaign.test.ts
  tests/unit/campaignEndurance.test.ts tests/unit/agentRuntime.test.ts
  --project=nightwatch --workers=1` PASS.
- New tests use deterministic FAKE CLI reasoners only and prove the six
  properties listed in deliverable 7.
- REPORT.md contains design, stagnation threshold + justification, exact
  commands/outcomes, operator-CLI JSON with >1 investigation, and honest
  could-not-do list.

## Declared Deletions

None. No tracked file is deleted by this task.
