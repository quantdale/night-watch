# Active Task

Task ID: nightwatch-final-completion-corrections-v1
Phase: COMPLETION_CORRECTIONS_V1
Title: Corrective campaign (child of the terminal campaign)
CHILD OF: nightwatch-final-product-completion-v1
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-final-completion-corrections-v1
Starting SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
Last validated implementation SHA: d6fd98b10ac810128e7ed244c31c213e4d3fc72b
Last checkpoint: 2026-09-28 — M3 certification anchors closed at clean
checkpoint `d6fd98b1`; focused suites, `gate:dev`, and `gate:milestone` PASS.
The broad affected-test execution passed 5773/5773 tests with 33 skips; the
120s/300s lane targets were exceeded and are recorded as telemetry.
Previous checkpoint: 2026-09-28 — VB-07 implementation `80840627` and
follow-up validation-universe fix `d6fd98b1`; child bootstrap `3ce396c6`
restored the change and re-verified all 31 findings at `1d47e2ee` (21
STILL_PRESENT, 5 CHANGED, 2 COMPLETED_LATER, CF-01..CF-03).
Current milestone: M4 Validation spine (group 3, tasks 3.1-3.12: VC-01..VC-11).
M1, M2, and M3 are COMPLETE.
Next action: start task 3.1 (resolve the configured Chrome executable for the
four DEV-login/storage-state security tests), then continue the remaining
validation-spine corrections in task order and rerun focused + group gates.

Authorization class: COMPLETION_CORRECTIONS_V1
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 1d47e2eef1ef029560ace12e31571624602eab0b
LAST_VALIDATED_IMPLEMENTATION_SHA: d6fd98b10ac810128e7ed244c31c213e4d3fc72b
LAST_SUBSTANTIVE_CHECKPOINT_SHA: d6fd98b10ac810128e7ed244c31c213e4d3fc72b
LIVE_HEAD_AUTHORITY: GIT
PROJECT_VERDICT_EFFECT: PRESERVE
PHASE_COMPLETION_CORRECTIONS_V1_STATUS: IN_PROGRESS

## Mission

Close the corrective change `nightwatch-final-completion-corrections-v1`
(39 tasks) so the parent campaign `nightwatch-final-product-completion-v1`
resumes from sound foundations at M9 task 10.2 (remainder: 59/76 declared).

## Read order

1. `.agent/tasks/nightwatch-final-completion-corrections-v1/{SPEC,PLAN,STATE}.md`
2. `openspec/changes/nightwatch-final-completion-corrections-v1/{proposal,design,audit,tasks}.md`
3. `.agent/tasks/nightwatch-final-product-completion-v1/{SPEC,PLAN,STATE,REPORT}.md`
4. `AGENTS.md`, `docs/CURRENT_STATE.md`, `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`

## Routing and safety

```text
CAMPAIGN: nightwatch-final-completion-corrections-v1
CHILD OF: nightwatch-final-product-completion-v1
CHILD TASK: NONE
SESSION WORKTREE: session/nightwatch-final-completion-corr-c45f0e9d

IMPLEMENTATION AUTHORIZED:
  Nightwatch source, tests, hardening rules/probes, schemas/configuration,
  synthetic Git/browser/network fixtures, synthetic private-data markers,
  local bounded child processes, OpenSpec/task continuity records,
  C-00 commits and fast-forward integration from this session only.

EXTERNAL CONTACT AUTHORIZED (OD-3 ONLY):
  GitHub Actions read/observe; C-00 fast-forward pushes; one bounded paid
  provider proof run; one npm registry advisory query.

CURRENT STATUS:
  IN_PROGRESS — M4 validation spine; M3 certification anchors validated at
  `d6fd98b1`.

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
completion without evidence. Never write under the canonical checkout while
this session is live; if canonical becomes dirty, STOP and report the exact
files and mtimes.
