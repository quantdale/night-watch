# Active Task

Task ID: nightwatch-production-completion-programme-v1
Phase: PRODUCTION_COMPLETION_PROGRAMME_V1
Title: Nightwatch production completion programme
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-production-completion-programme-v1
Starting SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
Last validated implementation SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
Last checkpoint: planning checkpoint integrated to `main` at `fe6226a`; the
owned session `nightwatch-production-completion-3d648499` was created from
that base (session `sess-506a5055dcc2`) and G1.1 is the current action.
Current milestone: G1 — ledger truth and the spec baseline
Next action: run the G1.2 change↔task pairing measurement over 57 changes and
149 task directories, record the measured baseline, and execute the G1.3–G1.9
entry-by-entry reconciliation before implementing the agreement check.
Authorization class: PRODUCTION_COMPLETION_PROGRAMME_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
STARTING_SHA: 36bd4930db978423f97e16f35250c2e66bfa112c
LAST_VALIDATED_IMPLEMENTATION_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 88e3c3fb52937ff303b0944cc22cfee624bf807e
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_PRODUCTION_COMPLETION_PROGRAMME_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The programme executes the 21 task groups of
`openspec/changes/nightwatch-production-completion-programme-v1/tasks.md`,
starting with ledger truth so that every later estimate is checkable. The
baseline, findings F-01 … F-21 and their measured evidence are in that
change's `audit.md`.

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
4. `.agent/EXECUTION_PROMPT.md`
5. `AGENTS.md`, `.agent/PLANS.md`, `docs/CURRENT_STATE.md`,
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
- The permanent owner scope freeze, L6 containment, and immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-production-completion-programme-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-production-completion-3d648499

IMPLEMENTATION AUTHORIZED:
  the file surface each task group names in the OpenSpec change,
  this task directory, Nightwatch docs/OpenSpec state,
  commits/pushes/integration and local certification from the owned session.

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
