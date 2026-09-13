# Active Task

Task ID: nightwatch-open-spec-truth-closure-v1
Phase: OPEN_SPEC_TRUTH_CLOSURE_V1
Title: OpenSpec truth-surface closure
Status: IN_PROGRESS
Task directory: .agent/tasks/nightwatch-open-spec-truth-closure-v1
Starting SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Last validated implementation SHA: ebe26ce6b2a946fe0fd55fde3a5022e792a792d0
Last checkpoint: the campaign task topology is being written and committed from
the owned session before the continuity change enables its new error; this
file and the task records are the checkpoint.
Current milestone: M1 — task topology and active-waypoint reconciliation
Next action: finish M1 by writing the remaining continuity-v2 task records,
reconciling this file, committing the planning checkpoint, and verifying
`npm run agent:check` passes; then implement
`nightwatch-continuity-live-waypoint-binding-v1` (M2).
Authorization class: OPEN_SPEC_TRUTH_CLOSURE_V1
PROJECT_VERDICT_EFFECT: PRESERVE
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PHASE_OPEN_SPEC_TRUTH_CLOSURE_V1_STATUS: IN_PROGRESS

## Outcome

Not yet certified. The campaign applies, validates and integrates the three
sibling OpenSpec changes planned at `ebe26ce`:

1. `openspec/changes/nightwatch-continuity-live-waypoint-binding-v1/`
2. `openspec/changes/nightwatch-published-spec-baseline-integrity-v1/`
3. `openspec/changes/nightwatch-validation-classification-and-skip-truth-v1/`

It also creates the continuity-v2 task records every active change requires
before the change↔task integrity check becomes an error.

## Mission

Close every locally closable box of the three changes with evidence; park the
two ownerless active changes explicitly BLOCKED rather than executing them;
never weaken a gate to make a tree green. LOCAL only; sibling repositories
remain read-only; the permanent owner scope freeze, C-00, C-10, D-4 and the
fail-closed egress policy are unchanged.

Read in this order:

1. `.agent/tasks/nightwatch-open-spec-truth-closure-v1/{SPEC,PLAN,STATE}.md`
2. the three changes' `proposal.md`, `design.md`, specs and `tasks.md`
3. `AGENTS.md`, `.agent/EXECUTION_PROMPT.md`, `docs/CURRENT_STATE.md`,
   `docs/SAFETY_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, then live
   Git/workspace/session truth.

## Frozen predecessor outcomes

Do not rebuild unless live recon finds a concrete regression:

- `nightwatch-production-completion-programme-v1` is IN_PROGRESS and its
  integrated work (G1, G2 local, G4, G5, G6, G7, G9–G21 local) stands. Do not
  tick its implementation boxes from this campaign; only the two spec files
  its task 2.6 amends change here.
- `nightwatch-control-center-design-system-v1` and
  `nightwatch-production-observability-system-map-master-plan-v1` are parked
  BLOCKED by this campaign and are not executed.
- The permanent owner scope freeze, L6 containment, and immutable evidence
  and review store identities are unchanged.

## Routing and safety

```
CAMPAIGN: nightwatch-open-spec-truth-closure-v1
CHILD TASK: NONE
WAVE: NONE
SESSION WORKTREE: session/nightwatch-open-spec-truth-closu-7138ca21

IMPLEMENTATION AUTHORIZED:
  the file surface each of the three changes names in its own tasks.md,
  this task directory, Nightwatch docs/OpenSpec state,
  commits/pushes/integration and local certification from the owned session.

REAL PRODUCTION CONTACT:               NOT AUTHORIZED
NEW API ROUTE / ADAPTER / AUTHORITY:   NOT AUTHORIZED
NEXT / DEV EXECUTION:                  NOT AUTHORIZED
NETWORK EGRESS / ADVISORY SCAN:        NOT AUTHORIZED
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
