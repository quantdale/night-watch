# Active Task

Task ID: nightwatch-final-product-completion-v1
Phase: FINAL_PRODUCT_COMPLETION_V1
Title: Final product completion (terminal campaign)
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-product-completion-v1
Starting SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last validated implementation SHA: 1f786a4e1b7e4967d06c930946f1107e32931e8a
Last checkpoint: 2026-09-26 — M4 COMPLETE (5.1-5.7): six release probes wired
(`d595c7c8`), the G20 accessibility record with its fail-closed parser
(`cab67d76`), the `implemented` honesty rule + X-04 demotion + A-19/A-20 schema
states + the CI block-record single authority (`a784e668`), and the final
integration `137207b1` after reconciling origin/main `946b52c4` and restoring
the ledger-governed README status block; gate:dev/gate:milestone 5520/0.
Current milestone: M5 Autonomous hunt result integrity (tasks 6.1-6.17) — the
durable identity-bound `AgentFindingRecord` (6.1: content-addressed dossierId,
campaignId, per-source HEAD and tree digest, `cfe:` fingerprint, test and
reasoner identity, derived in `admitLocalFinding`), its atomic write before any
checkpoint deletion (6.2), truthful TERMINATED resume (6.3) and the remaining
reasoner-identity, budget, maxTurns, provider-taxonomy and Git-HEAD contracts.
Next action: read tasks 6.1-6.17 and `src/core/localInvestigation/**`, implement
6.1 with its focused suite green, repairing forward with new commits; close M5
with focused + gate:milestone PASS, the C-00 integrate and the `gh` CI
observation (OD-3) as in M4.

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
