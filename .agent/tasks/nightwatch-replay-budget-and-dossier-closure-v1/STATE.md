# Task State

## Identity

Task ID: nightwatch-replay-budget-and-dossier-closure-v1
Phase: REPLAY_BUDGET_DOSSIER_CLOSURE_V1
Status: IN_PROGRESS
Starting SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
Last validated implementation SHA: fa236b690ceace3a420771645fce9f99bf751ea8
Last substantive checkpoint SHA: fa236b690ceace3a420771645fce9f99bf751ea8
Branch: main
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 4834e4da1ec40fbad9736f0a12d1d8f610cb622d
LAST_VALIDATED_IMPLEMENTATION_SHA: fa236b690ceace3a420771645fce9f99bf751ea8
LAST_SUBSTANTIVE_CHECKPOINT_SHA: fa236b690ceace3a420771645fce9f99bf751ea8
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_REPLAY_BUDGET_DOSSIER_CLOSURE_V1_STATUS: IN_PROGRESS

## Objective

Repair the bounded campaign budget starvation that blocked all four fresh
reproduction queues in the completed soak before replay executor entry, then
confirm a current candidate can traverse the real bounded replay/dossier path.

## Current Milestone

M0 — reconstruct and reproduce the budget starvation locally.

## Work In Progress

The deterministic pre-fix regression is implemented and focused-green. The
active task remains before the reservation redesign checkpoint.

## Exact Next Action

Commit the validated pre-fix regression and continuity-document repair, then
design the smallest explicit collection/reproduction reservation model.

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

## Files Changed

- `tests/unit/campaign.test.ts` — deterministic pre-fix starvation regression.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/PLAN.md` —
  required execution-plan sections and M0 evidence.
- `.agent/tasks/nightwatch-replay-budget-and-dossier-closure-v1/STATE.md` —
  continuity-v2 execution waypoint and validation ledger.

## Validation Ledger

- `git fetch --prune origin` — PASS.
- `git status --short --branch`, `git branch --all --verbose --no-abbrev`,
  and `git ls-remote --heads origin` — PASS; `main` equals `origin/main` at
  `418181ae6eef11fde82bebbd989f0f79498c8d01`, with no non-main branches.
- Cached `pr://quantdale/night-watch?state=open&limit=100` — no open pull
  requests matched.
- `npm run gate:local` — FAIL at the baseline `HANDOFF_TRUTH` group because
  the active PLAN/STATE lacked required continuity headings; no executable
  gate group after handoff ran.
- `npm run handoff:check -- --root .` — FAIL
  `HANDOFF_ACTIVE_CONTINUITY_FAILED` for the same pre-existing document shape.
- `npm run agent:check -- --root .` — FAIL with the missing PLAN/STATE
  heading errors recorded above; repair is included in this checkpoint.
- `npm run typecheck` — PASS after the regression edit.
- `npx playwright test tests/unit/campaign.test.ts --grep "pre-fix
  three-journey replay starvation" --project=nightwatch --workers=1
  --retries=0` — PASS, 1/0.

## Decisions Made During This Task

- Keep the three-journey starvation behavior unchanged until its regression is
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
- The current test now proves the candidate survives clustering and queues
  reproduction while the replay callback count remains zero.

## Blockers

None.

## Safety Events

None. No Alphaus environment, product, datastore, infrastructure, credential,
publication, or authenticated evidence operation was performed.

## Deferred / Follow-Up

- Commit the regression before changing executable budget semantics.
- M1 design and M2 implementation/adversarial validation remain open.
- Guarded DEV confirmation, CI classification, and final certification remain
  pending their prerequisite local implementation gates.

## Resume Recipe

Read this state and the active PLAN. Run the focused starvation regression and
continuity checks, commit the regression checkpoint, then compare dedicated
reproduction reserve, sub-budget, and deterministic-transfer designs against
the required invariants before editing `src/core/campaign/budget.ts` or
`src/core/campaign/orchestrator.ts`.

## Completion Snapshot

Completion state: IN_PROGRESS
Current milestone: M0 — reconstruct and reproduce budget starvation locally.
Validated result: pre-fix three-journey path reaches `BUDGET_EXHAUSTED` before
the replay executor.
Terminal outcome: NONE.
