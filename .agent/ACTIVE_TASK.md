# Active Task

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Title: Final product completion (terminal campaign)
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-product-completion-v1
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last checkpoint: 2026-09-26 — M3 tasks 4.1-4.12 complete; focused suites,
hardening:check, the 147/147 probe campaign, gate:topology and gate:ui all
green.
Current milestone: M3 close-out (task 4.13) — gate:dev + gate:milestone on
the committed state, the C-00 fast-forward push, and the exact-head CI
observation with `gh` (OD-3).
Next action: run the gate pair, integrate with the session CLI, observe CI
with `gh`, record the result in STATE, tick 4.13 and commit the M3 closeout;
repair forward if anything fails.

Authorization class: FINAL_PRODUCT_COMPLETION_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_VALIDATED_IMPLEMENTATION_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
LIVE_HEAD_AUTHORITY: GIT
PHASE_FINAL_PRODUCT_COMPLETION_V1_STATUS: IN_PROGRESS

## Mission

Execute the single terminal campaign that makes an honest
`PROJECT_COMPLETE_AND_CI_CERTIFIED` verdict reachable and stable (OD-1/OD-2):
disposition every audited census item, make the certification spine
checkpoint-neutral and CI-green, persist truthful autonomous-hunt results,
reconcile every operator-truth surface, close the ledger, and end with a
`main`-only clean topology equal to `origin/main`.

## Read order

1. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-product-completion-v1/{proposal,design,audit,tasks}.md`
3. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, and
   `docs/DECISIONS.md`
4. Current audit/OpenSpec ledgers and cited live source

## Routing and safety

```text
CAMPAIGN: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-product-complet-a891357d

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes; one bounded paid
  provider proof run; one npm registry advisory query.

CURRENT STATUS:
  IN_PROGRESS — M1 session bootstrap in the owned worktree.

ALPHAUS DEV / NEXT / PRODUCTION CONTACT:   NOT AUTHORIZED
AUTHENTICATED ALPHAUS RUNTIME:             NOT AUTHORIZED
DATABASE / DATA-PLANE ACCESS:              NOT AUTHORIZED
CLOUD / INFRASTRUCTURE OPERATIONS:         NOT AUTHORIZED
SIBLING REPOSITORY MUTATION:               NOT AUTHORIZED
EXTERNAL PUBLICATION / ISSUE / PR:         NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:              NOT AUTHORIZED
LOCAL READ-ONLY COMMANDS AND TESTS:        AUTHORIZED
```

Never force-push, never rebase or amend another agent's commits, never discard
a newer canonical tip, and never touch another owner's worktree. Do not claim
completion, exhaustion, or release readiness without evidence.
