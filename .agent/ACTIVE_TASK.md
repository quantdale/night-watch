# Active Task

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Title: Nightwatch production completion programme
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-completion-programme-v1
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
Last checkpoint: W1 closed at `53152cff`; `gate:local` PASS at `6bc70522`
(all eleven groups, receipt `receipt:sha256:204417295a4935d7857cb6b2`) and
the full offline regression is 5127 passed / 18 skipped / 0 failed.
Current milestone: G3..G21 — remaining owner-gated programme groups
Next action: resolve the named owner decisions (G3.11 CI route, G5.3
reclaim, G6.4/G6.5/G6.10, G8.7 taxonomy, G9.1 egress, G10.6/G10.13, G11.3,
G12.3, G13.8, G14.6, G17.4, G21.8 scope) and continue the remaining groups
G8, G9, G12, G18, G19, G21 and the open tails of G4, G5, G10, G14, G15,
G16, G17 under their own authorizations.
Authorization class: PRODUCTION_COMPLETION_PROGRAMME_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 53152cffe568312f70544ed758128a16fe5ff5f1
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
WAVE: W1
SESSION WORKTREE: session/nightwatch-open-spec-truth-closu-7138ca21

IMPLEMENTATION AUTHORIZED:
  the file surface each W1 change names in its own tasks.md, the programme
  change's two spec files amended by W1 task 2.6, this task directory,
  Nightwatch docs/OpenSpec state, commits/pushes/integration and local
  certification from the owned session.

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
