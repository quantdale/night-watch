# Task State

## Identity

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
Last substantive checkpoint SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
LAST_VALIDATED_IMPLEMENTATION_SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 9b7e3ad661bab91065a8674b6bfd5d0536f3495a
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: IN_PROGRESS

## Objective

Repair the bounded campaign budget starvation that blocked all four fresh
reproduction queues in the completed soak before replay executor entry, then
confirm a current candidate can traverse the real bounded replay/dossier path.

## Current Milestone

M1 — design bounded replay reservation semantics.

## Work In Progress

M0 is closed at pushed checkpoint
`9b7e3ad661bab91065a8674b6bfd5d0536f3495a`. The active work is comparing
explicit reserve, sub-budget, and deterministic-transfer models before editing
production budget semantics.

## Exact Next Action

Evaluate the three bounded reservation designs against every required invariant,
select the smallest safe owner, and record the decision before implementation.

## Starting evidence

- Predecessor: nightwatch-dev-soak-replay-yield-v1 COMPLETE.
- Terminal: SOAK_COMPLETE_PRODUCT_CANDIDATES_REPLAY_INCONCLUSIVE.
- Fresh candidates: 8 across 4/5 full campaigns.
- Stable candidate fingerprints: 2.
- Reproduction queues: 4.
- Replay/minimization/dossier: 0/0/0.
- Shared blocker: journeyContexts already 3/3 before reproduction reservation.
- Safety: zero.
- Privacy: PASS.

## Completed Milestones

- Git authority reconciliation: COMPLETE; only local `main` and remote
  `origin/main` exist, with no open pull requests requiring integration.
- Source reconnaissance: COMPLETE; the budget manager and orchestrator
  reservation boundary were inspected without changing budget semantics.
- M0 — reproduce budget starvation: COMPLETE at pushed checkpoint
  `9b7e3ad661bab91065a8674b6bfd5d0536f3495a`; the current-source candidate
  survived clustering, queued reproduction, and hit `BUDGET_EXHAUSTED` before
  the replay callback after three journey reservations.

## Files Changed

- `tests/unit/campaign.test.ts` — deterministic pre-fix starvation regression.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/PLAN.md` —
  required execution-plan sections and M0 evidence.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/STATE.md` —
  continuity-v2 execution waypoint and validation ledger.

## Validation Ledger

- `git fetch --prune origin` — PASS.
- Remote-head listing, local branch listing, and cached open-PR lookup —
  PASS; only `main` existed before the M0 push.
- Baseline `npm run gate:local` — FAIL at `HANDOFF_TRUTH` because the
  active PLAN/STATE lacked required continuity headings; no later group ran.
- Baseline `npm run handoff:check -- --root .` — FAIL
  `HANDOFF_ACTIVE_CONTINUITY_FAILED` for the same document shape.
- Baseline `npm run agent:check -- --root .` — FAIL with missing PLAN/STATE
  heading errors; the required sections were repaired before the M0 checkpoint.
- `npm run typecheck` — PASS after the regression edit.
- `npx playwright test tests/unit/campaign.test.ts --grep "pre-fix
  three-journey replay starvation" --project=nightwatch --workers=1
  --retries=0` — PASS, 1/0.
- `git diff --check` — PASS before the M0 commit.
- `git push origin main` — PASS for M0 checkpoint
  `9b7e3ad661bab91065a8674b6bfd5d0536f3495a`.
- Post-push `npm run agent:check -- --root .` and
  `npm run handoff:check -- --root .` — PASS; only established legacy-task
  and checkpoint-history warnings remained.

## Decisions Made During This Task

- Keep the three-journey starvation behavior unchanged until its regression was
  checkpointed.
- Model the reproducer with a current-source, product-classified candidate,
  clean preflight/execution outcome, one cluster, and a reproduction estimate
  requiring one additional journey context.
- Treat the resulting `BUDGET_EXHAUSTED` refusal before `reproduce` callback
  entry as the budget-allocation boundary, not an admission or framework
  failure.

## Discoveries

- `INITIAL_REAL_CAMPAIGN_BUDGET` allows three journey contexts and six total
  browser contexts, but `reserveReproductionBudget` consumes an estimated
  journey context only after collection has already used all three.
- `analyzeCampaignBudgetFeasibility` checks aggregate browser capacity but does
  not reserve a separate journey-context slot for reproduction.
- The regression proves the candidate survives clustering and queues
  reproduction while the replay callback count remains zero.

## Blockers

None.

## Safety Events

None. No Alphaus environment, product, datastore, infrastructure, credential,
publication, or authenticated evidence operation was performed.

## Deferred / Follow-Up

- M1 design and M2 implementation/adversarial validation remain open.
- Guarded DEV confirmation, CI classification, and final certification remain
  pending their prerequisite local implementation gates.

## Resume Recipe

Read this state and the active PLAN. Compare dedicated reproduction reserve,
sub-budget, and deterministic-transfer designs against every invariant; record
the chosen model and then implement it in the owning campaign budget boundary.

## Completion Snapshot

Completion state: IN_PROGRESS
Current milestone: M1 — design bounded replay reservation semantics.
Validated result: pre-fix three-journey path reaches `BUDGET_EXHAUSTED` before
the replay executor at pushed checkpoint
`9b7e3ad661bab91065a8674b6bfd5d0536f3495a`.
Terminal outcome: NONE.
