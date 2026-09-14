# Active Task

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Title: Nightwatch production completion programme
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-completion-programme-v1
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
Last checkpoint: G6.10/G6.11 owner-approved single-branch consolidation at
`f3a31ed9`: everything is merged into `main` and only `main` remains locally
and on `origin`, with every retired branch/ref commit an ancestor of `main`
and the tree byte-identical to the integrated `b14f9d74` checkpoint
(`3f8a1b3b`). The live session worktree was released and removed through the
session CLI. Earlier W1 record: `gate:local` PASS at `5b624a49` (all eleven
groups, receipt `receipt:sha256:0fd9204ef3821e5acf597a1f`), full offline
regression 5127 passed / 18 skipped / 0 failed.
Current milestone: G6.10/G6.11 owner-approved single-branch consolidation
Next action: continue the remaining owner-gated programme groups (G16 tails,
G8, G9, G12, G18, G19, G21) under their own authorizations.
Owner decisions stay OPEN; none is self-authorized.
Authorization class: PRODUCTION_COMPLETION_PROGRAMME_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LAST_SUBSTANTIVE_CHECKPOINT_SHA: b1f1aa684fa1543b588f6af9095ad5393bbcb152
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PRODUCTION_COMPLETION_PROGRAMME_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The programme executes the 21 task groups of
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`,
starting with ledger truth so that every later estimate is checkable. The
baseline, findings F-01 … F-21 and their measured evidence are in that
change's `audit.md`.

W1 is complete and integrated: the three sibling audit changes planned at
`ebe26ce` repair the truth surfaces the first wave left behind — the
continuity live-waypoint binding, the published-spec baseline integrity, and
the validation classification / skip-identity truth. Their ledgers are fully
ticked; the programme's own remaining boxes stay open until their owner gates
clear.

## Mission

Close every locally closable gap the programme names, with evidence; record
every owner or external dependency as a blocking class with a named owner
action and revisit condition; never weaken a gate to make a lane executable.
LOCAL only; sibling repositories remain read-only; the permanent owner scope
freeze, C-00, C-10, D-4 and the fail-closed egress policy are unchanged.

Read in this order:

1. `openspec/changes/nightwatch-production-completion-programme-v1/audit.md`
2. `openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`
3. `.agent/tasks/nightwatch-production-completion-programme-v1/{SPEC,PLAN,STATE}.md`
4. the three W1 changes' `proposal.md`, `design.md`, specs and `tasks.md`
5. `.agent/EXECUTION_PROMPT.md`
6. `AGENTS.md`, `.agent/PLANS.md`, `docs/CURRENT_STATE.md`,
   `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, then live
   Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-control-center-style-and-absence-truth-v1` is terminal COMPLETE
  and integrated at `36bd493`. A-01 through A-04 are CLOSED; do not reopen
  them.
- `nightwatch-control-center-render-truth-v1`,
  `nightwatch-control-center-placement-coverage-v1`,
  `nightwatch-control-center-ui-completion-v1` and
  `nightwatch-residual-closure-and-lane-qualification-v1` are terminal
  COMPLETE.
- `nightwatch-control-center-design-system-v1` and
  `nightwatch-production-observability-system-map-master-plan-v1` are parked
  IN_PROGRESS with named owner blockers by W1; they are not executed here.
- The permanent owner scope freeze, L6 containment, and immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-production-completion-programme-v1
CHILD TASK: NONE
WAVE: G6_BRANCH_CONSOLIDATION
SESSION WORKTREE: NONE

IMPLEMENTATION AUTHORIZED:
  G6.10/G6.11 owner-approved single-branch consolidation (ancestry merges,
  session-worktree release/removal, branch and ref deletion, retired
  alternative-folder intake), this task directory, the programme change
  ledger, Nightwatch docs/OpenSpec state, commits/pushes/integration and
  local certification from the canonical MAINTENANCE claim.

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:   NOT AUTHORIZED
NEXT / DEV EXECUTION:                  NOT AUTHORIZED except where a group's
                                       own owner decision explicitly grants it
NETWORK EGRESS / ADVISORY SCAN:        NOT AUTHORIZED except where G9's owner
                                       decision explicitly grants one query
SLACK / LESLIE / PONDR / NOTION:       NOT AUTHORIZED
EXTERNAL FILING:                       NOT AUTHORIZED
CREDENTIALS / DEPLOYMENT:              NOT AUTHORIZED
SIBLING WRITES:                        NOT AUTHORIZED
FORCE PUSH / HISTORY REWRITE:          NOT AUTHORIZED
REOPENING TERMINAL FINDINGS:           NOT AUTHORIZED
```

LOCAL only. Sibling repositories remain read-only. Never retire, prune, adopt
or edit another session, and never create worktree capacity by removing one.

C-00 governs all writers: one writing agent == one owned worktree == one
session identity. The canonical checkout is not an implementation worktree.
